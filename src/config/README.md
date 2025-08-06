# Carmack Config Module

This module centralizes all configuration and environment settings for the Carmack system. All configuration is loaded, validated, and normalized via [`environment.ts`](./environment.ts), using Zod schemas for type safety and runtime validation.

## Usage

Import the config module in any file that needs configuration:

```typescript
import { getEnvironmentConfig, env } from './environment.ts';

const config = getEnvironmentConfig();
// or use the singleton: env
```

**Do not use `process.env` directly.** Always use the config module for all configuration needs.

## Configuration Options

All options are loaded from environment variables and validated. Below are the main categories and their keys (see [`environment.ts`](./environment.ts) for full details):

### Core

- `NODE_ENV`: `development` | `staging` | `production` (default: `development`)
- `CARMACK_VERSION`: string (default: `1.0.0`)
- `PORT`: number (default: 3000)

### Repository

- `CARMACK_REPOSITORY_URL`, `REPOSITORY_URL`: string (URL)
- `CARMACK_BRANCH`, `BRANCH`: string
- `CARMACK_WORKSPACE`, `WORKSPACE_DIR`: string
- `GIT_USER_NAME`, `GIT_USER_EMAIL`, `GIT_TOKEN`: string

### LLM Provider

- `LLM_PROVIDER`: `openai` | `anthropic` | `openrouter` | `local` | `mock`
- `LLM_MODEL`: string
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`: string
- `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, `LLM_TIMEOUT`, `LLM_RETRIES`: number

### Transformation

- `TRANSFORMATION_PREFERRED_ORDER`: string (comma-separated)
- `TRANSFORMATION_FALLBACK_ENABLED`: boolean
- `MAX_FILES_PER_BATCH`, `MAX_COMPLEXITY_THRESHOLD`, `MAX_COMPLEXITY_INCREASE`: number
- `ALLOWED_FILE_EXTENSIONS`: string (comma-separated)
- `RISK_LEVEL_FILTER`: `low` | `medium` | `high`

### Quality

- `ENABLE_VALIDATION`, `ENABLE_TESTING`, `ENABLE_COMPLEXITY_CHECK`, `REQUIRE_TYPE_CHECK`, `ENABLE_FORMAT_CHECK`: boolean
- `MIN_TEST_COVERAGE`: number
- `ENABLE_DAFNY_VERIFICATION`: boolean

### Pattern Learning

- `ENABLE_PATTERN_DISCOVERY`, `ENABLE_PATTERN_LEARNING`: boolean
- `PATTERN_CONFIDENCE_THRESHOLD`: number
- `MAX_PATTERNS`: number
- `PATTERNS_FILE_PATH`, `PATTERN_EFFECTIVENESS_FILE`: string

### Telemetry

- `CARMACK_TELEMETRY_ENABLED`: boolean
- `TELEMETRY_SAMPLE_RATE`, `TELEMETRY_BATCH_SIZE`, `TELEMETRY_FLUSH_INTERVAL`, `TELEMETRY_MAX_BUFFER_SIZE`: number
- `TELEMETRY_COLLECT_USER_IDS`, `TELEMETRY_COLLECT_FILE_PATHS`: boolean
- `TELEMETRY_RETENTION_DAYS`: number
- `METRICS_ENDPOINT`, `PROMETHEUS_URL`, `GRAFANA_URL`, `ALERTING_WEBHOOK_URL`, `ALERT_EMAIL`: string
- `TELEMETRY_FILE_EXPORT`, `TELEMETRY_OUTPUT_DIR`, `TELEMETRY_FILE_FORMAT`, `TELEMETRY_FILE_MAX_SIZE`, `TELEMETRY_FILE_ROTATION_INTERVAL`, `TELEMETRY_INCLUDE_TIMESTAMP`: various

### Logging

- `CARMACK_LOG_LEVEL`, `LOG_LEVEL`: `debug` | `info` | `warn` | `error`
- `LOG_FORMAT`: `json` | `text`
- `LOG_FILE_PATH`: string
- `ENABLE_CONSOLE_LOGGING`, `ENABLE_FILE_LOGGING`: boolean

### Performance

- `MAX_TRANSFORMATION_TIME`, `MAX_MEMORY_USAGE`, `MAX_CPU_USAGE`, `DEFAULT_TIMEOUT`, `ACTOR_TIMEOUT`, `PIPELINE_TIMEOUT`, `MAX_CONCURRENT_TRANSFORMATIONS`, `MAX_CONCURRENT_VALIDATIONS`: number

### Backup

- `ENABLE_BACKUPS`, `ENABLE_AUTO_ROLLBACK`, `ROLLBACK_ON_TEST_FAILURE`, `ROLLBACK_ON_COMPLEXITY_INCREASE`: boolean
- `BACKUP_DIRECTORY`: string
- `BACKUP_RETENTION_DAYS`, `MAX_ROLLBACK_ATTEMPTS`, `ROLLBACK_TIMEOUT`: number

### CI/CD

- `CICD_PLATFORM`: `github` | `gitlab` | `azure` | `jenkins` | `custom`
- `CICD_WEBHOOK_URL`, `CICD_SECRET_TOKEN`: string
- `TRIGGER_ON_PUSH`, `TRIGGER_ON_PR`, `AUTO_MERGE`: boolean

### Database

- `POSTGRES_URL`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `POSTGRES_MAX_CONNECTIONS`, `POSTGRES_IDLE_TIMEOUT`, `POSTGRES_CONNECTION_TIMEOUT`, `PGVECTOR_DIMENSIONS`: various

### External Services

- `GITHUB_TOKEN`, `HF_TOKEN`, `BAML_API_KEY`, `TRIGGER_DEV_API_KEY`: string

### Security

- `API_SECRET_KEY`, `JWT_SECRET`: string
- `CORS_ORIGINS`, `ALLOWED_WORKSPACE_PATHS`, `RESTRICTED_FILE_PATTERNS`: string

### Development

- `DEV_MODE`, `HOT_RELOAD`, `DEBUG_MODE`, `VERBOSE_LOGGING`, `TEST_TIMEOUT`, `TEST_PARALLEL`, `TEST_COVERAGE_THRESHOLD`, `MOCK_LLM_RESPONSES`, `MOCK_GIT_OPERATIONS`, `MOCK_FILE_OPERATIONS`: various

### Feature Flags

- `FEATURE_EXPERIMENTAL_PATTERNS`, `FEATURE_ADVANCED_ANALYTICS`, `FEATURE_DISTRIBUTED_PROCESSING`, `FEATURE_REAL_TIME_COLLABORATION`: boolean

## Utility Functions

- `getEnvironmentConfig()`: Returns the validated, normalized config object.
- `env`: Singleton instance of the config.
- `isDevelopment()`, `isProduction()`, `isStaging()`: Environment helpers.
- `getLogLevel()`, `isTelemetryEnabled()`, `getLLMConfig()`: Common config helpers.

## Testing

Unit tests and integration tests should import the config module and use its helpers. Do not mock or override `process.env` directly in tests; instead, use dependency injection or set environment variables before test startup.

## See Also

- [`environment.ts`](./environment.ts) for schema definitions and implementation.
- `.env.example` for a template of environment variables.
