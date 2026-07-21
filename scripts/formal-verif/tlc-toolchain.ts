import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type CellResult, type Result } from "./contract.ts";
import {
  validateFrozenTlaModelReceipt,
  type FrozenTlaModelReceipt,
} from "./tla-arm.ts";

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

export const FIXED_TLC_ARTIFACT_DESCRIPTOR = deepFreeze({
  version: "1.7.4",
  url: "https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar",
  sha256: "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88",
  fileName: "tla2tools.jar",
  redirectOrigins: ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"],
  maxBytes: 134_217_728,
  integrity: "HASH_ONLY",
} as const);

export const FIXED_TLC_PROFILE = deepFreeze({
  voters: ["V1", "V2", "V3"],
  choices: ["C1", "C2", "C3"],
  unknownChoice: "UNKNOWN_CHOICE",
  submittedAt: ["T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE"],
  receivedAt: ["T0", "T1", "T2"],
  unknownReference: "UNKNOWN_REF",
  goa: [1, 2, 3, 4, 5, 6, 7, 8],
  budgets: {
    initialPerVoter: 1,
    amendPerVoter: 1,
    globalHold: 1,
  },
  workers: 1,
} as const);

export const FIXED_JDK_RUN_PROFILE = deepFreeze({
  vendor: "OpenJDK",
  version: "26.0.1",
  jvmArgs: [
    "-Xms256m",
    "-Xmx1024m",
    "-XX:+UseParallelGC",
    "-Dfile.encoding=UTF-8",
    "-Duser.language=en",
    "-Duser.country=US",
    "-Duser.timezone=UTC",
  ],
  locale: "en_US",
  timezone: "UTC",
} as const);

export type TlcArtifactDescriptor = typeof FIXED_TLC_ARTIFACT_DESCRIPTOR;
export type TlcProfile = typeof FIXED_TLC_PROFILE;
export type JdkRunProfile = typeof FIXED_JDK_RUN_PROFILE;

export type ToolchainDomainError =
  | { kind: "ArtifactDescriptorError"; message: string }
  | { kind: "TlcProfileError"; message: string }
  | { kind: "JdkRunProfileError"; message: string }
  | { kind: "JdkDistributionError"; message: string }
  | { kind: "SandboxReceiptError"; message: string }
  | { kind: "RunManifestError"; message: string };

const ARTIFACT_DOMAIN = "amadeus.formal-verif.tlc-artifact-descriptor.v1";
const PROFILE_DOMAIN = "amadeus.formal-verif.tlc-profile.v1";
const JDK_DOMAIN = "amadeus.formal-verif.jdk-run-profile.v1";
const JDK_DISTRIBUTION_DOMAIN = "amadeus.formal-verif.jdk-distribution.v1";
const JDK_SNAPSHOT_DOMAIN = "amadeus.formal-verif.jdk-snapshot.v1";
const SANDBOX_PROVIDER_DOMAIN = "amadeus.formal-verif.sandbox-provider.v1";
const SANDBOX_POLICY_DOMAIN = "amadeus.formal-verif.network-deny-policy.v1";
const SANDBOX_RECEIPT_DOMAIN = "amadeus.formal-verif.sandbox-probe-receipt.v1";
const RUN_MANIFEST_DOMAIN = "amadeus.formal-verif.tlc-run-manifest.v1";

export const FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY = canonicalIdentity(
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  ARTIFACT_DOMAIN,
).sha256;
export const FIXED_TLC_PROFILE_IDENTITY = canonicalIdentity(FIXED_TLC_PROFILE, PROFILE_DOMAIN).sha256;
export const FIXED_JDK_RUN_PROFILE_IDENTITY = canonicalIdentity(FIXED_JDK_RUN_PROFILE, JDK_DOMAIN).sha256;
export const DARWIN_SANDBOX_PROVIDER_IDENTITY = canonicalIdentity({
  platform: "darwin",
  executable: "/usr/bin/sandbox-exec",
  provider: "DarwinSandboxExecProvider",
}, SANDBOX_PROVIDER_DOMAIN).sha256;
export const DARWIN_NETWORK_DENY_POLICY_IDENTITY = canonicalIdentity({
  defaultPolicy: "DENY",
  networkPolicy: "DENY_ALL",
  probes: ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"],
}, SANDBOX_POLICY_DOMAIN).sha256;
export const MAX_TLC_STREAM_BYTES = 16 * 1024 * 1024;

