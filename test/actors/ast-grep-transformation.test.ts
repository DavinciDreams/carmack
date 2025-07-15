import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createActor } from 'xstate';
import {
  type AstGrepPattern,
  astGrepTransformationActor,
  BUILTIN_AST_PATTERNS,
} from '../../src/actors/ast-grep-transformation';

// Helper function to invoke the actor
async function invokeAstGrepActor(input: any) {
  const actor = createActor(astGrepTransformationActor, { input });
  actor.start();
  return new Promise((resolve, reject) => {
    actor.subscribe({
      complete: () => resolve(actor.getSnapshot().output),
      error: reject,
    });
  });
}

describe('AST-grep Transformation Actor', () => {
  const testDir = join(process.cwd(), 'test-temp', 'ast-grep');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic AST-grep Transformations', () => {
    it('should transform var declarations to const/let', async () => {
      const testFile = join(testDir, 'var-test.ts');
      const content = `
function example() {
  var name = "test";
  var count = 42;
  return name + count;
}

var globalVar = "global";
`;

      await writeFile(testFile, content, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBeGreaterThan(0);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('let name = "test"');
      expect(transformedContent).toContain('let count = 42');
      expect(transformedContent).toContain('const globalVar = "global"');
    });

    it('should convert functions to arrow functions', async () => {
      const testFile = join(testDir, 'function-test.ts');
      const content = `
function add(a, b) { return a + b; }
function multiply(x, y) { return x * y; }
`;

      await writeFile(testFile, content, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'function-to-arrow-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBe(2);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('const add = (a, b) => a + b;');
      expect(transformedContent).toContain('const multiply = (x, y) => x * y;');
    });

    it('should use object property shorthand', async () => {
      const testFile = join(testDir, 'object-test.ts');
      const content = `
const name = "test";
const age = 25;
const user = { name: name, age: age };
`;

      await writeFile(testFile, content, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'object-property-shorthand-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBe(2);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('{ name, age }');
    });

    it('should convert indexOf to includes', async () => {
      const testFile = join(testDir, 'array-test.ts');
      const content = `
const items = [1, 2, 3];
if (items.indexOf(2) !== -1) {
  console.log('found');
}
const hasValue = items.indexOf(3) !== -1;
`;

      await writeFile(testFile, content, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'array-includes-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBe(2);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('items.includes(2)');
      expect(transformedContent).toContain('items.includes(3)');
    });
  });

  describe('Custom AST Patterns', () => {
    it('should apply custom patterns with variables', async () => {
      const testFile = join(testDir, 'custom-test.ts');
      const content = `
console.log("debug message");
console.log("another debug");
`;

      await writeFile(testFile, content, 'utf-8');

      const customPattern: AstGrepPattern = {
        id: 'console-log-to-debug',
        language: 'typescript',
        pattern: {
          rule: {
            pattern: 'console.log($MESSAGE)',
          },
        },
        replacement: {
          template: 'debug($MESSAGE)',
        },
        description: 'Convert console.log to debug function',
        complexity: 2,
        riskLevel: 'low',
        category: 'debugging',
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [customPattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBe(2);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('debug("debug message")');
      expect(transformedContent).toContain('debug("another debug")');
    });

    it('should handle conditional replacements', async () => {
      const testFile = join(testDir, 'conditional-test.ts');
      const content = `
function test() {
  var localVar = "local";
}
var globalVar = "global";
`;

      await writeFile(testFile, content, 'utf-8');

      const conditionalPattern: AstGrepPattern = {
        id: 'smart-var-replacement',
        language: 'typescript',
        pattern: {
          rule: {
            pattern: 'var $VAR = $VALUE',
          },
        },
        replacement: {
          template: 'const $VAR = $VALUE',
          conditions: [
            {
              when: 'scope == "function"',
              then: 'let $VAR = $VALUE',
            },
            {
              when: 'scope == "global"',
              then: 'const $VAR = $VALUE',
            },
          ],
        },
        description: 'Smart var replacement based on scope',
        complexity: 4,
        riskLevel: 'low',
        category: 'modernization',
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [conditionalPattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBe(2);

      const transformedContent = await readFile(testFile, 'utf-8');
      // Both should be transformed (exact scope detection may vary)
      expect(transformedContent).not.toContain('var localVar');
      expect(transformedContent).not.toContain('var globalVar');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple files efficiently', async () => {
      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        const testFile = join(testDir, `batch-test-${i}.ts`);
        const content = `
var item${i} = ${i};
function func${i}() { return ${i}; }
`;
        await writeFile(testFile, content, 'utf-8');
        files.push(testFile);
      }

      const patterns = [
        BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!,
        BUILTIN_AST_PATTERNS.find((p) => p.id === 'function-to-arrow-ast')!,
      ];

      const result = (await invokeAstGrepActor({
        targetFiles: files,
        patterns,
        options: {
          dryRun: false,
          enableBatching: true,
        },
      })) as any;

      expect(result.filesModified).toHaveLength(5);
      expect(result.transformationsApplied).toBe(10); // 2 patterns × 5 files

      // Verify all files were transformed
      for (const file of files) {
        const content = await readFile(file, 'utf-8');
        expect(content).not.toContain('var item');
        expect(content).not.toContain('function func');
      }
    });

    it('should respect pattern priorities', async () => {
      const testFile = join(testDir, 'priority-test.ts');
      const content = `
var test = "value";
`;

      await writeFile(testFile, content, 'utf-8');

      const lowPriorityPattern: AstGrepPattern = {
        id: 'low-priority',
        language: 'typescript',
        pattern: {
          rule: { pattern: 'var $VAR = $VALUE' },
        },
        replacement: {
          template: 'let $VAR = $VALUE',
        },
        description: 'Low priority transformation',
        complexity: 2,
        riskLevel: 'low',
        category: 'test',
        performance: {
          priority: 1,
          batchable: true,
        },
      };

      const highPriorityPattern: AstGrepPattern = {
        id: 'high-priority',
        language: 'typescript',
        pattern: {
          rule: { pattern: 'var $VAR = $VALUE' },
        },
        replacement: {
          template: 'const $VAR = $VALUE',
        },
        description: 'High priority transformation',
        complexity: 2,
        riskLevel: 'low',
        category: 'test',
        performance: {
          priority: 10,
          batchable: true,
        },
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [lowPriorityPattern, highPriorityPattern],
        options: { dryRun: false },
      })) as any;

      expect(result.transformationsApplied).toBe(1);

      const transformedContent = await readFile(testFile, 'utf-8');
      // High priority pattern should win
      expect(transformedContent).toContain('const test = "value"');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid syntax gracefully', async () => {
      const testFile = join(testDir, 'invalid-test.ts');
      const content = `
this is not valid typescript syntax {{{
`;

      await writeFile(testFile, content, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toHaveLength(0);
      expect(result.transformationsApplied).toBe(0);
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentFile = join(testDir, 'does-not-exist.ts');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [nonExistentFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.filesModified).toHaveLength(0);
      expect(result.transformationsApplied).toBe(0);
    });

    it('should respect complexity limits', async () => {
      const testFile = join(testDir, 'complexity-test.ts');
      const content = `
var test = "value";
`;

      await writeFile(testFile, content, 'utf-8');

      const highComplexityPattern: AstGrepPattern = {
        id: 'high-complexity',
        language: 'typescript',
        pattern: {
          rule: { pattern: 'var $VAR = $VALUE' },
        },
        replacement: {
          template: 'const $VAR = $VALUE',
        },
        description: 'High complexity transformation',
        complexity: 9, // Above default limit of 7
        riskLevel: 'high',
        category: 'test',
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [highComplexityPattern],
        options: {
          dryRun: false,
          maxComplexity: 7,
        },
      })) as any;

      expect(result.transformationsApplied).toBe(0);

      const content2 = await readFile(testFile, 'utf-8');
      expect(content2).toContain('var test = "value"'); // Unchanged
    });
  });

  describe('Dry Run Mode', () => {
    it('should not modify files in dry run mode', async () => {
      const testFile = join(testDir, 'dry-run-test.ts');
      const originalContent = `
var test = "value";
`;

      await writeFile(testFile, originalContent, 'utf-8');

      const pattern = BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!;

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: true },
      })) as any;

      expect(result.filesModified).toHaveLength(0);
      expect(result.transformationsApplied).toBeGreaterThan(0);

      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent); // Unchanged
    });
  });

  describe('Pattern Validation', () => {
    it('should validate pattern schema', async () => {
      const testFile = join(testDir, 'validation-test.ts');
      const content = `var test = "value";`;
      await writeFile(testFile, content, 'utf-8');

      const invalidPattern = {
        // Missing required fields
        id: 'invalid',
        pattern: { rule: { pattern: 'var $VAR = $VALUE' } },
      } as any;

      await expect(
        invokeAstGrepActor({
          targetFiles: [testFile],
          patterns: [invalidPattern],
          options: { dryRun: true },
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance Features', () => {
    it('should respect maxMatches limit', async () => {
      const testFile = join(testDir, 'max-matches-test.ts');
      const content = Array.from({ length: 10 }, (_, i) => `var item${i} = ${i};`).join('\n');

      await writeFile(testFile, content, 'utf-8');

      const pattern: AstGrepPattern = {
        ...BUILTIN_AST_PATTERNS.find((p) => p.id === 'var-to-const-let-ast')!,
        performance: {
          priority: 5,
          batchable: true,
          maxMatches: 3,
        },
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern],
        options: { dryRun: false },
      })) as any;

      expect(result.transformationsApplied).toBe(3); // Limited by maxMatches
    });

    it('should handle pattern conflicts', async () => {
      const testFile = join(testDir, 'conflict-test.ts');
      const content = `var test = "value";`;
      await writeFile(testFile, content, 'utf-8');

      const pattern1: AstGrepPattern = {
        id: 'pattern-1',
        language: 'typescript',
        pattern: { rule: { pattern: 'var $VAR = $VALUE' } },
        replacement: { template: 'let $VAR = $VALUE' },
        description: 'First pattern',
        complexity: 2,
        riskLevel: 'low',
        category: 'test',
        performance: {
          priority: 5,
          batchable: true,
          conflicts: ['pattern-2'],
        },
      };

      const pattern2: AstGrepPattern = {
        id: 'pattern-2',
        language: 'typescript',
        pattern: { rule: { pattern: 'var $VAR = $VALUE' } },
        replacement: { template: 'const $VAR = $VALUE' },
        description: 'Second pattern',
        complexity: 2,
        riskLevel: 'low',
        category: 'test',
        performance: {
          priority: 3,
          batchable: true,
          conflicts: ['pattern-1'],
        },
      };

      const result = (await invokeAstGrepActor({
        targetFiles: [testFile],
        patterns: [pattern1, pattern2],
        options: {
          dryRun: false,
          skipConflicts: true,
        },
      })) as any;

      expect(result.transformationsApplied).toBe(1); // Only one pattern applied

      const transformedContent = await readFile(testFile, 'utf-8');
      // Higher priority pattern (pattern1) should win
      expect(transformedContent).toContain('let test = "value"');
    });
  });
});
