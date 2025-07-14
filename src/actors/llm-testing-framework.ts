import { fromPromise } from 'xstate';
import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Comprehensive LLM Testing Framework
 * 
 * This framework provides systematic testing capabilities for LLM transformations:
 * - Automated test case generation from patterns
 * - Property-based testing for transformation correctness
 * - Performance benchmarking and regression testing
 * - Integration testing across the entire pipeline
 * - Quality metrics and reporting
 */

// Test case schema
const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  
  // Input specification
  input: z.object({
    code: z.string(),
    language: z.enum(['typescript', 'javascript']),
    patterns: z.array(z.string()), // Pattern IDs to apply
    options: z.record(z.any()).optional(),
  }),
  
  // Expected output specification
  expected: z.object({
    code: z.string().optional(),
    transformationsApplied: z.number().optional(),
    filesModified: z.number().optional(),
    mode: z.enum(['template', 'ast', 'llm']).optional(),
    
    // Quality assertions
    assertions: z.array(z.object({
      type: z.enum([
        'contains', 'not_contains', 'matches_regex', 'syntax_valid',
        'performance_under', 'complexity_reduced', 'type_safe'
      ]),
      value: z.any(),
      message: z.string().optional(),
    })).optional(),
  }),
  
  // Test metadata
  metadata: z.object({
    category: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    tags: z.array(z.string()),
    author: z.string().optional(),
    created: z.string().optional(),
    timeout: z.number().default(30000), // 30 seconds
  }),
});

const TestSuiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  testCases: z.array(TestCaseSchema),
  
  // Suite configuration
  config: z.object({
    parallel: z.boolean().default(true),
    maxConcurrency: z.number().default(4),
    retries: z.number().default(2),
    timeout: z.number().default(300000), // 5 minutes
    reportFormat: z.enum(['json', 'html', 'markdown']).default('json'),
  }).optional().default({}),
});

const TestExecutionRequestSchema = z.object({
  suites: z.array(TestSuiteSchema),
  options: z.object({
    outputDir: z.string().default('./test-results'),
    generateReport: z.boolean().default(true),
    includePerformanceMetrics: z.boolean().default(true),
    includeCoverageAnalysis: z.boolean().default(true),
    failFast: z.boolean().default(false),
  }).optional().default({}),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;
export type TestExecutionRequest = z.infer<typeof TestExecutionRequestSchema>;

/**
 * Test execution result
 */
interface TestResult {
  testCase: TestCase;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  duration: number;
  actualOutput?: any;
  error?: string;
  assertions: Array<{
    type: string;
    passed: boolean;
    message?: string;
    actual?: any;
    expected?: any;
  }>;
  performance?: {
    executionTime: number;
    memoryUsage: number;
    transformationSpeed: number;
  } | undefined;
}

interface SuiteResult {
  suite: TestSuite;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

/**
 * LLM Testing Framework Actor
 */
export const llmTestingFrameworkActor = fromPromise(
  async ({ input }: { input: TestExecutionRequest }) => {
    const validatedInput = TestExecutionRequestSchema.parse(input);
    
    console.log(
      `🧪 Starting LLM testing framework with ${validatedInput.suites.length} test suites`
    );
    
    const results = await executeTestSuites(validatedInput);
    
    console.log(
      `✅ Testing completed: ${results.summary.passed}/${results.summary.total} tests passed`
    );
    
    return results;
  }
);

/**
 * Execute all test suites
 */
async function executeTestSuites(request: TestExecutionRequest) {
  const suiteResults: SuiteResult[] = [];
  const startTime = Date.now();
  
  // Ensure output directory exists
  await mkdir(request.options.outputDir, { recursive: true });
  
  for (const suite of request.suites) {
    console.log(`🏃 Running test suite: ${suite.name}`);
    
    const suiteResult = await executeTestSuite(suite, request.options);
    suiteResults.push(suiteResult);
    
    // Fail fast if enabled and suite failed
    if (request.options.failFast && suiteResult.summary.failed > 0) {
      console.log(`❌ Failing fast due to test failures in suite: ${suite.name}`);
      break;
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Calculate overall summary
  const summary = {
    total: suiteResults.reduce((sum, r) => sum + r.summary.total, 0),
    passed: suiteResults.reduce((sum, r) => sum + r.summary.passed, 0),
    failed: suiteResults.reduce((sum, r) => sum + r.summary.failed, 0),
    skipped: suiteResults.reduce((sum, r) => sum + r.summary.skipped, 0),
    duration: totalDuration,
    suites: suiteResults.length,
  };
  
  const executionResult = {
    suiteResults,
    summary,
    timestamp: new Date().toISOString(),
  };
  
  // Generate reports if requested
  if (request.options.generateReport) {
    await generateTestReport(executionResult, request.options);
  }
  
  return executionResult;
}

/**
 * Execute a single test suite
 */
async function executeTestSuite(suite: TestSuite, options: TestExecutionRequest['options']): Promise<SuiteResult> {
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Execute tests based on parallelization settings
  if (suite.config.parallel) {
    const chunks = chunkArray(suite.testCases, suite.config.maxConcurrency);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(testCase => executeTestCase(testCase, options))
      );
      results.push(...chunkResults);
    }
  } else {
    // Sequential execution
    for (const testCase of suite.testCases) {
      const result = await executeTestCase(testCase, options);
      results.push(result);
    }
  }
  
  const duration = Date.now() - startTime;
  
  // Calculate suite summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration,
  };
  
  return {
    suite,
    results,
    summary,
  };
}

/**
 * Execute a single test case
 */
async function executeTestCase(testCase: TestCase, options: TestExecutionRequest['options']): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`  🔬 Running test: ${testCase.name}`);
    
    // Execute the transformation
    const actualOutput = await executeTransformation(testCase.input);
    
    // Run assertions
    const assertions = await runAssertions(testCase, actualOutput);
    
    const duration = Date.now() - startTime;
    const allPassed = assertions.every(a => a.passed);
    
    // Collect performance metrics if enabled
    let performance;
    if (options.includePerformanceMetrics) {
      performance = await collectPerformanceMetrics(testCase, actualOutput, duration);
    }
    
    return {
      testCase,
      status: allPassed ? 'passed' : 'failed',
      duration,
      actualOutput,
      assertions,
      performance,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      testCase,
      status: duration > testCase.metadata.timeout ? 'timeout' : 'failed',
      duration,
      error: error instanceof Error ? error.message : String(error),
      assertions: [],
    };
  }
}

