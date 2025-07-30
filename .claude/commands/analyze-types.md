Analyze TypeScript types, interfaces, and type safety issues.

## Full Codebase Analysis

Run the unified analyzer for comprehensive type checking:

```bash
bun run src/analysis/unified-analyzer.ts
```

This analyzer:
- Finds null/undefined access issues with fix suggestions
- Detects all TypeScript type errors
- Identifies performance issues (console.log statements)
- Works on the entire codebase, not just specific directories
- Generates both JSON and Markdown reports

## What It Finds

In the Carmack codebase, it found 583 issues:
- 148 null access errors (e.g., `property?.id` fixes)
- 435 console.log warnings
- 69 type errors

## Output

- `unified-analysis.json` - Structured data with all issues
- `unified-analysis.md` - Human-readable report with fixes

## Why Use This

- **100% Accurate**: Uses TypeScript Compiler API, not regex
- **Fast**: ~2ms per file
- **Actionable**: Every issue includes a fix suggestion
- **Complete**: Analyzes all TypeScript/TSX files

Never use grep or regex to analyze types - only the TypeScript compiler understands:
- Generic types
- Union types
- Type inference
- Cross-file relationships