import { task } from '@trigger.dev/sdk/v3';
import simpleGit from 'simple-git';
import { z } from 'zod';

export const PRExtractionJobInputSchema = z.object({
  repositoryUrl: z.string().url(),
  prNumber: z.number().int().positive(),
});
export type PRExtractionJobInput = z.infer<typeof PRExtractionJobInputSchema>;

export const PRExtractionJobResultSchema = z.object({
  success: z.boolean(),
  prNumber: z.number().int().positive(),
  title: z.string().optional(),
  author: z.string().optional(),
  merged: z.boolean().optional(),
  baseBranch: z.string().optional(),
  headBranch: z.string().optional(),
  error: z.string().optional(),
});
export type PRExtractionJobResult = z.infer<typeof PRExtractionJobResultSchema>;

export async function runPRExtractionJob(
  payload: PRExtractionJobInput
): Promise<PRExtractionJobResult> {
  const input = PRExtractionJobInputSchema.parse(payload);
  try {
    const tmp = require('node:os').tmpdir();
    const path = require('node:path');
    const repoDir = path.join(
      tmp,
      `pr-extract-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    const git = simpleGit();
    await git.clone(input.repositoryUrl, repoDir, ['--depth=1']);
    // Here, we return a stub result
    const result: PRExtractionJobResult = {
      success: true,
      prNumber: input.prNumber,
      title: `PR #${input.prNumber}`,
      author: 'unknown',
      merged: false,
      baseBranch: 'main',
      headBranch: 'feature',
    };
    return PRExtractionJobResultSchema.parse(result);
  } catch (error) {
    return PRExtractionJobResultSchema.parse({
      success: false,
      prNumber: input.prNumber,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const prExtractionTask = task({
  id: 'pr-extraction',
  run: runPRExtractionJob,
});
