#!/usr/bin/env bun

/**
 * Comprehensive Test Runner for Carmack Coder
 *
 * Executes all test suites and provides detailed reporting on test coverage,
 * performance, and component validation.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  category: 'unit' | 'integration' | 'performance' | 'e2e';
  priority: 'high' | 'medium' | 'low';
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage: number;
  results: TestResult[];
  recommendations: string[];
}

/**
 * Test suite registry
 */
const TEST_SUITES: TestSuite[] = [
  // Unit Tests - High Priority
  {
    name: 'Test Helpers',
    path: 'test/test-helpers.ts',
    description: 'Core testing utilities and mock data generators',
    category: 'unit',
    priority: 'high',
  },
  {
    name: 'Analysis Actor',
    path: 'test/actors/analysis.test.ts',
    description: 'Complexity analysis and mode recommendation testing',
    category: 'unit',
    priority: 'high',
  },
  {
    name: 'Validation Actor',
    path: 'test/actors/validation.test.ts',
    description: 'Format, type, and quality validation testing',
    category: 'unit',
    priority: 'high',
  },
  {
    name: 'Transformation Actor',
    path: 'test/actors/transformation.test.ts',
    description: 'Template, AST, and LLM transformation testing',
    category: 'unit',
    priority: 'high',
  },
  {
    name: 'Git Actor',
    path: 'test/actors/git.test.ts',
    description: 'Git checkpoint and rollback functionality',
    category: 'unit',
    priority: 'medium',
  },
  {
    name: 'Dafny Actor',
    path: 'test/actors/dafny.test.ts',
    description: 'Formal verification integration testing',
    category: 'unit',
    priority: 'medium',
  },

  // Integration Tests - High Priority
  {
    name: 'Actor Integration',
    path: 'test/integration/actor-integration.test.ts',
    description: 'Multi-actor pipeline and communication testing',
    category: 'integration',
    priority: 'high',
  },
  {
    name: 'State Machine Integration',
    path: 'test/integration/state-machine-integration.test.ts',
    description: 'XState machine orchestration and flow testing',
    category: 'integration',
    priority: 'high',
  },
  {
    name: 'Pattern Validation',
    path: 'test/integration/patterns.test.ts',
    description: 'AST pattern effectiveness and validation',
    category: 'integration',
    priority: 'medium',
  },

  // Performance Tests - Medium Priority
  {
    name: 'Performance Benchmarks',
    path: 'test/performance/benchmarks.test.ts',
    description: 'Transformation speed and memory usage benchmarks',
    category: 'performance',
    priority: 'medium',
  },
  {
    name: 'Scalability Tests',
    path: 'test/performance/scalability.test.ts',
    description: 'Large file and concurrent processing tests',
    category: 'performance',
    priority: 'low',
  },

  // E2E Tests - High Priority
  {
    name: 'End-to-End Pipeline Validation (Simplified)',
    path: 'test/e2e/pipeline-validation-simplified.test.ts',
    description: 'Simplified pipeline validation focusing on component integration',
    category: 'e2e',
    priority: 'high',
  },
  {
    name: 'End-to-End Pipeline Validation',
    path: 'test/e2e/pipeline-validation.test.ts',
    description: 'Complete pipeline validation from analysis to commit (full)',
    category: 'e2e',
    priority: 'medium',
  },

  // E2E Tests - Low Priority
  {
    name: 'Repository Processing',
    path: 'test/e2e/repository.test.ts',
    description: 'External repository processing end-to-end tests',
    category: 'e2e',
    priority: 'low',
  },
  {
    name: 'CLI Integration',
    path: 'test/e2e/cli.test.ts',
    description: 'Command-line interface integration testing',
    category: 'e2e',
    priority: 'low',
  },

  // Existing Tests
  {
    name: 'Telemetry Basic',
    path: 'test/telemetry-basic.test.ts',
    description: 'Basic telemetry functionality testing',
    category: 'unit',
    priority: 'medium',
  },
  {
    name: 'Telemetry Comprehensive',
    path: 'test/telemetry.test.ts',
    description: 'Comprehensive telemetry system testing',
    category: 'integration',
    priority: 'medium',
  },
];

class TestRunner {
  private results: TestResult[] = [];
  private startTime = 0;

  /**
   * Run all test suites
   */
  async runAllTests(
    options: {
      category?: string;
      priority?: string;
      pattern?: string;
      verbose?: boolean;
      coverage?: boolean;
    } = {}
  ): Promise<TestReport> {
    console.log('🚀 Starting Carmack Coder Test Suite');
    console.log('=====================================\n');

    this.startTime = Date.now();

    // Filter test suites based on options
    const suitesToRun = this.filterTestSuites(options);

    console.log(`📋 Running ${suitesToRun.length} test suites:\n`);

    // Run each test suite
    for (const suite of suitesToRun) {
      await this.runTestSuite(suite, options);
    }

    // Generate final report
    return this.generateReport();
  }

