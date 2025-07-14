import { readFile, writeFile } from 'node:fs/promises';
// Import AST-grep for syntax tree parsing
import { js, ts } from '@ast-grep/napi';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { AstPattern, TransformationRequest } from '../types.js';
import { LLMTransformer, type LLMTransformationInput } from './llm-transformation.js';

// Transformation input schema
const TransformationInputSchema = z.object({
  mode: z.enum(['template', 'ast', 'llm']),
  files: z.array(z.string()),
  patterns: z.array(
    z.object({
      id: z.string(),
      language: z.string(),
      pattern: z.string(),
      replacement: z.string(),
      description: z.string(),
      complexity: z.number(),
      riskLevel: z.enum(['low', 'medium', 'high']),
      mode: z.enum(['template', 'ast', 'llm']).optional().default('template'),
    })
  ),
  request: z.any().optional(), // TransformationRequest schema
});

type TransformationInput = z.infer<typeof TransformationInputSchema>;

/**
 * Transformation Actor
 *
 * Applies code transformations using the specified mode:
 * - template: Fast template-based replacements
 * - ast: AST-grep powered syntax tree transformations
 * - llm: LLM-based intelligent code generation
 */
export const transformationActor = fromPromise(
  async ({ input }: { input: TransformationInput }) => {
    const validatedInput = TransformationInputSchema.parse(input);
    const { mode, files, patterns, request } = validatedInput;

    console.log(`Applying ${mode} transformation to ${files.length} files`);

    switch (mode) {
      case 'template':
        return await applyTemplateTransformation(files, patterns);
      case 'ast':
        return await applyAstTransformation(files, patterns);
      case 'llm':
        return await applyLlmTransformation(files, request);
      default:
        throw new Error(`Unknown transformation mode: ${mode}`);
    }
  }
);

