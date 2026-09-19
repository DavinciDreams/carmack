import { basename } from 'node:path';

import type { WikiPage, WikiSnapshot } from '../src/wikiracing/index.ts';
import { validateSnapshot } from '../src/wikiracing/index.ts';

interface Manifest {
  readonly id: string;
  readonly titles: readonly string[];
}

interface ApiPage {
  readonly title: string;
  readonly missing?: boolean;
  readonly links?: readonly { readonly ns: number; readonly title: string }[];
}

interface ApiResponse {
  readonly query?: { readonly pages?: Readonly<Record<string, ApiPage>> };
  readonly continue?: Readonly<Record<string, string>>;
  readonly error?: { readonly info: string };
}

const manifestPath = 'fixtures/wikiracing/manifest.json';
const outputPath = process.argv[2] ?? 'fixtures/wikiracing/wikipedia-mini-001.json';
const manifest = (await Bun.file(manifestPath).json()) as Manifest;
const captureId = process.argv[2] === undefined ? manifest.id : basename(outputPath, '.json');
const arena = new Set(manifest.titles);
if (arena.size !== manifest.titles.length) throw new Error('manifest has duplicate titles');
if (await Bun.file(outputPath).exists()) {
  throw new Error(`snapshot already exists at "${outputPath}"; choose a new output path`);
}

async function articleLinks(title: string): Promise<readonly string[]> {
  const links = new Set<string>();
  let continuation: Readonly<Record<string, string>> | undefined;
  do {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    for (const [key, value] of Object.entries({
      action: 'query',
      format: 'json',
      prop: 'links',
      pllimit: 'max',
      plnamespace: '0',
      titles: title,
      ...(continuation ?? {}),
    }))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CarmackWikiracingSnapshot/0.1 (https://github.com/DavinciDreams/carmack)',
      },
    });
    if (!response.ok) throw new Error(`Wikipedia API returned ${response.status} for "${title}"`);
    const body = (await response.json()) as ApiResponse;
    if (body.error) throw new Error(`Wikipedia API: ${body.error.info}`);
    const pages = Object.values(body.query?.pages ?? {});
    if (pages.length !== 1 || pages[0]?.missing) throw new Error(`missing article "${title}"`);
    if (pages[0]?.title !== title) {
      throw new Error(`article title "${title}" resolved to "${pages[0]?.title}"`);
    }
    for (const link of pages[0]?.links ?? []) {
      if (link.ns === 0) links.add(link.title);
    }
    continuation = body.continue;
  } while (continuation !== undefined);
  return [...links].sort();
}

const pages: WikiPage[] = [];
for (const title of [...manifest.titles].sort()) {
  const allLinks = await articleLinks(title);
  pages.push({
    title,
    links: allLinks.filter((link) => arena.has(link)),
    totalArticleLinks: allLinks.length,
  });
}
const snapshot: WikiSnapshot = validateSnapshot({
  id: captureId,
  capturedAt: new Date().toISOString(),
  source: 'MediaWiki action=query&prop=links, namespace 0; induced subgraph of manifest titles',
  pages,
});
await Bun.write(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  `Captured ${snapshot.pages.length} pages and ${snapshot.pages.reduce(
    (sum, page) => sum + page.links.length,
    0
  )} legal directed links to ${outputPath}`
);
