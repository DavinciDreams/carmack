import { z } from 'zod';

import { FileMetadataSchema } from '../../types/unified-schemas';

// File Metadata API Routes

export const fileRoutes = [
  {
    method: 'GET',
    path: '/api/file/:id',
    handler: async (req: Request) => {
      // Extract id param using Zod
      const idMatch = req.url.match(/\/api\/file\/([0-9a-fA-F-]{36})$/);
      const id = idMatch?.[1];
      const IdSchema = z.string().uuid();
      const idParse = IdSchema.safeParse(id);
      if (!idParse.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid file id', details: idParse.error.errors }),
          { status: 400 }
        );
      }
      // Replace with actual data source
      const file = {
        id,
        repositoryId: '00000000-0000-0000-0000-000000000000',
        path: 'src/example.ts',
        language: 'typescript',
        size: 1234,
      };
      const parsed = FileMetadataSchema.safeParse(file);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid file metadata', details: parsed.error.errors }),
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
    path: '/api/file',
    handler: async (req: Request) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON', details: String(e) }), {
          status: 400,
        });
      }
      const parsed = FileMetadataSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid file metadata', details: parsed.error.errors }),
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
