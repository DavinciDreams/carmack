/**
 * Ultra-minimal Bun HTTP server for Docker deployment
 * 
 * This server uses Bun's native HTTP server instead of Fastify
 * to completely avoid any AJV dependency issues in Docker Alpine containers.
 */

interface QueryRequest {
  query?: string;
}

interface QueryResponse {
  query_id: string;
  session_id: string;
  intent: string;
  complexity: string;
  primary_answer: string;
  evidence_chain: Array<{
    artifact_id: string;
    artifact_type: string;
    relevance_score: number;
    content_snippet: string;
    reasoning: string;
  }>;
  confidence_score: number;
  investigation_threads: Array<{
    thread_id: string;
    title: string;
    focus: string;
    priority: string;
  }>;
  suggested_questions: string[];
  execution_time_ms: number;
  artifacts_searched: number;
  relationships_traversed: number;
  session_context: Record<string, any>;
  created_at: Date;
}

interface HealthResponse {
  status: string;
  timestamp: Date;
  components: {
    database: {
      status: string;
      latency_ms: number;
    };
  };
  version: string;
}

interface MetricsResponse {
  query_stats: {
    total_queries: number;
    avg_response_time_ms: number;
    success_rate: number;
    cache_hit_rate: number;
  };
  database_stats: {
    total_artifacts: number;
    total_relationships: number;
    avg_query_time_ms: number;
  };
  session_stats: {
    active_sessions: number;
    avg_session_duration_ms: number;
    avg_queries_per_session: number;
  };
  timestamp: Date;
}

interface ErrorResponse {
  code: string;
  message: string;
  details: {
    request_id?: string;
    timestamp: Date;
  };
}

/**
 * Generate a random UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Parse JSON safely
 */
function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Create CORS headers
 */
function createCORSHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token',
    'Content-Type': 'application/json',
  };
}

/**
 * Handle query endpoint
 */
async function handleQuery(request: Request): Promise<Response> {
  try {
    const startTime = Date.now();
    let body: QueryRequest = {};
    
    if (request.body) {
      const text = await request.text();
      body = parseJSON(text);
    }
    
    const query = body.query || 'test query';
    
    const response: QueryResponse = {
      query_id: generateUUID(),
      session_id: generateUUID(),
      intent: 'code_analysis',
      complexity: 'moderate',
      primary_answer: `Mock response for query: "${query}". The Docker deployment is working correctly with Bun native HTTP server.`,
      evidence_chain: [
        {
          artifact_id: generateUUID(),
          artifact_type: 'file',
          relevance_score: 0.95,
          content_snippet: 'Mock evidence for Docker deployment test',
          reasoning: 'This is a mock response to verify the Docker deployment is functioning',
        }
      ],
      confidence_score: 0.8,
      investigation_threads: [
        {
          thread_id: generateUUID(),
          title: 'Docker Deployment Verification',
          focus: 'Ensuring all services are running correctly',
          priority: 'high'
        }
      ],
      suggested_questions: [
        'How can I verify all Docker services are healthy?',
        'What endpoints are available in the API?'
      ],
      execution_time_ms: Date.now() - startTime,
      artifacts_searched: 1,
      relationships_traversed: 0,
      session_context: {
        repository_context: ['tensorrt-llm'],
        investigation_focus: 'docker_deployment',
        total_queries: 1
      },
      created_at: new Date(),
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: createCORSHeaders(),
    });
    
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        request_id: generateUUID(),
        timestamp: new Date(),
      },
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: createCORSHeaders(),
    });
  }
}

/**
 * Handle health endpoint
 */
async function handleHealth(): Promise<Response> {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date(),
    components: {
      database: {
        status: 'mocked',
        latency_ms: 1,
      },
    },
    version: '1.0.0-bun-native',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: createCORSHeaders(),
  });
}

/**
 * Handle metrics endpoint
 */
async function handleMetrics(): Promise<Response> {
  const response: MetricsResponse = {
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
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: createCORSHeaders(),
  });
}

/**
 * Handle root endpoint
 */
async function handleRoot(): Promise<Response> {
  const response = {
    service: 'TensorRT-LLM Knowledge Graph API (Ultra-Minimal Bun)',
    version: '1.0.0-bun-native',
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: 'Bun native HTTP server successful',
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: createCORSHeaders(),
  });
}

/**
 * Handle API info endpoint
 */
async function handleApiInfo(): Promise<Response> {
  const response = {
    service: 'TensorRT-LLM Knowledge Graph API (Ultra-Minimal Bun)',
    version: '1.0.0-bun-native',
    description: 'Ultra-minimal Bun native server for Docker deployment',
    endpoints: {
      query: '/api/query',
      health: '/api/health',
      metrics: '/api/metrics',
    },
    timestamp: new Date(),
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: createCORSHeaders(),
  });
}

/**
 * Handle 404 errors
 */
async function handle404(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const errorResponse: ErrorResponse = {
    code: 'NOT_FOUND',
    message: `Route ${request.method} ${url.pathname} not found`,
    details: {
      timestamp: new Date(),
    },
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: 404,
    headers: createCORSHeaders(),
  });
}

/**
 * Main request handler
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: createCORSHeaders(),
    });
  }
  
  // Route handling
  if (pathname === '/') {
    return handleRoot();
  }
  
  if (pathname === '/api') {
    return handleApiInfo();
  }
  
  if (pathname === '/api/query' && method === 'POST') {
    return handleQuery(request);
  }
  
  if (pathname === '/api/health' && method === 'GET') {
    return handleHealth();
  }
  
  if (pathname === '/health' && method === 'GET') {
    return handleHealth();
  }
  
  if (pathname === '/api/metrics' && method === 'GET') {
    return handleMetrics();
  }
  
  // Catch all 404
  return handle404(request);
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  const port = parseInt(process.env.API_PORT || process.env.PORT || '8080');
  const host = '0.0.0.0';
  
  console.log('🚀 Starting TensorRT Oracle Ultra-Minimal Bun Server...');
  console.log('⚠️  Using Bun native HTTP server (no Fastify/AJV dependencies)');
  console.log(`🌐 Server will listen on ${host}:${port}`);
  console.log(`📊 Log level: ${process.env.TENSORRT_LOG_LEVEL || 'info'}`);
  console.log(`🏭 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔧 Framework: Bun Native HTTP Server');
  
  const server = Bun.serve({
    hostname: host,
    port: port,
    fetch: handleRequest,
    error(error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    },
  });
  
  console.log(`🚀 TensorRT-LLM Knowledge Graph API (Ultra-Minimal Bun) started on http://${host}:${port}`);
  
  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'] as const;
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.stop();
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
}

// Start server if this file is run directly
if (import.meta.main) {
  await startServer();
}

export { startServer };