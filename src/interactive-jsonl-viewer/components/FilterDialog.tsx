import { Select } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { AppState, MessageData } from '../utils/types';

interface FilterDialogProps {
  currentFilterType: AppState['filterType'];
  messages: MessageData[];
  onApplyFilter: (filterType: AppState['filterType']) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
  currentFilterType,
  messages,
  onApplyFilter,
  isOpen,
  onClose,
}) => {
  const [selectedFilterType, setSelectedFilterType] =
    useState<AppState['filterType']>(currentFilterType);

  useEffect(() => {
    setSelectedFilterType(currentFilterType);
  }, [currentFilterType]);

  if (!isOpen) {
    return null;
  }

  // Calculate message counts for each filter type
  const getMessageCount = (filterType: AppState['filterType']): number => {
    switch (filterType) {
      case 'all':
        return messages.length;
      case 'user':
        return messages.filter((msg) => msg.message?.role === 'user').length;
      case 'assistant':
        return messages.filter((msg) => msg.message?.role === 'assistant').length;
      case 'tools':
        return messages.filter((msg) => msg.message?.tool_calls?.length || msg.toolUseResult)
          .length;
      case 'sidechains':
        return messages.filter((msg) => msg.isSidechain).length;
      default:
        return 0;
    }
  };

  const handleConfirm = () => {
    onApplyFilter(selectedFilterType);
    onClose();
  };

  const handleCancel = () => {
    setSelectedFilterType(currentFilterType); // Reset to original
    onClose();
  };

  const handleReset = () => {
    setSelectedFilterType('all');
  };

  const filterOptions = [
    {
      label: `${selectedFilterType === 'all' ? '●' : '○'} All Messages (${getMessageCount('all')})`,
      value: 'all' as const,
    },
    {
      label: `${selectedFilterType === 'user' ? '●' : '○'} User Messages (${getMessageCount('user')})`,
      value: 'user' as const,
    },
    {
      label: `${selectedFilterType === 'assistant' ? '●' : '○'} Assistant Messages (${getMessageCount('assistant')})`,
      value: 'assistant' as const,
    },
    {
      label: `${selectedFilterType === 'tools' ? '●' : '○'} Tool Messages (${getMessageCount('tools')})`,
      value: 'tools' as const,
    },
    {
      label: `${selectedFilterType === 'sidechains' ? '●' : '○'} Sidechain Messages (${getMessageCount('sidechains')})`,
      value: 'sidechains' as const,
    },
  ];

  const actionOptions = [
    { label: '✓ Apply Filter', value: 'apply' },
    { label: '↺ Reset to All', value: 'reset' },
    { label: '✕ Cancel', value: 'cancel' },
  ];

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} width={60}>
      <Text bold color="cyan">
        🔧 Filter Messages
      </Text>

      <Box marginTop={1}>
        <Text color="yellow">Current filter: {currentFilterType}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="white">Select filter type:</Text>
        <Box marginTop={1}>
          <Select
            options={filterOptions}
            onChange={(value) => {
              setSelectedFilterType(value as AppState['filterType']);
            }}
          />
        </Box>
      </Box>

      {selectedFilterType !== currentFilterType && (
        <Box marginTop={1}>
          <Text color="green">
            Preview: Will show {getMessageCount(selectedFilterType)} messages
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white">Actions:</Text>
        <Box marginTop={1}>
          <Select
            options={actionOptions}
            onChange={(value) => {
              switch (value) {
                case 'apply':
                  handleConfirm();
                  break;
                case 'reset':
                  handleReset();
                  break;
                case 'cancel':
                  handleCancel();
                  break;
              }
            }}
          />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          <Text color="green">↑↓</Text> navigate | <Text color="green">Enter</Text> select |{' '}
          <Text color="red">Escape</Text> cancel
        </Text>
      </Box>
    </Box>
  );
};

// Export types for use in other components
export type { FilterDialogProps };
