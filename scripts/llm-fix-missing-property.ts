// scripts/llm-fix-missing-property.ts
import fs from "fs";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { EnhancedLLMTransformer } from "../src/actors/llm-transformation-enhanced";

/**
 * Uses the EnhancedLLMTransformer (provider-managed, Zod-validated) to fix missing property errors.
 * Usage: bun run scripts/llm-fix-missing-property.ts "<error>" <file> <line>
 */
async function main() {
  const [error, file, lineStr] = process.argv.slice(2);
  if (!error || !file) {
    console.error("Usage: bun run scripts/llm-fix-missing-property.ts \"<error>\" <file> <line>");
    process.exit(1);
  }
  const line = lineStr ? parseInt(lineStr, 10) : undefined;
  const filePath = path.resolve(file);

  // Read file and extract context (±10 lines around the error line)
  const code = readFileSync(filePath, "utf-8");
  const lines = code.split("\n");
  let context = code;
  if (line && !isNaN(line)) {
    const start = Math.max(0, line - 11);
    const end = Math.min(lines.length, line + 10);
    context = lines.slice(start, end).join("\n");
  }

  // Prepare LLM prompt
  const prompt = [
    `TypeScript Error:`,
    error,
    ``,
    `File: ${file}${line ? `:${line}` : ""}`,
    ``,
    `Relevant code context:`,
    "```typescript",
    context,
    "```",
    ``,
    `Please add the missing property to the correct class or interface to resolve the error. Return only the modified code.`,
  ].join("\n");

  // Build a minimal EnhancedTransformationRequest
  const request = {
    prompt,
    examples: [] as { before: string; after: string; explanation: string }[],
    targetFiles: [filePath],
    transformationType: "llm" as const,
    maxComplexity: 15,
    dryRun: false,
    allowUnsafe: false,
    context: {
      priority: "normal",
      patterns: [],
      projectType: "typescript",
      dependencies: [],
      language: "typescript",
      framework: "",
      complexity: 1,
      codeLength: code.length,
      issues: [],
      testCoverage: 0,
    },
    metadata: {},
    incrementalMode: false,
    rollbackOnFailure: true,
    constraints: {
      maxExecutionTime: 60000,
      maxMemoryUsage: 1024,
      maxTokens: 2048,
      costLimit: 1.0,
    },
  };

  // Use EnhancedLLMTransformer for provider-managed, Zod-validated LLM fix
  const transformer = new EnhancedLLMTransformer();
  const result = await transformer.transformFiles({
    files: [filePath],
    request,
  });

  console.log("LLM Transformer result:", JSON.stringify(result, null, 2));
  if (result.filesModified && result.filesModified.length > 0) {
    console.log("File updated with LLM fix:", filePath);
  } else if (result.errors && result.errors.length > 0) {
    console.error("LLM fix failed:", result.errors.join("; "));
    process.exit(1);
  } else if (result.warnings && result.warnings.length > 0) {
    console.warn("LLM fix warnings:", result.warnings.join("; "));
    process.exit(1);
  } else {
    console.error("LLM fix did not modify the file.");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}