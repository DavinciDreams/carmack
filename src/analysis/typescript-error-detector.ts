import { z } from 'zod';
import { Project, SourceFile, Diagnostic, DiagnosticCategory, ts } from 'ts-morph';
import { createHash } from 'node:crypto';
import { type FileMetadata } from './repository-analyzer.js';
import { type RawPattern } from './pattern-detection-pipeline.js';

/**
 * TypeScript Compiler Error Detection System
 * 
 * Uses the TypeScript compiler API through ts-morph to detect real compilation
 * errors and convert them into actionable patterns with suggested fixes.
 * 
 * This addresses the missing TypeScript error detection in the pattern discovery
 * system, enabling detection of actual compilation issues as actionable patterns.
 */

// TypeScript error code mappings to pattern types
export const TS_ERROR_PATTERNS = {
  // Null/undefined access patterns
  2531: { // Object is possibly 'null'
    type: 'null-safety-optional-chaining',
    category: 'safety',
    severity: 'error',
    confidence: 0.9,
    description: 'Use optional chaining to safely access possibly null objects'
  },
  2532: { // Object is possibly 'undefined'
    type: 'undefined-safety-optional-chaining', 
    category: 'safety',
    severity: 'error',
    confidence: 0.9,
    description: 'Use optional chaining to safely access possibly undefined objects'
  },
  2722: { // Cannot invoke possibly 'undefined'
    type: 'undefined-function-call',
    category: 'safety',
    severity: 'error', 
    confidence: 0.9,
    description: 'Add null check before calling possibly undefined function'
  },
  
  // Type annotation improvements
  7006: { // Parameter implicitly has 'any' type
    type: 'missing-parameter-type',
    category: 'types',
    severity: 'warning',
    confidence: 0.8,
    description: 'Add explicit type annotation to parameter'
  },
  7034: { // Variable implicitly has 'any' type
    type: 'missing-variable-type',
    category: 'types',
    severity: 'warning',
    confidence: 0.8,
    description: 'Add explicit type annotation to variable'
  },
  7010: { // Function lacks return type annotation
    type: 'missing-return-type',
    category: 'types', 
    severity: 'warning',
    confidence: 0.7,
    description: 'Add explicit return type annotation to function'
  },
  
  // Unused variable declarations
  6133: { // Variable declared but never used
    type: 'unused-variable',
    category: 'cleanup',
    severity: 'warning',
    confidence: 0.9,
    description: 'Remove unused variable declaration'
  },
  6196: { // Function declared but never used
    type: 'unused-function',
    category: 'cleanup',
    severity: 'warning',
    confidence: 0.8,
    description: 'Remove unused function declaration'
  },
  
  // Property access errors
  2339: { // Property does not exist on type
    type: 'missing-property',
    category: 'types',
    severity: 'error',
    confidence: 0.9,
    description: 'Property does not exist on the given type'
  },
  2538: { // Type cannot be used as an index type
    type: 'invalid-index-access',
    category: 'types',
    severity: 'error',
    confidence: 0.9,
    description: 'Invalid type used for object indexing'
  },
  
  // Type assertion improvements
  2352: { // Type assertion does not overlap
    type: 'invalid-type-assertion',
    category: 'types',
    severity: 'error',
    confidence: 0.9,
    description: 'Type assertion does not overlap with source type'
  }
} as const;

export type TSErrorCode = keyof typeof TS_ERROR_PATTERNS;

/**
 * Enhanced TypeScript Error Pattern Generator
 */
export class TypeScriptErrorDetector {
  private project: Project;
  private compilerOptions: ts.CompilerOptions;

