# TensorRT Oracle Implementation Guide

## Complete Implementation Roadmap for Phase 1 (EOD Today)

This guide provides step-by-step implementation instructions for building the TensorRT Oracle system with PostgreSQL + pgvector semantic indexing, preserving all existing functionality while adding sophisticated repository analysis capabilities.

## Prerequisites and Setup

### 1. Database Setup

#### Install PostgreSQL with pgvector
```bash
# Using Docker (Recommended)
docker run --name tensorrt-postgres \
  -e POSTGRES_DB=tensorrt_oracle \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16

# Or install locally
# Ubuntu/Debian
sudo apt-get install postgresql-16 postgresql-16-pgvector

# macOS
brew install postgresql pgvector
```

#### Initialize Database Schema
```sql
-- Connect to database and run initialization
\c tensorrt_oracle;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Run the complete schema from TENSORRT-PGVECTOR-ARCHITECTURE.md
-- (Copy the full schema from that document)
```

### 2. Dependencies

#### Add to package.json
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1",
    "@types/pg": "^8.10.9",
    "node-postgres": "^0.6.2"
  }
}
```

#### Install
```bash
bun install pg pg-pool @types/pg
```

## Implementation Steps

### Step 1: Extend Types System

#### Create Enhanced Types (Architect Mode Limitation Workaround)
Since we can only edit Markdown files in Architect mode, here are the type definitions that need to be added to `src/docs/types.ts`:

```typescript
// Add these interfaces to src/docs/types.ts

// PostgreSQL configuration
export const PostgreSQLConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  database: z.string().default('tensorrt_oracle'),
  username: z.string().default('postgres'),
  password: z.string(),
  ssl: z.boolean().optional(),
  poolSize: z.number().default(20),
  connectionTimeout: z.number().default(2000),
});

// TensorRT-specific documentation request
export const TensorRTDocumentationRequestSchema = DocumentationRequestSchema.extend({
  type: z.enum(['api', 'architecture', 'patterns', 'usage', 'changelog', 'tensorrt-oracle']),
  tensorrtConfig: z.object({
    enableCudaAnalysis: z.boolean().default(true),
    enableTemplateAnalysis: z.boolean().default(true),
    enableSemanticIndexing: z.boolean().default(true),
    enableInstitutionalKnowledge: z.boolean().default(true),
    queryInterface: z.boolean().default(true),
    repositoryPath: z.string().optional(),
    postgresConfig: PostgreSQLConfigSchema.optional(),
  }).optional(),
});

// CUDA kernel documentation
export const CudaKernelDocSchema = FunctionDocSchema.extend({
  kernelType: z.enum(['__global__', '__device__', '__host__']),
  launchConfig: z.object({
    gridDim: z.string(),
    blockDim: z.string(),
    sharedMemSize: z.string().optional(),
    stream: z.string().optional(),
  }).optional(),
  memoryPatterns: z.array(z.string()).default([]),
  optimizationHints: z.array(z.string()).default([]),
});

// C++ template documentation
export const TemplateDocSchema = ClassDocSchema.extend({
  templateParameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['typename', 'class', 'auto', 'template']),
    defaultValue: z.string().optional(),
    constraints: z.array(z.string()).optional(),
  })),
  specializations: z.array(z.string()).default([]),
  instantiations: z.array(z.string()).default([]),
});

// Semantic index entry
export const SemanticIndexEntrySchema = z.object({
  id: z.string(),
  entityType: z.enum(['function', 'class', 'kernel', 'template', 'api', 'pattern']),
  filePath: z.string(),
  name: z.string(),
  signature: z.string(),
  description: z.string(),
  embedding: z.array(z.number()), // Vector type
  keywords: z.array(z.string()),
  domain: z.array(z.string()),
  complexity: z.number(),
  performance: z.enum(['critical', 'normal', 'low']),
  relationships: z.array(z.object({
    type: z.enum(['calls', 'inherits', 'implements', 'uses', 'optimizes']),
    target: z.string(),
    strength: z.number(),
  })),
});

// Oracle query types
export const OracleQuerySchema = z.object({
  query: z.string(),
  intent: z.enum(['explain', 'find', 'compare', 'optimize', 'debug', 'history']),
  domain: z.array(z.string()).default([]),
  complexity: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate'),
  context: z.object({
    currentFile: z.string().optional(),
    selectedCode: z.string().optional(),
    userRole: z.enum(['developer', 'researcher', 'manager']).optional(),
  }).optional(),
});

