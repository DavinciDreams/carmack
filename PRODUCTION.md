# 🚀 Carmack Coder Production Deployment Guide

Enterprise-grade automated code transformation system designed for real-world codebases with provable correctness guarantees.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Git Repository │    │  Carmack Coder  │    │   Monitoring    │
│                 │    │                 │    │                 │
│  • Source Code  │───▶│  • AST Analysis │───▶│  • Prometheus   │
│  • Branches     │    │  • Transformations│    │  • Grafana      │
│  • History      │    │  • Validation   │    │  • Alerting     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        │                        ▲
         │                        ▼                        │
         │              ┌─────────────────┐                │
         └──────────────│  Quality Gates  │────────────────┘
                        │                 │
                        │  • Type Check   │
                        │  • Linting      │
                        │  • Tests        │
                        │  • Complexity   │
                        └─────────────────┘
```

## 🚀 Quick Start

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/DavinciDreams/carmack.git
cd carmack

# Install dependencies
bun install

# Run a transformation
bun run production.ts --repository https://github.com/your-org/project.git --dry-run
```

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f carmack-coder
```

### 3. Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=carmack-coder

# Port forward for monitoring
kubectl port-forward svc/grafana 3000:3000
```

## 📋 Configuration

### Production Configuration File

Create a `production.config.ts` file:

```typescript
import type { ProductionConfig } from './production.config.ts';

export const config: ProductionConfig = {
  repository: {
    url: 'https://github.com/your-org/your-project.git',
    branch: 'main',
    workingDirectory: '/tmp/carmack-workspace',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.min.js'
    ]
  },
  transformation: {
    maxFilesPerBatch: 20,
    maxComplexityThreshold: 15,
    riskLevelFilter: 'low',
    enableBackups: true,
    dryRunFirst: true
  },
  qualityGates: {
    requireTypeCheck: true,
    requireLinting: true,
    requireTests: true,
    minTestCoverage: 85
  },
  monitoring: {
    enableTelemetry: true,
    logLevel: 'info',
    metricsEndpoint: 'http://prometheus:9090/metrics'
  }
};
```

### Environment Variables

```bash
# Required
CARMACK_REPOSITORY_URL=https://github.com/your-org/project.git
CARMACK_BRANCH=main

# Optional
CARMACK_WORKSPACE=/tmp/carmack-workspace
CARMACK_LOG_LEVEL=info
CARMACK_DRY_RUN=false
CARMACK_MAX_COMPLEXITY=15
CARMACK_RISK_LEVEL=low
CARMACK_AUTO_COMMIT=false

# CI/CD Integration
GITHUB_TOKEN=your_github_token
GITLAB_TOKEN=your_gitlab_token
```

## 🔧 CLI Usage

### Basic Commands

```bash
# Transform a repository
bun production.ts --repository https://github.com/org/repo.git

# Dry run with verbose output
bun production.ts --repository https://github.com/org/repo.git --dry-run --verbose

# Custom configuration
bun production.ts --config ./custom.config.ts --repository https://github.com/org/repo.git

# Specific branch and risk level
bun production.ts --repository https://github.com/org/repo.git --branch develop --risk-level medium

# Batch processing with limits
bun production.ts --repository https://github.com/org/repo.git --max-files 10 --auto-commit
```

### Advanced Options

```bash
# Skip specific validations
bun production.ts --repository https://github.com/org/repo.git --skip-tests --skip-verification

# Custom workspace
bun production.ts --repository https://github.com/org/repo.git --workspace /custom/path

# Help and documentation
bun production.ts --help
```

## 🔐 Security & Safety

### Git Safety Features

- **Automatic Checkpoints**: Creates git checkpoints before transformations
- **Rollback on Failure**: Automatic rollback if tests fail or complexity increases
- **Branch Protection**: Never modifies protected branches directly
- **Audit Trail**: Complete history of all transformations

### Quality Gates

```typescript
{
  requireTypeCheck: true,      // TypeScript compilation must pass
  requireLinting: true,        // Code must pass linting rules  
  requireTests: true,          // All tests must pass
  requireDafnyVerification: false, // Optional formal verification
  maxComplexityIncrease: 5,    // Max 5% complexity increase allowed
  minTestCoverage: 80          // Minimum 80% test coverage
}
```

### Risk Levels

- **Low Risk**: Simple transformations (var→const, template literals)
- **Medium Risk**: Structural changes (Promise→async/await)
- **High Risk**: Complex refactoring (class restructuring)

## 📊 Monitoring & Observability

### Metrics

Access Grafana at `http://localhost:3000` (admin/carmack123)

**Key Metrics:**
- `carmack_transformations_total` - Total transformations executed
- `carmack_transformation_duration_seconds` - Time per transformation
- `carmack_complexity_before` / `carmack_complexity_after` - Code complexity changes
- `carmack_test_coverage_ratio` - Test coverage percentage
- `carmack_memory_usage_bytes` - Memory consumption
- `carmack_git_operations_total` - Git operations performed

### Alerts

**Critical Alerts:**
- Transformation failures
- Git operation failures
- Security vulnerabilities detected

