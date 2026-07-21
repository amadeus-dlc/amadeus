// t209-kiro-ide-dual-vocab: issue #753 plus U07's measured Kiro IDE context.
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
// The subagent classifier still accepts both registered names. State sync is no
// longer payload-shaped: upstream 300b640 CHANGELOG.md:28-31 and local U07 make
// it a shell registration whose stage comes only from the audit tail.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
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
  consumeMigrationStopLatch,
  peekMigrationPendingDecision,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { isSubagentTool } from "../../packages/framework/harness/kiro-ide/hooks/amadeus-kiro-vocab.ts";
import { projectSnapshot } from "../helpers/upstream-v2-fixture.ts";
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

function appendStartedStage(dir: string, stage: string): void {
  appendFileSync(
    join(seededAuditDir(dir), pinnedShardName()),
    `\n## Stage Started\n**Timestamp**: 2099-01-01T00:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: ${stage}\n\n---\n`,
  );
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
      input: "stdin-must-not-be-read",
      encoding: "utf-8",
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: projectDir,
        USER_PROMPT: JSON.stringify(payload),
      },
      timeout: 30_000,
    },
  );
  return { stdout: r.stdout ?? "", code: r.status ?? -1 };
}

function subagentPayload(toolName: string): Record<string, unknown> {
  return {
    toolName,
    toolArgs: {
      task: "Write two files in parallel",
      mode: "blocking",
      stages: [{ name: "write_w1", role: "amadeus-developer-agent", prompt_template: "Write w1.txt" }],
    },
    toolResult: "Agent: amadeus-developer-agent\nCompleted the delegated task.",
    toolSuccess: true,
  };
}

describe("t209 dist/kiro-ide adapter — both vocabularies fire end-to-end", () => {
  test("7: log-subagent fires on IDE vocab invoke_sub_agent (pre-fix: dead seam)", () => {
    const dir = scratchProject();
    try {
      const r = runAdapter(dir, "log-subagent", subagentPayload("invoke_sub_agent"));
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
      const r = runAdapter(dir, "log-subagent", subagentPayload("subagent"));
      expect(r.code).toBe(0);
      const audit = readAudit(dir);
      expect(audit).toContain("SUBAGENT_COMPLETED");
      expect(audit).toContain("amadeus-developer-agent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("9: shell registration state-sync derives Current Stage from the audit tail", () => {
    const dir = scratchProject();
    try {
      appendStartedStage(dir, "user-stories");
      const r = runAdapter(dir, "state-sync", {});
      expect(r.code).toBe(0);
      const after = readFileSync(seededStateFile(dir), "utf-8");
      // U07 payload-free state sync derives the stage only from the audit tail.
      expect(/\*\*Current Stage\*\*:\s*user-stories/.test(after)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10: shell registration ignores legacy task payload and remains audit-tail only", () => {
    const dir = scratchProject();
    try {
      appendStartedStage(dir, "user-stories");
      const r = runAdapter(dir, "state-sync", {
        toolName: "todo_list",
        toolArgs: {
          command: "create",
          task_list_description: "Stage tasks",
          tasks: [{ task_description: "Running Intent Capture [intent-capture]" }],
        },
        toolSuccess: true,
      });
      expect(r.code).toBe(0);
      const after = readFileSync(seededStateFile(dir), "utf-8");
      // The legacy task payload points backward, but cannot override the newest
      // unfinished STAGE_STARTED event.
      expect(/\*\*Current Stage\*\*:\s*user-stories/.test(after)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10a: payload-free IDE runtime never arms a session latch from non-live legacy fields", () => {
    const dir = scratchProject();
    const legacySession = `legacy-stdin-session-${process.pid}-${Date.now()}`;
    try {
      const beforeAudit = readAudit(dir);
      const beforeState = readFileSync(seededStateFile(dir), "utf8");
      expect(
        runAdapter(dir, "runtime-compile", {
          toolName: "shell",
          toolArgs: { command: "bun .kiro/tools/amadeus-utility.ts migrate --apply" },
          toolResult: "migration complete",
          toolSuccess: true,
          // Not one of the four measured USER_PROMPT fields. The old test sent
          // this CLI-shaped value on stdin, but Kiro IDE leaves stdin open and
          // unwritten (upstream 300b640 CHANGELOG.md:7-17,28-31).
          session_id: legacySession,
        }).code,
      ).toBe(0);
      expect(consumeMigrationStopLatch(dir, legacySession)).toBe(false);
      expect(readAudit(dir)).toBe(beforeAudit);
      expect(readFileSync(seededStateFile(dir), "utf8")).toBe(beforeState);
      expect(existsSync(join(seededRecordDir(dir), "runtime-graph.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10b: Kiro IDE does not arm the Kiro CLI-only migration decision seam", () => {
    const dir = scratchProject();
    const sessionId = `kiro-ide-no-decision-${process.pid}-${Date.now()}`;
    try {
      const before = projectSnapshot(dir);
      for (const args of ["--migrate", "--apply"]) {
        const initial = runAdapter(dir, "verb-intercept", {
          hook_event_name: "userPromptSubmit",
          cwd: dir,
          session_id: sessionId,
          prompt: `Run \`bun .kiro/tools/amadeus-orchestrate.ts next ${args}\` and relay it.`,
        });
        expect(`${args}:${initial.code}`).toBe(`${args}:0`);
        expect(initial.stdout).toBe("");
        expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
        expect(projectSnapshot(dir)).toBe(before);
      }
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
      input: "stdin-must-not-be-read",
      encoding: "utf-8",
      env: { ...env, USER_PROMPT: JSON.stringify(payload) },
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
      appendStartedStage(payloadCwd, "user-stories");
      const r = runAdapterFrom(scriptHome, payloadCwd, "state-sync", {
        toolName: "todo_list",
        toolArgs: {
          command: "create",
          tasks: [{ task_description: "Running User Stories [user-stories]" }],
        },
        toolSuccess: true,
      });
      expect(r.code).toBe(0);
      // E-SMF-CG1 (#1170): forward-stage target (user-stories) that also differs
      // from the seed's Current Stage (requirements-analysis), so the write lands
      // on cwd-resolved payloadCwd and the payloadCwd-vs-scriptHome discrimination
      // stays sharp without trusting a host payload cwd field.
      const payloadState = readFileSync(seededStateFile(payloadCwd), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*user-stories/.test(payloadState)).toBe(true);
      const scriptState = readFileSync(seededStateFile(scriptHome), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*requirements-analysis/.test(scriptState)).toBe(true);
    } finally {
      rmSync(scriptHome, { recursive: true, force: true });
      rmSync(payloadCwd, { recursive: true, force: true });
    }
  });
});
