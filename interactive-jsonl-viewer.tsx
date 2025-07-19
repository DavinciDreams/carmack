#!/usr/bin/env bun

import { render } from 'ink';
import { parseArgs } from 'util';
import { readFile } from 'fs/promises';
import { InteractiveViewer } from './src/interactive-jsonl-viewer/InteractiveViewer';

// Legacy pretty-print function (extracted from pretty-print-claude-jsonl.ts)
async function runLegacyPrettyPrint(path: string, delay: number, debug: boolean) {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Track parent-child relationships
  const parentChildMap = new Map<string, string[]>();
  const messageMap = new Map<string, any>();
  const allMessages: any[] = [];

  const MAX_LEN = 1000;

  const truncate = (str: string, maxLen: number): string => {
    if (MAX_LEN > 0 && maxLen < MAX_LEN) {
      maxLen = MAX_LEN;
    }
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + '...';
  };

  const formatXML = (text: string, indent: string): string => {
    // Pretty print all XML blocks, not just reasoning_trace
    const xmlRegex = /<([a-zA-Z_][a-zA-Z0-9_-]*)([^>]*)>([\s\S]*?)<\/\1>/g;

    return text.replace(xmlRegex, (match) => {
      const lines = match.split('\n');
      return (
        '\n' +
        lines
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '';

            // Color XML tags
            const colored = trimmed
              .replace(/<([^>]+)>/g, '\x1b[34m<$1>\x1b[0m')
              .replace(/<\/([^>]+)>/g, '\x1b[34m</$1>\x1b[0m');

            return `${indent}\x1b[90m${colored}\x1b[0m`;
          })
          .filter((l) => l)
          .join('\n') +
        '\n'
      );
    });
  };

  const formatTaskInput = (input: any, spaces: string): string => {
    if (!input) return '';

    let output = '\n';

    // Format description
    if (input.description) {
      output += `${spaces}      \x1b[93m📋 Description:\x1b[0m ${input.description}\n`;
    }

    // Format prompt (truncated but showing key parts)
    if (input.prompt) {
      output += `${spaces}      \x1b[93m📝 Prompt:\x1b[0m\n`;

      // Check for XML content in prompt
      if (input.prompt.includes('<') && input.prompt.includes('>')) {
        const formatted = formatXML(input.prompt, spaces + '        ');
        const lines = formatted.split('\n').slice(0, 15); // Show first 15 lines
        output += lines.join('\n');
        if (formatted.split('\n').length > 15) {
          output += `\n${spaces}        \x1b[90m... (${formatted.split('\n').length - 15} more lines)\x1b[0m`;
        }
      } else {
        const lines = input.prompt.split('\n').slice(0, 10);
        lines.forEach((line: string) => {
          if (line.trim()) {
            output += `${spaces}        ${truncate(line, 100)}\n`;
          }
        });
      }
    }

    return output;
  };

  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts);
    return `\x1b[90m${date.toLocaleTimeString()}\x1b[0m`;
  };

  const formatTodo = (todo: any): string => {
    const statusEmoji =
      {
        completed: '✅',
        in_progress: '🔄',
        pending: '⏳',
      }[todo.status] || '📝';

    const priorityColor =
      {
        high: '\x1b[91m',
        medium: '\x1b[93m',
        low: '\x1b[92m',
      }[todo.priority] || '\x1b[0m';

    return `${statusEmoji} ${priorityColor}[${todo.priority}]\x1b[0m ${truncate(todo.content, 80)}`;
  };

  const formatToolResult = (result: any): string => {
    let output = '';

    if (result.totalDurationMs) {
      output += `⏱️  Duration: \x1b[36m${(result.totalDurationMs / 1000).toFixed(1)}s\x1b[0m`;
    }

    if (result.totalTokens) {
      output += ` | 🎯 Tokens: \x1b[36m${result.totalTokens.toLocaleString()}\x1b[0m`;
    }

    if (result.totalToolUseCount) {
      output += ` | 🔧 Tools: \x1b[36m${result.totalToolUseCount}\x1b[0m`;
    }

    if (result.oldTodos && result.newTodos) {
      output += '\n\x1b[1m📋 Todo Updates:\x1b[0m\n';
      const changes: string[] = [];
      result.newTodos.forEach((newTodo: any) => {
        const oldTodo = result.oldTodos.find((t: any) => t.id === newTodo.id);
        if (!oldTodo || oldTodo.status !== newTodo.status) {
          changes.push(`  ${formatTodo(newTodo)}`);
        }
      });
      output += changes.join('\n');
    }

    return output;
  };

  const formatMessage = (obj: any, indent = 0): string => {
    const spaces = ' '.repeat(indent);
    let output = '';

    // Add line break before message for better spacing
    if (indent === 0) {
      output += '\n';
    }

    // Header with metadata
    if (obj.message) {
      const msg = obj.message;
      const role = msg.role || 'unknown';
      const roleEmoji = role === 'assistant' ? '🤖' : role === 'user' ? '👤' : '📝';
      const roleColor = role === 'assistant' ? '\x1b[36m' : role === 'user' ? '\x1b[33m' : '\x1b[90m';

      output += `${spaces}${roleEmoji} ${roleColor}${role.toUpperCase()}\x1b[0m`;

      if (obj.timestamp) {
        output += ` ${formatTimestamp(obj.timestamp)}`;
      }

      if (obj.isSidechain) {
        output += ' \x1b[95m[SUBTASK]\x1b[0m';
      }

      if (obj.parentUuid && obj.parentUuid !== 'null') {
        output += ' \x1b[90m↳\x1b[0m';
      }

      output += '\n';

      // Message content
      if (msg.content) {
        if (Array.isArray(msg.content)) {
          msg.content.forEach((item: any) => {
            if (item.type === 'text' && item.text) {
              // Check if this is XML content
              if (
                item.text.includes('<') &&
                item.text.includes('>') &&
                (item.text.includes('reasoning_trace') ||
                  item.text.includes('objective') ||
                  item.text.includes('methodology') ||
                  item.text.includes('confidence_score'))
              ) {
                output += `${spaces}  ${formatXML(item.text, spaces + '  ')}`;
              } else {
                const lines = item.text.split('\n');
                lines.forEach((line: string) => {
                  if (line.trim()) {
                    // Wrap long lines
                    const maxWidth = 100 - indent;
                    if (line.length > maxWidth) {
                      const words = line.split(' ');
                      let currentLine = '';
                      words.forEach((word) => {
                        if ((currentLine + word).length > maxWidth) {
                          if (currentLine) {
                            output += `${spaces}  ${currentLine.trim()}\n`;
                            currentLine = '  ' + word + ' ';
                          } else {
                            output += `${spaces}  ${word}\n`;
                          }
                        } else {
                          currentLine += word + ' ';
                        }
                      });
                      if (currentLine.trim()) {
                        output += `${spaces}  ${currentLine.trim()}\n`;
                      }
                    } else {
                      output += `${spaces}  ${line}\n`;
                    }
                  }
                });
              }
            } else if (item.type === 'tool_result') {
              output += `${spaces}  🔧 \x1b[90mTool Result (${item.tool_use_id})\x1b[0m\n`;
              if (item.content) {
                let preview = '';
                if (typeof item.content === 'string') {
                  preview = truncate(item.content.replace(/\n/g, ' '), 100);
                } else if (Array.isArray(item.content)) {
                  // Handle array of content items
                  const textItems = item.content.filter((c: any) => c.type === 'text' && c.text);
                  if (textItems.length > 0) {
                    preview = truncate(textItems[0].text.replace(/\n/g, ' '), 100);
                  }
                } else {
                  preview = truncate(JSON.stringify(item.content), 100);
                }
                if (preview) {
                  output += `${spaces}    ${preview}\n`;
                }
              }
            } else if (item.type === 'tool_use') {
              output += `${spaces}  🔨 \x1b[94m${item.name}\x1b[0m`;

              // Special formatting for Task tool
              if (item.name === 'Task' && item.input) {
                output += formatTaskInput(item.input, spaces);
              } else if (item.input) {
                const inputStr = JSON.stringify(item.input);
                if (inputStr.length > 80) {
                  output += ' \x1b[90m(...)\x1b[0m';
                } else {
                  output += ` \x1b[90m(${inputStr})\x1b[0m`;
                }
              }
              output += '\n';
            }
          });
        } else if (typeof msg.content === 'string') {
          const lines = msg.content.split('\n');
          lines.forEach((line: string) => {
            if (line.trim()) {
              output += `${spaces}  ${truncate(line, 120)}\n`;
            }
          });
        }
      }

      // Usage stats for assistant messages
      if (msg.usage && role === 'assistant') {
        const usage = msg.usage;
        output += `${spaces}  \x1b[90m💰 Tokens: in=${usage.input_tokens}`;
        if (usage.cache_read_input_tokens) {
          output += ` (cached=${usage.cache_read_input_tokens})`;
        }
        output += `, out=${usage.output_tokens}\x1b[0m\n`;
      }

      // Tool calls for assistant
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        output += `${spaces}  \x1b[1m🔧 Tool Calls:\x1b[0m\n`;
        msg.tool_calls.forEach((call: any) => {
          output += `${spaces}    🔨 \x1b[94m${call.name}\x1b[0m`;

          // Special formatting for Task tool
          if (call.name === 'Task' && call.input) {
            output += formatTaskInput(call.input, spaces);
          } else if (call.input) {
            const inputStr = JSON.stringify(call.input);
            if (inputStr.length > 80) {
              output += ' \x1b[90m(...)\x1b[0m';
            } else {
              output += ` \x1b[90m${inputStr}\x1b[0m`;
            }
          }
          output += '\n';
        });
      }
    }

    // Tool use results - but only if not already shown in message content
    if (obj.toolUseResult && !obj.message) {
      output += `${spaces}  \x1b[1m📊 Result:\x1b[0m\n`;
      const resultStr = formatToolResult(obj.toolUseResult);
      resultStr.split('\n').forEach((line: string) => {
        if (line.trim()) {
          output += `${spaces}    ${line}\n`;
        }
      });
    }

    return output;
  };

  try {
    console.log('\x1b[36m🚀 Loading Claude conversation...\x1b[0m\n');

    const content = await readFile(path, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    // Parse all messages first
    lines.forEach((line, i) => {
      try {
        const obj = JSON.parse(line);
        allMessages.push(obj);

        if (obj.uuid) {
          messageMap.set(obj.uuid, obj);

          if (obj.parentUuid && obj.parentUuid !== 'null') {
            if (!parentChildMap.has(obj.parentUuid)) {
              parentChildMap.set(obj.parentUuid, []);
            }
            parentChildMap.get(obj.parentUuid)!.push(obj.uuid);
          }
        }
      } catch (e) {
        console.error(`\x1b[31m❌ Error parsing line ${i + 1}:\x1b[0m ${e.message}`);
      }
    });

    console.log(`\x1b[32m✓ Loaded ${allMessages.length} messages\x1b[0m\n`);

    if (delay > 0) {
      console.log(`\x1b[90m⏱️  Streaming with ${delay}ms delay...\x1b[0m\n`);
      await sleep(500);
    }

    console.log(
      '\x1b[1m\x1b[35m══════════════════════════════════════════════════════════════\x1b[0m\n'
    );

    const visited = new Set<string>();

    // Simple chronological display with smart indentation
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];

      // Skip summary messages and meta messages
      if (msg.type === 'summary' || msg.isMeta) continue;

      // Determine indentation
      let indent = 0;

      // Only indent if this is a sidechain or has a parent that was recently shown
      if (msg.isSidechain) {
        indent = 2;
      } else if (msg.parentUuid && msg.parentUuid !== 'null') {
        // Check if parent was shown in last 10 messages
        for (let j = Math.max(0, i - 10); j < i; j++) {
          if (allMessages[j].uuid === msg.parentUuid) {
            // Calculate proper indent based on parent's position
            const parent = allMessages[j];
            if (parent.isSidechain || (parent.parentUuid && parent.parentUuid !== 'null')) {
              indent = 4;
            } else {
              indent = 2;
            }
            break;
          }
        }
      }

      process.stdout.write(formatMessage(msg, indent));

      if (delay > 0) {
        await sleep(delay);
      }
    }

    console.log(
      '\n\x1b[1m\x1b[35m══════════════════════════════════════════════════════════════\x1b[0m'
    );
    console.log(`\n\x1b[36m✨ Done! ${visited.size} messages in conversation tree.\x1b[0m\n`);
  } catch (error) {
    console.error(`\x1b[31m❌ Failed to read file:\x1b[0m ${error.message}`);
    console.error(`\x1b[90mPath: ${path}\x1b[0m`);
    process.exit(1);
  }
}

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    delay: { type: 'string', short: 'd', default: '100' },
    path: { type: 'string', short: 'p' },
    help: { type: 'boolean', short: 'h' },
    debug: { type: 'boolean', short: 'D' },
    interactive: { type: 'boolean', short: 'i', default: true },
    legacy: { type: 'boolean', short: 'l', default: false },
    version: { type: 'boolean', short: 'v' },
  },
  allowPositionals: true,
});

