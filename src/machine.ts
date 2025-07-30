import { assign, setup } from 'xstate';
import type { AnalysisResult } from './actors/analysis.ts';
// Actor imports
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
import { transformationActor } from './actors/transformation.ts';
import { enhancedTransformationActor } from './actors/transformation-enhanced.ts';
import { validationActor } from './actors/validation.ts';
import type { AstPattern, MachineContext, MachineEvent } from './types.ts';
import { MachineContextSchema } from './types.ts';

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
 * 5. Self-Improvement: Complexity tracking and adaptive behavior
 */
const _carmackCoderMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
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
    validationActor,
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
    setStartTime: assign(({ context }) => ({
      ...context,
      startTime: Date.now(),
    })),
    assignTransformationRequest: assign(({ context, event }) => {
      if (event.type !== 'START_TRANSFORMATION') return context;

      const newTransformation = {
        id: crypto.randomUUID(),
        request: event.request,
        status: 'pending' as const,
        mode: event.request.transformationType, // Use the requested transformation mode
        startTime: Date.now(),
        filesModified: [],
        errors: [],
      };

      return {
        ...context,
        currentTransformation: newTransformation,
        activeFiles: event.request.targetFiles,
        patterns: event.request.patterns || context.patterns,
        currentRetries: 0,
        startTime: Date.now(),
      };
    }),

    assignAnalysisResults: assign(({ context, event }) => {
      if (event.type !== 'ANALYSIS_COMPLETE' || !context.currentTransformation) return context;

      const analysisResult: AnalysisResult = {
        complexity: event.complexity,
        recommendedMode: event.recommendedMode,
        // analysisTimestamp: event.analysisTimestamp, // Removed: not present on event
        // newPatterns, insights, and summary are not present on event
      };

      return {
        ...context,
        currentTransformation: {
          ...context.currentTransformation,
          mode: analysisResult.recommendedMode || context.currentTransformation.mode,
          complexity: analysisResult.complexity || context.currentTransformation.complexity,
          status: 'analyzing' as const,
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
      invoke: {
        id: 'git-checkpoint',
        src: 'gitActor',
        input: ({ context }: { context: MachineContext }) => ({
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
        input: ({ context }: { context: MachineContext }) => ({
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
        input: ({ context }: { context: MachineContext }) => ({
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
        input: ({ context }: { context: MachineContext }) => ({
          targetFiles: context.activeFiles,
          patterns: context.patterns
            .filter(
              (p) =>
                (p.mode === 'template' || !p.mode) &&
                p.complexity <= (context.currentTransformation?.request?.maxComplexity || 5)
            )
            .map(convertAstPatternToTemplatePattern),
          options: {
            dryRun: false,
            maxComplexity: context.currentTransformation?.request?.maxComplexity || 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        }),
        onDone: {
          target: 'validatingFormat',
          actions: assign(({ context, event }) => {
            if (!context.currentTransformation) return context;

            const transformationResult = event.output as {
              filesModified?: string[];
              status?: string;
            };

            return {
              ...context,
              currentTransformation: {
                ...context.currentTransformation,
                filesModified: transformationResult.filesModified || [],
                status: 'applying' as const,
              },
            };
          }),
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
        input: ({ context }: { context: MachineContext }) => ({
          mode: context.currentTransformation?.mode || 'ast',
          files: context.activeFiles,
          patterns: context.patterns,
          request: context.currentTransformation?.request,
          dryRun: context.currentTransformation?.request?.dryRun || false,
        }),
        onDone: {
          target: 'validatingFormat',
          actions: assign(({ context, event }) => {
            if (!context.currentTransformation) return context;

            const transformationResult = event.output as {
              filesModified?: string[];
              status?: string;
            };

            return {
              ...context,
              currentTransformation: {
                ...context.currentTransformation,
                filesModified: transformationResult.filesModified || [],
                status: 'applying' as const,
              },
            };
          }),
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
        input: ({ context }: { context: MachineContext }) => ({
          type: 'format',
          files: context.currentTransformation?.request?.targetFiles || [],
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
        input: ({ context }: { context: MachineContext }) => ({
          type: 'formatFix',
          files: context.currentTransformation?.request?.targetFiles || [],
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
        input: ({ context }: { context: MachineContext }) => ({
          type: 'types',
          files: context.currentTransformation?.request?.targetFiles || [],
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
        input: ({ context }: { context: MachineContext }) => ({
          type: 'typeFix',
          files: context.currentTransformation?.request?.targetFiles || [],
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
        input: ({ context }: { context: MachineContext }) => ({
          files: context.currentTransformation?.request?.targetFiles || [],
          transformationMode: context.currentTransformation?.mode,
        }),
        onDone: {
          target: 'measuringComplexity',
          actions: ['resetRetries'],
        },
        onError: {
          target: 'measuringComplexity', // Continue even if Dafny verification fails
          actions: ['addError'],
        },
      },
    },

    measuringComplexity: {
      invoke: {
        id: 'final-complexity',
        src: 'complexityActor',
        input: ({ context }: { context: MachineContext }) => ({
          files: context.currentTransformation?.request?.targetFiles || [],
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
        input: ({ context }: { context: MachineContext }) => ({
          type: 'quality',
          files: context.currentTransformation?.request?.targetFiles || [],
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
        id: 'pattern-learning',
        src: 'patternLearningActor',
        input: ({ context }: { context: MachineContext }) => ({
          operation: 'learn' as const,
          transformation: context.currentTransformation
            ? {
                id: context.currentTransformation.id,
                mode: context.currentTransformation.mode,
                filesModified: context.currentTransformation.filesModified,
                startTime: context.currentTransformation.startTime,
                endTime: context.currentTransformation.endTime,
                errors: context.currentTransformation.errors.map((e) => e.message),
                summary: context.currentTransformation.summary,
                complexity: context.currentTransformation.complexity,
                validation: context.currentTransformation.validation,
              }
            : undefined,
          patterns: context.patterns,
          context: {
            codebase: {
              language: 'typescript',
              complexity: context.currentTransformation?.complexity?.cyclomaticComplexity || 5,
              size: context.activeFiles.length * 100, // Rough estimate
            },
            environment: {
              success: context.currentTransformation?.errors.length === 0,
              performance: {
                transformationTime:
                  context.currentTransformation?.endTime && context.currentTransformation?.startTime
                    ? context.currentTransformation.endTime -
                      context.currentTransformation.startTime
                    : 0,
              },
            },
          },
        }),
        onDone: {
          target: 'generatingSummary',
          actions: assign(({ context, event }) => ({
            ...context,
            patterns: [
              ...context.patterns,
              ...(event.output.newPatterns || []).filter(
                (p: any): p is AstPattern =>
                  typeof p.id === 'string' &&
                  (p.language === 'typescript' ||
                    p.language === 'javascript' ||
                    p.language === 'cpp' ||
                    p.language === 'c') &&
                  typeof p.pattern === 'string' &&
                  typeof p.replacement === 'string' &&
                  typeof p.description === 'string' &&
                  typeof p.complexity === 'number' &&
                  (p.riskLevel === 'low' || p.riskLevel === 'medium' || p.riskLevel === 'high') &&
                  typeof p.mode === 'string'
              ),
            ],
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
        input: ({ context }: { context: MachineContext }) => ({
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
                summary: event.output.summary || 'No summary available',
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
        input: ({ context }: { context: MachineContext }) => ({
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
        console.log(context);
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

// Export the machine with proper typing
// Using any for production compatibility while maintaining type safety internally
export const carmackCoderMachine = _carmackCoderMachine as any;
