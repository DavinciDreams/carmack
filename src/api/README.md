# EPIC-GRAPH-QUERY-ENGINE

## TensorRT-LLM Knowledge Graph Query Engine

A sophisticated intelligent query processing system that combines hybrid retrieval, multi-turn investigations, and AI-powered synthesis to provide deep insights into the TensorRT-LLM codebase.

## 🚀 Features

### Core Capabilities
- **Hybrid Retrieval System**: Combines BM25 full-text search with vector similarity search using pgvector embeddings (384 dimensions)
- **Multi-Turn Walking Cycles**: Iterative investigation system for complex technical questions with session management
- **AI-Powered Analysis**: BAML integration for fact extraction, hypothesis generation, and evidence synthesis
- **Graph Traversal**: Intelligent relationship exploration with cycle detection and relevance scoring
- **Real-Time Processing**: Sub-2 second response time for initial queries with progress updates

### Query Types Supported
- **Technical Questions**: "How does TensorRT-LLM scheduler handle preemption?"
- **Historical Analysis**: "What changes were made to memory management in recent commits?"
- **Performance Investigation**: "Why was this optimization introduced and what trade-offs were made?"
- **Code Understanding**: "Show me the evolution of the CUDA kernel implementations"
- **Architecture Exploration**: "How do the different components interact?"
- **Debugging Assistance**: "What could cause this performance issue?"
- **Optimization Advice**: "How can I improve the performance of this code?"
- **Pattern Discovery**: "What are the common patterns in this codebase?"

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Fastify)                     │
├─────────────────────────────────────────────────────────────┤
│                Query Processing Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │   Query     │ │   Session   │ │    Graph    │ │   AI   │ │
│  │   Engine    │ │   Manager   │ │   Walker    │ │Processor│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│                Database Operations Layer                    │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL + pgvector Database                │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Query Engine (`query-engine.ts`)
- **Hybrid Search**: Combines BM25 and vector similarity search
- **Intent Classification**: Automatically determines query intent and complexity
- **Result Ranking**: Advanced scoring algorithms balancing text relevance and semantic similarity
- **Performance Optimization**: Caching and query optimization for sub-2 second responses

#### 2. Session Manager (`session-manager.ts`)
- **Multi-Turn Support**: Maintains context across conversation turns
- **Investigation Threads**: Tracks multiple parallel investigation paths
- **Context Preservation**: Stores user preferences, artifact focus, and domain context
- **Session Persistence**: Database-backed session storage with configurable timeouts

#### 3. Graph Walker (`graph-walker.ts`)
- **Relationship Traversal**: Configurable depth and direction graph exploration
- **Cycle Detection**: Prevents infinite loops in graph traversal
- **Path Finding**: Shortest path algorithms between artifacts
- **Centrality Analysis**: Identifies important nodes in the knowledge graph

#### 4. AI Processor (`ai-processor.ts`)
- **BAML Integration**: Structured AI interactions for fact extraction
- **Hypothesis Generation**: Creates testable hypotheses from evidence
- **Confidence Scoring**: Evaluates reliability of extracted information
- **Response Synthesis**: Generates coherent narratives from evidence chains

#### 5. Query Pipeline (`query-pipeline.ts`)
- **Orchestration**: Coordinates all components in a structured pipeline
- **Error Handling**: Robust error recovery and fallback mechanisms
- **Performance Monitoring**: Tracks execution times and resource usage
- **Configuration**: Flexible pipeline configuration for different use cases

## 📡 API Endpoints

### Query Processing
- `POST /api/query` - Process initial query with intelligent analysis
- `POST /api/query/:id/continue` - Continue multi-turn investigation
- `GET /api/query/:id` - Retrieve query results by ID

### System Endpoints
- `GET /api/health` - System health check
- `GET /api/metrics` - Performance metrics and statistics
- `GET /api` - API information and available endpoints

## 🛠️ Usage

### Basic Query Processing

```typescript
import { processQuery } from './src/api/index.ts';

// Simple query
const response = await processQuery(
  'How does TensorRT-LLM handle memory allocation for CUDA kernels?',
  {
    language_hint: 'cuda',
    domain_hint: 'memory_management',
    max_results: 10,
  }
);

console.log(response.primary_answer);
console.log(`Confidence: ${response.confidence_score * 100}%`);
```

### Advanced Pipeline Usage

```typescript
import { QueryProcessingPipeline } from './src/api/index.ts';

const pipeline = new QueryProcessingPipeline({
  hybrid_search_enabled: true,
  graph_traversal_enabled: true,
  ai_processing_enabled: true,
  max_execution_time_ms: 15000,
});

const response = await pipeline.processQuery({
  query: 'Show me examples of CUDA kernel optimization techniques',
  context: {
    language_hint: 'cuda',
    domain_hint: 'optimization',
  },
  options: {
    max_results: 12,
    include_code_snippets: true,
    complexity_preference: 'expert',
    search_depth: 4,
  },
});
```

### Server Deployment

```typescript
import { startServer } from './src/api/index.ts';

const server = await startServer({
  host: '0.0.0.0',
  port: 3000,
  logger: true,
});

console.log('🚀 Query engine server started on port 3000');
```

## 🔧 Configuration

### Pipeline Configuration

