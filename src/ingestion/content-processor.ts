import { z } from 'zod';

import { getEnvironmentConfig } from '../config/environment.ts';
import { getTelemetryCollector } from '../telemetry/index.ts';
import { FileMetadataSchema, VectorEmbeddingSchema, TelemetryEventSchema } from '../types/unified-schemas.ts';

import type { CSTNode, AnalysisResult } from './ast-analyzer.ts';

/**
 * Content Processor for TensorRT-LLM Knowledge Graph Ingestion
 *
 * Handles content transformation, semantic annotation using BAML,
 * and embedding generation via HuggingFace API. Follows Carmack's
 * principles of efficient processing and type safety.
 */


// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * Content processing configuration schema
 */
export const ContentProcessingConfigSchema = z.object({
  chunkSize: z.number().int().positive().default(1000),
  chunkOverlap: z.number().int().min(0).default(200),
  maxChunks: z.number().int().positive().default(50),
  embeddingModel: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
  embeddingDimensions: z.number().int().positive().default(384),
  batchSize: z.number().int().positive().default(10),
  requestTimeout: z.number().int().positive().default(30000),
  retryAttempts: z.number().int().min(0).default(3),
  retryDelay: z.number().int().positive().default(1000),
});

export type ContentProcessingConfig = z.infer<typeof ContentProcessingConfigSchema>;

/**
 * Content chunk schema
 * (If you want to unify this, consider using FileMetadataSchema for file-level metadata,
 * and VectorEmbeddingSchema for embedding payloads.)
 */
export const ContentChunkSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  startIndex: z.number().int().min(0),
  endIndex: z.number().int().min(0),
  chunkIndex: z.number().int().min(0),
  metadata: z.record(z.unknown()).default({}),
  language: z.string(),
  semanticType: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  embedding: z.array(z.number()).optional(), // Use VectorEmbeddingSchema for full embedding objects
});

export type ContentChunk = z.infer<typeof ContentChunkSchema>;

/**
 * Semantic annotation schema
 */
export const SemanticAnnotationSchema = z.object({
  summary: z.string(),
  purpose: z.string(),
  complexity: z.enum(['low', 'medium', 'high']),
  domain: z.array(z.string()),
  keywords: z.array(z.string()),
  dependencies: z.array(z.string()),
  performance_impact: z.enum(['critical', 'high', 'normal', 'low']),
  maintainability: z.number().min(0).max(1),
  testability: z.number().min(0).max(1),
  technical_debt: z.number().min(0).max(1),
});

export type SemanticAnnotation = z.infer<typeof SemanticAnnotationSchema>;

/**
 * Processing result schema
 * (fileId and embeddings should use unified schemas)
 */
export const ProcessingResultSchema = z.object({
  fileId: z.string().uuid(),
  filePath: z.string(),
  chunks: z.array(ContentChunkSchema),
  annotation: SemanticAnnotationSchema,
  embeddings: z.array(VectorEmbeddingSchema), // Use unified VectorEmbeddingSchema
  processingTime: z.number().int().min(0),
  metadata: z.record(z.unknown()).default({}),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/**
 * HuggingFace API response schema
 */
export const HuggingFaceResponseSchema = z.array(z.array(z.number()));

// =============================================================================
// ERRORS
// =============================================================================

export class ContentProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export class BAMLError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BAMLError';
  }
}

/**
 * Content processor for semantic annotation and embedding generation
 */
export class ContentProcessor {
  private config: ContentProcessingConfig;
  private hfToken: string | undefined;

  constructor(config?: Partial<ContentProcessingConfig>) {
    // Always default to centralized environment-aware config, allow override
    const env = getEnvironmentConfig();
    this.config = ContentProcessingConfigSchema.parse({
      ...config,
    });
    this.hfToken = env.HF_TOKEN;
  }

