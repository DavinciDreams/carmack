#!/usr/bin/env bun
/**
 * Thin entrypoint for the Knowledge Graph Ingestion CLI.
 * Delegates all CLI logic to the modularized implementation in src/ingestion/cli.ts.
 */

import { main } from '../ingestion/cli.ts';

if (import.meta.main) {
  main().catch(console.error);
}