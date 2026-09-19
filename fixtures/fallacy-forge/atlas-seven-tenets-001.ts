import type {
  ChallengeProtocol,
  ClaimNode,
  EvidenceReceipt,
  ForgeSpecimen,
  InferenceEdge,
  SourceLocator,
  StudyDesignNode,
} from '../../src/fallacy-forge/index.ts';

const article: SourceLocator = {
  uri: 'https://blog.atlasinference.io/posts/seven-tenets-powering-atlas-inference',
  title: 'Seven Tenets Powering Atlas Inference Accelerated Workloads',
  accessedAt: '2026-09-18',
};

const kernelBench: SourceLocator = {
  uri: 'https://github.com/ScalingIntelligence/KernelBench',
  title: 'KernelBench: Can LLMs Write Efficient GPU Kernels?',
  accessedAt: '2026-09-18',
};

const gpuKernelScientist: SourceLocator = {
  uri: 'https://arxiv.org/abs/2506.20807',
  title: 'GPU Kernel Scientist: An LLM-Driven Framework for Iterative Kernel Optimization',
  accessedAt: '2026-09-18',
};

const atlasMetadata: SourceLocator = {
  uri: 'https://api.github.com/repos/Avarok-Cybersecurity/atlas',
  title: 'Atlas repository metadata',
  accessedAt: '2026-09-18',
};

const atlasContributing: SourceLocator = {
  uri: 'https://github.com/Avarok-Cybersecurity/atlas/blob/main/CONTRIBUTING.md',
  title: 'Contributing to Atlas',
  accessedAt: '2026-09-18',
};

const buildChallenge: ChallengeProtocol = {
  steelman:
    "For the author's development target, Atlas may provide a materially shorter edit-build-measure loop.",
  repair:
    'On named hardware, commits, cache states, and equivalent build targets, Atlas built in X while vLLM built in Y.',
  falsifier:
    'A preregistered clean and incremental build matrix finds no stable advantage under equivalent targets.',
};

const priorityChallenge: ChallengeProtocol = {
  steelman:
    'Atlas may have independently operationalized a distinctive repository-integrated optimization loop.',
  repair:
    'Atlas independently implemented its named loop by 2026; earlier related systems existed and differ in specified ways.',
  falsifier:
    'A dated prior system exhibits every feature claimed as the narrower Atlas contribution.',
};

const monorepoChallenge: ChallengeProtocol = {
  steelman:
    'A monorepo can reduce cross-repository coordination for changes that fit inside its boundary.',
  repair:
    'For a specified class of changes, this monorepo reduced measured integration latency relative to the prior layout.',
  falsifier:
    'Matched agent tasks show equal or worse completion time, correctness, or review load in the monorepo.',
};

const metaphorChallenge: ChallengeProtocol = {
  steelman:
    "Explicit architectural constraints can reduce an agent's search space enough to improve useful output.",
  repair:
    'The named constraints improved task success by a measured amount while preserving specified capabilities.',
  falsifier:
    'An ablation removing the constraints matches or improves success without increasing failures.',
};

const authorshipChallenge: ChallengeProtocol = {
  steelman: 'Documented human interventions can reveal cases where current AI tooling needed help.',
  repair:
    'Randomly assign matched tasks to human-only, AI-only, and collaborative arms under identical hidden evaluation.',
  falsifier:
    'Symmetric evaluation finds the intervention records do not predict comparative human advantage.',
};

const foundationChallenge: ChallengeProtocol = {
  steelman:
    'Philosophical commitments can influence which formal questions practitioners consider meaningful.',
  repair:
    'Define philosophy as explicit framing commitments and name the limited sense in which they influence each field.',
  falsifier:
    'The proposed influence disappears when the named framing commitments are varied while the formal work is held fixed.',
};

const communityChallenge: ChallengeProtocol = {
  steelman: 'An active community can multiply feedback, maintenance, adoption, and contribution.',
  repair:
    'Some projects gain additional external value when a community makes contribution and feedback easier.',
  falsifier:
    'Matched projects without contributor communities produce equal or greater external use and maintenance outcomes.',
};

type TextStyle = 'source-shaped' | 'neutral' | 'repaired';

