# Repository Configuration Guide

This guide clarifies the repository configuration concepts in the Carmack Coder system and provides comprehensive examples for configuring different types of target repositories.

## Overview

The Carmack Coder system works with **two distinct repository concepts** that serve different purposes:

1. **Target Repository** - The external repository you want to analyze and transform (e.g., NVIDIA TensorRT, React, Vue.js)
2. **Carmack System Repository** - The Carmack Coder system itself (this codebase)

Understanding this distinction is crucial for proper configuration and avoiding common setup issues.

## Repository Types

### Target Repository
The **Target Repository** is the external codebase you want to analyze, transform, and improve using Carmack Coder. This is configured via:

- **Environment Variable**: `REPOSITORY_URL`
- **Purpose**: Specifies which repository to clone, analyze, and transform
- **Examples**: 
  - `https://github.com/NVIDIA/TensorRT` (C++/CUDA project)
  - `https://github.com/facebook/react` (JavaScript/TypeScript project)
  - `https://github.com/microsoft/vscode` (TypeScript project)

### Carmack System Repository
The **Carmack System Repository** is the Carmack Coder system itself. This is configured via:

- **Environment Variable**: `CARMACK_REPOSITORY_URL`
- **Purpose**: Used for system updates, documentation generation, and self-referential operations
- **Default**: `https://github.com/DavinciDreams/carmack`

## Configuration Variables

### Core Repository Settings

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `REPOSITORY_URL` | Target repository to analyze | `https://github.com/NVIDIA/TensorRT` | ✅ Yes |
| `BRANCH` | Target repository branch | `main`, `develop`, `v8.6.1` | ✅ Yes |
| `CARMACK_REPOSITORY_URL` | Carmack system repository | `https://github.com/DavinciDreams/carmack` | ⚠️ System |
| `CARMACK_BRANCH` | Carmack system branch | `main`, `roo-to-do` | ⚠️ System |

### Repository Metadata

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `CARMACK_REPOSITORY_OWNER` | Carmack system owner | `DavinciDreams` | ⚠️ System |
| `CARMACK_REPOSITORY_NAME` | Carmack system name | `carmack` | ⚠️ System |

### Working Directory Settings

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `CARMACK_WORKSPACE` | Local workspace path | `./workspace` | 🔧 Optional |
| `WORKSPACE_DIR` | Alternative workspace | `/tmp/carmack-workspace` | 🔧 Optional |

## File Processing Configuration

### File Extensions

Configure which file types to process based on your target repository's language:

```bash
# TypeScript/JavaScript projects
ALLOWED_FILE_EXTENSIONS=.ts,.tsx,.js,.jsx,.mts,.cts

# C++/CUDA projects (like NVIDIA TensorRT)
ALLOWED_FILE_EXTENSIONS=.cpp,.cxx,.cc,.c++,.c,.h,.hpp,.cu,.cuh

# Python projects
ALLOWED_FILE_EXTENSIONS=.py,.pyx,.pyi

# Multi-language projects
ALLOWED_FILE_EXTENSIONS=.py,.cpp,.c,.h,.hpp,.cu,.cuh,.ts,.js
```

### Processing Limits

Control resource usage and processing scope:

```bash
# File processing limits
MAX_FILES_PER_BATCH=10
MAX_COMPLEXITY_THRESHOLD=15
MAX_COMPLEXITY_INCREASE=0.2

# Performance limits
MAX_TRANSFORMATION_TIME=300000  # 5 minutes
MAX_MEMORY_USAGE=1024          # 1GB
MAX_CONCURRENT_TRANSFORMATIONS=5
```

### Risk Management

Configure transformation safety levels:

```bash
# Risk level filter (low, medium, high)
RISK_LEVEL_FILTER=medium

# Transformation strategy
TRANSFORMATION_PREFERRED_ORDER=template,ast,llm
TRANSFORMATION_FALLBACK_ENABLED=true
```

