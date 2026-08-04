import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const ADOPTION_RECEIPT_IDS = [
  "shape-fixtures",
  "census-pre",
  "census-post",
  "classification-precision",
  "baseline-proof",
  "failure-matrix",
  "u2-u3-regressions",
  "full-test",
  "lint",
  "typecheck",
  "coverage",
  "cold-warm-5x2",
  "capacity-r0-r2-r4",
  "u1-complexity",
  "package-apply",
  "promotion-apply",
  "package-check",
  "promotion-check",
  "event-pr-base",
  "event-fork-base",
  "event-push-before",
  "hang-deadline",
  "workflow-structure",
] as const;

export type AdoptionReceiptId = (typeof ADOPTION_RECEIPT_IDS)[number];

type EvidenceVerdict = "pass";

export type ArtifactReference = {
  readonly path: string;
  readonly sha256: string;
  readonly recordId: string;
};

export type EvidenceRun = {
  readonly name: string;
  readonly command: readonly string[];
  readonly artifact: ArtifactReference;
  readonly exitCode: number;
  readonly verdict: EvidenceVerdict;
};

export type EvidenceEntry = {
  readonly schemaVersion: 1;
  readonly id: AdoptionReceiptId;
  readonly testedRevision: string;
  readonly runs: readonly EvidenceRun[];
  readonly verdict: "pass";
};

export type EvidenceBundle = {
  readonly entries: ReadonlyMap<AdoptionReceiptId, EvidenceEntry>;
  readonly digests: ReadonlyMap<AdoptionReceiptId, string>;
  readonly problems: readonly string[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_MANIFEST_PATH = "tests/no-silent-drop/adoption-evidence-manifest.json";
const EVIDENCE_REGISTRY_PATH = "tests/no-silent-drop/adoption-evidence.json";
const MANIFEST_KEYS = ["evidence", "schemaVersion", "testedRevision"];
const ENTRY_KEYS = ["id", "runs", "schemaVersion", "testedRevision", "verdict"];
const RUN_KEYS = ["artifact", "command", "exitCode", "name", "verdict"];
const ARTIFACT_KEYS = ["path", "recordId", "sha256"];
const COLLECTION_KEYS = ["runs", "schemaVersion"];
const SUMMARY_KEYS = [
  "command",
  "exitCode",
  "receiptId",
  "recordId",
  "runName",
  "schemaVersion",
  "testedRevision",
  "tests",
  "verdict",
];
const TEST_RESULT_KEYS = ["name", "status"];
const RECEIPT_ID_SET = new Set<string>(ADOPTION_RECEIPT_IDS);

export const DEFAULT_EVIDENCE_REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson(path: string, problems: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`cannot read JSON evidence ${path}: ${String(error)}`);
    return undefined;
  }
}

function secureRepositoryFile(repositoryRoot: string, path: unknown, problems: string[]): string | undefined {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path)) {
    problems.push("evidence path must be a non-empty repository-relative path");
    return undefined;
  }
  const absolutePath = resolve(repositoryRoot, path);
  const relativePath = relative(repositoryRoot, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    problems.push(`evidence path escapes repository root: ${path}`);
    return undefined;
  }
  let stats: ReturnType<typeof lstatSync>;
  try {
    stats = lstatSync(absolutePath);
  } catch (error) {
    problems.push(`cannot stat evidence file ${path}: ${String(error)}`);
    return undefined;
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    problems.push(`evidence file must be a regular non-symlink: ${path}`);
    return undefined;
  }
  return absolutePath;
}

function safeArtifactPath(repositoryRoot: string, artifactPath: unknown, problems: string[]): string | undefined {
  if (artifactPath === EVIDENCE_MANIFEST_PATH || artifactPath === EVIDENCE_REGISTRY_PATH) {
    problems.push(`artifact path is self-referential: ${artifactPath}`);
    return undefined;
  }
  return secureRepositoryFile(repositoryRoot, artifactPath, problems);
}

