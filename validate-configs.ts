#!/usr/bin/env bun
/**
 * Configuration Validation Script
 * 
 * Validates all common configuration files in the project
 * Usage: bun run validate-configs.ts [--verbose] [--fix]
 */

import { ConfigValidator } from './src/utils/config-validators';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface ValidationResults {
  file: string;
  type: string;
  valid: boolean;
  errors?: string[];
}

const CONFIG_FILES = [
  { path: 'lefthook.yml', validator: 'lefthook', required: false },
  { path: 'docker-compose.yml', validator: 'docker-compose', required: false },
  { path: 'monitoring/prometheus.yml', validator: 'prometheus', required: false },
  { path: '.github/workflows/ci.yml', validator: 'github-workflow', required: false },
  { path: '.github/workflows/deploy.yml', validator: 'github-workflow', required: false },
  { path: '.github/workflows/test.yml', validator: 'github-workflow', required: false },
] as const;

async function validateFile(
  filePath: string, 
  validatorType: string
): Promise<ValidationResults> {
  try {
    let result;
    
    switch (validatorType) {
      case 'lefthook':
        result = await ConfigValidator.validateLefthook(filePath);
        break;
      case 'docker-compose':
        result = await ConfigValidator.validateDockerCompose(filePath);
        break;
      case 'prometheus':
        result = await ConfigValidator.validatePrometheus(filePath);
        break;
      case 'github-workflow':
        result = await ConfigValidator.validateGitHubWorkflow(filePath);
        break;
      default:
        throw new Error(`Unknown validator type: ${validatorType}`);
    }

    return {
      file: filePath,
      type: validatorType,
      valid: result.valid,
      errors: result.errors,
    };
  } catch (error) {
    return {
      file: filePath,
      type: validatorType,
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const fix = args.includes('--fix');
  
  console.log('🔍 Validating configuration files...\n');

  const results: ValidationResults[] = [];
  
  for (const config of CONFIG_FILES) {
    const fullPath = join(process.cwd(), config.path);
    
    if (!existsSync(fullPath)) {
      if (config.required) {
        results.push({
          file: config.path,
          type: config.validator,
          valid: false,
          errors: ['Required file not found'],
        });
      } else if (verbose) {
        console.log(`⏭️  Skipping ${config.path} (not found)`);
      }
      continue;
    }

    if (verbose) {
      console.log(`📄 Validating ${config.path}...`);
    }

    const result = await validateFile(fullPath, config.validator);
    results.push(result);
  }

  // Print results
  console.log('\n📊 Validation Results:');
  console.log('━'.repeat(50));

  let totalFiles = 0;
  let validFiles = 0;
  
  for (const result of results) {
    totalFiles++;
    
    if (result.valid) {
      validFiles++;
      console.log(`✅ ${result.file} - Valid`);
    } else {
      console.log(`❌ ${result.file} - Invalid`);
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`   └─ ${error}`);
        }
      }
    }
  }

  console.log('━'.repeat(50));
  console.log(`📈 Summary: ${validFiles}/${totalFiles} files valid`);
  
  if (validFiles === totalFiles) {
    console.log('🎉 All configuration files are valid!');
    process.exit(0);
  } else {
    console.log('⚠️  Some configuration files have issues.');
    
    if (fix) {
      console.log('\n🔧 Auto-fix suggestions:');
      for (const result of results) {
        if (!result.valid && result.errors) {
          console.log(`\nFile: ${result.file}`);
          for (const error of result.errors) {
            if (error.includes('Required property')) {
              console.log(`  • Add missing property: ${error.split(':')[0]}`);
            } else if (error.includes('Expected')) {
              console.log(`  • Fix type error: ${error}`);
            } else {
              console.log(`  • ${error}`);
            }
          }
        }
      }
    } else {
      console.log('💡 Run with --fix flag to see auto-fix suggestions');
    }
    
    process.exit(1);
  }
}

// Handle CLI execution
if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { validateFile, CONFIG_FILES };
