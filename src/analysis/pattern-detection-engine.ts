// src/analysis/pattern-detection-engine.ts

import { z } from "zod";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import yaml from "yaml";

// --- PatternMatch Schema ---
export const PatternMatchSchema = z.object({
  filePath: z.string(),
  language: z.enum(["typescript", "python"]),
  patternId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  start: z.object({ line: z.number(), column: z.number() }),
  end: z.object({ line: z.number(), column: z.number() }),
  metadata: z.record(z.unknown()).optional(),
});
export type PatternMatch = z.infer<typeof PatternMatchSchema>;

// --- Engine Input Schema ---
export const PatternDetectionInputSchema = z.object({
  filePath: z.string(),
  language: z.enum(["typescript", "python"]),
  patterns: z.array(z.object({
    id: z.string(),
    query: z.string(),
    description: z.string().optional(),
  })),
});
export type PatternDetectionInput = z.infer<typeof PatternDetectionInputSchema>;

// --- Engine Output Schema ---
export const PatternDetectionResultSchema = z.object({
  matches: z.array(PatternMatchSchema),
});
export type PatternDetectionResult = z.infer<typeof PatternDetectionResultSchema>;

// --- Error Wrapper ---
export class PatternDetectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PatternDetectionError";
  }
}

// --- TypeScript Detection Implementation ---
async function detectPatternsInTypeScript(
  input: PatternDetectionInput
): Promise<PatternMatch[]> {
  try {
    // Dynamically import ast-grep/ts-morph only when needed
    const astGrepModule = await import("@ast-grep/napi");
    const AstGrep = astGrepModule.default;
    const { Project } = await import("ts-morph");

    const project = new Project();
    project.addSourceFileAtPath(input.filePath);
    const sourceFile = project.getSourceFile(input.filePath);
    if (!sourceFile) {
      throw new PatternDetectionError(
        "Source file not found",
        "TS_FILE_NOT_FOUND",
        { filePath: input.filePath }
      );
    }

    // Use ast-grep for pattern matching (type-safe, correct API)
    const fileContent = await readFile(input.filePath, "utf8");
    const matches: PatternMatch[] = [];

    // Use ast-grep functional API (no instantiation)
    const root = astGrepModule.parse(fileContent, "typescript");
const astGrep = astGrepModule.default ?? astGrepModule;

    // Import fs and os at the top of the function scope
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs/promises");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require("os");

    for (const pattern of input.patterns) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "astgrep-"));
      const patternRulePath = path.join(tmpDir, "rule.yaml");
      const sourcePath = path.join(tmpDir, "source.ts");
      const yamlContent = `rule:
  id: ${pattern.id}
  message: ${pattern.description ?? pattern.id}
  pattern: ${JSON.stringify(pattern.query)}
  severity: info
  language: TypeScript
`;
      await fs.writeFile(patternRulePath, yamlContent, "utf8");
      await fs.writeFile(sourcePath, fileContent, "utf8");

      await new Promise<void>((resolve, reject) => {
        astGrepModule.findInFiles(
          "typescript",
          {
            paths: [sourcePath],
            matcher: yaml.parse(yamlContent).rule
          },
          (err: Error | null, result: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            for (const match of result) {
              matches.push({
                filePath: input.filePath,
                language: "typescript",
                patternId: pattern.id,
                name: pattern.id,
                description: pattern.description,
                start: { line: match.range.start.line, column: match.range.start.column },
                end: { line: match.range.end.line, column: match.range.end.column },
                metadata: match.meta ?? {},
              });
            }
            resolve();
          }
        );
      });

      await fs.unlink(patternRulePath);
      await fs.unlink(sourcePath);
      await fs.rmdir(tmpDir);
    }

    return matches;
  } catch (err) {
    throw new PatternDetectionError(
      "TypeScript pattern detection failed",
      "TS_DETECTION_ERROR",
      { cause: err, filePath: input.filePath }
    );
  }
}

// --- Python Detection Implementation ---
async function detectPatternsInPython(
  input: PatternDetectionInput
): Promise<PatternMatch[]> {
  return new Promise((resolve, reject) => {
    try {
      const pythonScript = path.resolve(__dirname, "python_pattern_detector.py");
      const proc = spawn("python", [pythonScript], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (err) => {
        reject(
          new PatternDetectionError(
            "Failed to start Python subprocess",
            "PYTHON_SUBPROCESS_ERROR",
            { cause: err }
          )
        );
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(
            new PatternDetectionError(
              "Python subprocess failed",
              "PYTHON_SUBPROCESS_EXIT",
              { code, stderr }
            )
          );
          return;
        }
        try {
          const result = JSON.parse(stdout);
          const matches = PatternDetectionResultSchema.parse(result).matches;
          resolve(matches);
        } catch (err) {
          reject(
            new PatternDetectionError(
              "Failed to parse Python subprocess output",
              "PYTHON_OUTPUT_PARSE_ERROR",
              { stdout, stderr, cause: err }
            )
          );
        }
      });

      // Send input as JSON
      proc.stdin.write(JSON.stringify(input));
      proc.stdin.end();
    } catch (err) {
      reject(
        new PatternDetectionError(
          "Python pattern detection orchestration failed",
          "PYTHON_DETECTION_ERROR",
          { cause: err }
        )
      );
    }
  });
}

// --- Language-Agnostic Orchestration Interface ---
export const PatternDetectionEngineSchema = z.object({
  detectPatterns: z.function()
    .args(PatternDetectionInputSchema)
    .returns(z.promise(PatternDetectionResultSchema)),
});
export type PatternDetectionEngine = z.infer<typeof PatternDetectionEngineSchema>;

/**
 * PatternDetectionEngine implementation.
 * Dispatches to the correct backend based on language.
 */
export const PatternDetectionEngineImpl: PatternDetectionEngine = {
  async detectPatterns(input) {
    PatternDetectionInputSchema.parse(input);
    let matches: PatternMatch[];
    switch (input.language) {
      case "typescript":
        matches = await detectPatternsInTypeScript(input);
        break;
      case "python":
        matches = await detectPatternsInPython(input);
        break;
      default:
        throw new PatternDetectionError(
          "Unsupported language",
          "UNSUPPORTED_LANGUAGE",
          { language: input.language }
        );
    }
    return PatternDetectionResultSchema.parse({ matches });
  },
};