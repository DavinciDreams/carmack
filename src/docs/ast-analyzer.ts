import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ASTNode, ClassDoc, FunctionDoc, ModuleDoc } from './types.js';

// AST-grep Zod schemas for type safety
export const ASTGrepMatchSchema = z.object({
  text: z.function().returns(z.string()),
  range: z.function().returns(
    z.object({
      start: z.object({
        index: z.number(),
        line: z.number(),
        column: z.number(),
      }),
      end: z.object({
        index: z.number(),
        line: z.number(),
        column: z.number(),
      }),
    })
  ),
  getNode: z.function().returns(z.any()).optional(),
  getMultipleMatches: z.function().returns(z.array(z.any())).optional(),
});

export const ASTGrepLanguageSchema = z.object({
  parseString: z.function().args(z.string()).returns(z.any()),
  kind: z.string(),
  name: z.string(),
});

export const ASTGrepRuleSchema = z.object({
  pattern: z.string(),
  kind: z.string().optional(),
  inside: z.string().optional(),
  has: z.string().optional(),
  not: z.string().optional(),
  any: z.array(z.any()).optional(),
  all: z.array(z.any()).optional(),
});

export const ASTGrepConfigSchema = z.object({
  rule: ASTGrepRuleSchema,
  constraints: z.record(z.string()).optional(),
  language: z.union([z.string(), ASTGrepLanguageSchema]).optional(),
  utils: z.record(z.any()).optional(),
});

export const ASTGrepInstanceSchema = z.object({
  findAll: z
    .function()
    .args(ASTGrepConfigSchema, z.string())
    .returns(z.promise(z.array(ASTGrepMatchSchema))),
  findFirst: z
    .function()
    .args(ASTGrepConfigSchema, z.string())
    .returns(z.promise(ASTGrepMatchSchema.optional())),
  parseString: z.function().args(z.string(), z.string().optional()).returns(z.any()),
  parse: z.function().args(z.string()).returns(z.any()),
  lang: z.function().args(z.string()).returns(ASTGrepLanguageSchema),
});

// Type exports for AST-grep
export type ASTGrepMatch = z.infer<typeof ASTGrepMatchSchema>;
export type ASTGrepLanguage = z.infer<typeof ASTGrepLanguageSchema>;
export type ASTGrepRule = z.infer<typeof ASTGrepRuleSchema>;
export type ASTGrepConfig = z.infer<typeof ASTGrepConfigSchema>;
export type ASTGrepInstance = z.infer<typeof ASTGrepInstanceSchema>;

// Validation helpers for AST-grep types
export const validateASTGrepMatch = (data: unknown): ASTGrepMatch => {
  return ASTGrepMatchSchema.parse(data);
};

export const validateASTGrepConfig = (data: unknown): ASTGrepConfig => {
  return ASTGrepConfigSchema.parse(data);
};

export const validateASTGrepInstance = (data: unknown): ASTGrepInstance => {
  return ASTGrepInstanceSchema.parse(data);
};

// AST-grep integration for code analysis
export interface ASTAnalyzer {
  analyzeFile(filePath: string): Promise<ModuleDoc>;
  extractFunctions(filePath: string): Promise<FunctionDoc[]>;
  extractClasses(filePath: string): Promise<ClassDoc[]>;
  extractExports(filePath: string): Promise<string[]>;
  extractImports(filePath: string): Promise<Array<{ module: string; imports: string[] }>>;
  findPatternUsage(pattern: string, filePath: string): Promise<ASTNode[]>;
}

// AST-grep patterns for TypeScript/JavaScript analysis with Zod validation
const ASTPatternSchema = z.object({
  functions: z.object({
    functionDeclaration: z.string(),
    arrowFunction: z.string(),
    methodDefinition: z.string(),
    asyncFunction: z.string(),
  }),
  classes: z.object({
    classDeclaration: z.string(),
    classWithExtends: z.string(),
    interface: z.string(),
    typeAlias: z.string(),
  }),
  exports: z.object({
    namedExport: z.string(),
    defaultExport: z.string(),
    exportDeclaration: z.string(),
    exportFunction: z.string(),
    exportClass: z.string(),
  }),
  imports: z.object({
    namedImport: z.string(),
    defaultImport: z.string(),
    namespaceImport: z.string(),
    typeImport: z.string(),
  }),
});

