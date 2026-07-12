// covers: subcommand:amadeus-utility:doctor
//
// Issue #882: doctor never cross-checked a record's `- **Status**:` against its
// "## Phase Progress" roll-up, so a record whose Status reached "Completed"
// while phases stayed Pending/Active (the phase-boundary Verified/Skipped flip
// never fired — the pre-#880 class) sailed through every health check
// silently. RED (pre-fix): doctor's report contains no "Phase Progress" line
// at all.
//
// Check 8 closes it: scan every space's every intent state, read Status and
// the canonical PHASE_PROGRESS_FIELD labels via getField (field lines only — a
// "Status: Completed" prose string never matches), and report ONE advisory ✓
// line naming each flagged <space>/<dirName> + its residual phases. Advisory
// (pass stays true): 13/13 real pre-#880 Completed records carry the residue,
// so a ✗ would flip doctor to exit 1 on every existing workspace.
//
// Two layers of proof (t211 style):
//   1. In-process unit tests drive the exported seams — phaseProgressResidual,
//      classifyPhaseProgressConsistency, checkPhaseProgressConsistency — so
//      every added branch is lcov-covered (handleDoctor is spawn-only, t83
//      header).
//   2. CLI spawns drive the REAL doctor from the DIST tree against fixture
//      workspaces and assert the #882 closure: the advisory ✓ line appears
//      with the flagged record + phases, and adding the contradictory record
//      does NOT change doctor's exit code (the FR-2 exit-neutrality contract).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AMADEUS_SRC } from "../harness/fixtures.ts";
import {
  checkPhaseProgressConsistency,
  classifyPhaseProgressConsistency,
  phaseProgressResidual,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

// The five canonical Phase Progress labels, written literally so the fixture
// mirrors a real amadeus-state.md instead of deriving itself from the same
// PHASE_PROGRESS_FIELD constant the code under test reads (a self-referential
// fixture could not catch corruption of that constant).
const ALL_VERIFIED: ReadonlyArray<readonly [string, string]> = [
  ["Initialization", "Verified"],
  ["Ideation", "Skipped"],
  ["Inception", "Verified"],
  ["Construction", "Verified"],
  ["Operation", "Skipped"],
];

function stateContent(
  status: string,
  overrides: Readonly<Record<string, string>>,
  bodyExtra = "",
): string {
  const lines = ALL_VERIFIED.map(
    ([phase, def]) => `- **${phase}**: ${overrides[phase] ?? def}`,
  ).join("\n");
  return `# AI-DLC State Tracking\n\n## Project Information\n- **Status**: ${status}\n${bodyExtra}\n## Phase Progress\n\n${lines}\n`;
}

function writeRecord(
  proj: string,
  space: string,
  dirName: string,
  content: string,
): string {
  const dir = join(proj, "amadeus", "spaces", space, "intents", dirName);
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, "amadeus-state.md");
  writeFileSync(statePath, content, "utf-8");
  return statePath;
}

