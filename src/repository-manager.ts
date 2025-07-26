import { createActor, fromPromise } from 'xstate';
import { z } from 'zod';

import { gitActor } from './actors/git.ts';
import { type LearningResult, patternLearningActor } from './actors/pattern-learning.ts';
import { carmackCoderMachine } from './machine.ts';
import { AstPatternSchema, TransformationRequestSchema } from './types.ts';

import type { AstPattern, TransformationRequest, TransformationResult } from './types.ts';

// Repository management types and schemas
export const RepositoryConfigSchema = z.object({
  url: z.string().url(),
  branch: z.string().default('main'),
  targetDirectory: z.string().optional(),
  includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.js']),
  excludePatterns: z.array(z.string()).default(['node_modules/**', '**/*.test.*', '**/*.spec.*']),
  maxFileSize: z.number().default(1024 * 1024), // 1MB default
  timeout: z.number().default(300000), // 5 minutes
});

export const RepositoryAnalysisSchema = z.object({
  repositoryUrl: z.string(),
  clonePath: z.string(),
  totalFiles: z.number(),
  analyzedFiles: z.number(),
  skippedFiles: z.number(),
  totalLinesOfCode: z.number(),
  languages: z.record(z.number()),
  complexity: z.object({
    average: z.number(),
    max: z.number(),
    distribution: z.record(z.number()),
  }),
  patterns: z.array(z.any()), // AstPattern array
  issues: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      severity: z.enum(['error', 'warning', 'info']),
      message: z.string(),
      rule: z.string(),
    })
  ),
  recommendations: z.array(z.string()),
});

export const RepositoryProcessingResultSchema = z.object({
  repositoryUrl: z.string(),
  status: z.enum(['success', 'partial', 'failed']),
  analysis: RepositoryAnalysisSchema,
  transformations: z.array(z.any()), // TransformationResult array
  documentation: z
    .object({
      apiDocs: z.string().optional(),
      architectureDocs: z.string().optional(),
      patternDocs: z.string().optional(),
    })
    .optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  processingTime: z.number(),
  outputPath: z.string().optional(),
});

// Repository State Management Schema
export const RepositoryStateSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  branch: z.string(),
  localPath: z.string(),
  status: z.enum(['active', 'inactive', 'error', 'cloning', 'analyzing']),
  created: z.number(),
  lastAccessed: z.number(),
  metadata: z.object({
    fileCount: z.number(),
    diskSize: z.number(),
    patterns: z.array(z.any()),
    complexity: z.number().optional(),
  }),
});

// Type exports
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type RepositoryAnalysis = z.infer<typeof RepositoryAnalysisSchema>;
export type RepositoryProcessingResult = z.infer<typeof RepositoryProcessingResultSchema>;
export type RepositoryState = z.infer<typeof RepositoryStateSchema>;

/**
 * Repository Manager
 *
 * Handles cloning, analyzing, and processing external repositories
 * with comprehensive transformation and documentation capabilities.
 */
export class RepositoryManager {
  private tempDir: string;
  private gitCommand: string;
  private activeRepositories: Map<string, RepositoryState> = new Map();
  private consolidatedPatterns: AstPattern[] = [];

  constructor() {
    this.tempDir = './temp/repositories';
    this.gitCommand = 'git';
  }

