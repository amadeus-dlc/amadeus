// covers: file:scripts
// size: small
//
// t200 — composed-scope preservation in scripts/promote-self.ts. Mechanism:
// none — pure imports of the script's exported helpers (its main flow is
// guarded by import.meta.main, so importing runs no build and no check);
// zero spawn, zero LLM, zero tokens.
//
// WHY THIS EXISTS: the adaptive composer APPENDS approved scopes to the
// runtime scope registry (`.claude/scopes/amadeus-<name>.md` + an entry in
// `.claude/tools/data/scope-grid.json`) — the sanctioned write path for
// composed scopes. Neither file ever exists in dist/ (graph compile
// regenerates only stock scopes), so the plain byte-parity promote misread
// them as drift: the .md as an ORPHAN that --apply then DELETED, and the
// grid as DIFFERS — discovered when the first dogfooded workflow (intent
// 260706-amadeus-grilling, composed scope grilling-integration) had its
// scope silently destroyed by the code-generation stage's promote:self run.
//
// WHAT IS UNDER TEST:
//   1. COMPOSED_SCOPE_RE matches exactly the runtime composed-scope shape
//      (any managed engine dir's scopes/amadeus-*.md) and nothing deeper.
//   2. scopeGridInSync tolerates EXTRA (composed) grid keys but still fails
//      on missing or drifted STOCK keys, and falls back to the byte compare
//      on unparseable content (never weaker than the plain check).
//   3. mergeScopeGrid returns dist bytes verbatim when no composed entry
//      exists (byte-stability of --apply), carries composed entries over
//      otherwise, and the merged output round-trips scopeGridInSync.

import { describe, expect, test } from "bun:test";
import {
  COMPOSED_SCOPE_RE,
  PACKAGE_HARNESSES,
  SCOPE_GRID_RE,
  mergeScopeGrid,
  packageFreshnessArgs,
  promoteSelfMain,
  runPackageFreshness,
  scopeGridInSync,
} from "../../scripts/promote-self.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const grid = (obj: Record<string, unknown>): Buffer =>
  Buffer.from(`${JSON.stringify(obj, null, 2)}\n`, "utf-8");

const STOCK = { bugfix: { stages: { "intent-capture": "SKIP" } } };
const WITH_COMPOSED = {
  ...STOCK,
  "grilling-integration": { stages: { "intent-capture": "EXECUTE" } },
};

