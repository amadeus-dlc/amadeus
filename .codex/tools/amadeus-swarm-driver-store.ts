// Audit-first persistence for swarm-driver attempts.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  applyTransition,
  buildTransition,
  canonicalJson,
  createProbingCheckpoint,
  digestValue,
  parseAttemptCheckpoint,
  type AttemptCheckpoint,
  type AttemptTransition,
  type AttemptLease,
  type EvidenceVerdict,
  type LifecycleResult,
  type SelectionInputSnapshot,
} from "./amadeus-swarm-driver-lifecycle.ts";
import type { NativeDriver } from "./amadeus-swarm-driver-contract.ts";
import { readAllAuditShards, recordDir, withAuditLock, writeFileAtomic } from "./amadeus-lib.ts";

export type DriverAuditEvent =
  | "SWARM_DRIVER_ATTEMPTED"
  | "SWARM_DRIVER_SELECTED"
  | "SWARM_DRIVER_TRANSITION"
  | "SWARM_DRIVER_RECONCILED"
  | "SWARM_NATIVE_EVIDENCE";

export type DriverAuditPort = Readonly<{
  append(event: DriverAuditEvent, fields: Readonly<Record<string, string>>): void;
  hasEventKey(eventKey: string): boolean;
  read(): string;
}>;

export type DriverCheckpointPort = Readonly<{
  read(batch: number): AttemptCheckpoint | null;
  write(batch: number, checkpoint: AttemptCheckpoint): void;
}>;

export type DriverLockPort = Readonly<{
  run<T>(fn: () => T): T;
}>;

export type AttemptBeginIntent = Readonly<{
  beginId: string;
  executionId: string;
  attemptId: string;
  batch: number;
  preDigest: "ABSENT";
  intendedPostDigest: string;
  selectionInputDigest: string;
  probeStatus: "pending";
}>;

export type ReconciliationResult = Readonly<{
  action: "reapplied" | "already-materialized" | "abandoned-unmaterialized-begin" | "marked-failed";
  checkpoint: AttemptCheckpoint | null;
}>;

export type DriverAttemptStore = Readonly<{
  read(batch: number): AttemptCheckpoint | null;
  readReconciled(batch: number): AttemptCheckpoint | null;
  begin(checkpoint: AttemptCheckpoint): AttemptCheckpoint;
  transition(transition: AttemptTransition): AttemptCheckpoint;
  reconcileTransition(transition: AttemptTransition): ReconciliationResult;
  reconcileBegin(intent: AttemptBeginIntent, sideEffectsAbsent: boolean): ReconciliationResult;
  reconcilePending(batch: number): readonly ReconciliationResult[];
  heartbeat(input: Readonly<{
    batch: number;
    leaseId: string;
    fencingToken: number;
    heartbeatAt: string;
    expiresAt: string;
  }>): AttemptCheckpoint;
  beginResume(input: Readonly<{
    batch: number;
    previousAttemptId: string;
    newAttemptId: string;
    nonceHash: string;
    leaseId: string;
    ownerId: string;
    ownerProcess?: AttemptLease["ownerProcess"];
    now: string;
    expiresAt: string;
    mutationId: string;
    reusedConvergedUnits: readonly string[];
    recoveryVerified: true;
  }>): AttemptCheckpoint;
  recordNativeEvidence(input: Readonly<{
    batch: number;
    executionId: string;
    attemptId: string;
    driver: NativeDriver;
    verdict: EvidenceVerdict;
  }>): void;
}>;

export type AttemptStoreErrorCode =
  | "CHECKPOINT_EXISTS"
  | "CHECKPOINT_MISSING"
  | "CHECKPOINT_CONFLICT"
  | "CHECKPOINT_NOT_RESUMABLE"
  | "STALE_WRITER"
  | "BEGIN_CONFLICT"
  | "TRANSITION_INVALID";

export class AttemptStoreError extends Error {
  readonly code: AttemptStoreErrorCode;

  constructor(code: AttemptStoreErrorCode) {
    super(code);
    this.name = "AttemptStoreError";
    this.code = code;
  }
}

function eventKey(event: DriverAuditEvent, executionId: string, attemptId: string, mutationId: string): string {
  return digestValue({ event, executionId, attemptId, mutationId });
}

