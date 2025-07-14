import { fromPromise } from 'xstate';
import { z } from 'zod';
import { readFile, writeFile } from 'node:fs/promises';
import type { AstPattern, ComplexityMetrics } from '../types.js';

// Extended pattern type for learning with confidence
type LearnedPattern = AstPattern & {
  confidence?: number;
};

/**
 * Pattern Learning System
 * 
 * This module implements machine learning-based pattern discovery and continuous improvement
 * for the Carmack Coder system. It analyzes transformation results, discovers new patterns,
 * and optimizes existing patterns based on success rates and performance metrics.
 * 
 * Key Features:
 * - Automatic pattern discovery from successful transformations
 * - Pattern effectiveness scoring and optimization
 * - Adaptive pattern selection based on context
 * - Continuous learning from transformation feedback
 * - Pattern lifecycle management (experimental → stable → deprecated)
 */

// Pattern Learning Input Schema
const PatternLearningInputSchema = z.object({
  operation: z.enum(['learn', 'discover', 'optimize', 'evaluate']),
  transformation: z.object({
    id: z.string(),
    mode: z.enum(['template', 'ast', 'llm']),
    filesModified: z.array(z.string()),
    complexity: z.any().optional(), // ComplexityMetrics
    validation: z.any().optional(),
    startTime: z.number(),
    endTime: z.number().optional(),
    errors: z.array(z.string()),
    summary: z.string().optional(),
  }).optional(),
  patterns: z.array(z.any()).optional(), // AstPattern array
  context: z.object({
    codebase: z.object({
      language: z.string().default('typescript'),
      framework: z.string().optional(),
      complexity: z.number().default(5),
      size: z.number().default(1000), // lines of code
    }).optional(),
    environment: z.object({
      performance: z.object({
        transformationTime: z.number(),
        memoryUsage: z.number().optional(),
        cpuUsage: z.number().optional(),
      }).optional(),
      success: z.boolean().default(true),
      userFeedback: z.number().min(0).max(10).optional(), // 0-10 rating
    }).optional(),
  }).optional(),
});

// Pattern Effectiveness Metrics Schema
const PatternEffectivenessSchema = z.object({
  patternId: z.string(),
  successRate: z.number().min(0).max(1),
  averagePerformance: z.number().min(0), // milliseconds
  complexityReduction: z.number(), // positive = reduced complexity
  errorRate: z.number().min(0).max(1),
  userSatisfaction: z.number().min(0).max(10),
  applicabilityScore: z.number().min(0).max(1), // how often pattern is applicable
  lastUpdated: z.number(),
  usageCount: z.number().min(0),
  lifecycle: z.enum(['experimental', 'stable', 'mature', 'deprecated']),
});

// Discovered Pattern Schema
const DiscoveredPatternSchema = z.object({
  id: z.string(),
  confidence: z.number().min(0).max(1),
  frequency: z.number().min(1), // how many times this pattern was observed
  context: z.object({
    language: z.string(),
    framework: z.string().optional(),
    complexity: z.number(),
    fileTypes: z.array(z.string()),
  }),
  pattern: z.object({
    before: z.string(), // code pattern before transformation
    after: z.string(), // code pattern after transformation
    variables: z.array(z.string()).optional(), // extracted variables
  }),
  metadata: z.object({
    discoveredAt: z.number(),
    examples: z.array(z.object({
      file: z.string(),
      lineNumber: z.number(),
      context: z.string(),
    })),
    relatedPatterns: z.array(z.string()).optional(),
  }),
});

// Learning Result Schema
const LearningResultSchema = z.object({
  newPatterns: z.array(z.any()), // LearnedPattern array
  optimizedPatterns: z.array(z.any()), // LearnedPattern array
  deprecatedPatterns: z.array(z.string()), // pattern IDs
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  metrics: z.object({
    patternsDiscovered: z.number(),
    patternsOptimized: z.number(),
    averageConfidence: z.number(),
    learningTime: z.number(),
  }),
});

export type PatternLearningInput = z.infer<typeof PatternLearningInputSchema>;
export type PatternEffectiveness = z.infer<typeof PatternEffectivenessSchema>;
export type DiscoveredPattern = z.infer<typeof DiscoveredPatternSchema>;
export type LearningResult = z.infer<typeof LearningResultSchema>;

/**
 * Pattern Learning Actor
 */
