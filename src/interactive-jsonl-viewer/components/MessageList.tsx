import { Box, Text } from 'ink';
import type React from 'react';
import type { ClaudeMessage } from '../types';
import { MessageComponent } from './MessageComponent';

interface MessageListProps {
  messages: ClaudeMessage[];
  currentIndex: number;
  viewMode: 'chronological' | 'tree' | 'compact';
  searchQuery?: string;
  showTimestamp?: boolean;
  showTools?: boolean;
  showUsage?: boolean;
  maxHeight?: number;
  expandedMessages?: Set<string>;
  onToggleExpand?: (uuid: string) => void;
  onSelect?: (index: number) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentIndex,
  viewMode,
  searchQuery = '',
  showTimestamp = true,
  showTools = true,
  showUsage = true,
  maxHeight = 20,
  expandedMessages = new Set(),
  onToggleExpand = () => {},
  onSelect = () => {},
}) => {
  if (messages.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height={maxHeight}>
        <Text color="gray">No messages to display</Text>
      </Box>
    );
  }

  const renderChronological = () => {
    const startIndex = Math.max(0, currentIndex - Math.floor(maxHeight / 3));
    const endIndex = Math.min(messages.length, startIndex + maxHeight);
    const visibleMessages = messages.slice(startIndex, endIndex);

    return (
      <Box flexDirection="column">
        {visibleMessages.map((message, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === currentIndex;

          return (
            <MessageComponent
              key={message.uuid || actualIndex}
              message={message}
              index={actualIndex}
              isSelected={isSelected}
              isExpanded={message.uuid ? expandedMessages.has(message.uuid) : false}
              indentLevel={0}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          );
        })}
      </Box>
    );
  };

  const renderTree = () => {
    // Build tree structure
    const messageMap = new Map<string, ClaudeMessage>();
    const parentChildMap = new Map<string, string[]>();

    messages.forEach((msg) => {
      if (msg.uuid) {
        messageMap.set(msg.uuid, msg);

        if (msg.parentUuid && msg.parentUuid !== 'null') {
          if (!parentChildMap.has(msg.parentUuid)) {
            parentChildMap.set(msg.parentUuid, []);
          }
          parentChildMap.get(msg.parentUuid)!.push(msg.uuid);
        }
      }
    });

    const rootMessages = messages.filter((msg) => !msg.parentUuid || msg.parentUuid === 'null');

    const renderTreeNode = (
      message: ClaudeMessage,
      depth: number,
      messageIndex: number
    ): React.ReactElement => {
      const isSelected = messageIndex === currentIndex;
      const children = parentChildMap.get(message.uuid) || [];

      return (
        <Box key={message.uuid || messageIndex} flexDirection="column">
          <MessageComponent
            message={message}
            index={messageIndex}
            isSelected={isSelected}
            isExpanded={message.uuid ? expandedMessages.has(message.uuid) : false}
            indentLevel={depth}
            onToggleExpand={onToggleExpand}
            onSelect={onSelect}
          />
          {children.map((childId) => {
            const childMessage = messageMap.get(childId);
            if (childMessage) {
              const childIndex = messages.findIndex((m) => m.uuid === childId);
              return renderTreeNode(childMessage, depth + 1, childIndex);
            }
            return null;
          })}
        </Box>
      );
    };

    return (
      <Box flexDirection="column">
        {rootMessages.map((message) => {
          const messageIndex = messages.findIndex((m) => m.uuid === message.uuid);
          return renderTreeNode(message, 0, messageIndex);
        })}
      </Box>
    );
  };

  const renderCompact = () => {
    const startIndex = Math.max(0, currentIndex - Math.floor(maxHeight / 2));
    const endIndex = Math.min(messages.length, startIndex + maxHeight);
    const visibleMessages = messages.slice(startIndex, endIndex);

    return (
      <Box flexDirection="column">
        {visibleMessages.map((message, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === currentIndex;
          const role = message.message?.role || 'unknown';
          const content = message.message?.content;
          const text = typeof content === 'string' ? content : JSON.stringify(content);
          const preview = text ? text.substring(0, 100) : '';

          return (
            <Box key={message.uuid || actualIndex} flexDirection="row">
              <Text
                color={isSelected ? 'black' : 'gray'}
                backgroundColor={isSelected ? 'white' : 'black'}
              >
                {actualIndex + 1}. {role}: {preview}...
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  switch (viewMode) {
    case 'tree':
      return renderTree();
    case 'compact':
      return renderCompact();
    default:
      return renderChronological();
  }
};
