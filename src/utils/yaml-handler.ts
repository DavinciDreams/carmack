import { readFile, writeFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Error types for explicit error handling
export class YamlParseError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'YamlParseError';
  }
}
export class YamlSerializationError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'YamlSerializationError';
  }
}
// Configuration schema for YAML operations
const YamlOptionsSchema = z
  .object({
    indent: z.number().int().min(1).max(8).default(2),
    lineWidth: z.number().int().min(40).max(200).default(120),
    noRefs: z.boolean().default(true),
    sortKeys: z.boolean().default(true),
    quotingType: z.enum(['"', "'"]).default('"'),
    forceQuotes: z.boolean().default(false),
  })
  .strict();
export type YamlOptions = z.infer<typeof YamlOptionsSchema>;
/**
 * Parse YAML string to JavaScript object with type safety (schema required)
 * @param yamlString - YAML content as string
 * @param schema - Zod schema for validation (required)
 * @returns Parsed and validated object
 */
export function parseYamlString<T>(yamlString: string, schema: z.ZodType<T>): T {
  try {
    const parsed = yaml.load(yamlString);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new YamlParseError(`YAML validation failed: ${error.message}`, undefined, error);
    }
    throw new YamlParseError(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error
    );
  }
}
/**
 * Parse YAML file with type safety and validation (schema required)
 * @param filePath - Path to YAML file
 * @param schema - Zod schema for validation (required)
 * @returns Parsed and validated object
 */
export async function parseYamlFile<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    return parseYamlString(fileContent, schema);
  } catch (error) {
    if (error instanceof YamlParseError) {
      throw new YamlParseError(error.message, filePath, error.originalError);
    }
    throw new YamlParseError(
      `Failed to read YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath,
      error
    );
  }
}
/**
 * Serialize object to YAML string with schema validation
 * @param data - Object to serialize
 * @param schema - Zod schema for validation (required)
 * @param options - YAML formatting options
 * @returns YAML string
 */
export function serializeToYaml<T>(
  data: T,
  schema: z.ZodType<T>,
  options: Partial<YamlOptions> = {}
): string {
  try {
    schema.parse(data); // Validate before serializing
    const validatedOptions = YamlOptionsSchema.parse(options);
    return yaml.dump(data, {
      indent: validatedOptions.indent,
      lineWidth: validatedOptions.lineWidth,
      noRefs: validatedOptions.noRefs,
      sortKeys: validatedOptions.sortKeys,
      quotingType: validatedOptions.quotingType,
      forceQuotes: validatedOptions.forceQuotes,
    });
  } catch (error) {
    throw new YamlSerializationError(
      `Failed to serialize to YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data,
      error
    );
  }
}
/**
 * Write object to YAML file with schema validation
 * @param filePath - Path to write YAML file
 * @param data - Object to serialize
 * @param schema - Zod schema for validation (required)
 * @param options - YAML formatting options
 */
export async function writeYamlFile<T>(
  filePath: string,
  data: T,
  schema: z.ZodType<T>,
  options: Partial<YamlOptions> = {}
): Promise<void> {
  try {
    const yamlContent = serializeToYaml(data, schema, options);
    await writeFile(filePath, yamlContent, 'utf-8');
  } catch (error) {
    if (error instanceof YamlSerializationError) {
      throw error;
    }
    throw new YamlSerializationError(
      `Failed to write YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data,
      error
    );
  }
}
/**
 * Validate YAML file against schema
 * @param filePath - Path to YAML file
 * @param schema - Zod schema for validation (required)
 * @returns Validation result
 */
export async function validateYamlFile<T>(
  filePath: string,
  schema: z.ZodType<T>
): Promise<{ valid: boolean; errors?: z.ZodError; data?: T }> {
  try {
    const data = await parseYamlFile(filePath, schema);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof YamlParseError && error.originalError instanceof z.ZodError) {
      return { valid: false, errors: error.originalError };
    }
    throw error;
  }
}
/**
 * Safe YAML parsing with default value fallback (schema required)
 * @param yamlString - YAML content
 * @param defaultValue - Default value if parsing fails
 * @param schema - Validation schema (required)
 * @returns Parsed value or default
 */
export function safeParseYaml<T>(yamlString: string, defaultValue: T, schema: z.ZodType<T>): T {
  try {
    return parseYamlString(yamlString, schema);
  } catch {
    return defaultValue;
  }
}
// Pre-defined schemas for common YAML configurations
export const CommonYamlSchemas = {
  // Environment configuration schema
  environment: z
    .object({
      name: z.string(),
      variables: z.record(z.string()),
      services: z.array(z.string()).optional(),
    })
    .strict(),
  // CI/CD pipeline schema
  pipeline: z
    .object({
      stages: z.array(z.string()),
      jobs: z.record(
        z.object({
          script: z.array(z.string()),
          stage: z.string().optional(),
          dependencies: z.array(z.string()).optional(),
        })
      ),
    })
    .strict(),
  // Docker Compose schema (simplified)
  dockerCompose: z
    .object({
      version: z.string(),
      services: z.record(
        z.object({
          image: z.string().optional(),
          build: z.string().optional(),
          ports: z.array(z.string()).optional(),
          environment: z.record(z.string()).optional(),
          volumes: z.array(z.string()).optional(),
        })
      ),
    })
    .strict(),
};
// Export convenience functions (schema-driven only)
export const YAML = {
  parse: parseYamlString,
  parseFile: parseYamlFile,
  serialize: serializeToYaml,
  writeFile: writeYamlFile,
  validate: validateYamlFile,
  safeParse: safeParseYaml,
  schemas: CommonYamlSchemas,
  errors: { YamlParseError, YamlSerializationError },
} as const;
