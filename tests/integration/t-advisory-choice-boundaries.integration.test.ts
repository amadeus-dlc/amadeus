// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: medium
//
// The advisory choice store is the record of who answered what, and on what
// evidence. Every guard here exists because the alternative is an answer that
// nobody can attribute:
//
//   * a receipt on disk is PARSED, not trusted — a field that cannot be read is
//     a refusal, never a default;
//   * a human answer must be grounded in this clone's own audit trail AND
//     preceded by a presentation of the very advisory it answers;
//   * the one correction path (a run-now receipt attributed to a turn that was
//     never shown the question) is fenced on every side and marks the receipt
//     revoked rather than deleting it.
//
// Driven through the module's exported seams against real temp projects, so the
// refusal a caller would actually see is the thing under test.

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  advisoryChoicePresentationFields,
  choiceFromExactPrompt,
  guardAdvisoryChoices,
  parseAdvisoryChoiceReceipt,
  recordAdvisoryChoice,
  revokeMisattributedAdvisoryChoice,
  type AdvisoryChoiceStore,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  FIXTURE_ADVISORY_CODE,
  FIXTURE_PLUGIN,
  composeFixturePlugin,
  installFixturePlugin,
} from "../harness/conformance-fixture.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

const CHECKPOINT = "requirements-analysis";

const ADVISORY: Advisory = {
  plugin: FIXTURE_PLUGIN,
  code: FIXTURE_ADVISORY_CODE,
  message: `advisory: ${FIXTURE_PLUGIN} ${FIXTURE_ADVISORY_CODE} — held`,
  stage: CHECKPOINT,
  target: `${FIXTURE_PLUGIN}:${FIXTURE_ADVISORY_CODE}`,
  specIdentity: "sha256:hold-1",
};

const projects: string[] = [];
afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), ".amadeus-advisory-choice.json");
}

function readStore(projectDir: string): AdvisoryChoiceStore {
  return JSON.parse(readFileSync(storePath(projectDir), "utf-8")) as AdvisoryChoiceStore;
}

/** A project holding one open advisory at CHECKPOINT. */
function heldProject(): { projectDir: string; hostRoot: string; instance: string } {
  const projectDir = createTestProject();
  projects.push(projectDir);
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  const hostRoot = join(projectDir, ".harness");
  mkdirSync(hostRoot, { recursive: true });
  installFixturePlugin(projectDir);
  composeFixturePlugin(hostRoot);
  expect(guardAdvisoryChoices(projectDir, CHECKPOINT, [ADVISORY], hostRoot).kind).toBe("hold");
  const instance = readStore(projectDir).pending[0]?.identity.advisoryInstance;
  if (instance === undefined) throw new Error("guardAdvisoryChoices left no pending advisory");
  return { projectDir, hostRoot, instance };
}

/** Plant a HUMAN_TURN and return the provenance that names it exactly. */
function plantHumanTurn(projectDir: string): { timestamp: string; shard: string; eventIdentity: string } {
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1);
  if (event === undefined) throw new Error("planted HUMAN_TURN did not land in the audit trail");
  return {
    timestamp: planted.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

/** Record the presentation of `instance`, which is what grounds a human answer. */
function plantPresentation(projectDir: string, instance: string): void {
  const fields = advisoryChoicePresentationFields(projectDir, CHECKPOINT, [instance]);
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
}

// ---------------------------------------------------------------------------
// 1. A receipt is parsed, never trusted.
// ---------------------------------------------------------------------------
const IDENTITY = {
  plugin: FIXTURE_PLUGIN,
  code: FIXTURE_ADVISORY_CODE,
  checkpoint: CHECKPOINT,
  target: `${FIXTURE_PLUGIN}:${FIXTURE_ADVISORY_CODE}`,
  specIdentity: "sha256:hold-1",
  intentRun: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
  advisoryInstance: "019fc698-ba1f-7000-8000-000000000001",
};

const HUMAN_PROVENANCE = {
  kind: "human-turn",
  timestamp: "2026-08-11T00:00:00Z",
  shard: "shard.jsonl",
  eventIdentity: "a".repeat(64),
};

function receipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 2,
    identity: { ...IDENTITY },
    choice: "run-now",
    provenance: { ...HUMAN_PROVENANCE },
    recordedAt: "2026-08-11T00:00:01Z",
    ...overrides,
  };
}

