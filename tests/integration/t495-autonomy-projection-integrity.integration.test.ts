// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts(readAutonomyMode), file:packages/framework/core/tools/amadeus-state.ts(handleSet), subcommand:amadeus-state:set
// size: medium
//
// t495 — Issue #2483. Two integrity holes around the autonomy state projection,
// found by the cross-review's audit forensics on
// `260805-semi-redefine-autonomy-f` (Intent Autonomy Mode: full alongside
// Construction Autonomy Mode: gated):
//
//   1. readAutonomyMode maps full x non-autonomous to null — swarm scheduling
//      simply never activates. Fail-closed, but SILENT: the operator sees a
//      record that declares full autonomy and a swarm that never starts, with
//      nothing anywhere saying why. RFC-0001 FR-6 (#3116) closed this by making
//      the divergence a refusal in EVERY mode instead of a stderr line in one:
//      the block below now pins the throw, and the stderr-advisory form it
//      replaced is gone.
//
//   2. `amadeus-state set` writes ANY existing field with no audit row. The
//      three fields the autonomy transaction owns (Intent Autonomy Mode,
//      Intent Grant, Construction Autonomy Mode) are written canonically by
//      writeAutonomyStateProjection — a generic `set` of one of them is an
//      out-of-band write of a projection, and the forensic gap in the incident
//      was exactly the 22 seconds in which such a write left no trace. The
//      write is NOT forbidden here (the park-under-full path has no ruling
//      yet); it is made observable.
//
// MECHANISM. Both surfaces are driven IN-PROCESS from the shipped dist copy
// (the runner normalises the dist SF: path back to packages/framework/core/...
// in lcov — coverage-source-path.ts), following t224/t256's established idiom.
// readAutonomyMode is a pure string reader, so its refusal is observed by
// catching; handleSet's audit row is read back off the record's own shard.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readAutonomyMode } from "../../dist/claude/.claude/tools/amadeus-orchestrate.ts";
import { handleSet } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  parseAuditRecords,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

// --- 1. readAutonomyMode: the full x non-autonomous degrade is loud ---------

// Captures console.error for the duration of `fn` — readAutonomyMode is a pure
// reader, so the advisory is its only observable side effect. stdout is captured
// too: the directive contract (stdout-directive-stderr-advisory) means the
// warning must NEVER reach stdout.
function captureStreams<T>(fn: () => T): { value: T; stderr: string; stdout: string } {
  let stderr = "";
  let stdout = "";
  const origErr = console.error;
  const origLog = console.log;
  console.error = (...a: unknown[]) => {
    stderr += `${a.map(String).join(" ")}\n`;
  };
  console.log = (...a: unknown[]) => {
    stdout += `${a.map(String).join(" ")}\n`;
  };
  try {
    return { value: fn(), stderr, stdout };
  } finally {
    console.error = origErr;
    console.log = origLog;
  }
}

function stateWith(intentMode: string, scheduling: string): string {
  return [
    "## Current Status",
    "",
    `- **Intent Autonomy Mode**: ${intentMode}`,
    "- **Intent Grant**: none",
    `- **Construction Autonomy Mode**: ${scheduling}`,
    "",
  ].join("\n");
}

describe("t495 readAutonomyMode refuses a record that disagrees with itself (#2483, RFC-0001 FR-6)", () => {
  test("full x gated throws and names both halves of the disagreement", () => {
    const r = captureStreams(() => {
      expect(() => readAutonomyMode(stateWith("full", "gated"))).toThrow(/AUTONOMY_PROJECTION_DIVERGENCE/);
    });
    // The refusal travels as an exception, not as a stream write: nothing may
    // reach stdout (the directive contract) and nothing is merely advised.
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
  });

  test("full x unset throws and names the missing projection", () => {
    expect(() => readAutonomyMode("## Current Status\n\n- **Intent Autonomy Mode**: full\n"))
      .toThrow(/\(absent\)/);
  });

  test("full x autonomous is the healthy projection", () => {
    const r = captureStreams(() => readAutonomyMode(stateWith("full", "autonomous")));
    expect(r.value).toBe("autonomous");
    expect(r.stderr).toBe("");
  });

  // The projection semi USED to get. Under FR-5 semi runs its Bolts, so the
  // pairing that was legitimate before the RFC is now the record disagreeing
  // with itself — and it says so instead of quietly capping the schedule.
  test("semi x gated throws; semi x autonomous schedules", () => {
    expect(() => readAutonomyMode(stateWith("semi", "gated"))).toThrow(/AUTONOMY_PROJECTION_DIVERGENCE/);
    expect(readAutonomyMode(stateWith("semi", "autonomous"))).toBe("autonomous");
  });

  test("the template's initialization pair (none x unset) is the one exemption", () => {
    const r = captureStreams(() => readAutonomyMode(stateWith("none", "unset")));
    expect(r.value).toBe("gated");
    expect(r.stderr).toBe("");
  });

  test("a record with no Intent Autonomy Mode row still fails closed to null", () => {
    const r = captureStreams(() =>
      readAutonomyMode("## Current Status\n\n- **Construction Autonomy Mode**: gated\n"),
    );
    expect(r.value).toBeNull();
    expect(r.stderr).toBe("");
  });
});

