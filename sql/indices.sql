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
