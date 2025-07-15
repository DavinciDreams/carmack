/**
 * E2E Test Helpers for Carmack Coder
 *
 * Provides specialized utilities for end-to-end testing including:
 * - Actor lifecycle management with proper state transitions
 * - External tool dependency mocking
 * - Timeout and error handling for E2E scenarios
 * - Pattern discovery and learning integration testing
 */

import { execSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ActorRef, createActor } from 'xstate';
import type { AstPattern, ErrorInfo, GitCheckpoint, ValidationResult } from '../../src/types.js';

/**
 * Enhanced actor testing utilities for E2E scenarios
 */
export class E2EActorUtils {
  /**
   * Wait for actor to complete with enhanced error handling and state checking
   */
  static async waitForActorCompletion<T>(
    actor: ActorRef<any, any>,
    timeoutMs = 15000,
    checkInterval = 100
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutId: NodeJS.Timeout;
      let intervalId: NodeJS.Timeout;

      let subscription: any;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        if (subscription) subscription.unsubscribe();
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup();
        const snapshot = actor.getSnapshot();
        reject(
          new Error(
            `Actor timeout after ${timeoutMs}ms. Current state: ${JSON.stringify(
              {
                status: snapshot.status,
                value: snapshot.value,
                context: snapshot.context,
              },
              null,
              2
            )}`
          )
        );
      }, timeoutMs);

      // Check actor state periodically
      intervalId = setInterval(() => {
        const snapshot = actor.getSnapshot();

        // Check for completion
        if (snapshot.status === 'done') {
          cleanup();
          if (snapshot.output) {
            resolve(snapshot.output);
          } else {
            reject(new Error('Actor completed without output'));
          }
          return;
        }

        // Check for error state
        if (snapshot.status === 'error') {
          cleanup();
          reject(new Error(`Actor failed: ${snapshot.error || 'Unknown error'}`));
          return;
        }

        // Check for stopped state (may indicate failure)
        if (snapshot.status === 'stopped') {
          cleanup();
          reject(new Error('Actor stopped unexpectedly'));
          return;
        }

        // Log progress for debugging
        const elapsed = Date.now() - startTime;
        if (elapsed % 2000 < checkInterval) {
          // Log every 2 seconds
          console.log(
            `Actor progress: ${elapsed}ms elapsed, status: ${snapshot.status}, value: ${JSON.stringify(snapshot.value)}`
          );
        }
      }, checkInterval);

      // Also listen for actor events
      subscription = actor.subscribe({
        complete: () => {
          cleanup();
          const snapshot = actor.getSnapshot();
          if (snapshot.status === 'done' && snapshot.output) {
            resolve(snapshot.output);
          } else {
            reject(new Error('Actor completed without proper output'));
          }
        },
        error: (error) => {
          cleanup();
          reject(error);
        },
      });
    });
  }

  /**
   * Create and start actor with enhanced monitoring
   */
  static async createAndRunActor<TInput, TOutput>(
    actorLogic: any,
    input: TInput,
    timeoutMs = 15000
  ): Promise<TOutput> {
    console.log('🚀 Starting actor with input:', JSON.stringify(input, null, 2));

    const actor = createActor(actorLogic, { input });

    // Start the actor
    actor.start();

    try {
      const result = await E2EActorUtils.waitForActorCompletion<TOutput>(actor, timeoutMs);
      console.log('✅ Actor completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Actor failed:', error);
      throw error;
    } finally {
      // Ensure actor is stopped
      if (actor.getSnapshot().status !== 'stopped') {
        actor.stop();
      }
    }
  }

  /**
   * Test actor with retry logic for flaky operations
   */
  static async testActorWithRetry<TInput, TOutput>(
    actorLogic: any,
    input: TInput,
    maxRetries = 3,
    timeoutMs = 15000
  ): Promise<TOutput> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Actor attempt ${attempt}/${maxRetries}`);
        return await E2EActorUtils.createAndRunActor<TInput, TOutput>(actorLogic, input, timeoutMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Actor attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All actor attempts failed');
  }
}

/**
 * Mock external tool dependencies for reliable testing
 */
export class ExternalToolMocker {
  private static originalExecSync: typeof execSync;
  private static mockResponses: Map<
    string,
    { stdout?: string; stderr?: string; shouldFail?: boolean }
  > = new Map();

  /**
   * Start mocking external tools
   */
  static startMocking(): void {
    if (!ExternalToolMocker.originalExecSync) {
      ExternalToolMocker.originalExecSync = execSync;
    }

    // Mock execSync to intercept external tool calls
    (global as any).execSync = (command: string, options?: any) => {
      console.log(`🔧 Mocked external command: ${command}`);

      // Check for specific tool commands
      if (command.includes('biome check') || command.includes('biome format')) {
        const mockResponse = ExternalToolMocker.mockResponses.get('biome') || {
          stdout: 'All files formatted correctly',
        };
        if (mockResponse.shouldFail) {
          const error = new Error('Biome check failed') as any;
          error.stdout = mockResponse.stdout || '';
          error.stderr = mockResponse.stderr || 'Format issues found';
          throw error;
        }
        return mockResponse.stdout || '';
      }

      if (command.includes('tsc --noEmit')) {
        const mockResponse = ExternalToolMocker.mockResponses.get('typescript') || {
          stdout: 'No type errors found',
        };
        if (mockResponse.shouldFail) {
          const error = new Error('TypeScript check failed') as any;
          error.stdout = mockResponse.stdout || '';
          error.stderr = mockResponse.stderr || 'Type errors found';
          throw error;
        }
        return mockResponse.stdout || '';
      }

      if (command.includes('git')) {
        const mockResponse = ExternalToolMocker.mockResponses.get('git') || {
          stdout: 'Git operation successful',
        };
        if (mockResponse.shouldFail) {
          const error = new Error('Git operation failed') as any;
          error.stdout = mockResponse.stdout || '';
          error.stderr = mockResponse.stderr || 'Git error';
          throw error;
        }
        return mockResponse.stdout || '';
      }

      // For other commands, try to use original or return mock
      try {
        return ExternalToolMocker.originalExecSync(command, options);
      } catch (_error) {
        console.warn(`⚠️ External command failed, using mock: ${command}`);
        return 'Mock command output';
      }
    };
  }

  /**
   * Stop mocking external tools
   */
  static stopMocking(): void {
    if (ExternalToolMocker.originalExecSync) {
      (global as any).execSync = ExternalToolMocker.originalExecSync;
    }
    ExternalToolMocker.mockResponses.clear();
  }

  /**
   * Set mock response for a specific tool
   */
  static setMockResponse(
    tool: string,
    response: { stdout?: string; stderr?: string; shouldFail?: boolean }
  ): void {
    ExternalToolMocker.mockResponses.set(tool, response);
  }

  /**
   * Create mock validation result for testing
   */
  static createMockValidationResult(
    isValid = true,
    errors: ErrorInfo[] = [],
    warnings: ErrorInfo[] = []
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      fixableIssues: errors.length + warnings.length,
    };
  }
}

/**
 * E2E test environment setup and teardown
 */
export class E2ETestEnvironment {
  private testDir = '';
  private originalCwd = '';
  private createdFiles: string[] = [];

  /**
   * Set up test environment
   */
  async setup(): Promise<string> {
    this.originalCwd = process.cwd();
    this.testDir = join(
      tmpdir(),
      `e2e-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    await mkdir(this.testDir, { recursive: true });
    process.chdir(this.testDir);

    // Setup git for E2E tests
    try {
      execSync('git init', { cwd: this.testDir, stdio: 'pipe' });
      execSync('git config user.name "E2E Test User"', { cwd: this.testDir, stdio: 'pipe' });
      execSync('git config user.email "e2e@example.com"', { cwd: this.testDir, stdio: 'pipe' });

      // Create initial commit
      await this.createTestFile('.gitkeep', '');
      execSync('git add .gitkeep', { cwd: this.testDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: this.testDir, stdio: 'pipe' });
    } catch (error) {
      console.warn('Git setup failed in test environment:', error);
    }

    // Start mocking external tools
    ExternalToolMocker.startMocking();

    console.log(`🏗️ E2E test environment set up at: ${this.testDir}`);
    return this.testDir;
  }

  /**
   * Clean up test environment
   */
  async cleanup(): Promise<void> {
    // Stop mocking
    ExternalToolMocker.stopMocking();

    // Restore original working directory
    process.chdir(this.originalCwd);

    // Clean up test directory
    try {
      await rm(this.testDir, { recursive: true, force: true });
      console.log('🧹 E2E test environment cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup test environment:', error);
    }
  }

  /**
   * Create a test file in the test environment
   */
  async createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(this.testDir, name);
    await writeFile(filePath, content, 'utf-8');
    this.createdFiles.push(filePath);
    return filePath;
  }

  /**
   * Read a test file from the test environment
   */
  async readTestFile(name: string): Promise<string> {
    const filePath = join(this.testDir, name);
    return await readFile(filePath, 'utf-8');
  }

  /**
   * Get the test directory path
   */
  getTestDir(): string {
    return this.testDir;
  }

  /**
   * Get list of created files
   */
  getCreatedFiles(): string[] {
    return [...this.createdFiles];
  }
}

