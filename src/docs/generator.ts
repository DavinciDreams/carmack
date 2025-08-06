import { fromPromise } from 'xstate';
import { z } from 'zod';

import { ASTAnalyzer } from '../docs/ast-analyzer.ts';
import { validateDocumentationRequest, validateDocumentationResult } from './types.ts';

import type {

  ArchitectureDoc,
  ClassDoc,
  DocumentationRequest,
  DocumentationResult,
  FunctionDoc,
  ModuleDoc,
  PatternDoc,
} from './types.ts';

// JSON Pattern structure interfaces
interface JsonPatternTestCase {
  input: string;
  expected: string;
  description: string;
}

interface JsonPatternPerformance {
  priority: number;
  batchable: boolean;
  conflicts?: string[];
}

interface JsonPatternStructure {
  id: string;
  description: string;
  category: string;
  complexity: number;
  riskLevel: 'low' | 'medium' | 'high';
  pattern:
    | {
        template?: string;
      }
    | string;
  replacement:
    | {
        template?: string;
      }
    | string;
  testCases?: JsonPatternTestCase[];
  performance?: JsonPatternPerformance;
}

interface JsonPatternsFile {
  patterns: JsonPatternStructure[];
}

// Usage example structure
interface UsageExample {
  filePath: string;
  functionName: string;
  usage: string;
  context: string;
}

// Change analysis structure
interface ChangeAnalysis {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  description: string;
  timestamp: string;
}

// Additional Zod schemas for generator-specific types
export const GeneratorMetadataSchema = z.object({
  generatedAt: z.string(),
  sourceFiles: z.array(z.string()),
  totalFunctions: z.number(),
  totalClasses: z.number(),
  totalModules: z.number(),
  totalPatterns: z.number(),
  generationTime: z.number(),
});

export const GeneratorOptionsSchema = z.object({
  includePrivate: z.boolean().default(false),
  includeTests: z.boolean().default(false),
  includeExamples: z.boolean().default(true),
  maxDepth: z.number().default(10),
  templatePath: z.string().optional(),
  customPatterns: z.array(z.string()).optional(),
});

export type GeneratorMetadata = z.infer<typeof GeneratorMetadataSchema>;
export type GeneratorOptions = z.infer<typeof GeneratorOptionsSchema>;

/**
 * Documentation Generator
 *
 * Generates comprehensive documentation from codebase analysis using AST-grep
 * and pattern recognition. Supports multiple output formats and documentation types.
 */
/**
 * DocumentationGenerator handles the generation of API, architecture, pattern, usage, and changelog documentation.
 */
export class DocumentationGenerator {
  private analyzer: ASTAnalyzer;

  constructor() {
    this.analyzer = new ASTAnalyzer();
  }

