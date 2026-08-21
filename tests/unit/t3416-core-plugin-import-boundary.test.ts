// covers: file:scripts/core-plugin-import-boundary.ts
// size: small
//
// t3416 — the framework→plugins import boundary (#3416).
//
// TypeScript cannot express "the shipped framework tree must not depend on any
// plugin", so the boundary is held by a predicate gate instead. This file drives
// the gate's PURE seams: the corpus predicate, the plugin-tree target predicate,
// and the scan itself through an injected file reader — the same code path the
// CLI takes over the real repository, never a hand-rolled regex probe.
//
// CONTROL LITERALS. A non-regression pass over a corpus that is already clean
// proves nothing about a predicate that was mis-written, so every direction is
// pinned in both polarities: the four module-reference forms must be caught, and
// the legitimate imports that live in the corpus today (core-internal relative
// imports, node builtins, third-party bare specifiers, the harness-local
// `plugins/` directory that belongs to OpenCode's own plugin API) must not be.

import { describe, expect, test } from "bun:test";
import {
  isFrameworkSourceFile,
  resolvesIntoPluginTree,
  scanFrameworkPluginImports,
} from "../../scripts/core-plugin-import-boundary.ts";

const CORE_FILE = "packages/framework/core/tools/amadeus-lib.ts";

function reader(files: Record<string, string>): (path: string) => string | null {
  return (path) => (Object.hasOwn(files, path) ? files[path] : null);
}

describe("t3416 corpus predicate (which files the boundary covers)", () => {
  test("covers core and harness TypeScript sources", () => {
    for (const path of [
      CORE_FILE,
      "packages/framework/core/hooks/amadeus-dispatch.ts",
      "packages/framework/harness/pi/manifest.ts",
      "packages/framework/harness/opencode/plugins/amadeus-opencode-plugin.ts",
    ]) {
      expect(isFrameworkSourceFile(path), path).toBe(true);
    }
  });

  test("excludes non-framework trees and non-TypeScript files", () => {
    // scripts/ is dev tooling that legitimately drives plugin projection, tests/
    // legitimately read plugin sources, packages/setup/ is the installer, and
    // plugins/ is the far side of the boundary. Prose carries no imports.
    for (const path of [
      "scripts/plugin-projection.ts",
      "tests/unit/t441-import-closure-manifest.test.ts",
      "packages/setup/src/install.ts",
      "plugins/github-pr-convergence/tools/pr-convergence-cli.ts",
      "packages/framework/core/amadeus-common/protocols/stage-protocol.md",
    ]) {
      expect(isFrameworkSourceFile(path), path).toBe(false);
    }
  });
});

describe("t3416 plugin-tree target predicate (every access form)", () => {
  test("catches a relative specifier that climbs out into plugins/", () => {
    expect(resolvesIntoPluginTree(CORE_FILE, "../../../../plugins/coverage-patch-quick/tools/cli.ts")).toBe(true);
  });

  test("catches a repo-root-relative specifier", () => {
    expect(resolvesIntoPluginTree(CORE_FILE, "plugins/coverage-patch-quick/tools/cli.ts")).toBe(true);
  });

  test("catches the projected harness plugin tree", () => {
    expect(resolvesIntoPluginTree(CORE_FILE, "../../../../.claude/plugins/formal-model-check/tools/cli.ts")).toBe(true);
    expect(resolvesIntoPluginTree(CORE_FILE, ".claude/plugins/formal-model-check/tools/cli.ts")).toBe(true);
  });

  test("catches an absolute specifier that names the plugin tree", () => {
    expect(resolvesIntoPluginTree(CORE_FILE, "/repo/plugins/formal-model-check/tools/cli.ts")).toBe(true);
  });

  // CONTROLS — the imports the corpus actually carries today must stay legal.
  test("accepts core-internal relative imports", () => {
    for (const specifier of ["./amadeus-state.ts", "../data/self-install-allowlist.ts", "./data/x.ts"]) {
      expect(resolvesIntoPluginTree(CORE_FILE, specifier), specifier).toBe(false);
    }
  });

  test("accepts node builtins and third-party bare specifiers", () => {
    // Kept free of `node:child_process` on purpose: the derived-test-size
    // classifier reads this file's own text, and that literal would inflate the
    // file to `medium` without a single spawn actually happening.
    for (const specifier of ["node:path", "node:url", "@opentelemetry/api", "typebox"]) {
      expect(resolvesIntoPluginTree(CORE_FILE, specifier), specifier).toBe(false);
    }
  });

  test("accepts the plugins→core direction", () => {
    expect(
      resolvesIntoPluginTree(
        "plugins/github-pr-convergence/tools/pr-convergence-cli.ts",
        "../../../packages/framework/core/tools/amadeus-lib.ts",
      ),
    ).toBe(false);
  });

  test("accepts OpenCode's harness-local plugins/ directory", () => {
    // packages/framework/harness/opencode/plugins/ is OpenCode's own plugin-API
    // folder inside the framework tree, not the AI-DLC plugin tree.
    expect(
      resolvesIntoPluginTree(
        "packages/framework/harness/opencode/manifest.ts",
        "./plugins/amadeus-opencode-plugin.ts",
      ),
    ).toBe(false);
  });
});

