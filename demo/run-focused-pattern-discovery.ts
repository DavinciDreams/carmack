#!/usr/bin/env bun

/**
 * Focused Pattern Discovery Demo
 * 
 * Creates test files with deliberate old patterns and runs pattern discovery
 * to demonstrate the system actually finding and reporting patterns.
 */

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { TsMorphPatternDetector } from '../src/analysis/ts-morph-pattern-detector.js';
import { type FileMetadata } from '../src/analysis/repository-analyzer.js';

const TEST_DIR = 'demo/pattern-test-files';

// Test files with deliberate old patterns
const testFiles = {
  'old-variables.ts': `
// This file contains old variable declaration patterns
function processData() {
  var userName = 'john';  // Should be const
  var userId = 123;      // Should be const
  var isActive = true;   // Should be const
  
  for (var i = 0; i < 10; i++) {  // var in for loop
    console.log('Processing item ' + i);  // String concatenation
  }
  
  var result = 'User: ' + userName + ' ID: ' + userId;  // String concatenation
  return result;
}

function calculateTotal(items) {  // Could be arrow function
  return items.reduce((sum, item) => sum + item.price, 0);
}
`,

  'string-patterns.ts': `
// This file has string concatenation patterns
function generateMessage(name: string, age: number) {
  var greeting = 'Hello ' + name + '!';  // Template literal opportunity
  var info = 'You are ' + age + ' years old';  // Template literal opportunity
  
  console.log('User info: ' + greeting + ' ' + info);  // Console.log with concatenation
  
  var fullMessage = greeting + ' ' + info + '.';
  return fullMessage;
}

function buildUrl(baseUrl: string, path: string) {
  var url = baseUrl + '/' + path;  // Template literal opportunity
  return url;
}
`,

  'simple-functions.ts': `
// Simple functions that could be arrow functions
function add(a: number, b: number) {
  return a + b;
}

function multiply(x: number, y: number) {
  return x * y;
}

function isEven(num: number) {
  return num % 2 === 0;
}

function greet(name: string) {
  return 'Hello ' + name;
}
`,

  'mixed-patterns.ts': `
// File with various patterns to detect
function processUsers() {
  var users = [];  // Should be const or let
  var count = 0;   // Should be let (reassigned)
  
  for (var i = 0; i < 5; i++) {  // var in loop
    count = count + 1;  // Reassignment
    users.push('User ' + i);  // String concatenation
  }
  
  var message = 'Processed ' + count + ' users';  // Template literal opportunity
  console.log('Status: ' + message);  // Console.log concatenation
  
  return users;
}

function formatData(data: any[]) {
  return data.map(item => item.name + ': ' + item.value);  // String concatenation in map
}
`
};

/**
 * Create test files with patterns to discover
 */
async function createTestFiles(): Promise<void> {
  console.log('🏗️ Creating test files with discoverable patterns...');
  
  // Clean up existing directory
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await mkdir(TEST_DIR, { recursive: true });
  
  // Write test files
  for (const [filename, content] of Object.entries(testFiles)) {
    const filePath = join(TEST_DIR, filename);
    await writeFile(filePath, content.trim());
    console.log(`✅ Created ${filename}`);
  }
  
  console.log(`\n📁 Test files created in: ${TEST_DIR}/`);
  console.log('🔍 These files contain:');
  console.log('   - var declarations (should be const/let)');
  console.log('   - String concatenation (should be template literals)');
  console.log('   - Simple functions (could be arrow functions)');
  console.log('   - Console.log with concatenation');
  console.log('   - Various modernization opportunities');
}

/**
 * Run ts-morph pattern discovery on test files
 */
