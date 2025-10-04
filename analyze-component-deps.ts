import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

interface ComponentDependency {
  name: string;
  filePath: string;
  importPath: string;
  isDefault: boolean;
  isNamed: boolean;
  isDynamic: boolean;
}

interface ComponentGraph {
  component: string;
  filePath: string;
  dependencies: ComponentDependency[];
}

function analyzeComponentDependencies(filePath: string): ComponentGraph {
  const sourceCode = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  const dependencies: ComponentDependency[] = [];
  const projectRoot = path.dirname(path.dirname(filePath));

  function resolveImportPath(importPath: string): string {
    // Handle relative imports
    if (importPath.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filePath), importPath);
      // Try common extensions
      const extensions = [
        ".tsx",
        ".ts",
        ".jsx",
        ".js",
        "/index.tsx",
        "/index.ts",
        "/index.jsx",
        "/index.js",
      ];
      for (const ext of extensions) {
        const fullPath =
          resolved + (resolved.endsWith(ext.split("/")[0]) ? "" : ext);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      return resolved;
    }

    // Handle @/ alias (common in Next.js)
    if (importPath.startsWith("@/")) {
      const aliasPath = importPath.replace("@/", "src/");
      return resolveImportPath(path.join(projectRoot, aliasPath));
    }

    // Handle node_modules imports
    return importPath;
  }

  function visit(node: ts.Node) {
    // Handle regular imports
    if (ts.isImportDeclaration(node)) {
      const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
      const resolvedPath = resolveImportPath(importPath);

      // Skip node_modules and non-component imports
      if (
        importPath.includes("node_modules") ||
        importPath.startsWith("react") ||
        importPath.includes("utils") ||
        importPath.includes("types") ||
        importPath.includes("services") ||
        !importPath.includes("component")
      ) {
        if (!importPath.includes("component") && !importPath.includes("view")) {
          ts.forEachChild(node, visit);
          return;
        }
      }

      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          dependencies.push({
            name: node.importClause.name.text,
            filePath: resolvedPath,
            importPath: importPath,
            isDefault: true,
            isNamed: false,
            isDynamic: false,
          });
        }

        // Named imports
        if (
          node.importClause.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          node.importClause.namedBindings.elements.forEach((element) => {
            dependencies.push({
              name: element.name.text,
              filePath: resolvedPath,
              importPath: importPath,
              isDefault: false,
              isNamed: true,
              isDynamic: false,
            });
          });
        }
      }
    }

    // Handle dynamic imports
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        const importPath = arg.text;
        const resolvedPath = resolveImportPath(importPath);

        // Extract component name from dynamic import
        let componentName = "DynamicComponent";
        const parent = node.parent;
        if (
          ts.isVariableDeclaration(parent) &&
          parent.name &&
          ts.isIdentifier(parent.name)
        ) {
          componentName = parent.name.text;
        }

        dependencies.push({
          name: componentName,
          filePath: resolvedPath,
          importPath: importPath,
          isDefault: false,
          isNamed: false,
          isDynamic: true,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    component: path.basename(filePath),
    filePath: filePath,
    dependencies: dependencies,
  };
}

function generateMermaidGraph(graph: ComponentGraph): string {
  let mermaid = "graph TD\n";
  const componentName = path.basename(
    graph.filePath,
    path.extname(graph.filePath),
  );

  mermaid += `  ${componentName}["${componentName}"]\n`;

  graph.dependencies.forEach((dep, index) => {
    const depId = `dep${index}`;
    const depName = dep.isDynamic ? `${dep.name} (dynamic)` : dep.name;
    mermaid += `  ${depId}["${depName}"]\n`;
    mermaid += `  ${componentName} --> ${depId}\n`;
  });

  return mermaid;
}

function generateJSON(graph: ComponentGraph): string {
  return JSON.stringify(graph, null, 2);
}

// Main execution
const targetFile =
  "/Users/griever/Developer/PrincipleMD/code-city-landing/src/app/inter-repo-navigator/page.tsx";
const graph = analyzeComponentDependencies(targetFile);

console.log("Component Dependency Graph\n");
console.log("=".repeat(50));
console.log(`Analyzing: ${graph.component}`);
console.log(`Total dependencies: ${graph.dependencies.length}\n`);

console.log("Dependencies:");
graph.dependencies.forEach((dep) => {
  const type = dep.isDynamic ? "dynamic" : dep.isDefault ? "default" : "named";
  console.log(`  - ${dep.name} (${type}) from ${dep.importPath}`);
});

console.log("\n" + "=".repeat(50));
console.log("\nMermaid Graph:");
console.log(generateMermaidGraph(graph));

console.log("\n" + "=".repeat(50));
console.log("\nJSON Output:");
console.log(generateJSON(graph));

// Save outputs
fs.writeFileSync("component-deps-graph.mmd", generateMermaidGraph(graph));
fs.writeFileSync("component-deps.json", generateJSON(graph));
console.log(
  "\nOutputs saved to component-deps-graph.mmd and component-deps.json",
);
