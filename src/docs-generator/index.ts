import { DocumentationGenerator } from './generator.ts';

import type { DocumentationResult } from './types.ts';
import {
  validateDocumentationRequest,
  validateDocumentationResult,
} from './types.ts';

/**
 * Carmack Coder Documentation System
 *
 * Comprehensive auto-documentation system with AST-grep integration
 * for generating API docs, architecture diagrams, pattern catalogs, and more.
 */

export * from './ast-analyzer.ts';
export * from './generator.ts';
export * from './types.ts';


/**
 * Main documentation API
 */
export class DocumentationSystem {
  private generator: DocumentationGenerator;

  constructor() {
    this.generator = new DocumentationGenerator();
  }

  /**
   * Generate API documentation for the entire codebase
   */
  async generateAPIDocumentation(
    options: {
      outputPath?: string;
      format?: 'markdown' | 'html' | 'json';
      includePrivate?: boolean;
      includeTests?: boolean;
      sourceFiles?: string[];
      sourceDir?: string;
    } = {}
  ): Promise<DocumentationResult> {
    const request = validateDocumentationRequest({
      type: 'api',
      format: options.format || 'markdown',
      outputPath: options.outputPath || './docs/api.md',
      includePrivate: options.includePrivate || false,
      includeTests: options.includeTests || false,
      includeExamples: true,
      sourceDir: options.sourceDir,
      sourceFiles: options.sourceFiles,
    });
    const result = await this.generator.generateDocumentation(request);
    return validateDocumentationResult(result);
  }

  /**
   * Generate architecture documentation
   */
  async generateArchitectureDocumentation(
    options: { outputPath?: string; format?: 'markdown' | 'html' | 'json'; sourceFiles?: string[]; sourceDir?: string } = {}
  ): Promise<DocumentationResult> {
    const request = validateDocumentationRequest({
      type: 'architecture',
      format: options.format || 'markdown',
      outputPath: options.outputPath || './docs/architecture.md',
      includePrivate: false,
      includeTests: false,
      includeExamples: true,
      sourceDir: options.sourceDir,
      sourceFiles: options.sourceFiles,
    });
    const result = await this.generator.generateDocumentation(request);
    return validateDocumentationResult(result);
  }

  /**
   * Generate pattern documentation
   */
  async generatePatternDocumentation(
    options: { outputPath?: string; format?: 'markdown' | 'html' | 'json'; sourceFiles?: string[]; sourceDir?: string } = {}
  ): Promise<DocumentationResult> {
    const request = validateDocumentationRequest({
      type: 'patterns',
      format: options.format || 'markdown',
      outputPath: options.outputPath || './docs/patterns.md',
      includePrivate: false,
      includeTests: false,
      includeExamples: true,
      sourceDir: options.sourceDir,
      sourceFiles: options.sourceFiles,
    });
    const result = await this.generator.generateDocumentation(request);
    return validateDocumentationResult(result);
  }

  /**
   * Generate usage documentation
   */
  async generateUsageDocumentation(
    options: { outputPath?: string; format?: 'markdown' | 'html' | 'json'; sourceFiles?: string[]; sourceDir?: string } = {}
  ): Promise<DocumentationResult> {
    const request = validateDocumentationRequest({
      type: 'usage',
      format: options.format || 'markdown',
      outputPath: options.outputPath || './docs/usage.md',
      includePrivate: false,
      includeTests: false,
      includeExamples: true,
      sourceDir: options.sourceDir,
      sourceFiles: options.sourceFiles,
    });
    const result = await this.generator.generateDocumentation(request);
    return validateDocumentationResult(result);
  }

