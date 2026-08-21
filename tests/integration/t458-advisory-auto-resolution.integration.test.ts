// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// covers: audit:INTENT_AUTONOMY_TRANSACTION_COMMITTED
// size: medium
//
// t458 — the unattended resolution of a pending advisory, end to end (#2253).
//
// Before this, one raised advisory was enough to stop an unattended run: the
// engine swapped `run-stage` for `await-advisory-choice` and waited for a human
// turn that, in a headless run, never came. FR-ADV-1 puts the hold to the
// autonomy ladder first.
//
// What has to be true, and is asserted here against a real store, a real audit
// trail and a real projection:
//
//   FR-ADV-1  under a full grant the choice is decided, an AUTO_DECIDED lands in
//             the journal, and a schema-2 receipt with `auto-decision`
//             provenance is written.
//   FR-ADV-2  with no authorization — mode `none`, or an authorization whose
//             scope does not cover this intent — nothing is decided and nothing
//             is recorded. The human route is the only way forward.
//   FR-ADV-3  a receipt already held by one provenance kind blocks the other.
//   ADR-9     a schema 1 store on disk is not translated; it fails to parse and
//             the guard's existing arm turns that into a hold.

import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  advisoryChoicePresentationFields,
  advisoryOccurrenceMatchesDecision,
  guardAdvisoryChoices,
  recordAdvisoryChoice,
  resolveAdvisoryChoiceAutonomously,
  type AdvisoryChoiceGuardResult,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  autonomyDigest,
  type AutoDecisionRecord,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
  readProductionAutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { readIntentAutonomyTransactionsFromAudit } from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import {
  activeIntentUuid,
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const STAGE = "code-generation";
const PHASE = "construction";
const GRAPH = autonomyDigest("graph-t458");

const advisory: Advisory = {
  plugin: "conformance-fixture",
  code: "changed",
  message: "advisory: conformance-fixture FIXTURE CHANGED",
  stage: STAGE,
  target: "conformance-fixture:fixture-change",
  specIdentity: "sha256:abc",
};

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), ".amadeus-advisory-choice.json");
}

function readStore(projectDir: string): AdvisoryChoiceStore {
  return JSON.parse(readFileSync(storePath(projectDir), "utf-8")) as AdvisoryChoiceStore;
}

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

function stateContentOf(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return readFileSync(join(intents, active, "amadeus-state.md"), "utf8");
}

function grantFullAutonomy(projectDir: string): void {
  plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const stateContent = stateContentOf(projectDir);
  const preview = previewProductionAutonomyGrant({ projectDir, stateContent });
  expect(preview.ok).toBe(true);
  if (!preview.ok) return;
  expect(applyProductionAutonomyMode({
    projectDir,
    stateContent,
    mode: "full",
    confirmedDisplayDigest: preview.preview.displayDigest,
  })).toMatchObject({ ok: true, projection: { mode: "full" } });
}

function hold(projectDir: string): Extract<AdvisoryChoiceGuardResult, { kind: "hold" }> {
  const guard = guardAdvisoryChoices(projectDir, STAGE, [advisory]);
  if (guard.kind !== "hold") throw new Error(`expected a hold, got ${guard.kind}`);
  return guard;
}

function autoDecisionIds(projectDir: string): string[] {
  return readIntentAutonomyTransactionsFromAudit(projectDir).flatMap((transaction) =>
    transaction.events.flatMap((event) =>
      event.type === "AUTO_DECIDED" ? [(event.decision as AutoDecisionRecord).decisionId] : []
    )
  );
}

