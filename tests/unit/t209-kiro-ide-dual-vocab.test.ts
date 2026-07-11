// t209-kiro-ide-dual-vocab: issue #753 — the two Kiro IDE PostToolUse seams
// (log-subagent / state-sync) accept BOTH tool vocabularies.
//
// covers: file:harness/kiro-ide/hooks/amadeus-kiro-vocab.ts, file:harness/kiro-ide/hooks/amadeus-kiro-adapter.ts
//
// THE BUG. The registered .kiro.hook matchers use the IDE vocabulary
// (toolTypes [".*invoke_sub_agent.*"] / ["spec"]) while the adapter's case
// checks were CLI-vocabulary-only hard equality (`subagent` / `todo_list`) —
// mutually exclusive, so the seams were structurally dead on the IDE. The fix
// mirrors the sibling canonicalTool() dual-acceptance pattern
// (write|fs_write, shell|execute_bash): subagent|invoke_sub_agent and
// todo_list|spec, plus a shape mapping for the spec input (assumed
// task-status shaped {task, status}; the FR-3 pre-approved branch lets the
// shape chase a live capture later — the dual-vocabulary contract is fixed).
//
// MECHANISM. Two tiers:
//   - in-process on the extracted amadeus-kiro-vocab.ts seam (isSubagentTool /
//     mapStateSyncInput) so the new mapping lines are measured by
//     bun --coverage (spawned subprocesses are invisible to it —
//     cid:code-generation:bun-coverage-spawn-blindspot);
//   - subprocess against the SHIPPED dist/kiro-ide tree (mirroring t147's
//     dist/kiro harness) proving the observable end-to-end effect for BOTH
//     vocabularies: SUBAGENT_COMPLETED lands in the audit shard, and the
//     state file's Current Stage syncs. Pre-fix, the IDE-vocabulary halves
//     were red (adapter returned null: no audit event, state unchanged).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSubagentTool,
  mapStateSyncInput,
} from "../../packages/framework/harness/kiro-ide/hooks/amadeus-kiro-vocab.ts";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  intentsDirOf,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

// --- tier 1: in-process seam (coverage-bearing) ---

describe("t209 amadeus-kiro-vocab — dual-vocabulary mapping (in-process)", () => {
  test("1: isSubagentTool accepts both vocabularies and nothing else", () => {
    expect(isSubagentTool("subagent")).toBe(true); // CLI vocab (non-regression)
    expect(isSubagentTool("invoke_sub_agent")).toBe(true); // IDE vocab (the #753 fix)
    expect(isSubagentTool("todo_list")).toBe(false);
    expect(isSubagentTool("")).toBe(false);
  });

  test("2: todo_list create maps to the in_progress TaskUpdate shape (non-regression)", () => {
    const mapped = mapStateSyncInput("todo_list", {
      command: "create",
      tasks: [{ task_description: "Running Intent Capture [intent-capture]" }],
    });
    expect(mapped).toEqual({
      status: "in_progress",
      activeForm: "Running Intent Capture [intent-capture]",
    });
  });

  test("3: todo_list non-create / empty tasks map to null (no-op contract)", () => {
    expect(mapStateSyncInput("todo_list", { command: "complete", completed_task_ids: ["1"] })).toBeNull();
    expect(mapStateSyncInput("todo_list", { command: "create", tasks: [] })).toBeNull();
    expect(mapStateSyncInput("todo_list", { command: "create" })).toBeNull();
  });

  test("4: spec task-status shape maps to the TaskUpdate shape (the #753 fix)", () => {
    const mapped = mapStateSyncInput("spec", {
      task: "Running Intent Capture [intent-capture]",
      status: "in_progress",
    });
    expect(mapped).toEqual({
      status: "in_progress",
      activeForm: "Running Intent Capture [intent-capture]",
    });
  });

  test("5: spec status defaults to in_progress when absent, forwards other statuses verbatim", () => {
    expect(mapStateSyncInput("spec", { task: "Stage [intent-capture]" })).toEqual({
      status: "in_progress",
      activeForm: "Stage [intent-capture]",
    });
    // A completed transition is forwarded; the core hook filters non-in_progress.
    expect(mapStateSyncInput("spec", { task: "Stage [intent-capture]", status: "completed" })).toEqual({
      status: "completed",
      activeForm: "Stage [intent-capture]",
    });
  });

  test("6: spec without a task string, and unknown tool names, map to null", () => {
    expect(mapStateSyncInput("spec", { status: "in_progress" })).toBeNull();
    expect(mapStateSyncInput("spec", { task: 42 })).toBeNull();
    expect(mapStateSyncInput("write", { task: "Stage [intent-capture]" })).toBeNull();
    expect(mapStateSyncInput("", {})).toBeNull();
  });
});

// --- tier 2: subprocess against the shipped dist/kiro-ide tree ---

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KIRO_IDE_TREE = join(REPO_ROOT, "dist", "kiro-ide", ".kiro");

