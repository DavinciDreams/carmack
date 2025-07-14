/**
 * Telemetry integration for Carmack Coder transformation system
 * Provides comprehensive observability without impacting transformation performance
 */

import { performance } from 'perf_hooks';
import { createHash } from 'crypto';
import { getTelemetryCollector } from './collector.js';
import type {
  TransformationMode,
  PipelineStages,
  QualityMetrics,
  // CodeQualityDelta,
} from './types.js';

/**
 * Performance timer for measuring pipeline stages
 */
export class PerformanceTimer {
  private startTimes: Map<string, number> = new Map();
  private stages: Partial<PipelineStages> = {};

  /**
   * Start timing a pipeline stage
   * @param stage - Stage name to time
   */
  start(stage: keyof PipelineStages): void {
    this.startTimes.set(stage, performance.now());
  }

  /**
   * End timing a pipeline stage
   * @param stage - Stage name to complete
   */
  end(stage: keyof PipelineStages): void {
    const startTime = this.startTimes.get(stage);
    if (startTime !== undefined) {
      this.stages[stage] = performance.now() - startTime;
      this.startTimes.delete(stage);
    }
  }

  /**
   * Get completed pipeline timing measurements
   */
  getStages(): PipelineStages {
    return {
      parsing: this.stages.parsing ?? 0,
      patternMatching: this.stages.patternMatching ?? 0,
      transformation: this.stages.transformation ?? 0,
      validation: this.stages.validation ?? 0,
      serialization: this.stages.serialization ?? 0,
    };
  }

  /**
   * Get total elapsed time across all stages
   */
  getTotalTime(): number {
    return Object.values(this.stages).reduce((total, time) => total + (time ?? 0), 0);
  }
}

/**
 * Memory usage tracker for transformation operations
 */
export class MemoryTracker {
  private timeline: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> = [];

  private samplingInterval: NodeJS.Timeout | null = null;
  private isTracking = false;

  /**
   * Start memory tracking with periodic sampling
   * @param intervalMs - Sampling interval in milliseconds
   */
  start(intervalMs: number = 100): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.timeline = [];

    /** Record initial memory state */
    this.recordSample();

    /** Set up periodic sampling */
    this.samplingInterval = setInterval(() => {
      this.recordSample();
    }, intervalMs);
  }

  /**
   * Stop memory tracking and return timeline
   */
  stop(): typeof this.timeline {
    if (!this.isTracking) return [];

    this.isTracking = false;

    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }

    /** Record final memory state */
    this.recordSample();

    return [...this.timeline];
  }

  /**
   * Record current memory usage sample
   */
  private recordSample(): void {
    const memUsage = process.memoryUsage();
    this.timeline.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    });
  }

  /**
   * Check if GC was likely triggered based on memory patterns
   */
  detectGC(): { triggered: boolean; estimatedGCTime: number } {
    if (this.timeline.length < 3) {
      return { triggered: false, estimatedGCTime: 0 };
    }

    /** Look for significant heap drops that indicate GC */
    let gcTriggered = false;
    let estimatedGCTime = 0;

    for (let i = 1; i < this.timeline.length; i++) {
      const prev = this.timeline[i - 1]!;
      const curr = this.timeline[i]!;

      /** Detect significant heap reduction (likely GC) */
      const heapReduction = prev.heapUsed - curr.heapUsed;
      const reductionPercentage = heapReduction / prev.heapUsed;

      if (reductionPercentage > 0.1) {
        // >10% heap reduction
        gcTriggered = true;
        /** Estimate GC time based on timeline gap */
        estimatedGCTime += curr.timestamp - prev.timestamp;
      }
    }

    return { triggered: gcTriggered, estimatedGCTime };
  }
}

/**
 * Cache performance monitor for AST and pattern caches
 */
export class CacheMonitor {
  private stats: Map<
    string,
    {
      hits: number;
      misses: number;
      evictions: number;
      lookupTimes: number[];
      size: number;
      memoryUsage: number;
    }
  > = new Map();

