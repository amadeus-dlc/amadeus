// covers: subcommand:amadeus-sensor:fire, audit:SENSOR_FIRED
//
// Behavioural (spawn) contract for the amadeus-sensor fire hardening (#792, #796).
// Complements the in-process seam file (tests/unit/t-sensor-fire-seam.test.ts):
// this one drives the REAL dispatcher via spawnSync and asserts on the audit
// rows + exit codes it leaves, exactly as t92 does. Two invariants:
//
//   FR-8 (#796) — `--project-dir <B>` wins over the CLAUDE_PROJECT_DIR env (A):
//                 the audit lands under B, not A. Omitting the flag falls back
//                 to the env (unchanged behaviour).
//   FR-7+FR-9 (#792) — a negative timeout_seconds budget is rejected at load,
//                 BEFORE any SENSOR_FIRED emit, so no orphan FIRED row is written
//                 (the pre-fix bug: FIRED emitted, then spawnSync throws a
//                 RangeError, leaving the FIRED row unpaired + exit 1). The
//                 orphan-FIRED invariant is stated as FIRED count === terminal
//                 count for every fire.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toPortablePath } from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS_DIR = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const SENSOR_TS = join(TOOLS_DIR, "amadeus-sensor.ts");
const STUBS_DIR = join(REPO_ROOT, "tests", "fixtures", "v05-mr9-sensor-fire", "scripts");

// Isolated dir holding the stub per-sensor script the fork manifests name, so a
// stub never touches the shipped dist/.../tools/ tree (see t92 for the rationale).
const STUB_SCRIPT_DIR = mkdtempSync(join(tmpdir(), "amadeus-fireharden-stubs-"));
const tempDirs: string[] = [STUB_SCRIPT_DIR];

beforeAll(() => {
  copyFileSync(
    join(STUBS_DIR, "amadeus-sensor-stub-pass.ts"),
    join(STUB_SCRIPT_DIR, "amadeus-sensor-stub-pass.ts"),
  );
});

afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

/** Fresh temp project with an amadeus-docs/ dir. */
function makeProj(): string {
  const proj = toPortablePath(mkdtempSync(join(tmpdir(), "amadeus-fireharden-proj-")));
  mkdirSync(join(proj, "amadeus-docs"), { recursive: true });
  tempDirs.push(proj);
  return proj;
}

/** Write a single fork sensor manifest into a fresh AMADEUS_SENSORS_DIR. */
function makeForkSensors(id: string, cmd: string, timeout = 5): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-fireharden-sensors-"));
  tempDirs.push(dir);
  const lines = [
    "---",
    `id: ${id}`,
    "kind: deterministic",
    `command: ${cmd}`,
    "default_severity: advisory",
    "description: fire-hardening fork manifest",
    `timeout_seconds: ${timeout}`,
    "---",
    "# stub",
    "",
  ];
  writeFileSync(join(dir, `amadeus-${id}.md`), lines.join("\n"), "utf-8");
  return dir;
}

interface SpawnResult {
  rc: number;
  out: string;
}

/** Spawn `amadeus-sensor.ts fire ...`, combining stdout+stderr. */
function fire(args: string[], env: Record<string, string>): SpawnResult {
  const res = spawnSync(BUN, [SENSOR_TS, "fire", ...args], {
    encoding: "utf-8",
    env: {
      ...process.env,
      AMADEUS_SENSOR_SCRIPT_DIR: STUB_SCRIPT_DIR,
      ...env,
    },
  });
  return { rc: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function auditEventCount(proj: string, ev: string): number {
  const re = new RegExp(`^\\*\\*Event\\*\\*: ${ev}$`);
  return readAllAuditShards(proj)
    .split("\n")
    .filter((l) => re.test(l)).length;
}

const TERMINAL_EVENTS = ["SENSOR_PASSED", "SENSOR_FAILED", "SENSOR_BUDGET_OVERRIDE"];
function terminalCount(proj: string): number {
  return TERMINAL_EVENTS.reduce((n, ev) => n + auditEventCount(proj, ev), 0);
}

describe("amadeus-sensor fire hardening — --project-dir routing (FR-8, #796)", () => {
  test("--project-dir B wins over CLAUDE_PROJECT_DIR A: audit lands under B, not A", () => {
    const envProj = makeProj(); // A — env only
    const flagProj = makeProj(); // B — the --project-dir target
    const outPath = join(flagProj, "amadeus-docs", "test.md");
    writeFileSync(outPath, "stub\n", "utf-8");
    const sensors = makeForkSensors(
      "required-sections",
      "bun .claude/tools/amadeus-sensor-stub-pass.ts",
    );
    const r = fire(
      [
        "required-sections",
        "--project-dir",
        flagProj,
        "--stage",
        "intent-capture",
        "--output-path",
        outPath,
      ],
      { CLAUDE_PROJECT_DIR: envProj, AMADEUS_SENSORS_DIR: sensors },
    );
    expect(r.rc).toBe(0);
    // Audit landed under B (the flag), and NOT under A (the env).
    expect(auditEventCount(flagProj, "SENSOR_FIRED")).toBe(1);
    expect(auditEventCount(flagProj, "SENSOR_PASSED")).toBe(1);
    expect(auditEventCount(envProj, "SENSOR_FIRED")).toBe(0);
  });

  test("no --project-dir: falls back to the CLAUDE_PROJECT_DIR env (unchanged)", () => {
    const envProj = makeProj();
    const outPath = join(envProj, "amadeus-docs", "test.md");
    writeFileSync(outPath, "stub\n", "utf-8");
    const sensors = makeForkSensors(
      "required-sections",
      "bun .claude/tools/amadeus-sensor-stub-pass.ts",
    );
    const r = fire(
      ["required-sections", "--stage", "intent-capture", "--output-path", outPath],
      { CLAUDE_PROJECT_DIR: envProj, AMADEUS_SENSORS_DIR: sensors },
    );
    expect(r.rc).toBe(0);
    expect(auditEventCount(envProj, "SENSOR_FIRED")).toBe(1);
    expect(auditEventCount(envProj, "SENSOR_PASSED")).toBe(1);
  });
});

describe("amadeus-sensor fire hardening — orphan-FIRED invariant (FR-7+FR-9, #792)", () => {
  test("negative timeout_seconds is rejected before FIRED: no orphan, loud exit", () => {
    const proj = makeProj();
    const outPath = join(proj, "amadeus-docs", "test.md");
    writeFileSync(outPath, "stub\n", "utf-8");
    // A -1 budget: pre-fix loadSensors accepted it, FIRED emitted, then
    // spawnSync(timeout: -1000) threw an uncaught RangeError -> orphan FIRED +
    // exit 1. Post-fix the schema rejects it at load, before any emit.
    const sensors = makeForkSensors(
      "required-sections",
      "bun .claude/tools/amadeus-sensor-stub-pass.ts",
      -1,
    );
    const r = fire(
      ["required-sections", "--stage", "intent-capture", "--output-path", outPath],
      { CLAUDE_PROJECT_DIR: proj, AMADEUS_SENSORS_DIR: sensors },
    );
    // Loud rejection with the schema message (not an uncaught RangeError).
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("timeout_seconds must be a positive integer");
    // The orphan-FIRED invariant: every FIRED has a paired terminal. Here the
    // fire is rejected before any emit, so both are 0 (pre-fix: FIRED=1,
    // terminal=0 — the orphan).
    const fired = auditEventCount(proj, "SENSOR_FIRED");
    expect(fired).toBe(0);
    expect(fired).toBe(terminalCount(proj));
  });
});
