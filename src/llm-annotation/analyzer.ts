import { fromPromise } from 'xstate';
import type { ASTGrepAnalyzer } from '../docs/ast-analyzer.js';
import type {
  AnnotationRequest,
  AnnotationResult,
  LLMAnnotation,
  PatternAnnotation,
  ArchitecturalAnnotation,
  TransformationOpportunity,
  CodeContext,
} from './types.js';
import {
  AnnotationRequestSchema,
  LLMAnnotationSchema,
} from './types.js';

/**
 * LLM Annotation Analyzer
 * 
 * Analyzes codebases using AST-grep and creates structured annotations
 * optimized for LLM consumption and understanding.
 */
export class LLMAnnotationAnalyzer {
  private astAnalyzer: ASTGrepAnalyzer | null = null;

  constructor() {
    this.initializeAnalyzer();
  }

  private async initializeAnalyzer() {
    const { ASTGrepAnalyzer } = await import('../docs/ast-analyzer.js');
    this.astAnalyzer = new ASTGrepAnalyzer();
  }

  /**
   * Generate comprehensive LLM annotations for a codebase
   */
  async generateAnnotations(request: AnnotationRequest): Promise<AnnotationResult> {
    const startTime = Date.now();
    const validatedRequest = AnnotationRequestSchema.parse(request);
    
    try {
      console.log('🔍 Starting LLM annotation analysis...');
      
      // Step 1: Analyze code structure and context
      const context = await this.analyzeCodeContext(validatedRequest);
      console.log(`📊 Analyzed ${context.dependencies.length} dependencies`);

      // Step 2: Detect patterns
      const patterns = await this.detectPatterns(validatedRequest);
      console.log(`🎯 Detected ${patterns.length} patterns`);

      // Step 3: Analyze architecture
      const architecture = await this.analyzeArchitecture(validatedRequest);
      console.log(`🏗️ Analyzed ${architecture.length} architectural components`);

      // Step 4: Identify transformation opportunities
      const opportunities = await this.identifyOpportunities(validatedRequest, patterns, architecture);
      console.log(`💡 Found ${opportunities.length} transformation opportunities`);

      // Step 5: Generate summary and LLM prompts
      const summary = this.generateSummary(context, patterns, architecture, opportunities);
      const llmPrompts = this.generateLLMPrompts(context, patterns, opportunities);

      const annotation: LLMAnnotation = {
        id: `annotation-${Date.now()}`,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        metadata: {
          analyzer: 'LLMAnnotationAnalyzer',
          confidence: this.calculateOverallConfidence(patterns, architecture),
          processingTime: Date.now() - startTime,
          sourceFiles: validatedRequest.sourceFiles.length,
          totalLines: context.dependencies.length, // Placeholder
        },
        context,
        patterns,
        architecture,
        opportunities,
        summary,
        llmPrompts,
      };

      // Validate the annotation
      const validatedAnnotation = LLMAnnotationSchema.parse(annotation);

      // Save output if requested
      let outputPath: string | undefined;
      if (validatedRequest.targetDirectory) {
        outputPath = await this.saveAnnotation(validatedAnnotation, validatedRequest);
      }

      console.log('✅ LLM annotation analysis completed successfully');

      return {
        request: validatedRequest,
        annotation: validatedAnnotation,
        outputPath,
        processingTime: Date.now() - startTime,
        status: 'success',
        errors: [],
        warnings: [],
      };

    } catch (error) {
      console.error('❌ LLM annotation analysis failed:', error);
      
      return {
        request: validatedRequest,
        annotation: this.createEmptyAnnotation(),
        processingTime: Date.now() - startTime,
        status: 'failed',
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }
  }

  /**
   * Analyze code context and dependencies
   */
  private async analyzeCodeContext(request: AnnotationRequest): Promise<CodeContext> {
    const { readFile } = await import('fs/promises');
    const { extname } = await import('path');

    // Analyze primary files to understand context
    const dependencies = new Set<string>();
    const exports = new Set<string>();
    let totalComplexity = 0;
    let fileCount = 0;

    for (const filePath of request.sourceFiles.slice(0, 10)) { // Sample first 10 files
      try {
        const content = await readFile(filePath, 'utf-8');
        const ext = extname(filePath);
        
        // Extract imports/dependencies
        const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
          importMatches.forEach(match => {
            const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            if (moduleMatch?.[1]) {
              dependencies.add(moduleMatch[1]);
            }
          });
        }

        // Extract exports
        const exportMatches = content.match(/export\s+(?:function|class|interface|type|const|let|var)\s+(\w+)/g);
        if (exportMatches) {
          exportMatches.forEach(match => {
            const nameMatch = match.match(/export\s+(?:function|class|interface|type|const|let|var)\s+(\w+)/);
            if (nameMatch?.[1]) {
              exports.add(nameMatch[1]);
            }
          });
        }

        // Calculate basic complexity
        const complexityIndicators = [
          /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g,
          /\bswitch\b/g, /\btry\b/g, /\bcatch\b/g
        ];
        
        let fileComplexity = 1;
        complexityIndicators.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) fileComplexity += matches.length;
        });
        
