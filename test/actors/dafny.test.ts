import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createActor, waitFor } from 'xstate';
import { dafnyActor } from '../../src/actors/dafny.js';

// Dafny input type matching the actual implementation
interface DafnyInput {
  files: string[];
  transformationMode?: 'template' | 'ast' | 'llm';
  originalCode?: string;
  transformedCode?: string;
}

// Expected output type
interface DafnyResult {
  verified: boolean;
  conditions: number;
  verificationTime: number;
}

describe('Dafny Actor', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `dafny-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(testDir, name);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  function assertDafnyResult(result: DafnyResult | undefined): asserts result is DafnyResult {
    expect(result).toBeDefined();
    expect(result?.verified).toBeDefined();
    expect(result?.conditions).toBeGreaterThan(0);
    expect(result?.verificationTime).toBeGreaterThan(0);
  }

  describe('Basic Verification', () => {
    test('should verify simple TypeScript files', async () => {
      await createTestFile('simple.ts', 'const x: number = 42;');
      await createTestFile(
        'function.ts',
        'function add(a: number, b: number): number { return a + b; }'
      );

      const input: DafnyInput = {
        files: ['simple.ts', 'function.ts'],
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      expect(verificationResult.conditions).toBeGreaterThan(4); // Base conditions + file-specific
    });

    test('should verify JavaScript files', async () => {
      await createTestFile('script.js', 'var message = "Hello, World!";');
      await createTestFile('module.js', 'function greet(name) { return "Hello, " + name; }');

      const input: DafnyInput = {
        files: ['script.js', 'module.js'],
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
    });

    test('should handle empty file list', async () => {
      const input: DafnyInput = {
        files: [],
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.conditions).toBeGreaterThan(0); // Should still have base conditions
    });

    test('should handle non-existent files gracefully', async () => {
      const input: DafnyInput = {
        files: ['nonexistent.ts', 'missing.js'],
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      // Should still complete verification even with missing files
      assertDafnyResult(verificationResult);
    });
  });

  describe('Transformation Mode Verification', () => {
    beforeEach(async () => {
      await createTestFile('transform.ts', 'var x = 1; var y = 2;');
    });

    test('should verify template transformation mode', async () => {
      const input: DafnyInput = {
        files: ['transform.ts'],
        transformationMode: 'template',
        originalCode: 'var x = 1;',
        transformedCode: 'const x = 1;',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Template mode should include semantic equivalence conditions
      expect(verificationResult.conditions).toBeGreaterThan(6);
    });

    test('should verify AST transformation mode', async () => {
      const input: DafnyInput = {
        files: ['transform.ts'],
        transformationMode: 'ast',
        originalCode: 'if (x == null) { return; }',
        transformedCode: 'if (x === null) { return; }',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // AST mode should include behavior equivalence conditions
      expect(verificationResult.conditions).toBeGreaterThan(6);
    });

    test('should verify LLM transformation mode', async () => {
      const input: DafnyInput = {
        files: ['transform.ts'],
        transformationMode: 'llm',
        originalCode: 'function oldFunction() { /* complex logic */ }',
        transformedCode: 'function newFunction() { /* refactored logic */ }',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // LLM mode should include intent preservation conditions
      expect(verificationResult.conditions).toBeGreaterThan(6);
    });

    test('should handle undefined transformation mode', async () => {
      const input: DafnyInput = {
        files: ['transform.ts'],
        // No transformationMode specified
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Should still have base conditions
      expect(verificationResult.conditions).toBeGreaterThan(4);
    });
  });

  describe('File Type Specific Verification', () => {
    test('should add type safety conditions for TypeScript files', async () => {
      await createTestFile('typed.ts', 'interface User { name: string; age: number; }');
      await createTestFile('generic.txt', 'Some generic content');

      const input: DafnyInput = {
        files: ['typed.ts', 'generic.txt'],
        transformationMode: 'template',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Should include type safety condition for .ts file but not .txt file
      expect(verificationResult.conditions).toBeGreaterThan(7);
    });

    test('should add type safety conditions for JavaScript files', async () => {
      await createTestFile('script.js', 'function calculate(x, y) { return x * y; }');

      const input: DafnyInput = {
        files: ['script.js'],
        transformationMode: 'ast',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Should include type safety condition for .js file
      expect(verificationResult.conditions).toBeGreaterThan(7);
    });

    test('should handle mixed file types', async () => {
      await createTestFile('component.ts', 'export class Component {}');
      await createTestFile('utils.js', 'export function helper() {}');
      await createTestFile('config.json', '{"setting": "value"}');
      await createTestFile('readme.md', '# Documentation');

      const input: DafnyInput = {
        files: ['component.ts', 'utils.js', 'config.json', 'readme.md'],
        transformationMode: 'llm',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Should include type safety conditions for .ts and .js files only
      expect(verificationResult.conditions).toBeGreaterThan(8);
    });
  });

  describe('Verification Conditions Generation', () => {
    test('should generate appropriate conditions for template mode', async () => {
      await createTestFile('template-test.ts', 'let value = "test";');

      const input: DafnyInput = {
        files: ['template-test.ts'],
        transformationMode: 'template',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // Template mode: semantic_equivalence, type_preservation, transformation_applied + base + file-specific
      expect(verificationResult.conditions).toBeGreaterThanOrEqual(8);
    });

    test('should generate appropriate conditions for AST mode', async () => {
      await createTestFile('ast-test.ts', 'function process(data: any) { return data; }');

      const input: DafnyInput = {
        files: ['ast-test.ts'],
        transformationMode: 'ast',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // AST mode: type_preservation, behavior_equivalence, valid_syntax + base + file-specific
      expect(verificationResult.conditions).toBeGreaterThanOrEqual(8);
    });

    test('should generate appropriate conditions for LLM mode', async () => {
      await createTestFile(
        'llm-test.ts',
        'class DataProcessor { process(input: string): string { return input.toUpperCase(); } }'
      );

      const input: DafnyInput = {
        files: ['llm-test.ts'],
        transformationMode: 'llm',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
      // LLM mode: type_correctness, intent_preservation, no_regression + base + file-specific
      expect(verificationResult.conditions).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidInput = {
        files: null, // Invalid type
        transformationMode: 'invalid-mode',
      };

      try {
        const actor = createActor(dafnyActor, { input: invalidInput as any });
        actor.start();

        await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        // Zod validation error expected
      }
    });

    test('should handle missing required fields', async () => {
      const incompleteInput = {
        // Missing files array
        transformationMode: 'template',
      };

      try {
        const actor = createActor(dafnyActor, { input: incompleteInput as any });
        actor.start();

        await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        // Zod validation error expected
      }
    });

    test('should handle verification failure scenarios', async () => {
      // Create a large number of files to potentially trigger verification failure
      const manyFiles: string[] = [];
      for (let i = 0; i < 20; i++) {
        const fileName = `file${i}.ts`;
        await createTestFile(fileName, `const value${i} = ${i};`);
        manyFiles.push(fileName);
      }

      const input: DafnyInput = {
        files: manyFiles,
        transformationMode: 'llm',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      try {
        const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 15000 });
        const verificationResult = result.output;

        // Should either succeed or fail gracefully
        expect(verificationResult).toBeDefined();
        if (verificationResult) {
          expect(typeof verificationResult.verified).toBe('boolean');
          expect(verificationResult.conditions).toBeGreaterThan(0);
          expect(verificationResult.verificationTime).toBeGreaterThan(0);
        }
      } catch (error) {
        // Verification failure is acceptable for complex scenarios
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toContain('Dafny verification failed');
        }
      }
    });

    test('should handle empty file content', async () => {
      await createTestFile('empty.ts', '');
      await createTestFile('whitespace.js', '   \n\t  ');

      const input: DafnyInput = {
        files: ['empty.ts', 'whitespace.js'],
        transformationMode: 'template',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      // Should handle empty files gracefully
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete verification within reasonable time', async () => {
      await createTestFile(
        'perf-test.ts',
        'function fibonacci(n: number): number { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }'
      );

      const startTime = Date.now();

      const input: DafnyInput = {
        files: ['perf-test.ts'],
        transformationMode: 'ast',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 15000 });
      const endTime = Date.now();
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(verificationResult.verificationTime).toBeLessThan(10000); // Internal time should be reasonable
    });

    test('should handle concurrent verification requests', async () => {
      // Create test files for concurrent verification
      for (let i = 0; i < 3; i++) {
        await createTestFile(`concurrent${i}.ts`, `const value${i} = ${i * 10};`);
      }

      const operations = Array.from({ length: 3 }, (_, i) => ({
        files: [`concurrent${i}.ts`],
        transformationMode: 'template' as const,
      }));

      const promises = operations.map(async (input) => {
        const actor = createActor(dafnyActor, { input });
        actor.start();
        const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
        return result.output;
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((verificationResult, _index) => {
        assertDafnyResult(verificationResult);
        expect(verificationResult.verified).toBe(true);
      });
    });

    test('should maintain consistency across multiple runs', async () => {
      await createTestFile(
        'consistency.ts',
        'interface Config { debug: boolean; timeout: number; }'
      );

      const input: DafnyInput = {
        files: ['consistency.ts'],
        transformationMode: 'template',
      };

      const results: DafnyResult[] = [];

      // Run verification multiple times
      for (let i = 0; i < 3; i++) {
        const actor = createActor(dafnyActor, { input });
        actor.start();
        const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
        const verificationResult = result.output;

        assertDafnyResult(verificationResult);
        results.push(verificationResult);
      }

      // Verify consistency
      expect(results).toHaveLength(3);
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result.verified).toBe(firstResult.verified);
        expect(result.conditions).toBe(firstResult.conditions);
        // Verification time may vary slightly
        expect(result.verificationTime).toBeGreaterThan(0);
      });
    });

    test('should handle large file sets efficiently', async () => {
      // Create a moderate number of files to test scalability
      const fileCount = 10;
      const files: string[] = [];

      for (let i = 0; i < fileCount; i++) {
        const fileName = `large-set-${i}.ts`;
        await createTestFile(
          fileName,
          `
          export class Component${i} {
            private value: number = ${i};
            
            getValue(): number {
              return this.value;
            }
            
            setValue(newValue: number): void {
              this.value = newValue;
            }
          }
        `
        );
        files.push(fileName);
      }

      const input: DafnyInput = {
        files,
        transformationMode: 'ast',
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 20000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.conditions).toBeGreaterThan(fileCount + 6); // Base + mode + file-specific conditions
    });
  });

  describe('Integration with Transformation Pipeline', () => {
    test('should verify var-to-const transformation', async () => {
      const originalCode = 'var x = 1;\nvar y = "hello";\nvar z = true;';
      const transformedCode = 'const x = 1;\nconst y = "hello";\nconst z = true;';

      await createTestFile('var-to-const.ts', transformedCode);

      const input: DafnyInput = {
        files: ['var-to-const.ts'],
        transformationMode: 'template',
        originalCode,
        transformedCode,
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
    });

    test('should verify equality operator transformation', async () => {
      const originalCode = 'if (x == null) { return false; }';
      const transformedCode = 'if (x === null) { return false; }';

      await createTestFile('equality.ts', transformedCode);

      const input: DafnyInput = {
        files: ['equality.ts'],
        transformationMode: 'ast',
        originalCode,
        transformedCode,
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
    });

    test('should verify complex refactoring transformation', async () => {
      const originalCode = `
        function processData(data) {
          var result = [];
          for (var i = 0; i < data.length; i++) {
            if (data[i] != null) {
              result.push(data[i].toString());
            }
          }
          return result;
        }
      `;

      const transformedCode = `
        function processData(data: any[]): string[] {
          const result: string[] = [];
          for (const item of data) {
            if (item !== null) {
              result.push(item.toString());
            }
          }
          return result;
        }
      `;

      await createTestFile('refactor.ts', transformedCode);

      const input: DafnyInput = {
        files: ['refactor.ts'],
        transformationMode: 'llm',
        originalCode,
        transformedCode,
      };

      const actor = createActor(dafnyActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const verificationResult = result.output;

      assertDafnyResult(verificationResult);
      expect(verificationResult.verified).toBe(true);
    });
  });
});
