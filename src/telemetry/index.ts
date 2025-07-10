/**
 * Telemetry system exports for Carmack Coder
 * Comprehensive observability and metrics collection
 */

// Core telemetry system
export { TelemetryCollector, getTelemetryCollector, initializeTelemetry } from './collector.js';

// Integration helpers
export {
  createTransformationTelemetry,
  PerformanceTimer,
  MemoryTracker,
  CacheMonitor,
  QualityAnalyzer,
  TransformationTelemetry,
} from './integration.js';

// Type definitions
export type {
  TelemetryMetric,
  TelemetryConfig,
  PatternSuccessMetric,
  SemanticCorrectnessMetric,
  CodeQualityDelta,
  LatencyMetric,
  MemoryProfileMetric,
  CacheEfficiencyMetric,
  ModeSelectionMetric,
  ErrorRecoveryMetric,
  ProductivityMetric,
  PatternAdoptionMetric,
  TransformationMode,
  PipelineStages,
  QualityMetrics,
  TelemetryEventBase,
} from './types.js';

/**
 * Default telemetry configuration for production use
 */
export const DEFAULT_TELEMETRY_CONFIG = {
  enabled: true,
  performanceSampleRate: 0.1, // 10% sampling for performance
  behaviorSampleRate: 1.0, // 100% sampling for behavior
  batchSize: 100,
  flushInterval: 5000, // 5 seconds
  maxBufferSize: 1000,
  privacy: {
    collectUserIds: false, // Privacy-first default
    collectFilePaths: true, // Needed for debugging
    retentionDays: 90, // 3 months retention
  },
};

/**
 * Development telemetry configuration with enhanced logging
 */
export const DEVELOPMENT_TELEMETRY_CONFIG = {
  enabled: true,
  performanceSampleRate: 1.0, // 100% sampling for development
  behaviorSampleRate: 1.0,
  batchSize: 10, // Smaller batches for immediate feedback
  flushInterval: 1000, // 1 second flush
  maxBufferSize: 100,
  privacy: {
    collectUserIds: true, // For development debugging
    collectFilePaths: true,
    retentionDays: 7, // Short retention for development
  },
};

/**
 * Disable telemetry configuration
 */
export const DISABLED_TELEMETRY_CONFIG = {
  enabled: false,
  performanceSampleRate: 0,
  behaviorSampleRate: 0,
  batchSize: 1,
  flushInterval: 60000,
  maxBufferSize: 1,
  privacy: {
    collectUserIds: false,
    collectFilePaths: false,
    retentionDays: 1,
  },
};
