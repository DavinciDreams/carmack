import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor, waitFor } from 'xstate';
import { transformationActor } from '../../src/actors/transformation.js';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Test input type that matches the transformation actor
interface TransformationInput {
  mode: 'template' | 'ast' | 'llm';
  files: string[];
  patterns: Array<{
    id: string;
    language: string;
    pattern: string;
    replacement: string;
    description: string;
    complexity: number;
    riskLevel: 'low' | 'medium' | 'high';
    mode: 'template' | 'ast' | 'llm';
  }>;
  request?: any;
}

describe('Transformation Actor', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(testDir, name);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  async function readTestFile(filePath: string): Promise<string> {
    return await readFile(filePath, 'utf-8');
  }

  describe('Template Transformations', () => {
    test('should apply simple template transformation', async () => {
      const testFile = await createTestFile('simple.ts', `
function oldFunction() {
  var x = 1;
  return x;
}
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [{
          id: 'smart-var-to-const-let',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult).toBeDefined();
      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toContain(testFile);

      // Verify the transformation was applied
      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('const x = 1');
    });

    test('should handle multiple pattern transformations', async () => {
      const testFile = await createTestFile('multiple.ts', `
function testFunction() {
  var x = 1;
  var y = 2;
  if (x == y) {
    console.log("equal");
  }
  return x != y;
}
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [
          {
            id: 'smart-var-to-const-let',
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
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('const x = 1');
      expect(modifiedContent).toContain('const y = 2');
      expect(modifiedContent).toContain('x === y');
      expect(modifiedContent).toContain('x !== y');
    });

    test('should handle console log to error transformation', async () => {
      const testFile = await createTestFile('console.ts', `
function logError() {
  console.log('Error: Something went wrong');
  console.log("Error: Another issue");
}
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [{
          id: 'console-log-to-console-error',
          language: 'typescript',
          pattern: 'console.log(\'Error:',
          replacement: 'console.error(\'Error:',
          description: 'Convert console.log to console.error for errors',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('console.error(\'Error:');
      expect(modifiedContent).toContain('console.error("Error:');
    });

    test('should handle array includes transformation', async () => {
      const testFile = await createTestFile('includes.ts', `
function hasItem(arr: string[], item: string) {
  return arr.indexOf(item) !== -1;
}
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [{
          id: 'array-includes-instead-of-indexof',
          language: 'typescript',
          pattern: '$ARRAY.indexOf($ITEM) !== -1',
          replacement: '$ARRAY.includes($ITEM)',
          description: 'Use includes instead of indexOf',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('arr.includes(item)');
    });
  });

  describe('AST Transformations', () => {
    test('should apply AST-based transformation', async () => {
      const testFile = await createTestFile('ast.ts', `
function asyncFunction() {
  var result = "test";
  return result;
}
      `);

      const input: TransformationInput = {
        mode: 'ast',
        files: [testFile],
        patterns: [{
          id: 'smart-var-to-const-let',
          language: 'typescript',
          pattern: 'var $NAME = $VALUE',
          replacement: 'const $NAME = $VALUE',
          description: 'Convert var to const using AST',
          complexity: 3,
          riskLevel: 'medium',
          mode: 'ast',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('ast');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('const result = "test"');
    });

    test('should handle promise to async/await transformation', async () => {
      const testFile = await createTestFile('promise.ts', `
function handlePromise() {
  promise.then((result) => {
    console.log(result);
  });
}
      `);

      const input: TransformationInput = {
        mode: 'ast',
        files: [testFile],
        patterns: [{
          id: 'promise-to-async-await',
          language: 'typescript',
          pattern: '$PROMISE.then(($PARAM) => { $BODY })',
          replacement: 'const $PARAM = await $PROMISE; $BODY',
          description: 'Convert Promise.then to async/await',
          complexity: 4,
          riskLevel: 'medium',
          mode: 'ast',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('ast');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('const result = await promise');
    });
  });

  describe('LLM Transformations', () => {
    test('should handle LLM transformation request', async () => {
      const testFile = await createTestFile('llm.ts', `
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

      const input: TransformationInput = {
        mode: 'llm',
        files: [testFile],
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
        request: {
          prompt: 'Refactor this complex function to be more readable'
        }
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('llm');
      if (transformationResult?.mode === 'llm') {
        expect(transformationResult.prompt).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths gracefully', async () => {
      const input: TransformationInput = {
        mode: 'template',
        files: ['/nonexistent/file.ts'],
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
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      // Should not throw, but may not modify any files
      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toHaveLength(0);
    });

    test('should respect complexity limits in template mode', async () => {
      const testFile = await createTestFile('complex.ts', `
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

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [{
          id: 'high-complexity-pattern',
          language: 'typescript',
          pattern: 'function veryComplexFunction',
          replacement: 'function refactoredFunction',
          description: 'High complexity transformation',
          complexity: 15, // High complexity - should be filtered out in template mode
          riskLevel: 'high',
          mode: 'template',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      // High complexity patterns should be filtered out in template mode
      expect(transformationResult?.filesModified).toHaveLength(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle multiple files efficiently', async () => {
      const files = await Promise.all([
        createTestFile('file1.ts', 'var x = 1;'),
        createTestFile('file2.ts', 'var y = 2;'),
        createTestFile('file3.ts', 'var z = 3;'),
        createTestFile('file4.ts', 'var w = 4;'),
        createTestFile('file5.ts', 'var v = 5;'),
      ]);

      const input: TransformationInput = {
        mode: 'template',
        files,
        patterns: [{
          id: 'smart-var-to-const-let',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
      };

      const startTime = Date.now();
      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const endTime = Date.now();
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toHaveLength(5);
      
      // Should complete within reasonable time
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should provide transformation count information', async () => {
      const testFile = await createTestFile('timing.ts', `
var a = 1;
var b = 2;
var c = 3;
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [{
          id: 'smart-var-to-const-let',
          language: 'typescript',
          pattern: 'var $VAR = $VALUE',
          replacement: 'const $VAR = $VALUE',
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        }],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.transformationsApplied).toBeGreaterThan(0);
      expect(transformationResult?.transformationsApplied).toBeLessThanOrEqual(3);
    });
  });

  describe('Pattern Filtering', () => {
    test('should filter patterns by complexity in template mode', async () => {
      const testFile = await createTestFile('filter.ts', `
var x = 1;
function test() { return "hello"; }
      `);

      const input: TransformationInput = {
        mode: 'template',
        files: [testFile],
        patterns: [
          {
            id: 'low-complexity',
            language: 'typescript',
            pattern: 'var $VAR = $VALUE',
            replacement: 'const $VAR = $VALUE',
            description: 'Low complexity pattern',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template',
          },
          {
            id: 'high-complexity',
            language: 'typescript',
            pattern: 'function $NAME',
            replacement: 'const $NAME = ',
            description: 'High complexity pattern',
            complexity: 5, // Too high for template mode
            riskLevel: 'high',
            mode: 'template',
          },
        ],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('template');
      expect(transformationResult?.filesModified).toContain(testFile);

      const modifiedContent = await readTestFile(testFile);
      expect(modifiedContent).toContain('const x = 1'); // Low complexity applied
      expect(modifiedContent).toContain('function test'); // High complexity not applied
    });

    test('should only apply AST patterns in AST mode', async () => {
      const testFile = await createTestFile('mode-filter.ts', `
var x = 1;
var y = 2;
      `);

      const input: TransformationInput = {
        mode: 'ast',
        files: [testFile],
        patterns: [
          {
            id: 'template-pattern',
            language: 'typescript',
            pattern: 'var x = 1',
            replacement: 'const x = 1',
            description: 'Template pattern',
            complexity: 1,
            riskLevel: 'low',
            mode: 'template', // Should be ignored in AST mode
          },
          {
            id: 'ast-pattern',
            language: 'typescript',
            pattern: 'var y = 2',
            replacement: 'const y = 2',
            description: 'AST pattern',
            complexity: 3,
            riskLevel: 'medium',
            mode: 'ast', // Should be applied in AST mode
          },
        ],
      };

      const actor = createActor(transformationActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const transformationResult = result.output;

      expect(transformationResult?.mode).toBe('ast');
    });
  });
});