  /**
   * Generate documentation based on request
   */
  async generateDocumentation(request: DocumentationRequest): Promise<DocumentationResult> {
    // Validate input using Zod schema
    const validatedRequest = validateDocumentationRequest(request);

    const startTime = Date.now();

    try {
      // Discover source files if not provided
      const sourceFiles = validatedRequest.sourceFiles || (await this.discoverSourceFiles(validatedRequest.sourceDir || './src'));

      // Compute relative paths from sourceDir if provided
      let relativeSourceFiles = sourceFiles;
      if (validatedRequest.sourceDir) {
        const { relative } = await import('node:path');
        relativeSourceFiles = sourceFiles.map(f => relative(validatedRequest.sourceDir ?? './src', f));
      }

      // Generate documentation based on type
      let content: string;
      // Validate metadata using Zod schema
      const metadata = GeneratorMetadataSchema.parse({
        generatedAt: new Date().toISOString(),
        sourceFiles: relativeSourceFiles,
        totalFunctions: 0,
        totalClasses: 0,
        totalModules: relativeSourceFiles.length,
        totalPatterns: 0,
        generationTime: 0,
      });

      switch (validatedRequest.type) {
        case 'api':
          content = await this.generateAPIDocumentation(relativeSourceFiles, validatedRequest);
          break;
        case 'architecture':
          content = await this.generateArchitectureDocumentation(relativeSourceFiles, validatedRequest);
          break;
        case 'patterns':
          content = await this.generatePatternDocumentation(validatedRequest);
          break;
        case 'usage':
          content = await this.generateUsageDocumentation(relativeSourceFiles, validatedRequest);
          break;
        case 'changelog':
          content = await this.generateChangelogDocumentation(relativeSourceFiles, validatedRequest);
          break;
        default:
          throw new Error(`Unsupported documentation type: ${validatedRequest.type}`);
      }

      metadata.generationTime = Date.now() - startTime;

      const result: DocumentationResult = {
        type: validatedRequest.type,
        format: validatedRequest.format,
        content,
        metadata,
        outputPath: validatedRequest.outputPath,
        warnings: [],
        errors: [],
      };

      // Validate result before returning
      return validateDocumentationResult(result);
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
        const repoRelativePath = filePath.replace(/\\/g, '/');
        const moduleDoc = await this.analyzer.analyzeFile(filePath);
        moduleDoc.filePath = repoRelativePath;
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
      markdown += `**Implements:** ${cls.implements.map((i) => `\`${i}\``).join(', ')}\n\n`;
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
  async discoverSourceFiles(sourceDir: string = './workspace/repository'): Promise<string[]> {
    const { readdir, stat } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const files: string[] = [];

  // Always use the provided sourceDir, never default to ./src unless undefined
  if (!sourceDir) sourceDir = './src';
  async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (stats.isFile() && /\.(ts|js|cpp|cxx|cc|c\+\+|c|h|hpp|cu|cuh|py)$/.test(entry)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    }

  console.log(`[discoverSourceFiles] Scanning directory: ${sourceDir}`);
  await scanDirectory(sourceDir);
  console.log(`[discoverSourceFiles] Files found:`, files.slice(0, 10), `... total: ${files.length}`);
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
        const repoRelativePath = filePath.replace(/\\/g, '/');
        const moduleDoc = await this.analyzer.analyzeFile(filePath);
        let type: 'actor' | 'utility' | 'type' | 'pattern' | 'config' = 'utility';
        if (repoRelativePath.includes('actors')) type = 'actor';
        else if (repoRelativePath.includes('types')) type = 'type';
        else if (repoRelativePath.includes('patterns')) type = 'pattern';
        else if (repoRelativePath.includes('config')) type = 'config';

        components.push({
          name: moduleDoc.name,
          type,
          description: moduleDoc.description || `${type} component`,
          filePath: repoRelativePath,
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
        components: components.filter((c) => c.type === 'config').map((c) => c.name),
        description: 'Configuration and external interfaces',
      },
      {
        name: 'Business Logic',
        components: components.filter((c) => c.type === 'actor').map((c) => c.name),
        description: 'Core business logic and state management',
      },
      {
        name: 'Data',
        components: components
          .filter((c) => c.type === 'type' || c.type === 'pattern')
          .map((c) => c.name),
        description: 'Data structures and transformation patterns',
      },
      {
        name: 'Utilities',
        components: components.filter((c) => c.type === 'utility').map((c) => c.name),
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
    markdown +=
      'This document describes the architectural structure of the Carmack Coder system.\n\n';

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
      const { readFile } = await import('node:fs/promises');
      const content = await readFile('./src/patterns/enhanced-templates.json', 'utf-8');
      const data = JSON.parse(content) as JsonPatternsFile;

      return data.patterns.map((pattern: JsonPatternStructure) => ({
        id: pattern.id,
        name: pattern.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: pattern.description,
        category: pattern.category,
        complexity: pattern.complexity,
        riskLevel: pattern.riskLevel,
        pattern:
          typeof pattern.pattern === 'object' ? pattern.pattern.template || '' : pattern.pattern,
        replacement:
          typeof pattern.replacement === 'object'
            ? pattern.replacement.template || ''
            : pattern.replacement,
        examples:
          pattern.testCases?.map((test: JsonPatternTestCase) => ({
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
    const categories = [...new Set(patterns.map((p) => p.category))];

    for (const category of categories) {
      const categoryPatterns = patterns.filter((p) => p.category === category);

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

  /**
   * Generate API documentation in HTML format with interactive features
   */
  private async generateAPIHTML(
    modules: ModuleDoc[],
    request: DocumentationRequest
  ): Promise<string> {
    const css = this.generateDocumentationCSS();
    const searchScript = this.generateSearchScript();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - Carmack Coder</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🚀 API Documentation</h1>
            <p class="subtitle">Generated on ${new Date().toISOString()}</p>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search functions, classes, modules..." />
                <button onclick="clearSearch()">Clear</button>
            </div>
        </header>

        <nav class="sidebar">
            <h3>📚 Modules</h3>
            <ul class="module-list">`;

