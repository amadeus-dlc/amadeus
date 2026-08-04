import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  type EvidenceEntry,
  evidenceDigestForEntry,
} from "./repository-adoption-evidence.ts";
import {
  type AdoptionReceiptId,
  type EvidenceRegistry,
  validateEvidenceRegistry,
} from "./repository-adoption.ts";

export const EVIDENCE_REGISTRY_PATH = "tests/no-silent-drop/adoption-evidence.json";
export const EVIDENCE_MANIFEST_PATH = "tests/no-silent-drop/adoption-evidence-manifest.json";
export const EVIDENCE_RUNS_PATH = "tests/no-silent-drop/evidence/adoption-runs.json";
export const EVIDENCE_BUNDLE_PATHS = [
  EVIDENCE_MANIFEST_PATH,
  EVIDENCE_REGISTRY_PATH,
  EVIDENCE_RUNS_PATH,
] as const;

export type RebindCounts = {
  registryRevisions: number;
  manifestRevisions: number;
  runRevisions: number;
  artifactDigests: number;
  receiptDigests: number;
};

export type RebindStatus = "changed" | "no-op" | "superseded" | "error";

export type RebindEnvelope = {
  schemaVersion: 1;
  operation: "no-silent-drop-evidence-rebind";
  status: RebindStatus;
  code: string;
  eventRevision: string | null;
  bindingRevision: string | null;
  targetRevision: string | null;
  changed: boolean;
  counts: RebindCounts;
  paths: string[];
  validation: { ok: boolean; problems: string[] };
  error: null | { code: string; message: string };
};

export class EvidenceRebindError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly problems: readonly string[] = [],
  ) {
    super(message);
    this.name = "EvidenceRebindError";
  }
}

export type ReboundBundle = {
  bindingRevision: string;
  targetRevision: string;
  changed: boolean;
  counts: RebindCounts;
  paths: string[];
  originalBytes: ReadonlyMap<string, Buffer>;
  candidateBytes: ReadonlyMap<string, Buffer>;
};

export type AppliedBundle = {
  paths: readonly string[];
  originalBytes: ReadonlyMap<string, Buffer>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fullSha(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value) || /^0+$/.test(value)) {
    throw new EvidenceRebindError("REBIND_INPUT_INVALID", `${label} must be a non-zero lowercase full SHA`);
  }
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", `${label} must be an array`);
  return value;
}

function record(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", `${label} must be an object`);
  return value;
}

