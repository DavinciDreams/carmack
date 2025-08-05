// Unified TypeScript Analyzer - The ONE analyzer to rule them all

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { Project, SyntaxKind } from 'ts-morph';
import * as ts from 'typescript';
import { z } from 'zod';
// LLM transformation actor import
import { EnhancedLLMTransformer } from '../actors/llm-transformation-enhanced';
// Enhanced TypeScript error detection
import { TypeScriptErrorDetector } from './typescript-error-detector.js';

// Configuration schema
export const AnalyzerConfigSchema = z.object({
  projectPath: z.string().default(process.cwd()),
  includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.tsx']),
  excludePatterns: z
    .array(z.string())
    .default(['node_modules', '.next', 'dist', '.test.', '.spec.']),
  enableFixes: z.boolean().default(true),
  checkNullability: z.boolean().default(true),
  checkComponents: z.boolean().default(true),
  reportFormat: z.enum(['md', 'json', 'both']).default('both'),
  maxIssues: z.number().default(1000),
});

export type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>;

// Result schemas
const IssueSchema = z.object({
  type: z.enum(['null-access', 'type-error', 'missing-import', 'unused-code', 'performance', 'typescript-compilation']),
  severity: z.enum(['error', 'warning', 'info', 'suggestion']),
  file: z.string(),
  line: z.number(),
  column: z.number(),
  message: z.string(),
  fix: z
    .object({
      description: z.string(),
      code: z.string(),
    })
    .optional(),
  // Enhanced metadata for TypeScript error patterns
  metadata: z.object({
    tsErrorCode: z.number().optional(),
    category: z.string().optional(),
    autoFixable: z.boolean().optional(),
    patternType: z.string().optional(),
  }).optional(),
});

export class UnifiedAnalyzer {
  declare this: UnifiedAnalyzer;
  private program!: ts.Program;
  private checker!: ts.TypeChecker;
  private sourceFiles: ts.SourceFile[] = [];
  private issues: z.infer<typeof IssueSchema>[] = [];
  private filesModified: string[] = [];
  private stats = {
    filesAnalyzed: 0,
    totalLines: 0,
    issuesFound: 0,
    startTime: 0,
    endTime: 0,
  };
  // Enhanced TypeScript error detector
  private tsErrorDetector: TypeScriptErrorDetector;

  constructor(private config: AnalyzerConfig) {
    this.config = AnalyzerConfigSchema.parse(config);
    this.tsErrorDetector = new TypeScriptErrorDetector();
    this.initializeProgram();
  }

