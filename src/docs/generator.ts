/**
 * Automatic Documentation Generator for Carmack Coder
 * 
 * Scans the codebase and generates comprehensive documentation
 * that stays in sync with code changes.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { z } from 'zod';

// Documentation generation configuration
export const DocConfigSchema = z.object({
  sourceDir: z.string().default('./src'),
  outputDir: z.string().default('./docs'),
  patterns: z.object({
    include: z.array(z.string()).default(['**/*.ts', '**/*.js', '**/*.json']),
    exclude: z.array(z.string()).default(['node_modules', 'dist', 'build', '**/*.test.ts']),
  }).default({}),
  formats: z.array(z.enum(['markdown', 'html', 'json'])).default(['markdown']),
  features: z.object({
    extractJSDoc: z.boolean().default(true),
    extractTypes: z.boolean().default(true),
    extractPatterns: z.boolean().default(true),
    extractConfigs: z.boolean().default(true),
    generateDiagrams: z.boolean().default(true),
  }).default({}),
});

export type DocConfig = z.infer<typeof DocConfigSchema>;

export interface DocumentationItem {
  id: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'pattern' | 'config' | 'state';
  name: string;
  description?: string;
  file: string;
  line?: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedDocumentation {
  timestamp: string;
  version: string;
  items: DocumentationItem[];
  structure: {
    api: DocumentationItem[];
    patterns: DocumentationItem[];
    configs: DocumentationItem[];
    states: DocumentationItem[];
  };
  stats: {
    totalFiles: number;
    totalItems: number;
    byType: Record<string, number>;
  };
}

/**
 * Main Documentation Generator Class
 */
export class DocumentationGenerator {
  private config: DocConfig;
  private extractors: Map<string, (content: string, filePath: string) => DocumentationItem[]>;

  constructor(config: Partial<DocConfig> = {}) {
    this.config = DocConfigSchema.parse(config);
    this.extractors = new Map();
    this.setupExtractors();
  }

  private setupExtractors(): void {
    // TypeScript/JavaScript extractor
    this.extractors.set('.ts', this.extractTypeScript.bind(this));
    this.extractors.set('.js', this.extractJavaScript.bind(this));
    
    // JSON pattern extractor
    this.extractors.set('.json', this.extractJSON.bind(this));
  }

  /**
   * Generate complete documentation for the project
   */
  async generateDocumentation(): Promise<GeneratedDocumentation> {
    console.log('🔍 Scanning codebase for documentation...');
    
    const files = await this.scanFiles(this.config.sourceDir);
    const allItems: DocumentationItem[] = [];
    
    for (const file of files) {
      const items = await this.extractFromFile(file);
      allItems.push(...items);
    }

    const documentation: GeneratedDocumentation = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      items: allItems,
      structure: this.categorizeItems(allItems),
      stats: this.generateStats(allItems, files.length),
    };

    // Generate output files
    await this.writeDocumentation(documentation);
    
    console.log(`✅ Generated documentation for ${allItems.length} items from ${files.length} files`);
    return documentation;
  }

