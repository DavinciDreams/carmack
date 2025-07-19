import { Box, Text } from 'ink';
import type React from 'react';
import type { ClaudeMessage } from '../types';
import {
  extractPlainText,
  formatTimestamp,
  formatToolResult,
  getRoleColor,
  getRoleEmoji,
  formatMessageContent,
  formatUsageStats,
  formatTaskInput,
} from '../utils/formatting';

interface MessageComponentProps {
  message: ClaudeMessage;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  indentLevel: number;
  onToggleExpand: (uuid: string) => void;
  onSelect: (index: number) => void;
}

export const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  index: _index,
  isSelected,
  isExpanded,
  indentLevel,
  onToggleExpand: _onToggleExpand,
  onSelect: _onSelect,
}) => {
  const role = message.message?.role || 'unknown';
  const roleEmoji = getRoleEmoji(role);
  const roleColor = getRoleColor(role);

  // Note: Click handling is managed by the parent component via keyboard navigation
  // onSelect and onToggleExpand are called by the parent based on user input
  // Parameters prefixed with _ to indicate they are used by the parent component interface

  const maxWidth = 100 - indentLevel * 2;
  const expandIndicator = isExpanded ? '▼' : '▶';
  const hasContent =
    message.message?.content || message.message?.tool_calls || message.toolUseResult;

  return (
    <Box
      flexDirection="column"
      paddingLeft={indentLevel}
      borderStyle={isSelected ? 'double' : undefined}
      borderColor={isSelected ? 'cyan' : undefined}
    >
      {/* Header Section */}
      <Box>
        {/* Expand/Collapse indicator and Role */}
        <Text color={roleColor} bold>
          {hasContent && (
            <Text color="yellow">
              {expandIndicator} 
            </Text>
          )}
          {roleEmoji} {role.toUpperCase()}
        </Text>

        <Text color="gray"> {formatTimestamp(message.timestamp)}</Text>

        {message.isSidechain && <Text color="magenta"> [SUBTASK]</Text>}
        {message.parentUuid && message.parentUuid !== 'null' && <Text color="gray"> ↳</Text>}
      </Box>

      {/* Expandable Content Section */}
      {hasContent && isExpanded && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          {/* Message Content */}
          {message.message?.content && (
            <Box marginBottom={1}>
              <Text wrap="wrap">{formatMessageContent(message.message.content, maxWidth)}</Text>
            </Box>
          )}

          {/* Tool Calls */}
          {message.message?.tool_calls && message.message.tool_calls.length > 0 && (
            <Box marginBottom={1}>
              <Text color="blue" bold>
                🔧 Tool Calls:
              </Text>
              {message.message.tool_calls.map((call, callIndex) => (
                <Box key={callIndex} marginLeft={2}>
                  <Text color="cyan">🔨 {call.name}</Text>
                  {call.name === 'Task' && call.input ? (
                    <Text color="gray">{formatTaskInput(call.input)}</Text>
                  ) : call.input && Object.keys(call.input).length > 0 ? (
                    <Text color="gray">
                      {' '}
                      (
                      {JSON.stringify(call.input).length > 80
                        ? '(...)'
                        : `(${JSON.stringify(call.input)})`}
                      )
                    </Text>
                  ) : null}
                </Box>
              ))}
            </Box>
          )}

          {/* Tool Results */}
          {message.toolUseResult && (
            <Box marginBottom={1}>
              <Text color="green" bold>
                📊 Result:
              </Text>
              <Box marginLeft={2}>
                <Text color="cyan">{formatToolResult(message.toolUseResult)}</Text>
              </Box>
            </Box>
          )}

          {/* Usage Stats for Assistant Messages */}
          {message.message?.usage && role === 'assistant' && (
            <Box marginBottom={1}>
              <Text color="gray">{formatUsageStats(message.message.usage)}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Collapsed Content Preview */}
      {hasContent && !isExpanded && (
        <Box marginTop={1} marginLeft={2}>
          <Text color="gray" dimColor>
            {(() => {
              const content = extractPlainText(message.message?.content || '');
              const preview = content.replace(/\n/g, ' ').substring(0, 60);
              const toolCount = message.message?.tool_calls?.length || 0;
              const hasTools = toolCount > 0 ? ` (${toolCount} tools)` : '';
              const hasResult = message.toolUseResult ? ' [result]' : '';
              return `${preview}${preview.length > 60 ? '...' : ''}${hasTools}${hasResult}`;
            })()}
          </Text>
        </Box>
      )}
    </Box>
  );
};
