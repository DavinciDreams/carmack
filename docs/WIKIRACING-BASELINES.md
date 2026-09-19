# Frozen Wikiracing baseline protocol

The objective is to measure whether a future agent learns useful relations
while navigating by links, not whether a larger graph merely contains more
nodes. This first increment fixes the action space and establishes non-model
baselines. It does not call Jev, Astra, SPARQL, or Carmack's epistemic agent.

## Arena and task selection

`fixtures/wikiracing/wikipedia-mini-001.json` is a dated capture of the
namespace-zero links returned by the [MediaWiki Links API](https://www.mediawiki.org/wiki/API:Links)
for the 37 article titles in `fixtures/wikiracing/manifest.json`. Only links
between those 37 articles are legal. The capture contains 200 legal directed
links from 16,397 source article links; it is a **curated induced subgraph**,
not the full Wikipedia hyperlink graph. The pilot numbers must not be
generalized to real Wikiracing.

Snapshot SHA-256: `54ba95b2297106ef5e4b51cc2a83d621f712c8cef04974c66564ed37ba48dda8`.

Every ordered start/target pair with a directed shortest-path length of 2–4
becomes a task. There are 979 such tasks (389 at distance 2, 415 at distance 3,
175 at distance 4), all with a six-click budget. This complete selection rule
avoids hand-picking favorable pairs. The shortest distance is computed offline
for stratification and scoring; it is never included in the policy view.

At each click a policy receives only the current title, target title, visible
legal link titles, path so far, and remaining clicks. An invalid or out-of-arena
choice terminates the episode. The full graph is not supplied to policies.

## Baselines and measures

- `uniform-random`: choose uniformly among current links. Each task is run
  with 32 deterministic seeds derived from snapshot ID, task ID, and episode.
- `title-overlap`: choose the unvisited link with most token overlap with
  the target title; ties break alphabetically. It uses no neighboring-page
  contents or hidden graph.
- `shortest-path-oracle`: breadth-first search on the full frozen graph.
  This is an omniscient upper bound, not a legal competing policy.

The primary measure is success within six clicks. The runner also reports
click count and excess clicks **among successes**, invalid actions, and
results by shortest-path stratum; conditional click means alone can reward a
policy that succeeds only on easy tasks. On the
captured pilot, seeded random succeeds on 9.93% of 31,328 episodes; title
overlap on 54.75% of 979 tasks; the oracle on all reachable tasks by
construction. These are deterministic software baselines, not estimates of
model intelligence or population-wide Wikipedia performance.

## Next comparisons, kept separate

1. **Fixed typed menu:** Jev and Astra each choose among the same legal
   outgoing links, with identical state, budget, and success measure. This
   tests the scorer within a supplied decomposition.
2. **Harness effect:** Astra with the same menu versus Astra planning from
   the page state without a supplied question graph. Legal actions and
   end-to-end budgets remain fixed. This tests what decomposition contributes,
   not model parity.
3. **Relational learning:** compare a Carmack-augmented policy with a matched
   stateless policy on held-out targets or subgraphs after training episodes.
   Store proposed relation, evidence provenance, and a frozen prediction
   before feedback; measure future success and predictive log loss, not edge
   count. Include the existing silent, rubber-duck, and Socratic controls.

For any model comparison, record all calls, retries, invalid actions, wall
time, token usage, and cost. Do not use reference-model agreement as the only
correctness label: navigation success is independently checkable here.
Repeated evaluation on the same start/target pairs can become memorization,
so learning experiments need preregistered held-out tasks. Use paired tasks
across policies and cluster uncertainty estimates by start and target page;
the 979 overlapping pairs are not 979 independent samples from Wikipedia.

The blog's Wikiracing rule is navigation through encountered links.
[Wikidata SPARQL](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)
is a separate oracle/tool-access treatment, not a legal move in this pilot.
Wikidata triples are not identical to Wikipedia's directed page-link graph.
The blog also reports lower Wikiracing speedups than its workflow examples
and uses mostly non-reasoning competitor settings; this pilot does not
reproduce that comparison.

## Reproduction

```text
bun run wikiracing:baselines
bun test test/wikiracing/model.test.ts
```

The committed snapshot is the experiment input. `bun run wikiracing:capture`
fetches from the live MediaWiki API but refuses to overwrite an existing
snapshot. To create another, pass a new output path to the capture script;
that is a **new** experiment snapshot, not an in-place baseline refresh.
For example: `bun run scripts/capture-wikiracing.ts fixtures/wikiracing/wikipedia-mini-002.json`.
Never recapture as part of a comparison or continuous integration run. Report
the snapshot ID, capture timestamp, and commit hash with any result.
