import { serve } from "bun";
import { getEnvironmentConfig, validateLLMConfig } from "./config/environment.ts";
import { initializeTelemetry } from "./telemetry/collector.ts";
import { fileRoutes } from "./api/routes/file.ts";
import { patternRoutes } from "./api/routes/pattern.ts";
import { repositoryRoutes } from "./api/routes/repository.ts";
import { telemetryRoutes } from "./api/routes/telemetry.ts";
import { vectorRoutes } from "./api/routes/vector.ts";
import { getDatabaseOperations } from "./db/operations.ts";
import { analysisActor, AnalysisInputSchema } from "./actors/analysis.ts";
import { createActor } from "xstate";


// Unified Bun-optimized API Server for Carmack Coder
const env = getEnvironmentConfig();
validateLLMConfig(env);
initializeTelemetry({
  enabled: env.CARMACK_TELEMETRY_ENABLED,
  batchSize: env.TELEMETRY_BATCH_SIZE,
  flushInterval: env.TELEMETRY_FLUSH_INTERVAL,
  maxBufferSize: env.TELEMETRY_MAX_BUFFER_SIZE,
  privacy: {
    collectUserIds: env.TELEMETRY_COLLECT_USER_IDS,
    collectFilePaths: env.TELEMETRY_COLLECT_FILE_PATHS,
    retentionDays: env.TELEMETRY_RETENTION_DAYS,
  },
  performanceSampleRate: env.TELEMETRY_SAMPLE_RATE,
  behaviorSampleRate: env.TELEMETRY_SAMPLE_RATE,
});

// Handler for /api/query using XState analysisActor (direct async call)
const queryHandler = async (req: Request) => {
  const body = await req.json();
  const parsed = AnalysisInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
  }
  try {
    const actor = createActor(analysisActor, { input: parsed.data });
    actor.start();
    const result = await actor.getSnapshot();
    if (result.status === "done") {
      return new Response(JSON.stringify(result.output), { status: 200 });
    } else if (result.status === "error") {
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    } else {
      return new Response(JSON.stringify({ error: "Actor did not complete" }), { status: 500 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
};

const routes = [
  ...repositoryRoutes,
  ...fileRoutes,
  ...patternRoutes,
  ...vectorRoutes,
  ...telemetryRoutes,
  { method: "POST", path: "/api/query", handler: queryHandler },
  { method: "GET", path: "/api/health", handler: async () => {
    try {
      const db = getDatabaseOperations();
      const health = await db.healthCheck();
      return new Response(JSON.stringify({
        status: health.success ? "healthy" : "unhealthy",
        timestamp: new Date(),
        components: {
          database: {
            status: health.success ? "up" : "down",
            latency_ms: health.execution_time_ms,
            error: health.error,
          },
        },
        version: "1.0.0",
      }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({
        status: "unhealthy",
        timestamp: new Date(),
        components: {
          database: {
            status: "down",
            error: error instanceof Error ? error.message : String(error),
          },
        },
        version: "1.0.0",
      }), { status: 503 });
    }
  } },
  { method: "GET", path: "/api/metrics", handler: async () => {
    return new Response(JSON.stringify({
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
    }), { status: 200 });
  } },
];

function addCORSHeaders(res: ResponseInit = {}) {
  return {
    ...res,
    headers: {
      ...(res.headers || {}),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-session-token",
    },
  };
}

serve({
  async fetch(req) {
    const url = new URL(req.url);
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, addCORSHeaders({ status: 200 }));
    }
    // Route matching
    const route = routes.find(r => r.method === req.method && r.path === url.pathname);
    if (!route) {
      return new Response(JSON.stringify({ error: "Not found" }), addCORSHeaders({ status: 404 }));
    }
    try {
      const resultPromise = route.handler(req);
      const result = await resultPromise;
      if (result instanceof Response) {
        // Copy status and headers, add CORS
        const body = await result.text();
        const headersObj: Record<string, string> = {};
        result.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
        const headers = { ...headersObj, ...addCORSHeaders({}).headers };
        return new Response(body, { status: result.status, headers });
      }
      return new Response(JSON.stringify(result), addCORSHeaders({ status: 200 }));
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), addCORSHeaders({ status: 400 }));
    }
  },
  port: env.PORT ?? 3000,
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  process.exit(0);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});


console.log(`🚀 Carmack Unified Bun Server started on port ${env.PORT ?? 3000}`);
