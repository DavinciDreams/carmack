/**
 * Benchmark Testing Engine for EPIC-TESTING-METRICS
 * 
 * Executes historical bug scenarios and measures performance improvements
 * compared to manual investigation methods.
 */

import { randomUUID } from 'node:crypto';
import type {
  HistoricalBugScenario,
  BenchmarkResult,
  TensorRTTestScenario
} from '../types.js';
import type {
  QueryResponse,
  QueryRequest
} from '../../api/contracts.js';
import { validateBenchmarkResult } from '../types.js';
import { 
  HISTORICAL_BUG_SCENARIOS, 
  TENSORRT_TEST_SCENARIOS,
  calculateExpectedSpeedImprovement 
} from './historical-scenarios.js';

/**
 * Benchmark execution configuration
 */
export interface BenchmarkConfig {
  scenarios?: string[]; // Specific scenario IDs to run
  categories?: string[]; // Categories to include
  severities?: string[]; // Severity levels to include
  iterations?: number; // Number of iterations per scenario
  timeout?: number; // Timeout per scenario in milliseconds
  includeManualComparison?: boolean; // Whether to simulate manual investigation
  collectDetailedMetrics?: boolean; // Whether to collect detailed performance metrics
  warmupRuns?: number; // Number of warmup runs before measurement
}

/**
 * Benchmark execution context
 */
export interface BenchmarkContext {
  startTime: number;
  endTime?: number;
  memoryUsageStart: NodeJS.MemoryUsage;
  memoryUsageEnd?: NodeJS.MemoryUsage;
  cpuUsageStart: NodeJS.CpuUsage;
  cpuUsageEnd?: NodeJS.CpuUsage;
  errors: string[];
  metadata: Record<string, unknown>;
}

/**
 * Benchmark suite results
 */
export interface BenchmarkSuiteResult {
  suiteId: string;
  config: BenchmarkConfig;
  startTime: Date;
  endTime: Date;
  totalScenarios: number;
  successfulRuns: number;
  failedRuns: number;
  averageSpeedImprovement: number;
  averageAccuracy: number;
  averageResponseTime: number;
  results: BenchmarkResult[];
  summary: {
    targetsMet: {
      speedImprovement: boolean; // 75% target
      responseTime: boolean; // <2s target
      accuracy: boolean; // 85% target
    };
    recommendations: string[];
    performanceInsights: string[];
  };
}

/**
 * Mock query processor for testing
 * In production, this would integrate with the actual query engine
 */
class MockQueryProcessor {
  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    // Simulate processing time based on query complexity
    const baseTime = 800;
    const complexityMultiplier = request.query.length > 100 ? 1.5 : 1.0;
    const processingTime = baseTime * complexityMultiplier + Math.random() * 400;
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    const endTime = Date.now();
    
    // Mock response based on query content
    const mockResponse: QueryResponse = {
      query_id: randomUUID(),
      session_id: randomUUID(),
      intent: 'technical_question',
      complexity: 'complex',
      primary_answer: this.generateMockAnswer(request.query),
      evidence_chain: this.generateMockEvidence(request.query),
      confidence_score: 0.82 + Math.random() * 0.15,
      investigation_threads: [],
      suggested_questions: [],
      execution_time_ms: endTime - startTime,
      artifacts_searched: Math.floor(Math.random() * 20) + 5,
      relationships_traversed: Math.floor(Math.random() * 15) + 3,
      session_context: {},
      created_at: new Date(),
    };
    
    return mockResponse;
  }
  
  private generateMockAnswer(query: string): string {
    const keywords = query.toLowerCase();
    
    if (keywords.includes('scheduler')) {
      return 'The TensorRT-LLM scheduler uses a sophisticated preemption mechanism to handle multiple concurrent requests. The scheduler maintains request queues and implements priority-based scheduling with dynamic batching optimization.';
    }
    
    if (keywords.includes('memory')) {
      return 'TensorRT-LLM implements advanced memory management strategies including memory pooling, garbage collection, and dynamic allocation patterns optimized for GPU memory constraints.';
    }
    
    if (keywords.includes('cuda') || keywords.includes('kernel')) {
      return 'CUDA kernels in TensorRT-LLM have undergone significant optimizations including fused operations, memory coalescing improvements, and architecture-specific tuning for different GPU generations.';
    }
    
    return 'TensorRT-LLM provides comprehensive solutions for high-performance inference with optimizations across multiple system components including compute, memory, and communication layers.';
  }
  
  private generateMockEvidence(query: string): any[] {
    const evidenceCount = Math.floor(Math.random() * 8) + 3;
    const evidence: any[] = [];
    
    for (let i = 0; i < evidenceCount; i++) {
      evidence.push({
        artifact_id: randomUUID(),
        artifact_name: `tensorrt_component_${i + 1}`,
        artifact_type: 'code_file',
        relevance_score: 0.7 + Math.random() * 0.3,
        explanation: `Evidence item ${i + 1} related to the query`,
        file_path: `/src/tensorrt/component_${i + 1}.cpp`,
        line_range: { start: Math.floor(Math.random() * 100) + 1, end: Math.floor(Math.random() * 50) + 150 },
        content_snippet: `// Code snippet related to ${query.split(' ')[0]}`,
      });
    }
    
    return evidence;
  }
}

