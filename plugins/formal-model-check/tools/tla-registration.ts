// tla-registration.ts — U4 registration-committer: the precondition gate and
// the model map's atomic replace (C6).
//
// Layering (nfr-design/logical-components.md): the pure layer below owns every
// judgement (the six-precondition parse, the bundle match, the draft-in-map
// validation, the snapshot comparison) and touches neither the filesystem nor
// the clock. The handler layer at the bottom owns the map read, the re-read and
// the temp-file + rename, and reaches them only through injected ports.
//
// The map is the single point at which a registration becomes visible: only a
// successful rename registers, and every failure leaves the previous map intact
// (business-rules.md BR-U4-01/02).

import { randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { Result } from "./contract.ts";
import { parseAuthoringProvenance, parseTlaModelMap } from "./amadeus-formal-verif-model-map.ts";
import { AUTHORING_ROUTES } from "./authoring-routes.ts";
import { verifyHumanApproval } from "./tla-applicability.ts";
import type { ApplicabilityReceipt, HumanApprovalRef } from "./tla-applicability.ts";
import type { IdentityComparison, VerifiedBundle } from "./tla-evidence.ts";
import type { CoverageProof, ProofEvidence } from "./tla-referees.ts";

// ---------------------------------------------------------------------------
// C6 vocabulary
// ---------------------------------------------------------------------------

/** The independent reviewer's receipt (FR-009). U5's review step mints it. */
export interface ReviewReceipt {
  readonly reviewer: string;
  readonly modelAuthor: string;
  readonly verdict: "READY";
  readonly reviewedAt: string;
  readonly artifactDigests: readonly string[];
}

/** The six preconditions, all present and checked — the post-gate value. */
export interface RegistrationPreconditions {
  readonly applicability: ApplicabilityReceipt;
  readonly coverage: CoverageProof;
  readonly freshness: IdentityComparison;
  readonly proof: ProofEvidence;
  readonly review: ReviewReceipt;
  readonly humanApproval: HumanApprovalRef;
}

/** What the CLI actually holds before the gate: a parsed JSON document. */
export type RegistrationPreconditionsCandidate = Readonly<Record<string, unknown>>;

export interface EvidenceBundleField {
  readonly digest: string;
}

export interface ModelMapEntryDraft {
  readonly name: string;
  readonly evidenceBundle: EvidenceBundleField;
  readonly authoringProvenance: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export interface ModelMapSnapshot {
  readonly bytes: string;
  readonly document: Readonly<Record<string, unknown>>;
}

export interface RegistrationReceipt {
  readonly entryName: string;
  readonly bundle: EvidenceBundleField;
  readonly registeredAt: string;
}

export type PreconditionFailure =
  | {
      readonly kind: "precondition-missing";
      readonly precondition: "applicability-route" | "coverage" | "proof" | "review";
    }
  | { readonly kind: "stale-evidence"; readonly recorded: string; readonly current: string }
  | { readonly kind: "reviewer-not-independent"; readonly reviewer: string; readonly modelAuthor: string }
  | { readonly kind: "approval-provenance-invalid" };

export type RegistrationFailure =
  | { readonly kind: "preconditions-failed"; readonly failures: readonly PreconditionFailure[] }
  | { readonly kind: "validator-rejected"; readonly detail: string }
  | { readonly kind: "revise-target-missing"; readonly name: string }
  | { readonly kind: "concurrent-modification" }
  | { readonly kind: "io-failure"; readonly detail: string };

/** The two routes a registration can arrive on, and the two the composer serves. */
export type AuthoringRoute = "author-new" | "revise-model";

const BUNDLE_DIGEST = /^sha256:[0-9a-f]{64}$/;

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && keys.every((key) => value[key] !== undefined);
}

// ---------------------------------------------------------------------------
// Pure layer: the precondition gate (business-logic-model.md §1 step 1)
// ---------------------------------------------------------------------------

function checkApplicability(value: unknown, failures: PreconditionFailure[]): void {
  const routed = isRecord(value) && typeof value.route === "string" && AUTHORING_ROUTES.has(value.route);
  if (!routed) failures.push({ kind: "precondition-missing", precondition: "applicability-route" });
}

function checkCoverage(value: unknown, failures: PreconditionFailure[]): void {
  const proven = isRecord(value) && value.__brand === "CoverageProof";
  if (!proven) failures.push({ kind: "precondition-missing", precondition: "coverage" });
}

// An absent comparison is reported as stale rather than missing: the failure
// union names no freshness precondition, and "not proven current" is exactly
// what stale means here (domain-entities.md § PreconditionFailure).
function checkFreshness(value: unknown, failures: PreconditionFailure[]): void {
  if (isRecord(value) && value.kind === "current") return;
  const recorded = isRecord(value) && typeof value.recorded === "string" ? value.recorded : "";
  const current = isRecord(value) && typeof value.current === "string" ? value.current : "";
  failures.push({ kind: "stale-evidence", recorded, current });
}

const PROOF_KEYS = ["tlcExploration", "fallingProofs", "vacuityProof", "reductionEvidence", "boundIdentity"];

function checkProof(value: unknown, failures: PreconditionFailure[]): void {
  const present = hasKeys(value, PROOF_KEYS);
  if (!present) failures.push({ kind: "precondition-missing", precondition: "proof" });
}

// READY is the only verdict a receipt can carry into the gate, and the reviewer
// must be a different, named person from the model's author (FR-009,
// BR-U4-10 — either name being empty fails the same way).
function checkReview(value: unknown, failures: PreconditionFailure[]): void {
  if (!isRecord(value) || value.verdict !== "READY") {
    failures.push({ kind: "precondition-missing", precondition: "review" });
    return;
  }
  const reviewer = typeof value.reviewer === "string" ? value.reviewer : "";
  const modelAuthor = typeof value.modelAuthor === "string" ? value.modelAuthor : "";
  if (reviewer === "" || modelAuthor === "" || reviewer === modelAuthor) {
    failures.push({ kind: "reviewer-not-independent", reviewer, modelAuthor });
  }
}

const APPROVAL_KEYS = ["shard", "timestamp", "eventIdentity"];

function checkApproval(
  value: unknown,
  verifyApproval: (approval: HumanApprovalRef) => boolean,
  failures: PreconditionFailure[],
): void {
  const verified = hasKeys(value, APPROVAL_KEYS) && verifyApproval(value as unknown as HumanApprovalRef);
  if (!verified) failures.push({ kind: "approval-provenance-invalid" });
}

/**
 * Parse the candidate into the checked value, collecting every failing
 * precondition instead of stopping at the first (BR-U4-08..11, BR-U4-15).
 */
export function checkPreconditions(
  candidate: RegistrationPreconditionsCandidate,
  verifyApproval: (approval: HumanApprovalRef) => boolean,
): Result<RegistrationPreconditions, readonly PreconditionFailure[]> {
  const failures: PreconditionFailure[] = [];
  checkApplicability(candidate.applicability, failures);
  checkCoverage(candidate.coverage, failures);
  checkFreshness(candidate.freshness, failures);
  checkProof(candidate.proof, failures);
  checkReview(candidate.review, failures);
  checkApproval(candidate.humanApproval, verifyApproval, failures);
  if (failures.length > 0) return err(failures);
  return ok(candidate as unknown as RegistrationPreconditions);
}

// ---------------------------------------------------------------------------
// Pure layer: draft admission and map composition (steps 2 and 3)
// ---------------------------------------------------------------------------

function rejected(detail: string): Result<never, RegistrationFailure> {
  return err<RegistrationFailure>({ kind: "validator-rejected", detail });
}

/**
 * Admit a candidate entry. The evidence reference is what makes a registration
 * mean "checked evidence exists", so an authoring draft without one is refused
 * before anything is composed (BR-U4-05). Everything else about the entry is
 * the existing validator's business, once the draft sits in the whole map.
 */
export function parseEntryDraft(value: unknown): Result<ModelMapEntryDraft, RegistrationFailure> {
  if (!isRecord(value) || typeof value.name !== "string" || value.name === "") {
    return rejected("draft must be an object with a name");
  }
  const bundle = value.evidenceBundle;
  if (!isRecord(bundle) || typeof bundle.digest !== "string" || !BUNDLE_DIGEST.test(bundle.digest)) {
    return rejected("draft must carry evidenceBundle.digest as sha256:<hex64>");
  }
  if (!("authoringProvenance" in value)) {
    return rejected("draft must carry authoringProvenance");
  }
  const provenance = parseAuthoringProvenance(value.authoringProvenance);
  if (!provenance.ok) return rejected(provenance.error.detail);
  return ok(value as unknown as ModelMapEntryDraft);
}

/** Read the map as the snapshot both the composition and the conflict check use. */
export function parseModelMapSnapshot(bytes: string): Result<ModelMapSnapshot, RegistrationFailure> {
  const parsed = parseTlaModelMap(new TextEncoder().encode(bytes));
  if (!parsed.ok) return rejected(parsed.error.detail);
  // The validator decoded these very bytes as JSON already, so this parse is
  // a re-read of a known-good document rather than a second validation.
  const document: unknown = JSON.parse(bytes);
  if (!isRecord(document)) return rejected("model map must be a JSON object");
  return ok({ bytes, document });
}

// author-new adds an entry the map does not have yet, so the draft joins the
// existing ones and the whole list is put back in name order.
function appended(models: readonly unknown[], draft: ModelMapEntryDraft): readonly unknown[] {
  return [...models, draft].sort((left, right) => {
    const leftName = (left as { name: string }).name;
    const rightName = (right as { name: string }).name;
    return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
  });
}

// revise-model rewrites an entry that is already registered, so the draft takes
// the place of the one carrying its name — and a name the map does not carry is
// refused rather than appended, which is the fail-open this closes (FR-REG-2).
// A second entry of the same name cannot exist: the snapshot was validated, and
// unique names are one of the map's invariants.
function revised(
  models: readonly unknown[],
  draft: ModelMapEntryDraft,
): Result<readonly unknown[], RegistrationFailure> {
  const target = models.findIndex((entry) => (entry as { name?: unknown }).name === draft.name);
  if (target < 0) return err<RegistrationFailure>({ kind: "revise-target-missing", name: draft.name });
  const composed = [...models];
  composed[target] = draft;
  return ok(composed);
}

/**
 * Compose the bytes a successful registration would publish and run the whole
 * map — not the draft alone — through the existing validator, so cross-entry
 * invariants (unique, sorted names) are closed before anything is written
 * (business-logic-model.md §1 step 3). The existing entries are re-serialized
 * from their own parsed objects, so their bytes are preserved (BR-U4-17).
 *
 * What the draft does to the map is the route's business: author-new appends,
 * revise-model replaces by name. The route is required rather than defaulted so
 * a caller cannot reach one arm by forgetting the other (FR-REG-1).
 */
export function composeRegisteredMap(
  snapshot: ModelMapSnapshot,
  draft: ModelMapEntryDraft,
  route: AuthoringRoute,
): Result<string, RegistrationFailure> {
  const models = snapshot.document.models;
  if (!Array.isArray(models)) return rejected("model map must hold a models array");
  const composed = route === "revise-model" ? revised(models, draft) : ok(appended(models, draft));
  if (!composed.ok) return composed;
  const bytes = `${JSON.stringify({ ...snapshot.document, models: composed.value }, null, 2)}\n`;
  const validated = parseTlaModelMap(new TextEncoder().encode(bytes));
  return validated.ok ? ok(bytes) : rejected(validated.error.detail);
}

// ---------------------------------------------------------------------------
// Handler layer: the map's reads, the re-read and the atomic replace
// ---------------------------------------------------------------------------

export interface RegistrationPorts {
  /** The map as it is right now. Called twice: for the snapshot and the re-read. */
  readonly readMapBytes: () => string;
  /** Write the whole map through a temp file and rename it into place. */
  readonly publish: (bytes: string) => void;
  /** The audit shard the approval names, for the second provenance check. */
  readonly readShard: (shard: string) => string;
  readonly now: () => string;
}

export interface RegistrationPortOptions {
  readonly mapPath: string;
  readonly now?: () => string;
}

export function createRegistrationPorts(options: RegistrationPortOptions): RegistrationPorts {
  const { mapPath } = options;
  return {
    readMapBytes: () => readFileSync(mapPath, "utf8"),
    publish: (bytes: string) => {
      // The rename is the registration's only visible moment: a reader sees
      // either the old map or the new one, never a half-written file.
      const staging = `${mapPath}.${randomUUID()}.tmp`;
      try {
        writeFileSync(staging, bytes);
        renameSync(staging, mapPath);
      } catch (cause) {
        try {
          rmSync(staging, { force: true });
        } catch {
          // Best-effort cleanup — the rethrown cause below carries the real failure.
        }
        throw cause;
      }
    },
    readShard: (shard: string) => readFileSync(shard, "utf8"),
    now: options.now ?? (() => new Date().toISOString()),
  };
}

function ioFailure(cause: unknown): Result<never, RegistrationFailure> {
  return err<RegistrationFailure>({
    kind: "io-failure",
    detail: cause instanceof Error ? cause.message : String(cause),
  });
}

// A shard that cannot be read proves nothing, so it fails the check rather
// than throwing out of the gate (fail-closed). Exported so a caller that stops
// before `commit` can still run the same six-precondition gate.
export function approvalVerifier(ports: RegistrationPorts): (approval: HumanApprovalRef) => boolean {
  return (approval) => {
    try {
      return verifyHumanApproval(ports.readShard(approval.shard), approval);
    } catch {
      return false;
    }
  };
}

/**
 * Register the draft: check the six preconditions, match the draft against the
 * verified bundle, validate the whole map, refuse a map another writer changed
 * since the snapshot, and only then replace it (business-logic-model.md §1).
 */
function commit(
  draftValue: unknown,
  bundle: VerifiedBundle,
  candidate: RegistrationPreconditionsCandidate,
  ports: RegistrationPorts,
): Result<RegistrationReceipt, RegistrationFailure> {
  const checked = checkPreconditions(candidate, approvalVerifier(ports));
  if (!checked.ok) return err<RegistrationFailure>({ kind: "preconditions-failed", failures: checked.error });

  const draft = parseEntryDraft(draftValue);
  if (!draft.ok) return draft;
  if (draft.value.evidenceBundle.digest !== bundle.ref.digest) {
    return rejected(`draft evidenceBundle ${draft.value.evidenceBundle.digest} is not the verified bundle`);
  }

  let snapshotBytes: string;
  try {
    snapshotBytes = ports.readMapBytes();
  } catch (cause) {
    return ioFailure(cause);
  }
  const snapshot = parseModelMapSnapshot(snapshotBytes);
  if (!snapshot.ok) return snapshot;

  // Precondition (a) already parsed this into one of the two authoring routes,
  // so this carries that checked fact to the composer rather than deciding it
  // a second time.
  const route = checked.value.applicability.route as AuthoringRoute;
  const composed = composeRegisteredMap(snapshot.value, draft.value, route);
  if (!composed.ok) return composed;

  try {
    if (ports.readMapBytes() !== snapshot.value.bytes) {
      return err<RegistrationFailure>({ kind: "concurrent-modification" });
    }
    ports.publish(composed.value);
  } catch (cause) {
    return ioFailure(cause);
  }

  return ok({
    entryName: draft.value.name,
    bundle: draft.value.evidenceBundle,
    registeredAt: ports.now(),
  });
}

export const RegistrationCommitter = {
  commit,
} as const;
