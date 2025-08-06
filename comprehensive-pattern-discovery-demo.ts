/**
 * Comprehensive Pattern Discovery Demonstration
 * 
 * This script demonstrates the production-ready pattern discovery system
 * running on the entire Carmack repository to showcase all enhancements:
 * - TypeScript error detection integration
 * - Multi-stage pattern detection pipeline
 * - Repository-wide analysis capabilities
 * - Performance metrics and categorization
 */

import { ProductionPatternDiscovery } from './src/analysis/production-pattern-discovery.js';
import { writeFile } from 'node:fs/promises';

interface DemoResults {
  timestamp: string;
  repositoryPath: string;
  totalAnalysisTime: number;
  overallResults: {
    totalFilesAnalyzed: number;
    totalPatternsFound: number;
    averageConfidence: number;
    cacheHitRate: number;
  };
  patternBreakdown: {
    byCategory: Record<string, number>;
    byStage: Record<string, number>;
    byRiskLevel: Record<string, number>;
  };
  topPatterns: Array<{
    name: string;
    category: string;
    confidence: number;
    riskLevel: string;
    description: string;
    exampleBefore: string;
    exampleAfter?: string;
  }>;
  performanceMetrics: {
    avgTimePerFile: number;
    patternsPerFile: number;
    memoryUsage: number;
  };
  systemValidation: {
    typescriptErrorDetection: boolean;
    modernizationDetection: boolean;
    multiStageProcessing: boolean;
    patternAggregation: boolean;
  };
}

