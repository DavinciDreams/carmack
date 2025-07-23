# TensorRT Oracle Deployment & Testing Guide

## Complete Deployment Instructions for Production-Ready TensorRT Oracle

This guide provides comprehensive deployment instructions, testing procedures, and operational guidelines for the TensorRT Oracle system with PostgreSQL + pgvector semantic indexing.

## Quick Start (5-Minute Setup)

### 1. Environment Setup
```bash
# Clone and setup
git clone <repository>
cd carmack
bun install

# Add PostgreSQL dependency
bun add pg pg-pool @types/pg

# Setup environment variables
cp .env.example .env
```

### 2. Environment Configuration
```bash
# Add to .env file
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tensorrt_oracle
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
TENSORRT_REPO_PATH=./workspace/repository
```

### 3. Database Setup (Docker)
```bash
# Start PostgreSQL with pgvector
docker run --name tensorrt-postgres \
  -e POSTGRES_DB=tensorrt_oracle \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16

# Wait for startup
sleep 10

# Initialize schema
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/init.sql
```

### 4. TensorRT Repository Setup
```bash
# Clone TensorRT repository (example)
mkdir -p workspace
cd workspace
git clone https://github.com/NVIDIA/TensorRT.git repository
cd ..
```

### 5. Run TensorRT Oracle Analysis
```bash
# Generate TensorRT Oracle documentation
bun run docs:tensorrt-oracle

# Or with custom options
bun run docs-cli.ts \
  --tensorrt-oracle \
  --source-dir ./workspace/repository \
  --output-dir ./docs/tensorrt \
  --postgres-host localhost \
  --postgres-db tensorrt_oracle
```

## Production Deployment

### Docker Compose Setup

#### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: tensorrt_oracle
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./sql/indices.sql:/docker-entrypoint-initdb.d/02-indices.sql
    command: >
      postgres
      -c shared_preload_libraries=vector
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d tensorrt_oracle"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  tensorrt-oracle:
    build:
      context: .
      dockerfile: Dockerfile.tensorrt
    environment:
      NODE_ENV: production
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: tensorrt_oracle
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      TENSORRT_REPO_PATH: /app/workspace/repository
      LOG_LEVEL: info
    ports:
      - "3000:3000"
    volumes:
      - ./workspace:/app/workspace:ro
      - ./docs:/app/docs
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./docs:/usr/share/nginx/html/docs:ro
    depends_on:
      - tensorrt-oracle
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

#### Dockerfile.tensorrt
```dockerfile
FROM oven/bun:1-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    postgresql-client \
    python3 \
    py3-pip \
    build-base

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY tsconfig.json biome.json ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/
COPY sql/ ./sql/

# Build application
RUN bun run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tensorrt -u 1001 -G nodejs

# Create directories and set permissions
RUN mkdir -p /app/workspace /app/logs /app/docs && \
    chown -R tensorrt:nodejs /app

USER tensorrt

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["bun", "run", "production"]
```

### SQL Schema Files

#### sql/init.sql
```sql
-- TensorRT Oracle Database Schema
-- This file contains the complete schema from TENSORRT-PGVECTOR-ARCHITECTURE.md

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create schema
CREATE SCHEMA IF NOT EXISTS tensorrt_oracle;
SET search_path TO tensorrt_oracle, public;

-- Repository metadata
CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL UNIQUE,
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
    entity_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    signature TEXT,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    complexity_score FLOAT DEFAULT 0,
    performance_level VARCHAR(20) DEFAULT 'normal',
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
    embedding vector(512),
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
    category VARCHAR(50),
    UNIQUE(entity_id, keyword)
);

-- Domain classifications
CREATE TABLE entity_domains (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0,
    UNIQUE(entity_id, domain)
);

-- Relationships between entities
CREATE TABLE entity_relationships (
    id SERIAL PRIMARY KEY,
    source_entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    target_entity_id INTEGER REFERENCES code_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    strength FLOAT DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Institutional knowledge patterns
CREATE TABLE knowledge_patterns (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,
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
    query_intent VARCHAR(50),
    query_domain VARCHAR(100)[],
    query_complexity VARCHAR(20),
    response_confidence FLOAT,
    response_time_ms INTEGER,
    user_feedback INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
\i /docker-entrypoint-initdb.d/02-indices.sql

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tensorrt_oracle TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tensorrt_oracle TO postgres;
```

