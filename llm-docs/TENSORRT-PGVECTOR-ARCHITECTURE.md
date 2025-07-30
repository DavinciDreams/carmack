# TensorRT Oracle with PostgreSQL + pgvector Architecture

## Enhanced Semantic Indexing with PostgreSQL and pgvector

This document outlines the updated architecture for the TensorRT Oracle system using PostgreSQL with the pgvector extension for high-performance semantic indexing and vector similarity search.

## PostgreSQL + pgvector Integration

### Why PostgreSQL + pgvector?

1. **Scalability**: Handle millions of code entities with efficient vector operations
2. **ACID Compliance**: Ensure data consistency during repository updates
3. **Advanced Indexing**: HNSW and IVFFlat indices for fast similarity search
4. **SQL Integration**: Combine vector search with traditional relational queries
5. **Production Ready**: Battle-tested database with excellent tooling

### Database Schema Design

#### Core Tables

```sql
-- Extension setup
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Repository metadata
CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    url TEXT,
    branch VARCHAR(100) DEFAULT 'main',
    last_analyzed TIMESTAMP WITH TIME ZONE,
    total_files INTEGER DEFAULT 0,
    total_entities INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Source files
CREATE TABLE source_files (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    file_size BIGINT,
    last_modified TIMESTAMP WITH TIME ZONE,
    content_hash VARCHAR(64),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(repository_id, file_path)
);

-- Code entities (functions, classes, kernels, templates)
CREATE TABLE code_entities (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES source_files(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'function', 'class', 'kernel', 'template', 'api'
    name VARCHAR(255) NOT NULL,
    signature TEXT,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    complexity_score FLOAT DEFAULT 0,
    performance_level VARCHAR(20) DEFAULT 'normal', -- 'critical', 'normal', 'low'
    is_exported BOOLEAN DEFAULT FALSE,
    is_async BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Semantic embeddings with pgvector
CREATE TABLE entity_embeddings (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    embedding vector(512), -- 512-dimensional embeddings
    embedding_model VARCHAR(100) DEFAULT 'sentence-transformers',
    embedding_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_id)
);

-- Keywords and tags
CREATE TABLE entity_keywords (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    score FLOAT NOT NULL DEFAULT 0,
    category VARCHAR(50), -- 'technical', 'domain', 'action', 'quality', 'general'
    UNIQUE(entity_id, keyword)
);

-- Domain classifications
CREATE TABLE entity_domains (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL, -- 'memory', 'performance', 'api', 'optimization'
    confidence FLOAT NOT NULL DEFAULT 0,
    UNIQUE(entity_id, domain)
);

-- Relationships between entities
CREATE TABLE entity_relationships (
    id SERIAL PRIMARY KEY,
    source_entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    target_entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'calls', 'inherits', 'implements', 'uses', 'optimizes'
    strength FLOAT DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Institutional knowledge patterns
CREATE TABLE knowledge_patterns (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL, -- 'memory', 'performance', 'api', 'error', 'testing'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency INTEGER DEFAULT 1,
    effectiveness_score FLOAT DEFAULT 0,
    confidence FLOAT DEFAULT 0,
    examples JSONB DEFAULT '[]',
    evolution JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pattern embeddings for similarity search
CREATE TABLE pattern_embeddings (
    id SERIAL PRIMARY KEY,
    pattern_id INTEGER REFERENCES knowledge_patterns(id) ON DELETE CASCADE,
    embedding vector(512),
    embedding_model VARCHAR(100) DEFAULT 'sentence-transformers',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_id)
);

-- Query history and analytics
CREATE TABLE oracle_queries (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_intent VARCHAR(50), -- 'explain', 'find', 'compare', 'optimize', 'debug'
    query_domain VARCHAR(100)[],
    query_complexity VARCHAR(20), -- 'basic', 'intermediate', 'advanced'
    response_confidence FLOAT,
    response_time_ms INTEGER,
    user_feedback INTEGER, -- 1-5 rating
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_code_entities_type ON code_entities(entity_type);
CREATE INDEX idx_code_entities_language ON code_entities(language);
CREATE INDEX idx_code_entities_name ON code_entities USING gin(name gin_trgm_ops);
CREATE INDEX idx_code_entities_signature ON code_entities USING gin(signature gin_trgm_ops);
CREATE INDEX idx_entity_keywords_keyword ON entity_keywords(keyword);
CREATE INDEX idx_entity_keywords_category ON entity_keywords(category);
CREATE INDEX idx_entity_domains_domain ON entity_domains(domain);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);
CREATE INDEX idx_source_files_language ON source_files(language);
CREATE INDEX idx_source_files_path ON source_files USING gin(file_path gin_trgm_ops);

-- Vector indices for similarity search
CREATE INDEX idx_entity_embeddings_vector ON entity_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_pattern_embeddings_vector ON pattern_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

### Enhanced Semantic Indexing Architecture

#### Database Connection and Configuration

```typescript
// Database configuration
interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
}

