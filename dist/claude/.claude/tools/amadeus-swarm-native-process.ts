// Provider-neutral stdio/PTY process supervision for native swarm drivers.

import {
  spawn,
  type ChildProcess,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import type {
  CoordinatorTransport,
  DriverControlSignal,
  LaunchSpec,
  NormalizeContext,
  ProcessTerminal,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import {
  observeProcessIdentity,
  sameProcess,
  type ProcessIdentity,
} from "./amadeus-armed-process.ts";
import { digestValue, hasExactKeys, isRecord, nonEmptyString } from "./amadeus-swarm-canonical.ts";
import type {
  NativeProcessPort,
  NativeProcessOutputFrame,
  NativeProcessSession,
  NativeResourceRecoveryObservation,
  NativeResourceRecoveryObserverPort,
  NativeResourceRecoveryOwner,
  PlannedProcessRun,
} from "./amadeus-swarm-native-execution.ts";
import type { NativeProcessOutputPort } from "./amadeus-swarm-native-capture.ts";

export type { NativeProcessOutputPort } from "./amadeus-swarm-native-capture.ts";

export type NativeProcessPlanInput = Readonly<{
  nativeRunId: string;
  evidenceDir: string;
  context: NormalizeContext;
  fencingToken: number;
}>;

export type ContextualNativeProcessSession = NativeProcessSession & Readonly<{
  dispose(): Promise<void>;
}>;

export type ContextualPlannedProcessRun = PlannedProcessRun & Readonly<{
  runEpochDigest: string;
}>;

export type NativeProcessRecoveryTarget = Readonly<{
  kind: "native-process-recovery";
  schemaVersion: 1;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  processIdentityDigest: string | null;
}>;

export type NativeProcessRecoveryReceipt = Readonly<{
  kind: "native-process-recovery-receipt";
  schemaVersion: 1;
  targetDigest: string;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  processIdentityDigest: string | null;
  disposition: "unarmed" | "stopped";
  receiptDigest: string;
}>;

export type NativeProcessRecoveryResult =
  | Readonly<{
      status: "unarmed" | "stopped";
      receipt: NativeProcessRecoveryReceipt;
    }>
  | Readonly<{ status: "unknown" }>;

export type ContextualNativeProcessPort = Omit<NativeProcessPort, "plan" | "spawn" | "releasePlan"> & Readonly<{
  plan(input: NativeProcessPlanInput): ContextualPlannedProcessRun;
  spawn(input: Parameters<NativeProcessPort["spawn"]>[0]): Promise<ContextualNativeProcessSession>;
  releasePlan(plan: ContextualPlannedProcessRun): Promise<void>;
  recoverAttempt(target: NativeProcessRecoveryTarget): Promise<NativeProcessRecoveryResult>;
  recoveryObserver: NativeResourceRecoveryObserverPort;
  activeRecordCount(): number;
}>;

export type NativeProcessPortConfig = Readonly<{
  rootDir: string;
  output: NativeProcessOutputPort;
  wrapperExecutable?: string;
  armTimeoutMs?: number;
  terminationGraceMs?: number;
  platform?: NodeJS.Platform;
  now?: () => Date;
}>;

type NativeRunIdentity = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  armDeadline: string;
  process: ProcessIdentity;
}>;

type ArmReceipt = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  processIdentityDigest: string;
}>;

type ProviderTerminalMessage = Readonly<{
  kind: "provider-terminal";
  schemaVersion: 1;
  nativeRunId: string;
  guardianIdentityDigest: string;
  providerExitCode: number;
}>;

type WrapperPlan = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  identityPath: string;
  armPath: string;
  armDigest: string;
  runEpochDigest: string;
  armDeadline: string;
}>;

type WrapperPlanBase = Omit<WrapperPlan, "armDeadline">;

type GuardianProcess = ChildProcessWithoutNullStreams & Readonly<{
  send: NonNullable<ChildProcess["send"]>;
}>;

type NativeProcessLifecycleState =
  | "planned"
  | "spawned"
  | "arming"
  | "armed"
  | "terminal"
  | "disposed";

type RunDirectoryOwner = Readonly<{
  device: string;
  inode: string;
  userId: string;
  markerDigest: string;
}>;

type RunDirectoryMarker = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  token: string;
}>;

type ProcessRecoveryJournal = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  owner: RunDirectoryOwner;
  state: NativeProcessLifecycleState;
  updatedAt: string;
  armDeadline?: string;
  processIdentityDigest?: string;
  terminal?: ProcessTerminal;
}>;

type NativeProcessSpawnClaim = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  armDigest: string;
  runEpochDigest: string;
  ownerDigest: string;
  token: string;
}>;

type SerializedTransport =
  | Readonly<{
      kind: "stdio-json";
      stdin: Readonly<{ kind: "closed" } | { kind: "bytes"; base64: string }>;
    }>
  | Readonly<{
      kind: "pty-interactive";
      initialInputBase64: string;
      columns: number;
      rows: number;
    }>;

type LaunchMessage = Readonly<{
  kind: "launch";
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  transport: SerializedTransport;
}>;

type GracefulExitMessage = Readonly<{
  kind: "graceful-exit";
  inputBase64: string;
}>;

type PlannedRunRecord = {
  publicPlan: PlannedProcessRun;
  wrapperPlan: WrapperPlanBase;
  runDirectoryPath: string;
  ownerMarkerPath: string;
  owner: RunDirectoryOwner;
  recoveryJournalPath: string;
  lifecycle: ProcessRecoveryJournal;
};

const DEFAULT_ARM_TIMEOUT_MS = 5_000;
const DEFAULT_TERMINATION_GRACE_MS = 1_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function requireSupportedPlatform(platform: NodeJS.Platform): void {
  if (platform !== "darwin" && platform !== "linux") {
    throw new Error("NATIVE_PROCESS_PLATFORM_UNSUPPORTED");
  }
}

function runDirectoryForPlan(plan: PlannedProcessRun): string {
  const runDirectory = `.amadeus-swarm-driver/native/${digestValue(plan.nativeRunId).slice(0, 24)}`;
  if (
    !plan.nativeRunId ||
    !plan.armDigest ||
    !nonEmptyString(plan.runEpochDigest) ||
    plan.identityRelativePath !== `${runDirectory}/identity.json` ||
    plan.armRelativePath !== `${runDirectory}/arm.json` ||
    plan.recoveryJournalRelativePath !== `${runDirectory}/recovery.json`
  ) {
    throw new Error("NATIVE_PROCESS_PLAN_INVALID");
  }
  return runDirectory;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const file = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(file, `${JSON.stringify(value)}\n`, "utf-8");
    fsyncSync(file);
  } finally {
    closeSync(file);
  }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

function transitionLifecycle(
  record: PlannedRunRecord,
  expected: readonly NativeProcessLifecycleState[],
  state: NativeProcessLifecycleState,
  now: () => Date,
  details: Partial<Pick<
    ProcessRecoveryJournal,
    "armDeadline" | "processIdentityDigest" | "terminal"
  >> = {},
): void {
  if (!expected.includes(record.lifecycle.state)) throw new Error(`NATIVE_PROCESS_STATE_${record.lifecycle.state.toUpperCase()}`);
  if (!exactOwnedRunDirectory(record)) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  const durable = readProcessRecoveryJournal(
    record.recoveryJournalPath,
    record.publicPlan.nativeRunId,
  );
  if (!durable || digestValue(durable) !== digestValue(record.lifecycle)) {
    throw new Error("NATIVE_PROCESS_STATE_CONFLICT");
  }
  record.lifecycle = Object.freeze({
    ...record.lifecycle,
    ...details,
    state,
    updatedAt: now().toISOString(),
  });
  atomicJson(record.recoveryJournalPath, record.lifecycle);
}

function restoreSpawnedAfterArmFailure(record: PlannedRunRecord, now: () => Date): void {
  if (record.lifecycle.state === "arming") transitionLifecycle(record, ["arming"], "spawned", now);
}