  /**
   * Filter test suites based on options
   */
  private filterTestSuites(options: {
    category?: string;
    priority?: string;
    pattern?: string;
  }): TestSuite[] {
    let suites = TEST_SUITES;

    if (options.category) {
      suites = suites.filter((suite) => suite.category === options.category);
    }

    if (options.priority) {
      suites = suites.filter((suite) => suite.priority === options.priority);
    }

    if (options.pattern) {
      const pattern = new RegExp(options.pattern, 'i');
      suites = suites.filter(
        (suite) => pattern.test(suite.name) || pattern.test(suite.description)
      );
    }

    // Filter only existing test files
    return suites.filter((suite) => existsSync(suite.path));
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(
    suite: TestSuite,
    options: { verbose?: boolean; coverage?: boolean }
  ): Promise<void> {
    console.log(`🧪 ${suite.name} (${suite.category})`);
    console.log(`   ${suite.description}`);

    const startTime = Date.now();

    try {
      // Build test command
      let command = `bun test ${suite.path}`;

      if (options.coverage) {
        command += ' --coverage';
      }

      if (!options.verbose) {
        command += ' --reporter=json';
      }

      // Execute test
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: options.verbose ? 'inherit' : 'pipe',
      });

      const duration = Date.now() - startTime;

      // Parse results (simplified - would need actual Bun test output parsing)
      const result: TestResult = {
        suite: suite.name,
        passed: this.extractPassedCount(output),
        failed: this.extractFailedCount(output),
        skipped: this.extractSkippedCount(output),
        duration,
        coverage: options.coverage ? this.extractCoverage(output) : undefined,
      };

      this.results.push(result);

      // Display result
      const status = result.failed === 0 ? '✅ PASSED' : '❌ FAILED';
      console.log(
        `   ${status} - ${result.passed} passed, ${result.failed} failed (${duration}ms)\n`
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      console.log(`   ❌ ERROR - Test suite failed to run (${duration}ms)`);
      if (options.verbose) {
        console.log(`   Error: ${error}\n`);
      }

      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
      });
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime;

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    const coverageResults = this.results.filter((r) => r.coverage !== undefined);
    const overallCoverage =
      coverageResults.length > 0
        ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
        : 0;

    const recommendations = this.generateRecommendations();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      results: this.results,
      recommendations,
    };

    this.displayReport(report);
    return report;
  }

  /**
   * Display formatted test report
   */
  private displayReport(report: TestReport): void {
    console.log('\n📊 Test Report Summary');
    console.log('======================');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.totalPassed} ✅`);
    console.log(`Failed: ${report.totalFailed} ${report.totalFailed > 0 ? '❌' : '✅'}`);
    console.log(`Skipped: ${report.totalSkipped}`);
    console.log(`Duration: ${report.totalDuration}ms`);

    if (report.overallCoverage > 0) {
      console.log(`Coverage: ${report.overallCoverage.toFixed(1)}%`);
    }

    const successRate = (report.totalPassed / report.totalTests) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec) => console.log(`   • ${rec}`));
    }

    console.log(
      '\n🎯 Test Status:',
      report.totalFailed === 0 ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'
    );
  }

  /**
   * Generate testing recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedSuites = this.results.filter((r) => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push(`Fix ${failedSuites.length} failing test suite(s)`);
    }

    const slowSuites = this.results.filter((r) => r.duration > 5000);
    if (slowSuites.length > 0) {
      recommendations.push(`Optimize ${slowSuites.length} slow test suite(s) (>5s)`);
    }

    const missingTests = TEST_SUITES.filter((suite) => !existsSync(suite.path));
    if (missingTests.length > 0) {
      recommendations.push(`Implement ${missingTests.length} missing test suite(s)`);
    }

    const highPriorityMissing = missingTests.filter((suite) => suite.priority === 'high');
    if (highPriorityMissing.length > 0) {
      recommendations.push(
        `Prioritize implementing ${highPriorityMissing.length} high-priority test suite(s)`
      );
    }

    return recommendations;
  }

  // Simplified parsing methods (would need actual Bun test output parsing)
  private extractPassedCount(output: string): number {
    if (!output) return 0;
    const match = output.match(/(\d+) pass/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractFailedCount(output: string): number {
    if (!output) return 0;
    const match = output.match(/(\d+) fail/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractSkippedCount(output: string): number {
    if (!output) return 0;
    const match = output.match(/(\d+) skip/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractCoverage(output: string): number {
    const match = output.match(/(\d+\.?\d*)% coverage/);
    return match ? Number.parseFloat(match[1]) : 0;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  const options = {
    category: args.find((arg) => arg.startsWith('--category='))?.split('=')[1],
    priority: args.find((arg) => arg.startsWith('--priority='))?.split('=')[1],
    pattern: args.find((arg) => arg.startsWith('--pattern='))?.split('=')[1],
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Carmack Coder Test Runner

Usage: bun run test/run-tests.ts [options]

Options:
  --category=<type>     Run tests of specific category (unit|integration|performance|e2e)
  --priority=<level>    Run tests of specific priority (high|medium|low)
  --pattern=<regex>     Run tests matching pattern
  --verbose, -v         Verbose output
  --coverage, -c        Include coverage analysis
  --help, -h           Show this help

Examples:
  bun run test/run-tests.ts                    # Run all available tests
  bun run test/run-tests.ts --category=unit    # Run only unit tests
  bun run test/run-tests.ts --priority=high    # Run only high priority tests
  bun run test/run-tests.ts --pattern=actor    # Run tests matching "actor"
  bun run test/run-tests.ts --verbose          # Run with verbose output
`);
    return;
  }

  const runner = new TestRunner();
  const report = await runner.runAllTests(options);

  // Exit with error code if tests failed
  process.exit(report.totalFailed > 0 ? 1 : 0);
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, type TestSuite, type TestResult, type TestReport };
