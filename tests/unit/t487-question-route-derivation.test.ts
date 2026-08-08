// covers: file:packages/framework/core/tools/amadeus-log.ts
//
// u3-question-route-observability (FR-3, #2378): pure-function tests for the
// QUESTION_ANSWERED resolution-route derivation and the after-the-fact bypass
// predicate exported by amadeus-log.ts. In-process imports of the CANONICAL
// module (not dist) so the new lines are lcov-measured (spawn-blindspot
// mitigation); the CLI wiring itself is exercised by the t486 integration
// twin.

import { describe, expect, test } from "bun:test";
import {
  findBypassedQuestionAnswers,
  questionAnswerRouteRows,
  resolveQuestionRoute,
} from "../../packages/framework/core/tools/amadeus-log.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
  type GrantScopeDescriptor,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import { encodeIntentAutonomyTransaction } from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";

// Mint a REAL semi-mode transaction through the production coordinator (in
// memory, no FS) so the predicate is exercised against the same encoded
// Transaction payload the audit shard carries.
function semiTransactionEncoded(): string {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const repository = createMemoryIntentAutonomyRepository();
  const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
  const result = coordinator.applyHumanCommand(
    { kind: "set-mode", mode: "semi", policies: [] },
    {
      targetIntentUuid: INTENT,
      principalId: "principal-1",
      humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" },
      commandOccurrenceId: "semi-command-1",
      expectedProjectionRevision: initial.projectionRevision,
      confirmedDisplayDigest: autonomyDigest("semi-display"),
    }
  );
  if ("error" in result) throw new Error(String(result.error));
  const transaction = repository.readTransactions(INTENT).at(-1);
  if (!transaction) throw new Error("no transaction committed");
  return encodeIntentAutonomyTransaction(transaction);
}

// The full-mode twin of semiTransactionEncoded: the bypass predicate treats
// semi and full alike, so the detection needs a real full grant to stand on.
function fullTransactionEncoded(): string {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const repository = createMemoryIntentAutonomyRepository();
  const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
  const scope: GrantScopeDescriptor = {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: autonomyDigest("scope-fingerprint"),
    normFingerprint: autonomyDigest("norm-fingerprint"),
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("host-policy"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: scope.scopeFingerprint,
    humanTurnId: "human-turn-1",
    policies: [],
  });
  const result = coordinator.applyHumanCommand(
    { kind: "issue-full", scope, policies },
    {
      targetIntentUuid: INTENT,
      principalId: "principal-1",
      humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" },
      commandOccurrenceId: "full-command-1",
      expectedProjectionRevision: initial.projectionRevision,
      confirmedDisplayDigest: grantIssuanceDisplayDigest({
        intentUuid: INTENT,
        principalId: "principal-1",
        scope,
        policies,
      }),
    }
  );
  if ("error" in result) throw new Error(String(result.error));
  const transaction = repository.readTransactions(INTENT).at(-1);
  if (!transaction) throw new Error("no transaction committed");
  return encodeIntentAutonomyTransaction(transaction);
}

let seq = 0;
function row(event: string, fields: Record<string, string>): string {
  seq += 1;
  return JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "t487-clone",
    intentId: "t487-intent",
    timestamp: `2026-08-08T00:0${seq % 10}:00Z`,
    heading: event,
    event,
    fields,
  });
}

function answerRow(fields: Record<string, string>): string {
  return row("QUESTION_ANSWERED", { Stage: "code-generation", Details: "ok", ...fields });
}

function autonomyRow(encoded: string): string {
  return row("INTENT_AUTONOMY_TRANSACTION_COMMITTED", { Transaction: encoded });
}

describe("t487 resolveQuestionRoute (FR-3a derivation)", () => {
  test("no --decision-id derives the human route (existing callers unchanged)", () => {
    expect(resolveQuestionRoute(undefined)).toEqual({ route: "human" });
  });

  test("a malformed decision id is rejected loudly (only new check, FR-3)", () => {
    // Not auto-decision-prefixed.
    expect(() => resolveQuestionRoute("decision-0123abcd")).toThrow(
      /auto-decision-/
    );
    // Prefix alone with an empty id part.
    expect(() => resolveQuestionRoute("auto-decision-")).toThrow(
      /auto-decision-/
    );
    // Characters outside the safe id alphabet.
    expect(() => resolveQuestionRoute("auto-decision-abc def")).toThrow(
      /auto-decision-/
    );
  });

  test("an auto-decision id derives the ladder route and carries the id", () => {
    expect(resolveQuestionRoute("auto-decision-0123abcd")).toEqual({
      route: "ladder",
      decisionId: "auto-decision-0123abcd",
    });
  });
});

