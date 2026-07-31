// The archived-guard AST corpus, shared by the two halves of t259 after the
// perf split (#1830 FR-1): the sink-reachability assertions stay in
// tests/integration/t259-guard-corpus.test.ts, the wall-clock/RSS measurement
// lives in tests/perf/t259-guard-corpus-perf.test.ts. Both need the same corpus
// definition and the same call-expression classifier, so it is defined once
// here rather than copied into each file.
import { join } from "node:path";
import ts from "typescript";

export const GUARD_CORPUS_TOOLS_DIR = join(
  import.meta.dir,
  "../../packages/framework/core/tools",
);

export const GUARD_CORPUS_FILES = [
  "amadeus-utility.ts",
  "amadeus-orchestrate.ts",
  "amadeus-state.ts",
  "amadeus-lib.ts",
] as const;

/** Every call expression's callee name, in source order. Throws on a call shape
 *  the corpus does not classify, so a new dynamic-dispatch form is loud rather
 *  than silently uncounted. */
export function callNames(source: string): string[] {
  const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) names.push(node.expression.text);
      else if (ts.isPropertyAccessExpression(node.expression)) {
        names.push(node.expression.name.text);
      } else if (
        ts.isParenthesizedExpression(node.expression)
        && (
          ts.isArrowFunction(node.expression.expression)
          || ts.isFunctionExpression(node.expression.expression)
        )
      ) {
        names.push("<static-iife>");
      } else if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
        names.push("super");
      } else {
        throw new Error("Unclassified dynamic call expression in guard corpus");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return names;
}
