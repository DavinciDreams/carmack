import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  TransformationResult,
  AstPattern,
} from './types.js';

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
  issues: z.array(z.object({
    file: z.string(),
    line: z.number(),
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    rule: z.string(),
  })),
  recommendations: z.array(z.string()),
});

export const RepositoryProcessingResultSchema = z.object({
  repositoryUrl: z.string(),
  status: z.enum(['success', 'partial', 'failed']),
  analysis: RepositoryAnalysisSchema,
  transformations: z.array(z.any()), // TransformationResult array
  documentation: z.object({
    apiDocs: z.string().optional(),
    architectureDocs: z.string().optional(),
    patternDocs: z.string().optional(),
  }).optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  processingTime: z.number(),
  outputPath: z.string().optional(),
});

// Type exports
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type RepositoryAnalysis = z.infer<typeof RepositoryAnalysisSchema>;
export type RepositoryProcessingResult = z.infer<typeof RepositoryProcessingResultSchema>;

/**
 * Repository Manager
 * 
 * Handles cloning, analyzing, and processing external repositories
 * with comprehensive transformation and documentation capabilities.
 */
export class RepositoryManager {
  private tempDir: string;
  private gitCommand: string;

  constructor() {
    this.tempDir = './temp/repositories';
    this.gitCommand = 'git';
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
      const outputPath = await this.packageResults(clonePath, analysis, transformations, documentation);
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
    const { execSync } = await import('child_process');
    const { mkdtemp, mkdir } = await import('fs/promises');
    const { join } = await import('path');
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
      '--depth', '1', // Shallow clone for faster processing
      '--branch', config.branch,
      config.url,
      clonePath
    ].join(' ');

    try {
      execSync(cloneCommand, { 
        stdio: 'pipe',
        timeout: config.timeout,
        encoding: 'utf-8'
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }

    return clonePath;
  }

  /**
   * Analyze repository structure and complexity
   */
  private async analyzeRepository(clonePath: string, config: RepositoryConfig): Promise<RepositoryAnalysis> {
    const { readdir, stat, readFile } = await import('fs/promises');
    const { join, extname, relative } = await import('path');
    
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
            if (!config.excludePatterns.some(pattern => 
              relativePath.includes(pattern.replace('/**', ''))
            )) {
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
            const shouldInclude = config.includePatterns.some(pattern =>
              relativePath.match(pattern.replace('**/', '').replace('*', '.*'))
            );
            const shouldExclude = config.excludePatterns.some(pattern =>
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
    }

    await analyzeDirectory(clonePath);

    // Calculate complexity statistics
    if (complexityScores.length > 0) {
      analysis.complexity.average = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
      analysis.complexity.max = Math.max(...complexityScores);
      
      // Create complexity distribution
      const buckets = [0, 5, 10, 15, 20, Infinity];
      for (let i = 0; i < buckets.length - 1; i++) {
        const min = buckets[i];
        const max = buckets[i + 1];
        if (min !== undefined && max !== undefined) {
          const count = complexityScores.filter(score => score >= min && score < max).length;
          analysis.complexity.distribution[`${min}-${max === Infinity ? '+' : max}`] = count;
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
  private async analyzeFile(filePath: string, content: string): Promise<{
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
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    // Simple complexity calculation
    let complexity = 1; // Base complexity
    const complexityPatterns = [
      /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bswitch\b/g, /\bcase\b/g, /\btry\b/g, /\bcatch\b/g,
      /\?\s*.*\s*:/g, /&&/g, /\|\|/g
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
        message: 'Use const or let instead of var'
      },
      {
        pattern: /==(?!=)/g,
        id: 'strict-equality',
        description: 'Use strict equality',
        severity: 'warning' as const,
        message: 'Use === instead of =='
      },
      {
        pattern: /!=(?!=)/g,
        id: 'strict-inequality',
        description: 'Use strict inequality',
        severity: 'warning' as const,
        message: 'Use !== instead of !='
      }
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
    const lowRiskPatterns = analysis.patterns.filter(p => p.riskLevel === 'low');
    const mediumRiskPatterns = analysis.patterns.filter(p => p.riskLevel === 'medium');
    
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
   * Apply a single pattern transformation
   */
  private async applyPattern(
    _clonePath: string,
    pattern: AstPattern,
    options: { dryRun?: boolean } = {}
  ): Promise<TransformationResult | null> {
    // This would integrate with the main transformation system
    // For now, return a mock result
    return {
      id: `transform-${pattern.id}-${Date.now()}`,
      request: {
        targetFiles: [`${_clonePath}/**/*.ts`],
        transformationType: pattern.mode || 'template',
        patterns: [pattern],
        maxComplexity: 10,
        dryRun: options.dryRun || false,
      },
      status: 'completed',
      mode: pattern.mode || 'template',
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      filesModified: [], // Would be populated by actual transformation
      errors: [],
    };
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
      architectureDocs: `# Architecture\n\nRepository structure and complexity analysis.`,
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
    documentation: any
  ): Promise<string> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    
    const outputDir = './output/repositories';
    const repoName = analysis.repositoryUrl.split('/').pop()?.replace('.git', '') || 'repository';
    const outputPath = join(outputDir, `${repoName}-${Date.now()}`);
    
    await mkdir(outputPath, { recursive: true });
    
    // Write analysis report
    await writeFile(
      join(outputPath, 'analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
    
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
      recommendations.push('Consider refactoring high-complexity functions to improve maintainability');
    }
    
    if (analysis.issues.length > analysis.analyzedFiles * 0.1) {
      recommendations.push('High number of code quality issues detected - consider running automated fixes');
    }
    
    if (analysis.patterns.length > 0) {
      recommendations.push(`${analysis.patterns.length} transformation patterns detected - apply automated improvements`);
    }
    
    const jsFiles = analysis.languages['.js'] || 0;
    const tsFiles = analysis.languages['.ts'] || 0;
    if (jsFiles > tsFiles) {
      recommendations.push('Consider migrating JavaScript files to TypeScript for better type safety');
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
      const { rm } = await import('fs/promises');
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
export const processRepository = async (config: RepositoryConfig): Promise<RepositoryProcessingResult> => {
  const manager = new RepositoryManager();
  return await manager.processRepository(config);
};

export const validateRepositoryConfig = (data: unknown): RepositoryConfig => {
  return RepositoryConfigSchema.parse(data);
};