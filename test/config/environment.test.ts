/**
 * Environment Configuration Tests
 *
 * Tests for the environment configuration loading and validation system.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import {
  loadEnvironmentConfig,
  validateLLMConfig,
  getLLMConfig,
  isDevelopment,
  isProduction,
  getLogLevel,
  isTelemetryEnabled,
} from '../../src/config/environment.js';

describe('Environment Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadEnvironmentConfig', () => {
    it('should load configuration with defaults', () => {
      // Clear environment
      process.env = {};

      const config = loadEnvironmentConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.LLM_PROVIDER).toBe('mock');
      expect(config.CARMACK_WORKSPACE).toBe('./workspace');
      expect(config.ENABLE_VALIDATION).toBe(true);
      expect(config.CARMACK_TELEMETRY_ENABLED).toBe(true);
    });

    it('should override defaults with environment variables', () => {
      process.env = {
        NODE_ENV: 'production',
        LLM_PROVIDER: 'openai',
        CARMACK_WORKSPACE: '/custom/workspace',
        ENABLE_VALIDATION: 'false',
        CARMACK_TELEMETRY_ENABLED: 'false',
      };

      const config = loadEnvironmentConfig();

      expect(config.NODE_ENV).toBe('production');
      expect(config.LLM_PROVIDER).toBe('openai');
      expect(config.CARMACK_WORKSPACE).toBe('/custom/workspace');
      expect(config.ENABLE_VALIDATION).toBe(false);
      expect(config.CARMACK_TELEMETRY_ENABLED).toBe(false);
    });

    it('should handle numeric environment variables', () => {
      process.env = {
        LLM_TEMPERATURE: '0.5',
        LLM_MAX_TOKENS: '8000',
        MAX_FILES_PER_BATCH: '20',
        MIN_TEST_COVERAGE: '90',
      };

      const config = loadEnvironmentConfig();

      expect(config.LLM_TEMPERATURE).toBe(0.5);
      expect(config.LLM_MAX_TOKENS).toBe(8000);
      expect(config.MAX_FILES_PER_BATCH).toBe(20);
      expect(config.MIN_TEST_COVERAGE).toBe(90);
    });

    it('should handle boolean environment variables', () => {
      process.env = {
        ENABLE_DAFNY_VERIFICATION: 'true',
        TRANSFORMATION_FALLBACK_ENABLED: 'false',
        DEBUG_MODE: '1',
        VERBOSE_LOGGING: '0',
      };

      const config = loadEnvironmentConfig();

      expect(config.ENABLE_DAFNY_VERIFICATION).toBe(true);
      expect(config.TRANSFORMATION_FALLBACK_ENABLED).toBe(false);
      expect(config.DEBUG_MODE).toBe(true);
      expect(config.VERBOSE_LOGGING).toBe(false);
    });
  });

  describe('validateLLMConfig', () => {
    it('should pass validation for mock provider', () => {
      const config = loadEnvironmentConfig();
      config.LLM_PROVIDER = 'mock';

      expect(() => validateLLMConfig(config)).not.toThrow();
    });

    it('should require API key for OpenAI in production', () => {
      const config = loadEnvironmentConfig();
      config.NODE_ENV = 'production';
      config.LLM_PROVIDER = 'openai';
      config.OPENAI_API_KEY = undefined;

      expect(() => validateLLMConfig(config)).toThrow('OPENAI_API_KEY is required');
    });

    it('should require API key for Anthropic in production', () => {
      const config = loadEnvironmentConfig();
      config.NODE_ENV = 'production';
      config.LLM_PROVIDER = 'anthropic';
      config.ANTHROPIC_API_KEY = undefined;

      expect(() => validateLLMConfig(config)).toThrow('ANTHROPIC_API_KEY is required');
    });

    it('should allow missing API keys in development', () => {
      const config = loadEnvironmentConfig();
      config.NODE_ENV = 'development';
      config.LLM_PROVIDER = 'openai';
      config.OPENAI_API_KEY = undefined;

      expect(() => validateLLMConfig(config)).not.toThrow();
    });
  });

  describe('getLLMConfig', () => {
    it('should return OpenAI configuration', () => {
      process.env = {
        LLM_PROVIDER: 'openai',
        LLM_MODEL: 'gpt-4',
        OPENAI_API_KEY: 'sk-test-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        LLM_TEMPERATURE: '0.2',
        LLM_MAX_TOKENS: '2000',
      };

      const llmConfig = getLLMConfig();

      expect(llmConfig.provider).toBe('openai');
      expect(llmConfig.model).toBe('gpt-4');
      expect(llmConfig.apiKey).toBe('sk-test-key');
      expect(llmConfig.baseUrl).toBe('https://api.openai.com/v1');
      expect(llmConfig.temperature).toBe(0.2);
      expect(llmConfig.maxTokens).toBe(2000);
    });

    it('should return Anthropic configuration', () => {
      process.env = {
        LLM_PROVIDER: 'anthropic',
        LLM_MODEL: 'claude-3-sonnet-20240229',
        ANTHROPIC_API_KEY: 'sk-ant-test-key',
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
      };

      const llmConfig = getLLMConfig();

      expect(llmConfig.provider).toBe('anthropic');
      expect(llmConfig.model).toBe('claude-3-sonnet-20240229');
      expect(llmConfig.apiKey).toBe('sk-ant-test-key');
      expect(llmConfig.baseUrl).toBe('https://api.anthropic.com');
    });

    it('should return local LLM configuration', () => {
      process.env = {
        LLM_PROVIDER: 'local',
        LOCAL_LLM_URL: 'http://localhost:11434',
        LOCAL_LLM_MODEL: 'codellama:7b',
      };

      const llmConfig = getLLMConfig();

      expect(llmConfig.provider).toBe('local');
      expect(llmConfig.baseUrl).toBe('http://localhost:11434');
    });
  });

  describe('utility functions', () => {
    it('should detect development environment', () => {
      process.env = { NODE_ENV: 'development' };
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env = { NODE_ENV: 'production' };
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
    });

    it('should return correct log level', () => {
      process.env = { CARMACK_LOG_LEVEL: 'debug' };
      expect(getLogLevel()).toBe('debug');

      process.env = { LOG_LEVEL: 'error', CARMACK_LOG_LEVEL: 'warn' };
      expect(getLogLevel()).toBe('warn'); // CARMACK_LOG_LEVEL takes precedence
    });

    it('should detect telemetry status', () => {
      process.env = { CARMACK_TELEMETRY_ENABLED: 'true' };
      expect(isTelemetryEnabled()).toBe(true);

      process.env = { CARMACK_TELEMETRY_ENABLED: 'false' };
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('validation edge cases', () => {
    it('should handle invalid NODE_ENV gracefully', () => {
      process.env = { NODE_ENV: 'invalid' };

      expect(() => loadEnvironmentConfig()).toThrow();
    });

    it('should handle invalid numeric values', () => {
      process.env = { LLM_TEMPERATURE: 'invalid' };

      expect(() => loadEnvironmentConfig()).toThrow();
    });

    it('should handle invalid boolean values', () => {
      process.env = { ENABLE_VALIDATION: 'maybe' };

      expect(() => loadEnvironmentConfig()).toThrow();
    });

    it('should handle invalid URL values', () => {
      process.env = { OPENAI_BASE_URL: 'not-a-url' };

      expect(() => loadEnvironmentConfig()).toThrow();
    });

    it('should handle invalid email values', () => {
      process.env = { GIT_USER_EMAIL: 'not-an-email' };

      expect(() => loadEnvironmentConfig()).toThrow();
    });
  });

  describe('environment precedence', () => {
    it('should prioritize CARMACK_REPOSITORY_URL over REPOSITORY_URL', () => {
      process.env = {
        REPOSITORY_URL: 'https://github.com/old/repo',
        CARMACK_REPOSITORY_URL: 'https://github.com/new/repo',
      };

      const config = loadEnvironmentConfig();
      expect(config.CARMACK_REPOSITORY_URL).toBe('https://github.com/new/repo');
    });

    it('should prioritize WORKSPACE_DIR over CARMACK_WORKSPACE', () => {
      process.env = {
        CARMACK_WORKSPACE: './old-workspace',
        WORKSPACE_DIR: './new-workspace',
      };

      const config = loadEnvironmentConfig();
      expect(config.CARMACK_WORKSPACE).toBe('./new-workspace');
    });

    it('should prioritize LOG_LEVEL over CARMACK_LOG_LEVEL', () => {
      process.env = {
        CARMACK_LOG_LEVEL: 'info',
        LOG_LEVEL: 'debug',
      };

      const config = loadEnvironmentConfig();
      expect(config.CARMACK_LOG_LEVEL).toBe('debug');
    });
  });
});
