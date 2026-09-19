import type {
  ChallengeProtocol,
  ClaimNode,
  EvidenceReceipt,
  ForgeSpecimen,
  InferenceEdge,
  SourceLocator,
} from '../../src/fallacy-forge/index.ts';

const article: SourceLocator = {
  uri: 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
  title: 'Introducing System One Models & Jev',
  accessedAt: '2026-09-18',
};

const workflowEvals: SourceLocator = {
  uri: 'https://evals.typesafe.ai/',
  title: 'TypeSafe workflow evals methodology',
  accessedAt: '2026-09-18',
};

const confidenceDocs: SourceLocator = {
  uri: 'https://docs.typesafe.ai/confidence',
  title: 'TypeSafe confidence documentation',
  accessedAt: '2026-09-18',
};

const choiceDocs: SourceLocator = {
  uri: 'https://docs.typesafe.ai/primitives/choice',
  title: 'TypeSafe Choice documentation',
  accessedAt: '2026-09-18',
};

const schemaChallenge: ChallengeProtocol = {
  steelman:
    'A closed output vocabulary prevents out-of-set strings and removes one important class of integration failures.',
  repair:
    'Jev is constrained to valid output shapes; a valid choice can still be unsupported by the input or wrong.',
  falsifier:
    'Submit adversarial but well-formed inputs and check whether in-schema choices contradict independently verified facts.',
};

const referenceChallenge: ChallengeProtocol = {
  steelman:
    'Agreement with strong external models is a useful proxy when adjudicated outcomes are costly to obtain.',
  repair:
    'Report agreement with the named reference models; separately evaluate task correctness on independently adjudicated cases.',
  falsifier:
    'Blind human or outcome-based adjudication yields materially different rankings from reference-model agreement.',
};

const calibrationChallenge: ChallengeProtocol = {
  steelman:
    'A probability distribution provides more information than a bare label and enables risk-aware routing.',
  repair:
    'Show reliability diagrams, proper scores, and subgroup checks on held-out independently labeled outcomes.',
  falsifier:
    'Among cases assigned 0.9 probability, the predicted event occurs far from 90% of the time or drifts by subgroup.',
};

const typeGuaranteeChallenge: ChallengeProtocol = {
  steelman:
    'If the decoder can only construct members of a declared answer type, an out-of-type model choice is excluded by construction.',
  repair:
    'Define a type error as an answer outside the declared response schema, name the successful-call boundary, and state the decoder and serialization assumptions under which the invariant holds.',
  falsifier:
    'For an end-to-end API guarantee, exhibit a successful response that fails validation against the exact request schema; for a decoder theorem, identify a violated assumption or an invalid construction path.',
};

type Style = ForgeSpecimen['variant'];

const wording: Record<string, Record<Style, string>> = {
  schemaContract: {
    'source-shaped': 'Jev returns values from a structure and option set defined in advance.',
    neutral: 'The response domain is fixed by a declared schema and set of options.',
    repaired: 'The response domain is fixed by a declared schema and set of options.',
  },
  noHallucinations: {
    'source-shaped': 'Giving up string generation means Jev cannot hallucinate.',
    neutral: 'Constrained output shape prevents semantically unsupported model decisions.',
    repaired:
      'The closed output contract prevents out-of-set response values, not incorrect in-set decisions.',
  },
  referenceConsensus: {
    'source-shaped':
      'Workflow answers are compared with the average of two expensive frontier models.',
    neutral: 'The published workflow reference is consensus between two external models.',
    repaired: 'The published workflow reference is consensus between two external models.',
  },
  intelligenceAccuracy: {
    'source-shaped': 'Jev reaches comparable intelligence on these workflows.',
    neutral: 'Agreement with the two-model reference establishes comparable task correctness.',
    repaired:
      'The study measures agreement with the two-model reference, not independent task correctness.',
  },
  confidenceConcentration: {
    'source-shaped': 'The reported confidence is computed from the shape of output probabilities.',
    neutral: 'Confidence is a concentration statistic over the returned distribution.',
    repaired: 'Confidence is a concentration statistic over the returned distribution.',
  },
  calibratedUncertainty: {
    'source-shaped': 'The model communicates calibrated uncertainty with each decision.',
    neutral: 'High reported confidence tracks the actual frequency of correct decisions.',
    repaired:
      'Whether reported probabilities are calibrated remains an empirical question for held-out outcomes.',
  },
  noTypeErrors: {
    'source-shaped':
      'No type errors are possible; one counterexample would falsify this, but it is mathematically impossible.',
    neutral:
      'For every relevant call, an output violating the expected type is impossible by construction.',
    repaired:
      'Conditional on a correct decoder and serializer, successful responses contain only values admitted by the declared output schema.',
  },
  closedChoice: {
    'source-shaped': 'A Choice result selects one option from the declared set.',
    neutral: 'Choice responses use a fixed answer vocabulary.',
    repaired: 'Choice responses use a fixed answer vocabulary.',
  },
  parallelQuestions: {
    'source-shaped': 'Independent typed questions are evaluated in one API request.',
    neutral: 'The API supports several independently evaluated questions per call.',
    repaired: 'The API supports several independently evaluated questions per call.',
  },
  scopedLatency: {
    'source-shaped':
      'The company reports low response latency on its published System One workflows.',
    neutral: 'A low latency is reported for the particular tested workflow configuration.',
    repaired: 'A low latency is reported for the particular tested workflow configuration.',
  },
};

function claim(
  id: string,
  style: Style,
  claimKind: ClaimNode['claimKind'],
  quantifier: ClaimNode['quantifier']
): ClaimNode {
  const statement = wording[id]?.[style];
  if (statement === undefined) throw new Error(`missing ${style} wording for ${id}`);
  return {
    kind: 'claim',
    id,
    statement,
    claimKind,
    quantifier,
    source: article,
  };
}

