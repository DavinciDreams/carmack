// Centralized pattern-related Zod schemas

import { z } from 'zod';

// Supported language enum (for Zod)
export const SupportedLanguageEnumZod = z.enum([
  'typescript', 'javascript', 'python', 'cpp', 'c', 'java', 'go', 'rust', 'ruby', 'php', 'csharp', 'kotlin', 'swift', 'scala', 'haskell', 'elixir', 'shell', 'json', 'yaml', 'toml', 'lua', 'perl', 'r', 'dart', 'xml', 'ini', 'sql', 'docker', 'make', 'other'
]);

// Template pattern schema (from template-engine)
export const TemplatePatternSchema = z.object({
  id: z.string(),
  language: z.string(),
  pattern: z.object({
    template: z.string(),
    flags: z.string().optional().default('g'),
    context: z.object({
      inside: z.array(z.enum(['function', 'class', 'method', 'arrow-function', 'block', 'module'])).optional(),
      notInside: z.array(z.enum(['comment', 'string', 'template-literal', 'regex'])).optional(),
      precedes: z.string().optional(),
      follows: z.string().optional(),
    }).optional(),
  }),
  replacement: z.object({
    template: z.string(),
    transformers: z.record(
      z.enum(['camelCase', 'pascalCase', 'kebabCase', 'uppercase', 'lowercase', 'trim', 'escape'])
    ).optional(),
    conditionals: z.array(z.object({
      condition: z.string(),
      replacement: z.string(),
    })).optional(),
  }),
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  category: z.string(),
  performance: z.object({
    priority: z.number().min(1).max(10).default(5),
    batchable: z.boolean().default(true),
    conflicts: z.array(z.string()).optional(),
  }).optional(),
  testCases: z.array(z.object({
    input: z.string(),
    expected: z.string(),
    description: z.string(),
  })).optional(),
});

// Pattern effectiveness schema (from pattern-learning)
export const PatternEffectivenessSchema = z.object({
  patternId: z.string(),
  successRate: z.number().min(0).max(1),
  averagePerformance: z.number().min(0),
  complexityReduction: z.number(),
  errorRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(0).max(10),
  applicabilityScore: z.number().min(0).max(1),
  lastUpdated: z.number(),
  usageCount: z.number().min(0),
  lifecycle: z.enum(['experimental', 'stable', 'mature', 'deprecated']),
});

// Discovered pattern schema (from pattern-discovery)
export const DiscoveredPatternSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string(),
  pattern: z.object({
    before: z.string(),
    after: z.string(),
    variables: z.array(z.string()).optional(),
    constraints: z.record(z.string()).optional(),
  }),
  metadata: z.object({
    language: z.string(),
    category: z.string().optional(),
    complexity: z.number(),
    riskLevel: z.enum(['low', 'medium', 'high']),
    confidence: z.number(),
    occurrences: z.number().optional(),
    successRate: z.number().optional(),
  }),
  evidence: z.object({
    examples: z.array(z.object({
      before: z.string(),
      after: z.string(),
      context: z.string(),
      source: z.string(),
    })).optional(),
    statistics: z.object({
      totalOccurrences: z.number().optional(),
      successfulTransformations: z.number().optional(),
      userRating: z.number().optional(),
    }).optional(),
  }).optional(),
  testCases: z.array(z.object({
    input: z.string(),
    expected: z.string(),
    description: z.string(),
  })).optional(),
});

// Learning result schema (from pattern-learning)
export const LearningResultSchema = z.object({
  newPatterns: z.array(z.object({
    id: z.string(),
    language: z.string(),
    pattern: z.string(),
    replacement: z.string(),
    description: z.string(),
    complexity: z.number().int().min(1).max(10),
    riskLevel: z.enum(['low', 'medium', 'high']),
    mode: z.enum(['template', 'ast', 'llm']).optional().default('template'),
    confidence: z.number().min(0).max(1).optional(),
  })),
  optimizedPatterns: z.array(z.object({
    id: z.string(),
    language: z.string(),
    pattern: z.string(),
    replacement: z.string(),
    description: z.string(),
    complexity: z.number().int().min(1).max(10),
    riskLevel: z.enum(['low', 'medium', 'high']),
    mode: z.enum(['template', 'ast', 'llm']).optional().default('template'),
    confidence: z.number().min(0).max(1).optional(),
  })),
  deprecatedPatterns: z.array(z.string()),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  metrics: z.object({
    patternsDiscovered: z.number(),
    patternsOptimized: z.number(),
    averageConfidence: z.number(),
    learningTime: z.number(),
  }),
});

