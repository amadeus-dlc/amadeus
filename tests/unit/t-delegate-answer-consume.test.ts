// covers: file:tools/amadeus-lib.ts
//
// t-delegate-answer-consume — the #736 mixing bug: a QUESTION_ANSWERED emitted
// the moment a delegate lands must NOT consume that delegation's APPROVE/REJECT
// gate slot. Before the fix, humanActedSinceGate treated QUESTION_ANSWERED as a
// generic resolution boundary, so the sequence
//     DELEGATED_APPROVAL (grounded) -> QUESTION_ANSWERED -> approve
// refused the approve gate — the answer had "consumed" the delegate's presence.
//
// The fix (election Q1=A / Q2=A) gives a delegation two independent, per-kind
// slots derived from ONE ledger scan (no new on-disk state):
//   - GATE slot   — consumed only by GATE_APPROVED / GATE_REJECTED
//   - ANSWER slot — consumed only by QUESTION_ANSWERED
// A HUMAN_TURN keeps its local one-act-per-turn semantics (any resolution
// consumes it). The verb-less general predicate (issuer grounding at the two
// delegate-issuance sites) keeps the legacy uniform boundary and is NOT changed.
//
// Subject under test (shipped distributable):
//   - dist/claude/.claude/tools/amadeus-lib.ts :
//       humanActedSinceGate (gate predicate, verb-scoped GATE slot),
//       humanActedSinceLastAnswer (answer predicate, ANSWER slot),
//       verifyDelegatedProvenance (forgery gate, unchanged).
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAuditEntry } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditShardName,
  humanActedSinceGate,
  humanActedSinceLastAnswer,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const tmpRoots: string[] = [];
afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

// Two sibling intent records under one workspace: a conductor (the active intent,
// whose gate we probe) and an issuer (the leader intent that holds the grounding
// HUMAN_TURN). Mirrors the on-disk layout after git sync — same as t112.
function scaffold(): { root: string; conductor: string; issuer: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t-dac-"));
  tmpRoots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const conductor = "canonical-settings-abcd1234";
  const issuer = "leader-intent-ef567890";
  for (const rec of [conductor, issuer]) {
    mkdirSync(join(intents, rec), { recursive: true });
    writeFileSync(join(intents, rec, "amadeus-state.md"), "# AI-DLC State\n", "utf-8");
  }
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(intents, "active-intent"), `${conductor}\n`, "utf-8");
  return { root, conductor, issuer };
}

// Record a real HUMAN_TURN on the issuer, then land a verified delegation of the
// given verb into the conductor dir grounded in that turn. Returns nothing — the
// conductor ledger now holds one verified delegation.
function landVerifiedDelegation(
  root: string,
  conductor: string,
  issuer: string,
  verb: "approve" | "reject",
): void {
  const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
  appendAuditEntry(
    verb === "approve" ? "DELEGATED_APPROVAL" : "DELEGATED_REJECTION",
    {
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": ht.timestamp,
      ...(verb === "reject" ? { Feedback: "revise the framing" } : {}),
    },
    root,
    conductor,
  );
}

// (a) THE MAIN REQUIREMENT (FR-1): a delegate that landed, then emitted a
// QUESTION_ANSWERED, still opens its APPROVE gate. This is the #736 false-refuse.
describe("gate predicate — QUESTION_ANSWERED does not consume the delegate's GATE slot (#736 FR-1)", () => {
  test("(a) DELEGATED_APPROVAL -> QUESTION_ANSWERED -> approve gate is OPEN", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(humanActedSinceGate(root, "approve")).toBe(true);
  });

  // (c) reject-side mirror: a DELEGATED_REJECTION survives an interleaved answer.
  test("(c) DELEGATED_REJECTION -> QUESTION_ANSWERED -> reject gate is OPEN", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "reject");
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(humanActedSinceGate(root, "reject")).toBe(true);
  });
});

// (b) The four per-slot transitions under a single landed delegation: each slot
// is opened by the delegation and closed ONLY by its own kind of resolution.
describe("per-delegate slots — each resolution kind consumes only its own slot (#736)", () => {
  test("(b1) ANSWER slot: open after the delegation, closed by QUESTION_ANSWERED", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    // Answer slot open (no answer yet).
    expect(humanActedSinceLastAnswer(root)).toBe(true);
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    // Answer consumed the ANSWER slot.
    expect(humanActedSinceLastAnswer(root)).toBe(false);
  });

  test("(b2) GATE slot: open after the delegation, closed by GATE_APPROVED", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    // Gate slot open (no gate resolution yet).
    expect(humanActedSinceGate(root, "approve")).toBe(true);
    appendAuditEntry("GATE_APPROVED", { Stage: "market-research" }, root, conductor);
    // Gate resolution consumed the GATE slot.
    expect(humanActedSinceGate(root, "approve")).toBe(false);
  });

  test("(b3) cross-kind independence: a GATE_APPROVED does NOT consume the ANSWER slot", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    appendAuditEntry("GATE_APPROVED", { Stage: "market-research" }, root, conductor);
    // The gate slot is spent, but the answer slot is still open.
    expect(humanActedSinceGate(root, "approve")).toBe(false);
    expect(humanActedSinceLastAnswer(root)).toBe(true);
  });

  test("(b4) cross-kind independence: a QUESTION_ANSWERED does NOT consume the GATE slot", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    // The answer slot is spent, but the gate slot is still open (the #736 fix).
    expect(humanActedSinceLastAnswer(root)).toBe(false);
    expect(humanActedSinceGate(root, "approve")).toBe(true);
  });
});

