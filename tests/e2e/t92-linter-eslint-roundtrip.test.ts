// covers: subcommand:amadeus-sensor:fire, audit:SENSOR_FAILED
//
// #819 — RELOCATED real eslint round-trip (formerly t92 case 15). The linter
// FAILED round-trip fires the SHIPPED linter sensor, which spawns a REAL
// eslint process (fire:327). Under the -P 8 full-suite (--ci) load that spawn
// was non-hermetic: its Findings count intermittently read 1->0 (#819). Per
// the E-B5a Q2 ruling (layered: --ci hermetic, real round-trip on --release),
// the real-eslint case was PHYSICALLY MOVED here — the e2e level only runs
// under --release / --all, off the frequently-run gate. The --ci tier keeps a
// HERMETIC stubbed twin (tests/integration/t92.test.ts case 15/15b).
//
// EQUAL-FIDELITY MOVE: the case name and assertions are byte-identical to the
// original t92 case 15 — only the file placement changed. runFailedTsReal and
// its helper closure are copied verbatim from t92.test.ts so the round-trip
// contract (fired/failed pairing, id match, Findings count=1, detail path,
// output path) is preserved exactly. Mechanism = cli (real dispatcher
// subprocess + the audit.md it writes), matching t92.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { toPortablePath } from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// P9: with no intent cursor seeded, the sensor dispatcher resolves the BARE
// space record root at amadeus/spaces/default/intents/ for both the per-clone
// audit SHARD and the detail tree. Audit reads go through readAllAuditShards
// (the subprocess mints its own clone-id, distinct from the test process's, so
// read the whole audit/ dir rather than a single memoized shard path).
// Posix record prefix for the relative detail-path audit fields.
const RP = "amadeus/spaces/default/intents";

const BUN = process.execPath; // the bun running this test
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS_DIR = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const SENSOR_TS = join(TOOLS_DIR, "amadeus-sensor.ts");
const FIXTURES_ROOT = join(REPO_ROOT, "tests", "fixtures", "v05-mr9-sensor-fire");

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

/** make_proj: fresh temp project + amadeus-docs/. */
function makeProj(): string {
  const proj = toPortablePath(mkdtempSync(join(tmpdir(), "amadeus-t92e2e-proj-")));
  mkdirSync(join(proj, "amadeus-docs"), { recursive: true });
  tempDirs.push(proj);
  return proj;
}

/** The merged audit trail (per-clone shards; one here for a single clone). */
function readAudit(proj: string): string {
  return readAllAuditShards(proj);
}

/** audit_event_count: count bodies with `**Event**: <type>` across the trail. */
function auditEventCount(proj: string, ev: string): number {
  const re = new RegExp(`^\\*\\*Event\\*\\*: ${ev}$`);
  return readAudit(proj)
    .split("\n")
    .filter((l) => re.test(l)).length;
}

/** audit_field: value of <key> from the FIRST audit block whose Event matches <ev>. */
function auditField(proj: string, ev: string, key: string): string {
  let matched = false;
  for (const line of readAudit(proj).split("\n")) {
    if (line.startsWith("## ")) {
      matched = false;
      continue;
    }
    if (line === "---") {
      matched = false;
      continue;
    }
    if (line.startsWith("**Event**: ")) {
      matched = line === `**Event**: ${ev}`;
      continue;
    }
    if (matched && line.startsWith("**")) {
      const stripped = line.replace(/^\*\*/, "");
      const pos = stripped.indexOf("**: ");
      if (pos > 0) {
        const label = stripped.slice(0, pos);
        const value = stripped.slice(pos + 4);
        if (label === key) return value;
      }
    }
  }
  return "";
}

/**
 * Spawn `amadeus-sensor.ts fire ...` synchronously. The round-trip below
 * observes the fire only through the audit shards it writes, so the return
 * value is unused here. Real-sensor tests pass no AMADEUS_SENSORS_DIR, so the
 * dispatcher resolves the SHIPPED per-sensor scripts (real eslint) from dist/.
 */
function fire(args: string[], env: Record<string, string>): void {
  spawnSync(BUN, [SENSOR_TS, "fire", ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
}

/** run_failed_ts_real — verbatim from t92.test.ts (assertion-identical move). */
function runFailedTsReal(
  id: string,
  stage: string,
  fixtureDir: string,
  expectedFindings: string,
): void {
  const proj = makeProj();
  // basename, not split("/"): absolute backslash path on Windows.
  const subdir = basename(fixtureDir);
  cpSync(fixtureDir, join(proj, subdir), { recursive: true });
  fire([id, "--stage", stage, "--output-path", join(proj, subdir, "sample.ts")], {
    CLAUDE_PROJECT_DIR: proj,
  });
  const f = proj;
  const fired = auditEventCount(f, "SENSOR_FIRED");
  const failed = auditEventCount(f, "SENSOR_FAILED");
  const firedId = auditField(f, "SENSOR_FIRED", "Fire id");
  const failedId = auditField(f, "SENSOR_FAILED", "Fire id");
  const findings = auditField(f, "SENSOR_FAILED", "Findings count");
  const detailPath = auditField(f, "SENSOR_FAILED", "Detail path");
  const path = auditField(f, "SENSOR_FAILED", "Output path");
  expect(fired).toBe(1);
  expect(failed).toBe(1);
  expect(firedId).not.toBe("");
  expect(firedId).toBe(failedId);
  expect(findings).toBe(expectedFindings);
  expect(detailPath).toBe(`${RP}/.amadeus-sensors/${stage}/${id}-${firedId}.md`);
  expect(existsSync(join(proj, detailPath))).toBe(true);
  expect(path).toBe(`${subdir}/sample.ts`);
}

describe("t92 e2e: linter FAILED real eslint round-trip (relocated case 15)", () => {
  // Real eslint spawn (manifest timeout_seconds=30) — override bun's 5s default.
  test("15: linter — failing TS (no-unused-vars error) -> Findings count=1", () => {
    runFailedTsReal("linter", "code-generation", join(FIXTURES_ROOT, "failing-linter"), "1");
  }, 60000);
});
