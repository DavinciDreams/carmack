#!/usr/bin/env bun

/**
 * Simple TensorRT Oracle Demo
 * Demonstrates the Oracle system with mock data
 */

// Database configuration
const _dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'tensorrt_oracle',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your_secure_password',
  schema: process.env.POSTGRES_SCHEMA || 'tensorrt_oracle',
};

// Mock TensorRT code entities for demonstration
const mockEntities = [
  {
    id: '1',
    name: 'convolution_kernel',
    type: 'kernel',
    language: 'cuda' as const,
    filePath: '/tensorrt/kernels/convolution.cu',
    startLine: 15,
    endLine: 45,
    signature:
      '__global__ void convolution_kernel(float* input, float* output, float* weights, int batch_size)',
    description: 'CUDA kernel for performing convolution operations on GPU',
    domain: 'kernel_execution' as const,
    keywords: ['convolution', 'cuda', 'kernel', 'gpu', 'optimization'],
    sourceCode: `__global__ void convolution_kernel(float* input, float* output, float* weights, int batch_size) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < batch_size) {
        float sum = 0.0f;
        for (int i = 0; i < 9; i++) {
            sum += input[idx + i] * weights[i];
        }
        output[idx] = sum;
    }
}`,
  },
  {
    id: '2',
    name: 'InferenceEngine',
    type: 'class',
    language: 'cpp' as const,
    filePath: '/tensorrt/src/inference_engine.cpp',
    startLine: 25,
    endLine: 120,
    signature: 'class InferenceEngine',
    description: 'Main inference engine class for TensorRT model execution',
    domain: 'inference' as const,
    keywords: ['inference', 'engine', 'tensorrt', 'execution', 'optimization'],
    sourceCode: `class InferenceEngine {
private:
    std::unique_ptr<nvinfer1::ICudaEngine> engine;
    std::unique_ptr<nvinfer1::IExecutionContext> context;
    
public:
    bool initialize(const std::string& modelPath);
    bool execute(void** bindings);
    void optimize_for_inference();
};`,
  },
  {
    id: '3',
    name: 'TensorRTInference',
    type: 'class',
    language: 'python' as const,
    filePath: '/tensorrt/python/tensorrt_inference.py',
    startLine: 10,
    endLine: 85,
    signature: 'class TensorRTInference',
    description: 'Python wrapper for TensorRT inference operations',
    domain: 'inference' as const,
    keywords: ['python', 'tensorrt', 'inference', 'wrapper', 'api'],
    sourceCode: `class TensorRTInference:
    def __init__(self, engine_path):
        self.logger = trt.Logger(trt.Logger.WARNING)
        self.runtime = trt.Runtime(self.logger)
        with open(engine_path, 'rb') as f:
            self.engine = self.runtime.deserialize_cuda_engine(f.read())
        self.context = self.engine.create_execution_context()`,
  },
];

class SimplifiedOracleProcessor {
  private entities = mockEntities;

  classifyIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (
      /find.*function|search.*code|locate.*implementation|where.*defined|show.*example/.test(
        lowerQuery
      )
    ) {
      return 'code_search';
    }
    if (/pattern|common.*approach|how.*typically|best.*practice|convention/.test(lowerQuery)) {
      return 'pattern_analysis';
    }
    if (/architecture|structure|design|component|module|relationship/.test(lowerQuery)) {
      return 'architecture_question';
    }
    if (/optimize|performance|faster|efficient|improve|bottleneck/.test(lowerQuery)) {
      return 'optimization_advice';
    }
    if (/how.*use|api|interface|call|invoke|parameter/.test(lowerQuery)) {
      return 'api_usage';
    }

