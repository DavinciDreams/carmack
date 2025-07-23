import { z } from 'zod';

// Base schemas for validation
export const FilePathSchema = z.string().min(1);
export const GitHashSchema = z.string().regex(/^[a-f0-9]{40}$/);
export const TimestampSchema = z.number().int().positive();

// Transformation types
export const TransformationModeSchema = z.enum(['template', 'ast', 'llm']);
export const TransformationStatusSchema = z.enum([
  'pending',
  'analyzing',
  'applying',
  'validating',
  'completed',
  'failed',
  'rolled_back',
]);

// Complexity metrics
export const ComplexityMetricsSchema = z.object({
  cyclomaticComplexity: z.number().int().min(0),
  cognitiveComplexity: z.number().int().min(0),
  linesOfCode: z.number().int().min(0),
  nestingDepth: z.number().int().min(0),
  functionCount: z.number().int().min(0),
  classCount: z.number().int().min(0),
});

// AST pattern schema with enhanced language support
export const AstPatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript', 'cpp', 'c']),
  pattern: z.string(),
  replacement: z.string(),
  description: z.string(),
  complexity: z.number().int().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  mode: TransformationModeSchema.optional().default('template'), // Default to template mode for backward compatibility
  // Enhanced metadata for C++ patterns
  category: z.string().optional(),
  performance: z
    .object({
      priority: z.number().min(1).max(10).default(5),
      batchable: z.boolean().default(true),
      conflicts: z.array(z.string()).optional(),
      maxMatches: z.number().optional(),
    })
    .optional(),
  // Formal verification support
  verification: z
    .object({
      dafnySpec: z.string().optional(),
      invariants: z.array(z.string()).optional(),
      preconditions: z.array(z.string()).optional(),
      postconditions: z.array(z.string()).optional(),
    })
    .optional(),
  // Test cases for validation
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expected: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

// Error handling
export const ErrorInfoSchema = z.object({
  code: z.string(),
  message: z.string(),
  file: FilePathSchema.optional(),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
  severity: z.enum(['error', 'warning', 'info']),
});

// Validation results
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ErrorInfoSchema),
  warnings: z.array(ErrorInfoSchema),
  fixableIssues: z.number().int().min(0),
});

// Git checkpoint
export const GitCheckpointSchema = z.object({
  hash: GitHashSchema,
  branch: z.string(),
  timestamp: TimestampSchema,
  description: z.string(),
});

// Transformation request
export const TransformationRequestSchema = z.object({
  targetFiles: z.array(FilePathSchema),
  transformationType: TransformationModeSchema,
  patterns: z.array(AstPatternSchema).optional(),
  prompt: z.string().optional(),
  maxComplexity: z.number().int().min(1).default(10),
  dryRun: z.boolean().default(false),
});

// Transformation result
export const TransformationResultSchema = z.object({
  id: z.string().uuid(),
  request: TransformationRequestSchema,
  status: TransformationStatusSchema,
  mode: TransformationModeSchema,
  startTime: TimestampSchema,
  endTime: TimestampSchema.optional(),
  checkpoint: GitCheckpointSchema.optional(),
  complexity: ComplexityMetricsSchema.optional(),
  validation: ValidationResultSchema.optional(),
  filesModified: z.array(FilePathSchema),
  summary: z.string().optional(),
  errors: z.array(ErrorInfoSchema),
});

// Context for state machine
export const MachineContextSchema = z.object({
  currentTransformation: TransformationResultSchema.optional(),
  activeFiles: z.array(FilePathSchema),
  checkpoints: z.array(GitCheckpointSchema),
  patterns: z.array(AstPatternSchema),
  maxRetries: z.number().int().min(0).default(3),
  currentRetries: z.number().int().min(0).default(0),
  startTime: z.number().optional(),
  timeoutMs: z.number().int().min(1000).default(300000), // 5 minute default timeout
  config: z.object({
    maxComplexityThreshold: z.number().int().min(1).default(15),
    enableDafnyVerification: z.boolean().default(true),
    enableLearning: z.boolean().default(true),
    gitIntegration: z.boolean().default(true),
  }),
});

// Events for state machine
export const MachineEventSchema = z.union([
  z.object({
    type: z.literal('START_TRANSFORMATION'),
    request: TransformationRequestSchema,
  }),
  z.object({
    type: z.literal('ANALYSIS_COMPLETE'),
    complexity: ComplexityMetricsSchema,
    recommendedMode: TransformationModeSchema,
  }),
  z.object({
    type: z.literal('TRANSFORMATION_APPLIED'),
    filesModified: z.array(FilePathSchema),
  }),
  z.object({
    type: z.literal('VALIDATION_COMPLETE'),
    result: ValidationResultSchema,
  }),
  z.object({
    type: z.literal('ERROR_OCCURRED'),
    error: ErrorInfoSchema,
  }),
  z.object({
    type: z.literal('RETRY'),
  }),
  z.object({
    type: z.literal('ROLLBACK'),
  }),
  z.object({
    type: z.literal('COMPLETE'),
  }),
]);

