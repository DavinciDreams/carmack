import { Octokit } from '@octokit/rest';
import { z } from 'zod';

import { getEnvironmentConfig } from '../config/environment.ts';

/**
 * GitHub Client for Universal Knowledge Graph Ingestion
 *
 * Handles GitHub API operations including PR data extraction, issue fetching,
 * and commit-PR relationship mapping. Includes rate limiting and retry logic
 * following Carmack's principles of robust error handling.
 */


// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

/**
 * GitHub configuration schema
 */
export const GitHubConfigSchema = z.object({
  token: z.string().optional(),
  owner: z.string(),
  repo: z.string(),
  baseUrl: z.string().url().default('https://api.github.com'),
  userAgent: z.string().default('Carmack-Knowledge-Graph/1.0'),
  requestTimeout: z.number().int().positive().default(30000),
  retryAttempts: z.number().int().min(0).default(3),
  retryDelay: z.number().int().positive().default(1000),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Pull request data schema
 */
export const PullRequestSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  draft: z.boolean(),
  merged: z.boolean(),
  mergedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  user: z.object({
    login: z.string(),
    id: z.number().int(),
    name: z.string().nullable(),
    email: z.string().email().nullable(),
    avatarUrl: z.string().url(),
  }),
  assignees: z.array(z.object({
    login: z.string(),
    id: z.number().int(),
    name: z.string().nullable(),
    avatarUrl: z.string().url(),
  })),
  reviewers: z.array(z.object({
    login: z.string(),
    id: z.number().int(),
    name: z.string().nullable(),
    avatarUrl: z.string().url(),
  })),
  labels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  })),
  head: z.object({
    ref: z.string(),
    sha: z.string().length(40),
    repo: z.object({
      name: z.string(),
      fullName: z.string(),
    }).nullable(),
  }),
  base: z.object({
    ref: z.string(),
    sha: z.string().length(40),
    repo: z.object({
      name: z.string(),
      fullName: z.string(),
    }),
  }),
  mergeCommitSha: z.string().length(40).nullable(),
  commits: z.number().int(),
  additions: z.number().int(),
  deletions: z.number().int(),
  changedFiles: z.number().int(),
  comments: z.number().int(),
  reviewComments: z.number().int(),
  maintainerCanModify: z.boolean(),
  rebaseable: z.boolean().nullable(),
  mergeable: z.boolean().nullable(),
  mergeableState: z.string(),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;

/**
 * Issue data schema
 */
export const IssueSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  user: z.object({
    login: z.string(),
    id: z.number().int(),
    name: z.string().nullable(),
    avatarUrl: z.string().url(),
  }),
  assignees: z.array(z.object({
    login: z.string(),
    id: z.number().int(),
    name: z.string().nullable(),
    avatarUrl: z.string().url(),
  })),
  labels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  })),
  comments: z.number().int(),
  locked: z.boolean(),
  milestone: z.object({
    id: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    state: z.enum(['open', 'closed']),
    createdAt: z.string().datetime(),
    dueOn: z.string().datetime().nullable(),
  }).nullable(),
});

export type Issue = z.infer<typeof IssueSchema>;

/**
 * Commit data schema
 */
export const GitHubCommitSchema = z.object({
  sha: z.string().length(40),
  commit: z.object({
    author: z.object({
      name: z.string(),
      email: z.string().email(),
      date: z.string().datetime(),
    }),
    committer: z.object({
      name: z.string(),
      email: z.string().email(),
      date: z.string().datetime(),
    }),
    message: z.string(),
    tree: z.object({
      sha: z.string().length(40),
    }),
    verification: z.object({
      verified: z.boolean(),
      reason: z.string(),
      signature: z.string().nullable(),
      payload: z.string().nullable(),
    }),
  }),
  author: z.object({
    login: z.string(),
    id: z.number().int(),
    avatarUrl: z.string().url(),
  }).nullable(),
  committer: z.object({
    login: z.string(),
    id: z.number().int(),
    avatarUrl: z.string().url(),
  }).nullable(),
  parents: z.array(z.object({
    sha: z.string().length(40),
  })),
  stats: z.object({
    total: z.number().int(),
    additions: z.number().int(),
    deletions: z.number().int(),
  }).optional(),
  files: z.array(z.object({
    filename: z.string(),
    status: z.string(),
    additions: z.number().int(),
    deletions: z.number().int(),
    changes: z.number().int(),
    patch: z.string().optional(),
  })).optional(),
});

