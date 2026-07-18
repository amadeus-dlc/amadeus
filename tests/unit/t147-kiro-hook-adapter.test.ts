// t147-kiro-hook-adapter: the Kiro stdin shim normalizes live-captured
// payloads into the core hooks' contract.
//
// covers: file:hooks/amadeus-stop.ts, file:hooks/amadeus-session-start.ts, file:hooks/amadeus-sync-statusline.ts, file:hooks/amadeus-log-subagent.ts
//
// WHAT. Each case pipes a fixture from tests/fixtures/kiro-hook-payloads/
// (field-verbatim captures off kiro-cli 2.6.1 — findings.md §0.2) into
// `bun dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts <target>` inside a
// scratch project that has an active workflow state, then asserts the
// observable core-hook effect:
//   stop          → {"decision":"block"} when the engine says work remains;
//                   silent exit 0 when no workflow state exists.
//   session-start → plain-text context (NOT the {"additionalContext"} JSON
//                   wrapper — the shim unwraps it for Kiro's stdout channel).
//   state-sync    → todo_list create with "[slug]" suffix dispatches
//                   set-status (state file's Current Stage updates).
//   audit/sensors + runtime-compile + log-subagent → fail-open exit 0 on
//   both fixture input and malformed stdin (advisory contract G5).
//
// WHY SUBPROCESS. The adapter IS a subprocess shim — in-process unit testing
// would bypass the exact stdin/stdout/exit-code surface being contracted.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  armMigrationPendingDecision,
  birthIntent,
  consumeMigrationPendingDecision,
  consumeMigrationStopLatch,
  peekMigrationPendingDecision,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { projectSnapshot } from "../helpers/upstream-v2-fixture.ts";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  intentsDirOf,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KIRO_TREE = join(REPO_ROOT, "dist", "kiro", ".kiro");
const FIXTURES = JSON.parse(
  readFileSync(join(REPO_ROOT, "tests", "fixtures", "kiro-hook-payloads", "payloads.json"), "utf-8"),
) as Record<string, unknown>;

// P9 per-intent layout: the core hooks the Kiro adapter shims to resolve state
// via stateFilePath() and the audit trail via auditFilePath() — under the active
// intent's record, not the flat amadeus-docs/ root. So the scratch project seeds
// the per-intent workspace shell + the state fixture into the default record (so
// the active-intent cursor resolves) + the resolved audit SHARD (pinned clone-id
// so the log-subagent shard gate passes and reads are deterministic).
const PINNED_CLONE_ID = "testcloneid147";
function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.md`;
}

/** Seed the per-intent workspace shell (active-space + intents/<record> + cursors
 *  + registry) into an arbitrary dir. Mirrors fixtures.ts seedWorkspaceShell. */
function seedShell(dir: string): void {
  const intentsDir = intentsDirOf(dir, DEFAULT_SPACE);
  mkdirSync(join(dir, "amadeus", "spaces", DEFAULT_SPACE, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(dir), { recursive: true });
  writeFileSync(join(dir, "amadeus", "active-space"), `${DEFAULT_SPACE}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [{ uuid: "00000000-0000-7000-8000-000000000001", slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""), status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

// Scratch project: a .kiro tree (copied) + the per-intent workspace shell with an
// active workflow state so the core hooks' self-gates open. Built per test.
function scratchProject(withState: boolean): string {
  const dir = mkdtempSync(join(tmpdir(), "t147-"));
  cpSync(KIRO_TREE, join(dir, ".kiro"), { recursive: true });
  seedShell(dir);
  if (withState) {
    // State fixture into the default record so the active-intent cursor resolves.
    writeFileSync(
      seededStateFile(dir),
      readFileSync(join(REPO_ROOT, "tests", "fixtures", "state-brownfield-feature.md"), "utf-8"),
    );
    // The resolved audit shard (pinned clone-id) so the log-subagent shard gate
    // passes and the trail seeds the "# AI-DLC Audit Log" header.
    writeFileSync(join(dir, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
    const auditDir = seededAuditDir(dir);
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(join(auditDir, pinnedShardName()), "# AI-DLC Audit Log\n");
  }
  return dir;
}

function bareKiroProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "t147-migration-gate-"));
  cpSync(KIRO_TREE, join(dir, ".kiro"), { recursive: true });
  return dir;
}

