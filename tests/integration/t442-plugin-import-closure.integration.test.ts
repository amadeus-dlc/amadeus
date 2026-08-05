// covers: file:scripts/plugin-projection.ts, file:scripts/import-closure-guard.ts
// size: medium
//
// U6 import-closure-guard (C8) — the production wiring. assertPluginImportClosure
// is the projection's fail-closed gate: it parses each plugin's manifest, walks
// the transitive relative-import closure from the declared tool entrypoints
// through the real filesystem, and throws (write-0) listing EVERY module the
// manifest fails to declare.
//
// The first fixture reproduces the defect this unit exists to close (a module
// on disk, reachable from a declared tool, absent from plugin.json) so the guard
// is pinned by a failing case, not only by a passing one. The last test sweeps
// the repo's own plugins: a new guard must go red on the injected defect AND
// stay green on the real corpus.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { guardPluginClosureForCli } from "../../scripts/package.ts";
import { assertPluginImportClosure, PluginValidationError } from "../../scripts/plugin-projection.ts";

const workspaces: string[] = [];

// Build a throwaway repo root containing plugins/<name>/ with the given files,
// and return the plugins root the guard scans.
function fixtureRoot(name: string, files: Record<string, string>): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "amadeus-t442-"));
  workspaces.push(repoRoot);
  const pluginRoot = join(repoRoot, "plugins", name);
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(pluginRoot, ...rel.split("/"));
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, body);
  }
  return join(repoRoot, "plugins");
}

const STAGE = "# stage\n\n## a\n\n## b\n";

function manifest(name: string, tools: readonly string[]): string {
  return `${JSON.stringify({ name, stages: [{ slug: name, path: "stages/s.md" }], seams: [], fragments: [], tools }, null, 2)}\n`;
}

afterAll(() => {
  for (const ws of workspaces) rmSync(ws, { recursive: true, force: true });
});

describe("t442 assertPluginImportClosure (projection gate)", () => {
  test("passes when the manifest declares the whole closure", () => {
    const root = fixtureRoot("zz-t442-ok", {
      "plugin.json": manifest("zz-t442-ok", ["tools/entry.ts", "tools/dep.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import { dep } from "./dep.ts";\nexport const e = dep;\n',
      "tools/dep.ts": "export const dep = 1;\n",
    });
    expect(() => assertPluginImportClosure(root)).not.toThrow();
  });

  test("throws listing a reachable module the manifest omits (the #2161 defect)", () => {
    const root = fixtureRoot("zz-t442-missing", {
      "plugin.json": manifest("zz-t442-missing", ["tools/entry.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import { dep } from "./dep.ts";\nexport const e = dep;\n',
      "tools/dep.ts": "export const dep = 1;\n",
    });
    let caught: unknown;
    try {
      assertPluginImportClosure(root);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PluginValidationError);
    const problems = (caught as PluginValidationError).problems;
    expect(problems).toEqual([
      "MISSING from zz-t442-missing plugin.json: plugins/zz-t442-missing/tools/dep.ts",
    ]);
  });

  test("enumerates every omitted module in one failure, not just the first", () => {
    const root = fixtureRoot("zz-t442-many", {
      "plugin.json": manifest("zz-t442-many", ["tools/entry.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import "./one.ts";\nimport "./two.ts";\n',
      "tools/one.ts": 'import "./three.ts";\n',
      "tools/two.ts": "export const two = 2;\n",
      "tools/three.ts": "export const three = 3;\n",
    });
    let problems: readonly string[] = [];
    try {
      assertPluginImportClosure(root);
    } catch (err) {
      problems = (err as PluginValidationError).problems;
    }
    expect(problems).toEqual([
      "MISSING from zz-t442-many plugin.json: plugins/zz-t442-many/tools/one.ts",
      "MISSING from zz-t442-many plugin.json: plugins/zz-t442-many/tools/three.ts",
      "MISSING from zz-t442-many plugin.json: plugins/zz-t442-many/tools/two.ts",
    ]);
  });

  test("throws when a declared entrypoint imports a file that does not exist", () => {
    const root = fixtureRoot("zz-t442-dangling", {
      "plugin.json": manifest("zz-t442-dangling", ["tools/entry.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import "./absent.ts";\n',
    });
    let problems: readonly string[] = [];
    try {
      assertPluginImportClosure(root);
    } catch (err) {
      problems = (err as PluginValidationError).problems;
    }
    expect(problems).toEqual([
      "UNREADABLE import in zz-t442-dangling: plugins/zz-t442-dangling/tools/absent.ts",
    ]);
  });

  test("is a no-op when there are no plugins (0-plugin baseline)", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "amadeus-t442-empty-"));
    workspaces.push(repoRoot);
    expect(() => assertPluginImportClosure(join(repoRoot, "plugins"))).not.toThrow();
  });

  test("the repo's own plugins satisfy the guard (corpus sweep)", () => {
    expect(() => assertPluginImportClosure()).not.toThrow();
  });
});

describe("t442 guardPluginClosureForCli (runCli exit-code contract)", () => {
  test("converts a PluginValidationError into exit code 1 on stderr", () => {
    const root = fixtureRoot("zz-t442-cli-red", {
      "plugin.json": manifest("zz-t442-cli-red", ["tools/entry.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import { dep } from "./undeclared.ts";\nexport const e = dep;\n',
      "tools/undeclared.ts": "export const dep = 1;\n",
    });
    const original = console.error;
    const lines: string[] = [];
    console.error = (message?: unknown) => {
      lines.push(String(message));
    };
    try {
      expect(guardPluginClosureForCli(root)).toBe(1);
    } finally {
      console.error = original;
    }
    expect(lines.join("\n")).toContain("zz-t442-cli-red");
  });

  test("returns 0 when the closure is fully declared", () => {
    const root = fixtureRoot("zz-t442-cli-green", {
      "plugin.json": manifest("zz-t442-cli-green", ["tools/entry.ts", "tools/dep.ts"]),
      "stages/s.md": STAGE,
      "tools/entry.ts": 'import { dep } from "./dep.ts";\nexport const e = dep;\n',
      "tools/dep.ts": "export const dep = 1;\n",
    });
    expect(guardPluginClosureForCli(root)).toBe(0);
  });
});
