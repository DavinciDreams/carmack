import { atlasSevenTenetsFixture } from '../fixtures/fallacy-forge/atlas-seven-tenets-001.ts';
import { runFallacyForge } from '../src/fallacy-forge/index.ts';

const report = atlasSevenTenetsFixture.variants.map((specimen) => {
  const run = runFallacyForge(specimen);
  return {
    variant: run.variant,
    findingCount: run.findings.length,
    findingFamilies: [...new Set(run.findings.map(({ family }) => family))],
    findings: run.findings.map(({ defectKind, targetId, repair, falsifier }) => ({
      targetId,
      defectKind,
      repair,
      falsifier,
    })),
    hardNegativeViolations: run.hardNegativeViolations,
    score: run.score,
  };
});

console.log(JSON.stringify({ fixture: atlasSevenTenetsFixture.id, variants: report }, null, 2));
