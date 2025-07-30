

import { MultiLanguageAnalyzer } from './multi-language-analyzer';
import { fromPromise } from 'xstate';

// Unified, language-agnostic AST analyzer delegating to MultiLanguageAnalyzer
export class ASTAnalyzer {
  private analyzer: MultiLanguageAnalyzer;
  constructor() {
    this.analyzer = new MultiLanguageAnalyzer();
  }

  /**
   * Analyze a file and return a ModuleDoc (for documentation generation)
   */
  async analyzeFile(filePath: string): Promise<import('./types').ModuleDoc> {
    // Extract entities (functions, classes, etc.)
    const entities = await this.extractEntities(filePath);
    const content = await this.readFile(filePath);


  // Import types for explicit typing
  // (No runtime import needed as types are imported below)
  type FunctionDoc = import('./types').FunctionDoc;
  type ClassDoc = import('./types').ClassDoc;
  type ConstantDoc = { name: string; type: string; value?: string; description?: string };
  type ImportDoc = { module: string; imports: string[]; isTypeOnly: boolean };

  const functions: FunctionDoc[] = [];
  const classes: ClassDoc[] = [];
  const types: string[] = [];
  const constants: ConstantDoc[] = [];
  const imports: ImportDoc[] = [];

    for (const entity of entities) {
      switch (entity.type) {
        case 'function':
        case 'method':
          functions.push({
            name: entity.name,
            signature: entity.signature || '',
            description: entity.description,
            parameters: (entity.parameters || []).map((param: any) => ({
              name: param.name,
              type: param.type,
              description: param.description,
              optional: typeof param.optional === 'boolean' ? param.optional : false,
            })),
            returnType: entity.returnType,
            returnDescription: '',
            examples: [],
            filePath: entity.filePath,
            lineNumber: entity.startLine,
            isExported: true,
            isAsync: false,
            complexity: entity.complexity,
          });
          break;
        case 'class':
        case 'interface':
        case 'type':
          classes.push({
            name: entity.name,
            description: entity.description,
            type: entity.type === 'class' ? 'class' : entity.type === 'interface' ? 'interface' : 'type',
            properties: [],
            methods: [],
            extends: undefined,
            implements: [],
            filePath: entity.filePath,
            lineNumber: entity.startLine,
            isExported: true,
          });
          break;
        case 'constant':
        case 'variable':
          constants.push({
            name: entity.name,
            type: entity.type,
            value: typeof entity.signature === 'string' ? entity.signature : '',
            description: typeof entity.description === 'string' ? entity.description : '',
          });
          break;
        default:
          // For types, enums, etc.
          if (['enum', 'type'].includes(entity.type)) {
            types.push(entity.name);
          }
      }
    }

    // Attempt to extract imports (very basic, can be improved)
    const importRegex = /import\s+(?:[^'";]+from\s+)?["']([^"']+)["']/g;

    let match;
    while ((match = importRegex.exec(content))) {
      imports.push({
        module: match[1],
        imports: [],
        isTypeOnly: false,
      });
    }

    // Attempt to extract dependencies (basic: all import module names)
    const dependencies = imports.map(i => i.module);

    return {
      name: filePath.split(/[\\/]/).pop() || 'UnknownModule',
      filePath,
      description: '',
      exports: {
        functions,
        classes,
        types,
        constants,
      },
      imports,
      dependencies,
    };
  }

  async extractEntities(filePath: string) {
    return this.analyzer.extractEntities(filePath);
  }

  async detectLanguage(filePath: string, content?: string) {
    return this.analyzer.detectLanguage(filePath, content);
  }

  async classifyDomain(content: string, filePath: string) {
    return this.analyzer.classifyDomain(content, filePath);
  }

  async readFile(filePath: string) {
    return this.analyzer.readFile(filePath);
  }
}

// Create and export the analyzer actor
export const astAnalyzerActor = fromPromise(
  async ({ input }: { input: { filePath: string; operation: string } }) => {
    const analyzer = new ASTAnalyzer();
    switch (input.operation) {
      case 'extract':
        return await analyzer.extractEntities(input.filePath);
      case 'detect':
        return await analyzer.detectLanguage(input.filePath);
      case 'classify':
        const content = await analyzer.readFile(input.filePath);
        return await analyzer.classifyDomain(content, input.filePath);
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  }
);