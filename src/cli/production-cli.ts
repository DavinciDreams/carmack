#!/usr/bin/env bun

/**
 * Production CLI for Carmack Coder
 * Handles real codebase transformations with enterprise-grade safety
 */

import { existsSync, mkdirSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { simpleGit } from 'simple-git';
import { createActor } from 'xstate';
import { z } from 'zod';
import { carmackCoderMachine } from '../machine.ts';
// ...existing code...
import {
  defaultProductionConfig,
  type ProductionConfig,
  ProductionConfigSchema,
} from '../production/production.config.ts';
import {
  type MachineEvent,
  type TransformationRequest,
  validateMachineEvent,
  validateTransformationRequest,
} from '../types.ts';

//import { ProductionConfigSchema } from './production.config.ts';

// CLI Schema
const CLIArgsSchema = z
  .object({
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
    workspace: z.string().optional(),
    help: z.boolean().default(false),
  })
  .strict();

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
  - Customizable workspace directory
  - Supports multiple repository types (GitHub, GitLab, etc.)`;

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
    throw new ProductionError(`Configuration file not found: ${configPath}`, 'CONFIG_NOT_FOUND', {
      configPath,
    });
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

async function _cloneRepository(
  repoUrl: string,
  branch: string,
  workspaceDir: string
): Promise<void> {
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

async function _validateRepository(repoDir: string, config: ProductionConfig): Promise<void> {
  console.log('🔍 Validating repository structure...');

  // Check for project indicators across multiple languages and build systems
  const indicators = [
    // JavaScript/TypeScript/Node.js
    'package.json',
    'tsconfig.json',

    // Python
    'pyproject.toml',
    'setup.py',
    'requirements.txt',

    // Rust
    'Cargo.toml',

    // Java/Maven/Gradle
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',

    // C++/CUDA/CMake
    'CMakeLists.txt',
    'Makefile',
    'makefile',
    'configure',
    'configure.ac',
    'configure.in',
    'meson.build',
    'BUILD',
    'BUILD.bazel',

    // C/C++ project files
    'vcpkg.json',
    'conanfile.txt',
    'conanfile.py',

    // Go
    'go.mod',

    // .NET
    '*.csproj',
    '*.sln',

    // Generic project indicators
    'README.md',
    'README.txt',
    'LICENSE',
  ];

  const hasProjectFile = indicators.some((file) => {
    if (file.includes('*')) {
      // Handle wildcard patterns like *.csproj
      const pattern = file.replace('*', '');
      try {
        const { readdirSync } = require('node:fs');
        const files = readdirSync(repoDir);
        return files.some((f: string) => f.endsWith(pattern));
      } catch {
        return false;
      }
    }
    return existsSync(join(repoDir, file));
  });

  if (!hasProjectFile) {
    throw new ProductionError('No recognized project structure found', 'INVALID_PROJECT', {
      repoDir,
      checkedFiles: indicators,
      message:
        'Repository must contain at least one project indicator file (CMakeLists.txt, Makefile, package.json, etc.)',
    });
  }

  // Count eligible files
  const eligibleFiles = await discoverEligibleFiles(repoDir, config, { verbose: false });
  console.log(`📊 Found ${eligibleFiles.length} eligible files for transformation`);

  if (eligibleFiles.length === 0) {
    throw new ProductionError('No eligible files found for transformation', 'NO_FILES_FOUND', {
      extensions: config.transformation.allowedFileExtensions,
    });
  }
}

async function discoverEligibleFiles(
  repoDir: string,
  config: ProductionConfig,
  options: { verbose: boolean } = { verbose: false }
): Promise<string[]> {
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
        const isExcluded = excludePatterns.some((pattern) => {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');
          const regex = new RegExp(`^${regexPattern}$`);
          return (
            regex.test(relativePath) ||
            regex.test(entry) ||
            relativePath.includes(pattern.replace('/**', ''))
          );
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
          const hasAllowedExtension = allowedFileExtensions.some((ext) => fullPath.endsWith(ext));

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
      console.warn(
        `⚠️  Skipping directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  await walkDirectory(repoDir);
  return eligibleFiles.slice(0, maxFilesPerBatch);
}

