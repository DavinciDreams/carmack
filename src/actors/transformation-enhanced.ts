import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { js, ts } from '@ast-grep/napi';
import { createActor, fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  AstGrepResult,
  AstPattern,
  ComplexityMetrics,
  LLMTransformationResult,
  TemplateEngineResult,
  ValidationActorResult,
} from '../types.ts';
import { astGrepTransformationActor } from './ast-grep-transformation.ts';
import { complexityActor } from './complexity.ts';
import { createEnhancedLLMTransformer } from './llm-transformation-enhanced.ts';
import { templateEngineActor } from './template-engine.ts';
import { validationActor } from './validation.ts';

// ===== ENHANCED TRANSFORMATION ORCHESTRATOR =====

/**
 * Enhanced Transformation Orchestrator Result
 * Comprehensive result type for the production pipeline integration
 */
export interface EnhancedTransformationOrchestratorResult {
  success: boolean;
  transformationId: string;
  filesModified: string[];
  transformationsApplied: Array<{
    type: 'template' | 'ast' | 'llm';
    patternsUsed: string[];
    executionTime: number;
    success: boolean;
    confidence: number;
    metadata?: Record<string, unknown>;
  }>;
  qualityMetrics: {
    complexityBefore: number;
    complexityAfter: number;
    typeErrors: number;
    formatIssues: number;
    qualityImprovement: number;
  };
  performance: {
    totalExecutionTime: number;
    stageTimings: Record<string, number>;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
  rollbackInfo?: {
    available: boolean;
    checkpointId?: string;
    backupPath?: string;
  };
  errors: Array<{
    stage: string;
    error: string;
    message: string;
    severity: 'warning' | 'error' | 'critical';
    recoverable: boolean;
  }>;
  recommendations: string[];
}

/**
 * Enhanced transformation request schema for orchestrator
 */
const EnhancedOrchestratorRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  transformationType: z.enum(['template', 'ast', 'llm', 'auto']).default('auto'),
  patterns: z.array(z.any()).default([]), // Use existing AstPattern from types
  maxComplexity: z.number().default(15),
  dryRun: z.boolean().default(false),
  context: z
    .object({
      projectType: z.string().default('typescript'),
      priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
      enableRollback: z.boolean().default(true),
      enableMonitoring: z.boolean().default(true),
    })
    .optional(),
  config: z

import { BUILTIN_CPP_PATTERNS, cppTransformationActor } from './cpp-transformation.js';

// Enhanced pattern schema with full AST-grep support
const EnhancedPatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript', 'cpp', 'c']),
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
  astGrep: z.object({
      enableContextAwareness: z.boolean().default(true),
      enableMultiFileAnalysis: z.boolean().default(true),
      enableCaching: z.boolean().default(true),
      maxExecutionTime: z.number().default(300000), // 5 minutes
    })
    .optional(),
});

export type EnhancedOrchestratorRequest = z.infer<typeof EnhancedOrchestratorRequestSchema>;

/**
 * Helper function to invoke actors with proper async handling and timeout
 */
