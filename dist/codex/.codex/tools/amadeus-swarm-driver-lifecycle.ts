// Pure lifecycle contract for swarm-driver attempts.
// Stateful persistence, process supervision, and provider parsing live behind ports.

import type {
  NativeMarker,
  NormalizedDriverEvent,
  PreparedUnit,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import type {
  FloorDriver,
  Harness,
  LegacyExecution,
  NativeDriver,
  RedactedDriverRequest,
  RedactedSelection,
} from "./amadeus-swarm-driver-contract.ts";
import {
  canonicalJson,
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
} from "./amadeus-swarm-canonical.ts";
import {
  ATTEMPT_FAILURE_CODE_VALUES,
  parseFinalizeRequestBinding,
} from "./amadeus-swarm-finalize-contract.ts";
import type {
  AttemptFailureCode,
  ExpectedUnitGitBinding,
  FinalizeRequestBinding,
  ProtectedSpecBinding,
} from "./amadeus-swarm-finalize-contract.ts";
import { SelectionOutcomeProjection } from "./amadeus-swarm-driver-contract.ts";
import type { ProcessIdentity } from "./amadeus-armed-process.ts";
import type {
  CaptureCheckpoint,
  NativeDispatchCheckpoint,
  NativeDispatchPreparation,
  PreparedNativeRun,
} from "./amadeus-swarm-native-execution.ts";

export { canonicalJson, digestValue, rejectSecretLikeFields } from "./amadeus-swarm-canonical.ts";
export {
  buildFinalizeRequestBinding,
  buildRefereeFinalizeEnvelope,
  parseFinalizeRequestBinding,
  parseRefereeFinalizeEnvelope,
  validateRefereeEnvelope,
} from "./amadeus-swarm-finalize-contract.ts";
export type {
  AttemptFailureCode,
  CodeMergeOutcome,
  DeclinedUnit,
  ExpectedUnitGitBinding,
  FinalizeRequestBinding,
  ProtectedSpecBinding,
  RefereeFinalizeEnvelope,
  UnitMergeResult,
} from "./amadeus-swarm-finalize-contract.ts";

export const ATTEMPT_LEASE_MS = 30_000;
export const ATTEMPT_HEARTBEAT_MS = 5_000;

export type AttemptState =
  | "probing"
  | "selected"
  | "prepared"
  | "dispatched"
  | "evidence-verified"
  | "referee-running"
  | "succeeded"
  | "failed-resumable"
  | "failed-terminal";

export type AttemptLease = Readonly<{
  leaseId: string;
  fencingToken: number;
  ownerId: string;
  heartbeatAt: string;
  expiresAt: string;
  ownerProcess?: ProcessIdentity;
}>;

export type SelectionInputSnapshot = Readonly<{
  requested: RedactedDriverRequest;
  harness: Harness;
  batch: number;
  expectedUnits: readonly string[];
  topologySignals: readonly unknown[];
}>;

export type SelectedContext = Readonly<{
  selection: RedactedSelection;
  probeDigest: string;
  planDigest: string;
}>;

export type RunGitBindingInput = Readonly<{
  expectedUnits: readonly ExpectedUnitGitBinding[];
  protectedSpec: ProtectedSpecBinding;
  repoIdentityDigest: string;
  mergeTargetBranch: string;
  targetBeforeCommit: string;
}>;

export type RunRequestBinding = Readonly<{
  schemaVersion: 1;
  expectedUnits: readonly ExpectedUnitGitBinding[];
  checkCommandDigest: string;
  protectedSpec: ProtectedSpecBinding;
  repoIdentityDigest: string;
  mergeTargetBranch: string;
  targetBeforeCommit: string;
  evidenceDirDigest: string;
  runBindingDigest: string;
}>;

export type VerifiedExecutionResult =
  | Readonly<{
      kind: "native";
      driver: NativeDriver;
      evidenceDigest: string;
      completedUnits: readonly string[];
    }>
  | Readonly<{
      kind: "floor";
      driver: FloorDriver;
      resultDigest: string;
      completedUnits: readonly string[];
    }>
  | Readonly<{
      kind: "legacy";
      execution: LegacyExecution;
      resultDigest: string;
      completedUnits: readonly string[];
    }>;

export type DispatchCheckpoint =
  | NativeDispatchCheckpoint
  | Readonly<{
      kind: "external";
      executionMode: "floor" | "legacy";
    }>;

type DispatchDigestInput = Readonly<{
  executionId: string;
  attemptId: string;
  manifestDigest: string;
  selection: RedactedSelection;
  runBinding: RunRequestBinding;
  dispatch: DispatchCheckpoint;
}>;

export function buildDispatchDigest(input: DispatchDigestInput): string {
  return digestValue(input);
}

type CheckpointBase = Readonly<{
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  batch: number;
  origin: "initial" | "resumed";
  previousAttemptId?: string;
  nonceHash: string;
  lease: AttemptLease;
  selectionInput: SelectionInputSnapshot;
  unitStates: Readonly<Record<string, "pending" | "dispatched" | "evidence-seen" | "referee-converged" | "failed">>;
  lastMutationId: string;
  stateDigest: string;
}>;

type SelectedBase = CheckpointBase & Readonly<{ selectedContext: SelectedContext }>;

export type AttemptCheckpoint =
  | (CheckpointBase & Readonly<{ state: "probing" }>)
  | (SelectedBase & Readonly<{ state: "selected" }>)
  | (SelectedBase &
      Readonly<{
        state: "prepared";
        preparedUnits: readonly PreparedUnit[];
        worktreeManifestDigest: string;
        runBinding: RunRequestBinding;
        dispatchPreparation?: NativeDispatchPreparation;
        preparedNativeRun?: PreparedNativeRun;
      }>)
  | (SelectedBase &
      Readonly<{
        state: "dispatched";
        preparedUnits: readonly PreparedUnit[];
        worktreeManifestDigest: string;
        dispatchDigest: string;
        dispatch: DispatchCheckpoint;
        runBinding: RunRequestBinding;
        dispatchPreparation?: NativeDispatchPreparation;
        preparedNativeRun?: PreparedNativeRun;
      }>)
  | (SelectedBase &
      Readonly<{
        state: "evidence-verified";
        preparedUnits: readonly PreparedUnit[];
        worktreeManifestDigest: string;
        executionResult: VerifiedExecutionResult;
        runBinding: RunRequestBinding;
      }>)
  | (SelectedBase &
      Readonly<{
        state: "referee-running";
        preparedUnits: readonly PreparedUnit[];
        worktreeManifestDigest: string;
        executionResult: VerifiedExecutionResult;
        finalizeBinding: FinalizeRequestBinding;
        runBinding: RunRequestBinding;
      }>)
  | (SelectedBase &
      Readonly<{
        state: "succeeded";
        preparedUnits: readonly PreparedUnit[];
        worktreeManifestDigest: string;
        executionResult: VerifiedExecutionResult;
        finalizeBinding: FinalizeRequestBinding;
        refereeResultDigest: string;
        runBinding: RunRequestBinding;
      }>)
  | (CheckpointBase & FailureCheckpoint & Readonly<{ state: "failed-resumable" }>)
  | (CheckpointBase & FailureCheckpoint & Readonly<{ state: "failed-terminal" }>);

type FailureCheckpoint = Readonly<{
  failure: Readonly<{
    code: AttemptFailureCode;
    affectedUnits: readonly string[];
    failedFromState: Exclude<AttemptState, "succeeded" | "failed-resumable" | "failed-terminal">;
    recoveryContext?: Readonly<{
      dispatchPreparation: NativeDispatchPreparation;
      preparedNativeRun?: PreparedNativeRun;
      dispatch?: NativeDispatchCheckpoint;
    }>;
  }>;
}>;

export type CheckpointWithoutDigest = AttemptCheckpoint extends infer Checkpoint
  ? Checkpoint extends Readonly<{ stateDigest: string }>
    ? Omit<Checkpoint, "stateDigest">
    : never
  : never;

export type TransitionEdge =
  | "probe-selected"
  | "selected-prepared"
  | "native-dispatch-prepared"
  | "native-resources-prepared"
  | "prepared-dispatched"
  | "capture-bound"
  | "dispatch-evidence-verified"
  | "evidence-referee-running"
  | "referee-succeeded"
  | "attempt-failed"
  | "attempt-resumed";

export type AttemptTransition = Readonly<{
  transitionId: string;
  edge: TransitionEdge;
  executionId: string;
  attemptId: string;
  leaseId: string;
  fencingToken: number;
  preDigest: string;
  post: CheckpointWithoutDigest;
}>;

export type LifecycleError = Readonly<{
  code:
    | "INVALID_ID"
    | "INVALID_BATCH"
    | "INVALID_UNITS"
    | "INVALID_ORIGIN"
    | "INVALID_EDGE"
    | "STALE_WRITER"
    | "DIGEST_MISMATCH"
    | "SCHEMA_INVALID"
    | "SCHEMA_UNKNOWN_FIELD"
    | "SCHEMA_SECRET_FIELD"
    | "EVIDENCE_INVALID"
    | "FINALIZE_BINDING_INVALID";
  field?: string;
}>;

export type LifecycleResult<T> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{ type: "err"; error: LifecycleError }>;

function ok<T>(value: T): LifecycleResult<T> {
  return Object.freeze({ type: "ok", value });
}

function err(code: LifecycleError["code"], field?: string): LifecycleResult<never> {
  return Object.freeze({ type: "err", error: Object.freeze({ code, field }) });
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function canonicalUnits(units: readonly string[]): LifecycleResult<readonly string[]> {
  if (units.length < 2 || units.some((unit) => !nonEmpty(unit))) return err("INVALID_UNITS");
  const sorted = [...units].sort();
  if (new Set(sorted).size !== sorted.length) return err("INVALID_UNITS");
  return ok(Object.freeze(sorted));
}

function freezeCheckpoint<T extends CheckpointWithoutDigest>(checkpoint: T): AttemptCheckpoint {
  const { stateDigest: _ignored, ...semantic } = checkpoint as T & { stateDigest?: string };
  const semanticForDigest = {
    ...semantic,
    lease: {
      ...semantic.lease,
      heartbeatAt: undefined,
      expiresAt: undefined,
    },
  };
  const stateDigest = digestValue(semanticForDigest);
  return Object.freeze({ ...semantic, stateDigest }) as AttemptCheckpoint;
}

export function createProbingCheckpoint(input: Readonly<{
  executionId: string;
  attemptId: string;
  batch: number;
  origin: "initial" | "resumed";
  previousAttemptId?: string;
  nonceHash: string;
  lease: AttemptLease;
  selectionInput: SelectionInputSnapshot;
  mutationId: string;
  reusedConvergedUnits?: readonly string[];
}>): LifecycleResult<AttemptCheckpoint> {
  if (![input.executionId, input.attemptId, input.nonceHash, input.mutationId].every(nonEmpty)) {
    return err("INVALID_ID");
  }
  if (!Number.isInteger(input.batch) || input.batch < 1) return err("INVALID_BATCH");
  if (
    (input.origin === "initial" && input.previousAttemptId !== undefined) ||
    (input.origin === "resumed" && !nonEmpty(input.previousAttemptId))
  ) {
    return err("INVALID_ORIGIN");
  }
  const units = canonicalUnits(input.selectionInput.expectedUnits);
  if (units.type === "err") return units;
  const reused = new Set(input.reusedConvergedUnits ?? []);
  if ([...reused].some((unit) => !units.value.includes(unit))) return err("INVALID_UNITS");
  const unitStates = Object.freeze(
    Object.fromEntries(units.value.map((unit) => [unit, reused.has(unit) ? "referee-converged" : "pending"])),
  ) as AttemptCheckpoint["unitStates"];
  return ok(
    freezeCheckpoint({
      schemaVersion: 1,
      state: "probing",
      executionId: input.executionId,
      attemptId: input.attemptId,
      batch: input.batch,
      origin: input.origin,
      ...(input.previousAttemptId ? { previousAttemptId: input.previousAttemptId } : {}),
      nonceHash: input.nonceHash,
      lease: Object.freeze({ ...input.lease }),
      selectionInput: Object.freeze({ ...input.selectionInput, expectedUnits: units.value }),
      unitStates,
      lastMutationId: input.mutationId,
    }),
  );
}

const EDGE_STATES = Object.freeze({
  "probe-selected": Object.freeze(["probing", "selected"]),
  "selected-prepared": Object.freeze(["selected", "prepared"]),
  "native-dispatch-prepared": Object.freeze(["prepared", "prepared"]),
  "native-resources-prepared": Object.freeze(["prepared", "prepared"]),
  "prepared-dispatched": Object.freeze(["prepared", "dispatched"]),
  "capture-bound": Object.freeze(["dispatched", "dispatched"]),
  "dispatch-evidence-verified": Object.freeze(["dispatched", "evidence-verified"]),
  "evidence-referee-running": Object.freeze(["evidence-verified", "referee-running"]),
  "referee-succeeded": Object.freeze(["referee-running", "succeeded"]),
  "attempt-failed": Object.freeze([
    "probing",
    "selected",
    "prepared",
    "dispatched",
    "evidence-verified",
    "referee-running",
    "failed-resumable",
    "failed-terminal",
  ]),
  "attempt-resumed": Object.freeze(["failed-resumable", "probing"]),
}) as Readonly<Record<TransitionEdge, readonly AttemptState[]>>;

function edgeAllows(edge: TransitionEdge, from: AttemptState, to: AttemptState): boolean {
  if (edge === "attempt-failed") {
    return (
      !["succeeded", "failed-resumable", "failed-terminal"].includes(from) &&
      (to === "failed-resumable" || to === "failed-terminal")
    );
  }
  const states = EDGE_STATES[edge];
  return states[0] === from && states[1] === to;
}

export function buildTransition(
  checkpoint: AttemptCheckpoint,
  input: Omit<AttemptTransition, "preDigest" | "post"> & {
    post: CheckpointWithoutDigest;
  },
): LifecycleResult<AttemptTransition> {
  if (!nonEmpty(input.transitionId)) return err("INVALID_ID");
  if (!edgeAllows(input.edge, checkpoint.state, input.post.state)) return err("INVALID_EDGE");
  if (
    checkpoint.executionId !== input.executionId ||
    checkpoint.attemptId !== input.attemptId ||
    checkpoint.lease.leaseId !== input.leaseId ||
    checkpoint.lease.fencingToken !== input.fencingToken
  ) {
    return err("STALE_WRITER");
  }
  return ok(
    Object.freeze({
      ...input,
      preDigest: checkpoint.stateDigest,
      post: Object.freeze({ ...input.post, stateDigest: undefined, lastMutationId: input.transitionId }),
    }),
  );
}

export function applyTransition(
  checkpoint: AttemptCheckpoint,
  transition: AttemptTransition,
): LifecycleResult<AttemptCheckpoint> {
  if (checkpoint.stateDigest !== transition.preDigest) return err("DIGEST_MISMATCH");
  if (
    checkpoint.executionId !== transition.executionId ||
    checkpoint.attemptId !== transition.attemptId ||
    checkpoint.lease.leaseId !== transition.leaseId ||
    checkpoint.lease.fencingToken !== transition.fencingToken
  ) {
    return err("STALE_WRITER");
  }
  if (!edgeAllows(transition.edge, checkpoint.state, transition.post.state)) return err("INVALID_EDGE");
  const next = freezeCheckpoint(transition.post);
  const parsed = parseAttemptCheckpoint(next);
  return parsed.type === "ok" ? ok(parsed.value) : parsed;
}

export type EvidenceVerdict = Readonly<{
  ok: boolean;
  code:
    | "VERIFIED"
    | "CORRELATION_MISMATCH"
    | "SOURCE_MISSING"
    | "EVIDENCE_POLICY_INVALID"
    | "UNIT_BIJECTION_INVALID"
    | "CHILD_FAILED";
  completedUnits: readonly string[];
  sources: readonly string[];
  evidenceDigest: string;
}>;

const REQUIRED_SOURCES: Readonly<Record<NativeDriver, readonly string[]>> = Object.freeze({
  "claude-agent-teams": Object.freeze(["provider-state", "stream"]),
  "claude-ultracode": Object.freeze(["provider-state", "stream"]),
  "codex-ultra": Object.freeze(["model-handshake", "stream", "hook"]),
  "kiro-subagent": Object.freeze(["session-metadata", "stream"]),
});

type EvidencePolicy = Readonly<{
  modeIdentifier: string;
  markers: readonly NativeMarker[];
}>;

const EVIDENCE_POLICY: Readonly<Record<NativeDriver, EvidencePolicy>> = Object.freeze({
  "claude-agent-teams": Object.freeze({
    modeIdentifier: "agent-teams",
    markers: Object.freeze(["claude-team-membership", "claude-shared-task"] as const),
  }),
  "claude-ultracode": Object.freeze({
    modeIdentifier: "ultracode",
    markers: Object.freeze(["claude-workflow"] as const),
  }),
  "codex-ultra": Object.freeze({
    modeIdentifier: "codex-ultra",
    markers: Object.freeze(["codex-subagent-hook"] as const),
  }),
  "kiro-subagent": Object.freeze({
    modeIdentifier: "kiro-subagent",
    markers: Object.freeze(["kiro-parent-child-session"] as const),
  }),
});

function evidenceFailure(
  code: EvidenceVerdict["code"],
  events: readonly NormalizedDriverEvent[],
): EvidenceVerdict {
  return Object.freeze({
    ok: false,
    code,
    completedUnits: Object.freeze([]),
    sources: Object.freeze([...new Set(events.map((event) => event.source))].sort()),
    evidenceDigest: digestValue(events),
  });
}

type EvidenceInput = Readonly<{
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  nonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  nativeRunId: string;
  expectedUnits: readonly string[];
  events: readonly NormalizedDriverEvent[];
}>;

function evidenceCorrelationMatches(input: EvidenceInput): boolean {
  return input.events.every(
    (event) =>
      event.driver === input.driver &&
      event.executionId === input.executionId &&
      event.attemptId === input.attemptId &&
      event.attemptNonceHash === input.nonceHash &&
      event.planDigest === input.planDigest &&
      event.waveIndex === input.waveIndex &&
      event.waveDigest === input.waveDigest &&
      event.nativeRunId === input.nativeRunId,
  );
}

function hasExactUnitBijection(expectedUnits: readonly string[], events: readonly NormalizedDriverEvent[]): boolean {
  const stateBindings = events.filter((event) => event.kind === "native-state-observed").flatMap((event) => event.bindings);
  const started = events.filter((event) => event.kind === "native-child-started");
  const stopped = events.filter((event) => event.kind === "native-child-stopped");
  const bindingUnits = [...new Set(stateBindings.map((binding) => binding.unit))].sort();
  const startedUnits = [...new Set(started.map((event) => event.unit))].sort();
  const stoppedUnits = [...new Set(stopped.map((event) => event.unit))].sort();
  const bindingByUnit = new Map(stateBindings.map(({ unit, childId }) => [unit, childId]));
  return (
    stateBindings.length === expectedUnits.length &&
    new Set(stateBindings.map((binding) => binding.childId)).size === expectedUnits.length &&
    canonicalJson(bindingUnits) === canonicalJson(expectedUnits) &&
    canonicalJson(startedUnits) === canonicalJson(expectedUnits) &&
    canonicalJson(stoppedUnits) === canonicalJson(expectedUnits) &&
    started.length === expectedUnits.length &&
    stopped.length === expectedUnits.length &&
    started.every((event) => bindingByUnit.get(event.unit) === event.childId) &&
    stopped.every((event) => bindingByUnit.get(event.unit) === event.childId)
  );
}

function evidenceLifecycleMatches(input: EvidenceInput): boolean {
  const policy = EVIDENCE_POLICY[input.driver];
  const mode = input.events.filter((event) => event.kind === "mode-confirmed");
  const coordinatorStarted = input.events.filter((event) => event.kind === "coordinator-started");
  const coordinatorStopped = input.events.filter((event) => event.kind === "coordinator-stopped");
  const snapshots = input.events.filter((event) => event.kind === "native-state-observed");
  const markers = input.events
    .filter((event) => event.kind === "native-coordination")
    .map((event) => event.marker)
    .sort();
  const requiredMarkers = [...policy.markers].sort();
  return (
    mode.length === 1 &&
    mode[0].modeIdentifier === policy.modeIdentifier &&
    coordinatorStarted.length === 1 &&
    coordinatorStopped.length === 1 &&
    coordinatorStarted[0].coordinatorId.length > 0 &&
    coordinatorStarted[0].coordinatorId === coordinatorStopped[0].coordinatorId &&
    coordinatorStopped[0].exitCode === 0 &&
    snapshots.length === 1 &&
    canonicalJson(markers) === canonicalJson(requiredMarkers)
  );
}

export function verifyNativeEvidence(input: EvidenceInput): EvidenceVerdict {
  const units = canonicalUnits(input.expectedUnits);
  if (units.type === "err") return evidenceFailure("UNIT_BIJECTION_INVALID", input.events);
  if (!evidenceCorrelationMatches(input)) {
    return evidenceFailure("CORRELATION_MISMATCH", input.events);
  }
  const sources = [...new Set(input.events.map((event) => event.source))].sort();
  if (REQUIRED_SOURCES[input.driver].some((source) => !sources.includes(source as never))) {
    return evidenceFailure("SOURCE_MISSING", input.events);
  }
  if (!evidenceLifecycleMatches(input)) {
    return evidenceFailure("EVIDENCE_POLICY_INVALID", input.events);
  }
  const stopped = input.events.filter((event) => event.kind === "native-child-stopped");
  if (stopped.some((event) => event.outcome !== "completed")) return evidenceFailure("CHILD_FAILED", input.events);
  if (!hasExactUnitBijection(units.value, input.events)) {
    return evidenceFailure("UNIT_BIJECTION_INVALID", input.events);
  }
  return Object.freeze({
    ok: true,
    code: "VERIFIED",
    completedUnits: units.value,
    sources: Object.freeze(sources),
    evidenceDigest: digestValue(input.events),
  });
}

export function canonicalPreparedUnits(units: readonly PreparedUnit[]): LifecycleResult<readonly PreparedUnit[]> {
  if (
    !Array.isArray(units) ||
    units.some(
      (unit) =>
        !hasExactKeys(unit, ["unit", "worktreePath", "branchName"]) ||
        !nonEmptyString(unit.unit) ||
        !nonEmptyString(unit.worktreePath) ||
        !nonEmptyString(unit.branchName),
    )
  ) {
    return err("SCHEMA_INVALID", "preparedUnits");
  }
  const names = canonicalUnits(units.map((unit) => unit.unit));
  if (names.type === "err") return names;
  const byName = new Map(units.map((unit) => [unit.unit, unit]));
  return ok(Object.freeze(names.value.map((unit) => Object.freeze({ ...byName.get(unit)! }))));
}

function protectedSpecIsValid(value: ProtectedSpecBinding, expectedBase: string, target: string): boolean {
  if (hasExactKeys(value, ["kind"]) && value.kind === "none") return true;
  return (
    hasExactKeys(value, [
      "kind",
      "confinedRelativePath",
      "baselineCommit",
      "targetAtFinalizeCommit",
      "baselineBlobDigest",
    ]) &&
    value.kind === "file" &&
    [
      value.confinedRelativePath,
      value.baselineCommit,
      value.targetAtFinalizeCommit,
      value.baselineBlobDigest,
    ].every(nonEmptyString) &&
    value.baselineCommit === expectedBase &&
    value.targetAtFinalizeCommit === target
  );
}

function runGitBindingInputIsValid(value: unknown): value is RunGitBindingInput {
  if (
    !hasExactKeys(value, [
      "expectedUnits",
      "protectedSpec",
      "repoIdentityDigest",
      "mergeTargetBranch",
      "targetBeforeCommit",
    ])
  ) {
    return false;
  }
  return (
    Array.isArray(value.expectedUnits) &&
    [value.repoIdentityDigest, value.mergeTargetBranch, value.targetBeforeCommit].every(nonEmptyString)
  );
}

function runExpectedUnitIsValid(value: unknown): value is ExpectedUnitGitBinding {
  return (
    hasExactKeys(value, ["unit", "worktreePathDigest", "baseCommit", "headCommit"]) &&
    [value.unit, value.worktreePathDigest, value.baseCommit, value.headCommit].every(nonEmptyString)
  );
}

function canonicalRunExpectedUnits(
  value: readonly ExpectedUnitGitBinding[],
  expectedCount: number,
): LifecycleResult<readonly ExpectedUnitGitBinding[]> {
  const expected = [...value].sort((a, b) => a.unit.localeCompare(b.unit));
  if (
    expected.length !== expectedCount ||
    expected.some((entry) => !runExpectedUnitIsValid(entry)) ||
    new Set(expected.map((entry) => entry.unit)).size !== expected.length ||
    new Set(expected.map((entry) => entry.baseCommit)).size !== 1
  ) {
    return err("SCHEMA_INVALID", "runBinding.expectedUnits");
  }
  return ok(Object.freeze(expected.map((entry) => Object.freeze({ ...entry }))));
}

function preparedBindingsMatch(
  expected: readonly ExpectedUnitGitBinding[],
  prepared: readonly PreparedUnit[],
): boolean {
  return expected.every(
    (entry, index) =>
      entry.unit === prepared[index].unit &&
      entry.worktreePathDigest === digestValue(prepared[index].worktreePath),
  );
}

function protectedSpecPathMatches(
  spec: ProtectedSpecBinding,
  protectedSpecPath: string | undefined,
): boolean {
  if (spec.kind === "none") return protectedSpecPath === undefined;
  return spec.confinedRelativePath === protectedSpecPath;
}

export function buildRunRequestBinding(input: Readonly<{
  preparedUnits: readonly PreparedUnit[];
  gitBinding: RunGitBindingInput;
  convergenceCommand: string;
  protectedSpecPath?: string;
  evidenceDir: string;
}>): LifecycleResult<RunRequestBinding> {
  const prepared = canonicalPreparedUnits(input.preparedUnits);
  if (prepared.type === "err") return prepared;
  if (!runGitBindingInputIsValid(input.gitBinding)) {
    return err("SCHEMA_INVALID", "runBinding");
  }
  if (!nonEmptyString(input.convergenceCommand) || !nonEmptyString(input.evidenceDir)) {
    return err("SCHEMA_INVALID", "runBinding");
  }
  const expected = canonicalRunExpectedUnits(input.gitBinding.expectedUnits, prepared.value.length);
  if (expected.type === "err") return expected;
  if (!preparedBindingsMatch(expected.value, prepared.value)) {
    return err("FINALIZE_BINDING_INVALID", "runBinding.expectedUnits");
  }
  if (
    !protectedSpecIsValid(
      input.gitBinding.protectedSpec,
      expected.value[0].baseCommit,
      input.gitBinding.targetBeforeCommit,
    )
  ) {
    return err("FINALIZE_BINDING_INVALID", "runBinding.protectedSpec");
  }
  if (!protectedSpecPathMatches(input.gitBinding.protectedSpec, input.protectedSpecPath)) {
    return err("FINALIZE_BINDING_INVALID", "protectedSpecPath");
  }
  const semantic = Object.freeze({
    schemaVersion: 1 as const,
    expectedUnits: expected.value,
    checkCommandDigest: digestValue(input.convergenceCommand),
    protectedSpec: Object.freeze({ ...input.gitBinding.protectedSpec }),
    repoIdentityDigest: input.gitBinding.repoIdentityDigest,
    mergeTargetBranch: input.gitBinding.mergeTargetBranch,
    targetBeforeCommit: input.gitBinding.targetBeforeCommit,
    evidenceDirDigest: digestValue(input.evidenceDir),
  });
  return ok(Object.freeze({ ...semantic, runBindingDigest: digestValue(semantic) }));
}

const CHECKPOINT_BASE_KEYS = Object.freeze([
  "schemaVersion",
  "state",
  "executionId",
  "attemptId",
  "batch",
  "origin",
  "nonceHash",
  "lease",
  "selectionInput",
  "unitStates",
  "lastMutationId",
  "stateDigest",
]);

const CHECKPOINT_STATE_KEYS: Readonly<Record<AttemptState, readonly string[]>> = Object.freeze({
  probing: Object.freeze([]),
  selected: Object.freeze(["selectedContext"]),
  prepared: Object.freeze(["selectedContext", "preparedUnits", "worktreeManifestDigest", "runBinding"]),
  dispatched: Object.freeze([
    "selectedContext",
    "preparedUnits",
    "worktreeManifestDigest",
    "dispatchDigest",
    "dispatch",
    "runBinding",
  ]),
  "evidence-verified": Object.freeze([
    "selectedContext",
    "preparedUnits",
    "worktreeManifestDigest",
    "executionResult",
    "runBinding",
  ]),
  "referee-running": Object.freeze([
    "selectedContext",
    "preparedUnits",
    "worktreeManifestDigest",
    "executionResult",
    "finalizeBinding",
    "runBinding",
  ]),
  succeeded: Object.freeze([
    "selectedContext",
    "preparedUnits",
    "worktreeManifestDigest",
    "executionResult",
    "finalizeBinding",
    "refereeResultDigest",
    "runBinding",
  ]),
  "failed-resumable": Object.freeze(["failure"]),
  "failed-terminal": Object.freeze(["failure"]),
});

function leaseOwnerProcessIsValid(value: unknown): value is ProcessIdentity {
  if (!hasExactKeys(value, ["platform", "pid", "processGroupId", "startTokenHash"])) return false;
  return (
    (value.platform === "darwin" || value.platform === "linux") &&
    Number.isInteger(value.pid) &&
    Number(value.pid) > 0 &&
    Number.isInteger(value.processGroupId) &&
    Number(value.processGroupId) > 0 &&
    nonEmptyString(value.startTokenHash)
  );
}

function leaseIsValid(value: unknown): value is AttemptLease {
  if (!isRecord(value)) return false;
  if (
    !hasExactKeys(value, [
      "leaseId",
      "fencingToken",
      "ownerId",
      "heartbeatAt",
      "expiresAt",
      ...(value.ownerProcess === undefined ? [] : ["ownerProcess"]),
    ])
  ) {
    return false;
  }
  if (![value.leaseId, value.ownerId, value.heartbeatAt, value.expiresAt].every(nonEmptyString)) return false;
  if (!Number.isInteger(value.fencingToken) || Number(value.fencingToken) < 1) return false;
  if (Number.isNaN(Date.parse(String(value.heartbeatAt)))) return false;
  if (Number.isNaN(Date.parse(String(value.expiresAt)))) return false;
  return value.ownerProcess === undefined || leaseOwnerProcessIsValid(value.ownerProcess);
}

function selectionInputIsValid(value: unknown, batch: number): value is SelectionInputSnapshot {
  if (
    !hasExactKeys(value, ["requested", "harness", "batch", "expectedUnits", "topologySignals"]) ||
    value.batch !== batch ||
    !isRecord(value.requested) ||
    !Array.isArray(value.expectedUnits) ||
    !Array.isArray(value.topologySignals)
  ) {
    return false;
  }
  return canonicalUnits(value.expectedUnits as string[]).type === "ok";
}

function selectedContextIsValid(value: unknown): value is SelectedContext {
  return (
    hasExactKeys(value, ["selection", "probeDigest", "planDigest"]) &&
    nonEmptyString(value.probeDigest) &&
    nonEmptyString(value.planDigest) &&
    SelectionOutcomeProjection.parse(value.selection).type === "ok"
  );
}

function runBindingIsValid(value: unknown, preparedUnits: readonly PreparedUnit[]): value is RunRequestBinding {
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "expectedUnits",
      "checkCommandDigest",
      "protectedSpec",
      "repoIdentityDigest",
      "mergeTargetBranch",
      "targetBeforeCommit",
      "evidenceDirDigest",
      "runBindingDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.expectedUnits) ||
    ![
      value.checkCommandDigest,
      value.repoIdentityDigest,
      value.mergeTargetBranch,
      value.targetBeforeCommit,
      value.evidenceDirDigest,
      value.runBindingDigest,
    ].every(nonEmptyString)
  ) {
    return false;
  }
  const { runBindingDigest, ...semantic } = value;
  if (digestValue(semantic) !== runBindingDigest) return false;
  const expected = value.expectedUnits as unknown[];
  if (
    expected.length !== preparedUnits.length ||
    expected.some(
      (entry) =>
        !hasExactKeys(entry, ["unit", "worktreePathDigest", "baseCommit", "headCommit"]) ||
        ![entry.unit, entry.worktreePathDigest, entry.baseCommit, entry.headCommit].every(nonEmptyString),
    )
  ) {
    return false;
  }
  const prepared = [...preparedUnits].sort((a, b) => a.unit.localeCompare(b.unit));
  const gitUnits = [...(expected as unknown as ExpectedUnitGitBinding[])].sort((a, b) => a.unit.localeCompare(b.unit));
  return gitUnits.every(
    (entry, index) =>
      entry.unit === prepared[index].unit && entry.worktreePathDigest === digestValue(prepared[index].worktreePath),
  );
}

function executionResultIsValid(value: unknown): value is VerifiedExecutionResult {
  if (!isRecord(value) || !nonEmptyString(value.kind) || !Array.isArray(value.completedUnits)) return false;
  const units = canonicalUnits(value.completedUnits as string[]);
  if (units.type === "err") return false;
  if (value.kind === "native") {
    return hasExactKeys(value, ["kind", "driver", "evidenceDigest", "completedUnits"]) && nonEmptyString(value.evidenceDigest);
  }
  if (value.kind === "floor") {
    return hasExactKeys(value, ["kind", "driver", "resultDigest", "completedUnits"]) && nonEmptyString(value.resultDigest);
  }
  return (
    value.kind === "legacy" &&
    hasExactKeys(value, ["kind", "execution", "resultDigest", "completedUnits"]) &&
    nonEmptyString(value.resultDigest)
  );
}

function captureBindingIsValid(value: unknown, expectedKind: string): boolean {
  if (!isRecord(value) || value.kind !== expectedKind) return false;
  const sourceField = expectedKind === "fixed-provider-path" ? "sourcePlanDigest" : "sourceEventDigest";
  const sourceResourceKeys = expectedKind === "fixed-provider-path" ? ["sourceResourceIds"] : [];
  if (
    !hasExactKeys(value, ["kind", "nativeRunId", ...sourceResourceKeys, "exactPathDigest", sourceField]) ||
    !nonEmptyString(value.nativeRunId) ||
    !nonEmptyString(value.exactPathDigest) ||
    !nonEmptyString(value[sourceField])
  ) return false;
  return expectedKind !== "fixed-provider-path" ||
    (Array.isArray(value.sourceResourceIds) &&
      value.sourceResourceIds.length > 0 &&
      (value.sourceResourceIds as unknown[]).every(nonEmptyString));
}

function captureCheckpointIsValid(value: unknown): boolean {
  if (!isRecord(value) || !["fixed-provider-path", "event-bound-provider-path", "hook-only"].includes(String(value.kind))) {
    return false;
  }
  const hasBinding = value.binding !== undefined;
  const keys = [
    "kind",
    "identityDigest",
    "capturePlanDigest",
    "resourcesDigest",
    "transport",
    ...(hasBinding ? ["binding"] : []),
  ];
  if (
    !hasExactKeys(value, keys) ||
    ![value.identityDigest, value.capturePlanDigest, value.resourcesDigest].every(nonEmptyString) ||
    (value.transport !== "stdio-json" && value.transport !== "pty-interactive")
  ) {
    return false;
  }
  if (value.kind === "fixed-provider-path") {
    return hasBinding && captureBindingIsValid(value.binding, value.kind);
  }
  if (value.kind === "event-bound-provider-path") {
    return !hasBinding || captureBindingIsValid(value.binding, value.kind);
  }
  return !hasBinding;
}

function dispatchPreparationIsValid(value: unknown): value is NativeDispatchPreparation {
  return (
    hasExactKeys(value, [
      "kind",
      "nativeRunId",
      "waveIndex",
      "waveDigest",
      "resourcePreparationDigest",
      "captureIdentityDigest",
      "identityRelativePath",
      "armRelativePath",
      "armDigest",
    ]) &&
    value.kind === "native" &&
    Number.isInteger(value.waveIndex) &&
    Number(value.waveIndex) >= 0 &&
    [
      value.nativeRunId,
      value.waveDigest,
      value.resourcePreparationDigest,
      value.captureIdentityDigest,
      value.identityRelativePath,
      value.armRelativePath,
      value.armDigest,
    ].every(nonEmptyString) &&
    relativeCheckpointPathIsValid(String(value.identityRelativePath)) &&
    relativeCheckpointPathIsValid(String(value.armRelativePath)) &&
    value.identityRelativePath !== value.armRelativePath
  );
}

function relativeCheckpointPathIsValid(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(path) &&
    !path.split(/[\\/]/).includes("..")
  );
}

