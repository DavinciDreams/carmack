import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';

/**
 * Enhanced Template Engine for Ultra-Fast Code Transformations
 *
 * This engine implements the first tier of the speed hierarchy:
 * Template (fastest) → AST → LLM
 *
 * Features:
 * - Multi-pattern template matching with variable capture
 * - Context-aware transformations with scoping analysis
 * - Batch processing for optimal performance
 * - Smart conflict resolution between patterns
 * - Semantic pattern recognition beyond simple regex
 */

// Enhanced template pattern schema with sophisticated matching
const TemplatePatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript']),

  // Pattern matching configuration
  pattern: z.object({
    // The template pattern with variable placeholders
    template: z.string(),
    // Optional regex flags for fine-tuning
    flags: z.string().optional().default('g'),
    // Contextual constraints
    context: z
      .object({
        // Must be inside specific constructs
        inside: z
          .array(z.enum(['function', 'class', 'method', 'arrow-function', 'block', 'module']))
          .optional(),
        // Must not be inside specific constructs
        notInside: z.array(z.enum(['comment', 'string', 'template-literal', 'regex'])).optional(),
        // Must have specific preceding/following patterns
        precedes: z.string().optional(),
        follows: z.string().optional(),
      })
      .optional(),
  }),

  // Transformation specification
  replacement: z.object({
    // The replacement template
    template: z.string(),
    // Optional transformation functions for variables
    transformers: z
      .record(
        z.enum(['camelCase', 'pascalCase', 'kebabCase', 'uppercase', 'lowercase', 'trim', 'escape'])
      )
      .optional(),
    // Conditional replacements based on variable values
    conditionals: z
      .array(
        z.object({
          condition: z.string(), // JavaScript expression
          replacement: z.string(),
        })
      )
      .optional(),
  }),

  // Metadata
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  category: z.string(),

  // Performance hints
  performance: z
    .object({
      priority: z.number().min(1).max(10).default(5), // Higher priority = applied first
      batchable: z.boolean().default(true), // Can be batched with other patterns
      conflicts: z.array(z.string()).optional(), // Pattern IDs that conflict with this one
    })
    .optional(),

  // Testing and validation
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expected: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

const TemplateTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  patterns: z.array(TemplatePatternSchema),
  options: z
    .object({
      dryRun: z.boolean().default(false),
      maxComplexity: z.number().default(5),
      enableBatching: z.boolean().default(true),
      skipConflicts: z.boolean().default(true),
      preserveFormatting: z.boolean().default(true),
    })
    .optional()
    .default({}),
});

export type TemplatePattern = z.infer<typeof TemplatePatternSchema>;
export type TemplateTransformationRequest = z.infer<typeof TemplateTransformationRequestSchema>;

/**
 * Template variable with metadata for sophisticated matching
 */
interface TemplateVariable {
  name: string;
  value: string;
  type: 'identifier' | 'literal' | 'expression' | 'statement';
  context?:
    | {
        leadingWhitespace?: string;
        trailingWhitespace?: string;
        indentation?: string;
      }
    | undefined;
}

/**
 * Match result with captured variables and metadata
 */
interface TemplateMatch {
  pattern: TemplatePattern;
  match: string;
  variables: TemplateVariable[];
  startIndex: number;
  endIndex: number;
  lineNumber: number;
  context: {
    precedingCode: string;
    followingCode: string;
    indentation: string;
  };
}

/**
 * Ultra-fast template transformation engine actor
 */
export const templateEngineActor = fromPromise(
  async ({ input }: { input: TemplateTransformationRequest }) => {
    const validatedInput = TemplateTransformationRequestSchema.parse(input);

    console.log(
      `🚀 Starting ultra-fast template transformations on ${validatedInput.targetFiles.length} files`
    );

    const results = await applyTemplateTransformations(validatedInput);

    console.log(
      `✨ Template engine completed: ${results.transformationsApplied} transformations across ${results.filesModified.length} files`
    );

    return results;
  }
);

/**
 * Apply template transformations with advanced pattern matching
 */
