import { Box, Text, useInput, useApp } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { FilterDialog } from './components/FilterDialog';
import { MessageList } from './components/MessageList';
import { SearchInput } from './components/SearchInput';
import { StatsPanel } from './components/StatsPanel';
import { useAppState } from './hooks/useAppState';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import type { CLIArgs } from './utils/types';
import { MessageUtils } from './utils/messageUtils';

interface InteractiveViewerProps {
  jsonlPath: string;
  initialDelay?: number;
  debug?: boolean;
  cliArgs?: CLIArgs;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Error boundary component for handling crashes
const ErrorBoundary: React.FC<{ children: React.ReactNode; onError?: (error: Error) => void }> = ({ children, onError }) => {
  const [state, setState] = useState<ErrorBoundaryState>({ hasError: false });
  
  useEffect(() => {
    const handleError = (error: Error) => {
      setState({ hasError: true, error });
      if (onError) {
        onError(error);
      }
    };
    
    // Global error handler for unhandled promise rejections
    process.on('unhandledRejection', handleError);
    process.on('uncaughtException', handleError);
    
    return () => {
      process.off('unhandledRejection', handleError);
      process.off('uncaughtException', handleError);
    };
  }, [onError]);
  
  if (state.hasError) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={15}>
        <Text color="red" bold>❌ Application Error</Text>
        <Text color="gray">{state.error?.message || 'An unexpected error occurred'}</Text>
        <Text color="cyan">Press Ctrl+C to exit</Text>
      </Box>
    );
  }
  
  return <>{children}</>;
};

