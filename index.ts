#!/usr/bin/env bun

import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  applyTemplateTransformations,
  type TemplatePattern,
} from './src/actors/template-engine.ts';
import type { AstPattern, TransformationMode } from './src/types.ts';
import { loadPatterns } from './src/utils/index.ts';

interface CliOptions {
  mode: TransformationMode;
  dryRun: boolean;
  maxComplexity: number;
  verbose: boolean;
  help: boolean;
  patternsPath: string;
  files: string[];
}

const defaultPatternsPath = join(import.meta.dir, 'src', 'patterns', 'patterns.json');

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    mode: 'template',
    dryRun: true,
    maxComplexity: 15,
    verbose: false,
    help: false,
    patternsPath: defaultPatternsPath,
    files: [],
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg) continue;

    switch (arg) {
      case '--mode':
      case '-m': {
        const mode = args[++index] as TransformationMode | undefined;
        if (!mode || !['template', 'ast', 'llm'].includes(mode)) {
          throw new Error('Mode must be one of: template, ast, llm');
        }
        options.mode = mode;
        break;
      }
      case '--complexity':
      case '-c': {
        const value = args[++index];
        const complexity = value ? Number.parseInt(value, 10) : Number.NaN;
        if (!Number.isInteger(complexity) || complexity < 1) {
          throw new Error('Complexity must be a positive integer');
        }
        options.maxComplexity = complexity;
        break;
      }
      case '--patterns': {
        const value = args[++index];
        if (!value) throw new Error('--patterns requires a file path');
        options.patternsPath = resolve(value);
        break;
      }
      case '--write':
        options.dryRun = false;
        break;
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
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        options.files.push(resolve(arg));
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Carmack Coder - deterministic code transformations

USAGE:
  bun run index.ts [OPTIONS] [FILES...]

OPTIONS:
  -m, --mode <mode>         Transformation mode (template is currently supported)
  -d, --dry-run             Preview matches without changing files (default)
      --write               Apply transformations to files explicitly
  -c, --complexity <num>    Maximum pattern complexity (default: 15)
      --patterns <path>     Pattern catalog (default: src/patterns/patterns.json)
  -v, --verbose             Print the resolved request and result
  -h, --help                Show this help

EXAMPLES:
  bun run index.ts src/example.ts
  bun run index.ts --dry-run src/example.ts
  bun run index.ts --write src/example.ts

SAFETY:
  Dry-run is the default. Carmack never stages, commits, or resets Git state.
  The legacy AST and LLM orchestration tiers are disabled until their contracts
  and integration tests are restored.
`);
}

function toTemplatePattern(pattern: AstPattern): TemplatePattern {
  return {
    id: pattern.id,
    language: pattern.language,
    pattern: {
      template: pattern.pattern,
      flags: 'g',
    },
    replacement: {
      template: pattern.replacement,
    },
    description: pattern.description,
    complexity: pattern.complexity,
    riskLevel: pattern.riskLevel,
    category: pattern.category ?? 'general',
    performance: pattern.performance
      ? {
          priority: pattern.performance.priority,
          batchable: pattern.performance.batchable,
          conflicts: pattern.performance.conflicts,
        }
      : undefined,
    testCases: pattern.testCases,
  };
}

async function main(): Promise<void> {
  const options = parseCliArgs();
  if (options.help) {
    showHelp();
    return;
  }

  if (options.mode !== 'template') {
    throw new Error(
      `${options.mode} mode is part of the legacy pipeline and is disabled during the safety revival`
    );
  }

  const targetFiles = options.files.length > 0 ? options.files : [resolve('./src/example.ts')];
  await Promise.all(targetFiles.map((filePath) => access(filePath)));

  const patterns = await loadPatterns(options.patternsPath);
  const templatePatterns = patterns
    .filter((pattern) => pattern.mode === 'template')
    .map(toTemplatePattern);

  if (templatePatterns.length === 0) {
    throw new Error(`No template patterns were loaded from ${options.patternsPath}`);
  }

  if (options.verbose) {
    console.log(
      JSON.stringify(
        {
          mode: options.mode,
          dryRun: options.dryRun,
          maxComplexity: options.maxComplexity,
          patternsPath: options.patternsPath,
          targetFiles,
          patternCount: templatePatterns.length,
        },
        null,
        2
      )
    );
  }

  const result = await applyTemplateTransformations({
    targetFiles,
    patterns: templatePatterns,
    options: {
      dryRun: options.dryRun,
      maxComplexity: options.maxComplexity,
      enableBatching: true,
      skipConflicts: true,
      preserveFormatting: true,
    },
  });

  const verb = options.dryRun ? 'would change' : 'changed';
  console.log(
    `${options.dryRun ? 'Dry run' : 'Write complete'}: ${result.transformationsApplied} transformation(s) ${verb} ${result.filesModified.length} file(s).`
  );

  if (options.verbose && result.appliedPatterns.length > 0) {
    console.log(JSON.stringify(result.appliedPatterns, null, 2));
  }
}

main().catch((error) => {
  console.error(`Carmack failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
