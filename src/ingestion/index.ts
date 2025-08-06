/**
 * Repository Knowledge Graph Ingestion Pipeline
 *
 * Complete ingestion system for processing any repository's data, extracting code
 * semantics, and populating a knowledge graph. This module provides all
 * the components needed for a robust, repo-agnostic ingestion pipeline implementation.
 */

// Core components
export * from './repository-manager.ts';
export * from './github-client.ts';
export * from '../docs/ast-analyzer.ts';
export * from './content-processor.ts';
export * from './ingestion-orchestrator.ts';

// Job definitions
export * from './jobs/index.ts';

// Testing and CLI

// export { main as IngestionTestMain } from './test-ingestion-pipeline.ts';
export { main as IngestionCLIMain } from '../cli/knowledge-graph-cli.ts';

// Re-export commonly used functions

// Only export generic, repo-agnostic, and valid symbols
export { createIngestionOrchestrator } from './ingestion-orchestrator.ts';
export { createRepositoryManager } from './repository-manager.ts';
export { createGitHubClient } from './github-client.ts';
// export { runIngestionTests } from './test-ingestion-pipeline.ts';

// Types and schemas

export type {
  FileFilterConfig,
} from './repository-manager.ts';
export type { CommitMetadata, FileContentMetadata } from '../types/unified-schemas.ts';

export type {
  GitHubConfig,
  PullRequest,
  Issue,
  GitHubCommit,
} from './github-client.ts';


export type {
  ContentProcessingConfig,
  ContentChunk,
  ProcessingResult,
} from './content-processor.ts';
export type { SemanticAnnotation } from '../llm-annotation/types.js';

export type {
  IngestionConfig,
  IngestionProgress,
  IngestionResult,
} from './ingestion-orchestrator.ts';