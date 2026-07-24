// amadeus-mirror-state-store.ts — S3 Atomic File Store + S4 Audit Outbox (C3).
//
// Owns the state lock, the compare-and-set atomic transition, and the
// transactional audit outbox. The transition coordinator (`mutateMirrorStateAtomic`)
// is pure over an injected `MirrorStateStorePorts` so every commit/audit
// boundary is deterministically failure-injectable in tests without a test
// branch in production. `createMirrorStateStorePorts` is the real seam that
// reuses the existing audit lock, atomic-rename+fsync sequence, and idempotent
// ARTIFACT_UPDATED audit append. Imports the codec/reducer/repair (C3 internals)
// + C0 types + existing framework lock/audit infra; never the Gateway or
// lifecycle Mirror units.
//
// Commit-state-machine -> public WriteOutcome mapping (no C0 outcome added):
//   committed-audit-pending -> written  (business committed; outbox left for drain)
//   durability-unknown       -> io-failure (next read reconciles new/old bytes)
//   recovered (drained a pre-existing outbox) -> conflict(currentRevision)
//                              (caller re-reads + re-invokes the transition)

import {
  closeSync,
  constants as fsConstants,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  acquireAuditLock,
  readAllAuditShards,
  releaseAuditLock,
} from "./amadeus-lib.ts";
import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import type {
  MirrorAuditContext,
  MirrorAuditOutbox,
  MirrorStateSnapshot,
  WriteOutcome,
} from "./amadeus-mirror-types.ts";
import {
  type MirrorBlockRange,
  parseMirrorStateDocument,
  renderMirrorStateJson,
  writeMirrorStateDocument,
} from "./amadeus-mirror-state-codec.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
import { type MirrorTransition, reduceMirrorState } from "./amadeus-mirror-state-reducer.ts";
import { sha256Hex } from "./amadeus-mirror-repair.ts";

export type AtomicWriteResult =
  | { kind: "ok" }
  | { kind: "io-failure"; summary: string }
  | { kind: "durability-unknown"; summary: string };

export type AuditAppendResult =
  | { kind: "appended" }
  | { kind: "already-present" }
  | { kind: "conflict" }
  | { kind: "io-failure"; summary: string };

// The injected surface. The transition coordinator calls only these; failure
// injection replaces the implementations, never a branch in production code.
export interface MirrorStateStorePorts {
  acquireLock(): boolean;
  releaseLock(): void;
  readDocument(): string;
  writeDocumentAtomic(text: string): AtomicWriteResult;
  appendArtifactUpdated(outbox: MirrorAuditOutbox): AuditAppendResult;
}

export type MirrorMutateInput = Readonly<{
  transition: MirrorTransition;
  expectedRevision: number;
  auditContext: MirrorAuditContext;
  now: string;
  intentUuid: string;
}>;

// ---------------------------------------------------------------------------
// Read.
// ---------------------------------------------------------------------------

export type MirrorReadOutcome =
  | { kind: "ok"; snapshot: MirrorStateSnapshot; document: string }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "io-failure"; summary: string };

