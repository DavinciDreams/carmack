import { fromPromise } from 'xstate';
import { z } from 'zod';

import { getDatabaseManager } from '../db/connection.js';
import { MultiLanguageAnalyzer } from '../docs-generator/multi-language-analyzer.ts';
import { ContentProcessor } from './content-processor.ts';
import type {
  CodeEntity,
  KnowledgePattern,
  RepositoryAnalysis,
  LanguageType,
  DomainType,
} from '../docs-generator/types.ts';
import {
  validateCodeEntity,
  validateKnowledgePattern,
  validateRepositoryAnalysis,
} from '../docs-generator/types.ts';

// PostgreSQL connection configuration
export const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  user: z.string(),
  password: z.string(),
  schema: z.string(),
});
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Embedding service configuration
export const EmbeddingConfigSchema = z.object({
  model: z.string(),
  apiKey: z.string().optional(),
  maxTokens: z.number(),
  batchSize: z.number(),
});
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

// Add a minimal DB client interface for type safety
interface PgClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

/**
 * Language-agnostic semantic indexing system
 * Handles code entity extraction, embedding generation, and database storage for any codebase
 */
export class SemanticIndexer {
  // private dbConfig: DatabaseConfig;
  private embeddingConfig: EmbeddingConfig;
  private analyzer: MultiLanguageAnalyzer;
  private dbClient: PgClient | null = null;

