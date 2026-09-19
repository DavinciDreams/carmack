import type {
  BaselineAggregate,
  BaselineReport,
  NavigationPolicy,
  NavigationView,
  RaceResult,
  WikiPage,
  WikiSnapshot,
  WikiTask,
} from './types';

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
}

export function validateSnapshot(input: WikiSnapshot): WikiSnapshot {
  const snapshot = structuredClone(input);
  assertNonEmpty(snapshot.id, 'snapshot id');
  assertNonEmpty(snapshot.source, 'snapshot source');
  if (Number.isNaN(Date.parse(snapshot.capturedAt))) {
    throw new Error('capturedAt must be an ISO-compatible date');
  }
  if (snapshot.pages.length === 0) throw new Error('snapshot must contain pages');
  const titles = new Set<string>();
  for (const page of snapshot.pages) {
    assertNonEmpty(page.title, 'page title');
    if (titles.has(page.title)) throw new Error(`duplicate page "${page.title}"`);
    titles.add(page.title);
  }
  for (const page of snapshot.pages) {
    if (!Number.isInteger(page.totalArticleLinks) || page.totalArticleLinks < page.links.length) {
      throw new Error(`invalid totalArticleLinks for "${page.title}"`);
    }
    const links = new Set<string>();
    for (const link of page.links) {
      if (!titles.has(link)) throw new Error(`link "${link}" leaves the frozen arena`);
      if (links.has(link)) throw new Error(`duplicate link "${link}" on "${page.title}"`);
      links.add(link);
    }
    Object.freeze(page.links);
    Object.freeze(page);
  }
  Object.freeze(snapshot.pages);
  return Object.freeze(snapshot);
}

function pageMap(snapshot: WikiSnapshot): ReadonlyMap<string, WikiPage> {
  return new Map(snapshot.pages.map((page) => [page.title, page] as const));
}

export function shortestPath(
  snapshot: WikiSnapshot,
  start: string,
  target: string
): readonly string[] | null {
  const pages = pageMap(snapshot);
  if (!pages.has(start) || !pages.has(target))
    throw new Error('start and target must be in snapshot');
  if (start === target) return [start];
  const queue = [start];
  const parents = new Map<string, string | null>([[start, null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) break;
    for (const link of pages.get(current)?.links ?? []) {
      if (parents.has(link)) continue;
      parents.set(link, current);
      if (link === target) {
        const path = [target];
        let parent: string | null = current;
        while (parent !== null) {
          path.push(parent);
          parent = parents.get(parent) ?? null;
        }
        return path.reverse();
      }
      queue.push(link);
    }
  }
  return null;
}

/** Every eligible ordered pair is retained, avoiding hand-picked start/goal wins. */
export function enumerateTasks(
  snapshot: WikiSnapshot,
  minDistance = 2,
  maxDistance = 4,
  maxClicks = 6
): readonly WikiTask[] {
  if (
    !Number.isInteger(minDistance) ||
    minDistance < 1 ||
    !Number.isInteger(maxDistance) ||
    maxDistance < minDistance ||
    !Number.isInteger(maxClicks) ||
    maxClicks < maxDistance
  ) {
    throw new Error('invalid task selection bounds');
  }
  const titles = snapshot.pages.map(({ title }) => title).sort();
  const tasks: WikiTask[] = [];
  for (const start of titles) {
    for (const target of titles) {
      if (start === target) continue;
      const path = shortestPath(snapshot, start, target);
      if (path === null) continue;
      const distance = path.length - 1;
      if (distance < minDistance || distance > maxDistance) continue;
      tasks.push(
        Object.freeze({
          id: `${start} -> ${target}`,
          start,
          target,
          maxClicks,
          shortestClicks: distance,
        })
      );
    }
  }
  return Object.freeze(tasks);
}

export function runRace(
  snapshot: WikiSnapshot,
  task: WikiTask,
  policy: NavigationPolicy
): RaceResult {
  const pages = pageMap(snapshot);
  if (!pages.has(task.start) || !pages.has(task.target)) {
    throw new Error('task start and target must be in snapshot');
  }
  if (!Number.isInteger(task.maxClicks) || task.maxClicks < 0) {
    throw new Error('task maxClicks must be a non-negative integer');
  }
  const shortest = shortestPath(snapshot, task.start, task.target);
  if (shortest === null || shortest.length - 1 !== task.shortestClicks) {
    throw new Error('task shortestClicks does not match snapshot');
  }
  const path = [task.start];
  let termination: RaceResult['termination'] = 'budget';
  while (path.length - 1 < task.maxClicks) {
    const current = path[path.length - 1];
    if (current === task.target) {
      termination = 'target';
      break;
    }
    const links = pages.get(current ?? '')?.links ?? [];
    if (links.length === 0) {
      termination = 'dead-end';
      break;
    }
    const view: NavigationView = Object.freeze({
      current: current ?? '',
      target: task.target,
      links: Object.freeze([...links]),
      path: Object.freeze([...path]),
      remainingClicks: task.maxClicks - path.length + 1,
    });
    const next = policy(view);
    if (next === null) {
      termination = 'abstain';
      break;
    }
    if (!links.includes(next)) {
      termination = 'invalid-action';
      break;
    }
    path.push(next);
  }
  if (path[path.length - 1] === task.target) termination = 'target';
  const clicks = path.length - 1;
  const success = termination === 'target';
  return Object.freeze({
    taskId: task.id,
    path: Object.freeze(path),
    clicks,
    success,
    termination,
    shortestClicks: task.shortestClicks,
    excessClicks: success ? clicks - task.shortestClicks : null,
  });
}

function titleTokens(title: string): ReadonlySet<string> {
  return new Set(title.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/** Uses only the current page's legal link titles, never hidden adjacency. */
export const titleOverlapPolicy: NavigationPolicy = (view) => {
  const targetTokens = titleTokens(view.target);
  const unvisited = view.links.filter((link) => !view.path.includes(link));
  const choices = unvisited.length > 0 ? unvisited : view.links;
  return (
    [...choices].sort((left, right) => {
      const score = (title: string) =>
        [...titleTokens(title)].filter((token) => targetTokens.has(token)).length;
      return score(right) - score(left) || left.localeCompare(right);
    })[0] ?? null
  );
};

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  }
  return result >>> 0;
}

export function uniformRandomPolicy(seed: number): NavigationPolicy {
  let state = seed || 1;
  return (view) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const index = (state >>> 0) % view.links.length;
    return view.links[index] ?? null;
  };
}