function parseJson(bytes: Buffer, path: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", `${path}: ${String(error)}`);
  }
  return record(value, path);
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBundleBytes(repositoryRoot: string): Map<string, Buffer> {
  const bytes = new Map<string, Buffer>();
  for (const path of EVIDENCE_BUNDLE_PATHS) {
    try {
      bytes.set(path, readFileSync(join(repositoryRoot, path)));
    } catch (error) {
      throw new EvidenceRebindError("REBIND_IO_READ_FAILED", `${path}: ${String(error)}`);
    }
  }
  return bytes;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function evidenceEntries(manifest: JsonRecord): JsonRecord[] {
  return array(manifest.evidence, "manifest.evidence").map((value, index) =>
    record(value, `manifest.evidence[${index}]`));
}

function evidenceRuns(entry: JsonRecord, label: string): JsonRecord[] {
  return array(entry.runs, `${label}.runs`).map((value, index) => record(value, `${label}.runs[${index}]`));
}

function artifact(run: JsonRecord, label: string): JsonRecord {
  return record(run.artifact, `${label}.artifact`);
}

function artifactDigestMap(repositoryRoot: string, entries: readonly JsonRecord[], runsBytes: Buffer): Map<string, string> {
  const digests = new Map<string, string>();
  for (const [entryIndex, entry] of entries.entries()) {
    for (const [runIndex, run] of evidenceRuns(entry, `manifest.evidence[${entryIndex}]`).entries()) {
      const ref = artifact(run, `manifest.evidence[${entryIndex}].runs[${runIndex}]`);
      if (typeof ref.path !== "string") {
        throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", "manifest artifact path must be a string");
      }
      if (digests.has(ref.path)) continue;
      if (ref.path === EVIDENCE_RUNS_PATH) {
        digests.set(ref.path, sha256(runsBytes));
        continue;
      }
      try {
        digests.set(ref.path, sha256(readFileSync(join(repositoryRoot, ref.path))));
      } catch (error) {
        throw new EvidenceRebindError("REBIND_IO_READ_FAILED", `${ref.path}: ${String(error)}`);
      }
    }
  }
  return digests;
}

function assertCandidateShape(
  registry: JsonRecord,
  manifest: JsonRecord,
  runsDocument: JsonRecord,
  targetRevision: string,
  artifactDigests: ReadonlyMap<string, string>,
): void {
  const problems: string[] = [];
  if (registry.currentRevision !== targetRevision) problems.push("registry current revision mismatch");
  const entries = evidenceEntries(manifest);
  problems.push(...candidateManifestProblems(manifest, entries, targetRevision, artifactDigests));
  problems.push(...candidateReceiptProblems(registry, entries, targetRevision, artifactDigests));
  problems.push(...candidateRunProblems(runsDocument, targetRevision));
  if (problems.length > 0) {
    throw new EvidenceRebindError("REBIND_VALIDATION_FAILED", "candidate evidence bundle is invalid", problems);
  }
}

function candidateManifestProblems(
  manifest: JsonRecord,
  entries: readonly JsonRecord[],
  targetRevision: string,
  artifactDigests: ReadonlyMap<string, string>,
): string[] {
  const problems: string[] = [];
  if (manifest.testedRevision !== targetRevision) problems.push("manifest revision mismatch");
  for (const [index, entry] of entries.entries()) {
    if (entry.testedRevision !== targetRevision) problems.push(`manifest entry ${index} revision mismatch`);
    for (const [runIndex, run] of evidenceRuns(entry, `manifest.evidence[${index}]`).entries()) {
      const ref = artifact(run, `manifest.evidence[${index}].runs[${runIndex}]`);
      if (typeof ref.path !== "string" || ref.sha256 !== artifactDigests.get(ref.path)) {
        problems.push(`manifest entry ${index} run ${runIndex} artifact digest mismatch`);
      }
    }
  }
  return problems;
}

function candidateReceiptProblems(
  registry: JsonRecord,
  entries: readonly JsonRecord[],
  targetRevision: string,
  artifactDigests: ReadonlyMap<string, string>,
): string[] {
  const problems: string[] = [];
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const [index, value] of array(registry.receipts, "registry.receipts").entries()) {
    const receipt = record(value, `registry.receipts[${index}]`);
    if (receipt.currentRevision !== targetRevision) problems.push(`receipt ${String(receipt.id)} revision mismatch`);
    const entry = entryById.get(receipt.id);
    if (entry === undefined) {
      problems.push(`receipt ${String(receipt.id)} has no manifest entry`);
      continue;
    }
    const expected = evidenceDigestForEntry(entry as unknown as EvidenceEntry, artifactDigests);
    if (receipt.evidenceDigest !== expected) problems.push(`receipt ${String(receipt.id)} digest mismatch`);
  }
  return problems;
}

function candidateRunProblems(runsDocument: JsonRecord, targetRevision: string): string[] {
  const problems: string[] = [];
  for (const [index, value] of array(runsDocument.runs, "adoption-runs.runs").entries()) {
    const run = record(value, `adoption-runs.runs[${index}]`);
    if (run.testedRevision !== targetRevision) problems.push(`adoption run ${index} revision mismatch`);
  }
  return problems;
}

function retargetRuns(runsDocument: JsonRecord, targetRevision: string): { records: JsonRecord[]; bytes: Buffer } {
  const records = array(runsDocument.runs, "adoption-runs.runs").map((value, index) =>
    record(value, `adoption-runs.runs[${index}]`));
  for (const run of records) run.testedRevision = targetRevision;
  return { records, bytes: jsonBytes(runsDocument) };
}

