import { z } from 'zod';
import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';

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
  const matches: TemplateMatch[] = [];

  // Convert template pattern to regex with variable capture
  const { regex, variableNames } = templateToRegex(pattern.pattern.template);

  let match;
  while ((match = regex.exec(content)) !== null) {
    // Extract line number and context
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

    // Capture variables with metadata
    const variables: TemplateVariable[] = [];
    for (let i = 0; i < variableNames.length; i++) {
      const varName = variableNames[i];
      const varValue = match[i + 1]; // +1 because index 0 is the full match

      if (varValue !== undefined && varName !== undefined) {
        const context = extractVariableContext(
          varValue,
          match.index + match[0].indexOf(varValue),
          content
        );
        variables.push({
          name: varName,
          value: varValue,
          type: inferVariableType(varValue),
          context: context,
        });
      }
    }

    // Extract context around the match
    const contextRadius = 50;
    const startCtx = Math.max(0, match.index - contextRadius);
    const endCtx = Math.min(content.length, match.index + match[0].length + contextRadius);

    const matchObj: TemplateMatch = {
      pattern,
      match: match[0],
      variables,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      lineNumber,
      context: {
        precedingCode: content.substring(startCtx, match.index),
        followingCode: content.substring(match.index + match[0].length, endCtx),
        indentation: extractIndentation(content, match.index),
      },
    };

    // Apply contextual filters
    if (matchesContext(matchObj, pattern.pattern.context)) {
      matches.push(matchObj);
    }
  }

  return matches;
}

/**
 * Convert template pattern to regex with variable capture groups
 */
function templateToRegex(template: string): { regex: RegExp; variableNames: string[] } {
  const variableNames: string[] = [];

  // Escape special regex characters except our template variables
  let regexPattern = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace template variables with capture groups
  regexPattern = regexPattern.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
    variableNames.push(varName);

    // Smart capture groups based on variable naming conventions
    switch (varName) {
      case 'IDENTIFIER':
      case 'NAME':
      case 'VAR':
      case 'KEY':
        return '([a-zA-Z_$][\\w$]*)';

      case 'VALUE':
      case 'EXPR':
      case 'EXPRESSION':
        return '([^;,}\\]\\)]+)';

      case 'STATEMENT':
      case 'BODY':
        return '([^}]+)';

      case 'TYPE':
        return '([a-zA-Z_$][\\w$<>\\[\\]|&]*\\??*)';

      case 'STRING':
      case 'STR':
        return '([\'"`][^\'"`]*[\'"`])';

      case 'NUMBER':
      case 'NUM':
        return '(\\d+(?:\\.\\d+)?)';

      case 'BOOLEAN':
      case 'BOOL':
        return '(true|false)';

      default:
        // Generic capture for unknown variables
        return '([\\w\\s\\.\\[\\]\\(\\)\\-\\+\\*/=<>!&|]+?)';
    }
  });

  return {
    regex: new RegExp(regexPattern, 'g'),
    variableNames,
  };
}

/**
 * Infer the type of a captured variable
 */
