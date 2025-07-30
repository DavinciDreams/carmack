import { z } from 'zod';

/**
 * Environment Configuration Module for Carmack Coder
 *
 * Provides type-safe environment variable loading and validation using Zod schemas.
 * Follows the project's principles of runtime validation and formal correctness.
 */


// =============================================================================
// ENVIRONMENT VARIABLE SCHEMAS
// =============================================================================

/**
 * Core application environment schema
 */
const CoreEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  CARMACK_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().default(3000),
});

/**
 * Repository configuration schema
 */
const RepositoryEnvironmentSchema = z.object({
  CARMACK_REPOSITORY_URL: z.string().url().optional(),
  REPOSITORY_URL: z.string().url().optional(),
  CARMACK_REPOSITORY_OWNER: z.string().optional(),
  CARMACK_REPOSITORY_NAME: z.string().optional(),
  CARMACK_BRANCH: z.string().default('main'),
  BRANCH: z.string().optional(),
  CARMACK_WORKSPACE: z.string().default('./workspace'),
  WORKSPACE_DIR: z.string().optional(),
  GIT_USER_NAME: z.string().optional(),
  GIT_USER_EMAIL: z.string().email().optional(),
  GIT_TOKEN: z.string().optional(),
});

/**
 * LLM provider configuration schema
 */
