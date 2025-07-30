import { z } from 'zod';
import { RepositoryMetadataSchema } from '../../types/unified-schemas';

// Zod schema for route params
const RepositoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Repository API Routes

export const repositoryRoutes = [
  {
    method: 'GET',
    path: '/api/repository/:id',
    handler: async (req: Request) => {
      // Validate and extract id param
      const urlParts = req.url.split('/');
      const id = urlParts[urlParts.length - 1];
      const idResult = RepositoryIdParamSchema.safeParse({ id });
      if (!idResult.success) {
        return new Response(JSON.stringify({ error: idResult.error.format() }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Replace with actual data source
      const repo = {
        id,
        url: 'https://example.com/repo.git',
        name: 'example',
        owner: 'user',
        branch: 'main',
      };
      const parsed = RepositoryMetadataSchema.safeParse(repo);
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
    path: '/api/repository',
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
      const parsed = RepositoryMetadataSchema.safeParse(body);
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