/**
 * Pattern discovery and learning test utilities
 */
export class PatternTestUtils {
  /**
   * Create mock pattern discovery input
   */
  static createPatternDiscoveryInput(files: string[] = ['test.ts']) {
    return {
      operation: 'discover' as const,
      sources: {
        codeFiles: files,
      },
      config: {
        minOccurrences: 1, // Lower threshold for testing
        confidenceThreshold: 0.5, // Lower threshold for testing
        maxPatterns: 10,
        languages: ['typescript' as const],
        categories: ['modernization', 'optimization'],
        complexity: {
          min: 1,
          max: 8,
        },
      },
    };
  }

  /**
   * Create mock pattern learning input
   */
  static createPatternLearningInput(
    operation: 'learn' | 'discover' | 'optimize' | 'evaluate' = 'learn'
  ) {
    return {
      operation,
      transformation: {
        id: 'test-transformation',
        mode: 'template' as const,
        filesModified: ['test.ts'],
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        errors: [],
        summary: 'Test transformation completed',
      },
      patterns: [
        {
          id: 'test-pattern',
          language: 'typescript',
          pattern: 'var $name = $value',
          replacement: 'const $name = $value',
          description: 'Test pattern',
          complexity: 2,
          riskLevel: 'low',
          mode: 'template',
        },
      ],
      context: {
        codebase: {
          language: 'typescript',
          complexity: 5,
          size: 1000,
        },
        environment: {
          performance: {
            transformationTime: 1000,
          },
          success: true,
          userFeedback: 8,
        },
      },
    };
  }

