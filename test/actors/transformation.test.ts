import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor, waitFor } from 'xstate';
import { transformationActor } from '../../src/actors/transformation.js';
import type { TransformationRequest, TransformationResult } from '../../src/types.js';
import { createTestHelpers, type TestContext } from '../test-helpers.js';

describe('Transformation Actor', () => {
  let testContext: TestContext;
  let testHelpers: ReturnType<typeof createTestHelpers>;

  beforeEach(async () => {
    testHelpers = createTestHelpers();
    testContext = await testHelpers.setup();
  });

  afterEach(async () => {
    await testHelpers.cleanup(testContext);
  });

  describe('Template Transformations', () => {
    test('should apply simple template transformation', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'simple.ts', `
function oldFunction() {
  var x = 1;
  return x;
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      expect(transformationResult.filesModified).toContain(testFile);
      expect(transformationResult.errors).toHaveLength(0);

      // Verify the transformation was applied
      const modifiedContent = await testHelpers.readFile(testFile);
      expect(modifiedContent).toContain('const x = 1');
      expect(modifiedContent).not.toContain('var x = 1');
    });

    test('should handle multiple pattern transformations', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'multiple.ts', `
function testFunction() {
  var x = 1;
  var y = 2;
  if (x == y) {
    console.log("equal");
  }
  return x != y;
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [
          {
            id: 'var-to-const',
            language: 'typescript',
            pattern: 'var $VAR = $VALUE',
            replacement: 'const $VAR = $VALUE',
            description: 'Convert var to const',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
          {
            id: 'strict-equality',
            language: 'typescript',
            pattern: '$A == $B',
            replacement: '$A === $B',
            description: 'Use strict equality',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
          {
            id: 'strict-inequality',
            language: 'typescript',
            pattern: '$A != $B',
            replacement: '$A !== $B',
            description: 'Use strict inequality',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
        ],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      expect(transformationResult.filesModified).toContain(testFile);

      const modifiedContent = await testHelpers.readFile(testFile);
      expect(modifiedContent).toContain('const x = 1');
      expect(modifiedContent).toContain('const y = 2');
      expect(modifiedContent).toContain('x === y');
      expect(modifiedContent).toContain('x !== y');
    });

    test('should handle dry run mode', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'dryrun.ts', `
var x = 1;
var y = 2;
      `);

      const originalContent = await testHelpers.readFile(testFile);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: true,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      expect(transformationResult.request.dryRun).toBe(true);

      // File should not be modified in dry run
      const currentContent = await testHelpers.readFile(testFile);
      expect(currentContent).toBe(originalContent);
    });
  });

  describe('AST Transformations', () => {
    test('should apply AST-based transformation', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'ast.ts', `
function asyncFunction() {
  return new Promise((resolve) => {
    setTimeout(() => resolve("done"), 1000);
  });
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'ast',
        patterns: [{
          id: 'promise-to-async',
          language: 'typescript',
          pattern: 'function $NAME() { return new Promise($BODY) }',
          replacement: 'async function $NAME() { $BODY }',
          description: 'Convert Promise to async/await',
          complexity: 3,
          riskLevel: 'medium',
          mode: 'ast',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      expect(transformationResult.mode).toBe('ast');
    });

    test('should handle complex AST patterns', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'complex-ast.ts', `
class TestClass {
  constructor(private value: number) {}
  
  getValue() {
    return this.value;
  }
  
  setValue(newValue: number) {
    this.value = newValue;
  }
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'ast',
        patterns: [{
          id: 'add-readonly',
          language: 'typescript',
          pattern: 'private $NAME: $TYPE',
          replacement: 'private readonly $NAME: $TYPE',
          description: 'Add readonly to private fields',
          complexity: 2,
          riskLevel: 'low',
          mode: 'ast',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
    });
  });

  describe('LLM Transformations', () => {
    test('should handle LLM transformation request', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'llm.ts', `
// This function needs refactoring
function complexFunction(a: any, b: any, c: any) {
  if (a) {
    if (b) {
      if (c) {
        return a + b + c;
      }
    }
  }
  return 0;
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'llm',
        patterns: [{
          id: 'refactor-complex',
          language: 'typescript',
          pattern: 'function complexFunction',
          replacement: '// Refactored function',
          description: 'Refactor complex nested conditions',
          complexity: 5,
          riskLevel: 'high',
          mode: 'llm',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const transformationResult = result.output as TransformationResult;

      // LLM transformations might not be available in test environment
      expect(['completed', 'partial']).toContain(transformationResult.status);
      expect(transformationResult.mode).toBe('llm');
    });

    test('should fallback gracefully when LLM unavailable', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'llm-fallback.ts', `
function simpleFunction() {
  return "hello";
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'llm',
        patterns: [{
          id: 'add-types',
          language: 'typescript',
          pattern: 'function simpleFunction()',
          replacement: 'function simpleFunction(): string',
          description: 'Add return type annotation',
          complexity: 1,
          riskLevel: 'low',
          mode: 'llm',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      // Should handle gracefully even if LLM is not available
      expect(['completed', 'partial', 'failed']).toContain(transformationResult.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths', async () => {
      const request: TransformationRequest = {
        targetFiles: ['/nonexistent/file.ts'],
        transformationType: 'template',
        patterns: [{
          id: 'test-pattern',
          language: 'typescript',
          pattern: 'var $VAR',
          replacement: 'const $VAR',
          description: 'Test pattern',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('failed');
      expect(transformationResult.errors.length).toBeGreaterThan(0);
    });

    test('should handle syntax errors in patterns', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'syntax-error.ts', `
function test() {
  return "hello";
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'invalid-pattern',
          language: 'typescript',
          pattern: 'function $NAME() { [INVALID SYNTAX',
          replacement: 'function $NAME() { return "fixed"; }',
          description: 'Invalid pattern',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      // Should handle gracefully
      expect(['partial', 'failed']).toContain(transformationResult.status);
    });

    test('should respect complexity limits', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'complex.ts', `
function veryComplexFunction() {
  // This function has high complexity
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (i > j) {
        if (i % 2 === 0) {
          if (j % 2 === 0) {
            console.log(i, j);
          }
        }
      }
    }
  }
}
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'high-complexity-pattern',
          language: 'typescript',
          pattern: 'function veryComplexFunction',
          replacement: 'function refactoredFunction',
          description: 'High complexity transformation',
          complexity: 15, // Exceeds maxComplexity
          riskLevel: 'high',
          mode: 'template',
        }],
        maxComplexity: 10, // Lower than pattern complexity
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      // Should skip high complexity transformations
      expect(transformationResult.filesModified).toHaveLength(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle multiple files efficiently', async () => {
      const files = await Promise.all([
        testHelpers.createTestFile(testContext, 'file1.ts', 'var x = 1;'),
        testHelpers.createTestFile(testContext, 'file2.ts', 'var y = 2;'),
        testHelpers.createTestFile(testContext, 'file3.ts', 'var z = 3;'),
        testHelpers.createTestFile(testContext, 'file4.ts', 'var w = 4;'),
        testHelpers.createTestFile(testContext, 'file5.ts', 'var v = 5;'),
      ]);

      const request: TransformationRequest = {
        targetFiles: files,
        transformationType: 'template',
        patterns: [{
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const startTime = Date.now();
      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const endTime = Date.now();
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      expect(transformationResult.filesModified).toHaveLength(5);
      
      // Should complete within reasonable time
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should provide accurate timing information', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'timing.ts', `
var a = 1;
var b = 2;
var c = 3;
      `);

      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.startTime).toBeGreaterThan(0);
      expect(transformationResult.endTime).toBeGreaterThan(transformationResult.startTime);
      expect(transformationResult.endTime - transformationResult.startTime).toBeGreaterThan(0);
    });
  });

  describe('Integration with Other Systems', () => {
    test('should work with validation results', async () => {
      const testFile = await testHelpers.createTestFile(testContext, 'validation.ts', `
function testFunction() {
  var x = 1;
  return x;
}
      `);

      // First validate, then transform
      const request: TransformationRequest = {
        targetFiles: [testFile],
        transformationType: 'template',
        patterns: [{
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
        maxComplexity: 10,
        dryRun: false,
      };

      const actor = createActor(transformationActor, { input: request });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output as TransformationResult;

      expect(transformationResult.status).toBe('completed');
      
      // Verify the transformation maintains valid TypeScript
      const modifiedContent = await testHelpers.readFile(testFile);
      expect(modifiedContent).toContain('const x = 1');
      
      // Content should still be valid TypeScript
      expect(modifiedContent).toMatch(/function\s+testFunction\s*\(\s*\)\s*\{/);
      expect(modifiedContent).toMatch(/return\s+x;/);
    });
  });
});