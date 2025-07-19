import { describe, it, expect } from 'bun:test';
import { calculateStats } from './StatsPanel';
import type { ClaudeMessage } from '../types';

describe('StatsPanel', () => {
  describe('calculateStats', () => {
    it('should calculate basic stats correctly', () => {
      const mockMessages: ClaudeMessage[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          parentUuid: null,
          message: {
            role: 'user',
            content: 'Hello',
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        },
        {
          uuid: '2',
          timestamp: '2023-01-01T00:01:00Z',
          parentUuid: '1',
          message: {
            role: 'assistant',
            content: 'Hi there!',
            usage: { input_tokens: 5, output_tokens: 15 },
            tool_calls: [{ name: 'test_tool', input: {} }],
          },
        },
        {
          uuid: '3',
          timestamp: '2023-01-01T00:02:00Z',
          parentUuid: '1',
          isSidechain: true,
          message: {
            role: 'assistant',
            content: 'Sidechain message',
          },
          toolUseResult: {
            totalDurationMs: 1000,
          },
        },
      ];

      const stats = calculateStats(mockMessages);

      expect(stats).toEqual({
        totalMessages: 3,
        userMessages: 1,
        assistantMessages: 2,
        toolCalls: 1,
        sidechains: 1,
        totalTokens: 30, // 10 + 5 + 15 = 30
        totalDuration: 1000,
      });
    });

    it('should handle empty messages array', () => {
      const stats = calculateStats([]);

      expect(stats).toEqual({
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        toolCalls: 0,
        sidechains: 0,
        totalTokens: 0,
        totalDuration: 0,
      });
    });

    it('should handle messages without usage or tool results', () => {
      const mockMessages: ClaudeMessage[] = [
        {
          uuid: '1',
          timestamp: '2023-01-01T00:00:00Z',
          parentUuid: null,
          message: {
            role: 'user',
            content: 'Hello',
          },
        },
      ];

      const stats = calculateStats(mockMessages);

      expect(stats).toEqual({
        totalMessages: 1,
        userMessages: 1,
        assistantMessages: 0,
        toolCalls: 0,
        sidechains: 0,
        totalTokens: 0,
        totalDuration: 0,
      });
    });
  });
});
