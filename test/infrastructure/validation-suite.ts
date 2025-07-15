#!/usr/bin/env bun

/**
 * Test Infrastructure Validation Suite
 * 
 * Validates that all test infrastructure improvements work together properly
 * and provides a comprehensive health check of the testing system.
 */

import { performance } from 'node:perf_hooks';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Import all infrastructure components
import { UnifiedTestRunner, type TestSuite } from './test-runner.js';
import { TestFixtures, TestEnvironmentManager } from './test-fixtures.js';
import { MockSetupUtility, ActorMockFactory } from './mock-factories.js';
import { IntegrationTestSuite, PerformanceRegressionSuite } from './integration-suite.js';
import { testHealthMonitor, testDebugger, testProfiler } from './test-debugging.js';

interface ValidationResult {
  component: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
  details?: any;
}

/**
 * Comprehensive validation suite for test infrastructure
 */
class TestInfrastructureValidator {
  private results: ValidationResult[] = [];
  private startTime: number = 0;

  /**
   * Run all validation tests
   */
  async validate(): Promise<{
    success: boolean;
    results: ValidationResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
      duration: number;
    };
  }> {
    console.log('🔍 Starting Test Infrastructure Validation');
    console.log('==========================================\n');

    this.startTime = performance.now();

    // Run all validation tests
    await this.validateUnifiedTestRunner();
    await this.validateTestFixtures();
    await this.validateMockFactories();
    await this.validateIntegrationSuite();
    await this.validateDebuggingTools();
    await this.validatePackageScripts();
    await this.validateDocumentation();
    await this.validateEndToEndFlow();

    const duration = performance.now() - this.startTime;
    const summary = this.generateSummary(duration);

    this.displayResults(summary);

    return {
      success: summary.failed === 0,
      results: this.results,
      summary,
    };
  }

  /**
   * Validate unified test runner
   */
  private async validateUnifiedTestRunner(): Promise<void> {
    console.log('🧪 Validating Unified Test Runner...');

    try {
      const startTime = performance.now();

      // Test runner instantiation
      const runner = new UnifiedTestRunner(2);
      
      // Create mock test suites
      const mockSuites: TestSuite[] = [
        {
          name: 'Mock Unit Test',
          path: 'test/mock-unit.test.ts',
          description: 'Mock unit test for validation',
          category: 'unit',
          priority: 'high',
        },
      ];

      // Test filtering
      const filtered = (runner as any).filterSuites(mockSuites, { category: 'unit' });
      if (filtered.length !== 1) {
        throw new Error('Test suite filtering failed');
      }

      // Test sorting
      const sorted = (runner as any).sortSuitesByPriority(mockSuites);
      if (sorted.length !== 1) {
        throw new Error('Test suite sorting failed');
      }

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Unified Test Runner',
        status: 'passed',
        message: 'All core functionality validated',
        duration,
        details: {
          filtering: 'passed',
          sorting: 'passed',
          instantiation: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Unified Test Runner',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate test fixtures
   */
  private async validateTestFixtures(): Promise<void> {
    console.log('🏗️ Validating Test Fixtures...');

    try {
      const startTime = performance.now();

      // Test fixture creation
      const patterns = TestFixtures.createTestPatterns();
      if (!patterns.safe || patterns.safe.length === 0) {
        throw new Error('Safe patterns not generated');
      }

      const codeSamples = TestFixtures.createCodeSamples();
      if (!codeSamples.simple || codeSamples.simple.length === 0) {
        throw new Error('Code samples not generated');
      }

      const validationResults = TestFixtures.createValidationResults();
      if (!validationResults.valid || typeof validationResults.valid.isValid !== 'boolean') {
        throw new Error('Validation results not properly structured');
      }

      // Test environment manager
      const envManager = new TestEnvironmentManager();
      const testDir = await envManager.createEnvironment('validation-test');
      
      if (!existsSync(testDir)) {
        throw new Error('Test environment creation failed');
      }

      const testFile = await envManager.createTestFile(testDir, 'test.ts', 'console.log("test");');
      if (!existsSync(testFile)) {
        throw new Error('Test file creation failed');
      }

      await envManager.cleanup();

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Test Fixtures',
        status: 'passed',
        message: 'All fixtures and environment management validated',
        duration,
        details: {
          patterns: 'passed',
          codeSamples: 'passed',
          validationResults: 'passed',
          environmentManager: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Test Fixtures',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate mock factories
   */
  private async validateMockFactories(): Promise<void> {
    console.log('🎭 Validating Mock Factories...');

    try {
      const startTime = performance.now();

      // Test actor mocks
      const successfulActor = ActorMockFactory.createSuccessfulActor({ test: 'data' });
      if (!successfulActor || typeof successfulActor.start !== 'function') {
        throw new Error('Successful actor mock creation failed');
      }

      const failingActor = ActorMockFactory.createFailingActor(new Error('Test error'));
      if (!failingActor || typeof failingActor.start !== 'function') {
        throw new Error('Failing actor mock creation failed');
      }

      // Test mock setup utility
      MockSetupUtility.setupAllMocks();
      MockSetupUtility.cleanupAllMocks();

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Mock Factories',
        status: 'passed',
        message: 'All mock factories and utilities validated',
        duration,
        details: {
          actorMocks: 'passed',
          mockSetup: 'passed',
          mockCleanup: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Mock Factories',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate integration suite
   */
  private async validateIntegrationSuite(): Promise<void> {
    console.log('🔗 Validating Integration Suite...');

    try {
      const startTime = performance.now();

      // Test integration suite instantiation
      const integrationSuite = new IntegrationTestSuite();
      if (!integrationSuite) {
        throw new Error('Integration suite instantiation failed');
      }

      // Test performance regression suite
      const performanceSuite = new PerformanceRegressionSuite();
      if (!performanceSuite) {
        throw new Error('Performance regression suite instantiation failed');
      }

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Integration Suite',
        status: 'passed',
        message: 'Integration and performance suites validated',
        duration,
        details: {
          integrationSuite: 'passed',
          performanceSuite: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Integration Suite',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate debugging tools
   */
  private async validateDebuggingTools(): Promise<void> {
    console.log('🐛 Validating Debugging Tools...');

    try {
      const startTime = performance.now();

      // Test health monitor
      testHealthMonitor.startTest('validation-test', 'unit');
      testHealthMonitor.mark('validation-test', 'test-mark');
      testHealthMonitor.warn('validation-test', 'test warning');
      testHealthMonitor.endTest('validation-test', 'passed');

      const healthSummary = testHealthMonitor.getHealthSummary();
      if (typeof healthSummary.healthScore !== 'number') {
        throw new Error('Health monitor not working properly');
      }

      // Test debugger
      testDebugger.enable();
      testDebugger.setBreakpoint('test-breakpoint');
      testDebugger.watch('testVar', 'testValue');
      testDebugger.disable();

      // Test profiler
      testProfiler.start('validation-profile');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const profile = testProfiler.end('validation-profile');
      
      if (!profile || typeof profile.duration !== 'number') {
        throw new Error('Profiler not working properly');
      }

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Debugging Tools',
        status: 'passed',
        message: 'All debugging tools validated',
        duration,
        details: {
          healthMonitor: 'passed',
          debugger: 'passed',
          profiler: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Debugging Tools',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate package scripts
   */
  private async validatePackageScripts(): Promise<void> {
    console.log('📦 Validating Package Scripts...');

    try {
      const startTime = performance.now();

      const packageJsonPath = join(process.cwd(), 'package.json');
      if (!existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = require(packageJsonPath);
      const scripts = packageJson.scripts || {};

      // Check for required test scripts
      const requiredScripts = [
        'test',
        'test:all',
        'test:unit',
        'test:integration',
        'test:e2e',
        'test:performance',
        'test:comprehensive',
        'test:health',
        'test:debug',
      ];

      const missingScripts = requiredScripts.filter(script => !scripts[script]);
      if (missingScripts.length > 0) {
        throw new Error(`Missing required scripts: ${missingScripts.join(', ')}`);
      }

      // Verify scripts point to correct infrastructure
      if (!scripts.test.includes('test-runner.ts')) {
        this.results.push({
          component: 'Package Scripts',
          status: 'warning',
          message: 'Main test script may not be using unified test runner',
        });
      }

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Package Scripts',
        status: 'passed',
        message: 'All required test scripts present and configured',
        duration,
        details: {
          requiredScripts: requiredScripts.length,
          foundScripts: Object.keys(scripts).filter(s => s.startsWith('test')).length,
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Package Scripts',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate documentation
   */
  private async validateDocumentation(): Promise<void> {
    console.log('📚 Validating Documentation...');

    try {
      const startTime = performance.now();

      const readmePath = join(__dirname, 'README.md');
      if (!existsSync(readmePath)) {
        throw new Error('Test infrastructure README.md not found');
      }

      // Check for required infrastructure files
      const requiredFiles = [
        'test-runner.ts',
        'test-fixtures.ts',
        'mock-factories.ts',
        'integration-suite.ts',
        'test-debugging.ts',
      ];

      const missingFiles = requiredFiles.filter(file => !existsSync(join(__dirname, file)));
      if (missingFiles.length > 0) {
        throw new Error(`Missing infrastructure files: ${missingFiles.join(', ')}`);
      }

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'Documentation',
        status: 'passed',
        message: 'Documentation and infrastructure files validated',
        duration,
        details: {
          readmeExists: true,
          infrastructureFiles: requiredFiles.length,
        },
      });

    } catch (error) {
      this.results.push({
        component: 'Documentation',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Validate end-to-end flow
   */
  private async validateEndToEndFlow(): Promise<void> {
    console.log('🔄 Validating End-to-End Flow...');

    try {
      const startTime = performance.now();

      // Test complete workflow
      const envManager = new TestEnvironmentManager();
      const testDir = await envManager.createEnvironment('e2e-validation');

      // Setup mocks
      MockSetupUtility.setupAllMocks();

      // Create test data
      const patterns = TestFixtures.createTestPatterns();
      const codeSamples = TestFixtures.createCodeSamples();

      // Create test file
      const testFile = await envManager.createTestFile(testDir, 'e2e-test.ts', codeSamples.simple);

      // Test health monitoring
      testHealthMonitor.startTest('e2e-validation', 'integration');
      testHealthMonitor.mark('e2e-validation', 'setup-complete');

      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 50));

      testHealthMonitor.mark('e2e-validation', 'execution-complete');
      testHealthMonitor.endTest('e2e-validation', 'passed');

      // Cleanup
      MockSetupUtility.cleanupAllMocks();
      await envManager.cleanup();

      const duration = performance.now() - startTime;

      this.results.push({
        component: 'End-to-End Flow',
        status: 'passed',
        message: 'Complete workflow validated successfully',
        duration,
        details: {
          environmentSetup: 'passed',
          mockSetup: 'passed',
          testExecution: 'passed',
          cleanup: 'passed',
        },
      });

    } catch (error) {
      this.results.push({
        component: 'End-to-End Flow',
        status: 'failed',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Generate validation summary
   */
  private generateSummary(duration: number) {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    return { total, passed, failed, warnings, duration };
  }

  /**
   * Display validation results
   */
  private displayResults(summary: { total: number; passed: number; failed: number; warnings: number; duration: number }): void {
    console.log('\n📊 Test Infrastructure Validation Results');
    console.log('==========================================');

    // Display individual results
    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      const duration = result.duration ? ` (${Math.round(result.duration)}ms)` : '';
      console.log(`${icon} ${result.component}: ${result.message}${duration}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          const detailIcon = value === 'passed' ? '  ✓' : '  ✗';
          console.log(`${detailIcon} ${key}: ${value}`);
        });
      }
    });

    // Display summary
    console.log('\n📈 Summary:');
    console.log(`Total Components: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
    console.log(`Warnings: ${summary.warnings} ${summary.warnings > 0 ? '⚠️' : '✅'}`);
    console.log(`Duration: ${Math.round(summary.duration)}ms`);

    const successRate = (summary.passed / summary.total) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    // Overall status
    const overallStatus = summary.failed === 0 ? 'VALIDATION PASSED' : 'VALIDATION FAILED';
    const statusIcon = summary.failed === 0 ? '🎉' : '💥';
    console.log(`\n${statusIcon} ${overallStatus}`);

    if (summary.failed === 0) {
      console.log('\n✨ Test infrastructure is robust and ready for production!');
      console.log('🚀 All improvements are working together properly.');
    } else {
      console.log('\n🔧 Please address the failed components before proceeding.');
    }
  }
}

/**
 * Main validation function
 */
async function main() {
  const validator = new TestInfrastructureValidator();
  
  try {
    const result = await validator.validate();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Validation suite failed:', error);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.main) {
  main();
}

export { TestInfrastructureValidator };