/**
 * Telemetry system type definitions for Carmack Coder
 * Provides comprehensive observability into transformation effectiveness and performance
 */

import { z } from 'zod';

// Core telemetry event base schema
export const TelemetryEventBaseSchema = z.object({
  /** Unique event identifier for tracing */
  eventId: z.string().uuid(),
  /** Event timestamp in Unix milliseconds */
  timestamp: z.number().int().positive(),
  /** Session ID for grouping related events */
  sessionId: z.string().uuid(),
  /** Optional user ID (anonymized hash) */
  userId: z.string().optional(),
  /** Event version for schema evolution */
  version: z.string().default('1.0.0'),
});

export type TelemetryEventBase = z.infer<typeof TelemetryEventBaseSchema>;

// Transformation mode enum
export const TransformationModeSchema = z.enum(['template', 'ast', 'llm']);
export type TransformationMode = z.infer<typeof TransformationModeSchema>;

/**
 * TEL-001: Pattern Success Rate Metric
 * Measures the percentage of successful pattern applications
 * Critical for understanding pattern quality and reliability
 */
export const PatternSuccessMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-001'),
  /** Pattern identifier from patterns.json */
  patternId: z.string(),
  /** Number of successful applications in this measurement window */
  successCount: z.number().int().min(0),
  /** Number of failed applications in this measurement window */
  failureCount: z.number().int().min(0),
  /** Calculated success rate (successCount / (successCount + failureCount)) */
  successRate: z.number().min(0).max(1),
  /** Transformation mode when pattern was applied */
  mode: TransformationModeSchema,
  /** Target file path (for correlation analysis) */
  filePath: z.string(),
  /** Error details if pattern failed */
  errorReason: z.string().optional(),
});

export type PatternSuccessMetric = z.infer<typeof PatternSuccessMetricSchema>;

/**
 * TEL-002: Semantic Correctness Score
 * Validates that transformations preserve program semantics using Dafny verification
 * Essential for ensuring transformation safety
 */
export const SemanticCorrectnessMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-002'),
  /** SHA-256 hash of file content for correlation */
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
  /** Whether the file was semantically correct before transformation */
  preTransformCorrectness: z.boolean(),
  /** Whether the file is semantically correct after transformation */
  postTransformCorrectness: z.boolean(),
  /** Time spent on Dafny verification in milliseconds */
  dafnyVerificationTime: z.number().int().min(0),
  /** List of program invariants that were preserved */
  invariantsPreserved: z.array(z.string()),
  /** List of program invariants that were broken (critical issue) */
  invariantsBroken: z.array(z.string()),
  /** Verification conditions checked */
  verificationConditions: z.number().int().min(0),
  /** Verification method used */
  verificationMethod: z.enum(['dafny', 'static-analysis', 'type-check']),
});

export type SemanticCorrectnessMetric = z.infer<typeof SemanticCorrectnessMetricSchema>;

/**
 * Quality metrics structure for before/after comparison
 */
export const QualityMetricsSchema = z.object({
  /** Cyclomatic complexity (McCabe) */
  cyclomaticComplexity: z.number().min(0),
  /** Cognitive complexity (human understanding) */
  cognitiveComplexity: z.number().min(0),
  /** Maintainability index (0-100) */
  maintainabilityIndex: z.number().min(0).max(100),
  /** Code duplication ratio (0-1) */
  duplicationRatio: z.number().min(0).max(1),
  /** Lines of code count */
  linesOfCode: z.number().int().min(0),
  /** Number of functions/methods */
  functionCount: z.number().int().min(0),
  /** Maximum nesting depth */
  nestingDepth: z.number().int().min(0),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

/**
 * TEL-003: Code Quality Delta
 * Measures before/after code quality using multiple dimensions
 * Quantifies actual improvement in maintainability and readability
 */
export const CodeQualityDeltaSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-003'),
  /** File identifier for tracking */
  fileId: z.string(),
  /** Quality metrics before transformation */
  before: QualityMetricsSchema,
  /** Quality metrics after transformation */
  after: QualityMetricsSchema,
  /** Calculated improvement values (positive = better) */
  improvement: z.object({
    cyclomaticComplexity: z.number(), // negative = improvement
    cognitiveComplexity: z.number(), // negative = improvement
    maintainabilityIndex: z.number(), // positive = improvement
    duplicationRatio: z.number(), // negative = improvement
  }),
  /** Overall quality score change (-1 to 1, positive = improvement) */
  overallQualityDelta: z.number().min(-1).max(1),
});

