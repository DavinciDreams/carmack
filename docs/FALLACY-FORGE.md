# Fallacy Forge reference evaluator

Fallacy Forge is a deterministic stress tester for typed claim graphs. It does not decide that
unfamiliar, forceful, or false prose is automatically fallacious. It keeps six failure families
separate:

1. logical fallacy;
2. factual tension;
3. evidence gap;
4. measurement defect;
5. ambiguity; and
6. a rhetorical bridge presented as a mechanism.

Version zero begins after claim extraction. A human or future extractor supplies claim nodes,
inference edges, warrants, evidence receipts, and study designs. The evaluator validates those
objects, applies visible deterministic rules, and returns the smallest defective edge together with
a steelman, a minimally repaired claim, and a falsifying observation.

## First fixture: `atlas-seven-tenets-001`

The first specimen models the Atlas Inference essay
[Seven Tenets Powering Atlas Inference Accelerated Workloads](https://blog.atlasinference.io/posts/seven-tenets-powering-atlas-inference).
It stores paraphrases and source locators rather than reproducing the article.

The gold fixture exercises:

- an ambiguous foundational term;
- a broad community-value claim challenged by a counterexample;
- a value preference used to establish an empirical monorepo outcome;
- an uncontrolled build-time comparison;
- a priority claim challenged by dated earlier work;
- metaphor used as an engineering mechanism;
- selection bias in the proposed AI-versus-human authorship dataset; and
- asymmetric verification of human and AI contribution arms.

Three hard-negative claims must remain unflagged: hardware/model specialization, change-sensitive
benchmark gates, and separating business logic from I/O. They prevent the evaluator from receiving
credit for indiscriminate hostility.

## Second fixture: `typesafe-jev-002`

The second specimen models TypeSafe AI's
[Jev announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev), with evidence
from its [workflow-evaluation methodology](https://evals.typesafe.ai/),
[Choice documentation](https://docs.typesafe.ai/primitives/choice), and
[confidence documentation](https://docs.typesafe.ai/confidence). It focuses on three construct
bridges and one unscoped guarantee:

- closed schema validity does not establish semantic correctness or eliminate wrong in-schema
  decisions;
- agreement with two reference models measures agreement, not independently adjudicated task
  correctness; and
- a concentration-derived confidence value does not, by itself, establish empirical probability
  calibration.
- "mathematically impossible" type errors requires a defined error predicate, a scope (model
  choice or complete API response), and the assumptions under which a decoder/schema invariant
  holds. A single invalid successful response would refute an end-to-end zero-error claim; it
  would not refute a correctly stated conditional theorem whose assumptions that response violated.

The third is an **evidence gap**, not a finding that Jev is miscalibrated. Reliability against held-out
outcomes would settle it. The site explicitly describes its reference labels as model consensus,
and the blog acknowledges that some demo and workflow choices favor Jev. The fixture does not
presume intentional deception or that the reported latency and price are false.

Hard negatives include closed-choice output validity, parallel question evaluation, and a narrowly
scoped report of low latency in the company's own tests. As with the Atlas fixture, promotional and
neutral paraphrases must agree, and the repaired claims must be accepted.

## Presentation controls

The fixture has three forms:

- `source-shaped`: forceful paraphrases preserving the article's inferential structure;
- `neutral`: emotionally neutral wording with the same graph; and
- `repaired`: narrowed claims, symmetric study design, and explicit evidence requirements.

Source-shaped and neutral forms must produce the same finding signatures. The repaired form must
produce no findings. These are controls for tone sensitivity and contrarianism.

## Falsifiable hypotheses

1. A structure-bound evaluator will give identical results to rhetorical and neutral paraphrases
   when their claim graph is identical.
2. It will accept a repaired graph rather than preserving accusations after the defective bridges
   are removed.
3. It will classify dated counterevidence as factual tension and missing controlled measurements as
   evidence gaps, not mislabel either as a logical fallacy.
4. It will preserve the three hard negatives, giving a measurable false-positive control.

Passing this fixture establishes only deterministic behavior on the checked graph. It does not show
that an automatic extractor can recover that graph from prose, that the evidence receipts are true,
or that the taxonomy covers every reasoning defect. Fixture precision and recall compare the rules
with fixture-authored expectations; they are internal consistency checks, not an independently
validated real-world accuracy score.

## Run

```text
bun test test/fallacy-forge/atlas-seven-tenets.test.ts
bun test test/fallacy-forge/typesafe-jev.test.ts
bun run fallacy-forge:demo
bun run fallacy-forge:jev
```
