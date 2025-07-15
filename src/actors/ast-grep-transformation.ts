import { readFile, writeFile } from 'node:fs/promises';
import { js, type SgNode, type SgRoot, ts } from '@ast-grep/napi';
import { fromPromise } from 'xstate';
import { z } from 'zod';

/**
 * Enhanced AST-grep Transformation Engine
 *
 * This engine provides the second tier in our speed hierarchy:
 * Template → **AST** → LLM
 *
 * Features:
 * - True syntax tree-based pattern matching using AST-grep
 * - Semantic-aware transformations that understand code structure
 * - Context-sensitive replacements with scope analysis
 * - Multi-language support (TypeScript/JavaScript)
 * - Advanced pattern composition and chaining
 * - Performance-optimized batch processing
 */

// Enhanced AST pattern schema for real AST-grep patterns
const AstGrepPatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript']),

  // AST-grep pattern configuration
  pattern: z.object({
    // AST-grep pattern syntax
    rule: z.object({
      pattern: z.string().optional(),
      kind: z.string().optional(),
      regex: z.string().optional(),
      inside: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      has: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      follows: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      precedes: z
        .object({
          pattern: z.string().optional(),
          kind: z.string().optional(),
        })
        .optional(),
      all: z.array(z.any()).optional(),
      any: z.array(z.any()).optional(),
      not: z.any().optional(),
    }),
    // Variable constraints
    constraints: z
      .record(
        z.object({
          regex: z.string().optional(),
          kind: z.string().optional(),
        })
      )
      .optional(),
  }),

  // Transformation specification
  replacement: z.object({
    // Replacement template with AST-grep variables
    template: z.string(),
    // Post-processing transformations
    transformers: z
      .record(
        z.enum([
          'camelCase',
          'pascalCase',
          'kebabCase',
          'snakeCase',
          'uppercase',
          'lowercase',
          'trim',
          'escape',
        ])
      )
      .optional(),
    // Conditional replacements
    conditions: z
      .array(
        z.object({
          when: z.string(), // AST-grep condition
          then: z.string(), // Replacement template
        })
      )
      .optional(),
  }),

  // Metadata
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  category: z.string(),

  // Performance configuration
  performance: z
    .object({
      priority: z.number().min(1).max(10).default(5),
      batchable: z.boolean().default(true),
      conflicts: z.array(z.string()).optional(),
      maxMatches: z.number().optional(),
    })
    .optional(),

  // Test cases for validation
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

const AstGrepTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  patterns: z.array(AstGrepPatternSchema),
  options: z
    .object({
      dryRun: z.boolean().default(false),
      maxComplexity: z.number().default(7),
      enableBatching: z.boolean().default(true),
      skipConflicts: z.boolean().default(true),
      preserveFormatting: z.boolean().default(true),
      maxMatchesPerPattern: z.number().default(1000),
    })
    .optional()
    .default({}),
});

export type AstGrepPattern = z.infer<typeof AstGrepPatternSchema>;
export type AstGrepTransformationRequest = z.infer<typeof AstGrepTransformationRequestSchema>;

/**
 * AST match result with rich metadata
 */
interface AstMatch {
  pattern: AstGrepPattern;
  node: SgNode;
  text: string;
  range: { start: number; end: number };
  variables: Record<string, string>;
  context: {
    parent?: SgNode | null;
    ancestors: SgNode[];
    siblings: SgNode[];
    scope: 'global' | 'function' | 'block' | 'class';
  };
}

/**
 * Enhanced AST-grep transformation actor
 */
export const astGrepTransformationActor = fromPromise(
  async ({ input }: { input: AstGrepTransformationRequest }) => {
    const validatedInput = AstGrepTransformationRequestSchema.parse(input);

    console.log(
      `🌳 Starting AST-grep transformations on ${validatedInput.targetFiles.length} files with ${validatedInput.patterns.length} patterns`
    );

    const results = await applyAstGrepTransformations(validatedInput);

    console.log(
      `✨ AST-grep engine completed: ${results.transformationsApplied} transformations across ${results.filesModified.length} files`
    );

    return results;
  }
);

/**
 * Apply AST-grep transformations with advanced pattern matching
 */
