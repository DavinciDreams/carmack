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

// AST pattern schema
export const AstPatternSchema = z.object({
  id: z.string(),
  language: z.string(),
  pattern: z.string(),
  replacement: z.string(),
  description: z.string(),
  complexity: z.number().int().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  mode: TransformationModeSchema.optional().default('template'), // Default to template mode for backward compatibility
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

// Union type for all transformation actor results
export type TransformationActorResult =
  | TemplateEngineResult
  | AstGrepResult
  | LLMTransformationResult;

// Validation helper functions
export const validateTransformationRequest = (data: unknown): TransformationRequest => {
  return TransformationRequestSchema.parse(data);
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