function restorePlannedAfterSpawnFailure(
  record: PlannedRunRecord,
  claim: NativeProcessSpawnClaim,
  now: () => Date,
): void {
  if (!exactOwnedRunDirectory(record)) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  if (!spawnClaimMatchesRecord(record, claim)) {
    throw new Error("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
  }
  const durable = readProcessRecoveryJournal(
    record.recoveryJournalPath,
    record.publicPlan.nativeRunId,
  );
  if (
    record.lifecycle.state !== "spawned" ||
    !durable ||
    durable.state !== "spawned" ||
    digestValue(durable) !== digestValue(record.lifecycle)
  ) {
    throw new Error("NATIVE_PROCESS_STATE_CONFLICT");
  }
  record.lifecycle = Object.freeze({
    schemaVersion: 1,
    nativeRunId: record.publicPlan.nativeRunId,
    armDigest: record.publicPlan.armDigest,
    runEpochDigest: record.lifecycle.runEpochDigest,
    owner: record.owner,
    state: "planned",
    updatedAt: now().toISOString(),
  });
  atomicJson(record.recoveryJournalPath, record.lifecycle);
  removeSpawnClaim(record, claim);
}

function directoryMatchesOwner(path: string, owner: RunDirectoryOwner): boolean {
  try {
    const directory = lstatSync(path, { bigint: true });
    return directory.isDirectory() &&
      !directory.isSymbolicLink() &&
      directory.dev.toString() === owner.device &&
      directory.ino.toString() === owner.inode &&
      directory.uid.toString() === owner.userId;
  } catch {
    return false;
  }
}

function markerMatchesOwner(
  markerPath: string,
  nativeRunId: string,
  owner: RunDirectoryOwner,
): boolean {
  try {
    const marker = lstatSync(markerPath, { bigint: true });
    if (!marker.isFile() || marker.isSymbolicLink()) return false;
    const value = JSON.parse(readFileSync(markerPath, "utf-8")) as Partial<RunDirectoryMarker>;
    return value.schemaVersion === 1 &&
      value.nativeRunId === nativeRunId &&
      typeof value.token === "string" &&
      digestValue(value) === owner.markerDigest;
  } catch {
    return false;
  }
}

function quarantinePath(path: string, nativeRunId: string): string {
  return join(
    dirname(path),
    `.disposed-${digestValue(nativeRunId).slice(0, 16)}-${crypto.randomUUID()}`,
  );
}

function rollbackOwnedDirectoryInitialization(
  path: string,
  nativeRunId: string,
  owner: RunDirectoryOwner,
  afterRename: (quarantinePath: string) => void = () => {},
): void {
  if (!directoryMatchesOwner(path, owner)) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  const markerPath = join(path, "owner.json");
  const markerExists = existsSync(markerPath);
  if (markerExists && !markerMatchesOwner(markerPath, nativeRunId, owner)) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  const quarantine = quarantinePath(path, nativeRunId);
  renameSync(path, quarantine);
  afterRename(quarantine);
  const quarantinedMarker = join(quarantine, "owner.json");
  if (
    !directoryMatchesOwner(quarantine, owner) ||
    existsSync(quarantinedMarker) !== markerExists ||
    (markerExists && !markerMatchesOwner(quarantinedMarker, nativeRunId, owner))
  ) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  rmSync(quarantine, { recursive: true, force: true });
}

function createOwnedRunDirectory(
  path: string,
  nativeRunId: string,
  writeMarker: (path: string, marker: RunDirectoryMarker) => void = atomicJson,
): Readonly<{
  owner: RunDirectoryOwner;
  markerPath: string;
}> {
  mkdirSync(dirname(path), { recursive: true });
  try {
    mkdirSync(path, { mode: 0o700 });
  } catch {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_EXISTS");
  }
  const markerPath = join(path, "owner.json");
  const marker: RunDirectoryMarker = Object.freeze({
    schemaVersion: 1,
    nativeRunId,
    token: crypto.randomUUID(),
  });
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_INVALID");
  const ownership = Object.freeze({
    markerPath,
    owner: Object.freeze({
      device: stat.dev.toString(),
      inode: stat.ino.toString(),
      userId: stat.uid.toString(),
      markerDigest: digestValue(marker),
    }),
  });
  try {
    writeMarker(markerPath, marker);
    if (!markerMatchesOwner(markerPath, nativeRunId, ownership.owner)) {
      throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_INVALID");
    }
    return ownership;
  } catch (error) {
    try {
      rollbackOwnedDirectoryInitialization(path, nativeRunId, ownership.owner);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "NATIVE_PROCESS_DIRECTORY_INITIALIZATION_ROLLBACK_FAILED",
      );
    }
    throw error;
  }
}

function exactOwnedRunDirectory(record: PlannedRunRecord): boolean {
  return directoryMatchesOwner(record.runDirectoryPath, record.owner) &&
    markerMatchesOwner(record.ownerMarkerPath, record.publicPlan.nativeRunId, record.owner);
}

function spawnClaimPath(runDirectoryPath: string): string {
  return join(runDirectoryPath, "spawn-claim.json");
}

function readSpawnClaim(path: string): NativeProcessSpawnClaim | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf-8"));
    if (
      !hasExactKeys(value, [
        "schemaVersion",
        "nativeRunId",
        "armDigest",
        "runEpochDigest",
        "ownerDigest",
        "token",
      ]) ||
      value.schemaVersion !== 1 ||
      ![
        value.nativeRunId,
        value.armDigest,
        value.runEpochDigest,
        value.ownerDigest,
        value.token,
      ].every(nonEmptyString)
    ) return null;
    return Object.freeze(value) as NativeProcessSpawnClaim;
  } catch {
    return null;
  }
}

function spawnClaimMatchesRecord(
  record: PlannedRunRecord,
  claim: NativeProcessSpawnClaim,
): boolean {
  const durable = readSpawnClaim(spawnClaimPath(record.runDirectoryPath));
  return durable !== null && digestValue(durable) === digestValue(claim) &&
    claim.nativeRunId === record.publicPlan.nativeRunId &&
    claim.armDigest === record.publicPlan.armDigest &&
    claim.runEpochDigest === record.lifecycle.runEpochDigest &&
    claim.ownerDigest === digestValue(record.owner);
}

