import { z } from 'zod';

// CLI Options Schema (moved from llm-annotate.ts)
export const CLIOptionsSchema = z.object({
  directory: z.string().optional(),
  output: z.string().optional(),
  format: z.enum(['json', 'markdown', 'yaml']).optional(),
  depth: z.enum(['surface', 'detailed', 'comprehensive']).optional(),
  focus: z
    .array(z.enum(['patterns', 'architecture', 'performance', 'security', 'maintainability']))
    .optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  help: z.boolean().optional(),
  verbose: z.boolean().optional(),
  'no-prompts': z.boolean().optional(),
});
export type CLIOptions = z.infer<typeof CLIOptionsSchema>;
export const validateCLIOptions = (data: unknown): CLIOptions => {
  return CLIOptionsSchema.parse(data);
};

// Core annotation types for LLM consumption
export const CodeContextSchema = z.object({
  filePath: z.string(),
  language: z.string(),
  framework: z.string().optional(),
  purpose: z.string(),
  complexity: z.number(),
  dependencies: z.array(z.string()),
  exports: z.array(z.string()),
});

export const PatternAnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(['architectural', 'design', 'anti-pattern', 'optimization', 'security']),
  name: z.string(),
  description: z.string(),
  location: z.object({
    file: z.string(),
    startLine: z.number(),
    endLine: z.number(),
    context: z.string(), // Surrounding code context
  }),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string(),
  tags: z.array(z.string()),
  examples: z.array(z.string()).optional(),
  relatedPatterns: z.array(z.string()).optional(),
});

export const ArchitecturalAnnotationSchema = z.object({
  component: z.string(),
  type: z.enum(['module', 'class', 'function', 'interface', 'service', 'utility']),
  role: z.string(),
  responsibilities: z.array(z.string()),
  relationships: z.array(
    z.object({
      target: z.string(),
      type: z.enum(['depends-on', 'implements', 'extends', 'uses', 'provides']),
      strength: z.enum(['weak', 'medium', 'strong']),
    })
  ),
  qualityMetrics: z.object({
    cohesion: z.number().min(0).max(1),
    coupling: z.number().min(0).max(1),
    complexity: z.number(),
    testability: z.number().min(0).max(1),
  }),
  designPrinciples: z.array(z.string()),
  violations: z.array(z.string()),
});

export const TransformationOpportunitySchema = z.object({
  id: z.string(),
  type: z.enum(['refactor', 'optimize', 'modernize', 'security-fix', 'performance']),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  location: z.object({
    files: z.array(z.string()),
    functions: z.array(z.string()).optional(),
    classes: z.array(z.string()).optional(),
  }),
  effort: z.enum(['trivial', 'small', 'medium', 'large', 'epic']),
  risk: z.enum(['low', 'medium', 'high']),
  benefits: z.array(z.string()),
  prerequisites: z.array(z.string()).optional(),
  steps: z.array(
    z.object({
      description: z.string(),
      automated: z.boolean(),
      validation: z.string(),
    })
  ),
  estimatedImpact: z.object({
    performance: z.number().optional(),
    maintainability: z.number().optional(),
    security: z.number().optional(),
    readability: z.number().optional(),
  }),
});

export const LLMAnnotationSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  version: z.string(),
  metadata: z.object({
    analyzer: z.string(),
    confidence: z.number().min(0).max(1),
    processingTime: z.number(),
    sourceFiles: z.number(),
    totalLines: z.number(),
  }),
  context: CodeContextSchema,
  patterns: z.array(PatternAnnotationSchema),
  architecture: z.array(ArchitecturalAnnotationSchema),
  opportunities: z.array(TransformationOpportunitySchema),
  summary: z.object({
    overview: z.string(),
    keyFindings: z.array(z.string()),
    recommendations: z.array(z.string()),
    riskAreas: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  llmPrompts: z.object({
    codeReview: z.string(),
    refactoring: z.string(),
    optimization: z.string(),
    testing: z.string(),
    documentation: z.string(),
  }),
});

// Type exports
export type CodeContext = z.infer<typeof CodeContextSchema>;
export type PatternAnnotation = z.infer<typeof PatternAnnotationSchema>;
export type ArchitecturalAnnotation = z.infer<typeof ArchitecturalAnnotationSchema>;
export type TransformationOpportunity = z.infer<typeof TransformationOpportunitySchema>;
export type LLMAnnotation = z.infer<typeof LLMAnnotationSchema>;

// Annotation request and response types
export const AnnotationRequestSchema = z.object({
  sourceFiles: z.array(z.string()),
  targetDirectory: z.string().optional(),
  includePatterns: z.array(z.string()).default(['**/*']),
  excludePatterns: z.array(z.string()).default(['node_modules/**', '**/*.test.*']),
  analysisDepth: z.enum(['surface', 'detailed', 'comprehensive']).default('detailed'),
  focusAreas: z
    .array(z.enum(['patterns', 'architecture', 'performance', 'security', 'maintainability']))
    .optional(),
  outputFormat: z.enum(['json', 'markdown', 'yaml']).default('json'),
  includePrompts: z.boolean().default(true),
});

export const AnnotationResultSchema = z.object({
  request: AnnotationRequestSchema,
  annotation: LLMAnnotationSchema,
  outputPath: z.string().optional(),
  processingTime: z.number(),
  status: z.enum(['success', 'partial', 'failed']),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type AnnotationRequest = z.infer<typeof AnnotationRequestSchema>;
export type AnnotationResult = z.infer<typeof AnnotationResultSchema>;

// Validation helpers
export const validateAnnotationRequest = (data: unknown): AnnotationRequest => {
  return AnnotationRequestSchema.parse(data);
};

export const validateAnnotationResult = (data: unknown): AnnotationResult => {
  return AnnotationResultSchema.parse(data);
};