  constructor(
    embeddingConfig: EmbeddingConfig = {
      model: 'text-embedding-3-small',
      maxTokens: 8192,
      batchSize: 100,
    }
  ) {
    this.embeddingConfig = EmbeddingConfigSchema.parse(embeddingConfig);
    this.analyzer = new MultiLanguageAnalyzer();
  }
/**
 * Initialize database connection
 */
async initialize(): Promise<void> {
  try {
    this.dbClient = getDatabaseManager() as PgClient;
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Close database connection
 */

  async close(): Promise<void> {
    // Connection is managed centrally, no need to close here
    this.dbClient = null;
  }

  /**
   * Index a complete repository
   */
  async indexRepository(repositoryPath: string, name: string): Promise<RepositoryAnalysis> {
    console.log(`🚀 Starting repository indexing: ${name}`);
    const startTime = Date.now();

    try {
      // Discover all source files
      const sourceFiles = await this.discoverSourceFiles(repositoryPath);
      console.log(`📁 Found ${sourceFiles.length} source files`);

      // Extract entities from all files
      const allEntities: CodeEntity[] = [];
      const languages = new Set<LanguageType>();
      const domains = new Set<DomainType>();

      let processedFiles = 0;
      for (const filePath of sourceFiles) {
        try {
          const entities = await this.analyzer.extractEntities(filePath);
          allEntities.push(...entities);

          // Track languages and domains
          for (const entity of entities) {
            languages.add(entity.language);
            if (entity.domain) {
              domains.add(entity.domain);
            }
          }

          processedFiles++;
          if (processedFiles % 100 === 0) {
            console.log(`📊 Processed ${processedFiles}/${sourceFiles.length} files`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process ${filePath}:`, error);
        }
      }

      console.log(`🔍 Extracted ${allEntities.length} code entities`);

      // Store entities in database
      await this.storeEntities(allEntities);

      // Generate embeddings
      await this.generateEmbeddings(allEntities);

      // Extract knowledge patterns
      const patterns = await this.extractKnowledgePatterns(allEntities);
      await this.storeKnowledgePatterns(patterns);

      // Create repository analysis record
      const analysis = await this.createRepositoryAnalysis({
        repositoryPath,
        name,
        languages: Array.from(languages),
        domains: Array.from(domains),
        totalFiles: sourceFiles.length,
        totalEntities: allEntities.length,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Repository indexing completed in ${duration}ms`);

      return analysis;
    } catch (error) {
      console.error('❌ Repository indexing failed:', error);
      throw error;
    }
  }

  /**
   * Search for similar code entities using semantic similarity
   */
  async searchSimilar(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      languages?: LanguageType[];
      domains?: DomainType[];
      entityTypes?: string[];
    } = {}
  ): Promise<Array<{ entity: CodeEntity; similarity: number }>> {
    const {
      limit = 10,
      threshold = 0.7,
      languages = [],
      domains = [],
      entityTypes = [],
    } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateTextEmbedding(query);

      // Build SQL query with filters
      let sql = `
        SELECT
          *,
          embedding <-> $1::vector AS distance,
          1 - (embedding <-> $1::vector) AS similarity
        FROM artifacts
        WHERE embedding IS NOT NULL
        AND 1 - (embedding <-> $1::vector) >= $2
      `;

      const params: any[] = [JSON.stringify(queryEmbedding), threshold];
      let paramIndex = 3;

      // Add language filter
      if (languages.length > 0) {
        sql += ` AND language = ANY($${paramIndex})`;
        params.push(languages);
        paramIndex++;
      }

      // Add domain filter
      if (domains.length > 0) {
        sql += ` AND COALESCE(metadata->>'domain', 'unknown') = ANY($${paramIndex})`;
        params.push(domains);
        paramIndex++;
      }

      // Add entity type filter
      if (entityTypes.length > 0) {
        sql += ` AND type = ANY($${paramIndex})`;
        params.push(entityTypes);
        paramIndex++;
      }

      sql += ` ORDER BY similarity DESC LIMIT $${paramIndex}`;
      params.push(limit);

      if (!this.dbClient) throw new Error('DB client not initialized');
      const result = await this.dbClient.query(sql, params);
      return result.rows.map((row: unknown) => {
        const entity = this.rowToCodeEntity(row);
        const similarity = z.number().parse((row as any).similarity);
        return { entity, similarity };
      });
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Find knowledge patterns matching a query
   */
  async findPatterns(
    query: string,
    options: {
      limit?: number;
      languages?: LanguageType[];
      domains?: DomainType[];
      minConfidence?: number;
    } = {}
  ): Promise<KnowledgePattern[]> {
    const {
      limit = 20,
      languages = [],
      domains = [],
      minConfidence = 0.5,
    } = options;

    try {
      let sql = `
        SELECT * FROM knowledge_patterns
        WHERE confidence >= $1
        AND (
          name ILIKE $2 
          OR description ILIKE $2
          OR pattern ILIKE $2
        )
      `;

      const params: any[] = [minConfidence, `%${query}%`];
      let paramIndex = 3;

      if (languages.length > 0) {
        sql += ` AND language = ANY($${paramIndex})`;
        params.push(languages);
        paramIndex++;
      }

      if (domains.length > 0) {
        sql += ` AND domain = ANY($${paramIndex})`;
        params.push(domains);
        paramIndex++;
      }

      sql += ` ORDER BY frequency DESC, confidence DESC LIMIT $${paramIndex}`;
      params.push(limit);

      if (!this.dbClient) throw new Error('DB client not initialized');
      const result = await this.dbClient.query(sql, params);
      return result.rows.map((row: unknown) => this.rowToKnowledgePattern(row));
    } catch (error) {
      console.error('❌ Pattern search failed:', error);
      throw error;
    }
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(repositoryId?: string): Promise<unknown> {
    try {
      let sql = `
        SELECT
          COUNT(*) as total_entities,
          COUNT(DISTINCT language) as languages_count,
          COUNT(DISTINCT COALESCE(metadata->>'domain', 'unknown')) as domains_count,
          COUNT(DISTINCT file_path) as files_count,
          language,
          COALESCE(metadata->>'domain', 'unknown') as domain,
          type,
          COUNT(*) as count
        FROM artifacts
        WHERE type IN ('function', 'class', 'module', 'file')
      `;

      const params: any[] = [];
      if (repositoryId) {
        sql += ` AND repository_url = $1`;
        params.push(repositoryId);
      }

      sql += ` GROUP BY ROLLUP(language, COALESCE(metadata->>'domain', 'unknown'), type)`;

      if (!this.dbClient) throw new Error('DB client not initialized');
      const result = await this.dbClient.query(sql, params);
      return this.processStatsResult(result.rows);
    } catch (error) {
      console.error('❌ Failed to get repository stats:', error);
      throw error;
    }
  }

  /**
   * Extract knowledge patterns from code entities.
   * This is a placeholder implementation; replace with actual logic.
   */
  private async extractKnowledgePatterns(entities: CodeEntity[]): Promise<KnowledgePattern[]> {
    // Example: group entities by domain and create a pattern for each domain
    const patterns: KnowledgePattern[] = [];
    const domainMap = new Map<string, CodeEntity[]>();

    for (const entity of entities) {
      if (entity.domain) {
        if (!domainMap.has(entity.domain)) {
          domainMap.set(entity.domain, []);
        }
        domainMap.get(entity.domain)!.push(entity);
      }
    }

    for (const [domain, domainEntities] of domainMap.entries()) {
      patterns.push({
        id: `${domain}-pattern`,
        name: `Pattern for ${domain}`,
        description: `Automatically extracted pattern for domain ${domain}`,
        category: 'domain',
        pattern: `Entities: ${domainEntities.map(e => e.name).join(', ')}`,
        language: domainEntities[0]?.language || 'unknown',
        domain: domain as DomainType,
        confidence: 0.8,
        frequency: domainEntities.length,
        examples: domainEntities.slice(0, 3).map(e => ({
          code: e.sourceCode.substring(0, 200),
          description: `${e.type} in ${e.filePath}`,
          filePath: e.filePath,
        })),
      });
    }

    return patterns;
  }

  // Private helper methods

  private async discoverSourceFiles(repositoryPath: string): Promise<string[]> {
    const { readdir, stat } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const files: string[] = [];

    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (stats.isFile() && /\.(ts|js|cpp|cxx|cc|c\+\+|c|h|hpp|cu|cuh|py)$/.test(entry)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    }

    await scanDirectory(repositoryPath);
    return files;
  }

  private async storeEntities(entities: CodeEntity[]): Promise<void> {
    if (entities.length === 0) return;

    console.log(`💾 Storing ${entities.length} entities in database`);

    const sql = `
      INSERT INTO artifacts (
        id, name, type, language, file_path, start_line, end_line,
        signature, description, parameters, return_type, complexity,
        domain, keywords, source_code, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        language = EXCLUDED.language,
        file_path = EXCLUDED.file_path,
        start_line = EXCLUDED.start_line,
        end_line = EXCLUDED.end_line,
        signature = EXCLUDED.signature,
        description = EXCLUDED.description,
        parameters = EXCLUDED.parameters,
        return_type = EXCLUDED.return_type,
        complexity = EXCLUDED.complexity,
        domain = EXCLUDED.domain,
        keywords = EXCLUDED.keywords,
        source_code = EXCLUDED.source_code,
        metadata = EXCLUDED.metadata
    `;

    const batchSize = 100;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      for (const entity of batch) {
        try {
          if (!this.dbClient) throw new Error('DB client not initialized');
          await this.dbClient.query(sql, [
            entity.id,
            entity.name,
            entity.type,
            entity.language,
            entity.filePath,
            entity.startLine,
            entity.endLine,
            entity.signature || null,
            entity.description || null,
            entity.parameters ? JSON.stringify(entity.parameters) : null,
            entity.returnType || null,
            entity.complexity || null,
            entity.domain || null,
            entity.keywords ? JSON.stringify(entity.keywords) : null,
            entity.sourceCode,
            entity.metadata ? JSON.stringify(entity.metadata) : null,
          ]);
        } catch (error) {
          console.warn(`Failed to store entity ${entity.id}:`, error);
        }
      }

      console.log(`💾 Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entities.length / batchSize)}`);
    }
  }

  private async generateEmbeddings(entities: CodeEntity[]): Promise<void> {
    if (entities.length === 0) return;

    console.log(`🧠 Generating embeddings for ${entities.length} entities`);

    const batchSize = this.embeddingConfig.batchSize;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      try {
        // Prepare text for embedding
        const texts = batch.map(entity => this.prepareTextForEmbedding(entity));
        
        // Generate embeddings
        const embeddings = await this.generateTextEmbeddings(texts);
        
        // Store embeddings
        await this.storeEmbeddings(batch, embeddings);
        
        console.log(`🧠 Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entities.length / batchSize)}`);
      } catch (error) {
        console.warn(`Failed to generate embeddings for batch starting at ${i}:`, error);
      }
    }
  }

  private prepareTextForEmbedding(entity: CodeEntity): string {
    const parts = [
      entity.name,
      entity.type,
      entity.signature || '',
      entity.description || '',
      entity.keywords?.join(' ') || '',
      entity.sourceCode.substring(0, 1000), // Limit source code length
    ];

    return parts.filter(Boolean).join(' ').trim();
  }


  /**
   * Generate an embedding using OpenAI's API (or compatible service)
   */

  // Use ContentProcessor for embedding generation
  private async generateTextEmbedding(text: string): Promise<number[]> {
    const processor = new ContentProcessor({
      embeddingModel: this.embeddingConfig.model,
      batchSize: this.embeddingConfig.batchSize,
    });
    const embeddings = await processor.generateEmbeddings([text]);
    if (!embeddings[0]) throw new Error('Embedding generation failed');
    return embeddings[0];
  }

  /**
   * Batch embedding generation using OpenAI API (if supported)
   */

  private async generateTextEmbeddings(texts: string[]): Promise<number[][]> {
    const processor = new ContentProcessor({
      embeddingModel: this.embeddingConfig.model,
      batchSize: this.embeddingConfig.batchSize,
    });
    return processor.generateEmbeddings(texts);
  }

  private async storeEmbeddings(entities: CodeEntity[], embeddings: number[][]): Promise<void> {
    const sql = `
      INSERT INTO entity_embeddings (entity_id, embedding, model, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (entity_id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model,
        created_at = EXCLUDED.created_at
    `;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity?.id) {
        console.warn('Skipping embedding storage for entity with missing id:', entity);
        continue;
      }
      try {
        if (!this.dbClient) throw new Error('DB client not initialized');
        await this.dbClient.query(sql, [
          entity.id,
          JSON.stringify(embeddings[i]),
          this.embeddingConfig.model,
        ]);
      } catch (error) {
        console.warn(`Failed to store embedding for entity ${entity.id}:`, error);
      }
    }
  }

  private async storeKnowledgePatterns(patterns: KnowledgePattern[]): Promise<void> {
    if (patterns.length === 0) return;

    console.log(`💾 Storing ${patterns.length} knowledge patterns`);

    const sql = `
      INSERT INTO knowledge_patterns (
        id, name, description, category, language, pattern, examples,
        frequency, confidence, domain
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        language = EXCLUDED.language,
        pattern = EXCLUDED.pattern,
        examples = EXCLUDED.examples,
        frequency = EXCLUDED.frequency,
        confidence = EXCLUDED.confidence,
        domain = EXCLUDED.domain
    `;

    for (const pattern of patterns) {
      try {
        if (!this.dbClient) throw new Error('DB client not initialized');
        await this.dbClient.query(sql, [
          pattern.id,
          pattern.name,
          pattern.description,
          pattern.category,
          pattern.language,
          pattern.pattern,
          JSON.stringify(pattern.examples),
          pattern.frequency,
          pattern.confidence,
          pattern.domain || null,
        ]);
      } catch (error) {
        console.warn(`Failed to store pattern ${pattern.id}:`, error);
      }
    }
  }

  private async createRepositoryAnalysis(params: {
    repositoryPath: string;
    name: string;
    languages: LanguageType[];
    domains: DomainType[];
    totalFiles: number;
    totalEntities: number;
  }): Promise<RepositoryAnalysis> {
    const { randomUUID } = await import('node:crypto');
    
    const analysis = validateRepositoryAnalysis({
      id: randomUUID(),
      repositoryPath: params.repositoryPath,
      name: params.name,
      languages: params.languages,
      totalFiles: params.totalFiles,
      totalEntities: params.totalEntities,
      domains: params.domains,
      analysisVersion: '1.0.0',
      lastAnalyzed: new Date().toISOString(),
    });

    // Store in database
    const sql = `
      INSERT INTO repositories (
        id, repository_path, name, description, languages, total_files,
        total_entities, domains, analysis_version, last_analyzed, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (repository_path) DO UPDATE SET
        name = EXCLUDED.name,
        languages = EXCLUDED.languages,
        total_files = EXCLUDED.total_files,
        total_entities = EXCLUDED.total_entities,
        domains = EXCLUDED.domains,
        analysis_version = EXCLUDED.analysis_version,
        last_analyzed = EXCLUDED.last_analyzed
      RETURNING id
    `;

    if (!this.dbClient) throw new Error('DB client not initialized');
    await this.dbClient.query(sql, [
      analysis.id,
      analysis.repositoryPath,
      analysis.name,
      analysis.description || null,
      JSON.stringify(analysis.languages),
      analysis.totalFiles,
      analysis.totalEntities,
      JSON.stringify(analysis.domains),
      analysis.analysisVersion,
      analysis.lastAnalyzed,
      analysis.metadata ? JSON.stringify(analysis.metadata) : null,
    ]);

    return analysis;
  }

  // Zod schema for DB code entity row
  private static readonly CodeEntityRowSchema = z.object({
    id: z.string().or(z.number()),
    name: z.string(),
    type: z.string(),
    language: z.string(),
    file_path: z.string(),
    start_line: z.number().int().nullable().optional(),
    end_line: z.number().int().nullable().optional(),
    signature: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    parameters: z.string().nullable().optional(),
    return_type: z.string().nullable().optional(),
    complexity: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    source_code: z.string(),
    metadata: z.string().nullable().optional(),
  }).passthrough();

  private rowToCodeEntity(row: unknown): CodeEntity {
    const safe = SemanticIndexer.CodeEntityRowSchema.parse(row);
    return validateCodeEntity({
      id: safe.id,
      name: safe.name,
      type: safe.type,
      language: safe.language,
      filePath: safe.file_path,
      startLine: safe.start_line ?? undefined,
      endLine: safe.end_line ?? undefined,
      signature: safe.signature ?? undefined,
      description: safe.description ?? undefined,
      parameters: safe.parameters ? JSON.parse(safe.parameters) : undefined,
      returnType: safe.return_type ?? undefined,
      complexity: safe.complexity ?? undefined,
      domain: safe.domain ?? undefined,
      keywords: safe.keywords ? JSON.parse(safe.keywords) : undefined,
      sourceCode: safe.source_code,
      metadata: safe.metadata ? JSON.parse(safe.metadata) : undefined,
    });
  }

  // Zod schema for DB knowledge pattern row
  private static readonly KnowledgePatternRowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    category: z.string(),
    language: z.string(),
    pattern: z.string(),
    examples: z.string(),
    frequency: z.number().int(),
    confidence: z.number(),
    domain: z.string().nullable().optional(),
  }).passthrough();

