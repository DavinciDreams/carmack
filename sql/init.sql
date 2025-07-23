-- =============================================================================
-- TensorRT-LLM Knowledge Graph Database Initialization
-- =============================================================================
-- 
-- This script initializes the PostgreSQL database with pgvector extension
-- and creates the core tables for the knowledge graph system.
--

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- KNOWLEDGE GRAPH CORE TABLES
-- =============================================================================

-- Knowledge nodes table
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'repository', 'file', 'function', 'class', 'variable', 
        'type', 'import', 'export', 'comment', 'documentation'
    )),
    name VARCHAR(500) NOT NULL,
    path TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI ada-002 dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge relationships table
CREATE TABLE IF NOT EXISTS knowledge_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'contains', 'imports', 'exports', 'calls', 'inherits', 
        'implements', 'references', 'documents', 'depends_on', 'similar_to'
    )),
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INGESTION MANAGEMENT TABLES
-- =============================================================================

-- Ingestion jobs table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_url TEXT NOT NULL,
    branch VARCHAR(255) DEFAULT 'main',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed'
    )),
    config JSONB NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    nodes_created INTEGER DEFAULT 0,
    relationships_created INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File processing results table
CREATE TABLE IF NOT EXISTS file_processing_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    nodes_created INTEGER DEFAULT 0,
    relationships_created INTEGER DEFAULT 0,
    error TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- AGENT TASK MANAGEMENT TABLES
-- =============================================================================

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'code_analysis', 'documentation_generation', 'pattern_extraction',
        'dependency_mapping', 'semantic_indexing', 'quality_assessment'
    )),
    input JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed'
    )),
    result JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER
);

-- =============================================================================
-- QUERY ANALYTICS TABLES
-- =============================================================================

-- Query logs table for analytics and optimization
CREATE TABLE IF NOT EXISTS query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_type VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    filters JSONB,
    results_count INTEGER,
    execution_time_ms INTEGER,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM METADATA TABLES
-- =============================================================================

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for knowledge_nodes table
CREATE TRIGGER update_knowledge_nodes_updated_at 
    BEFORE UPDATE ON knowledge_nodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for system_config table
CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL SYSTEM CONFIGURATION
-- =============================================================================

-- Insert initial system configuration
INSERT INTO system_config (key, value, description) VALUES
    ('schema_version', '"1.0.0"', 'Current database schema version'),
    ('pgvector_dimensions', '1536', 'Vector dimensions for embeddings'),
    ('embedding_model', '"text-embedding-ada-002"', 'Default embedding model'),
    ('max_nodes_per_file', '1000', 'Maximum nodes to extract per file'),
    ('similarity_threshold', '0.7', 'Minimum similarity score for relationships')
ON CONFLICT (key) DO NOTHING;

-- Record this migration
INSERT INTO schema_migrations (version, description) VALUES
    ('1.0.0', 'Initial schema with knowledge graph tables and pgvector support')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- =============================================================================

-- View for node statistics by type
CREATE OR REPLACE VIEW node_statistics AS
SELECT 
    type,
    COUNT(*) as total_count,
    COUNT(embedding) as embedded_count,
    AVG(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as embedding_ratio
FROM knowledge_nodes
GROUP BY type;

-- View for relationship statistics
CREATE OR REPLACE VIEW relationship_statistics AS
SELECT 
    type,
    COUNT(*) as total_count,
    AVG(weight) as avg_weight,
    MIN(weight) as min_weight,
    MAX(weight) as max_weight
FROM knowledge_relationships
GROUP BY type;

-- View for ingestion job summary
CREATE OR REPLACE VIEW ingestion_summary AS
SELECT 
    repository_url,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    SUM(nodes_created) as total_nodes_created,
    SUM(relationships_created) as total_relationships_created,
    MAX(completed_at) as last_completed
FROM ingestion_jobs
GROUP BY repository_url;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get similar nodes using vector similarity
CREATE OR REPLACE FUNCTION find_similar_nodes(
    target_embedding vector(1536),
    similarity_threshold DECIMAL DEFAULT 0.7,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    node_id UUID,
    node_name VARCHAR(500),
    node_type VARCHAR(50),
    similarity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kn.id,
        kn.name,
        kn.type,
        (1 - (kn.embedding <=> target_embedding))::DECIMAL as similarity
    FROM knowledge_nodes kn
    WHERE kn.embedding IS NOT NULL
        AND (1 - (kn.embedding <=> target_embedding)) >= similarity_threshold
    ORDER BY kn.embedding <=> target_embedding
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get node relationships with depth
CREATE OR REPLACE FUNCTION get_node_relationships(
    node_id UUID,
    max_depth INTEGER DEFAULT 2,
    relationship_types VARCHAR[] DEFAULT NULL
)
RETURNS TABLE(
    source_id UUID,
    target_id UUID,
    relationship_type VARCHAR(50),
    depth INTEGER,
    path UUID[]
) AS $$
WITH RECURSIVE relationship_tree AS (
    -- Base case: direct relationships
    SELECT 
        kr.source_id,
        kr.target_id,
        kr.type as relationship_type,
        1 as depth,
        ARRAY[kr.source_id, kr.target_id] as path
    FROM knowledge_relationships kr
    WHERE kr.source_id = node_id
        AND (relationship_types IS NULL OR kr.type = ANY(relationship_types))
    
    UNION ALL
    
    -- Recursive case: follow relationships
    SELECT 
        kr.source_id,
        kr.target_id,
        kr.type as relationship_type,
        rt.depth + 1,
        rt.path || kr.target_id
    FROM knowledge_relationships kr
    JOIN relationship_tree rt ON kr.source_id = rt.target_id
    WHERE rt.depth < max_depth
        AND NOT (kr.target_id = ANY(rt.path)) -- Prevent cycles
        AND (relationship_types IS NULL OR kr.type = ANY(relationship_types))
)
SELECT * FROM relationship_tree;
$$ LANGUAGE sql;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'TensorRT-LLM Knowledge Graph database initialized successfully!';
    RAISE NOTICE 'Schema version: 1.0.0';
    RAISE NOTICE 'pgvector extension: enabled';
    RAISE NOTICE 'Tables created: % tables', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    );
END $$;
