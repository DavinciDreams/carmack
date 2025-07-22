#!/usr/bin/env bun

/**
 * Pre-commit Import Organization and Unused Code Detection Script
 *
 * Automatically organizes imports and removes unused code before commits
 */

import { readFile, writeFile } from 'node:fs/promises';

// Future enhancement: Use AST-grep for more sophisticated import transformations
// Currently using simple regex-based approach for reliability

/**
 * Organize imports in a TypeScript file
 */
async function organizeImports(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Extract imports
    const imports: Array<{
      line: string;
      lineNumber: number;
      module: string;
      isNodeModule: boolean;
      isTypeOnly: boolean;
    }> = [];

    const nonImportLines: string[] = [];
    let inImportSection = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue; // Skip undefined lines

      const trimmed = line.trim();

      if (trimmed.startsWith('import ')) {
        const moduleMatch = line.match(/from ['"]([^'"]+)['"]/);
        const module = moduleMatch ? moduleMatch[1] : '';
        const isNodeModule = module ? !module.startsWith('.') && !module.startsWith('/') : false;
        const isTypeOnly = line.includes('import type');

        imports.push({
          line,
          lineNumber: i,
          module: module || '',
          isNodeModule,
          isTypeOnly,
        });
      } else if (trimmed === '' && inImportSection) {
      } else {
        inImportSection = false;
        nonImportLines.push(line);
      }
    }

    if (imports.length === 0) {
      return false; // No imports to organize
    }

    // Sort imports: Node modules first, then relative imports, then type imports
    imports.sort((a, b) => {
      // Type imports last
      if (a.isTypeOnly !== b.isTypeOnly) {
        return a.isTypeOnly ? 1 : -1;
      }

      // Node modules before relative imports
      if (a.isNodeModule !== b.isNodeModule) {
        return a.isNodeModule ? -1 : 1;
      }

      // Alphabetical within each group
      return a.module.localeCompare(b.module);
    });

    // Rebuild file content
    const organizedLines: string[] = [];

    // Add organized imports
    let lastGroup = '';
    for (const imp of imports) {
      const currentGroup = imp.isTypeOnly ? 'type' : imp.isNodeModule ? 'node' : 'relative';

      // Add empty line between groups
      if (lastGroup && lastGroup !== currentGroup) {
        organizedLines.push('');
      }

      organizedLines.push(imp.line);
      lastGroup = currentGroup;
    }

    // Add empty line after imports
    if (imports.length > 0 && nonImportLines.length > 0) {
      organizedLines.push('');
    }

    // Add rest of the file
    organizedLines.push(...nonImportLines);

    const newContent = organizedLines.join('\n');

    if (newContent !== content) {
      await writeFile(filePath, newContent, 'utf-8');
      return true;
    }

    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Failed to organize imports in ${filePath}:`, errorMessage);
    return false;
  }
}

/**
 * Remove unused variables and imports
 */
async function removeUnusedCode(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Simple unused variable detection (basic patterns)
    const lines = content.split('\n');
    const modifiedLines: string[] = [];
    let hasChanges = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip unused variable declarations (basic heuristic)
      if (
        trimmed.match(/^(const|let|var)\s+\w+\s*=.*;\s*$/) &&
        !content.includes(trimmed.split('=')[0]?.split(' ')[1]?.trim() || '')
      ) {
        // This is a very basic check - in production, use TypeScript compiler API
        console.log(`Removing potentially unused variable: ${trimmed}`);
        hasChanges = true;
        continue;
      }

      modifiedLines.push(line);
    }

    if (hasChanges) {
      await writeFile(filePath, modifiedLines.join('\n'), 'utf-8');
      return true;
    }

    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Failed to remove unused code in ${filePath}:`, errorMessage);
    return false;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('✅ No files to process');
    process.exit(0);
  }

  console.log(`📦 Organizing imports and cleaning up ${files.length} files...`);

  let totalModified = 0;

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue; // Skip non-TypeScript files
    }

    try {
      console.log(`🔧 Processing ${file}...`);

      const importsModified = await organizeImports(file);
      const unusedRemoved = await removeUnusedCode(file);

      if (importsModified || unusedRemoved) {
        totalModified++;
        console.log(`  ✅ Modified ${file}`);
      } else {
        console.log(`  ✨ ${file} already clean`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error processing ${file}:`, errorMessage);
    }
  }

  console.log(`\n📊 Summary: ${totalModified}/${files.length} files modified`);

  if (totalModified > 0) {
    console.log('✅ Import organization and cleanup completed!');
  } else {
    console.log('✨ All files were already clean!');
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fatal error:', errorMessage);
    process.exit(1);
  });
}
