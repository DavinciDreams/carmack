#!/usr/bin/env bun

/**
 * Simple script to test transformations on specific files with errors
 */

import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.ts';

console.log('🧪 Testing Carmack Coder on Error-Prone Files');

// Test files with known errors
const testFiles = [
  './test-complex.ts',
  './test-var-issues.ts', 
  './test-simple.ts'
];

console.log(`📋 Testing transformation on ${testFiles.length} files with errors:`);
testFiles.forEach((file, i) => console.log(`   ${i + 1}. ${file}`));

// Create actor for transformation
const actor = createActor(carmackCoderMachine, {
  input: {
    targetFiles: testFiles,
    transformationType: 'template', // Start with template mode for simple fixes
    maxComplexity: 15,
    dryRun: false,
  },
});

// Subscribe to state changes
actor.subscribe({
  next: (state) => {
    console.log(`State: ${state.value}`);
    if (state.context.currentTransformation) {
      console.log(`Status: ${state.context.currentTransformation.status}`);
    }
  },
  complete: () => {
    const finalState = actor.getSnapshot();
    console.log(`🎯 Final state: ${finalState.value}`);
    
    if (finalState.context.currentTransformation) {
      const transformation = finalState.context.currentTransformation;
      console.log('\n📊 Transformation Results:');
      console.log(`   📁 Files processed: ${transformation.filesModified?.length || 0}`);
      console.log(`   ⚡ Mode used: ${transformation.mode}`);
      console.log(`   ⏱️ Duration: ${transformation.endTime - transformation.startTime}ms`);
      
      if (transformation.filesModified?.length > 0) {
        console.log('   ✅ Modified files:');
        transformation.filesModified.forEach(file => console.log(`      - ${file}`));
      }
      
      if (transformation.errors?.length > 0) {
        console.log('   ❌ Errors:');
        transformation.errors.forEach(error => console.log(`      - ${error}`));
      }
    }
  },
});

// Start the transformation
actor.start();

// Send start event
actor.send({
  type: 'START_TRANSFORMATION',
  request: {
    targetFiles: testFiles,
    transformationType: 'template',
    maxComplexity: 15,
    dryRun: false,
  },
});
