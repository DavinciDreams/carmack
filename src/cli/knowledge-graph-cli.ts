#!/usr/bin/env bun
/**
 * CLI Tool for Universal Knowledge Graph Ingestion
 *
 * Command-line interface for running the complete ingestion pipeline
 * with progress tracking, configuration options, and comprehensive logging.
 */

import { parseArgs } from 'util';
import { z } from 'zod';

import { getEnvironmentConfig } from '../config/environment.ts';
import { initializeDatabase } from '../db/connection.ts';
import { createIngestionOrchestrator } from '../ingestion/ingestion-orchestrator.ts';
import { runIngestionTests } from '../ingestion/test-ingestion-pipeline.ts';

// =============================================================================
// CLI CONFIGURATION
// =============================================================================

const CLIArgsSchema = z.object({
  command: z.enum(['ingest', 'test', 'status', 'help']).default('ingest'),
  repositoryUrl: z.string().url().optional(),
  localPath: z.string().default('./workspace/repo'),
  branch: z.string().default('main'),
  maxCommits: z.number().int().positive().default(1000),
  maxPRs: z.number().int().positive().default(500),
  maxFiles: z.number().int().positive().default(1000),
  batchSize: z.number().int().positive().default(10),
  enableAST: z.boolean().default(true),
  enableEmbeddings: z.boolean().default(true),
  enableGitHubData: z.boolean().default(true),
  parallelProcessing: z.boolean().default(false),
  maxConcurrency: z.number().int().positive().default(3),
  verbose: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  configFile: z.string().optional(),
  outputFormat: z.enum(['json', 'text']).default('text'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

type CLIArgs = z.infer<typeof CLIArgsSchema>;

// =============================================================================
// CLI IMPLEMENTATION
// =============================================================================

class IngestionCLI {
  private args: CLIArgs;

  constructor(args: CLIArgs) {
    this.args = args;
  }

  /**
   * Run the CLI command
   */
  async run(): Promise<void> {
    try {
      // Set up logging
      this.setupLogging();

      // Print banner
      if (this.args.outputFormat === 'text') {
        this.printBanner();
      }

      // Execute command
      switch (this.args.command) {
        case 'ingest':
          await this.runIngestion();
          break;
        case 'test':
          await this.runTests();
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          throw new Error(`Unknown command: ${this.args.command}`);
      }
    } catch (error) {
      this.handleError(error);
      process.exit(1);
    }
  }

  /**
   * Run the ingestion pipeline
   */
  private async runIngestion(): Promise<void> {
    if (this.args.dryRun) {
      console.log('🔍 Dry run mode - no actual ingestion will be performed');
      this.printConfiguration();
      return;
    }

  console.log('🚀 Starting Knowledge Graph Ingestion...');
    
    // Initialize database
    await initializeDatabase();
    
    // Create orchestrator with progress tracking
    const orchestrator = createIngestionOrchestrator({
  repositoryUrl: this.args.repositoryUrl || 'https://github.com/NVIDIA/TensorRT-LLM',
      localPath: this.args.localPath,
      branch: this.args.branch,
      maxCommits: this.args.maxCommits,
      maxPRs: this.args.maxPRs,
      maxFiles: this.args.maxFiles,
      batchSize: this.args.batchSize,
      enableAST: this.args.enableAST,
      enableEmbeddings: this.args.enableEmbeddings,
      enableGitHubData: this.args.enableGitHubData,
      parallelProcessing: this.args.parallelProcessing,
      maxConcurrency: this.args.maxConcurrency,
    });

    // Set up progress tracking
    let lastProgress = '';
    orchestrator.onProgress((progress) => {
      if (this.args.outputFormat === 'text') {
        const progressText = `[${progress.completedSteps}/${progress.totalSteps}] ${progress.phase}: ${progress.currentStep}`;
        if (progressText !== lastProgress) {
          console.log(`📊 ${progressText}`);
          lastProgress = progressText;
        }
        
        if (progress.estimatedCompletion) {
          const eta = new Date(progress.estimatedCompletion).toLocaleTimeString();
          console.log(`⏱️  ETA: ${eta}`);
        }
      } else {
        // JSON output
        console.log(JSON.stringify({
          type: 'progress',
          data: progress,
        }));
      }
    });

    // Run ingestion
    const startTime = Date.now();
    const result = await orchestrator.runIngestion();
    const totalTime = Date.now() - startTime;

    // Output results
    if (this.args.outputFormat === 'json') {
      console.log(JSON.stringify({
        type: 'result',
        data: result,
      }, null, 2));
    } else {
      this.printIngestionResults(result, totalTime);
    }

    if (!result.success) {
      process.exit(1);
    }
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<void> {
  console.log('🧪 Running Ingestion Pipeline Tests...');
    
    const testConfig = {
      testMode: this.args.verbose ? 'full' as const : 'integration' as const,
      verbose: this.args.verbose,
      enableCleanup: true,
    };

    const suite = await runIngestionTests(testConfig);

    if (this.args.outputFormat === 'json') {
      console.log(JSON.stringify(suite, null, 2));
    } else {
      // Results already printed by test runner
    }

    if (suite.failureCount > 0) {
      process.exit(1);
    }
  }

  /**
   * Show system status
   */
  private async showStatus(): Promise<void> {
  console.log('📊 Knowledge Graph System Status');
    console.log('='.repeat(50));

    try {
      // Check database connection
      await initializeDatabase();
      console.log('✅ Database: Connected');
      
      // Check environment variables
      const env = getEnvironmentConfig();
      console.log(`✅ Environment: ${env.NODE_ENV}`);
      console.log(`${env.GITHUB_TOKEN ? '✅' : '⚠️'} GitHub Token: ${env.GITHUB_TOKEN ? 'Configured' : 'Missing'}`);
      console.log(`${env.HF_TOKEN ? '✅' : '⚠️'} HuggingFace Token: ${env.HF_TOKEN ? 'Configured' : 'Missing'}`);
      
      // Check workspace
      console.log(`📁 Workspace: ${this.args.localPath}`);
      
    } catch (error) {
      console.error('❌ System check failed:', error);
      process.exit(1);
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
Knowledge Graph Ingestion CLI

USAGE:
  bun run src/ingestion/cli.ts [COMMAND] [OPTIONS]

COMMANDS:
  ingest    Run the complete ingestion pipeline (default)
  test      Run the test suite
  status    Show system status
  help      Show this help message

OPTIONS:
  --repository-url URL     Repository URL to process (default: https://github.com/NVIDIA/TensorRT-LLM)
  --local-path PATH        Local path for repository (default: ./workspace/repo)
  --branch BRANCH          Git branch to process (default: main)
  --max-commits N          Maximum commits to process (default: 1000)
  --max-prs N              Maximum PRs to fetch (default: 500)
  --max-files N            Maximum files to process (default: 1000)
  --batch-size N           Batch size for processing (default: 10)
  --no-ast                 Disable AST analysis
  --no-embeddings          Disable embedding generation
  --no-github-data         Disable GitHub data fetching
  --parallel               Enable parallel processing
  --max-concurrency N      Maximum concurrent operations (default: 3)
  --verbose                Enable verbose output
  --dry-run                Show configuration without running
  --output-format FORMAT   Output format: text|json (default: text)
  --log-level LEVEL        Log level: debug|info|warn|error (default: info)

EXAMPLES:
  # Run complete ingestion
  bun run src/ingestion/cli.ts ingest

  # Run with custom repository
  bun run src/ingestion/cli.ts ingest --repository-url https://github.com/user/repo

  # Run tests
  bun run src/ingestion/cli.ts test --verbose

  # Check system status
  bun run src/ingestion/cli.ts status

  # Dry run with configuration preview
  bun run src/ingestion/cli.ts ingest --dry-run --verbose

ENVIRONMENT VARIABLES:
  GITHUB_TOKEN             GitHub API token for PR/issue data
  HF_TOKEN                 HuggingFace API token for embeddings
  POSTGRES_URL             PostgreSQL connection URL
  NODE_ENV                 Environment: development|staging|production
`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Setup logging configuration
   */
  private setupLogging(): void {
    // In a real implementation, you would configure a proper logger
    if (this.args.verbose) {
      console.log(`🔧 Log level: ${this.args.logLevel}`);
      console.log(`📝 Output format: ${this.args.outputFormat}`);
    }
  }

  /**
   * Print CLI banner
   */
  private printBanner(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                Universal Knowledge Graph                     ║
║                    Ingestion Pipeline                        ║
╚══════════════════════════════════════════════════════════════╝
`);
  }

  /**
   * Print configuration
   */
  private printConfiguration(): void {
    console.log('\n📋 Configuration:');
  console.log(`   Repository: ${this.args.repositoryUrl || 'https://github.com/NVIDIA/TensorRT-LLM'}`);
    console.log(`   Local Path: ${this.args.localPath}`);
    console.log(`   Branch: ${this.args.branch}`);
    console.log(`   Max Commits: ${this.args.maxCommits}`);
    console.log(`   Max PRs: ${this.args.maxPRs}`);
    console.log(`   Max Files: ${this.args.maxFiles}`);
    console.log(`   AST Analysis: ${this.args.enableAST ? 'Enabled' : 'Disabled'}`);
    console.log(`   Embeddings: ${this.args.enableEmbeddings ? 'Enabled' : 'Disabled'}`);
    console.log(`   GitHub Data: ${this.args.enableGitHubData ? 'Enabled' : 'Disabled'}`);
    console.log(`   Parallel Processing: ${this.args.parallelProcessing ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Print ingestion results
   */
  private printIngestionResults(result: any, totalTime: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Ingestion Results');
    console.log('='.repeat(60));
    
    if (result.success) {
      console.log('✅ Status: SUCCESS');
    } else {
      console.log('❌ Status: FAILED');
    }
    
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`📁 Repository: ${result.summary.repositoryPath}`);
    console.log(`🌿 Branch: ${result.summary.branch}`);
    
    if (result.summary.lastCommit) {
      console.log(`📝 Last Commit: ${result.summary.lastCommit.substring(0, 8)}`);
    }
    
    console.log('\n📈 Statistics:');
    console.log(`   Commits: ${result.summary.totalCommits}`);
    console.log(`   PRs: ${result.summary.totalPRs}`);
    console.log(`   Files: ${result.summary.totalFiles}`);
    console.log(`   Artifacts: ${result.summary.totalArtifacts}`);
    console.log(`   Relationships: ${result.summary.totalRelationships}`);
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach((warning: string) => {
        console.log(`   • ${warning}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error: string) => {
        console.log(`   • ${error}`);
      });
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Handle CLI errors
   */
  private handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (this.args.outputFormat === 'json') {
      console.error(JSON.stringify({
        type: 'error',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }));
    } else {
      console.error(`❌ Error: ${errorMessage}`);
      
      if (this.args.verbose && error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Parse command line arguments
 */
function parseCommandLineArgs(): CLIArgs {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'repository-url': { type: 'string' },
      'local-path': { type: 'string', default: './workspace/tensorrt-llm' },
      'branch': { type: 'string', default: 'main' },
      'max-commits': { type: 'string', default: '1000' },
      'max-prs': { type: 'string', default: '500' },
      'max-files': { type: 'string', default: '1000' },
      'batch-size': { type: 'string', default: '10' },
      'no-ast': { type: 'boolean', default: false },
      'no-embeddings': { type: 'boolean', default: false },
      'no-github-data': { type: 'boolean', default: false },
      'parallel': { type: 'boolean', default: false },
      'max-concurrency': { type: 'string', default: '3' },
      'verbose': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'output-format': { type: 'string', default: 'text' },
      'log-level': { type: 'string', default: 'info' },
      'help': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const command = positionals[0] || (values.help ? 'help' : 'ingest');

  return CLIArgsSchema.parse({
    command,
    repositoryUrl: values['repository-url'],
    localPath: values['local-path'],
    branch: values['branch'],
    maxCommits: parseInt(values['max-commits'] || '1000'),
    maxPRs: parseInt(values['max-prs'] || '500'),
    maxFiles: parseInt(values['max-files'] || '1000'),
    batchSize: parseInt(values['batch-size'] || '10'),
    enableAST: !values['no-ast'],
    enableEmbeddings: !values['no-embeddings'],
    enableGitHubData: !values['no-github-data'],
    parallelProcessing: values['parallel'],
    maxConcurrency: parseInt(values['max-concurrency'] || '3'),
    verbose: values['verbose'],
    dryRun: values['dry-run'],
    outputFormat: values['output-format'],
    logLevel: values['log-level'],
  });
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const args = parseCommandLineArgs();
    const cli = new IngestionCLI(args);
    await cli.run();
  } catch (error) {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { IngestionCLI, parseCommandLineArgs, main };