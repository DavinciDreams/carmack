# Pattern Learning System Documentation

## Overview

The Pattern Learning System is a machine learning-based component of the Carmack Coder that continuously improves code transformation patterns through experience. It analyzes transformation results, discovers new patterns, and optimizes existing ones based on success rates and performance metrics.

## Table of Contents

- [Architecture](#architecture)
- [Core Concepts](#core-concepts)
- [Learning Operations](#learning-operations)
- [Pattern Lifecycle](#pattern-lifecycle)
- [Data Structures](#data-structures)
- [Integration](#integration)
- [Usage Examples](#usage-examples)
- [Performance Metrics](#performance-metrics)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Pattern Learning System                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Pattern       │  │   Effectiveness │  │   Discovery  │ │
│  │   Learner       │  │   Tracker       │  │   Engine     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Data          │  │   Context       │  │   Lifecycle  │ │
│  │   Persistence   │  │   Analyzer      │  │   Manager    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Carmack Coder

The Pattern Learning System integrates with the main XState machine at the `learningFromFeedback` state:

```typescript
learningFromFeedback: {
  invoke: {
    id: 'pattern-learning',
    src: 'patternLearningActor',
    input: ({ context }) => ({
      operation: 'learn',
      transformation: context.currentTransformation,
      patterns: context.patterns,
      context: { /* codebase and environment context */ }
    })
  }
}
```

## Core Concepts

### 1. Pattern Effectiveness

Each pattern is tracked with comprehensive effectiveness metrics:

- **Success Rate**: Percentage of successful applications (0-1)
- **Average Performance**: Mean execution time in milliseconds
- **Complexity Reduction**: How much the pattern reduces code complexity
- **Error Rate**: Percentage of failed applications (0-1)
- **User Satisfaction**: User feedback score (0-10)
- **Applicability Score**: How often the pattern is applicable (0-1)
- **Usage Count**: Total number of times the pattern has been used
- **Lifecycle Stage**: Current maturity level (experimental, stable, mature, deprecated)

### 2. Learning Context

The system considers rich context for better learning:

```typescript
interface LearningContext {
  codebase: {
    language: string;        // Programming language
    framework?: string;      // Detected framework (React, Vue, etc.)
    complexity: number;      // Overall codebase complexity (1-10)
    size: number;           // Estimated lines of code
  };
  environment: {
    success: boolean;        // Whether transformation succeeded
    performance: {
      transformationTime: number;  // Time taken in milliseconds
      memoryUsage?: number;       // Optional memory metrics
      cpuUsage?: number;          // Optional CPU metrics
    };
    userFeedback?: number;   // Optional user rating (0-10)
  };
}
```

### 3. Pattern Discovery

The system automatically discovers new patterns by analyzing:

- **Before/After Code Comparisons**: Identifies common transformation patterns
- **Frequency Analysis**: Finds patterns that occur multiple times
- **Context Correlation**: Associates patterns with specific contexts
- **Success Pattern Recognition**: Identifies what makes transformations successful

## Learning Operations

### 1. Learn Operation

Analyzes completed transformations to update pattern effectiveness:

```typescript
const learningInput = {
  operation: 'learn',
  transformation: {
    id: 'transform-123',
    mode: 'template',
    filesModified: ['src/utils.ts'],
    startTime: 1640995200000,
    endTime: 1640995205000,
    errors: []
  },
  patterns: [/* applied patterns */],
  context: {/* learning context */}
};
```

**What it does:**
- Updates success rates for applied patterns
- Records performance metrics
- Discovers new patterns from successful transformations
- Generates insights and recommendations

### 2. Discover Operation

Actively searches for new patterns in transformation history:

```typescript
const discoveryInput = {
  operation: 'discover',
  context: {
    codebase: {
      language: 'typescript',
      complexity: 5,
      size: 10000
    }
  }
};
```

**What it does:**
- Analyzes transformation history for common patterns
- Identifies high-confidence patterns (>70% confidence, ≥3 occurrences)
- Creates new pattern definitions
- Provides recommendations for pattern testing

### 3. Optimize Operation

Improves existing patterns based on performance data:

```typescript
const optimizeInput = {
  operation: 'optimize',
  patterns: [/* patterns to optimize */]
};
```

**What it does:**
- Promotes successful experimental patterns to stable
- Deprecates consistently failing patterns
- Adjusts pattern complexity and risk levels
- Suggests performance improvements

### 4. Evaluate Operation

Assesses the effectiveness of current patterns:

```typescript
const evaluateInput = {
  operation: 'evaluate',
  patterns: [/* patterns to evaluate */]
};
```

**What it does:**
- Provides effectiveness reports for each pattern
- Calculates overall pattern performance
- Identifies patterns needing attention
- Suggests optimization opportunities

## Pattern Lifecycle

Patterns progress through distinct lifecycle stages:

### 1. Experimental (New Patterns)
- **Characteristics**: Recently discovered, limited usage data
- **Risk Level**: Medium to High
- **Usage**: Limited, monitored closely
- **Promotion Criteria**: >80% success rate with >10 uses

### 2. Stable (Proven Patterns)
- **Characteristics**: Consistent performance, good success rate
- **Risk Level**: Low to Medium
- **Usage**: General availability
- **Promotion Criteria**: >95% success rate with >50 uses

### 3. Mature (Battle-Tested Patterns)
- **Characteristics**: Excellent performance, very reliable
- **Risk Level**: Low
- **Usage**: Preferred for production
- **Deprecation Criteria**: Superseded by better patterns

### 4. Deprecated (Obsolete Patterns)
- **Characteristics**: Poor performance or superseded
- **Risk Level**: High
- **Usage**: Disabled, marked for removal
- **Action**: Remove from active patterns

## Data Structures

### Pattern Effectiveness Schema

```typescript
interface PatternEffectiveness {
  patternId: string;
  successRate: number;           // 0-1
  averagePerformance: number;    // milliseconds
  complexityReduction: number;   // positive = reduced complexity
  errorRate: number;             // 0-1
  userSatisfaction: number;      // 0-10
  applicabilityScore: number;    // 0-1
  lastUpdated: number;           // timestamp
  usageCount: number;            // total uses
  lifecycle: 'experimental' | 'stable' | 'mature' | 'deprecated';
}
```

### Discovered Pattern Schema

```typescript
interface DiscoveredPattern {
  id: string;
  confidence: number;            // 0-1
  frequency: number;             // occurrence count
  context: {
    language: string;
    framework?: string;
    complexity: number;
    fileTypes: string[];
  };
  pattern: {
    before: string;              // code before transformation
    after: string;               // code after transformation
    variables?: string[];        // extracted variables
  };
  metadata: {
    discoveredAt: number;        // timestamp
    examples: Array<{
      file: string;
      lineNumber: number;
      context: string;
    }>;
    relatedPatterns?: string[];  // related pattern IDs
  };
}
```

### Learning Result Schema

```typescript
interface LearningResult {
  newPatterns: LearnedPattern[];      // newly discovered patterns
  optimizedPatterns: LearnedPattern[]; // improved patterns
  deprecatedPatterns: string[];       // deprecated pattern IDs
  insights: string[];                 // human-readable insights
  recommendations: string[];          // actionable recommendations
  metrics: {
    patternsDiscovered: number;
    patternsOptimized: number;
    averageConfidence: number;
    learningTime: number;             // milliseconds
  };
}
```

## Integration

### XState Machine Integration

The Pattern Learning System integrates seamlessly with the main Carmack Coder state machine:

```typescript
// In machine.ts
import { patternLearningActor } from './actors/pattern-learning.ts';

const machine = setup({
  actors: {
    // ... other actors
    patternLearningActor,
  }
}).createMachine({
  // ... states
  learningFromFeedback: {
    invoke: {
      id: 'pattern-learning',
      src: 'patternLearningActor',
      input: ({ context }) => ({
        operation: 'learn',
        transformation: context.currentTransformation,
        patterns: context.patterns,
        context: {
          codebase: {
            language: 'typescript',
            complexity: context.currentTransformation?.complexity?.cyclomaticComplexity || 5,
            size: context.activeFiles.length * 100,
          },
          environment: {
            success: context.currentTransformation?.errors.length === 0,
            performance: {
              transformationTime: context.currentTransformation?.endTime && 
                context.currentTransformation?.startTime ? 
                context.currentTransformation.endTime - context.currentTransformation.startTime : 0,
            },
          },
        },
      }),
      onDone: {
        target: 'generatingSummary',
        actions: assign(({ context, event }) => ({
          ...context,
          patterns: [...context.patterns, ...(event.output.newPatterns || [])],
        })),
      },
    },
  },
});
```

### Data Persistence

The system automatically persists learning data to JSON files:

- **`./data/pattern-effectiveness.json`**: Pattern effectiveness metrics
- **`./data/discovered-patterns.json`**: Discovered pattern definitions

Data is loaded on system startup and saved after each learning operation.

## Usage Examples

### Basic Learning from Transformation

```typescript
import { PatternLearner } from './src/actors/pattern-learning.js';

const learner = new PatternLearner();

// Learn from a successful transformation
const result = await learner.processLearningRequest({
  operation: 'learn',
  transformation: {
    id: 'transform-var-to-const',
    mode: 'template',
    filesModified: ['src/utils.ts', 'src/helpers.ts'],
    startTime: Date.now() - 5000,
    endTime: Date.now(),
    errors: [],
    summary: 'Successfully converted var declarations to const'
  },
  patterns: [
    {
      id: 'var-to-const',
      language: 'typescript',
      pattern: 'var $name = $value',
      replacement: 'const $name = $value',
      description: 'Convert var to const',
      complexity: 1,
      riskLevel: 'low',
      mode: 'template'
    }
  ],
  context: {
    codebase: {
      language: 'typescript',
      framework: 'React',
      complexity: 4,
      size: 5000
    },
    environment: {
      success: true,
      performance: {
        transformationTime: 2500
      }
    }
  }
});

console.log('Learning insights:', result.insights);
console.log('New patterns discovered:', result.newPatterns.length);
```

### Pattern Discovery

```typescript
// Discover new patterns from transformation history
const discoveryResult = await learner.processLearningRequest({
  operation: 'discover',
  context: {
    codebase: {
      language: 'typescript',
      complexity: 6,
      size: 15000
    }
  }
});

console.log('Patterns discovered:', discoveryResult.metrics.patternsDiscovered);
console.log('Recommendations:', discoveryResult.recommendations);
```

### Pattern Optimization

```typescript
// Optimize existing patterns
const optimizationResult = await learner.processLearningRequest({
  operation: 'optimize',
  patterns: existingPatterns
});

console.log('Patterns optimized:', optimizationResult.metrics.patternsOptimized);
console.log('Deprecated patterns:', optimizationResult.deprecatedPatterns);
```

### Pattern Evaluation

```typescript
// Evaluate pattern effectiveness
const evaluationResult = await learner.processLearningRequest({
  operation: 'evaluate',
  patterns: currentPatterns
});

console.log('Average effectiveness:', evaluationResult.metrics.averageConfidence);
console.log('Performance insights:', evaluationResult.insights);
```

## Performance Metrics

The system tracks comprehensive performance metrics:

### Learning Performance
- **Learning Time**: Time taken for each learning operation
- **Pattern Discovery Rate**: Number of patterns discovered per operation
- **Optimization Success Rate**: Percentage of successful optimizations

### Pattern Performance
- **Success Rate**: Pattern application success percentage
- **Average Execution Time**: Mean time for pattern application
- **Memory Usage**: Memory consumption during pattern application
- **Error Rate**: Percentage of failed pattern applications

### System Performance
- **Cache Hit Rate**: Effectiveness of pattern caching
- **Data Persistence Time**: Time to save/load learning data
- **Context Analysis Time**: Time to analyze transformation context

## Configuration

### Environment Variables

```bash
# Pattern learning configuration
PATTERN_LEARNING_ENABLED=true
PATTERN_DISCOVERY_THRESHOLD=0.7
PATTERN_MIN_FREQUENCY=3
PATTERN_OPTIMIZATION_INTERVAL=100
LEARNING_DATA_PATH=./data
```

### Runtime Configuration

```typescript
const learner = new PatternLearner({
  discoveryThreshold: 0.8,        // Minimum confidence for pattern discovery
  minFrequency: 5,                // Minimum occurrences for pattern discovery
  optimizationInterval: 50,       // Optimize patterns every N transformations
  dataPath: './custom-data-path', // Custom data persistence path
  enableCaching: true,            // Enable pattern effectiveness caching
  maxCacheSize: 1000,            // Maximum cache entries
});
```

## Troubleshooting

### Common Issues

#### 1. Pattern Learning Not Working

**Symptoms**: No patterns being discovered or optimized

**Solutions**:
- Check that `enableLearning` is true in machine context
- Verify transformation data includes required fields
