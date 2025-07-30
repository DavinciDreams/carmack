/**
 * AST Analyzer for TensorRT-LLM Knowledge Graph Ingestion
 *
 * Uses ast-grep to extract Concrete Syntax Tree (CST) structures from
 * C++/CUDA/Python files with TensorRT-specific patterns. Follows Carmack's
 * principles of efficient processing and type safety.
 */

import { z } from 'zod';
import { SgNode, js } from '@ast-grep/napi';
import type { FileContent } from './repository-manager.ts';

// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * AST configuration schema
 */
export const ASTConfigSchema = z.object({
  maxDepth: z.number().int().positive().default(10),
  includeComments: z.boolean().default(false),
  includeWhitespace: z.boolean().default(false),
  extractPatterns: z.boolean().default(true),
  maxNodeSize: z.number().int().positive().default(10000),
});

export type ASTConfig = z.infer<typeof ASTConfigSchema>;

/**
 * CST node schema
 */
export const CSTNodeSchema = z.object({
  id: z.string().uuid(),
  nodeType: z.string(),
  nodeKind: z.string().optional(),
  nodeText: z.string().optional(),
  startLine: z.number().int().positive(),
  startColumn: z.number().int().min(0),
  endLine: z.number().int().positive(),
  endColumn: z.number().int().min(0),
  parentId: z.string().uuid().optional(),
  depthLevel: z.number().int().min(0),
  childIndex: z.number().int().min(0).optional(),
  astGrepPattern: z.string().optional(),
  patternVariables: z.record(z.unknown()).default({}),
  language: z.string(),
  syntaxKind: z.string().optional(),
  nodeStructure: z.record(z.unknown()),
  semanticRole: z.string().optional(),
  scopeType: z.string().optional(),
  visibility: z.enum(['public', 'private', 'protected', 'internal']).default('private'),
  complexityContribution: z.number().min(0).default(0),
  isEntryPoint: z.boolean().default(false),
  isTestCode: z.boolean().default(false),
});

export type CSTNode = z.infer<typeof CSTNodeSchema>;

/**
 * TensorRT-specific pattern schema
 */
export const TensorRTPatternSchema = z.object({
  name: z.string(),
  language: z.enum(['cpp', 'cuda', 'python']),
  pattern: z.string(),
  description: z.string(),
  category: z.enum(['scheduler', 'memory', 'kernel', 'binding', 'optimization', 'runtime']),
  priority: z.number().int().min(1).max(10).default(5),
  extractVariables: z.array(z.string()).default([]),
});

export type TensorRTPattern = z.infer<typeof TensorRTPatternSchema>;

/**
 * Analysis result schema
 */
