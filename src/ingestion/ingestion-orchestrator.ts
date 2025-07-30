// =====================
// ENTITY INTERFACES
// =====================

export interface PRArtifact {
  number: number;
  mergeCommitSha?: string;
  [key: string]: unknown;
}

export interface Artifact {
  id: string | number;
  commit_hash?: string;
  metadata?: {
    number?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
import { z } from 'zod';

import { getDatabaseManager } from '../db/connection.ts';
import { ASTAnalyzer } from '../docs-generator/ast-analyzer';
import { ModuleDocSchema } from '../docs-generator/types';
import { ContentProcessor, ProcessingResultSchema } from './content-processor.ts';
import { GitHubClient, PullRequestSchema } from './github-client.ts';
import { RepositoryManager, createRepositoryManager } from './repository-manager.ts';
import { CommitMetadataSchema, FileContentMetadataSchema, FileMetadataSchema } from '../types/unified-schemas.ts';


/**
 * Ingestion Orchestrator for Repository Knowledge Graph
 *
 * Coordinates the complete ingestion pipeline for any repository, including repository processing,
 * historical data extraction, AST analysis, content processing, and database
 * population. Follows Carmack's principles of robust orchestration and
 * error recovery.
 */


// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * Ingestion configuration schema
 */
// Dynamically resolve repo URL and workspace path from environment
const DEFAULT_REPO_URL = process.env.REPO_URL || 'https://github.com/example/repo';
const repoNameFromUrl = (url: string) => {
  const match = url.match(/github.com[/:]([^/]+)\/([^/.]+)/);
  return match ? match[2] : 'repo';
};
const DEFAULT_REPO_NAME = repoNameFromUrl(DEFAULT_REPO_URL);
const DEFAULT_LOCAL_PATH = `./workspace/${DEFAULT_REPO_NAME}`;

export const IngestionConfigSchema = z.object({
  repositoryUrl: z.string().url().default(DEFAULT_REPO_URL),
  localPath: z.string().default(DEFAULT_LOCAL_PATH),
  branch: z.string().default('main'),
  maxCommits: z.number().int().positive().default(1000),
  maxPRs: z.number().int().positive().default(500),
  maxFiles: z.number().int().positive().default(1000),
  batchSize: z.number().int().positive().default(10),
  enableAST: z.boolean().default(true),
  enableEmbeddings: z.boolean().default(true),
  enableGitHubData: z.boolean().default(true),
  parallelProcessing: z.boolean().default(false),
  maxConcurrency: z.number().int().positive().default(3),
});

export type IngestionConfig = z.infer<typeof IngestionConfigSchema>;

/**
 * Ingestion progress schema
 */
export const IngestionProgressSchema = z.object({
  phase: z.enum([
    'initializing',
    'cloning_repository',
    'extracting_commits',
    'fetching_prs',
    'filtering_files',
    'analyzing_ast',
    'processing_content',
    'generating_embeddings',
    'storing_data',
    'building_relationships',
    'completed',
    'failed'
  ]),
  totalSteps: z.number().int().min(0),
  completedSteps: z.number().int().min(0),
  currentStep: z.string(),
  startTime: z.date(),
  estimatedCompletion: z.date().optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  metrics: z.object({
    commitsProcessed: z.number().int().min(0).default(0),
    prsProcessed: z.number().int().min(0).default(0),
    filesProcessed: z.number().int().min(0).default(0),
    artifactsCreated: z.number().int().min(0).default(0),
    relationshipsCreated: z.number().int().min(0).default(0),
    embeddingsGenerated: z.number().int().min(0).default(0),
  }).default({}),
});

export type IngestionProgress = z.infer<typeof IngestionProgressSchema>;

/**
 * Ingestion result schema
 */
export const IngestionResultSchema = z.object({
  success: z.boolean(),
  progress: IngestionProgressSchema,
  totalProcessingTime: z.number().int().min(0),
  summary: z.object({
    repositoryPath: z.string(),
    branch: z.string(),
    lastCommit: z.string().optional(),
    totalCommits: z.number().int().min(0),
    totalPRs: z.number().int().min(0),
    totalFiles: z.number().int().min(0),
    totalArtifacts: z.number().int().min(0),
    totalRelationships: z.number().int().min(0),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type IngestionResult = z.infer<typeof IngestionResultSchema>;

// =============================================================================
// ERRORS
// =============================================================================

export class IngestionError extends Error {
  constructor(
    message: string,
    public readonly phase: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IngestionError';
  }
}

// =============================================================================
// INGESTION ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates the complete knowledge graph ingestion pipeline
 */
export class IngestionOrchestrator {
  private config: IngestionConfig;
  private progress: IngestionProgress;
  private repositoryManager: RepositoryManager;
  private githubClient: GitHubClient;
  private astAnalyzer: ASTAnalyzer;
  private contentProcessor: ContentProcessor;
  private progressCallbacks: Array<(progress: IngestionProgress) => void> = [];

  constructor(config?: Partial<IngestionConfig>) {
    this.config = IngestionConfigSchema.parse(config || {});
    
    this.progress = {
      phase: 'initializing',
      totalSteps: 10,
      completedSteps: 0,
      currentStep: 'Initializing ingestion pipeline',
      startTime: new Date(),
      errors: [],
      warnings: [],
      metrics: {
        commitsProcessed: 0,
        prsProcessed: 0,
        filesProcessed: 0,
        artifactsCreated: 0,
        relationshipsCreated: 0,
        embeddingsGenerated: 0,
      },
    };

    // Initialize components
    this.repositoryManager = createRepositoryManager(
      this.config.repositoryUrl,
      this.config.localPath,
      { branch: this.config.branch }
    );
    // TODO: Replace below with generic factories if needed for GitHubClient, ASTAnalyzer, ContentProcessor
    // Parse owner/repo from repositoryUrl
    const repoUrl = this.config.repositoryUrl;
    let owner = '';
    let repo = '';
    try {
      const match = repoUrl.match(/github.com[/:]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = match[1] ?? '';
        repo = match[2] ?? '';
      }
    } catch {}
    this.githubClient = new GitHubClient({
      owner,
      repo,
      token: process.env.GITHUB_TOKEN,
    });
    this.astAnalyzer = new ASTAnalyzer();
    this.contentProcessor = new ContentProcessor();
  }

  /**
   * Run the complete ingestion pipeline
   */
  async runIngestion(): Promise<IngestionResult> {
    const startTime = Date.now();
    
    try {
  console.log('🚀 Starting repository knowledge graph ingestion...');
      
      // Phase 1: Clone/Update Repository
     // Skipping auto-clone of Carmack repo; only clone target repos via repository manager as requested.
     await this.updateProgress('cloning_repository', 'Ready for repository ingestion (no auto-clone)');
     // No-op: do not clone Carmack repo at startup.
      
      // Phase 2: Extract Git History
      await this.updateProgress('extracting_commits', 'Extracting commit history');
      const commits = await this.extractCommits();
      
      // Phase 3: Fetch GitHub Data
  let prs: z.infer<typeof PullRequestSchema>[] = [];
      if (this.config.enableGitHubData) {
        await this.updateProgress('fetching_prs', 'Fetching GitHub PR data');
        prs = await this.fetchPRs();
      }

      // Phase 4: Filter and Process Files
      await this.updateProgress('filtering_files', 'Filtering relevant files');
      const files = await this.filterFiles();

      // Phase 5: AST Analysis
      let astResults: Map<string, z.infer<typeof ModuleDocSchema>> = new Map();
      if (this.config.enableAST) {
        await this.updateProgress('analyzing_ast', 'Analyzing code structure');
        // Map FileContentMetadata to FileMetadataSchema shape for AST analysis
        const fileMetas = files.map(f => ({
          id: f.id,
          repositoryId: f.repositoryId || 'unknown-repo-id',
          path: f.path,
          language: f.language,
          size: f.size,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          embedding: undefined,
        }));
        astResults = await this.analyzeAST(fileMetas);
      }

      // Phase 6: Content Processing
      await this.updateProgress('processing_content', 'Processing file content');
      const processedContent = await this.processContent(files, astResults);

      // Phase 7: Store Data
      await this.updateProgress('storing_data', 'Storing data in knowledge graph');
  const { artifacts } = await this.storeData(commits, prs, processedContent);

      // Phase 8: Build Relationships
      await this.updateProgress('building_relationships', 'Building graph relationships');
      const relationships = await this.buildRelationships(prs, artifacts);

      // Phase 9: Complete
      await this.updateProgress('completed', 'Ingestion completed successfully');

      const result: IngestionResult = {
        success: true,
        progress: this.progress,
        totalProcessingTime: Date.now() - startTime,
        summary: {
          repositoryPath: this.config.localPath,
          branch: this.config.branch,
          lastCommit: commits[0]?.hash,
          totalCommits: commits.length,
          totalPRs: prs.length,
          totalFiles: files.length,
          totalArtifacts: artifacts.length,
          totalRelationships: relationships.length,
        },
        errors: this.progress.errors,
        warnings: this.progress.warnings,
      };

      console.log('✅ Ingestion completed successfully!');
      console.log(`📊 Summary: ${artifacts.length} artifacts, ${relationships.length} relationships`);

      return IngestionResultSchema.parse(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.progress.errors.push(errorMessage);
      this.progress.phase = 'failed';
      
      console.error('❌ Ingestion failed:', errorMessage);
      
      const result: IngestionResult = {
        success: false,
        progress: this.progress,
        totalProcessingTime: Date.now() - startTime,
        summary: {
          repositoryPath: this.config.localPath,
          branch: this.config.branch,
          totalCommits: 0,
          totalPRs: 0,
          totalFiles: 0,
          totalArtifacts: 0,
          totalRelationships: 0,
        },
        errors: this.progress.errors,
        warnings: this.progress.warnings,
      };

      return IngestionResultSchema.parse(result);
    }
  }

  /**
   * Add progress callback
   */
  onProgress(callback: (progress: IngestionProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Get current progress
   */
  getProgress(): IngestionProgress {
    return { ...this.progress };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Update progress and notify callbacks
   */
  private async updateProgress(
    phase: IngestionProgress['phase'],
    currentStep: string
  ): Promise<void> {
    this.progress.phase = phase;
    this.progress.currentStep = currentStep;
    this.progress.completedSteps++;
    
    // Estimate completion time
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const progressRatio = this.progress.completedSteps / this.progress.totalSteps;
    if (progressRatio > 0) {
      const estimatedTotal = elapsed / progressRatio;
      this.progress.estimatedCompletion = new Date(
        this.progress.startTime.getTime() + estimatedTotal
      );
    }
    
    console.log(`📊 [${this.progress.completedSteps}/${this.progress.totalSteps}] ${currentStep}`);
    
    // Notify callbacks
    for (const callback of this.progressCallbacks) {
      try {
        callback(this.progress);
      } catch (error) {
        console.warn('⚠️ Progress callback error:', error);
      }
    }
  }


  /**
   * Extract commit history
   */
  private async extractCommits(): Promise<z.infer<typeof CommitMetadataSchema>[]> {
    try {
      console.log('📜 Extracting commit history...');
      
      const commits = await this.repositoryManager.getCommitHistory({
        maxCount: this.config.maxCommits,
        includeDiff: true,
      });
      // Validate all commits
  const safeCommits = commits.map(c => CommitMetadataSchema.parse(c));
      this.progress.metrics.commitsProcessed = safeCommits.length;
      console.log(`✅ Extracted ${safeCommits.length} commits`);
      return safeCommits;
    } catch (error) {
      throw new IngestionError(
        'Failed to extract commits',
        'extracting_commits',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Fetch GitHub PR data
   */
  private async fetchPRs(): Promise<z.infer<typeof PullRequestSchema>[]> {
    try {
      console.log('🔄 Fetching GitHub PR data...');
      
      const prs = await this.githubClient.getAllPullRequests({
        state: 'all',
        maxPages: Math.ceil(this.config.maxPRs / 100),
      });
      // Validate all PRs
  const safePRs = prs.map(pr => PullRequestSchema.parse(pr));
      this.progress.metrics.prsProcessed = safePRs.length;
      console.log(`✅ Fetched ${safePRs.length} PRs`);
      return safePRs;
    } catch (error) {
      this.progress.warnings.push(`Failed to fetch PRs: ${error}`);
      console.warn('⚠️ Failed to fetch PRs, continuing without GitHub data');
      return [];
    }
  }

  /**
   * Filter relevant files
   */
  private async filterFiles(): Promise<z.infer<typeof FileContentMetadataSchema>[]> {
    try {
      console.log('🔍 Filtering relevant files...');
      
      const filePaths = await this.repositoryManager.getFilteredFiles();
      const limitedPaths = filePaths.slice(0, this.config.maxFiles);
      
  const files: z.infer<typeof FileContentMetadataSchema>[] = [];
      for (const filePath of limitedPaths) {
        try {
          const fileContent = await this.repositoryManager.readFileContent(filePath);
          // Validate file content
          files.push(FileContentMetadataSchema.parse(fileContent));
        } catch (error) {
          this.progress.warnings.push(`Failed to read file ${filePath}: ${error}`);
        }
      }
      this.progress.metrics.filesProcessed = files.length;
      console.log(`✅ Filtered ${files.length} files`);
      return files;
    } catch (error) {
      throw new IngestionError(
        'Failed to filter files',
        'filtering_files',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Analyze AST for files
   */
  private async analyzeAST(files: z.infer<typeof FileMetadataSchema>[]): Promise<Map<string, z.infer<typeof ModuleDocSchema>>> {
    try {
      console.log('🔍 Analyzing AST structures...');
      
      const astResults = new Map<string, z.infer<typeof ModuleDocSchema>>();
      const results: z.infer<typeof ModuleDocSchema>[] = [];
      for (const file of files) {
        try {
          const result = await this.astAnalyzer.analyzeFile(file.path);
          if (result && result.filePath) {
            // Validate AST result
            const safeResult = ModuleDocSchema.parse(result);
            astResults.set(result.filePath, safeResult);
            results.push(safeResult);
          }
        } catch (error) {
          this.progress.warnings.push(`AST analysis failed for file: ${file?.path || '[unknown]'}: ${error}`);
        }
      }
      console.log(`✅ Analyzed AST for ${results.length} files`);
      return astResults;
    } catch (error) {
      this.progress.warnings.push(`AST analysis failed: ${error}`);
      console.warn('⚠️ AST analysis failed, continuing without AST data');
      return new Map();
    }
  }

  /**
   * Process content and generate embeddings
   */
  private async processContent(
    files: z.infer<typeof FileContentMetadataSchema>[],
    astResults: Map<string, z.infer<typeof ModuleDocSchema>>
  ): Promise<z.infer<typeof ProcessingResultSchema>[]> {
    try {
      console.log('🔄 Processing content and generating embeddings...');
      // Map FileContentMetadata to FileMetadataSchema shape (repositoryId required, content, etc.)
      const fileMetas = files.map(f => ({
        id: f.id,
        repositoryId: f.repositoryId || 'unknown-repo-id',
        path: f.path,
        language: f.language,
        size: f.size,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        embedding: undefined,
        content: f.content,
      }));
      const results = await this.contentProcessor.processFiles(fileMetas, astResults);
      // Validate all processing results
      const safeResults = results.map(r => ProcessingResultSchema.parse(r));
      const totalEmbeddings = safeResults.reduce((sum, r) => sum + r.embeddings.length, 0);
      this.progress.metrics.embeddingsGenerated = totalEmbeddings;
      console.log(`✅ Processed ${safeResults.length} files, generated ${totalEmbeddings} embeddings`);
      return safeResults;
    } catch (error) {
      throw new IngestionError(
        'Failed to process content',
        'processing_content',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Store data in database
   */
  private async storeData(
  commits: z.infer<typeof CommitMetadataSchema>[],
  prs: z.infer<typeof PullRequestSchema>[],
  processedContent: z.infer<typeof ProcessingResultSchema>[]
  ): Promise<{ artifacts: unknown[]; cstNodes: unknown[] }> {
    try {
      console.log('💾 Storing data in knowledge graph...');
      
      const db = getDatabaseManager();
      const artifacts: any[] = [];
      const cstNodes: any[] = [];
      
      // Store commits as artifacts
      for (const commit of commits) {
        const artifact = {
          type: 'commit' as const,
          name: commit.subject || commit.message.split('\n')[0],
          description: commit.message,
          commit_hash: commit.hash,
          author_name: commit.author.name,
          author_email: commit.author.email,
          created_date: commit.date,
          repository_url: this.config.repositoryUrl,
          metadata: {
            parentHashes: commit.parentHashes,
            diff: commit.diff,
          },
        };
        const result = await db.query(
          'INSERT INTO artifacts (type, name, description, commit_hash, author_name, author_email, created_date, repository_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
          [artifact.type, artifact.name, artifact.description, artifact.commit_hash, artifact.author_name, artifact.author_email, artifact.created_date, artifact.repository_url, JSON.stringify(artifact.metadata)]
        );
        artifacts.push({ ...artifact, id: result.rows[0].id });
      }
      
      // Store PRs as artifacts
      for (const pr of prs) {
        const artifact = {
          type: 'pr' as const,
          name: pr.title,
          description: pr.body || '',
          author_name: pr.user.login,
          created_date: new Date(pr.createdAt),
          repository_url: this.config.repositoryUrl,
          metadata: {
            number: pr.number,
            state: pr.state,
            merged: pr.merged,
            mergedAt: pr.mergedAt,
            labels: pr.labels,
          },
        };
        const result = await db.query(
          'INSERT INTO artifacts (type, name, description, author_name, created_date, repository_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [artifact.type, artifact.name, artifact.description, artifact.author_name, artifact.created_date, artifact.repository_url, JSON.stringify(artifact.metadata)]
        );
        artifacts.push({ ...artifact, id: result.rows[0].id });
      }
      
      // Store files and content as artifacts
      for (const content of processedContent) {
        const artifact = {
          type: 'file' as const,
          name: content.filePath.split('/').pop() || content.filePath,
          description: content.annotation.summary,
          file_path: content.filePath,
          language: content.chunks[0]?.language || 'unknown',
          repository_url: this.config.repositoryUrl,
          metadata: {
            annotation: content.annotation,
            chunkCount: content.chunks.length,
          },
        };
        const result = await db.query(
          'INSERT INTO artifacts (type, name, description, file_path, language, repository_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [artifact.type, artifact.name, artifact.description, artifact.file_path, artifact.language, artifact.repository_url, JSON.stringify(artifact.metadata)]
        );
        artifacts.push({ ...artifact, id: result.rows[0].id });
      }
      
      this.progress.metrics.artifactsCreated = artifacts.length;
      console.log(`✅ Stored ${artifacts.length} artifacts`);
      
      return { artifacts, cstNodes };
    } catch (error) {
      throw new IngestionError(
        'Failed to store data',
        'storing_data',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Build relationships between artifacts
   */
  // Zod schemas for relationship building
  private static readonly RelationshipSchema = z.object({
    source_id: z.union([z.string(), z.number()]),
    target_id: z.union([z.string(), z.number()]),
    relation_type: z.string(),
    confidence: z.number(),
    evidence: z.string(),
  }).strict();

  private static readonly PRArtifactSchema = z.object({
    number: z.number(),
    mergeCommitSha: z.string().optional(),
    // ... add more fields as needed
  }).passthrough();

  private static readonly ArtifactSchema = z.object({
    id: z.union([z.string(), z.number()]),
    commit_hash: z.string().optional(),
    metadata: z.object({
      number: z.number().optional(),
    }).passthrough().optional(),
  }).passthrough();

  /**
   * Build relationships between artifacts, with Zod validation
   */
  private async buildRelationships(
    prs: unknown[],
    artifacts: unknown[]
  ): Promise<Array<z.infer<typeof IngestionOrchestrator.RelationshipSchema>>> {
    try {
      console.log('🔗 Building graph relationships...');
      
      const db = getDatabaseManager();
      const relationships: Array<z.infer<typeof IngestionOrchestrator.RelationshipSchema>> = [];

      // Zod-validate all inputs
  const safePRs = prs.map((pr) => IngestionOrchestrator.PRArtifactSchema.parse(pr));
  const safeArtifacts = artifacts.map((a) => IngestionOrchestrator.ArtifactSchema.parse(a));

      // Create commit-PR relationships
      for (const pr of safePRs) {
        if (pr.mergeCommitSha) {
          const commitArtifact = safeArtifacts.find(a => a.commit_hash === pr.mergeCommitSha);
          const prArtifact = safeArtifacts.find(a => a.metadata?.number === pr.number);

          if (commitArtifact && prArtifact) {
            const relationship = IngestionOrchestrator.RelationshipSchema.parse({
              source_id: commitArtifact.id,
              target_id: prArtifact.id,
              relation_type: 'pr_link',
              confidence: 1.0,
              evidence: 'Merge commit SHA match',
            });

            await db.query(
              'INSERT INTO graph_edges (source_id, target_id, relation_type, confidence, evidence) VALUES ($1, $2, $3, $4, $5)',
              [relationship.source_id, relationship.target_id, relationship.relation_type, relationship.confidence, relationship.evidence]
            );

            relationships.push(relationship);
          }
        }
      }

      this.progress.metrics.relationshipsCreated = relationships.length;
      console.log(`✅ Built ${relationships.length} relationships`);

      return relationships;
    } catch (error) {
      throw new IngestionError(
        'Failed to build relationships',
        'building_relationships',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create and run repository ingestion
 */
export async function runRepositoryIngestion(
  config?: Partial<IngestionConfig>
): Promise<IngestionResult> {
  const orchestrator = new IngestionOrchestrator(config);
  return orchestrator.runIngestion();
}

/**
 * Create ingestion orchestrator with progress tracking
 */
export function createIngestionOrchestrator(
  config?: Partial<IngestionConfig>,
  onProgress?: (progress: IngestionProgress) => void
): IngestionOrchestrator {
  const orchestrator = new IngestionOrchestrator(config);
  
  if (onProgress) {
    orchestrator.onProgress(onProgress);
  }
  
  return orchestrator;
}

/**
 * Validate ingestion configuration
 */
export function validateIngestionConfig(config: unknown): IngestionConfig {
  return IngestionConfigSchema.parse(config);
}