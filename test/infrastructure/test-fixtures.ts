/**
 * Test Fixtures and Data Management for Carmack Coder
 *
 * Provides standardized test data, fixtures, and mock objects to ensure
 * consistent test environments across all test types.
 */

import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  AstPattern,
  ComplexityMetrics,
  ErrorInfo,
  GitCheckpoint,
  MachineContext,
  TransformationRequest,
  TransformationResult,
  ValidationResult,
} from '../../src/types.js';

/**
 * Standardized test data fixtures
 */
export class TestFixtures {
  /**
   * Create a complete set of test patterns for different scenarios
   */
  static createTestPatterns(): {
    safe: AstPattern[];
    risky: AstPattern[];
    complex: AstPattern[];
    invalid: AstPattern[];
  } {
    return {
      safe: [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var $NAME = $VALUE',
          replacement: 'const $NAME = $VALUE',
          description: 'Convert var to const declarations',
          complexity: 2,
          riskLevel: 'low',
          mode: 'template',
        },
        {
          id: 'strict-equality',
          language: 'typescript',
          pattern: '$A == $B',
          replacement: '$A === $B',
          description: 'Convert loose equality to strict equality',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
      ],
      risky: [
        {
          id: 'function-refactor',
          language: 'typescript',
          pattern: 'function $NAME($PARAMS) { $BODY }',
          replacement: 'const $NAME = ($PARAMS) => { $BODY }',
          description: 'Convert function declarations to arrow functions',
          complexity: 6,
          riskLevel: 'medium',
          mode: 'ast',
        },
        {
          id: 'class-modernization',
          language: 'typescript',
          pattern: 'class $NAME { $BODY }',
          replacement: 'class $NAME { $BODY }', // Complex transformation
          description: 'Modernize class syntax',
          complexity: 8,
          riskLevel: 'high',
          mode: 'llm',
        },
      ],
      complex: [
        {
          id: 'async-refactor',
          language: 'typescript',
          pattern: 'function $NAME($PARAMS) { return new Promise($RESOLVER) }',
          replacement: 'async function $NAME($PARAMS) { $ASYNC_BODY }',
          description: 'Convert Promise constructors to async/await',
          complexity: 9,
          riskLevel: 'high',
          mode: 'llm',
        },
      ],
      invalid: [
        {
          id: 'broken-pattern',
          language: 'typescript',
          pattern: '[invalid regex',
          replacement: 'invalid $REPLACEMENT',
          description: 'Intentionally broken pattern for error testing',
          complexity: 10,
          riskLevel: 'high',
          mode: 'template',
        },
      ],
    };
  }

  /**
   * Create test code samples for different scenarios
   */
  static createCodeSamples(): {
    simple: string;
    complex: string;
    withErrors: string;
    modern: string;
    legacy: string;
  } {
    return {
      simple: `
// Simple TypeScript code for basic transformations
function add(a: number, b: number): number {
  var result = a + b;
  return result;
}

export { add };
      `.trim(),

      complex: `
// Complex TypeScript code with multiple patterns
class DataProcessor {
  private cache: any = {};
  private stats = { processed: 0, errors: 0 };

  constructor() {
    var self = this;
    self.initialize();
  }

  process(data: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      var results = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (item != null && item != undefined) {
          var processed = this.processItem(item);
          if (processed == null) {
            this.stats.errors++;
          } else {
            results.push(processed);
            this.stats.processed++;
          }
        }
      }
      resolve(results);
    });
  }

  private processItem(item: any): any {
    var key = JSON.stringify(item);
    if (this.cache[key] != undefined) {
      return this.cache[key];
    }
    
    var result = item.toString().toUpperCase();
    this.cache[key] = result;
    return result;
  }

  private initialize(): void {
    var config = { timeout: 5000, retries: 3 };
    this.setupConfig(config);
  }

  private setupConfig(config: any): void {
    // Configuration setup
  }
}
      `.trim(),

      withErrors: `
// Code with intentional syntax errors for error testing
function brokenFunction() {
  var unclosedString = "this string is not closed;
  
  if (condition {
    console.log('Missing closing parenthesis');
  }
  
  var undefinedVar = someUndefinedVariable + 5;
  return undefined.someProperty;
}

class BrokenClass {
  method() {
    return this.nonExistentMethod();
  }
      `.trim(),

      modern: `
// Modern TypeScript code
const processData = async (items: readonly unknown[]): Promise<string[]> => {
  const results: string[] = [];
  
  for (const item of items) {
    if (item != null) {
      const processed = await processItem(item);
      if (processed !== null) {
        results.push(processed);
      }
    }
  }
  
  return results;
};

const processItem = async (item: unknown): Promise<string | null> => {
  try {
    return String(item).toUpperCase();
  } catch {
    return null;
  }
};

export { processData, processItem };
      `.trim(),

      legacy: `
// Legacy JavaScript code needing modernization
var UserManager = function() {
  var users = [];
  var stats = {};
  
  this.addUser = function(user) {
    if (user == null || user == undefined) {
      return false;
    }
    
    var isValid = this.validateUser(user);
    if (isValid == true) {
      users.push(user);
      return true;
    }
    return false;
  };
  
  this.findUser = function(id) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].id == id) {
        return users[i];
      }
    }
    return null;
  };
  
  this.validateUser = function(user) {
    if (user.name == '' || user.email == '') {
      return false;
    }
    return true;
  };
};
      `.trim(),
    };
  }