function createSpawnClaim(record: PlannedRunRecord): NativeProcessSpawnClaim {
  if (!exactOwnedRunDirectory(record)) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  const claim = Object.freeze({
    schemaVersion: 1 as const,
    nativeRunId: record.publicPlan.nativeRunId,
    armDigest: record.publicPlan.armDigest,
    runEpochDigest: record.lifecycle.runEpochDigest,
    ownerDigest: digestValue(record.owner),
    token: crypto.randomUUID(),
  });
  let file: number;
  try {
    file = openSync(spawnClaimPath(record.runDirectoryPath), "wx", 0o600);
  } catch {
    throw new Error("NATIVE_PROCESS_SPAWN_CLAIMED");
  }
  try {
    writeFileSync(file, `${JSON.stringify(claim)}\n`, "utf-8");
    fsyncSync(file);
  } finally {
    closeSync(file);
  }
  const directory = openSync(record.runDirectoryPath, "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
  return claim;
}

function removeSpawnClaim(record: PlannedRunRecord, claim: NativeProcessSpawnClaim): void {
  if (!exactOwnedRunDirectory(record) || !spawnClaimMatchesRecord(record, claim)) {
    throw new Error("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
  }
  unlinkSync(spawnClaimPath(record.runDirectoryPath));
  const directory = openSync(record.runDirectoryPath, "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

function releaseUnadvancedSpawnClaim(
  record: PlannedRunRecord,
  claim: NativeProcessSpawnClaim,
  plannedLifecycle: ProcessRecoveryJournal,
): void {
  if (!exactOwnedRunDirectory(record) || !spawnClaimMatchesRecord(record, claim)) {
    throw new Error("NATIVE_PROCESS_SPAWN_CLAIM_MISMATCH");
  }
  const durable = readProcessRecoveryJournal(
    record.recoveryJournalPath,
    record.publicPlan.nativeRunId,
  );
  if (
    plannedLifecycle.state !== "planned" ||
    !durable ||
    digestValue(durable) !== digestValue(plannedLifecycle)
  ) {
    throw new Error("NATIVE_PROCESS_STATE_CONFLICT");
  }
  record.lifecycle = plannedLifecycle;
  removeSpawnClaim(record, claim);
}

function plannedProcessArtifactsAreAbsent(root: string, owned: OwnedRecoveryJournal): boolean {
  const runDirectoryPath = resolve(root, owned.runDirectory);
  return ![
    resolve(runDirectoryPath, "identity.json"),
    resolve(runDirectoryPath, "arm.json"),
    resolve(runDirectoryPath, "arm.json.consumed"),
    spawnClaimPath(runDirectoryPath),
  ].some(existsSync);
}

function spawnClaimMatchesOwnedJournal(root: string, owned: OwnedRecoveryJournal): boolean {
  const claim = readSpawnClaim(spawnClaimPath(resolve(root, owned.runDirectory)));
  return claim !== null &&
    claim.nativeRunId === owned.journal.nativeRunId &&
    claim.armDigest === owned.journal.armDigest &&
    claim.runEpochDigest === owned.journal.runEpochDigest &&
    claim.ownerDigest === digestValue(owned.journal.owner);
}

function quarantineOwnedRunDirectory(record: PlannedRunRecord): void {
  const quarantine = quarantinePath(record.runDirectoryPath, record.publicPlan.nativeRunId);
  renameSync(record.runDirectoryPath, quarantine);
  record.runDirectoryPath = quarantine;
  record.ownerMarkerPath = join(quarantine, "owner.json");
  if (!exactOwnedRunDirectory(record)) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
}

function rollbackUnspawnedRun(record: PlannedRunRecord): void {
  if (!exactOwnedRunDirectory(record)) {
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  quarantineOwnedRunDirectory(record);
  rmSync(record.runDirectoryPath, { recursive: true, force: true });
}

function failUnspawnedRun(
  records: Map<string, PlannedRunRecord>,
  record: PlannedRunRecord,
  cause: unknown,
): never {
  try {
    rollbackUnspawnedRun(record);
  } catch (rollbackError) {
    records.delete(record.publicPlan.nativeRunId);
    throw new AggregateError([cause, rollbackError], "NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
  }
  records.delete(record.publicPlan.nativeRunId);
  throw cause;
}

function processIdentity(value: unknown): value is ProcessIdentity {
  if (!hasExactKeys(value, ["platform", "pid", "processGroupId", "startTokenHash"])) return false;
  const identity = value as Partial<ProcessIdentity>;
  return (
    (identity.platform === "darwin" || identity.platform === "linux") &&
    Number.isInteger(identity.pid) &&
    Number(identity.pid) > 0 &&
    Number.isInteger(identity.processGroupId) &&
    Number(identity.processGroupId) > 0 &&
    typeof identity.startTokenHash === "string" &&
    identity.startTokenHash.length > 0
  );
}

function runDirectoryOwner(value: unknown): value is RunDirectoryOwner {
  return isRecord(value) &&
    hasExactKeys(value, ["device", "inode", "userId", "markerDigest"]) &&
    [value.device, value.inode, value.userId, value.markerDigest].every(nonEmptyString);
}

function runEpochDigestFor(nativeRunId: string, owner: RunDirectoryOwner): string {
  return digestValue({ schemaVersion: 1, nativeRunId, owner });
}

function recoveryOwnerIsValid(owner: NativeResourceRecoveryOwner): boolean {
  return hasExactKeys(owner, [
    "executionId",
    "attemptId",
    "attemptNonceHash",
    "planDigest",
    "waveIndex",
    "waveDigest",
    "nativeRunId",
    "fencingToken",
    "processIdentityDigest",
  ]) &&
    [
      owner.executionId,
      owner.attemptId,
      owner.attemptNonceHash,
      owner.planDigest,
      owner.waveDigest,
      owner.nativeRunId,
      owner.processIdentityDigest,
    ].every(nonEmptyString) &&
    Number.isInteger(owner.waveIndex) &&
    owner.waveIndex >= 0 &&
    Number.isInteger(owner.fencingToken) &&
    owner.fencingToken >= 1;
}

function armDigestFor(input: Readonly<{
  nativeRunId: string;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  fencingToken: number;
}>): string {
  return digestValue({
    nativeRunId: input.nativeRunId,
    executionId: input.executionId,
    attemptId: input.attemptId,
    attemptNonceHash: input.attemptNonceHash,
    planDigest: input.planDigest,
    waveIndex: input.waveIndex,
    waveDigest: input.waveDigest,
    fencingToken: input.fencingToken,
  });
}

function requireValidPlanInput(input: NativeProcessPlanInput): void {
  if (
    !input.nativeRunId ||
    !input.context ||
    !Number.isInteger(input.fencingToken) ||
    input.fencingToken < 1
  ) throw new Error("NATIVE_PROCESS_PLAN_INVALID");
}

function recoveryJournalKeysAreValid(value: Record<string, unknown>): boolean {
  return hasExactKeys(value, [
    "schemaVersion",
    "nativeRunId",
    "armDigest",
    "runEpochDigest",
    "owner",
    "state",
    "updatedAt",
    ...(value.armDeadline === undefined ? [] : ["armDeadline"]),
    ...(value.processIdentityDigest === undefined ? [] : ["processIdentityDigest"]),
    ...(value.terminal === undefined ? [] : ["terminal"]),
  ]);
}

function recoveryJournalCoreIsValid(
  value: Record<string, unknown>,
  nativeRunId: string,
): boolean {
  return value.schemaVersion === 1 &&
    value.nativeRunId === nativeRunId &&
    nonEmptyString(value.armDigest) &&
    nonEmptyString(value.runEpochDigest) &&
    runDirectoryOwner(value.owner) &&
    ["planned", "spawned", "arming", "armed", "terminal", "disposed"].includes(String(value.state)) &&
    nonEmptyString(value.updatedAt) &&
    !Number.isNaN(Date.parse(value.updatedAt));
}

function recoveryJournalOptionalFieldsAreValid(value: Record<string, unknown>): boolean {
  if (
    value.armDeadline !== undefined &&
    (!nonEmptyString(value.armDeadline) || Number.isNaN(Date.parse(value.armDeadline)))
  ) return false;
  if (value.processIdentityDigest !== undefined && !nonEmptyString(value.processIdentityDigest)) return false;
  return value.terminal === undefined || isRecord(value.terminal);
}

function recoveryJournalStateIsValid(journal: ProcessRecoveryJournal): boolean {
  if (journal.state === "planned") {
    return journal.armDeadline === undefined &&
      journal.processIdentityDigest === undefined &&
      journal.terminal === undefined;
  }
  if (!journal.armDeadline) return false;
  if (journal.state === "spawned") return journal.terminal === undefined;
  if (!journal.processIdentityDigest) return false;
  if (journal.state === "arming" || journal.state === "armed") {
    return journal.terminal === undefined;
  }
  return journal.terminal !== undefined;
}

function readProcessRecoveryJournal(
  path: string,
  nativeRunId: string,
): ProcessRecoveryJournal | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf-8"));
    if (!isRecord(value)) return null;
    if (!recoveryJournalKeysAreValid(value)) return null;
    if (!recoveryJournalCoreIsValid(value, nativeRunId)) return null;
    if (!recoveryJournalOptionalFieldsAreValid(value)) return null;
    const journal = value as unknown as ProcessRecoveryJournal;
    return recoveryJournalStateIsValid(journal) ? Object.freeze(journal) : null;
  } catch {
    return null;
  }
}

function unknownRecoveryObservation(
  owner: NativeResourceRecoveryOwner,
): NativeResourceRecoveryObservation {
  return Object.freeze({
    ownerState: "unknown",
    processIdentityDigest: owner.processIdentityDigest,
    processGroupState: "unknown",
  });
}

function observeProcessGroup(processGroupId: number): "live" | "stopped" | "unknown" {
  try {
    process.kill(-processGroupId, 0);
    return "live";
  } catch (error) {
    return isRecord(error) && error.code === "ESRCH" ? "stopped" : "unknown";
  }
}

type RecoveryGuardianState = "live" | "dead" | "reused" | "unknown";
type RecoveryGroupState = "live" | "stopped" | "unknown";

type ExactProcessRecoveryOperations = Readonly<{
  observeGuardian(identity: ProcessIdentity): RecoveryGuardianState;
  observeGroup(processGroupId: number): RecoveryGroupState;
  signalExactGroup(identity: ProcessIdentity, signal: NodeJS.Signals): boolean;
  pause(milliseconds: number): Promise<void>;
}>;

function observeRecoveryGuardian(identity: ProcessIdentity): RecoveryGuardianState {
  try {
    process.kill(identity.pid, 0);
  } catch (error) {
    return isRecord(error) && error.code === "ESRCH" ? "dead" : "unknown";
  }
  const observed = observeProcessIdentity(identity.pid, identity.platform);
  if (observed.type !== "ok") return "unknown";
  return sameProcess(identity, observed.value) ? "live" : "reused";
}

const productionExactProcessRecoveryOperations: ExactProcessRecoveryOperations = Object.freeze({
  observeGuardian: observeRecoveryGuardian,
  observeGroup: observeProcessGroup,
  signalExactGroup: signalExactProcessGroup,
  pause: delay,
});

function observeRecoveryProcessState(
  guardian: ProcessIdentity,
  operations: ExactProcessRecoveryOperations,
): Readonly<{ guardian: RecoveryGuardianState; group: RecoveryGroupState }> {
  return Object.freeze({
    guardian: operations.observeGuardian(guardian),
    group: operations.observeGroup(guardian.processGroupId),
  });
}

function recoveryProcessStateIsStopped(
  state: Readonly<{ guardian: RecoveryGuardianState; group: RecoveryGroupState }>,
): boolean {
  return state.guardian === "dead" && state.group === "stopped";
}

async function recoverExactNativeProcess(
  guardian: ProcessIdentity,
  graceMs: number,
  operations: ExactProcessRecoveryOperations = productionExactProcessRecoveryOperations,
): Promise<"stopped" | "unknown"> {
  if (guardian.pid !== guardian.processGroupId) return "unknown";
  const initial = observeRecoveryProcessState(guardian, operations);
  if (recoveryProcessStateIsStopped(initial)) return "stopped";
  if (initial.guardian !== "live" || initial.group !== "live") return "unknown";
  if (!operations.signalExactGroup(guardian, "SIGTERM")) return "unknown";
  await operations.pause(graceMs);
  const afterTerm = observeRecoveryProcessState(guardian, operations);
  if (recoveryProcessStateIsStopped(afterTerm)) return "stopped";
  if (afterTerm.guardian !== "live" || afterTerm.group !== "live") return "unknown";
  if (!operations.signalExactGroup(guardian, "SIGKILL")) return "unknown";
  await operations.pause(graceMs);
  return recoveryProcessStateIsStopped(observeRecoveryProcessState(guardian, operations))
    ? "stopped"
    : "unknown";
}

function aggregateProcessGroups(
  identities: readonly ProcessIdentity[],
): "live" | "stopped" | "unknown" {
  const states = [...new Set(identities.map((identity) => identity.processGroupId))]
    .map(observeProcessGroup);
  if (states.includes("live")) return "live";
  if (states.includes("unknown")) return "unknown";
  return "stopped";
}

type OwnedRecoveryJournal = Readonly<{
  runDirectory: string;
  journal: ProcessRecoveryJournal;
}>;

function loadOwnedNativeRunJournal(
  root: string,
  nativeRunId: string,
): OwnedRecoveryJournal | null {
  const runDirectory = `.amadeus-swarm-driver/native/${digestValue(nativeRunId).slice(0, 24)}`;
  const runDirectoryPath = resolve(root, runDirectory);
  const journal = readProcessRecoveryJournal(resolve(runDirectoryPath, "recovery.json"), nativeRunId);
  if (!journal) return null;
  if (!directoryMatchesOwner(runDirectoryPath, journal.owner)) return null;
  if (!markerMatchesOwner(resolve(runDirectoryPath, "owner.json"), nativeRunId, journal.owner)) return null;
  if (journal.runEpochDigest !== runEpochDigestFor(nativeRunId, journal.owner)) return null;
  return Object.freeze({ runDirectory, journal });
}

function loadOwnedRecoveryJournal(
  root: string,
  owner: NativeResourceRecoveryOwner,
): OwnedRecoveryJournal | null {
  const owned = loadOwnedNativeRunJournal(root, owner.nativeRunId);
  if (!owned) return null;
  const { journal } = owned;
  if (journal.processIdentityDigest !== owner.processIdentityDigest) return null;
  return owned;
}

function recoveryTerminalMatches(
  journal: ProcessRecoveryJournal,
  owner: NativeResourceRecoveryOwner,
  identity: ProcessIdentity,
): boolean {
  if (!journal.terminal) return true;
  return journal.terminal.nativeRunId === owner.nativeRunId &&
    journal.terminal.processIdentityDigest === owner.processIdentityDigest &&
    journal.terminal.processGroupId === identity.processGroupId;
}

function loadRecoveryIdentity(
  root: string,
  owned: OwnedRecoveryJournal,
  owner: NativeResourceRecoveryOwner,
): ProcessIdentity | null {
  const plan: PlannedProcessRun = Object.freeze({
    nativeRunId: owner.nativeRunId,
    identityRelativePath: `${owned.runDirectory}/identity.json`,
    armRelativePath: `${owned.runDirectory}/arm.json`,
    armDigest: armDigestFor(owner),
    runEpochDigest: owned.journal.runEpochDigest,
    recoveryJournalRelativePath: `${owned.runDirectory}/recovery.json`,
  });
  const identity = readRunIdentity(
    resolve(root, plan.identityRelativePath),
    plan,
    owned.journal.armDeadline!,
  );
  if (!identity || digestValue(identity.process) !== owner.processIdentityDigest) return null;
  if (!recoveryTerminalMatches(owned.journal, owner, identity.process)) return null;
  return identity.process;
}

function loadAttemptRecoveryIdentity(
  root: string,
  owned: OwnedRecoveryJournal,
  target: NativeProcessRecoveryTarget,
): ProcessIdentity | null {
  if (!owned.journal.armDeadline) return null;
  const plan: PlannedProcessRun = Object.freeze({
    nativeRunId: target.nativeRunId,
    identityRelativePath: `${owned.runDirectory}/identity.json`,
    armRelativePath: `${owned.runDirectory}/arm.json`,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    recoveryJournalRelativePath: `${owned.runDirectory}/recovery.json`,
  });
  const identity = readRunIdentity(
    resolve(root, plan.identityRelativePath),
    plan,
    owned.journal.armDeadline,
  );
  if (!identity) return null;
  const processIdentityDigest = digestValue(identity.process);
  if (
    owned.journal.processIdentityDigest !== undefined &&
    processIdentityDigest !== owned.journal.processIdentityDigest
  ) return null;
  if (
    owned.journal.terminal &&
    (
      owned.journal.terminal.nativeRunId !== target.nativeRunId ||
      owned.journal.terminal.processIdentityDigest !== processIdentityDigest ||
      owned.journal.terminal.processGroupId !== identity.process.processGroupId
    )
  ) return null;
  return identity.process;
}

function observeRecoveryIdentity(
  owner: NativeResourceRecoveryOwner,
  identity: ProcessIdentity,
): NativeResourceRecoveryObservation {
  const observed = observeProcessIdentity(identity.pid, identity.platform);
  const ownerState = observed.type === "ok" && sameProcess(identity, observed.value)
    ? "live"
    : "dead";
  const processGroupState = aggregateProcessGroups([identity]);
  return recoveryObservationFromStates(owner, ownerState, processGroupState);
}

function recoveryObservationFromStates(
  owner: NativeResourceRecoveryOwner,
  ownerState: NativeResourceRecoveryObservation["ownerState"],
  processGroupState: NativeResourceRecoveryObservation["processGroupState"],
): NativeResourceRecoveryObservation {
  if (ownerState === "live" && processGroupState === "stopped") {
    return unknownRecoveryObservation(owner);
  }
  return Object.freeze({
    ownerState,
    processIdentityDigest: owner.processIdentityDigest,
    processGroupState,
  });
}

function createRecoveryObserver(
  rootDir: string,
): NativeResourceRecoveryObserverPort {
  const root = resolve(rootDir);
  return Object.freeze({
    async observe(owner): Promise<NativeResourceRecoveryObservation> {
      if (!recoveryOwnerIsValid(owner)) return unknownRecoveryObservation(owner);
      const owned = loadOwnedRecoveryJournal(root, owner);
      if (!owned) return unknownRecoveryObservation(owner);
      const identity = loadRecoveryIdentity(root, owned, owner);
      return identity
        ? observeRecoveryIdentity(owner, identity)
        : unknownRecoveryObservation(owner);
    },
  });
}

function processRecoveryTargetIsValid(value: NativeProcessRecoveryTarget): boolean {
  return hasExactKeys(value, [
    "kind",
    "schemaVersion",
    "nativeRunId",
    "armDigest",
    "runEpochDigest",
    "processIdentityDigest",
  ]) &&
    value.kind === "native-process-recovery" &&
    value.schemaVersion === 1 &&
    nonEmptyString(value.nativeRunId) &&
    nonEmptyString(value.armDigest) &&
    nonEmptyString(value.runEpochDigest) &&
    (value.processIdentityDigest === null || nonEmptyString(value.processIdentityDigest));
}

function processRecoveryReceipt(
  target: NativeProcessRecoveryTarget,
  disposition: NativeProcessRecoveryReceipt["disposition"],
  processIdentityDigest: string | null,
): NativeProcessRecoveryReceipt {
  const semantic = Object.freeze({
    kind: "native-process-recovery-receipt" as const,
    schemaVersion: 1 as const,
    targetDigest: digestValue(target),
    nativeRunId: target.nativeRunId,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    processIdentityDigest,
    disposition,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function unknownProcessRecovery(): NativeProcessRecoveryResult {
  return Object.freeze({ status: "unknown" });
}

function recoverPlannedNativeProcess(
  root: string,
  owned: OwnedRecoveryJournal,
  target: NativeProcessRecoveryTarget,
): NativeProcessRecoveryResult {
  if (target.processIdentityDigest !== null) return unknownProcessRecovery();
  if (!plannedProcessArtifactsAreAbsent(root, owned)) return unknownProcessRecovery();
  const receipt = processRecoveryReceipt(target, "unarmed", null);
  return Object.freeze({ status: "unarmed", receipt });
}

async function recoverStartedNativeProcess(
  root: string,
  owned: OwnedRecoveryJournal,
  target: NativeProcessRecoveryTarget,
  graceMs: number,
  operations: ExactProcessRecoveryOperations = productionExactProcessRecoveryOperations,
): Promise<NativeProcessRecoveryResult> {
  if (!spawnClaimMatchesOwnedJournal(root, owned)) return unknownProcessRecovery();
  const identity = loadAttemptRecoveryIdentity(root, owned, target);
  if (!identity) return unknownProcessRecovery();
  const processIdentityDigest = digestValue(identity);
  if (
    target.processIdentityDigest !== null &&
    target.processIdentityDigest !== processIdentityDigest
  ) return unknownProcessRecovery();
  if (await recoverExactNativeProcess(identity, graceMs, operations) !== "stopped") {
    return unknownProcessRecovery();
  }
  const receipt = processRecoveryReceipt(target, "stopped", processIdentityDigest);
  return Object.freeze({ status: "stopped", receipt });
}

function readRunIdentity(path: string, plan: PlannedProcessRun, armDeadline: string): NativeRunIdentity | null {
  if (!existsSync(path)) return null;
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf-8"));
    if (
      !hasExactKeys(value, [
        "schemaVersion",
        "nativeRunId",
        "armDigest",
        "runEpochDigest",
        "armDeadline",
        "process",
      ]) ||
      value.schemaVersion !== 1 ||
      value.nativeRunId !== plan.nativeRunId ||
      value.armDigest !== plan.armDigest ||
      value.runEpochDigest !== plan.runEpochDigest ||
      value.armDeadline !== armDeadline ||
      !processIdentity(value.process)
    ) {
      return null;
    }
    return Object.freeze(value as unknown as NativeRunIdentity);
  } catch {
    return null;
  }
}

function wrapperPlanIsValid(value: unknown): value is WrapperPlan {
  return hasExactKeys(value, [
    "schemaVersion",
    "nativeRunId",
    "identityPath",
    "armPath",
    "armDigest",
    "runEpochDigest",
    "armDeadline",
  ]) &&
    value.schemaVersion === 1 &&
    [
      value.nativeRunId,
      value.identityPath,
      value.armPath,
      value.armDigest,
      value.runEpochDigest,
    ].every(nonEmptyString) &&
    nonEmptyString(value.armDeadline) &&
    !Number.isNaN(Date.parse(value.armDeadline));
}

function serializeTransport(transport: CoordinatorTransport): SerializedTransport {
  if (transport.kind === "stdio-json") {
    return Object.freeze({
      kind: transport.kind,
      stdin: transport.stdin === "closed"
        ? Object.freeze({ kind: "closed" as const })
        : Object.freeze({ kind: "bytes" as const, base64: Buffer.from(transport.stdin).toString("base64") }),
    });
  }
  return Object.freeze({
    kind: transport.kind,
    initialInputBase64: Buffer.from(transport.initialInput).toString("base64"),
    columns: transport.columns,
    rows: transport.rows,
  });
}

function launchMessage(launch: LaunchSpec): LaunchMessage {
  return Object.freeze({
    kind: "launch",
    executable: launch.executable,
    args: Object.freeze([...launch.args]),
    cwd: launch.cwd,
    env: Object.freeze({ ...launch.env }),
    transport: serializeTransport(launch.transport),
  });
}

function exactProcessIsLive(expected: ProcessIdentity): boolean {
  const observed = observeProcessIdentity(expected.pid, expected.platform);
  return observed.type === "ok" && sameProcess(expected, observed.value);
}

function signalExactProcessGroup(
  expected: ProcessIdentity,
  signal: NodeJS.Signals,
  sendSignal: (processGroupId: number, signal: NodeJS.Signals) => void = process.kill,
): boolean {
  const observed = observeProcessIdentity(expected.pid, expected.platform);
  if (observed.type !== "ok" || !sameProcess(expected, observed.value)) return false;
  try {
    sendSignal(-expected.processGroupId, signal);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilGone(expected: ProcessIdentity, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!exactProcessIsLive(expected)) return true;
    await delay(10);
  }
  return !exactProcessIsLive(expected);
}

async function terminatePinnedGuardianGroup(
  guardian: ProcessIdentity,
  guardianExit: Promise<number>,
  graceMs: number,
  operations: Readonly<{
    signalGroup(identity: ProcessIdentity, signal: NodeJS.Signals): boolean;
    pause(milliseconds: number): Promise<void>;
    waitGone(identity: ProcessIdentity, timeoutMs: number): Promise<boolean>;
    waitGroup(processGroupId: number, timeoutMs: number): Promise<"live" | "stopped" | "unknown">;
  }> = Object.freeze({
    signalGroup: signalExactProcessGroup,
    pause: delay,
    waitGone: waitUntilGone,
    waitGroup: waitUntilProcessGroupStopped,
  }),
): Promise<number> {
  if (guardian.processGroupId !== guardian.pid) {
    throw new Error("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");
  }
  if (!operations.signalGroup(guardian, "SIGTERM")) {
    throw new Error("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");
  }
  await operations.pause(graceMs);
  // The guardian ignores TERM and remains the exact group leader through the
  // KILL syscall, pinning ownership without relying on PGID allocator timing.
  if (!operations.signalGroup(guardian, "SIGKILL")) {
    throw new Error("NATIVE_PROCESS_GUARDIAN_GROUP_UNFENCED");
  }
  const exitCode = await raceTimeout(guardianExit, graceMs);
  if (exitCode === null) throw new Error("NATIVE_PROCESS_GUARDIAN_ACTIVE");
  const [guardianGone, groupState] = await Promise.all([
    operations.waitGone(guardian, graceMs),
    operations.waitGroup(guardian.processGroupId, graceMs),
  ]);
  if (!guardianGone || groupState !== "stopped") {
    throw new Error("NATIVE_PROCESS_GUARDIAN_GROUP_ACTIVE");
  }
  return exitCode;
}

function raceTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([promise, delay(Math.max(1, timeoutMs)).then(() => null)]);
}

function closedTerminal(
  transport: CoordinatorTransport["kind"],
  exitCode: number,
  plan: PlannedProcessRun,
  identity: ProcessIdentity,
  controlSignalDigest?: string,
): ProcessTerminal {
  return Object.freeze({
    transport,
    exitCode,
    processGroupId: identity.processGroupId,
    nativeRunId: plan.nativeRunId,
    processIdentityDigest: digestValue(identity),
    ...(controlSignalDigest ? { controlSignalDigest } : {}),
  });
}

async function oneControlSignal(signals: AsyncIterable<DriverControlSignal> | undefined): Promise<DriverControlSignal> {
  if (!signals) throw new Error("NATIVE_PROCESS_CONTROL_SIGNAL_MISSING");
  const iterator = signals[Symbol.asyncIterator]();
  const first = await iterator.next();
  if (first.done) throw new Error("NATIVE_PROCESS_CONTROL_SIGNAL_MISSING");
  const second = await iterator.next();
  if (!second.done) throw new Error("NATIVE_PROCESS_CONTROL_SIGNAL_DUPLICATE");
  return first.value;
}

function providerTerminalMessage(
  value: unknown,
  nativeRunId: string,
): ProviderTerminalMessage | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "kind",
      "schemaVersion",
      "nativeRunId",
      "guardianIdentityDigest",
      "providerExitCode",
    ]) ||
    value.kind !== "provider-terminal" ||
    value.schemaVersion !== 1 ||
    value.nativeRunId !== nativeRunId ||
    !nonEmptyString(value.guardianIdentityDigest) ||
    !Number.isInteger(value.providerExitCode)
  ) return null;
  return Object.freeze(value) as ProviderTerminalMessage;
}

function observeProviderTerminal(
  child: GuardianProcess,
  nativeRunId: string,
): Promise<ProviderTerminalMessage> {
  return new Promise((resolveTerminal, rejectTerminal) => {
    let settled = false;
    child.on("message", (value) => {
      if (settled) return;
      const terminal = providerTerminalMessage(value, nativeRunId);
      if (!terminal) {
        settled = true;
        rejectTerminal(new Error("NATIVE_PROCESS_PROVIDER_TERMINAL_INVALID"));
        return;
      }
      settled = true;
      resolveTerminal(terminal);
    });
    child.once("exit", () => {
      if (settled) return;
      settled = true;
      rejectTerminal(new Error("NATIVE_PROCESS_GUARDIAN_EXITED"));
    });
  });
}

function sessionFor(
  child: GuardianProcess,
  record: PlannedRunRecord,
  wrapperPlan: WrapperPlan,
  launch: LaunchSpec,
  launchLine: string,
  output: NativeProcessOutputPort,
  platform: NodeJS.Platform,
  graceMs: number,
  startedAt: number,
  now: () => Date,
  onDisposed: () => void,
): ContextualNativeProcessSession {
  const { publicPlan: plan } = record;
  let observedIdentity: NativeRunIdentity | null = null;
  let terminal: ProcessTerminal | null = null;
  let outputError: unknown;
  let outputClosed = false;
  const ensureOpen = (): void => {
    if (record.lifecycle.state === "disposed") throw new Error("NATIVE_PROCESS_DISPOSED");
  };
  const closeOutput = (): void => {
    if (outputClosed) return;
    outputClosed = true;
    try {
      output.close(plan.nativeRunId);
    } catch (error) {
      outputError ??= error;
    }
  };
  const failOutput = (error: unknown): void => {
    if (outputClosed) return;
    outputClosed = true;
    try {
      output.fail(plan.nativeRunId, error);
    } catch (nested) {
      outputError ??= nested;
    }
  };
  const exit = new Promise<number>((resolveExit) => {
    child.once("close", (code) => {
      closeOutput();
      resolveExit(code ?? 1);
    });
    child.once("error", failOutput);
  });
  const providerTerminal = observeProviderTerminal(child, plan.nativeRunId);
  void providerTerminal.catch(() => {});
  const emit = (frame: NativeProcessOutputFrame): void => {
    try {
      output.publish(plan.nativeRunId, frame);
    } catch (error) {
      outputError ??= error;
      failOutput(error);
    }
  };
  child.stdout.on("data", (chunk: Buffer) => emit(launch.transport.kind === "stdio-json"
    ? Object.freeze({
        kind: "evidence",
        transport: "stdio-json",
        channel: "stdout",
        bytes: new Uint8Array(chunk),
      })
    : Object.freeze({
        kind: "diagnostic",
        transport: "pty-interactive",
        channel: "pty",
        bytes: new Uint8Array(chunk),
      })));
  child.stderr.on("data", (chunk: Buffer) => emit(launch.transport.kind === "stdio-json"
    ? Object.freeze({
        kind: "diagnostic",
        transport: "stdio-json",
        channel: "stderr",
        bytes: new Uint8Array(chunk),
      })
    : Object.freeze({
        kind: "diagnostic",
        transport: "pty-interactive",
        channel: "pty",
        bytes: new Uint8Array(chunk),
      })));
  child.stdin.write(launchLine);

  const identity = async (): Promise<NativeRunIdentity> => {
    ensureOpen();
    if (observedIdentity) return observedIdentity;
    const deadline = Date.parse(wrapperPlan.armDeadline);
    while (Date.now() < deadline) {
      const candidate = readRunIdentity(wrapperPlan.identityPath, plan, wrapperPlan.armDeadline);
      if (candidate) {
        const observed = observeProcessIdentity(candidate.process.pid, platform);
        if (observed.type !== "ok" || !sameProcess(candidate.process, observed.value) || candidate.process.pid !== child.pid) {
          throw new Error("NATIVE_PROCESS_IDENTITY_MISMATCH");
        }
        observedIdentity = candidate;
        return candidate;
      }
      const exited = await raceTimeout(exit, 10);
      if (exited !== null) throw new Error("NATIVE_PROCESS_IDENTITY_MISSING");
    }
    throw new Error("NATIVE_PROCESS_IDENTITY_TIMEOUT");
  };

  const terminate = async (): Promise<ProcessTerminal> => {
    ensureOpen();
    if (terminal) return terminal;
    const runIdentity = await identity();
    const code = await terminatePinnedGuardianGroup(runIdentity.process, exit, graceMs);
    terminal = closedTerminal(launch.transport.kind, code, plan, runIdentity.process);
    transitionLifecycle(
      record,
      ["spawned", "arming", "armed"],
      "terminal",
      now,
      { processIdentityDigest: digestValue(runIdentity.process), terminal },
    );
    return terminal;
  };

  return Object.freeze({
    async observeIdentity() {
      const value = await identity();
      const processIdentityDigest = digestValue(value.process);
      if (record.lifecycle.processIdentityDigest !== processIdentityDigest) {
        transitionLifecycle(
          record,
          ["spawned"],
          "spawned",
          now,
          { processIdentityDigest },
        );
      }
      return Object.freeze({
        processIdentityDigest,
        armDigest: value.armDigest,
        armDeadline: value.armDeadline,
      });
    },

    async arm() {
      ensureOpen();
      if (record.lifecycle.state !== "spawned") throw new Error("NATIVE_PROCESS_ARM_ALREADY_CONSUMED");
      transitionLifecycle(record, ["spawned"], "arming", now);
      try {
        if (existsSync(`${wrapperPlan.armPath}.consumed`) || existsSync(wrapperPlan.armPath)) {
          throw new Error("NATIVE_PROCESS_ARM_ALREADY_CONSUMED");
        }
        const value = await identity();
        const processIdentityDigest = digestValue(value.process);
        const receipt: ArmReceipt = Object.freeze({
          schemaVersion: 1,
          nativeRunId: plan.nativeRunId,
          armDigest: plan.armDigest,
          runEpochDigest: wrapperPlan.runEpochDigest,
          processIdentityDigest,
        });
        atomicJson(wrapperPlan.armPath, receipt);
        transitionLifecycle(record, ["arming"], "armed", now, { processIdentityDigest });
      } catch (error) {
        restoreSpawnedAfterArmFailure(record, now);
        throw error;
      }
    },

    async waitForTerminal(input) {
      ensureOpen();
      if (terminal) return terminal;
      if (record.lifecycle.state !== "armed") throw new Error(`NATIVE_PROCESS_STATE_${record.lifecycle.state.toUpperCase()}`);
      if (input.transport.kind !== launch.transport.kind) throw new Error("NATIVE_PROCESS_TRANSPORT_MISMATCH");
      const runIdentity = await identity();
      let controlSignalDigest: string | undefined;
      let waitMs = Math.max(1, launch.timeoutMs - (Date.now() - startedAt));
      if (launch.transport.kind === "pty-interactive") {
        const signal = await oneControlSignal(input.controlSignals);
        controlSignalDigest = digestValue(signal);
        const message: GracefulExitMessage = Object.freeze({
          kind: "graceful-exit",
          inputBase64: Buffer.from(launch.transport.gracefulExitInput).toString("base64"),
        });
        child.stdin.write(`${JSON.stringify(message)}\n`);
        waitMs = Math.min(waitMs, launch.transport.gracefulExitTimeoutMs);
      }
      const providerResult = await raceTimeout(providerTerminal, waitMs);
      if (providerResult === null) {
        await terminate();
        const timeoutCode = launch.transport.kind === "pty-interactive"
          ? "NATIVE_PROCESS_GRACEFUL_EXIT_TIMEOUT"
          : "NATIVE_PROCESS_TIMEOUT";
        throw new Error(timeoutCode);
      }
      if (providerResult.guardianIdentityDigest !== digestValue(runIdentity.process)) {
        throw new Error("NATIVE_PROCESS_PROVIDER_TERMINAL_INVALID");
      }
      await terminatePinnedGuardianGroup(runIdentity.process, exit, graceMs);
      terminal = closedTerminal(
        launch.transport.kind,
        providerResult.providerExitCode,
        plan,
        runIdentity.process,
        controlSignalDigest,
      );
      transitionLifecycle(
        record,
        ["armed"],
        "terminal",
        now,
        { processIdentityDigest: digestValue(runIdentity.process), terminal },
      );
      if (outputError) throw outputError;
      return terminal;
    },

    async terminateAndWait() {
      return terminate();
    },

    async dispose() {
      if (!exactOwnedRunDirectory(record)) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
      if (record.lifecycle.state !== "disposed") {
        transitionLifecycle(record, ["terminal"], "disposed", now);
      }
      if (!exactOwnedRunDirectory(record)) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
      quarantineOwnedRunDirectory(record);
      rmSync(record.runDirectoryPath, { recursive: true, force: true });
      onDisposed();
    },
  });
}

function recordFromOwnedJournal(
  rootDir: string,
  plan: PlannedProcessRun,
  owned: OwnedRecoveryJournal,
): PlannedRunRecord {
  const runDirectoryPath = resolve(rootDir, owned.runDirectory);
  return {
    publicPlan: plan,
    wrapperPlan: Object.freeze({
      schemaVersion: 1,
      nativeRunId: plan.nativeRunId,
      identityPath: resolve(rootDir, plan.identityRelativePath),
      armPath: resolve(rootDir, plan.armRelativePath),
      armDigest: plan.armDigest,
      runEpochDigest: owned.journal.runEpochDigest,
    }),
    runDirectoryPath,
    ownerMarkerPath: resolve(runDirectoryPath, "owner.json"),
    owner: owned.journal.owner,
    recoveryJournalPath: resolve(rootDir, plan.recoveryJournalRelativePath),
    lifecycle: owned.journal,
  };
}

function plannedRecordForSpawn(
  rootDir: string,
  records: Map<string, PlannedRunRecord>,
  plan: PlannedProcessRun,
): PlannedRunRecord {
  runDirectoryForPlan(plan);
  const record = records.get(plan.nativeRunId);
  if (!record || digestValue(record.publicPlan) !== digestValue(plan)) {
    throw new Error("NATIVE_PROCESS_PLAN_MISSING");
  }
  if (record.lifecycle.state !== "planned") throw new Error("NATIVE_PROCESS_STATE_SPAWNED");
  const durable = loadOwnedNativeRunJournal(resolve(rootDir), plan.nativeRunId);
  if (!durable) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  if (
    durable.journal.armDigest !== plan.armDigest ||
    durable.journal.runEpochDigest !== plan.runEpochDigest ||
    digestValue(durable.journal.owner) !== digestValue(record.owner)
  ) throw new Error("NATIVE_PROCESS_PLAN_CONFLICT");
  if (durable.journal.state !== "planned") throw new Error("NATIVE_PROCESS_STATE_SPAWNED");
  const current = recordFromOwnedJournal(rootDir, plan, durable);
  records.set(plan.nativeRunId, current);
  return current;
}

function claimSpawnTransition(
  record: PlannedRunRecord,
  armDeadline: string,
  now: () => Date,
): NativeProcessSpawnClaim {
  const plannedLifecycle = record.lifecycle;
  const claim = createSpawnClaim(record);
  try {
    transitionLifecycle(record, ["planned"], "spawned", now, { armDeadline });
  } catch (error) {
    try {
      releaseUnadvancedSpawnClaim(record, claim, plannedLifecycle);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
    }
    throw error;
  }
  return claim;
}

function releasablePlannedRecord(
  rootDir: string,
  plan: PlannedProcessRun,
): PlannedRunRecord | null {
  const root = resolve(rootDir);
  const runDirectory = runDirectoryForPlan(plan);
  const durable = loadOwnedNativeRunJournal(root, plan.nativeRunId);
  if (!durable) {
    if (!existsSync(resolve(root, runDirectory))) return null;
    throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
  }
  if (
    durable.journal.armDigest !== plan.armDigest ||
    durable.journal.runEpochDigest !== plan.runEpochDigest
  ) {
    throw new Error("NATIVE_PROCESS_PLAN_CONFLICT");
  }
  if (
    durable.journal.state !== "planned" ||
    !plannedProcessArtifactsAreAbsent(root, durable)
  ) throw new Error("NATIVE_PROCESS_PLAN_ACTIVE");
  const record = recordFromOwnedJournal(rootDir, plan, durable);
  if (digestValue(record.publicPlan) !== digestValue(plan)) {
    throw new Error("NATIVE_PROCESS_PLAN_CONFLICT");
  }
  if (record.lifecycle.state !== "planned") throw new Error("NATIVE_PROCESS_PLAN_ACTIVE");
  return record;
}

export function createNativeProcessPort(config: NativeProcessPortConfig): ContextualNativeProcessPort {
  const platform = config.platform ?? process.platform;
  const now = config.now ?? (() => new Date());
  const armTimeoutMs = config.armTimeoutMs ?? DEFAULT_ARM_TIMEOUT_MS;
  const graceMs = config.terminationGraceMs ?? DEFAULT_TERMINATION_GRACE_MS;
  const records = new Map<string, PlannedRunRecord>();

  const port: ContextualNativeProcessPort = Object.freeze({
    plan(baseInput): ContextualPlannedProcessRun {
      requireSupportedPlatform(platform);
      const input = baseInput as NativeProcessPlanInput;
      requireValidPlanInput(input);
      const runDirectory = `.amadeus-swarm-driver/native/${digestValue(input.nativeRunId).slice(0, 24)}`;
      const identityRelativePath = `${runDirectory}/identity.json`;
      const armRelativePath = `${runDirectory}/arm.json`;
      const armDigest = armDigestFor({
        nativeRunId: input.nativeRunId,
        executionId: input.context.executionId,
        attemptId: input.context.attemptId,
        attemptNonceHash: input.context.attemptNonceHash,
        planDigest: input.context.planDigest,
        waveIndex: input.context.waveIndex,
        waveDigest: input.context.waveDigest,
        fencingToken: input.fencingToken,
      });
      const publicPlan = (runEpochDigest: string): ContextualPlannedProcessRun => Object.freeze({
        nativeRunId: input.nativeRunId,
        identityRelativePath,
        armRelativePath,
        armDigest,
        runEpochDigest,
        recoveryJournalRelativePath: `${runDirectory}/recovery.json`,
      });
      const existing = records.get(input.nativeRunId);
      if (existing) {
        const expected = publicPlan(existing.lifecycle.runEpochDigest);
        if (digestValue(existing.publicPlan) !== digestValue(expected)) {
          throw new Error("NATIVE_PROCESS_PLAN_CONFLICT");
        }
        return existing.publicPlan as ContextualPlannedProcessRun;
      }
      const durable = loadOwnedNativeRunJournal(resolve(config.rootDir), input.nativeRunId);
      if (durable) {
        if (durable.journal.state !== "planned" || durable.journal.armDigest !== armDigest) {
          throw new Error("NATIVE_PROCESS_PLAN_CONFLICT");
        }
        const recoveredPlan = publicPlan(durable.journal.runEpochDigest);
        records.set(input.nativeRunId, recordFromOwnedJournal(config.rootDir, recoveredPlan, durable));
        return recoveredPlan;
      }
      const runDirectoryPath = resolve(config.rootDir, runDirectory);
      const ownership = createOwnedRunDirectory(runDirectoryPath, input.nativeRunId);
      const runEpochDigest = runEpochDigestFor(input.nativeRunId, ownership.owner);
      const planned = publicPlan(runEpochDigest);
      const record: PlannedRunRecord = {
        publicPlan: planned,
        wrapperPlan: Object.freeze({
          schemaVersion: 1,
          nativeRunId: planned.nativeRunId,
          identityPath: resolve(config.rootDir, planned.identityRelativePath),
          armPath: resolve(config.rootDir, planned.armRelativePath),
          armDigest: planned.armDigest,
          runEpochDigest,
        }),
        runDirectoryPath,
        ownerMarkerPath: ownership.markerPath,
        owner: ownership.owner,
        recoveryJournalPath: resolve(config.rootDir, planned.recoveryJournalRelativePath),
        lifecycle: Object.freeze({
          schemaVersion: 1,
          nativeRunId: planned.nativeRunId,
          armDigest: planned.armDigest,
          runEpochDigest,
          owner: ownership.owner,
          state: "planned",
          updatedAt: now().toISOString(),
        }),
      };
      try {
        atomicJson(record.recoveryJournalPath, record.lifecycle);
        records.set(input.nativeRunId, record);
      } catch (error) {
        failUnspawnedRun(records, record, error);
      }
      return planned;
    },

    async spawn({ plan, launch }) {
      requireSupportedPlatform(platform);
      const record = plannedRecordForSpawn(config.rootDir, records, plan);
      const launchLine = `${JSON.stringify(launchMessage(launch))}\n`;
      const wrapperPlan: WrapperPlan = Object.freeze({
        ...record.wrapperPlan,
        armDeadline: new Date(now().getTime() + armTimeoutMs).toISOString(),
      });
      const claim = claimSpawnTransition(record, wrapperPlan.armDeadline, now);
      let wrapper: GuardianProcess | undefined;
      try {
        if (!exactOwnedRunDirectory(record)) throw new Error("NATIVE_PROCESS_RUN_DIRECTORY_OWNERSHIP_MISMATCH");
        mkdirSync(dirname(wrapperPlan.identityPath), { recursive: true });
        const encodedPlan = Buffer.from(JSON.stringify(wrapperPlan), "utf-8").toString("base64");
        wrapper = spawn(
          config.wrapperExecutable ?? process.execPath,
          [fileURLToPath(import.meta.url), "native-process-wrapper", encodedPlan],
          { detached: true, stdio: ["pipe", "pipe", "pipe", "ipc"] },
        ) as GuardianProcess;
        return sessionFor(
          wrapper,
          record,
          wrapperPlan,
          launch,
          launchLine,
          config.output,
          platform,
          graceMs,
          Date.now(),
          now,
          () => records.delete(plan.nativeRunId),
        );
      } catch (error) {
        if (wrapper) throw error;
        try {
          restorePlannedAfterSpawnFailure(record, claim, now);
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], "NATIVE_PROCESS_SPAWN_ROLLBACK_FAILED");
        }
        throw error;
      }
    },

    async releasePlan(plan) {
      const record = releasablePlannedRecord(config.rootDir, plan);
      if (!record) {
        records.delete(plan.nativeRunId);
        return;
      }
      rollbackUnspawnedRun(record);
      records.delete(plan.nativeRunId);
    },

    async recoverAttempt(target) {
      requireSupportedPlatform(platform);
      if (!processRecoveryTargetIsValid(target)) return unknownProcessRecovery();
      const owned = loadOwnedNativeRunJournal(resolve(config.rootDir), target.nativeRunId);
      if (
        !owned ||
        owned.journal.armDigest !== target.armDigest ||
        owned.journal.runEpochDigest !== target.runEpochDigest
      ) return unknownProcessRecovery();
      if (owned.journal.state === "planned") {
        return recoverPlannedNativeProcess(resolve(config.rootDir), owned, target);
      }
      return await recoverStartedNativeProcess(resolve(config.rootDir), owned, target, graceMs);
    },

    recoveryObserver: createRecoveryObserver(config.rootDir),

    activeRecordCount() {
      return records.size;
    },
  });
  return port;
}

