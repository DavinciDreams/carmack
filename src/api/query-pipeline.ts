// import { z } from 'zod';
import { AIProcessor } from './ai-processor.ts';
import {
  type ContinueQueryRequest,
  type EvidenceItem,
  type InvestigationThread,
  type QueryComplexity,
  type QueryIntent,
  type QueryRequest,
  type QueryResponse,
  validateContinueQueryRequest,
  validateQueryRequest,
} from './contracts.ts';
import { GraphWalker } from './graph-walker.ts';
import { QueryEngine } from './query-engine.ts';
import { SessionManager } from './session-manager.ts';

// =============================================================================
// PIPELINE ERRORS
// =============================================================================

export class QueryPipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly stage: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'QueryPipelineError';
  }
}

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

/**
 * Pipeline configuration options
 */
export interface PipelineConfig {
  // Search configuration
  hybrid_search_enabled: boolean;
  semantic_weight: number;
  keyword_weight: number;
  search_threshold: number;

  // Graph traversal configuration
  graph_traversal_enabled: boolean;
  max_traversal_depth: number;
  min_relationship_confidence: number;

  // AI processing configuration
  ai_processing_enabled: boolean;
  fact_extraction_enabled: boolean;
  hypothesis_generation_enabled: boolean;

  // Performance configuration
  max_execution_time_ms: number;
  enable_caching: boolean;
  cache_ttl_ms: number;

  // Quality configuration
  min_confidence_threshold: number;
  max_evidence_items: number;
  max_investigation_threads: number;
}

/**
 * Default pipeline configuration
 */
const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  hybrid_search_enabled: true,
  semantic_weight: 0.7,
  keyword_weight: 0.3,
  search_threshold: 0.3,

  graph_traversal_enabled: true,
  max_traversal_depth: 3,
  min_relationship_confidence: 0.5,

  ai_processing_enabled: true,
  fact_extraction_enabled: true,
  hypothesis_generation_enabled: true,

  max_execution_time_ms: 30000, // 30 seconds
  enable_caching: true,
  cache_ttl_ms: 300000, // 5 minutes

  min_confidence_threshold: 0.2,
  max_evidence_items: 20,
  max_investigation_threads: 5,
};

// =============================================================================
// PIPELINE STAGES
// =============================================================================

/**
 * Pipeline execution context
 */
interface PipelineContext {
  request_id: string;
  session_id: string;
  start_time: number;
  stage: string;

  // Input data
  query: string;
  intent: QueryIntent;
  complexity: QueryComplexity;

  // Intermediate results
  search_results: EvidenceItem[];
  graph_paths: any[];
  ai_facts: any;
  ai_hypotheses: any;
  ai_synthesis: any;

  // Final results
  evidence_chain: EvidenceItem[];
  investigation_threads: InvestigationThread[];
  confidence_score: number;

  // Metadata
  execution_times: Record<string, number>;
  artifacts_processed: number;
  relationships_traversed: number;
}

// =============================================================================
// QUERY PROCESSING PIPELINE
// =============================================================================

/**
 * Main query processing pipeline
 */
