/**
 * Telemetry integration for Carmack Coder transformation system
 * Provides comprehensive observability without impacting transformation performance
 */

import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { getTelemetryCollector } from './collector.js';
import type {
  PipelineStages,
  QualityMetrics,
  TransformationMode,
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
  start(intervalMs = 100): void {
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
