# TensorRT-LLM Knowledge Graph Ingestion Pipeline

A comprehensive data ingestion system that processes the TensorRT-LLM repository, extracts code semantics, and populates a knowledge graph with embeddings for semantic search and analysis.

## Overview

The EPIC-INGESTION-PIPELINE implements a complete data processing workflow that:

1. **Clones and processes** the TensorRT-LLM repository
2. **Extracts git history** with commit metadata and diffs
3. **Fetches GitHub data** including PRs, issues, and relationships
4. **Analyzes code structure** using AST-grep for multi-language support
5. **Processes content** with semantic annotation and chunking
6. **Generates embeddings** via HuggingFace API for semantic search
7. **Populates database** with artifacts, relationships, and vector data

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Repository      │    │ GitHub Client   │    │ AST Analyzer    │
│ Manager         │    │                 │    │                 │
│ - Git ops       │    │ - PR data       │    │ - CST extraction│
│ - File filtering│    │ - Issue data    │    │ - Pattern match │
│ - Content read  │    │ - Rate limiting │    │ - Multi-language│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Content         │
                    │ Processor       │
                    │ - BAML integration
                    │ - HF embeddings │
                    │ - Chunking      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Ingestion       │
                    │ Orchestrator    │
                    │ - Workflow mgmt │
                    │ - Progress track│
                    │ - Error handling│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ PostgreSQL +    │
                    │ pgvector        │
                    │ - Knowledge graph
                    │ - Vector search │
                    │ - Relationships │
                    └─────────────────┘
```

## Components

### 1. Repository Manager (`repository-manager.ts`)

Handles git operations and file processing:

- **Git Operations**: Clone, update, commit history extraction
- **File Filtering**: Pattern-based filtering for relevant files
- **Content Extraction**: Read file content with metadata
- **Diff Analysis**: Extract changes between commits

```typescript
import { createTensorRTRepositoryManager } from './repository-manager.ts';

const repoManager = createTensorRTRepositoryManager('./workspace/tensorrt-llm');
await repoManager.cloneRepository();
const commits = await repoManager.getCommitHistory({ maxCount: 1000 });
const files = await repoManager.getFilteredFiles();
```

### 2. GitHub Client (`github-client.ts`)

Integrates with GitHub API for metadata:

- **PR Data**: Pull request information, reviews, comments
- **Issue Data**: Issues, labels, milestones
- **Rate Limiting**: Automatic rate limit handling
- **Relationship Mapping**: Link commits to PRs

```typescript
import { createTensorRTGitHubClient } from './github-client.ts';

const githubClient = createTensorRTGitHubClient(process.env.GITHUB_TOKEN);
const prs = await githubClient.getAllPullRequests({ state: 'all' });
const pr = await githubClient.findPullRequestByCommit(commitSha);
```

### 3. AST Analyzer (`ast-analyzer.ts`)

Extracts code structure using ast-grep:

- **Multi-Language**: Support for C++, CUDA, Python, JavaScript
- **Pattern Matching**: TensorRT-specific patterns for schedulers, memory, kernels
- **CST Extraction**: Concrete Syntax Tree with position information
- **Semantic Analysis**: Infer roles, complexity, dependencies

```typescript
import { createTensorRTASTAnalyzer } from './ast-analyzer.ts';

const astAnalyzer = createTensorRTASTAnalyzer();
const result = await astAnalyzer.analyzeFile(fileContent);
console.log(`Found ${result.nodes.length} AST nodes`);
```

### 4. Content Processor (`content-processor.ts`)

Processes content for semantic search:

- **Content Chunking**: Intelligent chunking by logical boundaries
- **Semantic Annotation**: BAML integration for metadata extraction
- **Embedding Generation**: HuggingFace API for vector embeddings
- **Keyword Extraction**: Technical keyword identification

```typescript
import { createTensorRTContentProcessor } from './content-processor.ts';

const processor = createTensorRTContentProcessor();
const result = await processor.processFileContent(fileContent, astResult);
console.log(`Generated ${result.chunks.length} chunks with embeddings`);
```

### 5. Ingestion Orchestrator (`ingestion-orchestrator.ts`)

Coordinates the complete pipeline:

- **Workflow Management**: Step-by-step processing with dependencies
- **Progress Tracking**: Real-time progress updates and ETA
- **Error Handling**: Comprehensive error recovery and retry logic
- **Database Integration**: Populate knowledge graph tables

```typescript
import { createIngestionOrchestrator } from './ingestion-orchestrator.ts';

const orchestrator = createIngestionOrchestrator({
  repositoryUrl: 'https://github.com/NVIDIA/TensorRT-LLM',
  maxCommits: 1000,
  enableEmbeddings: true,
});

orchestrator.onProgress((progress) => {
  console.log(`${progress.phase}: ${progress.currentStep}`);
});

const result = await orchestrator.runIngestion();
```

## Database Schema

The pipeline populates these key tables:

- **`artifacts`**: Core entities (commits, PRs, files, functions)
- **`graph_edges`**: Relationships between artifacts
- **`commits`**: Git commit metadata and diffs
- **`prs`**: GitHub pull request data
- **`cst_nodes`**: Code structure from AST analysis
- **`artifact_keywords`**: Extracted keywords for search
- **`artifact_domains`**: Technical domain classifications

## Usage

### CLI Tool

```bash
# Run complete ingestion
bun run src/ingestion/cli.ts ingest

# Run with custom repository
bun run src/ingestion/cli.ts ingest --repository-url https://github.com/user/repo

