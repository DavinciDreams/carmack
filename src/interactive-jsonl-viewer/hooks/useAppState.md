# useAppState Hook

The `useAppState` hook is the central state management solution for the Interactive JSONL Viewer. It provides comprehensive state management, including message loading, filtering, searching, selection, and user interactions.

## Features

- **Complete State Management**: Manages all application state in a single hook
- **Message Loading**: Handles JSONL file parsing and message loading
- **Search & Filtering**: Advanced search and filtering capabilities
- **Selection Management**: Message selection and expansion state
- **Auto-scroll**: Automated message playback functionality
- **Persistence**: Optional state persistence to localStorage
- **Error Handling**: Comprehensive error handling and loading states
- **Performance Optimized**: Efficient state updates and computed values
- **Keyboard Integration**: Built-in keyboard navigation support

## Basic Usage

```tsx
import { useAppState } from './hooks/useAppState';

function MyComponent() {
  const { state, actions, computed, isLoading, error } = useAppState(
    './messages.jsonl', // Initial file path
    true // Enable persistence
  );

  // Load messages
  useEffect(() => {
    actions.loadMessages('./path/to/messages.jsonl');
  }, []);

  // Handle keyboard navigation
  const handleKeyPress = (key: string) => {
    switch (key) {
      case 'ArrowUp':
        actions.selectPrevious();
        break;
      case 'ArrowDown':
        actions.selectNext();
        break;
      case 'Enter':
        if (computed.selectedMessage) {
          actions.toggleExpansion(computed.selectedMessage.uuid);
        }
        break;
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      <div>
        Total messages: {computed.stats.totalMessages}
        Selected: {state.selectedIndex + 1}
      </div>

      {computed.filteredMessages.map((message, index) => (
        <MessageItem
          key={message.uuid}
          message={message}
          isSelected={index === state.selectedIndex}
          isExpanded={state.expandedMessages.has(message.uuid)}
          onSelect={() => actions.selectMessage(index)}
          onToggleExpand={() => actions.toggleExpansion(message.uuid)}
        />
      ))}
    </div>
  );
}
```

## API Reference

### Return Value

The hook returns an object with the following properties:

```typescript
interface UseAppStateReturn {
  state: AppState;           // Current application state
  actions: AppStateActions;  // Action functions
  computed: ComputedState;   // Computed/derived state
  isLoading: boolean;        // Loading state
  error: string | null;      // Error state
}
```

### State Properties

```typescript
interface AppState {
  messages: MessageData[];              // All loaded messages
  selectedIndex: number;                // Currently selected message index
  expandedMessages: Set<string>;        // Set of expanded message UUIDs
  viewMode: 'chronological' | 'tree';   // View mode
  filterType: 'all' | 'user' | 'assistant' | 'tools' | 'sidechains';
  searchQuery: string;                  // Current search query
  isLoading: boolean;                   // Loading state
  error?: string;                       // Error message
  showHelp: boolean;                    // Help panel visibility
  autoScroll: boolean;                  // Auto-scroll enabled
  autoScrollDelay: number;              // Auto-scroll delay in ms
}
```

### Actions

#### Message Loading
- `loadMessages(filePath: string)`: Load messages from a JSONL file
- `refreshMessages()`: Reload messages from the current file

#### Navigation
- `selectMessage(index: number)`: Select message by index
- `selectPrevious()`: Select previous message
- `selectNext()`: Select next message
- `jumpToFirst()`: Jump to first message
- `jumpToLast()`: Jump to last message

#### Expansion
- `toggleExpansion(uuid: string)`: Toggle message expansion
- `expandAll()`: Expand all filtered messages
- `collapseAll()`: Collapse all messages

#### Filtering & Search
- `setFilterType(type)`: Set filter type
- `setSearchQuery(query: string)`: Set search query
- `clearSearch()`: Clear search query

#### View Mode
- `setViewMode(mode)`: Set view mode
- `toggleViewMode()`: Toggle between chronological and tree view

#### Auto-scroll
- `setAutoScroll(enabled: boolean)`: Enable/disable auto-scroll
- `toggleAutoScroll()`: Toggle auto-scroll
- `setAutoScrollDelay(delay: number)`: Set auto-scroll delay

#### UI State
- `toggleHelp()`: Toggle help panel
- `hideHelp()`: Hide help panel

#### State Management
- `resetState()`: Reset to initial state
- `saveState()`: Save state to localStorage
- `loadState()`: Load state from localStorage
- `clearError()`: Clear error state

### Computed Properties

```typescript
interface ComputedState {
  filteredMessages: MessageData[];     // Messages after filtering
  searchResults: MessageData[];        // Search results
  selectedMessage: MessageData | null; // Currently selected message
  stats: ConversationStats;            // Message statistics
  hasMessages: boolean;                // Whether messages are loaded
  hasError: boolean;                   // Whether there's an error
  isSearching: boolean;                // Whether search is active
  isFiltering: boolean;                // Whether filtering is active
  canNavigateUp: boolean;              // Whether can navigate up
  canNavigateDown: boolean;            // Whether can navigate down
}
```

## Advanced Usage

### Keyboard Navigation Integration

