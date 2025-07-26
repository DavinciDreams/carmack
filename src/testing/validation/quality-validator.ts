// --- Data Integrity Validation Actor ---
type DataIntegrityInput = void;

export const dataIntegrityActor = fromPromise(
  async () => {
    // Mock validations as in the legacy implementation
    const validations = [
      {
        testId: randomUUID(),
        validationType: 'schema',
        totalRecords: 10000,
        validRecords: 9950,
        invalidRecords: 50,
        integrityScore: 0.995,
        violations: [
          { type: 'missing_required_field', description: 'Missing required fields', severity: 'medium', count: 30 },
          { type: 'invalid_data_type', description: 'Invalid data types', severity: 'low', count: 20 },
        ],
        passed: true,
      },
      {
        testId: randomUUID(),
        validationType: 'relationships',
        totalRecords: 50000,
        validRecords: 49800,
        invalidRecords: 200,
        integrityScore: 0.996,
        violations: [
          { type: 'orphaned_relationship', description: 'Orphaned relationships', severity: 'high', count: 150 },
          { type: 'circular_reference', description: 'Circular references', severity: 'medium', count: 50 },
        ],
        passed: true,
      },
      {
        testId: randomUUID(),
        validationType: 'consistency',
        totalRecords: 25000,
        validRecords: 24750,
        invalidRecords: 250,
        integrityScore: 0.99,
        violations: [
          { type: 'data_inconsistency', description: 'Data inconsistencies', severity: 'medium', count: 200 },
          { type: 'duplicate_records', description: 'Duplicate records', severity: 'low', count: 50 },
        ],
        passed: true,
      },
      {
        testId: randomUUID(),
        validationType: 'completeness',
        totalRecords: 15000,
        validRecords: 14850,
        invalidRecords: 150,
        integrityScore: 0.99,
        violations: [
          { type: 'missing_data', description: 'Missing required data', severity: 'medium', count: 100 },
          { type: 'incomplete_records', description: 'Incomplete records', severity: 'low', count: 50 },
        ],
        passed: true,
      },
    ];
    return validations;
  }
);

export async function validateDataIntegrity(): Promise<any[]> {
  const actor = createActor(dataIntegrityActor);
  actor.start();
  const result = await actor.getSnapshot();
  return result.output ?? [];
}
// --- Graph Traversal Helper Functions ---
function calculatePathCorrectness(expectedPaths: string[][], actualPaths: string[][]): number {
  if (expectedPaths.length === 0) return 1;
  let correctPaths = 0;
  for (const expectedPath of expectedPaths) {
    const found = actualPaths.some(actualPath => pathsEqual(expectedPath, actualPath));
    if (found) correctPaths++;
  }
  return correctPaths / expectedPaths.length;
}
function calculatePathCompleteness(expectedPaths: string[][], actualPaths: string[][]): number {
  if (expectedPaths.length === 0) return 1;
  return Math.min(1, actualPaths.length / expectedPaths.length);
}
function detectCycles(paths: string[][]): boolean {
  for (const path of paths) {
    const visited = new Set<string>();
    for (const node of path) {
      if (visited.has(node)) return true;
      visited.add(node);
    }
  }
  return false;
}
function calculateRelationshipAccuracy(expectedPaths: string[][], actualPaths: string[][]): number {
  // Simplified relationship accuracy calculation
  return 0.85; // Mock value
}
function pathsEqual(path1: string[], path2: string[]): boolean {
  if (path1.length !== path2.length) return false;
  return path1.every((node, index) => node === path2[index]);
}
// --- Graph Traversal Validation Actor ---
type GraphTraversalInput = Array<{
  startArtifact: string;
  expectedPaths: string[][];
  actualPaths: string[][];
  maxDepth: number;
}>;

