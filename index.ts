#!/usr/bin/env bun

import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.js';
import type { TransformationRequest } from './src/types.js';
import { loadPatterns } from './src/utils/index.js';

/**
 * Carmack Coder - Code Editing Agent Architecture
 *
 * A sophisticated code transformation system that uses:
 * - Zod for runtime validation and type safety
 * - XState for deterministic state machine orchestration
 * - AST-grep for syntax tree transformations
 * - Dafny for formal verification of correctness
 * - Biome for formatting and ESLint for quality analysis
 *
 * The system prioritizes speed (template -> AST -> LLM) while ensuring
 * provably correct outputs through formal verification.
 */

async function main() {
  console.log('🚀 Starting Carmack Coder...');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const targetFiles = args.length > 0 ? args : ['./src/example.ts'];

  // Load transformation patterns
  const patterns = await loadPatterns('./patterns.json');
  console.log(`📋 Loaded ${patterns.length} transformation patterns`);

  // Create and start the state machine actor
  const actor = createActor(carmackCoderMachine);

  // Subscribe to state changes for debugging
  actor.subscribe((state) => {
    console.log(`State: ${state.value}`);
    if (state.context.currentTransformation) {
      console.log(`Status: ${state.context.currentTransformation.status}`);
    }
  });

  actor.start();

  // Dynamic transformation request based on CLI args
  const transformationRequest: TransformationRequest = {
    targetFiles,
    transformationType: 'template', // Will be determined by analysis
    patterns: patterns, // Include all patterns for mode selection
    maxComplexity: 15, // Allow higher complexity for AST/LLM modes
    dryRun: false,
  };

  // Send transformation request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor.send({
    type: 'START_TRANSFORMATION',
    request: transformationRequest,
    // biome-ignore lint/suspicious/noExplicitAny: Required for XState event type compatibility
  } as any);

  // Wait for completion
  await new Promise<void>((resolve) => {
    actor.subscribe((state) => {
      if (state.matches('succeeded') || state.matches('failed')) {
        console.log('🎯 Transformation completed!');
        console.log('Final state:', state.value);
        console.log('Final context:', JSON.stringify(state.context, null, 2));
        actor.stop();
        resolve();
      }
    });
  });
}

// Handle errors gracefully
main().catch((error) => {
  console.error('❌ Error in Carmack Coder:', error);
  process.exit(1);
});