export type CodeQualityDelta = z.infer<typeof CodeQualityDeltaSchema>;

/**
 * Pipeline stage timing for detailed performance analysis
 */
export const PipelineStagesSchema = z.object({
  /** Time to parse source code into AST */
  parsing: z.number().min(0),
  /** Time to match patterns against AST */
  patternMatching: z.number().min(0),
  /** Time to apply transformations */
  transformation: z.number().min(0),
  /** Time to validate transformed code */
  validation: z.number().min(0),
  /** Time to serialize result back to text */
  serialization: z.number().min(0),
});

export type PipelineStages = z.infer<typeof PipelineStagesSchema>;

/**
 * TEL-004: Transformation Latency Distribution
 * Tracks end-to-end transformation times across different modes and file sizes
 * Critical for user experience optimization
 */
export const LatencyMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-004'),
  /** Unique transformation instance identifier */
  transformationId: z.string().uuid(),
  /** Transformation mode used */
  mode: TransformationModeSchema,
  /** Input file size in bytes */
  fileSizeBytes: z.number().int().min(0),
  /** Detailed timing breakdown by pipeline stage */
  pipelineStages: PipelineStagesSchema,
  /** Total end-to-end latency in milliseconds */
  totalLatency: z.number().min(0),
  /** Percentile bucket this measurement falls into */
  percentile: z.enum(['p50', 'p95', 'p99']),
  /** Number of patterns applied during transformation */
  patternsApplied: z.number().int().min(0),
  /** Whether this was a cache hit or cold execution */
  cacheHit: z.boolean(),
});

export type LatencyMetric = z.infer<typeof LatencyMetricSchema>;

/**
 * Memory usage timeline point
 */
export const MemoryTimelinePointSchema = z.object({
  /** Timestamp of this measurement */
  timestamp: z.number().int().positive(),
  /** Heap memory used in bytes */
  heapUsed: z.number().int().min(0),
  /** Total heap memory allocated in bytes */
  heapTotal: z.number().int().min(0),
  /** External memory (C++ objects) in bytes */
  external: z.number().int().min(0),
  /** Resident set size in bytes */
  rss: z.number().int().min(0),
});

/**
 * TEL-005: Memory Usage Profile
 * Tracks memory consumption during AST processing
 * Prevents system instability during large file processing
 */
export const MemoryProfileMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-005'),
  /** Process identifier for this measurement session */
  processId: z.string(),
  /** Memory usage timeline during transformation */
  timeline: z.array(MemoryTimelinePointSchema),
  /** Maximum memory usage reached in bytes */
  peakMemory: z.number().int().min(0),
  /** Rate of memory growth in bytes/second */
  memoryGrowthRate: z.number(),
  /** Whether garbage collection was triggered */
  gcTriggered: z.boolean(),
  /** Time spent in garbage collection in milliseconds */
  gcTime: z.number().min(0),
});

export type MemoryProfileMetric = z.infer<typeof MemoryProfileMetricSchema>;

/**
 * TEL-006: AST Parse Cache Effectiveness
 * Measures cache hit rates for AST parsing operations
 * Critical for repeat transformation performance
 */
export const CacheEfficiencyMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-006'),
  /** Type of cache being measured */
  cacheType: z.enum(['ast-parse', 'pattern-match', 'verification', 'quality-analysis']),
  /** Cache hit rate (0-1) */
  hitRate: z.number().min(0).max(1),
  /** Cache miss rate (0-1) */
  missRate: z.number().min(0).max(1),
  /** Cache eviction rate (0-1) */
  evictionRate: z.number().min(0).max(1),
  /** Average cache lookup time in microseconds */
  averageLookupTime: z.number().min(0),
  /** Current cache size in entries */
  cacheSize: z.number().int().min(0),
  /** Cache memory usage in bytes */
  cacheMemoryUsage: z.number().int().min(0),
  /** Cache effectiveness score (custom metric) */
  effectivenessScore: z.number().min(0).max(1),
});

