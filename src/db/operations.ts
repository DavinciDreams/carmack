/**
 * Database Operations and Query Builders for TensorRT-LLM Knowledge Graph
 *
 * Provides type-safe database operations, query builders, and utilities for
 * interacting with the knowledge graph database. Follows Carmack's principles
 * of provable correctness and performance optimization.
 */

import type { PoolClient } from 'pg';
import { z } from 'zod';
import { getDatabaseManager } from './connection.ts';
import {
  type Artifact,
  type GraphEdge,
  type QuerySession,
  type Intermediate,
  type Commit,
  type PR,
  type CSTNode,
  type ArtifactKeyword,
  type ArtifactDomain,
  type QueryLog,
  type CreateArtifactInput,
  type UpdateArtifactInput,
  type CreateGraphEdgeInput,
  type SearchFilters,
  type SemanticSearchInput,
  type GraphTraversalInput,
  type SearchResult,
  type GraphTraversalResult,
  type DatabaseOperationResult,
  ArtifactSchema,
  GraphEdgeSchema,
  QuerySessionSchema,
  IntermediateSchema,
  CommitSchema,
  PRSchema,
  CSTNodeSchema,
  ArtifactKeywordSchema,
  ArtifactDomainSchema,
  QueryLogSchema,
  validateArtifact,
  validateGraphEdge,
  validateSemanticSearch,
  validateGraphTraversal,
} from './schema.ts';

// =============================================================================
// DATABASE OPERATION ERRORS
// =============================================================================

export class DatabaseOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseOperationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// ARTIFACT OPERATIONS
// =============================================================================

export class ArtifactOperations {
  private db = getDatabaseManager();

  /**
   * Create a new artifact
   */
  async create(input: CreateArtifactInput): Promise<Artifact> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = validateArtifact({ ...input, id: crypto.randomUUID() });
      
      const query = `
        INSERT INTO artifacts (
          id, type, name, description, content, file_path, line_start, line_end,
          language, repository_url, commit_hash, author_name, author_email,
          created_date, modified_date, embedding, metadata, complexity_score,
          performance_impact, quality_score
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `;
      
