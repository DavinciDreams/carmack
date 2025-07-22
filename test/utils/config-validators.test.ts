import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { ConfigValidator } from '../../src/utils/config-validators';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

describe('Config Validators', () => {
  const testDir = join(process.cwd(), 'test-temp-config');
  
  beforeAll(async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  describe('LefthookConfigValidator', () => {
    it('should validate valid lefthook configuration', async () => {
      const validConfig = `
colors: true
source_dir: '.lefthook'
pre-commit:
  commands:
    lint:
      run: 'bun run lint'
      stage_fixed: true
    test:
      run: 'bun test'
      tags: 'test'
`;
      
      const filePath = join(testDir, 'valid-lefthook.yml');
      await writeFile(filePath, validConfig);
      
      const result = await ConfigValidator.validateLefthook(filePath);
      
      if (!result.valid) {
        console.log('Validation errors:', result.errors);
        console.log('Result data:', result.data);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.colors).toBe(true);
    });

    it('should report errors for invalid lefthook configuration', async () => {
      const invalidConfig = `
invalid_field: true
pre-commit:
  commands:
    lint:
      invalid_run_field: 'bun run lint'
`;
      
      const filePath = join(testDir, 'invalid-lefthook.yml');
      await writeFile(filePath, invalidConfig);
      
      const result = await ConfigValidator.validateLefthook(filePath);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle missing file gracefully', async () => {
      const result = await ConfigValidator.validateLefthook('nonexistent-file.yml');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Failed to read file');
    });
  });

  describe('DockerComposeValidator', () => {
    it('should validate valid docker-compose configuration', async () => {
      const validConfig = `
version: '3.8'
services:
  web:
    image: 'nginx:latest'
    ports:
      - '8080:80'
    environment:
      NODE_ENV: 'production'
  db:
    image: 'postgres:13'
    environment:
      POSTGRES_DB: 'myapp'
      POSTGRES_USER: 'user'
      POSTGRES_PASSWORD: 'password'
`;
      
      const filePath = join(testDir, 'valid-docker-compose.yml');
      await writeFile(filePath, validConfig);
      
      const result = await ConfigValidator.validateDockerCompose(filePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.version).toBe('3.8');
      expect(Object.keys(result.data?.services || {})).toContain('web');
    });

    it('should report errors for invalid docker-compose configuration', async () => {
      const invalidConfig = `
version: '3.8'
services:
  web:
    invalid_field: 'should not be here'
    image: 'nginx:latest'
`;
      
      const filePath = join(testDir, 'invalid-docker-compose.yml');
      await writeFile(filePath, invalidConfig);
      
      const result = await ConfigValidator.validateDockerCompose(filePath);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('PrometheusConfigValidator', () => {
    it('should validate valid prometheus configuration', async () => {
      const validConfig = `
global:
  scrape_interval: '15s'
  evaluation_interval: '15s'
rule_files: []
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
`;
      
      const filePath = join(testDir, 'valid-prometheus.yml');
      await writeFile(filePath, validConfig);
      
      const result = await ConfigValidator.validatePrometheus(filePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.global.scrape_interval).toBe('15s');
      expect(result.data?.scrape_configs.length).toBeGreaterThan(0);
    });
  });

  describe('GitHubWorkflowValidator', () => {
    it('should validate valid GitHub workflow configuration', async () => {
      const validConfig = `
name: 'CI Pipeline'
on: 
  push:
    branches: ['main', 'develop']
jobs:
  test:
    runs-on: 'ubuntu-latest'
    steps:
      - uses: 'actions/checkout@v3'
      - name: 'Run Tests'
        run: 'bun test'
`;
      
      const filePath = join(testDir, 'valid-workflow.yml');
      await writeFile(filePath, validConfig);
      
      const result = await ConfigValidator.validateGitHubWorkflow(filePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('CI Pipeline');
      expect(Object.keys(result.data?.jobs || {})).toContain('test');
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
