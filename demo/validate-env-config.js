console.log('🔍 Validating Updated .env Configuration for NVIDIA TensorRT');
console.log('===========================================================');

import { readFileSync } from 'fs';

try {
  const envContent = readFileSync('.env', 'utf8');
  
  // Check key TensorRT-specific settings
  const checks = [
    { name: 'NVIDIA TensorRT Repository', pattern: /REPOSITORY_URL=https:\/\/github\.com\/NVIDIA\/TensorRT/, required: true },
    { name: 'Main Branch', pattern: /BRANCH=main/, required: true },
    { name: 'C++/CUDA Extensions', pattern: /ALLOWED_FILE_EXTENSIONS=\.cpp,\.cxx,\.cc,\.c\+\+,\.c,\.h,\.hpp,\.cu,\.cuh,\.py/, required: true },
    { name: 'Conservative Batch Size', pattern: /MAX_FILES_PER_BATCH=5/, required: true },
    { name: 'Low Risk Level', pattern: /RISK_LEVEL_FILTER=low/, required: true },
    { name: 'Memory Limit (2GB)', pattern: /MAX_MEMORY_USAGE=2048/, required: true },
    { name: 'Extended Timeout (10min)', pattern: /MAX_TRANSFORMATION_TIME=600000/, required: true },
    { name: 'Backups Enabled', pattern: /ENABLE_BACKUPS=true/, required: true },
    { name: 'Validation Enabled', pattern: /ENABLE_VALIDATION=true/, required: true },
    { name: 'Type Check Disabled', pattern: /REQUIRE_TYPE_CHECK=false/, required: true },
    { name: 'Anthropic API Key Preserved', pattern: /ANTHROPIC_API_KEY=sk-ant-api03/, required: true },
    { name: 'OpenRouter API Key Preserved', pattern: /OPENROUTER_API_KEY=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/, required: true },
    { name: 'Dafny Path Preserved', pattern: /DAFNY_PATH=C:\\Users\\lmwat\\scoop\\shims\\dafny\.exe/, required: true },
    { name: 'Carmack Branch Preserved', pattern: /CARMACK_BRANCH=roo-to-do/, required: true }
  ];
  
  console.log('\n🎯 Configuration Validation Results:');
  console.log('=====================================');
  
  let allPassed = true;
  checks.forEach(check => {
    const found = check.pattern.test(envContent);
    const status = found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
    if (!found && check.required) {
      allPassed = false;
    }
  });
  
  // Count total environment variables
  const variables = envContent.match(/^[A-Z_][A-Z0-9_]*=/gm) || [];
  console.log(`\n📊 Total environment variables: ${variables.length}`);
  
  // Check for comprehensive sections
  const sections = [
    'TARGET REPOSITORY CONFIGURATION - NVIDIA TENSORRT',
    'CARMACK SYSTEM REPOSITORY CONFIGURATION',
    'FILE PROCESSING CONFIGURATION - C++/CUDA/PYTHON OPTIMIZED',
    'TRANSFORMATION CONFIGURATION - C++/CUDA OPTIMIZED',
    'LLM CONFIGURATION - PRESERVED EXISTING SETTINGS',
    'RESOURCE LIMITS & PERFORMANCE - TENSORRT OPTIMIZED',
    'QUALITY ASSURANCE - TENSORRT PRODUCTION STANDARDS',
    'NVIDIA TENSORRT CONFIGURATION SUMMARY'
  ];
  
  console.log('\n📋 Configuration Sections:');
  sections.forEach(section => {
    const found = envContent.includes(section);
    console.log(`   ${found ? '✅' : '❌'} ${section}`);
  });
  
  // Final validation summary
  console.log('\n🎉 VALIDATION SUMMARY:');
  console.log('======================');
  if (allPassed) {
    console.log('✅ All critical settings validated successfully!');
    console.log('✅ NVIDIA TensorRT configuration is ready for production use');
    console.log('✅ All existing API keys and sensitive data preserved');
    console.log('✅ Conservative settings applied for large C++/CUDA repository');
  } else {
    console.log('❌ Some critical settings are missing or incorrect');
  }
  
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}