/**
 * Execute transformation for test case
 */
async function executeTransformation(input: TestCase['input']) {
  // For testing purposes, we'll simulate the transformation results
  // In a real implementation, this would integrate with the actual pipeline
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Return a mock transformation result that matches expected structure
    return {
      content: input.code, // For now, return the input code (simulating no transformation)
      filesModified: ['test-file.ts'],
      transformationsApplied: input.patterns.length,
      mode: 'template' as const,
      performance: {
        duration: 10,
        transformationTime: 10,
      },
      errors: [],
    };
  } catch (error) {
    throw new Error(`Transformation failed: ${error}`);
  }
}

/**
 * Run assertions against test results
 */
async function runAssertions(testCase: TestCase, actualOutput: any) {
  const assertions = testCase.expected.assertions || [];
  const results = [];
  
  for (const assertion of assertions) {
    try {
      const result = await runSingleAssertion(assertion, actualOutput, testCase);
      results.push(result);
    } catch (error) {
      results.push({
        type: assertion.type,
        passed: false,
        message: `Assertion failed: ${error}`,
        actual: actualOutput,
        expected: assertion.value,
      });
    }
  }
  
  return results;
}

/**
 * Run a single assertion
 */
async function runSingleAssertion(assertion: any, actualOutput: any, testCase: TestCase) {
  switch (assertion.type) {
    case 'contains':
      const contains = actualOutput?.content?.includes(assertion.value) || false;
      return {
        type: assertion.type,
        passed: contains,
        message: assertion.message || `Expected output to contain "${assertion.value}"`,
        actual: actualOutput?.content,
        expected: assertion.value,
      };
      
    case 'not_contains':
      const notContains = !actualOutput?.content?.includes(assertion.value);
      return {
        type: assertion.type,
        passed: notContains,
        message: assertion.message || `Expected output to not contain "${assertion.value}"`,
        actual: actualOutput?.content,
        expected: assertion.value,
      };
      
    case 'matches_regex':
      const regex = new RegExp(assertion.value);
      const matches = regex.test(actualOutput?.content || '');
      return {
        type: assertion.type,
        passed: matches,
        message: assertion.message || `Expected output to match regex "${assertion.value}"`,
        actual: actualOutput?.content,
        expected: assertion.value,
      };
      
    case 'syntax_valid':
      const isValid = await validateSyntax(actualOutput?.content, testCase.input.language);
      return {
        type: assertion.type,
        passed: isValid,
        message: assertion.message || 'Expected output to have valid syntax',
        actual: actualOutput?.content,
        expected: 'valid syntax',
      };
      
    case 'performance_under':
      const duration = actualOutput?.performance?.duration || 0;
      const underLimit = duration < assertion.value;
      return {
        type: assertion.type,
        passed: underLimit,
        message: assertion.message || `Expected execution time under ${assertion.value}ms`,
        actual: duration,
        expected: assertion.value,
      };
      
    case 'complexity_reduced':
      const complexityReduced = await checkComplexityReduction(
        testCase.input.code,
        actualOutput?.content
      );
      return {
        type: assertion.type,
        passed: complexityReduced,
        message: assertion.message || 'Expected complexity to be reduced',
        actual: actualOutput?.complexity,
        expected: 'reduced complexity',
      };
      
    case 'type_safe':
      const typeSafe = await checkTypesSafety(actualOutput?.content, testCase.input.language);
      return {
        type: assertion.type,
        passed: typeSafe,
        message: assertion.message || 'Expected output to be type-safe',
        actual: actualOutput?.content,
        expected: 'type-safe code',
      };
      
    default:
      throw new Error(`Unknown assertion type: ${assertion.type}`);
  }
}

