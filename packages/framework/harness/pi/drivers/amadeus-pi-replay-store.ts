// Machine-local, owner-only replay store for Pi child deliveries.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { PiDeliveryKey } from "./amadeus-pi-driver-contract.ts";

export type PiDeliveryStatus = "reserved" | "guardian-accepted" | "running" | "pending-terminal" | "terminal" | "quarantined";

export interface PiGuardianIdentityRecord {
  readonly pid: number;
  readonly pgid: number;
  readonly publicKey: string;
  readonly executableSnapshotDigest: string;
}

export interface PiTerminalRecord {
  readonly kind: "succeeded" | "failed" | "cancelled" | "timed-out" | "dispatch-not-started";
  readonly reason: string;
  readonly vaultDigest: string | null;
}

export interface PiDeliveryRecord {
  readonly schemaVersion: 1;
  readonly deliveryKey: string;
  readonly requestFingerprint: string;
  readonly status: PiDeliveryStatus;
  readonly guardian?: PiGuardianIdentityRecord;
  readonly terminal?: PiTerminalRecord;
  readonly updatedAt: string;
}

export type PiReserveResult =
  | { readonly kind: "reserved"; readonly record: PiDeliveryRecord }
  | { readonly kind: "terminal-replay"; readonly record: PiDeliveryRecord; readonly output: string }
  | { readonly kind: "in-progress" | "conflict" | "quarantined" | "visibility-failure" | "key-loss" | "vault-tampered" };

export interface PiReplayStore {
  reserve(deliveryKey: PiDeliveryKey, fingerprint: string): PiReserveResult;
  acceptGuardian(deliveryKey: PiDeliveryKey, fingerprint: string, guardian: PiGuardianIdentityRecord): boolean;
  markRunning(deliveryKey: PiDeliveryKey, fingerprint: string): boolean;
  commitTerminal(deliveryKey: PiDeliveryKey, fingerprint: string, terminal: Omit<PiTerminalRecord, "vaultDigest">, output: string): boolean;
  closeNoLaunch(deliveryKey: PiDeliveryKey, fingerprint: string, reason: string): boolean;
  recoverPending(limit: number): readonly PiDeliveryRecord[];
}

const KEY_BYTES = 32;
const NONCE_BYTES = 12;

function leafFor(deliveryKey: string): string {
  return createHash("sha256").update(deliveryKey).digest("hex");
}

function ensurePrivateDirectory(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const stats = lstatSync(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("unsafe-runtime-directory");
}

function assertPrivateRegularFile(path: string): void {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || (stats.mode & 0o077) !== 0) {
    throw new Error("unsafe-runtime-file");
  }
}

