# Interactive JSONL Viewer - Hooks

This directory contains custom React hooks for the Interactive JSONL Viewer application.

## Available Hooks

### `useAppState`

The main application state management hook that provides centralized state management for the entire JSONL viewer application.

**Features:**
- Complete state management for all application state
- Message loading and parsing from JSONL files
- Search and filtering capabilities
- Selection and expansion state management
- Auto-scroll functionality
- Optional state persistence to localStorage
- Comprehensive error handling and loading states
- Performance optimized state updates
- Built-in keyboard navigation support

**Usage:**
```tsx
import { useAppState } from './hooks/useAppState';

function MyComponent() {
  const { state, actions, computed, isLoading, error } = useAppState(
    './messages.jsonl', // Initial file path
    true // Enable persistence
  );

  // Use state, actions, and computed values
  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

**Files:**
- `useAppState.ts` - Main hook implementation
- `useAppState.test.ts` - Comprehensive test suite
- `useAppState.md` - Detailed documentation
- `useAppStateExample.tsx` - Usage examples

### `useKeyboardNavigation`

Keyboard navigation hook for handling user input and navigation within the JSONL viewer.

**Features:**
- Debounced navigation for smooth performance
- Comprehensive key bindings for all user interactions
- Integration with Ink's `useInput` hook
- Configurable rapid navigation detection

**Usage:**
```tsx
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';

function MyComponent() {
  const [appState, setAppState] = useState<AppState>({...});
  const keyboardHandlers = useKeyboardNavigation(appState, setAppState);

  // Handlers are automatically set up with useInput
  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

**Key Bindings:**
- `↑/↓` - Navigate messages
- `←/→` - Page navigation
- `Enter` - Toggle message expansion
- `Space` - Toggle auto-scroll
- `f` - Cycle through filters
- `t` - Toggle view mode
- `g/G` - Jump to first/last message
- `/` - Search mode
- `?` - Toggle help
- `r` - Reset state
- `q` - Quit application

## Integration Examples

### Basic Integration
```tsx
import { useAppState, useAppStateKeyboardHandlers } from './hooks/useAppState';

function ViewerApp() {
  const { state, actions, computed, isLoading, error } = useAppState();
  const keyboardHandlers = useAppStateKeyboardHandlers(state, actions);

  useInput((input, key) => {
    if (key.upArrow) keyboardHandlers.up();
    if (key.downArrow) keyboardHandlers.down();
    // ... more key bindings
  });

  if (error) return <Text color="red">Error: {error}</Text>;
  if (isLoading) return <Text>Loading...</Text>;

  return (
    <Box flexDirection="column">
      {/* Your UI components */}
    </Box>
  );
}
```

### Advanced Integration with Custom Actions
```tsx
import { useAppState } from './hooks/useAppState';

function AdvancedViewer() {
  const { state, actions, computed } = useAppState();
  
  // Auto-scroll is now handled directly in InteractiveViewer
  // for better performance and state synchronization

  // Custom action handlers
  const handleCustomFilter = () => {
    // Custom logic
    actions.setFilterType('user');
  };

  return (
    <Box>
      {/* Your custom UI */}
    </Box>
  );
}
```

## Testing

All hooks come with comprehensive test suites:

```bash
# Run all hook tests
bun test src/interactive-jsonl-viewer/hooks/

# Run specific hook tests
bun test src/interactive-jsonl-viewer/hooks/useAppState.test.ts
```

## Architecture

The hooks follow a clean architecture pattern:

1. **State Management**: Centralized in `useAppState`
2. **Side Effects**: Managed through integrated effects in InteractiveViewer
3. **Event Handling**: Abstracted through keyboard handlers
4. **Computed Values**: Derived state for performance optimization
5. **Persistence**: Optional localStorage integration

## Performance Considerations

- **Memoization**: All action functions are memoized with `useCallback`
- **Selective Updates**: State updates are optimized to prevent unnecessary re-renders
- **Computed Values**: Expensive calculations are memoized and only recalculated when dependencies change
- **Debouncing**: User input is debounced to prevent performance issues with rapid interactions

## Best Practices

1. **Single Source of Truth**: Use one `useAppState` hook per component tree
2. **Action-Based Updates**: Always use actions to update state, never mutate directly
3. **Computed Values**: Use the computed object for derived state instead of calculating in render
4. **Error Handling**: Always handle the error state appropriately
5. **Testing**: Write tests for custom integrations and edge cases

## Future Enhancements

- Virtual scrolling support for large datasets
- Custom filter function support
- Undo/redo functionality
- Multi-file support
- Export capabilities
- Real-time message streaming
- Plugin system for custom extensions