/**
 * Test Helpers and Utilities for Carmack Coder
 * 
 * Provides common testing utilities, mock data generators, and assertion helpers
 * for comprehensive component testing.
 */

import { randomUUID } from 'crypto';
import type {
  AstPattern,
  ComplexityMetrics,
  TransformationRequest,
  ValidationResult,
  ErrorInfo,
  GitCheckpoint,
  TransformationResult,
  MachineContext,
} from '../src/types.js';

/**
 * Mock data generators for testing
 */
export class MockDataGenerator {
  /**
   * Generate a mock complexity metrics object
   */
  static createComplexityMetrics(overrides: Partial<ComplexityMetrics> = {}): ComplexityMetrics {
    return {
      cyclomaticComplexity: 5,
      cognitiveComplexity: 3,
      linesOfCode: 100,
      nestingDepth: 2,
      functionCount: 8,
      classCount: 1,
      ...overrides,
    };
  }

  /**
   * Generate a mock AST pattern
   */
  static createAstPattern(overrides: Partial<AstPattern> = {}): AstPattern {
    return {
      id: `test-pattern-${randomUUID().slice(0, 8)}`,
      language: 'typescript',
      pattern: 'var $NAME = $VALUE',
      replacement: 'const $NAME = $VALUE',
      description: 'Test pattern for var to const conversion',
      complexity: 2,
      riskLevel: 'low',
      mode: 'template',
      ...overrides,
    };
  }

  /**
   * Generate a mock transformation request
   */
  static createTransformationRequest(overrides: Partial<TransformationRequest> = {}): TransformationRequest {
    return {
      targetFiles: ['./test/fixtures/sample.ts'],
      transformationType: 'template',
      patterns: [this.createAstPattern()],
      maxComplexity: 10,
      dryRun: false,
      ...overrides,
    };
  }

  /**
   * Generate a mock validation result
   */
  static createValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      fixableIssues: 0,
      ...overrides,
    };
  }

  /**
   * Generate a mock error info
   */
  static createErrorInfo(overrides: Partial<ErrorInfo> = {}): ErrorInfo {
    return {
      code: 'TEST_ERROR',
      message: 'Test error message',
      severity: 'error',
      file: './test/fixtures/sample.ts',
      line: 10,
      column: 5,
      ...overrides,
    };
  }

  /**
   * Generate a mock git checkpoint
   */
  static createGitCheckpoint(overrides: Partial<GitCheckpoint> = {}): GitCheckpoint {
    return {
      hash: 'a'.repeat(40), // Valid 40-character hash
      branch: 'main',
      timestamp: Date.now(),
      description: 'Test checkpoint',
      ...overrides,
    };
  }

  /**
   * Generate a mock transformation result
   */
  static createTransformationResult(overrides: Partial<TransformationResult> = {}): TransformationResult {
    return {
      id: randomUUID(),
      request: this.createTransformationRequest(),
      status: 'completed',
      mode: 'template',
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      filesModified: ['./test/fixtures/sample.ts'],
      errors: [],
      ...overrides,
    };
  }

  /**
   * Generate a mock machine context
   */
  static createMachineContext(overrides: Partial<MachineContext> = {}): MachineContext {
    return {
      activeFiles: ['./test/fixtures/sample.ts'],
      checkpoints: [],
      patterns: [this.createAstPattern()],
      maxRetries: 3,
      currentRetries: 0,
      timeoutMs: 300000,
      config: {
        maxComplexityThreshold: 15,
        enableDafnyVerification: true,
        enableLearning: true,
        gitIntegration: true,
      },
      ...overrides,
    };
  }
}

/**
 * Code sample generators for testing transformations
 */
export class CodeSampleGenerator {
  /**
   * Generate TypeScript code with var declarations
   */
  static generateVarCode(): string {
    return `
// Test file with var declarations
var userName = 'john';
var userAge = 25;
var isActive = true;

function processUser() {
  var result = userName + ' is ' + userAge + ' years old';
  return result;
}
`.trim();
  }