export class QueryProcessingPipeline {
  private queryEngine = new QueryEngine();
  private sessionManager = new SessionManager();
  private graphWalker = new GraphWalker();
  private aiProcessor = new AIProcessor();
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Process initial query through complete pipeline
   */
  async processQuery(request: QueryRequest, sessionToken?: string): Promise<QueryResponse> {
    const context: PipelineContext = {
      request_id: crypto.randomUUID(),
      session_id: '',
      start_time: Date.now(),
      stage: 'initialization',
      query: request.query,
      intent: 'technical_question', // Will be updated
      complexity: 'moderate', // Will be updated
      search_results: [],
      graph_paths: [],
      ai_facts: null,
      ai_hypotheses: null,
      ai_synthesis: null,
      evidence_chain: [],
      investigation_threads: [],
      confidence_score: 0,
      execution_times: {},
      artifacts_processed: 0,
      relationships_traversed: 0,
    };

    try {
      // Validate request
      const validatedRequest = validateQueryRequest(request);
      context.query = validatedRequest.query;

      // Stage 1: Session Management
      await this.executeStage(context, 'session_management', async () => {
        const session = await this.handleSessionManagement(sessionToken, validatedRequest);
        context.session_id = session.id;
        return session;
      });

      // Stage 2: Intent Classification and Complexity Assessment
      await this.executeStage(context, 'intent_classification', async () => {
        if (this.config.ai_processing_enabled) {
          const intentResult = await this.aiProcessor.classifyIntent(context.query);
          context.intent = intentResult.intent;

          const complexityResult = await this.aiProcessor.assessComplexity(
            context.query,
            context.intent
          );
          context.complexity = complexityResult.complexity;
        }
      });

      // Stage 3: Hybrid Search
      await this.executeStage(context, 'hybrid_search', async () => {
        if (this.config.hybrid_search_enabled) {
          const queryResult = await this.queryEngine.processQuery(validatedRequest);
          context.search_results = queryResult.evidence_chain;
          context.artifacts_processed = queryResult.artifacts_searched;
        }
      });

      // Stage 4: Graph Traversal
      await this.executeStage(context, 'graph_traversal', async () => {
        if (this.config.graph_traversal_enabled && context.search_results.length > 0) {
          const graphResults = await this.performGraphTraversal(context);
          context.graph_paths = graphResults.paths;
          context.relationships_traversed = graphResults.total_paths;
        }
      });

      // Stage 5: AI Processing
      await this.executeStage(context, 'ai_processing', async () => {
        if (this.config.ai_processing_enabled) {
          // Use the correct AIProcessor methods for facts, hypotheses, and synthesis
          context.ai_facts = await this.aiProcessor.extractFacts({
            query: context.query,
            evidence: context.search_results,
            intent: context.intent,
            complexity: context.complexity,
            context: { graph_paths: context.graph_paths },
          });

          context.ai_hypotheses = await this.aiProcessor.generateHypotheses({
            query: context.query,
            facts: context.ai_facts,
            intent: context.intent,
            complexity: context.complexity,
            context: { graph_paths: context.graph_paths },
          });

          context.ai_synthesis = await this.aiProcessor.synthesize({
            query: context.query,
            facts: context.ai_facts,
            hypotheses: context.ai_hypotheses,
            intent: context.intent,
            complexity: context.complexity,
            context: { graph_paths: context.graph_paths },
          });
        }
      });

      // Stage 6: Evidence Synthesis
      await this.executeStage(context, 'evidence_synthesis', async () => {
        context.evidence_chain = this.synthesizeEvidence(context);
        context.confidence_score = this.calculateOverallConfidence(context);
      });

      // Stage 7: Investigation Thread Generation
      await this.executeStage(context, 'investigation_threads', async () => {
        if (context.ai_hypotheses) {
          context.investigation_threads = this.aiProcessor.generateInvestigationThreads(
            context.ai_hypotheses,
            context.ai_facts
          );
        }
      });

      // Stage 8: Session Update
      await this.executeStage(context, 'session_update', async () => {
        await this.updateSessionWithResults(context);
      });

      // Build final response
      const response: QueryResponse = {
        query_id: context.request_id,
        session_id: context.session_id,
        intent: context.intent,
        complexity: context.complexity,
        primary_answer:
          context.ai_synthesis?.primary_answer || this.generateFallbackAnswer(context),
        evidence_chain: context.evidence_chain,
        confidence_score: context.confidence_score,
        investigation_threads: context.investigation_threads.slice(
          0,
          this.config.max_investigation_threads
        ),
        suggested_questions: context.ai_synthesis?.follow_up_suggestions || [],
        execution_time_ms: Date.now() - context.start_time,
        artifacts_searched: context.artifacts_processed,
        relationships_traversed: context.relationships_traversed,
        session_context: { stage_times: context.execution_times },
        created_at: new Date(),
      };

      return response;
    } catch (error) {
      throw new QueryPipelineError(
        `Pipeline failed at stage: ${context.stage}`,
        'PIPELINE_EXECUTION_ERROR',
        context.stage,
        {
          context,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Date.now() - context.start_time,
        }
      );
    }
  }

