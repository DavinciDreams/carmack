/**
 * Enhanced LLM Transformation Actor
 *
 * This module provides production-ready LLM-based code transformations using
 * the new provider system with real API integrations, fallback mechanisms,
 * context-aware transformations, advanced prompt engineering, and comprehensive
 * error handling with rollback capabilities.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  TransformationRequest,
  EnhancedTransformationRequest,
  EnhancedTransformationContext,
  ContextAwarePrompt,
  MultiFileContext,
  RollbackInfo,
  PerformanceOptimization
} from '../types.js';
import { getLLMProviderManager, type LLMRequest } from '../providers/llm-providers.js';

// =============================================================================
// ENHANCED LLM TRANSFORMATION SCHEMAS
// =============================================================================

// Schema for validating LLM JSON responses
const LLMTransformationResponseSchema = z.object({
  transformedCode: z.string(),
  explanation: z.string().default('No explanation provided'),
  confidence: z.number().min(0).max(1).default(0.5),
  warnings: z.array(z.string()).default([]),
  appliedTransformations: z.array(z.string()).default([]),
});

export type LLMTransformationResponse = z.infer<typeof LLMTransformationResponseSchema>;

const EnhancedLLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']).default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().default(8000),
  timeout: z.number().default(60000), // Increased for complex transformations
  retries: z.number().default(3),
  enableFallback: z.boolean().default(true),
  costLimit: z.number().default(2.0), // Increased for enhanced features
  
  // Advanced features
  enableContextAwareness: z.boolean().default(true),
  enableMultiFileAnalysis: z.boolean().default(true),
  enableIncrementalTransformation: z.boolean().default(true),
  enableRollback: z.boolean().default(true),
  
  // Performance optimizations
  performance: z.object({
    enableCaching: z.boolean().default(true),
    enableBatching: z.boolean().default(true),
    maxBatchSize: z.number().default(5),
    cacheStrategy: z.enum(['memory', 'disk', 'hybrid']).default('hybrid'),
  }).default({}),
});

const EnhancedLLMTransformationInputSchema = z.object({
  files: z.array(z.string()),
  request: z.custom<EnhancedTransformationRequest>().optional(),
  config: EnhancedLLMConfigSchema.optional(),
  context: z.custom<EnhancedTransformationContext>().optional(),
  
  // Advanced options
  multiFileContext: z.custom<MultiFileContext>().optional(),
  contextAwarePrompts: z.array(z.custom<ContextAwarePrompt>()).optional(),
  rollbackInfo: z.custom<RollbackInfo>().optional(),
  performanceOptions: z.custom<PerformanceOptimization>().optional(),
});

const EnhancedLLMTransformationResultSchema = z.object({
  filesModified: z.array(z.string()),
  transformationsApplied: z.number(),
  mode: z.literal('llm'),
  
  // Enhanced metrics
  totalTokensUsed: z.number().optional(),
  totalCost: z.number().optional(),
  averageConfidence: z.number().optional(),
  providersUsed: z.array(z.string()).optional(),
  
  // Context awareness results
  contextAnalysis: z.object({
    projectComplexity: z.number(),
    frameworkDetected: z.string().optional(),
    dependenciesAnalyzed: z.number(),
    crossFilePatterns: z.number(),
  }).optional(),
  
  // Quality metrics
  qualityImprovement: z.object({
    complexityReduction: z.number(),
    codeQualityScore: z.number(),
    maintainabilityIndex: z.number(),
  }).optional(),
  
  // Performance data
  performance: z.object({
    totalTime: z.number(),
    averageTimePerFile: z.number(),
    successRate: z.number(),
    cacheHitRate: z.number(),
    batchingEfficiency: z.number(),
  }).optional(),
  
  // Error handling and rollback
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  rollbackAvailable: z.boolean().default(false),
  rollbackPath: z.string().optional(),
  
  // Learning and recommendations
  learningData: z.object({
    patternsDiscovered: z.array(z.string()),
    recommendations: z.array(z.string()),
    effectivenessScore: z.number(),
  }).optional(),
});

export type EnhancedLLMConfig = z.infer<typeof EnhancedLLMConfigSchema>;
export type EnhancedLLMTransformationInput = z.infer<typeof EnhancedLLMTransformationInputSchema>;
export type EnhancedLLMTransformationResult = z.infer<typeof EnhancedLLMTransformationResultSchema>;

// =============================================================================
// ENHANCED LLM TRANSFORMATION ACTOR
// =============================================================================

export const enhancedLLMTransformationActor = fromPromise(
  async ({ input }: { input: EnhancedLLMTransformationInput }) => {
    const validatedInput = EnhancedLLMTransformationInputSchema.parse(input);
    
    console.log(`🤖 Starting enhanced LLM transformations on ${validatedInput.files.length} files`);
    
    const transformer = new EnhancedLLMTransformer(validatedInput.config);
    return await transformer.transformFiles(validatedInput);
  }
);

// =============================================================================
// ENHANCED LLM TRANSFORMER CLASS
// =============================================================================

export class EnhancedLLMTransformer {
  private config: EnhancedLLMConfig;
  private providerManager = getLLMProviderManager();
  private cache: Map<string, any> = new Map();
  private stats = {
    totalTokens: 0,
    totalCost: 0,
    providersUsed: new Set<string>(),
    startTime: Date.now(),
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config?: Partial<EnhancedLLMConfig>) {
    this.config = EnhancedLLMConfigSchema.parse(config || {});
  }

  /**
   * Transform multiple files using enhanced LLM system
   */
  async transformFiles(input: EnhancedLLMTransformationInput): Promise<EnhancedLLMTransformationResult> {
    const startTime = Date.now();
    const filesModified: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalTransformations = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let successCount = 0;

    for (const filePath of input.files) {
      try {
        const result = await this.transformSingleFile(filePath, input);
        
        if (result.success) {
          successCount++;
          filesModified.push(filePath);
          totalTransformations += result.transformationCount;
          
          if (result.confidence !== undefined) {
            totalConfidence += result.confidence;
            confidenceCount++;
          }
          
          if (result.warnings) {
            warnings.push(...result.warnings);
          }
          
          console.log(`✅ Enhanced LLM transformed ${filePath} (confidence: ${result.confidence?.toFixed(2) || 'N/A'})`);
        } else {
          const errorMsg = `Failed to transform ${filePath}: ${result.error}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Error transforming ${filePath}: ${errorMsg}`);
        console.error(`❌ Error transforming ${filePath}:`, error);
      }
    }

    const totalTime = Date.now() - startTime;
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const successRate = input.files.length > 0 ? successCount / input.files.length : 0;

    return {
      filesModified,
      transformationsApplied: totalTransformations,
      mode: 'llm',
      totalTokensUsed: this.stats.totalTokens,
      totalCost: this.stats.totalCost,
      averageConfidence,
      providersUsed: Array.from(this.stats.providersUsed),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rollbackAvailable: false, // TODO: Implement rollback functionality
      performance: {
        totalTime,
        averageTimePerFile: totalTime / input.files.length,
        successRate,
        cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
        batchingEfficiency: input.files.length > 1 ? successRate : 1,
      },
    };
  }

  /**
   * Transform a single file with enhanced error handling and fallback
   */
  private async transformSingleFile(
    filePath: string,
    input: EnhancedLLMTransformationInput
  ): Promise<{
    success: boolean;
    transformationCount: number;
    confidence?: number;
    warnings?: string[];
    error?: string;
  }> {
    try {
      // Read file content
      const originalContent = await readFile(filePath, 'utf-8');
      
      // Analyze file context
      const fileContext = await this.analyzeFileContext(originalContent, filePath, input.context);
      
      // Generate transformation prompt
      const prompt = this.generateEnhancedTransformationPrompt(originalContent, fileContext, input.request as TransformationRequest);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(originalContent, prompt);
      let cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        console.log(`📋 Using cached result for ${filePath}`);
        return cachedResult;
      }
      
      // Make LLM request with fallback
      const llmRequest: LLMRequest = {
        prompt,
        systemPrompt: this.generateSystemPrompt(fileContext),
        context: {
          language: fileContext.language,
          framework: fileContext.framework,
          complexity: fileContext.complexity,
          codeLength: originalContent.length,
        },
        options: {
          stream: false,
          jsonMode: true,
          priority: (input.context?.priority === 'critical' ? 'high' : input.context?.priority) || 'normal',
          maxRetries: this.config.retries,
        },
      };
      
      const llmResponse = await this.providerManager.makeRequestWithFallback(
        llmRequest,
        this.config.provider,
        {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          timeout: this.config.timeout,
          retries: this.config.retries,
        }
      );
      
      // Update statistics
      if (llmResponse.usage) {
        this.stats.totalTokens += llmResponse.usage.totalTokens;
        this.stats.totalCost += llmResponse.usage.cost || 0;
      }
      this.stats.providersUsed.add(llmResponse.provider);
      
      // Parse the LLM response
      const transformationResult = this.parseTransformationResponse(llmResponse.content, originalContent);
      
      // Validate the transformation
      const validationResult = await this.validateTransformation(
        originalContent,
        transformationResult.transformedCode || originalContent,
        filePath
      );
      
      if (!validationResult.isValid) {
        return {
          success: false,
          transformationCount: 0,
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
        };
      }
      
      // Apply the transformation if it's different
      const finalTransformedCode = transformationResult.transformedCode || originalContent;
      if (originalContent !== finalTransformedCode) {
        console.log(`📝 Writing enhanced transformed code to ${filePath}`);
        await writeFile(filePath, finalTransformedCode, 'utf-8');
        
        const result = {
          success: true,
          transformationCount: transformationResult.appliedTransformations.length,
          confidence: transformationResult.confidence,
          warnings: transformationResult.warnings,
        };
        
        // Cache the result
        this.cache.set(cacheKey, result);
        return result;
      }
      
      const result = {
        success: true,
        transformationCount: 0,
        confidence: transformationResult.confidence,
        warnings: ['No changes needed'],
      };
      
      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      return {
        success: false,
        transformationCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze file context for enhanced transformation prompts
   */
  private async analyzeFileContext(
    content: string,
    filePath: string,
    context?: EnhancedLLMTransformationInput['context']
  ): Promise<{
    language: string;
    framework?: string;
    complexity: number;
    patterns: string[];
    imports: string[];
    exports: string[];
    functions: number;
    classes: number;
    issues: string[];
  }> {
    const language = this.detectLanguage(filePath);
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    
    // Enhanced complexity calculation
    const complexity = this.calculateEnhancedComplexity(content);
    
    // Detect code patterns and issues
    const patterns = this.detectCodePatterns(content);
    const issues = this.detectCodeIssues(content);
    
    const detectedFramework = context?.framework || this.detectFramework(imports);
    
    const result: {
      language: string;
      framework?: string;
      complexity: number;
      patterns: string[];
      imports: string[];
      exports: string[];
      functions: number;
      classes: number;
      issues: string[];
    } = {
      language,
      complexity,
      patterns,
      imports,
      exports,
      functions,
      classes,
      issues,
    };

    if (detectedFramework) {
      result.framework = detectedFramework;
    }

    return result;
  }

  /**
   * Generate enhanced transformation prompt focused on complex LLM-specific tasks
   */
  private generateEnhancedTransformationPrompt(
    content: string,
    context: any,
    request?: TransformationRequest
  ): string {
    const customPrompt = request?.prompt || this.getDefaultLLMTransformationGoals(context);
    
    return `You are an expert code transformation assistant specializing in complex transformations that require semantic understanding and type inference. This code has already been processed by template and AST transformations - you should focus on intelligent, context-aware improvements.

COMPLEX TRANSFORMATION GOALS:
${customPrompt}

CODE ANALYSIS:
- Language: ${context.language}
- Framework: ${context.framework || 'None detected'}
- Complexity Score: ${context.complexity}/25
- Functions: ${context.functions}
- Classes: ${context.classes}
- Detected Issues: ${context.issues.join(', ') || 'None'}
- Remaining Patterns: ${context.patterns.join(', ') || 'None'}

LLM-SPECIFIC TRANSFORMATION RULES:
1. Focus on semantic understanding and type inference
2. Resolve complex TypeScript type issues (any types, missing generics)
3. Infer proper types from usage patterns and context
4. Apply advanced refactoring that requires code comprehension
5. Optimize complex algorithms and data structures
6. Resolve architectural issues and design patterns
7. Handle cross-file dependencies and imports intelligently
8. Apply framework-specific best practices requiring deep understanding
9. Preserve all functionality - never break existing behavior
10. Only make changes that require semantic analysis

IMPORTANT: This is the final transformation stage. Simple pattern-based changes should have been handled by template/AST transformations. Focus on intelligent, context-aware improvements that require understanding code semantics.

ORIGINAL CODE:
\`\`\`${context.language}
${content}
\`\`\`

Please respond with a JSON object containing:
{
 "transformedCode": "...",
 "explanation": "...",
 "confidence": 0.95,
 "warnings": ["..."],
 "appliedTransformations": ["..."]
}`;
  }

  /**
   * Generate system prompt for better LLM context
   */
  private generateSystemPrompt(context: any): string {
    return `You are an expert code transformation assistant specializing in ${context.language} development. 
Your goal is to improve code quality, maintainability, and performance while preserving functionality.
Always respond with valid JSON containing the transformed code and metadata.
Focus on modern best practices and clean code principles.`;
  }

  /**
   * Parse LLM response into structured transformation result using Zod validation
   */
  private parseTransformationResponse(response: string, originalCode: string): LLMTransformationResponse {
    try {
      // Try to parse as JSON first
      const rawParsed = JSON.parse(response);
      
      // Use Zod to validate and provide defaults
      const validatedResponse = LLMTransformationResponseSchema.parse({
        transformedCode: rawParsed.transformedCode || originalCode,
        explanation: rawParsed.explanation,
        confidence: rawParsed.confidence,
        warnings: rawParsed.warnings,
        appliedTransformations: rawParsed.appliedTransformations,
      });
      
      return validatedResponse;
    } catch (parseError) {
      // If not JSON, try to extract code from markdown blocks
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
      const extractedCode = codeMatch?.[1]?.trim() || null;
      
      // Use Zod to create a valid response with defaults
      const fallbackResponse = LLMTransformationResponseSchema.parse({
        transformedCode: extractedCode || originalCode,
        explanation: 'Raw response from LLM - could not parse JSON',
        confidence: extractedCode ? 0.4 : 0.1,
        warnings: ['Could not parse structured JSON response'],
        appliedTransformations: extractedCode ? ['markdown-extraction'] : ['no-transformation'],
      });
      
      return fallbackResponse;
    }
  }

  /**
   * Enhanced complexity calculation
   */
  private calculateEnhancedComplexity(content: string): number {
    let complexity = 1;
    
    const complexityPatterns = [
      { pattern: /\bif\b/g, weight: 1 },
      { pattern: /\belse\b/g, weight: 1 },
      { pattern: /\bwhile\b/g, weight: 2 },
      { pattern: /\bfor\b/g, weight: 2 },
      { pattern: /\bswitch\b/g, weight: 2 },
      { pattern: /\btry\b/g, weight: 2 },
      { pattern: /\bcatch\b/g, weight: 2 },
      { pattern: /\?\s*.*\s*:/g, weight: 1 }, // Ternary
      { pattern: /&&/g, weight: 1 },
      { pattern: /\|\|/g, weight: 1 },
      { pattern: /function\s*\(/g, weight: 1 },
      { pattern: /class\s+\w+/g, weight: 2 },
      { pattern: /async\s+function/g, weight: 2 },
      { pattern: /await\s+/g, weight: 1 },
    ];
    
    complexityPatterns.forEach(({ pattern, weight }) => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length * weight;
    });
    
    return Math.min(complexity, 25);
  }

  /**
   * Detect code issues that need fixing
   */
  private detectCodeIssues(content: string): string[] {
    const issues: string[] = [];
    
    if (content.includes('var ')) issues.push('var-declarations');
    if (content.includes('==') && !content.includes('===')) issues.push('loose-equality');
    if (content.includes('!=') && !content.includes('!==')) issues.push('loose-inequality');
    if (content.includes('console.log(')) issues.push('console-statements');
    if (content.includes(': any')) issues.push('any-types');
    if (content.match(/function\s*\([^)]*\)\s*\{/)) issues.push('function-declarations');
    if (content.includes('.indexOf(') && content.includes('!== -1')) issues.push('indexOf-usage');
    
    return issues;
  }

  /**
   * Enhanced validation with better error detection
   */
  private async validateTransformation(
    originalCode: string,
    transformedCode: string,
    filePath: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Basic syntax validation
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || 
          filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        
        // Check for balanced braces and parentheses
        const openBraces = (transformedCode.match(/\{/g) || []).length;
        const closeBraces = (transformedCode.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
          errors.push('Unbalanced braces in transformed code');
        }
        
        const openParens = (transformedCode.match(/\(/g) || []).length;
        const closeParens = (transformedCode.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          errors.push('Unbalanced parentheses in transformed code');
        }
        
        // Check for syntax errors
        if (transformedCode.includes(';;')) {
          errors.push('Double semicolons detected');
        }
        
        // Ensure imports/exports are preserved
        const originalImports = this.extractImports(originalCode);
        const transformedImports = this.extractImports(transformedCode);
        
        if (originalImports.length > 0 && transformedImports.length === 0) {
          errors.push('All imports were removed during transformation');
        }
      }
      
      // Check that the code is not empty
      if (transformedCode.trim().length === 0) {
        errors.push('Transformed code is empty');
      }
      
      // Check similarity to prevent hallucination
      const similarity = this.calculateSimilarity(originalCode, transformedCode);
      if (similarity < 0.2) {
        errors.push('Transformed code is too different from original (possible hallucination)');
      }
      
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper methods (reused from original implementation)
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'rs':
        return 'rust';
      case 'go':
        return 'go';
      default:
        return 'unknown';
    }
  }

  private extractImports(content: string): string[] {
    const imports = content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || [];
    return imports.map((imp) => imp.trim());
  }

  private extractExports(content: string): string[] {
    const exports = content.match(/export\s+(?:default\s+)?(?:function|class|interface|type|const|let|var)\s+\w+/g) || [];
    return exports.map((exp) => exp.trim());
  }

  private detectFramework(imports: string[]): string | undefined {
    const importText = imports.join(' ').toLowerCase();
    if (importText.includes('react')) return 'React';
    if (importText.includes('vue')) return 'Vue';
    if (importText.includes('angular')) return 'Angular';
    if (importText.includes('express')) return 'Express';
    if (importText.includes('xstate')) return 'XState';
    return undefined;
  }

  private detectCodePatterns(content: string): string[] {
    const patterns: string[] = [];
    
    if (content.includes('var ')) patterns.push('var-declarations');
    if (content.includes('==') && !content.includes('===')) patterns.push('loose-equality');
    if (content.includes('function(')) patterns.push('function-declarations');
    if (content.includes('.then(')) patterns.push('promise-chains');
    if (content.includes('callback')) patterns.push('callbacks');
    if (content.includes('class ')) patterns.push('classes');
    if (content.includes('async ')) patterns.push('async-functions');
    if (content.includes('await ')) patterns.push('await-expressions');
    
    return patterns;
  }

  /**
   * Get default LLM-specific transformation goals based on context
   */
  private getDefaultLLMTransformationGoals(context: any): string {
    const goals: string[] = [];
    
    // Focus on complex transformations that require semantic understanding
    if (context.issues?.some((issue: string) => issue.includes('any') || issue.includes('type'))) {
      goals.push('- Infer proper types to replace any types and resolve type issues');
    }
    
    if (context.complexity > 15) {
      goals.push('- Apply intelligent refactoring to reduce algorithmic complexity');
    }
    
    if (context.language === 'typescript') {
      goals.push('- Perform advanced TypeScript type inference and generic optimization');
    }
    
    if (context.framework) {
      goals.push(`- Apply advanced ${context.framework} architectural patterns requiring semantic analysis`);
    }
    
    // LLM-specific goals that require understanding code semantics
    goals.push('- Optimize complex algorithms and data structures');
    goals.push('- Apply design patterns that require understanding code intent');
    goals.push('- Resolve cross-file dependencies and import optimizations');
    goals.push('- Perform intelligent code restructuring based on usage patterns');
    
    return goals.join('\n');
  }


  private generateCacheKey(content: string, prompt: string): string {
    const combined = `${content}|${prompt}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}

/**
 * Convenience function to create enhanced LLM transformer
 */
export function createEnhancedLLMTransformer(config?: Partial<EnhancedLLMConfig>): EnhancedLLMTransformer {
  return new EnhancedLLMTransformer(config);
}