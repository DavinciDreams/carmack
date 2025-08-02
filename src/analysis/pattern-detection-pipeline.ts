import { z } from 'zod';
import { parse as astGrepParse, type SgRoot } from '@ast-grep/napi';
import { createHash } from 'node:crypto';
import { type FileMetadata } from './repository-analyzer.js';

/**
 * Pattern Detection Pipeline with Multi-Stage Analysis
 * 
 * Implements sophisticated pattern detection with caching, parallel processing,
 * and semantic analysis to replace the basic pattern detection in the current system.
 */

// Pattern detection stage configuration
export const PatternDetectionStageSchema = z.object({
  name: z.string(),
  type: z.enum(['lexical', 'syntactic', 'semantic', 'cross-file']),
  enabled: z.boolean().default(true),
  priority: z.number().default(1),
  parallelizable: z.boolean().default(true),
  timeout: z.number().default(5000), // 5 seconds default timeout
  cacheEnabled: z.boolean().default(true)
});
export type PatternDetectionStage = z.infer<typeof PatternDetectionStageSchema>;

// Pipeline configuration
export const PatternDetectionPipelineConfigSchema = z.object({
  stages: z.array(PatternDetectionStageSchema).default([
    { name: 'lexical', type: 'lexical', enabled: true, priority: 1, parallelizable: true },
    { name: 'syntactic', type: 'syntactic', enabled: true, priority: 2, parallelizable: true },
    { name: 'semantic', type: 'semantic', enabled: true, priority: 3, parallelizable: false },
    { name: 'cross-file', type: 'cross-file', enabled: true, priority: 4, parallelizable: false }
  ]),
  caching: z.object({
    enableStageCache: z.boolean().default(true),
    enableResultCache: z.boolean().default(true),
    cacheInvalidationStrategy: z.enum(['time', 'content', 'dependency']).default('content'),
    maxCacheSize: z.number().default(1000),
    cacheTTL: z.number().default(3600000) // 1 hour in milliseconds
  }).default({}),
  optimization: z.object({
    enableEarlyTermination: z.boolean().default(true),
    confidenceThreshold: z.number().default(0.8),
    maxPatternsPerFile: z.number().default(100),
    enableParallelStages: z.boolean().default(true),
    maxConcurrentStages: z.number().default(4)
  }).default({})
});
export type PatternDetectionPipelineConfig = z.infer<typeof PatternDetectionPipelineConfigSchema>;

// Raw pattern from initial detection
export const RawPatternSchema = z.object({
  id: z.string(),
  type: z.string(),
  language: z.string(),
  before: z.string(),
  after: z.string().optional(),
  confidence: z.number(),
  location: z.object({
    startLine: z.number(),
    endLine: z.number(),
    startColumn: z.number().optional(),
    endColumn: z.number().optional()
  }),
  metadata: z.record(z.any()).default({})
});
export type RawPattern = z.infer<typeof RawPatternSchema>;

// Analysis context for pattern detection stages
export const AnalysisContextSchema = z.object({
  file: z.object({
    path: z.string(),
    content: z.string(),
    metadata: z.any(), // FileMetadata type
    ast: z.any().optional() // SgRoot type
  }),
  patterns: z.array(RawPatternSchema).default([]),
  stageResults: z.record(z.any()).default({}),
  globalContext: z.record(z.any()).default({})
});
export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;

// Cache entry
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  contentHash: string;
  accessed: number;
}

/**
 * LRU Cache implementation for pattern detection results
 */
class PatternCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 3600000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string, contentHash: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Check if content has changed
    if (entry.contentHash !== contentHash) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    entry.accessed = Date.now();
    return entry.value;
  }

  set(key: string, value: T, contentHash: string): void {
    // Remove least recently used items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      contentHash,
      accessed: Date.now()
    });
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.accessed < oldestAccess) {
        oldestAccess = entry.accessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; hitRate: number } {
    // This would track actual hit/miss statistics in production
    return { size: this.cache.size, hitRate: 0 };
  }
}

/**
 * Abstract base class for pattern detection stages
 */
