// Shared, side-effect-free request/result contract between conductor, driver, and referee.

import {
  canonicalJson,
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
  rejectSecretLikeFields,
} from "./amadeus-swarm-canonical.ts";

export type AttemptFailureCode =
  | "INPUT_INVALID"
  | "EXPLICIT_DRIVER_UNAVAILABLE"
  | "PERSISTENCE_FAILED"
  | "COORDINATOR_FAILED"
  | "NATIVE_EVIDENCE_INVALID"
  | "NATIVE_CHILD_FAILED"
  | "ATTEMPT_LEASE_ACTIVE"
  | "ATTEMPT_LIVENESS_UNKNOWN"
  | "ORPHAN_PROCESS_GROUP_ACTIVE"
  | "REFEREE_CHECK_FAILED"
  | "REFEREE_FINALIZE_FAILED"
  | "REFEREE_CLAIM_ACTIVE"
  | "METADATA_MERGE_FAILED"
  | "CODE_MERGE_FAILED"
  | "PROTECTED_SPEC_BINDING_INVALID"
  | "LYING_CONDUCTOR"
  | "FINALIZE_BINDING_INVALID"
  | "SCHEMA_INVALID";

export const ATTEMPT_FAILURE_CODE_VALUES = Object.freeze([
  "INPUT_INVALID",
  "EXPLICIT_DRIVER_UNAVAILABLE",
  "PERSISTENCE_FAILED",
  "COORDINATOR_FAILED",
  "NATIVE_EVIDENCE_INVALID",
  "NATIVE_CHILD_FAILED",
  "ATTEMPT_LEASE_ACTIVE",
  "ATTEMPT_LIVENESS_UNKNOWN",
  "ORPHAN_PROCESS_GROUP_ACTIVE",
  "REFEREE_CHECK_FAILED",
  "REFEREE_FINALIZE_FAILED",
  "REFEREE_CLAIM_ACTIVE",
  "METADATA_MERGE_FAILED",
  "CODE_MERGE_FAILED",
  "PROTECTED_SPEC_BINDING_INVALID",
  "LYING_CONDUCTOR",
  "FINALIZE_BINDING_INVALID",
  "SCHEMA_INVALID",
] as const satisfies readonly AttemptFailureCode[]);

export type DeclinedUnit = Readonly<{
  unit: string;
  reason: "unsatisfiable" | "budget-exhausted" | "cap-exhausted";
}>;

export type ExpectedUnitGitBinding = Readonly<{
  unit: string;
  worktreePathDigest: string;
  baseCommit: string;
  headCommit: string;
}>;

export type ProtectedSpecBinding =
  | Readonly<{ kind: "none" }>
  | Readonly<{
      kind: "file";
      confinedRelativePath: string;
      baselineCommit: string;
      targetAtFinalizeCommit: string;
      baselineBlobDigest: string;
    }>;

export type FinalizeRequestBinding = Readonly<{
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  finalizeInvocationId: string;
  batch: number;
  planDigest: string;
  worktreeManifestDigest: string;
  expectedUnits: readonly ExpectedUnitGitBinding[];
  claimedUnits: readonly string[];
  declinedUnits: readonly DeclinedUnit[];
  checkCommandDigest: string;
  protectedSpec: ProtectedSpecBinding;
  repoIdentityDigest: string;
  mergeTargetBranch: string;
  targetBeforeCommit: string;
  mergeStrategy: "squash" | "merge" | "rebase";
  mergeMessageDigest: string;
  finalizeRequestDigest: string;
}>;

export type BoundFinalizeInvocation = Readonly<{
  schemaVersion: 1;
  finalizeInvocationId: string;
  checkCommand: string;
  mergeMessage: string;
}>;

