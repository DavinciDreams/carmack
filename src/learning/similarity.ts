import { z } from 'zod';
import type {
  PatternFeatureVector,
  SimilarityMetrics,
  SimilarityResult,
  PatternSimilarityConfig,
} from './types.ts';
import { VectorUtils, PatternSimilarityConfigSchema } from './types.ts';

/**
 * Pattern Similarity Detection System
 *
 * Implements multiple similarity algorithms for pattern comparison:
 * - Cosine similarity for feature vectors
 * - Semantic similarity using embeddings
 * - Behavioral similarity based on transformation outcomes
 * - Structural similarity for AST patterns
 */

/**
 * Cosine Similarity Calculator
 * Computes cosine similarity between pattern feature vectors
 */
class CosineSimilarityCalculator {
  /**
   * Calculate cosine similarity between two feature vectors
   */
  calculateSimilarity(vector1: PatternFeatureVector, vector2: PatternFeatureVector): number {
    // Ensure vectors have the same dimensionality
    const maxLength = Math.max(vector1.features.length, vector2.features.length);
    const v1 = this.padVector(vector1.features, maxLength);
    const v2 = this.padVector(vector2.features, maxLength);

    return VectorUtils.cosineSimilarity(v1, v2);
  }

  /**
   * Calculate similarity matrix for multiple patterns
   */
  calculateSimilarityMatrix(vectors: PatternFeatureVector[]): number[][] {
    const n = vectors.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i]![j] = 1.0;
        } else {
          const vec1 = vectors[i];
          const vec2 = vectors[j];
          if (vec1 && vec2) {
            const similarity = this.calculateSimilarity(vec1, vec2);
            matrix[i]![j] = similarity;
            matrix[j]![i] = similarity; // Symmetric matrix
          }
        }
      }
    }

    return matrix;
  }

  private padVector(vector: number[], targetLength: number): number[] {
    if (vector.length >= targetLength) {
      return vector.slice(0, targetLength);
    }
    return [...vector, ...Array(targetLength - vector.length).fill(0)];
  }
}

/**
 * Semantic Similarity Calculator
 * Uses text embeddings and semantic analysis for pattern comparison
 */
class SemanticSimilarityCalculator {
  private embeddingCache = new Map<string, number[]>();

  /**
   * Calculate semantic similarity between patterns based on their descriptions and code
   */
  async calculateSimilarity(
    pattern1: { description: string; code?: string },
    pattern2: { description: string; code?: string }
  ): Promise<number> {
    // Get embeddings for both patterns
    const embedding1 = await this.getEmbedding(pattern1);
    const embedding2 = await this.getEmbedding(pattern2);

    // Calculate cosine similarity between embeddings
    return VectorUtils.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Get semantic embedding for a pattern
   */
  private async getEmbedding(pattern: { description: string; code?: string }): Promise<number[]> {
    // Combine description and code for embedding
    const text = `${pattern.description} ${pattern.code || ''}`.trim();
    const cacheKey = this.hashText(text);

    // Check cache first
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate embedding (simplified implementation using text features)
    const embedding = this.generateTextEmbedding(text);

    // Cache the result
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Generate a simple text embedding based on text features
   * In a real implementation, this would use a pre-trained model like BERT or similar
   */
  private generateTextEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const features: number[] = [];

    // Feature 1: Text length (normalized)
    features.push(Math.min(text.length / 1000, 1.0));

    // Feature 2: Word count (normalized)
    features.push(Math.min(words.length / 100, 1.0));

    // Feature 3: Average word length
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    features.push(Math.min(avgWordLength / 10, 1.0));

    // Feature 4-13: Common programming keywords
    const keywords = [
      'function',
      'class',
      'const',
      'let',
      'var',
      'if',
      'for',
      'while',
      'return',
      'import',
    ];
    for (const keyword of keywords) {
      const count = (text.match(new RegExp(keyword, 'gi')) || []).length;
      features.push(Math.min(count / 10, 1.0));
    }

    // Feature 14-23: Code patterns
    const patterns = [
      /\{[^}]*\}/g,
      /\([^)]*\)/g,
      /\[[^\]]*\]/g,
      /=>/g,
      /\./g,
      /;/g,
      /:/g,
      /,/g,
      /\+/g,
      /-/g,
    ];
    for (const pattern of patterns) {
      const count = (text.match(pattern) || []).length;
      features.push(Math.min(count / 20, 1.0));
    }

    // Pad to fixed size (50 dimensions)
    while (features.length < 50) {
      features.push(0);
    }

    return features.slice(0, 50);
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

