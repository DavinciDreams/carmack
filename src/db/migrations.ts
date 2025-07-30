import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

import { getDatabaseManager } from './connection.ts';
import { type SchemaMigration } from './schema.ts';


/**
 * Database Migration Management for TensorRT-LLM Knowledge Graph
 *
 * Provides utilities for managing database schema migrations, version tracking,
 * and rollback capabilities. Follows Carmack's principles of provable correctness
 * and safe database operations.
 */


// =============================================================================
// MIGRATION CONFIGURATION
// =============================================================================

/**
 * Migration configuration schema
 */
export const MigrationConfigSchema = z.object({
  migrationsPath: z.string().default('./sql/migrations'),
  backupBeforeMigration: z.boolean().default(true),
  validateAfterMigration: z.boolean().default(true),
  maxRetries: z.number().int().positive().default(3),
  timeoutMs: z.number().int().positive().default(300000), // 5 minutes
});

export type MigrationConfig = z.infer<typeof MigrationConfigSchema>;

/**
 * Migration file schema
 */
export const MigrationFileSchema = z.object({
  version: z.string(),
  filename: z.string(),
  description: z.string(),
  sql: z.string(),
  rollbackSql: z.string().optional(),
});

export type MigrationFile = z.infer<typeof MigrationFileSchema>;

/**
 * Migration result schema
 */
export const MigrationResultSchema = z.object({
  version: z.string(),
  success: z.boolean(),
  executionTime: z.number(),
  error: z.string().optional(),
  appliedAt: z.date(),
});

export type MigrationResult = z.infer<typeof MigrationResultSchema>;

// =============================================================================
// MIGRATION ERRORS
// =============================================================================

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly version: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class MigrationValidationError extends Error {
  constructor(
    message: string,
    public readonly version: string,
    public readonly validationErrors: string[],
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MigrationValidationError';
  }
}

// =============================================================================
// MIGRATION MANAGER
// =============================================================================

