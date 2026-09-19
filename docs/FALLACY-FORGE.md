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
or that the taxonomy covers every reasoning defect.

## Run

```text
bun test test/fallacy-forge/atlas-seven-tenets.test.ts
bun run fallacy-forge:demo
```
