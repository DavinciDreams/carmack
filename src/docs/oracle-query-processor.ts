import { fromPromise } from 'xstate';
import { z } from 'zod';
import type {
  OracleQuery,
  CodeEntity,
  KnowledgePattern,
  LanguageType,
  DomainType,
} from './types.js';
import {
  validateOracleQuery,
} from './types.js';
import { SemanticIndexer } from './semantic-indexer.js';

// Query intent classification
const INTENT_PATTERNS = {
  code_search: [
    /find.*function/i,
    /search.*code/i,
    /locate.*implementation/i,
    /where.*defined/i,
    /show.*example/i,
  ],
  pattern_analysis: [
    /pattern/i,
    /common.*approach/i,
    /how.*typically/i,
    /best.*practice/i,
    /convention/i,
  ],
  architecture_question: [
    /architecture/i,
    /structure/i,
    /design/i,
    /component/i,
    /module/i,
    /relationship/i,
  ],
  optimization_advice: [
    /optimize/i,
    /performance/i,
    /faster/i,
    /efficient/i,
    /improve/i,
    /bottleneck/i,
  ],
  api_usage: [
    /how.*use/i,
    /api/i,
    /interface/i,
    /call/i,
    /invoke/i,
    /parameter/i,
  ],
  debugging_help: [
    /debug/i,
    /error/i,
    /problem/i,
    /issue/i,
    /fix/i,
    /troubleshoot/i,
  ],
  performance_analysis: [
    /benchmark/i,
    /timing/i,
    /memory/i,
    /gpu/i,
    /cuda/i,
    /throughput/i,
  ],
  general_question: [
    /what.*is/i,
    /explain/i,
    /describe/i,
    /tell.*about/i,
    /overview/i,
  ],
};

// Domain-specific keywords for TensorRT
const DOMAIN_KEYWORDS = {
  inference: ['inference', 'execute', 'run', 'predict', 'forward', 'context'],
  optimization: ['optimize', 'fuse', 'quantize', 'precision', 'fp16', 'int8', 'calibrate'],
  memory_management: ['memory', 'buffer', 'allocation', 'cuda', 'device', 'host'],
  kernel_execution: ['kernel', 'launch', 'grid', 'block', 'thread', 'sync'],
  graph_construction: ['network', 'layer', 'build', 'graph', 'node', 'topology'],
  serialization: ['serialize', 'save', 'load', 'engine', 'plan', 'file'],
  plugin_system: ['plugin', 'custom', 'operator', 'creator', 'registry'],
  builder_api: ['builder', 'config', 'profile', 'workspace', 'optimization'],
  runtime_api: ['runtime', 'context', 'binding', 'tensor', 'shape'],
  parser: ['parser', 'onnx', 'uff', 'caffe', 'model', 'weight'],
};

// Language-specific keywords
const LANGUAGE_KEYWORDS = {
  cuda: ['__global__', '__device__', '__host__', 'threadIdx', 'blockIdx', 'cudaMalloc'],
  cpp: ['template', 'namespace', 'class', 'virtual', 'override', 'std::'],
  python: ['def', 'class', 'import', 'tensorrt', 'pycuda', 'numpy'],
  c: ['struct', 'typedef', 'malloc', 'free', 'static', 'extern'],
};

/**
 * Oracle Query Processor for TensorRT codebase analysis
 * Processes natural language queries and returns intelligent responses
 */
export class OracleQueryProcessor {
  private indexer: SemanticIndexer;
  private dbConfig: any;

  constructor(dbConfig: any) {
    this.dbConfig = dbConfig;
    this.indexer = new SemanticIndexer(dbConfig);
  }

