import { z } from 'zod';

/**
 * Language Detection System for Multi-Language Code Transformation
 * 
 * This module provides comprehensive language detection based on file extensions
 * and content analysis, with full Zod schema validation for type safety.
 */

// Zod schema for language mapping
export const LanguageMappingSchema = z.object({
  extension: z.string(),
  language: z.string(),
  aliases: z.array(z.string()).default([]),
  framework: z.string().optional(),
  category: z.enum(['programming', 'markup', 'config', 'data']).default('programming'),
});

export type LanguageMapping = z.infer<typeof LanguageMappingSchema>;

// Comprehensive file extension to language mapping
export const FILE_EXTENSION_MAP: Record<string, LanguageMapping> = {
  // Python
  '.py': { extension: '.py', language: 'python', aliases: ['py', 'python3'], category: 'programming' },
  '.pyx': { extension: '.pyx', language: 'python', aliases: ['cython'], category: 'programming' },
  '.pyi': { extension: '.pyi', language: 'python', aliases: ['python-stub'], category: 'programming' },

  // JavaScript/TypeScript
  '.js': { extension: '.js', language: 'javascript', aliases: ['js', 'node'], category: 'programming' },
  '.jsx': { extension: '.jsx', language: 'javascript', aliases: ['react'], framework: 'React', category: 'programming' },
  '.ts': { extension: '.ts', language: 'typescript', aliases: ['ts'], category: 'programming' },
  '.tsx': { extension: '.tsx', language: 'typescript', aliases: ['react-ts'], framework: 'React', category: 'programming' },
  '.mjs': { extension: '.mjs', language: 'javascript', aliases: ['module-js'], category: 'programming' },
  '.cjs': { extension: '.cjs', language: 'javascript', aliases: ['commonjs'], category: 'programming' },

  // C/C++
  '.c': { extension: '.c', language: 'c', aliases: ['c'], category: 'programming' },
  '.h': { extension: '.h', language: 'c', aliases: ['c-header'], category: 'programming' },
  '.cpp': { extension: '.cpp', language: 'cpp', aliases: ['c++', 'cxx'], category: 'programming' },
  '.cxx': { extension: '.cxx', language: 'cpp', aliases: ['c++'], category: 'programming' },
  '.cc': { extension: '.cc', language: 'cpp', aliases: ['c++'], category: 'programming' },
  '.c++': { extension: '.c++', language: 'cpp', aliases: ['cpp'], category: 'programming' },
  '.hpp': { extension: '.hpp', language: 'cpp', aliases: ['c++-header'], category: 'programming' },
  '.hxx': { extension: '.hxx', language: 'cpp', aliases: ['c++-header'], category: 'programming' },
  '.h++': { extension: '.h++', language: 'cpp', aliases: ['c++-header'], category: 'programming' },

  // CUDA
  '.cu': { extension: '.cu', language: 'cuda', aliases: ['cuda'], framework: 'CUDA', category: 'programming' },
  '.cuh': { extension: '.cuh', language: 'cuda', aliases: ['cuda-header'], framework: 'CUDA', category: 'programming' },

  // Java
  '.java': { extension: '.java', language: 'java', aliases: ['java'], category: 'programming' },

  // C#
  '.cs': { extension: '.cs', language: 'csharp', aliases: ['c#', 'dotnet'], category: 'programming' },

  // Go
  '.go': { extension: '.go', language: 'go', aliases: ['golang'], category: 'programming' },

  // Rust
  '.rs': { extension: '.rs', language: 'rust', aliases: ['rust'], category: 'programming' },

  // Swift
  '.swift': { extension: '.swift', language: 'swift', aliases: ['swift'], category: 'programming' },

  // Kotlin
  '.kt': { extension: '.kt', language: 'kotlin', aliases: ['kotlin'], category: 'programming' },
  '.kts': { extension: '.kts', language: 'kotlin', aliases: ['kotlin-script'], category: 'programming' },

  // Shell/Bash
  '.sh': { extension: '.sh', language: 'shell', aliases: ['bash', 'sh'], category: 'programming' },
  '.bash': { extension: '.bash', language: 'shell', aliases: ['bash'], category: 'programming' },
  '.zsh': { extension: '.zsh', language: 'shell', aliases: ['zsh'], category: 'programming' },

  // PowerShell
  '.ps1': { extension: '.ps1', language: 'powershell', aliases: ['pwsh'], category: 'programming' },
  '.psm1': { extension: '.psm1', language: 'powershell', aliases: ['powershell-module'], category: 'programming' },

  // Web Technologies
  '.html': { extension: '.html', language: 'html', aliases: ['html5'], category: 'markup' },
  '.htm': { extension: '.htm', language: 'html', aliases: ['html'], category: 'markup' },
  '.css': { extension: '.css', language: 'css', aliases: ['css3'], category: 'markup' },
  '.scss': { extension: '.scss', language: 'scss', aliases: ['sass'], category: 'markup' },
  '.sass': { extension: '.sass', language: 'sass', aliases: ['scss'], category: 'markup' },
  '.less': { extension: '.less', language: 'less', aliases: ['less'], category: 'markup' },

  // Configuration Files
  '.json': { extension: '.json', language: 'json', aliases: ['json'], category: 'data' },
  '.yaml': { extension: '.yaml', language: 'yaml', aliases: ['yml'], category: 'config' },
  '.yml': { extension: '.yml', language: 'yaml', aliases: ['yaml'], category: 'config' },
  '.toml': { extension: '.toml', language: 'toml', aliases: ['toml'], category: 'config' },
  '.xml': { extension: '.xml', language: 'xml', aliases: ['xml'], category: 'markup' },

  // Markdown
  '.md': { extension: '.md', language: 'markdown', aliases: ['markdown'], category: 'markup' },
  '.markdown': { extension: '.markdown', language: 'markdown', aliases: ['md'], category: 'markup' },

  // SQL
  '.sql': { extension: '.sql', language: 'sql', aliases: ['sql'], category: 'programming' },

  // R
  '.r': { extension: '.r', language: 'r', aliases: ['r'], category: 'programming' },
  '.R': { extension: '.R', language: 'r', aliases: ['r'], category: 'programming' },

  // MATLAB
  '.m': { extension: '.m', language: 'matlab', aliases: ['matlab'], category: 'programming' },

  // Lua
  '.lua': { extension: '.lua', language: 'lua', aliases: ['lua'], category: 'programming' },

  // PHP
  '.php': { extension: '.php', language: 'php', aliases: ['php'], category: 'programming' },

  // Ruby
  '.rb': { extension: '.rb', language: 'ruby', aliases: ['ruby'], category: 'programming' },

  // Perl
  '.pl': { extension: '.pl', language: 'perl', aliases: ['perl'], category: 'programming' },
  '.pm': { extension: '.pm', language: 'perl', aliases: ['perl-module'], category: 'programming' },

  // Haskell
  '.hs': { extension: '.hs', language: 'haskell', aliases: ['haskell'], category: 'programming' },

  // Scala
  '.scala': { extension: '.scala', language: 'scala', aliases: ['scala'], category: 'programming' },

  // Clojure
  '.clj': { extension: '.clj', language: 'clojure', aliases: ['clojure'], category: 'programming' },

  // Erlang/Elixir
  '.erl': { extension: '.erl', language: 'erlang', aliases: ['erlang'], category: 'programming' },
  '.ex': { extension: '.ex', language: 'elixir', aliases: ['elixir'], category: 'programming' },
  '.exs': { extension: '.exs', language: 'elixir', aliases: ['elixir-script'], category: 'programming' },

  // Dart
  '.dart': { extension: '.dart', language: 'dart', aliases: ['dart'], category: 'programming' },

  // Assembly
  '.asm': { extension: '.asm', language: 'assembly', aliases: ['asm'], category: 'programming' },
  '.s': { extension: '.s', language: 'assembly', aliases: ['asm'], category: 'programming' },

  // Fortran
  '.f': { extension: '.f', language: 'fortran', aliases: ['fortran'], category: 'programming' },
  '.f90': { extension: '.f90', language: 'fortran', aliases: ['fortran90'], category: 'programming' },
  '.f95': { extension: '.f95', language: 'fortran', aliases: ['fortran95'], category: 'programming' },

  // COBOL
  '.cob': { extension: '.cob', language: 'cobol', aliases: ['cobol'], category: 'programming' },
  '.cbl': { extension: '.cbl', language: 'cobol', aliases: ['cobol'], category: 'programming' },
};

