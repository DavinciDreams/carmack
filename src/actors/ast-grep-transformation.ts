import { parse, pattern as compilePattern, Lang, type SgNode, type SgRoot } from '@ast-grep/napi';
import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import {
  AstGrepTransformationRequestSchema,
  type AstGrepPattern,
  type AstGrepTransformationRequest,
  type AstMatch
} from './transformation';

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
/* AstGrepPatternSchema now imported from ./transformation */


/**
 * Enhanced AST-grep transformation actor
 */
export const astGrepTransformationActor = fromPromise(
  async ({ input }: { input: AstGrepTransformationRequest }) => {
    const validatedInput = AstGrepTransformationRequestSchema.parse(input);


      `🌳 Starting AST-grep transformations on ${validatedInput.targetFiles.length} files with ${validatedInput.patterns.length} patterns`

    const results = await applyAstGrepTransformations(validatedInput);


      `✨ AST-grep engine completed: ${results.transformationsApplied} transformations across ${results.filesModified.length} files`

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


          `🌳 AST-transformed ${filePath}: ${transformResult.transformations.length} patterns applied`
      }
    } catch (error) {

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

  // Determine language for AST-grep
  // Use the first pattern's language or infer from file extension
  let lang = patterns[0]?.language || inferLanguageFromFile(filePath);
  if (Lang[lang as keyof typeof Lang]) {
    lang = Lang[lang as keyof typeof Lang];
  }
  // Parse the source code into AST
  let root: SgRoot;
  try {
    root = parse(lang, modifiedContent);
  } catch (error) {

    return { content, modified: false, transformations: [] };
  }

  // Track applied patterns to avoid conflicts
  const appliedPatterns = new Set<string>();

  for (const pattern of patterns) {
    // Skip conflicting patterns if option is enabled
    if (options.skipConflicts && pattern.performance?.conflicts) {
      const hasConflict = pattern.performance.conflicts.some((id) => appliedPatterns.has(id));
      if (hasConflict) {

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



      // Re-parse for subsequent patterns
      try {
        root = parse(lang, modifiedContent);
      } catch (error) {

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
  lang: string | Lang,
  options: AstGrepTransformationRequest['options']
): Promise<{ content: string; modified: boolean; matchCount: number }> {
  try {
  // Find all matches using AST-grep
  const matches = findAstGrepMatches(root, pattern, lang);

    if (matches.length === 0) {
      return { content, modified: false, matchCount: 0 };
    }

    // Limit matches if specified
    const maxMatches = pattern.performance?.maxMatches ?? matches.length;
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

    return { content, modified: false, matchCount: 0 };
  }
}

/**
 * Find AST-grep matches using sophisticated pattern matching
 */
function findAstGrepMatches(root: SgRoot, pattern: AstGrepPattern, lang: string | Lang): AstMatch[] {
  const matches: AstMatch[] = [];

  try {
  // Build AST-grep query from pattern
  const query = buildAstGrepQuery(pattern, lang);
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
        node: {
          type: node.kind?.().toString() ?? 'unknown',
          text: node.text(),
          start: nodeRange.start.index,
          end: nodeRange.end.index,
          children: node.children?.().map(child => ({
            type: child.kind?.().toString() ?? 'unknown',
            text: child.text(),
            start: child.range().start.index,
            end: child.range().end.index,
            // children property will be recursively filled if needed
          })),
        },
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

  }

  return matches;
}

/**
 * Build AST-grep query from pattern configuration
 */
function buildAstGrepQuery(pattern: AstGrepPattern, lang: string | Lang): any {
  // Use AST-grep's pattern compiler for robust matching
  const rule = pattern.pattern.rule;
  // Prefer pattern string if present
  if (rule.pattern) {
    return compilePattern(lang, rule.pattern);
  }
  // If we have a kind, use it as a pattern
  if (rule.kind) {
    return compilePattern(lang, rule.kind);
  }
  if (rule.regex) {
    return compilePattern(lang, rule.regex);
  }
  // Fallback to a generic pattern
  return compilePattern(lang, '$_');
}

/**
 * Infer language from file extension (fallback for AST-grep)
 */
function inferLanguageFromFile(filePath: string): string {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.cpp') || filePath.endsWith('.cc') || filePath.endsWith('.cxx')) return 'cpp';
  if (filePath.endsWith('.go')) return 'go';
  if (filePath.endsWith('.rs')) return 'rust';
  if (filePath.endsWith('.java')) return 'java';
  if (filePath.endsWith('.cs')) return 'csharp';
  if (filePath.endsWith('.php')) return 'php';
  if (filePath.endsWith('.rb')) return 'ruby';
  if (filePath.endsWith('.swift')) return 'swift';
  if (filePath.endsWith('.kt')) return 'kotlin';
  if (filePath.endsWith('.scala')) return 'scala';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.css')) return 'css';
  return 'auto';
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
        const matchResult = (
          node as unknown as { getMatch?: (name: string) => { text(): string } | null }
        ).getMatch?.(varName);
        if (matchResult && typeof matchResult.text === 'function') {
          const value = matchResult.text();
          variables[varName] = value;

        } else {
          // Fallback to manual extraction if getMatch fails
          const manualValue = extractVariableFromText(nodeText, patternText, varName);
          if (manualValue) {
            variables[varName] = manualValue;

          } else {

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
      if (Object.keys(variableMatches).length > 0) {

          `   ✅ Pattern-based extraction found: ${Object.keys(variableMatches).join(', ')}`
      }
    }


  } catch (error) {

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
  const ancestors: Array<{
    type: string;
    text: string;
    start: number;
    end: number;
    children?: Array<{
      type: string;
      text: string;
      start: number;
      end: number;
    }>;
  }> = [];
  let current = node.parent();

  while (current) {
    const range = current.range();
    ancestors.push({
      type: current.kind?.().toString() ?? 'unknown',
      text: current.text(),
      start: range.start.index,
      end: range.end.index,
      children: current.children?.().map(child => ({
        type: child.kind?.().toString() ?? 'unknown',
        text: child.text(),
        start: child.range().start.index,
        end: child.range().end.index,
      })),
    });
    current = current.parent();
  }

  // Determine scope
  let scope: 'global' | 'function' | 'block' | 'class' = 'global';
  for (const ancestor of ancestors) {
    // ancestor is a mapped SgNode, not the original SgNode, so use type property
    const kind = (ancestor as any).type;
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
  const parent = node.parent() as SgNode | null;
  const siblings = parent
    ? parent.children().map(child => {
        const range = child.range();
        return {
          type: child.kind?.().toString() ?? 'unknown',
          text: child.text(),
          start: range.start.index,
          end: range.end.index,
          children: child.children?.().map(grandchild => ({
            type: grandchild.kind?.().toString() ?? 'unknown',
            text: grandchild.text(),
            start: grandchild.range().start.index,
            end: grandchild.range().end.index,
          })),
        };
      })
    : [];

  return {
    parent: null, // or remove this line if not needed
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
      // Safely access kind: prefer kind() if available, else use type
      if (!expectedKind) return false;
      const nodeKind = typeof match.node.kind === 'function'
        ? match.node.kind()
        : match.node.type;
      return nodeKind === expectedKind;
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
          // biome-ignore lint/suspicious/noThenProperty: AST-grep uses 'then' for replacement templates
          then: 'let $NAME = $VALUE',
        },
        {
          when: 'scope == "global"',
          // biome-ignore lint/suspicious/noThenProperty: AST-grep uses 'then' for replacement templates
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
        pattern: 'function $NAME($PARAMS) { return $BODY; }',
      },
    },
    replacement: {
      template: 'const $NAME = ($PARAMS) => $BODY',
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
        pattern: '$KEY: $KEY',
      },
    },
    replacement: {
      template: '$KEY',
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
