// scripts/generate-llm-missing-property-prompt.ts
import { Project } from "ts-morph";
import fs from "fs";
import path from "path";

/**
 * Generalized script to generate an LLM prompt for missing property errors.
 * Usage: bun run scripts/generate-llm-missing-property-prompt.ts "<error>" <file> <line>
 */
async function main() {
  const [error, file, lineStr] = process.argv.slice(2);
  if (!error || !file) {
    console.error("Usage: bun run scripts/generate-llm-missing-property-prompt.ts \"<error>\" <file> <line>");
    process.exit(1);
  }
  const line = lineStr ? parseInt(lineStr, 10) : undefined;

  // Read file and extract context (±10 lines around the error line)
  const filePath = path.resolve(file);
  const code = fs.readFileSync(filePath, "utf-8");
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
    `Please add the missing property to the correct class or interface to resolve the error.`,
  ].join("\n");

  // Output prompt for LLM
  console.log(prompt);
}

if (require.main === module) {
  main();
}