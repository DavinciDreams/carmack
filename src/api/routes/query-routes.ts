import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AIProcessor } from '../ai-processor.ts';
import type {
  ContinueQueryRequest,
  ErrorResponse,
  QueryRequest,
  QueryResponse,
} from '../contracts.ts';
import { API_ENDPOINTS, validateContinueQueryRequest, validateQueryRequest } from '../contracts.ts';
import { QueryEngine } from '../query-engine.ts';
import { SessionManager } from '../session-manager.ts';

// =============================================================================
// ROUTE HANDLER ERRORS
// =============================================================================

export class RouteHandlerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RouteHandlerError';
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * Query route handlers
 */
export class QueryRouteHandlers {
  private queryEngine = new QueryEngine();
  private sessionManager = new SessionManager();
  private aiProcessor = new AIProcessor();

  /**
   * Handle initial query processing
   */
  async handleQuery(
    request: FastifyRequest<{ Body: QueryRequest }>,
    reply: FastifyReply
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Validate request
      const validatedRequest = validateQueryRequest(request.body);

      // Get or create session
      const sessionToken = request.headers['x-session-token'] as string;
      let session;

      if (sessionToken) {
        try {
          session = await this.sessionManager.getSession(sessionToken);
        } catch (_error) {
          // Create new session if existing one is invalid
          session = await this.sessionManager.createSession({
            investigation_goal: `Query: ${validatedRequest.query}`,
          });
        }
      } else {
        session = await this.sessionManager.createSession({
          investigation_goal: `Query: ${validatedRequest.query}`,
        });
      }

      // Process query with engine
      const queryResult = await this.queryEngine.processQuery(validatedRequest);

      // Enhance with AI processing

      // --- AI Processing Pipeline ---
      const facts = await this.aiProcessor.extractFacts({
        query: validatedRequest.query,
        evidence: queryResult.evidence_chain,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: queryResult.session_context,
      });
      const hypotheses = await this.aiProcessor.generateHypotheses({
        query: validatedRequest.query,
        facts,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: queryResult.session_context,
      });
      const synthesis = await this.aiProcessor.synthesize({
        query: validatedRequest.query,
        facts,
        hypotheses,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: queryResult.session_context,
      });
      // If enhanceEvidence is not implemented, just use the original evidence_chain
      const enhanced_evidence = queryResult.evidence_chain;
      const investigationThreads = this.aiProcessor.generateInvestigationThreads(hypotheses, facts);

      // Update session with query results
      await this.sessionManager.updateSessionWithQuery(
        session.id,
        validatedRequest.query,
        {
          ...queryResult,
          query_id: requestId,
          session_id: session.id,
          investigation_threads: investigationThreads,
          primary_answer: synthesis.primary_answer,
          confidence_score: synthesis.confidence_assessment.overall_confidence,
          suggested_questions: synthesis.follow_up_suggestions,
        }
      );

      // Build response
      const response: QueryResponse = {
        created_at: new Date(),
        query_id: requestId,
        session_id: session.id,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        primary_answer: synthesis.primary_answer,
        evidence_chain: enhanced_evidence,
        confidence_score: synthesis.confidence_assessment.overall_confidence,
        investigation_threads: investigationThreads,
        suggested_questions: synthesis.follow_up_suggestions,
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: queryResult.artifacts_searched,
        relationships_traversed: queryResult.relationships_traversed,
        session_context: queryResult.session_context,
      };
      return response;
    } catch (error) {
      const errorResponse = this.buildErrorResponse(error, requestId);
      reply.status(errorResponse.statusCode || 500);
      // Return a QueryResponse-shaped error object
      return {
        created_at: new Date(),
        query_id: requestId,
        session_id: '',
        intent: 'technical_question',
        complexity: 'simple',
        primary_answer: '',
        evidence_chain: [],
        confidence_score: 0,
        investigation_threads: [],
        suggested_questions: [],
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: 0,
        relationships_traversed: 0,
        session_context: {},
      };
    }
  }

  /**
   * Handle query continuation
   */
  async handleContinueQuery(
    request: FastifyRequest<{
      Params: { queryId: string };
      Body: ContinueQueryRequest;
    }>,
    reply: FastifyReply
  ): Promise<QueryResponse> {
    const startTime = Date.now();
    const { queryId } = request.params;

    try {
      // Validate request
      const validatedRequest = validateContinueQueryRequest(request.body);

      // Get session from header
      const sessionToken = request.headers['x-session-token'] as string;
      if (!sessionToken) {
        throw new RouteHandlerError(
          'Session token required for query continuation',
          401,
          'SESSION_TOKEN_REQUIRED'
        );
      }

      // Continue investigation
      const { session, context_hints } = await this.sessionManager.continueInvestigation(
        sessionToken,
        validatedRequest
      );

      // Build enhanced query request with context
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

      // Process enhanced query
      const queryResult = await this.queryEngine.processQuery(enhancedQuery);

      // Enhance with AI processing

      // --- AI Processing Pipeline ---
      const facts = await this.aiProcessor.extractFacts({
        query: validatedRequest.follow_up_query,
        evidence: queryResult.evidence_chain,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: { ...queryResult.session_context, ...context_hints },
      });
      const hypotheses = await this.aiProcessor.generateHypotheses({
        query: validatedRequest.follow_up_query,
        facts,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: { ...queryResult.session_context, ...context_hints },
      });
      const synthesis = await this.aiProcessor.synthesize({
        query: validatedRequest.follow_up_query,
        facts,
        hypotheses,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: { ...queryResult.session_context, ...context_hints },
      });
      // If enhanceEvidence is not implemented, just use the original evidence_chain
      const enhanced_evidence = queryResult.evidence_chain;
      const investigationThreads = this.aiProcessor.generateInvestigationThreads(hypotheses, facts);

      // Update session
      const updatedSession = await this.sessionManager.updateSessionWithQuery(
        session.id,
        validatedRequest.follow_up_query,
        {
          ...queryResult,
          query_id: crypto.randomUUID(),
          session_id: session.id,
          investigation_threads: investigationThreads,
          primary_answer: synthesis.primary_answer,
          confidence_score: synthesis.confidence_assessment.overall_confidence,
          suggested_questions: synthesis.follow_up_suggestions,
        }
      );

      // Build response
      const response: QueryResponse = {
        created_at: new Date(),
        query_id: crypto.randomUUID(),
        session_id: session.id,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        primary_answer: synthesis.primary_answer,
        evidence_chain: enhanced_evidence,
        confidence_score: synthesis.confidence_assessment.overall_confidence,
        investigation_threads: investigationThreads,
        suggested_questions: synthesis.follow_up_suggestions,
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: queryResult.artifacts_searched,
        relationships_traversed: queryResult.relationships_traversed,
        session_context: updatedSession.context,
      };
      return response;
    } catch (error) {
      const errorResponse = this.buildErrorResponse(error, queryId);
      reply.status(errorResponse.statusCode || 500);
      // Return a QueryResponse-shaped error object
      return {
        created_at: new Date(),
        query_id: crypto.randomUUID(),
        session_id: '',
        intent: 'technical_question',
        complexity: 'simple',
        primary_answer: '',
        evidence_chain: [],
        confidence_score: 0,
        investigation_threads: [],
        suggested_questions: [],
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: 0,
        relationships_traversed: 0,
        session_context: {},
      };
    }
  }

  /**
   * Get query results by ID
   */
  async handleGetQuery(
    request: FastifyRequest<{ Params: { queryId: string } }>,
    reply: FastifyReply
  ): Promise<QueryResponse | ErrorResponse> {
    const { queryId } = request.params;

    try {
      // In a full implementation, we would store and retrieve query results
      // For now, return a not found error
      throw new RouteHandlerError(`Query not found: ${queryId}`, 404, 'QUERY_NOT_FOUND', {
        queryId,
      });
    } catch (error) {
      const errorResponse = this.buildErrorResponse(error, queryId);
      reply.status(errorResponse.statusCode || 500);
      return errorResponse.error;
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Build standardized error response
   */
  private buildErrorResponse(
    error: unknown,
    requestId?: string,
    _executionTime?: number
  ): { error: ErrorResponse; statusCode: number } {
    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> = {};

    if (error instanceof RouteHandlerError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.context || {};
    } else if (error instanceof z.ZodError) {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = 'Request validation failed';
      details = {
        validation_errors: error.errors,
      };
    }
    return {
      error: {
        code,
        message,
        timestamp: new Date(),
        details,
        request_id: requestId,
      },
      statusCode,
    };
  }
}

// Route registration function
export function registerQueryRoutes(fastify: FastifyInstance) {
  const handlers = new QueryRouteHandlers();

  // Query continuation
  fastify.post(API_ENDPOINTS.CONTINUE_QUERY, {
    schema: {
      description: 'Continue multi-turn investigation',
      tags: ['Query'],
      params: {
        type: 'object',
        properties: {
          queryId: { type: 'string', format: 'uuid' },
        },
        required: ['queryId'],
      },
      body: {
        type: 'object',
        properties: {
          follow_up_query: { type: 'string', minLength: 1, maxLength: 2000 },
          thread_id: { type: 'string', format: 'uuid' },
          focus_artifacts: { type: 'array', items: { type: 'string', format: 'uuid' } },
          investigation_direction: {
            type: 'string',
            enum: [
              'deeper_analysis',
              'broader_context',
              'related_patterns',
              'historical_evolution',
              'performance_impact',
            ],
          },
        },
        required: ['follow_up_query'],
      },
      headers: {
        type: 'object',
        properties: {
          'x-session-token': { type: 'string' },
        },
        required: ['x-session-token'],
      },
      response: {
        200: {
          type: 'object',
          description: 'Query continuation processed successfully',
        },
        401: {
          type: 'object',
          description: 'Session token required',
        },
        404: {
          type: 'object',
          description: 'Query or session not found',
        },
        500: {
          type: 'object',
          description: 'Internal server error',
        },
      },
    },
    handler: handlers.handleContinueQuery.bind(handlers),
  });

  // Get query by ID
  fastify.get(API_ENDPOINTS.GET_QUERY, {
    schema: {
      description: 'Get query results by ID',
      tags: ['Query'],
      params: {
        type: 'object',
        properties: {
          queryId: { type: 'string', format: 'uuid' },
        },
        required: ['queryId'],
      },
      response: {
        200: {
          type: 'object',
          description: 'Query results retrieved successfully',
        },
        404: {
          type: 'object',
          description: 'Query not found',
        },
        500: {
          type: 'object',
          description: 'Internal server error',
        },
      },
    },
    handler: handlers.handleGetQuery.bind(handlers),
  });
}
