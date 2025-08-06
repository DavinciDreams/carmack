import { z } from 'zod';

/**
 * Machine Learning Types for Pattern Learning System
 */

// Vector representation for ML algorithms
export const VectorSchema = z.array(z.number());
export type Vector = z.infer<typeof VectorSchema>;

// Pattern feature vector for ML analysis
export const PatternFeatureVectorSchema = z.object({
  patternId: z.string(),
  features: VectorSchema,
  metadata: z.object({
    language: z.string(),
    complexity: z.number(),
    riskLevel: z.enum(['low', 'medium', 'high']),
    category: z.string(),
    transformationType: z.enum(['template', 'ast', 'llm']),
    usageCount: z.number().default(0),
    successRate: z.number().min(0).max(1).default(0),
    lastUsed: z.number().optional(),
  }),
});

// Cluster result for pattern categorization
export const ClusterResultSchema = z.object({
  clusterId: z.number(),
  centroid: VectorSchema,
  patterns: z.array(z.string()), // pattern IDs
  cohesion: z.number().min(0).max(1), // how tightly clustered
  size: z.number().min(0),
  label: z.string().optional(), // human-readable cluster name
});

// Pattern similarity result
export const PatternSimilaritySchema = z.object({
  patternId1: z.string(),
  patternId2: z.string(),
  similarity: z.number().min(0).max(1),
  similarityType: z.enum(['syntactic', 'semantic', 'behavioral', 'contextual']),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
});

// Effectiveness metrics for pattern scoring
export const EffectivenessMetricsSchema = z.object({
  patternId: z.string(),
  successRate: z.number().min(0).max(1),
  averageExecutionTime: z.number().min(0),
  complexityReduction: z.number(), // can be negative if complexity increases
  errorRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(0).max(10),
  applicabilityScore: z.number().min(0).max(1),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    confidence: z.number().min(0).max(1).default(0.95),
  }),
  sampleSize: z.number().min(0),
  lastUpdated: z.number(),
  trendDirection: z.enum(['improving', 'stable', 'declining']),
});

// Reinforcement learning state for pattern optimization
export const RLStateSchema = z.object({
  patternId: z.string(),
  context: z.object({
    codebaseComplexity: z.number(),
    projectType: z.string(),
    teamExperience: z.enum(['junior', 'mid', 'senior', 'expert']),
    timeConstraints: z.enum(['tight', 'moderate', 'flexible']),
    qualityRequirements: z.enum(['basic', 'standard', 'high', 'critical']),
  }),
  currentMetrics: EffectivenessMetricsSchema,
  availableActions: z.array(
    z.enum([
      'increase_priority',
      'decrease_priority',
      'modify_pattern',
      'combine_patterns',
      'split_pattern',
      'deprecate_pattern',
      'promote_pattern',
    ])
  ),
});

// Reinforcement learning action and reward
export const RLActionSchema = z.object({
  action: z.enum([
    'increase_priority',
    'decrease_priority',
    'modify_pattern',
    'combine_patterns',
    'split_pattern',
    'deprecate_pattern',
    'promote_pattern',
  ]),
  parameters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1),
});

export const RLRewardSchema = z.object({
  immediate: z.number(),
  delayed: z.number().optional(),
  total: z.number(),
  components: z.object({
    successRateImprovement: z.number(),
    performanceGain: z.number(),
    userSatisfactionDelta: z.number(),
    complexityReduction: z.number(),
  }),
});

// Natural Language Processing results for pattern analysis
export const NLPAnalysisSchema = z.object({
  patternId: z.string(),
  description: z.string(),
  extractedFeatures: z.object({
    keywords: z.array(z.string()),
    sentiment: z.number().min(-1).max(1),
    complexity: z.number().min(0).max(10),
    intent: z.enum(['refactor', 'optimize', 'modernize', 'fix', 'enhance']),
    domain: z.array(z.string()), // e.g., ['frontend', 'typescript', 'react']
  }),
  semanticEmbedding: VectorSchema,
  relatedConcepts: z.array(
    z.object({
      concept: z.string(),
      relevance: z.number().min(0).max(1),
    })
  ),
});

// Pattern recommendation with confidence and reasoning
export const PatternRecommendationSchema = z.object({
  patternId: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()),
  expectedBenefit: z.object({
    successRateLift: z.number(),
    performanceImprovement: z.number(),
    complexityReduction: z.number(),
  }),
  prerequisites: z.array(z.string()).optional(),
  alternatives: z.array(z.string()).optional(),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
    mitigation: z.array(z.string()),
  }),
});

// Learning algorithm configuration
export const LearningConfigSchema = z.object({
  clustering: z.object({
    algorithm: z.enum(['kmeans', 'dbscan', 'hierarchical']),
    parameters: z.record(z.any()),
    minClusterSize: z.number().min(1).default(3),
    maxClusters: z.number().min(1).default(20),
  }),
  similarity: z.object({
    threshold: z.number().min(0).max(1).default(0.7),
    algorithms: z.array(z.enum(['cosine', 'euclidean', 'jaccard', 'semantic'])),
    weights: z.record(z.number()).optional(),
  }),
  reinforcement: z.object({
    learningRate: z.number().min(0).max(1).default(0.1),
    discountFactor: z.number().min(0).max(1).default(0.9),
    explorationRate: z.number().min(0).max(1).default(0.1),
    rewardFunction: z.enum(['linear', 'exponential', 'logarithmic']).default('linear'),
  }),
  nlp: z.object({
    embeddingModel: z.string().default('sentence-transformers'),
    maxTokens: z.number().min(1).default(512),
    languages: z.array(z.string()).default(['en']),
  }),
});

