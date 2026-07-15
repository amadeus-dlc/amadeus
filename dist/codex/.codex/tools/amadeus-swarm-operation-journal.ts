// Durable, digest-bound journal for referee-owned merge primitives.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import {
  canonicalJson,
  digestValue,
  hasExactKeys,
  isRecord,
  nonEmptyString,
} from "./amadeus-swarm-canonical.ts";
import { getField, parseRefsList, readStateFile, writeFileAtomic } from "./amadeus-lib.ts";

export type OperationJournalKind = "metadata-merge" | "code-merge";

export type MetadataOperationStep =
  | "bolt-completed"
  | "state-merged"
  | "audit-merged"
  | "runtime-fragment-merged";

export type CodeOperationStep =
  | "audit-intent"
  | "code-landed"
  | "worktree-removed"
  | "branch-deleted";

export type OperationStep = MetadataOperationStep | CodeOperationStep;

export type OperationStepRecord = Readonly<{
  evidence: unknown;
  evidenceDigest: string;
}>;

export type OperationJournal = Readonly<{
  schemaVersion: 1;
  operationId: string;
  kind: OperationJournalKind;
  requestDigest: string;
  completedSteps: Readonly<Record<string, OperationStepRecord>>;
  result?: unknown;
  resultDigest?: string;
  journalDigest: string;
}>;

function freezeJournal(value: Omit<OperationJournal, "journalDigest">): OperationJournal {
  return Object.freeze({ ...value, journalDigest: digestValue(value) });
}

const STEP_ORDER = Object.freeze({
  "metadata-merge": Object.freeze([
    "bolt-completed",
    "state-merged",
    "audit-merged",
    "runtime-fragment-merged",
  ] satisfies readonly MetadataOperationStep[]),
  "code-merge": Object.freeze([
    "audit-intent",
    "code-landed",
    "worktree-removed",
    "branch-deleted",
  ] satisfies readonly CodeOperationStep[]),
}) satisfies Readonly<Record<OperationJournalKind, readonly OperationStep[]>>;

function metadataEvidenceIsValid(
  step: OperationStep,
  value: unknown,
  operationId: string,
): boolean {
  const eventByStep: Partial<Record<OperationStep, string>> = {
    "bolt-completed": "BOLT_COMPLETED",
    "state-merged": "STATE_MERGED",
    "audit-merged": "AUDIT_MERGED",
    "runtime-fragment-merged": "RUNTIME_GRAPH_MERGED",
  };
  if (!hasExactKeys(value, [
    "event",
    "unit",
    "operationId",
    "finalizeRequestDigest",
    ...(step === "runtime-fragment-merged" ? ["status"] : []),
  ])) {
    return false;
  }
  if (
    value.event !== eventByStep[step] ||
    !nonEmptyString(value.unit) ||
    value.operationId !== operationId ||
    !nonEmptyString(value.finalizeRequestDigest)
  ) {
    return false;
  }
  return (
    step !== "runtime-fragment-merged" ||
    value.status === "fragment-merged" ||
    value.status === "fragment-absent"
  );
}

function codeEvidenceIsValid(step: OperationStep, value: unknown): boolean {
  if (step === "audit-intent") {
    return hasExactKeys(value, ["auditTimestamp"]) && nonEmptyString(value.auditTimestamp);
  }
  if (step === "code-landed") {
    return hasExactKeys(value, ["commitSha"]) && nonEmptyString(value.commitSha);
  }
  if (step === "worktree-removed" || step === "branch-deleted") {
    return hasExactKeys(value, ["absent"]) && value.absent === true;
  }
  return false;
}

function stepEvidenceIsValid(
  kind: OperationJournalKind,
  step: OperationStep,
  value: unknown,
  operationId: string,
): boolean {
  return kind === "metadata-merge"
    ? metadataEvidenceIsValid(step, value, operationId)
    : codeEvidenceIsValid(step, value);
}

