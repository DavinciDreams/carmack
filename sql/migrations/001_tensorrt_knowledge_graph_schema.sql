-- =============================================================================
-- TensorRT-LLM Knowledge Graph Database Schema Migration
-- =============================================================================
-- 
-- This migration creates the comprehensive database schema for the TensorRT-LLM
-- knowledge graph system with pgvector support for semantic search.
--
-- Version: 2.0.0
-- Created: 2025-01-23
-- Description: Complete knowledge graph schema with artifacts, relationships, and semantic indexing
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- =============================================================================
-- CORE KNOWLEDGE GRAPH TABLES
-- =============================================================================

-- Artifacts table for storing engineering artifacts (commits, issues, PRs, code lines) with embeddings
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'commit', 'issue', 'pr', 'code_line', 'function', 'class', 'file', 
        'module', 'test', 'documentation', 'config', 'build_script'
    )),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    file_path TEXT,
    line_start INTEGER,
    line_end INTEGER,
    language VARCHAR(50),
    repository_url TEXT,
    commit_hash VARCHAR(40),
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    created_date TIMESTAMP WITH TIME ZONE,
    modified_date TIMESTAMP WITH TIME ZONE,
    
    -- Semantic embedding for similarity search (384 dimensions for sentence-transformers)
    embedding vector(384),
    
    -- Metadata as JSONB for flexible storage
    metadata JSONB DEFAULT '{}',
    
    -- Performance and quality metrics
    complexity_score FLOAT DEFAULT 0,
    performance_impact VARCHAR(20) DEFAULT 'normal' CHECK (performance_impact IN ('critical', 'high', 'normal', 'low')),
    quality_score FLOAT DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_line_numbers CHECK (line_start IS NULL OR line_end IS NULL OR line_start <= line_end),
    CONSTRAINT valid_scores CHECK (complexity_score >= 0 AND quality_score >= 0 AND quality_score <= 1)
);

-- Graph edges table for relationships between artifacts with confidence scores
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    
    -- Relationship types as specified in epic
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN (
        'causal', 'reference', 'dependency', 'tradeoff', 'cst_structure', 
        'historical_change', 'pr_link', 'implements', 'calls', 'inherits',
        'uses', 'optimizes', 'tests', 'documents', 'configures'
    )),
    
    -- Confidence score for relationship strength
    confidence FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Weight for graph algorithms
    weight FLOAT DEFAULT 1.0 CHECK (weight >= 0),
    
    -- Direction indicator
    is_bidirectional BOOLEAN DEFAULT FALSE,
    
    -- Relationship metadata
    metadata JSONB DEFAULT '{}',
    
    -- Evidence for the relationship
    evidence TEXT,
    evidence_type VARCHAR(50) DEFAULT 'inferred' CHECK (evidence_type IN ('explicit', 'inferred', 'learned')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent self-references and duplicate relationships
    CONSTRAINT no_self_reference CHECK (source_id != target_id),
    CONSTRAINT unique_directed_edge UNIQUE (source_id, target_id, relation_type)
);

-- Query sessions table for tracking user investigations
CREATE TABLE IF NOT EXISTS query_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    
    -- Session context
    repository_url TEXT,
    investigation_goal TEXT,
    current_context JSONB DEFAULT '{}',
    
    -- Session state
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    total_queries INTEGER DEFAULT 0,
    successful_queries INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Session metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intermediates table for storing step-by-step walk outputs
CREATE TABLE IF NOT EXISTS intermediates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES query_sessions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    
    -- Step details
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN (
        'query_analysis', 'semantic_search', 'graph_traversal', 'context_assembly',
        'reasoning', 'code_analysis', 'pattern_matching', 'synthesis'
    )),
    step_description TEXT,
    
    -- Input and output
    input_data JSONB,
    output_data JSONB,
    
    -- Artifacts involved in this step
    artifact_ids UUID[],
    
    -- Performance metrics
    execution_time_ms INTEGER,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_session_step UNIQUE (session_id, step_number),
    CONSTRAINT positive_step_number CHECK (step_number > 0)
);

