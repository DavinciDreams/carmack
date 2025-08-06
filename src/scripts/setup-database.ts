import { initializeDatabaseSystem } from '../db/index.ts';

async function setupDatabase() {
	console.log('🗄️ Setting up TensorRT Knowledge Graph database using modular DB system...\n');
	const result = await initializeDatabaseSystem({ runMigrations: true, validateSchema: true });
	if (result.success) {
		console.log('🎉 Database setup and migrations completed successfully!');
	} else {
		console.error('❌ Database setup failed:', result.errors);
		process.exit(1);
	}
}

// Run setup if called directly
if (require.main === module) {
	setupDatabase().catch(console.error);
}

export { setupDatabase };