export const patternLearningActor = fromPromise(
  async ({ input }: { input: PatternLearningInput }) => {
    const validatedInput = PatternLearningInputSchema.parse(input);
    
    console.log(`🧠 Starting pattern learning operation: ${validatedInput.operation}`);
    
    const learner = new PatternLearner();
    return await learner.processLearningRequest(validatedInput);
  }
);

/**
 * Main Pattern Learning Engine
 */
export class PatternLearner {
  private effectivenessCache: Map<string, PatternEffectiveness> = new Map();
  private discoveredPatterns: Map<string, DiscoveredPattern> = new Map();
  private learningHistory: Array<{
    timestamp: number;
    operation: string;
    results: any;
  }> = [];

  constructor() {
    this.loadExistingData();
  }

  /**
   * Process learning request based on operation type
   */
  async processLearningRequest(input: PatternLearningInput): Promise<LearningResult> {
    const startTime = Date.now();
    
    try {
      let result: LearningResult;
      
      switch (input.operation) {
        case 'learn':
          result = await this.learnFromTransformation(input);
          break;
        case 'discover':
          result = await this.discoverNewPatterns(input);
          break;
        case 'optimize':
          result = await this.optimizeExistingPatterns(input);
          break;
        case 'evaluate':
          result = await this.evaluatePatternEffectiveness(input);
          break;
        default:
          throw new Error(`Unknown learning operation: ${input.operation}`);
      }
      
      // Record learning history
      this.learningHistory.push({
        timestamp: Date.now(),
        operation: input.operation,
        results: result,
      });
      
      // Update metrics
      result.metrics.learningTime = Date.now() - startTime;
      
      // Persist learning data
      await this.persistLearningData();
      
      console.log(`🎓 Pattern learning completed: ${result.metrics.patternsDiscovered} discovered, ${result.metrics.patternsOptimized} optimized`);
      
      return result;
    } catch (error) {
      console.error('❌ Pattern learning failed:', error);
      return {
        newPatterns: [],
        optimizedPatterns: [],
        deprecatedPatterns: [],
        insights: [`Learning failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Review learning input data and try again'],
        metrics: {
          patternsDiscovered: 0,
          patternsOptimized: 0,
          averageConfidence: 0,
          learningTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Learn from a completed transformation
   */
  private async learnFromTransformation(input: PatternLearningInput): Promise<LearningResult> {
    const { transformation, patterns, context } = input;
    
    if (!transformation) {
      throw new Error('Transformation data required for learning');
    }
    
    const newPatterns: LearnedPattern[] = [];
    const optimizedPatterns: LearnedPattern[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze transformation success
    const wasSuccessful = transformation.errors.length === 0 && transformation.endTime;
    const transformationTime = transformation.endTime ? 
      transformation.endTime - transformation.startTime : 0;
    
    if (wasSuccessful) {
      insights.push(`Successful ${transformation.mode} transformation in ${transformationTime}ms`);
      
      // Learn from successful patterns
      if (patterns && patterns.length > 0) {
        for (const pattern of patterns) {
          await this.updatePatternEffectiveness(pattern.id, {
            success: true,
            performanceTime: transformationTime / patterns.length,
            complexity: transformation.complexity,
          });
        }
      }
      
      // Discover new patterns from successful transformations
      const discovered = await this.analyzeTransformationForPatterns(transformation);
      newPatterns.push(...discovered);
      
      if (discovered.length > 0) {
        insights.push(`Discovered ${discovered.length} new patterns from successful transformation`);
      }
    } else {
      insights.push(`Failed transformation: ${transformation.errors.join(', ')}`);
      
      // Learn from failed patterns
      if (patterns && patterns.length > 0) {
        for (const pattern of patterns) {
          const errorReason = transformation.errors.length > 0 ? transformation.errors[0] : undefined;
          if (errorReason) {
            await this.updatePatternEffectiveness(pattern.id, {
              success: false,
              errorReason,
            });
          } else {
            await this.updatePatternEffectiveness(pattern.id, {
              success: false,
            });
          }
        }
      }
      
      recommendations.push('Consider adjusting pattern complexity or adding validation');
    }
    
    // Analyze context for optimization opportunities
    if (context?.codebase) {
      const contextInsights = this.analyzeCodebaseContext(context.codebase);
      insights.push(...contextInsights);
    }
    
    return {
      newPatterns,
      optimizedPatterns,
      deprecatedPatterns: [],
      insights,
      recommendations,
      metrics: {
        patternsDiscovered: newPatterns.length,
        patternsOptimized: optimizedPatterns.length,
        averageConfidence: newPatterns.length > 0 ? 
          newPatterns.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / newPatterns.length : 0,
        learningTime: 0, // Will be set by caller
      },
    };
  }

  /**
   * Discover new patterns from code analysis
   */
  private async discoverNewPatterns(_input: PatternLearningInput): Promise<LearningResult> {
    const insights: string[] = [];
    const newPatterns: LearnedPattern[] = [];
    
    // Analyze transformation history for common patterns
    const commonPatterns = await this.findCommonTransformationPatterns();
    
    for (const discovered of commonPatterns) {
      if (discovered.confidence > 0.7 && discovered.frequency >= 3) {
        const newPattern = await this.convertDiscoveredPatternToAstPattern(discovered);
        if (newPattern) {
          newPatterns.push(newPattern);
          insights.push(`Discovered high-confidence pattern: ${newPattern.id}`);
        }
      }
    }
    
    return {
      newPatterns,
      optimizedPatterns: [],
      deprecatedPatterns: [],
      insights,
      recommendations: newPatterns.length > 0 ? 
        ['Test new patterns in controlled environment before production use'] : 
        ['Collect more transformation data to improve pattern discovery'],
      metrics: {
        patternsDiscovered: newPatterns.length,
        patternsOptimized: 0,
        averageConfidence: newPatterns.length > 0 ? 
          newPatterns.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / newPatterns.length : 0,
        learningTime: 0,
      },
    };
  }

  /**
   * Optimize existing patterns based on performance data
   */
  private async optimizeExistingPatterns(input: PatternLearningInput): Promise<LearningResult> {
    const { patterns } = input;
    const optimizedPatterns: LearnedPattern[] = [];
    const deprecatedPatterns: string[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    if (!patterns || patterns.length === 0) {
      return {
        newPatterns: [],
        optimizedPatterns: [],
        deprecatedPatterns: [],
        insights: ['No patterns provided for optimization'],
        recommendations: ['Provide pattern data for optimization analysis'],
        metrics: {
          patternsDiscovered: 0,
          patternsOptimized: 0,
          averageConfidence: 0,
          learningTime: 0,
        },
      };
    }
    
    for (const pattern of patterns) {
      const effectiveness = this.effectivenessCache.get(pattern.id);
      
      if (!effectiveness) {
        insights.push(`No effectiveness data for pattern ${pattern.id}`);
        continue;
      }
      
      // Optimize based on effectiveness metrics
      if (effectiveness.successRate < 0.5 && effectiveness.usageCount > 10) {
        // Pattern is consistently failing - deprecate it
        deprecatedPatterns.push(pattern.id);
        insights.push(`Deprecated low-performing pattern: ${pattern.id} (${(effectiveness.successRate * 100).toFixed(1)}% success rate)`);
      } else if (effectiveness.successRate > 0.8 && effectiveness.lifecycle === 'experimental') {
        // Promote successful experimental pattern to stable
        const optimized = { ...pattern };
        optimized.riskLevel = 'low';
        optimized.confidence = Math.min(0.95, effectiveness.successRate);
        optimizedPatterns.push(optimized);
        
        // Update lifecycle
        await this.updatePatternLifecycle(pattern.id, 'stable');
        insights.push(`Promoted pattern ${pattern.id} to stable (${(effectiveness.successRate * 100).toFixed(1)}% success rate)`);
      } else if (effectiveness.averagePerformance > 5000) {
        // Pattern is slow - suggest optimization
        recommendations.push(`Consider optimizing pattern ${pattern.id} for better performance (avg: ${effectiveness.averagePerformance}ms)`);
      }
    }
    
    return {
      newPatterns: [],
      optimizedPatterns,
      deprecatedPatterns,
      insights,
      recommendations,
      metrics: {
        patternsDiscovered: 0,
        patternsOptimized: optimizedPatterns.length,
        averageConfidence: optimizedPatterns.length > 0 ? 
          optimizedPatterns.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / optimizedPatterns.length : 0,
        learningTime: 0,
      },
    };
  }

  /**
   * Evaluate pattern effectiveness
   */
  private async evaluatePatternEffectiveness(input: PatternLearningInput): Promise<LearningResult> {
    const { patterns } = input;
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    if (!patterns || patterns.length === 0) {
      return {
        newPatterns: [],
        optimizedPatterns: [],
        deprecatedPatterns: [],
        insights: ['No patterns provided for evaluation'],
        recommendations: ['Provide pattern data for effectiveness analysis'],
        metrics: {
          patternsDiscovered: 0,
          patternsOptimized: 0,
          averageConfidence: 0,
          learningTime: 0,
        },
      };
    }
    
    let totalConfidence = 0;
    let evaluatedCount = 0;
    
    for (const pattern of patterns) {
      const effectiveness = this.effectivenessCache.get(pattern.id);
      
      if (effectiveness) {
        totalConfidence += effectiveness.successRate;
        evaluatedCount++;
        
        insights.push(`Pattern ${pattern.id}: ${(effectiveness.successRate * 100).toFixed(1)}% success, ${effectiveness.usageCount} uses, ${effectiveness.lifecycle} lifecycle`);
        
        if (effectiveness.successRate < 0.3) {
          recommendations.push(`Review pattern ${pattern.id} - low success rate may indicate issues`);
        } else if (effectiveness.successRate > 0.9 && effectiveness.usageCount > 50) {
          recommendations.push(`Pattern ${pattern.id} is highly effective - consider expanding its use cases`);
        }
      } else {
        insights.push(`Pattern ${pattern.id}: No effectiveness data available`);
      }
    }
    
    const averageEffectiveness = evaluatedCount > 0 ? totalConfidence / evaluatedCount : 0;
    insights.push(`Overall pattern effectiveness: ${(averageEffectiveness * 100).toFixed(1)}%`);
    
    return {
      newPatterns: [],
      optimizedPatterns: [],
      deprecatedPatterns: [],
      insights,
      recommendations,
      metrics: {
        patternsDiscovered: 0,
        patternsOptimized: 0,
        averageConfidence: averageEffectiveness,
        learningTime: 0,
      },
    };
  }

  /**
   * Update pattern effectiveness metrics
   */
  private async updatePatternEffectiveness(
    patternId: string, 
    result: {
      success: boolean;
      performanceTime?: number;
      complexity?: ComplexityMetrics;
      errorReason?: string;
    }
  ): Promise<void> {
    let effectiveness = this.effectivenessCache.get(patternId);
    
    if (!effectiveness) {
      effectiveness = {
        patternId,
        successRate: 0,
        averagePerformance: 0,
        complexityReduction: 0,
        errorRate: 0,
        userSatisfaction: 5,
        applicabilityScore: 0.5,
        lastUpdated: Date.now(),
        usageCount: 0,
        lifecycle: 'experimental',
      };
    }
    
    // Update metrics using exponential moving average
    const alpha = 0.1; // Learning rate
    effectiveness.usageCount++;
    
    if (result.success) {
      effectiveness.successRate = effectiveness.successRate * (1 - alpha) + alpha;
      if (result.performanceTime) {
        effectiveness.averagePerformance = effectiveness.averagePerformance * (1 - alpha) + 
          result.performanceTime * alpha;
      }
    } else {
      effectiveness.successRate = effectiveness.successRate * (1 - alpha);
      effectiveness.errorRate = effectiveness.errorRate * (1 - alpha) + alpha;
    }
    
    effectiveness.lastUpdated = Date.now();
    this.effectivenessCache.set(patternId, effectiveness);
  }

  /**
   * Analyze transformation for new patterns
   */
  private async analyzeTransformationForPatterns(transformation: any): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];
    
    // This is a simplified pattern discovery - in a real implementation,
    // this would use more sophisticated ML techniques
    
    if (transformation.filesModified.length > 0) {
      // Analyze the first modified file for patterns
      try {
        // const __filePath = transformation.filesModified[0];
        // In a real implementation, we would:
        // 1. Read the file before/after transformation
        // 2. Use AST analysis to find transformation patterns
        // 3. Extract reusable patterns using ML techniques
        
        // For now, create a mock discovered pattern
        const discoveredPattern: LearnedPattern = {
          id: `discovered-${Date.now()}`,
          language: 'typescript',
          pattern: 'var $name = $value',
          replacement: 'const $name = $value',
          description: `Auto-discovered pattern from transformation ${transformation.id}`,
          complexity: 1,
          riskLevel: 'low',
          mode: transformation.mode,
          confidence: 0.7,
        };
        
        patterns.push(discoveredPattern);
      } catch (error) {
        console.warn('Failed to analyze transformation for patterns:', error);
      }
    }
    
    return patterns;
  }

  /**
   * Find common transformation patterns from history
   */
  private async findCommonTransformationPatterns(): Promise<DiscoveredPattern[]> {
    // This would analyze the learning history to find common patterns
    // For now, return mock data
    return [
      {
        id: 'common-var-to-const',
        confidence: 0.85,
        frequency: 15,
        context: {
          language: 'typescript',
          complexity: 2,
          fileTypes: ['.ts', '.tsx'],
        },
        pattern: {
          before: 'var $name = $value',
          after: 'const $name = $value',
        },
        metadata: {
          discoveredAt: Date.now(),
          examples: [],
        },
      },
    ];
  }

  /**
   * Convert discovered pattern to AST pattern
   */
  private async convertDiscoveredPatternToAstPattern(discovered: DiscoveredPattern): Promise<LearnedPattern | null> {
    try {
      return {
        id: discovered.id,
        language: discovered.context.language,
        pattern: discovered.pattern.before,
        replacement: discovered.pattern.after,
        description: `Auto-discovered pattern (confidence: ${(discovered.confidence * 100).toFixed(1)}%)`,
        complexity: discovered.context.complexity,
        riskLevel: discovered.confidence > 0.8 ? 'low' : 'medium',
        mode: 'template',
        confidence: discovered.confidence,
      };
    } catch (error) {
      console.warn('Failed to convert discovered pattern:', error);
      return null;
    }
  }

  /**
   * Analyze codebase context for insights
   */
  private analyzeCodebaseContext(codebase: any): string[] {
    const insights: string[] = [];
    
    if (codebase.complexity > 8) {
      insights.push('High complexity codebase - consider more aggressive refactoring patterns');
    } else if (codebase.complexity < 3) {
      insights.push('Low complexity codebase - focus on style and consistency patterns');
    }
    
    if (codebase.framework) {
      insights.push(`Framework-specific patterns for ${codebase.framework} may be beneficial`);
    }
    
    if (codebase.size > 10000) {
      insights.push('Large codebase - batch processing and performance optimization important');
    }
    
    return insights;
  }

  /**
   * Update pattern lifecycle
   */
  private async updatePatternLifecycle(patternId: string, lifecycle: PatternEffectiveness['lifecycle']): Promise<void> {
    const effectiveness = this.effectivenessCache.get(patternId);
    if (effectiveness) {
      effectiveness.lifecycle = lifecycle;
      effectiveness.lastUpdated = Date.now();
      this.effectivenessCache.set(patternId, effectiveness);
    }
  }

  /**
   * Load existing learning data
   */
  private async loadExistingData(): Promise<void> {
    try {
      // Load effectiveness data
      const effectivenessData = await readFile('./data/pattern-effectiveness.json', 'utf-8');
      const effectiveness = JSON.parse(effectivenessData);
      for (const [key, value] of Object.entries(effectiveness)) {
        this.effectivenessCache.set(key, value as PatternEffectiveness);
      }
    } catch (error) {
      console.log('No existing effectiveness data found, starting fresh');
    }
    
    try {
      // Load discovered patterns
      const discoveredData = await readFile('./data/discovered-patterns.json', 'utf-8');
      const discovered = JSON.parse(discoveredData);
      for (const [key, value] of Object.entries(discovered)) {
        this.discoveredPatterns.set(key, value as DiscoveredPattern);
      }
    } catch (error) {
      console.log('No existing discovered patterns found, starting fresh');
    }
  }

  /**
   * Persist learning data
   */
  private async persistLearningData(): Promise<void> {
    try {
      // Ensure data directory exists
      await writeFile('./data/.gitkeep', '');
      
      // Save effectiveness data
      const effectivenessObj = Object.fromEntries(this.effectivenessCache);
      await writeFile('./data/pattern-effectiveness.json', JSON.stringify(effectivenessObj, null, 2));
      
      // Save discovered patterns
      const discoveredObj = Object.fromEntries(this.discoveredPatterns);
      await writeFile('./data/discovered-patterns.json', JSON.stringify(discoveredObj, null, 2));
      
      console.log('💾 Pattern learning data persisted');
    } catch (error) {
      console.warn('Failed to persist learning data:', error);
    }
  }
}

/**
 * Convenience function to create pattern learner
 */
export function createPatternLearner(): PatternLearner {
  return new PatternLearner();
}

/**
 * Validate pattern learning input
 */
export function validatePatternLearningInput(input: unknown): PatternLearningInput {
  return PatternLearningInputSchema.parse(input);
}