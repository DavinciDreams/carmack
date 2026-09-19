# Epistemic Reference Model

## Purpose

Carmack's epistemic layer is a deterministic reference interpreter for a
reasoner that learns from discrepancies between prediction and reality. It is
not a trained model and it does not decide what is true by confidence alone.
It makes the learning dynamics explicit enough to test, calibrate, and later
compile as a learning procedure.

The central design claim is that learning happens at the boundary between
curiosity and confusion:

- **Curiosity** means the observation was unexpected, but the present model
  still provides enough structure to ask a useful question.
- **Confusion** means the observation was unexpected and none of the current
  hypotheses provides adequate explanatory coverage.
- **Learning edge** means the weighted consensus was surprised while a
  competing hypothesis did predict reality. The discrepancy is therefore both
  consequential and tractable.

The Socratic questioner is not a permanent agent role. It is an interrupt
raised whenever observed surprise crosses a configured discrepancy threshold.

## Typed graph

The reference model records an append-only epistemic graph:

- **Hypothesis** nodes state competing explanations and carry normalized belief
  weights.
- **Forecast** nodes bind a hypothesis to a categorical distribution for a
  named question.
- **Observation** nodes record what occurred and the predictive probability
  assigned to it before beliefs were updated.
- **Question** nodes make the unresolved discrepancy explicit.
- Typed edges record prediction, support, contradiction, and questioning
  relationships.

Observations are evidence receipts. Updating belief weights must not rewrite
what an earlier forecast predicted or what was observed.

## Scoring

For active hypotheses \(h\), normalized belief weights \(w_h\), and forecasts
\(P(o \mid h)\), the model's predictive probability is the mixture

\[
P(o) = \sum_h w_h P(o \mid h).
\]

Observed surprise is measured in nats:

\[
S(o) = -\log(\max(P(o), \epsilon)).
\]

Semantic perplexity accumulates across observations:

\[
\operatorname{PP} = \exp\left(\frac{1}{T}\sum_{t=1}^{T} S(o_t)\right).
\]

This is semantic only relative to the categorical events defined by the
caller. It must not be presented as token perplexity or as a calibrated metric
until the supplied forecasts have themselves been calibrated.

After observing \(o\), hypothesis weights update by likelihood:

\[
w'_h \propto w_h P(o \mid h)^\eta,
\]

where \(\eta\) is the configured learning rate. A probability floor prevents
one observation from making recovery numerically impossible.

## Mode transition

The default thresholds are intentionally interpretable:

| Quantity | Default | Interpretation |
| --- | ---: | --- |
| discrepancy surprise | \(\log 2\) | weighted prediction gave reality less than 50% |
| learning-edge surprise | \(\log 4\) | weighted prediction gave reality less than 25% |
| confusion surprise | \(\log 10\) | weighted prediction gave reality less than 10% |
| explanatory coverage | 0.5 | at least one hypothesis made reality more likely than not |
| forecast disagreement | 0.4 | competing forecasts differ materially |

For an observation, `coverage` is the largest probability assigned to the
observed outcome by a non-dominant hypothesis before the update. This asks the
specific learning-edge question: did an alternative explanation cover what the
weighted incumbent missed? `disagreement` is the range between the largest and
smallest assigned probabilities.

The deterministic transition is:

1. Below discrepancy surprise, enter `steady`.
2. At or above learning-edge surprise, enter `learning-edge` when coverage and
   disagreement are both sufficient.
3. At or above confusion surprise without that structure, enter `confused`.
4. Otherwise, enter `curious`.

Structured surprise takes precedence over confusion: a severe surprise that a
minority hypothesis explained is precisely the high-information learning edge.

## Socratic interrupt

Every discrepant observation produces questions tied to graph objects rather
than a generic request to "think harder." Depending on coverage, the reference
interpreter asks variants of:

- Which assumption caused the prior-leading hypothesis to make reality
  unlikely?
- What distinction explains the disagreement between the prior leader and the
  best explanatory hypothesis?