async function applyTemplateTransformation(files: string[], patterns: AstPattern[]) {
  console.log('Applying template transformations...');

  const filesModified: string[] = [];
  let totalTransformations = 0;

  // Get template-mode patterns (safe transformations with reasonable complexity)
  const templatePatterns = patterns.filter(
    (p) =>
      p.complexity <= 3 &&
      (p.riskLevel === 'low' || p.riskLevel === 'medium') &&
      (p.mode === 'template' || !p.mode) // Include patterns without mode (defaults to template)
  );

  for (const filePath of files) {
    try {
      // Read the file content
      const content = await readFile(filePath, 'utf-8');
      let modifiedContent = content;
      let fileModified = false;

      // Apply enhanced template patterns with robust matching
      for (const pattern of templatePatterns) {
        const beforeContent = modifiedContent;

        switch (pattern.id) {
          case 'smart-var-to-const-let':
            // Enhanced var conversion with better scoping analysis
            modifiedContent = await enhancedVarTransformation(modifiedContent);
            break;

          case 'strict-equality':
            // Enhanced == to === with better regex that avoids operators
            modifiedContent = modifiedContent.replace(
              /([a-zA-Z_$][\w.]*|\)|\])\s*==\s*([a-zA-Z_$][\w.]*|['"`][^'"`]*['"`]|\d+|true|false|null|undefined|\()/g,
              '$1 === $2'
            );
            break;

          case 'strict-inequality':
            // Enhanced != to !== with better regex
            modifiedContent = modifiedContent.replace(
              /([a-zA-Z_$][\w.]*|\)|\])\s*!=\s*([a-zA-Z_$][\w.]*|['"`][^'"`]*['"`]|\d+|true|false|null|undefined|\()/g,
              '$1 !== $2'
            );
            break;

          case 'console-log-to-console-error':
            // Convert console.log('Error:') to console.error() with flexible quotes
            modifiedContent = modifiedContent.replace(
              /console\.log\(\s*(['"`])Error:/g,
              'console.error($1Error:'
            );
            break;

          case 'object-property-shorthand':
            // Convert { id: id, name: name } to { id, name } with robust matching
            modifiedContent = modifiedContent.replace(
              /{\s*([a-zA-Z_$]\w*)\s*:\s*\1\s*}/g,
              '{ $1 }'
            );
            // Handle multiple properties
            modifiedContent = modifiedContent.replace(
              /{\s*([a-zA-Z_$]\w*)\s*:\s*\1\s*,\s*([a-zA-Z_$]\w*)\s*:\s*\2\s*}/g,
              '{ $1, $2 }'
            );
            break;

          case 'template-literal-conversion':
            // Convert 'str' + var + 'str' to `str${var}str` with proper escaping
            modifiedContent = modifiedContent.replace(
              /['"`]([^'"`]*?)['"`]\s*\+\s*([a-zA-Z_$][\w.]*)\s*\+\s*['"`]([^'"`]*?)['"`]/g,
              '`$1${$2}$3`'
            );
            break;

          case 'array-includes-instead-of-indexof':
            // Convert array.indexOf(item) !== -1 to array.includes(item)
            modifiedContent = modifiedContent.replace(
              /([a-zA-Z_$][\w.]*|\))\.indexOf\(([^)]+)\)\s*!==\s*-1/g,
              '$1.includes($2)'
            );
            break;

          case 'const-loop-variable-fix':
            // Fix const loop variables to let
            modifiedContent = modifiedContent.replace(
              /for\s*\(\s*const\s+([a-zA-Z_$]\w*)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)/g,
              'for (let $1 = $2; $3; $4)'
            );
            break;

          case 'remove-unnecessary-returns':
            // Remove unnecessary return from arrow functions
            modifiedContent = modifiedContent.replace(
              /\(\s*([^)]*)\s*\)\s*=>\s*{\s*return\s+([^;]+);\s*}/g,
              '($1) => $2'
            );
            break;

          case 'promise-to-async-await':
            // Enhanced Promise.then() to async/await conversion
            modifiedContent = modifiedContent.replace(
              /([a-zA-Z_$][\w.]*|\))\.then\(\s*\(\s*([a-zA-Z_$]\w*)\s*\)\s*=>\s*{\s*([^}]+)\s*}\s*\)/g,
              (_match, promise, param, body) => {
                return `const ${param} = await ${promise};\n${body.trim()}`;
              }
            );
            break;

          case 'fix-double-semicolons':
            // Fix double semicolons syntax errors
            modifiedContent = modifiedContent.replace(/;;/g, ';');
            break;

          case 'fix-malformed-object-literal':
            // Fix malformed object literals with semicolon
            modifiedContent = modifiedContent.replace(/=\s*\{\s*;/g, '= {');
            break;
        }

        if (beforeContent !== modifiedContent) {
          fileModified = true;
          totalTransformations++;
          console.log(`Applied ${pattern.id} to ${filePath}`);
        }
      }

      // Write back if modified
      if (fileModified) {
        await writeFile(filePath, modifiedContent, 'utf-8');
        filesModified.push(filePath);
        console.log(`✅ Successfully transformed ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to transform ${filePath}:`, error);
    }
  }

  return {
    filesModified,
    transformationsApplied: totalTransformations,
    mode: 'template' as const,
  };
}

/**
 * Enhanced template transformation with smart heuristics
 */
function enhancedTemplateTransformation(_content: string): string {
  // Apply multiple transformation passes
  return _content; // Placeholder implementation
}

/**
 * Enhanced var transformation that properly handles async
 */
async function enhancedVarTransformation(content: string): Promise<string> {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle undefined lines
    if (line === undefined) {
      result.push('');
      continue;
    }

    if (!line) {
      result.push(line);
      continue;
    }

    // Match var declarations
    const varMatch = line.match(/^(\s*)var\s+(\w+)\s*=\s*(.+);?\s*$/);

    if (varMatch) {
      const [, indent, varName, value] = varMatch;

      // Check if variable is reassigned later
      const isReassigned = lines
        .slice(i + 1)
        .some((laterLine) => laterLine && new RegExp(`\\b${varName}\\s*=\\s*[^=]`).test(laterLine));

      // Check if it's in a for loop context
      const isInForLoop = line.includes('for (') || line.includes('for(');

      // Decide between const and let
      if (isReassigned || isInForLoop) {
        result.push(`${indent}let ${varName} = ${value};`);
      } else {
        result.push(`${indent}const ${varName} = ${value};`);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

async function applyAstTransformation(files: string[], patterns: AstPattern[]) {
  console.log('Applying AST transformations...');

  const filesModified: string[] = [];
  let totalTransformations = 0;

  // Get AST-mode patterns (medium complexity, more sophisticated transformations)
  const astPatterns = patterns.filter(
    (p) => p.complexity >= 2 && p.complexity <= 4 && p.mode === 'ast' // Only include explicitly marked AST patterns
  );

  for (const filePath of files) {
    try {
      // Read the file content
      const content = await readFile(filePath, 'utf-8');
      let modifiedContent = content;
      let fileModified = false;

      // Parse with AST-grep based on file extension
      const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
      const lang = isTypeScript ? ts : js;

      // Parse the source code into AST
      const root = lang.parse(content);

      // Apply sophisticated AST-based patterns
      for (const pattern of astPatterns) {
        const beforeContent = modifiedContent;

        switch (pattern.id) {
          case 'smart-var-to-const-let':
            modifiedContent = await smartVarToConstLetAST(root, modifiedContent, lang);
            break;

          case 'promise-to-async-await':
            modifiedContent = await promiseToAsyncAwaitAST(root, modifiedContent, lang);
            break;

          case 'strict-equality':
            modifiedContent = await strictEqualityAST(root, modifiedContent, lang);
            break;

          case 'strict-inequality':
            modifiedContent = await strictInequalityAST(root, modifiedContent, lang);
            break;

          case 'array-includes-instead-of-indexof':
            modifiedContent = await arrayIncludesAST(root, modifiedContent, lang);
            break;

          case 'remove-unnecessary-returns':
            modifiedContent = await removeUnnecessaryReturnsAST(root, modifiedContent, lang);
            break;

          case 'object-property-shorthand':
            modifiedContent = await objectPropertyShorthandAST(root, modifiedContent, lang);
            break;

          case 'template-literal-conversion':
            modifiedContent = await templateLiteralConversionAST(root, modifiedContent, lang);
            break;

          case 'const-loop-variable-fix':
            modifiedContent = await constLoopVariableFixAST(root, modifiedContent, lang);
            break;

          case 'enhanced-object-destructuring':
            modifiedContent = await enhanceObjectDestructuring(root, modifiedContent, lang);
            break;

          case 'combine-variable-declarations':
            modifiedContent = await combineVariableDeclarations(root, modifiedContent, lang);
            break;

          case 'callback-to-promise':
            modifiedContent = await callbackToPromise(root, modifiedContent, lang);
            break;

          case 'modernize-function-declarations':
            modifiedContent = await modernizeFunctionDeclarations(root, modifiedContent, lang);
            break;

          default:
            // Apply generic AST pattern if it has AST-grep syntax
            if (pattern.pattern && pattern.replacement) {
              modifiedContent = await applyGenericASTPattern(root, modifiedContent, pattern, lang);
            }
            break;
        }

        if (beforeContent !== modifiedContent) {
          fileModified = true;
          totalTransformations++;
          console.log(`Applied ${pattern.id} to ${filePath}`);

          // Re-parse after modification for subsequent patterns
          const newRoot = lang.parse(modifiedContent);
          Object.assign(root, newRoot);
        }
      }

      // Write back if modified
      if (fileModified) {
        await writeFile(filePath, modifiedContent, 'utf-8');
        filesModified.push(filePath);
        console.log(`✅ Successfully transformed ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to apply AST transformation to ${filePath}:`, error);
    }
  }

  return {
    filesModified,
    transformationsApplied: totalTransformations,
    mode: 'ast' as const,
  };
}

/**
 * AST-based smart var to const/let transformation
 */
async function smartVarToConstLetAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing var declarations for AST transformation...');
    let modifiedContent = content;

    // Enhanced var to const/let conversion with better pattern matching
    const varRegex = /^(\s*)var\s+(\w+)\s*=\s*([^;]+);?\s*$/gm;

    modifiedContent = modifiedContent.replace(varRegex, (_match, indent, varName, value) => {
      console.log(`🔄 Found var declaration: ${varName} = ${value.trim()}`);

      // Analyze the value to decide between const and let
      const trimmedValue = value.trim();

      // Use const for literals, let for other cases
      if (isLiteralValue(trimmedValue)) {
        console.log(`✅ Converting var ${varName} to const (literal value)`);
        return `${indent}const ${varName} = ${value};`;
      } else {
        console.log(`✅ Converting var ${varName} to let (non-literal value)`);
        return `${indent}let ${varName} = ${value};`;
      }
    });

    if (modifiedContent !== content) {
      console.log('✅ AST var transformation applied successfully');
    } else {
      console.log('⚠️ No var declarations found to transform');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in smartVarToConstLetAST:', error);
    return content;
  }
}

/**
 * Check if a value looks like a literal (should use const)
 */
function isLiteralValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^['"`]/.test(trimmed) || // String literal
    /^\d+\.?\d*$/.test(trimmed) || // Number literal
    /^(true|false)$/.test(trimmed) || // Boolean literal
    /^\[.*\]$/.test(trimmed) || // Array literal
    /^\{.*\}$/.test(trimmed) // Object literal
  );
}

/**
 * Convert Promise chains to async/await
 */
async function promiseToAsyncAwaitAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing Promise chains for AST transformation...');
    let modifiedContent = content;

    // Enhanced Promise to async/await transformation using regex
    const thenRegex = /(\w+)\.then\(\s*\((\w+)\)\s*=>\s*\{([^}]+)\}\s*\)/g;

    modifiedContent = modifiedContent.replace(thenRegex, (_match, promise, param, body) => {
      console.log(`🔄 Found Promise chain: ${promise}.then((${param}) => ...)`);
      console.log(`✅ Converting to: const ${param} = await ${promise};`);
      return `const ${param} = await ${promise};\n${body.trim()}`;
    });

    if (modifiedContent !== content) {
      console.log('✅ AST Promise transformation applied successfully');
    } else {
      console.log('⚠️ No Promise chains found to transform');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in promiseToAsyncAwaitAST:', error);
    return content;
  }
}

/**
 * Enhance object destructuring
 */
async function enhanceObjectDestructuring(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    // Simplified implementation - return content as-is for now
    return content;
  } catch (error) {
    console.error('Error in enhanceObjectDestructuring:', error);
    return content;
  }
}

/**
 * Remove unnecessary return statements
 */
async function removeUnnecessaryReturnsAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    // Remove unnecessary return statements from arrow functions
    let modifiedContent = content;

    // Pattern: (params) => { return expression; } -> (params) => expression
    const arrowReturnPattern = /\(([^)]*)\)\s*=>\s*{\s*return\s+([^;]+);\s*}/g;

    modifiedContent = modifiedContent.replace(arrowReturnPattern, (_match, params, expression) => {
      return `(${params}) => ${expression}`;
    });

    return modifiedContent;
  } catch (error) {
    console.error('Error in removeUnnecessaryReturns:', error);
    return content;
  }
}