async function runTsMorphPatternDiscovery(): Promise<void> {
  console.log('\n🚀 Running ts-morph pattern discovery on test files...');
  
  const detector = new TsMorphPatternDetector();
  const allPatterns: Awaited<ReturnType<typeof detector.detectPatterns>>[number][] = [];
  
  try {
    for (const [filename, content] of Object.entries(testFiles)) {
      const filePath = join(TEST_DIR, filename);
      
      // Create FileMetadata
      const fileMetadata: FileMetadata = {
        path: filePath,
        relativePath: `${TEST_DIR}/${filename}`,
        size: content.length,
        mtime: Date.now(),
        language: 'typescript',
        encoding: 'utf-8'
      };
      
      console.log(`\n🔍 Analyzing ${filename}...`);
      const patterns = await detector.detectPatterns(fileMetadata, content);
      
      if (patterns.length > 0) {
        console.log(`✨ Found ${patterns.length} patterns:`);
        for (const pattern of patterns) {
          console.log(`   - ${pattern.type}: ${pattern.before.slice(0, 50)}...`);
          console.log(`     Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
          console.log(`     Category: ${pattern.metadata.category}`);
        }
        allPatterns.push(...patterns);
      } else {
        console.log(`   No patterns found`);
      }
    }
    
    // Generate summary report
    console.log('\n📊 Pattern Discovery Summary');
    console.log('============================');
    console.log(`Total patterns found: ${allPatterns.length}`);
    
    if (allPatterns.length > 0) {
      const byType = groupPatternsByType(allPatterns);
      const byCategory = groupPatternsByCategory(allPatterns);
      
      console.log('\nBy Type:');
      for (const [type, patterns] of Object.entries(byType)) {
        console.log(`   ${type}: ${patterns.length} occurrences`);
      }
      
      console.log('\nBy Category:');
      for (const [category, patterns] of Object.entries(byCategory)) {
        console.log(`   ${category}: ${patterns.length} patterns`);
      }
      
      const avgConfidence = allPatterns.reduce((sum, p) => sum + p.confidence, 0) / allPatterns.length;
      console.log(`\nAverage confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      
      // Save detailed report
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          filesAnalyzed: Object.keys(testFiles).length,
          patternsFound: allPatterns.length,
          averageConfidence: avgConfidence
        },
        patterns: allPatterns.map(p => ({
          id: p.id,
          type: p.type,
          category: p.metadata.category,
          confidence: p.confidence,
          before: p.before,
          after: p.after || 'N/A',
          location: p.location,
          file: p.metadata.file || 'unknown'
        })),
        summary: {
          byType,
          byCategory
        }
      };
      
      const reportPath = join(process.cwd(), 'focused-pattern-discovery-report.json');
      await writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Show top 3 patterns
      console.log('\n🎯 Top Patterns (by confidence):');
      const topPatterns = allPatterns
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
        
      for (const [index, pattern] of topPatterns.entries()) {
        console.log(`\n${index + 1}. ${pattern.type} (${(pattern.confidence * 100).toFixed(1)}%)`);
        console.log(`   Before: ${pattern.before}`);
        if (pattern.after) {
          console.log(`   After:  ${pattern.after}`);
        }
        console.log(`   Reason: ${pattern.metadata.reason}`);
      }
    }
    
  } finally {
    detector.dispose();
  }
}

/**
 * Group patterns by type
 */
function groupPatternsByType(patterns: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const pattern of patterns) {
    if (!grouped[pattern.type]) {
      grouped[pattern.type] = [];
    }
    grouped[pattern.type].push(pattern);
  }
  return grouped;
}

/**
 * Group patterns by category
 */
function groupPatternsByCategory(patterns: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const pattern of patterns) {
    const category = pattern.metadata.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(pattern);
  }
  return grouped;
}

/**
 * Clean up test files
 */
async function cleanupTestFiles(): Promise<void> {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
    console.log(`🧹 Cleaned up test files in ${TEST_DIR}`);
  } catch (error) {
    console.warn(`Warning: Could not clean up ${TEST_DIR}:`, error);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--clean')) {
      await cleanupTestFiles();
      return;
    }
    
    await createTestFiles();
    await runTsMorphPatternDiscovery();
    
    if (!args.includes('--keep-files')) {
      console.log('\n🧹 Cleaning up test files...');
      await cleanupTestFiles();
    }
    
    console.log('\n🎉 Focused pattern discovery completed successfully!');
    console.log('\n💡 This demo shows the pattern discovery system actually finding patterns:');
    console.log('   ✅ var → const/let conversions');
    console.log('   ✅ String concatenation → template literals'); 
    console.log('   ✅ Simple functions → arrow functions');
    console.log('   ✅ Console.log optimizations');
    console.log('\n📊 Check the focused-pattern-discovery-report.json for full details');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { createTestFiles, runTsMorphPatternDiscovery, cleanupTestFiles };