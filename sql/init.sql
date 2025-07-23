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