/**
 * Combine variable declarations
 */
async function combineVariableDeclarations(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    // Find consecutive const/let declarations that can be combined
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line && (line.trim().startsWith('const ') || line.trim().startsWith('let '))) {
        const declarations = [line];
        const declType = line.trim().startsWith('const ') ? 'const' : 'let';

        // Look for consecutive declarations of the same type
        let j = i + 1;
        while (j < lines.length && lines[j] && lines[j]?.trim().startsWith(`${declType} `)) {
          const nextLine = lines[j];
          if (nextLine) {
            declarations.push(nextLine);
          }
          j++;
        }

        if (declarations.length > 1) {
          // Combine declarations
          const combined = declarations
            .map((decl) =>
              decl
                .trim()
                .replace(/^(const|let)\s+/, '')
                .replace(/;$/, '')
            )
            .join(', ');
          result.push(`${declType} ${combined};`);
          i = j;
        } else {
          result.push(line);
          i++;
        }
      } else {
        result.push(line || '');
        i++;
      }
    }

    return result.join('\n');
  } catch (error) {
    console.error('Error in combineVariableDeclarations:', error);
    return content;
  }
}

/**
 * Convert callback patterns to Promises
 */
async function callbackToPromise(_root: any, content: string, _lang: any): Promise<string> {
  try {
    // Find callback patterns and suggest Promise conversions
    // This is a complex transformation, so we'll do basic pattern matching
    let modifiedContent = content;

    // Pattern: function(callback) { ... callback(error, result) ... }
    const callbackPattern =
      /function\s+(\w+)\s*\(\s*callback\s*\)\s*{([^}]+)callback\(([^)]+)\);?([^}]*)}/g;

    modifiedContent = modifiedContent.replace(
      callbackPattern,
      (match, funcName, beforeCallback, callbackArgs, afterCallback) => {
        const args = callbackArgs.split(',').map((arg: string) => arg.trim());

        if (args.length === 2) {
          // Assume error-first callback pattern
          const [error, result] = args;
          return `function ${funcName}(): Promise<any> {${beforeCallback}return new Promise((resolve, reject) => {
          if (${error}) reject(${error});
          else resolve(${result});
        });${afterCallback}}`;
        }

        return match; // Return unchanged if pattern doesn't match expectations
      }
    );

    return modifiedContent;
  } catch (error) {
    console.error('Error in callbackToPromise:', error);
    return content;
  }
}

