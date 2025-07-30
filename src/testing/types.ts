/**
 * Type Definitions for EPIC-TESTING-METRICS System
 * 
 * Comprehensive type definitions for the TensorRT-LLM knowledge graph
 * testing and validation system.
 */

import { z } from 'zod';

// =============================================================================
// BENCHMARK TESTING TYPES
// =============================================================================

/**
 * Historical bug scenario for testing
 */
export const HistoricalBugScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['scheduler', 'memory', 'cuda_kernel', 'performance', 'architecture']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  originalIssueUrl: z.string().url().optional(),
  testQuery: z.string(),
  expectedResponseTime: z.number(),
  expectedAccuracy: z.number().min(0).max(1),
  manualInvestigationTime: z.number(), // in milliseconds
  createdAt: z.date(),
});

export type HistoricalBugScenario = z.infer<typeof HistoricalBugScenarioSchema>;

/**
 * Benchmark test result
 */
export const BenchmarkResultSchema = z.object({
  scenarioId: z.string(),
  testId: z.string().uuid(),
  executionTime: z.number(),
  responseTime: z.number(),
  accuracy: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  evidenceQuality: z.number().min(0).max(1),
  userSatisfaction: z.number().min(1).max(10).optional(),
  manualComparisonTime: z.number(),
  speedImprovement: z.number(), // percentage
  memoryUsage: z.number(),
  cpuUsage: z.number(),
  errors: z.array(z.string()),
  metadata: z.record(z.unknown()),
  timestamp: z.date(),
});

export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

// =============================================================================
// USER ENGAGEMENT METRICS TYPES
// =============================================================================

/**
 * User session tracking
 */
