/**
 * Repository Manager for  Knowledge Graph Ingestion
 *
 * Handles git operations, file filtering, and content extraction for the
 * repository. Follows Carmack's principles of provable correctness
 * and efficient processing.
 */

import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { glob } from 'glob';
import type { LogResult, SimpleGit } from 'simple-git';
import { simpleGit } from 'simple-git';
import { z } from 'zod';
import { getTelemetryCollector } from '../telemetry/index.ts';

import type { CommitMetadata, FileContentMetadata } from '../types/unified-schemas.ts';
import {
  CommitDiffSchema,
  CommitMetadataSchema,
  FileContentMetadataSchema,
  TelemetryEventSchema,
} from '../types/unified-schemas.ts';
// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * File filter configuration schema
 */
export const FileFilterConfigSchema = z.object({
  includePatterns: z
    .array(z.string())
    .default([
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
      '**/*.cpp',
      '**/*.c',
      '**/*.h',
      '**/*.hpp',
      '**/*.cxx',
      '**/*.cu',
      '**/*.cuh',
      '**/*.sh',
      '**/*.yaml',
      '**/*.yml',
      '**/*.md',
      '**/*.json',
      '**/*.toml',
      '**/*.xml',
      '**/*.ini',
      '**/*.conf',
      '**/*.bat',
      '**/*.ps1',
      '**/src/**',
      '**/include/**',
      '**/lib/**',
      '**/app/**',
      '**/bin/**',
      '**/scripts/**',
      '**/config/**',
    ]),
  excludePatterns: z
    .array(z.string())
    .default([
      '**/test/**',
      '**/tests/**',
      '**/*_test.*',
      '**/*_tests.*',
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/__pycache__/**',
      '**/*.pyc',
      '**/*.o',
      '**/*.so',
      '**/*.a',
    ]),
  maxFileSize: z
    .number()
    .int()
    .positive()
    .default(1024 * 1024), // 1MB
  supportedExtensions: z
    .array(z.string())
    .default([
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.cpp',
      '.c',
      '.h',
      '.hpp',
      '.cxx',
      '.cu',
      '.cuh',
      '.sh',
      '.yaml',
      '.yml',
      '.md',
      '.json',
      '.toml',
      '.xml',
      '.ini',
      '.conf',
      '.bat',
      '.ps1',
    ]),
});

export type FileFilterConfig = z.infer<typeof FileFilterConfigSchema>;

// =============================================================================
// ERRORS
// =============================================================================

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class FileFilterError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FileFilterError';
  }
}

// =============================================================================
// REPOSITORY MANAGER
// =============================================================================

/**
 * Repository Manager for git operations and file processing
 */
export class RepositoryManager {
  private git: SimpleGit;
  private config: {
    url: string;
    localPath: string;
    branch: string;
    depth?: number | undefined;
    includeSubmodules?: boolean | undefined;
  };
  private filterConfig: FileFilterConfig;

  constructor(
    config: {
      url: string;
      localPath: string;
      branch?: string;
      depth?: number;
      includeSubmodules?: boolean;
    },
    filterConfig?: Partial<FileFilterConfig>
  ) {
    this.config = {
      url: config.url,
      localPath: config.localPath,
      branch: config.branch || 'main',
      depth: typeof config.depth === 'number' ? config.depth : undefined,
      includeSubmodules:
        typeof config.includeSubmodules === 'boolean' ? config.includeSubmodules : undefined,
    };
    this.filterConfig = FileFilterConfigSchema.parse(filterConfig || {});
    this.git = simpleGit();
  }

  /**
   * Clone repository to local path
   */
  async cloneRepository(): Promise<void> {
    try {
      console.log(`🔄 Cloning repository: ${this.config.url}`);

      const cloneOptions = ['--branch', this.config.branch, '--single-branch'];

      if (this.config.depth) {
        cloneOptions.push('--depth', this.config.depth.toString());
      }

      if (this.config.includeSubmodules) {
        cloneOptions.push('--recurse-submodules');
      }
      await this.git.clone(this.config.url, this.config.localPath, cloneOptions);

      // Switch to the cloned repository
      this.git = simpleGit(this.config.localPath);

      // Emit telemetry event for successful clone
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'repository_cloned',
          repositoryId: undefined,
          details: {
            url: this.config.url,
            localPath: this.config.localPath,
            branch: this.config.branch,
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        console.warn('Telemetry emission failed:', telemetryError);
      }

      console.log(`✅ Repository cloned to: ${this.config.localPath}`);
    } catch (error) {
      // Emit telemetry event for clone error
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'repository_clone_error',
          repositoryId: undefined,
          details: {
            url: this.config.url,
            localPath: this.config.localPath,
            branch: this.config.branch,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        console.warn('Telemetry emission failed:', telemetryError);
      }
      throw new RepositoryError('Failed to clone repository', 'CLONE_FAILED', {
        url: this.config.url,
        localPath: this.config.localPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update existing repository
   */
  async updateRepository(): Promise<void> {
    try {
      console.log(`🔄 Updating repository: ${this.config.localPath}`);

      this.git = simpleGit(this.config.localPath);

      await this.git.fetch();
      await this.git.pull('origin', this.config.branch);

      // Emit telemetry event for successful update
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'repository_updated',
          repositoryId: undefined,
          details: {
            localPath: this.config.localPath,
            branch: this.config.branch,
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        console.warn('Telemetry emission failed:', telemetryError);
      }

      console.log('✅ Repository updated');
    } catch (error) {
      // Emit telemetry event for update error
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'repository_update_error',
          repositoryId: undefined,
          details: {
            localPath: this.config.localPath,
            branch: this.config.branch,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        console.warn('Telemetry emission failed:', telemetryError);
      }
      throw new RepositoryError('Failed to update repository', 'UPDATE_FAILED', {
        localPath: this.config.localPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get commit history with metadata
   */
  async getCommitHistory(
    options: { since?: Date; until?: Date; maxCount?: number; includeDiff?: boolean } = {}
  ): Promise<CommitMetadata[]> {
    try {
      console.log('📊 Extracting commit history...');

      const logOptions: Record<string, unknown> = {
        format: {
          hash: '%H',
          shortHash: '%h',
          author: '%an',
          authorEmail: '%ae',
          committer: '%cn',
          committerEmail: '%ce',
          date: '%ai',
          message: '%B',
          subject: '%s',
          body: '%b',
          parentHashes: '%P',
          refs: '%D',
        },
      };

      if (options.since) {
        logOptions.since = options.since.toISOString();
      }

      if (options.until) {
        logOptions.until = options.until.toISOString();
      }

      if (options.maxCount) {
        logOptions.maxCount = options.maxCount;
      }

      const logResult: LogResult = await this.git.log(logOptions);

      const commits: CommitMetadata[] = [];

      for (const commit of logResult.all) {
        let diffData: z.infer<typeof CommitDiffSchema> | undefined;
        if (options.includeDiff) {
          try {
            const diffResult = await this.git.diffSummary([`${commit.hash}^`, commit.hash]);
            diffData = CommitDiffSchema.parse({
              files: diffResult.files.map((file) => ({
                file: file.file,
                changes: 'changes' in file ? file.changes : 0,
                insertions: 'insertions' in file ? file.insertions : 0,
                deletions: 'deletions' in file ? file.deletions : 0,
              })),
              insertions: diffResult.insertions,
              deletions: diffResult.deletions,
              filesChanged: diffResult.files.length,
            });
          } catch (error) {
            console.warn(`⚠️ Failed to get diff for commit ${commit.hash}:`, error);
          }
        }
        const commitMetadataRaw = {
          hash: commit.hash,
          shortHash: (commit as any).shortHash,
          author: {
            name: (commit as any).author,
            email: (commit as any).authorEmail,
          },
          committer: {
            name: (commit as any).committer,
            email: (commit as any).committerEmail,
          },
          date: new Date((commit as any).date),
          message: commit.message,
          subject: (commit as any).subject,
          body: (commit as any).body || undefined,
          parentHashes: (commit as any).parentHashes
            ? (commit as any).parentHashes.split(' ').filter(Boolean)
            : [],
          refs: (commit as any).refs || undefined,
          diff: diffData,
        };
        const commitMetadata = CommitMetadataSchema.parse(commitMetadataRaw);
        commits.push(commitMetadata);
      }

      console.log(`✅ Extracted ${commits.length} commits`);
      return commits;
    } catch (error) {
      throw new RepositoryError('Failed to get commit history', 'COMMIT_HISTORY_FAILED', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get diff for specific commit
   */
  async getCommitDiff(commitHash: string): Promise<string> {
    try {
      const diff = await this.git.show([commitHash, '--format=']);
      return diff;
    } catch (error) {
      throw new RepositoryError('Failed to get commit diff', 'COMMIT_DIFF_FAILED', {
        commitHash,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Filter files based on configuration
   */
  async getFilteredFiles(): Promise<string[]> {
    try {
      console.log('🔍 Filtering files in repository...');

      const allFiles: string[] = [];

      // Use glob patterns to find included files
      for (const pattern of this.filterConfig.includePatterns) {
        const matches = await glob(pattern, {
          cwd: this.config.localPath,
          nodir: true,
          absolute: false,
        });
        allFiles.push(...matches);
      }

      // Remove duplicates
      const uniqueFiles = [...new Set(allFiles)];

      // Filter out excluded patterns
      const filteredFiles = uniqueFiles.filter((file) => {
        // Check exclude patterns
        for (const excludePattern of this.filterConfig.excludePatterns) {
          if (this.matchesPattern(file, excludePattern)) {
            return false;
          }
        }

        // Check supported extensions
        const ext = extname(file);
        if (!this.filterConfig.supportedExtensions.includes(ext)) {
          return false;
        }

        return true;
      });

      // Check file sizes
      const validFiles: string[] = [];
      for (const file of filteredFiles) {
        try {
          const fullPath = join(this.config.localPath, file);
          const stats = await stat(fullPath);

          if (stats.size <= this.filterConfig.maxFileSize) {
            validFiles.push(file);
          } else {
            console.warn(`⚠️ Skipping large file: ${file} (${stats.size} bytes)`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to stat file: ${file}`, error);
        }
      }

      console.log(`✅ Filtered ${validFiles.length} files from ${uniqueFiles.length} total`);
      return validFiles;
    } catch (error) {
      throw new RepositoryError('Failed to filter files', 'FILE_FILTER_FAILED', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Read file content with metadata
   */
  async readFileContent(filePath: string, commitHash?: string): Promise<FileContentMetadata> {
    try {
      const fullPath = join(this.config.localPath, filePath);

      let content: string;
      let stats: { size: number; mtime: Date; birthtime: Date };

      if (commitHash) {
        // Read file from specific commit
        content = await this.git.show([`${commitHash}:${filePath}`]);
        stats = {
          size: Buffer.byteLength(content, 'utf8'),
          mtime: new Date(),
          birthtime: new Date(),
        };
      } else {
        // Read current file
        content = await readFile(fullPath, 'utf-8');
        const fileStats = await stat(fullPath);
        stats = { size: fileStats.size, mtime: fileStats.mtime, birthtime: fileStats.birthtime };
      }

      const language = this.detectLanguage(filePath);

      // Use Zod to validate the returned metadata
      return FileContentMetadataSchema.parse({
        id: crypto.randomUUID(),
        repositoryId: '',
        path: fullPath,
        language,
        size: stats.size,
        createdAt: stats.birthtime ? stats.birthtime : undefined,
        updatedAt: stats.mtime ? stats.mtime : undefined,
        content,
      });
    } catch (error) {
      throw new FileFilterError('Failed to read file content', filePath, {
        commitHash,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get files changed in a specific commit
   */
  async getChangedFiles(commitHash: string): Promise<string[]> {
    try {
      const diffResult = await this.git.diffSummary([`${commitHash}^`, commitHash]);
      return diffResult.files.map((file) => file.file);
    } catch (error) {
      throw new RepositoryError('Failed to get changed files', 'CHANGED_FILES_FAILED', {
        commitHash,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if repository exists locally
   */
  async repositoryExists(): Promise<boolean> {
    try {
      const stats = await stat(join(this.config.localPath, '.git'));
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'unknown';
    } catch (error) {
      throw new RepositoryError('Failed to get current branch', 'BRANCH_FAILED', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get repository status
   */
  async getRepositoryStatus() {
    try {
      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 1 });

      return {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        lastCommit: log.latest,
      };
    } catch (error) {
      throw new RepositoryError('Failed to get repository status', 'STATUS_FAILED', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Check if file matches glob pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');

    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = extname(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.cc': 'cpp',
      '.cpp': 'cpp',
      '.cxx': 'cpp',
      '.c++': 'cpp',
      '.h': 'cpp',
      '.hpp': 'cpp',
      '.hxx': 'cpp',
      '.h++': 'cpp',
      '.cu': 'cuda',
      '.cuh': 'cuda',
      '.py': 'python',
      '.pyx': 'python',
      '.pxd': 'python',
      '.c': 'c',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.rs': 'rust',
      '.go': 'go',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.rb': 'ruby',
      '.php': 'php',
      '.sh': 'bash',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.json': 'json',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
      '.txt': 'text',
    };

    return languageMap[ext] || 'unknown';
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create repository manager for any repository
 */
export function createRepositoryManager(
  url: string,
  localPath: string,
  options?: {
    branch?: string;
    depth?: number;
    customFilters?: Partial<FileFilterConfig>;
  }
): RepositoryManager {
  const config: {
    url: string;
    localPath: string;
    branch?: string;
    depth?: number;
    includeSubmodules?: boolean;
  } = {
    url,
    localPath,
    branch: options?.branch || 'main',
  };
  if (typeof options?.depth === 'number') config.depth = options.depth;
  config.includeSubmodules = false;
  return new RepositoryManager(config, options?.customFilters);
}

/**
 * Validate file filter configuration
 */
export function validateFileFilterConfig(config: unknown): FileFilterConfig {
  return FileFilterConfigSchema.parse(config);
}
