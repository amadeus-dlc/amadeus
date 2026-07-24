import { createHash } from "node:crypto";
import { spawn as spawnChildProcess, spawnSync } from "node:child_process";
import { request as httpsRequest } from "node:https";
import { createConnection, createServer } from "node:net";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  fstatSync,
  ftruncateSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  readSync,
  renameSync,
  statSync,
  statfsSync,
  symlinkSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, parseCellResult, type CellResult, type Result } from "./contract.ts";
import type {
  EnvReceipt,
  EnvSnapshot,
  TlcSpawnPlanner,
} from "./run-model-check-domain.ts";
import { validateFrozenTlaModelReceipt } from "./tla-arm.ts";
import {
  createJdkDistributionManifest,
  createJdkSnapshotIdentity,
  createSandboxProbeReceipt,
  createTlcRunManifest,
  DARWIN_NETWORK_DENY_POLICY_IDENTITY,
  DARWIN_SANDBOX_PROVIDER_IDENTITY,
  FIXED_JDK_RUN_PROFILE,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  MAX_TLC_STREAM_BYTES,
  parseTlcOutput174,
  type JdkDistributionEntry,
  type JdkDistributionManifest,
  type PreparedTlcRun,
  type RawTlcOutcome,
  type SandboxProbeReceipt,
  type SandboxProbeKind,
  type SandboxProbeObservation,
  type TlcClosedEnvironment,
  type TlcExploration,
  type TlcNormalizationInput,
  type TlcPrepareInput,
  type TlcToolchainFacade,
  type TlcToolchainError,
  type VerifiedJdkSnapshot,
  type VerifiedSandbox,
  type VerifiedTlcArtifact,
} from "./tlc-toolchain.ts";

interface TlcCellNormalizationInput {
  exploration: TlcExploration;
  fixtureId: string; baselineSha: string; armSha: string;
  exitCode: number | null;
  startedAt: string; finishedAt: string;
  evidencePaths: string[];
}

function explorationExitCodeMatches(exploration: TlcExploration, exitCode: number | null): boolean {
  if (exploration.kind === "COMPLETE") return exitCode === 0;
  if (exploration.kind === "COUNTEREXAMPLE") return exitCode === 12;
  return true;
}

function explorationVerdict(exploration: TlcExploration): CellResult["verdict"] {
  if (exploration.kind === "COMPLETE") return "NOT_DETECTED";
  if (exploration.kind === "COUNTEREXAMPLE") return "DETECTED";
  return "HARNESS_ERROR";
}

function explorationCounterexampleId(exploration: TlcExploration): string | null { return exploration.kind === "COUNTEREXAMPLE" ? exploration.counterexampleIdentity : null; }

function cellNormalizationFailure(message: string) { return { ok: false as const, error: { message } }; }

const normalizeIssuedExploration = (input: TlcCellNormalizationInput) => {
  if (!explorationExitCodeMatches(input.exploration, input.exitCode)) {
    return cellNormalizationFailure("exploration kind and process exit code disagree");
  }
  const parsed = parseCellResult({
    schemaVersion: 1,
    arm: "tla",
    fixtureId: input.fixtureId,
    baselineSha: input.baselineSha,
    armSha: input.armSha,
    verdict: explorationVerdict(input.exploration),
    exitCode: input.exitCode,
    toolVersions: { tlc: "1.7.4" },
    seedOrBound: { workers: 1, voters: 3, choices: 3, maxInitialPerVoter: 1, maxAmendPerVoter: 1, maxHold: 1 },
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    counterexampleId: explorationCounterexampleId(input.exploration),
    evidencePaths: [...input.evidencePaths],
  });
  if (!parsed.ok) return cellNormalizationFailure(`${parsed.error.path}: ${parsed.error.message}`);
  return parsed;
};

const CONNECT_MS = 10_000;
const HEADERS_MS = 30_000;
const BODY_MS = 120_000;
const MAX_REDIRECTS = 3;
const BUFFER_BYTES = 1024 * 1024;
const METADATA_BYTES = 1024 * 1024;
const SAFETY_RESERVE_BYTES = 1024 * 1024 * 1024;
const JDK_FILE_BUFFER_BYTES = 1024 * 1024;
const SANDBOX_PROBE_MS = 5_000;
const DARWIN_NETWORK_DENY_PROFILE = "(version 1)(deny default)(allow process*)(allow file*)(allow system*)(allow mach*)(allow ipc*)(allow sysctl*)(deny network*)(allow network-inbound (local tcp \"localhost:*\"))";

export const FIXED_TLC_RESERVATION_BYTES =
  FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes + METADATA_BYTES + SAFETY_RESERVE_BYTES;

export interface ArtifactNetworkRequest {
  url: string;
  startedAtMs: number;
  connectDeadlineMs: number;
  headersDeadlineMs: number;
  bodyDeadlineMs: number;
  headers: Readonly<Record<string, string>>;
}

export interface ArtifactNetworkResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  connectedAtMs: number;
  headersAtMs: number;
  body: AsyncIterable<Uint8Array>;
}

export interface ArtifactNetworkPort {
  request(input: ArtifactNetworkRequest): Promise<ArtifactNetworkResponse>;
}

export interface FileDigestPort {
  createStreamingDigest(): {
    update(bytes: Uint8Array): void;
    digest(): string;
  };
  digest(path: string, maxBytes: number): { sha256: string; byteLength: number };
}

export interface PhysicalReservationPort {
  availableBytes(path: string): number;
  reserve(path: string, bytes: number): void;
  release(path: string): void;
  isReserved(path: string): boolean;
}

export class NodeArtifactNetworkPort implements ArtifactNetworkPort {
  constructor(private readonly nowMs: () => number = Date.now) {}

  request(input: ArtifactNetworkRequest): Promise<ArtifactNetworkResponse> {
    const url = new URL(input.url);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || Object.keys(input.headers).some((name) => name.toLowerCase() !== "accept")) {
      return Promise.reject(new Error("artifact transport accepts only unauthenticated HTTPS with the fixed Accept header"));
    }
    return new Promise((resolveResponse, reject) => {
      let connectedAtMs = 0;
      let responseSettled = false;
      const request = httpsRequest(url, { method: "GET", headers: { ...input.headers }, agent: false }, (response) => {
        responseSettled = true;
        clearTimeout(connectTimer);
        clearTimeout(headersTimer);
        const headers = Object.fromEntries(Object.entries(response.headers).flatMap(([name, value]) => value === undefined ? [] : [[name, Array.isArray(value) ? value.join(",") : value]]));
        const bodyTimer = setTimeout(() => response.destroy(new Error("artifact body absolute deadline expired")), Math.max(1, input.bodyDeadlineMs - this.nowMs()));
        const clearBodyTimer = () => clearTimeout(bodyTimer);
        response.once("end", clearBodyTimer);
        response.once("close", clearBodyTimer);
        resolveResponse({ status: response.statusCode ?? 0, headers, connectedAtMs: connectedAtMs || this.nowMs(), headersAtMs: this.nowMs(), body: response });
      });
      const abort = (message: string) => { request.destroy(new Error(message)); };
      const connectTimer = setTimeout(() => abort("artifact connect absolute deadline expired"), Math.max(1, input.connectDeadlineMs - this.nowMs()));
      const headersTimer = setTimeout(() => abort("artifact headers absolute deadline expired"), Math.max(1, input.headersDeadlineMs - this.nowMs()));
      request.once("socket", (socket) => socket.once("secureConnect", () => { connectedAtMs = this.nowMs(); clearTimeout(connectTimer); }));
      request.once("error", (cause) => { clearTimeout(connectTimer); clearTimeout(headersTimer); if (!responseSettled) reject(cause); });
      request.end();
    });
  }
}

export class NodeFileDigestPort implements FileDigestPort {
  createStreamingDigest() {
    const hash = createHash("sha256");
    return { update: (bytes: Uint8Array) => { hash.update(bytes); }, digest: () => hash.digest("hex") };
  }

  digest(path: string, maxBytes: number) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("digest target is not a capped regular file");
    return hashFile(path, maxBytes);
  }
}

export class NodePhysicalReservationPort implements PhysicalReservationPort {
  availableBytes(path: string): number {
    const stat = statfsSync(path);
    const available = Number(stat.bavail) * Number(stat.bsize);
    return Number.isSafeInteger(available) ? available : 0;
  }
  reserve(path: string, bytes: number): void {
    const fd = openSync(path, "wx", 0o600);
    let complete = false;
    try {
      ftruncateSync(fd, bytes);
      const block = new Uint8Array(8 * 1024 * 1024).fill(0xa5);
      for (let offset = 0; offset < bytes; offset += block.byteLength) {
        const length = Math.min(block.byteLength, bytes - offset);
        if (writeSync(fd, block, 0, length, offset) !== length) throw new Error("physical reservation write was partial");
      }
      fsyncSync(fd);
      if (fstatSync(fd).blocks * 512 < bytes) throw new Error("filesystem kept the reservation sparse");
      complete = true;
    } finally {
      closeSync(fd);
      if (!complete && existsSync(path)) { unlinkSync(path); syncDirectory(dirname(path)); }
    }
    syncDirectory(dirname(path));
  }
  release(path: string): void { unlinkSync(path); syncDirectory(dirname(path)); }
  isReserved(path: string): boolean {
    if (!existsSync(path)) return false;
    const stat = lstatSync(path);
    return stat.isFile() && stat.size === FIXED_TLC_RESERVATION_BYTES && stat.blocks * 512 >= stat.size;
  }
}

export type OwnerLiveness = "live" | "dead" | "unknown";
export type TlcCacheFaultPoint =
  | "after-capacity-reserve"
  | "after-capacity-claim"
  | "after-capacity-release"
  | "after-file-sync"
  | "after-publish-sync"
  | "after-receipt-sync";

interface LockOwner {
  host: string;
  pid: number;
  processStartedAt: string;
  nonce: string;
  createdAt: string;
  descriptorIdentity: string;
}

interface CapacityRecord {
  descriptorIdentity: string;
  ownerNonce: string;
  bytes: number;
  state: "RESERVING" | "ACTIVE";
}

export interface FsTlcToolchainDependencies {
  network: ArtifactNetworkPort;
  digest: FileDigestPort;
  reservation: PhysicalReservationPort;
  clock: { nowMs(): number; utcNow(): string };
  owner: Pick<LockOwner, "host" | "pid" | "processStartedAt">;
  liveness(owner: Readonly<LockOwner>): OwnerLiveness;
  randomUuid(): string;
  jdkVersion: string;
  workspaceRoot?: string;
  jdkDistributionRoot?: string;
  jdkSnapshotRoot?: string;
  sandboxProvider?: SandboxProbeProvider;
  javaVersion?: JavaVersionPort;
  process?: TlcProcessPort;
  timer?: { wait(milliseconds: number): Promise<void> };
  suiteRemainingMs?(): number;
  evidencePublishReserveMs?: number;
  fault?(point: TlcCacheFaultPoint): void;
}

export interface PlannedTlcPrepareInput extends TlcPrepareInput {
  readonly runId: string;
  readonly scratchRoot: string;
  readonly planner: TlcSpawnPlanner;
}

export interface PreparedPlannedTlcRun {
  readonly artifact: VerifiedTlcArtifact;
  readonly modelReceipt: TlcPrepareInput["modelReceipt"];
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly cwd: string;
  readonly standardModuleDirectory: string;
  readonly scratchRoot: string;
  readonly deadlineMs: number;
  readonly manifestArgv: readonly string[];
  readonly planner: TlcSpawnPlanner;
  readonly environmentSnapshot: EnvSnapshot;
  readonly environment: TlcClosedEnvironment | Readonly<{
    LANG: string;
    LC_ALL: string;
    TZ: string;
  }>;
}

export interface PlannedTlcOutcome {
  readonly raw: RawTlcOutcome;
  readonly exploration: TlcExploration;
  readonly environmentReceipt: EnvReceipt;
}

export interface SandboxProbeProvider {
  available(): boolean;
  probe(kind: SandboxProbeKind, input: {
    readonly executable: "/usr/bin/sandbox-exec";
    readonly profile: string;
    readonly deadlineMs: number;
  }): Promise<SandboxProbeObservation>;
}