// Training data for machine learning models
export const TrainingDataSchema = z.object({
  patterns: z.array(PatternFeatureVectorSchema),
  transformations: z.array(
    z.object({
      id: z.string(),
      beforeCode: z.string(),
      afterCode: z.string(),
      patternIds: z.array(z.string()),
      success: z.boolean(),
      metrics: EffectivenessMetricsSchema.partial(),
      context: z.record(z.any()),
      timestamp: z.number(),
    })
  ),
  feedback: z.array(
    z.object({
      patternId: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
      userId: z.string().optional(),
      timestamp: z.number(),
    })
  ),
});

// Model performance metrics
export const ModelPerformanceSchema = z.object({
  modelType: z.enum(['clustering', 'similarity', 'reinforcement', 'nlp', 'recommendation']),
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1Score: z.number().min(0).max(1),
  trainingTime: z.number().min(0),
  inferenceTime: z.number().min(0),
  memoryUsage: z.number().min(0),
  lastTrained: z.number(),
  datasetSize: z.number().min(0),
  crossValidationScore: z.number().min(0).max(1).optional(),
});

// Similarity detection types
export const SimilarityMetricsSchema = z
  .object({
    cosine: z.number().min(0).max(1),
    semantic: z.number().min(0).max(1),
    behavioral: z.number().min(0).max(1),
    structural: z.number().min(0).max(1),
  })
  .strict();

export const SimilarityResultSchema = z
  .object({
    similarity: z.number().min(0).max(1),
    metrics: SimilarityMetricsSchema.optional(),
    confidence: z.number().min(0).max(1),
    algorithm: z.enum(['cosine', 'semantic', 'behavioral', 'structural', 'hybrid']),
    computationTime: z.number().int().min(0),
  })
  .strict();

export const PatternSimilarityConfigSchema = z
  .object({
    algorithm: z
      .enum(['cosine', 'semantic', 'behavioral', 'structural', 'hybrid'])
      .default('hybrid'),
    threshold: z.number().min(0).max(1).default(0.7),
    weights: z
      .object({
        cosine: z.number().min(0).max(1).default(0.3),
        semantic: z.number().min(0).max(1).default(0.3),
        behavioral: z.number().min(0).max(1).default(0.2),
        structural: z.number().min(0).max(1).default(0.2),
      })
      .default({}),
    enableCaching: z.boolean().default(true),
    maxCacheSize: z.number().int().positive().default(1000),
  })
  .strict();

// Clustering configuration
export const ClusteringConfigSchema = z
  .object({
    algorithm: z.enum(['kmeans', 'dbscan', 'hierarchical']).default('kmeans'),
    k: z.number().int().min(1).optional(), // for k-means
    eps: z.number().min(0).optional(), // for DBSCAN
    minPts: z.number().int().min(1).optional(), // for DBSCAN
    linkage: z.enum(['single', 'complete', 'average']).optional(), // for hierarchical
    maxIterations: z.number().int().min(1).default(100),
    tolerance: z.number().min(0).default(1e-4),
  })
  .strict();

// Export all types
export type PatternFeatureVector = z.infer<typeof PatternFeatureVectorSchema>;
export type ClusterResult = z.infer<typeof ClusterResultSchema>;
export type PatternSimilarity = z.infer<typeof PatternSimilaritySchema>;
export type EffectivenessMetrics = z.infer<typeof EffectivenessMetricsSchema>;
export type RLState = z.infer<typeof RLStateSchema>;
export type RLAction = z.infer<typeof RLActionSchema>;
export type RLReward = z.infer<typeof RLRewardSchema>;
export type NLPAnalysis = z.infer<typeof NLPAnalysisSchema>;
export type PatternRecommendation = z.infer<typeof PatternRecommendationSchema>;
export type LearningConfig = z.infer<typeof LearningConfigSchema>;
export type TrainingData = z.infer<typeof TrainingDataSchema>;
export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;
export type SimilarityMetrics = z.infer<typeof SimilarityMetricsSchema>;
export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;
export type PatternSimilarityConfig = z.infer<typeof PatternSimilarityConfigSchema>;
export type ClusteringConfig = z.infer<typeof ClusteringConfigSchema>;

// Utility functions for vector operations
export class VectorUtils {
  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  static euclideanDistance(a: Vector, b: Vector): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0));
  }

  /**
   * Normalize a vector to unit length
   */
  static normalize(vector: Vector): Vector {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return vector.slice(); // Return copy of zero vector
    }
    return vector.map((val) => val / magnitude);
  }

  /**
   * Calculate the centroid of a set of vectors
   */
  static centroid(vectors: Vector[]): Vector {
    if (vectors.length === 0) {
      return [];
    }

vectors[0]?.length
    const centroid = new Array(dimensions).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += vector[i];
      }
    }

    return centroid.map((val) => val / vectors.length);
  }

  /**
   * Add two vectors element-wise
   */
  static add(a: Vector, b: Vector): Vector {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    return a.map((val, i) => val + (b[i] ?? 0));
  }

  /**
   * Subtract two vectors element-wise
   */
  static subtract(a: Vector, b: Vector): Vector {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    return a.map((val, i) => val - (b[i] ?? 0));
  }

  /**
   * Multiply vector by scalar
   */
  static scale(vector: Vector, scalar: number): Vector {
    return vector.map((val) => val * scalar);
  }
}