function transitionFields(transition: AttemptTransition, postDigest: string): Readonly<Record<string, string>> {
  return Object.freeze({
    "Schema version": "1",
    "Execution ID": transition.executionId,
    "Attempt ID": transition.attemptId,
    "Transition ID": transition.transitionId,
    "Transition edge": transition.edge,
    "Pre digest": transition.preDigest,
    "Post digest": postDigest,
    "Batch number": String(transition.post.batch),
    "Post image": canonicalJson({ ...transition.post, stateDigest: postDigest }),
    "Fencing token": String(transition.fencingToken),
    "Event key": eventKey(
      "SWARM_DRIVER_TRANSITION",
      transition.executionId,
      transition.attemptId,
      transition.transitionId,
    ),
  });
}

function attemptedFields(checkpoint: AttemptCheckpoint): Readonly<Record<string, string>> {
  const request = checkpoint.selectionInput.requested;
  return Object.freeze({
    "Request source": request.source,
    "Requested driver": "requested" in request ? request.requested : `legacy-${request.rawValueClass}`,
    Harness: checkpoint.selectionInput.harness,
    "Batch number": String(checkpoint.batch),
    "Expected Unit count": String(checkpoint.selectionInput.expectedUnits.length),
    "Expected Units digest": digestValue(checkpoint.selectionInput.expectedUnits),
    "Topology signals digest": digestValue(checkpoint.selectionInput.topologySignals),
    "Checkpoint image": canonicalJson(checkpoint),
  });
}

type AuditRecord = Readonly<Record<string, string>>;

function auditRecords(markdown: string): readonly AuditRecord[] {
  return [...markdown.matchAll(/(?:^|\n)## [^\n]+\n([\s\S]*?)\n---(?:\n|$)/g)].map((match) => {
    const fields: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
      const field = /^\*\*([^*]+)\*\*: (.*)$/.exec(line);
      if (field) fields[field[1]] = field[2];
    }
    return Object.freeze(fields);
  });
}

function reconciliationEventKey(sourceEventKey: string): string {
  return digestValue({ event: "SWARM_DRIVER_RECONCILED", sourceEventKey });
}

function checkpointFromAuditImage(image: string | undefined): AttemptCheckpoint | null {
  if (!image) return null;
  try {
    const parsed = parseAttemptCheckpoint(JSON.parse(image));
    return parsed.type === "ok" ? parsed.value : null;
  } catch {
    return null;
  }
}

function selectedFields(checkpoint: AttemptCheckpoint): Readonly<Record<string, string>> {
  if (!("selectedContext" in checkpoint)) return Object.freeze({});
  const selection = checkpoint.selectedContext.selection;
  return Object.freeze({
    "Request source": selection.source,
    "Requested driver": "requested" in selection ? selection.requested : "legacy-env",
    "Selected driver": "selected" in selection ? selection.selected : selection.execution,
    "Execution mode": selection.executionMode,
    Harness: selection.harness,
    "Batch number": String(checkpoint.batch),
    ...(selection.kind === "legacy-selection"
      ? {
          "Warning code": selection.warningCode,
          ...(selection.legacyEnabled ? { "Legacy enabled": "true" } : { "Legacy enabled": "false" }),
        }
      : {
          Topology: selection.topology.topology,
          "Topology reason": selection.topology.reason,
          "Fallback reason": selection.fallbackReason,
          "Capability details": selection.capabilityDetails.join(",") || "none",
        }),
  });
}

function unwrap<T>(result: LifecycleResult<T>): T {
  if (result.type === "err") throw new AttemptStoreError("TRANSITION_INVALID");
  return result.value;
}

function refreshLeaseDigest(checkpoint: AttemptCheckpoint, heartbeatAt: string, expiresAt: string): AttemptCheckpoint {
  return Object.freeze({
    ...checkpoint,
    lease: Object.freeze({ ...checkpoint.lease, heartbeatAt, expiresAt }),
  });
}

type DriverStorePorts = Readonly<{
  checkpoint: DriverCheckpointPort;
  audit: DriverAuditPort;
  lock: DriverLockPort;
}>;

