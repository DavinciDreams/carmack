import { z } from 'zod';

import { PatternDefinitionSchema } from '../../types/unified-schemas';

// Pattern Definition API Routes

export const patternRoutes = [
  {
    method: 'GET',
    path: '/api/pattern/:id',
    handler: async (req: Request) => {
      // Extract id param using Zod
      const idMatch = req.url.match(/\/api\/pattern\/([0-9a-fA-F-]{36})$/);
      const id = idMatch?.[1];
      const IdSchema = z.string().uuid();
      const idParse = IdSchema.safeParse(id);
      if (!idParse.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid pattern id', details: idParse.error.errors }),
          { status: 400 }
        );
      }
      // Replace with actual data source
      const pattern = {
        id,
        name: 'Loop Unrolling',
        description: 'Optimizes loops by unrolling iterations.',
        language: 'typescript',
      };
      const parsed = PatternDefinitionSchema.safeParse(pattern);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid pattern metadata', details: parsed.error.errors }),
          { status: 400 }
        );
      }
      return new Response(JSON.stringify(parsed.data), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
  {
    method: 'POST',
    path: '/api/pattern',
    handler: async (req: Request) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON', details: String(e) }), {
          status: 400,
        });
      }
      const parsed = PatternDefinitionSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid pattern metadata', details: parsed.error.errors }),
          { status: 400 }
        );
      }
      // Replace with actual create logic
      return new Response(JSON.stringify(parsed.data), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  },
];