/**
 * Behavioral Similarity Calculator
 * Compares patterns based on their transformation outcomes and effectiveness
 */
class BehavioralSimilarityCalculator {
  /**
   * Calculate behavioral similarity based on transformation outcomes
   */
  calculateSimilarity(
    pattern1Metrics: { successRate: number; avgImprovement: number; complexity: number },
    pattern2Metrics: { successRate: number; avgImprovement: number; complexity: number }
  ): number {
    // Normalize metrics to [0, 1] range
    const successSim = 1 - Math.abs(pattern1Metrics.successRate - pattern2Metrics.successRate);
    const improvementSim =
      1 - Math.abs(pattern1Metrics.avgImprovement - pattern2Metrics.avgImprovement);
    const complexitySim =
      1 - Math.abs(pattern1Metrics.complexity - pattern2Metrics.complexity) / 100;

    // Weighted combination
    return successSim * 0.4 + improvementSim * 0.4 + complexitySim * 0.2;
  }

  /**
   * Calculate similarity based on usage patterns
   */
  calculateUsageSimilarity(
    pattern1Usage: { frequency: number; contexts: string[]; outcomes: number[] },
    pattern2Usage: { frequency: number; contexts: string[]; outcomes: number[] }
  ): number {
    // Frequency similarity
    const maxFreq = Math.max(pattern1Usage.frequency, pattern2Usage.frequency);
    const freqSim =
      maxFreq > 0 ? 1 - Math.abs(pattern1Usage.frequency - pattern2Usage.frequency) / maxFreq : 1;

    // Context overlap
    const contexts1 = new Set(pattern1Usage.contexts);
    const contexts2 = new Set(pattern2Usage.contexts);
    const intersection = new Set([...contexts1].filter((x) => contexts2.has(x)));
    const union = new Set([...contexts1, ...contexts2]);
    const contextSim = union.size > 0 ? intersection.size / union.size : 1;

    // Outcome correlation
    const outcomeSim = this.calculateOutcomeCorrelation(
      pattern1Usage.outcomes,
      pattern2Usage.outcomes
    );

    return freqSim * 0.3 + contextSim * 0.4 + outcomeSim * 0.3;
  }

  private calculateOutcomeCorrelation(outcomes1: number[], outcomes2: number[]): number {
    if (outcomes1.length === 0 || outcomes2.length === 0) {
      return 0;
    }

    const minLength = Math.min(outcomes1.length, outcomes2.length);
    const o1 = outcomes1.slice(0, minLength);
    const o2 = outcomes2.slice(0, minLength);

    // Calculate Pearson correlation
    const mean1 = o1.reduce((sum, val) => sum + val, 0) / o1.length;
    const mean2 = o2.reduce((sum, val) => sum + val, 0) / o2.length;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < minLength; i++) {
      const diff1 = (o1[i] ?? 0) - mean1;
      const diff2 = (o2[i] ?? 0) - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator > 0 ? Math.abs(numerator / denominator) : 0;
  }
}

/**
 * Structural Similarity Calculator
 * Compares AST patterns based on their structural properties
 */
