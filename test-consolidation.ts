#!/usr/bin/env bun

/**
 * Test script to consolidate patterns and clean up duplicates
 */

import { RepositoryManager, defaultRepositoryConfig } from './src/repository-manager.ts';

async function main() {
  console.log('🔧 Starting pattern consolidation...');
  
  const repoManager = new RepositoryManager(defaultRepositoryConfig);
  
  // Consolidate patterns
  await repoManager.consolidatePatterns();
  
  // Show statistics
  const stats = repoManager.getStatistics();
  console.log('📊 Repository Manager Statistics:');
  console.log(`   Total Repositories: ${stats.totalRepositories}`);
  console.log(`   Active Repositories: ${stats.activeRepositories}`);
  console.log(`   Total Disk Usage: ${(stats.totalDiskUsage / 1024 / 1024).toFixed(2)} MB`);
  
  await repoManager.shutdown();
  console.log('✅ Pattern consolidation complete');
}

if (import.meta.main) {
  await main();
}
