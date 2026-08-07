// covers: function:evaluateDispatchGuard, hook:amadeus-subagent-model-guard
//
// t485 — Issue #2438 (subagent model enforcement, resolution + process layers).
// The pure decision table is t484's unit concern; this file covers the two
// halves that need a real filesystem or a real process boundary
// (cid:code-generation:fs-tests-integration-first):
//
//   (1) evaluateDispatchGuard resolves a dispatch payload against a real
//       harness agents/ dir (verdict via frontmatter name:, pin via model:)
//       and declines non-dispatch payloads with null.
//   (2) the PreToolUse hook denies a non-compliant dispatch with the
//       permissionDecision JSON on stdout (falling proof: the deny actually
//       fires), lets compliant dispatches through silently (the two-sided
//       corpus check), and stays a no-op outside an active amadeus workflow.
//
// MECHANISM: evaluateDispatchGuard is exercised in-process so bun --coverage
// measures its branches; the hook is spawn-driven only (its whole contract is
// process-boundary side effects), mirroring t452/t454.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateDispatchGuard } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { AMADEUS_SRC, cleanupTestProject, createTestProject, seededAuditDir, seededStateFile } from "../harness/fixtures.ts";

const BUN = process.execPath;
const GUARD_HOOK = join(AMADEUS_SRC, "hooks", "amadeus-subagent-model-guard.ts");

const PINNED_PERSONA = "t485-pinned-persona";
const UNPINNED_PERSONA = "t485-unpinned-persona";

function personaDefinition(name: string, model?: string): string {
  const lines = ["---", `name: ${name}`];
  if (model !== undefined) lines.push(`model: ${model}`);
  lines.push("description: >", "  A t485 fixture persona.", "---", "", "# Body", "");
  return lines.join("\n");
}

function seedAgentsDir(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "t485-agents-"));
  for (const [file, body] of Object.entries(files)) writeFileSync(join(dir, file), body, "utf-8");
  return dir;
}

// ---- (1) evaluateDispatchGuard over a real agents dir ------------------------

describe("t485 evaluateDispatchGuard (#2438)", () => {
  let agentsDir: string;
  beforeEach(() => {
    agentsDir = seedAgentsDir({
      "pinned.md": personaDefinition(PINNED_PERSONA, "opus"),
      "unpinned.md": personaDefinition(UNPINNED_PERSONA),
    });
  });
  afterEach(() => {
    rmSync(agentsDir, { recursive: true, force: true });
  });

  test("a non-dispatch tool declines with null (matcher over-fire safety)", () => {
    expect(evaluateDispatchGuard({ tool_name: "TaskUpdate", tool_input: {} }, agentsDir)).toBeNull();
  });

  test("a payload without tool_name declines with null — the guard is a PreToolUse-only seam", () => {
    expect(evaluateDispatchGuard({ tool_input: { subagent_type: "ad-hoc" } }, agentsDir)).toBeNull();
  });

  test.each(["Task", "Agent"])("dispatch spelling %s: a pinned persona is allowed", (tool) => {
    const decision = evaluateDispatchGuard(
      { tool_name: tool, tool_input: { subagent_type: PINNED_PERSONA } },
      agentsDir,
    );
    expect(decision?.kind).toBe("allow");
  });

  test("an ad-hoc name without an explicit model is denied", () => {
    const decision = evaluateDispatchGuard(
      { tool_name: "Task", tool_input: { subagent_type: "builder-adhoc-7" } },
      agentsDir,
    );
    expect(decision?.kind).toBe("deny");
  });

  test("a typeless dispatch (session-default subagent) is denied", () => {
    const decision = evaluateDispatchGuard({ tool_name: "Task", tool_input: {} }, agentsDir);
    expect(decision?.kind).toBe("deny");
  });

  test("an explicit compliant model rescues an ad-hoc dispatch", () => {
    const decision = evaluateDispatchGuard(
      { tool_name: "Task", tool_input: { subagent_type: "builder-adhoc-7", model: "sonnet" } },
      agentsDir,
    );
    expect(decision?.kind).toBe("allow");
  });

  test("an explicit non-compliant model is denied even for the pinned persona", () => {
    const decision = evaluateDispatchGuard(
      { tool_name: "Task", tool_input: { subagent_type: PINNED_PERSONA, model: "fable" } },
      agentsDir,
    );
    expect(decision?.kind).toBe("deny");
  });

  test("a persona without a pin is denied (the pin is the compliance carrier)", () => {
    const decision = evaluateDispatchGuard(
      { tool_name: "Task", tool_input: { subagent_type: UNPINNED_PERSONA } },
      agentsDir,
    );
    expect(decision?.kind).toBe("deny");
  });
});

