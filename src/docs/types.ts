import { z } from 'zod';

// Documentation generation types and schemas
export const DocumentationTypeSchema = z.enum([
  'api',
  'architecture',
  'patterns',
  'usage',
  'changelog',
]);

export const DocumentationFormatSchema = z.enum(['markdown', 'html', 'json', 'yaml']);

// AST node information - using simpler recursive approach
export const ASTNodeSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  startLine: z.number(),
  endLine: z.number(),
  filePath: z.string(),
  content: z.string(),
  children: z.array(z.any()).optional(), // Simplified to avoid circular reference issues
  metadata: z.record(z.any()).optional(),
});

// Function/method documentation
export const FunctionDocSchema = z.object({
  name: z.string(),
  signature: z.string(),
  description: z.string().optional(),
  parameters: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string().optional(),
      optional: z.boolean().default(false),
    })
  ),
  returnType: z.string().optional(),
  returnDescription: z.string().optional(),
  examples: z.array(z.string()).optional(),
  filePath: z.string(),
  lineNumber: z.number(),
  isExported: z.boolean().default(false),
  isAsync: z.boolean().default(false),
  complexity: z.number().optional(),
});

// Class/interface documentation
export const ClassDocSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['class', 'interface', 'type']),
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      description: z.string().optional(),
      optional: z.boolean().default(false),
      readonly: z.boolean().default(false),
    })
  ),
  methods: z.array(FunctionDocSchema),
  extends: z.string().optional(),
  implements: z.array(z.string()).optional(),
  filePath: z.string(),
  lineNumber: z.number(),
  isExported: z.boolean().default(false),
});

// Module documentation
export const ModuleDocSchema = z.object({
  name: z.string(),
  filePath: z.string(),
  description: z.string().optional(),
  exports: z.object({
    functions: z.array(FunctionDocSchema),
    classes: z.array(ClassDocSchema),
    types: z.array(z.string()),
    constants: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        value: z.string().optional(),
        description: z.string().optional(),
      })
    ),
  }),
  imports: z.array(
    z.object({
      module: z.string(),
      imports: z.array(z.string()),
      isTypeOnly: z.boolean().default(false),
    })
  ),
  dependencies: z.array(z.string()),
});

// Pattern documentation
export const PatternDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  complexity: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  pattern: z.string(),
  replacement: z.string(),
  examples: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
      description: z.string(),
    })
  ),
  relatedPatterns: z.array(z.string()).optional(),
  performance: z
    .object({
      priority: z.number(),
      batchable: z.boolean(),
    })
    .optional(),
});

// Architecture documentation
export const ArchitectureDocSchema = z.object({
  components: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['actor', 'utility', 'type', 'pattern', 'config']),
      description: z.string(),
      filePath: z.string(),
      dependencies: z.array(z.string()),
      dependents: z.array(z.string()),
      complexity: z.number().optional(),
    })
  ),
  dataFlow: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(['function_call', 'event', 'data_flow', 'inheritance']),
      description: z.string().optional(),
    })
  ),
  layers: z.array(
    z.object({
      name: z.string(),
      components: z.array(z.string()),
      description: z.string(),
    })
  ),
});

// Documentation generation request
export const DocumentationRequestSchema = z.object({
  type: DocumentationTypeSchema,
  format: DocumentationFormatSchema.default('markdown'),
  outputPath: z.string().optional(),
  includePrivate: z.boolean().default(false),
  includeTests: z.boolean().default(false),
  includeExamples: z.boolean().default(true),
  sourceFiles: z.array(z.string()).optional(), // If not provided, scan all files
  templatePath: z.string().optional(),
  options: z.record(z.any()).optional(),
});

// Documentation generation result
export const DocumentationResultSchema = z.object({
  type: DocumentationTypeSchema,
  format: DocumentationFormatSchema,
  content: z.string(),
  metadata: z.object({
    generatedAt: z.string(),
    sourceFiles: z.array(z.string()),
    totalFunctions: z.number(),
    totalClasses: z.number(),
    totalModules: z.number(),
    totalPatterns: z.number().optional(),
    generationTime: z.number(), // milliseconds
  }),
  outputPath: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

// Type exports
export type DocumentationType = z.infer<typeof DocumentationTypeSchema>;
export type DocumentationFormat = z.infer<typeof DocumentationFormatSchema>;
export type ASTNode = z.infer<typeof ASTNodeSchema>;
export type FunctionDoc = z.infer<typeof FunctionDocSchema>;
export type ClassDoc = z.infer<typeof ClassDocSchema>;
export type ModuleDoc = z.infer<typeof ModuleDocSchema>;
export type PatternDoc = z.infer<typeof PatternDocSchema>;
export type ArchitectureDoc = z.infer<typeof ArchitectureDocSchema>;
export type DocumentationRequest = z.infer<typeof DocumentationRequestSchema>;
export type DocumentationResult = z.infer<typeof DocumentationResultSchema>;

// Validation helpers
export const validateDocumentationRequest = (data: unknown): DocumentationRequest => {
  return DocumentationRequestSchema.parse(data);
};

export const validateDocumentationResult = (data: unknown): DocumentationResult => {
  return DocumentationResultSchema.parse(data);
};