# Run tests
bun run src/ingestion/cli.ts test --verbose

# Check system status
bun run src/ingestion/cli.ts status

# Show help
bun run src/ingestion/cli.ts help
```

### Programmatic API

```typescript
import { runTensorRTIngestion } from './ingestion/index.ts';

const result = await runTensorRTIngestion({
  repositoryUrl: 'https://github.com/NVIDIA/TensorRT-LLM',
  localPath: './workspace/tensorrt-llm',
  maxCommits: 1000,
  maxPRs: 500,
  maxFiles: 1000,
  enableAST: true,
  enableEmbeddings: true,
  enableGitHubData: true,
});

if (result.success) {
  console.log(`Processed ${result.summary.totalArtifacts} artifacts`);
} else {
  console.error('Ingestion failed:', result.errors);
}
```

### Testing

```typescript
import { runIngestionTests } from './ingestion/index.ts';

const suite = await runIngestionTests({
  testMode: 'integration',
  verbose: true,
});

console.log(`Tests: ${suite.successCount}/${suite.results.length} passed`);
```

## Configuration

### Environment Variables

```bash
# Required for GitHub data
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Required for embeddings
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx

# Database connection
POSTGRES_URL=postgresql://user:pass@localhost:5432/tensorrt_kg
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=carmack
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=tensorrt_knowledge_graph

# Optional configuration
NODE_ENV=development
CARMACK_LOG_LEVEL=info
```

### File Filtering

The pipeline processes these file types by default:

- **C/C++**: `.cc`, `.cpp`, `.h`, `.hpp`
- **CUDA**: `.cu`, `.cuh`
- **Python**: `.py`, `.pyx`, `.pxd`

And focuses on these areas:

- `runtime/scheduler.cc` - Core scheduling logic
- `core/memory/**/*` - Memory management
- `**/*.cu` - CUDA kernels
- `python/**/*` - Python bindings
- `tensorrt_llm/**/*` - Main library code

## Performance

The pipeline is designed for efficiency:

- **Batch Processing**: Process files in configurable batches
- **Rate Limiting**: Respect GitHub and HuggingFace API limits
- **Parallel Processing**: Optional parallel execution
- **Memory Management**: Stream processing for large files
- **Database Optimization**: Bulk inserts and transactions

### Typical Performance

- **Repository Clone**: 1-5 minutes (depending on size)
- **Commit Processing**: ~100 commits/minute
- **AST Analysis**: ~50 files/minute
- **Embedding Generation**: ~20 chunks/minute (API dependent)
- **Complete Pipeline**: 30-60 minutes for full TensorRT-LLM repo

## Error Handling

The pipeline includes comprehensive error handling:

- **Retry Logic**: Exponential backoff for API failures
- **Graceful Degradation**: Continue processing if optional components fail
- **Progress Preservation**: Resume from last successful step
- **Detailed Logging**: Full error context and stack traces
- **Validation**: Zod schema validation at every step

## Monitoring

Track ingestion progress with:

- **Real-time Progress**: Phase, step, and completion percentage
- **ETA Calculation**: Estimated time to completion
- **Metrics Collection**: Counts of processed items
- **Error Tracking**: Failed operations with context
- **Performance Monitoring**: Processing times and bottlenecks

## Extending the Pipeline

### Adding New File Types

```typescript
// In repository-manager.ts
const customFilter = {
  supportedExtensions: ['.rs', '.go', '.java'],
  includePatterns: ['src/**/*', 'lib/**/*'],
};

const repoManager = new RepositoryManager(config, customFilter);
```

### Custom AST Patterns

```typescript
// In ast-analyzer.ts
const customPattern = {
  name: 'custom_pattern',
  language: 'cpp',
  pattern: 'class $CLASS : public $BASE { $$$BODY }',
  description: 'Custom class pattern',
  category: 'custom',
  extractVariables: ['CLASS', 'BASE'],
};

astAnalyzer.addPattern(customPattern);
```

### Custom Content Processing

```typescript
// In content-processor.ts
const customProcessor = new ContentProcessor({
  chunkSize: 2000,
  embeddingModel: 'sentence-transformers/all-mpnet-base-v2',
  embeddingDimensions: 768,
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check connection string and credentials
   - Ensure pgvector extension is installed

2. **GitHub API Rate Limits**
   - Provide GITHUB_TOKEN for higher limits
   - Reduce maxPRs configuration
   - Use --no-github-data flag for testing

3. **Memory Issues**
   - Reduce maxFiles and batchSize
   - Increase system memory
   - Use file filtering to process subset

4. **AST Analysis Failures**
   - Check file encoding (UTF-8 required)
   - Verify ast-grep installation
   - Use --no-ast flag to skip AST analysis

### Debug Mode

```bash
# Enable verbose logging
bun run src/ingestion/cli.ts ingest --verbose --log-level debug

# Dry run to check configuration
bun run src/ingestion/cli.ts ingest --dry-run --verbose

# Test individual components
bun run src/ingestion/cli.ts test --verbose
```

## Contributing

When extending the ingestion pipeline:

1. **Follow Carmack's Principles**: Type safety, error handling, performance
2. **Add Tests**: Unit and integration tests for new components
3. **Update Documentation**: Keep README and code comments current
4. **Validate Schemas**: Use Zod for all data validation
5. **Handle Errors**: Comprehensive error handling with context

## License

This ingestion pipeline is part of the Carmack Coder project and follows the same licensing terms.