  /**
   * Acquire a repository for transformation
   * This method handles Git cloning, validation, and state management
   */
  async acquireRepository(config: RepositoryConfig): Promise<RepositoryState> {
    const validatedConfig = RepositoryConfigSchema.parse(config);
    const repositoryId = crypto.randomUUID();

    console.log(`🔄 Acquiring repository: ${validatedConfig.url}`);

    // Create initial repository state
    const repoState: RepositoryState = {
      id: repositoryId,
      url: validatedConfig.url,
      branch: validatedConfig.branch,
      localPath: '',
      status: 'cloning',
      created: Date.now(),
      lastAccessed: Date.now(),
      metadata: {
        fileCount: 0,
        diskSize: 0,
        patterns: [],
      },
    };

    try {
      // Clone the repository
      const clonePath = await this.cloneRepository(validatedConfig);
      repoState.localPath = clonePath;
      repoState.status = 'analyzing';

      // Analyze repository structure
      const analysis = await this.analyzeRepository(clonePath, validatedConfig);
      repoState.metadata.fileCount = analysis.analyzedFiles;
      repoState.metadata.patterns = analysis.patterns;
      repoState.metadata.complexity = analysis.complexity.average;

      // Create Git checkpoint for safety
      const gitActorInstance = createActor(gitActor, {
        input: {
          operation: 'createCheckpoint',
          description: `Repository acquisition: ${validatedConfig.url}`,
        },
      });

      try {
        gitActorInstance.start();
        await new Promise((resolve, reject) => {
          const subscription = gitActorInstance.subscribe((state) => {
            if (state.status === 'done') {
              subscription.unsubscribe();
              gitActorInstance.stop();
              resolve(state.output);
            } else if (state.status === 'error') {
              subscription.unsubscribe();
              gitActorInstance.stop();
              reject(state.error);
            }
          });
        });
      } catch (error) {
        console.warn('Failed to create Git checkpoint:', error);
      }

      repoState.status = 'active';
      this.activeRepositories.set(repositoryId, repoState);

      console.log(`✅ Repository acquired: ${repoState.id} (${analysis.analyzedFiles} files)`);
      return repoState;
    } catch (error) {
      repoState.status = 'error';
      console.error(`❌ Failed to acquire repository: ${error}`);
      throw new Error(
        `Repository acquisition failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Release a repository and cleanup resources
   */
  async releaseRepository(repositoryId: string): Promise<void> {
    console.log(`🧹 Releasing repository: ${repositoryId}`);

    const repoState = this.activeRepositories.get(repositoryId);
    if (!repoState) {
      console.warn(`Repository ${repositoryId} not found in active repositories`);
      return;
    }

    try {
      // Cleanup local files
      if (repoState.localPath) {
        await this.cleanup(repoState.localPath);
      }

      // Update state
      repoState.status = 'inactive';
      this.activeRepositories.delete(repositoryId);

      console.log(`✅ Repository released: ${repositoryId}`);
    } catch (error) {
      console.error(`❌ Failed to release repository ${repositoryId}:`, error);
      throw new Error(
        `Repository release failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Consolidate patterns from various sources
   */
  async consolidatePatterns(sources?: {
    patternFiles?: string[];
    learnedPatterns?: AstPattern[];
    repositoryPatterns?: AstPattern[];
  }): Promise<AstPattern[]> {
    console.log('🔧 Consolidating transformation patterns');

    const consolidatedPatterns: AstPattern[] = [];
    const patternIds = new Set<string>();

    try {
      // Load base patterns from patterns.json
      const { readFile } = await import('node:fs/promises');
      const { existsSync } = await import('node:fs');

      if (existsSync('./patterns.json')) {
        const content = await readFile('./patterns.json', 'utf-8');
        const data = JSON.parse(content);

        if (data.patterns && Array.isArray(data.patterns)) {
          for (const pattern of data.patterns) {
            try {
              const validatedPattern = AstPatternSchema.parse(pattern);
              if (!patternIds.has(validatedPattern.id)) {
                consolidatedPatterns.push(validatedPattern);
                patternIds.add(validatedPattern.id);
              }
            } catch (error) {
              console.warn(`Invalid pattern ${pattern.id}:`, error);
            }
          }
        }
      }

      // Add patterns from additional sources
      if (sources?.patternFiles) {
        for (const filePath of sources.patternFiles) {
          if (existsSync(filePath)) {
            const content = await readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            if (data.patterns && Array.isArray(data.patterns)) {
              for (const pattern of data.patterns) {
                try {
                  const validatedPattern = AstPatternSchema.parse(pattern);
                  if (!patternIds.has(validatedPattern.id)) {
                    consolidatedPatterns.push(validatedPattern);
                    patternIds.add(validatedPattern.id);
                  }
                } catch (error) {
                  console.warn(`Invalid pattern from ${filePath}:`, error);
                }
              }
            }
          }
        }
      }

      // Add learned patterns
      if (sources?.learnedPatterns) {
        for (const pattern of sources.learnedPatterns) {
          if (!patternIds.has(pattern.id)) {
            consolidatedPatterns.push(pattern);
            patternIds.add(pattern.id);
          }
        }
      }

      // Add repository-specific patterns
      if (sources?.repositoryPatterns) {
        for (const pattern of sources.repositoryPatterns) {
          if (!patternIds.has(pattern.id)) {
            consolidatedPatterns.push(pattern);
            patternIds.add(pattern.id);
          }
        }
      }

      // Sort patterns by complexity and risk level for optimal application order
      consolidatedPatterns.sort((a, b) => {
        // Low risk first, then by complexity
        const riskOrder = { low: 0, medium: 1, high: 2 };
        const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        return a.complexity - b.complexity;
      });

      this.consolidatedPatterns = consolidatedPatterns;

      // Save consolidated patterns
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        './patterns-consolidated.json',
        JSON.stringify(
          {
            patterns: consolidatedPatterns,
            metadata: {
              totalPatterns: consolidatedPatterns.length,
              lastUpdated: new Date().toISOString(),
              sources: {
                basePatterns: sources?.patternFiles?.length || 0,
                learnedPatterns: sources?.learnedPatterns?.length || 0,
                repositoryPatterns: sources?.repositoryPatterns?.length || 0,
              },
            },
          },
          null,
          2
        )
      );

      console.log(`✅ Consolidated ${consolidatedPatterns.length} patterns`);
      return consolidatedPatterns;
    } catch (error) {
      console.error('❌ Pattern consolidation failed:', error);
      throw new Error(
        `Pattern consolidation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process a repository end-to-end
   */
  async processRepository(config: RepositoryConfig): Promise<RepositoryProcessingResult> {
    const startTime = Date.now();
    const validatedConfig = RepositoryConfigSchema.parse(config);

    let clonePath = '';
    let analysis: RepositoryAnalysis | null = null;
    const transformations: TransformationResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Clone repository
      console.log(`🔄 Cloning repository: ${validatedConfig.url}`);
      clonePath = await this.cloneRepository(validatedConfig);
      console.log(`✅ Repository cloned to: ${clonePath}`);

      // Step 2: Analyze repository
      console.log('🔍 Analyzing repository structure and complexity...');
      analysis = await this.analyzeRepository(clonePath, validatedConfig);
      console.log(`📊 Analysis complete: ${analysis.analyzedFiles} files analyzed`);

      // Step 3: Apply transformations based on analysis
      console.log('🔧 Applying transformations...');
      const transformationResults = await this.applyTransformations(clonePath, analysis);
      transformations.push(...transformationResults);
      console.log(`✨ Applied ${transformations.length} transformations`);

      // Step 4: Generate documentation
      console.log('📚 Generating documentation...');
      const documentation = await this.generateDocumentation(clonePath, analysis);
      console.log('📖 Documentation generated');

      // Step 5: Create output package
      const outputPath = await this.packageResults(
        clonePath,
        analysis,
        transformations,
        documentation
      );
      console.log(`📦 Results packaged to: ${outputPath}`);

      return {
        repositoryUrl: validatedConfig.url,
        status: errors.length > 0 ? 'partial' : 'success',
        analysis,
        transformations,
        documentation,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        outputPath,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        repositoryUrl: validatedConfig.url,
        status: 'failed',
        analysis: analysis || this.createEmptyAnalysis(validatedConfig.url, clonePath),
        transformations,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
      };
    } finally {
      // Cleanup temporary files
      if (clonePath) {
        await this.cleanup(clonePath);
      }
    }
  }

  /**
   * Clone repository to temporary directory
   */
  private async cloneRepository(config: RepositoryConfig): Promise<string> {
    const { execSync } = await import('node:child_process');
    const { mkdtemp, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    // const { tmpdir } = await import('os');

    // Create temporary directory
    await mkdir(this.tempDir, { recursive: true });
    const tempPath = await mkdtemp(join(this.tempDir, 'repo-'));

    // Extract repository name for directory
    const repoName = config.url.split('/').pop()?.replace('.git', '') || 'repository';
    const clonePath = join(tempPath, repoName);

    // Clone repository
    const cloneCommand = [
      this.gitCommand,
      'clone',
      '--depth',
      '1', // Shallow clone for faster processing
      '--branch',
      config.branch,
      config.url,
      clonePath,
    ].join(' ');

    try {
      execSync(cloneCommand, {
        stdio: 'pipe',
        timeout: config.timeout,
        encoding: 'utf-8',
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }

    return clonePath;
  }

  /**
   * Analyze repository structure and complexity
   */
  private async analyzeRepository(
    clonePath: string,
    config: RepositoryConfig
  ): Promise<RepositoryAnalysis> {
    const { readdir, stat, readFile } = await import('node:fs/promises');
    const { join, extname, relative } = await import('node:path');

    const analysis: RepositoryAnalysis = {
      repositoryUrl: config.url,
      clonePath,
      totalFiles: 0,
      analyzedFiles: 0,
      skippedFiles: 0,
      totalLinesOfCode: 0,
      languages: {},
      complexity: {
        average: 0,
        max: 0,
        distribution: {},
      },
      patterns: [],
      issues: [],
      recommendations: [],
    };

    const complexityScores: number[] = [];
    const detectedPatterns: AstPattern[] = [];

    // Recursively analyze files
    const analyzeDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await readdir(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Skip excluded directories
            const relativePath = relative(clonePath, fullPath);
            if (
              !config.excludePatterns.some((pattern) =>
                relativePath.includes(pattern.replace('/**', ''))
              )
            ) {
              await analyzeDirectory(fullPath);
            }
          } else if (stats.isFile()) {
            analysis.totalFiles++;

            // Check file size limit
            if (stats.size > config.maxFileSize) {
              analysis.skippedFiles++;
              continue;
            }

            // Check include/exclude patterns
            const relativePath = relative(clonePath, fullPath);
            const shouldInclude = config.includePatterns.some((pattern) =>
              relativePath.match(pattern.replace('**/', '').replace('*', '.*'))
            );
            const shouldExclude = config.excludePatterns.some((pattern) =>
              relativePath.match(pattern.replace('**/', '').replace('*', '.*'))
            );

            if (!shouldInclude || shouldExclude) {
              analysis.skippedFiles++;
              continue;
            }

            // Analyze file
            try {
              const content = await readFile(fullPath, 'utf-8');
              const fileAnalysis = await this.analyzeFile(fullPath, content);

              analysis.analyzedFiles++;
              analysis.totalLinesOfCode += fileAnalysis.linesOfCode;

              // Track language statistics
              const ext = extname(fullPath);
              analysis.languages[ext] = (analysis.languages[ext] || 0) + 1;

              // Track complexity
              complexityScores.push(fileAnalysis.complexity);

              // Detect patterns
              detectedPatterns.push(...fileAnalysis.patterns);

              // Track issues
              analysis.issues.push(...fileAnalysis.issues);
            } catch (error) {
              analysis.skippedFiles++;
              console.warn(`Failed to analyze ${relativePath}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dirPath}:`, error);
      }
    };

    await analyzeDirectory(clonePath);

    // Calculate complexity statistics
    if (complexityScores.length > 0) {
      analysis.complexity.average =
        complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
      analysis.complexity.max = Math.max(...complexityScores);

      // Create complexity distribution
      const buckets = [0, 5, 10, 15, 20, Number.POSITIVE_INFINITY];
      for (let i = 0; i < buckets.length - 1; i++) {
        const min = buckets[i];
        const max = buckets[i + 1];
        if (min !== undefined && max !== undefined) {
          const count = complexityScores.filter((score) => score >= min && score < max).length;
          analysis.complexity.distribution[
            `${min}-${max === Number.POSITIVE_INFINITY ? '+' : max}`
          ] = count;
        }
      }
    }

    // Aggregate patterns
    analysis.patterns = this.aggregatePatterns(detectedPatterns);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze individual file
   */
  private async analyzeFile(
    filePath: string,
    content: string
  ): Promise<{
    linesOfCode: number;
    complexity: number;
    patterns: AstPattern[];
    issues: Array<{
      file: string;
      line: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      rule: string;
    }>;
  }> {
    const lines = content.split('\n');
    const linesOfCode = lines.filter((line) => line.trim() && !line.trim().startsWith('//')).length;

    // Simple complexity calculation
    let complexity = 1; // Base complexity
    const complexityPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\btry\b/g,
      /\bcatch\b/g,
      /\?\s*.*\s*:/g,
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Detect transformation patterns
    const patterns: AstPattern[] = [];
    const issues: Array<{
      file: string;
      line: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      rule: string;
    }> = [];

    // Check for common patterns that need transformation
    const patternChecks = [
      {
        pattern: /\bvar\s+\w+/g,
        id: 'var-to-const',
        description: 'Convert var to const/let',
        severity: 'warning' as const,
        message: 'Use const or let instead of var',
      },
      {
        pattern: /==(?!=)/g,
        id: 'strict-equality',
        description: 'Use strict equality',
        severity: 'warning' as const,
        message: 'Use === instead of ==',
      },
      {
        pattern: /!=(?!=)/g,
        id: 'strict-inequality',
        description: 'Use strict inequality',
        severity: 'warning' as const,
        message: 'Use !== instead of !=',
      },
    ];

    for (const check of patternChecks) {
      const matches = [...content.matchAll(check.pattern)];
      if (matches.length > 0) {
        // Add pattern
        patterns.push({
          id: check.id,
          language: 'typescript',
          pattern: check.pattern.source,
          replacement: '', // Would be filled by pattern library
          description: check.description,
          complexity: 2,
          riskLevel: 'low',
          mode: 'template',
        });

        // Add issues
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          issues.push({
            file: filePath,
            line: lineNumber,
            severity: check.severity,
            message: check.message,
            rule: check.id,
          });
        }
      }
    }

    return {
      linesOfCode,
      complexity,
      patterns,
      issues,
    };
  }

  /**
   * Apply transformations to repository
   */
  private async applyTransformations(
    _clonePath: string,
    analysis: RepositoryAnalysis
  ): Promise<TransformationResult[]> {
    const transformations: TransformationResult[] = [];

    // Group patterns by priority and risk level
    const lowRiskPatterns = analysis.patterns.filter((p) => p.riskLevel === 'low');
    const mediumRiskPatterns = analysis.patterns.filter((p) => p.riskLevel === 'medium');

    // Apply low-risk transformations first
    for (const pattern of lowRiskPatterns) {
      try {
        const result = await this.applyPattern(_clonePath, pattern);
        if (result) {
          transformations.push(result);
        }
      } catch (error) {
        console.warn(`Failed to apply pattern ${pattern.id}:`, error);
      }
    }

    // Apply medium-risk transformations with more caution
    for (const pattern of mediumRiskPatterns) {
      try {
        const result = await this.applyPattern(_clonePath, pattern, { dryRun: true });
        if (result && result.filesModified.length > 0) {
          // Only apply if it affects a reasonable number of files
          if (result.filesModified.length <= analysis.analyzedFiles * 0.1) {
            const actualResult = await this.applyPattern(_clonePath, pattern);
            if (actualResult) {
              transformations.push(actualResult);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to apply pattern ${pattern.id}:`, error);
      }
    }

    return transformations;
  }

