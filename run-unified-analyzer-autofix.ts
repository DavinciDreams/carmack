// Run UnifiedAnalyzer with autofix enabled on the src directory
import { UnifiedAnalyzer, AnalyzerConfigSchema } from './src/analysis/unified-analyzer';
import { execSync } from 'node:child_process';
import * as fs from 'fs';

async function main() {
  const config = AnalyzerConfigSchema.parse({
    projectPath: process.cwd(),
    includePatterns: ['src/**/*.ts', 'src/**/*.tsx'],
    excludePatterns: ['node_modules', '.next', 'dist', '.test.', '.spec.'],
    enableFixes: true,
    reportFormat: 'both',
    maxIssues: 1000,
  });

  const analyzer = new UnifiedAnalyzer(config);
  const result = await analyzer.analyze();

  // Print summary of unused import removals
  const unusedImportIssues = result.issues.filter(i => i.type === 'unused-code');
  if (unusedImportIssues.length > 0) {
    console.log(`Detected and removed ${unusedImportIssues.length} unused imports.`);
  } else {
    console.log('No unused imports detected.');
  }
  console.log(`Files modified: ${result.filesModified.length}`);

  // --- NEW: Run type-check and auto-fix unused function errors ---
  try {
    const typeCheckOutput = execSync('bun run type-check', { encoding: 'utf8' });
    const ts6133Regex = /error TS6133: '([^']+)' is declared but its value is never read\.\s*\n\n?([^\n]+):(\d+):/g;
    const filesToFix = new Set<string>();
    let match;
    while ((match = ts6133Regex.exec(typeCheckOutput)) !== null) {
      const fileLine = match[2];
      // Extract file path (before colon and line number)
      const filePath = fileLine.split(':')[0];
      if (filePath.endsWith('.ts') && fs.existsSync(filePath)) {
        filesToFix.add(filePath);
      }
    }
    for (const file of filesToFix) {
      console.log(`Auto-removing unused functions in ${file}...`);
      execSync(`bun scripts/remove-unused-functions.ts ${file}`, { stdio: 'inherit' });
    }
    if (filesToFix.size > 0) {
      console.log(`Auto-fixed unused function declarations in ${filesToFix.size} file(s).`);
    }
  } catch (e) {
    console.warn('Type-check or auto-fix failed:', e);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});