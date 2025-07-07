/**
 * Core telemetry collection system for Carmack Coder
 * Provides high-performance, low-overhead metrics collection with privacy compliance
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import type { 
  TelemetryMetric, 
  TelemetryConfig, 
  PatternSuccessMetric,
  LatencyMetric,
  MemoryProfileMetric,
  CacheEfficiencyMetric,
  ModeSelectionMetric,
  ErrorRecoveryMetric,
  TransformationMode,
  PipelineStages
} from './types.js';
import { TelemetryConfigSchema, TelemetryMetricSchema } from './types.js';

/**
 * High-performance telemetry event buffer with automatic batching
 */
class TelemetryBuffer {
  private events: TelemetryMetric[] = [];
  private lastFlush = performance.now();
  
  constructor(
    private config: TelemetryConfig,
    private flushCallback: (events: TelemetryMetric[]) => Promise<void>
  ) {}

  /**
   * Add event to buffer with automatic flush management
   * @param event - Telemetry event to buffer
   */
  add(event: TelemetryMetric): void {
    // Validate event schema before adding
    const validated = TelemetryMetricSchema.parse(event);
    this.events.push(validated);

    // Check flush conditions
    const shouldFlush = 
      this.events.length >= this.config.batchSize ||
      this.events.length >= this.config.maxBufferSize ||
      (performance.now() - this.lastFlush) >= this.config.flushInterval;

    if (shouldFlush) {
      this.flush();
    }
  }

  /**
   * Force flush all buffered events
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];
    this.lastFlush = performance.now();

    try {
      await this.flushCallback(eventsToFlush);
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Re-buffer events on failure (with size limit to prevent memory issues)
      if (this.events.length < this.config.maxBufferSize / 2) {
        this.events.unshift(...eventsToFlush);
      }
    }
  }

  /**
   * Get current buffer size for monitoring
   */
  getBufferSize(): number {
    return this.events.length;
  }
}

/**
 * Privacy-compliant user identifier management
 */
class PrivacyManager {
  private userSalt: string = randomUUID();
  private saltRotationInterval: NodeJS.Timeout;

  constructor(private config: TelemetryConfig) {
    // Rotate salt every 24 hours for privacy
    this.saltRotationInterval = setInterval(() => {
      this.userSalt = randomUUID();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Create anonymized user identifier
   * @param userId - Original user identifier
   */
  anonymizeUserId(userId: string): string {
    if (!this.config.privacy.collectUserIds) {
      return 'anonymous';
    }
    
    return createHash('sha256')
      .update(userId + this.userSalt)
      .digest('hex')
      .substring(0, 16); // Short hash for storage efficiency
  }

  /**
   * Sanitize file path for privacy
   * @param filePath - Original file path
   */
  sanitizeFilePath(filePath: string): string {
    if (!this.config.privacy.collectFilePaths) {
      return '[redacted]';
    }

    // Keep relative path structure but remove absolute paths
    return filePath.replace(/^.*[\\\/]/, '').replace(/[\\\/]/g, '/');
  }

  destroy(): void {
    clearInterval(this.saltRotationInterval);
  }
}

/**
 * Performance monitoring for telemetry overhead
 */
class PerformanceMonitor {
  private samples: number[] = [];
  private readonly maxSamples = 1000;

  /**
   * Record telemetry operation timing
   * @param duration - Operation duration in milliseconds
   */
  recordTiming(duration: number): void {
    this.samples.push(duration);
    
    // Keep only recent samples to prevent memory growth
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): { p50: number; p95: number; p99: number; avg: number; overhead: number } {
    if (this.samples.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0, overhead: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)] ?? 0,
      p95: sorted[Math.floor(len * 0.95)] ?? 0,
      p99: sorted[Math.floor(len * 0.99)] ?? 0,
      avg: sorted.reduce((a, b) => a + b, 0) / len,
      overhead: (sorted.reduce((a, b) => a + b, 0) / len) * 100, // % overhead
    };
  }
}

/**
 * Main telemetry collector class
 * Provides low-overhead, high-performance metrics collection
 */
export class TelemetryCollector extends EventEmitter {
  private config: TelemetryConfig;
  private buffer!: TelemetryBuffer;
  private privacyManager!: PrivacyManager;
  private performanceMonitor!: PerformanceMonitor;
  private sessionId!: string;
  private isEnabled: boolean;

