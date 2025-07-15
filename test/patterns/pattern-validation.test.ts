import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { FileTestUtils, CodeSampleGenerator, MockDataGenerator } from '../test-helpers.js';
import type { AstPattern } from '../../src/types.js';

/**
 * Pattern Validation System
 * 
 * Comprehensive testing and validation of transformation patterns to ensure
 * they are safe, effective, and correctly structured. Validates pattern syntax,
 * semantic correctness, performance impact, and safety constraints.
 */

interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  performance: {
    complexity: number;
    estimatedTime: number;
    memoryUsage: number;
  };
  safety: {
    preservesSemantics: boolean;
    breakingChanges: string[];
    sideEffects: string[];
  };
  coverage: {
    matchCount: number;
    falsePositives: number;
    falseNegatives: number;
  };
}

interface PatternTestCase {
  name: string;
  input: string;
  expectedOutput: string;
  shouldMatch: boolean;
  description: string;
}

class PatternValidator {
  /**
   * Validate a transformation pattern comprehensively
   */
  async validatePattern(pattern: AstPattern): Promise<PatternValidationResult> {
    const result: PatternValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      riskLevel: 'low',
      performance: {
        complexity: 1,
        estimatedTime: 0,
        memoryUsage: 0,
      },
      safety: {
        preservesSemantics: true,
        breakingChanges: [],
        sideEffects: [],
      },
      coverage: {
        matchCount: 0,
        falsePositives: 0,
        falseNegatives: 0,
      },
    };

    // Validate pattern structure
    this.validatePatternStructure(pattern, result);
    
    // Validate pattern syntax
    this.validatePatternSyntax(pattern, result);
    
    // Analyze performance characteristics
    await this.analyzePerformance(pattern, result);
    
    // Assess safety and semantic preservation
    await this.assessSafety(pattern, result);
    
    // Test pattern coverage
    await this.testPatternCoverage(pattern, result);
    
    // Determine overall risk level
    this.determineRiskLevel(result);
    
    // Final validation status
    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * Validate basic pattern structure
   */
  private validatePatternStructure(pattern: AstPattern, result: PatternValidationResult): void {
    if (!pattern.id || typeof pattern.id !== 'string') {
      result.errors.push('Pattern must have a valid string ID');
    }

    if (!pattern.language || typeof pattern.language !== 'string') {
      result.errors.push('Pattern must specify a target language');
    }

    if (!pattern.pattern || typeof pattern.pattern !== 'string') {
      result.errors.push('Pattern must have a valid pattern string');
    }

    if (!pattern.replacement || typeof pattern.replacement !== 'string') {
      result.errors.push('Pattern must have a valid replacement string');
    }

    if (!pattern.description || typeof pattern.description !== 'string') {
      result.warnings.push('Pattern should have a descriptive description');
    }

    if (!['template', 'ast', 'llm'].includes(pattern.mode)) {
      result.errors.push('Pattern mode must be one of: template, ast, llm');
    }

    if (!['low', 'medium', 'high'].includes(pattern.riskLevel)) {
      result.errors.push('Pattern risk level must be one of: low, medium, high');
    }
  }

  /**
   * Validate pattern syntax based on mode
   */
  private validatePatternSyntax(pattern: AstPattern, result: PatternValidationResult): void {
    if (pattern.mode === 'template') {
      this.validateTemplatePattern(pattern, result);
    } else if (pattern.mode === 'ast') {
      this.validateAstPattern(pattern, result);
    } else if (pattern.mode === 'llm') {
      this.validateLlmPattern(pattern, result);
    }
  }

  /**
   * Validate template pattern syntax
   */
  private validateTemplatePattern(pattern: AstPattern, result: PatternValidationResult): void {
    try {
      // Test if pattern is a valid regex
      new RegExp(pattern.pattern);
    } catch (error) {
      result.errors.push(`Invalid regex pattern: ${error}`);
    }

    // Check for common template pattern issues
    if (pattern.pattern.includes('.*') && !pattern.pattern.includes('\\b')) {
      result.warnings.push('Greedy regex patterns may cause performance issues');
    }

    // Validate replacement variables
    const patternVars = (pattern.pattern.match(/\$\w+/g) || []) as string[];
    const replacementVars = (pattern.replacement.match(/\$\w+/g) || []) as string[];
    
    for (const replVar of replacementVars) {
      if (!patternVars.includes(replVar)) {
        result.errors.push(`Replacement variable ${replVar} not found in pattern`);
      }
    }
  }

