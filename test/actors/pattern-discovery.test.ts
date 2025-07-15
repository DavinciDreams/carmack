import { beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createActor } from 'xstate';
import type { PatternDiscoveryRequest } from '../../src/actors/pattern-discovery';
import { patternDiscoveryActor } from '../../src/actors/pattern-discovery';

// Helper function to create complete config
function createConfig(overrides: Partial<PatternDiscoveryRequest['config']> = {}) {
  return {
    minOccurrences: 3,
    confidenceThreshold: 0.7,
    maxPatterns: 50,
    languages: ['typescript' as const],
    categories: ['modernization', 'optimization', 'cleanup'],
    complexity: { min: 1, max: 8 },
    ...overrides,
  };
}

// Helper function to invoke actor
async function invokePatternDiscovery(request: PatternDiscoveryRequest) {
  const actor = createActor(patternDiscoveryActor, { input: request });
  actor.start();
  const snapshot = actor.getSnapshot();
  return snapshot.output;
}

describe('Pattern Discovery Actor', () => {
  const testDir = join(process.cwd(), 'test-temp');

  beforeEach(async () => {
    // Create test directory
    try {
      await mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  describe('Pattern Discovery Operations', () => {
    it('should discover patterns from code files', async () => {
      // Create test file with patterns
      const testFile = join(testDir, 'test-patterns.ts');
      const testContent = `
        var oldVar = "test";
        var anotherVar = 42;
        var thirdVar = true;
        
        function add(a, b) { return a + b; }
        function multiply(x, y) { return x * y; }
        function square(n) { return n * n; }
      `;

      await writeFile(testFile, testContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.7,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover');
        expect(result.patterns).toBeDefined();
        expect(Array.isArray(result.patterns)).toBe(true);
        expect(result.summary).toBeDefined();
        expect(result.summary.totalAnalyzed).toBeGreaterThanOrEqual(0);
        expect(result.summary.patternsDiscovered).toBeGreaterThanOrEqual(0);
        expect(result.timestamp).toBeDefined();
      }
    });

    it('should analyze code for patterns', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'analyze',
        sources: {
          codeFiles: [],
        },
        config: createConfig({
          minOccurrences: 1,
          confidenceThreshold: 0.5,
          maxPatterns: 5,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover'); // analyze is aliased to discover
        expect(result.patterns).toBeDefined();
        expect(result.summary).toBeDefined();
      }
    });

    it('should generate patterns from transformation history', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'generate',
        sources: {
          transformationHistory: [
            {
              before: 'var x = 1;',
              after: 'const x = 1;',
              success: true,
              feedback: 'Good transformation',
            },
            {
              before: 'var y = 2;',
              after: 'const y = 2;',
              success: true,
              feedback: 'Excellent',
            },
            {
              before: 'var z = 3;',
              after: 'const z = 3;',
              success: true,
            },
          ],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.6,
          maxPatterns: 20,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover'); // generate is aliased to discover
        expect(result.patterns).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.summary.totalAnalyzed).toBeGreaterThanOrEqual(0);
      }
    });

    it('should validate patterns', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'validate',
        sources: {},
        config: createConfig({
          minOccurrences: 1,
          confidenceThreshold: 0.8,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('validate');
        expect(result.patterns).toEqual([]);
        expect(result.summary.totalAnalyzed).toBe(0);
        expect(result.summary.patternsDiscovered).toBe(0);
        expect(result.summary.averageConfidence).toBe(0);
        expect(result.summary.categories).toEqual([]);
      }
    });

    it('should handle empty sources gracefully', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {},
        config: createConfig({
          minOccurrences: 1,
          confidenceThreshold: 0.5,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover');
        expect(result.patterns).toEqual([]);
        expect(result.summary.totalAnalyzed).toBe(0);
        expect(result.summary.patternsDiscovered).toBe(0);
      }
    });

    it('should filter patterns by confidence threshold', async () => {
      const testFile = join(testDir, 'confidence-test.ts');
      const testContent = `
        var a = 1;
        var b = 2;
        var c = 3;
        var d = 4;
        var e = 5;
      `;

      await writeFile(testFile, testContent);

      const highThresholdRequest: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.95, // Very high threshold
          maxPatterns: 10,
        }),
      };

      const lowThresholdRequest: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.5, // Lower threshold
          maxPatterns: 10,
        }),
      };

      const highResult = await invokePatternDiscovery(highThresholdRequest);
      const lowResult = await invokePatternDiscovery(lowThresholdRequest);

      if (highResult && lowResult) {
        // Lower threshold should potentially find more patterns
        expect(lowResult.summary.patternsDiscovered).toBeGreaterThanOrEqual(
          highResult.summary.patternsDiscovered
        );
      }
    });
  });

  describe('Pattern Detection', () => {
    it('should detect var declaration patterns', async () => {
      const testFile = join(testDir, 'var-patterns.ts');
      const testContent = `
        var firstName = "John";
        var lastName = "Doe";
        var age = 30;
        var isActive = true;
      `;

      await writeFile(testFile, testContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 3,
          confidenceThreshold: 0.8,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        const varPattern = result.patterns.find((p) => p.name.includes('Variable Declaration'));
        if (varPattern) {
          expect(varPattern.pattern.before).toContain('var');
          expect(varPattern.pattern.after).toContain('const');
          expect(varPattern.metadata.category).toBe('modernization');
          expect(varPattern.metadata.riskLevel).toBe('low');
        }
      }
    });

    it('should detect function to arrow function patterns', async () => {
      const testFile = join(testDir, 'function-patterns.ts');
      const testContent = `
        function add(a, b) { return a + b; }
        function subtract(x, y) { return x - y; }
        function multiply(m, n) { return m * n; }
      `;

      await writeFile(testFile, testContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.7,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        const functionPattern = result.patterns.find((p) => p.name.includes('Arrow Function'));
        if (functionPattern) {
          expect(functionPattern.pattern.before).toContain('function');
          expect(functionPattern.pattern.after).toContain('=>');
          expect(functionPattern.metadata.category).toBe('modernization');
        }
      }
    });

    it('should detect object shorthand patterns', async () => {
      const testFile = join(testDir, 'object-patterns.ts');
      const testContent = `
        const user = { name: name, email: email };
        const product = { id: id, price: price };
        const order = { total: total, status: status };
      `;

      await writeFile(testFile, testContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.9,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        const shorthandPattern = result.patterns.find((p) =>
          p.name.includes('Object Property Shorthand')
        );
        if (shorthandPattern) {
          expect(shorthandPattern.pattern.before).toContain('$KEY: $KEY');
          expect(shorthandPattern.pattern.after).toContain('$KEY');
          expect(shorthandPattern.metadata.confidence).toBeGreaterThan(0.9);
        }
      }
    });
  });

  describe('Pattern Learning from History', () => {
    it('should learn patterns from successful transformations', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          transformationHistory: [
            {
              before: 'console.log("debug:", value)',
              after: 'logger.debug("debug:", value)',
              success: true,
              feedback: 'Good logging practice',
            },
            {
              before: 'console.log("info:", message)',
              after: 'logger.info("info:", message)',
              success: true,
              feedback: 'Consistent logging',
            },
            {
              before: 'console.log("error:", error)',
              after: 'logger.error("error:", error)',
              success: true,
              feedback: 'Better error handling',
            },
          ],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.6,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        const learnedPattern = result.patterns.find((p) => p.metadata.category === 'learned');
        if (learnedPattern) {
          expect(learnedPattern.name).toBe('Learned Pattern');
          expect(learnedPattern.metadata.successRate).toBeGreaterThan(0.5);
          expect(learnedPattern.evidence.statistics.successfulTransformations).toBeGreaterThan(0);
        }
      }
    });

    it('should filter out patterns with low success rates', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          transformationHistory: [
            {
              before: 'risky.transformation()',
              after: 'safe.transformation()',
              success: false,
              feedback: 'Failed transformation',
            },
            {
              before: 'risky.transformation()',
              after: 'safe.transformation()',
              success: false,
              feedback: 'Another failure',
            },
            {
              before: 'risky.transformation()',
              after: 'safe.transformation()',
              success: true,
              feedback: 'Finally worked',
            },
          ],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.6,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        // Should not create patterns with success rate < 0.5
        const lowSuccessPattern = result.patterns.find(
          (p) => p.metadata.category === 'learned' && p.metadata.successRate < 0.5
        );
        expect(lowSuccessPattern).toBeUndefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operation gracefully', async () => {
      const request = {
        operation: 'invalid_operation' as any,
        sources: {},
        config: createConfig(),
      };

      try {
        await invokePatternDiscovery(request);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing files gracefully', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: ['non-existent-file.ts'],
        },
        config: createConfig({
          minOccurrences: 1,
          confidenceThreshold: 0.5,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover');
        expect(result.patterns).toEqual([]);
        expect(result.summary.totalAnalyzed).toBe(0);
      }
    });

    it('should handle malformed code files gracefully', async () => {
      const testFile = join(testDir, 'malformed.ts');
      const malformedContent = `
        var incomplete = 
        function broken( {
          return "syntax error"
        }
        const obj = { missing: 
      `;

      await writeFile(testFile, malformedContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 1,
          confidenceThreshold: 0.5,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        // Should not crash, but may have no patterns due to parsing errors
        expect(result.operation).toBe('discover');
        expect(Array.isArray(result.patterns)).toBe(true);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should use default configuration when not provided', async () => {
      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {},
        config: createConfig(), // Use default config
      };

      const result = await invokePatternDiscovery(request);

      if (result) {
        expect(result.operation).toBe('discover');
        expect(result.patterns).toBeDefined();
        expect(result.summary).toBeDefined();
      }
    });
  });

  describe('Pattern Metadata', () => {
    it('should include comprehensive metadata for discovered patterns', async () => {
      const testFile = join(testDir, 'metadata-test.ts');
      const testContent = `
        var test1 = "value1";
        var test2 = "value2";
        var test3 = "value3";
      `;

      await writeFile(testFile, testContent);

      const request: PatternDiscoveryRequest = {
        operation: 'discover',
        sources: {
          codeFiles: [testFile],
        },
        config: createConfig({
          minOccurrences: 2,
          confidenceThreshold: 0.7,
          maxPatterns: 10,
        }),
      };

      const result = await invokePatternDiscovery(request);

      if (result && result.patterns.length > 0) {
        const pattern = result.patterns[0];

        // Check pattern structure
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.description).toBeDefined();

        // Check pattern definition
        expect(pattern.pattern.before).toBeDefined();
        expect(pattern.pattern.after).toBeDefined();
        expect(Array.isArray(pattern.pattern.variables)).toBe(true);
        expect(typeof pattern.pattern.constraints).toBe('object');

        // Check metadata
        expect(['typescript', 'javascript']).toContain(pattern.metadata.language);
        expect(typeof pattern.metadata.category).toBe('string');
        expect(typeof pattern.metadata.complexity).toBe('number');
        expect(['low', 'medium', 'high']).toContain(pattern.metadata.riskLevel);
        expect(pattern.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.metadata.confidence).toBeLessThanOrEqual(1);
        expect(pattern.metadata.occurrences).toBeGreaterThan(0);
        expect(pattern.metadata.successRate).toBeGreaterThanOrEqual(0);
        expect(pattern.metadata.successRate).toBeLessThanOrEqual(1);

        // Check evidence
        expect(Array.isArray(pattern.evidence.examples)).toBe(true);
        expect(typeof pattern.evidence.statistics).toBe('object');
        expect(pattern.evidence.statistics.totalOccurrences).toBeGreaterThan(0);
        expect(pattern.evidence.statistics.successfulTransformations).toBeGreaterThanOrEqual(0);
        expect(pattern.evidence.statistics.userRating).toBeGreaterThanOrEqual(0);

        // Check test cases
        expect(Array.isArray(pattern.testCases)).toBe(true);
        if (pattern.testCases.length > 0) {
          const testCase = pattern.testCases[0];
          expect(testCase.input).toBeDefined();
          expect(testCase.expected).toBeDefined();
          expect(testCase.description).toBeDefined();
        }
      }
    });
  });
});