function preparedNativeRunIsValid(value: unknown): value is PreparedNativeRun {
  return (
    hasExactKeys(value, [
      "kind",
      "dispatchPreparationDigest",
      "resourceReceiptDigest",
      "executionPlanDigest",
      "capturePlanDigest",
      "transportKind",
      "captureKind",
    ]) &&
    value.kind === "native" &&
    [
      value.dispatchPreparationDigest,
      value.resourceReceiptDigest,
      value.executionPlanDigest,
      value.capturePlanDigest,
    ].every(nonEmptyString) &&
    (value.transportKind === "stdio-json" || value.transportKind === "pty-interactive") &&
    ["fixed-provider-path", "event-bound-provider-path", "hook-only"].includes(String(value.captureKind))
  );
}

function dispatchCheckpointIsValid(value: unknown): value is DispatchCheckpoint {
  if (!isRecord(value)) return false;
  if (value.kind === "external") {
    return (
      hasExactKeys(value, ["kind", "executionMode"]) &&
      (value.executionMode === "floor" || value.executionMode === "legacy")
    );
  }
  return (
    value.kind === "native" &&
    hasExactKeys(value, [
      "kind",
      "nativeRunId",
      "preparedNativeRunDigest",
      "resourceReceiptDigest",
      "processIdentityDigest",
      "armDigest",
      "capture",
    ]) &&
    [
      value.nativeRunId,
      value.preparedNativeRunDigest,
      value.resourceReceiptDigest,
      value.processIdentityDigest,
      value.armDigest,
    ].every(nonEmptyString) &&
    captureCheckpointIsValid(value.capture) &&
    (value.capture as CaptureCheckpoint).resourcesDigest === value.resourceReceiptDigest &&
    (!(value.capture as CaptureCheckpoint & { binding?: { nativeRunId: string } }).binding ||
      (value.capture as CaptureCheckpoint & { binding: { nativeRunId: string } }).binding.nativeRunId === value.nativeRunId)
  );
}