  /**
   * Generate all documentation types
   */
  async generateAllDocumentation(
    options: {
      outputDir?: string;
      format?: 'markdown' | 'html' | 'json';
      includePrivate?: boolean;
      includeTests?: boolean;
      sourceDir?: string;
    } = {}
  ): Promise<DocumentationResult[]> {
    const outputDir = options.outputDir || './docs';
    const format = options.format || 'markdown';
    const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'json';

    // Discover source files from sourceDir
    const sourceDir = options.sourceDir || './src';
    const sourceFiles = await this.generator.discoverSourceFiles(sourceDir);

    const results = await Promise.all([
      this.generateAPIDocumentation({
        outputPath: `${outputDir}/api.${ext}`,
        format,
        includePrivate: options.includePrivate ?? false,
        includeTests: options.includeTests ?? false,
        sourceFiles,
        sourceDir,
      }),
      this.generateArchitectureDocumentation({
        outputPath: `${outputDir}/architecture.${ext}`,
        format,
        sourceFiles,
        sourceDir,
      }),
      this.generatePatternDocumentation({
        outputPath: `${outputDir}/patterns.${ext}`,
        format,
        sourceDir,
      }),
      this.generateUsageDocumentation({
        outputPath: `${outputDir}/usage.${ext}`,
        format,
        sourceFiles,
        sourceDir,
      }),
    ]);

    return results;
  }

  /**
   * Write documentation to files
   */
  async writeDocumentation(result: DocumentationResult): Promise<void> {
    // Validate result before writing
    const validated = validateDocumentationResult(result);
    if (!validated.outputPath) {
      throw new Error('No output path specified');
    }

    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');

    // Ensure directory exists
    await mkdir(dirname(validated.outputPath), { recursive: true });

    // Write content
    await writeFile(validated.outputPath, validated.content, 'utf-8');

    console.log(`Documentation written to ${validated.outputPath}`);
  }

  /**
   * Generate and write all documentation
   */
  async generateAndWriteAll(
    options: {
      outputDir?: string;
      format?: 'markdown' | 'html' | 'json';
      includePrivate?: boolean;
      includeTests?: boolean;
      sourceDir?: string;
    } = {}
  ): Promise<void> {
    console.log('🚀 Generating comprehensive documentation...');

    const results = await this.generateAllDocumentation(options);

    for (const result of results) {
      if (result.errors && result.errors.length > 0) {
        console.error(`❌ Errors in ${result.type} documentation:`, result.errors);
      }

      if (result.warnings && result.warnings.length > 0) {
        console.warn(`⚠️ Warnings in ${result.type} documentation:`, result.warnings);
      }

      if (result.outputPath) {
        await this.writeDocumentation(result);
      }
    }

    console.log('✅ Documentation generation complete!');

    // Print summary
    const totalFiles = results.length;
    const successfulFiles = results.filter((r) => !r.errors || r.errors.length === 0).length;
    const totalFunctions = results.reduce((sum, r) => sum + (r.metadata.totalFunctions || 0), 0);
    const totalClasses = results.reduce((sum, r) => sum + (r.metadata.totalClasses || 0), 0);
    const totalModules = results.reduce((sum, r) => sum + (r.metadata.totalModules || 0), 0);

    console.log('\n📊 Documentation Summary:');
    console.log(`   Files generated: ${successfulFiles}/${totalFiles}`);
    console.log(`   Functions documented: ${totalFunctions}`);
    console.log(`   Classes documented: ${totalClasses}`);
    console.log(`   Modules analyzed: ${totalModules}`);

    const totalTime = results.reduce((sum, r) => sum + (r.metadata.generationTime || 0), 0);
    console.log(`   Total generation time: ${totalTime}ms`);
  }
}

// Create default instance
export const documentationSystem = new DocumentationSystem();

// Convenience functions
export const generateAPIDocumentation = (
  options?: Parameters<DocumentationSystem['generateAPIDocumentation']>[0]
) => documentationSystem.generateAPIDocumentation(options);

export const generateArchitectureDocumentation = (
  options?: Parameters<DocumentationSystem['generateArchitectureDocumentation']>[0]
) => documentationSystem.generateArchitectureDocumentation(options);

export const generatePatternDocumentation = (
  options?: Parameters<DocumentationSystem['generatePatternDocumentation']>[0]
) => documentationSystem.generatePatternDocumentation(options);

export const generateAllDocumentation = (
  options?: Parameters<DocumentationSystem['generateAllDocumentation']>[0]
) => documentationSystem.generateAllDocumentation(options);

export const generateAndWriteAll = (
  options?: Parameters<DocumentationSystem['generateAndWriteAll']>[0]
) => documentationSystem.generateAndWriteAll(options);
