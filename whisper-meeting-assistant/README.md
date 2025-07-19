# Whisper Meeting Assistant

A real-time meeting transcription app with AI-powered insights, built with Whisper.cpp, Bun, React, and Claude.

## Features

- **Real-time Transcription**: Uses Whisper large-v3-turbo model for fast, accurate transcription
- **Dual Audio Capture**: Records both microphone (you) and speaker audio (caller)
- **AI Meeting Notes**: Claude provides intelligent insights during conversations
- **Fast Local Processing**: Whisper.cpp with Bun FFI for 2.5x faster execution
- **Privacy-First**: Your API key stays local, never stored

## Quick Start

### Prerequisites

- Bun (latest version)
- Git
- CMake (for building Whisper.cpp)
- ~2GB disk space for Whisper model

### Installation

1. Clone and enter the project:
```bash
git clone <your-repo>
cd whisper-meeting-assistant
```

2. Install dependencies:
```bash
bun install
cd frontend && bun install && cd ..
```

3. Set up Whisper.cpp (one-time setup):
```bash
bun run setup:whisper
```

This will:
- Clone Whisper.cpp
- Build with hardware acceleration (Metal on macOS, CUDA if available)
- Download and quantize the large-v3-turbo model

### Running the App

Start both backend and frontend:
```bash
bun run dev
```

- Backend WebSocket server: `ws://localhost:8080`
- Frontend: `http://localhost:5173`

## Usage

1. **Add Your API Key**: Click the settings icon and add your Anthropic API key
2. **Grant Permissions**: Allow microphone and screen recording access
3. **Start Recording**: Click the microphone button
4. **Select Audio Source**: Choose your call/meeting window for speaker audio
5. **Talk**: The app transcribes in real-time and Claude provides insights

## Architecture

### Backend (Bun + Whisper.cpp)
- **Whisper.cpp FFI**: Direct bindings for maximum speed
- **Q5_0 Quantization**: Best balance of speed and accuracy
- **WebSocket Server**: Real-time audio streaming
- **Smart Buffering**: Processes audio every 3 seconds

### Frontend (React + Vite)
- **Web Audio API**: Captures both mic and speaker audio
- **ScriptProcessor**: Streams audio chunks to backend
- **shadcn/ui**: Beautiful, accessible UI components
- **Real-time Updates**: Live transcription and AI responses

## Performance Optimizations

- **Whisper large-v3-turbo**: 5x faster than standard large-v3
- **Bun FFI**: 2.5x faster than Node.js bindings
- **Hardware Acceleration**: Automatic Metal/CUDA detection
- **Efficient Streaming**: 16kHz mono audio, 3-second chunks

## Security Notes

- API keys are only sent to your local backend
- Consider using environment variables for production
- Audio data never leaves your machine
- All processing happens locally

## Troubleshooting

### "Failed to initialize Whisper context"
Run `bun run setup:whisper` to download the model

### No speaker audio on macOS
Grant screen recording permission in System Settings > Privacy & Security

### Poor transcription quality
- Ensure good microphone quality
- Reduce background noise
- Check audio levels aren't clipping

## Future Enhancements

- Speaker diarization for better multi-person support
- Export meeting summaries
- Custom wake words for AI activation
- Meeting recording and playback

## License

MIT