# LLM Testing Framework Documentation

## Overview

The LLM Testing Framework is a comprehensive testing system designed specifically for validating LLM-powered code transformations. It provides systematic testing capabilities with automated test case generation, property-based testing, performance benchmarking, and detailed reporting.

## Architecture

### Core Components

1. **Test Framework Actor** (`src/actors/llm-testing-framework.ts`)
   - Main orchestrator for test execution
   - Handles parallel and sequential test execution
   - Manages test suites and individual test cases
   - Generates comprehensive reports

2. **Test Schema Validation**
   - Zod-based schemas for type safety
   - Runtime validation of test configurations
   - Structured test case definitions

3. **Assertion Engine**
   - Multiple assertion types for comprehensive validation
   - Extensible assertion system
   - Detailed failure reporting

4. **Performance Monitoring**
   - Execution time tracking
   - Memory usage monitoring
   - Transformation speed metrics

## Key Features

### 🧪 Test Suite Management
- **Parallel Execution**: Configurable concurrency for faster test runs
- **Sequential Execution**: For tests that require specific ordering
- **Retry Logic**: Automatic retry on transient failures
- **Timeout Handling**: Configurable timeouts per test and suite
- **Fail-Fast Mode**: Stop execution on first failure

### 📊 Assertion Types

#### Syntax Validation
```typescript
{
  type: 'syntax_valid',
  value: true,
  message: 'Code should be syntactically valid'
}
```

#### Content Assertions
```typescript
{
  type: 'contains',
  value: 'const name = "test"',
  message: 'Should contain const declaration'
}
```

#### Pattern Matching
```typescript
{
  type: 'matches_regex',
  value: '\\d+\\.\\d+\\.\\d+',
  message: 'Should match semantic version pattern'
}
```

#### Performance Assertions
```typescript
{
  type: 'performance_under',
  value: 5000, // milliseconds
  message: 'Should complete within 5 seconds'
}
```

#### Quality Assertions
```typescript
{
  type: 'complexity_reduced',
  value: true,
  message: 'Should reduce code complexity'
}
```

### 📈 Performance Metrics

The framework automatically collects:
- **Execution Time**: Total time for transformation
- **Memory Usage**: Peak memory consumption
- **Transformation Speed**: Characters processed per millisecond
- **Mode Detection**: Which transformation mode was used

### 📋 Built-in Test Suites

#### Basic Transformations Suite
Tests fundamental code transformations:
- Variable declaration modernization (var → const/let)
- Arrow function conversion
- Object property shorthand
- Array method modernization

#### Performance Test Suite
Validates transformation performance:
- Large file handling
- Batch processing efficiency
- Memory usage optimization

#### Error Handling Suite
Tests robustness:
- Invalid syntax handling
- Missing file scenarios
- Timeout management
- Graceful degradation

## Usage Examples

### Simple Test Suite
```typescript
const testSuite: TestSuite = {
  id: 'my-test-suite',
  name: 'My Test Suite',
  description: 'Custom test suite for validation',
  config: {
    parallel: true,
    maxConcurrency: 4,
    retries: 2,
    timeout: 300000,
    reportFormat: 'json',
  },
  testCases: [
    {
      id: 'basic-test',
      name: 'Basic Transformation Test',
      description: 'Test basic code transformation',
      input: {
        code: 'var message = "Hello, World!";',
        language: 'typescript',
        patterns: ['var-to-const'],
      },
      expected: {
        assertions: [
          {
            type: 'contains',
            value: 'const message',
            message: 'Should convert var to const',
          },
          {
            type: 'syntax_valid',
            value: true,
            message: 'Result should be valid TypeScript',
          },
        ],
      },
      metadata: {
        category: 'modernization',
        priority: 'high',
        tags: ['var', 'const', 'es6'],
        timeout: 30000,
      },
    },
  ],
};
```

### Executing Tests
```typescript
import { createActor } from 'xstate';
import { llmTestingFrameworkActor } from './src/actors/llm-testing-framework';

const actor = createActor(llmTestingFrameworkActor, {
  input: {
    suites: [testSuite],
    options: {
      outputDir: './test-results',
      generateReport: true,
      includePerformanceMetrics: true,
      includeCoverageAnalysis: true,
      failFast: false,
    },
  },
});

actor.start();

const result = await new Promise((resolve, reject) => {
  actor.subscribe(
    () => {}, // next
    reject,   // error
    () => resolve(actor.getSnapshot().output) // complete
  );
});

console.log(`Tests completed: ${result.summary.passed}/${result.summary.total} passed`);
```