  /**
   * Record cache hit
   * @param cacheKey - Cache identifier
   * @param lookupTime - Lookup time in microseconds
   */
  recordHit(cacheKey: string, lookupTime: number): void {
    this.getOrCreateStats(cacheKey).hits++;
    this.getOrCreateStats(cacheKey).lookupTimes.push(lookupTime);
  }

  /**
   * Record cache miss
   * @param cacheKey - Cache identifier
   * @param lookupTime - Lookup time in microseconds
   */
  recordMiss(cacheKey: string, lookupTime: number): void {
    this.getOrCreateStats(cacheKey).misses++;
    this.getOrCreateStats(cacheKey).lookupTimes.push(lookupTime);
  }

  /**
   * Record cache eviction
   * @param cacheKey - Cache identifier
   */
  recordEviction(cacheKey: string): void {
    this.getOrCreateStats(cacheKey).evictions++;
  }

  /**
   * Update cache size and memory usage
   * @param cacheKey - Cache identifier
   * @param size - Number of entries
   * @param memoryUsage - Memory usage in bytes
   */
  updateSize(cacheKey: string, size: number, memoryUsage: number): void {
    const stats = this.getOrCreateStats(cacheKey);
    stats.size = size;
    stats.memoryUsage = memoryUsage;
  }

  /**
   * Get cache statistics for telemetry reporting
   * @param cacheKey - Cache identifier
   */
  getStats(cacheKey: string) {
    const stats = this.stats.get(cacheKey);
    if (!stats) return null;

    return {
      hits: stats.hits,
      misses: stats.misses,
      evictions: stats.evictions,
      lookupTimes: [...stats.lookupTimes],
      size: stats.size,
      memoryUsage: stats.memoryUsage,
    };
  }

  /**
   * Reset statistics for a cache
   * @param cacheKey - Cache identifier
   */
  reset(cacheKey: string): void {
    this.stats.delete(cacheKey);
  }

  private getOrCreateStats(cacheKey: string) {
    if (!this.stats.has(cacheKey)) {
      this.stats.set(cacheKey, {
        hits: 0,
        misses: 0,
        evictions: 0,
        lookupTimes: [],
        size: 0,
        memoryUsage: 0,
      });
    }
    return this.stats.get(cacheKey)!;
  }
}

/**
 * Code quality analyzer for before/after comparison
 */
export class QualityAnalyzer {
  /**
   * Calculate quality metrics for given code
   * @param code - Source code to analyze
   */
  async analyzeCode(code: string): Promise<QualityMetrics> {
    /** Basic metrics that can be calculated statically */
    const lines = code.split('\n');
    const linesOfCode = lines.filter(
      (line) => line.trim().length > 0 && !line.trim().startsWith('//')
    ).length;

    /** Count functions (simplified regex approach) */
    const functionMatches = code.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
    const functionCount = functionMatches.length;

    /** Calculate nesting depth */
    const nestingDepth = this.calculateNestingDepth(code);

    /** Estimate cyclomatic complexity (simplified) */
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code);

    /** Estimate cognitive complexity */
    const cognitiveComplexity = this.calculateCognitiveComplexity(code);

