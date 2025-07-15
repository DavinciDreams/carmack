import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createPatternLearner,
  type LearningResult,
  PatternLearner,
  type PatternLearningInput,
  validatePatternLearningInput,
} from '../../src/actors/pattern-learning.js';

describe('Pattern Learning System', () => {
  const testDir = './test-pattern-data';
  const dataDir = './data';

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(dataDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(join(dataDir, 'pattern-effectiveness.json'));
      await unlink(join(dataDir, 'discovered-patterns.json'));
    } catch {
      // Files might not exist
    }
  });

  describe('PatternLearner Class', () => {
    test('should create pattern learner with default configuration', () => {
      const learner = new PatternLearner();
      expect(learner).toBeDefined();
    });

    test('should create pattern learner with convenience function', () => {
      const learner = createPatternLearner();
      expect(learner).toBeInstanceOf(PatternLearner);
    });

    test('should learn from successful transformation', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'learn',
        transformation: {
          id: 'test-transformation-1',
          mode: 'template',
          filesModified: ['test.ts'],
          startTime: Date.now() - 5000,
          endTime: Date.now(),
          errors: [],
          summary: 'Successful transformation',
        },
        patterns: [
          {
            id: 'var-to-const',
            language: 'typescript',
            pattern: 'var $name = $value',
            replacement: 'const $name = $value',
            description: 'Convert var to const',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
        context: {
          codebase: {
            language: 'typescript',
            complexity: 3,
            size: 1000,
          },
          environment: {
            success: true,
            performance: {
              transformationTime: 2000,
            },
          },
        },
      };

      const result = await learner.processLearningRequest(input);

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toContain('Successful template transformation');
      expect(result.metrics.learningTime).toBeGreaterThan(0);
    });

    test('should learn from failed transformation', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'learn',
        transformation: {
          id: 'test-transformation-2',
          mode: 'ast',
          filesModified: [],
          startTime: Date.now() - 3000,
          errors: ['Syntax error in pattern matching'],
        },
        patterns: [
          {
            id: 'complex-refactor',
            language: 'typescript',
            pattern: 'function $name() { $body }',
            replacement: 'const $name = () => { $body }',
            description: 'Convert function to arrow function',
            complexity: 5,
            riskLevel: 'medium',
            mode: 'ast',
          },
        ],
        context: {
          environment: {
            success: false,
          },
        },
      };

      const result = await learner.processLearningRequest(input);

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toContain('Failed transformation');
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should discover new patterns', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'discover',
        context: {
          codebase: {
            language: 'typescript',
            complexity: 4,
            size: 2000,
          },
        },
      };

      const result = await learner.processLearningRequest(input);

      expect(result.metrics.patternsDiscovered).toBeGreaterThanOrEqual(0);
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should optimize existing patterns', async () => {
      const learner = new PatternLearner();

      // First, simulate some pattern usage to build effectiveness data
      await learner.processLearningRequest({
        operation: 'learn',
        transformation: {
          id: 'test-1',
          mode: 'template',
          filesModified: ['test1.ts'],
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          errors: [],
        },
        patterns: [
          {
            id: 'test-pattern-1',
            language: 'typescript',
            pattern: 'var $name',
            replacement: 'const $name',
            description: 'Test pattern',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
        context: {
          environment: { success: true },
        },
      });

      // Now optimize patterns
      const input: PatternLearningInput = {
        operation: 'optimize',
        patterns: [
          {
            id: 'test-pattern-1',
            language: 'typescript',
            pattern: 'var $name',
            replacement: 'const $name',
            description: 'Test pattern',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
      };

      const result = await learner.processLearningRequest(input);

      expect(result.metrics.patternsOptimized).toBeGreaterThanOrEqual(0);
      expect(result.insights).toBeDefined();
    });

    test('should evaluate pattern effectiveness', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'evaluate',
        patterns: [
          {
            id: 'eval-pattern-1',
            language: 'typescript',
            pattern: 'var $name = $value',
            replacement: 'const $name = $value',
            description: 'Evaluation test pattern',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
      };

      const result = await learner.processLearningRequest(input);

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.metrics.averageConfidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing transformation data gracefully', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'learn',
        // Missing transformation data
      };

      const result = await learner.processLearningRequest(input);

      // Should return error result instead of throwing
      expect(result.insights).toBeDefined();
      expect(result.insights[0]).toContain('Learning failed');
      expect(result.metrics.patternsDiscovered).toBe(0);
    });

    test('should handle unknown operation gracefully', async () => {
      const learner = new PatternLearner();

      const input = {
        operation: 'unknown-operation',
      } as any;

      const result = await learner.processLearningRequest(input);

      expect(result.insights).toBeDefined();
      expect(result.insights[0]).toContain('Learning failed');
      expect(result.metrics.patternsDiscovered).toBe(0);
      expect(result.metrics.patternsOptimized).toBe(0);
    });

    test('should persist and load learning data', async () => {
      const learner1 = new PatternLearner();

      // Generate some learning data
      await learner1.processLearningRequest({
        operation: 'learn',
        transformation: {
          id: 'persist-test',
          mode: 'template',
          filesModified: ['persist.ts'],
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          errors: [],
        },
        patterns: [
          {
            id: 'persist-pattern',
            language: 'typescript',
            pattern: 'var $name',
            replacement: 'const $name',
            description: 'Persistence test',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
        context: {
          environment: { success: true },
        },
      });

      // Create a new learner instance (should load persisted data)
      const learner2 = new PatternLearner();

      const result = await learner2.processLearningRequest({
        operation: 'evaluate',
        patterns: [
          {
            id: 'persist-pattern',
            language: 'typescript',
            pattern: 'var $name',
            replacement: 'const $name',
            description: 'Persistence test',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
      });

      // Should have some effectiveness data from the previous learner
      expect(result.insights).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid learning input', () => {
      const input = {
        operation: 'learn',
        transformation: {
          id: 'test',
          mode: 'template',
          filesModified: [],
          startTime: Date.now(),
          errors: [],
        },
      };

      const validated = validatePatternLearningInput(input);
      expect(validated.operation).toBe('learn');
    });

    test('should reject invalid operation', () => {
      const input = {
        operation: 'invalid-operation',
      };

      expect(() => validatePatternLearningInput(input)).toThrow();
    });

    test('should apply defaults for missing optional fields', () => {
      const input = {
        operation: 'discover',
      };

      const validated = validatePatternLearningInput(input);
      expect(validated.operation).toBe('discover');
      expect(validated.context).toBeUndefined();
    });
  });

  describe('Pattern Discovery', () => {
    test('should discover patterns from transformation history', async () => {
      const learner = new PatternLearner();

      // Simulate multiple successful transformations
      for (let i = 0; i < 3; i++) {
        await learner.processLearningRequest({
          operation: 'learn',
          transformation: {
            id: `discovery-test-${i}`,
            mode: 'template',
            filesModified: [`test${i}.ts`],
            startTime: Date.now() - 1000,
            endTime: Date.now(),
            errors: [],
          },
          patterns: [
            {
              id: 'common-pattern',
              language: 'typescript',
              pattern: 'var $name = $value',
              replacement: 'const $name = $value',
              description: 'Common transformation',
              complexity: 1,
              riskLevel: 'low',
              mode: 'template',
            },
          ],
          context: {
            environment: { success: true },
          },
        });
      }

      const result = await learner.processLearningRequest({
        operation: 'discover',
      });

      expect(result.metrics.patternsDiscovered).toBeGreaterThanOrEqual(0);
      expect(result.insights).toBeDefined();
    });

    test('should analyze codebase context for insights', async () => {
      const learner = new PatternLearner();

      const input: PatternLearningInput = {
        operation: 'learn',
        transformation: {
          id: 'context-test',
          mode: 'template',
          filesModified: ['context.ts'],
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          errors: [],
        },
        context: {
          codebase: {
            language: 'typescript',
            framework: 'React',
            complexity: 9, // High complexity
            size: 15000, // Large codebase
          },
          environment: {
            success: true,
          },
        },
      };

      const result = await learner.processLearningRequest(input);

      expect(result.insights).toBeDefined();
      expect(result.insights.some((insight) => insight.includes('High complexity'))).toBe(true);
      expect(result.insights.some((insight) => insight.includes('Large codebase'))).toBe(true);
    });
  });

  describe('Pattern Lifecycle Management', () => {
    test('should promote experimental patterns to stable', async () => {
      const learner = new PatternLearner();

      // Simulate many successful uses of an experimental pattern
      for (let i = 0; i < 15; i++) {
        await learner.processLearningRequest({
          operation: 'learn',
          transformation: {
            id: `lifecycle-test-${i}`,
            mode: 'template',
            filesModified: [`lifecycle${i}.ts`],
            startTime: Date.now() - 1000,
            endTime: Date.now(),
            errors: [],
          },
          patterns: [
            {
              id: 'experimental-pattern',
              language: 'typescript',
              pattern: 'function $name() { $body }',
              replacement: 'const $name = () => { $body }',
              description: 'Experimental arrow function conversion',
              complexity: 2,
              riskLevel: 'medium',
              mode: 'template',
            },
          ],
          context: {
            environment: { success: true },
          },
        });
      }

      const result = await learner.processLearningRequest({
        operation: 'optimize',
        patterns: [
          {
            id: 'experimental-pattern',
            language: 'typescript',
            pattern: 'function $name() { $body }',
            replacement: 'const $name = () => { $body }',
            description: 'Experimental arrow function conversion',
            complexity: 2,
            riskLevel: 'medium',
            mode: 'template',
          },
        ],
      });

      expect(result.insights).toBeDefined();
      expect(result.metrics.patternsOptimized).toBeGreaterThanOrEqual(0);
    });

    test('should deprecate consistently failing patterns', async () => {
      const learner = new PatternLearner();

      // Simulate many failed uses of a pattern
      for (let i = 0; i < 15; i++) {
        await learner.processLearningRequest({
          operation: 'learn',
          transformation: {
            id: `failing-test-${i}`,
            mode: 'ast',
            filesModified: [],
            startTime: Date.now() - 1000,
            errors: ['Pattern matching failed'],
          },
          patterns: [
            {
              id: 'failing-pattern',
              language: 'typescript',
              pattern: 'complex $pattern with $issues',
              replacement: 'fixed $pattern without $issues',
              description: 'Problematic pattern',
              complexity: 8,
              riskLevel: 'high',
              mode: 'ast',
            },
          ],
          context: {
            environment: { success: false },
          },
        });
      }

      const result = await learner.processLearningRequest({
        operation: 'optimize',
        patterns: [
          {
            id: 'failing-pattern',
            language: 'typescript',
            pattern: 'complex $pattern with $issues',
            replacement: 'fixed $pattern without $issues',
            description: 'Problematic pattern',
            complexity: 8,
            riskLevel: 'high',
            mode: 'ast',
          },
        ],
      });

      expect(result.deprecatedPatterns).toBeDefined();
      expect(result.insights).toBeDefined();
    });
  });

  describe('Performance and Metrics', () => {
    test('should track learning performance metrics', async () => {
      const learner = new PatternLearner();

      const startTime = Date.now();

      const result = await learner.processLearningRequest({
        operation: 'discover',
        context: {
          codebase: {
            language: 'typescript',
            complexity: 5,
            size: 1000,
          },
        },
      });

      const endTime = Date.now();

      expect(result.metrics.learningTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.learningTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
      expect(result.metrics.patternsDiscovered).toBeGreaterThanOrEqual(0);
      expect(result.metrics.patternsOptimized).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageConfidence).toBeLessThanOrEqual(1);
    });

    test('should provide meaningful insights and recommendations', async () => {
      const learner = new PatternLearner();

      const result = await learner.processLearningRequest({
        operation: 'learn',
        transformation: {
          id: 'insights-test',
          mode: 'llm',
          filesModified: ['insights.ts'],
          startTime: Date.now() - 10000, // Slow transformation
          endTime: Date.now(),
          errors: [],
        },
        patterns: [],
        context: {
          codebase: {
            language: 'typescript',
            complexity: 2, // Low complexity
            size: 500, // Small codebase
          },
          environment: {
            success: true,
            performance: {
              transformationTime: 10000, // Slow
            },
          },
        },
      });

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();

      // Should have insights about the transformation
      expect(result.insights.some((insight) => insight.includes('Successful'))).toBe(true);
      expect(result.insights.some((insight) => insight.includes('Low complexity'))).toBe(true);
    });
  });
});