export interface JdkDistributionEntry {
  readonly kind: "FILE" | "SYMLINK";
  readonly path: string;
  readonly target: string | null;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface JdkDistributionManifest {
  readonly vendor: "OpenJDK";
  readonly version: "26.0.1";
  readonly javaExecutablePath: string;
  readonly javaExecutableSha256: string;
  readonly entries: readonly JdkDistributionEntry[];
  readonly manifestIdentity: string;
}

export type JdkDistributionManifestInput = Omit<JdkDistributionManifest, "entries" | "manifestIdentity"> & {
  readonly entries: readonly JdkDistributionEntry[];
};

const SHA256 = /^[0-9a-f]{64}$/;

function canonicalRelativePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.includes("\\")
    && !value.includes("\0")
    && !value.startsWith("/")
    && value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function canonicalDistributionTarget(value: unknown): value is string {
  return value === "." || canonicalRelativePath(value);
}

function validJdkEntry(entry: JdkDistributionEntry): boolean {
  if (!canonicalRelativePath(entry.path) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || !SHA256.test(entry.sha256)) return false;
  return entry.kind === "FILE" ? entry.target === null : entry.kind === "SYMLINK" && canonicalDistributionTarget(entry.target);
}

function coversJdkRuntime(entries: readonly JdkDistributionEntry[]): boolean {
  return entries.some(({ path }) => path === "lib/modules")
    && entries.some(({ path }) => path.startsWith("conf/"))
    && entries.some(({ path }) => /\.(?:dylib|dll|so(?:\.[0-9]+)*)$/.test(path));
}

export function createJdkDistributionManifest(
  input: JdkDistributionManifestInput,
): Result<JdkDistributionManifest, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({
    ok: false,
    error: { kind: "JdkDistributionError", message },
  });
  if (input.vendor !== FIXED_JDK_RUN_PROFILE.vendor || input.version !== FIXED_JDK_RUN_PROFILE.version) {
    return fail("JDK vendor or version differs from the fixed run profile");
  }
  if (!canonicalRelativePath(input.javaExecutablePath) || !SHA256.test(input.javaExecutableSha256)) {
    return fail("JDK executable identity is invalid");
  }
  const entries = [...input.entries].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  if (entries.some((entry) => !validJdkEntry(entry))) return fail("JDK manifest entry or symlink binding is invalid");
  if (entries.length === 0 || new Set(entries.map(({ path }) => path)).size !== entries.length) return fail("JDK manifest paths must be non-empty and unique");
  const java = entries.find(({ path }) => path === input.javaExecutablePath);
  if (java?.sha256 !== input.javaExecutableSha256) return fail("JDK executable is not bound to the manifest");
  if (!coversJdkRuntime(entries)) return fail("JDK manifest does not cover modules, native libraries, and configuration");
  const body = { vendor: input.vendor, version: input.version, javaExecutablePath: input.javaExecutablePath, javaExecutableSha256: input.javaExecutableSha256, entries };
  return { ok: true, value: deepFreeze({ ...body, manifestIdentity: canonicalIdentity(body, JDK_DISTRIBUTION_DOMAIN).sha256 }) };
}

export function createJdkSnapshotIdentity(
  manifest: JdkDistributionManifest,
  javaVersionReceiptIdentity: string,
): string {
  return canonicalIdentity({
    manifestIdentity: manifest.manifestIdentity,
    javaExecutablePath: manifest.javaExecutablePath,
    javaExecutableSha256: manifest.javaExecutableSha256,
    javaVersionReceiptIdentity,
    jdkRunProfileIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
  }, JDK_SNAPSHOT_DOMAIN).sha256;
}

export type SandboxProbeKind = "TCP_LOOPBACK" | "UDP_LOOPBACK" | "DNS";

export interface SandboxProbeObservation {
  readonly kind: SandboxProbeKind;
  readonly denied: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly evidenceIdentity: string;
}

export interface VerifiedSandboxProbe extends SandboxProbeObservation {
  readonly denied: true;
}

export interface SandboxProbeReceipt {
  readonly providerIdentity: string;
  readonly policyIdentity: string;
  readonly checkedAt: string;
  readonly probes: readonly VerifiedSandboxProbe[];
  readonly receiptIdentity: string;
}

