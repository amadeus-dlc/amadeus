import {
  ADOPTION_RECEIPT_IDS,
  type AdoptionReceiptId,
  DEFAULT_EVIDENCE_REPOSITORY_ROOT,
  validateEvidenceBundle,
  validateEvidenceRegistryFile,
} from "./repository-adoption-evidence.ts";
import type { BaselineDoc } from "./model.ts";
import { digest } from "./model.ts";

export { ADOPTION_RECEIPT_IDS, type AdoptionReceiptId } from "./repository-adoption-evidence.ts";

export type AdoptionReceipt = {
  readonly schemaVersion: 1;
  readonly id: AdoptionReceiptId;
  readonly currentRevision: string;
  readonly evidenceDigest: string;
  readonly pass: boolean;
};

export type EvidenceRegistry = {
  readonly schemaVersion: 1;
  readonly currentRevision: string;
  readonly receipts: readonly AdoptionReceipt[];
};

export type RegistryValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly problems: readonly string[] };

const FULL_SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REGISTRY_KEYS = ["currentRevision", "receipts", "schemaVersion"];
const RECEIPT_KEYS = ["currentRevision", "evidenceDigest", "id", "pass", "schemaVersion"];
const RECEIPT_ID_SET = new Set<string>(ADOPTION_RECEIPT_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function isFullRevision(value: unknown): value is string {
  return typeof value === "string" && FULL_SHA.test(value) && !/^0+$/.test(value);
}

export type RevisionEventContext = {
  readonly eventName: string;
  readonly pullRequestBaseSha?: string;
  readonly beforeSha?: string;
};

export function trustedRevisionForEvent(context: RevisionEventContext): string {
  const revision = context.eventName === "pull_request"
    ? context.pullRequestBaseSha
    : context.eventName === "push"
      ? context.beforeSha
      : undefined;
  if (!isFullRevision(revision)) throw new Error(`event ${context.eventName} does not supply a trusted full SHA`);
  return revision;
}

export function deadlineArgv(baseRevision: string): readonly string[] {
  if (!isFullRevision(baseRevision)) throw new Error("deadline command requires a trusted full SHA");
  return [
    "timeout",
    "--signal=TERM",
    "--kill-after=5s",
    "30s",
    "bun",
    "run",
    "no-silent-drop",
    "--",
    "--base-revision",
    baseRevision,
  ];
}

export type TimingSamples = {
  readonly cold: readonly number[];
  readonly warm: readonly number[];
};

export type TimingVerdict = {
  readonly pass: boolean;
  readonly coldMax?: number;
  readonly warmMax?: number;
};

export function validateTimingSamples(samples: TimingSamples): TimingVerdict {
  if (samples.cold.length !== 5 || samples.warm.length !== 5) return { pass: false };
  if (![...samples.cold, ...samples.warm].every((sample) => Number.isFinite(sample) && sample >= 0)) {
    return { pass: false };
  }
  const coldMax = Math.max(...samples.cold);
  const warmMax = Math.max(...samples.warm);
  return { pass: coldMax <= 15 && warmMax <= 15, coldMax, warmMax };
}

export function generatedLedgerFixture(scale: number): BaselineDoc {
  if (scale !== 0 && scale !== 2 && scale !== 4) throw new Error("ledger fixture scale must be r0, r2, or r4");
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: {
      revision: "fixture",
      censusDigest: digest(`capacity-r${scale}:census`),
      approvalDigest: digest(`capacity-r${scale}:approval`),
    },
    entries: Array.from({ length: scale }, (_, index) => ({
      fingerprint: digest(`capacity:finding:${index}`),
      ruleId: "NSD002" as const,
      file: `packages/framework/core/tools/capacity-${index}.ts`,
      reason: "Generated capacity ledger fixture.",
      issues: ["#1979"],
    })),
  };
}

export function emptyEvidenceRegistry(currentRevision: string): EvidenceRegistry {
  if (!isFullRevision(currentRevision)) throw new Error("current revision must be a non-zero full SHA");
  return { schemaVersion: 1, currentRevision, receipts: [] };
}

export function closeEvidenceReceipt(
  registry: EvidenceRegistry,
  receipt: AdoptionReceipt,
  repositoryRoot = DEFAULT_EVIDENCE_REPOSITORY_ROOT,
): EvidenceRegistry {
  const evidence = validateEvidenceBundle(repositoryRoot, registry.currentRevision);
  if (evidence.problems.length > 0) {
    throw new Error(`evidence bundle is invalid: ${evidence.problems.join("; ")}`);
  }
  assertPartialRegistry(registry, evidence.digests);
  if (!RECEIPT_ID_SET.has(receipt.id)) throw new Error(`unknown receipt id: ${receipt.id}`);
  if (receipt.schemaVersion !== 1) throw new Error(`receipt ${receipt.id} has an unknown schema version`);
  if (receipt.currentRevision !== registry.currentRevision) throw new Error(`receipt ${receipt.id} revision mismatch`);
  if (!SHA256.test(receipt.evidenceDigest)) throw new Error(`receipt ${receipt.id} evidence digest is invalid`);
  if (receipt.evidenceDigest !== evidence.digests.get(receipt.id)) {
    throw new Error(`receipt ${receipt.id} evidence digest does not match repository evidence`);
  }
  if (receipt.pass !== true) throw new Error(`receipt ${receipt.id} must pass before it can be closed`);
  if (registry.receipts.some((candidate) => candidate.id === receipt.id)) {
    throw new Error(`duplicate receipt id: ${receipt.id}`);
  }
  return { ...registry, receipts: [...registry.receipts, receipt] };
}

