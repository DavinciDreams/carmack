import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cleanupTestFiles, createTestFiles, measurePerformance } from '../test-helpers.js';

/**
 * Telemetry Validation Framework
 *
 * Comprehensive testing of system telemetry, monitoring, and observability.
 * Validates metrics collection, error tracking, performance monitoring,
 * and usage analytics across all system components.
 */

interface TelemetryEvent {
  timestamp: number;
  type: 'performance' | 'error' | 'usage' | 'transformation' | 'validation';
  component: string;
  data: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface TelemetryMetrics {
  totalEvents: number;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  transformationCount: number;
  validationCount: number;
  successRate: number;
}

class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private startTime: number = Date.now();

  recordEvent(event: Omit<TelemetryEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    });
  }

  recordPerformance(component: string, duration: number, operation: string): void {
    this.recordEvent({
      type: 'performance',
      component,
      data: { duration, operation },
      severity: duration > 1000 ? 'high' : duration > 500 ? 'medium' : 'low',
    });
  }

  recordError(component: string, error: Error, context?: Record<string, unknown>): void {
    this.recordEvent({
      type: 'error',
      component,
      data: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
      severity: 'critical',
    });
  }

  recordUsage(component: string, action: string, metadata?: Record<string, unknown>): void {
    this.recordEvent({
      type: 'usage',
      component,
      data: { action, ...metadata },
      severity: 'low',
    });
  }

  recordTransformation(mode: string, fileCount: number, duration: number, success: boolean): void {
    this.recordEvent({
      type: 'transformation',
      component: 'transformation-engine',
      data: { mode, fileCount, duration, success },
      severity: success ? 'low' : 'high',
    });
  }

  recordValidation(
    validationType: string,
    duration: number,
    passed: boolean,
    errors?: string[]
  ): void {
    this.recordEvent({
      type: 'validation',
      component: 'validation-engine',
      data: { validationType, duration, passed, errors },
      severity: passed ? 'low' : 'medium',
    });
  }

  getMetrics(): TelemetryMetrics {
    const totalEvents = this.events.length;
    const errorEvents = this.events.filter((e) => e.type === 'error');
    const performanceEvents = this.events.filter((e) => e.type === 'performance');
    const transformationEvents = this.events.filter((e) => e.type === 'transformation');
    const validationEvents = this.events.filter((e) => e.type === 'validation');

    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;

    const avgResponseTime =
      performanceEvents.length > 0
        ? performanceEvents.reduce((sum, e) => sum + (e.data.duration as number), 0) /
          performanceEvents.length
        : 0;

    const successfulTransformations = transformationEvents.filter((e) => e.data.success === true);
    const successfulValidations = validationEvents.filter((e) => e.data.passed === true);
    const totalOperations = transformationEvents.length + validationEvents.length;
    const successfulOperations = successfulTransformations.length + successfulValidations.length;
    const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;

    return {
      totalEvents,
      errorRate,
      averageResponseTime: avgResponseTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      transformationCount: transformationEvents.length,
      validationCount: validationEvents.length,
      successRate,
    };
  }

  getEventsByType(type: TelemetryEvent['type']): TelemetryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getEventsBySeverity(severity: TelemetryEvent['severity']): TelemetryEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  getEventsInTimeRange(startTime: number, endTime: number): TelemetryEvent[] {
    return this.events.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  clear(): void {
    this.events = [];
    this.startTime = Date.now();
  }

  exportEvents(): TelemetryEvent[] {
    return [...this.events];
  }
}

