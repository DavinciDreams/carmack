import type { EffectivenessMetrics, PatternFeatureVector, SimilarityResult } from './types.js';
import { StatisticalAnalyzer } from './statistics.js';
import { z } from 'zod';

/**
 * Pattern Effectiveness Scoring System
 *
 * This module implements comprehensive effectiveness scoring for patterns
 * using real metrics, statistical analysis, and machine learning techniques.
 */

// Effectiveness scoring configuration
export interface EffectivenessScoringConfig {
  weights: {
    successRate: number;
    performance: number;
    userSatisfaction: number;
    complexity: number;
    reusability: number;
    maintainability: number;
  };
  thresholds: {
    minUsageCount: number;
    confidenceInterval: number;
    outlierDetection: boolean;
  };
  timeDecay: {
    enabled: boolean;
    halfLife: number; // in days
  };
}

// Default configuration optimized for code transformation patterns
export const defaultScoringConfig: EffectivenessScoringConfig = {
  weights: {
    successRate: 0.25, // How often the pattern works correctly
    performance: 0.2, // Speed and efficiency of transformations
    userSatisfaction: 0.15, // User feedback and ratings
    complexity: 0.15, // Pattern complexity and maintainability
    reusability: 0.15, // How often the pattern is reused
    maintainability: 0.1, // How easy it is to update the pattern
  },
  thresholds: {
    minUsageCount: 5, // Minimum uses before scoring is reliable
    confidenceInterval: 0.95, // Statistical confidence level
    outlierDetection: true, // Remove outlier measurements
  },
  timeDecay: {
    enabled: true,
    halfLife: 30, // Older data has less weight (30 days)
  },
};

// Pattern usage record for tracking effectiveness
export const PatternUsageRecordSchema = z.object({
  patternId: z.string(),
  timestamp: z.number(),
  success: z.boolean(),
  performanceMs: z.number().min(0),
  userRating: z.number().min(0).max(10).optional(),
  complexityBefore: z.number().min(0).optional(),
  complexityAfter: z.number().min(0).optional(),
  linesChanged: z.number().min(0).optional(),
  errorCount: z.number().min(0).default(0),
  context: z
    .object({
      fileType: z.string().optional(),
      projectSize: z.enum(['small', 'medium', 'large']).optional(),
      teamSize: z.number().min(1).optional(),
      environment: z.enum(['development', 'staging', 'production']).optional(),
    })
    .optional(),
});

export type PatternUsageRecord = z.infer<typeof PatternUsageRecordSchema>;

// Comprehensive effectiveness score
export const EffectivenessScoreSchema = z.object({
  patternId: z.string(),
  overallScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  breakdown: z.object({
    successRate: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      rawValue: z.number().min(0).max(1),
      sampleSize: z.number().min(0),
    }),
    performance: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      rawValue: z.number().min(0), // milliseconds
      percentile: z.number().min(0).max(100),
    }),
    userSatisfaction: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      rawValue: z.number().min(0).max(10),
      sampleSize: z.number().min(0),
    }),
    complexity: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      reduction: z.number(), // can be negative if complexity increased
      consistency: z.number().min(0).max(1),
    }),
    reusability: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      usageFrequency: z.number().min(0),
      diversityScore: z.number().min(0).max(1),
    }),
    maintainability: z.object({
      score: z.number().min(0).max(1),
      weight: z.number().min(0).max(1),
      updateFrequency: z.number().min(0),
      stabilityScore: z.number().min(0).max(1),
    }),
  }),
  metadata: z.object({
    lastUpdated: z.number(),
    totalUsages: z.number().min(0),
    dataQuality: z.enum(['low', 'medium', 'high']),
    recommendedActions: z.array(z.string()),
    trends: z.object({
      improving: z.boolean(),
      stable: z.boolean(),
      declining: z.boolean(),
    }),
  }),
});

export type EffectivenessScore = z.infer<typeof EffectivenessScoreSchema>;

/**
 * Advanced pattern effectiveness scorer using statistical analysis
 */
