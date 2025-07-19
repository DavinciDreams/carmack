# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carmack Coder is a production-ready code transformation system built with TypeScript, XState, Zod, and Dafny. It implements John Carmack's engineering philosophy: prioritizing traditional programming approaches over AI prompting for provably correct, fast, and reliable code transformations.

**Key Technologies:**
- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript with strict configuration
- **State Machine**: XState for orchestration
- **Validation**: Zod schemas for runtime type safety
- **Formal Verification**: Dafny for correctness proofs
- **Code Transformation**: AST-grep for syntax tree modifications
- **Formatting**: Biome (not Prettier or ESLint for formatting)
- **Linting**: Biome for code quality checks

## Essential Commands

### Development
```bash
# Run the transformation system
bun run dev

# Run all quality checks (format, lint, type-check, tests)
bun run all-checks

# Individual quality checks
bun run format        # Format code with Biome
bun run lint          # Lint code with Biome
bun run type-check    # TypeScript type checking

# Environment validation
bun run env:validate  # Validate .env configuration
```

### Testing
```bash
# Run high-priority tests (quick validation)
bun run test:high

# Run specific test suites
bun run test:actors       # Core actor system tests
bun run test:performance  # Performance benchmarks
bun run test:verification # Formal verification tests
bun run test:telemetry   # Telemetry validation
bun run test:patterns    # Pattern validation
bun run test:deployment  # Deployment validation

# Run all tests
bun run test:all

# Run integration tests
bun run test:integration

# Run E2E tests
bun run test:e2e
```

### Production
```bash
# Run production pipeline
bun run production

# Dry run (no actual changes)
bun run production:dry-run --verbose

# Build for production
bun run production:build

# Docker operations
bun run docker:build
bun run docker:run
bun run docker:logs
```

### Documentation
```bash
# Generate documentation
bun run docs:generate

# Generate specific formats
bun run docs:api   # Markdown API docs
bun run docs:html  # HTML documentation
bun run docs:json  # JSON documentation
```

## High-Level Architecture

### Core State Machine Flow

The system uses XState to orchestrate a deterministic transformation pipeline:

1. **Creating Checkpoint** - Git restore point before modifications
2. **Analyzing** - Pattern matching and complexity assessment
3. **Reflecting** - Mode selection (template → AST → LLM)
4. **Applying Transformation** - Execute the selected transformation
5. **Validating Format** - Biome formatting validation
6. **Fixing Format** - Automatic corrections if needed
7. **Validating Types** - TypeScript type checking
8. **Fixing Types** - LLM-based resolution if needed
9. **Verifying with Dafny** - Formal correctness verification (optional)
10. **Measuring Complexity** - Post-transformation analysis
11. **Learning from Feedback** - Pattern extraction and optimization
12. **Committing Changes** - Git commit successful transformations

### Speed-First Strategy

The system prioritizes speed by trying transformations in this order:
1. **Template Mode** - Fast string-based transformations for simple patterns
2. **AST Mode** - Syntax tree transformations using AST-grep
3. **LLM Mode** - AI-powered transformations only when necessary

### Key Components

- **src/machine.ts** - Main XState state machine orchestrating all transformations
- **src/types.ts** - Zod schemas and TypeScript type definitions
- **src/actors/** - Individual actors implementing specific responsibilities:
  - `analysis.ts` - Code analysis and mode recommendation
  - `transformation.ts` - Core transformation execution
  - `template-engine.ts` - Template-based transformations
  - `ast-grep-transformation.ts` - AST-based transformations
  - `llm-transformation.ts` - LLM-powered transformations
  - `validation.ts` - Format and type validation
  - `git.ts` - Git operations and checkpoints
  - `complexity.ts` - Complexity measurement
  - `dafny.ts` - Formal verification
  - `pattern-learning.ts` - ML-based pattern discovery
  - `feedback-loop.ts` - Learning from transformation results

### Environment Configuration

The system uses a comprehensive `.env` configuration. Key settings:

```bash
# Core settings
NODE_ENV=development/production
CARMACK_REPOSITORY_URL=<your-repo-url>
CARMACK_WORKSPACE=./workspace

# LLM provider (openai/anthropic/local/mock)
LLM_PROVIDER=mock
OPENAI_API_KEY=<if-using-openai>
ANTHROPIC_API_KEY=<if-using-anthropic>

# Quality gates
ENABLE_VALIDATION=true
ENABLE_TESTING=true
REQUIRE_TYPE_CHECK=true
ENABLE_DAFNY_VERIFICATION=true

# Pattern learning
ENABLE_PATTERN_DISCOVERY=true
ENABLE_PATTERN_LEARNING=true
```

## Development Guidelines

### 1. Type Safety First
- Always use Zod schemas for runtime validation
- Never use `any` without explicit justification
- Leverage TypeScript's strict mode
- Ensure runtime validation matches compile-time types

### 2. Error Handling
- Every operation must have explicit error handling
- Use structured errors with context
- Implement graceful degradation
- Always provide rollback capabilities

### 3. Performance
- Minimize memory allocations in hot paths
- Use native bindings over CLI tools
- Design for horizontal scaling
- Measure and optimize transformation speed

### 4. Testing Strategy
- Write property-based tests for transformations
- Use formal verification for critical paths
- Test state machine flows comprehensively
- Benchmark performance regularly

### 5. Code Organization
- One actor per file in `src/actors/`
- Shared types in `src/types.ts` with Zod schemas
- Pure functions in `src/utils/`
- Keep the state machine in `src/machine.ts`

## Common Patterns

### Adding a New Actor
```typescript
// In src/actors/my-actor.ts
import { fromPromise } from 'xstate';
import { z } from 'zod';

const InputSchema = z.object({
  // Define input validation
});

export const myActor = fromPromise(async ({ input }) => {
  const validated = InputSchema.parse(input);
  // Actor logic here
  return result;
});
```

### Adding Validation
```typescript
// Use Zod for all external data
const MySchema = z.object({
  field: z.string().min(1),
  count: z.number().int().positive()
}).strict();

export type MyType = z.infer<typeof MySchema>;
```

### Error Handling Pattern
```typescript
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}
```

## Important Notes

1. **Always validate environment** before running: `bun run env:validate`
2. **Run quality checks** before committing: `bun run all-checks`
3. **Use Biome for formatting**, not Prettier
4. **Prioritize speed**: Try template/AST transformations before LLM
5. **Enable Dafny verification** for critical transformations
6. **Git integration** creates automatic checkpoints and rollback points
7. **Pattern learning** improves transformation quality over time
8. **Telemetry** provides insights when enabled in production

## Debugging Tips

- Enable verbose logging: Set `CARMACK_LOG_LEVEL=debug` in `.env`
- Use dry run mode: `bun run production:dry-run --verbose`
- Check test output: `bun run test:verbose`
- Monitor telemetry: Access Grafana at `http://localhost:3000` if configured
- Review transformation logs in `./logs/carmack.log`

Remember: This system prioritizes correctness, speed, and reliability. When in doubt, err on the side of safety and formal verification.