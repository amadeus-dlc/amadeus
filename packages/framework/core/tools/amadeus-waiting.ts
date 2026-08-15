// Waiting — the terminal a non-interactive run stops at when a ruling is due
// and it may not make one (RFC-0001 FR-3, ADR-4).
//
// This module owns the CAUSE and the RATE CONSTRAINT, not the suspension. It
// computes no interactivity judgment (C3 owns that), builds no ruling
// vocabulary (amadeus-recommendation.ts owns that), and writes nothing: the
// engine hands it a cause plus what the Intent autonomy transaction ledger
// already holds, and gets back either an admission or a refusal.
//
// Keeping it free of the runtime/replay modules is deliberate — those import
// this one for the event payload type, so the dependency runs one way and the
// domain stays testable without an audit shard on disk.

import { createHash } from "node:crypto";
import {
  RecommendationOutcome,
  type NonUniqueOutcome,
  type Result,
  type RulingPresentation,
} from "./amadeus-recommendation.ts";

const SHA256 = /^sha256:[0-9a-f]{64}$/;

// The three ways a run can come to be treated as non-interactive. `undetermined`
// is the fail-closed verdict (RFC-0001: an unreadable signal is not a licence to
// keep going), and it is recorded rather than smoothed over so a human can
// contest a misclassification instead of guessing at one.
export type InteractivitySource = "human-turn-pipeline" | "headless-signal" | "undetermined";

// `interactive` is the literal `false`, so a record of an INTERACTIVE session
// entering waiting is unconstructible: the interactive arm belongs to the Stop
// hook carveout, never here.
export interface InteractivityBasis {
  readonly interactive: false;
  readonly source: InteractivitySource;
  readonly measuredAt: string;
}

// Why this run stopped, in full. Everything a human needs on resume is here,
// because the resume path re-presents this and nothing else.
export interface WaitingCause {
  readonly occurrenceId: string;
  readonly outcome: NonUniqueOutcome;
  readonly derivationTranscript: string;
  readonly basisFingerprint: string;
  readonly interactivityBasis: InteractivityBasis;
}

export interface WaitingRefusal {
  readonly reason: "malformed-cause" | "not-suspendable" | "rate-refused";
  readonly detail: string;
}

// Two escalations, no third. "Over the rate limit, therefore continue" is the
// value ADR-4 refuses to make representable.
export interface RateRefusal {
  readonly key: string;
  readonly priorWaitingId: string;
  readonly escalation: "human" | "repair";
}

export interface WaitingReceipt {
  readonly waitingId: string;
  readonly enteredAt: string;
  readonly cause: WaitingCause;
}

// One prior waiting arrival as the ledger remembers it. `resumed` is not a
// field anyone writes: it is derived by pairing an entered event with the
// resumed event that names it (see waitingEntriesOfEvents).
export interface WaitingLedgerEntry {
  readonly waitingId: string;
  readonly key: string;
  readonly resumed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The canonical form behind a basis fingerprint (ADR-11's hand-off to
// code-generation). Two derivations that differ only in how they were typed
// must hash the same, or re-emitting the same reasoning with a space added
// would buy another interruption: strings are trimmed and their internal
// whitespace collapsed, object keys are sorted, and array elements are sorted
// by their own canonical rendering. Sorting elements is safe precisely because
// meaningful order travels in explicit fields — a Candidate carries its `rank`
// — so nothing that matters is being discarded.
function canonicalForm(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value.trim().replace(/\s+/g, " "));
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalForm).sort().join(",")}]`;
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => `${JSON.stringify(key.trim())}:${canonicalForm(entry)}`)
      .sort();
    return `{${entries.join(",")}}`;
  }
  throw new Error("basis-material-not-canonicalizable");
}

export function basisFingerprintOf(material: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalForm(material), "utf8").digest("hex")}`;
}

function refuse(detail: string): Result<never, WaitingRefusal> {
  return { ok: false, error: { reason: "malformed-cause", detail } };
}

function parseInteractivityBasis(value: unknown): Result<InteractivityBasis, WaitingRefusal> {
  if (!isRecord(value)) return refuse("interactivityBasis: expected an object");
  if (value.interactive !== false) return refuse("interactivityBasis.interactive: waiting requires false");
  const source = value.source;
  if (source !== "human-turn-pipeline" && source !== "headless-signal" && source !== "undetermined") {
    return refuse("interactivityBasis.source: unknown source");
  }
  if (typeof value.measuredAt !== "string" || value.measuredAt.trim().length === 0) {
    return refuse("interactivityBasis.measuredAt: expected a non-empty timestamp");
  }
  return { ok: true, value: { interactive: false, source, measuredAt: value.measuredAt } };
}