  constructor(config?: Partial<TelemetryConfig>) {
    super();
    
    // Validate and apply configuration
    this.config = TelemetryConfigSchema.parse(config || {});
    this.isEnabled = this.config.enabled;
    
    if (!this.isEnabled) {
      // Create no-op implementation if disabled
      return;
    }

    this.sessionId = randomUUID();
    this.privacyManager = new PrivacyManager(this.config);
    this.performanceMonitor = new PerformanceMonitor();
    this.buffer = new TelemetryBuffer(this.config, this.handleFlush.bind(this));

    // Graceful shutdown handling
    process.on('SIGINT', this.shutdown.bind(this));
    process.on('SIGTERM', this.shutdown.bind(this));
  }

  /**
   * Record pattern success/failure metrics (TEL-001)
   * @param patternId - Pattern identifier
   * @param success - Whether pattern application succeeded
   * @param mode - Transformation mode used
   * @param filePath - Target file path
   * @param errorReason - Error details if failed
   */
  recordPatternSuccess(
    patternId: string,
    success: boolean,
    mode: TransformationMode,
    filePath: string,
    errorReason?: string
  ): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    
    try {
      const metric: PatternSuccessMetric = {
        id: 'TEL-001',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        patternId,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        successRate: success ? 1 : 0,
        mode,
        filePath: this.privacyManager.sanitizeFilePath(filePath),
        errorReason,
      };

      this.buffer.add(metric);
      this.emit('patternSuccess', metric);
    } finally {
      // Record telemetry overhead
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Record transformation latency metrics (TEL-004)
   * @param transformationId - Unique transformation identifier
   * @param mode - Transformation mode
   * @param fileSizeBytes - Input file size
   * @param pipelineStages - Detailed timing breakdown
   * @param patternsApplied - Number of patterns applied
   * @param cacheHit - Whether this was a cache hit
   */
  recordLatency(
    transformationId: string,
    mode: TransformationMode,
    fileSizeBytes: number,
    pipelineStages: PipelineStages,
    patternsApplied: number,
    cacheHit: boolean
  ): void {
    if (!this.isEnabled) return;

    // Sample based on configuration to reduce overhead
    if (Math.random() > this.config.performanceSampleRate) {
      return;
    }

    const startTime = performance.now();
    
    try {
      const totalLatency = Object.values(pipelineStages).reduce((a, b) => a + b, 0);
      
      // Determine percentile bucket based on latency
      let percentile: 'p50' | 'p95' | 'p99';
      if (totalLatency < 100) percentile = 'p50';
      else if (totalLatency < 1000) percentile = 'p95';
      else percentile = 'p99';

      const metric: LatencyMetric = {
        id: 'TEL-004',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        transformationId,
        mode,
        fileSizeBytes,
        pipelineStages,
        totalLatency,
        percentile,
        patternsApplied,
        cacheHit,
      };

      this.buffer.add(metric);
      this.emit('latencyRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Record memory usage profile (TEL-005)
   * @param processId - Process identifier
   * @param memoryTimeline - Memory usage over time
   * @param gcTriggered - Whether GC was triggered
   * @param gcTime - Time spent in GC
   */
  recordMemoryProfile(
    processId: string,
    memoryTimeline: Array<{
      timestamp: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    }>,
    gcTriggered: boolean,
    gcTime: number
  ): void {
    if (!this.isEnabled) return;
    if (Math.random() > this.config.performanceSampleRate) return;

    const startTime = performance.now();
    
    try {
      const peakMemory = Math.max(...memoryTimeline.map(t => t.rss));
      const memoryGrowthRate = memoryTimeline.length > 1
        ? (memoryTimeline[memoryTimeline.length - 1]!.rss - memoryTimeline[0]!.rss) / 
          (memoryTimeline[memoryTimeline.length - 1]!.timestamp - memoryTimeline[0]!.timestamp) * 1000
        : 0;

      const metric: MemoryProfileMetric = {
        id: 'TEL-005',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        processId,
        timeline: memoryTimeline,
        peakMemory,
        memoryGrowthRate,
        gcTriggered,
        gcTime,
      };

      this.buffer.add(metric);
      this.emit('memoryProfileRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Record cache efficiency metrics (TEL-006)
   * @param cacheType - Type of cache measured
   * @param hits - Number of cache hits
   * @param misses - Number of cache misses
   * @param evictions - Number of cache evictions
   * @param lookupTimes - Array of lookup times in microseconds
   * @param cacheSize - Current cache size
   * @param memoryUsage - Cache memory usage in bytes
   */
  recordCacheEfficiency(
    cacheType: 'ast-parse' | 'pattern-match' | 'verification' | 'quality-analysis',
    hits: number,
    misses: number,
    evictions: number,
    lookupTimes: number[],
    cacheSize: number,
    memoryUsage: number
  ): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    
    try {
      const total = hits + misses;
      const hitRate = total > 0 ? hits / total : 0;
      const missRate = total > 0 ? misses / total : 0;
      const evictionRate = cacheSize > 0 ? evictions / cacheSize : 0;
      const averageLookupTime = lookupTimes.length > 0 
        ? lookupTimes.reduce((a, b) => a + b, 0) / lookupTimes.length 
        : 0;
      
      // Calculate effectiveness score (weighted combination of hit rate and lookup speed)
      const effectivenessScore = (hitRate * 0.7) + ((1 - (averageLookupTime / 1000)) * 0.3);

      const metric: CacheEfficiencyMetric = {
        id: 'TEL-006',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        cacheType,
        hitRate,
        missRate,
        evictionRate,
        averageLookupTime,
        cacheSize,
        cacheMemoryUsage: memoryUsage,
        effectivenessScore: Math.max(0, Math.min(1, effectivenessScore)),
      };

      this.buffer.add(metric);
      this.emit('cacheEfficiencyRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Start user session tracking (TEL-007)
   */
  startSession(userId?: string): string {
    this.sessionId = randomUUID();
    
    if (userId) {
      const anonymizedId = this.privacyManager.anonymizeUserId(userId);
      this.emit('sessionStarted', { sessionId: this.sessionId, userId: anonymizedId });
    }
    
    return this.sessionId;
  }

  /**
   * Record mode selection and user behavior patterns (TEL-007)
   * @param actions - Sequence of user actions
   * @param sessionDuration - Total session duration
   */
  recordModeSelection(
    actions: Array<{
      mode: TransformationMode;
      fileType: string;
      complexity: number;
      outcome: 'success' | 'failure' | 'cancelled';
      timestamp: number;
      duration: number;
    }>,
    sessionDuration: number
  ): void {
    if (!this.isEnabled) return;
    if (Math.random() > this.config.behaviorSampleRate) return;

    const startTime = performance.now();
    
    try {
      // Analyze patterns in user behavior
      const modeCounts = actions.reduce((acc, action) => {
        acc[action.mode] = (acc[action.mode] || 0) + 1;
        return acc;
      }, {} as Record<TransformationMode, number>);
      
      const dominantMode = Object.entries(modeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as TransformationMode || 'template';
      
      const modeSwitches = actions.reduce((count, action, i) => {
        if (i > 0 && actions[i - 1] && action.mode !== actions[i - 1]!.mode) {
          return count + 1;
        }
        return count;
      }, 0);

      // Detect patterns (this could be enhanced with ML in the future)
      const patterns: string[] = [];
      if (modeSwitches > actions.length * 0.3) patterns.push('frequent-mode-switching');
      if (actions.filter(a => a.outcome === 'failure').length > actions.length * 0.2) patterns.push('high-failure-rate');
      if (sessionDuration > 30 * 60 * 1000) patterns.push('long-session');

      const metric: ModeSelectionMetric = {
        id: 'TEL-007',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        sequence: actions,
        patterns,
        sessionDuration,
        modeSwitches,
        dominantMode,
      };

      this.buffer.add(metric);
      this.emit('modeSelectionRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Record error recovery patterns (TEL-008)
   * @param errorType - Type of error encountered
   * @param errorCode - Specific error code
   * @param errorMessage - Error message
   * @param recoveryActions - User recovery actions
   * @param resolutionTime - Time to resolve error
   * @param finalOutcome - Final outcome
   * @param severity - Error severity
   */
  recordErrorRecovery(
    errorType: string,
    errorCode: string,
    errorMessage: string,
    recoveryActions: Array<{
      action: 'retry' | 'mode-switch' | 'manual-fix' | 'abandon';
      timestamp: number;
      success: boolean;
      newMode?: TransformationMode;
    }>,
    resolutionTime: number,
    finalOutcome: 'resolved' | 'abandoned',
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    
    try {
      const metric: ErrorRecoveryMetric = {
        id: 'TEL-008',
        eventId: randomUUID(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: '1.0.0',
        errorType,
        errorCode,
        errorMessage,
        userActions: recoveryActions,
        resolutionTime,
        finalOutcome,
        severity,
      };

      this.buffer.add(metric);
      this.emit('errorRecoveryRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Record code quality delta metrics (TEL-003)
   * @param qualityDelta - Quality comparison metrics
   */
  recordQualityDelta(qualityDelta: Omit<import('./types.js').CodeQualityDelta, 'sessionId'>): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    
    try {
      const metric: import('./types.js').CodeQualityDelta = {
        ...qualityDelta,
        sessionId: this.sessionId,
      };

      this.buffer.add(metric);
      this.emit('qualityDeltaRecorded', metric);
    } finally {
      this.performanceMonitor.recordTiming(performance.now() - startTime);
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current telemetry system health metrics
   */
  getHealthMetrics(): {
    bufferSize: number;
    performanceStats: ReturnType<PerformanceMonitor['getStats']>;
    sessionId: string;
    eventsCollected: number;
    isEnabled: boolean;
  } {
    return {
      bufferSize: this.buffer?.getBufferSize() || 0,
      performanceStats: this.performanceMonitor?.getStats() || { p50: 0, p95: 0, p99: 0, avg: 0, overhead: 0 },
      sessionId: this.sessionId,
      eventsCollected: this.listenerCount('*'), // Rough approximation
      isEnabled: this.isEnabled,
    };
  }

  /**
   * Handle batch flush of telemetry events
   * @param events - Events to flush
   */
  private async handleFlush(events: TelemetryMetric[]): Promise<void> {
    // In production, this would send to analytics service
    // For development, emit events for local processing
    this.emit('batchFlush', events);
    
    // Example: Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] Flushed ${events.length} events`);
    }
  }

  /**
   * Force flush all buffered events
   */
  async flush(): Promise<void> {
    if (!this.isEnabled) return;
    await this.buffer.flush();
  }

  /**
   * Graceful shutdown with final flush
   */
  async shutdown(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      await this.buffer.flush();
      this.privacyManager.destroy();
      this.emit('shutdown');
    } catch (error) {
      console.error('Error during telemetry shutdown:', error);
    }
  }
}

// Singleton instance for global access
let globalCollector: TelemetryCollector | null = null;

/**
 * Get or create global telemetry collector instance
 * @param config - Optional configuration override
 */
export function getTelemetryCollector(config?: Partial<TelemetryConfig>): TelemetryCollector {
  if (!globalCollector) {
    globalCollector = new TelemetryCollector(config);
  }
  return globalCollector;
}

/**
 * Initialize telemetry system with configuration
 * @param config - Telemetry configuration
 */
export function initializeTelemetry(config: Partial<TelemetryConfig>): TelemetryCollector {
  if (globalCollector) {
    globalCollector.shutdown();
  }
  globalCollector = new TelemetryCollector(config);
  return globalCollector;
}