export const AnalysisResultSchema = z.object({
  fileId: z.string().uuid(),
  filePath: z.string(),
  language: z.string(),
  totalNodes: z.number().int().min(0),
  maxDepth: z.number().int().min(0),
  nodes: z.array(CSTNodeSchema),
  patterns: z.array(z.object({
    patternName: z.string(),
    matches: z.array(z.object({
      nodeId: z.string().uuid(),
      variables: z.record(z.unknown()),
      confidence: z.number().min(0).max(1),
    })),
  })),
  metrics: z.object({
    complexity: z.number().min(0),
    maintainability: z.number().min(0).max(1),
    testability: z.number().min(0).max(1),
  }),
  processingTime: z.number().int().min(0),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// =============================================================================
// TENSORRT PATTERNS
// =============================================================================

/**
 * TensorRT-specific patterns for different categories
 */
export const TENSORRT_PATTERNS: TensorRTPattern[] = [
  // Scheduler patterns
  {
    name: 'scheduler_class',
    language: 'cpp',
    pattern: 'class $CLASS : public $BASE { $$$BODY }',
    description: 'TensorRT scheduler class definitions',
    category: 'scheduler',
    priority: 9,
    extractVariables: ['CLASS', 'BASE', 'BODY'],
  },
  {
    name: 'scheduler_method',
    language: 'cpp',
    pattern: '$RETURN_TYPE schedule($$$PARAMS) { $$$BODY }',
    description: 'Scheduler method implementations',
    category: 'scheduler',
    priority: 8,
    extractVariables: ['RETURN_TYPE', 'PARAMS', 'BODY'],
  },
  {
    name: 'batch_scheduler',
    language: 'cpp',
    pattern: 'BatchScheduler::$METHOD($$$ARGS)',
    description: 'Batch scheduler method calls',
    category: 'scheduler',
    priority: 7,
    extractVariables: ['METHOD', 'ARGS'],
  },

  // Memory management patterns
  {
    name: 'memory_allocator',
    language: 'cpp',
    pattern: 'class $CLASS : public IAllocator { $$$BODY }',
    description: 'Memory allocator implementations',
    category: 'memory',
    priority: 9,
    extractVariables: ['CLASS', 'BODY'],
  },
  {
    name: 'cuda_malloc',
    language: 'cpp',
    pattern: 'cudaMalloc($PTR, $SIZE)',
    description: 'CUDA memory allocation calls',
    category: 'memory',
    priority: 8,
    extractVariables: ['PTR', 'SIZE'],
  },
  {
    name: 'memory_pool',
    language: 'cpp',
    pattern: 'MemoryPool::$METHOD($$$ARGS)',
    description: 'Memory pool operations',
    category: 'memory',
    priority: 7,
    extractVariables: ['METHOD', 'ARGS'],
  },
  {
    name: 'buffer_manager',
    language: 'cpp',
    pattern: 'BufferManager::$METHOD($$$ARGS)',
    description: 'Buffer manager operations',
    category: 'memory',
    priority: 7,
    extractVariables: ['METHOD', 'ARGS'],
  },

  // CUDA kernel patterns
  {
    name: 'cuda_kernel',
    language: 'cuda',
    pattern: '__global__ void $KERNEL($$$PARAMS) { $$$BODY }',
    description: 'CUDA kernel function definitions',
    category: 'kernel',
    priority: 9,
    extractVariables: ['KERNEL', 'PARAMS', 'BODY'],
  },
  {
    name: 'cuda_device_function',
    language: 'cuda',
    pattern: '__device__ $RETURN_TYPE $FUNCTION($$$PARAMS) { $$$BODY }',
    description: 'CUDA device function definitions',
    category: 'kernel',
    priority: 8,
    extractVariables: ['RETURN_TYPE', 'FUNCTION', 'PARAMS', 'BODY'],
  },
  {
    name: 'kernel_launch',
    language: 'cpp',
    pattern: '$KERNEL<<<$GRID, $BLOCK>>>($$$ARGS)',
    description: 'CUDA kernel launch configurations',
    category: 'kernel',
    priority: 8,
    extractVariables: ['KERNEL', 'GRID', 'BLOCK', 'ARGS'],
  },
  {
    name: 'shared_memory',
    language: 'cuda',
    pattern: '__shared__ $TYPE $VAR[$SIZE]',
    description: 'Shared memory declarations',
    category: 'kernel',
    priority: 7,
    extractVariables: ['TYPE', 'VAR', 'SIZE'],
  },

  // Python binding patterns
  {
    name: 'pybind_module',
    language: 'cpp',
    pattern: 'PYBIND11_MODULE($MODULE, $VAR) { $$$BODY }',
    description: 'PyBind11 module definitions',
    category: 'binding',
    priority: 9,
    extractVariables: ['MODULE', 'VAR', 'BODY'],
  },
  {
    name: 'pybind_class',
    language: 'cpp',
    pattern: 'py::class_<$CLASS>($MODULE, "$NAME")',
    description: 'PyBind11 class bindings',
    category: 'binding',
    priority: 8,
    extractVariables: ['CLASS', 'MODULE', 'NAME'],
  },
  {
    name: 'python_wrapper',
    language: 'python',
    pattern: 'class $CLASS($BASE): $$$BODY',
    description: 'Python wrapper classes',
    category: 'binding',
    priority: 7,
    extractVariables: ['CLASS', 'BASE', 'BODY'],
  },

  // Optimization patterns
  {
    name: 'tensorrt_builder',
    language: 'cpp',
    pattern: 'IBuilder* $VAR = createInferBuilder($LOGGER)',
    description: 'TensorRT builder creation',
    category: 'optimization',
    priority: 8,
    extractVariables: ['VAR', 'LOGGER'],
  },
  {
    name: 'optimization_profile',
    language: 'cpp',
    pattern: 'IOptimizationProfile* $VAR = $BUILDER->createOptimizationProfile()',
    description: 'Optimization profile creation',
    category: 'optimization',
    priority: 7,
    extractVariables: ['VAR', 'BUILDER'],
  },
  {
    name: 'engine_build',
    language: 'cpp',
    pattern: 'ICudaEngine* $VAR = $BUILDER->buildEngineWithConfig($NETWORK, $CONFIG)',
    description: 'TensorRT engine building',
    category: 'optimization',
    priority: 8,
    extractVariables: ['VAR', 'BUILDER', 'NETWORK', 'CONFIG'],
  },

  // Runtime patterns
  {
    name: 'execution_context',
    language: 'cpp',
    pattern: 'IExecutionContext* $VAR = $ENGINE->createExecutionContext()',
    description: 'Execution context creation',
    category: 'runtime',
    priority: 8,
    extractVariables: ['VAR', 'ENGINE'],
  },
  {
    name: 'inference_execute',
    language: 'cpp',
    pattern: '$CONTEXT->executeV2($BINDINGS)',
    description: 'Inference execution calls',
    category: 'runtime',
    priority: 9,
    extractVariables: ['CONTEXT', 'BINDINGS'],
  },
];

// =============================================================================
// ERRORS
// =============================================================================

export class ASTAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ASTAnalysisError';
  }
}