function reconcileAbsentCheckpoint(
  ports: DriverStorePorts,
  batch: number,
  records: readonly AuditRecord[],
): readonly ReconciliationResult[] {
  const attempted = [...records]
    .reverse()
    .find((record) => record.Event === "SWARM_DRIVER_ATTEMPTED" && record["Batch number"] === String(batch));
  if (!attempted) return Object.freeze([]);
  const sourceKey = attempted["Event key"];
  const reconcileKey = sourceKey ? reconciliationEventKey(sourceKey) : "";
  const image = checkpointFromAuditImage(attempted["Checkpoint image"]);
  if (!sourceKey || ports.audit.hasEventKey(reconcileKey) || !image) return Object.freeze([]);
  if (image.batch !== batch || attempted["Intended post digest"] !== image.stateDigest) return Object.freeze([]);
  if (attempted["Selection input digest"] !== digestValue(image.selectionInput)) return Object.freeze([]);
  if (attempted["Probe status"] !== "pending") return Object.freeze([]);
  ports.audit.append("SWARM_DRIVER_RECONCILED", {
    "Schema version": "1",
    "Execution ID": image.executionId,
    "Attempt ID": image.attemptId,
    "Begin ID": attempted["Begin ID"],
    Action: "abandoned-unmaterialized-begin",
    "Source event key": sourceKey,
    "Event key": reconcileKey,
  });
  return Object.freeze([
    Object.freeze({ action: "abandoned-unmaterialized-begin" as const, checkpoint: null }),
  ]);
}

function resumedTransitionImageIsValid(current: AttemptCheckpoint, intended: AttemptCheckpoint): boolean {
  return (
    current.state === "failed-resumable" &&
    intended.state === "probing" &&
    intended.origin === "resumed" &&
    intended.previousAttemptId === current.attemptId &&
    intended.lease.fencingToken === current.lease.fencingToken + 1
  );
}

function rebuildTransitionImage(
  current: AttemptCheckpoint,
  intended: AttemptCheckpoint,
  record: AuditRecord,
): AttemptCheckpoint | null {
  if (intended.attemptId !== current.attemptId) return null;
  const { stateDigest: _stateDigest, ...post } = intended;
  const transition = buildTransition(current, {
    transitionId: record["Transition ID"],
    edge: record["Transition edge"] as AttemptTransition["edge"],
    executionId: current.executionId,
    attemptId: current.attemptId,
    leaseId: current.lease.leaseId,
    fencingToken: current.lease.fencingToken,
    post,
  });
  if (transition.type === "err") return null;
  const applied = applyTransition(current, transition.value);
  if (applied.type === "err" || applied.value.stateDigest !== intended.stateDigest) return null;
  return applied.value;
}

function transitionImageFromRecord(
  current: AttemptCheckpoint,
  record: AuditRecord,
  batch: number,
): AttemptCheckpoint | null {
  const intended = checkpointFromAuditImage(record["Post image"]);
  if (!intended || intended.batch !== batch) return null;
  if (intended.stateDigest !== record["Post digest"] || intended.executionId !== current.executionId) return null;
  if (record["Transition edge"] === "attempt-resumed") {
    return resumedTransitionImageIsValid(current, intended) ? intended : null;
  }
  return rebuildTransitionImage(current, intended, record);
}

function appendTransitionReconciliation(
  ports: DriverStorePorts,
  record: AuditRecord,
  action: ReconciliationResult["action"],
  checkpoint: AttemptCheckpoint,
  sourceKey: string,
  reconcileKey: string,
): void {
  ports.audit.append("SWARM_DRIVER_RECONCILED", {
    "Schema version": "1",
    "Execution ID": checkpoint.executionId,
    "Attempt ID": checkpoint.attemptId,
    "Transition ID": record["Transition ID"] ?? "unknown",
    Action: action,
    "Source event key": sourceKey,
    "Event key": reconcileKey,
  });
}

