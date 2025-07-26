import { serve } from "bun";
import { z } from "zod";

import { getEnvironmentConfig } from "./config/environment.ts";
import { repositoryRoutes } from "./api/routes/repository.ts";
import { fileRoutes } from "./api/routes/file.ts";
import { patternRoutes } from "./api/routes/pattern.ts";
import { telemetryRoutes } from "./api/routes/telemetry.ts";
import { vectorRoutes } from "./api/routes/vector.ts";



import { analysisActor, AnalysisInputSchema } from "./actors/analysis.ts";
import { createActor } from "xstate";

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


// Merge all route arrays, add /api/query with schema/handler
const routes = [
  ...repositoryRoutes,
  ...fileRoutes,
  ...patternRoutes,
  ...telemetryRoutes,
  ...vectorRoutes,
  {
    method: "POST",
    path: "/api/query",
    handler: queryHandler,
    schema: z.object({
      query: z.string().min(1),
      context: z.object({}).passthrough().optional(),
      options: z.object({}).passthrough().optional(),
    })
  }
];


// Unified request handler
const env = getEnvironmentConfig();
serve({
  async fetch(req) {
    const url = new URL(req.url);
    const route = routes.find(r => r.method === req.method && r.path === url.pathname);
    if (!route) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    try {
      // Type guard for schema property
      if ('schema' in route && route.schema) {
        return await route.handler(req);
      }
      // Fallback: call handler directly
      return await route.handler(req);
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
  },
  port: env.PORT,
});
