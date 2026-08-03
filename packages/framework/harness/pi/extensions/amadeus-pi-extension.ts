// Amadeus lifecycle adapter for @earendil-works/pi-coding-agent >= 0.83.
//
// This module intentionally uses a structural subset of Pi's public Extension
// API. The distributed extension therefore has no runtime dependency on Pi's
// package while still failing closed when the captured 0.83 contract drifts.
// The extension is not a sandbox: it runs with the same user privileges as Pi.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const PI_EXTENSION_PROFILE = "pi-coding-agent/0.83" as const;
export const PI_CANONICAL_EVENT_VERSION = 1 as const;

type CoreRuntime = {
  readonly appendJournalRecordV2: (
    record: Record<string, unknown>,
    projectDir: string,
  ) => { readonly appended: boolean; readonly reason?: string };
  readonly activeIntent: (projectDir: string, space?: string) => string | null;
  readonly activeSpace: (projectDir: string) => string;
  readonly auditCloneId: (projectDir: string) => string;
  readonly getEventDefByAuditEvent: (auditEvent: string) => { readonly name: string };
  readonly getField: (content: string, field: string) => string | null;
  readonly journalSchemaVersionV2: number;
  readonly readAllAuditShards: (projectDir: string) => string;
  readonly recoveryFilePath: (projectDir: string) => string;
  readonly stateFilePath: (projectDir: string) => string;
  readonly withAuditLock: <T>(projectDir: string, callback: () => T) => T;
};

let coreRuntimePromise: Promise<CoreRuntime> | null = null;

function coreModuleUrl(relativePath: string): string {
  const projected = new URL(`../${relativePath}`, import.meta.url);
  const authored = new URL(`../../../core/${relativePath}`, import.meta.url);
  return (existsSync(fileURLToPath(projected)) ? projected : authored).href;
}

async function loadCoreRuntime(): Promise<CoreRuntime> {
  coreRuntimePromise ??= Promise.all([
    import(coreModuleUrl("tools/amadeus-audit.ts")),
    import(coreModuleUrl("tools/amadeus-lib.ts")),
    import(coreModuleUrl("tools/amadeus-journal.ts")),
    import(coreModuleUrl("otel/event-registry.ts")),
  ]).then(([audit, lib, journal, registry]) => {
    if (
      typeof audit.appendJournalRecordV2 !== "function"
      || typeof lib.activeIntent !== "function"
      || typeof lib.activeSpace !== "function"
      || typeof lib.auditCloneId !== "function"
      || typeof lib.getField !== "function"
      || typeof lib.readAllAuditShards !== "function"
      || typeof lib.recoveryFilePath !== "function"
      || typeof lib.stateFilePath !== "function"
      || typeof lib.withAuditLock !== "function"
      || typeof journal.JOURNAL_SCHEMA_VERSION_V2 !== "number"
      || typeof registry.getEventDefByAuditEvent !== "function"
    ) throw new Error("Amadeus core runtime contract is incomplete");
    return {
      appendJournalRecordV2: audit.appendJournalRecordV2,
      activeIntent: lib.activeIntent,
      activeSpace: lib.activeSpace,
      auditCloneId: lib.auditCloneId,
      getEventDefByAuditEvent: registry.getEventDefByAuditEvent,
      getField: lib.getField,
      journalSchemaVersionV2: journal.JOURNAL_SCHEMA_VERSION_V2,
      readAllAuditShards: lib.readAllAuditShards,
      recoveryFilePath: lib.recoveryFilePath,
      stateFilePath: lib.stateFilePath,
      withAuditLock: lib.withAuditLock,
    } as CoreRuntime;
  });
  return coreRuntimePromise;
}

function isoTimestamp(): string {
  return new Date().toISOString();
}

export const PI_083_EVENT_NAMES = [
  "session_start",
  "session_shutdown",
  "input",
  "agent_start",
  "agent_end",
  "agent_settled",
  "tool_execution_start",
  "tool_execution_end",
  "session_before_compact",
  "session_compact",
] as const;

export type Pi083EventName = (typeof PI_083_EVENT_NAMES)[number];
export type PiInputSource = "interactive" | "rpc" | "extension";

export interface PiSessionEntry {
  readonly type?: unknown;
  readonly customType?: unknown;
  readonly details?: unknown;
  readonly data?: unknown;
  readonly id?: unknown;
}

export interface PiReadonlySessionManager {
  getSessionId(): string;
  getLeafId(): string | null;
  getEntries(): readonly PiSessionEntry[];
}

export interface PiExtensionContext {
  readonly cwd: string;
  readonly sessionManager: PiReadonlySessionManager;
  readonly ui?: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
}

export type PiExtensionHandler = (
  event: unknown,
  context: PiExtensionContext,
) => unknown | Promise<unknown>;

export interface PiExtensionApi {
  on(event: Pi083EventName, handler: PiExtensionHandler): void;
  appendEntry<T = unknown>(customType: string, data?: T): void;
  sendMessage<T = unknown>(
    message: {
      customType: string;
      content: string;
      display: boolean;
      details?: T;
    },
    options?: {
      triggerTurn?: boolean;
      deliverAs?: "steer" | "followUp" | "nextTurn";
    },
  ): void;
}

