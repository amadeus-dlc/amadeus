// tla-applicability.ts — U2 applicability-hold: the applicability decision
// table (C1) and the authoring hold evaluator (C9).
//
// Layering (nfr-design/logical-components.md): the pure layer below owns every
// judgement (series key derivation, the J1..J6 table, receipt construction, the
// hold table) and touches neither the filesystem nor the clock. The handler
// layer at the bottom of the file owns the model-map / evidence store / audit
// shard reads. The CLI (tla-authoring.ts) only dispatches.

import { createHash } from "node:crypto";
import type { Result } from "./contract.ts";
import type {
  AggregateDigest,
  BundleDigest,
  BundleFailure,
  CorruptedEntry,
  EvidenceBundleRef,
  EvidenceParts,
  PredecessorRef,
  StableId,
} from "./tla-evidence.ts";

// ---------------------------------------------------------------------------
// C1: applicability vocabulary
// ---------------------------------------------------------------------------

/**
 * The identifier of a *subject series*: the digest of the stable id set alone,
 * with no content in it. Selecting evidence by content digest would drop stale
 * evidence at the selection step, which is exactly what AC-006 must detect, so
 * selection (this key) and freshness (AggregateDigest) are deliberately two
 * different keys — domain-entities.md § SubjectSeriesKey.
 */
export type SubjectSeriesKey = string & { readonly __brand: "SubjectSeriesKey" };

