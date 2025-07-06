import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ErrorInfo, ValidationResult } from '../types.js';

// Validation input schema
const ValidationInputSchema = z.union([
  z.object({
    type: z.literal('format'),
    files: z.array(z.string()),
  }),
  z.object({
    type: z.literal('formatFix'),
    files: z.array(z.string()),
  }),
  z.object({
    type: z.literal('types'),
    files: z.array(z.string()),
  }),
  z.object({
    type: z.literal('typeFix'),
    files: z.array(z.string()),
    errors: z.array(z.any()), // ErrorInfo schema
  }),
  z.object({
    type: z.literal('quality'),
    files: z.array(z.string()),
  }),
]);

type ValidationInput = z.infer<typeof ValidationInputSchema>;

/**
 * Validation Actor
 *
 * Handles various types of code validation and fixing:
 * - format: Check code formatting with Biome
 * - formatFix: Apply automatic formatting fixes
 * - types: TypeScript type checking
 * - typeFix: Attempt to fix type errors
 * - quality: ESLint code quality analysis
 */
export const validationActor = fromPromise(async ({ input }: { input: ValidationInput }) => {
  const validatedInput = ValidationInputSchema.parse(input);

  console.log(`Running ${validatedInput.type} validation on ${validatedInput.files.length} files`);

  switch (validatedInput.type) {
    case 'format':
      return await validateFormat(validatedInput.files);
    case 'formatFix':
      return await fixFormat(validatedInput.files);
    case 'types':
      return await validateTypes(validatedInput.files);
    case 'typeFix':
      return await fixTypes(validatedInput.files, validatedInput.errors);
    case 'quality':
      return await validateQuality(validatedInput.files);
    default:
      throw new Error('Unknown validation type');
  }
});

async function validateFormat(_files: string[]): Promise<ValidationResult> {
  // TODO: Implement Biome format validation
  console.log('Validating code formatting...');

  // Mock implementation
  return {
    isValid: Math.random() > 0.3, // 70% chance of being valid
    errors: [],
    warnings: [],
    fixableIssues: 0,
  };
}

async function fixFormat(_files: string[]): Promise<ValidationResult> {
  // TODO: Implement Biome format fixing
  console.log('Fixing code formatting...');

  // Mock implementation
  return {
    isValid: true,
    errors: [],
    warnings: [],
    fixableIssues: 0,
  };
}

async function validateTypes(files: string[]): Promise<ValidationResult> {
  console.log(`Validating TypeScript types for ${files.length} files...`);

  try {
    // Run TypeScript compiler to check for errors
    const { execSync } = await import('child_process');
    
    // Run tsc on the entire project (since individual file checking is complex)
    execSync('bunx tsc --noEmit --pretty false', { 
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    
    return {
      isValid: true,
      errors: [],
      warnings: [],
      fixableIssues: 0,
    };
  } catch (error: any) {
    // Parse TypeScript errors from stderr
    const errorOutput = error.stdout || error.stderr || '';
    const errors: ErrorInfo[] = [];
    
    // Parse TypeScript error format: filename(line,col): error TS####: message
    const errorLines = errorOutput.split('\n').filter((line: string) => line.includes(': error TS'));
    
    for (const line of errorLines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      if (match) {
        const [, file, lineStr, colStr, code, message] = match;
        errors.push({
          code,
          message: message.trim(),
          file: file.trim(),
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10),
          severity: 'error' as const,
        });
      }
    }

    return {
      isValid: false,
      errors,
      warnings: [],
      fixableIssues: errors.length, // Assume all TypeScript errors are fixable
    };
  }
}

async function fixTypes(_files: string[], _errors: ErrorInfo[]): Promise<ValidationResult> {
  // TODO: Implement type error fixing using LLM
  console.log('Fixing TypeScript type errors...');

  // Mock implementation
  return {
    isValid: true,
    errors: [],
    warnings: [],
    fixableIssues: 0,
  };
}

async function validateQuality(files: string[]): Promise<ValidationResult> {
  // TODO: Implement ESLint quality analysis
  console.log('Analyzing code quality...');

  // Mock implementation
  return {
    isValid: true,
    errors: [],
    warnings: [
      {
        code: 'prefer-const',
        message: 'Variable should be declared with const',
        file: files[0],
        line: 15,
        column: 5,
        severity: 'warning' as const,
      },
    ],
    fixableIssues: 1,
  };
}
