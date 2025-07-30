/**
 * Database Seeding and Testing Utilities for TensorRT-LLM Knowledge Graph
 *
 * Provides utilities for seeding the database with test data, creating fixtures,
 * and validating database operations. Follows Carmack's principles of provable
 * correctness and comprehensive testing.
 */

import { z } from 'zod';
import { getDatabaseManager } from './connection.ts';
import { getDatabaseOperations } from './operations.ts';
import {
  type CreateArtifactInput,
  type CreateGraphEdgeInput,
  ArtifactTypeSchema,
  RelationTypeSchema,
  PerformanceImpactSchema,
} from './schema.ts';

// =============================================================================
// SEEDING CONFIGURATION
// =============================================================================

/**
 * Seeding configuration schema
 */
export const SeedingConfigSchema = z.object({
  clearExistingData: z.boolean().default(false),
  seedArtifacts: z.number().int().min(0).default(100),
  seedEdges: z.number().int().min(0).default(200),
  generateEmbeddings: z.boolean().default(false),
  repositoryUrl: z.string().default('https://github.com/NVIDIA/TensorRT'),
  randomSeed: z.number().int().optional(),
});

export type SeedingConfig = z.infer<typeof SeedingConfigSchema>;

/**
 * Seeding result schema
 */
export const SeedingResultSchema = z.object({
  success: z.boolean(),
  artifactsCreated: z.number().int().min(0),
  edgesCreated: z.number().int().min(0),
  executionTime: z.number().int().min(0),
  errors: z.array(z.string()).default([]),
});

export type SeedingResult = z.infer<typeof SeedingResultSchema>;

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

export class TestDataGenerator {
  private config: SeedingConfig;
  private random: () => number;

  constructor(config: SeedingConfig) {
    this.config = config;
    
    // Use seeded random for reproducible test data
    if (config.randomSeed !== undefined) {
      let seed = config.randomSeed;
      this.random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    } else {
      this.random = Math.random;
    }
  }

  /**
   * Generate random artifact
   */
  generateArtifact(index: number): CreateArtifactInput {
    const types = ArtifactTypeSchema.options;
    const impacts = PerformanceImpactSchema.options;
    const languages = ['cpp', 'cuda', 'python', 'c', 'cmake'];
    
    const type = types[Math.floor(this.random() * types.length)] as typeof types[number];
    const language = languages[Math.floor(this.random() * languages.length)] as string;
    const impact = impacts[Math.floor(this.random() * impacts.length)] as typeof impacts[number];
    
    const names = this.getNamesByType(type);
    const name = names[Math.floor(this.random() * names.length)] as string;
    
    return {
      type,
      name: `${name}_${index}`,
      description: this.generateDescription(type, name),
      content: this.generateContent(type, language),
      file_path: this.generateFilePath(type, language, name, index),
      line_start: type === 'code_line' ? Math.floor(this.random() * 1000) + 1 : undefined,
      line_end: type === 'code_line' ? Math.floor(this.random() * 50) + 1 : undefined,
      language,
      repository_url: this.config.repositoryUrl,
      commit_hash: this.generateCommitHash(),
      author_name: this.generateAuthorName(),
      author_email: this.generateAuthorEmail(),
      created_date: this.generateDate(),
      modified_date: this.generateDate(),
      embedding: this.config.generateEmbeddings ? this.generateEmbedding() : undefined,
      metadata: this.generateMetadata(type),
      complexity_score: this.random() * 10,
      performance_impact: impact,
      quality_score: this.random(),
    };
  }

