import type { EffectivenessMetrics, PatternFeatureVector } from './types.ts';

/**
 * Statistical Analysis Tools for Pattern Metrics
 *
 * This module provides real statistical algorithms for analyzing pattern effectiveness,
 * performance metrics, and learning insights in the Carmack Coder system.
 */

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
    iqr: number;
  };
  skewness: number;
  kurtosis: number;
  outliers: number[];
}

export interface CorrelationAnalysis {
  pearsonCorrelation: number;
  spearmanCorrelation: number;
  kendallTau: number;
  significance: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number;
  };
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  rSquared: number;
  forecast: number[];
  seasonality: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

/**
 * Core Statistical Functions
 */
export class StatisticalAnalyzer {
  /**
   * Calculate comprehensive statistical summary for a dataset
   */
  static calculateSummary(data: number[]): StatisticalSummary {
    if (data.length === 0) {
      throw new Error('Cannot calculate statistics for empty dataset');
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;

    // Basic statistics
    const mean = StatisticalAnalyzer.calculateMean(data);
    const median = StatisticalAnalyzer.calculateMedian(sorted);
    const mode = StatisticalAnalyzer.calculateMode(data);
    const variance = StatisticalAnalyzer.calculateVariance(data, mean);
    const standardDeviation = Math.sqrt(variance);
    const min = sorted[0] ?? 0;
    const max = sorted[n - 1] ?? 0;
    const range = max - min;

    // Quartiles
    const quartiles = StatisticalAnalyzer.calculateQuartiles(sorted);

    // Higher-order moments
    const skewness = StatisticalAnalyzer.calculateSkewness(data, mean, standardDeviation);
    const kurtosis = StatisticalAnalyzer.calculateKurtosis(data, mean, standardDeviation);

    // Outliers using IQR method
    const outliers = StatisticalAnalyzer.detectOutliers(data, quartiles);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      variance,
      min,
      max,
      range,
      quartiles,
      skewness,
      kurtosis,
      outliers,
    };
  }

  /**
   * Calculate mean (average)
   */
  static calculateMean(data: number[]): number {
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  }

  /**
   * Calculate median (middle value)
   */
  static calculateMedian(sortedData: number[]): number {
    const n = sortedData.length;
    if (n % 2 === 0) {
      return ((sortedData[n / 2 - 1] ?? 0) + (sortedData[n / 2] ?? 0)) / 2;
    }
    return sortedData[Math.floor(n / 2)] ?? 0;
  }

  /**
   * Calculate mode (most frequent values)
   */
  static calculateMode(data: number[]): number[] {
    const frequency = new Map<number, number>();

    for (const value of data) {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    }

    const maxFreq = Math.max(...frequency.values());
    return Array.from(frequency.entries())
      .filter(([, freq]) => freq === maxFreq)
      .map(([value]) => value);
  }

  /**
   * Calculate variance
   */
  static calculateVariance(data: number[], mean?: number): number {
    const avg = mean ?? StatisticalAnalyzer.calculateMean(data);
    const squaredDiffs = data.map((value) => (value - avg) ** 2);
    return StatisticalAnalyzer.calculateMean(squaredDiffs);
  }

  /**
   * Calculate quartiles and IQR
   */
  static calculateQuartiles(sortedData: number[]): StatisticalSummary['quartiles'] {
    const n = sortedData.length;

    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    const q1 = sortedData[q1Index] ?? 0;
    const q2 = sortedData[q2Index] ?? 0;
    const q3 = sortedData[q3Index] ?? 0;
    const iqr = q3 - q1;

    return { q1, q2, q3, iqr };
  }

  /**
   * Calculate skewness (measure of asymmetry)
   */
  static calculateSkewness(data: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;

    const n = data.length;
    const skewSum = data.reduce((sum, value) => {
      return sum + ((value - mean) / stdDev) ** 3;
    }, 0);

    return (n / ((n - 1) * (n - 2))) * skewSum;
  }

