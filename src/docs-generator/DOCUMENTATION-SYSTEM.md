# 📚 Carmack Coder Documentation System

# Carmack Documentation System (2025)

This document describes the current architecture and workflow for the Carmack documentation system, reflecting the latest refactors and unified design.

## Architectural Overview

- **Language-Agnostic Analysis:** All code ingestion, documentation generation, and codebase change tracking use a single, unified AST analysis pipeline supporting TypeScript, Python, C++, CUDA, Go, Rust, Java, and more.
- **Runtime:** Bun (not Node.js)
- **Type Safety:** Zod schemas for all data validation (external and internal), strict TypeScript configuration, and runtime/compile-time type alignment.
- **Architecture:** XState state machines and actor model orchestrate all flows (ingestion, documentation, LLM annotation, transformation).
- **Transformation:** AST-grep via @ast-grep/napi for syntax tree analysis and code transformation.
- **Formatting:** Biome (not Prettier)
- **Quality:** ESLint with strict TypeScript rules
- **Formal Verification:** Dafny specifications for correctness-critical algorithms

## Core Components

### 1. Multi-Language AST Analysis

- The `MultiLanguageAnalyzer` extracts code entities (functions, classes, types, constants, imports, dependencies) from any supported language.
- Entity extraction is normalized to a common structure (`CodeEntity`), enabling consistent downstream processing for documentation, LLM annotation, and codebase change tracking.

### 2. Type-Safe Documentation Generation

- Documentation structures (`ModuleDoc`, `FunctionDoc`, `ClassDoc`, etc.) are defined with Zod schemas for both runtime and compile-time safety.
- The `ASTAnalyzer` maps extracted entities to these documentation types, producing robust, type-safe documentation artifacts.

### 3. Actor-Based Orchestration

- XState state machines and actors coordinate all documentation, annotation, and transformation flows.
- Each actor is responsible for a single transformation or analysis step, with explicit error handling and resource management.

### 4. Output and Organization

- Documentation, logs, and generated artifacts are grouped with their relevant code or output folders for clarity and maintainability.

### 5. Validation, Testing, and Verification

- All data is validated with Zod schemas.
- Critical algorithms are specified in Dafny for formal verification.
- Property-based and integration tests ensure transformation correctness and system reliability.

## Workflow

1. **Ingestion:** Source files are analyzed by the `MultiLanguageAnalyzer`, producing normalized `CodeEntity` objects.
2. **Mapping:** The `ASTAnalyzer` maps entities to documentation types (`ModuleDoc`, `FunctionDoc`, etc.).
3. **Generation:** Documentation is generated in Markdown or JSON, grouped with code for easy access.
4. **Annotation:** LLM annotation and code transformation flows consume the same normalized entity structure for consistency.
5. **Validation:** All outputs are validated against Zod schemas; errors are handled explicitly with detailed context.

## Design Principles

- **Type Safety First:** Zod validation, strict TypeScript, no `any` without justification.
- **Provable Correctness:** Formal verification (Dafny) for critical paths.
- **Performance:** Native bindings, minimal allocations, horizontal scaling.
- **Error Resilience:** Explicit error handling, no silent failures, detailed error context.
- **Maintainability:** Modular, actor-based, minimal dependencies, clear output organization.

## Extensibility

- New languages or entity types can be added by extending the `MultiLanguageAnalyzer` and updating Zod schemas.
- Documentation and transformation flows automatically benefit from the unified pipeline.

## Summary

The Carmack documentation system is correctness-first, extensible, and maintainable. It leverages a unified, language-agnostic AST analysis pipeline, type-safe documentation generation, and robust validation to support modern, multi-language codebases.
├── api.md             # API reference (functions, classes, interfaces)
├── patterns.md        # Transformation patterns
├── configs.md         # Configuration schemas
├── states.md          # State machine documentation
└── documentation.json # Raw structured data
```

## 🔧 Technical Architecture

### Core Components
- **DocumentationGenerator**: Main extraction and generation engine
- **DocumentationCLI**: Command-line interface with watch mode
- **Multiple Extractors**: TypeScript, JavaScript, and JSON pattern parsers
- **Template Renderers**: Markdown and JSON output generators

### Performance Characteristics
- **Scan Speed**: 20 files processed in ~70ms
- **Watch Responsiveness**: Changes detected and processed in real-time
- **Memory Efficiency**: Minimal footprint with smart caching
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 📈 Current Statistics

As of the latest generation:
- **Total Files Scanned**: 20
- **Total Items Documented**: 123
- **Functions**: 89
- **Classes**: 15
- **Interfaces**: 7
- **Transformation Patterns**: 12
- **Generation Time**: ~67ms

## 🎉 Benefits

### For Developers
- **Zero Maintenance**: Documentation updates automatically
- **Always Current**: Never outdated or stale documentation
- **Rich Context**: JSDoc comments and metadata preserved
- **Quick Reference**: Fast navigation and search

### For Teams
- **Onboarding**: New team members get instant comprehensive docs
- **Code Reviews**: Documentation changes are visible in diffs
- **Knowledge Sharing**: Patterns and configurations are well documented
- **API Discovery**: Easy exploration of available functions and classes

### For Production
- **Reliability**: Automated systems are more reliable than manual processes
- **Consistency**: Standardized documentation format across all components
- **Integration**: JSON output enables tooling integration
- **Monitoring**: Statistics track documentation coverage and health

## 🔮 Perfect Carmack Philosophy

This system embodies John Carmack's engineering principles:
- **Automation Over Manual Labor**: No more manual documentation updates
- **Data-Driven Decisions**: Rich statistics and metrics
- **Simple, Powerful Tools**: Elegant CLI with powerful features
- **Performance Focus**: Sub-100ms regeneration times
- **Reliability**: Automated systems are more dependable than human processes

---

*This documentation was automatically generated by the Carmack Coder Documentation System in 67ms, scanning 20 files and documenting 123 code elements.*