  /**
   * @this {UnifiedAnalyzer}
   */
  // @ts-ignore // TODO: Resolve 'this' type annotation issue in strict mode
  public async analyze(): Promise<{
    issues: z.infer<typeof IssueSchema>[];
    stats: {
      filesAnalyzed: number;
      totalLines: number;
      issuesFound: number;
      startTime: number;
      endTime: number;
    };
    filesModified: string[];
    llmResults?: Array<{ file: string; success: boolean; errors?: unknown[]; details?: unknown }>;
  }> {
    console.log('🔍 Unified Analyzer starting...');
    console.log(`📁 Found ${this.sourceFiles.length} files to analyze\n`);

    this.stats.startTime = performance.now();

    for (const sourceFile of this.sourceFiles) {
      this.analyzeFile(sourceFile);
      this.stats.filesAnalyzed++;

      if (this.stats.filesAnalyzed % 50 === 0) {
        console.log(`  Analyzed ${this.stats.filesAnalyzed}/${this.sourceFiles.length} files...`);
      }
    }

    if (this.config.enableFixes) {
      const fileBackups: Record<string, string> = {};
      for (const file of this.issues.filter((i) => i.fix).map((i) => i.file)) {
        if (!fileBackups[file] && fs.existsSync(file)) {
          fileBackups[file] = fs.readFileSync(file, 'utf8');
        }
      }

      await this.applyFixes();

      try {
        const { spawnSync } = require('child_process');
        const tscPath = require.resolve('typescript/bin/tsc', { paths: [this.config.projectPath] });
        const result = spawnSync(process.execPath, [tscPath, '--noEmit'], {
          cwd: this.config.projectPath,
          encoding: 'utf8',
        });

        if (result.status !== 0) {
          for (const [file, content] of Object.entries(fileBackups)) {
            fs.writeFileSync(file, content, 'utf8');
          }
          this.filesModified = [];
          console.error('❌ Post-fix TypeScript validation failed. Changes have been rolled back.');
          console.error(result.stdout || result.stderr);
          this.stats.endTime = performance.now();
          this.stats.issuesFound = this.issues.length;
          this.generateReport();
          return {
            issues: this.issues,
            stats: this.stats,
            filesModified: this.filesModified,
            llmResults: this.llmResults,
          };
        }
      } catch (err) {
        console.error('❌ Error running post-fix TypeScript validation:', err);
      }

      if (this.filesModified.length > 0) {
        const { spawnSync } = require('child_process');
        let criticalError = false;
        const biomeErrors: Record<string, string> = {};
        const eslintErrors: Record<string, string> = {};

        for (const file of this.filesModified) {
          const biomeResult = spawnSync('bun', ['x', 'biome', 'format', file, '--write'], {
            cwd: this.config.projectPath,
            encoding: 'utf8',
          });
          if (biomeResult.status !== 0) {
            biomeErrors[file] = biomeResult.stdout || biomeResult.stderr || 'Unknown Biome error';
            criticalError = true;
          }

          const eslintResult = spawnSync('bun', ['x', 'eslint', file, '--fix'], {
            cwd: this.config.projectPath,
            encoding: 'utf8',
          });
          if (eslintResult.status !== 0) {
            eslintErrors[file] =
              eslintResult.stdout || eslintResult.stderr || 'Unknown ESLint error';
            if (
              (eslintResult.stdout && /Parsing error|fatal/i.test(eslintResult.stdout)) ||
              (eslintResult.stderr && /Parsing error|fatal/i.test(eslintResult.stderr))
            ) {
              criticalError = true;
            }
          }
        }

        if (Object.keys(biomeErrors).length > 0) {
          console.error('❌ Biome formatting errors:');
          for (const [file, err] of Object.entries(biomeErrors)) {
            console.error(`  ${file}: ${err}`);
          }
        }
        if (Object.keys(eslintErrors).length > 0) {
          console.error('❌ ESLint linting errors:');
          for (const [file, err] of Object.entries(eslintErrors)) {
            console.error(`  ${file}: ${err}`);
          }
        }

        if (criticalError) {
          for (const file of this.filesModified) {
            if (fs.existsSync(file + '.bak')) {
              fs.copyFileSync(file + '.bak', file);
            }
          }
          this.filesModified = [];
          console.error(
            '❌ Critical formatting or linting error detected. Changes have been rolled back.'
          );
          this.stats.endTime = performance.now();
          this.stats.issuesFound = this.issues.length;
          this.generateReport();
          return {
            issues: this.issues,
            stats: this.stats,
            filesModified: this.filesModified,
            llmResults: this.llmResults,
          };
        }
      }
    }

    this.stats.endTime = performance.now();
    this.stats.issuesFound = this.issues.length;

    this.generateReport();

    return {
      issues: this.issues,
      stats: this.stats,
      filesModified: this.filesModified,
      llmResults: this.llmResults,
    };
  }

  // Apply all available fixes to files
  // Store LLM results and errors for reporting
  private llmResults: Array<{
    file: string;
    success: boolean;
    errors?: unknown[];
    details?: unknown;
  }> = [];