const AST_PATTERNS = ASTPatternSchema.parse({
  functions: {
    // Function declarations - using more generic wildcards
    functionDeclaration: 'function $NAME($$$) { $$$ }',
    arrowFunction: 'const $NAME = $$$',
    // Method definition - more specific pattern
    methodDefinition: 'class { $NAME($$$) { $$$ } }',
    asyncFunction: 'async function $NAME($$$) { $$$ }',
  },
  classes: {
    classDeclaration: 'class $NAME { $$$BODY }',
    classWithExtends: 'class $NAME extends $PARENT { $$$BODY }',
    // Interface pattern - more explicit
    interface: 'interface $NAME { $$$BODY }',
    typeAlias: 'type $NAME = $TYPE',
  },
  exports: {
    namedExport: 'export { $NAMES }',
    defaultExport: 'export default $VALUE',
    exportDeclaration: 'export $DECLARATION',
    exportFunction: 'export function $NAME($$$) { $$$ }',
    exportClass: 'export class $NAME { $$$BODY }',
  },
  imports: {
    namedImport: 'import { $NAMES } from "$MODULE"',
    defaultImport: 'import $NAME from "$MODULE"',
    namespaceImport: 'import * as $NAME from "$MODULE"',
    typeImport: 'import type { $NAMES } from "$MODULE"',
  },
});

/**
 * AST Analyzer implementation using AST-grep
 */
export class ASTGrepAnalyzer implements ASTAnalyzer {
  private astGrep: ASTGrepInstance | null = null;

  constructor() {
    this.initializeASTGrep();
  }

  private async initializeASTGrep() {
    try {
      // Import AST-grep NAPI bindings - correct destructuring
      const { js } = await import('@ast-grep/napi');
      // Store the js language object directly
      this.astGrep = js as unknown as ASTGrepInstance;
    } catch (error) {
      console.warn('AST-grep not available, falling back to regex parsing:', error);
      this.astGrep = null;
    }
  }

  async analyzeFile(filePath: string): Promise<ModuleDoc> {
    const [functions, classes, , imports] = await Promise.all([
      this.extractFunctions(filePath),
      this.extractClasses(filePath),
      this.extractExports(filePath),
      this.extractImports(filePath),
    ]);

    // Extract module name from file path
    const moduleName =
      filePath
        .split('/')
        .pop()
        ?.replace(/\.(ts|js)$/, '') || 'unknown';

    return {
      name: moduleName,
      filePath,
      description: await this.extractModuleDescription(filePath),
      exports: {
        functions,
        classes,
        types: await this.extractTypes(filePath),
        constants: await this.extractConstants(filePath),
      },
      imports: imports.map((imp) => ({ ...imp, isTypeOnly: false })),
      dependencies: imports.map((imp) => imp.module),
    };
  }

  async extractFunctions(filePath: string): Promise<FunctionDoc[]> {
    const content = await this.readFile(filePath);
    const functions: FunctionDoc[] = [];

    if (this.astGrep) {
      // Use AST-grep for precise extraction
      functions.push(...(await this.extractFunctionsWithASTGrep(content, filePath)));
    } else {
      // Fallback to regex-based extraction
      functions.push(...(await this.extractFunctionsWithRegex(content, filePath)));
    }

    return functions;
  }

  async extractClasses(filePath: string): Promise<ClassDoc[]> {
    const content = await this.readFile(filePath);
    const classes: ClassDoc[] = [];

    if (this.astGrep) {
      classes.push(...(await this.extractClassesWithASTGrep(content, filePath)));
    } else {
      classes.push(...(await this.extractClassesWithRegex(content, filePath)));
    }

    return classes;
  }

