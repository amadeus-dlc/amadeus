// covers: file:tools/amadeus-lib.ts, file:tools/amadeus-state.ts
//
// t112 — delegated-approval provenance (#671). The human-presence gate refuses
// a conductor's approval until a real human acted since the last resolution. In
// an agent-team topology the human is only in the LEADER session, so the fix
// lets a leader record a DELEGATED_APPROVAL into the conductor intent's audit
// dir, GROUNDED in a real HUMAN_TURN on the leader's own ledger. The conductor's
// gate accepts it ONLY after verifying that grounding HUMAN_TURN physically
// exists in the referenced issuer shard.
//
// This is the "落ちる実証" for the security property: a delegation that a model
// could fabricate (references a shard/HUMAN_TURN that is not on disk, points at
// a shard with no HUMAN_TURN, tampers the timestamp, or path-traverses out of
// the intents tree) MUST be rejected — the gate stays shut. Only a delegation
// whose grounding HUMAN_TURN is real opens it. The forgery cases are the
// injected failures: under a naive "accept any DELEGATED_APPROVAL" gate they
// would be false-greens; here they must stay red (refused).
//
// Subject under test (shipped distributable):
//   - dist/claude/.claude/tools/amadeus-lib.ts : verifyDelegatedApproval,
//       humanActedSinceGate (delegated-approval branch)
//   - grounded by amadeus-state.ts delegate-approval (writer), covered via the
//       same audit blocks it emits.
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAuditEntry } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditShardName,
  humanActedSinceGate,
  verifyDelegatedApproval,
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

// Two sibling intent records under one workspace: a conductor (the active
// intent, whose gate we probe) and an issuer (the leader intent that holds the
// grounding HUMAN_TURN). Mirrors the on-disk layout after git sync.
function scaffold(): { root: string; conductor: string; issuer: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t112-"));
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

// Build a DELEGATED_APPROVAL audit block the way appendAuditEntry serialises one.
function delegationBlock(fields: Record<string, string>): string {
  let b = "## Delegated Approval\n**Timestamp**: 2026-07-09T09:00:00.000Z\n**Event**: DELEGATED_APPROVAL\n";
  for (const [k, v] of Object.entries(fields)) b += `**${k}**: ${v}\n`;
  return `${b}\n---\n`;
}

describe("verifyDelegatedApproval — grounding proof (#671)", () => {
  test("accepts a delegation grounded in a real HUMAN_TURN in the issuer shard", () => {
    const { root, issuer } = scaffold();
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": ht.timestamp,
    });
    expect(verifyDelegatedApproval(root, block)).toBe(true);
  });

  test("rejects a delegation referencing a shard that does not exist (forged)", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": "no-such-shard.md",
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedApproval(root, block)).toBe(false);
  });

  test("rejects when the issuer shard exists but holds no HUMAN_TURN", () => {
    const { root, issuer } = scaffold();
    // A shard with a non-HUMAN_TURN event only.
    const started = appendAuditEntry("STAGE_STARTED", { Stage: "market-research" }, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": started.timestamp,
    });
    expect(verifyDelegatedApproval(root, block)).toBe(false);
  });

  test("rejects a tampered timestamp that no HUMAN_TURN in the shard matches", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": "1999-01-01T00:00:00.000Z", // no such HUMAN_TURN
    });
    expect(verifyDelegatedApproval(root, block)).toBe(false);
  });

  test("rejects path-traversal in the issuer shard / intent fields", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const traversalShard = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": "../../../../etc/hosts",
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedApproval(root, traversalShard)).toBe(false);
    const traversalIntent = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": "../../../../tmp",
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedApproval(root, traversalIntent)).toBe(false);
  });

  test("rejects a block missing the issuer fields", () => {
    const { root } = scaffold();
    const block = delegationBlock({ Stage: "market-research" });
    expect(verifyDelegatedApproval(root, block)).toBe(false);
  });
});

describe("humanActedSinceGate — delegated approval opens the conductor gate (#671)", () => {
  test("a verified delegation after the last resolution counts as a human act", () => {
    const { root, conductor, issuer } = scaffold();
    // A prior resolution on the conductor sets the freshness boundary.
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    // Leader's real human turn, then the delegation into the conductor dir.
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": ht.timestamp,
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root)).toBe(true);
  });

  test("a forged delegation after the last resolution does NOT open the gate", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": "no-such-shard.md", // unverifiable grounding
        "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root)).toBe(false);
  });
});
