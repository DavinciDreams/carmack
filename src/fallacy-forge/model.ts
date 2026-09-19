import type {
  ChallengeProtocol,
  ClaimNode,
  DefectFamily,
  DefectKind,
  EvidenceReceipt,
  ForgeFinding,
  ForgeRun,
  ForgeScore,
  ForgeSpecimen,
  InferenceEdge,
  Severity,
  StudyDesignNode,
} from './types';

const EMPIRICAL_CLAIM_KINDS = new Set<ClaimNode['claimKind']>([
  'descriptive',
  'causal',
  'comparative',
  'priority',
  'mechanistic',
]);

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertIsoDate(value: string, name: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be an ISO-compatible date`);
  }
}

function assertUniqueIds(items: readonly { readonly id: string }[], name: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    assertNonEmpty(item.id, `${name} id`);
    if (ids.has(item.id)) {
      throw new Error(`duplicate ${name} id "${item.id}"`);
    }
    ids.add(item.id);
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function finding(args: {
  readonly ruleId: string;
  readonly targetId: string;
  readonly claimIds: readonly string[];
  readonly family: DefectFamily;
  readonly defectKind: DefectKind;
  readonly severity: Severity;
  readonly confidence: number;
  readonly explanation: string;
  readonly evidenceIds?: readonly string[];
  readonly challenge?: ChallengeProtocol;
}): ForgeFinding {
  const fallback: ChallengeProtocol = {
    steelman: 'Read the claim in its narrowest defensible scope.',
    repair: 'Narrow the claim and state the evidence required for the inference.',
    falsifier: 'Identify an observation that would distinguish the claim from its alternatives.',
  };
  const challenge = args.challenge ?? fallback;
  return deepFreeze({
    id: `${args.ruleId}:${args.targetId}`,
    ruleId: args.ruleId,
    targetId: args.targetId,
    claimIds: [...args.claimIds],
    family: args.family,
    defectKind: args.defectKind,
    severity: args.severity,
    confidence: args.confidence,
    explanation: args.explanation,
    evidenceIds: [...(args.evidenceIds ?? [])],
    steelman: challenge.steelman,
    repair: challenge.repair,
    falsifier: challenge.falsifier,
  });
}

export function validateSpecimen(input: ForgeSpecimen): ForgeSpecimen {
  const specimen = structuredClone(input);
  assertNonEmpty(specimen.id, 'specimen id');
  assertNonEmpty(specimen.title, 'specimen title');
  assertNonEmpty(specimen.source.uri, 'specimen source URI');
  assertUniqueIds(specimen.claims, 'claim');
  assertUniqueIds(specimen.evidence, 'evidence');
  assertUniqueIds(specimen.inferences, 'inference');
  assertUniqueIds(specimen.studyDesigns, 'study design');

  const claims = new Map(specimen.claims.map((claim) => [claim.id, claim] as const));
  const evidence = new Map(specimen.evidence.map((receipt) => [receipt.id, receipt] as const));

  for (const claim of specimen.claims) {
    assertNonEmpty(claim.statement, `statement for claim "${claim.id}"`);
    if (claim.subjectOriginAt !== undefined) {
      assertIsoDate(claim.subjectOriginAt, `subjectOriginAt for claim "${claim.id}"`);
    }
    for (const ambiguity of claim.ambiguities ?? []) {
      assertNonEmpty(ambiguity.term, `ambiguity term for claim "${claim.id}"`);
      if (ambiguity.senses.length < 2) {
        throw new Error(`ambiguity "${ambiguity.term}" must name at least two senses`);
      }
    }
  }

  for (const receipt of specimen.evidence) {
    if (!claims.has(receipt.claimId)) {
      throw new Error(`evidence "${receipt.id}" refers to unknown claim "${receipt.claimId}"`);
    }
    assertNonEmpty(receipt.summary, `summary for evidence "${receipt.id}"`);
    if (receipt.eventAt !== undefined) {
      assertIsoDate(receipt.eventAt, `eventAt for evidence "${receipt.id}"`);
    }
  }

  for (const edge of specimen.inferences) {
    if (!claims.has(edge.conclusionId)) {
      throw new Error(`inference "${edge.id}" has unknown conclusion "${edge.conclusionId}"`);
    }
    if (edge.premiseIds.length === 0) {
      throw new Error(`inference "${edge.id}" must have at least one premise`);
    }
    for (const premiseId of edge.premiseIds) {
      if (!claims.has(premiseId)) {
        throw new Error(`inference "${edge.id}" has unknown premise "${premiseId}"`);
      }
    }
    for (const evidenceId of edge.evidenceIds) {
      if (!evidence.has(evidenceId)) {
        throw new Error(`inference "${edge.id}" has unknown evidence "${evidenceId}"`);
      }
    }
  }

  for (const design of specimen.studyDesigns) {
    if (!claims.has(design.claimId)) {
      throw new Error(`study design "${design.id}" has unknown claim "${design.claimId}"`);
    }
    if (design.arms.length < 2) {
      throw new Error(`study design "${design.id}" must have at least two arms`);
    }
    assertUniqueIds(design.arms, `study arm in "${design.id}"`);
  }

  for (const claimId of specimen.hardNegativeClaimIds) {
    if (!claims.has(claimId)) {
      throw new Error(`hard negative refers to unknown claim "${claimId}"`);
    }
  }
  for (const expectation of specimen.expectedFindings) {
    const targetExists =
      claims.has(expectation.targetId) ||
      specimen.inferences.some(({ id }) => id === expectation.targetId) ||
      specimen.studyDesigns.some(({ id }) => id === expectation.targetId);
    if (!targetExists) {
      throw new Error(`expected finding refers to unknown target "${expectation.targetId}"`);
    }
  }

  return deepFreeze(specimen) as ForgeSpecimen;
}

function evidenceFor(edge: InferenceEdge, evidenceById: ReadonlyMap<string, EvidenceReceipt>) {
  return edge.evidenceIds.flatMap((id) => {
    const receipt = evidenceById.get(id);
    return receipt === undefined ? [] : [receipt];
  });
}

function inspectClaim(claim: ClaimNode, receipts: readonly EvidenceReceipt[]): ForgeFinding[] {
  const findings: ForgeFinding[] = [];
  if ((claim.ambiguities?.length ?? 0) > 0) {
    const terms = claim.ambiguities?.map(({ term }) => `"${term}"`).join(', ') ?? '';
    findings.push(
      finding({
        ruleId: 'claim.scope-ambiguity',
        targetId: claim.id,
        claimIds: [claim.id],
        family: 'ambiguity',
        defectKind: 'scope-ambiguity',
        severity: 'medium',
        confidence: 0.9,
        explanation: `The claim changes inferential force depending on the unresolved sense of ${terms}.`,
        evidenceIds: receipts.map(({ id }) => id),
        ...(claim.challenge === undefined ? {} : { challenge: claim.challenge }),
      })
    );
  }

  const counterexamples = receipts.filter(
    ({ stance, evidenceKind }) => stance === 'challenges' && evidenceKind === 'counterexample'
  );
  if ((claim.quantifier === 'all' || claim.quantifier === 'most') && counterexamples.length > 0) {
    findings.push(
      finding({
        ruleId: 'claim.overgeneralization',
        targetId: claim.id,
        claimIds: [claim.id],
        family: 'logical-fallacy',
        defectKind: 'overgeneralization',
        severity: 'medium',
        confidence: 0.95,
        explanation:
          'The broad quantifier is not preserved in the presence of a documented counterexample.',
        evidenceIds: counterexamples.map(({ id }) => id),
        ...(claim.challenge === undefined ? {} : { challenge: claim.challenge }),
      })
    );
  }

  return findings;
}

function inspectInference(
  edge: InferenceEdge,
  claimById: ReadonlyMap<string, ClaimNode>,
  evidenceById: ReadonlyMap<string, EvidenceReceipt>
): ForgeFinding[] {
  const conclusion = claimById.get(edge.conclusionId);
  if (conclusion === undefined) return [];
  const premises = edge.premiseIds.flatMap((id) => {
    const claim = claimById.get(id);
    return claim === undefined ? [] : [claim];
  });
  const receipts = evidenceFor(edge, evidenceById);
  const findings: ForgeFinding[] = [];

  if (
    conclusion.claimKind === 'comparative' &&
    !receipts.some(
      ({ stance, evidenceKind }) => stance === 'supports' && evidenceKind === 'measurement'
    )
  ) {
    findings.push(
      finding({
        ruleId: 'inference.unsupported-comparison',
        targetId: edge.id,
        claimIds: [...edge.premiseIds, edge.conclusionId],
        family: 'evidence-gap',
        defectKind: 'unsupported-comparison',
        severity: 'high',
        confidence: 0.98,
        explanation:
          'The comparative conclusion lacks a supporting measurement receipt for an equivalent baseline.',
        evidenceIds: receipts.map(({ id }) => id),
        ...(edge.challenge === undefined ? {} : { challenge: edge.challenge }),
      })
    );
  }

  if (
    premises.some(({ claimKind }) => claimKind === 'normative') &&
    EMPIRICAL_CLAIM_KINDS.has(conclusion.claimKind) &&
    !receipts.some(({ stance }) => stance === 'supports')
  ) {
    findings.push(
      finding({
        ruleId: 'inference.category-shift',
        targetId: edge.id,
        claimIds: [...edge.premiseIds, edge.conclusionId],
        family: 'logical-fallacy',
        defectKind: 'category-shift',
        severity: 'medium',
        confidence: 0.9,
        explanation:
          'A value preference is used to establish an empirical conclusion without supporting evidence.',
        evidenceIds: receipts.map(({ id }) => id),
        ...(edge.challenge === undefined ? {} : { challenge: edge.challenge }),
      })
    );
  }

  if (edge.warrant?.kind === 'metaphor' && EMPIRICAL_CLAIM_KINDS.has(conclusion.claimKind)) {
    findings.push(
      finding({
        ruleId: 'inference.metaphor-as-mechanism',
        targetId: edge.id,
        claimIds: [...edge.premiseIds, edge.conclusionId],
        family: 'rhetorical-bridge',
        defectKind: 'metaphor-as-mechanism',
        severity: 'medium',
        confidence: 0.97,
        explanation:
          'The warrant names an analogy but does not specify a mechanism that entails the empirical conclusion.',
        evidenceIds: receipts.map(({ id }) => id),
        ...(edge.challenge === undefined ? {} : { challenge: edge.challenge }),
      })
    );
  }

  if (conclusion.claimKind === 'priority' && conclusion.subjectOriginAt !== undefined) {
    const origin = Date.parse(conclusion.subjectOriginAt);
    const conflicts = receipts.filter(
      ({ stance, eventAt }) =>
        stance === 'challenges' && eventAt !== undefined && Date.parse(eventAt) < origin
    );
    if (conflicts.length > 0) {
      findings.push(
        finding({
          ruleId: 'inference.priority-conflict',
          targetId: edge.id,
          claimIds: [...edge.premiseIds, edge.conclusionId],
          family: 'factual-tension',
          defectKind: 'priority-conflict',
          severity: 'high',
          confidence: 0.99,
          explanation:
            'A dated challenge receipt predates the claimed subject origin, so the priority claim requires narrower scope or contrary evidence.',
          evidenceIds: conflicts.map(({ id }) => id),
          ...(edge.challenge === undefined ? {} : { challenge: edge.challenge }),
        })
      );
    }
  }

  return findings;
}

function inspectStudyDesign(design: StudyDesignNode): ForgeFinding[] {
  const findings: ForgeFinding[] = [];
  if (
    design.assignment === 'self-selected' ||
    design.assignment === 'policy-selected' ||
    !design.sameTask ||
    !design.completeDenominator
  ) {
    findings.push(
      finding({
        ruleId: 'study.selection-bias',
        targetId: design.id,
        claimIds: [design.claimId],
        family: 'measurement-defect',
        defectKind: 'selection-bias',
        severity: 'high',
        confidence: 0.99,
        explanation:
          'The observed exceptions are selected by policy or omit comparable attempts, so they cannot estimate the population gap.',
        challenge: design.challenge,
      })
    );
  }
  if (!design.symmetricCriteria || !design.independentReview) {
    findings.push(
      finding({
        ruleId: 'study.asymmetric-verification',
        targetId: design.id,
        claimIds: [design.claimId],
        family: 'measurement-defect',
        defectKind: 'asymmetric-verification',
        severity: 'high',
        confidence: 0.99,
        explanation:
          'The arms face different burdens of proof or a non-independent reviewer, contaminating the comparison.',
        challenge: design.challenge,
      })
    );
  }
  return findings;
}

function scoreFindings(specimen: ForgeSpecimen, findings: readonly ForgeFinding[]): ForgeScore {
  const expected = new Set(
    specimen.expectedFindings.map(({ targetId, defectKind }) => `${targetId}:${defectKind}`)
  );
  const actual = new Set(findings.map(({ targetId, defectKind }) => `${targetId}:${defectKind}`));
  const truePositives = [...actual].filter((key) => expected.has(key)).length;
  const falsePositives = [...actual].filter((key) => !expected.has(key)).length;
  const falseNegatives = [...expected].filter((key) => !actual.has(key)).length;
  const precision = actual.size === 0 ? (expected.size === 0 ? 1 : 0) : truePositives / actual.size;
  const recall = expected.size === 0 ? 1 : truePositives / expected.size;
  const violatedHardNegatives = new Set(
    findings.flatMap(({ claimIds }) =>
      claimIds.filter((claimId) => specimen.hardNegativeClaimIds.includes(claimId))
    )
  );
  const hardNegativeAccuracy =
    specimen.hardNegativeClaimIds.length === 0
      ? 1
      : 1 - violatedHardNegatives.size / specimen.hardNegativeClaimIds.length;

  return deepFreeze({
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    hardNegativeAccuracy,
  });
}

export function runFallacyForge(input: ForgeSpecimen): ForgeRun {
  const specimen = validateSpecimen(input);
  const claimById = new Map(specimen.claims.map((claim) => [claim.id, claim] as const));
  const evidenceById = new Map(specimen.evidence.map((receipt) => [receipt.id, receipt] as const));
  const evidenceByClaim = new Map<string, EvidenceReceipt[]>();
  for (const receipt of specimen.evidence) {
    const current = evidenceByClaim.get(receipt.claimId) ?? [];
    evidenceByClaim.set(receipt.claimId, [...current, receipt]);
  }

  const findings = [
    ...specimen.claims.flatMap((claim) => inspectClaim(claim, evidenceByClaim.get(claim.id) ?? [])),
    ...specimen.inferences.flatMap((edge) => inspectInference(edge, claimById, evidenceById)),
    ...specimen.studyDesigns.flatMap(inspectStudyDesign),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const hardNegativeViolations = [
    ...new Set(
      findings.flatMap(({ claimIds }) =>
        claimIds.filter((claimId) => specimen.hardNegativeClaimIds.includes(claimId))
      )
    ),
  ].sort();

  return deepFreeze({
    specimenId: specimen.id,
    variant: specimen.variant,
    findings,
    hardNegativeViolations,
    score: scoreFindings(specimen, findings),
  });
}
