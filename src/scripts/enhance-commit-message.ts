#!/usr/bin/env bun

/**
 * Intelligent Commit Message Enhancement Script
 * 
 * Analyzes staged changes and enhances commit messages with:
 * - Automated change analysis
 * - Impact assessment
 * - Reasoning inference
 * - Quality metrics
 */

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { z } from 'zod';

// Schemas for commit analysis
const FileChangeSchema = z.object({
  file: z.string(),
  status: z.enum(['A', 'M', 'D', 'R', 'C']), // Added, Modified, Deleted, Renamed, Copied
  insertions: z.number(),
  deletions: z.number(),
  type: z.enum(['source', 'test', 'config', 'docs', 'build']),
  language: z.string().optional(),
});

const CommitAnalysisSchema = z.object({
  files: z.array(FileChangeSchema),
  totalInsertions: z.number(),
  totalDeletions: z.number(),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']),
  changeType: z.enum(['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore']),
  affectedComponents: z.array(z.string()),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
  }),
  qualityMetrics: z.object({
    codeComplexity: z.number(),
    testCoverage: z.number().optional(),
    typeErrors: z.number(),
    lintIssues: z.number(),
  }),
});

type FileChange = z.infer<typeof FileChangeSchema>;
type CommitAnalysis = z.infer<typeof CommitAnalysisSchema>;

/**
 * Get detailed information about staged changes
 */
