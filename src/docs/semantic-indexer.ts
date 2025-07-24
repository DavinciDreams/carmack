import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  CodeEntity,
  SemanticEmbedding,
  KnowledgePattern,
  RepositoryAnalysis,
  LanguageType,
  DomainType,
} from './types.js';
import {
  validateCodeEntity,
  validateSemanticEmbedding,
  validateKnowledgePattern,
  validateRepositoryAnalysis,
} from './types.js';
import { MultiLanguageAnalyzer } from './multi-language-analyzer.js';

// PostgreSQL connection configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
}

// Embedding service configuration
interface EmbeddingConfig {
  model: string;
  apiKey?: string;
  maxTokens: number;
  batchSize: number;
}

/**
 * Semantic indexing system for TensorRT Oracle
 * Handles code entity extraction, embedding generation, and database storage
 */
export class SemanticIndexer {
  private dbConfig: DatabaseConfig;
  private embeddingConfig: EmbeddingConfig;
  private analyzer: MultiLanguageAnalyzer;
  private dbClient: any = null;

  constructor(
    dbConfig: DatabaseConfig,
    embeddingConfig: EmbeddingConfig = {
      model: 'text-embedding-3-small',
      maxTokens: 8192,
      batchSize: 100,
    }
  ) {
    this.dbConfig = dbConfig;
    this.embeddingConfig = embeddingConfig;
    this.analyzer = new MultiLanguageAnalyzer();
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      const { Client } = await import('pg');
      this.dbClient = new Client({
        host: this.dbConfig.host,
        port: this.dbConfig.port,
        database: this.dbConfig.database,
        user: this.dbConfig.user,
        password: this.dbConfig.password,
      });

      await this.dbClient.connect();
      
      // Set search path to our schema
      await this.dbClient.query(`SET search_path TO ${this.dbConfig.schema}`);
      
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
    if (this.dbClient) {
      await this.dbClient.end();
      this.dbClient = null;
    }
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

      const result = await this.dbClient.query(sql, params);

      return result.rows.map((row: any) => ({
        entity: this.rowToArtifact(row),
        similarity: parseFloat(row.similarity),
      }));
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

      const result = await this.dbClient.query(sql, params);
      return result.rows.map((row: any) => this.rowToKnowledgePattern(row));
    } catch (error) {
      console.error('❌ Pattern search failed:', error);
      throw error;
    }
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(repositoryId?: string): Promise<any> {
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

  private async generateTextEmbedding(text: string): Promise<number[]> {
    // This is a placeholder - in a real implementation, you would call
    // an embedding service like OpenAI's text-embedding-3-small
    // For now, return a mock 512-dimensional vector
    return Array.from({ length: 512 }, () => Math.random() - 0.5);
  }

  private async generateTextEmbeddings(texts: string[]): Promise<number[][]> {
    // Generate embeddings for multiple texts
    return Promise.all(texts.map(text => this.generateTextEmbedding(text)));
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
      try {
        await this.dbClient.query(sql, [
          JSON.stringify(embeddings[i]),
          this.embeddingConfig.model,
        ]);
      } catch (error) {
        console.warn(`Failed to store embedding for entity ${entities[i]?.id}:`, error);
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

    const result = await this.dbClient.query(sql, [
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

  private rowToCodeEntity(row: any): CodeEntity {
    return validateCodeEntity({
      id: row.id,
      name: row.name,
      type: row.type,
      language: row.language,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      signature: row.signature,
      description: row.description,
      parameters: row.parameters ? JSON.parse(row.parameters) : undefined,
      returnType: row.return_type,
      complexity: row.complexity,
      domain: row.domain,
      keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
      sourceCode: row.source_code,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    });
  }

  private rowToKnowledgePattern(row: any): KnowledgePattern {
    return validateKnowledgePattern({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      language: row.language,
      pattern: row.pattern,
      examples: JSON.parse(row.examples),
      frequency: row.frequency,
      confidence: row.confidence,
      domain: row.domain,
    });
  }

  private processStatsResult(rows: any[]): any {
    // Process the ROLLUP result to create a hierarchical stats structure
    const stats = {
      total: {},
      byLanguage: {},
      byDomain: {},
      byType: {},
    };

    for (const row of rows) {
      if (!row.language && !row.domain && !row.type) {
        // Total row
        stats.total = {
          totalEntities: parseInt(row.total_entities),
          languagesCount: parseInt(row.languages_count),
          domainsCount: parseInt(row.domains_count),
          filesCount: parseInt(row.files_count),
        };
      } else if (row.language && !row.domain && !row.type) {
        // Language totals
        stats.byLanguage[row.language] = parseInt(row.count);
      } else if (row.domain && !row.language && !row.type) {
        // Domain totals
        stats.byDomain[row.domain] = parseInt(row.count);
      } else if (row.type && !row.language && !row.domain) {
        // Type totals
        stats.byType[row.type] = parseInt(row.count);
      }
    }

    return stats;
  }
}

// Create and export the semantic indexer actor
export const semanticIndexerActor = fromPromise(
  async ({ input }: { 
    input: { 
      operation: string;
      repositoryPath?: string;
      name?: string;
      query?: string;
      options?: any;
    } 
  }) => {
    const dbConfig: DatabaseConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'tensorrt_oracle',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'your_secure_password',
      schema: process.env.POSTGRES_SCHEMA || 'tensorrt_oracle',
    };

    const indexer = new SemanticIndexer(dbConfig);
    
    try {
      await indexer.initialize();

      switch (input.operation) {
        case 'index':
          if (!input.repositoryPath || !input.name) {
            throw new Error('Repository path and name are required for indexing');
          }
          return await indexer.indexRepository(input.repositoryPath, input.name);
        
        case 'search':
          if (!input.query) {
            throw new Error('Query is required for search');
          }
          return await indexer.searchSimilar(input.query, input.options || {});
        
        case 'patterns':
          if (!input.query) {
            throw new Error('Query is required for pattern search');
          }
          return await indexer.findPatterns(input.query, input.options || {});
        
        case 'stats':
          return await indexer.getRepositoryStats();
        
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
    } finally {
      await indexer.close();
    }
  }
);
