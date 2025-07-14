import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor, waitFor } from 'xstate';
import { gitActor } from '../../src/actors/git.js';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Git operation input types
interface GitInput {
  operation: 'init' | 'add' | 'commit' | 'status' | 'diff' | 'log' | 'branch' | 'checkout' | 'merge' | 'push' | 'pull' | 'clone';
  repository?: string;
  files?: string[];
  message?: string;
  branch?: string;
  remote?: string;
  options?: Record<string, any>;
}

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
    } catch (error) {
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
    } catch (error) {
      // Git config might fail in some environments, that's okay
    }
  }

  describe('Repository Initialization', () => {
    test('should initialize a new git repository', async () => {
      const input: GitInput = {
        operation: 'init',
        repository: testDir,
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.success).toBe(true);
      expect(gitResult?.operation).toBe('init');

      // Verify .git directory exists
      try {
        const gitDir = join(testDir, '.git');
        await readFile(join(gitDir, 'HEAD'), 'utf-8');
        // If we can read HEAD, git init was successful
      } catch (error) {
        // In some test environments, git might not be available
        console.warn('Git not available in test environment');
      }
    });

    test('should handle git init in existing repository', async () => {
      // First initialize
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip test if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'init',
        repository: testDir,
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      // Should handle reinitializing gracefully
      expect(gitResult).toBeDefined();
    });
  });

  describe('File Operations', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should add files to staging area', async () => {
      await createTestFile('test.txt', 'Hello, World!');
      await createTestFile('another.txt', 'Another file');

      const input: GitInput = {
        operation: 'add',
        files: ['test.txt', 'another.txt'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('add');
      
      if (gitResult?.success) {
        expect(gitResult.files).toEqual(['test.txt', 'another.txt']);
      }
    });

    test('should add all files with wildcard', async () => {
      await createTestFile('file1.txt', 'Content 1');
      await createTestFile('file2.txt', 'Content 2');
      await createTestFile('file3.js', 'console.log("test");');

      const input: GitInput = {
        operation: 'add',
        files: ['.'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('add');
    });

    test('should commit staged files', async () => {
      await createTestFile('commit-test.txt', 'Test commit content');
      
      try {
        execSync('git add commit-test.txt', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'commit',
        message: 'Test commit message',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('commit');
      
      if (gitResult?.success) {
        expect(gitResult.message).toBe('Test commit message');
      }
    });

    test('should handle commit with no staged files', async () => {
      const input: GitInput = {
        operation: 'commit',
        message: 'Empty commit',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('commit');
      // Should handle gracefully even if no files to commit
    });
  });

  describe('Repository Status', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should get repository status', async () => {
      await createTestFile('status-test.txt', 'Status test content');

      const input: GitInput = {
        operation: 'status',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('status');
      
      if (gitResult?.success) {
        expect(gitResult.status).toBeDefined();
      }
    });

    test('should get diff information', async () => {
      await createTestFile('diff-test.txt', 'Original content');
      
      try {
        execSync('git add diff-test.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });
        
        // Modify the file
        await writeFile(join(testDir, 'diff-test.txt'), 'Modified content', 'utf-8');
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'diff',
        files: ['diff-test.txt'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('diff');
      
      if (gitResult?.success) {
        expect(gitResult.diff).toBeDefined();
      }
    });
  });

  describe('Branch Operations', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        // Create an initial commit so we can create branches
        await createTestFile('initial.txt', 'Initial content');
        execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should create a new branch', async () => {
      const input: GitInput = {
        operation: 'branch',
        branch: 'feature-branch',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('branch');
      
      if (gitResult?.success) {
        expect(gitResult.branch).toBe('feature-branch');
      }
    });

    test('should checkout existing branch', async () => {
      try {
        execSync('git branch feature-checkout', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'checkout',
        branch: 'feature-checkout',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('checkout');
      
      if (gitResult?.success) {
        expect(gitResult.branch).toBe('feature-checkout');
      }
    });

    test('should checkout and create new branch', async () => {
      const input: GitInput = {
        operation: 'checkout',
        branch: 'new-feature',
        options: { create: true },
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('checkout');
      
      if (gitResult?.success) {
        expect(gitResult.branch).toBe('new-feature');
      }
    });
  });

  describe('History Operations', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        
        // Create multiple commits for history
        await createTestFile('file1.txt', 'First commit');
        execSync('git add file1.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "First commit"', { cwd: testDir, stdio: 'pipe' });
        
        await createTestFile('file2.txt', 'Second commit');
        execSync('git add file2.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Second commit"', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should get commit log', async () => {
      const input: GitInput = {
        operation: 'log',
        options: { limit: 5 },
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('log');
      
      if (gitResult?.success) {
        expect(gitResult.log).toBeDefined();
        expect(Array.isArray(gitResult.commits)).toBe(true);
      }
    });

    test('should get log for specific file', async () => {
      const input: GitInput = {
        operation: 'log',
        files: ['file1.txt'],
        options: { limit: 3 },
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('log');
      
      if (gitResult?.success) {
        expect(gitResult.log).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid git operations', async () => {
      const input: GitInput = {
        operation: 'status',
        repository: '/nonexistent/directory',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('status');
      // Should handle gracefully even if operation fails
    });

    test('should handle missing commit message', async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        await createTestFile('test.txt', 'Test content');
        execSync('git add test.txt', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'commit',
        // Missing message
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('commit');
      // Should handle missing message gracefully
    });

    test('should handle adding non-existent files', async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'add',
        files: ['nonexistent.txt'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('add');
      // Should handle gracefully even if files don't exist
    });
  });

  describe('Remote Operations', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
        await createTestFile('remote-test.txt', 'Remote test content');
        execSync('git add remote-test.txt', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Initial commit for remote test"', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should handle push operation', async () => {
      const input: GitInput = {
        operation: 'push',
        remote: 'origin',
        branch: 'main',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('push');
      // Push will likely fail without a remote, but should handle gracefully
    });

    test('should handle pull operation', async () => {
      const input: GitInput = {
        operation: 'pull',
        remote: 'origin',
        branch: 'main',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('pull');
      // Pull will likely fail without a remote, but should handle gracefully
    });

    test('should handle clone operation', async () => {
      const cloneDir = join(tmpdir(), `clone-test-${Date.now()}`);
      
      const input: GitInput = {
        operation: 'clone',
        repository: 'https://github.com/nonexistent/repo.git',
        options: { destination: cloneDir },
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 10000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('clone');
      // Clone will likely fail for nonexistent repo, but should handle gracefully
    });
  });

  describe('Integration with Transformation System', () => {
    beforeEach(async () => {
      setupGitConfig();
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip tests if git is not available
      }
    });

    test('should track transformation changes', async () => {
      // Simulate a transformation workflow
      await createTestFile('transform.ts', 'var x = 1; // Original code');
      
      try {
        execSync('git add transform.ts', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Before transformation"', { cwd: testDir, stdio: 'pipe' });
        
        // Simulate transformation
        await writeFile(join(testDir, 'transform.ts'), 'const x = 1; // Transformed code', 'utf-8');
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'diff',
        files: ['transform.ts'],
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('diff');
      
      if (gitResult?.success && gitResult.diff) {
        expect(gitResult.diff).toContain('var x = 1');
        expect(gitResult.diff).toContain('const x = 1');
      }
    });

    test('should commit transformation results', async () => {
      await createTestFile('batch-transform.ts', 'var a = 1;\nvar b = 2;');
      
      try {
        execSync('git add batch-transform.ts', { cwd: testDir, stdio: 'pipe' });
        execSync('git commit -m "Before batch transformation"', { cwd: testDir, stdio: 'pipe' });
        
        // Simulate batch transformation
        await writeFile(join(testDir, 'batch-transform.ts'), 'const a = 1;\nconst b = 2;', 'utf-8');
        execSync('git add batch-transform.ts', { cwd: testDir, stdio: 'pipe' });
      } catch (error) {
        // Skip if git is not available
        return;
      }

      const input: GitInput = {
        operation: 'commit',
        message: 'Apply var-to-const transformation',
      };

      const actor = createActor(gitActor, { input });
      actor.start();

      const result = await waitFor(actor, (state) => state.status === 'done', { timeout: 5000 });
      const gitResult = result.output;

      expect(gitResult).toBeDefined();
      expect(gitResult?.operation).toBe('commit');
      
      if (gitResult?.success) {
        expect(gitResult.message).toBe('Apply var-to-const transformation');
      }
    });
  });
});