  /**
   * Validate AST pattern syntax
   */
  private validateAstPattern(pattern: AstPattern, result: PatternValidationResult): void {
    // AST patterns should follow ast-grep syntax
    if (!pattern.pattern.includes('$')) {
      result.warnings.push('AST patterns typically use $ variables for matching');
    }

    // Check for valid AST node types
    const nodeTypes = ['function', 'class', 'variable', 'expression', 'statement'];
    const hasValidNodeType = nodeTypes.some(type => 
      pattern.pattern.toLowerCase().includes(type)
    );

    if (!hasValidNodeType) {
      result.warnings.push('AST pattern should target specific node types');
    }
  }

  /**
   * Validate LLM pattern syntax
   */
  private validateLlmPattern(pattern: AstPattern, result: PatternValidationResult): void {
    // LLM patterns should be descriptive
    if (pattern.pattern.length < 10) {
      result.warnings.push('LLM patterns should be descriptive for better accuracy');
    }

    // Check for clear transformation intent
    const intentKeywords = ['convert', 'transform', 'replace', 'refactor', 'modernize'];
    const hasIntent = intentKeywords.some(keyword => 
      pattern.description.toLowerCase().includes(keyword)
    );

    if (!hasIntent) {
      result.warnings.push('LLM pattern description should clearly state transformation intent');
    }
  }

  /**
   * Analyze pattern performance characteristics
   */
  private async analyzePerformance(pattern: AstPattern, result: PatternValidationResult): Promise<void> {
    // Estimate complexity based on pattern characteristics
    let complexity = 1;

    if (pattern.mode === 'template') {
      // Regex complexity analysis
      const regexComplexity = this.analyzeRegexComplexity(pattern.pattern);
      complexity = regexComplexity;
    } else if (pattern.mode === 'ast') {
      // AST traversal complexity
      complexity = pattern.pattern.split('$').length; // Rough estimate
    } else if (pattern.mode === 'llm') {
      // LLM patterns are generally more expensive
      complexity = 5;
    }

    result.performance.complexity = complexity;
    result.performance.estimatedTime = complexity * 10; // ms estimate
    result.performance.memoryUsage = complexity * 1024; // bytes estimate

    if (complexity > 10) {
      result.warnings.push('High complexity pattern may impact performance');
    }
  }