### Auto-Generated Test Cases
```typescript
import { generateTestCasesFromPatterns } from './src/actors/llm-testing-framework';

const patterns = [
  {
    id: 'arrow-function-conversion',
    description: 'Convert functions to arrow functions',
    language: 'typescript',
    category: 'modernization',
    testCases: [
      {
        input: 'function add(a, b) { return a + b; }',
        expected: 'const add = (a, b) => a + b;',
      },
    ],
  },
];

const generatedTests = generateTestCasesFromPatterns(patterns);
```

## Report Generation

### JSON Reports
Structured data for programmatic analysis:
```json
{
  "summary": {
    "total": 15,
    "passed": 13,
    "failed": 2,
    "skipped": 0,
    "duration": 45000,
    "suites": 3
  },
  "suiteResults": [...],
  "timestamp": "2025-01-14T21:45:00.000Z"
}
```

### HTML Reports
Human-readable reports with:
- Visual test status indicators
- Detailed assertion results
- Performance metrics
- Error details and stack traces
- Interactive filtering and sorting

## Integration with Transformation Pipeline

The testing framework integrates seamlessly with the Carmack Coder transformation pipeline:

1. **Template Engine Testing**: Validates template-based transformations
2. **AST-grep Testing**: Tests syntax tree transformations
3. **LLM Testing**: Validates AI-powered transformations
4. **End-to-End Testing**: Full pipeline validation

## Best Practices

### Test Organization
- Group related tests into logical suites
- Use descriptive test names and descriptions
- Tag tests for easy filtering and organization
- Set appropriate timeouts for different test types

### Assertion Design
- Use multiple assertion types for comprehensive validation
- Include both positive and negative test cases
- Test edge cases and error conditions
- Validate both functional and non-functional requirements

### Performance Testing
- Test with realistic data sizes
- Monitor memory usage and execution time
- Set performance baselines and regression thresholds
- Use parallel execution for faster feedback

### Error Handling
- Test invalid inputs and edge cases
- Verify graceful degradation
- Validate error messages and recovery mechanisms
- Use fail-fast mode for critical test failures

## Configuration Options

### Suite Configuration
```typescript
config: {
  parallel: boolean,        // Enable parallel execution
  maxConcurrency: number,   // Max concurrent tests
  retries: number,          // Retry attempts on failure
  timeout: number,          // Suite timeout in ms
  reportFormat: 'json' | 'html' | 'markdown',
}
```

### Execution Options
```typescript
options: {
  outputDir: string,                    // Report output directory
  generateReport: boolean,              // Enable report generation
  includePerformanceMetrics: boolean,   // Collect performance data
  includeCoverageAnalysis: boolean,     // Analyze code coverage
  failFast: boolean,                    // Stop on first failure
}
```

## Extensibility

### Custom Assertions
Add new assertion types by extending the assertion engine:

```typescript
async function runCustomAssertion(assertion: any, actualOutput: any, testCase: TestCase) {
  switch (assertion.type) {
    case 'custom_validation':
      // Implement custom validation logic
      return {
        type: assertion.type,
        passed: customValidationLogic(actualOutput, assertion.value),
        message: assertion.message,
        actual: actualOutput,
        expected: assertion.value,
      };
  }
}
```

### Custom Metrics
Extend performance monitoring with custom metrics:

```typescript
async function collectCustomMetrics(testCase: TestCase, actualOutput: any, duration: number) {
  return {
    ...standardMetrics,
    customMetric: calculateCustomMetric(actualOutput),
    businessLogicComplexity: analyzeBusinessLogic(testCase.input.code),
  };
}
```

## Testing the Framework

The framework includes comprehensive self-tests in `test/actors/llm-testing-framework.test.ts`:

- Framework core functionality tests
- Built-in test suite validation
- Test case generation verification
- Assertion type validation
- Performance metric collection
- Report generation testing
- Error handling scenarios

## Future Enhancements

### Planned Features
- **Visual Test Runner**: Web-based test execution interface
- **Test Coverage Analysis**: Code coverage reporting for transformations
- **Mutation Testing**: Validate test quality through mutation testing
- **CI/CD Integration**: GitHub Actions and other CI/CD platform support
- **Test Data Management**: Fixtures and test data generation utilities
- **Snapshot Testing**: Compare transformation outputs against saved snapshots

### Integration Opportunities
- **IDE Extensions**: VS Code extension for running tests
- **Monitoring Integration**: Prometheus metrics and alerting
- **Database Storage**: Persistent test result storage
- **API Testing**: REST API for remote test execution
- **Load Testing**: Stress testing for transformation performance

## Conclusion

The LLM Testing Framework provides a robust, scalable solution for validating LLM-powered code transformations. With its comprehensive assertion system, performance monitoring, and detailed reporting, it ensures the reliability and quality of automated code transformations while providing developers with the insights needed to continuously improve their transformation patterns and processes.