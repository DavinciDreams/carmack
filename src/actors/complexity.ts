import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ComplexityMetrics } from '../types.js';

// Complexity input schema
const ComplexityInputSchema = z.union([
  z.object({
    files: z.array(z.string()),
    metrics: z.any().optional(), // ComplexityMetrics schema
  }),
  z.object({
    files: z.array(z.string()),
    baseline: z.any().optional(), // ComplexityMetrics schema
  }),
]);

type ComplexityInput = z.infer<typeof ComplexityInputSchema>;

/**
 * Complexity Actor
 *
 * Analyzes code complexity metrics:
 * - Cyclomatic complexity
 * - Cognitive complexity
 * - Lines of code
 * - Nesting depth
 * - Function/class counts
 */
export const complexityActor = fromPromise(async ({ input }: { input: ComplexityInput }) => {
  const validatedInput = ComplexityInputSchema.parse(input);
  const { files } = validatedInput;

  console.log(`Analyzing complexity for ${files.length} files`);

  const metrics = await calculateComplexityMetrics(files);

  if ('baseline' in validatedInput && validatedInput.baseline) {
    return await compareWithBaseline(metrics, validatedInput.baseline);
  }

  return metrics;
});

async function calculateComplexityMetrics(files: string[]): Promise<ComplexityMetrics> {
  // TODO: Implement actual complexity calculation
  // Could use TypeScript compiler API or external tools
  console.log('Calculating complexity metrics...');

  // Mock implementation with realistic ranges
  return {
    cyclomaticComplexity: Math.floor(Math.random() * 25) + 1,
    cognitiveComplexity: Math.floor(Math.random() * 20) + 1,
    linesOfCode: files.length * (Math.floor(Math.random() * 200) + 50),
    nestingDepth: Math.floor(Math.random() * 6) + 1,
    functionCount: files.length * (Math.floor(Math.random() * 10) + 1),
    classCount: files.length * Math.floor(Math.random() * 3),
  };
}

async function compareWithBaseline(
  current: ComplexityMetrics,
  baseline: ComplexityMetrics
): Promise<ComplexityMetrics & { improvement: boolean; changes: string[] }> {
  console.log('Comparing complexity with baseline...');

  const changes: string[] = [];
  let improvement = false;

  if (current.cyclomaticComplexity < baseline.cyclomaticComplexity) {
    changes.push('Reduced cyclomatic complexity');
    improvement = true;
  } else if (current.cyclomaticComplexity > baseline.cyclomaticComplexity) {
    changes.push('Increased cyclomatic complexity');
  }

  if (current.cognitiveComplexity < baseline.cognitiveComplexity) {
    changes.push('Reduced cognitive complexity');
    improvement = true;
  } else if (current.cognitiveComplexity > baseline.cognitiveComplexity) {
    changes.push('Increased cognitive complexity');
  }

  if (current.linesOfCode < baseline.linesOfCode) {
    changes.push('Reduced lines of code');
    improvement = true;
  } else if (current.linesOfCode > baseline.linesOfCode) {
    changes.push('Increased lines of code');
  }

  return {
    ...current,
    improvement,
    changes,
  };
}
