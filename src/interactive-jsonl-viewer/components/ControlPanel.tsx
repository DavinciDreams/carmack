import { Box, Text } from 'ink';
import type React from 'react';
import type { AppState } from '../utils/types';

export interface ControlPanelProps {
  state: AppState;
  isVisible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'view' | 'filter' | 'search' | 'control';
}

const keyboardShortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: '↑/↓', description: 'Move up/down one message', category: 'navigation' },
  { key: '←/→', description: 'Move up/down 10 messages', category: 'navigation' },
  { key: 'g', description: 'Go to first message', category: 'navigation' },
  { key: 'G', description: 'Go to last message', category: 'navigation' },
  { key: 'Enter', description: 'Toggle message expansion', category: 'navigation' },

  // View controls
  { key: 't', description: 'Toggle view mode (chronological/tree)', category: 'view' },
  { key: 'Space', description: 'Toggle auto-scroll', category: 'view' },
  { key: 'p', description: 'Toggle playback (same as Space)', category: 'view' },
  { key: '?', description: 'Toggle help panel', category: 'view' },

  // Filters
  { key: 'f', description: 'Cycle through filter types', category: 'filter' },
  { key: 'a', description: 'Show all messages', category: 'filter' },
  { key: 'A', description: 'Show only assistant messages', category: 'filter' },

  // Search
  { key: '/', description: 'Start search', category: 'search' },
  { key: 'Escape', description: 'Clear search/close help', category: 'search' },

  // Control
  { key: 'r', description: 'Reset to default state', category: 'control' },
  { key: 'q', description: 'Quit application', category: 'control' },
];

const getFilterTypeDisplay = (filterType: AppState['filterType']): string => {
  const filterMap = {
    all: 'All Messages',
    user: 'User Only',
    assistant: 'Assistant Only',
    tools: 'Tools Only',
    sidechains: 'Sidechains Only',
  };
  return filterMap[filterType] || filterType;
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  isVisible = true,
  isCollapsed = false,
  onToggleCollapsed,
}) => {
  if (!isVisible) return null;

  const groupedShortcuts = keyboardShortcuts.reduce(
    (groups, shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category]?.push(shortcut);
      return groups;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const categoryTitles = {
    navigation: 'Navigation',
    view: 'View Controls',
    filter: 'Filters',
    search: 'Search',
    control: 'System Controls',
  };

  const categoryColors = {
    navigation: 'blue',
    view: 'green',
    filter: 'yellow',
    search: 'magenta',
    control: 'red',
  } as const;

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text bold color="cyan">
          Control Panel
        </Text>
        {onToggleCollapsed && (
          <Text color="gray" dimColor>
            [{isCollapsed ? 'Expand' : 'Collapse'}]
          </Text>
        )}
      </Box>

      {/* Current State Section */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          Current State:
        </Text>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">View:</Text>
          <Text color="yellow">{state.viewMode}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Msg:</Text>
          <Text color="yellow">
            {state.selectedIndex + 1}/{state.messages.length}
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Filter:</Text>
          <Text color="yellow">{state.filterType}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Auto:</Text>
          <Text color={state.autoScroll ? 'green' : 'red'}>{state.autoScroll ? 'ON' : 'OFF'}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Exp:</Text>
          <Text color="yellow">{state.expandedMessages.size}</Text>
        </Box>
      </Box>

      {/* Search Status */}
      {state.searchQuery && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Search:
          </Text>
          <Box marginLeft={2}>
            <Text color="yellow">"{state.searchQuery}"</Text>
          </Box>
        </Box>
      )}

      {/* Loading/Error Status */}
      {state.isLoading && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Status:
          </Text>
          <Box marginLeft={2}>
            <Text color="yellow">Loading...</Text>
          </Box>
        </Box>
      )}

      {state.error && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Error:
          </Text>
          <Box marginLeft={2}>
            <Text color="red">{state.error}</Text>
          </Box>
        </Box>
      )}

      {/* Simple Help */}
      {state.showHelp && (
        <Box marginTop={1}>
          <Text color="cyan" bold>
            Keys:
          </Text>
          <Box marginLeft={2}>
            <Text color="white">↑/↓ nav Space play ? help</Text>
            <Text color="white">←/→ jump Enter expand q quit</Text>
            <Text color="white">f filter t view r reset</Text>
          </Box>
        </Box>
      )}

      {/* Quick Stats */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          Quick Stats:
        </Text>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Total:</Text>
          <Text color="yellow">{state.messages.length}</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginLeft={2}>
          <Text color="white">Delay:</Text>
          <Text color="yellow">{state.autoScrollDelay}ms</Text>
        </Box>
      </Box>
    </Box>
  );
};
