import { z } from 'zod';

import { type AstPattern, AstPatternSchema, type TransformationMode, TransformationModeSchema } from '../types.js';
import { detectLanguageFromFile, detectLanguagesFromFiles, getLanguageDistribution } from './language-detection.js';

/**
 * Pattern Filtering System with Language Awareness and Zod Validation
 * 
 * This module provides comprehensive pattern filtering based on language compatibility,
 * transformation mode, complexity, and risk level with full Zod schema validation.
 */

// Zod schema for pattern filter request
export const PatternFilterRequestSchema = z.object({
  patterns: z.array(AstPatternSchema),
  targetFiles: z.array(z.string().min(1)),
  mode: TransformationModeSchema,
  strictLanguageMatching: z.boolean().default(true),
  maxComplexity: z.number().int().min(1).max(10).default(10),
  allowedRiskLevels: z.array(z.enum(['low', 'medium', 'high'])).default(['low', 'medium']),
  enableFallback: z.boolean().default(false),
});

export type PatternFilterRequest = z.infer<typeof PatternFilterRequestSchema>;

// Zod schema for pattern filter result
export const PatternFilterResultSchema = z.object({
  filteredPatterns: z.array(AstPatternSchema),
  totalPatterns: z.number().int().min(0),
  filteredCount: z.number().int().min(0),
  filterCriteria: z.object({
    mode: TransformationModeSchema,
    targetLanguages: z.array(z.string()),
    maxComplexity: z.number().int(),
    allowedRiskLevels: z.array(z.enum(['low', 'medium', 'high'])),
    strictLanguageMatching: z.boolean(),
  }),
  statistics: z.object({
    languageDistribution: z.record(z.number()),
    modeDistribution: z.record(z.number()),
    complexityDistribution: z.record(z.number()),
    riskDistribution: z.record(z.number()),
  }),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
});

export type PatternFilterResult = z.infer<typeof PatternFilterResultSchema>;

// Zod schema for transformation error with enhanced context
export const TransformationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  file: z.string().optional(),
  pattern: z.string().optional(),
  language: z.string().optional(),
  expectedLanguage: z.string().optional(),
  mode: TransformationModeSchema.optional(),
  context: z.record(z.unknown()).optional(),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export type TransformationError = z.infer<typeof TransformationErrorSchema>;

/**
 * Enhanced TransformationError class with Zod validation
 */
export class EnhancedTransformationError extends Error {
  public readonly errorInfo: TransformationError;

  constructor(errorInfo: Partial<TransformationError> & { code: string; message: string }) {
    const validatedErrorInfo = TransformationErrorSchema.parse(errorInfo);
    super(validatedErrorInfo.message);
    this.name = 'EnhancedTransformationError';
    this.errorInfo = validatedErrorInfo;
  }

  toJSON(): TransformationError {
    return this.errorInfo;
  }
}

/**
 * Main function: Filter patterns by language and mode with comprehensive validation
 */