// Pattern learning input schema (from pattern-learning)
export const PatternLearningInputSchema = z.object({
  operation: z.enum(['learn', 'discover', 'optimize', 'evaluate']),
  transformation: z.object({
    id: z.string(),
    mode: z.enum(['template', 'ast', 'llm']),
    filesModified: z.array(z.string()),
    complexity: z.object({
      cyclomaticComplexity: z.number().int().min(0),
      cognitiveComplexity: z.number().int().min(0),
      linesOfCode: z.number().int().min(0),
      nestingDepth: z.number().int().min(0),
      functionCount: z.number().int().min(0),
      classCount: z.number().int().min(0),
    }).optional(),
    validation: z.object({
      isValid: z.boolean(),
      errors: z.array(z.object({
        code: z.string(),
        message: z.string(),
        file: z.string().optional(),
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
        severity: z.enum(['error', 'warning', 'info']),
      })),
      warnings: z.array(z.object({
        code: z.string(),
        message: z.string(),
        file: z.string().optional(),
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
        severity: z.enum(['error', 'warning', 'info']),
      })),
      fixableIssues: z.number().int().min(0),
    }).optional(),
    startTime: z.number(),
    endTime: z.number().optional(),
    errors: z.array(z.string()),
    summary: z.string().optional(),
  }).optional(),
  patterns: z.array(z.object({
    id: z.string(),
    language: z.string(),
    pattern: z.string(),
    replacement: z.string(),
    description: z.string(),
    complexity: z.number().int().min(1).max(10),
    riskLevel: z.enum(['low', 'medium', 'high']),
    mode: z.enum(['template', 'ast', 'llm']).optional().default('template'),
  })).optional(),
  context: z.object({
    codebase: z.object({
      language: SupportedLanguageEnumZod,
      framework: z.string().optional(),
      complexity: z.number().default(5),
      size: z.number().default(1000),
    }).optional(),
    environment: z.object({
      performance: z.object({
        transformationTime: z.number(),
        memoryUsage: z.number().optional(),
        cpuUsage: z.number().optional(),
      }).optional(),
      success: z.boolean().default(true),
      userFeedback: z.number().min(0).max(10).optional(),
    }).optional(),
  }).optional(),
});

// Pattern discovery request schema (from pattern-discovery)
export const PatternDiscoveryRequestSchema = z.object({
  operation: z.enum(['discover', 'analyze', 'generate', 'validate']),
  sources: z.object({
    codeFiles: z.array(z.string()).optional(),
    repositories: z.array(z.object({
      path: z.string(),
      language: z.string(),
      patterns: z.array(z.string()).optional(),
    })).optional(),
    transformationHistory: z.array(z.object({
      before: z.string(),
      after: z.string(),
      success: z.boolean(),
      feedback: z.string().optional(),
    })).optional(),
    userFeedback: z.array(z.object({
      pattern: z.string(),
      rating: z.number().min(1).max(5),
      comments: z.string().optional(),
    })).optional(),
  }),
  config: z.object({
    minOccurrences: z.number().default(3),
    confidenceThreshold: z.number().default(0.7),
    maxPatterns: z.number().default(50),
    languages: z.array(z.string()).default(['typescript']),
    categories: z.array(z.string()).default(['modernization', 'optimization', 'cleanup']),
    complexity: z.object({
      min: z.number().default(1),
      max: z.number().default(8),
    }).default({}),
  }).optional().default({}),
});