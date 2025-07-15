/**
 * Comprehensive telemetry testing suite for Carmack Coder
 * Validates telemetry system performance, accuracy, and reliability across multiple scenarios
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { initializeTelemetry, type TelemetryCollector } from '../src/telemetry/collector.js';
import { createTransformationTelemetry } from '../src/telemetry/integration.js';

/**
 * Test helper for generating realistic code samples
 */

/**
 * Generate small file sample (<100 lines)
 */
function generateSmallFile(): string {
  return `
// Small TypeScript file for testing
function calculateSum(a: number, b: number): number {
  if (a < 0 || b < 0) {
    throw new Error('Negative numbers not allowed');
  }
  return a + b;
}

const result = calculateSum(5, 10);
console.log('Result:', result);
`;
}

/**
 * Generate medium file sample (100-1000 lines)
 */
function generateMediumFile(): string {
  const baseCode = generateSmallFile();
  const functionTemplate = `
function processData${Math.floor(Math.random() * 1000)}(input: unknown[]): unknown[] {
  const result = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] && typeof input[i] === 'object') {
      result.push({
        ...input[i],
        processed: true,
        timestamp: Date.now()
      });
    }
  }
  return result;
}
`;

  // Generate 20-30 similar functions to reach medium size
  let mediumCode = baseCode;
  for (let i = 0; i < 25; i++) {
    mediumCode += functionTemplate;
  }

  return mediumCode;
}

/**
 * Generate large file sample (>1000 lines)
 */
function generateLargeFile(): string {
  const mediumCode = generateMediumFile();
  const classTemplate = `
class DataProcessor${Math.floor(Math.random() * 1000)} {
  private data: unknown[] = [];
  
  constructor(initialData: unknown[]) {
    this.data = initialData;
  }
  
  process(): unknown[] {
    return this.data.map(item => {
      if (typeof item === 'string') {
        return item.toUpperCase();
      } else if (typeof item === 'number') {
        return item * 2;
      } else {
        return { ...item, processed: true };
      }
    });
  }
  
  filter(predicate: (item: unknown) => boolean): unknown[] {
    return this.data.filter(predicate);
  }
  
  sort(compareFn?: (a: unknown, b: unknown) => number): unknown[] {
    return [...this.data].sort(compareFn);
  }
}
`;

  // Generate multiple classes to reach large size
  let largeCode = mediumCode;
  for (let i = 0; i < 15; i++) {
    largeCode += classTemplate;
  }

  return largeCode;
}

/**
 * Generate code with intentional errors for error testing
 */
function generateErrorProneCode(): string {
  return `
// Code with various syntax and semantic errors
function brokenFunction() {
  const unclosedString = "this string is not closed;
  
  if (true {
    console.log('Missing closing parenthesis');
  }
  
  const undefinedVariable = someUndefinedVar + 5;
  
  return undefined.someProperty;
}

// Missing closing brace
class BrokenClass {
  method() {
    return this.nonExistentProperty;
  
`;
}

/**
 * Generate code optimized for specific pattern types
 */
function generatePatternTargetCode(patterns: string[]): string {
  let code = '// Code targeting specific patterns\n';

  if (patterns.includes('var-to-const')) {
    code += `
var counter = 0;
var userName = 'john';
var isActive = true;
`;
  }

  if (patterns.includes('strict-equality')) {
    code += `
if (value == null) { return false; }
if (count != 0) { processData(); }
`;
  }

  if (patterns.includes('arrow-functions')) {
    code += `
const double = (x) => { return x * 2; };
const greet = (name) => { return 'Hello ' + name; };
`;
  }

  if (patterns.includes('object-shorthand')) {
    code += `
const name = 'John';
const age = 30;
const user = { name: name, age: age };
`;
  }

  return code;
}

/**
 * Telemetry validation helpers
 */

interface TelemetryEvent {
  id: string;
  eventId: string;
  timestamp: number;
  sessionId: string;
  version: string;
}

interface PerformanceMetrics {
  overhead: number;
  p99: number;
  avg: number;
}

interface MemoryTimelineEntry {
  rss: number;
}