export const UserSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  totalQueries: z.number().min(0),
  successfulQueries: z.number().min(0),
  averageResponseTime: z.number(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional(),
  queryTypes: z.array(z.string()),
  satisfactionRating: z.number().min(1).max(5).optional(),
  feedbackText: z.string().optional(),
  voluntaryUsage: z.boolean(),
  metadata: z.record(z.unknown()),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

/**
 * Query analytics
 */
export const QueryAnalyticsSchema = z.object({
  queryId: z.string().uuid(),
  sessionId: z.string().uuid(),
  query: z.string(),
  intent: z.string(),
  complexity: z.enum(['simple', 'moderate', 'complex', 'expert']),
  responseTime: z.number(),
  accuracy: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  userRating: z.number().min(1).max(5).optional(),
  followUpQueries: z.number().min(0),
  artifactsReturned: z.number().min(0),
  relationshipsTraversed: z.number().min(0),
  cacheHit: z.boolean(),
  errorOccurred: z.boolean(),
  errorType: z.string().optional(),
  timestamp: z.date(),
});

export type QueryAnalytics = z.infer<typeof QueryAnalyticsSchema>;

// =============================================================================
// PERFORMANCE VALIDATION TYPES
// =============================================================================

/**
 * Performance metrics
 */
export const PerformanceMetricsSchema = z.object({
  testId: z.string().uuid(),
  testType: z.enum(['response_time', 'concurrent_users', 'database_query', 'memory_usage']),
  targetValue: z.number(),
  actualValue: z.number(),
  passed: z.boolean(),
  timestamp: z.date(),
  metadata: z.object({
    concurrentUsers: z.number().optional(),
    queryComplexity: z.string().optional(),
    datasetSize: z.number().optional(),
    systemLoad: z.number().optional(),
  }),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

/**
 * Load test configuration
 */
export const LoadTestConfigSchema = z.object({
  testName: z.string(),
  concurrentUsers: z.number().min(1),
  duration: z.number().min(1000), // milliseconds
  rampUpTime: z.number().min(0),
  queries: z.array(z.string()),
  targetResponseTime: z.number(),
  targetSuccessRate: z.number().min(0).max(1),
  memoryLimit: z.number().optional(),
  cpuLimit: z.number().optional(),
});

export type LoadTestConfig = z.infer<typeof LoadTestConfigSchema>;

/**
 * Load test result
 */
export const LoadTestResultSchema = z.object({
  testId: z.string().uuid(),
  config: LoadTestConfigSchema,
  startTime: z.date(),
  endTime: z.date(),
  totalRequests: z.number(),
  successfulRequests: z.number(),
  failedRequests: z.number(),
  averageResponseTime: z.number(),
  p95ResponseTime: z.number(),
  p99ResponseTime: z.number(),
  maxResponseTime: z.number(),
  minResponseTime: z.number(),
  throughput: z.number(), // requests per second
  errorRate: z.number().min(0).max(1),
  peakMemoryUsage: z.number(),
  averageCpuUsage: z.number(),
  errors: z.array(z.object({
    type: z.string(),
    message: z.string(),
    count: z.number(),
  })),
  passed: z.boolean(),
});

export type LoadTestResult = z.infer<typeof LoadTestResultSchema>;

// =============================================================================
// QUALITY ASSURANCE TYPES
// =============================================================================

/**
 * Response accuracy validation
 */
export const AccuracyValidationSchema = z.object({
  queryId: z.string().uuid(),
  query: z.string(),
  expectedAnswer: z.string(),
  actualAnswer: z.string(),
  accuracyScore: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  factualAccuracy: z.number().min(0).max(1),
  evidenceQuality: z.number().min(0).max(1),
  validationMethod: z.enum(['manual', 'automated', 'hybrid']),
  validatedBy: z.string().optional(),
  validatedAt: z.date(),
  notes: z.string().optional(),
});

export type AccuracyValidation = z.infer<typeof AccuracyValidationSchema>;

/**
 * Search relevance evaluation
 */
export const SearchRelevanceSchema = z.object({
  queryId: z.string().uuid(),
  query: z.string(),
  results: z.array(z.object({
    artifactId: z.string().uuid(),
    rank: z.number(),
    score: z.number().min(0).max(1),
    relevanceRating: z.number().min(1).max(5),
    explanation: z.string().optional(),
  })),
  ndcg: z.number().min(0).max(1), // Normalized Discounted Cumulative Gain
  map: z.number().min(0).max(1), // Mean Average Precision
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1Score: z.number().min(0).max(1),
  evaluatedBy: z.string().optional(),
  evaluatedAt: z.date(),
});

export type SearchRelevance = z.infer<typeof SearchRelevanceSchema>;

// =============================================================================
// REPORTING TYPES
// =============================================================================

/**
 * Test report summary
 */
export const TestReportSummarySchema = z.object({
  reportId: z.string().uuid(),
  reportType: z.enum(['benchmark', 'performance', 'quality', 'engagement', 'comprehensive']),
  generatedAt: z.date(),
  timeRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  summary: z.object({
    totalTests: z.number(),
    passedTests: z.number(),
    failedTests: z.number(),
    averagePerformance: z.number(),
    overallScore: z.number().min(0).max(100),
  }),
  keyMetrics: z.record(z.number()),
  recommendations: z.array(z.string()),
  trends: z.array(z.object({
    metric: z.string(),
    trend: z.enum(['improving', 'stable', 'declining']),
    changePercent: z.number(),
  })),
  alerts: z.array(z.object({
    severity: z.enum(['critical', 'warning', 'info']),
    message: z.string(),
    metric: z.string(),
    threshold: z.number(),
    actualValue: z.number(),
  })),
});

export type TestReportSummary = z.infer<typeof TestReportSummarySchema>;

/**
 * Dashboard data
 */
export const DashboardDataSchema = z.object({
  timestamp: z.date(),
  realTimeMetrics: z.object({
    activeUsers: z.number(),
    queriesPerMinute: z.number(),
    averageResponseTime: z.number(),
    successRate: z.number().min(0).max(1),
    systemHealth: z.enum(['healthy', 'degraded', 'critical']),
  }),
  performanceMetrics: z.object({
    responseTime: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
    throughput: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
    errorRate: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
  }),
  qualityMetrics: z.object({
    accuracy: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
    relevance: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
    satisfaction: z.object({
      current: z.number(),
      target: z.number(),
      trend: z.array(z.number()),
    }),
  }),
  engagementMetrics: z.object({
    dailyActiveUsers: z.number(),
    averageSessionDuration: z.number(),
    queriesPerSession: z.number(),
    voluntaryUsageRate: z.number().min(0).max(1),
  }),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;

// =============================================================================
// TENSORRT-SPECIFIC TEST SCENARIOS
// =============================================================================

/**
 * TensorRT test scenario
 */
export const TensorRTTestScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['scheduler_performance', 'memory_management', 'cuda_kernels', 'performance_regression', 'architecture']),
  description: z.string(),
  testQuery: z.string(),
  expectedInsights: z.array(z.string()),
  complexityLevel: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  estimatedManualTime: z.number(), // minutes
  targetResponseTime: z.number(), // milliseconds
  targetAccuracy: z.number().min(0).max(1),
  requiredArtifacts: z.array(z.string()),
  validationCriteria: z.array(z.string()),
  metadata: z.record(z.unknown()),
});

export type TensorRTTestScenario = z.infer<typeof TensorRTTestScenarioSchema>;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export const validateHistoricalBugScenario = (data: unknown): HistoricalBugScenario => {
  return HistoricalBugScenarioSchema.parse(data);
};

export const validateBenchmarkResult = (data: unknown): BenchmarkResult => {
  return BenchmarkResultSchema.parse(data);
};

export const validateUserSession = (data: unknown): UserSession => {
  return UserSessionSchema.parse(data);
};

export const validateQueryAnalytics = (data: unknown): QueryAnalytics => {
  return QueryAnalyticsSchema.parse(data);
};

export const validatePerformanceMetrics = (data: unknown): PerformanceMetrics => {
  return PerformanceMetricsSchema.parse(data);
};

export const validateLoadTestConfig = (data: unknown): LoadTestConfig => {
  return LoadTestConfigSchema.parse(data);
};

export const validateLoadTestResult = (data: unknown): LoadTestResult => {
  return LoadTestResultSchema.parse(data);
};

export const validateAccuracyValidation = (data: unknown): AccuracyValidation => {
  return AccuracyValidationSchema.parse(data);
};

export const validateSearchRelevance = (data: unknown): SearchRelevance => {
  return SearchRelevanceSchema.parse(data);
};

export const validateTestReportSummary = (data: unknown): TestReportSummary => {
  return TestReportSummarySchema.parse(data);
};

export const validateDashboardData = (data: unknown): DashboardData => {
  return DashboardDataSchema.parse(data);
};

export const validateTensorRTTestScenario = (data: unknown): TensorRTTestScenario => {
  return TensorRTTestScenarioSchema.parse(data);
};