#!/usr/bin/env bun

/**
 * TensorRT Oracle Deployment Verification Script
 * 
 * This script verifies that all components of the Docker deployment are running correctly:
 * - PostgreSQL database with pgvector extension
 * - TensorRT Oracle application
 * - Demo interface
 * - Prometheus monitoring
 * - Grafana dashboards
 * - Redis caching
 * - Nginx reverse proxy
 */

import { z } from 'zod';

// Verification configuration
const VERIFICATION_CONFIG = {
  services: {
    postgres: { port: 5432, healthPath: null },
    redis: { port: 6379, healthPath: null },
    'tensorrt-oracle': { port: 8080, healthPath: '/health' },
    'tensorrt-demo': { port: 8081, healthPath: '/health' },
    prometheus: { port: 9090, healthPath: '/-/healthy' },
    grafana: { port: 3000, healthPath: '/api/health' },
    nginx: { port: 80, healthPath: '/nginx-health' }
  },
  timeouts: {
    connection: 5000,
    response: 10000,
    overall: 60000
  },
  retries: {
    maxAttempts: 3,
    delay: 2000
  }
};

// Verification result schema
const ServiceStatusSchema = z.object({
  service: z.string(),
  status: z.enum(['healthy', 'unhealthy', 'unreachable']),
  responseTime: z.number(),
  details: z.record(z.unknown()).optional(),
  error: z.string().optional()
});

type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

const DeploymentStatusSchema = z.object({
  overall: z.enum(['healthy', 'degraded', 'failed']),
  services: z.array(ServiceStatusSchema),
  summary: z.object({
    healthy: z.number(),
    unhealthy: z.number(),
    unreachable: z.number(),
    total: z.number()
  }),
  timestamp: z.string(),
  duration: z.number()
});

type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

class DeploymentVerifier {
  private startTime: number = 0;

  async verifyDeployment(): Promise<DeploymentStatus> {
    this.startTime = Date.now();
    console.log('🔍 Starting TensorRT Oracle deployment verification...\n');

    const serviceResults: ServiceStatus[] = [];

    // Check each service
    for (const [serviceName, config] of Object.entries(VERIFICATION_CONFIG.services)) {
      console.log(`🔍 Checking ${serviceName}...`);
      const status = await this.checkService(serviceName, config);
      serviceResults.push(status);
      this.logServiceStatus(status);
    }

    // Calculate summary
    const summary = {
      healthy: serviceResults.filter(s => s.status === 'healthy').length,
      unhealthy: serviceResults.filter(s => s.status === 'unhealthy').length,
      unreachable: serviceResults.filter(s => s.status === 'unreachable').length,
      total: serviceResults.length
    };

    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'failed';
    if (summary.healthy === summary.total) {
      overall = 'healthy';
    } else if (summary.healthy > 0) {
      overall = 'degraded';
    } else {
      overall = 'failed';
    }

    const duration = Date.now() - this.startTime;

    const deploymentStatus: DeploymentStatus = {
      overall,
      services: serviceResults,
      summary,
      timestamp: new Date().toISOString(),
      duration
    };

    this.printSummary(deploymentStatus);
    return deploymentStatus;
  }

