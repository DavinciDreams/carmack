/**
 * Database Module Index for TensorRT-LLM Knowledge Graph
 *
 * Central export point for all database functionality including connections,
 * operations, migrations, seeding, and schema validation. Provides a clean
 * API for the knowledge graph database system.
 */

// =============================================================================
// CONNECTION AND CONFIGURATION
// =============================================================================

export {
  DatabaseConnectionManager,
  DatabaseConnectionError,
  DatabaseHealthCheckError,
  getDatabaseManager,
  initializeDatabase,
  getClient,
  query,
  transaction,
  healthCheck,
  closeDatabase,
  type DatabaseConfig,
  type HealthStatus,
} from './connection.ts';

// =============================================================================
// SCHEMA TYPES AND VALIDATION
// =============================================================================

export {
  // Core schemas
  ArtifactSchema,
  GraphEdgeSchema,
  QuerySessionSchema,
  IntermediateSchema,
  CommitSchema,
  PRSchema,
  CSTNodeSchema,
  ArtifactKeywordSchema,
  ArtifactDomainSchema,
  QueryLogSchema,
  SystemConfigSchema,
  SchemaMigrationSchema,
  
  // Input/Output schemas
  CreateArtifactSchema,
  UpdateArtifactSchema,
  CreateGraphEdgeSchema,
  SearchFiltersSchema,
  SemanticSearchSchema,
  GraphTraversalSchema,
  BatchCreateArtifactsSchema,
  BatchCreateEdgesSchema,
  SearchResultSchema,
  GraphTraversalResultSchema,
  DatabaseOperationResultSchema,
  
  // Enum schemas
  ArtifactTypeSchema,
  PerformanceImpactSchema,
  RelationTypeSchema,
  EvidenceTypeSchema,
  SessionStatusSchema,
  StepTypeSchema,
  StepStatusSchema,
  PRStateSchema,
  RiskAssessmentSchema,
  VisibilitySchema,
  KeywordCategorySchema,
  ExtractionMethodSchema,
  QueryTypeSchema,
  QueryIntentSchema,
  
  // Type exports
  type Artifact,
  type GraphEdge,
  type QuerySession,
  type Intermediate,
  type Commit,
  type PR,
  type CSTNode,
  type ArtifactKeyword,
  type ArtifactDomain,
  type QueryLog,
  type SystemConfig,
  type SchemaMigration,
  type CreateArtifactInput,
  type UpdateArtifactInput,
  type CreateGraphEdgeInput,
  type SearchFilters,
  type SemanticSearchInput,
  type GraphTraversalInput,
  type BatchCreateArtifactsInput,
  type BatchCreateEdgesInput,
  type SearchResult,
  type GraphTraversalResult,
  type DatabaseOperationResult,
  
  // Validation functions
  validateArtifact,
  validateGraphEdge,
  validateSearchFilters,
  validateSemanticSearch,
  validateGraphTraversal,
  safeParseSchema,
} from './schema.ts';

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Type-safe, high-level database operations for artifacts, edges, and sessions.
 *
 * Usage example for ingestion modules:
 *
 * ```ts
 * import { getDatabaseOperations } from './db/index.ts';
 * const dbOps = getDatabaseOperations();
 *
 * // Create a new artifact
 * await dbOps.artifacts.create({ ... });
 *
 * // Batch create artifacts
 * await dbOps.artifacts.batchCreate([{ ... }, { ... }]);
 *
 * // Semantic search
 * await dbOps.artifacts.semanticSearch({ embedding, filters, limit });
 *
 * // Create a graph edge
 * await dbOps.edges.create({ ... });
 * ```
 */
export {
  DatabaseOperations,
  ArtifactOperations,
  GraphEdgeOperations,
  QuerySessionOperations,
  DatabaseOperationError,
  ValidationError,
  getDatabaseOperations,
} from './operations.ts';

// =============================================================================
// MIGRATION MANAGEMENT
// =============================================================================

export {
  MigrationManager,
  MigrationError,
  MigrationValidationError,
  getMigrationManager,
  runMigrations,
  rollbackMigrations,
  type MigrationConfig,
  type MigrationFile,
  type MigrationResult,
  MigrationConfigSchema,
  MigrationFileSchema,
  MigrationResultSchema,
} from './migrations.ts';

// =============================================================================
// SEEDING AND TESTING
// =============================================================================

export {
  DatabaseSeeder,
  TestDataGenerator,
  getDatabaseSeeder,
  seedDatabase,
  clearTestData,
  createTestFixture,
  validateDatabaseIntegrity,
  type SeedingConfig,
  type SeedingResult,
  SeedingConfigSchema,
  SeedingResultSchema,
} from './seeding.ts';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Initialize the complete database system
 */