async function waitForArm(plan: WrapperPlan, identity: NativeRunIdentity): Promise<boolean> {
  const consumedPath = `${plan.armPath}.consumed`;
  while (Date.now() < Date.parse(plan.armDeadline)) {
    if (existsSync(consumedPath)) return false;
    if (existsSync(plan.armPath)) {
      try {
        renameSync(plan.armPath, consumedPath);
        const receipt: unknown = JSON.parse(readFileSync(consumedPath, "utf-8"));
        return (
          hasExactKeys(receipt, [
            "schemaVersion",
            "nativeRunId",
            "armDigest",
            "runEpochDigest",
            "processIdentityDigest",
          ]) &&
          receipt.schemaVersion === 1 &&
          receipt.nativeRunId === plan.nativeRunId &&
          receipt.armDigest === plan.armDigest &&
          receipt.runEpochDigest === plan.runEpochDigest &&
          receipt.processIdentityDigest === digestValue(identity.process)
        );
      } catch {
        return false;
      }
    }
    await delay(10);
  }
  return false;
}

function parseLaunch(line: string): LaunchMessage | null {
  try {
    const value = JSON.parse(line) as Partial<LaunchMessage>;
    if (
      value.kind !== "launch" ||
      typeof value.executable !== "string" ||
      !Array.isArray(value.args) ||
      typeof value.cwd !== "string" ||
      typeof value.env !== "object" ||
      value.env === null ||
      typeof value.transport !== "object" ||
      value.transport === null ||
      (value.transport.kind !== "stdio-json" && value.transport.kind !== "pty-interactive")
    ) return null;
    return value as LaunchMessage;
  } catch {
    return null;
  }
}