export interface SandboxProbeReceiptInput extends Omit<SandboxProbeReceipt, "probes" | "receiptIdentity"> {
  readonly probes: readonly SandboxProbeObservation[];
}

const SANDBOX_PROBES: readonly SandboxProbeKind[] = ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"];

export function createSandboxProbeReceipt(
  input: SandboxProbeReceiptInput,
): Result<SandboxProbeReceipt, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({ ok: false, error: { kind: "SandboxReceiptError", message } });
  if (input.providerIdentity !== DARWIN_SANDBOX_PROVIDER_IDENTITY || input.policyIdentity !== DARWIN_NETWORK_DENY_POLICY_IDENTITY || !isUtcInstant(input.checkedAt)) return fail("sandbox provider, policy, or timestamp is invalid");
  const byKind = new Map(input.probes.map((probe) => [probe.kind, probe]));
  if (input.probes.length !== SANDBOX_PROBES.length || byKind.size !== SANDBOX_PROBES.length) return fail("sandbox receipt must contain each fixed probe exactly once");
  const probes: VerifiedSandboxProbe[] = [];
  for (const kind of SANDBOX_PROBES) {
    const probe = byKind.get(kind);
    if (probe?.denied !== true || (probe.exitCode === 0 && probe.signal === null) || (probe.exitCode !== null && !Number.isSafeInteger(probe.exitCode)) || (probe.signal !== null && probe.signal.length === 0) || !SHA256.test(probe.evidenceIdentity)) return fail(`sandbox ${kind} probe is not a verified denial`);
    probes.push({ ...probe, denied: true });
  }
  const body = { providerIdentity: input.providerIdentity, policyIdentity: input.policyIdentity, checkedAt: input.checkedAt, probes };
  return { ok: true, value: deepFreeze({ ...body, receiptIdentity: canonicalIdentity(body, SANDBOX_RECEIPT_DOMAIN).sha256 }) };
}

export interface VerifiedTlcArtifact {
  readonly kind: "VerifiedTlcArtifact";
  readonly descriptorIdentity: string;
  readonly actualSha256: string;
  readonly byteLength: number;
  readonly cachePath: string;
  readonly receiptIdentity: string;
}

export interface VerifiedJdkSnapshot {
  readonly kind: "VerifiedJdkSnapshot";
  readonly manifest: JdkDistributionManifest;
  readonly manifestIdentity: string;
  readonly snapshotIdentity: string;
  readonly javaVersionReceiptIdentity: string;
  readonly snapshotRoot: string;
  readonly javaExecutablePath: string;
  readonly verifiedAt: string;
}

export interface VerifiedSandbox {
  readonly kind: "VerifiedSandbox";
  readonly providerIdentity: string;
  readonly policyIdentity: string;
  readonly receiptIdentity: string;
  readonly checkedAt: string;
}

export interface TlcRunManifestInput {
  readonly artifact: VerifiedTlcArtifact;
  readonly jdk: VerifiedJdkSnapshot;
  readonly sandbox: VerifiedSandbox;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly deadlineMs: number;
}

export interface TlcRunManifest {
  readonly schemaVersion: 1;
  readonly artifactDescriptorIdentity: string;
  readonly artifactReceiptIdentity: string;
  readonly artifactSha256: string;
  readonly jdkManifestIdentity: string;
  readonly jdkSnapshotIdentity: string;
  readonly javaVersionReceiptIdentity: string;
  readonly jdkRunProfileIdentity: string;
  readonly sandboxProviderIdentity: string;
  readonly sandboxPolicyIdentity: string;
  readonly sandboxReceiptIdentity: string;
  readonly tlcProfileIdentity: string;
  readonly modelIdentity: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly workers: 1;
  readonly deadlineMs: number;
  readonly runIdentity: string;
}

