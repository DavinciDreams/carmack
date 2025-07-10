/**
 * Carmack Coder Project Configuration
 * Centralized configuration for the Carmack project to eliminate hardcoded values
 */

import { z } from 'zod';

export const CarmackConfigSchema = z.object({
  // Project repository information
  project: z.object({
    name: z.string().default('carmack'),
    description: z.string().default('Provably Correct Code Transformation Architecture'),
    version: z.string().default('1.0.0'),
    repository: z.object({
      url: z.string().url(),
      owner: z.string(),
      name: z.string(),
      branch: z.string().default('main'),
    }),
  }),

  // Development and testing configuration
  development: z.object({
    workspace: z.string().default('./workspace'),
    testRepository: z.string().url().optional(),
    useCurrentDirectoryFallback: z.boolean().default(true),
  }),

  // Production deployment settings
  production: z.object({
    defaultRepository: z.string().url(),
    registryUrl: z.string().url().optional(),
    deploymentEnvironment: z.enum(['dev', 'staging', 'production']).default('dev'),
  }),

  // Documentation and links
  documentation: z.object({
    baseUrl: z.string().url(),
    issuesUrl: z.string().url(),
    discussionsUrl: z.string().url(),
    wikiUrl: z.string().url().optional(),
  }),
});

export type CarmackConfig = z.infer<typeof CarmackConfigSchema>;

// Centralized Carmack project configuration
export const carmackConfig: CarmackConfig = {
  project: {
    name: 'carmack',
    description: 'Provably Correct Code Transformation Architecture',
    version: '1.0.0',
    repository: {
      url: 'https://github.com/DavinciDreams/carmack',
      owner: 'DavinciDreams',
      name: 'carmack',
      branch: 'main',
    },
  },

  development: {
    workspace: './workspace',
    testRepository: 'https://github.com/DavinciDreams/carmack',
    useCurrentDirectoryFallback: true,
  },

  production: {
    defaultRepository: 'https://github.com/DavinciDreams/carmack',
    registryUrl: 'ghcr.io/davincidreams/carmack',
    deploymentEnvironment: 'dev',
  },

  documentation: {
    baseUrl: 'https://github.com/DavinciDreams/carmack/docs',
    issuesUrl: 'https://github.com/DavinciDreams/carmack/issues',
    discussionsUrl: 'https://github.com/DavinciDreams/carmack/discussions',
  },
};

// Convenience exports for common values
export const CARMACK_REPOSITORY_URL = carmackConfig.project.repository.url;
export const CARMACK_REPOSITORY_OWNER = carmackConfig.project.repository.owner;
export const CARMACK_REPOSITORY_NAME = carmackConfig.project.repository.name;
export const CARMACK_DEFAULT_BRANCH = carmackConfig.project.repository.branch;

// Helper functions
export function getCarmackRepositoryUrl(branch?: string): string {
  const baseUrl = carmackConfig.project.repository.url;
  return branch ? `${baseUrl}#${branch}` : baseUrl;
}

export function getCarmackDocumentationUrl(path?: string): string {
  const baseUrl = carmackConfig.documentation.baseUrl;
  return path ? `${baseUrl}/${path}` : baseUrl;
}

export function getCarmackCloneUrl(): string {
  return `${carmackConfig.project.repository.url}.git`;
}
