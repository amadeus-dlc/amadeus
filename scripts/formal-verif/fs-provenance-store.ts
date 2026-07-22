import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import { createTransaction, foldLedger, type CommitReceipt, type FoldedLedger, type ProvenanceError, type ProvenanceEvent, type ProvenanceStorePort } from "./provenance.ts";

interface StoredTransaction { transactionId: string; previousHead: string | null; head: string; events: readonly ProvenanceEvent[] }
export type DurabilityPhase = "after-write" | "after-file-sync" | "after-rename" | "after-directory-sync";
export type StoreObjectKind = "transaction" | "successor" | "lock";
export type FailureInjector = (kind: StoreObjectKind, phase: DurabilityPhase) => void;
interface LockOwner { version: 1; host: string; pid: number; processStartedAt: string; nonce: string; createdAt: string }
interface SuccessorRecord { head: string; previousHead: string | null; transactionId: string }

const VERIFIED_LEDGER_AUTHORITY = Symbol("verified provenance ledger authority");
const verifiedLedgers = new WeakSet<object>();
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export class VerifiedProvenanceLedger {
  private constructor(readonly ledger: FoldedLedger, readonly storeHead: string | null) {
    deepFreeze(ledger);
    verifiedLedgers.add(this);
    Object.freeze(this);
  }
  static mint(authority: symbol, ledger: FoldedLedger, storeHead: string | null): VerifiedProvenanceLedger {
    if (authority !== VERIFIED_LEDGER_AUTHORITY) throw new Error("verified provenance ledger authority mismatch");
    return new VerifiedProvenanceLedger(ledger, storeHead);
  }
}
export function isVerifiedProvenanceLedger(value: unknown): value is VerifiedProvenanceLedger {
  return typeof value === "object" && value !== null && verifiedLedgers.has(value);
}

function processStartedAt(pid: number): string | null {
  const result = spawnSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  const time = Date.parse(result.stdout.trim());
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function durableWrite(path: string, body: string, kind: StoreObjectKind, inject?: FailureInjector): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  const fd = openSync(temp, "wx", 0o600);
  try { writeFileSync(fd, body, "utf8"); inject?.(kind, "after-write"); fsyncSync(fd); inject?.(kind, "after-file-sync"); } finally { closeSync(fd); }
  renameSync(temp, path);
  inject?.(kind, "after-rename");
  const parent = openSync(dirname(path), "r");
  try { fsyncSync(parent); } finally { closeSync(parent); }
  inject?.(kind, "after-directory-sync");
}