  /**
   * Create test transformation requests for different scenarios
   */
  static createTransformationRequests(): {
    basic: TransformationRequest;
    complex: TransformationRequest;
    llm: TransformationRequest;
    invalid: TransformationRequest;
  } {
    const patterns = TestFixtures.createTestPatterns();

    return {
      basic: {
        targetFiles: ['test-basic.ts'],
        transformationType: 'template',
        patterns: patterns.safe,
        maxComplexity: 5,
        dryRun: true,
      },

      complex: {
        targetFiles: ['test-complex.ts'],
        transformationType: 'ast',
        patterns: patterns.risky,
        maxComplexity: 10,
        dryRun: false,
      },

      llm: {
        targetFiles: ['test-llm.ts'],
        transformationType: 'llm',
        patterns: patterns.complex,
        maxComplexity: 15,
        dryRun: true,
        prompt: 'Modernize this code using TypeScript best practices',
      },

      invalid: {
        targetFiles: [],
        transformationType: 'template',
        patterns: patterns.invalid,
        maxComplexity: 0,
        dryRun: true,
      },
    };
  }

  /**
   * Create mock validation results for different scenarios
   */
  static createValidationResults(): {
    valid: ValidationResult;
    withWarnings: ValidationResult;
    withErrors: ValidationResult;
    invalid: ValidationResult;
  } {
    return {
      valid: {
        isValid: true,
        errors: [],
        warnings: [],
        fixableIssues: 0,
      },

      withWarnings: {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: 'STYLE_WARNING',
            message: 'Consider using const instead of let',
            severity: 'warning',
            file: 'test.ts',
            line: 5,
            column: 3,
          },
        ],
        fixableIssues: 1,
      },

      withErrors: {
        isValid: false,
        errors: [
          {
            code: 'TYPE_ERROR',
            message: 'Type string is not assignable to type number',
            severity: 'error',
            file: 'test.ts',
            line: 10,
            column: 15,
          },
          {
            code: 'SYNTAX_ERROR',
            message: 'Unexpected token',
            severity: 'error',
            file: 'test.ts',
            line: 12,
            column: 8,
          },
        ],
        warnings: [],
        fixableIssues: 0,
      },