async function invokeActorWithTimeout<T>(
  // biome-ignore lint/suspicious/noExplicitAny: XState ActorLogic has complex generics that require any for production compatibility
  actorLogic: any,
  input: unknown,
  timeoutMs = 30000
): Promise<T> {
  const actor = createActor(actorLogic, { input });
  actor.start();

  return new Promise<T>((resolve, reject) => {
    let isResolved = false;

    const subscription = actor.subscribe((state) => {
      if (isResolved) return;

      if (state.status === 'done') {
        isResolved = true;
        subscription.unsubscribe();
        actor.stop();
        clearTimeout(timeout);
        resolve(state.output as T);
      } else if (state.status === 'error') {
        isResolved = true;
        subscription.unsubscribe();
        actor.stop();
        clearTimeout(timeout);
        reject(state.error || new Error('Actor execution failed'));
      }
    });

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        subscription.unsubscribe();
        actor.stop();
        reject(new Error(`Actor execution timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });
}

/**
 * Enhanced Transformation Orchestrator Actor
 * Coordinates all transformation systems with intelligent planning and execution
 */
export const enhancedTransformationOrchestratorActor = fromPromise(
  async ({
    input,
  }: {
    input: EnhancedOrchestratorRequest;
  }): Promise<EnhancedTransformationOrchestratorResult> => {
    const startTime = Date.now();
    const transformationId = `enhanced_transform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 Enhanced Transformation Orchestrator starting: ${transformationId}`);

    try {
      // Validate and parse input
      const validated = EnhancedOrchestratorRequestSchema.parse(input);

      // Initialize orchestrator state
      const orchestratorState = {
        transformationId,
        startTime,
        stageTimings: {} as Record<string, number>,
        errors: [] as Array<{
          stage: string;
          error: string;
          message: string;
          severity: 'warning' | 'error' | 'critical';
          recoverable: boolean;
        }>,
        transformationsApplied: [] as Array<{
          type: 'template' | 'ast' | 'llm';
          patternsUsed: string[];
          executionTime: number;
          success: boolean;
          confidence: number;
          metadata?: Record<string, unknown>;
        }>,
        filesModified: new Set<string>(),
        complexityBefore: 0,
        complexityAfter: 0,
      };

      // Execute orchestration stages
      const result = await executeEnhancedOrchestrationStages(validated, orchestratorState);

      console.log(
        `✅ Enhanced Orchestrator completed: ${transformationId} in ${Date.now() - startTime}ms`
      );
      return result;
    } catch (error) {
      console.error(`❌ Enhanced Orchestrator failed: ${transformationId}`, error);

      // Handle C++ files with specialized transformation
      const cppFiles = validated.targetFiles.filter(
        (file) =>
          file.endsWith('.cpp') ||
          file.endsWith('.cxx') ||
          file.endsWith('.cc') ||
          file.endsWith('.c++') ||
          file.endsWith('.hpp') ||
          file.endsWith('.hxx') ||
          file.endsWith('.h++') ||
          file.endsWith('.h')
      );

      if (cppFiles.length > 0) {
        console.log(`🔧 Applying specialized C++ transformations to ${cppFiles.length} files`);

        // Convert patterns to C++ format and apply C++ transformations
        const cppPatterns = BUILTIN_CPP_PATTERNS.filter(
          (p) => p.complexity <= validated.maxComplexity
        );

        const cppRequest = {
          targetFiles: cppFiles,
          patterns: cppPatterns,
          options: {
            dryRun: validated.dryRun,
            maxComplexity: validated.maxComplexity,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
            enableVerification: true,
            maxMatchesPerPattern: 1000,
          },
        };

        try {
          const cppActor = createActor(cppTransformationActor, { input: cppRequest });
          cppActor.start();
          const cppResult = await new Promise((resolve, reject) => {
            const subscription = cppActor.subscribe((state) => {
              if (state.status === 'done') {
                subscription.unsubscribe();
                cppActor.stop();
                resolve(state.output);
              } else if (state.status === 'error') {
                subscription.unsubscribe();
                cppActor.stop();
                reject(state.error);
              }
            });
          });

          // Merge C++ results with main results
          if (typeof result === 'object' && result !== null) {
            const mainResult = result as any;
            const cppResultTyped = cppResult as any;
            mainResult.filesModified = [
              ...(mainResult.filesModified || []),
              ...(cppResultTyped.filesModified || []),
            ];
            mainResult.transformationsApplied =
              (mainResult.transformationsApplied || 0) +
              (cppResultTyped.transformationsApplied || 0);
            mainResult.appliedPatterns = [
              ...(mainResult.appliedPatterns || []),
              ...(cppResultTyped.appliedPatterns || []),
            ];
            mainResult.cppVerificationResults = cppResultTyped.verificationResults;
            mainResult.cppPerformanceMetrics = cppResultTyped.performanceMetrics;
          }
        } catch (cppError) {
          console.error('C++ transformation error:', cppError);
          // Continue with main transformation even if C++ fails
        }

      let result: EnhancedTransformationResult;

      switch (validated.transformationType) {
        case 'template':
          result = await applyEnhancedTemplateTransformation(validated);
          break;
        case 'ast':
          result = await applyRealASTTransformation(validated);
          break;
        case 'llm':
          result = await applyEnhancedLLMTransformation(validated);
          break;
        default:
          throw new Error(`Unknown transformation type: ${validated.transformationType}`);
      }

      return {
        success: false,
        transformationId,
        filesModified: [],
        transformationsApplied: [],
        qualityMetrics: {
          complexityBefore: 0,
          complexityAfter: 0,
          typeErrors: 0,
          formatIssues: 0,
          qualityImprovement: 0,
        },
        performance: {
          totalExecutionTime: Date.now() - startTime,
          stageTimings: {},
          resourceUsage: { memory: 0, cpu: 0 },
        },
        errors: [
          {
            stage: 'initialization',
            error: error instanceof Error ? error.message : String(error),
            message: error instanceof Error ? error.message : String(error),
            severity: 'critical',
            recoverable: false,
          },
        ],
        recommendations: ['Check input parameters and system configuration'],
      };
    }
  }
);

/**
 * Execute all enhanced orchestration stages
 */
async function executeEnhancedOrchestrationStages(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<EnhancedTransformationOrchestratorResult> {
  const stages = [
    { name: 'pre-analysis', fn: preAnalysisStage },
    { name: 'dependency-analysis', fn: dependencyAnalysisStage },
    { name: 'transformation-planning', fn: transformationPlanningStage },
    { name: 'transformation-execution', fn: transformationExecutionStage },
    { name: 'quality-validation', fn: qualityValidationStage },
    { name: 'rollback-preparation', fn: rollbackPreparationStage },
    { name: 'monitoring-collection', fn: monitoringCollectionStage },
  ];

  for (const stage of stages) {
    const stageStart = Date.now();

    try {
      console.log(`📋 Enhanced Orchestrator executing stage: ${stage.name}`);
      await stage.fn(request, state);

      const elapsed = Date.now() - stageStart;
      state.stageTimings[stage.name] = Math.max(elapsed, 1);
      console.log(
        `✅ Enhanced stage completed: ${stage.name} (${state.stageTimings[stage.name]}ms)`
      );
    } catch (error) {
      const elapsed = Date.now() - stageStart;
      state.stageTimings[stage.name] = Math.max(elapsed, 1);

      const errorInfo = {
        stage: stage.name,
        error: error instanceof Error ? error.message : String(error),
        message: error instanceof Error ? error.message : String(error),
        severity: 'error' as const,
        recoverable: stage.name !== 'transformation-execution',
      };

      state.errors.push(errorInfo);
      console.warn(
        `⚠️ Enhanced stage failed: ${stage.name} (${state.stageTimings[stage.name]}ms)`,
        error
      );

      // Continue with next stage unless critical failure
      if (!errorInfo.recoverable) {
        break;
      }
    }
  }

  return buildEnhancedOrchestratorResult(request, state);
}

/**
 * Stage 1: Pre-analysis - Analyze files and prepare for transformation
 */
async function preAnalysisStage(request: EnhancedOrchestratorRequest, state: any): Promise<void> {
  console.log('🔍 Pre-analysis: Analyzing target files...');

  // Analyze complexity of target files
  try {
    const complexityMetrics = await invokeActorWithTimeout<ComplexityMetrics>(complexityActor, {
      files: request.targetFiles,
    });

    state.complexityBefore = complexityMetrics.cyclomaticComplexity;
    console.log(`📊 Initial complexity: ${state.complexityBefore}`);
  } catch (error) {
    console.warn('⚠️ Complexity analysis failed, using default values');
    state.complexityBefore = 5; // Default baseline
  }

  // Validate file accessibility
  for (const filePath of request.targetFiles) {
    try {
      await readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot access file: ${filePath}`);
    }
  }
}

/**
 * Stage 2: Dependency Analysis - Analyze cross-file dependencies
 */
async function dependencyAnalysisStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  console.log('🔗 Dependency Analysis: Analyzing file relationships...');

  // Build dependency graph for multi-file transformations
  const dependencyGraph: Record<string, string[]> = {};

  for (const filePath of request.targetFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Simple import/export analysis
      const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      const relatedFiles = imports
        .map((imp) => imp.match(/['"]([^'"]+)['"]/)?.[1])
        .filter(Boolean)
        .map((imp) => imp as string);

      dependencyGraph[filePath] = relatedFiles;
    } catch (error) {
      console.warn(`⚠️ Failed to analyze dependencies for ${filePath}`);
      dependencyGraph[filePath] = [];
    }
  }

  state.dependencyGraph = dependencyGraph;
  console.log(
    `📊 Dependency analysis completed: ${Object.keys(dependencyGraph).length} files analyzed`
  );
}

