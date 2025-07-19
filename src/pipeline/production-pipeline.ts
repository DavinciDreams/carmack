import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type ActorLogic, createActor, fromPromise } from 'xstate';
import { z } from 'zod';
import { astGrepTransformationActor } from '../actors/ast-grep-transformation.ts';
import { feedbackLoopActor } from '../actors/feedback-loop.ts';
// import { complexityActor } from '../actors/complexity.ts';
import { llmTestingFrameworkActor } from '../actors/llm-testing-framework.ts';
import { llmTransformationActor } from '../actors/llm-transformation.ts';
import { patternDiscoveryActor } from '../actors/pattern-discovery.ts';
import { patternLearningActor } from '../actors/pattern-learning.ts';
// Import all our transformation systems
import { templateEngineActor } from '../actors/template-engine.ts';
import { validationActor } from '../actors/validation.ts';

// Import standardized result types
import type {
  AstGrepResult,
  FeedbackLoopResult,
  LLMTestingResult,
  LLMTransformationResult,
  PatternDiscoveryResult,
  PatternLearningResult,
  TemplateEngineResult,
  ValidationActorResult,
} from '../types.ts';

// Define pipeline state interface
interface PipelineState {
  transformationId: string;
  startTime: number;
  stageTimings: Record<string, number>;
  filesModified: string[];
  transformationsApplied: Array<{
    type: 'template' | 'ast' | 'llm';
    patternsUsed: string[];
    executionTime: number;
    success: boolean;
    confidence: number;
    metadata?: Record<string, unknown>;
  }>;
  errors: Array<{
    stage: string;
    error: string;
    message: string;
    severity: 'warning' | 'error' | 'critical';
    recoverable: boolean;
  }>;
  validationResults?: {
    typeErrors: number;
    formatIssues: number;
    qualityIssues: number;
  };
  testResults?: {
    passed: number;
    failed: number;
    coverage: number;
  };
  discoveredPatterns?: unknown[];
  patternDiscoverySummary?: {
    totalAnalyzed: number;
    patternsDiscovered: number;
    averageConfidence: number;
    categories: string[];
  };
  patternLearningResult?: {
    recommendations: string[];
    newPatterns: unknown[];
    optimizedPatterns: unknown[];
    deprecatedPatterns?: unknown[];
    insights?: unknown[];
    metrics?: {
      patternsDiscovered: number;
      patternsOptimized: number;
      averageConfidence: number;
      learningTime: number;
    };
  };
  feedbackResult?: FeedbackLoopResult;
  feedbackScore?: number;
  metrics?: {
    [key: string]: unknown;
  };
  qualityScore?: number;
  qualityImprovement?: number;
  transformationReport?: unknown;
}

// Helper function to invoke actors with proper async handling
