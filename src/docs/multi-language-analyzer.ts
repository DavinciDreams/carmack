import { fromPromise } from 'xstate';
import type { CodeEntity, EntityType, DomainType } from './types';

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
const LANGUAGE_PATTERNS_MAP: Record<string, Record<string, string>> = {
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
};

// Language detection patterns
const LANGUAGE_PATTERNS = {
  cuda: [/\.cu$/, /\.cuh$/, /__global__/, /__device__/, /__host__/, /threadIdx/, /blockIdx/],
  cpp: [/\.cpp$/, /\.cxx$/, /\.cc$/, /\.hpp$/, /\.h$/, /template\s*</, /namespace\s+\w+/, /class\s+\w+/],
  c: [/\.c$/, /\.h$/, /^#include/, /struct\s+\w+/, /typedef\s+/],
  python: [/\.py$/, /\.pyx$/, /def\s+\w+/, /class\s+\w+/, /import\s+\w+/, /from\s+\w+\s+import/],
  typescript: [/\.ts$/, /\.tsx$/, /interface\s+\w+/, /type\s+\w+/, /export\s+/],
  javascript: [/\.js$/, /\.jsx$/, /function\s+\w+/, /const\s+\w+\s*=/, /=>\s*{/],
};


// General domain classification keywords (can be extended per project)
const DOMAIN_KEYWORDS = {
  core: ['core', 'main', 'entry', 'init', 'start'],
  io: ['input', 'output', 'read', 'write', 'file', 'stream', 'print', 'log'],
  network: ['http', 'request', 'response', 'socket', 'server', 'client', 'api'],
  database: ['db', 'database', 'query', 'sql', 'mongo', 'postgres', 'table', 'row'],
  concurrency: ['thread', 'async', 'await', 'promise', 'future', 'lock', 'mutex', 'channel'],
  error_handling: ['error', 'exception', 'try', 'catch', 'fail', 'throw'],
  testing: ['test', 'assert', 'expect', 'mock', 'suite', 'case'],
  config: ['config', 'settings', 'env', 'option', 'parameter'],
  util: ['util', 'helper', 'common', 'tool', 'misc'],
  docs: ['doc', 'readme', 'comment', 'description'],
  build: ['build', 'compile', 'make', 'cmake', 'setup'],
  security: ['auth', 'token', 'secure', 'encrypt', 'decrypt', 'hash'],
  performance: ['perf', 'optimize', 'fast', 'slow', 'benchmark', 'profile'],
};

/**
 * Multi-language analyzer for TensorRT codebase
 * Supports CUDA, C++, Python, TypeScript, and JavaScript
 */
export class MultiLanguageAnalyzer {
  private astGrepInstances: Map<LanguageType, any> = new Map();

  constructor() {
    this.initializeLanguageParsers();
  }

  private async initializeLanguageParsers() {
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
      switch (language) {
        case 'cuda':
          entities = await this.extractCudaEntities(content, filePath, domain);
          break;
        case 'cpp':
        case 'c':
          entities = await this.extractCppEntities(content, filePath, domain, language);
          break;
        case 'python':
          entities = await this.extractPythonEntities(content, filePath, domain);
          break;
        case 'typescript':
        case 'javascript':
          entities = await this.extractJsEntities(content, filePath, domain, language);
          break;
        default:
          entities = await this.extractGenericEntities(content, filePath, domain, language);
      }
    } catch (error) {
      console.warn(`Failed to extract entities from ${filePath}:`, error);
    }

    // Zod-validate all entities before returning
    return entities.map(e => validateCodeEntity(e));
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
   * Extract CUDA-specific entities (kernels, device functions, etc.)
   */
  private async extractCudaEntities(
    content: string,
    filePath: string,
    domain: DomainType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get('cuda');
  const patterns = LANGUAGE_PATTERNS_MAP.cuda ?? {};

    if (parser) {
      try {
        const root = parser.parse(content);
        // Extract kernels
        if (patterns.kernel) {
          const kernels = root.findAll(patterns.kernel);
          for (const kernel of kernels) {
            const name = kernel.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'kernel',
                language: 'cuda',
                filePath,
                startLine: kernel.range().start.line,
                endLine: kernel.range().end.line,
                sourceCode: kernel.text(),
                domain,
                signature: this.extractSignature(kernel.text()),
                description: this.findPrecedingComment(content, kernel.range().start.line, 'cuda') ?? '',
                // complexity: this.computeComplexity(kernel.text(), 'cuda'), // Add to schema if needed
              }));
            }
          }
        }
        if (patterns.deviceFunction) {
          const deviceFunctions = root.findAll(patterns.deviceFunction);
          for (const func of deviceFunctions) {
            const name = func.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'device_function',
                language: 'cuda',
                filePath,
                startLine: func.range().start.line,
                endLine: func.range().end.line,
                sourceCode: func.text(),
                domain,
                signature: this.extractSignature(func.text()),
                description: this.findPrecedingComment(content, func.range().start.line, 'cuda') ?? '',
                // complexity: this.computeComplexity(func.text(), 'cuda'), // Add to schema if needed
              }));
            }
          }
        }
        if (patterns.hostFunction) {
          const hostFunctions = root.findAll(patterns.hostFunction);
          for (const func of hostFunctions) {
            const name = func.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'host_function',
                language: 'cuda',
                filePath,
                startLine: func.range().start.line,
                endLine: func.range().end.line,
                sourceCode: func.text(),
                domain,
                signature: this.extractSignature(func.text()),
                description: this.findPrecedingComment(content, func.range().start.line, 'cuda') ?? '',
                // complexity: this.computeComplexity(func.text(), 'cuda'), // Add to schema if needed
              }));
            }
          }
        }
      } catch (error) {
        console.warn('CUDA AST parsing failed, falling back to regex:', error);
        entities.push(...await this.extractCudaEntitiesRegex(content, filePath, domain));
      }
    } else {
      entities.push(...await this.extractCudaEntitiesRegex(content, filePath, domain));
    }
    return entities;
  }

  /**
   * Extract C++ entities (templates, classes, namespaces, etc.)
   */
  private async extractCppEntities(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get('cpp');
  const patterns = LANGUAGE_PATTERNS_MAP.cpp ?? {};

    if (parser) {
      try {
        const root = parser.parse(content);
        if (patterns.class) {
          const classes = root.findAll(patterns.class);
          for (const cls of classes) {
            const name = cls.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'class',
                language,
                filePath,
                startLine: cls.range().start.line,
                endLine: cls.range().end.line,
                sourceCode: cls.text(),
                domain,
              }));
            }
          }
        }
        if (patterns.struct) {
          const structs = root.findAll(patterns.struct);
          for (const struct of structs) {
            const name = struct.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'struct',
                language,
                filePath,
                startLine: struct.range().start.line,
                endLine: struct.range().end.line,
                sourceCode: struct.text(),
                domain,
              }));
            }
          }
        }
        if (patterns.namespace) {
          const namespaces = root.findAll(patterns.namespace);
          for (const ns of namespaces) {
            const name = ns.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'namespace',
                language,
                filePath,
                startLine: ns.range().start.line,
                endLine: ns.range().end.line,
                sourceCode: ns.text(),
                domain,
              }));
            }
          }
        }
      } catch (error) {
        console.warn('C++ AST parsing failed, falling back to regex:', error);
        entities.push(...await this.extractCppEntitiesRegex(content, filePath, domain, language));
      }
    } else {
      entities.push(...await this.extractCppEntitiesRegex(content, filePath, domain, language));
    }
    return entities;
  }

  /**
   * Extract Python entities (classes, functions, decorators, etc.)
   */
  private async extractPythonEntities(
    content: string,
    filePath: string,
    domain: DomainType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get('python');
  const patterns = LANGUAGE_PATTERNS_MAP.python ?? {};

    if (parser) {
      try {
        const root = parser.parse(content);
        if (patterns.class) {
          const classes = root.findAll(patterns.class);
          for (const cls of classes) {
            const name = cls.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'class',
                language: 'python',
                filePath,
                startLine: cls.range().start.line,
                endLine: cls.range().end.line,
                sourceCode: cls.text(),
                domain,
                signature: this.extractSignature(cls.text()),
              }));
            }
          }
        }
        if (patterns.function) {
          const functions = root.findAll(patterns.function);
          for (const func of functions) {
            const name = func.getMatch('NAME')?.text();
            if (name) {
              entities.push(await this.createEntity({
                name,
                type: 'function',
                language: 'python',
                filePath,
                startLine: func.range().start.line,
                endLine: func.range().end.line,
                sourceCode: func.text(),
                domain,
                signature: this.extractSignature(func.text()),
              }));
            }
          }
        }
      } catch (error) {
        console.warn('Python AST parsing failed, falling back to regex:', error);
        entities.push(...await this.extractPythonEntitiesRegex(content, filePath, domain));
      }
    } else {
      entities.push(...await this.extractPythonEntitiesRegex(content, filePath, domain));
    }
    return entities;
  }

  /**
   * Extract JavaScript/TypeScript entities
   */
  private async extractJsEntities(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get('javascript');

    if (parser) {
      try {
        const root = parser.parse(content);

        // Extract functions
        const functions = root.findAll('function $NAME($$$) { $$$ }');
        for (const func of functions) {
          const name = func.getMatch('NAME')?.text();
          if (name) {
            entities.push(await this.createEntity({
              name,
              type: 'function',
              language,
              filePath,
              startLine: func.range().start.line,
              endLine: func.range().end.line,
              sourceCode: func.text(),
              domain,
              signature: this.extractSignature(func.text()),
            }));
          }
        }

        // Extract classes
        const classes = root.findAll('class $NAME { $$$ }');
        for (const cls of classes) {
          const name = cls.getMatch('NAME')?.text();
          if (name) {
            entities.push(await this.createEntity({
              name,
              type: 'class',
              language,
              filePath,
              startLine: cls.range().start.line,
              endLine: cls.range().end.line,
              sourceCode: cls.text(),
              domain,
              signature: this.extractSignature(cls.text()),
            }));
          }
        }
      } catch (error) {
        console.warn('JS/TS AST parsing failed, falling back to regex:', error);
        entities.push(...await this.extractJsEntitiesRegex(content, filePath, domain, language));
      }
    } else {
      entities.push(...await this.extractJsEntitiesRegex(content, filePath, domain, language));
    }

    return entities;
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
  private async extractCudaEntitiesRegex(
    content: string,
    filePath: string,
    domain: DomainType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const lines = content.split('\n');

    // CUDA kernel pattern
    const kernelPattern = /__global__\s+void\s+(\w+)\s*\([^)]*\)/g;
    let match: RegExpExecArray | null;

    while ((match = kernelPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (name) {
        entities.push(await this.createEntity({
          name,
          type: 'kernel',
          language: 'cuda',
          filePath,
          startLine: lineNumber,
          endLine: lineNumber,
          sourceCode: lines[lineNumber - 1] || '',
          domain,
          signature: match[0],
        }));
      }
    }

    return entities;
  }

  private async extractCppEntitiesRegex(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const lines = content.split('\n');

    // Class pattern
    const classPattern = /class\s+(\w+)(?:\s*:\s*public\s+\w+)?\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = classPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (name) {
        entities.push(await this.createEntity({
          name,
          type: 'class',
          language,
          filePath,
          startLine: lineNumber,
          endLine: lineNumber,
          sourceCode: lines[lineNumber - 1] || '',
          domain,
          signature: match[0],
        }));
      }
    }

    return entities;
  }

  private async extractPythonEntitiesRegex(
    content: string,
    filePath: string,
    domain: DomainType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const lines = content.split('\n');

    // Function pattern
    const functionPattern = /def\s+(\w+)\s*\([^)]*\):/g;
    let match: RegExpExecArray | null;

    while ((match = functionPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (name) {
        entities.push(await this.createEntity({
          name,
          type: 'function',
          language: 'python',
          filePath,
          startLine: lineNumber,
          endLine: lineNumber,
          sourceCode: lines[lineNumber - 1] || '',
          domain,
          signature: match[0],
        }));
      }
    }

    return entities;
  }

  private async extractJsEntitiesRegex(
    content: string,
    filePath: string,
    domain: DomainType,
    language: LanguageType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const lines = content.split('\n');

    // Function pattern
    const functionPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=.*function|\w+\s*\([^)]*\)\s*\{)/g;
    let match: RegExpExecArray | null;

    while ((match = functionPattern.exec(content)) !== null) {
      const name = match[1] || match[2];
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
          signature: match[0],
        }));
      }
    }

    return entities;
  }

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
      const root = parser.parse(content);
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
   * Compute a real code complexity score using AST-grep (e.g., cyclomatic complexity, nesting, etc).
   * This is a simple example; can be extended for more metrics.
   */
  private computeComplexity(
    content: string,
    language: LanguageType
  ): number {
    const parser = this.astGrepInstances.get(language);
    if (!parser) return 1;
    try {
      const root = parser.parse(content);
      let complexity = 1;
      // Example: count branching nodes (if, for, while, case, etc)
      let branchPatterns: string[] = [];
      switch (language) {
        case 'python':
          branchPatterns = ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'with_statement'];
          break;
        case 'typescript':
        case 'javascript':
          branchPatterns = ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'catch_clause'];
          break;
        case 'cpp':
        case 'c':
        case 'java':
        case 'go':
        case 'rust':
          branchPatterns = ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_statement', 'catch_clause'];
          break;
        case 'shell':
          branchPatterns = ['if_clause', 'for_clause', 'while_clause', 'case_clause'];
          break;
        default:
          branchPatterns = [];
      }
      for (const pattern of branchPatterns) {
        const nodes = root.findAll(pattern);
        complexity += nodes.length;
      }
      return complexity;
    } catch {
      return 1;
    }
  }
  // ...existing code...

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