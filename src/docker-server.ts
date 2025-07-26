/**
 * Docker-optimized server for TensorRT-LLM Knowledge Graph
 * 
 * Simplified Fastify configuration that completely avoids AJV by
 * not using any schema validation in route registration.
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { QueryRouteHandlers } from './api/routes/query-routes.ts';
import { getDatabaseOperations } from './db/operations.ts';

/**
 * Create Docker-optimized Fastify server
 * Completely bypasses schema validation and AJV
 */
async function createDockerServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.TENSORRT_LOG_LEVEL || 'info',
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB
    connectionTimeout: 60000,
    keepAliveTimeout: 5000,
    maxParamLength: 500,
    // No schema controller - completely disable validation
  });

  // Basic CORS middleware
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

  // Create route handlers instance
  const handlers = new QueryRouteHandlers();

  // Register routes with API prefix - NO SCHEMAS
  await fastify.register(async (fastify) => {
    // Query routes without schema validation
    fastify.post('/query', handlers.handleQuery.bind(handlers));
    fastify.post('/query/:queryId/continue', handlers.handleContinueQuery.bind(handlers));
    fastify.get('/query/:queryId', handlers.handleGetQuery.bind(handlers));
    
    // Health endpoint
    fastify.get('/health', async (request, reply) => {
      try {
        const db = getDatabaseOperations();
        const health = await db.healthCheck();
        
        return {
          status: health.success ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          components: {
            database: {
              status: health.success ? 'up' : 'down',
              latency_ms: health.execution_time_ms,
              error: health.error,
            },
          },
          version: '1.0.0',
        };
      } catch (error) {
        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date(),
          components: {
            database: {
              status: 'down',
              error: error instanceof Error ? error.message : String(error),
            },
          },
          version: '1.0.0',
        };
      }
    });

    // Metrics endpoint
    fastify.get('/metrics', async (request, reply) => {
      return {
        query_stats: {
          total_queries: 0,
          avg_response_time_ms: 0,
          success_rate: 1.0,
          cache_hit_rate: 0,
        },
        database_stats: {
          total_artifacts: 0,
          total_relationships: 0,
          avg_query_time_ms: 0,
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
      service: 'TensorRT-LLM Knowledge Graph API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/api', async (request, reply) => {
    return {
      service: 'TensorRT-LLM Knowledge Graph API',
      version: '1.0.0',
      description: 'Intelligent query processing system for TensorRT-LLM codebase analysis',
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

  // Database health check on startup
  fastify.addHook('onReady', async () => {
    try {
      const db = getDatabaseOperations();
      const health = await db.healthCheck();
      
      if (!health.success) {
        fastify.log.error('Database health check failed', health);
        throw new Error('Database connection failed');
      }
      
      fastify.log.info('Database connection verified');
    } catch (error) {
      fastify.log.error('Failed to connect to database', error);
      throw error;
    }
  });

  return fastify;
}

/**
 * Start Docker server
 */
async function startDockerServer(): Promise<void> {
  try {
    console.log('🚀 Starting TensorRT Oracle Production Server...');
    console.log('📋 Loading environment configuration...');
    
    // Import and validate environment
    const { loadEnvironmentConfig } = await import('./config/environment.ts');
    const config = loadEnvironmentConfig();
    console.log('✅ Environment configuration loaded and validated');
    
    const fastify = await createDockerServer();
    
    const port = parseInt(process.env.API_PORT || process.env.PORT || '8080');
    const host = '0.0.0.0';
    
    console.log(`🌐 Server will listen on ${host}:${port}`);
    console.log(`📊 Log level: ${process.env.TENSORRT_LOG_LEVEL || 'info'}`);
    console.log(`🏭 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (config.LLM_PROVIDER === 'mock') {
      console.log('⚠️ Using mock LLM provider in production environment');
    }

    await fastify.listen({
      host,
      port,
    });

    fastify.log.info(
      `🚀 TensorRT-LLM Knowledge Graph API (Docker) started on http://${host}:${port}`
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
  await startDockerServer();
}

export { createDockerServer, startDockerServer };