function parseArtifactReference(value: unknown, label: string, problems: string[]): ArtifactReference | undefined {
  if (!isRecord(value)) {
    problems.push(`${label} artifact must be an object`);
    return undefined;
  }
  if (!hasExactKeys(value, ARTIFACT_KEYS)) problems.push(`${label} artifact fields do not match schema version 1`);
  if (typeof value.path !== "string") problems.push(`${label} artifact path must be a string`);
  if (typeof value.recordId !== "string" || value.recordId.length === 0) {
    problems.push(`${label} artifact recordId must be non-empty`);
  }
  if (typeof value.sha256 !== "string" || !SHA256.test(value.sha256)) {
    problems.push(`${label} artifact sha256 is invalid`);
  }
  if (typeof value.path !== "string" || typeof value.recordId !== "string" || typeof value.sha256 !== "string") {
    return undefined;
  }
  return { path: value.path, recordId: value.recordId, sha256: value.sha256 };
}

function parseEvidenceRun(value: unknown, label: string, problems: string[]): EvidenceRun | undefined {
  if (!isRecord(value)) {
    problems.push(`${label} must be an object`);
    return undefined;
  }
  if (!hasExactKeys(value, RUN_KEYS)) problems.push(`${label} fields do not match schema version 1`);
  const command = Array.isArray(value.command) && value.command.length > 0 && value.command.every(
    (argument) => typeof argument === "string" && argument.length > 0,
  ) ? value.command as string[] : undefined;
  if (command === undefined) problems.push(`${label} command must be a non-empty argv array`);
  if (typeof value.name !== "string" || value.name.length === 0) problems.push(`${label} name must be non-empty`);
  if (!Number.isInteger(value.exitCode) || (value.exitCode as number) < 0) {
    problems.push(`${label} exitCode must be a non-negative integer`);
  }
  if (value.verdict !== "pass") problems.push(`${label} verdict is invalid`);
  const artifact = parseArtifactReference(value.artifact, label, problems);
  if (command === undefined || typeof value.name !== "string" || !Number.isInteger(value.exitCode) ||
    value.verdict !== "pass" || artifact === undefined) return undefined;
  return { name: value.name, command, artifact, exitCode: value.exitCode as number, verdict: value.verdict };
}

function parseEvidenceEntry(
  value: unknown,
  index: number,
  expectedRevision: string,
  problems: string[],
): EvidenceEntry | undefined {
  if (!isRecord(value)) {
    problems.push(`evidence ${index} must be an object`);
    return undefined;
  }
  if (!hasExactKeys(value, ENTRY_KEYS)) problems.push(`evidence ${index} fields do not match schema version 1`);
  if (value.schemaVersion !== 1) problems.push(`evidence ${index} schemaVersion must be 1`);
  if (typeof value.id !== "string" || !RECEIPT_ID_SET.has(value.id)) {
    problems.push(`evidence ${index} has an unknown id`);
    return undefined;
  }
  if (value.testedRevision !== expectedRevision) problems.push(`evidence ${value.id} revision mismatch`);
  if (value.verdict !== "pass") problems.push(`evidence ${value.id} is not passing`);
  if (!Array.isArray(value.runs)) {
    problems.push(`evidence ${value.id} runs must be an array`);
    return undefined;
  }
  const runs = value.runs.flatMap((run, runIndex) => {
    const parsed = parseEvidenceRun(run, `evidence ${value.id} run ${runIndex}`, problems);
    return parsed === undefined ? [] : [parsed];
  });
  if (runs.length !== value.runs.length) return undefined;
  return { schemaVersion: 1, id: value.id as AdoptionReceiptId, testedRevision: expectedRevision, runs, verdict: "pass" };
}