  /**
   * Generate random graph edge
   */
  generateGraphEdge(sourceId: string, targetId: string): CreateGraphEdgeInput {
    const relationTypes = RelationTypeSchema.options;
    const relationType = relationTypes[Math.floor(this.random() * relationTypes.length)] as typeof relationTypes[number];
    
    return {
      source_id: sourceId,
      target_id: targetId,
      relation_type: relationType,
      confidence: 0.5 + this.random() * 0.5, // 0.5 to 1.0
      weight: this.random() * 2, // 0 to 2
      is_bidirectional: this.random() > 0.7,
      metadata: {
        generated: true,
        algorithm: 'test_generator',
        timestamp: new Date().toISOString(),
      },
      evidence: this.generateEvidence(relationType),
      evidence_type: this.random() > 0.5 ? 'inferred' : 'explicit',
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getNamesByType(type: string): string[] {
    const nameMap: Record<string, string[]> = {
      function: ['processData', 'calculateMetrics', 'optimizeKernel', 'validateInput', 'transformTensor'],
      class: ['TensorProcessor', 'KernelOptimizer', 'DataValidator', 'MetricsCalculator', 'TensorTransform'],
      file: ['tensor_ops', 'kernel_utils', 'data_processor', 'metrics', 'optimizer'],
      module: ['core', 'utils', 'kernels', 'optimizations', 'transforms'],
      test: ['test_tensor_ops', 'test_kernels', 'test_optimizer', 'test_metrics', 'test_transforms'],
      documentation: ['README', 'API_GUIDE', 'TUTORIAL', 'EXAMPLES', 'CHANGELOG'],
      config: ['config', 'settings', 'parameters', 'options', 'preferences'],
      build_script: ['CMakeLists', 'Makefile', 'build', 'setup', 'install'],
      commit: ['feat', 'fix', 'docs', 'style', 'refactor'],
      issue: ['bug', 'feature', 'enhancement', 'question', 'documentation'],
      pr: ['feature', 'bugfix', 'hotfix', 'docs', 'refactor'],
      code_line: ['declaration', 'assignment', 'function_call', 'return_statement', 'loop'],
    };
    
    return nameMap[type] || ['generic_item'];
  }

  private generateDescription(type: string, name: string): string {
    const templates: Record<string, string[]> = {
      function: [
        `Implements ${name} functionality for tensor operations`,
        `Optimized ${name} function for CUDA kernels`,
        `Core ${name} implementation with error handling`,
      ],
      class: [
        `${name} class for managing tensor operations`,
        `High-performance ${name} implementation`,
        `Thread-safe ${name} with memory optimization`,
      ],
      file: [
        `Source file containing ${name} implementations`,
        `Header file with ${name} declarations`,
        `Implementation file for ${name} module`,
      ],
    };
    
    const typeTemplates = templates[type] || [`Generated ${type} for ${name}`];
    return typeTemplates[Math.floor(this.random() * typeTemplates.length)] as string;
  }

  private generateContent(type: string, language: string): string {
    const contentTemplates: Record<string, Record<string, string[]>> = {
      function: {
        cpp: [
          'template<typename T>\nvoid processData(const T* input, T* output, size_t size) {\n    // Implementation\n}',
          'inline float calculateMetrics(const float* data, int length) {\n    return std::accumulate(data, data + length, 0.0f);\n}',
        ],
        cuda: [
          '__global__ void kernelFunction(float* data, int size) {\n    int idx = blockIdx.x * blockDim.x + threadIdx.x;\n    if (idx < size) data[idx] *= 2.0f;\n}',
          '__device__ float deviceFunction(float x, float y) {\n    return fmaxf(x, y);\n}',
        ],
        python: [
          'def process_tensor(tensor: torch.Tensor) -> torch.Tensor:\n    """Process tensor with optimizations."""\n    return tensor.contiguous()',
          'class TensorProcessor:\n    def __init__(self):\n        self.device = torch.device("cuda")\n',
        ],
      },
    };
    
    const langTemplates = contentTemplates[type]?.[language] || ['// Generated content'];
    return langTemplates[Math.floor(this.random() * langTemplates.length)] as string;
  }

  private generateFilePath(type: string, language: string, name: string, index: number): string {
    const extensions: Record<string, string> = {
      cpp: '.cpp',
      cuda: '.cu',
      python: '.py',
      c: '.c',
      cmake: '.cmake',
    };
    
    const ext = extensions[language] || '.txt';
    const basePath = type === 'test' ? 'tests/' : 'src/';
    
    return `${basePath}${name}_${index}${ext}`;
  }

  private generateCommitHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 40; i++) {
      hash += chars[Math.floor(this.random() * chars.length)];
    }
    return hash;
  }

  private generateAuthorName(): string {
    const names = [
      'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
      'Eva Brown', 'Frank Miller', 'Grace Lee', 'Henry Taylor',
    ];
    return names[Math.floor(this.random() * names.length)] as string;
  }

