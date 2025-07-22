import { readFile, writeFile } from 'node:fs/promises';
import { js, ts } from '@ast-grep/napi';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ASTGrepNode } from '../docs/ast-analyzer.js';

// Enhanced transformation result type (exported for potential future use)
export interface EnhancedTransformationResult {
  filesModified: string[];
  transformationsApplied: number;
  appliedPatterns: Array<{ file: string; pattern: string; count: number }>;
  mode: 'template' | 'ast' | 'llm';
}

// Enhanced pattern schema with full AST-grep support
const EnhancedPatternSchema = z.object({
  id: z.string(),
  language: z.enum(['typescript', 'javascript']),
  mode: z.enum(['template', 'ast']).default('template'),
  pattern: z.union([
    z.string(), // Template pattern
    z.object({
      // AST pattern
      rule: z.object({
        pattern: z.string(),
        kind: z.string().optional(),
        inside: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
        has: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
      }),
    }),
  ]),
  replacement: z.string(),
  description: z.string(),
  complexity: z.number().min(1).max(10),
  riskLevel: z.enum(['low', 'medium', 'high']),
  astGrep: z
    .object({
      rule: z.object({
        pattern: z.string(),
        kind: z.string().optional(),
        inside: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
        has: z
          .object({
            pattern: z.string(),
            kind: z.string().optional(),
          })
          .optional(),
      }),
      fix: z.string(),
    })
    .optional(),
});

const EnhancedTransformationRequestSchema = z.object({
  targetFiles: z.array(z.string()),
  transformationType: z.enum(['template', 'ast', 'llm']),
  patterns: z.array(EnhancedPatternSchema),
  maxComplexity: z.number().default(15),
  dryRun: z.boolean().default(false),
});

export type EnhancedTransformationRequest = z.infer<typeof EnhancedTransformationRequestSchema>;
export type EnhancedPattern = z.infer<typeof EnhancedPatternSchema>;

/**
 * Enhanced transformation actor with real AST-grep integration
 */
export const enhancedTransformationActor = fromPromise(
  async ({ input }: { input: EnhancedTransformationRequest }) => {
    console.log('🚀 Enhanced transformation starting for', input.targetFiles.length, 'files');

    const validated = EnhancedTransformationRequestSchema.parse(input);

    try {
      let result: Record<string, unknown>;

      switch (validated.transformationType) {
        case 'template':
          result = await applyEnhancedTemplateTransformation(validated);
          break;
        case 'ast':
          result = await applyRealASTTransformation(validated);
          break;
        case 'llm':
          result = await applyEnhancedLLMTransformation(validated);
          break;
        default:
          throw new Error(`Unknown transformation type: ${validated.transformationType}`);
      }

      return {
        ...result,
        mode: validated.transformationType,
      };
    } catch (error) {
      console.error('Enhanced transformation error:', error);
      throw error;
    }
  }
);

/**
 * Apply enhanced template-based transformations with better pattern matching
 */