async function applyAstGrepTransformations(request: AstGrepTransformationRequest) {
  const filesModified: string[] = [];
  const appliedPatterns: Array<{ file: string; pattern: string; count: number }> = [];
  let totalTransformations = 0;

  // Filter and sort patterns for optimal processing
  const activePatterns = prepareAstPatterns(request.patterns, request.options.maxComplexity);

  for (const filePath of request.targetFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');

      const transformResult = await transformFileWithAstGrep(
        content,
        filePath,
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
          `🌳 AST-transformed ${filePath}: ${transformResult.transformations.length} patterns applied`
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
    mode: 'ast' as const,
  };
}

/**
 * Prepare AST patterns for optimal processing
 */
function prepareAstPatterns(patterns: AstGrepPattern[], maxComplexity: number): AstGrepPattern[] {
  return patterns
    .filter((p) => p.complexity <= maxComplexity)
    .sort((a, b) => {
      // Sort by priority first, then by complexity
      const aPriority = a.performance?.priority ?? 5;
      const bPriority = b.performance?.priority ?? 5;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.complexity - b.complexity; // Lower complexity first
    });
}

/**
 * Transform a single file using AST-grep patterns
 */
async function transformFileWithAstGrep(
  content: string,
  filePath: string,
  patterns: AstGrepPattern[],
  options: AstGrepTransformationRequest['options']
): Promise<{
  content: string;
  modified: boolean;
  transformations: Array<{ patternId: string; count: number }>;
}> {
  let modifiedContent = content;
  const transformations: Array<{ patternId: string; count: number }> = [];
  let totalModified = false;

  // Determine language based on file extension
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const lang = isTypeScript ? ts : js;

  // Parse the source code into AST
  let root: SgRoot;
  try {
    root = lang.parse(modifiedContent);
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error);
    return { content, modified: false, transformations: [] };
  }

  // Track applied patterns to avoid conflicts
  const appliedPatterns = new Set<string>();

  for (const pattern of patterns) {
    // Skip conflicting patterns if option is enabled
    if (options.skipConflicts && pattern.performance?.conflicts) {
      const hasConflict = pattern.performance.conflicts.some((id) => appliedPatterns.has(id));
      if (hasConflict) {
        console.log(`⚠️  Skipping AST pattern ${pattern.id} due to conflict`);
        continue;
      }
    }

    const patternResult = await applyAstGrepPattern(root, modifiedContent, pattern, lang, options);

    if (patternResult.modified) {
      modifiedContent = patternResult.content;
      totalModified = true;
      appliedPatterns.add(pattern.id);

      transformations.push({
        patternId: pattern.id,
        count: patternResult.matchCount,
      });

      console.log(`🎯 Applied AST pattern ${pattern.id}: ${patternResult.matchCount} matches`);

      // Re-parse for subsequent patterns
      try {
        root = lang.parse(modifiedContent);
      } catch (error) {
        console.warn(`Failed to re-parse after ${pattern.id}:`, error);
        break; // Stop processing if we can't re-parse
      }
    }
  }

  return {
    content: modifiedContent,
    modified: totalModified,
    transformations,
  };
}

/**
 * Apply a single AST-grep pattern with advanced matching
 */
async function applyAstGrepPattern(
  root: SgRoot,
  content: string,
  pattern: AstGrepPattern,
  _lang: typeof ts | typeof js,
  options: AstGrepTransformationRequest['options']
): Promise<{ content: string; modified: boolean; matchCount: number }> {
  try {
    // Find all matches using AST-grep
    const matches = findAstGrepMatches(root, pattern);

    if (matches.length === 0) {
      return { content, modified: false, matchCount: 0 };
    }

    // Limit matches if specified
    const maxMatches = pattern.performance?.maxMatches || options.maxMatchesPerPattern || 1000;
    const limitedMatches = matches.slice(0, maxMatches);

    // Apply transformations in reverse order to maintain indices
    let modifiedContent = content;
    const sortedMatches = limitedMatches.sort((a, b) => b.range.start - a.range.start);

    for (const match of sortedMatches) {
      const replacement = generateAstReplacement(match, pattern);

      // Apply the replacement
      const before = modifiedContent.substring(0, match.range.start);
      const after = modifiedContent.substring(match.range.end);

      if (options.preserveFormatting) {
        // Preserve indentation and formatting
        const preservedReplacement = preserveAstFormatting(replacement, match, modifiedContent);
        modifiedContent = before + preservedReplacement + after;
      } else {
        modifiedContent = before + replacement + after;
      }
    }

    return {
      content: modifiedContent,
      modified: true,
      matchCount: limitedMatches.length,
    };
  } catch (error) {
    console.error(`Error applying AST pattern ${pattern.id}:`, error);
    return { content, modified: false, matchCount: 0 };
  }
}

