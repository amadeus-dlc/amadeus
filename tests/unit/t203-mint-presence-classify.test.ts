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

import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  isMachineInjectedTurnText,
  MACHINE_INJECTED_TURN_MARKERS,
  readAllAuditShards,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  advisoryChoicePresentationFields,
  closeAdvisoryInstancesForStage,
  guardAdvisoryChoices,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
} from "../../plugins/formal-model-check/tools/run-model-check-artifacts.ts";
import { buildEnvReceipt, passedInspection } from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";

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
    .filter((l) => l.trim() !== "")
    .map((l) => normalizeAuditRecord(JSON.parse(l)) as { event: string | null })
    .filter((r) => r.event === "HUMAN_TURN").length;
}

const formalAdvisory = {
  plugin: "formal-model-check",
  code: "changed" as const,
  message: "advisory: formal-model-check spec hash CHANGED",
  stage: "functional-design",
  target: "specs/tla",
  specIdentity: "sha256:abc",
};

function publishAdvisoryOutcome(
  proj: string,
  route: { output_dir: string; advisory_instance: string },
  outcome: "NOT_DETECTED" | "DETECTED" | "HARNESS_ERROR",
): void {
  const model = join(proj, "specs/tla/FormalElection.tla");
  const cfg = join(proj, "specs/tla/FormalElection.cfg");
  mkdirSync(join(proj, "specs/tla"), { recursive: true });
  writeFileSync(model, "---- MODULE FormalElection ----\n====\n");
  writeFileSync(cfg, "SPECIFICATION Spec\n");
  const runId = "00000000-0000-4000-8000-000000000001";
  const workspace = beginModelCheckArtifacts(route.output_dir, runId);
  if (!workspace.ok) throw new Error(workspace.error.detail);
  const published = publishModelCheckArtifacts({
    workspace: workspace.value,
    outcome: outcome === "NOT_DETECTED"
      ? { kind: "NOT_DETECTED" }
      : outcome === "DETECTED"
      ? { kind: "DETECTED", counterexampleIdentity: "counterexample-1" }
      : { kind: "HARNESS_ERROR", code: "TLC_START_FAILED", detail: "synthetic harness failure" },
    exitCode: outcome === "NOT_DETECTED" ? 0 : outcome === "DETECTED" ? 1 : 2,
    environmentReceipt: buildEnvReceipt(runId, "test", [
      passedInspection("network-deny", "deny"),
    ]),
    stdout: new TextEncoder().encode("complete"),
    stderr: new Uint8Array(),
    startedAt: "2026-08-03T12:00:00.000Z",
    finishedAt: "2026-08-03T12:00:01.000Z",
    advisory: {
      target: formalAdvisory.target,
      specIdentity: formalAdvisory.specIdentity,
      instance: route.advisory_instance,
    },
    sourceProvenance: {
      modelPath: "specs/tla/FormalElection.tla",
      cfgPath: "specs/tla/FormalElection.cfg",
      moduleIdentity: "registered-module",
      cfgIdentity: "registered-cfg",
      moduleSha256: createHash("sha256").update(readFileSync(model)).digest("hex"),
      cfgSha256: createHash("sha256").update(readFileSync(cfg)).digest("hex"),
    },
  });
  if (!published.ok) throw new Error(published.error.detail);
}

type StoredReceipt = {
  identity: { advisoryInstance: string };
  choice: string;
  provenance: { kind: string; eventIdentity?: string };
};

// #2253 moved the receipt's binding under a provenance union; what these tests
// pin is that two receipts for one instance came from two DIFFERENT human turns,
// which is still the human-turn arm's event identity.
function humanTurnIdentityOf(receipt: StoredReceipt | undefined): string | undefined {
  return receipt?.provenance.kind === "human-turn" ? receipt.provenance.eventIdentity : undefined;
}

function advisoryReceipts(proj: string): StoredReceipt[] {
  const store = JSON.parse(
    readFileSync(join(seededRecordDir(proj), ".amadeus-advisory-choice.json"), "utf-8"),
  ) as { receipts: StoredReceipt[] };
  return store.receipts;
}