export const OracleResponseSchema = z.object({
  query: z.string(),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  codeExamples: z.array(z.object({
    filePath: z.string(),
    code: z.string(),
    explanation: z.string(),
    relevance: z.number(),
  })),
  relatedConcepts: z.array(z.object({
    concept: z.string(),
    relationship: z.string(),
    relevance: z.number(),
  })),
  sources: z.array(z.object({
    type: z.enum(['code', 'comment', 'documentation', 'pattern']),
    location: z.string(),
    excerpt: z.string(),
  })),
  suggestions: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

// Export types
export type PostgreSQLConfig = z.infer<typeof PostgreSQLConfigSchema>;
export type TensorRTDocumentationRequest = z.infer<typeof TensorRTDocumentationRequestSchema>;
export type CudaKernelDoc = z.infer<typeof CudaKernelDocSchema>;
export type TemplateDoc = z.infer<typeof TemplateDocSchema>;
export type SemanticIndexEntry = z.infer<typeof SemanticIndexEntrySchema>;
export type OracleQuery = z.infer<typeof OracleQuerySchema>;
export type OracleResponse = z.infer<typeof OracleResponseSchema>;
```

### Step 2: PostgreSQL Integration Layer

#### Create Database Connection Manager
File: `src/docs/tensorrt/postgres-connection.ts`

```typescript
import { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { PostgreSQLConfig } from '../types.js';

export class PostgreSQLConnection {
  private pool: Pool;
  private isConnected = false;

  constructor(private config: PostgreSQLConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.connectionTimeout,
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const client = await this.pool.connect();
      
      // Test connection and verify pgvector extension
      await client.query('SELECT 1');
      const vectorResult = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
      
      if (vectorResult.rows.length === 0) {
        throw new Error('pgvector extension not found. Please install pgvector.');
      }
      
      client.release();
      this.isConnected = true;
      console.log('✅ Connected to PostgreSQL with pgvector');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
  }

  async initializeSchema(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Run schema initialization
      const schemaSQL = `
        -- Enable extensions
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
        CREATE EXTENSION IF NOT EXISTS btree_gin;
        
        -- Create tables (copy from TENSORRT-PGVECTOR-ARCHITECTURE.md)
        -- ... (include full schema here)
      `;
      
      await client.query(schemaSQL);
      await client.query('COMMIT');
      
      console.log('✅ Database schema initialized');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Step 3: Enhanced AST-Grep Patterns

#### CUDA Analysis Patterns
File: `src/docs/tensorrt/cuda-patterns.ts`

```typescript
export const CUDA_PATTERNS = {
  // Kernel definitions
  globalKernel: {
    pattern: '__global__ void $NAME($PARAMS) { $BODY }',
    description: 'CUDA global kernel function',
    extract: ['NAME', 'PARAMS', 'BODY'],
    metadata: { type: 'cuda_kernel', execution: 'device' }
  },
  
  deviceFunction: {
    pattern: '__device__ $RETURN $NAME($PARAMS) { $BODY }',
    description: 'CUDA device function',
    extract: ['RETURN', 'NAME', 'PARAMS', 'BODY'],
    metadata: { type: 'cuda_function', execution: 'device' }
  },
  
  // Memory management
  cudaMalloc: {
    pattern: 'cudaMalloc($PTR, $SIZE)',
    description: 'CUDA device memory allocation',
    extract: ['PTR', 'SIZE'],
    metadata: { type: 'memory_allocation', memory_type: 'device' }
  },
  
  cudaMemcpy: {
    pattern: 'cudaMemcpy($DST, $SRC, $SIZE, $KIND)',
    description: 'CUDA memory copy operation',
    extract: ['DST', 'SRC', 'SIZE', 'KIND'],
    metadata: { type: 'memory_transfer' }
  },
  
  sharedMemory: {
    pattern: '__shared__ $TYPE $VAR[$SIZE]',
    description: 'CUDA shared memory declaration',
    extract: ['TYPE', 'VAR', 'SIZE'],
    metadata: { type: 'shared_memory' }
  },
  
  // Kernel launches
  kernelLaunch: {
    pattern: '$KERNEL<<<$GRID, $BLOCK>>>($ARGS)',
    description: 'CUDA kernel launch',
    extract: ['KERNEL', 'GRID', 'BLOCK', 'ARGS'],
    metadata: { type: 'kernel_launch' }
  },
  
  // Thread indexing
  threadIdx: {
    pattern: 'threadIdx.$DIM',
    description: 'Thread index access',
    extract: ['DIM'],
    metadata: { type: 'thread_index' }
  },
  
  blockIdx: {
    pattern: 'blockIdx.$DIM',
    description: 'Block index access',
    extract: ['DIM'],
    metadata: { type: 'block_index' }
  },
  
  // Optimization patterns
  coalescing: {
    pattern: '$VAR[threadIdx.x + $OFFSET]',
    description: 'Memory coalescing pattern',
    extract: ['VAR', 'OFFSET'],
    metadata: { type: 'optimization', pattern: 'coalescing' }
  },
  
  bankConflictAvoidance: {
    pattern: '$VAR[threadIdx.x * $STRIDE + $OFFSET]',
    description: 'Bank conflict avoidance pattern',
    extract: ['VAR', 'STRIDE', 'OFFSET'],
    metadata: { type: 'optimization', pattern: 'bank_conflict_avoidance' }
  }
};

export const CPP_TEMPLATE_PATTERNS = {
  templateClass: {
    pattern: 'template<$PARAMS> class $NAME { $BODY }',
    description: 'C++ template class definition',
    extract: ['PARAMS', 'NAME', 'BODY'],
    metadata: { type: 'template_class' }
  },
  
  templateFunction: {
    pattern: 'template<$PARAMS> $RETURN $NAME($ARGS) { $BODY }',
    description: 'C++ template function definition',
    extract: ['PARAMS', 'RETURN', 'NAME', 'ARGS', 'BODY'],
    metadata: { type: 'template_function' }
  },
  
  templateSpecialization: {
    pattern: 'template<> class $NAME<$SPEC> { $BODY }',
    description: 'C++ template specialization',
    extract: ['NAME', 'SPEC', 'BODY'],
    metadata: { type: 'template_specialization' }
  },
  
  enableIf: {
    pattern: 'typename std::enable_if<$CONDITION, $TYPE>::type',
    description: 'SFINAE enable_if pattern',
    extract: ['CONDITION', 'TYPE'],
    metadata: { type: 'sfinae', pattern: 'enable_if' }
  },
  
  conceptDefinition: {
    pattern: 'concept $NAME = $CONSTRAINT',
    description: 'C++20 concept definition',
    extract: ['NAME', 'CONSTRAINT'],
    metadata: { type: 'concept' }
  }
};

export const TENSORRT_PATTERNS = {
  pluginCreator: {
    pattern: 'class $NAME : public nvinfer1::IPluginCreator { $BODY }',
    description: 'TensorRT plugin creator class',
    extract: ['NAME', 'BODY'],
    metadata: { type: 'tensorrt_plugin_creator' }
  },
  
  pluginV2: {
    pattern: 'class $NAME : public nvinfer1::IPluginV2DynamicExt { $BODY }',
    description: 'TensorRT plugin V2 implementation',
    extract: ['NAME', 'BODY'],
    metadata: { type: 'tensorrt_plugin_v2' }
  },
  
  builderCreate: {
    pattern: '$BUILDER->create$METHOD($ARGS)',
    description: 'TensorRT builder method call',
    extract: ['BUILDER', 'METHOD', 'ARGS'],
    metadata: { type: 'tensorrt_builder' }
  },
  
  networkDefinition: {
    pattern: '$NETWORK->add$LAYER($ARGS)',
    description: 'TensorRT network layer addition',
    extract: ['NETWORK', 'LAYER', 'ARGS'],
    metadata: { type: 'tensorrt_network' }
  },
  
  engineCreate: {
    pattern: '$ENGINE->createExecutionContext()',
    description: 'TensorRT execution context creation',
    extract: ['ENGINE'],
    metadata: { type: 'tensorrt_execution' }
  },
  
  inference: {
    pattern: '$CONTEXT->executeV2($BINDINGS)',
    description: 'TensorRT inference execution',
    extract: ['CONTEXT', 'BINDINGS'],
    metadata: { type: 'tensorrt_inference' }
  }
};
```

### Step 4: Enhanced DocumentationGenerator

#### Core Enhancement Methods
File: `src/docs/tensorrt/tensorrt-generator.ts`

```typescript
import { DocumentationGenerator } from '../generator.js';
import { PostgreSQLConnection } from './postgres-connection.js';
import { PostgreSQLSemanticIndexer } from './postgres-indexer.js';
import { CudaAnalyzer } from './cuda-analyzer.js';
import { CppTemplateAnalyzer } from './cpp-analyzer.js';
import { OracleQueryProcessor } from './oracle-processor.js';
import type { TensorRTDocumentationRequest, DocumentationResult } from '../types.js';

export class TensorRTDocumentationGenerator extends DocumentationGenerator {
  private postgresConnection: PostgreSQLConnection;
  private semanticIndexer: PostgreSQLSemanticIndexer;
  private cudaAnalyzer: CudaAnalyzer;
  private cppAnalyzer: CppTemplateAnalyzer;

  constructor() {
    super();
    
    // Initialize PostgreSQL connection
    const postgresConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'tensorrt_oracle',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
    };
    
    this.postgresConnection = new PostgreSQLConnection(postgresConfig);
    this.semanticIndexer = new PostgreSQLSemanticIndexer(this.postgresConnection);
    this.cudaAnalyzer = new CudaAnalyzer();
    this.cppAnalyzer = new CppTemplateAnalyzer();
  }

  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResult> {
    // Handle TensorRT Oracle requests
    if (request.type === 'tensorrt-oracle') {
      return await this.generateTensorRTOracle(request as TensorRTDocumentationRequest);
    }
    
    // Fallback to parent implementation for other types
    return await super.generateDocumentation(request);
  }

  async generateTensorRTOracle(request: TensorRTDocumentationRequest): Promise<DocumentationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Initialize database connection
      await this.postgresConnection.connect();
      await this.postgresConnection.initializeSchema();
      
      // 2. Repository ingestion with enhanced analysis
      console.log('🔍 Ingesting TensorRT repository...');
      const repositoryIndex = await this.ingestTensorRTRepository(request);
      
      // 3. Store in PostgreSQL with semantic indexing
      console.log('💾 Building semantic index...');
      await this.semanticIndexer.insertRepositoryData(repositoryIndex);
      
      // 4. Extract institutional knowledge
      console.log('🧠 Extracting institutional knowledge...');
      const knowledgeGraph = await this.extractInstitutionalKnowledge(repositoryIndex);
      
      // 5. Create Oracle query interface
      console.log('🔮 Initializing Oracle interface...');
      const oracleInterface = new OracleQueryProcessor(
        this.semanticIndexer,
        knowledgeGraph,
        this.nlpAnalyzer
      );
      
      // 6. Generate comprehensive documentation
      console.log('📝 Generating documentation...');
      const content = await this.generateOracleDocumentation(
        repositoryIndex,
        knowledgeGraph,
        oracleInterface
      );
      
      const metadata = {
        generatedAt: new Date().toISOString(),
        sourceFiles: repositoryIndex.files,
        totalFunctions: repositoryIndex.functions.length,
        totalClasses: repositoryIndex.classes.length,
        totalModules: repositoryIndex.modules.length,
        totalKernels: repositoryIndex.cudaKernels?.length || 0,
        totalTemplates: repositoryIndex.templates?.length || 0,
        semanticIndexSize: await this.semanticIndexer.getEntityCount(),
        knowledgeGraphNodes: knowledgeGraph.entities.size,
        generationTime: Date.now() - startTime,
      };
      
      console.log('✅ TensorRT Oracle generation complete!');
      console.log(`📊 Processed ${metadata.totalFunctions} functions, ${metadata.totalKernels} kernels, ${metadata.totalTemplates} templates`);
      
      return {
        type: 'tensorrt-oracle',
        format: request.format,
        content,
        metadata,
        oracleInterface, // Attach for interactive use
        warnings: [],
        errors: [],
      };
      
    } catch (error) {
      console.error('❌ TensorRT Oracle generation failed:', error);
      
      return {
        type: 'tensorrt-oracle',
        format: request.format,
        content: '',
        metadata: {
          generatedAt: new Date().toISOString(),
          sourceFiles: [],
          totalFunctions: 0,
          totalClasses: 0,
          totalModules: 0,
          totalKernels: 0,
          totalTemplates: 0,
          semanticIndexSize: 0,
          knowledgeGraphNodes: 0,
          generationTime: Date.now() - startTime,
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private async ingestTensorRTRepository(request: TensorRTDocumentationRequest): Promise<RepositoryIndex> {
    const repositoryPath = request.tensorrtConfig?.repositoryPath || './workspace/repository';
    const sourceFiles = await this.discoverSourceFiles(repositoryPath);
    
    console.log(`📁 Found ${sourceFiles.length} source files`);
    
    const repositoryIndex: RepositoryIndex = {
      name: 'TensorRT',
      path: repositoryPath,
      files: sourceFiles,
      modules: [],
      functions: [],
      classes: [],
      cudaKernels: [],
      templates: [],
      pythonBindings: [],
      patterns: [],
      relationships: new Map(),
      entities: [],
    };
    
    // Process files by language with progress tracking
    let processedFiles = 0;
    for (const filePath of sourceFiles) {
      const language = this.detectLanguageFromFile(filePath);
      
      try {
        switch (language) {
          case 'cuda':
            await this.processCudaFile(filePath, repositoryIndex);
            break;
          case 'cpp':
            await this.processCppFile(filePath, repositoryIndex);
            break;
          case 'python':
            await this.processPythonFile(filePath, repositoryIndex);
            break;
          case 'c':
            await this.processCFile(filePath, repositoryIndex);
            break;
          default:
            await this.processGenericFile(filePath, repositoryIndex);
        }
        
        processedFiles++;
        if (processedFiles % 100 === 0) {
          console.log(`📈 Processed ${processedFiles}/${sourceFiles.length} files`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to process ${filePath}:`, error);
      }
    }
    
    // Build cross-file relationships
    console.log('🔗 Building relationships...');
    await this.buildRelationships(repositoryIndex);
    
    // Consolidate entities
    repositoryIndex.entities = [
      ...repositoryIndex.functions,
      ...repositoryIndex.classes,
      ...(repositoryIndex.cudaKernels || []),
      ...(repositoryIndex.templates || []),
    ];
    
    console.log(`✅ Repository analysis complete: ${repositoryIndex.entities.length} entities`);
    
    return repositoryIndex;
  }

  private async processCudaFile(filePath: string, index: RepositoryIndex): Promise<void> {
    const content = await this.readFile(filePath);
    
    // Extract CUDA kernels
    const kernels = await this.cudaAnalyzer.extractKernels(content, filePath);
    index.cudaKernels = index.cudaKernels || [];
    index.cudaKernels.push(...kernels);
    
    // Extract device functions
    const deviceFunctions = await this.cudaAnalyzer.extractDeviceFunctions(content, filePath);
    index.functions.push(...deviceFunctions);
    
    // Extract memory patterns
    const memoryPatterns = await this.cudaAnalyzer.extractMemoryPatterns(content, filePath);
    index.patterns.push(...memoryPatterns);
    
    // Extract optimization patterns
    const optimizations = await this.cudaAnalyzer.extractOptimizationPatterns(content, filePath);
    index.patterns.push(...optimizations);
  }

  private async processCppFile(filePath: string, index: RepositoryIndex): Promise<void> {
    const content = await this.readFile(filePath);
    
    // Extract template classes and functions
    const templateClasses = await this.cppAnalyzer.extractTemplateClasses(content, filePath);
    const templateFunctions = await this.cppAnalyzer.extractTemplateFunctions(content, filePath);
    
    index.templates = index.templates || [];
    index.templates.push(...templateClasses, ...templateFunctions);
    
    // Extract SFINAE patterns
    const sfinaePatterns = await this.cppAnalyzer.extractSfinaePatterns(content, filePath);
    index.patterns.push(...sfinaePatterns);
    
    // Regular C++ analysis using parent analyzer
    const regularAnalysis = await this.analyzer.analyzeFile(filePath);
    index.modules.push(regularAnalysis);
    index.functions.push(...regularAnalysis.exports.functions);
    index.classes.push(...regularAnalysis.exports.classes);
  }

  private async generateOracleDocumentation(
    repositoryIndex: RepositoryIndex,
    knowledgeGraph: KnowledgeGraph,
    oracleInterface: OracleQueryProcessor
  ): Promise<string> {
    let documentation = '# TensorRT Oracle Documentation\n\n';
    documentation += `Generated on ${new Date().toISOString()}\n\n`;
    
    // Repository overview
    documentation += '## Repository Overview\n\n';
    documentation += `- **Total Files**: ${repositoryIndex.files.length}\n`;
    documentation += `- **Total Entities**: ${repositoryIndex.entities.length}\n`;
    documentation += `- **CUDA Kernels**: ${repositoryIndex.cudaKernels?.length || 0}\n`;
    documentation += `- **C++ Templates**: ${repositoryIndex.templates?.length || 0}\n`;
    documentation += `- **Functions**: ${repositoryIndex.functions.length}\n`;
    documentation += `- **Classes**: ${repositoryIndex.classes.length}\n\n`;
    
    // Knowledge graph summary
    documentation += '## Institutional Knowledge\n\n';
    documentation += `- **Knowledge Entities**: ${knowledgeGraph.entities.size}\n`;
    documentation += `- **Patterns Discovered**: ${knowledgeGraph.patterns.size}\n`;
    documentation += `- **Relationships**: ${knowledgeGraph.relationships.size}\n\n`;
    
    // Oracle capabilities
    documentation += '## Oracle Query Capabilities\n\n';
    documentation += 'The TensorRT Oracle can answer questions about:\n\n';
    documentation += '- **Memory Management**: CUDA allocation patterns, optimization techniques\n';
    documentation += '- **Performance**: Kernel optimization, template metaprogramming\n';
    documentation += '- **API Usage**: TensorRT API patterns, plugin development\n';
    documentation += '- **Code Evolution**: How APIs and patterns have changed over time\n';
    documentation += '- **Best Practices**: Common patterns and anti-patterns\n\n';
    
    // Example queries
    documentation += '### Example Queries\n\n';
    const exampleQueries = [
      'How does TensorRT handle memory allocation for different data types?',
      'What are the performance implications of using FP16 vs FP32?',
      'Show me examples of custom plugin implementations',
      'What are common CUDA kernel optimization patterns in this codebase?',
      'How has the inference API evolved over time?'
    ];
    
    for (const query of exampleQueries) {
      documentation += `- "${query}"\n`;
    }
    
    documentation += '\n## Usage\n\n';
    documentation += 'Use the Oracle interface to ask questions about the TensorRT codebase:\n\n';
    documentation += '```typescript\n';
    documentation += 'const response = await oracleInterface.processQuery({\n';
    documentation += '  query: "How does TensorRT optimize memory usage?",\n';
    documentation += '  intent: "explain",\n';
    documentation += '  complexity: "intermediate"\n';
    documentation += '});\n';
    documentation += '```\n\n';
    
    return documentation;
  }
}
```

### Step 5: CLI Integration

#### Enhanced CLI Support
Add to `src/docs/cli.ts`:

```typescript
// Add these options to the CLI parser
const cliOptions = {
  // ... existing options
  'tensorrt-oracle': { type: 'boolean' },
  'postgres-host': { type: 'string' },
  'postgres-port': { type: 'string' },
  'postgres-db': { type: 'string' },
  'postgres-user': { type: 'string' },
  'postgres-password': { type: 'string' },
  'repository-path': { type: 'string' },
  'enable-cuda': { type: 'boolean' },
  'enable-templates': { type: 'boolean' },
  'query': { type: 'string' },
};

// Add TensorRT Oracle generation method
private async generateTensorRTOracle(
  generator: DocumentationGenerator,
  config: { sourceDir: string; outputDir: string; formats: string[] }
): Promise<void> {
  console.log('🚀 Starting TensorRT Oracle generation...');
  
  const request: TensorRTDocumentationRequest = {
    type: 'tensorrt-oracle',
    format: 'markdown',
    outputPath: `${config.outputDir}/tensorrt-oracle.md`,
    tensorrtConfig: {
      enableCudaAnalysis: true,
      enableTemplateAnalysis: true,
      enableSemanticIndexing: true,
      enableInstitutionalKnowledge: true,
      queryInterface: true,
      repositoryPath: config.sourceDir,
    },
  };
  
  const result = await generator.generateDocumentation(request);
  
  if (result.errors && result.errors.length > 0) {
    console.error('❌ Errors:', result.errors);
  }
  
  if (result.warnings && result.warnings.length > 0