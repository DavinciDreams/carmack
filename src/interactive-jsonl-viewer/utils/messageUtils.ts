import type {
  AppState,
  ContentItem,
  ConversationStats,
  MessageData,
  VirtualScrollState,
} from './types';

// Type for message hierarchy nodes
export interface MessageHierarchy {
  message: MessageData;
  children: MessageHierarchy[];
  depth: number;
  parent?: MessageHierarchy;
}

// Type for filter options
export interface FilterOptions {
  roles?: ('user' | 'assistant' | 'unknown')[];
  showSidechains?: boolean;
  showMeta?: boolean;
  searchQuery?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Type for sort options
export type SortType = 'chronological' | 'reverse-chronological' | 'tree';

// Type for search results with highlighting
export interface SearchResult {
  message: MessageData;
  highlights: {
    field: string;
    start: number;
    end: number;
  }[];
}

// Type for validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Type for message selection result
export interface MessageSelection {
  message: MessageData | null;
  index: number;
  isValid: boolean;
}

/**
 * Filter messages by type/role
 */
export function filterMessagesByType(
  messages: MessageData[],
  filterType: AppState['filterType']
): MessageData[] {
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
}

/**
 * Search messages with advanced filtering and highlighting
 */
export function searchMessages(
  messages: MessageData[],
  query: string,
  caseSensitive = false
): SearchResult[] {
  if (!messages || !Array.isArray(messages) || !query || query.trim() === '') {
    return [];
  }

  const searchTerm = caseSensitive ? query : query.toLowerCase();
  const results: SearchResult[] = [];

  messages.forEach((message) => {
    const highlights: SearchResult['highlights'] = [];

    // Search in message content
    if (message.message?.content) {
      const contentText = extractTextFromContent(message.message.content);
      const searchText = caseSensitive ? contentText : contentText.toLowerCase();

      let index = 0;
      let foundIndex = searchText.indexOf(searchTerm, index);
      while (foundIndex !== -1) {
        highlights.push({
          field: 'content',
          start: foundIndex,
          end: foundIndex + searchTerm.length,
        });
        index = foundIndex + 1;
        foundIndex = searchText.indexOf(searchTerm, index);
      }
    }

    // Search in tool names
    if (message.message?.tool_calls) {
      message.message.tool_calls.forEach((toolCall, toolIndex) => {
        const toolName = caseSensitive ? toolCall.name : toolCall.name.toLowerCase();
        if (toolName.includes(searchTerm)) {
          highlights.push({
            field: `tool_${toolIndex}`,
            start: toolName.indexOf(searchTerm),
            end: toolName.indexOf(searchTerm) + searchTerm.length,
          });
        }
      });
    }

    // Search in UUID (useful for debugging)
    const uuidText = caseSensitive ? message.uuid : message.uuid.toLowerCase();
    if (uuidText.includes(searchTerm)) {
      highlights.push({
        field: 'uuid',
        start: uuidText.indexOf(searchTerm),
        end: uuidText.indexOf(searchTerm) + searchTerm.length,
      });
    }

    if (highlights.length > 0) {
      results.push({
        message,
        highlights,
      });
    }
  });

  return results;
}

/**
 * Sort messages by specified criteria
 */
export function sortMessages(messages: MessageData[], sortType: SortType): MessageData[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const messagesCopy = [...messages];

  switch (sortType) {
    case 'chronological':
      return messagesCopy.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });

    case 'reverse-chronological':
      return messagesCopy.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

    case 'tree':
      return buildTreeSort(messagesCopy);

    default:
      return messagesCopy;
  }
}

/**
 * Build message hierarchy tree
 */
export function getMessageHierarchy(messages: MessageData[]): MessageHierarchy[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const messageMap = new Map<string, MessageData>();
  const hierarchyMap = new Map<string, MessageHierarchy>();
  const parentChildMap = new Map<string, string[]>();

  // Build maps
  messages.forEach((message) => {
    messageMap.set(message.uuid, message);

    if (message.parentUuid && message.parentUuid !== 'null') {
      if (!parentChildMap.has(message.parentUuid)) {
        parentChildMap.set(message.parentUuid, []);
      }
      const children = parentChildMap.get(message.parentUuid);
      if (children) {
        children.push(message.uuid);
      }
    }
  });

  // Build hierarchy nodes
  const buildHierarchyNode = (message: MessageData, depth = 0): MessageHierarchy => {
    const node: MessageHierarchy = {
      message,
      children: [],
      depth,
    };

    hierarchyMap.set(message.uuid, node);

    const childrenIds = parentChildMap.get(message.uuid) || [];
    node.children = childrenIds
      .map((childId) => messageMap.get(childId))
      .filter((child) => child !== undefined)
      .map((child) => {
        const childNode = buildHierarchyNode(child as MessageData, depth + 1);
        childNode.parent = node;
        return childNode;
      });

    return node;
  };

  // Find root messages (no parent or parent is 'null')
  const rootMessages = messages.filter(
    (message) => !message.parentUuid || message.parentUuid === 'null'
  );

  return rootMessages.map((message) => buildHierarchyNode(message));
}

