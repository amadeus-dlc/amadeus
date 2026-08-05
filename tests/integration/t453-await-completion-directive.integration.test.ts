// covers: subcommand:amadeus-orchestrate:next, subcommand:amadeus-state:complete-workflow
// size: medium
//
// Issue #2251 — the completion-uncommitted window is a legitimate waiting state,
// not an engine failure. `next` used to answer it with an `error` directive,
// whose emit aggregation point appends an ERROR_LOGGED / amadeus.operation.failed
// row (issue #839's contract). Every re-entry into the window appended another
// row, because the audit idempotency key is a fresh UUID per emit.
//
// The window is reached exactly as t427 reaches it: the final in-scope stage is
// [x] while `Status` is still `Running`, i.e. the completion transaction has not
// been committed yet. The engine's own guidance for that state is "run
// complete-workflow, then re-run next", so the state is expected, not broken.
//
// These cases pin the three CONFIRMED-firing sites on the new `await-completion`
// kind: the completion-uncommitted window, the completion mirror refusal, and
// complete-workflow's own goal-reconciliation refusal.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { countAuditEvent } from "../harness/audit-records.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
const STATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");
const ORCHESTRATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-orchestrate.ts");
const STAGE_GRAPH = join(ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const SCOPE_GRID = join(ROOT, "dist", "claude", ".claude", "tools", "data", "scope-grid.json");

const projects: string[] = [];

const toolEnv = {
  ...process.env,
  AMADEUS_STAGE_GRAPH: STAGE_GRAPH,
  AMADEUS_SCOPE_GRID: SCOPE_GRID,
};

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function birth(): { project: string; record: string } {
  const project = createTestProject();
  projects.push(project);
  const result = spawnSync(
    process.execPath,
    [
      UTIL,
      "intent-birth",
      "--scope",
      "fix",
      "--arguments",
      "Ship a verified goal guard",
      "--project-dir",
      project,
    ],
    { encoding: "utf8", env: toolEnv },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  const intents = join(project, "amadeus", "spaces", "default", "intents");
  const record = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return { project, record };
}

// Total ERROR_LOGGED rows across every shard of the intent's audit directory.
function errorLoggedRows(project: string, record: string): number {
  const auditDir = join(project, "amadeus", "spaces", "default", "intents", record, "audit");
  if (!existsSync(auditDir)) return 0;
  return readdirSync(auditDir)
    .filter((name) => name.endsWith(".jsonl"))
    .reduce(
      (total, name) => total + countAuditEvent(readFileSync(join(auditDir, name), "utf8"), "ERROR_LOGGED"),
      0,
    );
}

// The completion-uncommitted window: the final in-scope stage is complete but
// the completion transaction has not been committed. Passing a completion
// instance additionally arms the persisted mirror boundary.
function setFinalStageState(project: string, record: string, completionInstance?: string): void {
  const path = join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md");
  let state = readFileSync(path, "utf8")
    .replace(/- \*\*Current Stage\*\*: .*/u, "- **Current Stage**: build-and-test")
    .replace(/^- \[.\] build-and-test.*$/mu, "- [x] build-and-test — EXECUTE");
  if (completionInstance) {
    state = state.replace(
      "## Runtime State",
      "## Runtime State\n" +
        `- **Workflow Completion Instance**: ${completionInstance}\n` +
        "- **Workflow Completion Stage**: build-and-test\n" +
        "- **Workflow Completion Status**: pending",
    );
  }
  writeFileSync(path, state);
}

function runNext(project: string) {
  return spawnSync(process.execPath, [ORCHESTRATE, "next", "--project-dir", project], {
    encoding: "utf8",
    env: toolEnv,
  });
}

describe("the completion-uncommitted window answers with await-completion, not error", () => {
  test("a bare next in the window returns await-completion and records no ERROR_LOGGED", () => {
    const { project, record } = birth();
    setFinalStageState(project, record);
    const before = errorLoggedRows(project, record);

    const result = runNext(project);

    expect(result.status).toBe(0);
    const directive = JSON.parse(result.stdout) as { kind: string; reason?: string };
    expect(directive.kind).toBe("await-completion");
    expect(directive.reason).toMatch(/workflow completion transaction is not committed/i);
    expect(errorLoggedRows(project, record)).toBe(before);
  });

  test("re-entering the window appends no audit rows, however many times next runs", () => {
    const { project, record } = birth();
    setFinalStageState(project, record);
    const before = errorLoggedRows(project, record);

    for (let i = 0; i < 3; i++) {
      const result = runNext(project);
      expect((JSON.parse(result.stdout) as { kind: string }).kind).toBe("await-completion");
    }

    expect(errorLoggedRows(project, record)).toBe(before);
  });

  test("complete-workflow's own goal-reconciliation refusal fails closed without ERROR_LOGGED", () => {
    const { project, record } = birth();
    setFinalStageState(project, record);
    const statePath = join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md");
    const stateBefore = readFileSync(statePath, "utf8");
    const before = errorLoggedRows(project, record);

    const result = spawnSync(
      process.execPath,
      [STATE, "complete-workflow", "build-and-test", "--project-dir", project],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );

    // Still fail-closed: a refused completion must not exit 0 and must not
    // touch the completion surface.
    expect(result.status).not.toBe(0);
    const refusal = JSON.parse(result.stderr) as { kind: string; reason?: string };
    expect(refusal.kind).toBe("await-completion");
    expect(refusal.reason).toMatch(/Goal reconciliation refused completion/i);
    expect(readFileSync(statePath, "utf8")).toBe(stateBefore);
    expect(errorLoggedRows(project, record)).toBe(before);
  });

  test("a malformed state file is still a genuine error, audit row included", () => {
    const { project, record } = birth();
    setFinalStageState(project, record);
    // A completion refused because the state file itself is invalid is not a
    // waiting state: nothing settles it but a repair, so it keeps the error
    // path and its ERROR_LOGGED evidence (#839).
    const statePath = join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md");
    writeFileSync(statePath, readFileSync(statePath, "utf8").replace(/- \*\*Scope\*\*: [^\n]+\n/u, ""));
    const before = errorLoggedRows(project, record);

    const result = spawnSync(
      process.execPath,
      [STATE, "complete-workflow", "build-and-test", "--project-dir", project],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect((JSON.parse(result.stderr) as { error?: string }).error).toMatch(/requires a Scope field/i);
    expect(errorLoggedRows(project, record)).toBe(before + 1);
  });
});
