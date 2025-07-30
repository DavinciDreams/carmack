#!/usr/bin/env bun

/**
 * TensorRT Oracle Interactive CLI
 * Query the TensorRT Oracle system interactively
 */

import { OracleQueryProcessor } from '../docs/oracle-query-processor.js';
import { SemanticIndexer } from '../ingestion/semantic-indexer.js';

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'tensorrt_oracle',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your_secure_password',
  schema: process.env.POSTGRES_SCHEMA || 'tensorrt_oracle',
};

class OracleCLI {
  private processor: OracleQueryProcessor;
  private indexer: SemanticIndexer;

  constructor() {
    this.processor = new OracleQueryProcessor(dbConfig);
    this.indexer = new SemanticIndexer({
      model: process.env.SEMANTIC_INDEXER_MODEL || 'default-model',
      maxTokens: Number.parseInt(process.env.SEMANTIC_INDEXER_MAX_TOKENS || '2048'),
      batchSize: Number.parseInt(process.env.SEMANTIC_INDEXER_BATCH_SIZE || '16'),
      apiKey: process.env.SEMANTIC_INDEXER_API_KEY,
    });
  }

  async initialize(): Promise<void> {
    console.log('🔮 Initializing TensorRT Oracle...');

    try {
      await this.indexer.initialize();
      console.log('✅ Connected to PostgreSQL database');

      // Check if we have any data
      const stats = await this.indexer.getRepositoryStats();
      console.log('📊 Database status:', stats);

      await this.indexer.close();
      console.log('✅ Oracle ready for queries!\n');
    } catch (error) {
      console.error('❌ Failed to initialize Oracle:', error);
      throw error;
    }
  }

  async processQuery(query: string): Promise<void> {
    console.log(`\n🔍 Processing query: "${query}"`);
    console.log('⏳ Analyzing...\n');

    try {
      const startTime = Date.now();
      const oracleQuery = await this.processor.processQuery(query);
      const response = await this.processor.generateResponse(oracleQuery);
      const totalTime = Date.now() - startTime;

      console.log('📋 Query Analysis:');
      console.log(`  Intent: ${oracleQuery.intent}`);
      console.log(`  Language: ${oracleQuery.language || 'auto-detected'}`);
      console.log(`  Domain: ${oracleQuery.domain || 'general'}`);
      console.log(`  Results: ${oracleQuery.results.length} entities found`);
      console.log(`  Processing time: ${totalTime}ms\n`);

      console.log('💬 Oracle Response:');
      console.log('='.repeat(80));
      console.log(response);
      console.log('='.repeat(80));
    } catch (error) {
      console.error('❌ Query failed:', error);
    }
  }

  async showHelp(): Promise<void> {
    console.log(`
🔮 TensorRT Oracle - Interactive Query Interface

USAGE:
  oracle-cli [query]                 - Process a single query
  oracle-cli --interactive          - Start interactive mode
  oracle-cli --help                 - Show this help

EXAMPLE QUERIES:
  "Find CUDA kernel implementations for convolution"
  "How to optimize TensorRT inference performance?"
  "Show me Python API usage for model loading"
  "What are the best practices for memory management?"
  "Explain TensorRT engine serialization patterns"
  "Find all optimization techniques in the codebase"
  "Show me examples of custom plugin implementations"

QUERY TYPES:
  • Code Search        - Find specific functions, classes, or implementations
  • Pattern Analysis   - Discover common coding patterns and practices
  • Architecture       - Understand system structure and relationships
  • Optimization       - Get performance improvement suggestions
  • API Usage          - Learn how to use TensorRT APIs correctly
  • Debugging          - Find error handling and troubleshooting code
  • Performance        - Analyze performance-critical code sections

TIPS:
  • Use specific technical terms for better results
  • Mention programming languages (CUDA, C++, Python)
  • Include TensorRT-specific terms (engine, builder, context)
  • Ask about domains (inference, optimization, serialization)
`);
  }

  async runInteractive(): Promise<void> {
    console.log('🔮 TensorRT Oracle - Interactive Mode');
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

        if (query.toLowerCase() === 'stats') {
          await this.showStats();
          continue;
        }

        if (query.toLowerCase() === 'clear') {
          console.clear();
          console.log('🔮 TensorRT Oracle - Interactive Mode');
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

  async showStats(): Promise<void> {
    console.log('\n📊 Oracle Database Statistics:');

    try {
      await this.indexer.initialize();
      const statsRaw = await this.indexer.getRepositoryStats();

      // Zod schema for stats validation
      const { z } = await import('zod');
      const StatsSchema = z.object({
        total: z
          .object({
            totalEntities: z.number(),
            languagesCount: z.number(),
            domainsCount: z.number(),
            filesCount: z.number(),
          })
          .optional(),
        byLanguage: z.record(z.string(), z.number()).optional(),
        byDomain: z.record(z.string(), z.number()).optional(),
      });
      const stats = StatsSchema.parse(statsRaw);

      console.log('Database Status:');
      if (stats.total && stats.total.totalEntities > 0) {
        console.log(`  • Total Entities: ${stats.total.totalEntities}`);
        console.log(`  • Languages: ${stats.total.languagesCount}`);
        console.log(`  • Domains: ${stats.total.domainsCount}`);
        console.log(`  • Files: ${stats.total.filesCount}`);

        if (stats.byLanguage) {
          console.log('\nBy Language:');
          for (const [lang, count] of Object.entries(stats.byLanguage)) {
            console.log(`  • ${lang}: ${count} entities`);
          }
        }

        if (stats.byDomain) {
          console.log('\nBy Domain:');
          for (const [domain, count] of Object.entries(stats.byDomain)) {
            console.log(`  • ${domain}: ${count} entities`);
          }
        }
      } else {
        console.log('  • No indexed data found');
        console.log('  • Run the indexer first to populate the database');
      }

      await this.indexer.close();
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const oracle = new OracleCLI();

  try {
    await oracle.initialize();

    if (args.length === 0 || args[0] === '--interactive') {
      await oracle.runInteractive();
    } else if (args[0] === '--help' || args[0] === '-h') {
      await oracle.showHelp();
    } else if (args[0] === '--stats') {
      await oracle.showStats();
    } else {
      // Single query mode
      const query = args.join(' ');
      await oracle.processQuery(query);
    }
  } catch (error) {
    console.error('❌ Oracle CLI failed:', error);
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}
