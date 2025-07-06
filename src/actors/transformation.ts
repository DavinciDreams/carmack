import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { AstPattern, TransformationRequest } from '../types.js';

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

  for (const filePath of files) {
    try {
      // Read the file content
      const content = await readFile(filePath, 'utf-8');
      let modifiedContent = content;
      let fileModified = false;

      // Apply simple template patterns
      for (const pattern of patterns) {
        if (pattern.id === 'var-to-const' && pattern.complexity <= 2) {
          // Simple regex replacement for var -> const
          const varPattern = /\bvar\s+(\w+)\s*=\s*([^;]+);/g;
          const newContent = modifiedContent.replace(varPattern, 'const $1 = $2;');

          if (newContent !== modifiedContent) {
            modifiedContent = newContent;
            fileModified = true;
            totalTransformations++;
            console.log(`Applied ${pattern.id} to ${filePath}`);
          }
        }

        if (pattern.id === 'strict-equality' && pattern.complexity <= 2) {
          // Simple regex replacement for == -> ===
          const eqPattern = /([^!=])(\s*==\s*)([^=])/g;
          const newContent = modifiedContent.replace(eqPattern, '$1 === $3');

          if (newContent !== modifiedContent) {
            modifiedContent = newContent;
            fileModified = true;
            totalTransformations++;
            console.log(`Applied ${pattern.id} to ${filePath}`);
          }
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

async function applyAstTransformation(files: string[], patterns: AstPattern[]) {
  // TODO: Implement AST-grep transformations
  // Use @ast-grep/napi for syntax tree transformations
  console.log('Applying AST transformations...');

  // Mock implementation
  return {
    filesModified: files,
    transformationsApplied: patterns.length,
    mode: 'ast' as const,
  };
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