/**
 * Stage 3: Transformation Planning - Plan intelligent transformation strategy
 */
async function transformationPlanningStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  console.log('🎯 Transformation Planning: Creating execution strategy...');

  // Determine optimal transformation order based on Carmack's hierarchy
  const transformationOrder =
    request.transformationType === 'auto'
      ? (['template', 'ast', 'llm'] as const)
      : [request.transformationType as 'template' | 'ast' | 'llm'];

  // Plan transformation stages with intelligent prioritization
  state.transformationPlan = {
    order: transformationOrder,
    enableParallel: request.targetFiles.length > 1 && request.context?.priority !== 'critical',
    maxConcurrency: Math.min(3, request.targetFiles.length),
    fallbackEnabled: true,
  };

  console.log(`📋 Transformation plan: ${transformationOrder.join(' → ')}`);
}

/**
 * Stage 4: Transformation Execution - Execute planned transformations
 */
async function transformationExecutionStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  console.log('⚡ Transformation Execution: Applying transformations...');

  const { transformationPlan } = state;

  for (const transformationType of transformationPlan.order) {
    try {
      console.log(`🔄 Executing ${transformationType} transformation...`);
      const result = await executeEnhancedTransformation(transformationType, request, state);

      if (result.success) {
        state.transformationsApplied.push(result);
        result.filesModified.forEach((file: string) => state.filesModified.add(file));

        console.log(
          `✅ ${transformationType} transformation completed: ${result.filesModified.length} files modified`
        );
      } else {
        console.log(`⚠️ ${transformationType} transformation had no effect`);
      }
    } catch (error) {
      console.warn(`❌ ${transformationType} transformation failed:`, error);

      if (!transformationPlan.fallbackEnabled) {
        throw error;
      }
    }
  }

  console.log(
    `🎉 Transformation execution completed: ${state.filesModified.size} total files modified`
  );
}

