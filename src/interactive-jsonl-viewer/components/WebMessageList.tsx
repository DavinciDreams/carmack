import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageUtils } from '../utils/messageUtils';
import type { AppState, MessageData, VirtualScrollState } from '../utils/types';
import { WebFilterDialog } from './WebFilterDialog';
import { WebMessageComponent } from './WebMessageComponent';
import { WebSearchInput } from './WebSearchInput';
import './WebMessageList.css';

interface MessageListProps {
  messages: MessageData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  expandedMessages: Set<string>;
  onToggleExpand: (uuid: string) => void;
  filterType: AppState['filterType'];
  searchQuery: string;
  viewMode: AppState['viewMode'];
  onSearchChange: (query: string) => void;
  onFilterChange: (filterType: AppState['filterType']) => void;
  isLoading?: boolean;
  error?: string;
  showSearch?: boolean;
  showFilter?: boolean;
  itemHeight?: number;
  maxHeight?: number;
  className?: string;
}

const VIRTUAL_SCROLL_BUFFER = 5;
const DEFAULT_ITEM_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 600;

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  selectedIndex,
  onSelect,
  expandedMessages,
  onToggleExpand,
  filterType,
  searchQuery,
  viewMode,
  onSearchChange,
  onFilterChange,
  isLoading = false,
  error,
  showSearch = true,
  showFilter = true,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className = '',
}) => {
  // State management
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Memoized filtered and sorted messages
  const filteredMessages = useMemo(() => {
    let result = MessageUtils.filterMessagesByType(messages, filterType);

    if (searchQuery.trim()) {
      const searchResults = MessageUtils.searchMessages(result, searchQuery);
      result = searchResults.map((r) => r.message);
    }

    return MessageUtils.sortMessages(result, viewMode === 'tree' ? 'tree' : 'chronological');
  }, [messages, filterType, searchQuery, viewMode]);

  // Virtual scrolling calculations
  const virtualScrollState = useMemo((): VirtualScrollState => {
    return MessageUtils.calculateVirtualScroll(
      filteredMessages,
      scrollTop,
      viewportHeight,
      itemHeight,
      VIRTUAL_SCROLL_BUFFER
    );
  }, [filteredMessages, scrollTop, viewportHeight, itemHeight]);

  // Update viewport height when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateViewportHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportHeight(Math.min(rect.height, maxHeight));
      }
    };

    resizeObserverRef.current = new ResizeObserver(updateViewportHeight);
    resizeObserverRef.current.observe(containerRef.current);

    updateViewportHeight();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [maxHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isSearchActive || isFilterOpen) {
        return; // Let search/filter handle their own keyboard events
      }

      const currentIndex = Math.max(0, Math.min(selectedIndex, filteredMessages.length - 1));

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            onSelect(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < filteredMessages.length - 1) {
            onSelect(currentIndex + 1);
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (filteredMessages[currentIndex]) {
            onToggleExpand(filteredMessages[currentIndex].uuid);
          }
          break;
        case 'Home':
          event.preventDefault();
          onSelect(0);
          break;
        case 'End':
          event.preventDefault();
          onSelect(filteredMessages.length - 1);
          break;
        case '/':
          event.preventDefault();
          if (showSearch) {
            setIsSearchActive(true);
          }
          break;
        case 'f':
          event.preventDefault();
          if (showFilter) {
            setIsFilterOpen(true);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsSearchActive(false);
          setIsFilterOpen(false);
          break;
      }
    },
    [
      isSearchActive,
      isFilterOpen,
      selectedIndex,
      filteredMessages,
      onSelect,
      onToggleExpand,
      showSearch,
      showFilter,
    ]
  );

  // Scroll to selected message
  useEffect(() => {
    if (scrollContainerRef.current && selectedIndex >= 0) {
      const selectedMessageTop = selectedIndex * itemHeight;
      const selectedMessageBottom = selectedMessageTop + itemHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + viewportHeight;

      if (selectedMessageTop < viewportTop || selectedMessageBottom > viewportBottom) {
        scrollContainerRef.current.scrollTop = Math.max(0, selectedMessageTop - viewportHeight / 2);
      }
    }
  }, [selectedIndex, itemHeight, scrollTop, viewportHeight]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      onSearchChange(query);
      setIsSearchActive(false);
    },
    [onSearchChange]
  );

  // Handle filter
  const handleFilter = useCallback(
    (newFilterType: AppState['filterType']) => {
      onFilterChange(newFilterType);
      setIsFilterOpen(false);
    },
    [onFilterChange]
  );

  // Calculate total height for virtual scrolling
  const totalHeight = filteredMessages.length * itemHeight;

  // Render loading state
  if (isLoading) {
    return (
      <div className={`message-list ${className}`}>
        <div className="message-list-loading">
          <div className="loading-spinner" />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`message-list ${className}`}>
        <div className="message-list-error">
          <p className="error-message">Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (filteredMessages.length === 0) {
    return (
      <div className={`message-list ${className}`}>
        <div className="message-list-empty">
          <p>No messages to display</p>
          {searchQuery && (
            <p className="search-hint">Try adjusting your search query or filter settings.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`message-list ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {/* Header with search and filter */}
      <div className="message-list-header">
        {showSearch && (
          <WebSearchInput
            onSearch={handleSearch}
            initialQuery={searchQuery}
            isActive={isSearchActive}
            onExit={() => setIsSearchActive(false)}
            messages={filteredMessages}
          />
        )}

        {showFilter && (
          <button
            className="filter-button"
            onClick={() => setIsFilterOpen(true)}
            aria-label="Open filter dialog"
          >
            Filter ({filterType})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="message-list-stats">
        <span>
          {filteredMessages.length} messages
          {searchQuery && ` (filtered from ${messages.length})`}
        </span>
        <span>View: {viewMode}</span>
      </div>

      {/* Virtual scrolled message list */}
      <div
        className="message-list-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ height: `${Math.min(totalHeight, maxHeight - 100)}px` }}
      >
        <div
          className="message-list-content"
          style={{ height: `${totalHeight}px`, position: 'relative' }}
        >
          {virtualScrollState.visibleItems.map((message, index) => {
            const actualIndex = virtualScrollState.startIndex + index;
            const isSelected = actualIndex === selectedIndex;
            const isExpanded = expandedMessages.has(message.uuid);

            return (
              <div
                key={message.uuid}
                className="message-list-item"
                style={{
                  position: 'absolute',
                  top: `${actualIndex * itemHeight}px`,
                  height: `${itemHeight}px`,
                  width: '100%',
                }}
              >
                <WebMessageComponent
                  message={message}
                  index={actualIndex}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  indentLevel={viewMode === 'tree' ? 0 : 0} // Tree indentation would be calculated
                  onToggleExpand={() => onToggleExpand(message.uuid)}
                  onSelect={() => onSelect(actualIndex)}
                  searchQuery={searchQuery}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter dialog */}
      {isFilterOpen && (
        <WebFilterDialog
          currentFilterType={filterType}
          messages={messages}
          onApplyFilter={handleFilter}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {/* Keyboard shortcuts help */}
      <div className="message-list-shortcuts">
        <small>↑/↓ Navigate • Enter/Space Expand • / Search • f Filter • Esc Cancel</small>
      </div>
    </div>
  );
};

export default MessageList;