  private async applyFixes() {
    function getOffsetFromLineCol(text: string, line: number, column: number): number {
      const lines = text.split('\n');
      let offset = 0;
      for (let i = 0; i < line - 1; i++) {
        offset += (lines[i] ?? '').length + 1;
      }
      offset += column - 1;
      return offset;
    }
    const issuesByFile: Record<string, z.infer<typeof IssueSchema>[]> = {};
    for (const issue of this.issues) {
      // For type errors, always add to issuesByFile for LLM fix attempt
      if (issue.type === 'type-error' || issue.fix) {
        if (!issuesByFile[issue.file]) {
          issuesByFile[issue.file] = [];
        }
        (issuesByFile[issue.file] ?? []).push(issue);
      }
    }

    const project = new Project({
      tsConfigFilePath: path.join(this.config.projectPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });

    const llmTypeErrorFiles = new Set<string>();

    for (const [file, issues] of Object.entries(issuesByFile)) {
      try {
        const sourceFile: import('ts-morph').SourceFile =
          project.getSourceFile(file) || project.addSourceFileAtPath(file);
        let modified = false;
        let needsLLM = false;

        for (const issue of issues) {
          // Aggressively remove unused declarations for "declared but never used" or "its value is never read"
          if (
            issue.type === 'type-error' &&
            /is declared but (never used|its value is never read)/.test(issue.message)
          ) {
            const fullText = sourceFile.getFullText();
            const pos = getOffsetFromLineCol(fullText, issue.line, issue.column);
            const node = sourceFile.getDescendantAtPos(pos);

            // Try to remove variable, function, type alias, interface, enum, or import
            let removed = false;
            if (node) {
              // Variable, function, class, enum, type alias, interface
              const decl =
                node.getFirstAncestor((a) =>
                  [
                    SyntaxKind.VariableStatement,
                    SyntaxKind.FunctionDeclaration,
                    SyntaxKind.ClassDeclaration,
                    SyntaxKind.EnumDeclaration,
                    SyntaxKind.TypeAliasDeclaration,
                    SyntaxKind.InterfaceDeclaration,
                  ].includes(a.getKind())
                );

              if (decl) {
                // Remove only if the node supports .remove()
                switch (decl.getKind()) {
                  case SyntaxKind.VariableStatement: {
                    // Remove only the unused variable from the declaration list
                    const varStmt = decl as import('ts-morph').VariableStatement;
                    const varDecls = varStmt.getDeclarations();
                    if (node.asKind && node.asKind(SyntaxKind.VariableDeclaration)) {
                      const varDecl = node.asKind(SyntaxKind.VariableDeclaration);
                      if (varDecls.length > 1 && varDecl) {
                        varDecl.remove();
                        removed = true;
                        console.log(`Removed unused variable declaration '${varDecl.getName()}' from ${file}`);
                      } else {
                        varStmt.remove();
                        removed = true;
                        console.log(`Removed unused variable statement from ${file}`);
                      }
                    }
                    break;
                  }
                  case SyntaxKind.FunctionDeclaration:
                  case SyntaxKind.ClassDeclaration:
                  case SyntaxKind.EnumDeclaration:
                  case SyntaxKind.TypeAliasDeclaration:
                  case SyntaxKind.InterfaceDeclaration:
                    (decl as import('ts-morph').Node & { remove(): void }).remove();
                    removed = true;
                    console.log(`Removed unused declaration from ${file}`);
                    break;
                  default:
                    break;
                }
              } else if (node.asKind && node.asKind(SyntaxKind.VariableDeclaration)) {
                // Remove only the unused variable from the declaration list
                const varDecl = node.asKind(SyntaxKind.VariableDeclaration);
                const parentStmt = varDecl?.getFirstAncestorByKind(SyntaxKind.VariableStatement);
                if (parentStmt && varDecl) {
                  const varDecls = parentStmt.getDeclarations();
                  if (varDecls.length > 1) {
                    varDecl.remove();
                    removed = true;
                    console.log(`Removed unused variable declaration '${varDecl.getName()}' from ${file}`);
                  } else {
                    parentStmt.remove();
                    removed = true;
                    console.log(`Removed unused variable statement from ${file}`);
                  }
                }
              } else {
                // Remove named import if possible
                const namedImport = node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier);
                if (namedImport) {
                  namedImport.remove();
                  removed = true;
                } else {
                  // Remove default or namespace import
                  const importDecl = node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                  if (importDecl) {
                    importDecl.remove();
                    removed = true;
                  }
                }
              }
            }
            if (removed) {
              modified = true;
              sourceFile.saveSync();
              continue;
            }
            // If not removed, fallback to LLM
            needsLLM = true;
            continue;
          }

          // If it's a type error, always try LLM fix
          if (issue.type === 'type-error') {
            needsLLM = true;
            continue;
          }
          if (!issue.fix) continue;

          if (issue.fix.description === 'Add optional chaining') {
            const fullText = sourceFile.getFullText();
            const pos = getOffsetFromLineCol(fullText, issue.line, issue.column);
            const node = sourceFile.getDescendantAtPos(pos);
            const propAccess =
              node?.getFirstAncestorByKind(SyntaxKind.PropertyAccessExpression) ||
              node?.asKind(SyntaxKind.PropertyAccessExpression);
            if (propAccess) {
              propAccess.replaceWithText(issue.fix.code);
              modified = true;
            }
          } else if (issue.fix.description === 'Remove console statement') {
            const fullText = sourceFile.getFullText();
            const pos = getOffsetFromLineCol(fullText, issue.line, issue.column);
            const node = sourceFile.getDescendantAtPos(pos);
            const exprStmt =
              node?.getFirstAncestorByKind(SyntaxKind.ExpressionStatement) ||
              node?.asKind(SyntaxKind.ExpressionStatement);
            if (exprStmt) {
              exprStmt.remove();
              modified = true;
            }
          } else if (issue.fix.description === 'Remove unused import') {
            // Remove the unused import using ts-morph
            const pos = getOffsetFromLineCol(sourceFile.getFullText(), issue.line, issue.column);
            const node = sourceFile.getDescendantAtPos(pos);
            // Find the import declaration or named import to remove
            let removed = false;
            if (node) {
              // Remove named import if possible
              const namedImport = node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier);
              if (namedImport) {
                namedImport.remove();
                removed = true;
              } else {
                // Remove default or namespace import
                const importDecl = node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                if (importDecl) {
                  importDecl.remove();
                  removed = true;
                }
              }
            }
            if (removed) {
              modified = true;
            }
          } else {
            const fullText = sourceFile.getFullText();
            const pos = getOffsetFromLineCol(fullText, issue.line, issue.column);
            const node = sourceFile.getDescendantAtPos(pos);
            if (node) {
              node.replaceWithText(issue.fix.code);
              modified = true;
            }
          }
        }

        if (modified) {
          sourceFile.saveSync();
          this.filesModified.push(file);
          console.log(`💡 Auto-fixed (AST): ${file}`);
        }
        // If LLM is needed for this file, add to set
        if (needsLLM) {
          llmTypeErrorFiles.add(file);
        }
      } catch (e) {
        if (issues.some((i) => i.type === 'type-error')) {
          llmTypeErrorFiles.add(file);
        }
        console.warn(`Failed to auto-fix ${file}:`, e);
      }
    }