## NVIDIA TensorRT Example

Here's a complete configuration for analyzing the NVIDIA TensorRT repository:

### Environment Configuration (.env)

```bash
# =============================================================================
# TARGET REPOSITORY CONFIGURATION - NVIDIA TensorRT
# =============================================================================

# Target repository (what we want to analyze)
REPOSITORY_URL=https://github.com/NVIDIA/TensorRT
BRANCH=main

# Carmack system repository (DO NOT CHANGE)
CARMACK_REPOSITORY_URL=https://github.com/DavinciDreams/carmack
CARMACK_REPOSITORY_OWNER=DavinciDreams
CARMACK_REPOSITORY_NAME=carmack
CARMACK_BRANCH=main

# =============================================================================
# FILE PROCESSING FOR C++/CUDA PROJECT
# =============================================================================

# Extended file extensions for CUDA/C++ project
ALLOWED_FILE_EXTENSIONS=.cpp,.cxx,.cc,.c++,.c,.h,.hpp,.cu,.cuh,.py

# Processing limits for large C++ codebase
MAX_FILES_PER_BATCH=5
MAX_COMPLEXITY_THRESHOLD=20
MAX_TRANSFORMATION_TIME=600000  # 10 minutes for complex C++

# Conservative risk level for production CUDA code
RISK_LEVEL_FILTER=low
TRANSFORMATION_PREFERRED_ORDER=template,ast

# =============================================================================
# QUALITY ASSURANCE FOR CUDA PROJECT
# =============================================================================

# Strict validation for CUDA code
ENABLE_VALIDATION=true
REQUIRE_TYPE_CHECK=false  # C++ doesn't use TypeScript checking
ENABLE_FORMAT_CHECK=true
ENABLE_COMPLEXITY_CHECK=true

# Backup settings for safety
ENABLE_BACKUPS=true
ENABLE_AUTO_ROLLBACK=true
ROLLBACK_ON_COMPLEXITY_INCREASE=true
```

### Repository Manager Usage

```typescript
import { RepositoryManager, type RepositoryConfig } from './src/repository-manager.js';

const tensorRTConfig: RepositoryConfig = {
  url: 'https://github.com/NVIDIA/TensorRT',
  branch: 'main',
  includePatterns: [
    '**/*.cpp', '**/*.cxx', '**/*.cc', '**/*.c++',
    '**/*.c', '**/*.h', '**/*.hpp',
    '**/*.cu', '**/*.cuh',  // CUDA files
    '**/*.py'               // Python bindings
  ],
  excludePatterns: [
    'build/**',
    'third_party/**',
    '**/*.test.*',
    '**/tests/**',
    'docs/**'
  ],
  maxFileSize: 2 * 1024 * 1024, // 2MB for large C++ files
  timeout: 600000 // 10 minutes
};

const manager = new RepositoryManager();
const result = await manager.processRepository(tensorRTConfig);
```

## Common Configurations

### JavaScript/TypeScript Projects

```bash
# Target: React, Vue, Angular, etc.
REPOSITORY_URL=https://github.com/facebook/react
BRANCH=main
ALLOWED_FILE_EXTENSIONS=.ts,.tsx,.js,.jsx,.mts,.cts
MAX_FILES_PER_BATCH=15
RISK_LEVEL_FILTER=medium
TRANSFORMATION_PREFERRED_ORDER=template,ast,llm
```

### Python Projects

```bash
# Target: Django, Flask, FastAPI, etc.
REPOSITORY_URL=https://github.com/django/django
BRANCH=main
ALLOWED_FILE_EXTENSIONS=.py,.pyx,.pyi
MAX_FILES_PER_BATCH=20
RISK_LEVEL_FILTER=medium
TRANSFORMATION_PREFERRED_ORDER=template,ast,llm
```

### Rust Projects

