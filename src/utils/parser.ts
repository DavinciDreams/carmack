import { readFile } from 'node:fs/promises';
import { MessageDataSchema, type MessageData } from '../interactive-jsonl-viewer/utils/types.js';

/**
 * JSONL Parser Utilities
 *
 * This module provides utilities for parsing JSONL files containing Claude message data.
 * It extracts and migrates parsing logic from pretty-print-claude-jsonl.ts with proper
 * Zod validation and comprehensive error handling.
 */

/**
 * Error class for JSONL parsing errors
 */
export class JSONLParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'JSONLParseError';
  }
}

/**
 * Parse result interface
 */
export interface ParseResult {
  messages: MessageData[];
  errors: JSONLParseError[];
  totalLines: number;
  validLines: number;
}

/**
 * Parser configuration options
 */
export interface ParserOptions {
  /** Skip invalid lines instead of throwing errors */
  skipInvalidLines?: boolean;
  /** Maximum number of parse errors to collect before stopping */
  maxErrors?: number;
  /** Validate each message using Zod schema */
  validateMessages?: boolean;
  /** Include line numbers in error messages */
  includeLineNumbers?: boolean;
}

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: Required<ParserOptions> = {
  skipInvalidLines: true,
  maxErrors: 100,
  validateMessages: true,
  includeLineNumbers: true,
};

/**
 * Parse a JSONL file containing Claude message data
 *
 * @param filePath - Path to the JSONL file
 * @param options - Parser configuration options
 * @returns Promise<MessageData[]> - Array of parsed messages
 * @throws JSONLParseError - If file cannot be read or parsing fails critically
 */
export async function parseJSONL(
  filePath: string,
  options: ParserOptions = {}
): Promise<MessageData[]> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    const content = await readFile(filePath, 'utf-8');
    const parseResult = parseJSONLContent(content, config);

    // If we have critical errors and not skipping invalid lines, throw
    if (!config.skipInvalidLines && parseResult.errors.length > 0) {
      throw parseResult.errors[0];
    }

    return parseResult.messages;
  } catch (error) {
    if (error instanceof JSONLParseError) {
      throw error;
    }
    throw new JSONLParseError(
      `Failed to read JSONL file: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse JSONL content from a string
 *
 * @param content - JSONL content as string
 * @param options - Parser configuration options
 * @returns ParseResult - Detailed parsing results including errors
 */
export function parseJSONLContent(content: string, options: ParserOptions = {}): ParseResult {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());
  const messages: MessageData[] = [];
  const errors: JSONLParseError[] = [];

  lines.forEach((line, index) => {
    try {
      const lineNumber = index + 1;
      const rawObj = JSON.parse(line);

      // Validate message if requested
      if (config.validateMessages) {
        const validatedMessage = validateMessage(rawObj, lineNumber);
        if (validatedMessage) {
          messages.push(validatedMessage);
        } else {
          errors.push(
            new JSONLParseError(`Invalid message structure at line ${lineNumber}`, lineNumber)
          );
        }
      } else {
        // Skip validation, just add the raw object
        messages.push(rawObj as MessageData);
      }
    } catch (error) {
      const parseError = new JSONLParseError(
        `JSON parse error at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        index + 1,
        error instanceof Error ? error : undefined
      );

      errors.push(parseError);

      // Stop parsing if we hit max errors
      if (errors.length >= config.maxErrors) {
        errors.push(
          new JSONLParseError(`Stopped parsing after ${config.maxErrors} errors`, index + 1)
        );
        return;
      }
    }
  });

  return {
    messages,
    errors,
    totalLines: lines.length,
    validLines: messages.length,
  };
}

/**
 * Validate a raw message object against the MessageData schema
 *
 * @param rawMessage - Raw message object from JSON parsing
 * @param lineNumber - Optional line number for error reporting
 * @returns MessageData | null - Validated message or null if invalid
 */