        totalComplexity += fileComplexity;
        fileCount++;

      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }

    // Determine framework and purpose
    const framework = this.detectFramework(Array.from(dependencies));
    const purpose = this.inferPurpose(Array.from(dependencies), Array.from(exports));

    return {
      filePath: request.sourceFiles[0] || 'unknown',
      language: 'typescript', // Infer from file extensions
      framework,
      purpose,
      complexity: fileCount > 0 ? totalComplexity / fileCount : 0,
      dependencies: Array.from(dependencies),
      exports: Array.from(exports),
    };
  }

  /**
   * Detect code patterns using AST-grep
   */
  private async detectPatterns(request: AnnotationRequest): Promise<PatternAnnotation[]> {
    const patterns: PatternAnnotation[] = [];

    // Common patterns to detect
    const patternDefinitions = [
      {
        id: 'singleton-pattern',
        type: 'design' as const,
        name: 'Singleton Pattern',
        astPattern: 'class $CLASS { private static instance: $CLASS; }',
        category: 'creational',
      },
      {
        id: 'factory-pattern',
        type: 'design' as const,
        name: 'Factory Pattern',
        astPattern: 'function create$NAME($PARAMS): $TYPE { return new $TYPE($ARGS); }',
        category: 'creational',
      },
      {
        id: 'async-await-pattern',
        type: 'optimization' as const,
        name: 'Async/Await Usage',
        astPattern: 'async function $NAME($PARAMS) { await $EXPR; }',
        category: 'asynchronous',
      },
      {
        id: 'error-handling',
        type: 'architectural' as const,
        name: 'Error Handling',
        astPattern: 'try { $BODY } catch ($ERROR) { $HANDLER }',
        category: 'reliability',
      },
      {
        id: 'type-assertion',
        type: 'anti-pattern' as const,
        name: 'Type Assertion',
        astPattern: '$EXPR as $TYPE',
        category: 'type-safety',
      },
    ];

    for (const filePath of request.sourceFiles.slice(0, 20)) { // Analyze first 20 files
      for (const patternDef of patternDefinitions) {
        try {
          if (!this.astAnalyzer) {
            await this.initializeAnalyzer();
          }
          const matches = await this.astAnalyzer!.findPatternUsage(patternDef.astPattern, filePath);
          
          for (const match of matches) {
            patterns.push({
              id: `${patternDef.id}-${patterns.length}`,
              type: patternDef.type,
              name: patternDef.name,
              description: `${patternDef.name} detected in ${filePath}`,
              location: {
                file: filePath,
                startLine: match.startLine,
                endLine: match.endLine,
                context: match.content || '',
              },
              confidence: 0.8, // Base confidence
              impact: 'medium',
              category: patternDef.category,
              tags: [patternDef.category, patternDef.type],
            });
          }
        } catch (error) {
          console.warn(`Failed to detect pattern ${patternDef.id} in ${filePath}:`, error);
        }
      }
    }

    return patterns;
  }

  /**
   * Analyze architectural components
   */
  private async analyzeArchitecture(request: AnnotationRequest): Promise<ArchitecturalAnnotation[]> {
    const architecture: ArchitecturalAnnotation[] = [];

    for (const filePath of request.sourceFiles.slice(0, 15)) { // Analyze first 15 files
      try {
        if (!this.astAnalyzer) {
          await this.initializeAnalyzer();
        }
        const moduleDoc = await this.astAnalyzer!.analyzeFile(filePath);
        
        // Create architectural annotation for each significant component
        if (moduleDoc.exports.functions.length > 0 || moduleDoc.exports.classes.length > 0) {
          const componentType = moduleDoc.exports.classes.length > 0 ? 'class' : 
                               moduleDoc.exports.functions.length > 3 ? 'module' : 'utility';

          architecture.push({
            component: moduleDoc.name,
            type: componentType,
            role: this.inferComponentRole(moduleDoc),
            responsibilities: this.extractResponsibilities(moduleDoc),
            relationships: this.analyzeRelationships(moduleDoc),
            qualityMetrics: {
              cohesion: this.calculateCohesion(moduleDoc),
              coupling: this.calculateCoupling(moduleDoc),
              complexity: moduleDoc.exports.functions.reduce((sum, fn) => sum + (fn.parameters?.length || 0), 0),
              testability: this.assessTestability(moduleDoc),
            },
            designPrinciples: this.identifyDesignPrinciples(moduleDoc),
            violations: this.detectViolations(moduleDoc),
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze architecture for ${filePath}:`, error);
      }
    }

    return architecture;
  }

  /**
   * Identify transformation opportunities
   */
  private async identifyOpportunities(
    request: AnnotationRequest,
    patterns: PatternAnnotation[],
    architecture: ArchitecturalAnnotation[]
  ): Promise<TransformationOpportunity[]> {
    const opportunities: TransformationOpportunity[] = [];

    // Analyze patterns for opportunities
    const antiPatterns = patterns.filter(p => p.type === 'anti-pattern');
    for (const antiPattern of antiPatterns) {
      opportunities.push({
        id: `fix-${antiPattern.id}`,
        type: 'refactor',
        title: `Fix ${antiPattern.name}`,
        description: `Refactor ${antiPattern.name} to improve code quality`,
        rationale: `${antiPattern.name} can lead to maintenance issues and reduced type safety`,
        location: {
          files: [antiPattern.location.file],
          functions: [],
          classes: [],
        },
        effort: 'small',
        risk: 'low',
        benefits: ['Improved type safety', 'Better maintainability'],
        steps: [
          {
            description: `Replace ${antiPattern.name} with proper typing`,
            automated: true,
            validation: 'TypeScript compilation check',
          },
        ],
        estimatedImpact: {
          maintainability: 0.2,
          readability: 0.15,
        },
      });
    }

    // Analyze architecture for opportunities
    const highComplexityComponents = architecture.filter(a => a.qualityMetrics.complexity > 10);
    for (const component of highComplexityComponents) {
      opportunities.push({
        id: `simplify-${component.component}`,
        type: 'refactor',
        title: `Simplify ${component.component}`,
        description: `Break down complex ${component.type} into smaller, more manageable pieces`,
        rationale: 'High complexity reduces maintainability and increases bug risk',
        location: {
          files: [component.component],
          functions: [],
          classes: component.type === 'class' ? [component.component] : [],
        },
        effort: 'medium',
        risk: 'medium',
        benefits: ['Reduced complexity', 'Improved testability', 'Better maintainability'],
        steps: [
          {
            description: 'Extract smaller functions/methods',
            automated: false,
            validation: 'Unit tests pass',
          },
          {
            description: 'Apply single responsibility principle',
            automated: false,
            validation: 'Code review',
          },
        ],
        estimatedImpact: {
          maintainability: 0.3,
          readability: 0.25,
        },
      });
    }

    return opportunities;
  }

  // Helper methods for analysis
  private detectFramework(dependencies: string[]): string | undefined {
    if (dependencies.some(dep => dep.includes('react'))) return 'React';
    if (dependencies.some(dep => dep.includes('vue'))) return 'Vue';
    if (dependencies.some(dep => dep.includes('angular'))) return 'Angular';
    if (dependencies.some(dep => dep.includes('express'))) return 'Express';
    if (dependencies.some(dep => dep.includes('xstate'))) return 'XState';
    return undefined;
  }

  private inferPurpose(dependencies: string[], exports: string[]): string {
    if (dependencies.some(dep => dep.includes('test') || dep.includes('jest'))) {
      return 'Testing utilities and test suites';
    }
    if (exports.some(exp => exp.toLowerCase().includes('api') || exp.toLowerCase().includes('server'))) {
      return 'API server and backend services';
    }
    if (exports.some(exp => exp.toLowerCase().includes('component') || exp.toLowerCase().includes('ui'))) {
      return 'User interface components and frontend logic';
    }
    if (exports.some(exp => exp.toLowerCase().includes('util') || exp.toLowerCase().includes('helper'))) {
      return 'Utility functions and helper modules';
    }
    return 'General application logic and business rules';
  }

  private inferComponentRole(moduleDoc: any): string {
    if (moduleDoc.exports.classes.length > 0) {
      return 'Data model and business logic container';
    }
    if (moduleDoc.exports.functions.length > 5) {
      return 'Utility module with multiple helper functions';
    }
    if (moduleDoc.name.includes('test')) {
      return 'Test suite and validation logic';
    }
    return 'Application component with specific functionality';
  }

  private extractResponsibilities(moduleDoc: any): string[] {
    const responsibilities: string[] = [];
    
    if (moduleDoc.exports.functions.length > 0) {
      responsibilities.push('Function execution and data processing');
    }
    if (moduleDoc.exports.classes.length > 0) {
      responsibilities.push('Object state management and behavior');
    }
    if (moduleDoc.dependencies.length > 3) {
      responsibilities.push('Integration with external dependencies');
    }
    
    return responsibilities.length > 0 ? responsibilities : ['Core application functionality'];
  }

  private analyzeRelationships(moduleDoc: any): any[] {
    return moduleDoc.dependencies.slice(0, 5).map((dep: string) => ({
      target: dep,
      type: 'depends-on' as const,
      strength: dep.startsWith('.') ? 'strong' as const : 'medium' as const,
    }));
  }

  private calculateCohesion(moduleDoc: any): number {
    // Simple heuristic: fewer responsibilities = higher cohesion
    const totalExports = moduleDoc.exports.functions.length + moduleDoc.exports.classes.length;
    return Math.max(0, Math.min(1, 1 - (totalExports / 10)));
  }

  private calculateCoupling(moduleDoc: any): number {
    // Simple heuristic: more dependencies = higher coupling
    return Math.min(1, moduleDoc.dependencies.length / 20);
  }

  private assessTestability(moduleDoc: any): number {
    // Simple heuristic: pure functions are more testable
    const pureFunctionCount = moduleDoc.exports.functions.filter((fn: any) => 
      !fn.isAsync && fn.parameters.length <= 3
    ).length;
    const totalFunctions = moduleDoc.exports.functions.length;
    return totalFunctions > 0 ? pureFunctionCount / totalFunctions : 0.5;
  }

  private identifyDesignPrinciples(moduleDoc: any): string[] {
    const principles: string[] = [];
    
    if (moduleDoc.exports.functions.length > 0 && moduleDoc.exports.classes.length === 0) {
      principles.push('Functional programming approach');
    }
    if (moduleDoc.exports.classes.length === 1) {
      principles.push('Single responsibility principle');
    }
    if (moduleDoc.dependencies.length <= 3) {
      principles.push('Low coupling');
    }
    
    return principles;
  }

  private detectViolations(moduleDoc: any): string[] {
    const violations: string[] = [];
    
    if (moduleDoc.exports.functions.length > 10) {
      violations.push('Too many functions in single module');
    }
    if (moduleDoc.dependencies.length > 15) {
      violations.push('High coupling - too many dependencies');
    }
    
    return violations;
  }

  private generateSummary(
    context: CodeContext,
    patterns: PatternAnnotation[],
    architecture: ArchitecturalAnnotation[],
    opportunities: TransformationOpportunity[]
  ) {
    const antiPatterns = patterns.filter(p => p.type === 'anti-pattern');
    const designPatterns = patterns.filter(p => p.type === 'design');
    const highRiskOpportunities = opportunities.filter(o => o.risk === 'high');
    
    return {
      overview: `Analyzed ${context.language} codebase with ${architecture.length} components, ${patterns.length} patterns detected, and ${opportunities.length} improvement opportunities identified.`,
      keyFindings: [
        `${designPatterns.length} design patterns implemented`,
        `${antiPatterns.length} anti-patterns requiring attention`,
        `Average complexity: ${context.complexity.toFixed(2)}`,
        `${context.dependencies.length} external dependencies`,
      ],
      recommendations: opportunities.slice(0, 5).map(o => o.title),
      riskAreas: highRiskOpportunities.map(o => o.title),
      strengths: [
        ...(designPatterns.length > 0 ? ['Good use of design patterns'] : []),
        ...(context.complexity < 5 ? ['Low complexity codebase'] : []),
        ...(antiPatterns.length === 0 ? ['No anti-patterns detected'] : []),
      ],
    };
  }

  private generateLLMPrompts(
    context: CodeContext,
    patterns: PatternAnnotation[],
    opportunities: TransformationOpportunity[]
  ) {
    return {
      codeReview: `Review this ${context.language} codebase focusing on: ${patterns.map(p => p.category).join(', ')}. Pay attention to ${opportunities.length} identified improvement areas.`,
      refactoring: `Suggest refactoring strategies for this ${context.framework || context.language} project. Priority areas: ${opportunities.slice(0, 3).map(o => o.title).join(', ')}.`,
      optimization: `Analyze performance optimization opportunities in this codebase with ${context.complexity.toFixed(1)} average complexity. Focus on: ${opportunities.filter(o => o.type === 'optimize').map(o => o.title).join(', ')}.`,
      testing: `Generate comprehensive test strategies for this ${context.language} project with ${context.exports.length} exported functions/classes.`,
      documentation: `Create documentation for this ${context.purpose} codebase, highlighting: ${patterns.filter(p => p.type === 'design').map(p => p.name).join(', ')}.`,
    };
  }

  private calculateOverallConfidence(patterns: PatternAnnotation[], architecture: ArchitecturalAnnotation[]): number {
    if (patterns.length === 0) return 0.5;
    
    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const architectureBonus = Math.min(0.2, architecture.length * 0.05);
    
    return Math.min(1, avgPatternConfidence + architectureBonus);
  }

  private async saveAnnotation(annotation: LLMAnnotation, request: AnnotationRequest): Promise<string> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    
    const outputDir = request.targetDirectory || './output/annotations';
    await mkdir(outputDir, { recursive: true });
    
    const filename = `annotation-${annotation.id}.${request.outputFormat}`;
    const outputPath = join(outputDir, filename);
    
    let content: string;
    switch (request.outputFormat) {
      case 'json':
        content = JSON.stringify(annotation, null, 2);
        break;
      case 'yaml':
        // Simple YAML-like format
        content = this.toYAML(annotation);
        break;
      case 'markdown':
        content = this.toMarkdown(annotation);
        break;
      default:
        content = JSON.stringify(annotation, null, 2);
    }
    
    await writeFile(outputPath, content);
    return outputPath;
  }

  private toYAML(annotation: LLMAnnotation): string {
    // Simple YAML conversion - in production, use a proper YAML library
    return `# LLM Annotation
id: ${annotation.id}
timestamp: ${annotation.timestamp}
version: ${annotation.version}

summary:
  overview: "${annotation.summary.overview}"
  patterns_detected: ${annotation.patterns.length}
  opportunities: ${annotation.opportunities.length}

# Full annotation data available in JSON format
`;
  }

  private toMarkdown(annotation: LLMAnnotation): string {
    return `# LLM Code Analysis Annotation

**ID:** ${annotation.id}  
**Generated:** ${annotation.timestamp}  
**Analyzer:** ${annotation.metadata.analyzer}  

## Summary

${annotation.summary.overview}

### Key Findings
${annotation.summary.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Recommendations
${annotation.summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## Patterns Detected (${annotation.patterns.length})

${annotation.patterns.slice(0, 10).map(pattern => 
  `### ${pattern.name}
- **Type:** ${pattern.type}
- **Impact:** ${pattern.impact}
- **Location:** ${pattern.location.file}:${pattern.location.startLine}
- **Description:** ${pattern.description}
`).join('\n')}

## Transformation Opportunities (${annotation.opportunities.length})

${annotation.opportunities.slice(0, 5).map(opp => 
  `### ${opp.title}
- **Type:** ${opp.type}
- **Effort:** ${opp.effort}
- **Risk:** ${opp.risk}
- **Benefits:** ${opp.benefits.join(', ')}
- **Description:** ${opp.description}
`).join('\n')}

## LLM Prompts

### Code Review
${annotation.llmPrompts.codeReview}

### Refactoring
${annotation.llmPrompts.refactoring}

### Optimization
${annotation.llmPrompts.optimization}

---
*Generated by Carmack Coder LLM Annotation System*
`;
  }

  private createEmptyAnnotation(): LLMAnnotation {
    return {
      id: 'empty-annotation',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metadata: {
        analyzer: 'LLMAnnotationAnalyzer',
        confidence: 0,
        processingTime: 0,
        sourceFiles: 0,
        totalLines: 0,
      },
      context: {
        filePath: 'unknown',
        language: 'unknown',
        purpose: 'unknown',
        complexity: 0,
        dependencies: [],
        exports: [],
      },
      patterns: [],
      architecture: [],
      opportunities: [],
      summary: {
        overview: 'Analysis failed',
        keyFindings: [],
        recommendations: [],
        riskAreas: [],
        strengths: [],
      },
      llmPrompts: {
        codeReview: '',
        refactoring: '',
        optimization: '',
        testing: '',
        documentation: '',
      },
    };
  }
}

// Create and export the annotation actor
export const llmAnnotationActor = fromPromise(
  async ({ input }: { input: AnnotationRequest }) => {
    const analyzer = new LLMAnnotationAnalyzer();
    return await analyzer.generateAnnotations(input);
  }
);

// Export convenience functions
export const generateLLMAnnotations = async (request: AnnotationRequest): Promise<AnnotationResult> => {
  const analyzer = new LLMAnnotationAnalyzer();
  return await analyzer.generateAnnotations(request);
};

export const validateAnnotationRequest = (data: unknown): AnnotationRequest => {
  return AnnotationRequestSchema.parse(data);
};