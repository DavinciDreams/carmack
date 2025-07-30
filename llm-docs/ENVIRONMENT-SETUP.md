# Environment Configuration Guide

This guide explains how to configure the Carmack Coder environment using the provided `.env.example` file.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific configuration values

3. Verify your configuration:
   ```bash
   bun run status
   ```

## Configuration Sections

### Core Application Settings

The most important settings to configure first:

```env
NODE_ENV=development          # Set to 'production' for production deployments
CARMACK_REPOSITORY_URL=...    # Your target repository URL
CARMACK_WORKSPACE=./workspace # Local workspace directory
```

### LLM Provider Configuration

Choose your LLM provider and configure accordingly:

#### For OpenAI:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4
```

#### For Anthropic:
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_MODEL=claude-3-sonnet-20240229
```

#### For Local LLM (Ollama):
```env
LLM_PROVIDER=local
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=codellama:7b
```

#### For Development/Testing:
```env
LLM_PROVIDER=mock
```

### Repository Configuration

Configure Git integration:

```env
CARMACK_REPOSITORY_URL=https://github.com/your-org/your-repo
GIT_USER_NAME=Your Name
GIT_USER_EMAIL=your.email@example.com
GIT_TOKEN=ghp_your_github_token_here
```

### Quality Assurance Settings

Configure validation and testing:

```env
ENABLE_VALIDATION=true
ENABLE_TESTING=true
REQUIRE_TYPE_CHECK=true
ENABLE_DAFNY_VERIFICATION=true  # Requires Dafny installation
MIN_TEST_COVERAGE=80
```

### Telemetry & Monitoring

Configure observability:

```env
CARMACK_TELEMETRY_ENABLED=true
METRICS_ENDPOINT=http://localhost:9090/metrics
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3000
```

## Environment-Specific Configurations

### Development Environment

```env
NODE_ENV=development
DEV_MODE=true
DEBUG_MODE=true
VERBOSE_LOGGING=true
LLM_PROVIDER=mock
ENABLE_DAFNY_VERIFICATION=false
```

### Staging Environment

```env
NODE_ENV=staging
LLM_PROVIDER=openai
ENABLE_DAFNY_VERIFICATION=true
CARMACK_TELEMETRY_ENABLED=true
LOG_LEVEL=info
```

### Production Environment

```env
NODE_ENV=production
LLM_PROVIDER=openai
ENABLE_DAFNY_VERIFICATION=true
CARMACK_TELEMETRY_ENABLED=true
LOG_LEVEL=warn
ENABLE_BACKUPS=true
ENABLE_AUTO_ROLLBACK=true
```

## Security Considerations

### Sensitive Variables

Never commit these variables to version control:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GIT_TOKEN`
- `API_SECRET_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- `SMTP_PASS`

### File System Security

Configure workspace restrictions:

```env
ALLOWED_WORKSPACE_PATHS=/tmp/carmack-workspace,./workspace
RESTRICTED_FILE_PATTERNS=**/.env,**/secrets/**,**/*.key
```

## Docker Configuration

For containerized deployments, these variables are automatically configured:

```env
CARMACK_WORKSPACE=/workspace
NODE_ENV=production
CARMACK_LOG_LEVEL=info
CARMACK_TELEMETRY_ENABLED=true
```

Override in `docker-compose.yml` as needed.

## Performance Tuning

### Resource Limits

```env
MAX_TRANSFORMATION_TIME=300000  # 5 minutes
MAX_MEMORY_USAGE=1024          # 1GB
MAX_CPU_USAGE=80               # 80%
MAX_CONCURRENT_TRANSFORMATIONS=5
```

### Transformation Strategy

```env
TRANSFORMATION_PREFERRED_ORDER=template,ast,llm
TRANSFORMATION_FALLBACK_ENABLED=true
MAX_FILES_PER_BATCH=10
MAX_COMPLEXITY_THRESHOLD=15
```

## Troubleshooting

### Common Issues

1. **LLM Provider Not Working**
   - Verify API keys are correct
   - Check network connectivity
   - Ensure provider is supported

2. **Git Integration Failing**
   - Verify `GIT_TOKEN` has proper permissions
   - Check repository URL format
   - Ensure SSH keys are configured (if using SSH)

3. **Dafny Verification Errors**
   - Install Dafny: `brew install dafny` (macOS) or download from GitHub
   - Set correct `DAFNY_PATH`
   - Disable with `ENABLE_DAFNY_VERIFICATION=false` if not needed

4. **Performance Issues**
   - Reduce `MAX_FILES_PER_BATCH`
   - Increase timeout values
   - Disable telemetry in development

### Validation Commands

```bash
# Check environment configuration
bun run status

# Test LLM connectivity
bun run llm:test

# Validate repository access
bun run repo:test

# Run health checks
bun run test:health
```

## Advanced Configuration

### Custom Patterns

```env
PATTERNS_FILE_PATH=./custom-patterns.json
ENABLE_PATTERN_LEARNING=true
PATTERN_CONFIDENCE_THRESHOLD=0.8
```

### External Integrations

```env
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#carmack-notifications

# Email alerts
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
EMAIL_FROM=carmack@example.com
```

### Feature Flags

Enable experimental features:

```env
FEATURE_EXPERIMENTAL_PATTERNS=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_DISTRIBUTED_PROCESSING=false
```

## Configuration Validation

The system validates configuration on startup using Zod schemas. Invalid configurations will cause startup failures with detailed error messages.

### Required Variables

Minimum required configuration:

```env
NODE_ENV=development
CARMACK_REPOSITORY_URL=https://github.com/your-org/your-repo
LLM_PROVIDER=mock
```

### Optional Variables

All other variables have sensible defaults and are optional.

## Best Practices

1. **Use different `.env` files for different environments**
2. **Keep sensitive data in secure secret management systems**
3. **Regularly rotate API keys and tokens**
4. **Monitor resource usage and adjust limits accordingly**
5. **Enable telemetry in production for observability**
6. **Use mock providers for development and testing**
7. **Configure proper backup and rollback settings**

## Support

For configuration issues:

1. Check the logs: `tail -f ./logs/carmack.log`
2. Run diagnostics: `bun run test:debug`
3. Review the [troubleshooting guide](./TROUBLESHOOTING.md)
4. Open an issue on GitHub with your configuration (redacted)