// src/utils/ast-grep-cli.ts
import { $ } from "bun";
import { z } from "zod";

/**
 * Zod schema for validating ast-grep JSON output.
 * Adjust as needed for your ast-grep output structure.
 */
export const AstGrepMatchSchema = z.object({
  rule: z.string(),
  path: z.string(),
  range: z.object({
    start: z.object({ line: z.number(), column: z.number() }),
    end: z.object({ line: z.number(), column: z.number() }),
  }),
  meta: z.record(z.unknown()).optional(),
  matched: z.string().optional(),
});
export const AstGrepResultSchema = z.array(AstGrepMatchSchema);

export type AstGrepMatch = z.infer<typeof AstGrepMatchSchema>;
export type AstGrepResult = z.infer<typeof AstGrepResultSchema>;

export class AstGrepCliError extends Error {
  constructor(
    message: string,
    public readonly code: string = "AST_GREP_CLI_ERROR",
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AstGrepCliError";
  }
}

/**
 * Runs ast-grep with the given arguments and parses JSON output.
 * Throws AstGrepCliError on failure.
 * @param args Arguments to pass to ast-grep (excluding --json)
 * @returns Parsed and validated ast-grep result
 */
export async function runAstGrep(args: string[]): Promise<AstGrepResult> {
  // Use 'run' for --pattern, otherwise fallback to 'scan'
  const usePattern = args.includes("--pattern") || args.some(arg => arg.startsWith("--pattern="));
  // Wrap pattern argument in single quotes for PowerShell compatibility
  const quotedArgs = usePattern
    ? args.map((arg, i) =>
        arg === "--pattern" && args[i + 1]
          ? [arg, `'${args[i + 1]}'`]
          : arg.startsWith("--pattern=")
          ? `--pattern='${arg.slice("--pattern=".length)}'`
          : arg
      ).flat()
    : args;
  const cliArgs = usePattern
    ? ["run", ...quotedArgs, "--json"]
    : ["scan", ...args, "--json"];
  let stdout: string;
  let stderr: string;
  let exitCode: number;

  try {
    const proc = $`ast-grep ${cliArgs}`;
    const result = await proc.text();
    stdout = result;
    stderr = ""; // Bun's $ does not separate stderr, so errors will throw
    exitCode = 0;
  } catch (err: any) {
    stdout = err.stdout ?? "";
    stderr = err.stderr ?? err.message ?? "Unknown error";
    exitCode = err.exitCode ?? 1;
    throw new AstGrepCliError(
      `ast-grep failed: ${stderr}`,
      "AST_GREP_CLI_ERROR",
      { args: cliArgs, stdout, stderr, exitCode }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (e) {
    throw new AstGrepCliError(
      "Failed to parse ast-grep JSON output",
      "AST_GREP_JSON_PARSE_ERROR",
      { stdout }
    );
  }

  try {
    return AstGrepResultSchema.parse(parsed);
  } catch (e) {
    throw new AstGrepCliError(
      "ast-grep output validation failed",
      "AST_GREP_SCHEMA_ERROR",
      { parsed, error: e }
    );
  }
}

export default runAstGrep;