export const InteractiveViewer: React.FC<InteractiveViewerProps> = ({
  jsonlPath,
  initialDelay = 100,
  debug = false,
  cliArgs,
}) => {
  const { exit } = useApp();
  
  // Use the integrated app state hook
  const { 
    state, 
    actions, 
    computed, 
    isLoading, 
    error 
  } = useAppState(jsonlPath, true);
  
  // UI state
  const [showStats, setShowStats] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'full' | 'compact'>('full');
  
  // Auto-scroll delay configuration
  const autoScrollDelay = useRef(initialDelay);
  
  // Initialize auto-scroll delay
  useEffect(() => {
    actions.setAutoScrollDelay(initialDelay);
  }, [initialDelay]);
  
  // Handle CLI arguments
  useEffect(() => {
    if (cliArgs) {
      if (cliArgs.debug) {
        console.log('Debug mode enabled', { jsonlPath, cliArgs });
      }
      
      if (cliArgs.delay) {
        const delay = Number.parseInt(cliArgs.delay, 10);
        if (!isNaN(delay) && delay > 0) {
          autoScrollDelay.current = delay;
          actions.setAutoScrollDelay(delay);
        }
      }
    }
  }, [cliArgs]);
  
  // Load the JSONL file
  useEffect(() => {
    if (jsonlPath) {
      actions.loadMessages(jsonlPath);
    }
  }, [jsonlPath]);

  // Auto-scroll functionality with playing state sync
  useEffect(() => {
    if (!isPlaying || !state.autoScroll) return;

    const interval = setInterval(() => {
      if (computed.canNavigateDown) {
        actions.selectNext();
      } else {
        setIsPlaying(false);
        actions.setAutoScroll(false);
      }
    }, state.autoScrollDelay);

    return () => clearInterval(interval);
  }, [isPlaying, state.autoScroll, state.autoScrollDelay, state.selectedIndex, computed.filteredMessages.length]);
  
  // Sync playing state with auto-scroll
  useEffect(() => {
    if (state.autoScroll !== isPlaying) {
      setIsPlaying(state.autoScroll);
    }
  }, [state.autoScroll, isPlaying]);
  
  // Handle search with integrated state
  const handleSearch = useCallback(
    (query: string) => {
      actions.setSearchQuery(query);
    },
    []
  );
  
  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterType: typeof state.filterType) => {
      actions.setFilterType(filterType);
    },
    []
  );
  
  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    actions.toggleViewMode();
  }, []);
  
  // Handle help toggle
  const handleHelpToggle = useCallback(() => {
    actions.toggleHelp();
  }, []);

  // Integrate keyboard navigation with enhanced functionality
  useInput((input, key) => {
    // Don't handle navigation when in input mode
    if (showSearch || showFilter) return;

    // Basic navigation
    if (key.upArrow) {
      actions.selectPrevious();
    } else if (key.downArrow) {
      actions.selectNext();
    } else if (key.leftArrow) {
      actions.selectMessage(Math.max(0, state.selectedIndex - 10));
    } else if (key.rightArrow) {
      const max = computed.filteredMessages.length - 1;
      actions.selectMessage(Math.min(max, state.selectedIndex + 10));
    } else if (key.return) {
      // Toggle expansion of current message
      const currentMessage = computed.filteredMessages[state.selectedIndex];
      if (currentMessage && currentMessage.uuid) {
        actions.toggleExpansion(currentMessage.uuid);
      }
    } else if (input === ' ') {
      // Toggle auto-scroll
      actions.toggleAutoScroll();
      setIsPlaying(!isPlaying);
    } else if (key.tab) {
      // Toggle view mode
      actions.toggleViewMode();
    } else if (input === 'f') {
      // Toggle filter type
      const filterTypes = ['all', 'user', 'assistant', 'tools', 'sidechains'] as const;
      const currentIndex = filterTypes.indexOf(state.filterType);
      const nextIndex = (currentIndex + 1) % filterTypes.length;
      actions.setFilterType(filterTypes[nextIndex]);
    } else if (input === 's') {
      setShowSearch(true);
    } else if (input === 'F') {
      setShowFilter(true);
    } else if (input === 'r') {
      // Reset state
      actions.resetState();
    } else if (input === 't') {
      setShowStats(!showStats);
    } else if (input === 'c') {
      setShowControls(!showControls);
    } else if (input === 'g') {
      // Jump to first
      actions.jumpToFirst();
    } else if (input === 'G') {
      // Jump to last
      actions.jumpToLast();
    } else if (input === 'a') {
      // Show all messages
      actions.setFilterType('all');
    } else if (input === 'A') {
      // Show only assistant messages
      actions.setFilterType('assistant');
    } else if (input === 'u') {
      // Show only user messages
      actions.setFilterType('user');
    } else if (input === 'l') {
      // Toggle layout mode
      setLayoutMode(layoutMode === 'full' ? 'compact' : 'full');
    } else if (input === 'R') {
      // Refresh messages
      actions.refreshMessages();
    } else if (input === 'e') {
      // Expand all messages
      actions.expandAll();
    } else if (input === 'E') {
      // Collapse all messages
      actions.collapseAll();
    } else if (input === 'q') {
      exit();
    } else if (input === '?') {
      // Toggle help
      actions.toggleHelp();
    } else if (key.escape) {
      // Clear search and hide overlays
      actions.clearSearch();
      setShowSearch(false);
      setShowFilter(false);
      actions.hideHelp();
    }
  });

  // Error boundary wrapper
  const handleError = useCallback((error: Error) => {
    console.error('InteractiveViewer error:', error);
    if (debug) {
      console.error('Stack trace:', error.stack);
    }
  }, [debug]);
  
  // Loading state
  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center" height={10}>
        <Text color="cyan">🚀 Loading Claude conversation...</Text>
        <Text color="gray">Path: {jsonlPath}</Text>
      </Box>
    );
  }

  // Error state
  if (error || computed.hasError) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" height={10}>
        <Text color="red">❌ Error: {error || state.error}</Text>
        <Text color="gray">Path: {jsonlPath}</Text>
        <Text color="cyan">Press 'R' to retry or 'q' to quit</Text>
      </Box>
    );
  }
  
  // No messages state
  if (!computed.hasMessages) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" height={10}>
        <Text color="yellow">⚠️ No messages found in file</Text>
        <Text color="gray">Path: {jsonlPath}</Text>
        <Text color="gray">Debug: state.messages.length = {state.messages.length}</Text>
        <Text color="gray">Debug: computed.filteredMessages.length = {computed.filteredMessages.length}</Text>
        <Text color="gray">Debug: computed.hasMessages = {computed.hasMessages ? 'true' : 'false'}</Text>
        <Text color="gray">Debug: isLoading = {isLoading ? 'true' : 'false'}</Text>
        <Text color="cyan">Press 'R' to retry or 'q' to quit</Text>
      </Box>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Box flexDirection="column" height="100%">
        {/* Header */}
        <Box borderStyle="single" padding={1}>
          <Text bold color="cyan">
            📋 Interactive Claude JSONL Viewer - {jsonlPath.split('/').pop()}
          </Text>
          {debug && (
            <Text color="gray"> (Debug Mode)</Text>
          )}
        </Box>

        {/* Main content area */}
        <Box flexDirection="row" flexGrow={1}>
          {/* Left sidebar */}
          {layoutMode === 'full' && (
            <Box flexDirection="column" width="25%" minWidth={35} borderStyle="single">
              {showStats && (
                <StatsPanel 
                  messages={state.messages} 
                  filteredMessages={computed.filteredMessages}
                  stats={computed.stats}
                />
              )}

              {showControls && (
                <ControlPanel 
                  state={state}
                  isVisible={showControls}
                />
              )}
            </Box>
          )}

          {/* Main message area */}
          <Box flexDirection="column" flexGrow={1} borderStyle="single">
            <MessageList
              messages={computed.filteredMessages}
              currentIndex={state.selectedIndex}
              viewMode={state.viewMode}
              searchQuery={state.searchQuery}
              showTimestamp={true}
              showTools={true}
              showUsage={true}
              maxHeight={20}
              expandedMessages={state.expandedMessages}
              onToggleExpand={actions.toggleExpansion}
              onSelect={actions.selectMessage}
            />
          </Box>
        </Box>


        {/* Search overlay */}
        {showSearch && (
          <Box
            position="absolute"
            marginTop={5}
            marginLeft={5}
            marginRight={5}
          >
            <SearchInput
              onSearch={handleSearch}
              initialQuery={state.searchQuery}
              isActive={showSearch}
              onExit={() => setShowSearch(false)}
              messages={state.messages}
              maxPreviewResults={5}
              debounceMs={300}
            />
          </Box>
        )}

        {/* Filter overlay */}
        {showFilter && (
          <Box
            position="absolute"
            marginTop={5}
            marginLeft={5}
            marginRight={5}
          >
            <FilterDialog
              currentFilterType={state.filterType}
              messages={state.messages}
              onApplyFilter={(filterType) => {
                actions.setFilterType(filterType);
                setShowFilter(false);
              }}
              isOpen={showFilter}
              onClose={() => setShowFilter(false)}
            />
          </Box>
        )}

        {/* Status bar */}
        <Box borderStyle="single" padding={1} flexDirection="column">
          <Text color="white">
            {isPlaying ? '⏸️ Playing' : '▶️ Paused'} | 
            Message {state.selectedIndex + 1}/{computed.filteredMessages.length} |
            {computed.isSearching && `Search: "${state.searchQuery}" | `}
            {computed.isFiltering && `Filter: ${state.filterType} | `}
            Mode: {state.viewMode} | 
            Layout: {layoutMode} | 
            {state.autoScrollDelay}ms delay | 
            Press ? for help
          </Text>
          {state.showHelp && (
            <Box marginTop={1} paddingY={1} borderTop borderColor="gray">
              <Box flexDirection="column">
                <Text bold color="cyan">Help - Keyboard Shortcuts</Text>
                <Text color="white">Navigation: up/down arrows, left/right page, g/G first/last</Text>
                <Text color="white">Actions: Space play, Enter expand, Tab view</Text>
                <Text color="white">Filters: f cycle, a all, A assistant</Text>
                <Text color="white">Other: r reset, R refresh, q quit, ? toggle help</Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};
