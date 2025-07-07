#!/usr/bin/env bun

/**
 * Production CLI for Carmack Coder
 * Handles real codebase transformations with enterprise-grade safety
 */

import { parseArgs } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import { ProductionConfigSchema, defaultProductionConfig, type ProductionConfig } from './production.config.ts';
import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.ts';
import { z } from 'zod';

// CLI Schema
const CLIArgsSchema = z.object({
  config: z.string().optional(),
  repository: z.string().url().optional(),
  branch: z.string().optional(),
  'dry-run': z.boolean().default(false),
  'max-files': z.number().min(1).max(1000).optional(),
  'risk-level': z.enum(['low', 'medium', 'high']).optional(),
  verbose: z.boolean().default(false),
  'skip-tests': z.boolean().default(false),
  'skip-verification': z.boolean().default(false),
  'auto-commit': z.boolean().default(false),
  'workspace': z.string().optional(),
  help: z.boolean().default(false)
}).strict();

type CLIArgs = z.infer<typeof CLIArgsSchema>;

const HELP_TEXT = `
🚀 Carmack Coder Production CLI

USAGE:
  bun production.ts [OPTIONS]

OPTIONS:
  --config <path>           Path to production config file
  --repository <url>        Git repository URL to transform
  --branch <name>           Target branch (default: main)
  --dry-run                 Preview changes without applying
  --max-files <number>      Maximum files to process per batch
  --risk-level <level>      Filter patterns by risk: low|medium|high
  --verbose                 Enable verbose logging
  --skip-tests              Skip test execution during validation
  --skip-verification       Skip Dafny verification
  --auto-commit             Automatically commit successful transformations
  --workspace <path>        Custom workspace directory
  --help                    Show this help message

EXAMPLES:
  # Transform a GitHub repository with default settings
  bun production.ts --repository https://github.com/company/project.git

  # Dry run with custom configuration
  bun production.ts --config ./custom.config.ts --dry-run --verbose

  # Production deployment with auto-commit
  bun production.ts --repository https://github.com/company/project.git --auto-commit --risk-level low

  # Transform specific branch with limited file batch
  bun production.ts --repository https://github.com/company/project.git --branch develop --max-files 5

SAFETY FEATURES:
  - Git checkpoints before every transformation
  - Automatic rollback on test failures
  - Complexity analysis and quality gates
  - Comprehensive validation pipeline
  - Telemetry and performance monitoring

For more information, visit: https://github.com/DavinciDreams/carmack
`;

class ProductionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProductionError';
  }
}

