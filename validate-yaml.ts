#!/usr/bin/env bun

import { glob } from 'glob';
import { YAML } from './src/utils/yaml-handler';

async function validateYamlFiles() {
  console.log('🔍 Scanning for YAML files...');

  const yamlFiles = await glob('**/*.{yml,yaml}', {
    ignore: ['node_modules/**', 'dist/**', '.git/**'],
  });

  console.log(`📄 Found ${yamlFiles.length} YAML files`);

  let validCount = 0;
  let errorCount = 0;

  for (const file of yamlFiles) {
    try {
      // Parse file to validate YAML syntax - we don't need the actual data
      await YAML.parseFile(file);
      console.log(`✅ ${file} - Valid YAML`);
      validCount++;
    } catch (error) {
      console.log(`❌ ${file} - YAML Error:`);
      console.log(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Valid files: ${validCount}`);
  console.log(`   ❌ Error files: ${errorCount}`);

  if (errorCount === 0) {
    console.log('🎉 All YAML files are valid!');
  } else {
    console.log('⚠️  Some YAML files have errors that need attention');
    process.exit(1);
  }
}

validateYamlFiles().catch(console.error);