export type CodeMergeOutcome =
  | Readonly<{ strategy: "squash"; targetBeforeCommit: string; targetAfterCommit: string; resultTreeDigest: string }>
  | Readonly<{ strategy: "merge"; targetBeforeCommit: string; targetAfterCommit: string; sourceHeadCommit: string }>
  | Readonly<{
      strategy: "rebase";
      targetBeforeCommit: string;
      targetAfterCommit: string;
      rebasedHeadCommit: string;
      patchIdentityDigest: string;
    }>;

export type UnitMergeResult = Readonly<{
  unit: string;
  aidlcMerge: Readonly<{
    stateMergeDigest: string;
    auditMergeDigest: string;
    runtimeFragmentMergeDigest: string;
  }>;
  codeMerge: CodeMergeOutcome;
  cleanup: "completed";
  unitAuditDigest: string;
}>;

export type RefereeFinalizeEnvelope = Readonly<{
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  finalizeInvocationId: string;
  finalizeRequestDigest: string;
  batch: number;
  units: readonly UnitMergeResult[];
  failures: readonly Readonly<{ unit: string; code: AttemptFailureCode }>[];
  mergeCompleted: boolean;
  resultDigest: string;
}>;

export type FinalizeContractResult<T> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{
      type: "err";
      error: Readonly<{
        code: "FINALIZE_BINDING_INVALID" | "DIGEST_MISMATCH";
        field?: string;
      }>;
    }>;

function ok<T>(value: T): FinalizeContractResult<T> {
  return Object.freeze({ type: "ok", value });
}

function err(
  code: "FINALIZE_BINDING_INVALID" | "DIGEST_MISMATCH",
  field?: string,
): FinalizeContractResult<never> {
  return Object.freeze({ type: "err", error: Object.freeze({ code, field }) });
}

export function parseBoundFinalizeInvocation(
  value: unknown,
): FinalizeContractResult<BoundFinalizeInvocation> {
  if (rejectSecretLikeFields(value).type === "err") return err("FINALIZE_BINDING_INVALID");
  if (
    !hasExactKeys(value, ["schemaVersion", "finalizeInvocationId", "checkCommand", "mergeMessage"]) ||
    value.schemaVersion !== 1 ||
    !nonEmptyString(value.finalizeInvocationId) ||
    !nonEmptyString(value.checkCommand) ||
    !nonEmptyString(value.mergeMessage)
  ) {
    return err("FINALIZE_BINDING_INVALID");
  }
  return ok(Object.freeze({
    schemaVersion: 1,
    finalizeInvocationId: value.finalizeInvocationId,
    checkCommand: value.checkCommand,
    mergeMessage: value.mergeMessage,
  }));
}

const FINALIZE_REQUEST_INPUT_KEYS = Object.freeze([
  "executionId",
  "attemptId",
  "finalizeInvocationId",
  "batch",
  "planDigest",
  "worktreeManifestDigest",
  "expectedUnits",
  "claimedUnits",
  "declinedUnits",
  "checkCommandDigest",
  "protectedSpec",
  "repoIdentityDigest",
  "mergeTargetBranch",
  "targetBeforeCommit",
  "mergeStrategy",
  "mergeMessageDigest",
]);

const FINALIZE_ENVELOPE_INPUT_KEYS = Object.freeze([
  "executionId",
  "attemptId",
  "finalizeInvocationId",
  "finalizeRequestDigest",
  "batch",
  "units",
  "failures",
  "mergeCompleted",
]);

function validProtectedSpec(value: unknown): value is ProtectedSpecBinding {
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
    nonEmptyString(value.confinedRelativePath) &&
    nonEmptyString(value.baselineCommit) &&
    nonEmptyString(value.targetAtFinalizeCommit) &&
    nonEmptyString(value.baselineBlobDigest)
  );
}

function validExpectedUnit(value: unknown): value is ExpectedUnitGitBinding {
  return (
    hasExactKeys(value, ["unit", "worktreePathDigest", "baseCommit", "headCommit"]) &&
    nonEmptyString(value.unit) &&
    nonEmptyString(value.worktreePathDigest) &&
    nonEmptyString(value.baseCommit) &&
    nonEmptyString(value.headCommit)
  );
}