// Version information
const VERSION = '1.0.0';
const DESCRIPTION = 'Interactive Claude JSONL Viewer';

// Show help
if (values.help) {
  console.log(`
\x1b[36m📋 ${DESCRIPTION}\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  bun run interactive-jsonl-viewer.tsx [OPTIONS] [PATH]

\x1b[1mOPTIONS:\x1b[0m
  -p, --path <path>       Path to JSONL file (default: ~/.claude/projects/...)
  -d, --delay <ms>        Delay between messages in ms (default: 100)
  -i, --interactive       Enable interactive mode (default: true)
  -l, --legacy            Use legacy pretty-print output format
  -D, --debug             Enable debug output
  -h, --help              Show this help message
  -v, --version           Show version information

\x1b[1mINTERACTIVE MODE CONTROLS:\x1b[0m
  ↑/↓                     Navigate messages
  ←/→                     Jump 10 messages
  Space                   Play/pause auto-scroll
  Tab                     Switch view mode (chronological/tree/compact)
  f                       Open filter dialog
  s                       Open search dialog
  r                       Reset all filters
  t                       Toggle stats panel
  c                       Toggle controls panel
  ?                       Toggle help
  q                       Quit

\x1b[1mEXAMPLES:\x1b[0m
  bun run interactive-jsonl-viewer.tsx
  bun run interactive-jsonl-viewer.tsx -p ./conversation.jsonl
  bun run interactive-jsonl-viewer.tsx --delay 50 --debug
  bun run interactive-jsonl-viewer.tsx --legacy  # Use old format

\x1b[1mBACKWARDS COMPATIBILITY:\x1b[0m
  All arguments from pretty-print-claude-jsonl.ts are supported.
  Use --legacy for non-interactive output matching the original script.

\x1b[90mVersion: ${VERSION}\x1b[0m
`);
  process.exit(0);
}

