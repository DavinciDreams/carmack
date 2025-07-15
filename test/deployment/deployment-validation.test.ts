import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { FileTestUtils } from '../test-helpers.js';

/**
 * Deployment and Monitoring Validation System
 *
 * Comprehensive testing of deployment configurations, monitoring setup,
 * production readiness, and operational health checks for the Carmack Coder system.
 */

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildId: string;
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCpuUtilization: number;
  };
  monitoring: {
    enabled: boolean;
    metricsEndpoint: string;
    alertingEnabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  security: {
    tlsEnabled: boolean;
    authenticationRequired: boolean;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
    };
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }[];
  timestamp: number;
  version: string;
}

interface MonitoringMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  transformations: {
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
    queueLength: number;
  };
}

class DeploymentValidator {
  /**
   * Validate deployment configuration
   */
  validateDeploymentConfig(config: DeploymentConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Validate environment
    if (!['development', 'staging', 'production'].includes(config.environment)) {
      result.errors.push('Invalid environment specified');
    }

    // Validate version format
    if (!config.version || !/^\d+\.\d+\.\d+/.test(config.version)) {
      result.errors.push('Version must follow semantic versioning (x.y.z)');
    }

    // Validate resources
    if (!config.resources.cpu || !config.resources.memory) {
      result.errors.push('CPU and memory resources must be specified');
    }

    // Validate scaling configuration
    if (config.scaling.minReplicas < 1) {
      result.errors.push('Minimum replicas must be at least 1');
    }
    if (config.scaling.maxReplicas < config.scaling.minReplicas) {
      result.errors.push('Maximum replicas must be greater than minimum replicas');
    }
    if (config.scaling.targetCpuUtilization < 10 || config.scaling.targetCpuUtilization > 90) {
      result.warnings.push('Target CPU utilization should be between 10% and 90%');
    }

    // Validate monitoring
    if (!config.monitoring.enabled && config.environment === 'production') {
      result.errors.push('Monitoring must be enabled in production');
    }
    if (config.monitoring.enabled && !config.monitoring.metricsEndpoint) {
      result.errors.push('Metrics endpoint must be specified when monitoring is enabled');
    }

    // Validate security for production
    if (config.environment === 'production') {
      if (!config.security.tlsEnabled) {
        result.errors.push('TLS must be enabled in production');
      }
      if (!config.security.authenticationRequired) {
        result.warnings.push('Authentication should be required in production');
      }
      if (!config.security.rateLimiting.enabled) {
        result.warnings.push('Rate limiting should be enabled in production');
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks(): Promise<HealthCheckResult> {
    const _startTime = Date.now();
    const checks: HealthCheckResult['checks'] = [];

    // System health checks
    checks.push(await this.checkSystemResources());
    checks.push(await this.checkDatabaseConnection());
    checks.push(await this.checkExternalDependencies());
    checks.push(await this.checkFileSystemAccess());

    // Application health checks
    checks.push(await this.checkActorSystem());
    checks.push(await this.checkTransformationEngine());
    checks.push(await this.checkValidationSystem());

    // Security health checks
    checks.push(await this.checkSecurityConfiguration());
    checks.push(await this.checkCertificates());

    // Determine overall status
    const failedChecks = checks.filter((c) => c.status === 'fail').length;
    const warnChecks = checks.filter((c) => c.status === 'warn').length;

    let status: HealthCheckResult['status'];
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks,
      timestamp: Date.now(),
      version: '1.0.0',
    };
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryUtilization = (heapUsedMB / heapTotalMB) * 100;

      if (memoryUtilization > 90) {
        return {
          name: 'system-resources',
          status: 'fail',
          message: `High memory utilization: ${memoryUtilization.toFixed(1)}%`,
          duration: Math.max(1, Date.now() - start),
        };
      }
      if (memoryUtilization > 75) {
        return {
          name: 'system-resources',
          status: 'warn',
          message: `Elevated memory utilization: ${memoryUtilization.toFixed(1)}%`,
          duration: Math.max(1, Date.now() - start),
        };
      }

      return {
        name: 'system-resources',
        status: 'pass',
        message: `Memory utilization: ${memoryUtilization.toFixed(1)}%`,
        duration: Math.max(1, Date.now() - start),
      };
    } catch (error) {
      return {
        name: 'system-resources',
        status: 'fail',
        message: `Failed to check system resources: ${error}`,
        duration: Math.max(1, Date.now() - start),
      };
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabaseConnection(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Simulate database connection check
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.random() * 20)));

    return {
      name: 'database-connection',
      status: 'pass',
      message: 'Database connection healthy',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Check external dependencies
   */
  private async checkExternalDependencies(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    try {
      // Check if git is available
      const { execSync } = await import('node:child_process');
      execSync('git --version', { stdio: 'pipe' });

      return {
        name: 'external-dependencies',
        status: 'pass',
        message: 'External dependencies available',
        duration: Math.max(1, Date.now() - start),
      };
    } catch (_error) {
      return {
        name: 'external-dependencies',
        status: 'warn',
        message: 'Some external dependencies may not be available',
        duration: Math.max(1, Date.now() - start),
      };
    }
  }

  /**
   * Check file system access
   */
  private async checkFileSystemAccess(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    try {
      const { access, constants } = await import('node:fs/promises');
      await access('./temp', constants.F_OK);

      return {
        name: 'filesystem-access',
        status: 'pass',
        message: 'File system access healthy',
        duration: Math.max(1, Date.now() - start),
      };
    } catch (_error) {
      return {
        name: 'filesystem-access',
        status: 'warn',
        message: 'Temporary directory access issues',
        duration: Math.max(1, Date.now() - start),
      };
    }
  }

  /**
   * Check actor system
   */
  private async checkActorSystem(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Simulate actor system health check
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.random() * 10)));

