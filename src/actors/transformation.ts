import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { AstPattern, TransformationRequest } from '../types.js';

// Import AST-grep for syntax tree parsing
import { js, ts } from '@ast-grep/napi';

// Transformation input schema
const TransformationInputSchema = z.object({
  mode: z.enum(['template', 'ast', 'llm']),
  files: z.array(z.string()),
  patterns: z.array(z.any()), // AstPattern schema
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

  // Get only template-mode patterns (low complexity, safe transformations)
  const templatePatterns = patterns.filter(p => p.complexity <= 2 && p.riskLevel === 'low');

  for (const filePath of files) {
    try {
      // Read the file content
      const content = await readFile(filePath, 'utf-8');
      let modifiedContent = content;
      let fileModified = false;

      // Apply enhanced template patterns
      for (const pattern of templatePatterns) {
        const beforeContent = modifiedContent;

        switch (pattern.id) {
          case 'smart-var-to-const-let':
            // Improved var conversion with context awareness
            modifiedContent = smartVarTransformation(modifiedContent);
            break;

          case 'strict-equality':
            // Enhanced == to === with better regex
            modifiedContent = modifiedContent.replace(/([^!=])\s*==\s*([^=])/g, '$1 === $2');
            break;

          case 'console-log-to-console-error':
            // Convert console.log('Error:') to console.error()
            modifiedContent = modifiedContent.replace(
              /console\.log\(\s*['"`]Error:['"`]/g,
              "console.error('Error:'"
            );
            break;

          case 'object-shorthand-properties':
            // Convert { id: id, name: name } to { id, name }
            modifiedContent = modifiedContent.replace(
              /{\s*(\w+):\s*\1\s*,\s*(\w+):\s*\2\s*}/g,
              '{ $1, $2 }'
            );
            break;

          case 'template-literals-simple':
            // Convert 'str' + var + 'str' to `str${var}str`
            modifiedContent = modifiedContent.replace(
              /'([^']*?)'\s*\+\s*(\w+)\s*\+\s*'([^']*?)'/g,
              '`$1${$2}$3`'
            );
            break;

          case 'array-includes-over-indexof':
            // Convert array.indexOf(item) !== -1 to array.includes(item)
            modifiedContent = modifiedContent.replace(
              /(\w+)\.indexOf\(([^)]+)\)\s*!==\s*-1/g,
              '$1.includes($2)'
            );
            break;

          case 'for-loop-to-foreach':
            // Convert simple for loops that just call a function
            modifiedContent = modifiedContent.replace(
              /for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\s*<\s*(\w+)\.length;\s*\w+\+\+\s*\)\s*{\s*(\w+)\((\w+)\[\w+\]\);\s*}/g,
              '$1.forEach($2);'
            );
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
 * Smart var to const/let transformation with context awareness
 */
function smartVarTransformation(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
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
      const isReassigned = lines.slice(i + 1).some(laterLine => 
        laterLine && new RegExp(`\\b${varName}\\s*=\\s*[^=]`).test(laterLine)
      );
      
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
  const astPatterns = patterns.filter(p => p.complexity >= 2 && p.complexity <= 4);

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
            modifiedContent = await smartVarToConstLetAST(root, content, lang);
            break;

          case 'promise-to-async-await':
            modifiedContent = await promiseToAsyncAwaitAST(root, content, lang);
            break;

          case 'enhanced-object-destructuring':
            modifiedContent = await enhanceObjectDestructuring(root, content, lang);
            break;

          case 'remove-unnecessary-returns':
            modifiedContent = await removeUnnecessaryReturns(root, content, lang);
            break;

          case 'combine-variable-declarations':
            modifiedContent = await combineVariableDeclarations(root, content, lang);
            break;

          case 'callback-to-promise':
            modifiedContent = await callbackToPromise(root, content, lang);
            break;

          case 'modernize-function-declarations':
            modifiedContent = await modernizeFunctionDeclarations(root, content, lang);
            break;

          default:
            // Apply generic AST pattern if it has AST-grep syntax
            if (pattern.pattern && pattern.replacement) {
              modifiedContent = await applyGenericASTPattern(root, content, pattern, lang);
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
async function smartVarToConstLetAST(root: any, content: string, _lang: any): Promise<string> {
  try {
    // Find all var declarations
    const varDeclarations = root.findAll('var_declaration');
    let modifiedContent = content;

    for (const varDecl of varDeclarations) {
      const declText = varDecl.text();
      const varMatch = declText.match(/var\s+(\w+)\s*=\s*(.+)/);
      
      if (varMatch) {
        const [, varName] = varMatch;
        
        // Check if variable is reassigned in the scope
        const assignments = root.findAll(`assignment_expression[left="${varName}"]`);
        const isReassigned = assignments.length > 0;
        
        // Check if it's in a for loop
        const forLoops = root.findAll('for_statement');
        const isInForLoop = forLoops.some((loop: any) => loop.text().includes(varName));
        
        // Replace with appropriate declaration
        const replacement = isReassigned || isInForLoop ? 
          declText.replace(/var\s+/, 'let ') : 
          declText.replace(/var\s+/, 'const ');
        
        modifiedContent = modifiedContent.replace(declText, replacement);
      }
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in smartVarToConstLetAST:', error);
    return content;
  }
}

/**
 * Convert Promise chains to async/await
 */
async function promiseToAsyncAwaitAST(root: any, content: string, _lang: any): Promise<string> {
  try {
    // Find .then() patterns that can be converted to async/await
    const thenCalls = root.findAll('call_expression[callee.property.name="then"]');
    let modifiedContent = content;

    for (const thenCall of thenCalls) {
      const thenText = thenCall.text();
      
      // Simple pattern: somePromise.then((result) => { ... })
      const pattern = /(\w+)\.then\(\s*\((\w+)\)\s*=>\s*{\s*([^}]+)\s*}\s*\)/;
      const match = thenText.match(pattern);
      
      if (match) {
        const [fullMatch, promiseVar, resultVar, body] = match;
        const replacement = `const ${resultVar} = await ${promiseVar};\n${body}`;
        modifiedContent = modifiedContent.replace(fullMatch, replacement);
      }
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
async function enhanceObjectDestructuring(root: any, content: string, _lang: any): Promise<string> {
  try {
    // Find patterns like const name = user.name; const age = user.age;
    const assignments = root.findAll('variable_declaration');
    let modifiedContent = content;

    // Group consecutive property accesses from same object
    const propertyAccesses: { [key: string]: string[] } = {};
    
    for (const assignment of assignments) {
      const text = assignment.text();
      const match = text.match(/const\s+(\w+)\s*=\s*(\w+)\.(\w+)/);
      
      if (match) {
        const [, , objName, propName] = match;
        if (!propertyAccesses[objName]) {
          propertyAccesses[objName] = [];
        }
        propertyAccesses[objName].push(propName);
      }
    }

    // Replace with destructuring if multiple properties
    for (const [objName, props] of Object.entries(propertyAccesses)) {
      if (props.length > 1) {
        const destructuring = `const { ${props.join(', ')} } = ${objName};`;
        
        // Remove individual assignments and replace with destructuring
        for (const prop of props) {
          const pattern = new RegExp(`const\\s+${prop}\\s*=\\s*${objName}\\.${prop};?`, 'g');
          modifiedContent = modifiedContent.replace(pattern, '');
        }
        
        // Add destructuring at the first occurrence
        const firstPropPattern = new RegExp(`const\\s+${props[0]}\\s*=\\s*${objName}\\.${props[0]};?`);
        modifiedContent = modifiedContent.replace(firstPropPattern, destructuring);
      }
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in enhanceObjectDestructuring:', error);
    return content;
  }
}

/**
 * Remove unnecessary return statements
 */
async function removeUnnecessaryReturns(root: any, content: string, _lang: any): Promise<string> {
  try {
    // Find arrow functions with unnecessary return statements
    const arrowFunctions = root.findAll('arrow_function');
    let modifiedContent = content;

    for (const func of arrowFunctions) {
      const funcText = func.text();
      
      // Pattern: (params) => { return expression; }
      const pattern = /\(([^)]*)\)\s*=>\s*{\s*return\s+([^;]+);\s*}/;
      const match = funcText.match(pattern);
      
      if (match) {
        const [fullMatch, params, expression] = match;
        const replacement = `(${params}) => ${expression}`;
        modifiedContent = modifiedContent.replace(fullMatch, replacement);
      }
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in removeUnnecessaryReturns:', error);
    return content;
  }
}

/**
 * Combine variable declarations
 */
async function combineVariableDeclarations(_root: any, content: string, _lang: any): Promise<string> {
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
            .map(decl => decl.trim().replace(/^(const|let)\s+/, '').replace(/;$/, ''))
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
    const callbackPattern = /function\s+(\w+)\s*\(\s*callback\s*\)\s*{([^}]+)callback\(([^)]+)\);?([^}]*)}/g;
    
    modifiedContent = modifiedContent.replace(callbackPattern, (match, funcName, beforeCallback, callbackArgs, afterCallback) => {
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
    });

    return modifiedContent;
  } catch (error) {
    console.error('Error in callbackToPromise:', error);
    return content;
  }
}

/**
 * Modernize function declarations
 */
async function modernizeFunctionDeclarations(_root: any, content: string, _lang: any): Promise<string> {
  try {
    // Convert simple function declarations to arrow functions where appropriate
    let modifiedContent = content;
    
    // Pattern: function name(params) { return expression; }
    const simpleFunctionPattern = /function\s+(\w+)\s*\(([^)]*)\)\s*{\s*return\s+([^;]+);\s*}/g;
    
    modifiedContent = modifiedContent.replace(simpleFunctionPattern, (_match, name, params, expression) => {
      return `const ${name} = (${params}) => ${expression};`;
    });

    return modifiedContent;
  } catch (error) {
    console.error('Error in modernizeFunctionDeclarations:', error);
    return content;
  }
}

/**
 * Apply generic AST pattern using AST-grep syntax
 */
async function applyGenericASTPattern(root: any, content: string, pattern: AstPattern, _lang: any): Promise<string> {
  try {
    // Use AST-grep pattern matching
    const matches = root.findAll(pattern.pattern);
    let modifiedContent = content;

    for (const match of matches) {
      const matchText = match.text();
      // Apply the replacement (this is simplified - real AST-grep has more sophisticated replacement)
      modifiedContent = modifiedContent.replace(matchText, pattern.replacement);
    }

    return modifiedContent;
  } catch (error) {
    console.error('Error in applyGenericASTPattern:', error);
    return content;
  }
}

async function applyLlmTransformation(files: string[], request?: TransformationRequest) {
  // TODO: Implement LLM-based transformations
  // Use external LLM API for complex code generation
  console.log('Applying LLM transformations...');

  // Mock implementation
  return {
    filesModified: files,
    transformationsApplied: 1,
    mode: 'llm' as const,
    prompt: request?.prompt || 'Default transformation prompt',
  };
}