  async extractExports(filePath: string): Promise<string[]> {
    const content = await this.readFile(filePath);
    const exports: string[] = [];

    // Extract export statements
    const exportPatterns = [
      /export\s+(?:function|class|interface|type|const|let|var)\s+(\w+)/g,
      /export\s+\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(\w+)/g,
    ];

    for (const pattern of exportPatterns) {
      let match: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
      while ((match = pattern.exec(content)) !== null) {
        const exportName = match[1];
        if (exportName) {
          if (exportName.includes(',')) {
            // Handle named exports like { foo, bar }
            exports.push(...exportName.split(',').map((name) => name.trim()));
          } else {
            exports.push(exportName);
          }
        }
      }
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  async extractImports(filePath: string): Promise<Array<{ module: string; imports: string[] }>> {
    const content = await this.readFile(filePath);
    const imports: Array<{ module: string; imports: string[] }> = [];

    // Extract import statements
    const importPattern =
      /import\s+(?:(?:\{([^}]+)\})|(?:(\w+))|(?:\*\s+as\s+(\w+)))\s+from\s+['"]([^'"]+)['"]/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = importPattern.exec(content)) !== null) {
      const [, namedImports, defaultImport, namespaceImport, module] = match;
      const importNames: string[] = [];

      if (namedImports) {
        importNames.push(...namedImports.split(',').map((name) => name.trim()));
      }
      if (defaultImport) {
        importNames.push(defaultImport);
      }
      if (namespaceImport) {
        importNames.push(namespaceImport);
      }

      if (module) {
        imports.push({ module, imports: importNames });
      }
    }