export class FsProvenanceStoreAdapter implements ProvenanceStorePort {
  constructor(private readonly root: string, private readonly ledger = "default", private readonly inject?: FailureInjector) {}
  private transactions(): string { return join(this.root, "transactions"); }
  private successors(): string { return join(this.root, "successors", this.ledger); }
  private transactionPath(transactionId: string): string { return join(this.transactions(), `${transactionId}.json`); }
  private successorPath(head: string): string { return join(this.successors(), `${head}.json`); }
  private lockPath(): string { return join(this.root, "locks", this.ledger); }
  private syncDirectory(path: string): void { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }
  private parseLock(): LockOwner | null {
    try {
      const value = JSON.parse(readFileSync(this.lockPath(), "utf8")) as Record<string, unknown>;
      if (Object.keys(value).sort().join(",") !== "createdAt,host,nonce,pid,processStartedAt,version" || value.version !== 1 || typeof value.host !== "string" || !value.host || !Number.isSafeInteger(value.pid) || typeof value.processStartedAt !== "string" || !Number.isFinite(Date.parse(value.processStartedAt)) || typeof value.nonce !== "string" || !value.nonce || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return null;
      return value as unknown as LockOwner;
    } catch { return null; }
  }
  private ownerAlive(owner: LockOwner): boolean {
    if (owner.host !== hostname()) return true;
    return processStartedAt(owner.pid) === owner.processStartedAt;
  }
  private quarantineDeadOwner(owner: LockOwner): void {
    const current = this.parseLock();
    if (!current || canonicalIdentity(current).sha256 !== canonicalIdentity(owner).sha256) throw new Error("lock owner changed before quarantine");
    const target = join(this.root, "quarantine", `dead-lock-${this.ledger}-${owner.nonce}.json`);
    mkdirSync(dirname(target), { recursive: true });
    renameSync(this.lockPath(), target);
    this.syncDirectory(dirname(this.lockPath()));
    this.syncDirectory(dirname(target));
    durableWrite(`${target}.receipt.json`, `${JSON.stringify({ kind: "DEAD_LOCK_OWNER_QUARANTINED", owner })}\n`, "lock");
  }
  private acquireLock(): Result<LockOwner, ProvenanceError> {
    mkdirSync(dirname(this.lockPath()), { recursive: true });
    if (existsSync(this.lockPath())) {
      const prior = this.parseLock();
      if (!prior) return { ok: false, error: { kind: "HeadConflictError", message: "unknown lock owner record" } };
      if (this.ownerAlive(prior)) return { ok: false, error: { kind: "HeadConflictError", message: "live ledger writer already active" } };
      this.quarantineDeadOwner(prior);
    }
    const startedAt = processStartedAt(process.pid);
    if (!startedAt) return { ok: false, error: { kind: "HeadConflictError", message: "cannot establish process-start identity" } };
    const owner: LockOwner = { version: 1, host: hostname(), pid: process.pid, processStartedAt: startedAt, nonce: randomUUID(), createdAt: new Date().toISOString() };
    const staged = `${this.lockPath()}.tmp-owner-${owner.pid}-${owner.nonce}`;
    const fd = openSync(staged, "wx", 0o600);
    try { writeFileSync(fd, `${JSON.stringify(owner)}\n`, "utf8"); this.inject?.("lock", "after-write"); fsyncSync(fd); this.inject?.("lock", "after-file-sync"); } finally { closeSync(fd); }
    try { linkSync(staged, this.lockPath()); } catch { unlinkSync(staged); return { ok: false, error: { kind: "HeadConflictError", message: "ledger lock publish conflict" } }; }
    this.inject?.("lock", "after-rename");
    unlinkSync(staged);
    this.syncDirectory(dirname(this.lockPath()));
    this.inject?.("lock", "after-directory-sync");
    return { ok: true, value: owner };
  }
  private releaseLock(owner: LockOwner): void {
    if (!existsSync(this.lockPath())) return;
    const current = this.parseLock();
    if (!current || current.nonce !== owner.nonce || current.pid !== owner.pid) return;
    unlinkSync(this.lockPath());
    this.syncDirectory(dirname(this.lockPath()));
  }
  private quarantineTemps(dir: string): void {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).filter((value) => value.includes(".tmp-"))) {
      const source = join(dir, name);
      const target = join(this.root, "quarantine", `${name}.orphan`);
      mkdirSync(dirname(target), { recursive: true });
      const before = createHash("sha256").update(readFileSync(source)).digest("hex");
      const current = createHash("sha256").update(readFileSync(source)).digest("hex");
      if (before !== current) throw new Error("temporary changed before quarantine");
      renameSync(source, target);
      this.syncDirectory(dir);
      this.syncDirectory(dirname(target));
      durableWrite(`${target}.receipt.json`, `${JSON.stringify({ kind: "ORPHAN_TEMP_QUARANTINED", source: name, contentHash: before })}\n`, "lock");
    }
  }
  private recover(): void { this.quarantineTemps(this.transactions()); this.quarantineTemps(this.successors()); this.quarantineTemps(dirname(this.lockPath())); }
  private loadTransaction(transactionId: string): StoredTransaction | null {
    const path = this.transactionPath(transactionId);
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as StoredTransaction : null;
  }
  private verifyTransaction(expectedHead: string | null, transactionId: string, events: readonly ProvenanceEvent[]): boolean {
    if (events.length === 0 || events.some((event) => event.transactionId !== transactionId)) return false;
    const payloads = events.map(({ transactionId: _, ...payload }) => payload);
    return createTransaction(expectedHead, payloads).transactionId === transactionId;
  }
  private validatedTransaction(transactionId: string): StoredTransaction {
    const stored = this.loadTransaction(transactionId);
    if (!stored || Object.keys(stored).sort().join(",") !== "events,head,previousHead,transactionId" || stored.transactionId !== transactionId || !this.verifyTransaction(stored.previousHead, transactionId, stored.events)) throw new Error("invalid transaction object");
    const expected = canonicalIdentity({ previousHead: stored.previousHead, events: stored.events }, "amadeus.formal-verif.store-head.v1").sha256;
    if (stored.head !== expected) throw new Error("transaction head mismatch");
    return stored;
  }
  private successorRecords(): SuccessorRecord[] {
    if (!existsSync(this.successors())) return [];
    return readdirSync(this.successors()).map((name) => {
      if (!/^[0-9a-f]{64}\.json$/.test(name)) throw new Error("invalid successor filename");
      const value = JSON.parse(readFileSync(join(this.successors(), name), "utf8")) as SuccessorRecord;
      if (Object.keys(value).sort().join(",") !== "head,previousHead,transactionId" || value.head !== name.slice(0, -5) || !/^[0-9a-f]{64}$/.test(value.head) || (value.previousHead !== null && !/^[0-9a-f]{64}$/.test(value.previousHead)) || !/^[0-9a-f]{64}$/.test(value.transactionId)) throw new Error("invalid successor record");
      const stored = this.validatedTransaction(value.transactionId);
      if (stored.head !== value.head || stored.previousHead !== value.previousHead) throw new Error("successor and transaction do not mutually reference");
      return value;
    });
  }
  private currentHead(): string | null {
    const successors = this.successorRecords();
    let head: string | null = null;
    const visited = new Set<string>();
    for (;;) {
      const next = successors.filter((item) => item.previousHead === head);
      if (next.length === 0) {
        if (visited.size !== successors.length) throw new Error("successor chain is disconnected or cyclic");
        return head;
      }
      if (next.length !== 1) throw new Error("corrupt successor fork");
      head = next[0].head;
      if (visited.has(head)) throw new Error("successor cycle");
      visited.add(head);
    }
  }
  readLedger(): Result<VerifiedProvenanceLedger, ProvenanceError> {
    try {
      this.recover();
      const successors = this.successorRecords();
      const events: ProvenanceEvent[] = [];
      let storeHead: string | null = null;
      for (;;) {
        const next = successors.filter((record) => record.previousHead === storeHead);
        if (next.length === 0) break;
        if (next.length !== 1) throw new Error("corrupt successor fork");
        const transaction = this.validatedTransaction(next[0]!.transactionId);
        events.push(...transaction.events);
        storeHead = next[0]!.head;
      }
      if (successors.length > 0 && storeHead !== this.currentHead()) throw new Error("successor chain is incomplete");
      const folded = foldLedger(events);
      if (!folded.ok) return folded;
      return { ok: true, value: VerifiedProvenanceLedger.mint(VERIFIED_LEDGER_AUTHORITY, folded.value, storeHead) };
    } catch {
      return { ok: false, error: { kind: "TransactionCorruptionError", message: "stored ledger is unreadable" } };
    }
  }
  async findTransaction(transactionId: string): Promise<Result<CommitReceipt | null, ProvenanceError>> {
    const path = this.transactionPath(transactionId);
    if (!existsSync(path)) return { ok: true, value: null };
    try {
      const stored = this.validatedTransaction(transactionId);
      if (!existsSync(this.successorPath(stored.head))) return { ok: true, value: null };
      if (this.currentHead() === null) return { ok: false, error: { kind: "TransactionCorruptionError", message: "committed successor chain is empty" } };
      return { ok: true, value: { transactionId, previousHead: stored.previousHead, head: stored.head, eventIds: stored.events.map((event) => event.eventId) } };
    } catch {
      return { ok: false, error: { kind: "TransactionCorruptionError", message: "stored transaction is unreadable" } };
    }
  }
  async appendBatch(expectedHead: string | null, transactionId: string, events: readonly ProvenanceEvent[]): Promise<Result<CommitReceipt, ProvenanceError>> {
    this.recover();
    if (!this.verifyTransaction(expectedHead, transactionId, events)) return { ok: false, error: { kind: "TransactionCorruptionError", message: "transaction preimage or envelope mismatch" } };
    const existing = await this.findTransaction(transactionId);
    if (!existing.ok) return existing;
    if (existing.value) {
      const stored = this.loadTransaction(transactionId)!;
      const same = canonicalIdentity(stored.events).sha256 === canonicalIdentity(events).sha256;
      return same ? { ok: true, value: existing.value } : { ok: false, error: { kind: "TransactionCorruptionError", message: "transaction ID reused with different batch" } };
    }
    let lock: Result<LockOwner, ProvenanceError>;
    try { lock = this.acquireLock(); } catch (cause) { return { ok: false, error: { kind: "CommitUnknownError", message: cause instanceof Error ? cause.message : String(cause) } }; }
    if (!lock.ok) return lock;
    try {
      if (this.currentHead() !== expectedHead) return { ok: false, error: { kind: "HeadConflictError", message: "expected head changed" } };
      const head = canonicalIdentity({ previousHead: expectedHead, events }, "amadeus.formal-verif.store-head.v1").sha256;
      const stored: StoredTransaction = { transactionId, previousHead: expectedHead, head, events };
      const priorObject = this.loadTransaction(transactionId);
      if (priorObject) {
        if (canonicalIdentity(priorObject).sha256 !== canonicalIdentity(stored).sha256) return { ok: false, error: { kind: "TransactionCorruptionError", message: "unreferenced transaction bytes differ" } };
      } else {
        durableWrite(this.transactionPath(transactionId), `${JSON.stringify(stored)}\n`, "transaction", this.inject);
      }
      durableWrite(this.successorPath(head), `${JSON.stringify({ head, previousHead: expectedHead, transactionId })}\n`, "successor", this.inject);
      return { ok: true, value: { transactionId, previousHead: expectedHead, head, eventIds: events.map((event) => event.eventId) } };
    } catch (cause) {
      return { ok: false, error: { kind: "CommitUnknownError", message: cause instanceof Error ? cause.message : String(cause) } };
    } finally {
      this.releaseLock(lock.value);
    }
  }
}
