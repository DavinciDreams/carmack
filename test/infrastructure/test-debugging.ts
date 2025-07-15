/**
 * Test Debugging and Health Monitoring Utilities for Carmack Coder
 *
 * Provides comprehensive debugging tools, health monitoring, and diagnostic
 * utilities to help identify and resolve test issues quickly.
 */

import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export interface TestHealthMetrics {
  timestamp: string;
  testSuite: string;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  status: 'passed' | 'failed' | 'timeout' | 'error';
  errorCount: number;
  warningCount: number;
  retryCount: number;
}

export interface TestDiagnostics {
  testName: string;
  category: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'passed' | 'failed' | 'timeout';
  errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
  warnings: string[];
  memorySnapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
  }>;
  performanceMarks: Array<{
    name: string;
    timestamp: number;
    duration?: number;
  }>;
  actorStates: Array<{
    actorName: string;
    state: string;
    timestamp: number;
    context?: any;
  }>;
}

/**
 * Test health monitor for tracking test performance and reliability
 */
export class TestHealthMonitor {
  private metrics: TestHealthMetrics[] = [];
  private diagnostics = new Map<string, TestDiagnostics>();
  private healthThresholds = {
    maxDuration: 30000, // 30 seconds
    maxMemoryIncrease: 100 * 1024 * 1024, // 100MB
    maxRetries: 3,
    minSuccessRate: 0.95, // 95%
  };

  /**
   * Start monitoring a test
   */
  startTest(testName: string, category: string): void {
    const diagnostic: TestDiagnostics = {
      testName,
      category,
      startTime: performance.now(),
      status: 'running',
      errors: [],
      warnings: [],
      memorySnapshots: [
        {
          timestamp: performance.now(),
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
        },
      ],
      performanceMarks: [],
      actorStates: [],
    };

    this.diagnostics.set(testName, diagnostic);
    console.log(`🔍 [DEBUG] Starting test: ${testName} (${category})`);
  }