function checkpointBaseIsValid(value: Record<string, unknown>, state: AttemptState): boolean {
  const nativePreparationKeys = ["prepared", "dispatched"].includes(state)
    ? [
        ...(value.dispatchPreparation === undefined ? [] : ["dispatchPreparation"]),
        ...(value.preparedNativeRun === undefined ? [] : ["preparedNativeRun"]),
      ]
    : [];
  const expectedKeys = [
    ...CHECKPOINT_BASE_KEYS,
    ...(value.previousAttemptId === undefined ? [] : ["previousAttemptId"]),
    ...CHECKPOINT_STATE_KEYS[state],
    ...nativePreparationKeys,
  ];
  if (!hasExactKeys(value, expectedKeys) || value.schemaVersion !== 1) return false;
  if (![value.executionId, value.attemptId, value.nonceHash, value.lastMutationId, value.stateDigest].every(nonEmptyString)) {
    return false;
  }
  if (!Number.isInteger(value.batch) || Number(value.batch) < 1) return false;
  if (!leaseIsValid(value.lease)) return false;
  if (!selectionInputIsValid(value.selectionInput, Number(value.batch))) return false;
  return isRecord(value.unitStates);
}

function checkpointUnitsAndOriginAreValid(value: Record<string, unknown>): boolean {
  const selectionInput = value.selectionInput as unknown as SelectionInputSnapshot;
  const unitStates = value.unitStates as Record<string, unknown>;
  if (Object.keys(unitStates).sort().join("\0") !== [...selectionInput.expectedUnits].sort().join("\0")) return false;
  if (
    Object.values(unitStates).some(
      (unitState) =>
        !["pending", "dispatched", "evidence-seen", "referee-converged", "failed"].includes(
          String(unitState),
        ),
    )
  ) {
    return false;
  }
  if (value.origin === "initial") return value.previousAttemptId === undefined;
  return value.origin === "resumed" && nonEmptyString(value.previousAttemptId);
}

