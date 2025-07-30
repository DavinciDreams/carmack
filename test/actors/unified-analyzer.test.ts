// UnifiedAnalyzer integration test

import { describe, it, expect } from "bun:test";
import { UnifiedAnalyzer, AnalyzerConfigSchema } from "../../src/actors/unified-analyzer";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const TEST_PROJECT_PATH = path.resolve(__dirname, "../../");

describe("UnifiedAnalyzer", () => {
  it("analyzes a TypeScript project and returns issues and stats", () => {
    const config = AnalyzerConfigSchema.parse({
      projectPath: TEST_PROJECT_PATH,
      reportFormat: "json",
      maxIssues: 10,
      checkNullability: false,
      checkComponents: false,
      enableFixes: false,
      excludePatterns: ["node_modules"]
    });

    const analyzer = new UnifiedAnalyzer(config);
    const result = analyzer.analyze();

    // Validate output shape
    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.stats).toBe("object");
    expect(typeof result.stats.filesAnalyzed).toBe("number");
    expect(typeof result.stats.issuesFound).toBe("number");
    expect(result.stats.filesAnalyzed).toBeGreaterThan(0);

    // Optionally, check that the JSON report was written
    expect(fs.existsSync("unified-analysis.json")).toBe(true);
  });
});