// Show version
if (values.version) {
  console.log(`${DESCRIPTION} v${VERSION}`);
  process.exit(0);
}

// Determine the JSONL path
const jsonlPath = values.path || positionals[0] || 
  `${process.env.HOME}/.claude/projects/-Users-exhaze-p-rainmaker/fc9aaa99-cb13-4bb5-a041-a337be453e7e.jsonl`;

// Parse delay
const delay = Number.parseInt(values.delay || '100', 10);
if (Number.isNaN(delay) || delay < 0) {
  console.error(`\x1b[31m❌ Invalid delay: ${values.delay}. Must be a non-negative number.\x1b[0m`);
  process.exit(1);
}

// Enable debug mode
if (values.debug) {
  console.log('\x1b[90m🔍 Debug mode enabled\x1b[0m');
  console.log(`\x1b[90mPath: ${jsonlPath}\x1b[0m`);
  console.log(`\x1b[90mDelay: ${delay}ms\x1b[0m`);
  console.log(`\x1b[90mInteractive: ${values.interactive}\x1b[0m`);
  console.log(`\x1b[90mLegacy: ${values.legacy}\x1b[0m`);
}

// Main execution
async function main() {
  // Legacy mode - use original pretty-print script behavior
  if (values.legacy || !values.interactive) {
    console.log('\x1b[33m⚠️  Legacy mode - using original pretty-print script behavior\x1b[0m');
    console.log('\x1b[90mFor interactive mode, use: bun run interactive-jsonl-viewer.tsx --interactive\x1b[0m\n');
    
    // Run the legacy pretty-print logic inline
    await runLegacyPrettyPrint(jsonlPath, delay, values.debug);
  } else {
    // Interactive mode - use React component
    try {
      // Validate that the file exists
      const file = Bun.file(jsonlPath);
      if (!(await file.exists())) {
        console.error(`\x1b[31m❌ File not found: ${jsonlPath}\x1b[0m`);
        console.error('\x1b[90mTip: Use -p to specify a different path\x1b[0m');
        process.exit(1);
      }

      // Start the interactive viewer
      const cliArgs = {
        path: values.path,
        delay: values.delay,
        help: values.help,
        debug: values.debug,
        interactive: values.interactive,
      };
      
      const { unmount } = render(
        <InteractiveViewer 
          jsonlPath={jsonlPath}
          initialDelay={delay}
          debug={values.debug}
          cliArgs={cliArgs}
        />
      );

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        unmount();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        unmount();
        process.exit(0);
      });

    } catch (error) {
      console.error(`\x1b[31m❌ Error starting interactive viewer: ${error.message}\x1b[0m`);
      
      if (values.debug) {
        console.error('\x1b[90mStack trace:\x1b[0m');
        console.error(error.stack);
      }
      
      console.error('\x1b[90mTip: Try --legacy mode for non-interactive output\x1b[0m');
      process.exit(1);
    }
  }
}

// Execute main function
main().catch((error) => {
  console.error(`\x1b[31m❌ Fatal error: ${error.message}\x1b[0m`);
  process.exit(1);
});