export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

/**
 * Rate limit information schema
 */
export const RateLimitSchema = z.object({
  limit: z.number().int(),
  remaining: z.number().int(),
  reset: z.number().int(),
  used: z.number().int(),
  resource: z.string(),
});

export type RateLimit = z.infer<typeof RateLimitSchema>;

// =============================================================================
// ERRORS
// =============================================================================

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly resetTime: Date,
    public readonly remaining: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// =============================================================================
// GITHUB CLIENT
// =============================================================================

/**
 * GitHub API client with rate limiting and retry logic
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private rateLimitInfo: RateLimit | null = null;

  constructor(config: Partial<GitHubConfig>) {
    this.config = GitHubConfigSchema.parse({
      ...config,
      token: config.token || getEnvironmentConfig().GITHUB_TOKEN,
    });

    this.octokit = new Octokit({
      auth: this.config.token,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      request: {
        timeout: this.config.requestTimeout,
      },
    });
  }

  /**
   * Get all pull requests with pagination
   */
  async getAllPullRequests(options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
    since?: Date;
    perPage?: number;
    maxPages?: number;
  } = {}): Promise<PullRequest[]> {
    try {
      console.log(`🔄 Fetching pull requests from ${this.config.owner}/${this.config.repo}...`);

      const pullRequests: PullRequest[] = [];
      let page = 1;
      const perPage = options.perPage || 100;
      const maxPages = options.maxPages || 50;

      while (page <= maxPages) {
        await this.checkRateLimit();

        const response = await this.retryRequest(async () => {
          return this.octokit.rest.pulls.list({
            owner: this.config.owner,
            repo: this.config.repo,
            state: options.state || 'all',
            sort: options.sort || 'updated',
            direction: options.direction || 'desc',
            per_page: perPage,
            page,
          });
        });

        this.updateRateLimit(response.headers);

        if (response.data.length === 0) {
          break;
        }

        for (const pr of response.data) {
          // Filter by date if specified
          if (options.since && new Date(pr.updated_at) < options.since) {
            continue;
          }

          // Get detailed PR information
          const detailedPR = await this.getPullRequestDetails(pr.number);
          pullRequests.push(detailedPR);
        }

        console.log(`📊 Fetched ${pullRequests.length} pull requests (page ${page})`);
        page++;

        if (response.data.length < perPage) {
          break;
        }
      }

      console.log(`✅ Fetched ${pullRequests.length} total pull requests`);
      return pullRequests;
    } catch (error) {
      throw new GitHubAPIError(
        'Failed to fetch pull requests',
        0,
        'FETCH_PRS_FAILED',
        {
          owner: this.config.owner,
          repo: this.config.repo,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get detailed pull request information
   */
  async getPullRequestDetails(prNumber: number): Promise<PullRequest> {
    try {
      await this.checkRateLimit();

      const response = await this.retryRequest(async () => {
        return this.octokit.rest.pulls.get({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: prNumber,
        });
      });

      this.updateRateLimit(response.headers);

      const pr = response.data;

      // Get reviewers
      const reviewersResponse = await this.retryRequest(async () => {
        return this.octokit.rest.pulls.listRequestedReviewers({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: prNumber,
        });
      });

      const pullRequest: PullRequest = {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state as 'open' | 'closed',
        draft: pr.draft || false,
        merged: pr.merged || false,
        mergedAt: pr.merged_at,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        closedAt: pr.closed_at,
        user: {
          login: pr.user?.login || '',
          id: pr.user?.id || 0,
          name: pr.user?.name || null,
          email: pr.user?.email || null,
          avatarUrl: pr.user?.avatar_url || '',
        },
        assignees: (pr.assignees || []).map(assignee => ({
          login: assignee?.login || '',
          id: assignee?.id || 0,
          name: assignee?.name || null,
          avatarUrl: assignee?.avatar_url || '',
        })),
        reviewers: (reviewersResponse.data.users || []).map(reviewer => ({
          login: reviewer.login,
          id: reviewer.id,
          name: reviewer.name || null,
          avatarUrl: reviewer.avatar_url,
        })),
        labels: (pr.labels || []).map(label => ({
          id: typeof label === 'object' && label && 'id' in label ? label.id as number : 0,
          name: typeof label === 'string' ? label : (label as any)?.name || '',
          color: typeof label === 'object' && label && 'color' in label ? (label as any).color : '',
          description: typeof label === 'object' && label && 'description' in label ? (label as any).description : null,
        })),
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
          repo: pr.head.repo ? {
            name: pr.head.repo.name,
            fullName: pr.head.repo.full_name,
          } : null,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
          repo: {
            name: pr.base.repo.name,
            fullName: pr.base.repo.full_name,
          },
        },
        mergeCommitSha: pr.merge_commit_sha,
        commits: pr.commits || 0,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        comments: pr.comments || 0,
        reviewComments: pr.review_comments || 0,
        maintainerCanModify: pr.maintainer_can_modify || false,
  rebaseable: pr.rebaseable ?? null,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state || 'unknown',
      };

      return PullRequestSchema.parse(pullRequest);
    } catch (error) {
      throw new GitHubAPIError(
        'Failed to fetch pull request details',
        0,
        'FETCH_PR_DETAILS_FAILED',
        {
          prNumber,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get commits for a specific pull request
   */
  async getPullRequestCommits(prNumber: number): Promise<GitHubCommit[]> {
    try {
      await this.checkRateLimit();

      const response = await this.retryRequest(async () => {
        return this.octokit.rest.pulls.listCommits({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: prNumber,
        });
      });

      this.updateRateLimit(response.headers);

      const commits = response.data.map(commit => ({
        sha: commit.sha,
        commit: {
          author: {
            name: commit.commit.author?.name || '',
            email: commit.commit.author?.email || '',
            date: commit.commit.author?.date || new Date().toISOString(),
          },
          committer: {
            name: commit.commit.committer?.name || '',
            email: commit.commit.committer?.email || '',
            date: commit.commit.committer?.date || new Date().toISOString(),
          },
          message: commit.commit.message,
          tree: {
            sha: commit.commit.tree.sha,
          },
          verification: {
            verified: commit.commit.verification?.verified || false,
            reason: commit.commit.verification?.reason || 'unknown',
            signature: commit.commit.verification?.signature || null,
            payload: commit.commit.verification?.payload || null,
          },
        },
        author: commit.author ? {
          login: commit.author.login,
          id: commit.author.id,
          avatarUrl: commit.author.avatar_url,
        } : null,
        committer: commit.committer ? {
          login: commit.committer.login,
          id: commit.committer.id,
          avatarUrl: commit.committer.avatar_url,
        } : null,
        parents: commit.parents.map(parent => ({
          sha: parent.sha,
        })),
      }));

      return commits.map(commit => GitHubCommitSchema.parse(commit));
    } catch (error) {
      throw new GitHubAPIError(
        'Failed to fetch pull request commits',
        0,
        'FETCH_PR_COMMITS_FAILED',
        {
          prNumber,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find pull request by commit SHA
   */
  async findPullRequestByCommit(commitSha: string): Promise<PullRequest | null> {
    try {
      await this.checkRateLimit();

      const response = await this.retryRequest(async () => {
        return this.octokit.rest.repos.listPullRequestsAssociatedWithCommit({
          owner: this.config.owner,
          repo: this.config.repo,
          commit_sha: commitSha,
        });
      });

      this.updateRateLimit(response.headers);

      if (response.data.length === 0) {
        return null;
      }

      // Return the first (most relevant) PR
      const pr = response.data[0];
  if (!pr) throw new Error('Pull request not found');
  return this.getPullRequestDetails(pr.number);
    } catch (error) {
      console.warn(`⚠️ Failed to find PR for commit ${commitSha}:`, error);
      return null;
    }
  }

  /**
   * Get all issues with pagination
   */
  async getAllIssues(options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    since?: Date;
    perPage?: number;
    maxPages?: number;
  } = {}): Promise<Issue[]> {
    try {
      console.log(`🔄 Fetching issues from ${this.config.owner}/${this.config.repo}...`);

      const issues: Issue[] = [];
      let page = 1;
      const perPage = options.perPage || 100;
      const maxPages = options.maxPages || 50;

      while (page <= maxPages) {
        await this.checkRateLimit();

        const response = await this.retryRequest(async () => {
          return this.octokit.rest.issues.listForRepo({
            owner: this.config.owner,
            repo: this.config.repo,
            state: options.state || 'all',
            sort: options.sort || 'updated',
            direction: options.direction || 'desc',
            per_page: perPage,
            page,
            since: options.since?.toISOString(),
          });
        });

        this.updateRateLimit(response.headers);

        if (response.data.length === 0) {
          break;
        }

        for (const issue of response.data) {
          // Skip pull requests (they appear in issues API)
          if (issue.pull_request) {
            continue;
          }

          const processedIssue: Issue = {
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: issue.body ?? null,
            state: issue.state as 'open' | 'closed',
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
            user: {
              login: issue.user?.login || '',
              id: issue.user?.id || 0,
              name: issue.user?.name || null,
              avatarUrl: issue.user?.avatar_url || '',
            },
            assignees: (issue.assignees || []).map(assignee => ({
              login: assignee?.login || '',
              id: assignee?.id || 0,
              name: assignee?.name || null,
              avatarUrl: assignee?.avatar_url || '',
            })),
            labels: (issue.labels || []).map(label => ({
              id: typeof label === 'object' && label && 'id' in label ? label.id as number : 0,
              name: typeof label === 'string' ? label : (label as any)?.name || '',
              color: typeof label === 'object' && label && 'color' in label ? (label as any).color : '',
              description: typeof label === 'object' && label && 'description' in label ? (label as any).description : null,
            })),
            comments: issue.comments || 0,
            locked: issue.locked || false,
            milestone: issue.milestone ? {
              id: issue.milestone.id,
              title: issue.milestone.title,
              description: issue.milestone.description,
              state: issue.milestone.state as 'open' | 'closed',
              createdAt: issue.milestone.created_at,
              dueOn: issue.milestone.due_on,
            } : null,
          };

          issues.push(IssueSchema.parse(processedIssue));
        }

        console.log(`📊 Fetched ${issues.length} issues (page ${page})`);
        page++;

        if (response.data.length < perPage) {
          break;
        }
      }

      console.log(`✅ Fetched ${issues.length} total issues`);
      return issues;
    } catch (error) {
      throw new GitHubAPIError(
        'Failed to fetch issues',
        0,
        'FETCH_ISSUES_FAILED',
        {
          owner: this.config.owner,
          repo: this.config.repo,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<RateLimit> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      
      const rateLimit: RateLimit = {
        limit: response.data.rate.limit,
        remaining: response.data.rate.remaining,
        reset: response.data.rate.reset,
        used: response.data.rate.used,
        resource: 'core',
      };

      this.rateLimitInfo = rateLimit;
      return RateLimitSchema.parse(rateLimit);
    } catch (error) {
      throw new GitHubAPIError(
        'Failed to get rate limit',
        0,
        'RATE_LIMIT_FAILED',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Check rate limit and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) {
      await this.getRateLimit();
    }

    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 10) {
      const resetTime = new Date(this.rateLimitInfo.reset * 1000);
      const waitTime = resetTime.getTime() - Date.now() + 1000; // Add 1 second buffer

      if (waitTime > 0) {
        console.log(`⏳ Rate limit approaching, waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        await this.getRateLimit(); // Refresh rate limit info
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimit(headers: any): void {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit'] || '5000'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(headers['x-ratelimit-reset'] || '0'),
        used: parseInt(headers['x-ratelimit-used'] || '0'),
        resource: 'core',
      };
    }
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    request: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      if (attempt >= this.config.retryAttempts) {
        throw error;
      }

      const isRetryable = error.status >= 500 || error.status === 429;
      if (!isRetryable) {
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️ Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(request, attempt + 1);
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================


/**
 * Create a GitHub client for any repository
 * Usage: createGitHubClient({ owner, repo, token? })
 */
export function createGitHubClient(config: Partial<GitHubConfig>): GitHubClient {
  return new GitHubClient({
    ...config,
  });
}

/**
 * Validate GitHub configuration
 */
export function validateGitHubConfig(config: unknown): GitHubConfig {
  return GitHubConfigSchema.parse(config);
}