import { task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { runCommitProcessingJob } from './commit-processing-job';
import { runEmbeddingGenerationJob } from './embedding-generation-job';
import { runPRExtractionJob } from './pr-extraction-job';
import { runRepositoryCloneJob } from './repository-clone-job';

export const IngestionOrchestratorJobInputSchema = z.object({
  repositoryUrl: z.string().url(),
  branch: z.string().default('main'),
});
export type IngestionOrchestratorJobInput = z.infer<typeof IngestionOrchestratorJobInputSchema>;

export const IngestionOrchestratorJobResultSchema = z.object({
  success: z.boolean(),
  repositoryUrl: z.string().url(),
  branch: z.string(),
  steps: z.array(z.string()).optional(),
  error: z.string().optional(),
});
export type IngestionOrchestratorJobResult = z.infer<typeof IngestionOrchestratorJobResultSchema>;

export const ingestionOrchestratorJob = task({
  id: 'ingestion-orchestrator',
  run: async (payload: unknown) => {
    const input = IngestionOrchestratorJobInputSchema.parse(payload);
    const steps: string[] = [];
    try {
      // 1. Clone repository
      steps.push('clone-repository');

      const cloneResult = await runRepositoryCloneJob({
        repositoryUrl: input.repositoryUrl,
        localPath: `/tmp/ingest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        branch: input.branch,
        forceClone: true,
        includeSubmodules: false,
      });
      if (!cloneResult.success) throw new Error(`Clone failed: ${cloneResult.error || 'unknown'}`);

      // 2. Process latest commit (stub: use lastCommit from clone)
      steps.push('analyze-commits');
      const commitHash = cloneResult.lastCommit || 'HEAD';
      const commitResult = await runCommitProcessingJob({
        repositoryUrl: input.repositoryUrl,
        commitHash,
      });
      if (!commitResult.success)
        throw new Error(`Commit processing failed: ${commitResult.error || 'unknown'}`);

      // 3. Extract PRs (stub: use PR #1)
      steps.push('extract-prs');
      const prResult = await runPRExtractionJob({
        repositoryUrl: input.repositoryUrl,
        prNumber: 1,
      });
      if (!prResult.success)
        throw new Error(`PR extraction failed: ${prResult.error || 'unknown'}`);

      // 4. Generate embedding (stub: use first file if available)
      steps.push('generate-embeddings');
      const filePath = `${cloneResult.repositoryPath}/README.md`;
      const embeddingResult = await runEmbeddingGenerationJob({
        repositoryUrl: input.repositoryUrl,
        filePath,
      });
      if (!embeddingResult.success)
        throw new Error(`Embedding generation failed: ${embeddingResult.error || 'unknown'}`);

      const result: IngestionOrchestratorJobResult = {
        success: true,
        repositoryUrl: input.repositoryUrl,
        branch: input.branch,
        steps,
      };
      return IngestionOrchestratorJobResultSchema.parse(result);
    } catch (error) {
      return IngestionOrchestratorJobResultSchema.parse({
        success: false,
        repositoryUrl: input.repositoryUrl,
        branch: input.branch,
        steps,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