export function filterPatternsByLanguageAndMode(
  patterns: AstPattern[],
  targetFiles: string[],
  mode: TransformationMode,
  options: Partial<PatternFilterRequest> = {}
): PatternFilterResult {
  // Validate and parse input with Zod
  const request = PatternFilterRequestSchema.parse({
    patterns,
    targetFiles,
    mode,
    ...options,
  });

  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Detect languages from target files
    const languageMap = detectLanguagesFromFiles(request.targetFiles);
    const targetLanguages = new Set(Array.from(languageMap.values()));
    
    // Remove 'unknown' language if other languages are detected
    if (targetLanguages.size > 1 && targetLanguages.has('unknown')) {
      targetLanguages.delete('unknown');
      warnings.push('Removed unknown language detection results when other languages were found');
    }

    // Validate that we have at least one known language
    if (targetLanguages.size === 0 || (targetLanguages.size === 1 && targetLanguages.has('unknown'))) {
      warnings.push('No supported languages detected in target files');
      if (!request.enableFallback) {
        throw new EnhancedTransformationError({
          code: 'NO_SUPPORTED_LANGUAGES',
          message: 'No supported programming languages detected in target files',
          context: { 
            targetFiles: request.targetFiles,
            detectedLanguages: Array.from(targetLanguages),
          },
        });
      }
    }

    // Filter patterns based on multiple criteria
    const filteredPatterns = request.patterns.filter(pattern => {
      // 1. Mode compatibility check
      const modeMatch = pattern.mode === request.mode || 
                       (!pattern.mode && request.mode === 'template');
      
      if (!modeMatch) {
        return false;
      }

      // 2. Language compatibility check
      let languageMatch = true;
      if (request.strictLanguageMatching && targetLanguages.size > 0 && !targetLanguages.has('unknown')) {
        languageMatch = targetLanguages.has(pattern.language);
      }

      if (!languageMatch) {
        return false;
      }

      // 3. Complexity check
      const complexityMatch = pattern.complexity <= request.maxComplexity;
      if (!complexityMatch) {
        return false;
      }

      // 4. Risk level check
      const riskMatch = request.allowedRiskLevels.includes(pattern.riskLevel);
      if (!riskMatch) {
        return false;
      }

      return true;
    });

    // Generate statistics
    const languageDistribution = getLanguageDistribution(request.targetFiles);
    const modeDistribution = getDistribution(request.patterns, 'mode');
    const complexityDistribution = getDistribution(request.patterns, 'complexity');
    const riskDistribution = getDistribution(request.patterns, 'riskLevel');

    // Check for potential issues
    if (filteredPatterns.length === 0) {
      warnings.push('No patterns match the specified criteria');
      
      // Provide helpful suggestions
      const availableLanguages = new Set(request.patterns.map(p => p.language));
      const missingLanguages = Array.from(targetLanguages).filter(lang => !availableLanguages.has(lang));
      
      if (missingLanguages.length > 0) {
        warnings.push(`Missing patterns for languages: ${missingLanguages.join(', ')}`);
      }
    }

    // Build result
    const result: PatternFilterResult = {
      filteredPatterns,
      totalPatterns: request.patterns.length,
      filteredCount: filteredPatterns.length,
      filterCriteria: {
        mode: request.mode,
        targetLanguages: Array.from(targetLanguages),
        maxComplexity: request.maxComplexity,
        allowedRiskLevels: request.allowedRiskLevels,
        strictLanguageMatching: request.strictLanguageMatching,
      },
      statistics: {
        languageDistribution,
        modeDistribution,
        complexityDistribution,
        riskDistribution,
      },
      warnings,
      errors,
    };

    return PatternFilterResultSchema.parse(result);

  } catch (error) {
    if (error instanceof EnhancedTransformationError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new EnhancedTransformationError({
      code: 'PATTERN_FILTERING_ERROR',
      message: `Pattern filtering failed: ${error instanceof Error ? error.message : String(error)}`,
      context: {
        originalError: error instanceof Error ? error.message : String(error),
        targetFiles: request.targetFiles,
        mode: request.mode,
      },
    });
  }
}

/**
 * Simplified function for backward compatibility
 */
export function filterPatternsByLanguage(
  patterns: AstPattern[],
  targetFiles: string[]
): AstPattern[] {
  const result = filterPatternsByLanguageAndMode(patterns, targetFiles, 'template');
  return result.filteredPatterns;
}

/**
 * Filter patterns by mode only (no language filtering)
 */
export function filterPatternsByMode(
  patterns: AstPattern[],
  mode: TransformationMode
): AstPattern[] {
  return patterns.filter(pattern => 
    pattern.mode === mode || (!pattern.mode && mode === 'template')
  );
}

/**
 * Filter patterns by complexity
 */
export function filterPatternsByComplexity(
  patterns: AstPattern[],
  maxComplexity: number
): AstPattern[] {
  return patterns.filter(pattern => pattern.complexity <= maxComplexity);
}

/**
 * Filter patterns by risk level
 */
export function filterPatternsByRisk(
  patterns: AstPattern[],
  allowedRiskLevels: ('low' | 'medium' | 'high')[]
): AstPattern[] {
  return patterns.filter(pattern => allowedRiskLevels.includes(pattern.riskLevel));
}

/**
 * Validate pattern compatibility with target files
 */
export function validatePatternCompatibility(
  patterns: AstPattern[],
  targetFiles: string[]
): { compatible: AstPattern[]; incompatible: AstPattern[]; warnings: string[] } {
  const warnings: string[] = [];
  const compatible: AstPattern[] = [];
  const incompatible: AstPattern[] = [];

  // Detect target languages
  const targetLanguages = new Set(
    targetFiles.map(file => detectLanguageFromFile(file))
  );

  // Remove unknown if other languages exist
  if (targetLanguages.size > 1 && targetLanguages.has('unknown')) {
    targetLanguages.delete('unknown');
  }

  patterns.forEach(pattern => {
    if (targetLanguages.has(pattern.language) || targetLanguages.has('unknown')) {
      compatible.push(pattern);
    } else {
      incompatible.push(pattern);
    }
  });

  if (incompatible.length > 0) {
    warnings.push(`${incompatible.length} patterns are incompatible with target file languages`);
  }

  return { compatible, incompatible, warnings };
}