  /**
   * Calculate kurtosis (measure of tail heaviness)
   */
  static calculateKurtosis(data: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;

    const n = data.length;
    const kurtSum = data.reduce((sum, value) => {
      return sum + ((value - mean) / stdDev) ** 4;
    }, 0);

    const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum;
    const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));

    return kurtosis - correction; // Excess kurtosis
  }

  /**
   * Detect outliers using IQR method
   */
  static detectOutliers(data: number[], quartiles: StatisticalSummary['quartiles']): number[] {
    const { q1, q3, iqr } = quartiles;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter((value) => value < lowerBound || value > upperBound);
  }

  /**
   * Calculate correlation between two datasets
   */
  static calculateCorrelation(x: number[], y: number[]): CorrelationAnalysis {
    if (x.length !== y.length) {
      throw new Error('Datasets must have the same length for correlation analysis');
    }

    const n = x.length;
    if (n < 2) {
      throw new Error('Need at least 2 data points for correlation analysis');
    }

    // Pearson correlation
    const pearsonCorrelation = StatisticalAnalyzer.calculatePearsonCorrelation(x, y);

    // Spearman correlation (rank-based)
    const spearmanCorrelation = StatisticalAnalyzer.calculateSpearmanCorrelation(x, y);

    // Kendall's Tau
    const kendallTau = StatisticalAnalyzer.calculateKendallTau(x, y);

    // Statistical significance (t-test for Pearson)
    const significance = StatisticalAnalyzer.calculateCorrelationSignificance(
      pearsonCorrelation,
      n
    );

    // Confidence interval for Pearson correlation
    const confidenceInterval = StatisticalAnalyzer.calculateCorrelationConfidenceInterval(
      pearsonCorrelation,
      n
    );

    return {
      pearsonCorrelation,
      spearmanCorrelation,
      kendallTau,
      significance,
      confidenceInterval,
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  static calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = StatisticalAnalyzer.calculateMean(x);
    const meanY = StatisticalAnalyzer.calculateMean(y);

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = (x[i] ?? 0) - meanX;
      const deltaY = (y[i] ?? 0) - meanY;

      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate Spearman rank correlation
   */
  static calculateSpearmanCorrelation(x: number[], y: number[]): number {
    const ranksX = StatisticalAnalyzer.calculateRanks(x);
    const ranksY = StatisticalAnalyzer.calculateRanks(y);
    return StatisticalAnalyzer.calculatePearsonCorrelation(ranksX, ranksY);
  }

  /**
   * Calculate ranks for Spearman correlation
   */
  static calculateRanks(data: number[]): number[] {
    const indexed = data.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array(data.length);
    for (let i = 0; i < indexed.length; i++) {
      const item = indexed[i];
      if (item) {
        ranks[item.index] = i + 1;
      }
    }

    return ranks;
  }

  /**
   * Calculate Kendall's Tau correlation
   */
  static calculateKendallTau(x: number[], y: number[]): number {
    const n = x.length;
    let concordant = 0;
    let discordant = 0;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const signX = Math.sign((x[j] ?? 0) - (x[i] ?? 0));
        const signY = Math.sign((y[j] ?? 0) - (y[i] ?? 0));

        if (signX * signY > 0) {
          concordant++;
        } else if (signX * signY < 0) {
          discordant++;
        }
      }
    }

    const totalPairs = (n * (n - 1)) / 2;
    return (concordant - discordant) / totalPairs;
  }

  /**
   * Calculate statistical significance of correlation
   */
  static calculateCorrelationSignificance(correlation: number, n: number): number {
    if (n <= 2) return 1;

    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const df = n - 2;

    // Approximate p-value using t-distribution
    return StatisticalAnalyzer.tTestPValue(Math.abs(t), df);
  }

  /**
   * Calculate confidence interval for correlation
   */
  static calculateCorrelationConfidenceInterval(
    correlation: number,
    n: number,
    confidence = 0.95
  ): CorrelationAnalysis['confidenceInterval'] {
    if (n <= 3) {
      return { lower: -1, upper: 1, confidence };
    }

    // Fisher's z-transformation
    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(n - 3);
    const zCritical = StatisticalAnalyzer.getZCritical(confidence);

    const zLower = z - zCritical * se;
    const zUpper = z + zCritical * se;

    // Transform back to correlation scale
    const lower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
    const upper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

    return { lower, upper, confidence };
  }

  /**
   * Perform trend analysis on time series data
   */
  static analyzeTrend(data: number[], timePoints?: number[]): TrendAnalysis {
    const n = data.length;
    const x = timePoints || Array.from({ length: n }, (_, i) => i);

    if (x.length !== n) {
      throw new Error('Time points must match data length');
    }

    // Linear regression for trend
    const { slope, rSquared } = StatisticalAnalyzer.calculateLinearRegression(x, data);

    // Determine trend direction
    const trend = StatisticalAnalyzer.determineTrend(slope, rSquared);

    // Simple forecast (linear extrapolation)
    const forecastSteps = Math.min(5, Math.floor(n * 0.2)); // Forecast 20% ahead or 5 steps
    const forecast = StatisticalAnalyzer.generateForecast(x, data, slope, forecastSteps);

    // Basic seasonality detection
    const seasonality = StatisticalAnalyzer.detectSeasonality(data);

    return {
      trend,
      slope,
      rSquared,
      forecast,
      seasonality,
    };
  }

  /**
   * Calculate linear regression
   */
  static calculateLinearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const meanX = StatisticalAnalyzer.calculateMean(x);
    const meanY = StatisticalAnalyzer.calculateMean(y);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = (x[i] ?? 0) - meanX;
      const deltaY = (y[i] ?? 0) - meanY;
      numerator += deltaX * deltaY;
      denominator += deltaX * deltaX;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    // Calculate R-squared
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares

    for (let i = 0; i < n; i++) {
      const predicted = slope * (x[i] ?? 0) + intercept;
      ssRes += ((y[i] ?? 0) - predicted) ** 2;
      ssTot += ((y[i] ?? 0) - meanY) ** 2;
    }

    const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    return { slope, intercept, rSquared };
  }

  /**
   * Determine trend direction
   */
  static determineTrend(slope: number, rSquared: number): TrendAnalysis['trend'] {
    const slopeThreshold = 0.01;
    const rSquaredThreshold = 0.3;

    if (rSquared < rSquaredThreshold) {
      return 'volatile';
    }

    if (Math.abs(slope) < slopeThreshold) {
      return 'stable';
    }

    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Generate forecast using linear extrapolation
   */
  static generateForecast(x: number[], y: number[], slope: number, steps: number): number[] {
    const lastX = x[x.length - 1] ?? 0;
    const meanY = StatisticalAnalyzer.calculateMean(y);
    const meanX = StatisticalAnalyzer.calculateMean(x);
    const intercept = meanY - slope * meanX;

    const forecast: number[] = [];
    for (let i = 1; i <= steps; i++) {
      const futureX = lastX + i;
      const futureY = slope * futureX + intercept;
      forecast.push(futureY);
    }

    return forecast;
  }

  /**
   * Basic seasonality detection using autocorrelation
   */
  static detectSeasonality(data: number[]): TrendAnalysis['seasonality'] {
    const n = data.length;
    if (n < 12) {
      return { detected: false };
    }

    const maxLag = Math.min(Math.floor(n / 3), 24);
    let maxCorrelation = 0;
    let bestPeriod = 0;

    for (let lag = 2; lag <= maxLag; lag++) {
      const correlation = StatisticalAnalyzer.calculateAutocorrelation(data, lag);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = lag;
      }
    }

    const threshold = 0.3; // Minimum correlation for seasonality detection
    if (maxCorrelation > threshold) {
      return {
        detected: true,
        period: bestPeriod,
        strength: maxCorrelation,
      };
    }

    return { detected: false };
  }

  /**
   * Calculate autocorrelation at a specific lag
   */
  static calculateAutocorrelation(data: number[], lag: number): number {
    const n = data.length;
    if (lag >= n) return 0;

    const x = data.slice(0, n - lag);
    const y = data.slice(lag);

    return Math.abs(StatisticalAnalyzer.calculatePearsonCorrelation(x, y));
  }

  /**
   * Approximate t-test p-value (two-tailed)
   */
  static tTestPValue(t: number, df: number): number {
    // Simplified approximation for p-value
    // In a real implementation, you'd use a proper t-distribution CDF
    const x = df / (df + t * t);
    return StatisticalAnalyzer.betaIncomplete(df / 2, 0.5, x);
  }

  /**
   * Get critical z-value for confidence interval
   */
  static getZCritical(confidence: number): number {
    // Common z-values for confidence intervals
    const zValues: Record<number, number> = {
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };

    return zValues[confidence] || 1.96; // Default to 95%
  }

  /**
   * Simplified incomplete beta function approximation
   */
  static betaIncomplete(a: number, b: number, x: number): number {
    // Very simplified approximation - in production, use a proper implementation
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Rough approximation for common cases
    return x ** a * (1 - x) ** b;
  }
}

