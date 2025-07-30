#!/usr/bin/env bun

/**
 * CLI for LLM Code Annotation
 /**
  * Thin CLI entrypoint for LLM Code Annotation
  *
  * Usage: bun run llm-annotate-cli.ts <directory> [options]
  */

import { existsSync, statSync } from 'node:fs';
import { z } from 'zod';
import { generateLLMAnnotations } from '../llm-annotation/index.js';

const RESERVED_SUBCOMMANDS = ['help', '--help', '-h', 'version', '--version', 'init'];

function resolveDirectoryArg(args: string[]): string {
  if (args.length === 0) return 'src';
  const first = args[0] ?? '';
  if (RESERVED_SUBCOMMANDS.includes(first)) return 'src';
  try {
    if (existsSync(first) && statSync(first).isDirectory()) return first;
  } catch {
    /* ignore */
  }
  return 'src';
}

async function main() {
  const args = process.argv.slice(2);

  // Minimal argument parsing: use first arg as directory, rest as options (not robust)
  const directory = resolveDirectoryArg(args);
  const outputDir = './output/annotations';
  const format = 'json';

  console.log('🚀 Starting LLM Code Annotation...');
  console.log(`📁 Target directory: ${directory}`);
  console.log(`📝 Output format: ${format}`);
  console.log(`📂 Output directory: ${outputDir}`);

  try {
    // Find all non-directory files in the directory (language-agnostic, non-recursive)
    const fs = await import('node:fs/promises');
    const files = await fs.readdir(directory);
    const stats = await Promise.all(files.map((f) => fs.stat(`${directory}/${f}`)));
    const sourceFiles = files.filter((_f, i) => stats[i]?.isFile()).map((f) => `${directory}/${f}`);
    if (sourceFiles.length === 0) {
      console.log('❌ No code files found in the specified directory');
      process.exit(1);
    }

    // Zod schema for annotation request
    const allowedFocusAreas = [
      'patterns',
      'architecture',
      'performance',
      'security',
      'maintainability',
    ] as const;
    const AnnotationRequestSchema = z.object({
      sourceFiles: z.array(z.string().min(1)),
      targetDirectory: z.string().min(1),
      outputFormat: z.enum(['json', 'yaml', 'markdown']),
      includePrompts: z.boolean(),
      includePatterns: z.array(z.string().min(1)),
      excludePatterns: z.array(z.string().min(1)),
      analysisDepth: z.enum(['comprehensive', 'surface', 'detailed']),
      focusAreas: z.array(z.enum(allowedFocusAreas)).optional(),
    });

    const includePatterns = ['**/*'];
    const excludePatterns = ['node_modules/**', '**/*.test.*', '.git/**', 'build/**', 'dist/**'];
    const outputFormat = 'json';
    const analysisDepth = 'comprehensive';
    const focusAreas = undefined;

    const request = AnnotationRequestSchema.parse({
      sourceFiles,
      targetDirectory: outputDir,
      outputFormat,
      includePrompts: true,
      includePatterns,
      excludePatterns,
      analysisDepth,
      focusAreas,
    });

    // Generate annotations
    console.log('🧠 Generating LLM annotations...');
    const result = await generateLLMAnnotations(request);

    if (result.status === 'success') {
      console.log('✅ LLM annotation completed successfully!');
      console.log('📊 Analysis Summary:');
      console.log(`   • Language: ${result.annotation.context.language}`);
      console.log(`   • Framework: ${result.annotation.context.framework || 'None detected'}`);
      console.log(`   • Purpose: ${result.annotation.context.purpose}`);
      console.log(`   • Files analyzed: ${result.annotation.metadata.sourceFiles}`);
      console.log(`   • Patterns detected: ${result.annotation.patterns.length}`);
      console.log(`   • Opportunities identified: ${result.annotation.opportunities.length}`);
      console.log(`   • Processing time: ${result.processingTime}ms`);
      console.log(
        `   • Overall confidence: ${(result.annotation.metadata.confidence * 100).toFixed(1)}%`
      );

      if (result.outputPath) {
        console.log(`📄 Annotation saved to: ${result.outputPath}`);
      }

      if (result.annotation.summary.keyFindings.length > 0) {
        console.log('\n🎯 Key Findings:');
        result.annotation.summary.keyFindings.forEach((finding, i) => {
          console.log(`   ${i + 1}. ${finding}`);
        });
      }

      if (result.annotation.summary.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        result.annotation.summary.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      if (result.annotation.patterns.length > 0) {
        console.log('\n🔍 Detected Patterns:');
        const patternSummary = result.annotation.patterns.reduce(
          (acc, pattern) => {
            acc[pattern.category] = (acc[pattern.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        Object.entries(patternSummary).forEach(([category, count]) => {
          console.log(`   • ${category}: ${count} patterns`);
        });
      }

      if (result.annotation.llmPrompts && Object.keys(result.annotation.llmPrompts).length > 0) {
        console.log('\n🎯 LLM Prompts Generated:');
        Object.entries(result.annotation.llmPrompts).forEach(([type, prompt]) => {
          if (prompt) {
            console.log(`   • ${type}: Ready for LLM consumption`);
          }
        });
      }
    } else {
      console.log('❌ LLM annotation failed');
      result.errors.forEach((error, i) => {
        console.log(`   Error ${i + 1}: ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during LLM annotation:', error);
    process.exit(1);
  }
}

// Run the CLI
main().catch(console.error);