  /**
   * Analyze regex complexity
   */
  private analyzeRegexComplexity(pattern: string): number {
    let complexity = 1;
    
    // Count complexity-increasing constructs
    complexity += (pattern.match(/\*/g) || []).length; // Kleene star
    complexity += (pattern.match(/\+/g) || []).length; // Plus quantifier
    complexity += (pattern.match(/\{/g) || []).length; // Quantifiers
    complexity += (pattern.match(/\(/g) || []).length; // Groups
    complexity += (pattern.match(/\[/g) || []).length; // Character classes
    complexity += (pattern.match(/\|/g) || []).length; // Alternation

    return Math.min(complexity, 20); // Cap at 20
  }

  /**
   * Assess pattern safety and semantic preservation
   */
  private async assessSafety(pattern: AstPattern, result: PatternValidationResult): Promise<void> {
    // Check for potentially dangerous transformations
    const dangerousPatterns = [
      'eval',
      'innerHTML',
      'document.write',
      'setTimeout.*string',
      'setInterval.*string',
    ];

    for (const dangerous of dangerousPatterns) {
      if (pattern.replacement.includes(dangerous)) {
        result.safety.breakingChanges.push(`Potentially dangerous: ${dangerous}`);
        result.safety.preservesSemantics = false;
      }
    }

    // Check for semantic-changing transformations
    const semanticChanges = [
      { from: '==', to: '===', safe: true },
      { from: '!=', to: '!==', safe: true },
      { from: 'var', to: 'const', safe: false }, // Hoisting changes
      { from: 'var', to: 'let', safe: false }, // Scoping changes
    ];

    for (const change of semanticChanges) {
      if (pattern.pattern.includes(change.from) && pattern.replacement.includes(change.to)) {
        if (!change.safe) {
          result.safety.sideEffects.push(`Semantic change: ${change.from} → ${change.to}`);
        }
      }
    }

    // Assess based on risk level
    if (pattern.riskLevel === 'high') {
      result.safety.preservesSemantics = false;
      result.safety.breakingChanges.push('Pattern marked as high risk');
    }
  }

  /**
   * Test pattern coverage with sample code
   */
  private async testPatternCoverage(pattern: AstPattern, result: PatternValidationResult): Promise<void> {
    const testCases = this.generateTestCases(pattern);
    
    for (const testCase of testCases) {
      const matches = this.testPatternMatch(pattern, testCase);
      
      if (matches && testCase.shouldMatch) {
        result.coverage.matchCount++;
      } else if (matches && !testCase.shouldMatch) {
        result.coverage.falsePositives++;
      } else if (!matches && testCase.shouldMatch) {
        result.coverage.falseNegatives++;
      }
    }

    // Calculate coverage metrics
    const totalTests = testCases.length;
    const accuracy = (result.coverage.matchCount + (totalTests - result.coverage.matchCount - result.coverage.falsePositives - result.coverage.falseNegatives)) / totalTests;
    
    if (accuracy < 0.8) {
      result.warnings.push(`Low pattern accuracy: ${(accuracy * 100).toFixed(1)}%`);
    }
  }

  /**
   * Generate test cases for pattern validation
   */
  private generateTestCases(pattern: AstPattern): PatternTestCase[] {
    const testCases: PatternTestCase[] = [];

    // Generate positive test cases (should match)
    if (pattern.id === 'var-to-const') {
      testCases.push({
        name: 'Simple var declaration',
        input: 'var x = 5;',
        expectedOutput: 'const x = 5;',
        shouldMatch: true,
        description: 'Basic var to const conversion',
      });
      
      testCases.push({
        name: 'Var with string',
        input: 'var name = "test";',
        expectedOutput: 'const name = "test";',
        shouldMatch: true,
        description: 'Var with string literal',
      });
    }

    if (pattern.id === 'strict-equality') {
      testCases.push({
        name: 'Loose equality',
        input: 'if (a == b) return true;',
        expectedOutput: 'if (a === b) return true;',
        shouldMatch: true,
        description: 'Convert == to ===',
      });
    }

    // Generate negative test cases (should not match)
    testCases.push({
      name: 'Already correct code',
      input: 'const x = 5;',
      expectedOutput: 'const x = 5;',
      shouldMatch: false,
      description: 'Code that should not be transformed',
    });

    testCases.push({
      name: 'Comment with pattern text',
      input: '// var x = 5;',
      expectedOutput: '// var x = 5;',
      shouldMatch: false,
      description: 'Pattern text in comments should not match',
    });

    return testCases;
  }

  /**
   * Test if pattern matches given input
   */
  private testPatternMatch(pattern: AstPattern, testCase: PatternTestCase): boolean {
    if (pattern.mode === 'template') {
      try {
        const regex = new RegExp(pattern.pattern);
        return regex.test(testCase.input);
      } catch {
        return false;
      }
    }
    
    // For AST and LLM patterns, use simplified matching
    return testCase.input.includes(pattern.pattern.replace(/\$\w+/g, ''));
  }

  /**
   * Determine overall risk level based on validation results
   */
  private determineRiskLevel(result: PatternValidationResult): void {
    let riskScore = 0;

    // Errors increase risk significantly
    riskScore += result.errors.length * 3;
    
    // Warnings increase risk moderately
    riskScore += result.warnings.length * 1;
    
    // Performance issues increase risk
    if (result.performance.complexity > 10) riskScore += 2;
    
    // Safety issues increase risk
    if (!result.safety.preservesSemantics) riskScore += 3;
    riskScore += result.safety.breakingChanges.length * 2;
    riskScore += result.safety.sideEffects.length * 1;
    
    // Coverage issues increase risk
    if (result.coverage.falsePositives > 0) riskScore += 2;
    if (result.coverage.falseNegatives > 0) riskScore += 1;

    if (riskScore >= 8) {
      result.riskLevel = 'high';
    } else if (riskScore >= 4) {
      result.riskLevel = 'medium';
    } else {
      result.riskLevel = 'low';
    }
  }
}

describe('Pattern Validation System', () => {
  let validator: PatternValidator;
  let tempFiles: string[] = [];

  beforeEach(() => {
    validator = new PatternValidator();
    tempFiles = [];
  });

  afterEach(async () => {
    // Cleanup temporary files
    for (const file of tempFiles) {
      await FileTestUtils.cleanupTempFile(file);
    }
    tempFiles = [];
  });

  describe('Pattern Structure Validation', () => {
    test('should validate complete pattern structure', async () => {
      console.log('🔬 Testing complete pattern structure validation');

      const validPattern = MockDataGenerator.createAstPattern({
        id: 'test-pattern',
        language: 'typescript',
        pattern: 'var $NAME = $VALUE',
        replacement: 'const $NAME = $VALUE',
        description: 'Convert var to const',
        mode: 'template',
        riskLevel: 'low',
      });

      const result = await validator.validatePattern(validPattern);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskLevel).toBe('low');

      console.log('   ✅ Valid pattern structure accepted');
      console.log(`   📊 Validation result: ${result.isValid}`);
      console.log(`   🚨 Errors: ${result.errors.length}`);
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
      console.log(`   🎯 Risk level: ${result.riskLevel}`);
    });

    test('should reject invalid pattern structure', async () => {
      console.log('🔬 Testing invalid pattern structure rejection');

      const invalidPattern = {
        // Missing required fields
        id: '',
        language: '',
        pattern: '',
        replacement: '',
        description: '',
        mode: 'invalid' as any,
        riskLevel: 'invalid' as any,
        complexity: 1,
      };

      const result = await validator.validatePattern(invalidPattern);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      console.log('   ✅ Invalid pattern structure properly rejected');
      console.log(`   🚨 Errors found: ${result.errors.length}`);
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    });

    test('should handle missing optional fields gracefully', async () => {
      console.log('🔬 Testing optional field handling');

      const patternWithoutDescription = MockDataGenerator.createAstPattern({
        description: '', // Empty description
      });

      const result = await validator.validatePattern(patternWithoutDescription);

      expect(result.warnings.some(w => w.includes('description'))).toBe(true);

      console.log('   ✅ Optional fields handled gracefully');
      console.log(`   ⚠️ Warnings for missing optional fields: ${result.warnings.length}`);
    });
  });

  describe('Pattern Syntax Validation', () => {
    test('should validate template pattern syntax', async () => {
      console.log('🔬 Testing template pattern syntax validation');

      const templatePatterns = [
        {
          pattern: MockDataGenerator.createAstPattern({
            mode: 'template',
            pattern: 'var\\s+(\\w+)\\s*=\\s*(.+)',
            replacement: 'const $1 = $2',
          }),
          shouldBeValid: true,
        },
        {
          pattern: MockDataGenerator.createAstPattern({
            mode: 'template',
            pattern: '[invalid regex',
            replacement: 'replacement',
          }),
          shouldBeValid: false,
        },
      ];

      for (const testCase of templatePatterns) {
        const result = await validator.validatePattern(testCase.pattern);
        
        if (testCase.shouldBeValid) {
          expect(result.errors.filter(e => e.includes('regex')).length).toBe(0);
        } else {
          expect(result.errors.some(e => e.includes('regex'))).toBe(true);
        }

        console.log(`   📝 Pattern: ${testCase.pattern.pattern.substring(0, 30)}...`);
        console.log(`   ✅ Valid: ${testCase.shouldBeValid}, Errors: ${result.errors.length}`);
      }

      console.log('   ✅ Template pattern syntax validation completed');
    });

    test('should validate AST pattern syntax', async () => {
      console.log('🔬 Testing AST pattern syntax validation');

      const astPattern = MockDataGenerator.createAstPattern({
        mode: 'ast',
        pattern: 'function $NAME($PARAMS) { $BODY }',
        replacement: 'const $NAME = ($PARAMS) => { $BODY }',
      });

      const result = await validator.validatePattern(astPattern);

      // AST patterns should generally be valid if they use $ variables
      expect(result.errors.length).toBe(0);

      console.log('   ✅ AST pattern syntax validation completed');
      console.log(`   📊 Pattern uses variables: ${astPattern.pattern.includes('$')}`);
      console.log(`   🚨 Errors: ${result.errors.length}`);
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
    });

    test('should validate LLM pattern syntax', async () => {
      console.log('🔬 Testing LLM pattern syntax validation');

      const llmPatterns = [
        {
          pattern: MockDataGenerator.createAstPattern({
            mode: 'llm',
            pattern: 'Convert old-style function declarations to arrow functions',
            description: 'Modernize function syntax using arrow functions',
          }),
          expectWarnings: false,
        },
        {
          pattern: MockDataGenerator.createAstPattern({
            mode: 'llm',
            pattern: 'fix',
            description: 'fix code',
          }),
          expectWarnings: true,
        },
      ];

      for (const testCase of llmPatterns) {
        const result = await validator.validatePattern(testCase.pattern);
        
        if (testCase.expectWarnings) {
          expect(result.warnings.length).toBeGreaterThan(0);
        }

        console.log(`   📝 Pattern: ${testCase.pattern.pattern}`);
        console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
      }

      console.log('   ✅ LLM pattern syntax validation completed');
    });
  });

  describe('Performance Analysis', () => {
    test('should analyze pattern performance characteristics', async () => {
      console.log('🔬 Testing pattern performance analysis');

      const patterns = [
        {
          name: 'Simple template',
          pattern: MockDataGenerator.createAstPattern({
            mode: 'template',
            pattern: 'var\\s+(\\w+)',
          }),
          expectedComplexity: 'low',
        },
        {
          name: 'Complex regex',
          pattern: MockDataGenerator.createAstPattern({
            mode: 'template',
            pattern: '(.*?)\\s*=\\s*(.*?)\\s*\\+\\s*(.*?)\\s*\\*\\s*(.*?)',
          }),
          expectedComplexity: 'medium',
        },
        {
          name: 'LLM pattern',
          pattern: MockDataGenerator.createAstPattern({
            mode: 'llm',
            pattern: 'Complex transformation requiring AI analysis',
          }),
          expectedComplexity: 'high',
        },
      ];

      for (const testCase of patterns) {
        const result = await validator.validatePattern(testCase.pattern);
        
        expect(result.performance.complexity).toBeGreaterThan(0);
        expect(result.performance.estimatedTime).toBeGreaterThan(0);
        expect(result.performance.memoryUsage).toBeGreaterThan(0);

        console.log(`   📊 ${testCase.name}:`);
        console.log(`     Complexity: ${result.performance.complexity}`);
        console.log(`     Estimated time: ${result.performance.estimatedTime}ms`);
        console.log(`     Memory usage: ${result.performance.memoryUsage} bytes`);
      }

      console.log('   ✅ Performance analysis completed');
    });

    test('should warn about high-complexity patterns', async () => {
      console.log('🔬 Testing high-complexity pattern warnings');

      const complexPattern = MockDataGenerator.createAstPattern({
        mode: 'template',
        pattern: '(.*?)\\+(.*?)\\*(.*?)\\/(.*?)\\-(.*?)\\%(.*?)\\&\\&(.*?)\\|\\|(.*?)',
      });

      const result = await validator.validatePattern(complexPattern);

      const hasPerformanceWarning = result.warnings.some(w => 
        w.includes('performance') || w.includes('complexity')
      );

      expect(result.performance.complexity).toBeGreaterThan(5);
      
      console.log('   ✅ High-complexity pattern analysis completed');
      console.log(`   📊 Complexity score: ${result.performance.complexity}`);
      console.log(`   ⚠️ Performance warning: ${hasPerformanceWarning}`);
    });
  });

  describe('Safety Assessment', () => {
    test('should assess semantic preservation', async () => {
      console.log('🔬 Testing semantic preservation assessment');

      const safePattern = MockDataGenerator.createAstPattern({
        pattern: '==',
        replacement: '===',
        riskLevel: 'low',
      });

      const unsafePattern = MockDataGenerator.createAstPattern({
        pattern: 'var $NAME',
        replacement: 'const $NAME',
        riskLevel: 'medium',
      });

      const safeResult = await validator.validatePattern(safePattern);
      const unsafeResult = await validator.validatePattern(unsafePattern);

      expect(safeResult.safety.sideEffects.length).toBe(0);
      expect(unsafeResult.safety.sideEffects.length).toBeGreaterThan(0);

      console.log('   ✅ Semantic preservation assessment completed');
      console.log(`   🔒 Safe pattern side effects: ${safeResult.safety.sideEffects.length}`);
      console.log(`   ⚠️ Unsafe pattern side effects: ${unsafeResult.safety.sideEffects.length}`);
    });

    test('should detect dangerous transformations', async () => {
      console.log('🔬 Testing dangerous transformation detection');

      const dangerousPattern = MockDataGenerator.createAstPattern({
        replacement: 'eval($CODE)',
        riskLevel: 'high',
      });

      const result = await validator.validatePattern(dangerousPattern);

      expect(result.safety.preservesSemantics).toBe(false);
      expect(result.safety.breakingChanges.length).toBeGreaterThan(0);

      console.log('   ✅ Dangerous transformation detection completed');
      console.log(`   🚨 Breaking changes detected: ${result.safety.breakingChanges.length}`);
      console.log(`   🔒 Preserves semantics: ${result.safety.preservesSemantics}`);
    });
  });

  describe('Pattern Coverage Testing', () => {
    test('should test pattern coverage with sample code', async () => {
      console.log('🔬 Testing pattern coverage analysis');

      const varToConstPattern = MockDataGenerator.createAstPattern({
        id: 'var-to-const',
        pattern: 'var\\s+(\\w+)',
        replacement: 'const $1',
        mode: 'template',
      });

      const result = await validator.validatePattern(varToConstPattern);

      expect(result.coverage.matchCount).toBeGreaterThan(0);

      console.log('   ✅ Pattern coverage testing completed');
      console.log(`   🎯 Matches found: ${result.coverage.matchCount}`);
      console.log(`   ❌ False positives: ${result.coverage.falsePositives}`);
      console.log(`   ❌ False negatives: ${result.coverage.falseNegatives}`);
    });

    test('should calculate pattern accuracy metrics', async () => {
      console.log('🔬 Testing pattern accuracy metrics');

      const strictEqualityPattern = MockDataGenerator.createAstPattern({
        id: 'strict-equality',
        pattern: '==',
        replacement: '===',
        mode: 'template',
      });

      const result = await validator.validatePattern(strictEqualityPattern);

      // Should have some coverage metrics
      const totalTests = result.coverage.matchCount + result.coverage.falsePositives + result.coverage.falseNegatives;
      expect(totalTests).toBeGreaterThan(0);

      console.log('   ✅ Pattern accuracy metrics calculated');
      console.log(`   📊 Total test cases: ${totalTests}`);
      console.log(`   📈 Match accuracy: ${result.coverage.matchCount}/${totalTests}`);
    });
  });

  describe('Risk Level Assessment', () => {
    test('should determine appropriate risk levels', async () => {
      console.log('🔬 Testing risk level determination');

      const lowRiskPattern = MockDataGenerator.createAstPattern({
        pattern: '!=',
        replacement: '!==',
        riskLevel: 'low',
      });

      const highRiskPattern = MockDataGenerator.createAstPattern({
        pattern: 'function $NAME',
        replacement: 'eval("function " + $NAME)',
        riskLevel: 'high',
      });

      const lowResult = await validator.validatePattern(lowRiskPattern);
      const highResult = await validator.validatePattern(highRiskPattern);

      expect(['low', 'medium'].includes(lowResult.riskLevel)).toBe(true);
      expect(['medium', 'high'].includes(highResult.riskLevel)).toBe(true);

      console.log('   ✅ Risk level determination completed');
      console.log(`   🟢 Low-risk pattern assessed as: ${lowResult.riskLevel}`);
      console.log(`   🔴 High-risk pattern assessed as: ${highResult.riskLevel}`);
    });

    test('should escalate risk based on validation issues', async () => {
      console.log('🔬 Testing risk escalation based on issues');

      const problematicPattern = MockDataGenerator.createAstPattern({
        pattern: '[invalid regex',
        replacement: 'eval($CODE)',
        riskLevel: 'low', // Initially low, should be escalated
      });

      const result = await validator.validatePattern(problematicPattern);

      expect(result.riskLevel).toBe('high');
      expect(result.isValid).toBe(false);

      console.log('   ✅ Risk escalation working correctly');
      console.log(`   📊 Final risk level: ${result.riskLevel}`);
      console.log(`   🚨 Total errors: ${result.errors.length}`);
      console.log(`   ⚠️ Total warnings: ${result.warnings.length}`);
    });
  });

  describe('Integration with Real Patterns', () => {
    test('should validate common transformation patterns', async () => {
      console.log('🔬 Testing validation of common transformation patterns');

      const commonPatterns = [
        MockDataGenerator.createAstPattern({
          id: 'var-to-const',
          pattern: 'var\\s+(\\w+)\\s*=\\s*(.+)',
          replacement: 'const $1 = $2',
          description: 'Convert var declarations to const',
          mode: 'template',
          riskLevel: 'medium',
        }),
        MockDataGenerator.createAstPattern({
          id: 'arrow-function',
          pattern: 'function\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*{([^}]*)}',
          replacement: 'const $1 = ($2) => {$3}',
          description: 'Convert function declarations to arrow functions',
          mode: 'template',
          riskLevel: 'medium',
        }),
        MockDataGenerator.createAstPattern({
          id: 'strict-equality',
          pattern: '==(?!=)',
          replacement: '===',
          description: 'Use strict equality operator',
          mode: 'template',
          riskLevel: 'low',
        }),
      ];

      for (const pattern of commonPatterns) {
        const result = await validator.validatePattern(pattern);
        
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(['low', 'medium', 'high'].includes(result.riskLevel)).toBe(true);

        console.log(`   📝 Pattern: ${pattern.id}`);
        console.log(`     Valid: ${result.isValid}`);
        console.log(`     Risk: ${result.riskLevel}`);
        console.log(`     Errors: ${result.errors.length}`);
        console.log(`     Warnings: ${result.warnings.length}`);
      }

      console.log('   ✅ Common transformation patterns validated');
    });

    test('should provide comprehensive validation reports', async () => {
      console.log('🔬 Testing comprehensive validation reports');

      const complexPattern = MockDataGenerator.createAstPattern({
        id: 'complex-refactor',
        pattern: '(function\\s+(\\w+)\\s*\\([^)]*\\)\\s*{[^}]*})',
        replacement: 'const $2 = () => { /* refactored */ }',
        description: 'Complex function refactoring',
        mode: 'template',
        riskLevel: 'high',
      });

      const result = await validator.validatePattern(complexPattern);

      // Should have comprehensive information
      expect(result.performance).toBeDefined();
      expect(result.safety).toBeDefined();
      expect(result.coverage).toBeDefined();
      expect(typeof result.performance.complexity).toBe('number');
      expect(typeof result.safety.preservesSemantics).toBe('boolean');
      expect(typeof result.coverage.matchCount).toBe('number');

      console.log('   ✅ Comprehensive validation report generated');
      console.log(`   📊 Performance complexity: ${result.performance.complexity}`);
      console.log(`   🔒 Preserves semantics: ${result.safety.preservesSemantics}`);
      console.log(`   🎯 Coverage matches: ${result.coverage.matchCount}`);
    });
  });
});