import {
  addForecast,
  addHypothesis,
  createEpistemicModel,
  observe,
} from '../src/epistemic/index.ts';

let model = createEpistemicModel();

model = addHypothesis(model, {
  id: 'incumbent',
  statement: 'The established transformation path predicts runtime behavior.',
  weight: 0.85,
});
model = addHypothesis(model, {
  id: 'minority-alternative',
  statement: 'A hidden boundary condition controls the observed behavior.',
  weight: 0.15,
});

model = addForecast(model, {
  id: 'incumbent-forecast',
  questionId: 'runtime-outcome',
  hypothesisId: 'incumbent',
  outcomes: { expected: 0.9, discrepant: 0.1 },
  rationale: 'The incumbent expects the familiar path to dominate.',
});
model = addForecast(model, {
  id: 'alternative-forecast',
  questionId: 'runtime-outcome',
  hypothesisId: 'minority-alternative',
  outcomes: { expected: 0.1, discrepant: 0.9 },
  rationale: 'The minority view predicts the boundary condition will appear.',
});

const result = observe(model, {
  id: 'runtime-observation-1',
  questionId: 'runtime-outcome',
  outcome: 'discrepant',
  context: 'Reality favored the initially unlikely alternative.',
});

console.log('Epistemic learning-edge transition');
console.log(
  JSON.stringify(
    {
      prior: model.hypotheses,
      mode: result.transition.toMode,
      posterior: result.transition.posterior,
      questions: result.transition.questions,
      metrics: result.transition.metrics,
      accumulatedSemanticPerplexity: result.model.semanticPerplexity,
    },
    null,
    2
  )
);
