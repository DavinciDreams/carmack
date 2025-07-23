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

// Export clustering functionality (excluding conflicting ClusteringConfig)
export {
  DBSCANClusterer,
  HierarchicalClusterer,
  KMeansClusterer,
  PatternClusterer,
} from './clustering.ts';
export * from './effectiveness-scorer.ts';
export * from './nlp.ts';
// Export recommendation engine (excluding conflicting types)
export {
  createPatternRecommendationEngine,
  PatternRecommendationEngine,
  type RecommendationEngineConfig,
  type RecommendationRequest,
  RecommendationRequestSchema,
  type RecommendationResponse,
  RecommendationResponseSchema,
} from './recommendation-engine.ts';
export * from './reinforcement.ts';
export * from './similarity.ts';
// Export other modules without conflicts
export * from './statistics.ts';
// Export core types first
export * from './types.ts';
