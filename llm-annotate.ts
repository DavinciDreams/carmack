#!/usr/bin/env bun

/**
 * LLM Annotation CLI
 *
 * Command-line interface for generating LLM-optimized code annotations
 * that help language models understand code structure and patterns.
 */

import { LLMAnnotationSystem } from './src/llm-annotation/index.js';
import type { AnnotationRequest } from './src/llm-annotation/types.js';

interface CLIOptions {
  directory?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'yaml';
  depth?: 'surface' | 'detailed' | 'comprehensive';
  focus?: string[];
  include?: string[];
  exclude?: string[];
  help?: boolean;
  verbose?: boolean;
  'no-prompts'?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--directory':
      case '-d':
        options.directory = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'json' | 'markdown' | 'yaml';
        break;
      case '--depth':
        options.depth = args[++i] as 'surface' | 'detailed' | 'comprehensive';
        break;
      case '--focus':
        options.focus = args[++i]?.split(',') || [];
        break;
      case '--include':
        options.include = args[++i]?.split(',') || [];
        break;
      case '--exclude':
        options.exclude = args[++i]?.split(',') || [];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--no-prompts':
        options['no-prompts'] = true;
        break;
      default:
        if (!options.directory && !arg.startsWith('-')) {
          options.directory = arg;
        }
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🤖 LLM Annotation CLI - Generate LLM-optimized code annotations

USAGE:
  bun run llm-annotate.ts [directory] [options]

ARGUMENTS:
  directory                 Directory to analyze (default: current directory)

OPTIONS:
  -h, --help               Show this help message
  -d, --directory <path>   Directory to analyze
  -o, --output <path>      Output directory (default: ./output/annotations)
  -f, --format <format>    Output format: json, markdown, yaml (default: json)
  --depth <level>          Analysis depth: surface, detailed, comprehensive (default: detailed)
  --focus <areas>          Focus areas: patterns,architecture,performance,security,maintainability
  --include <patterns>     Include file patterns (comma-separated)
  --exclude <patterns>     Exclude file patterns (comma-separated)
  --no-prompts            Don't generate LLM prompts
  -v, --verbose           Verbose output

EXAMPLES:
  # Analyze current directory
  bun run llm-annotate.ts

  # Analyze specific directory with markdown output
  bun run llm-annotate.ts ./src --format markdown

  # Comprehensive analysis focusing on patterns and architecture
  bun run llm-annotate.ts --depth comprehensive --focus patterns,architecture

  # Analyze with custom include/exclude patterns
  bun run llm-annotate.ts --include "**/*.ts,**/*.tsx" --exclude "**/*.test.*,**/node_modules/**"

  # Generate annotations for LLM consumption
  bun run llm-annotate.ts ./src --format json --output ./llm-context

FOCUS AREAS:
  patterns        - Code patterns and anti-patterns
  architecture    - System architecture and component relationships
  performance     - Performance optimization opportunities
  security        - Security vulnerabilities and improvements
  maintainability - Code maintainability and technical debt

OUTPUT FORMATS:
  json           - Structured JSON for programmatic use
  markdown       - Human-readable markdown report
  yaml           - YAML format for configuration-like usage

The generated annotations include:
  • Code patterns and architectural insights
  • Transformation opportunities with effort estimates
  • LLM-optimized prompts for code review and refactoring
  • Quality metrics and recommendations
  • Structured data for AI-assisted development
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  const directory = options.directory || '.';
  const outputDir = options.output || './output/annotations';
  const format = options.format || 'json';
  const depth = options.depth || 'detailed';
  const includePrompts = !options['no-prompts'];

  console.log('🤖 LLM Annotation System');
  console.log(`📁 Analyzing: ${directory}`);
  console.log(`📄 Format: ${format}`);
  console.log(`🔍 Depth: ${depth}`);
  console.log(`💾 Output: ${outputDir}`);

  if (options.focus) {
    console.log(`🎯 Focus: ${options.focus.join(', ')}`);
  }

  console.log('');

