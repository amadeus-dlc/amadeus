import { scaleTestTime } from "../../lib/test-time-factor.ts";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type {
  AdapterExecution,
  CleanupReceipt,
  CleanupTarget,
  CredentialBinding,
  CredentialDeclaration,
  LiveAdapter,
  PreflightContext,
  PreflightFinding,
  PreflightResult,
  PrepareContext,
  PreparedRun,
} from "./adapter.ts";
import { type Result, sanitizeText } from "./contract.ts";
import { buildChildEnvironment } from "./policy.ts";
import { capabilityById } from "./registry.ts";
import { cleanupReceiptFromRegistrar, type ResourceRegistrar } from "./resources.ts";
import { removeTreeVerified } from "./testing/remove-tree-verified.ts";

export const CLAUDE_SDK_PROMPT = "echo ok";
export const CLAUDE_SDK_SINGLE_EVENT_LIMIT = 65_536;
export const CLAUDE_SDK_TOTAL_EVENT_LIMIT = 1_048_576;
export const CLAUDE_SDK_EVENT_COUNT_LIMIT = 4_096;
export const CLAUDE_SDK_QUEUE_EVENT_LIMIT = 16;
export const CLAUDE_SDK_QUEUE_BYTE_LIMIT = 262_144;
export const CLAUDE_SDK_STDERR_LIMIT = 262_144;

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-sdk");
  if (!resolved.ok) throw new Error("claude-sdk capability is not registered");
  return resolved.value;
})();
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: "ANTHROPIC_API_KEY" };
const CREDENTIAL_RESOURCE_ID = "claude-sdk-credential-binding";
const WORKER_RESOURCE_ID = "claude-sdk-worker-group";
const DEFAULT_WORKER = fileURLToPath(new URL("./claude-sdk-worker.ts", import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL("../../../package.json", import.meta.url));

type WorkerSignal = "SIGUSR1" | "SIGTERM" | "SIGKILL";

export interface ClaudeSdkWorkerEvent extends Readonly<Record<string, unknown>> {
  readonly kind: string;
  readonly ordinal: number;
}

interface EventCollection {
  readonly digest: string;
  readonly events: readonly ClaudeSdkWorkerEvent[];
  readonly totalBytes: number;
  readonly eventCount: number;
  readonly truncated: boolean;
  readonly failureKind?:
    | "single-event-limit"
    | "total-event-limit"
    | "event-count-limit"
    | "queue-event-limit"
    | "queue-byte-limit"
    | "malformed-event";
}

interface ByteCollection {
  readonly digest: string;
  readonly totalBytes: number;
  readonly truncated: boolean;
}

interface ClaudeSdkManifest {
  readonly dependencies?: Readonly<Record<string, unknown>>;
  readonly devDependencies?: Readonly<Record<string, unknown>>;
}

export interface ClaudeSdkAdapterOptions {
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  readonly workerScript?: string;
  readonly sdkVersion?: string;
  readonly abortGraceMs?: number;
  readonly termGraceMs?: number;
  readonly reapGraceMs?: number;
}

function versionTuple(value: string): readonly number[] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isClaudeSdkVersionSupported(actual: string): boolean {
  const left = versionTuple(actual);
  const right = versionTuple(CAPABILITY.minimumVersion);
  if (left === null || right === null) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return true;
}

export function probeClaudeSdkVersion(packageJsonPath = PACKAGE_JSON): string | null {
  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8")) as ClaudeSdkManifest;
    const declared = manifest.dependencies?.["@anthropic-ai/claude-agent-sdk"] ??
      manifest.devDependencies?.["@anthropic-ai/claude-agent-sdk"];
    return typeof declared === "string" && versionTuple(declared) !== null ? declared : null;
  } catch {
    return null;
  }
}

interface WorkerSurfaceProbe {
  readonly measuredVersion?: string;
  readonly finding?: PreflightFinding;
}

