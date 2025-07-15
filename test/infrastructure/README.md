# Carmack Coder Test Infrastructure

This directory contains the enhanced test infrastructure for the Carmack Coder system, designed to provide robust, reliable, and comprehensive testing capabilities.

## Overview

The test infrastructure has been completely redesigned to address the major issues identified after the comprehensive fixes:

- **Unified Test Runner**: Centralized test execution with proper isolation
- **Mock Factories**: Reusable mock objects for consistent testing
- **Test Fixtures**: Standardized test data and environments
- **Integration Suite**: Comprehensive end-to-end validation
- **Health Monitoring**: Performance tracking and debugging tools

## Quick Start

### Running Tests

```bash
# Run all tests with the unified runner
bun run test

# Run specific categories
bun run test:unit
bun run test:integration
bun run test:e2e
bun run test:performance

# Run by priority
bun run test:high
bun run test:medium
bun run test:low

# Run with specific options
bun run test:verbose      # Detailed output
bun run test:coverage     # With coverage analysis
bun run test:parallel     # Parallel execution
bun run test:bail         # Stop on first failure

# Run comprehensive integration tests
bun run test:comprehensive

# Run performance regression tests
bun run test:regression
```

### Development Workflows

```bash
# Quick health check during development
bun run test:health

# Smoke test for CI/CD
bun run test:smoke

# Full test suite for releases
bun run test:full

# Debug failing tests
bun run test:debug
```

## Architecture

### Core Components

#### 1. Unified Test Runner (`test-runner.ts`)
- **Purpose**: Centralized test execution with proper isolation
- **Features**:
  - Process pool for concurrent test execution
  - Resource management and cleanup
  - Comprehensive reporting
  - Health scoring and recommendations
  - Retry logic with exponential backoff

#### 2. Test Fixtures (`test-fixtures.ts`)
- **Purpose**: Standardized test data and environments
- **Features**:
  - Pre-built code samples for different scenarios
  - Mock transformation requests and results
  - Test environment management
  - Performance test data generation

#### 3. Mock Factories (`mock-factories.ts`)
- **Purpose**: Reusable mock objects for consistent testing
- **Features**:
  - Actor mocks with customizable behavior
  - External tool dependency mocking
  - File system operation mocking
  - Performance testing utilities

#### 4. Integration Suite (`integration-suite.ts`)
- **Purpose**: Comprehensive end-to-end validation
- **Features**:
  - Production pipeline integration tests
  - Cross-component validation
  - Error handling and recovery tests
  - Performance regression testing

#### 5. Test Debugging (`test-debugging.ts`)
- **Purpose**: Advanced debugging and monitoring tools
- **Features**:
  - Health monitoring and metrics
  - Interactive debugging utilities
  - Performance profiling
  - Diagnostic data export

## Test Categories

### Unit Tests
- **Location**: `test/actors/`, `test/utils/`
- **Purpose**: Test individual components in isolation
- **Priority**: High
- **Execution**: Fast, parallel-safe

### Integration Tests
- **Location**: `test/integration/`
- **Purpose**: Test component interactions
- **Priority**: High
- **Execution**: Sequential, with proper setup/teardown

### End-to-End Tests
- **Location**: `test/e2e/`
- **Purpose**: Test complete user workflows
- **Priority**: Medium
- **Execution**: Sequential, with full environment setup

### Performance Tests
- **Location**: `test/performance/`
- **Purpose**: Validate performance characteristics
- **Priority**: Low
- **Execution**: Isolated, with resource monitoring

## Test Patterns

### Basic Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { TestEnvironmentManager, TestFixtures } from '../infrastructure/test-fixtures.js';
import { MockSetupUtility } from '../infrastructure/mock-factories.js';
import { monitoredTest } from '../infrastructure/test-debugging.js';

describe('Component Tests', () => {
  let testEnv: TestEnvironmentManager;

  beforeEach(async () => {
    testEnv = new TestEnvironmentManager();
    MockSetupUtility.setupAllMocks();
  });

  afterEach(async () => {
    MockSetupUtility.cleanupAllMocks();
    await testEnv.cleanup();
  });

  test('should perform basic operation', async () => {
    await monitoredTest('basic-operation', 'unit', async () => {
      // Test implementation
      const result = await performOperation();
      expect(result).toBeDefined();
    });
  });
});
```

### Actor Testing Pattern

```typescript
import { createActor, waitFor } from 'xstate';
import { TransformationActorMockFactory } from '../infrastructure/mock-factories.js';

test('should test actor behavior', async () => {
  const mockActor = TransformationActorMockFactory.createTransformationActor(
    ['test.ts'],
    2
  );

  const result = await waitFor(
    mockActor,
    (state) => state.status === 'done',
    { timeout: 10000 }
  );

  expect(result.output).toBeDefined();
});
```

### Integration Testing Pattern

```typescript
import { IntegrationTestSuite } from '../infrastructure/integration-suite.js';

test('should validate complete pipeline', async () => {
  const suite = new IntegrationTestSuite();
  await suite.setup();
  
  try {
    await suite.testProductionPipelineIntegration();
  } finally {
    await suite.cleanup();
  }
});
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group related functionality
2. **Clear Test Names**: Use descriptive names that explain what is being tested
3. **Proper Setup/Teardown**: Always clean up resources in `afterEach`
4. **Test Isolation**: Each test should be independent and not rely on others

### Mock Usage

