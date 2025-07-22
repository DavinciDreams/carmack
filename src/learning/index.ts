/**
 * Pattern Learning Machine Learning Algorithms
 *
 * This module provides real machine learning algorithms for intelligent pattern discovery,
 * effectiveness scoring, and optimization in the Carmack Coder system.
 *
 * Key Features:
 * - Clustering algorithms for pattern categorization
 * - Statistical analysis for pattern effectiveness
 * - Pattern similarity detection
 * - Reinforcement learning for optimization
 * - Natural language processing for pattern analysis
 */

// Export core types first
export * from './types.ts';

// Export clustering functionality (excluding conflicting ClusteringConfig)
export {
  KMeansClusterer,
  DBSCANClusterer,
  HierarchicalClusterer,
  PatternClusterer,
} from './clustering.ts';

// Export other modules without conflicts
export * from './statistics.ts';
export * from './similarity.ts';
export * from './reinforcement.ts';
export * from './nlp.ts';
export * from './effectiveness-scorer.ts';

// Export recommendation engine (excluding conflicting types)
export {
  PatternRecommendationEngine,
  createPatternRecommendationEngine,
  RecommendationRequestSchema,
  RecommendationResponseSchema,
  type RecommendationRequest,
  type RecommendationResponse,
  type RecommendationEngineConfig,
} from './recommendation-engine.ts';
