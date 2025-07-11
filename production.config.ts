/**
 * Production Configuration for Carmack Coder
 * Designed for deployment in real co// Default production configuration with environment variable support
export const defaultProductionConfig: ProductionConfig = {
  repository: {
    url: process.env.CARMACK_REPOSITORY_URL || process.env.REPOSITORY_URL || CARMACK_REPOSITORY_URL,
    branch: process.env.CARMACK_BRANCH || process.env.BRANCH || 'main',
    workingDirectory: process.env.CARMACK_WORKSPACE || process.env.WORKSPACE_DIR || '/tmp/carmack-workspace', environments
 */

import { z } from 'zod';
import { CARMACK_REPOSITORY_URL } from './carmack.config.ts';

export const ProductionConfigSchema = z
  .object({
    // Target repository configuration
    repository: z.object({
      url: z.string().url(),
      branch: z.string().default('main'),
      workingDirectory: z.string(),
      excludePatterns: z
        .array(z.string())
        .default([
          'node_modules/**',
          'dist/**',
          'build/**',
          '.git/**',
          '**/*.min.js',
          '**/*.bundle.js',
          'coverage/**',
          'docs/**',
          '**/*.d.ts',
        ]),
    }),

    // Transformation scope and safety
    transformation: z.object({
      maxFilesPerBatch: z.number().min(1).max(100).default(10),
      maxComplexityThreshold: z.number().min(1).max(50).default(15),
      allowedFileExtensions: z
        .array(z.string())
        .default(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']),
      riskLevelFilter: z.enum(['low', 'medium', 'high']).default('medium'),
      enableBackups: z.boolean().default(true),
      dryRunFirst: z.boolean().default(true),
    }),

    // CI/CD Integration
    cicd: z.object({
      platform: z.enum(['github', 'gitlab', 'azure', 'jenkins', 'custom']),
      webhookUrl: z.string().url().optional(),
      secretToken: z.string().optional(),
      triggerOnPush: z.boolean().default(false),
      triggerOnPR: z.boolean().default(true),
      autoMerge: z.boolean().default(false),
    }),

    // Quality gates
    qualityGates: z.object({
      requireTypeCheck: z.boolean().default(true),
      requireLinting: z.boolean().default(true),
      requireTests: z.boolean().default(true),
      requireDafnyVerification: z.boolean().default(false),
      maxComplexityIncrease: z.number().default(5),
      minTestCoverage: z.number().min(0).max(100).default(80),
    }),

    // Monitoring and telemetry
    monitoring: z.object({
      enableTelemetry: z.boolean().default(true),
      logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      metricsEndpoint: z.string().url().optional(),
      alertingWebhook: z.string().url().optional(),
      performanceThresholds: z.object({
        maxTransformationTime: z.number().default(300000), // 5 minutes
        maxMemoryUsage: z.number().default(1024), // 1GB in MB
        maxCpuUsage: z.number().default(80), // 80%
      }),
    }),

    // Rollback and safety
    rollback: z.object({
      enableAutoRollback: z.boolean().default(true),
      rollbackOnTestFailure: z.boolean().default(true),
      rollbackOnComplexityIncrease: z.boolean().default(true),
      maxRollbackAttempts: z.number().default(3),
      rollbackTimeoutMs: z.number().default(60000),
    }),
  })
  .strict();

export type ProductionConfig = z.infer<typeof ProductionConfigSchema>;

// Default production configuration
export const defaultProductionConfig: ProductionConfig = {
  repository: {
    url: 'https://github.com/DavinciDreams/carmack.git',
    branch: 'main',
    workingDirectory: '/tmp/carmack-workspace',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      '**/*.min.js',
      '**/*.bundle.js',
      'coverage/**',
      'docs/**',
      '**/*.d.ts',
    ],
  },
  transformation: {
    maxFilesPerBatch: 10,
    maxComplexityThreshold: 15,
    allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'],
    riskLevelFilter: 'medium',
    enableBackups: true,
    dryRunFirst: true,
  },
  cicd: {
    platform: 'github',
    triggerOnPush: false,
    triggerOnPR: true,
    autoMerge: false,
  },
  qualityGates: {
    requireTypeCheck: true,
    requireLinting: true,
    requireTests: true,
    requireDafnyVerification: false,
    maxComplexityIncrease: 5,
    minTestCoverage: 80,
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'info',
    performanceThresholds: {
      maxTransformationTime: 300000,
      maxMemoryUsage: 1024,
      maxCpuUsage: 80,
    },
  },
  rollback: {
    enableAutoRollback: true,
    rollbackOnTestFailure: true,
    rollbackOnComplexityIncrease: true,
    maxRollbackAttempts: 3,
    rollbackTimeoutMs: 60000,
  },
};