  /**
   * Generate TypeScript code with loose equality
   */
  static generateLooseEqualityCode(): string {
    return `
// Test file with loose equality
function checkValue(value) {
  if (value == null) {
    return false;
  }
  if (value == undefined) {
    return false;
  }
  if (value != 0) {
    return true;
  }
  return false;
}
`.trim();
  }

  /**
   * Generate TypeScript code with Promise chains
   */
  static generatePromiseCode(): string {
    return `
// Test file with Promise chains
function fetchUserData(id) {
  return fetch('/api/users/' + id)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      return processUserData(data);
    });
}
`.trim();
  }

  /**
   * Generate complex TypeScript code for testing
   */
  static generateComplexCode(): string {
    return `
// Complex test file
class UserManager {
  private users: any[] = [];
  
  addUser(user: any) {
    var isValid = this.validateUser(user);
    if (isValid == true) {
      this.users.push(user);
      return true;
    }
    return false;
  }
  
  findUser(id: any) {
    for (var i = 0; i < this.users.length; i++) {
      if (this.users[i].id == id) {
        return this.users[i];
      }
    }
    return null;
  }
  
  private validateUser(user: any) {
    if (user == null || user == undefined) {
      return false;
    }
    if (user.name == '' || user.email == '') {
      return false;
    }
    return true;
  }
}
`.trim();
  }

  /**
   * Generate code with syntax errors for error testing
   */
  static generateErrorCode(): string {
    return `
// Code with intentional errors
function brokenFunction() {
  var unclosedString = "this is not closed;
  
  if (true {
    console.log('Missing closing parenthesis');
  }
  
  var undefinedVar = someUndefinedVariable + 5;
  return undefined.someProperty;
}
`.trim();
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that a transformation was successful
   */
  static assertTransformationSuccess(result: any): void {
    if (!result) {
      throw new Error('Transformation result is null or undefined');
    }
    if (!result.filesModified || !Array.isArray(result.filesModified)) {
      throw new Error('Transformation result missing filesModified array');
    }
    if (typeof result.transformationsApplied !== 'number') {
      throw new Error('Transformation result missing transformationsApplied count');
    }
  }

  /**
   * Assert that validation result is properly structured
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
    if (typeof result.fixableIssues !== 'number') {
      throw new Error('Validation result missing fixableIssues number');
    }
  }

  /**
   * Assert that complexity metrics are valid
   */
  static assertComplexityMetrics(metrics: ComplexityMetrics): void {
    const requiredFields = [
      'cyclomaticComplexity',
      'cognitiveComplexity', 
      'linesOfCode',
      'nestingDepth',
      'functionCount',
      'classCount'
    ];
    
    for (const field of requiredFields) {
      if (typeof (metrics as any)[field] !== 'number' || (metrics as any)[field] < 0) {
        throw new Error(`Complexity metrics missing or invalid ${field}`);
      }
    }
  }

  /**
   * Assert that error info is properly structured
   */
  static assertErrorInfo(error: ErrorInfo): void {
    if (!error.code || typeof error.code !== 'string') {
      throw new Error('Error info missing code');
    }
    if (!error.message || typeof error.message !== 'string') {
      throw new Error('Error info missing message');
    }
    if (!['error', 'warning', 'info'].includes(error.severity)) {
      throw new Error('Error info has invalid severity');
    }
  }
}

/**
 * File system test utilities
 */
export class FileTestUtils {
  /**
   * Create a temporary test file
   */
  static async createTempFile(content: string, extension = '.ts'): Promise<string> {
    const { writeFile, mkdtemp } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    
    const tempDir = await mkdtemp(join(tmpdir(), 'carmack-test-'));
    const filePath = join(tempDir, `test-file${extension}`);
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      const { rm } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await rm(dirname(filePath), { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error);
    }
  }

