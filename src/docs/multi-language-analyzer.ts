import { fromPromise } from 'xstate';
import type { CodeEntity, EntityType, DomainType } from './types.ts';

// Extend LanguageType to include all supported languages
export type LanguageType =
  | 'typescript'
  | 'javascript'
  | 'cuda'
  | 'cpp'
  | 'c'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'shell'
  | 'yaml'
  | 'markdown'
  | 'unknown';
import {
  validateCodeEntity,
  LanguageTypeSchema,
  EntityTypeSchema,
  DomainTypeSchema,
} from './types.ts';


// Extensible multi-language AST-grep patterns for general codebase analysis
const LANGUAGE_PATTERNS_MAP: Record<LanguageType, Record<string, string>> = {
  cuda: {
    kernel: '__global__ void $NAME($$$PARAMS) { $$$BODY }',
    deviceFunction: '__device__ $TYPE $NAME($$$PARAMS) { $$$BODY }',
    hostFunction: '__host__ $TYPE $NAME($$$PARAMS) { $$$BODY }',
  },
  cpp: {
    class: 'class $NAME { $$$BODY }',
    struct: 'struct $NAME { $$$BODY }',
    function: '$TYPE $NAME($$$ARGS) { $$$BODY }',
    namespace: 'namespace $NAME { $$$BODY }',
  },
  python: {
    class: 'class $NAME($$$BASES): $$$BODY',
    function: 'def $NAME($$$PARAMS): $$$BODY',
    asyncFunction: 'async def $NAME($$$PARAMS): $$$BODY',
  },
  typescript: {
    class: 'class $NAME { $$$BODY }',
    function: 'function $NAME($$$) { $$$ }',
    interface: 'interface $NAME { $$$ }',
    type: 'type $NAME = $$$',
  },
  javascript: {
    class: 'class $NAME { $$$BODY }',
    function: 'function $NAME($$$) { $$$ }',
  },
  go: {
    function: 'func $NAME($$$PARAMS) $$$RETURNS { $$$BODY }',
    struct: 'type $NAME struct { $$$BODY }',
    interface: 'type $NAME interface { $$$BODY }',
  },
  rust: {
    function: 'fn $NAME($$$PARAMS) -> $$$RETURNS { $$$BODY }',
    struct: 'struct $NAME { $$$BODY }',
    enum: 'enum $NAME { $$$BODY }',
    trait: 'trait $NAME { $$$BODY }',
  },
  java: {
    class: 'class $NAME { $$$BODY }',
    interface: 'interface $NAME { $$$BODY }',
    method: '$TYPE $NAME($$$ARGS) { $$$BODY }',
  },
  shell: {
    function: '$NAME() { $$$BODY }',
  },
  yaml: {},
  markdown: {},
  c: {},
  unknown: {},
};

