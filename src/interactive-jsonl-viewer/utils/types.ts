import { z } from 'zod';

// Content item schema
export const ContentItemSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  name: z.string().optional(),
  input: z.any().optional(),
  tool_use_id: z.string().optional(),
  content: z.any().optional(),
});

export type ContentItem = z.infer<typeof ContentItemSchema>;

// Tool call schema
export const ToolCallSchema = z.object({
  name: z.string(),
  input: z.any(),
  id: z.string().optional(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

// Message usage schema
export const MessageUsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_input_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
});

export type MessageUsage = z.infer<typeof MessageUsageSchema>;

// Message schema
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'unknown', 'system']),
  content: z.union([z.array(ContentItemSchema), z.string()]).optional(),
  usage: MessageUsageSchema.optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  model: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Todo schema
export const TodoSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(['completed', 'in_progress', 'pending']),
  priority: z.enum(['high', 'medium', 'low']),
});

export type Todo = z.infer<typeof TodoSchema>;

// Tool use result schema
export const ToolUseResultSchema = z.object({
  totalDurationMs: z.number().optional(),
  totalTokens: z.number().optional(),
  totalToolUseCount: z.number().optional(),
  oldTodos: z.array(TodoSchema).optional(),
  newTodos: z.array(TodoSchema).optional(),
  content: z.any().optional(),
});

export type ToolUseResult = z.infer<typeof ToolUseResultSchema>;

// Main message data schema
export const MessageDataSchema = z.object({
  uuid: z.string(),
  parentUuid: z.string().optional(),
  timestamp: z.string(),
  isSidechain: z.boolean().optional(),
  isMeta: z.boolean().optional(),
  type: z.enum(['user', 'assistant', 'summary', 'unknown']).optional(),
  message: MessageSchema.optional(),
  toolUseResult: ToolUseResultSchema.optional(),
});

export type MessageData = z.infer<typeof MessageDataSchema>;

// App state interfaces
export interface AppState {
  messages: any[];
  selectedIndex: number;
  expandedMessages: Set<string>;
  viewMode: 'chronological' | 'tree';
  filterType: 'all' | 'user' | 'assistant' | 'tools' | 'sidechains';
  searchQuery: string;
  isLoading: boolean;
  error?: string;
  showHelp: boolean;
  autoScroll: boolean;
  autoScrollDelay: number;
}

// Virtual scroll state
export interface VirtualScrollState {
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: MessageData[];
}

// Component props
export interface MessageItemProps {
  message: MessageData;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  indentLevel: number;
  onToggleExpand: (uuid: string) => void;
  onSelect: (index: number) => void;
}

export interface MessageContentProps {
  content: ContentItem[] | string;
  isExpanded: boolean;
  indentLevel: number;
  maxWidth: number;
}

export interface MessageListProps {
  messages: MessageData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  expandedMessages: Set<string>;
  onToggleExpand: (uuid: string) => void;
  filterType: AppState['filterType'];
  searchQuery: string;
  viewMode: AppState['viewMode'];
}

export interface KeyboardHandler {
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

// CLI arguments
export interface CLIArgs {
  path?: string;
  delay?: string;
  help?: boolean;
  debug?: boolean;
  interactive?: boolean;
}

// Stats interface
export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  sidechains: number;
  totalTokens: number;
  totalDuration: number;
}