export function validateMessage(rawMessage: unknown, lineNumber?: number): MessageData | null {
  try {
    return MessageDataSchema.parse(rawMessage);
  } catch (error) {
    console.error(
      `Message validation failed${lineNumber ? ` at line ${lineNumber}` : ''}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Build a parent-child relationship map from messages
 *
 * @param messages - Array of MessageData objects
 * @returns Map<string, string[]> - Map of parent UUIDs to child UUIDs
 */
export function buildParentChildMap(messages: MessageData[]): Map<string, string[]> {
  const parentChildMap = new Map<string, string[]>();

  messages.forEach((message) => {
    if (message.uuid && message.parentUuid && message.parentUuid !== 'null') {
      if (!parentChildMap.has(message.parentUuid)) {
        parentChildMap.set(message.parentUuid, []);
      }
      parentChildMap.get(message.parentUuid)?.push(message.uuid);
    }
  });

  return parentChildMap;
}

/**
 * Build a message lookup map by UUID
 *
 * @param messages - Array of MessageData objects
 * @returns Map<string, MessageData> - Map of UUIDs to MessageData
 */
export function buildMessageMap(messages: MessageData[]): Map<string, MessageData> {
  const messageMap = new Map<string, MessageData>();

  messages.forEach((message) => {
    if (message.uuid) {
      messageMap.set(message.uuid, message);
    }
  });

  return messageMap;
}

/**
 * Find root messages (messages without parents)
 *
 * @param messages - Array of MessageData objects
 * @returns MessageData[] - Array of root messages
 */
export function findRootMessages(messages: MessageData[]): MessageData[] {
  return messages.filter((message) => !message.parentUuid || message.parentUuid === 'null');
}

/**
 * Get children of a specific message
 *
 * @param parentUuid - UUID of the parent message
 * @param parentChildMap - Pre-built parent-child relationship map
 * @returns string[] - Array of child UUIDs
 */
export function getChildrenIds(
  parentUuid: string,
  parentChildMap: Map<string, string[]>
): string[] {
  return parentChildMap.get(parentUuid) || [];
}

/**
 * Get message statistics
 *
 * @param messages - Array of MessageData objects
 * @returns Object containing message statistics
 */
export function getMessageStats(messages: MessageData[]): {
  totalMessages: number;
  messagesByType: Record<string, number>;
  messagesWithParent: number;
  rootMessages: number;
  sidechainMessages: number;
  metaMessages: number;
} {
  const stats = {
    totalMessages: messages.length,
    messagesByType: {} as Record<string, number>,
    messagesWithParent: 0,
    rootMessages: 0,
    sidechainMessages: 0,
    metaMessages: 0,
  };

  messages.forEach((message) => {
    // Count by type
    if (message.type) {
      stats.messagesByType[message.type] = (stats.messagesByType[message.type] || 0) + 1;
    }

    // Count parent relationships
    if (message.parentUuid && message.parentUuid !== 'null') {
      stats.messagesWithParent++;
    } else {
      stats.rootMessages++;
    }

    // Count special message types
    if (message.isSidechain) {
      stats.sidechainMessages++;
    }

    if (message.isMeta) {
      stats.metaMessages++;
    }
  });

  return stats;
}

/**
 * Create a summary report of parsing results
 *
 * @param parseResult - Results from parseJSONLContent
 * @returns string - Human-readable summary
 */
export function createParseReport(parseResult: ParseResult): string {
  const { messages, errors, totalLines, validLines } = parseResult;
  const stats = getMessageStats(messages);

  let report = 'JSONL Parse Report\n';
  report += '==================\n';
  report += `Total lines: ${totalLines}\n`;
  report += `Valid lines: ${validLines}\n`;
  report += `Parse errors: ${errors.length}\n`;
  report += `Success rate: ${totalLines > 0 ? ((validLines / totalLines) * 100).toFixed(1) : 0}%\n\n`;

  if (messages.length > 0) {
    report += 'Message Statistics:\n';
    report += `- Total messages: ${stats.totalMessages}\n`;
    report += `- Root messages: ${stats.rootMessages}\n`;
    report += `- Messages with parent: ${stats.messagesWithParent}\n`;
    report += `- Sidechain messages: ${stats.sidechainMessages}\n`;
    report += `- Meta messages: ${stats.metaMessages}\n`;

    if (Object.keys(stats.messagesByType).length > 0) {
      report += '\nMessages by type:\n';
      Object.entries(stats.messagesByType).forEach(([type, count]) => {
        report += `- ${type}: ${count}\n`;
      });
    }
  }

  if (errors.length > 0) {
    report += '\nErrors:\n';
    errors.slice(0, 10).forEach((error, index) => {
      report += `${index + 1}. Line ${error.line}: ${error.message}\n`;
    });

    if (errors.length > 10) {
      report += `... and ${errors.length - 10} more errors\n`;
    }
  }

  return report;
}

/**
 * Advanced parsing with recovery strategies
 *
 * @param filePath - Path to the JSONL file
 * @param options - Parser configuration options
 * @returns Promise<ParseResult> - Detailed parsing results
 */
export async function parseJSONLWithRecovery(
  filePath: string,
  options: ParserOptions = {}
): Promise<ParseResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    const content = await readFile(filePath, 'utf-8');
    return parseJSONLContent(content, config);
  } catch (error) {
    return {
      messages: [],
      errors: [
        new JSONLParseError(
          `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          error instanceof Error ? error : undefined
        ),
      ],
      totalLines: 0,
      validLines: 0,
    };
  }
}

/**
 * Type guard to check if an object is a valid MessageData
 *
 * @param obj - Object to check
 * @returns boolean - True if object is valid MessageData
 */
export function isValidMessageData(obj: unknown): obj is MessageData {
  return MessageDataSchema.safeParse(obj).success;
}

/**
 * Filter messages by criteria
 *
 * @param messages - Array of MessageData objects
 * @param criteria - Filtering criteria
 * @returns MessageData[] - Filtered messages
 */
export function filterMessages(
  messages: MessageData[],
  criteria: {
    type?: string;
    role?: string;
    hasParent?: boolean;
    isSidechain?: boolean;
    isMeta?: boolean;
    timestampAfter?: string;
    timestampBefore?: string;
  }
): MessageData[] {
  return messages.filter((message) => {
    if (criteria.type && message.type !== criteria.type) {
      return false;
    }

    if (criteria.role && message.message?.role !== criteria.role) {
      return false;
    }

    if (criteria.hasParent !== undefined) {
      const hasParent = Boolean(message.parentUuid && message.parentUuid !== 'null');
      if (criteria.hasParent !== hasParent) {
        return false;
      }
    }

    if (criteria.isSidechain !== undefined && message.isSidechain !== criteria.isSidechain) {
      return false;
    }

    if (criteria.isMeta !== undefined && message.isMeta !== criteria.isMeta) {
      return false;
    }

    if (criteria.timestampAfter && message.timestamp < criteria.timestampAfter) {
      return false;
    }

    if (criteria.timestampBefore && message.timestamp > criteria.timestampBefore) {
      return false;
    }

    return true;
  });
}
