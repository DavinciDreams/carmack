#!/usr/bin/env bun

/**
 * Pre-commit TypeScript Error Detection and Auto-Fix Script
 *
 * This script runs during pre-commit hooks to automatically detect and fix
 * TypeScript errors before they reach the repository.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createActor } from 'xstate';
import {
  type TypeScriptFixResult,
  typeScriptErrorResolverActor,
} from '../actors/typescript-error-resolver.js';

interface PreCommitConfig {
  autoFix: boolean;
  maxRiskLevel: 'low' | 'medium' | 'high';
  dryRun: boolean;
  stagedFilesOnly: boolean;
  excludePatterns: string[];
}

/**
 * Get staged TypeScript files for commit
 */
async function getStagedTypeScriptFiles(): Promise<string[]> {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const files = output
      .split('\n')
      .filter((file) => file.trim())
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter((file) => existsSync(file))
      .filter((file) => !file.includes('node_modules'))
      .filter((file) => !file.includes('.d.ts'));

    return files;
  } catch (error) {
    console.warn('⚠️ Could not get staged files, checking all TypeScript files');
    return [];
  }
}

/**
 * Get all TypeScript files in src directory
 */
async function getAllTypeScriptFiles(): Promise<string[]> {
  try {
    const output = execSync(
      'find src -name "*.ts" -not -path "*/node_modules/*" -not -name "*.d.ts"',
      {
        encoding: 'utf-8',
        stdio: 'pipe',
      }
    );

    return output
      .split('\n')
      .filter((file) => file.trim())
      .filter((file) => existsSync(file));
  } catch (error) {
    // Fallback: manually traverse src directory
    return await findTypeScriptFiles('src');
  }
}

/**
 * Recursively find TypeScript files in a directory
 */
async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const subFiles = await findTypeScriptFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }

  return files;
}

/**
 * Load pre-commit configuration
 */
async function loadConfig(): Promise<PreCommitConfig> {
  const defaultConfig: PreCommitConfig = {
    autoFix: true,
    maxRiskLevel: 'medium',
    dryRun: false,
    stagedFilesOnly: true,
    excludePatterns: ['**/*.test.ts', '**/test/**', '**/tests/**'],
  };

  try {
    const configPath = join(process.cwd(), '.carmack-precommit.json');
    if (existsSync(configPath)) {
      const configContent = await readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      return { ...defaultConfig, ...userConfig };
    }
  } catch (error) {
    console.warn('⚠️ Could not load config, using defaults');
  }

  return defaultConfig;
}

/**
 * Stage fixed files back to git
 */
async function stageFixedFiles(files: string[]): Promise<void> {
  if (files.length === 0) return;

  try {
    const fileList = files.join(' ');
    execSync(`git add ${fileList}`, { stdio: 'pipe' });
    console.log(`✅ Staged ${files.length} fixed files`);
  } catch (error) {
    console.error('❌ Failed to stage fixed files:', error);
  }
}

/**
 * Generate pre-commit summary report
 */
function generateSummaryReport(
  totalFiles: number,
  errorsFound: number,
  errorsFixed: number,
  filesModified: string[],
  warnings: string[]
): void {
  console.log('\n📊 Pre-Commit TypeScript Summary');
  console.log('================================');
  console.log(`Files Checked: ${totalFiles}`);
  console.log(`Errors Found: ${errorsFound}`);
  console.log(`Errors Fixed: ${errorsFixed}`);
  console.log(`Files Modified: ${filesModified.length}`);

  if (filesModified.length > 0) {
    console.log('\n📝 Modified Files:');
    filesModified.forEach((file) => console.log(`  • ${file}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  const successRate = errorsFound > 0 ? ((errorsFixed / errorsFound) * 100).toFixed(1) : '100.0';
  console.log(`\n🎯 Success Rate: ${successRate}%`);
}

/**
 * Main pre-commit execution
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Pre-Commit TypeScript Check...\n');

  try {
    // Load configuration
    const config = await loadConfig();
    console.log(
      `📋 Config: autoFix=${config.autoFix}, maxRisk=${config.maxRiskLevel}, dryRun=${config.dryRun}`
    );

    // Get files to check
    const files = config.stagedFilesOnly
      ? await getStagedTypeScriptFiles()
      : await getAllTypeScriptFiles();

    if (files.length === 0) {
      console.log('✅ No TypeScript files to check');
      process.exit(0);
    }

    console.log(`🔍 Checking ${files.length} TypeScript files...\n`);

    // Filter out excluded patterns
    const filteredFiles = files.filter((file) => {
      return !config.excludePatterns.some((pattern) => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(file);
      });
    });

    if (filteredFiles.length === 0) {
      console.log('✅ All files excluded by patterns');
      process.exit(0);
    }

    // Run TypeScript error resolution
    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: filteredFiles,
        autoFix: config.autoFix,
        maxRiskLevel: config.maxRiskLevel,
        dryRun: config.dryRun,
      },
    });

    actor.start();
    const result = await new Promise<TypeScriptFixResult>((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          if (output) {
            resolve(output as TypeScriptFixResult);
          } else {
            reject(new Error('No output from TypeScript error resolver'));
          }
        },
        error: reject,
      });
    });

    // Generate summary report
    generateSummaryReport(
      filteredFiles.length,
      result.errorsFound,
      result.errorsFixed,
      result.filesModified,
      result.warnings
    );

    // Stage fixed files if not dry run
    if (!config.dryRun && result.filesModified.length > 0) {
      await stageFixedFiles(result.filesModified);
    }

    // Exit with appropriate code
    if (result.errorsRemaining > 0) {
      console.log(`\n❌ ${result.errorsRemaining} TypeScript errors remain unfixed`);
      console.log('💡 Consider running with higher risk level or manual fixes');
      process.exit(1);
    } else {
      console.log('\n✅ All TypeScript errors resolved successfully!');
      process.exit(0);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Pre-commit TypeScript check failed:', errorMessage);
    console.error('🔧 Try running: bun run type-check');
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Pre-Commit TypeScript Error Resolver

Usage: bun run src/scripts/pre-commit-typescript.ts [options]

Options:
  --dry-run          Show what would be fixed without making changes
  --all-files        Check all files instead of just staged files
  --max-risk=LEVEL   Maximum risk level for fixes (low|medium|high)
  --no-auto-fix      Only detect errors, don't fix them

Configuration:
  Create .carmack-precommit.json in project root to customize behavior.

Examples:
  bun run src/scripts/pre-commit-typescript.ts --dry-run
  bun run src/scripts/pre-commit-typescript.ts --all-files --max-risk=high
`);
  process.exit(0);
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
