import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import type { ArmId } from "../../scripts/formal-verif/contract.ts";
import type { ProvenanceEvent } from "../../scripts/formal-verif/provenance.ts";
import { measureArmAuthoredLoc, measureAuthoringElapsed, type NumstatOutcome, type NumstatPort } from "../../scripts/formal-verif/full-matrix-cost.ts";

const sha = (seed: string) => createHash("sha256").update(seed).digest("hex");
const numstatPort = (outcome: NumstatOutcome): NumstatPort => ({ numstat: () => outcome });
const owned = ["scripts/formal-verif/tla-arm.ts"];
const shared = ["scripts/formal-verif/canonical.ts"];

describe("arm-owned LOC", () => {
  test("sums additions + deletions for arm-owned rows and separates shared rows", () => {
    const port = numstatPort({ kind: "rows", rows: [{ additions: 10, deletions: 4, path: "scripts/formal-verif/tla-arm.ts" }, { additions: 3, deletions: 1, path: "scripts/formal-verif/canonical.ts" }] });
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: sha("base"), freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, port);
    expect(result.ok && result.value.ownedTotal).toBe(14);
    expect(result.ok && result.value.sharedTotal).toBe(4);
  });
  test("a binary numstat row is rejected", () => {
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: sha("base"), freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, numstatPort({ kind: "binary", path: "assets/logo.png" }));
    expect(result.ok).toBe(false);
  });
  test("a rename-ambiguous path is rejected", () => {
    const port = numstatPort({ kind: "rows", rows: [{ additions: 1, deletions: 1, path: "scripts/{old => tla-arm}.ts" }] });
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: sha("base"), freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, port);
    expect(result.ok).toBe(false);
  });
  test("a path outside both allowlists is rejected", () => {
    const port = numstatPort({ kind: "rows", rows: [{ additions: 1, deletions: 0, path: "packages/framework/core/tools/other.ts" }] });
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: sha("base"), freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, port);
    expect(result.ok).toBe(false);
  });
  test("negative counts are rejected", () => {
    const port = numstatPort({ kind: "rows", rows: [{ additions: -1, deletions: 0, path: "scripts/formal-verif/tla-arm.ts" }] });
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: sha("base"), freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, port);
    expect(result.ok).toBe(false);
  });
  test("non-SHA revisions are rejected", () => {
    const port = numstatPort({ kind: "rows", rows: [] });
    const result = measureArmAuthoredLoc({ arm: "tla", baselineSha: "short", freezeSha: sha("freeze"), ownedAllowlist: owned, sharedAllowlist: shared }, port);
    expect(result.ok).toBe(false);
  });
});

const base = (kind: ProvenanceEvent["kind"], arm: ArmId, at: string, sequence: number, overrides: Record<string, unknown> = {}) => {
  const common = { eventId: sha(`${kind}-${arm}-${sequence}`), transactionId: sha("tx"), at, sequence, actorId: "coordinator", sessionId: "session-1", worktree: "wt-1", baseSha: sha("base"), publicInputHash: sha("public"), ...overrides };
  if (kind === "ARM_AUTHORING_STARTED") return { ...common, kind, arm, proof: { publicInputHash: sha("public"), actualInputManifestIdentity: sha("public"), actualInputManifestRef: "manifest.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0, clean: true } } as ProvenanceEvent;
  return { ...common, kind, arm, proof: { publicInputHash: sha("public"), actualInputManifestIdentity: sha("public"), actualInputManifestRef: "manifest.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0, clean: true, testsGreen: true, freezeSha: sha("freeze"), ownedPathsHash: sha("owned"), testsReceiptIdentity: sha("tests"), freezeCommitVerified: true } } as ProvenanceEvent;
};

describe("authoring elapsed", () => {
  const started = base("ARM_AUTHORING_STARTED", "tla", "2026-07-20T00:00:00Z", 0);
  const frozen = base("ARM_FROZEN", "tla", "2026-07-20T00:05:00Z", 1);
  test("is the Coordinator start->freeze UTC delta", () => {
    const result = measureAuthoringElapsed([started, frozen], "tla");
    expect(result.ok && result.value.durationMs).toBe(300_000);
  });
  test("missing freeze event yields no measurement", () => {
    const result = measureAuthoringElapsed([started], "tla");
    expect(result.ok).toBe(false);
  });
  test("a freeze earlier than the start is rejected", () => {
    const earlier = base("ARM_FROZEN", "tla", "2026-07-19T23:00:00Z", 1);
    const result = measureAuthoringElapsed([started, earlier], "tla");
    expect(result.ok).toBe(false);
  });
  test("broken actor/worktree continuity is rejected", () => {
    const drifted = base("ARM_FROZEN", "tla", "2026-07-20T00:05:00Z", 1, { worktree: "wt-2" });
    const result = measureAuthoringElapsed([started, drifted], "tla");
    expect(result.ok).toBe(false);
  });
});