function validDeclinedUnit(value: unknown): value is DeclinedUnit {
  return (
    hasExactKeys(value, ["unit", "reason"]) &&
    nonEmptyString(value.unit) &&
    ["unsatisfiable", "budget-exhausted", "cap-exhausted"].includes(String(value.reason))
  );
}

function validCodeMerge(value: unknown): value is CodeMergeOutcome {
  if (!isRecord(value) || !nonEmptyString(value.strategy)) return false;
  if (value.strategy === "squash") {
    return (
      hasExactKeys(value, ["strategy", "targetBeforeCommit", "targetAfterCommit", "resultTreeDigest"]) &&
      [value.targetBeforeCommit, value.targetAfterCommit, value.resultTreeDigest].every(nonEmptyString)
    );
  }
  if (value.strategy === "merge") {
    return (
      hasExactKeys(value, ["strategy", "targetBeforeCommit", "targetAfterCommit", "sourceHeadCommit"]) &&
      [value.targetBeforeCommit, value.targetAfterCommit, value.sourceHeadCommit].every(nonEmptyString)
    );
  }
  if (value.strategy === "rebase") {
    return (
      hasExactKeys(value, [
        "strategy",
        "targetBeforeCommit",
        "targetAfterCommit",
        "rebasedHeadCommit",
        "patchIdentityDigest",
      ]) &&
      [
        value.targetBeforeCommit,
        value.targetAfterCommit,
        value.rebasedHeadCommit,
        value.patchIdentityDigest,
      ].every(nonEmptyString)
    );
  }
  return false;
}

function validUnitMerge(value: unknown): value is UnitMergeResult {
  if (
    !hasExactKeys(value, ["unit", "aidlcMerge", "codeMerge", "cleanup", "unitAuditDigest"]) ||
    !hasExactKeys(value.aidlcMerge, ["stateMergeDigest", "auditMergeDigest", "runtimeFragmentMergeDigest"])
  ) {
    return false;
  }
  return (
    nonEmptyString(value.unit) &&
    [
      value.aidlcMerge.stateMergeDigest,
      value.aidlcMerge.auditMergeDigest,
      value.aidlcMerge.runtimeFragmentMergeDigest,
    ].every(nonEmptyString) &&
    validCodeMerge(value.codeMerge) &&
    value.cleanup === "completed" &&
    nonEmptyString(value.unitAuditDigest)
  );
}

type FinalizeRequestInput = Omit<FinalizeRequestBinding, "schemaVersion" | "finalizeRequestDigest">;

function finalizeRequestScalarsAreValid(input: FinalizeRequestInput): boolean {
  return (
    [
      input.executionId,
      input.attemptId,
      input.finalizeInvocationId,
      input.planDigest,
      input.worktreeManifestDigest,
      input.checkCommandDigest,
      input.repoIdentityDigest,
      input.mergeTargetBranch,
      input.targetBeforeCommit,
      input.mergeMessageDigest,
    ].every(nonEmptyString) &&
    Number.isInteger(input.batch) &&
    input.batch > 0 &&
    validProtectedSpec(input.protectedSpec) &&
    ["squash", "merge", "rebase"].includes(input.mergeStrategy)
  );
}

function finalizeRequestCollectionsAreValid(input: FinalizeRequestInput): boolean {
  return (
    Array.isArray(input.expectedUnits) &&
    input.expectedUnits.every(validExpectedUnit) &&
    Array.isArray(input.claimedUnits) &&
    input.claimedUnits.every(nonEmptyString) &&
    Array.isArray(input.declinedUnits) &&
    input.declinedUnits.every(validDeclinedUnit)
  );
}

function expectedUnitsAreUnique(expected: readonly ExpectedUnitGitBinding[]): boolean {
  return expected.length >= 2 && new Set(expected.map((unit) => unit.unit)).size === expected.length;
}