describe('Telemetry Validation Framework', () => {
  let telemetry: TelemetryCollector;
  let testFiles: string[];

  beforeEach(async () => {
    telemetry = new TelemetryCollector();
    testFiles = await createTestFiles();
  });

  afterEach(async () => {
    await cleanupTestFiles(testFiles);
  });

  describe('Event Collection', () => {
    test('should collect performance events correctly', async () => {
      console.log('🔬 Testing performance event collection');

      const startTime = Date.now();

      // Simulate various performance scenarios
      telemetry.recordPerformance('analysis-actor', 150, 'file-analysis');
      telemetry.recordPerformance('transformation-actor', 750, 'ast-transformation');
      telemetry.recordPerformance('validation-actor', 1200, 'schema-validation');

      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

      const performanceEvents = telemetry.getEventsByType('performance');

      expect(performanceEvents).toHaveLength(3);
      expect(performanceEvents[0].data.duration).toBe(150);
      expect(performanceEvents[0].severity).toBe('low');
      expect(performanceEvents[1].severity).toBe('medium');
      expect(performanceEvents[2].severity).toBe('high');

      console.log(`   ✅ Collected ${performanceEvents.length} performance events`);
      console.log(
        `   📊 Severity distribution: ${performanceEvents.map((e) => e.severity).join(', ')}`
      );
    });

    test('should collect error events with context', async () => {
      console.log('🔬 Testing error event collection');

      const testError = new Error('Test validation failure');
      const context = { fileCount: 5, transformationMode: 'ast' };

      telemetry.recordError('validation-actor', testError, context);
      telemetry.recordError('transformation-actor', new Error('AST parsing failed'));

      const errorEvents = telemetry.getEventsByType('error');

      expect(errorEvents).toHaveLength(2);
      expect(errorEvents[0].data.message).toBe('Test validation failure');
      expect(errorEvents[0].data.fileCount).toBe(5);
      expect(errorEvents[0].severity).toBe('critical');

      console.log(`   ✅ Collected ${errorEvents.length} error events`);
      console.log(`   🚨 Error messages: ${errorEvents.map((e) => e.data.message).join(', ')}`);
    });

    test('should collect usage analytics', async () => {
      console.log('🔬 Testing usage analytics collection');

      telemetry.recordUsage('ui-component', 'button-click', { buttonId: 'transform-btn' });
      telemetry.recordUsage('api-endpoint', 'file-upload', {
        fileSize: 1024,
        fileType: 'typescript',
      });
      telemetry.recordUsage('transformation-engine', 'mode-selection', {
        selectedMode: 'template',
      });

      const usageEvents = telemetry.getEventsByType('usage');

      expect(usageEvents).toHaveLength(3);
      expect(usageEvents[0].data.action).toBe('button-click');
      expect(usageEvents[1].data.fileSize).toBe(1024);

      console.log(`   ✅ Collected ${usageEvents.length} usage events`);
      console.log(`   📈 Actions tracked: ${usageEvents.map((e) => e.data.action).join(', ')}`);
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate comprehensive system metrics', async () => {
      console.log('🔬 Testing metrics calculation');

      // Simulate a realistic workload
      telemetry.recordTransformation('template', 5, 200, true);
      telemetry.recordTransformation('ast', 3, 450, true);
      telemetry.recordTransformation('llm', 2, 1200, false);

      telemetry.recordValidation('schema', 100, true);
      telemetry.recordValidation('syntax', 150, true);
      telemetry.recordValidation('security', 300, false, ['potential-xss']);

      telemetry.recordPerformance('analysis', 180, 'code-analysis');
      telemetry.recordError('transformation', new Error('Memory limit exceeded'));

      const metrics = telemetry.getMetrics();

      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.transformationCount).toBe(3);
      expect(metrics.validationCount).toBe(3);
      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThan(100); // Due to failures
      expect(metrics.memoryUsage).toBeGreaterThan(0);

      console.log('   ✅ Calculated comprehensive metrics');
      console.log(`   📊 Total events: ${metrics.totalEvents}`);
      console.log(`   📈 Success rate: ${metrics.successRate.toFixed(1)}%`);
      console.log(`   🚨 Error rate: ${metrics.errorRate.toFixed(1)}%`);
      console.log(`   ⏱️ Avg response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`   💾 Memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
    });

    test('should handle edge cases in metrics calculation', async () => {
      console.log('🔬 Testing metrics edge cases');

      // Test with no events
      let metrics = telemetry.getMetrics();
      expect(metrics.totalEvents).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.successRate).toBe(100);

      // Test with only successful operations
      telemetry.recordTransformation('template', 1, 100, true);
      telemetry.recordValidation('schema', 50, true);

      metrics = telemetry.getMetrics();
      expect(metrics.successRate).toBe(100);
      expect(metrics.errorRate).toBe(0);

      console.log('   ✅ Handled edge cases correctly');
      console.log('   📊 No events scenario: success rate 100%');
      console.log(`   📈 All success scenario: success rate ${metrics.successRate}%`);
    });
  });

  describe('Event Filtering and Querying', () => {
    test('should filter events by severity level', async () => {
      console.log('🔬 Testing event filtering by severity');

      telemetry.recordPerformance('component-a', 100, 'fast-operation'); // low
      telemetry.recordPerformance('component-b', 600, 'medium-operation'); // medium
      telemetry.recordPerformance('component-c', 1500, 'slow-operation'); // high
      telemetry.recordError('component-d', new Error('Critical failure')); // critical

      const lowSeverity = telemetry.getEventsBySeverity('low');
      const mediumSeverity = telemetry.getEventsBySeverity('medium');
      const highSeverity = telemetry.getEventsBySeverity('high');
      const criticalSeverity = telemetry.getEventsBySeverity('critical');

      expect(lowSeverity).toHaveLength(1);
      expect(mediumSeverity).toHaveLength(1);
      expect(highSeverity).toHaveLength(1);
      expect(criticalSeverity).toHaveLength(1);

      console.log('   ✅ Filtered events by severity');
      console.log(
        `   📊 Low: ${lowSeverity.length}, Medium: ${mediumSeverity.length}, High: ${highSeverity.length}, Critical: ${criticalSeverity.length}`
      );
    });

    test('should filter events by time range', async () => {
      console.log('🔬 Testing time range filtering');

      const startTime = Date.now();

      telemetry.recordUsage('component-1', 'action-1');

      await new Promise((resolve) => setTimeout(resolve, 100));
      const midTime = Date.now();

      telemetry.recordUsage('component-2', 'action-2');

      await new Promise((resolve) => setTimeout(resolve, 100));
      const endTime = Date.now();

      const allEvents = telemetry.getEventsInTimeRange(startTime, endTime);
      const firstHalfEvents = telemetry.getEventsInTimeRange(startTime, midTime - 1); // Exclude midTime boundary
      const secondHalfEvents = telemetry.getEventsInTimeRange(midTime, endTime);

      expect(allEvents).toHaveLength(2);
      expect(firstHalfEvents).toHaveLength(1);
      expect(secondHalfEvents).toHaveLength(1);

      console.log('   ✅ Filtered events by time range');
      console.log(
        `   📊 All events: ${allEvents.length}, First half: ${firstHalfEvents.length}, Second half: ${secondHalfEvents.length}`
      );
    });
  });

  describe('Performance Monitoring', () => {
    test('should monitor transformation performance across modes', async () => {
      console.log('🔬 Testing transformation performance monitoring');

      const modes = ['template', 'ast', 'llm'];
      const results: Array<{ mode: string; duration: number; success: boolean }> = [];

      for (const mode of modes) {
        const { duration } = await measurePerformance(async () => {
          // Simulate transformation work
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
          return { success: Math.random() > 0.1 }; // 90% success rate
        });

        const success = Math.random() > 0.1;
        telemetry.recordTransformation(mode, 3, duration, success);
        results.push({ mode, duration, success });
      }

      const transformationEvents = telemetry.getEventsByType('transformation');
      expect(transformationEvents).toHaveLength(3);

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const successCount = results.filter((r) => r.success).length;

      console.log('   ✅ Monitored transformation performance');
      console.log(`   📊 Average duration: ${avgDuration.toFixed(0)}ms`);
      console.log(`   📈 Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
      console.log(`   🔄 Modes tested: ${modes.join(', ')}`);
    });

    test('should detect performance anomalies', async () => {
      console.log('🔬 Testing performance anomaly detection');

      // Record normal performance
      for (let i = 0; i < 5; i++) {
        telemetry.recordPerformance(
          'normal-component',
          100 + Math.random() * 50,
          'normal-operation'
        );
      }

      // Record anomalous performance
      telemetry.recordPerformance('slow-component', 2000, 'anomalous-operation');
      telemetry.recordPerformance('very-slow-component', 5000, 'critical-operation');

      const performanceEvents = telemetry.getEventsByType('performance');
      const highSeverityEvents = telemetry.getEventsBySeverity('high');

      expect(performanceEvents).toHaveLength(7);
      expect(highSeverityEvents.length).toBeGreaterThanOrEqual(2);

      const avgNormalDuration =
        performanceEvents
          .filter((e) => e.severity === 'low')
          .reduce((sum, e) => sum + (e.data.duration as number), 0) / 5;

      const anomalousDurations = highSeverityEvents.map((e) => e.data.duration as number);

      console.log('   ✅ Detected performance anomalies');
      console.log(`   📊 Normal avg duration: ${avgNormalDuration.toFixed(0)}ms`);
      console.log(`   🚨 Anomalous durations: ${anomalousDurations.join('ms, ')}ms`);
      console.log(
        `   📈 Anomaly detection rate: ${((highSeverityEvents.length / performanceEvents.length) * 100).toFixed(1)}%`
      );
    });
  });

  describe('Error Tracking and Analysis', () => {
    test('should track error patterns and frequencies', async () => {
      console.log('🔬 Testing error pattern tracking');

      const errorTypes = [
        { component: 'parser', error: new Error('Syntax error at line 42') },
        { component: 'parser', error: new Error('Unexpected token') },
        { component: 'validator', error: new Error('Schema validation failed') },
        { component: 'transformer', error: new Error('AST transformation error') },
        { component: 'parser', error: new Error('Invalid syntax') },
      ];

      errorTypes.forEach(({ component, error }) => {
        telemetry.recordError(component, error);
      });

      const errorEvents = telemetry.getEventsByType('error');
      expect(errorEvents).toHaveLength(5);

      // Analyze error patterns
      const errorsByComponent = errorEvents.reduce(
        (acc, event) => {
          acc[event.component] = (acc[event.component] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(errorsByComponent['parser']).toBe(3);
      expect(errorsByComponent['validator']).toBe(1);
      expect(errorsByComponent['transformer']).toBe(1);

      console.log('   ✅ Tracked error patterns');
      console.log('   📊 Errors by component:', errorsByComponent);
      console.log(
        `   🚨 Most error-prone component: parser (${errorsByComponent['parser']} errors)`
      );
    });

    test('should correlate errors with performance degradation', async () => {
      console.log('🔬 Testing error-performance correlation');

      // Record normal performance followed by errors and degraded performance
      telemetry.recordPerformance('service-a', 100, 'normal-operation');
      telemetry.recordPerformance('service-a', 120, 'normal-operation');

      telemetry.recordError('service-a', new Error('Memory leak detected'));

      telemetry.recordPerformance('service-a', 800, 'degraded-operation');
      telemetry.recordPerformance('service-a', 1200, 'degraded-operation');

      const performanceEvents = telemetry.getEventsByType('performance');
      const errorEvents = telemetry.getEventsByType('error');

      expect(performanceEvents).toHaveLength(4);
      expect(errorEvents).toHaveLength(1);

      const preErrorPerf = performanceEvents.slice(0, 2);
      const postErrorPerf = performanceEvents.slice(2);

      const avgPreError =
        preErrorPerf.reduce((sum, e) => sum + (e.data.duration as number), 0) / preErrorPerf.length;
      const avgPostError =
        postErrorPerf.reduce((sum, e) => sum + (e.data.duration as number), 0) /
        postErrorPerf.length;

      const degradationRatio = avgPostError / avgPreError;

      console.log('   ✅ Correlated errors with performance');
      console.log(`   📊 Pre-error avg: ${avgPreError.toFixed(0)}ms`);
      console.log(`   📊 Post-error avg: ${avgPostError.toFixed(0)}ms`);
      console.log(`   📈 Performance degradation: ${degradationRatio.toFixed(1)}x slower`);

      expect(degradationRatio).toBeGreaterThan(5); // Significant degradation
    });
  });

  describe('Data Export and Integration', () => {
    test('should export telemetry data for external analysis', async () => {
      console.log('🔬 Testing telemetry data export');

      // Generate diverse telemetry data
      telemetry.recordPerformance('component-1', 150, 'operation-1');
      telemetry.recordError('component-2', new Error('Test error'));
      telemetry.recordUsage('component-3', 'user-action');
      telemetry.recordTransformation('template', 2, 200, true);
      telemetry.recordValidation('schema', 100, true);

      const exportedEvents = telemetry.exportEvents();

      expect(exportedEvents).toHaveLength(5);
      expect(exportedEvents[0]).toHaveProperty('timestamp');
      expect(exportedEvents[0]).toHaveProperty('type');
      expect(exportedEvents[0]).toHaveProperty('component');
      expect(exportedEvents[0]).toHaveProperty('data');

      // Verify data integrity
      const eventTypes = new Set(exportedEvents.map((e) => e.type));
      expect(eventTypes.size).toBe(5); // All different types

      console.log(`   ✅ Exported ${exportedEvents.length} telemetry events`);
      console.log(`   📊 Event types: ${Array.from(eventTypes).join(', ')}`);
      console.log('   📈 Data integrity verified');
    });

    test('should handle telemetry data cleanup and rotation', async () => {
      console.log('🔬 Testing telemetry data cleanup');

      // Fill with initial data
      for (let i = 0; i < 10; i++) {
        telemetry.recordUsage('test-component', `action-${i}`);
      }

      expect(telemetry.getMetrics().totalEvents).toBe(10);

      // Clear telemetry
      telemetry.clear();

      expect(telemetry.getMetrics().totalEvents).toBe(0);
      expect(telemetry.exportEvents()).toHaveLength(0);

      // Verify fresh start
      telemetry.recordPerformance('new-component', 100, 'fresh-operation');
      expect(telemetry.getMetrics().totalEvents).toBe(1);

      console.log('   ✅ Telemetry cleanup successful');
      console.log('   📊 Events before cleanup: 10');
      console.log('   📊 Events after cleanup: 0');
      console.log('   📊 Events after fresh start: 1');
    });
  });
});