- What is the smallest observation that would discriminate between them?
- What variable or outcome category is missing if every hypothesis was
  surprised?

Questions are artifacts for experiment selection. Answering them is outside
the deterministic reference interpreter.

## Experimental hypotheses

The reference interpreter exists to make the following claims falsifiable. It
does not yet establish them.

1. **Socratic reevaluation:** after a prediction discrepancy, explicitly asking
   which assumption failed and what experiment would discriminate alternatives
   improves future calibration and semantic perplexity relative to updating
   weights and continuing silently.
2. **Articulation effect:** a matched-budget rubber-duck intervention that only
   restates the forecast, observation, and current explanation may recover part
   or all of the benefit. If it matches the Socratic arm, explicit articulation
   rather than causal questioning is the operative mechanism.
3. **Mode dependence:** Socratic reevaluation should help most at the structured
   learning edge, while silent updating may outperform it for isolated noise
   where additional hypotheses would create needless churn.
4. **Warrant versus credence:** questioning may improve the auditability and
   later stability of a belief even when the immediate numeric posterior is
   identical. A future experiment must therefore measure both belief
   calibration and the provenance supporting that belief.

### Proposed active-control experiment

Replay identical, preregistered evidence streams through three policies:

- `silent`: score the observation, update, and continue;
- `rubber-duck`: use a matched compute budget to articulate the discrepancy
  without deliberately challenging its causal assumptions;
- `socratic`: challenge assumptions, identify alternatives or missing
  variables, and propose a discriminating observation.

The forecast distribution is frozen before the outcome is revealed. All arms
receive the same evidence and perform the same immediate likelihood update.
An intervention may affect only graph artifacts, experiments, and subsequent
forecasts; it cannot rewrite the probability used to score the observation
that triggered it.

Primary measures should include future semantic log loss/perplexity, Brier
score and calibration, adaptation after regime changes, repeated surprise from
the same missing variable, later reopening of settled beliefs, information
gain per unit of compute, and unnecessary graph growth. Evidence streams must
include genuine regime changes, harmless outliers, missing-variable events,
noise, and adversarially misleading surprises.

## Invariants

- Forecast distributions are finite, non-negative, and normalized.
- Identifiers are unique within the graph.
- A forecast references an existing hypothesis.
- An observation references at least one forecast for its question and an
  outcome represented by those forecasts.
- Hypothesis weights remain finite, non-negative, and normalized after each
  observation.
- Inputs are not mutated.
- Evidence records retain the probabilities and mode that existed before the
  update.

## Current reference boundary

Version zero models one complete competing-hypothesis ensemble. Every active
hypothesis must therefore forecast every observed question. This makes the
mixture and posterior unambiguous and prevents a missing forecast from being
mistaken for a zero-probability prediction.

A larger web will need explicitly scoped hypothesis families (or question
nodes that declare their participating hypotheses) before independent domains
can share one model. That extension should preserve the scoring rules here
rather than silently normalizing unrelated hypotheses together.

## Alpha boundary

The reference interpreter deliberately uses plain categorical events and pure
state transitions. A future Alpha package can give the same semantics stronger
types for outcome spaces, quantitative resources, effects, layouts, update
rules, and proof-carrying schedules. The language-neutral contract to preserve
is the sequence:

`weighted forecasts -> observation -> scoring -> mode/question interrupt -> belief update`.

Machine-specific optimization may change its realization, but not those
observable semantics.

## Repository boundary

Carmack is the incubator while the reference semantics and experiment runner
are changing together. Extraction into a dedicated repository becomes the
default once any of these conditions holds:

- a second project consumes the epistemic API without Carmack's transformation
  machinery;
- the control-study runner needs an independent release or data lifecycle;
- Alpha consumes the learning procedure as a separately versioned package; or
- Carmack-specific dependencies begin shaping the language-neutral semantics.

Until then, keeping the implementation here makes the hypothesis executable
against real transformation feedback without prematurely fixing package or
repository ownership.