/**
 * Pattern-specific statistical analysis
 */
export class PatternStatistics {
  /**
   * Analyze effectiveness metrics for a set of patterns
   */
  static analyzeEffectiveness(metrics: EffectivenessMetrics[]): {
    summary: StatisticalSummary;
    correlations: {
      successRateVsPerformance: CorrelationAnalysis;
      complexityVsEffectiveness: CorrelationAnalysis;
    };
    insights: string[];
  } {
    if (metrics.length === 0) {
      throw new Error('No metrics provided for analysis');
    }

    const successRates = metrics.map((m) => m.successRate);
    const performances = metrics.map((m) => m.averageExecutionTime);
    const complexityReductions = metrics.map((m) => m.complexityReduction);
    const userSatisfactions = metrics.map((m) => m.userSatisfaction);

    // Statistical summary of success rates
    const summary = StatisticalAnalyzer.calculateSummary(successRates);

    // Correlation analyses
    const successRateVsPerformance = StatisticalAnalyzer.calculateCorrelation(
      successRates,
      performances
    );

    const complexityVsEffectiveness = StatisticalAnalyzer.calculateCorrelation(
      complexityReductions,
      userSatisfactions
    );

    // Generate insights
    const insights = PatternStatistics.generateEffectivenessInsights(
      summary,
      { successRateVsPerformance, complexityVsEffectiveness },
      metrics
    );

    return {
      summary,
      correlations: {
        successRateVsPerformance,
        complexityVsEffectiveness,
      },
      insights,
    };
  }

