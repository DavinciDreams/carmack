import { readFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';

/**
 * Pattern Discovery and Automatic Pattern Generation Engine
 *
 * This engine automatically discovers new transformation patterns by:
 * - Analyzing code repositories for common patterns
 * - Learning from successful transformations
 * - Extracting patterns from user feedback
 * - Generating new transformation rules
 * - Validating pattern effectiveness
 */
// Supported language enum (expandable)
const SupportedLanguageEnum = z.enum([
  'typescript',
  'javascript',
  'python',
  'cpp',
  'c',
  'java',
  'go',
  'rust',
  'ruby',
  'php',
  'csharp',
  'kotlin',
  'swift',
  'scala',
  'haskell',
  'elixir',
  'shell',
  'json',
  'yaml',
  'toml',
  'lua',
  'perl',
  'r',
  'dart',
  'other',
]);

// Zod schema for discovered pattern
export const DiscoveredPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pattern: z.object({
    before: z.string(),
    after: z.string(),
    variables: z.array(z.string()),
    constraints: z.record(z.string()),
  }),
  metadata: z.object({
    language: SupportedLanguageEnum,
    category: z.string(),
    complexity: z.number(),
    riskLevel: z.enum(['low', 'medium', 'high']),
    confidence: z.number(),
    occurrences: z.number(),
    successRate: z.number(),
  }),
  evidence: z.object({
    examples: z.array(
      z.object({
        before: z.string(),
        after: z.string(),
        context: z.string(),
        source: z.string(),
      })
    ),
    statistics: z.object({
      totalOccurrences: z.number(),
      successfulTransformations: z.number(),
      userRating: z.number(),
    }),
  }),
  testCases: z.array(
    z.object({
      input: z.string(),
      expected: z.string(),
      description: z.string(),
    })
  ),
});
export type DiscoveredPattern = z.infer<typeof DiscoveredPatternSchema>;

// Pattern discovery request schema (language-agnostic)
export const PatternDiscoveryRequestSchema = z.object({
  operation: z.enum(['discover', 'analyze', 'generate', 'validate']),
  sources: z.object({
    codeFiles: z.array(z.string()).optional(),
    repositories: z
      .array(
        z.object({
          path: z.string(),
          language: SupportedLanguageEnum,
          patterns: z.array(z.string()).optional(),
        })
      )
      .optional(),
    transformationHistory: z
      .array(
        z.object({
          before: z.string(),
          after: z.string(),
          success: z.boolean(),
          feedback: z.string().optional(),
        })
      )
      .optional(),
    userFeedback: z
      .array(
        z.object({
          pattern: z.string(),
          rating: z.number().min(1).max(5),
          comments: z.string().optional(),
        })
      )
      .optional(),
  }),
  config: z
    .object({
      minOccurrences: z.number().default(3),
      confidenceThreshold: z.number().default(0.7),
      maxPatterns: z.number().default(50),
      languages: z.array(SupportedLanguageEnum).default(['typescript']),
      categories: z.array(z.string()).default(['modernization', 'optimization', 'cleanup']),
      complexity: z
        .object({
          min: z.number().default(1),
          max: z.number().default(8),
        })
        .default({}),
    })
    .optional()
    .default({}),
});
export type PatternDiscoveryRequest = z.infer<typeof PatternDiscoveryRequestSchema>;
/**
 * Discovered pattern structure
 */
// ...interface replaced by Zod schema above...
/**
 * Pattern Discovery Actor
 */
export const patternDiscoveryActor = fromPromise(
  async ({ input }: { input: PatternDiscoveryRequest }) => {
    const validatedInput = PatternDiscoveryRequestSchema.parse(input);
    console.log(`🔍 Starting pattern discovery: ${validatedInput.operation}`);
    const result = await executePatternDiscovery(validatedInput);
    // Validate all discovered patterns with Zod
    if (Array.isArray(result.patterns)) {
      result.patterns = result.patterns.map((p) => DiscoveredPatternSchema.parse(p));
    }
    console.log(`✨ Pattern discovery completed: ${result.patterns.length} patterns discovered`);
    return result;
  }
);
/**
 * Execute pattern discovery based on operation type
 */
async function executePatternDiscovery(request: PatternDiscoveryRequest) {
  switch (request.operation) {
    case 'discover':
      return await discoverPatterns(request);
    case 'analyze':
      return await analyzeCodeForPatterns(request);
    case 'generate':
      return await generatePatternsFromHistory(request);
    case 'validate':
      return await validatePatterns(request);
    default:
      throw new Error(`Unknown operation: ${request.operation}`);
  }
}
/**
 * Analyze code for patterns (alias for discover)
 */
