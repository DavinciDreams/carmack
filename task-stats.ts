#!/usr/bin/env bun

/**
 * @file Task Stats Script - Extracts Claude Code Task operation breakdowns.
 * @author John Carmack
 *
 * @version 6.4.0 (Enhanced Type Safety & Formatting)
 *
 * This script analyzes Claude's `.jsonl` session logs to provide a detailed
 * breakdown of every user-assistant interaction within a session.
 *
 * v6.4.0 - Integrates a user-provided Zod schema for robust, type-safe parsing
 * of Claude model names. Corrects the human-readable report's table formatting
 * to ensure perfect column alignment based on precise widths.
 *
 * Usage:
 *   bun start [session_file.jsonl] [--verbose | --llm]
 *   bun start --help
 */

import { readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pc from 'picocolors';
import { z } from 'zod';

// ==================================================================================
// CONFIGURATION & PRICING
// ==================================================================================
const CLAUDE_PROJECT_NAME = Bun.env.CLAUDE_PROJECT_NAME || '-Users-exhaze-p-carmack';
const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects', CLAUDE_PROJECT_NAME);

const PRICING_TABLE = {
  opus: {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  sonnet: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
};

// ==================================================================================
// TYPE DEFINITIONS (Zod Schemas & Interfaces)
// ==================================================================================

const core = ['sonnet', 'opus'] as const;
type Core = (typeof core)[number];

/**
 * JSDoc: This schema robustly parses a model string (e.g., "claude-sonnet-4-20250514")
 * and extracts the core model type ("sonnet" or "opus"), ensuring type safety.
 */
export const ValidClaudeModel = z
  .string()
  .refine((v) => core.filter((k) => v.includes(k)).length === 1, {
    message: `must contain exactly one of: ${core.join(' | ')}`,
  })
  .transform((v) => core.find((k) => v.includes(k)) as Core);

const AnyToolCallSchema = z.object({ name: z.string(), input: z.any() }).passthrough();

const BaseOperationSchema = z.object({
  timestamp: z.date(),
  costUSD: z.number(),
  cacheSavingsUSD: z.number(),
  model: z.string().optional(),
  isSidechain: z.boolean().default(false),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  cacheCreationInputTokens: z.number().default(0),
  cacheReadInputTokens: z.number().default(0),
});

const ToolUsageOperationSchema = BaseOperationSchema.extend({
  opType: z.literal('tool_usage'),
  tool_calls: z.array(AnyToolCallSchema).min(1),
});

const ReasoningOperationSchema = BaseOperationSchema.extend({
  opType: z.literal('reasoning'),
  text: z.string(),
});

const AnyOperationSchema = z.discriminatedUnion('opType', [
  ToolUsageOperationSchema,
  ReasoningOperationSchema,
]);

type AnyOperation = z.infer<typeof AnyOperationSchema>;

type Task = {
  userPrompt: string;
  operations: AnyOperation[];
};

// ==================================================================================
// DATA PROCESSING
// ==================================================================================

function getRates(modelName?: string) {
  try {
    if (!modelName) return null;
    const parsedModel = ValidClaudeModel.parse(modelName);
    return PRICING_TABLE[parsedModel];
  } catch (e) {
    // Gracefully handle unknown models by returning no rates
    return null;
  }
}

function calculateCost(opData: {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}): number {
  const rates = getRates(opData.model);
  if (!rates) return 0;

  const M = 1_000_000;
  return (
    (opData.inputTokens / M) * rates.input +
    (opData.outputTokens / M) * rates.output +
    (opData.cacheCreationInputTokens / M) * rates.cacheWrite +
    (opData.cacheReadInputTokens / M) * rates.cacheRead
  );
}

function calculateCacheSavings(opData: { model?: string; cacheReadInputTokens: number }): number {
  const rates = getRates(opData.model);
  if (!rates || opData.cacheReadInputTokens === 0) return 0;

  const M = 1_000_000;
  const costIfWritten = (opData.cacheReadInputTokens / M) * rates.cacheWrite;
  const costAsRead = (opData.cacheReadInputTokens / M) * rates.cacheRead;
  return costIfWritten - costAsRead;
}

async function parseLogFile(filePath: string, verbose = false): Promise<{ tasks: Task[] }> {
  const fileContent = await Bun.file(filePath).text();
  const lines = fileContent.split('\n');

  const tasks: Task[] = [];
  let currentTask: Task | null = null;

  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') continue;

    try {
      const entry = JSON.parse(line);

      const isTrueUserPrompt =
        entry.type === 'user' &&
        entry.isSidechain === false &&
        typeof entry.message?.content === 'string';

      if (isTrueUserPrompt) {
        if (currentTask && currentTask.operations.length > 0) {
          tasks.push(currentTask);
        }
        currentTask = {
          userPrompt: entry.message.content.trim(),
          operations: [],
        };
      } else if (entry.type === 'assistant' && currentTask) {
        const normalized = normalizeEntry(entry);
        const parsedOp = AnyOperationSchema.safeParse(normalized);

        if (parsedOp.success) {
          currentTask.operations.push(parsedOp.data);
        }
      }
    } catch (e) {
      if (verbose)
        console.error(pc.yellow(`Failed to parse line ${index + 1}: ${line.substring(0, 100)}...`));
    }
  }

  if (currentTask && currentTask.operations.length > 0) {
    tasks.push(currentTask);
  }

  return { tasks };
}

function normalizeEntry(entry: any): Record<string, any> {
  const usage = entry.message?.usage || {};
  const dataForCost = {
    model: entry.message?.model,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };

  const base = {
    timestamp: new Date(entry.timestamp),
    costUSD: calculateCost(dataForCost),
    cacheSavingsUSD: calculateCacheSavings(dataForCost),
    isSidechain: entry.isSidechain ?? false,
    ...dataForCost,
  };

  const content = entry.message?.content?.[0];

  if (content?.type === 'tool_use') {
    return {
      ...base,
      opType: 'tool_usage',
      tool_calls: entry.message.content
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => ({ name: c.name, input: c.input })),
    };
  }

  const text = content?.text ?? content?.thinking;
  if (text) {
    return { ...base, opType: 'reasoning', text };
  }

  return { ...base, opType: 'unknown' };
}