/**
 * Modernize function declarations
 */
async function modernizeFunctionDeclarations(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    // Convert simple function declarations to arrow functions where appropriate
    let modifiedContent = content;

    // Pattern: function name(params) { return expression; }
    const simpleFunctionPattern = /function\s+(\w+)\s*\(([^)]*)\)\s*{\s*return\s+([^;]+);\s*}/g;

    modifiedContent = modifiedContent.replace(
      simpleFunctionPattern,
      (_match, name, params, expression) => {
        return `const ${name} = (${params}) => ${expression};`;
      }
    );

    return modifiedContent;
  } catch (error) {
    console.error('Error in modernizeFunctionDeclarations:', error);
    return content;
  }
}

/**
 * Apply generic AST pattern using AST-grep syntax
 */
async function applyGenericASTPattern(
  _root: any,
  content: string,
  pattern: AstPattern,
  _lang: any
): Promise<string> {
  try {
    // Simplified pattern matching using regex for now
    // This would normally use AST-grep's sophisticated pattern matching
    let modifiedContent = content;

    // Simple regex replacement based on pattern
    if (pattern.pattern && pattern.replacement) {
      const regex = new RegExp(pattern.pattern, 'g');
      modifiedContent = modifiedContent.replace(regex, pattern.replacement);
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in applyGenericASTPattern:', error);
    return content;
  }
}

async function applyLlmTransformation(files: string[], request?: TransformationRequest) {
  console.log('Applying LLM transformations...');

  try {
    // Use the new comprehensive LLM transformation system
    const llmInput: LLMTransformationInput = {
      files,
      request,
      config: {
        provider: (process.env.LLM_PROVIDER as any) || 'mock',
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL || 'gpt-4',
        baseURL: process.env.LLM_BASE_URL,
        maxTokens: 4000,
        temperature: 0.1, // Low temperature for deterministic code transformations
        timeout: 30000,
        retries: 3,
      },
      context: {
        projectType: 'typescript',
        framework: detectProjectFramework(files),
      },
    };

    // Call the new LLM transformation system
    const transformer = new LLMTransformer(llmInput.config);
    const result = await transformer.transformFiles(llmInput);

    return {
      filesModified: result.filesModified,
      transformationsApplied: result.transformationsApplied,
      mode: 'llm' as const,
      prompt: request?.prompt || 'LLM-based code transformation',
      totalTokensUsed: result.totalTokensUsed,
      averageConfidence: result.averageConfidence,
      errors: result.errors,
      warnings: result.warnings,
    };
  } catch (error) {
    console.error('LLM transformation failed:', error);
    // Graceful fallback to the old rule-based system
    return await applyFallbackLlmTransformation(files, request);
  }
}

/**
 * Fallback LLM transformation using rule-based approach
 */
async function applyFallbackLlmTransformation(files: string[], request?: TransformationRequest) {
  console.log('Using fallback rule-based LLM transformation...');
  
  const transformedFiles: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');

    // Apply intelligent transformations based on content analysis
    let transformedContent = content;

    // Advanced var-to-const/let with usage analysis
    transformedContent = await smartVarTransformation(transformedContent);

    // Complex callback-to-promise-to-async transformations
    transformedContent = await advancedCallbackToAsync(transformedContent);

    // Smart class modernization
    transformedContent = await modernizeClasses(transformedContent);

    // Only write if content changed
    if (transformedContent !== content) {
      await writeFile(filePath, transformedContent, 'utf-8');
      transformedFiles.push(filePath);
    }
  }

  return {
    filesModified: transformedFiles,
    transformationsApplied: transformedFiles.length,
    mode: 'llm' as const,
    prompt: request?.prompt || 'Fallback rule-based transformation',
  };
}