function plantHumanTurn(projectDir: string): { timestamp: string; shard: string; eventIdentity: string } {
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1)!;
  return {
    timestamp: planted.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

function plantPresentation(projectDir: string, pending: PendingAdvisory): void {
  const fields = advisoryChoicePresentationFields(
    projectDir,
    pending.identity.checkpoint,
    [pending.identity.advisoryInstance],
  );
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("advisory auto-resolution: authorized (FR-ADV-1)", () => {
  test("full grant下でpending advisoryが無人裁定されreceiptが記録される", () => {
    projectDir = bornProject();
    grantFullAutonomy(projectDir);
    const guard = hold(projectDir);

    const resolution = resolveAdvisoryChoiceAutonomously({
      projectDir,
      hold: guard,
      phase: PHASE,
      graphRevision: GRAPH,
    });
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind !== "resolved") return;
    expect(resolution.choice).toBe("run-now");

    // The ruling is in the journal, not merely in the returned value.
    expect(autoDecisionIds(projectDir)).toContain(resolution.decision.decisionId);

    expect(recordAdvisoryChoice(projectDir, resolution.choice, {
      kind: "auto-decision",
      decisionId: resolution.decision.decisionId,
      basisKind: resolution.decision.basisKind,
      basisFingerprint: resolution.decision.basisFingerprint,
      projectionRevision: resolution.projectionRevision,
      phase: PHASE,
      graphRevision: GRAPH,
    }).kind).toBe("recorded");

    const receipts = readStore(projectDir).receipts;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      schema: 2,
      choice: "run-now",
      provenance: { kind: "auto-decision", decisionId: resolution.decision.decisionId },
    });

    // The choice itself is settled, but the plugin still raises the advisory.
    // The host therefore keeps the hold without inventing a plugin command.
    const after = guardAdvisoryChoices(projectDir, STAGE, [advisory]);
    // The hold stands under the settled `handoff` verdict (#2967): a decided
    // advisory is never re-offered to the ladder or re-asked of the human.
    expect(after.kind).toBe("handoff");
    if (after.kind !== "handoff") return;
    expect(after.advisories[0]?.result).toContain("plugin's own evaluator");
  });

  // #2479: a ladder decision names ONE advisory occurrence. The grounding check
  // agrees — `advisoryOccurrenceMatchesDecision` rebuilds the occurrence id from
  // each pending's own identity and compares it to the decision's. But it was
  // asked with `some`, and a single match then let receipts be written for EVERY
  // open advisory. The second advisory here was never decided; a receipt naming
  // the first one's decision would make it look settled, which is the whole
  // guarantee per-instance binding exists to give.
  test("裁定が名指ししていないadvisoryへreceiptを書かない", () => {
    projectDir = bornProject();
    grantFullAutonomy(projectDir);
    const undecided: Advisory = { ...advisory, specIdentity: "sha256:def", message: "advisory: a second, undecided raise" };

    const guard = guardAdvisoryChoices(projectDir, STAGE, [advisory, undecided]);
    if (guard.kind !== "hold") throw new Error(`expected a hold, got ${guard.kind}`);
    expect(readStore(projectDir).pending).toHaveLength(2);

    const resolution = resolveAdvisoryChoiceAutonomously({ projectDir, hold: guard, phase: PHASE, graphRevision: GRAPH });
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind !== "resolved") return;

    expect(recordAdvisoryChoice(projectDir, resolution.choice, {
      kind: "auto-decision",
      decisionId: resolution.decision.decisionId,
      basisKind: resolution.decision.basisKind,
      basisFingerprint: resolution.decision.basisFingerprint,
      projectionRevision: resolution.projectionRevision,
      phase: PHASE,
      graphRevision: GRAPH,
    }).kind).toBe("recorded");

    // One decision, one receipt — and it names the advisory the decision was about.
    const receipts = readStore(projectDir).receipts;
    expect(receipts).toHaveLength(1);
    const decided = readStore(projectDir).pending.find((pending) =>
      advisoryOccurrenceMatchesDecision({
        intentUuid: activeIntentUuid(projectDir)!,
        identity: pending.identity,
        decision: resolution.decision,
        phase: PHASE,
        graphRevision: GRAPH,
      })
    );
    expect(decided).toBeDefined();
    expect(receipts[0]?.identity.advisoryInstance).toBe(decided!.identity.advisoryInstance);
  });
});

describe("advisory auto-resolution: unauthorized (FR-ADV-2 fail-closed)", () => {
  test("mode=noneではhuman-requiredになりreceiptを書かない", () => {
    projectDir = bornProject();
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("none");
    const guard = hold(projectDir);

    const resolution = resolveAdvisoryChoiceAutonomously({
      projectDir,
      hold: guard,
      phase: PHASE,
      graphRevision: GRAPH,
    });
    expect(resolution.kind).toBe("human-required");
    expect(readStore(projectDir).receipts).toHaveLength(0);
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).toBe("hold");
  });

  test("認可の無いintentでは捏造したdecisionIdの受理も拒否される", () => {
    projectDir = bornProject();
    hold(projectDir);
    expect(recordAdvisoryChoice(projectDir, "run-now", {
      kind: "auto-decision",
      decisionId: "fabricated-decision",
      basisKind: "norm",
      basisFingerprint: autonomyDigest("fabricated"),
      projectionRevision: 1,
      phase: PHASE,
      graphRevision: GRAPH,
    }).kind).toBe("refused");
    expect(readStore(projectDir).receipts).toHaveLength(0);
  });

  test("別occurrenceの実在裁定をadvisoryへ付け替えることはできない", () => {
    projectDir = bornProject();
    grantFullAutonomy(projectDir);
    const guard = hold(projectDir);
    const resolution = resolveAdvisoryChoiceAutonomously({
      projectDir,
      hold: guard,
      phase: PHASE,
      graphRevision: GRAPH,
    });
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind !== "resolved") return;

    // The decision is real, but the phase it was taken in is misstated — which
    // changes the occurrence id it must match.
    expect(recordAdvisoryChoice(projectDir, resolution.choice, {
      kind: "auto-decision",
      decisionId: resolution.decision.decisionId,
      basisKind: resolution.decision.basisKind,
      basisFingerprint: resolution.decision.basisFingerprint,
      projectionRevision: resolution.projectionRevision,
      phase: "inception",
      graphRevision: GRAPH,
    }).kind).toBe("refused");
    expect(readStore(projectDir).receipts).toHaveLength(0);
  });
});

