#!/usr/bin/env bun
// Clean, minimal entrypoint for LLM annotation
import { annotateDirectory } from './index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const directory = args[0] || 'src';
  const outputDir = './workspace/annotations';
  const format = 'json';
  const depth = 'detailed';
  const includePrompts = true;

  try {
    const result = await annotateDirectory(directory, {
      targetDirectory: outputDir,
      includePatterns: ['**/*'],
      excludePatterns: ['node_modules/**', '**/*.test.*', '.git/**', 'build/**', 'dist/**'],
      analysisDepth: depth,
      focusAreas: undefined,
      outputFormat: format,
      includePrompts,
    });

    console.log('✅ Analysis completed!');
    if (result.outputPath) {
      console.log(`Output saved: ${result.outputPath}`);
    }
    if (result.errors?.length) {
      console.error('Errors:', result.errors);
    }
    if (result.warnings?.length) {
      console.warn('Warnings:', result.warnings);
    }
  } catch (error) {
    console.error('❌ LLM annotation failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