async function analyzeStagedChanges(): Promise<CommitAnalysis> {
  try {
    // Get file changes with stats
    const diffOutput = execSync('git diff --cached --numstat', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const statusOutput = execSync('git diff --cached --name-status', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const files = parseDiffOutput(diffOutput, statusOutput);
    const totalInsertions = files.reduce((sum, f) => sum + f.insertions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      files,
      totalInsertions,
      totalDeletions,
      impactLevel: calculateImpactLevel(files, totalInsertions, totalDeletions),
      changeType: inferChangeType(files),
      affectedComponents: identifyAffectedComponents(files),
      riskAssessment: assessRisk(files),
      qualityMetrics: await calculateQualityMetrics(files),
    };
  } catch (error) {
    // Fallback for empty or error cases
    return {
      files: [],
      totalInsertions: 0,
      totalDeletions: 0,
      impactLevel: 'low',
      changeType: 'chore',
      affectedComponents: [],
      riskAssessment: { level: 'low', factors: [] },
      qualityMetrics: { codeComplexity: 0, typeErrors: 0, lintIssues: 0 },
    };
  }
}

/**
 * Parse git diff output into structured file changes
 */
function parseDiffOutput(diffOutput: string, statusOutput: string): FileChange[] {
  const diffLines = diffOutput.trim().split('\n').filter(line => line);
  const statusLines = statusOutput.trim().split('\n').filter(line => line);

  const statusMap = new Map<string, string>();
  for (const line of statusLines) {
    const [status, file] = line.split('\t');
    if (status && file) {
      statusMap.set(file, status);
    }
  }

  const files: FileChange[] = [];
  for (const line of diffLines) {
    const [insertions, deletions, file] = line.split('\t');
    if (file && insertions !== undefined && deletions !== undefined) {
      const status = statusMap.get(file) || 'M';
      files.push({
        file,
        status: status as FileChange['status'],
        insertions: insertions === '-' ? 0 : parseInt(insertions, 10),
        deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
        type: categorizeFile(file),
        language: getFileLanguage(file),
      });
    }
  }

  return files;
}

/**
 * Categorize file by its purpose
 */
function categorizeFile(filePath: string): FileChange['type'] {
  const path = filePath.toLowerCase();
  
  if (path.includes('test') || path.includes('spec') || path.includes('__tests__')) {
    return 'test';
  }
  if (path.includes('config') || path.includes('.json') || path.includes('.yml') || path.includes('.yaml')) {
    return 'config';
  }
  if (path.includes('readme') || path.includes('doc') || path.includes('.md')) {
    return 'docs';
  }
  if (path.includes('package.json') || path.includes('bun.lock') || path.includes('dockerfile')) {
    return 'build';
  }
  
  return 'source';
}

/**
 * Get programming language from file extension
 */
function getFileLanguage(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.clj': 'Clojure',
    '.hs': 'Haskell',
    '.ml': 'OCaml',
    '.fs': 'F#',
    '.elm': 'Elm',
    '.dart': 'Dart',
    '.lua': 'Lua',
    '.r': 'R',
    '.jl': 'Julia',
    '.nim': 'Nim',
    '.zig': 'Zig',
  };
  
  return languageMap[ext];
}

/**
 * Calculate impact level based on changes
 */
function calculateImpactLevel(
  files: FileChange[],
  totalInsertions: number,
  totalDeletions: number
): CommitAnalysis['impactLevel'] {
  const totalChanges = totalInsertions + totalDeletions;
  const sourceFiles = files.filter(f => f.type === 'source').length;
  const hasConfigChanges = files.some(f => f.type === 'config');
  const hasBuildChanges = files.some(f => f.type === 'build');

  if (totalChanges > 500 || sourceFiles > 10 || hasBuildChanges) {
    return 'critical';
  }
  if (totalChanges > 200 || sourceFiles > 5 || hasConfigChanges) {
    return 'high';
  }
  if (totalChanges > 50 || sourceFiles > 2) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Infer the type of change based on files and patterns
 */
function inferChangeType(files: FileChange[]): CommitAnalysis['changeType'] {
  const hasTests = files.some(f => f.type === 'test');
  const hasSource = files.some(f => f.type === 'source');
  const hasDocs = files.some(f => f.type === 'docs');
  const hasConfig = files.some(f => f.type === 'config');
  const hasBuild = files.some(f => f.type === 'build');

  // Analyze file names and content for patterns
  const fileNames = files.map(f => basename(f.file).toLowerCase());
  const hasFixPattern = fileNames.some(name => 
    name.includes('fix') || name.includes('bug') || name.includes('patch')
  );
  const hasFeaturePattern = fileNames.some(name =>
    name.includes('feature') || name.includes('add') || name.includes('new')
  );

  if (hasFixPattern) return 'fix';
  if (hasFeaturePattern && hasSource) return 'feature';
  if (hasTests && !hasSource) return 'test';
  if (hasDocs && !hasSource) return 'docs';
  if (hasConfig || hasBuild) return 'chore';
  if (hasSource && files.every(f => f.insertions + f.deletions < 50)) return 'style';
  if (hasSource) return 'refactor';
  
  return 'chore';
}

/**
 * Identify affected components/modules
 */
function identifyAffectedComponents(files: FileChange[]): string[] {
  const components = new Set<string>();
  
  for (const file of files) {
    const pathParts = file.file.split('/');
    
    // Extract component names from path structure
    if (pathParts.includes('src')) {
      const srcIndex = pathParts.indexOf('src');
      const component = pathParts[srcIndex + 1];
      if (component) {
        components.add(component);
      }
    }
    
    // Extract from filename patterns
    const fileName = basename(file.file, extname(file.file));
    if (fileName.includes('-')) {
      const parts = fileName.split('-');
      const firstPart = parts[0];
      if (parts.length > 1 && firstPart) {
        components.add(firstPart);
      }
    }
  }
  
  return Array.from(components).slice(0, 5); // Limit to top 5 components
}

/**
 * Assess risk level of changes
 */
function assessRisk(files: FileChange[]): CommitAnalysis['riskAssessment'] {
  const factors: string[] = [];
  let riskScore = 0;

  // Check for high-risk patterns
  const criticalFiles = files.filter(f => 
    f.file.includes('config') || 
    f.file.includes('package.json') ||
    f.file.includes('tsconfig') ||
    f.file.includes('dockerfile')
  );
  
  if (criticalFiles.length > 0) {
    factors.push('Configuration changes');
    riskScore += 2;
  }

  const largeChanges = files.filter(f => f.insertions + f.deletions > 100);
  if (largeChanges.length > 0) {
    factors.push('Large file changes');
    riskScore += 1;
  }

  const deletions = files.filter(f => f.status === 'D');
  if (deletions.length > 0) {
    factors.push('File deletions');
    riskScore += 1;
  }

  const coreFiles = files.filter(f => 
    f.file.includes('index') || 
    f.file.includes('main') ||
    f.file.includes('app')
  );
  if (coreFiles.length > 0) {
    factors.push('Core file modifications');
    riskScore += 1;
  }

  let level: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 3) level = 'high';
  else if (riskScore >= 2) level = 'medium';

  return { level, factors };
}

/**
 * Calculate quality metrics for the changes
 */
async function calculateQualityMetrics(files: FileChange[]): Promise<CommitAnalysis['qualityMetrics']> {
  let codeComplexity = 0;
  let typeErrors = 0;
  let lintIssues = 0;

  // Estimate complexity based on change size and patterns
  for (const file of files) {
    const changeSize = file.insertions + file.deletions;
    
    // Simple heuristic: larger changes tend to be more complex
    if (changeSize > 100) codeComplexity += 3;
    else if (changeSize > 50) codeComplexity += 2;
    else if (changeSize > 10) codeComplexity += 1;
  }

  // Try to get actual TypeScript errors (non-blocking)
  try {
    const tscOutput = execSync('bunx tsc --noEmit --pretty false', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000, // 5 second timeout
    });
    
    // Count error lines
    typeErrors = (tscOutput.match(/error TS\d+:/g) || []).length;
  } catch (error: any) {
    // TypeScript errors are in stderr, count them
    const output = error.stdout || error.stderr || '';
    typeErrors = (output.match(/error TS\d+:/g) || []).length;
  }

  // Try to get Biome issues (non-blocking)
  try {
    const biomeOutput = execSync('bunx biome check --reporter=json .', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    
    const biomeResult = JSON.parse(biomeOutput);
    lintIssues = biomeResult.diagnostics?.length || 0;
  } catch (error) {
    // Biome check failed or no issues
    lintIssues = 0;
  }

  return {
    codeComplexity: Math.min(codeComplexity, 10), // Cap at 10
    typeErrors,
    lintIssues,
  };
}

/**
 * Generate enhanced commit message
 */
function generateEnhancedMessage(
  originalMessage: string,
  analysis: CommitAnalysis
): string {
  const lines: string[] = [];
  
  // Original message (cleaned up)
  const cleanMessage = originalMessage.trim();
  if (cleanMessage && cleanMessage !== '' && !cleanMessage.startsWith('#')) {
    lines.push(cleanMessage);
  } else {
    // Generate a message if none provided
    const typePrefix = getTypePrefix(analysis.changeType);
    const componentSuffix = analysis.affectedComponents.length > 0 
      ? ` (${analysis.affectedComponents.slice(0, 2).join(', ')})`
      : '';
    lines.push(`${typePrefix}: ${generateDefaultMessage(analysis)}${componentSuffix}`);
  }
  
  lines.push(''); // Empty line
  
  // Change summary
  lines.push('## 📊 Change Summary');
  lines.push(`- **Type**: ${analysis.changeType}`);
  lines.push(`- **Impact**: ${analysis.impactLevel}`);
  lines.push(`- **Files**: ${analysis.files.length} (${analysis.totalInsertions}+ ${analysis.totalDeletions}-)`);
  
  if (analysis.affectedComponents.length > 0) {
    lines.push(`- **Components**: ${analysis.affectedComponents.join(', ')}`);
  }
  
  lines.push('');
  
  // Risk assessment
  if (analysis.riskAssessment.level !== 'low' || analysis.riskAssessment.factors.length > 0) {
    lines.push('## ⚠️ Risk Assessment');
    lines.push(`- **Level**: ${analysis.riskAssessment.level}`);
    if (analysis.riskAssessment.factors.length > 0) {
      lines.push(`- **Factors**: ${analysis.riskAssessment.factors.join(', ')}`);
    }
    lines.push('');
  }
  
  // Quality metrics
  lines.push('## 🎯 Quality Metrics');
  lines.push(`- **Complexity**: ${analysis.qualityMetrics.codeComplexity}/10`);
  lines.push(`- **Type Errors**: ${analysis.qualityMetrics.typeErrors}`);
  lines.push(`- **Lint Issues**: ${analysis.qualityMetrics.lintIssues}`);
  
  if (analysis.qualityMetrics.testCoverage !== undefined) {
    lines.push(`- **Test Coverage**: ${analysis.qualityMetrics.testCoverage}%`);
  }
  
  lines.push('');
  
  // File breakdown
  if (analysis.files.length > 0 && analysis.files.length <= 10) {
    lines.push('## 📁 Files Changed');
    for (const file of analysis.files) {
      const statusIcon = getStatusIcon(file.status);
      const sizeInfo = file.insertions + file.deletions > 0 
        ? ` (+${file.insertions} -${file.deletions})`
        : '';
      lines.push(`- ${statusIcon} \`${file.file}\`${sizeInfo}`);
    }
    lines.push('');
  }
  
  // Reasoning (inferred)
  const reasoning = inferReasoning(analysis);
  if (reasoning) {
    lines.push('## 💭 Reasoning');
    lines.push(reasoning);
    lines.push('');
  }
  
  // Auto-generated footer
  lines.push('---');
  lines.push('*Auto-enhanced by Carmack Coder*');
  
  return lines.join('\n');
}

/**
 * Get conventional commit type prefix
 */
function getTypePrefix(changeType: CommitAnalysis['changeType']): string {
  const prefixes = {
    feature: 'feat',
    fix: 'fix',
    refactor: 'refactor',
    docs: 'docs',
    style: 'style',
    test: 'test',
    chore: 'chore',
  };
  
  return prefixes[changeType];
}

/**
 * Generate default commit message if none provided
 */
function generateDefaultMessage(analysis: CommitAnalysis): string {
  const { changeType, files } = analysis;
  
  if (changeType === 'feature') {
    return `add new functionality`;
  }
  if (changeType === 'fix') {
    return `resolve issues`;
  }
  if (changeType === 'refactor') {
    return `improve code structure`;
  }
  if (changeType === 'docs') {
    return `update documentation`;
  }
  if (changeType === 'test') {
    return `add/update tests`;
  }
  if (changeType === 'style') {
    return `improve code formatting`;
  }
  
  return `update ${files.length} file${files.length === 1 ? '' : 's'}`;
}

/**
 * Get status icon for file changes
 */
function getStatusIcon(status: FileChange['status']): string {
  const icons = {
    A: '✨', // Added
    M: '📝', // Modified
    D: '🗑️', // Deleted
    R: '🔄', // Renamed
    C: '📋', // Copied
  };
  
  return icons[status] || '📝';
}

/**
 * Infer reasoning behind the changes
 */
function inferReasoning(analysis: CommitAnalysis): string | null {
  const { changeType, files, riskAssessment, qualityMetrics } = analysis;
  
  if (changeType === 'fix' && qualityMetrics.typeErrors > 0) {
    return 'Addressing TypeScript type errors to improve code safety and maintainability.';
  }
  
  if (changeType === 'refactor' && qualityMetrics.codeComplexity > 5) {
    return 'Reducing code complexity to improve readability and maintainability.';
  }
  
  if (riskAssessment.level === 'high') {
    return 'High-impact changes requiring careful review and testing before deployment.';
  }
  
  if (files.some(f => f.type === 'test')) {
    return 'Improving test coverage to ensure code reliability and prevent regressions.';
  }
  
  if (files.some(f => f.type === 'config')) {
    return 'Configuration updates to improve development workflow and build process.';
  }
  
  if (changeType === 'feature') {
    return 'Adding new functionality to enhance user experience and system capabilities.';
  }
  
  return null;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const commitMsgFile = process.argv[2];
  
  if (!commitMsgFile) {
    console.error('❌ Commit message file not provided');
    process.exit(1);
  }
  
  try {
    console.log('✨ Enhancing commit message with AI analysis...');
    
    // Read original commit message
    const originalMessage = await readFile(commitMsgFile, 'utf-8');
    
    // Analyze staged changes
    const analysis = await analyzeStagedChanges();
    
    // Generate enhanced message
    const enhancedMessage = generateEnhancedMessage(originalMessage, analysis);
    
    // Write back to commit message file
    await writeFile(commitMsgFile, enhancedMessage, 'utf-8');
    
    console.log('✅ Commit message enhanced successfully!');
    console.log(`📊 Analysis: ${analysis.changeType} (${analysis.impactLevel} impact)`);
    console.log(`📁 Files: ${analysis.files.length}, Quality: ${10 - analysis.qualityMetrics.codeComplexity}/10`);
    
  } catch (error: any) {
    console.error('❌ Failed to enhance commit message:', error.message);
    // Don't fail the commit, just log the error
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(0); // Don't block commits on enhancement failures
  });
}