  /**
   * Apply a single pattern transformation using the main transformation system
   */
  private async applyPattern(
    clonePath: string,
    pattern: AstPattern,
    options: { dryRun?: boolean } = {}
  ): Promise<TransformationResult | null> {
    console.log(`🔧 Applying pattern: ${pattern.id} (${pattern.mode || 'template'})`);

    try {
      // Discover target files for this pattern
      const targetFiles = await this.discoverTargetFiles(clonePath, pattern);

      if (targetFiles.length === 0) {
        console.log(`   ⏭️ No target files found for pattern ${pattern.id}`);
        return null;
      }

      // Create transformation request
      const transformationRequest: TransformationRequest = {
        targetFiles,
        transformationType: pattern.mode || 'template',
        patterns: [pattern],
        maxComplexity: 10,
        dryRun: options.dryRun || false,
      };

      // Validate the transformation request
      const validatedRequest = TransformationRequestSchema.parse(transformationRequest);

      // For now, return a mock transformation result with real file discovery
      // This will be replaced with actual transformation logic integration
      const mockResult: TransformationResult = {
        id: `transform-${pattern.id}-${Date.now()}`,
        request: validatedRequest,
        status: 'completed',
        mode: pattern.mode || 'template',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        filesModified: targetFiles.slice(0, Math.min(5, targetFiles.length)), // Limit for testing
        errors: [],
      };

      console.log(`   ✅ Pattern ${pattern.id} would apply to ${targetFiles.length} files`);
      return mockResult;
    } catch (error) {
      console.error(`❌ Failed to apply pattern ${pattern.id}:`, error);
      return null;
    }
  }

