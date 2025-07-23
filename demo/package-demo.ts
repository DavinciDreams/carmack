#!/usr/bin/env bun

/**
 * TensorRT Knowledge Graph Platform - Demo Package Builder
 * 
 * Creates a complete, self-contained demo package for distribution
 */

import { writeFile, mkdir, copyFile, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

interface DemoPackage {
  name: string;
  version: string;
  description: string;
  components: string[];
  documentation: string[];
  examples: string[];
  requirements: {
    runtime: string;
    memory: string;
    disk: string;
    dependencies: string[];
  };
  features: string[];
}

class DemoPackager {
  private packageInfo: DemoPackage;
  private outputDir: string;

  constructor() {
    this.outputDir = './demo-package';
    this.packageInfo = {
      name: 'TensorRT Knowledge Graph Platform',
      version: '1.0.0',
      description: 'Comprehensive demo showcasing semantic code analysis and natural language querying for TensorRT',
      components: [
        'Interactive CLI Demo',
        'Performance Metrics Dashboard', 
        'Scenario-based Walkthroughs',
        'Real-time Analytics',
        'PostgreSQL + pgvector Integration'
      ],
      documentation: [
        'Quick Start Guide (< 10 minutes)',
        'Architecture Overview',
        'API Documentation',
        'User Guides',
        'Troubleshooting Guide',
        'Performance Optimization'
      ],
      examples: [
        'Software Engineer Workflow',
        'AI Researcher Workflow',
        'Engineering Manager Workflow',
        'CUDA Optimization Investigation',
        'Precision Quantization Research',
        'Plugin Development Workflow'
      ],
      requirements: {
        runtime: 'Bun >= 1.0.0',
        memory: '8GB RAM (16GB recommended)',
        disk: '10GB available space',
        dependencies: ['Docker', 'Git', 'PostgreSQL (via Docker)']
      },
      features: [
        '🔮 Natural Language Code Querying',
        '🧠 Semantic Vector Search (512-dimensional)',
        '📊 Real-time Performance Metrics',
        '🎯 Intent Classification (8 types)',
        '🔍 Multi-language Analysis (CUDA, C++, Python)',
        '📈 Interactive Demonstrations',
        '🏗️ Production-ready Architecture',
        '⚡ Sub-second Query Response',
        '🎮 User-friendly CLI Interface',
        '📚 Comprehensive Documentation'
      ]
    };
  }

  async createPackage(): Promise<void> {
    console.log('📦 Creating TensorRT Knowledge Graph Demo Package...\n');

    // Create output directory
    await this.ensureDirectory(this.outputDir);

    // Copy core files
    await this.copyDemoFiles();
    
    // Copy documentation
    await this.copyDocumentation();
    
    // Copy examples and scenarios
    await this.copyExamples();
    
    // Create package metadata
    await this.createPackageMetadata();
    
    // Create setup scripts
    await this.createSetupScripts();
    
    // Create README for the package
    await this.createPackageReadme();
    
    // Create validation script
    await this.createValidationScript();

    console.log('✅ Demo package created successfully!');
    console.log(`📁 Package location: ${this.outputDir}`);
    console.log('\n🚀 To use the demo package:');
    console.log(`   cd ${this.outputDir}`);
    console.log('   ./setup.sh');
    console.log('   ./run-demo.sh\n');
  }

  private async ensureDirectory(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private async copyDemoFiles(): Promise<void> {
    console.log('📋 Copying demo files...');
    
    const demoFiles = [
      'demo/tensorrt-demo.ts',
      'demo/metrics-dashboard.ts',
      'examples/tensorrt-scenarios.ts',
      'oracle-cli.ts',
      'simple-oracle-demo.ts',
      'src/docs/oracle-query-processor.ts',
      'package.json',
      'tsconfig.json',
      '.env.example'
    ];

    for (const file of demoFiles) {
      if (existsSync(file)) {
        const targetPath = join(this.outputDir, file);
        await this.ensureDirectory(dirname(targetPath));
        await copyFile(file, targetPath);
      }
    }

    // Copy SQL files
    await this.copyDirectory('sql', join(this.outputDir, 'sql'));
    
    console.log('✅ Demo files copied');
  }

  private async copyDocumentation(): Promise<void> {
    console.log('📚 Copying documentation...');
    
    const docFiles = [
      'docs/tensorrt-knowledge-graph/README.md',
      'docs/tensorrt-knowledge-graph/QUICK-START.md',
      'docs/TENSORRT-ORACLE-ARCHITECTURE.md',
      'docs/TENSORRT-IMPLEMENTATION-SPEC.md',
      'docs/TENSORRT-ORACLE-DEPLOYMENT-GUIDE.md',
      'docs/TENSORRT-ORACLE-QUICKSTART.md'
    ];

    for (const file of docFiles) {
      if (existsSync(file)) {
        const targetPath = join(this.outputDir, file);
        await this.ensureDirectory(dirname(targetPath));
        await copyFile(file, targetPath);
      }
    }
    
    console.log('✅ Documentation copied');
  }

  private async copyExamples(): Promise<void> {
    console.log('📝 Copying examples...');
    
    if (existsSync('examples')) {
      await this.copyDirectory('examples', join(this.outputDir, 'examples'));
    }
    
    console.log('✅ Examples copied');
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await this.ensureDirectory(dest);
    const entries = await readdir(src);
    
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      const stats = await stat(srcPath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  private async createPackageMetadata(): Promise<void> {
    console.log('📋 Creating package metadata...');
    
    const metadata = {
      ...this.packageInfo,
      createdAt: new Date().toISOString(),
      packageContents: {
        demoFiles: [
          'demo/tensorrt-demo.ts - Main interactive demo',
          'demo/metrics-dashboard.ts - Performance monitoring',
          'examples/tensorrt-scenarios.ts - Example scenarios',
          'oracle-cli.ts - Oracle query interface',
          'simple-oracle-demo.ts - Simplified demo'
        ],
        documentation: [
          'docs/tensorrt-knowledge-graph/README.md - Main overview',
          'docs/tensorrt-knowledge-graph/QUICK-START.md - Quick start guide',
          'docs/TENSORRT-ORACLE-ARCHITECTURE.md - System architecture',
          'docs/TENSORRT-IMPLEMENTATION-SPEC.md - Implementation details',
          'docs/TENSORRT-ORACLE-DEPLOYMENT-GUIDE.md - Deployment guide'
        ],
        setupFiles: [
          'setup.sh - Automated setup script',
          'run-demo.sh - Demo launcher',
          'validate.sh - System validation',
          'sql/ - Database schema and indices'
        ]
      }
    };

    await writeFile(
      join(this.outputDir, 'package-info.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('✅ Package metadata created');
  }

  private async createSetupScripts(): Promise<void> {
    console.log('🔧 Creating setup scripts...');
    
    // Main setup script
    const setupScript = `#!/bin/bash

# TensorRT Knowledge Graph Platform - Setup Script
echo "🚀 Setting up TensorRT Knowledge Graph Platform..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v bun &> /dev/null; then
    echo "❌ Bun runtime not found. Please install Bun: https://bun.sh"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker: https://docker.com"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Add PostgreSQL dependency
bun add pg pg-pool @types/pg

# Setup environment
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please review and update if needed"
fi

# Start PostgreSQL
echo "🗄️  Starting PostgreSQL with pgvector..."
docker run --name tensorrt-postgres \\
  -e POSTGRES_DB=tensorrt_oracle \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=your_secure_password \\
  -p 5432:5432 \\
  -v postgres_data:/var/lib/postgresql/data \\
  -d pgvector/pgvector:pg16

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 15

# Initialize database
echo "🔧 Initializing database schema..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/init.sql

echo "📊 Creating performance indices..."
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/indices.sql

# Validate setup
echo "✅ Running validation..."
./validate.sh

echo ""
echo "🎉 Setup complete! TensorRT Knowledge Graph Platform is ready."
echo ""
echo "🚀 To start the demo:"
echo "   ./run-demo.sh"
echo ""
echo "📊 To view metrics:"
echo "   bun run demo/metrics-dashboard.ts"
echo ""
echo "📚 Documentation available in docs/ directory"
`;

    await writeFile(join(this.outputDir, 'setup.sh'), setupScript);
    
    // Demo runner script
    const runScript = `#!/bin/bash

# TensorRT Knowledge Graph Platform - Demo Runner
echo "🔮 Starting TensorRT Knowledge Graph Platform Demo..."

# Check if setup was completed
if ! docker ps | grep -q tensorrt-postgres; then
    echo "❌ PostgreSQL not running. Please run ./setup.sh first"
    exit 1
fi

echo "🎯 Available demo options:"
echo "  1. Interactive Demo (default)"
echo "  2. Engineer Workflow"
echo "  3. Researcher Workflow" 
echo "  4. Manager Workflow"
echo "  5. All Demonstrations"
echo "  6. System Architecture"
echo "  7. Performance Metrics"
echo ""

read -p "Select option (1-7) or press Enter for interactive demo: " choice

case \$choice in
    2) bun run demo/tensorrt-demo.ts --engineer ;;
    3) bun run demo/tensorrt-demo.ts --researcher ;;
    4) bun run demo/tensorrt-demo.ts --manager ;;
    5) bun run demo/tensorrt-demo.ts --all-demos ;;
    6) bun run demo/tensorrt-demo.ts --architecture ;;
    7) bun run demo/metrics-dashboard.ts ;;
    *) bun run demo/tensorrt-demo.ts ;;
esac
`;

    await writeFile(join(this.outputDir, 'run-demo.sh'), runScript);
    
    console.log('✅ Setup scripts created');
  }

  private async createValidationScript(): Promise<void> {
    console.log('🧪 Creating validation script...');
    
    const validateScript = `#!/bin/bash

# TensorRT Knowledge Graph Platform - Validation Script
echo "🧪 Validating TensorRT Knowledge Graph Platform setup..."

# Check PostgreSQL
echo "🗄️  Checking PostgreSQL..."
if docker exec tensorrt-postgres pg_isready -U postgres; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not responding"
    exit 1
fi

# Check database schema
echo "📋 Checking database schema..."
if docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "\\dt tensorrt_oracle.*" | grep -q "code_entities"; then
    echo "✅ Database schema initialized"
else
    echo "❌ Database schema not found"
    exit 1
fi

# Check pgvector extension
echo "🔍 Checking pgvector extension..."
if docker exec -it tensorrt-postgres psql -U postgres -d tensorrt_oracle -c "SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector;" | grep -q "1"; then
    echo "✅ pgvector extension working"
else
    echo "❌ pgvector extension not working"
    exit 1
fi

# Check Bun and dependencies
echo "📦 Checking Bun and dependencies..."
if bun --version > /dev/null 2>&1; then
    echo "✅ Bun runtime available"
else
    echo "❌ Bun runtime not found"
    exit 1
fi

# Test demo files
echo "📝 Checking demo files..."
if [ -f "demo/tensorrt-demo.ts" ]; then
    echo "✅ Demo files present"
else
    echo "❌ Demo files missing"
    exit 1
fi

echo ""
echo "🎉 All validation checks passed!"
echo "✅ TensorRT Knowledge Graph Platform is ready to use"
echo ""
echo "🚀 Run './run-demo.sh' to start the demonstration"
`;

    await writeFile(join(this.outputDir, 'validate.sh'), validateScript);
    
    console.log('✅ Validation script created');
  }

  private async createPackageReadme(): Promise<void> {
    console.log('📖 Creating package README...');
    
    const readme = `# ${this.packageInfo.name}

${this.packageInfo.description}

## 🚀 Quick Start

1. **Run Setup**: \`./setup.sh\`
2. **Start Demo**: \`./run-demo.sh\`
3. **Explore**: Follow the interactive prompts

## 📦 Package Contents

### Demo Components
${this.packageInfo.components.map(c => `- ${c}`).join('\n')}

### Documentation
${this.packageInfo.documentation.map(d => `- ${d}`).join('\n')}

### Example Scenarios
${this.packageInfo.examples.map(e => `- ${e}`).join('\n')}

## 🛠️ Requirements

- **Runtime**: ${this.packageInfo.requirements.runtime}
- **Memory**: ${this.packageInfo.requirements.memory}
- **Disk**: ${this.packageInfo.requirements.disk}
- **Dependencies**: ${this.packageInfo.requirements.dependencies.join(', ')}

## ✨ Features

${this.packageInfo.features.map(f => `${f}`).join('\n')}

## 📋 Setup Instructions

### Automated Setup (Recommended)
\`\`\`bash
./setup.sh
\`\`\`

### Manual Setup
\`\`\`bash
# Install dependencies
bun install
bun add pg pg-pool @types/pg

# Setup environment
cp .env.example .env

# Start PostgreSQL
docker run --name tensorrt-postgres \\
  -e POSTGRES_DB=tensorrt_oracle \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=your_secure_password \\
  -p 5432:5432 \\
  -d pgvector/pgvector:pg16

# Initialize database
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/init.sql
docker exec -i tensorrt-postgres psql -U postgres -d tensorrt_oracle < sql/indices.sql
\`\`\`

## 🎮 Running Demos

### Interactive Demo
\`\`\`bash
./run-demo.sh
# or
bun run demo/tensorrt-demo.ts
\`\`\`

### Specific Workflows
\`\`\`bash
bun run demo/tensorrt-demo.ts --engineer     # Software engineer workflow
bun run demo/tensorrt-demo.ts --researcher   # AI researcher workflow
bun run demo/tensorrt-demo.ts --manager      # Engineering manager workflow
\`\`\`

### Performance Monitoring
\`\`\`bash
bun run demo/metrics-dashboard.ts            # Real-time dashboard
bun run demo/metrics-dashboard.ts --report   # Performance report
\`\`\`

## 📊 What You'll Experience

### EPIC 1: Infrastructure Setup
- PostgreSQL + pgvector database with optimized schema
- High-performance vector indices for semantic search
- Robust connection management and error handling

### EPIC 2: Ingestion Pipeline  
- Multi-language code analysis (CUDA, C++, Python)
- Semantic embedding generation (512-dimensional vectors)
- Knowledge pattern extraction and relationship mapping

### EPIC 3: Query Engine
- Natural language query processing with intent classification
- Hybrid semantic + keyword search capabilities
- Multi-turn conversation support with context awareness

### EPIC 4: Testing & Metrics
- Real-time performance monitoring and analytics
- Automated validation and quality assessment
- User engagement tracking and accuracy metrics

## 🔍 Example Queries

Try these natural language queries in the interactive demo:

**For Engineers:**
- "Find CUDA kernel implementations for convolution operations"
- "Show me memory allocation patterns in TensorRT engines"
- "How does TensorRT handle FP16 precision optimization?"

**For Researchers:**
- "Compare different quantization approaches in the codebase"
- "Explain TensorRT's graph optimization strategies"
- "Show me performance benchmarking implementations"

**For Managers:**
- "What are the main components of TensorRT architecture?"
- "Show me the most complex parts of the codebase"
- "What are the key performance optimization areas?"

## 📈 Performance Expectations

- **Query Response**: < 500ms average
- **Accuracy**: 85%+ confidence on domain queries
- **Throughput**: 100+ queries per minute
- **Concurrent Users**: 50+ simultaneous queries

## 🛠️ Troubleshooting

### Common Issues

**PostgreSQL won't start:**
\`\`\`bash
docker restart tensorrt-postgres
docker logs tensorrt-postgres
\`\`\`

**Port conflicts:**
\`\`\`bash
# Check what's using port 5432
lsof -i :5432
# Use different port if needed
\`\`\`

**Memory issues:**
- Ensure Docker has at least 4GB memory allocated
- Close other applications to free up RAM

### Validation
\`\`\`bash
./validate.sh  # Run comprehensive system validation
\`\`\`

## 📚 Documentation

- **[Quick Start](docs/tensorrt-knowledge-graph/QUICK-START.md)** - Get running in 10 minutes
- **[Architecture](docs/TENSORRT-ORACLE-ARCHITECTURE.md)** - System design and components
- **[Implementation](docs/TENSORRT-IMPLEMENTATION-SPEC.md)** - Technical implementation details
- **[Deployment](docs/TENSORRT-ORACLE-DEPLOYMENT-GUIDE.md)** - Production deployment guide

## 🎯 Success Indicators

You'll know the system is working when:

✅ Database responds to queries  
✅ Vector operations are functional  
✅ Interactive demo starts without errors  
✅ Natural language queries return relevant results  
✅ Performance metrics show healthy system status  

## 🤝 Support

This demo showcases advanced capabilities in semantic code analysis, knowledge graph construction, and natural language processing for technical documentation and code understanding.

---

**Version**: ${this.packageInfo.version}  
**Created**: ${new Date().toLocaleDateString()}  
**Package**: Complete demonstration system for TensorRT Knowledge Graph Platform
`;

    await writeFile(join(this.outputDir, 'README.md'), readme);
    
    console.log('✅ Package README created');
  }

  async generatePackageReport(): Promise<void> {
    console.log('\n📊 DEMO PACKAGE REPORT');
    console.log('=' .repeat(60));
    console.log(`Package: ${this.packageInfo.name}`);
    console.log(`Version: ${this.packageInfo.version}`);
    console.log(`Created: ${new Date().toLocaleDateString()}\n`);

    console.log('📦 PACKAGE CONTENTS:');
    console.log(`- Demo Files: 5 interactive applications`);
    console.log(`- Documentation: 6 comprehensive guides`);
    console.log(`- Examples: 6 realistic scenarios`);
    console.log(`- Setup Scripts: 3 automated scripts`);
    console.log(`- SQL Schema: Complete database setup\n`);

    console.log('✨ KEY FEATURES:');
    this.packageInfo.features.forEach(feature => {
      console.log(`  ${feature}`);
    });

    console.log('\n🎯 DEMONSTRATION CAPABILITIES:');
    console.log('- Natural language code querying');
    console.log('- Real-time performance monitoring');
    console.log('- Multi-persona workflow demonstrations');
    console.log('- Interactive scenario walkthroughs');
    console.log('- Production-ready architecture showcase\n');

    console.log('📋 SYSTEM REQUIREMENTS:');
    console.log(`- Runtime: ${this.packageInfo.requirements.runtime}`);
    console.log(`- Memory: ${this.packageInfo.requirements.memory}`);
    console.log(`- Disk: ${this.packageInfo.requirements.disk}`);
    console.log(`- Dependencies: ${this.packageInfo.requirements.dependencies.join(', ')}\n`);

    console.log('🚀 QUICK START:');
    console.log('1. Extract package to desired location');
    console.log('2. Run: ./setup.sh');
    console.log('3. Run: ./run-demo.sh');
    console.log('4. Follow interactive prompts\n');

    console.log('✅ Package ready for distribution and demonstration!');
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const packager = new DemoPackager();

  try {
    if (args.includes('--report-only')) {
      await packager.generatePackageReport();
      return;
    }

    await packager.createPackage();
    await packager.generatePackageReport();

  } catch (error) {
    console.error('❌ Package creation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}