export interface WikiPage {
  readonly title: string;
  /** Only links to other pages in this frozen arena are legal moves. */
  readonly links: readonly string[];
  /** All namespace-zero article links seen during capture, before arena filtering. */
  readonly totalArticleLinks: number;
}

export interface WikiSnapshot {
  readonly id: string;
  readonly capturedAt: string;
  readonly source: string;
  readonly pages: readonly WikiPage[];
}

export interface WikiTask {
  readonly id: string;
  readonly start: string;
  readonly target: string;
  readonly maxClicks: number;
  readonly shortestClicks: number;
}

export interface NavigationView {
  readonly current: string;
  readonly target: string;
  readonly links: readonly string[];
  readonly path: readonly string[];
  readonly remainingClicks: number;
}

export type NavigationPolicy = (view: NavigationView) => string | null;

export type RaceTermination = 'target' | 'budget' | 'dead-end' | 'invalid-action' | 'abstain';

export interface RaceResult {
  readonly taskId: string;
  readonly path: readonly string[];
  readonly clicks: number;
  readonly success: boolean;
  readonly termination: RaceTermination;
  readonly shortestClicks: number;
  readonly excessClicks: number | null;
}

export interface BaselineAggregate {
  readonly name: 'uniform-random' | 'title-overlap' | 'shortest-path-oracle';
  readonly runs: number;
  readonly successes: number;
  readonly successRate: number;
  readonly meanClicksOnSuccess: number | null;
  readonly meanExcessClicksOnSuccess: number | null;
  readonly invalidActions: number;
}

export interface BaselineReport {
  readonly snapshotId: string;
  readonly taskCount: number;
  readonly taskDistanceCounts: Readonly<Record<string, number>>;
  readonly randomEpisodesPerTask: number;
  readonly baselines: readonly BaselineAggregate[];
  readonly byShortestDistance: Readonly<Record<string, readonly BaselineAggregate[]>>;
}
