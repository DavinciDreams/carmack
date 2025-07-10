#!/usr/bin/env bun

/**
 * Repository Lifecycle Manager
 * Implements Carmack's systematic approach to repository management
 * with mathematical precision and provable correctness
 */

import { z } from 'zod';
import { join, resolve } from 'node:path';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { readdir, stat, writeFile, readFile } from 'node:fs/promises';
import { simpleGit, type SimpleGit } from 'simple-git';
import { watch, type FSWatcher } from 'chokidar';

// ===== SCHEMAS FOR TYPE SAFETY =====

export const RepositoryStateSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  branch: z.string(),
  localPath: z.string(),
  status: z.enum(['cloning', 'active', 'transforming', 'cleaned', 'archived']),
  created: z.number().int().positive(),
  lastAccessed: z.number().int().positive(),
  lastTransformation: z.number().int().positive().optional(),
  metadata: z.object({
    fileCount: z.number().int().min(0),
    diskSize: z.number().int().min(0),
    lastCommit: z.string().optional(),
    patterns: z.array(z.string()),
  }),
});

export const CleanupPolicySchema = z.object({
  maxAge: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24 hours
  maxDiskUsage: z.number().int().positive().default(10 * 1024 * 1024 * 1024), // 10GB
  maxRepositories: z.number().int().positive().default(100),
  cleanupInterval: z.number().int().positive().default(60 * 60 * 1000), // 1 hour
});

export const RepositoryConfigSchema = z.object({
  workspaceRoot: z.string(),
  cleanup: CleanupPolicySchema,
  patterns: z.object({
    sources: z.array(z.string()), // Pattern file sources
    consolidated: z.string(), // Single source of truth
    versioning: z.boolean().default(true),
  }),
  documentation: z.object({
    watchRepositories: z.boolean().default(true),
    autoUpdate: z.boolean().default(true),
    includePatterns: z.array(z.string()).default(['src/**', 'repository/**']),
  }),
  learning: z.object({
    enabled: z.boolean().default(true),
    patternStorage: z.string(),
    analysisInterval: z.number().int().positive().default(60000), // 1 minute
    adaptationThreshold: z.number().min(0).max(1).default(0.8), // 80% success rate
  }),
});

export type RepositoryState = z.infer<typeof RepositoryStateSchema>;
export type CleanupPolicy = z.infer<typeof CleanupPolicySchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;

// ===== REPOSITORY LIFECYCLE MANAGER =====

export class RepositoryManager {
  private config: RepositoryConfig;
  private repositories: Map<string, RepositoryState> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private learningTimer?: NodeJS.Timeout;
  private docWatcher?: FSWatcher;
  private git: SimpleGit;

  constructor(config: Partial<RepositoryConfig> = {}) {
    this.config = RepositoryConfigSchema.parse({
      workspaceRoot: config.workspaceRoot || join(process.cwd(), 'workspace'),
      cleanup: config.cleanup || {},
      patterns: config.patterns || {
        sources: ['patterns.json', 'patterns-v3.json'],
        consolidated: 'patterns-consolidated.json',
      },
      documentation: config.documentation || {},
      learning: config.learning || {
        patternStorage: join(process.cwd(), 'learned-patterns.json'),
      },
      ...config,
    });

    this.git = simpleGit();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Ensure workspace directory exists
    if (!existsSync(this.config.workspaceRoot)) {
      mkdirSync(this.config.workspaceRoot, { recursive: true });
    }

    // Load existing repository states
    await this.loadRepositoryStates();

    // Consolidate pattern files
    await this.consolidatePatterns();

    // Start cleanup timer
    this.startCleanupTimer();

    // Start learning system
    if (this.config.learning.enabled) {
      this.startLearningSystem();
    }

    // Start documentation watching
    if (this.config.documentation.watchRepositories) {
      this.startDocumentationWatcher();
    }

    console.log('🔧 Repository Manager initialized');
  }

  /**
   * Clone or update a repository
   */
  async acquireRepository(url: string, branch: string = 'main'): Promise<RepositoryState> {
    const repoId = this.generateRepositoryId(url, branch);
    const localPath = join(this.config.workspaceRoot, repoId, 'repository');

    let repoState = this.repositories.get(repoId);
    
    if (!repoState) {
      // Create new repository state
      repoState = RepositoryStateSchema.parse({
        id: repoId,
        url,
        branch,
        localPath,
        status: 'cloning',
        created: Date.now(),
        lastAccessed: Date.now(),
        metadata: {
          fileCount: 0,
          diskSize: 0,
          patterns: [],
        },
      });

      this.repositories.set(repoId, repoState);
    }

    try {
      if (!existsSync(localPath)) {
        console.log(`📥 Cloning repository: ${url}#${branch}`);
        await this.git.clone(url, localPath, ['-b', branch]);
      } else {
        console.log(`🔄 Updating repository: ${url}#${branch}`);
        const repoGit = simpleGit(localPath);
        await repoGit.pull();
      }

      // Update metadata
      const metadata = await this.analyzeRepository(localPath);
      repoState.status = 'active';
      repoState.lastAccessed = Date.now();
      repoState.metadata = metadata;

      await this.saveRepositoryStates();
      
      console.log(`✅ Repository ready: ${repoId}`);
      return repoState;
    } catch (error) {
      console.error(`❌ Failed to acquire repository: ${error}`);
      repoState.status = 'cleaned';
      throw error;
    }
  }

