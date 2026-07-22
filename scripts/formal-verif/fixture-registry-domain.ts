import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";

export type RegistryErrorKind =
  | "RegistrySchemaError"
  | "ProofError"
  | "BranchIsolationError"
  | "ScanError"
  | "SealError"
  | "DisclosureError"
  | "PromotionError"
  | "CapacityError"
  | "CommitError";

export interface RegistryError {
  kind: RegistryErrorKind;
  message: string;
  path?: string;
  expected?: string;
  actual?: string;
  cause?: string;
}

export type DCount = 7 | 5;
export interface AllowedHunk {
  path: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  hunkHash: string;
}

export interface DefectRow {
  defectId: string;
  predicateId: string;
  sourceRefs: readonly string[];
  fixCommit: string;
  baselineSha: string;
  targetRegression: string;
  nonTargetRegressions: readonly string[];
  patchIdentity: string;
  allowedHunks: readonly AllowedHunk[];
  affectedPaths: readonly string[];
  rootCluster: string;
  proofIdentity: string;
  rowIdentity: string;
}

export interface RootMapping { defectId: string; rootCluster: string }
export interface RepresentativeProof { rootCluster: string; proofIdentity: string }
export interface DenominatorReceipt {
  dCount: 5;
  mappingIdentity: string;
  requirementsIdentity: string;
  matrixIdentity: string;
  receiptIdentity: string;
}

export type DefectUniverse =
  | { kind: "SEVEN_PREDICATES"; dCount: 7; revisionId: string; baselineSha: string; rows: readonly DefectRow[]; universeIdentity: string }
  | { kind: "FIVE_ROOT_CLUSTERS"; dCount: 5; revisionId: string; baselineSha: string; rows: readonly DefectRow[]; rootMappings: readonly RootMapping[]; representativeProofs: readonly RepresentativeProof[]; denominatorReceipt: DenominatorReceipt; universeIdentity: string };

const SHA = /^[0-9a-f]{64}$/;
const SAFE_PATH = /^(?![A-Za-z]:[\\/])(?![\\/~])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))[^\0]+$/;
const EXACT = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const plain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0 && !value.includes("\0");
const safePath = (value: unknown): value is string => nonEmpty(value) && SAFE_PATH.test(value);
const fail = (message: string, path = "$universe"): Result<never, RegistryError> => ({ ok: false, error: { kind: "RegistrySchemaError", message, path } });

function parseHunk(value: unknown, path: string): Result<AllowedHunk, RegistryError> {
  if (!plain(value) || !EXACT(value, ["path", "oldStart", "oldLines", "newStart", "newLines", "hunkHash"])) return fail("allowed hunk must use the closed schema", path);
  if (!safePath(value.path) || !SHA.test(String(value.hunkHash))) return fail("hunk path or hash is invalid", path);
  for (const key of ["oldStart", "oldLines", "newStart", "newLines"] as const) {
    if (!Number.isSafeInteger(value[key]) || Number(value[key]) < (key.endsWith("Start") ? 1 : 0)) return fail("hunk range is invalid", `${path}.${key}`);
  }
  return { ok: true, value: value as unknown as AllowedHunk };
}

function parseRow(value: unknown, baselineSha: string, path: string): Result<DefectRow, RegistryError> {
  const keys = ["defectId", "predicateId", "sourceRefs", "fixCommit", "baselineSha", "targetRegression", "nonTargetRegressions", "patchIdentity", "allowedHunks", "affectedPaths", "rootCluster", "proofIdentity"];
  if (!plain(value) || !EXACT(value, keys)) return fail("defect row must use the closed schema", path);
  for (const key of ["defectId", "predicateId", "targetRegression", "rootCluster"] as const) if (!nonEmpty(value[key])) return fail(`${key} is required`, `${path}.${key}`);
  for (const key of ["fixCommit", "baselineSha", "patchIdentity", "proofIdentity"] as const) if (!SHA.test(String(value[key]))) return fail(`${key} must be SHA-256`, `${path}.${key}`);
  if (value.baselineSha !== baselineSha) return fail("all rows must share the universe baseline", `${path}.baselineSha`);
  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0 || value.sourceRefs.some((ref) => !nonEmpty(ref) || (!safePath(ref) && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+$/.test(ref)))) return fail("sourceRefs must be repository or GitHub identities", `${path}.sourceRefs`);
  if (!Array.isArray(value.nonTargetRegressions) || value.nonTargetRegressions.some((item) => !nonEmpty(item)) || new Set(value.nonTargetRegressions).size !== value.nonTargetRegressions.length || value.nonTargetRegressions.includes(value.targetRegression)) return fail("non-target regressions must be unique and exclude target", `${path}.nonTargetRegressions`);
  if (!Array.isArray(value.allowedHunks) || value.allowedHunks.length === 0) return fail("at least one allowed hunk is required", `${path}.allowedHunks`);
  const hunks: AllowedHunk[] = [];
  for (let index = 0; index < value.allowedHunks.length; index++) {
    const parsed = parseHunk(value.allowedHunks[index], `${path}.allowedHunks[${index}]`);
    if (!parsed.ok) return parsed;
    hunks.push(parsed.value);
  }
  if (!Array.isArray(value.affectedPaths) || value.affectedPaths.length === 0 || value.affectedPaths.some((item) => !safePath(item)) || new Set(value.affectedPaths).size !== value.affectedPaths.length) return fail("affected paths must be unique repository paths", `${path}.affectedPaths`);
  const affectedPaths = value.affectedPaths as string[];
  if (hunks.some((hunk) => !affectedPaths.includes(hunk.path))) return fail("every hunk path must be affected", `${path}.allowedHunks`);
  const row = { ...value, allowedHunks: hunks } as unknown as Omit<DefectRow, "rowIdentity">;
  const { proofIdentity: _proofIdentity, ...rowIdentityBody } = row;
  return { ok: true, value: { ...row, rowIdentity: canonicalIdentity(rowIdentityBody, "amadeus.formal-verif.fixture-row.v1").sha256 } };
}

