/**
 * API Contracts for TensorRT-LLM Knowledge Graph Query Engine
 *
 * Type-safe API contracts for the EPIC-GRAPH-QUERY-ENGINE.
 * Defines all endpoints, request/response schemas, and error handling.
 */

import { z } from 'zod';

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/**
 * Query intent classification
 */
export const QueryIntentSchema = z.enum([
  'technical_question',
  'historical_analysis', 
  'performance_investigation',
  'code_understanding',
  'architecture_exploration',
  'debugging_assistance',
  'optimization_advice',
  'pattern_discovery'
]);

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

/**
 * Query complexity levels
 */
export const QueryComplexitySchema = z.enum(['simple', 'moderate', 'complex', 'expert']);

export type QueryComplexity = z.infer<typeof QueryComplexitySchema>;

/**
 * Evidence chain item
 */
export const EvidenceItemSchema = z.object({
  artifact_id: z.string().uuid(),
  artifact_name: z.string(),
  artifact_type: z.string(),
  relevance_score: z.number().min(0).max(1),
  explanation: z.string(),
  file_path: z.string().optional(),
  line_range: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
  content_snippet: z.string().optional(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/**
 * Hypothesis with confidence scoring
 */
export const HypothesisSchema = z.object({
  id: z.string().uuid(),
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  evidence_items: z.array(EvidenceItemSchema),
  supporting_relationships: z.array(z.string().uuid()),
  generated_at: z.date(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

/**
 * Investigation thread for multi-turn queries
 */
export const InvestigationThreadSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'completed', 'abandoned']),
  hypotheses: z.array(HypothesisSchema),
  follow_up_questions: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date(),
});

export type InvestigationThread = z.infer<typeof InvestigationThreadSchema>;

// =============================================================================
// REQUEST/RESPONSE SCHEMAS
// =============================================================================

/**
 * Initial query request
 */
export const QueryRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  context: z.object({
    repository_url: z.string().url().optional(),
    file_paths: z.array(z.string()).optional(),
    language_hint: z.string().optional(),
    domain_hint: z.string().optional(),
  }).optional(),
  options: z.object({
    max_results: z.number().min(1).max(100).default(20),
    include_code_snippets: z.boolean().default(true),
    enable_multi_turn: z.boolean().default(true),
    complexity_preference: QueryComplexitySchema.default('moderate'),
    search_depth: z.number().min(1).max(5).default(3),
  }).optional(),
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;

/**
 * Query response with results and investigation threads
 */
export const QueryResponseSchema = z.object({
  query_id: z.string().uuid(),
  session_id: z.string().uuid(),
  intent: QueryIntentSchema,
  complexity: QueryComplexitySchema,
  
  // Primary results
  primary_answer: z.string(),
  evidence_chain: z.array(EvidenceItemSchema),
  confidence_score: z.number().min(0).max(1),
  
  // Investigation threads for follow-up
  investigation_threads: z.array(InvestigationThreadSchema),
  suggested_questions: z.array(z.string()),
  
  // Metadata
  execution_time_ms: z.number(),
  artifacts_searched: z.number(),
  relationships_traversed: z.number(),
  
  // Session context for multi-turn
  session_context: z.record(z.unknown()),
  
  created_at: z.date(),
});

export type QueryResponse = z.infer<typeof QueryResponseSchema>;

/**
 * Multi-turn continuation request
 */
export const ContinueQueryRequestSchema = z.object({
  follow_up_query: z.string().min(1).max(2000),
  thread_id: z.string().uuid().optional(),
  focus_artifacts: z.array(z.string().uuid()).optional(),
  investigation_direction: z.enum([
    'deeper_analysis',
    'broader_context', 
    'related_patterns',
    'historical_evolution',
    'performance_impact'
  ]).optional(),
});

export type ContinueQueryRequest = z.infer<typeof ContinueQueryRequestSchema>;

/**
 * Session information
 */
export const SessionInfoSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  user_id: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']),
  investigation_goal: z.string().optional(),
  total_queries: z.number(),
  successful_queries: z.number(),
  active_threads: z.array(InvestigationThreadSchema),
  context: z.record(z.unknown()),
  started_at: z.date(),
  last_activity_at: z.date(),
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;

/**
 * Search request for direct search functionality
 */
export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  search_type: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
  filters: z.object({
    artifact_types: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    repositories: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
    min_quality_score: z.number().min(0).max(1).optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(20),
  include_relationships: z.boolean().default(false),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Search response
 */
export const SearchResponseSchema = z.object({
  results: z.array(z.object({
    artifact: z.object({
      id: z.string().uuid(),
      type: z.string(),
      name: z.string(),
      description: z.string().optional(),
      file_path: z.string().optional(),
      content_snippet: z.string().optional(),
      metadata: z.record(z.unknown()),
    }),
    score: z.number().min(0).max(1),
    match_type: z.enum(['semantic', 'keyword', 'exact', 'fuzzy']),
    explanation: z.string().optional(),
    relationships: z.array(z.object({
      target_id: z.string().uuid(),
      relation_type: z.string(),
      confidence: z.number().min(0).max(1),
    })).optional(),
  })),
  total_count: z.number(),
  execution_time_ms: z.number(),
  search_metadata: z.record(z.unknown()),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/**
 * Graph traversal request
 */
export const GraphTraversalRequestSchema = z.object({
  start_artifact_id: z.string().uuid(),
  relation_types: z.array(z.string()).optional(),
  max_depth: z.number().min(1).max(10).default(3),
  min_confidence: z.number().min(0).max(1).default(0.5),
  direction: z.enum(['outgoing', 'incoming', 'both']).default('outgoing'),
  limit: z.number().min(1).max(1000).default(100),
});

export type GraphTraversalRequest = z.infer<typeof GraphTraversalRequestSchema>;

/**
 * Graph traversal response
 */
export const GraphTraversalResponseSchema = z.object({
  paths: z.array(z.object({
    artifacts: z.array(z.object({
      artifact: z.record(z.unknown()),
      depth: z.number(),
      relationship: z.record(z.unknown()).optional(),
    })),
    total_confidence: z.number(),
    path_length: z.number(),
  })),
  total_paths: z.number(),
  max_depth_reached: z.number(),
  execution_time_ms: z.number(),
});

export type GraphTraversalResponse = z.infer<typeof GraphTraversalResponseSchema>;

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  request_id: z.string().uuid().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Health check response
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  components: z.record(z.object({
    status: z.enum(['up', 'down', 'degraded']),
    latency_ms: z.number().optional(),
    error: z.string().optional(),
  })),
  version: z.string(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * System metrics response
 */
export const SystemMetricsResponseSchema = z.object({
  query_stats: z.object({
    total_queries: z.number(),
    avg_response_time_ms: z.number(),
    success_rate: z.number(),
    cache_hit_rate: z.number(),
  }),
  database_stats: z.object({
    total_artifacts: z.number(),
    total_relationships: z.number(),
    avg_query_time_ms: z.number(),
  }),
  session_stats: z.object({
    active_sessions: z.number(),
    avg_session_duration_ms: z.number(),
    avg_queries_per_session: z.number(),
  }),
  timestamp: z.date(),
});

export type SystemMetricsResponse = z.infer<typeof SystemMetricsResponseSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate query request
 */
export const validateQueryRequest = (data: unknown): QueryRequest => {
  return QueryRequestSchema.parse(data);
};

/**
 * Validate continue query request
 */
export const validateContinueQueryRequest = (data: unknown): ContinueQueryRequest => {
  return ContinueQueryRequestSchema.parse(data);
};

/**
 * Validate search request
 */
export const validateSearchRequest = (data: unknown): SearchRequest => {
  return SearchRequestSchema.parse(data);
};

/**
 * Validate graph traversal request
 */
export const validateGraphTraversalRequest = (data: unknown): GraphTraversalRequest => {
  return GraphTraversalRequestSchema.parse(data);
};

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
  } else {
    return { success: false, error: result.error };
  }
}

// =============================================================================
// API ENDPOINT DEFINITIONS
// =============================================================================

/**
 * API endpoint definitions for type safety
 */
export const API_ENDPOINTS = {
  // Query endpoints
  QUERY: '/api/query',
  CONTINUE_QUERY: '/api/query/:queryId/continue',
  GET_QUERY: '/api/query/:queryId',
  
  // Session endpoints
  CREATE_SESSION: '/api/sessions',
  GET_SESSION: '/api/sessions/:sessionId',
  UPDATE_SESSION: '/api/sessions/:sessionId',
  LIST_SESSIONS: '/api/sessions',
  
  // Search endpoints
  SEARCH: '/api/search',
  SIMILARITY_SEARCH: '/api/search/similarity',
  
  // Graph endpoints
  TRAVERSE_GRAPH: '/api/graph/traverse',
  
  // System endpoints
  HEALTH: '/api/health',
  METRICS: '/api/metrics',
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];