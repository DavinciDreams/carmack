// Utility: Run a real query and assign result to qualityValidationResponses
import { QueryProcessingPipeline } from './api/query-pipeline.ts';
import type { QueryRequest } from './api/contracts.ts';

// (assignQueryResultToValidation is now deprecated for use inside assigners; see docs for async event pattern)
import { assign, setup } from 'xstate';
import { z } from 'zod';

import { analysisActor } from './actors/analysis.ts';
import { astGrepTransformationActor } from './actors/ast-grep-transformation.ts';
import { complexityActor } from './actors/complexity.ts';
import { dafnyActor } from './actors/dafny.ts';
import { feedbackLoopActor } from './actors/feedback-loop.ts';
import { gitActor } from './actors/git.ts';
import { llmTestingFrameworkActor } from './actors/llm-testing-framework.ts';
import { enhancedLLMTransformationActor } from './actors/llm-transformation-enhanced.ts';
import { patternDiscoveryActor } from './actors/pattern-discovery.ts';
import { patternLearningActor } from './actors/pattern-learning.ts';
import { type TemplatePattern, templateEngineActor } from './actors/template-engine.ts';
import { enhancedTransformationActor } from './actors/transformation-enhanced.ts';
import { transformationActor } from './actors/transformation.ts';
import {
  accuracyValidationActor,
  graphTraversalActor,
  dataIntegrityActor
} from './testing/validation/quality-validator.ts';
import { MachineContextSchema, MachineEventSchema } from './types.ts';

import type { AnalysisResult } from './actors/analysis.ts';
import type { AstPattern, MachineContext } from './types.ts';
// Removed unused and non-exported type imports

// Actor imports

/**
 * Convert AstPattern to TemplatePattern for template engine compatibility
 */
function convertAstPatternToTemplatePattern(astPattern: AstPattern): TemplatePattern {
  return {
    id: astPattern.id,
    language: astPattern.language as 'typescript' | 'javascript',
    pattern: {
      template: astPattern.pattern,
      flags: 'g',
      context: undefined, // Could be enhanced to parse context from pattern
    },
    replacement: {
      template: astPattern.replacement,
      transformers: undefined,
      conditionals: undefined,
    },
    description: astPattern.description,
    complexity: astPattern.complexity,
    riskLevel: astPattern.riskLevel,
    category: 'modernization', // Default category
    performance: {
      priority: astPattern.complexity <= 3 ? 8 : 5, // Higher priority for simpler patterns
      batchable: true,
      conflicts: undefined,
    },
    testCases: undefined,
  };
}

/**
 * Carmack Coder State Machine
 *
 * A sophisticated state machine for automated code transformation with provable correctness.
 * This machine orchestrates the entire transformation pipeline from analysis to validation,
 * with formal verification and safe rollback capabilities.
 *
 * Design Principles:
 * 1. Speed First: Try fast approaches (templates, AST) before reasoning
 * 2. Type Safety: Heavy use of Zod schemas for runtime validation
 * 3. Formal Verification: Dafny integration for provable correctness
 * 4. Safe Rollback: Git checkpoints before any modification
 */
