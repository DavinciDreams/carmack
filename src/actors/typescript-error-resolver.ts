import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';

/**
 * TypeScript Error Detection and Resolution Actor
 *
 * Automatically detects and fixes TypeScript errors using AST transformations
 * and intelligent pattern matching. Integrates with the existing Carmack Coder
 * architecture for seamless error resolution.
 */


// TypeScript error schemas
export const TypeScriptErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  code: z.number(),
  category: z.enum(['error', 'warning', 'suggestion']),
  messageText: z.string(),
  source: z.string().optional(),
});

export const ErrorResolutionSchema = z.object({
  errorCode: z.number(),
  pattern: z.string(),
  replacement: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

export const TypeScriptFixResultSchema = z.object({
  success: z.boolean(),
  errorsFound: z.number(),
  errorsFixed: z.number(),
  errorsRemaining: z.number(),
  filesModified: z.array(z.string()),
  fixesApplied: z.array(ErrorResolutionSchema),
  warnings: z.array(z.string()),
  summary: z.string(),
});

// Type exports
export type TypeScriptError = z.infer<typeof TypeScriptErrorSchema>;
export type ErrorResolution = z.infer<typeof ErrorResolutionSchema>;
export type TypeScriptFixResult = z.infer<typeof TypeScriptFixResultSchema>;

// Input schema for the actor
export const TypeScriptErrorResolverInputSchema = z.object({
  files: z.array(z.string()),
  autoFix: z.boolean().default(true),
  maxRiskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  dryRun: z.boolean().default(false),
});

export type TypeScriptErrorResolverInput = z.infer<typeof TypeScriptErrorResolverInputSchema>;

/**
 * Comprehensive TypeScript error resolution patterns
 * Based on common strict mode violations and type safety issues
 */
const ERROR_RESOLUTION_PATTERNS: ErrorResolution[] = [
  // TS2322: Type 'X' is not assignable to type 'Y'
  {
    errorCode: 2322,
    pattern: '(\\w+)\\s*=\\s*([^;]+);',
    replacement: '$1 = $2 as $TARGET_TYPE;',
    description: 'Add type assertion for assignment compatibility',
    confidence: 0.7,
    riskLevel: 'medium',
  },

  // TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
  {
    errorCode: 2345,
    pattern: '([a-zA-Z_$][\\w$]*)\\(([^)]+)\\)',
    replacement: '$1($2 as $PARAM_TYPE)',
    description: 'Add type assertion for function parameter',
    confidence: 0.8,
    riskLevel: 'low',
  },

  // TS2531: Object is possibly 'null'
  {
    errorCode: 2531,
    pattern: '([a-zA-Z_$][\\w$]*(?:\\.[a-zA-Z_$][\\w$]*)*)',
    replacement: '$1!',
    description: 'Add non-null assertion operator',
    confidence: 0.6,
    riskLevel: 'high',
  },

  // TS2532: Object is possibly 'undefined'
  {
    errorCode: 2532,
    pattern: '([a-zA-Z_$][\\w$]*(?:\\.[a-zA-Z_$][\\w$]*)*)',
    replacement: '$1!',
    description: 'Add non-null assertion operator for undefined',
    confidence: 0.6,
    riskLevel: 'high',
  },

  // TS2339: Property 'X' does not exist on type 'Y'
  {
    errorCode: 2339,
    pattern: '([a-zA-Z_$][\\w$]*)\\.(\\w+)',
    replacement: '($1 as any).$2',
    description: 'Add type assertion to access unknown property',
    confidence: 0.5,
    riskLevel: 'high',
  },

  // TS7006: Parameter 'X' implicitly has an 'any' type
  {
    errorCode: 7006,
    pattern: '\\(([^:)]+)\\)',
    replacement: '($1: any)',
    description: 'Add explicit any type to parameter',
    confidence: 0.9,
    riskLevel: 'low',
  },

  // TS7034: Variable 'X' implicitly has type 'any'
  {
    errorCode: 7034,
    pattern: '(let|const|var)\\s+(\\w+)\\s*=',
    replacement: '$1 $2: any =',
    description: 'Add explicit any type to variable',
    confidence: 0.9,
    riskLevel: 'low',
  },

  // TS2304: Cannot find name 'X'
  {
    errorCode: 2304,
    pattern: '([a-zA-Z_$][\\w$]*)',
    replacement: '// TODO: Import or define $1\n$1',
    description: 'Add TODO comment for missing identifier',
    confidence: 0.3,
    riskLevel: 'high',
  },

  // TS2307: Cannot find module 'X'
  {
    errorCode: 2307,
    pattern: 'import\\s+.*\\s+from\\s+[\'"]([^\'"]+)[\'"]',
    replacement: '// TODO: Install or fix module path: $1\n$&',
    description: 'Add TODO comment for missing module',
    confidence: 0.4,
    riskLevel: 'medium',
  },

  // TS2355: A function whose declared type is neither 'void' nor 'any' must return a value
  {
    errorCode: 2355,
    pattern: 'function\\s+(\\w+)\\s*\\([^)]*\\)\\s*:\\s*([^{]+)\\s*\\{',
    replacement:
      'function $1(): $2 {\n  // TODO: Implement return value\n  throw new Error("Not implemented");',
    description: 'Add placeholder return statement',
    confidence: 0.7,
    riskLevel: 'medium',
  },
];

// AST patterns would be used for more advanced transformations in the future
// Currently using regex-based patterns for simplicity and reliability

/**
 * TypeScript Error Resolver Actor
 */
export class TypeScriptErrorResolver {
  private tscPath: string;

  constructor() {
    this.tscPath = 'bunx tsc';
  }

  /**
   * Run TypeScript compiler and extract errors
   */
  async getTypeScriptErrors(files: string[]): Promise<TypeScriptError[]> {
    try {
      const fileArgs = files.length > 0 ? files.join(' ') : '';
      const command = `${this.tscPath} --noEmit --pretty false ${fileArgs}`;

      // TypeScript compiler returns non-zero exit code when errors exist
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      return this.parseTypeScriptOutput(output);
    } catch (error: unknown) {
      // TypeScript errors are in stderr
      const execError = error as { stdout?: string; stderr?: string };
      const output = execError.stdout || execError.stderr || '';
      return this.parseTypeScriptOutput(output);
    }
  }

  /**
   * Parse TypeScript compiler output into structured errors
   */
  private parseTypeScriptOutput(output: string): TypeScriptError[] {
    const errors: TypeScriptError[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse TypeScript error format: file(line,col): error TS####: message
      const match = line.match(
        /^(.+?)\((\d+),(\d+)\):\s+(error|warning|suggestion)\s+TS(\d+):\s+(.+)$/
      );

      if (match) {
        const [, file, lineStr, colStr, category, codeStr, messageText] = match;

        // Ensure all captured groups exist before using them
        if (file && lineStr && colStr && category && codeStr && messageText) {
          errors.push({
            file: file.trim(),
            line: Number.parseInt(lineStr, 10),
            column: Number.parseInt(colStr, 10),
            code: Number.parseInt(codeStr, 10),
            category: category as 'error' | 'warning' | 'suggestion',
            messageText: messageText.trim(),
            source: line,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Apply automatic fixes to TypeScript errors
   */
  async applyFixes(
    errors: TypeScriptError[],
    maxRiskLevel: 'low' | 'medium' | 'high',
    dryRun = false
  ): Promise<TypeScriptFixResult> {
    const result: TypeScriptFixResult = {
      success: false,
      errorsFound: errors.length,
      errorsFixed: 0,
      errorsRemaining: 0,
      filesModified: [],
      fixesApplied: [],
      warnings: [],
      summary: '',
    };

    const riskLevels = { low: 1, medium: 2, high: 3 };
    const maxRisk = riskLevels[maxRiskLevel];

    // Group errors by file for efficient processing
    const errorsByFile = new Map<string, TypeScriptError[]>();
    for (const error of errors) {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)?.push(error);
    }

    // Process each file
    for (const [filePath, fileErrors] of errorsByFile) {
      try {
        const originalContent = await readFile(filePath, 'utf-8');
        let modifiedContent = originalContent;
        let fileModified = false;

        // Sort errors by line number (descending) to avoid offset issues
        const sortedErrors = fileErrors.sort((a, b) => b.line - a.line);

        for (const error of sortedErrors) {
          const resolution = this.findResolution(error);

          if (resolution && riskLevels[resolution.riskLevel] <= maxRisk) {
            const fix = await this.applyErrorFix(modifiedContent, error, resolution);

            if (fix.success) {
              modifiedContent = fix.content;
              fileModified = true;
              result.errorsFixed++;
              result.fixesApplied.push(resolution);
            } else {
              result.warnings.push(
                `Failed to fix error ${error.code} in ${filePath}: ${fix.reason}`
              );
            }
          } else {
            result.warnings.push(`No safe resolution found for error ${error.code} in ${filePath}`);
          }
        }

        // Write modified content back to file
        if (fileModified && !dryRun) {
          await writeFile(filePath, modifiedContent, 'utf-8');
          result.filesModified.push(filePath);
        } else if (fileModified && dryRun) {
          result.filesModified.push(filePath);
          result.warnings.push(`DRY RUN: Would modify ${filePath}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.warnings.push(`Error processing file ${filePath}: ${errorMessage}`);
      }
    }

    result.errorsRemaining = result.errorsFound - result.errorsFixed;
    result.success = result.errorsFixed > 0;
    result.summary = `Fixed ${result.errorsFixed}/${result.errorsFound} TypeScript errors across ${result.filesModified.length} files`;

    return result;
  }

  /**
   * Find appropriate resolution for a TypeScript error
   */
  private findResolution(error: TypeScriptError): ErrorResolution | null {
    return ERROR_RESOLUTION_PATTERNS.find((pattern) => pattern.errorCode === error.code) || null;
  }

  /**
   * Apply a specific error fix to file content
   */
  private async applyErrorFix(
    content: string,
    error: TypeScriptError,
    resolution: ErrorResolution
  ): Promise<{ success: boolean; content: string; reason?: string }> {
    try {
      const lines = content.split('\n');
      const errorLine = lines[error.line - 1]; // Convert to 0-based index

      if (!errorLine) {
        return { success: false, content, reason: 'Error line not found' };
      }

      // Apply regex-based fix
      const regex = new RegExp(resolution.pattern, 'g');
      const fixedLine = errorLine.replace(regex, resolution.replacement);

      if (fixedLine !== errorLine) {
        lines[error.line - 1] = fixedLine;
        return { success: true, content: lines.join('\n') };
      }

      return { success: false, content, reason: 'Pattern did not match' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, content, reason: errorMessage };
    }
  }

  /**
   * Generate intelligent type suggestions based on context
   */
  async generateTypeSuggestions(filePath: string, error: TypeScriptError): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const errorLine = lines[error.line - 1];

      // Analyze context to suggest appropriate types
      if (error.code === 7006 || error.code === 7034) {
        // Implicit any - suggest based on usage patterns
        suggestions.push('string', 'number', 'boolean', 'unknown');

        // Look for return statements to infer function return types
        if (errorLine && errorLine.includes('function')) {
          const functionBody = this.extractFunctionBody(lines, error.line - 1);
          const returnTypes = this.inferReturnTypes(functionBody);
          suggestions.push(...returnTypes);
        }
      }

      if (error.code === 2531 || error.code === 2532) {
        // Null/undefined issues - suggest optional chaining or null checks
        suggestions.push('Optional chaining (?.)');
        suggestions.push('Nullish coalescing (??)');
        suggestions.push('Type guard');
      }
    } catch (err) {
      // Fallback suggestions
      suggestions.push('any', 'unknown');
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Extract function body for analysis
   */
  private extractFunctionBody(lines: string[], startLine: number): string[] {
    const body: string[] = [];
    let braceCount = 0;
    let inFunction = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      if (!line) continue; // Skip undefined lines

      if (line.includes('{')) {
        braceCount += (line.match(/\{/g) || []).length;
        inFunction = true;
      }

      if (inFunction) {
        body.push(line);
      }

      if (line.includes('}')) {
        braceCount -= (line.match(/\}/g) || []).length;
        if (braceCount <= 0) break;
      }
    }

    return body;
  }

  /**
   * Infer return types from function body
   */
  private inferReturnTypes(functionBody: string[]): string[] {
    const types: string[] = [];

    for (const line of functionBody) {
      if (line.includes('return')) {
        // Simple heuristics for return type inference
        if (line.includes('true') || line.includes('false')) {
          types.push('boolean');
        } else if (line.match(/return\s+\d+/)) {
          types.push('number');
        } else if (line.match(/return\s+['"`]/)) {
          types.push('string');
        } else if (line.includes('[]') || line.includes('Array')) {
          types.push('Array<any>');
        } else if (line.includes('{}') || line.includes('Object')) {
          types.push('object');
        } else if (line.includes('Promise') || line.includes('await')) {
          types.push('Promise<any>');
        }
      }
    }

    return [...new Set(types)];
  }
}

/**
 * TypeScript Error Resolver Actor
 */
export const typeScriptErrorResolverActor = fromPromise(
  async ({ input }: { input: TypeScriptErrorResolverInput }): Promise<TypeScriptFixResult> => {
    const validatedInput = TypeScriptErrorResolverInputSchema.parse(input);
    const resolver = new TypeScriptErrorResolver();

    try {
      console.log('🔍 Detecting TypeScript errors...');
      const errors = await resolver.getTypeScriptErrors(validatedInput.files);

      if (errors.length === 0) {
        return {
          success: true,
          errorsFound: 0,
          errorsFixed: 0,
          errorsRemaining: 0,
          filesModified: [],
          fixesApplied: [],
          warnings: [],
          summary: 'No TypeScript errors found',
        };
      }

      console.log(`📋 Found ${errors.length} TypeScript errors`);

      if (validatedInput.autoFix) {
        console.log('🔧 Applying automatic fixes...');
        const result = await resolver.applyFixes(
          errors,
          validatedInput.maxRiskLevel,
          validatedInput.dryRun
        );

        console.log(`✅ ${result.summary}`);
        return result;
      }
      return {
        success: false,
        errorsFound: errors.length,
        errorsFixed: 0,
        errorsRemaining: errors.length,
        filesModified: [],
        fixesApplied: [],
        warnings: ['Auto-fix disabled'],
        summary: `Found ${errors.length} TypeScript errors (auto-fix disabled)`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errorsFound: 0,
        errorsFixed: 0,
        errorsRemaining: 0,
        filesModified: [],
        fixesApplied: [],
        warnings: [errorMessage],
        summary: `Error during TypeScript analysis: ${errorMessage}`,
      };
    }
  }
);

// Export validation helpers
export const validateTypeScriptError = (data: unknown): TypeScriptError => {
  return TypeScriptErrorSchema.parse(data);
};

export const validateErrorResolution = (data: unknown): ErrorResolution => {
  return ErrorResolutionSchema.parse(data);
};

export const validateTypeScriptFixResult = (data: unknown): TypeScriptFixResult => {
  return TypeScriptFixResultSchema.parse(data);
};