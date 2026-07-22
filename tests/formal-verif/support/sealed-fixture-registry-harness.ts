import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../../scripts/formal-verif/canonical.ts";
import { createDefectUniverse, denominatorReceiptIdentity, type DefectUniverse } from "../../../scripts/formal-verif/fixture-registry-domain.ts";
import { createIndependentFallingProof, type GitBranchInspection } from "../../../scripts/formal-verif/fixture-proof.ts";
import { createSealedFixture, fixturePayloadIdentity, type FixtureSealInput, type SealedFixture } from "../../../scripts/formal-verif/fixture-registry.ts";
import { createPayloadManifest, scanFixturePayload } from "../../../scripts/formal-verif/fixture-scan.ts";
import { foldLedger, type FoldedLedger, type ProvenanceEvent } from "../../../scripts/formal-verif/provenance.ts";

export { createFsFixtureRegistryForTesting as createTestFixtureRegistry } from "../../../scripts/formal-verif/fs-fixture-registry.ts";

export const fixtureSha = (char: string) => char.repeat(64);
export const fixtureHunk = (index: number) => ({ path: `src/f${index}.ts`, oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, hunkHash: fixtureSha("c") });
export const fixtureRowInput = (index: number) => ({ defectId: `D${index}`, predicateId: `P${index}`, sourceRefs: [`issues/${1250 + index}`], fixCommit: fixtureSha(String(index)), baselineSha: fixtureSha("a"), targetRegression: `target-${index}`, nonTargetRegressions: [`other-${index}`], patchIdentity: fixtureSha("b"), allowedHunks: [fixtureHunk(index)], affectedPaths: [`src/f${index}.ts`], rootCluster: `R${Math.min(index, 5)}`, proofIdentity: fixtureSha("123456789abcdef"[index]!) });

export function sevenFixtureUniverse(): DefectUniverse {
  const result = createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "revision-7", baselineSha: fixtureSha("a"), rows: Array.from({ length: 7 }, (_, index) => fixtureRowInput(index + 1)) });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

export async function sealedFixtureSet(): Promise<{ universe: DefectUniverse; fixtures: SealedFixture[]; payloads: Map<string, Record<string, Uint8Array>>; sealInputs: Map<string, FixtureSealInput> }> {
  const provisional = sevenFixtureUniverse();
  const root = mkdtempSync(join(tmpdir(), "fv-fixture-harness-")); const baselineWorktree = join(root, "baseline"); const injectedWorktree = join(root, "injected"); mkdirSync(baselineWorktree); mkdirSync(injectedWorktree);
  const prepared = await Promise.all(provisional.rows.map(async (row, index) => {
    const inspection: GitBranchInspection = { baselineSha: row.baselineSha, baselineTreeHash: fixtureSha("0"), injectionSha: fixtureSha("123456789abcdef"[index + 1]!), parentShas: [row.baselineSha], treeHash: fixtureSha("fedcba987654321"[index]!), patchIdentity: row.patchIdentity, changedHunks: row.allowedHunks };
    const outcome = (exitCode: number, text: string) => ({ exitCode, signal: null, stdout: new TextEncoder().encode(text), stderr: new Uint8Array(), timedOut: false, completedExploration: true, toolVersions: { bun: "1.3.13" } });
    const proof = await createIndependentFallingProof({ row, repositoryRoot: root, baselineWorktree, injectedWorktree, executableIdentity: fixtureSha("1"), testIdentity: fixtureSha("2"), argv: ["bun", "test"], artifactRefs: [`evidence/proof-${index + 1}.json`], deadlineMs: 100 }, { process: { execute: async (request) => request.phase === "INJECTED_TARGET" ? outcome(1, "red") : outcome(0, request.phase.includes("NON_TARGET") ? "same" : "green") }, git: { inspect: async () => inspection } });
    if (!proof.ok) throw new Error(proof.error.message);
    return { inspection, proof: proof.value };
  }));
  const universeResult = createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "revision-7", baselineSha: fixtureSha("a"), rows: Array.from({ length: 7 }, (_, index) => ({ ...fixtureRowInput(index + 1), proofIdentity: prepared[index]!.proof.proofId })) });
  if (!universeResult.ok) throw new Error(universeResult.error.message);
  const universe = universeResult.value;
  const payloads = new Map<string, Record<string, Uint8Array>>();
  const sealInputs = new Map<string, FixtureSealInput>();
  const fixtures: SealedFixture[] = [];
  for (let index = 0; index < universe.rows.length; index++) {
    const row = universe.rows[index]!;
    const payload = { "fixture.bin": new TextEncoder().encode(`payload-${index + 1}`) };
    const content = payload["fixture.bin"];
    const manifest = createPayloadManifest([{ logicalPath: "fixture.bin", contentHash: createHash("sha256").update(content).digest("hex"), byteLength: content.byteLength }]);
    if (!manifest.ok) throw new Error(manifest.error.message);
    const scanRoot = join(root, `scan-${index}`); mkdirSync(scanRoot); writeFileSync(join(scanRoot, "fixture.bin"), content);
    const scanReceipt = await scanFixturePayload(scanRoot, manifest.value, { scannerVersion: "scanner-1", ruleSetIdentity: fixtureSha("e"), scan: async (request) => { for await (const chunk of request.chunks) void chunk; return { scannerVersion: "scanner-1", ruleSetIdentity: fixtureSha("e"), entryIdentity: request.entry.entryIdentity, secretCount: 0, personalDataCount: 0, externalStoreRefCount: 0 }; } }, "2026-07-20T00:00:00Z");
    if (!scanReceipt.ok) throw new Error(scanReceipt.error.message);
    const alias = index === 0 ? "fx-1252" : `fx-defect-${index + 1}`;
    const sealInput: FixtureSealInput = { universe, rowIdentity: row.rowIdentity, fixtureAlias: alias, proof: prepared[index]!.proof, branch: prepared[index]!.inspection, manifest: manifest.value, scanReceipt: scanReceipt.value };
    const sealed = createSealedFixture({ ...sealInput, disclosurePayloadIdentity: fixturePayloadIdentity(payload) });
    if (!sealed.ok) throw new Error(sealed.error.message);
    payloads.set(sealed.value.sealIdentity, payload);
    sealInputs.set(alias, sealInput);
    fixtures.push(sealed.value);
  }
  rmSync(root, { recursive: true, force: true });
  return { universe, fixtures, payloads, sealInputs };
}