const statements: Record<string, Record<TextStyle, string>> = {
  foundation: {
    'source-shaped':
      'Philosophy is the deepest layer of abstract reasoning and underpins logic, mathematics, and science.',
    neutral:
      'Philosophical commitments influence how practitioners frame questions in logic, mathematics, and science.',
    repaired:
      'Here philosophy means explicit pre-empirical framing assumptions, not a causal layer beneath formal logic.',
  },
  community: {
    'source-shaped':
      'Projects without communities are pet projects that provide little or no value outside their authors.',
    neutral: 'Most projects without an active community provide little external value.',
    repaired:
      'Some projects gain additional external value when a community makes contribution and feedback easier.',
  },
  monorepoPreference: {
    'source-shaped': 'Agent-oriented repositories should keep the relevant system in one monorepo.',
    neutral: 'A monorepo is preferred for the proposed agent workflow.',
    repaired: 'A monorepo is one candidate layout for the proposed agent workflow.',
  },
  monorepoOutcome: {
    'source-shaped':
      'Because agents have long contexts, a monorepo removes downstream coordination and produces faster iteration.',
    neutral:
      'The monorepo and long-context agents cause lower integration latency than a multi-repository layout.',
    repaired:
      'Monorepo and multi-repository layouts should be compared on matched agent tasks and integration outcomes.',
  },
  buildObservation: {
    'source-shaped': 'The author observed a short Atlas build and a much longer vLLM build.',
    neutral: 'Two build durations were observed in an unspecified local development context.',
    repaired:
      'Clean and incremental build durations should be measured under a declared matched protocol.',
  },
  buildSuperiority: {
    'source-shaped': 'Atlas offers a much faster development loop than vLLM.',
    neutral: 'Atlas has lower build latency than vLLM under comparable conditions.',
    repaired: 'A matched build matrix can test whether Atlas has lower build latency.',
  },
  atlasIteration: {
    'source-shaped': 'Atlas used AI to improve accelerator kernels through iterative feedback.',
    neutral: 'Atlas implemented an iterative AI kernel-optimization loop.',
    repaired: 'Atlas independently implemented a repository-integrated optimization loop in 2026.',
  },
  priority: {
    'source-shaped':
      'Academic research caught up months after Atlas reached iterative AI kernel optimization.',
    neutral: 'Atlas preceded academic work on iterative AI kernel optimization.',
    repaired:
      'Related academic systems existed earlier, while Atlas later operationalized its own variant.',
  },
  aiGap: {
    'source-shaped':
      'Requiring humans to defend hand-written code measures the remaining gaps between humans and AI.',
    neutral: 'Authorship declarations estimate comparative human and AI coding capability.',
    repaired:
      'A randomized matched-task study can estimate comparative human, AI, and collaborative capability.',
  },
  restrictions: {
    'source-shaped': 'Architectural boundaries keep coding agents on the intended track.',
    neutral: 'Explicit constraints reduce the agent search space.',
    repaired: 'Explicit constraints are hypothesized to reduce the agent search space.',
  },
  restrictionOutcome: {
    'source-shaped': 'The closed loop produces more capability than its restrictions remove.',
    neutral: 'Architectural restrictions causally increase useful agent output.',
    repaired:
      'Constraint ablations can test whether useful task output increases without unacceptable capability loss.',
  },
  hardwareSpecialization: {
    'source-shaped': 'Kernels can be specialized for a hardware, model, and quantization tuple.',
    neutral: 'Hardware-model-specific kernels can exploit target-specific properties.',
    repaired: 'Hardware-model-specific kernels can exploit target-specific properties.',
  },
  benchmarkGates: {
    'source-shaped':
      'Kernel changes trigger commit-bound benchmark gates selected from changed code.',
    neutral:
      'The repository maps changed kernel categories to commit-bound benchmark requirements.',
    repaired:
      'The repository maps changed kernel categories to commit-bound benchmark requirements.',
  },
  sbio: {
    'source-shaped': 'Separating business logic from I/O improves substitution and testability.',
    neutral: 'An I/O boundary can make pure business behavior easier to test with substitutes.',
    repaired: 'An I/O boundary can make pure business behavior easier to test with substitutes.',
  },
};

