#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

// Database configuration - connect as postgres user first
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: 'postgres', // Connect to default postgres database first
  user: 'postgres',
  // No password - container uses trust authentication
});

async function runMigration() {
  // Step 1: Connect as postgres user to create user and database
  console.log('🔄 Starting TensorRT Knowledge Graph setup...');
  
  let adminClient = await pool.connect();
  
  try {
    // Create user carmack
    console.log('👤 Creating user "carmack"...');
    try {
      await adminClient.query(`CREATE USER carmack WITH PASSWORD 'carmack_password';`);
      console.log('✅ User "carmack" created');
    } catch (error: any) {
      if (error.code === '42710') { // User already exists
        console.log('ℹ️ User "carmack" already exists');
      } else {
        throw error;
      }
    }
    
    // Create database
    console.log('🗄️ Creating database "tensorrt_knowledge_graph"...');
    try {
      await adminClient.query(`CREATE DATABASE tensorrt_knowledge_graph OWNER carmack;`);
      console.log('✅ Database "tensorrt_knowledge_graph" created');
    } catch (error: any) {
      if (error.code === '42P04') { // Database already exists
        console.log('ℹ️ Database "tensorrt_knowledge_graph" already exists');
      } else {
        throw error;
      }
    }
    
    // Grant permissions
    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE tensorrt_knowledge_graph TO carmack;`);
    console.log('✅ Permissions granted to carmack');
    
  } finally {
    adminClient.release();
    await pool.end();
  }
  
  // Step 2: Connect to target database and run schema migration
  console.log('🔌 Connecting to tensorrt_knowledge_graph database...');
  
  const targetPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'tensorrt_knowledge_graph',
    user: 'carmack',
    password: 'carmack_password',
  });

  const client = await targetPool.connect();
  
  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'sql', 'migrations', '001_tensorrt_knowledge_graph_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📂 Migration file loaded successfully');
    console.log(`📊 Migration size: ${migrationSQL.length} characters`);
    
    // Execute the migration
    console.log('⚡ Executing schema migration...');
    await client.query(migrationSQL);
    console.log('✅ Schema migration completed successfully!');
    
    // Verify some key tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`📊 Created ${result.rows.length} tables:`);
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('🎯 TensorRT Knowledge Graph is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await targetPool.end();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});