function stateNeedsSelection(state: AttemptState): boolean {
  return !["probing", "failed-resumable", "failed-terminal"].includes(state);
}

function stateNeedsPrepared(state: AttemptState): boolean {
  return ["prepared", "dispatched", "evidence-verified", "referee-running", "succeeded"].includes(state);
}

function stateNeedsExecutionResult(state: AttemptState): boolean {
  return ["evidence-verified", "referee-running", "succeeded"].includes(state);
}

function preparedCheckpointFieldsAreValid(value: Record<string, unknown>): boolean {
  const prepared = canonicalPreparedUnits(value.preparedUnits as PreparedUnit[]);
  return (
    prepared.type === "ok" &&
    nonEmptyString(value.worktreeManifestDigest) &&
    value.worktreeManifestDigest === digestValue(prepared.value) &&
    runBindingIsValid(value.runBinding, prepared.value)
  );
}

function recoveryContextIsValid(value: unknown): boolean {
  if (!isRecord(value) || !dispatchPreparationIsValid(value.dispatchPreparation)) return false;
  const hasPrepared = value.preparedNativeRun !== undefined;
  const hasDispatch = value.dispatch !== undefined;
  if (!hasExactKeys(value, ["dispatchPreparation", ...(hasPrepared ? ["preparedNativeRun"] : []), ...(hasDispatch ? ["dispatch"] : [])])) {
    return false;
  }
  if (hasPrepared && !preparedNativeRunIsValid(value.preparedNativeRun)) return false;
  if (hasPrepared && (value.preparedNativeRun as PreparedNativeRun).dispatchPreparationDigest !== digestValue(value.dispatchPreparation)) {
    return false;
  }
  if (!hasDispatch) return true;
  if (!hasPrepared || !dispatchCheckpointIsValid(value.dispatch)) return false;
  return (value.dispatch as NativeDispatchCheckpoint).preparedNativeRunDigest === digestValue(value.preparedNativeRun);
}