// Probe whether this platform actually denies reading a chmod-0000 file
// (mirrors t76's readonlyDirsEnforced probe) — root and native Windows ignore
// the mode, so the unreadable-state sub-check is skipped there rather than
// asserting an unobservable denial.
function unreadableFilesEnforced(): boolean {
  if (process.platform === "win32") return false;
  const probe = mkdtempSync(join(tmpdir(), "amadeus-t221-probe-"));
  const f = join(probe, "probe");
  try {
    writeFileSync(f, "x", "utf-8");
    chmodSync(f, 0o000);
    try {
      readFileSync(f, "utf-8");
      return false;
    } catch {
      return true;
    }
  } finally {
    try {
      chmodSync(f, 0o644);
    } catch {
      /* best-effort */
    }
    rmSync(probe, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Layer 1a — phaseProgressResidual: the per-intent pure judgment.
// ---------------------------------------------------------------------------
describe("t221 phaseProgressResidual — per-intent residue judgment (#882)", () => {
  test("(i) Completed + Pending/Active phases -> exactly those phases, in order", () => {
    const r = phaseProgressResidual("Completed", [
      { phase: "Initialization", status: "Verified" },
      { phase: "Ideation", status: "Pending" },
      { phase: "Inception", status: "Verified" },
      { phase: "Construction", status: "Active" },
      { phase: "Operation", status: "Skipped" },
    ]);
    expect(r).toEqual(["Ideation", "Construction"]);
  });

  test("(ii) Completed + only Verified/Skipped -> no residue", () => {
    const r = phaseProgressResidual("Completed", [
      { phase: "Initialization", status: "Verified" },
      { phase: "Ideation", status: "Skipped" },
      { phase: "Operation", status: "Verified" },
    ]);
    expect(r).toEqual([]);
  });

  test("(iii) Running + Active -> no residue (an in-flight intent is normal)", () => {
    const r = phaseProgressResidual("Running", [
      { phase: "Construction", status: "Active" },
      { phase: "Operation", status: "Pending" },
    ]);
    expect(r).toEqual([]);
  });

  test("missing Status field (empty string) -> no residue", () => {
    expect(phaseProgressResidual("", [{ phase: "Ideation", status: "Pending" }])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Layer 1b — classifyPhaseProgressConsistency: the aggregate advisory verdict.
// ---------------------------------------------------------------------------
describe("t221 classifyPhaseProgressConsistency — aggregate advisory DoctorCheck (#882)", () => {
  test("no intents at all -> reconciled PASS line", () => {
    const r = classifyPhaseProgressConsistency([]);
    expect(r.pass).toBe(true);
    expect(r.label).toBe(
      "Phase Progress: all Completed intents reconciled (no Pending/Active residue)",
    );
  });

  test("all intents clean -> reconciled PASS line", () => {
    const r = classifyPhaseProgressConsistency([
      {
        record: "default/clean-11111111",
        status: "Completed",
        phases: [{ phase: "Inception", status: "Verified" }],
      },
      {
        record: "default/running-22222222",
        status: "Running",
        phases: [{ phase: "Construction", status: "Active" }],
      },
    ]);
    expect(r.pass).toBe(true);
    expect(r.label).toContain("all Completed intents reconciled");
  });

  test("flagged intents -> STILL pass:true, advisory label names record + residual phases", () => {
    const r = classifyPhaseProgressConsistency([
      {
        record: "default/legacy-11111111",
        status: "Completed",
        phases: [
          { phase: "Inception", status: "Pending" },
          { phase: "Construction", status: "Active" },
        ],
      },
      {
        record: "beta/other-22222222",
        status: "Completed",
        phases: [{ phase: "Ideation", status: "Pending" }],
      },
      {
        record: "default/clean-33333333",
        status: "Completed",
        phases: [{ phase: "Inception", status: "Verified" }],
      },
    ]);
    // Advisory contract (#882 "detection only"): the verdict NEVER fails.
    expect(r.pass).toBe(true);
    expect(r.fix).toBeUndefined();
    expect(r.label).toContain("2 Completed intent(s) with Pending/Active phases");
    expect(r.label).toContain("advisory — historical records predate #880");
    expect(r.label).toContain("default/legacy-11111111: Inception, Construction");
    expect(r.label).toContain("beta/other-22222222: Ideation");
    expect(r.label).not.toContain("clean-33333333");
  });
});

// ---------------------------------------------------------------------------
// Layer 1c — checkPhaseProgressConsistency: the I/O collector on a fixture
// workspace (every space, getField discipline, skip rules).
// ---------------------------------------------------------------------------
describe("t221 checkPhaseProgressConsistency — workspace collector (#882)", () => {
  test("empty workspace -> reconciled PASS", () => {
    const proj = mkdtempSync(join(tmpdir(), "amadeus-t221-empty-"));
    try {
      const r = checkPhaseProgressConsistency(proj);
      expect(r.pass).toBe(true);
      expect(r.label).toContain("all Completed intents reconciled");
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });

  test("mixed workspace: flags Completed+residue across spaces, skips FP and unreadable cases", () => {
    const proj = mkdtempSync(join(tmpdir(), "amadeus-t221-mixed-"));
    try {
      // Flagged: Completed with Pending+Active residue.
      writeRecord(
        proj,
        "default",
        "legacy-11111111",
        stateContent("Completed", { Inception: "Pending", Construction: "Active" }),
      );
      // FP (iii): Running with an Active phase — never a residue.
      writeRecord(
        proj,
        "default",
        "running-22222222",
        stateContent("Running", { Construction: "Active" }),
      );
      // (ii): Completed, all phases Verified/Skipped — consistent.
      writeRecord(proj, "default", "clean-33333333", stateContent("Completed", {}));
      // FP (iv): prose "Status: Completed" in the body, but the FIELD says
      // Running — getField must only match the `- **Status**:` line.
      writeRecord(
        proj,
        "default",
        "prose-44444444",
        stateContent("Running", { Construction: "Active" }, "Goal: reach Status: Completed soon.\n"),
      );
      // Cross-space: a residue in a NON-default space is still surfaced.
      writeRecord(
        proj,
        "beta",
        "other-55555555",
        stateContent("Completed", { Ideation: "Pending" }),
      );
      // dirName === null branch: a registry-only row with no on-disk record dir.
      writeFileSync(
        join(proj, "amadeus", "spaces", "default", "intents", "intents.json"),
        JSON.stringify([
          { uuid: "77777777-7777-7777-7777-777777777777", slug: "ghost", status: "Completed" },
        ]),
        "utf-8",
      );

      // Unreadable state file: skipped, never sinks the whole check. Only
      // asserted where chmod-0000 denial is actually enforced (t76 probe).
      const enforced = unreadableFilesEnforced();
      if (enforced) {
        const locked = writeRecord(
          proj,
          "default",
          "locked-66666666",
          stateContent("Completed", { Inception: "Pending" }),
        );
        chmodSync(locked, 0o000);
      }

      const r = checkPhaseProgressConsistency(proj);
      expect(r.pass).toBe(true);
      expect(r.label).toContain("2 Completed intent(s) with Pending/Active phases");
      expect(r.label).toContain("default/legacy-11111111: Inception, Construction");
      expect(r.label).toContain("beta/other-55555555: Ideation");
      expect(r.label).not.toContain("running-22222222");
      expect(r.label).not.toContain("clean-33333333");
      expect(r.label).not.toContain("prose-44444444");
      expect(r.label).not.toContain("ghost");
      if (enforced) {
        expect(r.label).not.toContain("locked-66666666");
      }
    } finally {
      // Restore perms so rmSync can clean the locked record on every platform.
      try {
        chmodSync(
          join(proj, "amadeus", "spaces", "default", "intents", "locked-66666666", "amadeus-state.md"),
          0o644,
        );
      } catch {
        /* best-effort — the record only exists on enforcing platforms */
      }
      rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — CLI spawn: the real doctor from the DIST tree (#882 closure).
// Doctor is spawned from the DIST tree because it loads data/stage-graph.json,
// which only the packaged tree carries — mirrors t83/t210/t211. mechanism = cli.
// ---------------------------------------------------------------------------
const BUN = process.execPath;
const UTIL = join(AMADEUS_SRC, "tools", "amadeus-utility.ts");

describe("t221 doctor CLI — Check 8 advisory line and exit-neutrality (#882)", () => {
  test("contradictory record yields an advisory ✓ line and does not change doctor's exit code", () => {
    const clean = mkdtempSync(join(tmpdir(), "amadeus-t221-cli-clean-"));
    const flagged = mkdtempSync(join(tmpdir(), "amadeus-t221-cli-flagged-"));
    try {
      for (const proj of [clean, flagged]) {
        mkdirSync(join(proj, ".claude"), { recursive: true });
        writeRecord(proj, "default", "clean-33333333", stateContent("Completed", {}));
      }
      // Only the flagged fixture carries the Status ⇄ Phase Progress
      // contradiction (#882's repro shape).
      writeRecord(
        flagged,
        "default",
        "legacy-11111111",
        stateContent("Completed", { Inception: "Pending", Construction: "Active" }),
      );

      const run = (proj: string) =>
        spawnSync(BUN, [UTIL, "doctor", "--project-dir", proj], {
          encoding: "utf-8",
          env: { ...process.env },
        });
      const resClean = run(clean);
      const resFlagged = run(flagged);
      const outClean = `${resClean.stdout ?? ""}${resClean.stderr ?? ""}`;
      const outFlagged = `${resFlagged.stdout ?? ""}${resFlagged.stderr ?? ""}`;

      // GREEN (fixed): the advisory ✓ line names the record dir + residual
      // phases. RED (pre-fix): no "Phase Progress" line exists in the report.
      const lineClean = outClean.split("\n").find((l) => l.includes("Phase Progress")) ?? "";
      const lineFlagged = outFlagged.split("\n").find((l) => l.includes("Phase Progress")) ?? "";
      expect(lineClean).toContain("✓");
      expect(lineClean).toContain("all Completed intents reconciled");
      expect(lineFlagged).toContain("✓");
      expect(lineFlagged).toContain("1 Completed intent(s) with Pending/Active phases");
      expect(lineFlagged).toContain("advisory — historical records predate #880");
      expect(lineFlagged).toContain("default/legacy-11111111: Inception, Construction");

      // FR-2 exit-neutrality: the contradiction adds NO failure — both runs
      // exit with the SAME status (the fixtures differ only by the flagged
      // record), and the flagged line is a ✓, never a ✗. Relative equality is
      // the honest form of the "exit stays 0" acceptance criterion here: on a
      // minimal fixture OTHER doctor checks legitimately fail (so the absolute
      // status is not 0), while Check 8 itself can never contribute a failure
      // — classifyPhaseProgressConsistency returns pass:true on every branch
      // (asserted structurally in Layer 1b above).
      expect(resFlagged.status).toBe(resClean.status);
      expect(outFlagged).not.toContain("✗  Phase Progress");
    } finally {
      rmSync(clean, { recursive: true, force: true });
      rmSync(flagged, { recursive: true, force: true });
    }
  }, 60000);
});
