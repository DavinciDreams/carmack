// Pattern types and enums extracted from pattern-learning, pattern-discovery, and template-engine

import { z } from 'zod';
import {
  TemplatePatternSchema,
  PatternEffectivenessSchema,
  DiscoveredPatternSchema,
  LearningResultSchema,
  PatternLearningInputSchema,
  PatternDiscoveryRequestSchema,
  // AstPatternSchema, // Removed because it does not exist in ./schemas
} from './schemas';

// Supported languages (union of both modules)
export const SupportedLanguageEnum = [
  'typescript', 'javascript', 'python', 'cpp', 'c', 'java', 'go', 'rust', 'ruby', 'php', 'csharp', 'kotlin', 'swift', 'scala', 'haskell', 'elixir', 'shell', 'json', 'yaml', 'toml', 'lua', 'perl', 'r', 'dart', 'xml', 'ini', 'sql', 'docker', 'make', 'other'
] as const;
export type SupportedLanguage = typeof SupportedLanguageEnum[number];

// Template variable type
export interface TemplateVariable {
  name: string;
  value: string;
  type: 'identifier' | 'literal' | 'expression' | 'statement';
  context?: {
    leadingWhitespace?: string;
    trailingWhitespace?: string;
    indentation?: string;
  };
}

// Template match type
export interface TemplateMatch {
  pattern: TemplatePattern;
  match: string;
  variables: TemplateVariable[];
  startIndex: number;
}
export type TemplatePattern = z.infer<typeof TemplatePatternSchema>;

// Pattern effectiveness type
export type PatternEffectiveness = z.infer<typeof PatternEffectivenessSchema>;

// Discovered pattern type (from pattern-learning/discovery)
export type DiscoveredPattern = z.infer<typeof DiscoveredPatternSchema>;

// Learning result type
export type LearningResult = z.infer<typeof LearningResultSchema>;

// Pattern learning input type
export type PatternLearningInput = z.infer<typeof PatternLearningInputSchema>;

// Pattern discovery request type
export type PatternDiscoveryRequest = z.infer<typeof PatternDiscoveryRequestSchema>;

// AstPattern type placeholder (AstPatternSchema not found in ./schemas)
// Define AstPattern here or import from the correct module if available
export type AstPattern = unknown;

// LearnedPattern type for pattern-learning
export type LearnedPattern = Omit<AstPattern, 'language'> & {
  language: SupportedLanguage;
  confidence?: number;
};