  private rowToKnowledgePattern(row: unknown): KnowledgePattern {
    const safe = SemanticIndexer.KnowledgePatternRowSchema.parse(row);
    return validateKnowledgePattern({
      id: safe.id,
      name: safe.name,
      description: safe.description ?? undefined,
      category: safe.category,
      language: safe.language,
      pattern: safe.pattern,
      examples: JSON.parse(safe.examples),
      frequency: safe.frequency,
      confidence: safe.confidence,
      domain: safe.domain ?? undefined,
    });
  }

  // Zod schema for DB stats row
  private static readonly StatsRowSchema = z.object({
    total_entities: z.string().optional(),
    languages_count: z.string().optional(),
    domains_count: z.string().optional(),
    files_count: z.string().optional(),
    language: z.string().optional(),
    domain: z.string().optional(),
    type: z.string().optional(),
    count: z.string().optional(),
  }).passthrough();

  private processStatsResult(rows: unknown[]): any {
    // Process the ROLLUP result to create a hierarchical stats structure
    const stats = {
      total: {},
      byLanguage: {},
      byDomain: {},
      byType: {},
    };

    for (const row of rows) {
      const safeRow = SemanticIndexer.StatsRowSchema.parse(row);
      if (!safeRow.language && !safeRow.domain && !safeRow.type) {
        // Total row
        stats.total = {
          totalEntities: parseInt(safeRow.total_entities || '0'),
          languagesCount: parseInt(safeRow.languages_count || '0'),
          domainsCount: parseInt(safeRow.domains_count || '0'),
          filesCount: parseInt(safeRow.files_count || '0'),
        };
      } else if (safeRow.language && !safeRow.domain && !safeRow.type) {
        // Language totals
        stats.byLanguage[safeRow.language] = parseInt(safeRow.count || '0');
      } else if (safeRow.domain && !safeRow.language && !safeRow.type) {
        // Domain totals
        stats.byDomain[safeRow.domain] = parseInt(safeRow.count || '0');
      } else if (safeRow.type && !safeRow.language && !safeRow.domain) {
        // Type totals
        stats.byType[safeRow.type] = parseInt(safeRow.count || '0');
      }
    }

    return stats;
  }
}

