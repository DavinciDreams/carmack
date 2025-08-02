// Remove unused function declarations from a TypeScript file using ts-morph
import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

// Usage: bun scripts/remove-unused-functions.ts <file>
const targetFile = process.argv[2];
if (!targetFile) {
  console.error("Usage: bun scripts/remove-unused-functions.ts <file>");
  process.exit(1);
}

const project = new Project({
  tsConfigFilePath: path.resolve("tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});
const sourceFile = project.getSourceFile(targetFile) || project.addSourceFileAtPath(targetFile);

let removed = 0;

sourceFile.getFunctions().forEach(fn => {
  const name = fn.getName();
  if (!name) return;
  // Check for references outside the declaration
  const refs = fn.findReferences();
  const usedElsewhere = refs.some(ref =>
    ref.getReferences().some(r =>
      r.getSourceFile().getFilePath() !== sourceFile.getFilePath() ||
      (r.getNode().getStart() !== fn.getNameNode()?.getStart())
    )
  );
  if (!usedElsewhere) {
    fn.remove();
    removed++;
    console.log(`Removed unused function: ${name}`);
  }
});

if (removed > 0) {
  sourceFile.saveSync();
  console.log(`Removed ${removed} unused function(s) from ${targetFile}`);
} else {
  console.log("No unused functions found.");
}