  /**
   * Process a natural language query and return structured results
   */
  async processQuery(query: string): Promise<OracleQuery> {
    const startTime = Date.now();
    
    try {
      await this.indexer.initialize();

      // Classify query intent
      const intent = this.classifyIntent(query);
      
      // Extract language and domain hints
      const language = this.extractLanguageHint(query);
      const domain = this.extractDomainHint(query);

      // Process based on intent
      let results: Array<{ entityId: string; relevanceScore: number; explanation?: string }> = [];

      switch (intent) {
        case 'code_search':
          results = await this.handleCodeSearch(query, language, domain);
          break;
        case 'pattern_analysis':
          results = await this.handlePatternAnalysis(query, language, domain);
          break;
        case 'architecture_question':
          results = await this.handleArchitectureQuestion(query, language, domain);
          break;
        case 'optimization_advice':
          results = await this.handleOptimizationAdvice(query, language, domain);
          break;
        case 'api_usage':
          results = await this.handleApiUsage(query, language, domain);
          break;
        case 'debugging_help':
          results = await this.handleDebuggingHelp(query, language, domain);
          break;
        case 'performance_analysis':
          results = await this.handlePerformanceAnalysis(query, language, domain);
          break;
        default:
          results = await this.handleGeneralQuestion(query, language, domain);
      }

      const responseTime = Date.now() - startTime;
      const { randomUUID } = await import('node:crypto');

      return validateOracleQuery({
        id: randomUUID(),
        query,
        intent,
        language,
        domain,
        results,
        responseTime,
        createdAt: new Date().toISOString(),
      });

    } finally {
      await this.indexer.close();
    }
  }

  /**
   * Generate a human-readable response from query results
   */
  async generateResponse(oracleQuery: OracleQuery): Promise<string> {
    try {
      await this.indexer.initialize();

      let response = `## ${this.formatIntent(oracleQuery.intent)} Response\n\n`;
      response += `**Query:** ${oracleQuery.query}\n\n`;

      if (oracleQuery.results.length === 0) {
        response += "I couldn't find any relevant code entities for your query. Try rephrasing or using different keywords.\n\n";
        response += this.generateSuggestions(oracleQuery.query);
        return response;
      }

      // Get detailed information about the top results
      const topResults = oracleQuery.results.slice(0, 5);
      const entities = await this.getEntitiesByIds(topResults.map(r => r.entityId));

      response += `Found ${oracleQuery.results.length} relevant results:\n\n`;

      for (let i = 0; i < topResults.length; i++) {
        const result = topResults[i];
        if (!result) continue;
        
        const entity = entities.find(e => e.id === result.entityId);
        
        if (entity) {
          response += `### ${i + 1}. ${entity.name} (${Math.round(result.relevanceScore * 100)}% match)\n\n`;
          response += `**Type:** ${entity.type} | **Language:** ${entity.language}`;
          if (entity.domain) {
            response += ` | **Domain:** ${entity.domain}`;
          }
          response += `\n\n`;

          if (entity.description) {
            response += `**Description:** ${entity.description}\n\n`;
          }

          if (entity.signature) {
            response += `**Signature:** \`${entity.signature}\`\n\n`;
          }

          response += `**Location:** ${entity.filePath}:${entity.startLine}\n\n`;

          if (entity.sourceCode && entity.sourceCode.length < 500) {
            response += `**Code:**\n\`\`\`${this.getLanguageForHighlighting(entity.language)}\n${entity.sourceCode}\n\`\`\`\n\n`;
          } else if (entity.sourceCode) {
            response += `**Code Preview:**\n\`\`\`${this.getLanguageForHighlighting(entity.language)}\n${entity.sourceCode.substring(0, 300)}...\n\`\`\`\n\n`;
          }

          if (result.explanation) {
            response += `**Why this matches:** ${result.explanation}\n\n`;
          }

          response += '---\n\n';
        }
      }

      // Add related patterns if available
      const patterns = await this.findRelatedPatterns(oracleQuery.query, oracleQuery.language, oracleQuery.domain);
      if (patterns.length > 0) {
        response += `## Related Patterns\n\n`;
        for (const pattern of patterns.slice(0, 3)) {
          response += `### ${pattern.name}\n\n`;
          response += `${pattern.description}\n\n`;
          if (pattern.examples.length > 0 && pattern.examples[0]) {
            response += `**Example:**\n\`\`\`${this.getLanguageForHighlighting(pattern.language)}\n${pattern.examples[0].code}\n\`\`\`\n\n`;
          }
        }
      }

      response += `\n*Query processed in ${oracleQuery.responseTime}ms*`;

      return response;

    } finally {
      await this.indexer.close();
    }
  }

  // Private helper methods