function assertPartialRegistry(
  registry: EvidenceRegistry,
  expectedDigests: ReadonlyMap<AdoptionReceiptId, string>,
): void {
  if (registry.schemaVersion !== 1) throw new Error("registry has an unknown schema version");
  if (!isFullRevision(registry.currentRevision)) throw new Error("registry current revision is invalid");
  if (!Array.isArray(registry.receipts)) throw new Error("registry receipts must be an array");
  const receivedIds = new Set<string>();
  const problems = registry.receipts.flatMap((candidate, index) =>
    validateReceipt(candidate, index, registry.currentRevision, receivedIds, expectedDigests));
  if (problems.length > 0) throw new Error(`registry is not safe to extend: ${problems.join("; ")}`);
}

function validateReceipt(
  candidate: unknown,
  index: number,
  expectedRevision: string,
  receivedIds: Set<string>,
  expectedDigests?: ReadonlyMap<AdoptionReceiptId, string>,
): string[] {
  if (!isRecord(candidate)) return [`receipt ${index} must be an object`];
  const problems: string[] = [];
  if (!hasExactKeys(candidate, RECEIPT_KEYS)) problems.push(`receipt ${index} fields do not match schema version 1`);
  if (candidate.schemaVersion !== 1) problems.push(`receipt ${index} schemaVersion must be 1`);
  if (typeof candidate.id !== "string" || !RECEIPT_ID_SET.has(candidate.id)) {
    return [...problems, `receipt ${index} has an unknown id`];
  }
  const receiptId = candidate.id as AdoptionReceiptId;
  if (receivedIds.has(candidate.id)) problems.push(`duplicate receipt id: ${candidate.id}`);
  receivedIds.add(candidate.id);
  if (candidate.currentRevision !== expectedRevision) problems.push(`receipt ${candidate.id} revision mismatch`);
  if (typeof candidate.evidenceDigest !== "string" || !SHA256.test(candidate.evidenceDigest)) {
    problems.push(`receipt ${candidate.id} evidence digest is invalid`);
  } else if (expectedDigests !== undefined && candidate.evidenceDigest !== expectedDigests.get(receiptId)) {
    problems.push(`receipt ${candidate.id} evidence digest does not match repository evidence`);
  }
  if (candidate.pass !== true) problems.push(`receipt ${candidate.id} is not passing`);
  return problems;
}

export function evidenceDigestForReceipt(
  id: AdoptionReceiptId,
  expectedRevision: string,
  repositoryRoot = DEFAULT_EVIDENCE_REPOSITORY_ROOT,
): string {
  const evidence = validateEvidenceBundle(repositoryRoot, expectedRevision);
  if (evidence.problems.length > 0) throw new Error(`evidence bundle is invalid: ${evidence.problems.join("; ")}`);
  const evidenceDigest = evidence.digests.get(id);
  if (evidenceDigest === undefined) throw new Error(`missing evidence id: ${id}`);
  return evidenceDigest;
}

export function validateEvidenceRegistry(
  value: unknown,
  expectedRevision: string,
  repositoryRoot = DEFAULT_EVIDENCE_REPOSITORY_ROOT,
): RegistryValidation {
  const evidence = validateEvidenceBundle(repositoryRoot, expectedRevision);
  const problems: string[] = [...evidence.problems, ...validateEvidenceRegistryFile(repositoryRoot, value)];
  if (!isFullRevision(expectedRevision)) problems.push("expected revision is not a non-zero full SHA");
  if (!isRecord(value)) return { ok: false, problems: [...problems, "registry must be an object"] };
  if (!hasExactKeys(value, REGISTRY_KEYS)) problems.push("registry fields do not match schema version 1");
  if (value.schemaVersion !== 1) problems.push("registry schemaVersion must be 1");
  if (value.currentRevision !== expectedRevision) problems.push("registry current revision mismatch");
  if (!Array.isArray(value.receipts)) return { ok: false, problems: [...problems, "registry receipts must be an array"] };

  const receivedIds = new Set<string>();
  for (const [index, candidate] of value.receipts.entries()) {
    problems.push(...validateReceipt(candidate, index, expectedRevision, receivedIds, evidence.digests));
  }

  for (const id of ADOPTION_RECEIPT_IDS) {
    if (!receivedIds.has(id)) problems.push(`missing receipt id: ${id}`);
  }
  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}