function reconcileTransitionRecords(
  ports: DriverStorePorts,
  batch: number,
  records: readonly AuditRecord[],
  initial: AttemptCheckpoint,
): readonly ReconciliationResult[] {
  const results: ReconciliationResult[] = [];
  let current = initial;
  for (const record of records) {
    if (record.Event !== "SWARM_DRIVER_TRANSITION" || record["Batch number"] !== String(batch)) continue;
    const sourceKey = record["Event key"];
    const reconcileKey = sourceKey ? reconciliationEventKey(sourceKey) : "";
    if (!sourceKey || ports.audit.hasEventKey(reconcileKey)) continue;
    if (record["Post digest"] === current.stateDigest) {
      appendTransitionReconciliation(ports, record, "already-materialized", current, sourceKey, reconcileKey);
      results.push(Object.freeze({ action: "already-materialized", checkpoint: current }));
      continue;
    }
    if (record["Pre digest"] !== current.stateDigest) continue;
    const next = transitionImageFromRecord(current, record, batch);
    if (!next) {
      appendTransitionReconciliation(ports, record, "marked-failed", current, sourceKey, reconcileKey);
      results.push(Object.freeze({ action: "marked-failed", checkpoint: current }));
      continue;
    }
    ports.checkpoint.write(batch, next);
    current = next;
    appendTransitionReconciliation(ports, record, "reapplied", next, sourceKey, reconcileKey);
    results.push(Object.freeze({ action: "reapplied", checkpoint: next }));
  }
  return Object.freeze(results);
}

function reconcilePendingLocked(ports: DriverStorePorts, batch: number): readonly ReconciliationResult[] {
  const records = auditRecords(ports.audit.read());
  const current = ports.checkpoint.read(batch);
  if (!current) return reconcileAbsentCheckpoint(ports, batch, records);
  return reconcileTransitionRecords(ports, batch, records, current);
}