function presentPendingAdvisory(proj: string, stage: string): void {
  const store = JSON.parse(
    readFileSync(join(seededRecordDir(proj), ".amadeus-advisory-choice.json"), "utf-8"),
  ) as { pending: Array<{ closedAt?: string; identity: { checkpoint: string; advisoryInstance: string } }> };
  const instances = store.pending
    .filter((pending) => pending.closedAt === undefined && pending.identity.checkpoint === stage)
    .map((pending) => pending.identity.advisoryInstance);
  const fields = advisoryChoicePresentationFields(proj, stage, instances);
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, proj);
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

  test("列挙済みchoiceだけがpending advisory receiptになりholdを解除する", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("リスクを承知して延期する"))).toBe(0);
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("raw plain exact choice carrierは同じhook呼出しでHUMAN_TURNとreceiptを相関する", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
    presentPendingAdvisory(proj, "functional-design");

    expect(mint(proj, "1")).toBe(0);

    expect(humanTurnCount(proj)).toBe(1);
    expect(advisoryReceipts(proj)).toHaveLength(1);
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
  });

  test.each(["2", "リスクを承知して延期する"])(
    "raw defer choice carrier %s はfresh receiptとして相関する",
    (carrier) => {
      expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
      presentPendingAdvisory(proj, "functional-design");

      expect(mint(proj, carrier)).toBe(0);

      expect(humanTurnCount(proj)).toBe(1);
      expect(advisoryReceipts(proj).map((receipt) => receipt.choice)).toEqual(["defer-with-risk"]);
      expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
    },
  );

  test("non-choice raw carrierはHUMAN_TURNだけをmintしreceipt化しない", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");

    expect(mint(proj, "continue without a formal choice")).toBe(0);

    expect(humanTurnCount(proj)).toBe(1);
    expect(advisoryReceipts(proj)).toHaveLength(0);
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
  });

  test("run-nowは検証済みNOT_DETECTED後だけholdを解除する", () => {
    const first = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (first.kind !== "hold") throw new Error("expected hold");
    const instance = first.advisories[0]!.advisory_instance;
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    expect(routed.runRequired).toBe(true);
    expect(routed.formalChecks[0]?.advisory_instance).toBe(instance);
    publishAdvisoryOutcome(proj, routed.formalChecks[0]!, "NOT_DETECTED");
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("run-now待機中の別gate choiceは重複receiptやretry attemptを作らない", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    expect(routed.formalChecks[0]?.output_dir).not.toContain("-retry-");

    expect(mint(proj, "1")).toBe(0);

    expect(advisoryReceipts(proj).map((receipt) => receipt.choice)).toEqual(["run-now"]);
    const stillRouted = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (stillRouted.kind !== "hold") throw new Error("expected original run route");
    expect(stillRouted.formalChecks[0]?.output_dir).toBe(routed.formalChecks[0]?.output_dir);
  });

  test("検証済みNOT_DETECTED後のapproval 1は重複run-now receiptを作らない", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    publishAdvisoryOutcome(proj, routed.formalChecks[0]!, "NOT_DETECTED");
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });

    expect(mint(proj, "1")).toBe(0);

    expect(advisoryReceipts(proj).map((receipt) => receipt.choice)).toEqual(["run-now"]);
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("旧adapterがNOT_DETECTED後に作った重複receiptは検証済みattemptを無効化しない", () => {
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("hold");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    publishAdvisoryOutcome(proj, routed.formalChecks[0]!, "NOT_DETECTED");

    const storePath = join(seededRecordDir(proj), ".amadeus-advisory-choice.json");
    const store = JSON.parse(readFileSync(storePath, "utf-8")) as { receipts: Array<Record<string, unknown>> };
    const first = store.receipts[0] as Record<string, unknown>;
    store.receipts.push({
      ...first,
      humanTurn: {
        timestamp: "2026-08-03T12:01:00Z",
        shard: "host-clone.jsonl",
        eventIdentity: "legacy-duplicate-human-turn",
      },
      recordedAt: "2026-08-03T12:01:00Z",
    });
    writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`);

    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("DETECTED後のfresh run-nowは同一instanceのretry NOT_DETECTEDだけで解除する", () => {
    const first = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (first.kind !== "hold") throw new Error("expected initial hold");
    const instance = first.advisories[0]!.advisory_instance;
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    publishAdvisoryOutcome(proj, routed.formalChecks[0]!, "DETECTED");
    const detected = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (detected.kind !== "hold") throw new Error("expected detected hold");
    expect(detected.runRequired).toBe(false);
    expect(detected.advisories[0]?.result).toContain("counterexample-1");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const retry = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (retry.kind !== "hold") throw new Error("expected retry route");
    expect(retry.runRequired).toBe(true);
    expect(retry.formalChecks[0]?.advisory_instance).toBe(instance);
    expect(retry.formalChecks[0]?.output_dir).toEndWith("-retry-2");
    const receipts = advisoryReceipts(proj);
    expect(receipts.map((receipt) => receipt.choice)).toEqual(["run-now", "run-now"]);
    expect(receipts.every((receipt) => receipt.identity.advisoryInstance === instance)).toBe(true);
    expect(humanTurnIdentityOf(receipts[0])).not.toBe(humanTurnIdentityOf(receipts[1]));
    publishAdvisoryOutcome(proj, retry.formalChecks[0]!, "NOT_DETECTED");
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("HARNESS_ERROR後は同一instanceへのfresh deferだけで解除できる", () => {
    const first = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (first.kind !== "hold") throw new Error("expected initial hold");
    const instance = first.advisories[0]!.advisory_instance;
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("今すぐ実行する"))).toBe(0);
    const routed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (routed.kind !== "hold") throw new Error("expected run route");
    publishAdvisoryOutcome(proj, routed.formalChecks[0]!, "HARNESS_ERROR");
    const failed = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (failed.kind !== "hold") throw new Error("expected harness error hold");
    expect(failed.advisories[0]?.advisory_instance).toBe(instance);
    expect(failed.advisories[0]?.result).toContain("HARNESS_ERROR TLC_START_FAILED");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("リスクを承知して延期する"))).toBe(0);
    const receipts = advisoryReceipts(proj);
    expect(receipts.map((receipt) => receipt.choice)).toEqual(["run-now", "defer-with-risk"]);
    expect(receipts.every((receipt) => receipt.identity.advisoryInstance === instance)).toBe(true);
    expect(humanTurnIdentityOf(receipts[0])).not.toBe(humanTurnIdentityOf(receipts[1]));
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory])).toEqual({ kind: "allow" });
  });

  test("stage完了後の同一発火は新しいinstanceになる", () => {
    const first = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (first.kind !== "hold") throw new Error("expected hold");
    presentPendingAdvisory(proj, "functional-design");
    expect(mint(proj, hookInput("リスクを承知して延期する"))).toBe(0);
    expect(guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]).kind).toBe("allow");
    closeAdvisoryInstancesForStage(proj, "functional-design");
    const repeated = guardAdvisoryChoices(proj, "functional-design", [formalAdvisory]);
    if (repeated.kind !== "hold") throw new Error("expected repeated hold");
    expect(repeated.advisories[0]?.advisory_instance).not.toBe(first.advisories[0]?.advisory_instance);
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
