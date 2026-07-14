// Transactional filesystem resources for provider-neutral native swarm execution.

import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
  type BigIntStats,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import type {
  AdapterResourcePreparation,
  AuxiliaryResourcePlan,
  LaunchInput,
  MaterializedAuxiliaryResource,
  MaterializedAuxiliaryResourceSet,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import { canonicalJson, digestValue, hasExactKeys, isRecord, nonEmptyString } from "./amadeus-swarm-canonical.ts";
import type {
  NativeResourceRecoveryObservation,
  NativeResourceRecoveryObserverPort,
  NativeResourceRecoveryOwner,
  ResourceSupervisorPort,
} from "./amadeus-swarm-native-execution.ts";

export type {
  NativeResourceRecoveryObservation,
  NativeResourceRecoveryObserverPort,
  NativeResourceRecoveryOwner,
} from "./amadeus-swarm-native-execution.ts";

type ResourceIdentity = Readonly<{
  dev: string;
  ino: string;
  uid: number;
  mode: number;
  kind: "file" | "directory";
}>;

type PendingOwnedFile = Readonly<{
  kind: "attempt-owned-file";
  resourceId: string;
  targetPath: string;
  stagingPath: string;
  contentDigest: string;
  ready: boolean;
  identity?: ResourceIdentity;
}>;

type PendingOwnedContainer = Readonly<{
  kind: "exclusive-reservation" | "attempt-owned-directory";
  resourceId: string;
  cleanupPath: string;
  ownerMarker: string;
  sidecarPath: string;
  ownerToken: string;
  sidecarIdentity?: ResourceIdentity;
  identity?: ResourceIdentity;
}>;

type PendingResource = PendingOwnedFile | PendingOwnedContainer;

type JournalAttemptIdentity = Readonly<{
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  nativeRunId: string;
}>;

type QuarantineExpectation = Readonly<{
  identity: ResourceIdentity;
  contentDigest?: string;
  ownerMarker?: string;
  removal: "file" | "marker-only-directory" | "owned-tree" | "empty-or-marker-directory";
}>;

type ResourceQuarantine = Readonly<{
  schemaVersion: 1;
  resourceId: string;
  originalPath: string;
  quarantinePath: string;
  state: "intent" | "moved" | "deleting";
  expectation: QuarantineExpectation;
}>;

type ResourceJournal = Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  attemptIdentity: JournalAttemptIdentity;
  recoveryOwner?: NativeResourceRecoveryOwner;
  preparationDigest: string;
  receiptDigest?: string;
  receipts: readonly MaterializedAuxiliaryResource[];
  cleanupPaths: Readonly<Record<string, string>>;
  ownerMarkers: Readonly<Record<string, string>>;
  pending?: PendingResource;
  quarantine?: ResourceQuarantine;
  journalDigest: string;
}>;

const OWNER_MARKER_FILE = ".amadeus-owner.json";

export type NativeResourceRecoveryResult = Readonly<{
  recovered: number;
  retained: number;
}>;

export type NativeResourceSupervisor = ResourceSupervisorPort & Readonly<{
  recover(): Promise<NativeResourceRecoveryResult>;
}>;

type MaterializedResourceOutcome = Readonly<{
  receipt: MaterializedAuxiliaryResource;
  cleanupPath?: string;
  ownerMarker?: string;
}>;

type PendingJournalPort = Readonly<{
  record(pending: PendingResource): void;
  clear(): void;
}>;

type QuarantineJournalPort = Readonly<{
  current(): ResourceJournal;
  record(quarantine: ResourceQuarantine): void;
  clear(): void;
}>;

function currentUid(): number {
  const uid = process.getuid?.();
  if (!Number.isInteger(uid)) throw new Error("RESOURCE_PLATFORM_UNSUPPORTED");
  return uid!;
}

function contentDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalStatDecimal(value: bigint): string {
  if (value < 0n) throw new Error("RESOURCE_OWNER_INVALID");
  return value.toString(10);
}

function canonicalNonnegativeDecimal(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9]\d*)$/.test(value);
}

function statUid(stat: BigIntStats): number {
  if (stat.uid < 0n || stat.uid > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  return Number(stat.uid);
}

function statMode(stat: BigIntStats): number {
  return Number(stat.mode & 0o777n);
}

function identityFromStat(
  stat: BigIntStats,
  kind: ResourceIdentity["kind"],
): ResourceIdentity {
  if (
    stat.isSymbolicLink() ||
    statUid(stat) !== currentUid() ||
    (kind === "file" ? !stat.isFile() : !stat.isDirectory())
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  return Object.freeze({
    dev: canonicalStatDecimal(stat.dev),
    ino: canonicalStatDecimal(stat.ino),
    uid: statUid(stat),
    mode: statMode(stat),
    kind,
  });
}

function resourceIdentity(path: string, kind: ResourceIdentity["kind"]): ResourceIdentity {
  return identityFromStat(lstatSync(path, { bigint: true }), kind);
}

function identityMatches(stat: BigIntStats, identity: ResourceIdentity): boolean {
  return (
    !stat.isSymbolicLink() &&
    canonicalStatDecimal(stat.dev) === identity.dev &&
    canonicalStatDecimal(stat.ino) === identity.ino &&
    statUid(stat) === identity.uid &&
    statMode(stat) === identity.mode &&
    (identity.kind === "file" ? stat.isFile() : stat.isDirectory())
  );
}

function ownerDigest(path: string): string {
  const stat = lstatSync(path, { bigint: true });
  if (stat.isSymbolicLink() || statUid(stat) !== currentUid()) throw new Error("RESOURCE_OWNER_INVALID");
  return ownerDigestFromStat(path, stat);
}

function ownerDigestFromStat(path: string, stat: BigIntStats): string {
  return digestValue({
    path: resolve(path),
    dev: canonicalStatDecimal(stat.dev),
    ino: canonicalStatDecimal(stat.ino),
    uid: statUid(stat),
    mode: statMode(stat),
  });
}

function validateOwnedParent(path: string): void {
  if (!isAbsolute(path)) throw new Error("RESOURCE_PATH_INVALID");
  const parent = dirname(resolve(path));
  const stat = lstatSync(parent, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink() || statUid(stat) !== currentUid()) {
    throw new Error("RESOURCE_PARENT_INVALID");
  }
  if (realpathSync(parent) !== parent) throw new Error("RESOURCE_PARENT_INVALID");
}

function freezeJournal(value: Omit<ResourceJournal, "journalDigest">): ResourceJournal {
  return Object.freeze({ ...value, journalDigest: digestValue(value) });
}

function fsyncDirectory(path: string): void {
  const descriptor = openSync(path, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function writeDurableFile(
  path: string,
  body: string,
  onIdentity: (identity: ResourceIdentity) => void = () => {},
): void {
  const descriptor = openSync(path, "wx", 0o600);
  try {
    onIdentity(identityFromStat(fstatSync(descriptor, { bigint: true }), "file"));
    writeFileSync(descriptor, body);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function writeJournal(path: string, journal: ResourceJournal, exclusive = false): void {
  const body = `${canonicalJson(journal)}\n`;
  if (exclusive) {
    let journalIdentity: ResourceIdentity | undefined;
    try {
      writeDurableFile(path, body, (identity) => {
        journalIdentity = identity;
      });
      fsyncDirectory(dirname(path));
    } catch (error) {
      const journalEntry = pathEntry(path);
      if (journalIdentity && journalEntry && identityMatches(journalEntry, journalIdentity)) unlinkSync(path);
      throw error;
    }
    return;
  }
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  let temporaryIdentity: ResourceIdentity | undefined;
  try {
    writeDurableFile(temporaryPath, body, (identity) => {
      temporaryIdentity = identity;
    });
    renameSync(temporaryPath, path);
    fsyncDirectory(dirname(path));
  } catch (error) {
    const temporary = pathEntry(temporaryPath);
    if (temporaryIdentity && temporary && identityMatches(temporary, temporaryIdentity)) {
      unlinkSync(temporaryPath);
    }
    throw error;
  }
}

function parseReceipt(value: unknown): MaterializedAuxiliaryResource {
  const selected = isRecord(value) ? value.selectedCandidateIndex : undefined;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "resourceId",
      "kind",
      ...(selected === undefined ? [] : ["selectedCandidateIndex"]),
      "resolvedPaths",
      "ownerDigest",
      "contentOrBaselineDigest",
    ]) ||
    !nonEmptyString(value.resourceId) ||
    !["exclusive-reservation", "attempt-owned-file", "attempt-owned-directory", "pre-arm-baseline"].includes(
      String(value.kind),
    ) ||
    !Array.isArray(value.resolvedPaths) ||
    !value.resolvedPaths.every(nonEmptyString) ||
    !nonEmptyString(value.ownerDigest) ||
    !nonEmptyString(value.contentOrBaselineDigest) ||
    (value.kind === "exclusive-reservation"
      ? !Number.isInteger(selected) || Number(selected) < 0
      : selected !== undefined)
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze(value) as MaterializedAuxiliaryResource;
}

function stringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(nonEmptyString);
}

function parseIdentity(value: unknown, kind: ResourceIdentity["kind"]): ResourceIdentity {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["dev", "ino", "uid", "mode", "kind"]) ||
    !canonicalNonnegativeDecimal(value.dev) ||
    !canonicalNonnegativeDecimal(value.ino) ||
    ![value.uid, value.mode].every(Number.isInteger) ||
    value.kind !== kind
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    dev: value.dev,
    ino: value.ino,
    uid: Number(value.uid),
    mode: Number(value.mode),
    kind,
  });
}

