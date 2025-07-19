#!/usr/bin/env bun

import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.js';
import type { AstPattern, TransformationMode, TransformationRequest } from './src/types.js';
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

interface CliOptions {
  mode: TransformationMode | undefined;
  dryRun: boolean;
  maxComplexity: number;
  verbose: boolean;
  help: boolean;
  files: string[];
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    mode: undefined, // Auto-detect by default
    dryRun: false,
    maxComplexity: 15,
    verbose: false,
    help: false,
    files: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) continue;

    switch (arg) {
      case '--mode':
      case '-m': {
        i++;
        const modeArg = args[i];
        if (!modeArg) {
          console.error('❌ Mode option requires a value');
          process.exit(1);
        }
        const mode = modeArg as TransformationMode;
        if (['template', 'ast', 'llm'].includes(mode)) {
          options.mode = mode;
        } else {
          console.error(`❌ Invalid mode: ${mode}. Valid modes: template, ast, llm`);
          process.exit(1);
        }
        break;
      }

      case '--complexity':
      case '-c': {
        i++;
        const complexityArg = args[i];
        if (!complexityArg) {
          console.error('❌ Complexity option requires a value');
          process.exit(1);
        }
        const complexity = Number.parseInt(complexityArg, 10);
        if (Number.isNaN(complexity) || complexity < 1) {
          console.error(`❌ Invalid complexity: ${complexityArg}. Must be a positive number.`);
          process.exit(1);
        }
        options.maxComplexity = complexity;
        break;
      }

      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Unknown option: ${arg}`);
          process.exit(1);
        } else {
          options.files.push(arg);
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🎯 Carmack Coder - Provably Correct Code Transformations

USAGE:
  bun run index.ts [OPTIONS] [FILES...]

OPTIONS:
  -m, --mode <mode>         Transformation mode: template, ast, llm
                           (default: auto-detect based on complexity)
  
  -d, --dry-run            Preview changes without applying them
  
  -c, --complexity <num>   Maximum complexity threshold (default: 15)
  
  -v, --verbose            Enable verbose output
  
  -h, --help               Show this help message

MODES:
  template                 Fast regex-based transformations (⚡ fastest)
  ast                      AST-grep semantic transformations (🧠 smarter)
  llm                      AI-powered intelligent transformations (🤖 smartest)

EXAMPLES:
  bun run index.ts src/example.ts
  bun run index.ts --mode ast src/**/*.ts
  bun run index.ts --mode template --dry-run test.ts
  bun run index.ts --complexity 10 --verbose src/

PATTERN CATEGORIES:
  Template Mode: var→const, ==→===, console.log→console.error
  AST Mode: object shorthand, Promise→async/await, smart var analysis
  LLM Mode: complex refactoring, architectural improvements
`);
}

