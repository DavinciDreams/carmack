/**
 * Fastify Server for TensorRT-LLM Knowledge Graph Query Engine
 *
 * Main server implementation with proper error handling, logging, and
 * middleware configuration. Follows Carmack's principles of robust
 * server architecture and performance optimization.
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerQueryRoutes } from './routes/query-routes.ts';
import { getDatabaseOperations } from '../db/operations.ts';

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

/**
 * Server configuration options
 */
export interface ServerConfig {
  host: string;
  port: number;
  logger: boolean | object;
  bodyLimit: number;
  requestTimeout: number;
}

/**
 * Default server configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  host: process.env.API_HOST || '0.0.0.0',
  port: parseInt(process.env.API_PORT || '3000'),
  logger: process.env.NODE_ENV === 'development' ? {
    level: 'info',
  } : true,
  bodyLimit: parseInt(process.env.BODY_LIMIT || '1048576'), // 1MB
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'), // 30s
};

// =============================================================================
// SERVER SETUP
// =============================================================================

/**
 * Create and configure Fastify server
 */
export async function createServer(config: Partial<ServerConfig> = {}): Promise<FastifyInstance> {
  const serverConfig = { ...DEFAULT_CONFIG, ...config };

  // Create Fastify instance
  const fastify = Fastify({
    logger: serverConfig.logger,
    bodyLimit: serverConfig.bodyLimit,
    connectionTimeout: serverConfig.requestTimeout,
    keepAliveTimeout: 5000,
    maxParamLength: 500,
  });

  // Register basic middleware
  await registerMiddleware(fastify);

  // Register routes
  await registerRoutes(fastify);

  // Register error handlers
  registerErrorHandlers(fastify);

  // Register hooks
  registerHooks(fastify);

  return fastify;
}

/**
 * Register basic middleware
 */
async function registerMiddleware(fastify: FastifyInstance): Promise<void> {
  // Basic CORS headers
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token');
    
    if (request.method === 'OPTIONS') {
      reply.status(200).send();
      return;
    }
  });

  // Request ID and timing
  fastify.addHook('onRequest', async (request, reply) => {
    (request as any).startTime = Date.now();
    (request as any).requestId = crypto.randomUUID();
    reply.header('x-request-id', (request as any).requestId);
  });
}

/**
 * Register API routes
 */
async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // API prefix
  await fastify.register(async (fastify) => {
    // Query routes
    await registerQueryRoutes(fastify);
    
    // Basic health endpoint
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

    // Basic metrics endpoint
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

  // Root health check
  fastify.get('/', async (request, reply) => {
    return {
      service: 'TensorRT-LLM Knowledge Graph API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  });

  // API info endpoint
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
}

/**
 * Register error handlers
 */
function registerErrorHandlers(fastify: FastifyInstance): void {
  // Global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const requestId = (request as any).requestId || crypto.randomUUID();
    
    // Log error
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
        headers: request.headers,
      },
    }, 'Request error');

    // Determine status code
    let statusCode = 500;
    if ((error as any).statusCode) {
      statusCode = (error as any).statusCode;
    } else if ((error as any).validation) {
      statusCode = 400;
    }

    // Build error response
    const errorResponse: any = {
      code: (error as any).code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: {
        request_id: requestId,
        timestamp: new Date(),
      },
    };

    // Add validation details for validation errors
    if ((error as any).validation) {
      errorResponse.details.validation_errors = (error as any).validation;
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      errorResponse.message = 'Internal server error';
    }

    reply.status(statusCode).send(errorResponse);
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
}

/**
 * Register request/response hooks
 */
function registerHooks(fastify: FastifyInstance): void {
  // Request logging
  fastify.addHook('onRequest', async (request, reply) => {
    fastify.log.info({
      request: {
        id: (request as any).requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
    }, 'Request started');
  });

  // Response logging
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - ((request as any).startTime || Date.now());
    
    fastify.log.info({
      request: {
        method: request.method,
        url: request.url,
      },
      response: {
        statusCode: reply.statusCode,
        duration,
      },
    }, 'Request completed');
  });

  // Database health check hook
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

  // Graceful shutdown
  fastify.addHook('onClose', async (instance, done) => {
    fastify.log.info('Server shutting down gracefully');
    done();
  });
}

// =============================================================================
// SERVER LIFECYCLE
// =============================================================================

/**
 * Start the server
 */
export async function startServer(config: Partial<ServerConfig> = {}): Promise<FastifyInstance> {
  const serverConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const fastify = await createServer(config);
    
    // Start listening
    await fastify.listen({
      host: serverConfig.host,
      port: serverConfig.port,
    });

    fastify.log.info(
      `🚀 TensorRT-LLM Knowledge Graph API server started on http://${serverConfig.host}:${serverConfig.port}`
    );

    return fastify;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Stop the server gracefully
 */
export async function stopServer(fastify: FastifyInstance): Promise<void> {
  try {
    await fastify.close();
    console.log('Server stopped gracefully');
  } catch (error) {
    console.error('Error stopping server:', error);
    process.exit(1);
  }
}

// =============================================================================
// PROCESS SIGNAL HANDLERS
// =============================================================================

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(fastify: FastifyInstance): void {
  const signals = ['SIGINT', 'SIGTERM'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await stopServer(fastify);
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
}

// =============================================================================
// DEVELOPMENT SERVER
// =============================================================================

/**
 * Start development server if this file is run directly
 */
if (import.meta.main) {
  const server = await startServer({
    logger: {
      level: 'info',
    },
  });

  setupGracefulShutdown(server);
}