#!/usr/bin/env bun

/**
 * TensorRT Knowledge Graph - Example Scenarios
 *
 * This file contains realistic TensorRT investigation scenarios that demonstrate
 * the knowledge graph platform's capabilities for different use cases.
 */

export interface ScenarioExample {
  id: string;
  title: string;
  description: string;
  userPersona: 'engineer' | 'researcher' | 'manager';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  queries: Array<{
    query: string;
    expectedIntent: string;
    expectedResults: string[];
    explanation: string;
  }>;
  expectedOutcomes: string[];
  relatedConcepts: string[];
}

export const TENSORRT_SCENARIOS: ScenarioExample[] = [
  {
    id: 'cuda-optimization-investigation',
    title: 'CUDA Kernel Optimization Investigation',
    description:
      'A software engineer needs to optimize a slow convolution operation in their TensorRT deployment',
    userPersona: 'engineer',
    difficulty: 'intermediate',
    estimatedTime: '15-20 minutes',
    queries: [
      {
        query: 'Find CUDA kernel implementations for convolution operations',
        expectedIntent: 'code_search',
        expectedResults: ['convolution_kernel.cu', 'im2col_kernel.cu', 'gemm_convolution.cu'],
        explanation:
          'Locate existing convolution kernel implementations to understand current optimization techniques',
      },
      {
        query: 'Show me memory coalescing patterns in CUDA kernels',
        expectedIntent: 'pattern_analysis',
        expectedResults: [
          'coalesced_memory_access_pattern',
          'shared_memory_optimization',
          'bank_conflict_avoidance',
        ],
        explanation: 'Identify memory access patterns that improve GPU memory throughput',
      },
      {
        query: 'How does TensorRT optimize convolution for different input sizes?',
        expectedIntent: 'optimization_advice',
        expectedResults: [
          'dynamic_kernel_selection',
          'tile_size_optimization',
          'workspace_management',
        ],
        explanation:
          'Understand how TensorRT adapts convolution algorithms based on input dimensions',
      },
      {
        query: 'Find performance benchmarking code for convolution kernels',
        expectedIntent: 'performance_analysis',
        expectedResults: ['conv_benchmark.cpp', 'kernel_timing.cu', 'performance_profiler.cpp'],
        explanation: 'Locate benchmarking infrastructure to measure optimization improvements',
      },
    ],
    expectedOutcomes: [
      'Identified 3-5 different convolution kernel implementations',
      'Discovered memory optimization patterns applicable to the use case',
      'Found benchmarking tools to measure performance improvements',
      "Understood TensorRT's adaptive optimization strategies",
    ],
    relatedConcepts: [
      'CUDA memory hierarchy',
      'Kernel fusion techniques',
      'Dynamic algorithm selection',
      'Performance profiling',
    ],
  },

  {
    id: 'precision-quantization-research',
    title: 'Precision and Quantization Research',
    description: 'An AI researcher investigating quantization techniques for model compression',
    userPersona: 'researcher',
    difficulty: 'advanced',
    estimatedTime: '25-30 minutes',
    queries: [
      {
        query: 'Compare FP16 and INT8 quantization implementations in TensorRT',
        expectedIntent: 'architecture_question',
        expectedResults: ['fp16_quantizer.cpp', 'int8_calibrator.cpp', 'precision_converter.cu'],
        explanation: 'Understand the architectural differences between precision formats',
      },
      {
        query: 'How does TensorRT implement calibration for INT8 quantization?',
        expectedIntent: 'api_usage',
        expectedResults: [
          'IInt8Calibrator interface',
          'calibration_dataset.cpp',
          'entropy_calibrator.cpp',
        ],
        explanation:
          'Learn the calibration process for maintaining accuracy with reduced precision',
      },
      {
        query: 'Find research papers and references on quantization techniques',
        expectedIntent: 'general_question',
        expectedResults: [
          'quantization_references.md',
          'research_citations.txt',
          'algorithm_papers.bib',
        ],
        explanation: 'Access academic references and research background',
      },
      {
        query: 'Show me quantization accuracy validation methods',
        expectedIntent: 'debugging_help',
        expectedResults: [
          'accuracy_validator.cpp',
          'quantization_metrics.py',
          'precision_tester.cpp',
        ],
        explanation:
          "Find tools to validate quantization doesn't significantly impact model accuracy",
      },
    ],
    expectedOutcomes: [
      'Comprehensive understanding of TensorRT quantization pipeline',
      'Knowledge of calibration techniques and their trade-offs',
      'Access to validation tools for accuracy assessment',
      'References to cutting-edge quantization research',
    ],
    relatedConcepts: [
      'Neural network quantization',
      'Calibration datasets',
      'Accuracy-performance trade-offs',
      'Hardware-specific optimizations',
    ],
  },

  {
    id: 'deployment-architecture-overview',
    title: 'TensorRT Deployment Architecture Overview',
    description:
      'An engineering manager needs to understand TensorRT architecture for deployment planning',
    userPersona: 'manager',
    difficulty: 'beginner',
    estimatedTime: '10-15 minutes',
    queries: [
      {
        query: 'What are the main components of TensorRT architecture?',
        expectedIntent: 'architecture_question',
        expectedResults: ['Builder API', 'Runtime API', 'Parser components', 'Plugin system'],
        explanation: "Get high-level overview of TensorRT's modular architecture",
      },
      {
        query: 'How does TensorRT handle model serialization and deployment?',
        expectedIntent: 'general_question',
        expectedResults: ['engine_serialization.cpp', 'model_deployment.py', 'runtime_loading.cpp'],
        explanation: 'Understand the model deployment workflow from training to inference',
      },
      {
        query: 'What are the performance characteristics of different TensorRT components?',
        expectedIntent: 'performance_analysis',
        expectedResults: [
          'performance_benchmarks.md',
          'component_profiling.cpp',
          'optimization_metrics.json',
        ],
        explanation: 'Assess performance implications for deployment planning',
      },
      {
        query: 'Show me error handling and monitoring patterns in TensorRT',
        expectedIntent: 'debugging_help',
        expectedResults: ['error_handling.cpp', 'logging_system.cpp', 'monitoring_hooks.py'],
        explanation: 'Understand operational considerations for production deployment',
      },
    ],
    expectedOutcomes: [
      "Clear understanding of TensorRT's modular architecture",
      'Knowledge of deployment workflow and requirements',
      'Performance characteristics for capacity planning',
      'Operational patterns for production monitoring',
    ],
    relatedConcepts: [
      'Model optimization pipeline',
      'Production deployment patterns',
      'Performance monitoring',
      'Error handling strategies',
    ],
  },

  {
    id: 'plugin-development-workflow',
    title: 'Custom Plugin Development Workflow',
    description: 'Developing a custom TensorRT plugin for a novel neural network layer',
    userPersona: 'engineer',
    difficulty: 'advanced',
    estimatedTime: '30-40 minutes',
    queries: [
      {
        query: 'Find examples of custom TensorRT plugin implementations',
        expectedIntent: 'code_search',
        expectedResults: [
          'custom_plugin_example.cpp',
          'plugin_creator.cpp',
          'layer_implementation.cu',
        ],
        explanation: 'Study existing plugin implementations as templates',
      },
      {
        query: 'How do I implement the IPluginV2DynamicExt interface?',
        expectedIntent: 'api_usage',
        expectedResults: [
          'IPluginV2DynamicExt documentation',
          'plugin_interface.hpp',
          'dynamic_plugin_example.cpp',
        ],
        explanation: 'Learn the required interface methods for dynamic shape plugins',
      },
      {
        query: 'Show me plugin registration and factory patterns',
        expectedIntent: 'pattern_analysis',
        expectedResults: [
          'plugin_registry.cpp',
          'factory_pattern.cpp',
          'plugin_creator_registry.cpp',
        ],
        explanation: 'Understand how plugins are registered and instantiated',
      },
      {
        query: 'Find debugging and testing tools for TensorRT plugins',
        expectedIntent: 'debugging_help',
        expectedResults: ['plugin_tester.cpp', 'debug_utilities.hpp', 'validation_framework.cpp'],
        explanation: 'Locate tools for testing and validating custom plugin implementations',
      },
    ],
    expectedOutcomes: [
      'Complete understanding of plugin development lifecycle',
      'Working knowledge of required interfaces and patterns',
      'Access to debugging and testing infrastructure',
      'Best practices for plugin performance optimization',
    ],
    relatedConcepts: [
      'Plugin architecture patterns',
      'Dynamic shape handling',
      'CUDA kernel integration',
      'Performance optimization techniques',
    ],
  },

  {
    id: 'memory-optimization-investigation',
    title: 'Memory Usage Optimization Investigation',
    description: 'Investigating high memory usage in a TensorRT deployment',
    userPersona: 'engineer',
    difficulty: 'intermediate',
    estimatedTime: '20-25 minutes',
    queries: [
      {
        query: 'How does TensorRT manage GPU memory allocation?',
        expectedIntent: 'architecture_question',
        expectedResults: [
          'memory_allocator.cpp',
          'gpu_memory_manager.cu',
          'workspace_allocation.cpp',
        ],
        explanation: "Understand TensorRT's memory management strategies",
      },
      {
        query: 'Find memory profiling and debugging tools',
        expectedIntent: 'debugging_help',
        expectedResults: [
          'memory_profiler.cpp',
          'allocation_tracker.hpp',
          'memory_leak_detector.cpp',
        ],
        explanation: 'Locate tools to analyze memory usage patterns',
      },
      {
        query: 'Show me workspace size optimization techniques',
        expectedIntent: 'optimization_advice',
        expectedResults: ['workspace_optimizer.cpp', 'memory_pool.cpp', 'allocation_strategy.hpp'],
        explanation: 'Learn techniques to reduce memory footprint',
      },
      {
        query: 'What are common memory-related errors in TensorRT?',
        expectedIntent: 'debugging_help',
        expectedResults: ['memory_error_patterns.md', 'oom_handler.cpp', 'memory_validation.cpp'],
        explanation: 'Identify common memory issues and their solutions',
      },
    ],
    expectedOutcomes: [
      'Deep understanding of TensorRT memory management',
      'Tools and techniques for memory profiling',
      'Strategies for memory usage optimization',
      'Knowledge of common memory-related issues and fixes',
    ],
    relatedConcepts: [
      'GPU memory hierarchy',
      'Memory pool management',
      'Workspace optimization',
      'Memory leak detection',
    ],
  },

  {
    id: 'performance-regression-debugging',
    title: 'Performance Regression Debugging',
    description: 'Investigating a performance regression after a TensorRT version upgrade',
    userPersona: 'engineer',
    difficulty: 'advanced',
    estimatedTime: '35-45 minutes',
    queries: [
      {
        query: 'Find performance benchmarking and comparison tools',
        expectedIntent: 'performance_analysis',
        expectedResults: [
          'benchmark_suite.cpp',
          'performance_comparator.py',
          'regression_detector.cpp',
        ],
        explanation: 'Locate tools to measure and compare performance across versions',
      },
      {
        query: 'How has the optimization pipeline changed between versions?',
        expectedIntent: 'general_question',
        expectedResults: [
          'optimization_changelog.md',
          'version_differences.txt',
          'algorithm_updates.cpp',
        ],
        explanation: 'Understand what optimizations changed between TensorRT versions',
      },
      {
        query: 'Show me profiling tools for identifying performance bottlenecks',
        expectedIntent: 'debugging_help',
        expectedResults: [
          'profiler_integration.cpp',
          'bottleneck_analyzer.py',
          'timing_utilities.hpp',
        ],
        explanation: 'Find tools to identify where performance degradation occurs',
      },
      {
        query: 'Find configuration options that affect performance',
        expectedIntent: 'optimization_advice',
        expectedResults: ['builder_config.cpp', 'optimization_flags.hpp', 'performance_tuning.md'],
        explanation: 'Identify configuration parameters that might restore performance',
      },
    ],
    expectedOutcomes: [
      'Systematic approach to performance regression analysis',
      'Tools for measuring and comparing performance',
      'Understanding of version-specific optimization changes',
      'Configuration options to mitigate performance issues',
    ],
    relatedConcepts: [
      'Performance profiling',
      'Regression testing',
      'Optimization algorithms',
      'Configuration management',
    ],
  },
];

