/**
 * Unified Test Runner for Carmack Coder
 *
 * Provides centralized test execution with proper isolation, resource management,
 * and comprehensive reporting. Addresses the issue of multiple concurrent test
 * terminals and ensures reliable test execution.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

export interface TestSuite {
  name: string;
  path: string;
  description: string;
  category: 'unit' | 'integration' | 'performance' | 'e2e';
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
  retries?: number;
  dependencies?: string[];
}

export interface TestResult {
  suite: string;
  category: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  memoryUsage?: number;
  errors: TestError[];
  warnings: string[];
  output: string;
}

export interface TestError {
  message: string;
  stack?: string;
  file?: string;
  line?: number;
}

export interface TestRunOptions {
  category?: string;
  priority?: string;
  pattern?: string;
  parallel?: boolean;
  maxConcurrency?: number;
  verbose?: boolean;
  coverage?: boolean;
  bail?: boolean;
  timeout?: number;
  retries?: number;
}

export interface TestReport {
  timestamp: string;
  duration: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  overallCoverage: number;
  results: TestResult[];
  performance: {
    averageTestTime: number;
    slowestTests: Array<{ name: string; duration: number }>;
    memoryPeak: number;
  };
  recommendations: string[];
  healthScore: number;
}

/**
 * Process pool for managing concurrent test execution
 */
class TestProcessPool {
  private activeProcesses = new Map<string, ChildProcess>();
  private maxConcurrency: number;

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute(suite: TestSuite, options: TestRunOptions): Promise<TestResult> {
    // Wait for available slot
    while (this.activeProcesses.size >= this.maxConcurrency) {
      await this.waitForSlot();
    }

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      let output = '';
      let errorOutput = '';

      // Build command
      const args = ['test', suite.path];
      if (options.coverage) args.push('--coverage');
      if (!options.verbose) args.push('--reporter=json');

      const process = spawn('bun', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: suite.timeout || options.timeout || 30000,
      });

      this.activeProcesses.set(suite.name, process);

      // Collect output
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        this.activeProcesses.delete(suite.name);
        const duration = performance.now() - startTime;

        const result: TestResult = {
          suite: suite.name,
          category: suite.category,
          passed: this.extractPassedCount(output),
          failed: this.extractFailedCount(output),
          skipped: this.extractSkippedCount(output),
          duration,
          coverage: options.coverage ? this.extractCoverage(output) : undefined,
          memoryUsage: this.extractMemoryUsage(output),
          errors: this.parseErrors(errorOutput),
          warnings: this.parseWarnings(output),
          output: options.verbose ? output : '',
        };