function failureIsValid(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const hasRecovery = value.recoveryContext !== undefined;
  if (!hasExactKeys(value, ["code", "affectedUnits", "failedFromState", ...(hasRecovery ? ["recoveryContext"] : [])])) {
    return false;
  }
  return (
    ATTEMPT_FAILURE_CODE_VALUES.includes(value.code as AttemptFailureCode) &&
    Array.isArray(value.affectedUnits) &&
    ["probing", "selected", "prepared", "dispatched", "evidence-verified", "referee-running"].includes(
      String(value.failedFromState),
    ) &&
    (!hasRecovery || recoveryContextIsValid(value.recoveryContext))
  );
}

function finalizeBindingForStateIsValid(value: Record<string, unknown>, state: AttemptState): boolean {
  if (state !== "referee-running" && state !== "succeeded") return true;
  return parseFinalizeRequestBinding(value.finalizeBinding).type === "ok";
}

function failureForStateIsValid(value: Record<string, unknown>, state: AttemptState): boolean {
  if (state !== "failed-resumable" && state !== "failed-terminal") return true;
  return failureIsValid(value.failure);
}

function checkpointStateFieldError(value: Record<string, unknown>, state: AttemptState): string | undefined {
  if (stateNeedsSelection(state) && !selectedContextIsValid(value.selectedContext)) return "selectedContext";
  if (stateNeedsPrepared(state) && !preparedCheckpointFieldsAreValid(value)) return "preparedUnits";
  if (!nativePreparationForStateIsValid(value, state)) return "dispatchPreparation";
  const dispatchError = dispatchStateFieldError(value, state);
  if (dispatchError) return dispatchError;
  if (stateNeedsExecutionResult(state) && !executionResultIsValid(value.executionResult)) return "executionResult";
  if (!finalizeBindingForStateIsValid(value, state)) return "finalizeBinding";
  if (state === "succeeded" && !nonEmptyString(value.refereeResultDigest)) return "refereeResultDigest";
  if (!failureForStateIsValid(value, state)) return "failure";
  return undefined;
}

