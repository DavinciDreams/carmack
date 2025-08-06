// Unified Transformation Module
// Provides shared interfaces, schemas, and types for all transformation actors (AST-grep, C++, LLM).
// All transformation logic should import types and schemas from this module.

/**
 * Transformation Interfaces and Schemas
 * -------------------------------------
 * This module centralizes all transformation-related types, schemas, and documentation.
 * It is the single source of truth for transformation contracts across the codebase.
 */

import { z } from 'zod';

// ======================= AST-Grep Transformation =======================

/**
 * AST-grep Pattern Schema
 * Represents a pattern for AST-grep-based code transformation.
 */
export const AstGrepPatternSchema = z.object({
  id: z.string(),
  language: z.string(),
  pattern: z.object({
    rule: z.object({
      pattern: z.string().optional(),
      kind: z.string().optional(),
      regex: z.string().optional(),
      inside: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      has: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      follows: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      precedes: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      all: z
        .array(
          z.object({
            pattern: z.string().optional(),
            kind: z.string().optional(),
            regex: z.string().optional(),
          })
        )
        .optional(),
      any: z
        .array(
          z.object({
            pattern: z.string().optional(),
            kind: z.string().optional(),
            regex: z.string().optional(),
          })
        )
        .optional(),
      not: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
          regex: z.string().optional(),
        })
        .optional(),
    }),
    constraints: z
      .record(
        z.object({
          regex: z.string().optional(),
          kind: z.string().optional(),
        })
      )
      .optional(),
  }),
  replacement: z.object({
    template: z.string(),
    transformers: z
      .record(
        z.enum([
          'camelCase',
          'pascalCase',
          'kebabCase',
          'snakeCase',
          'uppercase',
          'lowercase',
          'trim',
          'escape',
        ])
      )
      .optional(),
    conditions: z
      .array(
        z.object({
          when: z.string(),
          then: z.string(),
        })
      )
      .optional(),
  }),
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  category: z.string(),
  performance: z
    .object({
      priority: z.number().min(1).max(10).default(5),
      batchable: z.boolean().default(true),
      conflicts: z.array(z.string()).optional(),
      maxMatches: z.number().optional(),
    })
    .optional(),
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
export type AstGrepPattern = z.infer<typeof AstGrepPatternSchema>;
/**
 * AST match result with rich metadata
 */

// Minimal SgNode type definition for AST-grep compatibility
export type SgNode = {
  type: string;
  text: string;
  start: number;
  end: number;
  children?: SgNode[];
  [key: string]: unknown;
};

export interface AstMatch {
  pattern: AstGrepPattern;
  node: SgNode;
  text: string;
  range: { start: number; end: number };
  variables: Record<string, string>;
  context: {
    parent?: SgNode | null;
    ancestors: SgNode[];
    siblings: SgNode[];
    scope: 'global' | 'function' | 'block' | 'class';
  };
}

/**
 * AST-grep Transformation Request Schema
 */
export const AstGrepTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  patterns: z.array(AstGrepPatternSchema),
  options: z
    .object({
      dryRun: z.boolean().default(false),
      maxComplexity: z.number().default(7),
      enableBatching: z.boolean().default(true),
      skipConflicts: z.boolean().default(true),
      preserveFormatting: z.boolean().default(true),
      maxMatchesPerPattern: z.number().default(1000),
    })
    .optional()
    .default({}),
});
export type AstGrepTransformationRequest = z.infer<typeof AstGrepTransformationRequestSchema>;

// ======================= C++ Transformation =======================

/**
 * C++ Pattern Schema
 * Represents a pattern for C++ code transformation.
 */
export const CppPatternSchema = z.object({
  id: z.string(),
  language: z.literal('cpp'),
  pattern: z.string(),
  replacement: z.string(),
  description: z.string(),
  complexity: z.number().int().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  mode: z.enum(['template', 'ast']),
  category: z.enum(['safety', 'performance', 'hygiene', 'modernization']),
  performance: z
    .object({
      priority: z.number().min(1).max(10).default(5),
      batchable: z.boolean().default(true),
      conflicts: z.array(z.string()).optional(),
      maxMatches: z.number().optional(),
    })
    .optional(),
  verification: z
    .object({
      dafnySpec: z.string().optional(),
      invariants: z.array(z.string()).optional(),
      preconditions: z.array(z.string()).optional(),
      postconditions: z.array(z.string()).optional(),
    })
    .optional(),
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
export type CppPattern = z.infer<typeof CppPatternSchema>;

/**
 * C++ Transformation Request Schema
 */
export const CppTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  patterns: z.array(CppPatternSchema),
  options: z
    .object({
      dryRun: z.boolean().default(false),
      maxComplexity: z.number().default(7),
      enableBatching: z.boolean().default(true),
      skipConflicts: z.boolean().default(true),
      preserveFormatting: z.boolean().default(true),
      enableVerification: z.boolean().default(true),
      maxMatchesPerPattern: z.number().default(1000),
    })
    .optional()
    .default({}),
});
export type CppTransformationRequest = z.infer<typeof CppTransformationRequestSchema>;

// ======================= LLM Transformation =======================

/**
 * Enhanced LLM Transformation Input Schema
 * Used for LLM-based code transformation.
 */
import { LLMConfigSchema } from '../providers/llm-providers.js';

export const EnhancedLLMConfigSchema = LLMConfigSchema.extend({
  enableFallback: z.boolean().default(true),
  costLimit: z.number().default(2.0),
  enableContextAwareness: z.boolean().default(true),
  enableMultiFileAnalysis: z.boolean().default(true),
  enableIncrementalTransformation: z.boolean().default(true),
  enableRollback: z.boolean().default(true),
  performance: z
    .object({
      enableCaching: z.boolean().default(true),
      enableBatching: z.boolean().default(true),
      maxBatchSize: z.number().default(5),
      cacheStrategy: z.enum(['memory', 'disk', 'hybrid']).default('hybrid'),
    })
    .default({}),
});
export type EnhancedLLMConfig = z.infer<typeof EnhancedLLMConfigSchema>;

export const EnhancedLLMTransformationInputSchema = z.object({
  files: z.array(z.string()),
  request: z.any().optional(),
  config: EnhancedLLMConfigSchema.optional(),
  context: z.any().optional(),
  multiFileContext: z.any().optional(),
  contextAwarePrompts: z.array(z.any()).optional(),
  rollbackInfo: z.any().optional(),
  performanceOptions: z.any().optional(),
});
export type EnhancedLLMTransformationInput = z.infer<typeof EnhancedLLMTransformationInputSchema>;

// ======================= Documentation =======================

/**
 * Exported Types:
 * - AstGrepPattern, AstGrepTransformationRequest
 * - CppPattern, CppTransformationRequest
 * - EnhancedLLMConfig, EnhancedLLMTransformationInput
 * 
 * Exported Schemas:
 * - AstGrepPatternSchema, AstGrepTransformationRequestSchema
 * - CppPatternSchema, CppTransformationRequestSchema
 * - EnhancedLLMConfigSchema, EnhancedLLMTransformationInputSchema
 * 
 * All transformation actors should import types and schemas from this module.
 */