function protectedSpecMatchesExpected(
  spec: ProtectedSpecBinding,
  expectedBaseCommit: string,
  targetBeforeCommit: string,
): boolean {
  if (spec.kind === "none") return true;
  return spec.baselineCommit === expectedBaseCommit && spec.targetAtFinalizeCommit === targetBeforeCommit;
}

function partitionMatchesExpected(
  claimed: readonly string[],
  declined: readonly DeclinedUnit[],
  expected: readonly ExpectedUnitGitBinding[],
): boolean {
  const partition = [...claimed, ...declined.map((entry) => entry.unit)].sort();
  return (
    new Set(partition).size === partition.length &&
    canonicalJson(partition) === canonicalJson(expected.map((entry) => entry.unit))
  );
}

export function buildFinalizeRequestBinding(
  input: FinalizeRequestInput,
): FinalizeContractResult<FinalizeRequestBinding> {
  if (
    !hasExactKeys(input, FINALIZE_REQUEST_INPUT_KEYS) ||
    !finalizeRequestScalarsAreValid(input) ||
    !finalizeRequestCollectionsAreValid(input)
  ) {
    return err("FINALIZE_BINDING_INVALID");
  }
  const expected = [...input.expectedUnits].sort((a, b) => a.unit.localeCompare(b.unit));
  if (!expectedUnitsAreUnique(expected)) {
    return err("FINALIZE_BINDING_INVALID", "expectedUnits");
  }
  const baseCommits = new Set(expected.map((entry) => entry.baseCommit));
  if (baseCommits.size !== 1) return err("FINALIZE_BINDING_INVALID", "expectedUnits.baseCommit");
  if (!protectedSpecMatchesExpected(input.protectedSpec, expected[0].baseCommit, input.targetBeforeCommit)) {
    return err("FINALIZE_BINDING_INVALID", "protectedSpec");
  }
  const claimed = [...new Set(input.claimedUnits)].sort();
  const declined = [...input.declinedUnits].sort((a, b) => a.unit.localeCompare(b.unit));
  if (!partitionMatchesExpected(claimed, declined, expected)) {
    return err("FINALIZE_BINDING_INVALID", "claimedUnits");
  }
  const withoutDigest = Object.freeze({
    ...input,
    schemaVersion: 1 as const,
    expectedUnits: Object.freeze(expected),
    claimedUnits: Object.freeze(claimed),
    declinedUnits: Object.freeze(declined.map((entry) => Object.freeze({ ...entry }))),
  });
  return ok(Object.freeze({ ...withoutDigest, finalizeRequestDigest: digestValue(withoutDigest) }));
}

export function buildRefereeFinalizeEnvelope(
  input: Omit<RefereeFinalizeEnvelope, "schemaVersion" | "resultDigest">,
): FinalizeContractResult<RefereeFinalizeEnvelope> {
  if (
    !hasExactKeys(input, FINALIZE_ENVELOPE_INPUT_KEYS) ||
    ![input.executionId, input.attemptId, input.finalizeInvocationId, input.finalizeRequestDigest].every(
      nonEmptyString,
    ) ||
    !Number.isInteger(input.batch) ||
    input.batch < 1 ||
    !Array.isArray(input.units) ||
    !Array.isArray(input.failures) ||
    input.units.some((unit) => !validUnitMerge(unit)) ||
    input.failures.some(
      (failure) =>
        !hasExactKeys(failure, ["unit", "code"]) ||
        !nonEmptyString(failure.unit) ||
        !ATTEMPT_FAILURE_CODE_VALUES.includes(failure.code as AttemptFailureCode),
    ) ||
    (input.mergeCompleted && input.failures.length > 0)
  ) {
    return err("FINALIZE_BINDING_INVALID");
  }
  const observedUnits = [...input.units.map(({ unit }) => unit), ...input.failures.map(({ unit }) => unit)];
  if (
    observedUnits.some((unit) => !nonEmptyString(unit)) ||
    new Set(observedUnits).size !== observedUnits.length
  ) {
    return err("FINALIZE_BINDING_INVALID", "units");
  }
  const withoutDigest = Object.freeze({
    ...input,
    schemaVersion: 1 as const,
    units: Object.freeze([...input.units].sort((a, b) => a.unit.localeCompare(b.unit))),
    failures: Object.freeze([...input.failures].sort((a, b) => a.unit.localeCompare(b.unit))),
  });
  return ok(Object.freeze({ ...withoutDigest, resultDigest: digestValue(withoutDigest) }));
}

