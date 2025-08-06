#!/usr/bin/env bun

import {
  executeProductionPatternDiscovery,
  ProductionPatternDiscoveryConfigSchema,
  type ProductionPatternDiscoveryContext
} from './src/analysis/production-pattern-discovery.ts';
import { ProductionRepositoryAnalyzer } from './src/analysis/repository-analyzer.ts';
import { PatternDetectionPipeline } from './src/analysis/pattern-detection-pipeline.ts';

console.log('🔍 Testing TypeScript Error Detection on test-typescript-error-detection.ts');
console.log('==========================================');

async function validateErrorDetection() {
  try {
    // Create production context
    const config = ProductionPatternDiscoveryConfigSchema.parse({});
    const repositoryAnalyzer = new ProductionRepositoryAnalyzer();
    const detectionPipeline = new PatternDetectionPipeline({});

    const context: ProductionPatternDiscoveryContext = {
      repositoryAnalyzer,
      detectionPipeline,
      config
    };

    // Create pattern discovery request
    const request = {
      operation: 'discover' as const,
      sources: {
        codeFiles: ['./test-typescript-error-detection.ts']
      },
      config: {
        languages: ['typescript'] as const,
        confidenceThreshold: 0.5,
        maxPatterns: 100,
        minOccurrences: 1,
        complexity: { min: 1, max: 10 },
        categories: ['error', 'modernization', 'typescript']
      }
    };

    const results = await executeProductionPatternDiscovery(request, context);

    console.log('📊 Analysis Results:');
    console.log('- Files Analyzed:', results.performance.filesAnalyzed);
    console.log('- Patterns Found:', results.patterns.length);
    console.log('- Analysis Duration:', results.performance.analysisTime + 'ms');
    console.log('- Average Confidence:', results.summary.averageConfidence);

    if (results.patterns.length > 0) {
      console.log('\n🎯 Patterns Detected:');
      results.patterns.forEach((pattern, i) => {
        console.log(`${i + 1}. ${pattern.name} (confidence: ${pattern.metadata.successRate})`);
        console.log(`   Language: ${pattern.metadata.language}`);
        console.log(`   Before: ${pattern.pattern.before.slice(0, 80)}...`);
        if (pattern.pattern.after) {
          console.log(`   After: ${pattern.pattern.after.slice(0, 80)}...`);
        }
        if (
          pattern.evidence &&
          typeof (pattern.evidence as any).location === 'object' &&
          (pattern.evidence as any).location !== null
        ) {
          const location = (pattern.evidence as any).location;
          console.log(`   Location: Line ${location.startLine}-${location.endLine}`);
        }
        console.log('');
      });
      const tsErrorPatterns = results.patterns.filter(p => 
        p.name.toLowerCase().includes('error') || 
        p.name.toLowerCase().includes('typescript')
      );

      console.log(`🔍 TypeScript Error Patterns: ${tsErrorPatterns.length}`);
      if (tsErrorPatterns.length > 0) {
        console.log('✅ TypeScript error detection is working!');
      } else {
        console.log('⚠️  No TypeScript error patterns detected - may need investigation');
      }

    } else {
      console.log('❌ No patterns detected - this indicates an issue with detection');
      console.log('   Expected: TypeScript compilation errors, modernization patterns');
      console.log('   The test file contains intentional errors that should be detected');
    }

    return results;
  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  }
}

// Run validation
validateErrorDetection()
  .then(() => {
    console.log('\n🎉 Validation completed');
  })
  .catch((error) => {
    console.error('\n💥 Validation failed:', error);
    process.exit(1);
  });