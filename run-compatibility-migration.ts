#!/usr/bin/env bun

/**
 * TensorRT Demo Compatibility Migration Runner
 *
 * This script runs the compatibility migration to add missing tables
 * needed for the original TensorRT demo functionality.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const DB_CONFIG = {
  user: 'carmack',
  host: 'localhost',
  database: 'tensorrt_knowledge_graph',
  password: 'carmack_secure_2024',
  port: 5432,
};

async function runCompatibilityMigration() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('🔌 Connecting to tensorrt_knowledge_graph database...');
    await client.connect();

    console.log('📂 Loading compatibility migration...');
    const migrationPath = join(
      process.cwd(),
      'sql',
      'migrations',
      '002_add_compatibility_tables.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📊 Migration size:', migrationSQL.length, 'characters');

    console.log('⚡ Executing compatibility migration...');
    await client.query(migrationSQL);

    console.log('✅ Compatibility migration completed successfully!');
    console.log('🎯 Demo compatibility tables are now available');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runCompatibilityMigration()
  .then(() => {
    console.log('🚀 TensorRT demo is ready to run!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
