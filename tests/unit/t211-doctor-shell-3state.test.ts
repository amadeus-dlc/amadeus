// covers: subcommand:amadeus-utility:doctor
//
// Issue #844: doctor's workspace-shell-readiness probe (Check 5, utility.ts) was
// a TWO-state predicate — `existsSync(harnessEngineDir) && existsSync(memoryDir)`
// — so the KNOWN-NORMAL fresh-install state (harness engine dir present, default
// memory dir not yet seeded before the first intent birth) reported FAIL, and the
// fix text mis-directed the user to "copy the workspace shell from `dist/claude/`"
// — a retired world (the shell now lands via `bunx @amadeus-dlc/setup install`,
// and memory is seeded at first intent birth).
//
// The fix splits the probe into THREE states via the exported pure classifier
// `classifyWorkspaceShellState`, mirroring the hook-heartbeat fresh-install split
// in the same handler:
//   (a) harness dir missing           -> FAIL + executable installer-rerun fix
//   (b) harness present, memory absent -> advisory PASS (pending first workflow)
//   (c) both present                   -> PASS (canonical label, unchanged)
//
// Two layers of proof:
//   1. In-process unit tests drive `classifyWorkspaceShellState` directly (the
//      seam — handleDoctor itself is spawn-only, t83 header) so the new branches
//      are lcov-covered.
//   2. A CLI spawn test drives the REAL doctor from the DIST tree against a
//      state-(b) fixture and asserts the #844 closure: an advisory ✓ line with
//      the "pending first workflow" marker and NO "copy the workspace shell from
//      dist/" mis-direction. RED (pre-fix): a ✗ line with the dist-copy fix.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AMADEUS_SRC } from "../harness/fixtures.ts";
import { classifyWorkspaceShellState } from "../../packages/framework/core/tools/amadeus-utility.ts";

// ---------------------------------------------------------------------------
// Layer 1 — in-process seam: the pure 3-state classifier.
// ---------------------------------------------------------------------------
describe("t211 classifyWorkspaceShellState — 3-state workspace-shell readiness (#844)", () => {
  test("(a) harness dir missing -> FAIL with an executable installer-rerun fix", () => {
    const r = classifyWorkspaceShellState(false, false, ".claude");
    expect(r.pass).toBe(false);
    expect(r.label).toBe("workspace shell ready (.claude/ + amadeus/spaces/default/memory/)");
    expect(r.fix).toContain("bunx @amadeus-dlc/setup install");
    // The retired dist/-copy guidance must be gone.
    expect(r.fix ?? "").not.toContain("dist/");
  });

  test("(b) harness present, memory not seeded -> advisory PASS, pending-first-workflow marker", () => {
    const r = classifyWorkspaceShellState(true, false, ".claude");
    expect(r.pass).toBe(true);
    expect(r.label).toContain("workspace shell pending first workflow");
    expect(r.label).toContain("seeded at first intent birth");
    expect(r.fix).toBeUndefined();
  });

  test("(c) both present -> PASS with the canonical label", () => {
    const r = classifyWorkspaceShellState(true, true, ".claude");
    expect(r.pass).toBe(true);
    expect(r.label).toBe("workspace shell ready (.claude/ + amadeus/spaces/default/memory/)");
    expect(r.fix).toBeUndefined();
  });

  test("label honours the harness dir name (Kiro tree)", () => {
    const r = classifyWorkspaceShellState(true, true, ".kiro");
    expect(r.label).toBe("workspace shell ready (.kiro/ + amadeus/spaces/default/memory/)");
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — CLI spawn: the real doctor against a state-(b) fixture (#844 closure).
// Doctor is spawned from the DIST tree (dist/claude/.claude/tools) because it
// loads data/stage-graph.json, which only the packaged tree carries — mirrors
// t83/t210. mechanism = cli.
// ---------------------------------------------------------------------------
const BUN = process.execPath;
const UTIL = join(AMADEUS_SRC, "tools", "amadeus-utility.ts");

describe("t211 doctor CLI — state-(b) fresh install is advisory, not a FAIL (#844)", () => {
  test("harness present + memory absent yields an advisory ✓ with no dist-copy mis-direction", () => {
    // State (b): the harness engine dir is present; the default memory dir is NOT
    // yet seeded (the pre-birth fresh-install condition #844 mis-reported).
    const proj = mkdtempSync(join(tmpdir(), "amadeus-t211-"));
    try {
      mkdirSync(join(proj, ".claude"), { recursive: true });

      const res = spawnSync(BUN, [UTIL, "doctor", "--project-dir", proj], {
        encoding: "utf-8",
        env: { ...process.env },
      });
      const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;

      const shellLine =
        out.split("\n").find((l) => l.includes("workspace shell")) ?? "";
      // GREEN: advisory pass line with the pending-first-workflow marker.
      expect(shellLine).toContain("✓");
      expect(shellLine).toContain("workspace shell pending first workflow");
      // The retired mis-direction must be absent everywhere in the report.
      expect(out).not.toContain("copy the workspace shell from");
      // And the old ✗ FAIL line for this probe must be gone.
      expect(out).not.toContain("✗  workspace shell ready");
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  }, 30000);
});
