-- Unified schema for transformations, pattern learning, and embeddings
-- Based on Zod schemas in src/types/unified-schemas.ts

CREATE TABLE repository_metadata (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  languages JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE file_metadata (
  id UUID PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES repository_metadata(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  language TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  embedding FLOAT8[]
);

CREATE TABLE ast_node (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT,
  parent_id UUID REFERENCES ast_node(id) ON DELETE SET NULL,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  start_line INTEGER NOT NULL CHECK (start_line >= 1),
  end_line INTEGER NOT NULL CHECK (end_line >= 1),
  children UUID[] NOT NULL DEFAULT '{}',
  properties JSONB
);

CREATE TABLE vector_embedding (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  vector FLOAT8[] NOT NULL,
  model TEXT NOT NULL DEFAULT 'sentence-transformers',
  created_at TIMESTAMP
);

CREATE TABLE pattern_definition (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  language TEXT NOT NULL,
  ast_pattern JSONB,
  embedding FLOAT8[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Transformation results: links patterns, files, and embeddings
CREATE TABLE transformation_result (
  id UUID PRIMARY KEY,
  pattern_id UUID NOT NULL REFERENCES pattern_definition(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  ast_node_id UUID REFERENCES ast_node(id) ON DELETE SET NULL,
  embedding_id UUID REFERENCES vector_embedding(id) ON DELETE SET NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pattern-embedding relationship (many-to-many, if needed)
CREATE TABLE pattern_embedding (
  pattern_id UUID NOT NULL REFERENCES pattern_definition(id) ON DELETE CASCADE,
  embedding_id UUID NOT NULL REFERENCES vector_embedding(id) ON DELETE CASCADE,
  PRIMARY KEY (pattern_id, embedding_id)
);

-- Telemetry events (minimal, extensible)
CREATE TABLE telemetry_event (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID,
  repository_id UUID REFERENCES repository_metadata(id) ON DELETE SET NULL,
  file_id UUID REFERENCES file_metadata(id) ON DELETE SET NULL,
  pattern_id UUID REFERENCES pattern_definition(id) ON DELETE SET NULL,
  details JSONB
);

-- Indexes for efficient lookups
CREATE INDEX idx_file_repository ON file_metadata(repository_id);
CREATE INDEX idx_astnode_file ON ast_node(file_id);
CREATE INDEX idx_vector_file ON vector_embedding(file_id);
CREATE INDEX idx_pattern_language ON pattern_definition(language);
CREATE INDEX idx_transformation_pattern ON transformation_result(pattern_id);
CREATE INDEX idx_transformation_file ON transformation_result(file_id);