/**
 * Get pattern distribution by a specific field
 */
function getDistribution<T extends keyof AstPattern>(
  patterns: AstPattern[],
  field: T
): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  patterns.forEach(pattern => {
    const value = String(pattern[field] || 'undefined');
    distribution[value] = (distribution[value] || 0) + 1;
  });
  
  return distribution;
}

/**
 * Generate diagnostic report for pattern filtering
 */
export function generatePatternFilteringDiagnostic(
  patterns: AstPattern[],
  targetFiles: string[]
): {
  summary: {
    totalPatterns: number;
    totalFiles: number;
    supportedLanguages: string[];
    detectedLanguages: string[];
  };
  compatibility: {
    fullyCompatible: number;
    partiallyCompatible: number;
    incompatible: number;
  };
  recommendations: string[];
  potentialIssues: string[];
} {
  const detectedLanguages = Array.from(new Set(
    targetFiles.map(file => detectLanguageFromFile(file))
  ));

  const patternLanguages = Array.from(new Set(
    patterns.map(pattern => pattern.language)
  ));

  const compatibility = validatePatternCompatibility(patterns, targetFiles);
  
  const recommendations: string[] = [];
  const potentialIssues: string[] = [];

  // Check for missing language support
  const missingLanguages = detectedLanguages.filter(lang => 
    lang !== 'unknown' && !patternLanguages.includes(lang)
  );

  if (missingLanguages.length > 0) {
    potentialIssues.push(`Missing patterns for detected languages: ${missingLanguages.join(', ')}`);
    recommendations.push(`Add patterns for: ${missingLanguages.join(', ')}`);
  }

  // Check for unused patterns
  const unusedLanguages = patternLanguages.filter(lang => 
    !detectedLanguages.includes(lang)
  );

  if (unusedLanguages.length > 0) {
    recommendations.push(`Consider removing unused patterns for: ${unusedLanguages.join(', ')}`);
  }

  return {
    summary: {
      totalPatterns: patterns.length,
      totalFiles: targetFiles.length,
      supportedLanguages: patternLanguages,
      detectedLanguages,
    },
    compatibility: {
      fullyCompatible: compatibility.compatible.length,
      partiallyCompatible: 0, // Could be enhanced with partial matching logic
      incompatible: compatibility.incompatible.length,
    },
    recommendations,
    potentialIssues,
  };
}

/**
 * Create a pattern filter with preset configurations
 */
export function createPatternFilter(config: {
  mode: TransformationMode;
  maxComplexity?: number;
  allowedRiskLevels?: ('low' | 'medium' | 'high')[];
  strictLanguageMatching?: boolean;
}) {
  return (patterns: AstPattern[], targetFiles: string[]) => {
    const options: Partial<PatternFilterRequest> = {};
    
    if (config.maxComplexity !== undefined) {
      options.maxComplexity = config.maxComplexity;
    }
    
    if (config.allowedRiskLevels !== undefined) {
      options.allowedRiskLevels = config.allowedRiskLevels;
    }
    
    if (config.strictLanguageMatching !== undefined) {
      options.strictLanguageMatching = config.strictLanguageMatching;
    }
    
    return filterPatternsByLanguageAndMode(patterns, targetFiles, config.mode, options);
  };
}

// Export validation functions for runtime type checking
export const validatePatternFilterRequest = (request: unknown): PatternFilterRequest => {
  return PatternFilterRequestSchema.parse(request);
};

export const validatePatternFilterResult = (result: unknown): PatternFilterResult => {
  return PatternFilterResultSchema.parse(result);
};

export const validateTransformationError = (error: unknown): TransformationError => {
  return TransformationErrorSchema.parse(error);
};

// Preset filter configurations for common use cases
export const PRESET_FILTERS = {
  SAFE_TEMPLATE: createPatternFilter({
    mode: 'template',
    maxComplexity: 3,
    allowedRiskLevels: ['low'],
    strictLanguageMatching: true,
  }),
  
  MODERATE_AST: createPatternFilter({
    mode: 'ast',
    maxComplexity: 6,
    allowedRiskLevels: ['low', 'medium'],
    strictLanguageMatching: true,
  }),
  
  ADVANCED_LLM: createPatternFilter({
    mode: 'llm',
    maxComplexity: 10,
    allowedRiskLevels: ['low', 'medium', 'high'],
    strictLanguageMatching: true,
  }),
  
  PERMISSIVE: createPatternFilter({
    mode: 'template',
    maxComplexity: 10,
    allowedRiskLevels: ['low', 'medium', 'high'],
    strictLanguageMatching: false,
  }),
} as const;