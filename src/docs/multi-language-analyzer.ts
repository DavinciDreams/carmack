import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  CodeEntity,
  LanguageType,
  EntityType,
  DomainType,
  ModuleDoc,
  FunctionDoc,
  ClassDoc,
} from './types.js';
import {
  validateCodeEntity,
  LanguageTypeSchema,
  EntityTypeSchema,
  DomainTypeSchema,
} from './types.js';

// Multi-language AST-grep patterns for TensorRT codebase analysis
const TENSORRT_PATTERNS = {
  cuda: {
    // CUDA kernel patterns
    globalKernel: '__global__ void $NAME($$$PARAMS) { $$$BODY }',
    deviceFunction: '__device__ $TYPE $NAME($$$PARAMS) { $$$BODY }',
    hostFunction: '__host__ $TYPE $NAME($$$PARAMS) { $$$BODY }',
    sharedMemory: '__shared__ $TYPE $NAME[$SIZE]',
    syncthreads: '__syncthreads()',
    threadIdx: 'threadIdx.$DIM',
    blockIdx: 'blockIdx.$DIM',
    blockDim: 'blockDim.$DIM',
    gridDim: 'gridDim.$DIM',
    cudaMalloc: 'cudaMalloc($PTR, $SIZE)',
    cudaMemcpy: 'cudaMemcpy($DST, $SRC, $SIZE, $KIND)',
    cudaLaunch: '$KERNEL<<<$GRID, $BLOCK>>>($$$ARGS)',
  },
  cpp: {
    // C++ template patterns
    classTemplate: 'template<$$$PARAMS> class $NAME { $$$BODY }',
    functionTemplate: 'template<$$$PARAMS> $TYPE $NAME($$$ARGS) { $$$BODY }',
    namespace: 'namespace $NAME { $$$BODY }',
    struct: 'struct $NAME { $$$BODY }',
    enum: 'enum class $NAME { $$$VALUES }',
    constructor: '$CLASS($$$PARAMS) : $$$INIT { $$$BODY }',
    destructor: '~$CLASS() { $$$BODY }',
    virtualFunction: 'virtual $TYPE $NAME($$$PARAMS)',
    overrideFunction: '$TYPE $NAME($$$PARAMS) override',
    constFunction: '$TYPE $NAME($$$PARAMS) const',
    staticFunction: 'static $TYPE $NAME($$$PARAMS)',
    inlineFunction: 'inline $TYPE $NAME($$$PARAMS)',
    operatorOverload: '$TYPE operator$OP($$$PARAMS)',
    smartPointer: 'std::$PTR_TYPE<$TYPE>',
    stdVector: 'std::vector<$TYPE>',
    stdMap: 'std::map<$KEY, $VALUE>',
    stdUnique: 'std::unique_ptr<$TYPE>',
    stdShared: 'std::shared_ptr<$TYPE>',
  },
  python: {
    // Python patterns for TensorRT bindings
    classDefinition: 'class $NAME($$$BASES): $$$BODY',
    functionDefinition: 'def $NAME($$$PARAMS): $$$BODY',
    asyncFunction: 'async def $NAME($$$PARAMS): $$$BODY',
    decorator: '@$NAME',
    property: '@property',
    staticMethod: '@staticmethod',
    classMethod: '@classmethod',
    importStatement: 'import $MODULE',
    fromImport: 'from $MODULE import $NAMES',
    tryExcept: 'try: $$$TRY except $EXCEPTION: $$$EXCEPT',
    withStatement: 'with $CONTEXT as $VAR: $$$BODY',
    listComprehension: '[$EXPR for $VAR in $ITER]',
    dictComprehension: '{$KEY: $VALUE for $VAR in $ITER}',
    lambdaFunction: 'lambda $PARAMS: $EXPR',
  },
  tensorrt: {
    // TensorRT-specific patterns
    builderCreate: 'nvinfer1::createInferBuilder($LOGGER)',
    networkCreate: 'builder->createNetworkV2($FLAGS)',
    layerAdd: 'network->add$LAYER($$$ARGS)',
    engineBuild: 'builder->buildEngineWithConfig($NETWORK, $CONFIG)',
    contextCreate: 'engine->createExecutionContext()',
    contextExecute: 'context->execute($BATCH_SIZE, $BINDINGS)',
    pluginCreator: 'class $NAME : public nvinfer1::IPluginV2 { $$$BODY }',
    tensorRTLogger: 'class $NAME : public nvinfer1::ILogger { $$$BODY }',
    calibrator: 'class $NAME : public nvinfer1::IInt8Calibrator { $$$BODY }',
    onnxParser: 'nvonnxparser::createParser($NETWORK, $LOGGER)',
    uffParser: 'nvuffparser::createUffParser()',
    caffeParser: 'nvcaffeparser1::createCaffeParser()',
  },
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

// Domain classification keywords
const DOMAIN_KEYWORDS = {
  inference: ['execute', 'infer', 'forward', 'predict', 'run', 'context', 'engine'],
  optimization: ['optimize', 'fuse', 'prune', 'quantize', 'calibrate', 'precision', 'fp16', 'int8'],
  memory_management: ['malloc', 'free', 'alloc', 'buffer', 'memory', 'cuda', 'device', 'host'],
  kernel_execution: ['kernel', 'launch', 'grid', 'block', 'thread', 'sync', 'barrier'],
  graph_construction: ['network', 'layer', 'add', 'build', 'create', 'graph', 'node'],
  serialization: ['serialize', 'deserialize', 'save', 'load', 'stream', 'file', 'binary'],
  plugin_system: ['plugin', 'creator', 'registry', 'custom', 'operator', 'layer'],
  builder_api: ['builder', 'config', 'profile', 'workspace', 'max', 'min', 'opt'],
  runtime_api: ['runtime', 'context', 'execute', 'binding', 'tensor', 'shape'],
  parser: ['parser', 'onnx', 'uff', 'caffe', 'parse', 'model', 'weight'],
  utilities: ['util', 'helper', 'common', 'tool', 'logger', 'timer', 'profiler'],
  testing: ['test', 'benchmark', 'sample', 'example', 'demo', 'verify'],
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
    const entities: CodeEntity[] = [];

    try {
      switch (language) {
        case 'cuda':
          entities.push(...await this.extractCudaEntities(content, filePath, domain));
          break;
        case 'cpp':
        case 'c':
          entities.push(...await this.extractCppEntities(content, filePath, domain, language));
          break;
        case 'python':
          entities.push(...await this.extractPythonEntities(content, filePath, domain));
          break;
        case 'typescript':
        case 'javascript':
          entities.push(...await this.extractJsEntities(content, filePath, domain, language));
          break;
        default:
          entities.push(...await this.extractGenericEntities(content, filePath, domain, language));
      }
    } catch (error) {
      console.warn(`Failed to extract entities from ${filePath}:`, error);
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
   * Extract CUDA-specific entities (kernels, device functions, etc.)
   */
  private async extractCudaEntities(
    content: string,
    filePath: string,
    domain: DomainType
  ): Promise<CodeEntity[]> {
    const entities: CodeEntity[] = [];
    const parser = this.astGrepInstances.get('cuda');

    if (parser) {
      try {
        const root = parser.parse(content);
        
        // Extract CUDA kernels
        const kernels = root.findAll(TENSORRT_PATTERNS.cuda.globalKernel);
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
            }));
          }
        }

        // Extract device functions
        const deviceFunctions = root.findAll(TENSORRT_PATTERNS.cuda.deviceFunction);
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
            }));
          }
        }

        // Extract host functions
        const hostFunctions = root.findAll(TENSORRT_PATTERNS.cuda.hostFunction);
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
            }));
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

    if (parser) {
      try {
        const root = parser.parse(content);

        // Extract templates
        const templates = root.findAll(TENSORRT_PATTERNS.cpp.classTemplate);
        for (const template of templates) {
          const name = template.getMatch('NAME')?.text();
          if (name) {
            entities.push(await this.createEntity({
              name,
              type: 'template',
              language,
              filePath,
              startLine: template.range().start.line,
              endLine: template.range().end.line,
              sourceCode: template.text(),
              domain,
              signature: this.extractSignature(template.text()),
            }));
          }
        }

        // Extract namespaces
        const namespaces = root.findAll(TENSORRT_PATTERNS.cpp.namespace);
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

        // Extract structs
        const structs = root.findAll(TENSORRT_PATTERNS.cpp.struct);
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

    if (parser) {
      try {
        const root = parser.parse(content);

        // Extract classes
        const classes = root.findAll(TENSORRT_PATTERNS.python.classDefinition);
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

        // Extract functions
        const functions = root.findAll(TENSORRT_PATTERNS.python.functionDefinition);
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
    
    return validateCodeEntity({
      id: randomUUID(),
      name: params.name,
      type: params.type,
      language: params.language,
      filePath: params.filePath,
      startLine: params.startLine,
      endLine: params.endLine,
      sourceCode: params.sourceCode,
      domain: params.domain,
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

  private async extractDescription(content: string, lineNumber: number): Promise<string | undefined> {
    const lines = content.split('\n');
    let description = '';

    // Look for comments above the entity
    for (let i = lineNumber - 2; i >= Math.max(0, lineNumber - 10); i--) {
      const line = lines[i]?.trim();
      if (!line) continue;

      if (line.startsWith('/**') || line.startsWith('/*')) {
        // Found comment block
        for (let j = i; j < lineNumber; j++) {
          const commentLine = lines[j]?.trim();
          if (commentLine?.startsWith('*') && !commentLine.startsWith('*/')) {
            description = `${commentLine.replace(/^\*\s?/, '')}\n${description}`;
          }
          if (commentLine?.includes('*/')) break;
        }
        break;
      }

      if (line.startsWith('//')) {
        description = `${line.replace(/^\/\/\s?/, '')}\n${description}`;
      } else if (!line.startsWith('*')) {
        break;
      }
    }

    return description.trim() || undefined;
  }

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