```bash
# Target: Rust projects
REPOSITORY_URL=https://github.com/rust-lang/rust
BRANCH=master
ALLOWED_FILE_EXTENSIONS=.rs
MAX_FILES_PER_BATCH=10
RISK_LEVEL_FILTER=low
TRANSFORMATION_PREFERRED_ORDER=template,ast
```

### Go Projects

```bash
# Target: Go projects
REPOSITORY_URL=https://github.com/golang/go
BRANCH=master
ALLOWED_FILE_EXTENSIONS=.go
MAX_FILES_PER_BATCH=25
RISK_LEVEL_FILTER=medium
TRANSFORMATION_PREFERRED_ORDER=template,ast,llm
```

### Multi-Language Projects

```bash
# Target: Complex projects with multiple languages
REPOSITORY_URL=https://github.com/microsoft/vscode
BRANCH=main
ALLOWED_FILE_EXTENSIONS=.ts,.js,.py,.cpp,.c,.h
MAX_FILES_PER_BATCH=8
RISK_LEVEL_FILTER=low
TRANSFORMATION_PREFERRED_ORDER=template,ast
```

## Resource Limits and Performance

### Memory and CPU Limits

```bash
# Resource constraints
MAX_MEMORY_USAGE=2048        # 2GB for large codebases
MAX_CPU_USAGE=80            # 80% CPU utilization
MAX_CONCURRENT_TRANSFORMATIONS=3

# Timeout settings
DEFAULT_TIMEOUT=300000      # 5 minutes default
ACTOR_TIMEOUT=60000        # 1 minute per actor
PIPELINE_TIMEOUT=1800000   # 30 minutes total pipeline
```

### Repository Size Considerations

| Repository Size | Recommended Settings |
|----------------|---------------------|
| **Small** (<1K files) | `MAX_FILES_PER_BATCH=50`, `RISK_LEVEL_FILTER=medium` |
| **Medium** (1K-10K files) | `MAX_FILES_PER_BATCH=20`, `RISK_LEVEL_FILTER=medium` |
| **Large** (10K-50K files) | `MAX_FILES_PER_BATCH=10`, `RISK_LEVEL_FILTER=low` |
| **Enterprise** (>50K files) | `MAX_FILES_PER_BATCH=5`, `RISK_LEVEL_FILTER=low` |

## Output Structure and Interpretation

### Analysis Output

The system generates comprehensive analysis results in `./output/repositories/`:

```
output/repositories/TensorRT-1642345678/
├── analysis.json          # Repository structure analysis
├── transformations.json   # Applied transformations
├── api.md                # Generated API documentation
├── architecture.md       # Architecture analysis
└── patterns.md           # Detected patterns
```

### Analysis Metrics

```json
{
  "repositoryUrl": "https://github.com/NVIDIA/TensorRT",
  "totalFiles": 2847,
  "analyzedFiles": 1205,
  "skippedFiles": 1642,
  "totalLinesOfCode": 245678,
  "languages": {
    ".cpp": 456,
    ".h": 234,
    ".cu": 89,
    ".py": 67
  },
  "complexity": {
    "average": 12.4,
    "max": 45,
    "distribution": {
      "0-5": 234,
      "5-10": 456,
      "10-15": 234,
      "15-20": 123,
      "20+": 67
    }
  }
}
```

## Performance Expectations

### Processing Times

| Repository Type | Size | Expected Time | Memory Usage |
|----------------|------|---------------|--------------|
| **TypeScript** | 1K files | 2-5 minutes | 256MB |
| **C++/CUDA** | 1K files | 5-10 minutes | 512MB |
| **Python** | 1K files | 3-7 minutes | 256MB |
| **Multi-language** | 1K files | 7-15 minutes | 512MB |

### Scaling Factors

- **File count**: Linear scaling with slight overhead
- **File size**: Logarithmic scaling up to `maxFileSize` limit
- **Complexity**: Exponential impact on LLM transformations
- **Language diversity**: 20-30% overhead per additional language