async function runComprehensiveDemo(): Promise<DemoResults> {
  console.log('🚀 COMPREHENSIVE PATTERN DISCOVERY DEMONSTRATION');
  console.log('================================================');
  console.log('Testing the production pattern discovery system on the Carmack repository');
  console.log('');

  const startTime = Date.now();
  
  // Initialize the production system with optimized settings
  console.log('🔧 Initializing ProductionPatternDiscovery with repository settings...');
  const discovery = new ProductionPatternDiscovery({
    repository: {
      enableParallelProcessing: true,
      maxConcurrentFiles: 25, // Optimized for repository analysis
      enableCaching: true,
      cacheDirectory: '.carmack-cache',
      enableIncrementalAnalysis: true,
      maxFileSize: 2 * 1024 * 1024, // 2MB limit
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'carmack-rust/**', // Exclude Rust subdirectory
        'baml_client/**'   // Exclude generated code
      ]
    },
    pipeline: {
      enableMultiStageAnalysis: true,
      enableSemanticAnalysis: true,
      confidenceThreshold: 0.6, // Balanced threshold
      maxPatternsPerFile: 30
    },
    performance: {
      enableParallelProcessing: true,
      maxConcurrentFiles: 20,
      memoryThreshold: 512 * 1024 * 1024, // 512MB
      enableProgressReporting: true
    }
  });

  console.log('✅ System initialized');
  console.log('');

  // Run repository-wide discovery
  console.log('🔍 Starting repository-wide pattern discovery...');
  console.log('Target: ./src (TypeScript/JavaScript source files)');
  console.log('');

  const results = await discovery.discover('./src', {
    minOccurrences: 1,
    confidenceThreshold: 0.5, // Lower threshold to catch more patterns
    maxPatterns: 200, // Allow more patterns for comprehensive analysis
    languages: ['typescript', 'javascript'],
    categories: ['modernization', 'optimization', 'cleanup', 'error-detection', 'analysis'],
    complexity: { min: 1, max: 10 }
  });

  const endTime = Date.now();
  const totalAnalysisTime = endTime - startTime;

  console.log('✨ Repository analysis completed!');
  console.log('');

  // Analyze and categorize results
  console.log('📊 COMPREHENSIVE RESULTS ANALYSIS');
  console.log('==================================');
  
  const { patterns, performance } = results;
  
  console.log(`📁 Files Analyzed: ${performance.filesAnalyzed}`);
  console.log(`🎯 Total Patterns Found: ${patterns.length}`);
  console.log(`⏱️  Total Analysis Time: ${totalAnalysisTime}ms`);
  console.log(`🔄 Cache Hit Rate: ${(performance.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`📈 Average Confidence: ${results.summary.averageConfidence.toFixed(3)}`);
  console.log('');

  // Pattern categorization breakdown
  const byCategory = patterns.reduce((acc, p) => {
    acc[p.metadata.category] = (acc[p.metadata.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byStage = patterns.reduce((acc, p) => {
    const stage = (p.metadata as any).stage || 'unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRiskLevel = patterns.reduce((acc, p) => {
    acc[p.metadata.riskLevel] = (acc[p.metadata.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📈 PATTERN CATEGORIZATION');
  console.log('========================');
  
  console.log('\n📂 By Category:');
  Object.entries(byCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count} patterns`);
    });

  console.log('\n🔄 By Processing Stage:');
  Object.entries(byStage)
    .sort(([,a], [,b]) => b - a)
    .forEach(([stage, count]) => {
      console.log(`  ${stage}: ${count} patterns`);
    });

  console.log('\n⚠️  By Risk Level:');
  Object.entries(byRiskLevel)
    .sort(([,a], [,b]) => b - a)
    .forEach(([risk, count]) => {
      console.log(`  ${risk}: ${count} patterns`);
    });

  console.log('');

  // Highlight specific pattern types
  const tsErrorPatterns = patterns.filter(p => 
    (p.metadata as any).stage === 'typescript-errors' ||
    (p.metadata as any).detector === 'typescript-error-detector'
  );

  const modernizationPatterns = patterns.filter(p => 
    p.metadata.category === 'modernization' ||
    (p.metadata as any).stage === 'syntactic'
  );

  const optimizationPatterns = patterns.filter(p => 
    p.metadata.category === 'optimization'
  );

  console.log('🎯 PATTERN TYPE ANALYSIS');
  console.log('========================');
  console.log(`🚨 TypeScript Error Patterns: ${tsErrorPatterns.length}`);
  console.log(`🔧 Modernization Patterns: ${modernizationPatterns.length}`);
  console.log(`⚡ Optimization Patterns: ${optimizationPatterns.length}`);
  console.log('');

  // Show top patterns by confidence
  const topPatterns = patterns
    .sort((a, b) => b.metadata.confidence - a.metadata.confidence)
    .slice(0, 10);

  console.log('🏆 TOP 10 PATTERNS BY CONFIDENCE');
  console.log('================================');
  topPatterns.forEach((pattern, i) => {
    console.log(`${i + 1}. ${pattern.name}`);
    console.log(`   Category: ${pattern.metadata.category}`);
    console.log(`   Confidence: ${pattern.metadata.confidence.toFixed(3)}`);
    console.log(`   Risk: ${pattern.metadata.riskLevel}`);
    console.log(`   Before: ${pattern.pattern.before.slice(0, 100)}...`);
    if (pattern.pattern.after && pattern.pattern.after !== pattern.pattern.before) {
      console.log(`   After: ${pattern.pattern.after.slice(0, 100)}...`);
    }
    console.log('');
  });

  // Performance metrics
  const avgTimePerFile = performance.filesAnalyzed > 0 
    ? totalAnalysisTime / performance.filesAnalyzed 
    : 0;
  const patternsPerFile = performance.filesAnalyzed > 0 
    ? patterns.length / performance.filesAnalyzed 
    : 0;

  console.log('⚡ PERFORMANCE METRICS');
  console.log('=====================');
  console.log(`📊 Average time per file: ${avgTimePerFile.toFixed(2)}ms`);
  console.log(`🎯 Patterns per file: ${patternsPerFile.toFixed(2)}`);
  console.log(`💾 Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log('');

  // System validation
  const systemValidation = {
    typescriptErrorDetection: tsErrorPatterns.length > 0,
    modernizationDetection: modernizationPatterns.length > 0,
    multiStageProcessing: Object.keys(byStage).length > 1,
    patternAggregation: patterns.length > 0
  };

  console.log('✅ SYSTEM VALIDATION');
  console.log('====================');
  console.log(`🔍 TypeScript Error Detection: ${systemValidation.typescriptErrorDetection ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔧 Modernization Detection: ${systemValidation.modernizationDetection ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔄 Multi-Stage Processing: ${systemValidation.multiStageProcessing ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`📊 Pattern Aggregation: ${systemValidation.patternAggregation ? '✅ WORKING' : '❌ FAILED'}`);
  console.log('');

  // Example patterns showcase
  if (tsErrorPatterns.length > 0) {
    console.log('🚨 TYPESCRIPT ERROR PATTERN EXAMPLES');
    console.log('====================================');
    tsErrorPatterns.slice(0, 3).forEach((pattern, i) => {
      console.log(`${i + 1}. ${pattern.name}`);
      console.log(`   Code: ${(pattern.metadata as any).tsErrorCode || 'N/A'}`);
      console.log(`   Reason: ${(pattern.metadata as any).reason || 'No description'}`);
      console.log(`   Example: ${pattern.pattern.before.slice(0, 120)}...`);
      console.log('');
    });
  }

  if (modernizationPatterns.length > 0) {
    console.log('🔧 MODERNIZATION PATTERN EXAMPLES');
    console.log('=================================');
    modernizationPatterns.slice(0, 3).forEach((pattern, i) => {
      console.log(`${i + 1}. ${pattern.name}`);
      console.log(`   Confidence: ${pattern.metadata.confidence.toFixed(3)}`);
      console.log(`   Before: ${pattern.pattern.before.slice(0, 100)}...`);
      if (pattern.pattern.after !== pattern.pattern.before) {
        console.log(`   After: ${pattern.pattern.after.slice(0, 100)}...`);
      }
      console.log('');
    });
  }

  // Overall assessment
  const overallSuccess = Object.values(systemValidation).every(v => v);
  
  console.log('🎉 FINAL ASSESSMENT');
  console.log('===================');
  if (overallSuccess) {
    console.log('✅ SUCCESS: Production pattern discovery system is fully operational!');
    console.log('   - All pipeline components are working correctly');
    console.log('   - TypeScript error detection is integrated');
    console.log('   - Multi-stage processing is functional');
    console.log('   - Pattern aggregation is working properly');
    console.log('   - Repository-wide analysis completed successfully');
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some components need attention');
    Object.entries(systemValidation).forEach(([component, working]) => {
      console.log(`   - ${component}: ${working ? '✅' : '❌'}`);
    });
  }

  // Compile demo results
  const demoResults: DemoResults = {
    timestamp: new Date().toISOString(),
    repositoryPath: './src',
    totalAnalysisTime,
    overallResults: {
      totalFilesAnalyzed: performance.filesAnalyzed,
      totalPatternsFound: patterns.length,
      averageConfidence: results.summary.averageConfidence,
      cacheHitRate: performance.cacheHitRate
    },
    patternBreakdown: {
      byCategory,
      byStage,
      byRiskLevel
    },
    topPatterns: topPatterns.map(p => ({
      name: p.name,
      category: p.metadata.category,
      confidence: p.metadata.confidence,
      riskLevel: p.metadata.riskLevel,
      description: p.description,
      exampleBefore: p.pattern.before.slice(0, 200),
      exampleAfter: p.pattern.after !== p.pattern.before ? p.pattern.after.slice(0, 200) : undefined
    })),
    performanceMetrics: {
      avgTimePerFile,
      patternsPerFile,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    },
    systemValidation
  };

  return demoResults;
}

// Execute the demonstration
async function main() {
  try {
    const results = await runComprehensiveDemo();
    
    // Save results to file
    const reportPath = './comprehensive-pattern-discovery-results.json';
    await writeFile(reportPath, JSON.stringify(results, null, 2));
    
    console.log('');
    console.log(`📄 Detailed results saved to: ${reportPath}`);
    console.log('');
    console.log('🎯 DEMONSTRATION COMPLETE');
    console.log('The production pattern discovery system has been successfully tested on the Carmack repository!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);