function dispatchStateFieldError(
  value: Record<string, unknown>,
  state: AttemptState,
): "dispatch" | "dispatchDigest" | undefined {
  if (state !== "dispatched") return undefined;
  if (!nonEmptyString(value.dispatchDigest)) return "dispatchDigest";
  if (!dispatchCheckpointIsValid(value.dispatch)) return "dispatch";
  if (!nativePreparationForStateIsValid(value, state)) return "dispatch";
  const expected = buildDispatchDigest({
    executionId: String(value.executionId),
    attemptId: String(value.attemptId),
    manifestDigest: String(value.worktreeManifestDigest),
    selection: (value.selectedContext as SelectedContext).selection,
    runBinding: value.runBinding as RunRequestBinding,
    dispatch: value.dispatch,
  });
  return value.dispatchDigest === expected ? undefined : "dispatchDigest";
}

function nativePreparationForStateIsValid(
  value: Record<string, unknown>,
  state: AttemptState,
): boolean {
  if (state !== "prepared" && state !== "dispatched") return true;
  const selection = (value.selectedContext as SelectedContext).selection;
  const preparation = value.dispatchPreparation;
  const prepared = value.preparedNativeRun;
  if (selection.kind !== "native-selection") {
    return preparation === undefined && prepared === undefined;
  }
  return nativePreparationValuesAreValid(value, state, preparation, prepared);
}