// Utility functions for scenario execution
export class ScenarioRunner {
  constructor(private oracleProcessor: any) {}

  async runScenario(scenarioId: string): Promise<void> {
    const scenario = TENSORRT_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    console.log(`\n🎯 Running Scenario: ${scenario.title}`);
    console.log('='.repeat(60));
    console.log(`Description: ${scenario.description}`);
    console.log(`User Persona: ${scenario.userPersona}`);
    console.log(`Difficulty: ${scenario.difficulty}`);
    console.log(`Estimated Time: ${scenario.estimatedTime}\n`);

    for (let i = 0; i < scenario.queries.length; i++) {
      const queryInfo = scenario.queries[i];
      console.log(`\n📋 Step ${i + 1}: ${queryInfo.explanation}`);
      console.log(`Query: "${queryInfo.query}"`);
      console.log(`Expected Intent: ${queryInfo.expectedIntent}`);
      console.log('Expected Results:', queryInfo.expectedResults.join(', '));

      // Process the actual query
      try {
        const result = await this.oracleProcessor.processQuery(queryInfo.query);
        console.log(`✅ Query processed successfully (${result.responseTime}ms)`);
        console.log(`   Found ${result.results.length} relevant entities`);
      } catch (error) {
        console.log(`❌ Query failed: ${error}`);
      }

      console.log('-'.repeat(40));
    }

    console.log('\n🎯 Expected Outcomes:');
    scenario.expectedOutcomes.forEach((outcome, i) => {
      console.log(`  ${i + 1}. ${outcome}`);
    });

    console.log('\n🔗 Related Concepts:');
    console.log(`   ${scenario.relatedConcepts.join(', ')}`);

    console.log(`\n✅ Scenario "${scenario.title}" completed!\n`);
  }

  listScenarios(): void {
    console.log('\n📚 Available TensorRT Investigation Scenarios:\n');

    TENSORRT_SCENARIOS.forEach((scenario, i) => {
      console.log(`${i + 1}. ${scenario.title}`);
      console.log(`   ID: ${scenario.id}`);
      console.log(`   Persona: ${scenario.userPersona} | Difficulty: ${scenario.difficulty}`);
      console.log(`   Time: ${scenario.estimatedTime}`);
      console.log(`   Description: ${scenario.description}\n`);
    });
  }

  getScenariosByPersona(persona: 'engineer' | 'researcher' | 'manager'): ScenarioExample[] {
    return TENSORRT_SCENARIOS.filter((s) => s.userPersona === persona);
  }

  getScenariosByDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): ScenarioExample[] {
    return TENSORRT_SCENARIOS.filter((s) => s.difficulty === difficulty);
  }
}

// Export for use in demo applications
export default TENSORRT_SCENARIOS;
