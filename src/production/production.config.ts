/**
 * Production Configuration for Carmack Coder
 * Designed for deployment in real environments
 */

import { z } from 'zod';

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
        .default([
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.mts',
          '.cts',
          '.py',
          '.cpp',
          '.c',
          '.h',
          '.hpp',
          '.cu',
          '.cuh',
          '.cxx',
          '.cc',
        ]),
      riskLevelFilter: z.enum(['low', 'medium', 'high']).default('medium'),
      enableBackups: z.boolean().default(true),
      dryRunFirst: z.boolean().default(false),
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

// Default production configuration with environment variable support
import { getEnvironmentConfig } from '../config/environment.ts';
const env = getEnvironmentConfig();
export const defaultProductionConfig: ProductionConfig = {
  repository: {
    url: env.CARMACK_REPOSITORY_URL || '',
    branch: env.CARMACK_BRANCH || 'main',
    workingDirectory: env.CARMACK_WORKSPACE || '/tmp/carmack-workspace',
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
    allowedFileExtensions: [
      '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.py', '.cpp', '.c', '.h', '.hpp', '.cu', '.cuh', '.cxx', '.cc',
    ],
    riskLevelFilter: 'medium',
    enableBackups: true,
    dryRunFirst: false,
  },
  cicd: {
    platform: 'github',
    webhookUrl: undefined,
    secretToken: undefined,
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
    metricsEndpoint: undefined,
    alertingWebhook: undefined,
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

/**
 * Validate production configuration
 */
export function validateProductionConfig(data: unknown): ProductionConfig {
  return ProductionConfigSchema.parse(data);
}

/**
 * Load production configuration from file or use defaults
 */
export function loadProductionConfig(configPath?: string): ProductionConfig {
  if (configPath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const configModule = require(configPath);
      const config = configModule.default || configModule;
      return validateProductionConfig(config);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
    }
  }

  return validateProductionConfig(defaultProductionConfig);
}
