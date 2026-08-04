import { randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import type { CleanupReceipt } from "./adapter.ts";
import {
  codeMatchesStatus,
  type LiveOutcome,
  type Result,
  sanitizeText,
  stableJson,
} from "./contract.ts";
import { LIVE_CAPABILITIES, type LiveAdapterId } from "./registry.ts";

export interface SkippedLiveRunReceipt {
  readonly kind: "skipped";
  readonly adapterId: LiveAdapterId;
  readonly evaluatedAt: string;
  readonly outcome: LiveOutcome;
}

export interface RecordedLiveRunReceipt {
  readonly kind: "recorded";
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly journeyId: string;
  readonly adapterId: LiveAdapterId;
  readonly recordedAt: string;
  readonly gitSha: string;
  readonly measuredVersion: string;
  readonly outcome: LiveOutcome;
  readonly attemptCount: number;
  readonly timeoutMs: number;
  readonly cleanup: CleanupReceipt;
  readonly durability: "file-and-directory" | "file-only";
}

export type LiveRunReceipt = SkippedLiveRunReceipt | RecordedLiveRunReceipt;

export interface LedgerError {
  readonly kind:
    | "malformed-line"
    | "invalid-receipt"
    | "unknown-adapter"
    | "receipt-conflict"
    | "lock-timeout"
    | "owner-mismatch"
    | "write-failed"
    | "fsync-failed"
    | "rename-failed"
    | "revalidation-failed"
    | "pending-durability";
  readonly diagnostic: string;
}

export type LedgerLockStatus =
  | Readonly<{ kind: "free" }>
  | Readonly<{ kind: "owned-alive" | "owned-dead" | "owned-unknown"; token: string }>
  | Readonly<{ kind: "unstamped-fresh" | "unstamped-stale" }>;

interface LedgerOwnerToken {
  readonly pid: number;
  readonly token: string;
}

export interface LedgerOptions {
  readonly maxRetries?: number;
  readonly retryMs?: number;
  readonly unstampedGraceMs?: number;
  readonly fsyncDirectory?: (directory: string) => void;
}

const OWNER_FILE = "owner.json";
const DEFAULT_UNSTAMPED_GRACE_MS = 5_000;
const RECEIPT_ID = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;

function ledgerError(kind: LedgerError["kind"], diagnostic: string): LedgerError {
  return { kind, diagnostic: sanitizeText(diagnostic) };
}

function pendingPath(path: string, receiptId: string): string {
  return `${path}.pending-${receiptId}.json`;
}

function ownerPath(path: string): string {
  return join(`${path}.lock`, OWNER_FILE);
}

function readOwner(path: string): LedgerOwnerToken | null {
  try {
    const parsed = JSON.parse(readFileSync(ownerPath(path), "utf8")) as Partial<LedgerOwnerToken>;
    if (
      typeof parsed.pid !== "number" ||
      typeof parsed.token !== "string"
    ) {
      return null;
    }
    return { pid: parsed.pid, token: parsed.token };
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): "alive" | "dead" | "unknown" {
  try {
    process.kill(pid, 0);
    return "alive";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "dead";
    return "unknown";
  }
}

export function inspectLedgerLock(
  path: string,
  options: Pick<LedgerOptions, "unstampedGraceMs"> = {},
): Result<LedgerLockStatus, LedgerError> {
  const lockPath = `${path}.lock`;
  if (!existsSync(lockPath)) return { ok: true, value: { kind: "free" } };
  const owner = readOwner(path);
  if (owner !== null) {
    const liveness = processIsAlive(owner.pid);
    return {
      ok: true,
      value: {
        kind:
          liveness === "alive"
            ? "owned-alive"
            : liveness === "dead"
              ? "owned-dead"
              : "owned-unknown",
        token: owner.token,
      },
    };
  }
  try {
    const age = Date.now() - statSync(lockPath).mtimeMs;
    return {
      ok: true,
      value: {
        kind: age > (options.unstampedGraceMs ?? DEFAULT_UNSTAMPED_GRACE_MS)
          ? "unstamped-stale"
          : "unstamped-fresh",
      },
    };
  } catch (error) {
    return { ok: false, error: ledgerError("owner-mismatch", String(error)) };
  }
}

function recoverableLock(path: string, options: LedgerOptions): boolean {
  const inspected = inspectLedgerLock(path, options);
  return (
    inspected.ok &&
    (inspected.value.kind === "owned-dead" || inspected.value.kind === "unstamped-stale")
  );
}

function reapLedgerLock(path: string, options: LedgerOptions): boolean {
  if (!recoverableLock(path, options)) return false;
  const lockPath = `${path}.lock`;
  const mutex = `${lockPath}.reap`;
  try {
    mkdirSync(mutex);
  } catch {
    return false;
  }
  const privatePath = `${lockPath}.dead-${process.pid}-${randomUUID()}`;
  try {
    if (!recoverableLock(path, options)) return false;
    renameSync(lockPath, privatePath);
    const privateOwner = (() => {
      try {
        return JSON.parse(readFileSync(join(privatePath, OWNER_FILE), "utf8")) as LedgerOwnerToken;
      } catch {
        return null;
      }
    })();
    if (privateOwner !== null && processIsAlive(privateOwner.pid) !== "dead") {
      renameSync(privatePath, lockPath);
      return false;
    }
    rmSync(privatePath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(mutex, { recursive: true, force: true });
  }
}

function acquireLedgerLock(path: string, options: LedgerOptions): Result<LedgerOwnerToken, LedgerError> {
  const lockPath = `${path}.lock`;
  const maxRetries = options.maxRetries ?? 50;
  const retryMs = options.retryMs ?? 100;
  const owner: LedgerOwnerToken = {
    pid: process.pid,
    token: randomUUID(),
  };
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let created = false;
    try {
      mkdirSync(lockPath);
      created = true;
      writeFileSync(ownerPath(path), `${JSON.stringify(owner)}\n`, { flag: "wx", mode: 0o600 });
      return { ok: true, value: owner };
    } catch {
      if (created) {
        rmSync(lockPath, { recursive: true, force: true });
        return { ok: false, error: ledgerError("write-failed", "lock owner stamp failed") };
      }
      if (reapLedgerLock(path, options)) continue;
      if (attempt < maxRetries) Bun.sleepSync(retryMs);
    }
  }
  return { ok: false, error: ledgerError("lock-timeout", "ledger lock remained unavailable") };
}

function releaseLedgerLock(path: string, owner: LedgerOwnerToken): void {
  if (readOwner(path)?.token !== owner.token) return;
  rmSync(`${path}.lock`, { recursive: true, force: true });
}

function receiptIssue(receipt: RecordedLiveRunReceipt): string | null {
  if (receipt.kind !== "recorded" || receipt.schemaVersion !== 1) return "recorded schema is invalid";
  if (!RECEIPT_ID.test(receipt.receiptId)) return "receiptId must be a 64-character lowercase SHA-256";
  if (!GIT_SHA.test(receipt.gitSha)) return "gitSha must be a 40-character lowercase SHA";
  if (!Number.isFinite(Date.parse(receipt.recordedAt)) || !receipt.recordedAt.endsWith("Z")) {
    return "recordedAt must be UTC ISO-8601";
  }
  if (!LIVE_CAPABILITIES.some((capability) => capability.id === receipt.adapterId)) {
    return `unknown adapter: ${receipt.adapterId}`;
  }
  if (!codeMatchesStatus(receipt.outcome.status, receipt.outcome.code)) {
    return "outcome status and code do not match";
  }
  if (sanitizeText(JSON.stringify(receipt), Number.POSITIVE_INFINITY) !== JSON.stringify(receipt)) {
    return "receipt contains secret-shaped or absolute-path evidence";
  }
  return null;
}

function pendingIds(path: string): readonly string[] {
  const directory = dirname(path);
  const prefix = `${basename(path)}.pending-`;
  try {
    return readdirSync(directory)
      .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
      .map((name) => name.slice(prefix.length, -".json".length));
  } catch {
    return [];
  }
}

export function parseRunLedger(
  text: string,
  options: Readonly<{ ledgerPath?: string }> = {},
): Result<readonly RecordedLiveRunReceipt[], LedgerError> {
  const receipts: RecordedLiveRunReceipt[] = [];
  const seen = new Map<string, string>();
  const lines = text === "" ? [] : text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  for (const [index, line] of lines.entries()) {
    let receipt: RecordedLiveRunReceipt;
    try {
      receipt = JSON.parse(line) as RecordedLiveRunReceipt;
    } catch {
      return { ok: false, error: ledgerError("malformed-line", `ledger line ${index + 1} is not JSON`) };
    }
    const issue = receiptIssue(receipt);
    if (issue !== null) return { ok: false, error: ledgerError("invalid-receipt", issue) };
    const canonical = stableJson(receipt);
    const previous = seen.get(receipt.receiptId);
    if (previous !== undefined && previous !== canonical) {
      return { ok: false, error: ledgerError("receipt-conflict", `receipt conflict: ${receipt.receiptId}`) };
    }
    seen.set(receipt.receiptId, canonical);
    receipts.push(receipt);
  }
  if (options.ledgerPath !== undefined) {
    const pending = pendingIds(options.ledgerPath).find((id) => seen.has(id));
    if (pending !== undefined) {
      return { ok: false, error: ledgerError("pending-durability", `receipt ${pending} is pending durability`) };
    }
  }
  return { ok: true, value: receipts };
}

function fsyncParentDirectory(path: string): void {
  const fd = openSync(dirname(path), "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function durableWrite(path: string, bytes: string): void {
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, bytes, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  chmodSync(path, 0o600);
}

function currentLedger(path: string): Result<readonly RecordedLiveRunReceipt[], LedgerError> {
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  return parseRunLedger(text);
}

function existingReceiptDecision(
  path: string,
  receipt: RecordedLiveRunReceipt,
  receipts: readonly RecordedLiveRunReceipt[],
): Result<"already-present", LedgerError> | null {
  const sameId = receipts.find((item) => item.receiptId === receipt.receiptId);
  if (sameId === undefined) return null;
  if (stableJson(sameId) !== stableJson(receipt)) {
    return {
      ok: false,
      error: ledgerError("receipt-conflict", `receipt conflict: ${receipt.receiptId}`),
    };
  }
  if (existsSync(pendingPath(path, receipt.receiptId))) {
    return {
      ok: false,
      error: ledgerError("pending-durability", "matching receipt has a pending marker"),
    };
  }
  return { ok: true, value: "already-present" };
}

function persistNewReceipt(
  path: string,
  temporary: string,
  receipt: RecordedLiveRunReceipt,
  owner: LedgerOwnerToken,
  options: LedgerOptions,
): Result<"appended", LedgerError> {
  const currentBytes = existsSync(path) ? readFileSync(path, "utf8") : "";
  const fsyncDirectory = options.fsyncDirectory ?? fsyncParentDirectory;
  if (receipt.durability === "file-and-directory") {
    durableWrite(
      pendingPath(path, receipt.receiptId),
      `${JSON.stringify({ receiptId: receipt.receiptId, ownerToken: owner.token })}\n`,
    );
    fsyncDirectory(dirname(path));
  }
  durableWrite(temporary, `${currentBytes}${JSON.stringify(receipt)}\n`);
  try {
    renameSync(temporary, path);
  } catch (error) {
    return { ok: false, error: ledgerError("rename-failed", String(error)) };
  }
  if (receipt.durability === "file-and-directory") {
    try {
      fsyncDirectory(dirname(path));
      unlinkSync(pendingPath(path, receipt.receiptId));
      fsyncDirectory(dirname(path));
    } catch (error) {
      return { ok: false, error: ledgerError("fsync-failed", String(error)) };
    }
  }
  const finalLedger = currentLedger(path);
  if (!finalLedger.ok || !finalLedger.value.some((item) => item.receiptId === receipt.receiptId)) {
    return {
      ok: false,
      error: ledgerError("revalidation-failed", "final ledger did not contain receipt"),
    };
  }
  return { ok: true, value: "appended" };
}

export async function appendRunReceipt(
  path: string,
  receipt: RecordedLiveRunReceipt,
  options: LedgerOptions = {},
): Promise<Result<"appended" | "already-present", LedgerError>> {
  const issue = receiptIssue(receipt);
  if (issue !== null) return { ok: false, error: ledgerError("invalid-receipt", issue) };
  mkdirSync(dirname(path), { recursive: true });
  const acquired = acquireLedgerLock(path, options);
  if (!acquired.ok) return acquired;
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    const existing = currentLedger(path);
    if (!existing.ok) return existing;
    const existingDecision = existingReceiptDecision(path, receipt, existing.value);
    if (existingDecision !== null) return existingDecision;
    return persistNewReceipt(path, temporary, receipt, acquired.value, options);
  } catch (error) {
    return { ok: false, error: ledgerError("write-failed", String(error)) };
  } finally {
    if (existsSync(temporary)) rmSync(temporary, { force: true });
    releaseLedgerLock(path, acquired.value);
  }
}

export async function recoverRunReceipt(
  path: string,
  receipt: RecordedLiveRunReceipt,
  options: LedgerOptions = {},
): Promise<Result<"appended" | "already-present", LedgerError>> {
  if (!existsSync(pendingPath(path, receipt.receiptId))) return appendRunReceipt(path, receipt, options);
  const acquired = acquireLedgerLock(path, options);
  if (!acquired.ok) return acquired;
  try {
    const existing = currentLedger(path);
    if (!existing.ok) return existing;
    const sameId = existing.value.find((item) => item.receiptId === receipt.receiptId);
    if (sameId === undefined || stableJson(sameId) !== stableJson(receipt)) {
      return { ok: false, error: ledgerError("receipt-conflict", "pending receipt does not match final ledger") };
    }
    const fsyncDirectory = options.fsyncDirectory ?? fsyncParentDirectory;
    fsyncDirectory(dirname(path));
    unlinkSync(pendingPath(path, receipt.receiptId));
    fsyncDirectory(dirname(path));
    return { ok: true, value: "already-present" };
  } catch (error) {
    return { ok: false, error: ledgerError("fsync-failed", String(error)) };
  } finally {
    releaseLedgerLock(path, acquired.value);
  }
}

export function latestGreenByAdapter(
  receipts: readonly RecordedLiveRunReceipt[],
): ReadonlyMap<LiveAdapterId, RecordedLiveRunReceipt> {
  const latest = new Map<LiveAdapterId, RecordedLiveRunReceipt>();
  for (const receipt of receipts) {
    if (receipt.outcome.status !== "success") continue;
    const current = latest.get(receipt.adapterId);
    if (current === undefined || receipt.recordedAt > current.recordedAt) {
      latest.set(receipt.adapterId, receipt);
    }
  }
  return latest;
}
