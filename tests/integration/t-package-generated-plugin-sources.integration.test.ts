// covers: file:scripts/package.ts
// size: medium
//
// The generated-plugin-source drift check (checkGeneratedPluginSources) is what
// keeps the plugin-tree copy of a core module byte-identical to its canonical
// source: a hand edit on either side must turn dist:check red instead of
// silently forking the two copies. Its happy path is exercised by the real
// repo tree on every dist:check, but the two drift verdicts it exists to
// produce — MISSING and DIFFERS — are only reachable from a broken tree.
//
// Driven through the `root` seam against a throwaway temp workspace, in-process
// so bun --coverage measures the branches (a `bun scripts/package.ts` spawn
// would not be instrumented). The real repo tree is never touched.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkGeneratedPluginSources, writeGeneratedPluginSources } from "../../scripts/package.ts";

const CANONICAL = "packages/framework/core/tools/amadeus-formal-verif-model-map.ts";
const GENERATED = "plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";

describe("generated plugin source drift check", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  const workspace = (): string => {
    const root = mkdtempSync(join(tmpdir(), "pkg-generated-plugin-"));
    roots.push(root);
    const canonical = join(root, ...CANONICAL.split("/"));
    mkdirSync(dirname(canonical), { recursive: true });
    writeFileSync(canonical, "export const MAP = 1;\n");
    return root;
  };

  const generatedPath = (root: string): string => join(root, ...GENERATED.split("/"));

  test("reports MISSING when the generated copy has never been written", () => {
    const problems = checkGeneratedPluginSources(workspace());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("MISSING generated plugin source:");
    expect(problems[0]).toContain(GENERATED);
    expect(problems[0]).toContain(CANONICAL);
  });

  test("reports DIFFERS when the two copies have forked", () => {
    const root = workspace();
    const generated = generatedPath(root);
    mkdirSync(dirname(generated), { recursive: true });
    writeFileSync(generated, "export const MAP = 2;\n");

    const problems = checkGeneratedPluginSources(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("DIFFERS:");
    expect(problems[0]).toContain(GENERATED);
  });

  test("reports no problem once the writer has produced a byte-identical copy", () => {
    const root = workspace();
    writeGeneratedPluginSources(root);
    expect(checkGeneratedPluginSources(root)).toEqual([]);
  });
});
