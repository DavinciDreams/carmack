// Script to fix TS2339 "Property ... does not exist on type ..." errors using ts-morph
import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

// Usage: bun scripts/fix-missing-properties.ts <type-check-output.txt>
const outputFile = process.argv[2];
if (!outputFile || !fs.existsSync(outputFile)) {
  console.error("Usage: bun scripts/fix-missing-properties.ts <type-check-output.txt>");
  process.exit(1);
}

const output = fs.readFileSync(outputFile, "utf8");
const ts2339Regex = /error TS2339: Property '([^']+)' does not exist on type '([^']+)'.*\n\n?([^\n]+):(\d+):/g;

const project = new Project({
  tsConfigFilePath: path.resolve("tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});

let match;
const fixes: Array<{ file: string; line: number; property: string; typeName: string }> = [];
while ((match = ts2339Regex.exec(output)) !== null) {
  const property = match[1];
  const typeName = match[2];
  const fileLine = match[3];
  const line = parseInt(match[4], 10);
  const file = fileLine.split(":")[0];
  if (file.endsWith(".ts") && fs.existsSync(file)) {
    fixes.push({ file, line, property, typeName });
  }
}

for (const { file, line, property, typeName } of fixes) {
  const sourceFile = project.getSourceFile(file) || project.addSourceFileAtPath(file);
  // Find class or interface by name
  const classDecl = sourceFile.getClass(typeName);
  const ifaceDecl = sourceFile.getInterface(typeName);
  if (classDecl) {
    // Add property with type any and a TODO comment
    classDecl.addProperty({
      name: property,
      type: "any", // Could be improved by type inference
      initializer: "undefined",
      docs: [`TODO: Type inferred by autofix. Please specify correct type.`],
    });
    console.log(`Added property '${property}' to class '${typeName}' in ${file}`);
    sourceFile.saveSync();
  } else if (ifaceDecl) {
    ifaceDecl.addProperty({
      name: property,
      type: "any", // Could be improved by type inference
      docs: [`TODO: Type inferred by autofix. Please specify correct type.`],
    });
    console.log(`Added property '${property}' to interface '${typeName}' in ${file}`);
    sourceFile.saveSync();
  } else {
    // Could be a type alias or external type, skip for now
    console.warn(`Could not find class or interface '${typeName}' in ${file}`);
  }
}