import { fromPromise } from 'xstate';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  generateLLMAnnotations,
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  validateAnnotationRequest,
} from './analyzer.js';
import type { AnnotationRequest, AnnotationResult, LLMAnnotation } from './types.js';
import { CLIOptionsSchema, validateCLIOptions } from './types.js';
import type { CLIOptions } from './types.js';
import { z } from 'zod';

/**
 * Parse CLI arguments into CLIOptions
 */
export function parseArgs(args: string[]): CLIOptions {
  const options: Partial<CLIOptions> = {};

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
      case '-f': {
        const format = args[++i];
        const formatResult = z.enum(['json', 'markdown', 'yaml']).safeParse(format);
        if (formatResult.success) {
          options.format = formatResult.data;
        } else {
          throw new Error(`Invalid format: ${format}. Must be one of: json, markdown, yaml`);
        }
        break;
      }
      case '--depth': {
        const depth = args[++i];
        const depthResult = z.enum(['surface', 'detailed', 'comprehensive']).safeParse(depth);
        if (depthResult.success) {
          options.depth = depthResult.data;
        } else {
          throw new Error(
            `Invalid depth: ${depth}. Must be one of: surface, detailed, comprehensive`
          );
        }
        break;
      }
      case '--focus': {
        const focusAreas = args[++i]?.split(',') || [];
        const validatedFocus = focusAreas.map((area) => {
          const result = z
            .enum(['patterns', 'architecture', 'performance', 'security', 'maintainability'])
            .safeParse(area.trim());
          if (!result.success) {
            throw new Error(
              `Invalid focus area: ${area}. Must be one of: patterns, architecture, performance, security, maintainability`
            );
          }
          return result.data;
        });
        options.focus = validatedFocus;
        break;
      }
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
        if (!options.directory && typeof arg === 'string' && !arg.startsWith('-')) {
          options.directory = arg;
        }
        break;
    }
  }

  // Validate the entire options object
  return validateCLIOptions(options);
}

/**
 * Print CLI help message
 */
export function showHelp(): void {
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

/**
 * LLM Annotation System
 *
 * Main interface for generating LLM-optimized code annotations
 * that help language models understand code structure, patterns,
 * and transformation opportunities.
 */
export class LLMAnnotationSystem {
  private analyzer: LLMAnnotationAnalyzer;

  constructor() {
    this.analyzer = new LLMAnnotationAnalyzer();
  }

  /**
   * Generate annotations for a set of source files
   */
  async annotate(request: AnnotationRequest): Promise<AnnotationResult> {
    return await this.analyzer.generateAnnotations(request);
  }

  /**
   * Generate annotations for a directory
   */
  async annotateDirectory(
    directoryPath: string,
    options: Partial<AnnotationRequest> = {}
  ): Promise<AnnotationResult> {
    const { readdir, stat } = await import('node:fs/promises');
    const { join, extname } = await import('node:path');

    // Recursively find source files
    const sourceFiles: string[] = [];

    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await readdir(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Skip common directories to exclude
            if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry)) {
              await scanDirectory(fullPath);
            }
          } else if (stats.isFile()) {
            const ext = extname(fullPath);
            if (
              [
                '.ts',
                '.js',
                '.tsx',
                '.jsx',
                '.py',
                '.cpp',
                '.c',
                '.h',
                '.hpp',
                '.cu',
                '.cuh',
                '.java',
                '.cs',
                '.go',
                '.rs',
                '.rb',
                '.php',
                '.swift',
                '.kt',
                '.scala',
                '.clj',
                '.hs',
                '.ml',
                '.fs',
                '.vb',
                '.dart',
                '.lua',
                '.r',
                '.sql',
                '.sh',
                '.bat',
                '.ps1',
              ].includes(ext)
            ) {
              sourceFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    };

    await scanDirectory(directoryPath);

    const request: AnnotationRequest = {
      sourceFiles,
      targetDirectory: options.targetDirectory || './output/annotations',
      includePatterns: options.includePatterns || ['**/*'],
      excludePatterns: options.excludePatterns || ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      analysisDepth: options.analysisDepth || 'detailed',
      focusAreas: options.focusAreas,
      outputFormat: options.outputFormat || 'json',
      includePrompts: options.includePrompts !== false,
    };

    return await this.annotate(request);
  }

  /**
   * Generate annotations for the current project
   */
  async annotateProject(options: Partial<AnnotationRequest> = {}): Promise<AnnotationResult> {
    return await this.annotateDirectory('.', options);
  }

  /**
   * Extract LLM prompts from an annotation
   */
  extractPrompts(annotation: LLMAnnotation): Record<string, string> {
    return annotation.llmPrompts;
  }

  /**
   * Get transformation opportunities from an annotation
   */
  getOpportunities(annotation: LLMAnnotation) {
    return annotation.opportunities.sort((a, b) => {
      // Sort by impact and effort
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const effortOrder = { trivial: 1, small: 2, medium: 3, large: 4, epic: 5 };

      const aScore =
        (impactOrder[a.risk as keyof typeof impactOrder] || 0) /
        (effortOrder[a.effort as keyof typeof effortOrder] || 1);
      const bScore =
        (impactOrder[b.risk as keyof typeof impactOrder] || 0) /
        (effortOrder[b.effort as keyof typeof effortOrder] || 1);

      return bScore - aScore;
    });
  }

  /**
   * Generate a summary report from an annotation
   */
  generateReport(annotation: LLMAnnotation): string {
    const opportunities = this.getOpportunities(annotation);
    const topOpportunities = opportunities.slice(0, 5);

    return `# LLM Code Analysis Report

**Generated:** ${annotation.timestamp}  
**Confidence:** ${(annotation.metadata.confidence * 100).toFixed(1)}%  
**Processing Time:** ${(annotation.metadata.processingTime / 1000).toFixed(2)}s  

## Overview
${annotation.summary.overview}

## Key Findings
${annotation.summary.keyFindings.map((finding) => `- ${finding}`).join('\n')}

## Top Recommendations
${annotation.summary.recommendations
  .slice(0, 5)
  .map((rec, i) => `${i + 1}. ${rec}`)
  .join('\n')}

## Priority Transformation Opportunities

${topOpportunities
  .map(
    (opp, i) => `### ${i + 1}. ${opp.title}
- **Type:** ${opp.type}
- **Effort:** ${opp.effort}
- **Risk:** ${opp.risk}
- **Benefits:** ${opp.benefits.join(', ')}

${opp.description}
`
  )
  .join('\n')}

## Code Patterns Detected
${annotation.patterns.map((pattern) => `- **${pattern.name}** (${pattern.type}): ${pattern.description}`).join('\n')}

## Architecture Analysis
${annotation.architecture.map((arch) => `- **${arch.component}** (${arch.type}): ${arch.role}`).join('\n')}

## LLM Integration Prompts

### Code Review Prompt
\`\`\`
${annotation.llmPrompts.codeReview}
\`\`\`

### Refactoring Prompt
\`\`\`
${annotation.llmPrompts.refactoring}
\`\`\`

### Optimization Prompt
\`\`\`
${annotation.llmPrompts.optimization}
\`\`\`

---
*Generated by Carmack Coder LLM Annotation System v${annotation.version}*
`;
  }

  /**
   * Validate an annotation request
   */
  validateRequest(data: unknown): AnnotationRequest {
    return validateAnnotationRequest(data);
  }
}

