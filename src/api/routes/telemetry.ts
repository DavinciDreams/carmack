import { z } from 'zod';
import { TelemetryEventSchema } from '../../types/unified-schemas';

// Zod schema for route params
const TelemetryIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Telemetry Event API Routes

export const telemetryRoutes = [
  {
    method: 'GET',
    path: '/api/telemetry/:id',
    handler: async (req: Request) => {
      // Validate and extract id param
      const urlParts = req.url.split('/');
      const id = urlParts[urlParts.length - 1];
      const idResult = TelemetryIdParamSchema.safeParse({ id });
      if (!idResult.success) {
        return new Response(JSON.stringify({ error: idResult.error.format() }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Replace with actual data source
      const event = {
        id,
        timestamp: new Date(),
        eventType: 'example_event',
      };
      const parsed = TelemetryEventSchema.safeParse(event);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.format() }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(parsed.data), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
  {
    method: 'POST',
    path: '/api/telemetry',
    handler: async (req: Request) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch (_e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const parsed = TelemetryEventSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.format() }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Replace with actual create logic
      return new Response(JSON.stringify(parsed.data), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
];