      const values = [
        validatedInput.id,
        validatedInput.type,
        validatedInput.name,
        validatedInput.description,
        validatedInput.content,
        validatedInput.file_path,
        validatedInput.line_start,
        validatedInput.line_end,
        validatedInput.language,
        validatedInput.repository_url,
        validatedInput.commit_hash,
        validatedInput.author_name,
        validatedInput.author_email,
        validatedInput.created_date,
        validatedInput.modified_date,
        validatedInput.embedding ? JSON.stringify(validatedInput.embedding) : null,
        JSON.stringify(validatedInput.metadata),
        validatedInput.complexity_score,
        validatedInput.performance_impact,
        validatedInput.quality_score,
      ];
      
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseOperationError(
          'Failed to create artifact',
          'create',
          'NO_ROWS_RETURNED'
        );
      }
      
      return this.mapRowToArtifact(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid artifact data', error);
      }
      
      throw new DatabaseOperationError(
        'Failed to create artifact',
        'create',
        'UNKNOWN_ERROR',
        { 
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Get artifact by ID
   */
  async getById(id: string): Promise<Artifact | null> {
    try {
      const query = 'SELECT * FROM artifacts WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToArtifact(result.rows[0]);
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to get artifact by ID',
        'getById',
        'QUERY_ERROR',
        { id, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update artifact
   */
  async update(id: string, input: UpdateArtifactInput): Promise<Artifact> {
    const startTime = Date.now();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          
          // Handle special cases for JSON fields
          if (key === 'metadata' || key === 'embedding') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new DatabaseOperationError(
          'No fields to update',
          'update',
          'NO_UPDATE_FIELDS'
        );
      }
      
      // Add updated_at field
      updateFields.push(`updated_at = NOW()`);
      
      // Add ID parameter
      values.push(id);
      
      const query = `
        UPDATE artifacts 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseOperationError(
          'Artifact not found',
          'update',
          'NOT_FOUND',
          { id }
        );
      }
      
      return this.mapRowToArtifact(result.rows[0]);
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to update artifact',
        'update',
        'UPDATE_ERROR',
        { 
          id,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Delete artifact
   */
  async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM artifacts WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to delete artifact',
        'delete',
        'DELETE_ERROR',
        { id, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Search artifacts with filters
   */
  async search(filters: SearchFilters, limit = 50, offset = 0): Promise<Artifact[]> {
    try {
      const { whereClause, values } = this.buildWhereClause(filters);
      
      const query = `
        SELECT * FROM artifacts
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
      
      const result = await this.db.query(query, [...values, limit, offset]);
      
      return result.rows.map(row => this.mapRowToArtifact(row));
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to search artifacts',
        'search',
        'SEARCH_ERROR',
        { filters, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(input: SemanticSearchInput): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      const validatedInput = validateSemanticSearch(input);
      
      if (!validatedInput.embedding) {
        throw new DatabaseOperationError(
          'Embedding is required for semantic search',
          'semanticSearch',
          'MISSING_EMBEDDING'
        );
      }
      
      const { whereClause, values } = this.buildWhereClause(validatedInput.filters || {});
      let paramIndex = values.length + 1;
      
      const query = `
        SELECT 
          a.*,
          (1 - (a.embedding <=> $${paramIndex}::vector)) as similarity_score
        FROM artifacts a
        ${whereClause}
        AND a.embedding IS NOT NULL
        AND (1 - (a.embedding <=> $${paramIndex}::vector)) >= $${paramIndex + 1}
        ORDER BY a.embedding <=> $${paramIndex}::vector
        LIMIT $${paramIndex + 2}
      `;
      
      const searchValues = [
        ...values,
        JSON.stringify(validatedInput.embedding),
        validatedInput.threshold,
        validatedInput.limit,
      ];
      
      const result = await this.db.query(query, searchValues);
      
      return result.rows.map(row => ({
        artifact: this.mapRowToArtifact(row),
        score: parseFloat(row.similarity_score),
        match_type: 'semantic' as const,
        explanation: `Vector similarity: ${(parseFloat(row.similarity_score) * 100).toFixed(1)}%`,
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid semantic search input', error);
      }
      
      throw new DatabaseOperationError(
        'Failed to perform semantic search',
        'semanticSearch',
        'SEMANTIC_SEARCH_ERROR',
        { 
          input,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Batch create artifacts
   */
  async batchCreate(artifacts: CreateArtifactInput[]): Promise<Artifact[]> {
    const startTime = Date.now();
    
    if (artifacts.length === 0) {
      return [];
    }
    
    if (artifacts.length > 1000) {
      throw new DatabaseOperationError(
        'Batch size too large',
        'batchCreate',
        'BATCH_SIZE_EXCEEDED',
        { maxSize: 1000, actualSize: artifacts.length }
      );
    }
    
    return this.db.transaction(async (client) => {
      const results: Artifact[] = [];
      
      // Process in smaller batches to avoid parameter limits
      const batchSize = 100;
      for (let i = 0; i < artifacts.length; i += batchSize) {
        const batch = artifacts.slice(i, i + batchSize);
        const batchResults = await this.batchCreateChunk(client, batch);
        results.push(...batchResults);
      }
      
      return results;
    });
  }

  /**
   * Helper method to create a chunk of artifacts
   */
  private async batchCreateChunk(client: PoolClient, artifacts: CreateArtifactInput[]): Promise<Artifact[]> {
    const values: any[] = [];
    const valueStrings: string[] = [];
    
    artifacts.forEach((artifact, index) => {
      const validated = validateArtifact({ ...artifact, id: crypto.randomUUID() });
      const baseIndex = index * 20;
      
      valueStrings.push(`(
        $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5},
        $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10},
        $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15},
        $${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}, $${baseIndex + 19}, $${baseIndex + 20}
      )`);
      
      values.push(
        validated.id,
        validated.type,
        validated.name,
        validated.description,
        validated.content,
        validated.file_path,
        validated.line_start,
        validated.line_end,
        validated.language,
        validated.repository_url,
        validated.commit_hash,
        validated.author_name,
        validated.author_email,
        validated.created_date,
        validated.modified_date,
        validated.embedding ? JSON.stringify(validated.embedding) : null,
        JSON.stringify(validated.metadata),
        validated.complexity_score,
        validated.performance_impact,
        validated.quality_score
      );
    });
    
    const query = `
      INSERT INTO artifacts (
        id, type, name, description, content, file_path, line_start, line_end,
        language, repository_url, commit_hash, author_name, author_email,
        created_date, modified_date, embedding, metadata, complexity_score,
        performance_impact, quality_score
      ) VALUES ${valueStrings.join(', ')}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    return result.rows.map(row => this.mapRowToArtifact(row));
  }

  /**
   * Build WHERE clause for search filters
   */
  private buildWhereClause(filters: SearchFilters): { whereClause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (filters.types && filters.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex})`);
      values.push(filters.types);
      paramIndex++;
    }
    
    if (filters.languages && filters.languages.length > 0) {
      conditions.push(`language = ANY($${paramIndex})`);
      values.push(filters.languages);
      paramIndex++;
    }
    
    if (filters.repositories && filters.repositories.length > 0) {
      conditions.push(`repository_url = ANY($${paramIndex})`);
      values.push(filters.repositories);
      paramIndex++;
    }
    
    if (filters.authors && filters.authors.length > 0) {
      conditions.push(`author_email = ANY($${paramIndex})`);
      values.push(filters.authors);
      paramIndex++;
    }
    
    if (filters.date_range) {
      conditions.push(`created_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      values.push(filters.date_range.start, filters.date_range.end);
      paramIndex += 2;
    }
    
    if (filters.performance_impact && filters.performance_impact.length > 0) {
      conditions.push(`performance_impact = ANY($${paramIndex})`);
      values.push(filters.performance_impact);
      paramIndex++;
    }
    
    if (filters.min_quality_score !== undefined) {
      conditions.push(`quality_score >= $${paramIndex}`);
      values.push(filters.min_quality_score);
      paramIndex++;
    }
    
    if (filters.min_complexity_score !== undefined) {
      conditions.push(`complexity_score >= $${paramIndex}`);
      values.push(filters.min_complexity_score);
      paramIndex++;
    }
    
    if (filters.has_embedding !== undefined) {
      if (filters.has_embedding) {
        conditions.push('embedding IS NOT NULL');
      } else {
        conditions.push('embedding IS NULL');
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, values };
  }

  /**
   * Map database row to Artifact object
   */
  private mapRowToArtifact(row: any): Artifact {
    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      created_date: row.created_date ? new Date(row.created_date) : undefined,
      modified_date: row.modified_date ? new Date(row.modified_date) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

// =============================================================================
// GRAPH EDGE OPERATIONS
// =============================================================================

export class GraphEdgeOperations {
  private db = getDatabaseManager();

  /**
   * Create a new graph edge
   */
  async create(input: CreateGraphEdgeInput): Promise<GraphEdge> {
    try {
      const validated = validateGraphEdge({ ...input, id: crypto.randomUUID() });
      
      const query = `
        INSERT INTO graph_edges (
          id, source_id, target_id, relation_type, confidence, weight,
          is_bidirectional, metadata, evidence, evidence_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        validated.id,
        validated.source_id,
        validated.target_id,
        validated.relation_type,
        validated.confidence,
        validated.weight,
        validated.is_bidirectional,
        JSON.stringify(validated.metadata),
        validated.evidence,
        validated.evidence_type,
      ];
      
      const result = await this.db.query(query, values);
      
      return this.mapRowToGraphEdge(result.rows[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid graph edge data', error);
      }
      
      throw new DatabaseOperationError(
        'Failed to create graph edge',
        'create',
        'CREATE_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Graph traversal with configurable depth and filters
   */
  async traverse(input: GraphTraversalInput): Promise<GraphTraversalResult> {
    const startTime = Date.now();
    
    try {
      const validated = validateGraphTraversal(input);
      
      const relationFilter = validated.relation_types && validated.relation_types.length > 0
        ? `AND ge.relation_type = ANY($4)`
        : '';
      
      const directionClause = this.buildDirectionClause(validated.direction);
      
      const query = `
        WITH RECURSIVE graph_traversal AS (
          -- Base case: start artifact
          SELECT 
            a.id as artifact_id,
            a.*,
            NULL::uuid as edge_id,
            NULL::graph_edges as edge,
            0 as depth,
            ARRAY[a.id] as path
          FROM artifacts a
          WHERE a.id = $1
          
          UNION ALL
          
          -- Recursive case: follow edges
          SELECT 
            target_a.id as artifact_id,
            target_a.*,
            ge.id as edge_id,
            ge.*,
            gt.depth + 1,
            gt.path || target_a.id
          FROM graph_traversal gt
          JOIN graph_edges ge ON ${directionClause}
          JOIN artifacts target_a ON ${this.getTargetClause(validated.direction)}
          WHERE gt.depth < $2
            AND ge.confidence >= $3
            ${relationFilter}
            AND NOT (target_a.id = ANY(gt.path)) -- Prevent cycles
        )
        SELECT * FROM graph_traversal
        ORDER BY depth, artifact_id
        LIMIT $${validated.relation_types ? 5 : 4}
      `;
      
      const values = [
        validated.start_artifact_id,
        validated.max_depth,
        validated.min_confidence,
      ];
      
      if (validated.relation_types && validated.relation_types.length > 0) {
        values.push(validated.relation_types as any);
      }
      
      values.push(validated.limit);
      
      const result = await this.db.query(query, values);
      
      // Group results by path
      const pathMap = new Map<string, any[]>();
      let maxDepth = 0;
      
      for (const row of result.rows) {
        const pathKey = row.path.join('->');
        if (!pathMap.has(pathKey)) {
          pathMap.set(pathKey, []);
        }
        pathMap.get(pathKey)!.push(row);
        maxDepth = Math.max(maxDepth, row.depth);
      }
      
      const paths = Array.from(pathMap.values()).map(pathRows => ({
        path: pathRows.map(row => ({
          artifact: this.mapRowToArtifact(row),
          edge: row.edge_id ? this.mapRowToGraphEdge(row) : undefined,
          depth: row.depth,
        })),
      }));
      
      return {
        path: paths.length > 0 ? paths[0]?.path || [] : [],
        total_paths: paths.length,
        max_depth_reached: maxDepth,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid graph traversal input', error);
      }
      
      throw new DatabaseOperationError(
        'Failed to traverse graph',
        'traverse',
        'TRAVERSAL_ERROR',
        { 
          input,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Get edges by source artifact ID
   */
  async getBySourceId(sourceId: string, limit = 100): Promise<GraphEdge[]> {
    try {
      const query = `
        SELECT * FROM graph_edges 
        WHERE source_id = $1 
        ORDER BY confidence DESC, created_at DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [sourceId, limit]);
      
      return result.rows.map(row => this.mapRowToGraphEdge(row));
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to get edges by source ID',
        'getBySourceId',
        'QUERY_ERROR',
        { sourceId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get edges by target artifact ID
   */
  async getByTargetId(targetId: string, limit = 100): Promise<GraphEdge[]> {
    try {
      const query = `
        SELECT * FROM graph_edges 
        WHERE target_id = $1 
        ORDER BY confidence DESC, created_at DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [targetId, limit]);
      
      return result.rows.map(row => this.mapRowToGraphEdge(row));
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to get edges by target ID',
        'getByTargetId',
        'QUERY_ERROR',
        { targetId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Build direction clause for graph traversal
   */
  private buildDirectionClause(direction: 'outgoing' | 'incoming' | 'both'): string {
    switch (direction) {
      case 'outgoing':
        return 'gt.artifact_id = ge.source_id';
      case 'incoming':
        return 'gt.artifact_id = ge.target_id';
      case 'both':
        return '(gt.artifact_id = ge.source_id OR gt.artifact_id = ge.target_id)';
    }
  }

  /**
   * Get target clause for graph traversal
   */
  private getTargetClause(direction: 'outgoing' | 'incoming' | 'both'): string {
    switch (direction) {
      case 'outgoing':
        return 'target_a.id = ge.target_id';
      case 'incoming':
        return 'target_a.id = ge.source_id';
      case 'both':
        return '(target_a.id = ge.target_id OR target_a.id = ge.source_id)';
    }
  }

  /**
   * Map database row to GraphEdge object
   */
  private mapRowToGraphEdge(row: any): GraphEdge {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to Artifact object (for traversal results)
   */
  private mapRowToArtifact(row: any): Artifact {
    return {
      id: row.artifact_id || row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      content: row.content,
      file_path: row.file_path,
      line_start: row.line_start,
      line_end: row.line_end,
      language: row.language,
      repository_url: row.repository_url,
      commit_hash: row.commit_hash,
      author_name: row.author_name,
      author_email: row.author_email,
      created_date: row.created_date ? new Date(row.created_date) : undefined,
      modified_date: row.modified_date ? new Date(row.modified_date) : undefined,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      complexity_score: row.complexity_score,
      performance_impact: row.performance_impact,
      quality_score: row.quality_score,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

// =============================================================================
// QUERY SESSION OPERATIONS
// =============================================================================

export class QuerySessionOperations {
  private db = getDatabaseManager();

  /**
   * Create a new query session
   */
  async create(sessionToken: string, userId?: string): Promise<QuerySession> {
    try {
      const query = `
        INSERT INTO query_sessions (id, session_token, user_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const values = [crypto.randomUUID(), sessionToken, userId];
      const result = await this.db.query(query, values);
      
      return this.mapRowToQuerySession(result.rows[0]);
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to create query session',
        'create',
        'CREATE_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get session by token
   */
  async getByToken(sessionToken: string): Promise<QuerySession | null> {
    try {
      const query = 'SELECT * FROM query_sessions WHERE session_token = $1';
      const result = await this.db.query(query, [sessionToken]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToQuerySession(result.rows[0]);
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to get session by token',
        'getByToken',
        'QUERY_ERROR',
        { sessionToken, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update session context
   */
  async updateContext(sessionId: string, context: Record<string, unknown>): Promise<void> {
    try {
      const query = `
        UPDATE query_sessions 
        SET current_context = $1, last_activity_at = NOW()
        WHERE id = $2
      `;
      
      await this.db.query(query, [JSON.stringify(context), sessionId]);
    } catch (error) {
      throw new DatabaseOperationError(
        'Failed to update session context',
        'updateContext',
        'UPDATE_ERROR',
        { sessionId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Map database row to QuerySession object
   */
  private mapRowToQuerySession(row: any): QuerySession {
    return {
      ...row,
      current_context: row.current_context ? JSON.parse(row.current_context) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      started_at: new Date(row.started_at),
      last_activity_at: new Date(row.last_activity_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

// =============================================================================
// MAIN DATABASE OPERATIONS CLASS
// =============================================================================

export class DatabaseOperations {
  public readonly artifacts = new ArtifactOperations();
  public readonly edges = new GraphEdgeOperations();
  public readonly sessions = new QuerySessionOperations();

  /**
   * Execute a raw query with proper error handling
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const db = getDatabaseManager();
    return db.query<T>(text, params);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const db = getDatabaseManager();
    return db.transaction(callback);
  }

  /**
   * Get database health status
   */
  async healthCheck(): Promise<DatabaseOperationResult> {
    const startTime = Date.now();
    
    try {
      const db = getDatabaseManager();
      const health = await db.healthCheck();
      
      return {
        success: health.isHealthy,
        affected_rows: 0,
        execution_time_ms: Date.now() - startTime,
        data: health,
      };
    } catch (error) {
      return {
        success: false,
        affected_rows: 0,
        execution_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _databaseOperations: DatabaseOperations | null = null;

/**
 * Get the global database operations instance
 */
export function getDatabaseOperations(): DatabaseOperations {
  if (!_databaseOperations) {
    _databaseOperations = new DatabaseOperations();
  }
  return _databaseOperations;
}
