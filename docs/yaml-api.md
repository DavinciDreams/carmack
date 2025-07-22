# YAML Handling System API Documentation

## Overview

The Carmack project includes a comprehensive YAML handling system built on top of the `js-yaml` library, providing type-safe YAML parsing, serialization, and validation using Zod schemas.

## Core Components

### 1. YAML Handler (`src/utils/yaml-handler.ts`)

The core YAML processing utility providing all essential YAML operations with robust error handling and type safety.

#### Key Functions

**parseYamlString<T>(yamlString: string, schema?: ZodType<T>): T**
```typescript
import { YAML } from './utils/yaml-handler';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  version: z.string(),
});

const config = YAML.parse(`
name: "my-app"
version: "1.0.0"
`, schema);
```

**parseYamlFile<T>(filePath: string, schema?: ZodType<T>): Promise<T>**
```typescript
const config = await YAML.parseFile('./config.yml', schema);
```

**serializeToYaml(data: any, options?: YamlSerializationOptions): string**
```typescript
const yamlString = YAML.serialize({
  name: "my-app",
  dependencies: ["lodash", "express"]
}, {
  indent: 4,
  lineWidth: 120,
  quotingType: '"'
});
```

**writeYamlFile(filePath: string, data: any, options?: YamlSerializationOptions): Promise<void>**
```typescript
await YAML.writeFile('./output.yml', config, {
  sortKeys: true,
  indent: 2
});
```

**validateYamlFile<T>(filePath: string, schema: ZodType<T>): Promise<ValidationResult<T>>**
```typescript
const result = await YAML.validate('./config.yml', schema);
if (result.valid) {
  console.log('Valid config:', result.data);
} else {
  console.log('Validation errors:', result.errors?.errors);
}
```

**safeParseYaml<T>(yamlString: string, defaultValue: T, schema?: ZodType<T>): T**
```typescript
// Returns defaultValue if parsing fails
const config = YAML.safeParse(yamlContent, { name: 'default', version: '0.0.0' }, schema);
```

### 2. Configuration Validators (`src/utils/config-validators.ts`)

Specialized validators for common project configuration files using pre-defined schemas.

#### Supported Configuration Types

**Lefthook Configuration**
```typescript
import { ConfigValidator } from './utils/config-validators';

const result = await ConfigValidator.validateLefthook('./lefthook.yml');
if (result.valid) {
  console.log('Lefthook config is valid:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

**Docker Compose Configuration**
```typescript
const result = await ConfigValidator.validateDockerCompose('./docker-compose.yml');
```

**Prometheus Configuration**
```typescript
const result = await ConfigValidator.validatePrometheus('./monitoring/prometheus.yml');
```

**GitHub Actions Workflow**
```typescript
const result = await ConfigValidator.validateGitHubWorkflow('./.github/workflows/ci.yml');
```

### 3. Error Handling

The system provides specialized error classes for different types of failures:

**YamlParseError**
- Thrown when YAML syntax is invalid
- Thrown when schema validation fails
- Contains original error context and detailed messages

**YamlSerializationError**
- Thrown when object cannot be serialized to YAML
- Contains the original data that failed serialization

```typescript
try {
  const data = await YAML.parseFile('./config.yml', schema);
} catch (error) {
  if (error instanceof YAML.errors.YamlParseError) {
    console.log('Parse error:', error.message);
    console.log('Original error:', error.originalError);
    console.log('File path:', error.filePath);
  }
}
```

## Type Safety

All functions support TypeScript generics for full type safety:

```typescript
interface AppConfig {
  name: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
  };
}

const configSchema = z.object({
  name: z.string(),
  port: z.number(),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
  }),
});

// Fully typed result
const config: AppConfig = await YAML.parseFile<AppConfig>('./app.yml', configSchema);
```

## Common Schemas

The system includes pre-built schemas for common use cases:

```typescript
import { YAML } from './utils/yaml-handler';

// Environment configuration
const envConfig = YAML.safeParse(envYaml, {}, YAML.schemas.environment);

// CI/CD pipeline configuration
const pipelineConfig = YAML.safeParse(pipelineYaml, {}, YAML.schemas.pipeline);
```

## Serialization Options

Control YAML output formatting:

```typescript
const options = {
  indent: 4,                    // Indentation spaces
  lineWidth: 120,              // Maximum line width
  quotingType: '"' as const,   // Quote style: '"', "'", or undefined
  sortKeys: true,              // Sort object keys alphabetically
  skipInvalid: false,          // Skip invalid values instead of throwing
  flowLevel: 2,                // Use flow style for nested levels
  styles: {                    // Custom styles for specific paths
    'database.password': 'literal'
  }
};

const yaml = YAML.serialize(config, options);
```

## Validation Results

All validation functions return a consistent result structure:

```typescript
interface ValidationResult<T> {
  valid: boolean;
  errors?: string[];          // Human-readable error messages
  data?: T;                   // Parsed and validated data (if valid)
}
```

## Best Practices

### 1. Always Use Schema Validation
```typescript
// Good
const config = await YAML.parseFile('./config.yml', configSchema);

// Avoid - no validation
const config = await YAML.parseFile('./config.yml');
```

### 2. Handle Errors Gracefully
```typescript
try {
  const config = await YAML.parseFile('./config.yml', schema);
  return config;
} catch (error) {
  if (error instanceof YAML.errors.YamlParseError) {
    console.error('Configuration error:', error.message);
    process.exit(1);
  }
  throw error; // Re-throw unexpected errors
}
```

### 3. Use Safe Parsing for Optional Configs
```typescript
// For optional configuration files
const optionalConfig = YAML.safeParse(
  await fs.readFile('./optional-config.yml', 'utf-8').catch(() => '{}'),
  { /* defaults */ },
  schema
);
```

### 4. Validate Configuration Files in Tests
```typescript
import { describe, it, expect } from 'bun:test';
import { ConfigValidator } from '../src/utils/config-validators';

describe('Configuration Files', () => {
  it('should have valid lefthook configuration', async () => {
    const result = await ConfigValidator.validateLefthook();
    expect(result.valid).toBe(true);
  });
  
  it('should have valid docker-compose configuration', async () => {
    const result = await ConfigValidator.validateDockerCompose();
    expect(result.valid).toBe(true);
  });
});
```

## Migration from Custom YAML Handling

If migrating from custom YAML string manipulation:

```typescript
// Old approach (error-prone)
const yamlString = JSON.stringify(obj).replace(/"/g, '').replace(/,/g, '\n');

// New approach (robust)
const yamlString = YAML.serialize(obj, {
  quotingType: undefined,  // No quotes for simple values
  sortKeys: true
});
```

## Performance Considerations

- **Caching**: Consider caching parsed configuration files for frequently accessed configs
- **Streaming**: For large files, consider streaming approaches for better memory usage
- **Validation**: Schema validation adds overhead but prevents runtime errors

## Testing

The system includes comprehensive test suites:
- `test/utils/yaml-handler.test.ts`: Core YAML functionality (24 tests)
- `test/utils/config-validators.test.ts`: Configuration validation (7 tests)

Run tests with:
```bash
bun test test/utils/yaml-handler.test.ts test/utils/config-validators.test.ts
```

## Dependencies

- **js-yaml**: ^4.1.0 - Professional YAML parser
- **zod**: Used for schema validation and type safety
- **@types/js-yaml**: TypeScript definitions

## License

Part of the Carmack project - see main project license.