// Vector search configuration
interface VectorSearchConfig {
  embeddingDimensions: number;
  similarityThreshold: number;
  maxResults: number;
  indexType: 'hnsw' | 'ivfflat';
  embeddingModel: string;
}

// Enhanced semantic index with PostgreSQL backend
interface PostgreSQLSemanticIndex {
  connection: PostgreSQLConnection;
  config: VectorSearchConfig;
  
  // Core operations
  insertEntity(entity: CodeEntity, embedding: Vector): Promise<void>;
  updateEntity(entityId: number, entity: Partial<CodeEntity>): Promise<void>;
  deleteEntity(entityId: number): Promise<void>;
  
  // Vector search operations
  findSimilarEntities(queryEmbedding: Vector, limit?: number): Promise<SimilarityResult[]>;
  findByKeywords(keywords: string[], limit?: number): Promise<CodeEntity[]>;
  findByDomain(domains: string[], limit?: number): Promise<CodeEntity[]>;
  
  // Complex queries
  hybridSearch(query: HybridSearchQuery): Promise<SearchResult[]>;
  findRelatedEntities(entityId: number, relationshipTypes?: string[]): Promise<CodeEntity[]>;
  
  // Analytics and insights
  getEntityStatistics(): Promise<EntityStatistics>;
  getPopularPatterns(limit?: number): Promise<KnowledgePattern[]>;
  getQueryAnalytics(timeRange?: TimeRange): Promise<QueryAnalytics>;
}
```

#### Hybrid Search Implementation

```typescript
class PostgreSQLSemanticIndexer {
  constructor(
    private db: PostgreSQLConnection,
    private nlpAnalyzer: NLPAnalyzer,
    private config: VectorSearchConfig
  ) {}

  async hybridSearch(query: OracleQuery): Promise<SearchResult[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query.query);
    
    // 2. Extract keywords and domains
    const analysis = await this.nlpAnalyzer.analyzeText(query.query, query.query);
    const keywords = analysis.extractedFeatures.keywords;
    const domains = analysis.extractedFeatures.domain;
    
    // 3. Hybrid search combining vector similarity, keywords, and domains
    const searchQuery = `
      WITH vector_search AS (
        SELECT 
          ce.id,
          ce.name,
          ce.signature,
          ce.description,
          ce.entity_type,
          ce.language,
          sf.file_path,
          ee.embedding <=> $1::vector as similarity_score,
          'vector' as match_type,
          1.0 as boost
        FROM code_entities ce
        JOIN entity_embeddings ee ON ce.id = ee.entity_id
        JOIN source_files sf ON ce.file_id = sf.id
        WHERE ee.embedding <=> $1::vector < $2
        ORDER BY similarity_score
        LIMIT $3
      ),
      keyword_search AS (
        SELECT 
          ce.id,
          ce.name,
          ce.signature,
          ce.description,
          ce.entity_type,
          ce.language,
          sf.file_path,
          AVG(ek.score) as similarity_score,
          'keyword' as match_type,
          0.8 as boost
        FROM code_entities ce
        JOIN entity_keywords ek ON ce.id = ek.entity_id
        JOIN source_files sf ON ce.file_id = sf.id
        WHERE ek.keyword = ANY($4::text[])
        GROUP BY ce.id, ce.name, ce.signature, ce.description, ce.entity_type, ce.language, sf.file_path
        LIMIT $3
      ),
      domain_search AS (
        SELECT 
          ce.id,
          ce.name,
          ce.signature,
          ce.description,
          ce.entity_type,
          ce.language,
          sf.file_path,
          AVG(ed.confidence) as similarity_score,
          'domain' as match_type,
          0.6 as boost
        FROM code_entities ce
        JOIN entity_domains ed ON ce.id = ed.entity_id
        JOIN source_files sf ON ce.file_id = sf.id
        WHERE ed.domain = ANY($5::text[])
        GROUP BY ce.id, ce.name, ce.signature, ce.description, ce.entity_type, ce.language, sf.file_path
        LIMIT $3
      ),
      combined_results AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY similarity_score * boost DESC) as rn
        FROM (
          SELECT * FROM vector_search
          UNION ALL
          SELECT * FROM keyword_search
          UNION ALL
          SELECT * FROM domain_search
        ) all_results
      )
      SELECT 
        id,
        name,
        signature,
        description,
        entity_type,
        language,
        file_path,
        MAX(similarity_score * boost) as final_score,
        array_agg(DISTINCT match_type) as match_types
      FROM combined_results
      WHERE rn = 1
      GROUP BY id, name, signature, description, entity_type, language, file_path
      ORDER BY final_score DESC
      LIMIT $6;
    `;
    