  private generateAuthorEmail(): string {
    const domains = ['nvidia.com', 'example.com', 'test.org'];
    const name = this.generateAuthorName().toLowerCase().replace(' ', '.');
    const domain = domains[Math.floor(this.random() * domains.length)];
    return `${name}@${domain}`;
  }

  private generateDate(): Date {
    const now = Date.now();
    const yearAgo = now - (365 * 24 * 60 * 60 * 1000);
    return new Date(yearAgo + this.random() * (now - yearAgo));
  }

  private generateEmbedding(): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 384; i++) {
      embedding.push((this.random() - 0.5) * 2); // -1 to 1
    }
    return embedding;
  }

  private generateMetadata(type: string): Record<string, unknown> {
    return {
      generated: true,
      type,
      timestamp: new Date().toISOString(),
      test_data: true,
      complexity: Math.floor(this.random() * 10) + 1,
      tags: this.generateTags(type),
    };
  }

  private generateTags(type: string): string[] {
    const tagMap: Record<string, string[]> = {
      function: ['performance', 'optimization', 'cuda', 'tensor'],
      class: ['object-oriented', 'template', 'memory-management'],
      file: ['source', 'header', 'implementation'],
      test: ['unit-test', 'integration', 'validation'],
    };
    
    const baseTags = tagMap[type] || ['general'];
    const numTags = Math.floor(this.random() * 3) + 1;
    
    return baseTags.slice(0, numTags);
  }

  private generateEvidence(relationType: string): string {
    const evidenceMap: Record<string, string[]> = {
      calls: ['Function call found in source code', 'Direct invocation detected'],
      inherits: ['Class inheritance relationship', 'Extends base class'],
      implements: ['Interface implementation', 'Implements abstract methods'],
      uses: ['Dependency detected', 'Imports or includes found'],
      references: ['Reference found in documentation', 'Mentioned in comments'],
    };
    
    const evidenceList = evidenceMap[relationType] || ['Relationship detected'];
    return evidenceList[Math.floor(this.random() * evidenceList.length)] as string;
  }
}

// =============================================================================
// DATABASE SEEDER
// =============================================================================

export class DatabaseSeeder {
  private db = getDatabaseManager();
  private ops = getDatabaseOperations();
  private generator: TestDataGenerator;

  constructor(private config: SeedingConfig) {
    this.generator = new TestDataGenerator(config);
  }

  /**
   * Seed the database with test data
   */
  async seed(): Promise<SeedingResult> {
    const startTime = Date.now();
    const result: SeedingResult = {
      success: false,
      artifactsCreated: 0,
      edgesCreated: 0,
      executionTime: 0,
      errors: [],
    };

    try {
      console.log('🌱 Starting database seeding...');

      // Clear existing data if requested
      if (this.config.clearExistingData) {
        await this.clearData();
        console.log('🗑️ Existing data cleared');
      }

      // Seed artifacts
      if (this.config.seedArtifacts > 0) {
        result.artifactsCreated = await this.seedArtifacts();
        console.log(`✅ Created ${result.artifactsCreated} artifacts`);
      }

      // Seed graph edges (requires artifacts)
      if (this.config.seedEdges > 0 && result.artifactsCreated > 0) {
        result.edgesCreated = await this.seedGraphEdges();
        console.log(`✅ Created ${result.edgesCreated} graph edges`);
      }

      result.success = true;
      result.executionTime = Date.now() - startTime;

      console.log(`🌱 Database seeding completed successfully in ${result.executionTime}ms`);

      return result;
    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));

      console.error('❌ Database seeding failed:', error);

