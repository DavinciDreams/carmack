export type EpistemicMode = 'steady' | 'curious' | 'learning-edge' | 'confused';

export interface EpistemicConfig {
  readonly learningRate?: number;
  readonly discrepancyThresholdNats?: number;
  readonly learningEdgeThresholdNats?: number;
  readonly confusionThresholdNats?: number;
  readonly coverageThreshold?: number;
  readonly disagreementThreshold?: number;
  readonly probabilityTolerance?: number;
  readonly likelihoodFloor?: number;
}

export interface ResolvedEpistemicConfig {
  readonly learningRate: number;
  readonly discrepancyThresholdNats: number;
  readonly learningEdgeThresholdNats: number;
  readonly confusionThresholdNats: number;
  readonly coverageThreshold: number;
  readonly disagreementThreshold: number;
  readonly probabilityTolerance: number;
  readonly likelihoodFloor: number;
}

export interface HypothesisInput {
  readonly id: string;
  readonly statement: string;
  readonly weight?: number;
}

export interface ForecastInput {
  readonly id: string;
  readonly questionId: string;
  readonly hypothesisId: string;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly rationale?: string;
}

export interface ObservationInput {
  readonly id: string;
  readonly questionId: string;
  readonly outcome: string;
  readonly context?: string;
}

export interface HypothesisNode {
  readonly kind: 'hypothesis';
  readonly id: string;
  readonly statement: string;
  readonly weight: number;
}

export interface ForecastNode {
  readonly kind: 'forecast';
  readonly id: string;
  readonly questionId: string;
  readonly hypothesisId: string;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly rationale?: string;
}

export interface ObservationNode {
  readonly kind: 'observation';
  readonly id: string;
  readonly questionId: string;
  readonly outcome: string;
  readonly context?: string;
  readonly mixtureProbability: number;
  readonly surpriseNats: number;
  readonly mode: EpistemicMode;
}

export interface SocraticQuestionNode {
  readonly kind: 'socratic-question';
  readonly id: string;
  readonly observationId: string;
  readonly questionId: string;
  readonly prompt: string;
  readonly surpriseNats: number;
  readonly mode: EpistemicMode;
  readonly reason: 'prediction-discrepancy';
}

export type EpistemicNode = HypothesisNode | ForecastNode | ObservationNode | SocraticQuestionNode;

export type EpistemicEdgeKind =
  | 'hypothesis-forecasts'
  | 'forecast-predicts-observation'
  | 'observation-prompts-question'
  | 'question-challenges-forecast'
  | 'observation-supports-hypothesis'
  | 'observation-challenges-hypothesis';

export interface EpistemicEdge {
  readonly id: string;
  readonly kind: EpistemicEdgeKind;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
}

export interface EpistemicModel {
  readonly config: ResolvedEpistemicConfig;
  readonly mode: EpistemicMode;
  readonly semanticPerplexity: number;
  readonly hypotheses: readonly HypothesisNode[];
  readonly forecasts: readonly ForecastNode[];
  readonly observations: readonly ObservationNode[];
  readonly questions: readonly SocraticQuestionNode[];
  readonly nodes: readonly EpistemicNode[];
  readonly edges: readonly EpistemicEdge[];
}

export interface PosteriorEntry {
  readonly hypothesisId: string;
  readonly priorWeight: number;
  readonly likelihood: number;
  readonly posteriorWeight: number;
}

export interface TransitionMetrics {
  readonly mixtureProbability: number;
  readonly surpriseNats: number;
  readonly semanticPerplexity: number;
  readonly coverage: number;
  readonly disagreement: number;
}

export interface EpistemicTransition {
  readonly fromMode: EpistemicMode;
  readonly toMode: EpistemicMode;
  readonly observationId: string;
  readonly questionId: string;
  readonly metrics: TransitionMetrics;
  readonly posterior: readonly PosteriorEntry[];
  readonly questions: readonly SocraticQuestionNode[];
}

export interface ObservationResult {
  readonly model: EpistemicModel;
  readonly transition: EpistemicTransition;
}