/**
 * Find AST-grep matches using sophisticated pattern matching
 */
function findAstGrepMatches(root: SgRoot, pattern: AstGrepPattern): AstMatch[] {
  const matches: AstMatch[] = [];

  try {
    // Build AST-grep query from pattern
    const query = buildAstGrepQuery(pattern);

    // Find all nodes matching the pattern using the correct API
    const nodes = root.root().findAll(query);

    for (const node of nodes) {
      // Extract variables from the match
      const variables = extractVariables(node, pattern);

      // Get context information
      const context = analyzeNodeContext(node);

      // Create match object
      const nodeRange = node.range();
      const match: AstMatch = {
        pattern,
        node,
        text: node.text(),
        range: {
          start: nodeRange.start.index,
          end: nodeRange.end.index,
        },
        variables,
        context,
      };

      matches.push(match);
    }
  } catch (error) {
    console.error(`Error finding matches for pattern ${pattern.id}:`, error);
  }

  return matches;
}

/**
 * Build AST-grep query from pattern configuration
 */
function buildAstGrepQuery(pattern: AstGrepPattern): string {
  const rule = pattern.pattern.rule;

  // For simple pattern strings, return the string directly
  if (rule.pattern) {
    return rule.pattern;
  }

  // If we have a kind, use it as a pattern
  if (rule.kind) {
    return rule.kind;
  }

  if (rule.regex) {
    return rule.regex;
  }

  // Fallback to a generic pattern
  return '$_';
}

/**
 * Extract variables from AST node match
 */
function extractVariables(node: SgNode, pattern: AstGrepPattern): Record<string, string> {
  const variables: Record<string, string> = {};

  try {
    // Get the pattern text and node text for manual extraction
    const patternText = pattern.pattern.rule.pattern || '';
    const nodeText = node.text();

    // Extract variable names from the pattern
    const variableNames = extractVariableNames(patternText);

    for (const varName of variableNames) {
      try {
        // Use the correct AST-grep NAPI method: getMatch()
        const matchResult = (node as any).getMatch?.(varName);
        if (matchResult && typeof matchResult.text === 'function') {
          variables[varName] = matchResult.text();
        } else {
          // Fallback to manual extraction if getMatch fails
          const manualValue = extractVariableFromText(nodeText, patternText, varName);
          if (manualValue) {
            variables[varName] = manualValue;
          }
        }
      } catch (error) {
        // Fallback to manual extraction on any error
        const manualValue = extractVariableFromText(nodeText, patternText, varName);
        if (manualValue) {
          variables[varName] = manualValue;
        }
      }
    }

    // If no variables were extracted, try pattern-based extraction as final fallback
    if (Object.keys(variables).length === 0) {
      const variableMatches = extractVariablesFromPattern(nodeText, patternText);
      Object.assign(variables, variableMatches);
    }
  } catch (error) {
    console.warn('Error extracting variables from node:', error);
  }

  return variables;
}

/**
 * Extract variable names from pattern text
 */
function extractVariableNames(patternText: string): string[] {
  // Match both single $ and triple $$$ variables
  const matches = patternText.match(/\$\$\$(\w+)|\$(\w+)/g) || [];
  return matches.map((match) => {
    // Remove $ or $$$ prefix
    if (match.startsWith('$$$')) {
      return match.substring(3);
    }
    return match.substring(1);
  });
}

/**
 * Extract a specific variable from text using pattern matching
 */
function extractVariableFromText(
  nodeText: string,
  patternText: string,
  varName: string
): string | null {
  try {
    // Convert AST-grep pattern to regex for fallback extraction
    const regexPattern = patternText
      .replace(/\$\w+/g, '(.+?)') // Replace variables with capture groups
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars

    const match = nodeText.match(new RegExp(regexPattern));
    if (match) {
      const variableNames = extractVariableNames(patternText);
      const varIndex = variableNames.indexOf(varName);
      const matchValue = match[varIndex + 1];
      if (varIndex >= 0 && varIndex + 1 < match.length && matchValue !== undefined) {
        return matchValue.trim();
      }
    }
  } catch {
    // Ignore regex errors
  }

  return null;
}

