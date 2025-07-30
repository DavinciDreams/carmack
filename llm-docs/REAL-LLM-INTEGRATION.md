# Real LLM Provider Integration

This document describes the comprehensive real LLM provider integration system that replaces the mock implementations with production-ready AI-powered code transformations.

## Overview

The Carmack Coder system now supports real LLM providers with:
- ✅ **OpenAI API Integration** (GPT-4, GPT-3.5-turbo)
- ✅ **Anthropic Claude API Integration** (Claude-3.5-Sonnet, Claude-3-Haiku)
- ✅ **OpenRouter API Integration** (Access to 100+ models)
- ✅ **Local LLM Support** (Ollama for privacy-focused deployments)
- ✅ **Intelligent Fallback Mechanisms** (Automatic provider switching)
- ✅ **Rate Limiting & Cost Tracking** (Production-ready controls)
- ✅ **Enhanced Error Handling** (Robust retry logic)

## Architecture

### Provider System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Provider Manager                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   OpenAI    │  │  Anthropic  │  │ OpenRouter  │         │
│  │ Provider    │  │  Provider   │  │  Provider   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Ollama    │  │Rate Limiter │  │Cost Tracker │         │
│  │ Provider    │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced LLM Transformation Actor             │
├─────────────────────────────────────────────────────────────┤
│  • Context-aware prompt engineering                        │
│  • Multi-language code analysis                            │
│  • Intelligent transformation validation                   │
│  • Performance monitoring & metrics                        │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Update your `.env` file with the following configuration:

```bash
# LLM Provider Selection
LLM_PROVIDER=openai  # Options: openai, anthropic, openrouter, local, mock
LLM_MODEL=gpt-4

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_ORGANIZATION=your-org-id

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
ANTHROPIC_BASE_URL=https://api.anthropic.com

# OpenRouter Configuration (alternative to OpenAI/Anthropic)
OPENROUTER_API_KEY=sk-or-your-openrouter-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Local LLM Configuration (Ollama)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=codellama:7b

# LLM Request Settings
LLM_TEMPERATURE=0.1      # Low temperature for deterministic code
LLM_MAX_TOKENS=4000
LLM_TIMEOUT=30000        # 30 second timeout
LLM_RETRIES=3
```

### Provider-Specific Configuration

#### OpenAI
- **Models**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Best for**: General code transformations, TypeScript/JavaScript
- **Cost**: ~$0.03 per 1K tokens (GPT-4)

#### Anthropic Claude
- **Models**: `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`
- **Best for**: Complex reasoning, code analysis, safety-critical transformations
- **Cost**: ~$0.015 per 1K tokens (Claude-3.5-Sonnet)

#### OpenRouter
- **Models**: 100+ models including Llama, Mistral, CodeLlama
- **Best for**: Cost optimization, model experimentation
- **Cost**: Varies by model (some free options available)

#### Ollama (Local)
- **Models**: `codellama`, `deepseek-coder`, `starcoder`
- **Best for**: Privacy-sensitive environments, offline development
- **Cost**: Free (requires local compute resources)

## Usage Examples

### Basic LLM Transformation

```typescript
import { enhancedLLMTransformationActor } from './src/actors/llm-transformation-enhanced.js';
import { createActor } from 'xstate';

const actor = createActor(enhancedLLMTransformationActor, {
  input: {
    files: ['src/legacy-code.js'],
    config: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.1,
      enableFallback: true,
      costLimit: 0.50, // 50 cents limit
    },
    request: {
      prompt: 'Modernize this JavaScript code using ES6+ features',
      targetFiles: ['src/legacy-code.js'],
      transformationType: 'llm',
      maxComplexity: 15,
      dryRun: false,
    },
    context: {
      projectType: 'javascript',
      priority: 'normal',
    },
  },
});

actor.start();
const result = await new Promise((resolve) => {
  actor.subscribe((state) => {
    if (state.status === 'done') {
      resolve(state.output);
    }
  });
});

console.log(`Transformed ${result.filesModified.length} files`);
console.log(`Cost: $${result.totalCost?.toFixed(4)}`);
```

### Advanced Configuration with Fallback

```typescript
import { getLLMProviderManager } from './src/providers/llm-providers.js';

const providerManager = getLLMProviderManager();

// Make request with automatic fallback
const response = await providerManager.makeRequestWithFallback({
  prompt: 'Fix TypeScript type errors in this code...',
  systemPrompt: 'You are an expert TypeScript developer.',
  context: {
    language: 'typescript',
    complexity: 8,
    codeLength: 1500,
  },
  options: {
    stream: false,
    jsonMode: true,
    priority: 'high',
    maxRetries: 3,
  },
}, 'openai', {
  model: 'gpt-4',
  temperature: 0.1,
  maxTokens: 4000,
  costLimit: 1.0,
});

console.log(`Provider used: ${response.provider}`);
console.log(`Tokens used: ${response.usage?.totalTokens}`);
```

## Features

### 1. Intelligent Provider Fallback

The system automatically falls back to alternative providers if the primary provider fails:

```
OpenAI → Anthropic → OpenRouter → Local → Mock
```

### 2. Rate Limiting & Cost Control

- **Requests Per Minute (RPM)**: Configurable per provider
- **Tokens Per Minute (TPM)**: Prevents token limit exceeded errors
- **Cost Tracking**: Real-time cost monitoring with limits
- **Automatic Throttling**: Intelligent request spacing

### 3. Enhanced Prompt Engineering