    return 'general_question';
  }

  extractLanguageHint(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('cuda') || lowerQuery.includes('kernel')) return 'cuda';
    if (lowerQuery.includes('c++') || lowerQuery.includes('cpp')) return 'cpp';
    if (lowerQuery.includes('python')) return 'python';

    return undefined;
  }

  extractDomainHint(query: string): string | undefined {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('inference') ||
      lowerQuery.includes('execute') ||
      lowerQuery.includes('run')
    )
      return 'inference';
    if (
      lowerQuery.includes('optimize') ||
      lowerQuery.includes('performance') ||
      lowerQuery.includes('fast')
    )
      return 'optimization';
    if (lowerQuery.includes('kernel') || lowerQuery.includes('cuda') || lowerQuery.includes('gpu'))
      return 'kernel_execution';
    if (
      lowerQuery.includes('memory') ||
      lowerQuery.includes('buffer') ||
      lowerQuery.includes('allocation')
    )
      return 'memory_management';

    return undefined;
  }

  searchEntities(
    query: string,
    language?: string,
    domain?: string
  ): Array<{ entity: any; relevance: number; explanation: string }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ entity: any; relevance: number; explanation: string }> = [];

    for (const entity of this.entities) {
      let relevance = 0;
      let explanation = '';

      // Language filter
      if (language && entity.language !== language) continue;

      // Domain filter
      if (domain && entity.domain !== domain) continue;

      // Name matching
      if (entity.name.toLowerCase().includes(lowerQuery)) {
        relevance += 0.9;
        explanation += 'Name matches query. ';
      }

      // Keyword matching
      for (const keyword of entity.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          relevance += 0.3;
          explanation += `Contains keyword "${keyword}". `;
        }
      }

      // Description matching
      if (entity.description.toLowerCase().includes(lowerQuery)) {
        relevance += 0.5;
        explanation += 'Description matches query. ';
      }

      // Source code matching
      if (entity.sourceCode.toLowerCase().includes(lowerQuery)) {
        relevance += 0.4;
        explanation += 'Source code contains relevant terms. ';
      }

      if (relevance > 0.2) {
        results.push({
          entity,
          relevance: Math.min(relevance, 1.0),
          explanation: explanation.trim(),
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  async processQuery(query: string): Promise<void> {
    console.log(`\n🔍 Processing query: "${query}"`);
    console.log('⏳ Analyzing...\n');

    const startTime = Date.now();

    // Classify query
    const intent = this.classifyIntent(query);
    const language = this.extractLanguageHint(query);
    const domain = this.extractDomainHint(query);

    // Search for relevant entities
    const results = this.searchEntities(query, language, domain);

    const processingTime = Date.now() - startTime;

    console.log('📋 Query Analysis:');
    console.log(`  Intent: ${intent}`);
    console.log(`  Language: ${language || 'auto-detected'}`);
    console.log(`  Domain: ${domain || 'general'}`);
    console.log(`  Results: ${results.length} entities found`);
    console.log(`  Processing time: ${processingTime}ms\n`);

    console.log('💬 Oracle Response:');
    console.log('='.repeat(80));

    if (results.length === 0) {
      console.log("I couldn't find any relevant code entities for your query.");
      console.log('\n**Suggestions:**');
      console.log('- Try using more specific technical terms');
      console.log('- Include language keywords (CUDA, C++, Python)');
      console.log('- Mention specific TensorRT components (engine, builder, context)');
      console.log('- Use domain-specific terms (inference, optimization, serialization)');
    } else {
      console.log(`Found ${results.length} relevant results:\n`);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const entity = result.entity;

        console.log(
          `### ${i + 1}. ${entity.name} (${Math.round(result.relevance * 100)}% match)\n`
        );
        console.log(
          `**Type:** ${entity.type} | **Language:** ${entity.language} | **Domain:** ${entity.domain}\n`
        );

        if (entity.description) {
          console.log(`**Description:** ${entity.description}\n`);
        }

        if (entity.signature) {
          console.log(`**Signature:** \`${entity.signature}\`\n`);
        }

        console.log(`**Location:** ${entity.filePath}:${entity.startLine}\n`);

        if (entity.sourceCode && entity.sourceCode.length < 300) {
          console.log(`**Code:**\n\`\`\`${entity.language}\n${entity.sourceCode}\n\`\`\`\n`);
        } else if (entity.sourceCode) {
          console.log(
            `**Code Preview:**\n\`\`\`${entity.language}\n${entity.sourceCode.substring(0, 200)}...\n\`\`\`\n`
          );
        }

        if (result.explanation) {
          console.log(`**Why this matches:** ${result.explanation}\n`);
        }

        console.log('---\n');
      }
    }

    console.log('='.repeat(80));
  }

  async showHelp(): Promise<void> {
    console.log(`
🔮 TensorRT Oracle - Demo Mode

This is a demonstration of the TensorRT Oracle system using mock data.
The system can analyze natural language queries and find relevant code entities.

EXAMPLE QUERIES:
  "Find CUDA kernel implementations for convolution"
  "Show me inference engine classes"
  "How to use Python API for TensorRT?"
  "Find optimization techniques"
  "Show me C++ classes for inference"

QUERY TYPES:
  • Code Search        - Find specific functions, classes, or implementations
  • Pattern Analysis   - Discover common coding patterns and practices
  • Architecture       - Understand system structure and relationships
  • Optimization       - Get performance improvement suggestions
  • API Usage          - Learn how to use TensorRT APIs correctly

MOCK DATA INCLUDES:
  • CUDA convolution kernel
  • C++ InferenceEngine class
  • Python TensorRT wrapper class

TIPS:
  • Use specific technical terms for better results
  • Mention programming languages (CUDA, C++, Python)
  • Include TensorRT-specific terms (engine, inference, kernel)
  • Ask about domains (inference, optimization, kernel execution)
`);
  }

  async runInteractive(): Promise<void> {
    console.log('🔮 TensorRT Oracle - Demo Mode');
    console.log('Type your questions or "exit" to quit, "help" for assistance\n');

    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question('🔮 Oracle> ', (answer) => {
          resolve(answer.trim());
        });
      });
    };

    while (true) {
      try {
        const query = await askQuestion();

        if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
          console.log('👋 Goodbye!');
          break;
        }

        if (query.toLowerCase() === 'help') {
          await this.showHelp();
          continue;
        }

        if (query.toLowerCase() === 'clear') {
          console.clear();
          console.log('🔮 TensorRT Oracle - Demo Mode');
          console.log('Type your questions or "exit" to quit, "help" for assistance\n');
          continue;
        }

        if (!query) {
          console.log('💡 Please enter a query, or type "help" for examples');
          continue;
        }

        await this.processQuery(query);
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }

    rl.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const oracle = new SimplifiedOracleProcessor();

  console.log('🔮 Initializing TensorRT Oracle Demo...');
  console.log('✅ Demo ready with mock TensorRT data!\n');

  try {
    if (args.length === 0 || args[0] === '--interactive') {
      await oracle.runInteractive();
    } else if (args[0] === '--help' || args[0] === '-h') {
      await oracle.showHelp();
    } else {
      // Single query mode
      const query = args.join(' ');
      await oracle.processQuery(query);
    }
  } catch (error) {
    console.error('❌ Oracle Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