function nativePreparationValuesAreValid(
  value: Record<string, unknown>,
  state: "prepared" | "dispatched",
  preparation: unknown,
  prepared: unknown,
): boolean {
  if (preparation === undefined) return state === "prepared" && prepared === undefined;
  if (!dispatchPreparationIsValid(preparation)) return false;
  const expectedIdentity = digestValue({
    executionId: value.executionId,
    attemptId: value.attemptId,
    attemptNonceHash: value.nonceHash,
    planDigest: (value.selectedContext as SelectedContext).planDigest,
    waveIndex: preparation.waveIndex,
    waveDigest: preparation.waveDigest,
  });
  const expectedWaveDigest = digestValue({
    index: preparation.waveIndex,
    units: (value.selectionInput as SelectionInputSnapshot).expectedUnits,
  });
  if (preparation.captureIdentityDigest !== expectedIdentity || preparation.waveDigest !== expectedWaveDigest) {
    return false;
  }
  if (prepared !== undefined) {
    if (!preparedNativeRunIsValid(prepared)) return false;
    if (prepared.dispatchPreparationDigest !== digestValue(preparation)) return false;
  }
  if (state === "prepared") return true;
  if (prepared === undefined || !dispatchCheckpointIsValid(value.dispatch)) return false;
  const dispatch = value.dispatch as DispatchCheckpoint;
  return dispatch.kind === "native" && nativeDispatchBindingsMatch(preparation, prepared, dispatch);
}

