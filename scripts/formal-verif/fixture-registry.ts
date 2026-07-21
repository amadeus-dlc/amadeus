import { createHash } from "node:crypto";
import { canonicalIdentity } from "./canonical.ts";
import type { ArmId, Result } from "./contract.ts";
import { verifyDataSafetyReceipt, type DataSafetyReceipt, type SealedPayloadManifest } from "./fixture-scan.ts";
import { verifyFixtureBranch, verifyIndependentFallingProof, type GitBranchInspection, type IndependentFallingProof } from "./fixture-proof.ts";
import type { DCount, DefectUniverse, RegistryError } from "./fixture-registry-domain.ts";
import { foldLedger, type FoldedLedger } from "./provenance.ts";

export interface SealedFixture {
  fixtureAlias: string;
  fixtureKey: string;
  universeIdentity: string;
  rowIdentity: string;
  rootCluster: string;
  baselineSha: string;
  injectionSha: string;
  patchIdentity: string;
  proofIdentity: string;
  branchIdentity: string;
  payloadManifestIdentity: string;
  scanReceiptIdentity: string;
  disclosurePayloadIdentity: string;
  sealIdentity: string;
}

export interface FixtureSealInput {
  universe: DefectUniverse;
  rowIdentity: string;
  fixtureAlias: string;
  proof: IndependentFallingProof;
  branch: GitBranchInspection;
  manifest: SealedPayloadManifest;
  scanReceipt: DataSafetyReceipt;
}

export interface DisclosureAuthorization {
  universeIdentity: string;
  ledgerStateIdentity: string;
  fixtureAlias: string;
  sealedIdentity: string;
  arm: ArmId;
  worktree: string;
  frozenEventId: string;
  frozenAt: string;
  destinationPrefixes: readonly string[];
  authorizationIdentity: string;
}
const ISSUED_DISCLOSURE_AUTHORIZATIONS = new WeakSet<DisclosureAuthorization>();

export interface ManifestPromotionPermissionBody {
  kind: "ManifestPromotionPermission";
  stateIdentity: string;
  ledgerHead: string;
  tFreezeEventId: string;
  sFreezeEventId: string;
  skeletonPassEventId: string;
  dCount: DCount;
  universeIdentity: string;
  nonce: string;
}
export interface ManifestPromotionPermission extends ManifestPromotionPermissionBody { permissionIdentity: string }
export interface PromotedFixtureManifest {
  schemaVersion: 1;
  baselineSha: string;
  dCount: DCount;
  orderedEntries: readonly Omit<SealedFixture, "rowIdentity" | "rootCluster">[];
  universeIdentity: string;
  promotionPermissionIdentity: string;
  manifestIdentity: string;
}

const SHA = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ALIAS = /^fx-[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$/;
const RISK_FIRST_ALIAS = "fx-1252";
const safeRef = (value: string) => value.length > 0 && !value.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) && !value.split(/[\\/]/).includes("..");
const fail = (kind: "SealError" | "DisclosureError" | "PromotionError", message: string): Result<never, RegistryError> => ({ ok: false, error: { kind, message } });

export function fixturePayloadIdentity(payloads: Readonly<Record<string, Uint8Array>>): string {
  const entries = Object.entries(payloads).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([path, bytes]) => ({ path, byteLength: bytes.byteLength, contentHash: createHash("sha256").update(bytes).digest("hex") }));
  return canonicalIdentity(entries, "amadeus.formal-verif.disclosure-payload.v1").sha256;
}

function refold(ledger: FoldedLedger): Result<FoldedLedger, RegistryError> {
  const folded = foldLedger(ledger.events);
  if (!folded.ok) return fail("PromotionError", `ledger events are invalid: ${folded.error.message}`);
  if (folded.value.head !== ledger.head || folded.value.state !== ledger.state) return fail("PromotionError", "ledger head/state does not match its events");
  return folded;
}

export function ledgerStateIdentity(ledger: FoldedLedger): string {
  return canonicalIdentity({ state: ledger.state, head: ledger.head, events: ledger.events }, "amadeus.formal-verif.registry-ledger-state.v1").sha256;
}

