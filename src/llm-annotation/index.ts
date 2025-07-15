import { fromPromise } from 'xstate';
import {
  generateLLMAnnotations,
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  validateAnnotationRequest,
} from './analyzer.js';
import type { AnnotationRequest, AnnotationResult, LLMAnnotation } from './types.js';
// import { AnnotationRequestSchema } from './types.js';

/**
 * LLM Annotation System
 *
 * Main interface for generating LLM-optimized code annotations
 * that help language models understand code structure, patterns,
 * and transformation opportunities.
 */
export class LLMAnnotationSystem {
  private analyzer: LLMAnnotationAnalyzer;

  constructor() {
    this.analyzer = new LLMAnnotationAnalyzer();
  }

  /**
   * Generate annotations for a set of source files
   */
  async annotate(request: AnnotationRequest): Promise<AnnotationResult> {
    return await this.analyzer.generateAnnotations(request);
  }

  /**
   * Generate annotations for a directory
   */
  async annotateDirectory(
    directoryPath: string,
    options: Partial<AnnotationRequest> = {}
  ): Promise<AnnotationResult> {
    const { readdir, stat } = await import('fs/promises');
    const { join, extname } = await import('path');

    // Recursively find source files
    const sourceFiles: string[] = [];

    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await readdir(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Skip common directories to exclude
            if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry)) {
              await scanDirectory(fullPath);
            }
          } else if (stats.isFile()) {
            const ext = extname(fullPath);
            if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
              sourceFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    };

    await scanDirectory(directoryPath);

    const request: AnnotationRequest = {
      sourceFiles,
      targetDirectory: options.targetDirectory || './output/annotations',
      includePatterns: options.includePatterns || ['**/*.ts', '**/*.js'],
      excludePatterns: options.excludePatterns || ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      analysisDepth: options.analysisDepth || 'detailed',
      focusAreas: options.focusAreas,
      outputFormat: options.outputFormat || 'json',
      includePrompts: options.includePrompts !== false,
    };

    return await this.annotate(request);
  }

  /**
   * Generate annotations for the current project
   */
  async annotateProject(options: Partial<AnnotationRequest> = {}): Promise<AnnotationResult> {
    return await this.annotateDirectory('.', options);
  }

  /**
   * Extract LLM prompts from an annotation
   */
  extractPrompts(annotation: LLMAnnotation): Record<string, string> {
    return annotation.llmPrompts;
  }

  /**
   * Get transformation opportunities from an annotation
   */
  getOpportunities(annotation: LLMAnnotation) {
    return annotation.opportunities.sort((a, b) => {
      // Sort by impact and effort
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const effortOrder = { trivial: 1, small: 2, medium: 3, large: 4, epic: 5 };

      const aScore =
        (impactOrder[a.risk as keyof typeof impactOrder] || 0) /
        (effortOrder[a.effort as keyof typeof effortOrder] || 1);
      const bScore =
        (impactOrder[b.risk as keyof typeof impactOrder] || 0) /
        (effortOrder[b.effort as keyof typeof effortOrder] || 1);

      return bScore - aScore;
    });
  }

  /**
   * Generate a summary report from an annotation
   */
  generateReport(annotation: LLMAnnotation): string {
    const opportunities = this.getOpportunities(annotation);
    const topOpportunities = opportunities.slice(0, 5);

    return `# LLM Code Analysis Report

**Generated:** ${annotation.timestamp}  
**Confidence:** ${(annotation.metadata.confidence * 100).toFixed(1)}%  
**Processing Time:** ${(annotation.metadata.processingTime / 1000).toFixed(2)}s  

## Overview
${annotation.summary.overview}

## Key Findings
${annotation.summary.keyFindings.map((finding) => `- ${finding}`).join('\n')}

## Top Recommendations
${annotation.summary.recommendations
  .slice(0, 5)
  .map((rec, i) => `${i + 1}. ${rec}`)
  .join('\n')}

## Priority Transformation Opportunities

${topOpportunities
  .map(
    (opp, i) => `### ${i + 1}. ${opp.title}
- **Type:** ${opp.type}
- **Effort:** ${opp.effort}
- **Risk:** ${opp.risk}
- **Benefits:** ${opp.benefits.join(', ')}

${opp.description}
`
  )
  .join('\n')}

## Code Patterns Detected
${annotation.patterns.map((pattern) => `- **${pattern.name}** (${pattern.type}): ${pattern.description}`).join('\n')}

## Architecture Analysis
${annotation.architecture.map((arch) => `- **${arch.component}** (${arch.type}): ${arch.role}`).join('\n')}

## LLM Integration Prompts

### Code Review Prompt
\`\`\`
${annotation.llmPrompts.codeReview}
\`\`\`

### Refactoring Prompt
\`\`\`
${annotation.llmPrompts.refactoring}
\`\`\`

### Optimization Prompt
\`\`\`
${annotation.llmPrompts.optimization}
\`\`\`

---
*Generated by Carmack Coder LLM Annotation System v${annotation.version}*
`;
  }

  /**
   * Validate an annotation request
   */
  validateRequest(data: unknown): AnnotationRequest {
    return validateAnnotationRequest(data);
  }
}

// Create and export the annotation system actor
export const llmAnnotationSystemActor = fromPromise(
  async ({ input }: { input: AnnotationRequest }) => {
    const system = new LLMAnnotationSystem();
    return await system.annotate(input);
  }
);

// Export convenience functions
export const createLLMAnnotations = async (
  request: AnnotationRequest
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotate(request);
};

export const annotateDirectory = async (
  directoryPath: string,
  options: Partial<AnnotationRequest> = {}
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotateDirectory(directoryPath, options);
};

export const annotateProject = async (
  options: Partial<AnnotationRequest> = {}
): Promise<AnnotationResult> => {
  const system = new LLMAnnotationSystem();
  return await system.annotateProject(options);
};

// Re-export types and components
export {
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  generateLLMAnnotations,
  validateAnnotationRequest,
};
export type { AnnotationRequest, AnnotationResult, LLMAnnotation };
export * from './types.js';
