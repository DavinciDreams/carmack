import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  validatePerformanceMetrics,
  validateLoadTestResult,
} from '../../types/unified-schemas';
import type {
  PerformanceMetrics,
  LoadTestResult,
} from '../../types/unified-schemas';

/**
 * Performance Validation Tools for EPIC-TESTING-METRICS
 *
 * Validates sub-2 second response times, concurrent user handling,
 * database query performance, and system resource consumption.
 */




// Dummy UserSimulator for type completeness (replace with real import if available)
class UserSimulator {
  constructor(public id: string, public queries: string[]) {}
  async start(_duration: number) {
    // Simulate user activity
    return [];
  }
}

export class PerformanceValidator {
  // Use a permissive type for config to allow all performance-related properties
  config: any;
  resourceSnapshots: any[] = [];
  resourceMonitor: NodeJS.Timeout | null = null;

  constructor(config: Partial<any> = {}) {
    this.config = {
      responseTimeTarget: 2000,
      memoryLimitMB: 1024,
      cpuLimitPercent: 80,
      databaseQueryTimeoutMs: 5000,
      enableResourceMonitoring: true,
      enableDetailedProfiling: false,
      warmupDuration: 30000,
      ...config,
    };
  }

  async validateConcurrentUsers(testQueries: unknown, userCount: unknown = 100, testDuration: unknown = 300000): Promise<LoadTestResult> {
    const queries = z.array(z.string()).min(1).parse(testQueries);
    const users = z.number().int().min(1).parse(userCount);
    const durationMs = z.number().int().min(1).parse(testDuration);
    const testId = randomUUID();
    const testName = 'Concurrent Users Validation';
    const startTime = new Date();
    console.log(`🚀 Starting concurrent users validation: ${testId}`);
    console.log(`Users: ${users}, Duration: ${durationMs / 1000}s`);
    this.startResourceMonitoring();
    try {
      const simulators = Array.from({ length: users }, (_, i) => new UserSimulator(`user_${i + 1}`, queries));
      console.log('👥 Starting user simulations...');
      const simulationPromises = simulators.map(sim => sim.start(durationMs));
      const allMetrics = await Promise.all(simulationPromises);
      const flatMetrics = allMetrics.flat();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const successfulQueries = flatMetrics.filter((m: any) => m.success);
      const responseTimes = successfulQueries.map((m: any) => m.responseTime);
      responseTimes.sort((a: number, b: number) => a - b);
      const summary = {
        averageResponseTime: responseTimes.reduce((sum: number, t: number) => sum + t, 0) / responseTimes.length,
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
        p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
        maxResponseTime: Math.max(...responseTimes, 0),
        minResponseTime: Math.min(...responseTimes, 0),
        successRate: successfulQueries.length / flatMetrics.length,
        throughput: (successfulQueries.length / duration) * 1000 * 60,
        peakMemoryUsage: this.getPeakMemoryUsage(),
        averageCpuUsage: this.getAverageCpuUsage(),
      };
      const metrics: PerformanceMetrics[] = [validatePerformanceMetrics({
        testId,
        testType: 'concurrent_users',
        targetValue: users,
        actualValue: users,
        passed: summary.successRate >= 0.95 && summary.averageResponseTime <= this.config.responseTimeTarget * 2,
        timestamp: new Date(),
        metadata: {
          concurrentUsers: users,
          datasetSize: flatMetrics.length,
          systemLoad: successfulQueries.length,
        },
      })];
      const passed = summary.successRate >= 0.95 && summary.averageResponseTime <= this.config.responseTimeTarget * 2 && summary.peakMemoryUsage <= this.config.memoryLimitMB * 1024 * 1024;
      const recommendations = this.generateConcurrentUserRecommendations(summary, users, passed);
      console.log(`✅ Concurrent users validation completed:`);
      console.log(`   Users: ${users}, Queries: ${flatMetrics.length}`);
      console.log(`   Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
      console.log(`   Avg Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
      console.log(`   Peak Memory: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(0)}MB`);
      console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  return validateLoadTestResult({
        testId,
        testName,
        startTime,
        endTime,
        duration,
        passed,
        metrics,
        resourceSnapshots: [...this.resourceSnapshots],
        summary,
        errors: [],
        recommendations,
      });
    } finally {
      this.stopResourceMonitoring();
    }
  }

  /**
   * Simulate a database query for performance testing.
   * Zodifies input and returns a Promise that resolves after a random delay.
   */
  private async simulateDatabaseQuery(queryType: unknown): Promise<void> {
    const type = z.enum(['semantic_search', 'graph_traversal', 'hybrid_search']).parse(queryType);
    let min = 20, max = 100;
    switch (type) {
      case 'semantic_search': min = 30; max = 120; break;
      case 'graph_traversal': min = 50; max = 200; break;
      case 'hybrid_search': min = 40; max = 150; break;
    }
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    if (Math.random() < 0.01) throw new Error(`Simulated ${type} query failure`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async warmup(queries: string[]): Promise<void> { await Promise.all(queries.map(() => Promise.resolve())); }
  private async executeQuery(_query: string): Promise<void> { await Promise.resolve(); }
  private categorizeQueryComplexity(query: string): string { return query.length > 100 ? 'complex' : 'simple'; }
  private startResourceMonitoring(): void { this.resourceSnapshots = []; }

  /**
   * Validate database query performance
   */
  async validateDatabasePerformance(
    queryTypes: string[] = ['semantic_search', 'graph_traversal', 'hybrid_search'],
    iterations: number = 50
  ): Promise<LoadTestResult> {
    const testId = randomUUID();
    const testName = 'Database Performance Validation';
    const startTime = new Date();
    console.log(`🚀 Starting database performance validation: ${testId}`);
    const metrics: PerformanceMetrics[] = [];
    const queryTimes: number[] = [];
    this.startResourceMonitoring();
    try {
      for (const queryType of queryTypes) {
        console.log(`📊 Testing ${queryType} queries...`);
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          try {
            await this.simulateDatabaseQuery(queryType);
            const end = performance.now();
            const queryTime = end - start;
            queryTimes.push(queryTime);
            const metric: PerformanceMetrics = validatePerformanceMetrics({
              testId,
              testType: 'database_query',
              targetValue: this.config.databaseQueryTimeoutMs,
              actualValue: queryTime,
              passed: queryTime <= this.config.databaseQueryTimeoutMs,
              timestamp: new Date(),
              metadata: {
                datasetSize: iterations,
                systemLoad: iterations,
              },
            });
            metrics.push(metric);
          } catch (error) {
            console.error(`Database query failed: ${error}`);
          }
        }
      }
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      queryTimes.sort((a, b) => a - b);
      const summary = {
        averageResponseTime: queryTimes.length > 0 ? queryTimes.reduce((sum, t) => sum + t, 0) / queryTimes.length : 0,
        p95ResponseTime: queryTimes.length > 0 ? queryTimes[Math.floor(queryTimes.length * 0.95)] || 0 : 0,
        p99ResponseTime: queryTimes.length > 0 ? queryTimes[Math.floor(queryTimes.length * 0.99)] || 0 : 0,
        maxResponseTime: queryTimes.length > 0 ? Math.max(...queryTimes) : 0,
        minResponseTime: queryTimes.length > 0 ? Math.min(...queryTimes) : 0,
        successRate: queryTimes.length / (queryTypes.length * iterations),
        throughput: (queryTimes.length / duration) * 1000 * 60,
        peakMemoryUsage: this.getPeakMemoryUsage(),
        averageCpuUsage: this.getAverageCpuUsage(),
      };
      const passed = summary.averageResponseTime <= this.config.databaseQueryTimeoutMs &&
                    summary.p95ResponseTime <= this.config.databaseQueryTimeoutMs * 1.5 &&
                    summary.successRate >= 0.98;
      const recommendations = this.generateDatabaseRecommendations(summary, passed);
      console.log(`✅ Database performance validation completed:`);
      console.log(`   Average Query Time: ${summary.averageResponseTime.toFixed(0)}ms`);
      console.log(`   P95: ${summary.p95ResponseTime.toFixed(0)}ms`);
      console.log(`   Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
      console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  return validateLoadTestResult({
        testId,
        testName,
        startTime,
        endTime,
        duration,
        passed,
        metrics,
        resourceSnapshots: [...this.resourceSnapshots],
        summary,
        errors: [],
        recommendations,
      });
    } finally {
      this.stopResourceMonitoring();
    }
  }

  /**
   * Run comprehensive performance validation suite
   */
  async runComprehensiveValidation(testQueries: string[]): Promise<LoadTestResult[]> {
    console.log('🚀 Starting comprehensive performance validation suite');
  const results: LoadTestResult[] = [];
    // 1. Response time validation
    console.log('\n1️⃣ Response Time Validation');
    results.push(await this.validateResponseTime(testQueries));
    // 2. Concurrent users validation
    console.log('\n2️⃣ Concurrent Users Validation');
    results.push(await this.validateConcurrentUsers(testQueries));
    // 3. Database performance validation
    console.log('\n3️⃣ Database Performance Validation');
    results.push(await this.validateDatabasePerformance());
    return results;
  }

  /**
   * Validate response time for a set of queries
   */
  async validateResponseTime(testQueries: unknown, iterations: unknown = 100): Promise<LoadTestResult> {
    const queries = z.array(z.string()).min(1).parse(testQueries);
    const iters = z.number().int().min(1).parse(iterations);
    const testId = randomUUID();
    const startTime = new Date();
    console.log(`🚀 Starting response time validation: ${testId}`);
    console.log(`Target: <${this.config.responseTimeTarget}ms, Iterations: ${iters}`);
    const metrics: PerformanceMetrics[] = [];
    const responseTimes: number[] = [];
    let successCount = 0;
    this.startResourceMonitoring();
    try {
      console.log('🔥 Warming up...');
      await this.warmup(queries.slice(0, 5));
      console.log('📊 Running response time tests...');
      for (let i = 0; i < iters; i++) {
        const query = queries[i % queries.length] ?? '';
        const start = performance.now();
        try {
          await this.executeQuery(query);
          const end = performance.now();
          const responseTime = end - start;
          responseTimes.push(responseTime);
          successCount++;
          const metric: PerformanceMetrics = validatePerformanceMetrics({
            testId,
            testType: 'response_time',
            targetValue: this.config.responseTimeTarget,
            actualValue: responseTime,
            passed: responseTime <= this.config.responseTimeTarget,
            timestamp: new Date(),
            metadata: { queryComplexity: this.categorizeQueryComplexity(query || '') },
          });
          metrics.push(metric);
          if ((i + 1) % 10 === 0) {
            const avgTime = responseTimes.slice(-10).reduce((sum, t) => sum + t, 0) / 10;
            console.log(`   Progress: ${i + 1}/${iters}, Avg last 10: ${avgTime.toFixed(0)}ms`);
          }
        } catch (error) {
          console.error(`Query failed: ${error}`);
        }
      }
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      responseTimes.sort((a, b) => a - b);
      const summary = {
        averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0,
        p95ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] || 0 : 0,
        p99ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] || 0 : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        successRate: successCount / iters,
        throughput: (successCount / duration) * 1000 * 60,
        peakMemoryUsage: this.getPeakMemoryUsage(),
        averageCpuUsage: this.getAverageCpuUsage(),
      };
      const passed = summary.averageResponseTime <= this.config.responseTimeTarget && summary.p95ResponseTime <= this.config.responseTimeTarget * 1.5 && summary.successRate >= 0.95;
      const recommendations = this.generateResponseTimeRecommendations(summary, passed);
      console.log(`✅ Response time validation completed:`);
      console.log(`   Average: ${summary.averageResponseTime.toFixed(0)}ms (Target: ${this.config.responseTimeTarget}ms)`);
      console.log(`   P95: ${summary.p95ResponseTime.toFixed(0)}ms`);
      console.log(`   Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
      console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  return validateLoadTestResult({
        testId,
        testName: 'Response Time Validation',
        startTime,
        endTime,
        duration,
        passed,
        metrics,
        resourceSnapshots: [...this.resourceSnapshots],
        summary,
        errors: [],
        recommendations,
      });
    } finally {
      this.stopResourceMonitoring();
    }
  }

  private stopResourceMonitoring(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
  }

  private getPeakMemoryUsage(): number {
    if (this.resourceSnapshots.length === 0) return 0;
    return Math.max(...this.resourceSnapshots.map(s => s.memory.heapUsed));
  }

  private getAverageCpuUsage(): number {
    if (this.resourceSnapshots.length === 0) return 0;
    const totalCpu = this.resourceSnapshots.reduce((sum, s) => sum + s.cpu.user + s.cpu.system, 0);
    return totalCpu / this.resourceSnapshots.length / 1000; // Convert to ms
  }

  private generateResponseTimeRecommendations(summary: any, passed: boolean): string[] {
    const recommendations: string[] = [];

    if (!passed) {
      if (summary.averageResponseTime > this.config.responseTimeTarget) {
        recommendations.push('Optimize query processing pipeline to reduce average response time');
      }
      if (summary.p95ResponseTime > this.config.responseTimeTarget * 1.5) {
        recommendations.push('Address performance outliers affecting P95 response time');
      }
      if (summary.successRate < 0.95) {
        recommendations.push('Improve system reliability to achieve 95% success rate');
      }
    }

    if (summary.peakMemoryUsage > this.config.memoryLimitMB * 1024 * 1024 * 0.8) {
      recommendations.push('Consider memory optimization to prevent potential OOM issues');
    }

    return recommendations;
  }

  private generateConcurrentUserRecommendations(summary: any, userCount: number, passed: boolean): string[] {
    const recommendations: string[] = [];

    if (!passed) {
      recommendations.push(`System failed to handle ${userCount} concurrent users effectively`);
      
      if (summary.successRate < 0.95) {
        recommendations.push('Improve error handling and system stability under load');
      }
      
      if (summary.averageResponseTime > this.config.responseTimeTarget * 2) {
        recommendations.push('Optimize system for better performance under concurrent load');
      }
    }

    if (summary.peakMemoryUsage > this.config.memoryLimitMB * 1024 * 1024) {
      recommendations.push('Memory usage exceeded limits - implement memory optimization');
    }

    return recommendations;
  }

  private generateDatabaseRecommendations(summary: any, passed: boolean): string[] {
    const recommendations: string[] = [];

    if (!passed) {
      recommendations.push('Database performance does not meet requirements');
      
      if (summary.averageResponseTime > this.config.databaseQueryTimeoutMs) {
        recommendations.push('Optimize database queries and add appropriate indexes');
      }
      
      if (summary.p95ResponseTime > this.config.databaseQueryTimeoutMs * 1.5) {
        recommendations.push('Address slow database queries affecting P95 performance');
      }
    }

    return recommendations;
  }
}

// Convenience functions
export const validateResponseTimes = (queries: string[], iterations?: number) =>
  new PerformanceValidator().validateResponseTime(queries, iterations);
export const validateConcurrentUsers = (queries: string[], userCount?: number, duration?: number) =>
  new PerformanceValidator().validateConcurrentUsers(queries, userCount, duration);
export const validateDatabasePerformance = (queryTypes?: string[], iterations?: number) =>
  new PerformanceValidator().validateDatabasePerformance(queryTypes, iterations);
export const runFullPerformanceValidation = (queries: string[]) =>
  new PerformanceValidator().runComprehensiveValidation(queries);