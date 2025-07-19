import Anthropic from '@anthropic-ai/sdk';
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { prepareAudioData, WhisperContext } from './whisper-bindings';

const PORT = 8080;
const MODEL_PATH = join(import.meta.dir, '../whisper.cpp/models/ggml-large-v3-turbo-q5_0.bin');

// Initialize Whisper
const whisper = new WhisperContext(MODEL_PATH);

// WebSocket server for audio streaming
const wss = new WebSocketServer({ port: PORT });

// Audio buffer management
interface ClientSession {
  audioBuffer: Buffer[];
  lastTranscriptionTime: number;
  transcriptionHistory: Array<{
    speaker: 'user' | 'caller';
    text: string;
    timestamp: number;
  }>;
  anthropicClient?: Anthropic;
}

const sessions = new Map<any, ClientSession>();

wss.on('connection', (ws) => {
  console.log('Client connected');

  const session: ClientSession = {
    audioBuffer: [],
    lastTranscriptionTime: Date.now(),
    transcriptionHistory: [],
  };

  sessions.set(ws, session);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'audio':
          handleAudioChunk(ws, session, Buffer.from(message.data, 'base64'), message.speaker);
          break;

        case 'config':
          // Client provides their own API key
          if (message.apiKey) {
            session.anthropicClient = new Anthropic({
              apiKey: message.apiKey,
            });
          }
          break;

        case 'system_prompt':
          // Store system prompt for Claude
          session.systemPrompt = message.prompt;
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    sessions.delete(ws);
  });
});

async function handleAudioChunk(
  ws: any,
  session: ClientSession,
  audioData: Buffer,
  speaker: string
) {
  // Add to buffer
  session.audioBuffer.push(audioData);

  // Process every 3 seconds of audio or 30 seconds max
  const timeSinceLastTranscription = Date.now() - session.lastTranscriptionTime;
  const totalBufferSize = session.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
  const estimatedDuration = totalBufferSize / (16000 * 2); // 16kHz, 16-bit

  if (estimatedDuration >= 3 || timeSinceLastTranscription >= 30000) {
    // Concatenate buffers
    const fullBuffer = Buffer.concat(session.audioBuffer);
    session.audioBuffer = [];
    session.lastTranscriptionTime = Date.now();

    // Convert to Float32Array at 16kHz
    const audioFloat32 = prepareAudioData(fullBuffer);

    // Transcribe
    const segments = whisper.transcribe(audioFloat32);

    // Send transcription results
    for (const segment of segments) {
      const transcription = {
        speaker,
        text: segment.text.trim(),
        timestamp: Date.now(),
        start: segment.start,
        end: segment.end,
      };

      session.transcriptionHistory.push({
        speaker: speaker as 'user' | 'caller',
        text: transcription.text,
        timestamp: transcription.timestamp,
      });

      ws.send(
        JSON.stringify({
          type: 'transcription',
          data: transcription,
        })
      );

      // Process with Claude if configured
      if (session.anthropicClient && shouldRespondToClaude(transcription.text)) {
        await processWithClaude(ws, session);
      }
    }
  }
}

function shouldRespondToClaude(text: string): boolean {
  // Simple heuristic - respond to questions or when AI is mentioned
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('?') ||
    lowerText.includes('ai') ||
    lowerText.includes('assistant') ||
    lowerText.includes('what do you think')
  );
}

async function processWithClaude(ws: any, session: ClientSession) {
  if (!session.anthropicClient) return;

  try {
    // Format conversation history
    const messages = session.transcriptionHistory.slice(-20).map((entry) => ({
      role: entry.speaker === 'user' ? 'user' : 'assistant',
      content: `[${entry.speaker}]: ${entry.text}`,
    }));

    // Create completion
    const stream = await session.anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system:
        session.systemPrompt ||
        'You are a helpful meeting assistant. Provide concise, relevant insights about the conversation. Focus on key points, action items, and helpful clarifications.',
      messages: [
        {
          role: 'user',
          content:
            messages.map((m) => m.content).join('\n') +
            '\n\nProvide a brief, helpful response or insight about this conversation.',
        },
      ],
      stream: true,
    });

    // Stream response
    let fullResponse = '';
    ws.send(
      JSON.stringify({
        type: 'ai_response_start',
      })
    );

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        fullResponse += chunk.delta.text;
        ws.send(
          JSON.stringify({
            type: 'ai_response_chunk',
            data: chunk.delta.text,
          })
        );
      }
    }

    ws.send(
      JSON.stringify({
        type: 'ai_response_end',
        data: fullResponse,
      })
    );

    // Add to history
    session.transcriptionHistory.push({
      speaker: 'assistant',
      text: fullResponse,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Claude API error:', error);
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'AI processing error',
      })
    );
  }
}

console.log(`WebSocket server running on ws://localhost:${PORT}`);
console.log('Whisper model loaded and ready');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  whisper.destroy();
  wss.close();
  process.exit(0);
});