function readNoFollow(path: string): Buffer {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeAtomic(path: string, bytes: Buffer | string): void {
  const parent = dirname(path);
  ensurePrivateDirectory(parent);
  const temp = join(parent, `.tmp-${process.pid}-${randomBytes(8).toString("hex")}`);
  const fd = openSync(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
  try {
    writeFileSync(fd, bytes);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
}

function parseRecord(bytes: Buffer): PiDeliveryRecord {
  const value = JSON.parse(bytes.toString("utf8")) as Partial<PiDeliveryRecord>;
  if (
    value.schemaVersion !== 1 ||
    typeof value.deliveryKey !== "string" ||
    typeof value.requestFingerprint !== "string" ||
    !["reserved", "guardian-accepted", "running", "pending-terminal", "terminal", "quarantined"].includes(value.status ?? "") ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("delivery-record-invalid");
  }
  return value as PiDeliveryRecord;
}

function encrypt(key: Buffer, plaintext: string): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

function decrypt(key: Buffer, sealed: Buffer): string {
  if (sealed.length < NONCE_BYTES + 16) throw new Error("vault-invalid");
  const nonce = sealed.subarray(0, NONCE_BYTES);
  const tag = sealed.subarray(NONCE_BYTES, NONCE_BYTES + 16);
  const ciphertext = sealed.subarray(NONCE_BYTES + 16);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function createPiReplayStore(runtimeDir: string, now: () => string = () => new Date().toISOString()): PiReplayStore {
  const recordsDir = join(runtimeDir, "records");
  const vaultDir = join(runtimeDir, "vault");
  const keyPath = join(runtimeDir, "vault.key");
  ensurePrivateDirectory(runtimeDir);
  ensurePrivateDirectory(recordsDir);
  ensurePrivateDirectory(vaultDir);

  const recordPath = (key: string): string => join(recordsDir, `${leafFor(key)}.json`);
  const vaultPath = (key: string): string => join(vaultDir, `${leafFor(key)}.aead`);
  const readRecord = (key: string): PiDeliveryRecord | null => {
    const path = recordPath(key);
    if (!existsSync(path)) return null;
    assertPrivateRegularFile(path);
    return parseRecord(readNoFollow(path));
  };
  const putRecord = (record: PiDeliveryRecord): void => {
    writeAtomic(recordPath(record.deliveryKey), `${JSON.stringify(record)}\n`);
  };
  const putNewRecord = (record: PiDeliveryRecord): void => {
    const path = recordPath(record.deliveryKey);
    const fd = openSync(
      path,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    try {
      writeFileSync(fd, `${JSON.stringify(record)}\n`);
    } finally {
      closeSync(fd);
    }
  };
  const readKey = (create: boolean): Buffer => {
    if (!existsSync(keyPath)) {
      if (!create) throw new Error("vault-key-missing");
      writeAtomic(keyPath, randomBytes(KEY_BYTES));
    }
    assertPrivateRegularFile(keyPath);
    const key = readNoFollow(keyPath);
    if (key.length !== KEY_BYTES) throw new Error("vault-key-invalid");
    return key;
  };

  return {
    reserve(deliveryKey, fingerprint) {
      let existing: PiDeliveryRecord | null;
      try {
        existing = readRecord(deliveryKey);
      } catch (error) {
        if (error instanceof SyntaxError || (error instanceof Error && error.message === "delivery-record-invalid")) {
          return { kind: "quarantined" };
        }
        return { kind: "visibility-failure" };
      }
      if (existing !== null) {
        if (existing.deliveryKey !== deliveryKey || existing.requestFingerprint !== fingerprint) {
          try {
            putRecord({ ...existing, status: "quarantined", updatedAt: now() });
          } catch {
            return { kind: "visibility-failure" };
          }
          return { kind: "conflict" };
        }
        if (existing.status === "quarantined") return { kind: "quarantined" };
        if (existing.status !== "terminal") return { kind: "in-progress" };
        if (existing.terminal?.vaultDigest === null) return { kind: "terminal-replay", record: existing, output: "" };
        try {
          const key = readKey(false);
          const sealedPath = vaultPath(deliveryKey);
          assertPrivateRegularFile(sealedPath);
          const sealed = readNoFollow(sealedPath);
          const digest = createHash("sha256").update(sealed).digest("hex");
          if (digest !== existing.terminal?.vaultDigest) return { kind: "vault-tampered" };
          return { kind: "terminal-replay", record: existing, output: decrypt(key, sealed) };
        } catch (error) {
          return error instanceof Error && error.message === "vault-key-missing"
            ? { kind: "key-loss" }
            : { kind: "vault-tampered" };
        }
      }
      const record: PiDeliveryRecord = {
        schemaVersion: 1,
        deliveryKey,
        requestFingerprint: fingerprint,
        status: "reserved",
        updatedAt: now(),
      };
      try {
        // O_EXCL is the exactly-once reservation boundary. A concurrent
        // contender may observe an incomplete first write, but it can never
        // acquire a second launch permit.
        putNewRecord(record);
        return { kind: "reserved", record };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return { kind: "in-progress" };
        return { kind: "visibility-failure" };
      }
    },
    acceptGuardian(deliveryKey, fingerprint, guardian) {
      try {
        const record = readRecord(deliveryKey);
        if (record?.requestFingerprint !== fingerprint || record.status !== "reserved") return false;
        putRecord({ ...record, guardian, status: "guardian-accepted", updatedAt: now() });
        return true;
      } catch {
        return false;
      }
    },
    markRunning(deliveryKey, fingerprint) {
      try {
        const record = readRecord(deliveryKey);
        if (record?.requestFingerprint !== fingerprint || record.status !== "guardian-accepted") return false;
        putRecord({ ...record, status: "running", updatedAt: now() });
        return true;
      } catch {
        return false;
      }
    },
    commitTerminal(deliveryKey, fingerprint, terminal, output) {
      try {
        const record = readRecord(deliveryKey);
        if (record?.requestFingerprint !== fingerprint || record.status === "terminal" || record.status === "quarantined") return false;
        const pending: PiDeliveryRecord = {
          ...record,
          status: "pending-terminal",
          terminal: { ...terminal, vaultDigest: null },
          updatedAt: now(),
        };
        putRecord(pending);
        let vaultDigest: string | null = null;
        if (output !== "") {
          const sealed = encrypt(readKey(true), output);
          writeAtomic(vaultPath(deliveryKey), sealed);
          vaultDigest = createHash("sha256").update(sealed).digest("hex");
        }
        putRecord({ ...pending, status: "terminal", terminal: { ...terminal, vaultDigest }, updatedAt: now() });
        return true;
      } catch {
        return false;
      }
    },
    closeNoLaunch(deliveryKey, fingerprint, reason) {
      return this.commitTerminal(deliveryKey, fingerprint, { kind: "dispatch-not-started", reason }, "");
    },
    recoverPending(limit) {
      if (!Number.isSafeInteger(limit) || limit < 1) return [];
      const recovered: PiDeliveryRecord[] = [];
      try {
        const { readdirSync } = require("node:fs") as typeof import("node:fs");
        for (const leaf of readdirSync(recordsDir).sort().slice(0, limit)) {
          const path = join(recordsDir, leaf);
          assertPrivateRegularFile(path);
          const record = parseRecord(readNoFollow(path));
          if (record.status === "terminal" || record.status === "quarantined") continue;
          const terminal: PiDeliveryRecord = record.status === "reserved"
            ? {
                ...record,
                status: "terminal",
                terminal: { kind: "dispatch-not-started", reason: "reserved-before-launch-recovered", vaultDigest: null },
                updatedAt: now(),
              }
            : { ...record, status: "quarantined", updatedAt: now() };
          putRecord(terminal);
          recovered.push(terminal);
        }
      } catch {
        return [];
      }
      return recovered;
    },
  };
}
