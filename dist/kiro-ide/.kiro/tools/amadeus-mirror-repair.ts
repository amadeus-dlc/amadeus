// amadeus-mirror-repair.ts — S7 Repair Challenge codec + lifecycle (C3 internal).
//
// Pure module: canonical wire encoders for the repair plan and provenance
// digest (security-design.md), SHA-256 hex, and the one-time repair-challenge
// lifecycle (issue with expiry prune, consume with full binding + TTL check).
// Imports C0 types + node:crypto only; no filesystem, process, or GitHub.
// The clock is always injected (RFC 3339 UTC string) so TTL is deterministic.

import { createHash } from "node:crypto";
import type {
  MirrorRepairChallenge,
  MirrorRepairProof,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

export const REPAIR_CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const MAX_ACTIVE_CHALLENGES = 100;

// ---------------------------------------------------------------------------
// Canonical digests.
// ---------------------------------------------------------------------------

export function sha256Hex(bytes: string): string {
  return createHash("sha256").update(Buffer.from(bytes, "utf-8")).digest("hex");
}

// Canonical MirrorProvenanceV1 bytes: field order
// schema,intentUuid,intentDir,repository,issueNumber,operationId,preparedAt.
export type ProvenanceV1Input = Readonly<{
  intentUuid: string;
  intentDir: string;
  repository: string; // canonical lowercase owner/name
  issueNumber: number;
  operationId: string;
  preparedAt: string;
}>;

export function encodeProvenanceV1(input: ProvenanceV1Input): string {
  return JSON.stringify({
    schema: 1,
    intentUuid: input.intentUuid,
    intentDir: input.intentDir,
    repository: input.repository,
    issueNumber: input.issueNumber,
    operationId: input.operationId,
    preparedAt: input.preparedAt,
  });
}

export function provenanceDigest(input: ProvenanceV1Input): string {
  return sha256Hex(encodeProvenanceV1(input));
}

// Repair plan wire (security-design.md): closed union, all root keys required,
// non-applicable values are explicit null.
//   root key order: schema,kind,intentUuid,repository,operationId,issueNumber,
//   provenanceDigest,action
export type RepairPlanV1 =
  | Readonly<{
      kind: "relink";
      intentUuid: string;
      repository: string; // canonical lowercase owner/name
      operationId: string;
      issueNumber: number; // positive safe integer
      provenanceDigest: string; // 64-char lowercase hex
    }>
  | Readonly<{
      kind: "abandon";
      intentUuid: string;
      repository: string;
      operationId: string;
    }>;

export type RepairPlanEncodeResult =
  | { kind: "ok"; json: string }
  | { kind: "invalid"; issues: readonly string[] };

function isCanonicalRepository(v: string): boolean {
  return /^[a-z0-9._-]+\/[a-z0-9._-]+$/.test(v);
}

export function encodeRepairPlanV1(plan: RepairPlanV1): RepairPlanEncodeResult {
  const issues: string[] = [];
  if (!isCanonicalRepository(plan.repository))
    issues.push("repository: must be lowercase canonical owner/name");
  if (plan.intentUuid.length === 0) issues.push("intentUuid: required");
  if (plan.operationId.length === 0) issues.push("operationId: required");

  if (plan.kind === "relink") {
    if (!(Number.isSafeInteger(plan.issueNumber) && plan.issueNumber > 0))
      issues.push("issueNumber: must be positive safe integer");
    if (!/^[0-9a-f]{64}$/.test(plan.provenanceDigest))
      issues.push("provenanceDigest: must be 64-char lowercase hex");
    if (issues.length > 0) return { kind: "invalid", issues };
    return {
      kind: "ok",
      json: JSON.stringify({
        schema: 1,
        kind: "relink",
        intentUuid: plan.intentUuid,
        repository: plan.repository,
        operationId: plan.operationId,
        issueNumber: plan.issueNumber,
        provenanceDigest: plan.provenanceDigest,
        action: "replace-provenance",
      }),
    };
  }
  // abandon
  if (issues.length > 0) return { kind: "invalid", issues };
  return {
    kind: "ok",
    json: JSON.stringify({
      schema: 1,
      kind: "abandon",
      intentUuid: plan.intentUuid,
      repository: plan.repository,
      operationId: plan.operationId,
      issueNumber: null,
      provenanceDigest: null,
      action: "mark-abandoned",
    }),
  };
}

export type RepairPlanDigestResult =
  | { kind: "ok"; digest: string }
  | { kind: "invalid"; issues: readonly string[] };

export function repairPlanDigest(plan: RepairPlanV1): RepairPlanDigestResult {
  const encoded = encodeRepairPlanV1(plan);
  if (encoded.kind === "invalid") return { kind: "invalid", issues: encoded.issues };
  return { kind: "ok", digest: sha256Hex(encoded.json) };
}

// ---------------------------------------------------------------------------
// Challenge lifecycle (pure; clock injected).
// ---------------------------------------------------------------------------

function parseInstant(ts: string): number | null {
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

function isExpired(challenge: MirrorRepairChallenge, nowMs: number): boolean {
  const issued = parseInstant(challenge.issuedAt);
  if (issued === null) return true; // unparseable => treat as expired/invalid
  return nowMs > issued + REPAIR_CHALLENGE_TTL_MS;
}

function proofOf(
  challenge: MirrorRepairChallenge,
  confirmation: string,
  checkedAt: string,
): MirrorRepairProof {
  return {
    challengeId: challenge.challengeId,
    intentUuid: challenge.intentUuid,
    repository: challenge.repository,
    operationId: challenge.operationId,
    planDigest: challenge.planDigest,
    exactConfirmation: confirmation,
    checkedAt,
  };
}

export type ChallengeIssueResult =
  | {
      kind: "issued";
      snapshot: MirrorStateSnapshot;
      prunedProofs: readonly MirrorRepairProof[];
    }
  | { kind: "invalid"; issues: readonly string[] };

// Issue a new challenge: prune expired first (moving their proofs to audit),
// reject when the ACTIVE map is already full, and reject a colliding id.
export function issueRepairChallenge(
  snapshot: MirrorStateSnapshot,
  challenge: MirrorRepairChallenge,
  now: string,
): ChallengeIssueResult {
  const nowMs = parseInstant(now);
  if (nowMs === null)
    return { kind: "invalid", issues: ["now: unparseable timestamp"] };

  const kept: Record<string, MirrorRepairChallenge> = {};
  const prunedProofs: MirrorRepairProof[] = [];
  for (const id of Object.keys(snapshot.repairChallenges)) {
    const c = snapshot.repairChallenges[id];
    if (isExpired(c, nowMs)) {
      prunedProofs.push(proofOf(c, "", now));
    } else {
      kept[id] = c;
    }
  }
  if (Object.hasOwn(kept, challenge.challengeId))
    return { kind: "invalid", issues: ["challengeId: already active"] };
  if (Object.keys(kept).length >= MAX_ACTIVE_CHALLENGES)
    return { kind: "invalid", issues: ["repairChallenges: active capacity reached (100)"] };
  if (parseInstant(challenge.issuedAt) === null)
    return { kind: "invalid", issues: ["challenge.issuedAt: unparseable timestamp"] };

  kept[challenge.challengeId] = challenge;
  return {
    kind: "issued",
    snapshot: { ...snapshot, repairChallenges: kept },
    prunedProofs,
  };
}

export type ChallengeConsumeInput = Readonly<{
  challengeId: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  operationId: string;
  planDigest: string;
  confirmationPhrase: string;
}>;

export type ChallengeConsumeResult =
  | { kind: "consumed"; snapshot: MirrorStateSnapshot; proof: MirrorRepairProof }
  | { kind: "invalid"; issues: readonly string[] };

// Consume a challenge inside the repair transition: every binding must match
// exactly, the phrase is byte-exact (no trim/case-fold), the challenge must be
// unconsumed and within its 10-minute TTL. On success it is removed from the
// active map and a proof is returned for the transaction's audit outbox.
export function consumeRepairChallenge(
  snapshot: MirrorStateSnapshot,
  input: ChallengeConsumeInput,
  now: string,
): ChallengeConsumeResult {
  const nowMs = parseInstant(now);
  if (nowMs === null)
    return { kind: "invalid", issues: ["now: unparseable timestamp"] };
  const challenge = snapshot.repairChallenges[input.challengeId];
  if (!challenge)
    return { kind: "invalid", issues: ["challengeId: not an active challenge"] };
  const issues: string[] = [];
  if (challenge.intentUuid !== input.intentUuid) issues.push("intentUuid mismatch");
  if (challenge.repository.canonical !== input.repository.canonical)
    issues.push("repository mismatch");
  if (challenge.operationId !== input.operationId) issues.push("operationId mismatch");
  if (challenge.planDigest !== input.planDigest) issues.push("planDigest mismatch");
  if (challenge.expectedPhrase !== input.confirmationPhrase)
    issues.push("phrase mismatch");
  if (challenge.consumedAt !== undefined) issues.push("challenge already consumed");
  const issued = parseInstant(challenge.issuedAt);
  if (issued === null) issues.push("challenge.issuedAt unparseable");
  else if (nowMs < issued || nowMs > issued + REPAIR_CHALLENGE_TTL_MS)
    issues.push("challenge outside TTL window");
  if (issues.length > 0) return { kind: "invalid", issues };

  const remaining: Record<string, MirrorRepairChallenge> = {};
  for (const id of Object.keys(snapshot.repairChallenges)) {
    if (id !== input.challengeId) remaining[id] = snapshot.repairChallenges[id];
  }
  return {
    kind: "consumed",
    snapshot: { ...snapshot, repairChallenges: remaining },
    proof: proofOf(challenge, input.confirmationPhrase, now),
  };
}

export type ChallengePruneResult = {
  snapshot: MirrorStateSnapshot;
  prunedProofs: readonly MirrorRepairProof[];
};

export function pruneExpiredChallenges(
  snapshot: MirrorStateSnapshot,
  now: string,
): ChallengePruneResult {
  const nowMs = parseInstant(now);
  if (nowMs === null) return { snapshot, prunedProofs: [] };
  const kept: Record<string, MirrorRepairChallenge> = {};
  const prunedProofs: MirrorRepairProof[] = [];
  for (const id of Object.keys(snapshot.repairChallenges)) {
    const c = snapshot.repairChallenges[id];
    if (isExpired(c, nowMs)) prunedProofs.push(proofOf(c, "", now));
    else kept[id] = c;
  }
  if (prunedProofs.length === 0) return { snapshot, prunedProofs };
  return { snapshot: { ...snapshot, repairChallenges: kept }, prunedProofs };
}