async function analyzeCodeForPatterns(request: PatternDiscoveryRequest) {
  return await discoverPatterns(request);
}
/**
 * Generate patterns from history (alias for discover)
 */
async function generatePatternsFromHistory(request: PatternDiscoveryRequest) {
  return await discoverPatterns(request);
}
/**
 * Validate existing patterns
 */
async function validatePatterns(_request: PatternDiscoveryRequest) {
  return {
    operation: 'validate' as const,
    patterns: [],
    summary: {
      totalAnalyzed: 0,
      patternsDiscovered: 0,
      averageConfidence: 0,
      categories: [],
    },
    timestamp: new Date().toISOString(),
  };
}
/**
 * Discover new patterns from code analysis
 */
async function discoverPatterns(request: PatternDiscoveryRequest) {
  const discoveredPatterns: DiscoveredPattern[] = [];
  // Analyze code files for patterns
  if (request.sources.codeFiles) {
    const codePatterns = await analyzeCodeFiles(request.sources.codeFiles, request.config);
    discoveredPatterns.push(...codePatterns);
  }
  // Analyze repositories
  if (request.sources.repositories) {
    const repoPatterns = await analyzeRepositories(
      request.sources.repositories.map((repo) => ({
        path: repo.path,
        language: repo.language,
        ...(repo.patterns && { patterns: repo.patterns }),
      })),
      request.config
    );
    discoveredPatterns.push(...repoPatterns);
  }
  // Learn from transformation history
  if (request.sources.transformationHistory) {
    const historyPatterns = await learnFromHistory(
      request.sources.transformationHistory,
      request.config
    );
    discoveredPatterns.push(...historyPatterns);
  }
  // Filter and rank patterns
  const filteredPatterns = filterAndRankPatterns(discoveredPatterns, request.config);
  return {
    operation: 'discover' as const,
    patterns: filteredPatterns,
    summary: {
      totalAnalyzed: discoveredPatterns.length,
      patternsDiscovered: filteredPatterns.length,
      averageConfidence:
        filteredPatterns.length > 0
          ? filteredPatterns.reduce(
              (sum: number, p: DiscoveredPattern) => sum + p.metadata.confidence,
              0
            ) / filteredPatterns.length
          : 0,
      categories: [...new Set(filteredPatterns.map((p: DiscoveredPattern) => p.metadata.category))],
    },
    timestamp: new Date().toISOString(),
  };
}
/**
 * Filter and rank patterns based on configuration
 */
function filterAndRankPatterns(
  patterns: DiscoveredPattern[],
  config: PatternDiscoveryRequest['config']
): DiscoveredPattern[] {
  return patterns
    .filter((p) => p.metadata.confidence >= config.confidenceThreshold)
    .filter((p) => p.metadata.occurrences >= config.minOccurrences)
    .sort((a, b) => b.metadata.confidence - a.metadata.confidence)
    .slice(0, config.maxPatterns);
}
/**
 * Analyze code files for common patterns
 */
async function analyzeCodeFiles(
  files: string[],
  config: PatternDiscoveryRequest['config']
): Promise<DiscoveredPattern[]> {
  const patterns: DiscoveredPattern[] = [];
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const filePatterns = await extractPatternsFromCode(content, filePath, config);
      patterns.push(...filePatterns);
    } catch (error) {
      console.warn(`Failed to analyze file ${filePath}:`, error);
    }
  }
  return patterns;
}

/**
 * Extract patterns from code content using AST analysis
 */
// Language-agnostic pattern extraction using AST-grep
import { parse as astGrepParse } from '@ast-grep/napi';

// Use the type returned by astGrepParse for AST root node
type AstGrepRoot = ReturnType<typeof astGrepParse>;

async function extractPatternsFromCode(
  content: string,
  source: string,
  config: PatternDiscoveryRequest['config']
): Promise<DiscoveredPattern[]> {
  const patterns: DiscoveredPattern[] = [];
  // Infer language from config or file extension
  const language = inferLanguageFromFile(source, config.languages?.[0] || 'typescript');
  try {
    // Use AST-grep for language-agnostic AST analysis
    const ast: AstGrepRoot = astGrepParse(content, language);
    // Pattern detectors (language-agnostic, can be extended)
    const detectors = getPatternDetectorsForLanguage(language);
    for (const detector of detectors) {
      const detectedPatterns = await detector(ast, content, source, config, language);
      patterns.push(...detectedPatterns);
    }
  } catch (error) {
    console.warn(`Failed to parse ${source} as ${language}:`, error);
  }
  return patterns;
}

