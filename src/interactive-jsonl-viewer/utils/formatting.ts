import type { ContentItem, MessageData, Todo, ToolUseResult } from './types';

// Maximum length for truncation
const MAX_LEN = 1000;

// Truncate long strings
export const truncate = (str: string, maxLen: number): string => {
  if (MAX_LEN > 0 && maxLen < MAX_LEN) {
    maxLen = MAX_LEN;
  }
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
};

// Format XML content with syntax highlighting
export const formatXML = (text: string): string => {
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

          // Return formatted line (Ink will handle colors via props)
          return `  ${trimmed}`;
        })
        .filter((l) => l)
        .join('\n') +
      '\n'
    );
  });
};

// Format task input for display
export const formatTaskInput = (input: any): string => {
  if (!input) return '';

  let output = '\n';

  // Format description
  if (input.description) {
    output += `      📋 Description: ${input.description}\n`;
  }

  // Format prompt (truncated but showing key parts)
  if (input.prompt) {
    output += '      📝 Prompt:\n';

    // Check for XML content in prompt
    if (input.prompt.includes('<') && input.prompt.includes('>')) {
      const formatted = formatXML(input.prompt);
      const lines = formatted.split('\n').slice(0, 15); // Show first 15 lines
      output += lines.join('\n');
      if (formatted.split('\n').length > 15) {
        output += `\n        ... (${formatted.split('\n').length - 15} more lines)`;
      }
    } else {
      const lines = input.prompt.split('\n').slice(0, 10);
      lines.forEach((line: string) => {
        if (line.trim()) {
          output += `        ${truncate(line, 100)}\n`;
        }
      });
    }
  }

  return output;
};

// Format timestamp
export const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  return date.toLocaleTimeString();
};

// Format todo item
export const formatTodo = (todo: Todo): string => {
  const statusEmoji =
    {
      completed: '✅',
      in_progress: '🔄',
      pending: '⏳',
    }[todo.status] || '📝';

  return `${statusEmoji} [${todo.priority}] ${truncate(todo.content, 80)}`;
};

// Format tool result
export const formatToolResult = (result: ToolUseResult): string => {
  let output = '';

  if (result.totalDurationMs) {
    output += `⏱️  Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`;
  }

  if (result.totalTokens) {
    output += ` | 🎯 Tokens: ${result.totalTokens.toLocaleString()}`;
  }

  if (result.totalToolUseCount) {
    output += ` | 🔧 Tools: ${result.totalToolUseCount}`;
  }

  if (result.oldTodos && result.newTodos) {
    output += '\n📋 Todo Updates:\n';
    const changes: string[] = [];
    result.newTodos.forEach((newTodo: Todo) => {
      const oldTodo = result.oldTodos!.find((t: Todo) => t.id === newTodo.id);
      if (!oldTodo || oldTodo.status !== newTodo.status) {
        changes.push(`  ${formatTodo(newTodo)}`);
      }
    });
    output += changes.join('\n');
  }

  return output;
};

// Get role emoji and color
export const getRoleDisplay = (role: string): { emoji: string; color: string } => {
  const roleEmoji = role === 'assistant' ? '🤖' : role === 'user' ? '👤' : '📝';
  const roleColor = role === 'assistant' ? 'cyan' : role === 'user' ? 'yellow' : 'gray';

  return { emoji: roleEmoji, color: roleColor };
};

// Get role emoji only
export const getRoleEmoji = (role: string): string => {
  return getRoleDisplay(role).emoji;
};

// Get role color only
export const getRoleColor = (role: string): string => {
  return getRoleDisplay(role).color;
};

// Extract plain text from message content
export const extractPlainText = (content: ContentItem[] | string): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text!)
      .join('\n');
  }

  return '';
};

// Highlight search term in text
export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm || !text) return text;

  // Simple case-insensitive highlighting
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '**$1**'); // Using markdown bold for terminal highlighting
};

// Format message content for display
export const formatMessageContent = (content: ContentItem[] | string, maxWidth = 100): string => {
  if (typeof content === 'string') {
    const lines = content.split('\n');
    return lines
      .map((line) => {
        if (line.trim()) {
          return truncate(line, maxWidth);
        }
        return line;
      })
      .join('\n');
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
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
            return formatXML(item.text);
          }
          const lines = item.text.split('\n');
          return lines
            .map((line) => {
              if (line.trim()) {
                // Wrap long lines
                if (line.length > maxWidth) {
                  const words = line.split(' ');
                  let currentLine = '';
                  let result = '';
                  words.forEach((word) => {
                    if ((currentLine + word).length > maxWidth) {
                      if (currentLine) {
                        result += currentLine.trim() + '\n';
                        currentLine = '  ' + word + ' ';
                      } else {
                        result += word + '\n';
                      }
                    } else {
                      currentLine += word + ' ';
                    }
                  });
                  if (currentLine.trim()) {
                    result += currentLine.trim();
                  }
                  return result;
                }
                return line;
              }
              return line;
            })
            .join('\n');
        }
        if (item.type === 'tool_result') {
          let preview = '';
          if (item.content) {
            if (typeof item.content === 'string') {
              preview = truncate(item.content.replace(/\n/g, ' '), 100);
            } else if (Array.isArray(item.content)) {
              const textItems = item.content.filter((c: any) => c.type === 'text' && c.text);
              if (textItems.length > 0) {
                preview = truncate(textItems[0].text.replace(/\n/g, ' '), 100);
              }
            } else {
              preview = truncate(JSON.stringify(item.content), 100);
            }
          }
          return `🔧 Tool Result (${item.tool_use_id})\n    ${preview}`;
        }
        if (item.type === 'tool_use') {
          let result = `🔨 ${item.name}`;

          // Special formatting for Task tool
          if (item.name === 'Task' && item.input) {
            result += formatTaskInput(item.input);
          } else if (item.input) {
            const inputStr = JSON.stringify(item.input);
            if (inputStr.length > 80) {
              result += ' (...)';
            } else {
              result += ` (${inputStr})`;
            }
          }
          return result;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
};

