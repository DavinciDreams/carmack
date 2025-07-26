#!/usr/bin/env bun

/**
 * TensorRT Oracle Production Server Entry Point
 * 
 * Docker production server that starts the TensorRT-LLM Knowledge Graph API
 * with appropriate configuration for containerized deployment.
 */

import { startServer, setupGracefulShutdown } from './api/server.ts';
import { getEnvironmentConfig, validateLLMConfig } from './config/environment.ts';

// =============================================================================
// PRODUCTION SERVER STARTUP
// =============================================================================

async function main(): Promise<void> {
  console.log('🚀 Starting TensorRT Oracle Production Server...');
  
  try {
    // Load and validate environment configuration
    console.log('📋 Loading environment configuration...');
    const env = getEnvironmentConfig();
    validateLLMConfig(env);
    console.log('✅ Environment configuration loaded and validated');

    // Production server configuration
    const serverConfig = {
      host: '0.0.0.0', // Bind to all interfaces in Docker
      port: parseInt(process.env.API_PORT || process.env.PORT || '8080'),
      logger: {
        level: process.env.TENSORRT_LOG_LEVEL || 'info',
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
            hostname: req.hostname,
            remoteAddress: req.ip,
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
        },
      },
      bodyLimit: 10 * 1024 * 1024, // 10MB for large queries
      requestTimeout: 60000, // 60 seconds for complex graph queries
      // Docker/Bun compatibility: disable schema validation
      disableRequestLogging: false,
      ajv: {
        customOptions: {
          removeAdditional: false,
          useDefaults: false,
          coerceTypes: false,
        }
      }
    };

    console.log(`🌐 Server will listen on ${serverConfig.host}:${serverConfig.port}`);
    console.log(`📊 Log level: ${serverConfig.logger.level}`);
    console.log(`🏭 Environment: ${process.env.NODE_ENV || 'production'}`);

    // Start the server
    const server = await startServer(serverConfig);
    
    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
    console.log('🎉 TensorRT Oracle Production Server is ready!');
    console.log('📡 Health check: GET /api/health');
    console.log('📊 Metrics: GET /api/metrics');
    console.log('🔍 Query endpoint: POST /api/query');
    
  } catch (error) {
    console.error('❌ Failed to start TensorRT Oracle Production Server:', error);
    process.exit(1);
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =============================================================================
// STARTUP
// =============================================================================

if (import.meta.main) {
  main();
}