    /** Calculate maintainability index (simplified version) */
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      cyclomaticComplexity,
      linesOfCode,
      code
    );

    /** Calculate duplication ratio (simplified) */
    const duplicationRatio = this.calculateDuplicationRatio(lines);

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex,
      duplicationRatio,
      linesOfCode,
      functionCount,
      nestingDepth,
    };
  }

  /**
   * Calculate maximum nesting depth in code
   */
  private calculateNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateCyclomaticComplexity(code: string): number {
    /** Base complexity is 1 */
    let complexity = 1;

    /** Add complexity for control flow statements */
    const controlFlowPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*.*?\s*:/g, // ternary operator
    ];

    for (const pattern of controlFlowPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculate cognitive complexity (simplified)
   */
  private calculateCognitiveComplexity(code: string): number {
    let complexity = 0;
    let nestingLevel = 0;

    /** Split into tokens for analysis */
    const tokens = code.split(/\s+/);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      /** Increment for control structures */
      if (['if', 'while', 'for', 'switch'].includes(token || '')) {
        complexity += 1 + nestingLevel;
      }

      /** Track nesting level */
      if (token?.includes('{')) {
        nestingLevel++;
      } else if (token?.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
    }

    return complexity;
  }

  /**
   * Calculate maintainability index (simplified)
   */
  private calculateMaintainabilityIndex(
    cyclomaticComplexity: number,
    linesOfCode: number,
    code: string
  ): number {
    /** Simplified version of Maintainability Index calculation */
    const halsteadVolume = Math.log2(code.length); // Simplified Halstead volume
    const commentRatio = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length / linesOfCode;

    const maintainabilityIndex = Math.max(
      0,
      171 -
        5.2 * Math.log(halsteadVolume) -
        0.23 * cyclomaticComplexity -
        16.2 * Math.log(linesOfCode) +
        50 * Math.sin(Math.sqrt(2.4 * commentRatio))
    );

    return Math.min(100, maintainabilityIndex);
  }

  /**
   * Calculate code duplication ratio (simplified)
   */
  private calculateDuplicationRatio(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicateLines = 0;

    /** Count non-empty, non-comment lines */
    const meaningfulLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 3 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    });

    /** Count duplicates */
    for (const line of meaningfulLines) {
      const normalized = line.trim();
      const count = lineMap.get(normalized) || 0;
      lineMap.set(normalized, count + 1);

      if (count > 0) {
        duplicateLines++;
      }
    }

    return meaningfulLines.length > 0 ? duplicateLines / meaningfulLines.length : 0;
  }
}

/**
 * Main telemetry integration class for transformation operations
 */
export class TransformationTelemetry {
  private collector = getTelemetryCollector();
  private timer = new PerformanceTimer();
  private memoryTracker = new MemoryTracker();
  private cacheMonitor = new CacheMonitor();
  private qualityAnalyzer = new QualityAnalyzer();

  private transformationId: string;
  private mode: TransformationMode;
  private filePath: string;
  private originalCode: string;
  private fileSizeBytes: number;

  constructor(
    transformationId: string,
    mode: TransformationMode,
    filePath: string,
    originalCode: string
  ) {
    this.transformationId = transformationId;
    this.mode = mode;
    this.filePath = filePath;
    this.originalCode = originalCode;
    this.fileSizeBytes = Buffer.byteLength(originalCode, 'utf8');
  }

  /**
   * Start telemetry collection for transformation
   */
  startTransformation(): void {
    /** Start performance timing */
    this.timer.start('parsing');

    /** Start memory tracking */
    this.memoryTracker.start();
  }

  /**
   * Record successful pattern application
   * @param patternId - Pattern that was applied
   */
  recordPatternSuccess(patternId: string): void {
    this.collector.recordPatternSuccess(patternId, true, this.mode, this.filePath);
  }

  /**
   * Record failed pattern application
   * @param patternId - Pattern that failed
   * @param errorReason - Reason for failure
   */
  recordPatternFailure(patternId: string, errorReason: string): void {
    this.collector.recordPatternSuccess(patternId, false, this.mode, this.filePath, errorReason);
  }

  /**
   * Mark completion of parsing stage
   */
  completeParsing(): void {
    this.timer.end('parsing');
    this.timer.start('patternMatching');
  }

  /**
   * Mark completion of pattern matching stage
   */
  completePatternMatching(): void {
    this.timer.end('patternMatching');
    this.timer.start('transformation');
  }

  /**
   * Mark completion of transformation stage
   */
  completeTransformationStage(): void {
    this.timer.end('transformation');
    this.timer.start('validation');
  }

