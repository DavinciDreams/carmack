Find code patterns using AST-aware analysis instead of text search.

## Unified Code Analysis

For ALL code pattern searches, use the unified analyzer:

```bash
bun run src/analysis/unified-analyzer.ts
```

This finds patterns like:
- Null/undefined access patterns
- Console.log usage
- Type mismatches
- And generates fixes for everything

## Common Pattern Searches

### Finding Null Access Patterns
The unified analyzer automatically finds all null/undefined access risks:
- `object.property` where object might be null
- Array access without bounds checking
- Method calls on potentially undefined values

### Finding Console Statements
Automatically identifies all console.* calls in production code:
- Marks them as performance issues
- Suggests removal
- Provides exact line numbers

### Finding Type Issues
Detects all TypeScript compiler errors:
- Missing properties
- Type mismatches
- Incorrect function arguments

## Why NOT Grep/Regex

Text search fails because it:
- Can't understand TypeScript's type system
- Finds false positives in comments/strings
- Misses context-dependent patterns
- Can't track null through control flow

Example: `grep "\.length"` finds comments, strings, and safe uses. The unified analyzer only flags actual null risks.

## For Subagents

**RULE**: If searching for code patterns, ALWAYS use:
```bash
bun run src/analysis/unified-analyzer.ts
```

**NEVER** use:
- grep
- regex patterns
- string.includes()
- Manual AST walking

The unified analyzer is faster AND more accurate than any regex approach.