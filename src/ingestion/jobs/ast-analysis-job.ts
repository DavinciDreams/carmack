import { z } from 'zod';
import { task } from '@trigger.dev/sdk/v3';

// Zod schema for AST analysis job input
export const ASTAnalysisJobInputSchema = z.object({
  repositoryUrl: z.string().url(),
  filePath: z.string(),
});
export type ASTAnalysisJobInput = z.infer<typeof ASTAnalysisJobInputSchema>;

// Trigger.dev v3 task definition
export const astAnalysisTask = task({
  id: 'ast-analysis',
  run: async (payload: unknown) => {
    const input = ASTAnalysisJobInputSchema.parse(payload);
  // Real AST analysis logic
  // Dynamically import ASTAnalyzer to avoid circular deps
  const { ASTAnalyzer } = await import('../../docs-generator/ast-analyzer');
  const analyzer = new ASTAnalyzer();
  const moduleDoc = await analyzer.analyzeFile(input.filePath);
  return { status: 'success', input, moduleDoc };
  },
});
