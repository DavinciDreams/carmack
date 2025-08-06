import chokidar from 'chokidar';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import { DocumentationGenerator } from '../docs/generator.ts';
import { DocumentationFormatSchema, DocumentationTypeSchema } from '../docs/types.js';

/**
 * CLI interface for the Documentation Generator
 */


// Zod schema for CLI options
export const DocCLIOptionsSchema = z.object({
  sourceDir: z.string().optional(),
  outputDir: z.string().optional(),
  formats: z.array(DocumentationFormatSchema).optional(),
  types: z.array(DocumentationTypeSchema).optional(),
  watch: z.boolean().optional(),
  verbose: z.boolean().optional(),
  help: z.boolean().optional(),
  includePrivate: z.boolean().optional(),
  includeTests: z.boolean().optional(),
});

export type DocCLIOptions = z.infer<typeof DocCLIOptionsSchema>;

// Validation helper
export const validateCLIOptions = (data: unknown): DocCLIOptions => {
  return DocCLIOptionsSchema.parse(data);
};

export class DocumentationCLI {
  async run(args: string[] = process.argv.slice(2)): Promise<void> {
    try {
      const parsed = this.parseArguments(args);

      if (parsed.help) {
        this.showHelp();
        return;
      }

      const sourceDir = parsed.sourceDir || './workspace/repository';
      const outputDir = parsed.outputDir || './workspace/generateddocs';
      const formats = (parsed.formats as string[]) || ['markdown'];

      // Validate source directory exists
      if (!existsSync(sourceDir)) {
        throw new Error(`Source directory does not exist: ${sourceDir}`);
      }

      const generator = new DocumentationGenerator();

      if (parsed.watch) {
        await this.watchMode(generator, { sourceDir, outputDir, formats });
      } else {
        await this.generateOnce(generator, { sourceDir, outputDir, formats });
      }
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      process.exit(1);
    }
  }

  private parseArguments(args: string[]): DocCLIOptions {
    const { values } = parseArgs({
      args,
      options: {
        'source-dir': { type: 'string', short: 's' },
        'output-dir': { type: 'string', short: 'o' },
        formats: { type: 'string', multiple: true, short: 'f' },
        watch: { type: 'boolean', short: 'w' },
        verbose: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
        'include-private': { type: 'boolean' },
        'include-tests': { type: 'boolean' },
      },
      allowPositionals: true, // Allow positional arguments for formats
    });

    // Parse and validate formats
    const parsedFormats = values.formats?.map((format) => {
      const result = DocumentationFormatSchema.safeParse(format);
      if (!result.success) {
        throw new Error(`Invalid format: ${format}. Must be one of: markdown, html, json, yaml`);
      }
      return result.data;
    });

    const cliOptions = {
      sourceDir: values['source-dir'],
      outputDir: values['output-dir'],
      formats: parsedFormats,
      watch: values.watch,
      verbose: values.verbose,
      help: values.help,
      includePrivate: values['include-private'],
      includeTests: values['include-tests'],
    };

    // Validate the entire options object
    return validateCLIOptions(cliOptions);
  }

  private async generateOnce(
    generator: DocumentationGenerator,
    config: { sourceDir: string; outputDir: string; formats: string[] }
  ): Promise<void> {
    console.log('🚀 Starting documentation generation...');
    const startTime = Date.now();

    const request = {
      type: 'api' as const,
      format: 'markdown' as const,
      sourceFiles: undefined,
      outputPath: config.outputDir,
      includePrivate: false,
      includeTests: false,
      includeExamples: true,
    };

    const result = await generator.generateDocumentation(request);

    const duration = Date.now() - startTime;
    console.log(`✅ Documentation generated successfully in ${duration}ms`);
    console.log(
      `   📊 ${result.metadata.totalFunctions + result.metadata.totalClasses} items from ${result.metadata.totalModules} files`
    );

    // Show breakdown by type
    console.log(`   📝 ${result.metadata.totalFunctions} functions`);
    console.log(`   📝 ${result.metadata.totalClasses} classes`);
    console.log(`   📝 ${result.metadata.totalModules} modules`);
  }

  private async watchMode(
    generator: DocumentationGenerator,
    config: { sourceDir: string; outputDir: string; formats: string[] }
  ): Promise<void> {
    console.log('👀 Starting watch mode...');
    console.log(`   📁 Watching: ${config.sourceDir}`);
    console.log(`   📝 Output: ${config.outputDir}`);

    // Initial generation
    await this.generateOnce(generator, config);

    // Set up file watcher
    const watcher = chokidar.watch(config.sourceDir, {
      ignored: /(^|[\\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    let timeout: NodeJS.Timeout | null = null;

    const triggerRegeneration = () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(async () => {
        console.log('\n🔄 Files changed, regenerating documentation...');
        try {
          await this.generateOnce(generator, config);
          console.log('✅ Documentation updated');
        } catch (error) {
          console.error('❌ Failed to regenerate documentation:', error);
        }
      }, 1000); // Debounce by 1 second
    };

    watcher
      .on('add', (path: string) => {
        console.log(`   ➕ File added: ${path}`);
        triggerRegeneration();
      })
      .on('change', (path: string) => {
        console.log(`   🔧 File changed: ${path}`);
        triggerRegeneration();
      })
      .on('unlink', (path: string) => {
        console.log(`   ➖ File removed: ${path}`);
        triggerRegeneration();
      })
      .on('error', (error: unknown) => {
        console.error('❌ Watcher error:', error);
      });

    console.log('\n📡 Watching for changes... (Press Ctrl+C to exit)');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down documentation watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  private showHelp(): void {
    console.log(`
🔥 Carmack Coder Documentation Generator

USAGE:
  carmack-docs [OPTIONS]

OPTIONS:
  -s, --source-dir <dir>     Source directory to scan (default: ./src)
  -o, --output-dir <dir>     Output directory for docs (default: ./docs)
  -f, --formats <format>     Output formats: markdown, html, json (default: markdown)
  -w, --watch                Watch for changes and regenerate automatically
  -v, --verbose              Verbose output
  -h, --help                 Show this help message

EXAMPLES:
  # Generate docs once
  carmack-docs

  # Watch for changes and regenerate automatically
  carmack-docs --watch

  # Custom source and output directories
  carmack-docs --source-dir ./src --output-dir ./documentation

  # Multiple output formats
  carmack-docs --formats markdown --formats json

  # Watch mode with custom directories
  carmack-docs --watch --source-dir ./packages --output-dir ./generated-docs

FEATURES:
  ✅ Auto-extract functions, classes, interfaces
  ✅ Parse transformation patterns from JSON
  ✅ Extract configuration schemas
  ✅ Generate markdown and JSON output
  ✅ File watching for automatic updates
  ✅ TypeScript and JavaScript support

Generated documentation includes:
  📚 API Reference - All exported functions, classes, interfaces
  🔄 Transformation Patterns - Code transformation definitions
  ⚙️ Configuration - Schema documentation
  📊 Statistics - Comprehensive project metrics
`);
  }
}

// Export for direct CLI usage
export async function runDocsCLI(args?: string[]): Promise<void> {
  const cli = new DocumentationCLI();
  await cli.run(args);
}

// If this file is run directly (works with both Bun and Node)
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/docs/cli.ts') ||
  process.argv[1]?.endsWith('\\docs\\cli.ts')
) {
  runDocsCLI().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