function probeWorkerSurface(options: ClaudeSdkAdapterOptions): WorkerSurfaceProbe {
  if (options.sdkVersion !== undefined || !existsSync(options.workerScript ?? DEFAULT_WORKER)) return {};
  const isolated = buildChildEnvironment(options.parentEnv, CAPABILITY.environment);
  if (!isolated.ok) {
    return {
      finding: {
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Claude SDK probe environment rejected ${isolated.error.key}`,
      },
    };
  }
  const probe = spawnSync(process.execPath, [options.workerScript ?? DEFAULT_WORKER, "--probe"], {
    encoding: "utf8",
    env: isolated.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(5_000),
  });
  try {
    const surface = probe.status === 0
      ? JSON.parse(probe.stdout) as Readonly<Record<string, unknown>>
      : undefined;
    const supported = surface?.query === true && surface.abort === true;
    return {
      measuredVersion: typeof surface?.version === "string" ? surface.version : undefined,
      finding: supported
        ? undefined
        : {
            code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
            diagnostic: "Claude SDK query or abort surface is unavailable",
          },
    };
  } catch {
    return {
      finding: {
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: "Claude SDK capability probe returned an invalid result",
      },
    };
  }
}

interface WorkerProbe {
  readonly measuredVersion?: string;
  readonly findings: readonly PreflightFinding[];
}

function workerProbe(options: ClaudeSdkAdapterOptions): WorkerProbe {
  const surface = probeWorkerSurface(options);
  const measuredVersion = surface.measuredVersion ?? options.sdkVersion ?? probeClaudeSdkVersion() ?? undefined;
  const findings: PreflightFinding[] = [];
  if (surface.finding !== undefined) findings.push(surface.finding);
  if (measuredVersion === undefined || !isClaudeSdkVersionSupported(measuredVersion)) {
    findings.push({
      code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
      diagnostic: `Claude Agent SDK ${CAPABILITY.minimumVersion} or newer is required`,
    });
  }
  if (!existsSync(options.workerScript ?? DEFAULT_WORKER)) {
    findings.push({
      code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
      diagnostic: "Claude SDK worker surface is unavailable",
    });
  }
  return { measuredVersion, findings };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function signalWorker(worker: Bun.Subprocess, signal: WorkerSignal): void {
  if (process.platform !== "win32") {
    try {
      process.kill(-worker.pid, signal);
      return;
    } catch {}
  }
  try {
    worker.kill(signal);
  } catch {}
}

function isWorkerEvent(value: unknown): value is ClaudeSdkWorkerEvent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Readonly<Record<string, unknown>>;
  return typeof event.kind === "string" && Number.isInteger(event.ordinal) && Number(event.ordinal) >= 0;
}

function lineLimitKind(
  line: string,
  eventCount: number,
  queuedEventCount: number,
  retainedBytes: number,
): EventCollection["failureKind"] {
  const lineBytes = Buffer.byteLength(line);
  if (eventCount > CLAUDE_SDK_EVENT_COUNT_LIMIT) return "event-count-limit";
  if (lineBytes > CLAUDE_SDK_SINGLE_EVENT_LIMIT) return "single-event-limit";
  if (queuedEventCount > CLAUDE_SDK_QUEUE_EVENT_LIMIT) return "queue-event-limit";
  if (retainedBytes + lineBytes > CLAUDE_SDK_QUEUE_BYTE_LIMIT) return "queue-byte-limit";
  return undefined;
}

function parseWorkerEvent(line: string): ClaudeSdkWorkerEvent | undefined {
  try {
    const parsed = JSON.parse(line) as unknown;
    return isWorkerEvent(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function collectEvents(
  stream: ReadableStream<Uint8Array>,
  onLimit: () => void,
): Promise<EventCollection> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const hash = createHash("sha256");
  const events: ClaudeSdkWorkerEvent[] = [];
  let pending = "";
  let totalBytes = 0;
  let eventCount = 0;
  let retainedBytes = 0;
  let failureKind: EventCollection["failureKind"];
  const fail = (kind: NonNullable<EventCollection["failureKind"]>) => {
    if (failureKind !== undefined) return;
    failureKind = kind;
    onLimit();
  };
  const acceptLine = (line: string, queuedEventCount: number) => {
    if (line.length === 0) return;
    eventCount += 1;
    const lineBytes = Buffer.byteLength(line);
    const limitKind = lineLimitKind(line, eventCount, queuedEventCount, retainedBytes);
    if (limitKind !== undefined) fail(limitKind);
    retainedBytes += lineBytes;
    if (failureKind !== undefined) return;
    const event = parseWorkerEvent(line);
    if (event === undefined) {
      fail("malformed-event");
      return;
    }
    events.push(event);
  };
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    hash.update(item.value);
    totalBytes += item.value.byteLength;
    if (totalBytes > CLAUDE_SDK_TOTAL_EVENT_LIMIT) fail("total-event-limit");
    if (failureKind !== undefined) continue;
    pending += decoder.decode(item.value, { stream: true });
    for (;;) {
      const newline = pending.indexOf("\n");
      if (newline < 0) break;
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      acceptLine(line, 0);
    }
    if (Buffer.byteLength(pending) > CLAUDE_SDK_SINGLE_EVENT_LIMIT) fail("single-event-limit");
  }
  if (failureKind === undefined) {
    pending += decoder.decode();
    acceptLine(pending, pending.length === 0 ? 0 : 1);
  }
  return {
    digest: hash.digest("hex"),
    events,
    totalBytes,
    eventCount,
    truncated: failureKind !== undefined,
    failureKind,
  };
}

async function collectBytes(stream: ReadableStream<Uint8Array>, limit: number): Promise<ByteCollection> {
  const reader = stream.getReader();
  const hash = createHash("sha256");
  let totalBytes = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    hash.update(item.value);
    totalBytes += item.value.byteLength;
  }
  return { digest: hash.digest("hex"), totalBytes, truncated: totalBytes > limit };
}

function credentialFrame(binding: CredentialBinding): Uint8Array {
  const payload = new TextEncoder().encode(JSON.stringify({
    runNonce: randomUUID(),
    generation: 1,
    childKey: binding.key,
    secret: binding.expose(),
  }));
  const prefix = new TextEncoder().encode(`${payload.byteLength}\n`);
  const frame = new Uint8Array(prefix.byteLength + payload.byteLength);
  frame.set(prefix);
  frame.set(payload, prefix.byteLength);
  payload.fill(0);
  return frame;
}

export class ClaudeSdkAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: ClaudeSdkAdapterOptions;
  #binding: CredentialBinding | undefined;
  #registrar: ResourceRegistrar | undefined;
  #activeWorker: Bun.Subprocess | undefined;
  #escalation: Promise<void> | undefined;
  #supervisorFailures: string[] = [];
  #aborted = false;

  constructor(options: ClaudeSdkAdapterOptions) {
    this.#options = options;
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const probe = workerProbe(this.#options);
    const findings = [...probe.findings];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({ code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING", diagnostic: "Claude distribution is missing" });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({ code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE", diagnostic: "Claude SDK credential binding is unavailable" });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: probe.measuredVersion ?? "unknown", findings }
      : { kind: "skip", measuredVersion: probe.measuredVersion, findings };
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    context.registrar.registerPlanned({
      id: CREDENTIAL_RESOURCE_ID,
      kind: "credential-binding",
      locator: "anonymous-pipe",
      credentialBearing: true,
    });
    context.registrar.registerPlanned({
      id: WORKER_RESOURCE_ID,
      kind: "process-group",
      locator: "run-owned-worker",
      credentialBearing: true,
    });
    this.#registrar = context.registrar;
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      context.registrar.markCreated(CREDENTIAL_RESOURCE_ID);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` } };
      }
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
      };
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: process.execPath,
          args: [this.#options.workerScript ?? DEFAULT_WORKER],
          environmentKeys: Object.keys(environment),
          resolveEnvironment: () => ({ ...environment }),
          registeredResourceIds: [CREDENTIAL_RESOURCE_ID, WORKER_RESOURCE_ID],
        },
      };
    } catch (error) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: sanitizeText(String(error)) } };
    }
  }

  #beginEscalation(worker: Bun.Subprocess): Promise<void> {
    if (this.#escalation !== undefined) return this.#escalation;
    this.#aborted = true;
    this.#escalation = (async () => {
      signalWorker(worker, "SIGUSR1");
      await Promise.race([worker.exited.then(() => undefined), delay(this.#options.abortGraceMs ?? 10_000)]);
      if (this.#activeWorker !== worker) return;
      signalWorker(worker, "SIGTERM");
      await Promise.race([worker.exited.then(() => undefined), delay(this.#options.termGraceMs ?? 5_000)]);
      if (this.#activeWorker !== worker) return;
      signalWorker(worker, "SIGKILL");
      const reaped = await Promise.race([
        worker.exited.then(() => true),
        delay(this.#options.reapGraceMs ?? 5_000).then(() => false),
      ]);
      if (!reaped) this.#supervisorFailures.push("Claude SDK worker reap timed out");
    })();
    return this.#escalation;
  }

  async execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    if (this.#binding === undefined) throw new Error("Claude SDK credential binding is missing");
    this.#aborted = false;
    this.#escalation = undefined;
    const worker = Bun.spawn({
      cmd: [run.executable, ...run.args],
      cwd: run.cwd,
      env: run.resolveEnvironment(),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      detached: process.platform !== "win32",
    });
    this.#activeWorker = worker;
    this.#registrar?.markCreated(WORKER_RESOURCE_ID);
    const frame = credentialFrame(this.#binding);
    if (typeof worker.stdin === "object" && worker.stdin !== null && "write" in worker.stdin) {
      worker.stdin.write(frame);
      worker.stdin.end();
    } else {
      frame.fill(0);
      throw new Error("Claude SDK worker credential pipe is unavailable");
    }
    frame.fill(0);
    const abort = () => void this.#beginEscalation(worker);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    const stdout = collectEvents(worker.stdout, abort);
    const stderr = collectBytes(worker.stderr, CLAUDE_SDK_STDERR_LIMIT);
    const exitCode = await worker.exited;
    this.#activeWorker = undefined;
    this.#registrar?.markReleased(WORKER_RESOURCE_ID);
    signal.removeEventListener("abort", abort);
    const [eventOutput, errorOutput] = await Promise.all([stdout, stderr]);
    const outputFailure = eventOutput.failureKind !== undefined || errorOutput.truncated;
    return {
      exitCode: outputFailure ? 1 : exitCode,
      timedOut: signal.aborted,
      aborted: this.#aborted || outputFailure,
      stdoutDigest: eventOutput.digest,
      stderrDigest: errorOutput.digest,
      structured: {
        sdkEvents: eventOutput.events,
        eventCount: eventOutput.eventCount,
        stdoutBytes: eventOutput.totalBytes,
        stderrBytes: errorOutput.totalBytes,
        truncated: eventOutput.truncated || errorOutput.truncated,
        failureKind: eventOutput.failureKind ?? (errorOutput.truncated ? "stderr-limit" : undefined),
      },
    };
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures = [...this.#supervisorFailures];
    this.#supervisorFailures = [];
    if (this.#activeWorker !== undefined) {
      try {
        await this.#beginEscalation(this.#activeWorker);
        this.#registrar?.markReleased(WORKER_RESOURCE_ID);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#activeWorker = undefined;
      }
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
        this.#registrar?.markReleased(CREDENTIAL_RESOURCE_ID);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#binding = undefined;
      }
    }
    try {
      removeTreeVerified(target.scratch.root);
      this.#registrar?.markReleased("scratch-root");
    } catch (error) {
      failures.push(sanitizeText(String(error)));
    }
    const receipt = cleanupReceiptFromRegistrar(this.#registrar, target, failures);
    this.#registrar = undefined;
    return receipt;
  }
}