const LLMEnvironmentSchema = z.object({
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']).default('mock'),
  LLM_MODEL: z.string().default('gpt-4'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_ORGANIZATION: z.string().optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

  // Local LLM
  LOCAL_LLM_URL: z.string().url().default('http://localhost:11434'),
  LOCAL_LLM_MODEL: z.string().default('codellama:7b'),

  // LLM Request Settings
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_MAX_TOKENS: z.coerce.number().positive().default(4000),
  LLM_TIMEOUT: z.coerce.number().positive().default(30000),
  LLM_RETRIES: z.coerce.number().min(0).default(3),
});

/**
 * Transformation pipeline configuration schema
 */
const TransformationEnvironmentSchema = z.object({
  TRANSFORMATION_PREFERRED_ORDER: z.string().default('template,ast,llm'),
  TRANSFORMATION_FALLBACK_ENABLED: z.coerce.boolean().default(true),
  TRANSFORMATION_PARALLEL_PROCESSING: z.coerce.boolean().default(false),
  TRANSFORMATION_MAX_CONCURRENCY: z.coerce.number().positive().default(3),
  MAX_FILES_PER_BATCH: z.coerce.number().positive().default(10),
  MAX_COMPLEXITY_THRESHOLD: z.coerce.number().positive().default(15),
  MAX_COMPLEXITY_INCREASE: z.coerce.number().positive().default(0.2),
  ALLOWED_FILE_EXTENSIONS: z.string().default('.ts,.tsx,.js,.jsx,.mts,.cts'),
  RISK_LEVEL_FILTER: z.enum(['low', 'medium', 'high']).default('medium'),
});

/**
 * Quality assurance configuration schema
 */
const QualityEnvironmentSchema = z.object({
  ENABLE_VALIDATION: z.coerce.boolean().default(true),
  ENABLE_TESTING: z.coerce.boolean().default(true),
  ENABLE_COMPLEXITY_CHECK: z.coerce.boolean().default(true),
  REQUIRE_TYPE_CHECK: z.coerce.boolean().default(true),
  ENABLE_FORMAT_CHECK: z.coerce.boolean().default(true),
  MIN_TEST_COVERAGE: z.coerce.number().min(0).max(100).default(80),
  ENABLE_DAFNY_VERIFICATION: z.coerce.boolean().default(true),
  DAFNY_PATH: z.string().default('/usr/local/bin/dafny'),
  DAFNY_TIMEOUT: z.coerce.number().positive().default(60000),
});

/**
 * Pattern learning configuration schema
 */
const PatternEnvironmentSchema = z.object({
  ENABLE_PATTERN_DISCOVERY: z.coerce.boolean().default(true),
  ENABLE_PATTERN_LEARNING: z.coerce.boolean().default(true),
  PATTERN_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  MAX_PATTERNS: z.coerce.number().positive().default(100),
  PATTERN_LEARNING_RATE: z.coerce.number().min(0).max(1).default(0.1),
  PATTERNS_FILE_PATH: z.string().default('./patterns.json'),
  PATTERN_EFFECTIVENESS_FILE: z.string().default('./data/pattern-effectiveness.json'),
});

/**
 * Telemetry configuration schema
 */
const TelemetryEnvironmentSchema = z.object({
  CARMACK_TELEMETRY_ENABLED: z.coerce.boolean().default(true),
  TELEMETRY_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  TELEMETRY_BATCH_SIZE: z.coerce.number().positive().default(100),
  TELEMETRY_FLUSH_INTERVAL: z.coerce.number().positive().default(5000),
  TELEMETRY_MAX_BUFFER_SIZE: z.coerce.number().positive().default(1000),
  TELEMETRY_COLLECT_USER_IDS: z.coerce.boolean().default(false),
  TELEMETRY_COLLECT_FILE_PATHS: z.coerce.boolean().default(true),
  TELEMETRY_RETENTION_DAYS: z.coerce.number().positive().default(90),
  METRICS_ENDPOINT: z.string().url().optional(),
  PROMETHEUS_URL: z.string().url().default('http://localhost:9090'),
  GRAFANA_URL: z.string().url().default('http://localhost:3000'),
  ALERTING_WEBHOOK_URL: z.string().url().optional(),
  ALERT_EMAIL: z.string().email().optional(),
});

/**
 * Logging configuration schema
 */
const LoggingEnvironmentSchema = z.object({
  CARMACK_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_FILE_PATH: z.string().default('./logs/carmack.log'),
  ENABLE_CONSOLE_LOGGING: z.coerce.boolean().default(true),
  ENABLE_FILE_LOGGING: z.coerce.boolean().default(true),
});

/**
 * Performance configuration schema
 */
const PerformanceEnvironmentSchema = z.object({
  MAX_TRANSFORMATION_TIME: z.coerce.number().positive().default(300000),
  MAX_MEMORY_USAGE: z.coerce.number().positive().default(1024),
  MAX_CPU_USAGE: z.coerce.number().min(1).max(100).default(80),
  DEFAULT_TIMEOUT: z.coerce.number().positive().default(300000),
  ACTOR_TIMEOUT: z.coerce.number().positive().default(30000),
  PIPELINE_TIMEOUT: z.coerce.number().positive().default(600000),
  MAX_CONCURRENT_TRANSFORMATIONS: z.coerce.number().positive().default(5),
  MAX_CONCURRENT_VALIDATIONS: z.coerce.number().positive().default(3),
});

/**
 * Backup and rollback configuration schema
 */
const BackupEnvironmentSchema = z.object({
  ENABLE_BACKUPS: z.coerce.boolean().default(true),
  BACKUP_DIRECTORY: z.string().default('./.carmack-backups'),
  BACKUP_RETENTION_DAYS: z.coerce.number().positive().default(30),
  ENABLE_AUTO_ROLLBACK: z.coerce.boolean().default(true),
  ROLLBACK_ON_TEST_FAILURE: z.coerce.boolean().default(true),
  ROLLBACK_ON_COMPLEXITY_INCREASE: z.coerce.boolean().default(true),
  MAX_ROLLBACK_ATTEMPTS: z.coerce.number().positive().default(3),
  ROLLBACK_TIMEOUT: z.coerce.number().positive().default(60000),
});

/**
 * CI/CD configuration schema
 */
const CICDEnvironmentSchema = z.object({
  CICD_PLATFORM: z.enum(['github', 'gitlab', 'azure', 'jenkins', 'custom']).default('github'),
  CICD_WEBHOOK_URL: z.string().url().optional(),
  CICD_SECRET_TOKEN: z.string().optional(),
  TRIGGER_ON_PUSH: z.coerce.boolean().default(false),
  TRIGGER_ON_PR: z.coerce.boolean().default(true),
  AUTO_MERGE: z.coerce.boolean().default(false),
});

/**
 * Database configuration schema
 */
const DatabaseEnvironmentSchema = z.object({
  POSTGRES_URL: z.string().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default('carmack'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DATABASE: z.string().default('tensorrt_knowledge_graph'),
  POSTGRES_MAX_CONNECTIONS: z.coerce.number().default(20),
  POSTGRES_IDLE_TIMEOUT: z.coerce.number().default(30000),
  POSTGRES_CONNECTION_TIMEOUT: z.coerce.number().default(5000),
  PGVECTOR_DIMENSIONS: z.coerce.number().default(1536),
});

/**
 * External services configuration schema
 */
const ExternalServicesEnvironmentSchema = z.object({
  GITHUB_TOKEN: z.string().optional(),
  HF_TOKEN: z.string().optional(),
  BAML_API_KEY: z.string().optional(),
  TRIGGER_DEV_API_KEY: z.string().optional(),
});

/**
 * Security configuration schema
 */
const SecurityEnvironmentSchema = z.object({
  API_SECRET_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  ALLOWED_WORKSPACE_PATHS: z.string().default('/tmp/carmack-workspace,./workspace'),
  RESTRICTED_FILE_PATTERNS: z.string().default('**/.env,**/secrets/**,**/*.key'),
});

/**
 * Development configuration schema
 */
const DevelopmentEnvironmentSchema = z.object({
  DEV_MODE: z.coerce.boolean().default(false),
  HOT_RELOAD: z.coerce.boolean().default(true),
  DEBUG_MODE: z.coerce.boolean().default(false),
  VERBOSE_LOGGING: z.coerce.boolean().default(false),
  TEST_TIMEOUT: z.coerce.number().positive().default(60000),
  TEST_PARALLEL: z.coerce.boolean().default(true),
  TEST_COVERAGE_THRESHOLD: z.coerce.number().min(0).max(100).default(80),
  MOCK_LLM_RESPONSES: z.coerce.boolean().default(false),
  MOCK_GIT_OPERATIONS: z.coerce.boolean().default(false),
  MOCK_FILE_OPERATIONS: z.coerce.boolean().default(false),
});

/**
 * Feature flags schema
 */
const FeatureFlagsEnvironmentSchema = z.object({
  FEATURE_EXPERIMENTAL_PATTERNS: z.coerce.boolean().default(false),
  FEATURE_ADVANCED_ANALYTICS: z.coerce.boolean().default(false),
  FEATURE_DISTRIBUTED_PROCESSING: z.coerce.boolean().default(false),
  FEATURE_REAL_TIME_COLLABORATION: z.coerce.boolean().default(false),
});

// =============================================================================
// COMBINED ENVIRONMENT SCHEMA
// =============================================================================

/**
 * Complete environment configuration schema
 */
export const EnvironmentSchema = CoreEnvironmentSchema.merge(RepositoryEnvironmentSchema)
  .merge(LLMEnvironmentSchema)
  .merge(TransformationEnvironmentSchema)
  .merge(QualityEnvironmentSchema)
  .merge(PatternEnvironmentSchema)
  .merge(TelemetryEnvironmentSchema)
  .merge(LoggingEnvironmentSchema)
  .merge(PerformanceEnvironmentSchema)
  .merge(BackupEnvironmentSchema)
  .merge(CICDEnvironmentSchema)
  .merge(DatabaseEnvironmentSchema)
  .merge(ExternalServicesEnvironmentSchema)
  .merge(SecurityEnvironmentSchema)
  .merge(DevelopmentEnvironmentSchema)
  .merge(FeatureFlagsEnvironmentSchema);

export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

// =============================================================================
// CONFIGURATION LOADING AND VALIDATION
// =============================================================================

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    const rawEnv = process.env;
    const validatedEnv = EnvironmentSchema.parse(rawEnv);

    // Post-validation processing
    const processedEnv = processEnvironmentConfig(validatedEnv);

    return processedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {

      error.errors.forEach((err) => {

      });
      process.exit(1);
    }


    process.exit(1);
  }
}

