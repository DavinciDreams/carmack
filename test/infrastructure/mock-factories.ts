/**
 * Mock Factories for Carmack Coder Testing
 *
 * Provides reusable mock factories for actors, external dependencies,
 * and system components to ensure consistent and reliable testing.
 */

import { randomUUID } from 'node:crypto';
import type {
  AstPattern,
  ComplexityMetrics,
  ErrorInfo,
  GitCheckpoint,
  TransformationRequest,
  ValidationResult,
} from '../../src/types.js';

/**
 * Mock factory for XState actors
 */
export class ActorMockFactory {
  /**
   * Create a mock actor that resolves with specified output
   */
  static createSuccessfulActor<T>(output: T, delay = 100): any {
    return {
      start: () => {},
      stop: () => {},
      getSnapshot: () => ({
        status: 'done',
        output,
        value: 'completed',
        context: {},
      }),
      subscribe: (observer: any) => {
        setTimeout(() => {
          if (observer.complete) {
            observer.complete();
          }
        }, delay);
        return { unsubscribe: () => {} };
      },
      send: () => {},
    };
  }

  /**
   * Create a mock actor that fails with specified error
   */
  static createFailingActor(error: Error, delay = 100): any {
    return {
      start: () => {},
      stop: () => {},
      getSnapshot: () => ({
        status: 'error',
        error,
        value: 'failed',
        context: {},
      }),
      subscribe: (observer: any) => {
        setTimeout(() => {
          if (observer.error) {
            observer.error(error);
          }
        }, delay);
        return { unsubscribe: () => {} };
      },
      send: () => {},
    };
  }

  /**
   * Create a mock actor that times out
   */
  static createTimeoutActor(_timeout = 5000): any {
    return {
      start: () => {},
      stop: () => {},
      getSnapshot: () => ({
        status: 'active',
        value: 'running',
        context: {},
      }),
      subscribe: (_observer: any) => {
        // Never complete - will timeout
        return { unsubscribe: () => {} };
      },
      send: () => {},
    };
  }

  /**
   * Create a mock actor with custom behavior
   */
  static createCustomActor<T>(behavior: {
    output?: T;
    error?: Error;
    delay?: number;
    status?: string;
    value?: string;
  }): any {
    const { output, error, delay = 100, status = 'done', value = 'completed' } = behavior;

    return {
      start: () => {},
      stop: () => {},
      getSnapshot: () => ({
        status: error ? 'error' : status,
        output: error ? undefined : output,
        error,
        value: error ? 'failed' : value,
        context: {},
      }),
      subscribe: (observer: any) => {
        setTimeout(() => {
          if (error && observer.error) {
            observer.error(error);
          } else if (observer.complete) {
            observer.complete();
          }
        }, delay);
        return { unsubscribe: () => {} };
      },
      send: () => {},
    };
  }
}

/**
 * Mock factory for external tool dependencies
 */
export class ExternalToolMockFactory {
  private static mocks = new Map<string, any>();

  /**
   * Mock the execSync function for external tool calls
   */
  static mockExecSync(): void {
    const originalExecSync = require('node:child_process').execSync;

    require('node:child_process').execSync = (command: string, options?: any) => {
      console.log(`🔧 Mocked execSync: ${command}`);

      // Check for specific tool mocks
      for (const [pattern, mockResponse] of ExternalToolMockFactory.mocks.entries()) {
        if (command.includes(pattern)) {
          if (mockResponse.shouldFail) {
            const error = new Error(mockResponse.error || 'Command failed') as any;
            error.stdout = mockResponse.stdout || '';
            error.stderr = mockResponse.stderr || mockResponse.error || 'Command failed';
            throw error;
          }
          return mockResponse.stdout || mockResponse.output || '';
        }
      }

      // Default mock responses for common tools
      if (command.includes('biome')) {
        return 'All files formatted correctly';
      }
      if (command.includes('tsc')) {
        return 'No type errors found';
      }
      if (command.includes('git')) {
        return 'Git operation successful';
      }
      if (command.includes('dafny')) {
        return 'Verification successful';
      }

      // Fallback to original or return mock
      try {
        return originalExecSync(command, options);
      } catch {
        return 'Mock command output';
      }
    };
  }

