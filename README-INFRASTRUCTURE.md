# TensorRT-LLM Knowledge Graph Infrastructure

This document describes the infrastructure setup for the TensorRT-LLM knowledge graph system that has been implemented as part of EPIC-SETUP-INFRASTRUCTURE.

## 🏗️ Infrastructure Overview

The system provides a robust foundation for ingesting, processing, and querying TensorRT-LLM repository data using a knowledge graph approach with PostgreSQL and pgvector.

### Core Components

1. **Database Layer**: PostgreSQL with pgvector extension for vector similarity search
2. **API Layer**: Fastify with ts-rest for type-safe API endpoints
3. **Ingestion System**: Automated repository processing and knowledge extraction
4. **Agent System**: AI-powered analysis and processing agents
5. **External Integrations**: GitHub, Hugging Face, BAML, and Trigger.dev

## 📦 Dependencies Added

The following key dependencies have been added to support the knowledge graph system:

- `fastify` - High-performance web framework
- `ts-rest` - Type-safe API contracts
- `@octokit/rest` - GitHub API integration
- `@trigger.dev/sdk` - Background job processing
- `@baml/ts-client` - AI model orchestration
- `pg` & `@types/pg` - PostgreSQL database connectivity

## 🗄️ Database Schema

The database includes the following core tables:

- `knowledge_nodes` - Stores code entities (files, functions, classes, etc.)
- `knowledge_relationships` - Stores relationships between entities
- `ingestion_jobs` - Tracks repository processing jobs
- `agent_tasks` - Manages AI agent processing tasks
- `query_logs` - Analytics and query optimization

### Vector Search Support

- pgvector extension enabled for similarity search
- HNSW indices for fast approximate nearest neighbor search
- Support for 1536-dimensional embeddings (OpenAI ada-002 compatible)

## 🔧 Configuration

### Environment Variables

Key environment variables have been added to `.env.example`:

```bash
# Database Configuration
POSTGRES_URL=postgresql://carmack:carmack_password@localhost:5432/tensorrt_knowledge_graph
PGVECTOR_DIMENSIONS=1536

# External Service Integration
GITHUB_TOKEN=ghp_your_github_token_here
HF_TOKEN=hf_your_huggingface_token_here
BAML_API_KEY=your_baml_api_key_here
TRIGGER_DEV_API_KEY=tr_dev_your_trigger_api_key_here
```

### TypeScript Configuration

Updated `tsconfig.json` to use ES2022/ESNext for modern JavaScript features and optimal performance.

## 🐳 Docker Setup

Updated `docker-compose.yml` includes:

- PostgreSQL 16 with pgvector extension
- Automatic database initialization with schema and indices
- Health checks and dependency management
- Persistent data volumes

### Starting the Infrastructure

```bash
# Start PostgreSQL with pgvector
docker-compose up postgres -d

# Verify database is ready
docker-compose logs postgres
```

## 🚀 Setup and Validation

### Infrastructure Validation Script

A comprehensive validation script has been created at `scripts/setup-infrastructure.ts`:

```bash
# Run infrastructure validation
bun run setup:infrastructure
```

The script validates:
- ✅ Environment configuration
- ✅ Dependencies and package setup
- ✅ Project structure
- ✅ TypeScript configuration
- ✅ Database connectivity and schema

### Manual Setup Steps

1. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Start the database**:
   ```bash
   docker-compose up postgres -d
   ```

3. **Run validation**:
   ```bash
   bun run setup:infrastructure
   ```

4. **Install dependencies** (if needed):
   ```bash
   bun install
   ```

## 📁 Project Structure

The following directories have been created for the knowledge graph system:

```
src/
├── api/          # API endpoints and routes
├── agents/       # AI processing agents
├── config/       # Environment and configuration
├── db/           # Database connection and utilities
├── ingestion/    # Repository ingestion system
└── types/        # TypeScript type definitions

sql/
├── init.sql      # Database schema initialization
└── indices.sql   # Performance optimization indices
```

## 🔍 Key Features

### Type Safety
- Comprehensive Zod schemas for runtime validation
- Strict TypeScript configuration
- Type-safe database operations

### Performance Optimization
- Vector indices for fast similarity search
- Covering indices for common query patterns
- Connection pooling with retry logic

### Error Handling
- Structured error types with context
- Comprehensive logging and monitoring
- Graceful degradation strategies

### Scalability
- Horizontal scaling support
- Background job processing
- Efficient batch operations

## 🧪 Testing

The infrastructure includes comprehensive validation:

- Environment configuration validation
- Database connectivity testing
- Schema verification
- Dependency checking
- TypeScript compilation validation

## 📊 Monitoring

Built-in monitoring capabilities:
- Database health checks
- Query performance analytics
- Connection pool statistics
- Index usage monitoring

## 🔄 Next Steps

With the infrastructure in place, the system is ready for:

1. **Ingestion Implementation** - Repository processing and knowledge extraction
2. **API Development** - Query endpoints and data access
3. **Agent Development** - AI-powered analysis and processing
4. **Frontend Integration** - User interface and visualization

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running: `docker-compose up postgres -d`
   - Check credentials in `.env` file
   - Verify network connectivity

2. **pgvector Extension Missing**
   - Use the official pgvector Docker image: `pgvector/pgvector:pg16`
   - Check Docker logs: `docker-compose logs postgres`

3. **TypeScript Errors**
   - Run type checking: `bun run type-check`
   - Ensure all dependencies are installed: `bun install`

### Validation Script Output

The setup script provides detailed feedback:
- ✅ Green checkmarks for successful validations
- ❌ Red X marks for failed validations
- 📊 Summary with overall status and timing

## 📚 Documentation

- Database schema: `sql/init.sql`
- Performance indices: `sql/indices.sql`
- Type definitions: `src/types/knowledge-graph.ts`
- Environment config: `src/config/environment.ts`
- Database utilities: `src/db/connection.ts`

---

The infrastructure is now ready to support the sophisticated TensorRT-LLM knowledge graph system with robust data storage, efficient querying, and scalable processing capabilities.