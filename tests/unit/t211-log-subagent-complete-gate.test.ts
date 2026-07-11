// covers: hook:amadeus-log-subagent, function:activeWorkflowIsComplete, function:normalizeAgentType
//
// t211 — Issue #845. The SubagentStop hook (amadeus-log-subagent) had two
// defects:
//   (1) It gated only on hasActiveWorkflowAudit (a shard FILE exists), so a
//       SUBAGENT_COMPLETED event kept getting appended even after the active
//       intent's workflow reached Status=Completed — leaving unpushed audit
//       residue in every worktree that merely runs subagents post-completion.
//   (2) `parsed.agent_type ?? "unknown"` passed an EMPTY STRING straight through
//       (Claude Code delivers agent_type as "" for generic Task agents; `??`
//       only substitutes null/undefined), recording a blank "Agent Type" field.
//
// The fix adds an activeWorkflowIsComplete() gate (Status=Completed/Complete →
// no-op) and normalizeAgentType() (blank/whitespace → "unknown"). Running-intent
// appends and non-empty agent types are unchanged (no regression).
//
// MECHANISM: cli for the hook (a hook is a top-level script whose whole contract
// is process-boundary side-effects — spawned as its SubagentStop event drives it,
// mirroring t208). PLUS in-process seam tests on the two new lib predicates so
// their branches are measured by bun --coverage (spawned subprocesses are
// invisible to it — cid:code-generation:bun-coverage-spawn-blindspot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import {
  activeWorkflowIsComplete,
  normalizeAgentType,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const LOG_SUBAGENT = join(AMADEUS_SRC, "hooks", "amadeus-log-subagent.ts");

function stateBody(status: string): string {
  return [
    "# AI-DLC State (t211 fixture)",
    "",
    "## Current Status",
    "",
    "- **Workflow**: bugfix",
    "- **Scope**: bugfix",
    "- **Phase**: construction",
    "- **Current Stage**: code-generation",
    `- **Status**: ${status}`,
    "",
  ].join("\n");
}

/** Seed a self-owned audit shard (non-empty) so hasActiveWorkflowAudit passes,
 *  plus a state file at the given Status. */
function seed(proj: string, status: string): void {
  writeFileSync(seededStateFile(proj), stateBody(status), "utf-8");
  const auditDir = seededAuditDir(proj);
  mkdirSync(auditDir, { recursive: true });
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  writeFileSync(join(auditDir, `${host}-fixturecloneid01.md`), "**Event**: SEED\n", "utf-8");
}

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

function runHook(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [LOG_SUBAGENT], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("t211 log-subagent completion gate + agent_type normalization (#845)", () => {
  // ---- (1) completion gate --------------------------------------------------

  test("Status=Completed intent: SUBAGENT_COMPLETED is NOT appended (no-op)", () => {
    seed(proj, "Completed");
    const res = runHook(proj, { agent_type: "developer", agent_id: "a1", last_assistant_message: "done" });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_COMPLETED");
  });

  test("Status=Complete intent: SUBAGENT_COMPLETED is NOT appended (no-op)", () => {
    seed(proj, "Complete");
    const res = runHook(proj, { agent_type: "developer", agent_id: "a1" });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_COMPLETED");
  });

  test("Status=Running intent: SUBAGENT_COMPLETED IS appended (no regression)", () => {
    seed(proj, "Running");
    const res = runHook(proj, { agent_type: "developer", agent_id: "a1", last_assistant_message: "done" });
    expect(res.status).toBe(0);
    const shards = readAllShards(proj);
    expect(shards).toContain("SUBAGENT_COMPLETED");
    expect(shards).toContain("developer");
  });

  // ---- (2) agent_type normalization -----------------------------------------

  test('empty agent_type "" is recorded as "unknown" (Running intent)', () => {
    seed(proj, "Running");
    const res = runHook(proj, { agent_type: "", agent_id: "a1", last_assistant_message: "done" });
    expect(res.status).toBe(0);
    const shards = readAllShards(proj);
    expect(shards).toContain("SUBAGENT_COMPLETED");
    // The Agent Type field must never be blank.
    expect(shards).toMatch(/Agent Type\*?\*?:\s*unknown/);
    expect(shards).not.toMatch(/Agent Type\*?\*?:\s*$/m);
  });

  test('whitespace-only agent_type is recorded as "unknown"', () => {
    seed(proj, "Running");
    const res = runHook(proj, { agent_type: "   ", agent_id: "a1" });
    expect(res.status).toBe(0);
    expect(readAllShards(proj)).toMatch(/Agent Type\*?\*?:\s*unknown/);
  });

  // ---- In-process seam (coverage of the new lib branches). ------------------

  test("activeWorkflowIsComplete: TRUE for Completed/Complete, FALSE otherwise", () => {
    // No state file yet → false.
    expect(activeWorkflowIsComplete(proj)).toBe(false);
    writeFileSync(seededStateFile(proj), stateBody("Running"), "utf-8");
    expect(activeWorkflowIsComplete(proj)).toBe(false);
    writeFileSync(seededStateFile(proj), stateBody("Completed"), "utf-8");
    expect(activeWorkflowIsComplete(proj)).toBe(true);
    writeFileSync(seededStateFile(proj), stateBody("Complete"), "utf-8");
    expect(activeWorkflowIsComplete(proj)).toBe(true);
  });

  test("activeWorkflowIsComplete: unreadable state path → FALSE (catch branch)", () => {
    // The state path exists but is a DIRECTORY: existsSync passes, readFileSync
    // throws EISDIR → the defensive catch returns false (workflow not terminal).
    mkdirSync(seededStateFile(proj), { recursive: true });
    expect(activeWorkflowIsComplete(proj)).toBe(false);
  });

  test("normalizeAgentType: blank/whitespace/nullish → unknown, else verbatim", () => {
    expect(normalizeAgentType("developer")).toBe("developer");
    expect(normalizeAgentType("")).toBe("unknown");
    expect(normalizeAgentType("   ")).toBe("unknown");
    expect(normalizeAgentType(undefined)).toBe("unknown");
    expect(normalizeAgentType(null)).toBe("unknown");
    // Non-blank value with surrounding space is preserved verbatim (only the
    // emptiness decision uses trim()).
    expect(normalizeAgentType(" dev ")).toBe(" dev ");
  });
});
