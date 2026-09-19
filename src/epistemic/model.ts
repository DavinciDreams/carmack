import type {
  EpistemicConfig,
  EpistemicEdge,
  EpistemicMode,
  EpistemicModel,
  EpistemicNode,
  ForecastInput,
  ForecastNode,
  HypothesisInput,
  HypothesisNode,
  ObservationInput,
  ObservationNode,
  ObservationResult,
  PosteriorEntry,
  ResolvedEpistemicConfig,
  SocraticQuestionNode,
} from './types';

const DEFAULT_CONFIG: ResolvedEpistemicConfig = Object.freeze({
  learningRate: 1,
  discrepancyThresholdNats: Math.log(2),
  learningEdgeThresholdNats: Math.log(4),
  confusionThresholdNats: Math.log(10),
  coverageThreshold: 0.5,
  disagreementThreshold: 0.4,
  probabilityTolerance: 1e-9,
  likelihoodFloor: 1e-12,
});

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

function assertUnitInterval(value: number, name: string): void {
  assertFinite(value, name);
  if (value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function resolveConfig(config: EpistemicConfig): ResolvedEpistemicConfig {
  const resolved = {
    learningRate: config.learningRate ?? DEFAULT_CONFIG.learningRate,
    discrepancyThresholdNats:
      config.discrepancyThresholdNats ?? DEFAULT_CONFIG.discrepancyThresholdNats,
    learningEdgeThresholdNats:
      config.learningEdgeThresholdNats ?? DEFAULT_CONFIG.learningEdgeThresholdNats,
    confusionThresholdNats: config.confusionThresholdNats ?? DEFAULT_CONFIG.confusionThresholdNats,
    coverageThreshold: config.coverageThreshold ?? DEFAULT_CONFIG.coverageThreshold,
    disagreementThreshold: config.disagreementThreshold ?? DEFAULT_CONFIG.disagreementThreshold,
    probabilityTolerance: config.probabilityTolerance ?? DEFAULT_CONFIG.probabilityTolerance,
    likelihoodFloor: config.likelihoodFloor ?? DEFAULT_CONFIG.likelihoodFloor,
  };

  assertFinite(resolved.learningRate, 'learningRate');
  if (resolved.learningRate <= 0) {
    throw new Error('learningRate must be greater than zero');
  }

  for (const [name, value] of [
    ['discrepancyThresholdNats', resolved.discrepancyThresholdNats],
    ['learningEdgeThresholdNats', resolved.learningEdgeThresholdNats],
    ['confusionThresholdNats', resolved.confusionThresholdNats],
  ] as const) {
    assertFinite(value, name);
    if (value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
  }

  if (
    resolved.discrepancyThresholdNats > resolved.learningEdgeThresholdNats ||
    resolved.learningEdgeThresholdNats > resolved.confusionThresholdNats
  ) {
    throw new Error('surprise thresholds must satisfy discrepancy <= learning-edge <= confusion');
  }

  assertUnitInterval(resolved.coverageThreshold, 'coverageThreshold');
  assertUnitInterval(resolved.disagreementThreshold, 'disagreementThreshold');
  assertFinite(resolved.probabilityTolerance, 'probabilityTolerance');
  if (resolved.probabilityTolerance <= 0 || resolved.probabilityTolerance >= 1) {
    throw new Error('probabilityTolerance must be greater than zero and less than one');
  }
  assertFinite(resolved.likelihoodFloor, 'likelihoodFloor');
  if (resolved.likelihoodFloor <= 0 || resolved.likelihoodFloor >= 1) {
    throw new Error('likelihoodFloor must be greater than zero and less than one');
  }

  return Object.freeze(resolved);
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function assembleModel(parts: {
  readonly config: ResolvedEpistemicConfig;
  readonly mode: EpistemicMode;
  readonly semanticPerplexity: number;
  readonly hypotheses: readonly HypothesisNode[];
  readonly forecasts: readonly ForecastNode[];
  readonly observations: readonly ObservationNode[];
  readonly questions: readonly SocraticQuestionNode[];
  readonly edges: readonly EpistemicEdge[];
}): EpistemicModel {
  const hypotheses = freezeArray(parts.hypotheses);
  const forecasts = freezeArray(parts.forecasts);
  const observations = freezeArray(parts.observations);
  const questions = freezeArray(parts.questions);
  const nodes: readonly EpistemicNode[] = freezeArray([
    ...hypotheses,
    ...forecasts,
    ...observations,
    ...questions,
  ]);

  return Object.freeze({
    config: parts.config,
    mode: parts.mode,
    semanticPerplexity: parts.semanticPerplexity,
    hypotheses,
    forecasts,
    observations,
    questions,
    nodes,
    edges: freezeArray(parts.edges),
  });
}

function assertUniqueNodeId(model: EpistemicModel, id: string): void {
  assertNonEmpty(id, 'id');
  if (model.nodes.some((node) => node.id === id)) {
    throw new Error(`epistemic node id "${id}" already exists`);
  }
}

function sortedOutcomeKeys(outcomes: Readonly<Record<string, number>>): readonly string[] {
  return Object.keys(outcomes).sort();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateDistribution(
  outcomes: Readonly<Record<string, number>>,
  tolerance: number
): Readonly<Record<string, number>> {
  const keys = Object.keys(outcomes);
  if (keys.length === 0) {
    throw new Error('forecast outcomes must contain at least one outcome');
  }

  let total = 0;
  const copy: Record<string, number> = {};
  for (const key of keys) {
    assertNonEmpty(key, 'outcome id');
    const probability = outcomes[key];
    if (probability === undefined) {
      throw new Error(`outcome "${key}" has no probability`);
    }
    assertUnitInterval(probability, `probability for outcome "${key}"`);
    total += probability;
    copy[key] = probability;
  }

  if (Math.abs(total - 1) > tolerance) {
    throw new Error(`forecast probabilities must sum to 1 (received ${total})`);
  }

  return Object.freeze(copy);
}

function edge(
  id: string,
  kind: EpistemicEdge['kind'],
  sourceId: string,
  targetId: string,
  weight = 1
): EpistemicEdge {
  return Object.freeze({ id, kind, sourceId, targetId, weight });
}

export function createEpistemicModel(config: EpistemicConfig = {}): EpistemicModel {
  return assembleModel({
    config: resolveConfig(config),
    mode: 'steady',
    semanticPerplexity: 1,
    hypotheses: [],
    forecasts: [],
    observations: [],
    questions: [],
    edges: [],
  });
}

export function addHypothesis(model: EpistemicModel, input: HypothesisInput): EpistemicModel {
  assertUniqueNodeId(model, input.id);
  assertNonEmpty(input.statement, 'statement');
  const weight = input.weight ?? 1;
  assertFinite(weight, 'hypothesis weight');
  if (weight <= 0) {
    throw new Error('hypothesis weight must be greater than zero');
  }

  const hypothesis: HypothesisNode = Object.freeze({
    kind: 'hypothesis',
    id: input.id,
    statement: input.statement,
    weight,
  });

  return assembleModel({
    ...model,
    hypotheses: [...model.hypotheses, hypothesis],
  });
}

export function addForecast(model: EpistemicModel, input: ForecastInput): EpistemicModel {
  assertUniqueNodeId(model, input.id);
  assertNonEmpty(input.questionId, 'questionId');
  assertNonEmpty(input.hypothesisId, 'hypothesisId');
  if (input.rationale !== undefined) {
    assertNonEmpty(input.rationale, 'rationale');
  }

  const hypothesis = model.hypotheses.find(({ id }) => id === input.hypothesisId);
  if (hypothesis === undefined) {
    throw new Error(`unknown hypothesis "${input.hypothesisId}"`);
  }
  if (
    model.forecasts.some(
      (forecast) =>
        forecast.questionId === input.questionId && forecast.hypothesisId === input.hypothesisId
    )
  ) {
    throw new Error(
      `hypothesis "${input.hypothesisId}" already forecasts question "${input.questionId}"`
    );
  }

  const outcomes = validateDistribution(input.outcomes, model.config.probabilityTolerance);
  const group = model.forecasts.filter(({ questionId }) => questionId === input.questionId);
  if (group.length > 0) {
    const expected = sortedOutcomeKeys(group[0]?.outcomes ?? {});
    const received = sortedOutcomeKeys(outcomes);
    if (!sameStrings(expected, received)) {
      throw new Error(
        `all forecasts for question "${input.questionId}" must use the same outcome ids`
      );
    }
  }

  const forecast: ForecastNode = Object.freeze({
    kind: 'forecast',
    id: input.id,
    questionId: input.questionId,
    hypothesisId: input.hypothesisId,
    outcomes,
    ...(input.rationale === undefined ? {} : { rationale: input.rationale }),
  });

  return assembleModel({
    ...model,
    forecasts: [...model.forecasts, forecast],
    edges: [
      ...model.edges,
      edge(
        `edge:hypothesis:${hypothesis.id}:forecast:${forecast.id}`,
        'hypothesis-forecasts',
        hypothesis.id,
        forecast.id
      ),
    ],
  });
}

function probabilityFor(forecast: ForecastNode, outcome: string): number {
  const probability = forecast.outcomes[outcome];
  if (probability === undefined) {
    throw new Error(
      `outcome "${outcome}" is not in forecast group for question "${forecast.questionId}"`
    );
  }
  return probability;
}

function semanticPerplexity(observations: readonly ObservationNode[]): number {
  if (observations.length === 0) {
    return 1;
  }
  const totalSurprise = observations.reduce(
    (sum, observation) => sum + observation.surpriseNats,
    0
  );
  return Math.exp(totalSurprise / observations.length);
}

function chooseMode(
  config: ResolvedEpistemicConfig,
  surprise: number,
  structured: boolean
): EpistemicMode {
  if (surprise < config.discrepancyThresholdNats) {
    return 'steady';
  }
  if (surprise < config.learningEdgeThresholdNats) {
    return 'curious';
  }
  if (structured) {
    return 'learning-edge';
  }
  if (surprise >= config.confusionThresholdNats) {
    return 'confused';
  }
  return 'curious';
}

function makeSocraticQuestion(
  observation: ObservationInput,
  mixtureProbability: number,
  surpriseNats: number,
  mode: EpistemicMode
): SocraticQuestionNode {
  return Object.freeze({
    kind: 'socratic-question',
    id: `socratic:${observation.id}`,
    observationId: observation.id,
    questionId: observation.questionId,
    prompt:
      `Why was outcome "${observation.outcome}" observed for "${observation.questionId}" ` +
      `when the model assigned it ${(mixtureProbability * 100).toFixed(2)}% probability? ` +
      'Which assumption or missing variable explains this discrepancy?',
    surpriseNats,
    mode,
    reason: 'prediction-discrepancy',
  });
}

export function observe(model: EpistemicModel, input: ObservationInput): ObservationResult {
  assertUniqueNodeId(model, input.id);
  assertNonEmpty(input.questionId, 'questionId');
  assertNonEmpty(input.outcome, 'outcome');
  if (input.context !== undefined) {
    assertNonEmpty(input.context, 'context');
  }

  const forecasts = model.forecasts.filter(({ questionId }) => questionId === input.questionId);
  if (forecasts.length === 0) {
    throw new Error(`question "${input.questionId}" has no forecasts`);
  }
  if (forecasts.length !== model.hypotheses.length) {
    const forecastHypotheses = new Set(forecasts.map(({ hypothesisId }) => hypothesisId));
    const missing = model.hypotheses
      .filter(({ id }) => !forecastHypotheses.has(id))
      .map(({ id }) => id);
    throw new Error(
      `forecast group for question "${input.questionId}" is incomplete; missing hypotheses: ${missing.join(', ')}`
    );
  }

  const weighted = forecasts.map((forecast) => {
    const hypothesis = model.hypotheses.find(({ id }) => id === forecast.hypothesisId);
    if (hypothesis === undefined) {
      throw new Error(`forecast "${forecast.id}" refers to an unknown hypothesis`);
    }
    return {
      forecast,
      hypothesis,
      likelihood: probabilityFor(forecast, input.outcome),
    };
  });

  const priorMass = weighted.reduce((sum, item) => sum + item.hypothesis.weight, 0);
  const rawEvidenceMass = weighted.reduce(
    (sum, item) => sum + item.hypothesis.weight * item.likelihood,
    0
  );
  const mixtureProbability = Math.max(rawEvidenceMass / priorMass, model.config.likelihoodFloor);
  const surpriseNats = -Math.log(mixtureProbability);

  const dominant = weighted.reduce((best, item) =>
    item.hypothesis.weight > best.hypothesis.weight ? item : best
  );
  const alternatives = weighted.filter(
    ({ hypothesis }) => hypothesis.id !== dominant.hypothesis.id
  );
  const coverage = alternatives.reduce((maximum, item) => Math.max(maximum, item.likelihood), 0);
  const likelihoods = weighted.map(({ likelihood }) => likelihood);
  const disagreement = Math.max(...likelihoods) - Math.min(...likelihoods);
  const structured =
    coverage >= model.config.coverageThreshold &&
    disagreement >= model.config.disagreementThreshold;
  const nextMode = chooseMode(model.config, surpriseNats, structured);

  const unscaledPosterior = weighted.map((item) => ({
    ...item,
    effectiveLikelihood: Math.max(item.likelihood, model.config.likelihoodFloor),
    value:
      item.hypothesis.weight *
      Math.max(item.likelihood, model.config.likelihoodFloor) ** model.config.learningRate,
  }));
  const unscaledMass = unscaledPosterior.reduce((sum, item) => sum + item.value, 0);
  const posterior: readonly PosteriorEntry[] = freezeArray(
    unscaledPosterior.map((item) => {
      const posteriorWeight =
        unscaledMass === 0 ? item.hypothesis.weight / priorMass : item.value / unscaledMass;
      return Object.freeze({
        hypothesisId: item.hypothesis.id,
        priorWeight: item.hypothesis.weight,
        likelihood: item.effectiveLikelihood,
        posteriorWeight,
      });
    })
  );
  const posteriorById = new Map(
    posterior.map((entry) => [entry.hypothesisId, entry.posteriorWeight] as const)
  );
  const hypotheses = model.hypotheses.map((hypothesis) => {
    const weight = posteriorById.get(hypothesis.id);
    return weight === undefined ? hypothesis : Object.freeze({ ...hypothesis, weight });
  });

  const observation: ObservationNode = Object.freeze({
    kind: 'observation',
    id: input.id,
    questionId: input.questionId,
    outcome: input.outcome,
    ...(input.context === undefined ? {} : { context: input.context }),
    mixtureProbability,
    surpriseNats,
    mode: nextMode,
  });

  const generatedQuestions: readonly SocraticQuestionNode[] =
    surpriseNats >= model.config.discrepancyThresholdNats
      ? freezeArray([makeSocraticQuestion(input, mixtureProbability, surpriseNats, nextMode)])
      : freezeArray([]);
  for (const question of generatedQuestions) {
    assertUniqueNodeId(model, question.id);
  }
  const observations = [...model.observations, observation];
  const nextPerplexity = semanticPerplexity(observations);

  const predictionEdges = forecasts.map((forecast) =>
    edge(
      `edge:forecast:${forecast.id}:observation:${observation.id}`,
      'forecast-predicts-observation',
      forecast.id,
      observation.id
    )
  );
  const evidenceEdges = weighted.map((item) => {
    const supports = item.likelihood >= 0.5;
    return edge(
      `edge:observation:${observation.id}:${supports ? 'supports' : 'challenges'}:hypothesis:${item.hypothesis.id}`,
      supports ? 'observation-supports-hypothesis' : 'observation-challenges-hypothesis',
      observation.id,
      item.hypothesis.id,
      supports ? item.likelihood : 1 - item.likelihood
    );
  });
  const questionEdges = generatedQuestions.flatMap((question) => [
    edge(
      `edge:observation:${observation.id}:question:${question.id}`,
      'observation-prompts-question',
      observation.id,
      question.id
    ),
    ...forecasts.map((forecast) =>
      edge(
        `edge:question:${question.id}:forecast:${forecast.id}`,
        'question-challenges-forecast',
        question.id,
        forecast.id
      )
    ),
  ]);

  const nextModel = assembleModel({
    ...model,
    mode: nextMode,
    semanticPerplexity: nextPerplexity,
    hypotheses,
    observations,
    questions: [...model.questions, ...generatedQuestions],
    edges: [...model.edges, ...predictionEdges, ...evidenceEdges, ...questionEdges],
  });

  return Object.freeze({
    model: nextModel,
    transition: Object.freeze({
      fromMode: model.mode,
      toMode: nextMode,
      observationId: observation.id,
      questionId: observation.questionId,
      metrics: Object.freeze({
        mixtureProbability,
        surpriseNats,
        semanticPerplexity: nextPerplexity,
        coverage,
        disagreement,
      }),
      posterior,
      questions: generatedQuestions,
    }),
  });
}