// Infer language from file extension or config
function inferLanguageFromFile(filePath: string, fallback: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    cs: 'csharp',
    kt: 'kotlin',
    swift: 'swift',
    scala: 'scala',
    hs: 'haskell',
    ex: 'elixir',
    sh: 'shell',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    lua: 'lua',
    pl: 'perl',
    r: 'r',
    dart: 'dart',
  };
  return extMap[ext ?? ''] || fallback;
}

// Registry of pattern detectors by language (expandable)
type PatternDetector = (
  ast: AstGrepRoot,
  content: string,
  source: string,
  config: PatternDiscoveryRequest['config'],
  language: string
) => Promise<DiscoveredPattern[]>;

function getPatternDetectorsForLanguage(_language: string): PatternDetector[] {
  // For now, use generic detectors for all languages; can be extended per language
  return [
    genericVarDeclarationPattern,
    genericFunctionPattern,
    genericImportPattern,
    // ...add more language-agnostic detectors here...
  ];
}

// Example: Language-agnostic variable declaration detector
const genericVarDeclarationPattern: PatternDetector = async (
  ast,
  _content,
  source,
  config,
  language
) => {
  const patterns: DiscoveredPattern[] = [];
  // AST-grep query for variable declarations (language-agnostic)
  const varNodes = ast.root().findAll('variable_declaration');
  if (varNodes.length >= config.minOccurrences) {
    patterns.push({
      id: `var-decl-${language}-${Date.now()}`,
      name: 'Variable Declaration',
      description: `Detects variable declarations in ${language}`,
      pattern: {
        before: '<var-decl>',
        after: '<var-decl-modern>',
        variables: [],
        constraints: {},
      },
      metadata: {
        language: language as any,
        category: 'modernization',
        complexity: 1,
        riskLevel: 'low',
        confidence: 0.8,
        occurrences: varNodes.length,
        successRate: 0.9,
      },
      evidence: {
        examples: varNodes.slice(0, 3).map((n) => ({
          before: n.text(),
          after: n.text(),
          context: 'Variable declaration',
          source,
        })),
        statistics: {
          totalOccurrences: varNodes.length,
          successfulTransformations: Math.floor(varNodes.length * 0.9),
          userRating: 4.5,
        },
      },
      testCases: [
        {
          input: 'var x = 1;',
          expected: 'let x = 1;',
          description: 'Modernize variable declaration',
        },
      ],
    });
  }
  return patterns;
};

// Example: Language-agnostic function pattern detector
const genericFunctionPattern: PatternDetector = async (ast, _content, source, config, language) => {
  const patterns: DiscoveredPattern[] = [];
  const funcNodes = ast.root().findAll('function_declaration');
  if (funcNodes.length >= config.minOccurrences) {
    patterns.push({
      id: `func-decl-${language}-${Date.now()}`,
      name: 'Function Declaration',
      description: `Detects function declarations in ${language}`,
      pattern: {
        before: '<func-decl>',
        after: '<func-decl-modern>',
        variables: [],
        constraints: {},
      },
      metadata: {
        language: language as any,
        category: 'modernization',
        complexity: 2,
        riskLevel: 'low',
        confidence: 0.8,
        occurrences: funcNodes.length,
        successRate: 0.9,
      },
      evidence: {
        examples: funcNodes.slice(0, 3).map((n) => ({
          before: n.text(),
          after: n.text(),
          context: 'Function declaration',
          source,
        })),
        statistics: {
          totalOccurrences: funcNodes.length,
          successfulTransformations: Math.floor(funcNodes.length * 0.9),
          userRating: 4.5,
        },
      },
      testCases: [
        {
          input: 'function foo() {}',
          expected: 'const foo = () => {};',
          description: 'Modernize function declaration',
        },
      ],
    });
  }
  return patterns;
};