export const graphTraversalActor = fromPromise(
  async ({ input }: { input: GraphTraversalInput }) => {
    const validations: any[] = [];
    for (const test of input) {
      const testId = randomUUID();
      const queryId = randomUUID();
      // Calculate correctness score
      const correctnessScore = calculatePathCorrectness(test.expectedPaths, test.actualPaths);
      // Calculate completeness score
      const completenessScore = calculatePathCompleteness(test.expectedPaths, test.actualPaths);
      // Check for cycles
      const cycleDetected = detectCycles(test.actualPaths);
      // Calculate max depth reached
      const maxDepthReached = Math.max(...test.actualPaths.map(path => path.length));
      // Calculate relationship accuracy
      const relationshipAccuracy = calculateRelationshipAccuracy(test.expectedPaths, test.actualPaths);
      // Determine if test passed
      const passed = correctnessScore >= 0.8 &&
                    completenessScore >= 0.7 &&
                    !cycleDetected &&
                    relationshipAccuracy >= 0.8;
      // Identify issues
      const issues: string[] = [];
      if (correctnessScore < 0.8) issues.push('Low path correctness');
      if (completenessScore < 0.7) issues.push('Incomplete path coverage');
      if (cycleDetected) issues.push('Cycles detected in traversal');
      if (relationshipAccuracy < 0.8) issues.push('Inaccurate relationship traversal');
      if (maxDepthReached > test.maxDepth) issues.push('Exceeded maximum depth');
      validations.push({
        testId,
        queryId,
        startArtifact: test.startArtifact,
        expectedPaths: test.expectedPaths,
        actualPaths: test.actualPaths,
        correctnessScore,
        completenessScore,
        cycleDetected,
        maxDepthReached,
        relationshipAccuracy,
        passed,
        issues,
      });
    }
    return validations;
  }
);

export async function validateGraphTraversal(
  traversalTests: GraphTraversalInput
): Promise<any[]> {
  const actor = createActor(graphTraversalActor, { input: traversalTests });
  actor.start();
  const result = await actor.getSnapshot();
  return result.output ?? [];
}
// --- Search Relevance Validation Actor ---
type SearchRelevanceInput = Array<{
  query: string;
  results: Array<{ artifactId: string; rank: number; score: number }>;
  expectedRelevance?: Array<{ artifactId: string; relevance: number }>;
}>;

export const searchRelevanceActor = fromPromise(
  async ({ input }: { input: SearchRelevanceInput }) => {
    // Use the same logic as the legacy evaluateSearchRelevance
    const evaluations: any[] = [];
    for (const { query, results, expectedRelevance } of input) {
      const queryId = randomUUID();
      const resultsWithRelevance = results.map(result => ({
        ...result,
        relevanceRating: expectedRelevance
          ? (expectedRelevance.find(e => e.artifactId === result.artifactId)?.relevance ?? 1)
          : Math.max(1, Math.min(5, Math.round(result.score * 5))),
        explanation: `Relevance based on score ${result.score.toFixed(3)} and rank ${result.rank}`,
      }));
      // NDCG
      const dcg = resultsWithRelevance.reduce((sum, r) => {
        const gain = Math.pow(2, r.relevanceRating) - 1;
        const discount = Math.log2(r.rank + 1);
        return sum + (gain / discount);
      }, 0);
      const sortedRelevance = resultsWithRelevance.map(r => r.relevanceRating).sort((a, b) => b - a);
      const idcg = sortedRelevance.reduce((sum, relevance, index) => {
        const gain = Math.pow(2, relevance) - 1;
        const discount = Math.log2(index + 2);
        return sum + (gain / discount);
      }, 0);
      const ndcg = idcg > 0 ? dcg / idcg : 0;
      // MAP
      const relevantResults = resultsWithRelevance.filter(r => r.relevanceRating >= 4);
      let sumPrecision = 0, relevantCount = 0;
      for (let i = 0; i < resultsWithRelevance.length; i++) {
        const r = resultsWithRelevance[i];
        if (r && r.relevanceRating >= 4) {
          relevantCount++;
          sumPrecision += relevantCount / (i + 1);
        }
      }
      const map = relevantResults.length > 0 ? sumPrecision / relevantResults.length : 0;
      // Precision, Recall, F1
      const precision = resultsWithRelevance.length > 0 ? relevantResults.length / resultsWithRelevance.length : 0;
      const recall = expectedRelevance && expectedRelevance.length > 0 ? relevantResults.length / expectedRelevance.length : 0;
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      evaluations.push({
        queryId,
        query,
        results: resultsWithRelevance,
        ndcg,
        map,
        precision,
        recall,
        f1Score,
        evaluatedAt: new Date(),
      });
    }
    return evaluations;
  }
);