type PiSessionStartEvent = {
  readonly type: "session_start";
  readonly reason: "startup" | "reload" | "new" | "resume" | "fork";
  readonly previousSessionFile?: string;
};

type PiSessionShutdownEvent = {
  readonly type: "session_shutdown";
  readonly reason: "quit" | "reload" | "new" | "resume" | "fork";
  readonly targetSessionFile?: string;
};

type PiInputEvent = {
  readonly type: "input";
  readonly text: string;
  readonly images?: readonly unknown[];
  readonly source: PiInputSource;
  readonly streamingBehavior?: "steer" | "followUp";
};

type PiAgentEvent = {
  readonly type: "agent_start" | "agent_settled";
};

type PiAgentEndEvent = {
  readonly type: "agent_end";
  readonly messages: readonly unknown[];
};

type PiToolStartEvent = {
  readonly type: "tool_execution_start";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: unknown;
};

type PiToolEndEvent = {
  readonly type: "tool_execution_end";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: unknown;
  readonly isError: boolean;
};

type PiBeforeCompactEvent = {
  readonly type: "session_before_compact";
  readonly reason: "manual" | "threshold" | "overflow";
  readonly willRetry: boolean;
  readonly preparation: unknown;
  readonly branchEntries: readonly unknown[];
};

type PiCompactEvent = {
  readonly type: "session_compact";
  readonly reason: "manual" | "threshold" | "overflow";
  readonly willRetry: boolean;
  readonly fromExtension: boolean;
  readonly compactionEntry: Record<string, unknown>;
};

export type ParsedPi083Event =
  | PiSessionStartEvent
  | PiSessionShutdownEvent
  | PiInputEvent
  | PiAgentEvent
  | PiAgentEndEvent
  | PiToolStartEvent
  | PiToolEndEvent
  | PiBeforeCompactEvent
  | PiCompactEvent;

type JsonObject = Record<string, unknown>;

function record(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function exactString<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Closed parser for the public Pi 0.83 ExtensionEvent subset Amadeus uses. */
export function parsePi083Event(
  expected: Pi083EventName,
  value: unknown,
): ParsedPi083Event | null {
  const source = record(value);
  if (source === null || source.type !== expected) return null;

  switch (expected) {
    case "session_start": {
      const reason = exactString(source.reason, ["startup", "reload", "new", "resume", "fork"] as const);
      if (reason === null) return null;
      if (source.previousSessionFile !== undefined && typeof source.previousSessionFile !== "string") return null;
      return {
        type: expected,
        reason,
        ...(typeof source.previousSessionFile === "string"
          ? { previousSessionFile: source.previousSessionFile }
          : {}),
      };
    }
    case "session_shutdown": {
      const reason = exactString(source.reason, ["quit", "reload", "new", "resume", "fork"] as const);
      if (reason === null) return null;
      if (source.targetSessionFile !== undefined && typeof source.targetSessionFile !== "string") return null;
      return {
        type: expected,
        reason,
        ...(typeof source.targetSessionFile === "string"
          ? { targetSessionFile: source.targetSessionFile }
          : {}),
      };
    }
    case "input": {
      const inputSource = exactString(source.source, ["interactive", "rpc", "extension"] as const);
      if (typeof source.text !== "string" || inputSource === null) return null;
      if (source.images !== undefined && !Array.isArray(source.images)) return null;
      const parsedStreamingBehavior = source.streamingBehavior === undefined
        ? undefined
        : exactString(source.streamingBehavior, ["steer", "followUp"] as const);
      if (parsedStreamingBehavior === null) return null;
      return {
        type: expected,
        text: source.text,
        source: inputSource,
        ...(Array.isArray(source.images) ? { images: source.images } : {}),
        ...(parsedStreamingBehavior === undefined
          ? {}
          : { streamingBehavior: parsedStreamingBehavior }),
      };
    }
    case "agent_start":
    case "agent_settled":
      return { type: expected };
    case "agent_end":
      return Array.isArray(source.messages)
        ? { type: expected, messages: source.messages }
        : null;
    case "tool_execution_start": {
      const toolCallId = nonEmptyString(source.toolCallId);
      const toolName = nonEmptyString(source.toolName);
      return toolCallId === null || toolName === null
        ? null
        : { type: expected, toolCallId, toolName, args: source.args };
    }
    case "tool_execution_end": {
      const toolCallId = nonEmptyString(source.toolCallId);
      const toolName = nonEmptyString(source.toolName);
      return toolCallId === null || toolName === null || typeof source.isError !== "boolean"
        ? null
        : {
            type: expected,
            toolCallId,
            toolName,
            result: source.result,
            isError: source.isError,
          };
    }
    case "session_before_compact": {
      const reason = exactString(source.reason, ["manual", "threshold", "overflow"] as const);
      if (reason === null || typeof source.willRetry !== "boolean" || !Array.isArray(source.branchEntries)) return null;
      return {
        type: expected,
        reason,
        willRetry: source.willRetry,
        preparation: source.preparation,
        branchEntries: source.branchEntries,
      };
    }
    case "session_compact": {
      const reason = exactString(source.reason, ["manual", "threshold", "overflow"] as const);
      const compactionEntry = record(source.compactionEntry);
      if (
        reason === null
        || typeof source.willRetry !== "boolean"
        || typeof source.fromExtension !== "boolean"
        || compactionEntry === null
      ) return null;
      return {
        type: expected,
        reason,
        willRetry: source.willRetry,
        fromExtension: source.fromExtension,
        compactionEntry,
      };
    }
  }
}

function stableValue(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => stableValue(item, seen));
  return Object.fromEntries(
    Object.entries(value as JsonObject)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableValue(item, seen)]),
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function digest(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function safeSessionId(context: PiExtensionContext): string {
  const id = context.sessionManager.getSessionId();
  if (typeof id !== "string" || id.trim().length === 0) throw new Error("Pi session id is unavailable");
  return id;
}

export type PiCanonicalKind =
  | "session-started"
  | "session-shutdown"
  | "input-received"
  | "agent-started"
  | "agent-ended"
  | "agent-settled"
  | "tool-started"
  | "tool-ended"
  | "compaction-started"
  | "compaction-completed";

export interface PiCanonicalEvent {
  readonly schemaVersion: typeof PI_CANONICAL_EVENT_VERSION;
  readonly profile: typeof PI_EXTENSION_PROFILE;
  readonly eventKey: string;
  readonly fingerprint: string;
  readonly kind: PiCanonicalKind;
  readonly sessionIdDigest: string;
  readonly occurredAt: string;
  readonly safe: Readonly<Record<string, string | number | boolean>>;
  readonly sealedPayloadRef: string;
}

export interface CommitSubreceipt {
  readonly status: "completed" | "not-applicable";
  readonly receiptId: string;
}

export interface CanonicalCommitReceipt {
  readonly eventKey: string;
  readonly fingerprint: string;
  readonly disposition: "committed" | "duplicate";
  readonly audit: CommitSubreceipt;
  readonly sensor: CommitSubreceipt;
  readonly stateValidation: CommitSubreceipt;
}

export type CanonicalCommitResult =
  | { readonly ok: true; readonly receipt: CanonicalCommitReceipt }
  | { readonly ok: false; readonly reason: "conflict" | "write-failed"; readonly detail: string };

export interface CanonicalEventCommitPort {
  commitOnce(event: PiCanonicalEvent): Promise<CanonicalCommitResult> | CanonicalCommitResult;
}

type SealedEnvelope = {
  readonly version: 1;
  readonly iv: string;
  readonly ciphertext: string;
  readonly tag: string;
};

function assertNoSymlink(path: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new Error(`refusing symlinked Pi lifecycle path: ${path}`);
  }
}

