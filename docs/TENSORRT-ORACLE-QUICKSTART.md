# TensorRT Oracle Quick Start Guide

## Fixed Setup Instructions

The user encountered an issue with missing SQL files. Here are the corrected setup instructions:

### 1. Create SQL Directory and Files

First, create the SQL directory and the required initialization files:

```bash
# Create SQL directory
mkdir -p sql

# Create the main initialization file
cat > sql/init.sql << 'EOF'
-- TensorRT Oracle Database Schema
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

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tensorrt_oracle TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tensorrt_oracle TO postgres;

-- Success message
SELECT 'TensorRT Oracle database schema initialized successfully!' as status;
EOF

# Create the indices file
cat > sql/indices.sql << 'EOF'
-- Performance indices for TensorRT Oracle
SET search_path TO tensorrt_oracle, public;

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

-- Success message
SELECT 'TensorRT Oracle indices created successfully!' as status;
EOF

echo "✅ SQL files created successfully!"
```

### 2. Corrected Database Setup

Now run the database setup with the correct commands:

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
echo "⏳ Waiting for PostgreSQL to start..."
sleep 15

# Test connection
docker exec tensorrt-postgres pg_isready -U postgres

# Initialize schema
echo "🔧 Initializing database schema..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/init.sql

# Create indices
echo "📊 Creating performance indices..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/indices.sql

echo "✅ Database setup complete!"
```

### 3. Verify Setup

```bash
# Test the database
docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE schemaname = 'tensorrt_oracle';"

# Test pgvector extension
docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance;"

# Check vector indices
docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE '%vector%';"
```

### 4. Environment Setup

```bash
# Create .env file
cat > .env << 'EOF'
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tensorrt_oracle
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# TensorRT Configuration
TENSORRT_REPO_PATH=./workspace/repository

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
EOF

echo "✅ Environment configuration created!"
```

### 5. Quick Test

```bash
# Install dependencies
bun add pg pg-pool @types/pg

# Test database connection
cat > test-db.js << 'EOF'
const { Pool } = import('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tensorrt_oracle',
  user: 'postgres',
  password: 'your_secure_password',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Test vector extension
    const vectorTest = await client.query("SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance");
    console.log('✅ pgvector extension working!');
    console.log('Vector distance:', vectorTest.rows[0].distance);
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

testConnection();
EOF

node test-db.js
rm test-db.js
```

### 6. Ready for TensorRT Analysis

```bash
# Clone TensorRT repository (example)
mkdir -p workspace
cd workspace
git clone https://github.com/NVIDIA/TensorRT.git repository
cd ..

echo "🚀 TensorRT Oracle setup complete!"
echo "📁 Repository: ./workspace/repository"
echo "🗄️  Database: tensorrt_oracle on localhost:5432"
echo "🔮 Ready to implement the Oracle system!"
```

## Next Steps

1. **Implement the enhanced DocumentationGenerator** using the specifications in the architecture documents
2. **Create the TensorRT analyzers** for CUDA, C++, and Python components
3. **Build the semantic indexing system** with PostgreSQL integration
4. **Develop the Oracle query interface** for natural language questions

The database foundation is now properly set up and ready for the TensorRT Oracle implementation!