/** Concatenate every audit shard (clone-id-name-agnostic read). */
function readAudit(dir: string): string {
  const auditDir = seededAuditDir(dir);
  let names: string[];
  try {
    names = require("node:fs").readdirSync(auditDir) as string[];
  } catch {
    return "";
  }
  return names
    .filter((n: string) => n.endsWith(".md"))
    .sort()
    .map((n: string) => readFileSync(join(auditDir, n), "utf-8"))
    .join("\n");
}

function runAdapter(
  projectDir: string,
  target: string,
  payload: unknown,
): { stdout: string; code: number } {
  // The live-captured fixtures carry a placeholder `cwd: /tmp/example-project`.
  // Since #822 the adapter FORWARDS the payload cwd as the core-hook subprocess
  // cwd, so the payload must name the real scratch workspace (a real Kiro payload
  // always names its actual cwd). Object payloads get cwd pinned to projectDir;
  // string payloads (the malformed-stdin case) pass through untouched.
  const body =
    payload && typeof payload === "object"
      ? { ...(payload as Record<string, unknown>), cwd: projectDir }
      : payload;
  const r = spawnSync(
    "bun",
    [join(projectDir, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), target],
    {
      cwd: projectDir,
      input: typeof body === "string" ? body : JSON.stringify(body),
      encoding: "utf-8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
      timeout: 30_000,
    },
  );
  return { stdout: r.stdout ?? "", code: r.status ?? -1 };
}