function signalExactProcess(
  expected: ProcessIdentity,
  signal: NodeJS.Signals,
  sendSignal: (pid: number, signal: NodeJS.Signals) => void = process.kill,
): boolean {
  const observed = observeProcessIdentity(expected.pid, expected.platform);
  if (observed.type !== "ok" || !sameProcess(expected, observed.value)) return false;
  try {
    sendSignal(expected.pid, signal);
    return true;
  } catch {
    return false;
  }
}

async function stopExactChild(
  expected: ProcessIdentity,
  operations: Readonly<{
    signal(identity: ProcessIdentity, signal: NodeJS.Signals): boolean;
    waitGone(identity: ProcessIdentity, timeoutMs: number): Promise<boolean>;
  }> = Object.freeze({ signal: signalExactProcess, waitGone: waitUntilGone }),
): Promise<void> {
  operations.signal(expected, "SIGTERM");
  if (await operations.waitGone(expected, DEFAULT_TERMINATION_GRACE_MS)) return;
  operations.signal(expected, "SIGKILL");
  if (!await operations.waitGone(expected, DEFAULT_TERMINATION_GRACE_MS)) {
    throw new Error("NATIVE_PROCESS_CHILD_ACTIVE");
  }
}

async function waitUntilProcessGroupStopped(
  processGroupId: number,
  timeoutMs: number,
): Promise<"live" | "stopped" | "unknown"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = observeProcessGroup(processGroupId);
    if (state !== "live") return state;
    await delay(10);
  }
  return observeProcessGroup(processGroupId);
}

