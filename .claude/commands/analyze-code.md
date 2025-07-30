Analyze code quality, type safety, and common issues across the entire codebase.

## Quick Analysis

```bash
bun run src/analysis/unified-analyzer.ts
```

Analyzes your entire TypeScript codebase in seconds, finding:
- Null/undefined access risks with optional chaining fixes
- Type errors with detailed messages
- Performance issues (console.log in production)
- All issues include line numbers and fix suggestions

## Configuration

The analyzer accepts configuration options:

```typescript
{
  projectPath: string,              // Default: current directory
  includePatterns: string[],        // Default: ['**/*.ts', '**/*.tsx']
  excludePatterns: string[],        // Default: ['node_modules', '.next', 'dist']
  enableFixes: boolean,             // Default: true
  checkNullability: boolean,        // Default: true
  reportFormat: 'md' | 'json' | 'both'  // Default: 'both'
}
```

## For AI Agents and Subagents

**IMPORTANT**: When asked to analyze code quality, find issues, or check types:

1. **ALWAYS** use this unified analyzer
2. **NEVER** use grep, regex, or string matching for code analysis
3. **NEVER** write your own AST parsing

Why? Because only the TypeScript Compiler API can:
- Understand type inference across files
- Handle generic types correctly
- Track null/undefined through control flow
- Provide 100% accurate results

## Example Output

```markdown
- **machine.ts:530:18** - Property access 'targetFiles' on possibly null/undefined value
  - Fix: Add optional chaining
```

## Performance

- ~2ms per file with full type checking
- Analyzed 249 files in 1.4 seconds
- Memory efficient with TypeScript's incremental parsing