function retargetManifest(
  repositoryRoot: string,
  manifest: JsonRecord,
  targetRevision: string,
  runsBytes: Buffer,
): { entries: JsonRecord[]; artifactDigests: Map<string, string>; artifactCount: number } {
  manifest.testedRevision = targetRevision;
  const entries = evidenceEntries(manifest);
  for (const entry of entries) entry.testedRevision = targetRevision;
  const artifactDigests = artifactDigestMap(repositoryRoot, entries, runsBytes);
  let artifactCount = 0;
  for (const [entryIndex, entry] of entries.entries()) {
    for (const [runIndex, run] of evidenceRuns(entry, `manifest.evidence[${entryIndex}]`).entries()) {
      const ref = artifact(run, `manifest.evidence[${entryIndex}].runs[${runIndex}]`);
      if (typeof ref.path !== "string") {
        throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", "manifest artifact path must be a string");
      }
      const digest = artifactDigests.get(ref.path);
      if (digest === undefined) throw new EvidenceRebindError("REBIND_VALIDATION_FAILED", `missing artifact digest: ${ref.path}`);
      ref.sha256 = digest;
      artifactCount += 1;
    }
  }
  return { entries, artifactDigests, artifactCount };
}

function retargetRegistry(
  registry: JsonRecord,
  targetRevision: string,
  entries: readonly JsonRecord[],
  artifactDigests: ReadonlyMap<string, string>,
): JsonRecord[] {
  registry.currentRevision = targetRevision;
  const receipts = array(registry.receipts, "registry.receipts").map((value, index) =>
    record(value, `registry.receipts[${index}]`));
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const receipt of receipts) {
    receipt.currentRevision = targetRevision;
    const entry = entryById.get(receipt.id);
    if (entry === undefined) {
      throw new EvidenceRebindError("REBIND_VALIDATION_FAILED", `missing manifest entry: ${String(receipt.id)}`);
    }
    receipt.evidenceDigest = evidenceDigestForEntry(entry as unknown as EvidenceEntry, artifactDigests);
  }
  return receipts;
}

export function buildReboundBundle(repositoryRoot: string, requestedTarget: string): ReboundBundle {
  const targetRevision = fullSha(requestedTarget, "target revision");
  const originalBytes = readBundleBytes(repositoryRoot);
  const registry = parseJson(originalBytes.get(EVIDENCE_REGISTRY_PATH) as Buffer, EVIDENCE_REGISTRY_PATH);
  const manifest = parseJson(originalBytes.get(EVIDENCE_MANIFEST_PATH) as Buffer, EVIDENCE_MANIFEST_PATH);
  const runsDocument = parseJson(originalBytes.get(EVIDENCE_RUNS_PATH) as Buffer, EVIDENCE_RUNS_PATH);
  const bindingRevision = fullSha(registry.currentRevision, "binding revision");
  const currentValidation = validateEvidenceRegistry(registry as unknown as EvidenceRegistry, bindingRevision, repositoryRoot);
  if (!currentValidation.ok) {
    throw new EvidenceRebindError("REBIND_SOURCE_INVALID", "source evidence bundle is invalid", currentValidation.problems);
  }

  const reboundRegistry = clone(registry);
  const reboundManifest = clone(manifest);
  const reboundRuns = clone(runsDocument);
  const reboundRunState = retargetRuns(reboundRuns, targetRevision);
  const reboundManifestState = retargetManifest(
    repositoryRoot,
    reboundManifest,
    targetRevision,
    reboundRunState.bytes,
  );
  const receipts = retargetRegistry(
    reboundRegistry,
    targetRevision,
    reboundManifestState.entries,
    reboundManifestState.artifactDigests,
  );

  assertCandidateShape(
    reboundRegistry,
    reboundManifest,
    reboundRuns,
    targetRevision,
    reboundManifestState.artifactDigests,
  );
  const candidateBytes = new Map<string, Buffer>([
    [EVIDENCE_REGISTRY_PATH, jsonBytes(reboundRegistry)],
    [EVIDENCE_MANIFEST_PATH, jsonBytes(reboundManifest)],
    [EVIDENCE_RUNS_PATH, reboundRunState.bytes],
  ]);
  validateCandidateBundle(repositoryRoot, candidateBytes, targetRevision);
  const paths = EVIDENCE_BUNDLE_PATHS.filter((path) =>
    !originalBytes.get(path)?.equals(candidateBytes.get(path) as Buffer));
  const changed = paths.length > 0;
  return {
    bindingRevision,
    targetRevision,
    changed,
    counts: changed
      ? {
          registryRevisions: 1 + receipts.length,
          manifestRevisions: 1 + reboundManifestState.entries.length,
          runRevisions: reboundRunState.records.length,
          artifactDigests: reboundManifestState.artifactCount,
          receiptDigests: receipts.length,
        }
      : zeroCounts(),
    paths: [...paths].sort(),
    originalBytes,
    candidateBytes,
  };
}

