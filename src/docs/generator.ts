import { fromPromise } from 'xstate';
// import { z } from 'zod';
import type {
  DocumentationRequest,
  DocumentationResult,
  // DocumentationType,
  // DocumentationFormat,
  ModuleDoc,
  FunctionDoc,
  ClassDoc,
  PatternDoc,
  ArchitectureDoc,
} from './types.js';
import { ASTGrepAnalyzer } from './ast-analyzer.js';

/**
 * Documentation Generator
 * 
 * Generates comprehensive documentation from codebase analysis using AST-grep
 * and pattern recognition. Supports multiple output formats and documentation types.
 */
export class DocumentationGenerator {
  private analyzer: ASTGrepAnalyzer;

  constructor() {
    this.analyzer = new ASTGrepAnalyzer();
  }

  /**
   * Generate documentation based on request
   */
  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResult> {
    const startTime = Date.now();
    
    try {
      // Discover source files if not provided
      const sourceFiles = request.sourceFiles || await this.discoverSourceFiles();
      
      // Generate documentation based on type
      let content: string;
      let metadata: any = {
        generatedAt: new Date().toISOString(),
        sourceFiles,
        totalFunctions: 0,
        totalClasses: 0,
        totalModules: sourceFiles.length,
        totalPatterns: 0,
        generationTime: 0,
      };

      switch (request.type) {
        case 'api':
          content = await this.generateAPIDocumentation(sourceFiles, request);
          break;
        case 'architecture':
          content = await this.generateArchitectureDocumentation(sourceFiles, request);
          break;
        case 'patterns':
          content = await this.generatePatternDocumentation(request);
          break;
        case 'usage':
          content = await this.generateUsageDocumentation(sourceFiles, request);
          break;
        case 'changelog':
          content = await this.generateChangelogDocumentation(sourceFiles, request);
          break;
        default:
          throw new Error(`Unsupported documentation type: ${request.type}`);
      }

      metadata.generationTime = Date.now() - startTime;

      return {
        type: request.type,
        format: request.format,
        content,
        metadata,
        outputPath: request.outputPath,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      return {
        type: request.type,
        format: request.format,
        content: '',
        metadata: {
          generatedAt: new Date().toISOString(),
          sourceFiles: [],
          totalFunctions: 0,
          totalClasses: 0,
          totalModules: 0,
          totalPatterns: 0,
          generationTime: Date.now() - startTime,
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Generate API documentation
   */
  private async generateAPIDocumentation(
    sourceFiles: string[],
    request: DocumentationRequest
  ): Promise<string> {
    const modules: ModuleDoc[] = [];
    
    for (const filePath of sourceFiles) {
      try {
        const moduleDoc = await this.analyzer.analyzeFile(filePath);
        modules.push(moduleDoc);
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }

    switch (request.format) {
      case 'markdown':
        return this.generateAPIMarkdown(modules, request);
      case 'html':
        return this.generateAPIHTML(modules, request);
      case 'json':
        return JSON.stringify(modules, null, 2);
      default:
        return this.generateAPIMarkdown(modules, request);
    }
  }

  /**
   * Generate architecture documentation
   */
  private async generateArchitectureDocumentation(
    sourceFiles: string[],
    request: DocumentationRequest
  ): Promise<string> {
    const architecture = await this.analyzeArchitecture(sourceFiles);
    
    switch (request.format) {
      case 'markdown':
        return this.generateArchitectureMarkdown(architecture);
      case 'html':
        return this.generateArchitectureHTML(architecture);
      case 'json':
        return JSON.stringify(architecture, null, 2);
      default:
        return this.generateArchitectureMarkdown(architecture);
    }
  }

  /**
   * Generate pattern documentation
   */
  private async generatePatternDocumentation(request: DocumentationRequest): Promise<string> {
    const patterns = await this.loadPatterns();
    
    switch (request.format) {
      case 'markdown':
        return this.generatePatternMarkdown(patterns);
      case 'html':
        return this.generatePatternHTML(patterns);
      case 'json':
        return JSON.stringify(patterns, null, 2);
      default:
        return this.generatePatternMarkdown(patterns);
    }
  }

  /**
   * Generate usage documentation
   */
  private async generateUsageDocumentation(
    sourceFiles: string[],
    request: DocumentationRequest
  ): Promise<string> {
    const examples = await this.extractUsageExamples(sourceFiles);
    
    switch (request.format) {
      case 'markdown':
        return this.generateUsageMarkdown(examples);
      case 'html':
        return this.generateUsageHTML(examples);
      case 'json':
        return JSON.stringify(examples, null, 2);
      default:
        return this.generateUsageMarkdown(examples);
    }
  }

  /**
   * Generate changelog documentation
   */
  private async generateChangelogDocumentation(
    sourceFiles: string[],
    request: DocumentationRequest
  ): Promise<string> {
    const changes = await this.analyzeChanges(sourceFiles);
    
    switch (request.format) {
      case 'markdown':
        return this.generateChangelogMarkdown(changes);
      case 'html':
        return this.generateChangelogHTML(changes);
      case 'json':
        return JSON.stringify(changes, null, 2);
      default:
        return this.generateChangelogMarkdown(changes);
    }
  }

  /**
   * Generate API documentation in Markdown format
   */
  private generateAPIMarkdown(modules: ModuleDoc[], request: DocumentationRequest): string {
    let markdown = '# API Documentation\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;
    
    // Table of contents
    markdown += '## Table of Contents\n\n';
    for (const module of modules) {
      markdown += `- [${module.name}](#${module.name.toLowerCase()})\n`;
    }
    markdown += '\n';

    // Module documentation
    for (const module of modules) {
      markdown += `## ${module.name}\n\n`;
      
      if (module.description) {
        markdown += `${module.description}\n\n`;
      }

      markdown += `**File:** \`${module.filePath}\`\n\n`;

      // Functions
      if (module.exports.functions.length > 0) {
        markdown += '### Functions\n\n';
        for (const func of module.exports.functions) {
          markdown += this.generateFunctionMarkdown(func, request.includePrivate);
        }
      }

      // Classes
      if (module.exports.classes.length > 0) {
        markdown += '### Classes\n\n';
        for (const cls of module.exports.classes) {
          markdown += this.generateClassMarkdown(cls, request.includePrivate);
        }
      }

      // Types
      if (module.exports.types.length > 0) {
        markdown += '### Types\n\n';
        for (const type of module.exports.types) {
          markdown += `- \`${type}\`\n`;
        }
        markdown += '\n';
      }

      // Constants
      if (module.exports.constants.length > 0) {
        markdown += '### Constants\n\n';
        for (const constant of module.exports.constants) {
          markdown += `#### \`${constant.name}\`\n\n`;
          markdown += `**Type:** \`${constant.type}\`\n\n`;
          if (constant.value) {
            markdown += `**Value:** \`${constant.value}\`\n\n`;
          }
          if (constant.description) {
            markdown += `${constant.description}\n\n`;
          }
        }
      }

      // Dependencies
      if (module.dependencies.length > 0) {
        markdown += '### Dependencies\n\n';
        for (const dep of module.dependencies) {
          markdown += `- \`${dep}\`\n`;
        }
        markdown += '\n';
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Generate function documentation in Markdown
   */
  private generateFunctionMarkdown(func: FunctionDoc, includePrivate: boolean): string {
    if (!includePrivate && !func.isExported) {
      return '';
    }

    let markdown = `#### \`${func.signature}\`\n\n`;
    
    if (func.description) {
      markdown += `${func.description}\n\n`;
    }

    if (func.parameters.length > 0) {
      markdown += '**Parameters:**\n\n';
      for (const param of func.parameters) {
        const optional = param.optional ? ' (optional)' : '';
        markdown += `- \`${param.name}\` (\`${param.type}\`)${optional}`;
        if (param.description) {
          markdown += ` - ${param.description}`;
        }
        markdown += '\n';
      }
      markdown += '\n';
    }

    if (func.returnType) {
      markdown += `**Returns:** \`${func.returnType}\`\n\n`;
      if (func.returnDescription) {
        markdown += `${func.returnDescription}\n\n`;
      }
    }

    if (func.examples && func.examples.length > 0) {
      markdown += '**Examples:**\n\n';
      for (const example of func.examples) {
        markdown += '```typescript\n';
        markdown += example;
        markdown += '\n```\n\n';
      }
    }

    const badges: string[] = [];
    if (func.isAsync) badges.push('`async`');
    if (func.isExported) badges.push('`exported`');
    
    if (badges.length > 0) {
      markdown += `**Tags:** ${badges.join(' ')}\n\n`;
    }

    return markdown;
  }

  /**
   * Generate class documentation in Markdown
   */
  private generateClassMarkdown(cls: ClassDoc, includePrivate: boolean): string {
    if (!includePrivate && !cls.isExported) {
      return '';
    }

    let markdown = `#### \`${cls.name}\`\n\n`;
    
    if (cls.description) {
      markdown += `${cls.description}\n\n`;
    }

    if (cls.extends) {
      markdown += `**Extends:** \`${cls.extends}\`\n\n`;
    }

    if (cls.implements && cls.implements.length > 0) {
      markdown += `**Implements:** ${cls.implements.map(i => `\`${i}\``).join(', ')}\n\n`;
    }

    // Properties
    if (cls.properties.length > 0) {
      markdown += '**Properties:**\n\n';
      for (const prop of cls.properties) {
        const modifiers: string[] = [];
        if (prop.readonly) modifiers.push('readonly');
        if (prop.optional) modifiers.push('optional');
        
        const modifierStr = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : '';
        markdown += `- \`${prop.name}: ${prop.type}\`${modifierStr}`;
        if (prop.description) {
          markdown += ` - ${prop.description}`;
        }
        markdown += '\n';
      }
      markdown += '\n';
    }

    // Methods
    if (cls.methods.length > 0) {
      markdown += '**Methods:**\n\n';
      for (const method of cls.methods) {
        markdown += this.generateFunctionMarkdown(method, includePrivate);
      }
    }

    return markdown;
  }

  /**
   * Discover source files in the project
   */
  private async discoverSourceFiles(): Promise<string[]> {
    const { readdir, stat } = await import('fs/promises');
    const { join } = await import('path');
    
    const files: string[] = [];
    
    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await readdir(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (stats.isFile() && /\.(ts|js)$/.test(entry)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    }
    
    await scanDirectory('./src');
    return files;
  }

  /**
   * Analyze architecture from source files
   */
  private async analyzeArchitecture(sourceFiles: string[]): Promise<ArchitectureDoc> {
    const components: ArchitectureDoc['components'] = [];
    const dataFlow: ArchitectureDoc['dataFlow'] = [];
    
    for (const filePath of sourceFiles) {
      try {
        const moduleDoc = await this.analyzer.analyzeFile(filePath);
        
        // Determine component type
        let type: 'actor' | 'utility' | 'type' | 'pattern' | 'config' = 'utility';
        if (filePath.includes('/actors/')) type = 'actor';
        else if (filePath.includes('/types')) type = 'type';
        else if (filePath.includes('/patterns/')) type = 'pattern';
        else if (filePath.includes('config')) type = 'config';
        
        components.push({
          name: moduleDoc.name,
          type,
          description: moduleDoc.description || `${type} component`,
          filePath,
          dependencies: moduleDoc.dependencies,
          dependents: [], // Would need reverse dependency analysis
        });
        
        // Analyze data flow from imports
        for (const imp of moduleDoc.imports) {
          dataFlow.push({
            from: imp.module,
            to: moduleDoc.name,
            type: 'function_call',
            description: `Imports from ${imp.module}`,
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze architecture for ${filePath}:`, error);
      }
    }
    
    // Define architectural layers
    const layers = [
      {
        name: 'Presentation',
        components: components.filter(c => c.type === 'config').map(c => c.name),
        description: 'Configuration and external interfaces',
      },
      {
        name: 'Business Logic',
        components: components.filter(c => c.type === 'actor').map(c => c.name),
        description: 'Core business logic and state management',
      },
      {
        name: 'Data',
        components: components.filter(c => c.type === 'type' || c.type === 'pattern').map(c => c.name),
        description: 'Data structures and transformation patterns',
      },
      {
        name: 'Utilities',
        components: components.filter(c => c.type === 'utility').map(c => c.name),
        description: 'Shared utilities and helper functions',
      },
    ];
    
    return { components, dataFlow, layers };
  }

  /**
   * Generate architecture documentation in Markdown
   */
  private generateArchitectureMarkdown(architecture: ArchitectureDoc): string {
    let markdown = '# Architecture Documentation\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;
    
    // Overview
    markdown += '## Overview\n\n';
    markdown += 'This document describes the architectural structure of the Carmack Coder system.\n\n';
    
    // Layers
    markdown += '## Architectural Layers\n\n';
    for (const layer of architecture.layers) {
      markdown += `### ${layer.name}\n\n`;
      markdown += `${layer.description}\n\n`;
      
      if (layer.components.length > 0) {
        markdown += '**Components:**\n';
        for (const component of layer.components) {
          markdown += `- ${component}\n`;
        }
        markdown += '\n';
      }
    }
    
    // Components
    markdown += '## Components\n\n';
    for (const component of architecture.components) {
      markdown += `### ${component.name}\n\n`;
      markdown += `**Type:** ${component.type}\n\n`;
      markdown += `**File:** \`${component.filePath}\`\n\n`;
      markdown += `${component.description}\n\n`;
      
      if (component.dependencies.length > 0) {
        markdown += '**Dependencies:**\n';
        for (const dep of component.dependencies) {
          markdown += `- ${dep}\n`;
        }
        markdown += '\n';
      }
    }
    
    // Data Flow
    markdown += '## Data Flow\n\n';
    markdown += 'The following diagram shows the data flow between components:\n\n';
    markdown += '```mermaid\n';
    markdown += 'graph TD\n';
    
    for (const flow of architecture.dataFlow) {
      const fromSafe = flow.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toSafe = flow.to.replace(/[^a-zA-Z0-9]/g, '_');
      markdown += `  ${fromSafe}[${flow.from}] --> ${toSafe}[${flow.to}]\n`;
    }
    
    markdown += '```\n\n';
    
    return markdown;
  }

  /**
   * Load transformation patterns
   */
  private async loadPatterns(): Promise<PatternDoc[]> {
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile('./src/patterns/enhanced-templates.json', 'utf-8');
      const data = JSON.parse(content);
      
      return data.patterns.map((pattern: any) => ({
        id: pattern.id,
        name: pattern.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: pattern.description,
        category: pattern.category,
        complexity: pattern.complexity,
        riskLevel: pattern.riskLevel,
        pattern: pattern.pattern.template || pattern.pattern,
        replacement: pattern.replacement.template || pattern.replacement,
        examples: pattern.testCases?.map((test: any) => ({
          before: test.input,
          after: test.expected,
          description: test.description,
        })) || [],
        performance: pattern.performance,
      }));
    } catch (error) {
      console.warn('Failed to load patterns:', error);
      return [];
    }
  }

  /**
   * Generate pattern documentation in Markdown
   */
  private generatePatternMarkdown(patterns: PatternDoc[]): string {
    let markdown = '# Transformation Patterns\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;
    
    // Group patterns by category
    const categories = [...new Set(patterns.map(p => p.category))];
    
    for (const category of categories) {
      const categoryPatterns = patterns.filter(p => p.category === category);
      
      markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      for (const pattern of categoryPatterns) {
        markdown += `### ${pattern.name}\n\n`;
        markdown += `${pattern.description}\n\n`;
        
        markdown += `**Complexity:** ${pattern.complexity}/10\n\n`;
        markdown += `**Risk Level:** ${pattern.riskLevel}\n\n`;
        
        markdown += '**Pattern:**\n```typescript\n';
        markdown += pattern.pattern;
        markdown += '\n```\n\n';
        
        markdown += '**Replacement:**\n```typescript\n';
        markdown += pattern.replacement;
        markdown += '\n```\n\n';
        
        if (pattern.examples.length > 0) {
          markdown += '**Examples:**\n\n';
          for (const example of pattern.examples) {
            markdown += `*${example.description}*\n\n`;
            markdown += 'Before:\n```typescript\n';
            markdown += example.before;
            markdown += '\n```\n\n';
            markdown += 'After:\n```typescript\n';
            markdown += example.after;
            markdown += '\n```\n\n';
          }
        }
        
        markdown += '---\n\n';
      }
    }
    
    return markdown;
  }

  // Placeholder methods for other documentation types
  private async generateAPIHTML(_modules: ModuleDoc[], _request: DocumentationRequest): Promise<string> {
    return '<html><body><h1>API Documentation</h1><p>HTML format not yet implemented</p></body></html>';
  }

  private async generateArchitectureHTML(_architecture: ArchitectureDoc): Promise<string> {
    return '<html><body><h1>Architecture Documentation</h1><p>HTML format not yet implemented</p></body></html>';
  }

  private async generatePatternHTML(_patterns: PatternDoc[]): Promise<string> {
    return '<html><body><h1>Pattern Documentation</h1><p>HTML format not yet implemented</p></body></html>';
  }

  private async extractUsageExamples(_sourceFiles: string[]): Promise<any[]> {
    return []; // Placeholder
  }

  private async generateUsageMarkdown(_examples: any[]): Promise<string> {
    return '# Usage Documentation\n\nUsage documentation not yet implemented.';
  }

  private async generateUsageHTML(_examples: any[]): Promise<string> {
    return '<html><body><h1>Usage Documentation</h1><p>HTML format not yet implemented</p></body></html>';
  }

  private async analyzeChanges(_sourceFiles: string[]): Promise<any[]> {
    return []; // Placeholder
  }

  private async generateChangelogMarkdown(_changes: any[]): Promise<string> {
    return '# Changelog\n\nChangelog generation not yet implemented.';
  }

  private async generateChangelogHTML(_changes: any[]): Promise<string> {
    return '<html><body><h1>Changelog</h1><p>HTML format not yet implemented</p></body></html>';
  }
}

// Create and export the documentation generator actor
export const documentationGeneratorActor = fromPromise(
  async ({ input }: { input: DocumentationRequest }) => {
    const generator = new DocumentationGenerator();
    return await generator.generateDocumentation(input);
  }
);