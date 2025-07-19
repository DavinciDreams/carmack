import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { AppState, MessageData, ConversationStats } from '../utils/types';
import { MessageUtils } from '../utils/messageUtils';
import { JSONLParser } from '../utils/parser';
import type { ClaudeMessage } from '../types';

// Configuration constants
const LOCAL_STORAGE_KEY = 'interactive-jsonl-viewer-state';
const AUTOSAVE_DEBOUNCE_MS = 500;

// Type for state actions
export interface AppStateActions {
  // Message loading and parsing
  loadMessages: (filePath: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
  
  // Selection and navigation
  selectMessage: (index: number) => void;
  selectPrevious: () => void;
  selectNext: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  
  // Expansion state
  toggleExpansion: (uuid: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Filtering and search
  setFilterType: (filterType: AppState['filterType']) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // View mode
  setViewMode: (mode: AppState['viewMode']) => void;
  toggleViewMode: () => void;
  
  // Auto-scroll
  setAutoScroll: (enabled: boolean) => void;
  toggleAutoScroll: () => void;
  setAutoScrollDelay: (delay: number) => void;
  
  // Help and UI
  toggleHelp: () => void;
  hideHelp: () => void;
  
  // State management
  resetState: () => void;
  saveState: () => void;
  loadState: () => void;
  
  // Error handling
  clearError: () => void;
}

// Type for computed state
export interface ComputedState {
  filteredMessages: MessageData[];
  searchResults: MessageData[];
  selectedMessage: MessageData | null;
  stats: ConversationStats;
  hasMessages: boolean;
  hasError: boolean;
  isSearching: boolean;
  isFiltering: boolean;
  canNavigateUp: boolean;
  canNavigateDown: boolean;
}

// Type for the complete hook return
export interface UseAppStateReturn {
  state: AppState;
  actions: AppStateActions;
  computed: ComputedState;
  isLoading: boolean;
  error: string | null;
}

// Initial state factory
function createInitialState(): AppState {
  console.log('Creating initial state...');
  const initialState: AppState = {
    messages: [] as ClaudeMessage[],
    selectedIndex: 0,
    expandedMessages: new Set<string>(),
    viewMode: 'chronological',
    filterType: 'all',
    searchQuery: '',
    isLoading: false,
    error: undefined,
    showHelp: false,
    autoScroll: false,
    autoScrollDelay: 100,
  };
  console.log('Initial state created, messages type:', typeof initialState.messages);
  return initialState;
}

// Message adapter to convert ClaudeMessage to MessageData
function adaptClaudeMessageToMessageData(claudeMessage: ClaudeMessage): MessageData {
  return {
    uuid: claudeMessage.uuid,
    parentUuid: claudeMessage.parentUuid === null ? undefined : claudeMessage.parentUuid,
    timestamp: claudeMessage.timestamp,
    isSidechain: claudeMessage.isSidechain,
    isMeta: claudeMessage.isMeta,
    type: claudeMessage.type as 'user' | 'assistant' | 'summary' | 'unknown' | undefined,
    message: claudeMessage.message ? {
      role: claudeMessage.message.role === 'system' ? 'unknown' : claudeMessage.message.role as 'user' | 'assistant' | 'unknown',
      content: claudeMessage.message.content ? 
        (typeof claudeMessage.message.content === 'string' ? 
          claudeMessage.message.content : 
          claudeMessage.message.content.map(item => ({
            type: item.type as 'text' | 'tool_use' | 'tool_result',
            text: item.text,
            name: item.name,
            input: item.input,
            tool_use_id: item.tool_use_id,
            content: item.content
          }))
        ) : undefined,
      usage: claudeMessage.message.usage,
      tool_calls: claudeMessage.message.tool_calls,
      model: undefined
    } : undefined,
    toolUseResult: claudeMessage.toolUseResult ? {
      totalDurationMs: claudeMessage.toolUseResult.totalDurationMs,
      totalTokens: claudeMessage.toolUseResult.totalTokens,
      totalToolUseCount: claudeMessage.toolUseResult.totalToolUseCount,
      oldTodos: claudeMessage.toolUseResult.oldTodos,
      newTodos: claudeMessage.toolUseResult.newTodos,
      content: claudeMessage.toolUseResult.content
    } : undefined
  };
}

/**
 * Main application state hook
 * Manages all state, filtering, searching, and user interactions
 */
export function useAppState(
  initialFilePath?: string,
  enablePersistence: boolean = true
): UseAppStateReturn {
  // Core state
  const [state, setState] = useState<AppState>(createInitialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for optimization
  const parserRef = useRef<JSONLParser | null>(null);
  const currentFilePathRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize parser
  useEffect(() => {
    parserRef.current = new JSONLParser();
  }, []);

  // Simple filtering function for ClaudeMessage
  const filterClaudeMessages = useCallback((messages: ClaudeMessage[], filterType: AppState['filterType']): ClaudeMessage[] => {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    return messages.filter((message) => {
      switch (filterType) {
        case 'all':
          return true;
        case 'user':
          return message.message?.role === 'user';
        case 'assistant':
          return message.message?.role === 'assistant';
        case 'tools':
          return message.message?.tool_calls && message.message.tool_calls.length > 0;
        case 'sidechains':
          return message.isSidechain === true;
        default:
          return true;
      }
    });
  }, []);

  // Load initial file if provided
  useEffect(() => {
    if (initialFilePath && parserRef.current) {
      loadMessages(initialFilePath);
    }
  }, [initialFilePath]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed - messages.length:', state.messages.length);
    if (state.messages.length > 0) {
      console.log('First message in state:', state.messages[0]);
    }
  }, [state.messages]);

  // Auto-save state changes (debounced)
  useEffect(() => {
    if (!enablePersistence) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveState();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, enablePersistence]);

  // Message loading and parsing
  const loadMessages = useCallback(async (filePath: string): Promise<void> => {
    console.log('loadMessages called with:', filePath);
    if (!parserRef.current) {
      console.log('No parser ref, returning early');
      return;
    }

    console.log('Setting loading state...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting to load messages from:', filePath);
      const claudeMessages = await parserRef.current.parseFile(filePath);
      console.log('Loaded', claudeMessages.length, 'messages');
      
      currentFilePathRef.current = filePath;
      
      console.log('About to call setState...');
      console.log('claudeMessages type check:', Array.isArray(claudeMessages), claudeMessages.length);
      
      const newState: AppState = {
        messages: claudeMessages,
        selectedIndex: 0,
        expandedMessages: new Set(),
        viewMode: 'chronological',
        filterType: 'all', 
        searchQuery: '',
        isLoading: false,
        error: undefined,
        showHelp: false,
        autoScroll: false,
        autoScrollDelay: 1000,
      };
      
      console.log('New state created, messages length:', newState.messages.length);
      setState(newState);
      console.log('setState called successfully');
    } catch (err) {
      console.error('Error loading messages:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    } finally {
      console.log('Finally block - setting loading to false');
      setIsLoading(false);
    }
  }, []);

  const refreshMessages = useCallback(async (): Promise<void> => {
    if (currentFilePathRef.current) {
      await loadMessages(currentFilePathRef.current);
    }
  }, [loadMessages]);

  // Selection and navigation
  const selectMessage = useCallback((index: number) => {
    setState(prev => {
      const filteredMessages = filterClaudeMessages(prev.messages, prev.filterType);
      const safeIndex = Math.max(0, Math.min(index, filteredMessages.length - 1));
      return {
        ...prev,
        selectedIndex: safeIndex
      };
    });
  }, [filterClaudeMessages]);

  const selectPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.max(0, prev.selectedIndex - 1)
    }));
  }, []);

  const selectNext = useCallback(() => {
    setState(prev => {
      const filteredMessages = filterClaudeMessages(prev.messages, prev.filterType);
      return {
        ...prev,
        selectedIndex: Math.min(filteredMessages.length - 1, prev.selectedIndex + 1)
      };
    });
  }, [filterClaudeMessages]);

  const jumpToFirst = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: 0
    }));
  }, []);

  const jumpToLast = useCallback(() => {
    setState(prev => {
      const filteredMessages = filterClaudeMessages(prev.messages, prev.filterType);
      return {
        ...prev,
        selectedIndex: Math.max(0, filteredMessages.length - 1)
      };
    });
  }, [filterClaudeMessages]);

  /**
   * Toggle message expansion state
   * 
   * IMPORTANT for future LLMs:
   * - This is a TOGGLE function - if expanded, it collapses; if collapsed, it expands
   * - Uses a Set to track expanded message UUIDs
   * - The Set is immutable (creates new Set on each change)
   * - This is why auto-expand checks if message is already expanded first
   * - Without that check, it would toggle on every render
   */
  const toggleExpansion = useCallback((uuid: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedMessages);
      if (newExpanded.has(uuid)) {
        newExpanded.delete(uuid);
      } else {
        newExpanded.add(uuid);
      }
      return {
        ...prev,
        expandedMessages: newExpanded
      };
    });
  }, []);

  const expandAll = useCallback(() => {
    setState(prev => {
      const filteredMessages = filterClaudeMessages(prev.messages, prev.filterType);
      const allUuids = new Set(filteredMessages.map(msg => msg.uuid).filter(Boolean));
      return {
        ...prev,
        expandedMessages: allUuids
      };
    });
  }, [filterClaudeMessages]);

  const collapseAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      expandedMessages: new Set()
    }));
  }, []);

  // Filtering and search
  const setFilterType = useCallback((filterType: AppState['filterType']) => {
    setState(prev => ({
      ...prev,
      filterType,
      selectedIndex: 0 // Reset selection when filter changes
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedIndex: 0 // Reset selection when search changes
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      selectedIndex: 0
    }));
  }, []);

  // View mode
  const setViewMode = useCallback((mode: AppState['viewMode']) => {
    setState(prev => ({
      ...prev,
      viewMode: mode
    }));
  }, []);

  const toggleViewMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'chronological' ? 'tree' : 'chronological'
    }));
  }, []);

  // Auto-scroll
  const setAutoScroll = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      autoScroll: enabled
    }));
  }, []);

  const toggleAutoScroll = useCallback(() => {
    setState(prev => ({
      ...prev,
      autoScroll: !prev.autoScroll
    }));
  }, []);

  const setAutoScrollDelay = useCallback((delay: number) => {
    setState(prev => ({
      ...prev,
      autoScrollDelay: Math.max(100, delay)
    }));
  }, []);

  // Help and UI
  const toggleHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelp: !prev.showHelp
    }));
  }, []);

  const hideHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      showHelp: false
    }));
  }, []);

  // State management
  const resetState = useCallback(() => {
    setState(createInitialState());
    setError(null);
    currentFilePathRef.current = null;
  }, []);

  const saveState = useCallback(() => {
    if (!enablePersistence) return;

    try {
      // Check if localStorage is available (not available in Node.js)
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const stateToSave = {
        ...state,
        expandedMessages: Array.from(state.expandedMessages), // Convert Set to Array for JSON
        timestamp: Date.now()
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }, [state, enablePersistence]);

  const loadState = useCallback(() => {
    if (!enablePersistence) return;

    try {
      // Check if localStorage is available (not available in Node.js)
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          ...parsedState,
          expandedMessages: new Set(parsedState.expandedMessages || []), // Convert Array back to Set
          isLoading: false // Never restore loading state
        }));
      }
    } catch (err) {
      console.warn('Failed to load state from localStorage:', err);
    }
  }, [enablePersistence]);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
    setState(prev => ({
      ...prev,
      error: undefined
    }));
  }, []);


  // Computed state (memoized to prevent infinite re-renders)
  const computed: ComputedState = useMemo(() => {
    const filteredMessages = filterClaudeMessages(state.messages, state.filterType);
    return {
      filteredMessages,
      searchResults: [],
      selectedMessage: filteredMessages[state.selectedIndex] || null,
      stats: { totalMessages: state.messages.length, userMessages: 0, assistantMessages: 0, toolCalls: 0, sidechains: 0, totalTokens: 0, totalDuration: 0 },
      hasMessages: state.messages.length > 0,
      hasError: !!error || !!state.error,
      isSearching: state.searchQuery.trim().length > 0,
      isFiltering: state.filterType !== 'all',
      canNavigateUp: state.selectedIndex > 0,
      canNavigateDown: state.selectedIndex < filteredMessages.length - 1
    };
  }, [state.messages, state.filterType, state.searchQuery, state.selectedIndex, state.error, error, filterClaudeMessages]);

  // Actions object (memoized to prevent infinite re-renders)
  const actions: AppStateActions = useMemo(() => ({
    loadMessages,
    refreshMessages,
    selectMessage,
    selectPrevious,
    selectNext,
    jumpToFirst,
    jumpToLast,
    toggleExpansion,
    expandAll,
    collapseAll,
    setFilterType,
    setSearchQuery,
    clearSearch,
    setViewMode,
    toggleViewMode,
    setAutoScroll,
    toggleAutoScroll,
    setAutoScrollDelay,
    toggleHelp,
    hideHelp,
    resetState,
    saveState,
    loadState,
    clearError
  }), [
    loadMessages,
    refreshMessages,
    selectMessage,
    selectPrevious,
    selectNext,
    jumpToFirst,
    jumpToLast,
    toggleExpansion,
    expandAll,
    collapseAll,
    setFilterType,
    setSearchQuery,
    clearSearch,
    setViewMode,
    toggleViewMode,
    setAutoScroll,
    toggleAutoScroll,
    setAutoScrollDelay,
    toggleHelp,
    hideHelp,
    resetState,
    saveState,
    loadState,
    clearError
  ]);

  return {
    state,
    actions,
    computed,
    isLoading,
    error
  };
}