        if (code === 0) {
          resolve(result);
        } else {
          // Still resolve with error information for reporting
          result.errors.push({
            message: `Test process exited with code ${code}`,
            stack: errorOutput,
          });
          resolve(result);
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(suite.name);
        const duration = performance.now() - startTime;

        resolve({
          suite: suite.name,
          category: suite.category,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration,
          errors: [{ message: error.message, stack: error.stack }],
          warnings: [],
          output: '',
        });
      });
    });
  }

  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeProcesses.size < this.maxConcurrency) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  async cleanup(): Promise<void> {
    const processes = Array.from(this.activeProcesses.values());
    await Promise.all(
      processes.map(
        (process) =>
          new Promise<void>((resolve) => {
            process.kill('SIGTERM');
            process.on('close', () => resolve());
            // Force kill after timeout
            setTimeout(() => {
              process.kill('SIGKILL');
              resolve();
            }, 5000);
          })
      )
    );
    this.activeProcesses.clear();
  }

  // Output parsing methods
  private extractPassedCount(output: string): number {
    const match = output.match(/(\d+)\s+pass/i);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractFailedCount(output: string): number {
    const match = output.match(/(\d+)\s+fail/i);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractSkippedCount(output: string): number {
    const match = output.match(/(\d+)\s+skip/i);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private extractCoverage(output: string): number {
    const match = output.match(/(\d+\.?\d*)%\s+coverage/i);
    return match ? Number.parseFloat(match[1]) : 0;
  }

  private extractMemoryUsage(output: string): number {
    const match = output.match(/memory:\s*(\d+\.?\d*)\s*MB/i);
    return match ? Number.parseFloat(match[1]) : 0;
  }

  private parseErrors(errorOutput: string): TestError[] {
    const errors: TestError[] = [];
    const lines = errorOutput.split('\n');

    for (const line of lines) {
      if (line.includes('Error:') || line.includes('Failed:')) {
        errors.push({
          message: line.trim(),
          stack: errorOutput,
        });
      }
    }

    return errors;
  }

  private parseWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Warning:') || line.includes('Warn:')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}

/**
 * Main unified test runner class
 */
export class UnifiedTestRunner {
  private processPool: TestProcessPool;
  private startTime = 0;

  constructor(maxConcurrency = 3) {
    this.processPool = new TestProcessPool(maxConcurrency);
  }

  /**
   * Run test suites with proper isolation and resource management
   */
  async runTests(suites: TestSuite[], options: TestRunOptions = {}): Promise<TestReport> {
    console.log('🚀 Starting Unified Test Runner');
    console.log('================================\n');

    this.startTime = performance.now();

    // Filter suites based on options
    const filteredSuites = this.filterSuites(suites, options);

    if (filteredSuites.length === 0) {
      throw new Error('No test suites match the specified criteria');
    }

    console.log(`📋 Running ${filteredSuites.length} test suites\n`);

    // Sort by priority and dependencies
    const sortedSuites = this.sortSuitesByPriority(filteredSuites);

    const results: TestResult[] = [];
    let shouldBail = false;

    try {
      if (options.parallel && filteredSuites.length > 1) {
        // Run tests in parallel with concurrency control
        results.push(...(await this.runParallel(sortedSuites, options)));
      } else {
        // Run tests sequentially
        for (const suite of sortedSuites) {
          if (shouldBail) break;

          console.log(`🧪 Running: ${suite.name} (${suite.category})`);

          const result = await this.runSuiteWithRetry(suite, options);
          results.push(result);

          // Display immediate result
          const status = result.failed === 0 ? '✅ PASSED' : '❌ FAILED';
          console.log(
            `   ${status} - ${result.passed} passed, ${result.failed} failed (${Math.round(result.duration)}ms)\n`
          );

          // Check bail condition
          if (options.bail && result.failed > 0) {
            shouldBail = true;
            console.log('🛑 Bailing out due to test failure\n');
          }
        }
      }
    } finally {
      await this.processPool.cleanup();
    }

    return this.generateReport(results);
  }

  /**
   * Run suites in parallel with concurrency control
   */
  private async runParallel(suites: TestSuite[], options: TestRunOptions): Promise<TestResult[]> {
    const promises = suites.map((suite) => this.runSuiteWithRetry(suite, options));
    return Promise.all(promises);
  }

  /**
   * Run a single suite with retry logic
   */
  private async runSuiteWithRetry(suite: TestSuite, options: TestRunOptions): Promise<TestResult> {
    const maxRetries = suite.retries || options.retries || 1;
    let lastResult: TestResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.processPool.execute(suite, options);

        // If successful or no retries needed, return result
        if (result.failed === 0 || attempt === maxRetries) {
          return result;
        }

        lastResult = result;
        console.log(`   ⚠️ Attempt ${attempt} failed, retrying...`);

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 5000))
        );
      } catch (error) {
        if (attempt === maxRetries) {
          return {
            suite: suite.name,
            category: suite.category,
            passed: 0,
            failed: 1,
            skipped: 0,
            duration: 0,
            errors: [{ message: error instanceof Error ? error.message : String(error) }],
            warnings: [],
            output: '',
          };
        }
      }
    }

    return lastResult!;
  }

  /**
   * Filter suites based on options
   */
  private filterSuites(suites: TestSuite[], options: TestRunOptions): TestSuite[] {
    let filtered = suites.filter((suite) => existsSync(suite.path));

    if (options.category) {
      filtered = filtered.filter((suite) => suite.category === options.category);
    }

    if (options.priority) {
      filtered = filtered.filter((suite) => suite.priority === options.priority);
    }

    if (options.pattern) {
      const pattern = new RegExp(options.pattern, 'i');
      filtered = filtered.filter(
        (suite) => pattern.test(suite.name) || pattern.test(suite.description)
      );
    }

    return filtered;
  }

  /**
   * Sort suites by priority and handle dependencies
   */
  private sortSuitesByPriority(suites: TestSuite[]): TestSuite[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return suites.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by category (unit -> integration -> performance -> e2e)
      const categoryOrder = { unit: 0, integration: 1, performance: 2, e2e: 3 };
      return categoryOrder[a.category] - categoryOrder[b.category];
    });
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(results: TestResult[]): TestReport {
    const totalDuration = performance.now() - this.startTime;

    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    const coverageResults = results.filter((r) => r.coverage !== undefined);
    const overallCoverage =
      coverageResults.length > 0
        ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
        : 0;

    const slowestTests = results
      .map((r) => ({ name: r.suite, duration: r.duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    const memoryPeak = Math.max(...results.map((r) => r.memoryUsage || 0));
    const averageTestTime =
      results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

    const recommendations = this.generateRecommendations(results);
    const healthScore = this.calculateHealthScore(results);

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      overallCoverage,
      results,
      performance: {
        averageTestTime,
        slowestTests,
        memoryPeak,
      },
      recommendations,
      healthScore,
    };

    this.displayReport(report);
    return report;
  }

  /**
   * Generate actionable recommendations based on test results
   */
  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];

    const failedSuites = results.filter((r) => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push(`Fix ${failedSuites.length} failing test suite(s)`);
    }

    const slowSuites = results.filter((r) => r.duration > 10000);
    if (slowSuites.length > 0) {
      recommendations.push(`Optimize ${slowSuites.length} slow test suite(s) (>10s)`);
    }

    const highMemorySuites = results.filter((r) => (r.memoryUsage || 0) > 100);
    if (highMemorySuites.length > 0) {
      recommendations.push(
        `Investigate ${highMemorySuites.length} high memory usage test(s) (>100MB)`
      );
    }

    const lowCoverageSuites = results.filter((r) => (r.coverage || 0) < 80);
    if (lowCoverageSuites.length > 0) {
      recommendations.push(`Improve coverage for ${lowCoverageSuites.length} test suite(s) (<80%)`);
    }

    return recommendations;
  }

  /**
   * Calculate overall test health score (0-100)
   */
  private calculateHealthScore(results: TestResult[]): number {
    if (results.length === 0) return 0;

    const passRate =
      results.reduce((sum, r) => sum + r.passed, 0) /
      results.reduce((sum, r) => sum + r.passed + r.failed, 0);

    const avgCoverage =
      results
        .filter((r) => r.coverage !== undefined)
        .reduce((sum, r) => sum + (r.coverage || 0), 0) / results.length;

    const performanceScore = Math.max(
      0,
      100 - results.filter((r) => r.duration > 10000).length * 10
    );

    return Math.round(passRate * 50 + avgCoverage * 0.3 + performanceScore * 0.2);
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
    console.log(`Duration: ${Math.round(report.duration)}ms`);

    if (report.overallCoverage > 0) {
      console.log(`Coverage: ${report.overallCoverage.toFixed(1)}%`);
    }

    const successRate = (report.totalPassed / report.totalTests) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Health Score: ${report.healthScore}/100`);

    if (report.performance.slowestTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      report.performance.slowestTests.forEach((test) => {
        console.log(`   • ${test.name}: ${Math.round(test.duration)}ms`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec) => console.log(`   • ${rec}`));
    }

    console.log(
      '\n🎯 Overall Status:',
      report.totalFailed === 0 ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'
    );
  }
}
