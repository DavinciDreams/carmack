import { useInput } from 'ink';
import { useCallback, useRef } from 'react';
import type { AppState } from '../utils/types';

// SetState type for React state updater
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

// Return type for the keyboard navigation hook
export interface KeyboardNavigationHandlers {
  up: () => void;
  down: () => void;
  enter: () => void;
  space: () => void;
  left: () => void;
  right: () => void;
  f: () => void;
  t: () => void;
  g: () => void;
  G: () => void;
  '/': () => void;
  escape: () => void;
  q: () => void;
  a: () => void;
  A: () => void;
  '?': () => void;
  p: () => void;
  r: () => void;
}

// Debounce configuration
const DEBOUNCE_DELAY = 50; // milliseconds
const RAPID_NAVIGATION_THRESHOLD = 10; // number of rapid key presses before debouncing

export function useKeyboardNavigation(
  state: AppState,
  setState: SetState<AppState>
): KeyboardNavigationHandlers {
  // Debouncing state
  const lastKeyTime = useRef<number>(0);
  const rapidPressCount = useRef<number>(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Helper function to handle debounced navigation
  const debounceNavigation = useCallback((action: () => void) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime.current;

    // If rapid navigation is detected, apply debouncing
    if (timeSinceLastKey < DEBOUNCE_DELAY) {
      rapidPressCount.current += 1;

      if (rapidPressCount.current > RAPID_NAVIGATION_THRESHOLD) {
        // Clear existing timer and set new one
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
          action();
          rapidPressCount.current = 0;
        }, DEBOUNCE_DELAY);

        lastKeyTime.current = now;
        return;
      }
    } else {
      rapidPressCount.current = 0;
    }

    lastKeyTime.current = now;
    action();
  }, []);

  // Navigation handlers
  const handlers: KeyboardNavigationHandlers = {
    // Core navigation
    up: useCallback(() => {
      debounceNavigation(() => {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1),
        }));
      });
    }, [debounceNavigation, setState]),

    down: useCallback(() => {
      debounceNavigation(() => {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.messages.length - 1, prev.selectedIndex + 1),
        }));
      });
    }, [debounceNavigation, setState]),

    // Page navigation
    left: useCallback(() => {
      debounceNavigation(() => {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 10),
        }));
      });
    }, [debounceNavigation, setState]),

    right: useCallback(() => {
      debounceNavigation(() => {
        setState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.messages.length - 1, prev.selectedIndex + 10),
        }));
      });
    }, [debounceNavigation, setState]),

    // Selection and expansion
    enter: useCallback(() => {
      setState((prev) => {
        const currentMessage = prev.messages[prev.selectedIndex];
        if (currentMessage) {
          const newExpanded = new Set(prev.expandedMessages);
          if (newExpanded.has(currentMessage.uuid)) {
            newExpanded.delete(currentMessage.uuid);
          } else {
            newExpanded.add(currentMessage.uuid);
          }
          return {
            ...prev,
            expandedMessages: newExpanded,
          };
        }
        return prev;
      });
    }, [setState]),

    space: useCallback(() => {
      setState((prev) => ({
        ...prev,
        autoScroll: !prev.autoScroll,
      }));
    }, [setState]),

    // Mode switching
    t: useCallback(() => {
      setState((prev) => ({
        ...prev,
        viewMode: prev.viewMode === 'chronological' ? 'tree' : 'chronological',
      }));
    }, [setState]),

    // Filter controls
    f: useCallback(() => {
      setState((prev) => {
        const filterTypes: AppState['filterType'][] = [
          'all',
          'user',
          'assistant',
          'tools',
          'sidechains',
        ];
        const currentIndex = filterTypes.indexOf(prev.filterType);
        const nextIndex = (currentIndex + 1) % filterTypes.length;
        return {
          ...prev,
          filterType: filterTypes[nextIndex],
        };
      });
    }, [setState]),

    a: useCallback(() => {
      setState((prev) => ({
        ...prev,
        filterType: 'all',
      }));
    }, [setState]),

    A: useCallback(() => {
      setState((prev) => ({
        ...prev,
        filterType: 'assistant',
      }));
    }, [setState]),

    // Jump to beginning/end
    g: useCallback(() => {
      setState((prev) => ({
        ...prev,
        selectedIndex: 0,
      }));
    }, [setState]),

    G: useCallback(() => {
      setState((prev) => ({
        ...prev,
        selectedIndex: Math.max(0, prev.messages.length - 1),
      }));
    }, [setState]),

    // Search
    '/': useCallback(() => {
      setState((prev) => ({
        ...prev,
        searchQuery: '',
        // Note: This would typically trigger a search input mode
        // Implementation depends on the parent component's search handling
      }));
    }, [setState]),

    // Help and controls
    '?': useCallback(() => {
      setState((prev) => ({
        ...prev,
        showHelp: !prev.showHelp,
      }));
    }, [setState]),

    // Playback controls
    p: useCallback(() => {
      setState((prev) => ({
        ...prev,
        autoScroll: !prev.autoScroll,
      }));
    }, [setState]),

    // Reset/refresh
    r: useCallback(() => {
      setState((prev) => ({
        ...prev,
        selectedIndex: 0,
        expandedMessages: new Set(),
        filterType: 'all',
        searchQuery: '',
        viewMode: 'chronological',
      }));
    }, [setState]),

    // Exit
    escape: useCallback(() => {
      setState((prev) => ({
        ...prev,
        searchQuery: '',
        showHelp: false,
      }));
    }, [setState]),

    q: useCallback(() => {
      // This would typically be handled by the parent component
      // or trigger an exit event
      process.exit(0);
    }, []),
  };

  // Set up Ink's useInput hook
  useInput((input, key) => {
    // Prevent default behavior for handled keys
    if (key.upArrow) {
      handlers.up();
    } else if (key.downArrow) {
      handlers.down();
    } else if (key.leftArrow) {
      handlers.left();
    } else if (key.rightArrow) {
      handlers.right();
    } else if (key.return) {
      handlers.enter();
    } else if (key.escape) {
      handlers.escape();
    } else if (input) {
      // Handle character input
      switch (input) {
        case ' ':
          handlers.space();
          break;
        case 'f':
          handlers.f();
          break;
        case 't':
          handlers.t();
          break;
        case 'g':
          handlers.g();
          break;
        case 'G':
          handlers.G();
          break;
        case '/':
          handlers['/']();
          break;
        case 'q':
          handlers.q();
          break;
        case 'a':
          handlers.a();
          break;
        case 'A':
          handlers.A();
          break;
        case '?':
          handlers['?']();
          break;
        case 'p':
          handlers.p();
          break;
        case 'r':
          handlers.r();
          break;
        default:
          // Ignore unhandled keys
          break;
      }
    }
  });

  return handlers;
}
