#!/usr/bin/env bun

/**
 * Test script for Repository Manager
 * 
 * Tests the repository manager functionality with a sample repository
 */

import { RepositoryManager, type RepositoryConfig } from './src/repository-manager.js';

async function testRepositoryManager() {
  console.log('🧪 Testing Repository Manager...\n');

  const manager = new RepositoryManager();

  // Test configuration for a small public repository
  const testConfig: RepositoryConfig = {
    url: 'https://github.com/microsoft/TypeScript-Node-Starter.git',
    branch: 'master',
    includePatterns: ['**/*.ts', '**/*.js'],
    excludePatterns: ['node_modules/**', '**/*.test.*', '**/*.spec.*', 'dist/**'],
    maxFileSize: 1024 * 1024, // 1MB
    timeout: 300000, // 5 minutes
  };

  try {
    console.log(`📥 Processing repository: ${testConfig.url}`);
    console.log(`🌿 Branch: ${testConfig.branch}`);
    console.log(`📁 Include patterns: ${testConfig.includePatterns.join(', ')}`);
    console.log(`🚫 Exclude patterns: ${testConfig.excludePatterns.join(', ')}`);
    console.log('');

    const startTime = Date.now();
    const result = await manager.processRepository(testConfig);
    const endTime = Date.now();

    console.log('✅ Repository processing completed!\n');
    console.log('📊 Results Summary:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Processing time: ${(endTime - startTime) / 1000}s`);
    console.log(`   Total files: ${result.analysis.totalFiles}`);
    console.log(`   Analyzed files: ${result.analysis.analyzedFiles}`);
    console.log(`   Skipped files: ${result.analysis.skippedFiles}`);
    console.log(`   Lines of code: ${result.analysis.totalLinesOfCode}`);
    console.log(`   Average complexity: ${result.analysis.complexity.average.toFixed(2)}`);
    console.log(`   Max complexity: ${result.analysis.complexity.max}`);
    console.log(`   Patterns detected: ${result.analysis.patterns.length}`);
    console.log(`   Issues found: ${result.analysis.issues.length}`);
    console.log(`   Transformations applied: ${result.transformations.length}`);
    console.log(`   Recommendations: ${result.analysis.recommendations.length}`);

    if (result.outputPath) {
      console.log(`   Output saved to: ${result.outputPath}`);
    }

    console.log('\n🔍 Language Distribution:');
    Object.entries(result.analysis.languages).forEach(([ext, count]) => {
      console.log(`   ${ext}: ${count} files`);
    });

    console.log('\n📈 Complexity Distribution:');
    Object.entries(result.analysis.complexity.distribution).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} files`);
    });

    if (result.analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.analysis.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }

    console.log('\n🎉 Repository Manager test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Repository Manager test failed:', error);
    return false;
  }
}

// Run the test if this script is executed directly
if (import.meta.main) {
  const success = await testRepositoryManager();
  process.exit(success ? 0 : 1);
}

export { testRepositoryManager };