function sha256Hex(input: Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function subjectSeriesKey(subjects: readonly string[]): SubjectSeriesKey {
  const serialized = [...new Set(subjects)]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .join("\n");
  return `sha256:${sha256Hex(new TextEncoder().encode(serialized))}` as SubjectSeriesKey;
}

export type ChangeKind = "new-subject" | "semantic-change" | "impl-only" | "non-target";

export interface ChangeDeclaration {
  readonly subjects: readonly StableId[];
  readonly kind: ChangeKind;
  readonly rationale: string;
}

/** One registered model, reduced to what the decision table consumes. */
export interface RegisteredModel {
  readonly name: string;
  readonly traceSubjects: readonly StableId[];
}

/** A read-only snapshot of the model map. `null` stands for "unreadable". */
export interface ModelMapSnapshot {
  readonly models: readonly RegisteredModel[];
}

export interface ApplicabilityInput {
  readonly subjectIdentity: AggregateDigest;
  readonly declaration: ChangeDeclaration;
  readonly registeredModels: ModelMapSnapshot | null;
}

export type ApplicabilityRoute = "author-new" | "revise-model" | "impl-only" | "non-target";

export type ApplicabilityFailure =
  | { readonly kind: "undecidable"; readonly row: string; readonly conflicts: readonly string[] }
  | { readonly kind: "missing-evidence"; readonly row: string; readonly detail: string }
  | { readonly kind: "approval-missing"; readonly route: ApplicabilityRoute };

// The consistent (kind -> route) half of the table, and its inverse. Every row
// below J2 is 1:1 with a route, so the receipt can name its row from the route
// alone (business-logic-model.md §1).
const ROUTE_ROWS: Readonly<Record<ApplicabilityRoute, string>> = {
  "non-target": "J3",
  "impl-only": "J4",
  "revise-model": "J5",
  "author-new": "J6",
};

// The four contradiction forms of J2, keyed by "<kind>:<intersects>".
const J2_FORMS: Readonly<Record<string, string>> = {
  "new-subject:true": "J2a",
  "semantic-change:false": "J2b",
  "impl-only:false": "J2c",
  "non-target:true": "J2d",
};

// The consistent counterpart of J2_FORMS, keyed the same way.
const CONSISTENT_ROUTES: Readonly<Record<string, ApplicabilityRoute>> = {
  "new-subject:false": "author-new",
  "semantic-change:true": "revise-model",
  "impl-only:true": "impl-only",
  "non-target:false": "non-target",
};

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Set intersection only — no verdict, no model success, is an input (BR-U2-02). */
function intersectsRegisteredModel(subjects: readonly StableId[], models: readonly RegisteredModel[]): boolean {
  const traced = new Set<string>(models.flatMap((model) => model.traceSubjects as readonly string[]));
  return subjects.some((subject) => traced.has(subject));
}

/** The J1..J6 table, evaluated top down; the first matching row decides. */
function judge(input: ApplicabilityInput): Result<ApplicabilityRoute, ApplicabilityFailure> {
  const { declaration, registeredModels } = input;
  if (declaration.subjects.length === 0) {
    return err<ApplicabilityFailure>({ kind: "undecidable", row: "J1", conflicts: ["empty-subject-set"] });
  }
  if (registeredModels === null) {
    return err<ApplicabilityFailure>({ kind: "missing-evidence", row: "J1", detail: "model map is unreadable" });
  }

  const key = `${declaration.kind}:${intersectsRegisteredModel(declaration.subjects, registeredModels.models)}`;
  const conflict = J2_FORMS[key];
  if (conflict !== undefined) {
    return err<ApplicabilityFailure>({ kind: "undecidable", row: "J2", conflicts: [conflict] });
  }
  // The eight (kind x intersection) keys are exhaustively split between
  // J2_FORMS and CONSISTENT_ROUTES, so this lookup cannot miss.
  return ok(CONSISTENT_ROUTES[key] as ApplicabilityRoute);
}

/** A reference to the real HUMAN_TURN that approved a terminal route. */
export interface HumanApprovalRef {
  readonly shard: string;
  readonly timestamp: string;
  readonly eventIdentity: string;
}

export interface ApplicabilityReceipt {
  readonly route: ApplicabilityRoute;
  readonly subjectIdentity: AggregateDigest;
  readonly subjectSeries: SubjectSeriesKey;
  readonly subjects: readonly StableId[];
  readonly reason: string;
  readonly judgedBy: string;
  readonly humanApproval: HumanApprovalRef | null;
  readonly generatedAt: string;
  readonly predecessor: PredecessorRef;
}

export interface ReceiptOptions {
  readonly judgedBy: string;
  readonly generatedAt: string;
  readonly predecessor: PredecessorRef;
  /** Injected provenance check: does this ref name a real HUMAN_TURN? */
  readonly verifyApproval: (approval: HumanApprovalRef) => boolean;
}

// The two routes that end the workflow on a human's word alone, so both are
// gated on a verified approval at construction time (FR-004 / FR-005).
const TERMINAL_ROUTES: ReadonlySet<string> = new Set(["impl-only", "non-target"]);

/**
 * Build the receipt for an already-judged route. A terminal route without an
 * approval, or with one that fails provenance verification, is refused here so
 * that a forged receipt never reaches the store (fail-closed upstream).
 */
function buildReceipt(
  route: ApplicabilityRoute,
  input: ApplicabilityInput,
  approval: HumanApprovalRef | null,
  options: ReceiptOptions,
): Result<ApplicabilityReceipt, ApplicabilityFailure> {
  const terminal = TERMINAL_ROUTES.has(route);
  if (terminal && (approval === null || !options.verifyApproval(approval))) {
    return err<ApplicabilityFailure>({ kind: "approval-missing", route });
  }
  const row = ROUTE_ROWS[route];
  return ok({
    route,
    subjectIdentity: input.subjectIdentity,
    subjectSeries: subjectSeriesKey(input.declaration.subjects as readonly string[]),
    subjects: input.declaration.subjects,
    reason: `${row}: ${input.declaration.kind} — ${input.declaration.rationale}`,
    judgedBy: options.judgedBy,
    humanApproval: terminal ? approval : null,
    generatedAt: options.generatedAt,
    predecessor: options.predecessor,
  });
}

export const ApplicabilityJudge = {
  subjectSeriesKey,
  judge,
  buildReceipt,
  rowForRoute: (route: ApplicabilityRoute): string => ROUTE_ROWS[route],
} as const;

// ---------------------------------------------------------------------------
// C9: the authoring hold evaluator
// ---------------------------------------------------------------------------

export type HoldReason =
  | { readonly kind: "no-applicability-receipt"; readonly subject: AggregateDigest }
  | { readonly kind: "authoring-incomplete"; readonly route: "author-new" | "revise-model" }
  | { readonly kind: "stale-evidence"; readonly recorded: AggregateDigest; readonly current: AggregateDigest };

export type HoldVerdict =
  | { readonly kind: "no-hold"; readonly basis: EvidenceBundleRef }
  | { readonly kind: "hold"; readonly reasons: readonly HoldReason[] };

export type HoldFailure =
  | { readonly kind: "evidence-unreadable"; readonly refs: readonly EvidenceBundleRef[] }
  | { readonly kind: "model-map-unreadable"; readonly detail: string }
  | { readonly kind: "corrupted-evidence"; readonly entries: readonly CorruptedEntry[] };

export interface HoldInput {
  readonly currentSeries: SubjectSeriesKey;
  readonly currentIdentity: AggregateDigest;
  readonly modelMap: ModelMapSnapshot | null;
  readonly evidenceIndex: readonly EvidenceBundleRef[];
}

export type ReadEvidence = (ref: EvidenceBundleRef) => Result<EvidenceParts, BundleFailure>;

// The applicability receipt as it is read back out of an evidence bundle. Only
// the fields the hold table consumes are narrowed; the rest stays opaque.
interface RecordedReceipt {
  readonly route: ApplicabilityRoute;
  readonly subjectIdentity: AggregateDigest;
  readonly subjectSeries: SubjectSeriesKey;
  readonly subjects: readonly StableId[];
  readonly predecessor: PredecessorRef;
}

interface SeriesEntry {
  readonly ref: EvidenceBundleRef;
  readonly kind: EvidenceParts["kind"];
  readonly receipt: RecordedReceipt;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow a receipt out of a bundle's applicability part; `null` when it is not one. */
function recordedReceipt(parts: EvidenceParts): RecordedReceipt | null {
  const applicability = parts.parts.applicability as unknown;
  if (!isRecord(applicability)) return null;
  const { route, subjectIdentity, subjectSeries, predecessor } = applicability;
  if (typeof route !== "string" || !Object.hasOwn(ROUTE_ROWS, route)) return null;
  if (typeof subjectIdentity !== "string" || typeof subjectSeries !== "string") return null;
  // A corrupted subjects array rejects the whole receipt (BR-U2-16): silently
  // dropping non-string members would let a partial subject set register and
  // release a hold that a complete read would keep.
  const rawSubjects = Array.isArray(applicability.subjects) ? applicability.subjects : [];
  if (!rawSubjects.every((subject): subject is string => typeof subject === "string")) return null;
  const subjects = rawSubjects;
  return {
    route: route as ApplicabilityRoute,
    subjectIdentity: subjectIdentity as AggregateDigest,
    subjectSeries: subjectSeries as SubjectSeriesKey,
    subjects: subjects as unknown as readonly StableId[],
    predecessor: isRecord(predecessor) && predecessor.kind === "bundle" && typeof predecessor.digest === "string"
      ? { kind: "bundle", digest: predecessor.digest as BundleDigest }
      : { kind: "root" },
  };
}

/** Chain tips: the entries no other entry of the same series supersedes. */
function seriesTips(entries: readonly SeriesEntry[]): readonly SeriesEntry[] {
  const superseded = new Set<string>(
    entries
      .map((entry) => entry.receipt.predecessor)
      .filter((predecessor): predecessor is { kind: "bundle"; digest: BundleDigest } => predecessor.kind === "bundle")
      .map((predecessor) => predecessor.digest as string),
  );
  return entries.filter((entry) => !superseded.has(entry.ref.digest as string));
}

const AUTHORING_ROUTES: ReadonlySet<string> = new Set(["author-new", "revise-model"]);

/** Is the tip's subject set traced by a registered model (registration done)? */
function registered(receipt: RecordedReceipt, modelMap: ModelMapSnapshot): boolean {
  return intersectsRegisteredModel(receipt.subjects, modelMap.models);
}

/** Judge one chain tip. `null` means the tip releases the hold. */
function tipReason(entry: SeriesEntry, input: HoldInput, modelMap: ModelMapSnapshot): HoldReason | null {
  if (entry.receipt.subjectIdentity !== input.currentIdentity) {
    return { kind: "stale-evidence", recorded: entry.receipt.subjectIdentity, current: input.currentIdentity };
  }
  if (AUTHORING_ROUTES.has(entry.receipt.route)) {
    const complete = entry.kind === "authoring-bundle" && registered(entry.receipt, modelMap);
    return complete ? null : { kind: "authoring-incomplete", route: entry.receipt.route as "author-new" | "revise-model" };
  }
  // A terminal route releases only from a terminal-route-receipt. Carried by an
  // authoring bundle it is a contradictory shape, so no releasing receipt for
  // this series exists.
  return entry.kind === "terminal-route-receipt"
    ? null
    : { kind: "no-applicability-receipt", subject: input.currentIdentity };
}

/**
 * The closed hold table of components.md §C9. Selection runs on the series key
 * and freshness on the content digest, so evidence for the same subjects with
 * changed content is *selected* and then rejected as stale rather than silently
 * dropped at the selection step (AC-006).
 */
function evaluate(input: HoldInput, readEvidence: ReadEvidence): Result<HoldVerdict, HoldFailure> {
  const modelMap = input.modelMap;
  if (modelMap === null) {
    return err<HoldFailure>({ kind: "model-map-unreadable", detail: "model map is unreadable" });
  }

  const entries: SeriesEntry[] = [];
  const unreadable: EvidenceBundleRef[] = [];
  for (const ref of input.evidenceIndex) {
    const parts = readEvidence(ref);
    if (!parts.ok) {
      unreadable.push(ref);
      continue;
    }
    const receipt = recordedReceipt(parts.value);
    if (receipt === null || receipt.subjectSeries !== input.currentSeries) continue;
    entries.push({ ref, kind: parts.value.kind, receipt });
  }
  // A store we cannot read in full is never a basis for releasing (BR-U2-16).
  if (unreadable.length > 0) return err<HoldFailure>({ kind: "evidence-unreadable", refs: unreadable });

  if (entries.length === 0) {
    return ok({ kind: "hold", reasons: [{ kind: "no-applicability-receipt", subject: input.currentIdentity }] });
  }

  const tips = seriesTips(entries);
  const reasons: HoldReason[] = [];
  for (const tip of tips) {
    const reason = tipReason(tip, input, modelMap);
    if (reason === null) return ok({ kind: "no-hold", basis: tip.ref });
    reasons.push(reason);
  }
  return ok({ kind: "hold", reasons });
}

export const AuthoringHoldEvaluator = {
  evaluate,
} as const;

// ---------------------------------------------------------------------------
// Handler layer: model-map and audit shard reads (no judgement lives here)
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL_MAP_PATH = "specs/tla/model-map.json";

/** The subjects a registered model traces, read out of the bundle it names. */
export type ResolveTraceSubjects = (digest: string) => readonly StableId[] | null;

/**
 * Read the model map as the decision table's snapshot. A registered model's
 * trace subjects come from the evidence bundle the entry names (U1 `read` on
 * the applicability part), so an entry whose bundle is unresolvable makes the
 * whole snapshot unreadable rather than a silently smaller one — a partially
 * read map would move J-rows (BR-U2-16). Entries with no bundle link yet (the
 * pre-registration state U4 fills in) contribute no trace subjects.
 */
export function readModelMapSnapshot(
  modelMapText: string,
  resolveTraceSubjects: ResolveTraceSubjects,
): ModelMapSnapshot | null {
  let document: unknown;
  try {
    document = JSON.parse(modelMapText) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(document) || !Array.isArray(document.models)) return null;

  const models: RegisteredModel[] = [];
  for (const entry of document.models) {
    if (!isRecord(entry) || typeof entry.name !== "string") return null;
    const evidence = entry.evidence;
    if (!isRecord(evidence) || typeof evidence.digest !== "string") {
      models.push({ name: entry.name, traceSubjects: [] });
      continue;
    }
    const traceSubjects = resolveTraceSubjects(evidence.digest);
    if (traceSubjects === null) return null;
    models.push({ name: entry.name, traceSubjects });
  }
  return { models };
}

/** The subjects recorded by a bundle's applicability part, or null if it has none. */
export function traceSubjectsOf(parts: EvidenceParts): readonly StableId[] | null {
  return recordedReceipt(parts)?.subjects ?? null;
}

/**
 * Provenance check for a terminal-route approval: the named audit shard must
 * hold a HUMAN_TURN record whose bytes digest to `eventIdentity` and whose
 * timestamp is the approved one. Same three-part shape the engine's advisory
 * release binds, so no new approval vocabulary is invented.
 */
export function verifyHumanApproval(shardText: string, approval: HumanApprovalRef): boolean {
  for (const line of shardText.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.startsWith("{")) continue;
    if (sha256Hex(new TextEncoder().encode(line)) !== approval.eventIdentity) continue;
    let record: unknown;
    try {
      record = JSON.parse(line) as unknown;
    } catch {
      continue;
    }
    if (!isRecord(record) || record.timestamp !== approval.timestamp) continue;
    const attributes = record.attributes;
    const named = isRecord(attributes) && attributes.Event === "HUMAN_TURN";
    if (named || record.eventName === "amadeus.human.turn") return true;
  }
  return false;
}

export type { AggregateDigest, StableId };
