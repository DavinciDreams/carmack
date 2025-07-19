import { readFile, writeFile } from 'node:fs/promises';
// Import AST-grep for syntax tree parsing
import { js, ts } from '@ast-grep/napi';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { AstPattern, TransformationRequest } from '../types.js';
import { type LLMTransformationInput, LLMTransformer } from './llm-transformation.js';

// AST-grep language interface
// (Removed unused AstGrepLanguage interface)

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
  request: z
    .object({
      targetFiles: z.array(z.string()),
      transformationType: z.enum(['template', 'ast', 'llm']),
      patterns: z
        .array(
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
        )
        .optional(),
      prompt: z.string().optional(),
      maxComplexity: z.number().int().min(1).default(10),
      dryRun: z.boolean().default(false),
    })
    .optional(),
  dryRun: z.boolean().optional().default(false), // Add dry-run support
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
    const { mode, files, patterns, request, dryRun } = validatedInput;

    console.log(
      `Applying ${mode} transformation to ${files.length} files${dryRun ? ' (DRY RUN)' : ''}`
    );

    switch (mode) {
      case 'template':
        return await applyTemplateTransformation(files, patterns, dryRun);
      case 'ast':
        return await applyAstTransformation(files, patterns);
      case 'llm':
        return await applyLlmTransformation(files, request);
      default:
        throw new Error(`Unknown transformation mode: ${mode}`);
    }
  }
);

async function applyTemplateTransformation(
  files: string[],
  patterns: AstPattern[],
  dryRun = false
) {
  console.log(`Applying template transformations...${dryRun ? ' (DRY RUN)' : ''}`);

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