function validateCandidateBundle(
  repositoryRoot: string,
  candidateBytes: ReadonlyMap<string, Buffer>,
  targetRevision: string,
): void {
  let candidateRoot: string | null = null;
  try {
    candidateRoot = mkdtempSync(join(tmpdir(), "amadeus-evidence-rebind-candidate-"));
    const candidateManifest = parseJson(
      candidateBytes.get(EVIDENCE_MANIFEST_PATH) as Buffer,
      EVIDENCE_MANIFEST_PATH,
    );
    const candidatePaths = new Set<string>(EVIDENCE_BUNDLE_PATHS);
    for (const [entryIndex, entry] of evidenceEntries(candidateManifest).entries()) {
      for (const [runIndex, run] of evidenceRuns(entry, `manifest.evidence[${entryIndex}]`).entries()) {
        const ref = artifact(run, `manifest.evidence[${entryIndex}].runs[${runIndex}]`);
        if (typeof ref.path !== "string") {
          throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", "manifest artifact path must be a string");
        }
        candidatePaths.add(ref.path);
      }
    }
    for (const path of candidatePaths) {
      mkdirSync(dirname(join(candidateRoot, path)), { recursive: true });
      writeFileSync(
        join(candidateRoot, path),
        candidateBytes.get(path) ?? readFileSync(join(repositoryRoot, path)),
        { flag: "wx" },
      );
    }
    const registry = parseJson(candidateBytes.get(EVIDENCE_REGISTRY_PATH) as Buffer, EVIDENCE_REGISTRY_PATH);
    const validation = validateEvidenceRegistry(registry as unknown as EvidenceRegistry, targetRevision, candidateRoot);
    if (!validation.ok) {
      throw new EvidenceRebindError(
        "REBIND_VALIDATION_FAILED",
        "candidate evidence bundle is invalid",
        validation.problems,
      );
    }
  } catch (error) {
    if (error instanceof EvidenceRebindError) throw error;
    throw new EvidenceRebindError("REBIND_IO_WRITE_FAILED", `cannot validate candidate bundle: ${String(error)}`);
  } finally {
    if (candidateRoot !== null) rmSync(candidateRoot, { recursive: true, force: true });
  }
}

function temporaryPath(path: string, suffix: string): string {
  return join(dirname(path), `.${path.split("/").at(-1)}.amadeus-rebind-${suffix}`);
}

export function applyReboundBundle(repositoryRoot: string, bundle: ReboundBundle): AppliedBundle {
  if (!bundle.changed) return { paths: [], originalBytes: bundle.originalBytes };
  replaceBundleAtomically(repositoryRoot, bundle.paths, bundle.candidateBytes);
  return { paths: bundle.paths, originalBytes: bundle.originalBytes };
}

function replaceBundleAtomically(
  repositoryRoot: string,
  paths: readonly string[],
  replacementBytes: ReadonlyMap<string, Buffer>,
): void {
  const suffix = `${process.pid}-${randomUUID()}`;
  const prepared = new Map<string, string>();
  const backups = new Map<string, string>();
  const committed: string[] = [];
  try {
    prepareBundleFiles(repositoryRoot, paths, replacementBytes, suffix, prepared);
    commitPreparedFiles(repositoryRoot, paths, suffix, prepared, backups, committed);
    for (const backup of backups.values()) rmSync(backup, { force: true });
  } catch (error) {
    const rollbackProblems = rollbackPreparedCommit(repositoryRoot, paths, backups, committed);
    for (const temp of prepared.values()) rmSync(temp, { force: true });
    for (const backup of backups.values()) rmSync(backup, { force: true });
    if (rollbackProblems.length > 0) {
      throw new EvidenceRebindError(
        "REBIND_ROLLBACK_FAILED",
        `bundle write failed and rollback was incomplete: ${String(error)}`,
        rollbackProblems,
      );
    }
    throw new EvidenceRebindError("REBIND_IO_WRITE_FAILED", `bundle write failed: ${String(error)}`);
  }
}

function prepareBundleFiles(
  repositoryRoot: string,
  paths: readonly string[],
  replacementBytes: ReadonlyMap<string, Buffer>,
  suffix: string,
  prepared: Map<string, string>,
): void {
  for (const path of paths) {
    const absolute = join(repositoryRoot, path);
    const temp = temporaryPath(absolute, `${suffix}.new`);
    writeFileSync(temp, replacementBytes.get(path) as Buffer, { flag: "wx" });
    prepared.set(path, temp);
  }
}