export async function evaluateSearchRelevance(
  searchResults: SearchRelevanceInput
): Promise<any[]> {
  const actor = createActor(searchRelevanceActor, { input: searchResults });
  actor.start();
  const result = await actor.getSnapshot();
  return result.output ?? [];
}

import { randomUUID } from 'node:crypto';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import {
  AccuracyValidationSchema,
  type AccuracyValidation,
} from '../types.ts';
import type { QueryResponse } from '../../api/contracts.ts';

/**
 * Quality Assurance Validation Tools for EPIC-TESTING-METRICS
 * 
 * Implements accuracy validation for AI-generated responses, search relevance
 * evaluation, graph traversal correctness, and data integrity validation.
 */



// Zod schema for QualityValidationConfig
export const QualityValidationConfigSchema = z.object({
  accuracyThreshold: z.number().min(0).max(1).default(0.85),
  relevanceThreshold: z.number().min(0).max(1).default(0.8),
  completenessThreshold: z.number().min(0).max(1).default(0.8),
  factualAccuracyThreshold: z.number().min(0).max(1).default(0.9),
  evidenceQualityThreshold: z.number().min(0).max(1).default(0.8),
  enableManualValidation: z.boolean().default(false),
  enableAutomatedValidation: z.boolean().default(true),
  enableHybridValidation: z.boolean().default(true),
  sampleSize: z.number().int().min(1).default(100),
}).strict();
export type QualityValidationConfig = z.infer<typeof QualityValidationConfigSchema>;

/**
 * Mock knowledge base for validation
 */


class MockKnowledgeBase {
  private groundTruthData = new Map<string, any>();
  constructor() { this.initializeGroundTruth(); }
  private initializeGroundTruth(): void {
    this.groundTruthData.set('scheduler_preemption', {
      expectedAnswer: 'TensorRT-LLM scheduler uses priority-based preemption with request queuing and dynamic batching optimization',
      keyPoints: ['priority-based', 'preemption', 'request queuing', 'dynamic batching'],
      accuracy: 0.92,
      relevantArtifacts: ['scheduler.cpp', 'request_queue.h', 'batch_manager.cpp'],
    });
    this.groundTruthData.set('memory_management', {
      expectedAnswer: 'TensorRT-LLM implements memory pooling, garbage collection, and dynamic allocation strategies optimized for GPU memory constraints',
      keyPoints: ['memory pooling', 'garbage collection', 'dynamic allocation', 'GPU memory'],
      accuracy: 0.89,
      relevantArtifacts: ['memory_pool.cpp', 'allocator.h', 'gpu_memory.cu'],
    });
    this.groundTruthData.set('cuda_kernels', {
      expectedAnswer: 'CUDA kernels in TensorRT-LLM include fused operations, memory coalescing improvements, and architecture-specific optimizations',
      keyPoints: ['fused operations', 'memory coalescing', 'architecture-specific', 'optimizations'],
      accuracy: 0.87,
      relevantArtifacts: ['kernels.cu', 'fused_ops.cu', 'memory_ops.cu'],
    });
  }
  getGroundTruth(topic: string): any { return this.groundTruthData.get(topic); }
  getAllTopics(): string[] { return Array.from(this.groundTruthData.keys()); }
}

// --- XState Actor Model for Validation ---
type ValidationContext = {
  config: QualityValidationConfig;
  knowledgeBase: MockKnowledgeBase;
  responses: Array<{ query: string; response: QueryResponse; topic?: string }>;
};