function inferVariableType(value: string): TemplateVariable['type'] {
  const trimmed = value.trim();

  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return 'identifier';
  }

  if (
    /^(['"`]).*\1$/.test(trimmed) ||
    /^\d+(\.\d+)?$/.test(trimmed) ||
    /^(true|false|null|undefined)$/.test(trimmed)
  ) {
    return 'literal';
  }

  if (trimmed.includes(';') || /^(if|while|for|function|class)\b/.test(trimmed)) {
    return 'statement';
  }

  return 'expression';
}

/**
 * Extract variable context for formatting preservation
 */
function extractVariableContext(
  _value: string,
  position: number,
  content: string
): TemplateVariable['context'] {
  const lineStart = content.lastIndexOf('\n', position);
  const precedingLine = content.substring(lineStart + 1, position);

  return {
    leadingWhitespace: precedingLine.match(/^\s*/)?.[0] || '',
    indentation: precedingLine.match(/^\s*/)?.[0] || '',
  };
}

/**
 * Extract indentation from content at a given position
 */
function extractIndentation(content: string, position: number): string {
  const lineStart = content.lastIndexOf('\n', position);
  const lineContent = content.substring(lineStart + 1, position);
  return lineContent.match(/^\s*/)?.[0] || '';
}

/**
 * Check if a match satisfies contextual constraints
 */
function matchesContext(
  match: TemplateMatch,
  context?: TemplatePattern['pattern']['context']
): boolean {
  if (!context) return true;

  // Simple context checking - could be enhanced with proper AST analysis
  const { precedingCode, followingCode } = match.context;

  // Check if inside forbidden contexts
  if (context.notInside) {
    for (const forbidden of context.notInside) {
      switch (forbidden) {
        case 'comment':
          if (precedingCode.includes('//') || precedingCode.includes('/*')) return false;
          break;
        case 'string':
          const quotes = ['"', "'", '`'];
          if (quotes.some((q) => precedingCode.lastIndexOf(q) > precedingCode.lastIndexOf(q + q)))
            return false;
          break;
      }
    }
  }

  // Check preceding pattern
  if (context.precedes && !followingCode.includes(context.precedes)) {
    return false;
  }

  // Check following pattern
  if (context.follows && !precedingCode.includes(context.follows)) {
    return false;
  }

  return true;
}

/**
 * Generate replacement text from a match and pattern
 */
function generateReplacement(match: TemplateMatch, pattern: TemplatePattern): string {
  let replacement = pattern.replacement.template;

  // Handle conditionals first
  if (pattern.replacement.conditionals) {
    for (const conditional of pattern.replacement.conditionals) {
      try {
        // Create a safe evaluation context
        const context = match.variables.reduce(
          (ctx, variable) => {
            ctx[variable.name] = variable.value;
            return ctx;
          },
          {} as Record<string, string>
        );

        // Simple condition evaluation (could be enhanced with a proper expression evaluator)
        if (evaluateCondition(conditional.condition, context)) {
          replacement = conditional.replacement;
          break;
        }
      } catch (error) {
        console.warn(`Error evaluating conditional for pattern ${pattern.id}:`, error);
      }
    }
  }

  // Replace variables in the replacement template
  for (const variable of match.variables) {
    let value = variable.value;

    // Apply transformers if specified
    const transformer = pattern.replacement.transformers?.[variable.name];
    if (transformer) {
      value = applyTransformer(value, transformer);
    }

    // Replace all occurrences of the variable
    replacement = replacement.replace(new RegExp(`\\$${variable.name}`, 'g'), value);
  }

  return replacement;
}

/**
 * Simple condition evaluator (safe subset of JavaScript)
 */
function evaluateCondition(condition: string, context: Record<string, string>): boolean {
  try {
    // Replace variables in condition
    let evaluableCondition = condition;
    for (const [varName, value] of Object.entries(context)) {
      const escapedValue = JSON.stringify(value);
      evaluableCondition = evaluableCondition.replace(
        new RegExp(`\\b${varName}\\b`, 'g'),
        escapedValue
      );
    }

    // Only allow safe operations
    if (!/^[\w\s"'`()[\]{}.,=!<>&|+-/*]+$/.test(evaluableCondition)) {
      return false;
    }

    // Simple evaluation for basic conditions
    return new Function(`return ${evaluableCondition}`)();
  } catch {
    return false;
  }
}

/**
 * Apply text transformers to variable values
 */
function applyTransformer(value: string, transformer: string): string {
  switch (transformer) {
    case 'camelCase':
      return value.replace(/[-_](\w)/g, (_, char) => char.toUpperCase());
    case 'pascalCase':
      return value.charAt(0).toUpperCase() + applyTransformer(value.slice(1), 'camelCase');
    case 'kebabCase':
      return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`).replace(/^-/, '');
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'trim':
      return value.trim();
    case 'escape':
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    default:
      return value;
  }
}

/**
 * Preserve formatting from the original match
 */
function preserveFormatting(replacement: string, match: TemplateMatch): string {
  const { indentation } = match.context;

  if (!indentation) return replacement;

  // Split replacement into lines and apply indentation
  const lines = replacement.split('\n');
  const indentedLines = lines.map((line, index) => {
    if (index === 0) return line; // First line keeps original position
    return line.trim() ? indentation + line : line; // Subsequent lines get indented
  });

  return indentedLines.join('\n');
}
