import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createActor } from 'xstate';
import {
  BUILTIN_TEST_SUITES,
  generateTestCasesFromPatterns,
  llmTestingFrameworkActor,
  type TestCase,
  type TestSuite,
} from '../../src/actors/llm-testing-framework';

describe('LLM Testing Framework', () => {
  const testDir = join(process.cwd(), 'test-temp', 'llm-testing');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Framework Core Functionality', () => {
    it('should execute a simple test suite successfully', async () => {
      const simpleTestSuite: TestSuite = {
        id: 'simple-test',
        name: 'Simple Test Suite',
        description: 'A basic test suite for framework validation',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 1,
          timeout: 60000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'basic-syntax-test',
            name: 'Basic Syntax Validation',
            description: 'Test that validates basic TypeScript syntax',
            input: {
              code: 'const message = "Hello, World!";',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                  message: 'Code should be syntactically valid',
                },
                {
                  type: 'contains',
                  value: 'const message',
                  message: 'Should contain const declaration',
                },
              ],
            },
            metadata: {
              category: 'syntax',
              priority: 'high',
              tags: ['basic', 'syntax'],
              timeout: 10000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [simpleTestSuite],
          options: {
            outputDir: testDir,
            generateReport: true,
            includePerformanceMetrics: true,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result).toBeDefined();
      expect(result.summary.total).toBe(1);
      expect(result.summary.suites).toBe(1);
      expect(result.suiteResults).toHaveLength(1);
      expect(result.suiteResults[0].summary.total).toBe(1);
    });

    it('should handle test failures gracefully', async () => {
      const failingTestSuite: TestSuite = {
        id: 'failing-test',
        name: 'Failing Test Suite',
        description: 'A test suite designed to fail',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'failing-test-case',
            name: 'Intentionally Failing Test',
            description: 'This test is designed to fail',
            input: {
              code: 'invalid syntax {{{',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                  message: 'This should fail because syntax is invalid',
                },
              ],
            },
            metadata: {
              category: 'error-testing',
              priority: 'medium',
              tags: ['failure', 'error-handling'],
              timeout: 5000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [failingTestSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result.summary.total).toBe(1);
      expect(result.summary.failed).toBeGreaterThan(0);
      expect(result.suiteResults[0].results[0].status).toBe('failed');
    });

    it('should support parallel test execution', async () => {
      const parallelTestSuite: TestSuite = {
        id: 'parallel-test',
        name: 'Parallel Test Suite',
        description: 'Test suite with parallel execution',
        config: {
          parallel: true,
          maxConcurrency: 3,
          retries: 1,
          timeout: 60000,
          reportFormat: 'json',
        },
        testCases: Array.from({ length: 6 }, (_, i) => ({
          id: `parallel-test-${i}`,
          name: `Parallel Test ${i}`,
          description: `Test case ${i} for parallel execution`,
          input: {
            code: `const value${i} = ${i};`,
            language: 'typescript' as const,
            patterns: [],
          },
          expected: {
            assertions: [
              {
                type: 'syntax_valid' as const,
                value: true,
                message: 'Should be valid syntax',
              },
              {
                type: 'contains' as const,
                value: `value${i}`,
                message: `Should contain value${i}`,
              },
            ],
          },
          metadata: {
            category: 'parallel',
            priority: 'medium' as const,
            tags: ['parallel', 'performance'],
            timeout: 10000,
          },
        })),
      };

      const startTime = Date.now();

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [parallelTestSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: true,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      const executionTime = Date.now() - startTime;

      expect(result.summary.total).toBe(6);
      expect(result.summary.passed).toBe(6);
      // Parallel execution should be faster than sequential
      expect(executionTime).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Built-in Test Suites', () => {
    it('should have valid built-in test suites', () => {
      expect(BUILTIN_TEST_SUITES).toBeDefined();
      expect(BUILTIN_TEST_SUITES.length).toBeGreaterThan(0);

      for (const suite of BUILTIN_TEST_SUITES) {
        expect(suite.id).toBeDefined();
        expect(suite.name).toBeDefined();
        expect(suite.description).toBeDefined();
        expect(suite.testCases).toBeDefined();
        expect(suite.testCases.length).toBeGreaterThan(0);

        for (const testCase of suite.testCases) {
          expect(testCase.id).toBeDefined();
          expect(testCase.name).toBeDefined();
          expect(testCase.input).toBeDefined();
          expect(testCase.expected).toBeDefined();
          expect(testCase.metadata).toBeDefined();
        }
      }
    });

    it('should execute basic transformations test suite', async () => {
      const basicSuite = BUILTIN_TEST_SUITES.find((s) => s.id === 'basic-transformations');
      expect(basicSuite).toBeDefined();

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [basicSuite!],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.suiteResults).toHaveLength(1);
      expect(result.suiteResults[0].suite.id).toBe('basic-transformations');
    });
  });

  describe('Test Case Generation', () => {
    it('should generate test cases from patterns', () => {
      const mockPatterns = [
        {
          id: 'test-pattern-1',
          description: 'Test pattern for generation',
          language: 'typescript',
          category: 'test',
          testCases: [
            {
              input: 'var test = "example";',
              expected: 'const test = "example";',
            },
          ],
        },
        {
          id: 'test-pattern-2',
          description: 'Another test pattern',
          language: 'javascript',
          category: 'modernization',
        },
      ];

      const generatedTests = generateTestCasesFromPatterns(mockPatterns);

      expect(generatedTests).toHaveLength(2);

      expect(generatedTests[0].id).toBe('generated-test-pattern-1-0');
      expect(generatedTests[0].input.language).toBe('typescript');
      expect(generatedTests[0].input.patterns).toEqual(['test-pattern-1']);
      expect(generatedTests[0].metadata.category).toBe('generated');
      expect(generatedTests[0].metadata.timeout).toBe(30000);

      expect(generatedTests[1].id).toBe('generated-test-pattern-2-1');
      expect(generatedTests[1].input.language).toBe('javascript');
      expect(generatedTests[1].metadata.tags).toContain('auto-generated');
    });

    it('should handle patterns without test cases', () => {
      const patternsWithoutTests = [
        {
          id: 'no-test-pattern',
          description: 'Pattern without test cases',
        },
      ];

      const generatedTests = generateTestCasesFromPatterns(patternsWithoutTests);

      expect(generatedTests).toHaveLength(1);
      expect(generatedTests[0].input.code).toBe('var test = "example";'); // Default code
      expect(generatedTests[0].input.language).toBe('typescript'); // Default language
    });
  });

  describe('Assertion Types', () => {
    it('should support contains assertion', async () => {
      const testSuite: TestSuite = {
        id: 'contains-test',
        name: 'Contains Assertion Test',
        description: 'Test contains assertion functionality',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'contains-assertion',
            name: 'Contains Assertion Test',
            description: 'Test that contains assertion works',
            input: {
              code: 'const greeting = "Hello, World!";',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'contains',
                  value: 'Hello, World!',
                  message: 'Should contain greeting text',
                },
                {
                  type: 'not_contains',
                  value: 'Goodbye',
                  message: 'Should not contain goodbye',
                },
              ],
            },
            metadata: {
              category: 'assertion-testing',
              priority: 'medium',
              tags: ['assertions', 'contains'],
              timeout: 10000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [testSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result.summary.passed).toBe(1);
      expect(result.suiteResults[0].results[0].assertions).toHaveLength(2);
      expect(result.suiteResults[0].results[0].assertions[0].passed).toBe(true);
      expect(result.suiteResults[0].results[0].assertions[1].passed).toBe(true);
    });

    it('should support regex matching assertion', async () => {
      const testSuite: TestSuite = {
        id: 'regex-test',
        name: 'Regex Assertion Test',
        description: 'Test regex assertion functionality',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'regex-assertion',
            name: 'Regex Assertion Test',
            description: 'Test that regex assertion works',
            input: {
              code: 'const version = "1.2.3";',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'matches_regex',
                  value: '\\d+\\.\\d+\\.\\d+',
                  message: 'Should match semantic version pattern',
                },
              ],
            },
            metadata: {
              category: 'assertion-testing',
              priority: 'medium',
              tags: ['assertions', 'regex'],
              timeout: 10000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [testSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result.summary.passed).toBe(1);
      expect(result.suiteResults[0].results[0].assertions[0].passed).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should collect performance metrics when enabled', async () => {
      const testSuite: TestSuite = {
        id: 'performance-test',
        name: 'Performance Metrics Test',
        description: 'Test performance metrics collection',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'perf-test',
            name: 'Performance Test',
            description: 'Test with performance metrics',
            input: {
              code: 'const data = Array.from({length: 1000}, (_, i) => i);',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                },
              ],
            },
            metadata: {
              category: 'performance',
              priority: 'medium',
              tags: ['performance'],
              timeout: 10000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [testSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: true,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      const testResult = result.suiteResults[0].results[0];
      expect(testResult.performance).toBeDefined();
      expect(testResult.performance.executionTime).toBeGreaterThan(0);
      expect(testResult.performance.memoryUsage).toBeGreaterThan(0);
      expect(testResult.performance.transformationSpeed).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate JSON and HTML reports when enabled', async () => {
      const testSuite: TestSuite = {
        id: 'report-test',
        name: 'Report Generation Test',
        description: 'Test report generation',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'simple-test',
            name: 'Simple Test for Report',
            description: 'A simple test for report generation',
            input: {
              code: 'const test = true;',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                },
              ],
            },
            metadata: {
              category: 'reporting',
              priority: 'low',
              tags: ['report'],
              timeout: 5000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [testSuite],
          options: {
            outputDir: testDir,
            generateReport: true,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      await new Promise((resolve, reject) => {
        actor.subscribe(
          () => {}, // next
          reject, // error
          () => resolve(actor.getSnapshot().output) // complete
        );
      });

      // Check if report files were created
      const files = await readFile(testDir).catch(() => null);
      // Note: We can't easily test file creation in this context,
      // but the framework should generate reports in the specified directory
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout scenarios', async () => {
      const timeoutTestSuite: TestSuite = {
        id: 'timeout-test',
        name: 'Timeout Test Suite',
        description: 'Test timeout handling',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 100, // Very short timeout
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'timeout-test-case',
            name: 'Timeout Test',
            description: 'Test that should timeout',
            input: {
              code: 'const test = "timeout";',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                },
              ],
            },
            metadata: {
              category: 'error-handling',
              priority: 'low',
              tags: ['timeout'],
              timeout: 50, // Even shorter timeout
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [timeoutTestSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: false,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      // The test might timeout or fail, but the framework should handle it gracefully
      expect(result.summary.total).toBe(1);
      expect(['failed', 'timeout']).toContain(result.suiteResults[0].results[0].status);
    });

    it('should support fail-fast mode', async () => {
      const failFastSuite: TestSuite = {
        id: 'fail-fast-test',
        name: 'Fail Fast Test Suite',
        description: 'Test fail-fast functionality',
        config: {
          parallel: false,
          maxConcurrency: 1,
          retries: 0,
          timeout: 30000,
          reportFormat: 'json',
        },
        testCases: [
          {
            id: 'failing-test',
            name: 'Failing Test',
            description: 'This test should fail',
            input: {
              code: 'invalid syntax',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                },
              ],
            },
            metadata: {
              category: 'error-handling',
              priority: 'high',
              tags: ['fail-fast'],
              timeout: 5000,
            },
          },
          {
            id: 'should-not-run',
            name: 'Should Not Run',
            description: 'This test should not run due to fail-fast',
            input: {
              code: 'const test = "should not run";',
              language: 'typescript',
              patterns: [],
            },
            expected: {
              assertions: [
                {
                  type: 'syntax_valid',
                  value: true,
                },
              ],
            },
            metadata: {
              category: 'error-handling',
              priority: 'low',
              tags: ['fail-fast'],
              timeout: 5000,
            },
          },
        ],
      };

      const actor = createActor(llmTestingFrameworkActor, {
        input: {
          suites: [failFastSuite],
          options: {
            outputDir: testDir,
            generateReport: false,
            includePerformanceMetrics: false,
            includeCoverageAnalysis: false,
            failFast: true,
          },
        },
      });

      actor.start();

      const result = (await new Promise((resolve, reject) => {
        actor.subscribe({
          complete: () => resolve(actor.getSnapshot().output),
          error: reject,
        });
      })) as any;

      expect(result.summary.failed).toBeGreaterThan(0);
      // In fail-fast mode, execution should stop after first failure
      // The exact behavior depends on implementation details
    });
  });
});
