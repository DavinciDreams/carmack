#!/usr/bin/env bun

import { parseArgs, showHelp, annotateDirectory } from './src/llm-annotation/index.js';
import { existsSync, statSync } from 'fs';

const RESERVED_SUBCOMMANDS = ['help', '--help', '-h', 'version', '--version', 'init'];

function resolveDirectoryArg(args: string[]): string {
  if (args.length === 0) return 'src';
  const first = args[0];
  if (RESERVED_SUBCOMMANDS.includes(first)) return 'src';
  try {
    if (existsSync(first) && statSync(first).isDirectory()) return first;
  } catch { /* ignore */ }
  return 'src';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  // Directory resolution logic
  let directory = options.directory || resolveDirectoryArg(args);
  if (
    RESERVED_SUBCOMMANDS.includes(directory) ||
    !existsSync(directory) ||
    !statSync(directory).isDirectory()
  ) {
    directory = 'src';
  }

  const outputDir = options.output || './output/annotations';
  const format = options.format || 'json';
  const depth = options.depth || 'detailed';
  const includePrompts = !options['no-prompts'];

  try {
    const result = await annotateDirectory(directory, {
      targetDirectory: outputDir,
      includePatterns: options.include,
      excludePatterns: options.exclude,
      analysisDepth: depth,
      focusAreas: options.focus,
      outputFormat: format,
      includePrompts,
    });

    // Minimal reporting to preserve CLI flow
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

export { main as runLLMAnnotationCLI };
