import { Box, Text } from 'ink';
import type React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import type { AppState } from '../utils/types';

/**
 * Example component demonstrating how to integrate the ControlPanel
 * with the keyboard navigation system from useKeyboardNavigation.
 * 
 * This serves as a reference implementation showing:
 * 1. How to set up the AppState with proper types
 * 2. How to integrate keyboard navigation handlers
 * 3. How to manage the control panel visibility and state
 * 4. Proper TypeScript integration with all components
 */
export const ControlPanelExample: React.FC = () => {
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  
  // Example AppState - in real usage, this would come from your main component
  const [appState, setAppState] = useState<AppState>({
    messages: [
      {
        uuid: '1',
        timestamp: new Date().toISOString(),
        message: {
          role: 'user',
          content: 'Hello, this is a test message',
        },
      },
      {
        uuid: '2',
        timestamp: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: 'Hello! This is a test assistant response.',
        },
      },
    ],
    selectedIndex: 0,
    expandedMessages: new Set(),
    viewMode: 'chronological',
    filterType: 'all',
    searchQuery: '',
    isLoading: false,
    showHelp: true,
    autoScroll: false,
    autoScrollDelay: 1000,
  });

  // Initialize keyboard navigation - this handles all the keyboard shortcuts
  // and updates the appState automatically
  const keyboardHandlers = useKeyboardNavigation(appState, setAppState);
  
  // The keyboardHandlers object contains all the navigation functions
  // They are automatically bound to keyboard inputs by the useKeyboardNavigation hook
  // This is just here to demonstrate the integration - you would use specific handlers
  // in your UI components if needed
  const exampleHandlerUsage = keyboardHandlers ? 'Keyboard handlers active' : 'Not initialized';

  // Handle control panel specific interactions
  const handleToggleCollapsed = () => {
    setIsControlPanelCollapsed(!isControlPanelCollapsed);
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" padding={1}>
        <Text bold color="cyan">
          ControlPanel Integration Example
        </Text>
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left sidebar with ControlPanel */}
        <Box flexDirection="column" width={40} borderStyle="single">
          <ControlPanel
            state={appState}
            isVisible={true}
            isCollapsed={isControlPanelCollapsed}
            onToggleCollapsed={handleToggleCollapsed}
          />
        </Box>

        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1} borderStyle="single" padding={1}>
          <Text bold color="yellow">
            Main Content Area
          </Text>
          <Box marginTop={1}>
            <Text color="white">
              Current message: {appState.selectedIndex + 1} of {appState.messages.length}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="white">
              View mode: {appState.viewMode}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="white">
              Filter: {appState.filterType}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="white">
              Auto-scroll: {appState.autoScroll ? 'ON' : 'OFF'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="white">
              Help visible: {appState.showHelp ? 'YES' : 'NO'}
            </Text>
          </Box>
          {appState.searchQuery && (
            <Box marginTop={1}>
              <Text color="white">
                Search: "{appState.searchQuery}"
              </Text>
            </Box>
          )}
          {appState.error && (
            <Box marginTop={1}>
              <Text color="red">
                Error: {appState.error}
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="white">
              Keyboard handlers: {exampleHandlerUsage}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" padding={1}>
        <Text color="gray">
          Press ? to toggle help | All keyboard shortcuts are active and managed by useKeyboardNavigation
        </Text>
      </Box>
    </Box>
  );
};

export default ControlPanelExample;