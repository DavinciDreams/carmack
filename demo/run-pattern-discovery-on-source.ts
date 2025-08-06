#!/usr/bin/env bun

/**
 * Pattern Discovery Demo: Analyze Carmack Coder Source Repository
 * 
 * This demo runs the production pattern discovery system against the actual
 * Carmack Coder source code to find real transformation patterns, modernization
 * opportunities, and code improvements.
 */

import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

// Import production pattern discovery components
import { 
  ProductionRepositoryAnalyzer,
  type RepositoryAnalysisConfig
} from '../src/analysis/repository-analyzer.js';

import {
  PatternDetectionPipeline,
  type PatternDetectionPipelineConfig
} from '../src/analysis/pattern-detection-pipeline.js';

import {
  executeProductionPatternDiscovery,
  ProductionPatternDiscoveryConfigSchema,
  type ProductionPatternDiscoveryContext
} from '../src/analysis/production-pattern-discovery.js';

import {
  type PatternDiscoveryRequest,
  type DiscoveredPattern
} from '../src/actors/pattern-discovery.js';

/**
 * Configuration for analyzing the Carmack Coder repository
 */
const ANALYSIS_CONFIG = {
  repository: {
    path: process.cwd(), // Current Carmack Coder repository
    includeLanguages: ['typescript', 'javascript', 'json', 'yaml', 'markdown'],
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.carmack-cache/**',
      'coverage/**',
      '*.log',
      'bun.lockb'
    ],
    maxFileSize: 500 * 1024, // 500KB max file size
    maxDepth: 8
  },
  discovery: {
    minOccurrences: 2,
    confidenceThreshold: 0.7,
    maxPatterns: 50,
    categories: ['modernization', 'optimization', 'cleanup', 'refactoring', 'performance']
  }
};

/**
 * Pattern categories and their descriptions
 */
const PATTERN_CATEGORIES = {
  modernization: 'Converting legacy JavaScript/TypeScript patterns to modern equivalents',
  optimization: 'Performance improvements and better algorithms',
  cleanup: 'Code cleanup, removing TODOs, fixing formatting',
  refactoring: 'Structural improvements and better organization',
  performance: 'Memory usage, execution speed improvements'
};

/**
 * Main pattern discovery execution
 */
async function runPatternDiscovery(): Promise<void> {
  console.log('🚀 Carmack Coder Pattern Discovery Demo');
  console.log('======================================\n');
  
  const startTime = Date.now();
  
  try {
    // Initialize production components
    console.log('🔧 Initializing pattern discovery system...');
    const repositoryAnalyzer = new ProductionRepositoryAnalyzer();
    const detectionPipeline = new PatternDetectionPipeline({
      caching: {
        enableStageCache: true,
        enableResultCache: true,
        cacheInvalidationStrategy: 'content',
        maxCacheSize: 1000,
        cacheTTL: 3600000 // 1 hour
      },
      optimization: {
        enableEarlyTermination: true,
        confidenceThreshold: 0.8,
        maxPatternsPerFile: 20,
        enableParallelStages: true,
        maxConcurrentStages: 4
      }
    });
    
    const context: ProductionPatternDiscoveryContext = {
      repositoryAnalyzer,
      detectionPipeline,
      config: ProductionPatternDiscoveryConfigSchema.parse({
        repository: {
          enableParallelProcessing: true,
          maxConcurrentFiles: 20,
          enableCaching: true
        },
        pipeline: {
          enableMultiStageAnalysis: true,
          enableSemanticAnalysis: true,
          confidenceThreshold: ANALYSIS_CONFIG.discovery.confidenceThreshold
        }
      })
    };

    // Create pattern discovery request
    const request: PatternDiscoveryRequest = {
      operation: 'discover',
      sources: {
        repositories: [{
          path: ANALYSIS_CONFIG.repository.path,
          language: 'typescript'
        }]
      },
      config: {
        minOccurrences: ANALYSIS_CONFIG.discovery.minOccurrences,
        confidenceThreshold: ANALYSIS_CONFIG.discovery.confidenceThreshold,
        maxPatterns: ANALYSIS_CONFIG.discovery.maxPatterns,
        languages: ANALYSIS_CONFIG.repository.includeLanguages as any[],
        categories: ANALYSIS_CONFIG.discovery.categories,
        complexity: {
          min: 1,
          max: 8
        }
      }
    };

    console.log('🔍 Analyzing Carmack Coder repository...');
    console.log(`   Repository: ${ANALYSIS_CONFIG.repository.path}`);
    console.log(`   Languages: ${ANALYSIS_CONFIG.repository.includeLanguages.join(', ')}`);
    console.log(`   Confidence threshold: ${ANALYSIS_CONFIG.discovery.confidenceThreshold}`);
    console.log('');

    // Execute pattern discovery
    const result = await executeProductionPatternDiscovery(request, context);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Display results
    displayResults(result, duration);
    
    // Generate detailed report
    await generateDetailedReport(result, duration);
    
    // Display recommendations
    displayRecommendations(result.patterns);

  } catch (error) {
    console.error('❌ Pattern discovery failed:', error);
    process.exit(1);
  }
}

/**
 * Display analysis results in console
 */
function displayResults(result: any, duration: number): void {
  console.log('📊 Pattern Discovery Results');
  console.log('============================');
  console.log(`Analysis Duration: ${duration}ms`);
  console.log(`Files Analyzed: ${result.performance.filesAnalyzed}`);
  console.log(`Patterns Discovered: ${result.patterns.length}`);
  console.log(`Average Confidence: ${result.summary.averageConfidence.toFixed(2)}`);
  console.log(`Categories Found: ${result.summary.categories.join(', ')}`);
  console.log('');

  if (result.patterns.length === 0) {
    console.log('🎉 No significant patterns found - your code is already well-optimized!');
    return;
  }

  // Group patterns by category
  const patternsByCategory = groupPatternsByCategory(result.patterns);
  
  for (const [category, patterns] of Object.entries(patternsByCategory)) {
    if (patterns.length === 0) continue;
    
    console.log(`📋 ${category.toUpperCase()} (${patterns.length} patterns)`);
    console.log(`   ${PATTERN_CATEGORIES[category as keyof typeof PATTERN_CATEGORIES] || 'Various improvements'}`);
    
    // Show top 3 patterns in this category
    const topPatterns = patterns
      .sort((a: any, b: any) => b.metadata.confidence - a.metadata.confidence)
      .slice(0, 3);
      
    for (const [index, pattern] of topPatterns.entries()) {
      console.log(`   ${index + 1}. ${pattern.name} (confidence: ${pattern.metadata.confidence.toFixed(2)})`);
      console.log(`      Risk: ${pattern.metadata.riskLevel}, Occurrences: ${pattern.metadata.occurrences}`);
      if (pattern.pattern.before && pattern.pattern.after) {
        console.log(`      Example: "${pattern.pattern.before.slice(0, 40)}..." → "${pattern.pattern.after.slice(0, 40)}..."`);
      }
    }
    console.log('');
  }
}

/**
 * Group patterns by category for better organization
 */
function groupPatternsByCategory(patterns: DiscoveredPattern[]): Record<string, DiscoveredPattern[]> {
  const grouped: Record<string, DiscoveredPattern[]> = {};
  
  for (const category of Object.keys(PATTERN_CATEGORIES)) {
    grouped[category] = [];
  }
  grouped['other'] = [];
  
  for (const pattern of patterns) {
    const category = pattern.metadata.category;
    if (grouped[category]) {
      grouped[category].push(pattern);
    } else {
      grouped['other'].push(pattern);
    }
  }
  
  return grouped;
}

/**
 * Generate detailed JSON report
 */
async function generateDetailedReport(result: any, duration: number): Promise<void> {
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      analysisVersion: '1.0.0',
      repository: 'carmack-coder',
      analysisDuration: duration,
      summary: result.summary
    },
    performance: result.performance,
    patterns: result.patterns.map((pattern: DiscoveredPattern) => ({
      id: pattern.id,
      name: pattern.name,
      description: pattern.description,
      category: pattern.metadata.category,
      language: pattern.metadata.language,
      confidence: pattern.metadata.confidence,
      riskLevel: pattern.metadata.riskLevel,
      occurrences: pattern.metadata.occurrences,
      successRate: pattern.metadata.successRate,
      complexity: pattern.metadata.complexity,
      before: pattern.pattern.before,
      after: pattern.pattern.after,
      variables: pattern.pattern.variables,
      examples: pattern.evidence.examples.slice(0, 3), // Top 3 examples
      statistics: pattern.evidence.statistics
    })),
    recommendations: generateAutomatedRecommendations(result.patterns),
    analysis: {
      codeHealth: calculateCodeHealth(result.patterns),
      technicalDebt: assessTechnicalDebt(result.patterns),
      modernizationOpportunities: countModernizationOpportunities(result.patterns)
    }
  };

  const reportPath = join(process.cwd(), 'pattern-discovery-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

/**
 * Display actionable recommendations
 */
function displayRecommendations(patterns: DiscoveredPattern[]): void {
  console.log('💡 Recommendations');
  console.log('==================');
  
  const highConfidencePatterns = patterns.filter(p => p.metadata.confidence > 0.8);
  const modernizationPatterns = patterns.filter(p => p.metadata.category === 'modernization');
  const cleanupPatterns = patterns.filter(p => p.metadata.category === 'cleanup');
  
  if (highConfidencePatterns.length > 0) {
    console.log(`🎯 ${highConfidencePatterns.length} high-confidence patterns ready for immediate transformation`);
  }
  
  if (modernizationPatterns.length > 0) {
    console.log(`🔄 ${modernizationPatterns.length} modernization opportunities to improve code style`);
  }
  
  if (cleanupPatterns.length > 0) {
    console.log(`🧹 ${cleanupPatterns.length} cleanup opportunities to improve code quality`);
  }
  
  // Priority recommendations
  console.log('\n🚀 Priority Actions:');
  
  if (modernizationPatterns.length > 0) {
    console.log('   1. Address var-to-const/let conversions for better variable semantics');
  }
  
  if (cleanupPatterns.length > 0) {
    console.log('   2. Resolve TODO comments and technical debt markers');
  }
  
  if (patterns.some(p => p.metadata.category === 'performance')) {
    console.log('   3. Apply performance optimizations for better execution speed');
  }
  
  console.log('\n✨ Run the transformations using the Carmack Coder transformation engine!');
}

/**
 * Generate automated recommendations
 */
function generateAutomatedRecommendations(patterns: DiscoveredPattern[]): string[] {
  const recommendations: string[] = [];
  
  const categories = groupPatternsByCategory(patterns);
  
  for (const [category, categoryPatterns] of Object.entries(categories)) {
    if (categoryPatterns.length === 0) continue;
    
    const highConfidence = categoryPatterns.filter(p => p.metadata.confidence > 0.8).length;
    const totalOccurrences = categoryPatterns.reduce((sum, p) => sum + p.metadata.occurrences, 0);
    
    recommendations.push(
      `${category}: ${categoryPatterns.length} patterns found (${highConfidence} high-confidence, ${totalOccurrences} total occurrences)`
    );
  }
  
  return recommendations;
}

/**
 * Calculate overall code health score
 */
function calculateCodeHealth(patterns: DiscoveredPattern[]): number {
  if (patterns.length === 0) return 100;
  
  const totalOccurrences = patterns.reduce((sum, p) => sum + p.metadata.occurrences, 0);
  const avgConfidence = patterns.reduce((sum, p) => sum + p.metadata.confidence, 0) / patterns.length;
  
  // Lower score for more patterns found (more issues)
  // Higher score for higher confidence (reliable detections)
  const healthScore = Math.max(0, 100 - (totalOccurrences * 2) + (avgConfidence * 10));
  
  return Math.round(healthScore);
}

/**
 * Assess technical debt level
 */
function assessTechnicalDebt(patterns: DiscoveredPattern[]): string {
  const cleanupPatterns = patterns.filter(p => p.metadata.category === 'cleanup');
  const todoCount = cleanupPatterns.filter(p => p.name.toLowerCase().includes('todo')).length;
  
  if (todoCount === 0) return 'Low';
  if (todoCount < 5) return 'Medium';
  return 'High';
}

/**
 * Count modernization opportunities
 */
function countModernizationOpportunities(patterns: DiscoveredPattern[]): number {
  return patterns.filter(p => p.metadata.category === 'modernization').length;
}

/**
 * Command line interface
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Carmack Coder Pattern Discovery Demo

USAGE:
  bun run demo/run-pattern-discovery-on-source.ts [options]

OPTIONS:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --dry-run      Show what would be analyzed without running

EXAMPLES:
  bun run demo/run-pattern-discovery-on-source.ts
  bun run demo/run-pattern-discovery-on-source.ts --verbose

This demo analyzes the Carmack Coder source repository to discover:
- Modernization opportunities (var → const/let, etc.)
- Code cleanup opportunities (TODO comments, etc.)
- Performance optimization patterns
- Refactoring suggestions

Results are displayed in the console and saved to 'pattern-discovery-report.json'
    `);
    process.exit(0);
  }
  
  if (args.includes('--dry-run')) {
    console.log('🔍 Pattern Discovery Dry Run');
    console.log('============================');
    console.log(`Repository: ${ANALYSIS_CONFIG.repository.path}`);
    console.log(`Languages: ${ANALYSIS_CONFIG.repository.includeLanguages.join(', ')}`);
    console.log(`Exclude patterns: ${ANALYSIS_CONFIG.repository.excludePatterns.join(', ')}`);
    console.log(`Min occurrences: ${ANALYSIS_CONFIG.discovery.minOccurrences}`);
    console.log(`Confidence threshold: ${ANALYSIS_CONFIG.discovery.confidenceThreshold}`);
    console.log(`Max patterns: ${ANALYSIS_CONFIG.discovery.maxPatterns}`);
    console.log('\nRun without --dry-run to execute the analysis.');
    process.exit(0);
  }
  
  // Set verbose mode
  if (args.includes('--verbose') || args.includes('-v')) {
    process.env.VERBOSE = 'true';
  }
  
  runPatternDiscovery()
    .then(() => {
      console.log('\n🎉 Pattern discovery completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Pattern discovery failed:', error);
      process.exit(1);
    });
}

export { runPatternDiscovery, ANALYSIS_CONFIG };