function exactAbsolutePath(value: unknown): value is string {
  return nonEmptyString(value) && isAbsolute(value) && resolve(value) === value;
}

function parseAttemptIdentity(value: unknown): JournalAttemptIdentity {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "executionId",
      "attemptId",
      "attemptNonceHash",
      "planDigest",
      "waveIndex",
      "waveDigest",
      "nativeRunId",
    ]) ||
    ![
      value.executionId,
      value.attemptId,
      value.attemptNonceHash,
      value.planDigest,
      value.waveDigest,
      value.nativeRunId,
    ].every(nonEmptyString) ||
    !Number.isInteger(value.waveIndex) ||
    Number(value.waveIndex) < 0
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    executionId: String(value.executionId),
    attemptId: String(value.attemptId),
    attemptNonceHash: String(value.attemptNonceHash),
    planDigest: String(value.planDigest),
    waveIndex: Number(value.waveIndex),
    waveDigest: String(value.waveDigest),
    nativeRunId: String(value.nativeRunId),
  });
}

function parseRecoveryOwner(value: unknown): NativeResourceRecoveryOwner {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "executionId",
      "attemptId",
      "attemptNonceHash",
      "planDigest",
      "waveIndex",
      "waveDigest",
      "nativeRunId",
      "fencingToken",
      "processIdentityDigest",
    ]) ||
    !Number.isInteger(value.fencingToken) ||
    Number(value.fencingToken) < 1 ||
    !nonEmptyString(value.processIdentityDigest)
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    ...parseAttemptIdentity({
      executionId: value.executionId,
      attemptId: value.attemptId,
      attemptNonceHash: value.attemptNonceHash,
      planDigest: value.planDigest,
      waveIndex: value.waveIndex,
      waveDigest: value.waveDigest,
      nativeRunId: value.nativeRunId,
    }),
    fencingToken: Number(value.fencingToken),
    processIdentityDigest: value.processIdentityDigest,
  });
}

function parsePendingFile(value: Record<string, unknown>): PendingOwnedFile {
  if (
    !hasExactKeys(value, [
      "kind",
      "resourceId",
      "targetPath",
      "stagingPath",
      "contentDigest",
      "ready",
      ...(value.identity === undefined ? [] : ["identity"]),
    ]) ||
    !nonEmptyString(value.resourceId) ||
    !exactAbsolutePath(value.targetPath) ||
    !exactAbsolutePath(value.stagingPath) ||
    !nonEmptyString(value.contentDigest) ||
    typeof value.ready !== "boolean" ||
    (value.ready && value.identity === undefined)
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    kind: "attempt-owned-file",
    resourceId: value.resourceId,
    targetPath: value.targetPath,
    stagingPath: value.stagingPath,
    contentDigest: value.contentDigest,
    ready: value.ready,
    ...(value.identity === undefined ? {} : { identity: parseIdentity(value.identity, "file") }),
  });
}

function parsePendingContainer(value: Record<string, unknown>): PendingOwnedContainer {
  if (
    !hasExactKeys(value, [
      "kind",
      "resourceId",
      "cleanupPath",
      "ownerMarker",
      "sidecarPath",
      "ownerToken",
      ...(value.sidecarIdentity === undefined ? [] : ["sidecarIdentity"]),
      ...(value.identity === undefined ? [] : ["identity"]),
    ]) ||
    !nonEmptyString(value.resourceId) ||
    (value.kind !== "exclusive-reservation" && value.kind !== "attempt-owned-directory") ||
    !exactAbsolutePath(value.cleanupPath) ||
    !exactAbsolutePath(value.sidecarPath) ||
    !nonEmptyString(value.ownerMarker) ||
    !nonEmptyString(value.ownerToken) ||
    (value.identity !== undefined && value.sidecarIdentity === undefined)
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    kind: value.kind,
    resourceId: value.resourceId,
    cleanupPath: value.cleanupPath,
    ownerMarker: value.ownerMarker,
    sidecarPath: value.sidecarPath,
    ownerToken: value.ownerToken,
    ...(value.sidecarIdentity === undefined
      ? {}
      : { sidecarIdentity: parseIdentity(value.sidecarIdentity, "file") }),
    ...(value.identity === undefined ? {} : { identity: parseIdentity(value.identity, "directory") }),
  });
}

function parsePending(value: unknown): PendingResource {
  if (!isRecord(value)) throw new Error("RESOURCE_JOURNAL_INVALID");
  return value.kind === "attempt-owned-file" ? parsePendingFile(value) : parsePendingContainer(value);
}

function quarantineExpectationShapeIsValid(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return hasExactKeys(value, [
    "identity",
    ...(value.contentDigest === undefined ? [] : ["contentDigest"]),
    ...(value.ownerMarker === undefined ? [] : ["ownerMarker"]),
    "removal",
  ]);
}

function quarantineExpectationValuesAreValid(value: Record<string, unknown>): boolean {
  const validRemoval = [
    "file",
    "marker-only-directory",
    "owned-tree",
    "empty-or-marker-directory",
  ].includes(String(value.removal));
  const validContent = value.contentDigest === undefined || nonEmptyString(value.contentDigest);
  const validMarker = value.ownerMarker === undefined || nonEmptyString(value.ownerMarker);
  return validRemoval && validContent && validMarker;
}

function quarantineExpectationCombinationIsValid(
  value: Record<string, unknown>,
  removal: QuarantineExpectation["removal"],
): boolean {
  if (removal === "file") return value.ownerMarker === undefined;
  if (value.contentDigest !== undefined) return false;
  if (removal === "owned-tree") return true;
  return value.ownerMarker !== undefined;
}

