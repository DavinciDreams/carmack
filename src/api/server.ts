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

const routes = [
  ...repositoryRoutes,
  ...fileRoutes,
  ...patternRoutes,
  ...vectorRoutes,
  ...telemetryRoutes,
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