    const results = await this.db.query(searchQuery, [
      queryEmbedding,                    // $1: query embedding
      this.config.similarityThreshold,  // $2: similarity threshold
      this.config.maxResults,           // $3: limit per search type
      keywords,                         // $4: keywords array
      domains,                          // $5: domains array
      this.config.maxResults            // $6: final limit
    ]);
    
    return results.rows.map(row => ({
      entity: this.mapRowToEntity(row),
      score: row.final_score,
      matchTypes: row.match_types,
      explanation: this.generateMatchExplanation(row)
    }));
  }

  async insertRepositoryData(repositoryIndex: RepositoryIndex): Promise<void> {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert repository
      const repoResult = await client.query(`
        INSERT INTO repositories (name, path, total_files, total_entities)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (path) DO UPDATE SET
          total_files = EXCLUDED.total_files,
          total_entities = EXCLUDED.total_entities,
          last_analyzed = NOW()
        RETURNING id
      `, [
        repositoryIndex.name,
        repositoryIndex.path,
        repositoryIndex.files.length,
        repositoryIndex.entities.length
      ]);
      
      const repositoryId = repoResult.rows[0].id;
      
      // Batch insert source files
      await this.batchInsertSourceFiles(client, repositoryId, repositoryIndex.files);
      
      // Batch insert code entities with embeddings
      await this.batchInsertEntities(client, repositoryId, repositoryIndex.entities);
      
      // Insert relationships
      await this.batchInsertRelationships(client, repositoryIndex.relationships);
      
      // Insert knowledge patterns
      await this.batchInsertPatterns(client, repositoryId, repositoryIndex.patterns);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async batchInsertEntities(
    client: any,
    repositoryId: number,
    entities: CodeEntity[]
  ): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      // Insert entities
      const entityValues = batch.map((entity, idx) => {
        const baseIdx = i * 10 + idx * 10;
        return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8}, $${baseIdx + 9}, $${baseIdx + 10})`;
      }).join(',');
      
      const entityParams = batch.flatMap(entity => [
        repositoryId,
        entity.fileId,
        entity.type,
        entity.name,
        entity.signature,
        entity.description,
        entity.language,
        entity.startLine,
        entity.endLine,
        JSON.stringify(entity.metadata)
      ]);
      
      const entityResult = await client.query(`
        INSERT INTO code_entities (
          repository_id, file_id, entity_type, name, signature, description,
          language, start_line, end_line, metadata
        ) VALUES ${entityValues}
        RETURNING id
      `, entityParams);
      
      // Generate and insert embeddings
      const embeddings = await Promise.all(
        batch.map(async (entity, idx) => {
          const embedding = await this.generateEntityEmbedding(entity);
          return {
            entityId: entityResult.rows[idx].id,
            embedding
          };
        })
      );
      
      await this.batchInsertEmbeddings(client, embeddings);
      
      // Insert keywords and domains
      await this.batchInsertKeywords(client, batch, entityResult.rows);
      await this.batchInsertDomains(client, batch, entityResult.rows);
    }
  }

  private async generateEntityEmbedding(entity: CodeEntity): Promise<Vector> {
    // Combine entity information for embedding
    const text = [
      entity.name,
      entity.signature,
      entity.description,
      entity.type,
      entity.language
    ].filter(Boolean).join(' ');
    
    return await this.nlpAnalyzer.generateEmbedding(text);
  }
}
```

### Performance Optimizations

#### Connection Pooling and Caching
```typescript
class OptimizedPostgreSQLIndex {
  private connectionPool: Pool;
  private embeddingCache: LRUCache<string, Vector>;
  private queryCache: LRUCache<string, SearchResult[]>;
  
  constructor(config: PostgreSQLConfig) {
    this.connectionPool = new Pool({
      ...config,
      max: config.poolSize || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000,
    });
    
    this.embeddingCache = new LRUCache({ max: 10000 });
    this.queryCache = new LRUCache({ max: 1000, ttl: 300000 }); // 5 min TTL
  }

  async optimizedSimilaritySearch(
    queryEmbedding: Vector,
    options: SearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const cacheKey = this.generateCacheKey(queryEmbedding, options);
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use prepared statement for better performance
    const query = `
      SELECT 
        ce.id,
        ce.name,
        ce.signature,
        ce.description,
        ce.entity_type,
        ce.language,
        sf.file_path,
        ee.embedding <=> $1::vector as distance
      FROM code_entities ce
      JOIN entity_embeddings ee ON ce.id = ee.entity_id
      JOIN source_files sf ON ce.file_id = sf.id
      WHERE ee.embedding <=> $1::vector < $2
        AND ($3::text IS NULL OR ce.language = $3)
        AND ($4::text IS NULL OR ce.entity_type = $4)
      ORDER BY distance
      LIMIT $5;
    `;
    
    const result = await this.connectionPool.query(query, [
      queryEmbedding,
      options.threshold || 0.5,
      options.language || null,
      options.entityType || null,
      options.limit || 50
    ]);
    
    const searchResults = result.rows.map(row => ({
      entity: this.mapRowToEntity(row),
      similarity: 1 - row.distance,
      distance: row.distance
    }));
    
    // Cache results
    this.queryCache.set(cacheKey, searchResults);
    
    return searchResults;
  }
}
```

### Integration with Existing System

#### Enhanced DocumentationGenerator Integration
```typescript
class DocumentationGenerator {
  private postgresIndex: PostgreSQLSemanticIndex;
  
  constructor() {
    this.analyzer = new ASTGrepAnalyzer();
    this.postgresIndex = new PostgreSQLSemanticIndex({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'tensorrt_oracle',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
    });
  }

  async generateTensorRTOracle(request: TensorRTDocumentationRequest): Promise<DocumentationResult> {
    // 1. Repository ingestion (existing logic)
    const repositoryIndex = await this.ingestTensorRTRepository(request);
    
    // 2. Store in PostgreSQL with vector embeddings
    await this.postgresIndex.insertRepositoryData(repositoryIndex);
    
    // 3. Create Oracle interface with PostgreSQL backend
    const oracleInterface = new PostgreSQLOracleProcessor(this.postgresIndex);
    
    // 4. Generate documentation with database-backed search
    const content = await this.generateOracleDocumentation(oracleInterface);
    
    return {
      type: 'tensorrt-oracle',
      format: request.format,
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        databaseEntries: await this.postgresIndex.getEntityCount(),
        indexSize: await this.postgresIndex.getIndexSize(),
        generationTime: Date.now() - startTime,
      },
      oracleInterface,
    };
  }
}
```

### Deployment Configuration

#### Docker Compose Setup
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: tensorrt_oracle
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command: postgres -c shared_preload_libraries=vector

  tensorrt-oracle:
    build: .
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: tensorrt_oracle
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      - postgres
    ports:
      - "3000:3000"
    volumes:
      - ./workspace:/app/workspace

volumes:
  postgres_data:
```

### Benefits of PostgreSQL + pgvector Architecture

1. **Scalability**: Handle millions of code entities efficiently
2. **Performance**: Sub-second similarity search with HNSW indices
3. **Reliability**: ACID transactions ensure data consistency
4. **Flexibility**: Complex queries combining vector and traditional search
5. **Analytics**: Built-in query analytics and performance monitoring
6. **Backup/Recovery**: Standard PostgreSQL backup and recovery tools
7. **Monitoring**: Integration with existing PostgreSQL monitoring tools

This architecture provides a robust, scalable foundation for the TensorRT Oracle system while leveraging the power of PostgreSQL and pgvector for high-performance semantic search capabilities.