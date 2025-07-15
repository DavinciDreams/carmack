import { fromPromise } from 'xstate';
import type { ASTNode, ClassDoc, FunctionDoc, ModuleDoc } from './types.js';

// AST-grep integration for code analysis
export interface ASTAnalyzer {
  analyzeFile(filePath: string): Promise<ModuleDoc>;
  extractFunctions(filePath: string): Promise<FunctionDoc[]>;
  extractClasses(filePath: string): Promise<ClassDoc[]>;
  extractExports(filePath: string): Promise<string[]>;
  extractImports(filePath: string): Promise<Array<{ module: string; imports: string[] }>>;
  findPatternUsage(pattern: string, filePath: string): Promise<ASTNode[]>;
}

// AST-grep patterns for TypeScript/JavaScript analysis
const AST_PATTERNS = {
  functions: {
    // Function declarations
    functionDeclaration: 'function $NAME($PARAMS) { $BODY }',
    arrowFunction: 'const $NAME = ($PARAMS) => $BODY',
    methodDefinition: '$NAME($PARAMS) { $BODY }',
    asyncFunction: 'async function $NAME($PARAMS) { $BODY }',
  },
  classes: {
    classDeclaration: 'class $NAME { $BODY }',
    classWithExtends: 'class $NAME extends $PARENT { $BODY }',
    interface: 'interface $NAME { $BODY }',
    typeAlias: 'type $NAME = $TYPE',
  },
  exports: {
    namedExport: 'export { $NAMES }',
    defaultExport: 'export default $VALUE',
    exportDeclaration: 'export $DECLARATION',
    exportFunction: 'export function $NAME($PARAMS) { $BODY }',
    exportClass: 'export class $NAME { $BODY }',
  },
  imports: {
    namedImport: 'import { $NAMES } from "$MODULE"',
    defaultImport: 'import $NAME from "$MODULE"',
    namespaceImport: 'import * as $NAME from "$MODULE"',
    typeImport: 'import type { $NAMES } from "$MODULE"',
  },
};

/**
 * AST Analyzer implementation using AST-grep
 */
export class ASTGrepAnalyzer implements ASTAnalyzer {
  private astGrep: any;

  constructor() {
    this.initializeASTGrep();
  }

  private async initializeASTGrep() {
    try {
      // Import AST-grep NAPI bindings
      const { js } = await import('@ast-grep/napi');
      this.astGrep = js;
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
      let match;
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

    let match;
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
      const root = this.astGrep.parse(content);

      // Find function declarations
      const functionMatches = root.findAll(AST_PATTERNS.functions.functionDeclaration);
      const arrowMatches = root.findAll(AST_PATTERNS.functions.arrowFunction);
      const methodMatches = root.findAll(AST_PATTERNS.functions.methodDefinition);

      for (const match of [...functionMatches, ...arrowMatches, ...methodMatches]) {
        const nameMatch = match.getMatch('NAME')?.text();
        const params = match.getMatch('PARAMS')?.text() || '';

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
      let match;
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
      const root = this.astGrep.parse(content);
      const classMatches = root.findAll(AST_PATTERNS.classes.classDeclaration);
      const interfaceMatches = root.findAll(AST_PATTERNS.classes.interface);

      for (const match of [...classMatches, ...interfaceMatches]) {
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
    let match;

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

    let match;
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

    let match;
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
    let match;

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
    let match;

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
