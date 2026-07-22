import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, openSync, readSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type Result } from "./contract.ts";
import type { RegistryError } from "./fixture-registry-domain.ts";

export interface PayloadManifestEntry {
  logicalPath: string;
  contentHash: string;
  byteLength: number;
  entryIdentity: string;
}
export interface SealedPayloadManifest { entries: readonly PayloadManifestEntry[]; manifestIdentity: string }
export interface ScanRequest { entry: PayloadManifestEntry; chunks: AsyncIterable<Uint8Array>; signal: AbortSignal }
export interface EntryScanResult {
  scannerVersion: string;
  ruleSetIdentity: string;
  entryIdentity: string;
  secretCount: number;
  personalDataCount: number;
  externalStoreRefCount: number;
}
export interface FixtureScannerPort {
  readonly scannerVersion: string;
  readonly ruleSetIdentity: string;
  scan(request: ScanRequest): Promise<EntryScanResult>;
}
export interface DataSafetyReceipt {
  payloadManifestIdentity: string;
  scannerVersion: string;
  ruleSetIdentity: string;
  scannedEntryIdentities: readonly string[];
  readBytes: number;
  scannedBytes: number;
  scanDurationMs: number;
  scanDeadlineMs: 30_000;
  secretCount: 0;
  personalDataCount: 0;
  externalStoreRefCount: 0;
  completedAt: string;
  receiptIdentity: string;
}
const ISSUED_SCAN_RECEIPTS = new WeakSet<DataSafetyReceipt>();

const SHA = /^[0-9a-f]{64}$/;
const SCAN_CHUNK_BYTES = 64 * 1024;
const SCAN_DEADLINE_MS = 30_000;
const safePath = (value: unknown): value is string => typeof value === "string" && value.length > 0 && !value.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) && !value.split(/[\\/]/).includes("..");
const fail = (message: string, cause?: string): Result<never, RegistryError> => ({ ok: false, error: { kind: "ScanError", message, cause } });
const exact = (value: object, keys: readonly string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

export function createPayloadManifest(entries: readonly { logicalPath: string; contentHash: string; byteLength: number }[]): Result<SealedPayloadManifest, RegistryError> {
  if (entries.length === 0 || entries.length > 64) return fail("payload manifest must contain 1 to 64 entries");
  if (entries.some((entry) => !exact(entry, ["logicalPath", "contentHash", "byteLength"]) || !safePath(entry.logicalPath) || !SHA.test(entry.contentHash) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || entry.byteLength > 16 * 1024 * 1024)) return fail("payload manifest entry is invalid");
  if (new Set(entries.map((entry) => entry.logicalPath)).size !== entries.length || entries.reduce((sum, entry) => sum + entry.byteLength, 0) > 16 * 1024 * 1024) return fail("payload manifest is duplicate or exceeds the fixture budget");
  const normalized = [...entries].sort((left, right) => left.logicalPath < right.logicalPath ? -1 : left.logicalPath > right.logicalPath ? 1 : 0).map((entry) => ({ ...entry, entryIdentity: canonicalIdentity(entry, "amadeus.formal-verif.payload-entry.v1").sha256 }));
  const draft = { entries: normalized };
  return { ok: true, value: { ...draft, manifestIdentity: canonicalIdentity(draft, "amadeus.formal-verif.payload-manifest.v1").sha256 } };
}

export function verifyPayloadManifest(manifest: SealedPayloadManifest): Result<void, RegistryError> {
  if (manifest.entries.length === 0 || manifest.entries.length > 64 || !exact(manifest, ["entries", "manifestIdentity"])) return fail("payload manifest schema is invalid");
  for (let index = 0; index < manifest.entries.length; index++) { const entry = manifest.entries[index]!; const { entryIdentity, ...body } = entry; if (!exact(entry, ["logicalPath", "contentHash", "byteLength", "entryIdentity"]) || !safePath(entry.logicalPath) || !SHA.test(entry.contentHash) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || entry.byteLength > 16 * 1024 * 1024 || canonicalIdentity(body, "amadeus.formal-verif.payload-entry.v1").sha256 !== entryIdentity || (index > 0 && manifest.entries[index - 1]!.logicalPath >= entry.logicalPath)) return fail("payload manifest entry binding is invalid"); }
  if (manifest.entries.reduce((sum, entry) => sum + entry.byteLength, 0) > 16 * 1024 * 1024) return fail("payload manifest exceeds the fixture budget");
  if (canonicalIdentity({ entries: manifest.entries }, "amadeus.formal-verif.payload-manifest.v1").sha256 !== manifest.manifestIdentity) return fail("payload manifest identity is invalid");
  return { ok: true, value: undefined };
}

function listPayloads(root: string, directory = root, prefix = ""): Result<string[], RegistryError> {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!safePath(logicalPath)) return fail("payload filesystem contains an unsafe path");
    if (entry.isSymbolicLink()) return fail("payload manifest cannot include symlinks");
    if (entry.isDirectory()) {
      const nested = listPayloads(root, join(directory, entry.name), logicalPath);
      if (!nested.ok) return nested;
      files.push(...nested.value);
    } else if (entry.isFile()) files.push(logicalPath);
    else return fail("payload manifest accepts regular files only");
  }
  return { ok: true, value: files.sort() };
}