```typescript
interface PipelineConfig {
  // Search configuration
  hybrid_search_enabled: boolean;
  semantic_weight: number;        // 0.7 default
  keyword_weight: number;         // 0.3 default
  search_threshold: number;       // 0.3 default
  
  // Graph traversal configuration
  graph_traversal_enabled: boolean;
  max_traversal_depth: number;    // 3 default
  min_relationship_confidence: number; // 0.5 default
  
  // AI processing configuration
  ai_processing_enabled: boolean;
  fact_extraction_enabled: boolean;
  hypothesis_generation_enabled: boolean;
  
  // Performance configuration
  max_execution_time_ms: number;  // 30000 default
  enable_caching: boolean;
  cache_ttl_ms: number;          // 300000 default
}
```

### Environment Variables

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tensorrt_oracle
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SCHEMA=tensorrt_oracle

# API Configuration
API_HOST=0.0.0.0
API_PORT=3000
BODY_LIMIT=1048576
REQUEST_TIMEOUT=30000

# Performance Configuration
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
CORS_ORIGINS=http://localhost:3000
```

## 🧪 Testing

### CLI Testing

```bash
# Run example queries
bun run src/api/index.ts example

# Test specific query
bun run src/api/index.ts "How does TensorRT handle memory allocation?"

# Start development server
bun run src/api/index.ts server

# Show system information
bun run src/api/index.ts info
```

### Integration Testing

```bash
# Test database connectivity
bun run src/api/index.ts "test database connection"

# Test hybrid search
bun run src/api/index.ts "find CUDA kernel implementations"

# Test graph traversal
bun run src/api/index.ts "show relationships between memory management components"
```

## 📊 Performance Characteristics

### Response Times
- **Initial Queries**: < 2 seconds (target)
- **Follow-up Queries**: < 1 second (with session context)
- **Graph Traversal**: < 500ms per depth level
- **AI Processing**: < 3 seconds for complex analysis

### Scalability
- **Concurrent Sessions**: 100+ simultaneous users supported
- **Database Queries**: Optimized with proper indexing and caching
- **Memory Usage**: Efficient graph traversal with configurable limits
- **CPU Usage**: Parallel processing for independent operations

### Quality Metrics
- **Search Relevance**: Hybrid scoring combines semantic and keyword matching
- **Confidence Scoring**: Multi-factor confidence assessment
- **Evidence Quality**: Ranked by relevance and AI-verified accuracy
- **Investigation Depth**: Configurable traversal depth with cycle detection

## 🔍 Query Processing Flow

1. **Request Validation**: Zod schema validation and sanitization
2. **Session Management**: Create or retrieve existing session context
3. **Intent Classification**: AI-powered intent and complexity assessment
4. **Hybrid Search**: Parallel BM25 and vector similarity search
5. **Graph Traversal**: Relationship exploration from search results
6. **AI Processing**: Fact extraction, hypothesis generation, synthesis
7. **Evidence Synthesis**: Combine and rank evidence from all sources
8. **Response Generation**: Create structured response with investigation threads
9. **Session Update**: Persist context and results for multi-turn support

## 🛡️ Error Handling

### Robust Error Recovery
- **Database Failures**: Graceful degradation with cached results
- **AI Service Outages**: Fallback to rule-based processing
- **Timeout Handling**: Configurable timeouts with partial results
- **Validation Errors**: Detailed error messages with suggestions

### Monitoring and Logging
- **Request Tracing**: Unique request IDs for debugging
- **Performance Metrics**: Execution time tracking per pipeline stage
- **Error Reporting**: Structured error logging with context
- **Health Checks**: Continuous monitoring of system components

## 🚀 Deployment

### Production Deployment

```bash
# Build the application
bun build src/api/index.ts --outdir ./dist --target bun

# Start production server
NODE_ENV=production bun run dist/index.js server
```

### Docker Deployment

```dockerfile
FROM oven/bun:1.2.18

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3000
CMD ["bun", "run", "src/api/index.ts", "server"]
```

### Database Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Run migrations
\i sql/migrations/001_tensorrt_knowledge_graph_schema.sql
\i sql/migrations/002_tensorrt_knowledge_graph_indexes.sql
```

## 📈 Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket support for live query results
- **Advanced Analytics**: Query pattern analysis and optimization suggestions
- **Multi-Repository Support**: Cross-repository knowledge graph queries
- **Custom Embeddings**: Domain-specific embedding models for TensorRT
- **Collaborative Features**: Shared investigation sessions and annotations

### Performance Optimizations
- **Query Caching**: Intelligent caching of frequent query patterns
- **Parallel Processing**: Multi-threaded graph traversal and AI processing
- **Database Optimization**: Advanced indexing strategies and query optimization
- **Memory Management**: Streaming results for large result sets

## 🤝 Contributing

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd carmack

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
bun run sql/migrations/001_tensorrt_knowledge_graph_schema.sql

# Start development server
bun run src/api/index.ts server
```

### Code Style
- Follow Carmack's principles of provable correctness
- Use TypeScript strict mode with comprehensive type safety
- Implement proper error handling with structured error types
- Write comprehensive tests for all components
- Document all public APIs with JSDoc comments

## 📄 License

This project is part of the Carmack Coder system and follows the same licensing terms.

---

**Built with Carmack's principles of performance, correctness, and elegant simplicity.**