// covers: function:discoverScopeGridSurfaces
// covers: function:runCompileCheck
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  discoverScopeGridSurfaces,
  runCompileCheck,
} from "../../packages/framework/core/tools/amadeus-graph.ts";

const fixtures: string[] = [];

function writeFixture(root: string, path: string, content: string): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe("t418 graph compile surface integration", () => {
  test("discovers only existing root and dist dot-harness grids in stable order", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t418-grid-surfaces-"));
    fixtures.push(root);
    expect(discoverScopeGridSurfaces(root)).toEqual([]);

    writeFixture(root, ".codex/tools/data/scope-grid.json", "root codex\n");
    writeFixture(root, ".claude/tools/data/scope-grid.json", "root claude\n");
    mkdirSync(join(root, ".missing-grid"));
    writeFixture(root, "visible/tools/data/scope-grid.json", "ignored visible root\n");
    writeFileSync(join(root, ".not-a-directory"), "ignored root file\n");

    writeFixture(root, "dist/codex/.codex/tools/data/scope-grid.json", "dist codex\n");
    writeFixture(root, "dist/claude/.claude/tools/data/scope-grid.json", "dist claude\n");
    writeFileSync(join(root, "dist", "not-a-harness"), "ignored dist file\n");
    writeFixture(
      root,
      "dist/visible-harness/visible-face/tools/data/scope-grid.json",
      "ignored visible face\n",
    );
    mkdirSync(join(root, "dist", "missing-grid", ".missing-grid"), { recursive: true });
    mkdirSync(join(root, "dist", "file-face"), { recursive: true });
    writeFileSync(join(root, "dist", "file-face", ".not-a-directory"), "ignored face file\n");

    expect(discoverScopeGridSurfaces(root)).toEqual([
      { path: ".claude/tools/data/scope-grid.json", json: "root claude\n" },
      { path: ".codex/tools/data/scope-grid.json", json: "root codex\n" },
      { path: "dist/claude/.claude/tools/data/scope-grid.json", json: "dist claude\n" },
      { path: "dist/codex/.codex/tools/data/scope-grid.json", json: "dist codex\n" },
    ]);
  });

  test("runs the compile invariant check in-process for clean and mismatched surfaces", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t418-compile-check-"));
    fixtures.push(root);
    expect(() => runCompileCheck(root)).not.toThrow();

    writeFixture(root, ".claude/tools/data/scope-grid.json", "{}\n");
    expect(() => runCompileCheck(root)).toThrow("compile invariant check failed");
  });
});