function validateEntryRunShape(entry: EvidenceEntry): string[] {
  const isComposite = entry.id === "full-test" || entry.id === "coverage";
  if (!isComposite && entry.runs.length !== 1) return [`evidence ${entry.id} must have one primary run`];
  if (!isComposite) {
    const run = entry.runs[0];
    return run?.name === "primary" && run.exitCode === 0 && run.verdict === "pass"
      ? []
      : [`evidence ${entry.id} primary run must exit 0 with pass verdict`];
  }
  const [normal, isolated] = entry.runs;
  const problems: string[] = [];
  if (entry.runs.length !== 2 || normal?.name !== "normal") {
    problems.push(`evidence ${entry.id} must include its normal run`);
  }
  if (isolated?.name !== "isolated-known-timeouts" || isolated.exitCode !== 0 || isolated.verdict !== "pass") {
    problems.push(`evidence ${entry.id} must include a passing named isolated timeout run`);
  }
  if (normal !== undefined && (normal.verdict !== "pass" || normal.exitCode !== 0)) {
    problems.push(`evidence ${entry.id} normal run must exit 0 with pass verdict`);
  }
  return problems;
}

function validateTestResult(value: unknown, label: string): { problems: string[]; status?: string } {
  if (!isRecord(value) || !hasExactKeys(value, TEST_RESULT_KEYS)) {
    return { problems: [`${label} fields do not match schema version 1`] };
  }
  const problems: string[] = [];
  if (typeof value.name !== "string" || value.name.length === 0) problems.push(`${label} name is invalid`);
  if (value.status !== "pass") problems.push(`${label} status is invalid`);
  return { problems, status: typeof value.status === "string" ? value.status : undefined };
}

function validateSummaryTests(summary: Record<string, unknown>, label: string): string[] {
  if (!Array.isArray(summary.tests) || summary.tests.length === 0) return [`${label} tests must be non-empty`];
  const problems: string[] = [];
  const statuses: string[] = [];
  for (const [index, value] of summary.tests.entries()) {
    const result = validateTestResult(value, `${label} test ${index}`);
    problems.push(...result.problems);
    if (result.status !== undefined) statuses.push(result.status);
  }
  if (summary.verdict === "pass" && statuses.some((status) => status !== "pass")) {
    problems.push(`${label} pass verdict contains a non-passing test`);
  }
  return problems;
}

function summaryMatchesRun(summary: unknown, entry: EvidenceEntry, run: EvidenceRun): string[] {
  const label = `artifact record ${run.artifact.recordId}`;
  if (!isRecord(summary)) return [`${label} must be an object`];
  const problems: string[] = [];
  if (!hasExactKeys(summary, SUMMARY_KEYS)) problems.push(`${label} fields do not match schema version 1`);
  if (summary.schemaVersion !== 1) problems.push(`${label} schemaVersion must be 1`);
  if (summary.recordId !== run.artifact.recordId) problems.push(`${label} recordId mismatch`);
  if (summary.receiptId !== entry.id) problems.push(`${label} receipt id mismatch`);
  if (summary.runName !== run.name) problems.push(`${label} run name mismatch`);
  if (summary.testedRevision !== entry.testedRevision) problems.push(`${label} revision mismatch`);
  if (JSON.stringify(summary.command) !== JSON.stringify(run.command)) problems.push(`${label} command mismatch`);
  if (summary.exitCode !== run.exitCode) problems.push(`${label} exit code mismatch`);
  if (summary.verdict !== run.verdict) problems.push(`${label} verdict mismatch`);
  return [...problems, ...validateSummaryTests(summary, label)];
}

type ArtifactCollection = {
  readonly digest: string;
  readonly records: ReadonlyMap<string, unknown>;
};

function indexArtifactRecords(path: string, runs: unknown[], problems: string[]): ReadonlyMap<string, unknown> {
  const records = new Map<string, unknown>();
  for (const [index, record] of runs.entries()) {
    if (!isRecord(record) || typeof record.recordId !== "string") {
      problems.push(`artifact ${path} record ${index} has no recordId`);
      continue;
    }
    if (records.has(record.recordId)) problems.push(`duplicate artifact record: ${record.recordId}`);
    records.set(record.recordId, record);
  }
  return records;
}