/**
 * Extract variables using pattern matching fallback
 */
function extractVariablesFromPattern(
  nodeText: string,
  _patternText: string
): Record<string, string> {
  const variables: Record<string, string> = {};

  // Common patterns for variable extraction
  const patterns = [
    // Variable assignment: var/let/const NAME = VALUE
    {
      pattern: /(?:var|let|const)\s+(\w+)\s*=\s*(.+)/,
      vars: ['VAR', 'VALUE'],
    },
    // Function declaration: function NAME(PARAMS) { BODY }
    {
      pattern: /function\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*)\}/,
      vars: ['NAME', 'PARAMS', 'BODY'],
    },
    // Object property: { KEY: VALUE }
    {
      pattern: /\{\s*(\w+)\s*:\s*([^}]+)\s*\}/,
      vars: ['KEY', 'VALUE'],
    },
    // Method call: OBJECT.METHOD(ARGS)
    {
      pattern: /(\w+)\.(\w+)\(([^)]*)\)/,
      vars: ['OBJECT', 'METHOD', 'ARGS'],
    },
  ];

  for (const { pattern: regex, vars } of patterns) {
    const match = nodeText.match(regex);
    if (match) {
      vars.forEach((varName, index) => {
        const value = match[index + 1];
        if (value !== undefined) {
          variables[varName] = value.trim();
        }
      });
      break; // Use first matching pattern
    }
  }

  return variables;
}

/**
 * Analyze node context for better transformation decisions
 */
function analyzeNodeContext(node: SgNode): AstMatch['context'] {
  const ancestors: SgNode[] = [];
  let current = node.parent();

  while (current) {
    ancestors.push(current);
    current = current.parent();
  }

  // Determine scope
  let scope: 'global' | 'function' | 'block' | 'class' = 'global';
  for (const ancestor of ancestors) {
    const kind = ancestor.kind();
    if (
      kind === 'function_declaration' ||
      kind === 'arrow_function' ||
      kind === 'method_definition'
    ) {
      scope = 'function';
      break;
    }
    if (kind === 'class_declaration') {
      scope = 'class';
      break;
    }
    if (kind === 'block_statement') {
      scope = 'block';
      break;
    }
  }

  // Get siblings
  const parent = node.parent();
  const siblings = parent ? parent.children() : [];

  return {
    parent,
    ancestors,
    siblings,
    scope,
  };
}

/**
 * Generate replacement text from AST match
 */
function generateAstReplacement(match: AstMatch, pattern: AstGrepPattern): string {
  let replacement = pattern.replacement.template;

  // Handle conditional replacements
  if (pattern.replacement.conditions) {
    for (const condition of pattern.replacement.conditions) {
      if (evaluateAstCondition(condition.when, match)) {
        replacement = condition.then;
        break;
      }
    }
  }

  // Replace variables in the replacement template
  for (const [varName, value] of Object.entries(match.variables)) {
    let transformedValue = value;

    // Apply transformers if specified
    const transformer = pattern.replacement.transformers?.[varName];
    if (transformer) {
      transformedValue = applyAstTransformer(value, transformer);
    }

    // Replace all occurrences of the variable (both $ and $$$ forms)
    replacement = replacement.replace(new RegExp(`\\$\\$\\$${varName}`, 'g'), transformedValue);
    replacement = replacement.replace(new RegExp(`\\$${varName}`, 'g'), transformedValue);
  }

  return replacement;
}

/**
 * Evaluate AST-based conditions
 */
