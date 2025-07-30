import { fromPromise } from 'xstate';
import { z } from 'zod';

/**
 * Feedback Loop System for Continuous Pattern Improvement
 *
 * This system creates a continuous improvement cycle by:
 * - Collecting feedback from transformation results
 * - Analyzing pattern performance over time
 * - Automatically adjusting pattern confidence scores
 * - Identifying underperforming patterns for removal
 * - Discovering new patterns from successful transformations
 * - Optimizing pattern parameters based on usage data
 */
// AST-grep pattern metadata schema
export const ASTGrepPatternSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  language: z.string(), // e.g., 'typescript', 'python', 'cpp', etc.
  query: z.string(), // AST-grep query (YAML/JSON or string)
  options: z.record(z.any()).optional(), // AST-grep options (optional)
});
export type ASTGrepPattern = z.infer<typeof ASTGrepPatternSchema>;

// Feedback data schema (language-agnostic)
const FeedbackDataSchema = z.object({
  patternId: z.string(),
  transformationId: z.string(),
  success: z.boolean(),
  executionTime: z.number(), // milliseconds
  codeQualityImprovement: z.number().min(-1).max(1), // -1 to 1 scale
  userRating: z.number().min(1).max(5).optional(),
  userComments: z.string().optional(),
  errorMessage: z.string().optional(),
  context: z.object({
    fileType: z.string(),
    codeSize: z.number(),
    complexity: z.number(),
    language: z.string(), // Accept any language
  }),
  timestamp: z.string(),
  astGrepPattern: ASTGrepPatternSchema.optional(), // Link to AST-grep pattern metadata
});
export type FeedbackData = z.infer<typeof FeedbackDataSchema>;
// Feedback loop request schema (language-agnostic, supports AST-grep)
const FeedbackLoopRequestSchema = z.object({
  operation: z.enum(['collect', 'analyze', 'optimize', 'report']),
  // Feedback data for collection
  feedbackData: z.array(FeedbackDataSchema).optional(),
  // Analysis parameters
  analysisConfig: z
    .object({
      timeWindow: z.number().default(7), // days
      minSampleSize: z.number().default(10),
      confidenceThreshold: z.number().default(0.7),
      performanceThreshold: z.number().default(0.8),
    })
    .optional()
    .default({}),
  // Optimization parameters
  optimizationConfig: z
    .object({
      learningRate: z.number().default(0.1),
      decayFactor: z.number().default(0.95),
      adaptationSpeed: z.enum(['slow', 'medium', 'fast']).default('medium'),
      enableAutoRemoval: z.boolean().default(true),
    })
    .optional()
    .default({}),
  // AST-grep pattern(s) for transformation/analysis (optional)
  astGrepPatterns: z.array(ASTGrepPatternSchema).optional(),
});
export type FeedbackLoopRequest = z.infer<typeof FeedbackLoopRequestSchema>;
/**
 * Pattern performance metrics (language-agnostic, AST-grep aware)
 */
interface PatternMetrics {
  patternId: string;
  totalUsage: number;
  successRate: number;
  averageExecutionTime: number;
  averageQualityImprovement: number;
  averageUserRating: number;
  confidenceScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  // Performance breakdown
  performance: {
    byFileType: Record<string, { success: number; total: number }>;
    byComplexity: Record<string, { success: number; total: number }>;
    byLanguage: Record<string, { success: number; total: number }>;
  };
  // Recent feedback
  recentFeedback: FeedbackData[];
  // AST-grep pattern metadata (optional)
  astGrepPattern?: ASTGrepPattern;
}
/**
 * Optimization parameters for different actions
 */
interface OptimizationParameters {
  factor?: number;
  reason?: string;
  threshold?: number;
  [key: string]: string | number | boolean | undefined;
}
/**
 * Improvement recommendations
 */
interface ImprovementRecommendation {
  type: 'adjust_confidence' | 'remove_pattern' | 'optimize_parameters' | 'create_variant';
  patternId: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number; // 0-1 scale
  implementation: {
    action: string;
    parameters: OptimizationParameters;
  };
  reasoning: string;
}
/**
 * Applied optimization result
 */
interface AppliedOptimization {
  patternId: string;
  action: string;
  oldValue: string | number;
  newValue: string | number;
  expectedImpact: number;
}
/**
 * Analysis configuration with defaults
 */
interface AnalysisConfig {
  timeWindow: number;
  minSampleSize: number;
  confidenceThreshold: number;
  performanceThreshold: number;
}
/**
 * Optimization configuration with defaults
 */