  private classifyIntent(query: string): OracleQuery['intent'] {
    const lowerQuery = query.toLowerCase();

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerQuery)) {
          return intent as OracleQuery['intent'];
        }
      }
    }

    return 'general_question';
  }

  private extractLanguageHint(query: string): LanguageType | undefined {
    const lowerQuery = query.toLowerCase();

    for (const [language, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          return language as LanguageType;
        }
      }
    }

    // Check for explicit language mentions
    if (lowerQuery.includes('cuda')) return 'cuda';
    if (lowerQuery.includes('c++') || lowerQuery.includes('cpp')) return 'cpp';
    if (lowerQuery.includes('python')) return 'python';
    if (lowerQuery.includes('typescript')) return 'typescript';
    if (lowerQuery.includes('javascript')) return 'javascript';

    return undefined;
  }

  private extractDomainHint(query: string): DomainType | undefined {
    const lowerQuery = query.toLowerCase();

    let maxScore = 0;
    let bestDomain: DomainType | undefined;

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          score++;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain as DomainType;
      }
    }

    return bestDomain;
  }

  private async handleCodeSearch(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    const searchOptions: any = {
      limit: 10,
      threshold: 0.6,
    };

    if (language) searchOptions.languages = [language];
    if (domain) searchOptions.domains = [domain];

    const results = await this.indexer.searchSimilar(query, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `Code entity matches your search criteria with ${Math.round(result.similarity * 100)}% similarity`,
    }));
  }

  private async handlePatternAnalysis(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // First, find patterns
    const patternOptions: any = { limit: 5 };
    if (language) patternOptions.languages = [language];
    if (domain) patternOptions.domains = [domain];
    
    const patterns = await this.indexer.findPatterns(query, patternOptions);

    // Then find entities that exemplify these patterns
    const results: Array<{ entityId: string; relevanceScore: number; explanation?: string }> = [];

    for (const pattern of patterns) {
      // Search for entities that match this pattern
      const searchOptions: any = { limit: 3, threshold: 0.7 };
      if (language) searchOptions.languages = [language];
      if (domain) searchOptions.domains = [domain];
      
      const patternResults = await this.indexer.searchSimilar(pattern.pattern, searchOptions);

      for (const result of patternResults) {
        results.push({
          entityId: result.entity.id,
          relevanceScore: result.similarity * pattern.confidence,
          explanation: `Exemplifies the "${pattern.name}" pattern with ${Math.round(pattern.confidence * 100)}% confidence`,
        });
      }
    }

    // Sort by relevance score and remove duplicates
    const uniqueResults = new Map<string, typeof results[0]>();
    for (const result of results) {
      if (!uniqueResults.has(result.entityId) || 
          uniqueResults.get(result.entityId)!.relevanceScore < result.relevanceScore) {
        uniqueResults.set(result.entityId, result);
      }
    }

    return Array.from(uniqueResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  private async handleArchitectureQuestion(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // Focus on classes, namespaces, and modules for architecture questions
    const searchOptions: any = {
      limit: 10,
      threshold: 0.5,
      entityTypes: ['class', 'namespace', 'module', 'interface'],
    };

    if (language) searchOptions.languages = [language];
    if (domain) searchOptions.domains = [domain];

    const results = await this.indexer.searchSimilar(query, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `Architectural component relevant to your question about system structure`,
    }));
  }

  private async handleOptimizationAdvice(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // Look for optimization-related entities
    const optimizationQuery = `${query} optimization performance efficient fast`;
    
    const searchOptions: any = {
      limit: 10,
      threshold: 0.6,
      domains: domain ? [domain] : ['optimization', 'performance_analysis', 'kernel_execution'],
    };

    if (language) searchOptions.languages = [language];

    const results = await this.indexer.searchSimilar(optimizationQuery, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `Contains optimization techniques or performance-related code`,
    }));
  }

  private async handleApiUsage(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // Focus on functions and methods for API usage
    const searchOptions: any = {
      limit: 10,
      threshold: 0.6,
      entityTypes: ['function', 'method', 'class'],
    };

    if (language) searchOptions.languages = [language];
    if (domain) searchOptions.domains = [domain];

    const results = await this.indexer.searchSimilar(query, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `API component that matches your usage question`,
    }));
  }

  private async handleDebuggingHelp(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // Look for error handling, validation, and debugging-related code
    const debugQuery = `${query} error debug validate check assert`;
    
    const searchOptions: any = {
      limit: 10,
      threshold: 0.5,
    };

    if (language) searchOptions.languages = [language];
    if (domain) searchOptions.domains = [domain];

    const results = await this.indexer.searchSimilar(debugQuery, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `May contain debugging information or error handling relevant to your issue`,
    }));
  }

  private async handlePerformanceAnalysis(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    // Focus on performance-critical domains
    const searchOptions: any = {
      limit: 10,
      threshold: 0.6,
      domains: domain ? [domain] : ['kernel_execution', 'memory_management', 'optimization'],
    };

    if (language) searchOptions.languages = [language];

    const results = await this.indexer.searchSimilar(query, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `Performance-critical code relevant to your analysis`,
    }));
  }

  private async handleGeneralQuestion(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<Array<{ entityId: string; relevanceScore: number; explanation?: string }>> {
    const searchOptions: any = {
      limit: 10,
      threshold: 0.5,
    };

    if (language) searchOptions.languages = [language];
    if (domain) searchOptions.domains = [domain];

    const results = await this.indexer.searchSimilar(query, searchOptions);
    
    return results.map(result => ({
      entityId: result.entity.id,
      relevanceScore: result.similarity,
      explanation: `Relevant code entity found through semantic search`,
    }));
  }

  private async getEntitiesByIds(entityIds: string[]): Promise<CodeEntity[]> {
    if (entityIds.length === 0) return [];

    const placeholders = entityIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `SELECT * FROM code_entities WHERE id IN (${placeholders})`;
    
    const result = await this.indexer['dbClient'].query(sql, entityIds);
    return result.rows.map((row: any) => this.indexer['rowToCodeEntity'](row));
  }

  private async findRelatedPatterns(
    query: string,
    language?: LanguageType,
    domain?: DomainType
  ): Promise<KnowledgePattern[]> {
    const options: any = { limit: 3, minConfidence: 0.3 };
    if (language) options.languages = [language];
    if (domain) options.domains = [domain];
    
    return await this.indexer.findPatterns(query, options);
  }

  private formatIntent(intent: OracleQuery['intent']): string {
    const intentMap = {
      code_search: 'Code Search',
      pattern_analysis: 'Pattern Analysis',
      architecture_question: 'Architecture Question',
      optimization_advice: 'Optimization Advice',
      api_usage: 'API Usage',
      debugging_help: 'Debugging Help',
      performance_analysis: 'Performance Analysis',
      general_question: 'General Question',
    };

    return intentMap[intent] || 'Query';
  }

  private getLanguageForHighlighting(language: LanguageType): string {
    const languageMap = {
      cuda: 'cpp',
      cpp: 'cpp',
      c: 'c',
      python: 'python',
      typescript: 'typescript',
      javascript: 'javascript',
      unknown: 'text',
    };

    return languageMap[language] || 'text';
  }

  private generateSuggestions(query: string): string {
    let suggestions = "**Suggestions:**\n\n";
    suggestions += "- Try using more specific technical terms\n";
    suggestions += "- Include language keywords (CUDA, C++, Python)\n";
    suggestions += "- Mention specific TensorRT components (engine, builder, context)\n";
    suggestions += "- Use domain-specific terms (inference, optimization, serialization)\n\n";
    
    suggestions += "**Example queries:**\n";
    suggestions += "- \"Find CUDA kernel implementations for convolution\"\n";
    suggestions += "- \"Show me TensorRT engine serialization patterns\"\n";
    suggestions += "- \"How to optimize inference performance?\"\n";
    suggestions += "- \"Python API usage for model conversion\"\n";

    return suggestions;
  }
}

// Create and export the oracle query processor actor
export const oracleQueryProcessorActor = fromPromise(
  async ({ input }: { 
    input: { 
      operation: string;
      query?: string;
      oracleQuery?: OracleQuery;
    } 
  }) => {
    const dbConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'tensorrt_oracle',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'your_secure_password',
      schema: process.env.POSTGRES_SCHEMA || 'tensorrt_oracle',
    };

    const processor = new OracleQueryProcessor(dbConfig);

    switch (input.operation) {
      case 'process':
        if (!input.query) {
          throw new Error('Query is required for processing');
        }
        return await processor.processQuery(input.query);
      
      case 'generate_response':
        if (!input.oracleQuery) {
          throw new Error('Oracle query is required for response generation');
        }
        return await processor.generateResponse(input.oracleQuery);
      
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  }
);