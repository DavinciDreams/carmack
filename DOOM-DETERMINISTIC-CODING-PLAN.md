# DOOM Deterministic Code Transformation System - Carmack's Plan

## Executive Summary

The current system is overengineered. We're relying on Claude Code to do everything when we should be building deterministic transformations. For DOOM, we need speed, reliability, and predictability - not AI magic.

## Current State Analysis

After examining this codebase, here's what I found:

### Critical Issues

1. **Documentation Chaos**: 496+ documentation files scattered everywhere. This is bureaucracy, not engineering.

2. **Pattern Redundancy**: Three pattern files with duplicate content. No statistical tracking. No automatic generation from successful edits.

3. **LLM Over-reliance**: We jump to LLM mode too quickly instead of learning from what works and creating deterministic patterns.

4. **No Codebase Understanding**: The system treats files in isolation. No dependency tracking, no semantic understanding, no integration with issue trackers.

5. **Theoretical Pattern Learning**: We have pattern discovery code that doesn't actively convert LLM successes into AST patterns.

6. **Overengineering**: Multiple "enhanced" versions of files, complex state machines where simple functions would do.

## The Real Solution

### Core Architecture

```
┌─────────────────────┐
│ Hierarchical Code   │ ← Understands entire codebase structure
│ Representation      │ ← Integrates with JIRA/GitHub/Docs
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Statistical Pattern │ ← Learns from every LLM edit
│ Generator           │ ← Generates AST patterns automatically
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Deterministic       │ ← 90%+ transformations without LLM
│ Transformer         │ ← CST-safe, language-agnostic
└─────────────────────┘
```

## Implementation Plan

### Week 1: Brutal Cleanup

**Monday-Tuesday: Documentation Purge**
- Delete all docs except README.md, CLAUDE.md, and this plan
- Move actor documentation into code comments
- Create single machine-parseable CODEBASE_HIERARCHY.md

**Wednesday: Pattern Consolidation**
- Delete patterns.json and patterns-v3.json
- Keep patterns-consolidated.json as patterns.json
- Add statistical tracking to each pattern

**Thursday-Friday: Remove Overengineering**
- Delete all "enhanced" versions
- Simplify state machine to basic orchestration
- Remove Dafny (academic exercise, not practical)

### Week 2: Hierarchical Code Representation

**Core Data Structure:**
```typescript
interface CodebaseHierarchy {
  // Structural understanding
  files: Map<string, FileInfo>;
  modules: Map<string, ModuleInfo>;
  dependencies: DependencyGraph;
  
  // Semantic understanding
  symbols: {
    classes: Map<string, ClassInfo>;
    functions: Map<string, FunctionInfo>;
    types: Map<string, TypeInfo>;
  };
  
  // External context
  knowledge: {
    issues: Map<string, IssueInfo>;      // JIRA/GitHub issues
    commits: Map<string, CommitInfo>;    // Git history
    docs: Map<string, DocInfo>;          // External docs
  };
  
  // Pattern mining
  patterns: {
    frequency: Map<string, number>;      // Common code patterns
    transformations: Map<string, Edit[]>; // Historical edits
  };
}
```

**Implementation:**
- Use tree-sitter for CST parsing (exact representation)
- Build dependency graph from imports/exports
- Connect to GitHub/JIRA APIs for context
- Store in efficient binary format for speed

### Week 3: Statistical Pattern Generation

**LLM Edit Logger:**
```typescript
interface LLMEdit {
  id: string;
  timestamp: number;
  file: string;
  before: {
    code: string;
    cst: CSTNode;
    context: CodeContext;
  };
  after: {
    code: string;
    cst: CSTNode;
  };
  success: boolean;
  time_ms: number;
}
```

**Pattern Extraction Pipeline:**
1. Log every LLM transformation
2. Extract CST diff between before/after
3. Generalize into AST pattern
4. Generate ast-grep YAML template
5. Validate against test corpus
6. Track performance statistics

**Pattern Promotion:**
- Success rate > 80% → Promote to deterministic
- Success rate < 20% → Retire pattern
- A/B test variations automatically

### Week 4: Deterministic Pipeline

**New Transformation Flow:**
```
1. Parse Request
2. Query Hierarchical Representation
3. Find Applicable Patterns (confidence > 0.8)
4. Apply Deterministic Transformations
5. IF (incomplete) {
     Use LLM for remainder
     Log all edits for pattern extraction
   }
6. Validate CST preservation
7. Update statistics
```

**Key Changes:**
- No complex state machine
- Direct function calls
- Fail fast, recover fast
- Measure everything

### Week 5: Language Support

**Plugin Architecture:**
```typescript
interface LanguagePlugin {
  name: string;
  extensions: string[];
  parser: {
    parseCST(code: string): CSTNode;
    printCST(node: CSTNode): string;
  };
  patterns: {
    match(pattern: Pattern, code: string): Match[];
    apply(pattern: Pattern, match: Match): string;
  };
  validator: {
    syntaxCheck(code: string): Error[];
    semanticCheck(code: string, context: Context): Error[];
  };
}
```

**Priority Languages:**
1. C/C++ (DOOM primary)
2. TypeScript/JavaScript (current system)
3. Python (tooling)
4. Rust (future systems)

## Success Metrics

### Speed
- Deterministic transformations: <100ms
- Full file analysis: <500ms
- Pattern matching: <50ms

### Determinism
- 90%+ transformations use template/AST
- 0% CST corruption
- 100% reversible transformations

### Learning
- Generate 10+ patterns per week automatically
- Pattern success rate improves weekly
- Cross-language pattern transfer

### Reliability
- Zero data loss
- Graceful degradation
- Clear error messages

## What We're NOT Doing

1. **Complex State Machines**: Direct function composition instead
2. **Formal Verification**: Dafny is academic masturbation
3. **Excessive Documentation**: Code should be self-documenting
4. **Multiple Versions**: One implementation per feature
5. **Theoretical Features**: If it's not used in DOOM, delete it

## Core Principles

1. **Measure First**: You can't optimize what you don't measure
2. **Fast by Default**: Speed is a feature
3. **Deterministic**: Same input → Same output, always
4. **Simple**: Complexity is where bugs hide
5. **Practical**: Ship working code, not research papers

## Immediate Actions

1. **Today**: Start documentation cleanup
2. **Tomorrow**: Consolidate patterns with statistics
3. **This Week**: Build CST parser prototype
4. **Next Week**: Implement edit logger
5. **Two Weeks**: First deterministic patterns from logs

## Expected Outcomes

- **Month 1**: 50% reduction in LLM usage
- **Month 2**: 90% deterministic transformations
- **Month 3**: Full DOOM codebase support
- **Month 6**: Industry-standard tool

Remember: We're building a production tool for shipping games, not winning academic awards. Every feature must directly improve development speed and reliability.

Speed matters. Determinism matters. Everything else is negotiable.

-- Carmack