// ==================================================================================
// REPORTING & DISPLAY
// ==================================================================================

type ReportData = {
  tasks: Task[];
  sessionPath: string;
};

function printHumanReport({ tasks, sessionPath }: ReportData) {
  console.log(pc.cyan(`Analyzing: ${pc.bold(path.basename(sessionPath))}\n`));

  if (tasks.length === 0) {
    console.log(
      pc.yellow('No user-initiated tasks with agent operations found in this session file.')
    );
    return;
  }

  let grandTotalCost = 0;
  let grandTotalTokens = 0;
  let grandTotalToolUses = 0;
  let grandTotalCacheSavings = 0;
  let grandTotalCacheRead = 0;
  let grandTotalCacheWrite = 0;

  for (const [index, task] of tasks.entries()) {
    const taskOps = task.operations;

    const taskCost = taskOps.reduce((sum, op) => sum + op.costUSD, 0);
    const taskTokens = taskOps.reduce(
      (sum, op) =>
        sum +
        op.inputTokens +
        op.outputTokens +
        op.cacheCreationInputTokens +
        op.cacheReadInputTokens,
      0
    );
    const taskToolUses = taskOps.filter((op) => op.opType === 'tool_usage').length;
    const taskCacheSavings = taskOps.reduce((sum, op) => sum + op.cacheSavingsUSD, 0);
    const taskCacheRead = taskOps.reduce((sum, op) => sum + op.cacheReadInputTokens, 0);
    const taskCacheWrite = taskOps.reduce((sum, op) => sum + op.cacheCreationInputTokens, 0);

    const cacheHitRate =
      taskCacheRead + taskCacheWrite > 0
        ? (taskCacheRead / (taskCacheRead + taskCacheWrite)) * 100
        : 0;

    grandTotalCost += taskCost;
    grandTotalTokens += taskTokens;
    grandTotalToolUses += taskToolUses;
    grandTotalCacheSavings += taskCacheSavings;
    grandTotalCacheRead += taskCacheRead;
    grandTotalCacheWrite += taskCacheWrite;

    const firstTimestamp = taskOps[0].timestamp;
    const lastTimestamp = taskOps[taskOps.length - 1].timestamp;
    const elapsedSec = Math.round((lastTimestamp.getTime() - firstTimestamp.getTime()) / 1000);

    console.log(pc.bold(pc.inverse(`\n === TASK ${index + 1} / ${tasks.length} === `)));
    console.log(`User Prompt: ${pc.green(`"${task.userPrompt}"`)}`);
    console.log(
      `Cost: ${pc.yellow(`$${taskCost.toFixed(5)}`)} | Elapsed: ${pc.bold(`${elapsedSec}s`)} | Tokens: ${pc.yellow(taskTokens.toLocaleString())} | Tool Uses: ${pc.magenta(taskToolUses)}`
    );
    console.log(
      `Cache Savings: ${pc.green(`$${taskCacheSavings.toFixed(5)}`)} | Cache Hit Rate: ${pc.blue(`${cacheHitRate.toFixed(1)}%`)}`
    );
    console.log('');

    // --- Start of corrected table padding ---
    const W = { TS: 10, OP: 20, IN: 9, OUT: 10, COST: 10 };

    const h_ts = 'Timestamp'.padEnd(W.TS);
    const h_op = 'Operation'.padEnd(W.OP);
    const h_in = 'In Tokens'.padStart(W.IN);
    const h_out = 'Out Tokens'.padStart(W.OUT);
    const h_cost = 'Cost'.padStart(W.COST);

    console.log(
      pc.gray(
        `┌${'─'.repeat(W.TS + 2)}┬${'─'.repeat(W.OP + 2)}┬${'─'.repeat(W.IN + 2)}┬${'─'.repeat(W.OUT + 2)}┬${'─'.repeat(W.COST + 2)}┐`
      )
    );
    console.log(pc.gray(`│ ${h_ts} │ ${h_op} │ ${h_in} │ ${h_out} │ ${h_cost} │`));
    console.log(
      pc.gray(
        `├${'─'.repeat(W.TS + 2)}┼${'─'.repeat(W.OP + 2)}┼${'─'.repeat(W.IN + 2)}┼${'─'.repeat(W.OUT + 2)}┼${'─'.repeat(W.COST + 2)}┤`
      )
    );

    for (const op of taskOps) {
      const timeStr = op.timestamp.toLocaleTimeString('en-US', { hour12: false }).padEnd(W.TS);
      const opName = getOperationName(op).padEnd(W.OP);
      const inTokens = (op.inputTokens + op.cacheReadInputTokens).toLocaleString().padStart(W.IN);
      const outTokens = op.outputTokens.toLocaleString().padStart(W.OUT);
      const cost = `$${op.costUSD.toFixed(5)}`.padStart(W.COST);

      console.log(
        `│ ${pc.dim(timeStr)} │ ${pc.bold(opName)} │ ${pc.cyan(inTokens)} │ ${pc.yellow(outTokens)} │ ${pc.green(cost)} │`
      );
    }
    console.log(
      pc.gray(
        `└${'─'.repeat(W.TS + 2)}┴${'─'.repeat(W.OP + 2)}┴${'─'.repeat(W.IN + 2)}┴${'─'.repeat(W.OUT + 2)}┴${'─'.repeat(W.COST + 2)}┘`
      )
    );
    // --- End of corrected table padding ---
  }

  const grandTotalCacheHitRate =
    grandTotalCacheRead + grandTotalCacheWrite > 0
      ? (grandTotalCacheRead / (grandTotalCacheRead + grandTotalCacheWrite)) * 100
      : 0;

  console.log(pc.bold(pc.cyan('\n\n=== SESSION GRAND TOTALS ===')));
  console.log(`Total Tasks Reported: ${pc.bold(tasks.length)}`);
  console.log(`Total Cost: ${pc.yellow(`$${grandTotalCost.toFixed(5)}`)}`);
  console.log(`Total Tokens: ${pc.bold(grandTotalTokens.toLocaleString())}`);
  console.log(`Total Tool Uses: ${pc.bold(grandTotalToolUses.toLocaleString())}`);
  console.log(`Total Cache Savings: ${pc.green(`$${grandTotalCacheSavings.toFixed(5)}`)}`);
  console.log(`Overall Cache Hit Rate: ${pc.blue(`${grandTotalCacheHitRate.toFixed(1)}%`)}`);
}

