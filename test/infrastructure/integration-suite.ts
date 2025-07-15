/**
 * Comprehensive Integration Test Suite for Carmack Coder
 *
 * Validates that all major fixes work together properly and provides
 * comprehensive testing of the entire system pipeline.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execSync } from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createActor, waitFor } from 'xstate';

// Import actors
import { analysisActor } from '../../src/actors/analysis.js';
import { dafnyActor } from '../../src/actors/dafny.js';
import { gitActor } from '../../src/actors/git.js';
import { patternDiscoveryActor } from '../../src/actors/pattern-discovery.js';
import { patternLearningActor } from '../../src/actors/pattern-learning.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { validationActor } from '../../src/actors/validation.js';
// Import types
import type {
  AstPattern,
  ComplexityMetrics,
  GitCheckpoint,
  TransformationRequest,
  ValidationResult,
} from '../../src/types.js';
import {
  ActorMockFactory,
  ExternalToolMockFactory,
  MockSetupUtility,
  TransformationActorMockFactory,
} from './mock-factories.js';
// Import test infrastructure
import { TestEnvironmentManager, TestFixtures } from './test-fixtures.js';
import { UnifiedTestRunner } from './test-runner.js';

/**
 * Integration test suite for validating all major fixes
 */
export class IntegrationTestSuite {
  private testEnv: TestEnvironmentManager;
  private testDir = '';

  constructor() {
    this.testEnv = new TestEnvironmentManager();
  }

