
import { getDatabaseOperations } from '../db/operations.ts';

import {
  validateQueryRequest,
  type QueryRequest,
  type QueryResponse,
  type QueryIntent,
  type QueryComplexity,
  type EvidenceItem,
} from './contracts.ts';
import type {
  Artifact,
  SearchResult,
  SearchFilters,
  SemanticSearchInput,
} from '../db/schema.ts';

/**
 * Core Query Engine for TensorRT-LLM Knowledge Graph
 *
 * Implements hybrid retrieval system combining BM25 full-text search with
 * vector similarity search, query optimization, and result ranking.
 * Follows Carmack's principles of performance optimization and correctness.
 */



// =============================================================================
// QUERY ENGINE ERRORS
// =============================================================================

export class QueryEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'QueryEngineError';
  }
}

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

// =============================================================================
// INTENT CLASSIFICATION
// =============================================================================

/**
 * Intent classification patterns for different query types
 */
const INTENT_PATTERNS = {
  technical_question: [
    /how\s+does\s+.*\s+work/i,
    /what\s+is\s+.*\s+used\s+for/i,
    /explain\s+.*\s+implementation/i,
    /show\s+me\s+.*\s+code/i,
    /find\s+.*\s+function/i,
  ],
  historical_analysis: [
    /what\s+changed/i,
    /evolution\s+of/i,
    /history\s+of/i,
    /when\s+was\s+.*\s+introduced/i,
    /recent\s+commits/i,
    /changes\s+in/i,
  ],
  performance_investigation: [
    /performance/i,
    /optimization/i,
    /bottleneck/i,
    /slow/i,
    /fast/i,
    /efficient/i,
    /memory\s+usage/i,
    /cpu\s+usage/i,
    /gpu\s+usage/i,
  ],
  code_understanding: [
    /understand\s+.*\s+code/i,
    /code\s+structure/i,
    /implementation\s+details/i,
    /source\s+code/i,
    /algorithm/i,
  ],
  architecture_exploration: [
    /architecture/i,
    /design\s+pattern/i,
    /component/i,
    /module/i,
    /system\s+design/i,
    /structure/i,
  ],
  debugging_assistance: [
    /debug/i,
    /error/i,
    /bug/i,
    /issue/i,
    /problem/i,
    /fix/i,
    /troubleshoot/i,
  ],
  optimization_advice: [
    /optimize/i,
    /improve\s+performance/i,
    /make\s+.*\s+faster/i,
    /reduce\s+memory/i,
    /best\s+practice/i,
  ],
  pattern_discovery: [
    /pattern/i,
    /common\s+approach/i,
    /typical\s+usage/i,
    /convention/i,
    /standard\s+way/i,
  ],
};

/**
 * Domain-specific keywords for TensorRT-LLM
 */
const DOMAIN_KEYWORDS = {
  inference: ['inference', 'execute', 'run', 'predict', 'forward', 'context'],
  optimization: ['optimize', 'fuse', 'quantize', 'precision', 'fp16', 'int8'],
  memory_management: ['memory', 'buffer', 'allocation', 'cuda', 'device', 'host'],
  kernel_execution: ['kernel', 'launch', 'grid', 'block', 'thread', 'sync'],
  graph_construction: ['network', 'layer', 'build', 'graph', 'node'],
  serialization: ['serialize', 'save', 'load', 'engine', 'plan'],
  plugin_system: ['plugin', 'custom', 'operator', 'creator'],
  builder_api: ['builder', 'config', 'profile', 'workspace'],
  runtime_api: ['runtime', 'context', 'binding', 'tensor'],
  parser: ['parser', 'onnx', 'uff', 'caffe', 'model'],
};

// =============================================================================
// EMBEDDING SERVICE
// =============================================================================

/**
 * Simple embedding service interface
 * In production, this would integrate with actual embedding models
 */
export class EmbeddingService {
  private static instance: EmbeddingService | null = null;

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate embeddings for text
   * For now, returns mock embeddings - in production would use actual model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Mock embedding generation - 384 dimensions
      // In production, this would call an actual embedding model
      const embedding = new Array(384).fill(0).map(() => Math.random() * 2 - 1);
      
      // Add some deterministic component based on text content
      const textHash = this.simpleHash(text);
      for (let i = 0; i < 384; i++) {
        embedding[i]! += Math.sin(textHash + i) * 0.1;
      }
      
