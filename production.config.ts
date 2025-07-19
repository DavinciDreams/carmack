/**
 * Production Configuration for Carmack Coder
 * Designed for deployment in real environments
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
        .default(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.py', '.cpp', '.c', '.h', '.hpp', '.cu', '.cuh', '.cxx', '.cc']),
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
export const defaultProductionConfig: ProductionConfig = {
  repository: {
    url: process.env.CARMACK_REPOSITORY_URL || process.env.REPOSITORY_URL || CARMACK_REPOSITORY_URL,
    branch: process.env.CARMACK_BRANCH || process.env.BRANCH || 'main',
    workingDirectory:
      process.env.CARMACK_WORKSPACE || process.env.WORKSPACE_DIR || '/tmp/carmack-workspace',
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
    maxFilesPerBatch: Number.parseInt(process.env.MAX_FILES_PER_BATCH || '10', 10),
    maxComplexityThreshold: Number.parseInt(process.env.MAX_COMPLEXITY_THRESHOLD || '15', 10),
    allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.py', '.cpp', '.c', '.h', '.hpp', '.cu', '.cuh', '.cxx', '.cc'],
    riskLevelFilter: (process.env.RISK_LEVEL_FILTER as 'low' | 'medium' | 'high') || 'medium',
    enableBackups: process.env.ENABLE_BACKUPS !== 'false',
    dryRunFirst: process.env.DRY_RUN_FIRST === 'true',
  },
  cicd: {
    platform:
      (process.env.CICD_PLATFORM as 'github' | 'gitlab' | 'azure' | 'jenkins' | 'custom') ||
      'github',
    webhookUrl: process.env.CICD_WEBHOOK_URL,
    secretToken: process.env.CICD_SECRET_TOKEN,
    triggerOnPush: process.env.TRIGGER_ON_PUSH === 'true',
    triggerOnPR: process.env.TRIGGER_ON_PR !== 'false',
    autoMerge: process.env.AUTO_MERGE === 'true',
  },
  qualityGates: {
    requireTypeCheck: process.env.REQUIRE_TYPE_CHECK !== 'false',
    requireLinting: process.env.REQUIRE_LINTING !== 'false',
    requireTests: process.env.REQUIRE_TESTS !== 'false',
    requireDafnyVerification: process.env.REQUIRE_DAFNY_VERIFICATION === 'true',
    maxComplexityIncrease: Number.parseInt(process.env.MAX_COMPLEXITY_INCREASE || '5', 10),
    minTestCoverage: Number.parseInt(process.env.MIN_TEST_COVERAGE || '80', 10),
  },
  monitoring: {
    enableTelemetry: process.env.CARMACK_TELEMETRY_ENABLED !== 'false',
    logLevel: (process.env.CARMACK_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    metricsEndpoint: process.env.METRICS_ENDPOINT,
    alertingWebhook: process.env.ALERTING_WEBHOOK_URL,
    performanceThresholds: {
      maxTransformationTime: Number.parseInt(process.env.MAX_TRANSFORMATION_TIME || '300000', 10),
      maxMemoryUsage: Number.parseInt(process.env.MAX_MEMORY_USAGE || '1024', 10),
      maxCpuUsage: Number.parseInt(process.env.MAX_CPU_USAGE || '80', 10),
    },
  },
  rollback: {
    enableAutoRollback: process.env.ENABLE_AUTO_ROLLBACK !== 'false',
    rollbackOnTestFailure: process.env.ROLLBACK_ON_TEST_FAILURE !== 'false',
    rollbackOnComplexityIncrease: process.env.ROLLBACK_ON_COMPLEXITY_INCREASE !== 'false',
    maxRollbackAttempts: Number.parseInt(process.env.MAX_ROLLBACK_ATTEMPTS || '3', 10),
    rollbackTimeoutMs: Number.parseInt(process.env.ROLLBACK_TIMEOUT || '60000', 10),
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