// Zod schema for language detection request
export const LanguageDetectionRequestSchema = z.object({
  filePath: z.string().min(1),
  content: z.string().optional(),
  strictMode: z.boolean().default(true),
});

export type LanguageDetectionRequest = z.infer<typeof LanguageDetectionRequestSchema>;

// Zod schema for language detection result
export const LanguageDetectionResultSchema = z.object({
  language: z.string(),
  confidence: z.number().min(0).max(1),
  extension: z.string(),
  aliases: z.array(z.string()),
  framework: z.string().optional(),
  category: z.enum(['programming', 'markup', 'config', 'data']),
  detectionMethod: z.enum(['extension', 'content', 'heuristic']),
});

export type LanguageDetectionResult = z.infer<typeof LanguageDetectionResultSchema>;

/**
 * Detect programming language from file path
 */
export function detectLanguageFromFile(filePath: string): string {
  const request = LanguageDetectionRequestSchema.parse({ filePath });
  const result = detectLanguageFromFileDetailed(request.filePath);
  return result.language;
}

/**
 * Detect programming language with detailed information
 */
export function detectLanguageFromFileDetailed(filePath: string): LanguageDetectionResult {
  const request = LanguageDetectionRequestSchema.parse({ filePath });
  
  // Extract file extension
  const extension = getFileExtension(request.filePath);
  
  // Look up in mapping
  const mapping = FILE_EXTENSION_MAP[extension];
  
  if (mapping) {
    const result: LanguageDetectionResult = {
      language: mapping.language,
      confidence: 1.0,
      extension: mapping.extension,
      aliases: mapping.aliases,
      framework: mapping.framework,
      category: mapping.category,
      detectionMethod: 'extension',
    };
    
    return LanguageDetectionResultSchema.parse(result);
  }
  
  // Fallback for unknown extensions
  const fallbackResult: LanguageDetectionResult = {
    language: 'unknown',
    confidence: 0.0,
    extension,
    aliases: [],
    category: 'programming',
    detectionMethod: 'heuristic',
  };
  
  return LanguageDetectionResultSchema.parse(fallbackResult);
}