export interface TlcProcessRequest {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly environment: TlcClosedEnvironment | Readonly<{ LANG: string; LC_ALL: string; TZ: string }>;
  readonly shell: false;
  readonly processGroup: true;
}

export interface TlcProcessStatus { readonly exitCode: number | null; readonly signal: string | null; }

export interface TlcChildProcessPort {
  readonly stdout: AsyncIterable<Uint8Array>;
  readonly stderr: AsyncIterable<Uint8Array>;
  wait(): Promise<TlcProcessStatus>;
  signalGroup(signal: "SIGTERM" | "SIGKILL"): Promise<void>;
}

export interface TlcProcessPort {
  spawn(input: TlcProcessRequest): TlcChildProcessPort;
}

export interface JavaVersionReceipt {
  readonly executableRealpath: string;
  readonly output: string;
}

export interface JavaVersionPort {
  inspect(input: { readonly javaExecutablePath: string; readonly javaHome: string; readonly deadlineMs: number }): Promise<JavaVersionReceipt>;
}

export class NodeJavaVersionPort implements JavaVersionPort {
  async inspect(input: { javaExecutablePath: string; javaHome: string; deadlineMs: number }): Promise<JavaVersionReceipt> {
    const executableRealpath = realpathSync(input.javaExecutablePath);
    const result = spawnSync(executableRealpath, ["-version"], {
      cwd: input.javaHome,
      env: { JAVA_HOME: input.javaHome, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" },
      shell: false,
      timeout: input.deadlineMs,
      killSignal: "SIGKILL",
      encoding: "utf8",
      maxBuffer: METADATA_BYTES,
    });
    if (result.error || result.status !== 0 || result.signal !== null) throw new Error(`java -version failed: ${result.error ?? result.signal ?? result.status}`);
    return { executableRealpath, output: `${result.stdout}${result.stderr}` };
  }
}

export class NodeTlcProcessPort implements TlcProcessPort {
  spawn(input: TlcProcessRequest): TlcChildProcessPort {
    if (input.argv.length === 0 || !isAbsolute(input.argv[0]!)) throw new TypeError("process argv[0] must be absolute");
    const child = spawnChildProcess(input.argv[0]!, [...input.argv.slice(1)], { cwd: input.cwd, env: { ...input.environment }, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const status = new Promise<TlcProcessStatus>((resolveStatus, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode, signal) => resolveStatus({ exitCode, signal }));
    });
    return {
      stdout: child.stdout,
      stderr: child.stderr,
      wait: () => status,
      signalGroup: async (signal) => {
        if (!Number.isSafeInteger(child.pid) || child.pid! <= 0) throw new Error("child process has no safe process-group id");
        process.kill(-child.pid!, signal);
      },
    };
  }
}

async function openTcpLoopbackProbe(): Promise<{ port: number; close(): Promise<void> }> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("TCP loopback probe listener has no numeric port");
  await new Promise<void>((resolveControl, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: address.port }, () => {
      socket.destroy();
      resolveControl();
    });
    socket.once("error", reject);
  });
  return {
    port: address.port,
    close: () => new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose())),
  };
}

export class DarwinSandboxExecProvider implements SandboxProbeProvider {
  constructor(
    private readonly processes: TlcProcessPort,
    private readonly probeExecutable: string,
    private readonly timer?: { wait(milliseconds: number): Promise<void> },
    private readonly platform: NodeJS.Platform = process.platform,
  ) {}

  available(): boolean {
    return this.platform === "darwin" && existsSync("/usr/bin/sandbox-exec") && isAbsolute(this.probeExecutable) && existsSync(this.probeExecutable);
  }

  async probe(kind: SandboxProbeKind, input: { executable: "/usr/bin/sandbox-exec"; profile: string; deadlineMs: number }): Promise<SandboxProbeObservation> {
    if (!Number.isSafeInteger(input.deadlineMs) || input.deadlineMs <= 0) throw new TypeError("sandbox probe deadline must be a positive integer");
    const startedAtMs = Date.now();
    const tcpLoopback = kind === "TCP_LOOPBACK" ? await openTcpLoopbackProbe() : undefined;
    try {
    const scripts: Record<SandboxProbeKind, string> = {
      TCP_LOOPBACK: `require('node:net').connect(${tcpLoopback?.port ?? 9},'127.0.0.1').on('error',e=>{if(e.code==='EPERM'||e.code==='EACCES'||e.code==='ECONNREFUSED'){console.error('SANDBOX_DENIED');process.exit(77)}process.exit(1)}).on('connect',()=>process.exit(0))`,
      UDP_LOOPBACK: "const s=require('node:dgram').createSocket('udp4');s.on('error',e=>{if(e.code==='EPERM'||e.code==='EACCES'){console.error('SANDBOX_DENIED');process.exit(77)}process.exit(1)});s.send('x',9,'127.0.0.1',e=>{if(e){s.emit('error',e)}else process.exit(0)})",
      DNS: "const s=require('node:dgram').createSocket('udp4');s.on('error',e=>{if(e.code==='EPERM'||e.code==='EACCES'){console.error('SANDBOX_DENIED');process.exit(77)}process.exit(1)});s.send(Buffer.from('000001000001000000000000076578616d706c6503636f6d0000010001','hex'),53,'1.1.1.1',e=>{if(e){s.emit('error',e)}else process.exit(0)})",
    };
    const child = this.processes.spawn({ argv: [input.executable, "-p", input.profile, this.probeExecutable, "-e", scripts[kind]], cwd: "/", environment: { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" }, shell: false, processGroup: true });
    const statusPromise = child.wait();
    const stdoutPromise = collectUnbounded(child.stdout);
    const stderrPromise = collectUnbounded(child.stderr);
    const outputPromise = Promise.all([stdoutPromise, stderrPromise]);
    const raceStatus = async (milliseconds: number): Promise<TlcProcessStatus | null> => {
      if (this.timer) return Promise.race([statusPromise, this.timer.wait(milliseconds).then(() => null)]);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([statusPromise, new Promise<null>((resolveNull) => { timer = setTimeout(() => resolveNull(null), milliseconds); })]);
      } finally { if (timer !== undefined) clearTimeout(timer); }
    };
    const raceOutput = async (milliseconds: number): Promise<[Uint8Array[], Uint8Array[]] | null> => {
      if (this.timer) return Promise.race([outputPromise, this.timer.wait(milliseconds).then(() => null)]);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { return await Promise.race([outputPromise, new Promise<null>((resolveNull) => { timer = setTimeout(() => resolveNull(null), milliseconds); })]); }
      finally { if (timer !== undefined) clearTimeout(timer); }
    };
    let status = await raceStatus(Math.max(1, input.deadlineMs - (Date.now() - startedAtMs)));
    if (!status) {
      try { await child.signalGroup("SIGTERM"); } catch { /* KILL below is mandatory. */ }
      status = await raceStatus(5_000);
      if (!status) {
        await child.signalGroup("SIGKILL");
        status = await raceStatus(5_000);
      }
      if (!status) throw new Error(`${kind} sandbox probe process survived TERM and KILL`);
      if (!await raceOutput(5_000)) throw new Error(`${kind} sandbox probe output streams survived TERM and KILL`);
      throw new Error(`${kind} sandbox probe exceeded its absolute deadline`);
    }
    let output = await raceOutput(Math.max(1, input.deadlineMs - (Date.now() - startedAtMs)));
    if (!output) {
      try { await child.signalGroup("SIGTERM"); } catch { /* KILL below is mandatory. */ }
      output = await raceOutput(5_000);
      if (!output) { await child.signalGroup("SIGKILL"); output = await raceOutput(5_000); }
      if (!output) throw new Error(`${kind} sandbox probe output streams survived TERM and KILL`);
      throw new Error(`${kind} sandbox probe output exceeded its absolute deadline`);
    }
    const [stdout, stderr] = output;
    const stderrText = new TextDecoder().decode(joinChunks(stderr));
    return {
      kind,
      denied: status.exitCode === 77 && stderrText.includes("SANDBOX_DENIED"),
      exitCode: status.exitCode,
      signal: status.signal,
      evidenceIdentity: canonicalIdentity({ kind, status, stdout: hashChunks(stdout), stderr: hashChunks(stderr) }, "amadeus.formal-verif.sandbox-probe-evidence.v1").sha256,
    };
    } finally {
      await tcpLoopback?.close();
    }
  }
}

export type TlcArtifactStoreError = {
  kind: "AcquisitionError" | "CacheIntegrityError";
  code:
    | "LOCK_BUSY"
    | "LOCK_INTEGRITY"
    | "CAPACITY"
    | "NETWORK"
    | "DEADLINE"
    | "REDIRECT"
    | "BODY_LENGTH"
    | "CHECKSUM"
    | "CACHE_MISSING"
    | "CACHE_COLLISION"
    | "RECEIPT"
    | "FILESYSTEM";
  message: string;
  cause?: string;
};

export interface TlcArtifactReceipt {
  schemaVersion: 1;
  descriptorIdentity: string;
  actualSha256: string;
  byteLength: number;
  cacheRef: string;
  acquiredAt: string;
  jdkVersion: string;
  receiptIdentity: string;
}

class StoreFailure extends Error {
  constructor(readonly value: TlcArtifactStoreError) { super(value.message); }
}

class ToolchainFailure extends Error {
  constructor(readonly value: TlcToolchainError) { super(value.message); }
}

function toolchainAbort(
  kind: "PreparationError" | "InvocationError" | "NormalizationError",
  code: string,
  message: string,
  cause?: unknown,
): never {
  throw new ToolchainFailure({ kind, code, message, ...(cause === undefined ? {} : { cause: String(cause) }) });
}

function pathInside(root: string, path: string): boolean {
  const offset = relative(root, path);
  return offset === "" || (!isAbsolute(offset) && offset !== ".." && !offset.startsWith(`..${sep}`));
}

function hashFile(path: string, maxBytes = Number.MAX_SAFE_INTEGER): { sha256: string; byteLength: number } {
  const fd = openSync(path, "r");
  const hash = createHash("sha256");
  const buffer = new Uint8Array(JDK_FILE_BUFFER_BYTES);
  let byteLength = 0;
  try {
    for (;;) {
      const length = readSync(fd, buffer, 0, buffer.byteLength, null);
      if (length === 0) break;
      hash.update(buffer.subarray(0, length));
      byteLength += length;
      if (byteLength > maxBytes) throw new Error("file grew beyond its digest cap");
    }
  } finally { closeSync(fd); }
  return { sha256: hash.digest("hex"), byteLength };
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const joined = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function hashChunks(chunks: readonly Uint8Array[]): string {
  const hash = createHash("sha256");
  for (const chunk of chunks) hash.update(chunk);
  return hash.digest("hex");
}

async function collectUnbounded(stream: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of stream) {
    if (!(chunk instanceof Uint8Array) || total + chunk.byteLength > METADATA_BYTES) throw new Error("sandbox probe output exceeded its byte contract");
    chunks.push(new Uint8Array(chunk));
    total += chunk.byteLength;
  }
  return chunks;
}

function assertSealedJdkFile(mode: number, sealed: boolean, relativePath: string): void {
  if (sealed && ((mode & 0o222) !== 0 || (relativePath === "bin/java" && (mode & 0o111) === 0))) toolchainAbort("PreparationError", "JDK_SEAL", `JDK snapshot file mode is not sealed: ${relativePath}`);
}

function inspectJdk(rootPath: string, sealed = false): JdkDistributionManifest {
  let root: string;
  try { root = realpathSync(rootPath); } catch (cause) {
    toolchainAbort("PreparationError", "JDK_ROOT", "fixed JDK distribution root is unavailable", cause);
  }
  if (sealed && (lstatSync(root).mode & 0o222) !== 0) toolchainAbort("PreparationError", "JDK_SEAL", "JDK snapshot root is writable");
  const entries: JdkDistributionEntry[] = [];
  const visit = (directory: string, prefix: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const relativePath = prefix === "" ? name : `${prefix}/${name}`;
      const stat = lstatSync(path);
      if (stat.isDirectory()) {
        if (sealed && (stat.mode & 0o222) !== 0) toolchainAbort("PreparationError", "JDK_SEAL", `JDK snapshot directory is writable: ${relativePath}`);
        const actual = realpathSync(path);
        if (!pathInside(root, actual)) toolchainAbort("PreparationError", "JDK_ESCAPE", `JDK directory escapes its distribution root: ${relativePath}`);
        visit(path, relativePath);
      } else if (stat.isFile()) {
        assertSealedJdkFile(stat.mode, sealed, relativePath);
        const actual = realpathSync(path);
        if (!pathInside(root, actual)) toolchainAbort("PreparationError", "JDK_ESCAPE", `JDK file escapes its distribution root: ${relativePath}`);
        const digest = hashFile(path);
        entries.push({ kind: "FILE", path: relativePath, target: null, ...digest });
      } else if (stat.isSymbolicLink()) {
        const actual = realpathSync(path);
        if (!pathInside(root, actual)) toolchainAbort("PreparationError", "JDK_ESCAPE", `JDK symlink escapes its distribution root: ${relativePath}`);
        const target = relative(root, actual).split(sep).join("/") || ".";
        const targetBytes = new TextEncoder().encode(target);
        entries.push({ kind: "SYMLINK", path: relativePath, target, byteLength: targetBytes.byteLength, sha256: createHash("sha256").update(targetBytes).digest("hex") });
      } else {
        toolchainAbort("PreparationError", "JDK_ENTRY", `JDK contains a non-regular entry: ${relativePath}`);
      }
    }
  };
  visit(root, "");
  const java = entries.find((entry) => entry.path === "bin/java" && entry.kind === "FILE");
  if (!java) toolchainAbort("PreparationError", "JDK_JAVA", "JDK distribution has no regular bin/java executable");
  const manifest = createJdkDistributionManifest({
    vendor: FIXED_JDK_RUN_PROFILE.vendor,
    version: FIXED_JDK_RUN_PROFILE.version,
    javaExecutablePath: "bin/java",
    javaExecutableSha256: java.sha256,
    entries,
  });
  if (!manifest.ok) throw new ToolchainFailure(manifest.error);
  return manifest.value;
}

function sourceIdentity(path: string, domain: string, kind: "InvocationError" | "NormalizationError"): string {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.size > METADATA_BYTES) toolchainAbort(kind, "SOURCE_DRIFT", "model source is not a capped regular file");
  const source = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path));
  return canonicalIdentity(source, domain).sha256;
}