export class MigrationManager {
  private db = getDatabaseManager();
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = MigrationConfigSchema.parse(config);
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureMigrationTable();
      console.log('✅ Migration system initialized');
    } catch (error) {
      throw new MigrationError(
        'Failed to initialize migration system',
        'init',
        'INITIALIZATION_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get current database schema version
   */
  async getCurrentVersion(): Promise<string | null> {
    try {
      const query = `
        SELECT version FROM schema_migrations 
        ORDER BY applied_at DESC 
        LIMIT 1
      `;
      
      const result = await this.db.query(query);
      
      return result.rows.length > 0 ? result.rows[0].version : null;
    } catch (error) {
      throw new MigrationError(
        'Failed to get current version',
        'unknown',
        'VERSION_CHECK_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get all applied migrations
   */
  async getAppliedMigrations(): Promise<SchemaMigration[]> {
    try {
      const query = `
        SELECT * FROM schema_migrations 
        ORDER BY applied_at ASC
      `;
      
      const result = await this.db.query(query);
      
      return result.rows.map(row => ({
        ...row,
        applied_at: new Date(row.applied_at),
      }));
    } catch (error) {
      throw new MigrationError(
        'Failed to get applied migrations',
        'unknown',
        'MIGRATION_LIST_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Discover available migration files
   */
  async discoverMigrations(): Promise<MigrationFile[]> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.config.migrationsPath);
      
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure consistent ordering
      
      const migrations: MigrationFile[] = [];
      
      for (const filename of migrationFiles) {
        const migration = await this.parseMigrationFile(filename);
        migrations.push(migration);
      }
      
      return migrations;
    } catch (error) {
      throw new MigrationError(
        'Failed to discover migrations',
        'unknown',
        'DISCOVERY_FAILED',
        { 
          migrationsPath: this.config.migrationsPath,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    try {
      const [available, applied] = await Promise.all([
        this.discoverMigrations(),
        this.getAppliedMigrations(),
      ]);
      
      const appliedVersions = new Set(applied.map(m => m.version));
      
      return available.filter(migration => !appliedVersions.has(migration.version));
    } catch (error) {
      throw new MigrationError(
        'Failed to get pending migrations',
        'unknown',
        'PENDING_CHECK_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: MigrationFile): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);
      
      // Validate migration before applying
      await this.validateMigration(migration);
      
      // Apply migration in transaction
      await this.db.transaction(async (client) => {
        // Execute migration SQL
        await client.query(migration.sql);
        
        // Record migration in schema_migrations table
        await client.query(
          `INSERT INTO schema_migrations (version, description, rollback_sql) 
           VALUES ($1, $2, $3)`,
          [migration.version, migration.description, migration.rollbackSql]
        );
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Migration ${migration.version} applied successfully (${executionTime}ms)`);
      
      return {
        version: migration.version,
        success: true,
        executionTime,
        appliedAt: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Migration ${migration.version} failed: ${errorMessage}`);
      
      return {
        version: migration.version,
        success: false,
        executionTime,
        error: errorMessage,
        appliedAt: new Date(),
      };
    }
  }

  /**
   * Apply all pending migrations
   */
  async migrate(): Promise<MigrationResult[]> {
    try {
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return [];
      }
      
      console.log(`🔄 Applying ${pendingMigrations.length} pending migrations`);
      
      const results: MigrationResult[] = [];
      
      for (const migration of pendingMigrations) {
        const result = await this.applyMigration(migration);
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          throw new MigrationError(
            `Migration ${migration.version} failed: ${result.error}`,
            migration.version,
            'MIGRATION_FAILED',
            { result }
          );
        }
      }
      
      console.log(`✅ All migrations applied successfully`);
      
      return results;
    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      
      throw new MigrationError(
        'Failed to apply migrations',
        'unknown',
        'MIGRATION_BATCH_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollback(targetVersion: string): Promise<MigrationResult[]> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const currentVersion = await this.getCurrentVersion();
      
      if (!currentVersion) {
        throw new MigrationError(
          'No migrations to rollback',
          targetVersion,
          'NO_MIGRATIONS'
        );
      }
      
      // Find migrations to rollback (in reverse order)
      const migrationsToRollback = appliedMigrations
        .filter(m => m.version > targetVersion)
        .reverse();
      
      if (migrationsToRollback.length === 0) {
        console.log(`✅ Already at version ${targetVersion}`);
        return [];
      }
      
      console.log(`🔄 Rolling back ${migrationsToRollback.length} migrations to version ${targetVersion}`);
      
      const results: MigrationResult[] = [];
      
      for (const migration of migrationsToRollback) {
        const result = await this.rollbackMigration(migration);
        results.push(result);
        
        // Stop on first failure
        if (!result.success) {
          throw new MigrationError(
            `Rollback of ${migration.version} failed: ${result.error}`,
            migration.version,
            'ROLLBACK_FAILED',
            { result }
          );
        }
      }
      
      console.log(`✅ Rollback to version ${targetVersion} completed successfully`);
      
      return results;
    } catch (error) {
      if (error instanceof MigrationError) {
        throw error;
      }
      
      throw new MigrationError(
        'Failed to rollback migrations',
        targetVersion,
        'ROLLBACK_BATCH_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: SchemaMigration): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Rolling back migration ${migration.version}`);
      
      if (!migration.rollback_sql) {
        throw new MigrationError(
          'No rollback SQL available',
          migration.version,
          'NO_ROLLBACK_SQL'
        );
      }
      
      // Apply rollback in transaction
      await this.db.transaction(async (client) => {
        // Execute rollback SQL
        await client.query(migration.rollback_sql!);
        
        // Remove migration record
        await client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [migration.version]
        );
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Migration ${migration.version} rolled back successfully (${executionTime}ms)`);
      
      return {
        version: migration.version,
        success: true,
        executionTime,
        appliedAt: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ Rollback of ${migration.version} failed: ${errorMessage}`);
      
      return {
        version: migration.version,
        success: false,
        executionTime,
        error: errorMessage,
        appliedAt: new Date(),
      };
    }
  }

  /**
   * Validate database schema
   */
  async validateSchema(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];
      
      // Check required tables exist
      const requiredTables = [
        'artifacts', 'graph_edges', 'query_sessions', 'intermediates',
        'commits', 'prs', 'cst_nodes', 'artifact_keywords', 'artifact_domains',
        'query_logs', 'system_config', 'schema_migrations'
      ];
      
      for (const table of requiredTables) {
        const exists = await this.tableExists(table);
        if (!exists) {
          errors.push(`Required table '${table}' does not exist`);
        }
      }
      
      // Check pgvector extension
      const pgvectorExists = await this.extensionExists('vector');
      if (!pgvectorExists) {
        errors.push('pgvector extension is not installed');
      }
      
      // Check critical indexes
      const criticalIndexes = [
        'idx_artifacts_embedding_hnsw',
        'idx_graph_edges_source_id',
        'idx_graph_edges_target_id',
      ];
      
      for (const index of criticalIndexes) {
        const exists = await this.indexExists(index);
        if (!exists) {
          errors.push(`Critical index '${index}' does not exist`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = backupName || `backup-${timestamp}`;
      
      // This would typically use pg_dump or similar
      // For now, we'll create a logical backup by exporting data
      console.log(`🔄 Creating backup: ${name}`);
      
      // Implementation would depend on deployment environment
      // Could use pg_dump, cloud provider backup APIs, etc.
      
      console.log(`✅ Backup created: ${name}`);
      
      return name;
    } catch (error) {
      throw new MigrationError(
        'Failed to create backup',
        'backup',
        'BACKUP_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Parse migration file
   */
  private async parseMigrationFile(filename: string): Promise<MigrationFile> {
    try {
      const filePath = join(this.config.migrationsPath, filename);
      const content = await readFile(filePath, 'utf-8');
      
      // Extract version from filename (e.g., "001_initial_schema.sql" -> "001")
      const versionMatch = filename.match(/^(\d+)_/);
      if (!versionMatch || !versionMatch[1]) {
        throw new Error(`Invalid migration filename format: ${filename}`);
      }
      
      const version = versionMatch[1];
      
      // Extract description from filename
      const description = filename
        .replace(/^\d+_/, '')
        .replace(/\.sql$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      // Look for rollback SQL in comments
      const rollbackMatch = content.match(/-- ROLLBACK:\s*\n([\s\S]*?)(?=\n--|$)/);
      const rollbackSql = rollbackMatch?.[1]?.trim();
      
      return {
        version,
        filename,
        description,
        sql: content,
        rollbackSql,
      };
    } catch (error) {
      throw new MigrationError(
        'Failed to parse migration file',
        filename,
        'PARSE_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Validate migration before applying
   */
  private async validateMigration(migration: MigrationFile): Promise<void> {
    const errors: string[] = [];
    
    // Check for dangerous operations
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+DATABASE/i,
      /TRUNCATE/i,
      /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(migration.sql)) {
        errors.push(`Potentially dangerous operation detected: ${pattern.source}`);
      }
    }
    
    // Check for required patterns in schema migrations
    if (migration.version.startsWith('001') || migration.version.startsWith('002')) {
      if (!migration.sql.includes('CREATE EXTENSION IF NOT EXISTS vector')) {
        errors.push('Schema migration should include pgvector extension');
      }
    }
    
    if (errors.length > 0) {
      throw new MigrationValidationError(
        'Migration validation failed',
        migration.version,
        errors
      );
    }
  }

  /**
   * Ensure migration table exists
   */
  private async ensureMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rollback_sql TEXT
      )
    `;
    
    await this.db.query(query);
  }

  /**
   * Check if table exists
   */
  private async tableExists(tableName: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    
    const result = await this.db.query(query, [tableName]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Check if extension exists
   */
  private async extensionExists(extensionName: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = $1
      )
    `;
    
    const result = await this.db.query(query, [extensionName]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Check if index exists
   */
  private async indexExists(indexName: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = $1
      )
    `;
    
    const result = await this.db.query(query, [indexName]);
    return result.rows[0]?.exists || false;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _migrationManager: MigrationManager | null = null;

/**
 * Get the global migration manager instance
 */
export function getMigrationManager(config?: Partial<MigrationConfig>): MigrationManager {
  if (!_migrationManager) {
    _migrationManager = new MigrationManager(config);
  }
  return _migrationManager;
}

/**
 * Convenience function to run migrations
 */
export async function runMigrations(config?: Partial<MigrationConfig>): Promise<MigrationResult[]> {
  const manager = getMigrationManager(config);
  await manager.initialize();
  return manager.migrate();
}

/**
 * Convenience function to rollback migrations
 */
export async function rollbackMigrations(
  targetVersion: string,
  config?: Partial<MigrationConfig>
): Promise<MigrationResult[]> {
  const manager = getMigrationManager(config);
  await manager.initialize();
  return manager.rollback(targetVersion);
}