function parseQuarantineExpectation(value: unknown): QuarantineExpectation {
  if (!quarantineExpectationShapeIsValid(value) || !quarantineExpectationValuesAreValid(value)) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  const removal = value.removal as QuarantineExpectation["removal"];
  const identityKind = removal === "file" ? "file" : "directory";
  if (!quarantineExpectationCombinationIsValid(value, removal)) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    identity: parseIdentity(value.identity, identityKind),
    ...(value.contentDigest === undefined ? {} : { contentDigest: String(value.contentDigest) }),
    ...(value.ownerMarker === undefined ? {} : { ownerMarker: String(value.ownerMarker) }),
    removal,
  });
}

function parseQuarantine(value: unknown): ResourceQuarantine {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "resourceId",
      "originalPath",
      "quarantinePath",
      "state",
      "expectation",
    ]) ||
    value.schemaVersion !== 1 ||
    !nonEmptyString(value.resourceId) ||
    !exactAbsolutePath(value.originalPath) ||
    !exactAbsolutePath(value.quarantinePath) ||
    dirname(value.originalPath) !== dirname(value.quarantinePath) ||
    !["intent", "moved", "deleting"].includes(String(value.state))
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return Object.freeze({
    schemaVersion: 1,
    resourceId: value.resourceId,
    originalPath: value.originalPath,
    quarantinePath: value.quarantinePath,
    state: value.state as ResourceQuarantine["state"],
    expectation: parseQuarantineExpectation(value.expectation),
  });
}

function journalShapeIsValid(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = [
    "schemaVersion",
    "nativeRunId",
    "attemptIdentity",
    ...(value.recoveryOwner === undefined ? [] : ["recoveryOwner"]),
    "preparationDigest",
    ...(value.receiptDigest === undefined ? [] : ["receiptDigest"]),
    "receipts",
    "cleanupPaths",
    "ownerMarkers",
    ...(value.pending === undefined ? [] : ["pending"]),
    ...(value.quarantine === undefined ? [] : ["quarantine"]),
    "journalDigest",
  ];
  return hasExactKeys(value, keys);
}

type JournalEnvelope = Record<string, unknown> & Readonly<{
  schemaVersion: 1;
  nativeRunId: string;
  preparationDigest: string;
  receiptDigest?: string;
  receipts: unknown[];
  cleanupPaths: Record<string, string>;
  ownerMarkers: Record<string, string>;
  journalDigest: string;
}>;

function journalEnvelopeIsValid(value: unknown): value is JournalEnvelope {
  return (
    journalShapeIsValid(value) &&
    value.schemaVersion === 1 &&
    nonEmptyString(value.nativeRunId) &&
    nonEmptyString(value.preparationDigest) &&
    Array.isArray(value.receipts) &&
    stringRecord(value.cleanupPaths) &&
    stringRecord(value.ownerMarkers) &&
    nonEmptyString(value.journalDigest) &&
    (value.receiptDigest === undefined || nonEmptyString(value.receiptDigest))
  );
}

function attemptBindingIsValid(
  attemptIdentity: JournalAttemptIdentity,
  recoveryOwner: NativeResourceRecoveryOwner | undefined,
  nativeRunId: string,
): boolean {
  return (
    attemptIdentity.nativeRunId === nativeRunId &&
    (recoveryOwner === undefined ||
      digestValue(attemptIdentity) === digestValue(ownerAttemptIdentity(recoveryOwner)))
  );
}

function validateJournalResourceIndexes(
  receipts: readonly MaterializedAuxiliaryResource[],
  cleanupPaths: Readonly<Record<string, string>>,
  ownerMarkers: Readonly<Record<string, string>>,
  pending: PendingResource | undefined,
  receiptDigest: unknown,
): void {
  const managedIds = receipts
    .filter(({ kind }) => kind !== "pre-arm-baseline")
    .map(({ resourceId }) => resourceId)
    .sort();
  const markedIds = receipts
    .filter(({ kind }) => kind === "exclusive-reservation" || kind === "attempt-owned-directory")
    .map(({ resourceId }) => resourceId)
    .sort();
  if (
    digestValue(Object.keys(cleanupPaths).sort()) !== digestValue(managedIds) ||
    digestValue(Object.keys(ownerMarkers).sort()) !== digestValue(markedIds) ||
    (pending !== undefined && receiptDigest !== undefined) ||
    (pending !== undefined && receipts.some(({ resourceId }) => resourceId === pending.resourceId))
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
}

function parseJournal(value: unknown): ResourceJournal {
  if (!journalEnvelopeIsValid(value)) throw new Error("RESOURCE_JOURNAL_INVALID");
  const receipts = Object.freeze(value.receipts.map(parseReceipt));
  const attemptIdentity = parseAttemptIdentity(value.attemptIdentity);
  const recoveryOwner = value.recoveryOwner === undefined ? undefined : parseRecoveryOwner(value.recoveryOwner);
  const pending = value.pending === undefined ? undefined : parsePending(value.pending);
  const quarantine = value.quarantine === undefined ? undefined : parseQuarantine(value.quarantine);
  const semantic = {
    schemaVersion: 1 as const,
    nativeRunId: value.nativeRunId,
    attemptIdentity,
    ...(recoveryOwner === undefined ? {} : { recoveryOwner }),
    preparationDigest: value.preparationDigest,
    ...(value.receiptDigest === undefined ? {} : { receiptDigest: value.receiptDigest }),
    receipts,
    cleanupPaths: Object.freeze({ ...value.cleanupPaths }) as Readonly<Record<string, string>>,
    ownerMarkers: Object.freeze({ ...value.ownerMarkers }) as Readonly<Record<string, string>>,
    ...(pending === undefined ? {} : { pending }),
    ...(quarantine === undefined ? {} : { quarantine }),
  };
  if (digestValue(semantic) !== value.journalDigest) throw new Error("RESOURCE_JOURNAL_INVALID");
  if (!attemptBindingIsValid(attemptIdentity, recoveryOwner, value.nativeRunId)) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  validateJournalResourceIndexes(
    receipts,
    semantic.cleanupPaths,
    semantic.ownerMarkers,
    pending,
    value.receiptDigest,
  );
  return Object.freeze({ ...semantic, journalDigest: value.journalDigest });
}

function readJournal(path: string): ResourceJournal {
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || statUid(stat) !== currentUid() || statMode(stat) !== 0o600) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
  return parseJournal(JSON.parse(readFileSync(path, "utf-8")));
}

function ownedFileReceipt(
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "attempt-owned-file" }>>,
  stagingPath: string,
  pendingJournal: PendingJournalPort,
): MaterializedAuxiliaryResource {
  validateOwnedParent(plan.path);
  let pending: PendingOwnedFile = Object.freeze({
    kind: plan.kind,
    resourceId: plan.resourceId,
    targetPath: resolve(plan.path),
    stagingPath: resolve(stagingPath),
    contentDigest: contentDigest(plan.bytes),
    ready: false,
  });
  pendingJournal.record(pending);
  const descriptor = openSync(stagingPath, "wx", 0o600);
  try {
    const identity = identityFromStat(fstatSync(descriptor, { bigint: true }), "file");
    pending = Object.freeze({ ...pending, identity });
    pendingJournal.record(pending);
    writeFileSync(descriptor, plan.bytes);
    fsyncSync(descriptor);
    pending = Object.freeze({ ...pending, ready: true });
    pendingJournal.record(pending);
  } finally {
    closeSync(descriptor);
  }
  linkSync(stagingPath, plan.path);
  unlinkSync(stagingPath);
  chmodSync(plan.path, 0o600);
  fsyncDirectory(dirname(resolve(plan.path)));
  return Object.freeze({
    resourceId: plan.resourceId,
    kind: plan.kind,
    resolvedPaths: Object.freeze([resolve(plan.path)]),
    ownerDigest: ownerDigest(plan.path),
    contentOrBaselineDigest: pending.contentDigest,
  });
}