describe("t147 Kiro hook adapter (live-captured payload fixtures)", () => {
  test("1: stop blocks with a reason while the workflow has pending work", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "stop", FIXTURES.stop);
      expect(r.code).toBe(0);
      const out = JSON.parse(r.stdout) as { decision?: string; reason?: string };
      expect(out.decision).toBe("block");
      expect(out.reason ?? "").not.toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("2: stop is silent (no block) when no workflow state exists", () => {
    const dir = scratchProject(false);
    try {
      const r = runAdapter(dir, "stop", FIXTURES.stop);
      expect(r.code).toBe(0);
      expect(r.stdout.trim()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("3: session-start emits plain-text context, not the JSON wrapper", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "session-start", FIXTURES.agentSpawn);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("AIDLC WORKFLOW ACTIVE");
      expect(r.stdout).not.toContain("additionalContext");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("4: todo_list create with [slug] suffix syncs the state file", () => {
    const dir = scratchProject(true);
    try {
      const before = readFileSync(seededStateFile(dir), "utf-8");
      const r = runAdapter(dir, "state-sync", FIXTURES.postToolUse_todo_create);
      expect(r.code).toBe(0);
      const after = readFileSync(seededStateFile(dir), "utf-8");
      // E-SMF-CG1 (#1170): the payload's [user-stories] slug dispatches
      // set-status for a FORWARD stage (pending in the seed), so the write lands
      // and Current Stage reflects it. Prior to the retreat guard this asserted
      // [intent-capture], a COMPLETED stage — the exact retreat #1170 now
      // suppresses; the seam intent (dispatch + state-sync) is preserved by
      // targeting a non-completed stage instead of the completed one.
      expect(/\*\*Current Stage\*\*:\s*user-stories/.test(after)).toBe(true);
      expect(before).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("5: todo_list complete (no [slug] create) is a clean no-op", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "state-sync", FIXTURES.postToolUse_todo_complete);
      expect(r.code).toBe(0);
      expect(r.stdout.trim()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("6: log-subagent emits SUBAGENT_COMPLETED to the audit", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "log-subagent", FIXTURES.postToolUse_subagent);
      expect(r.code).toBe(0);
      const audit = readAudit(dir);
      expect(audit).toContain("SUBAGENT_COMPLETED");
      expect(audit).toContain("amadeus-developer-agent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("7: write-event target normalizes path→file_path and exits 0 (advisory)", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "audit-and-sensors", FIXTURES.postToolUse_write);
      expect(r.code).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8: runtime-compile target accepts the alias shell payload and exits 0", () => {
    const dir = scratchProject(true);
    try {
      const r = runAdapter(dir, "runtime-compile", FIXTURES.postToolUse_shell);
      expect(r.code).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8a: migration runtime/Stop targets forward session_id without cross-session consume", () => {
    const dir = scratchProject(false);
    try {
      const runtimePayload = (sessionId: string) => ({
        ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
        session_id: sessionId,
        tool_input: {
          command: "bun .kiro/tools/amadeus-utility.ts migrate --apply",
        },
      });

      expect(runAdapter(dir, "runtime-compile", runtimePayload("session-a")).code).toBe(0);
      expect(consumeMigrationStopLatch(dir, "session-a")).toBe(true);

      expect(runAdapter(dir, "runtime-compile", runtimePayload("session-a")).code).toBe(0);
      expect(
        runAdapter(dir, "stop", { ...(FIXTURES.stop as object), session_id: "session-b" }).code,
      ).toBe(0);
      expect(consumeMigrationStopLatch(dir, "session-a")).toBe(true);

      expect(runAdapter(dir, "runtime-compile", runtimePayload("session-a")).code).toBe(0);
      expect(
        runAdapter(dir, "stop", { ...(FIXTURES.stop as object), session_id: "session-a" }).code,
      ).toBe(0);
      expect(consumeMigrationStopLatch(dir, "session-a")).toBe(false);

      const rejectedSession = `kiro-rejected-${process.pid}-${Date.now()}`;
      const beforeRejected = projectSnapshot(dir);
      expect(
        runAdapter(dir, "runtime-compile", {
          ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
          session_id: rejectedSession,
          tool_input: {
            command: "bun .kiro/tools/amadeus-orchestrate.ts next --apply",
          },
          tool_response: {
            items: [
              {
                Text: JSON.stringify({
                  kind: "error",
                  message: "--apply is internal to the migration approval flow.",
                }),
              },
            ],
          },
        }).code,
      ).toBe(0);
      expect(consumeMigrationStopLatch(dir, rejectedSession)).toBe(true);
      expect(projectSnapshot(dir)).toBe(beforeRejected);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8b: migration Yes/No turns bypass project-local clocks until apply consumes the decision", () => {
    const dir = bareKiroProject();
    const sessionId = `kiro-gate-${process.pid}-${Date.now()}`;
    const initialPayload = {
      session_id: sessionId,
      prompt: "Run `bun .kiro/tools/amadeus-orchestrate.ts next --migrate` and relay it.",
    };
    try {
      const before = projectSnapshot(dir);
      expect(runAdapter(dir, "verb-intercept", initialPayload).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
      expect(projectSnapshot(dir)).toBe(before);

      const dryRun = {
        ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
        session_id: sessionId,
        tool_input: {
          command: "bun .kiro/tools/amadeus-utility.ts migrate --json",
        },
        tool_response: {
          items: [
            {
              Text: JSON.stringify({
                schemaVersion: 1,
                mode: "dry-run",
                status: "ready",
              }),
            },
          ],
        },
      };
      expect(runAdapter(dir, "runtime-compile", dryRun).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      expect(projectSnapshot(dir)).toBe(before);

      expect(runAdapter(dir, "verb-intercept", { session_id: sessionId, prompt: "Yes" }).code).toBe(
        0,
      );
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      expect(projectSnapshot(dir)).toBe(before);

      const apply = {
        ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
        session_id: sessionId,
        tool_input: {
          command: "bun .kiro/tools/amadeus-utility.ts migrate --apply",
        },
      };
      expect(runAdapter(dir, "runtime-compile", apply).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
      expect(projectSnapshot(dir)).toBe(before);
      expect(consumeMigrationStopLatch(dir, sessionId)).toBe(true);

      expect(runAdapter(dir, "verb-intercept", initialPayload).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
      expect(runAdapter(dir, "runtime-compile", dryRun).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      expect(runAdapter(dir, "verb-intercept", { session_id: sessionId, prompt: "2" }).code).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
      expect(projectSnapshot(dir)).toBe(before);
    } finally {
      consumeMigrationPendingDecision(dir, sessionId);
      consumeMigrationStopLatch(dir, sessionId);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8c: a pending migration marker protects only an exact fresh gate answer", () => {
    const dir = bareKiroProject();
    const sessionId = `kiro-non-answer-${process.pid}-${Date.now()}`;
    try {
      expect(
        runAdapter(dir, "verb-intercept", {
          session_id: sessionId,
          prompt: "Run `bun .kiro/tools/amadeus-orchestrate.ts next --migrate` and relay it.",
        }).code,
      ).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
      expect(
        runAdapter(dir, "runtime-compile", {
          ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
          session_id: sessionId,
          tool_input: {
            command: "bun .kiro/tools/amadeus-utility.ts migrate",
          },
          tool_response: {
            items: [
              {
                Text: JSON.stringify({
                  schemaVersion: 1,
                  mode: "dry-run",
                  status: "ready",
                }),
              },
            ],
          },
        }).code,
      ).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      expect(
        runAdapter(dir, "verb-intercept", {
          session_id: sessionId,
          prompt: "Yes, but show the report again",
        }).code,
      ).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      expect(existsSync(join(dir, "amadeus", ".amadeus-turn-counter"))).toBe(true);
    } finally {
      consumeMigrationPendingDecision(dir, sessionId);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8d: only canonical ready dry-run output arms; failure, absence, and lookalikes clear", () => {
    const dir = bareKiroProject();
    const sessionId = `kiro-ready-proof-${process.pid}-${Date.now()}`;
    const command = "bun .kiro/tools/amadeus-utility.ts migrate";
    const humanReady = [
      "AI-DLC v2 -> Amadeus workspace migration",
      "Mode: dry-run",
      "Status: ready",
      "Source: aidlc",
      "Destination: amadeus",
      "Source version: unknown",
      "Target: absent",
      "",
      "Checks:",
      "[pass] source: valid",
      "",
      "Operations:",
      '{"kind":"move","path":"aidlc","to":"amadeus"}',
      "",
      "No files were changed. Re-run with --apply only after explicit approval.",
    ].join("\n");
    const runDryRunResponse = (toolResponse?: unknown) =>
      runAdapter(dir, "runtime-compile", {
        ...(FIXTURES.postToolUse_shell as Record<string, unknown>),
        session_id: sessionId,
        tool_input: { command },
        ...(toolResponse === undefined ? {} : { tool_response: toolResponse }),
      });
    try {
      expect(
        runDryRunResponse({ items: [{ Text: humanReady }] }).code,
      ).toBe(0);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(true);
      consumeMigrationPendingDecision(dir, sessionId);

      const rejectedResponses: Array<[string, unknown | undefined]> = [
        ["missing", undefined],
        [
          "failed-json",
          {
            items: [
              {
                Text: JSON.stringify({
                  schemaVersion: 1,
                  mode: "dry-run",
                  status: "failed",
                }),
              },
            ],
          },
        ],
        ["fake-json", { items: [{ Text: '{"status":"ready"}' }] }],
        ["fake-human", { items: [{ Text: "command failed\nStatus: ready" }] }],
        [
          "nonzero-ready-lookalike",
          { items: [{ Text: `Command exited with code 1\n${humanReady}` }] },
        ],
        ["non-text", { items: [{ Json: { status: "ready" } }] }],
        [
          "ambiguous",
          {
            items: [
              {
                Text: JSON.stringify({
                  schemaVersion: 1,
                  mode: "dry-run",
                  status: "ready",
                }),
              },
              { Text: humanReady },
            ],
          },
        ],
      ];
      for (const [label, toolResponse] of rejectedResponses) {
        armMigrationPendingDecision(dir, sessionId);
        expect(`${label}:${runDryRunResponse(toolResponse).code}`).toBe(`${label}:0`);
        expect(`${label}:${peekMigrationPendingDecision(dir, sessionId)}`).toBe(
          `${label}:false`,
        );
      }
    } finally {
      consumeMigrationPendingDecision(dir, sessionId);
      consumeMigrationStopLatch(dir, sessionId);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8e: invalid public migration requests never arm a decision marker", () => {
    const dir = bareKiroProject();
    const sessionId = `kiro-invalid-migration-${process.pid}-${Date.now()}`;
    try {
      const before = projectSnapshot(dir);
      for (const args of [
        "--apply",
        "--migrate --apply",
        "--migrate --stage requirements-analysis",
      ]) {
        armMigrationPendingDecision(dir, sessionId);
        const run = runAdapter(dir, "verb-intercept", {
          session_id: sessionId,
          prompt: `Run \`bun .kiro/tools/amadeus-orchestrate.ts next ${args}\` and relay it.`,
        });
        expect(`${args}:${run.code}`).toBe(`${args}:0`);
        expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
        expect(projectSnapshot(dir)).toBe(before);
      }
    } finally {
      consumeMigrationPendingDecision(dir, sessionId);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8f: bare public apply exits before Kiro clocks or active-Intent presence minting", () => {
    const dir = scratchProject(true);
    const sessionId = `kiro-bare-apply-${process.pid}-${Date.now()}`;
    try {
      const before = projectSnapshot(dir);
      const run = runAdapter(dir, "verb-intercept", {
        session_id: sessionId,
        prompt: "Run `bun .kiro/tools/amadeus-orchestrate.ts next --apply` and relay it.",
      });
      expect(run.code).toBe(0);
      expect(run.stdout).toBe("");
      expect(projectSnapshot(dir)).toBe(before);
      expect(peekMigrationPendingDecision(dir, sessionId)).toBe(false);
    } finally {
      consumeMigrationPendingDecision(dir, sessionId);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10: session-start FORWARDS session_id — core hook stamps the per-session→intent record (M3)", () => {
    // M3: the Kiro adapter now forwards session_id when present, so the core
    // hook's per-session→intent STAMP is written (the session→intent record).
    // Proof: birth an intent (live cursor resolves a uuid), fire session-start
    // with a session_id in the payload, and assert the stamp file
    // amadeus/.amadeus-sessions/<session_id> was written with that uuid. Without
    // the forwarded session_id the core hook's `if (sessionId)` block is inert.
    const dir = scratchProject(true);
    try {
      const born = birthIntent(dir, "kiro-stamp", "default");
      const sid = "kiro-session-abc123";
      const r = runAdapter(dir, "session-start", { ...(FIXTURES.agentSpawn as object), session_id: sid });
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("AIDLC WORKFLOW ACTIVE");
      const stampPath = join(dir, "amadeus", ".amadeus-sessions", sid);
      expect(existsSync(stampPath)).toBe(true);
      expect(readFileSync(stampPath, "utf-8").trim()).toBe(born.uuid);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("11: resume-rebind OFFER is structurally unreachable on Kiro — every spawn is forced to source=startup (documented limitation)", () => {
    // Kiro's agentSpawn carries no resume discrimination: the adapter ALWAYS
    // forwards source=startup. So even with a genuine cursor drift seeded, a
    // "resume"-shaped payload can never trigger the core hook's SESSION_RESUMED
    // path → no INTENT REBIND OFFER. This is a harness limitation, not a bug;
    // the assertion pins it deterministically (no skip needed). Contrast t149/14
    // where Codex DOES forward a real source and the offer fires.
    const dir = scratchProject(true);
    try {
      const sid = "kiro-session-drift";
      const a = birthIntent(dir, "intent-a", "default");
      // First fire stamps the session to A (the live cursor at this point).
      const first = runAdapter(dir, "session-start", {
        ...(FIXTURES.agentSpawn as object),
        session_id: sid,
        source: "resume", // even a resume-shaped payload is coerced to startup
      });
      expect(first.code).toBe(0);
      const stampPath = join(dir, "amadeus", ".amadeus-sessions", sid);
      expect(readFileSync(stampPath, "utf-8").trim()).toBe(a.uuid);
      // Move the live cursor to B — a genuine drift A→B.
      birthIntent(dir, "intent-b", "default");
      // Fire again with a resume-shaped payload. Because Kiro coerces to
      // startup, the core hook takes the STARTED path (re-stamps to B), never
      // the RESUMED offer path.
      const second = runAdapter(dir, "session-start", {
        ...(FIXTURES.agentSpawn as object),
        session_id: sid,
        source: "resume",
      });
      expect(second.code).toBe(0);
      expect(second.stdout).not.toContain("INTENT REBIND OFFER");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("9: malformed stdin fails open (exit 0, no output) on every target", () => {
    const dir = scratchProject(true);
    try {
      for (const target of [
        "stop",
        "session-start",
        "state-sync",
        "audit-and-sensors",
        "runtime-compile",
        "log-subagent",
      ]) {
        const r = runAdapter(dir, target, "{not json");
        expect(`${target}:${r.code}`).toBe(`${target}:0`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // --- Stop-hook run-mode cap on Kiro (issue #365/#367 cross-harness coverage) ---
  //
  // Kiro's stop adapter (case "stop", amadeus-kiro-adapter.ts:303-314) synthesizes
  // {hook_event_name:"Stop", stop_hook_active:false} with NO transcript_path. So
  // the core hook's conversational carve-out (tier 3) is structurally inert on
  // Kiro: the RUN-MODE-AWARE no-progress cap (blockCap, amadeus-stop.ts:122-137) is
  // the ONLY release path for a chatting / pausing human. These two tests pin
  // that contract deterministically:
  //   - interactive (no autonomy field) -> cap 2: a 2nd identical no-progress
  //     stop RELEASES (the human is freed after one nudge).
  //   - autonomous Construction -> cap 8: still blocks on call 3 (an unattended
  //     run keeps the loop alive; only a real hang ever hits 8).
  // The per-project guard counter persists under the active record's
  // .amadeus-stop-hook/block-count.json (stopHookDir, amadeus-lib.ts:1620), so the
  // SAME scratch project is reused across the repeated calls - consecutive
  // no-progress blocks at one unchanging signature, which is exactly what the
  // counter measures.

  /** Run the kiro adapter stop target with CLAUDE_CODE_STOP_HOOK_BLOCK_CAP
   *  explicitly REMOVED, so the mode-aware default cap applies regardless of the
   *  test runner's environment (a leaked override would mask the contract). The
   *  adapter itself never sets the var (verified: amadeus-kiro-adapter.ts builds
   *  {hook_event_name,stop_hook_active} only), and the core hook reads it from
   *  the inherited process env (amadeus-stop.ts:123). */
  function runStopNoCapEnv(projectDir: string): { stdout: string; code: number } {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };
    delete (env as Record<string, string | undefined>).CLAUDE_CODE_STOP_HOOK_BLOCK_CAP;
    const r = spawnSync(
      "bun",
      [join(projectDir, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), "stop"],
      {
        cwd: projectDir,
        // The kiro adapter ignores stdin for the stop target (it synthesizes the
        // payload itself), but feed an empty object for shape parity.
        input: "{}",
        encoding: "utf-8",
        env,
        timeout: 30_000,
      },
    );
    return { stdout: r.stdout ?? "", code: r.status ?? -1 };
  }

  test("12: INTERACTIVE CAP RELEASE - Kiro stop blocks once then releases at the default cap 2 (no transcript -> cap is the chat release path)", () => {
    // Interactive: state has NO Construction Autonomy Mode field, so the
    // mode-aware default cap is INTERACTIVE_BLOCK_CAP=2. The brownfield-feature
    // fixture (Current Stage requirements-analysis [-], no [?]/[R] carve-out, no
    // questions file) yields a pending run-stage, so without the cap the hook
    // would block forever. Repeated identical no-progress stops at the same
    // signature: block on call 1, RELEASE on call 2 (count reaches 2 == cap).
    const dir = scratchProject(true);
    try {
      // Guard the premise: the override must NOT be set in this process (the
      // adapter never sets it, and runStopNoCapEnv strips it for the subprocess).
      expect(process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP).toBeUndefined();

      const first = runStopNoCapEnv(dir);
      expect(first.code).toBe(0);
      const out1 = JSON.parse(first.stdout) as { decision?: string; reason?: string };
      expect(out1.decision).toBe("block");
      expect(out1.reason ?? "").not.toBe("");

      const second = runStopNoCapEnv(dir);
      expect(second.code).toBe(0);
      // At cap 2 the 2nd no-progress block RELEASES: silent allow, no decision.
      expect(second.stdout.trim()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("13: AUTONOMOUS KEEPS CAP 8 - Kiro stop still blocks on call 3 under autonomous Construction (the long ceiling, not the interactive 2)", () => {
    // Autonomous Construction (Construction Autonomy Mode: autonomous) keeps the
    // long ceiling AUTONOMOUS_BLOCK_CAP=8. Same brownfield-feature engine state
    // (pending run-stage) but the autonomy field injected, so the carve-outs are
    // all gated off and only the cap can release. Three consecutive no-progress
    // stops: all three BLOCK (count 1,2,3 < 8). We bound the loop well short of 8.
    const dir = scratchProject(true);
    try {
      expect(process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP).toBeUndefined();
      // Inject the autonomy field as a bullet line in ## Current Status (getField
      // matches `- **Field**: value`, amadeus-lib.ts:1913). The base fixture has no
      // such field; adding it flips defaultBlockCap to 8 without changing the
      // engine's pending directive (Current Stage is unchanged).
      const statePath = seededStateFile(dir);
      const base = readFileSync(statePath, "utf-8");
      writeFileSync(
        statePath,
        base.replace(
          /^- \*\*Status\*\*: Running$/m,
          "- **Status**: Running\n- **Construction Autonomy Mode**: autonomous",
        ),
        "utf-8",
      );
      // Confirm the field landed (premise guard).
      expect(/Construction Autonomy Mode\*\*: autonomous/.test(readFileSync(statePath, "utf-8"))).toBe(
        true,
      );

      for (let call = 1; call <= 3; call++) {
        const r = runStopNoCapEnv(dir);
        expect(r.code).toBe(0);
        const out = JSON.parse(r.stdout) as { decision?: string };
        expect(`call${call}:${out.decision}`).toBe(`call${call}:block`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// #822: the adapter's runCore must forward the PAYLOAD cwd to the core-hook
// subprocess (symmetric to the codex adapter's `cwd: projectDir`). Under a
// worktree session the hook SCRIPTS live in the main checkout (scriptHome) while
// the engine — and the record it writes — is the worktree (payloadCwd). With NO
// CLAUDE_PROJECT_DIR env the core hook resolves projectDir from process.cwd(), so
// it must inherit the payload cwd; pre-fix runCore dropped cwd and the core hook
// synced the WRONG workspace's state file.
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
      input: typeof payload === "string" ? payload : JSON.stringify(payload),
      encoding: "utf-8",
      env,
      timeout: 30_000,
    },
  );
  return { stdout: r.stdout ?? "", code: r.status ?? -1 };
}

describe("t147 Kiro adapter — runCore forwards the payload cwd (#822)", () => {
  test("14: state-sync resolves the payload workspace, not the adapter launch dir", () => {
    const scriptHome = scratchProject(true); // 'main checkout': scripts + marker + state
    const payloadCwd = scratchProject(true); // 'worktree': the real record the engine wrote from
    try {
      // Adapter launched from scriptHome (its process.cwd()), payload names payloadCwd.
      const r = runAdapterFrom(scriptHome, scriptHome, "state-sync", {
        hook_event_name: "PostToolUse",
        cwd: payloadCwd,
        tool_name: "todo_list",
        tool_input: {
          command: "create",
          tasks: [{ task_description: "Running User Stories [user-stories]" }],
        },
      });
      expect(r.code).toBe(0);
      // E-SMF-CG1 (#1170): target a FORWARD stage (user-stories, pending in the
      // seed) so the write lands — it also differs from the seed's Current Stage
      // (requirements-analysis), keeping the payloadCwd-vs-scriptHome
      // discrimination sharp. The payload workspace's state must be the one that
      // syncs.
      const payloadState = readFileSync(seededStateFile(payloadCwd), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*user-stories/.test(payloadState)).toBe(true);
      // And the launch-dir workspace must be left untouched (pre-fix it synced here).
      const scriptState = readFileSync(seededStateFile(scriptHome), "utf-8");
      expect(/\*\*Current Stage\*\*:\s*requirements-analysis/.test(scriptState)).toBe(true);
    } finally {
      rmSync(scriptHome, { recursive: true, force: true });
      rmSync(payloadCwd, { recursive: true, force: true });
    }
  });
});