describe("t3416 scan (the code path the CLI runs)", () => {
  const clean = {
    [CORE_FILE]: [
      'import { join } from "node:path";',
      'import { readState } from "./amadeus-state.ts";',
      'export { SELF_INSTALL_ALLOWLIST } from "./data/self-install-allowlist.ts";',
      'const mod = await import("./amadeus-graph.ts");',
      '// the projection copies { src: "plugins/amadeus-opencode-plugin.ts" } verbatim',
    ].join("\n"),
  };

  test("a corpus with only legitimate references is clean", () => {
    const verdict = scanFrameworkPluginImports(Object.keys(clean), reader(clean));
    expect(verdict).toEqual({ kind: "clean", scanned: 1 });
  });

  test("each module-reference form is caught exactly once", () => {
    const forms: Record<string, string> = {
      static: 'import { x } from "../../../../plugins/p/tools/a.ts";',
      reexport: 'export { x } from "../../../../plugins/p/tools/a.ts";',
      dynamic: 'const m = await import("../../../../plugins/p/tools/a.ts");',
      require: 'const m = require("../../../../plugins/p/tools/a.ts");',
    };
    for (const [name, source] of Object.entries(forms)) {
      const files = { ...clean, [CORE_FILE]: `${clean[CORE_FILE]}\n${source}\n` };
      const verdict = scanFrameworkPluginImports(Object.keys(files), reader(files));
      expect(verdict.kind, name).toBe("violation");
      if (verdict.kind !== "violation") continue;
      expect(verdict.violations, name).toHaveLength(1);
      expect(verdict.violations[0]?.file, name).toBe(CORE_FILE);
      expect(verdict.violations[0]?.target, name).toBe("plugins/p/tools/a.ts");
      expect(verdict.violations[0]?.line, name).toBe(6);
    }
  });

  test("a plugin import outside the corpus is not scanned", () => {
    const files = {
      "scripts/plugin-projection.ts": 'import { x } from "../plugins/p/tools/a.ts";',
    };
    expect(scanFrameworkPluginImports(Object.keys(files), reader(files))).toEqual({
      kind: "clean",
      scanned: 0,
    });
  });

  test("an unreadable corpus file fails closed rather than shrinking the scan", () => {
    const verdict = scanFrameworkPluginImports([CORE_FILE], reader({}));
    expect(verdict).toEqual({
      kind: "violation",
      scanned: 1,
      violations: [],
      unreadable: [CORE_FILE],
    });
  });

  test("an empty corpus is a failure, never a vacuous pass", () => {
    // A broken enumerator that returns [] would otherwise report the boundary
    // as held while inspecting nothing.
    expect(scanFrameworkPluginImports([], reader({}))).toEqual({ kind: "empty-corpus" });
  });
});