function manifestPromotionPermissionIdentity(body: ManifestPromotionPermissionBody): string {
  return canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256;
}

export function createSealedFixture(input: FixtureSealInput & { disclosurePayloadIdentity: string }): Result<SealedFixture, RegistryError> {
  const row = input.universe.rows.find((candidate) => candidate.rowIdentity === input.rowIdentity);
  if (!row || !ALIAS.test(input.fixtureAlias) || !SHA.test(input.disclosurePayloadIdentity)) return fail("SealError", "seal references an unknown row, unsafe alias, or invalid disclosure payload");
  const proof = verifyIndependentFallingProof(row, input.proof);
  if (!proof.ok) return fail("SealError", proof.error.message);
  const branch = verifyFixtureBranch(row, input.branch);
  if (!branch.ok || branch.value !== input.proof.branchIdentity || input.branch.injectionSha !== input.proof.injectionSha || input.branch.baselineTreeHash !== input.proof.baselineTree || input.branch.treeHash !== input.proof.injectedTree) return fail("SealError", "branch isolation does not bind the falling proof");
  const scan = verifyDataSafetyReceipt(input.manifest, input.scanReceipt);
  if (!scan.ok) return fail("SealError", scan.error.message);
  const draft = {
    fixtureAlias: input.fixtureAlias,
    fixtureKey: input.universe.dCount === 7 ? row.rowIdentity : row.rootCluster,
    universeIdentity: input.universe.universeIdentity,
    rowIdentity: row.rowIdentity,
    rootCluster: row.rootCluster,
    baselineSha: row.baselineSha,
    injectionSha: input.branch.injectionSha,
    patchIdentity: row.patchIdentity,
    proofIdentity: input.proof.proofId,
    branchIdentity: branch.value,
    payloadManifestIdentity: input.manifest.manifestIdentity,
    scanReceiptIdentity: input.scanReceipt.receiptIdentity,
    disclosurePayloadIdentity: input.disclosurePayloadIdentity,
  };
  return { ok: true, value: { ...draft, sealIdentity: canonicalIdentity(draft, "amadeus.formal-verif.sealed-fixture.v1").sha256 } };
}

export function authorizeDisclosure(input: {
  universe: DefectUniverse;
  ledger: FoldedLedger;
  fixture: SealedFixture;
  arm: ArmId;
  worktree: string;
  frozenEventId: string;
  destinationPrefixes: readonly string[];
}): Result<DisclosureAuthorization, RegistryError> {
  const folded = refold(input.ledger);
  if (!folded.ok) return fail("DisclosureError", folded.error.message);
  const { sealIdentity, ...sealBody } = input.fixture;
  if (canonicalIdentity(sealBody, "amadeus.formal-verif.sealed-fixture.v1").sha256 !== sealIdentity || input.fixture.universeIdentity !== input.universe.universeIdentity || !input.universe.rows.some((row) => row.rowIdentity === input.fixture.rowIdentity) || !ALIAS.test(input.fixture.fixtureAlias)) return fail("DisclosureError", "fixture is not sealed in this universe");
  const freeze = folded.value.events.find((event) => event.kind === "ARM_FROZEN" && event.arm === input.arm && event.eventId === input.frozenEventId);
  if (!freeze || !safeRef(input.worktree) || input.destinationPrefixes.length === 0 || input.destinationPrefixes.some((prefix) => !safeRef(prefix)) || new Set(input.destinationPrefixes).size !== input.destinationPrefixes.length) return fail("DisclosureError", "disclosure freeze, worktree, or destination binding is invalid");
  const skeletonPassed = folded.value.events.some((event) => event.kind === "SKELETON_PASSED");
  if (input.arm === "tla" && input.fixture.fixtureAlias !== RISK_FIRST_ALIAS && !skeletonPassed) return fail("DisclosureError", "remaining T fixtures require a committed skeleton pass");
  const body = { universeIdentity: input.universe.universeIdentity, ledgerStateIdentity: ledgerStateIdentity(folded.value), fixtureAlias: input.fixture.fixtureAlias, sealedIdentity: input.fixture.sealIdentity, arm: input.arm, worktree: input.worktree, frozenEventId: input.frozenEventId, frozenAt: freeze.at, destinationPrefixes: [...input.destinationPrefixes] };
  const authorization = { ...body, authorizationIdentity: canonicalIdentity(body, "amadeus.formal-verif.disclosure-authorization.v1").sha256 };
  ISSUED_DISCLOSURE_AUTHORIZATIONS.add(authorization);
  return { ok: true, value: authorization };
}