  try {
    const system = new LLMAnnotationSystem();

    const request: AnnotationRequest = {
      sourceFiles: [], // Will be populated by annotateDirectory
      targetDirectory: outputDir,
      includePatterns: options.include || ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      excludePatterns: options.exclude || [
        'node_modules/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
      ],
      analysisDepth: depth,
      focusAreas: options.focus as any,
      outputFormat: format,
      includePrompts,
    };

    if (options.verbose) {
      console.log('📋 Configuration:');
      console.log(`   Include patterns: ${request.includePatterns.join(', ')}`);
      console.log(`   Exclude patterns: ${request.excludePatterns.join(', ')}`);
      console.log(`   Analysis depth: ${request.analysisDepth}`);
      console.log(`   Include prompts: ${request.includePrompts}`);
      console.log('');
    }

    const startTime = Date.now();
    const result = await system.annotateDirectory(directory, request);
    const endTime = Date.now();

    console.log('✅ Analysis completed successfully!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Processing time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`   Source files: ${result.annotation.metadata.sourceFiles}`);
    console.log(`   Patterns detected: ${result.annotation.patterns.length}`);
    console.log(`   Architecture components: ${result.annotation.architecture.length}`);
    console.log(`   Transformation opportunities: ${result.annotation.opportunities.length}`);
    console.log(
      `   Overall confidence: ${(result.annotation.metadata.confidence * 100).toFixed(1)}%`
    );

    if (result.outputPath) {
      console.log(`   Output saved: ${result.outputPath}`);
    }

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('');
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }

    // Show summary
    console.log('');
    console.log('📋 Summary:');
    console.log(`   ${result.annotation.summary.overview}`);

    if (result.annotation.summary.keyFindings.length > 0) {
      console.log('');
      console.log('🔍 Key Findings:');
      result.annotation.summary.keyFindings.forEach((finding, i) => {
        console.log(`   ${i + 1}. ${finding}`);
      });
    }

    if (result.annotation.summary.recommendations.length > 0) {
      console.log('');
      console.log('💡 Top Recommendations:');
      result.annotation.summary.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    // Show top opportunities
    const topOpportunities = result.annotation.opportunities
      .sort((a, b) => {
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const effortOrder = { trivial: 1, small: 2, medium: 3, large: 4, epic: 5 };

        const aScore =
          (impactOrder[a.risk as keyof typeof impactOrder] || 0) /
          (effortOrder[a.effort as keyof typeof effortOrder] || 1);
        const bScore =
          (impactOrder[b.risk as keyof typeof impactOrder] || 0) /
          (effortOrder[b.effort as keyof typeof effortOrder] || 1);

        return bScore - aScore;
      })
      .slice(0, 3);

    if (topOpportunities.length > 0) {
      console.log('');
      console.log('🚀 Priority Opportunities:');
      topOpportunities.forEach((opp, i) => {
        console.log(`   ${i + 1}. ${opp.title} (${opp.effort} effort, ${opp.risk} risk)`);
        console.log(`      ${opp.description}`);
      });
    }

    if (includePrompts && options.verbose) {
      console.log('');
      console.log('🤖 Generated LLM Prompts:');
      console.log(
        '   Code Review:',
        `${result.annotation.llmPrompts.codeReview.substring(0, 100)}...`
      );
      console.log(
        '   Refactoring:',
        `${result.annotation.llmPrompts.refactoring.substring(0, 100)}...`
      );
      console.log(
        '   Optimization:',
        `${result.annotation.llmPrompts.optimization.substring(0, 100)}...`
      );
    }

    console.log('');
    console.log('🎉 LLM annotation generation completed!');

    if (result.outputPath) {
      console.log(`📁 Open ${result.outputPath} to view the full annotation.`);
    }
  } catch (error) {
    console.error('❌ LLM annotation failed:', error);
    process.exit(1);
  }
}

// Run the CLI if this script is executed directly
if (import.meta.main) {
  await main();
}

export { main as runLLMAnnotationCLI };