describe("parseAdvisoryChoiceReceipt rejects every unreadable field", () => {
  test("an identity code that is not a declared-advisory slug is rejected", () => {
    const parsed = parseAdvisoryChoiceReceipt(
      receipt({ identity: { ...IDENTITY, code: "Not A Slug" } }),
    );
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.reason).toBe("identity.code is invalid");
  });

  test("a choice outside the closed set is rejected", () => {
    const parsed = parseAdvisoryChoiceReceipt(receipt({ choice: "maybe-later" }));
    expect(!parsed.ok && parsed.reason).toBe("receipt choice is invalid");
  });

  test("an unparseable recordedAt is rejected", () => {
    const parsed = parseAdvisoryChoiceReceipt(receipt({ recordedAt: "the day before" }));
    expect(!parsed.ok && parsed.reason).toBe("recordedAt is invalid");
  });

  test("a human-turn provenance with an unparseable timestamp is rejected", () => {
    const parsed = parseAdvisoryChoiceReceipt(
      receipt({ provenance: { ...HUMAN_PROVENANCE, timestamp: "yesterday" } }),
    );
    expect(!parsed.ok && parsed.reason).toBe("provenance.timestamp is invalid");
  });

  test("an auto-decision provenance with a non-integer projection revision is rejected", () => {
    const parsed = parseAdvisoryChoiceReceipt(
      receipt({
        provenance: {
          kind: "auto-decision",
          decisionId: "auto-decision-1",
          basisKind: "agent-recommendation",
          basisFingerprint: "sha256:basis",
          projectionRevision: 1.5,
          phase: "inception",
          graphRevision: "sha256:graph",
        },
      }),
    );
    expect(!parsed.ok && parsed.reason).toBe("provenance.projectionRevision is invalid");
  });

  // Revocation is two fields that mean nothing apart: a revokedAt with no reason
  // (or the reverse) is a half-written correction, not a revoked receipt.
  test("half a revocation is rejected, and so is an unknown reason", () => {
    expect(
      !parseAdvisoryChoiceReceipt(receipt({ revokedAt: "2026-08-11T00:00:02Z" })).ok,
    ).toBe(true);
    const halves = parseAdvisoryChoiceReceipt(receipt({ revokedAt: "2026-08-11T00:00:02Z" }));
    expect(!halves.ok && halves.reason).toBe("receipt revocation fields must appear together");

    const badReason = parseAdvisoryChoiceReceipt(
      receipt({ revokedAt: "2026-08-11T00:00:02Z", revocationReason: "because" }),
    );
    expect(!badReason.ok && badReason.reason).toBe("revocationReason is invalid");

    const badTime = parseAdvisoryChoiceReceipt(
      receipt({ revokedAt: "not-a-time", revocationReason: "misattributed-unpresented-choice" }),
    );
    expect(!badTime.ok && badTime.reason).toBe("revokedAt is invalid");

    const whole = parseAdvisoryChoiceReceipt(
      receipt({ revokedAt: "2026-08-11T00:00:02Z", revocationReason: "misattributed-unpresented-choice" }),
    );
    expect(whole.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. A store that cannot be read is a refusal, not an empty store.
// ---------------------------------------------------------------------------
describe("an unreadable store refuses rather than defaulting to empty", () => {
  test("invalid JSON on disk refuses the record", () => {
    const { projectDir } = heldProject();
    writeFileSync(storePath(projectDir), "{not json");
    const outcome = recordAdvisoryChoice(projectDir, "run-now", {
      kind: "human-turn",
      ...plantHumanTurn(projectDir),
    });
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toContain("unreadable");
  });

  test("a pending row with an unreadable closedAt refuses the record", () => {
    const { projectDir } = heldProject();
    const store = readStore(projectDir);
    (store.pending[0] as unknown as { closedAt: unknown }).closedAt = 17;
    writeFileSync(storePath(projectDir), JSON.stringify(store));
    const outcome = recordAdvisoryChoice(projectDir, "run-now", {
      kind: "human-turn",
      ...plantHumanTurn(projectDir),
    });
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toBe("pending.closedAt is invalid");
  });
});

// ---------------------------------------------------------------------------
// 3. A human answer must be attributable: right shard, real turn, and a
//    presentation of the very advisory it answers.
// ---------------------------------------------------------------------------
describe("a human answer is refused unless the evidence names it", () => {
  test("a turn from another clone's shard is refused", () => {
    const { projectDir } = heldProject();
    const humanTurn = plantHumanTurn(projectDir);
    const outcome = recordAdvisoryChoice(projectDir, "run-now", {
      kind: "human-turn",
      ...humanTurn,
      shard: "some-other-clone.jsonl",
    });
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toBe(
      "the human turn belongs to another audit shard",
    );
  });

  test("a turn that is not in the audit trail is refused", () => {
    const { projectDir } = heldProject();
    const humanTurn = plantHumanTurn(projectDir);
    const outcome = recordAdvisoryChoice(projectDir, "run-now", {
      kind: "human-turn",
      ...humanTurn,
      eventIdentity: "f".repeat(64),
    });
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toContain("not grounded");
  });

  test("a real turn that was never shown the question is refused", () => {
    const { projectDir } = heldProject();
    const humanTurn = plantHumanTurn(projectDir);
    const outcome = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toBe(
      "no protected presentation precedes this human turn",
    );
  });

  test("a presented question accepts the answer", () => {
    const { projectDir, instance } = heldProject();
    plantPresentation(projectDir, instance);
    const humanTurn = plantHumanTurn(projectDir);
    const outcome = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(outcome.kind).toBe("recorded");
  });
});

// ---------------------------------------------------------------------------
// 4. The prompt vocabulary is closed.
// ---------------------------------------------------------------------------
describe("choiceFromExactPrompt", () => {
  test("the closed vocabulary maps, and anything else is null", () => {
    expect(choiceFromExactPrompt("1")).toBe("run-now");
    expect(choiceFromExactPrompt("run-now")).toBe("run-now");
    expect(choiceFromExactPrompt("2")).toBe("defer-with-risk");
    expect(choiceFromExactPrompt("defer-with-risk")).toBe("defer-with-risk");
    // A near-miss is not a choice: silence beats guessing what a human meant.
    expect(choiceFromExactPrompt("yes")).toBeNull();
    expect(choiceFromExactPrompt("3")).toBeNull();
    expect(choiceFromExactPrompt("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Correction: the one revocation path, fenced on every side.
// ---------------------------------------------------------------------------
describe("revokeMisattributedAdvisoryChoice", () => {
  test("an unpresented run-now receipt is marked revoked, not deleted", () => {
    const { projectDir, instance } = heldProject();
    // Record the answer while a presentation exists, then remove the
    // presentation: the receipt is now attributed to a turn that, as the audit
    // trail stands, was never shown this advisory.
    plantPresentation(projectDir, instance);
    const humanTurn = plantHumanTurn(projectDir);
    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");
    const audit = auditFilePath(projectDir);
    writeFileSync(
      audit,
      readFileSync(audit, "utf-8")
        .split("\n")
        .filter((line) => !line.includes("DECISION_RECORDED"))
        .join("\n"),
    );

    expect(revokeMisattributedAdvisoryChoice(projectDir, instance, humanTurn.eventIdentity))
      .toEqual({ ok: true });
    const store = readStore(projectDir);
    expect(store.receipts).toHaveLength(1);
    expect(store.receipts[0].revocationReason).toBe("misattributed-unpresented-choice");
    expect(store.receipts[0].revokedAt).toBeDefined();
  });

  test("an instance with no open advisory is refused", () => {
    const { projectDir } = heldProject();
    expect(revokeMisattributedAdvisoryChoice(projectDir, "no-such-instance", "a".repeat(64)))
      .toEqual({ ok: false, reason: "open advisory instance not found" });
  });

  test("an open advisory with no matching receipt is refused", () => {
    const { projectDir, instance } = heldProject();
    expect(revokeMisattributedAdvisoryChoice(projectDir, instance, "a".repeat(64)))
      .toEqual({ ok: false, reason: "matching latest receipt not found" });
  });

  test("a receipt still grounded in its presentation is refused", () => {
    const { projectDir, instance } = heldProject();
    plantPresentation(projectDir, instance);
    const humanTurn = plantHumanTurn(projectDir);
    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");
    const outcome = revokeMisattributedAdvisoryChoice(projectDir, instance, humanTurn.eventIdentity);
    expect(outcome).toEqual({
      ok: false,
      reason: "receipt is grounded in a matching advisory presentation",
    });
  });

  test("a defer-with-risk receipt is not correctable", () => {
    const { projectDir, instance } = heldProject();
    plantPresentation(projectDir, instance);
    const humanTurn = plantHumanTurn(projectDir);
    expect(
      recordAdvisoryChoice(projectDir, "defer-with-risk", { kind: "human-turn", ...humanTurn }).kind,
    ).toBe("recorded");
    const audit = auditFilePath(projectDir);
    writeFileSync(
      audit,
      readFileSync(audit, "utf-8")
        .split("\n")
        .filter((line) => !line.includes("DECISION_RECORDED"))
        .join("\n"),
    );
    expect(revokeMisattributedAdvisoryChoice(projectDir, instance, humanTurn.eventIdentity))
      .toEqual({ ok: false, reason: "only run-now receipts can be corrected" });
  });

  // The correction reads the audit trail to ask "was this ever presented?". With
  // no trail to read the answer is "no evidence of a presentation", which is the
  // condition the correction exists for — not a crash.
  test("a missing audit trail leaves the receipt correctable", () => {
    const { projectDir, instance } = heldProject();
    plantPresentation(projectDir, instance);
    const humanTurn = plantHumanTurn(projectDir);
    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");
    rmSync(auditFilePath(projectDir), { force: true });
    expect(revokeMisattributedAdvisoryChoice(projectDir, instance, humanTurn.eventIdentity))
      .toEqual({ ok: true });
  });

  test("an unreadable store refuses the correction", () => {
    const { projectDir, instance } = heldProject();
    writeFileSync(storePath(projectDir), "{not json");
    const outcome = revokeMisattributedAdvisoryChoice(projectDir, instance, "a".repeat(64));
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toContain("unreadable");
  });
});

// ---------------------------------------------------------------------------
// 6. A project with no audit trail at all: the grounding reads fail open to
//    "not grounded" rather than throwing.
// ---------------------------------------------------------------------------
describe("a missing audit trail refuses instead of throwing", () => {
  test("recording a human choice with no audit file on disk is refused", () => {
    const { projectDir } = heldProject();
    const humanTurn = plantHumanTurn(projectDir);
    rmSync(auditFilePath(projectDir), { force: true });
    const outcome = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(outcome.kind).toBe("refused");
  });
});