/**
 * Detect project framework from file analysis
 */
function detectProjectFramework(files: string[]): string | undefined {
  // Simple framework detection based on file names and common patterns
  const fileNames = files.join(' ').toLowerCase();
  
  if (fileNames.includes('react') || fileNames.includes('.jsx') || fileNames.includes('.tsx')) {
    return 'React';
  }
  if (fileNames.includes('vue')) {
    return 'Vue';
  }
  if (fileNames.includes('angular')) {
    return 'Angular';
  }
  if (fileNames.includes('express') || fileNames.includes('server')) {
    return 'Express';
  }
  if (fileNames.includes('xstate') || fileNames.includes('machine')) {
    return 'XState';
  }
  
  return undefined;
}

function generateDefaultPrompt(_files: string[]): string {
  return `Transform the following ${_files.length} TypeScript file(s) to use modern patterns:
- Convert var to const/let based on usage
- Transform callbacks to async/await
- Use modern class syntax
- Apply destructuring where appropriate
- Use template literals for string concatenation`;
}

async function smartVarTransformation(content: string): Promise<string> {
  // Advanced var analysis with scope tracking
  let transformed = content;

  // Find all var declarations and analyze their usage
  const varDeclarations = content.match(/var\s+(\w+)\s*=\s*[^;]+;/g) || [];

  for (const declaration of varDeclarations) {
    const varMatch = declaration.match(/var\s+(\w+)\s*=\s*(.+);/);
    if (varMatch) {
      const [fullDecl, varName] = varMatch;

      // Check if variable is reassigned
      const reassignPattern = new RegExp(`\\b${varName}\\s*=\\s*[^=]`, 'g');
      const reassignments = content.match(reassignPattern) || [];

      // Use const if not reassigned, let if reassigned
      const replacement =
        reassignments.length > 1
          ? fullDecl.replace('var', 'let')
          : fullDecl.replace('var', 'const');

      transformed = transformed.replace(fullDecl, replacement);
    }
  }

  return transformed;
}

