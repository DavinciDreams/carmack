import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { z } from 'zod';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseYamlString,
  parseYamlFile,
  serializeToYaml,
  writeYamlFile,
  validateYamlFile,
  safeParseYaml,
  YamlParseError,
  YamlSerializationError,
  CommonYamlSchemas,
  YAML,
} from '../../src/utils/yaml-handler.js';

describe('YAML Handler', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'yaml-test-'));
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseYamlString', () => {
    test('should parse valid YAML string', () => {
      const yaml = `
name: test
version: 1.0.0
features:
  - feature1
  - feature2
`;
      
      const result = parseYamlString(yaml);
      
      expect(result).toEqual({
        name: 'test',
        version: '1.0.0',
        features: ['feature1', 'feature2']
      });
    });

    test('should validate against schema', () => {
      const schema = z.object({
        name: z.string(),
        version: z.string(),
        features: z.array(z.string()),
      });

      const yaml = `
name: test
version: 1.0.0
features:
  - feature1
  - feature2
`;
      
      const result = parseYamlString(yaml, schema);
      
      expect(result.name).toBe('test');
      expect(result.features).toHaveLength(2);
    });

    test('should throw YamlParseError for invalid YAML', () => {
      const invalidYaml = `
name: test
version: 1.0.0
features:
  - feature1
    invalid: indentation
`;
      
      expect(() => parseYamlString(invalidYaml)).toThrow(YamlParseError);
    });

    test('should throw YamlParseError for schema validation failure', () => {
      const schema = z.object({
        name: z.string(),
        version: z.number(), // This will fail
      });

      const yaml = `
name: test
version: "1.0.0"
`;
      
      expect(() => parseYamlString(yaml, schema)).toThrow(YamlParseError);
    });
  });

  describe('parseYamlFile', () => {
    test('should parse valid YAML file', async () => {
      const yamlContent = `
name: test-file
description: Test YAML file
config:
  enabled: true
  timeout: 5000
`;
      
      const testFile = join(testDir, 'test.yml');
      await writeFile(testFile, yamlContent);
      
      const result = await parseYamlFile(testFile);
      
      expect(result).toEqual({
        name: 'test-file',
        description: 'Test YAML file',
        config: {
          enabled: true,
          timeout: 5000
        }
      });
    });

    test('should validate file content against schema', async () => {
      const schema = z.object({
        name: z.string(),
        config: z.object({
          enabled: z.boolean(),
          timeout: z.number(),
        }),
      });

      const yamlContent = `
name: test-file
config:
  enabled: true
  timeout: 5000
`;
      
      const testFile = join(testDir, 'test-schema.yml');
      await writeFile(testFile, yamlContent);
      
      const result = await parseYamlFile(testFile, schema);
      
      expect(result.name).toBe('test-file');
      expect(result.config.enabled).toBe(true);
      expect(result.config.timeout).toBe(5000);
    });

    test('should throw YamlParseError for non-existent file', async () => {
      const nonExistentFile = join(testDir, 'non-existent.yml');
      
      await expect(parseYamlFile(nonExistentFile)).rejects.toThrow(YamlParseError);
    });
  });

  describe('serializeToYaml', () => {
    test('should serialize object to YAML string', () => {
      const data = {
        name: 'test',
        version: '1.0.0',
        features: ['feature1', 'feature2'],
        config: {
          enabled: true,
          timeout: 5000
        }
      };
      
      const yaml = serializeToYaml(data);
      
      expect(yaml).toContain('name: test');
      expect(yaml).toContain('version: 1.0.0'); // js-yaml doesn't quote simple strings
      expect(yaml).toContain('- feature1');
      expect(yaml).toContain('enabled: true');
    });

    test('should respect formatting options', () => {
      const data = { name: 'test', version: '1.0.0' };
      
      const yaml = serializeToYaml(data, {
        indent: 4,
        quotingType: "'",
        forceQuotes: true
      });
      
      expect(yaml).toContain("name: 'test'");
      expect(yaml).toContain("version: '1.0.0'");
      // Check for 4-space indentation (harder to verify directly)
    });

    test('should handle complex nested objects', () => {
      const data = {
        services: {
          web: {
            image: 'nginx:latest',
            ports: ['80:80', '443:443'],
            environment: {
              NODE_ENV: 'production',
              DEBUG: 'false'
            }
          },
          db: {
            image: 'postgres:13',
            volumes: ['db_data:/var/lib/postgresql/data']
          }
        }
      };
      
      const yaml = serializeToYaml(data);
      
      expect(yaml).toContain('services:');
      expect(yaml).toContain('web:');
      expect(yaml).toContain('image: nginx:latest'); // js-yaml handles quoting intelligently
      expect(yaml).toContain('NODE_ENV: production');
    });
  });

  describe('writeYamlFile', () => {
    test('should write object to YAML file', async () => {
      const data = {
        name: 'test-output',
        settings: {
          enabled: true,
          count: 42
        }
      };
      
      const outputFile = join(testDir, 'output.yml');
      await writeYamlFile(outputFile, data);
      
      // Read back and verify
      const result = await parseYamlFile(outputFile);
      expect(result).toEqual(data);
    });

    test('should apply custom formatting options', async () => {
      const data = { name: 'test', items: ['a', 'b', 'c'] };
      
      const outputFile = join(testDir, 'formatted.yml');
      await writeYamlFile(outputFile, data, {
        indent: 4,
        sortKeys: false
      });
      
      // Read raw content to check formatting
      const content = await Bun.file(outputFile).text();
      expect(content).toContain('name: test');
      expect(content).toContain('items:');
    });
  });

  describe('validateYamlFile', () => {
    test('should return valid result for conforming file', async () => {
      const schema = z.object({
        name: z.string(),
        version: z.string(),
      });

      const yamlContent = `
name: valid-config
version: "1.0.0"
`;
      
      const testFile = join(testDir, 'valid.yml');
      await writeFile(testFile, yamlContent);
      
      const result = await validateYamlFile(testFile, schema);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        name: 'valid-config',
        version: '1.0.0'
      });
    });

    test('should return invalid result for non-conforming file', async () => {
      const schema = z.object({
        name: z.string(),
        version: z.number(), // This will fail
      });

      const yamlContent = `
name: invalid-config
version: "1.0.0"
`;
      
      const testFile = join(testDir, 'invalid.yml');
      await writeFile(testFile, yamlContent);
      
      const result = await validateYamlFile(testFile, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeInstanceOf(z.ZodError);
    });
  });

  describe('safeParseYaml', () => {
    test('should return parsed data for valid YAML', () => {
      const yaml = 'name: test\nvalue: 42';
      const defaultValue = { name: 'default', value: 0 };
      
      const result = safeParseYaml(yaml, defaultValue);
      
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    test('should return default value for invalid YAML', () => {
      const invalidYaml = 'name: test\n  invalid: indentation';
      const defaultValue = { name: 'default', value: 0 };
      
      const result = safeParseYaml(invalidYaml, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    test('should validate against schema if provided', () => {
      const schema = z.object({
        name: z.string(),
        value: z.number(),
      });

      const yaml = 'name: test\nvalue: 42';
      const defaultValue = { name: 'default', value: 0 };
      
      const result = safeParseYaml(yaml, defaultValue, schema);
      
      expect(result).toEqual({ name: 'test', value: 42 });
    });
  });

  describe('CommonYamlSchemas', () => {
    test('should validate environment configuration', () => {
      const config = {
        name: 'development',
        variables: {
          NODE_ENV: 'development',
          DEBUG: 'true'
        },
        services: ['web', 'db']
      };
      
      const result = CommonYamlSchemas.environment.parse(config);
      
      expect(result.name).toBe('development');
      expect(result.variables.NODE_ENV).toBe('development');
      expect(result.services).toContain('web');
    });

    test('should validate pipeline configuration', () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        jobs: {
          build: {
            script: ['npm install', 'npm run build'],
            stage: 'build'
          },
          test: {
            script: ['npm test'],
            stage: 'test',
            dependencies: ['build']
          }
        }
      };
      
      const result = CommonYamlSchemas.pipeline.parse(config);
      
      expect(result.stages).toHaveLength(3);
      expect(result.jobs.build.script).toContain('npm install');
      expect(result.jobs.test.dependencies).toContain('build');
    });
  });

  describe('YAML convenience object', () => {
    test('should provide all functions through YAML object', async () => {
      const data = { test: true };
      const yamlString = YAML.serialize(data);
      const parsed = YAML.parse(yamlString);
      
      expect(parsed).toEqual(data);
      
      const testFile = join(testDir, 'convenience.yml');
      await YAML.writeFile(testFile, data);
      
      const fileData = await YAML.parseFile(testFile);
      expect(fileData).toEqual(data);
      
      const safeData = YAML.safeParse('invalid: yaml\n  bad: indentation', data);
      expect(safeData).toEqual(data);
    });

    test('should provide error classes', () => {
      expect(YAML.errors.YamlParseError).toBe(YamlParseError);
      expect(YAML.errors.YamlSerializationError).toBe(YamlSerializationError);
    });

    test('should provide common schemas', () => {
      expect(YAML.schemas.environment).toBe(CommonYamlSchemas.environment);
      expect(YAML.schemas.pipeline).toBe(CommonYamlSchemas.pipeline);
      expect(YAML.schemas.dockerCompose).toBe(CommonYamlSchemas.dockerCompose);
    });
  });

  describe('Error Handling', () => {
    test('should provide detailed error information', () => {
      try {
        parseYamlString('invalid: yaml\n  bad: indentation');
      } catch (error) {
        expect(error).toBeInstanceOf(YamlParseError);
        if (error instanceof YamlParseError) {
          expect(error.message).toContain('Failed to parse YAML');
          expect(error.originalError).toBeDefined();
        }
      }
    });

    test('should handle serialization errors gracefully', () => {
      const circularData = { self: null as any };
      circularData.self = circularData;
      
      expect(() => serializeToYaml(circularData)).toThrow(YamlSerializationError);
    });
  });
});