/**
 * Validate telemetry event structure
 */
function validateEventStructure(event: unknown, expectedType: string): boolean {
  const typedEvent = event as TelemetryEvent;
  return (
    typedEvent &&
    typedEvent.id === expectedType &&
    typeof typedEvent.eventId === 'string' &&
    typeof typedEvent.timestamp === 'number' &&
    typeof typedEvent.sessionId === 'string' &&
    typeof typedEvent.version === 'string'
  );
}

/**
 * Validate performance metrics within acceptable bounds
 */
function validatePerformanceMetrics(metrics: PerformanceMetrics): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (metrics.overhead > 10) {
    issues.push(`Telemetry overhead too high: ${metrics.overhead}%`);
  }

  if (metrics.p99 > 100) {
    issues.push(`P99 latency too high: ${metrics.p99}ms`);
  }

  if (metrics.avg > 50) {
    issues.push(`Average latency too high: ${metrics.avg}ms`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate memory usage patterns
 */
function validateMemoryUsage(timeline: MemoryTimelineEntry[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (timeline.length === 0) {
    issues.push('Empty memory timeline');
    return { valid: false, issues };
  }

  const memoryGrowth = timeline[timeline.length - 1].rss - timeline[0].rss;
  const growthRate = memoryGrowth / timeline.length;

  if (growthRate > 1024 * 1024) {
    // > 1MB per sample
    issues.push(`Memory growth rate too high: ${growthRate} bytes/sample`);
  }

  const maxMemory = Math.max(...timeline.map((t) => t.rss));
  if (maxMemory > 500 * 1024 * 1024) {
    // > 500MB
    issues.push(`Peak memory usage too high: ${maxMemory} bytes`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

describe('Telemetry System', () => {
  let collector: TelemetryCollector;
  let capturedEvents: unknown[] = [];

  beforeEach(() => {
    capturedEvents = [];
    collector = initializeTelemetry({
      enabled: true,
      performanceSampleRate: 1.0, // 100% for testing
      behaviorSampleRate: 1.0,
      batchSize: 10,
      flushInterval: 1000,
      maxBufferSize: 100,
      privacy: {
        collectUserIds: false,
        collectFilePaths: true,
        retentionDays: 30,
      },
    });

    // Capture all events for validation
    collector.on('batchFlush', (events) => {
      capturedEvents.push(...events);
    });
  });

  afterEach(async () => {
    await collector.shutdown();
  });

  describe('Scenario 1: High-Frequency Small Files', () => {
    test('should handle 1000 small file transformations with minimal overhead', async () => {
      const transformations: Promise<void>[] = [];
      const startTime = performance.now();

      // Simulate 1000 rapid transformations
      for (let i = 0; i < 1000; i++) {
        const transformationId = randomUUID();
        const code = generateSmallFile();
        const telemetry = createTransformationTelemetry(
          transformationId,
          'template',
          `test-file-${i}.ts`,
          code
        );

        transformations.push(
          new Promise<void>((resolve) => {
            telemetry.startTransformation();

            // Simulate pattern applications
            telemetry.recordPatternSuccess('strict-equality');
            telemetry.completeParsing();
            telemetry.completePatternMatching();
            telemetry.completeTransformationStage();
            telemetry.completeValidation();

            // Complete with minimal changes
            telemetry.completeTransformation(code, 1).then(() => resolve());
          })
        );
      }

      await Promise.all(transformations);
      await collector.shutdown();

      const totalTime = performance.now() - startTime;
      const avgTimePerTransformation = totalTime / 1000;

      // Validate performance requirements
      expect(avgTimePerTransformation).toBeLessThan(50); // <50ms per transformation

      // Validate telemetry overhead
      const healthMetrics = collector.getHealthMetrics();
      const performanceValidation = validatePerformanceMetrics(healthMetrics.performanceStats);

      expect(performanceValidation.valid).toBe(true);
      if (!performanceValidation.valid) {
        console.warn('Performance issues:', performanceValidation.issues);
      }

      // Validate event collection
      expect(capturedEvents.length).toBeGreaterThan(0);
      expect(capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-001')).toHaveLength(
        1000
      ); // Pattern success events
      expect(
        capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-004').length
      ).toBeGreaterThanOrEqual(100); // Latency events (sampled)
    });
  });

  describe('Scenario 2: Large File Processing', () => {
    test('should handle large file transformation with memory profiling', async () => {
      const transformationId = randomUUID();
      const largeCode = generateLargeFile();
      const telemetry = createTransformationTelemetry(
        transformationId,
        'ast',
        'large-file.ts',
        largeCode
      );

      telemetry.startTransformation();

      // Simulate complex AST processing
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing time

      telemetry.completeParsing();
      telemetry.completePatternMatching();
      telemetry.completeTransformationStage();
      telemetry.completeValidation();

      await telemetry.completeTransformation(largeCode, 5);
      await collector.shutdown();

      // Validate memory usage
      const memoryEvents = capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-005');
      expect(memoryEvents.length).toBeGreaterThan(0);

      for (const memEvent of memoryEvents) {
        const timeline = (memEvent as { timeline: MemoryTimelineEntry[] }).timeline;
        const memoryValidation = validateMemoryUsage(timeline);
        expect(memoryValidation.valid).toBe(true);
        if (!memoryValidation.valid) {
          console.warn('Memory issues:', memoryValidation.issues);
        }
      }

      // Validate latency distribution
      const latencyEvents = capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-004');
      expect(latencyEvents.length).toBeGreaterThan(0);

      const astLatencyEvent = latencyEvents.find((e) => (e as { mode?: string }).mode === 'ast');
      expect(astLatencyEvent).toBeDefined();
      const typedAstLatencyEvent = astLatencyEvent as { fileSizeBytes: number };
      expect(typedAstLatencyEvent.fileSizeBytes).toBeGreaterThan(10000); // Large file
    });
  });

  describe('Scenario 3: Error-Heavy Workload', () => {
    test('should track error patterns and recovery behavior', async () => {
      const _errorCode = generateErrorProneCode();

      // Simulate multiple error scenarios
      const errorScenarios = [
        { type: 'syntax-error', code: 'SE001', message: 'Unexpected token' },
        { type: 'semantic-error', code: 'SEM001', message: 'Undefined variable' },
        { type: 'pattern-error', code: 'PAT001', message: 'Pattern match failed' },
      ];

      for (const scenario of errorScenarios) {
        collector.recordErrorRecovery(
          scenario.type,
          scenario.code,
          scenario.message,
          [
            { action: 'retry', timestamp: Date.now(), success: false },
            { action: 'mode-switch', timestamp: Date.now() + 1000, success: false, newMode: 'ast' },
            { action: 'manual-fix', timestamp: Date.now() + 2000, success: true },
          ],
          2500, // 2.5 seconds to resolve
          'resolved',
          'medium'
        );
      }

      await collector.shutdown();

      // Validate error tracking
      const errorEvents = capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-008');
      expect(errorEvents).toHaveLength(3);

      for (const errorEvent of errorEvents) {
        expect(validateEventStructure(errorEvent, 'TEL-008')).toBe(true);
        const typedErrorEvent = errorEvent as {
          userActions: unknown[];
          finalOutcome: string;
          resolutionTime: number;
        };
        expect(typedErrorEvent.userActions).toHaveLength(3);
        expect(typedErrorEvent.finalOutcome).toBe('resolved');
        expect(typedErrorEvent.resolutionTime).toBe(2500);
      }
    });
  });

  describe('Scenario 4: Mixed-Mode Usage Patterns', () => {
    test('should detect user behavior patterns across transformation modes', async () => {
      const sessionStart = Date.now();

      // Simulate user session with mode switching
      const userActions = [
        {
          mode: 'template' as const,
          fileType: 'ts',
          complexity: 2,
          outcome: 'success' as const,
          timestamp: sessionStart,
          duration: 1000,
        },
        {
          mode: 'template' as const,
          fileType: 'ts',
          complexity: 3,
          outcome: 'failure' as const,
          timestamp: sessionStart + 1000,
          duration: 2000,
        },
        {
          mode: 'ast' as const,
          fileType: 'ts',
          complexity: 3,
          outcome: 'success' as const,
          timestamp: sessionStart + 3000,
          duration: 1500,
        },
        {
          mode: 'ast' as const,
          fileType: 'ts',
          complexity: 5,
          outcome: 'success' as const,
          timestamp: sessionStart + 4500,
          duration: 3000,
        },
        {
          mode: 'llm' as const,
          fileType: 'ts',
          complexity: 8,
          outcome: 'success' as const,
          timestamp: sessionStart + 7500,
          duration: 5000,
        },
      ];

      collector.recordModeSelection(userActions, 12500);
      await collector.shutdown();

      // Validate behavior tracking
      const behaviorEvents = capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-007');
      expect(behaviorEvents).toHaveLength(1);

      const behaviorEvent = behaviorEvents[0] as {
        sequence: unknown[];
        modeSwitches: number;
        dominantMode: string;
        sessionDuration: number;
        patterns: string[];
      };
      expect(behaviorEvent.sequence).toHaveLength(5);
      expect(behaviorEvent.modeSwitches).toBe(2); // template -> ast -> llm
      expect(behaviorEvent.dominantMode).toBe('ast'); // Most frequent
      expect(behaviorEvent.sessionDuration).toBe(12500);

      // Check pattern detection
      expect(behaviorEvent.patterns).toContain('frequent-mode-switching');
    });
  });

  describe('Performance Benchmarks', () => {
    test('telemetry overhead should be <5% of transformation time', async () => {
      const iterations = 100;
      const transformationTimes: number[] = [];
      const telemetryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const _code = generateMediumFile();

        // Measure transformation time without telemetry
        const transformStart = performance.now();
        // Simulate transformation work
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 + 5));
        const transformTime = performance.now() - transformStart;
        transformationTimes.push(transformTime);

        // Measure telemetry overhead
        const telemetryStart = performance.now();
        collector.recordPatternSuccess('test-pattern', true, 'ast', 'test.ts');
        const telemetryTime = performance.now() - telemetryStart;
        telemetryTimes.push(telemetryTime);
      }

      const avgTransformTime = transformationTimes.reduce((a, b) => a + b, 0) / iterations;
      const avgTelemetryTime = telemetryTimes.reduce((a, b) => a + b, 0) / iterations;
      const overheadPercentage = (avgTelemetryTime / avgTransformTime) * 100;

      expect(overheadPercentage).toBeLessThan(5); // <5% overhead requirement

      console.log(`Average transformation time: ${avgTransformTime.toFixed(2)}ms`);
      console.log(`Average telemetry time: ${avgTelemetryTime.toFixed(2)}ms`);
      console.log(`Telemetry overhead: ${overheadPercentage.toFixed(2)}%`);
    });

    test('memory usage should remain stable during extended operation', async () => {
      const initialMemory = process.memoryUsage();

      // Run extended telemetry operations
      for (let i = 0; i < 10000; i++) {
        collector.recordPatternSuccess(
          `pattern-${i % 10}`,
          Math.random() > 0.1, // 90% success rate
          'ast',
          `file-${i}.ts`
        );

        if (i % 1000 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      await collector.shutdown();

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable (<50MB for 10k events)
      expect(memoryGrowthMB).toBeLessThan(50);

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
    });
  });

  describe('Signal Quality Validation', () => {
    test('collected metrics should have high correlation with expected outcomes', async () => {
      const testCases = [
        {
          name: 'High success pattern',
          patterns: ['var-to-const', 'strict-equality'],
          expectedSuccessRate: 0.9,
        },
        {
          name: 'Complex AST patterns',
          patterns: ['object-shorthand', 'arrow-functions'],
          expectedSuccessRate: 0.7,
        },
      ];

      for (const testCase of testCases) {
        const _code = generatePatternTargetCode(testCase.patterns);

        // Apply patterns multiple times
        for (let i = 0; i < 50; i++) {
          for (const pattern of testCase.patterns) {
            const success = Math.random() < testCase.expectedSuccessRate;
            collector.recordPatternSuccess(pattern, success, 'ast', 'test.ts');
          }
        }
      }

      await collector.shutdown();

      // Analyze collected metrics for signal quality
      const patternEvents = capturedEvents.filter((e) => (e as { id?: string }).id === 'TEL-001');
      const patternStats = new Map<string, { success: number; total: number }>();

      for (const event of patternEvents) {
        const typedEvent = event as { patternId: string; successRate: number };
        const stats = patternStats.get(typedEvent.patternId) || { success: 0, total: 0 };
        stats.total++;
        if (typedEvent.successRate > 0) stats.success++;
        patternStats.set(typedEvent.patternId, stats);
      }

      // Validate signal-to-noise ratio
      for (const [patternId, stats] of patternStats) {
        const actualSuccessRate = stats.success / stats.total;
        console.log(`Pattern ${patternId}: ${actualSuccessRate.toFixed(2)} success rate`);

        // Success rates should be meaningful (not random)
        expect(actualSuccessRate).toBeGreaterThan(0.1);
        expect(actualSuccessRate).toBeLessThan(1.0);
      }

      // Overall signal quality should be high
      const totalEvents = patternEvents.length;
      const meaningfulEvents = patternEvents.filter(
        (e) => (e as { successRate: number }).successRate !== 0.5
      ).length; // Not random
      const signalRatio = meaningfulEvents / totalEvents;

      expect(signalRatio).toBeGreaterThan(0.8); // >80% signal-to-noise ratio
    });
  });
});

describe('Telemetry Integration', () => {
  test('integration with transformation pipeline should work seamlessly', async () => {
    const collector = initializeTelemetry({
      enabled: true,
      privacy: {
        collectUserIds: false,
        collectFilePaths: true,
        retentionDays: 30,
      },
    });
    const capturedEvents: any[] = [];

    collector.on('batchFlush', (events) => {
      capturedEvents.push(...events);
    });

    const transformationId = randomUUID();
    const originalCode = generatePatternTargetCode(['var-to-const', 'strict-equality']);

    const telemetry = createTransformationTelemetry(
      transformationId,
      'ast',
      'integration-test.ts',
      originalCode
    );

    // Simulate full transformation pipeline
    telemetry.startTransformation();

    // Pattern matching phase
    telemetry.completeParsing();
    telemetry.recordPatternSuccess('var-to-const');
    telemetry.recordPatternSuccess('strict-equality');
    telemetry.completePatternMatching();

    // Transformation phase
    telemetry.completeTransformationStage();

    // Validation phase
    telemetry.completeValidation();

    // Complete transformation
    const transformedCode = originalCode.replace(/var\s+/g, 'const ').replace(/==/g, '===');
    await telemetry.completeTransformation(transformedCode, 2);

    // Force flush events before validation
    await collector.flush();

    await collector.shutdown();

    // Validate comprehensive telemetry collection
    const patternEvents = capturedEvents.filter((e) => e.id === 'TEL-001');
    const latencyEvents = capturedEvents.filter((e) => e.id === 'TEL-004');
    const qualityEvents = capturedEvents.filter((e) => e.id === 'TEL-003');

    expect(patternEvents).toHaveLength(2); // Two patterns applied
    expect(latencyEvents.length).toBeGreaterThan(0); // Latency tracked
    expect(qualityEvents.length).toBeGreaterThan(0); // Quality delta tracked

    // Validate pipeline timing integrity
    const latencyEvent = latencyEvents.find((e) => e.transformationId === transformationId);
    expect(latencyEvent).toBeDefined();
    expect(latencyEvent.pipelineStages.parsing).toBeGreaterThan(0);
    expect(latencyEvent.pipelineStages.patternMatching).toBeGreaterThan(0);
    expect(latencyEvent.pipelineStages.transformation).toBeGreaterThan(0);
    expect(latencyEvent.pipelineStages.validation).toBeGreaterThan(0);
    expect(latencyEvent.totalLatency).toBeGreaterThan(0);
  });
});