      invalid: {
        isValid: false,
        errors: [
          {
            code: 'CRITICAL_ERROR',
            message: 'File not found or corrupted',
            severity: 'error',
            file: 'missing.ts',
          },
        ],
        warnings: [],
        fixableIssues: 0,
      },
    };
  }

  /**
   * Create mock complexity metrics for different scenarios
   */
  static createComplexityMetrics(): {
    simple: ComplexityMetrics;
    moderate: ComplexityMetrics;
    complex: ComplexityMetrics;
    extreme: ComplexityMetrics;
  } {
    return {
      simple: {
        cyclomaticComplexity: 2,
        cognitiveComplexity: 1,
        linesOfCode: 25,
        nestingDepth: 1,
        functionCount: 2,
        classCount: 0,
      },

      moderate: {
        cyclomaticComplexity: 8,
        cognitiveComplexity: 6,
        linesOfCode: 150,
        nestingDepth: 3,
        functionCount: 8,
        classCount: 2,
      },

      complex: {
        cyclomaticComplexity: 15,
        cognitiveComplexity: 12,
        linesOfCode: 400,
        nestingDepth: 5,
        functionCount: 20,
        classCount: 5,
      },

      extreme: {
        cyclomaticComplexity: 25,
        cognitiveComplexity: 20,
        linesOfCode: 800,
        nestingDepth: 8,
        functionCount: 40,
        classCount: 10,
      },
    };
  }

  /**
   * Create mock transformation results for different scenarios
   */
  static createTransformationResults(): {
    successful: TransformationResult;
    partial: TransformationResult;
    failed: TransformationResult;
  } {
    const baseId = randomUUID();
    const baseRequest = TestFixtures.createTransformationRequests().basic;

    return {
      successful: {
        id: baseId,
        request: baseRequest,
        status: 'completed',
        mode: 'template',
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        filesModified: ['test-basic.ts'],
        errors: [],
        summary: 'Successfully applied 3 transformations',
      },

      partial: {
        id: randomUUID(),
        request: baseRequest,
        status: 'completed',
        mode: 'ast',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        filesModified: ['test-partial.ts'],
        errors: [
          {
            code: 'PATTERN_SKIP',
            message: 'Skipped risky transformation due to complexity',
            severity: 'warning',
            file: 'test-partial.ts',
            line: 25,
          },
        ],
        summary: 'Partially completed with 1 transformation applied',
      },

      failed: {
        id: randomUUID(),
        request: baseRequest,
        status: 'failed',
        mode: 'llm',
        startTime: Date.now() - 15000,
        endTime: Date.now(),
        filesModified: [],
        errors: [
          {
            code: 'TRANSFORMATION_ERROR',
            message: 'Failed to apply transformation due to syntax error',
            severity: 'error',
            file: 'test-failed.ts',
            line: 15,
            column: 10,
          },
        ],
        summary: 'Transformation failed with critical errors',
      },
    };
  }
}

/**
 * Test environment manager for creating isolated test environments
 */
export class TestEnvironmentManager {
  private testDirs: string[] = [];
  private createdFiles: string[] = [];