async function runProductionTransformation(config: ProductionConfig, args: CLIArgs): Promise<void> {
  const workspaceDir = await setupWorkspace(config, args.workspace);
  const repoDir = join(workspaceDir, 'repository');

  // Clone/update repository
  // PATCH: Disable auto-clone of Carmack repo at startup for all services.
  // if (config.repository.url) {
  //   await cloneRepository(
  //     config.repository.url,
  //     args.branch || config.repository.branch,
  //     workspaceDir
  //   );
  //   await validateRepository(repoDir, config);
  // }
  // Only clone when explicitly requested by repository manager or via CLI.

  // Discover eligible files for transformation
  console.log('🔍 Discovering eligible files...');
  const eligibleFilesRaw = await discoverEligibleFiles(repoDir, config);
  // Zod-validate eligible files as non-empty string array
  const EligibleFilesSchema = z.array(z.string().min(1));
  const eligibleFiles = EligibleFilesSchema.parse(eligibleFilesRaw);
  console.log(`📁 Selected ${eligibleFiles.length} files for transformation`);

  if (args.verbose) {
    console.log('📄 Files to process:');
    eligibleFiles.forEach((file, index) => {
      const relativePath = file.replace(repoDir, '').replace(/^[/\\]/, '');
      console.log(`   ${index + 1}. ${relativePath}`);
    });
  }

  console.log('🚀 Starting production transformation...');
  console.log(`📁 Working directory: ${repoDir}`);
  console.log(`🎯 Risk level filter: ${config.transformation.riskLevelFilter}`);
  console.log(`🔧 Max files per batch: ${config.transformation.maxFilesPerBatch}`);

  // Create transformation actor with production configuration
  const transformationActor = createActor(carmackCoderMachine, {
    input: {
      targetFiles: eligibleFiles, // Use discovered files instead of directory
      transformationType: 'template' as const, // Start with template, will be dynamically upgraded
      patterns: [], // Will be loaded from patterns.json
      maxComplexity: config.transformation.maxComplexityThreshold,
      dryRun: args['dry-run'] || config.transformation.dryRunFirst,
      productionConfig: config,
    },
  });

  // Set up monitoring
  transformationActor.subscribe((state) => {
    if (args.verbose) {
      console.log(
        `🔄 State: ${state.value} | Status: ${state.context.currentTransformation?.status || 'pending'}`
      );
    }

    // Log significant events
    if (state.matches('succeeded')) {
      console.log('✅ Transformation completed successfully');
      const transformation = state.context.currentTransformation;
      if (transformation) {
        console.log(`📊 Files modified: ${transformation.filesModified.length}`);
        console.log(
          `⏱️  Duration: ${(transformation.endTime ?? Date.now()) - transformation.startTime}ms`
        );
        console.log(`🧮 Complexity: ${JSON.stringify(transformation.complexity, null, 2)}`);
      }
    } else if (state.matches('failed')) {
      console.error('❌ Transformation failed');
      const errors = state.context.currentTransformation?.errors || [];
      errors.forEach((error) => console.error(`   ${error}`));
    }
  });

  transformationActor.start();

  // Wait for completion
  return new Promise<void>((resolve, reject) => {
    // Load and filter transformation patterns using language-aware filtering
    Promise.all([
      import('../utils/index.ts').then((m) =>
        m.loadAllPatterns('./patterns.json', './src/patterns/enhanced-templates.json')
      ),
      import('../utils/pattern-filtering.ts'),
    ])
      .then(([allPatternsRaw, filteringModule]) => {
        // Zod-validate loaded patterns as array of objects with required fields
        const PatternSchema = z
          .object({
            id: z.string(),
            description: z.string(),
            language: z.enum(['typescript', 'javascript', 'cpp', 'c']),
            pattern: z.string(),
            replacement: z.string(),
            complexity: z.number(),
            riskLevel: z.enum(['low', 'medium', 'high']),
            mode: z.enum(['template', 'ast', 'llm']),
            category: z.string().optional(),
            performance: z
              .object({
                priority: z.number(),
                batchable: z.boolean(),
                conflicts: z.array(z.string()).optional(),
                maxMatches: z.number().optional(),
              })
              .optional(),
            verification: z.any().optional(),
            testCases: z.any().optional(),
          })
          .strict();
        const PatternsArraySchema = z.array(PatternSchema);
        const allPatterns = PatternsArraySchema.parse(allPatternsRaw);

        const { filterPatternsByLanguageAndMode } = filteringModule;
        console.log(`📋 Loaded ${allPatterns.length} total transformation patterns`);

        // ...existing code...
        const filterResult = filterPatternsByLanguageAndMode(
          allPatterns,
          eligibleFiles,
          'template',
          {
            maxComplexity: config.transformation.maxComplexityThreshold,
            allowedRiskLevels: ['low', 'medium'],
            strictLanguageMatching: true,
          }
        );

        console.log(
          `🎯 Filtered to ${filterResult.filteredCount}/${filterResult.totalPatterns} patterns for target languages: ${filterResult.filterCriteria.targetLanguages.join(', ')}`
        );

        if (filterResult.warnings.length > 0) {
          console.log('⚠️  Pattern filtering warnings:');
          filterResult.warnings.forEach((warning) => console.log(`   - ${warning}`));
        }

        transformationActor.subscribe((state) => {
          if (state.matches('succeeded')) {
            resolve();
          } else if (state.matches('failed')) {
            reject(
              new ProductionError('Transformation failed', 'TRANSFORMATION_FAILED', {
                state: state.value,
                errors: state.context.currentTransformation?.errors,
              })
            );
          }
        });

        // Send start event with language-filtered patterns
        const transformationRequest: TransformationRequest = validateTransformationRequest({
          targetFiles: eligibleFiles,
          transformationType: 'template' as const,
          patterns: filterResult.filteredPatterns,
          maxComplexity: config.transformation.maxComplexityThreshold,
          dryRun: args['dry-run'] || config.transformation.dryRunFirst,
        });

        const startEvent: MachineEvent = validateMachineEvent({
          type: 'START_TRANSFORMATION',
          request: transformationRequest,
        });

        transformationActor.send(startEvent);
      })
      .catch((error) => {
        console.warn('Failed to load and filter patterns, using empty array:', error);

        const fallbackRequest: TransformationRequest = validateTransformationRequest({
          targetFiles: eligibleFiles,
          transformationType: 'template' as const, // Start with template, will be dynamically upgraded
          patterns: [],
          maxComplexity: config.transformation.maxComplexityThreshold,
          dryRun: args['dry-run'] || config.transformation.dryRunFirst,
        });

        const fallbackEvent: MachineEvent = validateMachineEvent({
          type: 'START_TRANSFORMATION',
          request: fallbackRequest,
        });

        transformationActor.send(fallbackEvent);
      });
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
        help: { type: 'boolean' },
      },
      allowPositionals: false,
    });

    // Convert max-files to number if provided
    const processedArgs = {
      ...rawArgs,
      'max-files': rawArgs['max-files'] ? Number.parseInt(rawArgs['max-files']) : undefined,
    };

    const args = CLIArgsSchema.parse(processedArgs);

    if (args.help) {
      console.log(HELP_TEXT);
      return;
    }

    // Load configuration
    const config = await loadConfig(args.config);

    // Override config with environment variables first, then CLI arguments
    // REPOSITORY_URL is the target repository (e.g., NVIDIA TensorRT)
    // CARMACK_REPOSITORY_URL is the Carmack system repository (should not be used for target)
    if (process.env.REPOSITORY_URL) {
      config.repository.url = process.env.REPOSITORY_URL;
    }
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