## Troubleshooting

### Common Configuration Issues

#### Issue: "No files found for processing"
**Cause**: Incorrect `ALLOWED_FILE_EXTENSIONS` or overly restrictive patterns
**Solution**: 
```bash
# Check target repository file types first
ALLOWED_FILE_EXTENSIONS=.ts,.js,.py,.cpp,.c,.h
```

#### Issue: "Repository clone failed"
**Cause**: Invalid `REPOSITORY_URL` or network issues
**Solution**:
```bash
# Verify URL is accessible
REPOSITORY_URL=https://github.com/owner/repo
BRANCH=main  # Ensure branch exists
```

#### Issue: "Transformation timeout"
**Cause**: `MAX_TRANSFORMATION_TIME` too low for repository size
**Solution**:
```bash
# Increase timeout for large repositories
MAX_TRANSFORMATION_TIME=1800000  # 30 minutes
MAX_FILES_PER_BATCH=5           # Reduce batch size
```

#### Issue: "Memory limit exceeded"
**Cause**: Large files or too many concurrent operations
**Solution**:
```bash
# Reduce memory pressure
MAX_MEMORY_USAGE=2048
MAX_CONCURRENT_TRANSFORMATIONS=2
MAX_FILES_PER_BATCH=5
```

### Configuration Validation

Use the built-in validation to check your configuration:

```typescript
import { validateRepositoryConfig } from './src/repository-manager.js';

try {
  const config = validateRepositoryConfig({
    url: process.env.REPOSITORY_URL,
    branch: process.env.BRANCH,
    // ... other config
  });
  console.log('✅ Configuration valid');
} catch (error) {
  console.error('❌ Configuration error:', error.message);
}
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Enable debug logging
CARMACK_LOG_LEVEL=debug
VERBOSE_LOGGING=true
DEBUG_MODE=true

# Mock mode for testing
MOCK_LLM_RESPONSES=true
MOCK_GIT_OPERATIONS=true
```

## Best Practices

### 1. Start Conservative
- Begin with `RISK_LEVEL_FILTER=low`
- Use `MAX_FILES_PER_BATCH=5` for initial runs
- Enable all backup and rollback options

### 2. Language-Specific Tuning
- **C++/CUDA**: Lower risk, longer timeouts, smaller batches
- **JavaScript/TypeScript**: Medium risk, standard settings
- **Python**: Medium risk, larger batches possible

### 3. Repository Size Adaptation
- **Large repositories**: Reduce batch sizes, increase timeouts
- **Small repositories**: Can use higher risk levels and larger batches

### 4. Iterative Approach
- Start with template transformations only
- Add AST transformations after validation
- Use LLM transformations sparingly for complex cases

### 5. Monitoring and Validation
- Always enable validation and backups
- Monitor memory and CPU usage
- Review transformation results before applying to production

## Advanced Configuration

### Custom Pattern Files
```bash
# Specify custom pattern files for specific repositories
PATTERNS_FILE_PATH=./patterns/tensorrt-patterns.json
PATTERN_EFFECTIVENESS_FILE=./data/tensorrt-effectiveness.json
```

### Multi-Stage Processing
```typescript
const advancedConfig: EnhancedTransformationRequest = {
  targetFiles: ['src/**/*.cpp'],
  transformationType: 'hybrid',
  stages: [
    {
      type: 'template',
      patterns: lowRiskPatterns,
    },
    {
      type: 'ast',
      patterns: mediumRiskPatterns,
      condition: 'complexity < 15'
    },
    {
      type: 'llm',
      prompt: 'Optimize CUDA kernel performance',
      condition: 'file.includes("kernel") && complexity > 10'
    }
  ]
};
```

This comprehensive guide should eliminate confusion around repository configuration and provide clear guidance for analyzing any type of external repository with the Carmack Coder system.