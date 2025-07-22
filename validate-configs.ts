#!/usr/bin/env bun

import { YAML } from './src/utils/yaml-handler.js';

console.log('🔍 Validating YAML configuration files...\n');

// Test lefthook.yml
try {
  const lefthookData = await YAML.parseFile('./lefthook.yml');
  console.log('✅ lefthook.yml is valid YAML');
} catch (error) {
  console.log('❌ lefthook.yml has YAML syntax errors:', error instanceof Error ? error.message : 'Unknown error');
}

// Test docker-compose.yml
try {
  const dockerData = await YAML.parseFile('./docker-compose.yml');
  console.log('✅ docker-compose.yml is valid YAML');
} catch (error) {
  console.log('❌ docker-compose.yml has YAML syntax errors:', error instanceof Error ? error.message : 'Unknown error');
}

// Test prometheus.yml
try {
  const prometheusData = await YAML.parseFile('./monitoring/prometheus.yml');
  console.log('✅ monitoring/prometheus.yml is valid YAML');
} catch (error) {
  console.log('❌ monitoring/prometheus.yml has YAML syntax errors:', error instanceof Error ? error.message : 'Unknown error');
}

// Test workflow files
const workflows = ['.github/workflows/ci.yml', '.github/workflows/production.yml'];
for (const workflow of workflows) {
  try {
    const workflowData = await YAML.parseFile(workflow);
    console.log(`✅ ${workflow} is valid YAML`);
  } catch (error) {
    console.log(`❌ ${workflow} has YAML syntax errors:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

console.log('\n🎯 YAML syntax validation completed!');