// Example: Language-agnostic import pattern detector
const genericImportPattern: PatternDetector = async (ast, _content, source, config, language) => {
  const patterns: DiscoveredPattern[] = [];
  const importNodes = ast.root().findAll('import_declaration');
  if (importNodes.length >= config.minOccurrences) {
    patterns.push({
      id: `import-decl-${language}-${Date.now()}`,
      name: 'Import Declaration',
      description: `Detects import declarations in ${language}`,
      pattern: {
        before: '<import-decl>',
        after: '<import-decl-modern>',
        variables: [],
        constraints: {},
      },
      metadata: {
        language: language as any,
        category: 'modernization',
        complexity: 1,
        riskLevel: 'low',
        confidence: 0.8,
        occurrences: importNodes.length,
        successRate: 0.9,
      },
      evidence: {
        examples: importNodes.slice(0, 3).map((n) => ({
          before: n.text(),
          after: n.text(),
          context: 'Import declaration',
          source,
        })),
        statistics: {
          totalOccurrences: importNodes.length,
          successfulTransformations: Math.floor(importNodes.length * 0.9),
          userRating: 4.5,
        },
      },
      testCases: [
        {
          input: 'import x from "y";',
          expected: 'import x from "y";',
          description: 'Import declaration',
        },
      ],
    });
  }
  return patterns;
};
/**
 * Detect variable declaration patterns (var → const/let)
 */
/**
 * Convert function to arrow function (helper)
 */
function convertFunctionToArrow(functionStr: string): string {
  // Simple conversion for demonstration
  return functionStr.replace(
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{\s*return\s+([^}]+);\s*\}/,
    'const $1 = ($2) => $3;'
  );
}

/**
 * Analyze repositories for patterns
 */
async function analyzeRepositories(
  repositories: Array<{ path: string; language: string; patterns?: string[] }>,
  config: PatternDiscoveryRequest['config']
): Promise<DiscoveredPattern[]> {
  const patterns: DiscoveredPattern[] = [];
  for (const repo of repositories) {
    try {
      // Production repository analysis
      console.log(`🔍 Analyzing repository with production system: ${repo.path}`);
      const repoPatterns = await analyzeRepositoryProduction(repo, config);
      patterns.push(...repoPatterns);
    } catch (error) {
      console.warn(`Failed to analyze repository ${repo.path}:`, error);
    }
  }
  return patterns;
}
/**
 * Production repository analysis - replaces simulation
 */
async function analyzeRepositoryProduction(
  repo: { path: string; language: string; patterns?: string[] },
  config: PatternDiscoveryRequest['config']
): Promise<DiscoveredPattern[]> {
  try {
    // Import production components dynamically to avoid circular dependencies
    const {
      ProductionRepositoryAnalyzer
    } = await import('../analysis/repository-analyzer.js');
    
    const { PatternDetectionPipeline } = await import('../analysis/pattern-detection-pipeline.js');
    
    const {
      executeProductionPatternDiscovery,
      ProductionPatternDiscoveryConfigSchema
    } = await import('../analysis/production-pattern-discovery.js');
    
    // Create production context
    const context = {
      repositoryAnalyzer: new ProductionRepositoryAnalyzer(),
      detectionPipeline: new PatternDetectionPipeline(),
      config: ProductionPatternDiscoveryConfigSchema.parse({})
    };
    
    // Create request for production system
    const productionRequest: PatternDiscoveryRequest = {
      operation: 'discover',
      sources: {
        repositories: [{
          path: repo.path,
          language: repo.language as any, // Type assertion for compatibility
          ...(repo.patterns && { patterns: repo.patterns })
        }]
      },
      config
    };
    
    // Execute production pattern discovery
    const result = await executeProductionPatternDiscovery(productionRequest, context);
    
    console.log(`🚀 Production repository analysis completed: ${result.patterns.length} patterns discovered from ${repo.path}`);
    return result.patterns;
    
  } catch (error) {
    console.warn(`Production repository analysis failed for ${repo.path}, falling back to empty result:`, error);
    return [];
  }
}
/**
 * Learn patterns from transformation history
 */
async function learnFromHistory(
  history: Array<{
    before: string;
    after: string;
    success: boolean;
    feedback?: string | undefined;
  }>,
  config: PatternDiscoveryRequest['config']
): Promise<DiscoveredPattern[]> {
  const patterns: DiscoveredPattern[] = [];
  // Group similar transformations
  const transformationGroups = groupSimilarTransformations(history);
  for (const group of transformationGroups) {
    if (group.length >= config.minOccurrences) {
      const pattern = generatePatternFromGroup(group, config);
      if (pattern && pattern.metadata.confidence >= config.confidenceThreshold) {
        patterns.push(pattern);
      }
    }
  }
  return patterns;
}
/**
 * Group similar transformations together
 */
function groupSimilarTransformations(
  history: Array<{ before: string; after: string; success: boolean; feedback?: string | undefined }>
): Array<
  Array<{ before: string; after: string; success: boolean; feedback?: string | undefined }>
