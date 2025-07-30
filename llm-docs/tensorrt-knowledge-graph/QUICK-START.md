# TensorRT Knowledge Graph Platform - Quick Start Guide

## 🚀 Get Running in Under 10 Minutes

This guide will get you up and running with the TensorRT Knowledge Graph Platform quickly, demonstrating all four implemented epics working together.

## Prerequisites

- **Bun** runtime (>= 1.0.0)
- **Docker** for PostgreSQL + pgvector
- **Git** for repository cloning
- **8GB RAM** minimum (16GB recommended)
- **10GB disk space** for database and repositories

## Step 1: Environment Setup (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd carmack

# Install dependencies
bun install

# Add PostgreSQL dependency
bun add pg pg-pool @types/pg

# Create environment configuration
cp .env.example .env
```

Edit `.env` file:
```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tensorrt_oracle
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# TensorRT Configuration
TENSORRT_REPO_PATH=./workspace/repository

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
```

## Step 2: Database Setup (3 minutes)

```bash
# Start PostgreSQL with pgvector extension
docker run --name tensorrt-postgres \
  -e POSTGRES_DB=tensorrt_oracle \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 15

# Verify PostgreSQL is running
docker exec tensorrt-postgres pg_isready -U postgres

# Initialize database schema
echo "🔧 Initializing database schema..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/init.sql

# Create performance indices
echo "📊 Creating performance indices..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/indices.sql

echo "✅ Database setup complete!"
```

## Step 3: Verify Installation (1 minute)

```bash
# Test database connection
bun run -e "
import { Pool } from 'pg';
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tensorrt_oracle',
  user: 'postgres',
  password: 'your_secure_password'
});
const client = await pool.connect();
const result = await client.query('SELECT NOW() as time');
console.log('✅ Database connected:', result.rows[0].time);
client.release();
await pool.end();
"

# Test vector extension
docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector as distance;
"
```

## Step 4: Run Interactive Demo (2 minutes)

```bash
# Start the comprehensive demo
bun run demo/tensorrt-demo.ts

# Or run specific demonstrations
bun run demo/tensorrt-demo.ts --engineer     # Software engineer workflow
bun run demo/tensorrt-demo.ts --researcher   # AI researcher workflow  
bun run demo/tensorrt-demo.ts --manager      # Engineering manager workflow
bun run demo/tensorrt-demo.ts --all-demos    # Run all demonstrations
```

## Step 5: Explore the System (2 minutes)

### View System Architecture
```bash
bun run demo/tensorrt-demo.ts --architecture
```

### Monitor Performance Metrics
```bash
# Real-time metrics dashboard
bun run demo/metrics-dashboard.ts

# Generate performance report
bun run demo/metrics-dashboard.ts --report

# Single metrics snapshot
bun run demo/metrics-dashboard.ts --once
```

### Try Example Scenarios
```bash
# Interactive mode with example scenarios
bun run demo/tensorrt-demo.ts

# Then try these commands:
# > demo engineer
# > demo researcher  
# > demo manager
# > architecture
# > metrics
```

## 🎯 What You'll See

### EPIC 1: Infrastructure Setup
- ✅ PostgreSQL + pgvector database operational
- ✅ Optimized schema for code entities and embeddings
- ✅ High-performance vector indices (HNSW)
- ✅ Connection pooling and error handling

### EPIC 2: Ingestion Pipeline
- 🔍 Multi-language code analysis (CUDA, C++, Python)
- 🧠 Semantic embedding generation (512-dimensional vectors)
- 📊 Knowledge pattern extraction
- 🔗 Entity relationship mapping

### EPIC 3: Query Engine
- 💬 Natural language query processing
- 🎯 Intent classification (8 different types)
- 🔍 Hybrid semantic + keyword search
- 📈 Multi-turn conversation support

### EPIC 4: Testing & Metrics
- 📊 Real-time performance monitoring
- ✅ Automated validation and quality assessment
- 📈 User engagement analytics
- 🎯 Accuracy and confidence tracking

## 🔍 Example Queries to Try

### For Software Engineers
```
"Find CUDA kernel implementations for convolution operations"
"Show me memory allocation patterns in TensorRT engines"
"How does TensorRT handle FP16 precision optimization?"
"Find examples of custom plugin implementations"
"What are common error handling patterns in the codebase?"
```

### For AI Researchers
```
"Compare different quantization approaches in the codebase"
"Explain TensorRT's graph optimization strategies"
"Show me performance benchmarking implementations"
"How does TensorRT implement layer fusion?"
"What are the architectural patterns for inference engines?"
```

### For Engineering Managers
```
"What are the main components of TensorRT architecture?"
"Show me the most complex parts of the codebase"
"What are the key performance optimization areas?"
"How is error handling implemented across the system?"
"What are the main API patterns used in TensorRT?"
```

## 📊 Expected Performance

### Query Performance
- **Response Time**: < 500ms for semantic search
- **Accuracy**: 85%+ confidence on domain-specific queries
- **Throughput**: 100+ queries per minute
- **Success Rate**: 95%+ query completion

### Database Performance
- **Vector Search**: Sub-second similarity search
- **Concurrent Users**: 50+ simultaneous queries
- **Storage**: Efficient schema with 90%+ utilization
- **Indexing**: HNSW indices for optimal performance

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
docker ps | grep tensorrt-postgres

# Check logs
docker logs tensorrt-postgres

# Restart if needed
docker restart tensorrt-postgres
```