export async function initializeDatabaseSystem(config?: {
  runMigrations?: boolean;
  validateSchema?: boolean;
  seedTestData?: boolean;
}): Promise<{
  success: boolean;
  migrationsApplied?: number;
  schemaValid?: boolean;
  testDataSeeded?: boolean;
  errors: string[];
}> {
  const result: {
    success: boolean;
    migrationsApplied?: number;
    schemaValid?: boolean;
    testDataSeeded?: boolean;
    errors: string[];
  } = {
    success: false,
    errors: [],
  };

  try {
    // Initialize database connection
    const { initializeDatabase } = await import('./connection.ts');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    // Run migrations if requested
    if (config?.runMigrations) {
      const { getMigrationManager } = await import('./migrations.ts');
      const migrationManager = getMigrationManager();
      await migrationManager.initialize();
      const migrationResults = await migrationManager.migrate();
      result.migrationsApplied = migrationResults.length;
      console.log(`✅ Applied ${migrationResults.length} migrations`);
    }

    // Validate schema if requested
    if (config?.validateSchema) {
      const { getMigrationManager } = await import('./migrations.ts');
      const migrationManager = getMigrationManager();
      const validation = await migrationManager.validateSchema();
      result.schemaValid = validation.isValid;
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
      }
      console.log(`✅ Schema validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    }

    // Seed test data if requested
    if (config?.seedTestData) {
      const { seedDatabase } = await import('./seeding.ts');
      const seedingResult = await seedDatabase({
        clearExistingData: true,
        seedArtifacts: 50,
        seedEdges: 100,
        generateEmbeddings: false,
      });
      result.testDataSeeded = seedingResult.success;
      if (!seedingResult.success) {
        result.errors.push(...seedingResult.errors);
      }
      console.log(`✅ Test data seeding: ${seedingResult.success ? 'SUCCESS' : 'FAILED'}`);
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
}

/**
 * Get database system status
 */
export async function getDatabaseSystemStatus(): Promise<{
  connectionHealthy: boolean;
  currentVersion: string | null;
  totalArtifacts: number;
  totalEdges: number;
  pgvectorEnabled: boolean;
  errors: string[];
}> {
  const status = {
    connectionHealthy: false,
    currentVersion: null as string | null,
    totalArtifacts: 0,
    totalEdges: 0,
    pgvectorEnabled: false,
    errors: [] as string[],
  };

  try {
    // Check connection health
    const { healthCheck } = await import('./connection.ts');
    const health = await healthCheck();
    status.connectionHealthy = health.isHealthy;
    status.pgvectorEnabled = health.pgvectorEnabled;

    if (!health.isHealthy) {
      status.errors.push(health.error || 'Database connection unhealthy');
      return status;
    }

    // Get current schema version
    const { getMigrationManager } = await import('./migrations.ts');
    const migrationManager = getMigrationManager();
    status.currentVersion = await migrationManager.getCurrentVersion();

    // Get data counts
    const { getDatabaseManager } = await import('./connection.ts');
    const db = getDatabaseManager();
    
    const artifactCount = await db.query('SELECT COUNT(*) as count FROM artifacts');
    status.totalArtifacts = parseInt(artifactCount.rows[0]?.count || '0');

    const edgeCount = await db.query('SELECT COUNT(*) as count FROM graph_edges');
    status.totalEdges = parseInt(edgeCount.rows[0]?.count || '0');

    return status;
  } catch (error) {
    status.errors.push(error instanceof Error ? error.message : String(error));
    return status;
  }
}

/**
 * Perform comprehensive database health check
 */
export async function performHealthCheck(): Promise<{
  overall: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: Record<string, unknown>;
  }>;
}> {
  const checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: Record<string, unknown>;
  }> = [];

  // Connection health
  try {
    const { healthCheck } = await import('./connection.ts');
    const health = await healthCheck();
    checks.push({
      name: 'Database Connection',
      status: health.isHealthy ? 'pass' : 'fail',
      message: health.isHealthy ? 'Connection healthy' : (health.error || 'Connection failed'),
      details: { latency: health.latency, version: health.version },
    });
  } catch (error) {
    checks.push({
      name: 'Database Connection',
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Schema validation
  try {
    const { getMigrationManager } = await import('./migrations.ts');
    const migrationManager = getMigrationManager();
    const validation = await migrationManager.validateSchema();
    checks.push({
      name: 'Schema Validation',
      status: validation.isValid ? 'pass' : 'fail',
      message: validation.isValid ? 'Schema is valid' : `Schema validation failed: ${validation.errors.join(', ')}`,
      details: { errors: validation.errors },
    });
  } catch (error) {
    checks.push({
      name: 'Schema Validation',
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Data integrity
  try {
    const { validateDatabaseIntegrity } = await import('./seeding.ts');
    const integrity = await validateDatabaseIntegrity();
    checks.push({
      name: 'Data Integrity',
      status: integrity.isValid ? 'pass' : 'warn',
      message: integrity.isValid ? 'Data integrity is good' : `Data integrity issues: ${integrity.errors.join(', ')}`,
      details: { errors: integrity.errors },
    });
  } catch (error) {
    checks.push({
      name: 'Data Integrity',
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Determine overall status
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;

  let overall: 'healthy' | 'warning' | 'critical';
  if (failCount > 0) {
    overall = 'critical';
  } else if (warnCount > 0) {
    overall = 'warning';
  } else {
    overall = 'healthy';
  }

  return { overall, checks };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default export with commonly used functions
 */
export default {
  // System functions
  initializeDatabaseSystem,
  getDatabaseSystemStatus,
  performHealthCheck,
};