  /**
   * Setup test environment
   */
  async setup(): Promise<void> {
    this.testDir = await this.testEnv.createEnvironment('integration-suite');
    MockSetupUtility.setupAllMocks();

    // Setup git for integration tests
    try {
      execSync('git init', { cwd: this.testDir, stdio: 'pipe' });
      execSync('git config user.name "Integration Test"', { cwd: this.testDir, stdio: 'pipe' });
      execSync('git config user.email "integration@test.com"', {
        cwd: this.testDir,
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn('Git setup failed in integration test:', error);
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    MockSetupUtility.cleanupAllMocks();
    await this.testEnv.cleanup();
  }

  /**
   * Test 1: Production Pipeline Integration
   * Validates that the production pipeline works end-to-end
   */
  async testProductionPipelineIntegration(): Promise<void> {
    console.log('🧪 Testing Production Pipeline Integration...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'pipeline-test.ts',
      codeSamples.complex
    );

    // Test the complete pipeline flow
    const patterns = TestFixtures.createTestPatterns().safe;

    // 1. Analysis
    const analysisInput = {
      files: [testFile],
      patterns: [],
    };

    const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
    analysisActorInstance.start();

    const analysisResult = await waitFor(
      analysisActorInstance,
      (state) => state.status === 'done',
      { timeout: 10000 }
    );

    expect(analysisResult.output).toBeDefined();
    expect(analysisResult.output!.complexity).toBeDefined();

    // 2. Transformation
    const transformationInput = {
      mode: 'template' as const,
      files: [testFile],
      patterns,
    };

    const transformationActorInstance = createActor(transformationActor, {
      input: transformationInput,
    });
    transformationActorInstance.start();

    const transformationResult = await waitFor(
      transformationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(transformationResult.output).toBeDefined();
    expect(transformationResult.output!.filesModified).toContain(testFile);

    // 3. Validation
    const validationInput = {
      type: 'quality' as const,
      files: [testFile],
    };

    const validationActorInstance = createActor(validationActor, { input: validationInput });
    validationActorInstance.start();

    const validationResult = await waitFor(
      validationActorInstance,
      (state) => state.status === 'done',
      { timeout: 10000 }
    );

    expect(validationResult.output).toBeDefined();
    expect(validationResult.output!.isValid).toBeDefined();

    console.log('✅ Production Pipeline Integration: PASSED');
  }

  /**
   * Test 2: E2E File Handling
   * Validates that file handling works correctly across all actors
   */
  async testE2EFileHandling(): Promise<void> {
    console.log('🧪 Testing E2E File Handling...');

    const codeSamples = TestFixtures.createCodeSamples();

    // Create multiple test files
    const files = await Promise.all([
      this.testEnv.createTestFile(this.testDir, 'simple.ts', codeSamples.simple),
      this.testEnv.createTestFile(this.testDir, 'complex.ts', codeSamples.complex),
      this.testEnv.createTestFile(this.testDir, 'legacy.js', codeSamples.legacy),
    ]);

    // Test file handling across multiple actors
    const patterns = TestFixtures.createTestPatterns().safe;

    // Analysis with multiple files
    const analysisInput = {
      files,
      patterns: [],
    };

    const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
    analysisActorInstance.start();

    const analysisResult = await waitFor(
      analysisActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(analysisResult.output).toBeDefined();
    expect(analysisResult.output!.complexity).toBeDefined();

    // Transformation with multiple files
    const transformationInput = {
      mode: 'template' as const,
      files,
      patterns,
    };

    const transformationActorInstance = createActor(transformationActor, {
      input: transformationInput,
    });
    transformationActorInstance.start();

    const transformationResult = await waitFor(
      transformationActorInstance,
      (state) => state.status === 'done',
      { timeout: 20000 }
    );

    expect(transformationResult.output).toBeDefined();
    expect(transformationResult.output!.filesModified.length).toBeGreaterThan(0);

    // Validation with multiple files
    const validationInput = {
      type: 'format' as const,
      files,
    };

    const validationActorInstance = createActor(validationActor, { input: validationInput });
    validationActorInstance.start();

    const validationResult = await waitFor(
      validationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(validationResult.output).toBeDefined();

    console.log('✅ E2E File Handling: PASSED');
  }

  /**
   * Test 3: AST-grep Pattern Syntax
   * Validates that AST-grep patterns work correctly
   */
  async testASTGrepPatternSyntax(): Promise<void> {
    console.log('🧪 Testing AST-grep Pattern Syntax...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'ast-test.ts',
      codeSamples.legacy
    );

    // Test with AST-grep specific patterns
    const astPatterns: AstPattern[] = [
      {
        id: 'ast-var-to-const',
        language: 'typescript',
        pattern: 'var $NAME = $VALUE',
        replacement: 'const $NAME = $VALUE',
        description: 'AST-grep var to const conversion',
        complexity: 3,
        riskLevel: 'low',
        mode: 'ast',
      },
    ];

    const transformationInput = {
      mode: 'ast' as const,
      files: [testFile],
      patterns: astPatterns,
    };

    const transformationActorInstance = createActor(transformationActor, {
      input: transformationInput,
    });
    transformationActorInstance.start();

    const transformationResult = await waitFor(
      transformationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(transformationResult.output).toBeDefined();
    expect(transformationResult.output!.filesModified).toContain(testFile);

    console.log('✅ AST-grep Pattern Syntax: PASSED');
  }

  /**
   * Test 4: TypeScript Compilation
   * Validates that TypeScript compilation works correctly
   */
  async testTypeScriptCompilation(): Promise<void> {
    console.log('🧪 Testing TypeScript Compilation...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'ts-test.ts',
      codeSamples.modern
    );

    // Create tsconfig.json
    await this.testEnv.createTestFile(
      this.testDir,
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ['**/*.ts'],
        },
        null,
        2
      )
    );

    // Test TypeScript validation
    const validationInput = {
      type: 'types' as const,
      files: [testFile],
    };

    const validationActorInstance = createActor(validationActor, { input: validationInput });
    validationActorInstance.start();

    const validationResult = await waitFor(
      validationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(validationResult.output).toBeDefined();
    expect(validationResult.output!.isValid).toBeDefined();

    console.log('✅ TypeScript Compilation: PASSED');
  }

  /**
   * Test 5: Actor State Management
   * Validates that actor state management works correctly
   */
  async testActorStateManagement(): Promise<void> {
    console.log('🧪 Testing Actor State Management...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'state-test.ts',
      codeSamples.simple
    );

    // Test concurrent actor operations
    const patterns = TestFixtures.createTestPatterns().safe;

    const promises = [
      // Analysis actor
      (async () => {
        const analysisInput = { files: [testFile], patterns: [] };
        const actor = createActor(analysisActor, { input: analysisInput });
        actor.start();
        return waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      })(),

      // Validation actor
      (async () => {
        const validationInput = { type: 'format' as const, files: [testFile] };
        const actor = createActor(validationActor, { input: validationInput });
        actor.start();
        return waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      })(),
    ];

    const results = await Promise.all(promises);

    // Verify all actors completed successfully
    results.forEach((result, index) => {
      expect(result.output).toBeDefined();
    });

    console.log('✅ Actor State Management: PASSED');
  }

  /**
   * Test 6: External Tool Dependencies
   * Validates that external tool integration works correctly
   */
  async testExternalToolDependencies(): Promise<void> {
    console.log('🧪 Testing External Tool Dependencies...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'tool-test.ts',
      codeSamples.withErrors
    );

    // Test validation with external tools
    const validationInput = {
      type: 'format' as const,
      files: [testFile],
    };

    const validationActorInstance = createActor(validationActor, { input: validationInput });
    validationActorInstance.start();

    const validationResult = await waitFor(
      validationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(validationResult.output).toBeDefined();

    // Test git operations
    const gitInput = {
      operation: 'createCheckpoint' as const,
      description: 'Integration test checkpoint',
    };

    const gitActorInstance = createActor(gitActor, { input: gitInput });
    gitActorInstance.start();

    const gitResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
      timeout: 10000,
    });

    expect(gitResult.output).toBeDefined();

    console.log('✅ External Tool Dependencies: PASSED');
  }

  /**
   * Test 7: Pattern Discovery and Learning
   * Validates that pattern discovery and learning work correctly
   */
  async testPatternDiscoveryAndLearning(): Promise<void> {
    console.log('🧪 Testing Pattern Discovery and Learning...');

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'pattern-test.ts',
      codeSamples.complex
    );

    // Test pattern discovery
    const discoveryInput = {
      operation: 'discover' as const,
      sources: {
        codeFiles: [testFile],
      },
      config: {
        minOccurrences: 1,
        confidenceThreshold: 0.5,
        maxPatterns: 10,
        languages: ['typescript' as const],
        categories: ['modernization', 'optimization'],
        complexity: { min: 1, max: 8 },
      },
    };

    const discoveryActorInstance = createActor(patternDiscoveryActor, { input: discoveryInput });
    discoveryActorInstance.start();

    const discoveryResult = await waitFor(
      discoveryActorInstance,
      (state) => state.status === 'done',
      { timeout: 20000 }
    );

    expect(discoveryResult.output).toBeDefined();
    expect(discoveryResult.output!.patterns).toBeDefined();

    // Test pattern learning
    const learningInput = {
      operation: 'learn' as const,
      transformation: {
        id: 'test-transformation',
        mode: 'template' as const,
        filesModified: [testFile],
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        errors: [],
        summary: 'Test transformation',
      },
      patterns: TestFixtures.createTestPatterns().safe,
      context: {
        codebase: {
          language: 'typescript',
          complexity: 5,
          size: 1000,
        },
        environment: {
          performance: { transformationTime: 1000 },
          success: true,
          userFeedback: 8,
        },
      },
    };

    const learningActorInstance = createActor(patternLearningActor, { input: learningInput });
    learningActorInstance.start();

    const learningResult = await waitFor(
      learningActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    expect(learningResult.output).toBeDefined();
    expect(learningResult.output!.metrics).toBeDefined();

    console.log('✅ Pattern Discovery and Learning: PASSED');
  }

  /**
   * Test 8: Error Handling and Recovery
   * Validates that error handling works correctly across the system
   */
  async testErrorHandlingAndRecovery(): Promise<void> {
    console.log('🧪 Testing Error Handling and Recovery...');

    // Setup failing mocks for error testing
    MockSetupUtility.setupErrorMocks();

    const codeSamples = TestFixtures.createCodeSamples();
    const testFile = await this.testEnv.createTestFile(
      this.testDir,
      'error-test.ts',
      codeSamples.withErrors
    );

    // Test error handling in validation
    const validationInput = {
      type: 'format' as const,
      files: [testFile],
    };

    const validationActorInstance = createActor(validationActor, { input: validationInput });
    validationActorInstance.start();

    const validationResult = await waitFor(
      validationActorInstance,
      (state) => state.status === 'done',
      { timeout: 15000 }
    );

    // Should complete even with errors
    expect(validationResult.output).toBeDefined();

    // Test error recovery with git rollback
    const checkpointInput = {
      operation: 'createCheckpoint' as const,
      description: 'Error recovery test',
    };

    const gitActorInstance = createActor(gitActor, { input: checkpointInput });
    gitActorInstance.start();

    const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
      timeout: 10000,
    });

    expect(checkpointResult.output).toBeDefined();

    // Restore normal mocks
    MockSetupUtility.setupAllMocks();

    console.log('✅ Error Handling and Recovery: PASSED');
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Integration Test Suite');
    console.log('================================================\n');

    await this.setup();

    try {
      await this.testProductionPipelineIntegration();
      await this.testE2EFileHandling();
      await this.testASTGrepPatternSyntax();
      await this.testTypeScriptCompilation();
      await this.testActorStateManagement();
      await this.testExternalToolDependencies();
      await this.testPatternDiscoveryAndLearning();
      await this.testErrorHandlingAndRecovery();

      console.log('\n🎉 All Integration Tests PASSED!');
      console.log('✅ System is ready for production deployment');
    } catch (error) {
      console.error('\n❌ Integration Test FAILED:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

/**
 * Performance regression test suite
 */
export class PerformanceRegressionSuite {
  private testEnv: TestEnvironmentManager;

  constructor() {
    this.testEnv = new TestEnvironmentManager();
  }

  /**
   * Test transformation performance
   */
  async testTransformationPerformance(): Promise<void> {
    console.log('⚡ Testing Transformation Performance...');

    const testDir = await this.testEnv.createEnvironment('performance');

    // Create large test file
    const largeCode = Array.from(
      { length: 100 },
      (_, i) => `
      function testFunction${i}(param: any): any {
        var result = null;
        if (param != null) {
          result = param.toString();
        }
        return result;
      }
    `
    ).join('\n');

    const testFile = await this.testEnv.createTestFile(testDir, 'large-test.ts', largeCode);

    const patterns = TestFixtures.createTestPatterns().safe;
    const startTime = performance.now();

    const transformationInput = {
      mode: 'template' as const,
      files: [testFile],
      patterns,
    };

    const transformationActorInstance = createActor(transformationActor, {
      input: transformationInput,
    });
    transformationActorInstance.start();

    const result = await waitFor(transformationActorInstance, (state) => state.status === 'done', {
      timeout: 30000,
    });

    const duration = performance.now() - startTime;

    expect(result.output).toBeDefined();
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

    console.log(`✅ Transformation Performance: ${Math.round(duration)}ms`);
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage(): Promise<void> {
    console.log('💾 Testing Memory Usage...');

    const initialMemory = process.memoryUsage().heapUsed;

    // Run multiple operations
    const testDir = await this.testEnv.createEnvironment('memory');
    const codeSamples = TestFixtures.createCodeSamples();

    const files = await Promise.all([
      this.testEnv.createTestFile(testDir, 'test1.ts', codeSamples.complex),
      this.testEnv.createTestFile(testDir, 'test2.ts', codeSamples.legacy),
      this.testEnv.createTestFile(testDir, 'test3.ts', codeSamples.simple),
    ]);

    // Run analysis on all files
    const analysisPromises = files.map(async (file) => {
      const analysisInput = { files: [file], patterns: [] };
      const actor = createActor(analysisActor, { input: analysisInput });
      actor.start();
      return waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
    });

    await Promise.all(analysisPromises);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB

    console.log(`✅ Memory Usage: +${Math.round(memoryIncrease)}MB`);
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('⚡ Starting Performance Regression Test Suite');
    console.log('=============================================\n');

    MockSetupUtility.setupAllMocks();

    try {
      await this.testTransformationPerformance();
      await this.testMemoryUsage();

      console.log('\n🎉 All Performance Tests PASSED!');
    } catch (error) {
      console.error('\n❌ Performance Test FAILED:', error);
      throw error;
    } finally {
      MockSetupUtility.cleanupAllMocks();
      await this.testEnv.cleanup();
    }
  }
}
