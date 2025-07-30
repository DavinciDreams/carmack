import { z } from 'zod';
import type { EffectivenessScore, PatternEffectivenessScorer } from './effectiveness-scorer.ts';
import type { NLPAnalyzer } from './nlp.ts';
import type { ReinforcementLearningManager } from './reinforcement.ts';
import type { PatternSimilarityDetector } from './similarity.ts';
import type { PatternFeatureVector, RLState } from './types.ts';

/**
 * Recommendation request schema
 */
export const RecommendationRequestSchema = z.object({
  context: z.object({
    projectType: z.string(),
    codebaseComplexity: z.number().min(1).max(10),
    teamExperience: z.enum(['junior', 'mid', 'senior', 'expert']),
    timeConstraints: z.enum(['tight', 'moderate', 'flexible']),
    qualityRequirements: z.enum(['high', 'medium', 'low', 'critical']),
  }),
  preferences: z
    .object({
      riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
      performancePriority: z.number().min(0).max(1).default(0.7),
      maintainabilityPriority: z.number().min(0).max(1).default(0.8),
      maxRecommendations: z.number().min(1).max(20).default(5),
    })
    .default({}),
  userHistory: z
    .object({
      recentPatterns: z.array(z.string()).default([]),
      successfulPatterns: z.array(z.string()).default([]),
      rejectedPatterns: z.array(z.string()).default([]),
    })
    .default({}),
  currentTask: z.object({
    description: z.string(),
    files: z.array(z.string()),
    transformationType: z.enum(['template', 'ast', 'llm']).optional(),
  }),
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

/**
 * Pattern recommendation schema
 */
export const PatternRecommendationSchema = z.object({
  patternId: z.string(),
  confidence: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  effectivenessScore: z.number().min(0).max(1),
  riskLevel: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
  expectedBenefits: z.array(z.string()),
  potentialRisks: z.array(z.string()),
  estimatedEffort: z.enum(['low', 'medium', 'high']),
  metadata: z.object({
    similarityScore: z.number().min(0).max(1),
    usageCount: z.number().min(0),
    successRate: z.number().min(0).max(1),
    lastUsed: z.number().optional(),
  }),
});

export type PatternRecommendation = z.infer<typeof PatternRecommendationSchema>;

/**
 * Recommendation response schema
 */
export const RecommendationResponseSchema = z.object({
  recommendations: z.array(PatternRecommendationSchema),
  totalPatterns: z.number().min(0),
  processingTime: z.number().min(0),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  metadata: z.object({
    algorithmsUsed: z.array(z.string()),
    contextAnalysis: z.object({
      complexity: z.number().min(0).max(10),
      domain: z.array(z.string()),
      intent: z.string(),
    }),
    cacheHit: z.boolean().default(false),
  }),
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

/**
 * Recommendation engine configuration
 */
export interface RecommendationEngineConfig {
  similarity: {
    enableSemanticSimilarity: boolean;
    enableBehavioralSimilarity: boolean;
    enableStructuralSimilarity: boolean;
    similarityThreshold: number;
  };
  effectiveness: {
    enableEffectivenessScoring: boolean;
    minUsageCount: number;
    timeDecayFactor: number;
  };
  reinforcementLearning: {
    enableRLOptimization: boolean;
    explorationRate: number;
    learningRate: number;
  };
  nlp: {
    enableContextAnalysis: boolean;
    enableIntentDetection: boolean;
    maxKeywords: number;
  };
  caching: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTTL: number; // Time to live in milliseconds
  };
}

/**
 * Cache entry interface
 */
interface CacheEntry {
  request: RecommendationRequest;
  response: RecommendationResponse;
  timestamp: number;
  accessCount: number;
}

/**
 * Pattern recommendation engine that provides intelligent pattern suggestions
 * using machine learning algorithms, similarity analysis, and effectiveness scoring
 */
export class PatternRecommendationEngine {
  private readonly config: RecommendationEngineConfig;
  private readonly similarityDetector: PatternSimilarityDetector;
  private readonly rlManager: ReinforcementLearningManager;
  private readonly nlpAnalyzer: NLPAnalyzer;
  private readonly effectivenessScorer: PatternEffectivenessScorer;

  // Pattern database
  private readonly patternDatabase = new Map<string, PatternFeatureVector>();
  private readonly patternMetadata = new Map<string, any>();

  // Caching system
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    config: Partial<RecommendationEngineConfig>,
    similarityDetector: PatternSimilarityDetector,
    rlManager: ReinforcementLearningManager,
    nlpAnalyzer: NLPAnalyzer,
    effectivenessScorer: PatternEffectivenessScorer
  ) {
    this.config = {
      similarity: {
        enableSemanticSimilarity: true,
        enableBehavioralSimilarity: true,
        enableStructuralSimilarity: true,
        similarityThreshold: 0.6,
        ...config.similarity,
      },
      effectiveness: {
        enableEffectivenessScoring: true,
        minUsageCount: 3,
        timeDecayFactor: 0.95,
        ...config.effectiveness,
      },
      reinforcementLearning: {
        enableRLOptimization: true,
        explorationRate: 0.1,
        learningRate: 0.01,
        ...config.reinforcementLearning,
      },
      nlp: {
        enableContextAnalysis: true,
        enableIntentDetection: true,
        maxKeywords: 10,
        ...config.nlp,
      },
      caching: {
        enableCaching: true,
        cacheSize: 1000,
        cacheTTL: 60 * 60 * 1000, // 1 hour
        ...config.caching,
      },
    };

    this.similarityDetector = similarityDetector;
    this.rlManager = rlManager;
    this.nlpAnalyzer = nlpAnalyzer;
    this.effectivenessScorer = effectivenessScorer;
  }

  /**
   * Get pattern recommendations based on context and preferences
   */
  async getRecommendations(request: unknown): Promise<RecommendationResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = RecommendationRequestSchema.parse(request);

      // Check cache first
      if (this.config.caching.enableCaching) {
        const cached = this.getCachedRecommendation(validatedRequest);
        if (cached) {
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              cacheHit: true,
            },
          };
        }
      }

      // Analyze context using NLP
      const contextAnalysis = await this.analyzeContext(validatedRequest);

      // Get candidate patterns
      const candidates = await this.getCandidatePatterns(validatedRequest, contextAnalysis);

      // Score and rank patterns
      const scoredPatterns = await this.scorePatterns(
        candidates,
        validatedRequest,
        contextAnalysis
      );

      // Apply reinforcement learning optimization
      const optimizedPatterns = await this.applyRLOptimization(scoredPatterns, validatedRequest);

      // Generate final recommendations
      const recommendations = this.generateRecommendations(
        optimizedPatterns,
        validatedRequest,
        contextAnalysis
      );

      const response: RecommendationResponse = {
        recommendations: recommendations.slice(0, validatedRequest.preferences.maxRecommendations),
        totalPatterns: this.patternDatabase.size,
        processingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(recommendations),
        reasoning: this.generateReasoningExplanation(recommendations, contextAnalysis),
        metadata: {
          algorithmsUsed: this.getUsedAlgorithms(),
          contextAnalysis: {
            complexity: contextAnalysis.complexity,
            domain: contextAnalysis.domain,
            intent: contextAnalysis.intent,
          },
          cacheHit: false,
        },
      };

      // Cache the result
      if (this.config.caching.enableCaching) {
        this.setCachedRecommendation(validatedRequest, response);
      }

      return response;
    } catch (error) {
      throw new Error(
        `Recommendation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze context using NLP
   */
  private async analyzeContext(request: RecommendationRequest): Promise<{
    complexity: number;
    domain: string[];
    intent: string;
    embedding: number[];
  }> {
    if (!this.config.nlp.enableContextAnalysis) {
      return {
        complexity: request.context.codebaseComplexity,
        domain: ['general'],
        intent: 'improve',
        embedding: new Array(128).fill(0),
      };
    }

    const analysis = await this.nlpAnalyzer.analyzeText(
      'context-analysis',
      request.currentTask.description
    );

    return {
      complexity: analysis.extractedFeatures.complexity,
      domain: analysis.extractedFeatures.domain,
      intent: analysis.extractedFeatures.intent,
      embedding: analysis.semanticEmbedding,
    };
  }

  /**
   * Get candidate patterns based on context
   */
  private async getCandidatePatterns(
    request: RecommendationRequest,
    contextAnalysis: { complexity: number; domain: string[]; intent: string; embedding: number[] }
  ): Promise<PatternFeatureVector[]> {
    const candidates: PatternFeatureVector[] = [];

    // Create a feature vector for the context
    const contextVector: PatternFeatureVector = {
      patternId: 'context',
      features: contextAnalysis.embedding,
      metadata: {
        usageCount: 0,
        complexity: contextAnalysis.complexity,
        language: request.context.projectType,
        riskLevel: 'low' as const,
        category: 'context',
        transformationType: 'template' as const,
        successRate: 0,
      },
    };

    // Find similar patterns using similarity detection
    for (const [_patternId, pattern] of this.patternDatabase) {
      const similarity = await this.similarityDetector.calculateSimilarity(contextVector, pattern);

      if (similarity.similarity >= this.config.similarity.similarityThreshold) {
        candidates.push(pattern);
      }
    }

    return candidates;
  }

  /**
   * Calculate similarity between context and pattern
   */
  private calculateContextSimilarity(
    contextAnalysis: { complexity: number; domain: string[]; intent: string; embedding: number[] },
    pattern: PatternFeatureVector
  ): number {
    let score = 0;

    // Complexity similarity
    const complexityDiff = Math.abs(contextAnalysis.complexity - pattern.metadata.complexity);
    score += Math.max(0, 1 - complexityDiff / 10) * 0.3;

    // Domain overlap - simplified since metadata doesn't have domain field
    score += 0.2; // Base score for domain compatibility

    // Skip keyword overlap for now since metadata doesn't have keywords field
    // This will be implemented when pattern metadata is enhanced with keywords

    return Math.min(1, score);
  }

  /**
   * Score patterns based on multiple criteria
   */
  private async scorePatterns(
    candidates: PatternFeatureVector[],
    request: RecommendationRequest,
    contextAnalysis: { complexity: number; domain: string[]; intent: string; embedding: number[] }
  ): Promise<
    Array<{ pattern: PatternFeatureVector; score: number; effectiveness: EffectivenessScore }>
  > {
    const scoredPatterns: Array<{
      pattern: PatternFeatureVector;
      score: number;
      effectiveness: EffectivenessScore;
    }> = [];

    for (const pattern of candidates) {
      let score = 0;

      // Context similarity
      const contextSimilarity = this.calculateContextSimilarity(contextAnalysis, pattern);
      score += contextSimilarity * 0.4;

      // Effectiveness scoring
      let effectiveness: EffectivenessScore;
      if (this.config.effectiveness.enableEffectivenessScoring) {
        effectiveness = this.effectivenessScorer.calculateEffectiveness(pattern.patternId);
        score += effectiveness.overallScore * 0.4;
      } else {
        effectiveness = {
          patternId: pattern.patternId,
          overallScore: 0.5,
          confidence: 0.5,
          breakdown: {
            successRate: { score: 0.5, weight: 0.3, rawValue: 0.5, sampleSize: 0 },
            performance: { score: 0.5, weight: 0.2, rawValue: 0.5, percentile: 50 },
            userSatisfaction: { score: 0.5, weight: 0.2, rawValue: 0.5, sampleSize: 0 },
            complexity: { score: 0.5, weight: 0.1, reduction: 0, consistency: 0.5 },
            reusability: { score: 0.5, weight: 0.1, usageFrequency: 0, diversityScore: 0.5 },
            maintainability: { score: 0.5, weight: 0.1, updateFrequency: 0, stabilityScore: 0.5 },
          },
          metadata: {
            lastUpdated: Date.now(),
            totalUsages: 0,
            dataQuality: 'low' as const,
            trends: { improving: false, stable: true, declining: false },
            recommendedActions: [],
          },
        };
      }

      // User preferences
      score += this.calculatePreferenceScore(pattern, request.preferences) * 0.2;

      scoredPatterns.push({ pattern, score, effectiveness });
    }

    return scoredPatterns.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate preference-based score
   */
  private calculatePreferenceScore(
    pattern: PatternFeatureVector,
    preferences: RecommendationRequest['preferences']
  ): number {
    let score = 0;

    // Risk tolerance
    const riskMapping = { low: 0.2, medium: 0.5, high: 0.8 };
    const patternRisk = riskMapping[pattern.metadata.riskLevel];
    const preferenceRisk = riskMapping[preferences.riskTolerance];
    score += 1 - Math.abs(patternRisk - preferenceRisk);

    return Math.min(1, score);
  }

  /**
   * Apply reinforcement learning optimization
   */
  private async applyRLOptimization(
    scoredPatterns: Array<{
      pattern: PatternFeatureVector;
      score: number;
      effectiveness: EffectivenessScore;
    }>,
    request: RecommendationRequest
  ): Promise<
    Array<{ pattern: PatternFeatureVector; score: number; effectiveness: EffectivenessScore }>
  > {
    if (!this.config.reinforcementLearning.enableRLOptimization) {
      return scoredPatterns;
    }

    // Create RL state from request context
    const state: RLState = {
      patternId: 'recommendation-context',
      context: {
        projectType: request.context.projectType,
        codebaseComplexity: request.context.codebaseComplexity,
        teamExperience: request.context.teamExperience,
        timeConstraints: request.context.timeConstraints,
        qualityRequirements:
          request.context.qualityRequirements === 'medium'
            ? 'standard'
            : request.context.qualityRequirements === 'low'
              ? 'basic'
              : request.context.qualityRequirements,
      },
      currentMetrics: {
        patternId: 'recommendation-context',
        successRate: 0.5,
        sampleSize: 0,
        userSatisfaction: 0.5,
        lastUpdated: Date.now(),
        averageExecutionTime: 100,
        complexityReduction: 0,
        errorRate: 0,
        applicabilityScore: 0.5,
        confidenceInterval: {
          lower: 0.4,
          upper: 0.6,
          confidence: 0.95,
        },
        trendDirection: 'stable' as const,
      },
      availableActions: [
        'increase_priority',
        'decrease_priority',
        'modify_pattern',
        'combine_patterns',
        'split_pattern',
        'deprecate_pattern',
        'promote_pattern',
      ],
    };

    // Get RL recommendations - using selectAction as the available method
    const rlAction = await this.rlManager.selectAction(state);
    const rlRecommendations = [rlAction]; // Convert single action to array for consistency

    // Adjust scores based on RL recommendations
    for (const scored of scoredPatterns) {
      if (rlRecommendations.some((rec) => rec.action === 'promote_pattern')) {
        scored.score *= 1.2; // Boost RL-recommended patterns
      }
    }

    return scoredPatterns.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate final recommendations
   */
  private generateRecommendations(
    scoredPatterns: Array<{
      pattern: PatternFeatureVector;
      score: number;
      effectiveness: EffectivenessScore;
    }>,
    _request: RecommendationRequest,
    contextAnalysis: { complexity: number; domain: string[]; intent: string; embedding: number[] }
  ): PatternRecommendation[] {
    return scoredPatterns.map(({ pattern, score, effectiveness }) => {
      const _metadata = this.patternMetadata.get(pattern.patternId) || {};

      return {
        patternId: pattern.patternId,
        confidence: score,
        relevanceScore: this.calculateContextSimilarity(contextAnalysis, pattern),
        effectivenessScore: effectiveness.overallScore,
        riskLevel: pattern.metadata.riskLevel,
        reasoning: this.generatePatternReasoning(pattern, score, effectiveness),
        expectedBenefits: this.generateExpectedBenefits(pattern, effectiveness),
        potentialRisks: this.generatePotentialRisks(pattern),
        estimatedEffort: this.estimateEffort(pattern),
        metadata: {
          similarityScore: score,
          usageCount: pattern.metadata.usageCount,
          successRate: pattern.metadata.successRate,
          lastUsed: pattern.metadata.lastUsed,
        },
      };
    });
  }

  /**
   * Generate reasoning for pattern recommendation
   */
  private generatePatternReasoning(
    pattern: PatternFeatureVector,
    score: number,
    effectiveness: EffectivenessScore
  ): string {
    const reasons: string[] = [];

    if (score > 0.8) {
      reasons.push('High similarity to current context');
    }

    if (effectiveness.overallScore > 0.7) {
      reasons.push('Strong historical effectiveness');
    }

    if (pattern.metadata.successRate > 0.8) {
      reasons.push('High success rate in similar projects');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'General applicability to the context';
  }

  /**
   * Generate expected benefits
   */
  private generateExpectedBenefits(
    _pattern: PatternFeatureVector,
    effectiveness: EffectivenessScore
  ): string[] {
    const benefits: string[] = [];

    if (effectiveness.breakdown.performance.score > 0.7) {
      benefits.push('Improved performance');
    }

    if (effectiveness.breakdown.maintainability.score > 0.7) {
      benefits.push('Better maintainability');
    }

    if (effectiveness.breakdown.complexity.score > 0.7) {
      benefits.push('Reduced complexity');
    }

    return benefits.length > 0 ? benefits : ['Code quality improvement'];
  }

  /**
   * Generate potential risks
   */
  private generatePotentialRisks(pattern: PatternFeatureVector): string[] {
    const risks: string[] = [];

    if (pattern.metadata.riskLevel === 'high') {
      risks.push('May require significant refactoring');
    }

    if (pattern.metadata.complexity > 7) {
      risks.push('High implementation complexity');
    }

    return risks.length > 0 ? risks : ['Minimal risk'];
  }

  /**
   * Estimate implementation effort
   */
  private estimateEffort(pattern: PatternFeatureVector): 'low' | 'medium' | 'high' {
    if (pattern.metadata.complexity <= 3) return 'low';
    if (pattern.metadata.complexity <= 7) return 'medium';
    return 'high';
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(recommendations: PatternRecommendation[]): number {
    if (recommendations.length === 0) return 0;

    const avgConfidence =
      recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
    return Math.min(1, avgConfidence);
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoningExplanation(
    recommendations: PatternRecommendation[],
    contextAnalysis: { complexity: number; domain: string[]; intent: string; embedding: number[] }
  ): string {
    if (recommendations.length === 0) {
      return 'No suitable patterns found for the given context';
    }

    const topRec = recommendations[0];
    if (!topRec) {
      return 'No suitable patterns found for the given context';
    }
    return `Recommended ${recommendations.length} patterns based on ${contextAnalysis.intent} intent and ${contextAnalysis.complexity}/10 complexity. Top recommendation: ${topRec.patternId} with ${(topRec.confidence * 100).toFixed(1)}% confidence.`;
  }

  /**
   * Get list of algorithms used
   */
  private getUsedAlgorithms(): string[] {
    const algorithms = ['similarity-detection'];

    if (this.config.effectiveness.enableEffectivenessScoring) {
      algorithms.push('effectiveness-scoring');
    }

    if (this.config.reinforcementLearning.enableRLOptimization) {
      algorithms.push('reinforcement-learning');
    }

    if (this.config.nlp.enableContextAnalysis) {
      algorithms.push('nlp-analysis');
    }

    return algorithms;
  }

  /**
   * Cache management methods
   */
  private getCachedRecommendation(request: RecommendationRequest): RecommendationResponse | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > this.config.caching.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access count
    entry.accessCount++;

    return entry.response;
  }

  /**
   * Cache recommendation result
   */
  private setCachedRecommendation(
    request: RecommendationRequest,
    response: RecommendationResponse
  ): void {
    const key = this.generateCacheKey(request);

    // Clean up old entries if cache is full
    if (this.cache.size >= this.config.caching.cacheSize) {
      this.cleanupCache();
    }

    this.cache.set(key, {
      request,
      response,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: RecommendationRequest): string {
    // Create a simplified hash of the request
    const keyData = {
      context: request.context,
      preferences: request.preferences,
      userHistory: request.userHistory,
    };

    return JSON.stringify(keyData);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const entries = Array.from(this.cache.entries());

    // Sort by access count and timestamp (least used first)
    entries.sort(([, a], [, b]) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.timestamp - b.timestamp;
    });

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }

  /**
   * Add pattern to database
   */
  addPattern(pattern: PatternFeatureVector, metadata: any): void {
    this.patternDatabase.set(pattern.patternId, pattern);
    this.patternMetadata.set(pattern.patternId, metadata);
  }

  /**
   * Remove pattern from database
   */
  removePattern(patternId: string): void {
    this.patternDatabase.delete(patternId);
    this.patternMetadata.delete(patternId);
  }

  /**
   * Update pattern metadata
   */
  updatePatternMetadata(patternId: string, metadata: any): void {
    if (this.patternDatabase.has(patternId)) {
      this.patternMetadata.set(patternId, metadata);
    }
  }

  /**
   * Get pattern database statistics
   */
  getDatabaseStats(): {
    totalPatterns: number;
    languageDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    cacheStats: {
      size: number;
      hitRate: number;
    };
  } {
    const totalPatterns = this.patternDatabase.size;
    const languageDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};

    for (const metadata of this.patternMetadata.values()) {
      const language = metadata.language || 'unknown';
      const category = metadata.category || 'unknown';

      languageDistribution[language] = (languageDistribution[language] || 0) + 1;
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    }

    return {
      totalPatterns,
      languageDistribution,
      categoryDistribution,
      cacheStats: {
        size: this.cache.size,
        hitRate: 0, // Would need to track hits/misses for real hit rate
      },
    };
  }
}

/**
 * Create a pattern recommendation engine with default configuration
 */
export function createPatternRecommendationEngine(
  config: Partial<RecommendationEngineConfig>,
  similarityDetector: PatternSimilarityDetector,
  rlManager: ReinforcementLearningManager,
  nlpAnalyzer: NLPAnalyzer,
  effectivenessScorer: PatternEffectivenessScorer
): PatternRecommendationEngine {
  return new PatternRecommendationEngine(
    config,
    similarityDetector,
    rlManager,
    nlpAnalyzer,
    effectivenessScorer
  );
}