```tsx
import { useAppStateKeyboardHandlers } from './hooks/useAppState';

function MyComponent() {
  const { state, actions } = useAppState();
  const keyboardHandlers = useAppStateKeyboardHandlers(state, actions);

  // Use with ink's useInput hook
  useInput((input, key) => {
    if (key.upArrow) keyboardHandlers.up();
    if (key.downArrow) keyboardHandlers.down();
    if (key.return) keyboardHandlers.enter();
    // ... other key bindings
  });
}
```

### Auto-scroll with Callback

```tsx
import { useAutoScroll } from './hooks/useAppState';

function MyComponent() {
  const { state, actions } = useAppState();
  
  useAutoScroll(state, actions, (index) => {
    console.log(`Auto-scrolled to message ${index}`);
    // Custom scroll behavior
  });
}
```

### Debounced Search

```tsx
import { useSearchWithDebounce } from './hooks/useAppState';

function SearchComponent() {
  const { actions } = useAppState();
  const debouncedSearch = useSearchWithDebounce(actions, 300);

  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="Search messages..."
    />
  );
}
```

## Performance Considerations

### Efficient State Updates

The hook is optimized for performance with:
- Selective state updates using functional updates
- Computed values that only recalculate when dependencies change
- Debounced auto-save functionality
- Efficient Set operations for expanded messages

### Memory Management

- Messages are stored efficiently without duplication
- Filtered arrays are computed on-demand
- Auto-scroll intervals are properly cleaned up
- localStorage persistence is debounced

### Large Dataset Handling

For large JSONL files:
- Consider implementing virtual scrolling
- Use pagination for message loading
- Implement lazy loading for message content
- Use Web Workers for heavy parsing operations

## Error Handling

The hook provides comprehensive error handling:

```tsx
function MyComponent() {
  const { state, actions, error } = useAppState();

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={actions.clearError}>Clear Error</button>
        <button onClick={actions.refreshMessages}>Retry</button>
      </div>
    );
  }

  // ... rest of component
}
```

## State Persistence

State persistence is optional and can be controlled:

```tsx
// Enable persistence
const { state, actions } = useAppState('./file.jsonl', true);

// Disable persistence
const { state, actions } = useAppState('./file.jsonl', false);

// Manual state management
useEffect(() => {
  actions.loadState(); // Load from localStorage
}, []);

const handleSave = () => {
  actions.saveState(); // Save to localStorage
};
```

## Custom Integration

### With Redux/Zustand

```tsx
// You can integrate with other state management libraries
function MyComponent() {
  const { state, actions } = useAppState();
  const dispatch = useDispatch();

  useEffect(() => {
    // Sync with Redux store
    dispatch(syncMessages(state.messages));
  }, [state.messages]);
}
```

### With React Query

```tsx
import { useQuery } from 'react-query';

function MyComponent() {
  const { actions } = useAppState();

  const { data, isLoading, error } = useQuery(
    'messages',
    () => fetch('/api/messages').then(res => res.json()),
    {
      onSuccess: (data) => {
        // Use the hook's actions with external data
        actions.loadMessages(data.filePath);
      }
    }
  );
}
```

## Testing

The hook can be tested with React Testing Library:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useAppState } from './useAppState';

describe('useAppState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.state.messages).toEqual([]);
    expect(result.current.state.selectedIndex).toBe(0);
    expect(result.current.state.filterType).toBe('all');
  });

  it('should handle message selection', () => {
    const { result } = renderHook(() => useAppState());
    
    act(() => {
      result.current.actions.selectMessage(5);
    });
    
    expect(result.current.state.selectedIndex).toBe(5);
  });

  it('should handle filtering', () => {
    const { result } = renderHook(() => useAppState());
    
    act(() => {
      result.current.actions.setFilterType('user');
    });
    
    expect(result.current.state.filterType).toBe('user');
  });
});
```

## Migration from Existing Code

If you're migrating from the old state management approach:

1. Replace individual state hooks with `useAppState`
2. Update action calls to use the actions object
3. Replace computed values with the computed object
4. Update keyboard handlers to use the new integration
5. Replace manual error handling with the hook's error state

## Best Practices

1. **Single Source of Truth**: Use one `useAppState` hook per component tree
2. **Performance**: Use computed values instead of deriving state in render
3. **Error Handling**: Always handle the error state appropriately
4. **Keyboard Navigation**: Use the built-in keyboard handlers
5. **Persistence**: Consider user privacy when enabling persistence
6. **Testing**: Write tests for your custom actions and computed values

## Troubleshooting

### Common Issues

1. **Messages not loading**: Check file path and permissions
2. **State not persisting**: Ensure localStorage is available
3. **Performance issues**: Consider virtual scrolling for large datasets
4. **Memory leaks**: Ensure proper cleanup of intervals and timeouts

### Debug Mode

Enable debug logging by setting:
```tsx
const { state, actions } = useAppState('./file.jsonl', true);

// Log state changes
useEffect(() => {
  console.log('State changed:', state);
}, [state]);
```

## Future Enhancements

Planned features:
- Virtual scrolling support
- Custom filter functions
- Message streaming
- Undo/redo functionality
- Multi-file support
- Export capabilities