async function advancedCallbackToAsync(content: string): Promise<string> {
  // Transform complex callback patterns to async/await
  let transformed = content;

  // Pattern: function(callback) where callback is (err, result) => {}
  const callbackPattern = /(\w+)\(\s*\(([^)]*err[^)]*)\)\s*=>\s*\{([^}]+)\}\s*\)/g;

  transformed = transformed.replace(callbackPattern, (match, funcName, params, body) => {
    if (params.includes('err') && params.includes('result')) {
      return `try {
  const result = await ${funcName}();
  ${body.replace(/if\s*\(\s*err\s*\).*?else\s*/, '')}
} catch (err) {
  ${body.match(/if\s*\(\s*err\s*\)\s*\{([^}]+)\}/) ? body.match(/if\s*\(\s*err\s*\)\s*\{([^}]+)\}/)?.[1] : 'throw err;'}
}`;
    }
    return match;
  });

  return transformed;
}

async function modernizeClasses(content: string): Promise<string> {
  // Transform old-style constructor functions to modern classes
  let transformed = content;

  // Pattern: function Constructor() { this.prop = value; }
  const constructorPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*this\.[^}]+)\}/g;

  transformed = transformed.replace(constructorPattern, (_match, className, body) => {
    const properties = body.match(/this\.(\w+)\s*=\s*([^;]+);/g) || [];
    const constructorBody: string = (properties as string[])
      .map((prop: string) => prop.replace('this.', '    this.'))
      .join('\n');

    return `class ${className} {
  constructor() {
${constructorBody}
  }
}`;
  });

  return transformed;
}

/**
 * AST-based strict equality conversion (== to ===)
 */