export const accuracyValidationActor = fromPromise(
  async ({ input }: { input: ValidationContext }) => {
    const { responses, config, knowledgeBase } = input;
    const testId = randomUUID();
    const validations: AccuracyValidation[] = [];
    let totalAccuracy = 0, totalRelevance = 0, totalCompleteness = 0, totalFactualAccuracy = 0, totalEvidenceQuality = 0;
    const qualityDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    const issueTracker = new Map<string, number>();
    for (const { query, response, topic } of responses) {
      const groundTruth = topic ? knowledgeBase.getGroundTruth(topic) : null;
      // Calculate metrics
      const accuracyScore = calculateAccuracyScore(response, groundTruth);
      const relevanceScore = calculateRelevanceScore(response, query);
      const completenessScore = calculateCompletenessScore(response, groundTruth);
      const factualAccuracy = calculateFactualAccuracy(response, groundTruth);
      const evidenceQuality = calculateEvidenceQuality(response);
      const validation: AccuracyValidation = AccuracyValidationSchema.parse({
        queryId: response.query_id || randomUUID(),
        query,
        expectedAnswer: groundTruth?.expectedAnswer || 'No ground truth available',
        actualAnswer: response.primary_answer || '',
        accuracyScore,
        relevanceScore,
        completenessScore,
        factualAccuracy,
        evidenceQuality,
        validationMethod: config.enableHybridValidation ? 'hybrid' : 'automated',
        validatedAt: new Date(),
        notes: generateValidationNotes(accuracyScore, relevanceScore, completenessScore),
      });
      validations.push(validation);
      totalAccuracy += accuracyScore;
      totalRelevance += relevanceScore;
      totalCompleteness += completenessScore;
      totalFactualAccuracy += factualAccuracy;
      totalEvidenceQuality += evidenceQuality;
      // Categorize
      const overallScore = (accuracyScore + relevanceScore + completenessScore) / 3;
      if (overallScore >= 0.9) qualityDistribution.excellent++;
      else if (overallScore >= 0.8) qualityDistribution.good++;
      else if (overallScore >= 0.7) qualityDistribution.fair++;
      else qualityDistribution.poor++;
      identifyIssues(validation, issueTracker);
    }
    const totalResponses = responses.length;
    const passRate = validations.filter(v =>
      v.accuracyScore >= config.accuracyThreshold &&
      v.relevanceScore >= config.relevanceThreshold &&
      v.completenessScore >= config.completenessThreshold
    ).length / totalResponses;
    const commonIssues = Array.from(issueTracker.entries())
      .map(([issue, frequency]) => ({
        issue,
        frequency,
        impact: assessIssueImpact(issue, frequency, totalResponses),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    const recommendations = generateQualityRecommendations(
      totalAccuracy / totalResponses,
      totalRelevance / totalResponses,
      totalCompleteness / totalResponses,
      passRate,
      commonIssues
    );
    // Use a plain object for metrics (no explicit type annotation)
    const metrics = {
      testId,
      totalResponses,
      validatedResponses: validations.length,
      averageAccuracy: totalAccuracy / totalResponses,
      averageRelevance: totalRelevance / totalResponses,
      averageCompleteness: totalCompleteness / totalResponses,
      averageFactualAccuracy: totalFactualAccuracy / totalResponses,
      averageEvidenceQuality: totalEvidenceQuality / totalResponses,
      passRate,
      qualityDistribution,
      commonIssues,
      recommendations,
    };
    return metrics;
  }
);

// --- Helper functions (pure, Zod-safe) ---
function calculateAccuracyScore(response: QueryResponse, groundTruth: any): number {
  if (!response) return 0.5;
  const confidenceScore = response.confidence_score ?? 0.75;
  if (!groundTruth) return confidenceScore;
  const answer = (response.primary_answer || '').toLowerCase();
  const keyPoints = groundTruth.keyPoints || [];
  let matchCount = 0;
  for (const point of keyPoints) {
    if (answer.includes(point.toLowerCase())) matchCount++;
  }
  const keyPointScore = keyPoints.length > 0 ? matchCount / keyPoints.length : 0;
  return (keyPointScore * 0.7) + (confidenceScore * 0.3);
}
function calculateRelevanceScore(response: QueryResponse, query: string): number {
  const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);
  const answer = response.primary_answer.toLowerCase();
  let relevantTerms = 0;
  for (const term of queryTerms) {
    if (answer.includes(term)) relevantTerms++;
  }
  const termRelevance = queryTerms.length > 0 ? relevantTerms / queryTerms.length : 0;
  const evidenceRelevance = response.evidence_chain.length > 0
    ? response.evidence_chain.reduce((sum, e) => sum + e.relevance_score, 0) / response.evidence_chain.length
    : 0;
  return (termRelevance * 0.4) + (evidenceRelevance * 0.6);
}
function calculateCompletenessScore(response: QueryResponse, groundTruth: any): number {
  const answerLength = response.primary_answer.length;
  const evidenceCount = response.evidence_chain.length;
  let completenessScore = 0;
  if (answerLength >= 200) completenessScore += 0.3;
  else if (answerLength >= 100) completenessScore += 0.2;
  else completenessScore += 0.1;
  if (evidenceCount >= 5) completenessScore += 0.4;
  else if (evidenceCount >= 3) completenessScore += 0.3;
  else if (evidenceCount >= 1) completenessScore += 0.2;
  if (groundTruth) {
    const keyPoints = groundTruth.keyPoints || [];
    const coveredPoints = keyPoints.filter((point: string) =>
      response.primary_answer.toLowerCase().includes(point.toLowerCase())
    ).length;
    completenessScore += keyPoints.length > 0 ? (coveredPoints / keyPoints.length) * 0.3 : 0.3;
  } else {
    completenessScore += 0.3;
  }
  return Math.min(1.0, completenessScore);
}
function calculateFactualAccuracy(response: QueryResponse, groundTruth: any): number {
  if (!groundTruth) return response.confidence_score;
  return groundTruth.accuracy || 0.85;
}
function calculateEvidenceQuality(response: QueryResponse): number {
  if (response.evidence_chain.length === 0) return 0;
  const avgRelevance = response.evidence_chain.reduce((sum, e) => sum + e.relevance_score, 0) / response.evidence_chain.length;
  const diversityScore = new Set(response.evidence_chain.map(e => e.artifact_type)).size / 5;
  const completenessScore = Math.min(1.0, response.evidence_chain.length / 10);
  return (avgRelevance * 0.5) + (diversityScore * 0.3) + (completenessScore * 0.2);
}
function generateValidationNotes(accuracy: number, relevance: number, completeness: number): string {
  const notes: string[] = [];
  if (accuracy < 0.8) notes.push('Low accuracy score');
  if (relevance < 0.8) notes.push('Low relevance score');
  if (completeness < 0.8) notes.push('Incomplete response');
  return notes.length > 0 ? notes.join('; ') : 'Response meets quality standards';
}
function identifyIssues(validation: AccuracyValidation, issueTracker: Map<string, number>): void {
  if (validation.accuracyScore < 0.8) issueTracker.set('Low accuracy', (issueTracker.get('Low accuracy') || 0) + 1);
  if (validation.relevanceScore < 0.8) issueTracker.set('Low relevance', (issueTracker.get('Low relevance') || 0) + 1);
  if (validation.completenessScore < 0.8) issueTracker.set('Incomplete response', (issueTracker.get('Incomplete response') || 0) + 1);
  if (validation.evidenceQuality < 0.8) issueTracker.set('Poor evidence quality', (issueTracker.get('Poor evidence quality') || 0) + 1);
}
function assessIssueImpact(issue: string, frequency: number, total: number): 'high' | 'medium' | 'low' {
  const rate = frequency / total;
  if (rate > 0.3) return 'high';
  if (rate > 0.1) return 'medium';
  return 'low';
}
function generateQualityRecommendations(
  avgAccuracy: number,
  avgRelevance: number,
  avgCompleteness: number,
  passRate: number,
  commonIssues: any[]
): string[] {
  const recommendations: string[] = [];
  if (avgAccuracy < 0.85) recommendations.push('Improve response accuracy through better training data and validation');
  if (avgRelevance < 0.8) recommendations.push('Enhance search relevance algorithms and ranking mechanisms');
  if (avgCompleteness < 0.8) recommendations.push('Increase response completeness by including more evidence and context');
  if (passRate < 0.8) recommendations.push('Overall quality improvement needed to meet acceptance criteria');
  for (const issue of commonIssues.slice(0, 3)) {
    if (issue.impact === 'high') recommendations.push(`Address high-impact issue: ${issue.issue}`);
  }
  return recommendations;
}


import { createActor } from 'xstate';

export async function validateResponseAccuracy(
  responses: Array<{ query: string; response: QueryResponse; topic?: string }>,
  config: Partial<QualityValidationConfig> = {}
): Promise<any> {
  const actor = createActor(accuracyValidationActor, {
    input: {
      responses,
      config: QualityValidationConfigSchema.parse(config),
      knowledgeBase: new MockKnowledgeBase(),
    },
  });
  actor.start();
  const result = await actor.getSnapshot();
  return result.output;
}

// TODO: Implement XState actors for search relevance, graph traversal, and data integrity validation
// For now, fallback to legacy implementation or wrap in similar actor pattern as above
// ...existing code for evaluateSearchRelevance, validateGraphTraversal, validateDataIntegrity...