function commitPreparedFiles(
  repositoryRoot: string,
  paths: readonly string[],
  suffix: string,
  prepared: ReadonlyMap<string, string>,
  backups: Map<string, string>,
  committed: string[],
): void {
  for (const path of paths) {
    const absolute = join(repositoryRoot, path);
    const backup = temporaryPath(absolute, `${suffix}.old`);
    renameSync(absolute, backup);
    backups.set(path, backup);
    renameSync(prepared.get(path) as string, absolute);
    committed.push(path);
  }
}

function rollbackPreparedCommit(
  repositoryRoot: string,
  paths: readonly string[],
  backups: ReadonlyMap<string, string>,
  committed: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const path of [...paths].reverse()) {
    const absolute = join(repositoryRoot, path);
    const backup = backups.get(path);
    if (backup === undefined || !existsSync(backup)) continue;
    try {
      if (committed.includes(path)) rmSync(absolute, { force: true });
      renameSync(backup, absolute);
    } catch (error) {
      problems.push(`${path}: ${String(error)}`);
    }
  }
  return problems;
}

export function rollbackAppliedBundle(repositoryRoot: string, applied: AppliedBundle): void {
  replaceBundleAtomically(repositoryRoot, applied.paths, applied.originalBytes);
}

export function zeroCounts(): RebindCounts {
  return {
    registryRevisions: 0,
    manifestRevisions: 0,
    runRevisions: 0,
    artifactDigests: 0,
    receiptDigests: 0,
  };
}

export function successEnvelope(input: {
  status: Exclude<RebindStatus, "error">;
  code: string;
  eventRevision?: string | null;
  bindingRevision?: string | null;
  targetRevision?: string | null;
  counts?: RebindCounts;
  paths?: readonly string[];
  problems?: readonly string[];
}): RebindEnvelope {
  return {
    schemaVersion: 1,
    operation: "no-silent-drop-evidence-rebind",
    status: input.status,
    code: input.code,
    eventRevision: input.eventRevision ?? null,
    bindingRevision: input.bindingRevision ?? null,
    targetRevision: input.targetRevision ?? null,
    changed: input.status === "changed",
    counts: input.counts ?? zeroCounts(),
    paths: [...(input.paths ?? [])].sort(),
    validation: { ok: true, problems: [...(input.problems ?? [])] },
    error: null,
  };
}

export function errorEnvelope(
  error: unknown,
  context: { eventRevision?: string | null; bindingRevision?: string | null; targetRevision?: string | null } = {},
): RebindEnvelope {
  const typed = error instanceof EvidenceRebindError
    ? error
    : new EvidenceRebindError("REBIND_INTERNAL_ERROR", error instanceof Error ? error.message : String(error));
  return {
    schemaVersion: 1,
    operation: "no-silent-drop-evidence-rebind",
    status: "error",
    code: typed.code,
    eventRevision: context.eventRevision ?? null,
    bindingRevision: context.bindingRevision ?? null,
    targetRevision: context.targetRevision ?? null,
    changed: false,
    counts: zeroCounts(),
    paths: [],
    validation: { ok: false, problems: typed.problems.map(redactSecrets) },
    error: { code: typed.code, message: redactSecrets(typed.message) },
  };
}

function redactSecrets(value: string): string {
  let redacted = value
    .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, "[REDACTED]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[REDACTED]")
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, "[REDACTED]");
  for (const [name, secret] of Object.entries(process.env)) {
    if (!/(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY)$/i.test(name) || secret === undefined || secret.length < 4) continue;
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted;
}

export function receiptIdsFromRegistry(repositoryRoot: string): AdoptionReceiptId[] {
  const registry = parseJson(readFileSync(join(repositoryRoot, EVIDENCE_REGISTRY_PATH)), EVIDENCE_REGISTRY_PATH);
  return array(registry.receipts, "registry.receipts").map((value, index) => {
    const id = record(value, `registry.receipts[${index}]`).id;
    if (typeof id !== "string") throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", `receipt ${index} id is invalid`);
    return id as AdoptionReceiptId;
  });
}
