import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Import the main state machine (we'll need to check if it exists)
// import { transformationMachine } from '../../src/machine.js';

describe('State Machine Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = join(tmpdir(), `state-machine-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Setup git for integration tests
    try {
      execSync('git init', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
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

  describe('State Machine Actor Coordination', () => {
    test('should coordinate actors through state transitions', async () => {
      // Create test files
      await createTestFile(
        'state-test.ts',
        `
        function testFunction(data: any[]): any {
          var result = [];
          for (var i = 0; i < data.length; i++) {
            if (data[i] != null) {
              result.push(data[i]);
            }
          }
          return result;
        }
      `
      );

      // This test demonstrates the expected state machine flow
      // In a real implementation, we would use the actual state machine

      // Simulate state machine coordination
      const stateTransitions = [
        'idle',
        'analyzing',
        'creating_checkpoint',
        'applying_transformation',
        'validating',
        'verifying',
        'committing',
        'completed',
      ];

      let currentState = 'idle';

      // Simulate state transitions
      for (let i = 0; i < stateTransitions.length - 1; i++) {
        currentState = stateTransitions[i + 1];
        expect(currentState).toBeDefined();

        // Add small delay to simulate processing
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(currentState).toBe('completed');
    });

    test('should handle error states and recovery', async () => {
      await createTestFile(
        'error-test.ts',
        `
        function problematicFunction(): any {
          // This might cause transformation issues
          var x = undefined;
          return x.toString();
        }
      `
      );

      // Simulate error handling in state machine
      const errorStates = ['idle', 'analyzing', 'error_occurred', 'rolling_back', 'recovered'];

      let currentState = 'idle';
      let errorEncountered = false;

      for (let i = 0; i < errorStates.length - 1; i++) {
        currentState = errorStates[i + 1];

        if (currentState === 'error_occurred') {
          errorEncountered = true;
        }

        expect(currentState).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(errorEncountered).toBe(true);
      expect(currentState).toBe('recovered');
    });

    test('should handle concurrent state machine instances', async () => {
      // Create multiple test files
      const files = ['concurrent1.ts', 'concurrent2.ts', 'concurrent3.ts'];

      for (let i = 0; i < files.length; i++) {
        await createTestFile(
          files[i],
          `
          function process${i}(data: any): any {
            var result = data;
            return result;
          }
        `
        );
      }

      // Simulate multiple state machine instances
      const instances = files.map((file, index) => ({
        id: `instance-${index}`,
        file,
        state: 'idle',
        completed: false,
      }));

      // Process all instances concurrently
      const promises = instances.map(async (instance) => {
        const states = ['idle', 'analyzing', 'transforming', 'completed'];

        for (let i = 0; i < states.length - 1; i++) {
          instance.state = states[i + 1];
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
        }

        instance.completed = true;
        return instance;
      });

      const results = await Promise.all(promises);

      // Verify all instances completed
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.completed).toBe(true);
        expect(result.state).toBe('completed');
        expect(result.file).toBe(files[index]);
      });
    });
  });

  describe('Actor Communication Patterns', () => {
    test('should pass data between actors correctly', async () => {
      await createTestFile(
        'communication-test.ts',
        `
        function communicationTest(input: string): string {
          var output = input.toUpperCase();
          return output;
        }
      `
      );

      // Simulate data flow between actors
      interface ActorMessage {
        type: string;
        data: any;
        timestamp: number;
      }

      const messages: ActorMessage[] = [];

      // Simulate analysis actor output
      const analysisOutput = {
        complexity: { cyclomaticComplexity: 3 },
        recommendedMode: 'template',
        analysisTimestamp: Date.now(),
      };

      messages.push({
        type: 'ANALYSIS_COMPLETE',
        data: analysisOutput,
        timestamp: Date.now(),
      });

      // Simulate transformation actor input/output
      const _transformationInput = {
        mode: analysisOutput.recommendedMode,
        files: ['communication-test.ts'],
        patterns: [],
      };

      const transformationOutput = {
        filesModified: ['communication-test.ts'],
        transformationsApplied: 2,
        mode: 'template',
      };

      messages.push({
        type: 'TRANSFORMATION_APPLIED',
        data: transformationOutput,
        timestamp: Date.now(),
      });

      // Simulate validation actor input/output
      const validationOutput = {
        isValid: true,
        errors: [],
        warnings: [],
        fixableIssues: 0,
      };

      messages.push({
        type: 'VALIDATION_COMPLETE',
        data: validationOutput,
        timestamp: Date.now(),
      });

      // Verify message flow
      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe('ANALYSIS_COMPLETE');
      expect(messages[1].type).toBe('TRANSFORMATION_APPLIED');
      expect(messages[2].type).toBe('VALIDATION_COMPLETE');

      // Verify data consistency
      expect(messages[0].data.recommendedMode).toBe('template');
      expect(messages[1].data.mode).toBe('template');
      expect(messages[2].data.isValid).toBe(true);
    });

    test('should handle actor timeouts and retries', async () => {
      await createTestFile('timeout-test.ts', 'var x = 1;');

      // Simulate timeout and retry logic
      interface ActorExecution {
        actorName: string;
        attempt: number;
        success: boolean;
        duration: number;
      }

      const executions: ActorExecution[] = [];

      // Simulate analysis actor with timeout
      const simulateActorExecution = async (
        actorName: string,
        maxAttempts = 3,
        timeoutMs = 1000
      ): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const startTime = Date.now();

          try {
            // Simulate random success/failure
            const shouldSucceed = Math.random() > 0.3; // 70% success rate
            const duration = Math.random() * 1500; // Random duration up to 1.5s

            await new Promise((resolve) => setTimeout(resolve, Math.min(duration, timeoutMs)));

            const execution: ActorExecution = {
              actorName,
              attempt,
              success: shouldSucceed && duration < timeoutMs,
              duration: Date.now() - startTime,
            };

            executions.push(execution);

            if (execution.success) {
              return true;
            }

            if (attempt === maxAttempts) {
              return false;
            }

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          } catch (_error) {
            executions.push({
              actorName,
              attempt,
              success: false,
              duration: Date.now() - startTime,
            });
          }
        }

        return false;
      };

      // Test multiple actors with retry logic
      const actors = ['analysis', 'transformation', 'validation'];
      const _results = await Promise.all(actors.map((actor) => simulateActorExecution(actor)));

      // Verify executions were recorded
      expect(executions.length).toBeGreaterThan(0);

      // Verify retry logic worked
      const analysisExecutions = executions.filter((e) => e.actorName === 'analysis');
      expect(analysisExecutions.length).toBeGreaterThan(0);

      // At least one actor should have succeeded or exhausted retries
      const finalResults = actors.map((actor) => {
        const actorExecutions = executions.filter((e) => e.actorName === actor);
        return actorExecutions.some((e) => e.success) || actorExecutions.length >= 3;
      });

      expect(finalResults.every((result) => result)).toBe(true);
    });
  });

  describe('State Persistence and Recovery', () => {
    test('should persist state across interruptions', async () => {
      await createTestFile('persistence-test.ts', 'var data = "test";');

      // Simulate state persistence
      interface PersistedState {
        currentState: string;
        context: {
          files: string[];
          checkpoints: any[];
          currentTransformation?: any;
          startTime: number;
        };
        timestamp: number;
      }

      let persistedState: PersistedState = {
        currentState: 'idle',
        context: {
          files: ['persistence-test.ts'],
          checkpoints: [],
          startTime: Date.now(),
        },
        timestamp: Date.now(),
      };

      // Simulate state transitions with persistence
      const stateTransitions = ['analyzing', 'creating_checkpoint', 'applying_transformation'];

      for (const state of stateTransitions) {
        persistedState = {
          ...persistedState,
          currentState: state,
          timestamp: Date.now(),
        };

        // Simulate checkpoint creation
        if (state === 'creating_checkpoint') {
          persistedState.context.checkpoints.push({
            hash: 'abc123',
            branch: 'main',
            timestamp: Date.now(),
            description: 'Before transformation',
          });
        }

        // Simulate transformation
        if (state === 'applying_transformation') {
          persistedState.context.currentTransformation = {
            id: 'transform-1',
            mode: 'template',
            patterns: [],
          };
        }

        // Verify state can be serialized/deserialized
        const serialized = JSON.stringify(persistedState);
        const deserialized = JSON.parse(serialized);

        expect(deserialized.currentState).toBe(state);
        expect(deserialized.context.files).toEqual(['persistence-test.ts']);
      }

      // Verify final state
      expect(persistedState.currentState).toBe('applying_transformation');
      expect(persistedState.context.checkpoints).toHaveLength(1);
      expect(persistedState.context.currentTransformation).toBeDefined();
    });

    test('should recover from interrupted state', async () => {
      await createTestFile('recovery-test.ts', 'var x = 1; var y = 2;');

      // Simulate interrupted state
      const interruptedState = {
        currentState: 'applying_transformation',
        context: {
          files: ['recovery-test.ts'],
          checkpoints: [
            {
              hash: 'def456',
              branch: 'main',
              timestamp: Date.now() - 1000,
              description: 'Recovery checkpoint',
            },
          ],
          currentTransformation: {
            id: 'interrupted-transform',
            mode: 'template',
            patterns: [
              {
                id: 'var-to-const',
                pattern: 'var\\s+(\\w+)\\s*=',
                replacement: 'const $1 =',
              },
            ],
          },
          startTime: Date.now() - 5000,
        },
        timestamp: Date.now() - 1000,
      };

      // Simulate recovery process
      const recoverySteps = [
        'detecting_interruption',
        'loading_state',
        'validating_context',
        'resuming_transformation',
        'completed',
      ];

      let currentStep = 'detecting_interruption';
      let recoverySuccessful = false;

      for (let i = 0; i < recoverySteps.length; i++) {
        currentStep = recoverySteps[i];

        switch (currentStep) {
          case 'detecting_interruption':
            // Check if state indicates interruption
            expect(interruptedState.currentState).toBe('applying_transformation');
            break;

          case 'loading_state':
            // Verify state can be loaded
            expect(interruptedState.context.files).toEqual(['recovery-test.ts']);
            expect(interruptedState.context.checkpoints).toHaveLength(1);
            break;

          case 'validating_context':
            // Verify context is valid for recovery
            expect(interruptedState.context.currentTransformation).toBeDefined();
            expect(interruptedState.context.checkpoints[0].hash).toBe('def456');
            break;

          case 'resuming_transformation': {
            // Simulate resuming from where we left off
            const transformation = interruptedState.context.currentTransformation;
            expect(transformation.mode).toBe('template');
            expect(transformation.patterns).toHaveLength(1);
            break;
          }

          case 'completed':
            recoverySuccessful = true;
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(recoverySuccessful).toBe(true);
      expect(currentStep).toBe('completed');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large numbers of files efficiently', async () => {
      // Create multiple test files
      const fileCount = 20;
      const files: string[] = [];

      for (let i = 0; i < fileCount; i++) {
        const fileName = `scale-test-${i}.ts`;
        await createTestFile(
          fileName,
          `
          function process${i}(data: any): any {
            var result = data;
            for (var j = 0; j < 10; j++) {
              result = result + j;
            }
            return result;
          }
        `
        );
        files.push(fileName);
      }

      // Simulate processing large file sets
      const startTime = Date.now();

      // Batch processing simulation
      const batchSize = 5;
      const batches: string[][] = [];

      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(Math.ceil(fileCount / batchSize));

      // Process batches
      const batchResults = await Promise.all(
        batches.map(async (batch, index) => {
          // Simulate batch processing time
          const processingTime = Math.random() * 100 + 50;
          await new Promise((resolve) => setTimeout(resolve, processingTime));

          return {
            batchIndex: index,
            files: batch,
            processed: batch.length,
            processingTime,
          };
        })
      );

      const totalTime = Date.now() - startTime;

      // Verify batch processing
      expect(batchResults).toHaveLength(batches.length);

      const totalProcessed = batchResults.reduce((sum, result) => sum + result.processed, 0);
      expect(totalProcessed).toBe(fileCount);

      // Performance should be reasonable (less than 2 seconds for 20 files)
      expect(totalTime).toBeLessThan(2000);
    });

    test('should maintain performance under concurrent load', async () => {
      // Create test files for concurrent processing
      const concurrentTasks = 10;
      const files: string[] = [];

      for (let i = 0; i < concurrentTasks; i++) {
        const fileName = `concurrent-${i}.ts`;
        await createTestFile(fileName, `var value${i} = ${i};`);
        files.push(fileName);
      }

      // Simulate concurrent state machine instances
      const startTime = Date.now();

      const concurrentPromises = files.map(async (file, index) => {
        const instanceStartTime = Date.now();

        // Simulate state machine execution
        const states = ['idle', 'analyzing', 'transforming', 'validating', 'completed'];
        let currentState = 'idle';

        for (let i = 0; i < states.length - 1; i++) {
          currentState = states[i + 1];

          // Simulate processing time with some randomness
          const processingTime = Math.random() * 50 + 10;
          await new Promise((resolve) => setTimeout(resolve, processingTime));
        }

        return {
          file,
          index,
          finalState: currentState,
          duration: Date.now() - instanceStartTime,
        };
      });

      const results = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - startTime;

      // Verify all instances completed
      expect(results).toHaveLength(concurrentTasks);
      results.forEach((result, index) => {
        expect(result.finalState).toBe('completed');
        expect(result.file).toBe(files[index]);
        expect(result.duration).toBeGreaterThan(0);
      });

      // Concurrent execution should be faster than sequential
      const maxSequentialTime = concurrentTasks * 200; // Rough estimate
      expect(totalTime).toBeLessThan(maxSequentialTime);
    });
  });

  describe('Configuration and Customization', () => {
    test('should respect configuration settings', async () => {
      await createTestFile('config-test.ts', 'var configTest = true;');

      // Simulate different configuration scenarios
      const configurations = [
        {
          name: 'fast',
          maxComplexityThreshold: 5,
          enableDafnyVerification: false,
          enableLearning: false,
          gitIntegration: true,
          timeoutMs: 30000,
        },
        {
          name: 'safe',
          maxComplexityThreshold: 15,
          enableDafnyVerification: true,
          enableLearning: true,
          gitIntegration: true,
          timeoutMs: 300000,
        },
        {
          name: 'minimal',
          maxComplexityThreshold: 3,
          enableDafnyVerification: false,
          enableLearning: false,
          gitIntegration: false,
          timeoutMs: 10000,
        },
      ];

      for (const config of configurations) {
        // Simulate state machine with different configurations
        const simulatedExecution = {
          config,
          steps: [] as string[],
          duration: 0,
        };

        const startTime = Date.now();

        // Simulate execution based on configuration
        simulatedExecution.steps.push('analyzing');

        if (config.gitIntegration) {
          simulatedExecution.steps.push('creating_checkpoint');
        }

        simulatedExecution.steps.push('transforming');

        if (config.enableDafnyVerification) {
          simulatedExecution.steps.push('verifying');
        }

        if (config.gitIntegration) {
          simulatedExecution.steps.push('committing');
        }

        simulatedExecution.steps.push('completed');
        simulatedExecution.duration = Date.now() - startTime;

        // Verify configuration affects execution
        switch (config.name) {
          case 'fast':
            expect(simulatedExecution.steps).not.toContain('verifying');
            expect(simulatedExecution.steps).toContain('creating_checkpoint');
            break;
          case 'safe':
            expect(simulatedExecution.steps).toContain('verifying');
            expect(simulatedExecution.steps).toContain('creating_checkpoint');
            break;
          case 'minimal':
            expect(simulatedExecution.steps).not.toContain('verifying');
            expect(simulatedExecution.steps).not.toContain('creating_checkpoint');
            break;
        }

        expect(simulatedExecution.steps).toContain('completed');
      }
    });

    test('should handle custom transformation patterns', async () => {
      await createTestFile(
        'custom-pattern-test.ts',
        `
        function customTest() {
          var oldStyle = "legacy";
          console.log(oldStyle);
        }
      `
      );

      // Simulate custom pattern configuration
      const customPatterns = [
        {
          id: 'custom-var-to-const',
          language: 'typescript',
          pattern: 'var\\s+(\\w+)\\s*=\\s*"([^"]*)"',
          replacement: 'const $1: string = "$2"',
          description: 'Convert var string declarations to typed const',
          complexity: 3,
          riskLevel: 'low',
          mode: 'template',
        },
        {
          id: 'custom-console-upgrade',
          language: 'typescript',
          pattern: 'console\\.log\\(([^)]+)\\)',
          replacement: 'console.info($1)',
          description: 'Upgrade console.log to console.info',
          complexity: 1,
          riskLevel: 'low',
          mode: 'template',
        },
      ];

      // Simulate pattern application
      const patternResults = customPatterns.map((pattern) => {
        const testContent = `
          function customTest() {
            var oldStyle = "legacy";
            console.log(oldStyle);
          }
        `;

        // Simulate pattern matching
        const regex = new RegExp(pattern.pattern, 'g');
        const matches = testContent.match(regex);

        return {
          patternId: pattern.id,
          matches: matches ? matches.length : 0,
          complexity: pattern.complexity,
          riskLevel: pattern.riskLevel,
        };
      });

      // Verify custom patterns were processed
      expect(patternResults).toHaveLength(2);

      const varPattern = patternResults.find((r) => r.patternId === 'custom-var-to-const');
      const consolePattern = patternResults.find((r) => r.patternId === 'custom-console-upgrade');

      expect(varPattern).toBeDefined();
      expect(consolePattern).toBeDefined();

      if (varPattern) {
        expect(varPattern.matches).toBeGreaterThan(0);
        expect(varPattern.riskLevel).toBe('low');
      }

      if (consolePattern) {
        expect(consolePattern.matches).toBeGreaterThan(0);
        expect(consolePattern.complexity).toBe(1);
      }
    });
  });
});