  /**
   * Release a repository (mark for cleanup)
   */
  async releaseRepository(repoId: string): Promise<void> {
    const repoState = this.repositories.get(repoId);
    if (!repoState) return;

    repoState.status = 'cleaned';
    repoState.lastAccessed = Date.now();
    await this.saveRepositoryStates();

    console.log(`🗑️ Repository marked for cleanup: ${repoId}`);
  }

  /**
   * Consolidate multiple pattern files into single source of truth
   */
  async consolidatePatterns(): Promise<void> {
    console.log('🔧 Consolidating pattern files...');

    const consolidatedPatterns = {
      version: '4.0.0',
      description: 'Consolidated transformation patterns - single source of truth',
      patterns: [] as any[],
      categories: {} as Record<string, string[]>,
      metadata: {
        consolidated: new Date().toISOString(),
        sources: this.config.patterns.sources,
        author: 'Carmack Coder',
        license: 'MIT',
      },
    };

    // Process each source pattern file
    for (const source of this.config.patterns.sources) {
      const sourcePath = resolve(source);
      if (!existsSync(sourcePath)) continue;

      try {
        const content = await readFile(sourcePath, 'utf-8');
        const sourcePatterns = JSON.parse(content);

        // Merge patterns (avoiding duplicates by ID)
        for (const pattern of sourcePatterns.patterns || []) {
          const existingIndex = consolidatedPatterns.patterns.findIndex(p => p.id === pattern.id);
          if (existingIndex >= 0) {
            // Update existing pattern with latest version
            consolidatedPatterns.patterns[existingIndex] = pattern;
          } else {
            // Add new pattern
            consolidatedPatterns.patterns.push(pattern);
          }
        }

        // Merge categories
        if (sourcePatterns.categories) {
          Object.assign(consolidatedPatterns.categories, sourcePatterns.categories);
        }

        console.log(`   ✅ Processed: ${source} (${sourcePatterns.patterns?.length || 0} patterns)`);
      } catch (error) {
        console.error(`   ❌ Failed to process ${source}:`, error);
      }
    }

    // Update metadata
    Object.assign(consolidatedPatterns.metadata, {
      totalPatterns: consolidatedPatterns.patterns.length,
      lastUpdated: new Date().toISOString(),
    });

    // Write consolidated file
    const consolidatedPath = resolve(this.config.patterns.consolidated);
    await writeFile(consolidatedPath, JSON.stringify(consolidatedPatterns, null, 2));

    console.log(`🎉 Consolidated ${consolidatedPatterns.patterns.length} patterns to ${consolidatedPath}`);
  }

  /**
   * Start automatic cleanup of old repositories
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.performCleanup();
    }, this.config.cleanup.cleanupInterval);
  }

  /**
   * Perform cleanup based on policy
   */
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const policy = this.config.cleanup;

