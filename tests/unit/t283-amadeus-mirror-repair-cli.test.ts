// t283 — repair CLI parser + Provenance V2 binding.
// covers: packages/framework/core/tools/amadeus-mirror-{lifecycle,repair,state-codec,state-reducer}.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  parseMirrorLifecycleArgs,
} from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import {
  encodeProvenanceV2,
  issueRepairChallenge,
  provenanceDigestV2,
  repairPlanDigest,
} from "../../packages/framework/core/tools/amadeus-mirror-repair.ts";
import {
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  reduceMirrorState,
} from "../../packages/framework/core/tools/amadeus-mirror-state-reducer.ts";
import type {
  MirrorProvenanceV1,
  MirrorProvenanceV2,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-25T00:00:00Z";
const REPO: RepositoryIdentity = {
  owner: "owner",
  name: "repo",
  canonical: "owner/repo",
};
const IDENTITY = {
  schema: 1 as const,
  intentUuid: "intent-1",
  intentDir: "260725-demo-a1b2c3d4",
  repository: REPO,
  operationId: "op-create",
  preparedAt: "2026-07-24T23:59:00Z",
};
const V2: MirrorProvenanceV2 = {
  schema: 2,
  createIdentity: IDENTITY,
  issueNumber: 42,
  createdAt: NOW,
};
const EMPTY: MirrorStateSnapshot = {
  revision: 0,
  issueNumber: null,
  provenance: null,
  receipts: {},
  warnings: [],
  repairChallenges: {},
  auditOutbox: null,
};

function challenged(provenance = V2): {
  snapshot: MirrorStateSnapshot;
  digest: string;
} {
  const plan = repairPlanDigest({
    kind: "relink",
    intentUuid: provenance.createIdentity.intentUuid,
    repository: provenance.createIdentity.repository.canonical,
    operationId: provenance.createIdentity.operationId,
    issueNumber: provenance.issueNumber,
    provenanceDigest: provenanceDigestV2(provenance),
  });
  if (plan.kind !== "ok") throw new Error("plan should be valid");
  const issued = issueRepairChallenge(
    EMPTY,
    {
      challengeId: "challenge-1",
      intentUuid: "intent-1",
      repository: REPO,
      operationId: "op-create",
      planDigest: plan.digest,
      expectedPhrase: "CONFIRM",
      issuedAt: NOW,
    },
    NOW,
  );
  if (issued.kind !== "issued") throw new Error("challenge should be issued");
  return { snapshot: issued.snapshot, digest: plan.digest };
}

describe("t283 repair parser", () => {
  test("accepts the three repair commands and explicit non-default selectors", () => {
    expect(
      parseMirrorLifecycleArgs([
        "repair",
        "status",
        "--space",
        "platform",
        "--intent",
        "demo",
      ]),
    ).toMatchObject({
      kind: "repair",
      request: {
        space: "platform",
        intentDir: "demo",
        command: { kind: "status" },
      },
    });
    expect(
      parseMirrorLifecycleArgs(["repair", "relink", "--issue", "42"]),
    ).toMatchObject({
      kind: "repair",
      request: { command: { kind: "relink", issueNumber: 42 } },
    });
    expect(
      parseMirrorLifecycleArgs([
        "repair",
        "abandon",
        "--operation",
        "op-create",
      ]),
    ).toMatchObject({
      kind: "repair",
      request: {
        command: { kind: "abandon", operationId: "op-create" },
      },
    });
  });

  test("forbids positional, duplicate, invalid, and cross-command arguments", () => {
    for (const args of [
      ["repair", "status", "extra"],
      ["repair", "relink", "--issue", "0"],
      ["repair", "relink", "--issue", "1", "--issue", "2"],
      ["repair", "relink", "--operation", "op"],
      ["repair", "abandon", "--issue", "1"],
      ["repair", "abandon", "--operation", "--intent"],
      ["manual", "create", "positional", "--instance", "id"],
      ["manual", "sync", "--instance", "id", "--phase", "ideation"],
      ["manual", "close"],
      ["boundary", "phase", "--instance", "id"],
      ["boundary", "park", "--instance", "id", "--stage", "x", "--issue", "1"],
    ]) {
      expect(parseMirrorLifecycleArgs(args).kind).toBe("usage");
    }
  });
});

describe("t283 Provenance V2", () => {
  test("keeps V1 readable and emits V2 with frozen canonical createdAt", () => {
    const v1: MirrorProvenanceV1 = { ...V2, schema: 1 };
    const parsedV1 = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock({
        ...EMPTY,
        issueNumber: 42,
        provenance: v1,
      })}\n`,
    );
    expect(parsedV1.kind).toBe("ok");
    if (parsedV1.kind === "ok")
      expect(parsedV1.snapshot.provenance?.schema).toBe(1);

    expect(encodeProvenanceV2(V2)).toBe(
      '{"schema":2,"intentUuid":"intent-1","intentDir":"260725-demo-a1b2c3d4","repository":"owner/repo","issueNumber":42,"operationId":"op-create","preparedAt":"2026-07-24T23:59:00Z","createdAt":"2026-07-25T00:00:00Z"}',
    );
    const parsedV2 = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock({
        ...EMPTY,
        issueNumber: 42,
        provenance: V2,
      })}\n`,
    );
    expect(parsedV2.kind).toBe("ok");
    if (parsedV2.kind === "ok")
      expect(parsedV2.snapshot.provenance).toEqual(V2);
    expect(
      provenanceDigestV2({
        ...V2,
        createdAt: "2026-07-25T00:00:01Z",
      }),
    ).not.toBe(provenanceDigestV2(V2));
  });

  test("relink atomically consumes only a V2 provenance matching the plan", () => {
    const binding = challenged();
    const consume = {
      challengeId: "challenge-1",
      intentUuid: "intent-1",
      repository: REPO,
      operationId: "op-create",
      planDigest: binding.digest,
      confirmationPhrase: "CONFIRM",
    };
    const changed = reduceMirrorState(
      binding.snapshot,
      { kind: "repair-link", issueNumber: 42, provenance: V2, consume },
      NOW,
    );
    expect(changed.kind).toBe("changed");
    if (changed.kind !== "changed") return;
    expect(changed.snapshot.provenance).toEqual(V2);
    expect(changed.snapshot.repairChallenges).toEqual({});

    const replay = reduceMirrorState(
      changed.snapshot,
      { kind: "repair-link", issueNumber: 42, provenance: V2, consume },
      NOW,
    );
    expect(replay.kind).toBe("invalid");
  });

  test("rejects V1 downgrade and tampered createdAt without consuming challenge", () => {
    const binding = challenged();
    const consume = {
      challengeId: "challenge-1",
      intentUuid: "intent-1",
      repository: REPO,
      operationId: "op-create",
      planDigest: binding.digest,
      confirmationPhrase: "CONFIRM",
    };
    const v1: MirrorProvenanceV1 = { ...V2, schema: 1 };
    const downgrade = reduceMirrorState(
      binding.snapshot,
      { kind: "repair-link", issueNumber: 42, provenance: v1, consume },
      NOW,
    );
    expect(downgrade.kind).toBe("invalid");
    const tampered = reduceMirrorState(
      binding.snapshot,
      {
        kind: "repair-link",
        issueNumber: 42,
        provenance: { ...V2, createdAt: "2026-07-25T00:00:01Z" },
        consume,
      },
      NOW,
    );
    expect(tampered.kind).toBe("invalid");
    expect(binding.snapshot.repairChallenges["challenge-1"]).toBeDefined();
  });
});