interface BoundEntryStream {
  chunks: AsyncIterable<Uint8Array>;
  verify(): Result<{ readBytes: number; scannedBytes: number }, RegistryError>;
  close(): void;
}

function openBoundEntry(root: string, entry: PayloadManifestEntry, ensureBeforeDeadline: () => void): Result<BoundEntryStream, RegistryError> {
  const path = resolve(root, entry.logicalPath);
  let fd: number | undefined;
  try {
    ensureBeforeDeadline();
    const rootReal = realpathSync(root);
    const actual = realpathSync(path);
    const rel = relative(rootReal, actual);
    const before = lstatSync(path);
    if (rel.startsWith("..") || /^[\\/]/.test(rel) || before.isSymbolicLink() || !before.isFile()) return fail("payload path escapes its manifest root");
    fd = openSync(actual, "r");
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== entry.byteLength) { closeSync(fd); fd = undefined; return fail("payload file does not match the manifest length or identity"); }
    const handle = fd;
    const hash = createHash("sha256");
    let readBytes = 0;
    let scannedBytes = 0;
    let drained = false;
    let streamFailure: string | undefined;
    let closed = false;
    const chunks = (async function* (): AsyncGenerator<Uint8Array> {
      const block = new Uint8Array(SCAN_CHUNK_BYTES);
      try {
        while (readBytes < entry.byteLength) {
          ensureBeforeDeadline();
          const count = readSync(handle, block, 0, Math.min(block.byteLength, entry.byteLength - readBytes), null);
          if (count <= 0) throw new Error("payload stream ended before the manifest length");
          readBytes += count;
          hash.update(block.subarray(0, count));
          scannedBytes += count;
          yield block.subarray(0, count);
          ensureBeforeDeadline();
        }
        drained = true;
      } catch (cause) {
        streamFailure = cause instanceof Error ? cause.message : String(cause);
        throw cause;
      }
    })();
    return { ok: true, value: {
      chunks,
      verify: () => {
        try {
          ensureBeforeDeadline();
          if (streamFailure !== undefined) return fail("payload stream failed", streamFailure);
          if (!drained || readBytes !== entry.byteLength || scannedBytes !== entry.byteLength) return fail("scanner did not drain the complete payload stream");
          const after = fstatSync(handle);
          const linked = lstatSync(path);
          if (!after.isFile() || !linked.isFile() || linked.isSymbolicLink() || after.dev !== opened.dev || after.ino !== opened.ino || linked.dev !== opened.dev || linked.ino !== opened.ino || after.size !== opened.size || linked.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) return fail("payload file changed during streaming scan");
          if (hash.digest("hex") !== entry.contentHash) return fail("payload bytes do not match the manifest hash");
          return { ok: true, value: { readBytes, scannedBytes } };
        } catch (cause) { return fail("payload verification failed", cause instanceof Error ? cause.message : String(cause)); }
      },
      close: () => { if (!closed) { closeSync(handle); closed = true; } },
    } };
  } catch (cause) {
    if (fd !== undefined) closeSync(fd);
    return fail("payload read failed", cause instanceof Error ? cause.message : String(cause));
  }
}