class StructuralSimilarityCalculator {
  /**
   * Calculate structural similarity between AST patterns
   */
  calculateSimilarity(
    pattern1: { astPattern: string; nodeTypes: string[] },
    pattern2: { astPattern: string; nodeTypes: string[] }
  ): number {
    // Pattern string similarity
    const patternSim = this.calculateStringEditDistance(pattern1.astPattern, pattern2.astPattern);

    // Node type overlap
    const nodeTypeSim = this.calculateNodeTypeOverlap(pattern1.nodeTypes, pattern2.nodeTypes);

    // Structural complexity similarity
    const complexitySim = this.calculateComplexitySimilarity(
      pattern1.astPattern,
      pattern2.astPattern
    );

    return patternSim * 0.4 + nodeTypeSim * 0.3 + complexitySim * 0.3;
  }

  private calculateStringEditDistance(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1, // substitution
            matrix[i]![j - 1]! + 1, // insertion
            matrix[i - 1]![j]! + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  private calculateNodeTypeOverlap(types1: string[], types2: string[]): number {
    const set1 = new Set(types1);
    const set2 = new Set(types2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 1;
  }

  private calculateComplexitySimilarity(pattern1: string, pattern2: string): number {
    const complexity1 = this.calculatePatternComplexity(pattern1);
    const complexity2 = this.calculatePatternComplexity(pattern2);
    const maxComplexity = Math.max(complexity1, complexity2);

    return maxComplexity > 0 ? 1 - Math.abs(complexity1 - complexity2) / maxComplexity : 1;
  }

  private calculatePatternComplexity(pattern: string): number {
    // Count various complexity indicators
    const variables = (pattern.match(/\$\w+/g) || []).length;
    const wildcards = (pattern.match(/\$\$\$/g) || []).length;
    const brackets = (pattern.match(/[{}()[\]]/g) || []).length;
    const operators = (pattern.match(/[+\-*/%=<>!&|]/g) || []).length;

    return variables + wildcards * 2 + brackets * 0.5 + operators * 0.3;
  }
}

/**
 * Main Pattern Similarity Detector
 * Combines multiple similarity algorithms for comprehensive pattern comparison
 */
export class PatternSimilarityDetector {
  private cosineCalculator = new CosineSimilarityCalculator();
  private semanticCalculator = new SemanticSimilarityCalculator();
  private behavioralCalculator = new BehavioralSimilarityCalculator();
  private structuralCalculator = new StructuralSimilarityCalculator();
  private similarityCache = new Map<string, SimilarityResult>();
  private config: PatternSimilarityConfig;

  constructor(config: Partial<PatternSimilarityConfig> = {}) {
    // Validate and set defaults
    this.config = PatternSimilarityConfigSchema.parse(config);
  }

  /**
   * Calculate comprehensive similarity between two patterns
   */
  async calculateSimilarity(
    pattern1: any,
    pattern2: any,
    options: { includeMetrics?: boolean } = {}
  ): Promise<SimilarityResult> {
    const cacheKey = this.generateCacheKey(pattern1, pattern2);

    // Check cache if enabled
    if (this.config.enableCaching && this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const metrics: SimilarityMetrics = {
      cosine: 0,
      semantic: 0,
      behavioral: 0,
      structural: 0,
    };

    // Calculate individual similarity scores
    if (pattern1.featureVector && pattern2.featureVector) {
      metrics.cosine = this.cosineCalculator.calculateSimilarity(
        pattern1.featureVector,
        pattern2.featureVector
      );
    }

    if (pattern1.description && pattern2.description) {
      metrics.semantic = await this.semanticCalculator.calculateSimilarity(
        { description: pattern1.description, code: pattern1.code },
        { description: pattern2.description, code: pattern2.code }
      );
    }

    if (pattern1.metrics && pattern2.metrics) {
      metrics.behavioral = this.behavioralCalculator.calculateSimilarity(
        pattern1.metrics,
        pattern2.metrics
      );
    }

    if (pattern1.astPattern && pattern2.astPattern) {
      metrics.structural = this.structuralCalculator.calculateSimilarity(
        { astPattern: pattern1.astPattern, nodeTypes: pattern1.nodeTypes || [] },
        { astPattern: pattern2.astPattern, nodeTypes: pattern2.nodeTypes || [] }
      );
    }

    // Calculate weighted overall similarity
    const weights = this.config.weights || {};
    const overallSimilarity =
      metrics.cosine * (weights.cosine || 0.3) +
      metrics.semantic * (weights.semantic || 0.3) +
      metrics.behavioral * (weights.behavioral || 0.2) +
      metrics.structural * (weights.structural || 0.2);

    const result: SimilarityResult = {
      similarity: overallSimilarity,
      metrics: options.includeMetrics ? metrics : undefined,
      confidence: this.calculateConfidence(metrics),
      algorithm: this.config.algorithm || 'hybrid',
      computationTime: Date.now() - startTime,
    };

    // Cache the result
    if (this.config.enableCaching) {
      this.cacheResult(cacheKey, result);
    }

    return result;
  }

  /**
   * Find similar patterns from a collection
   */
  async findSimilarPatterns(
    targetPattern: any,
    candidatePatterns: any[],
    options: { limit?: number; threshold?: number } = {}
  ): Promise<Array<{ pattern: any; similarity: SimilarityResult }>> {
    const threshold = options.threshold || this.config.threshold || 0.7;
    const limit = options.limit || 10;

    const similarities: Array<{ pattern: any; similarity: SimilarityResult }> = [];

    for (const candidate of candidatePatterns) {
      const similarity = await this.calculateSimilarity(targetPattern, candidate);

      if (similarity.similarity >= threshold) {
        similarities.push({ pattern: candidate, similarity });
      }
    }

    // Sort by similarity score (descending)
    similarities.sort((a, b) => b.similarity.similarity - a.similarity.similarity);

    return similarities.slice(0, limit);
  }

  /**
   * Calculate similarity matrix for a collection of patterns
   */
  async calculateSimilarityMatrix(patterns: any[]): Promise<number[][]> {
    const n = patterns.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i]![j] = 1.0;
        } else {
          const pattern1 = patterns[i];
          const pattern2 = patterns[j];
          if (pattern1 && pattern2) {
            const result = await this.calculateSimilarity(pattern1, pattern2);
            matrix[i]![j] = result.similarity;
            matrix[j]![i] = result.similarity; // Symmetric matrix
          }
        }
      }
    }