  constructor() {
    // Configure TypeScript compiler options for comprehensive error detection
    this.compilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      lib: ['ES2020', 'DOM'],
      allowJs: true,
      checkJs: false,
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noImplicitThis: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    };

    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: this.compilerOptions
    });
  }

  /**
   * Detect TypeScript compilation errors and convert to actionable patterns (async)
   */
  async detectErrorPatterns(file: FileMetadata, content: string): Promise<RawPattern[]> {
    const patterns: RawPattern[] = [];

    // Only process TypeScript/JavaScript files
    if (!this.isTypeScriptFile(file.path)) {
      return patterns;
    }

    try {
      console.log(`🔍 Running TypeScript error detection for ${file.relativePath}`);

      // Create source file in ts-morph project
      const sourceFile = this.project.createSourceFile(file.path, content, { overwrite: true });

      // Get compiler diagnostics
      const diagnostics = sourceFile.getPreEmitDiagnostics();
      
      console.log(`📊 Found ${diagnostics.length} TypeScript diagnostics in ${file.relativePath}`);

      // Convert each diagnostic to a pattern
      for (const diagnostic of diagnostics) {
        const pattern = this.convertDiagnosticToPattern(diagnostic, file.path, content);
        if (pattern) {
          patterns.push(pattern);
        }
      }

      // Also check for semantic issues that might not be caught by diagnostics
      patterns.push(...this.detectSemanticPatterns(sourceFile, file.path));

      // Clean up
      sourceFile.delete();

      console.log(`✅ TypeScript error detection completed: ${patterns.length} error patterns found in ${file.relativePath}`);

    } catch (error) {
      console.warn(`❌ TypeScript error detection failed for ${file.path}:`, (error as Error).message);
    }

    return patterns;
  }

  /**
   * Convert TypeScript diagnostic to actionable pattern
   */
  private convertDiagnosticToPattern(
    diagnostic: Diagnostic,
    filePath: string,
    content: string
  ): RawPattern | null {
    const messageText = diagnostic.getMessageText();
    const code = diagnostic.getCode();
    
    // Check if we have a pattern mapping for this error code
    const errorPattern = TS_ERROR_PATTERNS[code as TSErrorCode];
    if (!errorPattern) {
      // Return generic pattern for unmapped errors
      return this.createGenericErrorPattern(diagnostic, filePath, content);
    }

    const start = diagnostic.getStart();
    const length = diagnostic.getLength();
    
    if (start === undefined || length === undefined) {
      return null;
    }

    const sourceFile = diagnostic.getSourceFile();
    if (!sourceFile) {
      return null;
    }

    // Get location information
    const startPos = sourceFile.getLineAndColumnAtPos(start);
    const endPos = sourceFile.getLineAndColumnAtPos(start + length);
    
    // Extract the problematic code
    const before = content.substring(start, start + length);
    
    // Convert message to string for processing
    const messageStr = this.extractMessageText(messageText as any);
    
    // Generate suggested fix based on error type
    const after = this.generateFix(errorPattern.type, before, messageStr, content, start);

    return {
      id: this.generatePatternId(`ts-error-${code}`, filePath),
      type: errorPattern.type,
      language: 'typescript',
      before,
      after,
      confidence: errorPattern.confidence,
      location: {
        startLine: startPos.line,
        endLine: endPos.line,
        startColumn: startPos.column,
        endColumn: endPos.column
      },
      metadata: {
        stage: 'typescript-error-detector',
        category: errorPattern.category,
        severity: errorPattern.severity,
        tsErrorCode: code,
        tsMessage: messageStr,
        reason: errorPattern.description,
        autoFixable: this.isAutoFixable(errorPattern.type)
      }
    };
  }

  /**
   * Extract message text from diagnostic message chain
   */
  private extractMessageText(messageText: any): string {
    if (typeof messageText === 'string') {
      return messageText;
    }
    
    // Handle DiagnosticMessageChain - use any to avoid type conflicts
    if (messageText && typeof messageText === 'object') {
      let result = messageText.messageText || messageText.toString();
      
      // Try to get nested messages if available
      if (messageText.next && Array.isArray(messageText.next) && messageText.next.length > 0) {
        const next = messageText.next[0];
        if (next && next.messageText) {
          result += '\n' + next.messageText;
        }
      }
      
      return result;
    }
    
    // Fallback to string conversion
    return String(messageText);
  }

  /**
   * Generate suggested fix based on error pattern type
   */
  private generateFix(
    patternType: string,
    before: string,
    message: string,
    content: string,
    position: number
  ): string | undefined {
    switch (patternType) {
      case 'null-safety-optional-chaining':
      case 'undefined-safety-optional-chaining':
        return this.generateOptionalChainingFix(before);
        
      case 'undefined-function-call':
        return this.generateFunctionCallFix(before);
        
      case 'missing-parameter-type':
        return this.generateParameterTypeFix(before, message);
        
      case 'missing-variable-type':
        return this.generateVariableTypeFix(before, message);
        
      case 'missing-return-type':
        return this.generateReturnTypeFix(before, message);
        
      case 'unused-variable':
      case 'unused-function':
        return '// Remove unused declaration';
        
      case 'missing-property':
        return this.generatePropertyFix(before, message);
        
      case 'invalid-type-assertion':
        return this.generateTypeAssertionFix(before, message);
        
      default:
        return undefined;
    }
  }

  /**
   * Generate optional chaining fix for null/undefined access
   */
  private generateOptionalChainingFix(before: string): string {
    // Convert object.property to object?.property
    if (before.includes('.') && !before.includes('?.')) {
      return before.replace(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '?.$1');
    }
    
    // Convert object[key] to object?.[key]  
    if (before.includes('[') && !before.includes('?.[')) {
      return before.replace(/\[/g, '?.[');
    }
    
    return before;
  }

  /**
   * Generate function call fix for undefined functions
   */
  private generateFunctionCallFix(before: string): string {
    // Add optional chaining to function calls
    if (before.includes('(') && !before.includes('?.')) {
      return before.replace(/(\w+)\(/g, '$1?.(');
    }
    return before;
  }

  /**
   * Generate parameter type annotation fix
   */
  private generateParameterTypeFix(before: string, message: string): string {
    // Extract parameter name from error message
    const paramMatch = message.match(/Parameter '(\w+)'/);
    if (paramMatch) {
      const paramName = paramMatch[1];
      // Add type annotation based on context or use 'any' as fallback
      return before.replace(
        new RegExp(`\\b${paramName}\\b`), 
        `${paramName}: any`
      );
    }
    return before;
  }

  /**
   * Generate variable type annotation fix  
   */
  private generateVariableTypeFix(before: string, message: string): string {
    // Extract variable name and suggest type annotation
    const varMatch = message.match(/Variable '(\w+)'/);
    if (varMatch) {
      const varName = varMatch[1];
      return before.replace(
        new RegExp(`(const|let|var)\\s+${varName}`),
        `$1 ${varName}: any`
      );
    }
    return before;
  }

  /**
   * Generate return type annotation fix
   */
  private generateReturnTypeFix(before: string, message: string): string {
    // Add return type annotation to function
    if (before.includes('function') && before.includes('(')) {
      return before.replace(/\)\s*{/, '): any {');
    }
    // Arrow function
    if (before.includes('=>')) {
      return before.replace(/\)\s*=>/, '): any =>');
    }
    return before;
  }

  /**
   * Generate property access fix
   */
  private generatePropertyFix(before: string, message: string): string {
    // Suggest optional chaining or type assertion
    return `${before} // Consider: ${before}?.property or (${before} as any).property`;
  }

  /**
   * Generate type assertion fix
   */
  private generateTypeAssertionFix(before: string, message: string): string {
    // Convert invalid assertion to unknown first
    if (before.includes(' as ')) {
      return before.replace(/ as \w+/, ' as unknown as TargetType');
    }
    return before;
  }

  /**
   * Detect additional semantic patterns that might not be compiler errors
   */
  private detectSemanticPatterns(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];

    // Detect any type usage that could be improved
    patterns.push(...this.detectAnyTypeUsage(sourceFile, filePath));
    
    // Detect console.log statements (could be debugging leftovers)
    patterns.push(...this.detectConsoleStatements(sourceFile, filePath));
    
    // Detect empty catch blocks
    patterns.push(...this.detectEmptyCatchBlocks(sourceFile, filePath));

    return patterns;
  }

  /**
   * Detect TypeScript compilation errors and convert to actionable patterns (sync)
   */
  detectErrorPatternsSync(file: FileMetadata, content: string): RawPattern[] {
    const patterns: RawPattern[] = [];

    // Only process TypeScript/JavaScript files
    if (!this.isTypeScriptFile(file.path)) {
      return patterns;
    }

    try {
      console.log(`🔍 Running TypeScript error detection for ${file.relativePath}`);

      // Create source file in ts-morph project
      const sourceFile = this.project.createSourceFile(file.path, content, { overwrite: true });

      // Get compiler diagnostics
      const diagnostics = sourceFile.getPreEmitDiagnostics();
      
      console.log(`📊 Found ${diagnostics.length} TypeScript diagnostics in ${file.relativePath}`);

      // Convert each diagnostic to a pattern
      for (const diagnostic of diagnostics) {
        const pattern = this.convertDiagnosticToPattern(diagnostic, file.path, content);
        if (pattern) {
          patterns.push(pattern);
        }
      }

      // Also check for semantic issues that might not be caught by diagnostics
      patterns.push(...this.detectSemanticPatterns(sourceFile, file.path));

      // Clean up
      sourceFile.delete();

      console.log(`✅ TypeScript error detection completed: ${patterns.length} error patterns found in ${file.relativePath}`);

    } catch (error) {
      console.warn(`❌ TypeScript error detection failed for ${file.path}:`, (error as Error).message);
    }

    return patterns;
  }

  /**
   * Detect explicit 'any' type usage
   */
  private detectAnyTypeUsage(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    // Find all 'any' type references
    sourceFile.getDescendantsOfKind(ts.SyntaxKind.AnyKeyword).forEach(anyKeyword => {
      const text = anyKeyword.getText();
      const parent = anyKeyword.getParent();
      
      patterns.push({
        id: this.generatePatternId('any-type-usage', filePath),
        type: 'any-type-improvement',
        language: 'typescript',
        before: parent?.getText() || text,
        after: '// Consider: Replace with specific type',
        confidence: 0.6,
        location: {
          startLine: anyKeyword.getStartLineNumber(),
          endLine: anyKeyword.getEndLineNumber(),
          startColumn: anyKeyword.getStart() - anyKeyword.getStartLinePos(),
          endColumn: anyKeyword.getEnd() - anyKeyword.getStartLinePos()
        },
        metadata: {
          stage: 'typescript-error-detector',
          category: 'types',
          severity: 'suggestion',
          reason: 'Explicit any type usage - consider more specific typing',
          autoFixable: false
        }
      });
    });
    
    return patterns;
  }

  /**
   * Detect console statements (potential debugging leftovers)
   */
  private detectConsoleStatements(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression).forEach(callExpr => {
      const expression = callExpr.getExpression();
      if (expression.getKind() === ts.SyntaxKind.PropertyAccessExpression) {
        const propAccess = expression as any;
        if (propAccess.getExpression().getText() === 'console') {
          const text = callExpr.getText();
          
          patterns.push({
            id: this.generatePatternId('console-statement', filePath),
            type: 'console-cleanup',
            language: 'typescript',
            before: text,
            after: '// Remove console statement or use proper logging',
            confidence: 0.4,
            location: {
              startLine: callExpr.getStartLineNumber(),
              endLine: callExpr.getEndLineNumber(), 
              startColumn: callExpr.getStart() - callExpr.getStartLinePos(),
              endColumn: callExpr.getEnd() - callExpr.getStartLinePos()
            },
            metadata: {
              stage: 'typescript-error-detector',
              category: 'cleanup',
              severity: 'suggestion',
              reason: 'Console statement found - consider removing or using proper logging',
              autoFixable: false
            }
          });
        }
      }
    });
    
    return patterns;
  }

  /**
   * Detect empty catch blocks
   */
  private detectEmptyCatchBlocks(sourceFile: SourceFile, filePath: string): RawPattern[] {
    const patterns: RawPattern[] = [];
    
    sourceFile.getDescendantsOfKind(ts.SyntaxKind.CatchClause).forEach(catchClause => {
      const block = catchClause.getBlock();
      const statements = block.getStatements();
      
      if (statements.length === 0) {
        const text = catchClause.getText();
        
        patterns.push({
          id: this.generatePatternId('empty-catch', filePath),
          type: 'empty-catch-block',
          language: 'typescript',
          before: text,
          after: text.replace('{', '{\n  // TODO: Handle error appropriately\n  console.error(error);'),
          confidence: 0.7,
          location: {
            startLine: catchClause.getStartLineNumber(),
            endLine: catchClause.getEndLineNumber(),
            startColumn: catchClause.getStart() - catchClause.getStartLinePos(), 
            endColumn: catchClause.getEnd() - catchClause.getStartLinePos()
          },
          metadata: {
            stage: 'typescript-error-detector',
            category: 'error-handling',
            severity: 'warning',
            reason: 'Empty catch block - should handle errors appropriately',
            autoFixable: true
          }
        });
      }
    });
    
    return patterns;
  }

  /**
   * Create generic pattern for unmapped TypeScript errors
   */
  private createGenericErrorPattern(
    diagnostic: Diagnostic, 
    filePath: string, 
    content: string
  ): RawPattern | null {
    const start = diagnostic.getStart();
    const length = diagnostic.getLength();
    const messageText = diagnostic.getMessageText();
    const code = diagnostic.getCode();
    
    if (start === undefined || length === undefined) {
      return null;
    }

    const sourceFile = diagnostic.getSourceFile();
    if (!sourceFile) {
      return null;
    }

    const startPos = sourceFile.getLineAndColumnAtPos(start);
    const endPos = sourceFile.getLineAndColumnAtPos(start + length);
    const before = content.substring(start, start + length);

    return {
      id: this.generatePatternId(`ts-generic-error-${code}`, filePath),
      type: 'typescript-compilation-error',
      language: 'typescript',
      before,
      after: `// TODO: Fix TypeScript error ${code}`,
      confidence: 0.5,
      location: {
        startLine: startPos.line,
        endLine: endPos.line,
        startColumn: startPos.column,
        endColumn: endPos.column
      },
      metadata: {
        stage: 'typescript-error-detector',
        category: 'compilation',
        severity: diagnostic.getCategory() === DiagnosticCategory.Error ? 'error' : 'warning',
        tsErrorCode: code,
        tsMessage: typeof messageText === 'string' ? messageText : messageText.getMessageText(),
        reason: `TypeScript compilation error: ${typeof messageText === 'string' ? messageText : messageText.getMessageText()}`,
        autoFixable: false
      }
    };
  }

  /**
   * Check if error pattern type is auto-fixable
   */
  private isAutoFixable(patternType: string): boolean {
    const autoFixablePatterns = [
      'null-safety-optional-chaining',
      'undefined-safety-optional-chaining', 
      'undefined-function-call',
      'unused-variable',
      'unused-function',
      'empty-catch-block'
    ];
    
    return autoFixablePatterns.includes(patternType);
  }

  /**
   * Check if file is TypeScript/JavaScript
   */
  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath);
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(type: string, file: string): string {
    const timestamp = Date.now();
    const hash = createHash('md5').update(`${type}-${file}-${timestamp}`).digest('hex').slice(0, 8);
    return `${type}-${hash}`;
  }

  /**
   * Calculate confidence based on error severity and pattern reliability
   */
  private calculateConfidence(factors: { 
    errorSeverity: 'error' | 'warning' | 'suggestion'; 
    patternReliability: number;
    autoFixable: boolean;
  }): number {
    let confidence = factors.patternReliability;
    
    // Adjust based on error severity
    switch (factors.errorSeverity) {
      case 'error':
        confidence *= 1.0; // No adjustment for errors
        break;
      case 'warning':
        confidence *= 0.8; // Slightly lower confidence for warnings
        break;
      case 'suggestion':
        confidence *= 0.6; // Lower confidence for suggestions
        break;
    }
    
    // Boost confidence for auto-fixable patterns
    if (factors.autoFixable) {
      confidence *= 1.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get error pattern statistics
   */
  getStats(): { 
    supportedErrorCodes: number; 
    autoFixablePatterns: number;
    errorCategories: string[];
  } {
    const errorCodes = Object.keys(TS_ERROR_PATTERNS);
    const autoFixable = Object.values(TS_ERROR_PATTERNS)
      .filter(pattern => this.isAutoFixable(pattern.type));
    const categories = Array.from(new Set(Object.values(TS_ERROR_PATTERNS).map(p => p.category)));

    return {
      supportedErrorCodes: errorCodes.length,
      autoFixablePatterns: autoFixable.length,
      errorCategories: categories
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // ts-morph Project cleanup is automatic
  }
}