export function verifyDataSafetyReceipt(manifest: SealedPayloadManifest, receipt: DataSafetyReceipt): Result<void, RegistryError> {
  const manifestVerified = verifyPayloadManifest(manifest); if (!manifestVerified.ok) return manifestVerified;
  if (!ISSUED_SCAN_RECEIPTS.has(receipt) || !exact(receipt, ["payloadManifestIdentity", "scannerVersion", "ruleSetIdentity", "scannedEntryIdentities", "readBytes", "scannedBytes", "scanDurationMs", "scanDeadlineMs", "secretCount", "personalDataCount", "externalStoreRefCount", "completedAt", "receiptIdentity"])) return fail("data safety receipt was not issued by the fixed scanner");
  const { receiptIdentity, ...body } = receipt;
  const payloadBytes = manifest.entries.reduce((sum, entry) => sum + entry.byteLength, 0);
  if (receipt.payloadManifestIdentity !== manifest.manifestIdentity || receipt.scannedEntryIdentities.length !== manifest.entries.length || receipt.scannedEntryIdentities.some((identity, index) => identity !== manifest.entries[index]!.entryIdentity) || receipt.readBytes !== payloadBytes || receipt.scannedBytes !== payloadBytes || !Number.isFinite(receipt.scanDurationMs) || receipt.scanDurationMs < 0 || receipt.scanDurationMs >= SCAN_DEADLINE_MS || receipt.scanDeadlineMs !== SCAN_DEADLINE_MS || receipt.secretCount !== 0 || receipt.personalDataCount !== 0 || receipt.externalStoreRefCount !== 0 || !isUtcInstant(receipt.completedAt) || canonicalIdentity(body, "amadeus.formal-verif.data-safety-receipt.v1").sha256 !== receiptIdentity) return fail("data safety receipt does not bind a complete zero-finding scan");
  return { ok: true, value: undefined };
}

