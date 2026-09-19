import { describe, expect, test } from 'bun:test';

import {
  typeSafeJevNeutral,
  typeSafeJevRepaired,
  typeSafeJevSourceShaped,
} from '../../fixtures/fallacy-forge/typesafe-jev-002.ts';
import { runFallacyForge, validateSpecimen } from '../../src/fallacy-forge/index.ts';

function signatures(specimen: typeof typeSafeJevSourceShaped): readonly string[] {
  return runFallacyForge(specimen).findings.map(
    ({ targetId, defectKind }) => `${targetId}:${defectKind}`
  );
}

describe('Fallacy Forge TypeSafe Jev fixture', () => {
  test('locates the three construct bridges and the unscoped guarantee', () => {
    const run = runFallacyForge(typeSafeJevSourceShaped);

    expect(run.findings.map(({ defectKind }) => defectKind)).toEqual([
      'scope-ambiguity',
      'calibration-evidence-gap',
      'reference-standard-substitution',
      'schema-semantics-conflation',
    ]);
    expect(run.hardNegativeViolations).toEqual([]);
    expect(run.score.truePositives).toBe(4);
    expect(run.score.falsePositives).toBe(0);
    expect(run.score.falseNegatives).toBe(0);
  });

  test('is invariant to promotional versus neutral wording', () => {
    expect(signatures(typeSafeJevSourceShaped)).toEqual(signatures(typeSafeJevNeutral));
  });

  test('accepts the narrower repaired claims', () => {
    const run = runFallacyForge(typeSafeJevRepaired);

    expect(run.findings).toEqual([]);
    expect(run.hardNegativeViolations).toEqual([]);
  });

  test('distinguishes a missing calibration test from a proven calibration failure', () => {
    const finding = runFallacyForge(typeSafeJevSourceShaped).findings.find(
      ({ defectKind }) => defectKind === 'calibration-evidence-gap'
    );

    expect(finding?.family).toBe('evidence-gap');
    expect(finding?.explanation).toMatch(/does not establish calibration/);
    expect(finding?.falsifier).toMatch(/0\.9|90%/);
  });

  test('requests a type-error definition and theorem assumptions', () => {
    const finding = runFallacyForge(typeSafeJevSourceShaped).findings.find(
      ({ targetId }) => targetId === 'noTypeErrors'
    );

    expect(finding?.family).toBe('ambiguity');
    expect(finding?.repair).toMatch(/successful-call boundary/);
    expect(finding?.falsifier).toMatch(/exact request schema/);
  });

  test('requires source receipts for all challenged inferences', () => {
    const run = runFallacyForge(typeSafeJevSourceShaped);

    for (const finding of run.findings) {
      expect(finding.evidenceIds.length).toBeGreaterThan(0);
      expect(finding.steelman.length).toBeGreaterThan(0);
      expect(finding.repair.length).toBeGreaterThan(0);
      expect(finding.falsifier.length).toBeGreaterThan(0);
    }
  });

  test('rejects an inference pointing to a missing receipt', () => {
    const specimen = {
      ...structuredClone(typeSafeJevSourceShaped),
      inferences: typeSafeJevSourceShaped.inferences.map((edge, index) =>
        index === 0 ? { ...edge, evidenceIds: ['missing-receipt'] } : edge
      ),
    };

    expect(() => validateSpecimen(specimen)).toThrow(/unknown evidence/);
  });

  test('does not mutate caller-owned input', () => {
    const input = structuredClone(typeSafeJevSourceShaped);
    const before = structuredClone(input);

    runFallacyForge(input);

    expect(input).toEqual(before);
  });
});
