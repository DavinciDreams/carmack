import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createActor, waitFor } from 'xstate';
import { analysisActor } from '../../src/actors/analysis.js';
import { transformationActor } from '../../src/actors/transformation.js';
import type { AstPattern } from '../../src/types.js';

describe('Scalability Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `scalability-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
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

  function generateLargeCodebase(fileCount: number, methodsPerFile: number): Promise<string[]> {
    const promises: Promise<string>[] = [];

    for (let i = 0; i < fileCount; i++) {
      let code = `
        // Large codebase file ${i}
        export class LargeModule${i} {
          private data: any[] = [];
          private cache: Map<string, any> = new Map();
      `;

      // Add many methods with patterns to transform
      for (let j = 0; j < methodsPerFile; j++) {
        code += `
          method${j}(input: any): any {
            var result = input;
            var processed = false;
            var temp = null;
            
            if (result != null && result != undefined) {
              for (var k = 0; k < 5; k++) {
                var item = result[k];
                if (item != null) {
                  temp = item;
                  processed = true;
                }
              }
            }
            
            var output = {
              result: temp,
              processed: processed,
              timestamp: Date.now()
            };
            
            return output;
          }
        `;
      }

      code += `
        }
      `;

      const fileName = `large-module-${i}.ts`;
      promises.push(createTestFile(fileName, code).then(() => fileName));
    }

    return Promise.all(promises);
  }

  const scalabilityPatterns: AstPattern[] = [
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

  describe('Large File Processing', () => {
    test('should handle very large files efficiently', async () => {
      console.log('🚀 Testing very large file processing');

      // Generate a very large file (100 methods)
      const files = await generateLargeCodebase(1, 100);
      const startTime = Date.now();

      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 30000 }
      );

      const analysisTime = Date.now() - startTime;
      const analysis = analysisResult.output!;

      expect(analysis.complexity).toBeDefined();
      expect(analysisTime).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`   Very large file analysis: ${analysisTime}ms`);
      console.log(`   Complexity: ${analysis.complexity?.cyclomaticComplexity}`);
      console.log(
        `   File size: ~${Math.round((await readFile(files[0], 'utf-8')).length / 1024)}KB`
      );
    });

    test('should transform very large files within reasonable time', async () => {
      console.log('🔄 Testing very large file transformation');

      // Generate a very large file (80 methods)
      const files = await generateLargeCodebase(1, 80);
      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns: scalabilityPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 45000 }
      );

      const transformationTime = Date.now() - startTime;
      const transformation = transformationResult.output!;

      expect(transformation).toBeDefined();
      expect(transformationTime).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`   Very large file transformation: ${transformationTime}ms`);
      console.log(`   Transformations applied: ${transformation.transformationsApplied || 0}`);
    });
  });

  describe('Multiple File Processing', () => {
    test('should handle moderate number of files efficiently', async () => {
      console.log('📁 Testing moderate multi-file processing');

      // Generate 10 files with 10 methods each
      const files = await generateLargeCodebase(10, 10);
      const startTime = Date.now();

      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 30000 }
      );

      const analysisTime = Date.now() - startTime;
      const analysis = analysisResult.output!;

      expect(analysis.complexity).toBeDefined();
      expect(analysisTime).toBeLessThan(20000); // Should complete within 20 seconds

      console.log(`   Multi-file analysis (${files.length} files): ${analysisTime}ms`);
      console.log(`   Average per file: ${Math.round(analysisTime / files.length)}ms`);
      console.log(`   Total complexity: ${analysis.complexity?.cyclomaticComplexity}`);
    });

    test('should transform multiple files efficiently', async () => {
      console.log('🔄 Testing multi-file transformation');

      // Generate 8 files with 8 methods each
      const files = await generateLargeCodebase(8, 8);
      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns: scalabilityPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 60000 }
      );

      const transformationTime = Date.now() - startTime;
      const transformation = transformationResult.output!;

      expect(transformation).toBeDefined();
      expect(transformationTime).toBeLessThan(45000); // Should complete within 45 seconds

      console.log(`   Multi-file transformation (${files.length} files): ${transformationTime}ms`);
      console.log(`   Average per file: ${Math.round(transformationTime / files.length)}ms`);
      console.log(`   Total transformations: ${transformation.transformationsApplied || 0}`);
    });

    test('should handle large number of small files', async () => {
      console.log('📄 Testing many small files');

      // Generate 20 files with 3 methods each (many small files)
      const files = await generateLargeCodebase(20, 3);
      const startTime = Date.now();

      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 25000 }
      );

      const analysisTime = Date.now() - startTime;
      const analysis = analysisResult.output!;

      expect(analysis.complexity).toBeDefined();
      expect(analysisTime).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`   Many small files analysis (${files.length} files): ${analysisTime}ms`);
      console.log(`   Average per file: ${Math.round(analysisTime / files.length)}ms`);
      console.log(`   Files per second: ${Math.round(files.length / (analysisTime / 1000))}`);
    });
  });

  describe('Memory Scalability', () => {
    test('should maintain reasonable memory usage with large codebases', async () => {
      console.log('💾 Testing memory scalability');

      const initialMemory = process.memoryUsage();

      // Generate a moderately large codebase
      const files = await generateLargeCodebase(6, 15);

      const afterGenerationMemory = process.memoryUsage();
      const generationMemoryDelta = afterGenerationMemory.heapUsed - initialMemory.heapUsed;

      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns: scalabilityPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 40000 }
      );

      const finalMemory = process.memoryUsage();
      const processingMemoryDelta = finalMemory.heapUsed - afterGenerationMemory.heapUsed;
      const totalMemoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      const duration = Date.now() - startTime;
      const transformation = transformationResult.output!;

      expect(transformation).toBeDefined();
      expect(totalMemoryDelta).toBeLessThan(200 * 1024 * 1024); // Should use less than 200MB total
      expect(processingMemoryDelta).toBeLessThan(100 * 1024 * 1024); // Processing should use less than 100MB

      console.log(`   Processing time: ${duration}ms`);
      console.log(`   Generation memory: ${Math.round(generationMemoryDelta / 1024 / 1024)}MB`);
      console.log(`   Processing memory: ${Math.round(processingMemoryDelta / 1024 / 1024)}MB`);
      console.log(`   Total memory delta: ${Math.round(totalMemoryDelta / 1024 / 1024)}MB`);
      console.log(`   Peak heap: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   Files processed: ${files.length}`);
    });
  });

  describe('Pattern Complexity Scalability', () => {
    test('should handle many transformation patterns efficiently', async () => {
      console.log('🎯 Testing pattern complexity scalability');

      // Create many patterns to test pattern matching scalability
      const manyPatterns: AstPattern[] = [
        ...scalabilityPatterns,
        {
          id: 'null-check',
          language: 'typescript',
          pattern: '([^!])\\s*==\\s*null',
          replacement: '$1 === null',
          description: 'Strict null check',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
        {
          id: 'undefined-check',
          language: 'typescript',
          pattern: '([^!])\\s*==\\s*undefined',
          replacement: '$1 === undefined',
          description: 'Strict undefined check',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
        {
          id: 'let-to-const',
          language: 'typescript',
          pattern: 'let\\s+(\\w+)\\s*=\\s*([^;]+);(?!\\s*\\1\\s*=)',
          replacement: 'const $1 = $2;',
          description: 'Convert let to const when not reassigned',
          complexity: 3,
          riskLevel: 'medium',
          mode: 'template',
        },
      ];

      // Generate files with patterns that match many of the above
      const files = await generateLargeCodebase(4, 12);
      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns: manyPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 35000 }
      );

      const transformationTime = Date.now() - startTime;
      const transformation = transformationResult.output!;

      expect(transformation).toBeDefined();
      expect(transformationTime).toBeLessThan(25000); // Should complete within 25 seconds

      console.log(`   Many patterns transformation: ${transformationTime}ms`);
      console.log(`   Patterns used: ${manyPatterns.length}`);
      console.log(`   Files processed: ${files.length}`);
      console.log(`   Total transformations: ${transformation.transformationsApplied || 0}`);
      console.log(
        `   Avg time per pattern per file: ${Math.round(transformationTime / (manyPatterns.length * files.length))}ms`
      );
    });
  });

  describe('Stress Testing', () => {
    test('should handle stress conditions gracefully', async () => {
      console.log('⚡ Running stress test');

      // Create a challenging scenario: moderate number of files with many methods
      const files = await generateLargeCodebase(5, 25);

      const startTime = Date.now();
      const initialMemory = process.memoryUsage();

      // Run analysis and transformation in sequence to stress test
      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const analysisResult = await waitFor(
        analysisActorInstance,
        (state) => state.status === 'done',
        { timeout: 20000 }
      );

      const analysisTime = Date.now() - startTime;
      const analysis = analysisResult.output!;

      // Now run transformation
      const transformationStart = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns: scalabilityPatterns,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const transformationResult = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 40000 }
      );

      const transformationTime = Date.now() - transformationStart;
      const totalTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      const transformation = transformationResult.output!;

      expect(analysis.complexity).toBeDefined();
      expect(transformation).toBeDefined();
      expect(totalTime).toBeLessThan(50000); // Should complete within 50 seconds
      expect(memoryDelta).toBeLessThan(150 * 1024 * 1024); // Should use less than 150MB

      console.log('   Stress test completed successfully!');
      console.log(`   Analysis time: ${analysisTime}ms`);
      console.log(`   Transformation time: ${transformationTime}ms`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Memory used: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
      console.log(`   Files processed: ${files.length}`);
      console.log(`   Complexity analyzed: ${analysis.complexity?.cyclomaticComplexity}`);
      console.log(`   Transformations applied: ${transformation.transformationsApplied || 0}`);
    });
  });
});
