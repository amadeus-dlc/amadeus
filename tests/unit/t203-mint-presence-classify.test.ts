// covers: hook:amadeus-mint-presence
//
// t203 — the UserPromptSubmit mint hook must classify its stdin payload before
// recording HUMAN_TURN (issue #708).
//
// THE DEFECT. amadeus-mint-presence.ts used to mint a HUMAN_TURN unconditionally
// on every fire, reading nothing from stdin. But Claude Code fires
// UserPromptSubmit for machine-injected, turn-starting user-role messages too
// (agmsg monitor task-notifications), so those minted a phantom HUMAN_TURN and
// the human-presence gate (humanActedSinceGate) went false-positive — measured
// 12/12 correlation in a live session with zero physical keystrokes.
//
// THE CONTRACT this pins:
//   - a machine-injected payload (prompt starts with "<task-notification>") does
//     NOT mint HUMAN_TURN.
//   - a genuine human prompt (ordinary prompt text) mints exactly one HUMAN_TURN.
//   - FAIL-OPEN: empty stdin / non-JSON / prompt-absent all still MINT — a read
//     failure must never rob a real human of their presence. The hook always
//     exits 0.
//   - PRIVACY: the prompt body is classified in memory only; it is never written
//     to the audit shard.
//
// Mechanism: cli (PROCESS boundary). We spawn the SHIPPED hook
// (dist/claude/.claude/hooks/amadeus-mint-presence.ts) with a fixture project as
// CLAUDE_PROJECT_DIR and feed the UserPromptSubmit JSON on stdin, then read back
// the fixture's audit shard — exactly the path Claude Code drives.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const BUN = process.execPath;
const MINT = join(AMADEUS_SRC, "hooks", "amadeus-mint-presence.ts");
const MID_IDEATION = "state-mid-ideation.md";

// The real UserPromptSubmit stdin shape (measured live, issue #708): 7 fields,
// no injection-source flag. Only `prompt` distinguishes machine from human.
function hookInput(prompt: string): string {
  return JSON.stringify({
    session_id: "sess-1",
    transcript_path: "/tmp/transcript.jsonl",
    cwd: "/tmp/proj",
    prompt_id: "pid-1",
    permission_mode: "default",
    hook_event_name: "UserPromptSubmit",
    prompt,
  });
}

// Fire the shipped mint hook with the given stdin (a string, or null to feed an
// empty pipe). Returns exit code. CLAUDE_PROJECT_DIR points the hook at the
// fixture (resolveProjectDirFromHook rung 1), so it writes the fixture's shard.
function mint(proj: string, stdin: string | null): number {
  const r = spawnSync(BUN, [MINT], {
    encoding: "utf-8",
    input: stdin ?? "",
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
  });
  return r.status ?? -1;
}

function humanTurnCount(proj: string): number {
  return readAllAuditShards(proj)
    .split("\n")
    .filter((l) => l === "**Event**: HUMAN_TURN").length;
}

let proj: string;

describe("t203: mint-presence classifies stdin before minting HUMAN_TURN (#708)", () => {
  beforeEach(() => {
    resetAidlcEnv();
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION); // state present -> the hook's self-gate passes
  });

  afterEach(() => cleanupTestProject(proj));

  // --- The bug: machine-injected turn does NOT mint ---------------------------
  //
  // RED on the pre-fix hook (it minted unconditionally). GREEN after the fix.
  test("machine-injected task-notification does NOT mint HUMAN_TURN", () => {
    const rc = mint(proj, hookInput("<task-notification>\ntask-id: abc123\n..."));
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(0);
  });

  // --- The genuine human turn still mints exactly one -------------------------
  test("a genuine human prompt mints exactly one HUMAN_TURN", () => {
    const rc = mint(proj, hookInput("please approve the feasibility gate"));
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(1);
  });

  // --- FAIL-OPEN: a read/parse failure must not rob a real human --------------
  test("empty stdin FAILS OPEN — mints one HUMAN_TURN", () => {
    const rc = mint(proj, null);
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(1);
  });

  test("non-JSON stdin FAILS OPEN — mints one HUMAN_TURN", () => {
    const rc = mint(proj, "this is not json {{{");
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(1);
  });

  test("JSON without a prompt field FAILS OPEN — mints one HUMAN_TURN", () => {
    const rc = mint(proj, JSON.stringify({ session_id: "s", hook_event_name: "UserPromptSubmit" }));
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(1);
  });

  // --- PRIVACY: the prompt body is never persisted ----------------------------
  test("the prompt body is not written to the audit shard", () => {
    const secret = "SENSITIVE-PROMPT-MARKER-9f3a";
    const rc = mint(proj, hookInput(`draft the plan for ${secret}`));
    expect(rc).toBe(0);
    expect(humanTurnCount(proj)).toBe(1);
    expect(readAllAuditShards(proj)).not.toContain(secret);
  });

  // --- Self-gate preserved: no workflow state -> no mint, still exit 0 --------
  test("no amadeus-state.md -> no mint, exit 0 (self-gate unchanged)", () => {
    const bare = createTestProject(); // no seedStateFile
    try {
      const rc = mint(bare, hookInput("hello"));
      expect(rc).toBe(0);
      expect(humanTurnCount(bare)).toBe(0);
    } finally {
      cleanupTestProject(bare);
    }
  });
});