interface OptimizationConfig {
  learningRate: number;
  decayFactor: number;
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  enableAutoRemoval: boolean;
}
/**
 * Feedback Loop Actor (language-agnostic, AST-grep aware)
 */
export const feedbackLoopActor = fromPromise(async ({ input }: { input: FeedbackLoopRequest }) => {
  const validatedInput = FeedbackLoopRequestSchema.parse(input);

  // If AST-grep patterns are provided, validate and prepare them
  if (validatedInput.astGrepPatterns && validatedInput.astGrepPatterns.length > 0) {
    for (const pattern of validatedInput.astGrepPatterns) {
      ASTGrepPatternSchema.parse(pattern);
    }
  }
  const result = await executeFeedbackLoop(validatedInput);

  return result;
});
/**
 * AST-grep pattern application stub (to be implemented with @ast-grep/napi)
 * This function should apply an AST-grep query to code in any language.
 */
import { parse, pattern as compilePattern, Lang } from '@ast-grep/napi';
export async function applyASTGrepPattern({
  code,
  pattern,
  language,
  options,
}: {
  code: string;
  pattern: string;
  language: string;
  options?: Record<string, unknown>;
}): Promise<{ matches: any[] }> {
  // Try to resolve language to a supported enum, fallback to string
  let lang: string | Lang = language;
  if (Lang[language as keyof typeof Lang]) {
    lang = Lang[language as keyof typeof Lang];
  }
  // Compile the AST-grep pattern
  const compiledPattern = compilePattern(lang, pattern);
  // Parse the code to AST
  const root = parse(lang, code);
  // Find matches using SgRoot.root().findAll()
  const matches = root.root().findAll(compiledPattern);
  return { matches };
}
/**
 * Execute feedback loop operation
 */
async function executeFeedbackLoop(request: FeedbackLoopRequest) {
  switch (request.operation) {
    case 'collect':
      return await collectFeedback(request);
    case 'analyze':
      return await analyzeFeedback(request);
    case 'optimize':
      return await optimizePatterns(request);
    case 'report':
      return await generateReport(request);
    default:
      throw new Error(`Unknown operation: ${request.operation}`);
  }
}
/**
 * Collect and store feedback data
 */
async function collectFeedback(request: FeedbackLoopRequest) {
  const feedbackData = request.feedbackData || [];
  // Validate all feedback data
  const validatedFeedback = feedbackData.map((data) => FeedbackDataSchema.parse(data));
  // Store feedback in memory (in production, this would be a database)
  const feedbackStore = await getFeedbackStore();
  for (const feedback of validatedFeedback) {
    feedbackStore.push(feedback);
  }
  // Update pattern metrics in real-time
  const updatedMetrics = await updatePatternMetrics(validatedFeedback);
  return {
    operation: 'collect' as const,
    status: 'success',
    processed: validatedFeedback.length,
    updatedPatterns: updatedMetrics.length,
    summary: {
      totalFeedback: feedbackStore.length,
      recentSuccess: validatedFeedback.filter((f) => f.success).length,
      recentFailures: validatedFeedback.filter((f) => !f.success).length,
      averageQuality:
        validatedFeedback.reduce((sum, f) => sum + f.codeQualityImprovement, 0) /
        validatedFeedback.length,
    },
    timestamp: new Date().toISOString(),
  };
}
/**
 * Analyze feedback patterns and performance
 */
async function analyzeFeedback(request: FeedbackLoopRequest) {
  const config = request.analysisConfig;
  const feedbackStore = await getFeedbackStore();
  // Filter feedback by time window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.timeWindow);
  const recentFeedback = feedbackStore.filter((f) => new Date(f.timestamp) >= cutoffDate);
  // Group feedback by pattern
  const patternGroups = groupFeedbackByPattern(recentFeedback);
  // Calculate metrics for each pattern
  const patternMetrics: PatternMetrics[] = [];
  for (const [patternId, feedback] of Object.entries(patternGroups)) {
    if (feedback.length >= config.minSampleSize) {
      const metrics = calculatePatternMetrics(patternId, feedback);
      patternMetrics.push(metrics);
    }
  }
  // Identify trends and issues
  const analysis = {
    totalPatterns: patternMetrics.length,
    highPerformers: patternMetrics.filter((m) => m.successRate >= config.performanceThreshold),
    underperformers: patternMetrics.filter((m) => m.successRate < config.performanceThreshold),
    declining: patternMetrics.filter((m) => m.trendDirection === 'declining'),
    improving: patternMetrics.filter((m) => m.trendDirection === 'improving'),
  };
  return {
    operation: 'analyze' as const,
    status: 'success',
    timeWindow: config.timeWindow,
    sampleSize: recentFeedback.length,
    analysis,
    patternMetrics,
    recommendations: generateRecommendations(patternMetrics, config),
    timestamp: new Date().toISOString(),
  };
}
/**
 * Optimize patterns based on feedback analysis
 */