export function createDriverAttemptStore(ports: DriverStorePorts): DriverAttemptStore {
  return Object.freeze({
    read(batch: number): AttemptCheckpoint | null {
      return ports.checkpoint.read(batch);
    },

    readReconciled(batch: number): AttemptCheckpoint | null {
      return ports.lock.run(() => {
        reconcilePendingLocked(ports, batch);
        return ports.checkpoint.read(batch);
      });
    },

    begin(checkpoint: AttemptCheckpoint): AttemptCheckpoint {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(checkpoint.batch);
        if (current) {
          if (current.executionId === checkpoint.executionId && current.attemptId === checkpoint.attemptId) {
            return current;
          }
          throw new AttemptStoreError("CHECKPOINT_EXISTS");
        }
        const beginId = checkpoint.lastMutationId;
        ports.audit.append(
          "SWARM_DRIVER_ATTEMPTED",
          {
            "Schema version": "1",
            "Execution ID": checkpoint.executionId,
            "Attempt ID": checkpoint.attemptId,
            "Begin ID": beginId,
            "Pre digest": "ABSENT",
            "Intended post digest": checkpoint.stateDigest,
            "Selection input digest": digestValue(checkpoint.selectionInput),
            "Probe status": "pending",
            ...attemptedFields(checkpoint),
            "Event key": eventKey("SWARM_DRIVER_ATTEMPTED", checkpoint.executionId, checkpoint.attemptId, beginId),
          },
        );
        ports.checkpoint.write(checkpoint.batch, checkpoint);
        return checkpoint;
      });
    },

    transition(transition: AttemptTransition): AttemptCheckpoint {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(transition.post.batch);
        if (!current) throw new AttemptStoreError("CHECKPOINT_MISSING");
        if (
          current.lastMutationId === transition.transitionId &&
          current.executionId === transition.executionId &&
          current.attemptId === transition.attemptId
        ) {
          return current;
        }
        const next = unwrap(applyTransition(current, transition));
        ports.audit.append("SWARM_DRIVER_TRANSITION", transitionFields(transition, next.stateDigest));
        if (transition.edge === "probe-selected" && "selectedContext" in next) {
          ports.audit.append("SWARM_DRIVER_SELECTED", {
            "Schema version": "1",
            "Execution ID": next.executionId,
            "Attempt ID": next.attemptId,
            "Transition ID": transition.transitionId,
            "Selection digest": digestValue(next.selectedContext.selection),
            "Plan digest": next.selectedContext.planDigest,
            "Probe digest": next.selectedContext.probeDigest,
            ...selectedFields(next),
            "Event key": eventKey(
              "SWARM_DRIVER_SELECTED",
              next.executionId,
              next.attemptId,
              transition.transitionId,
            ),
          });
        }
        ports.checkpoint.write(next.batch, next);
        return next;
      });
    },

    reconcileTransition(transition: AttemptTransition): ReconciliationResult {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(transition.post.batch);
        if (!current) return Object.freeze({ action: "marked-failed", checkpoint: null });
        if (current.lastMutationId === transition.transitionId) {
          return Object.freeze({ action: "already-materialized", checkpoint: current });
        }
        if (current.stateDigest !== transition.preDigest) {
          ports.audit.append(
            "SWARM_DRIVER_RECONCILED",
            {
              "Schema version": "1",
              "Execution ID": transition.executionId,
              "Attempt ID": transition.attemptId,
              "Transition ID": transition.transitionId,
              Action: "marked-failed",
            },
          );
          return Object.freeze({ action: "marked-failed", checkpoint: current });
        }
        const next = unwrap(applyTransition(current, transition));
        ports.checkpoint.write(next.batch, next);
        ports.audit.append(
          "SWARM_DRIVER_RECONCILED",
          {
            "Schema version": "1",
            "Execution ID": transition.executionId,
            "Attempt ID": transition.attemptId,
            "Transition ID": transition.transitionId,
            Action: "reapplied",
          },
        );
        return Object.freeze({ action: "reapplied", checkpoint: next });
      });
    },

    reconcileBegin(intent: AttemptBeginIntent, sideEffectsAbsent: boolean): ReconciliationResult {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(intent.batch);
        if (current?.stateDigest === intent.intendedPostDigest) {
          return Object.freeze({ action: "already-materialized", checkpoint: current });
        }
        if (current || !sideEffectsAbsent) {
          return Object.freeze({ action: "marked-failed", checkpoint: current });
        }
        ports.audit.append(
          "SWARM_DRIVER_RECONCILED",
          {
            "Schema version": "1",
            "Execution ID": intent.executionId,
            "Attempt ID": intent.attemptId,
            "Begin ID": intent.beginId,
            Action: "abandoned-unmaterialized-begin",
          },
        );
        return Object.freeze({ action: "abandoned-unmaterialized-begin", checkpoint: null });
      });
    },

    reconcilePending(batch: number): readonly ReconciliationResult[] {
      return ports.lock.run(() => reconcilePendingLocked(ports, batch));
    },

    heartbeat(input): AttemptCheckpoint {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(input.batch);
        if (!current) throw new AttemptStoreError("CHECKPOINT_MISSING");
        if (
          current.lease.leaseId !== input.leaseId ||
          current.lease.fencingToken !== input.fencingToken
        ) {
          throw new AttemptStoreError("STALE_WRITER");
        }
        const next = refreshLeaseDigest(current, input.heartbeatAt, input.expiresAt);
        ports.checkpoint.write(input.batch, next);
        return next;
      });
    },

    beginResume(input): AttemptCheckpoint {
      return ports.lock.run(() => {
        const current = ports.checkpoint.read(input.batch);
        if (!current) throw new AttemptStoreError("CHECKPOINT_MISSING");
        if (current.state !== "failed-resumable" || current.attemptId !== input.previousAttemptId) {
          throw new AttemptStoreError("CHECKPOINT_NOT_RESUMABLE");
        }
        if (
          input.recoveryVerified !== true ||
          Number.isNaN(Date.parse(input.now)) ||
          Date.parse(input.now) <= Date.parse(current.lease.expiresAt)
        ) {
          throw new AttemptStoreError("CHECKPOINT_NOT_RESUMABLE");
        }
        const selectionInput: SelectionInputSnapshot = current.selectionInput;
        const next = unwrap(
          createProbingCheckpoint({
            executionId: current.executionId,
            attemptId: input.newAttemptId,
            batch: current.batch,
            origin: "resumed",
            previousAttemptId: input.previousAttemptId,
            nonceHash: input.nonceHash,
            mutationId: input.mutationId,
            lease: {
              leaseId: input.leaseId,
              fencingToken: current.lease.fencingToken + 1,
              ownerId: input.ownerId,
              heartbeatAt: input.now,
              expiresAt: input.expiresAt,
              ...(input.ownerProcess ? { ownerProcess: input.ownerProcess } : {}),
            },
            selectionInput,
            reusedConvergedUnits: input.reusedConvergedUnits,
          }),
        );
        ports.audit.append("SWARM_DRIVER_TRANSITION", {
          "Schema version": "1",
          "Execution ID": next.executionId,
          "Attempt ID": next.attemptId,
          "Previous attempt ID": current.attemptId,
          "Transition ID": input.mutationId,
          "Transition edge": "attempt-resumed",
          "Pre digest": current.stateDigest,
          "Post digest": next.stateDigest,
          "Batch number": String(next.batch),
          "Post image": canonicalJson(next),
          "Fencing token": String(next.lease.fencingToken),
          "Event key": eventKey("SWARM_DRIVER_TRANSITION", next.executionId, next.attemptId, input.mutationId),
        });
        ports.checkpoint.write(next.batch, next);
        return next;
      });
    },

    recordNativeEvidence(evidence): void {
      ports.lock.run(() => {
        const current = ports.checkpoint.read(evidence.batch);
        if (
          !current ||
          current.executionId !== evidence.executionId ||
          current.attemptId !== evidence.attemptId ||
          (current.state !== "dispatched" && current.state !== "evidence-verified")
        ) {
          throw new AttemptStoreError("CHECKPOINT_CONFLICT");
        }
        const key = eventKey(
          "SWARM_NATIVE_EVIDENCE",
          evidence.executionId,
          evidence.attemptId,
          evidence.verdict.evidenceDigest,
        );
        if (ports.audit.hasEventKey(key)) return;
        ports.audit.append("SWARM_NATIVE_EVIDENCE", {
          "Schema version": "1",
          "Execution ID": evidence.executionId,
          "Attempt ID": evidence.attemptId,
          "Batch number": String(evidence.batch),
          Driver: evidence.driver,
          "Verdict code": evidence.verdict.code,
          Verified: String(evidence.verdict.ok),
          "Evidence digest": evidence.verdict.evidenceDigest,
          Sources: evidence.verdict.sources.join(",") || "none",
          "Unit names": evidence.verdict.completedUnits.join(",") || "none",
          "Event key": key,
        });
      });
    },
  });
}

