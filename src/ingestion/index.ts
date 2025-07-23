/**
 * TensorRT-LLM Knowledge Graph Ingestion Pipeline
 *
 * Complete ingestion system for processing repository data, extracting code
 * semantics, and populating the knowledge graph. This module provides all
 * the components needed for the EPIC-INGESTION-PIPELINE implementation.
 */

// Core components
export * from './repository-manager.ts';
export * from './github-client.ts';
export * from './ast-analyzer.ts';
export * from './content-processor.ts';
export * from './ingestion-orchestrator.ts';

// Job definitions
export * from './jobs/index.ts';

// Testing and CLI
export * from './test-ingestion-pipeline.ts';
export * from './cli.ts';

// Re-export commonly used functions
export {
  createIngestionOrchestrator,
  runTensorRTIngestion,
} from './ingestion-orchestrator.ts';

export {
  createTensorRTRepositoryManager,
} from './repository-manager.ts';

export {
  createTensorRTGitHubClient,
} from './github-client.ts';

export {
  createTensorRTASTAnalyzer,
} from './ast-analyzer.ts';

export {
  createTensorRTContentProcessor,
} from './content-processor.ts';

export {
  runIngestionTests,
} from './test-ingestion-pipeline.ts';

// Types and schemas
export type {
  RepositoryConfig,
  FileFilterConfig,
  CommitMetadata,
  FileContent,
} from './repository-manager.ts';

export type {
  GitHubConfig,
  PullRequest,
  Issue,
  GitHubCommit,
} from './github-client.ts';

export type {
  ASTConfig,
  CSTNode,
  TensorRTPattern,
  AnalysisResult,
} from './ast-analyzer.ts';

export type {
  ContentProcessingConfig,
  ContentChunk,
  SemanticAnnotation,
  ProcessingResult,
} from './content-processor.ts';

export type {
  IngestionConfig,
  IngestionProgress,
  IngestionResult,
} from './ingestion-orchestrator.ts';