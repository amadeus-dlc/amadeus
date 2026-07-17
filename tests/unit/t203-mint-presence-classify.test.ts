// covers: hook:amadeus-mint-presence, function:isMachineInjectedTurnText, function:MACHINE_INJECTED_TURN_MARKERS
//
// t203 — the UserPromptSubmit mint hook must classify its stdin payload before
// recording HUMAN_TURN (issue #708, reopened by #755).
//
// THE DEFECT. amadeus-mint-presence.ts used to mint a HUMAN_TURN unconditionally
// on every fire, reading nothing from stdin. But Claude Code fires
// UserPromptSubmit for machine-injected, turn-starting user-role messages too
// (agmsg Monitor task-notifications, teammate-message inbox deliveries), so
// those minted a phantom HUMAN_TURN and the human-presence gate
// (humanActedSinceGate) went false-positive — measured 12/12 correlation in a
// live session with zero physical keystrokes. #708's first fix matched only a
// bare `startsWith("<task-notification>")` and so still missed the
// preamble-prefixed and teammate-message forms (#755).
//
// THE CONTRACT this pins:
//   - EVERY machine-injection form in the shared MACHINE_INJECTED_TURN_MARKERS
//     catalog (task-notification, teammate-message, and the two preamble lines),
//     including preamble-prefixed variants where the marker sits at offset>0,
//     does NOT mint HUMAN_TURN.
//   - a genuine human prompt (ordinary prompt text) mints exactly one HUMAN_TURN.
//   - FAIL-OPEN: empty stdin / non-JSON / prompt-absent all still MINT — a read
//     failure must never rob a real human of their presence. The hook always
//     exits 0.
//   - PRIVACY: the prompt body is classified in memory only; it is never written
//     to the audit shard.
//
// Mechanism: cli (PROCESS boundary) for the shipped-hook cases; plus an
// in-process block that calls the shared classifier directly (the logic lives in
// amadeus-lib so it is covered without a spawn). We spawn the SHIPPED hook
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
import {
  isMachineInjectedTurnText,
  MACHINE_INJECTED_TURN_MARKERS,
  readAllAuditShards,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// The four live-observed machine-injection forms (measured 2026-07-10, #755).
// Derived from the shared catalog so a marker rename cannot leave a stale copy
// here; the preamble forms extend the bare marker with the trailing body the
// harness actually delivers, exercising offset>0 detection.
const TASK_NOTIFICATION_FORM = `${MACHINE_INJECTED_TURN_MARKERS[0]}\ntask-id: abc123\n...`;
const TEAMMATE_TAG_FORM = `${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">assign task 1</teammate-message>`;
const TEAMMATE_PREAMBLE_FORM = `${MACHINE_INJECTED_TURN_MARKERS[2]}\n${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">start on task #1</teammate-message>`;
const SYSTEM_NOTIFICATION_FORM = `${MACHINE_INJECTED_TURN_MARKERS[3]}\nAn event fired.\n<task-notification>event: build-done</task-notification>`;
// herdr team-msg send header (#1142): the marker is a stable prefix; the from
// role is the only variable part and sits inside the leading line.
const TEAM_MSG_FORM = `${MACHINE_INJECTED_TURN_MARKERS[4]}from:e3 via:herdr machine]\nack: received your dispatch`;
const CATALOG_FORMS: ReadonlyArray<readonly [string, string]> = [
  ["task-notification", TASK_NOTIFICATION_FORM],
  ["teammate-message tag", TEAMMATE_TAG_FORM],
  ["teammate-message preamble", TEAMMATE_PREAMBLE_FORM],
  ["system-notification preamble", SYSTEM_NOTIFICATION_FORM],
  ["team-msg herdr header", TEAM_MSG_FORM],
];

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

  // --- The bug: EVERY machine-injected form does NOT mint ---------------------
  //
  // RED on the #708 prefix-only hook for the preamble / teammate-message forms
  // (it minted a phantom HUMAN_TURN, #755). GREEN after the shared-catalog fix.
  for (const [name, form] of CATALOG_FORMS) {
    test(`machine-injected ${name} does NOT mint HUMAN_TURN`, () => {
      const rc = mint(proj, hookInput(form));
      expect(rc).toBe(0);
      expect(humanTurnCount(proj)).toBe(0);
    });
  }

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

// The shared classifier, in-process (no spawn). The mint hook and the Stop
// hook's tier-3 carve-out both delegate to isMachineInjectedTurnText, so this
// pins the catalog logic directly — the coverage the spawn cases cannot give.
describe("t203: isMachineInjectedTurnText classifies the shared catalog (#755)", () => {
  test("every catalog marker as the opening bytes is machine-injected", () => {
    for (const marker of MACHINE_INJECTED_TURN_MARKERS) {
      expect(isMachineInjectedTurnText(marker)).toBe(true);
    }
  });

  test("every live-observed form (incl. offset>0 markers) is machine-injected", () => {
    for (const [, form] of CATALOG_FORMS) {
      expect(isMachineInjectedTurnText(form)).toBe(true);
    }
  });

  test("a genuine human prompt is NOT machine-injected", () => {
    expect(isMachineInjectedTurnText("hello")).toBe(false);
    expect(isMachineInjectedTurnText("please approve the feasibility gate")).toBe(false);
    expect(isMachineInjectedTurnText("")).toBe(false);
  });

  // #1142: the herdr team-msg header must be caught, but a human typing prose
  // that merely mentions team-msg (without the leading marker) must not be.
  test("team-msg herdr header is machine-injected; prose mentioning it is not", () => {
    expect(isMachineInjectedTurnText("[team-msg from:leader via:herdr machine]\ngo")).toBe(true);
    expect(isMachineInjectedTurnText("I sent a team-msg to e3 earlier")).toBe(false);
    expect(isMachineInjectedTurnText("[team-message from:x]")).toBe(false);
  });

  test("ASCII prefix: marker start byte offset 255 is detected and 256 is not", () => {
    const marker = MACHINE_INJECTED_TURN_MARKERS[0];
    expect(isMachineInjectedTurnText(`${"x".repeat(255)}${marker}`)).toBe(true);
    expect(isMachineInjectedTurnText(`${"x".repeat(256)}${marker}`)).toBe(false);
  });

  test("multi-byte prefix: marker start UTF-8 byte offset 255 is detected and 256 is not", () => {
    const marker = MACHINE_INJECTED_TURN_MARKERS[0];
    const byte255Prefix = "あ".repeat(85);
    const byte256Prefix = `${byte255Prefix}x`;
    expect(isMachineInjectedTurnText(`${byte255Prefix}${marker}`)).toBe(true);
    expect(isMachineInjectedTurnText(`${byte256Prefix}${marker}`)).toBe(false);
  });
});