  /**
   * Validate pattern discovery result structure
   */
  static validatePatternDiscoveryResult(result: any): boolean {
    return (
      result &&
      typeof result.operation === 'string' &&
      Array.isArray(result.patterns) &&
      result.summary &&
      typeof result.summary.totalAnalyzed === 'number' &&
      typeof result.summary.patternsDiscovered === 'number' &&
      typeof result.summary.averageConfidence === 'number' &&
      Array.isArray(result.summary.categories) &&
      typeof result.timestamp === 'string'
    );
  }

  /**
   * Validate pattern learning result structure
   */
  static validatePatternLearningResult(result: any): boolean {
    return (
      result &&
      Array.isArray(result.newPatterns) &&
      Array.isArray(result.optimizedPatterns) &&
      Array.isArray(result.deprecatedPatterns) &&
      Array.isArray(result.insights) &&
      Array.isArray(result.recommendations) &&
      result.metrics &&
      typeof result.metrics.patternsDiscovered === 'number' &&
      typeof result.metrics.patternsOptimized === 'number' &&
      typeof result.metrics.averageConfidence === 'number' &&
      typeof result.metrics.learningTime === 'number'
    );
  }
}

/**
 * Common test data generators for E2E tests
 */
export class E2ETestData {
  /**
   * Generate test source code with various patterns
   */
  static generateTestCode(): string {
    return `
// Test file with various patterns for transformation
function processData(items) {
  var results = [];
  var count = 0;
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item != null && item != undefined) {
      var processed = item.toString().toUpperCase();
      results.push(processed);
      count++;
    }
  }
  
  var summary = {
    total: count,
    items: results
  };
  
  return summary;
}

class DataProcessor {
  private cache: any = {};
  
  process(data: any[]): any {
    var results = [];
    
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (item != null) {
        results.push(item);
      }
    }
    
    return results;
  }
}
`.trim();
  }