export type CacheEfficiencyMetric = z.infer<typeof CacheEfficiencyMetricSchema>;

/**
 * User action sequence item for behavior analysis
 */
export const UserActionSchema = z.object({
  /** Mode selected by user */
  mode: TransformationModeSchema,
  /** File type being transformed */
  fileType: z.string(),
  /** Calculated complexity of the file */
  complexity: z.number().min(0),
  /** Outcome of this action */
  outcome: z.enum(['success', 'failure', 'cancelled']),
  /** Timestamp of this action */
  timestamp: z.number().int().positive(),
  /** Time spent on this action in milliseconds */
  duration: z.number().min(0),
});

/**
 * TEL-007: Mode Selection Patterns
 * Understands when users choose template vs AST vs LLM modes
 * Reveals user preferences and potential UX improvements
 */
export const ModeSelectionMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-007'),
  /** Sequence of user actions in this session */
  sequence: z.array(UserActionSchema),
  /** Detected usage patterns */
  patterns: z.array(z.string()),
  /** Session duration in milliseconds */
  sessionDuration: z.number().min(0),
  /** Total number of mode switches */
  modeSwitches: z.number().int().min(0),
  /** Most frequently used mode in this session */
  dominantMode: TransformationModeSchema,
  /** User satisfaction indicator (if available) */
  satisfactionScore: z.number().min(1).max(5).optional(),
});

export type ModeSelectionMetric = z.infer<typeof ModeSelectionMetricSchema>;

/**
 * User recovery action for error analysis
 */
export const RecoveryActionSchema = z.object({
  /** Action taken by user in response to error */
  action: z.enum(['retry', 'mode-switch', 'manual-fix', 'abandon']),
  /** Timestamp of this recovery action */
  timestamp: z.number().int().positive(),
  /** Whether this recovery action was successful */
  success: z.boolean(),
  /** New mode selected (if mode-switch) */
  newMode: TransformationModeSchema.optional(),
});

/**
 * TEL-008: Error Recovery Patterns
 * Tracks how users respond to transformation failures
 * Critical for improving error handling and UX design
 */
export const ErrorRecoveryMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-008'),
  /** Type of error encountered */
  errorType: z.string(),
  /** Specific error code */
  errorCode: z.string(),
  /** Error message shown to user */
  errorMessage: z.string(),
  /** Sequence of user recovery actions */
  userActions: z.array(RecoveryActionSchema),
  /** Total time spent on error resolution in milliseconds */
  resolutionTime: z.number().min(0),
  /** Final outcome of the error scenario */
  finalOutcome: z.enum(['resolved', 'abandoned']),
  /** Error severity level */
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export type ErrorRecoveryMetric = z.infer<typeof ErrorRecoveryMetricSchema>;

/**
 * Productivity measurement structure
 */
export const ProductivityMeasurementSchema = z.object({
  /** Number of lines transformed */
  linesTransformed: z.number().int().min(0),
  /** Estimated time for manual transformation in minutes */
  manualTimeEstimate: z.number().min(0),
  /** Actual time used with Carmack Coder in minutes */
  actualTimeUsed: z.number().min(0),
  /** Calculated time saved in minutes */
  timeSaved: z.number(),
  /** Quality improvement score (0-1) */
  qualityImprovement: z.number().min(0).max(1),
  /** Number of potential errors prevented */
  errorsPrevented: z.number().int().min(0),
});

/**
 * TEL-009: Developer Productivity Index
 * Quantifies actual time savings from using Carmack Coder
 * Essential for ROI measurement and value demonstration
 */
export const ProductivityMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-009'),
  /** Timeframe for this productivity measurement */
  timeframe: z.enum(['daily', 'weekly', 'monthly']),
  /** Detailed productivity metrics */
  metrics: ProductivityMeasurementSchema,
  /** Project context information */
  projectContext: z.object({
    projectSize: z.enum(['small', 'medium', 'large', 'enterprise']),
    teamSize: z.number().int().min(1),
    codebaseAge: z.enum(['new', 'mature', 'legacy']),
  }),
  /** Productivity trend compared to previous period */
  trend: z.enum(['improving', 'stable', 'declining']),
});

