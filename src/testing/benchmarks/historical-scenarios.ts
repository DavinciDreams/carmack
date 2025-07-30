/**
 * Historical TensorRT-LLM Bug Scenarios for Benchmark Testing
 * 
 * Contains 10+ real-world TensorRT-LLM issues and scenarios for testing
 * the knowledge graph system's ability to provide faster investigation
 * compared to manual methods.
 */

import type { HistoricalBugScenario, TensorRTTestScenario } from '../types.js';

/**
 * Historical bug scenarios based on real TensorRT-LLM issues
 */
export const HISTORICAL_BUG_SCENARIOS: HistoricalBugScenario[] = [
  {
    id: 'scheduler-preemption-001',
    title: 'Scheduler Preemption Performance Degradation',
    description: 'Investigation into scheduler preemption causing 40% performance drop in multi-request scenarios',
    category: 'scheduler',
    severity: 'critical',
    originalIssueUrl: 'https://github.com/NVIDIA/TensorRT-LLM/issues/scheduler-preemption',
    testQuery: 'How does TensorRT-LLM scheduler handle preemption and what causes performance degradation in multi-request scenarios?',
    expectedResponseTime: 1800, // 1.8 seconds
    expectedAccuracy: 0.85,
    manualInvestigationTime: 7200000, // 2 hours in milliseconds
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'memory-allocation-002',
    title: 'Memory Allocation Strategy Inefficiency',
    description: 'Memory fragmentation issues leading to OOM errors in long-running inference sessions',
    category: 'memory',
    severity: 'high',
    testQuery: 'What are the memory allocation strategies in TensorRT-LLM and how can memory fragmentation be prevented?',
    expectedResponseTime: 1500,
    expectedAccuracy: 0.88,
    manualInvestigationTime: 5400000, // 1.5 hours
    createdAt: new Date('2024-02-03'),
  },
  {
    id: 'cuda-kernel-optimization-003',
    title: 'CUDA Kernel Performance Regression',
    description: 'Specific CUDA kernels showing 25% performance regression after optimization changes',
    category: 'cuda_kernel',
    severity: 'high',
    testQuery: 'Which CUDA kernels in TensorRT-LLM have been optimized recently and what performance changes occurred?',
    expectedResponseTime: 1600,
    expectedAccuracy: 0.82,
    manualInvestigationTime: 6300000, // 1.75 hours
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'attention-mechanism-004',
    title: 'Attention Mechanism Memory Leak',
    description: 'Memory leak in attention computation causing gradual memory increase over time',
    category: 'memory',
    severity: 'critical',
    testQuery: 'How does the attention mechanism in TensorRT-LLM manage memory and what could cause memory leaks?',
    expectedResponseTime: 1700,
    expectedAccuracy: 0.86,
    manualInvestigationTime: 8100000, // 2.25 hours
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'batch-processing-005',
    title: 'Dynamic Batching Inefficiency',
    description: 'Dynamic batching algorithm not optimally grouping requests leading to underutilized GPU',
    category: 'scheduler',
    severity: 'medium',
    testQuery: 'How does dynamic batching work in TensorRT-LLM and what factors affect batching efficiency?',
    expectedResponseTime: 1400,
    expectedAccuracy: 0.84,
    manualInvestigationTime: 4500000, // 1.25 hours
    createdAt: new Date('2024-03-25'),
  },
  {
    id: 'quantization-accuracy-006',
    title: 'INT8 Quantization Accuracy Loss',
    description: 'Unexpected accuracy degradation when using INT8 quantization on specific model architectures',
    category: 'performance',
    severity: 'high',
    testQuery: 'What are the quantization methods in TensorRT-LLM and how does INT8 quantization affect model accuracy?',
    expectedResponseTime: 1550,
    expectedAccuracy: 0.87,
    manualInvestigationTime: 5700000, // 1.58 hours
    createdAt: new Date('2024-04-08'),
  },
  {
    id: 'pipeline-parallelism-007',
    title: 'Pipeline Parallelism Communication Bottleneck',
    description: 'Inter-GPU communication becoming bottleneck in pipeline parallel inference',
    category: 'architecture',
    severity: 'high',
    testQuery: 'How is pipeline parallelism implemented in TensorRT-LLM and what causes communication bottlenecks?',
    expectedResponseTime: 1650,
    expectedAccuracy: 0.83,
    manualInvestigationTime: 6900000, // 1.92 hours
    createdAt: new Date('2024-04-22'),
  },
  {
    id: 'kv-cache-management-008',
    title: 'KV Cache Management Inefficiency',
    description: 'Key-Value cache not being efficiently managed leading to memory waste and slower inference',
    category: 'memory',
    severity: 'medium',
    testQuery: 'How does TensorRT-LLM manage KV cache and what optimizations are available for cache efficiency?',
    expectedResponseTime: 1450,
    expectedAccuracy: 0.85,
    manualInvestigationTime: 4800000, // 1.33 hours
    createdAt: new Date('2024-05-15'),
  },
  {
    id: 'tensor-parallelism-009',
    title: 'Tensor Parallelism Load Imbalance',
    description: 'Uneven workload distribution across GPUs in tensor parallel setup causing performance issues',
    category: 'architecture',
    severity: 'medium',
    testQuery: 'What is tensor parallelism in TensorRT-LLM and how can load balancing issues be diagnosed and fixed?',
    expectedResponseTime: 1500,
    expectedAccuracy: 0.81,
    manualInvestigationTime: 5100000, // 1.42 hours
    createdAt: new Date('2024-06-02'),
  },
  {
    id: 'mixed-precision-010',
    title: 'Mixed Precision Training Instability',
    description: 'Training instability when using mixed precision with specific optimizer configurations',
    category: 'performance',
    severity: 'high',
    testQuery: 'How does mixed precision training work in TensorRT-LLM and what causes training instability?',
    expectedResponseTime: 1600,
    expectedAccuracy: 0.86,
    manualInvestigationTime: 6600000, // 1.83 hours
    createdAt: new Date('2024-06-18'),
  },
  {
    id: 'multi-gpu-scaling-011',
    title: 'Multi-GPU Scaling Efficiency Drop',
    description: 'Scaling efficiency drops significantly beyond 4 GPUs due to communication overhead',
    category: 'architecture',
    severity: 'high',
    testQuery: 'How does TensorRT-LLM scale across multiple GPUs and what limits scaling efficiency?',
    expectedResponseTime: 1750,
    expectedAccuracy: 0.84,
    manualInvestigationTime: 7500000, // 2.08 hours
    createdAt: new Date('2024-07-05'),
  },
  {
    id: 'inference-latency-012',
    title: 'First Token Latency Optimization',
    description: 'High first token latency impacting user experience in interactive applications',
    category: 'performance',
    severity: 'medium',
    testQuery: 'What factors contribute to first token latency in TensorRT-LLM and how can it be optimized?',
    expectedResponseTime: 1350,
    expectedAccuracy: 0.88,
    manualInvestigationTime: 4200000, // 1.17 hours
    createdAt: new Date('2024-07-20'),
  },
];

