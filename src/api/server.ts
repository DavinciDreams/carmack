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
  },
  performanceSampleRate: env.TELEMETRY_SAMPLE_RATE,
  behaviorSampleRate: env.TELEMETRY_SAMPLE_RATE,
  retentionDays: env.TELEMETRY_RETENTION_DAYS,
  metricsEndpoint: env.METRICS_ENDPOINT,
  prometheusUrl: env.PROMETHEUS_URL,
  grafanaUrl: env.GRAFANA_URL,
  alertingWebhookUrl: env.ALERTING_WEBHOOK_URL,
  alertEmail: env.ALERT_EMAIL,
});

const routes = [
  ...repositoryRoutes,
  ...fileRoutes,
  ...patternRoutes,
  ...vectorRoutes,
  ...telemetryRoutes,
];

serve({
  async fetch(req) {
    const url = new URL(req.url);
    const route = routes.find(r => r.method === req.method && r.path === url.pathname);
    if (!route) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    try {
      // Optionally pass env/config to handlers if needed
      return await route.handler(req, env);
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
    }
  },
  port: env.PORT ?? 3000,
});