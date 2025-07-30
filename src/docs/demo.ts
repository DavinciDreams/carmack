import { Pool } from 'pg';

import { OracleQueryProcessor } from './oracle-query-processor';
import { SemanticIndexer } from '../ingestion/semantic-indexer';

async function runDemo() {
  console.log('🚀 Starting TensorRT Knowledge Graph Demo\n');

  // Database connection
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'tensorrt_knowledge',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const pool = new Pool(dbConfig);

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Initialize components
    const indexer = new SemanticIndexer({
      model: process.env.SEMANTIC_MODEL || 'default-model',
      maxTokens: 2048,
      batchSize: 16,
      apiKey: process.env.SEMANTIC_API_KEY,
    });
    const oracle = new OracleQueryProcessor(pool);

    // Run sample queries
    console.log('🔍 Running sample queries...\n');

    // Test semantic search
    console.log('1. Testing semantic search...');
    const searchResults = await indexer.searchSimilar('tensor optimization', {
      limit: 3,
      threshold: 0.5,
    });
    console.log(`Found ${searchResults.length} similar nodes\n`);

    // Test oracle queries
    console.log('2. Testing oracle queries...');
    
    const explainQuery = 'tensor optimization';
    const explainResponse = await oracle.processQuery(explainQuery);
    // Use 'response' property as per the type definition

  // OracleQuery does not have 'answer', so log the query, intent, and results
  console.log('Explain response:', `Query: ${explainResponse.query}, Intent: ${explainResponse.intent}, Results: ${JSON.stringify(explainResponse.results.slice(0, 2))}`);

  // Define an examplesQuery string
  const examplesQuery = 'tensor optimization examples';
  const examplesResponse = await oracle.processQuery(examplesQuery);
  // Log the query, intent, and results for the examples response
  console.log('Examples response:', `Query: ${examplesResponse.query}, Intent: ${examplesResponse.intent}, Results: ${JSON.stringify(examplesResponse.results.slice(0, 2))}`);

    // Get repository stats
    console.log('3. Getting repository statistics...');
    const stats = await indexer.getRepositoryStats();
    console.log('Repository stats:', JSON.stringify(stats, null, 2));

    console.log('\n✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await pool.end();
  }
}

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };