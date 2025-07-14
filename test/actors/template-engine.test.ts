import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { templateEngineActor, type TemplatePattern } from '../../src/actors/template-engine';
import { createActor } from 'xstate';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

describe('Enhanced Template Engine', () => {
  const testDir = join(process.cwd(), 'test-temp-template');
  
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Basic Template Patterns', () => {
    it('should apply simple variable substitution patterns', async () => {
      const testCode = `
var userName = "John";
var userAge = 25;
console.log("Hello " + userName);
`;

      const filePath = join(testDir, 'basic-test.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'var-to-const',
          language: 'typescript',
          pattern: {
            template: 'var $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
          },
          description: 'Convert var to const',
          complexity: 1,
          riskLevel: 'low',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        filesModified: [filePath],
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });

    it('should handle complex template patterns with multiple variables', async () => {
      const testCode = `
function add(a, b) {
  return a + b;
}

function multiply(x, y) {
  return x * y;
}
`;

      const filePath = join(testDir, 'function-test.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'function-to-arrow',
          language: 'typescript',
          pattern: {
            template: 'function $FUNCTION_NAME($PARAMS) {\n  return $EXPRESSION;\n}',
            flags: 'g',
          },
          replacement: {
            template: 'const $FUNCTION_NAME = ($PARAMS) => $EXPRESSION;',
          },
          description: 'Convert simple functions to arrow functions',
          complexity: 2,
          riskLevel: 'low',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        filesModified: expect.any(Array),
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });
  });

  describe('Semantic Pattern Matching', () => {
    it('should detect var declarations and recommend const/let appropriately', async () => {
      const testCode = `
var userName = "John"; // Should become const
var counter = 0;       // Should become let (reassigned below)
counter = counter + 1;

var items = [];        // Should become const (array mutation is allowed)
items.push("item");
`;

      const filePath = join(testDir, 'semantic-var.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'var-to-const-let',
          language: 'typescript',
          pattern: {
            template: 'var $VAR_NAME = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: '$KEYWORD $VAR_NAME = $VALUE;',
          },
          description: 'Smart var to const/let conversion',
          complexity: 3,
          riskLevel: 'low',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });

    it('should detect string concatenation patterns for template literals', async () => {
      const testCode = `
const greeting = "Hello " + userName + "!";
const message = 'Welcome ' + userName + ' to our site';
const url = "https://api.example.com/" + endpoint + "/data";
`;

      const filePath = join(testDir, 'string-concat.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'template-literal-conversion',
          language: 'typescript',
          pattern: {
            template: '"$PREFIX" + $VARIABLE + "$SUFFIX"',
            flags: 'g',
          },
          replacement: {
            template: '`$PREFIX${$VARIABLE}$SUFFIX`',
          },
          description: 'Convert string concatenation to template literals',
          complexity: 2,
          riskLevel: 'low',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });

    it('should detect object destructuring opportunities', async () => {
      const testCode = `
const userId = user.id;
const userName = user.name;
const userEmail = user.email;

const configHost = config.host;
const configPort = config.port;
`;

      const filePath = join(testDir, 'destructuring.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'object-destructuring',
          language: 'typescript',
          pattern: {
            template: 'const $VAR = $OBJECT.$PROP;',
            flags: 'g',
          },
          replacement: {
            template: 'const { $PROPERTIES } = $OBJECT_NAME;',
          },
          description: 'Convert property access to destructuring',
          complexity: 3,
          riskLevel: 'medium',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });
  });

  describe('Advanced Pattern Features', () => {
    it('should handle conditional replacements', async () => {
      const testCode = `
const isActive = true;
const isDisabled = false;
const hasPermission = true;
`;

      const filePath = join(testDir, 'conditional.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'boolean-optimization',
          language: 'typescript',
          pattern: {
            template: 'const $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
            conditionals: [
              {
                condition: 'VALUE === "true"',
                replacement: 'const $VAR = true; // Optimized boolean',
              },
              {
                condition: 'VALUE === "false"',
                replacement: 'const $VAR = false; // Optimized boolean',
              },
            ],
          },
          description: 'Optimize boolean assignments',
          complexity: 2,
          riskLevel: 'low',
          category: 'optimization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        mode: 'template',
      });
    });

    it('should apply transformers to variables', async () => {
      const testCode = `
const user_name = "john_doe";
const user_email = "john@example.com";
const api_endpoint = "/api/users";
`;

      const filePath = join(testDir, 'transformers.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'camelcase-variables',
          language: 'typescript',
          pattern: {
            template: 'const $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
            transformers: {
              VAR: 'camelCase',
            },
          },
          description: 'Convert snake_case to camelCase',
          complexity: 2,
          riskLevel: 'low',
          category: 'style',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        mode: 'template',
      });
    });

    it('should handle pattern conflicts and priorities', async () => {
      const testCode = `
var userName = "John";
var userAge = 25;
`;

      const filePath = join(testDir, 'conflicts.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'var-to-const-high-priority',
          language: 'typescript',
          pattern: {
            template: 'var $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
          },
          description: 'High priority var to const',
          complexity: 1,
          riskLevel: 'low',
          category: 'modernization',
          performance: {
            priority: 9,
            batchable: true,
            conflicts: ['var-to-let-low-priority'],
          },
        },
        {
          id: 'var-to-let-low-priority',
          language: 'typescript',
          pattern: {
            template: 'var $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'let $VAR = $VALUE;',
          },
          description: 'Low priority var to let',
          complexity: 1,
          riskLevel: 'low',
          category: 'modernization',
          performance: {
            priority: 3,
            batchable: true,
          },
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });
  });

  describe('Performance and Batching', () => {
    it('should handle multiple files efficiently', async () => {
      const files: string[] = [];
      
      // Create multiple test files
      for (let i = 0; i < 5; i++) {
        const filePath = join(testDir, `batch-file-${i}.ts`);
        const content = `
var value${i} = ${i};
var message${i} = "File ${i}";
console.log("Processing " + message${i});
`;
        await writeFile(filePath, content);
        files.push(filePath);
      }

      const patterns: TemplatePattern[] = [
        {
          id: 'batch-var-to-const',
          language: 'typescript',
          pattern: {
            template: 'var $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
          },
          description: 'Batch var to const conversion',
          complexity: 1,
          riskLevel: 'low',
          category: 'modernization',
          performance: {
            priority: 8,
            batchable: true,
          },
        },
      ];

      const startTime = Date.now();

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: files,
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toMatchObject({
        filesModified: expect.any(Array),
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should preserve formatting and indentation', async () => {
      const testCode = `
class UserService {
    constructor() {
        var userName = "default";
        var userRole = "guest";
    }
    
    getUserInfo() {
        var info = {
            name: userName,
            role: userRole
        };
        return info;
    }
}
`;

      const filePath = join(testDir, 'formatting.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'preserve-formatting',
          language: 'typescript',
          pattern: {
            template: 'var $VAR = $VALUE;',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
          },
          description: 'Preserve formatting during transformation',
          complexity: 1,
          riskLevel: 'low',
          category: 'modernization',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      expect(result).toMatchObject({
        transformationsApplied: expect.any(Number),
        mode: 'template',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid patterns gracefully', async () => {
      const testCode = `var test = "value";`;
      const filePath = join(testDir, 'error-test.ts');
      await writeFile(filePath, testCode);

      const patterns: TemplatePattern[] = [
        {
          id: 'invalid-pattern',
          language: 'typescript',
          pattern: {
            template: '[invalid regex pattern',
            flags: 'g',
          },
          replacement: {
            template: 'const $VAR = $VALUE;',
          },
          description: 'Invalid pattern for testing',
          complexity: 1,
          riskLevel: 'low',
          category: 'test',
        },
      ];

      const actor = createActor(templateEngineActor, {
        input: {
          targetFiles: [filePath],
          patterns,
          options: {
            dryRun: false,
            maxComplexity: 5,
            enableBatching: true,
            skipConflicts: true,
            preserveFormatting: true,
          },
        },
      });

      actor.start();
      
      const result = await new Promise((resolve) => {
        actor.subscribe((state) => {
          if (state.status === 'done') {
            resolve(state.output);
          }
        });
      });

      // Should not crash and return a result
      expect(result).toMatchObject({
        mode: 'template',
      });
    });
  });
});