function pathEntry(path: string): BigIntStats | null {
  try {
    return lstatSync(path, { bigint: true });
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

function quarantineIntent(
  path: string,
  resourceId: string,
  expectation: QuarantineExpectation,
): ResourceQuarantine {
  const originalPath = resolve(path);
  return Object.freeze({
    schemaVersion: 1,
    resourceId,
    originalPath,
    quarantinePath: join(
      dirname(originalPath),
      `.${basename(originalPath)}.amadeus-quarantine-${randomUUID()}`,
    ),
    state: "intent",
    expectation,
  });
}

function markerMatches(path: string, expected: string): boolean {
  const marker = pathEntry(path);
  return Boolean(
    marker?.isFile() &&
    !marker.isSymbolicLink() &&
    statUid(marker) === currentUid() &&
    readFileSync(path, "utf-8") === expected
  );
}

function verifyQuarantinedFile(path: string, expectation: QuarantineExpectation): void {
  if (
    expectation.contentDigest !== undefined &&
    contentDigest(readFileSync(path)) !== expectation.contentDigest
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
}

function verifyQuarantinedTree(path: string, expectation: QuarantineExpectation): void {
  if (expectation.ownerMarker !== undefined) {
    const markerPath = join(path, OWNER_MARKER_FILE);
    if (!markerMatches(markerPath, expectation.ownerMarker)) throw new Error("RESOURCE_OWNER_INVALID");
  }
  validateOwnedTree(path);
}

function verifyQuarantinedMarkerDirectory(path: string, expectation: QuarantineExpectation): void {
  const entries = readdirSync(path);
  const markerPath = join(path, OWNER_MARKER_FILE);
  const markerOnly = entries.length === 1 && entries[0] === OWNER_MARKER_FILE;
  if (
    (expectation.removal === "marker-only-directory" && !markerOnly) ||
    (expectation.removal === "empty-or-marker-directory" && entries.length > 0 && !markerOnly) ||
    (markerOnly && !markerMatches(markerPath, expectation.ownerMarker ?? ""))
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
}

function verifyQuarantine(quarantine: ResourceQuarantine): void {
  const stat = pathEntry(quarantine.quarantinePath);
  if (!stat || !identityMatches(stat, quarantine.expectation.identity)) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  const expectation = quarantine.expectation;
  if (expectation.removal === "file") {
    verifyQuarantinedFile(quarantine.quarantinePath, expectation);
    return;
  }
  if (expectation.removal === "owned-tree") {
    verifyQuarantinedTree(quarantine.quarantinePath, expectation);
    return;
  }
  verifyQuarantinedMarkerDirectory(quarantine.quarantinePath, expectation);
}

function removeVerifiedQuarantine(quarantine: ResourceQuarantine): void {
  const expectation = quarantine.expectation;
  if (expectation.removal === "file") {
    unlinkSync(quarantine.quarantinePath);
  } else if (expectation.removal === "owned-tree") {
    rmSync(quarantine.quarantinePath, { recursive: true });
  } else {
    const markerPath = join(quarantine.quarantinePath, OWNER_MARKER_FILE);
    if (pathEntry(markerPath)) unlinkSync(markerPath);
    rmdirSync(quarantine.quarantinePath);
  }
  fsyncDirectory(dirname(quarantine.quarantinePath));
}

function transitionQuarantine(
  journal: QuarantineJournalPort,
  quarantine: ResourceQuarantine,
  state: ResourceQuarantine["state"],
): ResourceQuarantine {
  const transitioned = Object.freeze({ ...quarantine, state });
  journal.record(transitioned);
  return transitioned;
}

function finishQuarantine(
  quarantine: ResourceQuarantine,
  journal?: QuarantineJournalPort,
): void {
  verifyQuarantine(quarantine);
  const deleting = journal ? transitionQuarantine(journal, quarantine, "deleting") : quarantine;
  removeVerifiedQuarantine(deleting);
  journal?.clear();
}

function quarantineResource(
  path: string,
  resourceId: string,
  expectation: QuarantineExpectation,
  journal?: QuarantineJournalPort,
): void {
  let quarantine = quarantineIntent(path, resourceId, expectation);
  journal?.record(quarantine);
  renameSync(quarantine.originalPath, quarantine.quarantinePath);
  fsyncDirectory(dirname(quarantine.originalPath));
  if (journal) quarantine = transitionQuarantine(journal, quarantine, "moved");
  finishQuarantine(quarantine, journal);
}

function writeOwnerMarker(path: string, markerBody: string): void {
  const markerPath = join(path, OWNER_MARKER_FILE);
  writeDurableFile(markerPath, markerBody);
  fsyncDirectory(path);
}

function containerSidecarPath(path: string, input: LaunchInput, resourceId: string): string {
  const suffix = digestValue({
    nativeRunId: input.nativeRunId,
    resourceId,
    cleanupPath: resolve(path),
  }).slice(0, 16);
  return join(dirname(resolve(path)), `.${basename(path)}.amadeus-${suffix}.owner`);
}

function beginPendingContainer(
  kind: PendingOwnedContainer["kind"],
  resourceId: string,
  cleanupPath: string,
  ownerMarker: string,
  input: LaunchInput,
  pendingJournal: PendingJournalPort,
): PendingOwnedContainer {
  const sidecarPath = containerSidecarPath(cleanupPath, input, resourceId);
  const ownerToken = `${canonicalJson({
    schemaVersion: 1,
    nativeRunId: input.nativeRunId,
    resourceId,
    cleanupPathDigest: digestValue(cleanupPath),
    nonce: randomUUID(),
  })}\n`;
  let pending: PendingOwnedContainer = Object.freeze({
    kind,
    resourceId,
    cleanupPath,
    ownerMarker,
    sidecarPath,
    ownerToken,
  });
  pendingJournal.record(pending);
  let sidecarIdentity: ResourceIdentity | undefined;
  writeDurableFile(sidecarPath, ownerToken, (identity) => {
    sidecarIdentity = identity;
  });
  fsyncDirectory(dirname(sidecarPath));
  if (!sidecarIdentity) throw new Error("RESOURCE_OWNER_INVALID");
  pending = Object.freeze({ ...pending, sidecarIdentity });
  pendingJournal.record(pending);
  return pending;
}

function pendingSidecarIsOwned(pending: PendingOwnedContainer): boolean {
  const stat = pathEntry(pending.sidecarPath);
  if (!stat) return false;
  if (
    !pending.sidecarIdentity ||
    !identityMatches(stat, pending.sidecarIdentity) ||
    readFileSync(pending.sidecarPath, "utf-8") !== pending.ownerToken
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  return true;
}

function removeOwnedSidecar(pending: PendingOwnedContainer, journal?: QuarantineJournalPort): void {
  if (!pendingSidecarIsOwned(pending)) return;
  if (!pending.sidecarIdentity) throw new Error("RESOURCE_OWNER_INVALID");
  quarantineResource(
    pending.sidecarPath,
    pending.resourceId,
    Object.freeze({
      identity: pending.sidecarIdentity,
      contentDigest: contentDigest(new TextEncoder().encode(pending.ownerToken)),
      removal: "file",
    }),
    journal,
  );
}

function reservationReceipt(
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "exclusive-reservation" }>>,
  input: LaunchInput,
  pendingJournal: PendingJournalPort,
): Readonly<{ receipt: MaterializedAuxiliaryResource; cleanupPath: string; ownerMarker: string }> {
  for (const [selectedCandidateIndex, candidate] of plan.candidates.entries()) {
    if (!candidate.guardedPaths.every(isAbsolute)) throw new Error("RESOURCE_PATH_INVALID");
    validateOwnedParent(candidate.reservationPath);
    const cleanupPath = resolve(candidate.reservationPath);
    const ownerMarker = `${canonicalJson({
      schemaVersion: 1,
      nativeRunId: input.nativeRunId,
      resourceId: plan.resourceId,
      reservationPathDigest: digestValue(cleanupPath),
    })}\n`;
    let pending: PendingOwnedContainer | undefined;
    try {
      pending = beginPendingContainer(
        plan.kind,
        plan.resourceId,
        cleanupPath,
        ownerMarker,
        input,
        pendingJournal,
      );
      mkdirSync(cleanupPath, { mode: 0o700 });
      fsyncDirectory(dirname(cleanupPath));
      pending = Object.freeze({ ...pending, identity: resourceIdentity(cleanupPath, "directory") });
      pendingJournal.record(pending);
      writeOwnerMarker(cleanupPath, ownerMarker);
      if (candidate.guardedPaths.some((path) => pathEntry(path) !== null)) {
        cleanupPending(pending);
        pendingJournal.clear();
        continue;
      }
      removeOwnedSidecar(pending);
      return Object.freeze({
        cleanupPath,
        ownerMarker,
        receipt: Object.freeze({
          resourceId: plan.resourceId,
          kind: plan.kind,
          selectedCandidateIndex,
          resolvedPaths: Object.freeze(candidate.guardedPaths.map((path) => resolve(path))),
          ownerDigest: ownerDigest(cleanupPath),
          contentOrBaselineDigest: digestValue({
            markerDigest: contentDigest(new TextEncoder().encode(ownerMarker)),
            guardedPaths: candidate.guardedPaths.map((path) => resolve(path)),
          }),
        }),
      });
    } catch (error) {
      if (isRecord(error) && error.code === "EEXIST" && pending?.identity === undefined) {
        if (pending) removeOwnedSidecar(pending);
        pendingJournal.clear();
        continue;
      }
      throw error;
    }
  }
  throw new Error("RESOURCE_RESERVATION_UNAVAILABLE");
}

function ownedDirectoryReceipt(
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "attempt-owned-directory" }>>,
  input: LaunchInput,
  pendingJournal: PendingJournalPort,
): Readonly<{ receipt: MaterializedAuxiliaryResource; cleanupPath: string; ownerMarker: string }> {
  validateOwnedParent(plan.path);
  const path = resolve(plan.path);
  const ownerMarker = `${canonicalJson({
    schemaVersion: 1,
    nativeRunId: input.nativeRunId,
    resourceId: plan.resourceId,
    directoryPathDigest: digestValue(path),
  })}\n`;
  let pending: PendingOwnedContainer | undefined;
  try {
    pending = beginPendingContainer(plan.kind, plan.resourceId, path, ownerMarker, input, pendingJournal);
    mkdirSync(path, { mode: 0o700 });
    fsyncDirectory(dirname(path));
    pending = Object.freeze({ ...pending, identity: resourceIdentity(path, "directory") });
    pendingJournal.record(pending);
    writeOwnerMarker(path, ownerMarker);
    removeOwnedSidecar(pending);
    return Object.freeze({
      cleanupPath: path,
      ownerMarker,
      receipt: Object.freeze({
        resourceId: plan.resourceId,
        kind: plan.kind,
        resolvedPaths: Object.freeze([path]),
        ownerDigest: ownerDigest(path),
        contentOrBaselineDigest: contentDigest(new TextEncoder().encode(ownerMarker)),
      }),
    });
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST" && pending?.identity === undefined) {
      if (pending) removeOwnedSidecar(pending);
      pendingJournal.clear();
    }
    throw error;
  }
}

type BaselineSnapshot = Readonly<{
  path: string;
  dev: string;
  ino: string;
  uid: number;
  mode: number;
  kind: "file" | "directory";
  size: string;
  mtimeNs: string;
  contentDigest?: string;
}>;

function baselineSnapshot(path: string): BaselineSnapshot {
  const resolvedPath = resolve(path);
  const stat = lstatSync(resolvedPath, { bigint: true });
  if (stat.isSymbolicLink() || statUid(stat) !== currentUid() || (!stat.isFile() && !stat.isDirectory())) {
    throw new Error("RESOURCE_BASELINE_INVALID");
  }
  return Object.freeze({
    path: resolvedPath,
    dev: canonicalStatDecimal(stat.dev),
    ino: canonicalStatDecimal(stat.ino),
    uid: statUid(stat),
    mode: statMode(stat),
    kind: stat.isFile() ? "file" : "directory",
    size: canonicalStatDecimal(stat.size),
    mtimeNs: canonicalStatDecimal(stat.mtimeNs),
    ...(stat.isFile() ? { contentDigest: contentDigest(readFileSync(resolvedPath)) } : {}),
  });
}

function baselineReceipt(
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "pre-arm-baseline" }>>,
): Readonly<{ receipt: MaterializedAuxiliaryResource }> {
  if (!plan.exactPaths.every(isAbsolute)) throw new Error("RESOURCE_PATH_INVALID");
  const existing = plan.exactPaths.filter((path) => pathEntry(path) !== null);
  if (existing.length !== plan.exactPaths.length) {
    if (!plan.allowAbsent || existing.length !== 0) throw new Error("RESOURCE_BASELINE_INVALID");
    const resolvedPaths = Object.freeze([]) as readonly string[];
    return Object.freeze({
      receipt: Object.freeze({
        resourceId: plan.resourceId,
        kind: plan.kind,
        resolvedPaths,
        ownerDigest: digestValue({ kind: "all-absent", paths: plan.exactPaths.map((path) => resolve(path)) }),
        contentOrBaselineDigest: digestValue({ kind: "all-absent", paths: plan.exactPaths.map((path) => resolve(path)) }),
      }),
    });
  }
  const snapshots = Object.freeze(plan.exactPaths.map(baselineSnapshot));
  return Object.freeze({
    receipt: Object.freeze({
      resourceId: plan.resourceId,
      kind: plan.kind,
      resolvedPaths: Object.freeze(snapshots.map(({ path }) => path)),
      ownerDigest: digestValue(snapshots.map(({ path, dev, ino, uid, mode, kind }) => ({
        path,
        dev,
        ino,
        uid,
        mode,
        kind,
      }))),
      contentOrBaselineDigest: digestValue(snapshots),
    }),
  });
}

function pendingFilePathIsOwned(path: string, pending: PendingOwnedFile): boolean {
  const stat = pathEntry(path);
  if (!stat) return false;
  if (!pending.identity || !identityMatches(stat, pending.identity)) return false;
  if (pending.ready && contentDigest(readFileSync(path)) !== pending.contentDigest) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  return true;
}

function cleanupPendingFile(pending: PendingOwnedFile, journal?: QuarantineJournalPort): void {
  const staging = pathEntry(pending.stagingPath);
  if (!pending.identity) {
    if (staging) throw new Error("RESOURCE_OWNER_INVALID");
    return;
  }
  if (staging && !identityMatches(staging, pending.identity)) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  const ownedPaths = [pending.targetPath, pending.stagingPath].filter((path) =>
    pendingFilePathIsOwned(path, pending)
  );
  for (const path of ownedPaths) {
    quarantineResource(
      path,
      pending.resourceId,
      Object.freeze({
        identity: pending.identity,
        ...(pending.ready ? { contentDigest: pending.contentDigest } : {}),
        removal: "file",
      }),
      journal,
    );
  }
}

function cleanupIdentifiedPendingContainer(
  pending: PendingOwnedContainer,
  stat: BigIntStats,
  journal?: QuarantineJournalPort,
): void {
  if (!pending.identity || !identityMatches(stat, pending.identity)) throw new Error("RESOURCE_OWNER_INVALID");
  quarantineResource(
    pending.cleanupPath,
    pending.resourceId,
    Object.freeze({
      identity: pending.identity,
      ownerMarker: pending.ownerMarker,
      removal: "empty-or-marker-directory",
    }),
    journal,
  );
}

function cleanupPendingContainer(pending: PendingOwnedContainer, journal?: QuarantineJournalPort): void {
  const sidecarOwned = pendingSidecarIsOwned(pending);
  const stat = pathEntry(pending.cleanupPath);
  if (!stat) {
    if (sidecarOwned) removeOwnedSidecar(pending, journal);
    return;
  }
  if (!pending.identity) throw new Error("RESOURCE_OWNER_INVALID");
  cleanupIdentifiedPendingContainer(pending, stat, journal);
  if (sidecarOwned) removeOwnedSidecar(pending, journal);
}

function cleanupPending(pending: PendingResource | undefined, journal?: QuarantineJournalPort): void {
  if (!pending) return;
  if (pending.kind === "attempt-owned-file") {
    cleanupPendingFile(pending, journal);
    return;
  }
  cleanupPendingContainer(pending, journal);
}

function removeOwnedFile(receipt: MaterializedAuxiliaryResource, journal?: QuarantineJournalPort): void {
  const path = receipt.resolvedPaths[0];
  if (!path) return;
  const stat = pathEntry(path);
  if (!stat) return;
  if (!stat.isFile() || stat.isSymbolicLink() || statUid(stat) !== currentUid()) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  if (
    ownerDigest(path) !== receipt.ownerDigest ||
    contentDigest(readFileSync(path)) !== receipt.contentOrBaselineDigest
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  quarantineResource(
    path,
    receipt.resourceId,
    Object.freeze({
      identity: identityFromStat(stat, "file"),
      contentDigest: receipt.contentOrBaselineDigest,
      removal: "file",
    }),
    journal,
  );
}

function reservationIsOwned(
  receipt: MaterializedAuxiliaryResource,
  cleanupPath: string,
  ownerMarker: string,
): ResourceIdentity | null {
  const stat = pathEntry(cleanupPath);
  if (!stat) return null;
  if (!stat.isDirectory() || stat.isSymbolicLink() || statUid(stat) !== currentUid()) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  const markerPath = join(cleanupPath, OWNER_MARKER_FILE);
  const marker = pathEntry(markerPath);
  if (
    !marker?.isFile() ||
    marker.isSymbolicLink() ||
    statUid(marker) !== currentUid() ||
    readFileSync(markerPath, "utf-8") !== ownerMarker ||
    ownerDigest(cleanupPath) !== receipt.ownerDigest
  ) {
    throw new Error("RESOURCE_OWNER_INVALID");
  }
  return identityFromStat(stat, "directory");
}

function removeReservation(
  receipt: MaterializedAuxiliaryResource,
  cleanupPath: string,
  ownerMarker: string,
  journal?: QuarantineJournalPort,
): void {
  const identity = reservationIsOwned(receipt, cleanupPath, ownerMarker);
  if (!identity) return;
  quarantineResource(
    cleanupPath,
    receipt.resourceId,
    Object.freeze({
      identity,
      ownerMarker,
      removal: "marker-only-directory",
    }),
    journal,
  );
}

function validateOwnedTree(path: string): void {
  const stat = lstatSync(path, { bigint: true });
  if (stat.isSymbolicLink() || statUid(stat) !== currentUid()) throw new Error("RESOURCE_OWNER_INVALID");
  if (!stat.isDirectory()) return;
  for (const name of readdirSync(path)) validateOwnedTree(join(path, name));
}

function removeOwnedDirectory(
  receipt: MaterializedAuxiliaryResource,
  cleanupPath: string,
  ownerMarker: string,
  journal?: QuarantineJournalPort,
): void {
  const identity = reservationIsOwned(receipt, cleanupPath, ownerMarker);
  if (!identity) return;
  quarantineResource(
    cleanupPath,
    receipt.resourceId,
    Object.freeze({
      identity,
      ownerMarker,
      removal: "owned-tree",
    }),
    journal,
  );
}

function cleanupReceipts(
  receipts: readonly MaterializedAuxiliaryResource[],
  cleanupPaths: Readonly<Record<string, string>>,
  ownerMarkers: Readonly<Record<string, string>>,
  journal?: QuarantineJournalPort,
): void {
  for (const receipt of [...receipts].reverse()) {
    if (receipt.kind === "attempt-owned-file") removeOwnedFile(receipt, journal);
    if (receipt.kind === "attempt-owned-directory") {
      const cleanupPath = cleanupPaths[receipt.resourceId];
      const marker = ownerMarkers[receipt.resourceId];
      if (!cleanupPath || !marker) throw new Error("RESOURCE_JOURNAL_INVALID");
      removeOwnedDirectory(receipt, cleanupPath, marker, journal);
    }
    if (receipt.kind === "exclusive-reservation") {
      const cleanupPath = cleanupPaths[receipt.resourceId];
      const marker = ownerMarkers[receipt.resourceId];
      if (!cleanupPath || !marker) throw new Error("RESOURCE_JOURNAL_INVALID");
      removeReservation(receipt, cleanupPath, marker, journal);
    }
  }
}

function preparationIsValid(preparation: AdapterResourcePreparation): boolean {
  return (
    Array.isArray(preparation.resources) &&
    preparation.preparationDigest === digestValue(preparation.resources) &&
    new Set(preparation.resources.map(({ resourceId }) => resourceId)).size === preparation.resources.length
  );
}

function materializePlan(
  plan: AuxiliaryResourcePlan,
  input: LaunchInput,
  pendingJournal: PendingJournalPort,
): MaterializedResourceOutcome {
  if (plan.kind === "attempt-owned-file") {
    return Object.freeze({
      receipt: ownedFileReceipt(plan, stagingFile(plan, input), pendingJournal),
      cleanupPath: resolve(plan.path),
    });
  }
  if (plan.kind === "exclusive-reservation") return reservationReceipt(plan, input, pendingJournal);
  if (plan.kind === "attempt-owned-directory") return ownedDirectoryReceipt(plan, input, pendingJournal);
  return baselineReceipt(plan);
}

function verifyOwnedFileForArm(receipt: MaterializedAuxiliaryResource): void {
  const path = receipt.resolvedPaths[0];
  if (!path || !existsSync(path)) throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  if (
    ownerDigest(path) !== receipt.ownerDigest ||
    contentDigest(readFileSync(path)) !== receipt.contentOrBaselineDigest
  ) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
}

function verifyReservationForArm(
  receipt: MaterializedAuxiliaryResource,
  journal: ResourceJournal,
): void {
  const cleanupPath = journal.cleanupPaths[receipt.resourceId];
  const marker = journal.ownerMarkers[receipt.resourceId];
  if (!cleanupPath || !marker || !reservationIsOwned(receipt, cleanupPath, marker)) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
  if (receipt.resolvedPaths.some((path) => pathEntry(path) !== null)) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
}

function verifyOwnedDirectoryForArm(
  receipt: MaterializedAuxiliaryResource,
  journal: ResourceJournal,
): void {
  const cleanupPath = journal.cleanupPaths[receipt.resourceId];
  const marker = journal.ownerMarkers[receipt.resourceId];
  if (!cleanupPath || !marker || !reservationIsOwned(receipt, cleanupPath, marker)) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
}

function verifyBaselineForArm(
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "pre-arm-baseline" }>>,
  receipt: MaterializedAuxiliaryResource,
): void {
  const current = baselineReceipt(plan).receipt;
  if (
    digestValue(current.resolvedPaths) !== digestValue(receipt.resolvedPaths) ||
    current.ownerDigest !== receipt.ownerDigest ||
    current.contentOrBaselineDigest !== receipt.contentOrBaselineDigest
  ) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
}

function verifyResourceForArm(
  plan: AuxiliaryResourcePlan,
  receipt: MaterializedAuxiliaryResource,
  journal: ResourceJournal,
): void {
  if (plan.resourceId !== receipt.resourceId || plan.kind !== receipt.kind) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
  if (plan.kind === "attempt-owned-file") {
    verifyOwnedFileForArm(receipt);
    return;
  }
  if (plan.kind === "exclusive-reservation") {
    verifyReservationForArm(receipt, journal);
    return;
  }
  if (plan.kind === "attempt-owned-directory") {
    verifyOwnedDirectoryForArm(receipt, journal);
    return;
  }
  verifyBaselineForArm(plan, receipt);
}

function validateResourceSetForArm(
  preparation: AdapterResourcePreparation,
  resources: MaterializedAuxiliaryResourceSet,
): void {
  if (!preparationIsValid(preparation)) throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  if (preparation.preparationDigest !== resources.preparationDigest) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
  if (resources.receiptDigest !== digestValue(resources.resources)) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
  if (resources.resources.length !== preparation.resources.length) {
    throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
  }
}

function validateResourceReceiptDigest(resources: MaterializedAuxiliaryResourceSet): void {
  if (resources.receiptDigest !== digestValue(resources.resources)) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
}

export const nativeResourceTestSeam = Object.freeze({
  statUid,
  validateResourceReceiptDigest,
});

function validateJournalBinding(journal: ResourceJournal, resources: MaterializedAuxiliaryResourceSet): void {
  if (
    journal.pending !== undefined ||
    journal.receiptDigest !== resources.receiptDigest ||
    digestValue(journal.receipts) !== resources.receiptDigest ||
    journal.preparationDigest !== resources.preparationDigest
  ) {
    throw new Error("RESOURCE_JOURNAL_INVALID");
  }
}

function journalHasManagedResources(journal: ResourceJournal): boolean {
  return (
    journal.pending !== undefined ||
    journal.quarantine !== undefined ||
    journal.receipts.some(({ kind }) => kind !== "pre-arm-baseline")
  );
}

function journalWithoutPending(journal: ResourceJournal): Omit<ResourceJournal, "journalDigest" | "pending"> {
  return {
    schemaVersion: 1,
    nativeRunId: journal.nativeRunId,
    attemptIdentity: journal.attemptIdentity,
    ...(journal.recoveryOwner === undefined ? {} : { recoveryOwner: journal.recoveryOwner }),
    preparationDigest: journal.preparationDigest,
    ...(journal.receiptDigest === undefined ? {} : { receiptDigest: journal.receiptDigest }),
    receipts: journal.receipts,
    cleanupPaths: journal.cleanupPaths,
    ownerMarkers: journal.ownerMarkers,
    ...(journal.quarantine === undefined ? {} : { quarantine: journal.quarantine }),
  };
}

function journalWithoutQuarantine(
  journal: ResourceJournal,
): Omit<ResourceJournal, "journalDigest" | "quarantine"> {
  return {
    schemaVersion: 1,
    nativeRunId: journal.nativeRunId,
    attemptIdentity: journal.attemptIdentity,
    ...(journal.recoveryOwner === undefined ? {} : { recoveryOwner: journal.recoveryOwner }),
    preparationDigest: journal.preparationDigest,
    ...(journal.receiptDigest === undefined ? {} : { receiptDigest: journal.receiptDigest }),
    receipts: journal.receipts,
    cleanupPaths: journal.cleanupPaths,
    ownerMarkers: journal.ownerMarkers,
    ...(journal.pending === undefined ? {} : { pending: journal.pending }),
  };
}

function createQuarantineJournalPort(
  path: string,
  initial: ResourceJournal,
): QuarantineJournalPort {
  let journal = initial;
  return Object.freeze({
    current: () => journal,
    record(quarantine): void {
      journal = freezeJournal({ ...journalWithoutQuarantine(journal), quarantine });
      writeJournal(path, journal);
    },
    clear(): void {
      journal = freezeJournal(journalWithoutQuarantine(journal));
      writeJournal(path, journal);
    },
  });
}

function resumeQuarantine(port: QuarantineJournalPort): void {
  let quarantine = port.current().quarantine;
  if (!quarantine) return;
  const original = pathEntry(quarantine.originalPath);
  const quarantined = pathEntry(quarantine.quarantinePath);
  if (quarantine.state === "intent") {
    if (original && !quarantined) {
      renameSync(quarantine.originalPath, quarantine.quarantinePath);
      fsyncDirectory(dirname(quarantine.originalPath));
    } else if (!(!original && quarantined)) {
      throw new Error("RESOURCE_QUARANTINE_INVALID");
    }
    quarantine = transitionQuarantine(port, quarantine, "moved");
  }
  if (quarantine.state === "deleting" && !pathEntry(quarantine.quarantinePath)) {
    if (pathEntry(quarantine.originalPath)) throw new Error("RESOURCE_QUARANTINE_INVALID");
    port.clear();
    return;
  }
  finishQuarantine(quarantine, port);
}

function cleanupJournalResources(path: string, journal: ResourceJournal): void {
  const quarantinePort = createQuarantineJournalPort(path, journal);
  resumeQuarantine(quarantinePort);
  const current = quarantinePort.current();
  cleanupPending(current.pending, quarantinePort);
  cleanupReceipts(current.receipts, current.cleanupPaths, current.ownerMarkers, quarantinePort);
}

function attemptIdentityFromLaunch(input: LaunchInput): JournalAttemptIdentity {
  return Object.freeze({
    executionId: input.plan.executionId,
    attemptId: input.plan.attemptId,
    attemptNonceHash: input.plan.attemptNonceHash,
    planDigest: input.plan.planDigest,
    waveIndex: input.wave.index,
    waveDigest: digestValue(input.wave),
    nativeRunId: input.nativeRunId,
  });
}

function ownerAttemptIdentity(owner: NativeResourceRecoveryOwner): JournalAttemptIdentity {
  return Object.freeze({
    executionId: owner.executionId,
    attemptId: owner.attemptId,
    attemptNonceHash: owner.attemptNonceHash,
    planDigest: owner.planDigest,
    waveIndex: owner.waveIndex,
    waveDigest: owner.waveDigest,
    nativeRunId: owner.nativeRunId,
  });
}

function sameRecoveryOwner(
  left: NativeResourceRecoveryOwner,
  right: NativeResourceRecoveryOwner,
): boolean {
  return (
    left.executionId === right.executionId &&
    left.attemptId === right.attemptId &&
    left.attemptNonceHash === right.attemptNonceHash &&
    left.planDigest === right.planDigest &&
    left.waveIndex === right.waveIndex &&
    left.waveDigest === right.waveDigest &&
    left.nativeRunId === right.nativeRunId &&
    left.fencingToken === right.fencingToken &&
    left.processIdentityDigest === right.processIdentityDigest
  );
}

function observationIsValid(value: unknown): value is NativeResourceRecoveryObservation {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["ownerState", "processIdentityDigest", "processGroupState"]) &&
    ["live", "dead", "unknown"].includes(String(value.ownerState)) &&
    nonEmptyString(value.processIdentityDigest) &&
    ["live", "stopped", "unknown"].includes(String(value.processGroupState))
  );
}

