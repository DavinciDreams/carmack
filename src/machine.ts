import { assign, setup } from 'xstate';
// Actor imports
import { analysisActor } from './actors/analysis.js';
import { complexityActor } from './actors/complexity.js';
import { dafnyActor } from './actors/dafny.js';
import { gitActor } from './actors/git.js';
import { transformationActor } from './actors/transformation.js';
import { validationActor } from './actors/validation.js';
import type { MachineContext, MachineEvent } from './types.js';
import { MachineContextSchema, type TransformationMode } from './types.js';

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
 * 5. Self-Improvement: Complexity tracking and adaptive behavior
 */
export const carmackCoderMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
  },
  actors: {
    analysisActor,
    transformationActor,
    validationActor,
    gitActor,
    complexityActor,
    dafnyActor,
  },
  guards: {
    hasMaxRetriesExceeded: ({ context }) => {
      return context.currentRetries >= context.maxRetries;
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
    assignTransformationRequest: assign(({ context, event }) => {
      if (event.type !== 'START_TRANSFORMATION') return context;

      const newTransformation = {
        id: crypto.randomUUID(),
        request: event.request,
        status: 'pending' as const,
        mode: 'template' as TransformationMode, // Default, will be determined by analysis
        startTime: Date.now(),
        filesModified: [],
        errors: [],
      };

      return {
        ...context,
        currentTransformation: newTransformation,
        activeFiles: event.request.targetFiles,
        currentRetries: 0,
      };
    }),

    assignAnalysisResults: assign(({ context, event }) => {
      if (event.type !== 'ANALYSIS_COMPLETE' || !context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          mode: event.recommendedMode,
          complexity: event.complexity,
          status: 'analyzing' as const,
        },
      };
    }),

    assignTransformationResults: assign(({ context, event }) => {
      if (event.type !== 'TRANSFORMATION_APPLIED' || !context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          filesModified: event.filesModified,
          status: 'applying' as const,
        },
      };
    }),

    assignValidationResults: assign(({ context, event }) => {
      if (event.type !== 'VALIDATION_COMPLETE' || !context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          validation: event.result,
          status: 'validating' as const,
        },
      };
    }),

    addError: assign(({ context, event }) => {
      if (event.type !== 'ERROR_OCCURRED' || !context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          errors: [...context.currentTransformation.errors, event.error],
        },
      };
    }),

    incrementRetries: assign(({ context }) => ({
      ...context,
      currentRetries: context.currentRetries + 1,
    })),

    resetRetries: assign(({ context }) => ({
      ...context,
      currentRetries: 0,
    })),

    markCompleted: assign(({ context }) => {
      if (!context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          status: 'completed' as const,
          endTime: Date.now(),
        },
      };
    }),

    markFailed: assign(({ context }) => {
      if (!context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          status: 'failed' as const,
          endTime: Date.now(),
        },
      };
    }),

    markRolledBack: assign(({ context }) => {
      if (!context.currentTransformation) return context;

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          status: 'rolled_back' as const,
          endTime: Date.now(),
        },
      };
    }),

    logTransformation: ({ context }) => {
      if (context.currentTransformation) {
        console.log('Transformation:', JSON.stringify(context.currentTransformation, null, 2));
      }
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
      enableDafnyVerification: true,
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
      invoke: {
        id: 'git-checkpoint',
        src: 'gitActor',
        input: ({ context }) => ({
          operation: 'createCheckpoint',
          description: `Pre-transformation checkpoint - ${context.currentTransformation?.id}`,
        }),
        onDone: {
          target: 'analyzing',
          actions: assign(({ context, event }) => ({
            ...context,
            checkpoints: [...context.checkpoints, event.output],
          })),
        },
        onError: [
          {
            target: 'analyzing', // Continue without checkpoint if git is not available
            guard: ({ context }) => !context.config.gitIntegration,
          },
          {
            target: 'failed',
            actions: ['addError', 'markFailed'],
          },
        ],
      },
    },

    analyzing: {
      invoke: {
        id: 'analysis',
        src: 'analysisActor',
        input: ({ context }) => ({
          files: context.activeFiles,
          patterns: context.patterns,
          request: context.currentTransformation?.request,
        }),
        onDone: {
          target: 'reflecting',
          actions: ['assignAnalysisResults'],
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
        input: ({ context }) => ({
          files: context.activeFiles,
          metrics: context.currentTransformation?.complexity,
        }),
        onDone: {
          target: 'applyingTransformation',
          actions: assign(({ context, event }) => {
            if (!context.currentTransformation) return context;
            return {
              ...context,
              currentTransformation: {
                ...context.currentTransformation,
                complexity: event.output,
              },
            };
          }),
        },
        onError: {
          target: 'applyingTransformation', // Continue even if complexity analysis fails
          actions: ['addError'],
        },
      },
    },

    applyingTransformation: {
      invoke: {
        id: 'transformation',
        src: 'transformationActor',
        input: ({ context }) => ({
          mode: context.currentTransformation?.mode || 'template',
          files: context.activeFiles,
          patterns: context.patterns,
          request: context.currentTransformation?.request,
        }),
        onDone: {
          target: 'validatingFormat',
          actions: ['assignTransformationResults'],
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
        src: 'validationActor',
        input: ({ context }) => ({
          type: 'format',
          files: context.currentTransformation?.filesModified || [],
        }),
        onDone: [
          {
            target: 'fixingFormat',
            guard: 'hasValidationErrors',
            actions: ['assignValidationResults'],
          },
          {
            target: 'validatingTypes',
            actions: ['assignValidationResults'],
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
        src: 'validationActor',
        input: ({ context }) => ({
          type: 'formatFix',
          files: context.currentTransformation?.filesModified || [],
        }),
        onDone: {
          target: 'validatingTypes',
          actions: ['resetRetries'],
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
        src: 'validationActor',
        input: ({ context }) => ({
          type: 'types',
          files: context.currentTransformation?.filesModified || [],
        }),
        onDone: [
          {
            target: 'fixingTypes',
            guard: 'hasValidationErrors',
            actions: ['assignValidationResults'],
          },
          {
            target: 'verifyingWithDafny',
            guard: 'isDafnyVerificationEnabled',
            actions: ['assignValidationResults'],
          },
          {
            target: 'measuringComplexity',
            actions: ['assignValidationResults'],
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
        src: 'validationActor',
        input: ({ context }) => ({
          type: 'typeFix',
          files: context.currentTransformation?.filesModified || [],
          errors: context.currentTransformation?.validation?.errors || [],
        }),
        onDone: [
          {
            target: 'verifyingWithDafny',
            guard: 'isDafnyVerificationEnabled',
            actions: ['resetRetries'],
          },
          {
            target: 'measuringComplexity',
            actions: ['resetRetries'],
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
        input: ({ context }) => ({
          files: context.currentTransformation?.filesModified || [],
          transformationMode: context.currentTransformation?.mode,
        }),
        onDone: {
          target: 'measuringComplexity',
          actions: ['resetRetries'],
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

    measuringComplexity: {
      invoke: {
        id: 'final-complexity',
        src: 'complexityActor',
        input: ({ context }) => ({
          files: context.currentTransformation?.filesModified || [],
          baseline: context.currentTransformation?.complexity,
        }),
        onDone: [
          {
            target: 'analyzingQuality',
            guard: 'isComplexityThresholdExceeded',
            actions: assign(({ context, event }) => {
              if (!context.currentTransformation) return context;
              return {
                ...context,
                currentTransformation: {
                  ...context.currentTransformation,
                  complexity: event.output,
                },
              };
            }),
          },
          {
            target: 'learningFromFeedback',
            actions: assign(({ context, event }) => {
              if (!context.currentTransformation) return context;
              return {
                ...context,
                currentTransformation: {
                  ...context.currentTransformation,
                  complexity: event.output,
                },
              };
            }),
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
        src: 'validationActor',
        input: ({ context }) => ({
          type: 'quality',
          files: context.currentTransformation?.filesModified || [],
        }),
        onDone: {
          target: 'learningFromFeedback',
          actions: ['assignValidationResults'],
        },
        onError: {
          target: 'learningFromFeedback', // Continue even if quality analysis fails
          actions: ['addError'],
        },
      },
    },

    learningFromFeedback: {
      invoke: {
        id: 'learning',
        src: 'analysisActor',
        input: ({ context }) => ({
          operation: 'learn',
          transformation: context.currentTransformation,
          patterns: context.patterns,
        }),
        onDone: {
          target: 'generatingSummary',
          actions: assign(({ context, event }) => ({
            ...context,
            patterns: [...context.patterns, ...event.output.newPatterns],
          })),
        },
        onError: {
          target: 'generatingSummary', // Continue even if learning fails
          actions: ['addError'],
        },
      },
    },

    generatingSummary: {
      invoke: {
        id: 'summary',
        src: 'analysisActor',
        input: ({ context }) => ({
          operation: 'summarize',
          transformation: context.currentTransformation,
        }),
        onDone: {
          target: 'committingChanges',
          actions: assign(({ context, event }) => {
            if (!context.currentTransformation) return context;
            return {
              ...context,
              currentTransformation: {
                ...context.currentTransformation,
                summary: event.output.summary,
              },
            };
          }),
        },
        onError: {
          target: 'committingChanges', // Continue even if summary generation fails
          actions: ['addError'],
        },
      },
    },

    committingChanges: {
      invoke: {
        id: 'git-commit',
        src: 'gitActor',
        input: ({ context }) => ({
          operation: 'commit',
          message: context.currentTransformation?.summary || 'Automated code transformation',
          files: context.currentTransformation?.filesModified || [],
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
          target: 'analyzing',
          guard: ({ context }) => context.currentRetries < context.maxRetries,
          actions: ['resetRetries'],
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
        input: ({ context }) => ({
          operation: 'rollback',
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

  // Global error handling
  on: {
    ERROR_OCCURRED: {
      target: '.retrying',
      actions: ['addError', 'incrementRetries'],
    },
  },
});
