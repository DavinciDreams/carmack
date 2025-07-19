import { Bot, Key, Mic, MicOff, Phone, PhoneOff, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import './App.css';

interface Transcription {
  speaker: string;
  text: string;
  timestamp: number;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful meeting assistant. Provide concise, relevant insights about the conversation. Focus on key points, action items, and helpful clarifications.'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [currentAiResponse, setCurrentAiResponse] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speakerStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:8080');

      wsRef.current.onopen = () => {
        console.log('Connected to server');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'transcription':
            setTranscriptions((prev) => [...prev, message.data]);
            break;

          case 'ai_response_start':
            setCurrentAiResponse('');
            break;

          case 'ai_response_chunk':
            setCurrentAiResponse((prev) => prev + message.data);
            break;

          case 'ai_response_end':
            setAiResponses((prev) => [...prev, message.data]);
            setCurrentAiResponse('');
            break;

          case 'error':
            console.error('Server error:', message.message);
            break;
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        // Attempt to reconnect after 2 seconds
        setTimeout(connectWebSocket, 2000);
      };
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const startRecording = async () => {
    if (!isConnected) {
      alert('Not connected to server. Please wait a moment and try again.');
      return;
    }

    try {
      // Check for microphone and screen recording permissions
      const micPermissionStatus = await navigator.permissions.query({ name: 'microphone' });
      const screenPermissionStatus = await navigator.permissions.query({
        name: 'display-capture' as unknown as PermissionName,
      }); // Note: 'display-capture' is not universally supported, may need alternative

      if (micPermissionStatus.state === 'denied' || screenPermissionStatus.state === 'denied') {
        alert(
          'Microphone or screen recording permissions were denied. Please grant them in your browser settings.'
        );
        return; // Stop here if permissions are denied
      }

      // If permissions are granted or prompt is needed, proceed to get media streams
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get speaker audio (desktop capture)
      speakerStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false,
      });

      // Check if we actually got audio
      const hasSpeakerAudio = speakerStreamRef.current.getAudioTracks().length > 0;
      if (!hasSpeakerAudio) {
        alert(
          'No audio was shared. Please make sure to check "Share audio" when selecting your screen/window.'
        );
        // Clean up
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        speakerStreamRef.current?.getTracks().forEach((track) => track.stop());
        return;
      }

      audioContextRef.current = new AudioContext({ sampleRate: 48000 });

      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('Resumed suspended audio context');
      }

      // Set recording state BEFORE setting up processors
      setIsRecording(true);

      // Send configuration to server
      if (apiKey) {
        wsRef.current?.send(
          JSON.stringify({
            type: 'config',
            apiKey: apiKey,
          })
        );
      }

      wsRef.current?.send(
        JSON.stringify({
          type: 'system_prompt',
          prompt: systemPrompt,
        })
      );

      // Process microphone audio
      const micSource = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
      const micProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      micProcessor.onaudioprocess = (e) => {
        if (!isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Debug: Check if we're getting audio
        const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
        if (sum > 0.01) {
          console.log('Mic audio detected:', sum);
        }

        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new Int16Array(buffer);

        for (let i = 0; i < inputData.length; i++) {
          view[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        wsRef.current?.send(
          JSON.stringify({
            type: 'audio',
            data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
            speaker: 'user',
          })
        );
      };

      micSource.connect(micProcessor);
      micProcessor.connect(audioContextRef.current.destination);

      // Process speaker audio
      const speakerSource = audioContextRef.current.createMediaStreamSource(
        speakerStreamRef.current
      );
      const speakerProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      speakerProcessor.onaudioprocess = (e) => {
        if (!isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new Int16Array(buffer);

        for (let i = 0; i < inputData.length; i++) {
          view[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        wsRef.current?.send(
          JSON.stringify({
            type: 'audio',
            data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
            speaker: 'caller',
          })
        );
      };

      speakerSource.connect(speakerProcessor);
      speakerProcessor.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(
        'Failed to start recording. Make sure to grant microphone and screen recording permissions.'
      );
      // Reset state on error
      setIsRecording(false);
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      speakerStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
      return;
    }
  };

  const stopRecording = () => {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    speakerStreamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();

    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Meeting Assistant
                {!isConnected && <span className="text-sm text-red-500">(Disconnected)</span>}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-5 w-5" />
              </Button>
            </CardTitle>
            <CardDescription>Real-time transcription with AI-powered insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSettings && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Anthropic API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is only sent to your local server, never stored.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI System Prompt
                  </label>
                  <textarea
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>
            {!isConnected && (
              <p className="text-center text-sm text-muted-foreground">Connecting to server...</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
              <CardDescription>Live conversation transcript</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {transcriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Start recording to see transcriptions...
                  </p>
                ) : (
                  transcriptions.map((trans, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        trans.speaker === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/10 mr-8'
                      }`}
                    >
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {trans.speaker === 'user' ? 'You' : 'Caller'}
                      </p>
                      <p className="text-sm">{trans.text}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>AI-powered meeting notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {aiResponses.length === 0 && !currentAiResponse ? (
                  <p className="text-muted-foreground text-center py-8">
                    {apiKey
                      ? 'AI will provide insights during the conversation...'
                      : 'Add your Anthropic API key to enable AI insights'}
                  </p>
                ) : (
                  <>
                    {aiResponses.map((response, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-accent/10">
                        <p className="text-sm">{response}</p>
                      </div>
                    ))}
                    {currentAiResponse && (
                      <div className="p-3 rounded-lg bg-accent/10 animate-pulse">
                        <p className="text-sm">{currentAiResponse}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
