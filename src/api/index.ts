import { QueryProcessingPipeline } from './query-pipeline.ts';

import type { QueryRequest, QueryResponse } from './contracts.ts';
import { QueryRequestSchema, QueryResponseSchema } from './contracts.ts';

/**
 * Main Entry Point for TensorRT-LLM Knowledge Graph Query Engine
 *
 * Exports all the main components and provides a simple interface for
 * using the query engine system. Follows Carmack's principles of
 * clean API design and modular architecture.
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

// Main pipeline
export { QueryProcessingPipeline } from './query-pipeline.ts';

// Individual components
export { QueryEngine, HybridSearchEngine, EmbeddingService } from './query-engine.ts';
export { SessionManager } from './session-manager.ts';
export { GraphWalker } from './graph-walker.ts';
export { AIProcessor } from './ai-processor.ts';

// Server components
export { createServer, startServer, stopServer, setupGracefulShutdown } from './server.ts';
export { QueryRouteHandlers, registerQueryRoutes } from './routes/query-routes.ts';

// Type definitions and contracts
export * from './contracts.ts';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================


/**
 * Simple query interface for direct usage
 */
export async function processQuery(
  query: string,
  options: {
    repository_url?: string;
    language_hint?: string;
    domain_hint?: string;
    max_results?: number;
    include_code_snippets?: boolean;
  } = {}
): Promise<QueryResponse> {
  const pipeline = new QueryProcessingPipeline();

  // Build and validate the request using Zod
  const requestInput = {
    query,
    context: {
      repository_url: options.repository_url,
      language_hint: options.language_hint,
      domain_hint: options.domain_hint,
    },
    options: {
      max_results: options.max_results || 20,
      include_code_snippets: options.include_code_snippets ?? true,
      enable_multi_turn: true,
      complexity_preference: 'moderate',
      search_depth: 3,
    },
  };
  const request: QueryRequest = QueryRequestSchema.parse(requestInput);

  const response = await pipeline.processQuery(request);
  // Validate response with Zod
  return QueryResponseSchema.parse(response);
}

/**
 * Create a configured query engine instance
 */
/**
 * Create a configured query engine instance
 */
export function createQueryEngine(config?: {
  hybrid_search_enabled?: boolean;
  graph_traversal_enabled?: boolean;
  ai_processing_enabled?: boolean;
  max_execution_time_ms?: number;
}): QueryProcessingPipeline {
  // Optionally, validate config here with a Zod schema if you have one
  return new QueryProcessingPipeline(config);
}
// Export Zod schemas for server integration
export { QueryRequestSchema, QueryResponseSchema };

// =============================================================================
// SYSTEM INFORMATION
// =============================================================================

export const SYSTEM_INFO = {
  name: 'TensorRT-LLM Knowledge Graph Query Engine',
  version: '1.0.0',
  description: 'Intelligent query processing system with hybrid retrieval, multi-turn investigations, and AI-powered synthesis',
  features: [
    'Hybrid search (BM25 + vector similarity)',
    'Graph traversal and relationship analysis',
    'Multi-turn conversation support',
    'AI-powered fact extraction and synthesis',
    'Session management and context preservation',
    'Real-time query processing with progress updates',
  ],
  components: {
    'Query Engine': 'Hybrid search implementation with BM25 and vector similarity',
    'Session Manager': 'Multi-turn conversation handling and context preservation',
    'Graph Walker': 'Relationship traversal algorithms with cycle detection',
    'AI Processor': 'BAML integration for structured AI interactions',
    'API Server': 'Fastify server with type-safe endpoints',
    'Query Pipeline': 'End-to-end query processing orchestration',
  },
  supported_query_types: [
    'Technical Questions: "How does TensorRT-LLM scheduler handle preemption?"',
    'Historical Analysis: "What changes were made to memory management in recent commits?"',
    'Performance Investigation: "Why was this optimization introduced and what trade-offs were made?"',
    'Code Understanding: "Show me the evolution of the CUDA kernel implementations"',
    'Architecture Exploration: "How do the different components interact?"',
    'Debugging Assistance: "What could cause this performance issue?"',
    'Optimization Advice: "How can I improve the performance of this code?"',
    'Pattern Discovery: "What are the common patterns in this codebase?"',
  ],
} as const;

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example usage of the query engine
 */
