// covers: subcommand:no-silent-drop:check
// size: medium
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { NSD003_CATALOG } from "../no-silent-drop/ast-scan.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// A {name, file} catalog silently disables an entry when the path is wrong or the
// implementation is renamed, so bind both halves to the real repository here. The
// declaration match runs over the TypeScript AST because a substring grep also hits
// call sites, comments and imports.
function declaresFunction(source: string, file: string, name: string): boolean {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body !== undefined && node.name?.text === name) found = true;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe("NSD003 catalog integrity", () => {
  test("catalog is non-empty and free of duplicate entries", () => {
    expect(NSD003_CATALOG.length).toBeGreaterThan(0);
    const keys = NSD003_CATALOG.map((entry) => `${entry.file}\0${entry.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(NSD003_CATALOG.map((entry) => entry.name)).size).toBe(NSD003_CATALOG.length);
  });

  test("every catalog entry binds to a real declaration in the real repository", () => {
    for (const entry of NSD003_CATALOG) {
      const absolute = join(REPO_ROOT, entry.file);
      expect(existsSync(absolute)).toBe(true);
      const source = readFileSync(absolute, "utf8");
      expect(declaresFunction(source, entry.file, entry.name)).toBe(true);
    }
  });

  test("the AST declaration predicate rejects call sites and comments", () => {
    const decoy = "// setCheckbox\nimport { setCheckbox } from './x.ts';\nconst run = () => setCheckbox(1);\n";
    expect(decoy.includes("setCheckbox")).toBe(true);
    expect(declaresFunction(decoy, "decoy.ts", "setCheckbox")).toBe(false);
    expect(declaresFunction("function setCheckbox() { return 1; }", "decoy.ts", "setCheckbox")).toBe(true);
  });
});