export function readEvidenceArtifact(
  absolutePath: string,
  artifactPath: string,
  problems: string[],
  reader: (path: string) => Buffer = readFileSync,
): Buffer | undefined {
  try {
    return reader(absolutePath);
  } catch (error) {
    problems.push(`cannot read evidence artifact ${artifactPath}: ${String(error)}`);
    return undefined;
  }
}

function readArtifactCollection(
  repositoryRoot: string,
  artifact: ArtifactReference,
  problems: string[],
): ArtifactCollection | undefined {
  const absolutePath = safeArtifactPath(repositoryRoot, artifact.path, problems);
  if (absolutePath === undefined) return undefined;
  const bytes = readEvidenceArtifact(absolutePath, artifact.path, problems);
  if (bytes === undefined) return undefined;
  const actualDigest = sha256(bytes);
  if (actualDigest !== artifact.sha256) problems.push(`artifact digest mismatch: ${artifact.path}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    problems.push(`cannot parse JSON evidence ${artifact.path}: ${String(error)}`);
    return { digest: actualDigest, records: new Map() };
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, COLLECTION_KEYS) || parsed.schemaVersion !== 1 ||
    !Array.isArray(parsed.runs)) {
    problems.push(`artifact collection schema is invalid: ${artifact.path}`);
    return { digest: actualDigest, records: new Map() };
  }
  return { digest: actualDigest, records: indexArtifactRecords(artifact.path, parsed.runs, problems) };
}

function canonicalBinding(entry: EvidenceEntry, artifactDigests: ReadonlyMap<string, string>): string {
  return JSON.stringify({
    schemaVersion: entry.schemaVersion,
    id: entry.id,
    testedRevision: entry.testedRevision,
    runs: entry.runs.map((run) => ({
      name: run.name,
      command: run.command,
      artifact: {
        path: run.artifact.path,
        sha256: artifactDigests.get(run.artifact.path) ?? run.artifact.sha256,
        recordId: run.artifact.recordId,
      },
      exitCode: run.exitCode,
      verdict: run.verdict,
    })),
    verdict: entry.verdict,
  });
}

export function evidenceDigestForEntry(
  entry: EvidenceEntry,
  artifactDigests: ReadonlyMap<string, string>,
): string {
  return sha256(canonicalBinding(entry, artifactDigests));
}

function parseManifestEntries(rawManifest: unknown, expectedRevision: string, problems: string[]): EvidenceEntry[] {
  if (!isRecord(rawManifest)) {
    problems.push("evidence manifest must be an object");
    return [];
  }
  if (!hasExactKeys(rawManifest, MANIFEST_KEYS)) problems.push("evidence manifest fields do not match schema version 1");
  if (rawManifest.schemaVersion !== 1) problems.push("evidence manifest schemaVersion must be 1");
  if (rawManifest.testedRevision !== expectedRevision) problems.push("evidence manifest revision mismatch");
  if (!Array.isArray(rawManifest.evidence)) {
    problems.push("evidence manifest entries must be an array");
    return [];
  }
  return rawManifest.evidence.flatMap((value, index) => {
    const entry = parseEvidenceEntry(value, index, expectedRevision, problems);
    return entry === undefined ? [] : [entry];
  });
}

function indexEvidenceEntries(entries: EvidenceEntry[], problems: string[]): Map<AdoptionReceiptId, EvidenceEntry> {
  const indexed = new Map<AdoptionReceiptId, EvidenceEntry>();
  for (const entry of entries) {
    if (indexed.has(entry.id)) problems.push(`duplicate evidence id: ${entry.id}`);
    indexed.set(entry.id, entry);
    problems.push(...validateEntryRunShape(entry));
  }
  for (const id of ADOPTION_RECEIPT_IDS) {
    if (!indexed.has(id)) problems.push(`missing evidence id: ${id}`);
  }
  return indexed;
}

function readCollections(
  repositoryRoot: string,
  entries: ReadonlyMap<AdoptionReceiptId, EvidenceEntry>,
  problems: string[],
): Map<string, ArtifactCollection> {
  const collections = new Map<string, ArtifactCollection>();
  for (const entry of entries.values()) {
    for (const run of entry.runs) {
      const existing = collections.get(run.artifact.path);
      if (existing !== undefined && existing.digest !== run.artifact.sha256) {
        problems.push(`artifact ${run.artifact.path} measured digest does not match the declared digest`);
      }
      if (existing === undefined) {
        const collection = readArtifactCollection(repositoryRoot, run.artifact, problems);
        if (collection !== undefined) collections.set(run.artifact.path, collection);
      }
    }
  }
  return collections;
}

function validateArtifactReferences(
  entries: ReadonlyMap<AdoptionReceiptId, EvidenceEntry>,
  collections: ReadonlyMap<string, ArtifactCollection>,
  problems: string[],
): Map<string, Set<string>> {
  const referencedRecords = new Map<string, Set<string>>();
  for (const entry of entries.values()) {
    for (const run of entry.runs) {
      const referenced = referencedRecords.get(run.artifact.path) ?? new Set<string>();
      if (referenced.has(run.artifact.recordId)) problems.push(`duplicate evidence reference: ${run.artifact.recordId}`);
      referenced.add(run.artifact.recordId);
      referencedRecords.set(run.artifact.path, referenced);
      const summary = collections.get(run.artifact.path)?.records.get(run.artifact.recordId);
      if (summary === undefined) problems.push(`missing artifact record: ${run.artifact.recordId}`);
      else problems.push(...summaryMatchesRun(summary, entry, run));
    }
  }
  return referencedRecords;
}

function validateNoExtraRecords(
  collections: ReadonlyMap<string, ArtifactCollection>,
  referencedRecords: ReadonlyMap<string, Set<string>>,
  problems: string[],
): void {
  for (const [path, collection] of collections) {
    const referenced = referencedRecords.get(path) ?? new Set<string>();
    for (const recordId of collection.records.keys()) {
      if (!referenced.has(recordId)) problems.push(`extra artifact record: ${recordId}`);
    }
  }
}

export function validateEvidenceBundle(repositoryRoot: string, expectedRevision: string): EvidenceBundle {
  const problems: string[] = [];
  const manifestPath = secureRepositoryFile(repositoryRoot, EVIDENCE_MANIFEST_PATH, problems);
  const rawManifest = manifestPath === undefined ? undefined : readJson(manifestPath, problems);
  const entries = indexEvidenceEntries(parseManifestEntries(rawManifest, expectedRevision, problems), problems);
  const collections = readCollections(repositoryRoot, entries, problems);
  const referencedRecords = validateArtifactReferences(entries, collections, problems);
  validateNoExtraRecords(collections, referencedRecords, problems);
  const artifactDigests = new Map([...collections].map(([path, collection]) => [path, collection.digest]));
  const digests = new Map<AdoptionReceiptId, string>();
  for (const entry of entries.values()) digests.set(entry.id, evidenceDigestForEntry(entry, artifactDigests));
  return { entries, digests, problems };
}

export function validateEvidenceRegistryFile(repositoryRoot: string, value: unknown): string[] {
  const problems: string[] = [];
  const registryPath = secureRepositoryFile(repositoryRoot, EVIDENCE_REGISTRY_PATH, problems);
  if (registryPath === undefined) return problems;
  const repositoryValue = readJson(registryPath, problems);
  if (JSON.stringify(repositoryValue) !== JSON.stringify(value)) {
    problems.push("registry value does not match canonical repository evidence bytes");
  }
  return problems;
}
