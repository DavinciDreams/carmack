import {
  enumerateTasks,
  runBaselines,
  validateSnapshot,
  type WikiSnapshot,
} from '../src/wikiracing/index.ts';

const path = 'fixtures/wikiracing/wikipedia-mini-001.json';
const snapshot = validateSnapshot((await Bun.file(path).json()) as WikiSnapshot);
const tasks = enumerateTasks(snapshot, 2, 4, 6);
const report = runBaselines(snapshot, tasks, 32);
console.log(
  JSON.stringify(
    {
      snapshot: snapshot.id,
      capturedAt: snapshot.capturedAt,
      pages: snapshot.pages.length,
      legalEdges: snapshot.pages.reduce((sum, page) => sum + page.links.length, 0),
      candidateArticleLinks: snapshot.pages.reduce((sum, page) => sum + page.totalArticleLinks, 0),
      ...report,
    },
    null,
    2
  )
);
