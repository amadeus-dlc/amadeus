import { createHash } from "node:crypto";
import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import type { CellEvidenceInput } from "./execution-evidence.ts";

export const PAYLOAD_ROLES = ["result.json", "command.json", "stdout.bin", "stderr.bin", "timing.json"] as const;
export type PayloadRole = (typeof PAYLOAD_ROLES)[number];
export const JSON_PAYLOAD_LIMIT = 1024 * 1024;
export const STREAM_PAYLOAD_LIMIT = 16 * 1024 * 1024;
export const INDEX_ENVELOPE_LIMIT = 64 * 1024;
export const BUNDLE_PAYLOAD_LIMIT = 35 * 1024 * 1024 + INDEX_ENVELOPE_LIMIT;

export interface PayloadManifestItem {
  role: PayloadRole;
  sha256: string;
  byteLength: number;
}

export interface EvidenceBundleDraft {
  bundleId: string;
  resultIdentity: string;
  manifest: readonly PayloadManifestItem[];
  payloads: Readonly<Record<PayloadRole, Uint8Array>>;
}

export interface LedgerCoordinates {
  expectedRunnerHead: string | null;
  expectedStoreHead: string | null;
  runnerSequence: number;
  storeSequence: number;
}

export interface EvidenceEnvelope extends LedgerCoordinates {
  bundleId: string;
  manifest: readonly PayloadManifestItem[];
  publishedAt: string;
  envelopeHash: string;
}

export interface EvidenceBundleError {
  kind: "EvidenceCapacityError" | "EvidenceIdentityError";
  message: string;
}

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value: unknown, domain: string): Uint8Array {
  return canonicalIdentity(value, domain).bytes;
}

export function createEvidenceBundle(input: CellEvidenceInput): Result<EvidenceBundleDraft, EvidenceBundleError> {
  const payloads: Record<PayloadRole, Uint8Array> = {
    "result.json": jsonBytes(input.result, "amadeus.formal-verif.evidence-result.v1"),
    "command.json": jsonBytes({ revisionIdentity: input.revisionIdentity, ...input.command }, "amadeus.formal-verif.evidence-command.v1"),
    "stdout.bin": input.stdout.slice(),
    "stderr.bin": input.stderr.slice(),
    "timing.json": jsonBytes(input.timing, "amadeus.formal-verif.evidence-timing.v1"),
  };
  for (const role of PAYLOAD_ROLES) {
    const limit = role.endsWith(".bin") ? STREAM_PAYLOAD_LIMIT : JSON_PAYLOAD_LIMIT;
    if (payloads[role].byteLength > limit) return { ok: false, error: { kind: "EvidenceCapacityError", message: `${role} exceeds its byte limit` } };
  }
  const total = PAYLOAD_ROLES.reduce((sum, role) => sum + payloads[role].byteLength, 0);
  if (total > BUNDLE_PAYLOAD_LIMIT) return { ok: false, error: { kind: "EvidenceCapacityError", message: "bundle exceeds its byte limit" } };
  const manifest = PAYLOAD_ROLES.map((role) => ({ role, sha256: hash(payloads[role]), byteLength: payloads[role].byteLength }));
  const bundleId = canonicalIdentity(manifest, "amadeus.formal-verif.evidence.v1").sha256;
  const resultIdentity = canonicalIdentity(input.result, "amadeus.formal-verif.cell-result.v1").sha256;
  return { ok: true, value: { bundleId, resultIdentity, manifest, payloads } };
}

export function createEvidenceEnvelope(bundle: EvidenceBundleDraft, coordinates: LedgerCoordinates, publishedAt: string): Result<EvidenceEnvelope, EvidenceBundleError> {
  if (!Number.isFinite(Date.parse(publishedAt)) || coordinates.runnerSequence < 0 || coordinates.storeSequence < 0) return { ok: false, error: { kind: "EvidenceIdentityError", message: "invalid envelope metadata" } };
  const preimage = { bundleId: bundle.bundleId, manifest: bundle.manifest, publishedAt, ...coordinates };
  const envelopeHash = canonicalIdentity(preimage, "amadeus.formal-verif.envelope.v1").sha256;
  const bytes = jsonBytes({ ...preimage, envelopeHash }, "amadeus.formal-verif.envelope-bytes.v1");
  if (bytes.byteLength > INDEX_ENVELOPE_LIMIT) return { ok: false, error: { kind: "EvidenceCapacityError", message: "index envelope exceeds its byte limit" } };
  return { ok: true, value: { ...preimage, envelopeHash } };
}

export function verifyEvidenceBundle(bundle: EvidenceBundleDraft): Result<void, EvidenceBundleError> {
  if (Object.keys(bundle.payloads).sort().join(",") !== [...PAYLOAD_ROLES].sort().join(",") || bundle.manifest.length !== PAYLOAD_ROLES.length) return { ok: false, error: { kind: "EvidenceIdentityError", message: "payload set is not closed" } };
  const expected = PAYLOAD_ROLES.map((role) => ({ role, sha256: hash(bundle.payloads[role]), byteLength: bundle.payloads[role].byteLength }));
  if (canonicalIdentity(expected).sha256 !== canonicalIdentity(bundle.manifest).sha256 || canonicalIdentity(expected, "amadeus.formal-verif.evidence.v1").sha256 !== bundle.bundleId) return { ok: false, error: { kind: "EvidenceIdentityError", message: "bundle identity mismatch" } };
  return { ok: true, value: undefined };
}