// Same per-intent scaffold as t147 (dist/kiro sibling): workspace shell +
// state fixture + a pinned-clone audit shard so the core hooks' self-gates open.
const PINNED_CLONE_ID = "testcloneid209";
function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.md`;
}

function scratchProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "t209-"));
  cpSync(KIRO_IDE_TREE, join(dir, ".kiro"), { recursive: true });
  const intentsDir = intentsDirOf(dir, DEFAULT_SPACE);
  mkdirSync(join(dir, "amadeus", "spaces", DEFAULT_SPACE, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(dir), { recursive: true });
  writeFileSync(join(dir, "amadeus", "active-space"), `${DEFAULT_SPACE}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [
        {
          uuid: "00000000-0000-7000-8000-000000000001",
          slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""),
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(
    seededStateFile(dir),
    readFileSync(join(REPO_ROOT, "tests", "fixtures", "state-brownfield-feature.md"), "utf-8"),
  );
  writeFileSync(join(dir, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
  const auditDir = seededAuditDir(dir);
  mkdirSync(auditDir, { recursive: true });
  writeFileSync(join(auditDir, pinnedShardName()), "# AI-DLC Audit Log\n");
  return dir;
}

function readAudit(dir: string): string {
  const auditDir = seededAuditDir(dir);
  return readdirSync(auditDir)
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((n) => readFileSync(join(auditDir, n), "utf-8"))
    .join("\n");
}

function runAdapter(
  projectDir: string,
  target: string,
  payload: unknown,
): { stdout: string; code: number } {
  const r = spawnSync(
    "bun",
    [join(projectDir, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), target],
    {
      cwd: projectDir,
      input: JSON.stringify(payload),
      encoding: "utf-8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
      timeout: 30_000,
    },
  );
  return { stdout: r.stdout ?? "", code: r.status ?? -1 };
}

function subagentPayload(dir: string, toolName: string): Record<string, unknown> {
  return {
    hook_event_name: "postToolUse",
    cwd: dir,
    session_id: "t209-session",
    tool_name: toolName,
    tool_input: {
      task: "Write two files in parallel",
      mode: "blocking",
      stages: [{ name: "write_w1", role: "amadeus-developer-agent", prompt_template: "Write w1.txt" }],
    },
  };
}

describe("t209 dist/kiro-ide adapter — both vocabularies fire end-to-end", () => {
  test("7: log-subagent fires on IDE vocab invoke_sub_agent (pre-fix: dead seam)", () => {
    const dir = scratchProject();
    try {
      const r = runAdapter(dir, "log-subagent", subagentPayload(dir, "invoke_sub_agent"));
      expect(r.code).toBe(0);
      const audit = readAudit(dir);
      expect(audit).toContain("SUBAGENT_COMPLETED");
      expect(audit).toContain("amadeus-developer-agent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8: log-subagent still fires on CLI vocab subagent (non-regression)", () => {
    const dir = scratchProject();
    try {
      const r = runAdapter(dir, "log-subagent", subagentPayload(dir, "subagent"));
      expect(r.code).toBe(0);
      expect(readAudit(dir)).toContain("SUBAGENT_COMPLETED");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("9: state-sync fires on IDE vocab spec — Current Stage syncs (pre-fix: dead seam)", () => {
    const dir = scratchProject();
    try {
      const r = runAdapter(dir, "state-sync", {
        hook_event_name: "postToolUse",
        cwd: dir,
        session_id: "t209-session",
        tool_name: "spec",
        tool_input: { task: "Running Intent Capture [intent-capture]", status: "in_progress" },
      });
      expect(r.code).toBe(0);
      const after = readFileSync(seededStateFile(dir), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*intent-capture/.test(after)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10: state-sync still fires on CLI vocab todo_list create (non-regression)", () => {
    const dir = scratchProject();
    try {
      const r = runAdapter(dir, "state-sync", {
        hook_event_name: "postToolUse",
        cwd: dir,
        session_id: "t209-session",
        tool_name: "todo_list",
        tool_input: {
          command: "create",
          task_list_description: "Stage tasks",
          tasks: [{ task_description: "Running Intent Capture [intent-capture]" }],
        },
      });
      expect(r.code).toBe(0);
      const after = readFileSync(seededStateFile(dir), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*intent-capture/.test(after)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// #822: runCore must forward the PAYLOAD cwd to the core-hook subprocess
// (symmetric to the codex adapter's `cwd: projectDir`). Under a worktree session
// the hook SCRIPTS live in the main checkout (scriptHome) while the engine — and
// the record it writes — is the worktree (payloadCwd). With NO CLAUDE_PROJECT_DIR
// env the core hook resolves projectDir from process.cwd(), so it must inherit the
// payload cwd; pre-fix runCore dropped cwd and synced the WRONG state file.
function runAdapterFrom(
  scriptHome: string,
  processCwd: string,
  target: string,
  payload: unknown,
): { stdout: string; code: number } {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR; // do not mask the cwd-derived resolution
  const r = spawnSync(
    "bun",
    [join(scriptHome, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), target],
    {
      cwd: processCwd,
      input: JSON.stringify(payload),
      encoding: "utf-8",
      env,
      timeout: 30_000,
    },
  );
  return { stdout: r.stdout ?? "", code: r.status ?? -1 };
}

describe("t209 kiro-ide adapter — runCore forwards the payload cwd (#822)", () => {
  test("11: state-sync resolves the payload workspace, not the adapter launch dir", () => {
    const scriptHome = scratchProject(); // 'main checkout': scripts + marker + state
    const payloadCwd = scratchProject(); // 'worktree': the real record the engine wrote from
    try {
      const r = runAdapterFrom(scriptHome, scriptHome, "state-sync", {
        hook_event_name: "postToolUse",
        cwd: payloadCwd,
        tool_name: "todo_list",
        tool_input: {
          command: "create",
          tasks: [{ task_description: "Running Intent Capture [intent-capture]" }],
        },
      });
      expect(r.code).toBe(0);
      const payloadState = readFileSync(seededStateFile(payloadCwd), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*intent-capture/.test(payloadState)).toBe(true);
      const scriptState = readFileSync(seededStateFile(scriptHome), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*requirements-analysis/.test(scriptState)).toBe(true);
    } finally {
      rmSync(scriptHome, { recursive: true, force: true });
      rmSync(payloadCwd, { recursive: true, force: true });
    }
  });
});
