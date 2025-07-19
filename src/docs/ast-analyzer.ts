import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { ASTNode, ClassDoc, FunctionDoc, ModuleDoc } from './types.js';

// Define proper AST-grep interfaces - exported for reuse
export interface ASTGrepNode {
  text: () => string;
  range: () => {
    start: { index: number; line: number; column: number };
    end: { index: number; line: number; column: number };
  };
  getMatch: (name: string) => ASTGrepNode | null;
  findAll: (pattern: string) => ASTGrepNode[];
  root: () => ASTGrepNode;
  getMultipleMatches?: () => Record<string, ASTGrepNode | ASTGrepNode[]>;
}

export interface ASTGrepParser {
  parse: (content: string) => ASTGrepNode;
  parseString?: (content: string, lang?: string) => ASTGrepNode;
}

// AST-grep Zod schemas for type safety - using proper interfaces instead of z.any()
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
  getNode: z.function().returns(z.unknown()).optional(),
  getMultipleMatches: z.function().returns(z.array(z.unknown())).optional(),
});

export const ASTGrepLanguageSchema = z.object({
  parseString: z.function().args(z.string()).returns(z.unknown()),
  kind: z.string(),
  name: z.string(),
});

export const ASTGrepRuleSchema = z.object({
  pattern: z.string(),
  kind: z.string().optional(),
  inside: z.string().optional(),
  has: z.string().optional(),
  not: z.string().optional(),
  any: z.array(z.unknown()).optional(),
  all: z.array(z.unknown()).optional(),
});

export const ASTGrepConfigSchema = z.object({
  rule: ASTGrepRuleSchema,
  constraints: z.record(z.string()).optional(),
  language: z.union([z.string(), ASTGrepLanguageSchema]).optional(),
  utils: z.record(z.unknown()).optional(),
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
  parseString: z.function().args(z.string(), z.string().optional()).returns(z.unknown()),
  parse: z.function().args(z.string()).returns(z.unknown()),
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
  private astGrep: ASTGrepParser | null = null;

  constructor() {
    this.initializeASTGrep();
  }

  private async initializeASTGrep() {
    try {
      // Import AST-grep NAPI bindings - correct destructuring
      const { js } = await import('@ast-grep/napi');
      // Store the js language object directly - typed as ASTGrepParser
      this.astGrep = js as unknown as ASTGrepParser;
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