async function observerAuthorizesCleanup(
  journal: ResourceJournal,
  observer: NativeResourceRecoveryObserverPort | undefined,
): Promise<boolean> {
  // The observer fences the supervised process/group. Unrelated malicious same-UID
  // processes are outside this boundary because they can already read 0600 resources.
  if (!journal.recoveryOwner) return false;
  if (!observer) return false;
  try {
    const observation = await observer.observe(journal.recoveryOwner);
    return (
      observationIsValid(observation) &&
      observation.processIdentityDigest === journal.recoveryOwner.processIdentityDigest &&
      observation.ownerState === "dead" &&
      observation.processGroupState === "stopped"
    );
  } catch {
    return false;
  }
}

function unlinkJournal(path: string): void {
  unlinkSync(path);
  fsyncDirectory(dirname(path));
}

function journalFile(root: string, input: LaunchInput): string {
  const name = digestValue({
    nativeRunId: input.nativeRunId,
    executionId: input.plan.executionId,
    attemptId: input.plan.attemptId,
    waveIndex: input.wave.index,
  });
  const path = resolve(root, `${name}.json`);
  if (!path.startsWith(`${root}${sep}`)) throw new Error("RESOURCE_JOURNAL_PATH_INVALID");
  return path;
}

function stagingFile(plan: AuxiliaryResourcePlan, input: LaunchInput): string {
  if (plan.kind !== "attempt-owned-file") throw new Error("RESOURCE_KIND_UNIMPLEMENTED");
  const suffix = digestValue({ nativeRunId: input.nativeRunId, resourceId: plan.resourceId }).slice(0, 16);
  return join(dirname(resolve(plan.path)), `.${basename(plan.path)}.amadeus-${suffix}.tmp`);
}

