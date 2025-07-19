import { readFile } from 'fs/promises';
import type { ClaudeMessage, MessageTreeNode } from '../types';
import { ClaudeMessageSchema } from '../types';

export class JSONLParser {
  private messages: ClaudeMessage[] = [];
  private messageMap = new Map<string, ClaudeMessage>();
  private parentChildMap = new Map<string, string[]>();

  async parseFile(filePath: string): Promise<ClaudeMessage[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      this.messages = [];
      this.messageMap.clear();
      this.parentChildMap.clear();

      lines.forEach((line, index) => {
        try {
          const rawObj = JSON.parse(line);
          const message = ClaudeMessageSchema.parse(rawObj);

          this.messages.push(message);

          if (message.uuid) {
            this.messageMap.set(message.uuid, message);

            if (message.parentUuid && message.parentUuid !== 'null') {
              if (!this.parentChildMap.has(message.parentUuid)) {
                this.parentChildMap.set(message.parentUuid, []);
              }
              this.parentChildMap.get(message.parentUuid)!.push(message.uuid);
            }
          }
        } catch (error) {
          console.error(`Error parsing line ${index + 1}:`, error);
        }
      });

      return this.messages;
    } catch (error) {
      throw new Error(`Failed to parse JSONL file: ${error}`);
    }
  }

  getMessages(): ClaudeMessage[] {
    return this.messages;
  }

  getMessageById(uuid: string): ClaudeMessage | undefined {
    return this.messageMap.get(uuid);
  }

  getChildrenIds(uuid: string): string[] {
    return this.parentChildMap.get(uuid) || [];
  }

  buildMessageTree(): MessageTreeNode[] {
    const rootMessages = this.messages.filter(
      (msg) => !msg.parentUuid || msg.parentUuid === 'null'
    );

    return rootMessages.map((msg) => this.buildTreeNode(msg, 0));
  }

  private buildTreeNode(message: ClaudeMessage, depth: number): MessageTreeNode {
    const children = this.getChildrenIds(message.uuid)
      .map((childId) => this.getMessageById(childId))
      .filter((child) => child !== undefined)
      .map((child) => this.buildTreeNode(child!, depth + 1));

    return {
      message,
      children,
      depth,
    };
  }

  getMessageStats(): {
    total: number;
    byRole: Record<string, number>;
    sidechains: number;
    meta: number;
    withTools: number;
  } {
    const stats = {
      total: this.messages.length,
      byRole: {} as Record<string, number>,
      sidechains: 0,
      meta: 0,
      withTools: 0,
    };

    this.messages.forEach((msg) => {
      if (msg.message?.role) {
        stats.byRole[msg.message.role] = (stats.byRole[msg.message.role] || 0) + 1;
      }

      if (msg.isSidechain) {
        stats.sidechains++;
      }

      if (msg.isMeta || msg.type === 'summary') {
        stats.meta++;
      }

      if (msg.message?.tool_calls && msg.message.tool_calls.length > 0) {
        stats.withTools++;
      }
    });

    return stats;
  }

  findMessagesByContent(searchQuery: string): ClaudeMessage[] {
    const query = searchQuery.toLowerCase();
    return this.messages.filter((msg) => {
      if (msg.message?.content) {
        const content =
          typeof msg.message.content === 'string'
            ? msg.message.content
            : JSON.stringify(msg.message.content);
        return content.toLowerCase().includes(query);
      }
      return false;
    });
  }

  getMessagesByRole(role: string): ClaudeMessage[] {
    return this.messages.filter((msg) => msg.message?.role === role);
  }

  getMessagesByDateRange(from: Date, to: Date): ClaudeMessage[] {
    return this.messages.filter((msg) => {
      const timestamp = new Date(msg.timestamp);
      return timestamp >= from && timestamp <= to;
    });
  }
}