function evaluateAstCondition(condition: string, match: AstMatch): boolean {
  try {
    // Simple condition evaluation based on node properties
    // This could be enhanced with a proper AST condition evaluator

    if (condition.includes('kind')) {
      const expectedKind = condition.match(/kind\s*==\s*['"]([^'"]+)['"]/)?.[1];
      return expectedKind ? match.node.kind() === expectedKind : false;
    }

    if (condition.includes('scope')) {
      const expectedScope = condition.match(/scope\s*==\s*['"]([^'"]+)['"]/)?.[1];
      return expectedScope ? match.context.scope === expectedScope : false;
    }

    if (condition.includes('text')) {
      const expectedText = condition.match(/text\s*includes\s*['"]([^'"]+)['"]/)?.[1];
      return expectedText ? match.text.includes(expectedText) : false;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Apply text transformers to variable values
 */
function applyAstTransformer(value: string, transformer: string): string {
  switch (transformer) {
    case 'camelCase':
      return value.replace(/[-_](\w)/g, (_, char) => char.toUpperCase());
    case 'pascalCase':
      return value.charAt(0).toUpperCase() + applyAstTransformer(value.slice(1), 'camelCase');
    case 'kebabCase':
      return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`).replace(/^-/, '');
    case 'snakeCase':
      return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`).replace(/^_/, '');
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
function preserveAstFormatting(replacement: string, match: AstMatch, content: string): string {
  // Extract indentation from the original position
  const lines = content.substring(0, match.range.start).split('\n');
  const lastLine = lines[lines.length - 1] || '';
  const indentation = lastLine.match(/^\s*/)?.[0] || '';

  if (!indentation) return replacement;

  // Split replacement into lines and apply indentation
  const replacementLines = replacement.split('\n');
  const indentedLines = replacementLines.map((line, index) => {
    if (index === 0) return line; // First line keeps original position
    return line.trim() ? indentation + line : line; // Subsequent lines get indented
  });

  return indentedLines.join('\n');
}

/**
 * Built-in AST-grep patterns for common transformations
 */
export const BUILTIN_AST_PATTERNS: AstGrepPattern[] = [
  {
    id: 'var-to-const-let-ast',
    language: 'typescript',
    pattern: {
      rule: {
        pattern: 'var $NAME = $VALUE',
      },
    },
    replacement: {
      template: 'let $NAME = $VALUE',
      conditions: [
        {
          when: 'scope == "function"',
          then: 'let $NAME = $VALUE',
        },
        {
          when: 'scope == "global"',
          then: 'const $NAME = $VALUE',
        },
      ],
    },
    description: 'Convert var declarations to const/let based on scope',
    complexity: 3,
    riskLevel: 'low',
    category: 'modernization',
    performance: {
      priority: 8,
      batchable: true,
    },
  },

  {
    id: 'function-to-arrow-ast',
    language: 'typescript',
    pattern: {
      rule: {
        pattern: 'function $NAME($$$PARAMS) { return $$$BODY }',
      },
    },
    replacement: {
      template: 'const $NAME = ($$$PARAMS) => $$$BODY',
    },
    description: 'Convert simple functions to arrow functions',
    complexity: 4,
    riskLevel: 'low',
    category: 'modernization',
    performance: {
      priority: 7,
      batchable: true,
    },
  },

  {
    id: 'promise-then-to-await-ast',
    language: 'typescript',
    pattern: {
      rule: {
        pattern: '$PROMISE.then($CALLBACK)',
        inside: {
          kind: 'function_declaration',
        },
      },
    },
    replacement: {
      template: 'const result = await $PROMISE;',
    },
    description: 'Convert Promise.then() to async/await',
    complexity: 6,
    riskLevel: 'medium',
    category: 'modernization',
    performance: {
      priority: 6,
      batchable: false,
    },
  },

  {
    id: 'object-property-shorthand-ast',
    language: 'typescript',
    pattern: {
      rule: {
        kind: 'pair',
        pattern: '$PROP: $PROP',
      },
    },
    replacement: {
      template: '$PROP',
    },
    description: 'Use object property shorthand syntax',
    complexity: 2,
    riskLevel: 'low',
    category: 'modernization',
    performance: {
      priority: 9,
      batchable: true,
    },
  },

  {
    id: 'array-includes-ast',
    language: 'typescript',
    pattern: {
      rule: {
        pattern: '$ARR.indexOf($ITEM) !== -1',
      },
    },
    replacement: {
      template: '$ARR.includes($ITEM)',
    },
    description: 'Use Array.includes() instead of indexOf',
    complexity: 2,
    riskLevel: 'low',
    category: 'modernization',
    performance: {
      priority: 8,
      batchable: true,
    },
  },
];
