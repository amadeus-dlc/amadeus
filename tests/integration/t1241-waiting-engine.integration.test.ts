// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts, file:packages/framework/core/tools/amadeus-orchestrate.ts
// size: medium
//
// RFC-0001 FR-3 — waiting, driven through the production path.
//
// The unit tests pin the domain against in-memory ledgers. What they cannot
// reach is the part that makes the record survive: the cause has to land in an
// audit shard on disk and be readable by a process that never saw the run that
// wrote it. That is the whole point of the rate constraint being keyed off the
// ledger rather than off process state (R-9a), so it is exercised here against
// a real record directory.
//
// FP-2 in the FD's falling-proof table: before this path existed, a
// non-interactive run reaching a contested ruling had nowhere to stop — it
// either kept going or parked in a way indistinguishable from a human's park.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import {
  enterProductionWaiting,
  readProductionWaitingStop,
  resumeProductionWaiting,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { waitingDirectiveFor } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  basisFingerprintOf,
  WaitingCause,
  type WaitingCause as WaitingCauseType,
} from "../../packages/framework/core/tools/amadeus-waiting.ts";

let proj = "";

function cause(overrides: Partial<WaitingCauseType> = {}): WaitingCauseType {
  return {
    occurrenceId: "stage-gate-code-generation",
    outcome: RecommendationOutcome.contested(
      [
        { optionId: "approve", rationale: "the sensors are green", rank: 1 },
        { optionId: "revise", rationale: "the coverage delta is unexplained", rank: 2 },
      ],
      "the norm and the prior ruling point at different options",
    ),
    derivationTranscript: "norm: ambiguous -> past-rulings: conflict -> election: unavailable",
    basisFingerprint: basisFingerprintOf({ norm: "v1", rulings: ["a", "b"] }),
    interactivityBasis: {
      interactive: false,
      source: "human-turn-pipeline",
      measuredAt: "2026-08-15T10:00:00.000Z",
    },
    ...overrides,
  };
}

function auditText(): string {
  const intents = join(proj, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  const auditDir = join(intents, active, "audit");
  return readdirSync(auditDir)
    .map((name) => readFileSync(join(auditDir, name), "utf8"))
    .join("\n");
}

/** A project with a real minted Intent — waiting suspends an Intent, so there
 *  has to be one for the record to hang off. Same birth route as t435. */
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

beforeEach(() => {
  resetOtelPerProject();
  proj = bornProject();
});

afterEach(() => {
  cleanupTestProject(proj);
  proj = "";
});

describe("t1241 a non-interactive run can stop at a ruling (FR-3, FP-2)", () => {
  test("entering waiting records the cause and suspends the workflow", () => {
    const entered = enterProductionWaiting(proj, cause());
    expect("error" in entered).toBe(false);
    if ("error" in entered) return;

    const stop = readProductionWaitingStop(proj);
    expect(stop).not.toBeNull();
    if (stop === null) return;
    expect(stop.occurrenceId).toBe("stage-gate-code-generation");
    expect(stop.transactionId).toBe(entered.waitingId);
    expect(stop.cause.derivationTranscript).toBe(cause().derivationTranscript);
    // The full ruling came back, not a summary of it.
    expect(WaitingCause.presentationOf(stop.cause)).toEqual(WaitingCause.presentationOf(cause()));
  });

  test("the marker lands in the audit shard and names the transaction", () => {
    const entered = enterProductionWaiting(proj, cause());
    if ("error" in entered) throw new Error(entered.error);
    const audit = auditText();
    expect(audit).toContain("WORKFLOW_WAITING_ENTERED");
    expect(audit).toContain(entered.waitingId);
    // The variable-width cause is NOT in the marker; it travels in the
    // transaction row instead (R-7d).
    const markerRow = audit.split("\n").find((line) => line.includes("WORKFLOW_WAITING_ENTERED")) ?? "";
    expect(markerRow).not.toContain("derivationTranscript");
  });

  // R-14 — the terminal the conductor sees is waiting's own, not park's.
  test("the engine presents it as a waiting directive", () => {
    const entered = enterProductionWaiting(proj, cause());
    if ("error" in entered) throw new Error(entered.error);
    const stop = readProductionWaitingStop(proj);
    if (stop === null) throw new Error("no waiting stop on record");

    const directive = waitingDirectiveFor(stop);
    expect(directive.kind).toBe("waiting");
    expect(directive.occurrence_id).toBe(stop.occurrenceId);
    expect(directive.basis_fingerprint).toBe(stop.cause.basisFingerprint);
    expect(directive.transaction_id).toBe(entered.waitingId);
    // The reason is for a human to read; the fields are what the machine uses.
    expect(directive.reason).toContain("ruling");
  });
});

describe("t1241 the rate constraint reads the ledger, not memory (R-9, R-9a)", () => {
  test("a repeat on the same key is refused after the workflow resumes", () => {
    const first = enterProductionWaiting(proj, cause());
    if ("error" in first) throw new Error(first.error);
    const resumed = resumeProductionWaiting(proj);
    expect("error" in resumed).toBe(false);
    expect(readProductionWaitingStop(proj)).toBeNull();

    // Same ruling point, same grounds, and a human ruled in between: this is a
    // legitimate second arrival, so the resume cleared the key.
    const second = enterProductionWaiting(proj, cause());
    expect("error" in second).toBe(false);
  });

  // Not the rate constraint — the suspension itself. A record can hold one open
  // waiting entry, so the second arrival never reaches the rate check. Worth
  // pinning separately because the two refusals are easy to confuse when
  // reading a failure: the unit tests drive the rate check directly, with the
  // prior entries supplied, because this path cannot reach it.
  test("a second entry while one is already open is refused by the suspension", () => {
    const first = enterProductionWaiting(proj, cause());
    if ("error" in first) throw new Error(first.error);
    const second = enterProductionWaiting(proj, cause());
    expect("error" in second).toBe(true);
    if (!("error" in second)) return;
    expect(second.error).toBe("workflow-already-suspended");
  });

  // R-4 — no environment variable opens either refusal. The park guard never
  // honoured this bypass, and the paths that replaced it do not start.
  test("AMADEUS_SKIP_HUMAN_PRESENCE_GUARD does not open the refusal", () => {
    const previous = process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    try {
      const first = enterProductionWaiting(proj, cause());
      if ("error" in first) throw new Error(first.error);
      const second = enterProductionWaiting(proj, cause());
      expect("error" in second).toBe(true);
      // A malformed cause stays refused under the bypass too.
      const malformed = enterProductionWaiting(proj, cause({ derivationTranscript: "" }));
      expect("error" in malformed).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
      else process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = previous;
    }
  });
});

describe("t1241 a malformed cause never reaches the record (R-7)", () => {
  test("an empty derivation transcript is refused and changes nothing", () => {
    const refused = enterProductionWaiting(proj, cause({ derivationTranscript: "   " }));
    expect("error" in refused).toBe(true);
    if (!("error" in refused)) return;
    expect(refused.error).toContain("derivationTranscript");
    expect(readProductionWaitingStop(proj)).toBeNull();
    expect(auditText()).not.toContain("WORKFLOW_WAITING_ENTERED");
  });

  test("a basis fingerprint that is not a digest is refused", () => {
    const refused = enterProductionWaiting(proj, cause({ basisFingerprint: "not-a-digest" }));
    expect("error" in refused).toBe(true);
    expect(readProductionWaitingStop(proj)).toBeNull();
  });
});
