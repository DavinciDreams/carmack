/**
 * Carmack Coder Documentation System
 * 
 * Automatic documentation generation that stays in sync with code changes.
 */

export { DocumentationGenerator, type DocConfig, type DocumentationItem, type GeneratedDocumentation } from './generator.js';
export { DocumentationCLI, type DocCLIOptions, runDocsCLI } from './cli.js';

// Default export for convenience
import { DocumentationGenerator } from './generator.js';
export default DocumentationGenerator;
