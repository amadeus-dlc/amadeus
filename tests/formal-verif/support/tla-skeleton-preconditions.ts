import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../../scripts/formal-verif/canonical.ts";
import { createFsEvidenceStoreForTesting } from "../../../scripts/formal-verif/fs-evidence-store.ts";
import { authorizeDisclosure } from "../../../scripts/formal-verif/fixture-registry.ts";
import { FsProvenanceStoreAdapter } from "../../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction, foldLedger, type FreezeProof, type ProvenanceEvent } from "../../../scripts/formal-verif/provenance.ts";
import { createFrozenTlaModelReceipt, generateFrozenTlaModel } from "../../../scripts/formal-verif/tla-arm.ts";
import { SKELETON_REQUIRED_RESERVATION_BYTES, type SkeletonPreconditionInput } from "../../../scripts/formal-verif/tla-skeleton.ts";
import { FIXED_JDK_RUN_PROFILE_IDENTITY, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, FIXED_TLC_PROFILE_IDENTITY } from "../../../scripts/formal-verif/tlc-toolchain.ts";
import { createTestFixtureRegistry, sealedFixtureSet } from "./sealed-fixture-registry-harness.ts";

const sha = (value: string) => canonicalIdentity(value, "test.formal-verif.skeleton-preconditions.v1").sha256;
const fixturesPromise = sealedFixtureSet();
const at = (second: number) => `2026-07-20T00:00:0${second}Z`;

export async function createIssuedSkeletonPrecondition(): Promise<{ input: SkeletonPreconditionInput; dispose(): void }> {
  const root = mkdtempSync(join(tmpdir(), "fv-skeleton-preconditions-"));
  try {
    const set = await fixturesPromise; const fixture = set.fixtures[0]!;
    const publicInputHash = sha("public-input"); const freezeSha = sha("t-freeze");
    const base = (eventId: string, sequence: number) => ({ eventId, at: at(sequence), sequence, actorId: "t-author", sessionId: "t-session", worktree: "worktrees/t", baseSha: fixture.baselineSha, publicInputHash });
    const startProof = { publicInputHash, actualInputManifestIdentity: publicInputHash, actualInputManifestRef: "inputs/public.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0 as const, clean: true as const };
    const freezeProof: FreezeProof = { ...startProof, testsGreen: true, freezeSha, ownedPathsHash: sha("owned"), testsReceiptIdentity: sha("tests"), freezeCommitVerified: true };
    const start = { ...base(sha("t-start"), 0), kind: "ARM_AUTHORING_STARTED" as const, arm: "tla" as const, proof: startProof };
    const freeze = { ...base(sha("t-frozen"), 1), kind: "ARM_FROZEN" as const, arm: "tla" as const, proof: freezeProof };
    const first = createTransaction(null, [start, freeze]);
    const provenanceStore = new FsProvenanceStoreAdapter(join(root, "provenance"));
    const firstCommit = await provenanceStore.appendBatch(null, first.transactionId, first.events);
    if (!firstCommit.ok) throw new Error(firstCommit.error.message);
    const authorizationLedger = foldLedger(first.events); if (!authorizationLedger.ok) throw new Error(authorizationLedger.error.message);

    const registry = createTestFixtureRegistry(join(root, "fixtures"), { utcNow: () => at(2), owner: { host: "test-host", pid: 42, processStartedAt: "test-process" }, liveness: () => "live", sandboxAvailable: () => true }, 64 * 1024);
    const capacity = registry.reserveCapacity({ reservationId: "skeleton-fixtures", revisionId: set.universe.universeIdentity, baselineSha: fixture.baselineSha });
    if (!capacity.ok) throw new Error(capacity.error.message);
    const sealed = registry.publishSeal(set.sealInputs.get(fixture.fixtureAlias)!, set.payloads.get(fixture.sealIdentity)!);
    if (!sealed.ok) throw new Error(sealed.error.message);
    const authorization = authorizeDisclosure({ universe: set.universe, ledger: authorizationLedger.value, fixture, arm: "tla", worktree: "worktrees/t", frozenEventId: freeze.eventId, destinationPrefixes: ["fixtures"] });
    if (!authorization.ok) throw new Error(authorization.error.message);
    const disclosure = registry.publishDisclosure(set.universe, authorizationLedger.value, authorization.value, at(2));
    if (!disclosure.ok) throw new Error(disclosure.error.message);
    const worktree = join(root, "worktree"); mkdirSync(worktree);
    const materialization = registry.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktree, "fixtures/fx-1252");
    if (!materialization.ok) throw new Error(materialization.error.message);

    const revealBody: Omit<Extract<ProvenanceEvent, { kind: "FIXTURE_REVEALED" }>, "transactionId"> = { ...base(sha("reveal"), 2), actorId: "coordinator", sessionId: "coordinator-session", kind: "FIXTURE_REVEALED", arm: "tla", frozenEventId: freeze.eventId, disclosureHash: materialization.value.materializedIdentity };
    const reveal = createTransaction(firstCommit.value.head, [revealBody]);
    const revealCommit = await provenanceStore.appendBatch(firstCommit.value.head, reveal.transactionId, reveal.events);
    if (!revealCommit.ok) throw new Error(revealCommit.error.message);
    const provenance = provenanceStore.readLedger(); if (!provenance.ok) throw new Error(provenance.error.message);

    const revisionIdentity = sha("revision");
    const evidence = createFsEvidenceStoreForTesting(join(root, "evidence"), { nowMs: () => 0, utcNow: () => at(3) });
    const reservation = evidence.reserveCapacity(revisionIdentity, SKELETON_REQUIRED_RESERVATION_BYTES);
    if (!reservation.ok) throw new Error(reservation.error.message);
    const model = createFrozenTlaModelReceipt(generateFrozenTlaModel({ publicContractIdentity: publicInputHash }));
    const input: SkeletonPreconditionInput = {
      revisionIdentity,
      provenance: provenance.value,
      materialization: materialization.value,
      model,
      reservation: reservation.value,
      jarIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      jdkIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
      profileIdentity: FIXED_TLC_PROFILE_IDENTITY,
      composition: { baseSha: fixture.baselineSha, armFreezeSha: freezeSha, armOwnedDiffIdentity: sha("arm-diff"), injectionSha: fixture.injectionSha, injectionPatchIdentity: fixture.patchIdentity, applicationOrder: "ARM_T_OWNED_DIFF_THEN_1252_PATCH", armOverlayTree: sha("arm-tree"), injectionOverlayTree: sha("injection-tree"), resultingTreeHash: sha("resulting-tree"), resultingCommitSha: sha("resulting-commit"), parentCount: 1, clean: true, dedicated: true },
      ciTrust: { repository: "amadeus-dlc/amadeus", workflowPath: ".github/workflows/formal-verification.yml", workflowBlobSha: sha("workflow"), workflowRef: fixture.baselineSha, commandIdentity: sha("ci-command") },
    };
    return { input, dispose: () => rmSync(root, { recursive: true, force: true }) };
  } catch (cause) {
    rmSync(root, { recursive: true, force: true });
    throw cause;
  }
}
