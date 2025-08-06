// Script to update Carmack repo documentation before commit (for Lefthook)
import { generateAndStoreDocs } from '../docs/generator-pipeline';

async function main() {
  await generateAndStoreDocs({
    type: 'api',
    format: 'markdown',
    sourceDir: './src',
    outputPath: './docs/api.md',
  });
  // Add more doc types if needed
}

main().catch((err) => {
  console.error('Documentation update failed:', err);
  process.exit(1);
});
