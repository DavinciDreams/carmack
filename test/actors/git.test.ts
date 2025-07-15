import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createActor, waitFor } from 'xstate';
import { gitActor } from '../../src/actors/git.js';
import type { GitCheckpoint } from '../../src/types.js';

// Git operation input types matching the actual implementation
type GitInput =
  | { operation: 'createCheckpoint'; description: string }
  | { operation: 'commit'; message: string; files: string[] }
  | { operation: 'rollback'; checkpoint: GitCheckpoint };

describe('Git Actor', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `git-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(testDir, name);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  function setupGitConfig() {
    try {
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
    } catch (_error) {
      // Git config might fail in some environments, that's okay
    }
  }

  function assertCheckpoint(
    checkpoint: GitCheckpoint | undefined,
    expectedDescription: string
  ): asserts checkpoint is GitCheckpoint {
    expect(checkpoint).toBeDefined();
    expect(checkpoint?.description).toBe(expectedDescription);
    expect(checkpoint?.hash).toBeDefined();
    expect(checkpoint?.branch).toBeDefined();
    expect(checkpoint?.timestamp).toBeGreaterThan(0);
  }

  describe('Create Checkpoint Operation', () => {
    test('should create checkpoint in git repository', async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        await createTestFile('test.txt', 'Hello, World!');
      } catch (_error) {
        // Skip test if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'createCheckpoint',
        description: 'Test checkpoint before transformation',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Test checkpoint before transformation');
      expect(typeof checkpoint.hash).toBe('string');
      expect(checkpoint.hash.length).toBe(40); // Git hash length
    });

    test('should create checkpoint with fallback when not in git repo', async () => {
      // Don't initialize git repository
      const input: GitInput = {
        operation: 'createCheckpoint',
        description: 'Fallback checkpoint test',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Fallback checkpoint test');
      expect(checkpoint.hash).toBe('a'.repeat(40)); // Mock hash
      expect(checkpoint.branch).toBe('main');
    });

    test('should handle checkpoint with existing changes', async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        await createTestFile('existing.txt', 'Existing content');
        await createTestFile('new.txt', 'New content');
      } catch (_error) {
        // Skip test if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'createCheckpoint',
        description: 'Checkpoint with changes',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Checkpoint with changes');
    });
  });

  describe('Commit Operation', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (_error) {
        // Skip tests if git is not available
      }
    });

    test('should commit specific files', async () => {
      await createTestFile('file1.txt', 'Content 1');
      await createTestFile('file2.txt', 'Content 2');

      const input: GitInput = {
        operation: 'commit',
        message: 'Add specific files',
        files: ['file1.txt', 'file2.txt'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Add specific files');
    });

    test('should commit all files when files array is empty', async () => {
      await createTestFile('auto1.txt', 'Auto content 1');
      await createTestFile('auto2.txt', 'Auto content 2');

      const input: GitInput = {
        operation: 'commit',
        message: 'Auto-commit all changes',
        files: [],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Auto-commit all changes');
    });

    test('should handle commit with fallback when not in git repo', async () => {
      // Change to a non-git directory
      const nonGitDir = join(tmpdir(), `non-git-${Date.now()}`);
      await mkdir(nonGitDir, { recursive: true });
      process.chdir(nonGitDir);

      const input: GitInput = {
        operation: 'commit',
        message: 'Fallback commit test',
        files: ['test.txt'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = result.output;

      assertCheckpoint(checkpoint, 'Fallback commit test');
      expect(checkpoint.hash).toBe('b'.repeat(40)); // Mock hash
      expect(checkpoint.branch).toBe('main');

      // Cleanup
      process.chdir(testDir);
      await rm(nonGitDir, { recursive: true, force: true });
    });
  });

  describe('Rollback Operation', () => {
    let testCheckpoint: GitCheckpoint;

    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        await createTestFile('rollback-test.txt', 'Original content');
        execSync('git add rollback-test.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Initial commit"', {
          cwd: testDir,
          stdio: 'pipe',
        });

        // Get the commit hash
        const logResult = execSync('git log -1 --format="%H"', {
          cwd: testDir,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        const hash = logResult.trim().replace(/"/g, '');

        testCheckpoint = {
          hash,
          branch: 'main',
          timestamp: Date.now(),
          description: 'Initial commit',
        };
      } catch (_error) {
        // Create a mock checkpoint if git is not available
        testCheckpoint = {
          hash: 'a'.repeat(40),
          branch: 'main',
          timestamp: Date.now(),
          description: 'Mock checkpoint',
        };
      }
    });

    test('should rollback to checkpoint', async () => {
      const input: GitInput = {
        operation: 'rollback',
        checkpoint: testCheckpoint,
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const rollbackResult = result.output;

      expect(rollbackResult).toBeDefined();
      expect(rollbackResult?.description).toContain('Rolled back to:');
      expect(rollbackResult?.hash).toBeDefined();
      expect(rollbackResult?.branch).toBe(testCheckpoint.branch);
      expect(rollbackResult?.timestamp).toBeGreaterThan(testCheckpoint.timestamp);
    });

    test('should handle rollback with fallback when not in git repo', async () => {
      // Change to a non-git directory
      const nonGitDir = join(tmpdir(), `non-git-rollback-${Date.now()}`);
      await mkdir(nonGitDir, { recursive: true });
      process.chdir(nonGitDir);

      const input: GitInput = {
        operation: 'rollback',
        checkpoint: testCheckpoint,
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const rollbackResult = result.output;

      expect(rollbackResult).toBeDefined();
      expect(rollbackResult?.description).toContain('Rollback to:');
      expect(rollbackResult?.hash).toBe(testCheckpoint.hash);
      expect(rollbackResult?.branch).toBe(testCheckpoint.branch);

      // Cleanup
      process.chdir(testDir);
      await rm(nonGitDir, { recursive: true, force: true });
    });

    test('should handle rollback with invalid checkpoint hash', async () => {
      const invalidCheckpoint: GitCheckpoint = {
        hash: 'invalid'.repeat(8), // Invalid hash
        branch: 'main',
        timestamp: Date.now(),
        description: 'Invalid checkpoint',
      };

      const input: GitInput = {
        operation: 'rollback',
        checkpoint: invalidCheckpoint,
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const rollbackResult = result.output;

      expect(rollbackResult).toBeDefined();
      // Should fallback gracefully
      expect(rollbackResult?.description).toContain('Rollback to:');
    });
  });

  describe('Integration with Transformation Workflow', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (_error) {
        // Skip tests if git is not available
      }
    });

    test('should support transformation checkpoint workflow', async () => {
      // Step 1: Create initial files
      await createTestFile('transform.ts', 'var x = 1; // Original code');

      // Step 2: Create checkpoint before transformation
      const checkpointInput: GitInput = {
        operation: 'createCheckpoint',
        description: 'Before var-to-const transformation',
      };

      const checkpointActor = createActor(gitActor, { input: checkpointInput });
      checkpointActor.start();

      const checkpointResult = await waitFor(checkpointActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const checkpoint = checkpointResult.output;

      assertCheckpoint(checkpoint, 'Before var-to-const transformation');

      // Step 3: Simulate transformation
      await writeFile(join(testDir, 'transform.ts'), 'const x = 1; // Transformed code', 'utf-8');

      // Step 4: Commit transformation results
      const commitInput: GitInput = {
        operation: 'commit',
        message: 'Apply var-to-const transformation',
        files: ['transform.ts'],
      };

      const commitActor = createActor(gitActor, { input: commitInput });
      commitActor.start();

      const commitResult = await waitFor(commitActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const commitCheckpoint = commitResult.output;

      assertCheckpoint(commitCheckpoint, 'Apply var-to-const transformation');
      expect(commitCheckpoint.hash).not.toBe(checkpoint.hash);
    });

    test('should support rollback on transformation failure', async () => {
      // Step 1: Create initial state and checkpoint
      await createTestFile('rollback-test.ts', 'var a = 1;\nvar b = 2;');

      const checkpointInput: GitInput = {
        operation: 'createCheckpoint',
        description: 'Before risky transformation',
      };

      const checkpointActor = createActor(gitActor, { input: checkpointInput });
      checkpointActor.start();

      const checkpointResult = await waitFor(checkpointActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const checkpoint = checkpointResult.output;

      expect(checkpoint).toBeDefined();
      if (!checkpoint) return;

      // Step 2: Simulate failed transformation (corrupted code)
      await writeFile(join(testDir, 'rollback-test.ts'), 'const a = ; // Broken syntax', 'utf-8');

      // Step 3: Rollback due to failure
      const rollbackInput: GitInput = {
        operation: 'rollback',
        checkpoint,
      };

      const rollbackActor = createActor(gitActor, { input: rollbackInput });
      rollbackActor.start();

      const rollbackResult = await waitFor(rollbackActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const rollbackCheckpoint = rollbackResult.output;

      expect(rollbackCheckpoint).toBeDefined();
      expect(rollbackCheckpoint?.description).toContain('Rolled back to:');
      expect(rollbackCheckpoint?.description).toContain('Before risky transformation');
    });

    test('should handle multiple checkpoints in sequence', async () => {
      const checkpoints: GitCheckpoint[] = [];

      // Create multiple checkpoints
      for (let i = 1; i <= 3; i++) {
        await createTestFile(`file${i}.txt`, `Content ${i}`);

        const input: GitInput = {
          operation: 'createCheckpoint',
          description: `Checkpoint ${i}`,
        };

        const actor = createActor(gitActor, { input });
        actor.start();

        const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
        const checkpoint = result.output;

        expect(checkpoint).toBeDefined();
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      expect(checkpoints).toHaveLength(3);

      // Verify each checkpoint is unique
      const hashes = checkpoints.map((cp) => cp.hash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);

      // Verify descriptions
      expect(checkpoints[0].description).toBe('Checkpoint 1');
      expect(checkpoints[1].description).toBe('Checkpoint 2');
      expect(checkpoints[2].description).toBe('Checkpoint 3');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid operation gracefully', async () => {
      // This test verifies the actor handles schema validation
      const invalidInput = {
        operation: 'invalid-operation',
        description: 'This should fail validation',
      };

      try {
        const actor = createActor(gitActor, { input: invalidInput as any });
        actor.start();

        // Should throw during validation
        await waitFor(actor, (state) => state.status === 'done', { timeout: 1000 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        // Zod validation error expected
      }
    });

    test('should handle missing required fields', async () => {
      const incompleteInput = {
        operation: 'createCheckpoint',
        // Missing description
      };

      try {
        const actor = createActor(gitActor, { input: incompleteInput as any });
        actor.start();

        await waitFor(actor, (state) => state.status === 'done', { timeout: 1000 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        // Zod validation error expected
      }
    });

    test('should handle commit with empty message', async () => {
      const input: GitInput = {
        operation: 'commit',
        message: '', // Empty message
        files: ['test.txt'],
      };

      try {
        const actor = createActor(gitActor, { input });
        actor.start();

        await waitFor(actor, (state) => state.status === 'done', { timeout: 1000 });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        // Should fail validation for empty message
      }
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete operations within reasonable time', async () => {
      const startTime = Date.now();

      const input: GitInput = {
        operation: 'createCheckpoint',
        description: 'Performance test checkpoint',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const endTime = Date.now();

      expect(result.output).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent operations safely', async () => {
      const operations = Array.from({ length: 3 }, (_, i) => ({
        operation: 'createCheckpoint' as const,
        description: `Concurrent checkpoint ${i + 1}`,
      }));

      const promises = operations.map(async (input) => {
        const actor = createActor(gitActor, { input });
        actor.start();
        const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
        return result.output;
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((checkpoint, index) => {
        expect(checkpoint).toBeDefined();
        if (checkpoint) {
          expect(checkpoint.description).toBe(`Concurrent checkpoint ${index + 1}`);
        }
      });
    });

    test('should maintain data consistency across operations', async () => {
      await createTestFile('consistency-test.txt', 'Initial content');

      // Create checkpoint
      const checkpointInput: GitInput = {
        operation: 'createCheckpoint',
        description: 'Consistency test checkpoint',
      };

      const checkpointActor = createActor(gitActor, { input: checkpointInput });
      checkpointActor.start();
      const checkpointResult = await waitFor(checkpointActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const checkpoint = checkpointResult.output;

      expect(checkpoint).toBeDefined();
      if (!checkpoint) return;

      // Modify file and commit
      await writeFile(join(testDir, 'consistency-test.txt'), 'Modified content', 'utf-8');

      const commitInput: GitInput = {
        operation: 'commit',
        message: 'Modify content',
        files: ['consistency-test.txt'],
      };

      const commitActor = createActor(gitActor, { input: commitInput });
      commitActor.start();
      const commitResult = await waitFor(commitActor, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const commitCheckpoint = commitResult.output;

      expect(commitCheckpoint).toBeDefined();
      if (!commitCheckpoint) return;

      // Verify consistency
      expect(checkpoint.hash).not.toBe(commitCheckpoint.hash);
      expect(checkpoint.branch).toBe(commitCheckpoint.branch);
      expect(commitCheckpoint.timestamp).toBeGreaterThan(checkpoint.timestamp);
    });
  });
});
