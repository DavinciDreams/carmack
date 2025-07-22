/**
 * Enhanced LLM Transformation Actor
 * 
 * This module provides production-ready LLM-based code transformations using
 * the new provider system with real API integrations, fallback mechanisms,
 * and comprehensive error handling.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fromPromise } from 'xstate';
import { z } from 'zod';
import type { AstPattern, ComplexityMetrics, TransformationRequest } from '../types.js';
import { getLLMProviderManager, type LLMRequest } from '../providers/llm-providers.js';

// =============================================================================
// ENHANCED LLM TRANSFORMATION SCHEMAS
// =============================================================================

const EnhancedLLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']).default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().default(4000),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  enableFallback: z.boolean().default(true),
  costLimit: z.number().default(1.0), // Dollar limit per transformation
});

const EnhancedLLMTransformationInputSchema = z.object({
  files: z.array(z.string()),
  request: z.custom<TransformationRequest>().optional(),
  config: EnhancedLLMConfigSchema.optional(),
  context: z.object({
    complexity: z.custom<ComplexityMetrics>().optional(),
    patterns: z.array(z.custom<AstPattern>()).optional(),
    projectType: z.string().optional(),
    framework: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  }).optional(),
});

const EnhancedLLMTransformationResultSchema = z.object({
  filesModified: z.array(z.string()),
  transformationsApplied: z.number(),
  mode: z.literal('llm'),
  totalTokensUsed: z.number().optional(),
  totalCost: z.number().optional(),
  averageConfidence: z.number().optional(),
  providersUsed: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  performance: z.object({
    totalTime: z.number(),
    averageTimePerFile: z.number(),
    successRate: z.number(),
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
      performance: {
        totalTime,
        averageTimePerFile: totalTime / input.files.length,
        successRate,
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
      const prompt = this.generateEnhancedTransformationPrompt(originalContent, fileContext, input.request);
      
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
          priority: input.context?.priority || 'normal',
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
      if (originalContent !== transformationResult.transformedCode) {
        console.log(`📝 Writing enhanced transformed code to ${filePath}`);
        await writeFile(filePath, transformationResult.transformedCode, 'utf-8');
        
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
   * Generate enhanced transformation prompt with better context
   */
  private generateEnhancedTransformationPrompt(
    content: string,
    context: any,
    request?: TransformationRequest
  ): string {
    const customPrompt = request?.prompt || this.getDefaultTransformationGoals(context);
    
    return `You are an expert code transformation assistant. Transform the following ${context.language} code to improve it using modern best practices.

TRANSFORMATION GOALS:
${customPrompt}

CODE ANALYSIS:
- Language: ${context.language}
- Framework: ${context.framework || 'None detected'}
- Complexity Score: ${context.complexity}/25
- Functions: ${context.functions}
- Classes: ${context.classes}
- Detected Patterns: ${context.patterns.join(', ') || 'None'}
- Code Issues: ${context.issues.join(', ') || 'None'}

TRANSFORMATION RULES:
1. Preserve all functionality and behavior
2. Maintain type safety (especially for TypeScript)
3. Follow modern ${context.language} best practices
4. Use appropriate design patterns
5. Optimize for readability and maintainability
6. Add helpful comments for complex transformations
7. Ensure all imports and exports remain valid
8. Fix any detected code issues
9. Improve performance where possible
10. Follow the project's apparent coding style

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
   * Parse LLM response into structured transformation result
   */
  private parseTransformationResponse(response: string, originalCode: string): {
    transformedCode: string;
    explanation: string;
    confidence: number;
    warnings: string[];
    appliedTransformations: string[];
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      return {
        transformedCode: parsed.transformedCode || originalCode,
        explanation: parsed.explanation || 'No explanation provided',
        confidence: parsed.confidence || 0.5,
        warnings: parsed.warnings || [],
        appliedTransformations: parsed.appliedTransformations || [],
      };
    } catch {
      // If not JSON, try to extract code from markdown blocks
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
      const transformedCode = codeMatch ? codeMatch[1] : originalCode;
      
      return {
        transformedCode,
        explanation: 'Raw response from LLM',
        confidence: 0.3,
        warnings: ['Could not parse structured response'],
        appliedTransformations: ['unknown'],
      };
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

  private getDefaultTransformationGoals(context: any): string {
    const goals = [
      '- Convert var to const/let based on usage patterns',
      '- Transform callbacks to async/await where appropriate',
      '- Use modern ES6+ features (destructuring, template literals, arrow functions)',
      '- Apply object property shorthand',
      '- Use strict equality operators (=== instead of ==)',
      '- Modernize function declarations where appropriate',
      '- Replace indexOf with includes() where applicable',
      '- Improve error handling and logging',
    ];

    if (context.language === 'typescript') {
      goals.push(
        '- Improve type annotations and interfaces',
        '- Use TypeScript utility types where beneficial',
        '- Apply proper generic constraints',
        '- Replace any types with specific types'
      );
    }

    if (context.framework) {
      goals.push(`- Apply ${context.framework}-specific best practices`);
    }

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