// Create and export the semantic indexer actor
export const semanticIndexerActor = fromPromise(
  async ({ input }: { input: unknown }) => {
    // Validate actor input
    const InputSchema = z.object({
      operation: z.string(),
      repositoryPath: z.string().optional(),
      name: z.string().optional(),
      query: z.string().optional(),
      options: z.record(z.unknown()).optional(),
    });
    const parsedInput = InputSchema.parse(input);
    // Embedding config can be customized here if needed
    const embeddingConfig = {
      model: 'text-embedding-3-small',
      maxTokens: 8192,
      batchSize: 100,
    };
    const indexer = new SemanticIndexer(embeddingConfig);
    try {
      switch (parsedInput.operation) {
        case 'index':
          if (!parsedInput.repositoryPath || !parsedInput.name) {
            throw new Error('Repository path and name are required for indexing');
          }
          return await indexer.indexRepository(parsedInput.repositoryPath, parsedInput.name);
        case 'search':
          if (!parsedInput.query) {
            throw new Error('Query is required for search');
          }
          return await indexer.searchSimilar(parsedInput.query, parsedInput.options || {});
        case 'patterns':
          if (!parsedInput.query) {
            throw new Error('Query is required for pattern search');
          }
          return await indexer.findPatterns(parsedInput.query, parsedInput.options || {});
        case 'stats':
          return await indexer.getRepositoryStats();
        default:
          throw new Error(`Unknown operation: ${parsedInput.operation}`);
      }
    } finally {
      await indexer.close();
    }
  }
);
