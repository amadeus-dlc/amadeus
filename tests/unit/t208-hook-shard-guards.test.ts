// covers: hook:amadeus-audit-logger, hook:amadeus-sensor-fire, hook:amadeus-log-subagent, hook:amadeus-validate-state, function:hasActiveWorkflowAudit
//
// t208 — Issue #775. The four advisory hooks gated "is there an active
// workflow?" on existsSync(auditFilePath(projectDir)) — the CALLER's own
// per-clone shard (`<host>-<clone>.md`). On a fresh clone / new worktree the
// gitignored clone-id is minted anew, so that self-shard does not yet exist even
// though COMMITTED shards from other clones sit right beside it. The guard read
// FALSE and the hooks silently dropped audit + sensor events until the engine's
// first append.
//
// The fix routes all four through hasActiveWorkflowAudit(projectDir), which
// glob-merges EVERY `audit/*.md` shard of the active intent (the pattern already
// established in amadeus-runtime-compile.ts), so a committed foreign shard flips
// the guard OPEN. "No shard at all" still reads FALSE → hooks stay a no-op.
//
// FIXTURE (the bug repro): createTestProject() pins this clone's id to
// FIXTURE_CLONE_ID, so the spawned hook resolves its self shard as
// `<host>-fixturecloneid01.md`. We seed ONLY a DIFFERENT shard
// (`<host>-otherclone.md`, non-empty) plus amadeus-state.md, and DO NOT create
// the self shard. Pre-fix: each hook drops (no event / no dispatch). Post-fix:
// each hook proceeds and its characteristic side-effect lands.
//
// MECHANISM: cli for the four hooks (a hook is a top-level script whose whole
// contract is process-boundary side-effects — spawned exactly as its Claude Code
// event drives it, mirroring t94/t170). PLUS an in-process seam test on
// hasActiveWorkflowAudit so the new lib branch is measured by bun --coverage
// (spawned subprocesses are invisible to it — cid:code-generation
// :bun-coverage-spawn-blindspot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { hasActiveWorkflowAudit } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const HOOK_DIR = join(AMADEUS_SRC, "hooks");
const AUDIT_LOGGER = join(HOOK_DIR, "amadeus-audit-logger.ts");
const SENSOR_FIRE = join(HOOK_DIR, "amadeus-sensor-fire.ts");
const LOG_SUBAGENT = join(HOOK_DIR, "amadeus-log-subagent.ts");
const VALIDATE_STATE = join(HOOK_DIR, "amadeus-validate-state.ts");
const FRAMEWORK_GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");

// A minimal state whose Current Stage carries md-glob sensors in the FRAMEWORK
// graph (requirements-analysis → required-sections + upstream-coverage), so the
// sensor-fire hook reaches its per-entry dispatch once the shard guard passes.
const STATE_BODY = [
  "# AI-DLC State (t208 fixture)",
  "",
  "## Stage Progress",
  "## Current Status",
  "",
  "- **Workflow**: bugfix",
  "- **Scope**: bugfix",
  "- **Phase**: inception",
  "- **Current Stage**: requirements-analysis",
  "",
].join("\n");

// Stub dispatcher (mirrors t94): record argv to T208_SPAWN_LOG and exit 0.
// Written to <proj>/.claude/tools/amadeus-sensor.ts — the exact path the
// sensor-fire hook joins — so the hook spawns OUR stub and the log file's
// EXISTENCE proves the per-entry dispatch loop ran (i.e. the shard guard passed).
const STUB_DISPATCHER = `// @ts-nocheck
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const out = process.env.T208_SPAWN_LOG;
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  const line = JSON.stringify(process.argv) + "\\n";
  if (existsSync(out)) appendFileSync(out, line);
  else writeFileSync(out, line);
}
process.stdout.write('{"pass":true}\\n');
process.exit(0);
`;

/** Concatenate every shard in the record's audit dir (clone-id-agnostic read). */
function readAllShards(proj: string): string {
  const dir = seededAuditDir(proj);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((n) => readFileSync(join(dir, n), "utf-8"))
    .join("\n");
}

/**
 * The #775 repro precondition: a COMMITTED foreign shard (a DIFFERENT clone's
 * `<host>-otherclone.md`, non-empty) + amadeus-state.md, but NO self shard for
 * THIS clone (FIXTURE_CLONE_ID). Optionally also drops the stub dispatcher for
 * the sensor-fire path.
 */