/** This pure envelope binds identities but never authorizes a process spawn. */
export function createTlcRunManifest(
  input: TlcRunManifestInput,
): Result<TlcRunManifest, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({ ok: false, error: { kind: "RunManifestError", message } });
  const rebuiltJdk = createJdkDistributionManifest({ vendor: input.jdk.manifest.vendor, version: input.jdk.manifest.version, javaExecutablePath: input.jdk.manifest.javaExecutablePath, javaExecutableSha256: input.jdk.manifest.javaExecutableSha256, entries: input.jdk.manifest.entries });
  const validatedModel = validateFrozenTlaModelReceipt(input.modelReceipt);
  if (input.artifact.kind !== "VerifiedTlcArtifact" || input.artifact.descriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY || input.artifact.actualSha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256 || !Number.isSafeInteger(input.artifact.byteLength) || input.artifact.byteLength <= 0 || input.artifact.byteLength > FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes || !SHA256.test(input.artifact.receiptIdentity)) return fail("artifact structure differs from the fixed descriptor");
  if (!rebuiltJdk.ok || rebuiltJdk.value.manifestIdentity !== input.jdk.manifestIdentity || !SHA256.test(input.jdk.javaVersionReceiptIdentity) || input.jdk.snapshotIdentity !== createJdkSnapshotIdentity(rebuiltJdk.value, input.jdk.javaVersionReceiptIdentity) || input.jdk.snapshotRoot.length === 0 || input.jdk.javaExecutablePath !== rebuiltJdk.value.javaExecutablePath || !isUtcInstant(input.jdk.verifiedAt)) return fail("JDK snapshot structure is not identity-bound");
  if (input.sandbox.kind !== "VerifiedSandbox" || input.sandbox.providerIdentity !== DARWIN_SANDBOX_PROVIDER_IDENTITY || input.sandbox.policyIdentity !== DARWIN_NETWORK_DENY_POLICY_IDENTITY || !SHA256.test(input.sandbox.receiptIdentity) || !isUtcInstant(input.sandbox.checkedAt)) return fail("sandbox structure is not identity-bound");
  if (!validatedModel.ok) return fail(`model receipt is invalid: ${validatedModel.error.message}`);
  if (![input.modulePath, input.cfgPath, input.subjectAlias, input.cwd].every((value) => value.length > 0 && !value.includes("\0"))) return fail("run paths and subject alias must be non-empty");
  if (!Number.isSafeInteger(input.deadlineMs) || input.deadlineMs <= 0 || input.deadlineMs > 120_000) return fail("run deadline must be within the fixed 120 second budget");
  const javaPath = `${input.jdk.snapshotRoot.replace(/\/+$/, "")}/${input.jdk.javaExecutablePath}`;
  const standardModuleDirectory = `${input.cwd.replace(/\/+$/, "")}/.tlc-stdlib`;
  const expectedArgv = [javaPath, ...FIXED_JDK_RUN_PROFILE.jvmArgs, `-Djava.io.tmpdir=${standardModuleDirectory}`, "-cp", input.artifact.cachePath, "tlc2.TLC", "-workers", "1", "-tool", "-config", input.cfgPath, input.modulePath];
  if (input.argv.length !== expectedArgv.length || input.argv.some((argument, index) => argument !== expectedArgv[index])) return fail("argv differs from the fixed array invocation");
  const body = {
    schemaVersion: 1 as const,
    artifactDescriptorIdentity: input.artifact.descriptorIdentity,
    artifactReceiptIdentity: input.artifact.receiptIdentity,
    artifactSha256: input.artifact.actualSha256,
    jdkManifestIdentity: input.jdk.manifestIdentity,
    jdkSnapshotIdentity: input.jdk.snapshotIdentity,
    javaVersionReceiptIdentity: input.jdk.javaVersionReceiptIdentity,
    jdkRunProfileIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
    sandboxProviderIdentity: input.sandbox.providerIdentity,
    sandboxPolicyIdentity: input.sandbox.policyIdentity,
    sandboxReceiptIdentity: input.sandbox.receiptIdentity,
    tlcProfileIdentity: FIXED_TLC_PROFILE_IDENTITY,
    modelIdentity: validatedModel.value.modelIdentity,
    moduleIdentity: validatedModel.value.moduleBytesIdentity,
    cfgIdentity: validatedModel.value.cfgBytesIdentity,
    modulePath: input.modulePath,
    cfgPath: input.cfgPath,
    subjectAlias: input.subjectAlias,
    argv: [...input.argv],
    cwd: input.cwd,
    workers: 1 as const,
    deadlineMs: input.deadlineMs,
  };
  return { ok: true, value: deepFreeze({ ...body, runIdentity: canonicalIdentity(body, RUN_MANIFEST_DOMAIN).sha256 }) };
}

export interface TlcOperationError {
  readonly kind: "AcquisitionError" | "CacheIntegrityError" | "PreparationError" | "InvocationError" | "NormalizationError";
  readonly code: string;
  readonly message: string;
  readonly cause?: string;
}

