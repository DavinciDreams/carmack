#!/usr/bin/env bun

/**
 * Carmack Coder Documentation Generator CLI Entry Point
 * 
 * Provides a simple entry point for the documentation generation system
 * using the enhanced CLI implementation with watch mode support.
 */

import { runDocsCLI } from './src/docs/cli.js';

runDocsCLI().catch((error) => {
  console.error('Documentation generation failed:', error);
  process.exit(1);
});