  /**
   * Generate complex test code for advanced scenarios
   */
  static generateComplexTestCode(): string {
    return `
// Complex test file for advanced transformation scenarios
class UserManager {
  private users: any[] = [];
  private stats: any = {};
  
  constructor() {
    var self = this;
    self.stats = {
      processed: 0,
      errors: 0
    };
  }
  
  addUser(user: any): boolean {
    var isValid = this.validateUser(user);
    if (isValid == true) {
      this.users.push(user);
      this.stats.processed++;
      return true;
    }
    return false;
  }
  
  findUser(id: any): any {
    for (var i = 0; i < this.users.length; i++) {
      if (this.users[i].id == id) {
        return this.users[i];
      }
    }
    return null;
  }
  
  private validateUser(user: any): boolean {
    if (user == null || user == undefined) {
      return false;
    }
    if (user.name == '' || user.email == '') {
      return false;
    }
    return true;
  }
  
  getStats(): any {
    var currentStats = this.stats;
    return currentStats;
  }
}

function processUsers(users: any[]): any {
  var manager = new UserManager();
  var results = [];
  
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    if (manager.addUser(user)) {
      results.push(user);
    }
  }
  
  return {
    processed: results,
    stats: manager.getStats()
  };
}
`.trim();
  }

  /**
   * Generate test patterns for transformation
   */
  static generateTestPatterns(): AstPattern[] {
    return [
      {
        id: 'var-to-const',
        language: 'typescript',
        pattern: 'var\\s+(\\w+)\\s*=',
        replacement: 'const $1 =',
        description: 'Convert var to const',
        complexity: 2,
        riskLevel: 'low',
        mode: 'template',
      },
      {
        id: 'strict-equality',
        language: 'typescript',
        pattern: '([^!=])\\s*==\\s*([^=])',
        replacement: '$1 === $2',
        description: 'Convert loose equality to strict equality',
        complexity: 1,
        riskLevel: 'low',
        mode: 'template',
      },
      {
        id: 'strict-inequality',
        language: 'typescript',
        pattern: '([^!=])\\s*!=\\s*([^=])',
        replacement: '$1 !== $2',
        description: 'Convert loose inequality to strict inequality',
        complexity: 1,
        riskLevel: 'low',
        mode: 'template',
      },
    ];
  }
}

/**
 * E2E test assertion helpers
 */
export class E2EAssertions {
  /**
   * Assert that transformation result is valid
   */
  static assertTransformationResult(result: any): void {
    if (!result) {
      throw new Error('Transformation result is null or undefined');
    }
    if (!Array.isArray(result.filesModified)) {
      throw new Error('Transformation result missing filesModified array');
    }
    if (typeof result.transformationsApplied !== 'number') {
      throw new Error('Transformation result missing transformationsApplied count');
    }
  }

  /**
   * Assert that validation result is valid
   */
  static assertValidationResult(result: ValidationResult): void {
    if (typeof result.isValid !== 'boolean') {
      throw new Error('Validation result missing isValid boolean');
    }
    if (!Array.isArray(result.errors)) {
      throw new Error('Validation result missing errors array');
    }
    if (!Array.isArray(result.warnings)) {
      throw new Error('Validation result missing warnings array');
    }
  }

  /**
   * Assert that git checkpoint is valid
   */
  static assertGitCheckpoint(checkpoint: GitCheckpoint): void {
    if (!checkpoint.hash || typeof checkpoint.hash !== 'string') {
      throw new Error('Git checkpoint missing hash');
    }
    if (!checkpoint.description || typeof checkpoint.description !== 'string') {
      throw new Error('Git checkpoint missing description');
    }
    if (typeof checkpoint.timestamp !== 'number') {
      throw new Error('Git checkpoint missing timestamp');
    }
  }

  /**
   * Assert that code transformations were applied correctly
   */
  static assertCodeTransformations(
    originalCode: string,
    transformedCode: string,
    expectedChanges: string[]
  ): void {
    for (const change of expectedChanges) {
      if (transformedCode.includes(change)) {
        throw new Error(`Expected change not found in transformed code: ${change}`);
      }
    }

    // Ensure some transformation occurred
    if (originalCode === transformedCode) {
      throw new Error('No transformations were applied to the code');
    }
  }
}
