import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  AstPattern,
  ComplexityMetrics,
  TransformationMode,
  TransformationRequest,
} from '../types.js';

// Analysis input schema
const AnalysisInputSchema = z.union([
  z.object({
    files: z.array(z.string()),
    patterns: z.array(z.any()), // AstPattern schema
    request: z.any().optional(), // TransformationRequest schema
  }),
  z.object({
    operation: z.literal('learn'),
    transformation: z.any(), // TransformationResult schema
    patterns: z.array(z.any()), // AstPattern schema
  }),
  z.object({
    operation: z.literal('summarize'),
    transformation: z.any(), // TransformationResult schema
  }),
]);

type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

// Standardized analysis result
export interface AnalysisResult {
  complexity?: ComplexityMetrics;
  recommendedMode?: TransformationMode;
  analysisTimestamp?: number;
  newPatterns?: AstPattern[];
  insights?: string[];
  summary?: string;
}

/**
 * Analysis Actor
 *
 * Responsible for analyzing code files to determine the best transformation approach.
 * Uses pattern matching, complexity analysis, and risk assessment to recommend
 * the optimal transformation mode (template, AST, or LLM).
 */
export const analysisActor = fromPromise(
  async ({ input }: { input: AnalysisInput }): Promise<AnalysisResult> => {
    // Validate input
    const validatedInput = AnalysisInputSchema.parse(input);

    if ('operation' in validatedInput) {
      if (validatedInput.operation === 'learn') {
        // Type-safe handling for learn operation
        const learningInput = validatedInput as Extract<AnalysisInput, { operation: 'learn' }>;
        return await handleLearning(learningInput);
      }
      if (validatedInput.operation === 'summarize') {
        // Type-safe handling for summarize operation
        const summaryInput = validatedInput as Extract<AnalysisInput, { operation: 'summarize' }>;
        return await handleSummarization(summaryInput);
      }
    }

    // Main analysis flow
    const { files, patterns, request } = validatedInput as Extract<
      AnalysisInput,
      { files: string[] }
    >;

    // Analyze file complexity
    const complexity = await analyzeComplexity(files);

    // Determine recommended transformation mode
    const recommendedMode = await determineTransformationMode(files, patterns, complexity, request);

    return {
      complexity,
      recommendedMode,
      analysisTimestamp: Date.now(),
    };
  }
);

async function analyzeComplexity(_files: string[]): Promise<ComplexityMetrics> {
  // TODO: Implement actual complexity analysis
  // For now, return mock data
  return {
    cyclomaticComplexity: Math.floor(Math.random() * 20) + 1,
    cognitiveComplexity: Math.floor(Math.random() * 15) + 1,
    linesOfCode: Math.floor(Math.random() * 1000) + 100,
    nestingDepth: Math.floor(Math.random() * 5) + 1,
    functionCount: Math.floor(Math.random() * 20) + 1,
    classCount: Math.floor(Math.random() * 5),
  };
}

async function determineTransformationMode(
  _files: string[],
  patterns: AstPattern[],
  complexity: ComplexityMetrics,
  _request?: TransformationRequest
): Promise<TransformationMode> {
  // Speed first: Try template approach for simple transformations
  if (complexity.cyclomaticComplexity <= 5 && patterns.length > 0) {
    return 'template';
  }

  // Use AST for medium complexity with known patterns
  if (complexity.cyclomaticComplexity <= 15 && patterns.length > 0) {
    return 'ast';
  }

  // Fall back to LLM for complex transformations
  return 'llm';
}

async function handleLearning(_input: {
  operation: 'learn';
  transformation?: unknown;
  patterns: unknown[];
}): Promise<AnalysisResult> {
  // TODO: Implement learning from transformation results
  // Extract patterns from successful transformations
  return {
    newPatterns: [],
    insights: [],
  };
}

async function handleSummarization(input: {
  operation: 'summarize';
  transformation?: unknown;
}): Promise<AnalysisResult> {
  // TODO: Implement transformation summarization
  const transformation = input.transformation as { id?: string; mode?: string } | undefined;
  return {
    summary: `Transformation ${transformation?.id || 'unknown'} completed with ${transformation?.mode || 'unknown'} mode`,
  };
}