// --- 2. handleSet: a projection-owned field write is audited ---------------

function bornProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [
      join(proj, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      proj,
    ],
    { cwd: proj, encoding: "utf8", env: { ...process.env } },
  );
  expect(result.status ?? -1).toBe(0);
  process.env.CLAUDE_PROJECT_DIR = proj;
  return proj;
}

function intentsDir(proj: string): string {
  return join(proj, "amadeus", "spaces", "default", "intents");
}

function activeRecordName(proj: string): string {
  return readFileSync(join(intentsDir(proj), "active-intent"), "utf8").trim();
}

function recordDir(proj: string, record?: string): string {
  return join(intentsDir(proj), record ?? activeRecordName(proj));
}

function auditRows(proj: string, record?: string): ReturnType<typeof parseAuditRecords> {
  const dir = join(recordDir(proj, record), "audit");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl") || f.endsWith(".md"))
    .flatMap((f) => parseAuditRecords(readFileSync(join(dir, f), "utf8")));
}

function autonomyRows(proj: string, record?: string): ReturnType<typeof parseAuditRecords> {
  return auditRows(proj, record).filter((r) => r.event === "AUTONOMY_MODE_SET");
}

describe("t495 a generic `set` of a projection-owned field is auditable (#2483)", () => {
  test("setting Construction Autonomy Mode leaves an audit row naming the field and value", () => {
    projectDir = bornProject();
    const before = autonomyRows(projectDir).length;

    handleSet(["Construction Autonomy Mode=gated"]);

    const rows = autonomyRows(projectDir);
    expect(rows.length).toBe(before + 1);
    const row = rows[rows.length - 1];
    expect(row?.fields.Mode).toBe("gated");
    expect(row?.fields.Field).toBe("Construction Autonomy Mode");
  });

  test("setting Intent Autonomy Mode and Intent Grant audits one row per field", () => {
    projectDir = bornProject();
    const before = autonomyRows(projectDir).length;

    handleSet(["Intent Autonomy Mode=full", "Intent Grant=grant-abc"]);

    const rows = autonomyRows(projectDir).slice(before);
    expect(rows.map((r) => r.fields.Field).sort()).toEqual([
      "Intent Autonomy Mode",
      "Intent Grant",
    ]);
    expect(rows.map((r) => r.fields.Mode).sort()).toEqual(["full", "grant-abc"]);
  });

  // The in-process seam above evaluates the WHOLE module before calling
  // handleSet, so it cannot see a binding that the CLI's own dispatch reaches
  // inside its temporal dead zone — a projection-set const declared after the
  // `import.meta.main` block made every spawned `set` throw before writing while
  // the in-process tests stayed green. This case crosses the real process
  // boundary the operator uses.
  test("the spawned CLI writes the field AND the audit row", () => {
    projectDir = bornProject();
    const before = autonomyRows(projectDir).length;

    const r = spawnSync(
      BUN,
      [
        join(projectDir, ".claude", "tools", "amadeus-state.ts"),
        "set",
        "Construction Autonomy Mode=gated",
        "--project-dir",
        projectDir,
      ],
      { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
    );

    expect(r.status ?? -1).toBe(0);
    expect(r.stdout).toContain('"updated":true');
    expect(readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8")).toContain(
      "- **Construction Autonomy Mode**: gated",
    );
    expect(autonomyRows(projectDir).length).toBe(before + 1);
  });

  // The whole point of the row is attribution: it says WHICH record had its
  // projection written out of band. `set` honours --intent/--space (Issue
  // #1199) and pins the state write AND the lock to the selected record, so an
  // audit row that lands on the ACTIVE intent's shard instead records the write
  // against a record that never changed — and leaves the record that DID change
  // exactly as unaudited as before this fix.
  test("`set --intent <non-active>` audits the SELECTED record, not the active one", () => {
    projectDir = bornProject();
    const first = activeRecordName(projectDir);
    // A second birth takes the cursor, so `first` is now the non-active record.
    const second = spawnSync(
      BUN,
      [
        join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
        "intent-birth",
        "--scope",
        "feature",
        "--project-dir",
        projectDir,
      ],
      { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
    );
    expect(second.status ?? -1).toBe(0);
    const active = activeRecordName(projectDir);
    expect(active).not.toBe(first);

    const beforeSelected = autonomyRows(projectDir, first).length;
    const beforeActive = autonomyRows(projectDir, active).length;

    handleSet(["--intent", first, "Construction Autonomy Mode=gated"]);

    // The state write lands on the selected record...
    expect(readFileSync(join(recordDir(projectDir, first), "amadeus-state.md"), "utf8")).toContain(
      "- **Construction Autonomy Mode**: gated",
    );
    // ...and so does its audit row.
    expect(autonomyRows(projectDir, first).length).toBe(beforeSelected + 1);
    expect(autonomyRows(projectDir, active).length).toBe(beforeActive);
  });

  test("a field outside the projection set writes no autonomy audit row", () => {
    projectDir = bornProject();
    const before = autonomyRows(projectDir).length;

    handleSet(["Current Stage=market-research"]);

    expect(autonomyRows(projectDir).length).toBe(before);
    expect(readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8")).toContain(
      "- **Current Stage**: market-research",
    );
  });
});
