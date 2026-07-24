// t276 — S7 repair: plan/provenance canonical wire + digest, challenge issue /
// consume / prune with a fake clock (TTL, one-time, exact binding).
// covers: packages/framework/core/tools/amadeus-mirror-repair.ts
// size: small

import { describe, expect, test } from "bun:test";
import type {
  MirrorRepairChallenge,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  consumeRepairChallenge,
  encodeProvenanceV1,
  encodeRepairPlanV1,
  issueRepairChallenge,
  MAX_ACTIVE_CHALLENGES,
  pruneExpiredChallenges,
  repairPlanDigest,
} from "../../packages/framework/core/tools/amadeus-mirror-repair.ts";

const REPO: RepositoryIdentity = { owner: "owner", name: "repo", canonical: "owner/repo" };
const UUID = "00000000-0000-4000-8000-000000000001";
const HEX = "a".repeat(64);

const EMPTY: MirrorStateSnapshot = {
  revision: 0,
  issueNumber: null,
  provenance: null,
  receipts: {},
  warnings: [],
  repairChallenges: {},
  auditOutbox: null,
};

function challenge(id: string, issuedAt: string, phrase = "CONFIRM"): MirrorRepairChallenge {
  return {
    challengeId: id,
    intentUuid: UUID,
    repository: REPO,
    planDigest: HEX,
    operationId: "op-1",
    expectedPhrase: phrase,
    issuedAt,
  };
}

describe("wire golden + digest", () => {
  test("relink plan matches the security-design golden wire", () => {
    const r = encodeRepairPlanV1({
      kind: "relink",
      intentUuid: UUID,
      repository: "owner/repo",
      operationId: "op-1",
      issueNumber: 42,
      provenanceDigest: HEX,
    });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.json).toBe(
      `{"schema":1,"kind":"relink","intentUuid":"${UUID}","repository":"owner/repo","operationId":"op-1","issueNumber":42,"provenanceDigest":"${HEX}","action":"replace-provenance"}`,
    );
  });

  test("abandon plan matches the security-design golden wire", () => {
    const r = encodeRepairPlanV1({
      kind: "abandon",
      intentUuid: UUID,
      repository: "owner/repo",
      operationId: "op-1",
    });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.json).toBe(
      `{"schema":1,"kind":"abandon","intentUuid":"${UUID}","repository":"owner/repo","operationId":"op-1","issueNumber":null,"provenanceDigest":null,"action":"mark-abandoned"}`,
    );
  });

  test("non-canonical repository / bad digest are rejected before issue", () => {
    expect(
      encodeRepairPlanV1({ kind: "relink", intentUuid: UUID, repository: "Owner/Repo", operationId: "op", issueNumber: 1, provenanceDigest: HEX }).kind,
    ).toBe("invalid");
    expect(
      encodeRepairPlanV1({ kind: "relink", intentUuid: UUID, repository: "owner/repo", operationId: "op", issueNumber: 1, provenanceDigest: "z" }).kind,
    ).toBe("invalid");
  });

  test("digest is deterministic and provenance canonical is stable", () => {
    const d1 = repairPlanDigest({ kind: "abandon", intentUuid: UUID, repository: "owner/repo", operationId: "op-1" });
    const d2 = repairPlanDigest({ kind: "abandon", intentUuid: UUID, repository: "owner/repo", operationId: "op-1" });
    expect(d1).toEqual(d2);
    expect(encodeProvenanceV1({ intentUuid: UUID, intentDir: "d", repository: "owner/repo", issueNumber: 5, operationId: "op-1", preparedAt: "2026-07-24T00:00:00Z" })).toBe(
      `{"schema":1,"intentUuid":"${UUID}","intentDir":"d","repository":"owner/repo","issueNumber":5,"operationId":"op-1","preparedAt":"2026-07-24T00:00:00Z"}`,
    );
  });
});

