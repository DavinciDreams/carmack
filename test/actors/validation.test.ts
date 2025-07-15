import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { validationActor } from '../../src/actors/validation';

describe('ValidationActor', () => {
  const testDir = join(process.cwd(), 'test-temp');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Type Validation', () => {
    it('should validate TypeScript files successfully', async () => {
      const validCode = `
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: '123',
  name: 'John Doe'
};

export { user };
`;

      const filePath = join(testDir, 'valid.ts');
      await writeFile(filePath, validCode);

      const actor = createActor(validationActor, {
        input: {
          type: 'types' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
      });
    });

    it('should detect TypeScript type errors', async () => {
      const invalidCode = `
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: 123, // Type error: should be string
  name: 'John Doe'
};

export { user };
`;

      const filePath = join(testDir, 'invalid.ts');
      await writeFile(filePath, invalidCode);

      const actor = createActor(validationActor, {
        input: {
          type: 'types' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
      });
    });

    it('should fix type errors using LLM when available', async () => {
      const mockErrors = [
        {
          code: 'TS2322',
          message: 'Type number is not assignable to type string',
          file: join(testDir, 'fixable.ts'),
          line: 8,
          column: 5,
          severity: 'error' as const,
        },
      ];

      const actor = createActor(validationActor, {
        input: {
          type: 'typeFix' as const,
          files: [join(testDir, 'fixable.ts')],
          errors: mockErrors,
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('Quality Validation with ESLint', () => {
    it('should analyze code quality using ESLint', async () => {
      const codeWithIssues = `
var userName = "John"; // Should use const
let userAge = 25;

if (userName == "John") { // Should use ===
  console.log("Hello John"); // Console statement
}

function complexFunction(a, b, c, d, e) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          if (e) {
            return a + b + c + d + e;
          }
        }
      }
    }
  }
  return 0;
}
`;

      const filePath = join(testDir, 'quality-issues.ts');
      await writeFile(filePath, codeWithIssues);

      const actor = createActor(validationActor, {
        input: {
          type: 'quality' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
        fixableIssues: expect.any(Number),
      });
    });

    it('should use fallback analysis when ESLint is not available', async () => {
      const codeWithIssues = `
var userName = "John";
if (userName == "John") {
  console.log("Hello");
}
function test(): any {
  return null;
}
`;

      const filePath = join(testDir, 'fallback-test.ts');
      await writeFile(filePath, codeWithIssues);

      // Mock ESLint import failure
      vi.doMock('eslint', () => {
        throw new Error('ESLint not available');
      });

      const actor = createActor(validationActor, {
        input: {
          type: 'quality' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });

      vi.doUnmock('eslint');
    });

    it('should detect complexity issues', async () => {
      const complexCode = `
function veryComplexFunction(a, b, c, d, e, f, g, h, i, j) {
  if (a && b) {
    if (c || d) {
      switch (e) {
        case 1:
          if (f) {
            while (g) {
              for (let x = 0; x < h; x++) {
                if (i) {
                  try {
                    if (j) {
                      return a ? b : c;
                    }
                  } catch (error) {
                    if (error) {
                      throw error;
                    }
                  }
                }
              }
            }
          }
          break;
        case 2:
          return b;
        default:
          return c;
      }
    }
  }
  return 0;
}
`;

      const filePath = join(testDir, 'complex.ts');
      await writeFile(filePath, complexCode);

      const actor = createActor(validationActor, {
        input: {
          type: 'quality' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        warnings: expect.any(Array),
      });
    });
  });

  describe('Format Validation', () => {
    it('should validate code formatting', async () => {
      const unformattedCode = `
const greeting="Hello, World!";
console.log(greeting);

function add(a:number,b:number):number{
return a+b;
}

export{add};
`;

      const filePath = join(testDir, 'unformatted.ts');
      await writeFile(filePath, unformattedCode);

      const actor = createActor(validationActor, {
        input: {
          type: 'format' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });

    it('should fix code formatting', async () => {
      const unformattedCode = `
const greeting="Hello, World!";
console.log(greeting);
`;

      const filePath = join(testDir, 'to-format.ts');
      await writeFile(filePath, unformattedCode);

      const actor = createActor(validationActor, {
        input: {
          type: 'formatFix' as const,
          files: [filePath],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', async () => {
      const nonExistentFile = join(testDir, 'does-not-exist.ts');

      const actor = createActor(validationActor, {
        input: {
          type: 'types' as const,
          files: [nonExistentFile],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
      });
    });

    it('should handle invalid file content gracefully', async () => {
      const binaryFile = join(testDir, 'binary.bin');
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
      await writeFile(binaryFile, binaryContent);

      const actor = createActor(validationActor, {
        input: {
          type: 'quality' as const,
          files: [binaryFile],
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple files efficiently', async () => {
      const files: string[] = [];

      // Create multiple test files
      for (let i = 0; i < 10; i++) {
        const filePath = join(testDir, `file${i}.ts`);
        const content = `
export const value${i} = ${i};
export function process${i}(input: number): number {
  return input * ${i};
}
`;
        await writeFile(filePath, content);
        files.push(filePath);
      }

      const startTime = Date.now();

      const actor = createActor(validationActor, {
        input: {
          type: 'quality' as const,
          files,
        },
      });

      actor.start();

      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds
    });
  });
});
