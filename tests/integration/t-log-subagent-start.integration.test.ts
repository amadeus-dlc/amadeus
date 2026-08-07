// covers: hook:amadeus-log-subagent-start
// size: medium
//
// U4 (subagent-started) — the started hook driven across its real process
// boundary, exactly as its harness event drives it.
//
// A hook's whole contract is process-boundary side effects, so the emit path
// is exercised by spawning it (mirroring t211 for the completed half). The
// pure derivations it delegates to (subagentPurposeLine, subagentStartFields)
// are measured in-process by t-subagent-purpose — spawned subprocesses are
// invisible to bun --coverage.
//
// THE THREE GATES are shared with the completed half deliberately: a start
// that could be recorded where its completion would be dropped would leave a
// permanently half-open interval in the journal.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  parseAuditRecords,
  seededAuditDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const HOOK = join(AMADEUS_SRC, "hooks", "amadeus-log-subagent-start.ts");

function stateBody(status: string): string {
  return [
    "# AI-DLC State (subagent-start fixture)",
    "",
    "## Current Status",
    "",
    "- **Workflow**: fix",
    "- **Scope**: fix",
    "- **Phase**: construction",
    "- **Current Stage**: code-generation",
    `- **Status**: ${status}`,
    "",
  ].join("\n");
}

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
  writeFileSync(
    join(auditDir, `${host}-fixturecloneid01.jsonl`),
    `${JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: "fixturecloneid01",
      intentId: "test-intent",
      timestamp: "2026-08-01T08:00:00Z",
      heading: "Seed",
      event: "SEED",
      fields: {},
    })}\n`,
    "utf-8",
  );
}

function readAllShards(proj: string): string {
  const dir = seededAuditDir(proj);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .map((n) => readFileSync(join(dir, n), "utf-8"))
    .join("\n");
}

function fieldsFor(proj: string, event: string): Record<string, string>[] {
  return parseAuditRecords(readAllShards(proj))
    .filter((r) => r.event === event)
    .map((r) => r.fields);
}

function runHook(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

const taskDispatch = (input: Record<string, unknown>) => ({
  hook_event_name: "PreToolUse",
  tool_name: "Task",
  tool_input: input,
});

let proj: string;
beforeEach(() => {
  proj = createTestProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("amadeus-log-subagent-start over the PreToolUse{Task} seam (U4)", () => {
  test("a running intent records SUBAGENT_STARTED with type and purpose", () => {
    seed(proj, "Running");
    const r = runHook(proj, taskDispatch({ subagent_type: "developer", prompt: "Build the start half\nand more" }));
    expect(r.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows).toHaveLength(1);
    expect(rows[0]["Agent Type"]).toBe("developer");
    expect(rows[0].Purpose).toBe("Build the start half");
  });

  test("the same dispatch under its INTERNAL tool name records one row (#2303)", () => {
    // The matcher that fires this hook is written `^Task$`, but the payload
    // Claude Code delivers names the tool `Agent`. Accepting only the matcher's
    // spelling drops every real dispatch on that harness — silently, since a
    // dropped start is indistinguishable from "no subagent ran".
    seed(proj, "Running");
    const r = runHook(proj, {
      hook_event_name: "PreToolUse",
      tool_name: "Agent",
      tool_input: { subagent_type: "developer", prompt: "Build the start half\nand more" },
    });
    expect(r.status).toBe(0);
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows).toHaveLength(1);
    expect(rows[0]["Agent Type"]).toBe("developer");
    expect(rows[0].Purpose).toBe("Build the start half");
  });

  test("the prompt is never recorded past its first line", () => {
    seed(proj, "Running");
    runHook(proj, taskDispatch({ subagent_type: "developer", prompt: "Summary line\nAWS_SECRET=hunter2" }));
    expect(readAllShards(proj)).not.toContain("hunter2");
  });

  test("a blank agent type normalizes rather than recording an empty field", () => {
    // Claude Code delivers "" for a generic Task agent (#845, same as the
    // completed half).
    seed(proj, "Running");
    runHook(proj, taskDispatch({ subagent_type: "", prompt: "x" }));
    expect(fieldsFor(proj, "SUBAGENT_STARTED")[0]["Agent Type"]).toBe("unknown");
  });

  test("Agent ID rides along when the seam supplies one, and is absent otherwise", () => {
    seed(proj, "Running");
    runHook(proj, { ...taskDispatch({ subagent_type: "a", prompt: "p" }), agent_id: "agent-42" });
    runHook(proj, taskDispatch({ subagent_type: "b", prompt: "p" }));
    const rows = fieldsFor(proj, "SUBAGENT_STARTED");
    expect(rows).toHaveLength(2);
    expect(rows[0]["Agent ID"]).toBe("agent-42");
    expect(rows[1]["Agent ID"]).toBeUndefined();
  });

  // ---- the three gates ------------------------------------------------------

  test("a NON-dispatch tool is a no-op (the settings matcher is unanchored)", () => {
    seed(proj, "Running");
    const r = runHook(proj, {
      hook_event_name: "PreToolUse",
      tool_name: "TaskUpdate",
      tool_input: { status: "in_progress" },
    });
    expect(r.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_STARTED");
  });

  test("a completed workflow is a no-op (no post-completion residue, #845)", () => {
    seed(proj, "Completed");
    const r = runHook(proj, taskDispatch({ subagent_type: "developer", prompt: "p" }));
    expect(r.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_STARTED");
  });

  test("no active audit shard is a no-op", () => {
    // State only: no audit dir at all.
    writeFileSync(seededStateFile(proj), stateBody("Running"), "utf-8");
    const r = runHook(proj, taskDispatch({ subagent_type: "developer", prompt: "p" }));
    expect(r.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_STARTED");
  });

  test("malformed stdin is a no-op rather than a crash (fail-open)", () => {
    seed(proj, "Running");
    const r = spawnSync(BUN, [HOOK], {
      input: "{not json",
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(r.status).toBe(0);
    expect(readAllShards(proj)).not.toContain("SUBAGENT_STARTED");
  });

  test("the started row pairs with the completed row the sibling hook writes", () => {
    // The two halves are only useful together; this is the end-to-end proof
    // that they land in one journal with a shared vocabulary.
    seed(proj, "Running");
    runHook(proj, taskDispatch({ subagent_type: "developer", prompt: "Pair me" }));
    const completedHook = join(AMADEUS_SRC, "hooks", "amadeus-log-subagent.ts");
    const r = spawnSync(BUN, [completedHook], {
      input: JSON.stringify({ agent_type: "developer", last_assistant_message: "done" }),
      encoding: "utf-8",
      env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
    });
    expect(r.status).toBe(0);
    expect(fieldsFor(proj, "SUBAGENT_STARTED")).toHaveLength(1);
    expect(fieldsFor(proj, "SUBAGENT_COMPLETED")).toHaveLength(1);
  });
});