-- =============================================================================
-- HISTORICAL CODE ANALYSIS TABLES
-- =============================================================================

-- Commits table for git commit metadata with author, date, message, diff
CREATE TABLE IF NOT EXISTS commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commit_hash VARCHAR(40) UNIQUE NOT NULL,
    repository_url TEXT NOT NULL,
    
    -- Commit metadata
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    committer_name VARCHAR(255),
    committer_email VARCHAR(255),
    commit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Commit content
    message TEXT NOT NULL,
    message_subject VARCHAR(500),
    message_body TEXT,
    
    -- Diff information
    diff_text TEXT,
    files_changed INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    
    -- Relationships
    parent_hashes VARCHAR(40)[],
    branch_name VARCHAR(255),
    tag_names VARCHAR(255)[],
    
    -- Optional PR link
    pr_id UUID REFERENCES prs(id),
    
    -- Analysis results
    complexity_delta FLOAT DEFAULT 0,
    risk_score FLOAT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 1),
    impact_score FLOAT DEFAULT 0 CHECK (impact_score >= 0 AND impact_score <= 1),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRs table for GitHub PR information with state, creation/merge dates
CREATE TABLE IF NOT EXISTS prs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number INTEGER NOT NULL,
    repository_url TEXT NOT NULL,
    
    -- PR metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,
    state VARCHAR(20) NOT NULL CHECK (state IN ('open', 'closed', 'merged', 'draft')),
    
    -- Author information
    author_login VARCHAR(255) NOT NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    
    -- Timing
    created_at_github TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at_github TIMESTAMP WITH TIME ZONE,
    closed_at_github TIMESTAMP WITH TIME ZONE,
    merged_at_github TIMESTAMP WITH TIME ZONE,
    
    -- Branch information
    head_branch VARCHAR(255) NOT NULL,
    base_branch VARCHAR(255) NOT NULL,
    head_sha VARCHAR(40),
    base_sha VARCHAR(40),
    merge_commit_sha VARCHAR(40),
    
    -- Review information
    reviewers JSONB DEFAULT '[]',
    assignees JSONB DEFAULT '[]',
    labels JSONB DEFAULT '[]',
    
    -- Statistics
    commits_count INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    review_comments_count INTEGER DEFAULT 0,
    
    -- Analysis
    complexity_impact FLOAT DEFAULT 0,
    risk_assessment VARCHAR(20) DEFAULT 'medium' CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
    
    -- Metadata from GitHub API
    github_metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_pr_per_repo UNIQUE (repository_url, pr_number)
);

-- CST nodes table for Concrete Syntax Tree structures from ast-grep
CREATE TABLE IF NOT EXISTS cst_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    
    -- Node identification
    node_type VARCHAR(100) NOT NULL,
    node_kind VARCHAR(100),
    node_text TEXT,
    
    -- Position information
    start_line INTEGER NOT NULL,
    start_column INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    end_column INTEGER NOT NULL,
    
    -- Hierarchy
    parent_id UUID REFERENCES cst_nodes(id) ON DELETE CASCADE,
    depth_level INTEGER NOT NULL DEFAULT 0,
    child_index INTEGER,
    
    -- AST-grep specific data
    ast_grep_pattern VARCHAR(500),
    pattern_variables JSONB DEFAULT '{}',
    
    -- Language-specific information
    language VARCHAR(50) NOT NULL,
    syntax_kind VARCHAR(100),
    
    -- Node structure as JSONB for flexible queries
    node_structure JSONB NOT NULL,
    
    -- Semantic information
    semantic_role VARCHAR(100),
    scope_type VARCHAR(50),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'protected', 'internal')),
    
    -- Analysis metadata
    complexity_contribution FLOAT DEFAULT 0,
    is_entry_point BOOLEAN DEFAULT FALSE,
    is_test_code BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_position CHECK (
        start_line <= end_line AND 
        (start_line < end_line OR start_column <= end_column)
    ),
    CONSTRAINT valid_depth CHECK (depth_level >= 0)
);

