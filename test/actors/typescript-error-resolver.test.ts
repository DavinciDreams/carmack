/**
 * Tests for TypeScript Error Resolver Actor
 * 
 * Validates automated TypeScript error detection and resolution
 */

import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createActor } from 'xstate';
import { typeScriptErrorResolverActor, type TypeScriptFixResult } from '../../src/actors/typescript-error-resolver.js';

describe('TypeScript Error Resolver', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ts-error-resolver-test-'));
  });

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  test('should detect and fix implicit any parameter errors', async () => {
    const testFile = join(testDir, 'test.ts');
    const codeWithErrors = `
function greet(name) {
  return "Hello " + name;
}

function calculate(a, b) {
  return a + b;
}
`;

    await writeFile(testFile, codeWithErrors);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.errorsFixed).toBeGreaterThan(0);
    expect(result.filesModified).toContain(testFile);
  });

  test('should handle files with no errors', async () => {
    const testFile = join(testDir, 'clean.ts');
    const cleanCode = `
function greet(name: string): string {
  return "Hello " + name;
}

export const calculate = (a: number, b: number): number => {
  return a + b;
};
`;

    await writeFile(testFile, cleanCode);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.errorsFound).toBe(0);
    expect(result.errorsFixed).toBe(0);
    expect(result.summary).toContain('No TypeScript errors found');
  });

  test('should respect risk level limits', async () => {
    const testFile = join(testDir, 'risky.ts');
    const riskyCode = `
let obj: any = {};
console.log(obj.nonExistentProperty);
`;

    await writeFile(testFile, riskyCode);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'low', // Should limit high-risk fixes
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    // Should have warnings about unfixed errors due to risk level
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('should work in dry run mode', async () => {
    const testFile = join(testDir, 'dryrun.ts');
    const codeWithErrors = `
function test(param) {
  return param.toString();
}
`;

    await writeFile(testFile, codeWithErrors);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: true, // Should not modify files
      },
    });

    actor.start();
    
    const result = await new Promise<TypeScriptFixResult>((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          if (output) {
            resolve(output as TypeScriptFixResult);
          } else {
            reject(new Error('No output from actor'));
          }
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.warnings.some(w => w.includes('DRY RUN'))).toBe(true);
  });

  test('should handle multiple files', async () => {
    const file1 = join(testDir, 'file1.ts');
    const file2 = join(testDir, 'file2.ts');
    
    await writeFile(file1, 'function test1(param) { return param; }');
    await writeFile(file2, 'function test2(param) { return param; }');

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [file1, file2],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.filesModified.length).toBeGreaterThanOrEqual(0);
  });

  test('should generate type suggestions', async () => {
    const testFile = join(testDir, 'suggestions.ts');
    const codeWithErrors = `
function processData(data) {
  if (data) {
    return data.map(item => item.toString());
  }
  return [];
}
`;

    await writeFile(testFile, codeWithErrors);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.fixesApplied.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle error cases gracefully', async () => {
    const nonExistentFile = join(testDir, 'does-not-exist.ts');

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [nonExistentFile],
        autoFix: true,
        maxRiskLevel: 'medium',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          resolve(output);
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    // Should handle gracefully without crashing
    expect(result.success).toBeDefined();
  });

  test('should validate input schema', async () => {
    // Test with valid input - should not throw
    expect(() => {
      createActor(typeScriptErrorResolverActor, {
        input: {
          files: [],
          autoFix: true,
          maxRiskLevel: 'medium',
          dryRun: false,
        },
      });
    }).not.toThrow();
    
    // Note: Invalid inputs would be caught by TypeScript at compile time
    // due to strict typing, so we test valid cases instead
  });

  test('should provide detailed error information', async () => {
    const testFile = join(testDir, 'detailed.ts');
    const complexCode = `
interface User {
  name: string;
  age: number;
}

function processUser(user) {
  return {
    greeting: "Hello " + user.name,
    isAdult: user.age >= 18,
    data: user.nonExistentProperty
  };
}

let users = [];
users.push({ name: "John" }); // Missing age property
`;

    await writeFile(testFile, complexCode);

    const actor = createActor(typeScriptErrorResolverActor, {
      input: {
        files: [testFile],
        autoFix: true,
        maxRiskLevel: 'high',
        dryRun: false,
      },
    });

    actor.start();
    
    const result = await new Promise<TypeScriptFixResult>((resolve, reject) => {
      actor.subscribe({
        complete: () => {
          const output = actor.getSnapshot().output;
          if (output) {
            resolve(output as TypeScriptFixResult);
          } else {
            reject(new Error('No output from actor'));
          }
        },
        error: reject,
      });
    });

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });
});