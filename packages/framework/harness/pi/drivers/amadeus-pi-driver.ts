// One-parent/one-child Pi RPC execution driver.

import { createHash, generateKeyPairSync, randomUUID, sign, verify, type KeyObject } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { lstatSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { AttemptStart, Clock } from "../../../core/tools/amadeus-execution-contract.ts";
import type { ExecutionLifecycleCoordinator } from "../../../core/tools/amadeus-execution-lifecycle.ts";
import {
  createPiRpcCollector,
  fingerprintPiRequest,
  parsePiChildRequest,
  type PiChildRequest,
} from "./amadeus-pi-driver-contract.ts";
import {
  createPiReplayStore,
  type PiReplayStore,
  type PiTerminalRecord,
} from "./amadeus-pi-replay-store.ts";

const DRIVER_DIR = dirname(fileURLToPath(import.meta.url));
const GUARDIAN_PATH = join(DRIVER_DIR, "amadeus-pi-guardian.ts");
const MINIMUM_PI_VERSION = [0, 83, 0] as const;
const STDERR_LIMIT_BYTES = 256 * 1024;
const ENVELOPE_LINE_LIMIT_BYTES = 1024 * 1024 + 32 * 1024;
const CLEANUP_WAIT_MS = 2_000;

type ConvergenceModule = typeof import("../../../core/tools/amadeus-convergence-policy.ts");
type LifecycleModule = typeof import("../../../core/tools/amadeus-execution-lifecycle.ts");
type ProjectionModule = typeof import("../../../core/tools/amadeus-execution-projection.ts");

interface PiCoreModules {
  readonly convergence: ConvergenceModule;
  readonly lifecycle: LifecycleModule;
  readonly projection: ProjectionModule;
}

async function loadPiCoreModules(): Promise<PiCoreModules> {
  const toolsRoot = import.meta.url.includes("/packages/framework/harness/pi/")
    ? "../../../core/tools/"
    : "../tools/";
  const [convergence, lifecycle, projection] = await Promise.all([
    import(new URL(`${toolsRoot}amadeus-convergence-policy.ts`, import.meta.url).href) as Promise<ConvergenceModule>,
    import(new URL(`${toolsRoot}amadeus-execution-lifecycle.ts`, import.meta.url).href) as Promise<LifecycleModule>,
    import(new URL(`${toolsRoot}amadeus-execution-projection.ts`, import.meta.url).href) as Promise<ProjectionModule>,
  ]);
  return { convergence, lifecycle, projection };
}

interface ExecutableSnapshot {
  readonly path: string;
  readonly argv0: string;
  readonly version: string;
  readonly platform: "darwin" | "linux";
  readonly bunVersion: string;
  readonly device: number;
  readonly inode: number;
  readonly size: number;
  readonly mtimeMs: number;
  readonly digest: string;
}

interface GuardianReady {
  readonly kind: "ready";
  readonly runId: string;
  readonly pid: number;
  readonly pgid: number;
  readonly nonce: string;
  readonly publicKey: string;
  readonly snapshotDigest: string;
  readonly seq: number;
}

interface GuardianEnvelope {
  readonly payload: Record<string, unknown>;
  readonly signature: string;
}

export type PiChildDriverResult =
  | {
      readonly kind: "succeeded";
      readonly output: string;
      readonly replayed: boolean;
      readonly providerId?: string;
      readonly modelId?: string;
    }
  | {
      readonly kind: "failed" | "cancelled" | "timed-out" | "dispatch-not-started";
      readonly reason: string;
      readonly output: string;
      readonly replayed: boolean;
    }
  | {
      readonly kind: "conflict" | "in-progress" | "quarantined" | "visibility-failure" | "key-loss" | "vault-tampered";
      readonly reason: string;
      readonly replayed: true;
    };

export interface PiDriverOptions {
  readonly runtimeDir?: string;
  readonly piExecutable?: string;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly guardianPath?: string;
  readonly replayStore?: PiReplayStore;
  readonly lifecycle?: ExecutionLifecycleCoordinator;
  readonly clock?: Clock;
  readonly abortSignal?: AbortSignal;
  readonly now?: () => string;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function parseVersion(value: string): readonly [number, number, number] | null {
  const match = /(?:^|\s)(\d+)\.(\d+)\.(\d+)(?:\s|$)/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function versionAtLeast(version: readonly number[], minimum: readonly number[]): boolean {
  for (let index = 0; index < minimum.length; index += 1) {
    if ((version[index] ?? 0) > (minimum[index] ?? 0)) return true;
    if ((version[index] ?? 0) < (minimum[index] ?? 0)) return false;
  }
  return true;
}

function captureExecutableSnapshot(configuredPath?: string): ExecutableSnapshot | null {
  if (process.platform !== "darwin" && process.platform !== "linux") return null;
  const selected = configuredPath ?? Bun.which("pi");
  if (!selected) return null;
  const launchPath = resolve(selected);
  let exactPath: string;
  try {
    const launch = lstatSync(launchPath);
    if (!launch.isFile() && !launch.isSymbolicLink()) return null;
    exactPath = realpathSync(launchPath);
    const target = lstatSync(exactPath);
    if (!target.isFile() || target.isSymbolicLink()) return null;
  } catch {
    return null;
  }
  const probe = spawnSync(exactPath, ["--version"], {
    argv0: launchPath,
    cwd: process.cwd(),
    shell: false,
    encoding: "utf8",
    timeout: 5_000,
  });
  if (probe.status !== 0 || probe.error) return null;
  const versionText = `${probe.stdout ?? ""}`.trim();
  const parsed = parseVersion(versionText);
  if (parsed === null || !versionAtLeast(parsed, MINIMUM_PI_VERSION)) return null;
  const stats = statSync(exactPath);
  const snapshot = {
    path: exactPath,
    argv0: launchPath,
    version: versionText,
    platform: process.platform,
    bunVersion: Bun.version,
    device: stats.dev,
    inode: stats.ino,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
  } as const;
  return { ...snapshot, digest: digest(snapshot) };
}

function sameExecutableSnapshot(expected: ExecutableSnapshot): boolean {
  const observed = captureExecutableSnapshot(expected.argv0);
  return observed !== null && observed.digest === expected.digest;
}

function defaultClock(): Clock {
  return {
    wallNow: () => new Date().toISOString(),
    monotonicNowMs: () => performance.now(),
  };
}

function runtimeDirFor(projectDir: string): string {
  const projectKey = createHash("sha256").update(realpathSync(projectDir)).digest("hex").slice(0, 24);
  return join(homedir(), ".local", "state", "amadeus", "pi-driver", projectKey);
}

function isGuardianReady(payload: Record<string, unknown>): payload is Record<string, unknown> & GuardianReady {
  return (
    payload.kind === "ready" &&
    typeof payload.runId === "string" &&
    typeof payload.pid === "number" &&
    Number.isSafeInteger(payload.pid) &&
    payload.pid > 0 &&
    typeof payload.pgid === "number" &&
    Number.isSafeInteger(payload.pgid) &&
    payload.pgid > 0 &&
    typeof payload.nonce === "string" &&
    typeof payload.publicKey === "string" &&
    typeof payload.snapshotDigest === "string" &&
    payload.seq === 1
  );
}

function parseEnvelope(line: string): GuardianEnvelope | null {
  if (Buffer.byteLength(line, "utf8") > ENVELOPE_LINE_LIMIT_BYTES) return null;
  try {
    const value: unknown = JSON.parse(line);
    if (!isRecord(value) || !isRecord(value.payload) || typeof value.signature !== "string") return null;
    return { payload: value.payload, signature: value.signature };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value && typeof value.code === "string";
}

export function parsePiDriverInput(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function verifyEnvelope(envelope: GuardianEnvelope, publicKey: string): boolean {
  try {
    return verify(
      null,
      Buffer.from(JSON.stringify(envelope.payload), "utf8"),
      publicKey,
      Buffer.from(envelope.signature, "base64"),
    );
  } catch {
    return false;
  }
}

function signedControl(payload: Record<string, unknown>, privateKey: KeyObject): string {
  return `${JSON.stringify({
    payload,
    signature: sign(null, Buffer.from(JSON.stringify(payload), "utf8"), privateKey).toString("base64"),
  })}\n`;
}

function mapReplay(record: { readonly terminal?: PiTerminalRecord }, output: string): PiChildDriverResult {
  const terminal = record.terminal;
  if (!terminal) return { kind: "quarantined", reason: "terminal-record-invalid", replayed: true };
  if (terminal.kind === "succeeded") {
    return {
      kind: "succeeded",
      output,
      replayed: true,
      ...(terminal.providerId === undefined ? {} : { providerId: terminal.providerId }),
      ...(terminal.modelId === undefined ? {} : { modelId: terminal.modelId }),
    };
  }
  return { kind: terminal.kind, reason: terminal.reason, output, replayed: true };
}

interface LifecycleStart {
  readonly operationStart: ReturnType<ExecutionLifecycleCoordinator["startOperation"]>;
  readonly reservationId: string;
}

function prepareLifecycle(
  request: PiChildRequest,
  lifecycle: ExecutionLifecycleCoordinator,
  createBudgetPolicy: ConvergenceModule["createBudgetPolicy"],
): LifecycleStart | null {
  const operationStart = lifecycle.startOperation({
    idempotencyKey: `${request.deliveryKey}:operation`,
    parent: request.parentExecution,
    childInput: {
      childKind: `pi-${request.role}`,
      semanticSubjectId: request.deliveryKey,
      childOrdinal: request.childOrdinal,
      origin: { stage: "code-generation", agent: "amadeus-developer-agent", tool: "amadeus-pi-driver" },
    },
  });
  if (!operationStart.ok) return null;
  const policy = createBudgetPolicy({
    kind: "unit-attempt",
    effectiveCap: 1,
    hardCap: 1,
    configVersion: "pi-child-driver-v1",
  });
  if (!policy.ok) return null;
  const reservation = lifecycle.reserveExecution({
    operationId: operationStart.value.operation.operationId,
    idempotencyKey: `${request.deliveryKey}:reservation`,
    budgetKind: "unit-attempt",
    subjectId: request.deliveryKey,
    semanticAttemptOrdinal: request.childOrdinal,
    policy: policy.value,
    lastDurableProgress: "pi-launch-intent",
  });
  if (!reservation.ok) return null;
  const claimed = lifecycle.claimDispatch(reservation.value.reservationId, `${request.deliveryKey}:claim`);
  if (claimed.kind !== "claimed" && claimed.kind !== "idempotent") return null;
  const permit = lifecycle.issueStartPermit({
    reservationId: reservation.value.reservationId,
    canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
  });
  if (!permit.ok) return null;
  return { operationStart, reservationId: reservation.value.reservationId };
}

function groupExtinct(pgid: number): boolean {
  try {
    process.kill(-pgid, 0);
    return false;
  } catch (error) {
    return isErrnoException(error) && error.code === "ESRCH";
  }
}

function writeGuardianControl(stdin: { write(value: string): boolean }, value: string): boolean {
  try {
    stdin.write(value);
    return true;
  } catch {
    return false;
  }
}

interface LiveRunResult {
  readonly output: string;
  readonly reason: string | null;
  readonly termination: "normal" | "cancelled" | "timed-out";
  readonly cleanupOk: boolean;
  readonly attemptStart: AttemptStart | null;
  readonly providerId?: string;
  readonly modelId?: string;
}

async function runGuardian(
  request: PiChildRequest,
  snapshot: ExecutableSnapshot,
  store: PiReplayStore,
  lifecycle: ExecutionLifecycleCoordinator,
  lifecycleStart: LifecycleStart,
  fingerprint: string,
  options: PiDriverOptions,
): Promise<LiveRunResult> {
  const runId = randomUUID();
  const correlationId = `amadeus-${runId}`;
  const driverKeys = generateKeyPairSync("ed25519");
  const driverPublicKey = driverKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
  const guardian = spawn(
    process.execPath,
    [
      options.guardianPath ?? GUARDIAN_PATH,
      "--pi-executable",
      snapshot.path,
      "--pi-argv0",
      snapshot.argv0,
      "--run-id",
      runId,
      "--driver-public-key",
      Buffer.from(driverPublicKey, "utf8").toString("base64"),
      "--snapshot-digest",
      snapshot.digest,
      "--stdout-limit-bytes",
      String(request.outputLimitBytes + 8 * 1024 * 1024),
      "--stderr-limit-bytes",
      String(STDERR_LIMIT_BYTES),
      ...(options.providerId === undefined ? [] : ["--provider-id", options.providerId]),
      ...(options.modelId === undefined ? [] : ["--model-id", options.modelId]),
    ],
    {
      cwd: request.projectDir,
      shell: false,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const collector = createPiRpcCollector(correlationId, request.outputLimitBytes);
  let accepted: GuardianReady | null = null;
  let acceptedPgid: number | null = null;
  let guardianKey: string | null = null;
  let envelopeSeq = 0;
  let reason: string | null = null;
  let termination: LiveRunResult["termination"] = "normal";
  let attemptStart: AttemptStart | null = null;
  let exitSeen = false;
  let closed = false;

  const failFirst = (value: string): void => {
    if (reason === null) reason = value;
  };
  guardian.stdin.once("error", () => {
    failFirst("guardian-control-write-failed");
    guardian.kill("SIGKILL");
  });
  const writeControl = (value: string): void => {
    if (writeGuardianControl(guardian.stdin, value)) return;
    failFirst("guardian-control-write-failed");
    guardian.kill("SIGKILL");
  };
  const sendTerminate = (kind: "cancelled" | "timed-out" | "driver-refused"): void => {
    if (accepted === null) {
      guardian.kill("SIGKILL");
      return;
    }
    writeControl(signedControl({
      kind: "terminate",
      runId,
      nonce: accepted.nonce,
      seq: 2,
      reason: kind,
    }, driverKeys.privateKey));
  };

  const done = new Promise<void>((resolve) => {
    guardian.once("close", () => {
      closed = true;
      resolve();
    });
    guardian.once("error", () => {
      failFirst("guardian-spawn-failed");
      resolve();
    });
  });
  const lines = createInterface({ input: guardian.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  lines.on("line", (line) => {
    const envelope = parseEnvelope(line);
    if (envelope === null) {
      failFirst("guardian-envelope-invalid");
      sendTerminate("driver-refused");
      return;
    }
    if (guardianKey === null) {
      if (!isGuardianReady(envelope.payload) || envelope.payload.runId !== runId || envelope.payload.pid !== guardian.pid) {
        failFirst("guardian-identity-invalid");
        sendTerminate("driver-refused");
        return;
      }
      guardianKey = envelope.payload.publicKey;
      if (!verifyEnvelope(envelope, guardianKey) || envelope.payload.snapshotDigest !== snapshot.digest || !sameExecutableSnapshot(snapshot)) {
        failFirst("guardian-or-executable-authentication-failed");
        sendTerminate("driver-refused");
        return;
      }
      accepted = envelope.payload;
      acceptedPgid = envelope.payload.pgid;
      envelopeSeq = 1;
      const acceptedPersisted = store.acceptGuardian(request.deliveryKey, fingerprint, {
        pid: accepted.pid,
        pgid: accepted.pgid,
        publicKey: accepted.publicKey,
        executableSnapshotDigest: snapshot.digest,
      });
      if (!acceptedPersisted) {
        failFirst("guardian-accept-commit-failed");
        sendTerminate("driver-refused");
        return;
      }
      const confirmed = lifecycle.confirmDispatch({
        reservationId: lifecycleStart.reservationId,
        idempotencyKey: `${request.deliveryKey}:confirm`,
        attemptOrdinal: request.childOrdinal,
        nativeHandle: { state: "available", value: `guardian:${digest(accepted.publicKey)}` },
        dispatchEvidence: { state: "available", value: snapshot.digest },
      });
      if (!confirmed.ok) {
        failFirst("dispatch-confirm-commit-failed");
        sendTerminate("driver-refused");
        return;
      }
      attemptStart = confirmed.value.attemptStart;
      if (!store.markRunning(request.deliveryKey, fingerprint)) {
        failFirst("start-permit-commit-failed");
        sendTerminate("driver-refused");
        return;
      }
      writeControl(signedControl({
        kind: "go",
        runId,
        nonce: accepted.nonce,
        seq: 1,
        correlationId,
        prompt: request.prompt,
      }, driverKeys.privateKey));
      return;
    }
    if (!verifyEnvelope(envelope, guardianKey)) {
      failFirst("guardian-envelope-authentication-failed");
      sendTerminate("driver-refused");
      return;
    }
    const seq = envelope.payload.seq;
    if (!Number.isSafeInteger(seq) || seq !== envelopeSeq + 1 || envelope.payload.runId !== runId) {
      failFirst("guardian-envelope-sequence-invalid");
      sendTerminate("driver-refused");
      return;
    }
    envelopeSeq = seq as number;
    if (envelope.payload.kind === "rpc" && typeof envelope.payload.line === "string") {
      collector.acceptLine(envelope.payload.line);
    } else if (envelope.payload.kind === "failure" && typeof envelope.payload.reason === "string") {
      failFirst(envelope.payload.reason);
    } else if (envelope.payload.kind === "exit") {
      exitSeen = true;
      if (envelope.payload.exitCode !== 0 && termination === "normal") failFirst("pi-exit-failed");
    }
  });

  const timeout = setTimeout(() => {
    termination = "timed-out";
    failFirst("pi-timeout");
    sendTerminate("timed-out");
  }, request.timeoutMs);
  const abort = (): void => {
    termination = "cancelled";
    failFirst("pi-cancelled");
    sendTerminate("cancelled");
  };
  options.abortSignal?.addEventListener("abort", abort, { once: true });
  if (options.abortSignal?.aborted) abort();
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  const cleanupDeadline = new Promise<void>((resolve) => {
    cleanupTimer = setTimeout(resolve, request.timeoutMs + CLEANUP_WAIT_MS);
  });
  await Promise.race([done, cleanupDeadline]);
  if (cleanupTimer !== undefined) clearTimeout(cleanupTimer);
  clearTimeout(timeout);
  options.abortSignal?.removeEventListener("abort", abort);
  if (!closed) failFirst("guardian-reap-timeout");
  const observation = collector.observation();
  if (observation.semanticFailure !== null) failFirst(observation.semanticFailure);
  if (termination === "normal" && !observation.settled) failFirst("rpc-agent-not-settled");
  if (termination === "normal" && !exitSeen) failFirst("guardian-exit-unobserved");
  const cleanupOk = acceptedPgid === null ? closed : closed && groupExtinct(acceptedPgid);
  if (!cleanupOk) failFirst("guardian-group-not-extinct");
  return {
    output: observation.output,
    reason,
    termination,
    cleanupOk,
    attemptStart,
    ...(observation.providerId === undefined ? {} : { providerId: observation.providerId }),
    ...(observation.modelId === undefined ? {} : { modelId: observation.modelId }),
  };
}

function terminalKind(run: LiveRunResult): PiTerminalRecord["kind"] {
  if (run.termination === "cancelled") return "cancelled";
  if (run.termination === "timed-out") return "timed-out";
  return run.reason === null ? "succeeded" : "failed";
}

export async function executePiChild(rawRequest: unknown, options: PiDriverOptions = {}): Promise<PiChildDriverResult> {
  const parsed = parsePiChildRequest(rawRequest);
  if (!parsed.ok) return { kind: "dispatch-not-started", reason: parsed.reason, output: "", replayed: false };
  const request = parsed.value;
  const fingerprint = fingerprintPiRequest(request);
  const store = options.replayStore ?? createPiReplayStore(options.runtimeDir ?? runtimeDirFor(request.projectDir), options.now);
  const reserved = store.reserve(request.deliveryKey, fingerprint);
  if (reserved.kind === "terminal-replay") return mapReplay(reserved.record, reserved.output);
  if (reserved.kind !== "reserved") return { kind: reserved.kind, reason: `delivery-${reserved.kind}`, replayed: true };

  const snapshot = captureExecutableSnapshot(options.piExecutable);
  if (snapshot === null) {
    store.closeNoLaunch(request.deliveryKey, fingerprint, "pi-preflight-failed");
    return { kind: "dispatch-not-started", reason: "pi-preflight-failed", output: "", replayed: false };
  }
  const core = await loadPiCoreModules();
  let lifecycle = options.lifecycle;
  if (lifecycle === undefined) {
    const repository = core.lifecycle.createAuditExecutionRepository(request.projectDir);
    lifecycle = core.lifecycle.createExecutionLifecycleCoordinator({
      clock: options.clock ?? defaultClock(),
      repository,
      projectionSink: core.projection.createRequiredExecutionProjectionSink(request.projectDir, repository),
    });
  }
  const lifecycleStart = prepareLifecycle(request, lifecycle, core.convergence.createBudgetPolicy);
  if (lifecycleStart === null) {
    store.closeNoLaunch(request.deliveryKey, fingerprint, "lifecycle-reservation-failed");
    return { kind: "dispatch-not-started", reason: "lifecycle-reservation-failed", output: "", replayed: false };
  }

  const run = await runGuardian(request, snapshot, store, lifecycle, lifecycleStart, fingerprint, options);
  let reason = run.reason;
  const kind = terminalKind(run);
  const attemptFinished = run.attemptStart === null ? null : lifecycle.finishAttempt({
      idempotencyKey: `${request.deliveryKey}:finish-attempt`,
      start: run.attemptStart,
      outcome: {
        outcome: kind === "succeeded" ? "succeeded" : kind === "cancelled" ? "cancelled" : "failed",
        terminationReason: reason ?? "pi-child-succeeded",
      },
    });
  const operationStart = lifecycleStart.operationStart;
  const operationFinished = operationStart.ok
    ? lifecycle.finishOperation({
          idempotencyKey: `${request.deliveryKey}:finish-operation`,
          start: operationStart.value.start,
          outcome: {
            outcome: kind === "succeeded" ? "succeeded" : kind === "cancelled" ? "cancelled" : "failed",
            terminationReason: reason ?? "pi-child-succeeded",
          },
      })
    : null;
  if ((attemptFinished !== null && !attemptFinished.ok) || (operationStart.ok && (operationFinished === null || !operationFinished.ok))) {
    reason = "lifecycle-terminal-commit-failed";
  } else if (run.attemptStart === null && kind === "succeeded") {
    reason = "attempt-start-missing";
  }
  const finalKind: PiTerminalRecord["kind"] = reason === null ? kind : kind === "cancelled" || kind === "timed-out" ? kind : "failed";
  if (!store.commitTerminal(request.deliveryKey, fingerprint, {
    kind: finalKind,
    reason: reason ?? "pi-child-succeeded",
    ...(run.providerId === undefined ? {} : { providerId: run.providerId }),
    ...(run.modelId === undefined ? {} : { modelId: run.modelId }),
  }, run.output)) {
    return { kind: "failed", reason: "terminal-replay-commit-failed", output: "", replayed: false };
  }
  return finalKind === "succeeded"
    ? {
        kind: "succeeded",
        output: run.output,
        replayed: false,
        ...(run.providerId === undefined ? {} : { providerId: run.providerId }),
        ...(run.modelId === undefined ? {} : { modelId: run.modelId }),
      }
    : { kind: finalKind, reason: reason ?? "pi-child-failed", output: run.output, replayed: false };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > 4 * 1024 * 1024 + 64 * 1024) {
      process.stdout.write(`${JSON.stringify({ kind: "dispatch-not-started", reason: "request-cap-exceeded", output: "", replayed: false })}\n`);
      process.exitCode = 1;
      return;
    }
    chunks.push(bytes);
  }
  const raw = parsePiDriverInput(Buffer.concat(chunks).toString("utf8"));
  const result = await executePiChild(raw);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.kind === "succeeded" ? 0 : 1;
}

if (import.meta.main) await main();
