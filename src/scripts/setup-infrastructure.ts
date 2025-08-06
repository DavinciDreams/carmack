#!/usr/bin/env bun

/**
 * Infrastructure Setup and Validation Script
 *
 * This script validates and sets up the complete TensorRT-LLM knowledge graph
 * infrastructure, following Carmack's principles of provable correctness.
 */

import { z } from 'zod';
import { getEnvironmentConfig } from '../config/environment.ts';
import { getDatabaseManager, initializeDatabase, healthCheck } from '../db/connection.ts';

// =============================================================================
// SETUP VALIDATION SCHEMAS
// =============================================================================

const SetupResultSchema = z.object({
  step: z.string(),
  success: z.boolean(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  duration_ms: z.number(),
});

type SetupResult = z.infer<typeof SetupResultSchema>;

const InfrastructureStatusSchema = z.object({
  overall_status: z.enum(['healthy', 'degraded', 'failed']),
  steps: z.array(SetupResultSchema),
  total_duration_ms: z.number(),
  timestamp: z.date(),
});

type InfrastructureStatus = z.infer<typeof InfrastructureStatusSchema>;

// =============================================================================
// SETUP VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate environment configuration
 */
async function validateEnvironment(): Promise<SetupResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Validating environment configuration...');
    
    const env = getEnvironmentConfig();
    
    // Check required environment variables
    const requiredVars = [
      'NODE_ENV',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_USER',
      'POSTGRES_DATABASE',
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const value = (env as any)[varName];
      return value === undefined || value === null || value === '';
    });
    
    if (missingVars.length > 0) {
      return {
        step: 'environment_validation',
        success: false,
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
        duration_ms: Date.now() - startTime,
      };
    }
    
    // Validate database configuration
    if (!env.POSTGRES_URL && !env.POSTGRES_PASSWORD) {
      console.warn('⚠️ No database password configured - using environment defaults');
    }
    
    return {
      step: 'environment_validation',
      success: true,
      message: 'Environment configuration validated successfully',
      details: {
        node_env: env.NODE_ENV,
        database_host: env.POSTGRES_HOST,
        database_port: env.POSTGRES_PORT,
        database_name: env.POSTGRES_DATABASE,
        pgvector_dimensions: env.PGVECTOR_DIMENSIONS,
      },
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 'environment_validation',
      success: false,
      message: `Environment validation failed: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Test database connection and setup
 */
async function validateDatabase(): Promise<SetupResult> {
  const startTime = Date.now();
  
  try {
    console.log('🗄️ Validating database connection...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Perform health check
    const health = await healthCheck();
    
    if (!health.isHealthy) {
      return {
        step: 'database_validation',
        success: false,
        message: `Database health check failed: ${health.error || 'Unknown error'}`,
        details: health,
        duration_ms: Date.now() - startTime,
      };
    }
    
    // Test basic operations
    const dbManager = getDatabaseManager();
    
    // Test basic query
    const versionResult = await dbManager.query('SELECT version() as version, NOW() as timestamp');
    
    // Test pgvector functionality
    let pgvectorWorking = false;
    try {
      await dbManager.query("SELECT '[1,2,3]'::vector as test_vector");
      pgvectorWorking = true;
    } catch (error) {
      console.warn('⚠️ pgvector extension not available:', error);
    }
    
    // Test table existence
    const tablesResult = await dbManager.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'knowledge_nodes',
      'knowledge_relationships',
      'ingestion_jobs',
      'file_processing_results',
      'agent_tasks',
      'query_logs',
      'system_config',
      'schema_migrations',
    ];
    
    const existingTables = tablesResult.rows.map((row: any) => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      return {
        step: 'database_validation',
        success: false,
        message: `Missing database tables: ${missingTables.join(', ')}`,
        details: {
          existing_tables: existingTables,
          missing_tables: missingTables,
        },
        duration_ms: Date.now() - startTime,
      };
    }
    
    return {
      step: 'database_validation',
      success: true,
      message: 'Database connection and schema validated successfully',
      details: {
        postgres_version: versionResult.rows[0]?.version,
        server_time: versionResult.rows[0]?.timestamp,
        pgvector_enabled: pgvectorWorking,
        tables_count: existingTables.length,
        tables: existingTables,
        latency_ms: health.latency,
      },
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 'database_validation',
      success: false,
      message: `Database validation failed: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Validate TypeScript configuration and build
 */
async function validateTypeScript(): Promise<SetupResult> {
  const startTime = Date.now();
  
  try {
    console.log('📝 Validating TypeScript configuration...');
    
    // Check if tsconfig.json exists and is valid
    const tsconfigPath = './tsconfig.json';
    const tsconfigFile = Bun.file(tsconfigPath);
    
    if (!(await tsconfigFile.exists())) {
      return {
        step: 'typescript_validation',
        success: false,
        message: 'tsconfig.json not found',
        duration_ms: Date.now() - startTime,
      };
    }
    
    const tsconfigContent = await tsconfigFile.json();
    
    // Validate key TypeScript settings
    const compilerOptions = tsconfigContent.compilerOptions || {};
    const requiredSettings = {
      target: 'ES2022',
      module: 'ESNext',
      strict: true,
    };
    
    const issues: string[] = [];
    for (const [key, expectedValue] of Object.entries(requiredSettings)) {
      if (compilerOptions[key] !== expectedValue) {
        issues.push(`${key}: expected ${expectedValue}, got ${compilerOptions[key]}`);
      }
    }
    
    if (issues.length > 0) {
      return {
        step: 'typescript_validation',
        success: false,
        message: `TypeScript configuration issues: ${issues.join(', ')}`,
        duration_ms: Date.now() - startTime,
      };
    }
    
    // Test TypeScript compilation
    // Use UnifiedAnalyzer for type checking
    const proc = Bun.spawn(['bun', 'run', 'src/scripts/pre-commit-typescript.ts', '--dry-run', '--max-risk=high'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const result = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    if (result !== 0 || stdout.includes('❌')) {
      const stderr = await new Response(proc.stderr).text();
      return {
        step: 'typescript_validation',
        success: false,
        message: 'UnifiedAnalyzer type checking failed',
        details: { error: stderr || stdout },
        duration_ms: Date.now() - startTime,
      };
    }
    return {
      step: 'typescript_validation',
      success: true,
      message: 'UnifiedAnalyzer type checking passed',
      details: {
        target: compilerOptions.target,
        module: compilerOptions.module,
        strict: compilerOptions.strict,
      },
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 'typescript_validation',
      success: false,
      message: `TypeScript validation failed: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Validate dependencies and package configuration
 */
async function validateDependencies(): Promise<SetupResult> {
  const startTime = Date.now();
  
  try {
    console.log('📦 Validating dependencies...');
    
    // Check package.json
    const packageFile = Bun.file('./package.json');
    if (!(await packageFile.exists())) {
      return {
        step: 'dependencies_validation',
        success: false,
        message: 'package.json not found',
        duration_ms: Date.now() - startTime,
      };
    }
    
    const packageContent = await packageFile.json();
    
    // Check required dependencies
    const requiredDeps = [
      'zod',
      'pg',
      'fastify',
      '@octokit/rest',
      '@trigger.dev/sdk',
    ];
    
    const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
      return {
        step: 'dependencies_validation',
        success: false,
        message: `Missing required dependencies: ${missingDeps.join(', ')}`,
        duration_ms: Date.now() - startTime,
      };
    }
    
    // Test that key modules can be imported
    try {
      await import('zod');
      await import('pg');
      // Note: Other modules might not be available in this context
    } catch (error) {
      return {
        step: 'dependencies_validation',
        success: false,
        message: `Failed to import required modules: ${error instanceof Error ? error.message : String(error)}`,
        duration_ms: Date.now() - startTime,
      };
    }
    
    return {
      step: 'dependencies_validation',
      success: true,
      message: 'Dependencies validated successfully',
      details: {
        total_dependencies: Object.keys(dependencies).length,
        required_dependencies: requiredDeps,
        node_version: process.version,
        bun_version: Bun.version,
      },
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 'dependencies_validation',
      success: false,
      message: `Dependencies validation failed: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Validate project structure
 */
async function validateProjectStructure(): Promise<SetupResult> {
  const startTime = Date.now();
  
  try {
    console.log('📁 Validating project structure...');
    
    const requiredDirectories = [
      'src',
      'src/config',
      'src/db',
      'src/types',
      'src/ingestion',
      'src/api',
      'src/agents',
      'sql',
    ];
    
    const requiredFiles = [
      'src/config/environment.ts',
      'src/db/connection.ts',
      'src/types/knowledge-graph.ts',
      'sql/init.sql',
      'sql/indices.sql',
      '.env.example',
      'docker-compose.yml',
    ];
    
    const missingDirectories: string[] = [];
    const missingFiles: string[] = [];
    
    // Check directories
    for (const dir of requiredDirectories) {
      try {
        const stat = await Bun.file(`${dir}/`).exists();
        if (!stat) {
          // Try alternative check
          try {
            await Array.fromAsync(new Bun.Glob('*').scan({ cwd: dir }));
            // Directory exists if we can scan it
          } catch {
            missingDirectories.push(dir);
          }
        }
      } catch {
        missingDirectories.push(dir);
      }
    }
    
    // Check files
    for (const file of requiredFiles) {
      const fileHandle = Bun.file(file);
      if (!(await fileHandle.exists())) {
        missingFiles.push(file);
      }
    }
    
    if (missingDirectories.length > 0 || missingFiles.length > 0) {
      return {
        step: 'project_structure_validation',
        success: false,
        message: 'Missing required project structure elements',
        details: {
          missing_directories: missingDirectories,
          missing_files: missingFiles,
        },
        duration_ms: Date.now() - startTime,
      };
    }
    
    return {
      step: 'project_structure_validation',
      success: true,
      message: 'Project structure validated successfully',
      details: {
        directories_checked: requiredDirectories.length,
        files_checked: requiredFiles.length,
      },
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: 'project_structure_validation',
      success: false,
      message: `Project structure validation failed: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// MAIN SETUP FUNCTION
// =============================================================================

/**
 * Run complete infrastructure setup and validation
 */
async function setupInfrastructure(): Promise<InfrastructureStatus> {
  const startTime = Date.now();
  
  console.log('🚀 Starting TensorRT-LLM Knowledge Graph Infrastructure Setup...\n');
  
  const steps: SetupResult[] = [];
  
  // Run validation steps
  const validationSteps = [
    validateEnvironment,
    validateDependencies,
    validateProjectStructure,
    validateTypeScript,
    validateDatabase,
  ];
  
  for (const step of validationSteps) {
    const result = await step();
    steps.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.step}: ${result.message}`);
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    } else {
      console.error(`❌ ${result.step}: ${result.message}`);
      if (result.details) {
        console.error(`   Details:`, result.details);
      }
    }
    console.log(`   Duration: ${result.duration_ms}ms\n`);
  }
  
  // Determine overall status
  const failedSteps = steps.filter(step => !step.success);
  const overallStatus = failedSteps.length === 0 ? 'healthy' : 
                       failedSteps.length <= 2 ? 'degraded' : 'failed';
  
  const totalDuration = Date.now() - startTime;
  
  const status: InfrastructureStatus = {
    overall_status: overallStatus,
    steps,
    total_duration_ms: totalDuration,
    timestamp: new Date(),
  };
  
  // Print summary
  console.log('📊 Infrastructure Setup Summary:');
  console.log(`   Overall Status: ${overallStatus.toUpperCase()}`);
  console.log(`   Total Steps: ${steps.length}`);
  console.log(`   Successful: ${steps.filter(s => s.success).length}`);
  console.log(`   Failed: ${failedSteps.length}`);
  console.log(`   Total Duration: ${totalDuration}ms`);
  
  if (failedSteps.length > 0) {
    console.log('\n❌ Failed Steps:');
    failedSteps.forEach(step => {
      console.log(`   - ${step.step}: ${step.message}`);
    });
  }
  
  if (overallStatus === 'healthy') {
    console.log('\n🎉 Infrastructure setup completed successfully!');
    console.log('   The TensorRT-LLM Knowledge Graph system is ready for use.');
  } else {
    console.log('\n⚠️ Infrastructure setup completed with issues.');
    console.log('   Please address the failed steps before proceeding.');
  }
  
  return status;
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

if (import.meta.main) {
  try {
    const status = await setupInfrastructure();
    
    // Exit with appropriate code
    const exitCode = status.overall_status === 'failed' ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Infrastructure setup failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

export { setupInfrastructure, validateEnvironment, validateDatabase };