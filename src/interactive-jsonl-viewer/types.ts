import { z } from 'zod';

// Core message schema with flexible toolUseResult handling
export const ClaudeMessageSchema = z.object({
  uuid: z.string().optional(),
  timestamp: z.string().optional(),
  parentUuid: z.string().nullable().optional(),
  isSidechain: z.boolean().optional(),
  isMeta: z.boolean().optional(),
  type: z.string().optional(),
  message: z
    .object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z
        .union([
          z.string(),
          z.array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
              tool_use_id: z.string().optional(),
              name: z.string().optional(),
              input: z.record(z.any()).optional(),
              content: z.union([z.string(), z.array(z.any())]).optional(),
            })
          ),
        ])
        .optional(),
      usage: z
        .object({
          input_tokens: z.number(),
          output_tokens: z.number(),
          cache_read_input_tokens: z.number().optional(),
        })
        .optional(),
      tool_calls: z
        .array(
          z.object({
            name: z.string(),
            input: z.record(z.any()).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  toolUseResult: z.any().optional(),
});

export type ClaudeMessage = z.infer<typeof ClaudeMessageSchema>;

export interface ViewerState {
  messages: ClaudeMessage[];
  filteredMessages: ClaudeMessage[];
  currentMessageIndex: number;
  searchQuery: string;
  showSidechains: boolean;
  showMeta: boolean;
  autoScroll: boolean;
  playbackSpeed: number;
  selectedRoles: ('user' | 'assistant' | 'system')[];
  viewMode: 'chronological' | 'tree' | 'compact';
}

export interface ViewerProps {
  jsonlPath: string;
  initialDelay?: number;
  debug?: boolean;
}

export interface MessageTreeNode {
  message: ClaudeMessage;
  children: MessageTreeNode[];
  depth: number;
}

export interface FilterOptions {
  roles: ('user' | 'assistant' | 'system')[];
  showSidechains: boolean;
  showMeta: boolean;
  searchQuery: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface PlaybackOptions {
  speed: number; // ms delay between messages
  autoScroll: boolean;
  startFromIndex: number;
}

export type ViewMode = 'chronological' | 'tree' | 'compact';
export type MessageRole = 'user' | 'assistant' | 'system';