  /**
   * Read file content for verification
   */
  static async readFileContent(filePath: string): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    return await readFile(filePath, 'utf8');
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of an async function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await fn();
    const timeMs = performance.now() - start;
    return { result, timeMs };
  }

  /**
   * Run performance benchmark
   */
  static async benchmark<T>(
    fn: () => Promise<T>,
    iterations = 10
  ): Promise<{
    avg: number;
    min: number;
    max: number;
    p95: number;
    results: T[];
  }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, timeMs } = await this.measureTime(fn);
      times.push(timeMs);
      results.push(result);
    }

    times.sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = times[0] || 0;
    const max = times[times.length - 1] || 0;
    const p95Index = Math.floor(times.length * 0.95);
    const p95 = times[p95Index] || 0;

    return { avg, min, max, p95, results };
  }
}

/**
 * Actor testing utilities
 */
export class ActorTestUtils {
  /**
   * Create a mock actor input for testing
   */
  static createActorInput<T>(input: T): { input: T } {
    return { input };
  }

  /**
   * Test XState actor with timeout
   */
  static async testActorWithTimeout<T>(
    actor: any,
    input: any,
    timeoutMs = 5000
  ): Promise<T> {
    const { createActor } = await import('xstate');
    
    return Promise.race([
      new Promise<T>((resolve, reject) => {
        const actorInstance = createActor(actor, { input });
        
        actorInstance.subscribe({
          complete: () => {
            const snapshot = actorInstance.getSnapshot();
            if (snapshot.status === 'done') {
              resolve(snapshot.output);
            } else {
              reject(new Error('Actor completed without output'));
            }
          },
          error: (error) => {
            reject(error);
          },
        });
        
        actorInstance.start();
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Actor test timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Test XState actor error handling
   */
  static async testActorError(
    actor: any,
    input: any
  ): Promise<Error | null> {
    try {
      await this.testActorWithTimeout(actor, input);
      return null; // No error thrown
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }
}

/**
 * Schema validation testing utilities
 */
export class SchemaTestUtils {
  /**
   * Test Zod schema with valid data
   */
  static testSchemaValid<T>(schema: any, data: T): boolean {
    try {
      schema.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test Zod schema with invalid data
   */
  static testSchemaInvalid<T>(schema: any, data: T): boolean {
    try {
      schema.parse(data);
      return false; // Should have thrown
    } catch {
      return true; // Correctly rejected invalid data
    }
  }

  /**
   * Get schema validation errors
   */
  static getSchemaErrors<T>(schema: any, data: T): string[] {
    try {
      schema.parse(data);
      return [];
    } catch (error: any) {
      if (error.errors && Array.isArray(error.errors)) {
        return error.errors.map((e: any) => e.message || String(e));
      }
      return [error.message || String(error)];
    }
  }
}

/**
 * Telemetry testing utilities
 */
export class TelemetryTestUtils {
  /**
   * Create multiple test files for telemetry testing
   */
  static async createTestFiles(): Promise<string[]> {
    const files: string[] = [];
    
    // Create TypeScript test file
    const tsFile = await FileTestUtils.createTempFile(
      CodeSampleGenerator.generateVarCode(),
      '.ts'
    );
    files.push(tsFile);
    
    // Create JavaScript test file
    const jsFile = await FileTestUtils.createTempFile(
      CodeSampleGenerator.generateLooseEqualityCode(),
      '.js'
    );
    files.push(jsFile);
    
    return files;
  }

  /**
   * Clean up test files
   */
  static async cleanupTestFiles(files: string[]): Promise<void> {
    for (const file of files) {
      await FileTestUtils.cleanupTempFile(file);
    }
  }

  /**
   * Measure performance of an operation
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    return { result, duration };
  }
}

// Export convenience functions for backward compatibility
export const createTestFiles = TelemetryTestUtils.createTestFiles;
export const cleanupTestFiles = TelemetryTestUtils.cleanupTestFiles;
export const measurePerformance = TelemetryTestUtils.measurePerformance;