export function verifyDisclosureAuthorization(universe: DefectUniverse, ledger: FoldedLedger, authorization: DisclosureAuthorization): Result<void, RegistryError> {
  const keys = "arm,authorizationIdentity,destinationPrefixes,fixtureAlias,frozenAt,frozenEventId,ledgerStateIdentity,sealedIdentity,universeIdentity,worktree";
  if (!ISSUED_DISCLOSURE_AUTHORIZATIONS.has(authorization) || Object.keys(authorization).sort().join(",") !== keys) return fail("DisclosureError", "disclosure authorization was not issued by the registry policy");
  const folded = refold(ledger);
  if (!folded.ok) return fail("DisclosureError", folded.error.message);
  const freeze = folded.value.events.find((event) => event.kind === "ARM_FROZEN" && event.arm === authorization.arm && event.eventId === authorization.frozenEventId);
  const { authorizationIdentity, ...body } = authorization;
  if (authorization.universeIdentity !== universe.universeIdentity || authorization.ledgerStateIdentity !== ledgerStateIdentity(folded.value) || freeze?.at !== authorization.frozenAt || !safeRef(authorization.worktree) || authorization.destinationPrefixes.length === 0 || authorization.destinationPrefixes.some((prefix) => !safeRef(prefix)) || new Set(authorization.destinationPrefixes).size !== authorization.destinationPrefixes.length || canonicalIdentity(body, "amadeus.formal-verif.disclosure-authorization.v1").sha256 !== authorizationIdentity) return fail("DisclosureError", "disclosure authorization binding is invalid");
  return { ok: true, value: undefined };
}

export function validateManifestPromotionPermissionBinding(universe: DefectUniverse, ledger: FoldedLedger, permission: ManifestPromotionPermission): Result<void, RegistryError> {
  if (Object.keys(permission).sort().join(",") !== "dCount,kind,ledgerHead,nonce,permissionIdentity,sFreezeEventId,skeletonPassEventId,stateIdentity,tFreezeEventId,universeIdentity") return fail("PromotionError", "promotion permission schema is invalid");
  const folded = refold(ledger);
  if (!folded.ok) return folded;
  if (folded.value.state !== "S_FROZEN" || folded.value.head === null) return fail("PromotionError", "both freezes after skeleton pass are required");
  const tFreeze = folded.value.events.find((event) => event.kind === "ARM_FROZEN" && event.arm === "tla");
  const sFreeze = folded.value.events.find((event) => event.kind === "ARM_FROZEN" && event.arm === "ts");
  const skeleton = folded.value.events.find((event) => event.kind === "SKELETON_PASSED");
  const { permissionIdentity, ...body } = permission;
  if (permission.kind !== "ManifestPromotionPermission" || permission.dCount !== universe.dCount || permission.universeIdentity !== universe.universeIdentity || permission.ledgerHead !== folded.value.head || permission.stateIdentity !== ledgerStateIdentity(folded.value) || permission.tFreezeEventId !== tFreeze?.eventId || permission.sFreezeEventId !== sFreeze?.eventId || permission.skeletonPassEventId !== skeleton?.eventId || !UUID.test(permission.nonce) || !SHA.test(permissionIdentity) || manifestPromotionPermissionIdentity(body) !== permissionIdentity) return fail("PromotionError", "promotion permission binding is invalid");
  return { ok: true, value: undefined };
}