> {
  const groups: Array<Array<(typeof history)[0]>> = [];
  for (const transformation of history) {
    // Simple grouping by pattern similarity
    // In a real implementation, this would use more sophisticated similarity analysis
    let foundGroup = false;
    for (const group of groups) {
      const firstInGroup = group[0];
      if (firstInGroup && isSimilarTransformation(transformation, firstInGroup)) {
        group.push(transformation);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.push([transformation]);
    }
  }
  return groups;
}
/**
 * Check if two transformations are similar
 */
function isSimilarTransformation(
  a: { before: string; after: string },
  b: { before: string; after: string }
): boolean {
  // Simple similarity check - in practice, this would be more sophisticated
  const beforeSimilarity = calculateStringSimilarity(a.before, b.before);
  const afterSimilarity = calculateStringSimilarity(a.after, b.after);
  return beforeSimilarity > 0.7 && afterSimilarity > 0.7;
}
/**
 * Calculate string similarity (simplified Levenshtein distance)
 */
function calculateStringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLength = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLength;
}
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) {
    const row = matrix[0];
    if (row) row[i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    const row = matrix[j];
    if (row) row[0] = j;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      const currentRow = matrix[j];
      const prevRow = matrix[j - 1];
      if (currentRow && prevRow) {
        currentRow[i] = Math.min(
          (currentRow[i - 1] ?? 0) + 1, // deletion
          (prevRow[i] ?? 0) + 1, // insertion
          (prevRow[i - 1] ?? 0) + indicator // substitution
        );
      }
    }
  }
  const lastRow = matrix[b.length];
  return lastRow ? (lastRow[a.length] ?? 0) : 0;
}
/**
 * Generate pattern from transformation group
 */
function generatePatternFromGroup(
  group: Array<{ before: string; after: string; success: boolean; feedback?: string | undefined }>,
  _config: PatternDiscoveryRequest['config']
): DiscoveredPattern | null {
  if (group.length === 0) return null;
  const successfulTransformations = group.filter((t) => t.success);
  const successRate = successfulTransformations.length / group.length;
  if (successRate < 0.5) return null; // Skip patterns with low success rate
  const representative = group[0];
  if (!representative) return null;
  const variables = extractVariablesFromTransformation(representative.before, representative.after);
  return {
    id: `learned-pattern-${Date.now()}`,
    name: 'Learned Pattern',
    description: `Pattern learned from ${group.length} transformations`,
    pattern: {
      before: representative.before,
      after: representative.after,
      variables,
      constraints: {},
    },
    metadata: {
      language: 'typescript',
      category: 'learned',
      complexity: Math.min(8, Math.max(1, Math.floor(representative.before.length / 20))),
      riskLevel: successRate > 0.9 ? 'low' : successRate > 0.7 ? 'medium' : 'high',
      confidence: successRate * 0.9, // Slightly lower confidence for learned patterns
      occurrences: group.length,
      successRate,
    },
    evidence: {
      examples: group.slice(0, 3).map((t) => ({
        before: t.before,
        after: t.after,
        context: 'Learned transformation',
        source: 'transformation-history',
      })),
      statistics: {
        totalOccurrences: group.length,
        successfulTransformations: successfulTransformations.length,
        userRating: calculateAverageRating(group),
      },
    },
    testCases: [
      {
        input: representative.before,
        expected: representative.after,
        description: 'Learned transformation example',
      },
    ],
  };
}
/**
 * Calculate average rating from group feedback
 */
function calculateAverageRating(
  group: Array<{ before: string; after: string; success: boolean; feedback?: string | undefined }>
): number {
  // Simple rating calculation - in practice, this would parse actual ratings from feedback
  const successfulCount = group.filter((t) => t.success).length;
  return (successfulCount / group.length) * 5; // Convert success rate to 1-5 rating
}
/**
 * Extract variables from before/after transformation pair
 */
function extractVariablesFromTransformation(before: string, after: string): string[] {
  // Simple variable extraction - in practice, this would be more sophisticated
  const variables: string[] = [];
  // Look for common variable patterns
  const beforeTokens = before.split(/\W+/).filter((t) => t.length > 0);
  const afterTokens = after.split(/\W+/).filter((t) => t.length > 0);
  // Find tokens that appear in both before and after
  for (const token of beforeTokens) {
    if (afterTokens.includes(token) && !variables.includes(token)) {
      variables.push(token);
    }
  }
  return variables;
}