function completedStepsAreValid(
  kind: OperationJournalKind,
  operationId: string,
  value: unknown,
): value is Record<string, OperationStepRecord> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  const expectedPrefix = STEP_ORDER[kind].slice(0, actual.length);
  if (canonicalJson([...actual].sort()) !== canonicalJson([...expectedPrefix].sort())) return false;
  const valid = Object.entries(value).every(([step, record]) => {
    if (!hasExactKeys(record, ["evidence", "evidenceDigest"])) return false;
    if (!nonEmptyString(record.evidenceDigest)) return false;
    if (digestValue(record.evidence) !== record.evidenceDigest) return false;
    return stepEvidenceIsValid(kind, step as OperationStep, record.evidence, operationId);
  });
  if (!valid || kind !== "metadata-merge") return valid;
  const completed = value as Record<string, OperationStepRecord>;
  const requestDigests = new Set(
    Object.values(completed).map(
      (record) => (record.evidence as { finalizeRequestDigest: string }).finalizeRequestDigest,
    ),
  );
  return requestDigests.size <= 1;
}

function metadataResultIsValid(value: unknown, operationId: string, finalizeRequestDigest?: string): boolean {
  return (
    hasExactKeys(value, [
      "emitted",
      "bolt_names",
      "batch",
      "slug",
      "merged",
      "operation_id",
      "finalize_request_digest",
    ]) &&
    value.emitted === "BOLT_COMPLETED" &&
    [value.bolt_names, value.batch, value.slug, value.finalize_request_digest].every(nonEmptyString) &&
    value.operation_id === operationId &&
    (finalizeRequestDigest === undefined || value.finalize_request_digest === finalizeRequestDigest) &&
    Array.isArray(value.merged) &&
    canonicalJson(value.merged) === canonicalJson(["STATE_MERGED", "AUDIT_MERGED", "RUNTIME_GRAPH_MERGED"])
  );
}

function codeResultIsValid(value: unknown, operationId: string): boolean {
  return (
    hasExactKeys(value, [
      "emitted",
      "slug",
      "worktree_path",
      "target",
      "strategy",
      "commit_sha",
      "audit_timestamp",
      "operation_id",
    ]) &&
    value.emitted === "WORKTREE_MERGED" &&
    [value.slug, value.worktree_path, value.target, value.commit_sha, value.audit_timestamp].every(nonEmptyString) &&
    ["squash", "merge", "rebase"].includes(String(value.strategy)) &&
    value.operation_id === operationId
  );
}

function resultBindingIsValid(value: Record<string, unknown>, kind: OperationJournalKind): boolean {
  if (value.result === undefined) return true;
  if (!nonEmptyString(value.resultDigest) || digestValue(value.result) !== value.resultDigest) return false;
  if (Object.keys(value.completedSteps as Record<string, unknown>).length !== STEP_ORDER[kind].length) return false;
  const firstStep = Object.values(value.completedSteps as Record<string, OperationStepRecord>)[0];
  if (!firstStep) return false;
  const finalizeRequestDigest = kind === "metadata-merge"
    ? (firstStep.evidence as { finalizeRequestDigest: string }).finalizeRequestDigest
    : undefined;
  return kind === "metadata-merge"
    ? metadataResultIsValid(value.result, String(value.operationId), finalizeRequestDigest)
    : codeResultIsValid(value.result, String(value.operationId));
}

export function parseOperationJournal(value: unknown): OperationJournal {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "operationId",
      "kind",
      "requestDigest",
      "completedSteps",
      ...(value.result === undefined ? [] : ["result", "resultDigest"]),
      "journalDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    !nonEmptyString(value.operationId) ||
    (value.kind !== "metadata-merge" && value.kind !== "code-merge") ||
    !nonEmptyString(value.requestDigest) ||
    !completedStepsAreValid(value.kind, value.operationId, value.completedSteps) ||
    !resultBindingIsValid(value, value.kind) ||
    !nonEmptyString(value.journalDigest)
  ) {
    throw new Error("operation journal invalid");
  }
  const { journalDigest, ...semantic } = value;
  if (digestValue(semantic) !== journalDigest) throw new Error("operation journal invalid");
  return Object.freeze(value) as OperationJournal;
}

function journalPath(claimPath: string, operationId: string): string {
  const claimDir = resolve(dirname(claimPath));
  const operationsDir = resolve(claimDir, "operations");
  const path = resolve(operationsDir, `${operationId}.json`);
  if (!path.startsWith(`${operationsDir}${sep}`)) throw new Error("operation journal path escape");
  return path;
}

function writeJournal(path: string, journal: OperationJournal): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileAtomic(path, `${canonicalJson(journal)}\n`);
}

