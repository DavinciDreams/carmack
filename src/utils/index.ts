import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';

import { type AstPattern, AstPatternSchema } from '../types.js';

/**
 * Utility functions for the Carmack Coder system
 */

// Schema for patterns file
const PatternsFileSchema = z.object({
  version: z.string(),
  description: z.string(),
  patterns: z.array(AstPatternSchema),
  categories: z.record(z.array(z.string())),
  metadata: z.object({
    created: z.string(),
    author: z.string(),
    license: z.string(),
  }),
});

export type PatternsFile = z.infer<typeof PatternsFileSchema>;

/**
 * Load and validate AST patterns from a JSON file
 */
export async function loadPatterns(filePath: string): Promise<AstPattern[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const validated = PatternsFileSchema.parse(data);
    return validated.patterns;
  } catch (error) {
    console.error(`Failed to load patterns from ${filePath}:`, error);
    return [];
  }
}

/**
 * Save patterns to a JSON file
 */
export async function savePatterns(filePath: string, patterns: AstPattern[]): Promise<void> {
  const patternsFile: PatternsFile = {
    version: '1.0.0',
    description: 'AST transformation patterns',
    patterns,
    categories: {},
    metadata: {
      created: new Date().toISOString().split('T')[0] || new Date().getFullYear().toString(),
      author: 'Carmack Coder System',
      license: 'MIT',
    },
  };

  try {
    const content = JSON.stringify(patternsFile, null, 2);
    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to save patterns to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Filter patterns by complexity level
 */
export function filterPatternsByComplexity(
  patterns: AstPattern[],
  maxComplexity: number
): AstPattern[] {
  return patterns.filter((pattern) => pattern.complexity <= maxComplexity);
}

/**
 * Filter patterns by risk level
 */
export function filterPatternsByRisk(
  patterns: AstPattern[],
  maxRisk: 'low' | 'medium' | 'high'
): AstPattern[] {
  const riskLevels = { low: 1, medium: 2, high: 3 };
  const maxRiskLevel = riskLevels[maxRisk];

  return patterns.filter((pattern) => riskLevels[pattern.riskLevel] <= maxRiskLevel);
}

/**
 * Filter patterns by programming language
 */
export function filterPatternsByLanguage(patterns: AstPattern[], language: string): AstPattern[] {
  return patterns.filter((pattern) => pattern.language === language);
}

/**
 * Create a safe filename from a transformation ID
 */
export function createSafeFilename(id: string, extension = '.json'): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_') + extension;
}

/**
 * Deep clone an object using structured cloning
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = initialDelay * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      }
    }
  }

  throw lastError || new Error('Unknown error in retryWithBackoff');
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const timeMs = performance.now() - start;
  return { result, timeMs };
}

/**
 * Create a debounced version of a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: Timer;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Check if a string is a valid file path
 */
export function isValidFilePath(path: string): boolean {
  // Basic validation - could be enhanced with more sophisticated checks
  return path.length > 0 && !path.includes('\0') && !/[<>:"|?*]/.test(path);
}

/**
 /**
  * Sanitize a string for safe logging
  */
 export function sanitizeForLog(input: string, maxLength = 200): string {
   // Remove potentially sensitive patterns and truncate
   return (
     input
       .replace(/[^\x20-\x7E]/g, '?') // Replace non-printable characters
       .slice(0, maxLength) + (input.length > maxLength ? '...' : '')
   );
 }
 
 /**
  * Load enhanced patterns and convert them to standard format
  */
 export async function loadEnhancedPatterns(filePath: string): Promise<AstPattern[]> {
   try {
     const content = await readFile(filePath, 'utf-8');
     const data = JSON.parse(content);
     
     // Convert enhanced patterns to standard format
     const patterns: AstPattern[] = [];
     
     if (data.patterns && Array.isArray(data.patterns)) {
       for (const enhanced of data.patterns) {
         // Extract pattern string
         let pattern: string;
         if (typeof enhanced.pattern === 'string') {
           pattern = enhanced.pattern;
         } else if (enhanced.pattern?.template) {
           pattern = enhanced.pattern.template;
         } else {
           continue; // Skip invalid patterns
         }
 
         // Extract replacement string
         let replacement: string;
         if (typeof enhanced.replacement === 'string') {
           replacement = enhanced.replacement;
         } else if (enhanced.replacement?.template) {
           replacement = enhanced.replacement.template;
         } else {
           continue; // Skip invalid patterns
         }
 
         patterns.push({
           id: enhanced.id,
           language: enhanced.language,
           pattern,
           replacement,
           description: enhanced.description,
           complexity: enhanced.complexity,
           riskLevel: enhanced.riskLevel,
           mode: 'template', // Enhanced patterns are template-based
         });
       }
     }
     
     console.log(`Loaded ${patterns.length} enhanced patterns from ${filePath}`);
     return patterns;
   } catch (error) {
     console.error(`Failed to load enhanced patterns from ${filePath}:`, error);
     return [];
   }
 }
 
 /**
  * Load patterns from multiple sources and merge them
  */
 export async function loadAllPatterns(
   mainPatternsPath: string,
   enhancedPatternsPath?: string
 ): Promise<AstPattern[]> {
   const mainPatterns = await loadPatterns(mainPatternsPath);
   
   if (!enhancedPatternsPath) {
     return mainPatterns;
   }
 
   const enhancedPatterns = await loadEnhancedPatterns(enhancedPatternsPath);
   
   // Merge patterns, avoiding duplicates by ID
   const allPatterns = [...mainPatterns];
   const existingIds = new Set(mainPatterns.map(p => p.id));
   
   for (const pattern of enhancedPatterns) {
     if (!existingIds.has(pattern.id)) {
       allPatterns.push(pattern);
       existingIds.add(pattern.id);
     }
   }
   
   console.log(`Merged ${mainPatterns.length} main patterns with ${enhancedPatterns.length} enhanced patterns (${allPatterns.length} total)`);
   
   return allPatterns;
}

/**
* Returns true if all checks succeeded.
* @param checks - Record of checks to evaluate.
* @returns {boolean} True if all checks have status "succeeded".
*/
export function all_succeeded<CheckName extends string>(checks: Record<CheckName, { status: "succeeded" | "failed" }>): boolean {
 return Object.values(checks).every((check) => (check as { status: "succeeded" | "failed" }).status === "succeeded");
}

/**
* Returns an array of checks from a record.
* @param checks - Record of checks.
* @returns {Array} Array of Check objects.
*/
export function get_checks<CheckName extends string, CheckType = { status: "succeeded" | "failed" }>(checks: Record<CheckName, CheckType>): CheckType[] {
 return Object.values(checks);
}
