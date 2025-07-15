import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { analysisActor } from '../../src/actors/analysis.js';
import { dafnyActor } from '../../src/actors/dafny.js';
import { gitActor } from '../../src/actors/git.js';
import { patternDiscoveryActor } from '../../src/actors/pattern-discovery.js';
import { patternLearningActor } from '../../src/actors/pattern-learning.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { validationActor } from '../../src/actors/validation.js';
import type { AstPattern } from '../../src/types.js';
import {
  E2EActorUtils,
  E2EAssertions,
  E2ETestData,
  E2ETestEnvironment,
  ExternalToolMocker,
  PatternTestUtils,
} from './e2e-test-helpers.js';

describe('Enhanced End-to-End Pipeline Validation', () => {
  let testEnv: E2ETestEnvironment;

  beforeEach(async () => {
    testEnv = new E2ETestEnvironment();
    await testEnv.setup();

    // Configure external tool mocks for reliable testing
    ExternalToolMocker.setMockResponse('biome', {
      stdout: 'All files formatted correctly',
      shouldFail: false,
    });
    ExternalToolMocker.setMockResponse('typescript', {
      stdout: 'No type errors found',
      shouldFail: false,
    });
    ExternalToolMocker.setMockResponse('git', {
      stdout: 'Git operation successful',
      shouldFail: false,
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe('Complete Transformation Pipeline with Enhanced Actor Management', () => {
    test('should execute full pipeline: var-to-const transformation', async () => {
      // Step 1: Create source file with legacy patterns
      const sourceCode = E2ETestData.generateTestCode();
      await testEnv.createTestFile('legacy-code.ts', sourceCode);

      // Step 2: Analysis Phase with enhanced actor management
      console.log('🔍 Phase 1: Analysis');
      const analysisInput = {
        files: ['legacy-code.ts'],
        patterns: [],
      };

      const analysis = (await E2EActorUtils.createAndRunActor(
        analysisActor,
        analysisInput,
        10000 // 10 second timeout
      )) as any;

      expect(analysis.complexity).toBeDefined();
      expect(analysis.recommendedMode).toBeDefined();
      console.log(`   Complexity: ${analysis.complexity?.cyclomaticComplexity}`);
      console.log(`   Recommended Mode: ${analysis.recommendedMode}`);

      // Step 3: Git Checkpoint Creation with retry logic
      console.log('📝 Phase 2: Creating Git Checkpoint');
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before E2E transformation pipeline',
      };

      const checkpoint = (await E2EActorUtils.testActorWithRetry(
        gitActor,
        checkpointInput,
        3, // max retries
        5000 // timeout per attempt
      )) as any;

      E2EAssertions.assertGitCheckpoint(checkpoint);
      console.log(`   Checkpoint created: ${checkpoint.hash.substring(0, 8)}`);

      // Step 4: Transformation Phase with proper error handling
      console.log('🔄 Phase 3: Applying Transformations');
      const transformationPatterns = E2ETestData.generateTestPatterns();

      const transformationInput = {
        mode: analysis.recommendedMode || ('template' as const),
        files: ['legacy-code.ts'],
        patterns: transformationPatterns,
      };

      const transformation = (await E2EActorUtils.createAndRunActor(
        transformationActor,
        transformationInput,
        15000 // 15 second timeout for transformations
      )) as any;

      E2EAssertions.assertTransformationResult(transformation);
      expect(transformation.filesModified).toContain('legacy-code.ts');
      console.log(`   Files modified: ${transformation.filesModified.length}`);
      console.log(`   Transformations applied: ${transformation.transformationsApplied}`);

      // Step 5: Validation Phase with mocked external tools
      console.log('✅ Phase 4: Validation');
      const validationInput = {
        type: 'format' as const,
        files: ['legacy-code.ts'],
      };

      const validation = (await E2EActorUtils.createAndRunActor(
        validationActor,
        validationInput,
        10000 // 10 second timeout
      )) as any;

      E2EAssertions.assertValidationResult(validation);
      console.log(`   Validation passed: ${validation.isValid}`);
      console.log(`   Errors: ${validation.errors.length}`);
      console.log(`   Warnings: ${validation.warnings.length}`);

      // Step 6: Formal Verification with enhanced timeout
      console.log('🔬 Phase 5: Formal Verification');
      const dafnyInput = {
        files: ['legacy-code.ts'],
        transformationMode: (analysis.recommendedMode || 'template') as 'template' | 'ast' | 'llm',
        originalCode: sourceCode,
        transformedCode: await testEnv.readTestFile('legacy-code.ts'),
      };

      const verification = await E2EActorUtils.testActorWithRetry(
        dafnyActor,
        dafnyInput,
        2, // max retries for verification
        20000 // 20 second timeout
      );

      expect(verification.verified).toBe(true);
      console.log(`   Verification passed: ${verification.verified}`);
      console.log(`   Conditions verified: ${verification.conditions}`);

      // Step 7: Final Commit with validation
      console.log('💾 Phase 6: Final Commit');
      if (validation.isValid && verification.verified) {
        const commitInput = {
          operation: 'commit' as const,
          message: 'E2E Pipeline: Apply automated transformations',
          files: ['legacy-code.ts'],
        };

        const commitCheckpoint = await E2EActorUtils.createAndRunActor(gitActor, commitInput, 5000);

        E2EAssertions.assertGitCheckpoint(commitCheckpoint);
        expect(commitCheckpoint.description).toBe('E2E Pipeline: Apply automated transformations');
        console.log(`   Commit created: ${commitCheckpoint.hash.substring(0, 8)}`);
      }

      // Step 8: Verify Transformations
      console.log('🧪 Phase 7: Verification of Results');
      const transformedCode = await testEnv.readTestFile('legacy-code.ts');

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
      const complexCode = E2ETestData.generateComplexTestCode();
      await testEnv.createTestFile('complex-class.ts', complexCode);

      // Execute full pipeline with enhanced error handling
      console.log('🚀 Starting Complex Class Transformation Pipeline');

      // Analysis with proper timeout
      const analysisInput = {
        files: ['complex-class.ts'],
        patterns: [],
      };

      const analysis = await E2EActorUtils.createAndRunActor(analysisActor, analysisInput, 10000);

      expect(analysis.complexity).toBeDefined();
      expect(analysis.complexity!.cyclomaticComplexity).toBeGreaterThan(5); // Complex class

      // Checkpoint with retry logic
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before complex class transformation',
      };

      const checkpoint = await E2EActorUtils.testActorWithRetry(gitActor, checkpointInput, 3, 5000);

      E2EAssertions.assertGitCheckpoint(checkpoint);

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

      const transformation = await E2EActorUtils.createAndRunActor(
        transformationActor,
        transformationInput,
        15000
      );

      E2EAssertions.assertTransformationResult(transformation);
      expect(transformation.filesModified).toContain('complex-class.ts');
      expect(transformation.transformationsApplied).toBeGreaterThan(0);

      // Validation with mocked tools
      const validationInput = {
        type: 'types' as const,
        files: ['complex-class.ts'],
      };

      const validation = await E2EActorUtils.createAndRunActor(
        validationActor,
        validationInput,
        10000
      );

      E2EAssertions.assertValidationResult(validation);

      // Formal verification
      const dafnyInput = {
        files: ['complex-class.ts'],
        transformationMode: 'template' as const,
      };

      const verification = await E2EActorUtils.testActorWithRetry(dafnyActor, dafnyInput, 2, 20000);

      expect(verification.verified).toBe(true);

      // Verify transformations
      const transformedCode = await testEnv.readTestFile('complex-class.ts');

      // Should not contain any var declarations
      const varMatches = transformedCode.match(/\bvar\s+\w+/g);
      expect(varMatches).toBeNull();

      // Should contain const declarations
      expect(transformedCode).toContain('const results');
      expect(transformedCode).toContain('const manager');

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

      await testEnv.createTestFile('risky-code.ts', problematicCode);

      console.log('⚠️  Testing Pipeline Failure and Recovery');

      // Create checkpoint first
      const checkpointInput = {
        operation: 'createCheckpoint' as const,
        description: 'Before risky transformation attempt',
      };

      const checkpoint = await E2EActorUtils.testActorWithRetry(gitActor, checkpointInput, 3, 5000);

      E2EAssertions.assertGitCheckpoint(checkpoint);

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

        const analysis = await E2EActorUtils.createAndRunActor(analysisActor, analysisInput, 10000);

        // Attempt transformation
        const transformationInput = {
          mode: 'llm' as const,
          files: ['risky-code.ts'],
          patterns: riskyPatterns,
        };

        const transformation = await E2EActorUtils.createAndRunActor(
          transformationActor,
          transformationInput,
          15000
        );

        if (transformation) {
          transformationSucceeded = true;

          // Validate the result
          const validationInput = {
            type: 'types' as const,
            files: ['risky-code.ts'],
          };

          const validation = await E2EActorUtils.createAndRunActor(
            validationActor,
            validationInput,
            10000
          );

          validationPassed = validation?.isValid || false;
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

        const rollbackResult = await E2EActorUtils.createAndRunActor(gitActor, rollbackInput, 5000);

        expect(rollbackResult).toBeDefined();
        expect(rollbackResult.description).toContain('Rolled back to:');
        console.log('   Rollback completed successfully');

        // Verify original code is restored
        const restoredCode = await testEnv.readTestFile('risky-code.ts');
        expect(restoredCode).toContain('eval(parsed.code)'); // Original risky code should be back
      }

      console.log('✨ Pipeline failure and recovery test completed!');
    });
  });

  describe('Pattern Discovery and Learning Integration', () => {
    test('should discover patterns and integrate with learning system', async () => {
      // Step 1: Create test files with discoverable patterns
      const testCode = E2ETestData.generateTestCode();
      await testEnv.createTestFile('pattern-test.ts', testCode);

      console.log('🔍 Testing Pattern Discovery Integration');

      // Step 2: Pattern Discovery
      const discoveryInput = PatternTestUtils.createPatternDiscoveryInput(['pattern-test.ts']);

      const discoveryResult = await E2EActorUtils.createAndRunActor(
        patternDiscoveryActor,
        discoveryInput,
        10000
      );

      // Validate discovery result structure
      expect(PatternTestUtils.validatePatternDiscoveryResult(discoveryResult)).toBe(true);
      expect(discoveryResult.patterns).toBeDefined();
      expect(Array.isArray(discoveryResult.patterns)).toBe(true);
      console.log(`   Discovered ${discoveryResult.patterns.length} patterns`);

      // Step 3: Pattern Learning Integration
      const learningInput = PatternTestUtils.createPatternLearningInput('learn');

      const learningResult = await E2EActorUtils.createAndRunActor(
        patternLearningActor,
        learningInput,
        10000
      );

      // Validate learning result structure
      expect(PatternTestUtils.validatePatternLearningResult(learningResult)).toBe(true);
      expect(learningResult.newPatterns).toBeDefined();
      expect(learningResult.insights).toBeDefined();
      expect(learningResult.recommendations).toBeDefined();
      console.log(`   Learning insights: ${learningResult.insights.length}`);
      console.log(`   Recommendations: ${learningResult.recommendations.length}`);

      // Step 4: Pattern Optimization
      const optimizeInput = PatternTestUtils.createPatternLearningInput('optimize');

      const optimizeResult = await E2EActorUtils.createAndRunActor(
        patternLearningActor,
        optimizeInput,
        10000
      );

      expect(PatternTestUtils.validatePatternLearningResult(optimizeResult)).toBe(true);
      console.log(`   Optimized patterns: ${optimizeResult.optimizedPatterns.length}`);

      console.log('✨ Pattern discovery and learning integration completed!');
    });

    test('should handle pattern evaluation and lifecycle management', async () => {
      console.log('📊 Testing Pattern Evaluation');

      // Test pattern evaluation
      const evaluateInput = PatternTestUtils.createPatternLearningInput('evaluate');

      const evaluateResult = await E2EActorUtils.testActorWithRetry(
        patternLearningActor,
        evaluateInput,
        3,
        10000
      );

      expect(PatternTestUtils.validatePatternLearningResult(evaluateResult)).toBe(true);
      expect(evaluateResult.metrics).toBeDefined();
      expect(typeof evaluateResult.metrics.averageConfidence).toBe('number');
      console.log(`   Average pattern confidence: ${evaluateResult.metrics.averageConfidence}`);

      console.log('✨ Pattern evaluation completed!');
    });
  });

  describe('Performance and Scalability Validation', () => {
    test('should handle large codebase transformation efficiently', async () => {
      console.log('⚡ Performance and Scalability Test');

      // Create multiple files with varying complexity
      const fileCount = 5; // Reduced for faster testing
      const files: string[] = [];

      for (let i = 0; i < fileCount; i++) {
        const complexity = Math.floor(Math.random() * 3) + 1; // 1-3 complexity levels
        let code = `
          // File ${i} - Complexity Level ${complexity}
          export class Module${i} {
            private data: any[] = [];
        `;

        // Add varying amounts of code based on complexity
        for (let j = 0; j < complexity * 2; j++) {
          code += `
            process${j}(input: any): any {
              var result = input;
              var processed = false;
              
              if (result != null && result != undefined) {
                for (var k = 0; k < 3; k++) {
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
        await testEnv.createTestFile(fileName, code);
        files.push(fileName);
      }

      const startTime = Date.now();

      // Execute pipeline on all files with enhanced timeouts
      const analysisInput = {
        files,
        patterns: [],
      };

      const analysis = await E2EActorUtils.createAndRunActor(
        analysisActor,
        analysisInput,
        20000 // Increased timeout for multiple files
      );

      const analysisTime = Date.now() - startTime;
      console.log(`   Analysis completed in ${analysisTime}ms`);

      // Transformation
      const transformationStart = Date.now();
      const patterns = E2ETestData.generateTestPatterns().slice(0, 1); // Use fewer patterns for performance

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns,
      };

      const transformation = await E2EActorUtils.testActorWithRetry(
        transformationActor,
        transformationInput,
        2,
        30000 // Increased timeout for multiple files
      );

      const transformationTime = Date.now() - transformationStart;
      console.log(`   Transformation completed in ${transformationTime}ms`);

      // Validation
      const validationStart = Date.now();
      const validationInput = {
        type: 'format' as const,
        files,
      };

      const validation = await E2EActorUtils.createAndRunActor(
        validationActor,
        validationInput,
        20000
      );

      const validationTime = Date.now() - validationStart;
      const totalTime = Date.now() - startTime;

      console.log(`   Validation completed in ${validationTime}ms`);
      console.log(`   Total pipeline time: ${totalTime}ms`);

      // Performance assertions (more lenient for CI environments)
      E2EAssertions.assertTransformationResult(transformation);
      expect(transformation.filesModified.length).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(90000); // Should complete within 90 seconds
      expect(analysisTime).toBeLessThan(30000); // Analysis should be reasonably fast
      expect(transformationTime).toBeLessThan(45000); // Transformation should be reasonable

      console.log('✨ Performance test completed successfully!');
    });
  });
});