/**
 * Process and normalize environment configuration
 */
function processEnvironmentConfig(env: EnvironmentConfig): EnvironmentConfig {
  // Resolve repository URL precedence
  const repositoryUrl = env.CARMACK_REPOSITORY_URL || env.REPOSITORY_URL;
  if (!repositoryUrl && env.NODE_ENV === 'production') {
    throw new Error('CARMACK_REPOSITORY_URL or REPOSITORY_URL is required in production');
  }

  // Resolve workspace directory precedence
  const workspace = env.WORKSPACE_DIR || env.CARMACK_WORKSPACE;

  // Resolve log level precedence
  const logLevel = env.LOG_LEVEL || env.CARMACK_LOG_LEVEL;

  // Parse transformation order
  const transformationOrder = env.TRANSFORMATION_PREFERRED_ORDER.split(',')
    .map((s) => s.trim())
    .filter((s) => ['template', 'ast', 'llm'].includes(s));

  // Parse allowed file extensions
  const allowedExtensions = env.ALLOWED_FILE_EXTENSIONS.split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('.'));

  // Parse CORS origins
  const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim());

  // Parse allowed workspace paths
  const allowedPaths = env.ALLOWED_WORKSPACE_PATHS.split(',').map((s) => s.trim());

  // Parse restricted file patterns
  const restrictedPatterns = env.RESTRICTED_FILE_PATTERNS.split(',').map((s) => s.trim());

  return {
    ...env,
    CARMACK_REPOSITORY_URL: repositoryUrl,
    CARMACK_WORKSPACE: workspace,
    CARMACK_LOG_LEVEL: logLevel,
    // Store processed arrays as metadata
    _processed: {
      transformationOrder,
      allowedExtensions,
      corsOrigins,
      allowedPaths,
      restrictedPatterns,
    },
  } as EnvironmentConfig & {
    _processed: {
      transformationOrder: string[];
      allowedExtensions: string[];
      corsOrigins: string[];
      allowedPaths: string[];
      restrictedPatterns: string[];
    };
  };
}