function unique(rows: readonly DefectRow[]): Result<void, RegistryError> {
  for (const key of ["defectId", "predicateId", "rowIdentity", "proofIdentity"] as const) {
    if (new Set(rows.map((row) => row[key])).size !== rows.length) return fail(`duplicate ${key} is not a closed universe`, "$universe.rows");
  }
  return { ok: true, value: undefined };
}

export function denominatorReceiptIdentity(receipt: Omit<DenominatorReceipt, "receiptIdentity">): string {
  return canonicalIdentity(receipt, "amadeus.formal-verif.denominator-receipt.v1").sha256;
}

export function createDefectUniverse(value: unknown): Result<DefectUniverse, RegistryError> {
  if (!plain(value) || (value.kind !== "SEVEN_PREDICATES" && value.kind !== "FIVE_ROOT_CLUSTERS")) return fail("unknown universe variant");
  const common = ["kind", "revisionId", "baselineSha", "rows"];
  const expected = value.kind === "SEVEN_PREDICATES" ? common : [...common, "rootMappings", "representativeProofs", "denominatorReceipt"];
  if (!EXACT(value, expected) || !nonEmpty(value.revisionId) || !SHA.test(String(value.baselineSha)) || !Array.isArray(value.rows) || value.rows.length !== 7) return fail("universe must contain exactly seven candidate rows and no unknown fields");
  const rows: DefectRow[] = [];
  for (let index = 0; index < value.rows.length; index++) {
    const parsed = parseRow(value.rows[index], value.baselineSha as string, `$universe.rows[${index}]`);
    if (!parsed.ok) return parsed;
    rows.push(parsed.value);
  }
  const distinct = unique(rows);
  if (!distinct.ok) return distinct;
  if (value.kind === "SEVEN_PREDICATES") {
    const draft = { kind: "SEVEN_PREDICATES" as const, dCount: 7 as const, revisionId: value.revisionId as string, baselineSha: value.baselineSha as string, rows };
    return { ok: true, value: { ...draft, universeIdentity: canonicalIdentity(draft, "amadeus.formal-verif.fixture-universe.v1").sha256 } };
  }
  if (!Array.isArray(value.rootMappings) || value.rootMappings.length !== rows.length || !Array.isArray(value.representativeProofs) || value.representativeProofs.length !== 5 || !plain(value.denominatorReceipt)) return fail("five-cluster universe requires total mapping, five proofs, and denominator receipt");
  const mappingKeys = ["defectId", "rootCluster"];
  if (value.rootMappings.some((item) => !plain(item) || !EXACT(item, mappingKeys) || !nonEmpty(item.defectId) || !nonEmpty(item.rootCluster))) return fail("root mapping schema is invalid", "$universe.rootMappings");
  const mappings = value.rootMappings as unknown as RootMapping[];
  if (new Set(mappings.map((item) => item.defectId)).size !== rows.length || rows.some((row) => !mappings.some((item) => item.defectId === row.defectId && item.rootCluster === row.rootCluster)) || new Set(mappings.map((item) => item.rootCluster)).size !== 5) return fail("candidate-to-root mapping must be total and close exactly five roots", "$universe.rootMappings");
  const proofKeys = ["rootCluster", "proofIdentity"];
  if (value.representativeProofs.some((item) => !plain(item) || !EXACT(item, proofKeys) || !nonEmpty(item.rootCluster) || !SHA.test(String(item.proofIdentity)))) return fail("representative proof schema is invalid", "$universe.representativeProofs");
  const proofs = value.representativeProofs as unknown as RepresentativeProof[];
  if (new Set(proofs.map((item) => item.rootCluster)).size !== 5 || new Set(proofs.map((item) => item.proofIdentity)).size !== 5 || [...new Set(mappings.map((item) => item.rootCluster))].some((root) => !proofs.some((item) => item.rootCluster === root)) || proofs.some((proof) => rows.filter((row) => row.rootCluster === proof.rootCluster && row.proofIdentity === proof.proofIdentity).length !== 1)) return fail("each root requires one independent representative proof", "$universe.representativeProofs");
  const receiptKeys = ["dCount", "mappingIdentity", "requirementsIdentity", "matrixIdentity", "receiptIdentity"];
  const receipt = value.denominatorReceipt;
  if (!EXACT(receipt, receiptKeys) || receipt.dCount !== 5 || [receipt.mappingIdentity, receipt.requirementsIdentity, receipt.matrixIdentity, receipt.receiptIdentity].some((item) => !SHA.test(String(item)))) return fail("denominator receipt schema is invalid", "$universe.denominatorReceipt");
  const mappingIdentity = canonicalIdentity(mappings, "amadeus.formal-verif.root-mapping.v1").sha256;
  const { receiptIdentity, ...receiptBody } = receipt as unknown as DenominatorReceipt;
  if (receipt.mappingIdentity !== mappingIdentity || receiptIdentity !== denominatorReceiptIdentity(receiptBody)) return fail("denominator receipt does not bind the total mapping", "$universe.denominatorReceipt");
  const draft = { kind: "FIVE_ROOT_CLUSTERS" as const, dCount: 5 as const, revisionId: value.revisionId as string, baselineSha: value.baselineSha as string, rows, rootMappings: mappings, representativeProofs: proofs, denominatorReceipt: receipt as unknown as DenominatorReceipt };
  return { ok: true, value: { ...draft, universeIdentity: canonicalIdentity(draft, "amadeus.formal-verif.fixture-universe.v1").sha256 } };
}