export class PatternEffectivenessScorer {
  private config: EffectivenessScoringConfig;
  private usageHistory: Map<string, PatternUsageRecord[]> = new Map();

  constructor(config: Partial<EffectivenessScoringConfig> = {}) {
    this.config = { ...defaultScoringConfig, ...config };
  }

  /**
   * Record a pattern usage for effectiveness tracking
   */
  recordUsage(usage: PatternUsageRecord): void {
    const validated = PatternUsageRecordSchema.parse(usage);

    if (!this.usageHistory.has(validated.patternId)) {
      this.usageHistory.set(validated.patternId, []);
    }

    const history = this.usageHistory.get(validated.patternId)!;
    history.push(validated);

    // Keep only recent data to prevent memory bloat
    const maxHistorySize = 1000;
    if (history.length > maxHistorySize) {
      history.splice(0, history.length - maxHistorySize);
    }
  }

  /**
   * Calculate comprehensive effectiveness score for a pattern
   */
  calculateEffectiveness(patternId: string): EffectivenessScore {
    const history = this.usageHistory.get(patternId) || [];

    if (history.length === 0) {
      return this.createEmptyScore(patternId);
    }

    // Apply time decay if enabled
    const weightedHistory = this.config.timeDecay.enabled
      ? this.applyTimeDecay(history)
      : history.map((record) => ({ record, weight: 1 }));

    // Calculate individual metrics
    const successRate = this.calculateSuccessRate(weightedHistory);
    const performance = this.calculatePerformanceScore(weightedHistory);
    const userSatisfaction = this.calculateUserSatisfactionScore(weightedHistory);
    const complexity = this.calculateComplexityScore(weightedHistory);
    const reusability = this.calculateReusabilityScore(weightedHistory);
    const maintainability = this.calculateMaintainabilityScore(weightedHistory);

    // Calculate overall weighted score
    const overallScore =
      successRate.score * this.config.weights.successRate +
      performance.score * this.config.weights.performance +
      userSatisfaction.score * this.config.weights.userSatisfaction +
      complexity.score * this.config.weights.complexity +
      reusability.score * this.config.weights.reusability +
      maintainability.score * this.config.weights.maintainability;

    // Calculate confidence based on sample size and data quality
    const confidence = this.calculateConfidence(history);

    // Analyze trends
    const trends = this.analyzeTrends(history);

    // Generate recommendations
    const recommendedActions = this.generateRecommendations({
      successRate,
      performance,
      userSatisfaction,
      complexity,
      reusability,
      maintainability,
      trends,
    });

    return {
      patternId,
      overallScore: Math.max(0, Math.min(1, overallScore)),
      confidence,
      breakdown: {
        successRate: {
          ...successRate,
          weight: this.config.weights.successRate,
        },
        performance: {
          ...performance,
          weight: this.config.weights.performance,
        },
        userSatisfaction: {
          ...userSatisfaction,
          weight: this.config.weights.userSatisfaction,
        },
        complexity: {
          ...complexity,
          weight: this.config.weights.complexity,
        },
        reusability: {
          ...reusability,
          weight: this.config.weights.reusability,
        },
        maintainability: {
          ...maintainability,
          weight: this.config.weights.maintainability,
        },
      },
      metadata: {
        lastUpdated: Date.now(),
        totalUsages: history.length,
        dataQuality: this.assessDataQuality(history),
        recommendedActions,
        trends,
      },
    };
  }

  /**
   * Apply time decay to usage records
   */
  private applyTimeDecay(
    history: PatternUsageRecord[]
  ): Array<{ record: PatternUsageRecord; weight: number }> {
    const now = Date.now();
    const halfLifeMs = this.config.timeDecay.halfLife * 24 * 60 * 60 * 1000;

    return history.map((record) => {
      const age = now - record.timestamp;
      const weight = Math.pow(0.5, age / halfLifeMs);
      return { record, weight };
    });
  }

