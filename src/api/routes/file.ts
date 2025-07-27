import { z } from "zod";

import { FileMetadataSchema } from "../../types/unified-schemas";

// File Metadata API Routes

export const fileRoutes = [
  {
    method: "GET",
    path: "/api/file/:id",
    handler: async (req: Request) => {
      const id = req.url.split("/").pop()!;
      // Replace with actual data source
      const file = {
        id,
        repositoryId: "00000000-0000-0000-0000-000000000000",
        path: "src/example.ts",
        language: "typescript",
        size: 1234,
      };
      const parsed = FileMetadataSchema.safeParse(file);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
      }
      return new Response(JSON.stringify(parsed.data), { headers: { "Content-Type": "application/json" } });
    },
  },
  {
    method: "POST",
    path: "/api/file",
    handler: async (req: Request) => {
      const body = await req.json();
      const parsed = FileMetadataSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
      }
      // Replace with actual create logic
      return new Response(JSON.stringify(parsed.data), { status: 201, headers: { "Content-Type": "application/json" } });
    },
  },
];