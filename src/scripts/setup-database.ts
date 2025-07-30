import { Pool } from 'pg';

async function setupDatabase() {
	console.log('🗄️ Setting up TensorRT Knowledge Graph database...\n');

	const dbConfig = {
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '5432'),
		database: process.env.DB_NAME || 'tensorrt_knowledge',
		user: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD || 'postgres',
	};

	const pool = new Pool(dbConfig);

	try {
		// Enable pgvector extension
		console.log('Enabling pgvector extension...');
		await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
		console.log('✅ pgvector extension enabled');

		// Create knowledge_nodes table
		console.log('Creating knowledge_nodes table...');
		await pool.query(`
			CREATE TABLE IF NOT EXISTS knowledge_nodes (
				id UUID PRIMARY KEY,
				type VARCHAR(50) NOT NULL,
				name VARCHAR(255) NOT NULL,
				path TEXT,
				content TEXT,
				metadata JSONB,
				embedding vector(512),
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW()
			)
		`);
		console.log('✅ knowledge_nodes table created');

		// Create knowledge_relationships table
		console.log('Creating knowledge_relationships table...');
		await pool.query(`
			CREATE TABLE IF NOT EXISTS knowledge_relationships (
				id UUID PRIMARY KEY,
				source_node_id UUID REFERENCES knowledge_nodes(id),
				target_node_id UUID REFERENCES knowledge_nodes(id),
				relationship_type VARCHAR(50),
				metadata JSONB,
				created_at TIMESTAMP DEFAULT NOW()
			)
		`);
		console.log('✅ knowledge_relationships table created');

		// Create repository_analyses table
		console.log('Creating repository_analyses table...');
		await pool.query(`
			CREATE TABLE IF NOT EXISTS repository_analyses (
				id UUID PRIMARY KEY,
				repository_name VARCHAR(255) NOT NULL,
				repository_path TEXT NOT NULL,
				analysis_date TIMESTAMP DEFAULT NOW(),
				total_files INTEGER,
				total_nodes INTEGER,
				languages JSONB,
				domains JSONB,
				metadata JSONB
			)
		`);
		console.log('✅ repository_analyses table created');

		// Create indexes
		console.log('Creating indexes...');
		await pool.query('CREATE INDEX IF NOT EXISTS idx_nodes_type ON knowledge_nodes(type)');
		await pool.query('CREATE INDEX IF NOT EXISTS idx_nodes_name ON knowledge_nodes(name)');
		await pool.query('CREATE INDEX IF NOT EXISTS idx_nodes_path ON knowledge_nodes(path)');
		await pool.query('CREATE INDEX IF NOT EXISTS idx_relationships_source ON knowledge_relationships(source_node_id)');
		await pool.query('CREATE INDEX IF NOT EXISTS idx_relationships_target ON knowledge_relationships(target_node_id)');
		console.log('✅ Indexes created');

		console.log('\n🎉 Database setup completed successfully!');

	} catch (error) {
		console.error('❌ Database setup failed:', error);
		throw error;
	} finally {
		await pool.end();
	}
}

// Run setup if called directly
if (require.main === module) {
	setupDatabase().catch(console.error);
}

export { setupDatabase };