// Standardized Actor Result Interfaces for Production Pipeline
export const ActorResultBaseSchema = z.object({
  success: z.boolean(),
  mode: z.enum(['template', 'ast-grep', 'llm']),
  executionTime: z.number().optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

// Template Engine Actor Result
export const TemplateEngineResultSchema = ActorResultBaseSchema.extend({
  mode: z.literal('template'),
  filesModified: z.array(z.string()),
  transformationsApplied: z.number(),
  appliedPatterns: z.array(
    z.object({
      file: z.string(),
      pattern: z.string(),
      count: z.number(),
    })
  ),
});

// AST-grep Transformation Actor Result
export const AstGrepResultSchema = ActorResultBaseSchema.extend({
  mode: z.literal('ast-grep'),
  filesModified: z.array(z.string()),
  transformationsApplied: z.number(),
  appliedPatterns: z.array(
    z.object({
      file: z.string(),
      pattern: z.string(),
      count: z.number(),
    })
  ),
});

// LLM Transformation Actor Result
export const LLMTransformationResultSchema = ActorResultBaseSchema.extend({
  mode: z.literal('llm'),
  filesModified: z.array(z.string()),
  transformationsApplied: z.number(),
  totalTokensUsed: z.number().optional(),
  averageConfidence: z.number().optional(),
});

// Pattern Discovery Actor Result
export const PatternDiscoveryResultSchema = z.object({
  operation: z.enum(['discover', 'analyze', 'generate', 'validate']),
  patterns: z.array(z.any()), // DiscoveredPattern array
  summary: z.object({
    totalAnalyzed: z.number(),
    patternsDiscovered: z.number(),
    averageConfidence: z.number(),
    categories: z.array(z.string()),
  }),
  timestamp: z.string(),
});

// Pattern Learning Actor Result
export const PatternLearningResultSchema = z.object({
  newPatterns: z.array(z.any()), // LearnedPattern array
  optimizedPatterns: z.array(z.any()), // LearnedPattern array
  deprecatedPatterns: z.array(z.string()), // pattern IDs
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  metrics: z.object({
    patternsDiscovered: z.number(),
    patternsOptimized: z.number(),
    averageConfidence: z.number(),
    learningTime: z.number(),
  }),
});

// Validation Actor Result
export const ValidationActorResultSchema = z.object({
  type: z.enum(['types', 'format', 'quality', 'formatFix']),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  success: z.boolean(),
});

// LLM Testing Framework Actor Result
export const LLMTestingResultSchema = z.object({
  suiteResults: z
    .array(
      z.object({
        passed: z.boolean(),
        description: z.string(),
        error: z.string().optional(),
      })
    )
    .optional(),
  summary: z
    .object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
      duration: z.number(),
      suites: z.number(),
    })
    .optional(),
  timestamp: z.string().optional(),
});

// Feedback Loop Actor Result
export const FeedbackLoopResultSchema = z.object({
  operation: z.enum(['collect', 'analyze', 'optimize']),
  feedbackProcessed: z.number(),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  optimizationResults: z.any().optional(),
});

// Type exports from schemas
export type FilePath = z.infer<typeof FilePathSchema>;
export type GitHash = z.infer<typeof GitHashSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type TransformationMode = z.infer<typeof TransformationModeSchema>;
export type TransformationStatus = z.infer<typeof TransformationStatusSchema>;
export type ComplexityMetrics = z.infer<typeof ComplexityMetricsSchema>;
export type AstPattern = z.infer<typeof AstPatternSchema>;
export type ErrorInfo = z.infer<typeof ErrorInfoSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type GitCheckpoint = z.infer<typeof GitCheckpointSchema>;
export type TransformationRequest = z.infer<typeof TransformationRequestSchema>;
export type TransformationResult = z.infer<typeof TransformationResultSchema>;
export type MachineContext = z.infer<typeof MachineContextSchema>;
export type MachineEvent = z.infer<typeof MachineEventSchema>;

