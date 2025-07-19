import { dlopen, FFIType, suffix } from 'bun:ffi';
import { existsSync } from 'fs';
import { join } from 'path';

// Determine the correct library path based on platform
const projectRoot = join(import.meta.dir, '..');
const libName = `libwhisper.${suffix}`;
const possiblePaths = [
  // macOS typical cmake output locations
  join(projectRoot, 'whisper.cpp', 'build', 'src', libName),
  join(projectRoot, 'whisper.cpp', 'build', libName),
  join(projectRoot, 'whisper.cpp', 'build', 'bin', libName),
  // Additional macOS locations
  join(projectRoot, 'whisper.cpp', 'build', 'lib', libName),
  join(projectRoot, 'whisper.cpp', 'build', 'src', 'Release', libName),
  join(projectRoot, 'whisper.cpp', 'build', 'src', 'Debug', libName),
];

// Find the actual library
const libPath = possiblePaths.find((p) => existsSync(p));
if (!libPath) {
  throw new Error(`
    Whisper library not found. Please run setup first:
    $ bun run setup:whisper
    
    Expected library at one of:
    ${possiblePaths.join('\n')}
  `);
}

console.log(`Loading whisper library from: ${libPath}`);

const lib = dlopen(libPath, {
  // Context management
  whisper_init_from_file: {
    args: [FFIType.cstring],
    returns: FFIType.ptr,
  },
  whisper_free: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },

  // Full params - this is actually a struct, not a pointer
  whisper_full_default_params: {
    args: [FFIType.i32], // strategy
    returns: FFIType.ptr, // Returns struct by value, but FFI treats as ptr
  },

  // Processing
  whisper_full: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },

  // Results
  whisper_full_n_segments: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  whisper_full_get_segment_text: {
    args: [FFIType.ptr, FFIType.i32],
    returns: FFIType.cstring,
  },
  whisper_full_get_segment_t0: {
    args: [FFIType.ptr, FFIType.i32],
    returns: FFIType.i64,
  },
  whisper_full_get_segment_t1: {
    args: [FFIType.ptr, FFIType.i32],
    returns: FFIType.i64,
  },

  // Additional functions we'll need
  whisper_full_lang_id: {
    args: [FFIType.cstring],
    returns: FFIType.i32,
  },
});

export class WhisperContext {
  private ctx: any;
  private modelPath: string;

  constructor(modelPath?: string) {
    // Default to the quantized model if not specified
    this.modelPath =
      modelPath || join(projectRoot, 'whisper.cpp', 'models', 'ggml-large-v3-turbo-q5_0.bin');

    if (!existsSync(this.modelPath)) {
      throw new Error(`Model not found at ${this.modelPath}. Run: bun run setup:whisper`);
    }

    console.log(`Initializing whisper with model: ${this.modelPath}`);
    this.ctx = lib.symbols.whisper_init_from_file(Buffer.from(this.modelPath + '\0'));
    if (!this.ctx) {
      throw new Error('Failed to initialize Whisper context');
    }
  }

  transcribe(audioData: Float32Array, language = 'en'): TranscriptionResult[] {
    // Get language ID
    const langId = lib.symbols.whisper_full_lang_id(Buffer.from(language + '\0'));

    // Get default params with greedy strategy (0)
    // Note: This returns a struct, but we'll use it as an opaque pointer
    const params = lib.symbols.whisper_full_default_params(0);

    // IMPORTANT: whisper.cpp expects the audio data as a float* pointer
    // The audio should be mono 16kHz
    const audioBuffer = Buffer.from(audioData.buffer);

    // Process audio
    const result = lib.symbols.whisper_full(this.ctx, params, audioBuffer, audioData.length);

    if (result !== 0) {
      throw new Error(`Whisper processing failed with code ${result}`);
    }

    // Extract segments
    const segments: TranscriptionResult[] = [];
    const nSegments = lib.symbols.whisper_full_n_segments(this.ctx);

    for (let i = 0; i < nSegments; i++) {
      const text = lib.symbols.whisper_full_get_segment_text(this.ctx, i);
      const t0 = lib.symbols.whisper_full_get_segment_t0(this.ctx, i);
      const t1 = lib.symbols.whisper_full_get_segment_t1(this.ctx, i);

      segments.push({
        text: text || '',
        start: Number(t0) / 100, // Convert to seconds
        end: Number(t1) / 100,
      });
    }

    return segments;
  }

  destroy() {
    if (this.ctx) {
      lib.symbols.whisper_free(this.ctx);
      this.ctx = null;
    }
  }
}

export interface TranscriptionResult {
  text: string;
  start: number;
  end: number;
}

// Helper to convert audio buffer to Float32Array at 16kHz
export function prepareAudioData(buffer: Buffer, sampleRate = 48000): Float32Array {
  // Convert to mono 16kHz Float32Array
  const inputSamples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  const outputLength = Math.floor((inputSamples.length * 16000) / sampleRate);
  const output = new Float32Array(outputLength);

  const ratio = sampleRate / 16000;
  for (let i = 0; i < outputLength; i++) {
    const inputIndex = Math.floor(i * ratio);
    output[i] = inputSamples[inputIndex] / 32768.0; // Convert to float
  }

  return output;
}
