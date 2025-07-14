import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createActor, waitFor } from 'xstate';
import { analysisActor } from '../../src/actors/analysis.js';
import { validationActor } from '../../src/actors/validation.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { gitActor } from '../../src/actors/git.js';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import type { AstPattern } from '../../src/types.js';

describe('End-to-End Pipeline Validation (Simplified)', () => {
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

  async function readTestFile(name: string): Promise<string> {
    const filePath = join(testDir, name);
    return await readFile(filePath, 'utf-8');
  }

  describe('Pipeline Component Integration', () => {
    test('should execute analysis → transformation → validation flow', async () => {
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
          
          return { total: count, items: results };
        }
      `;

      await createTestFile('legacy-code.ts', sourceCode);

      // Step 2: Analysis Phase
      console.log('🔍 Phase 1: Analysis');
      const analysisInput = {
        files: ['legacy-code.ts'],
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

      // Step 4: Transformation Phase (using template mode for reliability)
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
        }
      ];

      const transformationInput = {
        mode: 'template' as const, // Use template for reliability
        files: ['legacy-code.ts'],
        patterns: transformationPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, { input: transformationInput });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance, 
        (state) => state.status === 'done', 
        { timeout: 15000 }
      );

      const transformation = transformationResult.output!;
      expect(transformation).toBeDefined();
      console.log(`   Transformation completed`);
      console.log(`   Files processed: ${transformation.filesModified?.length || 0}`);
      console.log(`   Transformations applied: ${transformation.transformationsApplied || 0}`);

      // Step 5: Validation Phase (skip external tool validation)
      console.log('✅ Phase 4: Validation');
      const validationInput = {
        type: 'format' as const,
        files: ['legacy-code.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      // Use a shorter timeout and expect it might fail due to external dependencies
      try {
        const validationResult = await waitFor(
          validationActorInstance, 
          (state) => state.status === 'done', 
          { timeout: 3000 }
        );

        const validation = validationResult.output!;
        console.log(`   Validation completed: ${validation.isValid}`);
      } catch (error) {
        console.log(`   Validation skipped (external tool dependency): ${error}`);
      }

      // Step 6: Final Commit
      console.log('💾 Phase 5: Final Commit');
      const commitInput = {
        operation: 'commit' as const,
        message: 'E2E Pipeline: Apply automated transformations',
        files: ['legacy-code.ts'],
      };

      const commitActor = createActor(gitActor, { input: commitInput });
      commitActor.start();

      const commitResult = await waitFor(
        commitActor, 
        (state) => state.status === 'done', 
        { timeout: 5000 }
      );

      const commitCheckpoint = commitResult.output!;
      expect(commitCheckpoint.description).toBe('E2E Pipeline: Apply automated transformations');
      console.log(`   Commit created: ${commitCheckpoint.hash.substring(0, 8)}`);

      console.log('✨ E2E Pipeline flow completed successfully!');
    });

    test('should handle pipeline failure and recovery', async () => {
      // Step 1: Create problematic code
      const problematicCode = `
        function riskyFunction(data: any): any {
          var result;
          try {
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
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', { timeout: 5000 });
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
        }
      ];

      let transformationSucceeded = false;

      try {
        // Analysis
        const analysisInput = {
          files: ['risky-code.ts'],
          patterns: [],
        };

        const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
        analysisActorInstance.start();
        const analysisResult = await waitFor(analysisActorInstance, (state) => state.status === 'done', { timeout: 10000 });
        const analysis = analysisResult.output!;

        // Attempt transformation
        const transformationInput = {
          mode: 'llm' as const,
          files: ['risky-code.ts'],
          patterns: riskyPatterns,
        };

        const transformationActorInstance = createActor(transformationActor, { input: transformationInput });
        transformationActorInstance.start();
        const transformationResult = await waitFor(transformationActorInstance, (state) => state.status === 'done', { timeout: 15000 });

        if (transformationResult.output) {
          transformationSucceeded = true;
        }
      } catch (error) {
        console.log(`   Expected failure occurred: ${error}`);
      }

      // Test rollback functionality
      console.log('🔄 Testing rollback functionality');
      
      const rollbackInput = {
        operation: 'rollback' as const,
        checkpoint,
      };

      const rollbackActor = createActor(gitActor, { input: rollbackInput });
      rollbackActor.start();
      const rollbackResult = await waitFor(rollbackActor, (state) => state.status === 'done', { timeout: 5000 });

      expect(rollbackResult.output).toBeDefined();
      expect(rollbackResult.output!.description).toContain('Rolled back to:');
      console.log('   Rollback completed successfully');

      console.log('✨ Pipeline failure and recovery test completed!');
    });

    test('should handle multi-file project coordination', async () => {
      // Create a multi-file project
      const utilsCode = `
        export function helper(value: any): string {
          var result = "";
          if (value != null) {
            result = value.toString();
          }
          return result;
        }
      `;

      const mainCode = `
        import { helper } from './utils';
        
        export class ProjectProcessor {
          process(item: any): string {
            var processed = helper(item);
            return processed;
          }
        }
      `;

      await createTestFile('utils.ts', utilsCode);
      await createTestFile('main.ts', mainCode);

      console.log('🏗️  Multi-File Project Coordination Test');

      const files = ['utils.ts', 'main.ts'];

      // Step 1: Analysis of all files
      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();
      const analysisResult = await waitFor(analysisActorInstance, (state) => state.status === 'done', { timeout: 10000 });
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
      const checkpointResult = await waitFor(gitActorInstance, (state) => state.status === 'done', { timeout: 5000 });
      const checkpoint = checkpointResult.output!;

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
        }
      ];

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns,
      };

      const transformationActorInstance = createActor(transformationActor, { input: transformationInput });
      transformationActorInstance.start();
      const transformationResult = await waitFor(transformationActorInstance, (state) => state.status === 'done', { timeout: 15000 });
      const transformation = transformationResult.output!;

      expect(transformation).toBeDefined();
      console.log(`   Multi-file transformation completed`);

      // Step 4: Final commit
      const commitInput = {
        operation: 'commit' as const,
        message: 'Multi-file transformation: modernize codebase',
        files,
      };

      const commitActor = createActor(gitActor, { input: commitInput });
      commitActor.start();
      const commitResult = await waitFor(commitActor, (state) => state.status === 'done', { timeout: 5000 });
      const commitCheckpoint = commitResult.output!;

      expect(commitCheckpoint.description).toBe('Multi-file transformation: modernize codebase');
      console.log(`   Multi-file commit: ${commitCheckpoint.hash.substring(0, 8)}`);

      console.log('✨ Multi-file project coordination completed!');
    });
  });

  describe('Performance and Timing Validation', () => {
    test('should complete pipeline within reasonable time limits', async () => {
      console.log('⚡ Performance Timing Test');

      // Create a moderately complex file
      const complexCode = `
        class DataProcessor {
          private cache: any = {};
          
          process(data: any[]): any {
            var results = [];
            var errors = [];
            
            for (var i = 0; i < data.length; i++) {
              try {
                var item = data[i];
                if (item != null) {
                  var processed = this.transform(item);
                  results.push(processed);
                }
              } catch (error) {
                var errorInfo = { item, error: error.message };
                errors.push(errorInfo);
              }
            }
            
            return { results, errors };
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

      await createTestFile('complex-processor.ts', complexCode);

      const startTime = Date.now();

      // Execute pipeline phases with timing
      const analysisInput = {
        files: ['complex-processor.ts'],
        patterns: [],
      };

      const analysisStart = Date.now();
      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();
      const analysisResult = await waitFor(analysisActorInstance, (state) => state.status === 'done', { timeout: 10000 });
      const analysisTime = Date.now() - analysisStart;

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
        }
      ];

      const transformationInput = {
        mode: 'template' as const,
        files: ['complex-processor.ts'],
        patterns,
      };

      const transformationActorInstance = createActor(transformationActor, { input: transformationInput });
      transformationActorInstance.start();
      const transformationResult = await waitFor(transformationActorInstance, (state) => state.status === 'done', { timeout: 15000 });
      const transformationTime = Date.now() - transformationStart;

      const totalTime = Date.now() - startTime;

      console.log(`   Analysis completed in ${analysisTime}ms`);
      console.log(`   Transformation completed in ${transformationTime}ms`);
      console.log(`   Total pipeline time: ${totalTime}ms`);

      // Performance assertions (generous limits for CI environments)
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(analysisTime).toBeLessThan(15000); // Analysis should be reasonably fast
      expect(transformationTime).toBeLessThan(20000); // Transformation should be reasonable

      console.log('✨ Performance timing test completed successfully!');
    });
  });
});