/**
 * Query Routes for TensorRT-LLM Knowledge Graph API
 *
 * Implements the main query processing endpoints with proper error handling,
 * validation, and response formatting. Follows Carmack's principles of
 * robust API design and type safety.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type {
  QueryRequest,
  QueryResponse,
  ContinueQueryRequest,
  ErrorResponse,
} from '../contracts.ts';
import {
  validateQueryRequest,
  validateContinueQueryRequest,
  API_ENDPOINTS,
} from '../contracts.ts';
import { QueryEngine } from '../query-engine.ts';
import { SessionManager } from '../session-manager.ts';
import { AIProcessor } from '../ai-processor.ts';

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
        } catch (error) {
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
      const aiResult = await this.aiProcessor.processQuery({
        query: validatedRequest.query,
        evidence: queryResult.evidence_chain,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: queryResult.session_context,
      });

      // Generate investigation threads from AI hypotheses
      const investigationThreads = this.aiProcessor.generateInvestigationThreads(
        aiResult.hypotheses,
        aiResult.facts
      );

      // Update session with query results
      const updatedSession = await this.sessionManager.updateSessionWithQuery(
        session.id,
        validatedRequest.query,
        {
          ...queryResult,
          query_id: requestId,
          session_id: session.id,
          investigation_threads: investigationThreads,
          primary_answer: aiResult.synthesis.primary_answer,
          confidence_score: aiResult.synthesis.confidence_assessment.overall_confidence,
          suggested_questions: aiResult.synthesis.follow_up_suggestions,
        }
      );

      // Build response
      const response: QueryResponse = {
        query_id: requestId,
        session_id: session.id,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        primary_answer: aiResult.synthesis.primary_answer,
        evidence_chain: aiResult.enhanced_evidence,
        confidence_score: aiResult.synthesis.confidence_assessment.overall_confidence,
        investigation_threads: investigationThreads,
        suggested_questions: aiResult.synthesis.follow_up_suggestions,
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: queryResult.artifacts_searched,
        relationships_traversed: queryResult.relationships_traversed,
        session_context: updatedSession.context,
        created_at: new Date(),
      };

      // Set session token in response header
      reply.header('x-session-token', session.token);

      return response;
    } catch (error) {
      const errorResponse = this.buildErrorResponse(
        error,
        requestId,
        Date.now() - startTime
      );
      
      reply.status(errorResponse.statusCode || 500);
      throw errorResponse;
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
      const aiResult = await this.aiProcessor.processQuery({
        query: validatedRequest.follow_up_query,
        evidence: queryResult.evidence_chain,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        context: { ...queryResult.session_context, ...context_hints },
      });

      // Generate updated investigation threads
      const investigationThreads = this.aiProcessor.generateInvestigationThreads(
        aiResult.hypotheses,
        aiResult.facts
      );

      // Update session
      const updatedSession = await this.sessionManager.updateSessionWithQuery(
        session.id,
        validatedRequest.follow_up_query,
        {
          ...queryResult,
          query_id: crypto.randomUUID(),
          session_id: session.id,
          investigation_threads: investigationThreads,
          primary_answer: aiResult.synthesis.primary_answer,
          confidence_score: aiResult.synthesis.confidence_assessment.overall_confidence,
          suggested_questions: aiResult.synthesis.follow_up_suggestions,
        }
      );

      // Build response
      const response: QueryResponse = {
        query_id: crypto.randomUUID(),
        session_id: session.id,
        intent: queryResult.intent,
        complexity: queryResult.complexity,
        primary_answer: aiResult.synthesis.primary_answer,
        evidence_chain: aiResult.enhanced_evidence,
        confidence_score: aiResult.synthesis.confidence_assessment.overall_confidence,
        investigation_threads: investigationThreads,
        suggested_questions: aiResult.synthesis.follow_up_suggestions,
        execution_time_ms: Date.now() - startTime,
        artifacts_searched: queryResult.artifacts_searched,
        relationships_traversed: queryResult.relationships_traversed,
        session_context: updatedSession.context,
        created_at: new Date(),
      };

      return response;
    } catch (error) {
      const errorResponse = this.buildErrorResponse(
        error,
        queryId,
        Date.now() - startTime
      );
      
      reply.status(errorResponse.statusCode || 500);
      throw errorResponse;
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
      throw new RouteHandlerError(
        `Query not found: ${queryId}`,
        404,
        'QUERY_NOT_FOUND',
        { queryId }
      );
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
    executionTime?: number
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
    } else if (error instanceof Error) {
      message = error.message;
      details = {
        error_type: error.constructor.name,
      };
    }

    if (executionTime) {
      details.execution_time_ms = executionTime;
    }

    return {
      error: {
        code,
        message,
        details,
        timestamp: new Date(),
        request_id: requestId,
      },
      statusCode,
    };
  }
}

// =============================================================================
// ROUTE REGISTRATION
// =============================================================================

/**
 * Register query routes with Fastify instance
 */
export async function registerQueryRoutes(fastify: FastifyInstance): Promise<void> {
  const handlers = new QueryRouteHandlers();

  // Initial query processing
  fastify.post(API_ENDPOINTS.QUERY, {
    schema: {
      description: 'Process initial query with intelligent analysis',
      tags: ['Query'],
      body: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 2000 },
          context: {
            type: 'object',
            properties: {
              repository_url: { type: 'string', format: 'uri' },
              file_paths: { type: 'array', items: { type: 'string' } },
              language_hint: { type: 'string' },
              domain_hint: { type: 'string' },
            },
          },
          options: {
            type: 'object',
            properties: {
              max_results: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              include_code_snippets: { type: 'boolean', default: true },
              enable_multi_turn: { type: 'boolean', default: true },
              complexity_preference: { 
                type: 'string', 
                enum: ['simple', 'moderate', 'complex', 'expert'],
                default: 'moderate'
              },
              search_depth: { type: 'number', minimum: 1, maximum: 5, default: 3 },
            },
          },
        },
        required: ['query'],
      },
      response: {
        200: {
          type: 'object',
          description: 'Query processed successfully',
        },
        400: {
          type: 'object',
          description: 'Invalid request',
        },
        500: {
          type: 'object',
          description: 'Internal server error',
        },
      },
    },
    handler: handlers.handleQuery.bind(handlers),
  });

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
            enum: ['deeper_analysis', 'broader_context', 'related_patterns', 'historical_evolution', 'performance_impact'],
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