/**
 * Main benchmark engine class
 */
export class BenchmarkEngine {
  private queryProcessor: MockQueryProcessor;
  private results: BenchmarkResult[] = [];
  
  constructor() {
    this.queryProcessor = new MockQueryProcessor();
  }
  
  /**
   * Run benchmark suite with specified configuration
   */
  async runBenchmarkSuite(config: BenchmarkConfig = {}): Promise<BenchmarkSuiteResult> {
    const suiteId = randomUUID();
    const startTime = new Date();
    
    console.log(`🚀 Starting Benchmark Suite: ${suiteId}`);
    console.log(`Configuration:`, config);
    
    // Get scenarios to run
    const scenarios = this.getScenarios(config);
    console.log(`📋 Running ${scenarios.length} scenarios`);
    
    const results: BenchmarkResult[] = [];
    let successfulRuns = 0;
    let failedRuns = 0;
    
    // Run each scenario
    for (const scenario of scenarios) {
      console.log(`🧪 Running scenario: ${scenario.id}`);
      
      try {
        const result = await this.runScenario(scenario, config);
        results.push(result);
        successfulRuns++;
        
        console.log(`✅ Scenario completed: ${result.speedImprovement.toFixed(1)}% improvement`);
      } catch (error) {
        console.error(`❌ Scenario failed: ${scenario.id}`, error);
        failedRuns++;
        
        // Create failed result
        const failedResult: BenchmarkResult = {
          scenarioId: scenario.id,
          testId: randomUUID(),
          executionTime: 0,
          responseTime: config.timeout || 30000,
          accuracy: 0,
          relevanceScore: 0,
          evidenceQuality: 0,
          manualComparisonTime: scenario.manualInvestigationTime,
          speedImprovement: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          metadata: { failed: true },
          timestamp: new Date(),
        };
        
        results.push(failedResult);
      }
    }
    
    const endTime = new Date();
    
    // Calculate summary metrics
    const successfulResults = results.filter(r => r.errors.length === 0);
    const averageSpeedImprovement = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.speedImprovement, 0) / successfulResults.length
      : 0;
    const averageAccuracy = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.accuracy, 0) / successfulResults.length
      : 0;
    const averageResponseTime = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
      : 0;
    
    // Check if targets are met
    const targetsMet = {
      speedImprovement: averageSpeedImprovement >= 75,
      responseTime: averageResponseTime <= 2000,
      accuracy: averageAccuracy >= 0.85,
    };
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results, targetsMet);
    const performanceInsights = this.generatePerformanceInsights(results);
    
    const suiteResult: BenchmarkSuiteResult = {
      suiteId,
      config,
      startTime,
      endTime,
      totalScenarios: scenarios.length,
      successfulRuns,
      failedRuns,
      averageSpeedImprovement,
      averageAccuracy,
      averageResponseTime,
      results,
      summary: {
        targetsMet,
        recommendations,
        performanceInsights,
      },
    };
    
    console.log(`🎯 Benchmark Suite Completed:`);
    console.log(`   Speed Improvement: ${averageSpeedImprovement.toFixed(1)}% (Target: 75%)`);
    console.log(`   Response Time: ${averageResponseTime.toFixed(0)}ms (Target: <2000ms)`);
    console.log(`   Accuracy: ${(averageAccuracy * 100).toFixed(1)}% (Target: 85%)`);
    console.log(`   Success Rate: ${(successfulRuns / scenarios.length * 100).toFixed(1)}%`);
    
    return suiteResult;
  }
  
  /**
   * Run a single benchmark scenario
   */
  async runScenario(scenario: HistoricalBugScenario, config: BenchmarkConfig): Promise<BenchmarkResult> {
    const testId = randomUUID();
    const context = this.createBenchmarkContext();
    
    try {
      // Warmup runs if configured
      if (config.warmupRuns && config.warmupRuns > 0) {
        for (let i = 0; i < config.warmupRuns; i++) {
          await this.executeQuery(scenario.testQuery, config.timeout);
        }
      }
      
      // Execute the actual benchmark
      const queryRequest: QueryRequest = {
        query: scenario.testQuery,
        context: {
          language_hint: 'cuda',
          domain_hint: scenario.category,
        },
        options: {
          max_results: 20,
          include_code_snippets: true,
          enable_multi_turn: true,
          complexity_preference: 'expert',
          search_depth: 4,
        },
      };
      
      const startTime = performance.now();
      const response = await this.queryProcessor.processQuery(queryRequest);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      // Calculate metrics
      const accuracy = this.calculateAccuracy(response, scenario);
      const relevanceScore = this.calculateRelevanceScore(response);
      const evidenceQuality = this.calculateEvidenceQuality(response);
      const speedImprovement = this.calculateSpeedImprovement(executionTime, scenario.manualInvestigationTime);
      
      // Collect system metrics
      context.endTime = Date.now();
      context.memoryUsageEnd = process.memoryUsage();
      context.cpuUsageEnd = process.cpuUsage(context.cpuUsageStart);
      
      const memoryDelta = context.memoryUsageEnd.heapUsed - context.memoryUsageStart.heapUsed;
      const cpuUsage = (context.cpuUsageEnd.user + context.cpuUsageEnd.system) / 1000; // Convert to ms
      
      const result: BenchmarkResult = {
        scenarioId: scenario.id,
        testId,
        executionTime,
        responseTime: response.execution_time_ms,
        accuracy,
        relevanceScore,
        evidenceQuality,
        manualComparisonTime: scenario.manualInvestigationTime,
        speedImprovement,
        memoryUsage: memoryDelta,
        cpuUsage,
        errors: context.errors,
        metadata: {
          scenario: scenario.title,
          category: scenario.category,
          severity: scenario.severity,
          artifactsSearched: response.artifacts_searched,
          relationshipsTraversed: response.relationships_traversed,
          confidenceScore: response.confidence_score,
        },
        timestamp: new Date(),
      };
      
      return validateBenchmarkResult(result);
    } catch (error) {
      context.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  
  /**
   * Execute a query with timeout
   */
  private async executeQuery(query: string, timeout?: number): Promise<QueryResponse> {
    const timeoutMs = timeout || 30000;
    
    return Promise.race([
      this.queryProcessor.processQuery({ query }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      ),
    ]);
  }
  
  /**
   * Get scenarios based on configuration
   */
  private getScenarios(config: BenchmarkConfig): HistoricalBugScenario[] {
    let scenarios = [...HISTORICAL_BUG_SCENARIOS];
    
    // Filter by specific scenario IDs
    if (config.scenarios && config.scenarios.length > 0) {
      scenarios = scenarios.filter(s => config.scenarios!.includes(s.id));
    }
    
    // Filter by categories
    if (config.categories && config.categories.length > 0) {
      scenarios = scenarios.filter(s => config.categories!.includes(s.category));
    }
    
    // Filter by severities
    if (config.severities && config.severities.length > 0) {
      scenarios = scenarios.filter(s => config.severities!.includes(s.severity));
    }
    
    return scenarios;
  }
  
  /**
   * Create benchmark execution context
   */
  private createBenchmarkContext(): BenchmarkContext {
    return {
      startTime: Date.now(),
      memoryUsageStart: process.memoryUsage(),
      cpuUsageStart: process.cpuUsage(),
      errors: [],
      metadata: {},
    };
  }
  
  /**
   * Calculate accuracy score based on response quality
   */
  private calculateAccuracy(response: QueryResponse, scenario: HistoricalBugScenario): number {
    // Base accuracy from confidence score
    let accuracy = response.confidence_score;
    
    // Adjust based on evidence quality
    const evidenceCount = response.evidence_chain.length;
    if (evidenceCount >= 5) accuracy += 0.05;
    if (evidenceCount >= 10) accuracy += 0.05;
    
    // Adjust based on response completeness
    const answerLength = response.primary_answer.length;
    if (answerLength >= 200) accuracy += 0.03;
    if (answerLength >= 500) accuracy += 0.03;
    
    // Category-specific adjustments
    if (scenario.category === 'scheduler' && response.primary_answer.toLowerCase().includes('scheduler')) {
      accuracy += 0.05;
    }
    if (scenario.category === 'memory' && response.primary_answer.toLowerCase().includes('memory')) {
      accuracy += 0.05;
    }
    
    return Math.min(1.0, Math.max(0.0, accuracy));
  }
  
  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(response: QueryResponse): number {
    const evidenceRelevance = response.evidence_chain.reduce((sum, item) => sum + item.relevance_score, 0);
    return response.evidence_chain.length > 0 ? evidenceRelevance / response.evidence_chain.length : 0;
  }
  
  /**
   * Calculate evidence quality score
   */
  private calculateEvidenceQuality(response: QueryResponse): number {
    let qualityScore = 0;
    const evidenceCount = response.evidence_chain.length;
    
    if (evidenceCount === 0) return 0;
    
    // Base quality from evidence count
    qualityScore += Math.min(0.5, evidenceCount * 0.05);
    
    // Quality from evidence diversity
    const artifactTypes = new Set(response.evidence_chain.map(e => e.artifact_type));
    qualityScore += Math.min(0.3, artifactTypes.size * 0.1);
    
    // Quality from relevance scores
    const avgRelevance = this.calculateRelevanceScore(response);
    qualityScore += avgRelevance * 0.2;
    
    return Math.min(1.0, qualityScore);
  }
  
  /**
   * Calculate speed improvement percentage
   */
  private calculateSpeedImprovement(executionTime: number, manualTime: number): number {
    const platformTimeMs = executionTime;
    const manualTimeMs = manualTime;
    
    return ((manualTimeMs - platformTimeMs) / manualTimeMs) * 100;
  }
  
  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: BenchmarkResult[], targetsMet: any): string[] {
    const recommendations: string[] = [];
    
    if (!targetsMet.speedImprovement) {
      recommendations.push('Optimize query processing pipeline to achieve 75% speed improvement target');
    }
    
    if (!targetsMet.responseTime) {
      recommendations.push('Reduce response time to under 2 seconds through caching and indexing improvements');
    }
    
    if (!targetsMet.accuracy) {
      recommendations.push('Improve accuracy through better evidence ranking and response synthesis');
    }
    
    const failedResults = results.filter(r => r.errors.length > 0);
    if (failedResults.length > 0) {
      recommendations.push(`Address ${failedResults.length} failed scenarios to improve reliability`);
    }
    
    const slowResults = results.filter(r => r.responseTime > 3000);
    if (slowResults.length > 0) {
      recommendations.push(`Optimize ${slowResults.length} slow-performing scenarios`);
    }
    
    return recommendations;
  }
  
  /**
   * Generate performance insights
   */
  private generatePerformanceInsights(results: BenchmarkResult[]): string[] {
    const insights: string[] = [];
    const successfulResults = results.filter(r => r.errors.length === 0);
    
    if (successfulResults.length === 0) return insights;
    
    // Response time insights
    const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
    insights.push(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    
    // Speed improvement insights
    const avgSpeedImprovement = successfulResults.reduce((sum, r) => sum + r.speedImprovement, 0) / successfulResults.length;
    insights.push(`Average speed improvement: ${avgSpeedImprovement.toFixed(1)}%`);
    
    // Category performance
    const categoryPerformance = new Map<string, number[]>();
    successfulResults.forEach(r => {
      const category = r.metadata.category as string;
      if (!categoryPerformance.has(category)) {
        categoryPerformance.set(category, []);
      }
      categoryPerformance.get(category)!.push(r.speedImprovement);
    });
    
    categoryPerformance.forEach((improvements, category) => {
      const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
      insights.push(`${category} scenarios: ${avgImprovement.toFixed(1)}% average improvement`);
    });
    
    return insights;
  }
}

/**
 * Convenience function to run benchmarks
 */
export async function runBenchmarks(config?: BenchmarkConfig): Promise<BenchmarkSuiteResult> {
  const engine = new BenchmarkEngine();
  return engine.runBenchmarkSuite(config);
}

/**
 * Run specific scenario by ID
 */
export async function runScenario(scenarioId: string): Promise<BenchmarkResult> {
  const scenario = HISTORICAL_BUG_SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }
  
  const engine = new BenchmarkEngine();
  return engine.runScenario(scenario, {});
}