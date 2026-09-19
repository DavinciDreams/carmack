export type ClaimKind =
  | 'descriptive'
  | 'causal'
  | 'comparative'
  | 'normative'
  | 'priority'
  | 'mechanistic'
  | 'metaphorical';

export type ClaimQuantifier = 'one' | 'some' | 'most' | 'all' | 'unspecified';

export type WarrantKind =
  | 'empirical'
  | 'mechanistic'
  | 'analogy'
  | 'metaphor'
  | 'definition'
  | 'normative';

export type EvidenceKind =
  | 'measurement'
  | 'source'
  | 'counterexample'
  | 'metadata'
  | 'design-audit';

export type EvidenceStance = 'supports' | 'challenges' | 'context';

export type DefectFamily =
  | 'logical-fallacy'
  | 'factual-tension'
  | 'evidence-gap'
  | 'measurement-defect'
  | 'ambiguity'
  | 'rhetorical-bridge';

export type DefectKind =
  | 'category-shift'
  | 'overgeneralization'
  | 'priority-conflict'
  | 'unsupported-comparison'
  | 'selection-bias'
  | 'asymmetric-verification'
  | 'scope-ambiguity'
  | 'metaphor-as-mechanism';

export type Severity = 'low' | 'medium' | 'high';

export interface SourceLocator {
  readonly uri: string;
  readonly title: string;
  readonly section?: string;
  readonly accessedAt?: string;
}

export interface AmbiguityCue {
  readonly term: string;
  readonly senses: readonly string[];
}

export interface ClaimNode {
  readonly kind: 'claim';
  readonly id: string;
  readonly statement: string;
  readonly claimKind: ClaimKind;
  readonly quantifier: ClaimQuantifier;
  readonly source?: SourceLocator;
  readonly subjectOriginAt?: string;
  readonly ambiguities?: readonly AmbiguityCue[];
  readonly challenge?: ChallengeProtocol;
}

export interface EvidenceReceipt {
  readonly kind: 'evidence';
  readonly id: string;
  readonly claimId: string;
  readonly stance: EvidenceStance;
  readonly evidenceKind: EvidenceKind;
  readonly summary: string;
  readonly source: SourceLocator;
  readonly eventAt?: string;
}

export interface Warrant {
  readonly kind: WarrantKind;
  readonly statement: string;
}

export interface ChallengeProtocol {
  readonly steelman: string;
  readonly repair: string;
  readonly falsifier: string;
}

export interface InferenceEdge {
  readonly kind: 'inference';
  readonly id: string;
  readonly premiseIds: readonly string[];
  readonly conclusionId: string;
  readonly warrant?: Warrant;
  readonly evidenceIds: readonly string[];
  readonly challenge?: ChallengeProtocol;
}

export interface StudyArm {
  readonly id: string;
  readonly description: string;
}

export interface StudyDesignNode {
  readonly kind: 'study-design';
  readonly id: string;
  readonly claimId: string;
  readonly arms: readonly StudyArm[];
  readonly assignment: 'randomized' | 'self-selected' | 'policy-selected' | 'unspecified';
  readonly sameTask: boolean;
  readonly symmetricCriteria: boolean;
  readonly completeDenominator: boolean;
  readonly independentReview: boolean;
  readonly challenge: ChallengeProtocol;
}

export interface ForgeExpectation {
  readonly targetId: string;
  readonly defectKind: DefectKind;
}

export interface ForgeSpecimen {
  readonly id: string;
  readonly title: string;
  readonly variant: 'source-shaped' | 'neutral' | 'repaired';
  readonly source: SourceLocator;
  readonly claims: readonly ClaimNode[];
  readonly evidence: readonly EvidenceReceipt[];
  readonly inferences: readonly InferenceEdge[];
  readonly studyDesigns: readonly StudyDesignNode[];
  readonly hardNegativeClaimIds: readonly string[];
  readonly expectedFindings: readonly ForgeExpectation[];
}

export interface ForgeFinding {
  readonly id: string;
  readonly ruleId: string;
  readonly targetId: string;
  readonly claimIds: readonly string[];
  readonly family: DefectFamily;
  readonly defectKind: DefectKind;
  readonly severity: Severity;
  readonly confidence: number;
  readonly explanation: string;
  readonly evidenceIds: readonly string[];
  readonly steelman: string;
  readonly repair: string;
  readonly falsifier: string;
}

export interface ForgeScore {
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly precision: number;
  readonly recall: number;
  readonly hardNegativeAccuracy: number;
}

export interface ForgeRun {
  readonly specimenId: string;
  readonly variant: ForgeSpecimen['variant'];
  readonly findings: readonly ForgeFinding[];
  readonly hardNegativeViolations: readonly string[];
  readonly score: ForgeScore;
}
