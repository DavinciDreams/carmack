import { z } from 'zod';

/**
 * Knowledge Graph Type Definitions for TensorRT-LLM System
 *
 * Defines the core types and schemas for the knowledge graph system,
 * following Carmack's principles of type safety and formal correctness.
 */


// =============================================================================
// CORE KNOWLEDGE GRAPH TYPES
// =============================================================================

/**
 * Node types in the knowledge graph
 */
export const NodeTypeSchema = z.enum([
  'repository',
  'file',
  'function',
  'class',
  'variable',
  'type',
  'import',
  'export',
  'comment',
  'documentation',
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

/**
 * Relationship types between nodes
 */
export const RelationshipTypeSchema = z.enum([
  'contains',
  'imports',
  'exports',
  'calls',
  'inherits',
  'implements',
  'references',
  'documents',
  'depends_on',
  'similar_to',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

/**
 * Knowledge graph node schema
 */
export const KnowledgeNodeSchema = z.object({
  id: z.string().uuid(),
  type: NodeTypeSchema,
  name: z.string(),
  path: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  embedding: z.array(z.number()).optional(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;

/**
 * Knowledge graph relationship schema
 */
export const KnowledgeRelationshipSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  type: RelationshipTypeSchema,
  weight: z.number().min(0).max(1).default(1.0),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.date().default(() => new Date()),
});

export type KnowledgeRelationship = z.infer<typeof KnowledgeRelationshipSchema>;

// =============================================================================
// INGESTION TYPES
// =============================================================================

/**
 * Repository ingestion configuration
 */
export const IngestionConfigSchema = z.object({
  repository_url: z.string().url(),
  branch: z.string().default('main'),
  include_patterns: z.array(z.string()).default(['**/*.{ts,js,py,cpp,h,hpp,cu,cuh}']),
  exclude_patterns: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/.git/**']),
  max_file_size: z.number().default(1024 * 1024), // 1MB
  enable_embeddings: z.boolean().default(true),
  embedding_model: z.string().default('text-embedding-ada-002'),
});

export type IngestionConfig = z.infer<typeof IngestionConfigSchema>;

/**
 * File processing result
 */
export const FileProcessingResultSchema = z.object({
  file_path: z.string(),
  success: z.boolean(),
  nodes_created: z.number().default(0),
  relationships_created: z.number().default(0),
  error: z.string().optional(),
  processing_time_ms: z.number(),
});

export type FileProcessingResult = z.infer<typeof FileProcessingResultSchema>;

/**
 * Ingestion job status
 */
export const IngestionJobSchema = z.object({
  id: z.string().uuid(),
  repository_url: z.string().url(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  config: IngestionConfigSchema,
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
  total_files: z.number().default(0),
  processed_files: z.number().default(0),
  failed_files: z.number().default(0),
  nodes_created: z.number().default(0),
  relationships_created: z.number().default(0),
  error: z.string().optional(),
});

export type IngestionJob = z.infer<typeof IngestionJobSchema>;

// =============================================================================
// QUERY TYPES
// =============================================================================

/**
 * Query types supported by the system
 */
export const QueryTypeSchema = z.enum([
  'semantic_search',
  'code_search',
  'dependency_analysis',
  'similarity_search',
  'graph_traversal',
  'pattern_matching',
]);

export type QueryType = z.infer<typeof QueryTypeSchema>;

/**
 * Search query schema
 */
export const SearchQuerySchema = z.object({
  query: z.string(),
  type: QueryTypeSchema,
  filters: z.object({
    node_types: z.array(NodeTypeSchema).optional(),
    file_patterns: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
  }).optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  include_embeddings: z.boolean().default(false),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  node: KnowledgeNodeSchema,
  score: z.number().min(0).max(1),
  explanation: z.string().optional(),
  relationships: z.array(KnowledgeRelationshipSchema).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Query response schema
 */
export const QueryResponseSchema = z.object({
  query: SearchQuerySchema,
  results: z.array(SearchResultSchema),
  total_count: z.number(),
  execution_time_ms: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type QueryResponse = z.infer<typeof QueryResponseSchema>;

// =============================================================================
// API TYPES
// =============================================================================

/**
 * API error schema
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    timestamp: z.date().default(() => new Date()),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
};

// =============================================================================
// AGENT TYPES
// =============================================================================

/**
 * Agent task types
 */
export const AgentTaskTypeSchema = z.enum([
  'code_analysis',
  'documentation_generation',
  'pattern_extraction',
  'dependency_mapping',
  'semantic_indexing',
  'quality_assessment',
]);

export type AgentTaskType = z.infer<typeof AgentTaskTypeSchema>;

/**
 * Agent task schema
 */
export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  type: AgentTaskTypeSchema,
  input: z.record(z.unknown()),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  created_at: z.date().default(() => new Date()),
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
  execution_time_ms: z.number().optional(),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Health check status
 */
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date().default(() => new Date()),
  services: z.record(z.object({
    status: z.enum(['up', 'down', 'degraded']),
    latency_ms: z.number().optional(),
    error: z.string().optional(),
  })),
  version: z.string(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate knowledge node data
 */
export const validateKnowledgeNode = (data: unknown): KnowledgeNode => {
  return KnowledgeNodeSchema.parse(data);
};

/**
 * Validate knowledge relationship data
 */
export const validateKnowledgeRelationship = (data: unknown): KnowledgeRelationship => {
  return KnowledgeRelationshipSchema.parse(data);
};

/**
 * Validate search query data
 */
export const validateSearchQuery = (data: unknown): SearchQuery => {
  return SearchQuerySchema.parse(data);
};

/**
 * Validate ingestion config data
 */
export const validateIngestionConfig = (data: unknown): IngestionConfig => {
  return IngestionConfigSchema.parse(data);
};

/**
 * Validate agent task data
 */
export const validateAgentTask = (data: unknown): AgentTask => {
  return AgentTaskSchema.parse(data);
};