  /**
   * Restore original execSync
   */
  static restoreExecSync(): void {
    // This would need to store the original function reference
    // For now, we'll just clear the mocks
    ExternalToolMockFactory.mocks.clear();
  }

  /**
   * Set mock response for a specific tool or command pattern
   */
  static setMockResponse(
    pattern: string,
    response: {
      stdout?: string;
      stderr?: string;
      output?: string;
      error?: string;
      shouldFail?: boolean;
    }
  ): void {
    ExternalToolMockFactory.mocks.set(pattern, response);
  }

  /**
   * Create mock responses for common development tools
   */
  static setupCommonMocks(): void {
    ExternalToolMockFactory.setMockResponse('biome check', {
      stdout: 'All files pass formatting checks',
    });

    ExternalToolMockFactory.setMockResponse('biome format', {
      stdout: 'Files formatted successfully',
    });

    ExternalToolMockFactory.setMockResponse('tsc --noEmit', {
      stdout: 'No type errors found',
    });

    ExternalToolMockFactory.setMockResponse('git status', {
      stdout: 'On branch main\nnothing to commit, working tree clean',
    });

    ExternalToolMockFactory.setMockResponse('git add', {
      stdout: 'Files staged successfully',
    });

    ExternalToolMockFactory.setMockResponse('git commit', {
      stdout: 'Commit created successfully',
    });

    ExternalToolMockFactory.setMockResponse('dafny verify', {
      stdout: 'Verification completed successfully\n0 errors',
    });
  }

  /**
   * Setup failing mocks for error testing
   */
  static setupFailingMocks(): void {
    ExternalToolMockFactory.setMockResponse('biome check', {
      shouldFail: true,
      stderr: 'Format errors found in 3 files',
      error: 'Biome check failed',
    });

    ExternalToolMockFactory.setMockResponse('tsc --noEmit', {
      shouldFail: true,
      stderr: 'Type errors found',
      error: 'TypeScript compilation failed',
    });

    ExternalToolMockFactory.setMockResponse('git', {
      shouldFail: true,
      stderr: 'Git operation failed',
      error: 'Git error',
    });
  }
}

/**
 * Mock factory for file system operations
 */
export class FileSystemMockFactory {
  private static mockFiles = new Map<string, string>();
  private static mockDirectories = new Set<string>();

  /**
   * Mock file system operations
   */
  static mockFileSystem(): void {
    const fs = require('node:fs');
    const fsPromises = require('node:fs/promises');

    // Mock existsSync
    const originalExistsSync = fs.existsSync;
    fs.existsSync = (path: string) => {
      if (
        FileSystemMockFactory.mockFiles.has(path) ||
        FileSystemMockFactory.mockDirectories.has(path)
      ) {
        return true;
      }
      return originalExistsSync(path);
    };

    // Mock readFile
    const originalReadFile = fsPromises.readFile;
    fsPromises.readFile = async (path: string, encoding?: string) => {
      if (FileSystemMockFactory.mockFiles.has(path)) {
        return FileSystemMockFactory.mockFiles.get(path);
      }
      return originalReadFile(path, encoding);
    };

    // Mock writeFile
    const _originalWriteFile = fsPromises.writeFile;
    fsPromises.writeFile = async (path: string, content: string) => {
      FileSystemMockFactory.mockFiles.set(path, content);
      return Promise.resolve();
    };
  }

  /**
   * Add a mock file
   */
  static addMockFile(path: string, content: string): void {
    FileSystemMockFactory.mockFiles.set(path, content);
  }

  /**
   * Add a mock directory
   */
  static addMockDirectory(path: string): void {
    FileSystemMockFactory.mockDirectories.add(path);
  }

  /**
   * Clear all mocks
   */
  static clearMocks(): void {
    FileSystemMockFactory.mockFiles.clear();
    FileSystemMockFactory.mockDirectories.clear();
  }

  /**
   * Get mock file content
   */
  static getMockFile(path: string): string | undefined {
    return FileSystemMockFactory.mockFiles.get(path);
  }

  /**
   * Check if mock file exists
   */
  static hasMockFile(path: string): boolean {
    return FileSystemMockFactory.mockFiles.has(path);
  }
}

/**
 * Mock factory for transformation actors
 */
