import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageData } from '../utils/types';
import './WebSearchInput.css';

interface WebSearchInputProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  isActive?: boolean;
  onExit?: () => void;
  messages?: MessageData[];
  maxPreviewResults?: number;
  debounceMs?: number;
}

export const WebSearchInput: React.FC<WebSearchInputProps> = ({
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
  const [previewResults, setPreviewResults] = useState<MessageData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      setQuery(initialQuery);
    } else if (!isActive) {
      setQuery('');
      setPreviewResults([]);
      setShowPreview(false);
    }
  }, [isActive, initialQuery]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setIsSearching(true);
        setShowPreview(true);

        if (!searchQuery.trim()) {
          setPreviewResults([]);
          setIsSearching(false);
          setShowPreview(false);
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

  // Trigger search when query changes
  useEffect(() => {
    if (isActive) {
      debouncedSearch(query);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isActive, debouncedSearch]);

  // Handle form submission
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSearch(query);
      setShowPreview(false);
      if (onExit) {
        onExit();
      }
    },
    [onSearch, query, onExit]
  );

  // Handle input changes
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setQuery('');
          onSearch('');
          setShowPreview(false);
          if (onExit) {
            onExit();
          }
          break;
        case 'Enter':
          event.preventDefault();
          handleSubmit(event);
          break;
      }
    },
    [handleSubmit, onSearch, onExit]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
    setPreviewResults([]);
    setShowPreview(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearch]);

  // Highlight search matches in text
  const highlightMatches = useCallback((text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery || !text) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
      return isMatch ? (
        <mark key={`highlight-${index}-${part}`} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      );
    });
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPreview(false);
      }
    };

    if (showPreview) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPreview]);

  if (!isActive) {
    return (
      <div className="web-search-input-inactive">
        <button className="search-button" onClick={() => onExit?.()}>
          <span className="search-icon">🔍</span>
          <span>Search messages...</span>
        </button>
      </div>
    );
  }

  return (
    <div className="web-search-input" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          {isSearching && <span className="search-loading">⏳</span>}
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* Search controls */}
      <div className="search-controls">
        <span className="search-help">
          <kbd>Enter</kbd> to search • <kbd>Escape</kbd> to cancel
        </span>
      </div>

      {/* Search results preview */}
      {showPreview && previewResults.length > 0 && (
        <div className="search-preview">
          <div className="preview-header">
            <span className="preview-title">Preview ({previewResults.length} matches)</span>
          </div>
          <div className="preview-results">
            {previewResults.map((message, index) => {
              const content = message.message?.content;
              const text = typeof content === 'string' ? content : JSON.stringify(content);
              const preview = text.substring(0, 80);
              const role = message.message?.role || 'unknown';

              return (
                <div key={message.uuid || index} className="preview-item">
                  <div className="preview-role">[{role}]</div>
                  <div className="preview-content">
                    {highlightMatches(preview, query)}
                    {preview.length >= 80 && '...'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No results message */}
      {showPreview && query && !isSearching && previewResults.length === 0 && (
        <div className="search-no-results">
          <span>No matches found for "{query}"</span>
        </div>
      )}

      {/* Search statistics */}
      {showPreview && query && previewResults.length > 0 && (
        <div className="search-stats">
          <span>
            Found {previewResults.length} matches
            {previewResults.length === maxPreviewResults && ` (showing first ${maxPreviewResults})`}
          </span>
        </div>
      )}
    </div>
  );
};

export default WebSearchInput;