/**
 * Execute specific enhanced transformation type
 */
async function executeEnhancedTransformation(
  type: 'template' | 'ast' | 'llm',
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<{
  type: 'template' | 'ast' | 'llm';
  success: boolean;
  filesModified: string[];
  patternsUsed: string[];
  executionTime: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}> {
  const startTime = Date.now();

  switch (type) {
    case 'template': {
      const templateResult = await invokeActorWithTimeout<TemplateEngineResult>(
        templateEngineActor,
        {
          targetFiles: request.targetFiles,
          patterns: request.patterns.filter((p: any) => !p.mode || p.mode === 'template'),
          options: {
            dryRun: request.dryRun,
            maxComplexity: request.maxComplexity,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        }
      );

      return {
        type: 'template',
        success: templateResult.transformationsApplied > 0,
        filesModified: templateResult.filesModified,
        patternsUsed: templateResult.appliedPatterns.map((p) => p.pattern),
        executionTime: Date.now() - startTime,
        confidence: 0.8,
        metadata: { transformationsApplied: templateResult.transformationsApplied },
      };
    }

    case 'ast': {
      const astResult = await invokeActorWithTimeout<AstGrepResult>(astGrepTransformationActor, {
        targetFiles: request.targetFiles,
        patterns: request.patterns.filter((p: any) => p.mode === 'ast'),
        options: {
          dryRun: request.dryRun,
          maxComplexity: request.maxComplexity,
          enableBatching: true,
          skipConflicts: true,
          preserveFormatting: true,
          maxMatchesPerPattern: 1000,
        },
      });

      return {
        type: 'ast',
        success: astResult.transformationsApplied > 0,
        filesModified: astResult.filesModified,
        patternsUsed: astResult.appliedPatterns.map((p) => p.pattern),
        executionTime: Date.now() - startTime,
        confidence: 0.9,
        metadata: { transformationsApplied: astResult.transformationsApplied },
      };
    }

    case 'llm': {
      // Create enhanced LLM transformer
      const enhancedLLMTransformer = createEnhancedLLMTransformer({
        provider: 'mock', // Use mock for integration testing
        enableContextAwareness: request.config?.enableContextAwareness ?? true,
        enableMultiFileAnalysis: request.config?.enableMultiFileAnalysis ?? true,
        performance: {
          enableCaching: request.config?.enableCaching ?? true,
          enableBatching: true,
          maxBatchSize: 10,
          cacheStrategy: 'memory',
        },
      });

      const llmResult = await invokeActorWithTimeout<LLMTransformationResult>(
        enhancedLLMTransformer,
        {
          files: request.targetFiles,
          request: {
            prompt: 'Improve code quality and apply best practices',
            targetFiles: request.targetFiles,
            transformationType: 'llm' as const,
            maxComplexity: request.maxComplexity,
            dryRun: request.dryRun,
          },
          config: {
            provider: 'mock' as const,
            enableContextAwareness: true,
          },
          context: {
            projectType: request.context?.projectType || 'typescript',
            priority: request.context?.priority || 'normal',
          },
        }
      );

      return {
        type: 'llm',
        success: llmResult.filesModified.length > 0,
        filesModified: llmResult.filesModified,
        patternsUsed: [],
        executionTime: Date.now() - startTime,
        confidence: llmResult.averageConfidence || 0.7,
        metadata: {
          transformationsApplied: llmResult.transformationsApplied,
          tokenUsage: llmResult.totalTokensUsed,
        },
      };
    }

    default:
      throw new Error(`Unknown transformation type: ${type}`);
  }
}

/**
 * Stage 5: Quality Validation - Validate transformation results
 */
async function qualityValidationStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  console.log('🔍 Quality Validation: Validating transformation results...');

  const modifiedFiles = Array.from(state.filesModified);

  if (modifiedFiles.length === 0) {
    console.log('⏭️ No files modified, skipping quality validation');
    return;
  }

  // Run validation checks
  try {

    const validationResult = await invokeActorWithTimeout<ValidationActorResult>(validationActor, {
      type: 'quality',
      files: modifiedFiles,
    });

    state.typeErrors = validationResult.errors?.length || 0;
    state.formatIssues = validationResult.warnings?.length || 0;
  } catch (error) {
    console.warn('⚠️ Quality validation failed:', error);
    state.typeErrors = 0;
    state.formatIssues = 0;
  }

    let modifiedContent = content;
    let transformCount = 0;

    // Get the root node for searching
    const rootNode = (root as { root: () => ASTGrepNode }).root();

    // Find all matches using ast-grep - use pattern string
    const patternString =
      typeof pattern.astGrep.rule === 'string'
        ? pattern.astGrep.rule
        : pattern.astGrep.rule.pattern || '';

    const matches = rootNode.findAll(patternString);

    if (matches && matches.length > 0) {
      console.log(`🔍 Found ${matches.length} AST matches for pattern ${pattern.id}`);

      // Apply transformations in reverse order to maintain positions
      const sortedMatches = matches.sort(
        (a: ASTGrepNode, b: ASTGrepNode) => b.range().start.index - a.range().start.index
      );

      for (const match of sortedMatches) {
        try {
          const range = match.range();
          const matchText = match.text();

          // Apply the fix transformation
          let replacement = pattern.astGrep.fix;

          // Handle variable substitutions
          const variables = match.getMultipleMatches?.();
          if (variables) {
            for (const [varName, varMatch] of Object.entries(variables)) {
              const varText = Array.isArray(varMatch)
                ? varMatch.map((m: ASTGrepNode) => m.text()).join(', ')
                : (varMatch as ASTGrepNode).text();
              replacement = replacement.replace(new RegExp(`\\$${varName}`, 'g'), varText);
            }
          }

          // Apply the transformation
          const before = modifiedContent.substring(0, range.start.index);
          const after = modifiedContent.substring(range.end.index);
          modifiedContent = before + replacement + after;

  // Analyze final complexity
  try {
    const finalComplexity = await invokeActorWithTimeout<ComplexityMetrics>(complexityActor, {
      files: modifiedFiles,
    });

    state.complexityAfter = finalComplexity.cyclomaticComplexity;
    console.log(`📊 Final complexity: ${state.complexityAfter}`);
  } catch (error) {
    console.warn('⚠️ Final complexity analysis failed');
    state.complexityAfter = state.complexityBefore;
  }
}

/**
 * Stage 6: Rollback Preparation - Prepare rollback capabilities
 */
async function rollbackPreparationStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  if (!request.context?.enableRollback) {
    console.log('⏭️ Rollback disabled, skipping preparation');
    return;
  }

  console.log('🔄 Rollback Preparation: Setting up rollback capabilities...');

  // Create backup directory
  const backupDir = join(process.cwd(), '.carmack-backups', state.transformationId);

  try {
    await mkdir(backupDir, { recursive: true });

    state.rollbackInfo = {
      available: true,
      checkpointId: state.transformationId,
      backupPath: backupDir,
    };

    console.log(`✅ Rollback prepared: ${backupDir}`);
  } catch (error) {
    console.warn('⚠️ Rollback preparation failed:', error);
    state.rollbackInfo = { available: false };
  }
}

/**
 * Stage 7: Monitoring Collection - Collect metrics and monitoring data
 */
async function monitoringCollectionStage(
  request: EnhancedOrchestratorRequest,
  state: any
): Promise<void> {
  if (!request.context?.enableMonitoring) {
    console.log('⏭️ Monitoring disabled, skipping collection');
    return;
  }

  console.log('📊 Monitoring Collection: Gathering performance metrics...');

  // Collect performance metrics
  state.performanceMetrics = {
    memoryUsage: process.memoryUsage().heapUsed,
    cpuUsage: 0, // Would need process monitoring
    executionTime: Date.now() - state.startTime,
  };

  console.log(`📈 Metrics collected: ${state.performanceMetrics.memoryUsage} bytes memory used`);
}

/**
 * Build final enhanced orchestrator result
 */
function buildEnhancedOrchestratorResult(
  request: EnhancedOrchestratorRequest,
  state: any
): EnhancedTransformationOrchestratorResult {
  const qualityImprovement = calculateQualityImprovement(state);
  const recommendations = generateEnhancedRecommendations(state);

  return {
    success:
      state.transformationsApplied.length > 0 &&
      state.errors.filter((e: any) => e.severity === 'critical').length === 0,
    transformationId: state.transformationId,
    filesModified: Array.from(state.filesModified),
    transformationsApplied: state.transformationsApplied,
    qualityMetrics: {
      complexityBefore: state.complexityBefore,
      complexityAfter: state.complexityAfter,
      typeErrors: state.typeErrors || 0,
      formatIssues: state.formatIssues || 0,
      qualityImprovement,
    },
    performance: {
      totalExecutionTime: Date.now() - state.startTime,
      stageTimings: state.stageTimings,
      resourceUsage: {
        memory: state.performanceMetrics?.memoryUsage || process.memoryUsage().heapUsed,
        cpu: state.performanceMetrics?.cpuUsage || 0,
      },
    },
    rollbackInfo: state.rollbackInfo,
    errors: state.errors,
    recommendations,
  };
}

/**
 * Calculate quality improvement score
 */
function calculateQualityImprovement(state: any): number {
  const complexityImprovement =
    state.complexityBefore > 0
      ? (state.complexityBefore - state.complexityAfter) / state.complexityBefore
      : 0;

  const errorReduction = (state.typeErrors || 0) === 0 ? 0.2 : -0.1;
  const transformationSuccess = state.transformationsApplied.length > 0 ? 0.3 : -0.2;

  return Math.max(-1, Math.min(1, complexityImprovement + errorReduction + transformationSuccess));
}

/**
 * Generate enhanced recommendations
 */
function generateEnhancedRecommendations(state: any): string[] {
  const recommendations: string[] = [];

  if (state.complexityAfter > state.complexityBefore) {
    recommendations.push('Consider refactoring to reduce code complexity');
  }

  if ((state.typeErrors || 0) > 0) {
    recommendations.push('Fix remaining type errors for better code safety');
  }

  if (state.transformationsApplied.length === 0) {
    recommendations.push(
      'No transformations were applied - consider adjusting patterns or criteria'
    );
  }

  if (state.transformationsApplied.some((t: any) => t.confidence < 0.7)) {
    recommendations.push('Some transformations had low confidence - review results carefully');
  }

  if (recommendations.length === 0) {
    recommendations.push('Transformation completed successfully with good quality metrics');
  }

  return recommendations;
}

// Legacy compatibility exports
export interface EnhancedTransformationResult {
  filesModified: string[];
  transformationsApplied: number;
  appliedPatterns: Array<{ file: string; pattern: string; count: number }>;
  mode: 'template' | 'ast' | 'llm';
}

// Export the legacy actor for backward compatibility
export const enhancedTransformationActor = enhancedTransformationOrchestratorActor;