export type TlcToolchainError = ToolchainDomainError | TlcOperationError;

export interface TlcClosedEnvironment {
  readonly JAVA_HOME: string;
  readonly LANG: "en_US.UTF-8";
  readonly LC_ALL: "en_US.UTF-8";
  readonly TZ: "UTC";
}

export interface TlcPrepareInput {
  readonly artifact: VerifiedTlcArtifact;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly deadlineMs: number;
}

/** Concrete filesystem adapters must issue and recognize these objects with private instance state. */
export interface PreparedTlcRun {
  readonly artifact: VerifiedTlcArtifact;
  readonly jdk: VerifiedJdkSnapshot;
  readonly sandbox: VerifiedSandbox;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly manifest: TlcRunManifest;
  readonly environment: TlcClosedEnvironment;
}

export interface RawTlcOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdoutChunks: readonly Uint8Array[];
  readonly stderrChunks: readonly Uint8Array[];
  readonly stdoutIdentity: string;
  readonly stderrIdentity: string;
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
  readonly timedOut: boolean;
  readonly outputLimitExceeded: boolean;
}

export interface TlcCellBinding {
  readonly fixtureId: string;
  readonly baselineSha: string;
  readonly armSha: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly evidencePaths: readonly string[];
}

export interface TlcNormalizationInput {
  readonly prepared: PreparedTlcRun;
  readonly outcome: RawTlcOutcome;
  readonly binding: TlcCellBinding;
}

export interface TlcExecutionPort {
  run(prepared: PreparedTlcRun): Promise<Result<RawTlcOutcome, TlcToolchainError>>;
}

export interface TlcSandboxProvider {
  readonly providerIdentity: string;
  preflight(deadlineMs: number): Promise<Result<VerifiedSandbox, TlcToolchainError>>;
}

export interface TlcToolchainFacade {
  acquire(): Promise<Result<VerifiedTlcArtifact, TlcToolchainError>>;
  verifyOffline(): Result<VerifiedTlcArtifact, TlcToolchainError>;
  prepare(input: TlcPrepareInput): Promise<Result<PreparedTlcRun, TlcToolchainError>>;
  run(prepared: PreparedTlcRun): Promise<Result<RawTlcOutcome, TlcToolchainError>>;
  normalize(input: TlcNormalizationInput): Result<CellResult, TlcToolchainError>;
}

function hasPlainJsonArray(value: unknown[]): boolean {
  if (Object.getPrototypeOf(value) !== Array.prototype) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || keys[value.length] !== "length") return false;
  return value.every((item, index) => keys[index] === String(index) && hasPlainJsonShape(item));
}

function hasPlainJsonRecord(value: object): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor) || !hasPlainJsonShape(descriptor.value)) return false;
  }
  return true;
}

function hasPlainJsonShape(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return hasPlainJsonArray(value);
  return typeof value === "object" && hasPlainJsonRecord(value);
}

function validateExact<T>(
  value: unknown,
  expected: T,
  expectedIdentity: string,
  domain: string,
  kind: ToolchainDomainError["kind"],
): Result<T, ToolchainDomainError> {
  if (!hasPlainJsonShape(value) || canonicalIdentity(value, domain).sha256 !== expectedIdentity) {
    return { ok: false, error: { kind, message: "value does not match the closed toolchain profile" } };
  }
  return { ok: true, value: expected };
}

export function validateFixedTlcArtifactDescriptor(
  value: unknown,
): Result<TlcArtifactDescriptor, ToolchainDomainError> {
  return validateExact(
    value,
    FIXED_TLC_ARTIFACT_DESCRIPTOR,
    FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    ARTIFACT_DOMAIN,
    "ArtifactDescriptorError",
  );
}

export function validateFixedTlcProfile(value: unknown): Result<TlcProfile, ToolchainDomainError> {
  return validateExact(value, FIXED_TLC_PROFILE, FIXED_TLC_PROFILE_IDENTITY, PROFILE_DOMAIN, "TlcProfileError");
}

export function validateFixedJdkRunProfile(value: unknown): Result<JdkRunProfile, ToolchainDomainError> {
  return validateExact(
    value,
    FIXED_JDK_RUN_PROFILE,
    FIXED_JDK_RUN_PROFILE_IDENTITY,
    JDK_DOMAIN,
    "JdkRunProfileError",
  );
}