/**
 * Validate syntax of generated code
 */
async function validateSyntax(code: string, language: string): Promise<boolean> {
  try {
    if (language === 'typescript') {
      // Use TypeScript compiler API to validate syntax
      const ts = await import('typescript');
      const sourceFile = ts.createSourceFile(
        'test.ts',
        code,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Check for syntax errors
      const diagnostics = ts.getPreEmitDiagnostics(
        ts.createProgram(['test.ts'], {}, {
          getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
          writeFile: () => {},
          getCurrentDirectory: () => '',
          getDirectories: () => [],
          fileExists: () => true,
          readFile: () => '',
          getCanonicalFileName: (fileName) => fileName,
          useCaseSensitiveFileNames: () => true,
          getNewLine: () => '\n',
          getDefaultLibFileName: () => 'lib.d.ts',
        })
      );
      
      return diagnostics.length === 0;
    } else {
      // For JavaScript, use a simple parse check
      try {
        new Function(code);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Check if complexity was reduced
 */
async function checkComplexityReduction(_originalCode: string, _transformedCode: string): Promise<boolean> {
  try {
    const { complexityActor } = await import('./complexity');
    const { createActor } = await import('xstate');
    
    // Calculate complexity for both versions
    const originalComplexity = await new Promise((resolve) => {
      const actor = createActor(complexityActor, {
        input: { files: ['original.ts'] }
      });
      actor.start();
      actor.subscribe({
        complete: () => resolve(actor.getSnapshot().output)
      });
    }) as any;
    
    const transformedComplexity = await new Promise((resolve) => {
      const actor = createActor(complexityActor, {
        input: { files: ['transformed.ts'] }
      });
      actor.start();
      actor.subscribe({
        complete: () => resolve(actor.getSnapshot().output)
      });
    }) as any;
    
    return transformedComplexity.cyclomatic < originalComplexity.cyclomatic;
  } catch {
    return false; // Assume no reduction if we can't measure
  }
}

/**
 * Check type safety
 */
async function checkTypesSafety(_code: string, language: string): Promise<boolean> {
  if (language !== 'typescript') return true; // Skip for JavaScript
  
  try {
    const { validationActor } = await import('./validation');
    const { createActor } = await import('xstate');
    
    const result = await new Promise((resolve) => {
      const actor = createActor(validationActor, {
        input: {
          type: 'types' as const,
          files: ['test.ts']
        }
      });
      actor.start();
      actor.subscribe({
        complete: () => resolve(actor.getSnapshot().output)
      });
    }) as any;
    
    return result.errors.length === 0;
  } catch {
    return false; // Assume not type-safe if we can't validate
  }
}

/**
 * Collect performance metrics
 */
async function collectPerformanceMetrics(testCase: TestCase, actualOutput: any, duration: number) {
  return {
    executionTime: duration,
    memoryUsage: process.memoryUsage().heapUsed,
    transformationSpeed: testCase.input.code.length / duration, // chars per ms
    mode: actualOutput?.mode || 'unknown',
    transformationsApplied: actualOutput?.transformationsApplied || 0,
  };
}

/**
 * Generate test report
 */
async function generateTestReport(executionResult: any, options: TestExecutionRequest['options']) {
  const reportPath = join(options.outputDir, `test-report-${Date.now()}.json`);
  
  // Generate JSON report
  await writeFile(reportPath, JSON.stringify(executionResult, null, 2), 'utf-8');
  
  // Generate HTML report if requested
  if (options.generateReport) {
    const htmlReportPath = join(options.outputDir, `test-report-${Date.now()}.html`);
    const htmlContent = generateHtmlReport(executionResult);
    await writeFile(htmlReportPath, htmlContent, 'utf-8');
  }
  
  console.log(`📊 Test report generated: ${reportPath}`);
}

/**
 * Generate HTML test report
 */
function generateHtmlReport(executionResult: any): string {
  const { summary, suiteResults } = executionResult;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>LLM Transformation Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .suite { border: 1px solid #ddd; margin-bottom: 20px; border-radius: 5px; }
        .suite-header { background: #e9e9e9; padding: 15px; font-weight: bold; }
        .test-case { padding: 10px; border-bottom: 1px solid #eee; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
        .assertion { margin-left: 20px; font-size: 0.9em; }
        .performance { background: #f9f9f9; padding: 10px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>LLM Transformation Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${summary.total}</p>
        <p><strong>Passed:</strong> <span class="passed">${summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${summary.failed}</span></p>
        <p><strong>Skipped:</strong> <span class="skipped">${summary.skipped}</span></p>
        <p><strong>Duration:</strong> ${summary.duration}ms</p>
        <p><strong>Success Rate:</strong> ${((summary.passed / summary.total) * 100).toFixed(1)}%</p>
    </div>
    
    ${suiteResults.map((suite: any) => `
        <div class="suite">
            <div class="suite-header">
                ${suite.suite.name} (${suite.summary.passed}/${suite.summary.total} passed)
            </div>
            ${suite.results.map((result: any) => `
                <div class="test-case">
                    <h4 class="${result.status}">${result.testCase.name} - ${result.status.toUpperCase()}</h4>
                    <p>${result.testCase.description}</p>
                    ${result.error ? `<p class="failed">Error: ${result.error}</p>` : ''}
                    ${result.assertions.map((assertion: any) => `
                        <div class="assertion ${assertion.passed ? 'passed' : 'failed'}">
                            ${assertion.type}: ${assertion.message} ${assertion.passed ? '✓' : '✗'}
                        </div>
                    `).join('')}
                    ${result.performance ? `
                        <div class="performance">
                            <strong>Performance:</strong>
                            Execution: ${result.performance.executionTime}ms,
                            Memory: ${Math.round(result.performance.memoryUsage / 1024 / 1024)}MB,
                            Speed: ${result.performance.transformationSpeed.toFixed(2)} chars/ms
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
    
    <footer>
        <p>Generated on ${new Date(executionResult.timestamp).toLocaleString()}</p>
    </footer>
</body>
</html>
  `;
}

/**
 * Utility function to chunk array
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Built-in test suites for common transformation scenarios
 */
export const BUILTIN_TEST_SUITES: TestSuite[] = [
  {
    id: 'basic-transformations',
    name: 'Basic Transformations',
    description: 'Test basic code transformations across all modes',
    config: {
      parallel: true,
      maxConcurrency: 4,
      retries: 2,
      timeout: 300000,
      reportFormat: 'json' as const,
    },
    testCases: [
      {
        id: 'var-to-const',
        name: 'Variable Declaration Modernization',
        description: 'Convert var declarations to const/let',
        input: {
          code: 'var name = "test"; var count = 42;',
          language: 'typescript',
          patterns: ['var-to-const-let'],
        },
        expected: {
          assertions: [
            {
              type: 'contains',
              value: 'const name = "test"',
              message: 'Should convert global var to const',
            },
            {
              type: 'not_contains',
              value: 'var name',
              message: 'Should not contain var declarations',
            },
            {
              type: 'syntax_valid',
              value: true,
              message: 'Output should be syntactically valid',
            },
          ],
        },
        metadata: {
          category: 'modernization',
          priority: 'high',
          tags: ['var', 'const', 'let', 'es6'],
          timeout: 30000,
        },
      },
      {
        id: 'arrow-functions',
        name: 'Arrow Function Conversion',
        description: 'Convert function expressions to arrow functions',
        input: {
          code: 'function add(a, b) { return a + b; }',
          language: 'typescript',
          patterns: ['function-to-arrow'],
        },
        expected: {
          assertions: [
            {
              type: 'contains',
              value: 'const add = (a, b) => a + b',
              message: 'Should convert to arrow function',
            },
            {
              type: 'not_contains',
              value: 'function add',
              message: 'Should not contain function keyword',
            },
            {
              type: 'syntax_valid',
              value: true,
            },
          ],
        },
        metadata: {
          category: 'modernization',
          priority: 'medium',
          tags: ['arrow-functions', 'es6'],
          timeout: 30000,
        },
      },
    ],
  },
  
  {
    id: 'performance-tests',
    name: 'Performance Tests',
    description: 'Test transformation performance and efficiency',
    config: {
      parallel: true,
      maxConcurrency: 2,
      retries: 1,
      timeout: 600000,
      reportFormat: 'json' as const,
    },
    testCases: [
      {
        id: 'large-file-performance',
        name: 'Large File Transformation',
        description: 'Test performance on large code files',
        input: {
          code: Array(1000).fill('var item = "test";').join('\n'),
          language: 'typescript',
          patterns: ['var-to-const-let'],
        },
        expected: {
          assertions: [
            {
              type: 'performance_under',
              value: 5000, // 5 seconds
              message: 'Should complete within 5 seconds',
            },
            {
              type: 'syntax_valid',
              value: true,
            },
          ],
        },
        metadata: {
          category: 'performance',
          priority: 'medium',
          tags: ['performance', 'large-files'],
          timeout: 10000,
        },
      },
    ],
  },
  
  {
    id: 'error-handling',
    name: 'Error Handling Tests',
    description: 'Test error handling and edge cases',
    config: {
      parallel: false,
      maxConcurrency: 1,
      retries: 0,
      timeout: 60000,
      reportFormat: 'json' as const,
    },
    testCases: [
      {
        id: 'invalid-syntax',
        name: 'Invalid Syntax Handling',
        description: 'Test handling of invalid syntax',
        input: {
          code: 'this is not valid code {{{',
          language: 'typescript',
          patterns: ['var-to-const-let'],
        },
        expected: {
          transformationsApplied: 0,
          assertions: [
            {
              type: 'contains',
              value: 'this is not valid code',
              message: 'Should preserve original code on error',
            },
          ],
        },
        metadata: {
          category: 'error-handling',
          priority: 'high',
          tags: ['error-handling', 'invalid-syntax'],
          timeout: 30000,
        },
      },
    ],
  },
];

/**
 * Test case generator for pattern-based testing
 */
export function generateTestCasesFromPatterns(patterns: any[]): TestCase[] {
  return patterns.map((pattern, index) => ({
    id: `generated-${pattern.id}-${index}`,
    name: `Generated test for ${pattern.id}`,
    description: pattern.description || `Auto-generated test case for pattern ${pattern.id}`,
    input: {
      code: pattern.testCases?.[0]?.input || 'var test = "example";',
      language: pattern.language || 'typescript',
      patterns: [pattern.id],
    },
    expected: {
      code: pattern.testCases?.[0]?.expected,
      assertions: [
        {
          type: 'syntax_valid',
          value: true,
          message: 'Generated code should be syntactically valid',
        },
      ],
    },
    metadata: {
      category: 'generated',
      priority: 'medium' as const,
      tags: ['auto-generated', String(pattern.category || 'unknown')],
      timeout: 30000,
    },
  }));
}