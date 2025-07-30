import { EpicTestingSystem } from './index.js';

import type { TestSuiteResult } from './framework/test-orchestrator.js';

/**
 * Integration Test for EPIC-TESTING-METRICS System
 * 
 * Comprehensive integration test that validates the complete system
 * works together and meets all EPIC requirements.
 */


/**
 * Integration test configuration
 */
interface IntegrationTestConfig {
  runFullValidation: boolean;
  validatePerformanceTargets: boolean;
  testEngagementTracking: boolean;
  generateReports: boolean;
  testCIIntegration: boolean;
  timeoutMs: number;
}

/**
 * Integration test results
 */
interface IntegrationTestResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  overallPassed: boolean;
  testResults: {
    systemInitialization: boolean;
    fullValidation?: TestSuiteResult;
    performanceTargets?: any;
    engagementTracking?: boolean;
    reportGeneration?: boolean;
    ciIntegration?: boolean;
  };
  errors: string[];
  recommendations: string[];
}

/**
 * Main integration test class
 */
export class EpicTestingIntegrationTest {
  private config: IntegrationTestConfig;
  private testingSystem: EpicTestingSystem | null = null;

  constructor(config: Partial<IntegrationTestConfig> = {}) {
    this.config = {
      runFullValidation: true,
      validatePerformanceTargets: true,
      testEngagementTracking: true,
      generateReports: true,
      testCIIntegration: true,
      timeoutMs: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Run complete integration test
   */
  async runIntegrationTest(): Promise<IntegrationTestResult> {
    const testId = `integration-test-${Date.now()}`;
    const startTime = new Date();
    const errors: string[] = [];
    const recommendations: string[] = [];

    console.log('🧪 Starting EPIC-TESTING-METRICS Integration Test');
    console.log(`Test ID: ${testId}`);
    console.log('================================================');

    const testResults: any = {};

    try {
      // 1. Test system initialization
      console.log('\n1️⃣ Testing System Initialization...');
      testResults.systemInitialization = await this.testSystemInitialization();
      
      if (!testResults.systemInitialization) {
        errors.push('System initialization failed');
        throw new Error('System initialization failed');
      }

      // 2. Test full validation suite
      if (this.config.runFullValidation) {
        console.log('\n2️⃣ Testing Full Validation Suite...');
        testResults.fullValidation = await this.testFullValidation();
        
        if (!testResults.fullValidation.passed) {
          errors.push('Full validation suite failed');
          recommendations.push('Review validation suite results for specific failures');
        }
      }

      // 3. Test performance target validation
      if (this.config.validatePerformanceTargets) {
        console.log('\n3️⃣ Testing Performance Target Validation...');
        testResults.performanceTargets = await this.testPerformanceTargets();
        
        const allTargetsPassed = Object.values(testResults.performanceTargets).every((target: any) => target.passed);
        if (!allTargetsPassed) {
          errors.push('Some performance targets not met');
          recommendations.push('Optimize system performance to meet all targets');
        }
      }

      // 4. Test engagement tracking
      if (this.config.testEngagementTracking) {
        console.log('\n4️⃣ Testing Engagement Tracking...');
        testResults.engagementTracking = await this.testEngagementTracking();
        
        if (!testResults.engagementTracking) {
          errors.push('Engagement tracking failed');
          recommendations.push('Check engagement tracking implementation');
        }
      }

      // 5. Test report generation
      if (this.config.generateReports) {
        console.log('\n5️⃣ Testing Report Generation...');
        testResults.reportGeneration = await this.testReportGeneration();
        
        if (!testResults.reportGeneration) {
          errors.push('Report generation failed');
          recommendations.push('Check report generation system');
        }
      }

      // 6. Test CI integration
      if (this.config.testCIIntegration) {
        console.log('\n6️⃣ Testing CI Integration...');
        testResults.ciIntegration = await this.testCIIntegration();
        
        if (!testResults.ciIntegration) {
          errors.push('CI integration failed');
          recommendations.push('Check CI integration configuration');
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Evaluate overall success
      const overallPassed = this.evaluateOverallSuccess(testResults, errors);

      const result: IntegrationTestResult = {
        testId,
        startTime,
        endTime,
        duration,
        overallPassed,
        testResults,
        errors,
        recommendations,
      };

      // Print final results
      this.printFinalResults(result);

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      errors.push(`Integration test failed: ${error instanceof Error ? error.message : String(error)}`);

      const result: IntegrationTestResult = {
        testId,
        startTime,
        endTime,
        duration,
        overallPassed: false,
        testResults,
        errors,
        recommendations,
      };

      this.printFinalResults(result);
      throw error;

    } finally {
      // Cleanup
      if (this.testingSystem) {
        this.testingSystem.shutdown();
      }
    }
  }

  /**
   * Test system initialization
   */
  private async testSystemInitialization(): Promise<boolean> {
    try {
      this.testingSystem = new EpicTestingSystem({
        enableBenchmarkTests: true,
        enablePerformanceTests: true,
        enableQualityTests: true,
        enableEngagementTracking: true,
        enableLoadTesting: true,
        enableReporting: true,
        alertingEnabled: true,
        continuousIntegration: false,
      });

      console.log('   ✅ System initialized successfully');
      return true;
    } catch (error) {
      console.error('   ❌ System initialization failed:', error);
      return false;
    }
  }

  /**
   * Test full validation suite
   */
  private async testFullValidation(): Promise<TestSuiteResult> {
    if (!this.testingSystem) {
      throw new Error('Testing system not initialized');
    }

    try {
      const result = await this.testingSystem.runCompleteValidation();
      
      console.log(`   ✅ Full validation completed`);
      console.log(`      Overall Score: ${result.overallScore}/100`);
      console.log(`      Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`      Tests: ${result.passedTests}/${result.totalTests} passed`);

      return result;
    } catch (error) {
      console.error('   ❌ Full validation failed:', error);
      throw error;
    }
  }

  /**
   * Test performance targets
   */
  private async testPerformanceTargets(): Promise<any> {
    if (!this.testingSystem) {
      throw new Error('Testing system not initialized');
    }

    try {
      const targets = await this.testingSystem.validatePerformanceTargets();
      
      console.log('   📊 Performance Target Results:');
      console.log(`      Speed Improvement: ${targets.speedImprovement.actual.toFixed(1)}% (${targets.speedImprovement.passed ? 'PASSED' : 'FAILED'})`);
      console.log(`      Response Time: ${targets.responseTime.actual.toFixed(0)}ms (${targets.responseTime.passed ? 'PASSED' : 'FAILED'})`);
      console.log(`      Accuracy: ${targets.accuracy.actual.toFixed(1)}% (${targets.accuracy.passed ? 'PASSED' : 'FAILED'})`);
      console.log(`      Concurrent Users: ${targets.concurrentUsers.actual} (${targets.concurrentUsers.passed ? 'PASSED' : 'FAILED'})`);

      return targets;
    } catch (error) {
      console.error('   ❌ Performance target validation failed:', error);
      throw error;
    }
  }

  /**
   * Test engagement tracking
   */
  private async testEngagementTracking(): Promise<boolean> {
    if (!this.testingSystem) {
      throw new Error('Testing system not initialized');
    }

    try {
      // Start engagement tracking
      this.testingSystem.startEngagementTracking();

      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get current metrics
      const metrics = this.testingSystem.getCurrentEngagementMetrics();

      console.log('   ✅ Engagement tracking working');
      console.log(`      Active Sessions: ${metrics.activeSessions}`);
      console.log(`      Total Queries: ${metrics.totalQueriesToday}`);

      return true;
    } catch (error) {
      console.error('   ❌ Engagement tracking failed:', error);
      return false;
    }
  }

  /**
   * Test report generation
   */
  private async testReportGeneration(): Promise<boolean> {
    if (!this.testingSystem) {
      throw new Error('Testing system not initialized');
    }

    try {
      const report = await this.testingSystem.generateReport();
      
      console.log('   ✅ Report generation working');
      console.log(`      Report ID: ${report.reportId}`);
      for (const file of report.generatedFiles) {
        console.log(`      Generated File: ${file.path} (${file.format}, ${file.size} bytes)`);
      }

      return true;
    } catch (error) {
      console.error('   ❌ Report generation failed:', error);
      return false;
    }
  }

  /**
   * Test CI integration
   */
  private async testCIIntegration(): Promise<boolean> {
    if (!this.testingSystem) {
      throw new Error('Testing system not initialized');
    }

    try {
      const ciResult = await this.testingSystem.runCIValidation({
        commitHash: 'test-commit-hash',
        branch: 'integration-test',
      });

      console.log('   ✅ CI integration working');
      console.log(`      Build ID: ${ciResult.buildId}`);
      console.log(`      Result: ${ciResult.overallResult}`);
      console.log(`      Quality Gate: ${ciResult.qualityGate.passed ? 'PASSED' : 'FAILED'}`);

      return true;
    } catch (error) {
      console.error('   ❌ CI integration failed:', error);
      return false;
    }
  }

  /**
   * Evaluate overall success
   */
  private evaluateOverallSuccess(testResults: any, errors: string[]): boolean {
    // Must have no critical errors
    if (errors.length > 0) {
      return false;
    }

    // System initialization must pass
    if (!testResults.systemInitialization) {
      return false;
    }

    // Full validation must pass if enabled
    if (this.config.runFullValidation && testResults.fullValidation && !testResults.fullValidation.passed) {
      return false;
    }

    // Performance targets must pass if enabled
    if (this.config.validatePerformanceTargets && testResults.performanceTargets) {
      const allTargetsPassed = Object.values(testResults.performanceTargets).every((target: any) => target.passed);
      if (!allTargetsPassed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Print final results
   */
  private printFinalResults(result: IntegrationTestResult): void {
    console.log('\n🎯 Integration Test Results');
    console.log('============================');
    console.log(`Test ID: ${result.testId}`);
    console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`Overall Result: ${result.overallPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => console.log(`   • ${error}`));
      console.log('');
    }

    if (result.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`   • ${rec}`));
      console.log('');
    }

    console.log('📋 Test Component Results:');
    console.log(`   System Initialization: ${result.testResults.systemInitialization ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    if (result.testResults.fullValidation) {
      console.log(`   Full Validation: ${result.testResults.fullValidation.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    }
    
    if (result.testResults.performanceTargets) {
      const allPassed = Object.values(result.testResults.performanceTargets).every((target: any) => target.passed);
      console.log(`   Performance Targets: ${allPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    }
    
    if (result.testResults.engagementTracking !== undefined) {
      console.log(`   Engagement Tracking: ${result.testResults.engagementTracking ? 'PASSED ✅' : 'FAILED ❌'}`);
    }
    
    if (result.testResults.reportGeneration !== undefined) {
      console.log(`   Report Generation: ${result.testResults.reportGeneration ? 'PASSED ✅' : 'FAILED ❌'}`);
    }
    
    if (result.testResults.ciIntegration !== undefined) {
      console.log(`   CI Integration: ${result.testResults.ciIntegration ? 'PASSED ✅' : 'FAILED ❌'}`);
    }

    console.log('');
    
    if (result.overallPassed) {
      console.log('🎉 EPIC-TESTING-METRICS Integration Test PASSED!');
      console.log('   All system components are working correctly.');
    } else {
      console.log('⚠️  EPIC-TESTING-METRICS Integration Test FAILED!');
      console.log('   Some system components need attention.');
    }
  }
}

/**
 * Convenience function to run integration test
 */
export async function runIntegrationTest(config?: Partial<IntegrationTestConfig>): Promise<IntegrationTestResult> {
  const test = new EpicTestingIntegrationTest(config);
  return test.runIntegrationTest();
}

/**
 * Quick integration test for CI/CD
 */
export async function runQuickIntegrationTest(): Promise<boolean> {
  const test = new EpicTestingIntegrationTest({
    runFullValidation: false,
    validatePerformanceTargets: true,
    testEngagementTracking: true,
    generateReports: false,
    testCIIntegration: true,
    timeoutMs: 60000, // 1 minute
  });

  try {
    const result = await test.runIntegrationTest();
    return result.overallPassed;
  } catch (error) {
    console.error('Quick integration test failed:', error);
    return false;
  }
}

// CLI support
if (import.meta.main) {
  const args = process.argv.slice(2);
  const testType = args[0] || 'full';

  switch (testType) {
    case 'full':
      console.log('Running full integration test...');
      runIntegrationTest()
        .then(result => {
          process.exit(result.overallPassed ? 0 : 1);
        })
        .catch(error => {
          console.error('Integration test failed:', error);
          process.exit(1);
        });
      break;

    case 'quick':
      console.log('Running quick integration test...');
      runQuickIntegrationTest()
        .then(passed => {
          process.exit(passed ? 0 : 1);
        })
        .catch(error => {
          console.error('Quick integration test failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log(`
EPIC-TESTING-METRICS Integration Test

Usage: bun run src/testing/integration-test.ts <type>

Types:
  full   - Run complete integration test (default)
  quick  - Run quick integration test for CI/CD

Examples:
  bun run src/testing/integration-test.ts full
  bun run src/testing/integration-test.ts quick
      `);
      break;
  }
}