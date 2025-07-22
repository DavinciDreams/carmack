/**
 * Real LLM Provider Integration System
 *
 * This module provides production-ready LLM provider integrations with:
 * - Multiple provider support (OpenAI, Anthropic, OpenRouter, Ollama)
 * - Rate limiting and cost tracking
 * - Robust error handling and fallback mechanisms
 * - Provider-specific optimizations
 * - Context-aware prompt engineering
 */

import { z } from 'zod';
import { getEnvironmentConfig } from '../config/environment.js';

// =============================================================================
// PROVIDER CONFIGURATION SCHEMAS
// =============================================================================

export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']);

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema.default('openai'),
  apiKey: z.string().optional(),
  model: z.string().default('gpt-4'),
  baseURL: z.string().optional(),
  maxTokens: z.number().default(4000),
  temperature: z.number().min(0).max(2).default(0.1),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  rateLimitRpm: z.number().default(60), // Requests per minute
  rateLimitTpm: z.number().default(100000), // Tokens per minute
  costPerToken: z.number().default(0.00001), // Cost tracking
});

export const LLMRequestSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  context: z
    .object({
      language: z.string().default('typescript'),
      framework: z.string().optional(),
      complexity: z.number().default(5),
      codeLength: z.number().default(0),
    })
    .optional(),
  options: z
    .object({
      stream: z.boolean().default(false),
      jsonMode: z.boolean().default(true),
      maxRetries: z.number().default(3),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
    })
    .optional(),
});