// Calculate indent level based on message hierarchy
export const calculateIndentLevel = (
  message: MessageData,
  messageMap: Map<string, MessageData>
): number => {
  if (message.isSidechain) return 2;

  let level = 0;
  let currentUuid = message.parentUuid;

  while (currentUuid && currentUuid !== 'null') {
    const parent = messageMap.get(currentUuid);
    if (!parent) break;

    level += parent.isSidechain ? 2 : 1;
    currentUuid = parent.parentUuid;
  }

  return Math.min(level, 8); // Max indent of 8 levels
};

// Format usage stats
export const formatUsageStats = (usage: any): string => {
  if (!usage) return '';

  let output = `💰 Tokens: in=${usage.input_tokens}`;
  if (usage.cache_read_input_tokens) {
    output += ` (cached=${usage.cache_read_input_tokens})`;
  }
  output += `, out=${usage.output_tokens}`;

  return output;
};

// Create a compact message summary for collapsed view
export const createMessageSummary = (message: MessageData): string => {
  if (!message.message) return '';

  const role = message.message.role || 'unknown';
  const { emoji } = getRoleDisplay(role);

  let summary = `${emoji} ${role.toUpperCase()}`;

  if (message.timestamp) {
    summary += ` ${formatTimestamp(message.timestamp)}`;
  }

  if (message.isSidechain) {
    summary += ' [SUBTASK]';
  }

  if (message.parentUuid && message.parentUuid !== 'null') {
    summary += ' ↳';
  }

  // Add content preview
  if (message.message.content) {
    let preview = '';
    if (typeof message.message.content === 'string') {
      preview = truncate(message.message.content.replace(/\n/g, ' '), 50);
    } else if (Array.isArray(message.message.content)) {
      const textItems = message.message.content.filter((item) => item.type === 'text' && item.text);
      if (textItems.length > 0 && textItems[0]?.text) {
        preview = truncate(textItems[0].text.replace(/\n/g, ' '), 50);
      }
    }
    if (preview) {
      summary += ` - ${preview}`;
    }
  }

  // Add tool count if any
  if (message.message.tool_calls && message.message.tool_calls.length > 0) {
    summary += ` (${message.message.tool_calls.length} tools)`;
  }

  // Add usage stats if available
  if (message.message.usage) {
    summary += ` [${message.message.usage.input_tokens}→${message.message.usage.output_tokens}]`;
  }

  return summary;
};

// Filter messages based on filter options
export const filterMessages = (messages: any[], filters: any): any[] => {
  if (!messages || !Array.isArray(messages)) return [];

  return messages.filter((message) => {
    // Role filter
    if (filters.roles && Array.isArray(filters.roles)) {
      const messageRole = message.message?.role || 'unknown';
      if (!filters.roles.includes(messageRole)) {
        return false;
      }
    }

    // Sidechain filter
    if (typeof filters.showSidechains === 'boolean' && !filters.showSidechains) {
      if (message.isSidechain) {
        return false;
      }
    }

    // Meta filter
    if (typeof filters.showMeta === 'boolean' && !filters.showMeta) {
      if (message.isMeta || message.type === 'summary') {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery && typeof filters.searchQuery === 'string') {
      const query = filters.searchQuery.toLowerCase();
      const messageContent = message.message?.content || '';

      let searchText = '';
      if (typeof messageContent === 'string') {
        searchText = messageContent.toLowerCase();
      } else if (Array.isArray(messageContent)) {
        searchText = messageContent
          .filter((item) => item.type === 'text' && item.text)
          .map((item) => item.text!)
          .join(' ')
          .toLowerCase();
      }

      if (!searchText.includes(query)) {
        return false;
      }
    }

    // Date range filter (if provided)
    if (filters.dateRange && filters.dateRange.from && filters.dateRange.to) {
      const messageDate = new Date(message.timestamp);
      if (messageDate < filters.dateRange.from || messageDate > filters.dateRange.to) {
        return false;
      }
    }

    return true;
  });
};