export async function exampleUsage(): Promise<void> {
  console.log('🚀 TensorRT-LLM Knowledge Graph Query Engine Example\n');

  try {
    // Example 1: Simple query
    console.log('📝 Example 1: Simple technical question');

    // Example with Zod validation
    const response1 = await processQuery(
      'How does TensorRT-LLM handle memory allocation for CUDA kernels?',
      {
        language_hint: 'cuda',
        domain_hint: 'memory_management',
        max_results: 10,
      }
    );
    QueryResponseSchema.parse(response1); // Runtime validation

    console.log(`Query ID: ${response1.query_id}`);
    console.log(`Intent: ${response1.intent}`);
    console.log(`Complexity: ${response1.complexity}`);
    console.log(`Confidence: ${(response1.confidence_score * 100).toFixed(1)}%`);
    console.log(`Evidence items: ${response1.evidence_chain.length}`);
    console.log(`Execution time: ${response1.execution_time_ms}ms`);
    console.log(`Answer: ${response1.primary_answer.substring(0, 200)}...\n`);

    // Example 2: Performance investigation
    console.log('⚡ Example 2: Performance investigation');

    const response2 = await processQuery(
      'What are the performance bottlenecks in the TensorRT inference pipeline?',
      {
        domain_hint: 'performance_analysis',
        max_results: 15,
      }
    );
    QueryResponseSchema.parse(response2);

    console.log(`Query ID: ${response2.query_id}`);
    console.log(`Investigation threads: ${response2.investigation_threads.length}`);
    console.log(`Suggested questions: ${response2.suggested_questions.length}`);
    console.log(`Answer: ${response2.primary_answer.substring(0, 200)}...\n`);

    // Example 3: Using the pipeline directly
    console.log('🔧 Example 3: Using pipeline directly');
    const pipeline = createQueryEngine({
      hybrid_search_enabled: true,
      graph_traversal_enabled: true,
      ai_processing_enabled: true,
      max_execution_time_ms: 15000,
    });


    const response3 = await pipeline.processQuery(QueryRequestSchema.parse({
      query: 'Show me examples of CUDA kernel optimization techniques',
      context: {
        language_hint: 'cuda',
        domain_hint: 'optimization',
      },
      options: {
        max_results: 12,
        include_code_snippets: true,
        enable_multi_turn: true,
        complexity_preference: 'expert',
        search_depth: 4,
      },
    }));
    QueryResponseSchema.parse(response3);

    console.log(`Query ID: ${response3.query_id}`);
    console.log(`Artifacts searched: ${response3.artifacts_searched}`);
    console.log(`Relationships traversed: ${response3.relationships_traversed}`);
    console.log(`Answer: ${response3.primary_answer.substring(0, 200)}...\n`);

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

/**
 * Simple CLI interface for testing
 */
export async function runCLI(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: bun run src/api/index.ts <query>');
    console.log('Example: bun run src/api/index.ts "How does TensorRT handle memory allocation?"');
    return;
  }

  const query = args.join(' ');
  console.log(`🔍 Processing query: "${query}"\n`);

  try {
    const response = await processQuery(query);
    QueryResponseSchema.parse(response); // Validate CLI output

    console.log('📊 Query Results:');
    console.log(`- Query ID: ${response.query_id}`);
    console.log(`- Intent: ${response.intent}`);
    console.log(`- Complexity: ${response.complexity}`);
    console.log(`- Confidence: ${(response.confidence_score * 100).toFixed(1)}%`);
    console.log(`- Evidence items: ${response.evidence_chain.length}`);
    console.log(`- Execution time: ${response.execution_time_ms}ms`);
    console.log(`- Artifacts searched: ${response.artifacts_searched}`);
    console.log(`- Relationships traversed: ${response.relationships_traversed}\n`);

    console.log('💡 Answer:');
    console.log(response.primary_answer);

    if (response.suggested_questions.length > 0) {
      console.log('\n🤔 Suggested follow-up questions:');
      response.suggested_questions.forEach((question, index) => {
        console.log(`${index + 1}. ${question}`);
      });
    }

    if (response.investigation_threads.length > 0) {
      console.log('\n🔬 Investigation threads:');
      response.investigation_threads.forEach((thread, index) => {
        console.log(`${index + 1}. ${thread.title} (${thread.priority} priority)`);
      });
    }
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Main execution when file is run directly
 */
if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'example':
      await exampleUsage();
      break;
    case 'server':
      const { startServer } = await import('./server.ts');
      await startServer();
      break;
    case 'info':
      console.log(JSON.stringify(SYSTEM_INFO, null, 2));
      break;
    default:
      await runCLI();
  }
}