/**
 * Get visible messages for virtual scrolling
 */
export function getVisibleMessages(
  messages: MessageData[],
  scrollState: VirtualScrollState
): MessageData[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const { startIndex, endIndex } = scrollState;
  const safeStartIndex = Math.max(0, startIndex);
  const safeEndIndex = Math.min(messages.length, endIndex);

  return messages.slice(safeStartIndex, safeEndIndex);
}

/**
 * Select a message by index with bounds checking
 */
export function selectMessage(messages: MessageData[], index: number): MessageSelection {
  if (!messages || !Array.isArray(messages)) {
    return {
      message: null,
      index: -1,
      isValid: false,
    };
  }

  const safeIndex = Math.max(0, Math.min(index, messages.length - 1));
  const message = messages[safeIndex] || null;

  return {
    message,
    index: safeIndex,
    isValid: message !== null && index >= 0 && index < messages.length,
  };
}

/**
 * Calculate comprehensive message statistics
 */
export function calculateMessageStats(messages: MessageData[]): ConversationStats {
  if (!messages || !Array.isArray(messages)) {
    return {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      toolCalls: 0,
      sidechains: 0,
      totalTokens: 0,
      totalDuration: 0,
    };
  }

  const stats: ConversationStats = {
    totalMessages: messages.length,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    sidechains: 0,
    totalTokens: 0,
    totalDuration: 0,
  };

  messages.forEach((message) => {
    // Count by role
    if (message.message?.role === 'user') {
      stats.userMessages++;
    } else if (message.message?.role === 'assistant') {
      stats.assistantMessages++;
    }

    // Count tool calls
    if (message.message?.tool_calls) {
      stats.toolCalls += message.message.tool_calls.length;
    }

    // Count sidechains
    if (message.isSidechain) {
      stats.sidechains++;
    }

    // Sum tokens
    if (message.message?.usage) {
      stats.totalTokens += message.message.usage.input_tokens || 0;
      stats.totalTokens += message.message.usage.output_tokens || 0;
    }

    // Sum duration from tool use results
    if (message.toolUseResult?.totalDurationMs) {
      stats.totalDuration += message.toolUseResult.totalDurationMs;
    }
  });

  return stats;
}

/**
 * Validate messages array and individual messages
 */
export function validateMessages(messages: MessageData[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!messages) {
    result.isValid = false;
    result.errors.push('Messages array is null or undefined');
    return result;
  }

  if (!Array.isArray(messages)) {
    result.isValid = false;
    result.errors.push('Messages is not an array');
    return result;
  }

  if (messages.length === 0) {
    result.warnings.push('Messages array is empty');
    return result;
  }

  const uuidSet = new Set<string>();
  const parentUuids = new Set<string>();
  const existingUuids = new Set<string>();

  messages.forEach((message, index) => {
    // Check for required fields
    if (!message.uuid) {
      result.errors.push(`Message at index ${index} missing uuid`);
      result.isValid = false;
    } else {
      // Check for duplicate UUIDs
      if (uuidSet.has(message.uuid)) {
        result.errors.push(`Duplicate UUID found: ${message.uuid}`);
        result.isValid = false;
      }
      uuidSet.add(message.uuid);
      existingUuids.add(message.uuid);
    }

    if (!message.timestamp) {
      result.errors.push(`Message at index ${index} missing timestamp`);
      result.isValid = false;
    } else {
      // Validate timestamp format
      const date = new Date(message.timestamp);
      if (Number.isNaN(date.getTime())) {
        result.errors.push(`Message at index ${index} has invalid timestamp: ${message.timestamp}`);
        result.isValid = false;
      }
    }

    // Track parent UUIDs for orphan checking
    if (message.parentUuid && message.parentUuid !== 'null') {
      parentUuids.add(message.parentUuid);
    }

    // Validate message content if present
    if (message.message) {
      if (!message.message.role) {
        result.warnings.push(`Message at index ${index} missing role`);
      }

      if (!message.message.content) {
        result.warnings.push(`Message at index ${index} missing content`);
      }

      // Validate usage tokens
      if (message.message.usage) {
        if (
          typeof message.message.usage.input_tokens !== 'number' ||
          message.message.usage.input_tokens < 0
        ) {
          result.warnings.push(`Message at index ${index} has invalid input_tokens`);
        }
        if (
          typeof message.message.usage.output_tokens !== 'number' ||
          message.message.usage.output_tokens < 0
        ) {
          result.warnings.push(`Message at index ${index} has invalid output_tokens`);
        }
      }
    }
  });

  // Check for orphaned messages (parent doesn't exist)
  parentUuids.forEach((parentUuid) => {
    if (!existingUuids.has(parentUuid)) {
      result.warnings.push(`Orphaned message found with parent UUID: ${parentUuid}`);
    }
  });

  return result;
}