  /**
   * End monitoring a test
   */
  endTest(testName: string, status: 'passed' | 'failed' | 'timeout', error?: Error): void {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return;

    const endTime = performance.now();
    diagnostic.endTime = endTime;
    diagnostic.duration = endTime - diagnostic.startTime;
    diagnostic.status = status;

    if (error) {
      diagnostic.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: endTime,
      });
    }

    // Take final memory snapshot
    diagnostic.memorySnapshots.push({
      timestamp: endTime,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
    });

    // Create health metrics
    const metrics: TestHealthMetrics = {
      timestamp: new Date().toISOString(),
      testSuite: testName,
      duration: diagnostic.duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      status,
      errorCount: diagnostic.errors.length,
      warningCount: diagnostic.warnings.length,
      retryCount: 0, // Would need to be tracked separately
    };

    this.metrics.push(metrics);

    // Log health status
    this.logTestHealth(testName, diagnostic, metrics);
  }

  /**
   * Add performance mark
   */
  mark(testName: string, markName: string): void {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return;

    const timestamp = performance.now();
    diagnostic.performanceMarks.push({
      name: markName,
      timestamp,
    });

    console.log(
      `⏱️ [PERF] ${testName}: ${markName} at ${Math.round(timestamp - diagnostic.startTime)}ms`
    );
  }

  /**
   * Measure duration between marks
   */
  measure(testName: string, startMark: string, endMark: string): number | null {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return null;

    const startMarkEntry = diagnostic.performanceMarks.find((m) => m.name === startMark);
    const endMarkEntry = diagnostic.performanceMarks.find((m) => m.name === endMark);

    if (!startMarkEntry || !endMarkEntry) return null;

    const duration = endMarkEntry.timestamp - startMarkEntry.timestamp;

    // Update the end mark with duration
    endMarkEntry.duration = duration;

    console.log(`📏 [MEASURE] ${testName}: ${startMark} → ${endMark} = ${Math.round(duration)}ms`);
    return duration;
  }

  /**
   * Add warning
   */
  warn(testName: string, message: string): void {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return;

    diagnostic.warnings.push(message);
    console.log(`⚠️ [WARN] ${testName}: ${message}`);
  }

  /**
   * Track actor state
   */
  trackActorState(testName: string, actorName: string, state: string, context?: any): void {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return;

    diagnostic.actorStates.push({
      actorName,
      state,
      timestamp: performance.now(),
      context,
    });

    console.log(`🎭 [ACTOR] ${testName}: ${actorName} → ${state}`);
  }

  /**
   * Take memory snapshot
   */
  takeMemorySnapshot(testName: string): void {
    const diagnostic = this.diagnostics.get(testName);
    if (!diagnostic) return;

    const memUsage = process.memoryUsage();
    diagnostic.memorySnapshots.push({
      timestamp: performance.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    });

    console.log(
      `💾 [MEMORY] ${testName}: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap used`
    );
  }

  /**
   * Log test health status
   */
  private logTestHealth(
    testName: string,
    diagnostic: TestDiagnostics,
    metrics: TestHealthMetrics
  ): void {
    const duration = diagnostic.duration || 0;
    const memoryIncrease =
      diagnostic.memorySnapshots.length > 1
        ? diagnostic.memorySnapshots[diagnostic.memorySnapshots.length - 1].heapUsed -
          diagnostic.memorySnapshots[0].heapUsed
        : 0;

    console.log(`\n🏥 [HEALTH] Test Health Report: ${testName}`);
    console.log(
      `   Status: ${metrics.status === 'passed' ? '✅' : '❌'} ${metrics.status.toUpperCase()}`
    );
    console.log(
      `   Duration: ${Math.round(duration)}ms ${duration > this.healthThresholds.maxDuration ? '⚠️ SLOW' : '✅'}`
    );
    console.log(
      `   Memory: +${Math.round(memoryIncrease / 1024 / 1024)}MB ${memoryIncrease > this.healthThresholds.maxMemoryIncrease ? '⚠️ HIGH' : '✅'}`
    );
    console.log(`   Errors: ${metrics.errorCount} ${metrics.errorCount > 0 ? '❌' : '✅'}`);
    console.log(`   Warnings: ${metrics.warningCount} ${metrics.warningCount > 0 ? '⚠️' : '✅'}`);

    if (diagnostic.performanceMarks.length > 0) {
      console.log(`   Performance Marks: ${diagnostic.performanceMarks.length}`);
      diagnostic.performanceMarks.forEach((mark) => {
        const relativeTime = Math.round(mark.timestamp - diagnostic.startTime);
        console.log(
          `     • ${mark.name}: ${relativeTime}ms${mark.duration ? ` (${Math.round(mark.duration)}ms)` : ''}`
        );
      });
    }

    if (diagnostic.actorStates.length > 0) {
      console.log(`   Actor State Changes: ${diagnostic.actorStates.length}`);
      diagnostic.actorStates.slice(-3).forEach((state) => {
        const relativeTime = Math.round(state.timestamp - diagnostic.startTime);
        console.log(`     • ${state.actorName}: ${state.state} at ${relativeTime}ms`);
      });
    }

    console.log('');
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    averageMemoryUsage: number;
    successRate: number;
    healthScore: number;
    recommendations: string[];
  } {
    const totalTests = this.metrics.length;
    const passedTests = this.metrics.filter((m) => m.status === 'passed').length;
    const failedTests = totalTests - passedTests;

    const averageDuration =
      totalTests > 0 ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests : 0;

    const averageMemoryUsage =
      totalTests > 0
        ? this.metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / totalTests
        : 0;

    const successRate = totalTests > 0 ? passedTests / totalTests : 0;

    const healthScore = this.calculateHealthScore();
    const recommendations = this.generateRecommendations();

    return {
      totalTests,
      passedTests,
      failedTests,
      averageDuration,
      averageMemoryUsage,
      successRate,
      healthScore,
      recommendations,
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(): number {
    if (this.metrics.length === 0) return 100;

    const successRate =
      this.metrics.filter((m) => m.status === 'passed').length / this.metrics.length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
    const avgMemory =
      this.metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / this.metrics.length;

    // Score components (0-100 each)
    const successScore = successRate * 100;
    const performanceScore = Math.max(
      0,
      100 - (avgDuration / this.healthThresholds.maxDuration) * 100
    );
    const memoryScore = Math.max(
      0,
      100 - (avgMemory / this.healthThresholds.maxMemoryIncrease) * 100
    );

    // Weighted average
    return Math.round(successScore * 0.5 + performanceScore * 0.3 + memoryScore * 0.2);
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedTests = this.metrics.filter((m) => m.status === 'failed').length;
    if (failedTests > 0) {
      recommendations.push(`Fix ${failedTests} failing test(s)`);
    }

    const slowTests = this.metrics.filter(
      (m) => m.duration > this.healthThresholds.maxDuration
    ).length;
    if (slowTests > 0) {
      recommendations.push(
        `Optimize ${slowTests} slow test(s) (>${this.healthThresholds.maxDuration}ms)`
      );
    }

    const memoryIntensiveTests = this.metrics.filter(
      (m) => m.memoryUsage.heapUsed > this.healthThresholds.maxMemoryIncrease
    ).length;
    if (memoryIntensiveTests > 0) {
      recommendations.push(`Investigate ${memoryIntensiveTests} memory-intensive test(s)`);
    }

    const successRate =
      this.metrics.filter((m) => m.status === 'passed').length / this.metrics.length;
    if (successRate < this.healthThresholds.minSuccessRate) {
      recommendations.push(
        `Improve test reliability (current: ${Math.round(successRate * 100)}%, target: ${Math.round(this.healthThresholds.minSuccessRate * 100)}%)`
      );
    }

    return recommendations;
  }

  /**
   * Export diagnostics to file
   */
  async exportDiagnostics(outputDir?: string): Promise<string> {
    const dir = outputDir || join(tmpdir(), 'carmack-test-diagnostics');
    await mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-diagnostics-${timestamp}.json`;
    const filepath = join(dir, filename);

    const exportData = {
      timestamp: new Date().toISOString(),
      summary: this.getHealthSummary(),
      metrics: this.metrics,
      diagnostics: Object.fromEntries(this.diagnostics),
      thresholds: this.healthThresholds,
    };

    await writeFile(filepath, JSON.stringify(exportData, null, 2));
    console.log(`📊 [EXPORT] Diagnostics exported to: ${filepath}`);

    return filepath;
  }

  /**
   * Clear all metrics and diagnostics
   */
  clear(): void {
    this.metrics = [];
    this.diagnostics.clear();
  }
}

/**
 * Test debugger for interactive debugging
 */
export class TestDebugger {
  private breakpoints = new Set<string>();
  private watchedVariables = new Map<string, any>();
  private debugMode = false;

  /**
   * Enable debug mode
   */
  enable(): void {
    this.debugMode = true;
    console.log('🐛 [DEBUG] Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this.debugMode = false;
    this.breakpoints.clear();
    this.watchedVariables.clear();
    console.log('🐛 [DEBUG] Debug mode disabled');
  }

  /**
   * Set breakpoint
   */
  setBreakpoint(name: string): void {
    if (!this.debugMode) return;

    this.breakpoints.add(name);
    console.log(`🔴 [BREAKPOINT] Set: ${name}`);
  }

  /**
   * Check if breakpoint should trigger
   */
  checkBreakpoint(name: string, context?: any): void {
    if (!this.debugMode || !this.breakpoints.has(name)) return;

    console.log(`\n🛑 [BREAKPOINT] Hit: ${name}`);
    if (context) {
      console.log('Context:', JSON.stringify(context, null, 2));
    }

    // Show watched variables
    if (this.watchedVariables.size > 0) {
      console.log('Watched Variables:');
      for (const [varName, value] of this.watchedVariables) {
        console.log(`  ${varName}:`, value);
      }
    }

    console.log('');
  }

  /**
   * Watch variable
   */
  watch(name: string, value: any): void {
    if (!this.debugMode) return;

    const oldValue = this.watchedVariables.get(name);
    this.watchedVariables.set(name, value);

    if (oldValue !== undefined && oldValue !== value) {
      console.log(`👁️ [WATCH] ${name} changed: ${oldValue} → ${value}`);
    }
  }

  /**
   * Log debug message
   */
  log(message: string, data?: any): void {
    if (!this.debugMode) return;

    console.log(`🐛 [DEBUG] ${message}`);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Trace function execution
   */
  trace(functionName: string, args?: any[], result?: any): void {
    if (!this.debugMode) return;

    console.log(`📍 [TRACE] ${functionName}(${args ? JSON.stringify(args) : ''})`);
    if (result !== undefined) {
      console.log(`📍 [TRACE] ${functionName} → ${JSON.stringify(result)}`);
    }
  }

  /**
   * Assert condition with debug info
   */
  assert(condition: boolean, message: string, context?: any): void {
    if (!this.debugMode) return;

    if (!condition) {
      console.log(`❌ [ASSERT] Failed: ${message}`);
      if (context) {
        console.log('Context:', JSON.stringify(context, null, 2));
      }
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ [ASSERT] Passed: ${message}`);
  }
}