function printLlmReport({ tasks, sessionPath }: ReportData) {
  if (tasks.length === 0) {
    console.log(
      JSON.stringify({
        error: 'No user-initiated tasks with agent operations found',
        sessionFile: path.basename(sessionPath),
      })
    );
    return;
  }

  const report = {
    sessionFile: path.basename(sessionPath),
    tasks: tasks.map((task) => {
      const taskOps = task.operations;

      const taskCost = taskOps.reduce((sum, op) => sum + op.costUSD, 0);
      const taskTokens = taskOps.reduce(
        (sum, op) =>
          sum +
          op.inputTokens +
          op.outputTokens +
          op.cacheCreationInputTokens +
          op.cacheReadInputTokens,
        0
      );
      const taskCacheSavings = taskOps.reduce((sum, op) => sum + op.cacheSavingsUSD, 0);
      const taskCacheRead = taskOps.reduce((sum, op) => sum + op.cacheReadInputTokens, 0);
      const taskCacheWrite = taskOps.reduce((sum, op) => sum + op.cacheCreationInputTokens, 0);
      const cacheHitRate =
        taskCacheRead + taskCacheWrite > 0
          ? (taskCacheRead / (taskCacheRead + taskCacheWrite)) * 100
          : 0;

      const firstTimestamp = taskOps[0].timestamp;
      const lastTimestamp = taskOps[taskOps.length - 1].timestamp;
      const elapsedSec = Math.round((lastTimestamp.getTime() - firstTimestamp.getTime()) / 1000);

      return {
        prompt: task.userPrompt,
        summary: {
          costUSD: Number.parseFloat(taskCost.toFixed(6)),
          cacheSavingsUSD: Number.parseFloat(taskCacheSavings.toFixed(6)),
          cacheHitRatePct: Number.parseFloat(cacheHitRate.toFixed(2)),
          elapsedSec,
          tokens: taskTokens,
          toolUses: taskOps.filter((op) => op.opType === 'tool_usage').length,
        },
        timeline: taskOps.map((op) => ({
          op: getOperationName(op),
          costUSD: Number.parseFloat(op.costUSD.toFixed(6)),
          cacheSavingsUSD: Number.parseFloat(op.cacheSavingsUSD.toFixed(6)),
          model: op.model,
          inTokens: op.inputTokens,
          outTokens: op.outputTokens,
          cacheReadTokens: op.cacheReadInputTokens,
          cacheCreateTokens: op.cacheCreationInputTokens,
        })),
      };
    }),
    grandTotals: {},
  };

  const allOps = tasks.flatMap((t) => t.operations);
  const grandTotalCacheRead = allOps.reduce((s, op) => s + op.cacheReadInputTokens, 0);
  const grandTotalCacheWrite = allOps.reduce((s, op) => s + op.cacheCreationInputTokens, 0);
  const grandTotalCacheHitRate =
    grandTotalCacheRead + grandTotalCacheWrite > 0
      ? (grandTotalCacheRead / (grandTotalCacheRead + grandTotalCacheWrite)) * 100
      : 0;

  report.grandTotals = {
    totalCostUSD: Number.parseFloat(allOps.reduce((s, op) => s + op.costUSD, 0).toFixed(6)),
    totalCacheSavingsUSD: Number.parseFloat(
      allOps.reduce((s, op) => s + op.cacheSavingsUSD, 0).toFixed(6)
    ),
    overallCacheHitRatePct: Number.parseFloat(grandTotalCacheHitRate.toFixed(2)),
    totalTokens: allOps.reduce(
      (s, op) =>
        s +
        op.inputTokens +
        op.outputTokens +
        op.cacheCreationInputTokens +
        op.cacheReadInputTokens,
      0
    ),
    totalToolUses: allOps.filter((op) => op.opType === 'tool_usage').length,
  };

  console.log(JSON.stringify(report, null, 2));
}