    return imports;
  }

  async findPatternUsage(pattern: string, filePath: string): Promise<ASTNode[]> {
    const content = await this.readFile(filePath);
    const nodes: ASTNode[] = [];

    if (this.astGrep) {
      try {
        const root = this.astGrep.parse(content);
        const matches = root.findAll(pattern);

        for (const match of matches) {
          nodes.push({
            type: 'pattern_match',
            name: pattern,
            startLine: match.range().start.line,
            endLine: match.range().end.line,
            filePath,
            content: match.text(),
            metadata: { pattern },
          });
        }
      } catch (error) {
        console.warn(`Failed to find pattern ${pattern} in ${filePath}:`, error);
      }
    }

    return nodes;
  }

  // Private helper methods
  private async readFile(filePath: string): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return '';
    }
  }

  private async extractFunctionsWithASTGrep(
    content: string,
    filePath: string
  ): Promise<FunctionDoc[]> {
    const functions: FunctionDoc[] = [];

    try {
      if (!this.astGrep) {
        throw new Error('AST-grep not available');
      }

      // Parse the source content - correct API usage based on documentation
      const root = (this.astGrep as any).parse(content);
      const rootNode = root.root();

      // Find function declarations using string patterns (not pattern objects)
      const functionMatches = rootNode.findAll(AST_PATTERNS.functions.functionDeclaration);
      const arrowMatches = rootNode.findAll(AST_PATTERNS.functions.arrowFunction);

      for (const match of [...functionMatches, ...arrowMatches]) {
        const nameMatch = match.getMatch('NAME')?.text();
        
        // Extract parameters from the match text since we use generic wildcards
        const matchText = match.text();
        const params = this.extractParametersFromText(matchText, nameMatch || '');

        if (nameMatch) {
          functions.push({
            name: nameMatch,
            signature: `${nameMatch}(${params})`,
            description: await this.extractJSDocDescription(content, match.range().start.line),
            parameters: this.parseParameters(params),
            filePath,
            lineNumber: match.range().start.line,
            isExported: this.isExported(content, nameMatch),
            isAsync:
              content.includes(`async function ${nameMatch}`) ||
              content.includes(`async ${nameMatch}`),
          });
        }
      }
    } catch (error) {
      console.warn('AST-grep function extraction failed:', error);
    }

    return functions;
  }

  private async extractFunctionsWithRegex(
    content: string,
    filePath: string
  ): Promise<FunctionDoc[]> {
    const functions: FunctionDoc[] = [];
    // const _lines = content.split('\n');

    // Function patterns
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
      /(\w+)\s*\(([^)]*)\)\s*\{/g, // Method definitions
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
      while ((match = pattern.exec(content)) !== null) {
        const [fullMatch, name, params] = match;
        if (!name) continue;
        const lineNumber = content.substring(0, match.index).split('\n').length;

        functions.push({
          name,
          signature: `${name}(${params || ''})`,
          description: await this.extractJSDocDescription(content, lineNumber),
          parameters: this.parseParameters(params || ''),
          filePath,
          lineNumber,
          isExported: fullMatch.includes('export'),
          isAsync: fullMatch.includes('async'),
        });
      }
    }

    return functions;
  }

  private async extractClassesWithASTGrep(content: string, filePath: string): Promise<ClassDoc[]> {
    const classes: ClassDoc[] = [];

    try {
      if (!this.astGrep) {
        throw new Error('AST-grep not available');
      }

      // Parse the source content - correct API usage
      const root = (this.astGrep as any).parse(content);
      const rootNode = root.root();

      // Find class declarations using string patterns
      const classMatches = rootNode.findAll(AST_PATTERNS.classes.classDeclaration);

      for (const match of classMatches) {
        const name = match.getMatch('NAME')?.text() || 'anonymous';
        const body = match.getMatch('BODY')?.text() || '';

        classes.push({
          name,
          type: content.includes(`class ${name}`) ? 'class' : 'interface',
          description: await this.extractJSDocDescription(content, match.range().start.line),
          properties: this.parseClassProperties(body),
          methods: await this.parseClassMethods(body, filePath),
          filePath,
          lineNumber: match.range().start.line,
          isExported: this.isExported(content, name),
        });
      }
    } catch (error) {
      console.warn('AST-grep class extraction failed:', error);
    }

    return classes;
  }

  private async extractClassesWithRegex(content: string, filePath: string): Promise<ClassDoc[]> {
    const classes: ClassDoc[] = [];

    const classPattern =
      /(?:export\s+)?(?:class|interface)\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = classPattern.exec(content)) !== null) {
      const [fullMatch, name, parent, body] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      classes.push({
        name: name || 'unknown',
        type: fullMatch.includes('class') ? 'class' : 'interface',
        description: await this.extractJSDocDescription(content, lineNumber),
        properties: this.parseClassProperties(body || ''),
        methods: await this.parseClassMethods(body || '', filePath),
        extends: parent,
        filePath,
        lineNumber,
        isExported: fullMatch.includes('export'),
      });
    }

    return classes;
  }

  /**
   * Extract parameter list from function text when using generic wildcards
   */
  private extractParametersFromText(functionText: string, _functionName: string): string {
    try {
      // For regular functions: function name(params) { ... }
      const functionMatch = functionText.match(/function\s+\w+\s*\(([^)]*)\)/);
      if (functionMatch?.[1] !== undefined) {
        return functionMatch[1].trim();
      }
      
      // For arrow functions: const name = (params) => ...
      const arrowMatch = functionText.match(/const\s+\w+\s*=\s*\(([^)]*)\)\s*=>/);
      if (arrowMatch?.[1] !== undefined) {
        return arrowMatch[1].trim();
      }
      
      // For arrow functions without parentheses: const name = param => ...
      const singleParamMatch = functionText.match(/const\s+\w+\s*=\s*(\w+)\s*=>/);
      if (singleParamMatch?.[1] !== undefined) {
        return singleParamMatch[1].trim();
      }
      
      return '';
    } catch (error) {
      console.warn(`Failed to extract parameters from: ${functionText.substring(0, 50)}...`);
      return '';
    }
  }

  private parseParameters(
    params: string
  ): Array<{ name: string; type: string; optional: boolean }> {
    if (!params.trim()) return [];

    return params.split(',').map((param) => {
      const trimmed = param.trim();
      const optional = trimmed.includes('?');
      const [name, type] = trimmed.split(':').map((s) => s.trim());

      return {
        name: name?.replace('?', '') || 'unknown',
        type: type || 'any',
        optional,
      };
    });
  }

  private parseClassProperties(
    body: string
  ): Array<{ name: string; type: string; optional: boolean; readonly: boolean }> {
    const properties: Array<{ name: string; type: string; optional: boolean; readonly: boolean }> =
      [];
    const propertyPattern = /(readonly\s+)?(\w+)(\?)?\s*:\s*([^;,\n]+)/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = propertyPattern.exec(body)) !== null) {
      const [, readonly, name, optional, type] = match;
      if (name && type) {
        properties.push({
          name,
          type: type.trim(),
          optional: !!optional,
          readonly: !!readonly,
        });
      }
    }

    return properties;
  }

  private async parseClassMethods(body: string, filePath: string): Promise<FunctionDoc[]> {
    const methods: FunctionDoc[] = [];
    const methodPattern = /(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = methodPattern.exec(body)) !== null) {
      const [, name, params, returnType] = match;
      if (name) {
        methods.push({
          name,
          signature: `${name}(${params || ''})`,
          parameters: this.parseParameters(params || ''),
          returnType: returnType?.trim(),
          filePath,
          lineNumber: 0, // Would need more sophisticated parsing for exact line
          isExported: false, // Methods are part of exported class
          isAsync: false, // Would need to detect async methods
        });
      }
    }

    return methods;
  }

  private async extractJSDocDescription(
    content: string,
    lineNumber: number
  ): Promise<string | undefined> {
    const lines = content.split('\n');
    let description = '';

    // Look backwards from the function/class line for JSDoc comments
    for (let i = lineNumber - 2; i >= 0; i--) {
      const line = lines[i]?.trim();
      if (!line) continue;

      if (line.startsWith('/**')) {
        // Found start of JSDoc, collect until */
        for (let j = i; j < lineNumber; j++) {
          const docLine = lines[j]?.trim();
          if (docLine?.startsWith('*') && !docLine.startsWith('*/')) {
            description = `${docLine.replace(/^\*\s?/, '')}\n${description}`;
          }
          if (docLine?.includes('*/')) break;
        }
        break;
      }

      if (!line.startsWith('*') && !line.startsWith('//')) {
        break; // Hit non-comment line
      }
    }

    return description.trim() || undefined;
  }

  private isExported(content: string, name: string): boolean {
    return (
      content.includes(`export { ${name}`) ||
      content.includes(`export function ${name}`) ||
      content.includes(`export class ${name}`) ||
      content.includes(`export interface ${name}`) ||
      content.includes(`export type ${name}`) ||
      content.includes(`export const ${name}`) ||
      content.includes(`export default ${name}`)
    );
  }

  private async extractModuleDescription(filePath: string): Promise<string | undefined> {
    const content = await this.readFile(filePath);
    const lines = content.split('\n');

    // Look for file-level JSDoc or comments at the top
    let description = '';
    let inComment = false;

    for (const line of lines.slice(0, 20)) {
      // Check first 20 lines
      const trimmed = line.trim();

      if (trimmed.startsWith('/**')) {
        inComment = true;
        continue;
      }

      if (inComment) {
        if (trimmed.includes('*/')) {
          inComment = false;
          break;
        }
        if (trimmed.startsWith('*')) {
          description += `${trimmed.replace(/^\*\s?/, '')}\n`;
        }
      }

      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import') && !inComment) {
        break; // Hit actual code
      }
    }

    return description.trim() || undefined;
  }

  private async extractTypes(filePath: string): Promise<string[]> {
    const content = await this.readFile(filePath);
    const types: string[] = [];

    const typePattern = /(?:export\s+)?type\s+(\w+)/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = typePattern.exec(content)) !== null) {
      if (match[1]) {
        types.push(match[1]);
      }
    }

    return types;
  }

  private async extractConstants(
    filePath: string
  ): Promise<Array<{ name: string; type: string; value?: string }>> {
    const content = await this.readFile(filePath);
    const constants: Array<{ name: string; type: string; value?: string }> = [];

    const constPattern = /(?:export\s+)?const\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*([^;,\n]+)/g;
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = constPattern.exec(content)) !== null) {
      const [, name, type, value] = match;
      if (name) {
        constants.push({
          name,
          type: type?.trim() || 'unknown',
          ...(value?.trim() && { value: value.trim() }),
        });
      }
    }

    return constants;
  }
}

// Create and export the analyzer actor
export const astAnalyzerActor = fromPromise(
  async ({ input }: { input: { filePath: string; operation: string } }) => {
    const analyzer = new ASTGrepAnalyzer();

    switch (input.operation) {
      case 'analyze':
        return await analyzer.analyzeFile(input.filePath);
      case 'functions':
        return await analyzer.extractFunctions(input.filePath);
      case 'classes':
        return await analyzer.extractClasses(input.filePath);
      case 'exports':
        return await analyzer.extractExports(input.filePath);
      case 'imports':
        return await analyzer.extractImports(input.filePath);
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  }
);