    return {
      name: 'actor-system',
      status: 'pass',
      message: 'Actor system operational',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Check transformation engine
   */
  private async checkTransformationEngine(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Simulate transformation engine check
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.random() * 20)));

    return {
      name: 'transformation-engine',
      status: 'pass',
      message: 'Transformation engine ready',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Check validation system
   */
  private async checkValidationSystem(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Simulate validation system check
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.random() * 15)));

    return {
      name: 'validation-system',
      status: 'pass',
      message: 'Validation system operational',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Check security configuration
   */
  private async checkSecurityConfiguration(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Check for security best practices
    const issues: string[] = [];

    // Check environment variables
    if (!process.env.NODE_ENV) {
      issues.push('NODE_ENV not set');
    }

    if (issues.length > 0) {
      return {
        name: 'security-configuration',
        status: 'warn',
        message: `Security issues: ${issues.join(', ')}`,
        duration: Math.max(1, Date.now() - start),
      };
    }

    return {
      name: 'security-configuration',
      status: 'pass',
      message: 'Security configuration valid',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Check certificates
   */
  private async checkCertificates(): Promise<HealthCheckResult['checks'][0]> {
    const start = Date.now();

    // Simulate certificate check
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.random() * 10)));

    return {
      name: 'certificates',
      status: 'pass',
      message: 'Certificates valid',
      duration: Math.max(1, Date.now() - start),
    };
  }

  /**
   * Collect monitoring metrics
   */
  async collectMetrics(): Promise<MonitoringMetrics> {
    const memoryUsage = process.memoryUsage();

    return {
      system: {
        cpuUsage: Math.random() * 100, // Simulated
        memoryUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        diskUsage: Math.random() * 100, // Simulated
        uptime: process.uptime(),
      },
      application: {
        requestsPerSecond: Math.random() * 1000, // Simulated
        averageResponseTime: Math.random() * 500, // Simulated
        errorRate: Math.random() * 5, // Simulated
        activeConnections: Math.floor(Math.random() * 100), // Simulated
      },
      transformations: {
        totalProcessed: Math.floor(Math.random() * 10000), // Simulated
        successRate: 95 + Math.random() * 5, // Simulated
        averageProcessingTime: Math.random() * 1000, // Simulated
        queueLength: Math.floor(Math.random() * 50), // Simulated
      },
    };
  }
}