// Create and export the annotation system actor
export const llmAnnotationSystemActor = fromPromise(
  async ({ input }: { input: AnnotationRequest }) => {
    const system = new LLMAnnotationSystem();
    return await system.annotate(input);
  }
);

// Export convenience functions
export const createLLMAnnotations = async (
  request: AnnotationRequest
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotate(request);
};

export const annotateDirectory = async (
  directoryPath: string,
  options: Partial<AnnotationRequest> = {}
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotateDirectory(directoryPath, options);
};

export const annotateProject = async (
  options: Partial<AnnotationRequest> = {}
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotateProject(options);
};

/**
 * Find all code files in a directory recursively (from llm-annotate-cli.ts)
 */
/**
 * Recursively find all code files in a directory.
 * Includes: .ts, .tsx, .js, .jsx (and other supported extensions).
 * Logs which files are included/excluded and why.
 */
export async function findCodeFiles(
  directory: string,
  maxFiles: number,
  includePatterns?: string[]
): Promise<string[]> {
  const files: string[] = [];
  const supportedExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx', // TypeScript/JavaScript
    '.py',
    '.pyi', // Python
    '.cpp',
    '.cc',
    '.cxx',
    '.c++', // C++
    '.c', // C
    '.h',
    '.hpp',
    '.hxx',
    '.h++', // Headers
    '.cu',
    '.cuh', // CUDA
    '.java', // Java
    '.cs', // C#
    '.go', // Go
    '.rs', // Rust
    '.rb', // Ruby
    '.php', // PHP
    '.swift', // Swift
    '.kt', // Kotlin
    '.scala', // Scala
    '.clj',
    '.cljs', // Clojure
    '.hs', // Haskell
    '.ml',
    '.mli', // OCaml
    '.fs',
    '.fsi', // F#
    '.vb', // VB.NET
    '.dart', // Dart
    '.lua', // Lua
    '.r',
    '.R', // R
    '.sql', // SQL
    '.sh', // Shell
    '.bat',
    '.cmd', // Batch
    '.ps1', // PowerShell
  ];

  /**
   * Returns true if the file should be included based on extension and patterns.
   * - If includePatterns is not specified, include all supported extensions.
   * - If includePatterns is specified, only include files whose extension matches any pattern's extension.
   */
  function shouldIncludeFile(fullPath: string, ext: string): boolean {
    if (!supportedExtensions.includes(ext)) {
      // Not a supported code file
      console.log(`[EXCLUDE] ${fullPath} (unsupported extension: ${ext})`);
      return false;
    }
    if (!includePatterns || includePatterns.length === 0) {
      // No patterns specified, include all supported extensions
      console.log(`[INCLUDE] ${fullPath} (supported extension, no pattern filter)`);
      return true;
    }
    // Relaxed: if any pattern ends with the extension, include
    const matches = includePatterns.some((pattern) => {
      const patternExt = pattern.startsWith('*.') ? pattern.slice(1) : pattern.slice(pattern.lastIndexOf('.'));
      return ext === patternExt;
    });
    if (matches) {
      console.log(`[INCLUDE] ${fullPath} (matches includePatterns)`);
    } else {
      console.log(`[EXCLUDE] ${fullPath} (does not match includePatterns)`);
    }
    return matches;
  }

  async function scanDirectory(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip common non-code directories
          if (
            !['node_modules', '.git', 'build', 'dist', '__pycache__', '.vscode'].includes(
              entry.name
            )
          ) {
            await scanDirectory(fullPath);
          } else {
            console.log(`[SKIP DIR] ${fullPath}`);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();

          if (shouldIncludeFile(fullPath, ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }

  await scanDirectory(directory);
  return files.slice(0, maxFiles);
}

// Re-export types and components
export {
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  generateLLMAnnotations,
  validateAnnotationRequest,
};
export type { AnnotationRequest, AnnotationResult, LLMAnnotation };
export * from './types.js';
