#!/usr/bin/env bun

/**
 * Environment Configuration Validation Script
 *
 * This script validates the current environment configuration and provides
 * helpful feedback for any issues found.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  getEnvironmentConfig,
  validateLLMConfig,
  getLLMConfig,
} from '../src/config/environment.js';

interface ValidationResult {
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}

const results: ValidationResult[] = [];

function addResult(
  category: string,
  status: 'pass' | 'warn' | 'fail',
  message: string,
  suggestion?: string
) {
  results.push({ category, status, message, suggestion });
}

function printResults() {
  console.log('\n🔍 Environment Configuration Validation Results\n');

  const categories = [...new Set(results.map((r) => r.category))];

  for (const category of categories) {
    console.log(`📋 ${category}:`);

    const categoryResults = results.filter((r) => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.message}`);

      if (result.suggestion) {
        console.log(`     💡 ${result.suggestion}`);
      }
    }

    console.log();
  }

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  console.log(`📊 Summary: ${passed} passed, ${warned} warnings, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Configuration validation failed. Please fix the issues above.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️ Configuration validation passed with warnings.');
    process.exit(0);
  } else {
    console.log('✅ All configuration checks passed!');
    process.exit(0);
  }
}

async function validateEnvironment() {
  console.log('🚀 Starting environment configuration validation...\n');

  try {
    // Load and validate basic configuration
    const env = getEnvironmentConfig();
    addResult('Core', 'pass', 'Environment configuration loaded successfully');

    // Validate .env file existence
    if (existsSync('.env')) {
      addResult('Core', 'pass', '.env file found');
    } else {
      addResult('Core', 'warn', '.env file not found', 'Copy .env.example to .env and configure');
    }

    // Validate Node environment
    if (['development', 'staging', 'production'].includes(env.NODE_ENV)) {
      addResult('Core', 'pass', `NODE_ENV set to ${env.NODE_ENV}`);
    } else {
      addResult(
        'Core',
        'fail',
        `Invalid NODE_ENV: ${env.NODE_ENV}`,
        'Set NODE_ENV to development, staging, or production'
      );
    }

    // Validate repository configuration
    if (env.CARMACK_REPOSITORY_URL) {
      addResult('Repository', 'pass', 'Repository URL configured');

      // Basic URL validation
      try {
        new URL(env.CARMACK_REPOSITORY_URL);
        addResult('Repository', 'pass', 'Repository URL is valid');
      } catch {
        addResult(
          'Repository',
          'fail',
          'Repository URL is invalid',
          'Provide a valid HTTPS or SSH Git URL'
        );
      }
    } else if (env.NODE_ENV === 'production') {
      addResult(
        'Repository',
        'fail',
        'Repository URL required in production',
        'Set CARMACK_REPOSITORY_URL'
      );
    } else {
      addResult(
        'Repository',
        'warn',
        'Repository URL not configured',
        'Set CARMACK_REPOSITORY_URL for Git integration'
      );
    }

    // Validate workspace directory
    if (existsSync(env.CARMACK_WORKSPACE)) {
      addResult('Repository', 'pass', `Workspace directory exists: ${env.CARMACK_WORKSPACE}`);
    } else {
      addResult(
        'Repository',
        'warn',
        `Workspace directory does not exist: ${env.CARMACK_WORKSPACE}`,
        'Directory will be created automatically'
      );
    }

    // Validate LLM configuration
    validateLLMConfig(env);
    const llmConfig = getLLMConfig();

    addResult('LLM', 'pass', `LLM provider set to ${llmConfig.provider}`);

    switch (llmConfig.provider) {
      case 'openai':
        if (llmConfig.apiKey) {
          addResult('LLM', 'pass', 'OpenAI API key configured');
        } else if (env.NODE_ENV === 'production') {
          addResult('LLM', 'fail', 'OpenAI API key required in production', 'Set OPENAI_API_KEY');
        } else {
          addResult(
            'LLM',
            'warn',
            'OpenAI API key not configured',
            'Set OPENAI_API_KEY for OpenAI integration'
          );
        }
        break;

      case 'anthropic':
        if (llmConfig.apiKey) {
          addResult('LLM', 'pass', 'Anthropic API key configured');
        } else if (env.NODE_ENV === 'production') {
          addResult(
            'LLM',
            'fail',
            'Anthropic API key required in production',
            'Set ANTHROPIC_API_KEY'
          );
        } else {
          addResult(
            'LLM',
            'warn',
            'Anthropic API key not configured',
            'Set ANTHROPIC_API_KEY for Anthropic integration'
          );
        }
        break;

      case 'local':
        addResult('LLM', 'pass', `Local LLM configured: ${env.LOCAL_LLM_URL}`);
        // Could add connectivity test here
        break;

      case 'mock':
        if (env.NODE_ENV === 'production') {
          addResult(
            'LLM',
            'warn',
            'Using mock LLM provider in production',
            'Consider using a real LLM provider'
          );
        } else {
          addResult('LLM', 'pass', 'Mock LLM provider configured for development');
        }
        break;
    }

    // Validate quality settings
    if (env.ENABLE_DAFNY_VERIFICATION) {
      if (existsSync(env.DAFNY_PATH)) {
        addResult('Quality', 'pass', `Dafny found at ${env.DAFNY_PATH}`);
      } else {
        addResult(
          'Quality',
          'warn',
          'Dafny not found',
          'Install Dafny or set DAFNY_PATH, or disable with ENABLE_DAFNY_VERIFICATION=false'
        );
      }
    } else {
      addResult(
        'Quality',
        'warn',
        'Dafny verification disabled',
        'Enable with ENABLE_DAFNY_VERIFICATION=true for formal verification'
      );
    }

    // Validate file extensions
    const extensions = env.ALLOWED_FILE_EXTENSIONS.split(',').map((s) => s.trim());
    if (extensions.every((ext) => ext.startsWith('.'))) {
      addResult('Transformation', 'pass', `File extensions configured: ${extensions.join(', ')}`);
    } else {
      addResult(
        'Transformation',
        'fail',
        'Invalid file extensions format',
        'File extensions must start with a dot (e.g., .ts,.js)'
      );
    }

    // Validate performance settings
    if (env.MAX_TRANSFORMATION_TIME >= 30000) {
      addResult('Performance', 'pass', `Transformation timeout: ${env.MAX_TRANSFORMATION_TIME}ms`);
    } else {
      addResult(
        'Performance',
        'warn',
        'Transformation timeout is very low',
        'Consider increasing MAX_TRANSFORMATION_TIME'
      );
    }

    if (env.MAX_MEMORY_USAGE >= 512) {
      addResult('Performance', 'pass', `Memory limit: ${env.MAX_MEMORY_USAGE}MB`);
    } else {
      addResult(
        'Performance',
        'warn',
        'Memory limit is very low',
        'Consider increasing MAX_MEMORY_USAGE'
      );
    }

    // Validate telemetry settings
    if (env.CARMACK_TELEMETRY_ENABLED) {
      addResult('Telemetry', 'pass', 'Telemetry enabled');

      if (env.METRICS_ENDPOINT) {
        addResult('Telemetry', 'pass', `Metrics endpoint configured: ${env.METRICS_ENDPOINT}`);
      } else {
        addResult(
          'Telemetry',
          'warn',
          'No metrics endpoint configured',
          'Set METRICS_ENDPOINT for external metrics collection'
        );
      }
    } else {
      addResult(
        'Telemetry',
        'warn',
        'Telemetry disabled',
        'Enable with CARMACK_TELEMETRY_ENABLED=true for observability'
      );
    }

    // Validate backup settings
    if (env.ENABLE_BACKUPS) {
      addResult('Backup', 'pass', 'Backups enabled');

      const backupDir = join(process.cwd(), env.BACKUP_DIRECTORY);
      if (existsSync(backupDir)) {
        addResult('Backup', 'pass', `Backup directory exists: ${env.BACKUP_DIRECTORY}`);
      } else {
        addResult(
          'Backup',
          'warn',
          `Backup directory will be created: ${env.BACKUP_DIRECTORY}`,
          'Directory will be created automatically'
        );
      }
    } else {
      addResult('Backup', 'warn', 'Backups disabled', 'Enable with ENABLE_BACKUPS=true for safety');
    }

    // Validate logging configuration
    const logDir = join(process.cwd(), 'logs');
    if (env.ENABLE_FILE_LOGGING) {
      if (existsSync(logDir)) {
        addResult('Logging', 'pass', 'Log directory exists');
      } else {
        addResult(
          'Logging',
          'warn',
          'Log directory will be created',
          'Directory will be created automatically'
        );
      }
    }

    addResult('Logging', 'pass', `Log level set to ${env.CARMACK_LOG_LEVEL}`);

    // Validate security settings
    if (env.API_SECRET_KEY) {
      addResult('Security', 'pass', 'API secret key configured');
    } else if (env.NODE_ENV === 'production') {
      addResult(
        'Security',
        'warn',
        'API secret key not configured',
        'Set API_SECRET_KEY for production security'
      );
    }

    // Validate development settings
    if (env.NODE_ENV === 'development') {
      if (env.DEBUG_MODE) {
        addResult('Development', 'pass', 'Debug mode enabled');
      }

      if (env.MOCK_LLM_RESPONSES) {
        addResult('Development', 'pass', 'Mock LLM responses enabled for testing');
      }
    }
  } catch (error) {
    addResult(
      'Core',
      'fail',
      `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  printResults();
}

// Run validation
validateEnvironment().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
