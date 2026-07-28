import ts from "typescript";

export type ImportedBinding = {
  module: string;
  name: string;
};

export type ImportedCallQuery = {
  module: string;
  exportNames: ReadonlySet<string>;
};

const IMPORTED_CALL_SCAN_FILE = "/imported-call-query.ts";
const IMPORTED_CALL_CACHE = new Map<
  string,
  ReadonlyMap<string, ReadonlySet<string>>
>();

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

export function importedBindingOf(
  identifier: ts.Identifier,
  checker: ts.TypeChecker,
): ImportedBinding | null {
  const symbol = checker.getSymbolAtLocation(identifier);
  const declaration = symbol?.declarations?.find(ts.isImportSpecifier);
  if (!declaration) return null;
  const importDeclaration = declaration.parent.parent.parent;
  if (
    !ts.isImportDeclaration(importDeclaration) ||
    !ts.isStringLiteral(importDeclaration.moduleSpecifier)
  ) {
    return null;
  }
  return {
    module: importDeclaration.moduleSpecifier.text,
    name: declaration.propertyName?.text ?? declaration.name.text,
  };
}

export function visitNodes(
  root: ts.Node,
  visit: (node: ts.Node) => void,
): void {
  const pending = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node) continue;
    visit(node);
    node.forEachChild((child) => {
      pending.push(child);
    });
  }
}

export function sourceWithTypeChecker(
  src: string,
  fileName: string,
): {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
} {
  const sourceFile = ts.createSourceFile(
    fileName,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const host: ts.CompilerHost = {
    fileExists: (candidate) => candidate === fileName,
    getCanonicalFileName: (candidate) => candidate,
    getCurrentDirectory: () => "/",
    getDefaultLibFileName: () => "",
    getNewLine: () => "\n",
    getSourceFile: (candidate) =>
      candidate === fileName ? sourceFile : undefined,
    readFile: (candidate) => candidate === fileName ? src : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };
  const program = ts.createProgram([fileName], options, host);
  return { sourceFile, checker: program.getTypeChecker() };
}

function importedCallsByModule(
  src: string,
): ReadonlyMap<string, ReadonlySet<string>> {
  const cached = IMPORTED_CALL_CACHE.get(src);
  if (cached) return cached;

  const { sourceFile, checker } = sourceWithTypeChecker(
    src,
    IMPORTED_CALL_SCAN_FILE,
  );
  const calls = new Map<string, Set<string>>();
  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const callee = unwrapExpression(node.expression);
    if (!ts.isIdentifier(callee)) return;
    const imported = importedBindingOf(callee, checker);
    if (!imported) return;
    const names = calls.get(imported.module) ?? new Set<string>();
    names.add(imported.name);
    calls.set(imported.module, names);
  });
  IMPORTED_CALL_CACHE.set(src, calls);
  return calls;
}

/** Checks for a call bound to one of the named exports from an exact module.
 * All imported calls in a source string are indexed together, so independent
 * surface queries share one TypeScript program and one AST walk. */
export function hasImportedCall(
  src: string,
  query: ImportedCallQuery,
): boolean {
  if (!src.includes(query.module)) return false;
  const called = importedCallsByModule(src).get(query.module);
  if (!called) return false;
  for (const name of query.exportNames) {
    if (called.has(name)) return true;
  }
  return false;
}
