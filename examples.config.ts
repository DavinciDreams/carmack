/**
 * Example Production Configuration for Real Codebases
 * Copy this file and customize for your organization
 */

import type { ProductionConfig } from './production.config.ts';

// Example: Large Enterprise Application
export const enterpriseConfig: ProductionConfig = {
  repository: {
    url: 'https://github.com/your-org/enterprise-app.git',
    branch: 'develop',
    workingDirectory: '/var/carmack/workspace',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'docs/**',
      'public/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.d.ts',
      'vendor/**',
      'third-party/**',
    ],
  },
  transformation: {
    maxFilesPerBatch: 15,
    maxComplexityThreshold: 20,
    allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    riskLevelFilter: 'low',
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
    maxComplexityIncrease: 10,
    minTestCoverage: 85,
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'info',
    metricsEndpoint: 'http://prometheus.internal:9090/metrics',
    alertingWebhook: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
    performanceThresholds: {
      maxTransformationTime: 600000, // 10 minutes
      maxMemoryUsage: 2048, // 2GB
      maxCpuUsage: 70,
    },
  },
  rollback: {
    enableAutoRollback: true,
    rollbackOnTestFailure: true,
    rollbackOnComplexityIncrease: true,
    maxRollbackAttempts: 2,
    rollbackTimeoutMs: 120000,
  },
};

// Example: Open Source Project
export const openSourceConfig: ProductionConfig = {
  repository: {
    url: 'https://github.com/facebook/react.git',
    branch: 'main',
    workingDirectory: '/tmp/carmack-oss',
    excludePatterns: [
      'node_modules/**',
      'build/**',
      'packages/**/dist/**',
      'fixtures/**',
      'scripts/**',
      '**/*.min.js',
    ],
  },
  transformation: {
    maxFilesPerBatch: 10,
    maxComplexityThreshold: 15,
    allowedFileExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    riskLevelFilter: 'low',
    enableBackups: true,
    dryRunFirst: true,
  },
  cicd: {
    platform: 'github',
    triggerOnPush: false,
    triggerOnPR: false, // Don't auto-trigger on OSS projects
    autoMerge: false,
  },
  qualityGates: {
    requireTypeCheck: false, // React uses Flow
    requireLinting: true,
    requireTests: true,
    requireDafnyVerification: false,
    maxComplexityIncrease: 5,
    minTestCoverage: 80,
  },
  monitoring: {
    enableTelemetry: false, // Respect privacy for OSS
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

// Example: Microservices Architecture
export const microserviceConfig: ProductionConfig = {
  repository: {
    url: 'https://github.com/your-org/payment-service.git',
    branch: 'main',
    workingDirectory: '/srv/carmack/payment-service',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'docker/**',
      'k8s/**',
      '**/*.spec.ts',
      '**/*.test.ts',
    ],
  },
  transformation: {
    maxFilesPerBatch: 5, // Small service, process carefully
    maxComplexityThreshold: 12,
    allowedFileExtensions: ['.ts', '.js'],
    riskLevelFilter: 'low',
    enableBackups: true,
    dryRunFirst: true,
  },
  cicd: {
    platform: 'gitlab',
    triggerOnPush: true,
    triggerOnPR: true,
    autoMerge: false,
  },
  qualityGates: {
    requireTypeCheck: true,
    requireLinting: true,
    requireTests: true,
    requireDafnyVerification: true, // Critical financial service
    maxComplexityIncrease: 3,
    minTestCoverage: 95, // High coverage for financial code
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'debug',
    metricsEndpoint: 'http://monitoring.internal/metrics',
    alertingWebhook: 'https://pagerduty.com/api/v1/incidents',
    performanceThresholds: {
      maxTransformationTime: 180000, // 3 minutes
      maxMemoryUsage: 512,
      maxCpuUsage: 60,
    },
  },
  rollback: {
    enableAutoRollback: true,
    rollbackOnTestFailure: true,
    rollbackOnComplexityIncrease: true,
    maxRollbackAttempts: 1, // Be very conservative
    rollbackTimeoutMs: 30000,
  },
};

// Example: Legacy Codebase Migration
export const legacyMigrationConfig: ProductionConfig = {
  repository: {
    url: 'https://github.com/your-org/legacy-monolith.git',
    branch: 'modernization',
    workingDirectory: '/data/carmack/legacy',
    excludePatterns: [
      'node_modules/**',
      'bower_components/**',
      'vendor/**',
      'public/assets/**',
      '**/*.min.js',
      '**/*.legacy.js',
      'old/**',
      'deprecated/**',
    ],
  },
  transformation: {
    maxFilesPerBatch: 3, // Very conservative for legacy code
    maxComplexityThreshold: 25, // Legacy code might be complex
    allowedFileExtensions: ['.js', '.ts'],
    riskLevelFilter: 'low', // Only safe transformations
    enableBackups: true,
    dryRunFirst: true,
  },
  cicd: {
    platform: 'jenkins',
    triggerOnPush: false,
    triggerOnPR: false, // Manual triggering only
    autoMerge: false,
  },
  qualityGates: {
    requireTypeCheck: false, // Legacy code might not type-check
    requireLinting: false, // Legacy code might not pass linting
    requireTests: false, // Legacy code might not have tests
    requireDafnyVerification: false,
    maxComplexityIncrease: 0, // Don't increase complexity
    minTestCoverage: 0, // No coverage requirements
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'debug',
    performanceThresholds: {
      maxTransformationTime: 900000, // 15 minutes for large legacy files
      maxMemoryUsage: 4096, // 4GB for processing large files
      maxCpuUsage: 90,
    },
  },
  rollback: {
    enableAutoRollback: true,
    rollbackOnTestFailure: false, // Tests might not exist
    rollbackOnComplexityIncrease: true,
    maxRollbackAttempts: 3,
    rollbackTimeoutMs: 180000,
  },
};

// Default export - customize this for your primary use case
export default enterpriseConfig;
