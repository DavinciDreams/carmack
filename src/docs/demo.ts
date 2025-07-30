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
    const indexer = new SemanticIndexer(pool);
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
    
    const explainQuery = {
      query: 'tensor optimization',
      intent: 'explain' as const,
    };
    const explainResponse = await oracle.processQuery(explainQuery);
    console.log('Explain response:', explainResponse.response.substring(0, 200) + '...\n');

    const examplesQuery = {
      query: 'CUDA kernel',
      intent: 'find-examples' as const,
    };
    const examplesResponse = await oracle.processQuery(examplesQuery);
    console.log('Examples response:', examplesResponse.response.substring(0, 200) + '...\n');

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