    for (const [repoId, repoState] of this.repositories.entries()) {
      const shouldCleanup = 
        repoState.status === 'cleaned' ||
        (now - repoState.lastAccessed) > policy.maxAge ||
        this.repositories.size > policy.maxRepositories;

      if (shouldCleanup) {
        await this.cleanupRepository(repoId);
      }
    }
  }

  /**
   * Clean up a specific repository
   */
  private async cleanupRepository(repoId: string): Promise<void> {
    const repoState = this.repositories.get(repoId);
    if (!repoState) return;

    try {
      if (existsSync(repoState.localPath)) {
        rmSync(repoState.localPath, { recursive: true, force: true });
      }
      
      this.repositories.delete(repoId);
      await this.saveRepositoryStates();
      
      console.log(`🗑️ Cleaned up repository: ${repoId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup repository ${repoId}:`, error);
    }
  }

  /**
   * Start pattern learning system
   */
  private startLearningSystem(): void {
    this.learningTimer = setInterval(async () => {
      await this.analyzePatternEffectiveness();
    }, this.config.learning.analysisInterval);
  }

  /**
   * Analyze pattern effectiveness and learn new patterns
   */
  private async analyzePatternEffectiveness(): Promise<void> {
    // This would integrate with telemetry system
    // For now, placeholder for the learning logic
    console.log('🧠 Analyzing pattern effectiveness...');
  }

  /**
   * Start documentation watcher for repository changes
   */
  private startDocumentationWatcher(): void {
    const watchPaths = this.config.documentation.includePatterns.map(pattern => 
      join(this.config.workspaceRoot, pattern)
    );

    this.docWatcher = watch(watchPaths, {
      ignored: /node_modules|\.git/,
      persistent: true,
    });

    this.docWatcher.on('change', async (path: string) => {
      console.log(`📝 Documentation update triggered by: ${path}`);
      // Trigger documentation regeneration
      // This would call the documentation system
    });
  }

  /**
   * Generate deterministic repository ID
   */
  private generateRepositoryId(url: string, branch: string): string {
    // Use crypto to generate a deterministic UUID based on URL + branch
    const crypto = require('node:crypto');
    const data = `${url}#${branch}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Format as UUID v4 pattern
    const uuid = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '4' + hash.slice(13, 16), // Version 4
      ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
      hash.slice(20, 32)
    ].join('-');
    
    return uuid;
  }

  /**
   * Analyze repository metadata
   */
  private async analyzeRepository(localPath: string): Promise<RepositoryState['metadata']> {
    let fileCount = 0;
    let diskSize = 0;

    const walkDir = async (dir: string): Promise<void> => {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !entry.startsWith('.')) {
          await walkDir(fullPath);
        } else if (stats.isFile()) {
          fileCount++;
          diskSize += stats.size;
        }
      }
    };

    try {
      await walkDir(localPath);
      
      // Get last commit
      const repoGit = simpleGit(localPath);
      const log = await repoGit.log({ maxCount: 1 });
      const lastCommit = log.latest?.hash;

      return {
        fileCount,
        diskSize,
        lastCommit,
        patterns: [], // Would be populated from pattern analysis
      };
    } catch (error) {
      return { fileCount: 0, diskSize: 0, patterns: [] };
    }
  }

  /**
   * Load repository states from disk
   */
  private async loadRepositoryStates(): Promise<void> {
    const statePath = join(this.config.workspaceRoot, 'repository-states.json');
    if (!existsSync(statePath)) return;

    try {
      const content = await readFile(statePath, 'utf-8');
      const states = JSON.parse(content);
      
      for (const state of states) {
        const validated = RepositoryStateSchema.parse(state);
        this.repositories.set(validated.id, validated);
      }
      
      console.log(`📂 Loaded ${this.repositories.size} repository states`);
    } catch (error) {
      console.error('❌ Failed to load repository states:', error);
    }
  }

  /**
   * Save repository states to disk
   */
  private async saveRepositoryStates(): Promise<void> {
    const statePath = join(this.config.workspaceRoot, 'repository-states.json');
    const states = Array.from(this.repositories.values());
    
    try {
      await writeFile(statePath, JSON.stringify(states, null, 2));
    } catch (error) {
      console.error('❌ Failed to save repository states:', error);
    }
  }

  /**
   * Get current repository statistics
   */
  getStatistics(): {
    totalRepositories: number;
    activeRepositories: number;
    totalDiskUsage: number;
    oldestRepository: number;
  } {
    const now = Date.now();
    let totalDiskUsage = 0;
    let oldestRepository = now;
    let activeCount = 0;

    for (const repo of this.repositories.values()) {
      totalDiskUsage += repo.metadata.diskSize;
      if (repo.lastAccessed < oldestRepository) {
        oldestRepository = repo.lastAccessed;
      }
      if (repo.status === 'active') {
        activeCount++;
      }
    }

    return {
      totalRepositories: this.repositories.size,
      activeRepositories: activeCount,
      totalDiskUsage,
      oldestRepository: now - oldestRepository,
    };
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.learningTimer) {
      clearInterval(this.learningTimer);
    }

    if (this.docWatcher) {
      await this.docWatcher.close();
    }

    await this.saveRepositoryStates();
    console.log('🛑 Repository Manager shutdown complete');
  }
}

// ===== DEFAULT CONFIGURATION =====

export const defaultRepositoryConfig: RepositoryConfig = {
  workspaceRoot: join(process.cwd(), 'workspace'),
  cleanup: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxDiskUsage: 10 * 1024 * 1024 * 1024, // 10GB
    maxRepositories: 100,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
  patterns: {
    sources: [
      'patterns-consolidated.json', // Single source of truth
    ],
    consolidated: 'patterns-consolidated.json',
    versioning: true,
  },
  documentation: {
    watchRepositories: true,
    autoUpdate: true,
    includePatterns: ['src/**', 'repository/**'],
  },
  learning: {
    enabled: true,
    patternStorage: 'learned-patterns.json',
    analysisInterval: 60000, // 1 minute
    adaptationThreshold: 0.8, // 80% success rate
  },
};
