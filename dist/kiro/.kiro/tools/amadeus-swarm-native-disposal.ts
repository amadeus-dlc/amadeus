// Durable, deterministic disposal of native process run directories.

import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { digestValue, hasExactKeys, isRecord, nonEmptyString } from "./amadeus-swarm-canonical.ts";
import type {
  NativeProcessRecoveryReceipt,
  NativeProcessRecoveryTarget,
} from "./amadeus-swarm-native-process.ts";

export type NativeRunDirectoryOwnership = Readonly<{
  device: string;
  inode: string;
  userId: string;
  markerDigest: string;
}>;

export type NativeProcessDisposalReceipt = Readonly<{
  kind: "native-process-disposal-receipt";
  schemaVersion: 1;
  disposalId: string;
  targetDigest: string;
  recoveryReceiptDigest: string;
  nativeRunId: string;
  runEpochDigest: string;
  disposition: "disposed";
  receiptDigest: string;
}>;

export type NativeProcessDisposalResult =
  | Readonly<{
      status: "disposed";
      receipt: NativeProcessDisposalReceipt;
      recoveryReceipt: NativeProcessRecoveryReceipt;
    }>
  | Readonly<{ status: "unknown" }>;

type NativeProcessDisposalStartInput = Readonly<{
  target: NativeProcessRecoveryTarget;
  recoveryReceipt: NativeProcessRecoveryReceipt;
  runDirectory: Readonly<{
    owner: NativeRunDirectoryOwnership;
    recoveryJournalDigest: string;
  }>;
}>;

export type NativeProcessDisposal = Readonly<{
  start(input: NativeProcessDisposalStartInput): NativeProcessDisposalResult;
  resume(target: NativeProcessRecoveryTarget): NativeProcessDisposalResult;
}>;

type DisposalPhase = "intent" | "moved" | "deleting" | "completed";
type DisposalTestCrashPoint =
  | `${DisposalPhase}-temp`
  | "intent"
  | "before-rename"
  | "rename"
  | "moved"
  | "deleting"
  | "before-remove"
  | "removed"
  | "completed";

type DisposalEntry = Readonly<{
  kind: "native-process-disposal";
  schemaVersion: 1;
  disposalId: string;
  phase: DisposalPhase;
  previousEntryDigest: string | null;
  target: NativeProcessRecoveryTarget;
  recoveryReceipt: NativeProcessRecoveryReceipt;
  originalRelativePath: string;
  quarantineRelativePath: string;
  owner: NativeRunDirectoryOwnership;
  recoveryJournalDigest: string;
  receipt?: NativeProcessDisposalReceipt;
  entryDigest: string;
}>;

type DisposalPaths = Readonly<{
  disposalId: string;
  walDirectory: string;
  originalRelativePath: string;
  originalPath: string;
  quarantineRelativePath: string;
  quarantinePath: string;
}>;

type DisposalChain = Readonly<{
  entries: readonly DisposalEntry[];
  latest: DisposalEntry;
  paths: DisposalPaths;
}>;

const PHASES: readonly DisposalPhase[] = Object.freeze(["intent", "moved", "deleting", "completed"]);

function currentUserId(): string {
  const uid = process.getuid?.();
  if (!Number.isInteger(uid)) throw new Error("NATIVE_PROCESS_DISPOSAL_PLATFORM_UNSUPPORTED");
  return String(uid);
}

function fsyncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function targetIsValid(value: unknown): value is NativeProcessRecoveryTarget {
  return isRecord(value) &&
    hasExactKeys(value, [
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

function recoveryReceiptHasClosedShape(value: unknown): value is NativeProcessRecoveryReceipt {
  return isRecord(value) &&
    hasExactKeys(value, [
      "kind",
      "schemaVersion",
      "targetDigest",
      "nativeRunId",
      "armDigest",
      "runEpochDigest",
      "processIdentityDigest",
      "disposition",
      "receiptDigest",
    ]) &&
    value.kind === "native-process-recovery-receipt" &&
    value.schemaVersion === 1 &&
    ["unarmed", "stopped"].includes(String(value.disposition));
}

function recoveryReceiptProcessMatches(
  receipt: NativeProcessRecoveryReceipt,
  target: NativeProcessRecoveryTarget,
): boolean {
  if (target.processIdentityDigest !== null) {
    return receipt.disposition === "stopped" &&
      receipt.processIdentityDigest === target.processIdentityDigest;
  }
  return (receipt.disposition === "unarmed" && receipt.processIdentityDigest === null) ||
    (receipt.disposition === "stopped" && nonEmptyString(receipt.processIdentityDigest));
}

function recoveryReceiptIsValid(
  value: unknown,
  target: NativeProcessRecoveryTarget,
): value is NativeProcessRecoveryReceipt {
  if (!recoveryReceiptHasClosedShape(value)) return false;
  const semantic = {
    kind: value.kind,
    schemaVersion: value.schemaVersion,
    targetDigest: value.targetDigest,
    nativeRunId: value.nativeRunId,
    armDigest: value.armDigest,
    runEpochDigest: value.runEpochDigest,
    processIdentityDigest: value.processIdentityDigest,
    disposition: value.disposition,
  };
  return value.targetDigest === digestValue(target) &&
    value.nativeRunId === target.nativeRunId &&
    value.armDigest === target.armDigest &&
    value.runEpochDigest === target.runEpochDigest &&
    recoveryReceiptProcessMatches(value, target) &&
    value.receiptDigest === digestValue(semantic);
}

function ownershipIsValid(value: unknown): value is NativeRunDirectoryOwnership {
  return isRecord(value) &&
    hasExactKeys(value, ["device", "inode", "userId", "markerDigest"]) &&
    [value.device, value.inode, value.userId, value.markerDigest].every(nonEmptyString) &&
    /^(0|[1-9]\d*)$/.test(String(value.device)) &&
    /^(0|[1-9]\d*)$/.test(String(value.inode)) &&
    /^(0|[1-9]\d*)$/.test(String(value.userId));
}

function disposalPaths(root: string, target: NativeProcessRecoveryTarget): DisposalPaths {
  const disposalId = digestValue({ nativeRunId: target.nativeRunId, runEpochDigest: target.runEpochDigest });
  const nativeRelativePath = ".amadeus-swarm-driver/native";
  const originalRelativePath = `${nativeRelativePath}/${digestValue(target.nativeRunId).slice(0, 24)}`;
  const quarantineRelativePath = `${nativeRelativePath}/.disposed-${disposalId}`;
  const originalPath = resolve(root, originalRelativePath);
  const quarantinePath = resolve(root, quarantineRelativePath);
  const walDirectory = resolve(root, nativeRelativePath, "disposals", disposalId);
  for (const path of [originalPath, quarantinePath, walDirectory]) {
    if (!path.startsWith(`${root}${sep}`)) throw new Error("NATIVE_PROCESS_DISPOSAL_PATH_INVALID");
  }
  return Object.freeze({
    disposalId,
    walDirectory,
    originalRelativePath,
    originalPath,
    quarantineRelativePath,
    quarantinePath,
  });
}

function entrySemantic(entry: Omit<DisposalEntry, "entryDigest">): Omit<DisposalEntry, "entryDigest"> {
  return entry;
}

function freezeEntry(entry: Omit<DisposalEntry, "entryDigest">): DisposalEntry {
  return Object.freeze({ ...entry, entryDigest: digestValue(entrySemantic(entry)) });
}

function disposalReceipt(
  paths: DisposalPaths,
  target: NativeProcessRecoveryTarget,
  recoveryReceipt: NativeProcessRecoveryReceipt,
): NativeProcessDisposalReceipt {
  const semantic = Object.freeze({
    kind: "native-process-disposal-receipt" as const,
    schemaVersion: 1 as const,
    disposalId: paths.disposalId,
    targetDigest: digestValue(target),
    recoveryReceiptDigest: recoveryReceipt.receiptDigest,
    nativeRunId: target.nativeRunId,
    runEpochDigest: target.runEpochDigest,
    disposition: "disposed" as const,
  });
  return Object.freeze({ ...semantic, receiptDigest: digestValue(semantic) });
}

function phasePath(paths: DisposalPaths, phase: DisposalPhase): string {
  return join(paths.walDirectory, `${phase}.json`);
}

function ownedDirectory(path: string, expectedMode?: number): boolean {
  try {
    const stat = lstatSync(path, { bigint: true });
    return stat.isDirectory() &&
      !stat.isSymbolicLink() &&
      stat.uid.toString() === currentUserId() &&
      (expectedMode === undefined || Number(stat.mode & 0o777n) === expectedMode);
  } catch {
    return false;
  }
}

function ensureWalDirectory(paths: DisposalPaths): boolean {
  const disposalsDirectory = dirname(paths.walDirectory);
  const nativeDirectory = dirname(disposalsDirectory);
  if (!ownedDirectory(nativeDirectory)) return false;
  if (!existsSync(disposalsDirectory)) {
    mkdirSync(disposalsDirectory, { mode: 0o700 });
    fsyncDirectory(nativeDirectory);
  }
  if (!ownedDirectory(disposalsDirectory, 0o700)) return false;
  if (!existsSync(paths.walDirectory)) {
    mkdirSync(paths.walDirectory, { mode: 0o700 });
    fsyncDirectory(disposalsDirectory);
  }
  return ownedDirectory(paths.walDirectory, 0o700);
}

function writeOnce(path: string, value: DisposalEntry, afterTempFsync: () => void = () => {}): void {
  const temporaryPath = join(dirname(path), `.${basename(path)}-${randomUUID()}.tmp`);
  const descriptor = openSync(temporaryPath, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value)}\n`, "utf-8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  afterTempFsync();
  try {
    linkSync(temporaryPath, path);
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST") {
      const stat = lstatSync(path, { bigint: true });
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.uid.toString() !== currentUserId() ||
        Number(stat.mode & 0o777n) !== 0o600
      ) throw new Error("NATIVE_PROCESS_DISPOSAL_CONFLICT");
      const existing = JSON.parse(readFileSync(path, "utf-8")) as unknown;
      if (digestValue(existing) !== digestValue(value)) {
        throw new Error("NATIVE_PROCESS_DISPOSAL_CONFLICT");
      }
    } else {
      throw error;
    }
  } finally {
    unlinkSync(temporaryPath);
  }
  fsyncDirectory(dirname(path));
}

function appendEntry(
  root: string,
  chain: DisposalChain,
  phase: DisposalPhase,
  afterStep: (point: DisposalTestCrashPoint) => void,
): DisposalChain {
  const receipt = phase === "completed"
    ? disposalReceipt(chain.paths, chain.latest.target, chain.latest.recoveryReceipt)
    : undefined;
  const entry = freezeEntry({
    kind: "native-process-disposal",
    schemaVersion: 1,
    disposalId: chain.paths.disposalId,
    phase,
    previousEntryDigest: chain.latest.entryDigest,
    target: chain.latest.target,
    recoveryReceipt: chain.latest.recoveryReceipt,
    originalRelativePath: chain.paths.originalRelativePath,
    quarantineRelativePath: chain.paths.quarantineRelativePath,
    owner: chain.latest.owner,
    recoveryJournalDigest: chain.latest.recoveryJournalDigest,
    ...(receipt ? { receipt } : {}),
  });
  writeOnce(phasePath(chain.paths, phase), entry, () => afterStep(`${phase}-temp`));
  const durable = readChain(root, chain.latest.target);
  if (!durable?.entries.some((candidate) =>
    candidate.phase === phase && candidate.entryDigest === entry.entryDigest
  )) throw new Error("NATIVE_PROCESS_DISPOSAL_WAL_READBACK_FAILED");
  return durable;
}

function entryHasClosedShape(value: Record<string, unknown>, hasReceipt: boolean): boolean {
  return hasExactKeys(value, [
    "kind",
    "schemaVersion",
    "disposalId",
    "phase",
    "previousEntryDigest",
    "target",
    "recoveryReceipt",
    "originalRelativePath",
    "quarantineRelativePath",
    "owner",
    "recoveryJournalDigest",
    ...(hasReceipt ? ["receipt"] : []),
    "entryDigest",
  ]);
}

function entryCoordinatesMatch(
  value: Record<string, unknown>,
  phase: DisposalPhase,
  paths: DisposalPaths,
): boolean {
  return value.kind === "native-process-disposal" &&
    value.schemaVersion === 1 &&
    value.disposalId === paths.disposalId &&
    value.phase === phase &&
    value.originalRelativePath === paths.originalRelativePath &&
    value.quarantineRelativePath === paths.quarantineRelativePath;
}

function canonicalTargetDigest(target: NativeProcessRecoveryTarget): string {
  return digestValue({
    kind: "native-process-recovery",
    schemaVersion: 1,
    nativeRunId: target.nativeRunId,
    armDigest: target.armDigest,
    runEpochDigest: target.runEpochDigest,
    processIdentityDigest: target.processIdentityDigest,
  });
}

function entryBindingsAreValid(value: Record<string, unknown>): boolean {
  if (!targetIsValid(value.target)) return false;
  return digestValue(value.target) === canonicalTargetDigest(value.target) &&
    recoveryReceiptIsValid(value.recoveryReceipt, value.target) &&
    ownershipIsValid(value.owner) &&
    nonEmptyString(value.recoveryJournalDigest) &&
    nonEmptyString(value.entryDigest);
}

function entryIsValid(value: unknown, phase: DisposalPhase, paths: DisposalPaths): value is DisposalEntry {
  if (!isRecord(value)) return false;
  const hasReceipt = value.receipt !== undefined;
  if (!entryHasClosedShape(value, hasReceipt)) return false;
  if (!entryCoordinatesMatch(value, phase, paths)) return false;
  if (!entryBindingsAreValid(value)) return false;
  if ((phase === "completed") !== hasReceipt) return false;
  const { entryDigest, ...semantic } = value;
  return entryDigest === digestValue(semantic);
}

function readPhaseEntry(
  paths: DisposalPaths,
  phase: DisposalPhase,
): DisposalEntry | "missing" | null {
  const path = phasePath(paths, phase);
  if (!existsSync(path)) return "missing";
  try {
    const stat = lstatSync(path, { bigint: true });
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      String(stat.uid) !== currentUserId() ||
      Number(stat.mode & 0o777n) !== 0o600
    ) return null;
    const value: unknown = JSON.parse(readFileSync(path, "utf-8"));
    return entryIsValid(value, phase, paths) ? value : null;
  } catch {
    return null;
  }
}

function laterPhaseExists(paths: DisposalPaths, phase: DisposalPhase): boolean {
  return PHASES.slice(PHASES.indexOf(phase) + 1)
    .some((later) => existsSync(phasePath(paths, later)));
}

function readChain(root: string, target: NativeProcessRecoveryTarget): DisposalChain | null {
  const paths = disposalPaths(root, target);
  if (!ownedDirectory(paths.walDirectory, 0o700)) return null;
  const entries: DisposalEntry[] = [];
  let previous: string | null = null;
  for (const phase of PHASES) {
    const value = readPhaseEntry(paths, phase);
    if (value === "missing") {
      if (laterPhaseExists(paths, phase)) return null;
      break;
    }
    if (!value || value.previousEntryDigest !== previous) return null;
    if (digestValue(value.target) !== digestValue(target)) return null;
    entries.push(Object.freeze(value));
    previous = value.entryDigest;
  }
  const latest = entries.at(-1);
  return latest ? Object.freeze({ entries: Object.freeze(entries), latest, paths }) : null;
}

function directoryIdentityMatches(path: string, owner: NativeRunDirectoryOwnership): boolean {
  try {
    const stat = lstatSync(path, { bigint: true });
    return stat.isDirectory() &&
      !stat.isSymbolicLink() &&
      stat.dev.toString() === owner.device &&
      stat.ino.toString() === owner.inode &&
      stat.uid.toString() === owner.userId;
  } catch {
    return false;
  }
}

function recoveryJournalProcessMatches(
  journal: Record<string, unknown>,
  target: NativeProcessRecoveryTarget,
  recoveryReceipt: NativeProcessRecoveryReceipt,
): boolean {
  if (recoveryReceipt.disposition === "unarmed") {
    return target.processIdentityDigest === null &&
      (journal.processIdentityDigest === undefined || journal.processIdentityDigest === null);
  }
  return (journal.processIdentityDigest === undefined ||
      journal.processIdentityDigest === recoveryReceipt.processIdentityDigest) &&
    (target.processIdentityDigest === null ||
      target.processIdentityDigest === recoveryReceipt.processIdentityDigest);
}

function ownedRegularFile(path: string, userId: string): boolean {
  try {
    const stat = lstatSync(path, { bigint: true });
    return stat.isFile() && !stat.isSymbolicLink() && stat.uid.toString() === userId;
  } catch {
    return false;
  }
}

function ownerMarkerMatches(
  path: string,
  target: NativeProcessRecoveryTarget,
  owner: NativeRunDirectoryOwnership,
): boolean {
  const markerPath = join(path, "owner.json");
  if (!ownedRegularFile(markerPath, owner.userId)) return false;
  try {
    const marker: unknown = JSON.parse(readFileSync(markerPath, "utf-8"));
    return isRecord(marker) &&
      hasExactKeys(marker, ["schemaVersion", "nativeRunId", "token"]) &&
      marker.schemaVersion === 1 &&
      marker.nativeRunId === target.nativeRunId &&
      nonEmptyString(marker.token) &&
      digestValue(marker) === owner.markerDigest;
  } catch {
    return false;
  }
}

function recoveryJournalMatches(
  path: string,
  target: NativeProcessRecoveryTarget,
  recoveryReceipt: NativeProcessRecoveryReceipt,
  owner: NativeRunDirectoryOwnership,
  recoveryJournalDigest: string,
): boolean {
  const journalPath = join(path, "recovery.json");
  if (!ownedRegularFile(journalPath, owner.userId)) return false;
  try {
    const journal: unknown = JSON.parse(readFileSync(journalPath, "utf-8"));
    return isRecord(journal) &&
      journal.nativeRunId === target.nativeRunId &&
      journal.armDigest === target.armDigest &&
      journal.runEpochDigest === target.runEpochDigest &&
      recoveryJournalProcessMatches(journal, target, recoveryReceipt) &&
      ownershipIsValid(journal.owner) &&
      digestValue(journal.owner) === digestValue(owner) &&
      digestValue(journal) === recoveryJournalDigest;
  } catch {
    return false;
  }
}

function exactOwnedDirectory(
  path: string,
  target: NativeProcessRecoveryTarget,
  recoveryReceipt: NativeProcessRecoveryReceipt,
  owner: NativeRunDirectoryOwnership,
  recoveryJournalDigest: string,
): boolean {
  return directoryIdentityMatches(path, owner) &&
    ownerMarkerMatches(path, target, owner) &&
    recoveryJournalMatches(path, target, recoveryReceipt, owner, recoveryJournalDigest);
}

function resultFromCompleted(
  entry: DisposalEntry,
  paths: DisposalPaths,
): NativeProcessDisposalResult {
  if (!entry.receipt) return Object.freeze({ status: "unknown" });
  if (
    existsSync(paths.quarantinePath) ||
    exactOwnedDirectory(
      paths.originalPath,
      entry.target,
      entry.recoveryReceipt,
      entry.owner,
      entry.recoveryJournalDigest,
    )
  ) return Object.freeze({ status: "unknown" });
  const expected = disposalReceipt(
    paths,
    entry.target,
    entry.recoveryReceipt,
  );
  if (digestValue(expected) !== digestValue(entry.receipt)) return Object.freeze({ status: "unknown" });
  return Object.freeze({
    status: "disposed",
    receipt: entry.receipt,
    recoveryReceipt: entry.recoveryReceipt,
  });
}

type ReconcileStep = DisposalChain | NativeProcessDisposalResult;

function unknownDisposalResult(): NativeProcessDisposalResult {
  return Object.freeze({ status: "unknown" });
}

function isDisposalResult(step: ReconcileStep): step is NativeProcessDisposalResult {
  return "status" in step;
}

function reconcileWinner(
  root: string,
  chain: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): NativeProcessDisposalResult {
  const winner = readChain(root, chain.latest.target);
  return winner ? reconcile(root, winner, afterStep) : unknownDisposalResult();
}

function durableBeforeMutation(
  root: string,
  chain: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  const durable = readChain(root, chain.latest.target);
  if (!durable) return unknownDisposalResult();
  return durable.latest.entryDigest === chain.latest.entryDigest
    ? durable
    : reconcile(root, durable, afterStep);
}

function moveToQuarantine(
  root: string,
  chain: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  afterStep("before-rename");
  const durable = durableBeforeMutation(root, chain, afterStep);
  if (isDisposalResult(durable)) return durable;
  try {
    renameSync(chain.paths.originalPath, chain.paths.quarantinePath);
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    return reconcileWinner(root, chain, afterStep);
  }
  fsyncDirectory(dirname(chain.paths.originalPath));
  afterStep("rename");
  return durable;
}

function reconcileIntent(
  root: string,
  chainInput: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  if (chainInput.latest.phase !== "intent") return chainInput;
  const { paths } = chainInput;
  let chain = chainInput;
  const originalExact = exactOwnedDirectory(
    paths.originalPath,
    chain.latest.target,
    chain.latest.recoveryReceipt,
    chain.latest.owner,
    chain.latest.recoveryJournalDigest,
  );
  if (originalExact && !existsSync(paths.quarantinePath)) {
    const moved = moveToQuarantine(root, chain, afterStep);
    if (isDisposalResult(moved)) return moved;
    chain = moved;
  } else if (!exactOwnedDirectory(
    paths.quarantinePath,
    chain.latest.target,
    chain.latest.recoveryReceipt,
    chain.latest.owner,
    chain.latest.recoveryJournalDigest,
  )) {
    return unknownDisposalResult();
  }
  const next = appendEntry(root, chain, "moved", afterStep);
  afterStep("moved");
  return next;
}

function reconcileMoved(
  root: string,
  chain: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  if (chain.latest.phase !== "moved") return chain;
  if (!exactOwnedDirectory(
    chain.paths.quarantinePath,
    chain.latest.target,
    chain.latest.recoveryReceipt,
    chain.latest.owner,
    chain.latest.recoveryJournalDigest,
  )) return unknownDisposalResult();
  const next = appendEntry(root, chain, "deleting", afterStep);
  afterStep("deleting");
  return next;
}

function removeQuarantine(
  root: string,
  chain: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  if (!directoryIdentityMatches(chain.paths.quarantinePath, chain.latest.owner)) {
    return unknownDisposalResult();
  }
  afterStep("before-remove");
  const durable = durableBeforeMutation(root, chain, afterStep);
  if (isDisposalResult(durable)) return durable;
  try {
    rmSync(chain.paths.quarantinePath, { recursive: true });
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    return reconcileWinner(root, chain, afterStep);
  }
  fsyncDirectory(dirname(chain.paths.quarantinePath));
  afterStep("removed");
  return durable;
}

function reconcileDeleting(
  root: string,
  chainInput: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void,
): ReconcileStep {
  if (chainInput.latest.phase !== "deleting") return chainInput;
  let chain = chainInput;
  if (existsSync(chain.paths.quarantinePath)) {
    const removed = removeQuarantine(root, chain, afterStep);
    if (isDisposalResult(removed)) return removed;
    chain = removed;
  }
  const next = appendEntry(root, chain, "completed", afterStep);
  afterStep("completed");
  return next;
}

function reconcile(
  root: string,
  chainInput: DisposalChain,
  afterStep: (point: DisposalTestCrashPoint) => void = () => {},
): NativeProcessDisposalResult {
  if (chainInput.latest.phase === "completed") {
    return resultFromCompleted(chainInput.latest, chainInput.paths);
  }
  const intent = reconcileIntent(root, chainInput, afterStep);
  if (isDisposalResult(intent)) return intent;
  const moved = reconcileMoved(root, intent, afterStep);
  if (isDisposalResult(moved)) return moved;
  const deleting = reconcileDeleting(root, moved, afterStep);
  if (isDisposalResult(deleting)) return deleting;
  if (deleting.latest.phase !== "completed" || existsSync(deleting.paths.quarantinePath)) {
    return unknownDisposalResult();
  }
  return resultFromCompleted(deleting.latest, deleting.paths);
}

function startInputMatchesChain(
  chain: DisposalChain,
  recoveryReceipt: NativeProcessRecoveryReceipt,
  owner: NativeRunDirectoryOwnership,
  recoveryJournalDigest: string,
): boolean {
  return digestValue(chain.latest.recoveryReceipt) === digestValue(recoveryReceipt) &&
    digestValue(chain.latest.owner) === digestValue(owner) &&
    chain.latest.recoveryJournalDigest === recoveryJournalDigest;
}

function startInputIsValid(input: NativeProcessDisposalStartInput): boolean {
  return targetIsValid(input.target) &&
    recoveryReceiptIsValid(input.recoveryReceipt, input.target) &&
    ownershipIsValid(input.runDirectory.owner) &&
    nonEmptyString(input.runDirectory.recoveryJournalDigest);
}

function intentEntry(
  paths: DisposalPaths,
  input: NativeProcessDisposalStartInput,
): DisposalEntry {
  return freezeEntry({
    kind: "native-process-disposal",
    schemaVersion: 1,
    disposalId: paths.disposalId,
    phase: "intent",
    previousEntryDigest: null,
    target: input.target,
    recoveryReceipt: input.recoveryReceipt,
    originalRelativePath: paths.originalRelativePath,
    quarantineRelativePath: paths.quarantineRelativePath,
    owner: input.runDirectory.owner,
    recoveryJournalDigest: input.runDirectory.recoveryJournalDigest,
  });
}

function startNewDisposal(
  root: string,
  input: NativeProcessDisposalStartInput,
  afterStep: (point: DisposalTestCrashPoint) => void,
): NativeProcessDisposalResult {
  const paths = disposalPaths(root, input.target);
  if (
    existsSync(paths.quarantinePath) ||
    !exactOwnedDirectory(
      paths.originalPath,
      input.target,
      input.recoveryReceipt,
      input.runDirectory.owner,
      input.runDirectory.recoveryJournalDigest,
    )
  ) return unknownDisposalResult();
  if (!ensureWalDirectory(paths)) return unknownDisposalResult();
  const intent = intentEntry(paths, input);
  writeOnce(phasePath(paths, "intent"), intent, () => afterStep("intent-temp"));
  afterStep("intent");
  const durable = readChain(root, input.target);
  if (!durable?.entries.some((candidate) =>
    candidate.phase === "intent" && candidate.entryDigest === intent.entryDigest
  )) return unknownDisposalResult();
  return reconcile(root, durable, afterStep);
}

function startDisposal(
  root: string,
  input: NativeProcessDisposalStartInput,
  afterStep: (point: DisposalTestCrashPoint) => void,
): NativeProcessDisposalResult {
  if (!startInputIsValid(input)) return unknownDisposalResult();
  const existing = readChain(root, input.target);
  if (!existing) return startNewDisposal(root, input, afterStep);
  if (!startInputMatchesChain(
    existing,
    input.recoveryReceipt,
    input.runDirectory.owner,
    input.runDirectory.recoveryJournalDigest,
  )) return unknownDisposalResult();
  return reconcile(root, existing, afterStep);
}

function createNativeProcessDisposalAdapter(
  input: Readonly<{ rootDir: string }>,
  afterStep: (point: DisposalTestCrashPoint) => void,
): NativeProcessDisposal {
  const root = resolve(input.rootDir);
  return Object.freeze({
    start(startInput): NativeProcessDisposalResult {
      return startDisposal(root, startInput, afterStep);
    },

    resume(target): NativeProcessDisposalResult {
      if (!targetIsValid(target)) return Object.freeze({ status: "unknown" });
      const chain = readChain(root, target);
      return chain ? reconcile(root, chain, afterStep) : unknownDisposalResult();
    },
  });
}

export function createNativeProcessDisposal(input: Readonly<{ rootDir: string }>): NativeProcessDisposal {
  return failClosedDisposal(createNativeProcessDisposalAdapter(input, () => {}));
}

function failClosedDisposal(disposal: NativeProcessDisposal): NativeProcessDisposal {
  return Object.freeze({
    start(input): NativeProcessDisposalResult {
      try {
        return disposal.start(input);
      } catch {
        return Object.freeze({ status: "unknown" });
      }
    },
    resume(target): NativeProcessDisposalResult {
      try {
        return disposal.resume(target);
      } catch {
        return Object.freeze({ status: "unknown" });
      }
    },
  });
}

export const nativeProcessDisposalTestSeam = Object.freeze({
  createCrashInjected(input: Readonly<{
    rootDir: string;
    crashAfter: DisposalTestCrashPoint;
  }>): NativeProcessDisposal {
    return createNativeProcessDisposalAdapter(input, (point) => {
      if (point === input.crashAfter) throw new Error("NATIVE_PROCESS_DISPOSAL_TEST_CRASH");
    });
  },
  createIntercepted(input: Readonly<{
    rootDir: string;
    afterStep(point: DisposalTestCrashPoint): void;
  }>): NativeProcessDisposal {
    return failClosedDisposal(createNativeProcessDisposalAdapter(input, input.afterStep));
  },
});
