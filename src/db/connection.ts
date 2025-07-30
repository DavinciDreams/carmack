/**
 * Database Connection Module for TensorRT-LLM Knowledge Graph
 *
 * Provides PostgreSQL connection pool with pgvector support, connection testing,
 * retry logic, and health check utilities following Carmack's principles of
 * provable correctness and robust error handling.
 */

import { Pool } from 'pg';
import type { PoolClient, PoolConfig } from 'pg';
import { z } from 'zod';
import { getEnvironmentConfig } from '../config/environment.ts';

// =============================================================================
// DATABASE CONFIGURATION SCHEMAS
// =============================================================================

/**
 * Database connection configuration schema
 */
const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().min(1).max(65535),
  user: z.string(),
  password: z.string().optional(),
  database: z.string(),
  maxConnections: z.number().min(1).max(100).default(20),
  idleTimeout: z.number().min(1000).default(30000),
  connectionTimeout: z.number().min(1000).default(5000),
  ssl: z.boolean().default(false),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Connection health status schema
 */
const HealthStatusSchema = z.object({
  isHealthy: z.boolean(),
  timestamp: z.date(),
  latency: z.number().optional(),
  error: z.string().optional(),
  pgvectorEnabled: z.boolean().default(false),
  version: z.string().optional(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// =============================================================================
// DATABASE CONNECTION ERRORS
// =============================================================================

export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseHealthCheckError extends Error {
  constructor(
    message: string,
    public readonly healthStatus: HealthStatus,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseHealthCheckError';
  }
}

// =============================================================================
// DATABASE CONNECTION MANAGER
// =============================================================================

/**
 * PostgreSQL connection manager with pgvector support
 */
export class DatabaseConnectionManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;
  private lastHealthCheck: HealthStatus | null = null;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = this.buildConfig(config);
  }

  /**
   * Build database configuration from environment and overrides
   */
  private buildConfig(overrides?: Partial<DatabaseConfig>): DatabaseConfig {
    const env = getEnvironmentConfig();
    
    // Parse connection URL if provided
    if (env.POSTGRES_URL && !overrides) {
      return this.parseConnectionUrl(env.POSTGRES_URL);
    }

    const baseConfig = {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DATABASE,
      maxConnections: env.POSTGRES_MAX_CONNECTIONS,
      idleTimeout: env.POSTGRES_IDLE_TIMEOUT,
      connectionTimeout: env.POSTGRES_CONNECTION_TIMEOUT,
      ssl: env.NODE_ENV === 'production',
    };

    const mergedConfig = { ...baseConfig, ...overrides };
    return DatabaseConfigSchema.parse(mergedConfig);
  }

  /**
   * Parse PostgreSQL connection URL
   */
  private parseConnectionUrl(url: string): DatabaseConfig {
    try {
      const parsed = new URL(url);
      
      return DatabaseConfigSchema.parse({
        host: parsed.hostname,
        port: parseInt(parsed.port) || 5432,
        user: parsed.username,
        password: parsed.password,
        database: parsed.pathname.slice(1), // Remove leading slash
        ssl: parsed.searchParams.get('ssl') === 'true',
      });
    } catch (error) {
      throw new DatabaseConnectionError(
        'Invalid PostgreSQL connection URL',
        'INVALID_CONNECTION_URL',
        { url, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeout,
        connectionTimeoutMillis: this.config.connectionTimeout,
        ssl: this.config.ssl,
        // Enable keep-alive for long-running connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };

      this.pool = new Pool(poolConfig);

      // Set up error handling
      this.pool.on('error', (error) => {
        console.error('❌ PostgreSQL pool error:', error);
      });

      this.pool.on('connect', () => {
        console.log('✅ New PostgreSQL client connected');
      });

      this.pool.on('remove', () => {
        console.log('🔌 PostgreSQL client removed from pool');
      });

      // Test initial connection
      await this.testConnection();
      
      // Initialize pgvector extension
      await this.initializePgVector();

      this.isInitialized = true;
      console.log('✅ Database connection pool initialized successfully');
    } catch (error) {
      throw new DatabaseConnectionError(
        'Failed to initialize database connection pool',
        'INITIALIZATION_FAILED',
        { 
          config: { ...this.config, password: '[REDACTED]' },
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  /**
   * Test database connection with retry logic
   */
  async testConnection(maxRetries = 3): Promise<void> {
    if (!this.pool) {
      throw new DatabaseConnectionError(
        'Database pool not initialized',
        'POOL_NOT_INITIALIZED'
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          const result = await client.query('SELECT NOW() as timestamp, version() as version');
          console.log(`✅ Database connection test successful (attempt ${attempt})`);
          console.log(`📊 Server time: ${result.rows[0]?.timestamp}`);
          console.log(`🔧 PostgreSQL version: ${result.rows[0]?.version}`);
          return;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Database connection test failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new DatabaseConnectionError(
      `Database connection test failed after ${maxRetries} attempts`,
      'CONNECTION_TEST_FAILED',
      { lastError: lastError?.message }
    );
  }

  /**
   * Initialize pgvector extension for vector operations
   */
  async initializePgVector(): Promise<void> {
    if (!this.pool) {
      throw new DatabaseConnectionError(
        'Database pool not initialized',
        'POOL_NOT_INITIALIZED'
      );
    }

    try {
      const client = await this.pool.connect();
      
      try {
        // Create pgvector extension if it doesn't exist
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('✅ pgvector extension initialized');

        // Verify pgvector is working
        const result = await client.query("SELECT '[1,2,3]'::vector as test_vector");
        if (result.rows[0]?.test_vector) {
          console.log('✅ pgvector functionality verified');
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize pgvector extension:', error);
      // Don't throw here as pgvector might not be available in all environments
    }
  }

  /**
   * Get a database client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool || !this.isInitialized) {
      throw new DatabaseConnectionError(
        'Database connection not initialized',
        'NOT_INITIALIZED'
      );
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      throw new DatabaseConnectionError(
        'Failed to acquire database client',
        'CLIENT_ACQUISITION_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getClient();
    
    try {
      const result = await client.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.pool || !this.isInitialized) {
        const status: HealthStatus = {
          isHealthy: false,
          timestamp: new Date(),
          pgvectorEnabled: false,
          error: 'Database connection not initialized',
        };
        this.lastHealthCheck = status;
        return status;
      }

      const client = await this.pool.connect();
      
      try {
        // Basic connectivity test
        const result = await client.query('SELECT NOW() as timestamp, version() as version');
        
        // Test pgvector availability
        let pgvectorEnabled = false;
        try {
          await client.query("SELECT '[1,2,3]'::vector");
          pgvectorEnabled = true;
        } catch {
          // pgvector not available
        }

        const latency = Date.now() - startTime;
        const status: HealthStatus = {
          isHealthy: true,
          timestamp: new Date(),
          latency,
          pgvectorEnabled,
          version: result.rows[0]?.version,
        };

        this.lastHealthCheck = status;
        return status;
      } finally {
        client.release();
      }
    } catch (error) {
      const status: HealthStatus = {
        isHealthy: false,
        timestamp: new Date(),
        pgvectorEnabled: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };

      this.lastHealthCheck = status;
      return status;
    }
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      console.log('✅ Database connection pool closed');
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let _databaseManager: DatabaseConnectionManager | null = null;

/**
 * Get the global database connection manager instance
 */
export function getDatabaseManager(): DatabaseConnectionManager {
  if (!_databaseManager) {
    _databaseManager = new DatabaseConnectionManager();
  }
  return _databaseManager;
}

/**
 * Initialize the global database connection
 */
export async function initializeDatabase(): Promise<void> {
  const manager = getDatabaseManager();
  await manager.initialize();
}

/**
 * Get a database client from the global pool
 */
export async function getClient(): Promise<PoolClient> {
  const manager = getDatabaseManager();
  return manager.getClient();
}

/**
 * Execute a query using the global pool
 */
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const manager = getDatabaseManager();
  return manager.query<T>(text, params);
}

/**
 * Execute a transaction using the global pool
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const manager = getDatabaseManager();
  return manager.transaction(callback);
}

/**
 * Perform a health check on the global database connection
 */
export async function healthCheck(): Promise<HealthStatus> {
  const manager = getDatabaseManager();
  return manager.healthCheck();
}

/**
 * Close the global database connection
 */
export async function closeDatabase(): Promise<void> {
  if (_databaseManager) {
    await _databaseManager.close();
    _databaseManager = null;
  }
}