// ---- (2) the PreToolUse hook -------------------------------------------------

function stateBody(): string {
  return [
    "# AI-DLC State (t485 fixture)",
    "",
    "## Current Status",
    "",
    "- **Workflow**: fix",
    "- **Scope**: fix",
    "- **Phase**: construction",
    "- **Current Stage**: code-generation",
    "- **Status**: In Progress",
    "",
  ].join("\n");
}

/** Seed a running intent with a non-empty audit shard so the hook's gates pass. */
function seed(proj: string): void {
  writeFileSync(seededStateFile(proj), stateBody(), "utf-8");
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
      timestamp: "2026-08-05T08:00:00Z",
      heading: "Seed",
      event: "SEED",
      fields: {},
    })}\n`,
    "utf-8",
  );
}

function seedPersonas(proj: string): void {
  const dir = join(proj, ".claude", "agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pinned.md"), personaDefinition(PINNED_PERSONA, "opus"), "utf-8");
}

function runGuard(proj: string, payload: Record<string, unknown>) {
  return spawnSync(BUN, [GUARD_HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: proj },
  });
}

function denyReasonOf(stdout: string): string | undefined {
  if (!stdout.trim()) return undefined;
  const parsed = JSON.parse(stdout) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  };
  if (parsed.hookSpecificOutput?.permissionDecision !== "deny") return undefined;
  return parsed.hookSpecificOutput.permissionDecisionReason ?? "";
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("t485 subagent-model-guard hook (#2438)", () => {
  test("falling proof: an ad-hoc dispatch inside an active workflow is denied", () => {
    seed(proj);
    seedPersonas(proj);
    const res = runGuard(proj, {
      tool_name: "Task",
      tool_input: { subagent_type: "builder-adhoc-7", prompt: "do the thing" },
      cwd: proj,
    });
    expect(res.status).toBe(0);
    const reason = denyReasonOf(res.stdout);
    expect(reason).toBeDefined();
    expect(reason).toContain("#2438");
  });

  test("the Agent spelling of the dispatch tool is enforced too", () => {
    seed(proj);
    seedPersonas(proj);
    const res = runGuard(proj, {
      tool_name: "Agent",
      tool_input: { subagent_type: "builder-adhoc-7" },
      cwd: proj,
    });
    expect(res.status).toBe(0);
    expect(denyReasonOf(res.stdout)).toBeDefined();
  });

  test("two-sided: a pinned persona dispatch passes silently", () => {
    seed(proj);
    seedPersonas(proj);
    const res = runGuard(proj, {
      tool_name: "Task",
      tool_input: { subagent_type: PINNED_PERSONA },
      cwd: proj,
    });
    expect(res.status).toBe(0);
    expect(denyReasonOf(res.stdout)).toBeUndefined();
  });

  test("two-sided: an explicit sonnet request passes silently", () => {
    seed(proj);
    seedPersonas(proj);
    const res = runGuard(proj, {
      tool_name: "Task",
      tool_input: { subagent_type: "builder-adhoc-7", model: "sonnet" },
      cwd: proj,
    });
    expect(res.status).toBe(0);
    expect(denyReasonOf(res.stdout)).toBeUndefined();
  });

  test("outside an active amadeus workflow the guard is a strict no-op", () => {
    // No seed(): no audit shard, so an ordinary (non-amadeus) session's
    // dispatches — fable included — are none of this guard's business.
    const res = runGuard(proj, {
      tool_name: "Task",
      tool_input: { subagent_type: "builder-adhoc-7" },
      cwd: proj,
    });
    expect(res.status).toBe(0);
    expect(denyReasonOf(res.stdout)).toBeUndefined();
  });

  test("a non-dispatch tool passes through untouched", () => {
    seed(proj);
    const res = runGuard(proj, { tool_name: "TaskUpdate", tool_input: {}, cwd: proj });
    expect(res.status).toBe(0);
    expect(denyReasonOf(res.stdout)).toBeUndefined();
  });
});
