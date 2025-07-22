import { z } from 'zod';
import { YAML } from './yaml-handler.js';

/**
 * Configuration-specific YAML validators for Carmack Coder
 *
 * Provides type-safe validation for all configuration files used in the project
 */

// Lefthook Configuration Schema
const LefthookCommandSchema = z
  .object({
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    run: z.string(),
    glob: z.string().optional(),
    fail_text: z.string().optional(),
    stage_fixed: z.boolean().optional(),
  })
  .strict();

const LefthookHookSchema = z
  .object({
    parallel: z.boolean().optional(),
    commands: z.record(LefthookCommandSchema),
  })
  .strict();

export const LefthookConfigSchema = z
  .object({
    colors: z.boolean().optional(),
    no_tty: z.boolean().optional(),
    source_dir: z.string().optional(),
    output: z.array(z.string()).optional(),
    'pre-commit': LefthookHookSchema.optional(),
    'prepare-commit-msg': LefthookHookSchema.optional(),
    'pre-push': LefthookHookSchema.optional(),
    'post-commit': LefthookHookSchema.optional(),
    skip_output: z.array(z.string()).optional(),
    remote: z
      .object({
        git_url: z.string(),
        ref: z.string(),
        config: z.string(),
      })
      .optional(),
    environments: z
      .record(
        z.object({
          skip: z.array(z.string()),
        })
      )
      .optional(),
    execution_timeout: z.number().optional(),
  })
  .strict();

// Docker Compose Schema (Enhanced)
const DockerComposeServiceSchema = z
  .object({
    image: z.string().optional(),
    build: z
      .union([
        z.string(),
        z.object({
          context: z.string(),
          dockerfile: z.string().optional(),
        }),
      ])
      .optional(),
    ports: z.array(z.string()).optional(),
    environment: z.union([z.array(z.string()), z.record(z.string())]).optional(),
    volumes: z.array(z.string()).optional(),
    depends_on: z.array(z.string()).optional(),
    networks: z.array(z.string()).optional(),
    restart: z.enum(['no', 'always', 'on-failure', 'unless-stopped']).optional(),
    command: z.string().optional(),
    working_dir: z.string().optional(),
    user: z.string().optional(),
    labels: z.record(z.string()).optional(),
    container_name: z.string().optional(), // Allow container_name
  })
  .strict();

export const DockerComposeSchema = z
  .object({
    version: z.string(),
    services: z.record(DockerComposeServiceSchema),
    networks: z
      .record(
        z.object({
          driver: z.string().optional(),
          external: z.boolean().optional(),
        })
      )
      .optional(),
    volumes: z
      .record(
        z.object({
          driver: z.string().optional(),
          external: z.boolean().optional(),
        })
      )
      .optional(),
  })
  .strict();

// Prometheus Configuration Schema
// Note: PrometheusRuleGroupSchema reserved for future rule file validation
const PrometheusRuleGroupSchema = z.object({
  name: z.string(),
  rules: z.array(
    z.object({
      alert: z.string().optional(),
      expr: z.string(),
      for: z.string().optional(),
      labels: z.record(z.string()).optional(),
      annotations: z.record(z.string()).optional(),
    })
  ),
});

// Export for potential future use
export { PrometheusRuleGroupSchema };

const PrometheusScrapeConfigSchema = z
  .object({
    job_name: z.string(),
    static_configs: z
      .array(
        z.object({
          targets: z.array(z.string()),
          labels: z.record(z.string()).optional(),
        })
      )
      .optional(),
    metrics_path: z.string().optional(),
    scrape_interval: z.string().optional(),
    scrape_timeout: z.string().optional(),
  })
  .strict();

export const PrometheusConfigSchema = z
  .object({
    global: z.object({
      scrape_interval: z.string(),
      evaluation_interval: z.string(),
    }),
    rule_files: z.array(z.string()),
    scrape_configs: z.array(PrometheusScrapeConfigSchema),
    alerting: z
      .object({
        alertmanagers: z.array(
          z.object({
            static_configs: z.array(
              z.object({
                targets: z.array(z.string()),
              })
            ),
          })
        ),
      })
      .optional(),
  })
  .strict();

// GitHub Actions Workflow Schema
const GitHubActionStepSchema = z
  .object({
    name: z.string().optional(),
    id: z.string().optional(),
    uses: z.string().optional(),
    run: z.string().optional(),
    with: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    env: z.record(z.string()).optional(),
    if: z.string().optional(),
  })
  .strict();

