#!/usr/bin/env bun

import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.js';
import type { TransformationRequest } from './src/types.js';

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

  // Example transformation request
  const exampleRequest: TransformationRequest = {
    targetFiles: ['./src/example.ts'],
    transformationType: 'template',
    maxComplexity: 10,
    dryRun: false,
  };

  // Send transformation request
  actor.send({
    type: 'START_TRANSFORMATION',
    request: exampleRequest,
  });

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
