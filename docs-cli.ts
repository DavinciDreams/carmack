import { runDocsCLI } from './src/docs/cli.js';

console.log('🔥 Carmack Docs CLI Wrapper');
console.log('Process argv:', process.argv);

runDocsCLI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