    // LLM fallback for unresolved type errors
    if (llmTypeErrorFiles.size > 0) {
      const llm = new EnhancedLLMTransformer();
      const llmPromises: Promise<void>[] = [];
      for (const file of llmTypeErrorFiles) {
        try {
          const code = fs.readFileSync(file, 'utf8');
          const fileIssues = this.issues.filter((i) => i.file === file && i.type === 'type-error');
          const errorMessages = fileIssues.map((i) => i.message).join('\n');
          const llmInput = {
            files: [file],
            request: {
              prompt: `Resolve the following TypeScript type errors:\n${errorMessages}\n\nFocus only on type issues that cannot be auto-fixed by AST.`,
              targetFiles: [file],
              transformationType: 'llm',
              examples: [],
              maxComplexity: 10,
              dryRun: false,
              description: 'LLM type error fix',
              language: 'typescript',
              pattern: '',
              testCases: [],
              incrementalMode: false,
              rollbackOnFailure: false,
              constraints: {
                maxExecutionTime: 60000,
                maxMemoryUsage: 512,
                maxTokens: 8000,
                costLimit: 2.0,
              },
            } as import('../types').EnhancedTransformationRequest,
          } satisfies import('../actors/llm-transformation-enhanced').EnhancedLLMTransformationInput;
          console.log(`🤖 Invoking LLM pipeline for unresolved type errors in ${file}...`);
          const p = llm
            .transformFiles(llmInput)
            .then((result) => {
              if (result.errors && result.errors.length > 0) {
                this.llmResults.push({
                  file,
                  success: false,
                  errors: result.errors,
                  details: result,
                });
                console.error(`❌ LLM failed to fix ${file}:`, result.errors);
              } else if (result.filesModified && result.filesModified.includes(file)) {
                this.filesModified.push(file);
                this.llmResults.push({
                  file,
                  success: true,
                  details: result,
                });
                console.log(`✨ LLM auto-fixed type errors in ${file}`);
              } else {
                this.llmResults.push({
                  file,
                  success: false,
                  errors: [{ message: 'No valid fix produced' }],
                  details: result,
                });
                console.warn(`⚠️  LLM did not modify ${file} or no valid fix was produced.`);
              }
            })
            .catch((err) => {
              this.llmResults.push({
                file,
                success: false,
                errors: [err],
              });
              console.error(`❌ LLM pipeline error for ${file}:`, err);
            });
          llmPromises.push(p);
        } catch (err) {
          this.llmResults.push({
            file,
            success: false,
            errors: [err],
          });
          console.error(`❌ Failed to invoke LLM for ${file}:`, err);
        }
      }
      // Await all LLM fix promises before returning
      await Promise.all(llmPromises);
    }
  }

  private initializeProgram() {
    const configPath = ts.findConfigFile(
      this.config.projectPath,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    let fileNames: string[];
    let options: ts.CompilerOptions;

    if (configPath) {
      const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(config, ts.sys, this.config.projectPath);
      fileNames = parsed.fileNames;
      options = parsed.options;
    } else {
      // No tsconfig, analyze all TypeScript files
      fileNames = this.findTypeScriptFiles();
      options = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      };
    }

    // Create program
    this.program = ts.createProgram(fileNames, options);
    this.checker = this.program.getTypeChecker();

    // Filter source files
    this.sourceFiles = this.program.getSourceFiles().filter((sf) => {
      const fileName = sf.fileName;
      return !this.config.excludePatterns.some((pattern) => fileName.includes(pattern));
    });
  }

  private findTypeScriptFiles(): string[] {
    const files: string[] = [];
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.config.excludePatterns.some((p) => entry.name === p)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    };

    console.log('UnifiedAnalyzer DEBUG: Walking directory:', this.config.projectPath);
    walkDir(this.config.projectPath);
    console.log('UnifiedAnalyzer DEBUG: Discovered files:', files);
    return files;
  }

  private analyzeFile(sourceFile: ts.SourceFile) {
    const lineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line;
    this.stats.totalLines += lineCount;

    // Run various analyses
    if (this.config.checkNullability) {
      this.checkNullability(sourceFile);
    }

    // Check for unused imports using ts-morph
    this.checkUnusedImports(sourceFile);

    // Check for common issues
    this.checkCommonPatterns(sourceFile);

    // Type errors (original basic detection)
    this.checkTypeErrors(sourceFile);
    
    // Enhanced TypeScript error detection with actionable patterns
    this.checkEnhancedTypeScriptErrors(sourceFile);
  }

  /**
   * Detect unused imports using ts-morph and add issues for them.
   */
  private checkUnusedImports(sourceFile: ts.SourceFile) {
    try {
      const filePath = sourceFile.fileName;
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

      // Use the TypeScript type checker to find all used symbols (including type-only)
      const importSymbols = new Map<string, { node: ts.Node; importDecl: ts.ImportDeclaration }>();

      sourceFile.forEachChild((node) => {
        if (ts.isImportDeclaration(node) && node.importClause) {
          const { name, namedBindings } = node.importClause;
          if (name) {
            importSymbols.set(name.text, { node: name, importDecl: node });
          }
          if (namedBindings) {
            if (ts.isNamedImports(namedBindings)) {
              for (const element of namedBindings.elements) {
                importSymbols.set(element.name.text, { node: element.name, importDecl: node });
              }
            } else if (ts.isNamespaceImport(namedBindings)) {
              importSymbols.set(namedBindings.name.text, { node: namedBindings.name, importDecl: node });
            }
          }
        }
      });

      // Gather all identifiers used in the file (value and type positions)
      const used = new Set<string>();
      const checker = this.checker;
      function visit(node: ts.Node) {
        if (ts.isIdentifier(node)) {
          // Check if this identifier refers to an import symbol
          const symbol = checker.getSymbolAtLocation(node);
          if (symbol && symbol.declarations && symbol.declarations.length > 0) {
            const decl = symbol.declarations[0];
            if (
              decl &&
              (ts.isImportClause(decl as ts.Node) ||
                ts.isImportSpecifier(decl as ts.Node) ||
                ts.isNamespaceImport(decl as ts.Node))
            ) {
              used.add(node.text);
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sourceFile);

      // Mark as unused only if not referenced in any position
      for (const [name, { node, importDecl }] of importSymbols.entries()) {
        if (!used.has(name)) {
          const pos = node.getStart();
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
          this.addIssue({
            type: 'unused-code',
            severity: 'warning',
            file: filePath,
            line: line + 1,
            column: character + 1,
            message: `Unused import: '${name}'`,
            fix: this.config.enableFixes
              ? {
                  description: 'Remove unused import',
                  code: '', // Removal handled in applyFixes
                }
              : undefined,
          });
        }
      }
    } catch (err) {
      // Fail silently, do not block analysis
    }
  }

  private checkNullability(sourceFile: ts.SourceFile) {
    const visit = (node: ts.Node) => {
      // Property access that could fail
      if (ts.isPropertyAccessExpression(node)) {
        const type = this.checker.getTypeAtLocation(node.expression);

        if (this.isNullable(type) && !this.hasNullProtection(node)) {
          this.addIssue({
            type: 'null-access',
            severity: 'error',
            file: sourceFile.fileName,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
            message: `Property access '${node.name.text}' on possibly null/undefined value`,
            fix: this.config.enableFixes
              ? {
                  description: 'Add optional chaining',
                  code: `${node.expression.getText()}?.${node.name.text}`,
                }
              : undefined,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkCommonPatterns(sourceFile: ts.SourceFile) {
    const visit = (node: ts.Node) => {
      // console.log in production code
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText() === 'console'
      ) {
        this.addIssue({
          type: 'performance',
          severity: 'warning',
          file: sourceFile.fileName,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
          message: 'Console statement in production code',
          fix: {
            description: 'Remove console statement',
            code: '',
          },
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkTypeErrors(sourceFile: ts.SourceFile) {
    const diagnostics = ts.getPreEmitDiagnostics(this.program, sourceFile);

    for (const diagnostic of diagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        this.addIssue({
          type: 'type-error',
          severity: 'error',
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        });
      }
    }
  }

  /**
   * Enhanced TypeScript error detection with actionable patterns and fixes
   */
  private checkEnhancedTypeScriptErrors(sourceFile: ts.SourceFile) {
    try {
      const filePath = sourceFile.fileName;
      
      // Skip non-TypeScript files
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') &&
          !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
        return;
      }

      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Create minimal file metadata for the detector
      const fileMetadata = {
        path: filePath,
        relativePath: path.relative(this.config.projectPath, filePath),
        language: filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? 'tsx' : 'typescript',
        mtime: Date.now(),
        size: content.length,
        encoding: 'utf8',
        lineCount: content.split('\n').length
      };

      // Use enhanced TypeScript error detector
      const patterns = this.tsErrorDetector.detectErrorPatternsSync(fileMetadata, content);
      
      // Convert patterns to issues
      for (const pattern of patterns) {
        const severity = this.mapPatternSeverityToIssueSeverity(pattern.metadata?.severity || 'error');
        const issueType = this.mapPatternTypeToIssueType(pattern.type);
        
        this.addIssue({
          type: issueType,
          severity,
          file: filePath,
          line: pattern.location.startLine,
          column: pattern.location.startColumn || 1,
          message: pattern.metadata?.reason || `TypeScript error: ${pattern.type}`,
          fix: pattern.after ? {
            description: this.generateFixDescription(pattern.type),
            code: pattern.after
          } : undefined,
          metadata: {
            tsErrorCode: pattern.metadata?.tsErrorCode,
            category: pattern.metadata?.category,
            autoFixable: pattern.metadata?.autoFixable,
            patternType: pattern.type,
          }
        });
      }

      if (patterns.length > 0) {
        console.log(`🔍 Enhanced TypeScript analysis found ${patterns.length} actionable patterns in ${path.basename(filePath)}`);
      }

    } catch (error) {
      console.warn(`⚠️ Enhanced TypeScript error detection failed for ${sourceFile.fileName}:`, (error as Error).message);
    }
  }

  private mapPatternSeverityToIssueSeverity(severity: string): 'error' | 'warning' | 'info' | 'suggestion' {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'suggestion': return 'suggestion';
      default: return 'info';
    }
  }

  private mapPatternTypeToIssueType(patternType: string): 'null-access' | 'type-error' | 'missing-import' | 'unused-code' | 'performance' | 'typescript-compilation' {
    if (patternType.includes('null-safety') || patternType.includes('undefined-safety')) {
      return 'null-access';
    }
    if (patternType.includes('unused')) {
      return 'unused-code';
    }
    if (patternType.includes('console')) {
      return 'performance';
    }
    if (patternType.includes('missing-import')) {
      return 'missing-import';
    }
    if (patternType.includes('typescript-compilation-error') || patternType.includes('type')) {
      return 'typescript-compilation';
    }
    return 'type-error';
  }

  private generateFixDescription(patternType: string): string {
    switch (patternType) {
      case 'null-safety-optional-chaining':
      case 'undefined-safety-optional-chaining':
        return 'Add optional chaining';
      case 'undefined-function-call':
        return 'Add null check before function call';
      case 'missing-parameter-type':
        return 'Add parameter type annotation';
      case 'missing-variable-type':
        return 'Add variable type annotation';
      case 'missing-return-type':
        return 'Add return type annotation';
      case 'unused-variable':
      case 'unused-function':
        return 'Remove unused declaration';
      case 'console-cleanup':
        return 'Remove console statement';
      case 'empty-catch-block':
        return 'Add proper error handling';
      case 'any-type-improvement':
        return 'Replace any with specific type';
      default:
        return `Fix ${patternType.replace(/-/g, ' ')}`;
    }
  }

  private isNullable(type: ts.Type): boolean {
    if (type.isUnion()) {
      return type.types.some(
        (t) => t.flags & ts.TypeFlags.Null || t.flags & ts.TypeFlags.Undefined
      );
    }
    return !!(type.flags & ts.TypeFlags.Null || type.flags & ts.TypeFlags.Undefined);
  }

  private hasNullProtection(node: ts.Node): boolean {
    let parent = node.parent;

    while (parent && !ts.isSourceFile(parent)) {
      if (
        ts.isPropertyAccessChain(parent) ||
        ts.isIfStatement(parent) ||
        ts.isConditionalExpression(parent)
      ) {
        return true;
      }
      parent = parent.parent;
    }

    return false;
  }

  private addIssue(issue: z.infer<typeof IssueSchema>) {
    if (this.issues.length < this.config.maxIssues) {
      this.issues.push(issue);
    }
  }

  private generateReport() {
    const duration = this.stats.endTime - this.stats.startTime;

    // Console summary
    console.log('\n📊 Analysis Complete!');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📁 Files analyzed: ${this.stats.filesAnalyzed}`);
    console.log(`📝 Total lines: ${this.stats.totalLines.toLocaleString()}`);
    console.log(`🐛 Issues found: ${this.stats.issuesFound}`);
    console.log(`⚡ Speed: ${(this.stats.filesAnalyzed / (duration / 1000)).toFixed(1)} files/sec`);

    // Group issues by type
    const byType = this.issues.reduce(
      (acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n🔍 Issues by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // LLM results summary
    if (this.llmResults && this.llmResults.length > 0) {
      console.log('\n🤖 LLM Fix Results:');
      for (const res of this.llmResults) {
        if (res.success) {
          console.log(`   ${res.file}: ✅ Success`);
        } else {
          console.log(`   ${res.file}: ❌ Failed`);
          if (res.errors) {
            for (const err of res.errors) {
              console.log(`     - ${typeof err === 'string' ? err : JSON.stringify(err)}`);
            }
          }
        }
      }
    }

    // Save reports
    if (this.config.reportFormat === 'json' || this.config.reportFormat === 'both') {
      fs.writeFileSync(
        'unified-analysis.json',
        JSON.stringify(
          {
            stats: this.stats,
            issues: this.issues,
            config: this.config,
            llmResults: this.llmResults,
          },
          null,
          2
        )
      );
      console.log('\n📄 JSON report: unified-analysis.json');
    }

    if (this.config.reportFormat === 'md' || this.config.reportFormat === 'both') {
      const markdown = this.generateMarkdownReport();
      fs.writeFileSync('unified-analysis.md', markdown);
      console.log('📄 Markdown report: unified-analysis.md');
    }
  }

  private generateMarkdownReport(): string {
    let md = '# Unified TypeScript Analysis Report\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;

    md += '## Summary\n\n';
    md += `- Files Analyzed: ${this.stats.filesAnalyzed}\n`;
    md += `- Total Lines: ${this.stats.totalLines.toLocaleString()}\n`;
    md += `- Issues Found: ${this.stats.issuesFound}\n`;
    md += `- Analysis Time: ${((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)}s\n\n`;

    if (this.llmResults && this.llmResults.length > 0) {
      md += '## LLM Fix Results\n\n';
      for (const res of this.llmResults) {
        md += `- **${res.file}**: ${res.success ? '✅ Success' : '❌ Failed'}\n`;
        if (!res.success && res.errors) {
          for (const err of res.errors) {
            md += `  - Error: ${typeof err === 'string' ? err : JSON.stringify(err)}\n`;
          }
        }
      }
      md += '\n';
    }

    if (this.issues.length > 0) {
      md += '## Issues\n\n';

      // Group by severity
      const bySeverity = {
        error: this.issues.filter((i) => i.severity === 'error'),
        warning: this.issues.filter((i) => i.severity === 'warning'),
        info: this.issues.filter((i) => i.severity === 'info'),
      };

      for (const [severity, issues] of Object.entries(bySeverity)) {
        if (issues.length === 0) continue;

        md += `### ${severity.toUpperCase()}S (${issues.length})\n\n`;

        for (const issue of issues.slice(0, 50)) {
          // First 50 of each type
          md += `- **${path.basename(issue.file)}:${issue.line}:${issue.column}** - ${issue.message}\n`;
          if (issue.fix) {
            md += `  - Fix: ${issue.fix.description}\n`;
          }
        }

        if (issues.length > 50) {
          md += `\n...and ${issues.length - 50} more ${severity}s\n`;
        }

        md += '\n';
      }
    }

    return md;
  }
}
