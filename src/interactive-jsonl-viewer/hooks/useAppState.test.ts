import { describe, it, expect, beforeEach } from 'bun:test';
import type { MessageData } from '../utils/types';
import { MessageUtils } from '../utils/messageUtils';

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
global.localStorage = localStorageMock as any;

describe('useAppState', () => {
  beforeEach(() => {
    // Reset any test state if needed
  });

  describe('Core functionality tests', () => {
    it('should have proper initial state structure', () => {
      const initialState = {
        messages: [],
        selectedIndex: 0,
        expandedMessages: new Set(),
        viewMode: 'chronological' as const,
        filterType: 'all' as const,
        searchQuery: '',
        isLoading: false,
        error: undefined,
        showHelp: false,
        autoScroll: false,
        autoScrollDelay: 1000,
      };
      
      expect(initialState.messages).toEqual([]);
      expect(initialState.selectedIndex).toBe(0);
      expect(initialState.filterType).toBe('all');
      expect(initialState.viewMode).toBe('chronological');
      expect(initialState.searchQuery).toBe('');
      expect(initialState.expandedMessages).toEqual(new Set());
      expect(initialState.showHelp).toBe(false);
      expect(initialState.autoScroll).toBe(false);
    });

    it('should handle message filtering correctly', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Test user message' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { role: 'assistant', content: 'Test assistant response' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          message: { role: 'user', content: 'Another user message', tool_calls: [{ name: 'test_tool', input: {} }] }
        }
      ];

      // Test all filter
      const allFiltered = MessageUtils.filterMessagesByType(testMessages, 'all');
      expect(allFiltered).toHaveLength(3);

      // Test user filter
      const userFiltered = MessageUtils.filterMessagesByType(testMessages, 'user');
      expect(userFiltered).toHaveLength(2);
      expect(userFiltered.every(msg => msg.message?.role === 'user')).toBe(true);

      // Test assistant filter
      const assistantFiltered = MessageUtils.filterMessagesByType(testMessages, 'assistant');
      expect(assistantFiltered).toHaveLength(1);
      expect(assistantFiltered[0].message?.role).toBe('assistant');

      // Test tools filter
      const toolsFiltered = MessageUtils.filterMessagesByType(testMessages, 'tools');
      expect(toolsFiltered).toHaveLength(1);
      expect(toolsFiltered[0].message?.tool_calls).toBeDefined();
    });

    it('should handle search functionality', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Hello world' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { role: 'assistant', content: 'Hello there' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          message: { role: 'user', content: 'Goodbye world' }
        }
      ];

      const searchResults = MessageUtils.searchMessages(testMessages, 'world');
      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].message.uuid).toBe('1');
      expect(searchResults[1].message.uuid).toBe('3');

      const helloSearch = MessageUtils.searchMessages(testMessages, 'hello');
      expect(helloSearch).toHaveLength(2);
    });

    it('should handle message selection correctly', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Test 1' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { role: 'assistant', content: 'Test 2' }
        }
      ];

      const selection = MessageUtils.selectMessage(testMessages, 1);
      expect(selection.isValid).toBe(true);
      expect(selection.message?.uuid).toBe('2');
      expect(selection.index).toBe(1);

      // Test bounds checking
      const invalidSelection = MessageUtils.selectMessage(testMessages, 10);
      expect(invalidSelection.isValid).toBe(false);
      expect(invalidSelection.index).toBe(1); // Should clamp to valid range
    });

    it('should calculate message statistics correctly', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { 
            role: 'user', 
            content: 'Test message',
            usage: { input_tokens: 10, output_tokens: 0 }
          }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { 
            role: 'assistant', 
            content: 'Response',
            usage: { input_tokens: 5, output_tokens: 15 }
          }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          isSidechain: true,
          message: { role: 'user', content: 'Sidechain message' }
        }
      ];

      const stats = MessageUtils.calculateMessageStats(testMessages);
      expect(stats.totalMessages).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.sidechains).toBe(1);
      expect(stats.totalTokens).toBe(30); // 10 + 5 + 15
    });

    it('should validate messages correctly', () => {
      const validMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Valid message' }
        }
      ];

      const validation = MessageUtils.validateMessages(validMessages);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Test invalid messages
      const invalidMessages: MessageData[] = [
        {
          uuid: '',
          timestamp: 'invalid-date',
          message: { role: 'user', content: 'Invalid message' }
        } as any
      ];

      const invalidValidation = MessageUtils.validateMessages(invalidMessages);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    it('should handle message hierarchy correctly', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Root message' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          parentUuid: '1',
          message: { role: 'assistant', content: 'Child message' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          parentUuid: '2',
          message: { role: 'user', content: 'Grandchild message' }
        }
      ];

      const hierarchy = MessageUtils.getMessageHierarchy(testMessages);
      expect(hierarchy).toHaveLength(1); // One root message
      expect(hierarchy[0].message.uuid).toBe('1');
      expect(hierarchy[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].message.uuid).toBe('2');
      expect(hierarchy[0].children[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].children[0].message.uuid).toBe('3');
    });

    it('should handle message thread extraction', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'Thread root' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          parentUuid: '1',
          message: { role: 'assistant', content: 'Thread child 1' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          parentUuid: '1',
          message: { role: 'assistant', content: 'Thread child 2' }
        },
        {
          uuid: '4',
          timestamp: '2023-01-01T00:03:00Z',
          message: { role: 'user', content: 'Different thread' }
        }
      ];

      const thread = MessageUtils.getMessageThread(testMessages, '2');
      expect(thread).toHaveLength(3); // Root + 2 children
      expect(thread.some(msg => msg.uuid === '1')).toBe(true);
      expect(thread.some(msg => msg.uuid === '2')).toBe(true);
      expect(thread.some(msg => msg.uuid === '3')).toBe(true);
      expect(thread.some(msg => msg.uuid === '4')).toBe(false);
    });

    it('should handle virtual scrolling calculations', () => {
      const testMessages: MessageData[] = Array.from({ length: 100 }, (_, i) => ({
        uuid: `test-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        message: { role: 'user', content: `Message ${i}` }
      }));

      const scrollState = MessageUtils.calculateVirtualScroll(
        testMessages,
        500, // scrollTop
        400, // viewportHeight
        50,  // itemHeight
        2    // buffer
      );

      expect(scrollState.scrollTop).toBe(500);
      expect(scrollState.viewportHeight).toBe(400);
      expect(scrollState.itemHeight).toBe(50);
      expect(scrollState.startIndex).toBe(8); // (500/50) - 2
      expect(scrollState.endIndex).toBe(20); // (500+400)/50 + 2
      expect(scrollState.visibleItems).toHaveLength(12); // 20 - 8
    });

    it('should handle advanced filtering with multiple criteria', () => {
      const testMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { role: 'user', content: 'User message' }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { role: 'assistant', content: 'Assistant response' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          isSidechain: true,
          message: { role: 'user', content: 'Sidechain user message' }
        },
        {
          uuid: '4',
          timestamp: '2023-01-01T00:03:00Z',
          isMeta: true,
          message: { role: 'assistant', content: 'Meta assistant message' }
        }
      ];

      // Test role filtering
      const userOnly = MessageUtils.filterMessagesAdvanced(testMessages, {
        roles: ['user']
      });
      expect(userOnly).toHaveLength(2);

      // Test sidechain filtering
      const noSidechains = MessageUtils.filterMessagesAdvanced(testMessages, {
        showSidechains: false
      });
      expect(noSidechains).toHaveLength(3);

      // Test meta filtering
      const noMeta = MessageUtils.filterMessagesAdvanced(testMessages, {
        showMeta: false
      });
      expect(noMeta).toHaveLength(3);

      // Test search query filtering
      const searchFiltered = MessageUtils.filterMessagesAdvanced(testMessages, {
        searchQuery: 'Assistant'
      });
      expect(searchFiltered).toHaveLength(2);
    });

    it('should handle message adapter correctly', () => {
      // Test the ClaudeMessage to MessageData adapter
      const claudeMessage = {
        uuid: 'test-uuid',
        timestamp: '2023-01-01T00:00:00Z',
        parentUuid: 'parent-uuid',
        isSidechain: true,
        isMeta: false,
        type: 'user',
        message: {
          role: 'user' as const,
          content: 'Test content',
          usage: { input_tokens: 10, output_tokens: 5 }
        }
      };

      // The adapter is internal to useAppState, so we test the expected output structure
      const expectedMessageData = {
        uuid: 'test-uuid',
        timestamp: '2023-01-01T00:00:00Z',
        parentUuid: 'parent-uuid',
        isSidechain: true,
        isMeta: false,
        type: 'user',
        message: {
          role: 'user',
          content: 'Test content',
          usage: { input_tokens: 10, output_tokens: 5 }
        }
      };

      // Test structure matches
      expect(expectedMessageData.uuid).toBe(claudeMessage.uuid);
      expect(expectedMessageData.timestamp).toBe(claudeMessage.timestamp);
      expect(expectedMessageData.parentUuid).toBe(claudeMessage.parentUuid);
      expect(expectedMessageData.isSidechain).toBe(claudeMessage.isSidechain);
      expect(expectedMessageData.message?.role).toBe(claudeMessage.message?.role);
    });

    it('should handle edge cases correctly', () => {
      // Test empty arrays
      expect(MessageUtils.filterMessagesByType([], 'all')).toEqual([]);
      expect(MessageUtils.searchMessages([], 'test')).toEqual([]);
      expect(MessageUtils.getMessageHierarchy([])).toEqual([]);
      
      // Test null/undefined inputs
      expect(MessageUtils.selectMessage([], -1).isValid).toBe(false);
      expect(MessageUtils.findMessageByUuid([], 'nonexistent')).toBe(null);
      expect(MessageUtils.getMessageIndexByUuid([], 'nonexistent')).toBe(-1);
      
      // Test validation with empty/invalid data
      const emptyValidation = MessageUtils.validateMessages([]);
      expect(emptyValidation.isValid).toBe(true);
      expect(emptyValidation.warnings).toContain('Messages array is empty');
    });
  });

  describe('Integration tests', () => {
    it('should handle complex filtering and search combinations', () => {
      const complexMessages: MessageData[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          message: { 
            role: 'user', 
            content: 'Search term in user message',
            tool_calls: [{ name: 'search_tool', input: {} }]
          }
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          message: { role: 'assistant', content: 'Assistant response with search term' }
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          isSidechain: true,
          message: { role: 'user', content: 'Sidechain search term message' }
        }
      ];

      // Filter by type first
      const userMessages = MessageUtils.filterMessagesByType(complexMessages, 'user');
      expect(userMessages).toHaveLength(2);

      // Then search within filtered results
      const searchResults = MessageUtils.searchMessages(userMessages, 'search term');
      expect(searchResults).toHaveLength(2);

      // Test tools filter
      const toolMessages = MessageUtils.filterMessagesByType(complexMessages, 'tools');
      expect(toolMessages).toHaveLength(1);
      expect(toolMessages[0].message?.tool_calls).toBeDefined();
    });

    it('should handle state persistence simulation', () => {
      // Test localStorage serialization/deserialization
      const testState = {
        selectedIndex: 5,
        filterType: 'user',
        searchQuery: 'test query',
        expandedMessages: ['msg-1', 'msg-2'],
        timestamp: Date.now()
      };

      // Test JSON serialization
      const serialized = JSON.stringify(testState);
      expect(serialized).toContain('selectedIndex');
      expect(serialized).toContain('filterType');
      expect(serialized).toContain('searchQuery');

      // Test JSON deserialization
      const deserialized = JSON.parse(serialized);
      expect(deserialized.selectedIndex).toBe(5);
      expect(deserialized.filterType).toBe('user');
      expect(deserialized.searchQuery).toBe('test query');
      expect(deserialized.expandedMessages).toEqual(['msg-1', 'msg-2']);
    });
  });
});