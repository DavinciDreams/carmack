// Watches an ingested repo and auto-updates docs on file changes
import chokidar from 'chokidar';
import { generateAndStoreDocs } from './generator-pipeline';

export function watchRepoDocs({ repoPath, docConfig }: { repoPath: string; docConfig: any }) {
  const watcher = chokidar.watch(`${repoPath}/**/*.{ts,js,py,cpp,cu,c,h}`, {
    ignoreInitial: true,
    ignored: /node_modules|\.git|dist|build|\.out/,
  });

  watcher.on('all', async (_event, path) => {
    try {
      await generateAndStoreDocs({ ...docConfig, sourceFiles: [path] });
      // Optionally, debounce or batch updates for performance
      console.log(`[docs] Updated documentation for: ${path}`);
    } catch (err) {
      console.error(`[docs] Failed to update docs for ${path}:`, err);
    }
  });

  console.log(`[docs] Watching ${repoPath} for documentation updates...`);
  return watcher;
}