      return result;
    }
  }

  /**
   * Clear all test data
   */
  async clearData(): Promise<void> {
    const tables = [
      'query_logs',
      'intermediates',
      'query_sessions',
      'artifact_domains',
      'artifact_keywords',
      'cst_nodes',
      'graph_edges',
      'artifacts',
      'prs',
      'commits',
    ];

    for (const table of tables) {
      await this.db.query(`DELETE FROM ${table} WHERE metadata->>'generated' = 'true'`);
    }
  }

  /**
   * Seed artifacts
   */
  private async seedArtifacts(): Promise<number> {
    const artifacts: CreateArtifactInput[] = [];
    
    for (let i = 0; i < this.config.seedArtifacts; i++) {
      artifacts.push(this.generator.generateArtifact(i));
    }

    const created = await this.ops.artifacts.batchCreate(artifacts);
    return created.length;
  }

  /**
   * Seed graph edges
   */
  private async seedGraphEdges(): Promise<number> {
    // Get existing artifacts to create edges between them
    const artifacts = await this.ops.artifacts.search({}, this.config.seedArtifacts);
    
    if (artifacts.length < 2) {
      return 0;
    }

    const edges: CreateGraphEdgeInput[] = [];
    
    for (let i = 0; i < this.config.seedEdges; i++) {
      const sourceIndex = Math.floor(Math.random() * artifacts.length);
      let targetIndex = Math.floor(Math.random() * artifacts.length);
      
      // Ensure source and target are different
      while (targetIndex === sourceIndex) {
        targetIndex = Math.floor(Math.random() * artifacts.length);
      }
      
      const sourceArtifact = artifacts[sourceIndex];
      const targetArtifact = artifacts[targetIndex];
      
      if (sourceArtifact && targetArtifact) {
        const edge = this.generator.generateGraphEdge(
          sourceArtifact.id,
          targetArtifact.id
        );
        
        edges.push(edge);
      }
    }

    // Create edges in batches
    let created = 0;
    
    for (const edge of edges) {
      try {
        await this.ops.edges.create(edge);
        created++;
      } catch (error) {
        // Skip duplicate edges
        console.warn(`Skipped edge creation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return created;
  }
}

// =============================================================================
// SINGLETON INSTANCE AND UTILITIES
// =============================================================================

let _databaseSeeder: DatabaseSeeder | null = null;

/**
 * Get the global database seeder instance
 */
export function getDatabaseSeeder(config?: SeedingConfig): DatabaseSeeder {
  if (!_databaseSeeder || config) {
    _databaseSeeder = new DatabaseSeeder(config || SeedingConfigSchema.parse({}));
  }
  return _databaseSeeder;
}

/**
 * Convenience function to seed the database
 */
export async function seedDatabase(config?: Partial<SeedingConfig>): Promise<SeedingResult> {
  const validatedConfig = SeedingConfigSchema.parse(config || {});
  const seeder = getDatabaseSeeder(validatedConfig);
  return seeder.seed();
}

/**
 * Convenience function to clear test data
 */
export async function clearTestData(): Promise<void> {
  const seeder = getDatabaseSeeder();
  await seeder.clearData();
}

/**
 * Create a test database fixture
 */
export async function createTestFixture(name: string, config?: Partial<SeedingConfig>): Promise<SeedingResult> {
  console.log(`🔧 Creating test fixture: ${name}`);
  
  const fixtureConfig = SeedingConfigSchema.parse({
    clearExistingData: true,
    seedArtifacts: 50,
    seedEdges: 100,
    generateEmbeddings: false,
    randomSeed: 12345, // Fixed seed for reproducible tests
    ...config,
  });
  
  return seedDatabase(fixtureConfig);
}

/**
 * Validate database schema and data integrity
 */
export async function validateDatabaseIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
  const db = getDatabaseManager();
  const errors: string[] = [];
  
  try {
    // Check for orphaned edges
    const orphanedEdges = await db.query(`
      SELECT COUNT(*) as count FROM graph_edges ge
      WHERE NOT EXISTS (SELECT 1 FROM artifacts a WHERE a.id = ge.source_id)
         OR NOT EXISTS (SELECT 1 FROM artifacts a WHERE a.id = ge.target_id)
    `);
    
    if (orphanedEdges.rows[0]?.count > 0) {
      errors.push(`Found ${orphanedEdges.rows[0].count} orphaned graph edges`);
    }
    
    // Check for invalid embeddings
    const invalidEmbeddings = await db.query(`
      SELECT COUNT(*) as count FROM artifacts 
      WHERE embedding IS NOT NULL 
      AND array_length(embedding::float[], 1) != 384
    `);
    
    if (invalidEmbeddings.rows[0]?.count > 0) {
      errors.push(`Found ${invalidEmbeddings.rows[0].count} artifacts with invalid embeddings`);
    }
    
    // Check for missing required fields
    const missingNames = await db.query(`
      SELECT COUNT(*) as count FROM artifacts WHERE name IS NULL OR name = ''
    `);
    
    if (missingNames.rows[0]?.count > 0) {
      errors.push(`Found ${missingNames.rows[0].count} artifacts with missing names`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Database integrity check failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}