The system generates context-aware prompts based on:
- **Code Language**: TypeScript, JavaScript, Python, etc.
- **Framework Detection**: React, Vue, Angular, Express
- **Complexity Analysis**: Cyclomatic complexity scoring
- **Code Issues**: Detected anti-patterns and problems
- **Project Context**: File structure and dependencies

### 4. Validation & Safety

- **Syntax Validation**: Ensures transformed code is syntactically correct
- **Semantic Preservation**: Validates that functionality is maintained
- **Similarity Checking**: Prevents hallucination by checking code similarity
- **Type Safety**: Maintains TypeScript type correctness

### 5. Performance Monitoring

```typescript
// Example performance metrics
{
  totalTime: 2500,           // Total processing time (ms)
  averageTimePerFile: 1250,  // Average time per file (ms)
  successRate: 0.95,         // 95% success rate
  totalTokensUsed: 3500,     // Total tokens consumed
  totalCost: 0.105,          // Total cost in USD
  providersUsed: ['openai', 'anthropic'], // Providers utilized
}
```

## Integration with Existing Pipeline

The real LLM providers integrate seamlessly with the existing transformation pipeline:

### Template → AST → LLM Hierarchy

1. **Template Engine**: Fast, pattern-based transformations
2. **AST-grep**: Syntax tree transformations for complex patterns
3. **LLM Providers**: AI-powered transformations for complex logic

### Validation Actor Integration

The validation actor now uses real LLM providers for automatic type error fixing:

```typescript
// Automatic TypeScript error fixing
const result = await validationActor.invoke({
  type: 'typeFix',
  files: ['src/component.tsx'],
  errors: typeErrors, // TypeScript compiler errors
});
```

## Cost Optimization

### Best Practices

1. **Use Template/AST First**: Reserve LLM for complex transformations
2. **Set Cost Limits**: Configure per-request and daily limits
3. **Choose Appropriate Models**: Use smaller models for simple tasks
4. **Batch Processing**: Group related transformations
5. **Cache Results**: Avoid duplicate transformations

### Cost Comparison

| Provider | Model | Cost per 1K tokens | Best Use Case |
|----------|-------|-------------------|---------------|
| OpenAI | GPT-4 | $0.030 | Complex reasoning |
| OpenAI | GPT-3.5-turbo | $0.002 | Simple transformations |
| Anthropic | Claude-3.5-Sonnet | $0.015 | Code analysis |
| OpenRouter | Llama-3.1-70B | $0.0009 | Cost-effective |
| Ollama | CodeLlama | Free | Privacy/offline |

## Security & Privacy

### API Key Management

- Store API keys in environment variables
- Use different keys for development/production
- Rotate keys regularly
- Monitor usage for anomalies

### Data Privacy

- **OpenAI**: Data not used for training (with API)
- **Anthropic**: Data not used for training
- **OpenRouter**: Varies by model provider
- **Ollama**: Complete privacy (local processing)

### Code Security

- Validate all LLM outputs before applying
- Sanitize prompts to prevent injection
- Use read-only API keys when possible
- Monitor for suspicious transformations

## Troubleshooting

### Common Issues

#### 1. API Key Not Working
```bash
# Check API key format
echo $OPENAI_API_KEY | head -c 10
# Should start with "sk-"

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### 2. Rate Limit Exceeded
```typescript
// Increase retry delays
{
  retries: 5,
  timeout: 60000,
  rateLimitRpm: 30, // Reduce requests per minute
}
```

#### 3. High Costs
```typescript
// Set strict cost limits
{
  costLimit: 0.10,        // 10 cents per transformation
  maxTokens: 2000,        // Reduce token usage
  temperature: 0.0,       // More deterministic = fewer retries
}
```

#### 4. Ollama Connection Issues
```bash
# Start Ollama service
ollama serve

# Pull required model
ollama pull codellama

# Test connection
curl http://localhost:11434/api/tags
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
CARMACK_LOG_LEVEL=debug
VERBOSE_LOGGING=true
DEBUG_MODE=true
```

## Migration from Mock

### Step 1: Update Environment
```bash
# Change from mock to real provider
LLM_PROVIDER=openai  # was: mock
```

### Step 2: Add API Keys
```bash
# Add your API keys
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 3: Test Integration
```bash
# Run the integration test
bun run test-real-llm-integration.ts
```

### Step 4: Monitor Usage
- Check cost tracking in logs
- Monitor API usage in provider dashboards
- Set up alerts for cost thresholds

## Future Enhancements

### Planned Features

1. **Multi-Model Ensembles**: Combine multiple models for better results
2. **Fine-Tuned Models**: Custom models trained on your codebase
3. **Streaming Responses**: Real-time transformation feedback
4. **Advanced Caching**: Semantic caching for similar transformations
5. **Model Performance Analytics**: A/B testing different models

### Contributing

To add support for new LLM providers:

1. Extend the `BaseLLMProvider` class
2. Implement the `makeRequest` method
3. Add provider configuration to schemas
4. Update the provider factory
5. Add tests and documentation

## Conclusion

The real LLM provider integration transforms Carmack Coder from a mock system into a production-ready AI-powered code transformation platform. With support for multiple providers, intelligent fallbacks, cost controls, and comprehensive monitoring, it provides enterprise-grade reliability while maintaining the flexibility needed for diverse development environments.

The system is designed to scale from individual developers using local models to large teams leveraging cloud-based AI services, all while maintaining code quality, security, and cost efficiency.