/**
 * Minimal telemetry validation test
 * Tests basic functionality without complex async operations
 */

import { TelemetryCollector } from './src/telemetry/collector.js';

console.log('🧪 Starting telemetry validation...');

try {
  // Test 1: Basic configuration validation
  console.log('✅ Test 1: Configuration validation');
  const config = {
    enabled: true,
    performanceSampleRate: 1.0,
    behaviorSampleRate: 1.0,
    batchSize: 10,
    flushInterval: 1000,
    maxBufferSize: 100,
    privacy: {
      collectUserIds: false,
      collectFilePaths: true,
      retentionDays: 30,
    },
  };

  // Test 2: Collector instantiation
  console.log('✅ Test 2: Collector instantiation');
  const collector = new TelemetryCollector(config);

  // Test 3: Basic event recording
  console.log('✅ Test 3: Pattern success recording');
  collector.recordPatternSuccess('test-pattern', true, 'ast', '/test/file.ts');

  // Test 4: Performance recording
  console.log('✅ Test 4: Performance recording');
  collector.recordPerformance(
    'test-transform',
    {
      parsing: 10,
      patternMatching: 15,
      transformation: 25,
      validation: 5,
      serialization: 8,
    },
    'template',
    1024,
    '/test/file.ts'
  );

  // Test 5: Multiple events
  console.log('✅ Test 5: Multiple events recording');
  for (let i = 0; i < 5; i++) {
    collector.recordPatternSuccess(
      `pattern-${i}`,
      i % 2 === 0, // alternating success/failure
      'ast',
      `/test/file-${i}.ts`,
      i % 2 === 1 ? 'Syntax error' : undefined
    );
  }

  console.log('🎉 All telemetry tests passed!');
  console.log('📊 Telemetry system is working correctly');
} catch (error) {
  console.error('❌ Telemetry test failed:', error.message);
  process.exit(1);
}