/**
 * Get file extension from file path
 */
export function getFileExtension(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
    return '';
  }
  return filePath.substring(lastDotIndex).toLowerCase();
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  const languages = new Set<string>();
  Object.values(FILE_EXTENSION_MAP).forEach(mapping => {
    languages.add(mapping.language);
  });
  return Array.from(languages).sort();
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(FILE_EXTENSION_MAP).sort();
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return getSupportedLanguages().includes(language.toLowerCase());
}

/**
 * Check if a file extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  return extension.toLowerCase() in FILE_EXTENSION_MAP;
}

/**
 * Get language mapping for a specific extension
 */
export function getLanguageMapping(extension: string): LanguageMapping | undefined {
  const mapping = FILE_EXTENSION_MAP[extension.toLowerCase()];
  return mapping ? LanguageMappingSchema.parse(mapping) : undefined;
}

/**
 * Get all extensions for a specific language
 */
export function getExtensionsForLanguage(language: string): string[] {
  const extensions: string[] = [];
  Object.entries(FILE_EXTENSION_MAP).forEach(([ext, mapping]) => {
    if (mapping.language.toLowerCase() === language.toLowerCase()) {
      extensions.push(ext);
    }
  });
  return extensions.sort();
}

/**
 * Detect languages from multiple files
 */
export function detectLanguagesFromFiles(filePaths: string[]): Map<string, string> {
  const languageMap = new Map<string, string>();
  
  filePaths.forEach(filePath => {
    try {
      const language = detectLanguageFromFile(filePath);
      languageMap.set(filePath, language);
    } catch (error) {
      console.warn(`Failed to detect language for ${filePath}:`, error);
      languageMap.set(filePath, 'unknown');
    }
  });
  
  return languageMap;
}

/**
 * Get language distribution from file paths
 */
export function getLanguageDistribution(filePaths: string[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  filePaths.forEach(filePath => {
    try {
      const language = detectLanguageFromFile(filePath);
      distribution[language] = (distribution[language] || 0) + 1;
    } catch (error) {
      console.warn(`Failed to detect language for ${filePath}:`, error);
      distribution['unknown'] = (distribution['unknown'] || 0) + 1;
    }
  });
  
  return distribution;
}

/**
 * Validate language detection configuration
 */
export function validateLanguageDetectionConfig(): boolean {
  try {
    // Validate all mappings
    Object.entries(FILE_EXTENSION_MAP).forEach(([extension, mapping]) => {
      LanguageMappingSchema.parse(mapping);
      
      // Ensure extension matches
      if (mapping.extension !== extension) {
        throw new Error(`Extension mismatch: ${extension} !== ${mapping.extension}`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Language detection configuration validation failed:', error);
    return false;
  }
}

// Export validation function for runtime checks
export const validateLanguageMapping = (mapping: unknown): LanguageMapping => {
  return LanguageMappingSchema.parse(mapping);
};

export const validateLanguageDetectionRequest = (request: unknown): LanguageDetectionRequest => {
  return LanguageDetectionRequestSchema.parse(request);
};

export const validateLanguageDetectionResult = (result: unknown): LanguageDetectionResult => {
  return LanguageDetectionResultSchema.parse(result);
};