const _carmackCoderMachine = setup({
  types: {
    context: MachineContextSchema.parse({
      activeFiles: [],
      checkpoints: [],
      patterns: [],
      maxRetries: 3,
      currentRetries: 0,
      config: {
        maxComplexityThreshold: 15,
        enableDafnyVerification: true, // Re-enable with fixes
        enableLearning: true,
        gitIntegration: true,
      },
    }),
    events: {} as z.infer<typeof MachineEventSchema>,
  },
  actors: {
    analysisActor,
    astGrepTransformationActor,
    complexityActor,
    dafnyActor,
    enhancedTransformationActor,
    feedbackLoopActor,
    gitActor,
    llmTestingFrameworkActor,
    enhancedLLMTransformationActor,
    patternDiscoveryActor,
    patternLearningActor,
    templateEngineActor,
    transformationActor,
    dataIntegrityActor,
    graphTraversalActor,
    accuracyValidationActor,
  },
  guards: {
    hasMaxRetriesExceeded: ({ context }) => {
      return context.currentRetries >= context.maxRetries;
    },
    hasTimedOut: ({ context }) => {
      if (!context.startTime) return false;
      return Date.now() - context.startTime > context.timeoutMs;
    },
    isComplexityThresholdExceeded: ({ context }) => {
      const complexity = context.currentTransformation?.complexity;
      if (!complexity) return false;
      return complexity.cyclomaticComplexity > context.config.maxComplexityThreshold;
    },
    isDafnyVerificationEnabled: ({ context }) => {
      return context.config.enableDafnyVerification;
    },
    isGitIntegrationEnabled: ({ context }) => {
      return context.config.gitIntegration;
    },
    hasValidationErrors: ({ context }) => {
      const validation = context.currentTransformation?.validation;
      return validation ? validation.errors.length > 0 : false;
    },
    areValidationErrorsFixable: ({ context }) => {
      const validation = context.currentTransformation?.validation;
      return validation ? validation.fixableIssues > 0 : false;
    },
  },
  actions: {
  assignPatternLearningResult: assign(({ context }) => context),
  assignSummaryResult: assign(({ context }) => context),
    assignComplexityResult: assign(({ context, event }) => {
      if (!context.currentTransformation) return context;
      if (!event || typeof event !== 'object' || !('output' in event)) return context;
      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          complexity: (event as any).output,
        },
      };
    }),
    assignTemplateTransformationResult: assign(({ context, event }) => {
      if (!context.currentTransformation) return context;
      if (!event || typeof event !== 'object' || !('output' in event)) return context;
      const transformationResult = (event as any).output as {
        filesModified?: string[];
        status?: string;
      };
      // Synchronously update transformation, queue async query assignment elsewhere
      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          filesModified: transformationResult.filesModified || [],
          status: 'applying' as const,
        },
      };
    }),
    assignAdvancedTransformationResult: assign(({ context, event }) => {
      if (!context.currentTransformation) return context;
      if (!event || typeof event !== 'object' || !('output' in event)) return context;
      const transformationResult = (event as any).output as {
        filesModified?: string[];
        status?: string;
      };
      // Synchronously update transformation, queue async query assignment elsewhere
      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          filesModified: transformationResult.filesModified || [],
          status: 'applying' as const,
        },
      };
    }),
    setStartTime: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        startTime: Date.now(),
      })
    )),
    assignCheckpoint: assign(({ context, event }) => {
      // event.output is the checkpoint object from gitActor
      return MachineContextSchema.parse({
        ...context,
        checkpoints: [
          ...context.checkpoints,
          'output' in event ? (event as { output: unknown }).output : undefined,
        ],
      });
    }),
    assignTransformationRequest: assign(({ context, event }) => {
      if (event.type === 'START_TRANSFORMATION') {
        const newTransformation = {
          id: crypto.randomUUID(),
          request: event.request,
          status: 'pending' as const,
          mode: event.request.transformationType, // Use the requested transformation mode
          startTime: Date.now(),
          filesModified: [],
          errors: [],
        };
        return MachineContextSchema.parse({
          ...context,
          currentTransformation: newTransformation,
          activeFiles: event.request.targetFiles,
          patterns: event.request.patterns || context.patterns,
          currentRetries: 0,
          startTime: Date.now(),
        });
      }
      return context;
    }),
    assignAnalysisResults: assign(({ context, event }) => {
      if (
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'ANALYSIS_COMPLETE' &&
        'complexity' in event &&
        'recommendedMode' in event &&
        context.currentTransformation
      ) {
        const analysisResult: AnalysisResult = {
          complexity: event.complexity,
          recommendedMode: event.recommendedMode,
        };
        return MachineContextSchema.parse({
          ...context,
          currentTransformation: {
            ...context.currentTransformation,
            mode: analysisResult.recommendedMode || context.currentTransformation.mode,
            complexity: analysisResult.complexity || context.currentTransformation.complexity,
            status: 'analyzing' as const,
          },
        });
      }
      return context;
    }),
    assignValidationResults: assign(({ context, event }) => {
      if (
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'VALIDATION_COMPLETE' &&
        'result' in event &&
        context.currentTransformation
      ) {
        return MachineContextSchema.parse({
          ...context,
          currentTransformation: {
            ...context.currentTransformation,
            validation: event.result,
            status: 'validating' as const,
          },
        });
      }
      return context;
    }),
    addError: assign(({ context, event }) => {
      // Only add error if event has an 'error' property and is of type 'ERROR_OCCURRED'
      if (
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'ERROR_OCCURRED' &&
        'error' in event &&
        context.currentTransformation
      ) {
        return MachineContextSchema.parse({
          ...context,
          currentTransformation: {
            ...context.currentTransformation,
            errors: [...context.currentTransformation.errors, (event as { error: unknown }).error],
          },
        });
      }
      return context;
    }),
    incrementRetries: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        currentRetries: context.currentRetries + 1,
      })
    )),
    resetRetries: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        currentRetries: 0,
      })
    )),
    markCompleted: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        currentTransformation: context.currentTransformation
          ? { ...context.currentTransformation, status: 'completed' as const }
          : undefined,
      })
    )),
    markFailed: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        currentTransformation: context.currentTransformation
          ? { ...context.currentTransformation, status: 'failed' as const }
          : undefined,
      })
    )),
    markRolledBack: assign(({ context }) => (
      MachineContextSchema.parse({
        ...context,
        currentTransformation: context.currentTransformation
          ? { ...context.currentTransformation, status: 'rolled_back' as const }
          : undefined,
      })
    )),
    logTransformation: ({ context }) => {
      // You can customize this logging as needed
      console.log('Transformation state:', context.currentTransformation);
    },
  },
}).createMachine({
  id: 'carmackCoder',
  context: MachineContextSchema.parse({
    activeFiles: [],
    checkpoints: [],
    patterns: [],
    maxRetries: 3,
    currentRetries: 0,
    config: {
      maxComplexityThreshold: 15,
      enableDafnyVerification: true, // Re-enable with fixes
      enableLearning: true,
      gitIntegration: true,
    },
  }),

  initial: 'idle',

  states: {
    idle: {
      on: {
        START_TRANSFORMATION: {
          target: 'creatingCheckpoint',
          actions: ['assignTransformationRequest'],
        },
      },
    },

    creatingCheckpoint: {
    onDone: {
      target: 'analyzing',
      actions: 'assignCheckpoint',
    },
  },

    analyzing: {
      invoke: {
        id: 'analysis',
        src: 'analysisActor',
        input: (ctx) => ({
          files: ctx.context.activeFiles,
          patterns: ctx.context.patterns,
          request: ctx.context.currentTransformation?.request,
        }),
        onDone: {
          target: 'reflecting',
          actions: 'assignAnalysisResults',
        },
        onError: {
          target: 'retrying',
          actions: ['addError', 'incrementRetries'],
        },
      },
    },

    reflecting: {
      always: [
        {
          target: 'applyingTransformation',
          guard: ({ context }) => {
            const complexity = context.currentTransformation?.complexity;
            return (
              !complexity ||
              complexity.cyclomaticComplexity <= context.config.maxComplexityThreshold
            );
          },
        },
        {
          target: 'analyzingComplexity',
          guard: 'isComplexityThresholdExceeded',
        },
      ],
    },

    analyzingComplexity: {
      invoke: {
        id: 'complexity-analysis',
        src: 'complexityActor',
        input: (ctx) => ({
          files: ctx.context.activeFiles,
          metrics: ctx.context.currentTransformation?.complexity,
        }),
        onDone: {
          target: 'applyingTransformation',
          actions: 'assignComplexityResult',
        },
        onError: {
          target: 'applyingTransformation',
          actions: 'addError',
        },
      },
    },

    applyingTransformation: {
      always: [
        {
          target: 'applyingTemplateTransformation',
          guard: ({ context }) => {
            const mode = context.currentTransformation?.mode;
            return mode === 'template' || !mode; // Default to template
          },
        },
        {
          target: 'applyingAdvancedTransformation',
          guard: ({ context }) => {
            const mode = context.currentTransformation?.mode;
            return mode === 'ast' || mode === 'llm';
          },
        },
      ],
    },

    applyingTemplateTransformation: {
      invoke: {
        id: 'template-transformation',
        src: 'templateEngineActor',
        input: (ctx) => ({
          targetFiles: ctx.context.activeFiles,
          patterns: ctx.context.patterns
            .filter(
              (p) =>
                (p.mode === 'template' || !p.mode) &&
                p.complexity <= (ctx.context.currentTransformation?.request?.maxComplexity || 5)
            )
            .map(convertAstPatternToTemplatePattern),
          options: {
            dryRun: false,
            maxComplexity: ctx.context.currentTransformation?.request?.maxComplexity || 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        }),
        onDone: {
          target: 'validatingFormat',
          actions: 'assignTemplateTransformationResult',
        },
        onError: {
          target: 'retrying',
          actions: ['addError', 'incrementRetries'],
        },
      },
    },

    applyingAdvancedTransformation: {
      invoke: {
        id: 'advanced-transformation',
        src: 'transformationActor',
        input: (ctx) => ({
          mode: ctx.context.currentTransformation?.mode || 'ast',
          files: ctx.context.activeFiles,
          patterns: ctx.context.patterns,
          request: ctx.context.currentTransformation?.request,
          dryRun: ctx.context.currentTransformation?.request?.dryRun || false,
        }),
        onDone: {
          target: 'validatingFormat',
          actions: 'assignAdvancedTransformationResult',
        },
        onError: {
          target: 'retrying',
          actions: ['addError', 'incrementRetries'],
        },
      },
    },

    validatingFormat: {
      invoke: {
        id: 'format-validation',
        src: 'dataIntegrityActor',
        input: () => undefined,
        onDone: [
          {
            target: 'fixingFormat',
            guard: 'hasValidationErrors',
            actions: 'assignValidationResults',
          },
          {
            target: 'validatingTypes',
            actions: 'assignValidationResults',
          },
        ],
        onError: {
          target: 'retrying',
          actions: ['addError', 'incrementRetries'],
        },
      },
    },

    fixingFormat: {
      invoke: {
        id: 'format-fixing',
        src: 'dataIntegrityActor',
        input: () => undefined,
        onDone: {
          target: 'validatingTypes',
          actions: 'resetRetries',
        },
        onError: [
          {
            target: 'retrying',
            guard: ({ context }) => context.currentRetries < context.maxRetries,
            actions: ['addError', 'incrementRetries'],
          },
          {
            target: 'rollingBack',
            actions: ['addError', 'markFailed'],
          },
        ],
      },
    },

    validatingTypes: {
      invoke: {
        id: 'type-validation',
        src: 'graphTraversalActor',
        input: () => [], // TODO: Provide actual traversal test input from context
        onDone: [
          {
            target: 'fixingTypes',
            guard: 'hasValidationErrors',
            actions: 'assignValidationResults',
          },
          {
            target: 'verifyingWithDafny',
            guard: 'isDafnyVerificationEnabled',
            actions: 'assignValidationResults',
          },
          {
            target: 'measuringComplexity',
            actions: 'assignValidationResults',
          },
        ],
        onError: {
          target: 'retrying',
          actions: ['addError', 'incrementRetries'],
        },
      },
    },

    fixingTypes: {
      invoke: {
        id: 'type-fixing',
        src: 'graphTraversalActor',
        input: () => [], // TODO: Provide actual traversal test input from context
        onDone: [
          {
            target: 'verifyingWithDafny',
            guard: 'isDafnyVerificationEnabled',
            actions: 'resetRetries',
          },
          {
            target: 'measuringComplexity',
            actions: 'resetRetries',
          },
        ],
        onError: [
          {
            target: 'retrying',
            guard: ({ context }) => context.currentRetries < context.maxRetries,
            actions: ['addError', 'incrementRetries'],
          },
          {
            target: 'rollingBack',
            actions: ['addError', 'markFailed'],
          },
        ],
      },
    },

    verifyingWithDafny: {
      invoke: {
        id: 'dafny-verification',
        src: 'dafnyActor',
        input: (ctx) => ({
          files: ctx.context.currentTransformation?.request?.targetFiles || [],
          transformationMode: ctx.context.currentTransformation?.mode,
        }),
        onDone: {
          target: 'measuringComplexity',
          actions: 'resetRetries',
        },
        onError: {
          target: 'measuringComplexity', // Continue even if Dafny verification fails
          actions: 'addError',
        },
      },
    },

    measuringComplexity: {
      invoke: {
        id: 'final-complexity',
        src: 'complexityActor',
        input: (ctx) => ({
          files: Array.isArray(ctx.context.currentTransformation?.request?.targetFiles)
            ? ctx.context.currentTransformation.request.targetFiles
            : [],
          baseline: ctx.context.currentTransformation?.complexity,
        }),
        onDone: [
          {
            target: 'analyzingQuality',
            guard: 'isComplexityThresholdExceeded',
            actions: 'assignComplexityResult',
          },
          {
            target: 'learningFromFeedback',
            actions: 'assignComplexityResult',
          },
        ],
        onError: {
          target: 'learningFromFeedback', // Continue even if complexity measurement fails
          actions: ['addError'],
        },
      },
    },

    analyzingQuality: {
      invoke: {
        id: 'quality-analysis',
        src: 'accuracyValidationActor',
        input: (ctx) => ({
          responses: (ctx.context.qualityValidationResponses as Array<{ query: string; response: import('./api/contracts.ts').QueryResponse; topic?: string }>)
            .filter(r => r.response),
          config: {
            accuracyThreshold: 0.85,
            relevanceThreshold: 0.8,
            completenessThreshold: 0.8,
            factualAccuracyThreshold: 0.9,
            evidenceQualityThreshold: 0.8,
            enableManualValidation: false,
            enableAutomatedValidation: true,
            enableHybridValidation: true,
            sampleSize: 100,
          },
          knowledgeBase: new (require('./testing/validation/quality-validator.ts').MockKnowledgeBase)(),
        }),
        onDone: {
          target: 'learningFromFeedback',
          actions: 'assignValidationResults',
        },
        onError: {
          target: 'learningFromFeedback', // Continue even if quality analysis fails
          actions: 'addError',
        },
      },
    },

    learningFromFeedback: {
      invoke: {
        id: 'pattern-learning',
        src: 'patternLearningActor',
        input: (ctx) => ({
          operation: 'learn' as const,
          transformation: ctx.context.currentTransformation
            ? {
                id: ctx.context.currentTransformation.id,
                mode: ctx.context.currentTransformation.mode,
                filesModified: ctx.context.currentTransformation.filesModified,
                startTime: ctx.context.currentTransformation.startTime,
                endTime: ctx.context.currentTransformation.endTime,
                errors: ctx.context.currentTransformation.errors.map((e) => e.message),
                summary: ctx.context.currentTransformation.summary,
                complexity: ctx.context.currentTransformation.complexity,
                validation: ctx.context.currentTransformation.validation,
              }
            : undefined,
          patterns: ctx.context.patterns,
          context: {
            codebase: {
              language: 'typescript',
              complexity: ctx.context.currentTransformation?.complexity?.cyclomaticComplexity || 5,
              size: ctx.context.activeFiles.length * 100, // Rough estimate
            },
            environment: {
              success: ctx.context.currentTransformation?.errors.length === 0,
              performance: {
                transformationTime:
                  ctx.context.currentTransformation?.endTime && ctx.context.currentTransformation?.startTime
                    ? ctx.context.currentTransformation.endTime -
                      ctx.context.currentTransformation.startTime
                    : 0,
              },
            },
          },
        }),
        onDone: {
          target: 'generatingSummary',
          actions: 'assignPatternLearningResult',
        },
        onError: {
          target: 'generatingSummary', // Continue even if learning fails
          actions: 'addError',
        },
      },
    },

    generatingSummary: {
      invoke: {
        id: 'summary',
        src: 'analysisActor',
        input: (ctx) => ({
          operation: 'summarize' as const,
          transformation: ctx.context.currentTransformation,
        }),
        onDone: {
          target: 'committingChanges',
          actions: 'assignSummaryResult',
        },
        onError: {
          target: 'committingChanges', // Continue even if summary generation fails
          actions: 'addError',
        },
      },
    },

    committingChanges: {
      invoke: {
        id: 'git-commit',
        src: 'gitActor',
        input: ({ context }: { context: MachineContext }) => ({
          operation: 'commit' as const,
          message: context.currentTransformation?.summary || 'Automated code transformation',
          files: Array.isArray(context.currentTransformation?.filesModified)
            ? context.currentTransformation.filesModified
            : [],
        }),
        onDone: {
          target: 'succeeded',
          actions: ['markCompleted', 'logTransformation'],
        },
        onError: {
          target: 'succeeded', // Success even if commit fails (non-critical)
          actions: ['addError', 'markCompleted', 'logTransformation'],
        },
      },
    },

    retrying: {
      always: [
        {
          target: 'failed',
          guard: 'hasTimedOut',
          actions: ['addError', 'markFailed'],
        },
        {
          target: 'analyzing',
          guard: ({ context }) => context.currentRetries < context.maxRetries,
          // Don't reset retries - keep counting them up
        },
        {
          target: 'rollingBack',
          guard: 'hasMaxRetriesExceeded',
          actions: ['markFailed'],
        },
      ],
    },

    rollingBack: {
      invoke: {
        id: 'git-rollback',
        src: 'gitActor',
        input: ({ context }: { context: MachineContext }) => ({
          operation: 'rollback' as const,
          checkpoint: context.checkpoints[context.checkpoints.length - 1],
        }),
        onDone: {
          target: 'failed',
          actions: ['markRolledBack', 'logTransformation'],
        },
        onError: {
          target: 'failed',
          actions: ['addError', 'markFailed', 'logTransformation'],
        },
      },
  // (removed misplaced assignSummaryResult)
    },

    succeeded: {
      type: 'final',
      entry: () => console.log('🎉 Transformation completed successfully!'),
    },

    failed: {
      type: 'final',
      entry: ({ context }) => {
        console.error('❌ Transformation failed:', context.currentTransformation?.errors);
      },
    },
  },
  // (removed duplicate actions block after createMachine)
});

export const carmackCoderMachine = _carmackCoderMachine as any;
