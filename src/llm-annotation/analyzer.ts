import * as yaml from 'js-yaml';
import { fromPromise } from 'xstate';
import { ASTAnalyzer } from '../docs-generator/ast-analyzer.js';

import type {
  AnnotationRequest,
  AnnotationResult,
  ArchitecturalAnnotation,
  CodeContext,
  LLMAnnotation,
  PatternAnnotation,
  TransformationOpportunity,
} from './types';
import { AnnotationRequestSchema, LLMAnnotationSchema } from './types.js';
import { z } from 'zod';
// Zod schemas for file paths and directories
const FilePathSchema = z.string().min(1, 'File path must not be empty');
const DirectoryPathSchema = z.string().min(1, 'Directory path must not be empty');

/**
 * LLM Annotation Analyzer
 *
 * Analyzes codebases using AST-grep and creates structured annotations
 * optimized for LLM consumption and understanding.
 */
export class LLMAnnotationAnalyzer {
  private astAnalyzer: ASTAnalyzer | null = null;

  constructor() {
    this.astAnalyzer = new ASTAnalyzer();
  }

  /**
   * Generate comprehensive LLM annotations for a codebase
   */
  async generateAnnotations(request: AnnotationRequest): Promise<AnnotationResult> {
    const startTime = Date.now();
    const validatedRequest = AnnotationRequestSchema.parse(request);
    // Validate all file paths in the request
    validatedRequest.sourceFiles.forEach((filePath) => {
      FilePathSchema.parse(filePath);
    });

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
      const opportunities = await this.identifyOpportunities(
        validatedRequest,
        patterns,
        architecture,
        context.language
      );
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
    const { readFile } = await import('node:fs/promises');
    const { extname } = await import('node:path');

    // Analyze primary files to understand context
    const dependencies = new Set<string>();
    const exports = new Set<string>();
    let totalComplexity = 0;
    let fileCount = 0;
    let detectedLanguage = 'unknown';

    for (const filePath of request.sourceFiles.slice(0, 10)) {
      FilePathSchema.parse(filePath);
      // Sample first 10 files
      try {
        const content = await readFile(filePath, 'utf-8');
        const ext = extname(filePath);

        // Detect language from file extension
        if (!detectedLanguage || detectedLanguage === 'unknown') {
          detectedLanguage = this.detectLanguageFromExtension(ext);
        }

        // Extract language-specific imports/dependencies and exports
        const languagePatterns = this.getLanguagePatterns(detectedLanguage);

        // Extract imports/dependencies
        for (const importPattern of languagePatterns.imports) {
          const importMatches = content.match(new RegExp(importPattern, 'g'));
          if (importMatches) {
            importMatches.forEach((match) => {
              const extracted = this.extractDependencyFromMatch(match, detectedLanguage);
              if (extracted) {
                dependencies.add(extracted);
              }
            });
          }
        }

        // Extract exports
        for (const exportPattern of languagePatterns.exports) {
          const exportMatches = content.match(new RegExp(exportPattern, 'g'));
          if (exportMatches) {
            exportMatches.forEach((match) => {
              const extracted = this.extractExportFromMatch(match, detectedLanguage);
              if (extracted) {
                exports.add(extracted);
              }
            });
          }
        }

        // Calculate basic complexity using language-agnostic patterns
        const complexityIndicators = languagePatterns.complexity;
        let fileComplexity = 1;
        complexityIndicators.forEach((pattern) => {
          const matches = content.match(new RegExp(pattern, 'g'));
          if (matches) fileComplexity += matches.length;
        });

        totalComplexity += fileComplexity;
        fileCount++;
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }

    // Determine framework and purpose
    const framework = this.detectFramework(Array.from(dependencies), detectedLanguage);
    const purpose = this.inferPurpose(
      Array.from(dependencies),
      Array.from(exports),
      detectedLanguage
    );

    return {
      filePath: request.sourceFiles[0] || 'unknown',
      language: detectedLanguage,
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

    // Get patterns based on detected language
    const detectedLanguage = this.detectLanguageFromExtension(
      request.sourceFiles[0] ? require('node:path').extname(request.sourceFiles[0]) : '.unknown'
    );
    const patternDefinitions = this.getPatternDefinitions(detectedLanguage);

    for (const filePath of request.sourceFiles.slice(0, 20)) {
      FilePathSchema.parse(filePath);
      // Analyze first 20 files
      for (const patternDef of patternDefinitions) {
        try {

          if (!this.astAnalyzer) throw new Error('ASTAnalyzer not initialized');
          // Use extractEntities for pattern extraction
          const entities = await this.astAnalyzer.extractEntities(filePath);
          // Filter entities by pattern if needed (pseudo-code, adapt as needed)
          const matches = entities.filter(e => e.name === patternDef.name);

          if (matches) {
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
                  context: typeof (match as any).content === 'string' ? (match as any).content : '',
                },
                confidence: 0.8, // Base confidence
                impact: 'medium',
                category: patternDef.category,
                tags: [patternDef.category, patternDef.type],
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to detect pattern ${patternDef.id} in ${filePath}:`, error);
        }
      }
    }

    return patterns;
  }

  private getPatternDefinitions(language: string) {
    const commonPatterns = [
      {
        id: 'error-handling',
        type: 'architectural' as const,
        name: 'Error Handling',
        astPattern: this.getErrorHandlingPattern(language),
        category: 'reliability',
      },
    ];

    if (['typescript', 'javascript'].includes(language)) {
      return [
        ...commonPatterns,
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
          id: 'type-assertion',
          type: 'anti-pattern' as const,
          name: 'Type Assertion',
          astPattern: '$EXPR as $TYPE',
          category: 'type-safety',
        },
      ];
    }

    if (['cpp', 'c', 'cuda'].includes(language)) {
      return [
        ...commonPatterns,
        {
          id: 'memory-management',
          type: 'architectural' as const,
          name: 'Manual Memory Management',
          astPattern: 'new $TYPE',
          category: 'memory',
        },
        {
          id: 'pointer-usage',
          type: 'optimization' as const,
          name: 'Pointer Usage',
          astPattern: '$TYPE* $VAR',
          category: 'performance',
        },
        {
          id: 'raii-pattern',
          type: 'design' as const,
          name: 'RAII Pattern',
          astPattern: 'class $CLASS { ~$CLASS() { $BODY } };',
          category: 'resource-management',
        },
      ];
    }

    if (language === 'python') {
      return [
        ...commonPatterns,
        {
          id: 'list-comprehension',
          type: 'optimization' as const,
          name: 'List Comprehension',
          astPattern: '[$EXPR for $VAR in $ITER]',
          category: 'pythonic',
        },
        {
          id: 'context-manager',
          type: 'design' as const,
          name: 'Context Manager',
          astPattern: 'with $EXPR as $VAR: $BODY',
          category: 'resource-management',
        },
      ];
    }

    return commonPatterns;
  }

  private getErrorHandlingPattern(language: string): string {
    switch (language) {
      case 'python':
        return 'try: $BODY except $ERROR: $HANDLER';
      case 'java':
        return 'try { $BODY } catch ($ERROR) { $HANDLER }';
      case 'cpp':
      case 'c':
        return 'try { $BODY } catch ($ERROR) { $HANDLER }';
      default:
        return 'try { $BODY } catch ($ERROR) { $HANDLER }';
    }
  }

  /**
   * Analyze architectural components
   */
  private async analyzeArchitecture(
    request: AnnotationRequest
  ): Promise<ArchitecturalAnnotation[]> {
    const architecture: ArchitecturalAnnotation[] = [];

    for (const filePath of request.sourceFiles.slice(0, 15)) {
      FilePathSchema.parse(filePath);
      // Analyze first 15 files
      try {
        if (!this.astAnalyzer) throw new Error('ASTAnalyzer not initialized');
        // Use extractEntities for module analysis
        const entities = await this.astAnalyzer.extractEntities(filePath);
        // Group entities by type for architectural annotation
        const functions = entities.filter(e => e.type === 'function');
        const classes = entities.filter(e => e.type === 'class');
        if (functions.length > 0 || classes.length > 0) {
          const componentType =
            classes.length > 0
              ? 'class'
              : functions.length > 3
                ? 'module'
                : 'utility';

          architecture.push({
            component: filePath,
            type: componentType,
            role: this.inferComponentRole({ filePath, functions, classes }),
            responsibilities: this.extractResponsibilities({ filePath, functions, classes }),
            relationships: this.analyzeRelationships({ filePath, functions, classes }),
            qualityMetrics: {
              cohesion: this.calculateCohesion({ filePath, functions, classes }),
              coupling: this.calculateCoupling({ filePath, functions, classes }),
              complexity: functions.reduce((sum, fn) => sum + (fn.parameters?.length || 0), 0),
              testability: this.assessTestability({ filePath, functions, classes }),
            },
            designPrinciples: this.identifyDesignPrinciples({ filePath, functions, classes }),
            violations: this.detectViolations({ filePath, functions, classes }),
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
    _request: AnnotationRequest,
    patterns: PatternAnnotation[],
    architecture: ArchitecturalAnnotation[],
    language: string
  ): Promise<TransformationOpportunity[]> {
    const opportunities: TransformationOpportunity[] = [];

    // Analyze patterns for opportunities
    const antiPatterns = patterns.filter((p) => p.type === 'anti-pattern');
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
            validation: this.getValidationMethod(language),
          },
        ],
        estimatedImpact: {
          maintainability: 0.2,
          readability: 0.15,
        },
      });
    }

    // Analyze architecture for opportunities
    const highComplexityComponents = architecture.filter((a) => a.qualityMetrics.complexity > 10);
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
  private detectLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c': 'c',
      '.h': 'c-header',
      '.hpp': 'cpp-header',
      '.hxx': 'cpp-header',
      '.cu': 'cuda',
      '.cuh': 'cuda-header',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.clj': 'clojure',
      '.hs': 'haskell',
      '.ml': 'ocaml',
      '.fs': 'fsharp',
      '.vb': 'vb.net',
      '.dart': 'dart',
      '.lua': 'lua',
      '.r': 'r',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bat': 'batch',
      '.ps1': 'powershell',
    };
    return languageMap[ext.toLowerCase()] || 'unknown';
  }

  private getLanguagePatterns(language: string): {
    imports: string[];
    exports: string[];
    complexity: string[];
  } {
    const patterns: Record<string, { imports: string[]; exports: string[]; complexity: string[] }> =
      {
        typescript: {
          imports: [
            'import\\s+.*?from\\s+[\'"]([^\'"]+)[\'"]',
            'require\\s*\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\)',
          ],
          exports: [
            'export\\s+(?:function|class|interface|type|const|let|var)\\s+(\\w+)',
            'export\\s*\\{\\s*([^}]+)\\s*\\}',
          ],
          complexity: [
            '\\bif\\b',
            '\\belse\\b',
            '\\bwhile\\b',
            '\\bfor\\b',
            '\\bswitch\\b',
            '\\btry\\b',
            '\\bcatch\\b',
          ],
        },
        javascript: {
          imports: [
            'import\\s+.*?from\\s+[\'"]([^\'"]+)[\'"]',
            'require\\s*\\(\\s*[\'"]([^\'"]+)[\'"]\\s*\\)',
          ],
          exports: [
            'export\\s+(?:function|class|const|let|var)\\s+(\\w+)',
            'module\\.exports\\s*=',
          ],
          complexity: [
            '\\bif\\b',
            '\\belse\\b',
            '\\bwhile\\b',
            '\\bfor\\b',
            '\\bswitch\\b',
            '\\btry\\b',
            '\\bcatch\\b',
          ],
        },
        python: {
          imports: ['import\\s+(\\w+(?:\\.\\w+)*)', 'from\\s+(\\w+(?:\\.\\w+)*)\\s+import'],
          exports: ['def\\s+(\\w+)\\s*\\(', 'class\\s+(\\w+)\\s*(?:\\(|:)'],
          complexity: [
            '\\bif\\b',
            '\\belif\\b',
            '\\belse\\b',
            '\\bwhile\\b',
            '\\bfor\\b',
            '\\btry\\b',
            '\\bexcept\\b',
          ],
        },
        cpp: {
          imports: ['#include\\s*[<"]([^>"]+)[>"]', 'using\\s+namespace\\s+(\\w+)'],
          exports: [
            '(?:class|struct)\\s+(\\w+)',
            '(?:public|private|protected)?\\s*:\\s*\\w+\\s+(\\w+)\\s*\\(',
            '\\w+\\s+(\\w+)\\s*\\([^)]*\\)\\s*(?:\\{|;)',
          ],
          complexity: [
            '\\bif\\b',
            '\\belse\\b',
            '\\bwhile\\b',
            '\\bfor\\b',
            '\\bswitch\\b',
            '\\btry\\b',
            '\\bcatch\\b',
          ],
        },
        c: {
          imports: ['#include\\s*[<"]([^>"]+)[>"]'],
          exports: [
            '(?:struct|enum|typedef)\\s+(\\w+)',
            '\\w+\\s+(\\w+)\\s*\\([^)]*\\)\\s*(?:\\{|;)',
          ],
          complexity: ['\\bif\\b', '\\belse\\b', '\\bwhile\\b', '\\bfor\\b', '\\bswitch\\b'],
        },
        cuda: {
          imports: ['#include\\s*[<"]([^>"]+)[>"]'],
          exports: [
            '__global__\\s+\\w+\\s+(\\w+)\\s*\\(',
            '__device__\\s+\\w+\\s+(\\w+)\\s*\\(',
            '__host__\\s+\\w+\\s+(\\w+)\\s*\\(',
            '(?:class|struct)\\s+(\\w+)',
          ],
          complexity: ['\\bif\\b', '\\belse\\b', '\\bwhile\\b', '\\bfor\\b', '\\bswitch\\b'],
        },
        java: {
          imports: ['import\\s+(\\w+(?:\\.\\w+)*(?:\\.\\*)?);'],
          exports: [
            '(?:public|private|protected)?\\s*(?:static)?\\s*(?:class|interface|enum)\\s+(\\w+)',
            '(?:public|private|protected)?\\s*(?:static)?\\s*\\w+\\s+(\\w+)\\s*\\(',
          ],
          complexity: [
            '\\bif\\b',
            '\\belse\\b',
            '\\bwhile\\b',
            '\\bfor\\b',
            '\\bswitch\\b',
            '\\btry\\b',
            '\\bcatch\\b',
          ],
        },
      };

    return (
      patterns[language] || {
        imports: ['#include\\s*[<"]([^>"]+)[>"]', 'import\\s+.*?from\\s+[\'"]([^\'"]+)[\'"]'],
        exports: ['(?:function|class|def|struct)\\s+(\\w+)'],
        complexity: ['\\bif\\b', '\\belse\\b', '\\bwhile\\b', '\\bfor\\b', '\\bswitch\\b'],
      }
    );
  }

  private extractDependencyFromMatch(match: string, language: string): string | null {
    // Generic extraction logic for different languages
    if (language === 'python') {
      const pythonMatch = match.match(/(?:import|from)\s+([\w.]+)/);
      return pythonMatch?.[1] || null;
    }
    if (['cpp', 'c', 'cuda'].includes(language)) {
      const cppMatch = match.match(/#include\s*[<"]([^>"]+)[>"]/);
      return cppMatch?.[1] || null;
    }
    if (['typescript', 'javascript'].includes(language)) {
      const jsMatch = match.match(/(?:from|require\s*\(\s*)['"]([^'"]+)['"]/);
      return jsMatch?.[1] || null;
    }
    if (language === 'java') {
      const javaMatch = match.match(/import\s+([\w.]+)/);
      return javaMatch?.[1] || null;
    }
    return null;
  }

  private extractExportFromMatch(match: string, language: string): string | null {
    // Generic extraction logic for different languages
    if (language === 'python') {
      const pythonMatch = match.match(/(?:def|class)\s+(\w+)/);
      return pythonMatch?.[1] || null;
    }
    if (['cpp', 'c', 'cuda'].includes(language)) {
      const cppMatch = match.match(/(?:class|struct|__global__|__device__)\s+\w*\s*(\w+)/);
      return cppMatch?.[1] || null;
    }
    if (['typescript', 'javascript'].includes(language)) {
      const jsMatch = match.match(/(?:export\s+)?(?:function|class|const|let|var)\s+(\w+)/);
      return jsMatch?.[1] || null;
    }
    if (language === 'java') {
      const javaMatch = match.match(/(?:class|interface|enum)\s+(\w+)/);
      return javaMatch?.[1] || null;
    }
    return null;
  }

  private detectFramework(dependencies: string[], language: string): string | undefined {
    // Language-specific framework detection
    if (['typescript', 'javascript'].includes(language)) {
      if (dependencies.some((dep) => dep.includes('react'))) return 'React';
      if (dependencies.some((dep) => dep.includes('vue'))) return 'Vue';
      if (dependencies.some((dep) => dep.includes('angular'))) return 'Angular';
      if (dependencies.some((dep) => dep.includes('express'))) return 'Express';
      if (dependencies.some((dep) => dep.includes('xstate'))) return 'XState';
      if (dependencies.some((dep) => dep.includes('next'))) return 'Next.js';
    }

    if (language === 'python') {
      if (dependencies.some((dep) => dep.includes('django'))) return 'Django';
      if (dependencies.some((dep) => dep.includes('flask'))) return 'Flask';
      if (dependencies.some((dep) => dep.includes('fastapi'))) return 'FastAPI';
      if (dependencies.some((dep) => dep.includes('pytorch'))) return 'PyTorch';
      if (dependencies.some((dep) => dep.includes('tensorflow'))) return 'TensorFlow';
      if (dependencies.some((dep) => dep.includes('numpy'))) return 'NumPy/SciPy';
    }

    if (['cpp', 'c', 'cuda'].includes(language)) {
      if (dependencies.some((dep) => dep.includes('cuda'))) return 'CUDA';
      if (dependencies.some((dep) => dep.includes('opencv'))) return 'OpenCV';
      if (dependencies.some((dep) => dep.includes('boost'))) return 'Boost';
      if (dependencies.some((dep) => dep.includes('qt'))) return 'Qt';
      if (dependencies.some((dep) => dep.includes('eigen'))) return 'Eigen';
    }

    if (language === 'java') {
      if (dependencies.some((dep) => dep.includes('spring'))) return 'Spring';
      if (dependencies.some((dep) => dep.includes('android'))) return 'Android';
      if (dependencies.some((dep) => dep.includes('junit'))) return 'JUnit';
    }

    return undefined;
  }

  private inferPurpose(dependencies: string[], exports: string[], language: string): string {
    // Language-specific purpose inference
    if (
      dependencies.some(
        (dep) =>
          dep.includes('test') ||
          dep.includes('jest') ||
          dep.includes('unittest') ||
          dep.includes('gtest')
      )
    ) {
      return 'Testing utilities and test suites';
    }

    if (['cpp', 'c', 'cuda'].includes(language)) {
      if (dependencies.some((dep) => dep.includes('cuda'))) {
        return 'GPU computing and parallel processing with CUDA';
      }
      if (dependencies.some((dep) => dep.includes('opencv'))) {
        return 'Computer vision and image processing';
      }
      return 'System-level programming and performance-critical applications';
    }

    if (language === 'python') {
      if (dependencies.some((dep) => dep.includes('django') || dep.includes('flask'))) {
        return 'Web application backend services';
      }
      if (dependencies.some((dep) => dep.includes('numpy') || dep.includes('pandas'))) {
        return 'Data analysis and scientific computing';
      }
      if (dependencies.some((dep) => dep.includes('tensorflow') || dep.includes('pytorch'))) {
        return 'Machine learning and artificial intelligence';
      }
    }

    if (['typescript', 'javascript'].includes(language)) {
      if (
        exports.some(
          (exp) => exp.toLowerCase().includes('api') || exp.toLowerCase().includes('server')
        )
      ) {
        return 'API server and backend services';
      }
      if (
        exports.some(
          (exp) => exp.toLowerCase().includes('component') || exp.toLowerCase().includes('ui')
        )
      ) {
        return 'User interface components and frontend logic';
      }
    }

    if (
      exports.some(
        (exp) => exp.toLowerCase().includes('util') || exp.toLowerCase().includes('helper')
      )
    ) {
      return 'Utility functions and helper modules';
    }

    return 'General application logic and business rules';
  }

  private inferComponentRole(module: { filePath: string; functions: any[]; classes: any[] }): string {
    if (module.classes.length > 0) {
      return 'Data model and business logic container';
    }
    if (module.functions.length > 5) {
      return 'Utility module with multiple helper functions';
    }
    if (module.filePath.toLowerCase().includes('test')) {
      return 'Test suite and validation logic';
    }
    return 'Application component with specific functionality';
  }

  private extractResponsibilities(module: { filePath: string; functions: any[]; classes: any[] }): string[] {
    const responsibilities: string[] = [];
    if (module.functions.length > 0) {
      responsibilities.push('Function execution and data processing');
    }
    if (module.classes.length > 0) {
      responsibilities.push('Object state management and behavior');
    }
    // No dependency info in new structure; skip for now
    return responsibilities.length > 0 ? responsibilities : ['Core application functionality'];
  }

  private analyzeRelationships(_: { filePath: string; functions: any[]; classes: any[] }): ArchitecturalAnnotation['relationships'] {
    // No dependency info in new structure; return empty array
    return [];
  }

  private calculateCohesion(module: { filePath: string; functions: any[]; classes: any[] }): number {
    // Simple heuristic: fewer responsibilities = higher cohesion
    const totalExports = module.functions.length + module.classes.length;
    return Math.max(0, Math.min(1, 1 - totalExports / 10));
  }

  private calculateCoupling(_module: { filePath: string; functions: any[]; classes: any[] }): number {
    // No dependency info in new structure; return 0
    return 0;
  }

  private assessTestability(module: { filePath: string; functions: any[]; classes: any[] }): number {
    // Simple heuristic: pure functions are more testable
    const pureFunctionCount = module.functions.filter(
      (fn) => !fn.isAsync && (fn.parameters?.length || 0) <= 3
    ).length;
    const totalFunctions = module.functions.length;
    return totalFunctions > 0 ? pureFunctionCount / totalFunctions : 0.5;
  }

  private identifyDesignPrinciples(module: { filePath: string; functions: any[]; classes: any[] }): string[] {
    const principles: string[] = [];
    if (module.functions.length > 0 && module.classes.length === 0) {
      principles.push('Functional programming approach');
    }
    if (module.classes.length === 1) {
      principles.push('Single responsibility principle');
    }
    // No dependency info in new structure; skip for now
    return principles;
  }

  private detectViolations(module: { filePath: string; functions: any[]; classes: any[] }): string[] {
    const violations: string[] = [];
    if (module.functions.length > 10) {
      violations.push('Too many functions in single module');
    }
    // No dependency info in new structure; skip for now
    return violations;
  }

  private generateSummary(
    context: CodeContext,
    patterns: PatternAnnotation[],
    architecture: ArchitecturalAnnotation[],
    opportunities: TransformationOpportunity[]
  ) {
    const antiPatterns = patterns.filter((p) => p.type === 'anti-pattern');
    const designPatterns = patterns.filter((p) => p.type === 'design');
    const highRiskOpportunities = opportunities.filter((o) => o.risk === 'high');

    return {
      overview: `Analyzed ${context.language} codebase with ${architecture.length} components, ${patterns.length} patterns detected, and ${opportunities.length} improvement opportunities identified.`,
      keyFindings: [
        `${designPatterns.length} design patterns implemented`,
        `${antiPatterns.length} anti-patterns requiring attention`,
        `Average complexity: ${context.complexity.toFixed(2)}`,
        `${context.dependencies.length} external dependencies`,
      ],
      recommendations: opportunities.slice(0, 5).map((o) => o.title),
      riskAreas: highRiskOpportunities.map((o) => o.title),
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
      codeReview: `Review this ${context.language} codebase focusing on: ${patterns.map((p) => p.category).join(', ')}. Pay attention to ${opportunities.length} identified improvement areas.`,
      refactoring: `Suggest refactoring strategies for this ${context.framework || context.language} project. Priority areas: ${opportunities
        .slice(0, 3)
        .map((o) => o.title)
        .join(', ')}.`,
      optimization: `Analyze performance optimization opportunities in this codebase with ${context.complexity.toFixed(1)} average complexity. Focus on: ${opportunities
        .filter((o) => o.type === 'optimize')
        .map((o) => o.title)
        .join(', ')}.`,
      testing: `Generate comprehensive test strategies for this ${context.language} project with ${context.exports.length} exported functions/classes.`,
      documentation: `Create documentation for this ${context.purpose} codebase, highlighting: ${patterns
        .filter((p) => p.type === 'design')
        .map((p) => p.name)
        .join(', ')}.`,
    };
  }

  private calculateOverallConfidence(
    patterns: PatternAnnotation[],
    architecture: ArchitecturalAnnotation[]
  ): number {
    if (patterns.length === 0) return 0.5;

    const avgPatternConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const architectureBonus = Math.min(0.2, architecture.length * 0.05);

    return Math.min(1, avgPatternConfidence + architectureBonus);
  }

  private async saveAnnotation(
    annotation: LLMAnnotation,
    request: AnnotationRequest
  ): Promise<string> {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

  const outputDir = request.targetDirectory || './output/annotations';
  DirectoryPathSchema.parse(outputDir);
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
    try {
      // Create a clean object for YAML serialization
      const yamlData = {
        id: annotation.id,
        timestamp: annotation.timestamp,
        version: annotation.version,
        metadata: {
          analyzer: annotation.metadata.analyzer,
          confidence: annotation.metadata.confidence,
          processingTime: annotation.metadata.processingTime,
          sourceFiles: annotation.metadata.sourceFiles,
          totalLines: annotation.metadata.totalLines,
        },
        summary: {
          overview: annotation.summary.overview,
          keyFindings: annotation.summary.keyFindings,
          recommendations: annotation.summary.recommendations,
          patternsDetected: annotation.patterns.length,
          opportunitiesFound: annotation.opportunities.length,
        },
        patterns: annotation.patterns.map((pattern) => ({
          name: pattern.name,
          type: pattern.type,
          impact: pattern.impact,
          description: pattern.description,
          location: {
            file: pattern.location.file,
            startLine: pattern.location.startLine,
            endLine: pattern.location.endLine,
          },
          confidence: pattern.confidence,
        })),
        opportunities: annotation.opportunities.map((opp) => ({
          description: opp.description,
          effort: opp.effort,
          location: opp.location,
          benefits: opp.benefits,
          steps: opp.steps,
          estimatedImpact: opp.estimatedImpact,
          risk: opp.risk,
          title: opp.title,
          type: opp.type,
          rationale: opp.rationale,
        })),
        architecture: annotation.architecture,
      };

      return yaml.dump(yamlData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: true,
        quotingType: '"',
        forceQuotes: false,
      });
    } catch (error) {
      // Fallback to simple YAML-like format if serialization fails
      return `# LLM Annotation (Error in YAML serialization)
id: ${annotation.id}
timestamp: ${annotation.timestamp}
version: ${annotation.version}
error: "Failed to serialize annotation to YAML format"
`;
    }
  }

  private toMarkdown(annotation: LLMAnnotation): string {
    return `# LLM Code Analysis Annotation

**ID:** ${annotation.id}  
**Generated:** ${annotation.timestamp}  
**Analyzer:** ${annotation.metadata.analyzer}  

## Summary

${annotation.summary.overview}

### Key Findings
${annotation.summary.keyFindings.map((finding) => `- ${finding}`).join('\n')}

### Recommendations
${annotation.summary.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Patterns Detected (${annotation.patterns.length})

${annotation.patterns
  .slice(0, 10)
  .map(
    (pattern) =>
      `### ${pattern.name}
- **Type:** ${pattern.type}
- **Impact:** ${pattern.impact}
- **Location:** ${pattern.location.file}:${pattern.location.startLine}
- **Description:** ${pattern.description}
`
  )
  .join('\n')}

## Transformation Opportunities (${annotation.opportunities.length})

${annotation.opportunities
  .slice(0, 5)
  .map(
    (opp) =>
      `### ${opp.title}
- **Type:** ${opp.type}
- **Effort:** ${opp.effort}
- **Risk:** ${opp.risk}
- **Benefits:** ${opp.benefits.join(', ')}
- **Description:** ${opp.description}
`
  )
  .join('\n')}

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

  private getValidationMethod(language: string): string {
    switch (language) {
      case 'typescript':
        return 'TypeScript compilation check';
      case 'javascript':
        return 'ESLint and runtime testing';
      case 'python':
        return 'Python syntax check and unit tests';
      case 'cpp':
      case 'c':
        return 'Compilation with gcc/clang and unit tests';
      case 'cuda':
        return 'NVCC compilation and CUDA runtime tests';
      case 'java':
        return 'javac compilation and JUnit tests';
      case 'rust':
        return 'Rust compiler check and cargo test';
      default:
        return 'Language-specific compilation and testing';
    }
  }
}

// Create and export the annotation actor
export const llmAnnotationActor = fromPromise(async ({ input }: { input: AnnotationRequest }) => {
  const analyzer = new LLMAnnotationAnalyzer();
  return await analyzer.generateAnnotations(input);
});

// Export convenience functions
export const generateLLMAnnotations = async (
  request: AnnotationRequest
): Promise<AnnotationResult> => {
  const analyzer = new LLMAnnotationAnalyzer();
  return await analyzer.generateAnnotations(request);
};

export const validateAnnotationRequest = (data: unknown): AnnotationRequest => {
  return AnnotationRequestSchema.parse(data);
};