// Utility hooks for specific use cases

/**
 * Hook for keyboard navigation integration
 */
export function useAppStateKeyboardHandlers(
  state: AppState,
  actions: AppStateActions
) {
  return {
    up: actions.selectPrevious,
    down: actions.selectNext,
    left: () => actions.selectMessage(Math.max(0, state.selectedIndex - 10)),
    right: () => {
      const filteredMessages = MessageUtils.filterMessagesByType(state.messages, state.filterType);
      actions.selectMessage(Math.min(filteredMessages.length - 1, state.selectedIndex + 10));
    },
    enter: () => {
      const filteredMessages = MessageUtils.filterMessagesByType(state.messages, state.filterType);
      const currentMessage = filteredMessages[state.selectedIndex];
      if (currentMessage) {
        actions.toggleExpansion(currentMessage.uuid);
      }
    },
    space: actions.toggleAutoScroll,
    f: () => {
      const filterTypes: AppState['filterType'][] = ['all', 'user', 'assistant', 'tools', 'sidechains'];
      const currentIndex = filterTypes.indexOf(state.filterType);
      const nextIndex = (currentIndex + 1) % filterTypes.length;
      actions.setFilterType(filterTypes[nextIndex]);
    },
    t: actions.toggleViewMode,
    g: actions.jumpToFirst,
    G: actions.jumpToLast,
    '/': () => actions.setSearchQuery(''),
    escape: () => {
      actions.clearSearch();
      actions.hideHelp();
    },
    '?': actions.toggleHelp,
    a: () => actions.setFilterType('all'),
    A: () => actions.setFilterType('assistant'),
    p: actions.toggleAutoScroll,
    r: actions.resetState,
    q: () => process.exit(0)
  };
}

/**
 * Hook for search functionality with debouncing
 */
export function useSearchWithDebounce(
  actions: AppStateActions,
  debounceMs: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      actions.setSearchQuery(query);
    }, debounceMs);
  }, [actions, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedSearch;
}

export default useAppState;