  /**
   * Process file content with chunking, annotation, and embeddings
   */
  async processFileContent(
    fileContent: z.infer<typeof FileMetadataSchema> & { content: string },
    astResult?: AnalysisResult
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Processing content for: ${fileContent.path}`);

      // Step 1: Chunk the content
      const chunks = this.chunkContent(fileContent);

      // Step 2: Generate semantic annotation using BAML
      const annotation = await this.generateSemanticAnnotation(fileContent, astResult);

      // Step 3: Generate embeddings for chunks
      const embeddingVectors = await this.generateEmbeddings(chunks.map(c => c.content));

      // Step 4: Attach embeddings to chunks and build VectorEmbeddingSchema objects
      const vectorEmbeddings = embeddingVectors.map((vector, index) =>
        VectorEmbeddingSchema.parse({
          id: crypto.randomUUID(),
          fileId: fileContent.id,
          vector,
          model: this.config.embeddingModel,
          createdAt: new Date(),
        })
      );

      const processedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: vectorEmbeddings[index]?.vector || undefined,
      }));

      const result: ProcessingResult = {
        fileId: fileContent.id,
        filePath: fileContent.path,
        chunks: processedChunks,
        annotation,
        embeddings: vectorEmbeddings,
        processingTime: Date.now() - startTime,
        metadata: {
          originalSize: fileContent.content.length,
          chunkCount: chunks.length,
          language: fileContent.language,
          astNodeCount: astResult?.totalNodes || 0,
        },
      };

      // Emit telemetry event for successful file processing
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'content_processed',
          fileId: fileContent.id,
          details: {
            filePath: fileContent.path,
            chunkCount: chunks.length,
            processingTime: result.processingTime,
            language: fileContent.language,
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        // Telemetry errors should not block processing
        console.warn('Telemetry emission failed:', telemetryError);
      }

      console.log(`✅ Processed ${chunks.length} chunks in ${result.processingTime}ms`);
      return ProcessingResultSchema.parse(result);
    } catch (error) {
      // Emit telemetry event for processing error
      try {
        const event = TelemetryEventSchema.parse({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'content_processing_error',
          fileId: fileContent.id,
          details: {
            filePath: fileContent.path,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        getTelemetryCollector().emitUnifiedEvent(event);
      } catch (telemetryError) {
        console.warn('Telemetry emission failed:', telemetryError);
      }
      throw new ContentProcessingError(
        'Failed to process file content',
        'PROCESSING_FAILED',
        fileContent.path ?? "",
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Batch process multiple files
   */
  async processFiles(
    fileContents: (z.infer<typeof FileMetadataSchema> & { content: string })[],
    astResults?: Map<string, AnalysisResult>
  ): Promise<ProcessingResult[]> {
    console.log(`🔄 Batch processing ${fileContents.length} files...`);

    const results: ProcessingResult[] = [];

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < fileContents.length; i += this.config.batchSize) {
      const batch = fileContents.slice(i, i + this.config.batchSize);

      const batchPromises = batch.map(async (fileContent) => {
        try {
          const astResult = astResults?.get(fileContent.path);
          return await this.processFileContent(fileContent, astResult);
        } catch (error) {
          console.warn(`⚠️ Failed to process ${fileContent.path}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as ProcessingResult[]);

      console.log(`📊 Processed batch ${Math.floor(i / this.config.batchSize) + 1}, total: ${results.length}`);

      // Small delay between batches to respect rate limits
      if (i + this.config.batchSize < fileContents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Emit telemetry event for batch processing
    try {
      const event = TelemetryEventSchema.parse({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'batch_content_processed',
        details: {
          fileCount: fileContents.length,
          processedCount: results.length,
        },
      });
      getTelemetryCollector().emitUnifiedEvent(event);
    } catch (telemetryError) {
      console.warn('Telemetry emission failed:', telemetryError);
    }
    console.log(`✅ Successfully processed ${results.length}/${fileContents.length} files`);
    return results;
  }

  // =============================================================================
  // CONTENT CHUNKING
  // =============================================================================

