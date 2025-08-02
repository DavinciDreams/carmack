import { z } from 'zod';
import { Project, SourceFile, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import { createHash } from 'node:crypto';
import { type FileMetadata } from './repository-analyzer.js';
import { type RawPattern } from './pattern-detection-pipeline.js';

/**
 * Enhanced TypeScript Pattern Detector using ts-morph
 * 
 * Provides sophisticated AST-based pattern detection for TypeScript/JavaScript files
 * with better accuracy than regex-based approaches.
 */

export class TsMorphPatternDetector {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // Latest
        allowJs: true,
        checkJs: false,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    });
  }

  /**
   * Detect patterns in TypeScript/JavaScript content using ts-morph
   */
  async detectPatterns(file: FileMetadata, content: string): Promise<RawPattern[]> {
    const patterns: RawPattern[] = [];
    
    // Only process TypeScript/JavaScript files
    if (!file.path.match(/\.(ts|tsx|js|jsx)$/)) {
      return patterns;
    }
    
    try {
      // Create source file in ts-morph project
      const sourceFile = this.project.createSourceFile(file.path, content, { overwrite: true });
      
      // Detect various patterns
      patterns.push(...this.detectVariableDeclarationPatterns(sourceFile, file.path));
      patterns.push(...this.detectFunctionPatterns(sourceFile, file.path));
      patterns.push(...this.detectStringConcatenationPatterns(sourceFile, file.path));
      patterns.push(...this.detectConsoleLogPatterns(sourceFile, file.path));
      patterns.push(...this.detectArrayMethodPatterns(sourceFile, file.path));
      
      // Clean up
      sourceFile.delete();
      
      console.log(`🔍 ts-morph detected ${patterns.length} patterns in ${file.relativePath}`);
      
    } catch (error) {
      console.warn(`Failed to parse TypeScript for ${file.path}:`, error);
    }
    
    return patterns;
  }

  private detectVariableDeclarationPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find var declarations that should be const/let
    const varDeclarations = sourceFile.getVariableDeclarations()
      .filter(decl => decl.getVariableStatement()?.getDeclarationKind() === VariableDeclarationKind.Var);
    
    for (const decl of varDeclarations) {
      const statement = decl.getVariableStatement()!;
      const text = statement.getText();
      const name = decl.getName();
      
      // Determine if it should be const or let
      const hasInitializer = decl.hasInitializer();
      const isReassigned = this.isVariableReassigned(sourceFile, name);
      
      if (hasInitializer && !isReassigned) {
        const after = text.replace(/\bvar\b/, 'const');
        
        patterns.push({
          id: this.generatePatternId('var-to-const', filePath),
          type: 'var-to-const',
          language: 'typescript',
          before: text,
          after,
          confidence: this.calculateConfidence({ syntactic: 0.9, semantic: 0.8, frequency: 0.9 }),
          location: {
            startLine: statement.getStartLineNumber(),
            endLine: statement.getEndLineNumber(),
            startColumn: statement.getStart() - statement.getStartLinePos(),
            endColumn: statement.getEnd() - statement.getStartLinePos()
          },
          metadata: {
            variableName: name,
            stage: 'ts-morph',
            category: 'modernization',
            reason: 'var with initializer, not reassigned'
          }
        });
      } else if (hasInitializer && isReassigned) {
        const after = text.replace(/\bvar\b/, 'let');
        
        patterns.push({
          id: this.generatePatternId('var-to-let', filePath),
          type: 'var-to-let',
          language: 'typescript',
          before: text,
          after,
          confidence: this.calculateConfidence({ syntactic: 0.8, semantic: 0.7, frequency: 0.8 }),
          location: {
            startLine: statement.getStartLineNumber(),
            endLine: statement.getEndLineNumber(),
            startColumn: statement.getStart() - statement.getStartLinePos(),
            endColumn: statement.getEnd() - statement.getStartLinePos()
          },
          metadata: {
            variableName: name,
            stage: 'ts-morph',
            category: 'modernization',
            reason: 'var that is reassigned'
          }
        });
      }
    }
    
    return patterns;
  }

  private detectFunctionPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find function declarations that could be arrow functions
    const functionDeclarations = sourceFile.getFunctions();
    
    for (const func of functionDeclarations) {
      const text = func.getText();
      const name = func.getName();
      
      // Check if it's a simple function that could be an arrow function
      if (name && this.isSimpleFunction(func)) {
        const arrowFunction = this.convertToArrowFunction(func);
        
        if (arrowFunction && arrowFunction !== text) {
          patterns.push({
            id: this.generatePatternId('function-to-arrow', filePath),
            type: 'function-to-arrow',
            language: 'typescript',
            before: text,
            after: arrowFunction,
            confidence: this.calculateConfidence({ syntactic: 0.8, semantic: 0.7, frequency: 0.6 }),
            location: {
              startLine: func.getStartLineNumber(),
              endLine: func.getEndLineNumber(),
              startColumn: func.getStart() - func.getStartLinePos(),
              endColumn: func.getEnd() - func.getStartLinePos()
            },
            metadata: {
              functionName: name,
              stage: 'ts-morph',
              category: 'modernization',
              reason: 'simple function without this usage'
            }
          });
        }
      }
    }
    
    return patterns;
  }

  private detectStringConcatenationPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find binary expressions with + operator on strings
    sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach(expr => {
      if (expr.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
        const left = expr.getLeft();
        const right = expr.getRight();
        
        // Check if it's string concatenation
        if (this.isStringLiteral(left) || this.isStringLiteral(right)) {
          const text = expr.getText();
          const templateLiteral = this.convertToTemplateLiteral(text);
          
          if (templateLiteral && templateLiteral !== text) {
            patterns.push({
              id: this.generatePatternId('string-to-template', filePath),
              type: 'string-to-template',
              language: 'typescript',
              before: text,
              after: templateLiteral,
              confidence: this.calculateConfidence({ syntactic: 0.7, semantic: 0.8, frequency: 0.7 }),
              location: {
                startLine: expr.getStartLineNumber(),
                endLine: expr.getEndLineNumber(),
                startColumn: expr.getStart() - expr.getStartLinePos(),
                endColumn: expr.getEnd() - expr.getStartLinePos()
              },
              metadata: {
                stage: 'ts-morph',
                category: 'modernization',
                reason: 'string concatenation can use template literal'
              }
            });
          }
        }
      }
    });
    
    return patterns;
  }

  private detectConsoleLogPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find console.log statements that could be optimized
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const expr = call.getExpression();
      if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = expr as any;
        const obj = propAccess.getExpression();
        const prop = propAccess.getName();
        
        if (obj.getText() === 'console' && prop === 'log') {
          const text = call.getText();
          const args = call.getArguments();
          
          // Check if it's string concatenation in console.log
          if (args.length === 1 && args[0]?.getKind() === SyntaxKind.BinaryExpression) {
            const binaryExpr = args[0] as any;
            if (binaryExpr.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
              const templateVersion = this.convertConsoleLogToTemplate(text);
              if (templateVersion) {
                patterns.push({
                  id: this.generatePatternId('console-log-template', filePath),
                  type: 'console-log-template',
                  language: 'typescript',
                  before: text,
                  after: templateVersion,
                  confidence: this.calculateConfidence({ syntactic: 0.6, semantic: 0.7, frequency: 0.5 }),
                  location: {
                    startLine: call.getStartLineNumber(),
                    endLine: call.getEndLineNumber(),
                    startColumn: call.getStart() - call.getStartLinePos(),
                    endColumn: call.getEnd() - call.getStartLinePos()
                  },
                  metadata: {
                    stage: 'ts-morph',
                    category: 'optimization',
                    reason: 'console.log with string concatenation'
                  }
                });
              }
            }
          }
        }
      }
    });
    
    return patterns;
  }

  private detectArrayMethodPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find for loops that could be array methods
    sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement).forEach(forLoop => {
      const text = forLoop.getText();
      
      // Simple pattern: for (var i = 0; i < array.length; i++)
      if (text.includes('.length') && text.includes('i++')) {
        const mapVersion = this.convertForLoopToMap(text);
        if (mapVersion) {
          patterns.push({
            id: this.generatePatternId('for-to-map', filePath),
            type: 'for-to-map',
            language: 'typescript',
            before: text,
            after: mapVersion,
            confidence: this.calculateConfidence({ syntactic: 0.5, semantic: 0.6, frequency: 0.4 }),
            location: {
              startLine: forLoop.getStartLineNumber(),
              endLine: forLoop.getEndLineNumber(),
              startColumn: forLoop.getStart() - forLoop.getStartLinePos(),
              endColumn: forLoop.getEnd() - forLoop.getStartLinePos()
            },
            metadata: {
              stage: 'ts-morph',
              category: 'modernization',
              reason: 'for loop could be array method'
            }
          });
        }
      }
    });
    
    return patterns;
  }

  // Helper methods
  private isVariableReassigned(sourceFile: SourceFile, variableName: string): boolean {
    const assignments = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression)
      .filter(expr => expr.getOperatorToken().getKind() === SyntaxKind.EqualsToken);
    
    return assignments.some(assignment => {
      const left = assignment.getLeft();
      return left.getKind() === SyntaxKind.Identifier && left.getText() === variableName;
    });
  }

  private isSimpleFunction(func: any): boolean {
    const bodyStatements = func.getBody()?.getStatements() || [];
    
    if (bodyStatements.length === 1) {
      const statement = bodyStatements[0];
      if (statement.getKind() === SyntaxKind.ReturnStatement) {
        const text = func.getText();
        return !text.includes('this') && !text.includes('arguments');
      }
    }
    
    return false;
  }

  private convertToArrowFunction(func: any): string | null {
    const name = func.getName();
    const parameters = func.getParameters().map((p: any) => p.getText()).join(', ');
    const body = func.getBody();
    
    if (body) {
      const statements = body.getStatements();
      if (statements.length === 1 && statements[0].getKind() === SyntaxKind.ReturnStatement) {
        const returnStmt = statements[0] as any;
        const returnExpr = returnStmt.getExpression()?.getText() || '';
        return `const ${name} = (${parameters}) => ${returnExpr};`;
      }
    }
    
    return null;
  }

  private isStringLiteral(node: any): boolean {
    const kind = node.getKind();
    return kind === SyntaxKind.StringLiteral || 
           kind === SyntaxKind.NoSubstitutionTemplateLiteral;
  }

  private convertToTemplateLiteral(concatenation: string): string | null {
    // Simple regex-based conversion for demo
    const simplePattern = /^['"`]([^'"`]*)['"`]\s*\+\s*(\w+)(?:\s*\+\s*['"`]([^'"`]*)['"`])?/;
    const match = concatenation.match(simplePattern);
    
    if (match) {
      const [, prefix, variable, suffix] = match;
      return `\`${prefix}\${${variable}}${suffix || ''}\``;
    }
    
    return null;
  }

  private convertConsoleLogToTemplate(consoleLog: string): string | null {
    // Extract the concatenation from console.log(...)
    const match = consoleLog.match(/console\.log\((.+)\)/);
    if (match && typeof match[1] === 'string') {
      const templateVersion = this.convertToTemplateLiteral(match[1]);
      if (templateVersion) {
        return `console.log(${templateVersion})`;
      }
    }
    return null;
  }

  private convertForLoopToMap(forLoop: string): string | null {
    // This is a simplified example - real implementation would be more sophisticated
    if (forLoop.includes('push')) {
      return '// TODO: Convert to array.map() method';
    }
    return null;
  }

  private generatePatternId(type: string, file: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5').update(`${type}-${file}-${timestamp}`).digest('hex').slice(0, 8);
    return `${type}-${hash}`;
  }

  private calculateConfidence(factors: { syntactic: number; semantic: number; frequency: number }): number {
    const weights = { syntactic: 0.4, semantic: 0.4, frequency: 0.2 };
    const confidence = 
      factors.syntactic * weights.syntactic +
      factors.semantic * weights.semantic +
      factors.frequency * weights.frequency;
    
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // ts-morph Project cleanup is automatic, but we can be explicit
  }
}