/**
 * Test performance profiler
 */
export class TestProfiler {
  private profiles = new Map<
    string,
    {
      startTime: number;
      endTime?: number;
      duration?: number;
      memoryStart: number;
      memoryEnd?: number;
      memoryDelta?: number;
    }
  >();

  /**
   * Start profiling
   */
  start(name: string): void {
    this.profiles.set(name, {
      startTime: performance.now(),
      memoryStart: process.memoryUsage().heapUsed,
    });

    console.log(`⏱️ [PROFILE] Started: ${name}`);
  }

  /**
   * End profiling
   */
  end(name: string): { duration: number; memoryDelta: number } | null {
    const profile = this.profiles.get(name);
    if (!profile) return null;

    const endTime = performance.now();
    const memoryEnd = process.memoryUsage().heapUsed;

    profile.endTime = endTime;
    profile.duration = endTime - profile.startTime;
    profile.memoryEnd = memoryEnd;
    profile.memoryDelta = memoryEnd - profile.memoryStart;

    console.log(
      `⏱️ [PROFILE] Ended: ${name} - ${Math.round(profile.duration)}ms, ${Math.round(profile.memoryDelta / 1024)}KB`
    );

    return {
      duration: profile.duration,
      memoryDelta: profile.memoryDelta,
    };
  }