/**
 * Advanced filtering with multiple criteria
 */
export function filterMessagesAdvanced(
  messages: MessageData[],
  options: FilterOptions
): MessageData[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages.filter((message) => {
    // Role filter
    if (options.roles && options.roles.length > 0) {
      const messageRole = message.message?.role || 'unknown';
      if (!options.roles.includes(messageRole as 'user' | 'assistant' | 'unknown')) {
        return false;
      }
    }

    // Sidechain filter
    if (options.showSidechains === false && message.isSidechain) {
      return false;
    }

    // Meta filter
    if (options.showMeta === false && (message.isMeta || message.type === 'summary')) {
      return false;
    }

    // Search query filter
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const searchResults = searchMessages([message], options.searchQuery);
      if (searchResults.length === 0) {
        return false;
      }
    }

    // Date range filter
    if (options.dateRange) {
      const messageDate = new Date(message.timestamp);
      if (messageDate < options.dateRange.from || messageDate > options.dateRange.to) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get message thread (all messages in a conversation branch)
 */
export function getMessageThread(messages: MessageData[], messageUuid: string): MessageData[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const messageMap = new Map<string, MessageData>();
  messages.forEach((msg) => messageMap.set(msg.uuid, msg));

  const thread: MessageData[] = [];
  const visited = new Set<string>();

  // Find the root of this thread
  let currentMessage = messageMap.get(messageUuid);
  if (!currentMessage) {
    return [];
  }

  // Walk up to find root
  while (
    currentMessage?.parentUuid &&
    currentMessage.parentUuid !== 'null' &&
    !visited.has(currentMessage.uuid)
  ) {
    visited.add(currentMessage.uuid);
    currentMessage = messageMap.get(currentMessage.parentUuid);
  }

  // Now walk down collecting all messages in this thread
  const collectThreadMessages = (message: MessageData) => {
    if (visited.has(message.uuid)) return; // Avoid cycles
    visited.add(message.uuid);
    thread.push(message);

    // Find children
    const children = messages.filter((m) => m.parentUuid === message.uuid);
    children.forEach((child) => collectThreadMessages(child));
  };

  if (currentMessage) {
    visited.clear();
    collectThreadMessages(currentMessage);
  }

  return thread.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Calculate virtual scroll parameters
 */
export function calculateVirtualScroll(
  messages: MessageData[],
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  buffer = 5
): VirtualScrollState {
  if (!messages || !Array.isArray(messages)) {
    return {
      scrollTop,
      viewportHeight,
      itemHeight,
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
    };
  }

  const totalItems = messages.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    totalItems,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer
  );

  return {
    scrollTop,
    viewportHeight,
    itemHeight,
    startIndex,
    endIndex,
    visibleItems: messages.slice(startIndex, endIndex),
  };
}

// Helper functions

/**
 * Extract text content from message content (helper)
 */
function extractTextFromContent(content: ContentItem[] | string): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text || '')
      .join(' ');
  }

  return '';
}

/**
 * Build tree-sorted message array (helper)
 */
function buildTreeSort(messages: MessageData[]): MessageData[] {
  const hierarchy = getMessageHierarchy(messages);
  const result: MessageData[] = [];

  const flattenHierarchy = (nodes: MessageHierarchy[]) => {
    nodes.forEach((node) => {
      result.push(node.message);
      if (node.children.length > 0) {
        flattenHierarchy(node.children);
      }
    });
  };

  flattenHierarchy(hierarchy);
  return result;
}

/**
 * Get next/previous message in sequence
 */
export function getAdjacentMessage(
  messages: MessageData[],
  currentIndex: number,
  direction: 'next' | 'previous'
): MessageSelection {
  if (!messages || !Array.isArray(messages)) {
    return { message: null, index: -1, isValid: false };
  }

  const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  return selectMessage(messages, newIndex);
}

/**
 * Find message by UUID
 */
export function findMessageByUuid(messages: MessageData[], uuid: string): MessageData | null {
  if (!messages || !Array.isArray(messages) || !uuid) {
    return null;
  }

  return messages.find((message) => message.uuid === uuid) || null;
}

/**
 * Get message index by UUID
 */
export function getMessageIndexByUuid(messages: MessageData[], uuid: string): number {
  if (!messages || !Array.isArray(messages) || !uuid) {
    return -1;
  }

  return messages.findIndex((message) => message.uuid === uuid);
}

/**
 * Export message utilities object for easier import
 */
export const MessageUtils = {
  filterMessagesByType,
  searchMessages,
  sortMessages,
  getMessageHierarchy,
  getVisibleMessages,
  selectMessage,
  calculateMessageStats,
  validateMessages,
  filterMessagesAdvanced,
  getMessageThread,
  calculateVirtualScroll,
  getAdjacentMessage,
  findMessageByUuid,
  getMessageIndexByUuid,
} as const;
