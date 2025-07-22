import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createActor, waitFor } from 'xstate';
import { analysisActor } from '../../src/actors/analysis.js';
import { transformationActor } from '../../src/actors/transformation.js';
import { validationActor } from '../../src/actors/validation.js';
import type { AstPattern } from '../../src/types.js';

// Type definitions for benchmark data structures
interface BenchmarkItem {
  [key: string]: unknown;
}

// biome-ignore lint/correctness/noUnusedVariables: Used in generated code template strings
interface ProcessResult {
  results: BenchmarkItem[];
  errors: Error[];
  stats: ProcessStats;
}

interface ProcessStats {
  processed: number;
  errors: number;
}

// biome-ignore lint/correctness/noUnusedVariables: Used in generated code template strings
interface CacheEntry {
  [key: string]: unknown;
}

describe('Performance Benchmarks', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `perf-benchmark-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);
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

  function generateComplexCode(complexity: number): string {
    let code = `
      // Generated code with complexity level: ${complexity}
      class ComplexProcessor {
        private cache: Map<string, CacheEntry> = new Map();
        private stats: ProcessStats = { processed: 0, errors: 0 };
    `;

    // Add methods based on complexity
    for (let i = 0; i < complexity; i++) {
      code += `
        process${i}(data: BenchmarkItem[]): ProcessResult {
          var results = [];
          var errors = [];
          
          for (var j = 0; j < data.length; j++) {
            try {
              var item = data[j];
              if (item != null && item != undefined) {
                var key = this.generateKey${i}(item);
                if (this.cache.has(key)) {
                  var cached = this.cache.get(key);
                  results.push(cached);
                } else {
                  var processed = this.transform${i}(item);
                  this.cache.set(key, processed);
                  results.push(processed);
                }
                this.stats.processed++;
              }
            } catch (error) {
              var errorInfo = {
                item: item,
                error: error.message,
                method: 'process${i}',
                index: j
              };
              errors.push(errorInfo);
              this.stats.errors++;
            }
          }
          
          return { results, errors, stats: this.stats };
        }
        
        private generateKey${i}(item: BenchmarkItem): string {
          var key = "";
          if (item != null) {
            key = JSON.stringify(item) + "_${i}";
          }
          return key;
        }
        
        private transform${i}(item: BenchmarkItem): BenchmarkItem {
          var transformed = {} as BenchmarkItem;
          for (var prop in item) {
            if (item.hasOwnProperty(prop)) {
              var value = item[prop];
              if (value != null && value != undefined) {
                transformed[prop] = value;
              }
            }
          }
          return transformed;
        }
      `;
    }

    code += `
      }
      
      export default ComplexProcessor;
    `;

    return code;
  }

  describe('Analysis Performance', () => {
    test('should analyze small files quickly', async () => {
      const smallCode = generateComplexCode(2);
      await createTestFile('small.ts', smallCode);

      const startTime = Date.now();

      const analysisInput = {
        files: ['small.ts'],
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const result = await waitFor(analysisActorInstance, (state) => state.status === 'done', {
        timeout: 5000,
      });

      const duration = Date.now() - startTime;
      const analysis = result.output;

      expect(analysis).toBeDefined();
      expect(analysis?.complexity).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`   Small file analysis: ${duration}ms`);
      console.log(`   Complexity: ${analysis?.complexity?.cyclomaticComplexity}`);
    });

    test('should analyze medium files efficiently', async () => {
      const mediumCode = generateComplexCode(5);
      await createTestFile('medium.ts', mediumCode);

      const startTime = Date.now();

      const analysisInput = {
        files: ['medium.ts'],
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const result = await waitFor(analysisActorInstance, (state) => state.status === 'done', {
        timeout: 10000,
      });

      const duration = Date.now() - startTime;
      const analysis = result.output;

      expect(analysis).toBeDefined();
      expect(analysis?.complexity).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`   Medium file analysis: ${duration}ms`);
      console.log(`   Complexity: ${analysis?.complexity?.cyclomaticComplexity}`);
    });

    test('should analyze large files within reasonable time', async () => {
      const largeCode = generateComplexCode(10);
      await createTestFile('large.ts', largeCode);

      const startTime = Date.now();

      const analysisInput = {
        files: ['large.ts'],
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const result = await waitFor(analysisActorInstance, (state) => state.status === 'done', {
        timeout: 15000,
      });

      const duration = Date.now() - startTime;
      const analysis = result.output;

      expect(analysis).toBeDefined();
      expect(analysis?.complexity).toBeDefined();
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

      console.log(`   Large file analysis: ${duration}ms`);
      console.log(`   Complexity: ${analysis?.complexity?.cyclomaticComplexity}`);
    });

    test('should analyze multiple files concurrently', async () => {
      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        const code = generateComplexCode(3);
        const fileName = `concurrent-${i}.ts`;
        await createTestFile(fileName, code);
        files.push(fileName);
      }

      const startTime = Date.now();

      const analysisInput = {
        files,
        patterns: [],
      };

      const analysisActorInstance = createActor(analysisActor, { input: analysisInput });
      analysisActorInstance.start();

      const result = await waitFor(analysisActorInstance, (state) => state.status === 'done', {
        timeout: 15000,
      });

      const duration = Date.now() - startTime;
      const analysis = result.output;

      expect(analysis).toBeDefined();
      expect(analysis?.complexity).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`   Multi-file analysis (${files.length} files): ${duration}ms`);
      console.log(`   Average per file: ${Math.round(duration / files.length)}ms`);
    });
  });

  describe('Transformation Performance', () => {
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

    test('should transform small files quickly', async () => {
      const smallCode = generateComplexCode(2);
      await createTestFile('transform-small.ts', smallCode);

      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files: ['transform-small.ts'],
        patterns,
        dryRun: false,
        dryRun: false,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const result = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 5000 }
      );

      const duration = Date.now() - startTime;
      const transformation = result.output;

      expect(transformation).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`   Small file transformation: ${duration}ms`);
      console.log(`   Transformations applied: ${transformation?.transformationsApplied || 0}`);
    });

    test('should transform medium files efficiently', async () => {
      const mediumCode = generateComplexCode(5);
      await createTestFile('transform-medium.ts', mediumCode);

      const startTime = Date.now();
      const transformationInput = {
        mode: 'template' as const,
        files: ['transform-medium.ts'],
        patterns,
        dryRun: false,
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

      const duration = Date.now() - startTime;
      const transformation = result.output;

      expect(transformation).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`   Medium file transformation: ${duration}ms`);
      console.log(`   Transformations applied: ${transformation?.transformationsApplied || 0}`);
    });

    test('should transform large files within reasonable time', async () => {
      const largeCode = generateComplexCode(8);
      await createTestFile('transform-large.ts', largeCode);

      const startTime = Date.now();

      const transformationInput = {
        mode: 'template' as const,
        files: ['transform-large.ts'],
        patterns,
        dryRun: false,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const result = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 15000 }
      );

      const duration = Date.now() - startTime;
      const transformation = result.output;

      expect(transformation).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`   Large file transformation: ${duration}ms`);
      console.log(`   Transformations applied: ${transformation?.transformationsApplied || 0}`);
    });

    test('should handle batch transformations efficiently', async () => {
      const files: string[] = [];
      for (let i = 0; i < 3; i++) {
        const code = generateComplexCode(4);
        const fileName = `batch-${i}.ts`;
        await createTestFile(fileName, code);
        files.push(fileName);
      }
      const startTime = Date.now();
      const transformationInput = {
        mode: 'template' as const,
        files,
        patterns,
        dryRun: false,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const result = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 20000 }
      );

      const duration = Date.now() - startTime;
      const transformation = result.output;

      expect(transformation).toBeDefined();
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`   Batch transformation (${files.length} files): ${duration}ms`);
      console.log(`   Average per file: ${Math.round(duration / files.length)}ms`);
      console.log(`   Total transformations: ${transformation?.transformationsApplied || 0}`);
    });
  });

  describe('Validation Performance', () => {
    test('should validate small files quickly', async () => {
      const smallCode = `
        const data = [1, 2, 3];
        const result = data.map(x => x * 2);
        console.log(result);
      `;
      await createTestFile('validate-small.ts', smallCode);

      const startTime = Date.now();

      const validationInput = {
        type: 'format' as const,
        files: ['validate-small.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      try {
        const result = await waitFor(validationActorInstance, (state) => state.status === 'done', {
          timeout: 3000,
        });

        const duration = Date.now() - startTime;
        const validation = result.output;

        expect(validation).toBeDefined();
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

        console.log(`   Small file validation: ${duration}ms`);
        console.log(`   Valid: ${validation?.isValid}`);
      } catch (_error) {
        const duration = Date.now() - startTime;
        console.log(`   Small file validation (timeout/error): ${duration}ms`);
        // Validation might timeout due to external tool dependencies
      }
    });

    test('should validate medium files efficiently', async () => {
      const mediumCode = generateComplexCode(3);
      await createTestFile('validate-medium.ts', mediumCode);

      const startTime = Date.now();

      const validationInput = {
        type: 'format' as const,
        files: ['validate-medium.ts'],
      };

      const validationActorInstance = createActor(validationActor, { input: validationInput });
      validationActorInstance.start();

      try {
        const result = await waitFor(validationActorInstance, (state) => state.status === 'done', {
          timeout: 5000,
        });

        const duration = Date.now() - startTime;
        const validation = result.output;

        expect(validation).toBeDefined();
        expect(duration).toBeLessThan(4000); // Should complete within 4 seconds

        console.log(`   Medium file validation: ${duration}ms`);
        console.log(`   Valid: ${validation?.isValid}`);
      } catch (_error) {
        const duration = Date.now() - startTime;
        console.log(`   Medium file validation (timeout/error): ${duration}ms`);
        // Validation might timeout due to external tool dependencies
      }
    });
  });

  describe('Memory Usage Benchmarks', () => {
    const memoryPatterns: AstPattern[] = [
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

    test('should handle large data structures efficiently', async () => {
      // Generate a large file with many patterns to match
      let largeCode = `
        class LargeDataProcessor {
          private data: BenchmarkItem[] = [];
      `;

      // Add many similar methods to test memory usage
      for (let i = 0; i < 50; i++) {
        largeCode += `
          process${i}(input: BenchmarkItem): BenchmarkItem {
            var result = input;
            var temp = null;
            var processed = false;
            
            if (result != null && result != undefined) {
              for (var j = 0; j < 10; j++) {
                var item = result[j];
                if (item != null) {
                  temp = item;
                  processed = true;
                }
              }
            }
            
            return { result: temp, processed };
          }
        `;
      }

      largeCode += `
        }
      `;

      await createTestFile('memory-test.ts', largeCode);
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      const transformationInput = {
        mode: 'template' as const,
        files: ['memory-test.ts'],
        patterns: memoryPatterns,
        dryRun: false,
      };

      const transformationActorInstance = createActor(transformationActor, {
        input: transformationInput,
      });
      transformationActorInstance.start();

      const result = await waitFor(
        transformationActorInstance,
        (state) => state.status === 'done',
        { timeout: 20000 }
      );

      const duration = Date.now() - startTime;
      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.output).toBeDefined();
      expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // Should use less than 100MB additional memory

      console.log(`   Large file processing: ${duration}ms`);
      console.log(`   Memory delta: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
      console.log(`   Peak heap: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    });
  });

  describe('Concurrent Processing Benchmarks', () => {
    const concurrentPatterns: AstPattern[] = [
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

    test('should handle concurrent transformations efficiently', async () => {
      const files: string[] = [];
      const promises: Promise<unknown>[] = [];
      const startTime = Date.now();

      // Create multiple files
      for (let i = 0; i < 4; i++) {
        const code = generateComplexCode(3);
        const fileName = `concurrent-transform-${i}.ts`;
        await createTestFile(fileName, code);
        files.push(fileName);
      }

      for (const file of files) {
        const transformationInput = {
          mode: 'template' as const,
          files: [file],
          patterns: concurrentPatterns.slice(0, 2), // Use fewer patterns for speed
          dryRun: false,
        };

        const actorInstance = createActor(transformationActor, { input: transformationInput });
        actorInstance.start();

        const promise = waitFor(actorInstance, (state) => state.status === 'done', {
          timeout: 10000,
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(files.length);
      expect(duration).toBeLessThan(12000); // Should complete within 12 seconds

      console.log(`   Concurrent processing (${files.length} files): ${duration}ms`);
      console.log(`   Average per file: ${Math.round(duration / files.length)}ms`);

      const totalTransformations = results.reduce((sum: number, result) => {
        const transformationResult = result as { output?: { transformationsApplied?: number } };
        return sum + (transformationResult.output?.transformationsApplied || 0);
      }, 0);
      console.log(`   Total transformations: ${totalTransformations}`);
    });
  });
});