/**
 * Validate LLM provider configuration
 */
export function validateLLMConfig(env: EnvironmentConfig): void {
  switch (env.LLM_PROVIDER) {
    case 'openai':
      if (!env.OPENAI_API_KEY && env.NODE_ENV === 'production') {
        throw new Error('OPENAI_API_KEY is required when using OpenAI provider in production');
      }
      break;

    case 'anthropic':
      if (!env.ANTHROPIC_API_KEY && env.NODE_ENV === 'production') {
        throw new Error(
          'ANTHROPIC_API_KEY is required when using Anthropic provider in production'
        );
      }
      break;

    case 'openrouter':
      if (!env.OPENROUTER_API_KEY && env.NODE_ENV === 'production') {
        throw new Error(
          'OPENROUTER_API_KEY is required when using OpenRouter provider in production'
        );
      }
      break;

    case 'local':
      // Local LLM validation could include connectivity checks
      break;

    case 'mock':
      if (env.NODE_ENV === 'production') {

      }
      break;
  }
}

/**
 * Get environment-specific configuration overrides
 */
export function getEnvironmentOverrides(env: EnvironmentConfig): Partial<EnvironmentConfig> {
  switch (env.NODE_ENV) {
    case 'development':
      return {
        DEBUG_MODE: true,
        VERBOSE_LOGGING: true,
        ENABLE_DAFNY_VERIFICATION: false,
        CARMACK_TELEMETRY_ENABLED: false,
      };

    case 'staging':
      return {
        CARMACK_TELEMETRY_ENABLED: true,
        ENABLE_DAFNY_VERIFICATION: true,
        CARMACK_LOG_LEVEL: 'info',
      };

    case 'production':
      return {
        CARMACK_TELEMETRY_ENABLED: true,
        ENABLE_DAFNY_VERIFICATION: true,
        CARMACK_LOG_LEVEL: 'warn',
        ENABLE_BACKUPS: true,
        ENABLE_AUTO_ROLLBACK: true,
      };

    default:
      return {};
  }
}

// =============================================================================
// CONFIGURATION UTILITIES
// =============================================================================

/**
 * Global environment configuration instance
 */
let _environmentConfig: EnvironmentConfig | null = null;

/**
 * Get the current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!_environmentConfig) {
    _environmentConfig = loadEnvironmentConfig();
    validateLLMConfig(_environmentConfig);
  }
  return _environmentConfig;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'production';
}

/**
 * Check if running in staging mode
 */
export function isStaging(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'staging';
}

/**
 * Get the effective log level
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return getEnvironmentConfig().CARMACK_LOG_LEVEL;
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return getEnvironmentConfig().CARMACK_TELEMETRY_ENABLED;
}

/**
 * Get LLM provider configuration
 */
export function getLLMConfig() {
  const env = getEnvironmentConfig();
  return {
    provider: env.LLM_PROVIDER,
    model: env.LLM_MODEL,
    apiKey:
      env.LLM_PROVIDER === 'openai'
        ? env.OPENAI_API_KEY
        : env.LLM_PROVIDER === 'anthropic'
          ? env.ANTHROPIC_API_KEY
          : undefined,
    baseUrl:
      env.LLM_PROVIDER === 'openai'
        ? env.OPENAI_BASE_URL
        : env.LLM_PROVIDER === 'anthropic'
          ? env.ANTHROPIC_BASE_URL
          : env.LLM_PROVIDER === 'local'
            ? env.LOCAL_LLM_URL
            : undefined,
    temperature: env.LLM_TEMPERATURE,
    maxTokens: env.LLM_MAX_TOKENS,
    timeout: env.LLM_TIMEOUT,
    retries: env.LLM_RETRIES,
  };
}

/**
 * Export for use in other modules
 */
export const env = getEnvironmentConfig();
