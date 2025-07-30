import { z } from 'zod';
import { task } from '@trigger.dev/sdk/v3';

export const EmbeddingGenerationJobInputSchema = z.object({
  repositoryUrl: z.string().url(),
  filePath: z.string(),
});
export type EmbeddingGenerationJobInput = z.infer<typeof EmbeddingGenerationJobInputSchema>;

export const EmbeddingGenerationJobResultSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
  embedding: z.array(z.number()).optional(),
  error: z.string().optional(),
});
export type EmbeddingGenerationJobResult = z.infer<typeof EmbeddingGenerationJobResultSchema>;

export async function runEmbeddingGenerationJob(payload: EmbeddingGenerationJobInput): Promise<EmbeddingGenerationJobResult> {
  const input = EmbeddingGenerationJobInputSchema.parse(payload);
  try {
    const embedding = Array.from({ length: 128 }, () => Math.random());
    const result: EmbeddingGenerationJobResult = {
      success: true,
      filePath: input.filePath,
      embedding,
    };
    return EmbeddingGenerationJobResultSchema.parse(result);
  } catch (error) {
    return EmbeddingGenerationJobResultSchema.parse({
      success: false,
      filePath: input.filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const embeddingGenerationTask = task({
  id: 'embedding-generation',
  run: runEmbeddingGenerationJob,
});