// Actor Result Types
export type ActorResultBase = z.infer<typeof ActorResultBaseSchema>;
export type TemplateEngineResult = z.infer<typeof TemplateEngineResultSchema>;
export type AstGrepResult = z.infer<typeof AstGrepResultSchema>;
export type LLMTransformationResult = z.infer<typeof LLMTransformationResultSchema>;
export type PatternDiscoveryResult = z.infer<typeof PatternDiscoveryResultSchema>;
export type PatternLearningResult = z.infer<typeof PatternLearningResultSchema>;
export type ValidationActorResult = z.infer<typeof ValidationActorResultSchema>;
export type LLMTestingResult = z.infer<typeof LLMTestingResultSchema>;
export type FeedbackLoopResult = z.infer<typeof FeedbackLoopResultSchema>;

// =============================================================================
// ENHANCED TRANSFORMATION SCHEMAS
// =============================================================================

// Enhanced transformation context schema
export const EnhancedTransformationContextSchema = z.object({
  // Project context
  projectType: z.string().default('typescript'),
  framework: z.string().optional(),
  dependencies: z.array(z.string()).default([]),

  // Code analysis context
  complexity: ComplexityMetricsSchema.optional(),
  patterns: z.array(AstPatternSchema).default([]),
  codebaseSize: z.number().default(0),

  // Multi-file context
  relatedFiles: z.array(z.string()).default([]),
  dependencyGraph: z.record(z.array(z.string())).default({}),
  importMap: z.record(z.array(z.string())).default({}),

  // Transformation history
  previousTransformations: z
    .array(
      z.object({
        id: z.string(),
        type: TransformationModeSchema,
        timestamp: TimestampSchema,
        success: z.boolean(),
        patterns: z.array(z.string()),
      })
    )
    .default([]),

  // Quality metrics
  qualityScore: z.number().min(0).max(1).optional(),
  testCoverage: z.number().min(0).max(1).optional(),

  // User preferences
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  preserveFormatting: z.boolean().default(true),
});

// Enhanced transformation request schema
export const EnhancedTransformationRequestSchema = z.object({
  // Basic transformation info
  targetFiles: z.array(FilePathSchema),
  transformationType: z.enum(['template', 'ast', 'llm', 'hybrid', 'auto']).default('auto'),

  // Enhanced prompt and context
  prompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  examples: z
    .array(
      z.object({
        before: z.string(),
        after: z.string(),
        explanation: z.string(),
      })
    )
    .default([]),

  // Advanced options
  maxComplexity: z.number().int().min(1).default(15),
  dryRun: z.boolean().default(false),
  incrementalMode: z.boolean().default(false),
  rollbackOnFailure: z.boolean().default(true),

  // Multi-stage transformation
  stages: z
    .array(
      z.object({
        type: TransformationModeSchema,
        patterns: z.array(AstPatternSchema).optional(),
        prompt: z.string().optional(),
        condition: z.string().optional(), // JavaScript expression for conditional execution
      })
    )
    .optional(),

  // Context and constraints
  context: EnhancedTransformationContextSchema.optional(),
  constraints: z
    .object({
      maxExecutionTime: z.number().default(300000), // 5 minutes
      maxMemoryUsage: z.number().default(512 * 1024 * 1024), // 512MB
      maxTokens: z.number().default(8000),
      costLimit: z.number().default(1.0), // $1 limit
    })
    .default({}),
});

// Enhanced transformation result schema
export const EnhancedTransformationResultSchema = z.object({
  // Basic result info
  id: z.string().uuid(),
  request: EnhancedTransformationRequestSchema,
  status: TransformationStatusSchema,
  mode: z.enum(['template', 'ast', 'llm', 'hybrid']),

  // Timing and performance
  startTime: TimestampSchema,
  endTime: TimestampSchema.optional(),
  executionTime: z.number().optional(),
  stageTimings: z.record(z.number()).default({}),

  // Results and changes
  filesModified: z.array(FilePathSchema),
  transformationsApplied: z.array(
    z.object({
      type: TransformationModeSchema,
      patternId: z.string(),
      confidence: z.number().min(0).max(1),
      changes: z.number(),
      executionTime: z.number(),
    })
  ),

  // Quality and validation
  complexity: ComplexityMetricsSchema.optional(),
  validation: ValidationResultSchema.optional(),
  qualityImprovement: z.number().optional(),

  // Context and metadata
  checkpoint: GitCheckpointSchema.optional(),
  rollbackInfo: z
    .object({
      available: z.boolean(),
      checkpointId: z.string().optional(),
      backupPath: z.string().optional(),
    })
    .optional(),

  // Enhanced error handling
  errors: z.array(ErrorInfoSchema),
  warnings: z.array(ErrorInfoSchema),
  suggestions: z.array(z.string()).default([]),

  // Performance metrics
  performance: z
    .object({
      memoryUsage: z.number(),
      tokenUsage: z.number().optional(),
      cost: z.number().optional(),
      cacheHits: z.number().default(0),
      cacheMisses: z.number().default(0),
    })
    .optional(),

  // Learning and feedback
  learningData: z
    .object({
      patternsDiscovered: z.array(z.string()),
      effectivenessScore: z.number().min(0).max(1),
      userFeedback: z.number().min(1).max(5).optional(),
      recommendations: z.array(z.string()),
    })
    .optional(),
});

