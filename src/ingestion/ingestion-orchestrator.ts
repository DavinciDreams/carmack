import { z } from 'zod';

import { getDatabaseManager } from '../db/connection.ts';
import { ASTAnalyzer, createTensorRTASTAnalyzer } from './ast-analyzer.ts';
import { ContentProcessor, createTensorRTContentProcessor } from './content-processor.ts';
import { GitHubClient, createTensorRTGitHubClient } from './github-client.ts';
import { RepositoryManager, createTensorRTRepositoryManager } from './repository-manager.ts';


/**
 * Ingestion Orchestrator for TensorRT-LLM Knowledge Graph
 *
 * Coordinates the complete ingestion pipeline including repository processing,
 * historical data extraction, AST analysis, content processing, and database
 * population. Follows Carmack's principles of robust orchestration and
 * error recovery.
 */
import type { 
  CommitSchema, 
  PRSchema, 
  ArtifactSchema, 
  CSTNodeSchema,
  CreateArtifactSchema,
  CreateGraphEdgeSchema 
} from '../db/schema.ts';

// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * Ingestion configuration schema
 */
export const IngestionConfigSchema = z.object({
  repositoryUrl: z.string().url().default('https://github.com/NVIDIA/TensorRT-LLM'),
  localPath: z.string().default('./workspace/tensorrt-llm'),
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
 * Orchestrates the complete TensorRT-LLM knowledge graph ingestion pipeline
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
    this.repositoryManager = createTensorRTRepositoryManager(this.config.localPath, {
      branch: this.config.branch,
    });
    
    this.githubClient = createTensorRTGitHubClient();
    this.astAnalyzer = createTensorRTASTAnalyzer();
    this.contentProcessor = createTensorRTContentProcessor();
  }

  /**
   * Run the complete ingestion pipeline
   */
  async runIngestion(): Promise<IngestionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting TensorRT-LLM knowledge graph ingestion...');
      
      // Phase 1: Clone/Update Repository
     // Skipping auto-clone of Carmack repo; only clone target repos via repository manager as requested.
     await this.updateProgress('cloning_repository', 'Ready for repository ingestion (no auto-clone)');
     // No-op: do not clone Carmack repo at startup.
      
      // Phase 2: Extract Git History
      await this.updateProgress('extracting_commits', 'Extracting commit history');
      const commits = await this.extractCommits();
      
      // Phase 3: Fetch GitHub Data
      let prs: any[] = [];
      if (this.config.enableGitHubData) {
        await this.updateProgress('fetching_prs', 'Fetching GitHub PR data');
        prs = await this.fetchPRs();
      }
      
      // Phase 4: Filter and Process Files
      await this.updateProgress('filtering_files', 'Filtering relevant files');
      const files = await this.filterFiles();
      
      // Phase 5: AST Analysis
      let astResults: Map<string, any> = new Map();
      if (this.config.enableAST) {
        await this.updateProgress('analyzing_ast', 'Analyzing code structure');
        astResults = await this.analyzeAST(files);
      }
      
      // Phase 6: Content Processing
      await this.updateProgress('processing_content', 'Processing file content');
      const processedContent = await this.processContent(files, astResults);
      
      // Phase 7: Store Data
      await this.updateProgress('storing_data', 'Storing data in knowledge graph');
      const { artifacts, cstNodes } = await this.storeData(commits, prs, processedContent);
      
      // Phase 8: Build Relationships
      await this.updateProgress('building_relationships', 'Building graph relationships');
      const relationships = await this.buildRelationships(commits, prs, artifacts, cstNodes);
      
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
   * Clone or update repository
   */
  private async cloneRepository(): Promise<void> {
    try {
      const exists = await this.repositoryManager.repositoryExists();
      
      if (exists) {
        console.log('📁 Repository exists, updating...');
        await this.repositoryManager.updateRepository();
      } else {
        console.log('📥 Cloning repository...');
        await this.repositoryManager.cloneRepository();
      }
    } catch (error) {
      throw new IngestionError(
        'Failed to clone repository',
        'cloning_repository',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Extract commit history
   */
  private async extractCommits(): Promise<any[]> {
    try {
      console.log('📜 Extracting commit history...');
      
      const commits = await this.repositoryManager.getCommitHistory({
        maxCount: this.config.maxCommits,
        includeDiff: true,
      });
      
      this.progress.metrics.commitsProcessed = commits.length;
      console.log(`✅ Extracted ${commits.length} commits`);
      
      return commits;
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
  private async fetchPRs(): Promise<any[]> {
    try {
      console.log('🔄 Fetching GitHub PR data...');
      
      const prs = await this.githubClient.getAllPullRequests({
        state: 'all',
        maxPages: Math.ceil(this.config.maxPRs / 100),
      });
      
      this.progress.metrics.prsProcessed = prs.length;
      console.log(`✅ Fetched ${prs.length} PRs`);
      
      return prs;
    } catch (error) {
      this.progress.warnings.push(`Failed to fetch PRs: ${error}`);
      console.warn('⚠️ Failed to fetch PRs, continuing without GitHub data');
      return [];
    }
  }

  /**
   * Filter relevant files
   */
  private async filterFiles(): Promise<any[]> {
    try {
      console.log('🔍 Filtering relevant files...');
      
      const filePaths = await this.repositoryManager.getFilteredFiles();
      const limitedPaths = filePaths.slice(0, this.config.maxFiles);
      
      const files: any[] = [];
      for (const filePath of limitedPaths) {
        try {
          const fileContent = await this.repositoryManager.readFileContent(filePath);
          files.push(fileContent);
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
  private async analyzeAST(files: any[]): Promise<Map<string, any>> {
    try {
      console.log('🔍 Analyzing AST structures...');
      
      const astResults = new Map();
      const results = await this.astAnalyzer.analyzeFiles(files);
      
      for (const result of results) {
        astResults.set(result.filePath, result);
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
  private async processContent(files: any[], astResults: Map<string, any>): Promise<any[]> {
    try {
      console.log('🔄 Processing content and generating embeddings...');
      
      const results = await this.contentProcessor.processFiles(files, astResults);
      
      const totalEmbeddings = results.reduce((sum, r) => sum + r.embeddings.length, 0);
      this.progress.metrics.embeddingsGenerated = totalEmbeddings;
      
      console.log(`✅ Processed ${results.length} files, generated ${totalEmbeddings} embeddings`);
      return results;
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
    commits: any[],
    prs: any[],
    processedContent: any[]
  ): Promise<{ artifacts: any[]; cstNodes: any[] }> {
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
  private async buildRelationships(
    commits: any[],
    prs: any[],
    artifacts: any[],
    cstNodes: any[]
  ): Promise<any[]> {
    try {
      console.log('🔗 Building graph relationships...');
      
      const db = getDatabaseManager();
      const relationships: any[] = [];
      
      // Create commit-PR relationships
      for (const pr of prs) {
        if (pr.mergeCommitSha) {
          const commitArtifact = artifacts.find(a => a.commit_hash === pr.mergeCommitSha);
          const prArtifact = artifacts.find(a => a.metadata?.number === pr.number);
          
          if (commitArtifact && prArtifact) {
            const relationship = {
              source_id: commitArtifact.id,
              target_id: prArtifact.id,
              relation_type: 'pr_link',
              confidence: 1.0,
              evidence: 'Merge commit SHA match',
            };
            
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
 * Create and run TensorRT-LLM ingestion
 */
export async function runTensorRTIngestion(
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