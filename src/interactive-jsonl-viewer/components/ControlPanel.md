# ControlPanel Component

The ControlPanel component provides a comprehensive interface for displaying keyboard shortcuts, current application state, and system status information for the Interactive JSONL Viewer.

## Features

### 1. Keyboard Shortcuts Display
- **Organized by Category**: Navigation, View Controls, Filters, Search, and System Controls
- **Color-coded**: Each category has its own color scheme for easy identification
- **Comprehensive Coverage**: Displays all shortcuts from the `useKeyboardNavigation` hook

### 2. Current State Indicators
- **View Mode**: Shows current view mode (chronological/tree)
- **Navigation Status**: Current message position and total count
- **Filter Status**: Active filter type with readable labels
- **Auto-scroll Status**: Whether auto-scroll is enabled/disabled
- **Expanded Messages**: Count of currently expanded messages

### 3. Search and Status Display
- **Active Search**: Shows current search query when active
- **Loading Status**: Displays loading state
- **Error Display**: Shows error messages when they occur
- **Quick Stats**: Total messages and auto-scroll delay

### 4. Collapsible Interface
- **Compact Mode**: Shows only essential shortcuts when collapsed
- **Full Mode**: Shows comprehensive help when expanded
- **Toggle Control**: Optional toggle functionality for parent components

## TypeScript Integration

### Props Interface
```typescript
export interface ControlPanelProps {
  state: AppState;                    // Main application state
  isVisible?: boolean;                // Control panel visibility
  isCollapsed?: boolean;              // Compact vs full display
  onToggleCollapsed?: () => void;     // Optional collapse toggle handler
}
```

### Keyboard Shortcut Structure
```typescript
interface KeyboardShortcut {
  key: string;                        // The actual key combination
  description: string;                // Human-readable description
  category: 'navigation' | 'view' | 'filter' | 'search' | 'control';
}
```

## Usage

### Basic Usage
```typescript
import { ControlPanel } from './components/ControlPanel';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';

function MyComponent() {
  const [appState, setAppState] = useState<AppState>({...});
  const keyboardHandlers = useKeyboardNavigation(appState, setAppState);
  
  return (
    <ControlPanel 
      state={appState}
      isVisible={true}
    />
  );
}
```

### With Collapse Functionality
```typescript
function MyComponent() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <ControlPanel 
      state={appState}
      isVisible={true}
      isCollapsed={isCollapsed}
      onToggleCollapsed={() => setIsCollapsed(!isCollapsed)}
    />
  );
}
```

## Keyboard Shortcuts Reference

### Navigation
- **↑/↓**: Move up/down one message
- **←/→**: Move up/down 10 messages  
- **g**: Go to first message
- **G**: Go to last message
- **Enter**: Toggle message expansion

### View Controls
- **t**: Toggle view mode (chronological/tree)
- **Space**: Toggle auto-scroll
- **p**: Toggle playback (same as Space)
- **?**: Toggle help panel

### Filters
- **f**: Cycle through filter types
- **a**: Show all messages
- **A**: Show only assistant messages

### Search
- **/**: Start search
- **Escape**: Clear search/close help

### System Controls
- **r**: Reset to default state
- **q**: Quit application

## Integration with useKeyboardNavigation

The ControlPanel is designed to work seamlessly with the `useKeyboardNavigation` hook:

1. **Automatic State Updates**: The hook manages all keyboard interactions and updates the `AppState`
2. **Real-time Display**: The control panel automatically reflects state changes
3. **Comprehensive Coverage**: All shortcuts in the hook are documented in the panel
4. **Type Safety**: Full TypeScript integration ensures consistency

## Example Integration

See `ControlPanelExample.tsx` for a complete working example that demonstrates:
- Setting up the AppState
- Integrating keyboard navigation
- Managing control panel visibility
- Handling state updates

## Styling and Colors

The component uses Ink's color system with consistent theming:
- **Cyan**: Headers and section titles
- **Yellow**: Status values and current state
- **Green**: Positive states (ON, enabled)
- **Red**: Negative states (OFF, errors)
- **Blue/Green/Yellow/Magenta/Red**: Category-specific colors for shortcuts

## State Management

The component is **read-only** - it displays state but doesn't modify it. All state changes are handled by:
1. The `useKeyboardNavigation` hook for keyboard interactions
2. Parent components for UI-specific actions (like toggling collapse)
3. The main application logic for data loading and processing

This separation of concerns ensures clean architecture and predictable behavior.