function readCappedMetadata(path: string): string {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.size > METADATA_BYTES) throw new Error("metadata is not a capped regular file");
  return readFileSync(path, "utf8");
}

function abort(
  kind: TlcArtifactStoreError["kind"],
  code: TlcArtifactStoreError["code"],
  message: string,
  cause?: unknown,
): never {
  throw new StoreFailure({ kind, code, message, ...(cause === undefined ? {} : { cause: String(cause) }) });
}

function syncDirectory(path: string): void {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseOwner(value: unknown): LockOwner | null {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
  const owner = value as Record<string, unknown>;
  if (!exactKeys(owner, ["host", "pid", "processStartedAt", "nonce", "createdAt", "descriptorIdentity"])) return null;
  if (typeof owner.host !== "string" || owner.host.length === 0) return null;
  if (!Number.isSafeInteger(owner.pid) || (owner.pid as number) <= 0) return null;
  if (typeof owner.processStartedAt !== "string" || owner.processStartedAt.length === 0) return null;
  if (!isUuid(owner.nonce) || !isUtcInstant(owner.createdAt)) return null;
  if (owner.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY) return null;
  return owner as unknown as LockOwner;
}

const receiptBody = (receipt: TlcArtifactReceipt) => ({
  schemaVersion: receipt.schemaVersion,
  descriptorIdentity: receipt.descriptorIdentity,
  actualSha256: receipt.actualSha256,
  byteLength: receipt.byteLength,
  cacheRef: receipt.cacheRef,
  acquiredAt: receipt.acquiredAt,
  jdkVersion: receipt.jdkVersion,
});

class FsTlcArtifactCache {
  readonly #namespace: string;
  readonly #cachePath: string;
  readonly #receiptPath: string;
  readonly #cacheRef: string;
  readonly #issuedArtifacts = new WeakSet<VerifiedTlcArtifact>();

  constructor(readonly root: string, private readonly dependencies: FsTlcToolchainDependencies) {
    this.#namespace = join(root, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY);
    this.#cachePath = join(this.#namespace, FIXED_TLC_ARTIFACT_DESCRIPTOR.fileName);
    this.#receiptPath = join(this.#namespace, "receipt.json");
    this.#cacheRef = `${FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY}/${FIXED_TLC_ARTIFACT_DESCRIPTOR.fileName}`;
  }

  #writeDurable(path: string, bytes: Uint8Array, exclusive = false): void {
    const temporary = `${path}.${this.dependencies.randomUuid()}.tmp`;
    const fd = openSync(temporary, "wx", 0o600);
    try {
      let offset = 0;
      while (offset < bytes.byteLength) offset += writeSync(fd, bytes, offset, bytes.byteLength - offset);
      fsyncSync(fd);
    } finally { closeSync(fd); }
    try {
      if (exclusive) linkSync(temporary, path);
      else renameSync(temporary, path);
      syncDirectory(dirname(path));
    } finally { if (existsSync(temporary)) unlinkSync(temporary); }
  }

  #readOwner(path: string): LockOwner {
    let parsed: unknown;
    try { parsed = JSON.parse(readCappedMetadata(path)); } catch (cause) {
      abort("CacheIntegrityError", "LOCK_INTEGRITY", "acquisition lock owner is unreadable", cause);
    }
    const owner = parseOwner(parsed);
    if (!owner) abort("CacheIntegrityError", "LOCK_INTEGRITY", "acquisition lock owner has a malformed strict schema");
    return owner;
  }

  #acquireLock(): string {
    mkdirSync(this.#namespace, { recursive: true });
    const lockPath = join(this.#namespace, ".acquire.lock");
    if (existsSync(lockPath)) {
      const owner = this.#readOwner(lockPath);
      const status = this.dependencies.liveness(owner);
      if (status !== "dead") abort("AcquisitionError", "LOCK_BUSY", `acquisition lock owner is ${status}`);
      const reread = this.#readOwner(lockPath);
      if (reread.nonce !== owner.nonce) abort("CacheIntegrityError", "LOCK_INTEGRITY", "dead acquisition lock owner changed during liveness verification");
      const quarantine = join(this.#namespace, `.dead-lock-${owner.nonce}`);
      if (existsSync(quarantine)) abort("CacheIntegrityError", "LOCK_INTEGRITY", "dead lock quarantine already exists");
      renameSync(lockPath, quarantine);
      syncDirectory(this.#namespace);
      const quarantined = this.#readOwner(quarantine);
      if (quarantined.nonce !== owner.nonce) {
        if (!existsSync(lockPath)) {
          renameSync(quarantine, lockPath);
          syncDirectory(this.#namespace);
        }
        abort("CacheIntegrityError", "LOCK_INTEGRITY", "dead acquisition lock changed before quarantine");
      }
      unlinkSync(quarantine);
      syncDirectory(this.#namespace);
    }
    const nonce = this.dependencies.randomUuid();
    const owner: LockOwner = {
      ...this.dependencies.owner,
      nonce,
      createdAt: this.dependencies.clock.utcNow(),
      descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    };
    if (!parseOwner(owner)) abort("CacheIntegrityError", "LOCK_INTEGRITY", "local acquisition owner is invalid");
    const staging = join(this.#namespace, `.lock-${nonce}.staging`);
    this.#writeDurable(staging, new TextEncoder().encode(JSON.stringify(owner)), true);
    try { linkSync(staging, lockPath); } catch (cause) {
      abort("AcquisitionError", "LOCK_BUSY", "acquisition lock was claimed concurrently", cause);
    } finally { if (existsSync(staging)) unlinkSync(staging); }
    syncDirectory(this.#namespace);
    return nonce;
  }

  #releaseLock(nonce: string): void {
    const lockPath = join(this.#namespace, ".acquire.lock");
    const owner = this.#readOwner(lockPath);
    if (owner.nonce !== nonce) abort("CacheIntegrityError", "LOCK_INTEGRITY", "acquisition lock ownership changed");
    const quarantine = join(this.#namespace, `.released-lock-${nonce}`);
    renameSync(lockPath, quarantine);
    syncDirectory(this.#namespace);
    unlinkSync(quarantine);
    syncDirectory(this.#namespace);
  }

  #reserve(nonce: string): string {
    const backing = join(this.#namespace, ".capacity.backing");
    const reservingPath = join(this.#namespace, ".capacity-reserving.json");
    const activePath = join(this.#namespace, ".capacity-active.json");
    const readRecord = (path: string, state: CapacityRecord["state"]): CapacityRecord => {
      let value: unknown;
      try { value = JSON.parse(readCappedMetadata(path)); } catch (cause) {
        abort("CacheIntegrityError", "CAPACITY", "capacity lifecycle record is unreadable", cause);
      }
      if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) abort("CacheIntegrityError", "CAPACITY", "capacity lifecycle record is malformed");
      const record = value as Record<string, unknown>;
      if (!exactKeys(record, ["descriptorIdentity", "ownerNonce", "bytes", "state"]) || record.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY || !isUuid(record.ownerNonce) || record.bytes !== FIXED_TLC_RESERVATION_BYTES || record.state !== state) abort("CacheIntegrityError", "CAPACITY", "capacity lifecycle record drifted");
      return record as unknown as CapacityRecord;
    };
    if (existsSync(activePath)) {
      const active = readRecord(activePath, "ACTIVE");
      if (!this.dependencies.reservation.isReserved(backing)) abort("CacheIntegrityError", "CAPACITY", "ACTIVE capacity claim has no physical reservation");
      if (existsSync(reservingPath)) {
        const reserving = readRecord(reservingPath, "RESERVING");
        if (reserving.ownerNonce !== active.ownerNonce) abort("CacheIntegrityError", "CAPACITY", "capacity lifecycle owners disagree");
        unlinkSync(reservingPath);
        syncDirectory(this.#namespace);
      }
      return backing;
    }
    if (existsSync(reservingPath)) {
      const reserving = readRecord(reservingPath, "RESERVING");
      if (!this.dependencies.reservation.isReserved(backing)) {
        if (existsSync(backing)) this.dependencies.reservation.release(backing);
        this.dependencies.reservation.reserve(backing, FIXED_TLC_RESERVATION_BYTES);
      }
      if (!this.dependencies.reservation.isReserved(backing)) abort("AcquisitionError", "CAPACITY", "physical reservation recovery failed");
      const active: CapacityRecord = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ownerNonce: reserving.ownerNonce, bytes: FIXED_TLC_RESERVATION_BYTES, state: "ACTIVE" };
      this.#writeDurable(activePath, new TextEncoder().encode(JSON.stringify(active)));
      this.dependencies.fault?.("after-capacity-claim");
      unlinkSync(reservingPath);
      syncDirectory(this.#namespace);
      return backing;
    }
    if (this.dependencies.reservation.isReserved(backing)) abort("CacheIntegrityError", "CAPACITY", "orphan physical reservation is still active");
    const available = this.dependencies.reservation.availableBytes(this.#namespace);
    if (!Number.isSafeInteger(available) || available < FIXED_TLC_RESERVATION_BYTES) {
      abort("AcquisitionError", "CAPACITY", "physical capacity is below required artifact plus reserve");
    }
    const reserving: CapacityRecord = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ownerNonce: nonce, bytes: FIXED_TLC_RESERVATION_BYTES, state: "RESERVING" };
    this.#writeDurable(reservingPath, new TextEncoder().encode(JSON.stringify(reserving)));
    this.dependencies.reservation.reserve(backing, FIXED_TLC_RESERVATION_BYTES);
    this.dependencies.fault?.("after-capacity-reserve");
    if (!this.dependencies.reservation.isReserved(backing)) abort("AcquisitionError", "CAPACITY", "physical reservation was not established");
    const claim: CapacityRecord = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, ownerNonce: nonce, bytes: FIXED_TLC_RESERVATION_BYTES, state: "ACTIVE" };
    this.#writeDurable(activePath, new TextEncoder().encode(JSON.stringify(claim)));
    this.dependencies.fault?.("after-capacity-claim");
    unlinkSync(reservingPath);
    syncDirectory(this.#namespace);
    return backing;
  }

  #releaseReservation(backing: string): void {
    const releasingPath = join(this.#namespace, ".capacity-releasing.json");
    const activePath = join(this.#namespace, ".capacity-active.json");
    const releasedPath = join(this.#namespace, ".capacity-released.json");
    const releasing = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, bytes: FIXED_TLC_RESERVATION_BYTES, state: "RELEASING", releasedAt: this.dependencies.clock.utcNow() };
    this.#writeDurable(releasingPath, new TextEncoder().encode(JSON.stringify(releasing)));
    if (this.dependencies.reservation.isReserved(backing)) this.dependencies.reservation.release(backing);
    this.dependencies.fault?.("after-capacity-release");
    if (this.dependencies.reservation.isReserved(backing)) abort("CacheIntegrityError", "CAPACITY", "physical reservation release was not verified");
    const receipt = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, bytes: FIXED_TLC_RESERVATION_BYTES, state: "RELEASED", at: releasing.releasedAt };
    this.#writeDurable(releasedPath, new TextEncoder().encode(JSON.stringify(receipt)));
    if (existsSync(activePath)) unlinkSync(activePath);
    unlinkSync(releasingPath);
    syncDirectory(this.#namespace);
  }

  #recoverReservationRelease(): void {
    const releasingPath = join(this.#namespace, ".capacity-releasing.json");
    if (!existsSync(releasingPath)) return;
    let value: unknown;
    try { value = JSON.parse(readCappedMetadata(releasingPath)); } catch (cause) {
      abort("CacheIntegrityError", "CAPACITY", "capacity release intent is unreadable", cause);
    }
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) abort("CacheIntegrityError", "CAPACITY", "capacity release intent is malformed");
    const releasing = value as Record<string, unknown>;
    if (!exactKeys(releasing, ["descriptorIdentity", "bytes", "state", "releasedAt"]) || releasing.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY || releasing.bytes !== FIXED_TLC_RESERVATION_BYTES || releasing.state !== "RELEASING" || !isUtcInstant(releasing.releasedAt)) abort("CacheIntegrityError", "CAPACITY", "capacity release intent drifted");
    const backing = join(this.#namespace, ".capacity.backing");
    if (this.dependencies.reservation.isReserved(backing)) this.dependencies.reservation.release(backing);
    if (this.dependencies.reservation.isReserved(backing)) abort("CacheIntegrityError", "CAPACITY", "physical reservation release recovery failed");
    const receipt = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, bytes: FIXED_TLC_RESERVATION_BYTES, state: "RELEASED", at: releasing.releasedAt };
    this.#writeDurable(join(this.#namespace, ".capacity-released.json"), new TextEncoder().encode(JSON.stringify(receipt)));
    const activePath = join(this.#namespace, ".capacity-active.json");
    if (existsSync(activePath)) unlinkSync(activePath);
    unlinkSync(releasingPath);
    syncDirectory(this.#namespace);
  }

  #persistFailure(code: string, cause: unknown, stagedPath?: string): void {
    let partialSha256: string | null = null;
    let partialLength = 0;
    if (stagedPath && existsSync(stagedPath)) {
      try {
        const digest = this.dependencies.digest.digest(stagedPath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
        partialSha256 = digest.sha256;
        partialLength = digest.byteLength;
      } catch { partialLength = statSync(stagedPath).size; }
    }
    const body = { descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, code, cause: String(cause), partialSha256, partialLength, at: this.dependencies.clock.utcNow() };
    const receipt = { ...body, failureIdentity: canonicalIdentity(body, "amadeus.formal-verif.tlc-acquisition-failure.v1").sha256 };
    this.#writeDurable(join(this.#namespace, "failure-receipt.json"), new TextEncoder().encode(JSON.stringify(receipt)));
    if (!stagedPath || !existsSync(stagedPath)) return;
    const quarantine = join(this.#namespace, ".failed-download.quarantine");
    if (existsSync(quarantine)) abort("CacheIntegrityError", "FILESYSTEM", "a second failed artifact quarantine is forbidden");
    renameSync(stagedPath, quarantine);
    syncDirectory(this.#namespace);
    unlinkSync(quarantine);
    syncDirectory(this.#namespace);
  }

  #parseReceipt(path: string): TlcArtifactReceipt {
    let parsed: unknown;
    try { parsed = JSON.parse(readCappedMetadata(path)); } catch (cause) {
      abort("CacheIntegrityError", "RECEIPT", "artifact receipt is unreadable", cause);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || Object.getPrototypeOf(parsed) !== Object.prototype) abort("CacheIntegrityError", "RECEIPT", "artifact receipt is not a plain object");
    const receipt = parsed as Record<string, unknown>;
    if (!exactKeys(receipt, ["schemaVersion", "descriptorIdentity", "actualSha256", "byteLength", "cacheRef", "acquiredAt", "jdkVersion", "receiptIdentity"])) abort("CacheIntegrityError", "RECEIPT", "artifact receipt fields drifted");
    if (receipt.schemaVersion !== 1 || receipt.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY || receipt.actualSha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256 || receipt.cacheRef !== this.#cacheRef || !Number.isSafeInteger(receipt.byteLength) || (receipt.byteLength as number) <= 0 || !isUtcInstant(receipt.acquiredAt) || receipt.jdkVersion !== this.dependencies.jdkVersion || typeof receipt.receiptIdentity !== "string") abort("CacheIntegrityError", "RECEIPT", "artifact receipt values drifted");
    const typed = receipt as unknown as TlcArtifactReceipt;
    if (canonicalIdentity(receiptBody(typed), "amadeus.formal-verif.tlc-artifact-receipt.v1").sha256 !== typed.receiptIdentity) abort("CacheIntegrityError", "RECEIPT", "artifact receipt identity drifted");
    return typed;
  }

  #recoverPublished(): void {
    const receiptStaging = join(this.#namespace, ".receipt.staging");
    if (!existsSync(this.#cachePath) && existsSync(this.#receiptPath)) {
      abort("CacheIntegrityError", "CACHE_MISSING", "artifact receipt exists without its immutable cache; acquisition does not download");
    }
    if (existsSync(this.#cachePath) && !existsSync(this.#receiptPath)) {
      if (!existsSync(receiptStaging)) abort("CacheIntegrityError", "RECEIPT", "published cache has no durable receipt");
      const receipt = this.#parseReceipt(receiptStaging);
      const digest = this.dependencies.digest.digest(this.#cachePath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
      if (digest.sha256 !== receipt.actualSha256 || digest.byteLength !== receipt.byteLength) abort("CacheIntegrityError", "CACHE_COLLISION", "published cache differs from staged receipt");
      linkSync(receiptStaging, this.#receiptPath);
      const receiptFd = openSync(this.#receiptPath, "r");
      try { fsyncSync(receiptFd); } finally { closeSync(receiptFd); }
      syncDirectory(this.#namespace);
      unlinkSync(receiptStaging);
      syncDirectory(this.#namespace);
    }
    if (!existsSync(this.#cachePath) && existsSync(receiptStaging)) {
      this.#persistFailure("ORPHAN_RECEIPT", "receipt staging exists without published cache");
      unlinkSync(receiptStaging);
      syncDirectory(this.#namespace);
    }
    const downloadStaging = join(this.#namespace, ".download.staging");
    if (existsSync(downloadStaging)) this.#persistFailure("ORPHAN_STAGING", "download staging survived a prior owner", downloadStaging);
  }

  #validateUrl(value: string): URL {
    let url: URL;
    try { url = new URL(value); } catch (cause) { abort("AcquisitionError", "REDIRECT", "artifact URL is invalid", cause); }
    if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "" || !FIXED_TLC_ARTIFACT_DESCRIPTOR.redirectOrigins.includes(url.hostname as never)) abort("AcquisitionError", "REDIRECT", "artifact URL is outside the fixed HTTPS origin allowlist");
    return url;
  }

  async #beforeDeadline<T>(operation: () => PromiseLike<T>, deadlineMs: number, message: string): Promise<T> {
    const remaining = deadlineMs - this.dependencies.clock.nowMs();
    if (remaining < 0) abort("AcquisitionError", "DEADLINE", message);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([Promise.resolve().then(operation), new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new StoreFailure({ kind: "AcquisitionError", code: "DEADLINE", message })), Math.max(1, remaining));
      })]);
    } finally { if (timeout !== undefined) clearTimeout(timeout); }
  }

  async #nextBodyChunk(
    iterator: AsyncIterator<Uint8Array>,
    bodyDeadlineMs: number,
  ): Promise<IteratorResult<Uint8Array>> {
    const next = await this.#beforeDeadline(() => iterator.next(), bodyDeadlineMs, "artifact body deadline expired while awaiting transport bytes");
    if (this.dependencies.clock.nowMs() > bodyDeadlineMs) abort("AcquisitionError", "DEADLINE", "artifact body deadline expired");
    return next;
  }

  async #download(stagedPath: string): Promise<{ byteLength: number; sha256: string }> {
    const startedAtMs = this.dependencies.clock.nowMs();
    const deadlines = { startedAtMs, connectDeadlineMs: startedAtMs + CONNECT_MS, headersDeadlineMs: startedAtMs + HEADERS_MS, bodyDeadlineMs: startedAtMs + BODY_MS };
    let url = this.#validateUrl(FIXED_TLC_ARTIFACT_DESCRIPTOR.url);
    let response: ArtifactNetworkResponse | undefined;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      try { response = await this.#beforeDeadline(() => this.dependencies.network.request({ url: url.href, ...deadlines, headers: { accept: "application/octet-stream" } }), deadlines.headersDeadlineMs, "artifact header deadline expired while awaiting transport response"); }
      catch (cause) { if (cause instanceof StoreFailure) throw cause; abort("AcquisitionError", "NETWORK", "artifact transport failed", cause); }
      if (response.connectedAtMs > deadlines.connectDeadlineMs || response.headersAtMs > deadlines.headersDeadlineMs) abort("AcquisitionError", "DEADLINE", "artifact connect or header deadline expired");
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      if (redirects === MAX_REDIRECTS) abort("AcquisitionError", "REDIRECT", "artifact redirect limit exceeded");
      const location = Object.entries(response.headers).find(([name]) => name.toLowerCase() === "location")?.[1];
      if (!location) abort("AcquisitionError", "REDIRECT", "artifact redirect has no Location header");
      const redirectIterator = response.body[Symbol.asyncIterator]();
      if (redirectIterator.return) await this.#beforeDeadline(() => Promise.resolve(redirectIterator.return!()), deadlines.bodyDeadlineMs, "artifact body deadline expired while closing redirect transport");
      url = this.#validateUrl(new URL(location, url).href);
    }
    if (response?.status !== 200) abort("AcquisitionError", "NETWORK", `artifact response status is ${response?.status ?? "missing"}`);
    const lengthValue = Object.entries(response.headers).find(([name]) => name.toLowerCase() === "content-length")?.[1];
    const expectedLength = lengthValue === undefined ? null : Number(lengthValue);
    if (expectedLength !== null && (!Number.isSafeInteger(expectedLength) || expectedLength <= 0 || expectedLength > FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes)) abort("AcquisitionError", "BODY_LENGTH", "artifact Content-Length is outside the fixed cap");
    const fd = openSync(stagedPath, "wx", 0o600);
    const streamingDigest = this.dependencies.digest.createStreamingDigest();
    let total = 0;
    try {
      const iterator = response.body[Symbol.asyncIterator]();
      for (;;) {
        const next = await this.#nextBodyChunk(iterator, deadlines.bodyDeadlineMs);
        if (next.done) break;
        const chunk = next.value;
        if (!(chunk instanceof Uint8Array)) abort("AcquisitionError", "NETWORK", "artifact transport yielded a non-byte chunk");
        if (total + chunk.byteLength > FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes) abort("AcquisitionError", "BODY_LENGTH", "artifact body exceeds the fixed hard cap");
        for (let offset = 0; offset < chunk.byteLength; offset += BUFFER_BYTES) {
          const length = Math.min(BUFFER_BYTES, chunk.byteLength - offset);
          const written = writeSync(fd, chunk, offset, length);
          if (written !== length) abort("AcquisitionError", "FILESYSTEM", "artifact staging write was partial");
        }
        streamingDigest.update(chunk);
        total += chunk.byteLength;
      }
      fsyncSync(fd);
    } finally { closeSync(fd); }
    this.dependencies.fault?.("after-file-sync");
    if (expectedLength !== null && total !== expectedLength) abort("AcquisitionError", "BODY_LENGTH", "artifact body ended before Content-Length");
    const streamedSha256 = streamingDigest.digest();
    const reread = this.dependencies.digest.digest(stagedPath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
    if (reread.byteLength !== total || streamedSha256 !== reread.sha256 || streamedSha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256) abort("AcquisitionError", "CHECKSUM", "artifact verification reread does not match the streamed fixed SHA-256");
    return reread;
  }

  #publish(stagedPath: string, digest: { byteLength: number; sha256: string }): TlcArtifactReceipt {
    const acquiredAt = this.dependencies.clock.utcNow();
    const body = { schemaVersion: 1 as const, descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, actualSha256: digest.sha256, byteLength: digest.byteLength, cacheRef: this.#cacheRef, acquiredAt, jdkVersion: this.dependencies.jdkVersion };
    const receipt: TlcArtifactReceipt = { ...body, receiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.tlc-artifact-receipt.v1").sha256 };
    const receiptStaging = join(this.#namespace, ".receipt.staging");
    this.#writeDurable(receiptStaging, new TextEncoder().encode(JSON.stringify(receipt)), true);
    try { linkSync(stagedPath, this.#cachePath); }
    catch (cause) {
      if (!existsSync(this.#cachePath)) abort("CacheIntegrityError", "FILESYSTEM", "exclusive artifact publish failed", cause);
      const existing = this.dependencies.digest.digest(this.#cachePath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
      if (existing.sha256 !== digest.sha256 || existing.byteLength !== digest.byteLength) abort("CacheIntegrityError", "CACHE_COLLISION", "same cache path contains different bytes");
    }
    const cacheFd = openSync(this.#cachePath, "r");
    try { fsyncSync(cacheFd); } finally { closeSync(cacheFd); }
    syncDirectory(this.#namespace);
    this.dependencies.fault?.("after-publish-sync");
    linkSync(receiptStaging, this.#receiptPath);
    const receiptFd = openSync(this.#receiptPath, "r");
    try { fsyncSync(receiptFd); } finally { closeSync(receiptFd); }
    syncDirectory(this.#namespace);
    unlinkSync(receiptStaging);
    if (existsSync(stagedPath)) unlinkSync(stagedPath);
    syncDirectory(this.#namespace);
    this.dependencies.fault?.("after-receipt-sync");
    return receipt;
  }

  #issueArtifact(receipt: TlcArtifactReceipt, digest: { byteLength: number; sha256: string }): VerifiedTlcArtifact {
    const artifact: VerifiedTlcArtifact = Object.freeze({
      kind: "VerifiedTlcArtifact",
      descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      actualSha256: digest.sha256,
      byteLength: digest.byteLength,
      cachePath: this.#cachePath,
      receiptIdentity: receipt.receiptIdentity,
    });
    this.#issuedArtifacts.add(artifact);
    return artifact;
  }

  verifyOffline(): Result<VerifiedTlcArtifact, TlcArtifactStoreError> {
    try {
      if (!existsSync(this.#cachePath) || !existsSync(this.#receiptPath)) abort("CacheIntegrityError", "CACHE_MISSING", "fixed TLC cache is unavailable; offline verification does not download");
      const receipt = this.#parseReceipt(this.#receiptPath);
      const digest = this.dependencies.digest.digest(this.#cachePath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
      if (digest.sha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256 || digest.sha256 !== receipt.actualSha256 || digest.byteLength !== receipt.byteLength) abort("CacheIntegrityError", "CACHE_COLLISION", "fixed TLC cache bytes drifted");
      return { ok: true, value: this.#issueArtifact(receipt, digest) };
    } catch (cause) {
      return { ok: false, error: cause instanceof StoreFailure ? cause.value : { kind: "CacheIntegrityError", code: "FILESYSTEM", message: "offline cache verification failed", cause: String(cause) } };
    }
  }

  async acquire(): Promise<Result<VerifiedTlcArtifact, TlcArtifactStoreError>> {
    let lockNonce: string | undefined;
    let backing: string | undefined;
    const stagedPath = join(this.#namespace, ".download.staging");
    let outcome: Result<VerifiedTlcArtifact, TlcArtifactStoreError>;
    try {
      lockNonce = this.#acquireLock();
      this.#recoverPublished();
      this.#recoverReservationRelease();
      if (existsSync(this.#cachePath)) {
        outcome = this.verifyOffline();
      } else {
        backing = this.#reserve(lockNonce);
        const digest = await this.#download(stagedPath);
        const receipt = this.#publish(stagedPath, digest);
        outcome = { ok: true, value: this.#issueArtifact(receipt, digest) };
      }
    } catch (cause) {
      const failure = cause instanceof StoreFailure ? cause.value : { kind: "AcquisitionError" as const, code: "FILESYSTEM" as const, message: "fixed TLC acquisition failed", cause: String(cause) };
      if (lockNonce) {
        try { this.#persistFailure(failure.code, failure.cause ?? failure.message, existsSync(stagedPath) ? stagedPath : undefined); }
        catch (cleanupCause) { failure.cause = `${failure.cause ?? failure.message}; cleanup: ${String(cleanupCause)}`; }
      }
      outcome = { ok: false, error: failure };
    }
    if (backing) {
      try { this.#releaseReservation(backing); }
      catch (cause) { outcome = { ok: false, error: cause instanceof StoreFailure ? cause.value : { kind: "CacheIntegrityError", code: "CAPACITY", message: "physical reservation release failed", cause: String(cause) } }; }
    }
    if (lockNonce) {
      try { this.#releaseLock(lockNonce); }
      catch (cause) { outcome = { ok: false, error: cause instanceof StoreFailure ? cause.value : { kind: "CacheIntegrityError", code: "LOCK_INTEGRITY", message: "acquisition lock release failed", cause: String(cause) } }; }
    }
    return outcome!;
  }

  verifyIssuedArtifact(artifact: VerifiedTlcArtifact, kind: "PreparationError" | "InvocationError" = "PreparationError"): void {
    if (!this.#issuedArtifacts.has(artifact) || artifact.cachePath !== this.#cachePath) {
      toolchainAbort(kind, "ARTIFACT_CAPABILITY", "artifact was not issued by this toolchain instance");
    }
    const receipt = this.#parseReceipt(this.#receiptPath);
    const digest = this.dependencies.digest.digest(this.#cachePath, FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes);
    if (artifact.kind !== "VerifiedTlcArtifact" || artifact.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY || artifact.receiptIdentity !== receipt.receiptIdentity || artifact.actualSha256 !== digest.sha256 || artifact.byteLength !== digest.byteLength || digest.sha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256) {
      toolchainAbort(kind, "ARTIFACT_DRIFT", "issued artifact no longer matches its immutable cache and receipt");
    }
  }
}

class FsTlcRuntime {
  readonly #issuedJdks = new WeakSet<VerifiedJdkSnapshot>();
  readonly #issuedSandboxes = new WeakMap<VerifiedSandbox, SandboxProbeReceipt>();
  readonly #issuedPrepared = new WeakSet<PreparedTlcRun>();
  readonly #issuedOutcomes = new WeakMap<RawTlcOutcome, PreparedTlcRun>();
  #jdkSnapshot: VerifiedJdkSnapshot | undefined;

  constructor(
    private readonly artifacts: FsTlcArtifactCache,
    private readonly dependencies: FsTlcToolchainDependencies,
  ) {}

  async #reuseIssuedJdk(distribution: JdkDistributionManifest, snapshotRoot: string, deadlineMs: number): Promise<VerifiedJdkSnapshot | undefined> {
    const issued = this.#jdkSnapshot;
    if (!issued) return undefined;
    const rebuilt = inspectJdk(snapshotRoot, true);
    if (rebuilt.manifestIdentity !== distribution.manifestIdentity || rebuilt.manifestIdentity !== issued.manifestIdentity) toolchainAbort("PreparationError", "JDK_DRIFT", "sealed JDK snapshot changed after issuance");
    if (await this.#verifyJavaVersion(issued, deadlineMs, "PreparationError") !== issued.javaVersionReceiptIdentity) toolchainAbort("PreparationError", "JDK_VERSION_DRIFT", "java version receipt changed after issuance");
    return issued;
  }

  async #snapshotJdk(deadlineMs: number): Promise<VerifiedJdkSnapshot> {
    const distributionRoot = this.dependencies.jdkDistributionRoot;
    const snapshotRoot = this.dependencies.jdkSnapshotRoot;
    if (!distributionRoot || !snapshotRoot) toolchainAbort("PreparationError", "JDK_CONFIGURATION", "JDK distribution and snapshot roots are required");
    const distribution = inspectJdk(distributionRoot);
    const issued = await this.#reuseIssuedJdk(distribution, snapshotRoot, deadlineMs);
    if (issued) return issued;
    if (existsSync(snapshotRoot)) toolchainAbort("PreparationError", "JDK_SNAPSHOT_EXISTS", "JDK snapshot root already exists before issuance");
    mkdirSync(snapshotRoot, { recursive: true, mode: 0o700 });
    const directories = new Set<string>([snapshotRoot]);
    for (const entry of distribution.entries) {
      const destination = join(snapshotRoot, ...entry.path.split("/"));
      mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
      for (let directory = dirname(destination); pathInside(snapshotRoot, directory); directory = dirname(directory)) {
        directories.add(directory);
        if (directory === snapshotRoot) break;
      }
      if (entry.kind === "FILE") {
        copyFileSync(join(distributionRoot, ...entry.path.split("/")), destination);
        chmodSync(destination, entry.path === distribution.javaExecutablePath ? 0o555 : 0o444);
      } else {
        const target = entry.target === "." ? snapshotRoot : join(snapshotRoot, ...entry.target!.split("/"));
        symlinkSync(relative(dirname(destination), target) || ".", destination);
      }
    }
    for (const directory of [...directories].sort((left, right) => right.length - left.length)) chmodSync(directory, 0o555);
    const rebuilt = inspectJdk(snapshotRoot, true);
    if (rebuilt.manifestIdentity !== distribution.manifestIdentity) toolchainAbort("PreparationError", "JDK_COPY", "sealed JDK snapshot differs from its source manifest");
    const location = { snapshotRoot: resolve(snapshotRoot), javaExecutablePath: distribution.javaExecutablePath };
    const javaVersionReceiptIdentity = await this.#verifyJavaVersion(location, deadlineMs, "PreparationError");
    const jdk: VerifiedJdkSnapshot = Object.freeze({
      kind: "VerifiedJdkSnapshot",
      manifest: distribution,
      manifestIdentity: distribution.manifestIdentity,
      snapshotIdentity: createJdkSnapshotIdentity(distribution, javaVersionReceiptIdentity),
      javaVersionReceiptIdentity,
      ...location,
      verifiedAt: this.dependencies.clock.utcNow(),
    });
    this.#issuedJdks.add(jdk);
    this.#jdkSnapshot = jdk;
    return jdk;
  }

  async #probeSandbox(deadlineMs: number, checkedAt: string, kind: "PreparationError" | "InvocationError", publishReserveMs = 0): Promise<SandboxProbeReceipt> {
    const provider = this.dependencies.sandboxProvider;
    if (!provider?.available()) toolchainAbort(kind, "SANDBOX_UNAVAILABLE", "Darwin sandbox-exec provider is unavailable");
    const observations: SandboxProbeObservation[] = [];
    const absoluteDeadlineAt = this.dependencies.clock.nowMs() + deadlineMs;
    for (const probeKind of ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"] as const) {
      const absoluteRemainingMs = absoluteDeadlineAt - this.dependencies.clock.nowMs();
      const suiteRemainingMs = publishReserveMs > 0
        ? (this.dependencies.suiteRemainingMs?.() ?? absoluteRemainingMs + publishReserveMs) - publishReserveMs
        : absoluteRemainingMs;
      const probeDeadlineMs = Math.min(absoluteRemainingMs, suiteRemainingMs, SANDBOX_PROBE_MS);
      if (!Number.isSafeInteger(probeDeadlineMs) || probeDeadlineMs <= 0) toolchainAbort(kind, "DEADLINE", "sandbox probes cannot consume the evidence publish reserve");
      try {
        observations.push(await provider.probe(probeKind, { executable: "/usr/bin/sandbox-exec", profile: DARWIN_NETWORK_DENY_PROFILE, deadlineMs: probeDeadlineMs }));
      } catch (cause) { toolchainAbort(kind, "SANDBOX_PROBE", `${probeKind} denial probe failed`, cause); }
    }
    const receipt = createSandboxProbeReceipt({
      providerIdentity: DARWIN_SANDBOX_PROVIDER_IDENTITY,
      policyIdentity: DARWIN_NETWORK_DENY_POLICY_IDENTITY,
      checkedAt,
      probes: observations,
    });
    if (!receipt.ok) toolchainAbort(kind, "SANDBOX_PROBE", receipt.error.message);
    return receipt.value;
  }

  async #preflightSandbox(deadlineMs: number): Promise<VerifiedSandbox> {
    const receipt = await this.#probeSandbox(deadlineMs, this.dependencies.clock.utcNow(), "PreparationError");
    const sandbox: VerifiedSandbox = Object.freeze({
      kind: "VerifiedSandbox",
      providerIdentity: receipt.providerIdentity,
      policyIdentity: receipt.policyIdentity,
      receiptIdentity: receipt.receiptIdentity,
      checkedAt: receipt.checkedAt,
    });
    this.#issuedSandboxes.set(sandbox, receipt);
    return sandbox;
  }

  async #verifyJavaVersion(jdk: Pick<VerifiedJdkSnapshot, "snapshotRoot" | "javaExecutablePath">, deadlineMs: number, kind: "PreparationError" | "InvocationError"): Promise<string> {
    const port = this.dependencies.javaVersion;
    if (!port) toolchainAbort(kind, "JDK_VERSION_UNAVAILABLE", "java version inspection port is unavailable");
    const expectedExecutable = resolve(jdk.snapshotRoot, jdk.javaExecutablePath);
    let receipt: JavaVersionReceipt;
    try { receipt = await port.inspect({ javaExecutablePath: expectedExecutable, javaHome: jdk.snapshotRoot, deadlineMs: Math.min(deadlineMs, 5_000) }); }
    catch (cause) { toolchainAbort(kind, "JDK_VERSION", "java version inspection failed", cause); }
    if (receipt.executableRealpath !== realpathSync(expectedExecutable) || !/^openjdk version "26\.0\.1(?:"|\+)/m.test(receipt.output) || !receipt.output.includes("OpenJDK")) toolchainAbort(kind, "JDK_VERSION", "java realpath, OpenJDK vendor, or 26.0.1 version output drifted");
    return canonicalIdentity(receipt, "amadeus.formal-verif.jdk-version-receipt.v1").sha256;
  }

  #verifyCanonicalSources(modulePath: string, cfgPath: string, cwd: string, kind: "InvocationError" | "NormalizationError"): void {
    const actualCwd = realpathSync(cwd);
    if (actualCwd !== cwd || !lstatSync(cwd).isDirectory()) toolchainAbort(kind, "WORKSPACE_PATH", "closed runtime workspace changed after preparation");
    for (const path of [modulePath, cfgPath]) {
      const actual = realpathSync(path);
      if (actual !== path || !pathInside(actualCwd, actual) || !lstatSync(path).isFile()) toolchainAbort(kind, "WORKSPACE_PATH", "canonical model or cfg path changed after preparation");
    }
  }

  #verifyStandardModuleDirectory(cwd: string, create: boolean, kind: "PreparationError" | "InvocationError" | "NormalizationError"): string {
    const directory = join(cwd, ".tlc-stdlib");
    if (create && !existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
    if (!existsSync(directory) || realpathSync(directory) !== directory || !lstatSync(directory).isDirectory() || (lstatSync(directory).mode & 0o077) !== 0 || readdirSync(directory).length !== 0) toolchainAbort(kind, "STDLIB_ORIGIN", "isolated standard-module directory is missing, unsafe, or not empty");
    for (const name of ["Naturals", "Sequences", "FiniteSets", "TLC"]) if (existsSync(join(cwd, `${name}.tla`))) toolchainAbort(kind, "STDLIB_ORIGIN", "workspace shadows a standard module");
    return directory;
  }

  async prepare(input: TlcPrepareInput): Promise<Result<PreparedTlcRun, TlcToolchainError>> {
    try {
      this.artifacts.verifyIssuedArtifact(input.artifact);
      const workspaceRoot = this.dependencies.workspaceRoot;
      if (!workspaceRoot) toolchainAbort("PreparationError", "WORKSPACE_CONFIGURATION", "closed runtime workspace root is required");
      const actualWorkspace = realpathSync(workspaceRoot);
      const canonicalPaths = [input.modulePath, input.cfgPath].map((path) => {
        const actual = realpathSync(path);
        if (!pathInside(actualWorkspace, actual) || !lstatSync(actual).isFile()) toolchainAbort("PreparationError", "WORKSPACE_PATH", "model and cfg must be regular files inside the closed workspace");
        return actual;
      });
      const [modulePath, cfgPath] = canonicalPaths as [string, string];
      const standardModuleDirectory = this.#verifyStandardModuleDirectory(actualWorkspace, true, "PreparationError");
      const model = validateFrozenTlaModelReceipt(input.modelReceipt);
      if (!model.ok) toolchainAbort("PreparationError", "MODEL_RECEIPT", model.error.message);
      if (lstatSync(modulePath).size !== model.value.moduleBytes.byteLength || lstatSync(cfgPath).size !== model.value.cfgBytes.byteLength) toolchainAbort("PreparationError", "SOURCE_IDENTITY", "canonical module or cfg byte length differs from the validated frozen model");
      const moduleBytes = new Uint8Array(readFileSync(modulePath));
      const cfgBytes = new Uint8Array(readFileSync(cfgPath));
      const bytesEqual = (actual: Uint8Array, expected: Uint8Array) => actual.byteLength === expected.byteLength && actual.every((byte, index) => byte === expected[index]);
      if (!bytesEqual(moduleBytes, model.value.moduleBytes) || !bytesEqual(cfgBytes, model.value.cfgBytes)) toolchainAbort("PreparationError", "SOURCE_IDENTITY", "canonical module or cfg bytes differ from the validated frozen model");
      const jdk = await this.#snapshotJdk(input.deadlineMs);
      const sandbox = await this.#preflightSandbox(input.deadlineMs);
      const javaPath = join(jdk.snapshotRoot, jdk.javaExecutablePath);
      const argv = [javaPath, ...FIXED_JDK_RUN_PROFILE.jvmArgs, `-Djava.io.tmpdir=${standardModuleDirectory}`, "-cp", input.artifact.cachePath, "tlc2.TLC", "-workers", "1", "-tool", "-config", cfgPath, modulePath];
      const manifest = createTlcRunManifest({ ...input, modulePath, cfgPath, jdk, sandbox, argv, cwd: actualWorkspace });
      if (!manifest.ok) throw new ToolchainFailure(manifest.error);
      const environment: TlcClosedEnvironment = Object.freeze({ JAVA_HOME: jdk.snapshotRoot, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" });
      const prepared: PreparedTlcRun = Object.freeze({ artifact: input.artifact, jdk, sandbox, modelReceipt: input.modelReceipt, manifest: manifest.value, environment });
      this.#issuedPrepared.add(prepared);
      return { ok: true, value: prepared };
    } catch (cause) {
      return { ok: false, error: cause instanceof ToolchainFailure ? cause.value : { kind: "PreparationError", code: "FILESYSTEM", message: "TLC runtime preparation failed", cause: String(cause) } };
    }
  }

  async run(prepared: PreparedTlcRun): Promise<Result<RawTlcOutcome, TlcToolchainError>> {
    if (!this.#issuedPrepared.has(prepared)) {
      return { ok: false, error: { kind: "InvocationError", code: "CAPABILITY", message: "prepared run was not issued by this toolchain instance" } };
    }
    const publishReserveMs = this.dependencies.evidencePublishReserveMs;
    const startingRemainingMs = this.dependencies.suiteRemainingMs?.() ?? prepared.manifest.deadlineMs;
    if (!Number.isSafeInteger(publishReserveMs) || publishReserveMs! <= 0 || !Number.isSafeInteger(startingRemainingMs) || startingRemainingMs <= publishReserveMs!) return { ok: false, error: { kind: "InvocationError", code: "DEADLINE", message: "suite budget cannot cover the fixed evidence publish reserve" } };
    try {
      this.artifacts.verifyIssuedArtifact(prepared.artifact, "InvocationError");
      this.#verifyCanonicalSources(prepared.manifest.modulePath, prepared.manifest.cfgPath, prepared.manifest.cwd, "InvocationError");
      this.#verifyStandardModuleDirectory(prepared.manifest.cwd, false, "InvocationError");
      if (sourceIdentity(prepared.manifest.modulePath, "amadeus.formal-verif.tla.module.v1", "InvocationError") !== prepared.manifest.moduleIdentity || sourceIdentity(prepared.manifest.cfgPath, "amadeus.formal-verif.tla.cfg.v1", "InvocationError") !== prepared.manifest.cfgIdentity) toolchainAbort("InvocationError", "SOURCE_DRIFT", "module or cfg bytes changed before spawn");
      if (!this.#issuedJdks.has(prepared.jdk)) toolchainAbort("InvocationError", "JDK_CAPABILITY", "JDK snapshot was not issued by this toolchain instance");
      let rebuilt: JdkDistributionManifest;
      try { rebuilt = inspectJdk(prepared.jdk.snapshotRoot, true); }
      catch (cause) { toolchainAbort("InvocationError", "JDK_DRIFT", "sealed JDK snapshot cannot be reverified", cause); }
      if (rebuilt.manifestIdentity !== prepared.jdk.manifestIdentity || createJdkSnapshotIdentity(rebuilt, prepared.jdk.javaVersionReceiptIdentity) !== prepared.jdk.snapshotIdentity) toolchainAbort("InvocationError", "JDK_DRIFT", "sealed JDK snapshot changed before spawn");
      if (await this.#verifyJavaVersion(prepared.jdk, Math.min(prepared.manifest.deadlineMs, startingRemainingMs - publishReserveMs!), "InvocationError") !== prepared.jdk.javaVersionReceiptIdentity) toolchainAbort("InvocationError", "JDK_VERSION_DRIFT", "java version receipt changed before spawn");
      const sandboxReceipt = this.#issuedSandboxes.get(prepared.sandbox);
      if (!sandboxReceipt) toolchainAbort("InvocationError", "SANDBOX_CAPABILITY", "sandbox receipt was not issued by this toolchain instance");
      const rebuiltSandbox = createSandboxProbeReceipt({ providerIdentity: sandboxReceipt.providerIdentity, policyIdentity: sandboxReceipt.policyIdentity, checkedAt: sandboxReceipt.checkedAt, probes: sandboxReceipt.probes });
      if (!rebuiltSandbox.ok || rebuiltSandbox.value.receiptIdentity !== prepared.sandbox.receiptIdentity) toolchainAbort("InvocationError", "SANDBOX_DRIFT", "sandbox denial receipt changed before spawn");
      const freshSandbox = await this.#probeSandbox(Math.min(prepared.manifest.deadlineMs, startingRemainingMs) - publishReserveMs!, sandboxReceipt.checkedAt, "InvocationError", publishReserveMs);
      if (freshSandbox.receiptIdentity !== sandboxReceipt.receiptIdentity) toolchainAbort("InvocationError", "SANDBOX_DRIFT", "fresh sandbox enforcement differs from the prepared receipt");
    } catch (cause) {
      return { ok: false, error: cause instanceof ToolchainFailure ? cause.value : { kind: "InvocationError", code: "FILESYSTEM", message: "TLC pre-spawn verification failed", cause: String(cause) } };
    }
    const processes = this.dependencies.process;
    if (!processes) return { ok: false, error: { kind: "InvocationError", code: "UNAVAILABLE", message: "runtime process execution is unavailable" } };
    const remainingAfterVerification = this.dependencies.suiteRemainingMs?.() ?? startingRemainingMs;
    const duration = Math.min(prepared.manifest.deadlineMs, startingRemainingMs - publishReserveMs!, remainingAfterVerification - publishReserveMs!, 180_000);
    if (!Number.isSafeInteger(duration) || duration <= 0) return { ok: false, error: { kind: "InvocationError", code: "DEADLINE", message: "suite deadline is already exhausted" } };
    const startedAtMs = this.dependencies.clock.nowMs();
    let child: TlcChildProcessPort;
    try {
      child = processes.spawn({
        argv: ["/usr/bin/sandbox-exec", "-p", DARWIN_NETWORK_DENY_PROFILE, ...prepared.manifest.argv],
        cwd: prepared.manifest.cwd,
        environment: prepared.environment,
        shell: false,
        processGroup: true,
      });
    } catch (cause) {
      return { ok: false, error: { kind: "InvocationError", code: "SPAWN", message: "sandboxed TLC process did not spawn", cause: String(cause) } };
    }
    let outputLimitExceeded = false;
    let signalOutputLimit!: () => void;
    const outputLimit = new Promise<void>((resolve) => { signalOutputLimit = resolve; });
    let outputFailure: unknown;
    let signalOutputFailure!: () => void;
    const failedOutput = new Promise<void>((resolve) => { signalOutputFailure = resolve; });
    const collect = async (stream: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> => {
      const chunks: Uint8Array[] = [];
      let total = 0;
      for await (const source of stream) {
        if (!(source instanceof Uint8Array)) toolchainAbort("InvocationError", "OUTPUT", "child process yielded a non-byte stream chunk");
        const remaining = MAX_TLC_STREAM_BYTES - total;
        if (source.byteLength > remaining) {
          if (remaining > 0) chunks.push(new Uint8Array(source.subarray(0, remaining)));
          outputLimitExceeded = true;
          signalOutputLimit();
          break;
        }
        chunks.push(new Uint8Array(source));
        total += source.byteLength;
      }
      return chunks;
    };
    const safelyCollect = async (stream: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> => {
      try { return await collect(stream); }
      catch (cause) { outputFailure = cause; signalOutputFailure(); return []; }
    };
    const stdout = safelyCollect(child.stdout);
    const stderr = safelyCollect(child.stderr);
    const streams = Promise.all([stdout, stderr]);
    const status = child.wait();
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = this.dependencies.timer
      ? this.dependencies.timer.wait(duration)
      : new Promise<void>((resolve) => { deadlineTimer = setTimeout(resolve, duration); });
    try {
      const first = await Promise.race([
        status.then((value) => ({ kind: "EXIT" as const, value })),
        deadline.then(() => ({ kind: "TIMEOUT" as const })),
        outputLimit.then(() => ({ kind: "OUTPUT" as const })),
        failedOutput.then(() => ({ kind: "OUTPUT_FAILURE" as const })),
      ]);
      let finalStatus: TlcProcessStatus;
      const timedOut = first.kind === "TIMEOUT";
      let killed = false;
      if (first.kind === "EXIT") {
        finalStatus = first.value;
      } else {
        let term: TlcProcessStatus | null = null;
        try {
          await child.signalGroup("SIGTERM");
          term = await this.#waitForExit(status, 5_000);
        } catch { /* KILL below is mandatory. */ }
        if (term) finalStatus = term;
        else {
          await child.signalGroup("SIGKILL");
          killed = true;
          const killedStatus = await this.#waitForExit(status, 5_000);
          if (!killedStatus) toolchainAbort("InvocationError", "PROCESS_CLEANUP", "TLC process group survived TERM and KILL grace periods");
          finalStatus = killedStatus;
        }
      }
      const beforeDeadline = first.kind === "EXIT"
        ? await Promise.race([streams.then((value) => ({ done: true as const, value })), deadline.then(() => ({ done: false as const }))])
        : { done: true as const, value: await this.#waitForStreams(streams, 5_000) };
      let captured = beforeDeadline.done ? beforeDeadline.value : null;
      const outputDeadlineExceeded = first.kind === "EXIT" && !beforeDeadline.done;
      if (!captured && first.kind === "EXIT") {
        try { await child.signalGroup("SIGTERM"); } catch { /* KILL below is mandatory. */ }
        captured = await this.#waitForStreams(streams, 5_000);
      }
      if (!captured && !killed) {
        try { await child.signalGroup("SIGKILL"); }
        catch (cause) { toolchainAbort("InvocationError", "PROCESS_CLEANUP", "TLC process-group KILL failed while closing output streams", cause); }
        captured = await this.#waitForStreams(streams, 5_000);
      }
      if (!captured) toolchainAbort("InvocationError", "PROCESS_CLEANUP", "TLC output streams survived TERM and KILL grace periods");
      if (outputDeadlineExceeded) toolchainAbort("InvocationError", "OUTPUT_DEADLINE", "TLC output streams remained open after process exit until the absolute deadline");
      const [stdoutChunks, stderrChunks] = captured;
      if (outputFailure !== undefined) throw outputFailure;
      const outcome: RawTlcOutcome = Object.freeze({
        ...finalStatus,
        stdoutChunks: Object.freeze(stdoutChunks),
        stderrChunks: Object.freeze(stderrChunks),
        stdoutIdentity: hashChunks(stdoutChunks),
        stderrIdentity: hashChunks(stderrChunks),
        startedAtMs,
        finishedAtMs: this.dependencies.clock.nowMs(),
        timedOut,
        outputLimitExceeded,
      });
      this.#issuedOutcomes.set(outcome, prepared);
      return { ok: true, value: outcome };
    } catch (cause) {
      return { ok: false, error: cause instanceof ToolchainFailure ? cause.value : { kind: "InvocationError", code: "PROCESS", message: "sandboxed TLC process failed", cause: String(cause) } };
    } finally {
      if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    }
  }

  async #waitForExit(status: Promise<TlcProcessStatus>, milliseconds: number): Promise<TlcProcessStatus | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const grace = this.dependencies.timer
      ? this.dependencies.timer.wait(milliseconds)
      : new Promise<void>((resolve) => { timer = setTimeout(resolve, milliseconds); });
    try {
      const outcome = await Promise.race([status.then((value) => ({ done: true as const, value })), grace.then(() => ({ done: false as const }))]);
      return outcome.done ? outcome.value : null;
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }

  async #waitForStreams(streams: Promise<[Uint8Array[], Uint8Array[]]>, milliseconds: number): Promise<[Uint8Array[], Uint8Array[]] | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const grace = this.dependencies.timer
      ? this.dependencies.timer.wait(milliseconds)
      : new Promise<void>((resolve) => { timer = setTimeout(resolve, milliseconds); });
    try {
      const outcome = await Promise.race([streams.then((value) => ({ done: true as const, value })), grace.then(() => ({ done: false as const }))]);
      return outcome.done ? outcome.value : null;
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }

  normalize(input: TlcNormalizationInput): Result<CellResult, TlcToolchainError> {
    try {
      if (!this.#issuedPrepared.has(input.prepared) || this.#issuedOutcomes.get(input.outcome) !== input.prepared) toolchainAbort("NormalizationError", "CAPABILITY", "raw outcome is not bound to this exact prepared run");
      if (hashChunks(input.outcome.stdoutChunks) !== input.outcome.stdoutIdentity || hashChunks(input.outcome.stderrChunks) !== input.outcome.stderrIdentity) toolchainAbort("NormalizationError", "OUTPUT_DRIFT", "raw TLC output changed after capture");
      this.#verifyCanonicalSources(input.prepared.manifest.modulePath, input.prepared.manifest.cfgPath, input.prepared.manifest.cwd, "NormalizationError");
      const standardModuleDirectory = this.#verifyStandardModuleDirectory(input.prepared.manifest.cwd, false, "NormalizationError");
      if (sourceIdentity(input.prepared.manifest.modulePath, "amadeus.formal-verif.tla.module.v1", "NormalizationError") !== input.prepared.manifest.moduleIdentity || sourceIdentity(input.prepared.manifest.cfgPath, "amadeus.formal-verif.tla.cfg.v1", "NormalizationError") !== input.prepared.manifest.cfgIdentity) toolchainAbort("NormalizationError", "SOURCE_DRIFT", "module or cfg bytes changed after execution");
      const exploration: TlcExploration = input.outcome.outputLimitExceeded
        ? { kind: "HARNESS_ERROR", reason: "OUTPUT_CAPACITY", detail: "TLC stdout or stderr exceeded 16 MiB" }
        : input.outcome.stderrChunks.some((chunk) => chunk.byteLength > 0)
          ? { kind: "HARNESS_ERROR", reason: "GRAMMAR", detail: "TLC stderr was not empty" }
          : parseTlcOutput174({ chunks: [...input.outcome.stdoutChunks], exitCode: input.outcome.exitCode, signal: input.outcome.signal, timedOut: input.outcome.timedOut, expectedModuleName: basename(input.prepared.manifest.modulePath, ".tla"), expectedModulePath: input.prepared.manifest.modulePath, expectedStandardModuleDirectory: standardModuleDirectory, verifiedArtifactDescriptorIdentity: input.prepared.artifact.descriptorIdentity, modelReceipt: input.prepared.modelReceipt });
      const normalized = normalizeIssuedExploration({ exploration, fixtureId: input.binding.fixtureId, baselineSha: input.binding.baselineSha, armSha: input.binding.armSha, exitCode: input.outcome.exitCode, startedAt: input.binding.startedAt, finishedAt: input.binding.finishedAt, evidencePaths: [...input.binding.evidencePaths] });
      return normalized.ok ? normalized : { ok: false, error: { kind: "NormalizationError", code: "CELL_RESULT", message: normalized.error.message } };
    } catch (cause) {
      return { ok: false, error: cause instanceof ToolchainFailure ? cause.value : { kind: "NormalizationError", code: "OUTPUT", message: "TLC normalization failed", cause: String(cause) } };
    }
  }
}

class FsPlannedTlcRuntime {
  readonly #issued = new WeakSet<PreparedPlannedTlcRun>();

  constructor(
    private readonly artifacts: FsTlcArtifactCache,
    private readonly dependencies: FsTlcToolchainDependencies,
  ) {}

  #canonicalWorkspace(): string {
    const workspace = this.dependencies.workspaceRoot;
    if (!workspace) {
      toolchainAbort("PreparationError", "WORKSPACE_CONFIGURATION", "closed runtime workspace root is required");
    }
    const cwd = realpathSync(workspace);
    if (!lstatSync(cwd).isDirectory()) {
      toolchainAbort("PreparationError", "WORKSPACE_PATH", "workspace must be a directory");
    }
    return cwd;
  }

  #canonicalWorkspaceFile(cwd: string, requestedPath: string): string {
    const canonicalPath = realpathSync(requestedPath);
    if (!pathInside(cwd, canonicalPath) || !lstatSync(canonicalPath).isFile()) {
      toolchainAbort(
        "PreparationError",
        "WORKSPACE_PATH",
        "model and cfg must be regular files inside the closed workspace",
      );
    }
    return canonicalPath;
  }

  #canonicalInputs(input: PlannedTlcPrepareInput): { cwd: string; modulePath: string; cfgPath: string } {
    const cwd = this.#canonicalWorkspace();
    const modulePath = this.#canonicalWorkspaceFile(cwd, input.modulePath);
    const cfgPath = this.#canonicalWorkspaceFile(cwd, input.cfgPath);
    return { cwd, modulePath, cfgPath };
  }
  #verifyFrozenBytes(
    input: PlannedTlcPrepareInput,
    modulePath: string,
    cfgPath: string,
  ): void {
    const model = validateFrozenTlaModelReceipt(input.modelReceipt);
    if (!model.ok) {
      toolchainAbort("PreparationError", "MODEL_RECEIPT", model.error.message);
    }
    const sameBytes = (actual: Uint8Array, expected: Uint8Array) =>
      actual.byteLength === expected.byteLength
      && actual.every((byte, index) => byte === expected[index]);
    if (
      !sameBytes(new Uint8Array(readFileSync(modulePath)), model.value.moduleBytes)
      || !sameBytes(new Uint8Array(readFileSync(cfgPath)), model.value.cfgBytes)
    ) {
      toolchainAbort(
        "PreparationError",
        "SOURCE_IDENTITY",
        "model or cfg bytes differ from the frozen receipt",
      );
    }
  }

  #prepareScratch(scratchPath: string): { scratchRoot: string; standardModuleDirectory: string } {
    const scratchRoot = realpathSync(scratchPath);
    if (!lstatSync(scratchRoot).isDirectory()) {
      toolchainAbort("PreparationError", "SCRATCH_PATH", "scratch root must be a directory");
    }
    const standardModuleDirectory = join(scratchRoot, ".tlc-stdlib");
    if (!existsSync(standardModuleDirectory)) {
      mkdirSync(standardModuleDirectory, { mode: 0o700 });
    }
    if (
      realpathSync(standardModuleDirectory) !== standardModuleDirectory
      || !lstatSync(standardModuleDirectory).isDirectory()
      || readdirSync(standardModuleDirectory).length !== 0
    ) {
      toolchainAbort(
        "PreparationError",
        "STDLIB_ORIGIN",
        "planned standard-module directory is unsafe or not empty",
      );
    }
    return { scratchRoot, standardModuleDirectory };
  }

  async prepare(
    input: PlannedTlcPrepareInput,
  ): Promise<Result<PreparedPlannedTlcRun, TlcToolchainError>> {
    try {
      this.artifacts.verifyIssuedArtifact(input.artifact);
      const { cwd, modulePath, cfgPath } = this.#canonicalInputs(input);
      this.#verifyFrozenBytes(input, modulePath, cfgPath);
      const { scratchRoot, standardModuleDirectory } = this.#prepareScratch(
        input.scratchRoot,
      );
      const environmentSnapshot = await input.planner.snapshotEnvironment({
        runId: input.runId,
        workspaceRoot: cwd,
        scratchRoot,
        jarPath: input.artifact.cachePath,
        jarSha256: input.artifact.actualSha256,
        deadlineMs: input.deadlineMs,
      });
      if (!environmentSnapshot.ok) return environmentSnapshot;
      const javaExecutable = environmentSnapshot.value.kind === "DARWIN"
        ? realpathSync(join(process.env.JAVA_HOME ?? "", "bin", "java"))
        : "/usr/bin/java";
      const manifestArgv = Object.freeze([
        javaExecutable,
        ...FIXED_JDK_RUN_PROFILE.jvmArgs,
        `-Djava.io.tmpdir=${standardModuleDirectory}`,
        "-cp",
        input.artifact.cachePath,
        "tlc2.TLC",
        "-workers",
        "1",
        "-tool",
        "-metadir",
        join(scratchRoot, "states"),
        "-config",
        cfgPath,
        modulePath,
      ]);
      const environment = environmentSnapshot.value.kind === "DARWIN"
        ? Object.freeze({
            JAVA_HOME: realpathSync(process.env.JAVA_HOME ?? ""),
            LANG: "en_US.UTF-8" as const,
            LC_ALL: "en_US.UTF-8" as const,
            TZ: "UTC" as const,
          })
        : Object.freeze({
            LANG: "en_US.UTF-8",
            LC_ALL: "en_US.UTF-8",
            TZ: "UTC",
          });
      const prepared: PreparedPlannedTlcRun = Object.freeze({
        artifact: input.artifact,
        modelReceipt: input.modelReceipt,
        modulePath,
        cfgPath,
        cwd,
        standardModuleDirectory,
        scratchRoot,
        deadlineMs: input.deadlineMs,
        manifestArgv,
        planner: input.planner,
        environmentSnapshot: environmentSnapshot.value,
        environment,
      });
      this.#issued.add(prepared);
      return { ok: true, value: prepared };
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof ToolchainFailure
          ? cause.value
          : {
              kind: "PreparationError",
              code: "FILESYSTEM",
              message: "planned TLC runtime preparation failed",
              cause: String(cause),
            },
      };
    }
  }

  #verifySourceIdentities(
    prepared: PreparedPlannedTlcRun,
    kind: "InvocationError" | "NormalizationError",
  ): void {
    for (const [path, identity, domain] of [
      [prepared.modulePath, prepared.modelReceipt.moduleBytesIdentity, "amadeus.formal-verif.tla.module.v1"],
      [prepared.cfgPath, prepared.modelReceipt.cfgBytesIdentity, "amadeus.formal-verif.tla.cfg.v1"],
    ] as const) {
      if (
        realpathSync(path) !== path
        || !pathInside(prepared.cwd, path)
        || sourceIdentity(path, domain, kind) !== identity
      ) {
        toolchainAbort(kind, "SOURCE_DRIFT", "model or cfg changed across the process seam");
      }
    }
  }

  #parseExploration(
    prepared: PreparedPlannedTlcRun,
    raw: RawTlcOutcome,
  ): TlcExploration {
    if (raw.outputLimitExceeded) {
      return {
        kind: "HARNESS_ERROR",
        reason: "OUTPUT_CAPACITY",
        detail: "TLC stdout or stderr exceeded 16 MiB",
      };
    }
    if (raw.stderrChunks.some((chunk) => chunk.byteLength > 0)) {
      return {
        kind: "HARNESS_ERROR",
        reason: "GRAMMAR",
        detail: "TLC stderr was not empty",
      };
    }
    return parseTlcOutput174({
      chunks: [...raw.stdoutChunks],
      exitCode: raw.exitCode,
      signal: raw.signal,
      timedOut: raw.timedOut,
      expectedModuleName: basename(prepared.modulePath, ".tla"),
      expectedModulePath: prepared.modulePath,
      expectedStandardModuleDirectory: prepared.standardModuleDirectory,
      verifiedArtifactDescriptorIdentity: prepared.artifact.descriptorIdentity,
      modelReceipt: prepared.modelReceipt,
    });
  }

  async run(
    prepared: PreparedPlannedTlcRun,
  ): Promise<Result<PlannedTlcOutcome, TlcToolchainError>> {
    if (!this.#issued.has(prepared)) {
      return {
        ok: false,
        error: {
          kind: "InvocationError",
          code: "CAPABILITY",
          message: "planned run was not issued by this toolchain instance",
        },
      };
    }
    try {
      this.artifacts.verifyIssuedArtifact(prepared.artifact, "InvocationError");
      this.#verifySourceIdentities(prepared, "InvocationError");
      const receipt = await prepared.planner.verifyEnvironment(
        prepared.environmentSnapshot,
      );
      if (!receipt.ok) return receipt;
      const processes = this.dependencies.process;
      if (!processes) {
        return {
          ok: false,
          error: {
            kind: "InvocationError",
            code: "UNAVAILABLE",
            message: "runtime process execution is unavailable",
          },
        };
      }
      const argv = prepared.planner.buildArgv(prepared.manifestArgv);
      if (argv.length === 0 || !isAbsolute(argv[0]!)) {
        toolchainAbort(
          "InvocationError",
          "ARGV",
          "planner must return an absolute shell-free executable",
        );
      }
      const raw = await this.#execute(
        processes,
        argv,
        prepared.scratchRoot,
        prepared.environment,
        prepared.deadlineMs,
      );
      if (!raw.ok) return raw;
      this.#verifySourceIdentities(prepared, "NormalizationError");
      const exploration = this.#parseExploration(prepared, raw.value);
      return {
        ok: true,
        value: {
          raw: raw.value,
          exploration,
          environmentReceipt: receipt.value,
        },
      };
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof ToolchainFailure
          ? cause.value
          : {
              kind: "InvocationError",
              code: "PROCESS",
              message: "planned TLC process failed",
              cause: String(cause),
            },
      };
    }
  }

  async #execute(
    processes: TlcProcessPort,
    argv: readonly string[],
    cwd: string,
    environment: TlcProcessRequest["environment"],
    requestedDeadlineMs: number,
  ): Promise<Result<RawTlcOutcome, TlcToolchainError>> {
    const publishReserveMs = this.dependencies.evidencePublishReserveMs ?? 5_000;
    const suiteRemainingMs = this.dependencies.suiteRemainingMs?.() ?? requestedDeadlineMs + publishReserveMs;
    const duration = Math.min(
      requestedDeadlineMs,
      suiteRemainingMs - publishReserveMs,
      180_000,
    );
    if (!Number.isSafeInteger(duration) || duration <= 0) {
      return {
        ok: false,
        error: {
          kind: "InvocationError",
          code: "DEADLINE",
          message: "suite deadline cannot preserve the evidence publish reserve",
        },
      };
    }
    let child: TlcChildProcessPort;
    try {
      child = processes.spawn({
        argv,
        cwd,
        environment,
        shell: false,
        processGroup: true,
      });
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: "InvocationError",
          code: "SPAWN",
          message: "planned TLC process did not spawn",
          cause: String(cause),
        },
      };
    }
    const startedAtMs = this.dependencies.clock.nowMs();
    let outputLimitExceeded = false;
    let signalLimit!: () => void;
    const limit = new Promise<void>((resolveLimit) => {
      signalLimit = resolveLimit;
    });
    const collect = async (stream: AsyncIterable<Uint8Array>) => {
      const chunks: Uint8Array[] = [];
      let total = 0;
      for await (const source of stream) {
        if (!(source instanceof Uint8Array)) {
          throw new Error("child process yielded a non-byte stream chunk");
        }
        const remaining = MAX_TLC_STREAM_BYTES - total;
        if (source.byteLength > remaining) {
          if (remaining > 0) chunks.push(new Uint8Array(source.subarray(0, remaining)));
          outputLimitExceeded = true;
          signalLimit();
          break;
        }
        chunks.push(new Uint8Array(source));
        total += source.byteLength;
      }
      return chunks;
    };
    const streams = Promise.all([collect(child.stdout), collect(child.stderr)]);
    const status = child.wait();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = this.dependencies.timer
      ? this.dependencies.timer.wait(duration)
      : new Promise<void>((resolveDeadline) => {
          timer = setTimeout(resolveDeadline, duration);
        });
    try {
      const first = await Promise.race([
        status.then((value) => ({ kind: "EXIT" as const, value })),
        deadline.then(() => ({ kind: "TIMEOUT" as const })),
        limit.then(() => ({ kind: "OUTPUT" as const })),
      ]);
      let finalStatus: TlcProcessStatus;
      if (first.kind === "EXIT") {
        finalStatus = first.value;
      } else {
        try {
          await child.signalGroup("SIGTERM");
        } catch {
          // SIGKILL below remains mandatory.
        }
        await child.signalGroup("SIGKILL");
        finalStatus = await status;
      }
      const [stdoutChunks, stderrChunks] = await streams;
      const raw: RawTlcOutcome = Object.freeze({
        ...finalStatus,
        stdoutChunks: Object.freeze(stdoutChunks),
        stderrChunks: Object.freeze(stderrChunks),
        stdoutIdentity: hashChunks(stdoutChunks),
        stderrIdentity: hashChunks(stderrChunks),
        startedAtMs,
        finishedAtMs: this.dependencies.clock.nowMs(),
        timedOut: first.kind === "TIMEOUT",
        outputLimitExceeded,
      });
      return { ok: true, value: raw };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: "InvocationError",
          code: "PROCESS_CLEANUP",
          message: "planned TLC process could not be reaped",
          cause: String(cause),
        },
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

export class FsTlcToolchain implements TlcToolchainFacade {
  readonly #artifacts: FsTlcArtifactCache;
  readonly #runtime: FsTlcRuntime;
  readonly #plannedRuntime: FsPlannedTlcRuntime;

  constructor(readonly root: string, dependencies: FsTlcToolchainDependencies) {
    this.#artifacts = new FsTlcArtifactCache(root, dependencies);
    this.#runtime = new FsTlcRuntime(this.#artifacts, dependencies);
    this.#plannedRuntime = new FsPlannedTlcRuntime(this.#artifacts, dependencies);
  }

  acquire() { return this.#artifacts.acquire(); }
  verifyOffline() { return this.#artifacts.verifyOffline(); }
  prepare(input: TlcPrepareInput) { return this.#runtime.prepare(input); }
  run(prepared: PreparedTlcRun) { return this.#runtime.run(prepared); }
  normalize(input: TlcNormalizationInput) { return this.#runtime.normalize(input); }
  preparePlanned(input: PlannedTlcPrepareInput) { return this.#plannedRuntime.prepare(input); }
  runPlanned(prepared: PreparedPlannedTlcRun) { return this.#plannedRuntime.run(prepared); }
}
