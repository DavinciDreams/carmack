import { createHash } from 'node:crypto';

import { describe, expect, test } from 'bun:test';

import {
  enumerateTasks,
  runBaselines,
  runRace,
  shortestPath,
  titleOverlapPolicy,
  validateSnapshot,
  type WikiSnapshot,
} from '../../src/wikiracing/index.ts';

const sample: WikiSnapshot = {
  id: 'unit-graph',
  capturedAt: '2026-09-19T00:00:00.000Z',
  source: 'synthetic unit fixture',
  pages: [
    { title: 'A', links: ['B', 'C'], totalArticleLinks: 2 },
    { title: 'B', links: ['D'], totalArticleLinks: 1 },
    { title: 'C', links: ['B', 'E'], totalArticleLinks: 2 },
    { title: 'D', links: ['F'], totalArticleLinks: 1 },
    { title: 'E', links: ['F'], totalArticleLinks: 1 },
    { title: 'F', links: [], totalArticleLinks: 0 },
  ],
};

describe('frozen link-only Wikiracing baseline', () => {
  test('enumerates all eligible ordered pairs and computes a directed oracle', () => {
    const snapshot = validateSnapshot(sample);
    expect(shortestPath(snapshot, 'A', 'F')).toEqual(['A', 'B', 'D', 'F']);
    expect(shortestPath(snapshot, 'F', 'A')).toBeNull();
    const tasks = enumerateTasks(snapshot, 2, 3, 4);
    expect(tasks.find(({ start, target }) => start === 'A' && target === 'F')?.shortestClicks).toBe(3);
    expect(tasks.some(({ start, target }) => start === 'F' && target === 'A')).toBe(false);
  });

  test('policy sees only legal outgoing links, not hidden adjacency or oracle distance', () => {
    const snapshot = validateSnapshot(sample);
    const task = enumerateTasks(snapshot, 2, 3, 4).find(({ id }) => id === 'A -> F');
    if (!task) throw new Error('expected A -> F task');
    const seen: string[] = [];
    const result = runRace(snapshot, task, (view) => {
      seen.push(...Object.keys(view).sort());
      return view.current === 'A' ? 'B' : view.current === 'B' ? 'D' : 'F';
    });
    expect(result.success).toBe(true);
    expect(result.clicks).toBe(3);
    expect(result.excessClicks).toBe(0);
    expect(new Set(seen)).toEqual(new Set([
      'current', 'target', 'links', 'path', 'remainingClicks',
    ]));
  });

  test('invalid moves are rejected and cannot escape the frozen arena', () => {
    const snapshot = validateSnapshot(sample);
    const task = enumerateTasks(snapshot, 2, 3, 4).find(({ id }) => id === 'A -> F');
    if (!task) throw new Error('expected A -> F task');
    const result = runRace(snapshot, task, () => 'F');
    expect(result.termination).toBe('invalid-action');
    expect(result.path).toEqual(['A']);
  });

  test('reports seeded random, visible-title heuristic, and omniscient bound reproducibly', () => {
    const snapshot = validateSnapshot(sample);
    const tasks = enumerateTasks(snapshot, 2, 3, 4);
    const first = runBaselines(snapshot, tasks, 16);
    const second = runBaselines(snapshot, tasks, 16);
    expect(first).toEqual(second);
    expect(first.taskCount).toBeGreaterThan(0);
    expect(first.baselines.map(({ name }) => name)).toEqual([
      'uniform-random', 'title-overlap', 'shortest-path-oracle',
    ]);
    expect(first.baselines[2]?.successRate).toBe(1);
    expect(first.baselines[2]?.meanExcessClicksOnSuccess).toBe(0);
    expect(first.byShortestDistance['3']).toBeDefined();
  });

  test('validates the snapshot and does not mutate caller-owned data', () => {
    const input = structuredClone(sample);
    const before = structuredClone(input);
    const snapshot = validateSnapshot(input);
    expect(input).toEqual(before);
    expect(() => validateSnapshot({
      ...sample,
      pages: [{ title: 'A', links: ['missing'], totalArticleLinks: 1 }],
    })).toThrow(/leaves the frozen arena/);
    expect(() => validateSnapshot({
      ...sample,
      pages: [...sample.pages, sample.pages[0]!],
    })).toThrow(/duplicate page/);
    expect(snapshot.pages).toHaveLength(6);
  });

  test('the title-overlap baseline chooses an explicitly visible target', () => {
    expect(titleOverlapPolicy({
      current: 'A',
      target: 'Doom engine',
      links: ['Graph theory', 'Doom engine'],
      path: ['A'],
      remainingClicks: 2,
    })).toBe('Doom engine');
  });

  test('the captured Wikipedia pilot is a nonempty, closed induced subgraph', async () => {
    const file = Bun.file('fixtures/wikiracing/wikipedia-mini-001.json');
    const hash = createHash('sha256').update(await file.bytes()).digest('hex');
    expect(hash).toBe('54ba95b2297106ef5e4b51cc2a83d621f712c8cef04974c66564ed37ba48dda8');
    const raw = (await file.json()) as WikiSnapshot;
    const snapshot = validateSnapshot(raw);
    expect(snapshot.pages.length).toBe(37);
    expect(snapshot.pages.reduce((sum, page) => sum + page.links.length, 0)).toBe(200);
    const tasks = enumerateTasks(snapshot, 2, 4, 6);
    expect(tasks.length).toBe(979);
    const report = runBaselines(snapshot, tasks, 32);
    expect(report.baselines[0]?.successes).toBe(3112);
    expect(report.baselines[1]?.successes).toBe(536);
  });
});
