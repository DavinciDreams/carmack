import { describe, expect, test } from 'bun:test';

import {
  addForecast,
  addHypothesis,
  createEpistemicModel,
  observe,
  type EpistemicModel,
} from '../../src/epistemic/index.ts';

function hypothesisWeight(model: EpistemicModel, id: string): number {
  const hypothesis = model.hypotheses.find((candidate) => candidate.id === id);
  if (!hypothesis) {
    throw new Error(`Missing hypothesis ${id}`);
  }

  return hypothesis.weight;
}

function expectSocraticQuestion(
  question: EpistemicModel['questions'][number],
  observationId: string,
  questionId: string,
): void {
  expect(question.kind).toBe('socratic-question');
  expect(question.reason).toBe('prediction-discrepancy');
  expect(question.observationId).toBe(observationId);
  expect(question.questionId).toBe(questionId);
}

describe('epistemic model', () => {
  test('an expected outcome remains steady and asks no question', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'normal-operation',
      statement: 'The system is operating normally.',
    });
    model = addForecast(model, {
      id: 'normal-operation-forecast',
      questionId: 'system-state',
      hypothesisId: 'normal-operation',
      outcomes: { nominal: 0.8, degraded: 0.2 },
    });

    const result = observe(model, {
      id: 'nominal-observation',
      questionId: 'system-state',
      outcome: 'nominal',
    });

    expect(result.transition.fromMode).toBe('steady');
    expect(result.transition.toMode).toBe('steady');
    expect(result.model.mode).toBe('steady');
    expect(result.transition.metrics.mixtureProbability).toBeCloseTo(0.8, 12);
    expect(result.transition.metrics.surpriseNats).toBeCloseTo(-Math.log(0.8), 12);
    expect(result.transition.questions).toEqual([]);
    expect(result.model.questions).toEqual([]);
  });

  test('a moderate discrepancy becomes curious and invokes a Socratic why', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'mostly-nominal',
      statement: 'Nominal behavior is somewhat more likely.',
    });
    model = addForecast(model, {
      id: 'mostly-nominal-forecast',
      questionId: 'moderate-result',
      hypothesisId: 'mostly-nominal',
      outcomes: { expected: 0.6, discrepant: 0.4 },
    });

    const result = observe(model, {
      id: 'moderate-discrepancy',
      questionId: 'moderate-result',
      outcome: 'discrepant',
    });

    expect(result.transition.metrics.surpriseNats).toBeGreaterThanOrEqual(Math.log(2));
    expect(result.transition.metrics.surpriseNats).toBeLessThan(Math.log(4));
    expect(result.transition.fromMode).toBe('steady');
    expect(result.transition.toMode).toBe('curious');
    expect(result.model.mode).toBe('curious');
    expect(result.transition.questions).toHaveLength(1);
    expectSocraticQuestion(
      result.transition.questions[0]!,
      'moderate-discrepancy',
      'moderate-result',
    );
    expect(result.transition.questions[0]!.prompt).toMatch(/why|assumption|discrepancy/i);
  });

  test('structured high surprise enters the learning edge and shifts belief to the predictor', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'dominant-explanation',
      statement: 'The established explanation predicts the ordinary outcome.',
      weight: 0.9,
    });
    model = addHypothesis(model, {
      id: 'minority-explanation',
      statement: 'The minority explanation predicts the surprising outcome.',
      weight: 0.1,
    });
    model = addForecast(model, {
      id: 'dominant-forecast',
      questionId: 'contested-outcome',
      hypothesisId: 'dominant-explanation',
      outcomes: { ordinary: 0.95, surprising: 0.05 },
    });
    model = addForecast(model, {
      id: 'minority-forecast',
      questionId: 'contested-outcome',
      hypothesisId: 'minority-explanation',
      outcomes: { ordinary: 0.05, surprising: 0.95 },
    });

    const result = observe(model, {
      id: 'structured-surprise',
      questionId: 'contested-outcome',
      outcome: 'surprising',
    });

    expect(result.transition.metrics.mixtureProbability).toBeCloseTo(0.14, 12);
    expect(result.transition.metrics.coverage).toBeGreaterThanOrEqual(0.5);
    expect(result.transition.metrics.disagreement).toBeGreaterThanOrEqual(0.4);
    expect(result.transition.toMode).toBe('learning-edge');
    expect(result.model.mode).toBe('learning-edge');
    expect(hypothesisWeight(result.model, 'minority-explanation')).toBeGreaterThan(0.1);
    expect(hypothesisWeight(result.model, 'minority-explanation')).toBeGreaterThan(
      hypothesisWeight(result.model, 'dominant-explanation'),
    );
    expect(hypothesisWeight(result.model, 'minority-explanation')).toBeCloseTo(
      (0.1 * 0.95) / 0.14,
      12,
    );
    expect(
      result.model.hypotheses.reduce((sum, hypothesis) => sum + hypothesis.weight, 0),
    ).toBeCloseTo(1, 12);
    const support = result.model.edges.find(
      (edge) =>
        edge.kind === 'observation-supports-hypothesis' &&
        edge.targetId === 'minority-explanation',
    );
    const challenge = result.model.edges.find(
      (edge) =>
        edge.kind === 'observation-challenges-hypothesis' &&
        edge.targetId === 'dominant-explanation',
    );
    expect(support?.weight).toBeCloseTo(0.95, 12);
    expect(challenge?.weight).toBeCloseTo(0.95, 12);
    expectSocraticQuestion(
      result.transition.questions[0]!,
      'structured-surprise',
      'contested-outcome',
    );
    expect(result.transition.questions[0]!.prompt).toMatch(/why|assumption|discrepancy/i);
  });

  test('unmodeled high surprise becomes confused and asks about a missing variable', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'incomplete-model',
      statement: 'The current model does not cover every relevant mechanism.',
    });
    model = addForecast(model, {
      id: 'incomplete-forecast',
      questionId: 'unmodeled-question',
      hypothesisId: 'incomplete-model',
      outcomes: { expected: 0.99, outsideCurrentModel: 0.01 },
    });

    const result = observe(model, {
      id: 'unmodeled-observation',
      questionId: 'unmodeled-question',
      outcome: 'outsideCurrentModel',
    });

    expect(result.transition.metrics.coverage).toBeLessThan(0.5);
    expect(result.transition.metrics.surpriseNats).toBeGreaterThanOrEqual(Math.log(10));
    expect(result.transition.toMode).toBe('confused');
    expect(result.model.mode).toBe('confused');
    expect(result.transition.questions).toHaveLength(1);
    expectSocraticQuestion(
      result.transition.questions[0]!,
      'unmodeled-observation',
      'unmodeled-question',
    );
    expect(result.transition.questions[0]!.prompt).toMatch(/missing|unmodeled|variable/i);
  });

  test('semantic perplexity accumulates as exponentiated mean surprise', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'calibrated-model',
      statement: 'The model assigns explicit probabilities to both questions.',
    });
    model = addForecast(model, {
      id: 'first-forecast',
      questionId: 'first-question',
      hypothesisId: 'calibrated-model',
      outcomes: { observed: 0.5, other: 0.5 },
    });
    model = addForecast(model, {
      id: 'second-forecast',
      questionId: 'second-question',
      hypothesisId: 'calibrated-model',
      outcomes: { observed: 0.25, other: 0.75 },
    });

    const first = observe(model, {
      id: 'first-observation',
      questionId: 'first-question',
      outcome: 'observed',
    });
    const second = observe(first.model, {
      id: 'second-observation',
      questionId: 'second-question',
      outcome: 'observed',
    });
    const expectedPerplexity = Math.exp((-Math.log(0.5) - Math.log(0.25)) / 2);

    expect(first.transition.metrics.semanticPerplexity).toBeCloseTo(2, 12);
    expect(first.model.semanticPerplexity).toBeCloseTo(2, 12);
    expect(second.transition.metrics.semanticPerplexity).toBeCloseTo(expectedPerplexity, 12);
    expect(second.model.semanticPerplexity).toBeCloseTo(expectedPerplexity, 12);
  });

  test('keeps impossible observations finite so later evidence can recover', () => {
    let model = createEpistemicModel();
    model = addHypothesis(model, {
      id: 'first-incomplete-hypothesis',
      statement: 'The impossible outcome cannot occur.',
    });
    model = addHypothesis(model, {
      id: 'second-incomplete-hypothesis',
      statement: 'The impossible outcome also cannot occur for another reason.',
    });
    model = addForecast(model, {
      id: 'first-impossible-forecast',
      questionId: 'impossible-question',
      hypothesisId: 'first-incomplete-hypothesis',
      outcomes: { expected: 1, impossible: 0 },
    });
    model = addForecast(model, {
      id: 'second-impossible-forecast',
      questionId: 'impossible-question',
      hypothesisId: 'second-incomplete-hypothesis',
      outcomes: { expected: 1, impossible: 0 },
    });

    const result = observe(model, {
      id: 'impossible-observation',
      questionId: 'impossible-question',
      outcome: 'impossible',
    });

    expect(result.transition.toMode).toBe('confused');
    expect(result.transition.metrics.mixtureProbability).toBe(model.config.likelihoodFloor);
    expect(Number.isFinite(result.transition.metrics.surpriseNats)).toBe(true);
    expect(Number.isFinite(result.model.semanticPerplexity)).toBe(true);
    expect(
      result.transition.posterior.reduce((sum, entry) => sum + entry.posteriorWeight, 0),
    ).toBeCloseTo(1, 12);
  });

  test('rejects invalid distributions and duplicate graph node IDs', () => {
    const withHypothesis = addHypothesis(createEpistemicModel(), {
      id: 'unique-hypothesis',
      statement: 'A unique hypothesis.',
    });

    expect(() =>
      addForecast(withHypothesis, {
        id: 'not-normalized',
        questionId: 'validation-question',
        hypothesisId: 'unique-hypothesis',
        outcomes: { yes: 0.8, no: 0.3 },
      }),
    ).toThrow();
    expect(() =>
      addForecast(withHypothesis, {
        id: 'negative-probability',
        questionId: 'validation-question',
        hypothesisId: 'unique-hypothesis',
        outcomes: { yes: -0.1, no: 1.1 },
      }),
    ).toThrow();
    expect(() =>
      addForecast(withHypothesis, {
        id: 'non-finite-probability',
        questionId: 'validation-question',
        hypothesisId: 'unique-hypothesis',
        outcomes: { yes: Number.NaN, no: Number.NaN },
      }),
    ).toThrow();
    expect(() =>
      addHypothesis(withHypothesis, {
        id: 'unique-hypothesis',
        statement: 'A duplicate hypothesis.',
      }),
    ).toThrow();

    const withForecast = addForecast(withHypothesis, {
      id: 'unique-forecast',
      questionId: 'validation-question',
      hypothesisId: 'unique-hypothesis',
      outcomes: { yes: 0.5, no: 0.5 },
    });
    expect(() =>
      addForecast(withForecast, {
        id: 'unique-forecast',
        questionId: 'another-question',
        hypothesisId: 'unique-hypothesis',
        outcomes: { yes: 0.5, no: 0.5 },
      }),
    ).toThrow();

    const observed = observe(withForecast, {
      id: 'unique-observation',
      questionId: 'validation-question',
      outcome: 'yes',
    });
    expect(() =>
      observe(observed.model, {
        id: 'unique-observation',
        questionId: 'validation-question',
        outcome: 'no',
      }),
    ).toThrow();
  });

  test('all updates are immutable and do not mutate caller-owned inputs', () => {
    const initial = createEpistemicModel();
    const hypothesisInput = {
      id: 'immutable-hypothesis',
      statement: 'Every operation returns a new value.',
      weight: 1,
    };
    const hypothesisInputBefore = structuredClone(hypothesisInput);
    const withHypothesis = addHypothesis(initial, hypothesisInput);

    expect(initial.hypotheses).toEqual([]);
    expect(hypothesisInput).toEqual(hypothesisInputBefore);

    const forecastInput = {
      id: 'immutable-forecast',
      questionId: 'immutability-question',
      hypothesisId: 'immutable-hypothesis',
      outcomes: { expected: 0.75, unexpected: 0.25 },
      rationale: 'The distribution belongs to the caller.',
    };
    const forecastInputBefore = structuredClone(forecastInput);
    const withForecast = addForecast(withHypothesis, forecastInput);

    expect(withHypothesis.forecasts).toEqual([]);
    expect(forecastInput).toEqual(forecastInputBefore);

    const observationInput = {
      id: 'immutable-observation',
      questionId: 'immutability-question',
      outcome: 'unexpected',
      context: 'caller-owned nested context',
    };
    const observationInputBefore = structuredClone(observationInput);
    const modelBeforeObservation = structuredClone(withForecast);
    const result = observe(withForecast, observationInput);

    expect(withForecast).toEqual(modelBeforeObservation);
    expect(withForecast.observations).toEqual([]);
    expect(withForecast.questions).toEqual([]);
    expect(observationInput).toEqual(observationInputBefore);
    expect(result.model).not.toBe(withForecast);
    expect(result.model.observations).toHaveLength(1);
  });
});