  /**
   * Get all profiles
   */
  getProfiles(): Record<string, { duration?: number; memoryDelta?: number }> {
    const result: Record<string, { duration?: number; memoryDelta?: number }> = {};

    for (const [name, profile] of this.profiles) {
      result[name] = {
        duration: profile.duration,
        memoryDelta: profile.memoryDelta,
      };
    }

    return result;
  }

  /**
   * Clear all profiles
   */
  clear(): void {
    this.profiles.clear();
  }
}

// Global instances
export const testHealthMonitor = new TestHealthMonitor();
export const testDebugger = new TestDebugger();
export const testProfiler = new TestProfiler();

/**
 * Utility function to wrap test execution with monitoring
 */
export async function monitoredTest<T>(
  testName: string,
  category: string,
  testFn: () => Promise<T>
): Promise<T> {
  testHealthMonitor.startTest(testName, category);
  testProfiler.start(testName);

  try {
    const result = await testFn();
    testHealthMonitor.endTest(testName, 'passed');
    testProfiler.end(testName);
    return result;
  } catch (error) {
    const status =
      error instanceof Error && error.message.includes('timeout') ? 'timeout' : 'failed';
    testHealthMonitor.endTest(
      testName,
      status,
      error instanceof Error ? error : new Error(String(error))
    );
    testProfiler.end(testName);
    throw error;
  }
}
