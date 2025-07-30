// UnifiedAnalyzer Actor Integration
import { fromPromise } from 'xstate';
import { z } from 'zod';

// Import UnifiedAnalyzer (assume in project or as dependency)
import { UnifiedAnalyzer } from '../analysis/unified-analyzer';

// Zod schema for actor input
export const UnifiedAnalyzerInputSchema = z.object({
  projectPath: z.string().default(process.cwd()),
  includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.tsx']),
  excludePatterns: z.array(z.string()).default(['node_modules', '.next', 'dist', '.test.', '.spec.']),
  enableFixes: z.boolean().default(true),
  checkNullability: z.boolean().default(true),
  checkComponents: z.boolean().default(true),
  reportFormat: z.enum(['md', 'json', 'both']).default('both'),
  maxIssues: z.number().default(1000),
});

export type UnifiedAnalyzerInput = z.infer<typeof UnifiedAnalyzerInputSchema>;

// Zod schema for actor output (issues + stats)
export const UnifiedAnalyzerResultSchema = z.object({
  issues: z.array(z.object({
    type: z.enum(['null-access', 'type-error', 'missing-import', 'unused-code', 'performance']),
    severity: z.enum(['error', 'warning', 'info']),
    file: z.string(),
    line: z.number(),
    column: z.number(),
    message: z.string(),
    fix: z.object({
      description: z.string(),
      code: z.string()
    }).optional()
  })),
  stats: z.object({
    filesAnalyzed: z.number(),
    totalLines: z.number(),
    issuesFound: z.number(),
    startTime: z.number(),
    endTime: z.number()
  }),
  filesModified: z.array(z.string())
});

export type UnifiedAnalyzerResult = z.infer<typeof UnifiedAnalyzerResultSchema>;

// XState actor for UnifiedAnalyzer
export const unifiedAnalyzerActor = fromPromise(
  async ({ input }: { input: UnifiedAnalyzerInput }): Promise<UnifiedAnalyzerResult> => {
    const validated = UnifiedAnalyzerInputSchema.parse(input);
    const analyzer = new UnifiedAnalyzer(validated);
    const { issues, stats, filesModified } = analyzer.analyze();
    return UnifiedAnalyzerResultSchema.parse({ issues, stats, filesModified });
  }
);