  private async checkService(
    serviceName: string, 
    config: { port: number; healthPath: string | null }
  ): Promise<ServiceStatus> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= VERIFICATION_CONFIG.retries.maxAttempts; attempt++) {
      try {
        if (config.healthPath) {
          // HTTP health check
          const response = await this.httpHealthCheck(serviceName, config.port, config.healthPath);
          return {
            service: serviceName,
            status: 'healthy',
            responseTime: Date.now() - startTime,
            details: response
          };
        } else {
          // TCP connection check
          await this.tcpHealthCheck(serviceName, config.port);
          return {
            service: serviceName,
            status: 'healthy',
            responseTime: Date.now() - startTime
          };
        }
      } catch (error) {
        if (attempt === VERIFICATION_CONFIG.retries.maxAttempts) {
          return {
            service: serviceName,
            status: 'unreachable',
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error)
          };
        }
        await this.sleep(VERIFICATION_CONFIG.retries.delay);
      }
    }

    return {
      service: serviceName,
      status: 'unreachable',
      responseTime: Date.now() - startTime,
      error: 'Max retries exceeded'
    };
  }

  private async httpHealthCheck(serviceName: string, port: number, healthPath: string): Promise<any> {
    const url = `http://localhost:${port}${healthPath}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERIFICATION_CONFIG.timeouts.response);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'User-Agent': 'TensorRT-Oracle-Deployment-Verifier/1.0' }
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType?.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = { status: 'healthy', message: 'JSON parse failed but response received' };
        }
      } else {
        data = { status: 'healthy', message: 'Non-JSON response received' };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async tcpHealthCheck(serviceName: string, port: number): Promise<void> {
    // For TCP-only services like PostgreSQL and Redis, we'll try to establish a connection
    const { createConnection } = await import('node:net');
    
    return new Promise((resolve, reject) => {
      const socket = createConnection(port, 'localhost');
      
      const timeoutId = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${VERIFICATION_CONFIG.timeouts.connection}ms`));
      }, VERIFICATION_CONFIG.timeouts.connection);

      socket.on('connect', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timeoutId);
        socket.destroy();
        reject(error);
      });
    });
  }

  private logServiceStatus(status: ServiceStatus): void {
    const icon = status.status === 'healthy' ? '✅' : status.status === 'unhealthy' ? '⚠️' : '❌';
    const time = `${status.responseTime}ms`;
    
    if (status.status === 'healthy') {
      console.log(`  ${icon} ${status.service} - ${status.status} (${time})`);
    } else {
      console.log(`  ${icon} ${status.service} - ${status.status} (${time})`);
      if (status.error) {
        console.log(`    Error: ${status.error}`);
      }
    }
  }

  private printSummary(deployment: DeploymentStatus): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DEPLOYMENT VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    const overallIcon = deployment.overall === 'healthy' ? '✅' : 
                        deployment.overall === 'degraded' ? '⚠️' : '❌';
    
    console.log(`Overall Status: ${overallIcon} ${deployment.overall.toUpperCase()}`);
    console.log(`Verification Duration: ${Math.round(deployment.duration / 1000)}s`);
    console.log(`Timestamp: ${deployment.timestamp}`);
    
    console.log('\n📊 Service Summary:');
    console.log(`  • Healthy: ${deployment.summary.healthy}/${deployment.summary.total}`);
    console.log(`  • Unhealthy: ${deployment.summary.unhealthy}/${deployment.summary.total}`);
    console.log(`  • Unreachable: ${deployment.summary.unreachable}/${deployment.summary.total}`);
    
    if (deployment.overall !== 'healthy') {
      console.log('\n⚠️ Issues Detected:');
      deployment.services
        .filter(s => s.status !== 'healthy')
        .forEach(service => {
          console.log(`  • ${service.service}: ${service.status} - ${service.error || 'Unknown error'}`);
        });
      
      console.log('\n🔧 Troubleshooting:');
      console.log('  1. Ensure Docker Compose is running: docker-compose -f docker-compose.tensorrt.yml ps');
      console.log('  2. Check service logs: docker-compose -f docker-compose.tensorrt.yml logs <service-name>');
      console.log('  3. Verify network connectivity: docker network ls');
      console.log('  4. Check resource usage: docker stats');
    } else {
      console.log('\n🎉 All services are healthy and ready!');
      console.log('\n🔗 Access URLs:');
      console.log('  • TensorRT Oracle API: http://localhost:8080');
      console.log('  • TensorRT Demo: http://localhost:8081');
      console.log('  • Prometheus: http://localhost:9090');
      console.log('  • Grafana: http://localhost:3000 (admin/admin)');
      console.log('  • Nginx (if configured): http://localhost:80');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Docker Compose integration
class DockerComposeManager {
  private composeFile = 'docker-compose.tensorrt.yml';

  async checkDockerCompose(): Promise<boolean> {
    try {
      const { spawn } = await import('node:child_process');
      const { promisify } = await import('node:util');
      
      return new Promise((resolve) => {
        const process = spawn('docker-compose', ['--version'], { stdio: 'pipe' });
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
      });
    } catch {
      return false;
    }
  }

  async getServicesStatus(): Promise<any[]> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(`docker-compose -f ${this.composeFile} ps --format json`);
      return JSON.parse(`[${stdout.trim().split('\n').join(',')}]`);
    } catch (error) {
      console.warn('⚠️ Could not get Docker Compose services status:', error);
      return [];
    }
  }

  async startServices(): Promise<void> {
    console.log('🚀 Starting Docker Compose services...');
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync(`docker-compose -f ${this.composeFile} up -d`);
      console.log('✅ Docker Compose services started');
      
      // Wait for services to initialize
      console.log('⏳ Waiting 30 seconds for services to initialize...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      throw new Error(`Failed to start services: ${error}`);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dockerManager = new DockerComposeManager();
  const verifier = new DeploymentVerifier();

  try {
    // Check if Docker Compose is available
    console.log('🐳 Checking Docker Compose availability...');
    const hasDockerCompose = await dockerManager.checkDockerCompose();
    
    if (!hasDockerCompose) {
      console.error('❌ Docker Compose not found. Please install Docker Compose to run this verification.');
      process.exit(1);
    }
    console.log('✅ Docker Compose is available');

    // Start services if requested
    if (args.includes('--start')) {
      await dockerManager.startServices();
    }

    // Check Docker Compose services status
    console.log('\n🔍 Checking Docker Compose services...');
    const composeServices = await dockerManager.getServicesStatus();
    if (composeServices.length > 0) {
      console.log('📋 Docker Compose Services:');
      composeServices.forEach(service => {
        const status = service.State === 'running' ? '✅' : '❌';
        console.log(`  ${status} ${service.Name} - ${service.State}`);
      });
    }

    // Run deployment verification
    console.log('\n🔍 Running comprehensive deployment verification...');
    const result = await verifier.verifyDeployment();

    // Save results if requested
    if (args.includes('--save-results')) {
      const fs = await import('node:fs/promises');
      const resultsFile = `deployment-verification-${Date.now()}.json`;
      await fs.writeFile(resultsFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Results saved to: ${resultsFile}`);
    }

    // Exit with appropriate code
    process.exit(result.overall === 'failed' ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export { DeploymentVerifier, DockerComposeManager, type DeploymentStatus, type ServiceStatus };