  /**
   * Generate insights from effectiveness analysis
   */
  static generateEffectivenessInsights(
    summary: StatisticalSummary,
    correlations: any,
    metrics: EffectivenessMetrics[]
  ): string[] {
    const insights: string[] = [];

    // Success rate insights
    if (summary.mean > 0.8) {
      insights.push('Overall pattern effectiveness is high with average success rate above 80%');
    } else if (summary.mean < 0.5) {
      insights.push('Pattern effectiveness needs improvement with average success rate below 50%');
    }

    // Variability insights
    if (summary.standardDeviation > 0.3) {
      insights.push(
        'High variability in pattern effectiveness suggests need for pattern optimization'
      );
    }

    // Performance correlation insights
    if (correlations.successRateVsPerformance.pearsonCorrelation < -0.5) {
      insights.push(
        'Strong negative correlation between success rate and execution time - faster patterns tend to be more successful'
      );
    }

    // Complexity insights
    if (correlations.complexityVsEffectiveness.pearsonCorrelation > 0.5) {
      insights.push('Patterns that reduce complexity tend to have higher user satisfaction');
    }

    // Outlier insights
    if (summary.outliers.length > 0) {
      insights.push(
        `${summary.outliers.length} patterns show unusual effectiveness metrics and may need review`
      );
    }

    // Trend insights
    const recentMetrics = metrics
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, Math.min(10, metrics.length));

