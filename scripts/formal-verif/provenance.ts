import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type ArmId, type Result } from "./contract.ts";

export type BlindState = "READY_FOR_T_AUTHORING" | "T_AUTHORING" | "T_FROZEN" | "SKELETON_REVEALED" | "SKELETON_PASSED" | "SKELETON_FAILED" | "S_AUTHORING" | "S_FROZEN" | "MANIFEST_PROMOTABLE";
export type EventKind = "ARM_AUTHORING_STARTED" | "ARM_FROZEN" | "FIXTURE_REVEALED" | "SKELETON_PASSED" | "SKELETON_FAILED";

export interface StartProof {
  publicInputHash: string;
  actualInputManifestIdentity: string;
  actualInputManifestRef: string;
  forbiddenScanReceiptIdentity: string;
  forbiddenMatchCount: 0;
  clean: true;
}

export interface FreezeProof extends StartProof {
  testsGreen: true;
  freezeSha: string;
  ownedPathsHash: string;
  testsReceiptIdentity: string;
  freezeCommitVerified: true;
}

interface EventBase {
  eventId: string;
  transactionId: string;
  at: string;
  sequence: number;
  actorId: string;
  sessionId: string;
  worktree: string;
  baseSha: string;
  publicInputHash: string;
}

export type ProvenanceEvent =
  | (EventBase & { kind: "ARM_AUTHORING_STARTED"; arm: ArmId; proof: StartProof })
  | (EventBase & { kind: "ARM_FROZEN"; arm: ArmId; proof: FreezeProof })
  | (EventBase & { kind: "FIXTURE_REVEALED"; arm: "tla"; frozenEventId: string; disclosureHash: string })
  | (EventBase & { kind: "SKELETON_PASSED"; cellResultIdentity: string; evidenceBundleHash: string })
  | (EventBase & { kind: "SKELETON_FAILED"; reason: string; evidenceBundleHash: string });

export interface ProvenanceError {
  kind: "TransitionError" | "IsolationError" | "CapacityError" | "HeadConflictError" | "TransactionCorruptionError" | "CommitUnknownError";
  message: string;
}

export interface FoldedLedger {
  state: BlindState;
  head: string | null;
  events: readonly ProvenanceEvent[];
}
export interface FoldCounters { transitions: number }

export interface CommitReceipt {
  transactionId: string;
  previousHead: string | null;
  head: string;
  eventIds: readonly string[];
}

export interface ProvenanceStorePort {
  appendBatch(expectedHead: string | null, transactionId: string, events: readonly ProvenanceEvent[]): Promise<Result<CommitReceipt, ProvenanceError>>;
  findTransaction(transactionId: string): Promise<Result<CommitReceipt | null, ProvenanceError>>;
}

function error(kind: ProvenanceError["kind"], message: string): Result<never, ProvenanceError> {
  return { ok: false, error: { kind, message } };
}

function nextState(state: BlindState, event: ProvenanceEvent): Result<BlindState, ProvenanceError> {
  if (event.kind === "ARM_AUTHORING_STARTED" && state === "READY_FOR_T_AUTHORING" && event.arm === "tla") return { ok: true, value: "T_AUTHORING" };
  if (event.kind === "ARM_FROZEN" && state === "T_AUTHORING" && event.arm === "tla") return { ok: true, value: "T_FROZEN" };
  if (event.kind === "FIXTURE_REVEALED" && state === "T_FROZEN" && event.arm === "tla") return { ok: true, value: "SKELETON_REVEALED" };
  if (event.kind === "SKELETON_PASSED" && state === "SKELETON_REVEALED") return { ok: true, value: "SKELETON_PASSED" };
  if (event.kind === "SKELETON_FAILED" && state === "SKELETON_REVEALED") return { ok: true, value: "SKELETON_FAILED" };
  if (event.kind === "ARM_AUTHORING_STARTED" && state === "SKELETON_PASSED" && event.arm === "ts") return { ok: true, value: "S_AUTHORING" };
  if (event.kind === "ARM_FROZEN" && state === "S_AUTHORING" && event.arm === "ts") return { ok: true, value: "S_FROZEN" };
  return error("TransitionError", `${event.kind} is not allowed from ${state}`);
}

function sha(value: string): boolean { return /^[0-9a-f]{64}$/.test(value); }
function repositoryReference(value: string): boolean { return value.length > 0 && !value.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) && !value.split(/[\\/]/).includes(".."); }

