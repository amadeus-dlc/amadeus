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
import type { AggregateDigest, PredecessorRef, StableId } from "./tla-evidence.ts";

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

export type { AggregateDigest, StableId };