function claim(
  id: string,
  style: TextStyle,
  claimKind: ClaimNode['claimKind'],
  quantifier: ClaimNode['quantifier'],
  extras: Pick<ClaimNode, 'ambiguities' | 'challenge' | 'subjectOriginAt'> = {}
): ClaimNode {
  const statement = statements[id]?.[style];
  if (statement === undefined) throw new Error(`missing ${style} statement for ${id}`);
  return {
    kind: 'claim',
    id,
    statement,
    claimKind,
    quantifier,
    source: article,
    ...extras,
  };
}

function baseClaims(style: TextStyle): readonly ClaimNode[] {
  const repaired = style === 'repaired';
  return [
    claim(
      'foundation',
      style,
      'descriptive',
      'all',
      repaired
        ? { challenge: foundationChallenge }
        : {
            challenge: foundationChallenge,
            ambiguities: [
              {
                term: 'underpins',
                senses: ['historically influences', 'logically grounds', 'causally produces'],
              },
            ],
          }
    ),
    claim('community', style, 'descriptive', repaired ? 'some' : 'most', {
      challenge: communityChallenge,
    }),
    claim('monorepoPreference', style, 'normative', 'unspecified'),
    claim('monorepoOutcome', style, repaired ? 'comparative' : 'causal', 'unspecified'),
    claim('buildObservation', style, 'descriptive', 'one'),
    claim('buildSuperiority', style, repaired ? 'descriptive' : 'comparative', 'unspecified'),
    claim('atlasIteration', style, 'descriptive', 'one'),
    claim(
      'priority',
      style,
      repaired ? 'descriptive' : 'priority',
      'unspecified',
      repaired ? {} : { subjectOriginAt: '2026-05-05' }
    ),
    claim('aiGap', style, repaired ? 'comparative' : 'causal', 'unspecified'),
    claim('restrictions', style, repaired ? 'descriptive' : 'metaphorical', 'unspecified'),
    claim('restrictionOutcome', style, repaired ? 'descriptive' : 'causal', 'unspecified'),
    claim('hardwareSpecialization', style, 'mechanistic', 'some'),
    claim('benchmarkGates', style, 'descriptive', 'one'),
    claim('sbio', style, 'mechanistic', 'some'),
  ];
}

function baseEvidence(): readonly EvidenceReceipt[] {
  const evidence: EvidenceReceipt[] = [
    {
      kind: 'evidence',
      id: 'pet-project-counterexample',
      claimId: 'community',
      stance: 'challenges',
      evidenceKind: 'counterexample',
      summary:
        'A project can deliver external value through use, study, or reuse without an active contributor community.',
      source: article,
    },
    {
      kind: 'evidence',
      id: 'kernelbench-2025',
      claimId: 'priority',
      stance: 'challenges',
      evidenceKind: 'source',
      summary: 'KernelBench publicly evaluated LLM-generated accelerator kernels in 2025.',
      source: kernelBench,
      eventAt: '2025-02-14',
    },
    {
      kind: 'evidence',
      id: 'gpu-kernel-scientist-2025',
      claimId: 'priority',
      stance: 'challenges',
      evidenceKind: 'source',
      summary:
        'GPU Kernel Scientist described iterative optimization using external timing feedback in 2025.',
      source: gpuKernelScientist,
      eventAt: '2025-06-25',
    },
    {
      kind: 'evidence',
      id: 'atlas-created-2026',
      claimId: 'priority',
      stance: 'context',
      evidenceKind: 'metadata',
      summary: 'Public repository metadata reports creation on 2026-05-05.',
      source: atlasMetadata,
      eventAt: '2026-05-05',
    },
    {
      kind: 'evidence',
      id: 'atlas-benchmark-contract',
      claimId: 'benchmarkGates',
      stance: 'supports',
      evidenceKind: 'source',
      summary:
        'The contribution guide documents commit-bound records, invalidation rules, and change-sensitive gates.',
      source: atlasContributing,
    },
  ];
  return evidence;
}