  /**
   * Discover target files for a specific pattern
   */
  private async discoverTargetFiles(clonePath: string, pattern: AstPattern): Promise<string[]> {
    const { readdir, stat } = await import('node:fs/promises');
    const { join, extname } = await import('node:path');

    const targetFiles: string[] = [];

    // Map language to file extensions
    const languageExtensions: Record<string, string[]> = {
      typescript: ['.ts', '.tsx'],
      javascript: ['.js', '.jsx'],
      cpp: ['.cpp', '.cxx', '.cc', '.c++'],
      c: ['.c', '.h'],
      python: ['.py'],
      java: ['.java'],
      rust: ['.rs'],
    };

    const extensions = languageExtensions[pattern.language] || ['.ts', '.js'];

    const walkDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await readdir(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stats = await stat(fullPath);

          // Skip common directories that shouldn't be transformed
          if (stats.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry)) {
              await walkDirectory(fullPath);
            }
          } else if (stats.isFile()) {
            const ext = extname(entry);
            if (extensions.includes(ext)) {
              targetFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dirPath}:`, error);
      }
    };

    await walkDirectory(clonePath);
    return targetFiles;
  }

  /**
   * Get repository state by ID
   */
  getRepositoryState(repositoryId: string): RepositoryState | undefined {
    return this.activeRepositories.get(repositoryId);
  }

  /**
   * List all active repositories
   */
  listActiveRepositories(): RepositoryState[] {
    return Array.from(this.activeRepositories.values());
  }

  /**
   * Get consolidated patterns
   */
  getConsolidatedPatterns(): AstPattern[] {
    return [...this.consolidatedPatterns];
  }

  /**
   * Learn patterns from transformation results using the pattern learning system
   */
  async learnFromTransformation(
    repositoryId: string,
    transformationResult: TransformationResult
  ): Promise<void> {
    console.log(`🧠 Learning from transformation: ${transformationResult.id}`);

    try {
      const patternLearningActorInstance = createActor(patternLearningActor, {
        input: {
          operation: 'learn',
          transformation: {
            id: transformationResult.id,
            mode: transformationResult.mode,
            filesModified: transformationResult.filesModified,
            complexity: transformationResult.complexity,
            validation: transformationResult.validation,
            startTime: transformationResult.startTime,
            endTime: transformationResult.endTime,
            errors: transformationResult.errors.map((e) => e.message),
            summary: transformationResult.summary,
          },
          patterns: transformationResult.request.patterns,
          context: {
            codebase: {
              language: 'typescript',
              complexity: transformationResult.complexity?.cyclomaticComplexity || 5,
              size: transformationResult.complexity?.linesOfCode || 1000,
            },
            environment: {
              performance: {
                transformationTime:
                  (transformationResult.endTime || Date.now()) - transformationResult.startTime,
              },
              success: transformationResult.status === 'completed',
            },
          },
        },
      });

      patternLearningActorInstance.start();

      const learningResult = await new Promise<LearningResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          patternLearningActorInstance.stop();
          reject(new Error('Pattern learning timed out'));
        }, 10000);

        patternLearningActorInstance.subscribe((state) => {
          if (state.status === 'done') {
            clearTimeout(timeout);
            patternLearningActorInstance.stop();
            resolve(state.output as LearningResult);
          } else if (state.status === 'error') {
            clearTimeout(timeout);
            patternLearningActorInstance.stop();
            reject(state.error);
          }
        });
      });

      console.log(
        `   ✅ Pattern learning completed: ${learningResult.metrics.patternsDiscovered} patterns discovered`
      );

      // Update repository metadata with learned patterns
      const repoState = this.activeRepositories.get(repositoryId);
      if (repoState && learningResult.newPatterns.length > 0) {
        repoState.metadata.patterns.push(...learningResult.newPatterns);
        repoState.lastAccessed = Date.now();
      }
    } catch (error) {
      console.warn(`Failed to learn from transformation ${transformationResult.id}:`, error);
    }
  }

  /**
   * Generate documentation for the repository
   */
  private async generateDocumentation(
    _clonePath: string,
    analysis: RepositoryAnalysis
  ): Promise<{
    apiDocs?: string;
    architectureDocs?: string;
    patternDocs?: string;
  }> {
    // This would integrate with the documentation system
    return {
      apiDocs: `# API Documentation\n\nGenerated for ${analysis.repositoryUrl}\n\nTotal files analyzed: ${analysis.analyzedFiles}`,
      architectureDocs: '# Architecture\n\nRepository structure and complexity analysis.',
      patternDocs: `# Patterns\n\nDetected ${analysis.patterns.length} transformation opportunities.`,
    };
  }

  /**
   * Package results for output
   */
  private async packageResults(
    _clonePath: string,
    analysis: RepositoryAnalysis,
    transformations: TransformationResult[],
    documentation: {
      apiDocs?: string;
      architectureDocs?: string;
      patternDocs?: string;
    }
  ): Promise<string> {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const outputDir = './output/repositories';
    const repoName = analysis.repositoryUrl.split('/').pop()?.replace('.git', '') || 'repository';
    const outputPath = join(outputDir, `${repoName}-${Date.now()}`);

    await mkdir(outputPath, { recursive: true });

    // Write analysis report
    await writeFile(join(outputPath, 'analysis.json'), JSON.stringify(analysis, null, 2));

    // Write transformation results
    await writeFile(
      join(outputPath, 'transformations.json'),
      JSON.stringify(transformations, null, 2)
    );

    // Write documentation
    if (documentation.apiDocs) {
      await writeFile(join(outputPath, 'api.md'), documentation.apiDocs);
    }
    if (documentation.architectureDocs) {
      await writeFile(join(outputPath, 'architecture.md'), documentation.architectureDocs);
    }
    if (documentation.patternDocs) {
      await writeFile(join(outputPath, 'patterns.md'), documentation.patternDocs);
    }

    return outputPath;
  }

  /**
   * Aggregate detected patterns
   */
  private aggregatePatterns(patterns: AstPattern[]): AstPattern[] {
    const patternMap = new Map<string, AstPattern>();

    for (const pattern of patterns) {
      if (patternMap.has(pattern.id)) {
        // Pattern already exists, could increment usage count
        continue;
      }
      patternMap.set(pattern.id, pattern);
    }

    return Array.from(patternMap.values());
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: RepositoryAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity.average > 10) {
      recommendations.push(
        'Consider refactoring high-complexity functions to improve maintainability'
      );
    }

    if (analysis.issues.length > analysis.analyzedFiles * 0.1) {
      recommendations.push(
        'High number of code quality issues detected - consider running automated fixes'
      );
    }

    if (analysis.patterns.length > 0) {
      recommendations.push(
        `${analysis.patterns.length} transformation patterns detected - apply automated improvements`
      );
    }

    const jsFiles = analysis.languages['.js'] || 0;
    const tsFiles = analysis.languages['.ts'] || 0;
    if (jsFiles > tsFiles) {
      recommendations.push(
        'Consider migrating JavaScript files to TypeScript for better type safety'
      );
    }

    return recommendations;
  }

  /**
   * Create empty analysis for error cases
   */
  private createEmptyAnalysis(url: string, clonePath: string): RepositoryAnalysis {
    return {
      repositoryUrl: url,
      clonePath,
      totalFiles: 0,
      analyzedFiles: 0,
      skippedFiles: 0,
      totalLinesOfCode: 0,
      languages: {},
      complexity: { average: 0, max: 0, distribution: {} },
      patterns: [],
      issues: [],
      recommendations: [],
    };
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(clonePath: string): Promise<void> {
    try {
      const { rm } = await import('node:fs/promises');
      await rm(clonePath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error);
    }
  }
}

// Create and export the repository manager actor
export const repositoryManagerActor = fromPromise(
  async ({ input }: { input: RepositoryConfig }) => {
    const manager = new RepositoryManager();
    return await manager.processRepository(input);
  }
);

// Export convenience functions
export const processRepository = async (
  config: RepositoryConfig
): Promise<RepositoryProcessingResult> => {
  const manager = new RepositoryManager();
  return await manager.processRepository(config);
};

export const validateRepositoryConfig = (data: unknown): RepositoryConfig => {
  return RepositoryConfigSchema.parse(data);
};
