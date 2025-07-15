import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createActor } from 'xstate';
import type { PipelineRequest } from '../../src/pipeline/production-pipeline';
import {
  defaultProductionConfig,
  productionPipelineActor,
} from '../../src/pipeline/production-pipeline';

describe('Production Pipeline', () => {
  const testFile = join(process.cwd(), 'test-file.ts');

  beforeEach(() => {
    // Create test file with patterns that can be transformed
    writeFileSync(
      testFile,
      `
function add(a, b) {
  console.log('Error: Invalid input');
  var result = a + b;;
  if (result == null) {
    return result;
  }
  return result;
}

export { add };
    `.trim()
    );
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  const createTestRequest = (overrides: Partial<PipelineRequest> = {}): PipelineRequest => ({
    files: [testFile],
    transformationRequest: {
      prompt: 'Add type annotations',
      targetFiles: [testFile],
      transformationType: 'template',
      maxComplexity: 15,
      dryRun: true,
      ...overrides.transformationRequest,
    },
    config: {
      ...defaultProductionConfig,
      ...overrides.config,
    },
    context: {
      projectType: 'typescript',
      framework: 'none',
      userId: 'test-user',
      sessionId: 'test-session',
      priority: 'normal',
      ...overrides.context,
    },
  });

  const invokePipeline = async (request: PipelineRequest): Promise<any> => {
    const actor = createActor(productionPipelineActor, { input: request });
    actor.start();

    return new Promise((resolve) => {
      actor.subscribe((state) => {
        if (state.status === 'done') {
          resolve(state.output);
          actor.stop();
        } else if (state.status === 'error') {
          resolve(state.error);
          actor.stop();
        }
      });
    });
  };

  describe('Basic Pipeline Execution', () => {
    it('should execute pipeline successfully with valid input', async () => {
      const request = createTestRequest();
      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.transformationId).toMatch(/^transform_\d+_[a-z0-9]+$/);
        expect(result.metadata.timestamp).toBeDefined();
        expect(result.metadata.version).toBe('1.0.0');
      }
    });

    it('should handle invalid input gracefully', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: '', // This will cause validation error
          targetFiles: [], // This will cause validation error
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
        expect(result.errors?.[0].stage).toBe('initialization');
        expect(result.errors?.[0].severity).toBe('critical');
      }
    });

    it('should handle missing files', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Test transformation',
          targetFiles: ['non-existent-file.ts'],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.success).toBe(false);
        expect(result.errors?.some((e) => e.stage === 'preprocessing')).toBe(true);
      }
    });
  });

  describe('Stage Execution', () => {
    it('should execute preprocessing stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add type annotations',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: false,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.preprocessing).toBeDefined();
        expect(result.performance.stageTimings.preprocessing).toBeGreaterThan(0);
      }
    });

    it('should execute pattern discovery stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Refactor functions',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings['pattern-discovery']).toBeDefined();
        expect(result.performance.stageTimings['pattern-discovery']).toBeGreaterThan(0);
      }
    });

    it('should skip pattern discovery when disabled', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Simple transformation',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
        config: {
          ...defaultProductionConfig,
          patterns: {
            ...defaultProductionConfig.patterns,
            enableLearning: false,
          },
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings['pattern-discovery']).toBeDefined();
      }
    });
  });

  describe('Transformation Types', () => {
    it('should execute template transformation', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add JSDoc comments',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.transformation).toBeDefined();
        expect(result.performance.stageTimings.transformation).toBeGreaterThan(0);
        expect(result.transformationsApplied.length).toBeGreaterThan(0);
        expect(result.transformationsApplied[0].type).toBe('template');
      }
    });

    it('should execute AST-grep transformation', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Refactor variable names',
          targetFiles: [testFile],
          transformationType: 'ast',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.transformation).toBeDefined();
        expect(result.transformationsApplied.length).toBeGreaterThan(0);
        expect(result.transformationsApplied[0].type).toBe('ast');
      }
    });

    it('should execute LLM transformation', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add comprehensive error handling',
          targetFiles: [testFile],
          transformationType: 'llm',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.transformation).toBeDefined();
        expect(result.transformationsApplied.length).toBeGreaterThan(0);
        expect(result.transformationsApplied[0].type).toBe('llm');
      }
    });

    it('should execute auto transformation with fallback', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Optimize performance',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.transformation).toBeDefined();
        expect(result.transformationsApplied.length).toBeGreaterThan(0);
        // Should use one of the available transformation types
        expect(['template', 'ast', 'llm']).toContain(result.transformationsApplied[0].type);
      }
    });

    it('should handle transformation failures with retry', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Complex invalid transformation',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
        config: {
          ...defaultProductionConfig,
          llm: {
            ...defaultProductionConfig.llm,
            retries: 2,
          },
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.transformation).toBeDefined();
      }
    });
  });

  describe('Validation Stage', () => {
    it('should execute validation stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add type safety',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.validation).toBeDefined();
        expect(result.qualityMetrics.typeErrors).toBeDefined();
        expect(result.qualityMetrics.formatIssues).toBeDefined();
      }
    });

    it('should handle validation failures', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Break syntax intentionally',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.validation).toBeDefined();
      }
    });
  });

  describe('Testing Stage', () => {
    it('should execute testing stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add unit tests',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.testing).toBeDefined();
        expect(result.qualityMetrics.testResults.passed).toBeDefined();
        expect(result.qualityMetrics.testResults.failed).toBeDefined();
        expect(result.qualityMetrics.testResults.coverage).toBeDefined();
      }
    });

    it('should handle testing failures', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Add failing tests',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.testing).toBeDefined();
      }
    });
  });

  describe('Feedback Stage', () => {
    it('should execute feedback stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Improve code quality',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.feedback).toBeDefined();
        expect(result.feedback.automaticScore).toBeDefined();
        expect(result.feedback.automaticScore).toBeGreaterThanOrEqual(0);
        expect(result.feedback.automaticScore).toBeLessThanOrEqual(1);
      }
    });

    it('should skip feedback when disabled', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Simple change',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
        config: {
          ...defaultProductionConfig,
          feedback: {
            ...defaultProductionConfig.feedback,
            enableCollection: false,
          },
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.feedback).toBeDefined();
      }
    });
  });

  describe('Postprocessing Stage', () => {
    it('should execute postprocessing stage', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Final cleanup',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.stageTimings.postprocessing).toBeDefined();
        expect(result.performance.stageTimings.postprocessing).toBeGreaterThan(0);
      }
    });
  });

  describe('End-to-End Integration', () => {
    it('should execute complete pipeline successfully', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Complete code transformation with types and tests',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.success).toBe(true);
        expect(result.transformationId).toBeDefined();
        expect(result.transformationsApplied.length).toBeGreaterThan(0);

        // Verify all stages executed
        expect(result.performance.stageTimings.preprocessing).toBeGreaterThan(0);
        expect(result.performance.stageTimings['pattern-discovery']).toBeGreaterThan(0);
        expect(result.performance.stageTimings.transformation).toBeGreaterThan(0);
        expect(result.performance.stageTimings.validation).toBeGreaterThan(0);
        expect(result.performance.stageTimings.testing).toBeGreaterThan(0);
        expect(result.performance.stageTimings.feedback).toBeGreaterThan(0);
        expect(result.performance.stageTimings.postprocessing).toBeGreaterThan(0);

        // Verify performance metrics
        expect(result.performance.totalExecutionTime).toBeGreaterThan(0);
        expect(result.performance.resourceUsage.memory).toBeGreaterThan(0);

        // Verify quality metrics
        expect(result.qualityMetrics).toBeDefined();
        expect(result.qualityMetrics.testResults).toBeDefined();

        // Verify feedback
        expect(result.feedback.automaticScore).toBeGreaterThanOrEqual(0);
        expect(result.feedback.recommendations).toBeDefined();

        // Verify metadata
        expect(result.metadata.timestamp).toBeDefined();
        expect(result.metadata.version).toBe('1.0.0');
        expect(['development', 'production']).toContain(result.metadata.environment);
      }
    });
  });

  describe('Pattern Learning Integration', () => {
    it('should learn patterns during transformation', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Learn from this transformation pattern',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
        config: {
          ...defaultProductionConfig,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.success).toBe(true);
        expect(result.transformationsApplied.length).toBeGreaterThan(0);

        // Verify pattern discovery executed
        expect(result.performance.stageTimings['pattern-discovery']).toBeGreaterThan(0);

        // Verify transformation metadata includes pattern info
        const appliedTransformation = result.transformationsApplied[0];
        expect(appliedTransformation.metadata).toBeDefined();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle timeout gracefully', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Long running transformation',
          targetFiles: [testFile],
          transformationType: 'auto',
          maxComplexity: 15,
          dryRun: true,
        },
        config: {
          ...defaultProductionConfig,
          llm: {
            ...defaultProductionConfig.llm,
            retries: 1,
            timeout: 1, // Very short timeout
          },
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.transformationId).toBeDefined();
        expect(result.performance.totalExecutionTime).toBeGreaterThan(0);

        // Should handle timeout gracefully
        if (result.errors && result.errors.length > 0) {
          const criticalErrors = result.errors.filter((e) => e.severity === 'critical');
          expect(criticalErrors.length).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle critical errors', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Cause critical error',
          targetFiles: [testFile],
          transformationType: 'llm', // Force LLM transformation to trigger the error
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        // When LLM transformation fails, the pipeline should fail
        expect(result.success).toBe(false);
        
        // Should have no transformations applied since LLM failed and it's the only method
        expect(result.transformationsApplied.length).toBe(0);
        
        // Should have errors recorded
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
        
        // The error should be from the transformation stage
        const transformationError = result.errors?.find(e => e.stage === 'transformation');
        expect(transformationError).toBeDefined();
        expect(transformationError?.severity).toBe('error');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const request = createTestRequest({
        transformationRequest: {
          prompt: 'Monitor performance',
          targetFiles: [testFile],
          transformationType: 'template',
          maxComplexity: 15,
          dryRun: true,
        },
      });

      const result = await invokePipeline(request);

      expect(result).toBeDefined();
      if (result) {
        expect(result.performance.totalExecutionTime).toBeGreaterThan(0);
        expect(result.performance.stageTimings).toBeDefined();

        // Verify all stage timings are recorded
        const expectedStages = [
          'preprocessing',
          'pattern-discovery',
          'transformation',
          'validation',
          'testing',
          'feedback',
          'postprocessing',
        ];
        for (const stage of expectedStages) {
          expect(result.performance.stageTimings[stage]).toBeDefined();
          expect(result.performance.stageTimings[stage]).toBeGreaterThanOrEqual(0);
        }

        expect(result.performance.resourceUsage.memory).toBeGreaterThan(0);
      }
    });
  });
});
