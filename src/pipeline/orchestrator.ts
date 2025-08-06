 // Pipeline Orchestrator Module
// Provides CarmackPipelineOrchestrator and all pipeline orchestration logic.
// Modularized from production-enhanced.ts for clarity and maintainability.
//
// Imports are grouped as follows:
// 1. Node.js standard library
// 2. External dependencies
// 3. Internal modules (project-specific)
//
// Consider dynamic imports for large dependencies if startup performance is critical.


import { z } from 'zod';
import { CARMACK_REPOSITORY_URL, carmackConfig } from '../../carmack.config.ts';


// ===== REPOSITORY STATE SCHEMA =====
const RepositoryStateSchema = z.object({
  id: z.string(),
  url: z.string(),
  branch: z.string(),
  localPath: z.string(),
  status: z.enum(['active', 'inactive', 'error', 'cloning', 'analyzing']),
  created: z.number(),
  lastAccessed: z.number(),
  metadata: z.object({
    fileCount: z.number(),
    diskSize: z.number(),
    patterns: z.array(z.any()),
    complexity: z.number().optional(),
  }),
});
export type RepositoryState = z.infer<typeof RepositoryStateSchema>;

// ===== TRANSFORMATION RESULT SCHEMA =====
const TransformationPhaseResultSchema = z.object({
  mode: z.enum(['template', 'ast', 'llm']),
  filesModified: z.array(z.string()).optional(),
  transformationsApplied: z.number().optional(),
  executionTime: z.number().optional(),
  errors: z.array(z.string()).default([]),
  success: z.boolean(),
});
const MultiPhaseTransformationResultSchema = z.object({
  phases: z.array(TransformationPhaseResultSchema),
  totalFilesModified: z.number(),
  summary: z.string(),
});
export type TransformationPhaseResult = z.infer<typeof TransformationPhaseResultSchema>;
export type MultiPhaseTransformationResult = z.infer<typeof MultiPhaseTransformationResultSchema>;

// ===== ENHANCED CLI SCHEMA =====
export const EnhancedCLIArgsSchema = z.object({
  repository: z.string().url().optional().default(CARMACK_REPOSITORY_URL),
  branch: z.string().default(carmackConfig.project.repository.branch),
  workspace: z.string().optional(),
  'cleanup-after': z.boolean().default(true),
  'dry-run': z.boolean().default(false),
  'max-files': z.number().min(1).max(1000).optional(),
  'risk-level': z.enum(['low', 'medium', 'high']).default('low'),
  'pattern-file': z.string().optional(),
  'skip-tests': z.boolean().default(false),
  'skip-verification': z.boolean().default(false),
  'skip-documentation': z.boolean().default(false),
  'force-docs-update': z.boolean().default(false),
  'enable-learning': z.boolean().default(true),
  'learn-patterns': z.boolean().default(true),
  'adaptation-threshold': z.number().min(0).max(1).default(0.8),
  verbose: z.boolean().default(false),
  'auto-commit': z.boolean().default(false),
  config: z.string().optional(),
  help: z.boolean().default(false),
});
export type EnhancedCLIArgs = z.infer<typeof EnhancedCLIArgsSchema>;

// ===== PIPELINE ORCHESTRATOR =====
/**
 * Orchestrates the full Carmack pipeline.
 * See documentation for each method for details.
 */
import { CarmackPipelineOrchestrator as BaseCarmackPipelineOrchestrator } from '../production/production-enhanced.ts';

/**
 * CarmackPipelineOrchestrator extends the production orchestrator for modular pipeline orchestration.
 * Override methods here to customize pipeline behavior.
 */
export class CarmackPipelineOrchestrator extends BaseCarmackPipelineOrchestrator {
  /**
   * Example override: runPipeline with improved error handling.
   * Replace or extend this method as needed for custom orchestration logic.
   */
  override async executeFullPipeline(args: EnhancedCLIArgs): Promise<void> {
    try {
      await super.executeFullPipeline(args);
    } catch (error) {
      // Improved error handling: log and rethrow for upstream handling
      console.error('Pipeline execution failed in orchestrator:', error);
      throw error;
    }
  }
}

// Export all helpers/types as needed for pipeline orchestration.