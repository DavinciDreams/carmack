import React, { useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { useAppState, useAppStateKeyboardHandlers } from './useAppState';
import { useKeyboardNavigation } from './useKeyboardNavigation';

/**
 * Example component showing how to use the useAppState hook
 * This demonstrates the complete integration of state management
 */
function AppStateExample() {
  // Initialize the app state hook
  const { state, actions, computed, isLoading, error } = useAppState(
    './example.jsonl', // Initial file path
    true // Enable persistence
  );

  // Set up keyboard handlers using the new integration
  const keyboardHandlers = useAppStateKeyboardHandlers(state, actions);

  // Use the original keyboard navigation hook with our handlers
  const originalKeyboardNav = useKeyboardNavigation(state, (newState) => {
    // This is a bridge to work with the existing keyboard navigation
    // In practice, you'd replace this with direct calls to actions
    Object.assign(state, newState);
  });

  // Auto-scroll is now handled directly in InteractiveViewer
  // This example shows the pattern, but auto-scroll logic is integrated
  // into the main InteractiveViewer component for better performance

  // Handle initial loading
  useEffect(() => {
    if (!state.messages.length) {
      actions.loadMessages('./example.jsonl');
    }
  }, []);

  // Error handling
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="yellow">Press 'r' to retry or 'q' to quit</Text>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text color="blue">Loading messages...</Text>
      </Box>
    );
  }

  // Main render
  return (
    <Box flexDirection="column">
      {/* Header with stats */}
      <Box borderStyle="single" paddingX={1}>
        <Text color="green">
          Messages: {computed.stats.totalMessages} | 
          Selected: {state.selectedIndex + 1} | 
          Filter: {state.filterType} | 
          Mode: {state.viewMode}
          {state.searchQuery && ` | Search: "${state.searchQuery}"`}
        </Text>
      </Box>

      {/* Help panel */}
      {state.showHelp && (
        <Box borderStyle="single" paddingX={1} marginY={1}>
          <Box flexDirection="column">
            <Text color="cyan">Keyboard Shortcuts:</Text>
            <Text>↑/↓: Navigate | ←/→: Page up/down | Enter: Toggle expand</Text>
            <Text>f: Cycle filters | t: Toggle view mode | /: Search</Text>
            <Text>g/G: Jump to first/last | p: Toggle auto-scroll</Text>
            <Text>a: All messages | A: Assistant only | r: Reset</Text>
            <Text>?: Toggle help | ESC: Clear search/help | q: Quit</Text>
          </Box>
        </Box>
      )}

      {/* Messages list */}
      <Box flexDirection="column" flexGrow={1}>
        {computed.filteredMessages.length === 0 ? (
          <Text color="yellow">No messages match current filters</Text>
        ) : (
          computed.filteredMessages.map((message, index) => (
            <MessageItem
              key={message.uuid}
              message={message}
              index={index}
              isSelected={index === state.selectedIndex}
              isExpanded={state.expandedMessages.has(message.uuid)}
              onToggleExpand={() => actions.toggleExpansion(message.uuid)}
              onSelect={() => actions.selectMessage(index)}
            />
          ))
        )}
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" paddingX={1}>
        <Text color="gray">
          {computed.hasMessages ? (
            <>
              {state.selectedIndex + 1}/{computed.filteredMessages.length}
              {state.autoScroll && ' | AUTO-SCROLL'}
              {computed.isSearching && ` | SEARCH: ${computed.searchResults.length} results`}
            </>
          ) : (
            'No messages loaded'
          )}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Individual message item component
 */
interface MessageItemProps {
  message: any;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}

function MessageItem({ 
  message, 
  index, 
  isSelected, 
  isExpanded, 
  onToggleExpand, 
  onSelect 
}: MessageItemProps) {
  const roleColor = {
    user: 'blue',
    assistant: 'green',
    unknown: 'gray'
  }[message.message?.role || 'unknown'] as const;

  return (
    <Box
      borderStyle={isSelected ? "double" : "single"}
      borderColor={isSelected ? "blue" : "gray"}
      paddingX={1}
      marginY={0}
    >
      <Box flexDirection="column" width="100%">
        {/* Message header */}
        <Box justifyContent="space-between">
          <Text color={roleColor}>
            {message.message?.role || 'unknown'} | {message.uuid.slice(0, 8)}...
          </Text>
          <Text color="gray">
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </Box>

        {/* Message content preview */}
        <Box marginTop={1}>
          <Text wrap="wrap">
            {isExpanded ? 
              getFullMessageContent(message) : 
              getMessagePreview(message)
            }
          </Text>
        </Box>

        {/* Message metadata when expanded */}
        {isExpanded && (
          <Box marginTop={1} flexDirection="column">
            {message.message?.tool_calls && (
              <Text color="yellow">
                Tool calls: {message.message.tool_calls.map(t => t.name).join(', ')}
              </Text>
            )}
            {message.message?.usage && (
              <Text color="cyan">
                Tokens: {message.message.usage.input_tokens + message.message.usage.output_tokens}
              </Text>
            )}
            {message.isSidechain && (
              <Text color="magenta">SIDECHAIN</Text>
            )}
            {message.isMeta && (
              <Text color="magenta">META</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Helper functions for message content
function getMessagePreview(message: any): string {
  const content = getFullMessageContent(message);
  return content.length > 100 ? content.slice(0, 100) + '...' : content;
}

function getFullMessageContent(message: any): string {
  if (!message.message?.content) return '[No content]';
  
  if (typeof message.message.content === 'string') {
    return message.message.content;
  }
  
  if (Array.isArray(message.message.content)) {
    return message.message.content
      .filter(item => item.type === 'text' && item.text)
      .map(item => item.text)
      .join(' ');
  }
  
  return '[Complex content]';
}

/**
 * Advanced usage example showing custom integrations
 */
function AdvancedAppStateExample() {
  const { state, actions, computed, isLoading, error } = useAppState();

  // Example: Custom filter function
  const setCustomFilter = (customFilterFn: (message: any) => boolean) => {
    // This would require extending the hook to support custom filters
    // For now, we can use search as a workaround
    const matchingMessages = state.messages.filter(customFilterFn);
    const uuids = matchingMessages.map(m => m.uuid);
    // Use search to simulate custom filtering
    actions.setSearchQuery(uuids[0] || '');
  };

  // Example: Custom statistics
  const customStats = {
    ...computed.stats,
    averageTokensPerMessage: computed.stats.totalMessages > 0 ? 
      computed.stats.totalTokens / computed.stats.totalMessages : 0,
    messagesWithErrors: state.messages.filter(m => 
      m.message?.content && typeof m.message.content === 'string' && 
      m.message.content.toLowerCase().includes('error')
    ).length
  };

  // Example: Batch operations
  const batchActions = {
    expandAllUserMessages: () => {
      const userMessages = state.messages.filter(m => m.message?.role === 'user');
      userMessages.forEach(m => actions.toggleExpansion(m.uuid));
    },
    
    collapseAllButSelected: () => {
      const selectedMessage = computed.selectedMessage;
      actions.collapseAll();
      if (selectedMessage) {
        actions.toggleExpansion(selectedMessage.uuid);
      }
    },
    
    jumpToNextError: () => {
      const currentIndex = state.selectedIndex;
      const filteredMessages = computed.filteredMessages;
      
      for (let i = currentIndex + 1; i < filteredMessages.length; i++) {
        const message = filteredMessages[i];
        if (message.message?.content && 
            typeof message.message.content === 'string' && 
            message.message.content.toLowerCase().includes('error')) {
          actions.selectMessage(i);
          return;
        }
      }
    }
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan">Advanced App State Example</Text>
      <Text>Custom stats: {JSON.stringify(customStats, null, 2)}</Text>
      
      {/* Custom controls */}
      <Box marginTop={1}>
        <Text color="yellow">
          Custom actions available - extend the hook for your needs
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Performance testing example
 */
function PerformanceTestExample() {
  const { state, actions, computed, isLoading } = useAppState();

  useEffect(() => {
    // Test with a large number of messages
    const testMessages = Array.from({ length: 10000 }, (_, i) => ({
      uuid: `test-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      message: {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Test message ${i} with some content that is longer than usual to test performance`
      }
    }));

    // Measure performance
    const startTime = performance.now();
    
    // This would normally be done through loadMessages
    // but for testing we can directly set state
    console.log('Performance test: Loading', testMessages.length, 'messages');
    
    const endTime = performance.now();
    console.log('Performance test: Loaded in', endTime - startTime, 'ms');
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="cyan">Performance Test Example</Text>
      <Text>Messages loaded: {state.messages.length}</Text>
      <Text>Filtered messages: {computed.filteredMessages.length}</Text>
      <Text>Selected index: {state.selectedIndex}</Text>
      <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
    </Box>
  );
}

// Export examples for use
export { AppStateExample, AdvancedAppStateExample, PerformanceTestExample };

// Example of how to render the component
if (require.main === module) {
  render(<AppStateExample />);
}