async function main() {
  const options = parseCliArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🚀 Starting Carmack Coder...');

  if (options.verbose) {
    console.log('🔧 CLI Options:', JSON.stringify(options, null, 2));
  }

  // Use provided files or default to example
  const targetFiles = options.files.length > 0 ? options.files : ['./src/example.ts'];

  if (options.verbose) {
    console.log(`📁 Target files: ${targetFiles.join(', ')}`);
  }

  // Load transformation patterns
  const patterns = await loadPatterns('./patterns.json');
  console.log(`📋 Loaded ${patterns.length} transformation patterns`);

  // If user specified a specific mode, run only that mode
  if (options.mode) {
    const filteredPatterns = patterns.filter(
      (p) => p.mode === options.mode || (!p.mode && options.mode === 'template')
    );
    console.log(`🎯 Filtered to ${filteredPatterns.length} patterns for ${options.mode} mode`);

    await runSingleTransformation(options.mode, targetFiles, filteredPatterns, options);
  } else {
    // Run all transformation modes in succession: Template → AST → LLM
    console.log('🚀 Running comprehensive transformation pipeline: Template → AST → LLM');
    
    const modes: TransformationMode[] = ['template', 'ast', 'llm'];
    let totalTransformations = 0;
    const results: Array<{ mode: TransformationMode; success: boolean; duration: number }> = [];

    for (const mode of modes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Starting ${mode.toUpperCase()} transformation mode...`);
      console.log(`${'='.repeat(60)}`);

      const filteredPatterns = patterns.filter(
        (p) => p.mode === mode || (!p.mode && mode === 'template')
      );

      if (filteredPatterns.length === 0) {
        console.log(`⚠️  No patterns available for ${mode} mode, skipping...`);
        results.push({ mode, success: true, duration: 0 });
        continue;
      }

      console.log(`🎯 Using ${filteredPatterns.length} patterns for ${mode} mode`);

      const startTime = Date.now();
      try {
        await runSingleTransformation(mode, targetFiles, filteredPatterns, options);
        const duration = Date.now() - startTime;
        results.push({ mode, success: true, duration });
        totalTransformations++;
        console.log(`✅ ${mode.toUpperCase()} transformation completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({ mode, success: false, duration });
        console.error(`❌ ${mode.toUpperCase()} transformation failed:`, error);
        
        // Continue with next mode instead of stopping
        if (options.verbose) {
          console.log('Continuing with next transformation mode...');
        }
      }
    }

    // Summary report
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TRANSFORMATION PIPELINE SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    results.forEach(({ mode, success, duration }) => {
      const status = success ? '✅ SUCCESS' : '❌ FAILED';
      const time = duration > 0 ? `${duration}ms` : 'skipped';
      console.log(`${mode.toUpperCase().padEnd(8)} ${status.padEnd(10)} (${time})`);
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n🎯 Pipeline completed: ${successCount}/${results.length} modes successful`);
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    
    if (successCount === results.length) {
      console.log('🎉 All transformation modes completed successfully!');
    } else {
      console.log('⚠️  Some transformation modes encountered issues but pipeline continued');
    }
  }

async function runSingleTransformation(
  mode: TransformationMode,
  targetFiles: string[],
  filteredPatterns: AstPattern[],
  options: CliOptions
): Promise<void> {
  // Create and start the state machine actor
  const actor = createActor(carmackCoderMachine);

  // Subscribe to state changes for debugging
  if (options.verbose) {
    actor.subscribe((state) => {
      console.log(`State: ${state.value}`);
      if (state.context.currentTransformation) {
        console.log(`Status: ${state.context.currentTransformation.status}`);
      }
    });
  }

  actor.start();

  // Dynamic transformation request based on mode
  const transformationRequest: TransformationRequest = {
    targetFiles,
    transformationType: mode,
    patterns: filteredPatterns,
    maxComplexity: options.maxComplexity,
    dryRun: options.dryRun,
  };

  if (options.verbose) {
    console.log('🎛️ Transformation Request:', JSON.stringify(transformationRequest, null, 2));
  }

  // Send transformation request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor.send({
    type: 'START_TRANSFORMATION',
    request: transformationRequest,
    // biome-ignore lint/suspicious/noExplicitAny: Required for XState event type compatibility
  } as any);

  // Wait for completion
  await new Promise<void>((resolve, reject) => {
    actor.subscribe((state) => {
      if (state.matches('succeeded')) {
        console.log(`✅ ${mode.toUpperCase()} transformation succeeded!`);
        if (options.verbose) {
          console.log('Final context:', JSON.stringify(state.context, null, 2));
        }
        actor.stop();
        resolve();
      } else if (state.matches('failed')) {
        console.error(`❌ ${mode.toUpperCase()} transformation failed`);
        if (options.verbose) {
          console.log('Final context:', JSON.stringify(state.context, null, 2));
        }
        actor.stop();
        reject(new Error(`${mode} transformation failed`));
      }
    });
  });
}
}

// Handle errors gracefully
main().catch((error) => {
  console.error('❌ Error in Carmack Coder:', error);
  process.exit(1);
});