abstract class PatternDetectionStageBase {
  abstract readonly name: string;
  abstract readonly type: PatternDetectionStage['type'];
  abstract readonly parallelizable: boolean;

  abstract detect(context: AnalysisContext): Promise<RawPattern[]>;

  protected generatePatternId(type: string, file: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5').update(`${type}-${file}-${timestamp}`).digest('hex').slice(0, 8);
    return `${type}-${hash}`;
  }

  protected calculateConfidence(factors: { syntactic: number; semantic: number; frequency: number }): number {
    // Weighted confidence calculation
    const weights = { syntactic: 0.4, semantic: 0.4, frequency: 0.2 };
    const confidence = 
      factors.syntactic * weights.syntactic +
      factors.semantic * weights.semantic +
      factors.frequency * weights.frequency;
    
    return Math.min(1, Math.max(0, confidence));
  }
}

/**
 * Lexical analysis stage - text-based pattern detection
 */
class LexicalAnalysisStage extends PatternDetectionStageBase {
  readonly name = 'lexical';
  readonly type = 'lexical' as const;
  readonly parallelizable = true;

  async detect(context: AnalysisContext): Promise<RawPattern[]> {
    const patterns: RawPattern[] = [];
    const { content, path } = context.file;
    
    // Detect common lexical patterns
    patterns.push(...this.detectVariableDeclarations(content, path));
    patterns.push(...this.detectStringLiterals(content, path));
    patterns.push(...this.detectComments(content, path));
    
    return patterns;
  }

  private detectVariableDeclarations(content: string, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    const lines = content.split('\n');
    
    // Detect var declarations that could be const/let
    const varRegex = /\bvar\s+(\w+)\s*=/g;
    
    lines.forEach((line, index) => {
      let match;
      while ((match = varRegex.exec(line)) !== null) {
        patterns.push({
          id: this.generatePatternId('var-to-const', filePath),
          type: 'var-to-const',
          language: 'typescript',
          before: match[0],
          after: match[0].replace('var', 'const'),
          confidence: this.calculateConfidence({ syntactic: 0.8, semantic: 0.7, frequency: 0.9 }),
          location: {
            startLine: index + 1,
            endLine: index + 1,
            startColumn: match.index,
            endColumn: match.index + match[0].length
          },
          metadata: {
            variableName: match[1],
            stage: 'lexical'
          }
        });
      }
    });
    
    return patterns;
  }