  /**
   * Chunk content into manageable pieces
   */
  private chunkContent(fileContent: z.infer<typeof FileMetadataSchema> & { content: string }): ContentChunk[] {
    const content = fileContent.content;
    const chunks: ContentChunk[] = [];

    // For code files, try to chunk by logical boundaries
    if (this.isCodeFile(fileContent.language)) {
      return this.chunkCodeContent(fileContent);
    }

    // Default text chunking
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length && chunkIndex < this.config.maxChunks) {
      let endIndex = Math.min(startIndex + this.config.chunkSize, content.length);

      // Try to break at word boundaries
      if (endIndex < content.length) {
        const lastSpace = content.lastIndexOf(' ', endIndex);
        const lastNewline = content.lastIndexOf('\n', endIndex);
        const breakPoint = Math.max(lastSpace, lastNewline);

        if (breakPoint > startIndex) {
          endIndex = breakPoint;
        }
      }

      const chunkContent = content.slice(startIndex, endIndex);

      if (chunkContent.trim().length > 0) {
        const chunk: ContentChunk = {
          id: crypto.randomUUID(),
          content: chunkContent,
          startIndex,
          endIndex,
          chunkIndex,
          language: fileContent.language,
          metadata: {
            filePath: fileContent.path,
            size: chunkContent.length,
          },
          keywords: this.extractKeywords(chunkContent),
        };

        chunks.push(chunk);
      }

      startIndex = endIndex - this.config.chunkOverlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Chunk code content by logical boundaries
   */
  private chunkCodeContent(fileContent: z.infer<typeof FileMetadataSchema> & { content: string }): ContentChunk[] {
    const content = fileContent.content;
    const lines = content.split('\n');
    const chunks: ContentChunk[] = [];

    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkIndex = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length && chunkIndex < this.config.maxChunks; i++) {
      const line = lines[i];
      if (!line) continue;

      const lineSize = line.length + 1; // +1 for newline

      // Check if we should start a new chunk
      if (currentSize + lineSize > this.config.chunkSize && currentChunk.length > 0) {
        // Try to break at function/class boundaries
        if (this.isLogicalBreakpoint(line)) {
          this.addCodeChunk(chunks, currentChunk, startLine, i, chunkIndex, fileContent);
          currentChunk = [];
          currentSize = 0;
          startLine = i;
          chunkIndex++;
        }
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      this.addCodeChunk(chunks, currentChunk, startLine, lines.length, chunkIndex, fileContent);
    }

    return chunks;
  }

  /**
   * Add a code chunk
   */
  private addCodeChunk(
    chunks: ContentChunk[],
    lines: string[],
    startLine: number,
    endLine: number,
    chunkIndex: number,
    fileContent: z.infer<typeof FileMetadataSchema> & { content: string }
  ): void {
    const content = lines.join('\n');

    if (content.trim().length > 0) {
      const chunk: ContentChunk = {
        id: crypto.randomUUID(),
        content,
        startIndex: startLine,
        endIndex: endLine,
        chunkIndex,
        language: fileContent.language,
        semanticType: this.inferSemanticType(content),
        metadata: {
          filePath: fileContent.path,
          lineStart: startLine + 1,
          lineEnd: endLine,
          size: content.length,
        },
        keywords: this.extractKeywords(content),
      };

      chunks.push(chunk);
    }
  }

  /**
   * Check if line is a logical breakpoint
   */
  private isLogicalBreakpoint(line: string): boolean {
    const trimmed = line.trim();
    
    // Function/method definitions
    if (trimmed.match(/^(public|private|protected)?\s*(static)?\s*(async)?\s*\w+\s*\(/)) {
      return true;
    }
    
    // Class definitions
    if (trimmed.match(/^(class|struct|interface|enum)\s+\w+/)) {
      return true;
    }
    
    // Namespace definitions
    if (trimmed.match(/^namespace\s+\w+/)) {
      return true;
    }
    
    // CUDA kernels
    if (trimmed.includes('__global__') || trimmed.includes('__device__')) {
      return true;
    }
    
    return false;
  }

  // =============================================================================
  // SEMANTIC ANNOTATION (BAML Integration)
  // =============================================================================

  /**
   * Generate semantic annotation using BAML
   */
  private async generateSemanticAnnotation(
    fileContent: z.infer<typeof FileMetadataSchema> & { content: string },
    astResult?: AnalysisResult
  ): Promise<SemanticAnnotation> {
    try {
      // For now, implement a simple heuristic-based annotation
      // In a real implementation, this would use BAML API
      const annotation = this.generateHeuristicAnnotation(fileContent, astResult);

      return SemanticAnnotationSchema.parse(annotation);
    } catch (error) {
      throw new BAMLError(
        'Failed to generate semantic annotation',
        'ANNOTATION_FAILED',
        {
          filePath: fileContent.path,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Generate heuristic-based annotation
   */
  private generateHeuristicAnnotation(
    fileContent: z.infer<typeof FileMetadataSchema> & { content: string },
    astResult?: AnalysisResult
  ): SemanticAnnotation {
    const content = fileContent.content;
    const path = fileContent.path;

    // Analyze content for patterns
    const isScheduler = path.includes('scheduler') || content.includes('schedule');
    const isMemory = path.includes('memory') || content.includes('malloc') || content.includes('alloc');
    const isKernel = path.includes('.cu') || content.includes('__global__') || content.includes('__device__');
    const isBinding = path.includes('python') || content.includes('PYBIND11') || content.includes('py::');
    const isTest = path.includes('test') || content.includes('TEST(') || content.includes('EXPECT_');

    // Determine complexity
    const lineCount = content.split('\n').length;
    const complexity = lineCount > 500 ? 'high' : lineCount > 200 ? 'medium' : 'low';

    // Determine domain
    const domains: string[] = [];
    if (isScheduler) domains.push('scheduling');
    if (isMemory) domains.push('memory_management');
    if (isKernel) domains.push('gpu_computing');
    if (isBinding) domains.push('python_bindings');
    if (isTest) domains.push('testing');
    if (domains.length === 0) domains.push('general');

    // Extract keywords
    const keywords = this.extractKeywords(content);

    // Calculate metrics
    const complexity_score = astResult?.metrics.complexity || lineCount / 100;
    const maintainability = Math.max(0, 1 - (complexity_score / 10));
    const testability = isTest ? 0.9 : maintainability * 0.7;
    const technical_debt = Math.min(1, complexity_score / 20);

    // Determine performance impact
    const performance_impact = isKernel || isScheduler ? 'critical' :
                              isMemory ? 'high' :
                              isBinding ? 'normal' : 'low';

    return {
      summary: this.generateSummary(fileContent, domains),
      purpose: this.inferPurpose(fileContent, domains),
      complexity: complexity as 'low' | 'medium' | 'high',
      domain: domains,
      keywords: keywords.slice(0, 20), // Limit keywords
      dependencies: this.extractDependencies(content),
      performance_impact: performance_impact as 'critical' | 'high' | 'normal' | 'low',
      maintainability,
      testability,
      technical_debt,
    };
  }

  // =============================================================================
  // EMBEDDING GENERATION
  // =============================================================================

  /**
   * Generate embeddings using HuggingFace API
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.hfToken) {
      console.warn('⚠️ HuggingFace token not provided, skipping embedding generation');
      return texts.map(() => new Array(this.config.embeddingDimensions).fill(0));
    }

    try {
      console.log(`🔄 Generating embeddings for ${texts.length} texts...`);

      const embeddings: number[][] = [];

      // Process in batches to respect API limits
      for (let i = 0; i < texts.length; i += this.config.batchSize) {
        const batch = texts.slice(i, i + this.config.batchSize);
        const batchEmbeddings = await this.generateEmbeddingBatch(batch);
        embeddings.push(...batchEmbeddings);

        // Small delay between batches
        if (i + this.config.batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Validate each embedding with VectorEmbeddingSchema if needed
      embeddings.forEach(vector => {
        VectorEmbeddingSchema.shape.vector.parse(vector);
      });

      console.log(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      throw new EmbeddingError(
        'Failed to generate embeddings',
        this.config.embeddingModel,
        {
          textCount: texts.length,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Generate embeddings for a batch of texts
   */
  private async generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
    const response = await this.retryRequest(async () => {
      return fetch(`https://api-inference.huggingface.co/models/${this.config.embeddingModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: texts,
          options: {
            wait_for_model: true,
          },
        }),
      });
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return HuggingFaceResponseSchema.parse(data);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check if file is a code file
   */
  private isCodeFile(language: string): boolean {
    const codeLanguages = ['cpp', 'cuda', 'python', 'javascript', 'typescript', 'c', 'java'];
    return codeLanguages.includes(language.toLowerCase());
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    
    // Technical keywords
    const technicalPatterns = [
      /\b(scheduler|schedule|batch|queue|thread|async|await)\b/gi,
      /\b(memory|malloc|alloc|buffer|pool|cache|heap|stack)\b/gi,
      /\b(kernel|cuda|gpu|device|host|shared|global)\b/gi,
      /\b(tensor|matrix|vector|array|data|input|output)\b/gi,
      /\b(optimize|performance|speed|latency|throughput)\b/gi,
      /\b(error|exception|handle|check|validate|assert)\b/gi,
    ];
    
    for (const pattern of technicalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => keywords.add(match.toLowerCase()));
      }
    }
    
    return Array.from(keywords);
  }

  /**
   * Infer semantic type of content
   */
  private inferSemanticType(content: string): string {
    if (content.includes('class ') || content.includes('struct ')) {
      return 'class_definition';
    }
    if (content.includes('__global__') || content.includes('__device__')) {
      return 'cuda_kernel';
    }
    if (content.includes('def ') || content.includes('function ')) {
      return 'function_definition';
    }
    if (content.includes('#include') || content.includes('import ')) {
      return 'imports';
    }
    if (content.includes('TEST(') || content.includes('EXPECT_')) {
      return 'test_code';
    }
    
    return 'code_block';
  }

  /**
   * Generate summary for file
   */
  private generateSummary(fileContent: z.infer<typeof FileMetadataSchema> & { content: string }, domains: string[]): string {
    const fileName = fileContent.path.split('/').pop() || 'file';
    const primaryDomain = domains[0] || 'general';
    const lineCount = fileContent.content.split('\n').length;

    return `${fileName} - ${primaryDomain} implementation (${lineCount} lines)`;
  }

  /**
   * Infer purpose of file
   */
  private inferPurpose(fileContent: z.infer<typeof FileMetadataSchema> & { content: string }, domains: string[]): string {
    const path = fileContent.path;
    const content = fileContent.content;

    if (domains.includes('scheduling')) {
      return 'Manages task scheduling and execution ordering';
    }
    if (domains.includes('memory_management')) {
      return 'Handles memory allocation and management';
    }
    if (domains.includes('gpu_computing')) {
      return 'Implements GPU kernel functions and CUDA operations';
    }
    if (domains.includes('python_bindings')) {
      return 'Provides Python interface bindings';
    }
    if (domains.includes('testing')) {
      return 'Contains unit tests and validation logic';
    }

    return 'General implementation file';
  }

  /**
   * Extract dependencies from content
   */
  private extractDependencies(content: string): string[] {
    const dependencies = new Set<string>();
    
    // C++ includes
    const includeMatches = content.match(/#include\s*[<"](.*?)[>"]/g);
    if (includeMatches) {
      includeMatches.forEach(match => {
        const dep = match.replace(/#include\s*[<"]/, '').replace(/[>"].*/, '');
        dependencies.add(dep);
      });
    }
    
    // Python imports
    const importMatches = content.match(/(?:from\s+(\S+)\s+)?import\s+(\S+)/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const parts = match.split(/\s+/);
        if (parts.includes('from')) {
          const fromIndex = parts.indexOf('from') + 1;
          const fromPart = parts[fromIndex];
          if (fromPart) {
            dependencies.add(fromPart);
          }
        } else {
          const importIndex = parts.indexOf('import') + 1;
          const importPart = parts[importIndex];
          if (importPart) {
            dependencies.add(importPart);
          }
        }
      });
    }
    
    return Array.from(dependencies).slice(0, 10); // Limit dependencies
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    request: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      if (attempt >= this.config.retryAttempts) {
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️ Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(request, attempt + 1);
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create content processor with TensorRT configuration
 */
export function createTensorRTContentProcessor(
  config?: Partial<ContentProcessingConfig>
): ContentProcessor {
  // Always use centralized config as base
  return new ContentProcessor(config);
}

/**
 * Validate content processing configuration
 */
export function validateContentProcessingConfig(config: unknown): ContentProcessingConfig {
  return ContentProcessingConfigSchema.parse(config);
}