export function createNativeResourceSupervisor(input: Readonly<{
  journalRoot: string;
  recoveryObserver?: NativeResourceRecoveryObserverPort;
}>): NativeResourceSupervisor {
  const configuredRoot = resolve(input.journalRoot);
  mkdirSync(configuredRoot, { recursive: true, mode: 0o700 });
  const rootStat = lstatSync(configuredRoot, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || statUid(rootStat) !== currentUid()) {
    throw new Error("RESOURCE_JOURNAL_ROOT_INVALID");
  }
  const root = realpathSync(configuredRoot);
  const activeJournals = new WeakMap<MaterializedAuxiliaryResourceSet, string>();
  const completedReceipts = new WeakSet<MaterializedAuxiliaryResourceSet>();

  return Object.freeze({
    async materialize(preparation, launchInput): Promise<MaterializedAuxiliaryResourceSet> {
      if (!preparationIsValid(preparation)) throw new Error("RESOURCE_PREPARATION_INVALID");
      const path = journalFile(root, launchInput);
      let journal = freezeJournal({
        schemaVersion: 1,
        nativeRunId: launchInput.nativeRunId,
        attemptIdentity: attemptIdentityFromLaunch(launchInput),
        preparationDigest: preparation.preparationDigest,
        receipts: Object.freeze([]),
        cleanupPaths: Object.freeze({}),
        ownerMarkers: Object.freeze({}),
      });
      writeJournal(path, journal, true);
      const pendingJournal: PendingJournalPort = Object.freeze({
        record(pending): void {
          journal = freezeJournal({ ...journalWithoutPending(journal), pending });
          writeJournal(path, journal);
        },
        clear(): void {
          journal = freezeJournal(journalWithoutPending(journal));
          writeJournal(path, journal);
        },
      });
      try {
        for (const plan of preparation.resources) {
          const materialized = materializePlan(plan, launchInput, pendingJournal);
          const receipt = materialized.receipt;
          journal = freezeJournal({
            schemaVersion: 1,
            nativeRunId: launchInput.nativeRunId,
            attemptIdentity: journal.attemptIdentity,
            preparationDigest: preparation.preparationDigest,
            receipts: Object.freeze([...journal.receipts, receipt]),
            cleanupPaths: Object.freeze({
              ...journal.cleanupPaths,
              ...(materialized.cleanupPath ? { [receipt.resourceId]: materialized.cleanupPath } : {}),
            }),
            ownerMarkers: Object.freeze({
              ...journal.ownerMarkers,
              ...(materialized.ownerMarker ? { [receipt.resourceId]: materialized.ownerMarker } : {}),
            }),
          });
          writeJournal(path, journal);
        }
        const resources = Object.freeze([...journal.receipts]);
        const receiptDigest = digestValue(resources);
        journal = freezeJournal({
          schemaVersion: 1,
          nativeRunId: launchInput.nativeRunId,
          attemptIdentity: journal.attemptIdentity,
          preparationDigest: preparation.preparationDigest,
          receiptDigest,
          receipts: resources,
          cleanupPaths: journal.cleanupPaths,
          ownerMarkers: journal.ownerMarkers,
        });
        writeJournal(path, journal);
        const materializedSet = Object.freeze({
          preparationDigest: preparation.preparationDigest,
          receiptDigest,
          resources,
        });
        activeJournals.set(materializedSet, path);
        return materializedSet;
      } catch (error) {
        try {
          cleanupJournalResources(path, journal);
          unlinkJournal(path);
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], "RESOURCE_ROLLBACK_FAILED");
        }
        throw new Error("RESOURCE_MATERIALIZATION_FAILED", { cause: error });
      }
    },

    async verifyForArm(preparation, resources): Promise<void> {
      validateResourceSetForArm(preparation, resources);
      const journalPath = activeJournals.get(resources);
      if (!journalPath) throw new Error("RESOURCE_JOURNAL_MISSING");
      const journal = readJournal(journalPath);
      validateJournalBinding(journal, resources);
      for (const [index, plan] of preparation.resources.entries()) {
        const receipt = resources.resources[index];
        if (!receipt) throw new Error("RESOURCE_ARM_VERIFICATION_FAILED");
        verifyResourceForArm(plan, receipt, journal);
      }
    },

    async cleanup(resources): Promise<void> {
      if (completedReceipts.has(resources)) return;
      const path = activeJournals.get(resources);
      if (!path) throw new Error("RESOURCE_JOURNAL_MISSING");
      const journal = readJournal(path);
      validateResourceReceiptDigest(resources);
      validateJournalBinding(journal, resources);
      if (
        journalHasManagedResources(journal) &&
        journal.recoveryOwner !== undefined &&
        !await observerAuthorizesCleanup(journal, input.recoveryObserver)
      ) {
        throw new Error("RESOURCE_PROCESS_ACTIVE");
      }
      cleanupJournalResources(path, journal);
      unlinkJournal(path);
      activeJournals.delete(resources);
      completedReceipts.add(resources);
    },

    async bindRecoveryOwner(resources, owner): Promise<void> {
      const path = activeJournals.get(resources);
      if (!path) throw new Error("RESOURCE_JOURNAL_MISSING");
      const journal = readJournal(path);
      validateJournalBinding(journal, resources);
      const parsedOwner = parseRecoveryOwner(owner);
      if (
        journal.recoveryOwner !== undefined &&
        sameRecoveryOwner(parsedOwner, journal.recoveryOwner)
      ) {
        return;
      }
      if (journal.recoveryOwner !== undefined) {
        throw new Error("RESOURCE_RECOVERY_OWNER_CONFLICT");
      }
      if (digestValue(ownerAttemptIdentity(parsedOwner)) !== digestValue(journal.attemptIdentity)) {
        throw new Error("RESOURCE_RECOVERY_OWNER_INVALID");
      }
      const bound = freezeJournal({ ...journalWithoutPending(journal), recoveryOwner: parsedOwner });
      writeJournal(path, bound);
    },

    async recover(): Promise<NativeResourceRecoveryResult> {
      let recovered = 0;
      let retained = 0;
      for (const name of readdirSync(root)) {
        if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
        const path = resolve(root, name);
        if (!path.startsWith(`${root}${sep}`)) continue;
        try {
          const journal = readJournal(path);
          if (!await observerAuthorizesCleanup(journal, input.recoveryObserver)) {
            retained += 1;
            continue;
          }
          cleanupJournalResources(path, journal);
          unlinkJournal(path);
          recovered += 1;
        } catch {
          retained += 1;
        }
      }
      return Object.freeze({ recovered, retained });
    },
  });
}
