// covers: file:packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts, function:mintHumanPresence, subcommand:amadeus-log:answer, subcommand:amadeus-bolt:set-autonomy
// size: medium
//
// t514 — the Codex presence chain a live hooks.json buys you (issue #2703).
//
// The #2703 deadlock is an ABSENCE: with no `.codex/hooks.json`, Codex never
// invokes the adapter, so the UserPromptSubmit → `mint` target never runs and
// the audit ledger holds no HUMAN_TURN. t513 closes the absence at `next`. This
// test pins the other half of the claim — that the chain the guard protects
// actually works once the adapter IS invoked: one mint records exactly one
// HUMAN_TURN, and that single event is enough provenance for BOTH human
// checkpoints the issue names (`amadeus-log answer`, `amadeus-bolt
// set-autonomy --mode semi`).
//
// Mechanism: subprocess, twice over. The adapter is a stdin shim, so it is
// exercised through its real stdin/exit surface off the built Codex tree (the
// t149 idiom). The two checkpoint commands are spawned with
// AMADEUS_SKIP_HUMAN_PRESENCE_GUARD DELETED from the child env — the suite sets
// it globally, and with it set this test would be measuring the bypass rather
// than the guard (the t188 harness note).

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanupTestProject,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  findAllEvents,
  readAllAuditShards,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const BUN = process.execPath;
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODEX_TREE = join(REPO_ROOT, "dist", "codex", ".codex");

/** Spawn a `.claude` tool with the presence guard ENABLED (the suite-wide
 *  bypass removed) but the artifact guard still bypassed — a separate
 *  chokepoint these bare fixtures do not satisfy. */
function guarded(proj: string, tool: string, args: string[]): { rc: number; out: string } {
  const env = { ...process.env };
  env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  const r = spawnSync(BUN, [join(proj, ".claude", "tools", tool), ...args, "--project-dir", proj], {
    cwd: proj,
    encoding: "utf-8",
    env,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function bornCodexProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  cpSync(CODEX_TREE, join(proj, ".codex"), { recursive: true });
  const birth = spawnSync(
    BUN,
    [
      join(proj, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      proj,
    ],
    { cwd: proj, encoding: "utf-8", env: { ...process.env } },
  );
  expect(birth.status ?? -1).toBe(0);
  return proj;
}

/** Drive the Codex adapter's UserPromptSubmit target exactly as hooks.json
 *  wires it: `bun .codex/hooks/amadeus-codex-adapter.ts mint` with the payload
 *  on stdin. */
function runMint(proj: string, prompt: string, sessionId: string): number {
  const r = spawnSync(
    BUN,
    [join(proj, ".codex", "hooks", "amadeus-codex-adapter.ts"), "mint"],
    {
      cwd: proj,
      input: JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: sessionId,
        turn_id: `turn-${sessionId}`,
        cwd: proj,
        prompt,
      }),
      encoding: "utf-8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: undefined } as NodeJS.ProcessEnv,
      timeout: 30_000,
    },
  );
  return r.status ?? -1;
}

function humanTurns(proj: string): number {
  return findAllEvents(readAllAuditShards(proj), "HUMAN_TURN").length;
}

function currentStage(proj: string): string {
  return guarded(proj, "amadeus-state.ts", ["get", "Current Stage"]).out.trim();
}

let proj = "";
afterEach(() => {
  resetOtelPerProject();
  if (proj) cleanupTestProject(proj);
  proj = "";
});

describe("t514 Codex mint → human checkpoints (#2703)", () => {
  test("one adapter mint records exactly one HUMAN_TURN", () => {
    proj = bornCodexProject();
    expect(humanTurns(proj)).toBe(0);

    expect(runMint(proj, "please continue with the workflow", "codex-session-514a")).toBe(0);

    expect(humanTurns(proj)).toBe(1);
  });

  test("that HUMAN_TURN satisfies the answer provenance guard", () => {
    proj = bornCodexProject();
    const stage = currentStage(proj);
    expect(stage).not.toBe("");

    // Without a HUMAN_TURN the ledger has events (birth) but no presence, so
    // the guard refuses — the #2703 symptom, verbatim.
    const before = guarded(proj, "amadeus-log.ts", [
      "answer",
      "--stage",
      stage,
      "--details",
      "an answer with no minted presence",
    ]);
    expect(before.rc).not.toBe(0);
    expect(before.out).toContain("a real human has not acted");

    expect(runMint(proj, "here is my answer to the checkpoint", "codex-session-514b")).toBe(0);

    const after = guarded(proj, "amadeus-log.ts", [
      "answer",
      "--stage",
      stage,
      "--details",
      "an answer backed by a minted human turn",
    ]);
    expect(after.rc).toBe(0);
    expect(findAllEvents(readAllAuditShards(proj), "QUESTION_ANSWERED").length).toBe(1);
  });

  test("that HUMAN_TURN satisfies the set-autonomy provenance guard", () => {
    proj = bornCodexProject();

    const before = guarded(proj, "amadeus-bolt.ts", ["set-autonomy", "--mode", "semi"]);
    expect(before.rc).not.toBe(0);
    expect(before.out).toContain("PROVENANCE_REQUIRED");

    expect(runMint(proj, "switch this intent to semi autonomy", "codex-session-514c")).toBe(0);

    const after = guarded(proj, "amadeus-bolt.ts", ["set-autonomy", "--mode", "semi"]);
    expect(after.rc).toBe(0);
    expect(after.out).toContain("INTENT_AUTONOMY_TRANSACTION_COMMITTED");
  });
});