// Language detection patterns
const LANGUAGE_PATTERNS: Record<LanguageType, RegExp[]> = {
  cuda: [/\.cu$/, /\.cuh$/, /__global__/, /__device__/, /__host__/, /threadIdx/, /blockIdx/],
  cpp: [/\.cpp$/, /\.cxx$/, /\.cc$/, /\.hpp$/, /\.h$/, /template\s*</, /namespace\s+\w+/, /class\s+\w+/],
  c: [/\.c$/, /\.h$/, /^#include/, /struct\s+\w+/, /typedef\s+/],
  python: [/\.py$/, /\.pyx$/, /def\s+\w+/, /class\s+\w+/, /import\s+\w+/, /from\s+\w+\s+import/],
  typescript: [/\.ts$/, /\.tsx$/, /interface\s+\w+/, /type\s+\w+/, /export\s+/],
  javascript: [/\.js$/, /\.jsx$/, /function\s+\w+/, /const\s+\w+\s*=/, /=>\s*{/],
  java: [/\.java$/, /class\s+\w+/, /public\s+static\s+void\s+main/],
  go: [/\.go$/, /package\s+\w+/, /func\s+\w+\(/],
  rust: [/\.rs$/, /fn\s+\w+\(/, /struct\s+\w+/, /enum\s+\w+/],
  shell: [/\.sh$/, /#!\/bin\/bash/, /function\s+\w+\s*\(\)/],
  yaml: [/\.ya?ml$/, /^---/, /:\s/],
  markdown: [/\.md$/, /^#/, /\[.*\]\(.*\)/],
  unknown: [],
};


// General domain classification keywords (can be extended per project)
const DOMAIN_KEYWORDS: Record<DomainType, string[]> = {
  core: ['core', 'main', 'entry', 'init', 'start'],
  data: [
    'input', 'output', 'read', 'write', 'file', 'stream', 'print', 'log',
    'db', 'database', 'query', 'sql', 'mongo', 'postgres', 'table', 'row'
  ],
  network: ['http', 'request', 'response', 'socket', 'server', 'client', 'api'],
  testing: ['test', 'assert', 'expect', 'mock', 'suite', 'case'],
  utilities: ['util', 'helper', 'common', 'tool', 'misc'],
  security: ['auth', 'token', 'secure', 'encrypt', 'decrypt', 'hash'],
  performance: ['perf', 'optimize', 'fast', 'slow', 'benchmark', 'profile'],
  // Add empty arrays for all other DomainType values
  unknown: [],
  api: [],
  infrastructure: [],
  examples: [],
  documentation: [],
  ui: [],
  cli: [],
  integration: [],
  deployment: [],
};

/**
 * Multi-language code entity analyzer (language-agnostic)
 *
 * - Supports any language with pattern definitions in LANGUAGE_PATTERNS_MAP.
 * - Easily extensible: add new languages/entity types by updating LANGUAGE_PATTERNS_MAP and LANGUAGE_PATTERNS.
 * - All language handlers use the same validation and normalization pipeline.
 * - Fallback: If AST-grep is unavailable or no patterns are defined, uses robust regex-based extraction for any language.
 */

/**
 * MultiLanguageAnalyzer supports analysis and entity extraction for multiple programming languages.
 */
export class MultiLanguageAnalyzer {
  private astGrepInstances: Map<LanguageType, unknown> = new Map();

  constructor() {
    this.initializeLanguageParsers();
  }

  private async initializeLanguageParsers(): Promise<void> {
    try {
      // Import AST-grep language parsers
      const astGrep = await import('@ast-grep/napi');
      
      this.astGrepInstances.set('javascript', astGrep.js);
      this.astGrepInstances.set('typescript', astGrep.js);
      // Use js parser for all languages as fallback since specific language parsers may not be available
      this.astGrepInstances.set('python', astGrep.js);
      this.astGrepInstances.set('cpp', astGrep.js);
      this.astGrepInstances.set('c', astGrep.js);
      this.astGrepInstances.set('cuda', astGrep.js);
    } catch (error) {
      console.warn('AST-grep language parsers not available, falling back to regex:', error);
    }
  }

  /**
   * Detect the programming language of a file
   */
  detectLanguage(filePath: string, content?: string): LanguageType {
    // First check file extension
    for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern instanceof RegExp && pattern.test(filePath)) {
          return language as LanguageType;
        }
      }
    }

    // If content is provided, check content patterns
    if (content) {
      for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern instanceof RegExp && pattern.test(content)) {
            return language as LanguageType;
          }
        }
      }
    }

    return 'unknown';
  }

  /**
   * Classify the domain/category of code based on content analysis
   */
  classifyDomain(content: string, filePath: string): DomainType {
    const lowerContent = content.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    let maxScore = 0;
    let bestDomain: DomainType = 'unknown';

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      
      // Check keywords in content
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      // Check keywords in file path
      for (const keyword of keywords) {
        if (lowerPath.includes(keyword)) {
          score += 2; // Path keywords get higher weight
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain as DomainType;
      }
    }

    return bestDomain;
  }

  /**
   * Extract code entities from a file using language-specific analysis
   */
  async extractEntities(filePath: string): Promise<CodeEntity[]> {
    const content = await this.readFile(filePath);
    if (!content) return [];

    const language = this.detectLanguage(filePath, content);
    const domain = this.classifyDomain(content, filePath);
    let entities: CodeEntity[] = [];

    try {
      entities = await this.extractPatternEntities(content, filePath, domain, language);
    } catch (error) {
      console.warn(`Failed to extract entities from ${filePath}:`, error);
    }

    // Zod-validate all entities before returning
    return entities.map(e => validateCodeEntity(e));
  }

  /**
   * Extract entities for any language with pattern support.
   * This method is used for all languages, including CUDA, C++, Python, JS/TS, etc.
   * If language-specific logic is needed, add to LANGUAGE_PATTERNS_MAP and handle here.
   */
  private async extractPatternEntities(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get(language);
    const patterns = LANGUAGE_PATTERNS_MAP[language] ?? {};

    if (parser && Object.keys(patterns).length > 0) {
      try {
        const root = (parser as { parse: (code: string) => any }).parse(content);
        for (const [entityType, pattern] of Object.entries(patterns)) {
          const matches = root.findAll(pattern);
          for (const match of matches) {
            const name = match.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: entityType as EntityType,
                language,
                filePath,
                startLine: match.range().start.line,
                endLine: match.range().end.line,
                sourceCode: match.text(),
                domain,
                signature: this.extractSignature(match.text()),
                description: this.findPrecedingComment(content, match.range().start.line, language) ?? '',
              }));
            }
          }
        }
      } catch (error) {
        console.warn(`${language} AST parsing failed, falling back to regex:`, error);
        entities.push(...await this.extractGenericEntities(content, filePath, domain, language));
      }
    } else {
      entities.push(...await this.extractGenericEntities(content, filePath, domain, language));
    }
    return entities;
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return '';
    }
  }


  /**
   * Extract entities using generic patterns when specific language support is not available
   */
  private async extractGenericEntities(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const lines = content.split('\n');

    // Generic function pattern
    const functionPattern = /(?:function|def|fn)\s+(\w+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = functionPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (name) {
        entities.push(await this.createEntity({
          name,
          type: 'function',
          language,
          filePath,
          startLine: lineNumber,
          endLine: lineNumber,
          sourceCode: lines[lineNumber - 1] || '',
          domain,
        }));
      }
    }

    return entities;
  }

  // Regex fallback methods for when AST-grep is not available




  // Helper methods
  private async createEntity(params: {
    name: string;
    type: EntityType;
    language: LanguageType;
    filePath: string;
    startLine: number;
    endLine: number;
    sourceCode: string;
    domain: DomainType;
    signature?: string;
    description?: string;
  }): Promise<CodeEntity> {
    const { randomUUID } = await import('node:crypto');
    // Always validate with Zod
    return validateCodeEntity({
      id: randomUUID(),
      name: params.name,
      type: EntityTypeSchema.parse(params.type),
      language: LanguageTypeSchema.parse(params.language),
      filePath: params.filePath,
      startLine: params.startLine,
      endLine: params.endLine,
      sourceCode: params.sourceCode,
      domain: DomainTypeSchema.parse(params.domain),
      signature: params.signature,
      description: params.description || undefined,
      keywords: this.extractKeywords(params.sourceCode),
      complexity: this.calculateComplexity(params.sourceCode),
    });
  }

  private extractSignature(code: string): string {
    // Extract the first line or function signature
    const lines = code.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 200) {
      return firstLine;
    }
    
    return code.substring(0, 200) + (code.length > 200 ? '...' : '');
  }

  /**
   * Locate the nearest preceding comment (docstring or block comment) for a code entity using AST-grep.
   * Supports language-specific comment patterns.
   */
  private findPrecedingComment(
    content: string,
    entityStartLine: number,
    language: LanguageType
  ): string | undefined {
    const parser = this.astGrepInstances.get(language);
    if (!parser) return undefined;
    try {
      const root = (parser as { parse: (code: string) => any }).parse(content);
      // Find all comment nodes (language-specific)
      let commentPattern: string | undefined;
      switch (language) {
        case 'python':
          commentPattern = 'expression_statement > string'; // docstrings
          break;
        case 'typescript':
        case 'javascript':
        case 'cpp':
        case 'c':
        case 'java':
        case 'go':
        case 'rust':
          commentPattern = 'comment';
          break;
        case 'shell':
        case 'yaml':
        case 'markdown':
          commentPattern = 'comment';
          break;
        default:
          commentPattern = 'comment';
      }
      const comments = root.findAll(commentPattern);
      // Find the last comment before the entity's start line
      let best: { text: string; line: number } | undefined;
      for (const node of comments) {
        const rng = node.range();
        if (rng.end.line < entityStartLine) {
          if (!best || rng.end.line > best.line) {
            best = { text: node.text(), line: rng.end.line };
          }
        }
      }
      return best?.text.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Extract keywords from code content for entity classification
   * - Uses a simple heuristic to extract meaningful keywords
   * - Can be extended with more complex NLP techniques if needed
   */
  private extractKeywords(code: string): string[] {
    const keywords = new Set<string>();
    const words = code.toLowerCase().match(/\b\w+\b/g) || [];
    
    for (const word of words) {
      if (word.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'].includes(word)) {
        keywords.add(word);
      }
    }
    
    return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
  }

  private calculateComplexity(code: string): number {
    // Simple complexity calculation based on code patterns
    let complexity = 1; // Base complexity
    
    // Count control flow statements
    const controlFlow = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    for (const keyword of controlFlow) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    // Count nested blocks (rough estimate)
    const openBraces = (code.match(/\{/g) || []).length;
    complexity += Math.floor(openBraces / 2);
    
    return Math.min(complexity, 20); // Cap at 20
  }
}

// Create and export the multi-language analyzer actor
export const multiLanguageAnalyzerActor = fromPromise(
  async ({ input }: { input: { filePath: string; operation: string } }) => {
    const analyzer = new MultiLanguageAnalyzer();

    switch (input.operation) {
      case 'extract':
        return await analyzer.extractEntities(input.filePath);
      case 'detect':
        const content = await analyzer.readFile(input.filePath);
        return analyzer.detectLanguage(input.filePath, content);
      case 'classify':
        const fileContent = await analyzer.readFile(input.filePath);
        return analyzer.classifyDomain(fileContent, input.filePath);
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  }
);