import { z } from 'zod';

/**
 * Database Schema Types and Zod Validation for TensorRT-LLM Knowledge Graph
 *
 * Provides comprehensive type-safe database operations with Zod schemas matching
 * the database tables. Follows Carmack's principles of provable correctness and
 * runtime validation.
 */

// =============================================================================
// CORE KNOWLEDGE GRAPH SCHEMAS
// =============================================================================

/**
 * Artifact types for engineering artifacts
 */
export const ArtifactTypeSchema = z.enum([
  'commit',
  'issue',
  'pr',
  'code_line',
  'function',
  'class',
  'file',
  'module',
  'test',
  'documentation',
  'config',
  'build_script',
]);

/**
 * Performance impact levels
 */
export const PerformanceImpactSchema = z.enum(['critical', 'high', 'normal', 'low']);

/**
 * Base artifact schema without refinements for use in derived schemas
 */
const BaseArtifactSchema = z.object({
  entityKind: z.literal('artifact'),
  id: z.string().uuid(),
  type: ArtifactTypeSchema,
  name: z.string().max(500),
  description: z.string().optional(),
  content: z.string().optional(),
  file_path: z.string().optional(),
  line_start: z.number().int().positive().optional(),
  line_end: z.number().int().positive().optional(),
  language: z.string().max(50).optional(),
  repository_url: z.string().optional(),
  commit_hash: z.string().length(40).optional(),
  author_name: z.string().max(255).optional(),
  author_email: z.string().email().optional(),
  created_date: z.date().optional(),
  modified_date: z.date().optional(),

  // Semantic embedding (384 dimensions)
  embedding: z.array(z.number()).length(384).optional(),

  // Metadata as flexible object
  metadata: z.record(z.unknown()).default({}),

  // Performance and quality metrics
  complexity_score: z.number().min(0).default(0),
  performance_impact: PerformanceImpactSchema.default('normal'),
  quality_score: z.number().min(0).max(1).default(0),

  // Audit fields
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

/**
 * Artifacts table schema with validation
 */
export const ArtifactSchema = BaseArtifactSchema.refine(
  (data) => !data.line_start || !data.line_end || data.line_start <= data.line_end,
  { message: 'line_start must be less than or equal to line_end' }
);

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * Relationship types for graph edges
 */
export const RelationTypeSchema = z.enum([
  'causal',
  'reference',
  'dependency',
  'tradeoff',
  'cst_structure',
  'historical_change',
  'pr_link',
  'implements',
  'calls',
  'inherits',
  'uses',
  'optimizes',
  'tests',
  'documents',
  'configures',
]);

/**
 * Evidence types for relationships
 */
export const EvidenceTypeSchema = z.enum(['explicit', 'inferred', 'learned']);

/**
 * Base graph edge schema without refinements
 */
const BaseGraphEdgeSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  relation_type: RelationTypeSchema,
  confidence: z.number().min(0).max(1).default(1.0),
  weight: z.number().min(0).default(1.0),
  is_bidirectional: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
  evidence: z.string().optional(),
  evidence_type: EvidenceTypeSchema.default('inferred'),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

/**
 * Graph edges table schema with validation
 */
export const GraphEdgeSchema = BaseGraphEdgeSchema.refine(
  (data) => data.source_id !== data.target_id,
  { message: 'source_id and target_id cannot be the same (no self-references)' }
);

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

/**
 * Query session status
 */
export const SessionStatusSchema = z.enum(['active', 'completed', 'abandoned']);

/**
 * Query sessions table schema
 */
export const QuerySessionSchema = z.object({
  id: z.string().uuid(),
  session_token: z.string().max(255),
  user_id: z.string().max(255).optional(),
  repository_url: z.string().optional(),
  investigation_goal: z.string().optional(),
  current_context: z.record(z.unknown()).default({}),
  status: SessionStatusSchema.default('active'),
  total_queries: z.number().int().min(0).default(0),
  successful_queries: z.number().int().min(0).default(0),
  started_at: z.date().default(() => new Date()),
  last_activity_at: z.date().default(() => new Date()),
  completed_at: z.date().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type QuerySession = z.infer<typeof QuerySessionSchema>;

/**
 * Step types for intermediates
 */
export const StepTypeSchema = z.enum([
  'query_analysis',
  'semantic_search',
  'graph_traversal',
  'context_assembly',
  'reasoning',
  'code_analysis',
  'pattern_matching',
  'synthesis',
]);

/**
 * Step status
 */
export const StepStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

/**
 * Intermediates table schema
 */
export const IntermediateSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  step_number: z.number().int().positive(),
  step_type: StepTypeSchema,
  step_description: z.string().optional(),
  input_data: z.record(z.unknown()).optional(),
  output_data: z.record(z.unknown()).optional(),
  artifact_ids: z.array(z.string().uuid()).default([]),
  execution_time_ms: z.number().int().positive().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  status: StepStatusSchema.default('completed'),
  error_message: z.string().optional(),
  created_at: z.date().default(() => new Date()),
});

export type Intermediate = z.infer<typeof IntermediateSchema>;

// =============================================================================
// HISTORICAL CODE ANALYSIS SCHEMAS
// =============================================================================

/**
 * Commits table schema
 */
export const CommitSchema = z.object({
  id: z.string().uuid(),
  commit_hash: z.string().length(40),
  repository_url: z.string(),
  author_name: z.string().max(255),
  author_email: z.string().email(),
  committer_name: z.string().max(255).optional(),
  committer_email: z.string().email().optional(),
  commit_date: z.date(),
  message: z.string(),
  message_subject: z.string().max(500).optional(),
  message_body: z.string().optional(),
  diff_text: z.string().optional(),
  files_changed: z.number().int().min(0).default(0),
  lines_added: z.number().int().min(0).default(0),
  lines_deleted: z.number().int().min(0).default(0),
  parent_hashes: z.array(z.string().length(40)).default([]),
  branch_name: z.string().max(255).optional(),
  tag_names: z.array(z.string().max(255)).default([]),
  pr_id: z.string().uuid().optional(),
  complexity_delta: z.number().default(0),
  risk_score: z.number().min(0).max(1).default(0),
  impact_score: z.number().min(0).max(1).default(0),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type Commit = z.infer<typeof CommitSchema>;

/**
 * PR state
 */
export const PRStateSchema = z.enum(['open', 'closed', 'merged', 'draft']);

/**
 * Risk assessment levels
 */
export const RiskAssessmentSchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * PRs table schema
 */
export const PRSchema = z.object({
  id: z.string().uuid(),
  pr_number: z.number().int().positive(),
  repository_url: z.string(),
  title: z.string().max(500),
  description: z.string().optional(),
  state: PRStateSchema,
  author_login: z.string().max(255),
  author_name: z.string().max(255).optional(),
  author_email: z.string().email().optional(),
  created_at_github: z.date(),
  updated_at_github: z.date().optional(),
  closed_at_github: z.date().optional(),
  merged_at_github: z.date().optional(),
  head_branch: z.string().max(255),
  base_branch: z.string().max(255),
  head_sha: z.string().length(40).optional(),
  base_sha: z.string().length(40).optional(),
  merge_commit_sha: z.string().length(40).optional(),
  reviewers: z.array(z.record(z.unknown())).default([]),
  assignees: z.array(z.record(z.unknown())).default([]),
  labels: z.array(z.record(z.unknown())).default([]),
  commits_count: z.number().int().min(0).default(0),
  files_changed: z.number().int().min(0).default(0),
  lines_added: z.number().int().min(0).default(0),
  lines_deleted: z.number().int().min(0).default(0),
  comments_count: z.number().int().min(0).default(0),
  review_comments_count: z.number().int().min(0).default(0),
  complexity_impact: z.number().default(0),
  risk_assessment: RiskAssessmentSchema.default('medium'),
  github_metadata: z.record(z.unknown()).default({}),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type PR = z.infer<typeof PRSchema>;

/**
 * Visibility levels
 */
export const VisibilitySchema = z.enum(['public', 'private', 'protected', 'internal']);

/**
 * Base CST node schema without refinements
 */
const BaseCSTNodeSchema = z.object({
  id: z.string().uuid(),
  artifact_id: z.string().uuid(),
  node_type: z.string().max(100),
  node_kind: z.string().max(100).optional(),
  node_text: z.string().optional(),
  start_line: z.number().int().positive(),
  start_column: z.number().int().min(0),
  end_line: z.number().int().positive(),
  end_column: z.number().int().min(0),
  parent_id: z.string().uuid().optional(),
  depth_level: z.number().int().min(0).default(0),
  child_index: z.number().int().min(0).optional(),
  ast_grep_pattern: z.string().max(500).optional(),
  pattern_variables: z.record(z.unknown()).default({}),
  language: z.string().max(50),
  syntax_kind: z.string().max(100).optional(),
  node_structure: z.record(z.unknown()),
  semantic_role: z.string().max(100).optional(),
  scope_type: z.string().max(50).optional(),
  visibility: VisibilitySchema.default('private'),
  complexity_contribution: z.number().min(0).default(0),
  is_entry_point: z.boolean().default(false),
  is_test_code: z.boolean().default(false),
  created_at: z.date().default(() => new Date()),
});

/**
 * CST nodes table schema with validation
 */
export const CSTNodeSchema = BaseCSTNodeSchema.refine(
  (data) =>
    data.start_line <= data.end_line &&
    (data.start_line < data.end_line || data.start_column <= data.end_column),
  { message: 'Invalid position: start must be before or equal to end' }
);

export type CSTNode = z.infer<typeof CSTNodeSchema>;

// =============================================================================
// SEMANTIC INDEXING SCHEMAS
// =============================================================================

/**
 * Keyword categories
 */
export const KeywordCategorySchema = z.enum([
  'technical',
  'domain',
  'action',
  'quality',
  'performance',
  'security',
  'general',
]);

/**
 * Extraction methods
 */
export const ExtractionMethodSchema = z.enum(['automatic', 'manual', 'learned', 'inherited']);

/**
 * Artifact keywords table schema
 */
export const ArtifactKeywordSchema = z.object({
  id: z.string().uuid(),
  artifact_id: z.string().uuid(),
  keyword: z.string().max(100),
  score: z.number().min(0).max(1).default(0),
  category: KeywordCategorySchema.default('general'),
  extraction_method: ExtractionMethodSchema.default('automatic'),
  created_at: z.date().default(() => new Date()),
});

export type ArtifactKeyword = z.infer<typeof ArtifactKeywordSchema>;

/**
 * Artifact domains table schema
 */
export const ArtifactDomainSchema = z.object({
  id: z.string().uuid(),
  artifact_id: z.string().uuid(),
  domain: z.string().max(100),
  confidence: z.number().min(0).max(1).default(0),
  evidence: z.string().optional(),
  created_at: z.date().default(() => new Date()),
});

export type ArtifactDomain = z.infer<typeof ArtifactDomainSchema>;

// =============================================================================
// QUERY AND ANALYTICS SCHEMAS
// =============================================================================

/**
 * Query types
 */
export const QueryTypeSchema = z.enum([
  'semantic_search',
  'graph_traversal',
  'code_analysis',
  'pattern_search',
  'historical_analysis',
  'impact_analysis',
  'similarity_search',
]);

/**
 * Query intents
 */
export const QueryIntentSchema = z.enum([
  'explain',
  'find',
  'compare',
  'optimize',
  'debug',
  'history',
  'impact',
]);

/**
 * Query logs table schema
 */
export const QueryLogSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  query_text: z.string(),
  query_type: QueryTypeSchema,
  query_intent: QueryIntentSchema.optional(),
  parameters: z.record(z.unknown()).default({}),
  filters: z.record(z.unknown()).default({}),
  results_count: z.number().int().min(0).default(0),
  results_data: z.record(z.unknown()).optional(),
  execution_time_ms: z.number().int().positive(),
  cache_hit: z.boolean().default(false),
  user_id: z.string().max(255).optional(),
  user_role: z.string().max(50).optional(),
  user_satisfaction: z.number().int().min(1).max(5).optional(),
  result_relevance: z.number().min(0).max(1).optional(),
  created_at: z.date().default(() => new Date()),
});

export type QueryLog = z.infer<typeof QueryLogSchema>;

// =============================================================================
// SYSTEM SCHEMAS
// =============================================================================

/**
 * System config table schema
 */
export const SystemConfigSchema = z.object({
  key: z.string().max(255),
  value: z.record(z.unknown()),
  description: z.string().optional(),
  category: z.string().max(100).default('general'),
  is_sensitive: z.boolean().default(false),
  updated_at: z.date().default(() => new Date()),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

/**
 * Schema migrations table schema
 */
export const SchemaMigrationSchema = z.object({
  version: z.string().max(50),
  description: z.string(),
  applied_at: z.date().default(() => new Date()),
  rollback_sql: z.string().optional(),
});

export type SchemaMigration = z.infer<typeof SchemaMigrationSchema>;

// =============================================================================
// INPUT/OUTPUT SCHEMAS FOR API OPERATIONS
// =============================================================================

/**
 * Create artifact input schema (using base schema to avoid refinement issues)
 */
export const CreateArtifactSchema = BaseArtifactSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;

/**
 * Update artifact input schema
 */
export const UpdateArtifactSchema = BaseArtifactSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type UpdateArtifactInput = z.infer<typeof UpdateArtifactSchema>;

/**
 * Create graph edge input schema (using base schema to avoid refinement issues)
 */
export const CreateGraphEdgeSchema = BaseGraphEdgeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateGraphEdgeInput = z.infer<typeof CreateGraphEdgeSchema>;

/**
 * Search filters schema
 */
export const SearchFiltersSchema = z.object({
  types: z.array(ArtifactTypeSchema).optional(),
  languages: z.array(z.string()).optional(),
  repositories: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  date_range: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
  performance_impact: z.array(PerformanceImpactSchema).optional(),
  min_quality_score: z.number().min(0).max(1).optional(),
  min_complexity_score: z.number().min(0).optional(),
  has_embedding: z.boolean().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Semantic search input schema
 */
export const SemanticSearchSchema = z.object({
  query: z.string().min(1),
  embedding: z.array(z.number()).length(384).optional(),
  filters: SearchFiltersSchema.optional(),
  limit: z.number().int().positive().max(1000).default(50),
  threshold: z.number().min(0).max(1).default(0.3),
  include_metadata: z.boolean().default(true),
});

export type SemanticSearchInput = z.infer<typeof SemanticSearchSchema>;

/**
 * Graph traversal input schema
 */
export const GraphTraversalSchema = z.object({
  start_artifact_id: z.string().uuid(),
  relation_types: z.array(RelationTypeSchema).optional(),
  max_depth: z.number().int().positive().max(10).default(3),
  min_confidence: z.number().min(0).max(1).default(0.5),
  direction: z.enum(['outgoing', 'incoming', 'both']).default('outgoing'),
  limit: z.number().int().positive().max(1000).default(100),
});

export type GraphTraversalInput = z.infer<typeof GraphTraversalSchema>;

/**
 * Batch operation schemas
 */
export const BatchCreateArtifactsSchema = z.object({
  artifacts: z.array(CreateArtifactSchema).max(1000),
  skip_validation: z.boolean().default(false),
});

export type BatchCreateArtifactsInput = z.infer<typeof BatchCreateArtifactsSchema>;

export const BatchCreateEdgesSchema = z.object({
  edges: z.array(CreateGraphEdgeSchema).max(10000),
  skip_validation: z.boolean().default(false),
});

export type BatchCreateEdgesInput = z.infer<typeof BatchCreateEdgesSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  artifact: ArtifactSchema,
  score: z.number().min(0).max(1),
  match_type: z.enum(['semantic', 'keyword', 'exact', 'fuzzy']),
  explanation: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Graph traversal result schema
 */
export const GraphTraversalResultSchema = z.object({
  path: z.array(
    z.object({
      artifact: ArtifactSchema,
      edge: GraphEdgeSchema.optional(),
      depth: z.number().int().min(0),
    })
  ),
  total_paths: z.number().int().min(0),
  max_depth_reached: z.number().int().min(0),
});

export type GraphTraversalResult = z.infer<typeof GraphTraversalResultSchema>;

/**
 * Database operation result schema
 */
export const DatabaseOperationResultSchema = z.object({
  success: z.boolean(),
  affected_rows: z.number().int().min(0),
  execution_time_ms: z.number().int().min(0),
  error: z.string().optional(),
  data: z.unknown().optional(),
});

export type DatabaseOperationResult = z.infer<typeof DatabaseOperationResultSchema>;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate artifact data
 */
export function validateArtifact(data: unknown): Artifact {
  return ArtifactSchema.parse(data);
}

/**
 * Validate graph edge data
 */
export function validateGraphEdge(data: unknown): GraphEdge {
  return GraphEdgeSchema.parse(data);
}

/**
 * Validate search filters
 */
export function validateSearchFilters(data: unknown): SearchFilters {
  return SearchFiltersSchema.parse(data);
}

/**
 * Validate semantic search input
 */
export function validateSemanticSearch(data: unknown): SemanticSearchInput {
  return SemanticSearchSchema.parse(data);
}

/**
 * Validate graph traversal input
 */
export function validateGraphTraversal(data: unknown): GraphTraversalInput {
  return GraphTraversalSchema.parse(data);
}

/**
 * Safe parse with error handling
 */
export function safeParseSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
