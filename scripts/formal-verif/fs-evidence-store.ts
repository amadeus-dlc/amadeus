import { closeSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, writeFileSync, writeSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { canonicalIdentity } from "./canonical.ts";
import { parseCellResult, type CellResult, type Result } from "./contract.ts";
import { createEvidenceBundle, createEvidenceEnvelope, PAYLOAD_ROLES, verifyEvidenceBundle, type EvidenceBundleDraft, type EvidenceEnvelope, type PayloadRole } from "./evidence-bundle.ts";
import type { CellEvidenceInput, EvidenceError, EvidenceStorePort, MonotonicClock, VerifiedExecutionReceipt } from "./execution-evidence.ts";

export type EvidenceStorePhase = "after-payload-write" | "after-staging-sync" | "before-rename" | "after-rename";
export type EvidenceStoreFailureInjector = (phase: EvidenceStorePhase) => void;

interface LedgerEntry {
  sequence: number;
  previousHead: string | null;
  bundleId: string;
  cellKey: CellEvidenceInput["key"];
  inputSetHash: string;
  linkIdentity: string;
  head: string;
}

interface StoredMetadata {
  envelope: EvidenceEnvelope;
  resultIdentity: string;
  runnerEntry: LedgerEntry;
  storeEntry: LedgerEntry;
}

interface LockOwner { host: string; pid: number; processStartedAt: string; nonce: string; createdAt: string }
interface Reservation { revisionIdentity: string; reservedBytes: number; usedBytes: number; bundleIds: string[]; status: "ACTIVE" }

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  const normalized = value.includes(".") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === normalized;
}

function isLockOwner(value: unknown): value is LockOwner {
  if (typeof value !== "object" || value === null || Object.keys(value).sort().join(",") !== "createdAt,host,nonce,pid,processStartedAt") return false;
  const owner = value as Record<string, unknown>;
  return typeof owner.host === "string" && owner.host.trim().length > 0
    && Number.isSafeInteger(owner.pid) && (owner.pid as number) > 0
    && typeof owner.processStartedAt === "string" && owner.processStartedAt.trim().length > 0
    && typeof owner.nonce === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(owner.nonce)
    && isIsoDateTime(owner.createdAt);
}

export interface ReadEvidenceCell {
  receipt: VerifiedExecutionReceipt;
  proof: VerifiedEvidenceProof;
  payloads: Readonly<Record<PayloadRole, Uint8Array>>;
  metadata: StoredMetadata;
  result: CellResult;
}

const PROOF_AUTHORITY = Symbol("verified evidence proof authority");
const verifiedProofs = new WeakSet<object>();
export class VerifiedEvidenceProof {
  private constructor(readonly bundleId: string, readonly cellKey: CellEvidenceInput["key"], readonly inputSetHash: string, readonly result: CellResult, readonly receipt: VerifiedExecutionReceipt) { verifiedProofs.add(this); Object.freeze(this); }
  static mint(authority: symbol, bundleId: string, cellKey: CellEvidenceInput["key"], inputSetHash: string, result: CellResult, receipt: VerifiedExecutionReceipt): VerifiedEvidenceProof {
    if (authority !== PROOF_AUTHORITY) throw new Error("verified evidence proof authority mismatch");
    return new VerifiedEvidenceProof(bundleId, cellKey, inputSetHash, result, receipt);
  }
}
export function isVerifiedEvidenceProof(value: unknown): value is VerifiedEvidenceProof { return typeof value === "object" && value !== null && verifiedProofs.has(value); }

function failure(kind: EvidenceError["kind"], message: string): Result<never, EvidenceError> {
  return { ok: false, error: { kind, message } };
}

function syncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function writeDurable(path: string, bytes: Uint8Array): void {
  const fd = openSync(path, "wx", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}

function replaceDurable(path: string, bytes: Uint8Array): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeDurable(temporary, bytes);
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

function processStartedAt(pid: number): string {
  return spawnSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8" }).stdout.trim();
}

function ledgerEntry(entry: Omit<LedgerEntry, "head">, domain: string): LedgerEntry {
  return { ...entry, head: canonicalIdentity(entry, domain).sha256 };
}

export class FsEvidenceStoreAdapter implements EvidenceStorePort {
  constructor(
    private readonly root: string,
    private readonly clock: MonotonicClock,
    private readonly inject?: EvidenceStoreFailureInjector,
    private readonly capacityBytes = Number.POSITIVE_INFINITY,
  ) { mkdirSync(root, { recursive: true }); }

  private transactions(): string { return join(this.root, "transactions"); }
  private lock(): string { return join(this.root, ".writer-lock"); }
  private reservations(): string { return join(this.root, "reservations"); }
  private reservationPath(revisionIdentity: string): string { return join(this.reservations(), `${revisionIdentity}.json`); }
  private reservationBytesPath(revisionIdentity: string): string { return join(this.reservations(), `${revisionIdentity}.bin`); }
  private directories(): string[] {
    if (!existsSync(this.transactions())) return [];
    return readdirSync(this.transactions()).filter((name) => /^\d{8}-[0-9a-f]{64}$/.test(name)).sort();
  }
  private metadata(directory: string): StoredMetadata {
    return JSON.parse(readFileSync(join(this.transactions(), directory, "index.json"), "utf8")) as StoredMetadata;
  }
  private chain(): { runnerHead: string | null; storeHead: string | null; nextSequence: number } {
    let runnerHead: string | null = null;
    let storeHead: string | null = null;
    let sequence = 0;
    for (const directory of this.directories()) {
      const metadata = this.metadata(directory);
      const runner = metadata.runnerEntry;
      const store = metadata.storeEntry;
      const runnerPreimage = { sequence: runner.sequence, previousHead: runner.previousHead, bundleId: runner.bundleId, cellKey: runner.cellKey, inputSetHash: runner.inputSetHash, linkIdentity: runner.linkIdentity };
      const storePreimage = { sequence: store.sequence, previousHead: store.previousHead, bundleId: store.bundleId, cellKey: store.cellKey, inputSetHash: store.inputSetHash, linkIdentity: store.linkIdentity };
      if (runner.sequence !== sequence || store.sequence !== sequence || runner.previousHead !== runnerHead || store.previousHead !== storeHead || canonicalIdentity(runnerPreimage, "amadeus.formal-verif.runner-ledger.v1").sha256 !== runner.head || canonicalIdentity(storePreimage, "amadeus.formal-verif.store-ledger.v1").sha256 !== store.head) throw new Error("ledger chain drift");
      runnerHead = runner.head;
      storeHead = store.head;
      sequence++;
    }
    return { runnerHead, storeHead, nextSequence: sequence };
  }
  private transactionFor(bundleId: string): string | null {
    return this.directories().find((name) => name.endsWith(`-${bundleId}`)) ?? null;
  }
  private quarantineLock(label: string): boolean {
    try {
      const quarantine = join(this.root, ".lock-quarantine");
      mkdirSync(quarantine, { recursive: true });
      syncDirectory(this.root);
      renameSync(this.lock(), join(quarantine, `${label}-${randomUUID()}`));
      syncDirectory(quarantine);
      syncDirectory(this.root);
      return true;
    } catch { return false; }
  }
  private acquire(): LockOwner | null {
    if (existsSync(this.lock())) {
      if (!existsSync(join(this.lock(), "owner.json"))) {
        if (!this.quarantineLock("ownerless")) return null;
      } else {
        try {
          const prior: unknown = JSON.parse(readFileSync(join(this.lock(), "owner.json"), "utf8"));
          if (!isLockOwner(prior)) return null;
          const alive = prior.host !== hostname() || (prior.pid > 0 && processStartedAt(prior.pid) === prior.processStartedAt);
          if (alive) return null;
          if (!this.quarantineLock(prior.nonce)) return null;
        } catch { return null; }
      }
    }
    const owner: LockOwner = { host: hostname(), pid: process.pid, processStartedAt: processStartedAt(process.pid), nonce: randomUUID(), createdAt: new Date().toISOString() };
    const staging = join(this.root, `.writer-lock-${owner.nonce}.staging`);
    try {
      mkdirSync(staging);
      writeDurable(join(staging, "owner.json"), new TextEncoder().encode(JSON.stringify(owner)));
      syncDirectory(staging);
      syncDirectory(this.root);
      renameSync(staging, this.lock());
      syncDirectory(this.root);
      return owner;
    } catch { rmSync(staging, { recursive: true, force: true }); syncDirectory(this.root); return null; }
  }
  private release(owner: LockOwner): void {
    try {
      const current = JSON.parse(readFileSync(join(this.lock(), "owner.json"), "utf8")) as LockOwner;
      if (current.nonce !== owner.nonce || current.pid !== owner.pid || current.processStartedAt !== owner.processStartedAt) return;
      rmSync(join(this.lock(), "owner.json"));
      rmdirSync(this.lock());
      syncDirectory(this.root);
    } catch { /* A changed owner is never deleted. */ }
  }
  private readReservation(revisionIdentity: string): Reservation | null {
    try { return JSON.parse(readFileSync(this.reservationPath(revisionIdentity), "utf8")) as Reservation; } catch { return null; }
  }
  private activeReservations(): Reservation[] {
    if (!existsSync(this.reservations())) return [];
    return readdirSync(this.reservations()).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(join(this.reservations(), name), "utf8")) as Reservation).filter((value) => value.status === "ACTIVE");
  }

  reserveCapacity(revisionIdentity: string, bytes: number): Result<{ revisionIdentity: string; bytes: number }, EvidenceError> {
    if (!/^[0-9a-f]{64}$/.test(revisionIdentity) || !Number.isSafeInteger(bytes) || bytes <= 0) return failure("EvidencePublishError", "invalid capacity reservation");
    const owner = this.acquire();
    if (!owner) return failure("EvidencePublishError", "live evidence writer already active");
    try {
      mkdirSync(this.reservations(), { recursive: true });
      if (existsSync(this.reservationPath(revisionIdentity))) return failure("EvidencePublishError", "reservation already exists");
      const active = this.activeReservations().reduce((sum, value) => sum + value.reservedBytes, 0);
      if (active + bytes > this.capacityBytes) return failure("EvidencePublishError", "insufficient store capacity");
      const fd = openSync(this.reservationBytesPath(revisionIdentity), "wx", 0o600);
      try { const chunk = new Uint8Array(Math.min(bytes, 64 * 1024)); for (let remaining = bytes; remaining > 0;) { const count = Math.min(remaining, chunk.length); writeSync(fd, chunk, 0, count); remaining -= count; } fsyncSync(fd); } finally { closeSync(fd); }
      const reservation: Reservation = { revisionIdentity, reservedBytes: bytes, usedBytes: 0, bundleIds: [], status: "ACTIVE" };
      writeDurable(this.reservationPath(revisionIdentity), new TextEncoder().encode(JSON.stringify(reservation)));
      syncDirectory(this.reservations());
      syncDirectory(this.root);
      return { ok: true, value: { revisionIdentity, bytes } };
    } catch (cause) {
      rmSync(this.reservationPath(revisionIdentity), { force: true });
      rmSync(this.reservationBytesPath(revisionIdentity), { force: true });
      if (existsSync(this.reservations())) syncDirectory(this.reservations());
      return failure("EvidencePublishError", cause instanceof Error ? cause.message : String(cause));
    }
    finally { this.release(owner); }
  }

  private finishCapacity(revisionIdentity: string, status: "CLOSED" | "ABORTED"): Result<void, EvidenceError> {
    const owner = this.acquire();
    if (!owner) return failure("EvidencePublishError", "live evidence writer already active");
    try {
      const reservation = this.readReservation(revisionIdentity);
      if (!reservation || reservation.revisionIdentity !== revisionIdentity || reservation.status !== "ACTIVE") return failure("EvidencePublishError", "active reservation does not exist");
      const receipts = join(this.root, "reservation-receipts");
      mkdirSync(receipts, { recursive: true });
      writeDurable(join(receipts, `${revisionIdentity}-${status}.json`), new TextEncoder().encode(JSON.stringify({ ...reservation, status, finishedAt: this.clock.utcNow() })));
      syncDirectory(receipts);
      rmSync(this.reservationPath(revisionIdentity));
      rmSync(this.reservationBytesPath(revisionIdentity));
      syncDirectory(this.reservations());
      syncDirectory(this.root);
      return { ok: true, value: undefined };
    } catch (cause) { return failure("EvidencePublishError", cause instanceof Error ? cause.message : String(cause)); }
    finally { this.release(owner); }
  }
  closeCapacity(revisionIdentity: string): Result<void, EvidenceError> { return this.finishCapacity(revisionIdentity, "CLOSED"); }
  abortCapacity(revisionIdentity: string): Result<void, EvidenceError> { return this.finishCapacity(revisionIdentity, "ABORTED"); }
  releaseCapacity(revisionIdentity: string): Result<void, EvidenceError> { return this.closeCapacity(revisionIdentity); }

  async publishCell(input: CellEvidenceInput, deadlineMs: number): Promise<Result<VerifiedExecutionReceipt, EvidenceError>> {
    if (this.clock.nowMs() >= deadlineMs) return failure("EvidencePublishError", "evidence publish deadline reached");
    const built = createEvidenceBundle(input);
    if (!built.ok) return failure("EvidenceIdentityError", built.error.message);
    const owner = this.acquire();
    if (!owner) return failure("EvidencePublishError", "live evidence writer already active");
    let staging: string | null = null;
    try {
      const reservation = this.readReservation(input.revisionIdentity);
      if (!reservation || reservation.revisionIdentity !== input.revisionIdentity || reservation.status !== "ACTIVE") return failure("EvidencePublishError", "unreserved evidence publish");
      const existing = this.transactionFor(built.value.bundleId);
      if (existing) {
        const read = this.readCell(built.value.bundleId);
        if (!read.ok) return read;
        const sameKey = canonicalIdentity(read.value.metadata.runnerEntry.cellKey).sha256 === canonicalIdentity(input.key).sha256;
        return sameKey && read.value.metadata.runnerEntry.inputSetHash === input.inputSetHash && reservation.bundleIds.includes(built.value.bundleId) ? { ok: true, value: read.value.receipt } : failure("EvidenceCorruptionError", "bundle identity reused or reservation consumption missing");
      }
      const chain = this.chain();
      const sequence = chain.nextSequence;
      const publishedAt = this.clock.utcNow();
      const envelope = createEvidenceEnvelope(built.value, { expectedRunnerHead: chain.runnerHead, expectedStoreHead: chain.storeHead, runnerSequence: sequence, storeSequence: sequence }, publishedAt);
      if (!envelope.ok) return failure("EvidenceIdentityError", envelope.error.message);
      const runnerEntry = ledgerEntry({ sequence, previousHead: chain.runnerHead, bundleId: built.value.bundleId, cellKey: input.key, inputSetHash: input.inputSetHash, linkIdentity: built.value.resultIdentity }, "amadeus.formal-verif.runner-ledger.v1");
      const storeEntry = ledgerEntry({ sequence, previousHead: chain.storeHead, bundleId: built.value.bundleId, cellKey: input.key, inputSetHash: input.inputSetHash, linkIdentity: envelope.value.envelopeHash }, "amadeus.formal-verif.store-ledger.v1");
      const metadata: StoredMetadata = { envelope: envelope.value, resultIdentity: built.value.resultIdentity, runnerEntry, storeEntry };
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const consumedBytes = metadataBytes.byteLength + PAYLOAD_ROLES.reduce((sum, role) => sum + built.value.payloads[role].byteLength, 0);
      if (reservation.usedBytes + consumedBytes > reservation.reservedBytes) return failure("EvidencePublishError", "capacity reservation exhausted");
      mkdirSync(this.transactions(), { recursive: true });
      staging = mkdtempSync(join(this.root, ".staging-"));
      for (const role of PAYLOAD_ROLES) writeDurable(join(staging, role), built.value.payloads[role]);
      this.inject?.("after-payload-write");
      writeDurable(join(staging, "index.json"), metadataBytes);
      syncDirectory(staging);
      this.inject?.("after-staging-sync");
      if (this.clock.nowMs() >= deadlineMs) return failure("EvidencePublishError", "evidence publish deadline reached before commit");
      if (this.chain().runnerHead !== chain.runnerHead || this.chain().storeHead !== chain.storeHead) return failure("EvidencePublishError", "evidence ledger head changed");
      const target = join(this.transactions(), `${String(sequence).padStart(8, "0")}-${built.value.bundleId}`);
      this.inject?.("before-rename");
      renameSync(staging, target);
      staging = null;
      syncDirectory(this.transactions());
      const consumed: Reservation = { ...reservation, usedBytes: reservation.usedBytes + consumedBytes, bundleIds: [...reservation.bundleIds, built.value.bundleId] };
      replaceDurable(this.reservationPath(input.revisionIdentity), new TextEncoder().encode(JSON.stringify(consumed)));
      this.inject?.("after-rename");
      if (this.clock.nowMs() >= deadlineMs) return failure("EvidencePublishError", "evidence publish deadline reached after durable commit");
      return { ok: true, value: { kind: "VerifiedExecutionReceipt", bundleId: built.value.bundleId, envelopeHash: envelope.value.envelopeHash, runnerHead: runnerEntry.head, storeHead: storeEntry.head, runnerSequence: sequence, storeSequence: sequence } };
    } catch (cause) {
      return failure("EvidencePublishError", cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (staging && existsSync(staging)) rmSync(staging, { recursive: true, force: true });
      this.release(owner);
    }
  }

  readCell(bundleId: string): Result<ReadEvidenceCell, EvidenceError> {
    try {
      this.chain();
      const directory = this.transactionFor(bundleId);
      if (!directory) return failure("EvidenceIdentityError", "bundle is missing");
      const metadata = this.metadata(directory);
      const payloads = Object.fromEntries(PAYLOAD_ROLES.map((role) => [role, new Uint8Array(readFileSync(join(this.transactions(), directory, role))) ])) as Record<PayloadRole, Uint8Array>;
      const bundle: EvidenceBundleDraft = { bundleId, resultIdentity: metadata.resultIdentity, manifest: metadata.envelope.manifest, payloads };
      const verified = verifyEvidenceBundle(bundle);
      const parsed = parseCellResult(JSON.parse(new TextDecoder().decode(payloads["result.json"])));
      const resultIdentity = parsed.ok ? canonicalIdentity(parsed.value, "amadeus.formal-verif.cell-result.v1").sha256 : "";
      const envelope = metadata.envelope;
      const envelopePreimage = { bundleId: envelope.bundleId, manifest: envelope.manifest, publishedAt: envelope.publishedAt, expectedRunnerHead: envelope.expectedRunnerHead, expectedStoreHead: envelope.expectedStoreHead, runnerSequence: envelope.runnerSequence, storeSequence: envelope.storeSequence };
      const envelopeHash = canonicalIdentity(envelopePreimage, "amadeus.formal-verif.envelope.v1").sha256;
      const runner = metadata.runnerEntry; const store = metadata.storeEntry;
      const mutuallyBound = runner.bundleId === bundleId && store.bundleId === bundleId && canonicalIdentity(runner.cellKey).sha256 === canonicalIdentity(store.cellKey).sha256 && runner.inputSetHash === store.inputSetHash && runner.sequence === store.sequence && runner.previousHead === envelope.expectedRunnerHead && store.previousHead === envelope.expectedStoreHead && runner.sequence === envelope.runnerSequence && store.sequence === envelope.storeSequence;
      if (!verified.ok || !parsed.ok || resultIdentity !== metadata.resultIdentity || runner.linkIdentity !== resultIdentity || envelope.bundleId !== bundleId || envelopeHash !== envelope.envelopeHash || store.linkIdentity !== envelopeHash || !mutuallyBound || parsed.value.arm !== runner.cellKey.arm || parsed.value.fixtureId !== runner.cellKey.subject) return failure("EvidenceIdentityError", "stored evidence identity mismatch");
      const receipt: VerifiedExecutionReceipt = { kind: "VerifiedExecutionReceipt", bundleId, envelopeHash, runnerHead: runner.head, storeHead: store.head, runnerSequence: runner.sequence, storeSequence: store.sequence };
      const proof = VerifiedEvidenceProof.mint(PROOF_AUTHORITY, bundleId, runner.cellKey, runner.inputSetHash, parsed.value, receipt);
      return { ok: true, value: { metadata, payloads, receipt, proof, result: parsed.value } };
    } catch (cause) {
      return failure("EvidenceIdentityError", cause instanceof Error ? cause.message : String(cause));
    }
  }
}
