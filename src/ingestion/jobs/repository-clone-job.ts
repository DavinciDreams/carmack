// Zod schema for validating a safe directory path (basic, can be extended)
const DirectoryPathSchema = z.string().min(1, 'Directory path must not be empty');
import { rm } from 'fs/promises';
import { task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { RepositoryManager } from '../repository-manager.ts';

/**
 * Repository Clone Job for Trigger.dev
 *
 * Handles cloning and updating any git repository in the background.
 * Includes progress tracking, error handling, and retry logic.
 */


// =============================================================================
// SCHEMAS
// =============================================================================

export const RepositoryClonePayloadSchema = z.object({
  repositoryUrl: z.string().url(),
  localPath: z.string(),
  branch: z.string().default('main'),
  forceClone: z.boolean().default(false),
  includeSubmodules: z.boolean().default(false),
  depth: z.number().int().positive().optional(),
});

export type RepositoryClonePayload = z.infer<typeof RepositoryClonePayloadSchema>;

export const RepositoryCloneResultSchema = z.object({
  success: z.boolean(),
  repositoryPath: z.string(),
  branch: z.string(),
  lastCommit: z.string().optional(),
  fileCount: z.number().int().min(0),
  processingTime: z.number().int().min(0),
  error: z.string().optional(),
});

export type RepositoryCloneResult = z.infer<typeof RepositoryCloneResultSchema>;

// =============================================================================
// REPOSITORY CLONE JOB
// =============================================================================

export const repositoryCloneJob = task({
  id: 'repository-clone',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  queue: {
    concurrencyLimit: 1, // Only one clone operation at a time
  },
  run: async (payload: RepositoryClonePayload) => {
    const startTime = Date.now();
    
    try {
      console.log('Starting repository clone job', { 
        repositoryUrl: payload.repositoryUrl,
        localPath: payload.localPath,
        branch: payload.branch,
      });

      // Validate payload
      const validatedPayload = RepositoryClonePayloadSchema.parse(payload);
      
      // Create repository manager
      const repoManager = new RepositoryManager({
        url: validatedPayload.repositoryUrl,
        localPath: validatedPayload.localPath,
        branch: validatedPayload.branch,
        includeSubmodules: validatedPayload.includeSubmodules,
        ...(validatedPayload.depth !== undefined ? { depth: validatedPayload.depth } : {}),
      });

      // Check if repository already exists
      const repoExists = await repoManager.repositoryExists();
      
      if (repoExists && !validatedPayload.forceClone) {
  console.log('Repository already exists, updating instead of cloning');
        await repoManager.updateRepository();
      } else {
        if (repoExists && validatedPayload.forceClone) {
          console.log('Force clone requested, removing existing repository');
          // Validate the directory path with Zod before removal
          let safePath: string;
          try {
            safePath = DirectoryPathSchema.parse(validatedPayload.localPath);
          } catch (validationErr) {
            console.error('Invalid directory path for removal', {
              path: validatedPayload.localPath,
              error: validationErr instanceof Error ? validationErr.message : String(validationErr),
            });
            throw new Error(`Invalid directory path for removal: ${validatedPayload.localPath}`);
          }
          try {
            await rm(safePath, { recursive: true, force: true });
            console.log('Existing repository directory removed:', safePath);
          } catch (removeErr) {
            console.error('Failed to remove existing repository directory', {
              path: safePath,
              error: removeErr instanceof Error ? removeErr.message : String(removeErr),
            });
            throw new Error(`Failed to remove existing repository directory: ${safePath}`);
          }
        }
        
  console.log('Cloning repository');
        await repoManager.cloneRepository();
      }

      // Get repository status
      const status = await repoManager.getRepositoryStatus();
      
      // Get filtered files count
      const filteredFiles = await repoManager.getFilteredFiles();
      
      const result: RepositoryCloneResult = {
        success: true,
        repositoryPath: validatedPayload.localPath,
        branch: status.branch || validatedPayload.branch,
        lastCommit: status.lastCommit?.hash,
        fileCount: filteredFiles.length,
        processingTime: Date.now() - startTime,
      };

  console.log('Repository clone job completed successfully', result);
      return RepositoryCloneResultSchema.parse(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('Repository clone job failed', {
        error: errorMessage,
        payload,
        processingTime: Date.now() - startTime,
      });

      const result: RepositoryCloneResult = {
        success: false,
        repositoryPath: payload.localPath,
        branch: payload.branch,
        fileCount: 0,
        processingTime: Date.now() - startTime,
        error: errorMessage,
      };

      return RepositoryCloneResultSchema.parse(result);
    }
  },
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Trigger repository clone job for any repository
 */
export async function triggerRepositoryClone(
  repositoryUrl: string,
  localPath: string,
  options?: {
    branch?: string;
    forceClone?: boolean;
    includeSubmodules?: boolean;
    depth?: number;
  }
) {
  const payload: RepositoryClonePayload = {
    repositoryUrl,
    localPath,
    branch: options?.branch || 'main',
    forceClone: options?.forceClone || false,
    includeSubmodules: options?.includeSubmodules || false,
    depth: options?.depth,
  };
  return repositoryCloneJob.trigger(payload);
}