export function checkpointPath(projectDir: string, batch: number, intent?: string, space?: string): string {
  const dir = recordDir(projectDir, intent, space);
  if (!dir) throw new AttemptStoreError("CHECKPOINT_MISSING");
  return join(dir, ".amadeus-swarm-driver", `batch-${batch}.json`);
}

export function createFileDriverAttemptStore(input: Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
}>): DriverAttemptStore {
  const checkpoint: DriverCheckpointPort = Object.freeze({
    read(batch: number): AttemptCheckpoint | null {
      const path = checkpointPath(input.projectDir, batch, input.intent, input.space);
      if (!existsSync(path)) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(path, "utf-8"));
      } catch {
        throw new AttemptStoreError("CHECKPOINT_CONFLICT");
      }
      const checkpoint = parseAttemptCheckpoint(parsed);
      if (checkpoint.type === "err") throw new AttemptStoreError("CHECKPOINT_CONFLICT");
      return checkpoint.value;
    },
    write(batch: number, value: AttemptCheckpoint): void {
      const path = checkpointPath(input.projectDir, batch, input.intent, input.space);
      mkdirSync(dirname(path), { recursive: true });
      writeFileAtomic(path, `${canonicalJson(value)}\n`);
    },
  });
  const audit: DriverAuditPort = Object.freeze({
    append(event, fields): void {
      appendAuditEntryUnlocked(event, { ...fields }, input.projectDir, input.intent, input.space);
    },
    hasEventKey(eventKey): boolean {
      return readAllAuditShards(input.projectDir, input.intent, input.space).includes(`**Event key**: ${eventKey}`);
    },
    read(): string {
      return readAllAuditShards(input.projectDir, input.intent, input.space);
    },
  });
  const lock: DriverLockPort = Object.freeze({
    run<T>(fn: () => T): T {
      return withAuditLock<T>(
        input.projectDir,
        fn as () => T extends Promise<unknown> ? never : T,
        input.intent,
        input.space,
      ) as T;
    },
  });
  return createDriverAttemptStore({ checkpoint, audit, lock });
}
