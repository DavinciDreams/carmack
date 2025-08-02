// Run the enhanced analyzer pipeline on demo/test-type-errors.ts

import { AnalyzerConfigSchema, UnifiedAnalyzer } from '../src/analysis/unified-analyzer';

async function main() {
  const config = AnalyzerConfigSchema.parse({
    projectPath: require('node:path').resolve(__dirname, '../src'),
    // Analyze all TS/TSX files in src
    includePatterns: ['**/*.ts', '**/*.tsx'],
    excludePatterns: [],
    enableFixes: true, // Autofix mode: apply all supported fixes
    checkNullability: true,
    checkComponents: true,
    reportFormat: 'both',
    maxIssues: 1000,
  });

  const analyzer = new UnifiedAnalyzer(config);
  const result = await analyzer.analyze();
  // Print summary
  console.log('\n=== Analyzer Pipeline Dry Run Result ===');
  console.log('LLM Results:', result.llmResults);
  console.log(
    'Issues:',
    result.issues.map((i) => ({
      file: i.file,
      line: i.line,
      column: i.column,
      type: i.type,
      message: i.message,
      fix: i.fix?.description,
    }))
  );
  console.log('Files Modified:', result.filesModified);
  console.log('Stats:', result.stats);
  console.log('\nFull analyzer reports written to unified-analysis.json and unified-analysis.md');
}

main().catch((err) => {
  console.error('Analyzer pipeline test failed:', err);
  process.exit(1);
});
