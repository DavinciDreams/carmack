# Interactive JSONL Viewer Usage Guide

## Overview

The Interactive JSONL Viewer provides both interactive and legacy modes for viewing Claude conversation logs. It maintains full backward compatibility with the original `pretty-print-claude-jsonl.ts` script.

## Quick Start

### Interactive Mode (Default)
```bash
# Launch interactive viewer
bun run interactive-jsonl-viewer.tsx

# Specify a custom file
bun run interactive-jsonl-viewer.tsx -p ./my-conversation.jsonl

# Use package.json scripts
bun run jsonl:view
bun run jsonl:interactive --delay 50
bun run jsonl:debug
```

### Legacy Mode
```bash
# Use original pretty-print behavior
bun run interactive-jsonl-viewer.tsx --legacy

# All original arguments work
bun run interactive-jsonl-viewer.tsx --legacy -p ./conversation.jsonl -d 100
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--path` | `-p` | Path to JSONL file | `~/.claude/projects/...` |
| `--delay` | `-d` | Delay between messages (ms) | `100` |
| `--interactive` | `-i` | Enable interactive mode | `true` |
| `--legacy` | `-l` | Use legacy pretty-print format | `false` |
| `--debug` | `-D` | Enable debug output | `false` |
| `--help` | `-h` | Show help message | - |
| `--version` | `-v` | Show version | - |

## Interactive Mode Controls

### Navigation
- `↑/↓` - Navigate messages one by one
- `←/→` - Jump 10 messages forward/backward
- `Space` - Play/pause auto-scroll

### View Options
- `Tab` - Switch view mode (chronological/tree/compact)
- `f` - Open filter dialog
- `s` - Open search dialog
- `r` - Reset all filters

### Interface
- `t` - Toggle stats panel
- `c` - Toggle controls panel
- `?` - Toggle help
- `q` - Quit

## Package.json Scripts

The following scripts are available:

```bash
# Interactive viewer
bun run jsonl:view                 # Default interactive mode
bun run jsonl:interactive          # Interactive with --delay 50
bun run jsonl:debug               # Interactive with --debug

# Legacy mode (if needed)
bun run jsonl:view --legacy        # Legacy pretty-print mode
```

## Examples

### Basic Usage
```bash
# View default file interactively
bun run interactive-jsonl-viewer.tsx

# View specific file with debug output
bun run interactive-jsonl-viewer.tsx -p ./logs/conversation.jsonl -D

# Fast playback with 10ms delay
bun run interactive-jsonl-viewer.tsx --delay 10
```

### Legacy Compatibility
```bash
# Exact same as original pretty-print script
bun run interactive-jsonl-viewer.tsx --legacy -p ./conversation.jsonl -d 100

# Quick legacy view
bun run interactive-jsonl-viewer.tsx --legacy
```

### Advanced Features
```bash
# Start with debug and specific delay
bun run interactive-jsonl-viewer.tsx --debug --delay 50 -p ./my-file.jsonl

# Non-interactive mode (same as legacy)
bun run interactive-jsonl-viewer.tsx --interactive=false
```

## File Requirements

The JSONL file should contain JSON objects with the following structure:

```json
{
  "uuid": "message-id",
  "parentUuid": "parent-id-or-null",
  "timestamp": "2024-01-01T10:00:00Z",
  "message": {
    "role": "user|assistant|system",
    "content": "Message content"
  }
}
```

## Migration from pretty-print-claude-jsonl.ts

### No Changes Required
If you're using the original script, simply replace:
```bash
./pretty-print-claude-jsonl.ts [options]
```

With:
```bash
bun run interactive-jsonl-viewer.tsx --legacy [options]
```

All existing arguments and behavior are preserved.

### Enhanced Features
To access new interactive features, simply remove `--legacy`:
```bash
bun run interactive-jsonl-viewer.tsx [options]
```

## Error Handling

The viewer includes comprehensive error handling:

- **File not found**: Clear error message with path suggestions
- **Invalid JSON**: Line-by-line error reporting
- **Missing fields**: Graceful handling of optional fields
- **Terminal issues**: Fallback to legacy mode when needed

## Troubleshooting

### Interactive Mode Issues
If interactive mode doesn't work properly:
```bash
# Use legacy mode as fallback
bun run interactive-jsonl-viewer.tsx --legacy
```

### Performance Issues
For large files, consider:
```bash
# Reduce delay for faster processing
bun run interactive-jsonl-viewer.tsx --delay 1

# Use debug mode to identify issues
bun run interactive-jsonl-viewer.tsx --debug
```

### File Path Issues
```bash
# Use absolute paths
bun run interactive-jsonl-viewer.tsx -p /full/path/to/file.jsonl

# Verify file exists
bun run interactive-jsonl-viewer.tsx --debug -p ./your-file.jsonl
```