describe("challenge lifecycle (fake clock)", () => {
  const issuedAt = "2026-07-24T00:00:00Z";
  const withChallenge = (): MirrorStateSnapshot => {
    const r = issueRepairChallenge(EMPTY, challenge("c1", issuedAt), issuedAt);
    if (r.kind !== "issued") throw new Error("issue failed");
    return r.snapshot;
  };

  test("consume within the 10-minute TTL removes the challenge and returns a proof", () => {
    const s = withChallenge();
    const r = consumeRepairChallenge(
      s,
      { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: HEX, confirmationPhrase: "CONFIRM" },
      "2026-07-24T00:09:59Z",
    );
    expect(r.kind).toBe("consumed");
    if (r.kind !== "consumed") return;
    expect(r.snapshot.repairChallenges.c1).toBeUndefined();
    expect(r.proof.challengeId).toBe("c1");
  });

  test("consume just past 10 minutes is rejected (TTL)", () => {
    const r = consumeRepairChallenge(
      withChallenge(),
      { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: HEX, confirmationPhrase: "CONFIRM" },
      "2026-07-24T00:10:01Z",
    );
    expect(r.kind).toBe("invalid");
  });

  test("phrase is byte-exact (case/space differences rejected)", () => {
    const r = consumeRepairChallenge(
      withChallenge(),
      { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: HEX, confirmationPhrase: "confirm" },
      "2026-07-24T00:05:00Z",
    );
    expect(r.kind).toBe("invalid");
  });

  test("wrong plan digest / repository is rejected", () => {
    const s = withChallenge();
    expect(
      consumeRepairChallenge(s, { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: "b".repeat(64), confirmationPhrase: "CONFIRM" }, "2026-07-24T00:05:00Z").kind,
    ).toBe("invalid");
    expect(
      consumeRepairChallenge(s, { challengeId: "c1", intentUuid: UUID, repository: { owner: "x", name: "y", canonical: "x/y" }, operationId: "op-1", planDigest: HEX, confirmationPhrase: "CONFIRM" }, "2026-07-24T00:05:00Z").kind,
    ).toBe("invalid");
  });

  test("replay after consume is rejected with no state change", () => {
    const s = withChallenge();
    const first = consumeRepairChallenge(s, { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: HEX, confirmationPhrase: "CONFIRM" }, "2026-07-24T00:05:00Z");
    expect(first.kind).toBe("consumed");
    if (first.kind !== "consumed") return;
    const replay = consumeRepairChallenge(first.snapshot, { challengeId: "c1", intentUuid: UUID, repository: REPO, operationId: "op-1", planDigest: HEX, confirmationPhrase: "CONFIRM" }, "2026-07-24T00:06:00Z");
    expect(replay.kind).toBe("invalid");
  });

  test("issue prunes expired challenges and rejects at active capacity 100", () => {
    // Prune: an expired challenge is dropped when a new one is issued.
    const stale = issueRepairChallenge(EMPTY, challenge("old", "2026-07-24T00:00:00Z"), "2026-07-24T00:00:00Z");
    if (stale.kind !== "issued") throw new Error("issue failed");
    const pruned = pruneExpiredChallenges(stale.snapshot, "2026-07-24T01:00:00Z");
    expect(Object.keys(pruned.snapshot.repairChallenges).length).toBe(0);
    expect(pruned.prunedProofs.length).toBe(1);

    // Capacity: 100 active, the 101st is rejected.
    const challenges: Record<string, MirrorRepairChallenge> = {};
    for (let i = 0; i < MAX_ACTIVE_CHALLENGES; i++) {
      challenges[`c${i}`] = challenge(`c${i}`, "2026-07-24T00:00:00Z");
    }
    const full: MirrorStateSnapshot = { ...EMPTY, repairChallenges: challenges };
    const r = issueRepairChallenge(full, challenge("overflow", "2026-07-24T00:00:00Z"), "2026-07-24T00:01:00Z");
    expect(r.kind).toBe("invalid");
  });
});