describe("advisory auto-resolution: provenance crossing (FR-ADV-3)", () => {
  test("human-turnで受理済みのadvisoryへauto-decisionの2件目は書けない", () => {
    projectDir = bornProject();
    grantFullAutonomy(projectDir);
    const guard = hold(projectDir);
    const pending = readStore(projectDir).pending[0]!;
    plantPresentation(projectDir, pending);
    expect(recordAdvisoryChoice(projectDir, "defer-with-risk", {
      kind: "human-turn",
      ...plantHumanTurn(projectDir),
    }).kind).toBe("recorded");
    expect(readStore(projectDir).receipts).toHaveLength(1);

    const resolution = resolveAdvisoryChoiceAutonomously({
      projectDir,
      hold: guard,
      phase: PHASE,
      graphRevision: GRAPH,
    });
    if (resolution.kind === "resolved") {
      expect(recordAdvisoryChoice(projectDir, resolution.choice, {
        kind: "auto-decision",
        decisionId: resolution.decision.decisionId,
        basisKind: resolution.decision.basisKind,
        basisFingerprint: resolution.decision.basisFingerprint,
        projectionRevision: resolution.projectionRevision,
        phase: PHASE,
        graphRevision: GRAPH,
      }).kind).toBe("refused");
    }
    expect(readStore(projectDir).receipts).toHaveLength(1);
  });
});

describe("advisory auto-resolution: schema 1 store (ADR-9)", () => {
  test("schema 1のstoreは読み替えられずfail-closed holdになる", () => {
    projectDir = bornProject();
    grantFullAutonomy(projectDir);
    hold(projectDir);

    const store = readStore(projectDir) as unknown as Record<string, unknown>;
    store.schema = 1;
    writeFileSync(storePath(projectDir), `${JSON.stringify(store, null, 2)}\n`);

    // The guard cannot read the store, so it falls back to a hold rather than
    // guessing what an old receipt meant.
    expect(guardAdvisoryChoices(projectDir, STAGE, [advisory]).kind).toBe("hold");
    // And acceptance refuses outright — no receipt is appended to a store this
    // build does not understand.
    expect(recordAdvisoryChoice(projectDir, "run-now", {
      kind: "auto-decision",
      decisionId: "any-decision",
      basisKind: "norm",
      basisFingerprint: autonomyDigest("any"),
      projectionRevision: 1,
      phase: PHASE,
      graphRevision: GRAPH,
    }).kind).toBe("refused");
  });
});

describe("advisory auto-resolution: unreadable autonomy journal (fail-closed)", () => {
  test("ジャーナルが読めない場合、受理はfail-closedで拒否される", () => {
    projectDir = bornProject();
    hold(projectDir);
    // A malformed INTENT_AUTONOMY_TRANSACTION_COMMITTED row makes the journal
    // unreadable; acceptance must fail closed rather than trust the claim.
    plantV1AuditRow("INTENT_AUTONOMY_TRANSACTION_COMMITTED", {}, projectDir);

    expect(recordAdvisoryChoice(projectDir, "run-now", {
      kind: "auto-decision",
      decisionId: "any-decision",
      basisKind: "norm",
      basisFingerprint: autonomyDigest("any"),
      projectionRevision: 1,
      phase: PHASE,
      graphRevision: GRAPH,
    }).kind).toBe("refused");
    expect(readStore(projectDir).receipts).toHaveLength(0);
  });

  test("ジャーナルが読めない場合、裁定そのものもhuman-requiredに落ちる", () => {
    projectDir = bornProject();
    const guard = hold(projectDir);
    plantV1AuditRow("INTENT_AUTONOMY_TRANSACTION_COMMITTED", {}, projectDir);

    const resolution = resolveAdvisoryChoiceAutonomously({
      projectDir,
      hold: guard,
      phase: PHASE,
      graphRevision: GRAPH,
    });
    expect(resolution.kind).toBe("human-required");
    if (resolution.kind !== "human-required") return;
    expect(resolution.reason).toStartWith("advisory-decision-failed:");
    expect(readStore(projectDir).receipts).toHaveLength(0);
  });
});