export function validateRefereeEnvelope(
  binding: FinalizeRequestBinding,
  envelope: RefereeFinalizeEnvelope,
): FinalizeContractResult<RefereeFinalizeEnvelope> {
  if (
    !isRecord(envelope) ||
    !Array.isArray(envelope.units) ||
    !Array.isArray(envelope.failures) ||
    envelope.schemaVersion !== 1 ||
    envelope.executionId !== binding.executionId ||
    envelope.attemptId !== binding.attemptId ||
    envelope.finalizeInvocationId !== binding.finalizeInvocationId ||
    envelope.finalizeRequestDigest !== binding.finalizeRequestDigest ||
    envelope.batch !== binding.batch
  ) {
    return err("FINALIZE_BINDING_INVALID");
  }
  const expected = binding.expectedUnits.map((entry) => entry.unit).sort();
  const observed = [...envelope.units.map((entry) => entry.unit), ...envelope.failures.map((entry) => entry.unit)].sort();
  if (canonicalJson(expected) !== canonicalJson(observed)) return err("FINALIZE_BINDING_INVALID", "units");
  const { schemaVersion: _schemaVersion, resultDigest: _resultDigest, ...semantic } = envelope;
  const rebuilt = buildRefereeFinalizeEnvelope(semantic);
  if (rebuilt.type === "err" || rebuilt.value.resultDigest !== envelope.resultDigest) {
    return err("DIGEST_MISMATCH");
  }
  return ok(envelope);
}

export function parseFinalizeRequestBinding(value: unknown): FinalizeContractResult<FinalizeRequestBinding> {
  if (!hasExactKeys(value, [...FINALIZE_REQUEST_INPUT_KEYS, "schemaVersion", "finalizeRequestDigest"])) {
    return err("FINALIZE_BINDING_INVALID");
  }
  if (value.schemaVersion !== 1 || !nonEmptyString(value.finalizeRequestDigest)) {
    return err("FINALIZE_BINDING_INVALID");
  }
  const { schemaVersion: _schemaVersion, finalizeRequestDigest, ...semantic } = value;
  const rebuilt = buildFinalizeRequestBinding(semantic as Omit<FinalizeRequestBinding, "schemaVersion" | "finalizeRequestDigest">);
  if (rebuilt.type === "err" || rebuilt.value.finalizeRequestDigest !== finalizeRequestDigest) {
    return err("DIGEST_MISMATCH");
  }
  return rebuilt;
}

export function parseRefereeFinalizeEnvelope(value: unknown): FinalizeContractResult<RefereeFinalizeEnvelope> {
  if (!hasExactKeys(value, [...FINALIZE_ENVELOPE_INPUT_KEYS, "schemaVersion", "resultDigest"])) {
    return err("FINALIZE_BINDING_INVALID");
  }
  if (value.schemaVersion !== 1 || !nonEmptyString(value.resultDigest)) {
    return err("FINALIZE_BINDING_INVALID");
  }
  const { schemaVersion: _schemaVersion, resultDigest, ...semantic } = value;
  const rebuilt = buildRefereeFinalizeEnvelope(semantic as Omit<RefereeFinalizeEnvelope, "schemaVersion" | "resultDigest">);
  if (rebuilt.type === "err" || rebuilt.value.resultDigest !== resultDigest) return err("DIGEST_MISMATCH");
  return rebuilt;
}