  private async scanFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walkDir(currentDir: string): Promise<void> {
      const entries = await readdir(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip excluded directories
          if (!fullPath.includes('node_modules') && !fullPath.includes('dist')) {
            await walkDir(fullPath);
          }
        } else if (stats.isFile()) {
          const ext = extname(entry);
          if (['.ts', '.js', '.json'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    await walkDir(dir);
    return files;
  }

  private async extractFromFile(filePath: string): Promise<DocumentationItem[]> {
    const ext = extname(filePath);
    const extractor = this.extractors.get(ext);
    
    if (!extractor) {
      return [];
    }
    
    try {
      const content = await readFile(filePath, 'utf-8');
      return extractor(content, filePath);
    } catch (error) {
      console.warn(`⚠️  Failed to extract from ${filePath}:`, error);
      return [];
    }
  }

  private extractTypeScript(content: string, filePath: string): DocumentationItem[] {
    const items: DocumentationItem[] = [];
    const lines = content.split('\n');
    
    // Extract Zod schemas
    items.push(...this.extractZodSchemas(content, filePath));
    
    // Extract XState machines
    items.push(...this.extractXStateMachines(content, filePath));
    
    // Extract functions with enhanced JSDoc parsing
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Enhanced JSDoc extraction
      let description = '';
      let jsdocData: any = {};
      if (lineNumber > 1) {
        const prevLines = lines.slice(Math.max(0, lineNumber - 10), lineNumber - 1);
        const jsdocMatch = prevLines.join('\n').match(/\/\*\*\s*(.*?)\s*\*\//s);
        if (jsdocMatch?.[1]) {
          const jsdocContent = jsdocMatch[1];
          description = this.parseJSDocDescription(jsdocContent);
          jsdocData = this.parseJSDocTags(jsdocContent);
        }
      }
      
      const functionName = match[1];
      if (functionName) {
        items.push({
          id: `function-${functionName}`,
          type: 'function',
          name: functionName,
          description,
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          category: 'api',
          metadata: {
            ...jsdocData,
            language: 'typescript',
          },
        });
      }
    }
    
    // Extract classes
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const className = match[1];
      
      if (className) {
        items.push({
          id: `class-${className}`,
          type: 'class',
          name: className,
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          category: 'api',
        });
      }
    }
    
    // Extract interfaces and types
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const interfaceName = match[1];
      
      if (interfaceName) {
        items.push({
          id: `interface-${interfaceName}`,
          type: 'interface',
          name: interfaceName,
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          category: 'api',
        });
      }
    }
    
    return items;
  }

  /**
   * Extract Zod schema definitions with validation rules
   */
  private extractZodSchemas(content: string, filePath: string): DocumentationItem[] {
    const items: DocumentationItem[] = [];
    
    // Match Zod schema definitions
    const zodSchemaRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*z\.(.*?)(?=;|\n)/gs;
    let match;
    
    while ((match = zodSchemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaDefinition = match[2];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (schemaName && schemaDefinition) {
        items.push({
          id: `schema-${schemaName}`,
          type: 'type',
          name: schemaName,
          description: `Zod validation schema: ${schemaDefinition.substring(0, 100)}...`,
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          category: 'validation',
          metadata: {
            schemaType: 'zod',
            definition: schemaDefinition,
            language: 'typescript',
          },
        });
      }
    }
    
    return items;
  }

  /**
   * Extract XState machine definitions with state analysis
   */
  private extractXStateMachines(content: string, filePath: string): DocumentationItem[] {
    const items: DocumentationItem[] = [];
    
    // Match XState machine definitions
    const machineRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:setup\(.*?\)\.)?createMachine\s*\((.*?)\)/gs;
    let match;
    
    while ((match = machineRegex.exec(content)) !== null) {
      const machineName = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (machineName) {
        // Extract states from the machine definition
        const states = this.extractStatesFromMachine(match[2] || '');
        
        items.push({
          id: `machine-${machineName}`,
          type: 'state',
          name: machineName,
          description: `XState machine with ${states.length} states: ${states.join(', ')}`,
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          category: 'state-machine',
          metadata: {
            machineType: 'xstate',
            states,
            stateCount: states.length,
            language: 'typescript',
          },
        });
      }
    }
    
    return items;
  }

  /**
   * Parse JSDoc description from comment content
   */
  private parseJSDocDescription(jsdocContent: string): string {
    const lines = jsdocContent.split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim());
    
    // Find the main description (before any @tags)
    const descriptionLines = [];
    for (const line of lines) {
      if (line.startsWith('@')) break;
      if (line.trim()) descriptionLines.push(line);
    }
    
    return descriptionLines.join(' ').trim();
  }

  /**
   * Parse JSDoc tags into structured metadata
   */
  private parseJSDocTags(jsdocContent: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const lines = jsdocContent.split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim());
    
