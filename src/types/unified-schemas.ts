// =====================
// Commit Diff Schema
// =====================
export const CommitDiffSchema = z.object({
  files: z.array(z.object({
    file: z.string(),
    changes: z.number().int().nonnegative().optional(),
    insertions: z.number().int().nonnegative().optional(),
    deletions: z.number().int().nonnegative().optional(),
  })),
  insertions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
  filesChanged: z.number().int().nonnegative().optional(),
});

export type CommitDiff = z.infer<typeof CommitDiffSchema>;

// =====================
// Commit Metadata Schema
// =====================
export const CommitMetadataSchema = z.object({
  hash: z.string(),
  shortHash: z.string().optional(),
  author: z.object({
    name: z.string(),
    email: z.string().optional(),
  }),
  committer: z.object({
    name: z.string(),
    email: z.string().optional(),
  }),
  date: z.date(),
  message: z.string(),
  subject: z.string().optional(),
  body: z.string().optional(),
  parentHashes: z.array(z.string()).optional(),
  refs: z.string().optional(),
  diff: CommitDiffSchema.optional(),
});

export type CommitMetadata = z.infer<typeof CommitMetadataSchema>;

// =====================
// File Content Metadata Schema
// =====================
export const FileContentMetadataSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().optional(),
  path: z.string(),
  language: z.string(),
  size: z.number().int().min(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  content: z.string(),
});

export type FileContentMetadata = z.infer<typeof FileContentMetadataSchema>;
// Performance metrics schema
export const PerformanceMetricsSchema = z.object({
  testId: z.string().uuid(),
  testName: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number(),
  passed: z.boolean(),
  averageResponseTime: z.number(),
  p95ResponseTime: z.number(),
  p99ResponseTime: z.number(),
  maxResponseTime: z.number(),
  minResponseTime: z.number(),
  successRate: z.number(),
  throughput: z.number(),
  peakMemoryUsage: z.number(),
  averageCpuUsage: z.number(),
});
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

export const LoadTestConfigSchema = z.object({
  concurrentUsers: z.number().int().min(1),
  durationSeconds: z.number().int().min(1),
  rampUpSeconds: z.number().int().min(0).default(0),
  targetEndpoint: z.string(),
});
export type LoadTestConfig = z.infer<typeof LoadTestConfigSchema>;

export const LoadTestResultSchema = z.object({
  config: LoadTestConfigSchema,
  metrics: z.array(PerformanceMetricsSchema),
  summary: z.object({
    averageResponseTime: z.number(),
    p95ResponseTime: z.number(),
    p99ResponseTime: z.number(),
    maxResponseTime: z.number(),
    minResponseTime: z.number(),
    successRate: z.number(),
    throughput: z.number(),
    peakMemoryUsage: z.number(),
    averageCpuUsage: z.number(),
  }),
  passed: z.boolean(),
});
export type LoadTestResult = z.infer<typeof LoadTestResultSchema>;

// Validation helpers
export const validatePerformanceMetrics = (data: unknown): PerformanceMetrics => PerformanceMetricsSchema.parse(data);
export const validateLoadTestConfig = (data: unknown): LoadTestConfig => LoadTestConfigSchema.parse(data);
export const validateLoadTestResult = (data: unknown): LoadTestResult => LoadTestResultSchema.parse(data);
import { z } from "zod";

// Unified Zod Schemas for Carmack Coder Core Data Models


// Repository/project metadata
export const RepositoryMetadataSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  name: z.string(),
  owner: z.string(),
  branch: z.string().default("main"),
  languages: z.record(z.number()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// File/document metadata
export const FileMetadataSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  path: z.string(),
  language: z.string(),
  size: z.number().int().min(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  embedding: z.array(z.number()).optional(),
});

// AST/CST node representation (minimal, extensible)
export const ASTNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  name: z.string().optional(),
  parentId: z.string().uuid().optional(),
  fileId: z.string().uuid(),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  children: z.array(z.string().uuid()).default([]),
  properties: z.record(z.unknown()).optional(),
});

// Vector embedding payload
export const VectorEmbeddingSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  vector: z.array(z.number()),
  model: z.string().default("sentence-transformers"),
  createdAt: z.date().optional(),
});

// Pattern and transformation definition
export const PatternDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  language: z.string(),
  astPattern: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Telemetry event structure (minimal, extensible)
export const TelemetryEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  eventType: z.string(),
  userId: z.string().optional(),
  repositoryId: z.string().uuid().optional(),
  fileId: z.string().uuid().optional(),
  patternId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
});
