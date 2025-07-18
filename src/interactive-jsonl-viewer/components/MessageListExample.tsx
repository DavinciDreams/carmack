import React, { useState, useCallback, useEffect } from 'react';
import { MessageList } from './WebMessageList';
import type { MessageData, AppState } from '../utils/types';
import { MessageUtils } from '../utils/messageUtils';

// Example component showing how to use the MessageList
export const MessageListExample: React.FC = () => {
  // Sample data - in a real app, this would come from props or context
  const [messages, setMessages] = useState<MessageData[]>([
    {
      uuid: '1',
      timestamp: '2023-01-01T10:00:00Z',
      message: {
        role: 'user',
        content: 'Hello, can you help me with a programming question?',
      },
    },
    {
      uuid: '2',
      timestamp: '2023-01-01T10:01:00Z',
      message: {
        role: 'assistant',
        content: 'Of course! I\'d be happy to help you with your programming question. What would you like to know?',
      },
    },
    {
      uuid: '3',
      timestamp: '2023-01-01T10:02:00Z',
      message: {
        role: 'user',
        content: 'I\'m trying to implement virtual scrolling in React. Can you provide some guidance?',
      },
    },
    {
      uuid: '4',
      timestamp: '2023-01-01T10:03:00Z',
      message: {
        role: 'assistant',
        content: 'Virtual scrolling is a great technique for handling large datasets efficiently. Here are the key concepts...',
        tool_calls: [
          {
            name: 'CodeExample',
            input: {
              language: 'typescript',
              code: 'const virtualScroll = useMemo(() => { ... })'
            }
          }
        ]
      },
    },
    {
      uuid: '5',
      timestamp: '2023-01-01T10:04:00Z',
      isSidechain: true,
      message: {
        role: 'assistant',
        content: 'Let me also provide a performance optimization tip...',
      },
    },
  ]);

  // Component state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<AppState['viewMode']>('chronological');
  const [filterType, setFilterType] = useState<AppState['filterType']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Handlers
  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleToggleExpand = useCallback((uuid: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uuid)) {
        newSet.delete(uuid);
      } else {
        newSet.add(uuid);
      }
      return newSet;
    });
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset selection when search changes
    setSelectedIndex(0);
  }, []);

  const handleFilterChange = useCallback((newFilterType: AppState['filterType']) => {
    setFilterType(newFilterType);
    // Reset selection when filter changes
    setSelectedIndex(0);
  }, []);

  const handleViewModeChange = useCallback((newViewMode: AppState['viewMode']) => {
    setViewMode(newViewMode);
  }, []);

  // Simulate loading data
  const loadMoreMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add some mock messages
      const newMessages: MessageData[] = Array.from({ length: 20 }, (_, i) => ({
        uuid: `generated-${messages.length + i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        message: {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `This is generated message ${messages.length + i + 1}. ${
            i % 3 === 0 ? 'It has some longer content to test the virtual scrolling performance with various message lengths.' : ''
          }`,
        },
      }));
      
      setMessages(prev => [...prev, ...newMessages]);
    } catch (err) {
      setError('Failed to load more messages');
    } finally {
      setIsLoading(false);
    }
  }, [messages.length]);

  // Simulate error
  const simulateError = useCallback(() => {
    setError('This is a simulated error to test error handling');
  }, []);

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  // Get filtered messages for stats
  const filteredMessages = MessageUtils.filterMessagesByType(messages, filterType);
  const stats = MessageUtils.calculateMessageStats(filteredMessages);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>MessageList Component Example</h1>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div>
          <label htmlFor="view-mode">View Mode: </label>
          <select
            id="view-mode"
            value={viewMode}
            onChange={(e) => handleViewModeChange(e.target.value as AppState['viewMode'])}
          >
            <option value="chronological">Chronological</option>
            <option value="tree">Tree</option>
          </select>
        </div>
        
        <button onClick={loadMoreMessages} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More Messages'}
        </button>
        
        <button onClick={simulateError}>Simulate Error</button>
        
        {error && (
          <button onClick={clearError}>Clear Error</button>
        )}
      </div>

      {/* Stats */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Conversation Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
          <div>Total Messages: {stats.totalMessages}</div>
          <div>User Messages: {stats.userMessages}</div>
          <div>Assistant Messages: {stats.assistantMessages}</div>
          <div>Tool Calls: {stats.toolCalls}</div>
          <div>Sidechains: {stats.sidechains}</div>
          <div>Total Tokens: {stats.totalTokens}</div>
        </div>
      </div>

      {/* MessageList Component */}
      <div style={{ border: '1px solid #ccc', borderRadius: '4px', height: '600px' }}>
        <MessageList
          messages={messages}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          expandedMessages={expandedMessages}
          onToggleExpand={handleToggleExpand}
          filterType={filterType}
          searchQuery={searchQuery}
          viewMode={viewMode}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          error={error}
          itemHeight={120}
          maxHeight={600}
          className="example-message-list"
        />
      </div>

      {/* Usage Instructions */}
      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h3>Usage Instructions</h3>
        <ul>
          <li><strong>Navigation:</strong> Use ↑/↓ arrows to navigate between messages</li>
          <li><strong>Expand/Collapse:</strong> Press Enter or Space to expand/collapse messages</li>
          <li><strong>Search:</strong> Press / to open search, or click the search button</li>
          <li><strong>Filter:</strong> Press f to open filter dialog, or click the filter button</li>
          <li><strong>Keyboard Shortcuts:</strong> Home/End to jump to first/last message</li>
          <li><strong>Mouse:</strong> Click to select, double-click to expand/collapse</li>
        </ul>
      </div>

      {/* Technical Details */}
      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h3>Technical Features</h3>
        <ul>
          <li><strong>Virtual Scrolling:</strong> Efficiently handles large datasets (1000+ messages)</li>
          <li><strong>Search Integration:</strong> Real-time search with highlighting</li>
          <li><strong>Filter Integration:</strong> Multiple filter types with live counts</li>
          <li><strong>Keyboard Navigation:</strong> Full keyboard accessibility</li>
          <li><strong>Error Handling:</strong> Graceful error states and loading indicators</li>
          <li><strong>Performance Optimized:</strong> Memoized calculations and virtual rendering</li>
          <li><strong>TypeScript:</strong> Fully typed with comprehensive interfaces</li>
        </ul>
      </div>
    </div>
  );
};

export default MessageListExample;