    if (recentMetrics.length > 3) {
      const recentSuccessRates = recentMetrics.map((m) => m.successRate);
      const trend = StatisticalAnalyzer.analyzeTrend(recentSuccessRates);

      if (trend.trend === 'increasing') {
        insights.push('Recent pattern effectiveness shows improving trend');
      } else if (trend.trend === 'decreasing') {
        insights.push(
          'Recent pattern effectiveness shows declining trend - investigation recommended'
        );
      }
    }

    return insights;
  }

  /**
   * Analyze pattern feature vectors for clustering insights
   */
  static analyzeFeatureVectors(patterns: PatternFeatureVector[]): {
    dimensionality: number;
    featureStatistics: StatisticalSummary[];
    principalComponents: {
      explained_variance: number[];
      cumulative_variance: number[];
    };
    insights: string[];
  } {
    if (patterns.length === 0) {
      throw new Error('No pattern feature vectors provided');
    }

    const dimensionality = patterns[0]?.features.length ?? 0;
    const featureStatistics: StatisticalSummary[] = [];

    // Analyze each feature dimension
    for (let dim = 0; dim < dimensionality; dim++) {
      const featureValues = patterns.map((p) => p.features[dim] ?? 0);
      featureStatistics.push(StatisticalAnalyzer.calculateSummary(featureValues));
    }

    // Simple PCA approximation (eigenvalue estimation)
    const principalComponents = PatternStatistics.approximatePCA(patterns);

    // Generate insights
    const insights = PatternStatistics.generateFeatureInsights(
      featureStatistics,
      principalComponents
    );

    return {
      dimensionality,
      featureStatistics,
      principalComponents,
      insights,
    };
  }

  /**
   * Approximate PCA for feature analysis
   */
  static approximatePCA(patterns: PatternFeatureVector[]): {
    explained_variance: number[];
    cumulative_variance: number[];
  } {
    const features = patterns.map((p) => p.features);
    const dimensionality = features[0]?.length ?? 0;

    // Calculate variance for each dimension as a simple approximation
    const explained_variance: number[] = [];

    for (let dim = 0; dim < dimensionality; dim++) {
      const values = features.map((f) => f[dim] ?? 0);
      const variance = StatisticalAnalyzer.calculateVariance(values);
      explained_variance.push(variance);
    }

    // Normalize to get explained variance ratios
    const totalVariance = explained_variance.reduce((sum, v) => sum + v, 0);
    const normalizedVariance = explained_variance.map((v) =>
      totalVariance > 0 ? v / totalVariance : 0
    );

    // Calculate cumulative variance
    const cumulative_variance: number[] = [];
    let cumSum = 0;
    for (const variance of normalizedVariance) {
      cumSum += variance;
      cumulative_variance.push(cumSum);
    }

    return {
      explained_variance: normalizedVariance,
      cumulative_variance,
    };
  }

  /**
   * Generate insights from feature analysis
   */
  static generateFeatureInsights(
    featureStats: StatisticalSummary[],
    pca: { explained_variance: number[]; cumulative_variance: number[] }
  ): string[] {
    const insights: string[] = [];

    // Dimensionality insights
    const effectiveDimensions = pca.cumulative_variance.findIndex((cv) => cv >= 0.95) + 1;
    if (effectiveDimensions < featureStats.length) {
      insights.push(
        `${effectiveDimensions} dimensions explain 95% of variance - dimensionality reduction possible`
      );
    }

    // Feature distribution insights
    const highVarianceFeatures = featureStats
      .map((stat, index) => ({ index, variance: stat.variance }))
      .filter(
        (f) =>
          f.variance > featureStats.reduce((sum, s) => sum + s.variance, 0) / featureStats.length
      ).length;

    if (highVarianceFeatures > featureStats.length * 0.3) {
      insights.push('High feature variance suggests diverse pattern characteristics');
    }

    // Skewness insights
    const skewedFeatures = featureStats.filter((stat) => Math.abs(stat.skewness) > 1).length;
    if (skewedFeatures > featureStats.length * 0.2) {
      insights.push('Some features show significant skewness - consider normalization');
    }

    return insights;
  }
}
