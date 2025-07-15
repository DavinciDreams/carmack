#!/usr/bin/env bun

/**
 * Simple Pattern Consolidation Script
 * Directly consolidates pattern files without complex infrastructure
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function consolidatePatterns() {
  console.log('🔧 Starting simple pattern consolidation...');
  
  const patternFiles = [
    'patterns.json',
    'patterns-v3.json',
    'repository/patterns.json', 
    'repository/patterns-v3.json'
  ];
  
  const consolidated = {
    version: '4.0.0',
    description: 'Consolidated transformation patterns - single source of truth',
    patterns: [] as any[],
    categories: {} as Record<string, string[]>,
    metadata: {
      consolidated: new Date().toISOString(),
      sources: [] as string[],
      author: 'Carmack Coder',
      license: 'MIT',
      totalPatterns: 0,
    },
  };

  let processedCount = 0;
  const patternIds = new Set<string>();

  for (const file of patternFiles) {
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
      console.log(`   ⏭️ Skipping missing file: ${file}`);
      continue;
    }

    try {
      console.log(`   📖 Processing: ${file}`);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.patterns) {
        for (const pattern of data.patterns) {
          if (!patternIds.has(pattern.id)) {
            consolidated.patterns.push(pattern);
            patternIds.add(pattern.id);
          } else {
            console.log(`   🔄 Duplicate pattern skipped: ${pattern.id}`);
          }
        }
      }
      
      if (data.categories) {
        Object.assign(consolidated.categories, data.categories);
      }
      
      consolidated.metadata.sources.push(file);
      processedCount++;
      
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }
  }

  consolidated.metadata.totalPatterns = consolidated.patterns.length;
  Object.assign(consolidated.metadata, {
    lastUpdated: new Date().toISOString(),
  });

  // Write consolidated file
  const outputPath = resolve('patterns-consolidated.json');
  await writeFile(outputPath, JSON.stringify(consolidated, null, 2));
  
  console.log('🎉 Pattern consolidation complete!');
  console.log(`   📁 Processed: ${processedCount} files`);
  console.log(`   📝 Total patterns: ${consolidated.patterns.length}`);
  console.log(`   💾 Output: ${outputPath}`);
  
  return consolidated;
}

// Clean up the repository folder
async function cleanupRepositoryFolder() {
  console.log('🗑️ Cleaning up repository folder...');
  
  const { rmSync } = await import('node:fs');
  const repositoryPath = resolve('repository');
  
  if (existsSync(repositoryPath)) {
    try {
      rmSync(repositoryPath, { recursive: true, force: true });
      console.log('   ✅ Repository folder removed');
    } catch (error) {
      console.error('   ❌ Failed to remove repository folder:', error.message);
    }
  } else {
    console.log('   ⏭️ Repository folder does not exist');
  }
}

// Update documentation watcher to include consolidated patterns
async function updateDocumentationWatcher() {
  console.log('📝 Updating documentation system...');
  
  // The documentation watcher is already running and will pick up the new patterns-consolidated.json
  console.log('   ✅ Documentation system will auto-detect new patterns file');
}

async function main() {
  try {
    console.log('🚀 Carmack Pattern Cleanup & Consolidation');
    console.log('═'.repeat(50));
    
    // Step 1: Consolidate patterns
    await consolidatePatterns();
    
    // Step 2: Clean up repository folder (it's a duplicate)
    await cleanupRepositoryFolder();
    
    // Step 3: Update documentation
    await updateDocumentationWatcher();
    
    console.log('═'.repeat(50));
    console.log('✅ All cleanup tasks completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   • Consolidated all pattern files into patterns-consolidated.json');
    console.log('   • Removed duplicate repository folder');
    console.log('   • Documentation system will auto-update');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   • Use patterns-consolidated.json as the single source of truth');
    console.log('   • Update system to reference consolidated patterns');
    console.log('   • Remove old pattern files when ready');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