function providerSharesGuardianGroup(pid: number, guardian: ProcessIdentity): ProcessIdentity | null {
  const observed = observeProcessIdentity(pid, guardian.platform);
  if (observed.type !== "ok") return null;
  return observed.value.processGroupId === guardian.processGroupId ? observed.value : null;
}

async function runStdioProvider(
  message: LaunchMessage,
  wrapperIdentity: ProcessIdentity,
): Promise<number> {
  if (message.transport.kind !== "stdio-json") return 125;
  const child = spawn(message.executable, [...message.args], {
    cwd: message.cwd,
    env: message.env,
    stdio: ["pipe", "inherit", "inherit"],
  });
  const exit = new Promise<number>((resolveExit) => child.once("close", (value) => resolveExit(value ?? 1)));
  const providerIdentity = child.pid ? providerSharesGuardianGroup(child.pid, wrapperIdentity) : null;
  if (!providerIdentity) {
    const observed = child.pid
      ? observeProcessIdentity(child.pid, wrapperIdentity.platform)
      : null;
    if (observed?.type === "ok") await stopExactChild(observed.value);
    return 125;
  }
  if (message.transport.stdin.kind === "closed") child.stdin.end();
  else child.stdin.end(Buffer.from(message.transport.stdin.base64, "base64"));
  return await exit;
}