    for (const line of lines) {
      if (line.startsWith('@')) {
        const [tag, ...valueParts] = line.substring(1).split(' ');
        const value = valueParts.join(' ').trim();
        
        switch (tag) {
          case 'param':
            if (!metadata.parameters) metadata.parameters = [];
            const paramMatch = value.match(/^(\w+)\s*-?\s*(.*)/);
            if (paramMatch) {
              metadata.parameters.push({
                name: paramMatch[1],
                description: paramMatch[2],
              });
            }
            break;
          case 'returns':
          case 'return':
            metadata.returns = value;
            break;
          case 'example':
            if (!metadata.examples) metadata.examples = [];
            metadata.examples.push(value);
            break;
          case 'since':
            metadata.since = value;
            break;
          case 'deprecated':
            metadata.deprecated = value || true;
            break;
          default:
            if (tag) {
              metadata[tag] = value;
            }
        }
      }
    }
    
    return metadata;
  }

  /**
   * Extract state names from XState machine definition
   */
  private extractStatesFromMachine(machineContent: string): string[] {
    const states: string[] = [];
    
    // Look for states object
    const statesMatch = machineContent.match(/states\s*:\s*\{([^}]+)\}/s);
    if (statesMatch?.[1]) {
      const statesContent = statesMatch[1];
      const stateRegex = /(\w+)\s*:/g;
      let match;
      
      while ((match = stateRegex.exec(statesContent)) !== null) {
        if (match[1] && !['on', 'invoke', 'entry', 'exit'].includes(match[1])) {
          states.push(match[1]);
        }
      }
    }
    
    return states;
  }

  private extractJavaScript(content: string, filePath: string): DocumentationItem[] {
    // Similar to TypeScript but with different patterns
    return this.extractTypeScript(content, filePath);
  }

  private extractJSON(content: string, filePath: string): DocumentationItem[] {
    const items: DocumentationItem[] = [];
    
    try {
      const data = JSON.parse(content);
      
      // Extract transformation patterns
      if (data.patterns && Array.isArray(data.patterns)) {
        for (const pattern of data.patterns) {
          if (pattern.id && pattern.description) {
            items.push({
              id: `pattern-${pattern.id}`,
              type: 'pattern',
              name: pattern.id,
              description: pattern.description,
              file: relative(process.cwd(), filePath),
              category: pattern.category || 'transformation',
              metadata: {
                complexity: pattern.complexity,
                riskLevel: pattern.riskLevel,
                language: pattern.language,
              },
            });
          }
        }
      }
      
      // Extract configuration schemas
      if (filePath.includes('config') && data.properties) {
        for (const [key, value] of Object.entries(data.properties)) {
          items.push({
            id: `config-${key}`,
            type: 'config',
            name: key,
            description: (value as any)?.description || `Configuration option: ${key}`,
            file: relative(process.cwd(), filePath),
            category: 'configuration',
            metadata: typeof value === 'object' && value !== null ? value as Record<string, unknown> : { value },
          });
        }
      }
      
    } catch (error) {
      // Not valid JSON or doesn't match expected structure
    }
    
    return items;
  }

  private categorizeItems(items: DocumentationItem[]): GeneratedDocumentation['structure'] {
    return {
      api: items.filter(item => ['function', 'class', 'interface'].includes(item.type)),
      patterns: items.filter(item => item.type === 'pattern'),
      configs: items.filter(item => item.type === 'config'),
      states: items.filter(item => item.type === 'state'),
    };
  }

  private generateStats(items: DocumentationItem[], totalFiles: number): GeneratedDocumentation['stats'] {
    const byType: Record<string, number> = {};
    
    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }
    
    return {
      totalFiles,
      totalItems: items.length,
      byType,
    };
  }

  private async writeDocumentation(documentation: GeneratedDocumentation): Promise<void> {
    // Ensure output directory exists
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }
    
    // Write JSON output
    await writeFile(
      join(this.config.outputDir, 'documentation.json'),
      JSON.stringify(documentation, null, 2)
    );
    
    // Write HTML output
    if (this.config.formats.includes('html')) {
      await this.writeHTMLDocs(documentation);
    }
    
    // Write Markdown output
    if (this.config.formats.includes('markdown')) {
      await this.writeMarkdownDocs(documentation);
    }
    
    console.log(`📝 Documentation written to ${this.config.outputDir}`);
  }

  private async writeHTMLDocs(documentation: GeneratedDocumentation): Promise<void> {
    const html = this.generateHTML(documentation);
    
    await writeFile(
      join(this.config.outputDir, 'index.html'),
      html
    );
    
    // Generate Mermaid diagrams for state machines
    if (this.config.features.generateDiagrams) {
      await this.generateMermaidDiagrams(documentation);
    }
  }

  private generateHTML(documentation: GeneratedDocumentation): string {
    const mermaidDiagrams = this.generateMermaidForStateMachines(documentation.structure.states);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carmack Coder Documentation</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .search-box { width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px; font-size: 16px; }
        .nav-tabs { display: flex; border-bottom: 2px solid #e9ecef; margin-bottom: 20px; }
        .nav-tab { padding: 12px 24px; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s; }
        .nav-tab.active { border-bottom-color: #667eea; color: #667eea; font-weight: 600; }
        .content-section { display: none; }
        .content-section.active { display: block; }
        .item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
        .item-name { font-weight: 600; color: #495057; margin-bottom: 5px; }
        .item-description { color: #6c757d; margin-bottom: 10px; }
        .item-meta { font-size: 12px; color: #868e96; }
        .mermaid-container { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 Carmack Coder Documentation</h1>
            <p>Auto-generated on ${new Date(documentation.timestamp).toLocaleDateString()}</p>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>${documentation.stats.totalFiles}</h3>
                    <p>Files Scanned</p>
                </div>
                <div class="stat-card">
                    <h3>${documentation.stats.totalItems}</h3>
                    <p>Items Documented</p>
                </div>
                <div class="stat-card">
                    <h3>${documentation.stats.byType.function || 0}</h3>
                    <p>Functions</p>
                </div>
                <div class="stat-card">
                    <h3>${documentation.stats.byType.class || 0}</h3>
                    <p>Classes</p>
                </div>
            </div>
        </div>

        <input type="text" class="search-box" placeholder="🔍 Search documentation..." id="searchBox">

        <div class="nav-tabs">
            <div class="nav-tab active" onclick="showSection('api')">📚 API Reference</div>
            <div class="nav-tab" onclick="showSection('patterns')">🔄 Patterns</div>
            <div class="nav-tab" onclick="showSection('states')">🏗️ State Machines</div>
            <div class="nav-tab" onclick="showSection('configs')">⚙️ Configuration</div>
        </div>

        <div id="api" class="content-section active">
            <h2>📚 API Reference</h2>
            ${this.generateHTMLItemList(documentation.structure.api)}
        </div>

        <div id="patterns" class="content-section">
            <h2>🔄 Transformation Patterns</h2>
            ${this.generateHTMLItemList(documentation.structure.patterns)}
        </div>

        <div id="states" class="content-section">
            <h2>🏗️ State Machines</h2>
            ${mermaidDiagrams}
            ${this.generateHTMLItemList(documentation.structure.states)}
        </div>

        <div id="configs" class="content-section">
            <h2>⚙️ Configuration</h2>
            ${this.generateHTMLItemList(documentation.structure.configs)}
        </div>
    </div>

    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
        
        function showSection(sectionId) {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');
        }

        document.getElementById('searchBox').addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'block' : 'none';
            });
        });
    </script>
</body>
</html>`;
  }

  private generateHTMLItemList(items: DocumentationItem[]): string {
    return items.map(item => `
        <div class="item">
            <div class="item-name">${item.name}</div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            <div class="item-meta">
                � ${item.file}${item.line ? ` (line ${item.line})` : ''}
                ${item.metadata?.language ? ` • ${item.metadata.language}` : ''}
                ${item.metadata?.deprecated ? ' • ⚠️ Deprecated' : ''}
            </div>
        </div>
    `).join('');
  }

  private generateMermaidForStateMachines(stateMachines: DocumentationItem[]): string {
    if (stateMachines.length === 0) return '';
    
    const diagrams = stateMachines.map(machine => {
      const states = machine.metadata?.states as string[] || [];
      if (states.length === 0) return '';
      
      const mermaidCode = `
        <div class="mermaid-container">
            <h3>${machine.name} State Machine</h3>
            <div class="mermaid">
                stateDiagram-v2
                    [*] --> ${states[0] || 'start'}
                    ${states.map((state, i) => {
                      const nextState = states[i + 1];
                      return nextState ? `${state} --> ${nextState}` : `${state} --> [*]`;
                    }).join('\n                    ')}
            </div>
        </div>
      `;
      return mermaidCode;
    }).filter(Boolean);
    
    return diagrams.join('\n');
  }

  private async generateMermaidDiagrams(documentation: GeneratedDocumentation): Promise<void> {
    // Generate standalone Mermaid diagram files
    for (const machine of documentation.structure.states) {
      const states = machine.metadata?.states as string[] || [];
      if (states.length === 0) continue;
      
      const mermaidContent = `
# ${machine.name} State Machine

\`\`\`mermaid
stateDiagram-v2
    [*] --> ${states[0]}
    ${states.map((state, i) => {
      const nextState = states[i + 1];
      return nextState ? `${state} --> ${nextState}` : `${state} --> [*]`;
    }).join('\n    ')}
\`\`\`

**File:** ${machine.file}
**States:** ${states.join(', ')}
      `;
      
      await writeFile(
        join(this.config.outputDir, `${machine.name}-diagram.md`),
        mermaidContent.trim()
      );
    }
  }

  private async writeMarkdownDocs(documentation: GeneratedDocumentation): Promise<void> {
    const markdown = this.generateMarkdown(documentation);
    
    await writeFile(
      join(this.config.outputDir, 'README.md'),
      markdown
    );
    
    // Write category-specific files
    for (const [category, items] of Object.entries(documentation.structure)) {
      if (items.length > 0) {
        const categoryMarkdown = this.generateCategoryMarkdown(category, items);
        await writeFile(
          join(this.config.outputDir, `${category}.md`),
          categoryMarkdown
        );
      }
    }
  }

  private generateMarkdown(documentation: GeneratedDocumentation): string {
    return `# Carmack Coder Documentation

> Auto-generated on ${new Date(documentation.timestamp).toLocaleDateString()}

## Overview

This documentation is automatically generated from the codebase and stays in sync with code changes.

**Statistics:**
- **Total Files Scanned:** ${documentation.stats.totalFiles}
- **Total Items Documented:** ${documentation.stats.totalItems}
- **Functions:** ${documentation.stats.byType.function || 0}
- **Classes:** ${documentation.stats.byType.class || 0}
- **Patterns:** ${documentation.stats.byType.pattern || 0}
- **Configurations:** ${documentation.stats.byType.config || 0}

## Quick Navigation

- [📚 API Reference](./api.md) - Functions, classes, and interfaces
- [🔄 Transformation Patterns](./patterns.md) - Code transformation patterns
- [⚙️ Configuration](./configs.md) - Configuration options and schemas
- [🏗️ State Machines](./states.md) - XState machine documentation

## Recent Updates

${this.generateRecentUpdates(documentation)}

---

*Generated by Carmack Coder Documentation System v${documentation.version}*
`;
  }

  private generateCategoryMarkdown(category: string, items: DocumentationItem[]): string {
    const categoryTitles = {
      api: '📚 API Reference',
      patterns: '🔄 Transformation Patterns',
      configs: '⚙️ Configuration',
      states: '🏗️ State Machines',
    };
    
    const title = categoryTitles[category as keyof typeof categoryTitles] || category;
    
    let markdown = `# ${title}\n\n`;
    
    for (const item of items) {
      markdown += `## ${item.name}\n\n`;
      
      if (item.description) {
        markdown += `${item.description}\n\n`;
      }
      
      markdown += `**File:** \`${item.file}\``;
      if (item.line) {
        markdown += ` (line ${item.line})`;
      }
      markdown += '\n\n';
      
      if (item.metadata) {
        markdown += '**Details:**\n';
        for (const [key, value] of Object.entries(item.metadata)) {
          markdown += `- **${key}:** ${value}\n`;
        }
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    }
    
    return markdown;
  }

  private generateRecentUpdates(documentation: GeneratedDocumentation): string {
    // This would integrate with git to show recent changes
    // For now, return a placeholder
    return `- ${new Date().toLocaleDateString()}: Documentation regenerated with ${documentation.stats.totalItems} items`;
  }
}

export default DocumentationGenerator;
