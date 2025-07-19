import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClaudeMessage } from '../types';

interface SearchInputProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  isActive?: boolean;
  onExit?: () => void;
  messages?: ClaudeMessage[];
  maxPreviewResults?: number;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  initialQuery = '',
  placeholder = 'Search messages...',
  isActive = false,
  onExit,
  messages = [],
  maxPreviewResults = 5,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [previewResults, setPreviewResults] = useState<ClaudeMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search function
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setIsSearching(true);

        if (!searchQuery.trim()) {
          setPreviewResults([]);
          setIsSearching(false);
          return;
        }

        // Filter messages based on search query
        const filteredMessages = messages.filter((message) => {
          const content = message.message?.content;
          if (typeof content === 'string') {
            return content.toLowerCase().includes(searchQuery.toLowerCase());
          }
          if (Array.isArray(content)) {
            return content.some((item) => {
              if (typeof item === 'object' && item.text) {
                return item.text.toLowerCase().includes(searchQuery.toLowerCase());
              }
              return false;
            });
          }
          // Also search in tool calls
          if (message.message?.tool_calls) {
            return message.message.tool_calls.some(
              (tool) =>
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                JSON.stringify(tool.input).toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          return false;
        });

        setPreviewResults(filteredMessages.slice(0, maxPreviewResults));
        setIsSearching(false);
      }, debounceMs);
    },
    [messages, maxPreviewResults, debounceMs]
  );

  useEffect(() => {
    if (isActive) {
      setQuery(initialQuery);
      if (initialQuery) {
        debouncedSearch(initialQuery);
      }
    } else {
      // Clear search when inactive
      setQuery('');
      setPreviewResults([]);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    }

    // Cleanup function
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isActive, initialQuery, debouncedSearch]);

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);

    // Cleanup function
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debouncedSearch]);

  const handleSubmit = (value: string) => {
    onSearch(value);
    if (onExit) {
      onExit();
    }
  };

  const handleCancel = () => {
    setQuery('');
    onSearch('');
    if (onExit) {
      onExit();
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setPreviewResults([]);
  };

  // Handle keyboard input for search-specific navigation
  useInput((input, key) => {
    if (!isActive) return;

    if (key.escape) {
      handleCancel();
    } else if (key.ctrl && input === 'c') {
      handleCancel();
    } else if (key.ctrl && input === 'u') {
      handleClear();
    }
  });

  // Highlight search matches in text
  const highlightMatches = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery || !text) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
      return isMatch ? (
        <Text key={`highlight-${index}-${part}`} backgroundColor="yellow" color="black">
          {part}
        </Text>
      ) : (
        part
      );
    });
  };

  if (!isActive) {
    return null;
  }

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} minHeight={8}>
      <Text bold color="cyan">
        🔍 Search {isSearching && <Text color="yellow">⏳</Text>}
      </Text>

      <Box marginTop={1}>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>

      {/* Search controls */}
      <Box marginTop={1}>
        <Text color="gray">
          <Text color="green">Enter</Text> to search | <Text color="red">Escape</Text> to cancel |{' '}
          <Text color="blue">Ctrl+U</Text> to clear
        </Text>
      </Box>

      {/* Search results preview */}
      {previewResults.length > 0 && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" padding={1}>
          <Text bold color="green">
            Preview ({previewResults.length} matches)
          </Text>
          {previewResults.map((message, index) => {
            const content = message.message?.content;
            const text = typeof content === 'string' ? content : JSON.stringify(content);
            const preview = text.substring(0, 80);
            const role = message.message?.role || 'unknown';

            return (
              <Box key={message.uuid || index} marginTop={1}>
                <Text color="cyan">[{role}]</Text>
                <Text> {highlightMatches(preview, query)}...</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* No results message */}
      {query && !isSearching && previewResults.length === 0 && (
        <Box marginTop={1}>
          <Text color="yellow">No matches found for "{query}"</Text>
        </Box>
      )}

      {/* Search statistics */}
      {query && previewResults.length > 0 && (
        <Box marginTop={1}>
          <Text color="gray">
            Found {previewResults.length} matches{' '}
            {previewResults.length === maxPreviewResults && `(showing first ${maxPreviewResults})`}
          </Text>
        </Box>
      )}
    </Box>
  );
};