export function readMirrorState(ports: MirrorStateStorePorts): MirrorReadOutcome {
  if (!ports.acquireLock())
    return { kind: "io-failure", summary: "state lock unavailable" };
  try {
    let doc: string;
    try {
      doc = ports.readDocument();
    } catch {
      return { kind: "io-failure", summary: "state document read failed" };
    }
    const parsed = parseMirrorStateDocument(doc);
    if (parsed.kind === "invalid") return { kind: "invalid", issues: parsed.issues };
    return { kind: "ok", snapshot: parsed.snapshot, document: doc };
  } finally {
    ports.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Transaction coordinates + audit projection.
// ---------------------------------------------------------------------------

function transactionCoordinates(
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
): { eventKey: string; operationId: string } {
  if ("event" in transition) {
    const eventKey = mirrorEventKey(transition.event);
    const receipt = snapshot.receipts[eventKey];
    const operationId =
      ("operationId" in transition && typeof transition.operationId === "string"
        ? transition.operationId
        : receipt?.operationId) ?? "-";
    return { eventKey, operationId };
  }
  return { eventKey: "-", operationId: "-" };
}

function buildAuditFields(
  input: MirrorMutateInput,
  nextRevision: number,
  transactionId: string,
  digest: string,
  extra: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const ctx = input.auditContext;
  const fields: Record<string, string> = {
    Artifact: "amadeus-state.md#mirror-state",
    TransactionId: transactionId,
    Revision: String(nextRevision),
    TransitionKind: input.transition.kind,
    Digest: digest,
    TriggerBoundary: `${ctx.triggerEvent.boundary.kind}:${ctx.triggerEvent.boundary.instance}`,
    Reconciliation: String(ctx.reconciliation),
  };
  if (ctx.operationId) fields.OperationId = ctx.operationId;
  if (ctx.classification) fields.Classification = ctx.classification;
  if (extra) {
    for (const k of Object.keys(extra)) fields[k] = extra[k];
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Atomic transition coordinator (business-logic-model.md 11 steps).
// ---------------------------------------------------------------------------

export function mutateMirrorStateAtomic(
  ports: MirrorStateStorePorts,
  input: MirrorMutateInput,
): WriteOutcome {
  if (!ports.acquireLock())
    return { kind: "io-failure", summary: "state lock unavailable" };
  try {
    // (2) re-read under lock.
    let doc: string;
    try {
      doc = ports.readDocument();
    } catch {
      return { kind: "io-failure", summary: "state document read failed" };
    }
    // (3) parse; invalid => no write.
    const parsed = parseMirrorStateDocument(doc);
    if (parsed.kind === "invalid") return { kind: "invalid", issues: parsed.issues };
    const snapshot = parsed.snapshot;
    const block: MirrorBlockRange | null = parsed.block;

    // (4) drain a pre-existing outbox BEFORE the new transition.
    if (snapshot.auditOutbox) {
      return drainExistingOutbox(ports, snapshot, doc, block);
    }

    // (5) compare-and-set.
    if (snapshot.revision !== input.expectedRevision) {
      return { kind: "conflict", actualRevision: snapshot.revision };
    }

    // (6) reduce once.
    const reduced = reduceMirrorState(snapshot, input.transition, input.now);
    if (reduced.kind === "invalid") return { kind: "invalid", issues: reduced.issues };
    if (reduced.kind === "unchanged")
      return { kind: "unchanged", value: snapshot, document: doc };

    // (7..11) commit business state + outbox, then audit + clear.
    return commitTransaction(ports, input, snapshot, reduced, doc, block);
  } finally {
    ports.releaseLock();
  }
}

// (4) A pre-existing outbox is drained then cleared; the call does NOT continue
// with the new transition (recovered -> conflict at the current revision).
function drainExistingOutbox(
  ports: MirrorStateStorePorts,
  snapshot: MirrorStateSnapshot,
  doc: string,
  block: MirrorBlockRange | null,
): WriteOutcome {
  const outbox = snapshot.auditOutbox as MirrorAuditOutbox;
  const appendRes = ports.appendArtifactUpdated(outbox);
  if (appendRes.kind === "io-failure" || appendRes.kind === "conflict") {
    // committed-audit-pending: business state already durable; leave outbox.
    return { kind: "written", value: withoutOutbox(snapshot), document: doc };
  }
  const clearedSnapshot = withoutOutbox(snapshot);
  const clearedDoc = writeMirrorStateDocument(doc, block, clearedSnapshot);
  const clearRes = ports.writeDocumentAtomic(clearedDoc);
  if (clearRes.kind !== "ok") {
    // audit durable; outbox clear failed -> converge on a later call.
    return { kind: "written", value: clearedSnapshot, document: doc };
  }
  return { kind: "conflict", actualRevision: snapshot.revision };
}

// (7..11) build the transaction/outbox, re-validate, atomic-write (commit
// point), idempotent audit append, then clear the outbox.
function commitTransaction(
  ports: MirrorStateStorePorts,
  input: MirrorMutateInput,
  snapshot: MirrorStateSnapshot,
  reduced: { snapshot: MirrorStateSnapshot; auditFacts?: Readonly<Record<string, string>> },
  doc: string,
  block: MirrorBlockRange | null,
): WriteOutcome {
  const nextRevision = snapshot.revision + 1;
  const businessSnapshot: MirrorStateSnapshot = {
    ...reduced.snapshot,
    revision: nextRevision,
    auditOutbox: null,
  };
  const digest = sha256Hex(renderMirrorStateJson(businessSnapshot));
  const { eventKey, operationId } = transactionCoordinates(snapshot, input.transition);
  const transactionId = `mirror-state:${input.intentUuid}:${eventKey}:${operationId}:${input.transition.kind}:${nextRevision}:${digest}`;
  const outbox: MirrorAuditOutbox = {
    transactionId,
    digest,
    fields: buildAuditFields(input, nextRevision, transactionId, digest, reduced.auditFacts),
  };
  const committedSnapshot: MirrorStateSnapshot = { ...businessSnapshot, auditOutbox: outbox };

  // (8) re-validate invariants by re-parsing the rendered block.
  const committedDoc = writeMirrorStateDocument(doc, block, committedSnapshot);
  const reparse = parseMirrorStateDocument(committedDoc);
  if (reparse.kind !== "ok") {
    return {
      kind: "invalid",
      issues: reparse.kind === "invalid" ? reparse.issues : ["post-render reparse failed"],
    };
  }

  // (9) atomic write — commit point.
  const writeRes = ports.writeDocumentAtomic(committedDoc);
  if (writeRes.kind === "io-failure")
    return { kind: "io-failure", summary: writeRes.summary };
  if (writeRes.kind === "durability-unknown")
    return { kind: "io-failure", summary: `durability-unknown: ${writeRes.summary}` };

  // (10) idempotent audit append.
  const appendRes = ports.appendArtifactUpdated(outbox);
  if (appendRes.kind === "io-failure" || appendRes.kind === "conflict") {
    // committed-audit-pending -> written; the outbox stays for the next drain.
    return { kind: "written", value: committedSnapshot, document: committedDoc };
  }

  // (11) clear the outbox (revision-invariant maintenance write).
  const finalSnapshot: MirrorStateSnapshot = { ...businessSnapshot, auditOutbox: null };
  const finalDoc = writeMirrorStateDocument(doc, block, finalSnapshot);
  const clearRes = ports.writeDocumentAtomic(finalDoc);
  if (clearRes.kind !== "ok") {
    return { kind: "written", value: committedSnapshot, document: committedDoc };
  }
  return { kind: "written", value: finalSnapshot, document: finalDoc };
}

function withoutOutbox(snapshot: MirrorStateSnapshot): MirrorStateSnapshot {
  return { ...snapshot, auditOutbox: null };
}

// ---------------------------------------------------------------------------
// Real ports: reuse the existing audit lock + atomic rename/fsync + idempotent
// ARTIFACT_UPDATED append. This is the only I/O-bearing part of the module.
// ---------------------------------------------------------------------------

export type RealStorePortsConfig = Readonly<{
  projectDir: string;
  statePath: string;
  intent?: string;
  space?: string;
}>;

let tempCounter = 0;

// Same-directory temp write -> file fsync -> regular-file recheck -> atomic
// rename -> directory fsync. Exported for direct real-filesystem verification.
export function atomicWrite(statePath: string, text: string): AtomicWriteResult {
  const dir = dirname(statePath);
  const temp = join(dir, `.amadeus-mirror-state.${process.pid}.${tempCounter++}.tmp`);
  let fd: number;
  try {
    // O_EXCL: fresh temp, never following a symlink; owner-only permissions.
    fd = openSync(temp, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
  } catch {
    return { kind: "io-failure", summary: "temp file creation failed" };
  }
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } catch {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      rmSync(temp);
    } catch {
      /* ignore */
    }
    return { kind: "io-failure", summary: "temp write/flush failed" };
  }
  try {
    closeSync(fd);
  } catch {
    try {
      rmSync(temp);
    } catch {
      /* ignore */
    }
    return { kind: "io-failure", summary: "temp close failed" };
  }
  // Re-confirm the target is a regular file (not a symlink) before replacing it.
  try {
    const st = lstatSync(statePath);
    if (!st.isFile()) {
      try {
        rmSync(temp);
      } catch {
        /* ignore */
      }
      return { kind: "io-failure", summary: "target is not a regular file" };
    }
  } catch {
    // Target absent (first write) is acceptable; other lstat errors fall through
    // to rename, which will surface a failure.
  }
  try {
    renameSync(temp, statePath);
  } catch {
    try {
      rmSync(temp);
    } catch {
      /* ignore */
    }
    return { kind: "io-failure", summary: "atomic rename failed" };
  }
  // Directory fsync = durability commit point. Failure here leaves the new/old
  // bytes uncertain (durability-unknown), which the coordinator surfaces safely.
  try {
    const dfd = openSync(dir, "r");
    try {
      fsyncSync(dfd);
    } finally {
      closeSync(dfd);
    }
  } catch {
    return { kind: "durability-unknown", summary: "directory fsync failed" };
  }
  return { kind: "ok" };
}

function idempotentAppend(
  config: RealStorePortsConfig,
  outbox: MirrorAuditOutbox,
): AuditAppendResult {
  // The transaction id embeds the digest + revision, so a matching id implies a
  // matching payload — searching for the id is a correct idempotency check.
  let shards: string;
  try {
    shards = readAllAuditShards(config.projectDir, config.intent, config.space);
  } catch {
    return { kind: "io-failure", summary: "audit shard read failed" };
  }
  if (shards.includes(outbox.transactionId)) {
    return { kind: "already-present" };
  }
  try {
    const result = appendAuditEntryUnlocked(
      "ARTIFACT_UPDATED",
      { ...outbox.fields },
      config.projectDir,
      config.intent,
      config.space,
    );
    if (!result.appended) {
      // The intent registry has sealed the ledger (post-complete). The business
      // state is still durable; report io-failure so the outbox is retained.
      return { kind: "io-failure", summary: "audit ledger sealed" };
    }
    return { kind: "appended" };
  } catch {
    return { kind: "io-failure", summary: "audit append failed" };
  }
}

export function createMirrorStateStorePorts(
  config: RealStorePortsConfig,
): MirrorStateStorePorts {
  return {
    acquireLock: () =>
      acquireAuditLock(config.projectDir, 50, 100, config.intent, config.space),
    releaseLock: () =>
      releaseAuditLock(config.projectDir, config.intent, config.space),
    readDocument: () => readFileSync(config.statePath, "utf-8"),
    writeDocumentAtomic: (text: string) => atomicWrite(config.statePath, text),
    appendArtifactUpdated: (outbox: MirrorAuditOutbox) =>
      idempotentAppend(config, outbox),
  };
}