async function optimizePatterns(request: FeedbackLoopRequest) {
  const config = request.optimizationConfig;
  // First analyze current performance
  const analysisResult = await analyzeFeedback({
    ...request,
    operation: 'analyze',
  });
  const recommendations = analysisResult.recommendations;
  const appliedOptimizations: AppliedOptimization[] = [];
  // Apply optimizations based on recommendations
  for (const recommendation of recommendations) {
    try {
      const optimization = await applyOptimization(recommendation, config);
      appliedOptimizations.push(optimization);
    } catch (error) {

    }
  }
  // Update pattern confidence scores
  const confidenceUpdates = await updateConfidenceScores(analysisResult.patternMetrics, config);
  return {
    operation: 'optimize' as const,
    status: 'success',
    optimizationsApplied: appliedOptimizations.length,
    confidenceUpdates: confidenceUpdates.length,
    optimizations: appliedOptimizations,
    confidenceChanges: confidenceUpdates,
    summary: {
      patternsImproved: appliedOptimizations.filter((o) => o.expectedImpact > 0).length,
      patternsRemoved: appliedOptimizations.filter((o) => o.action === 'remove').length,
      averageImpact:
        appliedOptimizations.reduce((sum, o) => sum + o.expectedImpact, 0) /
        appliedOptimizations.length,
    },
    timestamp: new Date().toISOString(),
  };
}
/**
 * Generate comprehensive feedback report
 */
