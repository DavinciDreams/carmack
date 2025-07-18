import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';
import type { ClaudeMessage } from '../types';
import type { ConversationStats } from '../utils/types';

interface StatsPanelProps {
  messages: ClaudeMessage[];
  filteredMessages: ClaudeMessage[];
  isVisible?: boolean;
  compact?: boolean;
}

// Calculate comprehensive conversation statistics
export const calculateStats = (messages: ClaudeMessage[]): ConversationStats => {
  const stats: ConversationStats = {
    totalMessages: messages.length,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    sidechains: 0,
    totalTokens: 0,
    totalDuration: 0,
  };

  messages.forEach((msg) => {
    // Count by role
    if (msg.message?.role === 'user') {
      stats.userMessages++;
    } else if (msg.message?.role === 'assistant') {
      stats.assistantMessages++;
    }

    // Count sidechains
    if (msg.isSidechain) {
      stats.sidechains++;
    }

    // Count tool calls
    if (msg.message?.tool_calls && msg.message.tool_calls.length > 0) {
      stats.toolCalls += msg.message.tool_calls.length;
    }

    // Sum tokens
    if (msg.message?.usage) {
      stats.totalTokens += msg.message.usage.input_tokens + msg.message.usage.output_tokens;
    }

    // Sum duration
    if (msg.toolUseResult?.totalDurationMs) {
      stats.totalDuration += msg.toolUseResult.totalDurationMs;
    }
  });

  return stats;
};

export const StatsPanel: React.FC<StatsPanelProps> = ({
  messages,
  filteredMessages,
  isVisible = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showFilteredView, setShowFilteredView] = useState(false);

  // Handle keyboard input for stats panel
  useInput((input) => {
    if (input === 'e') {
      setIsExpanded(!isExpanded);
    } else if (input === 'v') {
      setShowFilteredView(!showFilteredView);
    }
  });

  if (!isVisible) return null;

  const allStats = calculateStats(messages);
  const filteredStats = calculateStats(filteredMessages);
  const currentStats = showFilteredView ? filteredStats : allStats;

  // Calculate additional derived stats
  const averageTokensPerMessage =
    currentStats.totalMessages > 0
      ? Math.round(currentStats.totalTokens / currentStats.totalMessages)
      : 0;

  const averageDurationPerMessage =
    currentStats.totalMessages > 0
      ? Math.round(currentStats.totalDuration / currentStats.totalMessages)
      : 0;

  const toolUsageRate =
    currentStats.totalMessages > 0
      ? Math.round((currentStats.toolCalls / currentStats.totalMessages) * 100)
      : 0;

  const sidechainRate =
    currentStats.totalMessages > 0
      ? Math.round((currentStats.sidechains / currentStats.totalMessages) * 100)
      : 0;

  if (compact && !isExpanded) {
    return (
      <Box flexDirection="column" borderStyle="single" padding={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color="cyan">
            📊 Stats
          </Text>
          <Text color="gray" dimColor>
            Press 'e' to expand
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="white">Messages:</Text>
          <Text color="green">{currentStats.totalMessages}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="white">Tokens:</Text>
          <Text color="yellow">{currentStats.totalTokens.toLocaleString()}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">
          📊 Conversation Statistics
        </Text>
        <Box>
          <Text color="gray" dimColor>
            {showFilteredView ? 'Filtered' : 'All'} | e:expand v:toggle
          </Text>
        </Box>
      </Box>

      {/* Core metrics */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          Core Metrics:
        </Text>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">💬 Total:</Text>
          <Text color="green">{currentStats.totalMessages}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">👤 User:</Text>
          <Text color="blue">{currentStats.userMessages}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">🤖 Assistant:</Text>
          <Text color="cyan">{currentStats.assistantMessages}</Text>
        </Box>
      </Box>

      {/* Activity metrics */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          Activity:
        </Text>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">🔧 Tools:</Text>
          <Text color="magenta">{currentStats.toolCalls}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">🔀 Sides:</Text>
          <Text color="yellow">{currentStats.sidechains}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">📊 Tool%:</Text>
          <Text color="magenta">{toolUsageRate}%</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">📈 Side%:</Text>
          <Text color="yellow">{sidechainRate}%</Text>
        </Box>
      </Box>

      {/* Performance metrics */}
      {currentStats.totalTokens > 0 && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Performance:
          </Text>
          <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
            <Text color="white">🎯 Tokens:</Text>
            <Text color="yellow">{currentStats.totalTokens.toLocaleString()}</Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
            <Text color="white">📊 Avg:</Text>
            <Text color="yellow">{averageTokensPerMessage.toLocaleString()}</Text>
          </Box>
        </Box>
      )}

      {currentStats.totalDuration > 0 && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Timing:
          </Text>
          <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
            <Text color="white">⏱️ Total:</Text>
            <Text color="green">{(currentStats.totalDuration / 1000).toFixed(1)}s</Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
            <Text color="white">📊 Avg:</Text>
            <Text color="green">{averageDurationPerMessage}ms</Text>
          </Box>
        </Box>
      )}

      {/* View toggle indicator */}
      {messages.length !== filteredMessages.length && (
        <Box marginTop={1} paddingTop={1} borderTop borderColor="gray">
          <Text color="gray" dimColor>
            {showFilteredView
              ? `Showing filtered: ${filteredMessages.length}/${messages.length} messages`
              : `Showing all: ${messages.length} messages`}
          </Text>
        </Box>
      )}
    </Box>
  );
};