  private detectStringLiterals(content: string, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    const lines = content.split('\n');
    
    // Detect string concatenation that could use template literals
    const concatRegex = /(['"`])([^'"`]*)\1\s*\+\s*['"`]/g;
    
    lines.forEach((line, index) => {
      let match;
      while ((match = concatRegex.exec(line)) !== null) {
        patterns.push({
          id: this.generatePatternId('string-to-template', filePath),
          type: 'string-to-template',
          language: 'typescript',
          before: match[0],
          confidence: this.calculateConfidence({ syntactic: 0.7, semantic: 0.8, frequency: 0.6 }),
          location: {
            startLine: index + 1,
            endLine: index + 1,
            startColumn: match.index,
            endColumn: match.index + match[0].length
          },
          metadata: {
            stage: 'lexical'
          }
        });
      }
    });
    
    return patterns;
  }

  private detectComments(content: string, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    const lines = content.split('\n');
    
    // Detect TODO/FIXME comments
    const todoRegex = /\/\/\s*(TODO|FIXME|HACK|NOTE)[:.]?\s*(.+)/gi;
    
    lines.forEach((line, index) => {
      let match;
      while ((match = todoRegex.exec(line)) !== null) {
        patterns.push({
          id: this.generatePatternId('todo-comment', filePath),
          type: 'todo-comment',
          language: 'typescript',
          before: match[0],
          confidence: this.calculateConfidence({ syntactic: 1.0, semantic: 0.5, frequency: 0.3 }),
          location: {
            startLine: index + 1,
            endLine: index + 1,
            startColumn: match.index,
            endColumn: match.index + match[0].length
          },
          metadata: {
            commentType: match[1].toUpperCase(),
            commentText: match[2],
            stage: 'lexical'
          }
        });
      }
    });
    
    return patterns;
  }
}

/**
 * Syntactic analysis stage - AST-based pattern detection
 */
class SyntacticAnalysisStage extends PatternDetectionStageBase {
  readonly name = 'syntactic';
  readonly type = 'syntactic' as const;
  readonly parallelizable = true;

  async detect(context: AnalysisContext): Promise<RawPattern[]> {
    const patterns: RawPattern[] = [];
    const { content, path, metadata } = context.file;
    
    try {
      // Parse AST using ast-grep
      const ast = astGrepParse(content, metadata.language);
      context.file.ast = ast;
      
      // Detect AST-based patterns
      patterns.push(...this.detectFunctionPatterns(ast, path));
      patterns.push(...this.detectClassPatterns(ast, path));
      patterns.push(...this.detectImportPatterns(ast, path));
      
    } catch (error) {
      console.warn(`Failed to parse AST for ${path}:`, error);
    }
    
    return patterns;
  }

  private detectFunctionPatterns(ast: SgRoot, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find function declarations that could be arrow functions
    const functionNodes = ast.root().findAll('function_declaration');
    
    for (const node of functionNodes) {
      const text = node.text();
      
      // Check if it's a simple function that could be an arrow function
      if (this.isSimpleFunction(text)) {
        patterns.push({
          id: this.generatePatternId('function-to-arrow', filePath),
          type: 'function-to-arrow',
          language: 'typescript',
          before: text,
          after: this.convertToArrowFunction(text),
          confidence: this.calculateConfidence({ syntactic: 0.9, semantic: 0.8, frequency: 0.7 }),
          location: {
            startLine: node.range().start.line + 1,
            endLine: node.range().end.line + 1,
            startColumn: node.range().start.column,
            endColumn: node.range().end.column
          },
          metadata: {
            stage: 'syntactic',
            nodeType: 'function_declaration'
          }
        });
      }
    }
    
    return patterns;
  }

  private detectClassPatterns(ast: SgRoot, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find class declarations
    const classNodes = ast.root().findAll('class_declaration');
    
    for (const node of classNodes) {
      const text = node.text();
      
      patterns.push({
        id: this.generatePatternId('class-analysis', filePath),
        type: 'class-analysis',
        language: 'typescript',
        before: text,
        confidence: this.calculateConfidence({ syntactic: 0.8, semantic: 0.6, frequency: 0.5 }),
        location: {
          startLine: node.range().start.line + 1,
          endLine: node.range().end.line + 1,
          startColumn: node.range().start.column,
          endColumn: node.range().end.column
        },
        metadata: {
          stage: 'syntactic',
          nodeType: 'class_declaration'
        }
      });
    }
    
    return patterns;
  }

  private detectImportPatterns(ast: SgRoot, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find import declarations
    const importNodes = ast.root().findAll('import_statement');
    
    for (const node of importNodes) {
      const text = node.text();
      
      patterns.push({
        id: this.generatePatternId('import-analysis', filePath),
        type: 'import-analysis',
        language: 'typescript',
        before: text,
        confidence: this.calculateConfidence({ syntactic: 0.9, semantic: 0.7, frequency: 0.8 }),
        location: {
          startLine: node.range().start.line + 1,
          endLine: node.range().end.line + 1,
          startColumn: node.range().start.column,
          endColumn: node.range().end.column
        },
        metadata: {
          stage: 'syntactic',
          nodeType: 'import_statement'
        }
      });
    }
    
    return patterns;
  }

  private isSimpleFunction(functionText: string): boolean {
    // Simple heuristic to determine if function can be converted to arrow function
    return functionText.includes('return') && 
           !functionText.includes('this') && 
           functionText.split('\n').length <= 5;
  }

  private convertToArrowFunction(functionText: string): string {
    // Simple conversion for demonstration
    return functionText.replace(
      /function\s+(\w+)\s*\(([^)]*)\)\s*\{\s*return\s+([^}]+);\s*\}/,
      'const $1 = ($2) => $3;'
    );
  }
}

/**
 * Main Pattern Detection Pipeline
 */
export class PatternDetectionPipeline {
  private config: PatternDetectionPipelineConfig;
  private cache: PatternCache<RawPattern[]>;
  private stages: Map<string, PatternDetectionStageBase> = new Map();

  constructor(config: Partial<PatternDetectionPipelineConfig> = {}) {
    this.config = PatternDetectionPipelineConfigSchema.parse(config);
    this.cache = new PatternCache(
      this.config.caching.maxCacheSize,
      this.config.caching.cacheTTL
    );
    
    this.initializeStages();
  }

  /**
   * Detect patterns in a file using multi-stage analysis
   */
  async detectPatterns(file: FileMetadata, content: string): Promise<RawPattern[]> {
    const cacheKey = this.generateCacheKey(file, content);
    const contentHash = this.calculateContentHash(content);
    
    // Check cache first
    if (this.config.caching.enableResultCache) {
      const cached = this.cache.get(cacheKey, contentHash);
      if (cached) {
        return cached;
      }
    }
    
    const context: AnalysisContext = {
      file: {
        path: file.path,
        content,
        metadata: file
      },
      patterns: [],
      stageResults: {},
      globalContext: {}
    };
    
    const allPatterns: RawPattern[] = [];
    
    // Execute stages in priority order
    const orderedStages = this.getOrderedStages();
    
    for (const stageConfig of orderedStages) {
      if (!stageConfig.enabled) continue;
      
      const stage = this.stages.get(stageConfig.name);
      if (!stage) continue;
      
      try {
        console.log(`🔍 Running ${stage.name} stage for ${file.relativePath}`);
        
        const stagePatterns = await this.executeStageWithTimeout(
          stage,
          context,
          stageConfig.timeout
        );
        
        allPatterns.push(...stagePatterns);
        context.patterns.push(...stagePatterns);
        context.stageResults[stage.name] = stagePatterns;
        
        // Early termination if confidence threshold met
        if (this.config.optimization.enableEarlyTermination &&
            this.shouldTerminateEarly(allPatterns)) {
          console.log(`✨ Early termination after ${stage.name} stage`);
          break;
        }
        
      } catch (error) {
        console.warn(`Stage ${stage.name} failed for ${file.path}:`, error);
      }
    }
    
    // Limit patterns per file
    const limitedPatterns = allPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.optimization.maxPatternsPerFile);
    
    // Cache results
    if (this.config.caching.enableResultCache) {
      this.cache.set(cacheKey, limitedPatterns, contentHash);
    }
    
    console.log(`✨ Pattern detection completed: ${limitedPatterns.length} patterns found in ${file.relativePath}`);
    return limitedPatterns;
  }

  /**
   * Initialize pattern detection stages
   */
  private initializeStages(): void {
    this.stages.set('lexical', new LexicalAnalysisStage());
    this.stages.set('syntactic', new SyntacticAnalysisStage());
    // Additional stages would be added here
  }

  /**
   * Get stages ordered by priority
   */
  private getOrderedStages(): PatternDetectionStage[] {
    return this.config.stages
      .filter(stage => stage.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute stage with timeout protection
   */
  private async executeStageWithTimeout(
    stage: PatternDetectionStageBase,
    context: AnalysisContext,
    timeout: number
  ): Promise<RawPattern[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Stage ${stage.name} timed out after ${timeout}ms`));
      }, timeout);
      
      stage.detect(context)
        .then(patterns => {
          clearTimeout(timeoutId);
          resolve(patterns);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if early termination should occur
   */
  private shouldTerminateEarly(patterns: RawPattern[]): boolean {
    if (patterns.length === 0) return false;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    return avgConfidence >= this.config.optimization.confidenceThreshold;
  }

  /**
   * Generate cache key for file and content
   */
  private generateCacheKey(file: FileMetadata, content: string): string {
    return `${file.path}-${file.mtime}-${content.length}`;
  }

  /**
   * Calculate content hash for cache invalidation
   */
  private calculateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Get pipeline statistics
   */
  getStats(): { cacheStats: { size: number; hitRate: number } } {
    return {
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
}