// ==================================================================================
// HELPER FUNCTIONS
// ==================================================================================

function getOperationName(op: AnyOperation): string {
  switch (op.opType) {
    case 'reasoning':
      return 'Reasoning';
    case 'tool_usage': {
      const toolCall = op.tool_calls[0];
      return `Tool: ${toolCall.name}`;
    }
  }
}

function showHelp() {
  console.log(`
  ${pc.bold('Claude Task Stats Analyzer (v6.4.0)')}

  ${pc.underline('Usage:')}
    bun start [session_file.jsonl] [--verbose | --llm]
    bun start --help

  ${pc.underline('Description:')}
    Analyzes a Claude session log (.jsonl) to provide a token, tool
    usage, and theoretical cost breakdown for every interaction.

  ${pc.underline('Options:')}
    ${pc.cyan('--llm')}         Output a structured JSON object for machine consumption.
    ${pc.cyan('--verbose')}    Report detailed parsing errors for each invalid line.
    ${pc.cyan('--help')}       Show this help message.

  ${pc.underline('Configuration:')}
    Set the ${pc.cyan('CLAUDE_PROJECT_NAME')} environment variable to your project's name.
  `);
}

async function findTaskSession(): Promise<string[] | null> {
  try {
    const allFiles = await readdir(CLAUDE_DIR);
    const jsonlFiles = allFiles.filter((f) => f.endsWith('.jsonl'));
    if (jsonlFiles.length === 0) return null;

    const filesWithStats = await Promise.all(
      jsonlFiles.map(async (file) => {
        const filePath = path.join(CLAUDE_DIR, file);
        const stats = await stat(filePath);
        return { path: filePath, mtime: stats.mtime };
      })
    );
    filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    return filesWithStats.map((file) => file.path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(pc.red(`Error: Directory not found: ${CLAUDE_DIR}`));
      console.error(pc.yellow('(Have you set the CLAUDE_PROJECT_NAME environment variable?)'));
    } else {
      console.error(pc.red('An unexpected error occurred while finding sessions:'), error);
    }
    return null;
  }
}

