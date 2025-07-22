/**
 * Custom Production Configuration for CUDA Quantum Repository
 */

import type { z } from 'zod';
import type { ProductionConfigSchema } from './production.config.ts';

export const cudaQuantumConfig = {
  repository: {
    url: 'https://github.com/DavinciDreams/cuda-quantum',
    branch: 'main',
    workingDirectory: './workspace-cuda-quantum',
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
      // CUDA Quantum specific exclusions
      'tpls/**',
      '.devcontainer/**',
      'docker/**',
      'cmake/**',
      '**/build/**',
      '**/CMakeFiles/**',
    ],
  },
  transformation: {
    maxFilesPerBatch: 10,
    maxComplexityThreshold: 15,
    // Extended file extensions for CUDA Quantum (C++/Python/CUDA)
    allowedFileExtensions: ['.py', '.cpp', '.c', '.h', '.hpp', '.cu', '.cuh', '.cxx', '.cc'],
    riskLevelFilter: 'low' as const,
    enableBackups: true,
    dryRunFirst: true,
  },
  cicd: {
    platform: 'github' as const,
    webhookUrl: undefined,
    secretToken: undefined,
    triggerOnPush: false,
    triggerOnPR: true,
    autoMerge: false,
  },
  qualityGates: {
    requireTypeCheck: false, // TypeScript checking disabled for C++/Python
    requireLinting: false, // ESLint disabled for non-JS projects
    requireTests: false, // Skip test requirements for initial run
    requireDafnyVerification: false,
    maxComplexityIncrease: 5,
    minTestCoverage: 50, // Lower threshold for C++/Python
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'info' as const,
    metricsEndpoint: undefined,
    alertingWebhook: undefined,
    performanceThresholds: {
      maxTransformationTime: 300000, // 5 minutes
      maxMemoryUsage: 1024, // 1GB in MB
      maxCpuUsage: 80, // 80%
    },
  },
  rollback: {
    enableAutoRollback: true,
    rollbackOnTestFailure: false, // Disabled since tests are disabled
    rollbackOnComplexityIncrease: true,
    maxRollbackAttempts: 3,
    rollbackTimeoutMs: 60000,
  },
} satisfies z.infer<typeof ProductionConfigSchema>;

export default cudaQuantumConfig;
