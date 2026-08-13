// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: medium
//
// t2967 — recordAdvisoryChoice answers WHY it did not write (#2967).
//
// The boolean it used to return collapsed two opposite situations into one
// value. `false` meant both "this decision was already spent on exactly this
// advisory, with exactly this choice" — a settled advisory, nothing to do — and
// "the evidence does not ground a receipt" — a genuine refusal. The engine's
// only caller then treated both as "ask the human", which is how an advisory
// the ladder had already ruled on came back as a fresh question.
//
// So the outcome is typed. `recorded` and `already-settled` both mean the
// advisory carries a live receipt for this choice; `refused` carries the reason
// it does not.

import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  advisoryChoicePresentationFields,
  guardAdvisoryChoices,
  recordAdvisoryChoice,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

const STAGE = "code-generation";

const advisory: Advisory = {
  plugin: "formal-model-check",
  code: "changed",
  message: "advisory: formal-model-check spec hash CHANGED",
  stage: STAGE,
  target: "amadeus/spaces/default/specs/tla",
  specIdentity: "sha256:abc",
};

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const birth = spawnSync(
    process.execPath,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(birth.status).toBe(0);
  return projectDir;
}

function firstPending(projectDir: string): PendingAdvisory {
  const store = JSON.parse(
    readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
  ) as AdvisoryChoiceStore;
  const pending = store.pending[0];
  if (pending === undefined) throw new Error("no pending advisory");
  return pending;
}

function presentAndPlantTurn(
  projectDir: string,
  pending: PendingAdvisory,
): { timestamp: string; shard: string; eventIdentity: string } {
  const fields = advisoryChoicePresentationFields(projectDir, pending.identity.checkpoint, [
    pending.identity.advisoryInstance,
  ]);
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1);
  if (event === undefined) throw new Error("no HUMAN_TURN was planted");
  return {
    timestamp: planted.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("t2967 recordAdvisoryChoice outcome (FR-ADV-4)", () => {
  test("初回の受理はrecordedとしてreceiptを返す", () => {
    projectDir = bornProject();
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).not.toBe("allow");
    const pending = firstPending(projectDir);
    const humanTurn = presentAndPlantTurn(projectDir, pending);

    const outcome = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(outcome.kind).toBe("recorded");
    if (outcome.kind !== "recorded") return;
    expect(outcome.receipts).toHaveLength(1);
    expect(outcome.receipts[0]).toMatchObject({ choice: "run-now" });
  });

  test("同一provenance・同一choiceの再投入はalready-settledで、refusedと区別できる", () => {
    projectDir = bornProject();
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).not.toBe("allow");
    const pending = firstPending(projectDir);
    const humanTurn = presentAndPlantTurn(projectDir, pending);

    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");

    const replay = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(replay.kind).toBe("already-settled");
    if (replay.kind !== "already-settled") return;
    expect(replay.receipts).toHaveLength(1);
    // The replay wrote nothing: the store still holds exactly one receipt.
    const store = JSON.parse(
      readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
    ) as AdvisoryChoiceStore;
    expect(store.receipts).toHaveLength(1);
  });

  test("同一provenanceで異なるchoiceはrefusedであり、already-settledに潰れない", () => {
    projectDir = bornProject();
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).not.toBe("allow");
    const pending = firstPending(projectDir);
    const humanTurn = presentAndPlantTurn(projectDir, pending);

    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");

    const conflicting = recordAdvisoryChoice(projectDir, "defer-with-risk", {
      kind: "human-turn",
      ...humanTurn,
    });
    expect(conflicting.kind).toBe("refused");
    if (conflicting.kind !== "refused") return;
    expect(conflicting.reason.length).toBeGreaterThan(0);
  });

  // already-settled must never become a free pass for an advisory this
  // provenance did NOT answer. A second advisory raised after the turn was spent
  // is still open, so the replay is a refusal rather than a settled read.
  test("spent済みprovenanceでも未回答のadvisoryが残ればrefusedになる", () => {
    projectDir = bornProject();
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).not.toBe("allow");
    const pending = firstPending(projectDir);
    const humanTurn = presentAndPlantTurn(projectDir, pending);
    expect(recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn }).kind)
      .toBe("recorded");

    // A second, unanswered advisory at the same checkpoint.
    const second: Advisory = { ...advisory, specIdentity: "sha256:def", message: "advisory: a second raise" };
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory, second]).kind).not.toBe("allow");

    const replay = recordAdvisoryChoice(projectDir, "run-now", { kind: "human-turn", ...humanTurn });
    expect(replay.kind).toBe("refused");
    const store = JSON.parse(
      readFileSync(join(docsRoot(projectDir), ".amadeus-advisory-choice.json"), "utf-8"),
    ) as AdvisoryChoiceStore;
    expect(store.receipts).toHaveLength(1);
  });

  test("接地しないhuman-turnはrefusedで、理由を持つ", () => {
    projectDir = bornProject();
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).not.toBe("allow");
    const pending = firstPending(projectDir);
    presentAndPlantTurn(projectDir, pending);

    const outcome = recordAdvisoryChoice(projectDir, "run-now", {
      kind: "human-turn",
      timestamp: new Date().toISOString(),
      shard: auditShardName(projectDir),
      eventIdentity: createHash("sha256").update("not-a-real-event").digest("hex"),
    });
    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.reason.length).toBeGreaterThan(0);
  });
});
