import ts from "typescript";

export type ImportedBinding = {
  module: string;
  name: string;
};

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
