import { EpicTestingSystem } from '../index.js';

/**
 * Complete EPIC-TESTING-METRICS System Validation Example
 *
 * This example demonstrates how to use the complete testing system
 * to validate all performance targets and acceptance criteria for
 * the TensorRT-LLM knowledge graph platform.
 */

/**
 * Main validation example
 */
async function runCompleteValidationExample(): Promise<void> {
  console.log('🚀 EPIC-TESTING-METRICS Complete Validation Example');
  console.log('====================================================');
  console.log('');

  // 1. Create testing system with full configuration
  console.log('1️⃣ Initializing EPIC-TESTING-METRICS System...');
  const testingSystem = new EpicTestingSystem({
    enableBenchmarkTests: true,
    enablePerformanceTests: true,
    enableQualityTests: true,
    enableEngagementTracking: true,
    enableLoadTesting: true,
    enableReporting: true,
    outputDir: './test-reports',
    formatTypes: ['html'],
    alertingEnabled: true,
    continuousIntegration: false,
  });
  console.log('');

  try {
    // 2. Run complete validation suite
    console.log('2️⃣ Running Complete Validation Suite...');
    console.log('   This validates all EPIC requirements including:');
    console.log('   • 75% speed improvement over manual investigation');
    console.log('   • Sub-2 second response times');
    console.log('   • 85% accuracy in responses');
    console.log('   • 100+ concurrent user support');
    console.log('   • Comprehensive quality assurance');
    console.log('');

    const validationResult = await testingSystem.runCompleteValidation();

    console.log('✅ Complete validation finished');
    console.log(`   Overall Score: ${validationResult.overallScore}/100`);
    console.log(`   Result: ${validationResult.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`   Total Tests: ${validationResult.totalTests}`);

    // 3. Validate specific performance targets
    console.log('3️⃣ Validating Specific Performance Targets...');
    const performanceTargets = await testingSystem.validatePerformanceTargets();

    console.log('');
    console.log('');

    // 5. Start engagement tracking
    console.log('5️⃣ Starting User Engagement Tracking...');
    testingSystem.startEngagementTracking();

    // Simulate some user activity
    await simulateUserActivity();

    const engagementMetrics = testingSystem.getCurrentEngagementMetrics();
    console.log('👥 Current Engagement Metrics:');
    console.log(`   Active Sessions: ${engagementMetrics.activeSessions}`);
    console.log(`   Total Queries Today: ${engagementMetrics.totalQueriesToday}`);
    console.log(
      `   Average Session Duration: ${Math.round(engagementMetrics.averageSessionDuration / 1000)}s`
    );
    console.log(
      `   Voluntary Usage Rate: ${(engagementMetrics.voluntaryUsageRate * 100).toFixed(1)}%`
    );
    console.log('');

    const dashboard = testingSystem.generateDashboard();
    console.log('📊 Real-time Dashboard Data:');
    console.log(`   Active Users: ${dashboard.realTimeMetrics.activeUsers}`);
    console.log(`   Queries/Minute: ${dashboard.realTimeMetrics.queriesPerMinute}`);
    console.log(`   Average Response Time: ${dashboard.realTimeMetrics.averageResponseTime}ms`);
    console.log(`   Success Rate: ${(dashboard.realTimeMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`   System Health: ${dashboard.realTimeMetrics.systemHealth.toUpperCase()}`);
    console.log('');

    // 7. Generate comprehensive report
    console.log('7️⃣ Generating Comprehensive Report...');
    const report = await testingSystem.generateReport();

    console.log('📄 Report Generated:');
    console.log(`   Report ID: ${report.reportId}`);
    console.log(`   Generated Files: ${report.generatedFiles.map((f) => f.path).join(', ')}`);
    console.log(`   Generation Time: ${report.generationTime}ms`);
    if (report.errors.length > 0) {
      console.log(`   Errors: ${report.errors.join('; ')}`);
    }
    if (report.warnings.length > 0) {
      console.log(`   Warnings: ${report.warnings.join('; ')}`);
      // 6. Generate real-time dashboard
      const dashboard = testingSystem.generateDashboard();
      console.log('📊 Real-time Dashboard Data:');
      console.log(`   Active Users: ${dashboard.realTimeMetrics.activeUsers}`);
      console.log(`   Queries/Minute: ${dashboard.realTimeMetrics.queriesPerMinute}`);
      console.log(`   Average Response Time: ${dashboard.realTimeMetrics.averageResponseTime}ms`);
      console.log(`   Success Rate: ${(dashboard.realTimeMetrics.successRate * 100).toFixed(1)}%`);
      console.log(`   System Health: ${dashboard.realTimeMetrics.systemHealth.toUpperCase()}`);
      console.log('');
    }
    console.log('');

    // 8. Final summary
    console.log('8️⃣ Final Validation Summary');
    console.log('============================');

    const allTargetsPassed = Object.values(performanceTargets).every(
      (target: any) => target.passed
    );
    const overallSuccess = validationResult.passed && allTargetsPassed;

    console.log(
      `🎯 EPIC-TESTING-METRICS Validation: ${overallSuccess ? 'PASSED ✅' : 'FAILED ❌'}`
    );
    console.log('');
    console.log('📋 Target Achievement Summary:');
    console.log(
      `   ✓ Speed Improvement (75%): ${performanceTargets.speedImprovement.passed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );
    console.log(
      `   ✓ Response Time (<2000ms): ${performanceTargets.responseTime.passed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );
    console.log(
      `   ✓ Accuracy (85%): ${performanceTargets.accuracy.passed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );
    console.log(
      `   ✓ Concurrent Users (100+): ${performanceTargets.concurrentUsers.passed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );
    console.log(
      `   ✓ System Uptime (99.5%): ${performanceTargets.systemUptime.passed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
    );
    console.log('');

    if (overallSuccess) {
      console.log('🎉 All EPIC requirements successfully validated!');
      console.log('   The TensorRT-LLM knowledge graph system meets all');
      console.log('   performance targets and acceptance criteria.');
    } else {
      console.log('⚠️  Some EPIC requirements need attention.');
      console.log('   Review the recommendations above for improvements.');
    }
  } catch (error) {
    console.error('❌ Validation example failed:', error);
    throw error;
  } finally {
    // Cleanup
    testingSystem.shutdown();
    console.log('');
    console.log('🔄 System shutdown complete');
  }
}

/**
 * Simulate user activity for engagement tracking
 */
async function simulateUserActivity(): Promise<void> {
  console.log('   Simulating user activity...');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log('   ✅ User activity simulation complete');
}

/**
 * CI/CD Integration Example
 */
async function runCIIntegrationExample(): Promise<void> {
  console.log('🔄 CI/CD Integration Example');
  console.log('============================');
  console.log('');

  const testingSystem = new EpicTestingSystem({
    continuousIntegration: true,
    enableReporting: true,
    alertingEnabled: true,
  });

  try {
    console.log('Running CI validation...');
    const ciResult = await testingSystem.runCIValidation({
      commitHash: 'abc123def456',
      branch: 'feature/epic-testing-metrics',
    });

    console.log('🎯 CI Validation Results:');
    console.log(`   Build ID: ${ciResult.buildId}`);
    console.log(`   Commit: ${ciResult.commitHash}`);
    console.log(`   Branch: ${ciResult.branch}`);
    console.log(`   Overall Result: ${ciResult.overallResult.toUpperCase()}`);
    console.log(`   Duration: ${Math.round(ciResult.testResults.duration / 1000)}s`);
    console.log(`   Total Tests: ${ciResult.testResults.totalTests}`);
    console.log(`   Quality Gate: ${ciResult.qualityGate.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('');

    const reqs = ciResult.qualityGate.requirements;
    console.log('📊 Quality Gate Requirements:');
    Object.entries(reqs).forEach(([name, val]) => {
      console.log(
        `   ${name}: ${val.actual} (Target: ${val.target}) - ${val.passed ? 'PASSED' : 'FAILED'}`
      );
    });

    // Exit with appropriate code for CI/CD
    if (ciResult.overallResult === 'failed') {
      console.log('❌ CI validation failed - exiting with error code');
      process.exitCode = 1;
    } else {
      console.log('✅ CI validation passed');
      process.exitCode = 0;
    }
  } catch (error) {
    console.error('❌ CI integration example failed:', error);
    process.exitCode = 1;
  } finally {
    testingSystem.shutdown();
  }
}

/**
 * Performance Monitoring Example
 */
async function runPerformanceMonitoringExample(): Promise<void> {
  console.log('📊 Performance Monitoring Example');
  console.log('==================================');
  console.log('');

  const testingSystem = new EpicTestingSystem({
    enablePerformanceTests: true,
    enableEngagementTracking: true,
    alertingEnabled: true,
  });

  try {
    console.log('Starting performance monitoring...');

    // Run performance validation
    const performanceResults = await testingSystem.runPerformanceValidation();

    console.log('⚡ Performance Test Results:');
    performanceResults.forEach((result, index) => {
      console.log(`   Test ${index + 1}: ${result.testName}`);
      console.log(`     Result: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
      console.log(`     Target: ${result.targetValue}`);
      console.log(`     Actual: ${result.actualValue}`);
      console.log('');
    });

    // Generate dashboard for monitoring
    const dashboard = testingSystem.generateDashboard();

    console.log('📈 Performance Trends:');
    console.log(
      `   Response Time Trend: ${dashboard.performanceMetrics.responseTime.trend.slice(-5).join(', ')}ms`
    );
    console.log(
      `   Throughput Trend: ${dashboard.performanceMetrics.throughput.trend.slice(-5).join(', ')} req/s`
    );
    console.log(
      `   Error Rate Trend: ${dashboard.performanceMetrics.errorRate.trend
        .slice(-5)
        .map((r) => (r * 100).toFixed(1))
        .join(', ')}%`
    );
    console.log('');

    console.log('✅ Performance monitoring example complete');
  } catch (error) {
    console.error('❌ Performance monitoring example failed:', error);
  } finally {
    testingSystem.shutdown();
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const example = args[0] || 'complete';

  switch (example) {
    case 'complete':
      await runCompleteValidationExample();
      break;
    case 'ci':
      await runCIIntegrationExample();
      break;
    case 'monitoring':
      await runPerformanceMonitoringExample();
      break;
    default:
      console.log(`
EPIC-TESTING-METRICS Examples

Usage: bun run src/testing/examples/complete-validation-example.ts <example>

Examples:
  complete   - Complete validation suite example (default)
  ci         - CI/CD integration example
  monitoring - Performance monitoring example

Run examples:
  bun run src/testing/examples/complete-validation-example.ts complete
  bun run src/testing/examples/complete-validation-example.ts ci
  bun run src/testing/examples/complete-validation-example.ts monitoring
      `);
      break;
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Example execution failed:', error);
    process.exit(1);
  });
}

export { runCompleteValidationExample, runCIIntegrationExample, runPerformanceMonitoringExample };