function makeSpecimen(style: Style): ForgeSpecimen {
  const repaired = style === 'repaired';
  const claims: readonly ClaimNode[] = [
    claim('schemaContract', style, 'descriptive', 'one'),
    claim('noHallucinations', style, 'descriptive', repaired ? 'some' : 'all'),
    claim('referenceConsensus', style, 'descriptive', 'one'),
    claim('intelligenceAccuracy', style, 'descriptive', 'unspecified'),
    claim('confidenceConcentration', style, 'descriptive', 'one'),
    claim('calibratedUncertainty', style, 'descriptive', 'unspecified'),
    {
      ...claim('noTypeErrors', style, 'descriptive', 'all'),
      ...(repaired
        ? {}
        : {
            ambiguities: [
              {
                term: 'type error',
                senses: [
                  'an out-of-schema model value',
                  'a malformed successful API response',
                  'a semantically wrong but in-schema decision',
                ],
              },
              {
                term: 'mathematically impossible',
                senses: [
                  'excluded by a decoder codomain invariant under stated assumptions',
                  'an unconditional guarantee over all end-to-end service behavior',
                ],
              },
            ],
            challenge: typeGuaranteeChallenge,
          }),
    },
    claim('closedChoice', style, 'descriptive', 'one'),
    claim('parallelQuestions', style, 'descriptive', 'one'),
    claim('scopedLatency', style, 'descriptive', 'one'),
  ];

  const evidence: readonly EvidenceReceipt[] = [
    {
      kind: 'evidence',
      id: 'closed-choice-docs',
      claimId: 'schemaContract',
      stance: 'supports',
      evidenceKind: 'source',
      summary:
        'Choice responses select from declared options and expose a probability distribution.',
      source: choiceDocs,
    },
    {
      kind: 'evidence',
      id: 'consensus-method',
      claimId: 'referenceConsensus',
      stance: 'supports',
      evidenceKind: 'design-audit',
      summary: 'The evaluation site names the mean of two external models as its reference labels.',
      source: workflowEvals,
    },
    {
      kind: 'evidence',
      id: 'confidence-definition',
      claimId: 'confidenceConcentration',
      stance: 'supports',
      evidenceKind: 'source',
      summary: 'Confidence is calculated from how concentrated the predicted distribution is.',
      source: confidenceDocs,
    },
    {
      kind: 'evidence',
      id: 'type-guarantee-wording',
      claimId: 'noTypeErrors',
      stance: 'context',
      evidenceKind: 'source',
      summary:
        'The article calls a type-error counterexample mathematically impossible and later says its zero figure is guaranteed schema matching rather than an empirical observation.',
      source: article,
    },
  ];

  const inferences: readonly InferenceEdge[] = [
    {
      kind: 'inference',
      id: 'schema-to-truth',
      premiseIds: ['schemaContract'],
      conclusionId: 'noHallucinations',
      warrant: {
        kind: 'mechanistic',
        statement: 'Closed output types limit representable answers.',
      },
      evidenceIds: ['closed-choice-docs'],
      constructBridge: {
        measured: 'schema-validity',
        inferred: repaired ? 'schema-validity' : 'semantic-correctness',
      },
      challenge: schemaChallenge,
    },
    {
      kind: 'inference',
      id: 'consensus-to-correctness',
      premiseIds: ['referenceConsensus'],
      conclusionId: 'intelligenceAccuracy',
      warrant: {
        kind: 'empirical',
        statement: 'Reference-model agreement is the reported evaluation target.',
      },
      evidenceIds: ['consensus-method'],
      constructBridge: {
        measured: 'model-consensus',
        inferred: repaired ? 'model-consensus' : 'real-world-accuracy',
      },
      challenge: referenceChallenge,
    },
    {
      kind: 'inference',
      id: 'sharpness-to-calibration',
      premiseIds: ['confidenceConcentration'],
      conclusionId: 'calibratedUncertainty',
      warrant: {
        kind: 'empirical',
        statement:
          'The inspected confidence documentation establishes a concentration statistic, not an outcome reliability test.',
      },
      evidenceIds: ['confidence-definition'],
      constructBridge: {
        measured: 'distribution-concentration',
        inferred: repaired ? 'distribution-concentration' : 'empirical-calibration',
      },
      challenge: calibrationChallenge,
    },
  ];

  return {
    id: `typesafe-jev-002:${style}`,
    title: `TypeSafe Jev announcement — ${style} variant`,
    variant: style,
    source: article,
    claims,
    evidence,
    inferences,
    studyDesigns: [],
    hardNegativeClaimIds: ['closedChoice', 'parallelQuestions', 'scopedLatency'],
    expectedFindings: repaired
      ? []
      : [
          { targetId: 'schema-to-truth', defectKind: 'schema-semantics-conflation' },
          { targetId: 'consensus-to-correctness', defectKind: 'reference-standard-substitution' },
          { targetId: 'sharpness-to-calibration', defectKind: 'calibration-evidence-gap' },
          { targetId: 'noTypeErrors', defectKind: 'scope-ambiguity' },
        ],
  };
}

export const typeSafeJevSourceShaped = makeSpecimen('source-shaped');
export const typeSafeJevNeutral = makeSpecimen('neutral');
export const typeSafeJevRepaired = makeSpecimen('repaired');

export const typeSafeJevFixture = {
  id: 'typesafe-jev-002',
  variants: [typeSafeJevSourceShaped, typeSafeJevNeutral, typeSafeJevRepaired],
} as const;