const GitHubActionJobSchema = z
  .object({
    'runs-on': z.union([z.string(), z.array(z.string())]),
    needs: z.union([z.string(), z.array(z.string())]).optional(),
    if: z.string().optional(),
    name: z.string().optional(), // Allow name in jobs
    strategy: z
      .object({
        matrix: z.record(z.array(z.union([z.string(), z.number()]))),
      })
      .optional(),
    steps: z.array(GitHubActionStepSchema),
    environment: z.string().optional(),
    timeout: z.number().optional(),
  })
  .strict();

export const GitHubWorkflowSchema = z
  .object({
    name: z.string(),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z
        .object({
          push: z
            .object({
              branches: z.array(z.string()).optional(),
              branches_ignore: z.array(z.string()).optional(),
              tags: z.array(z.string()).optional(),
              tags_ignore: z.array(z.string()).optional(),
              paths: z.array(z.string()).optional(),
              paths_ignore: z.array(z.string()).optional(),
            })
            .optional(),
          pull_request: z
            .object({
              branches: z.array(z.string()).optional(),
              branches_ignore: z.array(z.string()).optional(),
              tags: z.array(z.string()).optional(),
              tags_ignore: z.array(z.string()).optional(),
              paths: z.array(z.string()).optional(),
              paths_ignore: z.array(z.string()).optional(),
            })
            .optional(),
          workflow_dispatch: z.union([z.record(z.unknown()), z.null()]).optional(),
          schedule: z.array(z.object({ cron: z.string() })).optional(),
          release: z.union([z.record(z.unknown()), z.null()]).optional(),
          issues: z.union([z.record(z.unknown()), z.null()]).optional(),
          issue_comment: z.union([z.record(z.unknown()), z.null()]).optional(),
          create: z.union([z.record(z.unknown()), z.null()]).optional(),
          delete: z.union([z.record(z.unknown()), z.null()]).optional(),
          deployment: z.union([z.record(z.unknown()), z.null()]).optional(),
          deployment_status: z.union([z.record(z.unknown()), z.null()]).optional(),
          page_build: z.union([z.record(z.unknown()), z.null()]).optional(),
          public: z.union([z.record(z.unknown()), z.null()]).optional(),
          registry_package: z.union([z.record(z.unknown()), z.null()]).optional(),
          repository_dispatch: z.union([z.record(z.unknown()), z.null()]).optional(),
          status: z.union([z.record(z.unknown()), z.null()]).optional(),
          watch: z.union([z.record(z.unknown()), z.null()]).optional(),
          workflow_call: z.union([z.record(z.unknown()), z.null()]).optional(),
          workflow_run: z.union([z.record(z.unknown()), z.null()]).optional(),
        })
        .strict(),
    ]),
    jobs: z.record(GitHubActionJobSchema),
    env: z.record(z.string()).optional(),
    defaults: z
      .object({
        run: z
          .object({
            shell: z.string().optional(),
            'working-directory': z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

/**
 * Validate configuration files with appropriate schemas
 */
export class ConfigValidator {
  /**
   * Validate lefthook.yml configuration
   */
  static async validateLefthook(filePath = 'lefthook.yml'): Promise<{
    valid: boolean;
    errors?: string[];
    data?: z.infer<typeof LefthookConfigSchema>;
  }> {
    try {
      const result = await YAML.validate(filePath, LefthookConfigSchema);
      const response: {
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof LefthookConfigSchema>;
      } = {
        valid: result.valid,
      };

      if (!result.valid && result.errors) {
        response.errors = result.errors.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }

      if (result.data) {
        response.data = result.data;
      }

      return response;
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Validate docker-compose.yml configuration
   */
  static async validateDockerCompose(filePath = 'docker-compose.yml'): Promise<{
    valid: boolean;
    errors?: string[];
    data?: z.infer<typeof DockerComposeSchema>;
  }> {
    try {
      const result = await YAML.validate(filePath, DockerComposeSchema);
      const response: {
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof DockerComposeSchema>;
      } = {
        valid: result.valid,
      };

      if (!result.valid && result.errors) {
        response.errors = result.errors.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }

      if (result.data) {
        response.data = result.data;
      }

      return response;
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Validate Prometheus configuration
   */
  static async validatePrometheus(filePath: string): Promise<{
    valid: boolean;
    errors?: string[];
    data?: z.infer<typeof PrometheusConfigSchema>;
  }> {
    try {
      const result = await YAML.validate(filePath, PrometheusConfigSchema);
      const response: {
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof PrometheusConfigSchema>;
      } = {
        valid: result.valid,
      };

      if (!result.valid && result.errors) {
        response.errors = result.errors.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }

      if (result.data) {
        response.data = result.data;
      }

      return response;
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Validate GitHub Actions workflow
   */
  static async validateGitHubWorkflow(filePath: string): Promise<{
    valid: boolean;
    errors?: string[];
    data?: z.infer<typeof GitHubWorkflowSchema>;
  }> {
    try {
      const result = await YAML.validate(filePath, GitHubWorkflowSchema);
      const response: {
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof GitHubWorkflowSchema>;
      } = {
        valid: result.valid,
      };

      if (!result.valid && result.errors) {
        response.errors = result.errors.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }

      if (result.data) {
        response.data = result.data;
      }

      return response;
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Validate all configuration files in the project
   */
  static async validateAllConfigs(): Promise<{
    lefthook?: { valid: boolean; errors?: string[] };
    dockerCompose?: { valid: boolean; errors?: string[] };
    prometheus?: { valid: boolean; errors?: string[] };
    workflows?: Array<{ file: string; valid: boolean; errors?: string[] }>;
  }> {
    const results: {
      lefthook?: { valid: boolean; errors?: string[] };
      dockerCompose?: { valid: boolean; errors?: string[] };
      prometheus?: { valid: boolean; errors?: string[] };
      workflows?: Array<{ file: string; valid: boolean; errors?: string[] }>;
    } = {};

    // Validate lefthook.yml
    try {
      results.lefthook = await ConfigValidator.validateLefthook();
    } catch (_error) {
      results.lefthook = {
        valid: false,
        errors: ['File not found or not accessible'],
      };
    }

    // Validate docker-compose.yml
    try {
      results.dockerCompose = await ConfigValidator.validateDockerCompose();
    } catch (_error) {
      results.dockerCompose = {
        valid: false,
        errors: ['File not found or not accessible'],
      };
    }

    // Validate prometheus configs
    try {
      results.prometheus = await ConfigValidator.validatePrometheus('monitoring/prometheus.yml');
    } catch (_error) {
      results.prometheus = {
        valid: false,
        errors: ['File not found or not accessible'],
      };
    }

    // Validate GitHub workflow files
    const workflowFiles = ['.github/workflows/ci.yml', '.github/workflows/production.yml'];

    results.workflows = [];
    for (const file of workflowFiles) {
      try {
        const result = await ConfigValidator.validateGitHubWorkflow(file);
        results.workflows.push({
          file,
          valid: result.valid,
          ...(result.errors && { errors: result.errors }),
        });
      } catch (_error) {
        results.workflows.push({
          file,
          valid: false,
          errors: ['File not found or not accessible'],
        });
      }
    }

    return results;
  }
}

/**
 * CLI utility for validating configuration files
 */
export async function validateConfigFiles(): Promise<void> {
  console.log('🔍 Validating YAML configuration files...\n');

  const results = await ConfigValidator.validateAllConfigs();

  // Report lefthook validation
  if (results.lefthook) {
    if (results.lefthook.valid) {
      console.log('✅ lefthook.yml is valid');
    } else {
      console.log('❌ lefthook.yml has errors:');
      results.lefthook.errors?.forEach((error) => console.log(`   - ${error}`));
    }
  }

  // Report docker-compose validation
  if (results.dockerCompose) {
    if (results.dockerCompose.valid) {
      console.log('✅ docker-compose.yml is valid');
    } else {
      console.log('❌ docker-compose.yml has errors:');
      results.dockerCompose.errors?.forEach((error) => console.log(`   - ${error}`));
    }
  }

  // Report prometheus validation
  if (results.prometheus) {
    if (results.prometheus.valid) {
      console.log('✅ monitoring/prometheus.yml is valid');
    } else {
      console.log('❌ monitoring/prometheus.yml has errors:');
      results.prometheus.errors?.forEach((error) => console.log(`   - ${error}`));
    }
  }

  // Report workflow validations
  if (results.workflows) {
    for (const workflow of results.workflows) {
      if (workflow.valid) {
        console.log(`✅ ${workflow.file} is valid`);
      } else {
        console.log(`❌ ${workflow.file} has errors:`);
        workflow.errors?.forEach((error) => console.log(`   - ${error}`));
      }
    }
  }

  console.log('\n🎯 YAML validation completed!');
}

// Export schemas for external use
export const ConfigSchemas = {
  lefthook: LefthookConfigSchema,
  dockerCompose: DockerComposeSchema,
  prometheus: PrometheusConfigSchema,
  githubWorkflow: GitHubWorkflowSchema,
} as const;