describe("t487 questionAnswerRouteRows (BR-U3-5 mode derivation)", () => {
  test("derives route and after-the-fact autonomy mode per answer row", () => {
    const encoded = semiTransactionEncoded();
    const audit = [
      answerRow({ "Resolution Route": "human" }), // before any autonomy tx -> none
      autonomyRow(encoded), // mode becomes semi
      answerRow({ "Resolution Route": "human" }),
      answerRow({ "Resolution Route": "ladder", "Decision Id": "auto-decision-feed1" }),
    ].join("\n");
    const rows = questionAnswerRouteRows(audit);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ route: "human", autonomyMode: "none", decisionId: null });
    expect(rows[1]).toMatchObject({ route: "human", autonomyMode: "semi" });
    expect(rows[2]).toMatchObject({
      route: "ladder",
      autonomyMode: "semi",
      decisionId: "auto-decision-feed1",
    });
  });

  test("an undecodable transaction row keeps the mode the last readable one set", () => {
    const audit = [
      autonomyRow(semiTransactionEncoded()),
      autonomyRow("not-a-base64url-transaction"), // decode throws — sweep continues
      answerRow({ "Resolution Route": "human" }),
    ].join("\n");
    const rows = questionAnswerRouteRows(audit);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ route: "human", autonomyMode: "semi" });
  });

  test("a pre-u3 row without Resolution Route reads as unknown, not an error (BR-U3-4)", () => {
    const rows = questionAnswerRouteRows(answerRow({}));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ route: "unknown", decisionId: null });
  });
});

describe("t487 findBypassedQuestionAnswers (FR-3b detection predicate)", () => {
  test("flags human answers under semi mode; ladder and pre-semi rows pass", () => {
    const encoded = semiTransactionEncoded();
    const audit = [
      answerRow({ "Resolution Route": "human", Stage: "intent-capture" }), // mode none -> ok
      autonomyRow(encoded),
      answerRow({ "Resolution Route": "ladder", "Decision Id": "auto-decision-feed2" }), // ok
      answerRow({ "Resolution Route": "human", Stage: "scope-definition" }), // VIOLATION
      answerRow({}), // pre-u3 unknown route -> not counted as a violation
    ].join("\n");
    const hits = findBypassedQuestionAnswers(audit);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      route: "human",
      autonomyMode: "semi",
      stage: "scope-definition",
    });
  });

  test("a human answer under full mode is flagged the same way semi is", () => {
    const audit = [
      autonomyRow(fullTransactionEncoded()),
      answerRow({ "Resolution Route": "human", Stage: "delivery-planning" }),
    ].join("\n");
    const hits = findBypassedQuestionAnswers(audit);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      route: "human",
      autonomyMode: "full",
      stage: "delivery-planning",
    });
  });

  test("a human answer recorded after an undecodable transaction row is still flagged", () => {
    const audit = [
      autonomyRow(semiTransactionEncoded()),
      autonomyRow("not-a-base64url-transaction"),
      answerRow({ "Resolution Route": "human", Stage: "scope-definition" }),
    ].join("\n");
    const hits = findBypassedQuestionAnswers(audit);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ autonomyMode: "semi", stage: "scope-definition" });
  });

  test("falling proof: rewriting the violating row's route to ladder detects nothing", () => {
    const encoded = semiTransactionEncoded();
    const violating = [
      autonomyRow(encoded),
      answerRow({ "Resolution Route": "human", Stage: "scope-definition" }),
    ].join("\n");
    expect(findBypassedQuestionAnswers(violating)).toHaveLength(1);
    const rewritten = violating.replaceAll('"Resolution Route":"human"', '"Resolution Route":"ladder"');
    expect(findBypassedQuestionAnswers(rewritten)).toHaveLength(0);
  });
});