describe("t200 promote-self composed-scope preservation", () => {
  test("COMPOSED_SCOPE_RE matches runtime composed-scope files in any engine dir", () => {
    expect(COMPOSED_SCOPE_RE.test(".claude/scopes/amadeus-grilling-integration.md")).toBe(true);
    expect(COMPOSED_SCOPE_RE.test(".codex/scopes/amadeus-my-scope.md")).toBe(true);
  });

  test("COMPOSED_SCOPE_RE does not match non-scope or nested paths", () => {
    expect(COMPOSED_SCOPE_RE.test(".claude/skills/amadeus-grilling/SKILL.md")).toBe(false);
    expect(COMPOSED_SCOPE_RE.test(".claude/scopes/nested/amadeus-x.md")).toBe(false);
    expect(COMPOSED_SCOPE_RE.test(".claude/scopes/readme.md")).toBe(false);
    expect(COMPOSED_SCOPE_RE.test("scopes/amadeus-x.md")).toBe(false);
  });

  test("SCOPE_GRID_RE matches the runtime grid path per engine dir only", () => {
    expect(SCOPE_GRID_RE.test(".claude/tools/data/scope-grid.json")).toBe(true);
    expect(SCOPE_GRID_RE.test(".codex/tools/data/scope-grid.json")).toBe(true);
    expect(SCOPE_GRID_RE.test(".claude/tools/data/stage-graph.json")).toBe(false);
    expect(SCOPE_GRID_RE.test("dist/claude/.claude/tools/data/scope-grid.json")).toBe(false);
  });

  test("scopeGridInSync tolerates extra composed keys", () => {
    expect(scopeGridInSync(grid(WITH_COMPOSED), grid(STOCK))).toBe(true);
  });

  test("scopeGridInSync still fails on a missing stock key", () => {
    expect(scopeGridInSync(grid({}), grid(STOCK))).toBe(false);
  });

  test("scopeGridInSync still fails on a drifted stock key", () => {
    const drifted = { bugfix: { stages: { "intent-capture": "EXECUTE" } } };
    expect(scopeGridInSync(grid(drifted), grid(STOCK))).toBe(false);
  });

  test("scopeGridInSync falls back to byte compare on unparseable content", () => {
    const junk = Buffer.from("not json\n", "utf-8");
    expect(scopeGridInSync(junk, grid(STOCK))).toBe(false);
    expect(scopeGridInSync(junk, Buffer.from("not json\n", "utf-8"))).toBe(true);
  });

  test("mergeScopeGrid is byte-identical to dist when no composed entry exists", () => {
    const want = grid(STOCK);
    expect(mergeScopeGrid(grid(STOCK), want).equals(want)).toBe(true);
    expect(mergeScopeGrid(null, want).equals(want)).toBe(true);
  });

  test("mergeScopeGrid carries composed entries over and round-trips the check", () => {
    const merged = mergeScopeGrid(grid(WITH_COMPOSED), grid(STOCK));
    const parsed = JSON.parse(merged.toString("utf-8")) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["bugfix", "grilling-integration"]);
    expect(scopeGridInSync(merged, grid(STOCK))).toBe(true);
  });

  test("mergeScopeGrid overwrites unparseable dst content with dist bytes", () => {
    const want = grid(STOCK);
    expect(mergeScopeGrid(Buffer.from("junk", "utf-8"), want).equals(want)).toBe(true);
  });
});

describe("t200 promote-self package freshness harness list", () => {
  test("PACKAGE_HARNESSES includes Cursor alongside Claude and Codex", () => {
    expect([...PACKAGE_HARNESSES]).toEqual(["claude", "codex", "cursor"]);
  });

  test("packageFreshnessArgs covers apply and check for every harness", () => {
    expect(packageFreshnessArgs("apply")).toEqual([
      ["scripts/package.ts", "claude"],
      ["scripts/package.ts", "codex"],
      ["scripts/package.ts", "cursor"],
    ]);
    expect(packageFreshnessArgs("check")).toEqual([
      ["scripts/package.ts", "claude", "--check"],
      ["scripts/package.ts", "codex", "--check"],
      ["scripts/package.ts", "cursor", "--check"],
    ]);
  });

  test("runPackageFreshness drives the runner for each harness argv", () => {
    const calls: string[][] = [];
    runPackageFreshness("apply", (_cmd, args) => {
      calls.push(args);
    });
    expect(calls).toEqual(packageFreshnessArgs("apply"));
  });

  test("promoteSelfMain without --no-build invokes the freshness seam", () => {
    const root = mkdtempSync(join(tmpdir(), "t200-freshness-"));
    const write = (rel: string, content: string): void => {
      const abs = join(root, rel);
      mkdirSync(join(abs, ".."), { recursive: true });
      writeFileSync(abs, content);
    };
    write("dist/claude/.claude/tools/a.txt", "alpha\n");
    write("dist/codex/.codex/b.txt", "beta\n");
    write("dist/codex/.agents/c.txt", "gamma\n");
    write("dist/cursor/.cursor/d.txt", "delta\n");
    write("dist/codex/AGENTS.md", "# AI-DLC on Codex CLI\n\ngenerated\n");
    write(".claude/CLAUDE.md", "# Claude onboarding\n");
    write("AGENTS.md", "# Project rules\n");

    const seen: string[] = [];
    expect(
      promoteSelfMain(["--apply"], root, (mode) => {
        seen.push(mode);
      }),
    ).toBe(0);
    expect(seen).toEqual(["apply"]);

    seen.length = 0;
    expect(
      promoteSelfMain([], root, (mode) => {
        seen.push(mode);
      }),
    ).toBe(0);
    expect(seen).toEqual(["check"]);
  });
});