async function scanFixturePayloadWithClock(root: string, manifest: SealedPayloadManifest, scanner: FixtureScannerPort, completedAt: string, nowMs: () => number): Promise<Result<DataSafetyReceipt, RegistryError>> {
  if (!scanner.scannerVersion || !SHA.test(scanner.ruleSetIdentity) || !isUtcInstant(completedAt)) return fail("scanner or completion identity is invalid");
  const startedAt = nowMs();
  if (!Number.isFinite(startedAt)) return fail("scanner monotonic clock is invalid");
  const deadlineAt = startedAt + SCAN_DEADLINE_MS;
  const controller = new AbortController();
  const ensureBeforeDeadline = (): void => {
    const now = nowMs();
    if (!Number.isFinite(now) || now < startedAt || now >= deadlineAt) { controller.abort(); throw new Error("scanner absolute deadline exceeded"); }
  };
  const manifestVerified = verifyPayloadManifest(manifest); if (!manifestVerified.ok) return manifestVerified;
  let actualFiles: Result<string[], RegistryError>;
  try { ensureBeforeDeadline(); actualFiles = listPayloads(root); ensureBeforeDeadline(); } catch (cause) { return fail("payload enumeration failed", cause instanceof Error ? cause.message : String(cause)); }
  if (!actualFiles.ok) return actualFiles;
  if (actualFiles.value.length !== manifest.entries.length || actualFiles.value.some((path, index) => path !== manifest.entries[index]!.logicalPath)) return fail("payload files and manifest entries are not a bijection");
  const scannedEntryIdentities: string[] = [];
  let readBytes = 0;
  let scannedBytes = 0;
  for (const entry of manifest.entries) {
    const stream = openBoundEntry(root, entry, ensureBeforeDeadline);
    if (!stream.ok) return stream;
    let result: EntryScanResult;
    try {
      ensureBeforeDeadline();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("scanner absolute deadline exceeded")); }, Math.max(1, Math.ceil(deadlineAt - nowMs()))); });
        result = await Promise.race([scanner.scan({ entry, chunks: stream.value.chunks, signal: controller.signal }), timeout]);
      } finally { if (timer !== undefined) clearTimeout(timer); }
      ensureBeforeDeadline();
      const verified = stream.value.verify();
      if (!verified.ok) return verified;
      readBytes += verified.value.readBytes;
      scannedBytes += verified.value.scannedBytes;
    } catch (cause) {
      let expired = controller.signal.aborted;
      try { const now = nowMs(); expired ||= !Number.isFinite(now) || now < startedAt || now >= deadlineAt; } catch { expired = true; }
      return fail(expired ? "scanner absolute deadline exceeded" : "scanner execution failed", cause instanceof Error ? cause.message : String(cause));
    } finally { stream.value.close(); }
    const keys = ["scannerVersion", "ruleSetIdentity", "entryIdentity", "secretCount", "personalDataCount", "externalStoreRefCount"];
    if (result === null || typeof result !== "object" || !exact(result, keys) || result.scannerVersion !== scanner.scannerVersion || result.ruleSetIdentity !== scanner.ruleSetIdentity || result.entryIdentity !== entry.entryIdentity) return fail("scanner identity or entry binding drifted");
    const counts = [result.secretCount, result.personalDataCount, result.externalStoreRefCount];
    if (counts.some((count) => !Number.isSafeInteger(count) || count < 0) || counts.some((count) => count !== 0)) return fail("payload contains a prohibited data category");
    scannedEntryIdentities.push(entry.entryIdentity);
  }
  let finishedAt: number;
  try { ensureBeforeDeadline(); finishedAt = nowMs(); ensureBeforeDeadline(); } catch (cause) { return fail("scanner absolute deadline exceeded", cause instanceof Error ? cause.message : String(cause)); }
  const body = { payloadManifestIdentity: manifest.manifestIdentity, scannerVersion: scanner.scannerVersion, ruleSetIdentity: scanner.ruleSetIdentity, scannedEntryIdentities, readBytes, scannedBytes, scanDurationMs: finishedAt - startedAt, scanDeadlineMs: 30_000 as const, secretCount: 0 as const, personalDataCount: 0 as const, externalStoreRefCount: 0 as const, completedAt };
  const receipt: DataSafetyReceipt = { ...body, receiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.data-safety-receipt.v1").sha256 };
  ISSUED_SCAN_RECEIPTS.add(receipt);
  const verified = verifyDataSafetyReceipt(manifest, receipt);
  return verified.ok ? { ok: true, value: receipt } : verified;
}

export function scanFixturePayload(root: string, manifest: SealedPayloadManifest, scanner: FixtureScannerPort, completedAt: string): Promise<Result<DataSafetyReceipt, RegistryError>> {
  return scanFixturePayloadWithClock(root, manifest, scanner, completedAt, () => performance.now());
}

export function scanFixturePayloadForTesting(root: string, manifest: SealedPayloadManifest, scanner: FixtureScannerPort, completedAt: string, nowMs: () => number): Promise<Result<DataSafetyReceipt, RegistryError>> {
  return scanFixturePayloadWithClock(root, manifest, scanner, completedAt, nowMs);
}