### Memory Issues
```bash
# Check memory usage
docker stats tensorrt-postgres

# Increase Docker memory limit if needed
# Docker Desktop: Settings > Resources > Memory
```

### Port Conflicts
```bash
# Check if port 5432 is in use
lsof -i :5432

# Use different port if needed
docker run -p 5433:5432 ... # Then update .env POSTGRES_PORT=5433
```

### Permission Issues
```bash
# Fix file permissions
chmod +x demo/tensorrt-demo.ts
chmod +x demo/metrics-dashboard.ts

# Fix SQL file permissions
chmod 644 sql/*.sql
```

## 🎮 Interactive Demo Commands

Once in the interactive demo, try these commands:

```bash
# Persona demonstrations
demo engineer      # Run engineer workflow
demo researcher    # Run researcher workflow  
demo manager       # Run manager workflow

# System information
architecture       # Show system architecture
metrics            # Display performance metrics
ingestion          # Show ingestion pipeline demo

# Utility commands
help               # Show available commands
clear              # Clear screen
stats              # Show database statistics
exit               # Exit demo
```

## 📈 Success Indicators

You'll know the system is working correctly when you see:

✅ **Database Connected**: PostgreSQL responds to queries  
✅ **Vector Operations**: pgvector extension functional  
✅ **Schema Initialized**: All tables and indices created  
✅ **Demo Responsive**: Interactive demo starts without errors  
✅ **Metrics Available**: Performance dashboard shows data  
✅ **Queries Processed**: Natural language queries return results  

## 🚀 Next Steps

1. **[Explore Examples](examples/basic-queries.md)** - Try more complex queries
2. **[Read User Guide](user-guides/getting-started.md)** - Learn advanced features
3. **[API Documentation](api/oracle-query-api.md)** - Integrate with your applications
4. **[Production Deployment](deployment/production-deployment.md)** - Deploy to production
5. **[Performance Tuning](performance/optimization-guide.md)** - Optimize for your use case

## 💡 Tips for Best Results

- **Use Specific Terms**: Include technical keywords like "CUDA", "kernel", "optimization"
- **Mention Languages**: Specify "C++", "Python", "CUDA" for better filtering
- **Include Domains**: Reference "inference", "memory", "performance" for domain-specific results
- **Ask Follow-ups**: Build on previous queries for deeper investigation
- **Try Different Intents**: Use "find", "explain", "compare", "optimize" to vary query types

## 🤝 Getting Help

If you encounter issues:

1. **Check Logs**: Look at console output for error messages
2. **Verify Prerequisites**: Ensure Bun, Docker, and dependencies are installed
3. **Review Environment**: Double-check `.env` configuration
4. **Test Components**: Use individual test commands to isolate issues
5. **Consult Documentation**: See [Troubleshooting Guide](deployment/troubleshooting.md)

---

**Congratulations!** 🎉 You now have a fully functional TensorRT Knowledge Graph Platform demonstrating sophisticated semantic search, natural language processing, and real-time analytics for code understanding.

The system showcases how modern AI techniques can transform how engineers interact with complex codebases, providing instant access to institutional knowledge and enabling more efficient software development workflows.