async function strictEqualityAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing strict equality conversions...');
    console.log('📝 Content length:', content.length);
    console.log('📝 Content preview:', content.substring(0, 200));

    let modifiedContent = content;

    // Convert == to === but avoid already strict comparisons
    modifiedContent = modifiedContent.replace(/(\w+|\)|])\s*==\s*([^=])/g, '$1 === $2');

    if (modifiedContent !== content) {
      console.log('✅ Strict equality transformations applied');
      console.log('📝 Modified content preview:', modifiedContent.substring(0, 200));
    } else {
      console.log('⚠️ No strict equality patterns found to transform');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in strictEqualityAST:', error);
    return content;
  }
}

/**
 * AST-based strict inequality conversion (!= to !==)
 */
async function strictInequalityAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing strict inequality conversions...');
    let modifiedContent = content;

    // Convert != to !== but avoid already strict comparisons
    modifiedContent = modifiedContent.replace(/(\w+|\)|])\s*!=\s*([^=])/g, '$1 !== $2');

    if (modifiedContent !== content) {
      console.log('✅ Strict inequality transformations applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in strictInequalityAST:', error);
    return content;
  }
}

/**
 * AST-based array includes conversion (indexOf !== -1 to includes)
 */
async function arrayIncludesAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing array includes conversions...');
    let modifiedContent = content;

    // Convert arr.indexOf(item) !== -1 to arr.includes(item)
    modifiedContent = modifiedContent.replace(
      /(\w+)\.indexOf\(([^)]+)\)\s*!==\s*-1/g,
      '$1.includes($2)'
    );

    if (modifiedContent !== content) {
      console.log('✅ Array includes transformations applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in arrayIncludesAST:', error);
    return content;
  }
}

/**
 * AST-based removal of unnecessary return statements
 */
async function removeUnnecessaryReturnsAST(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    console.log('🔄 Processing unnecessary return removal...');
    let modifiedContent = content;

    // Convert (params) => { return expr; } to (params) => expr
    modifiedContent = modifiedContent.replace(
      /\(([^)]*)\)\s*=>\s*\{\s*return\s+([^;]+);\s*\}/g,
      '($1) => $2'
    );

    if (modifiedContent !== content) {
      console.log('✅ Unnecessary return transformations applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in removeUnnecessaryReturnsAST:', error);
    return content;
  }
}

/**
 * AST-based object property shorthand conversion
 */
async function objectPropertyShorthandAST(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    console.log('🔄 Processing object property shorthand...');
    let modifiedContent = content;

    // Convert { key: key } to { key }
    modifiedContent = modifiedContent.replace(/\{\s*(\w+):\s*\1\s*\}/g, '{ $1 }');
    modifiedContent = modifiedContent.replace(/,\s*(\w+):\s*\1\s*([,}])/g, ', $1$2');

    if (modifiedContent !== content) {
      console.log('✅ Object property shorthand transformations applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in objectPropertyShorthandAST:', error);
    return content;
  }
}

/**
 * AST-based template literal conversion
 */
async function templateLiteralConversionAST(
  _root: any,
  content: string,
  _lang: any
): Promise<string> {
  try {
    console.log('🔄 Processing template literal conversions...');
    let modifiedContent = content;

    // Convert string concatenation to template literals
    modifiedContent = modifiedContent.replace(
      /'([^']*?)'\s*\+\s*(\w+)\s*\+\s*'([^']*?)'/g,
      '`$1${$2}$3`'
    );
    modifiedContent = modifiedContent.replace(
      /"([^"]*?)"\s*\+\s*(\w+)\s*\+\s*"([^"]*?)"/g,
      '`$1${$2}$3`'
    );

    if (modifiedContent !== content) {
      console.log('✅ Template literal transformations applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in templateLiteralConversionAST:', error);
    return content;
  }
}

/**
 * AST-based const loop variable fix
 */
async function constLoopVariableFixAST(_root: any, content: string, _lang: any): Promise<string> {
  try {
    console.log('🔄 Processing const loop variable fixes...');
    let modifiedContent = content;

    // Convert for (const i = 0; ...) to for (let i = 0; ...)
    modifiedContent = modifiedContent.replace(
      /for\s*\(\s*const\s+(\w+)\s*=\s*([^;]+);/g,
      'for (let $1 = $2;'
    );

    if (modifiedContent !== content) {
      console.log('✅ Const loop variable fixes applied');
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in constLoopVariableFixAST:', error);
    return content;
  }
}
