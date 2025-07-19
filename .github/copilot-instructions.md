<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Carmack Coder - GitHub Copilot Instructions

This is a TypeScript-based code editing agent architecture built with Bun, focusing on provably correct code transformations using formal methods and traditional programming approaches.

## Project Context

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript with strict configuration
- **Architecture**: XState state machines + Actor model
- **Validation**: Zod schemas for runtime type safety
- **Verification**: Dafny for formal correctness proofs
- **Transformations**: AST-grep for syntax tree modifications
- **Formatting**: Biome (not Prettier)
- **Quality**: ESLint with TypeScript rules

## Core Principles

### 1. Type Safety First
- Use Zod schemas for all external data validation
- Never use `any` without explicit reasoning
- Leverage TypeScript's strict mode capabilities
- Runtime validation must match compile-time types

### 2. Provable Correctness
- Write Dafny specifications for critical algorithms
- Use formal verification over testing when possible
- Document invariants and preconditions
- Ensure transformation preserve program semantics

### 3. Performance & Scalability
- Prioritize speed: template → AST → LLM transformations
- Use native bindings (@ast-grep/napi) over CLI tools
- Minimize memory allocations in hot paths
- Design for horizontal scaling

### 4. Error Resilience
- Every operation must have explicit error handling
- Use Result types or exceptions, never silent failures
- Implement graceful degradation strategies
- Provide detailed error context for debugging

## Code Style Guidelines

### State Machine Design
```typescript
// ✅ Explicit state with typed context
export const myMachine = setup({
  types: {
    context: {} as MyContext,
    events: {} as MyEvent,
  },
  // ...
}).createMachine({
  // States should be descriptive and action-oriented
  // Use guards for complex conditions
  // Keep actors in separate files
});
```

### Zod Schema Patterns
```typescript
// ✅ Comprehensive validation with helpful errors
export const MySchema = z.object({
  id: z.string().uuid(),
  count: z.number().int().min(0),
  mode: z.enum(['fast', 'safe', 'optimal']),
}).strict(); // Always use strict() for object schemas

// ✅ Type extraction and validation helpers
export type MyType = z.infer<typeof MySchema>;
export const validateMyType = (data: unknown): MyType => {
  return MySchema.parse(data);
};
```

### Actor Implementation
```typescript
// ✅ Pure transformation functions
export const myActor = fromPromise(async ({ input }: { input: MyInput }) => {
  const validated = MyInputSchema.parse(input);
  
  // Business logic here
  const result = await processInput(validated);
  
  return result;
});
```

### Error Handling
```typescript
// ✅ Structured error information
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

## Architecture Patterns

### File Organization
- One actor per file in `src/actors/`
- Shared types in `src/types.ts` with Zod schemas
- Utilities in `src/utils/` with pure functions
- State machine definition in `src/machine.ts` (monolithic by design)

### Dependency Management
- **Always use `bun` over `npm` or `yarn`** for package management
- **Use `bun` instead of `bunx`** for running executables and scripts
- Use native APIs over CLI tools (ESLint Node API, not CLI)
- Prefer runtime bindings (@ast-grep/napi) over subprocess calls
- Keep external dependencies minimal and well-justified
- All tools should integrate programmatically

### Testing Strategy
- Property-based testing for transformation correctness
- Formal verification with Dafny for critical paths
- Integration tests for state machine flows
- Performance benchmarks for transformation speed

## Common Patterns

### Validation Pipeline
```typescript
// ✅ Multi-stage validation with clear error reporting
const result = await pipe(
  input,
  validateSchema,
  checkBusinessRules,
  applyTransformation,
  validateOutput
);
```

### State Machine Integration
```typescript
// ✅ Type-safe event handling
actor.send({
  type: 'PROCESS_FILES',
  files: validatedFiles,
  options: validatedOptions,
});
```

### Resource Management
```typescript
// ✅ Explicit cleanup and error boundaries
try {
  const result = await processWithResources();
  return result;
} finally {
  await cleanup();
}
```

## Anti-Patterns to Avoid

- ❌ Using `any` type without explicit justification
- ❌ Mutating shared state between actors
- ❌ Relying on string manipulation for code transformations
- ❌ Ignoring Dafny verification failures
- ❌ Using external CLI tools when APIs are available
- ❌ Creating circular dependencies between modules
- ❌ Exposing internal implementation details in public APIs
- ❌ Using `npm`, `yarn`, or `bunx` instead of `bun` commands
- ❌ Running package managers other than Bun in this project

## When Suggesting Code

1. **Always validate inputs** with Zod schemas
2. **Consider formal verification** for correctness-critical code
3. **Use proper TypeScript types** with strict null checks
4. **Handle errors explicitly** with detailed context
5. **Optimize for readability** and maintainability over cleverness
6. **Follow the speed hierarchy**: template → AST → LLM
7. **Document complex algorithms** with mathematical notation if applicable

Remember: This system transforms code, so correctness is paramount. When in doubt, err on the side of safety and formal verification.
