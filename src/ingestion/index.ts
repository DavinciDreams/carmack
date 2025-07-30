/**
 * Repository Knowledge Graph Ingestion Pipeline
 *
 * Complete ingestion system for processing any repository's data, extracting code
 * semantics, and populating a knowledge graph. This module provides all
 * the components needed for a robust, repo-agnostic ingestion pipeline implementation.
 */

export * from '../docs-generator/ast-analyzer.ts';
export * from './content-processor.ts';
export * from './github-client.ts';
export * from './ingestion-orchestrator.ts';
// Job definitions
export * from './jobs/index.ts';
// Core components
export * from './repository-manager.ts';

// Testing and CLI

export {
  IngestionCLI,
  main as IngestionCLIMain,
  parseCommandLineArgs,
} from '../cli/knowledge-graph-cli.ts';
export { main as IngestionTestMain } from './test-ingestion-pipeline.ts';

// Re-export commonly used functions

export { createGitHubClient } from './github-client.ts';
// Only export generic, repo-agnostic, and valid symbols
export { createIngestionOrchestrator } from './ingestion-orchestrator.ts';
export { createRepositoryManager } from './repository-manager.ts';
export { runIngestionTests } from './test-ingestion-pipeline.ts';

// Types and schemas

export type { CommitMetadata, FileContentMetadata } from '../types/unified-schemas.ts';
export type {
  ContentChunk,
  ContentProcessingConfig,
  ProcessingResult,
  SemanticAnnotation,
} from './content-processor.ts';

export type {
  GitHubCommit,
  GitHubConfig,
  Issue,
  PullRequest,
} from './github-client.ts';
export type {
  IngestionConfig,
  IngestionProgress,
  IngestionResult,
} from './ingestion-orchestrator.ts';
export type { FileFilterConfig } from './repository-manager.ts';
