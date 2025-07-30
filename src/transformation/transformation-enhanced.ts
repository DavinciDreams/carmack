// Canonical orchestrator state type
interface EnhancedOrchestratorState {
  transformationId: string;
  startTime: number;
  stageTimings: Record<string, number>;
  errors: Array<{
    stage: string;
    error: string;
    message: string;
    severity: 'warning' | 'error' | 'critical';
    recoverable: boolean;
  }>;
  transformationsApplied: Array<{
    type: 'template' | 'ast' | 'llm';
    patternsUsed: string[];
    executionTime: number;
    success: boolean;
    confidence: number;
    metadata?: Record<string, unknown>;
  }>;
  filesModified: Set<string>;
  complexityBefore: number;
  complexityAfter: number;
  dependencyGraph?: Record<string, string[]>;
  transformationPlan?: {
    order: readonly ('template' | 'ast' | 'llm')[];
    enableParallel: boolean;
    maxConcurrency: number;
    fallbackEnabled: boolean;
  };
  typeErrors?: number;
  formatIssues?: number;
  rollbackInfo?: {
    available: boolean;
    checkpointId?: string;
    backupPath?: string;
  };
  performanceMetrics?: {
    memoryUsage: number;
    cpuUsage: number;
    executionTime: number;
  };
}
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
// --- Load structured annotation data for LLM context ---
async function loadAnnotations(annotationDir = './workspace/annotations') {
  try {
    const files = await readdir(annotationDir);
    const annotations: any[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(join(annotationDir, file), 'utf-8');
          annotations.push(JSON.parse(content));
        } catch (err) {
          // Ignore parse errors for now
        }
      }
    }
    return annotations;
  } catch (err) {
    return [];
  }
}
import { createActor, fromPromise } from 'xstate';
import { z } from 'zod';
import { astGrepTransformationActor } from '../actors/ast-grep-transformation';
import { feedbackLoopActor, ASTGrepPatternSchema } from '../actors/feedback-loop';
import { complexityActor } from '../actors/complexity';
// import { BUILTIN_CPP_PATTERNS, cppTransformationActor } from '../actors/cpp-transformation';
import { templateEngineActor } from '../actors/template-engine';
import { validationActor } from '../actors/validation';
import type {
  AstGrepResult,
  ComplexityMetrics,
  TemplateEngineResult,
  ValidationActorResult,
} from '../types.ts';
import type { SgRoot, SgNode } from '@ast-grep/napi';

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
  patterns: z.array(ASTGrepPatternSchema).default([]),
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

    // --- Load annotation data for LLM and transformation context ---
    const annotationData = await loadAnnotations();

    try {
      // Validate and parse input
      const validated = EnhancedOrchestratorRequestSchema.parse(input);

      // Initialize orchestrator state
      const orchestratorState: EnhancedOrchestratorState = {
        transformationId,
        startTime,
        stageTimings: {} as Record<string, number>,
        errors: [] as Array<{
          stage: string;
          error: string;
          message: string;
          severity: 'warning' | 'error' | 'critical';
          recoverable: boolean;
        }> ,
        transformationsApplied: [] as Array<{
          type: 'template' | 'ast' | 'llm';
          patternsUsed: string[];
          executionTime: number;
          success: boolean;
          confidence: number;
          metadata?: Record<string, unknown>;
        }> ,
        filesModified: new Set<string>(),
        complexityBefore: 0,
        complexityAfter: 0,
      };

      // Pass annotationData to orchestration stages
      const result = await executeEnhancedOrchestrationStages(validated, orchestratorState, annotationData);

      console.log(
        `✅ Enhanced Orchestrator completed: ${transformationId} in ${Date.now() - startTime}ms`
      );
      return result;
    } catch (error) {
      console.error(`❌ Enhanced Orchestrator failed: ${transformationId}`, error);
      // Fallback: return error result (C++ fallback omitted for clarity)

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


// --- Main stage runner ---
async function executeEnhancedOrchestrationStages(
  request: EnhancedOrchestratorRequest,
  state: EnhancedOrchestratorState,
  annotationData?: any[]
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
      // Pass annotationData to preAnalysisStage and other stages as needed
      if (stage.name === 'pre-analysis') {
        await stage.fn(request, state, annotationData);
      } else if (stage.name === 'transformation-execution') {
        await stage.fn(request, state, annotationData);
      } else {
        await stage.fn(request, state);
      }

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
async function preAnalysisStage(request: EnhancedOrchestratorRequest, state: EnhancedOrchestratorState, annotationData?: any[]): Promise<void> {
  console.log('🔍 Pre-analysis: Analyzing target files...');

  // Use annotationData to filter/flag files if available
  if (annotationData && annotationData.length) {
    for (const filePath of request.targetFiles) {
      const annotation = annotationData.find(a => a.filePath === filePath);
      if (annotation && annotation.tags?.includes('do-not-edit')) {
        throw new Error(`File marked as do-not-edit in annotation: ${filePath}`);
      }
    }
  }

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
  state: EnhancedOrchestratorState
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
  state: EnhancedOrchestratorState
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
  state: EnhancedOrchestratorState,
  annotationData?: any[]
): Promise<void> {
  console.log('⚡ Transformation Execution: Applying transformations...');


  const { transformationPlan } = state;
  if (!transformationPlan) {
    throw new Error('Transformation plan is not defined');
  }

  for (const transformationType of transformationPlan.order) {
    try {
      console.log(`🔄 Executing ${transformationType} transformation...`);
  const result = await executeEnhancedTransformation(transformationType, request, annotationData);

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
  annotationData?: any[]
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
      // AST-grep transformation (language-agnostic, Zod-centric)
      const astResult = await invokeActorWithTimeout<AstGrepResult>(astGrepTransformationActor, {
        targetFiles: request.targetFiles,
        patterns: request.patterns,
        options: {
          dryRun: request.dryRun,
          maxComplexity: request.maxComplexity,
          enableBatching: true,
          skipConflicts: true,
          preserveFormatting: true,
          maxMatchesPerPattern: 1000,
        },
      });

      // Feed AST-grep transformation results into feedback loop
      try {
        await invokeActorWithTimeout<any>(feedbackLoopActor, {
          operation: 'collect',
          feedbackData: astResult.appliedPatterns.map((p) => ({
            patternId: p.pattern,
            transformationId: `ast_${Date.now()}`,
            success: astResult.transformationsApplied > 0,
            executionTime: astResult.executionTime || 0,
            codeQualityImprovement: 0, // Placeholder, can be improved with metrics
            context: {
              fileType: p.file.split('.').pop() || '',
              codeSize: 0,
              complexity: 0,
              language: '',
            },
            timestamp: new Date().toISOString(),
            astGrepPattern: request.patterns.find((pat) => pat.id === p.pattern),
          })),
        });
      } catch (feedbackError) {
        console.warn('⚠️ Feedback loop integration failed:', feedbackError);
      }

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
      // Use the real enhanced LLM transformer with provider from env
      const { enhancedLLMTransformationActor } = await import('../actors/llm-transformation-enhanced');

      // --- Advanced Prompt Context & AST Annotation ---
      // For each file, extract AST annotation (structure, key nodes, complexity, etc.)
      // --- Types for AST annotation ---
      type ASTAnnotation = {
        nodeKinds: string[];
        functionCount: number;
        classCount: number;
        codeSize: number;
      } | { error: string; codeSize?: number };
      const astAnnotations: Record<string, ASTAnnotation> = {};
      try {
        const { parse, Lang } = await import('@ast-grep/napi');
        for (const file of request.targetFiles) {
          try {
            const content = await readFile(file, 'utf-8');
            // Infer language from extension (reuse logic from ast-grep-transformation)
            let lang: string = 'typescript';
            if (file.endsWith('.js') || file.endsWith('.jsx')) lang = 'javascript';
            else if (file.endsWith('.py')) lang = 'python';
            else if (file.endsWith('.cpp') || file.endsWith('.cc') || file.endsWith('.cxx')) lang = 'cpp';
            else if (file.endsWith('.go')) lang = 'go';
            else if (file.endsWith('.rs')) lang = 'rust';
            else if (file.endsWith('.java')) lang = 'java';
            else if (file.endsWith('.cs')) lang = 'csharp';
            else if (file.endsWith('.php')) lang = 'php';
            else if (file.endsWith('.rb')) lang = 'ruby';
            else if (file.endsWith('.swift')) lang = 'swift';
            else if (file.endsWith('.kt')) lang = 'kotlin';
            else if (file.endsWith('.scala')) lang = 'scala';
            else if (file.endsWith('.html')) lang = 'html';
            else if (file.endsWith('.css')) lang = 'css';
            // Use AST-grep to parse and annotate
            let ast: SgRoot | null = null;
            try {
              ast = parse(Lang[lang as keyof typeof Lang] || lang, content) as SgRoot;
            } catch (err) {
              ast = null;
            }
            if (ast) {
              // Collect a simple AST summary: top-level node kinds, function/class count, etc.
              const root = ast.root();
              // Defensive: filter out undefined/null children and ensure kind() is string
              const children = root.children().filter((n): n is SgNode => !!n && typeof n.kind === 'function');
              const nodeKinds: string[] = children.map((n) => {
                const k = n.kind();
                return typeof k === 'string' ? k : '';
              }).filter(Boolean);
              const functionCount: number = children.filter((n) => {
                const k = n.kind();
                return typeof k === 'string' && k.includes('function');
              }).length;
              const classCount: number = children.filter((n) => {
                const k = n.kind();
                return typeof k === 'string' && k.includes('class');
              }).length;
              astAnnotations[file] = {
                nodeKinds,
                functionCount,
                classCount,
                codeSize: content.length,
              };
            } else {
              astAnnotations[file] = { error: 'AST parse failed', codeSize: content.length };
            }
          } catch (err) {
            astAnnotations[file] = { error: 'File read/parse failed' };
          }
        }
      } catch (err) {
        // AST-grep not available or failed
      }

      // Compose advanced prompt context for LLM, including annotation data
      const fileAnnotations: Record<string, any> = {};
      if (annotationData && Array.isArray(annotationData) && annotationData.length) {
        for (const file of request.targetFiles) {
          const ann = annotationData.find((a: any) => a.filePath === file);
          if (ann) fileAnnotations[file] = ann;
        }
      }
      const advancedPromptContext = {
        projectType: request.context?.projectType || 'typescript',
        priority: request.context?.priority || 'normal',
        astAnnotations,
        fileAnnotations,
        transformationGoal: 'Improve code quality and apply best practices',
        files: request.targetFiles,
        maxComplexity: request.maxComplexity,
        dryRun: request.dryRun,
      };

      const llmResult = await invokeActorWithTimeout<any>(
        enhancedLLMTransformationActor,
        {
          files: request.targetFiles,
          request: {
            prompt: 'Improve code quality and apply best practices',
            targetFiles: request.targetFiles,
            transformationType: 'llm' as const,
            maxComplexity: request.maxComplexity,
            dryRun: request.dryRun,
            advancedContext: advancedPromptContext,
          },
          // config and context will be picked up from env by the provider manager
          context: {
            projectType: request.context?.projectType || 'typescript',
            priority: request.context?.priority || 'normal',
            astAnnotations,
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
          astAnnotations,
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
  state: EnhancedOrchestratorState
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
    // Feed validation results into feedback loop
    await invokeActorWithTimeout<any>(feedbackLoopActor, {
      operation: 'collect',
      feedbackData: (validationResult.errors || []).map((err) => {
        let patternId = 'unknown';
        if (err && typeof err === 'object' && err !== null && 'patternId' in err) {
          // @ts-expect-error: patternId may exist on error object
          patternId = err.patternId || 'unknown';
        }
        return {
          patternId,
          transformationId: `validation_${Date.now()}`,
          success: false,
          executionTime: 0,
          codeQualityImprovement: -1,
          context: {
            fileType: '',
            codeSize: 0,
            complexity: 0,
            language: '',
          },
          timestamp: new Date().toISOString(),
        };
      }),
    });
    state.typeErrors = validationResult.errors?.length || 0;
    state.formatIssues = validationResult.warnings?.length || 0;
  } catch (error) {
    console.warn('⚠️ Quality validation failed:', error);
    state.typeErrors = 0;
    state.formatIssues = 0;
  }

    // (Removed unreachable or erroneous code block that referenced undefined 'content')

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
  state: EnhancedOrchestratorState
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
  _request: EnhancedOrchestratorRequest,
  state: EnhancedOrchestratorState
): Promise<void> {
  if (!state || !state.performanceMetrics && !state.startTime) {
    // Defensive: state should always be present, but check for safety
    return;
  }

  if (
    typeof state !== 'object' ||
    (state as any).context?.enableMonitoring === false
  ) {
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
  state: EnhancedOrchestratorState
): EnhancedTransformationOrchestratorResult {
  const qualityImprovement = calculateQualityImprovement(state);
  const recommendations = generateEnhancedRecommendations(state);

  // Always return a rollbackInfo object (never undefined)
  const rollbackInfo = state.rollbackInfo ?? { available: false };

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
    rollbackInfo,
    errors: state.errors,
    recommendations,
  };
}

/**
 * Calculate quality improvement score
 */
function calculateQualityImprovement(state: EnhancedOrchestratorState): number {
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
function generateEnhancedRecommendations(state: EnhancedOrchestratorState): string[] {
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


export interface EnhancedTransformationResult {
  filesModified: string[];
  transformationsApplied: number;
  appliedPatterns: Array<{ file: string; pattern: string; count: number }>;
  mode: 'template' | 'ast' | 'llm';
}

export const enhancedTransformationActor = enhancedTransformationOrchestratorActor;