async function applyTemplateTransformations(request: TemplateTransformationRequest) {
  const filesModified: string[] = [];
  const appliedPatterns: Array<{ file: string; pattern: string; count: number }> = [];
  let totalTransformations = 0;

  // Filter and sort patterns for optimal processing
  const activePatterns = preparePatterns(request.patterns, request.options.maxComplexity);

  for (const filePath of request.targetFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');

      const transformResult = await transformFileWithTemplates(
        content,
        activePatterns,
        request.options
      );

      if (transformResult.modified && !request.options.dryRun) {
        await writeFile(filePath, transformResult.content, 'utf-8');
        filesModified.push(filePath);
      }

      if (transformResult.transformations.length > 0) {
        for (const transformation of transformResult.transformations) {
          appliedPatterns.push({
            file: filePath,
            pattern: transformation.patternId,
            count: transformation.count,
          });
          totalTransformations += transformation.count;
        }

        console.log(
          `📝 Template-transformed ${filePath}: ${transformResult.transformations.length} patterns applied`
        );
      }
    } catch (error) {
      console.error(`❌ Error transforming ${filePath}:`, error);
    }
  }

  return {
    filesModified,
    transformationsApplied: totalTransformations,
    appliedPatterns,
    mode: 'template' as const,
  };
}

/**
 * Prepare patterns for optimal processing
 */
function preparePatterns(patterns: TemplatePattern[], maxComplexity: number): TemplatePattern[] {
  return patterns
    .filter((p) => p.complexity <= maxComplexity)
    .sort((a, b) => {
      // Sort by priority first, then by complexity (lower = faster)
      const aPriority = a.performance?.priority ?? 5;
      const bPriority = b.performance?.priority ?? 5;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.complexity - b.complexity; // Lower complexity first
    });
}

/**
 * Transform a single file with template patterns
 */
async function transformFileWithTemplates(
  content: string,
  patterns: TemplatePattern[],
  options: TemplateTransformationRequest['options']
): Promise<{
  content: string;
  modified: boolean;
  transformations: Array<{ patternId: string; count: number }>;
}> {
  let modifiedContent = content;
  const transformations: Array<{ patternId: string; count: number }> = [];
  let totalModified = false;

  // Track applied patterns to avoid conflicts
  const appliedPatterns = new Set<string>();

  for (const pattern of patterns) {
    // Skip conflicting patterns if option is enabled
    if (options.skipConflicts && pattern.performance?.conflicts) {
      const hasConflict = pattern.performance.conflicts.some((id) => appliedPatterns.has(id));
      if (hasConflict) {
        console.log(`⚠️  Skipping pattern ${pattern.id} due to conflict`);
        continue;
      }
    }

    const patternResult = await applyTemplatePattern(modifiedContent, pattern, options);

    if (patternResult.modified) {
      modifiedContent = patternResult.content;
      totalModified = true;
      appliedPatterns.add(pattern.id);

      transformations.push({
        patternId: pattern.id,
        count: patternResult.matchCount,
      });

      console.log(`🎯 Applied template pattern ${pattern.id}: ${patternResult.matchCount} matches`);
    }
  }

  return {
    content: modifiedContent,
    modified: totalModified,
    transformations,
  };
}

/**
 * Apply a single template pattern with advanced matching
 */
async function applyTemplatePattern(
  content: string,
  pattern: TemplatePattern,
  options: TemplateTransformationRequest['options']
): Promise<{ content: string; modified: boolean; matchCount: number }> {
  try {
    // Find all matches for this pattern
    const matches = findTemplateMatches(content, pattern);

    if (matches.length === 0) {
      return { content, modified: false, matchCount: 0 };
    }

    // Apply transformations in reverse order to maintain indices
    let modifiedContent = content;
    const sortedMatches = matches.sort((a, b) => b.startIndex - a.startIndex);

    for (const match of sortedMatches) {
      const replacement = generateReplacement(match, pattern);

      // Apply the replacement
      const before = modifiedContent.substring(0, match.startIndex);
      const after = modifiedContent.substring(match.endIndex);

      if (options.preserveFormatting) {
        // Preserve indentation and whitespace
        const preservedReplacement = preserveFormatting(replacement, match);
        modifiedContent = before + preservedReplacement + after;
      } else {
        modifiedContent = before + replacement + after;
      }
    }

    return {
      content: modifiedContent,
      modified: true,
      matchCount: matches.length,
    };
  } catch (error) {
    console.error(`Error applying template pattern ${pattern.id}:`, error);
    return { content, modified: false, matchCount: 0 };
  }
}

/**
 * Find all template matches in content using sophisticated pattern matching
 */
function findTemplateMatches(content: string, pattern: TemplatePattern): TemplateMatch[] {
  // Use the enhanced pattern matching that includes semantic analysis
  return findAdvancedTemplateMatches(content, pattern);
}

/**
 * Original template matching function (kept for fallback)
 */
function findBasicTemplateMatches(content: string, pattern: TemplatePattern): TemplateMatch[] {
  const matches: TemplateMatch[] = [];

  // Convert template pattern to regex with variable capture
  const { regex, variableNames } = templateToRegex(pattern.pattern.template);

  let match: RegExpExecArray | null;