  /**
   * Calculate success rate score
   */
  private calculateSuccessRate(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    const totalWeight = weightedHistory.reduce((sum, { weight }) => sum + weight, 0);
    const successWeight = weightedHistory
      .filter(({ record }) => record.success)
      .reduce((sum, { weight }) => sum + weight, 0);

    const rawValue = totalWeight > 0 ? successWeight / totalWeight : 0;

    return {
      score: rawValue,
      rawValue,
      sampleSize: weightedHistory.length,
    };
  }

  /**
   * Calculate performance score based on execution time
   */
  private calculatePerformanceScore(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    const performanceTimes = weightedHistory.map(({ record }) => record.performanceMs);

    if (performanceTimes.length === 0) {
      return { score: 0.5, rawValue: 0, percentile: 50 };
    }

    // Remove outliers if enabled
    const cleanedTimes = this.config.thresholds.outlierDetection
      ? this.removeOutliers(performanceTimes)
      : performanceTimes;

    const stats = StatisticalAnalyzer.calculateSummary(cleanedTimes);
    const medianTime = stats.median;

    // Score based on performance relative to typical ranges
    // Faster is better, with diminishing returns
    const score = Math.max(0, Math.min(1, 1 - Math.log10(medianTime + 1) / 4));

    // Calculate percentile ranking
    const sortedTimes = [...cleanedTimes].sort((a, b) => a - b);
    const percentile = this.calculatePercentile(medianTime, sortedTimes);

    return {
      score,
      rawValue: medianTime,
      percentile,
    };
  }

  /**
   * Calculate user satisfaction score
   */
  private calculateUserSatisfactionScore(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    const ratings = weightedHistory
      .map(({ record }) => record.userRating)
      .filter((rating): rating is number => rating !== undefined);

    if (ratings.length === 0) {
      return { score: 0.5, rawValue: 5, sampleSize: 0 };
    }

    const stats = StatisticalAnalyzer.calculateSummary(ratings);
    const avgRating = stats.mean;

    // Convert 0-10 rating to 0-1 score
    const score = avgRating / 10;

    return {
      score,
      rawValue: avgRating,
      sampleSize: ratings.length,
    };
  }

  /**
   * Calculate complexity score based on complexity reduction
   */
  private calculateComplexityScore(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    const complexityChanges = weightedHistory
      .map(({ record }) => {
        if (record.complexityBefore !== undefined && record.complexityAfter !== undefined) {
          return record.complexityBefore - record.complexityAfter;
        }
        return null;
      })
      .filter((change): change is number => change !== null);

    if (complexityChanges.length === 0) {
      return { score: 0.5, reduction: 0, consistency: 0.5 };
    }

    const stats = StatisticalAnalyzer.calculateSummary(complexityChanges);
    const avgReduction = stats.mean;
    const consistency = 1 - stats.standardDeviation / (Math.abs(avgReduction) + 1);

    // Score based on average complexity reduction
    // Positive reduction is good, negative is bad
    const score = Math.max(0, Math.min(1, 0.5 + avgReduction / 20));

    return {
      score,
      reduction: avgReduction,
      consistency: Math.max(0, Math.min(1, consistency)),
    };
  }