// ==================================================================================
// SCRIPT ENTRY POINT
// ==================================================================================

async function main() {
  const args = Bun.argv.slice(2);

  if (args.includes('--help')) {
    showHelp();
    return;
  }

  const llmMode = args.includes('--llm');
  const verboseMode = args.includes('--verbose');
  const fileArg = args.find((arg) => !arg.startsWith('--'));

  if (llmMode && verboseMode) {
    console.error(pc.red("Error: The '--llm' and '--verbose' flags are mutually exclusive."));
    process.exit(1);
  }

  let sessionFiles: string[] | null;
  if (fileArg) {
    sessionFiles = [path.isAbsolute(fileArg) ? fileArg : path.join(CLAUDE_DIR, fileArg)];
    if (!(await Bun.file(sessionFiles[0]).exists())) {
      console.error(pc.red(`Error: File not found: ${sessionFiles[0]}`));
      process.exit(1);
    }
  } else {
    sessionFiles = await findTaskSession();
    if (!sessionFiles) {
      console.error(pc.red('No session files found.'));
      process.exit(1);
    }
  }

  for (const sessionFile of sessionFiles) {
    const { tasks } = await parseLogFile(sessionFile, verboseMode);
    const reportData: ReportData = { tasks, sessionPath: sessionFile };

    if (llmMode) {
      printLlmReport(reportData);
    } else {
      printHumanReport(reportData);
    }
  }
}

main().catch((err) => {
  console.error(pc.red('A critical error occurred:'), err);
  process.exit(1);
});