// =============================================================================
// AST ANALYZER
// =============================================================================

/**
 * AST Analyzer for extracting CST structures and patterns
 */
export class ASTAnalyzer {
  private config: ASTConfig;
  private patterns: Map<string, TensorRTPattern>;

  constructor(config?: Partial<ASTConfig>) {
    this.config = ASTConfigSchema.parse(config || {});
    this.patterns = new Map();
    
    // Load TensorRT patterns
    for (const pattern of TENSORRT_PATTERNS) {
      this.patterns.set(pattern.name, pattern);
    }
  }

  /**
   * Analyze file content and extract CST
   */
  async analyzeFile(fileContent: FileContent): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Analyzing AST for: ${fileContent.relativePath}`);

      const language = this.normalizeLanguage(fileContent.language);
      const astRoot = this.parseContent(fileContent.content, language);
      
      if (!astRoot) {
        throw new ASTAnalysisError(
          'Failed to parse file content',
          'PARSE_FAILED',
          fileContent.relativePath
        );
      }

      // Extract CST nodes
      const nodes = this.extractNodes(astRoot, language, fileContent.relativePath);
      
      // Apply TensorRT patterns
      const patternMatches = this.applyPatterns(astRoot, language);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(nodes, patternMatches);
      
      const result: AnalysisResult = {
        fileId: crypto.randomUUID(),
        filePath: fileContent.relativePath,
        language,
        totalNodes: nodes.length,
        maxDepth: Math.max(...nodes.map(n => n.depthLevel), 0),
        nodes,
        patterns: patternMatches,
        metrics,
        processingTime: Date.now() - startTime,
      };

      console.log(`✅ Analyzed ${nodes.length} nodes in ${result.processingTime}ms`);
      return AnalysisResultSchema.parse(result);
    } catch (error) {
      throw new ASTAnalysisError(
        'Failed to analyze file',
        'ANALYSIS_FAILED',
        fileContent.relativePath,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Batch analyze multiple files
   */
  async analyzeFiles(fileContents: FileContent[]): Promise<AnalysisResult[]> {
    console.log(`🔄 Batch analyzing ${fileContents.length} files...`);
    
    const results: AnalysisResult[] = [];
    
    for (const fileContent of fileContents) {
      try {
        const result = await this.analyzeFile(fileContent);
        results.push(result);
      } catch (error) {
        console.warn(`⚠️ Failed to analyze ${fileContent.relativePath}:`, error);
        // Continue with other files
      }
    }
    
    console.log(`✅ Successfully analyzed ${results.length}/${fileContents.length} files`);
    return results;
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: TensorRTPattern): void {
    const validatedPattern = TensorRTPatternSchema.parse(pattern);
    this.patterns.set(validatedPattern.name, validatedPattern);
  }

  /**
   * Get available patterns
   */
  getPatterns(): TensorRTPattern[] {
    return Array.from(this.patterns.values());
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Parse content using appropriate ast-grep language
   */
  private parseContent(content: string, language: string): SgNode | null {
    try {
      switch (language) {
        case 'javascript':
        case 'typescript':
          return js.parse(content).root();
        case 'cpp':
        case 'cuda':
        case 'python':
        default:
          // For now, only support JavaScript/TypeScript with ast-grep
          // Other languages will be handled with simpler text-based analysis
          console.warn(`⚠️ Language ${language} not fully supported by ast-grep, using text analysis`);
          return null;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse ${language} content:`, error);
      return null;
    }
  }

  /**
   * Extract CST nodes recursively
   */
  private extractNodes(
    node: SgNode,
    language: string,
    filePath: string,
    parentId?: string,
    depth = 0,
    childIndex = 0
  ): CSTNode[] {
    if (depth > this.config.maxDepth) {
      return [];
    }

    const nodeId = crypto.randomUUID();
    const range = node.range();
    const nodeText = node.text();

    // Skip if node is too large
    if (nodeText.length > this.config.maxNodeSize) {
      console.warn(`⚠️ Skipping large node in ${filePath} (${nodeText.length} chars)`);
      return [];
    }

    const cstNode: CSTNode = {
      id: nodeId,
      nodeType: String(node.kind()),
      nodeKind: String(node.kind()),
      nodeText: this.config.includeWhitespace ? nodeText : nodeText.trim(),
      startLine: range.start.line + 1, // Convert to 1-based
      startColumn: range.start.column,
      endLine: range.end.line + 1,
      endColumn: range.end.column,
      parentId,
      depthLevel: depth,
      childIndex,
      patternVariables: {},
      language,
      syntaxKind: String(node.kind()),
      nodeStructure: this.extractNodeStructure(node),
      semanticRole: this.inferSemanticRole(node),
      scopeType: this.inferScopeType(node),
      visibility: this.inferVisibility(node),
      complexityContribution: this.calculateNodeComplexity(node),
      isEntryPoint: this.isEntryPoint(node),
      isTestCode: this.isTestCode(node, filePath),
    };

    const nodes = [cstNode];

    // Process children
    const children = node.children();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child) {
        const childNodes = this.extractNodes(
          child,
          language,
          filePath,
          nodeId,
          depth + 1,
          i
        );
        nodes.push(...childNodes);
      }
    }

    return nodes;
  }

  /**
   * Apply TensorRT patterns to AST
   */
  private applyPatterns(root: SgNode, language: string): Array<{
    patternName: string;
    matches: Array<{
      nodeId: string;
      variables: Record<string, unknown>;
      confidence: number;
    }>;
  }> {
    const results: Array<{
      patternName: string;
      matches: Array<{
        nodeId: string;
        variables: Record<string, unknown>;
        confidence: number;
      }>;
    }> = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.language !== language && 
          !(pattern.language === 'cpp' && language === 'cuda')) {
        continue;
      }

      try {
        const matches = root.findAll(pattern.pattern);
        const patternMatches = matches.map(match => ({
          nodeId: crypto.randomUUID(), // In real implementation, map to actual node ID
          variables: this.extractPatternVariables(match, pattern.extractVariables),
          confidence: this.calculatePatternConfidence(match, pattern),
        }));

        if (patternMatches.length > 0) {
          results.push({
            patternName: pattern.name,
            matches: patternMatches,
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to apply pattern ${pattern.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Extract pattern variables from match
   */
  private extractPatternVariables(
    match: SgNode,
    variableNames: string[]
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {};
    
    for (const varName of variableNames) {
      try {
        const varNode = match.getMatch(varName);
        if (varNode) {
          variables[varName] = varNode.text();
        }
      } catch (error) {
        // Variable not found in this match
      }
    }
    
    return variables;
  }

  /**
   * Calculate pattern match confidence
   */
  private calculatePatternConfidence(match: SgNode, pattern: TensorRTPattern): number {
    // Base confidence from pattern priority
    let confidence = pattern.priority / 10;
    
    // Adjust based on match quality
    const text = match.text();
    if (text.includes('TODO') || text.includes('FIXME')) {
      confidence *= 0.8;
    }
    
    if (text.includes('deprecated')) {
      confidence *= 0.6;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate file metrics
   */
  private calculateMetrics(
    nodes: CSTNode[],
    patterns: Array<{ patternName: string; matches: any[] }>
  ): {
    complexity: number;
    maintainability: number;
    testability: number;
  } {
    const complexity = nodes.reduce((sum, node) => sum + node.complexityContribution, 0);
    const totalPatterns = patterns.reduce((sum, p) => sum + p.matches.length, 0);
    
    // Simple heuristics for maintainability and testability
    const maintainability = Math.max(0, 1 - (complexity / (nodes.length * 2)));
    const testability = nodes.filter(n => n.isTestCode).length / Math.max(nodes.length, 1);
    
    return {
      complexity,
      maintainability,
      testability,
    };
  }

  /**
   * Extract node structure information
   */
  private extractNodeStructure(node: SgNode): Record<string, unknown> {
    return {
      kind: String(node.kind()),
      childCount: node.children().length,
      hasText: node.text().length > 0,
      range: node.range(),
    };
  }

  /**
   * Infer semantic role of node
   */
  private inferSemanticRole(node: SgNode): string | undefined {
    const kind = String(node.kind());
    const text = node.text();
    
    if (kind.includes('function') || kind.includes('method')) {
      return 'function';
    }
    if (kind.includes('class') || kind.includes('struct')) {
      return 'type_definition';
    }
    if (kind.includes('variable') || kind.includes('declaration')) {
      return 'variable';
    }
    if (text.includes('namespace')) {
      return 'namespace';
    }
    
    return undefined;
  }

  /**
   * Infer scope type
   */
  private inferScopeType(node: SgNode): string | undefined {
    const text = node.text();
    
    if (text.includes('global') || text.includes('extern')) {
      return 'global';
    }
    if (text.includes('static')) {
      return 'static';
    }
    if (text.includes('local')) {
      return 'local';
    }
    
    return undefined;
  }

  /**
   * Infer visibility
   */
  private inferVisibility(node: SgNode): 'public' | 'private' | 'protected' | 'internal' {
    const text = node.text();
    
    if (text.includes('public:') || text.includes('public ')) {
      return 'public';
    }
    if (text.includes('protected:') || text.includes('protected ')) {
      return 'protected';
    }
    if (text.includes('private:') || text.includes('private ')) {
      return 'private';
    }
    
    return 'private'; // Default
  }

  /**
   * Calculate node complexity contribution
   */
  private calculateNodeComplexity(node: SgNode): number {
    const kind = String(node.kind());
    const text = node.text();
    
    let complexity = 1; // Base complexity
    
    // Add complexity for control structures
    if (kind.includes('if') || kind.includes('while') || kind.includes('for')) {
      complexity += 1;
    }
    if (kind.includes('switch') || kind.includes('case')) {
      complexity += 1;
    }
    if (text.includes('try') || text.includes('catch')) {
      complexity += 1;
    }
    
    // Add complexity for nested structures
    complexity += node.children().length * 0.1;
    
    return complexity;
  }

  /**
   * Check if node is an entry point
   */
  private isEntryPoint(node: SgNode): boolean {
    const text = node.text();
    return text.includes('main(') || 
           text.includes('__global__') ||
           text.includes('PYBIND11_MODULE');
  }

  /**
   * Check if node is test code
   */
  private isTestCode(node: SgNode, filePath: string): boolean {
    const text = node.text();
    return filePath.includes('test') ||
           filePath.includes('Test') ||
           text.includes('TEST(') ||
           text.includes('EXPECT_') ||
           text.includes('ASSERT_');
  }

  /**
   * Normalize language name
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'c++': 'cpp',
      'cxx': 'cpp',
      'cc': 'cpp',
      'cuda': 'cuda',
      'cu': 'cuda',
      'python': 'python',
      'py': 'python',
      'javascript': 'javascript',
      'js': 'javascript',
      'typescript': 'typescript',
      'ts': 'typescript',
    };
    
    return languageMap[normalized] || normalized;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create AST analyzer with TensorRT configuration
 */
export function createTensorRTASTAnalyzer(config?: Partial<ASTConfig>): ASTAnalyzer {
  return new ASTAnalyzer({
    maxDepth: 15,
    includeComments: false,
    includeWhitespace: false,
    extractPatterns: true,
    maxNodeSize: 50000,
    ...config,
  });
}

/**
 * Validate AST configuration
 */
export function validateASTConfig(config: unknown): ASTConfig {
  return ASTConfigSchema.parse(config);
}

/**
 * Validate TensorRT pattern
 */
export function validateTensorRTPattern(pattern: unknown): TensorRTPattern {
  return TensorRTPatternSchema.parse(pattern);
}