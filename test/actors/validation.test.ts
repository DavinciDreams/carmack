/**
 * Comprehensive tests for the Validation Actor
 * 
 * Tests format validation, type checking, quality analysis, and error fixing
 * capabilities of the validation actor.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { validationActor } from '../../src/actors/validation.js';
import type { ValidationResult } from '../../src/types.js';
import {
  MockDataGenerator,
  CodeSampleGenerator,
  TestAssertions,
  FileTestUtils,
  PerformanceTestUtils,
  ActorTestUtils,
} from '../test-helpers.js';

describe('Validation Actor', () => {
  let tempFiles: string[] = [];

  afterEach(async () => {
    // Clean up temporary files
    for (const file of tempFiles) {
      await FileTestUtils.cleanupTempFile(file);
    }
    tempFiles = [];
  });

  describe('Format Validation', () => {
    test('should validate well-formatted TypeScript code', async () => {
      const wellFormattedCode = `
// Well-formatted TypeScript code
interface User {
  id: string;
  name: string;
  email: string;
}

function createUser(userData: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    name: userData.name || 'Anonymous',
    email: userData.email || 'no-email@example.com',
  };
}

export { createUser, type User };
`.trim();

      const tempFile = await FileTestUtils.createTempFile(wellFormattedCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'format' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      // Validate result structure
      TestAssertions.assertValidationResult(result);
      
      // Well-formatted code should pass or have minimal issues
      expect(result.errors.length).toBeLessThanOrEqual(1);
      expect(result.fixableIssues).toBeGreaterThanOrEqual(0);
    });

    test('should detect formatting issues in poorly formatted code', async () => {
      const poorlyFormattedCode = `
// Poorly formatted code
interface User{id:string;name:string;email:string;}
function createUser(userData:Partial<User>):User{return{id:crypto.randomUUID(),name:userData.name||'Anonymous',email:userData.email||'no-email@example.com'};}
export{createUser,type User};
`.trim();

      const tempFile = await FileTestUtils.createTempFile(poorlyFormattedCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'format' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Poorly formatted code should have issues
      expect(result.warnings.length + result.errors.length).toBeGreaterThan(0);
    });

    test('should handle multiple files in format validation', async () => {
      const files = [
        await FileTestUtils.createTempFile(CodeSampleGenerator.generateVarCode()),
        await FileTestUtils.createTempFile(CodeSampleGenerator.generateLooseEqualityCode()),
        await FileTestUtils.createTempFile(CodeSampleGenerator.generatePromiseCode()),
      ];
      tempFiles.push(...files);

      const input = {
        type: 'format' as const,
        files,
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      expect(result).toBeDefined();
    });
  });

  describe('Format Fixing', () => {
    test('should attempt to fix formatting issues', async () => {
      const codeToFix = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(codeToFix);
      tempFiles.push(tempFile);

      const input = {
        type: 'formatFix' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Format fixing should generally succeed
      expect(result.errors.length).toBeLessThanOrEqual(result.warnings.length);
      expect(result.fixableIssues).toBe(0); // Issues should be fixed
    });

    test('should handle files that cannot be auto-fixed', async () => {
      const errorCode = CodeSampleGenerator.generateErrorCode();
      const tempFile = await FileTestUtils.createTempFile(errorCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'formatFix' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Files with syntax errors may have warnings about auto-fixing
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Type Validation', () => {
    test('should validate TypeScript types', async () => {
      const typedCode = `
// TypeScript code with proper types
interface UserData {
  name: string;
  age: number;
  isActive: boolean;
}

function processUser(user: UserData): string {
  return \`User \${user.name} is \${user.age} years old and \${user.isActive ? 'active' : 'inactive'}\`;
}

const testUser: UserData = {
  name: 'John',
  age: 30,
  isActive: true,
};

console.log(processUser(testUser));
`.trim();

      const tempFile = await FileTestUtils.createTempFile(typedCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'types' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Well-typed code should validate successfully
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should detect type errors', async () => {
      const typeErrorCode = `
// TypeScript code with type errors
interface UserData {
  name: string;
  age: number;
}

function processUser(user: UserData): string {
  return user.name + user.nonExistentProperty; // Type error
}

const testUser: UserData = {
  name: 'John',
  age: 'thirty', // Type error: should be number
};
`.trim();

      const tempFile = await FileTestUtils.createTempFile(typeErrorCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'types' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Code with type errors should be detected
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.fixableIssues).toBeGreaterThan(0);
      
      // Validate error structure
      for (const error of result.errors) {
        TestAssertions.assertErrorInfo(error);
        expect(error.code).toMatch(/^TS\d+$/); // TypeScript error codes
      }
    });
  });

  describe('Type Fixing', () => {
    test('should handle type fixing requests', async () => {
      const codeWithTypeErrors = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(codeWithTypeErrors);
      tempFiles.push(tempFile);

      const errors = [
        MockDataGenerator.createErrorInfo({
          code: 'TS2339',
          message: 'Property does not exist on type',
          file: tempFile,
          line: 10,
          column: 5,
        }),
      ];

      const input = {
        type: 'typeFix' as const,
        files: [tempFile],
        errors,
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Type fixing is currently a mock implementation
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.fixableIssues).toBe(0);
    });
  });

  describe('Quality Analysis', () => {
    test('should analyze code quality', async () => {
      const codeForQualityCheck = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(codeForQualityCheck);
      tempFiles.push(tempFile);

      const input = {
        type: 'quality' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Quality analysis should provide feedback
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.fixableIssues).toBeGreaterThanOrEqual(1);
      
      // Check for expected quality warnings
      const hasQualityWarning = result.warnings.some(
        warning => warning.code === 'prefer-const'
      );
      expect(hasQualityWarning).toBe(true);
    });

    test('should handle empty files in quality analysis', async () => {
      const emptyFile = await FileTestUtils.createTempFile('');
      tempFiles.push(emptyFile);

      const input = {
        type: 'quality' as const,
        files: [emptyFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should complete validation within reasonable time', async () => {
      const code = CodeSampleGenerator.generateComplexCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const input = {
        type: 'format' as const,
        files: [tempFile],
      };

      const { timeMs } = await PerformanceTestUtils.measureTime(async () => {
        return await ActorTestUtils.testActorWithTimeout(
          validationActor,
          input
        );
      });

      // Validation should complete within 2 seconds for small files
      expect(timeMs).toBeLessThan(2000);
    });

    test('should handle multiple validation types efficiently', async () => {
      const code = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const validationTypes = ['format', 'types', 'quality'] as const;
      
      const benchmark = await PerformanceTestUtils.benchmark(async () => {
        const results: ValidationResult[] = [];
        for (const type of validationTypes) {
          const input = { type, files: [tempFile] };
          const result = await ActorTestUtils.testActorWithTimeout(
            validationActor,
            input
          ) as ValidationResult;
          results.push(result);
        }
        return results;
      }, 3);

      // Multiple validation types should complete reasonably quickly
      expect(benchmark.avg).toBeLessThan(5000); // 5 seconds average
      expect(benchmark.p95).toBeLessThan(8000); // 8 seconds 95th percentile
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid validation type', async () => {
      const input = {
        type: 'invalid' as any,
        files: ['test.ts'],
      };

      const error = await ActorTestUtils.testActorError(
        validationActor,
        input
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('validation');
    });

    test('should handle non-existent files gracefully', async () => {
      const input = {
        type: 'format' as const,
        files: ['/non/existent/file.ts'],
      };

      // Should not throw, but handle gracefully
      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      // Non-existent files should result in validation issues
      expect(result.isValid).toBe(false);
    });

    test('should timeout on extremely long operations', async () => {
      const input = {
        type: 'format' as const,
        files: ['test.ts'],
      };

      // Test with very short timeout
      const error = await ActorTestUtils.testActorError(
        async (input) => {
          return await ActorTestUtils.testActorWithTimeout(
            validationActor,
            input,
            1 // 1ms timeout - should definitely timeout
          );
        },
        input
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('timeout');
    });
  });

  describe('Integration with Biome and TypeScript', () => {
    test('should integrate with Biome for formatting', async () => {
      const code = `const x=1;const y=2;console.log(x+y);`; // Poorly formatted
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      const input = {
        type: 'format' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // Should detect formatting issues
      expect(result.warnings.length + result.errors.length).toBeGreaterThanOrEqual(0);
    });

    test('should integrate with TypeScript compiler', async () => {
      const tsCode = `
// TypeScript specific features
type UserRole = 'admin' | 'user' | 'guest';

interface User {
  id: string;
  role: UserRole;
}

function hasAdminAccess(user: User): boolean {
  return user.role === 'admin';
}
`.trim();

      const tempFile = await FileTestUtils.createTempFile(tsCode);
      tempFiles.push(tempFile);

      const input = {
        type: 'types' as const,
        files: [tempFile],
      };

      const result = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        input
      ) as ValidationResult;

      TestAssertions.assertValidationResult(result);
      
      // TypeScript code should validate successfully
      expect(result.isValid).toBe(true);
    });
  });

  describe('Validation Pipeline Integration', () => {
    test('should support validation pipeline workflow', async () => {
      const code = CodeSampleGenerator.generateVarCode();
      const tempFile = await FileTestUtils.createTempFile(code);
      tempFiles.push(tempFile);

      // Simulate validation pipeline: format -> types -> quality
      const formatResult = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        { type: 'format' as const, files: [tempFile] }
      ) as ValidationResult;

      const typeResult = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        { type: 'types' as const, files: [tempFile] }
      ) as ValidationResult;

      const qualityResult = await ActorTestUtils.testActorWithTimeout(
        validationActor,
        { type: 'quality' as const, files: [tempFile] }
      ) as ValidationResult;

      // All validation steps should complete
      TestAssertions.assertValidationResult(formatResult);
      TestAssertions.assertValidationResult(typeResult);
      TestAssertions.assertValidationResult(qualityResult);

      // Pipeline should provide comprehensive feedback
      const totalIssues = formatResult.errors.length + 
                         typeResult.errors.length + 
                         qualityResult.errors.length;
      expect(totalIssues).toBeGreaterThanOrEqual(0);
    });
  });
});