    // Generate navigation
    for (const module of modules) {
      html += `<li><a href="#module-${this.sanitizeId(module.name)}" onclick="highlightModule('${this.sanitizeId(module.name)}')">${module.name}</a></li>`;
    }

    html += `</ul>
        </nav>

        <main class="content">`;

    // Generate module documentation
    for (const module of modules) {
      const moduleId = this.sanitizeId(module.name);
      html += `
            <section id="module-${moduleId}" class="module-section" data-searchable="${module.name.toLowerCase()}">
                <h2 class="module-title">📦 ${module.name}</h2>
                <div class="module-info">
                    <p class="file-path"><strong>File:</strong> <code>${module.filePath}</code></p>
                    ${module.description ? `<p class="description">${module.description}</p>` : ''}
                </div>`;

      // Functions section
      if (module.exports.functions.length > 0) {
        html += `<div class="section">
                    <h3 class="section-title">⚡ Functions</h3>
                    <div class="items-grid">`;

        for (const func of module.exports.functions) {
          if (!request.includePrivate && !func.isExported) continue;

          html += `<div class="item-card function-card" data-searchable="${func.name.toLowerCase()} ${func.signature.toLowerCase()}">
                        <div class="item-header">
                            <h4 class="item-name">${func.name}</h4>
                            <div class="badges">
                                ${func.isAsync ? '<span class="badge async">async</span>' : ''}
                                ${func.isExported ? '<span class="badge exported">exported</span>' : ''}
                            </div>
                        </div>
                        <div class="signature">
                            <code>${this.escapeHtml(func.signature)}</code>
                        </div>
                        ${func.description ? `<p class="description">${func.description}</p>` : ''}`;

          if (func.parameters.length > 0) {
            html += `<div class="parameters">
                            <h5>Parameters:</h5>
                            <ul>`;
            for (const param of func.parameters) {
              html += `<li><code>${param.name}</code> (${param.type})${param.optional ? ' <em>optional</em>' : ''}${param.description ? ` - ${param.description}` : ''}</li>`;
            }
            html += '</ul></div>';
          }

          if (func.returnType) {
            html += `<div class="return-type">
                            <h5>Returns:</h5>
                            <code>${func.returnType}</code>
                            ${func.returnDescription ? `<p>${func.returnDescription}</p>` : ''}
                        </div>`;
          }

          html += '</div>';
        }
        html += '</div></div>';
      }

      html += '</section>';
    }

    html += `</main>
    </div>
    <script>${searchScript}</script>
</body>
</html>`;

