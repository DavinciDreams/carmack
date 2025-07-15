import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execSync } from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createActor, waitFor } from 'xstate';
import { analysisActor } from '../../src/actors/analysis.js';
import { dafnyActor } from '../../src/actors/dafny.js';
import { gitActor } from '../../src/actors/git.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { validationActor } from '../../src/actors/validation.js';
import type { AstPattern, GitCheckpoint } from '../../src/types.js';

describe('Actor Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `integration-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Setup git for integration tests
    try {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
    } catch (error) {
      // Git setup might fail in some environments
    }
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(testDir, name);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  describe('Analysis → Validation Pipeline', () => {
    test('should analyze code and then validate the analysis results', async () => {
      // Step 1: Create test files
      await createTestFile(
        'complex.ts',
        `
        function calculateComplexity(data: any[]): number {
          let result = 0;
          for (let i = 0; i < data.length; i++) {
            if (data[i] != null) {
              if (typeof data[i] === 'number') {
                result += data[i];
              } else if (typeof data[i] === 'string') {
                result += data[i].length;
              }
            }
          }
          return result;
        }
      `
      );

      // Step 2: Run analysis with proper input format
      const analysisInput = {
        files: ['complex.ts'],
        patterns: [], // Required by the schema
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      expect(analysisResult.output).toBeDefined();
      const analysis = analysisResult.output!;
      expect(analysis.complexity).toBeDefined();
      expect(analysis.recommendedMode).toBeDefined();

      // Step 3: Validate the analyzed code with proper input format
      const validationInput = {
        type: 'quality' as const,
        files: ['complex.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      expect(validationResult.output).toBeDefined();
      const validation = validationResult.output!;
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();

      // Verify integration: analysis should inform validation
      if (analysis.complexity) {
        expect(analysis.complexity.cyclomaticComplexity).toBeGreaterThan(1);
      }
    });

    test('should handle analysis of multiple files and validate them together', async () => {
      // Create multiple related files
      await createTestFile(
        'utils.ts',
        `
        export function helper(x: any): string {
          return x == null ? '' : x.toString();
        }
      `
      );

      await createTestFile(
        'main.ts',
        `
        import { helper } from './utils';
        
        function process(data: any[]): string[] {
          var results = [];
          for (var i = 0; i < data.length; i++) {
            results.push(helper(data[i]));
          }
          return results;
        }
      `
      );

      // Analyze all files
      const analysisInput = {
        files: ['utils.ts', 'main.ts'],
        patterns: [], // Required by the schema
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const analysis = analysisResult.output!;
      expect(analysis.complexity).toBeDefined();

      // Validate all files with format checking
      const validationInput = {
        type: 'format' as const,
        files: ['utils.ts', 'main.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const validation = validationResult.output!;
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
    });
  });

  describe('Git → Transformation → Validation Pipeline', () => {
    test('should create checkpoint, apply transformation, and validate results', async () => {
      // Step 1: Create initial file
      await createTestFile('transform-target.ts', 'var x = 1;\nvar y = "hello";');

      // Step 2: Create git checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before transformation',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();

      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });

      const checkpoint = checkpointResult.output!;
      expect(checkpoint.description).toBe('Before transformation');

      // Step 3: Apply transformation with proper pattern format
      const patterns: AstPattern[] = [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=',
          replacement: 'const $1 =',
          description: 'Convert var to const',
          complexity: 2,
          riskLevel: 'low',
          mode: 'template', // Required by the schema
        },
      ];

      const transformationInput = {
        mode: 'template' as const,
        files: ['transform-target.ts'],
        patterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const transformation = transformationResult.output!;
      expect(transformation.filesModified).toContain('transform-target.ts');

      // Step 4: Validate transformed code
      const validationInput = {
        type: 'types' as const,
        files: ['transform-target.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const validation = validationResult.output!;

      // After transformation, code should be valid or have fewer issues
      expect(validation.isValid).toBeDefined();
    });

    test('should handle transformation failure and rollback', async () => {
      // Step 1: Create file with complex content
      await createTestFile(
        'risky-transform.ts',
        `
        function complexFunction(data: any): any {
          var result = {};
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              result[key] = data[key];
            }
          }
          return result;
        }
      `
      );

      // Step 2: Create checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before risky transformation',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();

      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });

      const checkpoint = checkpointResult.output!;

      // Step 3: Attempt risky transformation
      const riskyPatterns: AstPattern[] = [
        {
          id: 'complex-refactor',
          language: 'typescript',
          pattern: 'function\\s+(\\w+)\\([^)]*\\)\\s*{[^}]*}',
          replacement: '// Complex refactoring attempted',
          description: 'Complex function refactoring',
          complexity: 8,
          riskLevel: 'high',
          mode: 'llm', // Required by the schema
        },
      ];

      const riskyTransformationInput = {
        mode: 'llm' as const,
        files: ['risky-transform.ts'],
        patterns: riskyPatterns,
        request: {
          prompt: 'Refactor this function to use modern TypeScript patterns',
        },
      };

      try {
        const transformationActorInstance = createActor(transformationActor, {
          input: riskyTransformationInput,
        });
        transformationActorInstance.start();

        const transformationResult = await waitFor(
          transformationActorInstance,
          (state) => state.status === 'done',
          { timeout: 15000 }
        );

        // If transformation succeeds, validate the result
        if (transformationResult.output) {
          const validationInput = {
            type: 'quality' as const,
            files: ['risky-transform.ts'],
          };

          const validationActorInstance = createActor(validationActor, { input: validationInput });
          validationActorInstance.start();

          const validationResult = await waitFor(
            validationActorInstance,
            (state) => state.status === 'done',
            { timeout: 10000 }
          );

          // If validation fails, we should rollback
          if (!validationResult.output?.isValid) {
            const rollbackInput = {
              operation: 'rollback' as const,
              checkpoint,
            };

            const rollbackActorInstance = createActor(gitActor, { input: rollbackInput });
            rollbackActorInstance.start();

            const rollbackResult = await waitFor(
              rollbackActorInstance,
              (state) => state.status === 'done',
              { timeout: 5000 }
            );

            expect(rollbackResult.output).toBeDefined();
            expect(rollbackResult.output!.description).toContain('Rolled back to:');
          }
        }
      } catch (error) {
        // Transformation failure is acceptable for high-risk operations
        expect(error).toBeDefined();
      }
    });
  });

  describe('Analysis → Transformation → Dafny Pipeline', () => {
    test('should analyze code, apply transformation, and verify with Dafny', async () => {
      // Step 1: Create code with known patterns
      await createTestFile(
        'verify-transform.ts',
        `
        function processArray(items: any[]): string[] {
          var results = [];
          for (var i = 0; i < items.length; i++) {
            if (items[i] != null) {
              results.push(items[i].toString());
            }
          }
          return results;
        }
      `
      );

      // Step 2: Analyze to identify patterns
      const analysisInput = {
        files: ['verify-transform.ts'],
        patterns: [], // Required by the schema
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const analysis = analysisResult.output!;
      expect(analysis.complexity).toBeDefined();

      // Step 3: Apply transformation based on analysis
      const safePatterns: AstPattern[] = [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=',
          replacement: 'const $1 =',
          description: 'Convert var to const',
          complexity: 2,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      const transformationInput = {
        mode: 'template' as const,
        files: ['verify-transform.ts'],
        patterns: safePatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const transformation = transformationResult.output!;
      expect(transformation.filesModified).toContain('verify-transform.ts');

      // Step 4: Verify transformation with Dafny
      const dafnyInput = {
        files: ['verify-transform.ts'],
        transformationMode: 'template' as const,
        originalCode: `
          function processArray(items: any[]): string[] {
            var results = [];
            for (var i = 0; i < items.length; i++) {
              if (items[i] != null) {
                results.push(items[i].toString());
              }
            }
            return results;
          }
        `,
        transformedCode: 'const results = [];', // Simplified for test
      };

      const dafnyActorInstance = createActor(dafnyActor, { input: dafnyInput });
      dafnyActorInstance.start();

      const dafnyResult = await waitFor(dafnyActorInstance, (state) => state.status === 'done', {
        timeout: 15000,
      });

      const verification = dafnyResult.output!;
      expect(verification.verified).toBe(true);
      expect(verification.conditions).toBeGreaterThan(0);
    });

    test('should handle complex transformation with formal verification', async () => {
      // Step 1: Create complex code requiring careful transformation
      await createTestFile(
        'complex-verify.ts',
        `
        class DataProcessor {
          private cache: any = {};
          
          process(input: any): any {
            var key = this.generateKey(input);
            if (this.cache[key] == undefined) {
              var result = this.computeResult(input);
              this.cache[key] = result;
              return result;
            }
            return this.cache[key];
          }
          
          private generateKey(input: any): string {
            return JSON.stringify(input);
          }
          
          private computeResult(input: any): any {
            // Complex computation simulation
            var output = {};
            for (var prop in input) {
              if (input.hasOwnProperty(prop)) {
                output[prop] = input[prop];
              }
            }
            return output;
          }
        }
      `
      );

      // Step 2: Analyze complexity and patterns
      const analysisInput = {
        files: ['complex-verify.ts'],
        patterns: [], // Required by the schema
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const analysis = analysisResult.output!;
      if (analysis.complexity) {
        expect(analysis.complexity.cyclomaticComplexity).toBeGreaterThan(3);
      }

      // Step 3: Apply AST-based transformation for better safety
      const lowRiskPatterns: AstPattern[] = [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=',
          replacement: 'const $1 =',
          description: 'Convert var to const',
          complexity: 2,
          riskLevel: 'low',
          mode: 'ast',
        },
      ];

      const transformationInput = {
        mode: 'ast' as const,
        files: ['complex-verify.ts'],
        patterns: lowRiskPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 15000 }
      );

      const transformation = transformationResult.output!;

      // Step 4: Formal verification with Dafny
      const dafnyInput = {
        files: ['complex-verify.ts'],
        transformationMode: 'ast' as const,
      };

      const dafnyActorInstance = createActor(dafnyActor, { input: dafnyInput });
      dafnyActorInstance.start();

      const dafnyResult = await waitFor(dafnyActorInstance, (state) => state.status === 'done', {
        timeout: 15000,
      });

      const verification = dafnyResult.output!;
      expect(verification.verified).toBe(true);
      expect(verification.conditions).toBeGreaterThan(6); // AST mode has more conditions
    });
  });

  describe('Full Pipeline Integration', () => {
    test('should execute complete transformation pipeline', async () => {
      // Step 1: Create source files
      await createTestFile(
        'pipeline-test.ts',
        `
        function legacyFunction(data: any): any {
          var result = [];
          for (var i = 0; i < data.length; i++) {
            if (data[i] != null && data[i] != undefined) {
              var processed = data[i].toString().toUpperCase();
              result.push(processed);
            }
          }
          return result;
        }
      `
      );

      // Step 2: Initial analysis
      const analysisInput = {
        files: ['pipeline-test.ts'],
        patterns: [], // Required by the schema
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const analysis = analysisResult.output!;
      expect(analysis.complexity).toBeDefined();

      // Step 3: Create checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before full pipeline transformation',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();

      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });

      const checkpoint = checkpointResult.output!;

      // Step 4: Apply transformations
      const safePatterns: AstPattern[] = [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=',
          replacement: 'const $1 =',
          description: 'Convert var to const',
          complexity: 2,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      const transformationInput = {
        mode: 'template' as const,
        files: ['pipeline-test.ts'],
        patterns: safePatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const transformation = transformationResult.output!;

      // Step 5: Validate transformed code
      const validationInput = {
        type: 'format' as const,
        files: ['pipeline-test.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const validation = validationResult.output!;

      // Step 6: Formal verification
      const dafnyInput = {
        files: ['pipeline-test.ts'],
        transformationMode: 'template' as const,
      };

      const dafnyActorInstance = createActor(dafnyActor, { input: dafnyInput });
      dafnyActorInstance.start();

      const dafnyResult = await waitFor(dafnyActorInstance, (state) => state.status === 'done', {
        timeout: 15000,
      });

      const verification = dafnyResult.output!;

      // Step 7: Commit if all validations pass
      if (validation.isValid && verification.verified) {
        const commitInput = {
          operation: 'commit' as const,
          message: 'Apply automated transformations',
          files: ['pipeline-test.ts'],
        };

        const commitActorInstance = createActor(gitActor, { input: commitInput });
        commitActorInstance.start();

        const commitResult = await waitFor(
          commitActorInstance,
          (state) => state.status === 'done',
          { timeout: 5000 }
        );

        const commitCheckpoint = commitResult.output!;
        expect(commitCheckpoint.description).toBe('Apply automated transformations');
        expect(commitCheckpoint.hash).not.toBe(checkpoint.hash);
      }

      // Verify the complete pipeline worked
      expect(analysis.complexity).toBeDefined();
      expect(transformation.filesModified).toContain('pipeline-test.ts');
      expect(verification.verified).toBe(true);
    });
  });

  describe('Concurrent Actor Operations', () => {
    test('should handle multiple concurrent analysis operations', async () => {
      // Create multiple files for concurrent analysis
      const files = ['concurrent1.ts', 'concurrent2.ts', 'concurrent3.ts'];

      for (let i = 0; i < files.length; i++) {
        await createTestFile(
          files[i],
          `
          function process${i}(data: any[]): any {
            var result = [];
            for (var j = 0; j < data.length; j++) {
              if (data[j] != null) {
                result.push(data[j]);
              }
            }
            return result;
          }
        `
        );
      }

      // Run concurrent analysis operations
      const analysisPromises = files.map(async (file) => {
        const analysisInput = {
          files: [file],
          patterns: [], // Required by the schema
        };

        const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
        analysisActorInstance.start();

        const result = await waitFor(analysisActorInstance, (state) => state.status === 'done', {
          timeout: 10000,
        });

        return result.output;
      });

      const results = await Promise.all(analysisPromises);

      // Verify all analyses completed successfully
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result!.complexity).toBeDefined();
      });
    });

    test('should handle concurrent transformation operations safely', async () => {
      // Create separate files for concurrent transformation
      const files = ['transform1.ts', 'transform2.ts'];

      for (let i = 0; i < files.length; i++) {
        await createTestFile(
          files[i],
          `
          var value${i} = ${i};
          var message${i} = "test${i}";
        `
        );
      }

      // Run concurrent transformations
      const transformationPromises = files.map(async (file) => {
        const patterns: AstPattern[] = [
          {
            id: 'var-to-const',
            language: 'typescript',
            pattern: 'var\\s+(\\w+)\\s*=',
            replacement: 'const $1 =',
            description: 'Convert var to const',
            complexity: 2,
            riskLevel: 'low',
            mode: 'template',
          },
        ];

        const transformationInput = {
          mode: 'template' as const,
          files: [file],
          patterns,
        };

        const transformationActorInstance = createActor(transformationActor, {
          input: transformationInput,
        });
        transformationActorInstance.start();

        const result = await waitFor(
          transformationActorInstance,
          (state) => state.status === 'done',
          { timeout: 10000 }
        );

        return result.output;
      });

      const results = await Promise.all(transformationPromises);

      // Verify all transformations completed successfully
      expect(results).toHaveLength(2);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result!.filesModified).toContain(files[index]);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle actor failures gracefully', async () => {
      // Create a file that might cause issues
      await createTestFile(
        'problematic.ts',
        `
        // This file has intentional issues
        function problematic(x: any): any {
          var result;
          try {
            result = JSON.parse(x);
          } catch (e) {
            result = null;
          }
          return result;
        }
      `
      );

      // Test analysis resilience
      const analysisInput = {
        files: ['problematic.ts', 'nonexistent.ts'], // Include non-existent file
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      // Should complete despite issues
      expect(analysisResult.output).toBeDefined();

      // Test validation resilience
      const validationInput = {
        type: 'format' as const,
        files: ['problematic.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      // Should complete and provide results
      expect(validationResult.output).toBeDefined();
      expect(validationResult.output!.isValid).toBeDefined();
    });

    test('should maintain data consistency across pipeline failures', async () => {
      await createTestFile('consistency-test.ts', 'var x = 1;');

      // Create checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Consistency test checkpoint',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const checkpoint = checkpointResult.output!;

      // Attempt transformation that might fail
      const riskyPatterns: AstPattern[] = [
        {
          id: 'risky-transform',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=',
          replacement: 'INVALID SYNTAX $1 =',
          description: 'Intentionally broken transformation',
          complexity: 9,
          riskLevel: 'high',
          mode: 'template',
        },
      ];

      try {
        const transformationInput = {
          mode: 'template' as const,
          files: ['consistency-test.ts'],
          patterns: riskyPatterns,
        };

        const transformationActorInstance = createActor(transformationActor, {
          input: transformationInput,
        });
        transformationActorInstance.start();

        await waitFor(transformationActorInstance, (state) => state.status === 'done', {
          timeout: 10000,
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify we can still rollback
      const rollbackInput = {
        operation: 'rollback' as const,
        checkpoint,
      };

      const rollbackActorInstance = createActor(gitActor, { input: rollbackInput });
      rollbackActorInstance.start();

      const rollbackResult = await waitFor(
        rollbackActorInstance,
        (state) => state.status === 'done',
        { timeout: 5000 }
      );

      expect(rollbackResult.output).toBeDefined();
      expect(rollbackResult.output!.description).toContain('Rolled back to:');
    });
  });
});
