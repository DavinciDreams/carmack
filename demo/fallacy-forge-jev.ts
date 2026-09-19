import { typeSafeJevFixture } from '../fixtures/fallacy-forge/typesafe-jev-002.ts';
import { runFallacyForge } from '../src/fallacy-forge/index.ts';

const variants = typeSafeJevFixture.variants.map((specimen) => {
  const run = runFallacyForge(specimen);
  return {
    variant: run.variant,
    findings: run.findings.map(({ targetId, defectKind, family, repair, falsifier }) => ({
      targetId,
      defectKind,
      family,
      repair,
      falsifier,
    })),
    hardNegativeViolations: run.hardNegativeViolations,
    score: run.score,
  };
});

console.log(JSON.stringify({ fixture: typeSafeJevFixture.id, variants }, null, 2));
