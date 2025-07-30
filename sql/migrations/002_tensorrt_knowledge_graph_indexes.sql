-- =============================================================================
-- TensorRT-LLM Knowledge Graph Database Indexes
-- =============================================================================
-- 
-- This migration creates optimized indexes for the TensorRT-LLM knowledge graph
-- system to ensure fast queries, efficient vector operations, and optimal performance
-- for semantic search and graph traversal operations.
--
-- Version: 2.0.0
-- Created: 2025-01-23
-- Description: Comprehensive indexing strategy for knowledge graph performance
--

-- =============================================================================
-- ARTIFACTS TABLE INDEXES
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_language ON artifacts(language);
CREATE INDEX IF NOT EXISTS idx_artifacts_repository_url ON artifacts(repository_url);
CREATE INDEX IF NOT EXISTS idx_artifacts_commit_hash ON artifacts(commit_hash);
CREATE INDEX IF NOT EXISTS idx_artifacts_author_email ON artifacts(author_email);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_date ON artifacts(created_date);
CREATE INDEX IF NOT EXISTS idx_artifacts_performance_impact ON artifacts(performance_impact);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_type_language ON artifacts(type, language);
CREATE INDEX IF NOT EXISTS idx_artifacts_repo_type ON artifacts(repository_url, type);
CREATE INDEX IF NOT EXISTS idx_artifacts_repo_date ON artifacts(repository_url, created_date);
CREATE INDEX IF NOT EXISTS idx_artifacts_type_date ON artifacts(type, created_date);
CREATE INDEX IF NOT EXISTS idx_artifacts_author_date ON artifacts(author_email, created_date);

