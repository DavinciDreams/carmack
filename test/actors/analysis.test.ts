/**
 * Comprehensive tests for the Analysis Actor
 *
 * Tests complexity analysis, mode recommendation, learning capabilities,
 * and summarization functionality of the analysis actor.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { AnalysisResult } from '../../src/actors/analysis.js';
import { analysisActor } from '../../src/actors/analysis.js';
import {
  ActorTestUtils,
  CodeSampleGenerator,
  FileTestUtils,
  MockDataGenerator,
  PerformanceTestUtils,
  TestAssertions,
} from '../test-helpers.js';

describe('Analysis Actor', () => {
  let tempFiles: string[] = [];

  afterEach(async () => {
    // Clean up temporary files
    for (const file of tempFiles) {
      await FileTestUtils.cleanupTempFile(file);
    }
    tempFiles = [];
  });

  describe('Basic Analysis Functionality', () => {
    test('should analyze simple code and return complexity metrics', async () => {
      const code = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [MockDataGenerator.createAstPattern()],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = (await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        input
      )) as AnalysisResult;

      // Validate result structure
      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.recommendedMode).toBeDefined();
      expect(result.analysisTimestamp).toBeDefined();

      // Validate complexity metrics
      if (result.complexity) {
        TestAssertions.assertComplexityMetrics(result.complexity);
        expect(result.complexity.cyclomaticComplexity).toBeGreaterThan(0);
        expect(result.complexity.linesOfCode).toBeGreaterThan(0);
      }

      // Validate recommended mode
      expect(['template', 'ast', 'llm']).toContain(result.recommendedMode);
    });

    test('should handle multiple files correctly', async () => {
      const files = [
        await FileTestUtils.createTempFile(CodeSampleGenerator.generateVarCode()),
        await FileTestUtils.createTempFile(CodeSampleGenerator.generateLooseEqualityCode()),
        await FileTestUtils.createTempFile(CodeSampleGenerator.generatePromiseCode()),
      ];
      tempFiles.push(...files);

      const input = {
        files,
        patterns: [
          MockDataGenerator.createAstPattern({ id: 'var-to-const' }),
          MockDataGenerator.createAstPattern({ id: 'strict-equality' }),
        ],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = (await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        input
      )) as AnalysisResult;

      expect(result.complexity).toBeDefined();
      if (result.complexity) {
        // Multiple files should have higher complexity
        expect(result.complexity.linesOfCode).toBeGreaterThan(10);
        expect(result.complexity.functionCount).toBeGreaterThan(1);
      }
    });

    test('should handle empty file list gracefully', async () => {
      const input = {
        files: [],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
      if (result.complexity) {
        expect(result.complexity.linesOfCode).toBe(0);
        expect(result.complexity.functionCount).toBe(0);
      }
    });
  });

  describe('Complexity Analysis', () => {
    test('should calculate cyclomatic complexity correctly', async () => {
      const complexCode = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(complexCode);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result.complexity).toBeDefined();
      if (result.complexity) {
        // Complex code should have higher cyclomatic complexity
        expect(result.complexity.cyclomaticComplexity).toBeGreaterThan(5);
        expect(result.complexity.cognitiveComplexity).toBeGreaterThan(0);
        expect(result.complexity.nestingDepth).toBeGreaterThan(1);
      }
    });

    test('should detect functions and classes correctly', async () => {
      const codeWithClasses = `
class TestClass {
  method1() { return 1; }
  method2() { return 2; }
}

function standalone() { return 3; }
const arrow = () => 4;
`;
      const tempFile = await FileTestUtils.createTempFile(codeWithClasses);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result.complexity).toBeDefined();
      if (result.complexity) {
        expect(result.complexity.classCount).toBeGreaterThanOrEqual(1);
        expect(result.complexity.functionCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('should handle files with syntax errors gracefully', async () => {
      const errorCode = CodeSampleGenerator.generateErrorCode();
      const tempFile = await FileTestUtils.createTempFile(errorCode);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      // Should not throw an error, but handle gracefully
      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
    });
  });

  describe('Mode Recommendation', () => {
    test('should recommend template mode for simple transformations', async () => {
      const simpleCode = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(simpleCode);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [
          MockDataGenerator.createAstPattern({
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          }),
        ],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // Simple code with low complexity patterns should recommend template mode
      expect(result.recommendedMode).toBe('template');
    });

    test('should recommend AST mode for medium complexity', async () => {
      const mediumCode = CodeSampleGenerator.generatePromiseCode();
      const tempFile = await FileTestUtils.createTempFile(mediumCode);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [
          MockDataGenerator.createAstPattern({
            complexity: 3,
            riskLevel: 'medium',
            mode: 'ast',
          }),
        ],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // Medium complexity should recommend AST mode
      expect(['ast', 'llm']).toContain(result.recommendedMode);
    });

    test('should recommend LLM mode for high complexity', async () => {
      const complexCode = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(complexCode);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [], // No patterns available
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // High complexity with no patterns should recommend LLM mode
      expect(result.recommendedMode).toBe('llm');
    });
  });

  describe('Learning Operation', () => {
    test('should handle learning operation', async () => {
      const transformation = MockDataGenerator.createTransformationResult();
      const patterns = [MockDataGenerator.createAstPattern()];

      const input = {
        operation: 'learn' as const,
        transformation,
        patterns,
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result).toBeDefined();
      expect(result.newPatterns).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.newPatterns)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
    });

    test('should return empty arrays for learning when not implemented', async () => {
      const input = {
        operation: 'learn' as const,
        transformation: MockDataGenerator.createTransformationResult(),
        patterns: [MockDataGenerator.createAstPattern()],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // Current implementation returns empty arrays
      expect(result.newPatterns).toEqual([]);
      expect(result.insights).toEqual([]);
    });
  });

  describe('Summarization Operation', () => {
    test('should handle summarization operation', async () => {
      const transformation = MockDataGenerator.createTransformationResult({
        id: 'test-transformation-123',
        mode: 'ast',
      });

      const input = {
        operation: 'summarize' as const,
        transformation,
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary).toContain('test-transformation-123');
      expect(result.summary).toContain('ast');
    });

    test('should handle summarization with missing transformation data', async () => {
      const input = {
        operation: 'summarize' as const,
        transformation: undefined,
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result.summary).toBeDefined();
      expect(result.summary).toContain('unknown');
    });
  });

  describe('Performance Tests', () => {
    test('should complete analysis within reasonable time', async () => {
      const code = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [MockDataGenerator.createAstPattern()],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const { timeMs } = await PerformanceTestUtils.measureTime(async () => {
        return await ActorTestUtils.testActorWithTimeout(
          analysisActor,
          ActorTestUtils.createActorInput(input)
        );
      });

      // Analysis should complete within 1 second for small files
      expect(timeMs).toBeLessThan(1000);
    });

    test('should handle multiple files efficiently', async () => {
      const files = await Promise.all([
        FileTestUtils.createTempFile(CodeSampleGenerator.generateVarCode()),
        FileTestUtils.createTempFile(CodeSampleGenerator.generateLooseEqualityCode()),
        FileTestUtils.createTempFile(CodeSampleGenerator.generatePromiseCode()),
        FileTestUtils.createTempFile(CodeSampleGenerator.generateComplexCode()),
      ]);
      tempFiles.push(...files);

      const input = {
        files,
        patterns: [MockDataGenerator.createAstPattern(), MockDataGenerator.createAstPattern()],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const benchmark = await PerformanceTestUtils.benchmark(async () => {
        return await ActorTestUtils.testActorWithTimeout(
          analysisActor,
          ActorTestUtils.createActorInput(input)
        );
      }, 5);

      // Multiple files should still complete reasonably quickly
      expect(benchmark.avg).toBeLessThan(2000); // 2 seconds average
      expect(benchmark.p95).toBeLessThan(3000); // 3 seconds 95th percentile
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidInput = {
        files: null,
        patterns: undefined,
        request: 'invalid',
      };

      const error = await ActorTestUtils.testActorError(
        analysisActor,
        ActorTestUtils.createActorInput(invalidInput)
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('validation');
    });

    test('should handle non-existent files gracefully', async () => {
      const input = {
        files: ['/non/existent/file.ts'],
        patterns: [MockDataGenerator.createAstPattern()],
        request: MockDataGenerator.createTransformationRequest(),
      };

      // Should not throw, but handle gracefully with fallback
      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
    });

    test('should timeout on extremely long operations', async () => {
      const input = {
        files: [],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      // Test with very short timeout to ensure timeout mechanism works
      const error = await ActorTestUtils.testActorError(async (input) => {
        return await ActorTestUtils.testActorWithTimeout(
          analysisActor,
          input,
          1 // 1ms timeout - should definitely timeout
        );
      }, ActorTestUtils.createActorInput(input));

      expect(error).toBeDefined();
      expect(error?.message).toContain('timeout');
    });
  });

  describe('Integration with Patterns', () => {
    test('should consider pattern complexity in mode recommendation', async () => {
      const code = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      // Test with high complexity patterns
      const highComplexityPatterns = [
        MockDataGenerator.createAstPattern({ complexity: 8, mode: 'llm' }),
        MockDataGenerator.createAstPattern({ complexity: 9, mode: 'llm' }),
      ];

      const input = {
        files: [tempFile],
        patterns: highComplexityPatterns,
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // High complexity patterns should influence mode recommendation
      expect(['ast', 'llm']).toContain(result.recommendedMode);
    });

    test('should handle empty patterns array', async () => {
      const code = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const input = {
        files: [tempFile],
        patterns: [],
        request: MockDataGenerator.createTransformationRequest(),
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        analysisActor,
        ActorTestUtils.createActorInput(input)
      );

      // No patterns should default to LLM mode for safety
      expect(result.recommendedMode).toBe('llm');
    });
  });
});
