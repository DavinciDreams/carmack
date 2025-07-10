#!/usr/bin/env bun

/**
 * Carmack Coder Documentation Generator CLI
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
    console.error(error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
