#!/usr/bin/env bun

/**
 * Debug script to test individual transformation patterns
 */

import { readFile, writeFile } from 'node:fs/promises';

// Import the transformation function directly
async function testTemplatePatterns() {
  console.log('🔧 Testing template patterns on test-complex.ts');
  
  // Read the test file
  const content = await readFile('./test-complex.ts', 'utf-8');
  console.log(`📄 Original file length: ${content.length} characters`);
  
  // Test individual patterns
  let modifiedContent = content;
  let totalChanges = 0;
  
  // Test 1: Fix double semicolons
  console.log('\n🧪 Testing fix-double-semicolons pattern...');
  const beforeSemicolon = modifiedContent;
  modifiedContent = modifiedContent.replace(/;;/g, ';');
  const semicolonChanges = (beforeSemicolon.match(/;;/g) || []).length;
  console.log(`   Found ${semicolonChanges} double semicolons`);
  totalChanges += semicolonChanges;
  
  // Test 2: Fix malformed object literals
  console.log('\n🧪 Testing fix-malformed-object-literal pattern...');
  const beforeObject = modifiedContent;
  modifiedContent = modifiedContent.replace(/=\s*\{\s*;/g, '= {');
  const objectMatches = (beforeObject.match(/=\s*\{\s*;/g) || []).length;
  console.log(`   Found ${objectMatches} malformed object literals`);
  totalChanges += objectMatches;
  
  // Test 3: Fix strict inequality
  console.log('\n🧪 Testing strict-inequality pattern...');
  const beforeInequality = modifiedContent;
  modifiedContent = modifiedContent.replace(
    /([a-zA-Z_$][\w.]*|\)|\])\s*!=\s*([a-zA-Z_$][\w.]*|['"`][^'"`]*['"`]|\d+|true|false|null|undefined|\()/g,
    '$1 !== $2'
  );
  const inequalityMatches = beforeInequality.match(/([a-zA-Z_$][\w.]*|\)|\])\s*!=\s*([a-zA-Z_$][\w.]*|['"`][^'"`]*['"`]|\d+|true|false|null|undefined|\()/g) || [];
  console.log(`   Found ${inequalityMatches.length} loose inequalities`);
  totalChanges += inequalityMatches.length;
  
  // Test 4: Console error pattern
  console.log('\n🧪 Testing console-log-to-console-error pattern...');
  const beforeConsole = modifiedContent;
  modifiedContent = modifiedContent.replace(
    /console\.error\(\s*(['"`])Error:/g,
    'console.error($1'
  );
  const consoleMatches = (beforeConsole.match(/console\.error\(\s*(['"`])Error:/g) || []).length;
  console.log(`   Found ${consoleMatches} console.error with Error prefix`);
  
  console.log(`\n📊 Total changes made: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n💾 Writing modified content to test-complex-modified.ts');
    await writeFile('./test-complex-modified.ts', modifiedContent, 'utf-8');
    console.log('✅ File written successfully');
  } else {
    console.log('\n❌ No transformations applied - patterns may not be matching correctly');
  }
}

testTemplatePatterns().catch(console.error);