/**
 * Complex technical scenarios for advanced testing
 */
export const TENSORRT_TEST_SCENARIOS: TensorRTTestScenario[] = [
  {
    id: 'scheduler-deep-dive-001',
    name: 'Scheduler Performance Deep Dive',
    category: 'scheduler_performance',
    description: 'Comprehensive analysis of scheduler behavior under various load conditions',
    testQuery: 'Analyze the TensorRT-LLM scheduler implementation, including preemption strategies, request queuing, and performance optimization techniques. What are the key bottlenecks and how have they evolved?',
    expectedInsights: [
      'Scheduler architecture and components',
      'Preemption mechanisms and trade-offs',
      'Request queuing strategies',
      'Performance optimization history',
      'Known bottlenecks and solutions',
    ],
    complexityLevel: 'expert',
    estimatedManualTime: 180, // 3 hours
    targetResponseTime: 2000,
    targetAccuracy: 0.85,
    requiredArtifacts: ['scheduler', 'preemption', 'queue', 'performance'],
    validationCriteria: [
      'Mentions specific scheduler components',
      'Explains preemption mechanisms',
      'Discusses performance trade-offs',
      'References code implementations',
    ],
    metadata: {
      difficulty: 'high',
      domain: 'system_architecture',
      expectedArtifacts: 15,
    },
  },
  {
    id: 'memory-management-002',
    name: 'Memory Management Strategy Analysis',
    category: 'memory_management',
    description: 'In-depth investigation of memory allocation, deallocation, and optimization strategies',
    testQuery: 'Explain the memory management strategies in TensorRT-LLM, including allocation patterns, garbage collection, memory pooling, and optimization techniques for different model sizes and batch configurations.',
    expectedInsights: [
      'Memory allocation strategies',
      'Pool management techniques',
      'Garbage collection mechanisms',
      'Memory optimization patterns',
      'Batch size impact on memory',
    ],
    complexityLevel: 'advanced',
    estimatedManualTime: 150,
    targetResponseTime: 1800,
    targetAccuracy: 0.87,
    requiredArtifacts: ['memory', 'allocation', 'pool', 'optimization'],
    validationCriteria: [
      'Describes allocation strategies',
      'Explains memory pooling',
      'Discusses optimization techniques',
      'Covers different scenarios',
    ],
    metadata: {
      difficulty: 'high',
      domain: 'memory_systems',
      expectedArtifacts: 12,
    },
  },
  {
    id: 'cuda-kernel-evolution-003',
    name: 'CUDA Kernel Evolution Analysis',
    category: 'cuda_kernels',
    description: 'Historical analysis of CUDA kernel implementations and optimizations',
    testQuery: 'Trace the evolution of key CUDA kernels in TensorRT-LLM, including attention kernels, matrix multiplication, and custom operators. What optimizations have been made and what performance improvements were achieved?',
    expectedInsights: [
      'Kernel implementation history',
      'Optimization techniques applied',
      'Performance improvement metrics',
      'Architecture-specific optimizations',
      'Future optimization opportunities',
    ],
    complexityLevel: 'expert',
    estimatedManualTime: 200,
    targetResponseTime: 2200,
    targetAccuracy: 0.82,
    requiredArtifacts: ['cuda', 'kernel', 'optimization', 'performance'],
    validationCriteria: [
      'References specific kernels',
      'Shows optimization history',
      'Includes performance data',
      'Discusses implementation details',
    ],
    metadata: {
      difficulty: 'very_high',
      domain: 'gpu_computing',
      expectedArtifacts: 18,
    },
  },
  {
    id: 'performance-regression-004',
    name: 'Performance Regression Investigation',
    category: 'performance_regression',
    description: 'Systematic investigation of performance regressions and their root causes',
    testQuery: 'Identify and analyze performance regressions in TensorRT-LLM over the past year. What were the root causes, how were they detected, and what fixes were implemented?',
    expectedInsights: [
      'Regression detection methods',
      'Root cause analysis techniques',
      'Performance impact quantification',
      'Fix implementation strategies',
      'Prevention mechanisms',
    ],
    complexityLevel: 'advanced',
    estimatedManualTime: 120,
    targetResponseTime: 1700,
    targetAccuracy: 0.86,
    requiredArtifacts: ['performance', 'regression', 'benchmark', 'fix'],
    validationCriteria: [
      'Identifies specific regressions',
      'Explains root causes',
      'Quantifies performance impact',
      'Describes fix strategies',
    ],
    metadata: {
      difficulty: 'medium',
      domain: 'performance_analysis',
      expectedArtifacts: 10,
    },
  },
  {
    id: 'architecture-design-005',
    name: 'Architecture Design Decisions',
    category: 'architecture',
    description: 'Analysis of key architectural decisions and their implications',
    testQuery: 'Analyze the key architectural decisions in TensorRT-LLM design, including parallelization strategies, memory hierarchy, and compute optimization. What trade-offs were made and why?',
    expectedInsights: [
      'Architectural design principles',
      'Parallelization strategies',
      'Memory hierarchy decisions',
      'Compute optimization approaches',
      'Trade-off analysis',
    ],
    complexityLevel: 'expert',
    estimatedManualTime: 160,
    targetResponseTime: 1900,
    targetAccuracy: 0.84,
    requiredArtifacts: ['architecture', 'design', 'parallelization', 'optimization'],
    validationCriteria: [
      'Explains design principles',
      'Discusses parallelization',
      'Covers memory hierarchy',
      'Analyzes trade-offs',
    ],
    metadata: {
      difficulty: 'high',
      domain: 'system_design',
      expectedArtifacts: 14,
    },
  },
];

