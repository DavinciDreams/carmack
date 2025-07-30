// Integration test for unified data flow and schema conformance across API, ingestion, learning, and telemetry

import { describe, it, expect } from "vitest";
import { RepositoryMetadataSchema, FileMetadataSchema, TelemetryEventSchema } from "../../src/types/unified-schemas";
import { RepositoryManager } from "../../src/ingestion/repository-manager";
import { createPatternRecommendationEngine } from "../../src/learning/recommendation-engine";
import { getTelemetryCollector } from "../../src/telemetry/collector";

// Minimal mocks for learning engine dependencies
class MockSimilarityDetector {
  public similarityCache = new Map();
  public config = {};
  async calculateSimilarity() { return { similarity: 1 }; }
  getSimilarityMatrix() { return [[1]]; }
  getSimilarityScores() { return [1]; }
  getFeatureVector() { return []; }
  getPatternEmbedding() { return []; }
  getBehavioralEmbedding() { return []; }
  getStructuralEmbedding() { return []; }
  getSemanticEmbedding() { return []; }
  getAllEmbeddings() { return []; }
  findSimilarPatterns() { return []; }
  calculateSimilarityMatrix() { return [[1]]; }
  clearCache() {}
  updateConfig() {}
  getCacheStats() { return {}; }
  calculateConfidence() { return 1; }
  generateCacheKey() { return "mock-key"; }
  cacheResult() {}
  // Add required public methods for type compatibility
  cosineCalculator() { return 1; }
  semanticCalculator() { return 1; }
  behavioralCalculator() { return 1; }
  structuralCalculator() { return 1; }
}
const mockSimilarityDetector = new MockSimilarityDetector();
const mockRLManager = { selectAction: async () => ({ action: "promote_pattern" }) };
const mockNLPAnalyzer = { analyzeText: async () => ({
  extractedFeatures: { complexity: 5, domain: ["ai"], intent: "improve" },
  semanticEmbedding: Array(128).fill(0.5)
}) };
const mockEffectivenessScorer = { calculateEffectiveness: () => ({
  patternId: "context",
  overallScore: 0.9,
  confidence: 0.9,
  breakdown: {
    successRate: { score: 0.9, weight: 0.3, rawValue: 0.9, sampleSize: 10 },
    performance: { score: 0.9, weight: 0.2, rawValue: 0.9, percentile: 90 },
    userSatisfaction: { score: 0.9, weight: 0.2, rawValue: 0.9, sampleSize: 10 },
    complexity: { score: 0.9, weight: 0.1, reduction: 0.1, consistency: 0.9 },
    reusability: { score: 0.9, weight: 0.1, usageFrequency: 10, diversityScore: 0.9 },
    maintainability: { score: 0.9, weight: 0.1, updateFrequency: 1, stabilityScore: 0.9 }
  },
  metadata: {
    lastUpdated: Date.now(),
    totalUsages: 10,
    dataQuality: "high",
    trends: { improving: true, stable: false, declining: false },
    recommendedActions: []
  }
}) };

function reportResult(label: string, result: unknown, schema: any) {
  try {
    schema.parse(result);
    return { label, status: "pass" };
  } catch (err) {
    return { label, status: "fail", error: err instanceof Error ? err.message : String(err) };
  }
}

describe("Unified Data Flow Integration", () => {
  it("validates API → ingestion → learning → telemetry using unified schemas", async () => {
    // 1. Simulate API repository creation (mock metadata)
    const repoMetadata = {
      id: crypto.randomUUID?.() || "00000000-0000-0000-0000-000000000000",
      url: "https://github.com/example/repo",
      name: "repo",
      owner: "example",
      branch: "main",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const repoValidation = reportResult("RepositoryMetadata", repoMetadata, RepositoryMetadataSchema);

    // 2. Ingestion: simulate file metadata (no real git clone for test speed)
    const fileMetadata = {
      id: crypto.randomUUID?.() || "11111111-1111-1111-1111-111111111111",
      repositoryId: repoMetadata.id,
      path: "src/index.ts",
      language: "typescript",
      size: 1234,
      createdAt: new Date(),
      updatedAt: new Date(),
      embedding: [0.1, 0.2, 0.3]
    };
    const filesValidation = [reportResult("FileMetadata", fileMetadata, FileMetadataSchema)];

    // 3. Learning: instantiate engine and get recommendations
    const engine = createPatternRecommendationEngine(
      {},
      mockSimilarityDetector as any,
      mockRLManager as any,
      mockNLPAnalyzer as any,
      mockEffectivenessScorer as any
    );
    // Add a pattern to the engine for recommendation
    engine.addPattern(
      { patternId: "context", features: Array(128).fill(0.5), metadata: { usageCount: 10, complexity: 5, language: "typescript", riskLevel: "low", category: "context", transformationType: "template", successRate: 0.9 } },
      { language: "typescript", category: "context" }
    );
    const learningResult = await engine.getRecommendations({
      context: {
        projectType: "typescript",
        codebaseComplexity: 5,
        teamExperience: "senior",
        timeConstraints: "moderate",
        qualityRequirements: "high"
      },
      preferences: {},
      userHistory: {},
      currentTask: {
        description: "Improve code quality",
        files: ["src/index.ts"],
        transformationType: "template"
      }
    });
    // Validate learning result structure (recommendations array)
    const learningValidation = learningResult.recommendations.length
      ? [{ label: "LearningRecommendation", status: "pass" }]
      : [{ label: "LearningRecommendation", status: "fail", error: "No recommendations" }];

    // 4. Telemetry: emit and validate a unified event
    const telemetryEvent = {
      id: crypto.randomUUID?.() || "22222222-2222-2222-2222-222222222222",
      timestamp: new Date(),
      eventType: "repository_processed",
      repositoryId: repoMetadata.id,
      fileId: fileMetadata.id,
      details: { fileCount: 1 }
    };
    getTelemetryCollector({ enabled: false }).emitUnifiedEvent(telemetryEvent);
    const telemetryValidation = reportResult("TelemetryEvent", telemetryEvent, TelemetryEventSchema);

    // 5. Aggregate and print results in standardized format
    const results = [
      repoValidation,
      ...filesValidation,
      ...learningValidation,
      telemetryValidation
    ];

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ integrationTest: "Unified Data Flow", results }, null, 2));
    results.forEach(r => expect(r.status).toBe("pass"));
  });
});