function nativeDispatchBindingsMatch(
  preparation: NativeDispatchPreparation,
  prepared: PreparedNativeRun,
  dispatch: NativeDispatchCheckpoint,
): boolean {
  if (
    dispatch.nativeRunId !== preparation.nativeRunId ||
    dispatch.armDigest !== preparation.armDigest ||
    dispatch.preparedNativeRunDigest !== digestValue(prepared) ||
    dispatch.resourceReceiptDigest !== prepared.resourceReceiptDigest ||
    dispatch.capture.identityDigest !== preparation.captureIdentityDigest ||
    dispatch.capture.capturePlanDigest !== prepared.capturePlanDigest ||
    dispatch.capture.resourcesDigest !== prepared.resourceReceiptDigest ||
    dispatch.capture.transport !== prepared.transportKind ||
    dispatch.capture.kind !== prepared.captureKind
  ) return false;
  return dispatch.capture.kind !== "fixed-provider-path" ||
    dispatch.capture.binding.sourcePlanDigest === preparation.resourcePreparationDigest;
}

export function parseAttemptCheckpoint(value: unknown): LifecycleResult<AttemptCheckpoint> {
  if (!isRecord(value) || !Object.hasOwn(CHECKPOINT_STATE_KEYS, String(value.state))) {
    return err("SCHEMA_INVALID", "state");
  }
  const state = value.state as AttemptState;
  if (!checkpointBaseIsValid(value, state)) return err("SCHEMA_INVALID");
  if (!checkpointUnitsAndOriginAreValid(value)) return err("SCHEMA_INVALID");
  const stateFieldError = checkpointStateFieldError(value, state);
  if (stateFieldError) return err("SCHEMA_INVALID", stateFieldError);
  const { stateDigest, ...semantic } = value;
  const rebuilt = freezeCheckpoint(semantic as CheckpointWithoutDigest);
  if (rebuilt.stateDigest !== stateDigest) return err("DIGEST_MISMATCH", "stateDigest");
  return ok(Object.freeze(value) as AttemptCheckpoint);
}
