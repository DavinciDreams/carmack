import { describe, expect, test } from 'bun:test';

import {
  atlasSevenTenetsNeutral,
  atlasSevenTenetsRepaired,
  atlasSevenTenetsSourceShaped,
} from '../../fixtures/fallacy-forge/atlas-seven-tenets-001.ts';
import {
  runFallacyForge,
  validateSpecimen,
  type ForgeSpecimen,
} from '../../src/fallacy-forge/index.ts';

function signatures(specimen: ForgeSpecimen): readonly string[] {
  return runFallacyForge(specimen).findings.map(
    ({ targetId, defectKind }) => `${targetId}:${defectKind}`
  );
}

describe('Fallacy Forge Atlas fixture', () => {
  test('finds the eight gold defects without striking hard negatives', () => {
    const run = runFallacyForge(atlasSevenTenetsSourceShaped);

    expect(run.findings).toHaveLength(8);
    expect(run.hardNegativeViolations).toEqual([]);
    expect(run.score).toEqual({
      truePositives: 8,
      falsePositives: 0,
      falseNegatives: 0,
      precision: 1,
      recall: 1,
      hardNegativeAccuracy: 1,
    });
  });

  test('is invariant to rhetorical versus neutral surface wording', () => {
    expect(signatures(atlasSevenTenetsSourceShaped)).toEqual(
      signatures(atlasSevenTenetsNeutral)
    );
  });

  test('accepts the repaired argument instead of rewarding contrarianism', () => {
    const run = runFallacyForge(atlasSevenTenetsRepaired);

    expect(run.findings).toEqual([]);
    expect(run.hardNegativeViolations).toEqual([]);
    expect(run.score.precision).toBe(1);
    expect(run.score.recall).toBe(1);
    expect(run.score.hardNegativeAccuracy).toBe(1);
  });

  test('separates factual tension and evidence gaps from logical fallacies', () => {
    const findings = runFallacyForge(atlasSevenTenetsSourceShaped).findings;
    const priority = findings.find(({ defectKind }) => defectKind === 'priority-conflict');
    const comparison = findings.find(
      ({ defectKind }) => defectKind === 'unsupported-comparison'
    );
    const overgeneralization = findings.find(
      ({ defectKind }) => defectKind === 'overgeneralization'
    );

    expect(priority?.family).toBe('factual-tension');
    expect(comparison?.family).toBe('evidence-gap');
    expect(overgeneralization?.family).toBe('logical-fallacy');
  });

  test('returns a steelman, minimal repair, and falsifier for every finding', () => {
    const findings = runFallacyForge(atlasSevenTenetsSourceShaped).findings;

    for (const finding of findings) {
      expect(finding.steelman.length).toBeGreaterThan(0);
      expect(finding.repair.length).toBeGreaterThan(0);
      expect(finding.falsifier.length).toBeGreaterThan(0);
    }
  });

  test('rejects dangling references, duplicate ids, and invalid dates', () => {
    const dangling: ForgeSpecimen = {
      ...structuredClone(atlasSevenTenetsSourceShaped),
      inferences: atlasSevenTenetsSourceShaped.inferences.map((edge, index) =>
        index === 0 ? { ...edge, premiseIds: ['missing-claim'] } : edge
      ),
    };
    expect(() => validateSpecimen(dangling)).toThrow(/unknown premise/);

    const duplicate: ForgeSpecimen = {
      ...structuredClone(atlasSevenTenetsSourceShaped),
      claims: atlasSevenTenetsSourceShaped.claims.map((claim, index) =>
        index === 1 ? { ...claim, id: atlasSevenTenetsSourceShaped.claims[0]!.id } : claim
      ),
    };
    expect(() => validateSpecimen(duplicate)).toThrow(/duplicate claim id/);

    const invalidDate: ForgeSpecimen = {
      ...structuredClone(atlasSevenTenetsSourceShaped),
      claims: atlasSevenTenetsSourceShaped.claims.map((claim) =>
        claim.id === 'priority' ? { ...claim, subjectOriginAt: 'not-a-date' } : claim
      ),
    };
    expect(() => validateSpecimen(invalidDate)).toThrow(/ISO-compatible date/);
  });

  test('does not mutate the caller-owned specimen', () => {
    const input = structuredClone(atlasSevenTenetsSourceShaped);
    const before = structuredClone(input);

    runFallacyForge(input);

    expect(input).toEqual(before);
  });
});