export type ProductivityMetric = z.infer<typeof ProductivityMetricSchema>;

/**
 * Pattern lifecycle stage tracking
 */
export const PatternLifecycleSchema = z.object({
  /** When pattern was introduced */
  introduced: z.number().int().positive(),
  /** When pattern first succeeded */
  firstSuccess: z.number().int().positive().optional(),
  /** When pattern reached widespread adoption (>50% success rate) */
  widespreadAdoption: z.number().int().positive().optional(),
  /** When pattern reached maturity (>95% success rate) */
  maturity: z.number().int().positive().optional(),
  /** When pattern was deprecated (if applicable) */
  deprecated: z.number().int().positive().optional(),
});

/**
 * User feedback on pattern effectiveness
 */
export const PatternFeedbackSchema = z.object({
  /** User rating (1-5 stars) */
  rating: z.number().int().min(1).max(5),
  /** Optional user comment */
  comment: z.string().optional(),
  /** Feedback timestamp */
  timestamp: z.number().int().positive(),
  /** Feedback context */
  context: z.enum(['post-transformation', 'survey', 'support-ticket']),
});

/**
 * TEL-010: Pattern Adoption Lifecycle
 * Tracks how patterns evolve from experimental to stable
 * Guides pattern investment decisions and roadmap planning
 */
export const PatternAdoptionMetricSchema = TelemetryEventBaseSchema.extend({
  id: z.literal('TEL-010'),
  /** Pattern identifier being tracked */
  patternId: z.string(),
  /** Lifecycle stage information */
  lifecycle: PatternLifecycleSchema,
  /** Current adoption rate (% of eligible files transformed) */
  adoptionRate: z.number().min(0).max(1),
  /** User feedback collection */
  userFeedback: z.array(PatternFeedbackSchema),
  /** Pattern effectiveness trend */
  effectivenessTrend: z.enum(['improving', 'stable', 'declining']),
  /** Competitive analysis vs alternative patterns */
  competitivePosition: z.enum(['leading', 'competitive', 'lagging']),
});

export type PatternAdoptionMetric = z.infer<typeof PatternAdoptionMetricSchema>;

// Union type for all telemetry metrics
export type TelemetryMetric =
  | PatternSuccessMetric
  | SemanticCorrectnessMetric
  | CodeQualityDelta
  | LatencyMetric
  | MemoryProfileMetric
  | CacheEfficiencyMetric
  | ModeSelectionMetric
  | ErrorRecoveryMetric
  | ProductivityMetric
  | PatternAdoptionMetric;

// Telemetry event validation
export const TelemetryMetricSchema = z.discriminatedUnion('id', [
  PatternSuccessMetricSchema,
  SemanticCorrectnessMetricSchema,
  CodeQualityDeltaSchema,
  LatencyMetricSchema,
  MemoryProfileMetricSchema,
  CacheEfficiencyMetricSchema,
  ModeSelectionMetricSchema,
  ErrorRecoveryMetricSchema,
  ProductivityMetricSchema,
  PatternAdoptionMetricSchema,
]);

/**
 * Telemetry configuration schema
 */
export const TelemetryConfigSchema = z.object({
  /** Whether telemetry collection is enabled */
  enabled: z.boolean().default(true),
  /** Sample rate for performance metrics (0-1) */
  performanceSampleRate: z.number().min(0).max(1).default(0.1),
  /** Sample rate for user behavior metrics (0-1) */
  behaviorSampleRate: z.number().min(0).max(1).default(1.0),
  /** Batch size for event collection */
  batchSize: z.number().int().min(1).max(1000).default(100),
  /** Flush interval in milliseconds */
  flushInterval: z.number().int().min(100).max(60000).default(5000),
  /** Maximum events to buffer before forced flush */
  maxBufferSize: z.number().int().min(100).max(10000).default(1000),
  /** Privacy settings */
  privacy: z.object({
    /** Whether to collect user identifiers */
    collectUserIds: z.boolean().default(false),
    /** Whether to collect file paths */
    collectFilePaths: z.boolean().default(true),
    /** Data retention period in days */
    retentionDays: z.number().int().min(1).max(365).default(90),
  }),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