#### sql/indices.sql
```sql
-- Performance indices for TensorRT Oracle

-- Basic indices
CREATE INDEX idx_code_entities_type ON code_entities(entity_type);
CREATE INDEX idx_code_entities_language ON code_entities(language);
CREATE INDEX idx_code_entities_name ON code_entities USING gin(name gin_trgm_ops);
CREATE INDEX idx_code_entities_signature ON code_entities USING gin(signature gin_trgm_ops);
CREATE INDEX idx_code_entities_repository ON code_entities(repository_id);
CREATE INDEX idx_code_entities_file ON code_entities(file_id);

-- Keyword indices
CREATE INDEX idx_entity_keywords_keyword ON entity_keywords(keyword);
CREATE INDEX idx_entity_keywords_category ON entity_keywords(category);
CREATE INDEX idx_entity_keywords_score ON entity_keywords(score DESC);

-- Domain indices
CREATE INDEX idx_entity_domains_domain ON entity_domains(domain);
CREATE INDEX idx_entity_domains_confidence ON entity_domains(confidence DESC);

-- Relationship indices
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);

-- File indices
CREATE INDEX idx_source_files_language ON source_files(language);
CREATE INDEX idx_source_files_path ON source_files USING gin(file_path gin_trgm_ops);
CREATE INDEX idx_source_files_repository ON source_files(repository_id);

-- Pattern indices
CREATE INDEX idx_knowledge_patterns_type ON knowledge_patterns(pattern_type);
CREATE INDEX idx_knowledge_patterns_repository ON knowledge_patterns(repository_id);
CREATE INDEX idx_knowledge_patterns_effectiveness ON knowledge_patterns(effectiveness_score DESC);

-- Query analytics indices
CREATE INDEX idx_oracle_queries_repository ON oracle_queries(repository_id);
CREATE INDEX idx_oracle_queries_intent ON oracle_queries(query_intent);
CREATE INDEX idx_oracle_queries_created ON oracle_queries(created_at DESC);

-- Vector indices for similarity search (HNSW for best performance)
CREATE INDEX idx_entity_embeddings_vector ON entity_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_pattern_embeddings_vector ON pattern_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Composite indices for common queries
CREATE INDEX idx_entities_type_lang ON code_entities(entity_type, language);
CREATE INDEX idx_entities_repo_type ON code_entities(repository_id, entity_type);
CREATE INDEX idx_keywords_entity_score ON entity_keywords(entity_id, score DESC);
CREATE INDEX idx_domains_entity_conf ON entity_domains(entity_id, confidence DESC);

-- Partial indices for performance
CREATE INDEX idx_exported_entities ON code_entities(id) WHERE is_exported = true;
CREATE INDEX idx_async_functions ON code_entities(id) WHERE is_async = true;
CREATE INDEX idx_high_complexity ON code_entities(id) WHERE complexity_score > 5.0;

-- Text search indices
CREATE INDEX idx_entities_description_fts ON code_entities USING gin(to_tsvector('english', description));
CREATE INDEX idx_patterns_description_fts ON knowledge_patterns USING gin(to_tsvector('english', description));

-- Update statistics
ANALYZE;
```

## Testing Framework

### Unit Tests
```bash
# Run TensorRT-specific tests
bun test test/tensorrt/

# Test database connectivity
bun test test/tensorrt/postgres-connection.test.ts

# Test CUDA analysis
bun test test/tensorrt/cuda-analyzer.test.ts

# Test semantic indexing
bun test test/tensorrt/semantic-indexer.test.ts

# Test Oracle queries
bun test test/tensorrt/oracle-processor.test.ts
```

### Integration Tests
```bash
# Full TensorRT Oracle pipeline test
bun test test/integration/tensorrt-oracle.test.ts

# Database integration test
bun test test/integration/postgres-integration.test.ts

# Repository analysis test
bun test test/integration/repository-analysis.test.ts
```

### Performance Tests
```bash
# Large repository performance test
bun test test/performance/large-repository.test.ts

# Vector search performance test
bun test test/performance/vector-search.test.ts

# Concurrent query performance test
bun test test/performance/concurrent-queries.test.ts
```

### Sample Test Queries