**Warning Alerts:**
- High complexity increase (>20%)
- Low test coverage (<80%)
- High memory usage (>1GB)
- Long transformation time (>5 minutes)

### Logs

```bash
# View real-time logs
docker-compose logs -f carmack-coder

# Filter by log level
docker-compose logs carmack-coder | grep ERROR

# Export logs for analysis
docker-compose logs --since="2024-01-01" carmack-coder > carmack.log
```

## 🔄 CI/CD Integration

### GitHub Actions

Trigger transformations via GitHub Actions:

```yaml
# .github/workflows/carmack.yml
name: Code Transformation
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2 AM
  workflow_dispatch:

jobs:
  transform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Carmack Coder
        run: |
          bun production.ts \
            --repository ${{ github.repository }} \
            --auto-commit \
            --risk-level low
```

### GitLab CI

```yaml
# .gitlab-ci.yml
carmack_transform:
  stage: transform
  image: ghcr.io/davincidreams/carmack:latest
  script:
    - bun production.ts --repository $CI_PROJECT_URL --auto-commit
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## 🏢 Enterprise Features

### Multi-Repository Support

```bash
# Transform multiple repositories
for repo in repo1 repo2 repo3; do
  bun production.ts --repository https://github.com/org/$repo.git --auto-commit
done
```

### Webhook Integration

```typescript
// webhook-server.ts
app.post('/webhook/transform', (req, res) => {
  const { repository, branch } = req.body;
  
  exec(`bun production.ts --repository ${repository} --branch ${branch} --auto-commit`, 
    (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ error: error.message });
      } else {
        res.json({ success: true, output: stdout });
      }
    }
  );
});
```

### Compliance & Auditing

- **SOX Compliance**: Full audit trail of code changes
- **GDPR Compliance**: No personal data processed
- **SOC 2**: Security controls and monitoring
- **Change Management**: Automated approval workflows

## 🐛 Troubleshooting

### Common Issues

**Issue**: `bunx is not recognized`
```bash
# Solution: Install Bun globally
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

**Issue**: Git authentication failures
```bash
# Solution: Set up SSH keys or personal access tokens
git config --global credential.helper store
echo "https://username:token@github.com" > ~/.git-credentials
```

**Issue**: High memory usage
```bash
# Solution: Reduce batch size
bun production.ts --max-files 5 --repository https://github.com/org/repo.git
```

**Issue**: Transformation timeouts
```bash
# Solution: Increase timeout or skip verification
bun production.ts --skip-verification --repository https://github.com/org/repo.git
```

### Debug Mode

```bash
# Enable debug logging
export CARMACK_LOG_LEVEL=debug
bun production.ts --verbose --repository https://github.com/org/repo.git
```

### Health Checks

```bash
# System health check
bun production.ts --help

# Repository validation
bun production.ts --repository https://github.com/org/repo.git --dry-run

# Performance test
time bun production.ts --repository https://github.com/org/test-repo.git --max-files 1
```

## 📚 Best Practices

### Repository Preparation

1. **Ensure CI/CD is working** before running transformations
2. **Create a dedicated branch** for testing transformations
3. **Back up important repositories** before first run
4. **Start with dry-run mode** to preview changes
5. **Use low risk level** for initial deployments

### Batch Processing

```bash
# Process large repositories in batches
bun production.ts --repository https://github.com/org/large-repo.git --max-files 10

# Chain multiple transformations
bun production.ts --repository https://github.com/org/repo.git --risk-level low && \
bun production.ts --repository https://github.com/org/repo.git --risk-level medium
```

### Monitoring Strategy

1. **Set up alerts** for all critical metrics
2. **Monitor complexity trends** over time
3. **Track test coverage** changes
4. **Review transformation logs** regularly
5. **Benchmark performance** across different repository sizes

## 🔗 Integration Examples

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    triggers {
        cron('H 2 * * 1') // Weekly
    }
    stages {
        stage('Transform') {
            steps {
                sh '''
                    bun production.ts \
                        --repository ${GIT_URL} \
                        --branch ${BRANCH_NAME} \
                        --auto-commit
                '''
            }
        }
    }
}
```

### Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  schedules:
  - cron: "0 2 * * 1"
    displayName: Weekly transformation
    branches:
      include:
      - main

jobs:
- job: Transform
  pool:
    vmImage: 'ubuntu-latest'
  steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      curl -fsSL https://bun.sh/install | bash
      bun production.ts --repository $(Build.Repository.Uri) --auto-commit
    displayName: 'Run Carmack Coder'
```

## 📞 Support

- **Documentation**: [https://github.com/DavinciDreams/carmack/docs](https://github.com/DavinciDreams/carmack/docs)
- **Issues**: [https://github.com/DavinciDreams/carmack/issues](https://github.com/DavinciDreams/carmack/issues)
- **Discussions**: [https://github.com/DavinciDreams/carmack/discussions](https://github.com/DavinciDreams/carmack/discussions)
- **Enterprise Support**: carmack-enterprise@davincidreams.com

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**🚀 Ready to transform your codebase? Start with a dry run and experience the power of automated code transformation with provable correctness!**