export class TransformationActorMockFactory {
  /**
   * Create a mock analysis actor
   */
  static createAnalysisActor(
    complexity: ComplexityMetrics,
    recommendedMode: 'template' | 'ast' | 'llm' = 'template'
  ): any {
    return ActorMockFactory.createSuccessfulActor({
      complexity,
      recommendedMode,
      patterns: [],
      summary: 'Analysis completed successfully',
    });
  }

  /**
   * Create a mock validation actor
   */
  static createValidationActor(result: ValidationResult): any {
    return ActorMockFactory.createSuccessfulActor(result);
  }

  /**
   * Create a mock transformation actor
   */
  static createTransformationActor(filesModified: string[], transformationsApplied = 1): any {
    return ActorMockFactory.createSuccessfulActor({
      success: true,
      mode: 'template',
      filesModified,
      transformationsApplied,
      appliedPatterns: [
        {
          file: filesModified[0] || 'test.ts',
          pattern: 'var $NAME = $VALUE',
          count: transformationsApplied,
        },
      ],
    });
  }

  /**
   * Create a mock git actor
   */
  static createGitActor(checkpoint: GitCheckpoint): any {
    return ActorMockFactory.createSuccessfulActor(checkpoint);
  }

  /**
   * Create a mock dafny actor
   */
  static createDafnyActor(verified = true, conditions = 5): any {
    return ActorMockFactory.createSuccessfulActor({
      verified,
      conditions,
      errors: verified ? [] : ['Verification failed'],
      summary: verified ? 'Verification successful' : 'Verification failed',
    });
  }

