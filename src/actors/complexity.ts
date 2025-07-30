import { readFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ComplexityMetrics } from '../types.ts';
import { ComplexityMetricsSchema } from '../types.ts';

// Complexity input schema
const ComplexityInputSchema = z.union([
  z.object({
    files: z.array(z.string()),
    metrics: ComplexityMetricsSchema.optional(),
  }),
  z.object({
    files: z.array(z.string()),
    baseline: ComplexityMetricsSchema.optional(),
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

  const metrics = await calculateComplexityMetrics(files);
  if ('baseline' in validatedInput && validatedInput.baseline) {
    return await compareWithBaseline(metrics, validatedInput.baseline);
  }
  return metrics;
});
async function calculateComplexityMetrics(files: string[]): Promise<ComplexityMetrics> {
  let totalCyclomaticComplexity = 0;
  let totalCognitiveComplexity = 0;
  let totalLinesOfCode = 0;
  let maxNestingDepth = 0;
  let totalFunctionCount = 0;
  let totalClassCount = 0;
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const fileMetrics = analyzeFileComplexity(content);
      totalCyclomaticComplexity += fileMetrics.cyclomaticComplexity;
      totalCognitiveComplexity += fileMetrics.cognitiveComplexity;
      totalLinesOfCode += fileMetrics.linesOfCode;
      maxNestingDepth = Math.max(maxNestingDepth, fileMetrics.nestingDepth);
      totalFunctionCount += fileMetrics.functionCount;
      totalClassCount += fileMetrics.classCount;
    } catch (_error) {
      // Continue with other files
    }
  }
  return {
    cyclomaticComplexity: totalCyclomaticComplexity,
    cognitiveComplexity: totalCognitiveComplexity,
    linesOfCode: totalLinesOfCode,
    nestingDepth: maxNestingDepth,
    functionCount: totalFunctionCount,
    classCount: totalClassCount,
  };
}
/**
 * Analyze complexity metrics for a single file
 */
function analyzeFileComplexity(content: string): ComplexityMetrics {
  const lines = content.split('\n');
  const linesOfCode = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;
  // Calculate cyclomatic complexity
  let cyclomaticComplexity = 1; // Base complexity
  const cyclomaticPatterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bdo\b/g,
    /\bswitch\b/g,
    /\bcase\b/g,
    /\btry\b/g,
    /\bcatch\b/g,
    /\?\s*.*\s*:/g, // Ternary operator
    /&&/g,
    /\|\|/g, // Logical operators
  ];
  cyclomaticPatterns.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) cyclomaticComplexity += matches.length;
  });
  // Calculate cognitive complexity (more sophisticated)
  let cognitiveComplexity = 0;
  let nestingLevel = 0;
  let maxNestingDepth = 0;
  // Cognitive complexity patterns with nesting penalties
  const cognitivePatterns = [
    { pattern: /\bif\b/g, increment: 1 },
    { pattern: /\belse\s+if\b/g, increment: 1 },
    { pattern: /\belse\b/g, increment: 1 },
    { pattern: /\bswitch\b/g, increment: 1 },
    { pattern: /\bfor\b/g, increment: 1 },
    { pattern: /\bwhile\b/g, increment: 1 },
    { pattern: /\bdo\b/g, increment: 1 },
    { pattern: /\btry\b/g, increment: 1 },
    { pattern: /\bcatch\b/g, increment: 1 },
    { pattern: /\?\s*.*\s*:/g, increment: 1 }, // Ternary
  ];
  // Simple nesting depth calculation
  for (const line of lines) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    nestingLevel += openBraces - closeBraces;
    maxNestingDepth = Math.max(maxNestingDepth, nestingLevel);
  }
  cognitivePatterns.forEach(({ pattern, increment }) => {
    const matches = content.match(pattern);
    if (matches) {
      cognitiveComplexity += matches.length * increment;
    }
  });
  // Add nesting penalty to cognitive complexity
  cognitiveComplexity += Math.max(0, maxNestingDepth - 1);
  // Count functions and classes
  const functionPatterns = [
    /\bfunction\s+\w+/g,
    /\w+\s*:\s*\([^)]*\)\s*=>/g, // Arrow functions in objects
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g, // Arrow function assignments
    /\w+\s*\([^)]*\)\s*\{/g, // Method definitions
  ];
  let functionCount = 0;
  functionPatterns.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) functionCount += matches.length;
  });
  const classMatches = content.match(/\bclass\s+\w+/g);
  const classCount = classMatches ? classMatches.length : 0;
  return {
    cyclomaticComplexity,
    cognitiveComplexity,
    linesOfCode,
    nestingDepth: maxNestingDepth,
    functionCount,
    classCount,
  };
}
async function compareWithBaseline(
  current: ComplexityMetrics,
  baseline: ComplexityMetrics
): Promise<ComplexityMetrics & { improvement: boolean; changes: string[] }> {
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