-- File path and location indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_file_path ON artifacts USING gin(file_path gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artifacts_file_path_btree ON artifacts(file_path);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_name_gin ON artifacts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artifacts_description_gin ON artifacts USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artifacts_content_fts ON artifacts USING gin(to_tsvector('english', content)) 
    WHERE content IS NOT NULL;

-- JSONB metadata indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_metadata_gin ON artifacts USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_artifacts_metadata_btree ON artifacts USING btree(metadata);

-- Vector similarity index using HNSW for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_artifacts_embedding_hnsw ON artifacts 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- Alternative vector index using IVFFlat for exact searches (commented out by default)
-- CREATE INDEX IF NOT EXISTS idx_artifacts_embedding_ivfflat ON artifacts 
--     USING ivfflat (embedding vector_cosine_ops) 
--     WITH (lists = 100)
--     WHERE embedding IS NOT NULL;

-- Partial indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_artifacts_with_embedding ON artifacts(type, created_date) 
    WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artifacts_code_entities ON artifacts(type, language, file_path) 
    WHERE type IN ('function', 'class', 'code_line');
CREATE INDEX IF NOT EXISTS idx_artifacts_high_impact ON artifacts(type, performance_impact, quality_score) 
    WHERE performance_impact IN ('critical', 'high');

-- Line number indexes for code location queries
CREATE INDEX IF NOT EXISTS idx_artifacts_line_range ON artifacts(file_path, line_start, line_end) 
    WHERE line_start IS NOT NULL AND line_end IS NOT NULL;

-- =============================================================================
-- GRAPH_EDGES TABLE INDEXES
-- =============================================================================

-- Primary relationship indexes
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_id ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_id ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation_type ON graph_edges(relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_confidence ON graph_edges(confidence);
CREATE INDEX IF NOT EXISTS idx_graph_edges_weight ON graph_edges(weight);

-- Composite indexes for graph traversal
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_type ON graph_edges(source_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_type ON graph_edges(target_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_confidence ON graph_edges(source_id, confidence);
CREATE INDEX IF NOT EXISTS idx_graph_edges_type_confidence ON graph_edges(relation_type, confidence);

-- Bidirectional relationship index for efficient graph traversal
CREATE INDEX IF NOT EXISTS idx_graph_edges_bidirectional ON graph_edges(source_id, target_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_reverse ON graph_edges(target_id, source_id, relation_type);

-- High-confidence relationships
CREATE INDEX IF NOT EXISTS idx_graph_edges_high_confidence ON graph_edges(source_id, target_id, relation_type) 
    WHERE confidence > 0.7;

-- Evidence-based relationships
CREATE INDEX IF NOT EXISTS idx_graph_edges_evidence_type ON graph_edges(evidence_type, relation_type);

-- Metadata index
CREATE INDEX IF NOT EXISTS idx_graph_edges_metadata_gin ON graph_edges USING gin(metadata);

-- =============================================================================
-- QUERY_SESSIONS TABLE INDEXES
-- =============================================================================

-- Session lookup indexes
CREATE INDEX IF NOT EXISTS idx_query_sessions_token ON query_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_query_sessions_user_id ON query_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_query_sessions_status ON query_sessions(status);
CREATE INDEX IF NOT EXISTS idx_query_sessions_repository_url ON query_sessions(repository_url);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_query_sessions_started_at ON query_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_query_sessions_last_activity ON query_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_query_sessions_completed_at ON query_sessions(completed_at);

-- Composite indexes for session management
CREATE INDEX IF NOT EXISTS idx_query_sessions_user_status ON query_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_query_sessions_repo_status ON query_sessions(repository_url, status);
CREATE INDEX IF NOT EXISTS idx_query_sessions_active_recent ON query_sessions(status, last_activity_at) 
    WHERE status = 'active';

-- Context search
CREATE INDEX IF NOT EXISTS idx_query_sessions_context_gin ON query_sessions USING gin(current_context);

-- =============================================================================
-- INTERMEDIATES TABLE INDEXES
-- =============================================================================

-- Session and step indexes
CREATE INDEX IF NOT EXISTS idx_intermediates_session_id ON intermediates(session_id);
CREATE INDEX IF NOT EXISTS idx_intermediates_step_number ON intermediates(step_number);
CREATE INDEX IF NOT EXISTS idx_intermediates_step_type ON intermediates(step_type);
CREATE INDEX IF NOT EXISTS idx_intermediates_status ON intermediates(status);

-- Composite indexes for step retrieval
CREATE INDEX IF NOT EXISTS idx_intermediates_session_step ON intermediates(session_id, step_number);
CREATE INDEX IF NOT EXISTS idx_intermediates_session_type ON intermediates(session_id, step_type);

-- Performance analysis indexes
CREATE INDEX IF NOT EXISTS idx_intermediates_execution_time ON intermediates(step_type, execution_time_ms) 
    WHERE execution_time_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intermediates_confidence ON intermediates(step_type, confidence_score) 
    WHERE confidence_score IS NOT NULL;

-- Artifact involvement index
CREATE INDEX IF NOT EXISTS idx_intermediates_artifacts_gin ON intermediates USING gin(artifact_ids);

-- Data indexes
CREATE INDEX IF NOT EXISTS idx_intermediates_input_gin ON intermediates USING gin(input_data);
CREATE INDEX IF NOT EXISTS idx_intermediates_output_gin ON intermediates USING gin(output_data);

-- =============================================================================
-- COMMITS TABLE INDEXES
-- =============================================================================

-- Primary commit indexes
CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash);
CREATE INDEX IF NOT EXISTS idx_commits_repository_url ON commits(repository_url);
CREATE INDEX IF NOT EXISTS idx_commits_author_email ON commits(author_email);
CREATE INDEX IF NOT EXISTS idx_commits_commit_date ON commits(commit_date);
CREATE INDEX IF NOT EXISTS idx_commits_branch_name ON commits(branch_name);

-- Composite indexes for commit analysis
CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repository_url, commit_date);
CREATE INDEX IF NOT EXISTS idx_commits_author_date ON commits(author_email, commit_date);
CREATE INDEX IF NOT EXISTS idx_commits_repo_branch ON commits(repository_url, branch_name);

-- PR relationship index
CREATE INDEX IF NOT EXISTS idx_commits_pr_id ON commits(pr_id);

-- Impact and risk indexes
CREATE INDEX IF NOT EXISTS idx_commits_risk_score ON commits(risk_score) WHERE risk_score > 0;
CREATE INDEX IF NOT EXISTS idx_commits_impact_score ON commits(impact_score) WHERE impact_score > 0;
CREATE INDEX IF NOT EXISTS idx_commits_complexity_delta ON commits(complexity_delta) WHERE complexity_delta != 0;

-- File change statistics
CREATE INDEX IF NOT EXISTS idx_commits_files_changed ON commits(files_changed) WHERE files_changed > 0;
CREATE INDEX IF NOT EXISTS idx_commits_lines_changed ON commits(lines_added + lines_deleted) WHERE (lines_added + lines_deleted) > 0;

-- Text search on commit messages
CREATE INDEX IF NOT EXISTS idx_commits_message_fts ON commits USING gin(to_tsvector('english', message));
CREATE INDEX IF NOT EXISTS idx_commits_message_subject_gin ON commits USING gin(message_subject gin_trgm_ops);

-- Parent relationships for git history
CREATE INDEX IF NOT EXISTS idx_commits_parent_hashes_gin ON commits USING gin(parent_hashes);

-- Tag relationships
CREATE INDEX IF NOT EXISTS idx_commits_tag_names_gin ON commits USING gin(tag_names);

-- Metadata index
CREATE INDEX IF NOT EXISTS idx_commits_metadata_gin ON commits USING gin(metadata);

-- =============================================================================
-- PRS TABLE INDEXES
-- =============================================================================

-- Primary PR indexes
CREATE INDEX IF NOT EXISTS idx_prs_number_repo ON prs(pr_number, repository_url);
CREATE INDEX IF NOT EXISTS idx_prs_repository_url ON prs(repository_url);
CREATE INDEX IF NOT EXISTS idx_prs_state ON prs(state);
CREATE INDEX IF NOT EXISTS idx_prs_author_login ON prs(author_login);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_prs_created_at ON prs(created_at_github);
CREATE INDEX IF NOT EXISTS idx_prs_updated_at ON prs(updated_at_github);
CREATE INDEX IF NOT EXISTS idx_prs_merged_at ON prs(merged_at_github);
CREATE INDEX IF NOT EXISTS idx_prs_closed_at ON prs(closed_at_github);

-- Composite indexes for PR analysis
CREATE INDEX IF NOT EXISTS idx_prs_repo_state ON prs(repository_url, state);
CREATE INDEX IF NOT EXISTS idx_prs_author_state ON prs(author_login, state);
CREATE INDEX IF NOT EXISTS idx_prs_state_created ON prs(state, created_at_github);

-- Branch indexes
CREATE INDEX IF NOT EXISTS idx_prs_head_branch ON prs(head_branch);
CREATE INDEX IF NOT EXISTS idx_prs_base_branch ON prs(base_branch);
CREATE INDEX IF NOT EXISTS idx_prs_branches ON prs(head_branch, base_branch);

-- SHA indexes for commit relationships
CREATE INDEX IF NOT EXISTS idx_prs_head_sha ON prs(head_sha);
CREATE INDEX IF NOT EXISTS idx_prs_base_sha ON prs(base_sha);
CREATE INDEX IF NOT EXISTS idx_prs_merge_commit_sha ON prs(merge_commit_sha);

-- Statistics indexes
CREATE INDEX IF NOT EXISTS idx_prs_files_changed ON prs(files_changed) WHERE files_changed > 0;
CREATE INDEX IF NOT EXISTS idx_prs_commits_count ON prs(commits_count) WHERE commits_count > 0;
CREATE INDEX IF NOT EXISTS idx_prs_lines_changed ON prs(lines_added + lines_deleted) WHERE (lines_added + lines_deleted) > 0;

-- Risk assessment index
CREATE INDEX IF NOT EXISTS idx_prs_risk_assessment ON prs(risk_assessment);
CREATE INDEX IF NOT EXISTS idx_prs_complexity_impact ON prs(complexity_impact) WHERE complexity_impact != 0;

-- Text search on PR titles and descriptions
CREATE INDEX IF NOT EXISTS idx_prs_title_gin ON prs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prs_description_fts ON prs USING gin(to_tsvector('english', description)) 
    WHERE description IS NOT NULL;

-- JSONB indexes for GitHub metadata
CREATE INDEX IF NOT EXISTS idx_prs_reviewers_gin ON prs USING gin(reviewers);
CREATE INDEX IF NOT EXISTS idx_prs_assignees_gin ON prs USING gin(assignees);
CREATE INDEX IF NOT EXISTS idx_prs_labels_gin ON prs USING gin(labels);
CREATE INDEX IF NOT EXISTS idx_prs_github_metadata_gin ON prs USING gin(github_metadata);

-- =============================================================================
-- CST_NODES TABLE INDEXES
-- =============================================================================

-- Artifact relationship index
CREATE INDEX IF NOT EXISTS idx_cst_nodes_artifact_id ON cst_nodes(artifact_id);

-- Node type and kind indexes
CREATE INDEX IF NOT EXISTS idx_cst_nodes_type ON cst_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_kind ON cst_nodes(node_kind);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_language ON cst_nodes(language);

-- Hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_cst_nodes_parent_id ON cst_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_depth_level ON cst_nodes(depth_level);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_child_index ON cst_nodes(child_index);

-- Position indexes for code location queries
CREATE INDEX IF NOT EXISTS idx_cst_nodes_position ON cst_nodes(start_line, start_column, end_line, end_column);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_start_position ON cst_nodes(start_line, start_column);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_end_position ON cst_nodes(end_line, end_column);

-- Composite indexes for tree traversal
CREATE INDEX IF NOT EXISTS idx_cst_nodes_artifact_depth ON cst_nodes(artifact_id, depth_level);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_parent_child ON cst_nodes(parent_id, child_index);
CREATE INDEX IF NOT EXISTS idx_cst_nodes_type_language ON cst_nodes(node_type, language);

-- AST-grep pattern indexes
CREATE INDEX IF NOT EXISTS idx_cst_nodes_pattern ON cst_nodes(ast_grep_pattern) WHERE ast_grep_pattern IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cst_nodes_pattern_vars_gin ON cst_nodes USING gin(pattern_variables);

-- Semantic role indexes
CREATE INDEX IF NOT EXISTS idx_cst_nodes_semantic_role ON cst_nodes(semantic_role) WHERE semantic_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cst_nodes_scope_type ON cst_nodes(scope_type) WHERE scope_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cst_nodes_visibility ON cst_nodes(visibility);

-- Node structure index for flexible queries
CREATE INDEX IF NOT EXISTS idx_cst_nodes_structure_gin ON cst_nodes USING gin(node_structure);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_cst_nodes_complexity ON cst_nodes(complexity_contribution) WHERE complexity_contribution > 0;
CREATE INDEX IF NOT EXISTS idx_cst_nodes_entry_points ON cst_nodes(artifact_id, is_entry_point) WHERE is_entry_point = true;
CREATE INDEX IF NOT EXISTS idx_cst_nodes_test_code ON cst_nodes(artifact_id, is_test_code) WHERE is_test_code = true;

-- Text search on node text
CREATE INDEX IF NOT EXISTS idx_cst_nodes_text_gin ON cst_nodes USING gin(node_text gin_trgm_ops) 
    WHERE node_text IS NOT NULL;

-- =============================================================================
-- SEMANTIC INDEXING TABLE INDEXES
-- =============================================================================

-- Artifact keywords indexes
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_artifact_id ON artifact_keywords(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_keyword ON artifact_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_category ON artifact_keywords(category);
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_score ON artifact_keywords(score);
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_method ON artifact_keywords(extraction_method);

-- Composite indexes for keyword search
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_keyword_score ON artifact_keywords(keyword, score);
CREATE INDEX IF NOT EXISTS idx_artifact_keywords_category_score ON artifact_keywords(category, score);

-- Artifact domains indexes
CREATE INDEX IF NOT EXISTS idx_artifact_domains_artifact_id ON artifact_domains(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_domains_domain ON artifact_domains(domain);
CREATE INDEX IF NOT EXISTS idx_artifact_domains_confidence ON artifact_domains(confidence);

-- Composite indexes for domain search
CREATE INDEX IF NOT EXISTS idx_artifact_domains_domain_confidence ON artifact_domains(domain, confidence);

-- =============================================================================
-- QUERY AND ANALYTICS TABLE INDEXES
-- =============================================================================

-- Query logs indexes
CREATE INDEX IF NOT EXISTS idx_query_logs_session_id ON query_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_query_type ON query_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_query_logs_query_intent ON query_logs(query_intent);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);

-- Performance analysis indexes
CREATE INDEX IF NOT EXISTS idx_query_logs_execution_time ON query_logs(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_query_logs_results_count ON query_logs(results_count);
CREATE INDEX IF NOT EXISTS idx_query_logs_cache_hit ON query_logs(cache_hit);

-- Quality metrics indexes
CREATE INDEX IF NOT EXISTS idx_query_logs_satisfaction ON query_logs(user_satisfaction) WHERE user_satisfaction IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_logs_relevance ON query_logs(result_relevance) WHERE result_relevance IS NOT NULL;

-- Composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_query_logs_type_time ON query_logs(query_type, created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_time ON query_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_session_time ON query_logs(session_id, created_at);

-- Text search on query text
CREATE INDEX IF NOT EXISTS idx_query_logs_query_text_fts ON query_logs USING gin(to_tsvector('english', query_text));

-- JSONB indexes for parameters and results
CREATE INDEX IF NOT EXISTS idx_query_logs_parameters_gin ON query_logs USING gin(parameters);
CREATE INDEX IF NOT EXISTS idx_query_logs_filters_gin ON query_logs USING gin(filters);
CREATE INDEX IF NOT EXISTS idx_query_logs_results_gin ON query_logs USING gin(results_data);

-- =============================================================================
-- SYSTEM TABLE INDEXES
-- =============================================================================

-- System config indexes
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_sensitive ON system_config(is_sensitive);
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at);

-- Schema migrations indexes
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- =============================================================================
-- COVERING INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Covering index for artifact search with embeddings
CREATE INDEX IF NOT EXISTS idx_artifacts_search_covering ON artifacts(type, language, repository_url) 
    INCLUDE (id, name, description, file_path, created_date, performance_impact) 
    WHERE embedding IS NOT NULL;

-- Covering index for graph traversal
CREATE INDEX IF NOT EXISTS idx_graph_edges_traversal_covering ON graph_edges(source_id, relation_type, confidence) 
    INCLUDE (target_id, weight, metadata, created_at);

-- Covering index for commit analysis
CREATE INDEX IF NOT EXISTS idx_commits_analysis_covering ON commits(repository_url, commit_date) 
    INCLUDE (commit_hash, author_email, message_subject, files_changed, lines_added, lines_deleted, risk_score);

-- Covering index for PR analysis
CREATE INDEX IF NOT EXISTS idx_prs_analysis_covering ON prs(repository_url, state, created_at_github) 
    INCLUDE (pr_number, title, author_login, files_changed, commits_count, risk_assessment);

-- =============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =============================================================================

-- Recent artifacts (last 30 days)
CREATE INDEX IF NOT EXISTS idx_artifacts_recent ON artifacts(type, created_date, repository_url) 
    WHERE created_date > (NOW() - INTERVAL '30 days');

-- High-confidence relationships
CREATE INDEX IF NOT EXISTS idx_graph_edges_high_confidence_partial ON graph_edges(source_id, target_id, relation_type) 
    WHERE confidence > 0.8;

-- Active query sessions
CREATE INDEX IF NOT EXISTS idx_query_sessions_active ON query_sessions(user_id, last_activity_at) 
    WHERE status = 'active';

-- Failed intermediates for debugging
CREATE INDEX IF NOT EXISTS idx_intermediates_failed ON intermediates(session_id, step_type, created_at) 
    WHERE status = 'failed';

-- Recent commits for hot path optimization
CREATE INDEX IF NOT EXISTS idx_commits_recent ON commits(repository_url, commit_date, author_email) 
    WHERE commit_date > (NOW() - INTERVAL '7 days');

-- Merged PRs for analysis
CREATE INDEX IF NOT EXISTS idx_prs_merged ON prs(repository_url, merged_at_github, author_login) 
    WHERE state = 'merged' AND merged_at_github IS NOT NULL;

-- =============================================================================
-- MAINTENANCE INDEXES
-- =============================================================================

-- Index for cleanup operations (finding orphaned relationships)
CREATE INDEX IF NOT EXISTS idx_graph_edges_orphan_check ON graph_edges(source_id, target_id);

-- Index for data retention policies
CREATE INDEX IF NOT EXISTS idx_query_logs_retention ON query_logs(created_at) 
    WHERE created_at < (NOW() - INTERVAL '90 days');

-- Index for session cleanup
CREATE INDEX IF NOT EXISTS idx_query_sessions_cleanup ON query_sessions(last_activity_at, status) 
    WHERE last_activity_at < (NOW() - INTERVAL '24 hours');

-- =============================================================================
-- UPDATE TABLE STATISTICS
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE artifacts;
ANALYZE graph_edges;
ANALYZE query_sessions;
ANALYZE intermediates;
ANALYZE commits;
ANALYZE prs;
ANALYZE cst_nodes;
ANALYZE artifact_keywords;
ANALYZE artifact_domains;
ANALYZE query_logs;
ANALYZE system_config;
ANALYZE schema_migrations;

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
    
    RAISE NOTICE 'TensorRT-LLM Knowledge Graph database indexes created successfully!';
    RAISE NOTICE 'Total indexes: %', index_count;
    RAISE NOTICE 'Vector search: HNSW indexes enabled for fast similarity search';
    RAISE NOTICE 'Full-text search: GIN indexes enabled for content search';
    RAISE NOTICE 'Graph traversal: Optimized indexes for relationship queries';
    RAISE NOTICE 'Performance: Covering and partial indexes for common query patterns';
    RAISE NOTICE 'Analytics: Comprehensive indexing for query performance monitoring';
END $$;