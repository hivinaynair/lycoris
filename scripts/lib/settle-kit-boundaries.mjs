import path from "node:path";
import ts from "typescript";

const allowed = {
  core: ["viem"],
  react: ["react", "@settle-kit/core"],
  agents: ["viem", "@settle-kit/core", "@x402/core", "@x402/fetch"],
};
const domNames = new Set([
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "HTMLElement",
  "Element",
  "Document",
  "Window",
  "requestAnimationFrame",
  "DOMParser",
]);
export function packageAllowed(name, specifier) {
  return allowed[name].some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`));
}

/** Parse syntax, including re-exports, import types, require and dynamic imports. */
export function checkSdkSource(name, filename, source, sourceRoot) {
  const errors = [];
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  function checkImport(node) {
    if (!node || !ts.isStringLiteralLike(node)) {
      errors.push("Computed imports cannot be checked; use a literal module specifier");
      return;
    }
    const specifier = node.text;
    if (specifier.startsWith(".")) {
      const relative = path.relative(sourceRoot, path.resolve(path.dirname(filename), specifier));
      if (relative.startsWith("..") || path.isAbsolute(relative))
        errors.push(`Import escapes package source: ${specifier}`);
    } else if (!packageAllowed(name, specifier)) errors.push(`Forbidden dependency: ${specifier}`);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
      checkImport(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
      checkImport(node.moduleReference.expression);
    if (ts.isImportTypeNode(node))
      checkImport(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    )
      checkImport(node.arguments[0]);
    if (name === "core" && ts.isIdentifier(node) && domNames.has(node.text))
      errors.push(`DOM dependency in headless core: ${node.text}`);
    if (
      name === "core" &&
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      domNames.has(node.argumentExpression.text)
    )
      errors.push(`DOM dependency in headless core: ${node.argumentExpression.text}`);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const ref of ast.libReferenceDirectives)
    if (ref.fileName.toLowerCase().startsWith("dom"))
      errors.push("DOM lib reference in headless core");
  return [...new Set(errors)];
}