      // Normalize
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / magnitude);
    } catch (error) {
      throw new EmbeddingError(
        'Failed to generate embedding',
        { text: text.substring(0, 100), error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Simple hash function for deterministic mock embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// =============================================================================
// HYBRID SEARCH ENGINE
// =============================================================================

/**
 * Hybrid search combining BM25 and vector similarity
 */
export class HybridSearchEngine {
  private db = getDatabaseOperations();
  private embeddingService = EmbeddingService.getInstance();

  /**
   * Perform hybrid search combining keyword and semantic search
   */
  async search(query: string, options: {
    filters?: SearchFilters;
    limit?: number;
    semantic_weight?: number;
    keyword_weight?: number;
    threshold?: number;
  } = {}): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      const {
        filters = {},
        limit = 20,
        semantic_weight = 0.7,
        keyword_weight = 0.3,
        threshold = 0.3,
      } = options;

      // Generate embedding for semantic search
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Perform semantic search
      const semanticResults = await this.performSemanticSearch(query, queryEmbedding, {
        filters,
        limit: Math.min(limit * 2, 100), // Get more results for ranking
        threshold: threshold * 0.8, // Lower threshold for initial retrieval
      });

      // Perform keyword search (BM25-style)
      const keywordResults = await this.performKeywordSearch(query, {
        filters,
        limit: Math.min(limit * 2, 100),
      });

      // Combine and rank results
      const combinedResults = this.combineAndRankResults(
        semanticResults,
        keywordResults,
        semantic_weight,
        keyword_weight
      );

      // Apply final threshold and limit
      const filteredResults = combinedResults
        .filter(result => result.score >= threshold)
        .slice(0, limit);

      return filteredResults;
    } catch (error) {
      throw new QueryEngineError(
        'Hybrid search failed',
        'HYBRID_SEARCH_ERROR',
        {
          query,
          options,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Perform semantic search using vector similarity
   */
  private async performSemanticSearch(
    query: string,
    embedding: number[],
    options: {
      filters?: SearchFilters;
      limit?: number;
      threshold?: number;
    }
  ): Promise<SearchResult[]> {
    const semanticInput: SemanticSearchInput = {
      query,
      embedding,
      filters: options.filters,
      limit: options.limit || 50,
      threshold: options.threshold || 0.3,
      include_metadata: true,
    };

    return await this.db.artifacts.semanticSearch(semanticInput);
  }

  /**
   * Perform keyword search (BM25-style using PostgreSQL full-text search)
   */
  private async performKeywordSearch(
    query: string,
    options: {
      filters?: SearchFilters;
      limit?: number;
    }
  ): Promise<SearchResult[]> {
    try {
      // Use PostgreSQL full-text search
      const { whereClause, values } = this.buildKeywordSearchQuery(query, options.filters || {});
      
      const searchQuery = `
        SELECT 
          a.*,
          ts_rank_cd(
            to_tsvector('english', COALESCE(a.name, '') || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.content, '')),
            plainto_tsquery('english', $1)
          ) as keyword_score
        FROM artifacts a
        ${whereClause}
        AND to_tsvector('english', COALESCE(a.name, '') || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.content, ''))
            @@ plainto_tsquery('english', $1)
        ORDER BY keyword_score DESC
        LIMIT $${values.length + 2}
      `;

      const result = await this.db.query(searchQuery, [query, ...values, options.limit || 50]);

      return result.rows.map(row => ({
        artifact: this.mapRowToArtifact(row),
        score: parseFloat(row.keyword_score) || 0,
        match_type: 'keyword' as const,
        explanation: `Keyword match score: ${(parseFloat(row.keyword_score) * 100).toFixed(1)}%`,
      }));
    } catch (error) {
      // Fallback to simple ILIKE search if full-text search fails
      return await this.performSimpleKeywordSearch(query, options);
    }
  }

  /**
   * Fallback simple keyword search using ILIKE
   */
  private async performSimpleKeywordSearch(
    query: string,
    options: {
      filters?: SearchFilters;
      limit?: number;
    }
  ): Promise<SearchResult[]> {
    const { whereClause, values } = this.buildKeywordSearchQuery('', options.filters || {});
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    
    if (keywords.length === 0) {
      return [];
    }

    const likeConditions = keywords.map((_, i) => 
      `(LOWER(a.name) LIKE $${values.length + i + 2} OR LOWER(a.description) LIKE $${values.length + i + 2} OR LOWER(a.content) LIKE $${values.length + i + 2})`
    ).join(' AND ');

    const searchQuery = `
      SELECT a.*, 
        (${keywords.map((_, i) => `
          CASE WHEN LOWER(a.name) LIKE $${values.length + i + 2} THEN 3 ELSE 0 END +
          CASE WHEN LOWER(a.description) LIKE $${values.length + i + 2} THEN 2 ELSE 0 END +
          CASE WHEN LOWER(a.content) LIKE $${values.length + i + 2} THEN 1 ELSE 0 END
        `).join(' + ')}) as keyword_score
      FROM artifacts a
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} (${likeConditions})
      ORDER BY keyword_score DESC
      LIMIT $${values.length + keywords.length + 2}
    `;

    const likeValues = keywords.map(k => `%${k}%`);
    const result = await this.db.query(searchQuery, [...values, ...likeValues, options.limit || 50]);

    return result.rows.map(row => ({
      artifact: this.mapRowToArtifact(row),
      score: Math.min(parseFloat(row.keyword_score) / (keywords.length * 3), 1),
      match_type: 'fuzzy' as const,
      explanation: `Fuzzy keyword match`,
    }));
  }

  /**
   * Build WHERE clause for keyword search
   */
  private buildKeywordSearchQuery(query: string, filters: SearchFilters): { whereClause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 since $1 is reserved for query

    if (filters.types && filters.types.length > 0) {
      conditions.push(`a.type = ANY($${paramIndex})`);
      values.push(filters.types);
      paramIndex++;
    }

    if (filters.languages && filters.languages.length > 0) {
      conditions.push(`a.language = ANY($${paramIndex})`);
      values.push(filters.languages);
      paramIndex++;
    }

    if (filters.repositories && filters.repositories.length > 0) {
      conditions.push(`a.repository_url = ANY($${paramIndex})`);
      values.push(filters.repositories);
      paramIndex++;
    }

    if (filters.min_quality_score !== undefined) {
      conditions.push(`a.quality_score >= $${paramIndex}`);
      values.push(filters.min_quality_score);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /**
   * Combine and rank results from semantic and keyword search
   */
  private combineAndRankResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results
    for (const result of semanticResults) {
      resultMap.set(result.artifact.id, {
        ...result,
        score: result.score * semanticWeight,
        match_type: 'semantic',
      });
    }

    // Add or combine keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.artifact.id);
      if (existing) {
        // Combine scores
        existing.score = existing.score + (result.score * keywordWeight);
        existing.match_type = 'hybrid' as any;
        existing.explanation = `Hybrid match: semantic + keyword`;
      } else {
        resultMap.set(result.artifact.id, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    }

    // Sort by combined score
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score);
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
// QUERY ENGINE CORE
// =============================================================================

/**
 * Main Query Engine class
 */
export class QueryEngine {
  private hybridSearch = new HybridSearchEngine();
  private embeddingService = EmbeddingService.getInstance();

  /**
   * Process a query request and return intelligent results
   */
  async processQuery(request: QueryRequest): Promise<Omit<QueryResponse, 'query_id' | 'session_id'>> {
    const startTime = Date.now();
    
    try {
      const validatedRequest = validateQueryRequest(request);
      
      // Classify query intent and complexity
      const intent = this.classifyIntent(validatedRequest.query);
      const complexity = this.assessComplexity(validatedRequest.query, intent);
      
      // Perform hybrid search
      const searchResults = await this.hybridSearch.search(validatedRequest.query, {
        filters: this.buildSearchFilters(validatedRequest.context),
        limit: validatedRequest.options?.max_results || 20,
        semantic_weight: this.getSemanticWeight(intent),
        keyword_weight: this.getKeywordWeight(intent),
        threshold: this.getThreshold(complexity),
      });

      // Convert search results to evidence items
      const evidenceChain = this.buildEvidenceChain(searchResults, validatedRequest.options?.include_code_snippets);
      
      // Generate primary answer
      const primaryAnswer = this.generatePrimaryAnswer(validatedRequest.query, intent, evidenceChain);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(evidenceChain, searchResults.length);
      
      // Generate investigation threads and suggestions
      const investigationThreads = this.generateInvestigationThreads(intent, evidenceChain);
      const suggestedQuestions = this.generateSuggestedQuestions(intent, evidenceChain);

      const executionTime = Date.now() - startTime;

      return {
        intent,
        complexity,
        primary_answer: primaryAnswer,
        evidence_chain: evidenceChain,
        confidence_score: confidenceScore,
        investigation_threads: investigationThreads,
        suggested_questions: suggestedQuestions,
        execution_time_ms: executionTime,
        artifacts_searched: searchResults.length,
        relationships_traversed: 0, // Will be updated when graph walker is implemented
        session_context: this.buildSessionContext(validatedRequest, searchResults),
        created_at: new Date(),
      };
    } catch (error) {
      throw new QueryEngineError(
        'Query processing failed',
        'QUERY_PROCESSING_ERROR',
        {
          request,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Classify query intent based on patterns
   */
  private classifyIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerQuery)) {
          return intent as QueryIntent;
        }
      }
    }

    return 'technical_question'; // Default intent
  }

  /**
   * Assess query complexity
   */
  private assessComplexity(query: string, intent: QueryIntent): QueryComplexity {
    const words = query.split(/\s+/).length;
    const hasSpecificTerms = /\b(implementation|architecture|optimization|performance)\b/i.test(query);
    const hasMultipleConcepts = (query.match(/\band\b|\bor\b|\bbut\b/gi) || []).length > 0;

    if (words > 20 || (hasSpecificTerms && hasMultipleConcepts)) {
      return 'expert';
    } else if (words > 10 || hasSpecificTerms) {
      return 'complex';
    } else if (words > 5) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  /**
   * Build search filters from query context
   */
  private buildSearchFilters(context?: QueryRequest['context']): SearchFilters {
    const filters: SearchFilters = {};

    if (context?.language_hint) {
      filters.languages = [context.language_hint];
    }

    if (context?.repository_url) {
      filters.repositories = [context.repository_url];
    }

    return filters;
  }

  /**
   * Get semantic weight based on intent
   */
  private getSemanticWeight(intent: QueryIntent): number {
    const weights = {
      technical_question: 0.8,
      code_understanding: 0.9,
      architecture_exploration: 0.7,
      pattern_discovery: 0.8,
      historical_analysis: 0.5,
      performance_investigation: 0.6,
      debugging_assistance: 0.6,
      optimization_advice: 0.7,
    };
    return weights[intent] || 0.7;
  }

  /**
   * Get keyword weight based on intent
   */
  private getKeywordWeight(intent: QueryIntent): number {
    return 1.0 - this.getSemanticWeight(intent);
  }

  /**
   * Get threshold based on complexity
   */
  private getThreshold(complexity: QueryComplexity): number {
    const thresholds = {
      simple: 0.5,
      moderate: 0.4,
      complex: 0.3,
      expert: 0.2,
    };
    return thresholds[complexity];
  }

  /**
   * Build evidence chain from search results
   */
  private buildEvidenceChain(
    searchResults: SearchResult[],
    includeCodeSnippets?: boolean
  ): EvidenceItem[] {
    return searchResults.slice(0, 10).map(result => ({
      artifact_id: result.artifact.id,
      artifact_name: result.artifact.name,
      artifact_type: result.artifact.type,
      relevance_score: result.score,
      explanation: result.explanation || `${result.match_type} match`,
      file_path: result.artifact.file_path,
      line_range: result.artifact.line_start && result.artifact.line_end ? {
        start: result.artifact.line_start,
        end: result.artifact.line_end,
      } : undefined,
      content_snippet: includeCodeSnippets ? 
        (result.artifact.content?.substring(0, 500) || result.artifact.description?.substring(0, 200)) : 
        undefined,
    }));
  }

  /**
   * Generate primary answer based on evidence
   */
  private generatePrimaryAnswer(query: string, intent: QueryIntent, evidence: EvidenceItem[]): string {
    if (evidence.length === 0) {
      return `I couldn't find specific information about "${query}". Try rephrasing your question or using different keywords.`;
    }

    const topEvidence = evidence.slice(0, 3);
    const intentPrefix = this.getIntentPrefix(intent);
    
    let answer = `${intentPrefix} Based on the analysis of ${evidence.length} relevant artifacts:\n\n`;
    
    topEvidence.forEach((item, index) => {
      answer += `${index + 1}. **${item.artifact_name}** (${item.artifact_type})\n`;
      answer += `   - Relevance: ${(item.relevance_score * 100).toFixed(1)}%\n`;
      if (item.file_path) {
        answer += `   - Location: ${item.file_path}\n`;
      }
      answer += `   - ${item.explanation}\n\n`;
    });

    if (evidence.length > 3) {
      answer += `...and ${evidence.length - 3} more related artifacts found.\n\n`;
    }

    return answer;
  }

  /**
   * Get intent-specific prefix for answers
   */
  private getIntentPrefix(intent: QueryIntent): string {
    const prefixes = {
      technical_question: 'Here\'s what I found about your technical question:',
      historical_analysis: 'Here\'s the historical analysis:',
      performance_investigation: 'Here\'s the performance analysis:',
      code_understanding: 'Here\'s the code analysis:',
      architecture_exploration: 'Here\'s the architectural information:',
      debugging_assistance: 'Here\'s what might help with debugging:',
      optimization_advice: 'Here\'s optimization guidance:',
      pattern_discovery: 'Here are the patterns I found:',
    };
    return prefixes[intent] || 'Here\'s what I found:';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(evidence: EvidenceItem[], totalResults: number): number {
    if (evidence.length === 0) return 0;

    const avgRelevance = evidence.reduce((sum, item) => sum + item.relevance_score, 0) / evidence.length;
    const coverageBonus = Math.min(evidence.length / 5, 1) * 0.2;
    const resultsBonus = Math.min(totalResults / 10, 1) * 0.1;

    return Math.min(avgRelevance + coverageBonus + resultsBonus, 1);
  }

  /**
   * Generate investigation threads for multi-turn queries
   */
  private generateInvestigationThreads(intent: QueryIntent, evidence: EvidenceItem[]): any[] {
    // Simplified implementation - in production would be more sophisticated
    if (evidence.length < 2) return [];

    const thread = {
      id: crypto.randomUUID(),
      title: `Follow-up investigation for ${intent.replace('_', ' ')}`,
      description: `Deeper analysis based on ${evidence.length} artifacts found`,
      priority: 'medium' as const,
      status: 'active' as const,
      hypotheses: [],
      follow_up_questions: this.generateFollowUpQuestions(intent, evidence),
      created_at: new Date(),
      updated_at: new Date(),
    };

    return [thread];
  }

  /**
   * Generate suggested follow-up questions
   */
  private generateSuggestedQuestions(intent: QueryIntent, evidence: EvidenceItem[]): string[] {
    const questions = this.generateFollowUpQuestions(intent, evidence);
    return questions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Generate follow-up questions based on intent and evidence
   */
  private generateFollowUpQuestions(intent: QueryIntent, evidence: EvidenceItem[]): string[] {
    const questions: string[] = [];

    if (evidence.length > 0) {
      const topArtifact = evidence[0];
      
      if (topArtifact) {
        switch (intent) {
          case 'technical_question':
            questions.push(
              `How is ${topArtifact.artifact_name} implemented?`,
              `What are the dependencies of ${topArtifact.artifact_name}?`,
              `Show me examples of ${topArtifact.artifact_name} usage`
            );
            break;
          case 'performance_investigation':
            questions.push(
              `What are the performance characteristics of ${topArtifact.artifact_name}?`,
              `How can ${topArtifact.artifact_name} be optimized?`,
              `What are the bottlenecks in ${topArtifact.artifact_name}?`
            );
            break;
          case 'historical_analysis':
            questions.push(
              `When was ${topArtifact.artifact_name} last modified?`,
              `What changes were made to ${topArtifact.artifact_name} recently?`,
              `Who contributed to ${topArtifact.artifact_name}?`
            );
            break;
          default:
            questions.push(
              `Tell me more about ${topArtifact.artifact_name}`,
              `How does ${topArtifact.artifact_name} relate to other components?`,
              `What are similar artifacts to ${topArtifact.artifact_name}?`
            );
        }
      }
    }

    return questions;
  }

  /**
   * Build session context for multi-turn conversations
   */
  private buildSessionContext(request: QueryRequest, results: SearchResult[]): Record<string, unknown> {
    return {
      last_query: request.query,
      last_intent: this.classifyIntent(request.query),
      relevant_artifacts: results.slice(0, 5).map(r => r.artifact.id),
      context_hints: request.context,
      search_options: request.options,
    };
  }
}