  /**
   * Process query continuation
   */
  async processContinuation(
    queryId: string,
    request: ContinueQueryRequest,
    sessionToken: string
  ): Promise<QueryResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = validateContinueQueryRequest(request);

      // Get session and context hints

      const { context_hints } = await this.sessionManager.continueInvestigation(
        sessionToken,
        validatedRequest
      );

      // Build enhanced query request
      const enhancedQuery: QueryRequest = {
        query: validatedRequest.follow_up_query,
        context: {
          repository_url: (context_hints as any).repository_context?.[0],
          language_hint: (context_hints as any).language_preferences?.[0],
          domain_hint: (context_hints as any).domain_preferences?.[0],
        },
        options: {
          max_results: 15,
          include_code_snippets: true,
          enable_multi_turn: true,
          complexity_preference: 'moderate',
          search_depth: validatedRequest.investigation_direction === 'deeper_analysis' ? 4 : 3,
        },
      };

      // Process enhanced query through pipeline
      return await this.processQuery(enhancedQuery, sessionToken);
    } catch (error) {
      throw new QueryPipelineError(
        'Query continuation failed',
        'CONTINUATION_ERROR',
        'continuation',
        {
          queryId,
          request,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Date.now() - startTime,
        }
      );
    }
  }

  // =============================================================================
  // PRIVATE PIPELINE METHODS
  // =============================================================================

  /**
   * Execute a pipeline stage with error handling and timing
   */
  private async executeStage<T>(
    context: PipelineContext,
    stageName: string,
    stageFunction: () => Promise<T>
  ): Promise<T> {
    const stageStartTime = Date.now();
    context.stage = stageName;

    try {
      // Check timeout
      if (Date.now() - context.start_time > this.config.max_execution_time_ms) {
        throw new QueryPipelineError(
          `Pipeline timeout exceeded at stage: ${stageName}`,
          'PIPELINE_TIMEOUT',
          stageName
        );
      }

      const result = await stageFunction();
      context.execution_times[stageName] = Date.now() - stageStartTime;
      return result;
    } catch (error) {
      context.execution_times[stageName] = Date.now() - stageStartTime;
      throw new QueryPipelineError(
        `Stage ${stageName} failed: ${error instanceof Error ? error.message : String(error)}`,
        'STAGE_EXECUTION_ERROR',
        stageName,
        { originalError: error }
      );
    }
  }

  /**
   * Handle session management
   */
  private async handleSessionManagement(
    sessionToken: string | undefined,
    request: QueryRequest
  ): Promise<any> {
    if (sessionToken) {
      try {
        return await this.sessionManager.getSession(sessionToken);
      } catch (_error) {
        // Create new session if existing one is invalid
        return await this.sessionManager.createSession({
          investigation_goal: `Query: ${request.query}`,
        });
      }
    } else {
      return await this.sessionManager.createSession({
        investigation_goal: `Query: ${request.query}`,
      });
    }
  }

  /**
   * Perform graph traversal on search results
   */
  private async performGraphTraversal(context: PipelineContext): Promise<any> {
    const traversalPromises = context.search_results.slice(0, 5).map(async (evidence) => {
      try {
        return await this.graphWalker.traverse({
          start_artifact_id: evidence.artifact_id,
          max_depth: this.config.max_traversal_depth,
          min_confidence: this.config.min_relationship_confidence,
          direction: 'both',
          limit: 10,
        });
      } catch (_error) {
        // Continue with other traversals if one fails
        return { paths: [], total_paths: 0, max_depth_reached: 0, execution_time_ms: 0 };
      }
    });

    const results = await Promise.all(traversalPromises);

    return {
      paths: results.flatMap((r) => r.paths),
      total_paths: results.reduce((sum, r) => sum + r.total_paths, 0),
    };
  }

  /**
   * Synthesize evidence from all sources
   */
  private synthesizeEvidence(context: PipelineContext): EvidenceItem[] {
    let evidence = [...context.search_results];

    // Add evidence from graph traversal
    if (context.graph_paths.length > 0) {
      const graphEvidence = context.graph_paths.slice(0, 5).map((path, index) => ({
        artifact_id: crypto.randomUUID(),
        artifact_name: `Graph Path ${index + 1}`,
        artifact_type: 'graph_path',
        relevance_score: 0.6,
        explanation: `Related through graph traversal with ${path.artifacts?.length || 0} steps`,
      }));
      evidence.push(...graphEvidence);
    }

    // Enhance with AI insights
    if (context.ai_facts?.facts) {
      evidence = evidence.map((item) => {
        const relatedFacts = context.ai_facts.facts.filter(
          (fact: any) => fact.source_artifact_id === item.artifact_id
        );

        if (relatedFacts.length > 0) {
          return {
            ...item,
            explanation: `${item.explanation} | AI Insight: ${relatedFacts[0].statement}`,
            relevance_score: Math.min(item.relevance_score * 1.1, 1.0),
          };
        }

        return item;
      });
    }

    // Sort by relevance and limit
    return evidence
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, this.config.max_evidence_items);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(context: PipelineContext): number {
    let confidence = 0;
    let factors = 0;

    // Evidence quality factor
    if (context.evidence_chain.length > 0) {
      const avgEvidenceScore =
        context.evidence_chain.reduce((sum, item) => sum + item.relevance_score, 0) /
        context.evidence_chain.length;
      confidence += avgEvidenceScore * 0.4;
      factors += 0.4;
    }

    // AI synthesis confidence
    if (context.ai_synthesis?.confidence_assessment) {
      confidence += context.ai_synthesis.confidence_assessment.overall_confidence * 0.3;
      factors += 0.3;
    }

    // Graph traversal factor
    if (context.relationships_traversed > 0) {
      const graphFactor = Math.min(context.relationships_traversed / 10, 1) * 0.2;
      confidence += graphFactor;
      factors += 0.2;
    }

    // Coverage factor
    const coverageFactor = Math.min(context.artifacts_processed / 20, 1) * 0.1;
    confidence += coverageFactor;
    factors += 0.1;

    return factors > 0 ? Math.max(confidence / factors, this.config.min_confidence_threshold) : 0;
  }

  /**
   * Update session with pipeline results
   */
  private async updateSessionWithResults(context: PipelineContext): Promise<void> {
    const mockQueryResponse: QueryResponse = {
      query_id: context.request_id,
      session_id: context.session_id,
      intent: context.intent,
      complexity: context.complexity,
      primary_answer: context.ai_synthesis?.primary_answer || '',
      evidence_chain: context.evidence_chain,
      confidence_score: context.confidence_score,
      investigation_threads: context.investigation_threads,
      suggested_questions: context.ai_synthesis?.follow_up_suggestions || [],
      execution_time_ms: Date.now() - context.start_time,
      artifacts_searched: context.artifacts_processed,
      relationships_traversed: context.relationships_traversed,
      session_context: {},
      created_at: new Date(),
    };

    await this.sessionManager.updateSessionWithQuery(
      context.session_id,
      context.query,
      mockQueryResponse
    );
  }

  /**
   * Generate fallback answer when AI processing is disabled
   */
  private generateFallbackAnswer(context: PipelineContext): string {
    if (context.evidence_chain.length === 0) {
      return `I couldn't find specific information about "${context.query}". Try rephrasing your question or using different keywords.`;
    }

    const topEvidence = context.evidence_chain.slice(0, 3);
    let answer = `Based on my analysis of ${context.evidence_chain.length} relevant artifacts:\n\n`;

    topEvidence.forEach((item, index) => {
      answer += `${index + 1}. **${item.artifact_name}** (${item.artifact_type})\n`;
      answer += `   - Relevance: ${(item.relevance_score * 100).toFixed(1)}%\n`;
      if (item.file_path) {
        answer += `   - Location: ${item.file_path}\n`;
      }
      answer += `   - ${item.explanation}\n\n`;
    });

    if (context.evidence_chain.length > 3) {
      answer += `...and ${context.evidence_chain.length - 3} more related artifacts found.\n\n`;
    }

    return answer;
  }
}
