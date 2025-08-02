// scripts/trace-and-update-properties.ts
import { Project, SyntaxKind, PropertyDeclarationStructure, StructureKind } from "ts-morph";
import path from "path";

/**
 * Traces property usages in the codebase and updates class/interface definitions accordingly.
 * - Finds all property accesses (e.g., obj.prop) and traces to their class/interface.
 * - Adds missing properties to the correct class/interface.
 * - Designed for use in autofix pipelines.
 */
async function traceAndUpdateProperties(propertyNames: string[]) {
  const project = new Project({
    tsConfigFilePath: path.resolve("tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  // Scan all .ts files in the workspace, not just src/
  const sourceFiles = project.getSourceFiles("**/*.ts");
  const updated: Set<string> = new Set();

  for (const propName of propertyNames) {
    for (const sourceFile of sourceFiles) {
      // Find all property accesses in the file
      const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
        .filter(expr => expr.getName() === propName);

      for (const expr of propAccesses) {
        const exprType = expr.getExpression().getType();
        const symbol = exprType.getSymbol();

        let classOrInterface: any = undefined;

        // Try to find the class or interface declaration via type symbol
        if (symbol) {
          const decl = symbol.getDeclarations().find(d =>
            d.getKind() === SyntaxKind.ClassDeclaration ||
            d.getKind() === SyntaxKind.InterfaceDeclaration
          );
          if (decl) {
            classOrInterface = decl.asKind(SyntaxKind.ClassDeclaration) || decl.asKind(SyntaxKind.InterfaceDeclaration);
          }
        }

        // Fallback: for `this.prop`, walk up AST to find enclosing class
        if (!classOrInterface && expr.getExpression().getKind() === SyntaxKind.ThisKeyword) {
          classOrInterface = expr.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
        }

        // Fallback: for `obj.prop`, try to resolve parameter type
        if (!classOrInterface && expr.getExpression().getKind() === SyntaxKind.Identifier) {
          const identifier = expr.getExpression();
          // Use getSymbol() and getDeclarations() for identifier resolution
          const idSymbol = identifier.getSymbol && identifier.getSymbol();
          if (idSymbol) {
            const decl = idSymbol.getDeclarations().find(d =>
              d.getKind() === SyntaxKind.Parameter ||
              d.getKind() === SyntaxKind.VariableDeclaration
            );
            if (decl && decl.getType) {
              const typeSymbol = decl.getType().getSymbol();
              if (typeSymbol) {
                const typeDecl = typeSymbol.getDeclarations().find(d =>
                  d.getKind() === SyntaxKind.ClassDeclaration ||
                  d.getKind() === SyntaxKind.InterfaceDeclaration
                );
                if (typeDecl) {
                  classOrInterface = typeDecl.asKind(SyntaxKind.ClassDeclaration) || typeDecl.asKind(SyntaxKind.InterfaceDeclaration);
                }
              }
            }
          }
        }

        // Debug logging for tracing
        const filePath = sourceFile.getFilePath();
        const lineNumber = expr.getStartLineNumber ? expr.getStartLineNumber() : -1;

        // If all tracing fails, try to walk up the AST from the property access to find the nearest class declaration
        if (!classOrInterface) {
          const fallbackClass = expr.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
          if (fallbackClass) {
            classOrInterface = fallbackClass;
            console.log(`[FALLBACK] Using nearest class declaration '${classOrInterface.getName?.()}' for property '${propName}' in ${filePath}:${lineNumber}`);
          } else {
            console.log(`[TRACE] Could not resolve class/interface for property '${propName}' in ${filePath}:${lineNumber}`);
            continue;
          }
        } else {
          console.log(`[TRACE] Resolved property '${propName}' to class/interface '${classOrInterface.getName?.()}' in ${filePath}:${lineNumber}`);
        }
        if (classOrInterface.getProperty(propName)) {
          console.log(`[TRACE] Property '${propName}' already exists on '${classOrInterface.getName?.()}'`);
          continue;
        }

        // Add property to class or interface
        classOrInterface.addProperty({
          name: propName,
          type: "any", // Could be improved with type inference
          hasExclamationToken: true,
          scope: classOrInterface.getKind() === SyntaxKind.ClassDeclaration ? "private" : undefined,
        } as PropertyDeclarationStructure);

        updated.add(classOrInterface.getSourceFile().getFilePath());
      }
    }
  }

  if (updated.size > 0) {
    await project.save();
    console.log("Updated files:", Array.from(updated));
  } else {
    console.log("No updates needed.");
  }
}

// Example usage: node scripts/trace-and-update-properties.js clusterer similarityDetector
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun run scripts/trace-and-update-properties.ts <property1> <property2> ...");
    process.exit(1);
  }
  traceAndUpdateProperties(args).catch(err => {
    console.error("Error tracing/updating properties:", err);
    process.exit(1);
  });
}