🤖 LLM Annotation CLI - Generate LLM-optimized code annotations

USAGE:
  bun run llm-annotate.ts [directory] [options]

ARGUMENTS:
  directory                 Directory to analyze (default: current directory)

OPTIONS:
  -h, --help               Show this help message
  -d, --directory <path>   Directory to analyze
  -o, --output <path>      Output directory (default: ./output/annotations)
  -f, --format <format>    Output format: json, markdown, yaml (default: json)
  --depth <level>          Analysis depth: surface, detailed, comprehensive (default: detailed)
  --focus <areas>          Focus areas: patterns,architecture,performance,security,maintainability
  --include <patterns>     Include file patterns (comma-separated)
  --exclude <patterns>     Exclude file patterns (comma-separated)
  --no-prompts            Don't generate LLM prompts
  -v, --verbose           Verbose output

EXAMPLES:
  # Analyze current directory
  bun run llm-annotate.ts

  # Analyze specific directory with markdown output
  bun run llm-annotate.ts ./src --format markdown

  # Comprehensive analysis focusing on patterns and architecture
  bun run llm-annotate.ts --depth comprehensive --focus patterns,architecture

  # Analyze with custom include/exclude patterns
  bun run llm-annotate.ts --include "**/*.ts,**/*.tsx" --exclude "**/*.test.*,**/node_modules/**"

  # Generate annotations for LLM consumption
  bun run llm-annotate.ts ./src --format json --output ./llm-context

FOCUS AREAS:
  patterns        - Code patterns and anti-patterns
  architecture    - System architecture and component relationships
  performance     - Performance optimization opportunities
  security        - Security vulnerabilities and improvements
  maintainability - Code maintainability and technical debt

OUTPUT FORMATS:
  json           - Structured JSON for programmatic use
  markdown       - Human-readable markdown report
  yaml           - YAML format for configuration-like usage

The generated annotations include:
  • Code patterns and architectural insights
  • Transformation opportunities with effort estimates
  • LLM-optimized prompts for code review and refactoring
  • Quality metrics and recommendations
  • Structured data for AI-assisted development