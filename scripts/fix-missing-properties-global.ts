// Script to fix TS2339 errors by adding missing properties to the correct class/interface definition across the project
import { Project } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

// Usage: bun scripts/fix-missing-properties-global.ts <type-check-output.txt>
const outputFile = process.argv[2];
if (!outputFile || !fs.existsSync(outputFile)) {
  console.error("Usage: bun scripts/fix-missing-properties-global.ts <type-check-output.txt>");
  process.exit(1);
}

const output = fs.readFileSync(outputFile, "utf8");
const ts2339Regex = /error TS2339: Property '([^']+)' does not exist on type '([^']+)'.*\n\n?([^\n]+):(\d+):/g;

const project = new Project({
  tsConfigFilePath: path.resolve("tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});

let match;
const fixes: Array<{ property: string; typeName: string }> = [];
while ((match = ts2339Regex.exec(output)) !== null) {
  const property = match[1];
  const typeName = match[2];
  fixes.push({ property, typeName });
}

// Deduplicate fixes by property/typeName
const uniqueFixes = Array.from(
  new Map(fixes.map(f => [`${f.typeName}::${f.property}`, f])).values()
);

for (const { property, typeName } of uniqueFixes) {
  let found = false;
  for (const sourceFile of project.getSourceFiles()) {
    const classDecl = sourceFile.getClass(typeName);
    const ifaceDecl = sourceFile.getInterface(typeName);
    if (classDecl) {
      classDecl.addProperty({
        name: property,
        type: "any",
        initializer: "undefined",
        docs: [`TODO: Type inferred by autofix. Please specify correct type.`],
      });
      sourceFile.saveSync();
      console.log(`Added property '${property}' to class '${typeName}' in ${sourceFile.getFilePath()}`);
      found = true;
      break;
    } else if (ifaceDecl) {
      ifaceDecl.addProperty({
        name: property,
        type: "any",
        docs: [`TODO: Type inferred by autofix. Please specify correct type.`],
      });
      sourceFile.saveSync();
      console.log(`Added property '${property}' to interface '${typeName}' in ${sourceFile.getFilePath()}`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.warn(`Could not find class or interface '${typeName}' in project for property '${property}'`);
  }
}