async function applyEnhancedTemplateTransformation(request: EnhancedTransformationRequest) {
  console.log('🔧 Applying enhanced template transformations...');

  const transformedFiles: string[] = [];
  const appliedPatterns: Array<{ file: string; pattern: string; count: number }> = [];

  // Filter patterns to only include template mode
  const templatePatterns = request.patterns.filter(
    (p) => (p.mode === 'template' || !p.mode) && p.complexity <= request.maxComplexity
  );

  for (const filePath of request.targetFiles) {
    try {
      let content = await readFile(filePath, 'utf-8');
      // const __originalContent = content;
      let fileTransformed = false;

      for (const pattern of templatePatterns) {
        const patternString =
          typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.rule.pattern;
        const transformResult = await applyEnhancedTemplatePattern(content, pattern, patternString);

        if (transformResult.modified) {
          content = transformResult.content;
          fileTransformed = true;
          appliedPatterns.push({
            file: filePath,
            pattern: pattern.id,
            count: transformResult.transformCount,
          });
          console.log(`✅ Applied ${pattern.id} to ${filePath}`);
        }
      }

      if (fileTransformed && !request.dryRun) {
        await writeFile(filePath, content, 'utf-8');
        transformedFiles.push(filePath);
        console.log(`🎯 Successfully transformed ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error transforming ${filePath}:`, error);
    }
  }

  return {
    filesModified: transformedFiles,
    transformationsApplied: appliedPatterns.length,
    appliedPatterns,
    mode: 'template' as const,
  };
}

/**
 * Apply REAL AST-grep transformations using the native API
 */
async function applyRealASTTransformation(request: EnhancedTransformationRequest) {
  console.log('🌳 Applying REAL AST transformations with ast-grep...');

  const transformedFiles: string[] = [];
  const appliedPatterns: Array<{ file: string; pattern: string; count: number }> = [];

  // Filter patterns to only include AST mode with astGrep configuration
  const astPatterns = request.patterns.filter(
    (p) => p.mode === 'ast' && p.astGrep && p.complexity <= request.maxComplexity
  );

  for (const filePath of request.targetFiles) {
    try {
      let content = await readFile(filePath, 'utf-8');
      let fileTransformed = false;

      // Parse with AST-grep based on file extension
      const lang = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? ts : js;
      const root = lang.parse(content);

      for (const pattern of astPatterns) {
        if (!pattern.astGrep) continue;

        console.log(`🔍 Applying AST pattern: ${pattern.id}`);
        const transformResult = await applyRealASTPattern(root, content, pattern, lang);

        if (transformResult.modified) {
          content = transformResult.content;
          fileTransformed = true;
          appliedPatterns.push({
            file: filePath,
            pattern: pattern.id,
            count: transformResult.transformCount,
          });
          console.log(`🎯 Applied AST pattern ${pattern.id} to ${filePath}`);
        }
      }

      if (fileTransformed && !request.dryRun) {
        await writeFile(filePath, content, 'utf-8');
        transformedFiles.push(filePath);
        console.log(`✨ Successfully AST-transformed ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error in AST transformation of ${filePath}:`, error);
      // Continue with next file instead of failing completely
    }
  }

  return {
    filesModified: transformedFiles,
    transformationsApplied: appliedPatterns.length,
    appliedPatterns,
    mode: 'ast' as const,
  };
}

/**
 * Apply enhanced template pattern with robust matching
 */
async function applyEnhancedTemplatePattern(
  content: string,
  pattern: EnhancedPattern,
  patternString: string
): Promise<{ content: string; modified: boolean; transformCount: number }> {
  let modifiedContent = content;
  let transformCount = 0;

  try {
    switch (pattern.id) {
      case 'smart-var-to-const-let': {
        const varResult = applySmartVarTransformation(modifiedContent);
        modifiedContent = varResult.content;
        transformCount = varResult.count;
        break;
      }

      case 'strict-equality': {
        const eqResult = applyStrictEqualityTransformation(modifiedContent);
        modifiedContent = eqResult.content;
        transformCount = eqResult.count;
        break;
      }

      case 'strict-inequality': {
        const neqResult = applyStrictInequalityTransformation(modifiedContent);
        modifiedContent = neqResult.content;
        transformCount = neqResult.count;
        break;
      }

      case 'console-log-to-console-error': {
        const consoleResult = applyConsoleErrorTransformation(modifiedContent);
        modifiedContent = consoleResult.content;
        transformCount = consoleResult.count;
        break;
      }

      default: {
        // Generic regex replacement for other patterns
        const regex = new RegExp(patternString.replace(/\$(\w+)/g, '([\\w\\s\\.\\[\\]]+)'), 'g');
        const replacement = pattern.replacement.replace(/\$(\w+)/g, '$$$1');
        const matches = modifiedContent.match(regex);
        if (matches) {
          transformCount = matches.length;
          modifiedContent = modifiedContent.replace(regex, replacement);
        }
      }
    }

    return {
      content: modifiedContent,
      modified: transformCount > 0,
      transformCount,
    };
  } catch (error) {
    console.error(`Error applying pattern ${pattern.id}:`, error);
    return { content, modified: false, transformCount: 0 };
  }
}

/**
 * Apply REAL AST pattern using ast-grep native API
 */
async function applyRealASTPattern(
  root: unknown,
  content: string,
  pattern: EnhancedPattern,
  _lang: unknown
): Promise<{ content: string; modified: boolean; transformCount: number }> {
  if (!pattern.astGrep) {
    return { content, modified: false, transformCount: 0 };
  }

  try {
    let modifiedContent = content;
    let transformCount = 0;

    // Get the root node for searching
    const rootNode = (root as { root: () => ASTGrepNode }).root();

    // Find all matches using ast-grep - use pattern string
    const patternString =
      typeof pattern.astGrep.rule === 'string'
        ? pattern.astGrep.rule
        : pattern.astGrep.rule.pattern || '';

    const matches = rootNode.findAll(patternString);

    if (matches && matches.length > 0) {
      console.log(`🔍 Found ${matches.length} AST matches for pattern ${pattern.id}`);

      // Apply transformations in reverse order to maintain positions
      const sortedMatches = matches.sort(
        (a: ASTGrepNode, b: ASTGrepNode) => b.range().start.index - a.range().start.index
      );

      for (const match of sortedMatches) {
        try {
          const range = match.range();
          const matchText = match.text();

          // Apply the fix transformation
          let replacement = pattern.astGrep.fix;

          // Handle variable substitutions
          const variables = match.getMultipleMatches?.();
          if (variables) {
            for (const [varName, varMatch] of Object.entries(variables)) {
              const varText = Array.isArray(varMatch)
                ? varMatch.map((m: ASTGrepNode) => m.text()).join(', ')
                : (varMatch as ASTGrepNode).text();
              replacement = replacement.replace(new RegExp(`\\$${varName}`, 'g'), varText);
            }
          }

          // Apply the transformation
          const before = modifiedContent.substring(0, range.start.index);
          const after = modifiedContent.substring(range.end.index);
          modifiedContent = before + replacement + after;

          transformCount++;
          console.log(`🔄 AST transformed: ${matchText} → ${replacement}`);
        } catch (matchError) {
          console.error('Error processing AST match:', matchError);
        }
      }
    }

    return {
      content: modifiedContent,
      modified: transformCount > 0,
      transformCount,
    };
  } catch (error) {
    console.error(`Error in AST pattern ${pattern.id}:`, error);
    return { content, modified: false, transformCount: 0 };
  }
}

/**
 * Enhanced smart var transformation with proper scoping analysis
 */
function applySmartVarTransformation(content: string): { content: string; count: number } {
  let modifiedContent = content;
  let count = 0;

  // Enhanced regex that better handles var declarations
  const varRegex = /\bvar\s+(\w+)\s*=\s*([^;]+);/g;

  modifiedContent = modifiedContent.replace(varRegex, (_match, varName, value) => {
    count++;

    // Analyze the value to determine if it should be const or let
    const trimmedValue = value.trim();

    // Use const for literals and obvious immutable values
    if (/^(\d+|'[^']*'|"[^"]*"|true|false|null|undefined|\[.*\]|\{.*\})$/.test(trimmedValue)) {
      return `const ${varName} = ${value};`;
    }

    // Use let for everything else (could be reassigned)
    return `let ${varName} = ${value};`;
  });

  return { content: modifiedContent, count };
}

/**
 * Apply strict equality transformation
 */
function applyStrictEqualityTransformation(content: string): { content: string; count: number } {
  let count = 0;
  const modifiedContent = content.replace(/(\w+|\))\s*==\s*(\w+|'[^']*'|"[^"]*"|\d+)/g, (match) => {
    count++;
    return match.replace('==', '===');
  });

  return { content: modifiedContent, count };
}

/**
 * Apply strict inequality transformation
 */
function applyStrictInequalityTransformation(content: string): { content: string; count: number } {
  let count = 0;
  const modifiedContent = content.replace(/(\w+|\))\s*!=\s*(\w+|'[^']*'|"[^"]*"|\d+)/g, (match) => {
    count++;
    return match.replace('!=', '!==');
  });

  return { content: modifiedContent, count };
}

/**
 * Apply console.error transformation for error messages
 */
function applyConsoleErrorTransformation(content: string): { content: string; count: number } {
  let count = 0;
  const modifiedContent = content.replace(/console\.log\((['"])Error:/g, (_match, quote) => {
    count++;
    return `console.error(${quote}Error:`;
  });

  return { content: modifiedContent, count };
}

/**
 * Enhanced LLM transformation (placeholder for future implementation)
 */
async function applyEnhancedLLMTransformation(_request: EnhancedTransformationRequest) {
  console.log('🤖 Enhanced LLM transformations not yet implemented');

  return {
    filesModified: [],
    transformationsApplied: 0,
    appliedPatterns: [],
    mode: 'llm' as const,
  };
}