function writePtyOutput(
  bytes: Uint8Array,
  output: Readonly<{
    write(chunk: Uint8Array): boolean;
    once(event: "drain", listener: () => void): unknown;
  }> = process.stdout,
): Promise<void> {
  return new Promise((resolveWrite) => {
    if (output.write(bytes)) resolveWrite();
    else output.once("drain", resolveWrite);
  });
}

async function runPtyProvider(
  message: LaunchMessage,
  lines: AsyncIterator<string>,
  wrapperIdentity: ProcessIdentity,
): Promise<number> {
  if (message.transport.kind !== "pty-interactive") return 125;
  let outputDrained = Promise.resolve();
  let resolveTerminalClosed: (() => void) | undefined;
  const terminalClosed = new Promise<void>((resolveClosed) => {
    resolveTerminalClosed = resolveClosed;
  });
  const terminal = new Bun.Terminal({
    cols: message.transport.columns,
    rows: message.transport.rows,
    name: "xterm-256color",
    data: (_terminal, data) => {
      outputDrained = outputDrained.then(() => writePtyOutput(data));
    },
    exit: () => resolveTerminalClosed?.(),
  });
  const child = Bun.spawn([message.executable, ...message.args], {
    cwd: message.cwd,
    env: message.env,
    terminal,
  });
  const exit = child.exited;
  const providerIdentity = providerSharesGuardianGroup(child.pid, wrapperIdentity);
  try {
    if (!providerIdentity) {
      const observed = observeProcessIdentity(child.pid);
      if (observed.type === "ok") await stopExactChild(observed.value);
      return 125;
    }
    terminal.write(Buffer.from(message.transport.initialInputBase64, "base64"));
    const next = await Promise.race([lines.next(), exit.then(() => null)]);
    if (next && !next.done) {
      let control: Partial<GracefulExitMessage> | null = null;
      try {
        control = JSON.parse(next.value) as Partial<GracefulExitMessage>;
      } catch {}
      if (control?.kind !== "graceful-exit" || typeof control.inputBase64 !== "string") {
        return 125;
      }
      terminal.write(Buffer.from(control.inputBase64, "base64"));
    }
    const code = await exit;
    return code;
  } finally {
    if (providerIdentity && exactProcessIsLive(providerIdentity)) {
      await stopExactChild(providerIdentity);
    }
    await exit;
    terminal.close();
    await terminalClosed;
    await outputDrained;
  }
}