async function loadConfig(configPath?: string): Promise<ProductionConfig> {
  if (!configPath) {
    console.log('📋 Using default production configuration');
    return defaultProductionConfig;
  }

  if (!existsSync(configPath)) {
    throw new ProductionError(
      `Configuration file not found: ${configPath}`,
      'CONFIG_NOT_FOUND',
      { configPath }
    );
  }

  try {
    const configModule = await import(resolve(configPath));
    const config = configModule.default || configModule.config;
    return ProductionConfigSchema.parse(config);
  } catch (error) {
    throw new ProductionError(
      `Invalid configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CONFIG_INVALID',
      { configPath, error }
    );
  }
}

async function setupWorkspace(config: ProductionConfig, customWorkspace?: string): Promise<string> {
  const workspaceDir = customWorkspace || config.repository.workingDirectory;
  
  if (!existsSync(workspaceDir)) {
    console.log(`📁 Creating workspace directory: ${workspaceDir}`);
    mkdirSync(workspaceDir, { recursive: true });
  }

  return workspaceDir;
}

async function cloneRepository(repoUrl: string, branch: string, workspaceDir: string): Promise<void> {
  const git = simpleGit();
  const repoDir = join(workspaceDir, 'repository');

  console.log(`📥 Cloning repository: ${repoUrl}`);
  console.log(`🌿 Target branch: ${branch}`);

  if (existsSync(repoDir)) {
    console.log('🔄 Repository exists, updating...');
    const repoGit = simpleGit(repoDir);
    await repoGit.fetch();
    await repoGit.checkout(branch);
    await repoGit.pull();
  } else {
    await git.clone(repoUrl, repoDir, ['--branch', branch, '--single-branch']);
  }

  console.log('✅ Repository ready');
}

async function validateRepository(repoDir: string, config: ProductionConfig): Promise<void> {
  console.log('🔍 Validating repository structure...');
  
  // Check for package.json or similar project indicators
  const indicators = ['package.json', 'tsconfig.json', 'pyproject.toml', 'Cargo.toml', 'pom.xml'];
  const hasProjectFile = indicators.some(file => existsSync(join(repoDir, file)));
  
  if (!hasProjectFile) {
    throw new ProductionError(
      'No recognized project structure found',
      'INVALID_PROJECT',
      { repoDir, checkedFiles: indicators }
    );
  }

  // Count eligible files
  const eligibleFiles = await discoverEligibleFiles(repoDir, config, { verbose: false });
  console.log(`📊 Found ${eligibleFiles.length} eligible files for transformation`);
  
  if (eligibleFiles.length === 0) {
    throw new ProductionError(
      'No eligible files found for transformation',
      'NO_FILES_FOUND',
      { extensions: config.transformation.allowedFileExtensions }
    );
  }
}

async function discoverEligibleFiles(repoDir: string, config: ProductionConfig, options: { verbose: boolean } = { verbose: false }): Promise<string[]> {
  const eligibleFiles: string[] = [];
  const { allowedFileExtensions, maxFilesPerBatch } = config.transformation;
  const { excludePatterns } = config.repository;

  // Normalize repository directory path
  const normalizedRepoDir = repoDir.replace(/\\/g, '/');

  async function walkDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const normalizedFullPath = fullPath.replace(/\\/g, '/');
        const relativePath = normalizedFullPath.replace(normalizedRepoDir, '').replace(/^\//, '');
        
        // Check if path matches any exclude pattern
        const isExcluded = excludePatterns.some(pattern => {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(relativePath) || regex.test(entry) || relativePath.includes(pattern.replace('/**', ''));
        });

        if (isExcluded) {
          if (options.verbose) {
            console.log(`   ⏭️  Excluding: ${relativePath}`);
          }
          continue;
        }

        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (stats.isFile()) {
          // Check if file extension is allowed
          const hasAllowedExtension = allowedFileExtensions.some(ext => 
            fullPath.endsWith(ext)
          );
          
          if (hasAllowedExtension && eligibleFiles.length < maxFilesPerBatch) {
            eligibleFiles.push(fullPath);
            if (options.verbose) {
              console.log(`   ✅ Including: ${relativePath}`);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read (permissions, etc.)
      console.warn(`⚠️  Skipping directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  await walkDirectory(repoDir);
  return eligibleFiles.slice(0, maxFilesPerBatch);
}

async function runProductionTransformation(config: ProductionConfig, args: CLIArgs): Promise<void> {
  const workspaceDir = await setupWorkspace(config, args.workspace);
  const repoDir = join(workspaceDir, 'repository');

  // Clone/update repository
  if (config.repository.url) {
    await cloneRepository(config.repository.url, args.branch || config.repository.branch, workspaceDir);
    await validateRepository(repoDir, config);
  }

  // Discover eligible files for transformation
  console.log('� Discovering eligible files...');
  const eligibleFiles = await discoverEligibleFiles(repoDir, config);
  console.log(`📁 Selected ${eligibleFiles.length} files for transformation`);
  
  if (args.verbose) {
    console.log('📄 Files to process:');
    eligibleFiles.forEach((file, index) => {
      const relativePath = file.replace(repoDir, '').replace(/^[/\\]/, '');
      console.log(`   ${index + 1}. ${relativePath}`);
    });
  }

  console.log('�🚀 Starting production transformation...');
  console.log(`📁 Working directory: ${repoDir}`);
  console.log(`🎯 Risk level filter: ${config.transformation.riskLevelFilter}`);
  console.log(`🔧 Max files per batch: ${config.transformation.maxFilesPerBatch}`);

  // Create transformation actor with production configuration
  const transformationActor = createActor(carmackCoderMachine, {
    input: {
      targetFiles: eligibleFiles, // Use discovered files instead of directory
      transformationType: 'ast' as const,
      patterns: [], // Will be loaded from patterns.json
      maxComplexity: config.transformation.maxComplexityThreshold,
      dryRun: args['dry-run'] || config.transformation.dryRunFirst,
      productionConfig: config
    }
  });

  // Set up monitoring
  transformationActor.subscribe((state) => {
    if (args.verbose) {
      console.log(`🔄 State: ${state.value} | Status: ${state.context.currentTransformation?.status || 'pending'}`);
    }

    // Log significant events
    if (state.matches('succeeded')) {
      console.log('✅ Transformation completed successfully');
      const transformation = state.context.currentTransformation;
      if (transformation) {
        console.log(`📊 Files modified: ${transformation.filesModified.length}`);
        console.log(`⏱️  Duration: ${transformation.endTime! - transformation.startTime}ms`);
        console.log(`🧮 Complexity: ${JSON.stringify(transformation.complexity, null, 2)}`);
      }
    } else if (state.matches('failed')) {
      console.error('❌ Transformation failed');
      const errors = state.context.currentTransformation?.errors || [];
      errors.forEach(error => console.error(`   ${error}`));
    }
  });

  transformationActor.start();

  // Wait for completion
  return new Promise((resolve, reject) => {
    transformationActor.subscribe((state) => {
      if (state.matches('succeeded')) {
        resolve();
      } else if (state.matches('failed')) {
        reject(new ProductionError(
          'Transformation failed',
          'TRANSFORMATION_FAILED',
          { state: state.value, errors: state.context.currentTransformation?.errors }
        ));
      }
    });

    // Send start event with discovered files
    // biome-ignore lint/suspicious/noExplicitAny: Required for XState event type compatibility
    transformationActor.send({
      type: 'START_TRANSFORMATION',
      request: {
        targetFiles: eligibleFiles, // Use discovered files
        transformationType: 'ast' as const,
        patterns: [], // Will be loaded from patterns
        maxComplexity: config.transformation.maxComplexityThreshold,
        dryRun: args['dry-run'] || config.transformation.dryRunFirst
      }
    } as any);
  });
}

async function main(): Promise<void> {
  try {
    // Parse CLI arguments
    const { values: rawArgs } = parseArgs({
      args: process.argv.slice(2),
      options: {
        config: { type: 'string' },
        repository: { type: 'string' },
        branch: { type: 'string' },
        'dry-run': { type: 'boolean' },
        'max-files': { type: 'string' },
        'risk-level': { type: 'string' },
        verbose: { type: 'boolean' },
        'skip-tests': { type: 'boolean' },
        'skip-verification': { type: 'boolean' },
        'auto-commit': { type: 'boolean' },
        workspace: { type: 'string' },
        help: { type: 'boolean' }
      },
      allowPositionals: false
    });

    // Convert max-files to number if provided
    const processedArgs = {
      ...rawArgs,
      'max-files': rawArgs['max-files'] ? parseInt(rawArgs['max-files']) : undefined
    };

    const args = CLIArgsSchema.parse(processedArgs);

    if (args.help) {
      console.log(HELP_TEXT);
      return;
    }

    // Load configuration
    const config = await loadConfig(args.config);

    // Override config with CLI arguments
    if (args.repository) {
      config.repository.url = args.repository;
    }
    if (args['max-files']) {
      config.transformation.maxFilesPerBatch = args['max-files'];
    }
    if (args['risk-level']) {
      config.transformation.riskLevelFilter = args['risk-level'];
    }
    if (args['skip-tests']) {
      config.qualityGates.requireTests = false;
    }
    if (args['skip-verification']) {
      config.qualityGates.requireDafnyVerification = false;
    }
    if (args.verbose) {
      config.monitoring.logLevel = 'debug';
    }

    console.log('🚀 Carmack Coder Production Deployment');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!config.repository.url) {
      throw new ProductionError(
        'Repository URL is required. Use --repository or provide in config file.',
        'MISSING_REPOSITORY'
      );
    }

    await runProductionTransformation(config, args);

    console.log('🎉 Production deployment completed successfully!');

  } catch (error) {
    console.error('💥 Production deployment failed:');
    
    if (error instanceof ProductionError) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      if (error.context) {
        console.error(`   Context: ${JSON.stringify(error.context, null, 2)}`);
      }
    } else {
      console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  await main();
}