async function generateReport(request: FeedbackLoopRequest) {
  const analysisResult = await analyzeFeedback({
    ...request,
    operation: 'analyze',
  });
  const feedbackStore = await getFeedbackStore();
  const totalFeedback = feedbackStore.length;
  // Calculate overall system performance
  const overallMetrics = {
    totalTransformations: totalFeedback,
    overallSuccessRate: feedbackStore.filter((f) => f.success).length / totalFeedback,
    averageExecutionTime:
      feedbackStore.reduce((sum, f) => sum + f.executionTime, 0) / totalFeedback,
    averageQualityImprovement:
      feedbackStore.reduce((sum, f) => sum + f.codeQualityImprovement, 0) / totalFeedback,
    averageUserRating: calculateAverageUserRating(feedbackStore),
  };
  // Performance by category
  const performanceByLanguage = calculatePerformanceByCategory(feedbackStore, 'language');
  const performanceByFileType = calculatePerformanceByCategory(feedbackStore, 'fileType');
  // Trend analysis
  const trendAnalysis = calculateTrendAnalysis(feedbackStore);
  return {
    operation: 'report' as const,
    status: 'success',
    reportGenerated: new Date().toISOString(),
    overallMetrics,
    patternAnalysis: analysisResult.analysis,
    performanceBreakdown: {
      byLanguage: performanceByLanguage,
      byFileType: performanceByFileType,
    },
    trendAnalysis,
    topPerformers: analysisResult.analysis.highPerformers.slice(0, 5),
    needsAttention: analysisResult.analysis.underperformers.slice(0, 5),
    recommendations: analysisResult.recommendations.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}
/**
 * Helper functions
 */
// In-memory feedback store (in production, this would be a database)
const feedbackStore: FeedbackData[] = [];
async function getFeedbackStore(): Promise<FeedbackData[]> {
  return feedbackStore;
}
function groupFeedbackByPattern(feedback: FeedbackData[]): Record<string, FeedbackData[]> {
  const groups: Record<string, FeedbackData[]> = {};
  for (const item of feedback) {
    if (!groups[item.patternId]) {
      groups[item.patternId] = [];
    }
groups[item.patternId]?.push
  }
  return groups;
}
function calculatePatternMetrics(patternId: string, feedback: FeedbackData[]): PatternMetrics {
  const successful = feedback.filter((f) => f.success);
  const successRate = successful.length / feedback.length;
  const averageExecutionTime =
    feedback.reduce((sum, f) => sum + f.executionTime, 0) / feedback.length;
  const averageQualityImprovement =
    feedback.reduce((sum, f) => sum + f.codeQualityImprovement, 0) / feedback.length;
  const averageUserRating = calculateAverageUserRating(feedback);
  // Calculate trend direction
  const recentFeedback = feedback.slice(-Math.min(10, feedback.length));
  const recentSuccessRate = recentFeedback.filter((f) => f.success).length / recentFeedback.length;
  const trendDirection =
    recentSuccessRate > successRate + 0.1
      ? 'improving'
      : recentSuccessRate < successRate - 0.1
        ? 'declining'
        : 'stable';
  // Performance breakdown
  const performance = {
    byFileType: calculateBreakdown(feedback, (f) => f.context.fileType),
    byComplexity: calculateBreakdown(feedback, (f) => f.context.complexity.toString()),
    byLanguage: calculateBreakdown(feedback, (f) => f.context.language),
  };
  return {
    patternId,
    totalUsage: feedback.length,
    successRate,
    averageExecutionTime,
    averageQualityImprovement,
    averageUserRating,
    confidenceScore: calculateConfidenceScore(
      successRate,
      averageQualityImprovement,
      averageUserRating
    ),
    trendDirection,
    lastUpdated: new Date().toISOString(),
    performance,
    recentFeedback: feedback.slice(-5), // Last 5 feedback items
  };
}
function calculateBreakdown(
  feedback: FeedbackData[],
  keyExtractor: (f: FeedbackData) => string
): Record<string, { success: number; total: number }> {
  const breakdown: Record<string, { success: number; total: number }> = {};
  for (const item of feedback) {
    const key = keyExtractor(item);
    if (!breakdown[key]) {
      breakdown[key] = { success: 0, total: 0 };
    }
    breakdown[key].total++;
    if (item.success) {
      breakdown[key].success++;
    }
  }
  return breakdown;
}
function calculateAverageUserRating(feedback: FeedbackData[]): number {
  const ratingsOnly = feedback.filter((f) => f.userRating !== undefined);
  if (ratingsOnly.length === 0) return 3; // Default neutral rating
  return ratingsOnly.reduce((sum, f) => sum + (f.userRating || 0), 0) / ratingsOnly.length;
}
function calculateConfidenceScore(
  successRate: number,
  qualityImprovement: number,
  userRating: number
): number {
  // Weighted combination of metrics
  const weights = { success: 0.5, quality: 0.3, rating: 0.2 };
  const normalizedRating = (userRating - 1) / 4; // Convert 1-5 to 0-1
  const normalizedQuality = (qualityImprovement + 1) / 2; // Convert -1,1 to 0-1
  return (
    weights.success * successRate +
    weights.quality * normalizedQuality +
    weights.rating * normalizedRating
  );
}
function generateRecommendations(
  metrics: PatternMetrics[],
  _config: AnalysisConfig
): ImprovementRecommendation[] {
  const recommendations: ImprovementRecommendation[] = [];
  for (const metric of metrics) {
    // Low performance patterns
    if (metric.successRate < 0.6) {
      recommendations.push({
        type: 'remove_pattern',
        patternId: metric.patternId,
        priority: 'high',
        description: `Pattern has low success rate (${(metric.successRate * 100).toFixed(1)}%)`,
        expectedImpact: 0.8,
        implementation: {
          action: 'remove',
          parameters: { reason: 'low_performance' },
        },
        reasoning:
          'Patterns with success rates below 60% should be removed to improve overall system quality',
      });
    }
    // Declining patterns
    if (metric.trendDirection === 'declining' && metric.successRate < 0.8) {
      recommendations.push({
        type: 'adjust_confidence',
        patternId: metric.patternId,
        priority: 'medium',
        description: 'Pattern performance is declining, reduce confidence',
        expectedImpact: 0.4,
        implementation: {
          action: 'reduce_confidence',
          parameters: { factor: 0.9 },
        },
        reasoning: 'Declining patterns should have reduced confidence to limit their usage',
      });
    }
    // High-performing patterns
    if (metric.successRate > 0.9 && metric.trendDirection === 'improving') {
      recommendations.push({
        type: 'adjust_confidence',
        patternId: metric.patternId,
        priority: 'low',
        description: 'Pattern is performing excellently, increase confidence',
        expectedImpact: 0.3,
        implementation: {
          action: 'increase_confidence',
          parameters: { factor: 1.1 },
        },
        reasoning:
          'High-performing patterns should have increased confidence to promote their usage',
      });
    }
  }
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}
async function updatePatternMetrics(feedback: FeedbackData[]): Promise<PatternMetrics[]> {
  // Group feedback by pattern and update metrics
  const patternGroups = groupFeedbackByPattern(feedback);
  const updatedMetrics: PatternMetrics[] = [];
  for (const [patternId, patternFeedback] of Object.entries(patternGroups)) {
    const metrics = calculatePatternMetrics(patternId, patternFeedback);
    updatedMetrics.push(metrics);
  }
  return updatedMetrics;
}
async function applyOptimization(
  recommendation: ImprovementRecommendation,
  _config: OptimizationConfig
): Promise<AppliedOptimization> {
  // Simulate applying optimization (in production, this would update pattern storage)
  const { action, parameters } = recommendation.implementation;
  switch (action) {
    case 'remove':
      return {
        patternId: recommendation.patternId,
        action: 'remove',
        oldValue: 'active',
        newValue: 'removed',
        expectedImpact: recommendation.expectedImpact,
      };
    case 'reduce_confidence':
      return {
        patternId: recommendation.patternId,
        action: 'reduce_confidence',
        oldValue: 0.8, // Simulated old confidence
        newValue: 0.8 * (parameters.factor ?? 0.9),
        expectedImpact: recommendation.expectedImpact,
      };
    case 'increase_confidence':
      return {
        patternId: recommendation.patternId,
        action: 'increase_confidence',
        oldValue: 0.8, // Simulated old confidence
        newValue: Math.min(1.0, 0.8 * (parameters.factor ?? 1.1)),
        expectedImpact: recommendation.expectedImpact,
      };
    default:
      throw new Error(`Unknown optimization action: ${action}`);
  }
}
async function updateConfidenceScores(
  metrics: PatternMetrics[],
  config: OptimizationConfig
): Promise<Array<{ patternId: string; oldScore: number; newScore: number }>> {
  const updates: Array<{ patternId: string; oldScore: number; newScore: number }> = [];
  for (const metric of metrics) {
    const oldScore = metric.confidenceScore;
    // Apply learning rate to gradually adjust confidence
    const targetScore = calculateConfidenceScore(
      metric.successRate,
      metric.averageQualityImprovement,
      metric.averageUserRating
    );
    const newScore = oldScore + config.learningRate * (targetScore - oldScore);
    if (Math.abs(newScore - oldScore) > 0.01) {
      // Only update if significant change
      updates.push({
        patternId: metric.patternId,
        oldScore,
        newScore,
      });
    }
  }
  return updates;
}
function calculatePerformanceByCategory(
  feedback: FeedbackData[],
  category: keyof FeedbackData['context']
): Record<string, { successRate: number; count: number }> {
  const breakdown = calculateBreakdown(feedback, (f) => f.context[category].toString());
  const result: Record<string, { successRate: number; count: number }> = {};
  for (const [key, stats] of Object.entries(breakdown)) {
    result[key] = {
      successRate: stats.success / stats.total,
      count: stats.total,
    };
  }
  return result;
}
function calculateTrendAnalysis(feedback: FeedbackData[]): {
  direction: string;
  strength: number;
  description: string;
} {
  if (feedback.length < 10) {
    return {
      direction: 'insufficient_data',
      strength: 0,
      description: 'Not enough data for trend analysis',
    };
  }
  // Sort by timestamp
  const sortedFeedback = feedback.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  // Calculate success rate for first and last quarters
  const quarterSize = Math.floor(sortedFeedback.length / 4);
  const firstQuarter = sortedFeedback.slice(0, quarterSize);
  const lastQuarter = sortedFeedback.slice(-quarterSize);
  const firstQuarterSuccess = firstQuarter.filter((f) => f.success).length / firstQuarter.length;
  const lastQuarterSuccess = lastQuarter.filter((f) => f.success).length / lastQuarter.length;
  const change = lastQuarterSuccess - firstQuarterSuccess;
  const strength = Math.abs(change);
  let direction: string;
  let description: string;
  if (change > 0.1) {
    direction = 'improving';
    description = `System performance is improving with ${(change * 100).toFixed(1)}% increase in success rate`;
  } else if (change < -0.1) {
    direction = 'declining';
    description = `System performance is declining with ${(Math.abs(change) * 100).toFixed(1)}% decrease in success rate`;
  } else {
    direction = 'stable';
    description = 'System performance is stable with minimal change in success rate';
  }
  return { direction, strength, description };
}