export async function fiveSealedFixtureSet(): Promise<{ universe: DefectUniverse; fixtures: SealedFixture[]; payloads: Map<string, Record<string, Uint8Array>>; sealInputs: Map<string, FixtureSealInput> }> {
  const seven = await sealedFixtureSet();
  const rows = seven.universe.rows.map((row, index) => ({ ...fixtureRowInput(index + 1), proofIdentity: row.proofIdentity }));
  const rootMappings = rows.map(({ defectId, rootCluster }) => ({ defectId, rootCluster }));
  const mappingIdentity = canonicalIdentity(rootMappings, "amadeus.formal-verif.root-mapping.v1").sha256;
  const receiptBody = { dCount: 5 as const, mappingIdentity, requirementsIdentity: fixtureSha("e"), matrixIdentity: fixtureSha("f") };
  const universeResult = createDefectUniverse({ kind: "FIVE_ROOT_CLUSTERS", revisionId: "revision-5", baselineSha: fixtureSha("a"), rows, rootMappings, representativeProofs: rows.slice(0, 5).map((row) => ({ rootCluster: row.rootCluster, proofIdentity: row.proofIdentity })), denominatorReceipt: { ...receiptBody, receiptIdentity: denominatorReceiptIdentity(receiptBody) } });
  if (!universeResult.ok) throw new Error(universeResult.error.message);
  const universe = universeResult.value;
  const payloads = new Map<string, Record<string, Uint8Array>>();
  const sealInputs = new Map<string, FixtureSealInput>();
  const fixtures = seven.fixtures.slice(0, 5).map((fixture, index) => {
    const source = seven.sealInputs.get(fixture.fixtureAlias)!;
    const sealInput: FixtureSealInput = { ...source, universe, rowIdentity: universe.rows[index]!.rowIdentity };
    const payload = seven.payloads.get(fixture.sealIdentity)!;
    const sealed = createSealedFixture({ ...sealInput, disclosurePayloadIdentity: fixturePayloadIdentity(payload) });
    if (!sealed.ok) throw new Error(sealed.error.message);
    payloads.set(sealed.value.sealIdentity, payload);
    sealInputs.set(sealed.value.fixtureAlias, sealInput);
    return sealed.value;
  });
  return { universe, fixtures, payloads, sealInputs };
}

const startProof = { publicInputHash: fixtureSha("9"), actualInputManifestIdentity: fixtureSha("9"), actualInputManifestRef: "inputs/public.json", forbiddenScanReceiptIdentity: fixtureSha("8"), forbiddenMatchCount: 0 as const, clean: true as const };
const freezeProof = { ...startProof, testsGreen: true as const, freezeSha: fixtureSha("7"), ownedPathsHash: fixtureSha("6"), testsReceiptIdentity: fixtureSha("5"), freezeCommitVerified: true as const };
const base = (eventId: string, sequence: number, at: string, actorId: string, sessionId: string, worktree: string): Omit<ProvenanceEvent, "kind"> => ({ eventId, transactionId: `tx-${sequence}`, at, sequence, actorId, sessionId, worktree, baseSha: fixtureSha("a"), publicInputHash: fixtureSha("9") }) as Omit<ProvenanceEvent, "kind">;

export function completeFixtureLedger(): FoldedLedger {
  const events: ProvenanceEvent[] = [
    { ...base("t-start", 0, "2026-07-20T00:00:00Z", "t", "t-session", "worktrees/t"), kind: "ARM_AUTHORING_STARTED", arm: "tla", proof: startProof },
    { ...base("t-freeze", 1, "2026-07-20T00:00:01Z", "t", "t-session", "worktrees/t"), kind: "ARM_FROZEN", arm: "tla", proof: freezeProof },
    { ...base("reveal-1252", 2, "2026-07-20T00:00:02Z", "coordinator", "coord", "worktrees/t"), kind: "FIXTURE_REVEALED", arm: "tla", frozenEventId: "t-freeze", disclosureHash: fixtureSha("4") },
    { ...base("skeleton-pass", 3, "2026-07-20T00:00:03Z", "coordinator", "coord", "worktrees/t"), kind: "SKELETON_PASSED", cellResultIdentity: fixtureSha("3"), evidenceBundleHash: fixtureSha("2") },
    { ...base("s-start", 4, "2026-07-20T00:00:04Z", "s", "s-session", "worktrees/s"), kind: "ARM_AUTHORING_STARTED", arm: "ts", proof: startProof },
    { ...base("s-freeze", 5, "2026-07-20T00:00:05Z", "s", "s-session", "worktrees/s"), kind: "ARM_FROZEN", arm: "ts", proof: freezeProof },
  ];
  const result = foldLedger(events);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