  /**
   * Create a mock pattern discovery actor
   */
  static createPatternDiscoveryActor(patternsFound = 3): any {
    return ActorMockFactory.createSuccessfulActor({
      operation: 'discover',
      patterns: Array.from({ length: patternsFound }, (_, i) => ({
        id: `discovered-pattern-${i}`,
        pattern: `pattern-${i}`,
        confidence: 0.8 + i * 0.05,
      })),
      summary: {
        totalAnalyzed: 10,
        patternsDiscovered: patternsFound,
        averageConfidence: 0.85,
        categories: ['modernization', 'optimization'],
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create a mock pattern learning actor
   */
  static createPatternLearningActor(): any {
    return ActorMockFactory.createSuccessfulActor({
      newPatterns: [
        {
          id: 'learned-pattern-1',
          pattern: 'learned pattern',
          confidence: 0.9,
        },
      ],
      optimizedPatterns: [],
      deprecatedPatterns: [],
      insights: ['Pattern learning completed successfully'],
      recommendations: ['Consider applying learned patterns'],
      metrics: {
        patternsDiscovered: 1,
        patternsOptimized: 0,
        averageConfidence: 0.9,
        learningTime: 1000,
      },
    });
  }
}

/**
 * Mock factory for test data generators
 */
export class TestDataMockFactory {
  /**
   * Generate mock complexity metrics
   */
  static generateComplexityMetrics(level: 'low' | 'medium' | 'high' = 'medium'): ComplexityMetrics {
    const configs = {
      low: { base: 2, multiplier: 1 },
      medium: { base: 8, multiplier: 2 },
      high: { base: 15, multiplier: 3 },
    };

    const config = configs[level];

    return {
      cyclomaticComplexity: config.base + Math.floor(Math.random() * config.multiplier),
      cognitiveComplexity: config.base - 2 + Math.floor(Math.random() * config.multiplier),
      linesOfCode: config.base * 10 + Math.floor(Math.random() * config.multiplier * 50),
      nestingDepth: Math.max(1, config.base / 4 + Math.floor(Math.random() * config.multiplier)),
      functionCount: config.base + Math.floor(Math.random() * config.multiplier * 2),
      classCount: Math.max(
        0,
        Math.floor(config.base / 4) + Math.floor(Math.random() * config.multiplier)
      ),
    };
  }

  /**
   * Generate mock error info
   */
  static generateErrorInfo(
    severity: 'error' | 'warning' | 'info' = 'error',
    file = 'test.ts'
  ): ErrorInfo {
    return {
      code: `TEST_${severity.toUpperCase()}_${Math.floor(Math.random() * 1000)}`,
      message: `Mock ${severity} message for testing`,
      severity,
      file,
      line: Math.floor(Math.random() * 100) + 1,
      column: Math.floor(Math.random() * 50) + 1,
    };
  }

  /**
   * Generate mock git checkpoint
   */
  static generateGitCheckpoint(description = 'Test checkpoint'): GitCheckpoint {
    return {
      hash: Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      branch: 'main',
      timestamp: Date.now(),
      description,
    };
  }

  /**
   * Generate mock AST pattern
   */
  static generateAstPattern(
    id?: string,
    complexity = 3,
    riskLevel: 'low' | 'medium' | 'high' = 'low'
  ): AstPattern {
    return {
      id: id || `test-pattern-${randomUUID().slice(0, 8)}`,
      language: 'typescript',
      pattern: 'var $NAME = $VALUE',
      replacement: 'const $NAME = $VALUE',
      description: 'Test pattern for mock data',
      complexity,
      riskLevel,
      mode: 'template',
    };
  }

  /**
   * Generate mock transformation request
   */
  static generateTransformationRequest(
    files: string[] = ['test.ts'],
    type: 'template' | 'ast' | 'llm' = 'template'
  ): TransformationRequest {
    return {
      targetFiles: files,
      transformationType: type,
      patterns: [TestDataMockFactory.generateAstPattern()],
      maxComplexity: 10,
      dryRun: true,
      ...(type === 'llm' && { prompt: 'Test LLM transformation prompt' }),
    };
  }
}

/**
 * Mock factory for performance testing
 */
export class PerformanceMockFactory {
  /**
   * Create a mock that simulates slow operations
   */
  static createSlowActor<T>(output: T, delay: number): any {
    return ActorMockFactory.createSuccessfulActor(output, delay);
  }

  /**
   * Create a mock that simulates memory-intensive operations
   */
  static createMemoryIntensiveActor<T>(output: T): any {
    return {
      ...ActorMockFactory.createSuccessfulActor(output),
      getMemoryUsage: () => Math.floor(Math.random() * 200) + 50, // 50-250 MB
    };
  }

  /**
   * Create performance monitoring mock
   */
  static createPerformanceMonitor(): {
    startTimer: (name: string) => void;
    endTimer: (name: string) => number;
    getMetrics: () => Record<string, number>;
  } {
    const timers = new Map<string, number>();
    const metrics = new Map<string, number>();

    return {
      startTimer: (name: string) => {
        timers.set(name, performance.now());
      },
      endTimer: (name: string) => {
        const start = timers.get(name);
        if (start) {
          const duration = performance.now() - start;
          metrics.set(name, duration);
          timers.delete(name);
          return duration;
        }
        return 0;
      },
      getMetrics: () => Object.fromEntries(metrics),
    };
  }
}

/**
 * Comprehensive mock setup utility
 */
export class MockSetupUtility {
  /**
   * Setup all common mocks for testing
   */
  static setupAllMocks(): void {
    ExternalToolMockFactory.mockExecSync();
    ExternalToolMockFactory.setupCommonMocks();
    FileSystemMockFactory.mockFileSystem();
  }

  /**
   * Setup mocks for error testing scenarios
   */
  static setupErrorMocks(): void {
    ExternalToolMockFactory.mockExecSync();
    ExternalToolMockFactory.setupFailingMocks();
    FileSystemMockFactory.mockFileSystem();
  }

  /**
   * Clean up all mocks
   */
  static cleanupAllMocks(): void {
    ExternalToolMockFactory.restoreExecSync();
    FileSystemMockFactory.clearMocks();
  }

  /**
   * Setup mocks for specific test scenario
   */
  static setupScenarioMocks(scenario: 'success' | 'failure' | 'timeout' | 'partial'): void {
    MockSetupUtility.setupAllMocks();

    switch (scenario) {
      case 'failure':
        MockSetupUtility.setupErrorMocks();
        break;
      case 'timeout':
        ExternalToolMockFactory.setMockResponse('slow-operation', {
          stdout: 'This will timeout',
        });
        break;
      case 'partial':
        ExternalToolMockFactory.setMockResponse('biome check', {
          stdout: 'Some files have issues',
        });
        break;
      default:
        // Success scenario is default
        break;
    }
  }
}