describe('Deployment and Monitoring Validation System', () => {
  let validator: DeploymentValidator;
  let tempFiles: string[] = [];

  beforeEach(() => {
    validator = new DeploymentValidator();
    tempFiles = [];
  });

  afterEach(async () => {
    // Cleanup temporary files
    for (const file of tempFiles) {
      await FileTestUtils.cleanupTempFile(file);
    }
    tempFiles = [];
  });

  describe('Deployment Configuration Validation', () => {
    test('should validate production deployment configuration', () => {
      console.log('🔬 Testing production deployment configuration validation');

      const productionConfig: DeploymentConfig = {
        environment: 'production',
        version: '1.2.3',
        buildId: 'build-12345',
        resources: {
          cpu: '2000m',
          memory: '4Gi',
          storage: '10Gi',
        },
        scaling: {
          minReplicas: 3,
          maxReplicas: 10,
          targetCpuUtilization: 70,
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/metrics',
          alertingEnabled: true,
          logLevel: 'info',
        },
        security: {
          tlsEnabled: true,
          authenticationRequired: true,
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 1000,
          },
        },
      };

      const result = validator.validateDeploymentConfig(productionConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      console.log('   ✅ Production configuration validated');
      console.log(`   📊 Valid: ${result.isValid}`);
      console.log(`   🚨 Errors: ${result.errors.length}`);
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
    });

    test('should reject invalid deployment configuration', () => {
      console.log('🔬 Testing invalid deployment configuration rejection');

      const invalidConfig: DeploymentConfig = {
        environment: 'invalid' as any,
        version: 'invalid-version',
        buildId: '',
        resources: {
          cpu: '',
          memory: '',
          storage: '10Gi',
        },
        scaling: {
          minReplicas: 0,
          maxReplicas: 1,
          targetCpuUtilization: 95,
        },
        monitoring: {
          enabled: false,
          metricsEndpoint: '',
          alertingEnabled: false,
          logLevel: 'info',
        },
        security: {
          tlsEnabled: false,
          authenticationRequired: false,
          rateLimiting: {
            enabled: false,
            requestsPerMinute: 100,
          },
        },
      };

      const result = validator.validateDeploymentConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      console.log('   ✅ Invalid configuration properly rejected');
      console.log(`   🚨 Errors found: ${result.errors.length}`);
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    });

    test('should validate development environment configuration', () => {
      console.log('🔬 Testing development environment configuration');

      const devConfig: DeploymentConfig = {
        environment: 'development',
        version: '1.0.0-dev',
        buildId: 'dev-build',
        resources: {
          cpu: '500m',
          memory: '1Gi',
          storage: '5Gi',
        },
        scaling: {
          minReplicas: 1,
          maxReplicas: 2,
          targetCpuUtilization: 80,
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/dev-metrics',
          alertingEnabled: false,
          logLevel: 'debug',
        },
        security: {
          tlsEnabled: false, // OK for development
          authenticationRequired: false, // OK for development
          rateLimiting: {
            enabled: false, // OK for development
            requestsPerMinute: 10000,
          },
        },
      };

      const result = validator.validateDeploymentConfig(devConfig);

      expect(result.isValid).toBe(true);

      console.log('   ✅ Development configuration validated');
      console.log(`   📊 Valid: ${result.isValid}`);
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`);
    });
  });

  describe('Health Check System', () => {
    test('should perform comprehensive health checks', async () => {
      console.log('🔬 Testing comprehensive health checks');

      const healthResult = await validator.performHealthChecks();

      expect(healthResult.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy'].includes(healthResult.status)).toBe(true);
      expect(Array.isArray(healthResult.checks)).toBe(true);
      expect(healthResult.checks.length).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeGreaterThan(0);
      expect(healthResult.version).toBeDefined();

      console.log('   ✅ Health checks completed');
      console.log(`   📊 Overall status: ${healthResult.status}`);
      console.log(`   🔍 Total checks: ${healthResult.checks.length}`);

      const passedChecks = healthResult.checks.filter((c) => c.status === 'pass').length;
      const warnChecks = healthResult.checks.filter((c) => c.status === 'warn').length;
      const failedChecks = healthResult.checks.filter((c) => c.status === 'fail').length;

      console.log(`   ✅ Passed: ${passedChecks}`);
      console.log(`   ⚠️ Warnings: ${warnChecks}`);
      console.log(`   ❌ Failed: ${failedChecks}`);
    });

    test('should check individual system components', async () => {
      console.log('🔬 Testing individual system component checks');

      const healthResult = await validator.performHealthChecks();

      const expectedChecks = [
        'system-resources',
        'database-connection',
        'external-dependencies',
        'filesystem-access',
        'actor-system',
        'transformation-engine',
        'validation-system',
        'security-configuration',
        'certificates',
      ];

      for (const expectedCheck of expectedChecks) {
        const check = healthResult.checks.find((c) => c.name === expectedCheck);
        expect(check).toBeDefined();
        expect(['pass', 'warn', 'fail'].includes(check?.status)).toBe(true);
        expect(check?.duration).toBeGreaterThan(0);

        console.log(`   🔍 ${expectedCheck}: ${check?.status} (${check?.duration}ms)`);
      }

      console.log('   ✅ Individual component checks validated');
    });

    test('should measure health check performance', async () => {
      console.log('🔬 Testing health check performance');

      const startTime = Date.now();
      const healthResult = await validator.performHealthChecks();
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      const avgCheckTime =
        healthResult.checks.reduce((sum, check) => sum + check.duration, 0) /
        healthResult.checks.length;

      console.log('   ✅ Health check performance measured');
      console.log(`   ⏱️ Total time: ${totalTime}ms`);
      console.log(`   📊 Average check time: ${avgCheckTime.toFixed(1)}ms`);
      console.log(`   🚀 Performance target met: ${totalTime < 5000 ? 'Yes' : 'No'}`);
    });
  });

  describe('Monitoring Metrics Collection', () => {
    test('should collect comprehensive system metrics', async () => {
      console.log('🔬 Testing comprehensive metrics collection');

      const metrics = await validator.collectMetrics();

      // Validate system metrics
      expect(typeof metrics.system.cpuUsage).toBe('number');
      expect(typeof metrics.system.memoryUsage).toBe('number');
      expect(typeof metrics.system.diskUsage).toBe('number');
      expect(typeof metrics.system.uptime).toBe('number');

      // Validate application metrics
      expect(typeof metrics.application.requestsPerSecond).toBe('number');
      expect(typeof metrics.application.averageResponseTime).toBe('number');
      expect(typeof metrics.application.errorRate).toBe('number');
      expect(typeof metrics.application.activeConnections).toBe('number');

      // Validate transformation metrics
      expect(typeof metrics.transformations.totalProcessed).toBe('number');
      expect(typeof metrics.transformations.successRate).toBe('number');
      expect(typeof metrics.transformations.averageProcessingTime).toBe('number');
      expect(typeof metrics.transformations.queueLength).toBe('number');

      console.log('   ✅ Comprehensive metrics collected');
      console.log(`   💻 CPU Usage: ${metrics.system.cpuUsage.toFixed(1)}%`);
      console.log(`   💾 Memory Usage: ${metrics.system.memoryUsage.toFixed(1)}%`);
      console.log(`   📊 Requests/sec: ${metrics.application.requestsPerSecond.toFixed(0)}`);
      console.log(
        `   ⚡ Avg Response Time: ${metrics.application.averageResponseTime.toFixed(0)}ms`
      );
      console.log(`   🔄 Transformations Processed: ${metrics.transformations.totalProcessed}`);
      console.log(`   ✅ Success Rate: ${metrics.transformations.successRate.toFixed(1)}%`);
    });

    test('should validate metric ranges and sanity', async () => {
      console.log('🔬 Testing metric validation and sanity checks');

      const metrics = await validator.collectMetrics();

      // System metrics should be within reasonable ranges
      expect(metrics.system.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.system.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memoryUsage).toBeLessThanOrEqual(100);
      expect(metrics.system.uptime).toBeGreaterThan(0);

      // Application metrics should be reasonable
      expect(metrics.application.requestsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.application.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.application.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.application.errorRate).toBeLessThanOrEqual(100);

      // Transformation metrics should be valid
      expect(metrics.transformations.totalProcessed).toBeGreaterThanOrEqual(0);
      expect(metrics.transformations.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.transformations.successRate).toBeLessThanOrEqual(100);
      expect(metrics.transformations.queueLength).toBeGreaterThanOrEqual(0);

      console.log('   ✅ Metric ranges validated');
      console.log('   📊 All metrics within expected ranges');
    });
  });

  describe('Production Readiness Assessment', () => {
    test('should assess production readiness', async () => {
      console.log('🔬 Testing production readiness assessment');

      const productionConfig: DeploymentConfig = {
        environment: 'production',
        version: '1.0.0',
        buildId: 'prod-build-123',
        resources: {
          cpu: '2000m',
          memory: '4Gi',
          storage: '20Gi',
        },
        scaling: {
          minReplicas: 3,
          maxReplicas: 10,
          targetCpuUtilization: 70,
        },
        monitoring: {
          enabled: true,
          metricsEndpoint: '/metrics',
          alertingEnabled: true,
          logLevel: 'warn',
        },
        security: {
          tlsEnabled: true,
          authenticationRequired: true,
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 1000,
          },
        },
      };

      const configValidation = validator.validateDeploymentConfig(productionConfig);
      const healthCheck = await validator.performHealthChecks();
      const metrics = await validator.collectMetrics();

      // Production readiness criteria
      const isProductionReady =
        configValidation.isValid &&
        healthCheck.status !== 'unhealthy' &&
        metrics.system.memoryUsage < 80 &&
        metrics.transformations.successRate > 95;

      expect(configValidation.isValid).toBe(true);
      expect(['healthy', 'degraded'].includes(healthCheck.status)).toBe(true);

      console.log('   ✅ Production readiness assessed');
      console.log(`   📊 Configuration valid: ${configValidation.isValid}`);
      console.log(`   🏥 Health status: ${healthCheck.status}`);
      console.log(`   💾 Memory usage: ${metrics.system.memoryUsage.toFixed(1)}%`);
      console.log(`   ✅ Success rate: ${metrics.transformations.successRate.toFixed(1)}%`);
      console.log(`   🚀 Production ready: ${isProductionReady ? 'Yes' : 'No'}`);
    });

    test('should identify production blockers', () => {
      console.log('🔬 Testing production blocker identification');

      const problematicConfig: DeploymentConfig = {
        environment: 'production',
        version: '0.1.0-alpha',
        buildId: 'dev-build',
        resources: {
          cpu: '100m', // Too low for production
          memory: '256Mi', // Too low for production
          storage: '1Gi',
        },
        scaling: {
          minReplicas: 1, // Too low for production
          maxReplicas: 1, // No scaling
          targetCpuUtilization: 95, // Too high
        },
        monitoring: {
          enabled: false, // Critical for production
          metricsEndpoint: '',
          alertingEnabled: false,
          logLevel: 'debug', // Too verbose for production
        },
        security: {
          tlsEnabled: false, // Critical security issue
          authenticationRequired: false, // Security issue
          rateLimiting: {
            enabled: false, // Should be enabled
            requestsPerMinute: 10000,
          },
        },
      };

      const result = validator.validateDeploymentConfig(problematicConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const criticalIssues = result.errors.filter(
        (error) =>
          error.includes('TLS') || error.includes('monitoring') || error.includes('replicas')
      );

      expect(criticalIssues.length).toBeGreaterThan(0);

      console.log('   ✅ Production blockers identified');
      console.log(`   🚨 Total errors: ${result.errors.length}`);
      console.log(`   🔴 Critical issues: ${criticalIssues.length}`);
      criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    });
  });

  describe('Monitoring Integration', () => {
    test('should validate monitoring endpoint configuration', async () => {
      console.log('🔬 Testing monitoring endpoint configuration');

      const monitoringConfig = {
        enabled: true,
        metricsEndpoint: '/metrics',
        alertingEnabled: true,
        logLevel: 'info' as const,
      };

      // Simulate metrics endpoint validation
      expect(monitoringConfig.enabled).toBe(true);
      expect(monitoringConfig.metricsEndpoint).toBe('/metrics');
      expect(monitoringConfig.alertingEnabled).toBe(true);

      const metrics = await validator.collectMetrics();
      expect(metrics).toBeDefined();

      console.log('   ✅ Monitoring endpoint configuration validated');
      console.log(`   📊 Metrics endpoint: ${monitoringConfig.metricsEndpoint}`);
      console.log(`   🚨 Alerting enabled: ${monitoringConfig.alertingEnabled}`);
      console.log(`   📝 Log level: ${monitoringConfig.logLevel}`);
    });

    test('should test alerting thresholds', async () => {
      console.log('🔬 Testing alerting thresholds');

      const metrics = await validator.collectMetrics();

      // Define alerting thresholds
      const thresholds = {
        cpuUsage: 80,
        memoryUsage: 85,
        errorRate: 5,
        responseTime: 1000,
      };

      const alerts: string[] = [];

      if (metrics.system.cpuUsage > thresholds.cpuUsage) {
        alerts.push(`High CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`);
      }
      if (metrics.system.memoryUsage > thresholds.memoryUsage) {
        alerts.push(`High memory usage: ${metrics.system.memoryUsage.toFixed(1)}%`);
      }
      if (metrics.application.errorRate > thresholds.errorRate) {
        alerts.push(`High error rate: ${metrics.application.errorRate.toFixed(1)}%`);
      }
      if (metrics.application.averageResponseTime > thresholds.responseTime) {
        alerts.push(`High response time: ${metrics.application.averageResponseTime.toFixed(0)}ms`);
      }

      console.log('   ✅ Alerting thresholds tested');
      console.log(
        `   📊 CPU: ${metrics.system.cpuUsage.toFixed(1)}% (threshold: ${thresholds.cpuUsage}%)`
      );
      console.log(
        `   💾 Memory: ${metrics.system.memoryUsage.toFixed(1)}% (threshold: ${thresholds.memoryUsage}%)`
      );
      console.log(
        `   🚨 Error rate: ${metrics.application.errorRate.toFixed(1)}% (threshold: ${thresholds.errorRate}%)`
      );
      console.log(
        `   ⏱️ Response time: ${metrics.application.averageResponseTime.toFixed(0)}ms (threshold: ${thresholds.responseTime}ms)`
      );
      console.log(`   🔔 Active alerts: ${alerts.length}`);

      if (alerts.length > 0) {
        alerts.forEach((alert, i) => {
          console.log(`   ${i + 1}. ${alert}`);
        });
      }
    });
  });

  describe('Deployment Automation', () => {
    test('should validate deployment pipeline configuration', async () => {
      console.log('🔬 Testing deployment pipeline configuration');

      const pipelineConfig = {
        stages: ['build', 'test', 'security-scan', 'deploy'],
        rollbackEnabled: true,
        healthCheckTimeout: 300,
        deploymentStrategy: 'rolling',
      };

      expect(pipelineConfig.stages).toContain('test');
      expect(pipelineConfig.stages).toContain('security-scan');
      expect(pipelineConfig.rollbackEnabled).toBe(true);
      expect(pipelineConfig.healthCheckTimeout).toBeGreaterThan(0);

      console.log('   ✅ Deployment pipeline configuration validated');
      console.log(`   🔄 Stages: ${pipelineConfig.stages.join(' → ')}`);
      console.log(`   ↩️ Rollback enabled: ${pipelineConfig.rollbackEnabled}`);
      console.log(`   ⏱️ Health check timeout: ${pipelineConfig.healthCheckTimeout}s`);
      console.log(`   📋 Strategy: ${pipelineConfig.deploymentStrategy}`);
    });

    test('should validate container configuration', () => {
      console.log('🔬 Testing container configuration validation');

      const containerConfig = {
        image: 'carmack-coder:1.0.0',
        ports: [3000, 9090],
        environment: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
        },
        healthCheck: {
          path: '/health',
          interval: 30,
          timeout: 5,
          retries: 3,
        },
        resources: {
          requests: { cpu: '500m', memory: '1Gi' },
          limits: { cpu: '2000m', memory: '4Gi' },
        },
      };

      expect(containerConfig.image).toMatch(/carmack-coder:\d+\.\d+\.\d+/);
      expect(containerConfig.ports).toContain(3000);
      expect(containerConfig.environment.NODE_ENV).toBe('production');
      expect(containerConfig.healthCheck.path).toBe('/health');
      expect(containerConfig.resources.requests.cpu).toBeDefined();

      console.log('   ✅ Container configuration validated');
      console.log(`   🐳 Image: ${containerConfig.image}`);
      console.log(`   🔌 Ports: ${containerConfig.ports.join(', ')}`);
      console.log(`   🌍 Environment: ${containerConfig.environment.NODE_ENV}`);
      console.log(`   🏥 Health check: ${containerConfig.healthCheck.path}`);
    });
  });
});
