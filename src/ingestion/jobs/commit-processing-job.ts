import { z } from 'zod';
import { task } from '@trigger.dev/sdk/v3';
import simpleGit from 'simple-git';

export const CommitProcessingJobInputSchema = z.object({
  repositoryUrl: z.string().url(),
  commitHash: z.string(),
});
export type CommitProcessingJobInput = z.infer<typeof CommitProcessingJobInputSchema>;

export const CommitProcessingJobResultSchema = z.object({
  success: z.boolean(),
  commitHash: z.string(),
  author: z.string().optional(),
  message: z.string().optional(),
  date: z.string().optional(),
  error: z.string().optional(),
});
export type CommitProcessingJobResult = z.infer<typeof CommitProcessingJobResultSchema>;

export async function runCommitProcessingJob(payload: CommitProcessingJobInput): Promise<CommitProcessingJobResult> {
  const input = CommitProcessingJobInputSchema.parse(payload);
  try {
    const tmp = require('os').tmpdir();
    const path = require('path');
    const repoDir = path.join(tmp, `commit-process-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const git = simpleGit();
    await git.clone(input.repositoryUrl, repoDir, ['--depth=1']);
    await git.cwd(repoDir);
    const log = await git.show([input.commitHash]);
    const result: CommitProcessingJobResult = {
      success: true,
      commitHash: input.commitHash,
      author: 'unknown',
      message: log.split('\n')[0],
      date: new Date().toISOString(),
    };
    return CommitProcessingJobResultSchema.parse(result);
  } catch (error) {
    return CommitProcessingJobResultSchema.parse({
      success: false,
      commitHash: input.commitHash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const commitProcessingTask = task({
  id: 'commit-processing',
  run: runCommitProcessingJob,
});
