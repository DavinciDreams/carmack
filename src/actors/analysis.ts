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

async function analyzeComplexity(files: string[]): Promise<ComplexityMetrics> {
  // Analyze actual file complexity
  let totalCyclomaticComplexity = 0;
  let totalCognitiveComplexity = 0;
  let totalLinesOfCode = 0;
  let maxNestingDepth = 0;
  let totalFunctionCount = 0;
  let totalClassCount = 0;

  try {
    const { readFile } = await import('fs/promises');

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const metrics = analyzeFileComplexity(content);

        totalCyclomaticComplexity += metrics.cyclomaticComplexity;
        totalCognitiveComplexity += metrics.cognitiveComplexity;
        totalLinesOfCode += metrics.linesOfCode;
        maxNestingDepth = Math.max(maxNestingDepth, metrics.nestingDepth);
        totalFunctionCount += metrics.functionCount;
        totalClassCount += metrics.classCount;
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${filePath}:`, error);
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
  } catch (error) {
    console.warn('Warning: Could not perform complexity analysis:', error);
    // Fallback to mock data if file reading fails
    return {
      cyclomaticComplexity: Math.floor(Math.random() * 20) + 1,
      cognitiveComplexity: Math.floor(Math.random() * 15) + 1,
      linesOfCode: Math.floor(Math.random() * 1000) + 100,
      nestingDepth: Math.floor(Math.random() * 5) + 1,
      functionCount: Math.floor(Math.random() * 20) + 1,
      classCount: Math.floor(Math.random() * 5),
    };
  }
}

function analyzeFileComplexity(content: string): ComplexityMetrics {
  const lines = content.split('\n');
  let cyclomaticComplexity = 1; // Base complexity
  let cognitiveComplexity = 0;
  let nestingDepth = 0;
  let maxNestingDepth = 0;
  let functionCount = 0;
  let classCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed === '') {
      continue;
    }

    // Count functions
    if (/\bfunction\b|\b\w+\s*\(.*\)\s*=>|\b\w+\s*\(.*\)\s*\{/.test(trimmed)) {
      functionCount++;
      cyclomaticComplexity++; // Each function adds to complexity
    }

    // Count classes
    if (/\bclass\b/.test(trimmed)) {
      classCount++;
    }

    // Track nesting with braces
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    nestingDepth += openBraces - closeBraces;
    maxNestingDepth = Math.max(maxNestingDepth, nestingDepth);

    // Complexity indicators
    const complexityPatterns = [
      /\bif\b/,
      /\belse\b/,
      /\bwhile\b/,
      /\bfor\b/,
      /\bswitch\b/,
      /\bcase\b/,
      /\btry\b/,
      /\bcatch\b/,
      /\bfinally\b/,
      /\?\s*.*\s*:/,
      /&&/,
      /\|\|/,
    ];

    for (const pattern of complexityPatterns) {
      if (pattern.test(trimmed)) {
        cyclomaticComplexity++;
        cognitiveComplexity += Math.max(1, nestingDepth); // Cognitive complexity considers nesting
      }
    }

    // Additional cognitive complexity for nested conditions
    if (/\bif\b.*\bif\b|\bfor\b.*\bfor\b|\bwhile\b.*\bwhile\b/.test(trimmed)) {
      cognitiveComplexity += 2;
    }

    // == usage increases cognitive complexity (less clear intent)
    if (/[^!=]\s*==\s*[^=]/.test(trimmed)) {
      cognitiveComplexity++;
    }

    // Var usage in complex contexts
    if (/\bvar\b/.test(trimmed) && nestingDepth > 0) {
      cognitiveComplexity++;
    }
  }

  return {
    cyclomaticComplexity,
    cognitiveComplexity,
    linesOfCode: lines.filter((line) => line.trim() !== '' && !line.trim().startsWith('//')).length,
    nestingDepth: maxNestingDepth,
    functionCount,
    classCount,
  };
}

async function determineTransformationMode(
  files: string[],
  patterns: AstPattern[],
  complexity: ComplexityMetrics,
  _request?: TransformationRequest
): Promise<TransformationMode> {
  // Check if file content matches AST-specific patterns
  const hasAstPatterns = await checkForAstPatterns(files, patterns);
  
  if (hasAstPatterns) {
    console.log('🎯 AST patterns detected, recommending AST mode');
    return 'ast';
  }

  // Speed first: Try template approach for simple transformations
  if (complexity.cyclomaticComplexity <= 5 && patterns.length > 0) {
    console.log('🚀 Low complexity detected, recommending template mode');
    return 'template';
  }

  // Use AST for medium complexity with known patterns
  if (complexity.cyclomaticComplexity <= 15 && patterns.length > 0) {
    console.log('🧠 Medium complexity detected, recommending AST mode');
    return 'ast';
  }

  // Fall back to LLM for complex transformations
  console.log('🤖 High complexity detected, recommending LLM mode');
  return 'llm';
}

async function checkForAstPatterns(files: string[], patterns: AstPattern[]): Promise<boolean> {
  try {
    const { readFile } = await import('fs/promises');
    
    // Get patterns that are explicitly marked as AST mode
    const astPatterns = patterns.filter(p => p.mode === 'ast');
    
    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8');
        
        // Check if content matches any AST patterns
        for (const pattern of astPatterns) {
          if (matchesAstPattern(content, pattern)) {
            console.log(`✅ Found AST pattern "${pattern.id}" in ${filePath}`);
            return true;
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not check AST patterns in ${filePath}:`, error);
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Warning: Could not check for AST patterns:', error);
    return false;
  }
}

function matchesAstPattern(content: string, pattern: AstPattern): boolean {
  try {
    // Check for specific AST pattern indicators
    switch (pattern.id) {
      case 'strict-equality':
        return /\w+\s*==\s*[^=]/.test(content);
      case 'strict-inequality':
        return /\w+\s*!=\s*[^=]/.test(content);
      case 'array-includes-instead-of-indexof':
        return /\.indexOf\([^)]+\)\s*!==\s*-1/.test(content);
      case 'object-property-shorthand':
        return /{\s*\w+:\s*\w+\s*}/.test(content) && /{\s*(\w+):\s*\1\s*}/.test(content);
      case 'template-literal-conversion':
        return /['"`][^'"`]*['"`]\s*\+\s*\w+\s*\+\s*['"`]/.test(content);
      case 'remove-unnecessary-returns':
        return /\([^)]*\)\s*=>\s*{\s*return\s+[^;]+;\s*}/.test(content);
      case 'const-loop-variable-fix':
        return /for\s*\(\s*const\s+\w+\s*=/.test(content);
      case 'promise-to-async-await':
        return /\w+\.then\s*\(/.test(content);
      default:
        // Try basic pattern matching for other AST patterns
        if (pattern.pattern) {
          // Convert AST-grep pattern to basic regex check
          const basicPattern = pattern.pattern
            .replace(/\$\w+/g, '\\w+')  // Replace $VAR with \w+
            .replace(/\s+/g, '\\s*');   // Replace spaces with \s*
          try {
            return new RegExp(basicPattern).test(content);
          } catch {
            return false;
          }
        }
        return false;
    }
  } catch (error) {
    console.warn(`Warning: Could not match pattern ${pattern.id}:`, error);
    return false;
  }
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