function aggregate(
  name: BaselineAggregate['name'],
  results: readonly RaceResult[]
): BaselineAggregate {
  const wins = results.filter(({ success }) => success);
  const mean = (values: readonly number[]) =>
    values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
  return Object.freeze({
    name,
    runs: results.length,
    successes: wins.length,
    successRate: results.length === 0 ? 0 : wins.length / results.length,
    meanClicksOnSuccess: mean(wins.map(({ clicks }) => clicks)),
    meanExcessClicksOnSuccess: mean(wins.map(({ excessClicks }) => excessClicks ?? 0)),
    invalidActions: results.filter(({ termination }) => termination === 'invalid-action').length,
  });
}

export function runBaselines(
  snapshot: WikiSnapshot,
  tasks: readonly WikiTask[],
  randomEpisodesPerTask = 32
): BaselineReport {
  if (!Number.isInteger(randomEpisodesPerTask) || randomEpisodesPerTask < 1) {
    throw new Error('randomEpisodesPerTask must be a positive integer');
  }
  if (tasks.length === 0) throw new Error('baseline report requires at least one task');
  const random: RaceResult[] = [];
  const overlap: RaceResult[] = [];
  const oracle: RaceResult[] = [];
  const distances: Record<string, number> = {};
  const byDistance = new Map<
    string,
    {
      random: RaceResult[];
      overlap: RaceResult[];
      oracle: RaceResult[];
    }
  >();
  for (const task of tasks) {
    const key = String(task.shortestClicks);
    distances[key] = (distances[key] ?? 0) + 1;
    const group = byDistance.get(key) ?? { random: [], overlap: [], oracle: [] };
    byDistance.set(key, group);
    const overlapResult = runRace(snapshot, task, titleOverlapPolicy);
    overlap.push(overlapResult);
    group.overlap.push(overlapResult);
    const oraclePath = shortestPath(snapshot, task.start, task.target);
    if (oraclePath === null) throw new Error('task has no oracle path');
    const oracleResult: RaceResult = Object.freeze({
      taskId: task.id,
      path: oraclePath,
      clicks: task.shortestClicks,
      success: task.shortestClicks <= task.maxClicks,
      termination: task.shortestClicks <= task.maxClicks ? 'target' : 'budget',
      shortestClicks: task.shortestClicks,
      excessClicks: task.shortestClicks <= task.maxClicks ? 0 : null,
    });
    oracle.push(oracleResult);
    group.oracle.push(oracleResult);
    for (let episode = 0; episode < randomEpisodesPerTask; episode += 1) {
      const result = runRace(
        snapshot,
        task,
        uniformRandomPolicy(hash(`${snapshot.id}|${task.id}|${episode}`))
      );
      random.push(result);
      group.random.push(result);
    }
  }
  const byShortestDistance = Object.fromEntries(
    [...byDistance.entries()]
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([key, group]) => [
        key,
        Object.freeze([
          aggregate('uniform-random', group.random),
          aggregate('title-overlap', group.overlap),
          aggregate('shortest-path-oracle', group.oracle),
        ]),
      ])
  );
  return Object.freeze({
    snapshotId: snapshot.id,
    taskCount: tasks.length,
    taskDistanceCounts: Object.freeze(distances),
    randomEpisodesPerTask,
    baselines: Object.freeze([
      aggregate('uniform-random', random),
      aggregate('title-overlap', overlap),
      aggregate('shortest-path-oracle', oracle),
    ]),
    byShortestDistance: Object.freeze(byShortestDistance),
  });
}
