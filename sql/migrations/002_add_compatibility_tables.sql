-- =============================================================================
-- TensorRT Demo Compatibility Tables Migration
-- =============================================================================
-- 
-- This migration adds the missing tables needed for the original TensorRT demo
-- to work with the enhanced 12-table knowledge graph schema.
--
-- Version: 2.0.1
-- Created: 2025-01-24
-- Description: Add compatibility tables for original demo functionality
--

-- Knowledge patterns table for pattern discovery and learning
CREATE TABLE IF NOT EXISTS knowledge_patterns (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    language VARCHAR(50) NOT NULL,
    pattern TEXT NOT NULL,
    examples JSONB DEFAULT '[]',
    frequency INTEGER DEFAULT 1,
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    domain VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories table for tracking analyzed repositories
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_path TEXT UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    languages JSONB DEFAULT '[]',
    total_files INTEGER DEFAULT 0,
    total_entities INTEGER DEFAULT 0,
    domains JSONB DEFAULT '[]',
    analysis_version VARCHAR(50) DEFAULT '1.0.0',
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entity embeddings table (legacy compatibility - embeddings are stored in artifacts.embedding)  
CREATE TABLE IF NOT EXISTS entity_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    model VARCHAR(255) DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_entity_embedding UNIQUE (entity_id)
);

-- Add triggers for new compatibility tables (skip if they exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_repositories_updated_at') THEN
        CREATE TRIGGER update_repositories_updated_at 
            BEFORE UPDATE ON repositories 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_patterns_updated_at') THEN
        CREATE TRIGGER update_knowledge_patterns_updated_at 
            BEFORE UPDATE ON knowledge_patterns 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add indices for compatibility tables
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_language ON knowledge_patterns(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_domain ON knowledge_patterns(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_patterns_confidence ON knowledge_patterns(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_path ON repositories(repository_path);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity_id ON entity_embeddings(entity_id);

-- Update system configuration (skip if system_config table doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
        INSERT INTO system_config (key, value, description, category) VALUES
            ('compatibility_mode', '"true"', 'Enable compatibility with original demo schema', 'system'),
            ('demo_tables_version', '"2.0.1"', 'Version of demo compatibility tables', 'system')
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW();
    END IF;
END $$;

-- Record this migration
INSERT INTO schema_migrations (version, description) VALUES
    ('2.0.1', 'Added compatibility tables for original TensorRT demo functionality')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'TensorRT Demo compatibility tables added successfully!';
    RAISE NOTICE 'Migration version: 2.0.1';
    RAISE NOTICE 'Added tables: knowledge_patterns, repositories, entity_embeddings';
    RAISE NOTICE 'Original demo functionality restored with enhanced schema integration';
END $$;