#### Basic Functionality Test
```typescript
// Test basic Oracle functionality
const testQueries = [
  {
    query: "How does TensorRT handle memory allocation?",
    expectedIntent: "explain",
    expectedDomains: ["memory", "tensorrt"],
    minConfidence: 0.7
  },
  {
    query: "Show me CUDA kernel optimization examples",
    expectedIntent: "find",
    expectedDomains: ["cuda", "performance"],
    minConfidence: 0.8
  },
  {
    query: "What are the differences between FP16 and FP32 inference?",
    expectedIntent: "compare",
    expectedDomains: ["performance", "precision"],
    minConfidence: 0.7
  }
];

for (const testQuery of testQueries) {
  const response = await oracleProcessor.processQuery({
    query: testQuery.query,
    intent: testQuery.expectedIntent,
    complexity: 'intermediate'
  });
  
  expect(response.confidence).toBeGreaterThan(testQuery.minConfidence);
  expect(response.codeExamples.length).toBeGreaterThan(0);
  expect(response.relatedConcepts.length).toBeGreaterThan(0);
}
```

## Monitoring and Analytics

### Database Monitoring
```sql
-- Monitor query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%entity_embeddings%'
ORDER BY total_time DESC;

-- Monitor vector index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%vector%';

-- Monitor database size
SELECT 
  pg_size_pretty(pg_database_size('tensorrt_oracle')) as db_size,
  pg_size_pretty(pg_total_relation_size('entity_embeddings')) as embeddings_size,
  pg_size_pretty(pg_total_relation_size('code_entities')) as entities_size;
```

### Application Monitoring
```typescript
// Add to your monitoring system
interface OracleMetrics {
  totalQueries: number;
  averageResponseTime: number;
  averageConfidence: number;
  popularDomains: string[];
  errorRate: number;
  databaseConnections: number;
}

class OracleMonitoring {
  async getMetrics(): Promise<OracleMetrics> {
    const [queryStats, dbStats] = await Promise.all([
      this.getQueryStatistics(),
      this.getDatabaseStatistics()
    ]);
    
    return {
      totalQueries: queryStats.total,
      averageResponseTime: queryStats.avgResponseTime,
      averageConfidence: queryStats.avgConfidence,
      popularDomains: queryStats.popularDomains,
      errorRate: queryStats.errorRate,
      databaseConnections: dbStats.activeConnections
    };
  }
}
```

## Troubleshooting

### Common Issues

#### 1. PostgreSQL Connection Issues
```bash
# Check PostgreSQL status
docker exec tensorrt-postgres pg_isready -U postgres

# Check logs
docker logs tensorrt-postgres

# Test connection
psql -h localhost -U postgres -d tensorrt_oracle -c "SELECT version();"
```

#### 2. pgvector Extension Issues
```sql
-- Verify pgvector installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check vector operations
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector;
```

#### 3. Memory Issues with Large Repositories
```bash
# Increase PostgreSQL memory settings
# Add to postgresql.conf:
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 64MB
maintenance_work_mem = 256MB
```

#### 4. Slow Vector Searches
```sql
-- Rebuild vector indices
REINDEX INDEX idx_entity_embeddings_vector;

-- Update statistics
ANALYZE entity_embeddings;

-- Check index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM entity_embeddings 
ORDER BY embedding <-> '[0.1,0.2,...]'::vector 
LIMIT 10;
```

### Performance Tuning

#### Database Optimization
```sql
-- Optimize for vector operations
SET hnsw.ef_search = 100;  -- Higher = more accurate, slower
SET max_parallel_workers_per_gather = 4;
SET effective_io_concurrency = 200;
```

#### Application Optimization
```typescript
// Connection pooling optimization
const poolConfig = {
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,   // Query timeout
  query_timeout: 30000,
};

// Query optimization
const optimizedQuery = `
  SELECT * FROM (
    SELECT *, embedding <=> $1::vector as distance
    FROM entity_embeddings
    WHERE embedding <=> $1::vector < 0.5
    ORDER BY distance
    LIMIT 100
  ) subq
  JOIN code_entities ce ON subq.entity_id = ce.id
  ORDER BY distance
  LIMIT 20;
`;
```

## Success Metrics

### Phase 1 Success Criteria (EOD Today)
- [ ] PostgreSQL + pgvector database operational
- [ ] TensorRT repository successfully ingested
- [ ] Semantic indexing with 10,000+ code entities
- [ ] Oracle query interface responding to basic questions
- [ ] Sub-second response time for common queries
- [ ] 80%+ confidence on domain-specific questions

### Production Readiness Checklist
- [ ] Database backup and recovery procedures
- [ ] Monitoring and alerting configured
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Team training completed

This deployment guide provides everything needed to get the TensorRT Oracle system running in production with PostgreSQL + pgvector semantic indexing, comprehensive testing, and operational monitoring.