const BASE_KEYS = ["eventId", "transactionId", "kind", "at", "sequence", "actorId", "sessionId", "worktree", "baseSha", "publicInputHash"] as const;
function exactObject(value: unknown, keys: readonly string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validateEvent(event: ProvenanceEvent): Result<void, ProvenanceError> {
  const variantKeys = event.kind === "ARM_AUTHORING_STARTED" ? ["arm", "proof"]
    : event.kind === "ARM_FROZEN" ? ["arm", "proof"]
      : event.kind === "FIXTURE_REVEALED" ? ["arm", "frozenEventId", "disclosureHash"]
        : event.kind === "SKELETON_PASSED" ? ["cellResultIdentity", "evidenceBundleHash"]
          : event.kind === "SKELETON_FAILED" ? ["reason", "evidenceBundleHash"] : [];
  if (variantKeys.length === 0 || !exactObject(event, [...BASE_KEYS, ...variantKeys])) return error("TransitionError", "event must match one closed provenance variant");
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) return error("TransitionError", "sequence must be a non-negative integer");
  if (!event.eventId || !event.transactionId || !event.actorId || !event.sessionId || !event.worktree || !event.baseSha || !event.publicInputHash) return error("TransitionError", "event identity and continuity fields are mandatory");
  if (!sha(event.publicInputHash)) return error("IsolationError", "public input identity must be SHA-256");
  if (event.kind === "ARM_AUTHORING_STARTED" || event.kind === "ARM_FROZEN") {
    const proofKeys = event.kind === "ARM_FROZEN"
      ? ["publicInputHash", "actualInputManifestIdentity", "actualInputManifestRef", "forbiddenScanReceiptIdentity", "forbiddenMatchCount", "clean", "testsGreen", "freezeSha", "ownedPathsHash", "testsReceiptIdentity", "freezeCommitVerified"]
      : ["publicInputHash", "actualInputManifestIdentity", "actualInputManifestRef", "forbiddenScanReceiptIdentity", "forbiddenMatchCount", "clean"];
    if (!exactObject(event.proof, proofKeys)) return error("IsolationError", "complete closed authoring proof required");
    if (event.proof.publicInputHash !== event.publicInputHash || event.proof.actualInputManifestIdentity !== event.publicInputHash || !repositoryReference(event.proof.actualInputManifestRef) || !sha(event.proof.forbiddenScanReceiptIdentity) || event.proof.forbiddenMatchCount !== 0 || event.proof.clean !== true) return error("IsolationError", "input manifest or forbidden-path proof mismatch");
    if (event.kind === "ARM_FROZEN" && (event.proof.testsGreen !== true || !sha(event.proof.freezeSha) || !sha(event.proof.ownedPathsHash) || !sha(event.proof.testsReceiptIdentity) || event.proof.freezeCommitVerified !== true)) return error("IsolationError", "complete green freeze proof required");
  }
  if (event.kind === "FIXTURE_REVEALED" && (!event.frozenEventId || !sha(event.disclosureHash))) return error("IsolationError", "complete reveal proof required");
  if (event.kind === "SKELETON_PASSED" && (!sha(event.cellResultIdentity) || !sha(event.evidenceBundleHash))) return error("IsolationError", "complete skeleton pass proof required");
  if (event.kind === "SKELETON_FAILED" && (!event.reason || !sha(event.evidenceBundleHash))) return error("IsolationError", "complete skeleton failure proof required");
  return { ok: true, value: undefined };
}

export function foldLedger(events: readonly ProvenanceEvent[], counters?: FoldCounters): Result<FoldedLedger, ProvenanceError> {
  if (events.length > 6) return error("CapacityError", "ledger exceeds six events");
  const ids = new Set<string>();
  let state: BlindState = "READY_FOR_T_AUTHORING";
  let lastTime = -Infinity;
  let lastSequence = -1;
  const starts = new Map<ArmId, Extract<ProvenanceEvent, { kind: "ARM_AUTHORING_STARTED" }>>();
  const frozen = new Map<string, Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }>>();
  for (const event of events) {
    if (counters) counters.transitions++;
    if (ids.has(event.eventId)) return error("TransitionError", "duplicate event identity");
    ids.add(event.eventId);
    const checked = validateEvent(event);
    if (!checked.ok) return checked;
    const time = Date.parse(event.at);
    if (!isUtcInstant(event.at) || time > Date.now() || time < lastTime || event.sequence <= lastSequence) return error("TransitionError", "event UTC/sequence order is invalid, future, or decreasing");
    lastTime = time;
    lastSequence = event.sequence;
    const transitioned = nextState(state, event);
    if (!transitioned.ok) return transitioned;
    if (event.kind === "ARM_AUTHORING_STARTED") starts.set(event.arm, event);
    if (event.kind === "ARM_FROZEN") {
      const start = starts.get(event.arm);
      if (!start || ["actorId", "sessionId", "worktree", "baseSha", "publicInputHash"].some((key) => start[key as keyof typeof start] !== event[key as keyof typeof event])) return error("IsolationError", "freeze continuity does not match authoring start");
      frozen.set(event.eventId, event);
    }
    if (event.kind === "FIXTURE_REVEALED") {
      const referenced = frozen.get(event.frozenEventId);
      if (!referenced || referenced.arm !== "tla") return error("TransitionError", "reveal must reference the prior T freeze event");
    }
    state = transitioned.value;
  }
  return { ok: true, value: { state, head: events.at(-1)?.eventId ?? null, events } };
}

export function promotionPermission(ledger: FoldedLedger): Result<{ state: "MANIFEST_PROMOTABLE"; ledgerHead: string }, ProvenanceError> {
  if (ledger.state !== "S_FROZEN" || ledger.head === null) return error("TransitionError", "both arms are not frozen after skeleton pass");
  return { ok: true, value: { state: "MANIFEST_PROMOTABLE", ledgerHead: ledger.head } };
}

export function createTransaction(expectedHead: string | null, payloads: readonly Omit<ProvenanceEvent, "transactionId">[]): { transactionId: string; events: ProvenanceEvent[] } {
  const transactionId = canonicalIdentity({ expectedHead, payloads }, "amadeus.formal-verif.transaction.v1").sha256;
  return { transactionId, events: payloads.map((event) => ({ ...event, transactionId })) as ProvenanceEvent[] };
}