1. **Use Appropriate Mocks**: Choose the right mock factory for your needs
2. **Setup Common Mocks**: Use `MockSetupUtility.setupAllMocks()` for standard scenarios
3. **Clean Up Mocks**: Always call `MockSetupUtility.cleanupAllMocks()`
4. **Verify Mock Behavior**: Test that mocks are called as expected

### Performance Considerations

1. **Monitor Test Performance**: Use the health monitoring tools
2. **Optimize Slow Tests**: Address tests that exceed performance thresholds
3. **Use Parallel Execution**: When tests are independent
4. **Resource Management**: Clean up memory and file handles

### Error Handling

1. **Test Error Scenarios**: Include tests for failure cases
2. **Use Proper Assertions**: Provide clear error messages
3. **Handle Async Errors**: Properly await async operations
4. **Debug Failing Tests**: Use the debugging utilities

## Debugging Tests

### Health Monitoring

The test infrastructure includes comprehensive health monitoring:

```typescript
import { testHealthMonitor } from '../infrastructure/test-debugging.js';

// Get health summary
const health = testHealthMonitor.getHealthSummary();
console.log(`Health Score: ${health.healthScore}/100`);
console.log(`Success Rate: ${health.successRate * 100}%`);

// Export diagnostics
await testHealthMonitor.exportDiagnostics('./test-reports');
```

### Interactive Debugging

```typescript
import { testDebugger } from '../infrastructure/test-debugging.js';

// Enable debug mode
testDebugger.enable();

// Set breakpoints
testDebugger.setBreakpoint('transformation-start');

// Watch variables
testDebugger.watch('transformationResult', result);

// Check breakpoints in code
testDebugger.checkBreakpoint('transformation-start', { files, patterns });
```

### Performance Profiling

```typescript
import { testProfiler } from '../infrastructure/test-debugging.js';

// Profile test execution
testProfiler.start('transformation-test');
await performTransformation();
const profile = testProfiler.end('transformation-test');

console.log(`Duration: ${profile.duration}ms`);
console.log(`Memory: ${profile.memoryDelta}KB`);
```

## Maintenance

### Regular Tasks

1. **Review Test Health**: Check health scores and address issues
2. **Update Test Data**: Keep test fixtures current with system changes
3. **Optimize Performance**: Address slow or memory-intensive tests
4. **Update Documentation**: Keep this guide current

### Adding New Tests

1. **Choose Appropriate Category**: Unit, integration, e2e, or performance
2. **Use Existing Patterns**: Follow established testing patterns
3. **Add to Test Runner**: Update test suite registry if needed
4. **Document Special Requirements**: Note any special setup needs

### Troubleshooting

#### Common Issues

1. **Tests Timing Out**
   - Check for infinite loops or blocking operations
   - Increase timeout values if necessary
   - Use debugging tools to identify bottlenecks

2. **Memory Leaks**
   - Ensure proper cleanup in `afterEach`
   - Check for unclosed file handles or network connections
   - Use memory profiling tools

3. **Flaky Tests**
   - Add retry logic for unreliable operations
   - Use proper synchronization for async operations
   - Mock external dependencies

4. **Mock Issues**
   - Verify mock setup and cleanup
   - Check mock behavior matches expectations
   - Use debugging tools to trace mock calls

#### Getting Help

1. **Check Health Reports**: Review exported diagnostics
2. **Use Debug Mode**: Enable detailed logging
3. **Profile Performance**: Identify bottlenecks
4. **Review Test Patterns**: Ensure following best practices

## Configuration

### Test Runner Configuration

The test runner can be configured through environment variables:

```bash
# Maximum test concurrency
export CARMACK_TEST_CONCURRENCY=3

# Default test timeout
export CARMACK_TEST_TIMEOUT=30000

# Health monitoring thresholds
export CARMACK_TEST_MAX_DURATION=30000
export CARMACK_TEST_MAX_MEMORY=104857600
export CARMACK_TEST_MIN_SUCCESS_RATE=0.95
```

### Mock Configuration

Mocks can be configured for different scenarios:

```typescript
// Setup for success scenario
MockSetupUtility.setupScenarioMocks('success');

// Setup for failure scenario
MockSetupUtility.setupScenarioMocks('failure');

// Setup for timeout scenario
MockSetupUtility.setupScenarioMocks('timeout');
```

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:comprehensive

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: test-reports/
```

### Test Reports

The infrastructure generates comprehensive reports:

- **Health Reports**: Overall test health and recommendations
- **Performance Reports**: Timing and memory usage analysis
- **Coverage Reports**: Code coverage analysis
- **Diagnostic Reports**: Detailed debugging information

## Future Enhancements

### Planned Features

1. **Visual Test Reports**: HTML dashboard for test results
2. **Test Analytics**: Historical trend analysis
3. **Automated Test Generation**: AI-powered test creation
4. **Advanced Mocking**: More sophisticated mock scenarios
5. **Distributed Testing**: Multi-machine test execution

### Contributing

When contributing to the test infrastructure:

1. **Follow Patterns**: Use established patterns and utilities
2. **Add Documentation**: Update this guide for new features
3. **Test Your Changes**: Ensure new infrastructure is well-tested
4. **Consider Performance**: Optimize for speed and reliability

## Conclusion

This enhanced test infrastructure provides a robust foundation for ensuring the reliability and quality of the Carmack Coder system. By following the patterns and best practices outlined in this guide, developers can create comprehensive, maintainable, and efficient tests that validate all aspects of the system.

The infrastructure is designed to grow with the system, providing the tools and utilities needed to maintain high code quality as the project evolves.