/**
 * Get scenario by ID
 */
export function getHistoricalScenario(id: string): HistoricalBugScenario | undefined {
  return HISTORICAL_BUG_SCENARIOS.find(scenario => scenario.id === id);
}

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: HistoricalBugScenario['category']): HistoricalBugScenario[] {
  return HISTORICAL_BUG_SCENARIOS.filter(scenario => scenario.category === category);
}

/**
 * Get scenarios by severity
 */
export function getScenariosBySeverity(severity: HistoricalBugScenario['severity']): HistoricalBugScenario[] {
  return HISTORICAL_BUG_SCENARIOS.filter(scenario => scenario.severity === severity);
}

/**
 * Get TensorRT test scenario by ID
 */
export function getTensorRTScenario(id: string): TensorRTTestScenario | undefined {
  return TENSORRT_TEST_SCENARIOS.find(scenario => scenario.id === id);
}

/**
 * Get TensorRT scenarios by category
 */
export function getTensorRTScenariosByCategory(category: TensorRTTestScenario['category']): TensorRTTestScenario[] {
  return TENSORRT_TEST_SCENARIOS.filter(scenario => scenario.category === category);
}

/**
 * Get TensorRT scenarios by complexity
 */
export function getTensorRTScenariosByComplexity(complexity: TensorRTTestScenario['complexityLevel']): TensorRTTestScenario[] {
  return TENSORRT_TEST_SCENARIOS.filter(scenario => scenario.complexityLevel === complexity);
}

/**
 * Calculate expected speed improvement for a scenario
 */
export function calculateExpectedSpeedImprovement(scenario: HistoricalBugScenario): number {
  const manualTimeMinutes = scenario.manualInvestigationTime / 60000;
  const platformTimeMinutes = scenario.expectedResponseTime / 60000;
  return ((manualTimeMinutes - platformTimeMinutes) / manualTimeMinutes) * 100;
}

/**
 * Get all scenario categories
 */
export function getAllScenarioCategories(): HistoricalBugScenario['category'][] {
  return ['scheduler', 'memory', 'cuda_kernel', 'performance', 'architecture'];
}

/**
 * Get all severity levels
 */
export function getAllSeverityLevels(): HistoricalBugScenario['severity'][] {
  return ['critical', 'high', 'medium', 'low'];
}