/**
 * Minimal Docker server for TensorRT-LLM Knowledge Graph
 * 
 * Ultra-simplified server that completely avoids all Fastify schema validation
 * and AJV dependencies. This is specifically designed to work around Bun/AJV
 * compatibility issues in Docker Alpine containers.
 */

import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Create minimal Fastify server with zero validation
 */
async function createMinimalServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.TENSORRT_LOG_LEVEL || 'info',
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB
    connectionTimeout: 60000,
    keepAliveTimeout: 5000,
    maxParamLength: 500,
    // Completely disable validation
    ajv: {
      customOptions: {},
      plugins: []
    }
  });

  // Basic CORS
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token');
    
    if (request.method === 'OPTIONS') {
      reply.status(200).send();
      return;
    }
  });

  // Request tracking
  fastify.addHook('onRequest', async (request, reply) => {
    (request as any).startTime = Date.now();
    (request as any).requestId = crypto.randomUUID();
    reply.header('x-request-id', (request as any).requestId);
  });

  // API routes - NO SCHEMAS
  await fastify.register(async (fastify) => {
    // Mock query endpoint
    fastify.post('/query', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const query = body?.query || 'test query';
        
        return {
          query_id: crypto.randomUUID(),
          session_id: crypto.randomUUID(),
          intent: 'code_analysis',
          complexity: 'moderate',
          primary_answer: `Mock response for query: "${query}". The Docker deployment is working correctly with schema-free validation.`,
          evidence_chain: [
            {
              artifact_id: crypto.randomUUID(),
              artifact_type: 'file',
              relevance_score: 0.95,
              content_snippet: 'Mock evidence for Docker deployment test',
              reasoning: 'This is a mock response to verify the Docker deployment is functioning',
            }
          ],
          confidence_score: 0.8,
          investigation_threads: [
            {
              thread_id: crypto.randomUUID(),
              title: 'Docker Deployment Verification',
              focus: 'Ensuring all services are running correctly',
              priority: 'high'
            }
          ],
          suggested_questions: [
            'How can I verify all Docker services are healthy?',
            'What endpoints are available in the API?'
          ],
          execution_time_ms: Date.now() - ((request as any).startTime || Date.now()),
          artifacts_searched: 1,
          relationships_traversed: 0,
          session_context: {
            repository_context: ['tensorrt-llm'],
            investigation_focus: 'docker_deployment',
            total_queries: 1
          },
          created_at: new Date(),
        };
      } catch (error) {
        reply.status(500);
        return {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            request_id: (request as any).requestId,
            timestamp: new Date(),
          },
        };
      }
    });

    // Mock continue query endpoint
    fastify.post('/query/:queryId/continue', async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as any;
      const body = request.body as any;
      
      return {
        query_id: params.queryId || crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        intent: 'follow_up_analysis',
        complexity: 'moderate',
        primary_answer: `Mock continuation response for query ID: ${params.queryId}. Follow-up query: "${body?.follow_up_query || 'test follow-up'}"`,
        evidence_chain: [],
        confidence_score: 0.7,
        investigation_threads: [],
        suggested_questions: [],
        execution_time_ms: Date.now() - ((request as any).startTime || Date.now()),
        artifacts_searched: 0,
        relationships_traversed: 0,
        session_context: {},
        created_at: new Date(),
      };
    });

    // Mock get query endpoint
    fastify.get('/query/:queryId', async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as any;
      
      reply.status(404);
      return {
        code: 'QUERY_NOT_FOUND',
        message: `Query not found: ${params.queryId}`,
        details: {
          queryId: params.queryId,
          timestamp: new Date(),
        },
      };
    });
    
    // Health endpoint
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        timestamp: new Date(),
        components: {
          database: {
            status: 'mocked',
            latency_ms: 1,
          },
        },
        version: '1.0.0-docker-minimal',
      };
    });

    // Metrics endpoint
    fastify.get('/metrics', async (request, reply) => {
      return {
        query_stats: {
          total_queries: 0,
          avg_response_time_ms: 50,
          success_rate: 1.0,
          cache_hit_rate: 0,
        },
        database_stats: {
          total_artifacts: 0,
          total_relationships: 0,
          avg_query_time_ms: 1,
        },
        session_stats: {
          active_sessions: 0,
          avg_session_duration_ms: 0,
          avg_queries_per_session: 0,
        },
        timestamp: new Date(),
      };
    });
  }, { prefix: '/api' });

  // Root endpoints
  fastify.get('/', async (request, reply) => {
    return {
      service: 'TensorRT-LLM Knowledge Graph API (Minimal Docker)',
      version: '1.0.0-docker-minimal',
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      message: 'Schema-free Docker deployment successful',
    };
  });

  fastify.get('/api', async (request, reply) => {
    return {
      service: 'TensorRT-LLM Knowledge Graph API (Minimal Docker)',
      version: '1.0.0-docker-minimal',
      description: 'Schema-free minimal server for Docker deployment testing',
      endpoints: {
        query: '/api/query',
        health: '/api/health',
        metrics: '/api/metrics',
      },
      timestamp: new Date(),
    };
  });

  // Global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const requestId = (request as any).requestId || crypto.randomUUID();
    
    fastify.log.error({
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: request.method,
        url: request.url,
      },
    }, 'Request error');

    const statusCode = (error as any).statusCode || 500;
    
    reply.status(statusCode).send({
      code: (error as any).code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: {
        request_id: requestId,
        timestamp: new Date(),
      },
    });
  });

  // 404 handler
  fastify.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      details: {
        method: request.method,
        url: request.url,
        timestamp: new Date(),
      },
    });
  });

  return fastify;
}

/**
 * Start minimal server
 */
async function startMinimalServer(): Promise<void> {
  try {
    console.log('🚀 Starting TensorRT Oracle Minimal Docker Server...');
    console.log('⚠️  Using minimal schema-free configuration for Docker compatibility');
    
    const fastify = await createMinimalServer();
    
    const port = parseInt(process.env.API_PORT || process.env.PORT || '8080');
    const host = '0.0.0.0';
    
    console.log(`🌐 Server will listen on ${host}:${port}`);
    console.log(`📊 Log level: ${process.env.TENSORRT_LOG_LEVEL || 'info'}`);
    console.log(`🏭 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔧 Schema validation: DISABLED (Docker compatibility mode)');

    await fastify.listen({
      host,
      port,
    });

    fastify.log.info(
      `🚀 TensorRT-LLM Knowledge Graph API (Minimal Docker) started on http://${host}:${port}`
    );

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.main) {
  await startMinimalServer();
}

export { createMinimalServer, startMinimalServer };