function writeAtomic(path: string, value: string): void {
  assertNoSymlink(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(temporary, value, { encoding: "utf8", mode: 0o600, flag: "wx" });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
}

class SealedPayloadVault {
  readonly #keyPath: string;
  readonly #journalDir: string;
  #key: Buffer | null = null;

  constructor(runtimeDir: string, journalDir: string) {
    this.#keyPath = join(runtimeDir, "payload.key");
    this.#journalDir = journalDir;
  }

  #loadKey(): Buffer {
    if (this.#key !== null) return this.#key;
    assertNoSymlink(this.#keyPath);
    if (!existsSync(this.#keyPath)) {
      const hasJournal = existsSync(this.#journalDir)
        && lstatSync(this.#journalDir).isDirectory()
        && readFileNames(this.#journalDir).some((name) => name.endsWith(".json"));
      if (hasJournal) throw new Error("Pi payload key is missing while journal records exist");
      writeAtomic(this.#keyPath, randomBytes(32).toString("base64"));
    }
    const key = Buffer.from(readFileSync(this.#keyPath, "utf8").trim(), "base64");
    if (key.length !== 32) throw new Error("Pi payload key is invalid");
    this.#key = key;
    return key;
  }

  seal(value: unknown): SealedEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.#loadKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(stableJson(value), "utf8"),
      cipher.final(),
    ]);
    return {
      version: 1,
      iv: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };
  }

  open(envelope: SealedEnvelope): unknown {
    if (envelope.version !== 1) throw new Error("unsupported Pi sealed payload version");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.#loadKey(),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    ) as unknown;
  }
}

function readFileNames(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

type JournalRecord = {
  readonly version: 1;
  readonly event: PiCanonicalEvent;
  readonly sealedPayload: SealedEnvelope;
  readonly state: "prepared" | "committed";
  readonly receipt?: CanonicalCommitReceipt;
};

export class PiBridgeJournal {
  readonly #projectDir: string;
  readonly #journalDir: string;
  readonly #vault: SealedPayloadVault;

  constructor(projectDir: string) {
    this.#projectDir = resolve(projectDir);
    const runtimeDir = join(this.#projectDir, "amadeus", ".amadeus-sessions", "pi-lifecycle");
    this.#journalDir = join(runtimeDir, "journal");
    assertNoSymlink(runtimeDir);
    assertNoSymlink(this.#journalDir);
    mkdirSync(this.#journalDir, { recursive: true, mode: 0o700 });
    this.#vault = new SealedPayloadVault(runtimeDir, this.#journalDir);
  }

  #path(eventKey: string): string {
    return join(this.#journalDir, `${digest(eventKey)}.json`);
  }

  prepare(event: Omit<PiCanonicalEvent, "sealedPayloadRef">, rawPayload: unknown): PiCanonicalEvent {
    const path = this.#path(event.eventKey);
    const sealedPayloadRef = relative(this.#projectDir, path).split(sep).join("/");
    const complete: PiCanonicalEvent = { ...event, sealedPayloadRef };
    if (existsSync(path)) {
      const prior = this.read(event.eventKey);
      if (prior.event.fingerprint !== event.fingerprint) {
        throw new Error(`Pi event key conflict: ${event.eventKey}`);
      }
      return prior.event;
    }
    writeAtomic(path, `${JSON.stringify({
      version: 1,
      event: complete,
      sealedPayload: this.#vault.seal(rawPayload),
      state: "prepared",
    } satisfies JournalRecord)}\n`);
    return complete;
  }

  read(eventKey: string): JournalRecord {
    const path = this.#path(eventKey);
    assertNoSymlink(path);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as JournalRecord;
    if (parsed.version !== 1 || parsed.event.eventKey !== eventKey) {
      throw new Error(`invalid Pi journal record for ${eventKey}`);
    }
    this.#vault.open(parsed.sealedPayload);
    return parsed;
  }

  commit(eventKey: string, receipt: CanonicalCommitReceipt): void {
    const path = this.#path(eventKey);
    const prior = this.read(eventKey);
    if (prior.event.fingerprint !== receipt.fingerprint) throw new Error(`Pi receipt conflict: ${eventKey}`);
    writeAtomic(path, `${JSON.stringify({ ...prior, state: "committed", receipt } satisfies JournalRecord)}\n`);
  }

  prepared(sessionIdDigest?: string): JournalRecord[] {
    const records: JournalRecord[] = [];
    for (const name of readFileNames(this.#journalDir).filter((item) => item.endsWith(".json")).sort()) {
      const path = join(this.#journalDir, name);
      assertNoSymlink(path);
      const raw = JSON.parse(readFileSync(path, "utf8")) as JournalRecord;
      if (raw.version !== 1 || raw.event?.eventKey === undefined) throw new Error(`invalid Pi journal record: ${name}`);
      const verified = this.read(raw.event.eventKey);
      if (
        verified.state === "prepared"
        && (sessionIdDigest === undefined || verified.event.sessionIdDigest === sessionIdDigest)
      ) records.push(verified);
    }
    return records;
  }

  sealLocal(value: unknown): SealedEnvelope {
    return this.#vault.seal(value);
  }

  openLocal(envelope: SealedEnvelope): unknown {
    return this.#vault.open(envelope);
  }
}

type HealthState = {
  readonly version: 1;
  readonly state: "healthy" | "blocked";
  readonly sessionIdDigest: string;
  readonly reason?: string;
  readonly failedEventKey?: string;
  readonly updatedAt: string;
};

export class ExtensionHealthLatch {
  readonly #path: string;
  readonly #currentSessionIdDigest: string;
  #state: HealthState;

  constructor(projectDir: string, sessionIdDigest: string) {
    this.#path = join(projectDir, "amadeus", ".amadeus-sessions", "pi-lifecycle", "health.json");
    this.#currentSessionIdDigest = sessionIdDigest;
    if (existsSync(this.#path)) {
      assertNoSymlink(this.#path);
      const persisted = JSON.parse(readFileSync(this.#path, "utf8")) as HealthState;
      this.#state = persisted.version === 1
        && (persisted.sessionIdDigest === sessionIdDigest || persisted.state === "blocked")
        ? persisted
        : {
            version: 1,
            state: "healthy",
            sessionIdDigest,
            updatedAt: isoTimestamp(),
          };
    } else {
      this.#state = {
        version: 1,
        state: "healthy",
        sessionIdDigest,
        updatedAt: isoTimestamp(),
      };
    }
  }

  get blocked(): boolean {
    return this.#state.state === "blocked";
  }

  block(reason: string, failedEventKey?: string): void {
    this.#state = {
      version: 1,
      state: "blocked",
      sessionIdDigest: this.#state.sessionIdDigest,
      reason,
      ...(failedEventKey === undefined ? {} : { failedEventKey }),
      updatedAt: isoTimestamp(),
    };
    writeAtomic(this.#path, `${JSON.stringify(this.#state)}\n`);
  }

  reconciled(): void {
    if (!this.blocked) return;
    if (this.#state.failedEventKey === undefined) {
      throw new Error("Pi health latch has no replayable failed event");
    }
    if (this.#state.sessionIdDigest !== this.#currentSessionIdDigest) {
      throw new Error("cannot reconcile a Pi health latch from a different session epoch");
    }
    this.#state = {
      version: 1,
      state: "healthy",
      sessionIdDigest: this.#state.sessionIdDigest,
      updatedAt: isoTimestamp(),
    };
    writeAtomic(this.#path, `${JSON.stringify(this.#state)}\n`);
  }

  snapshot(): Readonly<HealthState> {
    return { ...this.#state };
  }
}

type PersistedCoreReceipt = {
  readonly version: 1;
  readonly receipt: CanonicalCommitReceipt;
};

function auditMapping(
  event: PiCanonicalEvent,
  projectDir: string,
  core: CoreRuntime,
): { event: string; fields: Record<string, string> } | null {
  switch (event.kind) {
    case "session-started": {
      const resumed = ["reload", "resume", "fork"].includes(String(event.safe.reason));
      return { event: resumed ? "SESSION_RESUMED" : "SESSION_STARTED", fields: { Source: String(event.safe.reason) } };
    }
    case "session-shutdown":
      return { event: "SESSION_ENDED", fields: { Reason: String(event.safe.reason) } };
    case "input-received":
      return event.safe.source === "interactive" ? { event: "HUMAN_TURN", fields: {} } : null;
    case "compaction-started": {
      const state = readStateValidity(projectDir, core);
      return {
        event: "SESSION_COMPACTED",
        fields: { "Current Stage": state.stage, "State Validity": state.validity },
      };
    }
    default:
      return null;
  }
}

function readStateValidity(projectDir: string, core: CoreRuntime): { stage: string; validity: "valid" | "invalid" } {
  const path = core.stateFilePath(projectDir);
  if (!existsSync(path)) return { stage: "none", validity: "invalid" };
  const content = readFileSync(path, "utf8");
  const valid = content.includes("## Stage Progress") && content.includes("## Current Status");
  return { stage: core.getField(content, "Current Stage") ?? "unknown", validity: valid ? "valid" : "invalid" };
}

function existingAuditIdentity(projectDir: string, eventKey: string, core: CoreRuntime): string | null {
  for (const line of core.readAllAuditShards(projectDir).split("\n")) {
    if (line.trim().length === 0) continue;
    try {
      const row = JSON.parse(line) as { idempotencyKey?: unknown; eventId?: unknown };
      if (row.idempotencyKey === eventKey) return typeof row.eventId === "string" ? row.eventId : "";
    } catch {
      // Mixed legacy shards are ignored; the current canonical writer is JSONL.
    }
  }
  return null;
}

export class DefaultCanonicalEventCommitPort implements CanonicalEventCommitPort {
  readonly #projectDir: string;
  readonly #receiptDir: string;

  constructor(projectDir: string) {
    this.#projectDir = resolve(projectDir);
    this.#receiptDir = join(this.#projectDir, "amadeus", ".amadeus-sessions", "pi-lifecycle", "receipts");
    mkdirSync(this.#receiptDir, { recursive: true, mode: 0o700 });
  }

  #path(eventKey: string): string {
    return join(this.#receiptDir, `${digest(eventKey)}.json`);
  }

  async commitOnce(event: PiCanonicalEvent): Promise<CanonicalCommitResult> {
    try {
      const core = await loadCoreRuntime();
      return core.withAuditLock(this.#projectDir, () => {
        const path = this.#path(event.eventKey);
        if (existsSync(path)) {
          const prior = (JSON.parse(readFileSync(path, "utf8")) as PersistedCoreReceipt).receipt;
          if (prior.fingerprint !== event.fingerprint) {
            return { ok: false, reason: "conflict", detail: `event key reused with a different fingerprint: ${event.eventKey}` };
          }
          return { ok: true, receipt: { ...prior, disposition: "duplicate" } };
        }

        const expectedAuditEventId = `pi:${event.fingerprint}`;
        const mapping = auditMapping(event, this.#projectDir, core);
        const existing = existingAuditIdentity(this.#projectDir, event.eventKey, core);
        if (existing !== null && existing !== expectedAuditEventId) {
          return { ok: false, reason: "conflict", detail: `audit identity conflicts for ${event.eventKey}` };
        }

        let audit: CommitSubreceipt = {
          status: "not-applicable",
          receiptId: `audit:na:${event.eventKey}`,
        };
        if (mapping !== null) {
          if (existing === null) {
            const space = core.activeSpace(this.#projectDir);
            const intent = core.activeIntent(this.#projectDir, space) ?? "workspace";
            const definition = core.getEventDefByAuditEvent(mapping.event);
            const outcome = core.appendJournalRecordV2({
              schemaVersion: core.journalSchemaVersionV2,
              eventId: expectedAuditEventId,
              timestamp: isoTimestamp(),
              eventName: definition.name,
              attributes: { ...mapping.fields, Event: mapping.event },
              intentId: intent,
              space,
              cloneId: core.auditCloneId(this.#projectDir),
              traceId: null,
              spanId: null,
              traceFlags: 0,
              idempotencyKey: event.eventKey,
              canonical: true,
            }, this.#projectDir);
            if (!outcome.appended) throw new Error(`audit append suppressed: ${outcome.reason}`);
          }
          audit = { status: "completed", receiptId: `audit:${event.eventKey}` };
        }

        let stateValidation: CommitSubreceipt = {
          status: "not-applicable",
          receiptId: `state:na:${event.eventKey}`,
        };
        if (event.kind === "compaction-started") {
          const state = readStateValidity(this.#projectDir, core);
          writeAtomic(
            core.recoveryFilePath(this.#projectDir),
            `# AIDLC Recovery Breadcrumb\n**Last validated**: ${isoTimestamp()}\n**Current stage**: ${state.stage}\n**State file**: ${state.validity}\n`,
          );
          stateValidation = { status: "completed", receiptId: `state:${event.eventKey}` };
        }

        const receipt: CanonicalCommitReceipt = {
          eventKey: event.eventKey,
          fingerprint: event.fingerprint,
          disposition: existing === null ? "committed" : "duplicate",
          audit,
          sensor: { status: "not-applicable", receiptId: `sensor:na:${event.eventKey}` },
          stateValidation,
        };
        writeAtomic(path, `${JSON.stringify({ version: 1, receipt } satisfies PersistedCoreReceipt)}\n`);
        return { ok: true, receipt };
      });
    } catch (error) {
      return { ok: false, reason: "write-failed", detail: String(error) };
    }
  }
}

type ToolFlight = {
  readonly toolName: string;
  readonly argsDigest: string;
};

type OutboxStatus = "prepared" | "entry-appended" | "turn-observed" | "blocked-ambiguous";

type OutboxRecord = {
  readonly version: 1;
  readonly token: string;
  readonly sessionIdDigest: string;
  readonly status: OutboxStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

class PiContinuationOutbox {
  readonly #path: string;
  readonly #sessionIdDigest: string;
  #activeToken: string | null = null;

  constructor(projectDir: string, sessionIdDigest: string) {
    this.#path = join(
      projectDir,
      "amadeus",
      ".amadeus-sessions",
      "pi-lifecycle",
      `continuation-outbox-${sessionIdDigest.slice(0, 24)}.json`,
    );
    this.#sessionIdDigest = sessionIdDigest;
  }

  read(): OutboxRecord | null {
    if (!existsSync(this.#path)) return null;
    assertNoSymlink(this.#path);
    const value = JSON.parse(readFileSync(this.#path, "utf8")) as OutboxRecord;
    if (value.version !== 1 || value.sessionIdDigest !== this.#sessionIdDigest) return null;
    return value;
  }

  prepare(): OutboxRecord {
    const prior = this.read();
    if (prior !== null && prior.status !== "turn-observed") {
      const blocked = { ...prior, status: "blocked-ambiguous" as const, updatedAt: isoTimestamp() };
      writeAtomic(this.#path, `${JSON.stringify(blocked)}\n`);
      throw new Error(`ambiguous Pi continuation outbox token ${prior.token}`);
    }
    const token = randomBytes(24).toString("base64url");
    const next: OutboxRecord = {
      version: 1,
      token,
      sessionIdDigest: this.#sessionIdDigest,
      status: "prepared",
      createdAt: isoTimestamp(),
      updatedAt: isoTimestamp(),
    };
    writeAtomic(this.#path, `${JSON.stringify(next)}\n`);
    this.#activeToken = token;
    return next;
  }

  entryAppended(token: string): void {
    const prior = this.read();
    if (prior === null || prior.token !== token || prior.status !== "prepared") throw new Error("invalid Pi outbox append transition");
    writeAtomic(this.#path, `${JSON.stringify({ ...prior, status: "entry-appended", updatedAt: isoTimestamp() })}\n`);
  }

  observeAgentStart(entries: readonly PiSessionEntry[]): boolean {
    const prior = this.read();
    if (
      prior === null
      || prior.status !== "entry-appended"
      || this.#activeToken !== prior.token
      || !entries.some((entry) => {
        const details = record(entry.details);
        return entry.type === "custom_message"
          && entry.customType === "amadeus-continuation"
          && details?.token === prior.token;
      })
    ) return false;
    writeAtomic(this.#path, `${JSON.stringify({ ...prior, status: "turn-observed", updatedAt: isoTimestamp() })}\n`);
    this.#activeToken = null;
    return true;
  }

  reconcile(entries: readonly PiSessionEntry[]): void {
    const prior = this.read();
    if (prior === null || prior.status === "turn-observed" || prior.status === "blocked-ambiguous") return;
    const tokenExists = entries.some((entry) => {
      const details = record(entry.details) ?? record(entry.data);
      return details?.token === prior.token;
    });
    if (tokenExists || prior.status === "entry-appended") {
      writeAtomic(this.#path, `${JSON.stringify({ ...prior, status: "blocked-ambiguous", updatedAt: isoTimestamp() })}\n`);
      throw new Error(`Pi continuation effect is ambiguous for token ${prior.token}`);
    }
  }
}

async function continuationMessage(projectDir: string): Promise<string | null> {
  const core = await loadCoreRuntime();
  const path = core.stateFilePath(projectDir);
  if (!existsSync(path)) return null;
  const state = readFileSync(path, "utf8");
  if (core.getField(state, "Status") !== "Running") return null;
  const stage = core.getField(state, "Current Stage") ?? "unknown";
  return `The AIDLC workflow has a pending step (${stage}). Run \`bun .pi/tools/amadeus-orchestrate.ts next\`, act on its directive, and report the result. Complete only the declared conditions.`;
}

type MissionCheckpoint = {
  readonly version: 1;
  readonly sessionIdDigest: string;
  readonly sealed: SealedEnvelope;
};

const MAX_MISSION_BYTES = 64 * 1024;

class PiMissionRecovery {
  readonly #path: string;
  readonly #vault: Pick<SealedPayloadVault, "seal" | "open">;
  readonly #sessionIdDigest: string;

  constructor(projectDir: string, journal: PiBridgeJournal, sessionIdDigest: string) {
    const runtimeDir = join(projectDir, "amadeus", ".amadeus-sessions", "pi-lifecycle");
    this.#path = join(runtimeDir, `mission-checkpoint-${sessionIdDigest.slice(0, 24)}.json`);
    this.#vault = {
      seal: (value: unknown) => journal.sealLocal(value),
      open: (envelope: SealedEnvelope) => journal.openLocal(envelope),
    };
    this.#sessionIdDigest = sessionIdDigest;
  }

  checkpoint(mission: string | null): void {
    if (mission === null) return;
    if (Buffer.byteLength(mission, "utf8") > MAX_MISSION_BYTES) throw new Error("Pi mission checkpoint exceeds the bounded size");
    const payload: MissionCheckpoint = {
      version: 1,
      sessionIdDigest: this.#sessionIdDigest,
      sealed: this.#vault.seal({ mission }),
    };
    writeAtomic(this.#path, `${JSON.stringify(payload)}\n`);
  }

  mission(): string | null {
    if (!existsSync(this.#path)) return null;
    const payload = JSON.parse(readFileSync(this.#path, "utf8")) as MissionCheckpoint;
    if (payload.version !== 1 || payload.sessionIdDigest !== this.#sessionIdDigest) return null;
    const opened = record(this.#vault.open(payload.sealed));
    return typeof opened?.mission === "string" ? opened.mission : null;
  }
}

type RegistrationGate = { open: boolean };

export interface AmadeusPiExtensionOptions {
  readonly commitPort?: CanonicalEventCommitPort;
}

const REGISTERED_APIS = new WeakSet<object>();

function eventKind(event: ParsedPi083Event): PiCanonicalKind {
  switch (event.type) {
    case "session_start": return "session-started";
    case "session_shutdown": return "session-shutdown";
    case "input": return "input-received";
    case "agent_start": return "agent-started";
    case "agent_end": return "agent-ended";
    case "agent_settled": return "agent-settled";
    case "tool_execution_start": return "tool-started";
    case "tool_execution_end": return "tool-ended";
    case "session_before_compact": return "compaction-started";
    case "session_compact": return "compaction-completed";
  }
}

function safeFacts(event: ParsedPi083Event): Record<string, string | number | boolean> {
  switch (event.type) {
    case "session_start": return { reason: event.reason };
    case "session_shutdown": return { reason: event.reason };
    case "input": return { source: event.source, textDigest: digest(event.text), imageCount: event.images?.length ?? 0 };
    case "agent_start":
    case "agent_settled": return {};
    case "agent_end": return { messageCount: event.messages.length };
    case "tool_execution_start": return { toolCallIdDigest: digest(event.toolCallId), toolName: event.toolName, argsDigest: digest(event.args) };
    case "tool_execution_end": return { toolCallIdDigest: digest(event.toolCallId), toolName: event.toolName, resultDigest: digest(event.result), isError: event.isError };
    case "session_before_compact": return { reason: event.reason, willRetry: event.willRetry };
    case "session_compact": return {
      reason: event.reason,
      willRetry: event.willRetry,
      fromExtension: event.fromExtension,
      compactionEntryIdDigest: digest(event.compactionEntry.id ?? "missing"),
    };
  }
}

function eventIdentity(event: ParsedPi083Event, context: PiExtensionContext): string {
  const leaf = context.sessionManager.getLeafId() ?? "empty";
  switch (event.type) {
    case "tool_execution_start": return `tool:${digest(event.toolCallId)}:start`;
    case "tool_execution_end": return `tool:${digest(event.toolCallId)}:end`;
    case "session_start": return `session-start:${event.reason}`;
    case "session_shutdown": return `session-shutdown:${event.reason}`;
    case "input": return `input:${leaf}:${digest({ text: event.text, source: event.source, images: event.images })}`;
    case "agent_start": return `agent:${leaf}:start`;
    case "agent_end": return `agent:${leaf}:end`;
    case "agent_settled": return `agent:${leaf}:settled`;
    case "session_before_compact": return `compact:before:${digest(event)}`;
    case "session_compact": return `compact:after:${String(event.compactionEntry.id ?? digest(event.compactionEntry))}`;
  }
}

export function createAmadeusPiExtension(options: AmadeusPiExtensionOptions = {}) {
  return function amadeusPiExtension(pi: PiExtensionApi): void {
    if (REGISTERED_APIS.has(pi as object)) throw new Error("Amadeus Pi extension is already registered on this API instance");
    REGISTERED_APIS.add(pi as object);

    const registrationGate: RegistrationGate = { open: false };
    let initialized: {
      projectDir: string;
      sessionIdDigest: string;
      journal: PiBridgeJournal;
      health: ExtensionHealthLatch;
      commitPort: CanonicalEventCommitPort;
      outbox: PiContinuationOutbox;
      mission: PiMissionRecovery;
      tools: Map<string, ToolFlight>;
    } | null = null;
    let serialized = Promise.resolve();

    function runtime(context: PiExtensionContext, sessionStart: boolean) {
      const observedSessionIdDigest = digest(safeSessionId(context));
      if (initialized !== null) {
        if (initialized.projectDir !== resolve(context.cwd)) throw new Error("Pi extension cwd changed without session replacement");
        if (initialized.sessionIdDigest === observedSessionIdDigest) return initialized;
        if (!sessionStart) throw new Error("Pi session changed before session_start");
      }
      const projectDir = resolve(context.cwd);
      const sessionIdDigest = observedSessionIdDigest;
      const journal = new PiBridgeJournal(projectDir);
      const health = new ExtensionHealthLatch(projectDir, sessionIdDigest);
      const outbox = new PiContinuationOutbox(projectDir, sessionIdDigest);
      initialized = {
        projectDir,
        sessionIdDigest,
        journal,
        health,
        commitPort: options.commitPort ?? new DefaultCanonicalEventCommitPort(projectDir),
        outbox,
        mission: new PiMissionRecovery(projectDir, journal, sessionIdDigest),
        tools: new Map(),
      };
      return initialized;
    }

    async function commit(expected: Pi083EventName, raw: unknown, context: PiExtensionContext): Promise<void> {
      if (!registrationGate.open) return;
      const current = runtime(context, expected === "session_start");
      if (current.health.blocked && expected !== "session_start") return;
      const parsed = parsePi083Event(expected, raw);
      if (parsed === null) {
        current.health.block(`Pi ${PI_EXTENSION_PROFILE} payload rejected for ${expected}`);
        return;
      }

      if (parsed.type === "tool_execution_start" && current.tools.has(parsed.toolCallId)) {
        current.health.block(`duplicate active Pi tool call ${digest(parsed.toolCallId)}`);
        return;
      }
      if (parsed.type === "tool_execution_end") {
        const start = current.tools.get(parsed.toolCallId);
        if (start === undefined || start.toolName !== parsed.toolName) {
          current.health.block(`unmatched Pi tool end ${digest(parsed.toolCallId)}`);
          return;
        }
      }

      const identity = eventIdentity(parsed, context);
      const eventKey = `pi:v${PI_CANONICAL_EVENT_VERSION}:${current.sessionIdDigest}:${identity}`;
      const facts = safeFacts(parsed);
      const eventFingerprint = digest({ kind: eventKind(parsed), facts });
      try {
        const canonical = current.journal.prepare({
          schemaVersion: PI_CANONICAL_EVENT_VERSION,
          profile: PI_EXTENSION_PROFILE,
          eventKey,
          fingerprint: eventFingerprint,
          kind: eventKind(parsed),
          sessionIdDigest: current.sessionIdDigest,
          occurredAt: isoTimestamp(),
          safe: facts,
        }, parsed);
        const result = await current.commitPort.commitOnce(canonical);
        if (!result.ok) throw new Error(`${result.reason}: ${result.detail}`);
        current.journal.commit(eventKey, result.receipt);

        if (parsed.type === "tool_execution_start") {
          current.tools.set(parsed.toolCallId, { toolName: parsed.toolName, argsDigest: digest(parsed.args) });
        } else if (parsed.type === "tool_execution_end") {
          current.tools.delete(parsed.toolCallId);
        } else if (parsed.type === "agent_start") {
          current.outbox.observeAgentStart(context.sessionManager.getEntries());
        } else if (parsed.type === "session_before_compact") {
          current.mission.checkpoint(await continuationMessage(current.projectDir));
        } else if (parsed.type === "session_compact") {
          const mission = current.mission.mission();
          if (mission !== null) {
            pi.sendMessage({
              customType: "amadeus-mission-recovery",
              content: mission,
              display: false,
              details: { sessionIdDigest: current.sessionIdDigest },
            }, { triggerTurn: false });
          }
        } else if (parsed.type === "agent_settled") {
          const message = await continuationMessage(current.projectDir);
          if (message !== null) {
            const pending = current.outbox.prepare();
            pi.appendEntry("amadeus-continuation-outbox", {
              token: pending.token,
              status: "prepared",
              sessionIdDigest: current.sessionIdDigest,
            });
            current.outbox.entryAppended(pending.token);
            pi.sendMessage({
              customType: "amadeus-continuation",
              content: message,
              display: false,
              details: { token: pending.token, sessionIdDigest: current.sessionIdDigest },
            }, { triggerTurn: true, deliverAs: "nextTurn" });
          }
        } else if (parsed.type === "session_start") {
          current.outbox.reconcile(context.sessionManager.getEntries());
          for (const pending of current.journal.prepared(current.sessionIdDigest)) {
            const result = await current.commitPort.commitOnce(pending.event);
            if (!result.ok) throw new Error(`journal reconciliation failed: ${result.detail}`);
            current.journal.commit(pending.event.eventKey, result.receipt);
          }
          current.health.reconciled();
        }
      } catch (error) {
        current.health.block(String(error), eventKey);
        context.ui?.notify("Amadeus Pi lifecycle adapter blocked; run doctor for details.", "error");
      }
    }

    function handler(name: Pi083EventName): PiExtensionHandler {
      return (event, context) => {
        serialized = serialized.then(() => commit(name, event, context));
        return serialized;
      };
    }

    try {
      for (const eventName of PI_083_EVENT_NAMES) pi.on(eventName, handler(eventName));
      registrationGate.open = true;
    } catch (error) {
      registrationGate.open = false;
      throw new Error(`Amadeus Pi extension registration failed closed: ${String(error)}`);
    }
  };
}

export default createAmadeusPiExtension();
