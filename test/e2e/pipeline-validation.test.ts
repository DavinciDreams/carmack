import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createActor, waitFor } from 'xstate';
import { analysisActor } from '../../src/actors/analysis.js';
import { dafnyActor } from '../../src/actors/dafny.js';
import { gitActor } from '../../src/actors/git.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { validationActor } from '../../src/actors/validation.js';
import type { AstPattern } from '../../src/types.js';

describe('End-to-End Pipeline Validation', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `e2e-pipeline-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Setup git for E2E tests
    try {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "E2E Test User"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "e2e@example.com"', { cwd: testDir, stdio: 'pipe' });
    } catch (_error) {
      // Git setup might fail in some environments
    }
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFile(name: string, content: string): Promise<string> {
    const filePath = join(testDir, name);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  async function readTestFile(name: string): Promise<string> {
    const filePath = join(testDir, name);
    return await readFile(filePath, 'utf-8');
  }

  describe('Complete Transformation Pipeline', () => {
    test('should execute full pipeline: var-to-const transformation', async () => {
      // Step 1: Create source file with legacy patterns
      const sourceCode = `
        function processData(items) {
          var results = [];
          var count = 0;
          
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item != null && item != undefined) {
              var processed = item.toString().toUpperCase();
              results.push(processed);
              count++;
            }
          }
          
          var summary = {
            total: count,
            items: results
          };
          
          return summary;
        }
      `;

      await createTestFile('legacy-code.ts', sourceCode);

      // Step 2: Analysis Phase
      console.log('🔍 Phase 1: Analysis');
      const analysisInput = {
        files: ['legacy-code.ts'],
        patterns: [], // Will be populated by analysis
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
      expect(analysis.recommendedMode).toBeDefined();

      console.log(`   Complexity: ${analysis.complexity?.cyclomaticComplexity}`);
      console.log(`   Recommended Mode: ${analysis.recommendedMode}`);

      // Step 3: Git Checkpoint Creation
      console.log('📝 Phase 2: Creating Git Checkpoint');
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before E2E transformation pipeline',
      };

      const gitCheckpointActor = createActor(gitActor, { input: checkpointInput });
      gitCheckpointActor.start();

      const checkpointResult = await waitFor(
        gitCheckpointActor,
        (state) => state.status === 'done',
        { timeout: 5000 }
      );

      const checkpoint = checkpointResult.output!;
      expect(checkpoint.description).toBe('Before E2E transformation pipeline');
      console.log(`   Checkpoint created: ${checkpoint.hash.substring(0, 8)}`);

      // Step 4: Transformation Phase
      console.log('🔄 Phase 3: Applying Transformations');
      const transformationPatterns: AstPattern[] = [
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
        {
          id: 'strict-equality',
          language: 'typescript',
          pattern: '([^!=])\\s*==\\s*([^=])',
          replacement: '$1 === $2',
          description: 'Convert loose equality to strict equality',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      const transformationInput = {
        mode: analysis.recommendedMode || ('template' as const),
        files: ['legacy-code.ts'],
        patterns: transformationPatterns,
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
      expect(transformation.filesModified).toContain('legacy-code.ts');
      console.log(`   Files modified: ${transformation.filesModified.length}`);
      console.log(`   Transformations applied: ${transformation.transformationsApplied}`);

      // Step 5: Validation Phase
      console.log('✅ Phase 4: Validation');
      const validationInput = {
        type: 'format' as const,
        files: ['legacy-code.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );

      const validation = validationResult.output!;
      console.log(`   Validation passed: ${validation.isValid}`);
      console.log(`   Errors: ${validation.errors.length}`);
      console.log(`   Warnings: ${validation.warnings.length}`);

      // Step 6: Formal Verification
      console.log('🔬 Phase 5: Formal Verification');
      const dafnyInput = {
        files: ['legacy-code.ts'],
        transformationMode: (analysis.recommendedMode || 'template') as 'template' | 'ast' | 'llm',
        originalCode: sourceCode,
        transformedCode: await readTestFile('legacy-code.ts'),
      };

      const dafnyActorInstance = createActor(dafnyActor, { input: dafnyInput });
      dafnyActorInstance.start();

      const dafnyResult = await waitFor(dafnyActorInstance, (state) => state.status === 'done', {
        timeout: 20000,
      });

      const verification = dafnyResult.output!;
      expect(verification.verified).toBe(true);
      console.log(`   Verification passed: ${verification.verified}`);
      console.log(`   Conditions verified: ${verification.conditions}`);

      // Step 7: Final Commit
      console.log('💾 Phase 6: Final Commit');
      if (validation.isValid && verification.verified) {
        const commitInput = {
          operation: 'commit' as const,
          message: 'E2E Pipeline: Apply automated transformations',
          files: ['legacy-code.ts'],
        };

        const commitActor = createActor(gitActor, { input: commitInput });
        commitActor.start();

        const commitResult = await waitFor(commitActor, (state) => state.status === 'done', {
          timeout: 5000,
        });

        const commitCheckpoint = commitResult.output!;
        expect(commitCheckpoint.description).toBe('E2E Pipeline: Apply automated transformations');
        console.log(`   Commit created: ${commitCheckpoint.hash.substring(0, 8)}`);
      }

      // Step 8: Verify Transformations
      console.log('🧪 Phase 7: Verification of Results');
      const transformedCode = await readTestFile('legacy-code.ts');

      // Verify var-to-const transformation
      expect(transformedCode).not.toContain('var results');
      expect(transformedCode).not.toContain('var count');
      expect(transformedCode).not.toContain('var i');
      expect(transformedCode).toContain('const results');
      expect(transformedCode).toContain('const count');

      // Verify strict equality transformation
      expect(transformedCode).not.toContain('!= null');
      expect(transformedCode).not.toContain('!= undefined');
      expect(transformedCode).toContain('!== null');
      expect(transformedCode).toContain('!== undefined');

      console.log('✨ E2E Pipeline completed successfully!');
    });

    test('should handle complex TypeScript class transformation', async () => {
      // Step 1: Create complex TypeScript class
      const complexCode = `
        class DataProcessor {
          private cache: any = {};
          private stats: any = {};
          
          constructor() {
            var self = this;
            self.stats = {
              processed: 0,
              errors: 0
            };
          }
          
          process(data: any[]): any {
            var results = [];
            var errors = [];
            
            for (var i = 0; i < data.length; i++) {
              try {
                var item = data[i];
                if (item != null) {
                  var key = this.generateKey(item);
                  if (this.cache[key] == undefined) {
                    var processed = this.transform(item);
                    this.cache[key] = processed;
                    results.push(processed);
                  } else {
                    results.push(this.cache[key]);
                  }
                  this.stats.processed++;
                }
              } catch (error) {
                var errorInfo = {
                  item: item,
                  error: error.message,
                  index: i
                };
                errors.push(errorInfo);
                this.stats.errors++;
              }
            }
            
            return {
              results: results,
              errors: errors,
              stats: this.stats
            };
          }
          
          private generateKey(item: any): string {
            return JSON.stringify(item);
          }
          
          private transform(item: any): any {
            var transformed = {};
            for (var prop in item) {
              if (item.hasOwnProperty(prop)) {
                transformed[prop] = item[prop];
              }
            }
            return transformed;
          }
        }
      `;

      await createTestFile('complex-class.ts', complexCode);

      // Execute full pipeline
      console.log('🚀 Starting Complex Class Transformation Pipeline');

      // Analysis
      const analysisInput = {
        files: ['complex-class.ts'],
        patterns: [],
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
      expect(analysis.complexity?.cyclomaticComplexity).toBeGreaterThan(5); // Complex class

      // Checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before complex class transformation',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const _checkpoint = checkpointResult.output!;

      // Transformation with multiple patterns
      const complexPatterns: AstPattern[] = [
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
        {
          id: 'strict-equality',
          language: 'typescript',
          pattern: '([^!=])\\s*==\\s*([^=])',
          replacement: '$1 === $2',
          description: 'Convert loose equality to strict equality',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
        {
          id: 'strict-inequality',
          language: 'typescript',
          pattern: '([^!=])\\s*!=\\s*([^=])',
          replacement: '$1 !== $2',
          description: 'Convert loose inequality to strict inequality',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      const transformationInput = {
        mode: 'template' as const, // Use template for safety with complex code
        files: ['complex-class.ts'],
        patterns: complexPatterns,
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

      expect(transformation.filesModified).toContain('complex-class.ts');
      expect(transformation.transformationsApplied).toBeGreaterThan(0); // Should have some transformations

      // Validation
      const validationInput = {
        type: 'types' as const,
        files: ['complex-class.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();
      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );
      const _validation = validationResult.output!;

      // Formal verification
      const dafnyInput = {
        files: ['complex-class.ts'],
        transformationMode: 'template' as const,
      };

      const dafnyActorInstance = createActor(dafnyActor, { input: dafnyInput });
      dafnyActorInstance.start();
      const dafnyResult = await waitFor(dafnyActorInstance, (state) => state.status === 'done', {
        timeout: 20000,
      });
      const verification = dafnyResult.output!;

      expect(verification.verified).toBe(true);

      // Verify transformations
      const transformedCode = await readTestFile('complex-class.ts');

      // Should not contain any var declarations
      const varMatches = transformedCode.match(/\bvar\s+\w+/g);
      expect(varMatches).toBeNull();

      // Should contain const declarations
      expect(transformedCode).toContain('const results');
      expect(transformedCode).toContain('const errors');
      expect(transformedCode).toContain('const item');

      // Should use strict equality
      expect(transformedCode).toContain('!== null');
      expect(transformedCode).toContain('=== undefined');

      console.log('✨ Complex class transformation completed successfully!');
    });

    test('should handle pipeline failure and recovery', async () => {
      // Step 1: Create problematic code that might cause issues
      const problematicCode = `
        function riskyFunction(data: any): any {
          var result;
          try {
            // Intentionally complex and risky code
            var parsed = JSON.parse(data);
            var processed = eval(parsed.code); // Dangerous eval
            result = processed;
          } catch (e) {
            var fallback = "error";
            result = fallback;
          }
          return result;
        }
      `;

      await createTestFile('risky-code.ts', problematicCode);

      console.log('⚠️  Testing Pipeline Failure and Recovery');

      // Create checkpoint first
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before risky transformation attempt',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const checkpoint = checkpointResult.output!;

      // Attempt risky transformation
      const riskyPatterns: AstPattern[] = [
        {
          id: 'risky-eval-removal',
          language: 'typescript',
          pattern: 'eval\\([^)]+\\)',
          replacement: '/* REMOVED EVAL */',
          description: 'Remove dangerous eval calls',
          complexity: 9,
          riskLevel: 'high',
          mode: 'llm',
        },
      ];

      let transformationSucceeded = false;
      let validationPassed = false;

      try {
        // Analysis
        const analysisInput = {
          files: ['risky-code.ts'],
          patterns: [],
        };

        const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
        analysisActorInstance.start();
        const analysisResult = await waitFor(
          analysisActorInstance,
          (state) => state.status === 'done',
          { timeout: 10000 }
        );
        const _analysis = analysisResult.output!;

        // Attempt transformation
        const transformationInput = {
          mode: 'llm' as const,
          files: ['risky-code.ts'],
          patterns: riskyPatterns,
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

        if (transformationResult.output) {
          transformationSucceeded = true;

          // Validate the result
          const validationInput = {
            type: 'types' as const,
            files: ['risky-code.ts'],
          };

          const validationActorInstance = createActor(validationActor, { input: validationInput });
          validationActorInstance.start();
          const validationResult = await waitFor(
            validationActorInstance,
            (state) => state.status === 'done',
            { timeout: 10000 }
          );

          validationPassed = validationResult.output?.isValid || false;
        }
      } catch (error) {
        console.log(`   Expected failure occurred: ${error}`);
      }

      // If transformation failed or validation failed, rollback
      if (!transformationSucceeded || !validationPassed) {
        console.log('🔄 Rolling back due to failure');

        const rollbackInput = {
          operation: 'rollback' as const,
          checkpoint,
        };

        const rollbackActor = createActor(gitActor, { input: rollbackInput });
        rollbackActor.start();
        const rollbackResult = await waitFor(rollbackActor, (state) => state.status === 'done', {
          timeout: 5000,
        });

        expect(rollbackResult.output).toBeDefined();
        expect(rollbackResult.output?.description).toContain('Rolled back to:');
        console.log('   Rollback completed successfully');

        // Verify original code is restored
        const restoredCode = await readTestFile('risky-code.ts');
        expect(restoredCode).toContain('eval(parsed.code)'); // Original risky code should be back
      }

      console.log('✨ Pipeline failure and recovery test completed!');
    });
  });

  describe('Multi-File Project Transformation', () => {
    test('should transform entire project with dependencies', async () => {
      // Create a multi-file project
      const utilsCode = `
        export function helper(value: any): string {
          var result = "";
          if (value != null) {
            result = value.toString();
          }
          return result;
        }
        
        export function validator(data: any): boolean {
          var isValid = false;
          if (data != undefined && data != null) {
            isValid = true;
          }
          return isValid;
        }
      `;

      const mainCode = `
        import { helper, validator } from './utils';
        
        export class ProjectProcessor {
          private items: any[] = [];
          
          addItem(item: any): void {
            var processed = helper(item);
            if (validator(item)) {
              this.items.push(processed);
            }
          }
          
          process(): any[] {
            var results = [];
            for (var i = 0; i < this.items.length; i++) {
              var item = this.items[i];
              if (item != null) {
                results.push(item);
              }
            }
            return results;
          }
        }
      `;

      const indexCode = `
        import { ProjectProcessor } from './main';
        
        function runProject(): void {
          var processor = new ProjectProcessor();
          var testData = ["test1", "test2", null, "test3"];
          
          for (var i = 0; i < testData.length; i++) {
            var item = testData[i];
            processor.addItem(item);
          }
          
          var results = processor.process();
          console.log("Results:", results);
        }
        
        runProject();
      `;

      await createTestFile('utils.ts', utilsCode);
      await createTestFile('main.ts', mainCode);
      await createTestFile('index.ts', indexCode);

      console.log('🏗️  Multi-File Project Transformation');

      const files = ['utils.ts', 'main.ts', 'index.ts'];

      // Step 1: Analysis of all files
      const analysisInput = {
        files,
        patterns: [],
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
      console.log(`   Project complexity: ${analysis.complexity?.cyclomaticComplexity}`);

      // Step 2: Create checkpoint
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before multi-file transformation',
      };

      const gitActorInstance = createActor(gitActor, { input: checkpointInput });
      gitActorInstance.start();
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });
      const _checkpoint = checkpointResult.output!;

      // Step 3: Transform all files
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
        {
          id: 'strict-equality',
          language: 'typescript',
          pattern: '([^!=])\\s*!=\\s*([^=])',
          replacement: '$1 !== $2',
          description: 'Convert loose inequality to strict inequality',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns,
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

      expect(transformation.filesModified.length).toBeGreaterThan(0);
      console.log(`   Files transformed: ${transformation.filesModified.length}`);
      console.log(`   Expected files: ${files.join(', ')}`);
      console.log(`   Actual files: ${transformation.filesModified.join(', ')}`);

      // Step 4: Validate all files
      const validationInput = {
        type: 'format' as const,
        files,
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();
      const validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 10000 }
      );
      const validation = validationResult.output!;

      // Step 5: Verify transformations across all files
      for (const file of files) {
        const transformedCode = await readTestFile(file);

        // Should not contain var declarations
        const varMatches = transformedCode.match(/\bvar\s+\w+/g);
        expect(varMatches).toBeNull();

        // Should contain const declarations
        expect(transformedCode).toContain('const ');

        // Should use strict inequality
        if (transformedCode.includes('!==')) {
          expect(transformedCode).not.toContain('!= null');
          expect(transformedCode).not.toContain('!= undefined');
        }
      }

      // Step 6: Final commit
      if (validation.isValid) {
        const commitInput = {
          operation: 'commit' as const,
          message: 'Multi-file transformation: modernize codebase',
          files,
        };

        const commitActor = createActor(gitActor, { input: commitInput });
        commitActor.start();
        const commitResult = await waitFor(commitActor, (state) => state.status === 'done', {
          timeout: 5000,
        });
        const commitCheckpoint = commitResult.output!;

        expect(commitCheckpoint.description).toBe('Multi-file transformation: modernize codebase');
        console.log(`   Multi-file commit: ${commitCheckpoint.hash.substring(0, 8)}`);
      }

      console.log('✨ Multi-file project transformation completed!');
    });
  });

  describe('Performance and Scalability Validation', () => {
    test('should handle large codebase transformation efficiently', async () => {
      console.log('⚡ Performance and Scalability Test');

      // Create multiple files with varying complexity
      const fileCount = 10;
      const files: string[] = [];

      for (let i = 0; i < fileCount; i++) {
        const complexity = Math.floor(Math.random() * 3) + 1; // 1-3 complexity levels
        let code = `
          // File ${i} - Complexity Level ${complexity}
          export class Module${i} {
            private data: any[] = [];
        `;

        // Add varying amounts of code based on complexity
        for (let j = 0; j < complexity * 3; j++) {
          code += `
            process${j}(input: any): any {
              var result = input;
              var processed = false;
              
              if (result != null && result != undefined) {
                for (var k = 0; k < 5; k++) {
                  var temp = result + k;
                  result = temp;
                }
                processed = true;
              }
              
              return { result, processed };
            }
          `;
        }

        code += `
          }
        `;

        const fileName = `module${i}.ts`;
        await createTestFile(fileName, code);
        files.push(fileName);
      }

      const startTime = Date.now();

      // Execute pipeline on all files
      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();
      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 15000 }
      );
      const _analysis = analysisResult.output!;

      const analysisTime = Date.now() - startTime;
      console.log(`   Analysis completed in ${analysisTime}ms`);

      // Transformation
      const transformationStart = Date.now();
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
        files,
        patterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();
      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 20000 }
      );
      const transformation = transformationResult.output!;

      const transformationTime = Date.now() - transformationStart;
      console.log(`   Transformation completed in ${transformationTime}ms`);

      // Validation
      const validationStart = Date.now();
      const validationInput = {
        type: 'format' as const,
        files,
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();
      const _validationResult = await waitFor(
        validationActorInstance,
        (state) => state.status === 'done',
        { timeout: 15000 }
      );

      const validationTime = Date.now() - validationStart;
      const totalTime = Date.now() - startTime;

      console.log(`   Validation completed in ${validationTime}ms`);
      console.log(`   Total pipeline time: ${totalTime}ms`);

      // Performance assertions
      expect(transformation.filesModified.length).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds (more lenient)
      expect(analysisTime).toBeLessThan(10000); // Analysis should be reasonably fast
      expect(transformationTime).toBeLessThan(30000); // Transformation should be reasonable

      console.log('✨ Performance test completed successfully!');
    });
  });
});