// (d) Non-regression: the fix must not weaken any existing refusal.
describe("non-regression — existing refusals stay refused (#736)", () => {
  test("(d1) HUMAN_TURN -> QUESTION_ANSWERED -> approve gate is CLOSED (local one-act-per-turn, t188)", () => {
    const { root, conductor } = scaffold();
    // A local human turn on the conductor itself, then it answers.
    appendAuditEntry("HUMAN_TURN", {}, root, conductor);
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    // The turn was spent on the answer — it cannot also approve.
    expect(humanActedSinceGate(root, "approve")).toBe(false);
  });

  test("(d2) a forged delegation opens NEITHER the gate NOR the answer slot", () => {
    const { root, conductor } = scaffold();
    // Unverifiable grounding (shard does not exist) — dropped by the scan.
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": "leader-intent-ef567890",
        "Issuer Shard": "no-such-shard.md",
        "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root, "approve")).toBe(false);
    expect(humanActedSinceLastAnswer(root)).toBe(false);
  });

  test("(d3) DELEGATED_APPROVAL does NOT open a REJECT gate (verb wall, #685)", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    // No QUESTION_ANSWERED needed — the approval delegation must be off-verb for reject.
    expect(humanActedSinceGate(root, "reject")).toBe(false);
    // And it DOES open the matching approve gate.
    expect(humanActedSinceGate(root, "approve")).toBe(true);
  });
});

// (e) The verb-less general predicate (issuer grounding at the delegate-issuance
// sites) is UNCHANGED: a QUESTION_ANSWERED still closes its uniform boundary, so a
// delegate followed by an answer reports no fresh act. This is the semantics the
// two issuers (:1625 / :1719) depend on and must not shift.
describe("general predicate — verb-less uniform boundary is unchanged (#736 Q3=A)", () => {
  test("(e) DELEGATED_APPROVAL -> QUESTION_ANSWERED -> verb-less predicate is CLOSED", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    // A QUESTION_ANSWERED still consumes the uniform boundary for the general
    // predicate — only the verb-scoped gate predicate exempts the GATE slot.
    expect(humanActedSinceGate(root)).toBe(false);
  });

  test("(e2) a verified delegation with no following resolution still opens the general predicate", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    expect(humanActedSinceGate(root)).toBe(true);
  });
});

// --- Core-module mirror -------------------------------------------------------
// The suites above exercise the SHIPPED distributable (dist/claude), the same
// contract t112 pins. Coverage attribution, however, path-fixes to the CORE
// source (packages/framework/core), and `bun --coverage` does not credit the
// dist copy's execution to it — the same in-process-seam requirement as the
// team's bun-coverage-spawn-blindspot rule. This mirror runs the headline
// scenario of each predicate branch directly against the core module so the
// changed core lines are exercised in-process. Behaviour is byte-identical
// (dist:check enforces it); the assertions are the same contracts as above.
import {
  humanActedSinceGate as coreHumanActedSinceGate,
  humanActedSinceLastAnswer as coreHumanActedSinceLastAnswer,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

describe("core-module mirror — same contracts against packages/framework/core (coverage seam)", () => {
  test("gate predicate: delegate -> QA -> approve stays open; GATE_APPROVED consumes it", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(coreHumanActedSinceGate(root, "approve")).toBe(true);
    appendAuditEntry("GATE_APPROVED", { Stage: "market-research" }, root, conductor);
    expect(coreHumanActedSinceGate(root, "approve")).toBe(false);
  });

  test("gate predicate: local HUMAN_TURN branch and reject verb mirror", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, conductor);
    expect(coreHumanActedSinceGate(root, "approve")).toBe(true);
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(coreHumanActedSinceGate(root, "approve")).toBe(false);
    landVerifiedDelegation(root, conductor, issuer, "reject");
    expect(coreHumanActedSinceGate(root, "reject")).toBe(true);
  });

  test("verb-less general predicate keeps the legacy uniform boundary", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    expect(coreHumanActedSinceGate(root)).toBe(true);
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(coreHumanActedSinceGate(root)).toBe(false);
  });

  test("answer predicate: delegate grounds one answer, consumed by QUESTION_ANSWERED", () => {
    const { root, conductor, issuer } = scaffold();
    landVerifiedDelegation(root, conductor, issuer, "approve");
    expect(coreHumanActedSinceLastAnswer(root)).toBe(true);
    appendAuditEntry("QUESTION_ANSWERED", { Stage: "market-research" }, root, conductor);
    expect(coreHumanActedSinceLastAnswer(root)).toBe(false);
  });
});
