// covers: file:scripts/import-closure-guard.ts
// size: small
//
// U6 import-closure-guard (C8) — checkManifestClosure is the second half of the
// guard: it holds the resolved closure against what the plugin actually ships.
// A closure member must be BOTH declared in plugin.json (so composition copies
// it into the host) and present in the plugin's owned sources (so the
// declaration has a file behind it). Both differences are enumerated in full;
// there is no allowlist branch to test because the design has none.

import { describe, expect, test } from "bun:test";

import {
  checkManifestClosure,
  describeClosureFailure,
  type RepoPath,
} from "../../scripts/import-closure-guard.ts";
import type { PluginManifest } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

function manifestOf(toolPaths: readonly string[]): PluginManifest {
  return {
    name: "p",
    stages: [{ slug: "s", path: "plugins/p/stages/s.md", bytes: Buffer.alloc(0) }],
    seams: [],
    fragments: [],
    tools: toolPaths.map((path) => ({ path, bytes: Buffer.alloc(0) })),
  };
}

const OWNED: RepoPath[] = [
  "plugins/p/plugin.json",
  "plugins/p/stages/s.md",
  "plugins/p/tools/a.ts",
  "plugins/p/tools/b.ts",
];

describe("t441 checkManifestClosure (closure vs shipped surface)", () => {
  test("proves a closure that is fully declared and fully owned", () => {
    const got = checkManifestClosure(
      manifestOf(["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"]),
      ["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"],
      OWNED,
    );
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(got.value.kind).toBe("closure-proof");
    expect([...got.value.closure]).toEqual(["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"]);
  });

  test("enumerates a closure member that exists on disk but is absent from the manifest", () => {
    const got = checkManifestClosure(
      manifestOf(["plugins/p/tools/a.ts"]),
      ["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"],
      OWNED,
    );
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.missingFromManifest]).toEqual(["plugins/p/tools/b.ts"]);
    expect([...got.error.missingFromOwnedPaths]).toEqual([]);
  });

  test("enumerates every undeclared member, not just the first", () => {
    const got = checkManifestClosure(
      manifestOf([]),
      ["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"],
      OWNED,
    );
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.missingFromManifest]).toEqual([
      "plugins/p/tools/a.ts",
      "plugins/p/tools/b.ts",
    ]);
  });

  test("enumerates a closure member that leaves the plugin's owned sources", () => {
    const got = checkManifestClosure(
      manifestOf(["plugins/p/tools/a.ts"]),
      ["plugins/p/tools/a.ts", "packages/framework/core/tools/x.ts"],
      OWNED,
    );
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.missingFromManifest]).toEqual(["packages/framework/core/tools/x.ts"]);
    expect([...got.error.missingFromOwnedPaths]).toEqual(["packages/framework/core/tools/x.ts"]);
  });

  test("counts a declared stage as covering its own path", () => {
    const got = checkManifestClosure(manifestOf([]), ["plugins/p/stages/s.md"], OWNED);
    expect(got.ok).toBe(true);
  });

  test("leaves unreadable empty — this seam never reads a file", () => {
    const got = checkManifestClosure(manifestOf([]), ["plugins/p/tools/a.ts"], OWNED);
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual([]);
  });
});

describe("t441 describeClosureFailure (diagnostic rendering)", () => {
  test("renders one sorted line per offending reference across all three kinds", () => {
    const lines = describeClosureFailure("p", {
      kind: "closure-failure",
      unreadable: ["plugins/p/tools/gone.ts"],
      missingFromManifest: ["plugins/p/tools/b.ts"],
      missingFromOwnedPaths: ["packages/core/x.ts"],
    });
    expect([...lines]).toEqual([
      "MISSING from p owned sources: packages/core/x.ts",
      "MISSING from p plugin.json: plugins/p/tools/b.ts",
      "UNREADABLE import in p: plugins/p/tools/gone.ts",
    ]);
  });
});