export const LLMResponseSchema = z.object({
  content: z.string(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
  model: z.string(),
  provider: LLMProviderSchema,
  metadata: z
    .object({
      requestId: z.string().optional(),
      processingTime: z.number().optional(),
      retryCount: z.number().default(0),
    })
    .optional(),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type LLMRequest = z.infer<typeof LLMRequestSchema>;
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// =============================================================================
// RATE LIMITING AND COST TRACKING
// =============================================================================

interface RateLimitState {
  requests: Array<{ timestamp: number; tokens: number }>;
  totalCost: number;
  lastReset: number;
}

class RateLimiter {
  private state: Map<string, RateLimitState> = new Map();

  async checkRateLimit(
    provider: string,
    config: LLMConfig,
    estimatedTokens: number
  ): Promise<boolean> {
    const now = Date.now();
    const key = `${provider}-${config.model}`;

    if (!this.state.has(key)) {
      this.state.set(key, {
        requests: [],
        totalCost: 0,
        lastReset: now,
      });
    }

    const state = this.state.get(key)!;

    // Clean old requests (older than 1 minute)
    state.requests = state.requests.filter((req) => now - req.timestamp < 60000);

    // Check RPM limit
    if (state.requests.length >= config.rateLimitRpm) {
      return false;
    }

    // Check TPM limit
    const totalTokens = state.requests.reduce((sum, req) => sum + req.tokens, 0);
    if (totalTokens + estimatedTokens > config.rateLimitTpm) {
      return false;
    }

    return true;
  }

  async recordRequest(
    provider: string,
    config: LLMConfig,
    tokens: number,
    cost: number
  ): Promise<void> {
    const key = `${provider}-${config.model}`;
    const state = this.state.get(key)!;

    state.requests.push({
      timestamp: Date.now(),
      tokens,
    });
    state.totalCost += cost;
  }

  getTotalCost(provider: string, model: string): number {
    const key = `${provider}-${model}`;
    return this.state.get(key)?.totalCost || 0;
  }
}

const globalRateLimiter = new RateLimiter();

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

abstract class BaseLLMProvider {
  protected config: LLMConfig;
  protected rateLimiter: RateLimiter;

  constructor(config: LLMConfig) {
    this.config = LLMConfigSchema.parse(config);
    this.rateLimiter = globalRateLimiter;
  }

  abstract makeRequest(request: LLMRequest): Promise<LLMResponse>;

  protected async waitForRateLimit(estimatedTokens: number): Promise<void> {
    const canProceed = await this.rateLimiter.checkRateLimit(
      this.config.provider,
      this.config,
      estimatedTokens
    );

    if (!canProceed) {
      // Calculate wait time based on oldest request
      const waitTime = Math.min(60000, 5000); // Max 1 minute, min 5 seconds
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForRateLimit(estimatedTokens);
    }
  }

  protected estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  protected calculateCost(tokens: number): number {
    return tokens * this.config.costPerToken;
  }
}

// =============================================================================
// OPENAI PROVIDER
// =============================================================================

export class OpenAIProvider extends BaseLLMProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    const validatedRequest = LLMRequestSchema.parse(request);
    const estimatedTokens = this.estimateTokens(validatedRequest.prompt);

    await this.waitForRateLimit(estimatedTokens);

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = validatedRequest.options?.maxRetries || this.config.retries;

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              ...(validatedRequest.systemPrompt
                ? [
                    {
                      role: 'system',
                      content: validatedRequest.systemPrompt,
                    },
                  ]
                : []),
              {
                role: 'user',
                content: validatedRequest.prompt,
              },
            ],
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            ...(validatedRequest.options?.jsonMode && {
              response_format: { type: 'json_object' },
            }),
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};
        const cost = this.calculateCost(usage.total_tokens || estimatedTokens);

        // Record usage for rate limiting
        await this.rateLimiter.recordRequest(
          this.config.provider,
          this.config,
          usage.total_tokens || estimatedTokens,
          cost
        );

        return LLMResponseSchema.parse({
          content,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            cost,
          },
          model: this.config.model,
          provider: 'openai',
          metadata: {
            requestId: data.id,
            processingTime: Date.now() - startTime,
            retryCount,
          },
        });
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(
          `OpenAI request failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// =============================================================================
// ANTHROPIC PROVIDER
// =============================================================================

export class AnthropicProvider extends BaseLLMProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    const validatedRequest = LLMRequestSchema.parse(request);
    const estimatedTokens = this.estimateTokens(validatedRequest.prompt);

    await this.waitForRateLimit(estimatedTokens);

    if (!this.config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = validatedRequest.options?.maxRetries || this.config.retries;

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            system:
              validatedRequest.systemPrompt || 'You are an expert code transformation assistant.',
            messages: [
              {
                role: 'user',
                content: validatedRequest.prompt,
              },
            ],
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        const usage = data.usage || {};
        const cost = this.calculateCost(usage.output_tokens || estimatedTokens);

        // Record usage for rate limiting
        await this.rateLimiter.recordRequest(
          this.config.provider,
          this.config,
          (usage.input_tokens || 0) + (usage.output_tokens || 0),
          cost
        );

        return LLMResponseSchema.parse({
          content,
          usage: {
            promptTokens: usage.input_tokens || 0,
            completionTokens: usage.output_tokens || 0,
            totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            cost,
          },
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          metadata: {
            requestId: data.id,
            processingTime: Date.now() - startTime,
            retryCount,
          },
        });
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(
          `Anthropic request failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// =============================================================================
// OPENROUTER PROVIDER
// =============================================================================

export class OpenRouterProvider extends BaseLLMProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    const validatedRequest = LLMRequestSchema.parse(request);
    const estimatedTokens = this.estimateTokens(validatedRequest.prompt);

    await this.waitForRateLimit(estimatedTokens);

    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const baseURL = this.config.baseURL || 'https://openrouter.ai/api/v1';
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = validatedRequest.options?.maxRetries || this.config.retries;

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/DavinciDreams/carmack',
            'X-Title': 'Carmack Coder',
          },
          body: JSON.stringify({
            model: this.config.model || 'anthropic/claude-3.5-sonnet',
            messages: [
              ...(validatedRequest.systemPrompt
                ? [
                    {
                      role: 'system',
                      content: validatedRequest.systemPrompt,
                    },
                  ]
                : []),
              {
                role: 'user',
                content: validatedRequest.prompt,
              },
            ],
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            stream: false,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `OpenRouter API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};
        const cost = this.calculateCost(usage.total_tokens || estimatedTokens);

        // Record usage for rate limiting
        await this.rateLimiter.recordRequest(
          this.config.provider,
          this.config,
          usage.total_tokens || estimatedTokens,
          cost
        );

        return LLMResponseSchema.parse({
          content,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            cost,
          },
          model: this.config.model || 'anthropic/claude-3.5-sonnet',
          provider: 'openrouter',
          metadata: {
            requestId: data.id,
            processingTime: Date.now() - startTime,
            retryCount,
          },
        });
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(
          `OpenRouter request failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// =============================================================================
// OLLAMA PROVIDER (Local LLM)
// =============================================================================

export class OllamaProvider extends BaseLLMProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    const validatedRequest = LLMRequestSchema.parse(request);
    const estimatedTokens = this.estimateTokens(validatedRequest.prompt);

    const baseURL = this.config.baseURL || 'http://localhost:11434';
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = validatedRequest.options?.maxRetries || this.config.retries;

    while (retryCount <= maxRetries) {
      try {
        // Check if Ollama is running
        await fetch(`${baseURL}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        const prompt = validatedRequest.systemPrompt
          ? `${validatedRequest.systemPrompt}\n\n${validatedRequest.prompt}`
          : validatedRequest.prompt;

        const response = await fetch(`${baseURL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model || 'codellama',
            prompt,
            stream: false,
            options: {
              temperature: this.config.temperature,
              num_predict: this.config.maxTokens,
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.response || '';
        const cost = 0; // Local models are free

        return LLMResponseSchema.parse({
          content,
          usage: {
            promptTokens: estimatedTokens,
            completionTokens: this.estimateTokens(content),
            totalTokens: estimatedTokens + this.estimateTokens(content),
            cost,
          },
          model: this.config.model || 'codellama',
          provider: 'ollama',
          metadata: {
            processingTime: Date.now() - startTime,
            retryCount,
          },
        });
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw new Error(
            `Ollama connection failed: ${error instanceof Error ? error.message : String(error)}. Make sure Ollama is running at ${baseURL}`
          );
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.warn(
          `Ollama request failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// =============================================================================
// PROVIDER FACTORY AND MANAGER
// =============================================================================

export class LLMProviderManager {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private fallbackOrder: LLMProvider[] = ['openai', 'anthropic', 'openrouter', 'local'];

  constructor(private defaultConfig?: Partial<LLMConfig>) {}

  getProvider(provider: LLMProvider, config?: Partial<LLMConfig>): BaseLLMProvider {
    const finalConfig = { ...this.defaultConfig, ...config, provider };
    const key = `${provider}-${JSON.stringify(finalConfig)}`;

    if (!this.providers.has(key)) {
      const providerInstance = this.createProvider(provider, finalConfig);
      this.providers.set(key, providerInstance);
    }

    return this.providers.get(key)!;
  }

  private createProvider(provider: LLMProvider, config: Partial<LLMConfig>): BaseLLMProvider {
    const fullConfig = LLMConfigSchema.parse(config);

    switch (provider) {
      case 'openai':
        return new OpenAIProvider(fullConfig);
      case 'anthropic':
        return new AnthropicProvider(fullConfig);
      case 'openrouter':
        return new OpenRouterProvider(fullConfig);
      case 'local':
        return new OllamaProvider(fullConfig);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async makeRequestWithFallback(
    request: LLMRequest,
    preferredProvider?: LLMProvider,
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const env = getEnvironmentConfig();
    const providers = preferredProvider
      ? [preferredProvider, ...this.fallbackOrder.filter((p) => p !== preferredProvider)]
      : this.fallbackOrder;

    let lastError: Error | null = null;

    for (const providerName of providers) {
      try {
        // Skip providers without API keys in production
        if (env.NODE_ENV === 'production') {
          if (providerName === 'openai' && !env.OPENAI_API_KEY) continue;
          if (providerName === 'anthropic' && !env.ANTHROPIC_API_KEY) continue;
          if (providerName === 'openrouter' && !env.OPENROUTER_API_KEY) continue;
        }

        const provider = this.getProvider(providerName, config);
        console.log(`🤖 Attempting LLM request with ${providerName}...`);

        const response = await provider.makeRequest(request);
        console.log(`✅ LLM request successful with ${providerName}`);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ LLM request failed with ${providerName}:`, lastError.message);
        continue;
      }
    }

    throw new Error(
      `All LLM providers failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  getTotalCost(): Record<string, number> {
    const costs: Record<string, number> = {};

    for (const provider of this.fallbackOrder) {
      costs[provider] = globalRateLimiter.getTotalCost(provider, 'all-models');
    }

    return costs;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let globalProviderManager: LLMProviderManager | null = null;

export function getLLMProviderManager(): LLMProviderManager {
  if (!globalProviderManager) {
    const env = getEnvironmentConfig();
    globalProviderManager = new LLMProviderManager({
      provider: env.LLM_PROVIDER as LLMProvider,
      model: env.LLM_MODEL,
      apiKey:
        env.LLM_PROVIDER === 'openai'
          ? env.OPENAI_API_KEY
          : env.LLM_PROVIDER === 'anthropic'
            ? env.ANTHROPIC_API_KEY
            : env.LLM_PROVIDER === 'openrouter'
              ? env.OPENROUTER_API_KEY
              : undefined,
      baseURL: env.LLM_PROVIDER === 'local' ? env.LOCAL_LLM_URL : undefined,
      temperature: env.LLM_TEMPERATURE,
      maxTokens: env.LLM_MAX_TOKENS,
      timeout: env.LLM_TIMEOUT,
      retries: env.LLM_RETRIES,
    });
  }
  return globalProviderManager;
}