function seedForeignShardOnly(proj: string, withDispatcher = false): void {
  writeFileSync(seededStateFile(proj), STATE_BODY, "utf-8");
  const auditDir = seededAuditDir(proj);
  mkdirSync(auditDir, { recursive: true });
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  writeFileSync(join(auditDir, `${host}-otherclone.md`), "**Event**: FOREIGN_SHARD\n", "utf-8");
  // Guard the precondition: the self shard must NOT exist (else the bug can't
  // manifest and the test would pass vacuously against the pre-fix hook).
  if (existsSync(seededAuditShard(proj))) {
    throw new Error("t208 fixture invariant broken: self shard exists");
  }
  if (withDispatcher) {
    mkdirSync(join(proj, ".claude", "tools"), { recursive: true });
    writeFileSync(join(proj, ".claude", "tools", "amadeus-sensor.ts"), STUB_DISPATCHER, "utf-8");
  }
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("t208 hook active-workflow guard resolves ANY shard, not the self shard (#775)", () => {
  test("audit-logger emits ARTIFACT_CREATED when only a foreign shard exists", () => {
    seedForeignShardOnly(proj);
    const artifact = join(seededRecordDir(proj), "inception", "requirements-analysis", "requirements.md");
    const res = spawnSync(BUN, [AUDIT_LOGGER], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: artifact } }),
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).toContain("ARTIFACT_CREATED");
  });

  test("log-subagent emits SUBAGENT_COMPLETED when only a foreign shard exists", () => {
    seedForeignShardOnly(proj);
    const res = spawnSync(BUN, [LOG_SUBAGENT], {
      input: JSON.stringify({ agent_type: "developer", agent_id: "a1", last_assistant_message: "done" }),
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).toContain("SUBAGENT_COMPLETED");
  });

  test("validate-state emits SESSION_COMPACTED when only a foreign shard exists", () => {
    seedForeignShardOnly(proj);
    const res = spawnSync(BUN, [VALIDATE_STATE], {
      input: JSON.stringify({ trigger: "auto" }),
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).toContain("SESSION_COMPACTED");
  });

  test("sensor-fire dispatches when only a foreign shard exists", () => {
    seedForeignShardOnly(proj, true);
    const spawnLog = join(proj, ".spawn.log");
    const artifact = join(proj, "amadeus-docs", "inception", "requirements-analysis", "requirements.md");
    const res = spawnSync(BUN, [SENSOR_FIRE], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: artifact } }),
      encoding: "utf-8",
      env: {
        ...(process.env as Record<string, string>),
        CLAUDE_PROJECT_DIR: proj,
        AMADEUS_STAGE_GRAPH: FRAMEWORK_GRAPH,
        T208_SPAWN_LOG: spawnLog,
      },
    });
    expect(res.status).toBe(0);
    // The dispatcher stub only runs if the shard guard (step 6) let the hook
    // reach the per-entry dispatch loop.
    expect(existsSync(spawnLog)).toBe(true);
  });

  // ---- Non-regression: workflow FULLY absent (no shard at all) → no-op. ------

  test("audit-logger stays a no-op when NO shard exists at all", () => {
    // amadeus-state.md present but ZERO shards → hasActiveWorkflowAudit === false.
    writeFileSync(seededStateFile(proj), STATE_BODY, "utf-8");
    const artifact = join(seededRecordDir(proj), "inception", "requirements-analysis", "requirements.md");
    const res = spawnSync(BUN, [AUDIT_LOGGER], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: artifact } }),
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(res.status).toBe(0);
    expect(existsSync(seededAuditDir(proj))).toBe(false);
  });

  test("sensor-fire stays a no-op when NO shard exists at all", () => {
    writeFileSync(seededStateFile(proj), STATE_BODY, "utf-8");
    mkdirSync(join(proj, ".claude", "tools"), { recursive: true });
    writeFileSync(join(proj, ".claude", "tools", "amadeus-sensor.ts"), STUB_DISPATCHER, "utf-8");
    const spawnLog = join(proj, ".spawn.log");
    const artifact = join(proj, "amadeus-docs", "inception", "requirements-analysis", "requirements.md");
    const res = spawnSync(BUN, [SENSOR_FIRE], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: artifact } }),
      encoding: "utf-8",
      env: {
        ...(process.env as Record<string, string>),
        CLAUDE_PROJECT_DIR: proj,
        AMADEUS_STAGE_GRAPH: FRAMEWORK_GRAPH,
        T208_SPAWN_LOG: spawnLog,
      },
    });
    expect(res.status).toBe(0);
    expect(existsSync(spawnLog)).toBe(false);
  });

  // ---- In-process seam (coverage of the new lib branch). --------------------

  test("hasActiveWorkflowAudit: TRUE for a foreign shard, FALSE for none", () => {
    // No shard yet → false.
    writeFileSync(seededStateFile(proj), STATE_BODY, "utf-8");
    expect(hasActiveWorkflowAudit(proj)).toBe(false);
    // Seed ONLY a foreign shard (self shard absent) → true.
    const auditDir = seededAuditDir(proj);
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(join(auditDir, "some-host-otherclone.md"), "**Event**: X\n", "utf-8");
    expect(existsSync(seededAuditShard(proj))).toBe(false);
    expect(hasActiveWorkflowAudit(proj)).toBe(true);
  });
});