  /**
   * Create an isolated test environment
   */
  async createEnvironment(name: string): Promise<string> {
    const testDir = join(
      tmpdir(),
      `carmack-test-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
    await mkdir(testDir, { recursive: true });
    this.testDirs.push(testDir);
    return testDir;
  }

  /**
   * Create a test file with specified content
   */
  async createTestFile(dir: string, filename: string, content: string): Promise<string> {
    const filePath = join(dir, filename);
    await writeFile(filePath, content, 'utf-8');
    this.createdFiles.push(filePath);
    return filePath;
  }

  /**
   * Create a complete test project structure
   */
  async createTestProject(name: string): Promise<{
    dir: string;
    files: Record<string, string>;
  }> {
    const dir = await this.createEnvironment(name);
    const codeSamples = TestFixtures.createCodeSamples();

    const files: Record<string, string> = {};

    // Create source files
    files['simple.ts'] = await this.createTestFile(dir, 'simple.ts', codeSamples.simple);
    files['complex.ts'] = await this.createTestFile(dir, 'complex.ts', codeSamples.complex);
    files['legacy.js'] = await this.createTestFile(dir, 'legacy.js', codeSamples.legacy);
    files['modern.ts'] = await this.createTestFile(dir, 'modern.ts', codeSamples.modern);

    // Create configuration files
    files['tsconfig.json'] = await this.createTestFile(
      dir,
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
          },
          include: ['**/*.ts'],
          exclude: ['node_modules', 'dist'],
        },
        null,
        2
      )
    );

    files['package.json'] = await this.createTestFile(
      dir,
      'package.json',
      JSON.stringify(
        {
          name: `test-project-${name}`,
          version: '1.0.0',
          type: 'module',
          scripts: {
            build: 'tsc',
            test: 'bun test',
          },
          devDependencies: {
            typescript: '^5.0.0',
          },
        },
        null,
        2
      )
    );

    return { dir, files };
  }

  /**
   * Clean up all created test environments
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = this.testDirs.map(async (dir) => {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test directory ${dir}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
    this.testDirs = [];
    this.createdFiles = [];
  }

  /**
   * Get all created test directories
   */
  getTestDirectories(): string[] {
    return [...this.testDirs];
  }

  /**
   * Get all created test files
   */
  getCreatedFiles(): string[] {
    return [...this.createdFiles];
  }
}

/**
 * Performance test data generator
 */
export class PerformanceTestData {
  /**
   * Generate large code files for performance testing
   */
  static generateLargeCodeFile(size: 'small' | 'medium' | 'large' | 'huge'): string {
    const sizeConfig = {
      small: { functions: 10, linesPerFunction: 20 },
      medium: { functions: 50, linesPerFunction: 30 },
      large: { functions: 200, linesPerFunction: 40 },
      huge: { functions: 1000, linesPerFunction: 50 },
    };

    const config = sizeConfig[size];
    let code = '// Generated large code file for performance testing\n\n';

    for (let i = 0; i < config.functions; i++) {
      code += `function generatedFunction${i}(param1: any, param2: any): any {\n`;
      code += '  var result = null;\n';
      code += '  var counter = 0;\n';

      for (let j = 0; j < config.linesPerFunction; j++) {
        code += '  if (param1 != null && param2 != undefined) {\n';
        code += `    var temp${j} = param1 + param2 + ${j};\n`;
        code += `    if (temp${j} == ${j}) {\n`;
        code += '      counter++;\n';
        code += '    }\n';
        code += '  }\n';
      }

      code += '  return { result, counter };\n';
      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generate test patterns for performance testing
   */
  static generatePerformancePatterns(count: number): AstPattern[] {
    const patterns: AstPattern[] = [];

    for (let i = 0; i < count; i++) {
      patterns.push({
        id: `perf-pattern-${i}`,
        language: 'typescript',
        pattern: `var temp${i} = $VALUE`,
        replacement: `const temp${i} = $VALUE`,
        description: `Performance test pattern ${i}`,
        complexity: Math.floor(Math.random() * 5) + 1,
        riskLevel: 'low',
        mode: 'template',
      });
    }

    return patterns;
  }
}

/**
 * Test scenario builder for complex test cases
 */
export class TestScenarioBuilder {
  private scenario: {
    name: string;
    files: Array<{ name: string; content: string }>;
    patterns: AstPattern[];
    expectedResults: any;
    config: any;
  } = {
    name: '',
    files: [],
    patterns: [],
    expectedResults: {},
    config: {},
  };

  static create(name: string): TestScenarioBuilder {
    const builder = new TestScenarioBuilder();
    builder.scenario.name = name;
    return builder;
  }

  withFile(name: string, content: string): TestScenarioBuilder {
    this.scenario.files.push({ name, content });
    return this;
  }

  withPattern(pattern: AstPattern): TestScenarioBuilder {
    this.scenario.patterns.push(pattern);
    return this;
  }

  withPatterns(patterns: AstPattern[]): TestScenarioBuilder {
    this.scenario.patterns.push(...patterns);
    return this;
  }

  expectResult(key: string, value: any): TestScenarioBuilder {
    this.scenario.expectedResults[key] = value;
    return this;
  }

  withConfig(config: any): TestScenarioBuilder {
    this.scenario.config = { ...this.scenario.config, ...config };
    return this;
  }

  build(): typeof this.scenario {
    return { ...this.scenario };
  }
}
