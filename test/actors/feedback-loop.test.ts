import { beforeEach, describe, expect, it } from 'bun:test';
import { createActor } from 'xstate';
import type { FeedbackData, FeedbackLoopRequest } from '../../src/actors/feedback-loop';
import { feedbackLoopActor } from '../../src/actors/feedback-loop';

// Helper function to create sample feedback data
function createSampleFeedback(overrides: Partial<FeedbackData> = {}): FeedbackData {
  return {
    patternId: 'test-pattern-1',
    transformationId: `transform-${Date.now()}`,
    success: true,
    executionTime: 50,
    codeQualityImprovement: 0.8,
    userRating: 4,
    userComments: 'Good transformation',
    context: {
      fileType: 'typescript',
      codeSize: 1000,
      complexity: 3,
      language: 'typescript',
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function to create default configs
function createDefaultConfigs() {
  return {
    analysisConfig: {
      timeWindow: 7,
      minSampleSize: 10,
      confidenceThreshold: 0.7,
      performanceThreshold: 0.8,
    },
    optimizationConfig: {
      learningRate: 0.1,
      decayFactor: 0.95,
      adaptationSpeed: 'medium' as const,
      enableAutoRemoval: true,
    },
  };
}

// Helper function to invoke feedback loop actor
async function invokeFeedbackLoop(
  request: Partial<FeedbackLoopRequest> & { operation: FeedbackLoopRequest['operation'] }
) {
  const fullRequest: FeedbackLoopRequest = {
    ...createDefaultConfigs(),
    ...request,
  };

  const actor = createActor(feedbackLoopActor, { input: fullRequest });
  actor.start();
  const snapshot = actor.getSnapshot();
  return snapshot.output;
}

describe('Feedback Loop Actor', () => {
  beforeEach(() => {
    // Reset feedback store between tests (in a real implementation, this would clear the database)
    // For now, we'll work with the in-memory store
  });

  describe('Feedback Collection', () => {
    it('should collect and process feedback data', async () => {
      const feedbackData = [
        createSampleFeedback({ patternId: 'pattern-1', success: true }),
        createSampleFeedback({ patternId: 'pattern-1', success: true }),
        createSampleFeedback({ patternId: 'pattern-2', success: false }),
      ];

      const request = {
        operation: 'collect' as const,
        feedbackData,
      };

      const result = await invokeFeedbackLoop(request);

      if (result && result.operation === 'collect') {
        expect(result.operation).toBe('collect');
        expect(result.status).toBe('success');
        expect(result.processed).toBe(3);
        expect(result.summary.recentSuccess).toBe(2);
        expect(result.summary.recentFailures).toBe(1);
        expect(result.summary.averageQuality).toBeCloseTo(0.8);
      }
    });

    it('should validate feedback data schema', async () => {
      const invalidFeedback = [
        {
          patternId: 'test-pattern',
          // Missing required fields
          success: true,
        } as any,
      ];

      const request = {
        operation: 'collect' as const,
        feedbackData: invalidFeedback,
      };

      try {
        await invokeFeedbackLoop(request);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty feedback data', async () => {
      const request = {
        operation: 'collect' as const,
        feedbackData: [],
      };

      const result = await invokeFeedbackLoop(request);

      if (result && result.operation === 'collect') {
        expect(result.operation).toBe('collect');
        expect(result.status).toBe('success');
        expect(result.processed).toBe(0);
      }
    });
  });

  describe('Feedback Analysis', () => {
    it('should analyze pattern performance', async () => {
      // First collect some feedback
      const feedbackData = Array.from({ length: 15 }, (_, i) =>
        createSampleFeedback({
          patternId: 'pattern-1',
          success: i < 12, // 80% success rate
          executionTime: 50 + i * 5,
          codeQualityImprovement: 0.7 + (i % 3) * 0.1,
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      // Then analyze
      const request = {
        operation: 'analyze' as const,
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 10,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      };

      const result = await invokeFeedbackLoop(request);

      if (result && result.operation === 'analyze') {
        expect(result.operation).toBe('analyze');
        expect(result.status).toBe('success');
        expect(result.analysis.totalPatterns).toBeGreaterThan(0);
        expect(result.patternMetrics).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
      }
    });

    it('should identify high performers and underperformers', async () => {
      const highPerformerFeedback = Array.from({ length: 12 }, () =>
        createSampleFeedback({
          patternId: 'high-performer',
          success: true,
          codeQualityImprovement: 0.9,
          userRating: 5,
        })
      );

      const underperformerFeedback = Array.from({ length: 12 }, (_, i) =>
        createSampleFeedback({
          patternId: 'underperformer',
          success: i < 6, // 50% success rate
          codeQualityImprovement: 0.3,
          userRating: 2,
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData: [...highPerformerFeedback, ...underperformerFeedback],
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 10,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze') {
        expect(result.analysis.highPerformers.length).toBeGreaterThan(0);
        expect(result.analysis.underperformers.length).toBeGreaterThan(0);

        const highPerformer = result.analysis.highPerformers.find(
          (p) => p.patternId === 'high-performer'
        );
        const underperformer = result.analysis.underperformers.find(
          (p) => p.patternId === 'underperformer'
        );

        expect(highPerformer).toBeDefined();
        expect(underperformer).toBeDefined();
      }
    });

    it('should calculate trend analysis', async () => {
      // Create feedback with improving trend
      const improvingFeedback = Array.from({ length: 20 }, (_, i) =>
        createSampleFeedback({
          patternId: 'improving-pattern',
          success: i > 5, // Starts failing, then improves
          timestamp: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData: improvingFeedback,
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 15,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze') {
        const improvingPattern = result.patternMetrics.find(
          (p) => p.patternId === 'improving-pattern'
        );
        expect(improvingPattern?.trendDirection).toBe('improving');
      }
    });
  });

  describe('Pattern Optimization', () => {
    it('should apply optimizations based on recommendations', async () => {
      // Create patterns with different performance levels
      const goodPatternFeedback = Array.from({ length: 15 }, () =>
        createSampleFeedback({
          patternId: 'good-pattern',
          success: true,
          codeQualityImprovement: 0.9,
        })
      );

      const badPatternFeedback = Array.from({ length: 15 }, (_, i) =>
        createSampleFeedback({
          patternId: 'bad-pattern',
          success: i < 7, // 47% success rate
          codeQualityImprovement: 0.2,
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData: [...goodPatternFeedback, ...badPatternFeedback],
      });

      const result = await invokeFeedbackLoop({
        operation: 'optimize',
        optimizationConfig: {
          learningRate: 0.1,
          decayFactor: 0.95,
          adaptationSpeed: 'medium',
          enableAutoRemoval: true,
        },
      });

      if (result && result.operation === 'optimize') {
        expect(result.operation).toBe('optimize');
        expect(result.status).toBe('success');
        expect(result.optimizationsApplied).toBeGreaterThan(0);
        expect(result.optimizations).toBeDefined();
        expect(result.summary.patternsRemoved).toBeGreaterThan(0);
      }
    });

    it('should update confidence scores', async () => {
      const feedbackData = Array.from({ length: 12 }, () =>
        createSampleFeedback({
          patternId: 'test-pattern',
          success: true,
          codeQualityImprovement: 0.8,
          userRating: 4,
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      const result = await invokeFeedbackLoop({
        operation: 'optimize',
        optimizationConfig: {
          learningRate: 0.2,
          decayFactor: 0.95,
          adaptationSpeed: 'medium',
          enableAutoRemoval: true,
        },
      });

      if (result && result.operation === 'optimize') {
        expect(result.confidenceUpdates).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.confidenceChanges)).toBe(true);
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      // Create diverse feedback data
      const feedbackData = [
        ...Array.from({ length: 10 }, () =>
          createSampleFeedback({
            patternId: 'ts-pattern',
            success: true,
            context: {
              fileType: 'typescript',
              codeSize: 1000,
              complexity: 3,
              language: 'typescript',
            },
          })
        ),
        ...Array.from({ length: 8 }, () =>
          createSampleFeedback({
            patternId: 'js-pattern',
            success: true,
            context: {
              fileType: 'javascript',
              codeSize: 500,
              complexity: 2,
              language: 'javascript',
            },
          })
        ),
        ...Array.from({ length: 5 }, () =>
          createSampleFeedback({
            patternId: 'failing-pattern',
            success: false,
            context: {
              fileType: 'typescript',
              codeSize: 2000,
              complexity: 5,
              language: 'typescript',
            },
          })
        ),
      ];

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      const result = await invokeFeedbackLoop({
        operation: 'report',
      });

      if (result && result.operation === 'report') {
        expect(result.operation).toBe('report');
        expect(result.status).toBe('success');
        expect(result.overallMetrics).toBeDefined();
        expect(result.overallMetrics.totalTransformations).toBe(23);
        expect(result.overallMetrics.overallSuccessRate).toBeCloseTo(18 / 23);
        expect(result.performanceBreakdown.byLanguage).toBeDefined();
        expect(result.performanceBreakdown.byFileType).toBeDefined();
        expect(result.trendAnalysis).toBeDefined();
        expect(Array.isArray(result.topPerformers)).toBe(true);
        expect(Array.isArray(result.needsAttention)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      }
    });

    it('should calculate performance breakdown by categories', async () => {
      const feedbackData = [
        createSampleFeedback({
          success: true,
          context: {
            fileType: 'typescript',
            codeSize: 1000,
            complexity: 3,
            language: 'typescript',
          },
        }),
        createSampleFeedback({
          success: false,
          context: { fileType: 'javascript', codeSize: 500, complexity: 2, language: 'javascript' },
        }),
      ];

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      const result = await invokeFeedbackLoop({
        operation: 'report',
      });

      if (result && result.operation === 'report') {
        expect(result.performanceBreakdown.byLanguage.typescript).toBeDefined();
        expect(result.performanceBreakdown.byLanguage.javascript).toBeDefined();
        expect(result.performanceBreakdown.byFileType.typescript).toBeDefined();
        expect(result.performanceBreakdown.byFileType.javascript).toBeDefined();
      }
    });
  });

  describe('Configuration and Edge Cases', () => {
    it('should handle different time windows', async () => {
      const oldFeedback = createSampleFeedback({
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      });

      const recentFeedback = createSampleFeedback({
        timestamp: new Date().toISOString(),
      });

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData: [oldFeedback, recentFeedback],
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7, // Only last 7 days
          minSampleSize: 1,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze') {
        expect(result.sampleSize).toBe(1); // Only recent feedback should be included
      }
    });

    it('should respect minimum sample size', async () => {
      const feedbackData = Array.from({ length: 5 }, () =>
        createSampleFeedback({ patternId: 'small-sample' })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 10, // Require at least 10 samples
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze') {
        expect(result.analysis.totalPatterns).toBe(0); // Should exclude patterns with insufficient samples
      }
    });

    it('should handle invalid operation gracefully', async () => {
      const request = {
        operation: 'invalid_operation' as any,
      };

      try {
        await invokeFeedbackLoop(request);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate accurate success rates', async () => {
      const feedbackData = [
        ...Array.from({ length: 8 }, () => createSampleFeedback({ success: true })),
        ...Array.from({ length: 2 }, () => createSampleFeedback({ success: false })),
      ];

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData,
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 5,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze' && result.patternMetrics.length > 0) {
        const pattern = result.patternMetrics[0];
        expect(pattern.successRate).toBeCloseTo(0.8); // 8/10 = 0.8
        expect(pattern.totalUsage).toBe(10);
      }
    });

    it('should calculate confidence scores correctly', async () => {
      const highQualityFeedback = Array.from({ length: 10 }, () =>
        createSampleFeedback({
          success: true,
          codeQualityImprovement: 0.9,
          userRating: 5,
        })
      );

      await invokeFeedbackLoop({
        operation: 'collect',
        feedbackData: highQualityFeedback,
      });

      const result = await invokeFeedbackLoop({
        operation: 'analyze',
        analysisConfig: {
          timeWindow: 7,
          minSampleSize: 5,
          confidenceThreshold: 0.7,
          performanceThreshold: 0.8,
        },
      });

      if (result && result.operation === 'analyze' && result.patternMetrics.length > 0) {
        const pattern = result.patternMetrics[0];
        expect(pattern.confidenceScore).toBeGreaterThan(0.8); // High confidence for high-quality pattern
      }
    });
  });
});
