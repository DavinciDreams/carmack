#!/usr/bin/env bun
/**
 * Unified TypeScript Analyzer - The ONE analyzer to rule them all
 * 
 * Combines the best of v1 and v2, works on any codebase structure
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { performance } from 'perf_hooks';

// Configuration schema
const AnalyzerConfigSchema = z.object({
  projectPath: z.string().default(process.cwd()),
  includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.tsx']),
  excludePatterns: z.array(z.string()).default(['node_modules', '.next', 'dist', '.test.', '.spec.']),
  enableFixes: z.boolean().default(true),
  checkNullability: z.boolean().default(true),
  checkComponents: z.boolean().default(true),
  reportFormat: z.enum(['md', 'json', 'both']).default('both'),
  maxIssues: z.number().default(1000),
});

type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>;

// Result schemas
const IssueSchema = z.object({
  type: z.enum(['null-access', 'type-error', 'missing-import', 'unused-code', 'performance']),
  severity: z.enum(['error', 'warning', 'info']),
  file: z.string(),
  line: z.number(),
  column: z.number(),
  message: z.string(),
  fix: z.object({
    description: z.string(),
    code: z.string()
  }).optional()
});

export class UnifiedAnalyzer {
  private program!: ts.Program;
  private checker!: ts.TypeChecker;
  private sourceFiles: ts.SourceFile[] = [];
  private issues: z.infer<typeof IssueSchema>[] = [];
  private stats = {
    filesAnalyzed: 0,
    totalLines: 0,
    issuesFound: 0,
    startTime: 0,
    endTime: 0
  };

  constructor(private config: AnalyzerConfig) {
    this.config = AnalyzerConfigSchema.parse(config);
    this.initializeProgram();
  }

  private initializeProgram() {
    const configPath = ts.findConfigFile(
      this.config.projectPath,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    let fileNames: string[];
    let options: ts.CompilerOptions;

    if (configPath) {
      const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(
        config,
        ts.sys,
        this.config.projectPath
      );
      fileNames = parsed.fileNames;
      options = parsed.options;
    } else {
      // No tsconfig, analyze all TypeScript files
      fileNames = this.findTypeScriptFiles();
      options = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      };
    }

    // Create program
    this.program = ts.createProgram(fileNames, options);
    this.checker = this.program.getTypeChecker();

    // Filter source files
    this.sourceFiles = this.program.getSourceFiles().filter(sf => {
      const fileName = sf.fileName;
      return !this.config.excludePatterns.some(pattern => fileName.includes(pattern));
    });
  }

  private findTypeScriptFiles(): string[] {
    const files: string[] = [];
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.config.excludePatterns.some(p => entry.name === p)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    };

    walkDir(this.config.projectPath);
    return files;
  }

  analyze(): { issues: z.infer<typeof IssueSchema>[]; stats: { filesAnalyzed: number; totalLines: number; issuesFound: number; startTime: number; endTime: number } } {
    console.log(`🔍 Unified Analyzer starting...`);
    console.log(`📁 Found ${this.sourceFiles.length} files to analyze\n`);

    this.stats.startTime = performance.now();

    for (const sourceFile of this.sourceFiles) {
      this.analyzeFile(sourceFile);
      this.stats.filesAnalyzed++;
      
      // Progress indicator
      if (this.stats.filesAnalyzed % 50 === 0) {
        console.log(`  Analyzed ${this.stats.filesAnalyzed}/${this.sourceFiles.length} files...`);
      }
    }

    this.stats.endTime = performance.now();
    this.stats.issuesFound = this.issues.length;

    this.generateReport();

    return {
      issues: this.issues,
      stats: this.stats
    };
  }

  private analyzeFile(sourceFile: ts.SourceFile) {
    const lineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line;
    this.stats.totalLines += lineCount;

    // Run various analyses
    if (this.config.checkNullability) {
      this.checkNullability(sourceFile);
    }

    // Check for common issues
    this.checkCommonPatterns(sourceFile);

    // Type errors
    this.checkTypeErrors(sourceFile);
  }

  private checkNullability(sourceFile: ts.SourceFile) {
    const visit = (node: ts.Node) => {
      // Property access that could fail
      if (ts.isPropertyAccessExpression(node)) {
        const type = this.checker.getTypeAtLocation(node.expression);
        
        if (this.isNullable(type) && !this.hasNullProtection(node)) {
          this.addIssue({
            type: 'null-access',
            severity: 'error',
            file: sourceFile.fileName,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
            message: `Property access '${node.name.text}' on possibly null/undefined value`,
            fix: this.config.enableFixes ? {
              description: 'Add optional chaining',
              code: `${node.expression.getText()}?.${node.name.text}`
            } : undefined
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkCommonPatterns(sourceFile: ts.SourceFile) {
    const visit = (node: ts.Node) => {
      // console.log in production code
      if (ts.isCallExpression(node) && 
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.getText() === 'console') {
        this.addIssue({
          type: 'performance',
          severity: 'warning',
          file: sourceFile.fileName,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
          message: 'Console statement in production code',
          fix: {
            description: 'Remove console statement',
            code: ''
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkTypeErrors(sourceFile: ts.SourceFile) {
    const diagnostics = ts.getPreEmitDiagnostics(this.program, sourceFile);
    
    for (const diagnostic of diagnostics) {
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        
        this.addIssue({
          type: 'type-error',
          severity: 'error',
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        });
      }
    }
  }

  private isNullable(type: ts.Type): boolean {
    if (type.isUnion()) {
      return type.types.some(t => 
        t.flags & ts.TypeFlags.Null || 
        t.flags & ts.TypeFlags.Undefined
      );
    }
    return !!(type.flags & ts.TypeFlags.Null || type.flags & ts.TypeFlags.Undefined);
  }

  private hasNullProtection(node: ts.Node): boolean {
    let parent = node.parent;
    
    while (parent && !ts.isSourceFile(parent)) {
      if (ts.isPropertyAccessChain(parent) || 
          ts.isIfStatement(parent) ||
          ts.isConditionalExpression(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    
    return false;
  }

  private addIssue(issue: z.infer<typeof IssueSchema>) {
    if (this.issues.length < this.config.maxIssues) {
      this.issues.push(issue);
    }
  }

  private generateReport() {
    const duration = this.stats.endTime - this.stats.startTime;
    
    // Console summary
    console.log('\n📊 Analysis Complete!');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📁 Files analyzed: ${this.stats.filesAnalyzed}`);
    console.log(`📝 Total lines: ${this.stats.totalLines.toLocaleString()}`);
    console.log(`🐛 Issues found: ${this.stats.issuesFound}`);
    console.log(`⚡ Speed: ${(this.stats.filesAnalyzed / (duration / 1000)).toFixed(1)} files/sec`);

    // Group issues by type
    const byType = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n🔍 Issues by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Save reports
    if (this.config.reportFormat === 'json' || this.config.reportFormat === 'both') {
      fs.writeFileSync('unified-analysis.json', JSON.stringify({
        stats: this.stats,
        issues: this.issues,
        config: this.config
      }, null, 2));
      console.log('\n📄 JSON report: unified-analysis.json');
    }

    if (this.config.reportFormat === 'md' || this.config.reportFormat === 'both') {
      const markdown = this.generateMarkdownReport();
      fs.writeFileSync('unified-analysis.md', markdown);
      console.log('📄 Markdown report: unified-analysis.md');
    }
  }

  private generateMarkdownReport(): string {
    let md = '# Unified TypeScript Analysis Report\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;
    
    md += '## Summary\n\n';
    md += `- Files Analyzed: ${this.stats.filesAnalyzed}\n`;
    md += `- Total Lines: ${this.stats.totalLines.toLocaleString()}\n`;
    md += `- Issues Found: ${this.stats.issuesFound}\n`;
    md += `- Analysis Time: ${((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2)}s\n\n`;

    if (this.issues.length > 0) {
      md += '## Issues\n\n';
      
      // Group by severity
      const bySeverity = {
        error: this.issues.filter(i => i.severity === 'error'),
        warning: this.issues.filter(i => i.severity === 'warning'),
        info: this.issues.filter(i => i.severity === 'info')
      };

      for (const [severity, issues] of Object.entries(bySeverity)) {
        if (issues.length === 0) continue;
        
        md += `### ${severity.toUpperCase()}S (${issues.length})\n\n`;
        
        for (const issue of issues.slice(0, 50)) { // First 50 of each type
          md += `- **${path.basename(issue.file)}:${issue.line}:${issue.column}** - ${issue.message}\n`;
          if (issue.fix) {
            md += `  - Fix: ${issue.fix.description}\n`;
          }
        }
        
        if (issues.length > 50) {
          md += `\n...and ${issues.length - 50} more ${severity}s\n`;
        }
        
        md += '\n';
      }
    }

    return md;
  }
}

// CLI interface
if (import.meta.main) {
  const analyzer = new UnifiedAnalyzer({
    projectPath: process.cwd(),
    includePatterns: ['**/*.ts', '**/*.tsx'],
    excludePatterns: ['node_modules', '.next', 'dist', '.test.', '.spec.'],
    enableFixes: true,
    checkNullability: true,
    checkComponents: true,
    reportFormat: 'both',
    maxIssues: 1000
  });
  
  analyzer.analyze();
}