type ProviderIpc = Readonly<{
  connected: boolean;
  send?: (message: ProviderTerminalMessage, callback: () => void) => void;
  once(event: "disconnect", listener: () => void): unknown;
  off(event: "disconnect", listener: () => void): unknown;
}>;

async function notifyProviderTerminal(
  message: ProviderTerminalMessage,
  ipc: ProviderIpc = process as unknown as ProviderIpc,
): Promise<void> {
  if (!ipc.connected || typeof ipc.send !== "function") return;
  await new Promise<void>((resolveNotification) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      ipc.off("disconnect", done);
      resolveNotification();
    };
    ipc.once("disconnect", done);
    try {
      ipc.send?.(message, done);
    } catch {
      done();
    }
  });
}

async function pinGuardian(
  wait: Promise<never> = new Promise<never>(() => { setInterval(() => {}, 60_000); }),
): Promise<never> {
  return await wait;
}

type WrapperMainRuntime = Readonly<{
  platform: NodeJS.Platform;
  pid: number;
  exit(code: number): void;
  onTerm(listener: () => void): void;
  observe(pid: number): ReturnType<typeof observeProcessIdentity>;
  openReader(): ReturnType<typeof createInterface>;
  writeIdentity(path: string, identity: NativeRunIdentity): void;
  waitForArm(plan: WrapperPlan, identity: NativeRunIdentity): Promise<boolean>;
  runStdio(message: LaunchMessage, identity: ProcessIdentity): Promise<number>;
  runPty(message: LaunchMessage, lines: AsyncIterator<string>, identity: ProcessIdentity): Promise<number>;
  destroyInput(): void;
  notify(message: ProviderTerminalMessage): Promise<void>;
  pin(): Promise<never>;
}>;

const productionWrapperMainRuntime: WrapperMainRuntime = Object.freeze({
  platform: process.platform,
  pid: process.pid,
  exit: (code) => { process.exit(code); },
  onTerm: (listener) => { process.on("SIGTERM", listener); },
  observe: observeProcessIdentity,
  openReader: () => createInterface({ input: process.stdin, crlfDelay: Infinity }),
  writeIdentity: atomicJson,
  waitForArm,
  runStdio: runStdioProvider,
  runPty: runPtyProvider,
  destroyInput: () => { process.stdin.destroy(); },
  notify: notifyProviderTerminal,
  pin: pinGuardian,
});

function wrapperMainRuntime(injected: Partial<WrapperMainRuntime>): WrapperMainRuntime {
  return Object.freeze({ ...productionWrapperMainRuntime, ...injected });
}

async function wrapperMain(
  encodedPlan: string,
  injected: Partial<WrapperMainRuntime> = {},
): Promise<void> {
  const runtime = wrapperMainRuntime(injected);
  if (runtime.platform !== "darwin" && runtime.platform !== "linux") {
    runtime.exit(125);
    return;
  }
  runtime.onTerm(() => {});
  let plan: WrapperPlan;
  try {
    const value: unknown = JSON.parse(Buffer.from(encodedPlan, "base64").toString("utf-8"));
    if (!wrapperPlanIsValid(value)) throw new Error("invalid wrapper plan");
    plan = value;
  } catch {
    runtime.exit(125);
    return;
  }
  const observed = runtime.observe(runtime.pid);
  if (observed.type === "err" || observed.value.processGroupId !== runtime.pid) {
    runtime.exit(125);
    return;
  }
  const identity: NativeRunIdentity = Object.freeze({
    schemaVersion: 1,
    nativeRunId: plan.nativeRunId,
    armDigest: plan.armDigest,
    runEpochDigest: plan.runEpochDigest,
    armDeadline: plan.armDeadline,
    process: observed.value,
  });
  runtime.writeIdentity(plan.identityPath, identity);
  const reader = runtime.openReader();
  const lines = reader[Symbol.asyncIterator]();
  const first = await lines.next();
  const launch = first.done ? null : parseLaunch(first.value);
  if (!launch || !(await runtime.waitForArm(plan, identity))) {
    runtime.exit(126);
    return;
  }
  const exitCode = launch.transport.kind === "stdio-json"
    ? await runtime.runStdio(launch, identity.process)
    : await runtime.runPty(launch, lines, identity.process);
  reader.close();
  runtime.destroyInput();
  await runtime.notify(Object.freeze({
    kind: "provider-terminal",
    schemaVersion: 1,
    nativeRunId: plan.nativeRunId,
    guardianIdentityDigest: digestValue(identity.process),
    providerExitCode: exitCode,
  }));
  await runtime.pin();
}

// Bun coverage cannot observe the detached guardian process. This seam exposes
// the same helpers to in-process tests without replacing their production path.
export const nativeProcessTestSeam = Object.freeze({
  runDirectoryForPlan,
  directoryMatchesOwner,
  markerMatchesOwner,
  quarantinePath,
  rollbackOwnedDirectoryInitialization,
  createOwnedRunDirectory,
  createSpawnClaim,
  removeSpawnClaim,
  releaseUnadvancedSpawnClaim,
  transitionLifecycle,
  restorePlannedAfterSpawnFailure,
  claimSpawnTransition,
  readProcessRecoveryJournal,
  recoveryObservationFromStates,
  readRunIdentity,
  recoverExactNativeProcess,
  recoverStartedNativeProcess,
  signalExactProcessGroup,
  waitUntilGone,
  terminatePinnedGuardianGroup,
  observeProviderTerminal,
  sessionFor,
  waitForArm,
  parseLaunch,
  signalExactProcess,
  stopExactChild,
  waitUntilProcessGroupStopped,
  providerSharesGuardianGroup,
  runStdioProvider,
  writePtyOutput,
  runPtyProvider,
  notifyProviderTerminal,
  pinGuardian,
  wrapperMain,
});

const wrapperEntrypoint = import.meta.main && process.argv[2] === "native-process-wrapper"
  ? wrapperMain(process.argv[3] ?? "")
  : Promise.resolve();
await wrapperEntrypoint;