// Context-aware prompt schema
export const ContextAwarePromptSchema = z.object({
  basePrompt: z.string(),
  contextualizations: z.array(
    z.object({
      condition: z.string(), // JavaScript expression
      promptModification: z.string(),
      priority: z.number().default(1),
    })
  ),
  examples: z.array(
    z.object({
      context: z.record(z.any()),
      input: z.string(),
      output: z.string(),
      explanation: z.string(),
    })
  ),
  metadata: z.object({
    language: z.string(),
    framework: z.string().optional(),
    complexity: z.number(),
    tags: z.array(z.string()),
  }),
});

// Multi-file transformation context schema
export const MultiFileContextSchema = z.object({
  primaryFile: z.string(),
  relatedFiles: z.array(
    z.object({
      path: z.string(),
      relationship: z.enum(['import', 'export', 'test', 'config', 'dependency']),
      relevanceScore: z.number().min(0).max(1),
    })
  ),
  crossFilePatterns: z.array(
    z.object({
      patternId: z.string(),
      affectedFiles: z.array(z.string()),
      dependencies: z.array(z.string()),
    })
  ),
  consistencyRules: z.array(
    z.object({
      rule: z.string(),
      scope: z.enum(['file', 'module', 'project']),
      enforcement: z.enum(['strict', 'warning', 'suggestion']),
    })
  ),
});

// Rollback information schema
export const RollbackInfoSchema = z.object({
  transformationId: z.string(),
  checkpointId: z.string(),
  backupPath: z.string(),
  affectedFiles: z.array(z.string()),
  rollbackStrategy: z.enum(['git', 'backup', 'incremental']),
  metadata: z.object({
    timestamp: TimestampSchema,
    reason: z.string(),
    userInitiated: z.boolean(),
  }),
});

// Performance optimization schema
export const PerformanceOptimizationSchema = z.object({
  caching: z.object({
    enabled: z.boolean().default(true),
    strategy: z.enum(['memory', 'disk', 'hybrid']).default('hybrid'),
    ttl: z.number().default(3600000), // 1 hour
    maxSize: z.number().default(100), // 100 entries
  }),
  batching: z.object({
    enabled: z.boolean().default(true),
    batchSize: z.number().default(10),
    parallelism: z.number().default(3),
  }),
  streaming: z.object({
    enabled: z.boolean().default(false),
    chunkSize: z.number().default(1024),
  }),
});

// Union type for all transformation actor results
export type TransformationActorResult =
  | TemplateEngineResult
  | AstGrepResult
  | LLMTransformationResult;

// Enhanced type exports
export type EnhancedTransformationContext = z.infer<typeof EnhancedTransformationContextSchema>;
export type EnhancedTransformationRequest = z.infer<typeof EnhancedTransformationRequestSchema>;
export type EnhancedTransformationResult = z.infer<typeof EnhancedTransformationResultSchema>;
export type ContextAwarePrompt = z.infer<typeof ContextAwarePromptSchema>;
export type MultiFileContext = z.infer<typeof MultiFileContextSchema>;
export type RollbackInfo = z.infer<typeof RollbackInfoSchema>;
export type PerformanceOptimization = z.infer<typeof PerformanceOptimizationSchema>;

// Validation helper functions
export const validateTransformationRequest = (data: unknown): TransformationRequest => {
  return TransformationRequestSchema.parse(data);
};

export const validateEnhancedTransformationRequest = (
  data: unknown
): EnhancedTransformationRequest => {
  return EnhancedTransformationRequestSchema.parse(data);
};

export const validateMachineContext = (data: unknown): MachineContext => {
  return MachineContextSchema.parse(data);
};

export const validateMachineEvent = (data: unknown): MachineEvent => {
  return MachineEventSchema.parse(data);
};

// Type guards
export const isValidFilePath = (path: unknown): path is FilePath => {
  return FilePathSchema.safeParse(path).success;
};

export const isValidGitHash = (hash: unknown): hash is GitHash => {
  return GitHashSchema.safeParse(hash).success;
};

export const isTransformationMode = (mode: unknown): mode is TransformationMode => {
  return TransformationModeSchema.safeParse(mode).success;
};

export const isEnhancedTransformationRequest = (
  data: unknown
): data is EnhancedTransformationRequest => {
  return EnhancedTransformationRequestSchema.safeParse(data).success;
};