    return matrix;
  }

  private calculateConfidence(metrics: SimilarityMetrics): number {
    // Calculate confidence based on consistency of metrics
    const values = [metrics.cosine, metrics.semantic, metrics.behavioral, metrics.structural];
    const validValues = values.filter((v) => v > 0);

    if (validValues.length === 0) return 0;
    if (validValues.length === 1) return 0.5;

    const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const variance =
      validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validValues.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher confidence
    return Math.max(0, 1 - stdDev * 2);
  }

  private generateCacheKey(pattern1: any, pattern2: any): string {
    const id1 = pattern1.id || JSON.stringify(pattern1).slice(0, 50);
    const id2 = pattern2.id || JSON.stringify(pattern2).slice(0, 50);
    return `${id1}:${id2}`;
  }

  private cacheResult(key: string, result: SimilarityResult): void {
    const maxSize = this.config.maxCacheSize || 1000;

    if (this.similarityCache.size >= maxSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.similarityCache.keys().next().value;
      if (firstKey) {
        this.similarityCache.delete(firstKey);
      }
    }

    this.similarityCache.set(key, result);
  }

  /**
   * Clear the similarity cache
   */
  clearCache(): void {
    this.similarityCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.similarityCache.size,
      maxSize: this.config.maxCacheSize || 1000,
    };
  }
}

// Export factory function for easy instantiation
export function createPatternSimilarityDetector(
  config?: PatternSimilarityConfig
): PatternSimilarityDetector {
  return new PatternSimilarityDetector(config);
}

// Export individual calculators for specialized use cases
export {
  CosineSimilarityCalculator,
  SemanticSimilarityCalculator,
  BehavioralSimilarityCalculator,
  StructuralSimilarityCalculator,
};
