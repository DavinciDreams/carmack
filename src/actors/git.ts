import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { GitCheckpoint } from '../types.js';

// Git input schema
const GitInputSchema = z.union([
  z.object({
    operation: z.literal('createCheckpoint'),
    description: z.string(),
  }),
  z.object({
    operation: z.literal('commit'),
    message: z.string(),
    files: z.array(z.string()),
  }),
  z.object({
    operation: z.literal('rollback'),
    checkpoint: z.any(), // GitCheckpoint schema
  }),
]);

type GitInput = z.infer<typeof GitInputSchema>;

/**
 * Git Actor
 *
 * Handles git operations for safe code transformation:
 * - createCheckpoint: Create a restore point before transformation
 * - commit: Commit successful transformations
 * - rollback: Restore to previous checkpoint on failure
 */
export const gitActor = fromPromise(async ({ input }: { input: GitInput }) => {
  const validatedInput = GitInputSchema.parse(input);

  console.log(`Executing git operation: ${validatedInput.operation}`);

  switch (validatedInput.operation) {
    case 'createCheckpoint':
      return await createCheckpoint(validatedInput.description);
    case 'commit':
      return await commitChanges(validatedInput.message, validatedInput.files);
    case 'rollback':
      return await rollbackToCheckpoint(validatedInput.checkpoint);
    default:
      throw new Error('Unknown git operation');
  }
});

async function createCheckpoint(description: string): Promise<GitCheckpoint> {
  // TODO: Implement actual git checkpoint creation using simple-git
  console.log(`Creating git checkpoint: ${description}`);

  // Mock implementation
  return {
    hash: 'a'.repeat(40), // Mock git hash
    branch: 'main',
    timestamp: Date.now(),
    description,
  };
}

async function commitChanges(message: string, files: string[]): Promise<GitCheckpoint> {
  // TODO: Implement actual git commit using simple-git
  console.log(`Committing changes: ${message} (${files.length} files)`);

  // Return GitCheckpoint format for consistency
  return {
    hash: 'b'.repeat(40), // Mock git hash
    branch: 'main',
    timestamp: Date.now(),
    description: message,
  };
}

async function rollbackToCheckpoint(checkpoint: GitCheckpoint): Promise<GitCheckpoint> {
  // TODO: Implement actual git rollback using simple-git
  console.log(`Rolling back to checkpoint: ${checkpoint.hash}`);

  // Return the checkpoint we rolled back to
  return checkpoint;
}