  /**
   * Calculate reusability score
   */
  private calculateReusabilityScore(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    const usageFrequency = weightedHistory.length;

    // Calculate diversity of usage contexts
    const contexts = weightedHistory
      .map(({ record }) => record.context)
      .filter((context): context is NonNullable<typeof context> => context !== undefined);

    const uniqueFileTypes = new Set(contexts.map((c) => c.fileType).filter(Boolean)).size;
    const uniqueProjectSizes = new Set(contexts.map((c) => c.projectSize).filter(Boolean)).size;
    const uniqueEnvironments = new Set(contexts.map((c) => c.environment).filter(Boolean)).size;

    const diversityScore =
      contexts.length > 0
        ? (uniqueFileTypes + uniqueProjectSizes + uniqueEnvironments) / (contexts.length * 3)
        : 0;

    // Score based on frequency and diversity
    const frequencyScore = Math.min(1, usageFrequency / 50); // Normalize to 50 uses
    const score = frequencyScore * 0.7 + diversityScore * 0.3;

    return {
      score,
      usageFrequency,
      diversityScore,
    };
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainabilityScore(
    weightedHistory: Array<{ record: PatternUsageRecord; weight: number }>
  ) {
    if (weightedHistory.length < 2) {
      return { score: 0.5, updateFrequency: 0, stabilityScore: 0.5 };
    }

    // Calculate how often the pattern behavior changes
    const lastRecord = weightedHistory[weightedHistory.length - 1];
    const firstRecord = weightedHistory[0];
    if (!lastRecord || !firstRecord) {
      return { score: 0.5, updateFrequency: 0, stabilityScore: 0.5 };
    }

    const timeSpan = lastRecord.record.timestamp - firstRecord.record.timestamp;
    const daySpan = timeSpan / (24 * 60 * 60 * 1000);

    // Count significant changes in success rate over time
    const windowSize = Math.max(5, Math.floor(weightedHistory.length / 10));
    let changeCount = 0;

    for (let i = windowSize; i < weightedHistory.length; i++) {
      const recentWindow = weightedHistory.slice(i - windowSize, i);
      const olderWindow = weightedHistory.slice(Math.max(0, i - windowSize * 2), i - windowSize);

      const recentSuccessRate =
        recentWindow.filter(({ record }) => record.success).length / recentWindow.length;
      const olderSuccessRate =
        olderWindow.filter(({ record }) => record.success).length / olderWindow.length;

      if (Math.abs(recentSuccessRate - olderSuccessRate) > 0.2) {
        changeCount++;
      }
    }

    const updateFrequency = daySpan > 0 ? changeCount / daySpan : 0;
    const stabilityScore = Math.max(0, Math.min(1, 1 - updateFrequency));

    // Lower update frequency indicates better maintainability
    const score = stabilityScore;

    return {
      score,
      updateFrequency,
      stabilityScore,
    };
  }

  /**
   * Calculate confidence in the effectiveness score
   */
  private calculateConfidence(history: PatternUsageRecord[]): number {
    const sampleSize = history.length;

    // Base confidence on sample size
    let confidence = Math.min(1, sampleSize / this.config.thresholds.minUsageCount);

    // Adjust for data recency
    const now = Date.now();
    const recentData = history.filter(
      (record) => now - record.timestamp < 30 * 24 * 60 * 60 * 1000 // 30 days
    );
    const recencyFactor = recentData.length / sampleSize;
    confidence *= 0.5 + recencyFactor * 0.5;

    // Adjust for data completeness
    const completeRecords = history.filter(
      (record) =>
        record.userRating !== undefined &&
        record.complexityBefore !== undefined &&
        record.complexityAfter !== undefined
    );
    const completenessFactor = completeRecords.length / sampleSize;
    confidence *= 0.7 + completenessFactor * 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Analyze trends in pattern effectiveness
   */
  private analyzeTrends(history: PatternUsageRecord[]): {
    improving: boolean;
    stable: boolean;
    declining: boolean;
  } {
    if (history.length < 10) {
      return { improving: false, stable: true, declining: false };
    }

    // Split history into recent and older periods
    const splitPoint = Math.floor(history.length * 0.7);
    const olderPeriod = history.slice(0, splitPoint);
    const recentPeriod = history.slice(splitPoint);

    const olderSuccessRate = olderPeriod.filter((r) => r.success).length / olderPeriod.length;
    const recentSuccessRate = recentPeriod.filter((r) => r.success).length / recentPeriod.length;

    const change = recentSuccessRate - olderSuccessRate;
    const threshold = 0.1;

    return {
      improving: change > threshold,
      stable: Math.abs(change) <= threshold,
      declining: change < -threshold,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate.score < 0.7) {
      recommendations.push('Consider reviewing pattern logic - success rate is below optimal');
    }

    if (metrics.performance.score < 0.5) {
      recommendations.push('Optimize pattern performance - execution time is above average');
    }

    if (metrics.userSatisfaction.score < 0.6) {
      recommendations.push('Gather user feedback to improve pattern usability');
    }

    if (metrics.complexity.reduction < 0) {
      recommendations.push('Pattern increases complexity - consider simplification');
    }

    if (metrics.reusability.score < 0.3) {
      recommendations.push('Pattern has low reusability - consider broader applicability');
    }

    if (metrics.trends.declining) {
      recommendations.push('Pattern effectiveness is declining - investigate recent changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Pattern is performing well - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(history: PatternUsageRecord[]): 'low' | 'medium' | 'high' {
    if (history.length < this.config.thresholds.minUsageCount) {
      return 'low';
    }

    const completeRecords = history.filter(
      (record) =>
        record.userRating !== undefined &&
        record.complexityBefore !== undefined &&
        record.complexityAfter !== undefined &&
        record.context !== undefined
    );

    const completenessRatio = completeRecords.length / history.length;

    if (completenessRatio > 0.8) {
      return 'high';
    } else if (completenessRatio > 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Create empty score for patterns with no usage data
   */
  private createEmptyScore(patternId: string): EffectivenessScore {
    return {
      patternId,
      overallScore: 0.5,
      confidence: 0,
      breakdown: {
        successRate: {
          score: 0.5,
          weight: this.config.weights.successRate,
          rawValue: 0,
          sampleSize: 0,
        },
        performance: {
          score: 0.5,
          weight: this.config.weights.performance,
          rawValue: 0,
          percentile: 50,
        },
        userSatisfaction: {
          score: 0.5,
          weight: this.config.weights.userSatisfaction,
          rawValue: 5,
          sampleSize: 0,
        },
        complexity: {
          score: 0.5,
          weight: this.config.weights.complexity,
          reduction: 0,
          consistency: 0.5,
        },
        reusability: {
          score: 0,
          weight: this.config.weights.reusability,
          usageFrequency: 0,
          diversityScore: 0,
        },
        maintainability: {
          score: 0.5,
          weight: this.config.weights.maintainability,
          updateFrequency: 0,
          stabilityScore: 0.5,
        },
      },
      metadata: {
        lastUpdated: Date.now(),
        totalUsages: 0,
        dataQuality: 'low',
        recommendedActions: ['Collect usage data to enable effectiveness scoring'],
        trends: { improving: false, stable: true, declining: false },
      },
    };
  }

  /**
   * Remove statistical outliers from data
   */
  private removeOutliers(data: number[]): number[] {
    if (data.length < 4) return data;

    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    // Ensure indices are within bounds and values exist
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];

    if (q1 === undefined || q3 === undefined) {
      // Fallback for edge cases where quartiles can't be calculated
      return data;
    }

    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter((value) => value >= lowerBound && value <= upperBound);
  }

  /**
   * Calculate percentile ranking
   */
  private calculatePercentile(value: number, sortedData: number[]): number {
    const index = sortedData.findIndex((v) => v >= value);
    if (index === -1) return 100;
    return (index / sortedData.length) * 100;
  }

  /**
   * Get usage history for a pattern
   */
  getUsageHistory(patternId: string): PatternUsageRecord[] {
    return this.usageHistory.get(patternId) || [];
  }

  /**
   * Clear usage history for a pattern
   */
  clearUsageHistory(patternId: string): void {
    this.usageHistory.delete(patternId);
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(): Record<string, PatternUsageRecord[]> {
    return Object.fromEntries(this.usageHistory);
  }

  /**
   * Import usage data from external source
   */
  importUsageData(data: Record<string, PatternUsageRecord[]>): void {
    for (const [patternId, records] of Object.entries(data)) {
      this.usageHistory.set(
        patternId,
        records.map((record) => PatternUsageRecordSchema.parse(record))
      );
    }
  }
}

/**
 * Create a pattern effectiveness scorer with default configuration
 */
export function createEffectivenessScorer(
  config?: Partial<EffectivenessScoringConfig>
): PatternEffectivenessScorer {
  return new PatternEffectivenessScorer(config);
}