export function openOperationJournal(input: Readonly<{
  claimPath: string;
  operationId: string;
  kind: OperationJournalKind;
  request: unknown;
}>): Readonly<{ path: string; journal: OperationJournal }> {
  const path = journalPath(input.claimPath, input.operationId);
  const requestDigest = digestValue(input.request);
  if (existsSync(path)) {
    const journal = parseOperationJournal(JSON.parse(readFileSync(path, "utf-8")));
    if (
      journal.operationId !== input.operationId ||
      journal.kind !== input.kind ||
      journal.requestDigest !== requestDigest
    ) {
      throw new Error("operation journal conflict");
    }
    return Object.freeze({ path, journal });
  }
  const journal = freezeJournal({
    schemaVersion: 1,
    operationId: input.operationId,
    kind: input.kind,
    requestDigest,
    completedSteps: Object.freeze({}),
  });
  writeJournal(path, journal);
  return Object.freeze({ path, journal });
}

export function recordOperationStep(
  path: string,
  journal: OperationJournal,
  step: string,
  postcondition: unknown,
): OperationJournal {
  const expected: readonly OperationStep[] = STEP_ORDER[journal.kind];
  if (!expected.includes(step as OperationStep)) throw new Error("operation step invalid");
  const existing = journal.completedSteps[step];
  if (existing) {
    if (existing.evidenceDigest !== digestValue(postcondition)) throw new Error("operation step conflict");
    return journal;
  }
  const nextStep = expected[Object.keys(journal.completedSteps).length];
  if (step !== nextStep) throw new Error("operation step order invalid");
  if (!stepEvidenceIsValid(journal.kind, step as OperationStep, postcondition, journal.operationId)) {
    throw new Error("operation step evidence invalid");
  }
  const record = Object.freeze({ evidence: postcondition, evidenceDigest: digestValue(postcondition) });
  const { journalDigest: _journalDigest, ...semantic } = journal;
  const next = freezeJournal({
    ...semantic,
    completedSteps: Object.freeze({ ...journal.completedSteps, [step]: record }),
  });
  writeJournal(path, next);
  return next;
}

export function recordOperationResult(
  path: string,
  journal: OperationJournal,
  result: unknown,
): OperationJournal {
  if (Object.keys(journal.completedSteps).length !== STEP_ORDER[journal.kind].length) {
    throw new Error("operation result before steps complete");
  }
  const firstStep = Object.values(journal.completedSteps)[0];
  if (!firstStep) throw new Error("operation result before steps complete");
  const finalizeRequestDigest = journal.kind === "metadata-merge"
    ? (firstStep.evidence as { finalizeRequestDigest: string }).finalizeRequestDigest
    : undefined;
  const valid = journal.kind === "metadata-merge"
    ? metadataResultIsValid(result, journal.operationId, finalizeRequestDigest)
    : codeResultIsValid(result, journal.operationId);
  if (!valid) throw new Error("operation result invalid");
  const resultDigest = digestValue(result);
  if (journal.result !== undefined) {
    if (journal.resultDigest !== resultDigest) throw new Error("operation result conflict");
    return journal;
  }
  const { journalDigest: _journalDigest, ...semantic } = journal;
  const next = freezeJournal({ ...semantic, result, resultDigest });
  writeJournal(path, next);
  return next;
}

export function operationStepEvidence(journal: OperationJournal, step: string): unknown | null {
  return journal.completedSteps[step]?.evidence ?? null;
}

// The STATE_MERGED audit row alone is NOT proof the state merge finished:
// amadeus-state handleMerge appends the row before writeStateFile (strict
// audit-first), so a crash between the two leaves the row on disk with main
// state unmerged. Require the state effect too — slug gone from main's Bolt
// Refs — before letting a resumed journal skip the merge step.
export function stateMergedPostcondition(
  pd: string,
  flags: Record<string, string>,
  auditPostcondition: (event: string) => Readonly<Record<string, string>> | null,
): Readonly<Record<string, string>> | null {
  const audit = auditPostcondition("STATE_MERGED");
  if (audit === null) return null;
  const refs = getField(readStateFile(pd, flags.intent, flags.space), "Bolt Refs") ?? "";
  return parseRefsList(refs).includes(flags.slug) ? null : audit;
}