  /**
   * Mark completion of validation stage
   */
  completeValidation(): void {
    this.timer.end('validation');
    this.timer.start('serialization');
  }

  /**
   * Complete telemetry collection and report metrics
   * @param transformedCode - Final transformed code
   * @param patternsApplied - Number of patterns applied
   * @param cacheHit - Whether transformation used cached results
   */
  async completeTransformation(
    transformedCode: string,
    patternsApplied: number,
    cacheHit: boolean = false
  ): Promise<void> {
    /** Complete final timing */
    this.timer.end('serialization');

    /** Stop memory tracking */
    const memoryTimeline = this.memoryTracker.stop();
    const gcInfo = this.memoryTracker.detectGC();

    /** Record latency metrics */
    this.collector.recordLatency(
      this.transformationId,
      this.mode,
      this.fileSizeBytes,
      this.timer.getStages(),
      patternsApplied,
      cacheHit
    );

    /** Record memory profile */
    if (memoryTimeline.length > 0) {
      this.collector.recordMemoryProfile(
        process.pid.toString(),
        memoryTimeline,
        gcInfo.triggered,
        gcInfo.estimatedGCTime
      );
    }

    /** Analyze code quality changes */
    try {
      const originalQuality = await this.qualityAnalyzer.analyzeCode(this.originalCode);
      const transformedQuality = await this.qualityAnalyzer.analyzeCode(transformedCode);

      /** Calculate quality improvements */
      const improvement = {
        cyclomaticComplexity:
          originalQuality.cyclomaticComplexity - transformedQuality.cyclomaticComplexity,
        cognitiveComplexity:
          originalQuality.cognitiveComplexity - transformedQuality.cognitiveComplexity,
        maintainabilityIndex:
          transformedQuality.maintainabilityIndex - originalQuality.maintainabilityIndex,
        duplicationRatio: originalQuality.duplicationRatio - transformedQuality.duplicationRatio,
      };

      /** Calculate overall quality delta */
      const overallQualityDelta =
        (improvement.cyclomaticComplexity > 0 ? 0.3 : -0.3) +
        (improvement.cognitiveComplexity > 0 ? 0.2 : -0.2) +
        (improvement.maintainabilityIndex > 0 ? 0.3 : -0.3) +
        (improvement.duplicationRatio > 0 ? 0.2 : -0.2);

      /** Record quality metrics (TEL-003) */
      this.collector.recordQualityDelta({
        id: 'TEL-003',
        eventId: this.transformationId,
        timestamp: Date.now(),
        version: '1.0.0',
        fileId: createHash('sha256').update(this.filePath).digest('hex'),
        before: originalQuality,
        after: transformedQuality,
        improvement,
        overallQualityDelta: Math.max(-1, Math.min(1, overallQualityDelta)),
      });
    } catch (error) {
      console.warn('Failed to analyze code quality:', error);
    }
  }

  /**
   * Record cache performance metrics
   * @param cacheType - Type of cache measured
   */
  recordCacheMetrics(
    cacheType: 'ast-parse' | 'pattern-match' | 'verification' | 'quality-analysis'
  ): void {
    const stats = this.cacheMonitor.getStats(cacheType);
    if (stats) {
      this.collector.recordCacheEfficiency(
        cacheType,
        stats.hits,
        stats.misses,
        stats.evictions,
        stats.lookupTimes,
        stats.size,
        stats.memoryUsage
      );
    }
  }

  /**
   * Get cache monitor for external cache operations
   */
  getCacheMonitor(): CacheMonitor {
    return this.cacheMonitor;
  }
}

/**
 * Create telemetry instance for transformation
 * @param transformationId - Unique transformation ID
 * @param mode - Transformation mode
 * @param filePath - File being transformed
 * @param code - Original source code
 */
export function createTransformationTelemetry(
  transformationId: string,
  mode: TransformationMode,
  filePath: string,
  code: string
): TransformationTelemetry {
  return new TransformationTelemetry(transformationId, mode, filePath, code);
}
