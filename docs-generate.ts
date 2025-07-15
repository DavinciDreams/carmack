#!/usr/bin/env bun

/**
 * Carmack Coder Documentation Generator CLI
 * 
 * Command-line interface for generating comprehensive documentation
 * using AST-grep analysis and pattern recognition.
 */

import { generateAndWriteAll } from './src/docs/index.js';

interface CLIOptions {
  outputDir?: string;
  format?: 'markdown' | 'html' | 'json';
  includePrivate?: boolean;
  includeTests?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--output-dir':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--format':
      case '-f':
        const format = args[++i] as 'markdown' | 'html' | 'json';
        if (['markdown', 'html', 'json'].includes(format)) {
          options.format = format;
        } else {
          console.error(`Invalid format: ${format}. Must be one of: markdown, html, json`);
          process.exit(1);
        }
        break;
      case '--include-private':
        options.includePrivate = true;
        break;
      case '--include-tests':
        options.includeTests = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
Carmack Coder Documentation Generator

USAGE:
  bun run docs-generate.ts [OPTIONS]

OPTIONS:
  -o, --output-dir <dir>     Output directory for documentation (default: ./docs)
  -f, --format <format>      Output format: markdown, html, json (default: markdown)
  --include-private          Include private/internal functions and classes
  --include-tests           Include test files in analysis
  -h, --help                Show this help message

EXAMPLES:
  # Generate all documentation in Markdown format
  bun run docs-generate.ts

  # Generate HTML documentation with private members
  bun run docs-generate.ts --format html --include-private

  # Generate JSON documentation to custom directory
  bun run docs-generate.ts --format json --output-dir ./build/docs

GENERATED FILES:
  - api.{ext}           API documentation for all modules
  - architecture.{ext}  System architecture and component relationships
  - patterns.{ext}      Transformation patterns catalog
  - usage.{ext}         Usage examples and guides

The documentation system uses AST-grep for precise code analysis and supports
multiple output formats. Generated documentation includes:

📚 API Documentation:
  - Function signatures with parameters and return types
  - Class definitions with properties and methods
  - Type definitions and interfaces
  - Module dependencies and exports

🏗️ Architecture Documentation:
  - Component relationships and data flow
  - Architectural layers and boundaries
  - Dependency graphs and module structure

🔄 Pattern Documentation:
  - Transformation patterns with examples
  - Pattern complexity and risk levels
  - Before/after code examples

💡 Usage Documentation:
  - Code examples and best practices
  - Integration guides and workflows
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🚀 Carmack Coder Documentation Generator');
  console.log('=========================================\n');
  
  const startTime = Date.now();
  
  try {
    await generateAndWriteAll({
      outputDir: options.outputDir || './docs',
      format: options.format || 'markdown',
      includePrivate: options.includePrivate || false,
      includeTests: options.includeTests || false,
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n🎉 Documentation generation completed in ${duration}ms`);
    
  } catch (error) {
    console.error('\n❌ Documentation generation failed:');
=======
 *
 * Usage: bun run docs-generate.ts [options]
 */

import { DocumentationGenerator } from './src/docs/generator.js';

async function main() {
  console.log('🔥 Carmack Coder Documentation Generator\n');

  try {
    const generator = new DocumentationGenerator({
      sourceDir: './src',
      outputDir: './docs',
      formats: ['markdown'],
    });

    console.log('🔍 Scanning codebase...');
    const startTime = Date.now();

    const result = await generator.generateDocumentation();

    const duration = Date.now() - startTime;

    console.log(`\n✅ Documentation generated successfully in ${duration}ms`);
    console.log(`📊 Statistics:`);
    console.log(`   📁 Files scanned: ${result.stats.totalFiles}`);
    console.log(`   📝 Items documented: ${result.stats.totalItems}`);
    console.log(`   🏗️  Functions: ${result.stats.byType.function || 0}`);
    console.log(`   📦 Classes: ${result.stats.byType.class || 0}`);
    console.log(`   🔧 Interfaces: ${result.stats.byType.interface || 0}`);
    console.log(`   🔄 Patterns: ${result.stats.byType.pattern || 0}`);
    console.log(`   ⚙️  Configs: ${result.stats.byType.config || 0}`);

    console.log(`\n📂 Output files:`);
    console.log(`   📄 ./docs/README.md - Main documentation`);
    console.log(`   📄 ./docs/api.md - API reference`);
    console.log(`   📄 ./docs/patterns.md - Transformation patterns`);
    console.log(`   📄 ./docs/configs.md - Configuration options`);
    console.log(`   📄 ./docs/documentation.json - Raw data`);

    console.log(`\n🎉 Documentation is now up to date!`);
  } catch (error) {
    console.error('❌ Failed to generate documentation:');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
