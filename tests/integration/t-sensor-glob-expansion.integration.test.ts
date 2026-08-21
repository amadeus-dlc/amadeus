// covers: function:matchesGlob
// size: medium
//
// Half the shipped sensor manifests express their `matches` filter with a brace
// alternation (`**/*.{ts,tsx}`, `**/{event-registry,amadeus-audit}.ts`). Two
// different engines read that filter: the dispatcher's own matcher decides
// whether a manual fire applies, and the PostToolUse hook uses Bun.Glob. A
// pattern the two read differently fires in one place and not the other — a
// sensor that silently stops applying to half its inputs — so every shipped
// brace manifest is asserted against BOTH engines on the same paths.
//
// The manifests are read from disk rather than transcribed: a pattern edited in
// a manifest is exactly the change this must re-check. Reading the shipped
// sensors dir is real filesystem work, so this lives in the integration layer
// (cid:code-generation:c2-doctor-seam) rather than widening a unit allowlist.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { matchesGlob } from "../../packages/framework/core/tools/amadeus-sensor.ts";
import { parseSensorManifest } from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";

const SENSORS_DIR = join(import.meta.dir, "..", "..", "packages", "framework", "core", "sensors");

function shippedMatches(): Array<[file: string, pattern: string]> {
  return readdirSync(SENSORS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const parsed = parseSensorManifest(readFileSync(join(SENSORS_DIR, name), "utf-8"));
      return [name, parsed.matches ?? ""] as [string, string];
    })
    .filter(([, pattern]) => pattern.length > 0);
}

describe("matchesGlob expands brace alternations the way Bun.Glob does", () => {
  // The control: the corpus really does contain brace patterns, so a green run
  // below cannot mean "there was nothing to check".
  test("the shipped manifests include brace alternations", () => {
    const braced = shippedMatches().filter(([, pattern]) => pattern.includes("{"));
    expect(braced.length).toBeGreaterThan(0);
  });

  test("each alternative of a top-level brace matches under both engines", () => {
    const cases: Array<[pattern: string, hits: string[], misses: string[]]> = [
      [
        "**/*.{ts,tsx}",
        ["packages/framework/core/tools/amadeus-sensor.ts", "app/ui/Button.tsx"],
        ["packages/framework/core/tools/amadeus-sensor.js", "docs/reference/09-testing.md"],
      ],
      [
        "**/{event-registry,amadeus-audit}.ts",
        ["packages/framework/core/otel/event-registry.ts", "packages/framework/core/tools/amadeus-audit.ts"],
        ["packages/framework/core/tools/amadeus-state.ts"],
      ],
    ];
    for (const [pattern, hits, misses] of cases) {
      // The pattern is one a manifest really ships, not an invention.
      expect(
        shippedMatches().some(([, shipped]) => shipped === pattern),
        `${pattern} must still be a shipped matches filter`,
      ).toBe(true);
      for (const path of hits) {
        expect({ pattern, path, engine: "dispatcher" })
          .toEqual({ pattern, path, engine: matchesGlob(pattern, path) ? "dispatcher" : "miss" });
        expect({ pattern, path, engine: "bun" })
          .toEqual({ pattern, path, engine: new Bun.Glob(pattern).match(path) ? "bun" : "miss" });
      }
      for (const path of misses) {
        expect(matchesGlob(pattern, path), `${pattern} must not match ${path}`).toBe(false);
        expect(new Bun.Glob(pattern).match(path), `${pattern} must not match ${path} (bun)`).toBe(false);
      }
    }
  });

  test("a pattern with no brace is used verbatim", () => {
    expect(matchesGlob("**/*-questions.md", "a/b/requirements-analysis-questions.md")).toBe(true);
    expect(matchesGlob("**/*-questions.md", "a/b/requirements.md")).toBe(false);
  });

  // matchesGlob splits ONE brace group: its pattern is
  // `^(.*)\{([^}]+)\}(.*)$`, and `[^}]+` cannot span a nested `{...}`. Every
  // shipped filter with a FLAT brace therefore agrees with Bun.Glob, and the one
  // filter with a NESTED brace does not. That divergence is characterized here,
  // named, rather than asserted away: the sweep fails if a new pattern joins the
  // divergent set AND if the known one is ever fixed, so neither can pass
  // unnoticed.
  const NESTED_BRACE_MANIFEST = "amadeus-self-scope-consistency.md";

  test("flat brace filters agree across both engines; the nested one is the known exception", () => {
    const probes = [
      "packages/framework/core/tools/amadeus-sensor.ts",
      "app/ui/Button.tsx",
      "packages/framework/core/otel/event-registry.ts",
      "amadeus/spaces/default/intents/260808-x/inception/requirements-analysis/requirements.md",
      "amadeus/spaces/default/intents/260808-x/inception/scope-definition/scope-document.md",
      "packages/framework/core/scopes/amadeus-self-fix.md",
      "packages/framework/core/tools/data/scope-grid.json",
      "docs/reference/09-testing.md",
    ];
    const divergent = new Set<string>();
    for (const [file, pattern] of shippedMatches()) {
      for (const path of probes) {
        if (matchesGlob(pattern, path) !== new Bun.Glob(pattern).match(path)) divergent.add(file);
      }
    }
    expect([...divergent].sort()).toEqual([NESTED_BRACE_MANIFEST]);
  });

  test("the known exception is nested braces, and the dispatcher is the side that misses", () => {
    const nested = shippedMatches().find(([file]) => file === NESTED_BRACE_MANIFEST)?.[1] ?? "";
    // The mechanism, pinned: an inner `{` inside the outer group.
    expect(nested).toContain("{scopes/{");
    const scopeFile = "packages/framework/core/scopes/amadeus-self-fix.md";
    expect(new Bun.Glob(nested).match(scopeFile)).toBe(true);
    expect(matchesGlob(nested, scopeFile)).toBe(false);
  });
});
