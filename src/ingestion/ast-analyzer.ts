// ...existing code...

// ...existing code...
// ...existing code...
// Canonical ASTGrepPattern schema and type
export const ASTGrepPatternSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  language: z.string().optional(),
  extractVariables: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(10).default(5),
});
export type ASTGrepPattern = z.infer<typeof ASTGrepPatternSchema>;

export type CSTNode = z.infer<typeof CSTNodeSchema>;
import { parse, Lang, type SgNode } from '@ast-grep/napi';
import { z } from 'zod';

/**
 * AST Analyzer for Knowledge Graph Ingestion
 *
 * Uses ast-grep to extract Concrete Syntax Tree (CST) structures from
 * patterns. Follows Carmack's principles of efficient processing and type safety.
 */


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
  isTestCode: z.boolean().default(false)
});

// =============================
// ASTAnalyzer CLASS (TOP LEVEL)
// =============================

export class ASTAnalyzer {
  private config: ASTConfig;
  private patterns: Map<string, ASTGrepPattern>;

  constructor(config: Partial<ASTConfig> = {}, patterns?: ASTGrepPattern[]) {
    this.config = { ...ASTConfigSchema.parse(config) };
    this.patterns = new Map();
    if (patterns) {
      for (const pattern of patterns) {
        const validated = ASTGrepPatternSchema.parse(pattern);
        this.patterns.set(validated.name, validated);
      }
    }
  }

  private extractNodeStructure(node: SgNode): Record<string, unknown> {
    return {
      type: node.kind(),
      text: node.text(),
      children: node.children().map(child => this.extractNodeStructure(child)),
      // Add more fields as needed for analysis
    };
  }

  private inferSemanticRole(node: SgNode): string | undefined {
    const kind = node.kind();
    if (kind === 'FunctionDeclaration') return 'function';
    if (kind === 'ClassDeclaration') return 'class';
    if (kind === 'VariableDeclaration') return 'variable';
    return undefined;
  }

  private inferScopeType(node: SgNode): string | undefined {
    const kind = node.kind();
    if (kind === 'Block') return 'block';
    if (kind === 'ModuleDeclaration') return 'module';
    if (kind === 'NamespaceExportDeclaration') return 'namespace';
    return undefined;
  }

  private inferVisibility(node: SgNode): 'public' | 'private' | 'protected' | 'internal' {
    const text = node.text();
    if (text.includes('private')) return 'private';
    if (text.includes('protected')) return 'protected';
    if (text.includes('internal')) return 'internal';
    if (text.includes('public')) return 'public';
    return 'public';
  }

  private calculateNodeComplexity(node: SgNode): number {
    let complexity = 1;
    const children = node.children();
    if (children && children.length > 0) {
      complexity += children.reduce((sum, child) => sum + this.calculateNodeComplexity(child), 0);
    }
    return complexity;
  }

  private isEntryPoint(node: SgNode): boolean {
    return node.kind() === 'FunctionDeclaration' && node.text().includes('main');
  }

  private isTestCode(node: SgNode, filePath: string): boolean {
    return /test|spec/i.test(filePath) || node.kind() === 'TestCase';
  }

  addPattern(pattern: ASTGrepPattern): void {
    const validatedPattern = ASTGrepPatternSchema.parse(pattern);
    this.patterns.set(validatedPattern.name, validatedPattern);
  }

  getPatterns(): ASTGrepPattern[] {
    return Array.from(this.patterns.values());
  }

  private parseContent(content: string, language: string): SgNode | null {
    try {
      const langKey = language in Lang ? Lang[language as keyof typeof Lang] : language;
      return parse(langKey, content).root();
    } catch (error) {
      console.warn(`⚠️ Failed to parse ${language} content:`, error);
      return null;
    }
  }

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
    if (nodeText.length > this.config.maxNodeSize) {
      console.warn(`⚠️ Skipping large node in ${filePath} (${nodeText.length} chars)`);
      return [];
    }
    const cstNode: CSTNode = {
      id: nodeId,
      nodeType: String(node.kind()),
      nodeKind: String(node.kind()),
      nodeText: this.config.includeWhitespace ? nodeText : nodeText.trim(),
      startLine: range.start.line + 1,
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
      semanticRole: this.inferSemanticRole(node) ?? undefined,
      scopeType: this.inferScopeType(node) ?? undefined,
      visibility: this.inferVisibility(node),
      complexityContribution: this.calculateNodeComplexity(node),
      isEntryPoint: this.isEntryPoint(node),
      isTestCode: this.isTestCode(node, filePath),
    };
    const nodes = [cstNode];
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
      if (pattern.language && pattern.language !== language) {
        continue;
      }
      try {
        const matches = root.findAll(pattern.pattern);
        const patternMatches = matches.map(match => ({
          nodeId: crypto.randomUUID(),
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

  private calculatePatternConfidence(match: SgNode, pattern: ASTGrepPattern): number {
    let confidence = pattern.priority / 10;
    const text = match.text();
    if (text.includes('TODO') || text.includes('FIXME')) {
      confidence *= 0.8;
    }
    if (text.includes('deprecated')) {
      confidence *= 0.6;
    }
    return Math.min(confidence, 1.0);
  }

  private calculateMetrics(
    nodes: CSTNode[],
    _patternMatches: Array<{ patternName: string; matches: any[] }>
  ): {
    complexity: number;
    maintainability: number;
    testability: number;
  } {
    const complexity = nodes.reduce((sum, node) => sum + node.complexityContribution, 0);
    const maintainability = Math.max(0, 1 - (complexity / (nodes.length * 2)));
    const testability = nodes.filter(n => n.isTestCode).length / Math.max(nodes.length, 1);
    return {
      complexity,
      maintainability,
      testability,
    };
  }
}

