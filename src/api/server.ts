// Export routes for introspection/testing
export { routes };

// Create server instance (does not start listening)
export function createServer(options?: { port?: number }) {
  return serve({
    async fetch(req) {
      const url = new URL(req.url);
      const route = routes.find(r => r.method === req.method && r.path === url.pathname);
      if (!route) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      try {
        return await route.handler(req);
      } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
      }
    },
    port: options?.port ?? env.PORT ?? 3000,
  });
}

// Stop server (stub, as Bun's serve does not support shutdown yet)
export function stopServer() {
  // No-op for now; add logic if Bun adds shutdown support
}

// Setup graceful shutdown (stub for future extensibility)
export function setupGracefulShutdown() {
  // No-op for now; add signal handling if needed
}
import { serve } from "bun";

import { getEnvironmentConfig } from "../config/environment.ts";
import { initializeTelemetry } from "../telemetry/collector.ts";
import { fileRoutes } from "./routes/file";
import { patternRoutes } from "./routes/pattern";
import { repositoryRoutes } from "./routes/repository";
import { telemetryRoutes } from "./routes/telemetry";
import { vectorRoutes } from "./routes/vector";

// Unified API Server Entrypoint for Carmack Coder

// Centralized, environment-aware config
const env = getEnvironmentConfig();

// Initialize telemetry system with unified config
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

const { analysisActor, AnalysisInputSchema } = require("../actors/analysis.ts");
const { createActor } = require("xstate");
const { getDatabaseOperations } = require("../db/operations.ts");

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


export function startServer(portOverride?: number) {
  const server = serve({
    async fetch(req) {
      const url = new URL(req.url);
      const route = routes.find(r => r.method === req.method && r.path === url.pathname);
      if (!route) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      try {
        // Optionally pass env/config to handlers if needed
        return await route.handler(req);
      } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
      }
    },
    port: portOverride ?? env.PORT ?? 3000,
  });
  return server;
}