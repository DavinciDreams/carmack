import { readFile, writeFile } from 'node:fs/promises';
import { js, ts } from '@ast-grep/napi';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ASTGrepNode } from '../docs/ast-analyzer.js';

// Enhanced transformation result type
interface EnhancedTransformationResult {
  filesModified: string[];
  transformationsApplied: number;
  appliedPatterns: Array<{ file: string; pattern: string; count: number }>;
  mode: 'template' | 'ast' | 'llm';
}

// Enhanced pattern schema with full AST-grep support
const EnhancedPatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript']),
  mode: z.enum(['template', 'ast']).default('template'),
  pattern: z.union([
    z.string(), // Template pattern
    z.object({
      // AST pattern
      rule: z.object({
        pattern: z.string(),
        kind: z.string().optional(),
        inside: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
        has: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
      }),
    }),
  ]),
  replacement: z.string(),
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  astGrep: z
    .object({
      rule: z.object({
        pattern: z.string(),
        kind: z.string().optional(),
        inside: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
        has: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
      }),
      fix: z.string(),
    })
    .optional(),
});

const EnhancedTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  transformationType: z.enum(['template', 'ast', 'llm']),
  patterns: z.array(EnhancedPatternSchema),
  maxComplexity: z.number().default(15),
  dryRun: z.boolean().default(false),
});

export type EnhancedTransformationRequest = z.infer<typeof EnhancedTransformationRequestSchema>;
export type EnhancedPattern = z.infer<typeof EnhancedPatternSchema>;

/**
 * Enhanced transformation actor with real AST-grep integration
 */
export const enhancedTransformationActor = fromPromise(
  async ({ input }: { input: EnhancedTransformationRequest }) => {
    console.log('🚀 Enhanced transformation starting for', input.targetFiles.length, 'files');

    const validated = EnhancedTransformationRequestSchema.parse(input);

    try {
