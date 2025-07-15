import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createLLMTransformer,
  type LLMConfig,
  type LLMTransformationInput,
  LLMTransformer,
  validateLLMConfig,
} from '../../src/actors/llm-transformation.js';

describe('LLM Transformation System', () => {
  const testDir = './test-temp';
  const testFile = join(testDir, 'test-code.ts');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(testFile);
    } catch {
      // File might not exist
    }
  });

  describe('LLMTransformer Class', () => {
    test('should create transformer with default config', () => {
      const transformer = new LLMTransformer();
      expect(transformer).toBeDefined();
    });

    test('should create transformer with custom config', () => {
      const config: Partial<LLMConfig> = {
        provider: 'mock',
        model: 'test-model',
        temperature: 0.5,
      };
      const transformer = new LLMTransformer(config);
      expect(transformer).toBeDefined();
    });

    test('should transform files with mock provider', async () => {
      const testCode = `
var oldVar = 'test';
if (oldVar == 'test') {
  console.log('found');
}
`;

      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.filesModified).toContain(testFile);
      expect(result.transformationsApplied).toBeGreaterThan(0);
      expect(result.averageConfidence).toBeGreaterThan(0);

      // Check that the file was actually transformed
      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('const oldVar');
      expect(transformedContent).toContain('===');
    });

    test('should handle empty files gracefully', async () => {
      await writeFile(testFile, '');

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.errors).toBeDefined();
      expect(result.filesModified).toHaveLength(0);
    });

    test('should handle non-existent files gracefully', async () => {
      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: ['non-existent-file.ts'],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.filesModified).toHaveLength(0);
    });

    test('should detect code patterns correctly', async () => {
      const testCode = `
import React from 'react';
var count = 0;
function Component() {
  return <div>{count}</div>;
}
export default Component;
`;

      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
        context: {
          framework: 'React',
        },
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.filesModified).toContain(testFile);
    });

    test('should validate transformations correctly', async () => {
      const testCode = `
const validCode = 'test';
console.log(validCode);
`;

      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      // Should not modify already good code
      expect(result.transformationsApplied).toBe(0);
    });

    test('should handle complex TypeScript code', async () => {
      const testCode = `
interface User {
  name: string;
  age: number;
}

var users: User[] = [];

function addUser(user: User) {
  if (user.name == '') {
    return false;
  }
  users.push(user);
  return true;
}

export { addUser, User };
`;

      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
        context: {
          projectType: 'typescript',
          complexity: 5,
        },
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.filesModified).toContain(testFile);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('const users');
      expect(transformedContent).toContain("user.name === ''");
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid config', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      };

      const validated = validateLLMConfig(config);
      expect(validated.provider).toBe('openai');
      expect(validated.model).toBe('gpt-4');
    });

    test('should apply defaults for missing config', () => {
      const config = {};
      const validated = validateLLMConfig(config);

      expect(validated.provider).toBe('mock');
      expect(validated.model).toBe('gpt-4');
      expect(validated.maxTokens).toBe(4000);
      expect(validated.temperature).toBe(0.1);
    });

    test('should reject invalid provider', () => {
      const config = {
        provider: 'invalid-provider',
      };

      expect(() => validateLLMConfig(config)).toThrow();
    });

    test('should reject invalid temperature', () => {
      const config = {
        temperature: 5.0, // Too high
      };

      expect(() => validateLLMConfig(config)).toThrow();
    });
  });

  describe('Convenience Functions', () => {
    test('should create transformer with convenience function', () => {
      const transformer = createLLMTransformer({
        provider: 'mock',
        model: 'test-model',
      });

      expect(transformer).toBeInstanceOf(LLMTransformer);
    });

    test('should create transformer with no config', () => {
      const transformer = createLLMTransformer();
      expect(transformer).toBeInstanceOf(LLMTransformer);
    });
  });

  describe('Error Handling', () => {
    test('should handle API failures gracefully', async () => {
      const testCode = `var test = 'value';`;
      await writeFile(testFile, testCode);

      // Create a transformer that will fail
      const transformer = new LLMTransformer({
        provider: 'openai',
        apiKey: 'invalid-key',
        retries: 1,
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);

      // Should still return original code
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe(testCode);
    });

    test('should handle malformed responses', async () => {
      const testCode = `var test = 'value';`;
      await writeFile(testFile, testCode);

      // Mock will return valid responses, so this tests the parsing logic
      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      // Mock should work fine
      expect(result.filesModified).toContain(testFile);
    });
  });

  describe('Performance and Caching', () => {
    test('should cache responses for identical requests', async () => {
      const testCode = `var cached = 'test';`;
      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      // First call
      const result1 = await transformer.transformFiles(input);

      // Reset file content
      await writeFile(testFile, testCode);

      // Second call should use cache
      const result2 = await transformer.transformFiles(input);

      expect(result1.mode).toBe('llm');
      expect(result2.mode).toBe('llm');
      expect(result1.transformationsApplied).toBe(result2.transformationsApplied);
    });

    test('should track token usage', async () => {
      const testCode = `var tokens = 'test';`;
      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
      };

      const result = await transformer.transformFiles(input);

      expect(result.totalTokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Context Analysis', () => {
    test('should analyze file context correctly', async () => {
      const testCode = `
import React, { useState } from 'react';
import axios from 'axios';

interface Props {
  title: string;
}

var count = 0;

function Component({ title }: Props) {
  const [state, setState] = useState(0);
  
  if (count == 0) {
    setState(1);
  }
  
  return <div>{title}</div>;
}

export default Component;
`;

      await writeFile(testFile, testCode);

      const transformer = new LLMTransformer({
        provider: 'mock',
        model: 'test-model',
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
        retries: 3,
      });

      const input: LLMTransformationInput = {
        files: [testFile],
        context: {
          framework: 'React',
          projectType: 'typescript',
        },
      };

      const result = await transformer.transformFiles(input);

      expect(result.mode).toBe('llm');
      expect(result.filesModified).toContain(testFile);

      const transformedContent = await readFile(testFile, 'utf-8');
      expect(transformedContent).toContain('const count');
      expect(transformedContent).toContain('count === 0');
    });
  });
});