    return html;
  }

  /**
   * Helper method to read file content
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises');
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Helper method to sanitize IDs for HTML
   */
  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Helper method to escape HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate CSS for documentation HTML
   */
  private generateDocumentationCSS(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
      }

      .container {
        display: grid;
        grid-template-columns: 250px 1fr;
        grid-template-rows: auto 1fr;
        min-height: 100vh;
        max-width: 1400px;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }

      .header {
        grid-column: 1 / -1;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        text-align: center;
      }

      .header h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        font-weight: 700;
      }

      .subtitle {
        opacity: 0.9;
        font-size: 0.9rem;
      }

      .search-container {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.5rem;
        justify-content: center;
      }

      .search-container input {
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        width: 300px;
        font-size: 1rem;
      }

      .search-container button {
        padding: 0.75rem 1.5rem;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: background 0.2s;
      }

      .search-container button:hover {
        background: rgba(255,255,255,0.3);
      }

      .sidebar {
        background: #f8f9fa;
        padding: 1.5rem;
        border-right: 1px solid #e9ecef;
        overflow-y: auto;
      }

      .sidebar h3 {
        color: #495057;
        margin-bottom: 1rem;
        font-size: 1.1rem;
      }

      .module-list {
        list-style: none;
      }

      .module-list li {
        margin-bottom: 0.5rem;
      }

      .module-list a {
        color: #6c757d;
        text-decoration: none;
        padding: 0.5rem;
        display: block;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .module-list a:hover {
        background: #e9ecef;
        color: #495057;
      }

      .content {
        padding: 2rem;
        overflow-y: auto;
      }

      .module-section {
        margin-bottom: 3rem;
        padding-bottom: 2rem;
        border-bottom: 2px solid #e9ecef;
      }

      .module-title {
        color: #495057;
        margin-bottom: 1rem;
        font-size: 1.8rem;
      }

      .module-info {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }

      .file-path {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
      }

      .section {
        margin-bottom: 2rem;
      }

      .section-title {
        color: #6c757d;
        margin-bottom: 1rem;
        font-size: 1.3rem;
        border-bottom: 1px solid #e9ecef;
        padding-bottom: 0.5rem;
      }

      .items-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      }

      .item-card {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1.5rem;
        transition: all 0.2s;
      }

      .item-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-color: #667eea;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .item-name {
        color: #495057;
        font-size: 1.2rem;
      }

      .badges {
        display: flex;
        gap: 0.5rem;
      }

      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .badge.async {
        background: #e3f2fd;
        color: #1976d2;
      }

      .badge.exported {
        background: #e8f5e8;
        color: #2e7d32;
      }

      .badge.complexity {
        background: #fff3e0;
        color: #f57c00;
      }

      .badge.risk-low {
        background: #e8f5e8;
        color: #2e7d32;
      }

      .badge.risk-medium {
        background: #fff3e0;
        color: #f57c00;
      }

      .badge.risk-high {
        background: #ffebee;
        color: #d32f2f;
      }

      .signature {
        background: #f8f9fa;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
      }

      .description {
        color: #6c757d;
        margin-bottom: 1rem;
        line-height: 1.6;
      }

      .parameters, .return-type, .examples-section {
        margin-top: 1rem;
      }

      .parameters h5, .return-type h5, .examples-section h4 {
        color: #495057;
        margin-bottom: 0.5rem;
        font-size: 1rem;
      }

      .parameters ul {
        list-style: none;
        padding-left: 1rem;
      }

      .parameters li {
        margin-bottom: 0.25rem;
        color: #6c757d;
      }

      pre {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
        line-height: 1.4;
      }

      code {
        background: #f8f9fa;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
      }

      .empty-state {
        text-align: center;
        padding: 3rem;
        color: #6c757d;
      }

      .empty-state h2 {
        margin-bottom: 1rem;
      }

      .mermaid-container {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        margin: 1rem 0;
      }

      .hidden {
        display: none !important;
      }

      @media (max-width: 768px) {
        .container {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto 1fr;
        }
        
        .sidebar {
          border-right: none;
          border-bottom: 1px solid #e9ecef;
        }
        
        .items-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  /**
   * Generate JavaScript for search functionality
   */
  private generateSearchScript(): string {
    return `
      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

      function performSearch(query) {
        const searchableElements = document.querySelectorAll('[data-searchable]');
        const lowerQuery = query.toLowerCase();
        
        searchableElements.forEach(element => {
          const searchText = element.getAttribute('data-searchable');
          const isMatch = !query || searchText.includes(lowerQuery);
          
          if (isMatch) {
            element.classList.remove('hidden');
          } else {
            element.classList.add('hidden');
          }
        });
      }

      function clearSearch() {
        document.getElementById('searchInput').value = '';
        performSearch('');
      }

      function highlightModule(moduleId) {
        // Remove existing highlights
        document.querySelectorAll('.module-section').forEach(section => {
          section.style.background = '';
        });
        
        // Highlight selected module
        const module = document.getElementById('module-' + moduleId);
        if (module) {
          module.style.background = '#f0f8ff';
          setTimeout(() => {
            module.style.background = '';
          }, 2000);
        }
      }

      document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          const debouncedSearch = debounce((e) => {
            performSearch(e.target.value);
          }, 300);
          
          searchInput.addEventListener('input', debouncedSearch);
        }
      });
    `;
  }

  /**
   * Generate architecture documentation in HTML format
   */
  private async generateArchitectureHTML(architecture: ArchitectureDoc): Promise<string> {
    const css = this.generateDocumentationCSS();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Documentation - Carmack Coder</title>
    <style>${css}</style>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏗️ Architecture Documentation</h1>
            <p class="subtitle">Generated on ${new Date().toISOString()}</p>
        </header>

        <main class="content">
            <section class="overview-section">
                <h2>📋 Overview</h2>
                <p>This document describes the architectural structure of the Carmack Coder system.</p>
            </section>

            <section class="layers-section">
                <h2>🏛️ Architectural Layers</h2>
                <div class="layers-grid">`;

    for (const layer of architecture.layers) {
      html += `<div class="layer-card">
                    <h3>${layer.name}</h3>
                    <p>${layer.description}</p>
                    <div class="components-list">
                        <h4>Components:</h4>
                        <ul>`;
      for (const component of layer.components) {
        html += `<li><a href="#component-${this.sanitizeId(component)}">${component}</a></li>`;
      }
      html += '</ul></div></div>';
    }

    html += `</div>
            </section>

            <section class="components-section">
                <h2>🔧 Components</h2>
                <div class="components-grid">`;

    for (const component of architecture.components) {
      html += `<div id="component-${this.sanitizeId(component.name)}" class="component-card ${component.type}">
                    <div class="component-header">
                        <h3>${component.name}</h3>
                        <span class="badge component-type">${component.type}</span>
                    </div>
                    <p class="file-path"><strong>File:</strong> <code>${component.filePath}</code></p>
                    <p class="description">${component.description}</p>`;

      if (component.dependencies.length > 0) {
        html += `<div class="dependencies">
                        <h4>Dependencies:</h4>
                        <ul>`;
        for (const dep of component.dependencies) {
          html += `<li>${dep}</li>`;
        }
        html += '</ul></div>';
      }

      html += '</div>';
    }

    html += `</div>
            </section>

            <section class="dataflow-section">
                <h2>🔄 Data Flow</h2>
                <div class="mermaid-container">
                    <div class="mermaid">
                        graph TD`;

    for (const flow of architecture.dataFlow) {
      const fromSafe = flow.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toSafe = flow.to.replace(/[^a-zA-Z0-9]/g, '_');
      html += `
                            ${fromSafe}[${flow.from}] --> ${toSafe}[${flow.to}]`;
    }

    html += `
                    </div>
                </div>
            </section>
        </main>
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
</body>
</html>`;

    return html;

  }

  /**
   * Generate pattern documentation in HTML format
   */
  private async generatePatternHTML(patterns: PatternDoc[]): Promise<string> {
    const css = this.generateDocumentationCSS();
    const searchScript = this.generateSearchScript();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pattern Documentation - Carmack Coder</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎯 Transformation Patterns</h1>
            <p class="subtitle">Generated on ${new Date().toISOString()}</p>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search patterns..." />
                <button onclick="clearSearch()">Clear</button>
            </div>
        </header>

        <main class="content">`;

    // Group patterns by category
    const categories = [...new Set(patterns.map((p) => p.category))];

    for (const category of categories) {
      const categoryPatterns = patterns.filter((p) => p.category === category);

      html += `<section class="category-section">
                <h2 class="category-title">📁 ${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
                <div class="patterns-grid">`;

      for (const pattern of categoryPatterns) {
        const riskClass = `risk-${pattern.riskLevel}`;
        html += `<div class="pattern-card ${riskClass}" data-searchable="${pattern.name.toLowerCase()} ${pattern.description.toLowerCase()}">
                    <div class="pattern-header">
                        <h3>${pattern.name}</h3>
                        <div class="pattern-meta">
                            <span class="badge complexity">Complexity: ${pattern.complexity}/10</span>
                            <span class="badge risk ${riskClass}">${pattern.riskLevel} risk</span>
                        </div>
                    </div>
                    <p class="description">${pattern.description}</p>
                    
                    <div class="pattern-code">
                        <div class="code-section">
                            <h4>Pattern:</h4>
                            <pre><code class="language-typescript">${this.escapeHtml(pattern.pattern)}</code></pre>
                        </div>
                        <div class="code-section">
                            <h4>Replacement:</h4>
                            <pre><code class="language-typescript">${this.escapeHtml(pattern.replacement)}</code></pre>
                        </div>
                    </div>`;

        if (pattern.examples.length > 0) {
          html += `<div class="examples-section">
                        <h4>Examples:</h4>`;
          for (const example of pattern.examples) {
            html += `<div class="example">
                            <p class="example-description"><em>${example.description}</em></p>
                            <div class="example-code">
                                <div class="before">
                                    <h5>Before:</h5>
                                    <pre><code class="language-typescript">${this.escapeHtml(example.before)}</code></pre>
                                </div>
                                <div class="after">
                                    <h5>After:</h5>
                                    <pre><code class="language-typescript">${this.escapeHtml(example.after)}</code></pre>
                                </div>
                            </div>
                        </div>`;
          }
          html += '</div>';
        }

        if (pattern.performance) {
          html += `<div class="performance-info">
                        <h4>Performance:</h4>
                        <p><strong>Priority:</strong> ${pattern.performance.priority}</p>
                        <p><strong>Batchable:</strong> ${pattern.performance.batchable ? 'Yes' : 'No'}</p>
                    </div>`;
        }

        html += '</div>';
      }

      html += '</div></section>';
    }

    html += `</main>
    </div>
    <script>${searchScript}</script>
</body>
</html>`;

    return html;
  }

  /**
   * Extract usage examples from source files using AST analysis
   */
  private async extractUsageExamples(sourceFiles: string[]): Promise<UsageExample[]> {
    const examples: UsageExample[] = [];

    for (const filePath of sourceFiles) {
      try {
        const content = await this.readFile(filePath);

        // Extract function calls and their context
        const functionCalls = await this.extractFunctionCalls(content, filePath);
        examples.push(...functionCalls);

        // Extract class instantiations
        const classUsages = await this.extractClassUsages(content, filePath);
        examples.push(...classUsages);

        // Extract import usage patterns
        const importUsages = await this.extractImportUsages(content, filePath);
        examples.push(...importUsages);
      } catch (error) {
        console.warn(`Failed to extract usage examples from ${filePath}:`, error);
      }
    }

    return examples;
  }

  /**
   * Generate usage documentation in Markdown format
   */
  private async generateUsageMarkdown(examples: UsageExample[]): Promise<string> {
    let markdown = '# Usage Documentation\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;

    if (examples.length === 0) {
      markdown += 'No usage examples found in the codebase.\n\n';
      return markdown;
    }

    // Group examples by function/class name
    const groupedExamples = new Map<string, UsageExample[]>();
    for (const example of examples) {
      const key = example.functionName;
      if (!groupedExamples.has(key)) {
        groupedExamples.set(key, []);
      }
      groupedExamples.get(key)!.push(example);
    }

    markdown += '## Table of Contents\n\n';
    for (const [functionName] of groupedExamples) {
      markdown += `- [${functionName}](#${functionName.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
    }
    markdown += '\n';

    for (const [functionName, functionExamples] of groupedExamples) {
      markdown += `## ${functionName}\n\n`;

      for (const example of functionExamples) {
        markdown += `### Usage in \`${example.filePath}\`\n\n`;
        markdown += `${example.context}\n\n`;
        markdown += '```typescript\n';
        markdown += example.usage;
        markdown += '\n```\n\n';
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Generate usage documentation in HTML format
   */
  private async generateUsageHTML(examples: UsageExample[]): Promise<string> {
    const css = this.generateDocumentationCSS();
    const searchScript = this.generateSearchScript();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Usage Documentation - Carmack Coder</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📖 Usage Documentation</h1>
            <p class="subtitle">Generated on ${new Date().toISOString()}</p>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search usage examples..." />
                <button onclick="clearSearch()">Clear</button>
            </div>
        </header>

        <main class="content">`;

    if (examples.length === 0) {
      html += `<div class="empty-state">
                <h2>No Usage Examples Found</h2>
                <p>No usage examples were found in the codebase.</p>
            </div>`;
    } else {
      // Group examples by function name
      const groupedExamples = new Map<string, UsageExample[]>();
      for (const example of examples) {
        const key = example.functionName;
        if (!groupedExamples.has(key)) {
          groupedExamples.set(key, []);
        }
        groupedExamples.get(key)!.push(example);
      }

      for (const [functionName, functionExamples] of groupedExamples) {
        html += `<section class="usage-section" data-searchable="${functionName.toLowerCase()}">
                    <h2 class="function-title">⚡ ${functionName}</h2>
                    <div class="examples-grid">`;

        for (const example of functionExamples) {
          html += `<div class="example-card" data-searchable="${example.filePath.toLowerCase()}">
                        <div class="example-header">
                            <h3>Usage in <code>${example.filePath}</code></h3>
                        </div>
                        <div class="context">
                            <p>${example.context}</p>
                        </div>
                        <div class="usage-code">
                            <pre><code class="language-typescript">${this.escapeHtml(example.usage)}</code></pre>
                        </div>
                    </div>`;
        }

        html += '</div></section>';
      }
    }

    html += `</main>
    </div>
    <script>${searchScript}</script>
</body>
</html>`;

    return html;
  }

  /**
   * Analyze changes in source files using Git history
   */
  private async analyzeChanges(sourceFiles: string[]): Promise<ChangeAnalysis[]> {
    const changes: ChangeAnalysis[] = [];

    try {
      // Try to get Git history for each file
      const { execSync } = await import('node:child_process');

      for (const filePath of sourceFiles) {
        try {
          // Get recent commits for this file
          const gitLog = execSync(
            `git log --oneline --since="30 days ago" --follow -- "${filePath}"`,
            { encoding: 'utf-8', cwd: process.cwd() }
          );

          const commits = gitLog
            .trim()
            .split('\n')
            .filter((line) => line.trim());

          for (const commit of commits.slice(0, 10)) {
            // Last 10 commits
            const [hash, ...messageParts] = commit.split(' ');
            const message = messageParts.join(' ');

            // Get commit details
            try {
              const commitDetails = execSync(
                `git show --stat --format="%ai" ${hash} -- "${filePath}"`,
                { encoding: 'utf-8', cwd: process.cwd() }
              );

              const lines = commitDetails.split('\n');
              const timestamp = lines[0] || new Date().toISOString();

              // Determine change type from commit message
              let changeType: 'added' | 'modified' | 'deleted' = 'modified';
              if (
                message.toLowerCase().includes('add') ||
                message.toLowerCase().includes('create')
              ) {
                changeType = 'added';
              } else if (
                message.toLowerCase().includes('delete') ||
                message.toLowerCase().includes('remove')
              ) {
                changeType = 'deleted';
              }

              changes.push({
                filePath,
                changeType,
                description: message,
                timestamp,
              });
            } catch (error) {
              // Skip if we can't get commit details
            }
          }
        } catch (error) {
          // File might not be in Git or no recent changes
          console.warn(`No Git history found for ${filePath}`);
        }
      }
    } catch (error) {
      console.warn('Git not available, using file modification times');

      // Fallback: use file modification times
      const { stat } = await import('node:fs/promises');

      for (const filePath of sourceFiles) {
        try {
          const stats = await stat(filePath);
          changes.push({
            filePath,
            changeType: 'modified',
            description: 'File modified',
            timestamp: stats.mtime.toISOString(),
          });
        } catch (error) {
          // Skip files that can't be accessed
        }
      }
    }

    // Sort by timestamp (newest first)
    return changes.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate changelog documentation in Markdown format
   */
  private async generateChangelogMarkdown(changes: ChangeAnalysis[]): Promise<string> {
    let markdown = '# Changelog\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;

    if (changes.length === 0) {
      markdown += 'No recent changes found.\n\n';
      return markdown;
    }

    // Group changes by date
    const changesByDate = new Map<string, ChangeAnalysis[]>();
    for (const change of changes) {
      const date = new Date(change.timestamp).toISOString().split('T')[0];
      if (date) {
        if (!changesByDate.has(date)) {
          changesByDate.set(date, []);
        }
        changesByDate.get(date)!.push(change);
      }
    }

    for (const [date, dayChanges] of changesByDate) {
      markdown += `## ${date}\n\n`;

      // Group by change type
      const added = dayChanges.filter((c) => c.changeType === 'added');
      const modified = dayChanges.filter((c) => c.changeType === 'modified');
      const deleted = dayChanges.filter((c) => c.changeType === 'deleted');

      if (added.length > 0) {
        markdown += '### ✅ Added\n\n';
        for (const change of added) {
          markdown += `- **${change.filePath}**: ${change.description}\n`;
        }
        markdown += '\n';
      }

      if (modified.length > 0) {
        markdown += '### 🔄 Modified\n\n';
        for (const change of modified) {
          markdown += `- **${change.filePath}**: ${change.description}\n`;
        }
        markdown += '\n';
      }

      if (deleted.length > 0) {
        markdown += '### ❌ Deleted\n\n';
        for (const change of deleted) {
          markdown += `- **${change.filePath}**: ${change.description}\n`;
        }
        markdown += '\n';
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Generate changelog documentation in HTML format
   */
  private async generateChangelogHTML(changes: ChangeAnalysis[]): Promise<string> {
    const css = this.generateDocumentationCSS();

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Changelog - Carmack Coder</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📝 Changelog</h1>
            <p class="subtitle">Generated on ${new Date().toISOString()}</p>
        </header>

        <main class="content">`;

    if (changes.length === 0) {
      html += `<div class="empty-state">
                <h2>No Recent Changes</h2>
                <p>No recent changes were found in the codebase.</p>
            </div>`;
    } else {
      // Group changes by date
      const changesByDate = new Map<string, ChangeAnalysis[]>();
      for (const change of changes) {
        const date = new Date(change.timestamp).toISOString().split('T')[0];
        if (date) {
          if (!changesByDate.has(date)) {
            changesByDate.set(date, []);
          }
          changesByDate.get(date)!.push(change);
        }
      }

      for (const [date, dayChanges] of changesByDate) {
        html += `<section class="changelog-section">
                    <h2 class="date-title">📅 ${date}</h2>`;

        // Group by change type
        const added = dayChanges.filter((c) => c.changeType === 'added');
        const modified = dayChanges.filter((c) => c.changeType === 'modified');
        const deleted = dayChanges.filter((c) => c.changeType === 'deleted');

        if (added.length > 0) {
          html += `<div class="change-group added">
                        <h3>✅ Added</h3>
                        <ul>`;
          for (const change of added) {
            html += `<li><strong>${change.filePath}</strong>: ${change.description}</li>`;
          }
          html += '</ul></div>';
        }

        if (modified.length > 0) {
          html += `<div class="change-group modified">
                        <h3>🔄 Modified</h3>
                        <ul>`;
          for (const change of modified) {
            html += `<li><strong>${change.filePath}</strong>: ${change.description}</li>`;
          }
          html += '</ul></div>';
        }

        if (deleted.length > 0) {
          html += `<div class="change-group deleted">
                        <h3>❌ Deleted</h3>
                        <ul>`;
          for (const change of deleted) {
            html += `<li><strong>${change.filePath}</strong>: ${change.description}</li>`;
          }
          html += '</ul></div>';
        }

        html += '</section>';
      }
    }

    html += `</main>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Extract function calls from source code
   */
  private async extractFunctionCalls(content: string, filePath: string): Promise<UsageExample[]> {
    const examples: UsageExample[] = [];
    const lines = content.split('\n');

    // Simple regex patterns for function calls
    const functionCallPattern = /(\w+)\s*\(/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = functionCallPattern.exec(content)) !== null) {
      const functionName = match[1];
      const lineIndex = content.substring(0, match.index).split('\n').length - 1;
      const line = lines[lineIndex];

      if (line && !line.trim().startsWith('//') && !line.trim().startsWith('*') && functionName) {
        examples.push({
          filePath,
          functionName,
          usage: line.trim(),
          context: `Function call found at line ${lineIndex + 1}`,
        });
      }
    }

    return examples.slice(0, 10); // Limit to first 10 examples per file
  }

  /**
   * Extract class instantiations from source code
   */
  private async extractClassUsages(content: string, filePath: string): Promise<UsageExample[]> {
    const examples: UsageExample[] = [];
    const lines = content.split('\n');

    // Pattern for 'new ClassName()'
    const classInstantiationPattern = /new\s+(\w+)\s*\(/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = classInstantiationPattern.exec(content)) !== null) {
      const className = match[1];
      const lineIndex = content.substring(0, match.index).split('\n').length - 1;
      const line = lines[lineIndex];

      if (line && !line.trim().startsWith('//') && !line.trim().startsWith('*') && className) {
        examples.push({
          filePath,
          functionName: className,
          usage: line.trim(),
          context: `Class instantiation found at line ${lineIndex + 1}`,
        });
      }
    }

    return examples.slice(0, 5); // Limit to first 5 examples per file
  }

  /**
   * Extract import usage patterns from source code
   */
  private async extractImportUsages(content: string, filePath: string): Promise<UsageExample[]> {
    const examples: UsageExample[] = [];

    // Pattern for import statements
    const importPattern = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = importPattern.exec(content)) !== null) {
      const [fullMatch, namedImports, defaultImport, module] = match;
      const lineIndex = content.substring(0, match.index).split('\n').length - 1;

      const importName = namedImports || defaultImport || module;

      if (importName) {
        examples.push({
          filePath,
          functionName: importName,
          usage: fullMatch,
          context: `Import statement found at line ${lineIndex + 1}`,
        });
      }
    }

    return examples.slice(0, 5); // Limit to first 5 examples per file
  }

}

// Create and export the documentation generator actor
export const documentationGeneratorActor = fromPromise(
  async ({ input }: { input: DocumentationRequest }) => {
    const generator = new DocumentationGenerator();
    return await generator.generateDocumentation(input);
  }
);
