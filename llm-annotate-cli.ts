#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { generateLLMAnnotations } from './src/llm-annotation/analyzer.js';
import type { AnnotationRequest } from './src/llm-annotation/types.js';

/**
 * CLI for LLM Code Annotation
 * 
 * Usage: bun run llm-annotate-cli.ts <directory> [options]
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: bun run llm-annotate-cli.ts <directory> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --max-files <number>    Maximum number of files to analyze (default: 50)');
    console.log('  --output <directory>    Output directory for annotations (default: ./output/annotations)');
    console.log('  --format <json|yaml|markdown>  Output format (default: json)');
    console.log('  --include <patterns>    Include file patterns (comma-separated, default: all supported files)');
    process.exit(1);
  }

  const targetDirectory = args[0];
  
  // Parse options properly
  let maxFiles = 50;
  let outputDir = './output/annotations';
  let format = 'json';
  let includePatterns: string[] | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--max-files' && i + 1 < args.length) {
      maxFiles = parseInt(args[i + 1]);
      i++; // Skip next arg
    } else if (arg === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--format' && i + 1 < args.length) {
      format = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--include' && i + 1 < args.length) {
      includePatterns = args[i + 1].split(',');
      i++; // Skip next arg
    }
  }

  console.log('🚀 Starting LLM Code Annotation...');
  console.log(`📁 Target directory: ${targetDirectory}`);
  console.log(`📊 Max files: ${maxFiles}`);
  console.log(`📝 Output format: ${format}`);
  console.log(`📂 Output directory: ${outputDir}`);

  try {
    // Find all code files in the directory
    const sourceFiles = await findCodeFiles(targetDirectory, maxFiles, includePatterns);
    console.log(`🔍 Found ${sourceFiles.length} code files to analyze`);

    if (sourceFiles.length === 0) {
      console.log('❌ No code files found in the specified directory');
      process.exit(1);
    }

    // Create annotation request
    const request: AnnotationRequest = {
      sourceFiles,
      targetDirectory: outputDir,
      outputFormat: format as 'json' | 'yaml' | 'markdown',
      includePrompts: true,
      includePatterns: includePatterns || ['**/*'],
      excludePatterns: ['node_modules/**', '**/*.test.*', '.git/**', 'build/**', 'dist/**'],
      analysisDepth: 'comprehensive',
    };

    // Generate annotations
    console.log('🧠 Generating LLM annotations...');
    const result = await generateLLMAnnotations(request);

    if (result.status === 'success') {
      console.log('✅ LLM annotation completed successfully!');
      console.log(`📊 Analysis Summary:`);
      console.log(`   • Language: ${result.annotation.context.language}`);
      console.log(`   • Framework: ${result.annotation.context.framework || 'None detected'}`);
      console.log(`   • Purpose: ${result.annotation.context.purpose}`);
      console.log(`   • Files analyzed: ${result.annotation.metadata.sourceFiles}`);
      console.log(`   • Patterns detected: ${result.annotation.patterns.length}`);
      console.log(`   • Opportunities identified: ${result.annotation.opportunities.length}`);
      console.log(`   • Processing time: ${result.processingTime}ms`);
      console.log(`   • Overall confidence: ${(result.annotation.metadata.confidence * 100).toFixed(1)}%`);
      
      if (result.outputPath) {
        console.log(`📄 Annotation saved to: ${result.outputPath}`);
      }

      console.log('\n🎯 Key Findings:');
      result.annotation.summary.keyFindings.forEach((finding, i) => {
        console.log(`   ${i + 1}. ${finding}`);
      });

      if (result.annotation.summary.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        result.annotation.summary.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      if (result.annotation.patterns.length > 0) {
        console.log('\n🔍 Detected Patterns:');
        const patternSummary = result.annotation.patterns.reduce((acc, pattern) => {
          acc[pattern.category] = (acc[pattern.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        Object.entries(patternSummary).forEach(([category, count]) => {
          console.log(`   • ${category}: ${count} patterns`);
        });
      }

      console.log('\n🎯 LLM Prompts Generated:');
      Object.entries(result.annotation.llmPrompts).forEach(([type, prompt]) => {
        if (prompt) {
          console.log(`   • ${type}: Ready for LLM consumption`);
        }
      });

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

/**
 * Find all code files in a directory recursively
 */
async function findCodeFiles(directory: string, maxFiles: number, includePatterns?: string[]): Promise<string[]> {
  const files: string[] = [];
  const supportedExtensions = [
    '.ts', '.tsx', '.js', '.jsx',           // TypeScript/JavaScript
    '.py', '.pyi',                          // Python
    '.cpp', '.cc', '.cxx', '.c++',          // C++
    '.c',                                   // C
    '.h', '.hpp', '.hxx', '.h++',           // Headers
    '.cu', '.cuh',                          // CUDA
    '.java',                                // Java
    '.cs',                                  // C#
    '.go',                                  // Go
    '.rs',                                  // Rust
    '.rb',                                  // Ruby
    '.php',                                 // PHP
    '.swift',                               // Swift
    '.kt',                                  // Kotlin
    '.scala',                               // Scala
    '.clj', '.cljs',                        // Clojure
    '.hs',                                  // Haskell
    '.ml', '.mli',                          // OCaml
    '.fs', '.fsi',                          // F#
    '.vb',                                  // VB.NET
    '.dart',                                // Dart
    '.lua',                                 // Lua
    '.r', '.R',                             // R
    '.sql',                                 // SQL
    '.sh',                                  // Shell
    '.bat', '.cmd',                         // Batch
    '.ps1',                                 // PowerShell
  ];

  async function scanDirectory(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common non-code directories
          if (!['node_modules', '.git', 'build', 'dist', '__pycache__', '.vscode'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          
          if (supportedExtensions.includes(ext)) {
            // Apply include patterns if specified
            if (!includePatterns || includePatterns.some(pattern => 
              pattern === '**/*' || 
              entry.name.includes(pattern.replace('*', '')) ||
              fullPath.includes(pattern.replace('*', ''))
            )) {
              files.push(fullPath);
            }
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

// Run the CLI
main().catch(console.error);
