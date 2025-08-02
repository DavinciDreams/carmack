// scripts/manual-property-injector.ts
import { Project, SyntaxKind, PropertyDeclarationStructure } from "ts-morph";
import path from "path";

/**
 * Manually injects a property declaration into the nearest class for each property access.
 * This is a brute-force fix for cases where type resolution fails.
 */
async function manualInjectProperty(propertyName: string) {
  const project = new Project({
    tsConfigFilePath: path.resolve("tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project.getSourceFiles("**/*.ts");
  const updated: Set<string> = new Set();

  for (const sourceFile of sourceFiles) {
    const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
      .filter(expr => expr.getName() === propertyName);

    for (const expr of propAccesses) {
      const classDecl = expr.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
      if (!classDecl) continue;
      if (classDecl.getProperty(propertyName)) continue;

      // Insert property at the top of the class
      classDecl.insertProperty(0, {
        name: propertyName,
        type: "any",
        hasExclamationToken: true,
        scope: "public",
      } as PropertyDeclarationStructure);

      updated.add(classDecl.getSourceFile().getFilePath());
      console.log(`[MANUAL] Injected property '${propertyName}' into class '${classDecl.getName()}' in ${classDecl.getSourceFile().getFilePath()}`);
    }
  }

  if (updated.size > 0) {
    await project.save();
    console.log("Updated files:", Array.from(updated));
  } else {
    console.log("No updates needed.");
  }
}

// Example usage: bun run scripts/manual-property-injector.ts missingProp
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: bun run scripts/manual-property-injector.ts <property>");
    process.exit(1);
  }
  manualInjectProperty(args[0]).catch(err => {
    console.error("Error injecting property:", err);
    process.exit(1);
  });
}