-- =============================================================================
-- SEMANTIC INDEXING AND SEARCH TABLES
-- =============================================================================

-- Keywords table for artifact tagging and search
CREATE TABLE IF NOT EXISTS artifact_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    score FLOAT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'technical', 'domain', 'action', 'quality', 'performance', 'security', 'general'
    )),
    extraction_method VARCHAR(50) DEFAULT 'automatic' CHECK (extraction_method IN (
        'automatic', 'manual', 'learned', 'inherited'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_artifact_keyword UNIQUE (artifact_id, keyword)
);

-- Domains table for categorizing artifacts by technical domain
CREATE TABLE IF NOT EXISTS artifact_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_artifact_domain UNIQUE (artifact_id, domain)
);

-- =============================================================================
-- QUERY AND ANALYTICS TABLES
-- =============================================================================

-- Query logs for tracking Oracle queries and performance
CREATE TABLE IF NOT EXISTS query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES query_sessions(id) ON DELETE SET NULL,
    
    -- Query details
    query_text TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL CHECK (query_type IN (
        'semantic_search', 'graph_traversal', 'code_analysis', 'pattern_search',
        'historical_analysis', 'impact_analysis', 'similarity_search'
    )),
    query_intent VARCHAR(50) CHECK (query_intent IN (
        'explain', 'find', 'compare', 'optimize', 'debug', 'history', 'impact'
    )),
    
    -- Query parameters
    parameters JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    
    -- Results
    results_count INTEGER DEFAULT 0,
    results_data JSONB,
    
    -- Performance metrics
    execution_time_ms INTEGER NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    -- User context
    user_id VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Quality metrics
    user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
    result_relevance FLOAT CHECK (result_relevance >= 0 AND result_relevance <= 1),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM METADATA AND CONFIGURATION
-- =============================================================================

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rollback_sql TEXT
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update last_activity_at for query sessions
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE query_sessions 
    SET last_activity_at = NOW(), 
        total_queries = total_queries + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_artifacts_updated_at 
    BEFORE UPDATE ON artifacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graph_edges_updated_at 
    BEFORE UPDATE ON graph_edges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_query_sessions_updated_at 
    BEFORE UPDATE ON query_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commits_updated_at 
    BEFORE UPDATE ON commits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prs_updated_at 
    BEFORE UPDATE ON prs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session activity tracking
CREATE TRIGGER update_session_activity_on_query
    AFTER INSERT ON query_logs
    FOR EACH ROW 
    WHEN (NEW.session_id IS NOT NULL)
    EXECUTE FUNCTION update_session_activity();

-- =============================================================================
-- INITIAL SYSTEM CONFIGURATION
-- =============================================================================

-- Insert initial system configuration
INSERT INTO system_config (key, value, description, category) VALUES
    ('schema_version', '"2.0.0"', 'Current database schema version', 'system'),
    ('pgvector_dimensions', '384', 'Vector dimensions for embeddings (sentence-transformers)', 'embedding'),
    ('embedding_model', '"sentence-transformers/all-MiniLM-L6-v2"', 'Default embedding model', 'embedding'),
    ('similarity_threshold', '0.3', 'Minimum similarity score for relationships', 'search'),
    ('max_query_results', '100', 'Maximum results returned per query', 'search'),
    ('cache_ttl_seconds', '300', 'Cache time-to-live in seconds', 'performance'),
    ('enable_query_logging', 'true', 'Enable detailed query logging', 'system'),
    ('enable_performance_monitoring', 'true', 'Enable performance monitoring', 'system')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Record this migration
INSERT INTO schema_migrations (version, description) VALUES
    ('2.0.0', 'Complete TensorRT-LLM knowledge graph schema with pgvector support')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'TensorRT-LLM Knowledge Graph database schema created successfully!';
    RAISE NOTICE 'Schema version: 2.0.0';
    RAISE NOTICE 'pgvector extension: enabled with 384-dimensional embeddings';
    RAISE NOTICE 'Tables created: % tables', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    );
    RAISE NOTICE 'Ready for knowledge graph ingestion and semantic search';
END $$;