export const WaitingCause = {
  // The write side of the persistence boundary: a plain value the Intent
  // autonomy transaction codec can carry as canonical JSON.
  serialize(cause: WaitingCause): Record<string, unknown> {
    return {
      occurrenceId: cause.occurrenceId,
      outcome: RecommendationOutcome.serialize(cause.outcome),
      derivationTranscript: cause.derivationTranscript,
      basisFingerprint: cause.basisFingerprint,
      interactivityBasis: { ...cause.interactivityBasis },
    };
  },

  // The read side. A ledger row is not type-checked (it came off disk, and a
  // hand-edited one is exactly the case worth refusing), so every invariant the
  // type expresses is re-established here.
  parse(value: unknown): Result<WaitingCause, WaitingRefusal> {
    if (!isRecord(value)) return refuse("expected an object");
    const occurrenceId = value.occurrenceId;
    if (typeof occurrenceId !== "string" || occurrenceId.trim().length === 0) {
      return refuse("occurrenceId: expected a non-empty string");
    }
    if (value.outcome === undefined) return refuse("outcome: missing");
    const outcome = RecommendationOutcome.parse(value.outcome);
    if (!outcome.ok) return refuse(`outcome: ${outcome.error.reason} at ${outcome.error.path || "<root>"}`);
    if (outcome.value.kind === "unique") {
      return refuse("outcome: a unique outcome is a decision, not a reason to wait");
    }
    const derivationTranscript = value.derivationTranscript;
    if (typeof derivationTranscript !== "string" || derivationTranscript.trim().length === 0) {
      return refuse("derivationTranscript: expected a non-empty string");
    }
    const basisFingerprint = value.basisFingerprint;
    if (typeof basisFingerprint !== "string" || !SHA256.test(basisFingerprint)) {
      return refuse("basisFingerprint: expected a sha256 digest");
    }
    if (value.interactivityBasis === undefined) return refuse("interactivityBasis: missing");
    const interactivityBasis = parseInteractivityBasis(value.interactivityBasis);
    if (!interactivityBasis.ok) return interactivityBasis;
    return {
      ok: true,
      value: {
        occurrenceId,
        outcome: outcome.value,
        derivationTranscript,
        basisFingerprint,
        interactivityBasis: interactivityBasis.value,
      },
    };
  },

  // ADR-4 Q8=B: the same ruling point reached on the same grounds. Digested
  // rather than concatenated because both halves are free-form enough for a
  // separator to be ambiguous, and the key is only ever compared, never parsed.
  rateKey(cause: WaitingCause): string {
    return basisFingerprintOf({
      occurrenceId: cause.occurrenceId,
      basisFingerprint: cause.basisFingerprint,
    });
  },

  // What the human is shown on resume. Delegated whole to the ruling
  // vocabulary: re-deriving a presentation here would be a second
  // implementation of the same contract, free to drift from the first.
  presentationOf(cause: WaitingCause): RulingPresentation {
    return RecommendationOutcome.presentationOf(cause.outcome);
  },
};

// Structural view of a runtime event, so this module never has to import the
// event union it is a member of.
interface WaitingEventLike {
  readonly type: string;
  readonly waitingId?: string;
  readonly cause?: WaitingCause;
}

// Derive the prior arrivals from a transaction's event stream, in order. An
// entered event opens an entry; the resumed event that names it closes it. A
// resumed event naming nothing on record clears nothing — a corrupt ledger must
// not be able to launder one entry's resume into another's.
export function waitingEntriesOfEvents(events: readonly WaitingEventLike[]): readonly WaitingLedgerEntry[] {
  const entries: WaitingLedgerEntry[] = [];
  for (const event of events) {
    if (event.type === "WORKFLOW_WAITING_ENTERED" && event.waitingId !== undefined && event.cause !== undefined) {
      entries.push({ waitingId: event.waitingId, key: WaitingCause.rateKey(event.cause), resumed: false });
      continue;
    }
    if (event.type !== "WORKFLOW_WAITING_RESUMED" || event.waitingId === undefined) continue;
    const index = entries.findIndex((entry) => entry.waitingId === event.waitingId && !entry.resumed);
    if (index >= 0) entries[index] = { ...entries[index]!, resumed: true };
  }
  return entries;
}

export interface AdmitWaitingInput {
  readonly cause: WaitingCause;
  readonly prior: readonly WaitingLedgerEntry[];
}

// ADR-4's rate constraint. An unresolved arrival on the same key is a repeat and
// escalates; a RESOLVED one does not block, because a resume means a human
// ruled and the behaviour the constraint exists to catch is the run that keeps
// stopping with nobody ruling. The most recent unresolved match is the one
// named, so the escalation points at the entry still open.
export function admitWaiting(input: AdmitWaitingInput): Result<void, RateRefusal> {
  const key = WaitingCause.rateKey(input.cause);
  const blocking = input.prior.filter((entry) => entry.key === key && !entry.resumed).at(-1);
  if (blocking === undefined) return { ok: true, value: undefined };
  return {
    ok: false,
    error: { key, priorWaitingId: blocking.waitingId, escalation: "human" },
  };
}
