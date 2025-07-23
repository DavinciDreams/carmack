-- =============================================================================
-- TensorRT-LLM Knowledge Graph Database Indices
-- =============================================================================
-- 
-- This script creates optimized indices for the knowledge graph system
-- to ensure fast queries and efficient vector operations.
--

-- =============================================================================
-- KNOWLEDGE NODES INDICES
-- =============================================================================

-- Primary indices for knowledge_nodes
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_name ON knowledge_nodes(name);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_path ON knowledge_nodes(path);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_created_at ON knowledge_nodes(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_updated_at ON knowledge_nodes(updated_at);

-- Composite indices for common query patterns
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type_name ON knowledge_nodes(type, name);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type_created_at ON knowledge_nodes(type, created_at);

-- Vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This is optimized for fast approximate nearest neighbor searches
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_hnsw 
ON knowledge_nodes USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative vector index using IVFFlat for exact searches (commented out by default)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_ivfflat 
-- ON knowledge_nodes USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Metadata indices using GIN for JSONB operations
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_metadata_gin ON knowledge_nodes USING gin(metadata);

-- Partial indices for nodes with embeddings (more efficient for vector operations)
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_with_embedding 
ON knowledge_nodes(type, created_at) WHERE embedding IS NOT NULL;

-- Text search index for content
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_content_fts 
ON knowledge_nodes USING gin(to_tsvector('english', content)) 
WHERE content IS NOT NULL;

-- =============================================================================
-- KNOWLEDGE RELATIONSHIPS INDICES
-- =============================================================================

-- Primary indices for knowledge_relationships
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_id ON knowledge_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_id ON knowledge_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type ON knowledge_relationships(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_weight ON knowledge_relationships(weight);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_created_at ON knowledge_relationships(created_at);

-- Composite indices for relationship traversal
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_type ON knowledge_relationships(source_id, type);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_type ON knowledge_relationships(target_id, type);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type_weight ON knowledge_relationships(type, weight);

-- Bidirectional relationship index for efficient graph traversal
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_bidirectional 
ON knowledge_relationships(source_id, target_id, type);

-- Metadata index for relationships
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_metadata_gin 
ON knowledge_relationships USING gin(metadata);

-- =============================================================================
-- INGESTION JOBS INDICES
-- =============================================================================

-- Primary indices for ingestion_jobs
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_repository_url ON ingestion_jobs(repository_url);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created_at ON ingestion_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_started_at ON ingestion_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_completed_at ON ingestion_jobs(completed_at);

-- Composite indices for job monitoring
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_repo_status ON ingestion_jobs(repository_url, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status_created ON ingestion_jobs(status, created_at);

-- Config metadata index
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_config_gin ON ingestion_jobs USING gin(config);

-- =============================================================================
-- FILE PROCESSING RESULTS INDICES
-- =============================================================================

-- Primary indices for file_processing_results
CREATE INDEX IF NOT EXISTS idx_file_processing_results_job_id ON file_processing_results(job_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_results_file_path ON file_processing_results(file_path);
CREATE INDEX IF NOT EXISTS idx_file_processing_results_success ON file_processing_results(success);
CREATE INDEX IF NOT EXISTS idx_file_processing_results_created_at ON file_processing_results(created_at);

-- Composite indices for analysis
CREATE INDEX IF NOT EXISTS idx_file_processing_results_job_success 
ON file_processing_results(job_id, success);
CREATE INDEX IF NOT EXISTS idx_file_processing_results_success_time 
ON file_processing_results(success, processing_time_ms);

-- =============================================================================
-- AGENT TASKS INDICES
-- =============================================================================

-- Primary indices for agent_tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_started_at ON agent_tasks(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_completed_at ON agent_tasks(completed_at);

-- Composite indices for task management
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type_status ON agent_tasks(type, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_created ON agent_tasks(status, created_at);

-- Input/result metadata indices
CREATE INDEX IF NOT EXISTS idx_agent_tasks_input_gin ON agent_tasks USING gin(input);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_result_gin ON agent_tasks USING gin(result);

-- Performance analysis index
CREATE INDEX IF NOT EXISTS idx_agent_tasks_execution_time 
ON agent_tasks(type, execution_time_ms) WHERE execution_time_ms IS NOT NULL;

-- =============================================================================
-- QUERY LOGS INDICES
-- =============================================================================

-- Primary indices for query_logs
CREATE INDEX IF NOT EXISTS idx_query_logs_query_type ON query_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_session_id ON query_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_execution_time ON query_logs(execution_time_ms);

-- Composite indices for analytics
CREATE INDEX IF NOT EXISTS idx_query_logs_type_time ON query_logs(query_type, created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_time ON query_logs(user_id, created_at);

-- Full-text search on query text
CREATE INDEX IF NOT EXISTS idx_query_logs_query_text_fts 
ON query_logs USING gin(to_tsvector('english', query_text));

-- Filters metadata index
CREATE INDEX IF NOT EXISTS idx_query_logs_filters_gin ON query_logs USING gin(filters);

-- =============================================================================
-- SYSTEM TABLES INDICES
-- =============================================================================

-- System config indices
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at);

-- Schema migrations indices
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- =============================================================================
-- PERFORMANCE OPTIMIZATION INDICES
-- =============================================================================

-- Covering index for node search with embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_search_covering 
ON knowledge_nodes(type, name, created_at) 
INCLUDE (id, path, metadata) 
WHERE embedding IS NOT NULL;

-- Covering index for relationship analysis
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_analysis_covering 
ON knowledge_relationships(source_id, type, weight) 
INCLUDE (target_id, metadata, created_at);

-- Partial index for recent nodes (last 30 days)
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_recent 
ON knowledge_nodes(type, created_at, name) 
WHERE created_at > (NOW() - INTERVAL '30 days');

-- Partial index for high-weight relationships
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_high_weight 
ON knowledge_relationships(source_id, target_id, type) 
WHERE weight > 0.7;

-- =============================================================================
-- VECTOR SEARCH OPTIMIZATION
-- =============================================================================

-- Additional vector indices for different distance metrics
-- Uncomment based on your specific use case:

-- L2 distance (Euclidean)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_l2 
-- ON knowledge_nodes USING hnsw (embedding vector_l2_ops);

-- Inner product (for normalized vectors)
-- CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_ip 
-- ON knowledge_nodes USING hnsw (embedding vector_ip_ops);

-- =============================================================================
-- MAINTENANCE INDICES
-- =============================================================================

-- Index for cleanup operations (finding orphaned relationships)
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_orphan_check 
ON knowledge_relationships(source_id, target_id);

-- Index for data retention policies
CREATE INDEX IF NOT EXISTS idx_query_logs_retention 
ON query_logs(created_at) WHERE created_at < (NOW() - INTERVAL '90 days');

-- =============================================================================
-- STATISTICS AND MONITORING
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE knowledge_nodes;
ANALYZE knowledge_relationships;
ANALYZE ingestion_jobs;
ANALYZE file_processing_results;
ANALYZE agent_tasks;
ANALYZE query_logs;

-- =============================================================================
-- INDEX USAGE MONITORING VIEWS
-- =============================================================================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Unused'
        WHEN idx_scan < 100 THEN 'Low Usage'
        WHEN idx_scan < 1000 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View to monitor table sizes and index sizes
CREATE OR REPLACE VIEW table_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    ROUND(
        100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) 
        / pg_total_relation_size(schemaname||'.'||tablename), 2
    ) as index_ratio_percent
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Database indices created successfully!';
    RAISE NOTICE 'Total indices: %', index_count;
    RAISE NOTICE 'Vector search: HNSW indices enabled for fast similarity search';
    RAISE NOTICE 'Full-text search: GIN indices enabled for content search';
    RAISE NOTICE 'Performance: Covering and partial indices optimized for common queries';
END $$;