function baseInferences(repaired: boolean): readonly InferenceEdge[] {
  if (repaired) {
    return [
      {
        kind: 'inference',
        id: 'build-comparison',
        premiseIds: ['buildObservation'],
        conclusionId: 'buildSuperiority',
        warrant: {
          kind: 'empirical',
          statement:
            'A proposed matrix would compare equivalent clean and incremental build targets.',
        },
        evidenceIds: [],
        challenge: buildChallenge,
      },
      {
        kind: 'inference',
        id: 'restriction-benefit',
        premiseIds: ['restrictions'],
        conclusionId: 'restrictionOutcome',
        warrant: {
          kind: 'empirical',
          statement: 'Constraint ablations measure task success and retained capability.',
        },
        evidenceIds: [],
        challenge: metaphorChallenge,
      },
    ];
  }
  return [
    {
      kind: 'inference',
      id: 'monorepo-agent-speed',
      premiseIds: ['monorepoPreference'],
      conclusionId: 'monorepoOutcome',
      warrant: {
        kind: 'normative',
        statement: 'Keeping code together is preferable for agents with long contexts.',
      },
      evidenceIds: [],
      challenge: monorepoChallenge,
    },
    {
      kind: 'inference',
      id: 'build-comparison',
      premiseIds: ['buildObservation'],
      conclusionId: 'buildSuperiority',
      warrant: {
        kind: 'empirical',
        statement: 'The two observed durations are treated as representative and equivalent.',
      },
      evidenceIds: [],
      challenge: buildChallenge,
    },
    {
      kind: 'inference',
      id: 'academic-priority',
      premiseIds: ['atlasIteration'],
      conclusionId: 'priority',
      warrant: {
        kind: 'empirical',
        statement: "Publication chronology is inferred from the author's recollection.",
      },
      evidenceIds: ['kernelbench-2025', 'gpu-kernel-scientist-2025', 'atlas-created-2026'],
      challenge: priorityChallenge,
    },
    {
      kind: 'inference',
      id: 'restriction-benefit',
      premiseIds: ['restrictions'],
      conclusionId: 'restrictionOutcome',
      warrant: {
        kind: 'metaphor',
        statement:
          'Rails keep a train aligned and a closed loop produces more than restriction removes.',
      },
      evidenceIds: [],
      challenge: metaphorChallenge,
    },
  ];
}

function authorshipDesign(repaired: boolean): StudyDesignNode {
  return {
    kind: 'study-design',
    id: 'authorship-gap-study',
    claimId: 'aiGap',
    arms: [
      { id: 'ai-authored', description: 'AI-authored code is accepted as the default.' },
      { id: 'human-authored', description: 'Human-authored code is declared and defended.' },
      { id: 'collaborative', description: 'Human and AI contributions are jointly measured.' },
    ],
    assignment: repaired ? 'randomized' : 'policy-selected',
    sameTask: repaired,
    symmetricCriteria: repaired,
    completeDenominator: repaired,
    independentReview: repaired,
    challenge: authorshipChallenge,
  };
}

function makeSpecimen(style: TextStyle): ForgeSpecimen {
  const repaired = style === 'repaired';
  return {
    id: `atlas-seven-tenets-001:${style}`,
    title: `Atlas Seven Tenets — ${style} variant`,
    variant: style,
    source: article,
    claims: baseClaims(style),
    evidence: baseEvidence(),
    inferences: baseInferences(repaired),
    studyDesigns: [authorshipDesign(repaired)],
    hardNegativeClaimIds: ['hardwareSpecialization', 'benchmarkGates', 'sbio'],
    expectedFindings: repaired
      ? []
      : [
          { targetId: 'foundation', defectKind: 'scope-ambiguity' },
          { targetId: 'community', defectKind: 'overgeneralization' },
          { targetId: 'monorepo-agent-speed', defectKind: 'category-shift' },
          { targetId: 'build-comparison', defectKind: 'unsupported-comparison' },
          { targetId: 'academic-priority', defectKind: 'priority-conflict' },
          { targetId: 'restriction-benefit', defectKind: 'metaphor-as-mechanism' },
          { targetId: 'authorship-gap-study', defectKind: 'selection-bias' },
          { targetId: 'authorship-gap-study', defectKind: 'asymmetric-verification' },
        ],
  };
}

export const atlasSevenTenetsSourceShaped = makeSpecimen('source-shaped');
export const atlasSevenTenetsNeutral = makeSpecimen('neutral');
export const atlasSevenTenetsRepaired = makeSpecimen('repaired');

export const atlasSevenTenetsFixture = {
  id: 'atlas-seven-tenets-001',
  variants: [atlasSevenTenetsSourceShaped, atlasSevenTenetsNeutral, atlasSevenTenetsRepaired],
} as const;
