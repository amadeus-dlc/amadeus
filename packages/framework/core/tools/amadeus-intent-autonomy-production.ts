// Production adapter for Intent-scoped autonomy (#2067).
//
// The domain modules deliberately own no filesystem or workflow-engine policy.
// This adapter is the single bridge used by the orchestrator, the approval
// transaction, and the human mode command. Harnesses consume the same projected
// Core file; no harness-specific autonomy branch is permitted here.

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import {
  ALL_INTERACTION_KINDS,
  CONSTRUCTION_AUTONOMY_MODE_FIELD,
  autonomyDigest,
  autonomyStableId,
  firesWalkingSkeletonGate,
  autonomyScopeFingerprint,
  authorizeInteraction,
  recommendationBasisFingerprint,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  nonFullCommandDisplayDigest,
  normalizeDecisionPolicies,
  projectConstructionAutonomy,
  SEMI_ROUTINE_INTERACTIONS,
  type AutonomyMode,
  type AutonomyProjection,
  type DecisionPolicyInput,
  type DecisionFact,
  type EffectClassification,
  type GrantScopeDescriptor,
  type HumanAutonomyCommand,
  type InteractionKind,
  type SemiAuthorityScope,
  type SkeletonStance,
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  resolveIntentQualityActivation,
  type AutonomyDecisionResult,
  type IntentAutonomyCoordinator,
} from "./amadeus-intent-autonomy-runtime.ts";
import {
  createAuditIntentAutonomyRepository,
  readIntentAutonomyTransactionsFromAudit,
} from "./amadeus-intent-autonomy-replay.ts";
import { resumeInterruption, type WaitingCause } from "./amadeus-waiting.ts";
import {
  RecommendationOutcome,
  type Candidate,
  type NonUniqueOutcome,
  type UniqueOutcome,
} from "./amadeus-recommendation.ts";
import type { HoldReason } from "./amadeus-election-model.ts";
import {
  createFirstPartyQualityContribution,
  emptyQualityPluginProjection,
  qualityDigest,
  qualityStableId,
  type QualityEvidenceBatchInput,
} from "./amadeus-quality-repair.ts";
import {
  createQualityRepairCoordinator,
  type QualityRepairRepository,
  type QualityReplanPort,
} from "./amadeus-quality-repair-runtime.ts";
import { createAuditQualityRepairRepository } from "./amadeus-quality-repair-replay.ts";
import type { emitAuditEvent as EmitAuditEvent } from "../otel/audit-emit.ts";
import type { JudgePort } from "./amadeus-loop-monitor-runtime.ts";
import {
  activeIntent,
  activeIntentUuid,
  activeSpace,
  auditBlockField,
  auditShards,
  findAllEvents,
  getField,
  humanActedSinceGate,
  listIntentDirs,
  listIntents,
  outstandingHumanTurns,
  splitAuditRecords,
  readAllAuditShards,
  readStateFile,
  SKELETON_ON_SCOPES,
  setFieldStrict,
  setOrInsertField,
  withAuditLock,
  writeStateFile,
} from "./amadeus-lib.ts";

// What a mode auto-decides. Derived from the two existing constants rather than
// restated, so the pair a semi Intent leaves to the human moves whenever
// SEMI_ROUTINE_INTERACTIONS moves (FR-2b, BR-U1-7).
function autoDecidedKinds(mode: AutonomyMode): readonly InteractionKind[] {
  if (mode === "full") return ALL_INTERACTION_KINDS;
  if (mode === "semi") return SEMI_ROUTINE_INTERACTIONS;
  return [];
}

// The complement: the kinds this mode still stops on. Reading it off the preview
// is how a human sees, before granting, which gates stay theirs.
export function nonAutoDecidedKinds(mode: AutonomyMode): readonly InteractionKind[] {
  const decided = autoDecidedKinds(mode);
  return ALL_INTERACTION_KINDS.filter((kind) => !decided.includes(kind));
}

// The stance the walking-skeleton ceremony runs under (RFC-0001 FR-10). Reading
// it needs state, which is why the resolution lives here and only the resolved
// meaning lives in the pure layer.
//
// `scope-dependent`, an unrecognised value and an absent field all resolve
// through SKELETON_ON_SCOPES — the same canonical mapping the engine's own
// gate:"unresolved" fallback uses, so the two can never disagree about which
// scopes are greenfield. A record this cannot read at all, or one with no Scope
// row, keeps the ceremony with the human (R-20).
function resolveSkeletonStance(stateContent: string | null): SkeletonStance {
  if (stateContent === null) return "on";
  const raw = getField(stateContent, "Skeleton Stance")?.trim().toLowerCase();
  if (raw === "on" || raw === "off") return raw;
  const scope = getField(stateContent, "Scope")?.trim();
  if (!scope) return "on";
  return SKELETON_ON_SCOPES.has(scope) ? "on" : "off";
}

export function skeletonGateFiresFor(stateContent: string | null): boolean {
  return firesWalkingSkeletonGate(resolveSkeletonStance(stateContent));
}

// The state a projectDir currently holds, or null when there is none to read.
// An unreadable record is a legitimate branch for the stance resolution above
// (it falls to the human side); it is not an error to raise from here.
function stateContentOrNull(projectDir: string): string | null {
  try {
    return readStateFile(projectDir);
  } catch {
    return null;
  }
}

// Exported so a caller that builds its own option effects can prove, in a test
// it owns, that the classification it assigns to a refusable option is still
// one this scope forbids (#2253 FR-ADV-4 secondary barrier).
export const PROHIBITED_EFFECTS = [
  "new-permission",
  "irreversible",
  "scope-out",
  "norm-waiver",
  "quality-waiver",
] as const;

export interface ProductionAutonomyContext {
  readonly mode: AutonomyMode;
  readonly autoApprove: boolean;
  readonly grantId: string | null;
  readonly authorizationReason: string;
  readonly qualityRepair: "active" | "disabled" | "error";
  // What KIND of interaction this gate is, and whether authorization declared it
  // one a human must answer. Both are answers this module already computes; the
  // approval transaction consumes them instead of deriving its own (#3153,
  // cg2-agreeing-predicate-drift).
  readonly interactionKind: InteractionKind;
  readonly humanRequired: boolean;
}

type ResolvedIntent = {
  readonly space: string;
  readonly intentDir: string;
  readonly intentUuid: string;
};

const LEGACY_STANDING_GRANT_AUDIT_EVENTS = [
  "GRANT_ISSUED",
  "GRANT_REVOKED",
  "GATE_AUTHORIZATION_SELECTED",
] as const;

function resolveIntent(projectDir: string, intent?: string, requestedSpace?: string): ResolvedIntent | null {
  const space = requestedSpace ?? activeSpace(projectDir);
  const intentDir = activeIntent(projectDir, space, intent);
  const intentUuid = intent === undefined
    ? activeIntentUuid(projectDir, space)
    : listIntents(projectDir, space).find((candidate) => candidate.dirName === intentDir)?.uuid ?? null;
  return intentDir === null || intentUuid === null ? null : { space, intentDir, intentUuid };
}

function coordinatorFor(projectDir: string, resolved: ResolvedIntent): IntentAutonomyCoordinator {
  const audit = readAllAuditShards(projectDir, resolved.intentDir, resolved.space);
  const legacyModeHistory = findAllEvents(audit, "AUTONOMY_MODE_SET").length > 0;
  const legacyStandingGrants = findAllEvents(audit, LEGACY_STANDING_GRANT_AUDIT_EVENTS[0]).flatMap((row) => {
    const grantId = auditBlockField(row.block, "Grant Id");
    if (grantId === null) return [];
    return [{
      eventIdentity: autonomyDigest({ event: "GRANT_ISSUED", grantId, timestamp: row.timestamp }),
      grantId,
      observedState: legacyModeHistory ? "legacy-standing-grant-with-mode-history" : "legacy-standing-grant",
    }];
  });
  const repository = createAuditIntentAutonomyRepository({
    projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
    audit,
  });
  return createIntentAutonomyCoordinator({
    initialProjection: createAutonomyProjection({
      intentUuid: resolved.intentUuid,
      legacyStandingGrants,
    }),
    repository,
  });
}

export function readProductionAutonomyProjection(
  projectDir: string,
  intent?: string,
  space?: string,
): AutonomyProjection | null {
  const resolved = resolveIntent(projectDir, intent, space);
  return resolved === null ? null : coordinatorFor(projectDir, resolved).readProjection();
}

interface CommitProductionIntentCompletionInput {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
}

export function commitProductionIntentCompletion(input: CommitProductionIntentCompletionInput): { readonly ok: true; readonly result: Exclude<ReturnType<IntentAutonomyCoordinator["complete"]>, { readonly error: string }> } |
  { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir, input.intent, input.space);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const result = coordinatorFor(input.projectDir, resolved).complete();
  return "error" in result ? { ok: false, error: result.error } : { ok: true, result };
}

// The single point where a stage becomes an interaction KIND. Both call sites
// that assemble `walkingSkeleton` (amadeus-state.ts's gate approval and
// amadeus-orchestrate.ts's directive decoration) reach the ceremony through
// here, and so does the refusal recorder below — which is why the stance gate
// belongs here and not at either supply point (RFC-0001 R-17a). The suppliers
// keep answering only "is this the first in-scope Construction stage?"; whether
// that stage carries the ceremony is the stance's answer.
interface InteractionKindInput {
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
  readonly skeletonGateFires: boolean;
}

function interactionKind(input: InteractionKindInput): InteractionKind {
  if (input.walkingSkeleton && input.skeletonGateFires) return "walking-skeleton";
  return input.phaseBoundary ? "phase-gate" : "stage-gate";
}

interface OccurrenceInput {
  readonly projection: AutonomyProjection;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
  readonly skeletonGateFires: boolean;
}

function occurrence(input: OccurrenceInput) {
  const kind = interactionKind(input);
  return createInteractionOccurrence({
    intentUuid: input.projection.intentUuid,
    kind,
    stage: kind === "phase-gate" ? null : input.stage,
    phase: input.phase,
    bolt: null,
    interactionId: `${kind}-${input.stage}`,
    selector: `${kind}-${input.stage}`,
    question: `Approve ${kind} ${input.stage}`,
    optionIds: ["approve", "request-changes"],
    graphRevision: input.graphRevision,
  });
}

function qualityState(projection: AutonomyProjection): ProductionAutonomyContext["qualityRepair"] {
  const activation = resolveIntentQualityActivation({
    autonomy: projection,
    qualityProjection: emptyQualityPluginProjection(projection.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  return activation.kind;
}

export interface ProductionStageAutonomyInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}

// What the active mode can do with one stage gate. A READ, and only a read
// (#3152): the orchestrator asks this on every `next` and the approval
// transaction asks it on every attempt, so a ledger write here recorded "a
// human was required" once per question rather than once per gate. The
// declaration is written from the gate open instead — see
// recordAutonomyRefusalAtGateOpen.
export function productionStageAutonomy(input: ProductionStageAutonomyInput): ProductionAutonomyContext {
  const skeletonGateFires = skeletonGateFiresFor(stateContentOrNull(input.projectDir));
  const kind = interactionKind({ ...input, skeletonGateFires });
  const projection = readProductionAutonomyProjection(input.projectDir);
  if (projection === null) {
    return {
      mode: "none",
      autoApprove: false,
      grantId: null,
      authorizationReason: "intent-autonomy-unavailable",
      qualityRepair: "disabled",
      interactionKind: kind,
      humanRequired: false,
    };
  }
  const authorization = authorizeProductionOccurrence(
    projection,
    occurrence({ ...input, projection, skeletonGateFires }),
    "intent",
  );
  const qualityRepair = qualityState(projection);
  return {
    mode: projection.mode,
    autoApprove: authorization.authorized && qualityRepair !== "error",
    grantId: projection.currentGrant?.grantId ?? null,
    authorizationReason: authorization.reason,
    qualityRepair,
    interactionKind: kind,
    // An Intent whose autonomy cannot be read declares nothing; only an
    // authorization that came back human-required is a declaration.
    humanRequired: !authorization.authorized,
  };
}

// The two reasons authorizeInteraction can refuse with. Anything else reaching
// the emitter is a reason nobody declared, and inventing a row for it would put
// a value in the ledger that no reader has a meaning for.
const REFUSAL_REASONS = ["SCOPE_OUT", "MODE_REQUIRES_HUMAN"] as const;

/** What stopped a run short of a decision. Declared at module scope so the
 *  type-only lines carry no in-body coverage records. */
type AuthorizationRefusal = {
  readonly kind: InteractionKind;
  readonly stage: string;
  readonly reason: string;
  readonly mode: AutonomyMode;
  readonly idempotencyKey: string;
};

// The events that END a presentation. A gate stops being open the moment it is
// resolved, either way.
const GATE_RESOLUTION_EVENTS = ["GATE_APPROVED", "GATE_REJECTED"] as const;

/** The coordinates one refusal row is keyed by. Declared at module scope so the
 *  type-only lines carry no in-body coverage records. */
type RefusalIdentity = {
  readonly occurrence: ReturnType<typeof occurrence>;
  readonly mode: AutonomyMode;
  readonly presentationEpoch: number;
};

// The identity of one refusal row, minted HERE and nowhere else so no second
// site can decide what "the same refusal" means (ADR-2 contract 1).
//
// Two halves, and both are load-bearing:
//
//   the occurrence — occurrenceId already folds intentUuid, kind, stage, phase,
//     bolt, interactionId, optionIds and graphRevision; the selector is added
//     because occurrenceId does not carry it — plus the mode that could not
//     decide it, since a mode change is a different answer about the same gate;
//   the presentation epoch — WHICH presentation of that occurrence this is,
//     counted as the number of times this gate has already been RESOLVED.
//
// The epoch is what makes the count mean "how often was a human stopped here".
// Re-opening a gate nobody has answered yet — a retried gate-start, a backfilled
// gate row — shares the epoch and collapses onto the existing row; a legitimate
// re-presentation after a rejection sits in the next epoch and is a new stop, so
// it earns a row of its own.
function refusalIdempotencyKey(identity: RefusalIdentity): string {
  return autonomyStableId("autonomy-refusal", [
    identity.occurrence.occurrenceId,
    identity.occurrence.selector,
    identity.mode,
    identity.occurrence.graphRevision,
    identity.presentationEpoch,
  ]);
}

function gateResolutionCount(audit: string, stage: string): number {
  return GATE_RESOLUTION_EVENTS.reduce(
    (total, event) =>
      total + findAllEvents(audit, event).filter((row) => auditBlockField(row.block, "Stage") === stage).length,
    0,
  );
}

// Whether this exact refusal is already on the ledger. Scoped to the Intent's
// own shards, like every other replay in this file: cross-clone uniqueness is
// not claimed, and a shard that cannot be read yields no match, which lets the
// row land twice rather than letting a read failure suppress it.
function refusalAlreadyRecorded(audit: string, idempotencyKey: string): boolean {
  return findAllEvents(audit, "INTENT_AUTONOMY_HUMAN_REQUIRED")
    .some((row) => auditBlockField(row.block, "Idempotency Key") === idempotencyKey);
}

// The gate whose opening is being recorded. The caller names the record rather
// than letting this resolve one: a gate may be opened for a record that is NOT
// the one the active cursor points at (a reserved owner Intent), and the row
// belongs beside the STAGE_AWAITING_APPROVAL it explains, not beside whatever
// the cursor happens to select. The caller's `stateContent` is passed in for the
// same reason.
export interface GateOpenRefusalInput extends ProductionStageAutonomyInput {
  readonly stateContent: string;
  readonly intent?: string;
  readonly space?: string;
}

// The gate has just been opened, so a mode that cannot decide it is stopping a
// human right here — and this is where that stop is recorded (#3152). Callers
// emit the STAGE_AWAITING_APPROVAL this row explains and hold that transaction's
// lock, so the two land together or not at all.
//
// Fail-open end to end: the refusal is already the safe answer and the gate is
// on its way to the human, so nothing about recording it may raise.
export function recordAutonomyRefusalAtGateOpen(input: GateOpenRefusalInput): void {
  try {
    const resolved = resolveIntent(input.projectDir, input.intent, input.space);
    if (resolved === null) return;
    const projection = coordinatorFor(input.projectDir, resolved).readProjection();
    const skeletonGateFires = skeletonGateFiresFor(input.stateContent);
    const target = occurrence({ ...input, projection, skeletonGateFires });
    const authorization = authorizeProductionOccurrence(projection, target, "intent");
    if (authorization.authorized) return;
    const audit = readAllAuditShards(input.projectDir, resolved.intentDir, resolved.space);
    const idempotencyKey = refusalIdempotencyKey({
      occurrence: target,
      mode: projection.mode,
      presentationEpoch: gateResolutionCount(audit, input.stage),
    });
    if (refusalAlreadyRecorded(audit, idempotencyKey)) return;
    emitAuthorizationRefusal(input.projectDir, {
      kind: target.kind,
      stage: input.stage,
      reason: authorization.reason,
      mode: projection.mode,
      idempotencyKey,
    }, input.intent, input.space);
  } catch (cause) {
    console.error(
      `amadeus: could not record why autonomy stopped at the "${input.stage}" gate — the gate is unaffected: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

// Why the run stopped, written where the rest of the Intent's history lives.
//
// Fail-open, and ONLY here: an audit shard that cannot be written must not turn
// a refusal into an error, because the refusal itself is the safe answer and the
// caller is already on its way to the human gate. Every other failure mode in
// this file stays fail-closed.
//
// The emitter is required lazily — a module-scope import would pull the OTel
// graph into every authorization — and bound through the type-only import above
// so the cast stays on one line.
function emitAuthorizationRefusal(
  projectDir: string,
  refusal: AuthorizationRefusal,
  intent?: string,
  space?: string,
): void {
  if (!REFUSAL_REASONS.some((known) => known === refusal.reason)) return;
  try {
    const otel = require("../otel/audit-emit.ts") as { emitAuditEvent: typeof EmitAuditEvent };
    const result = otel.emitAuditEvent("INTENT_AUTONOMY_HUMAN_REQUIRED", {
      "Interaction Kind": refusal.kind,
      "Stage slug": refusal.stage,
      Reason: refusal.reason,
      Mode: refusal.mode,
      "Idempotency Key": refusal.idempotencyKey,
    }, projectDir, intent, space);
    if (!result.appended) console.error(`amadeus: could not record why autonomy stopped (${refusal.reason}) — the gate is unaffected`);
  } catch (cause) {
    console.error(
      `amadeus: could not record why autonomy stopped (${refusal.reason}) — the gate is unaffected: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

function authorizeProductionOccurrence(
  projection: AutonomyProjection,
  target: ReturnType<typeof occurrence>,
  scopeId: string,
): { readonly authorized: boolean; readonly reason: string } {
  const authorization = authorizeInteraction(projection, target, semiAuthorityScope(projection.intentUuid, scopeId));
  return authorization.kind === "human-required"
    ? { authorized: false, reason: authorization.reason }
    : { authorized: true, reason: authorization.kind };
}

function latestHumanTurnId(projectDir: string, resolved: ResolvedIntent): string | null {
  if (!humanActedSinceGate(projectDir)) return null;
  let latest: { readonly timestamp: string; readonly turnId: string } | null = null;
  for (const shardPath of auditShards(projectDir, resolved.intentDir, resolved.space)) {
    let shard: string;
    try {
      shard = readFileSync(shardPath, "utf-8");
    } catch {
      continue;
    }
    for (const turn of findAllEvents(shard, "HUMAN_TURN")) {
      const turnId = autonomyDigest({
        intentUuid: resolved.intentUuid,
        intentDir: resolved.intentDir,
        space: resolved.space,
        shard: basename(shardPath),
        blockDigest: autonomyDigest(turn.block),
      });
      if (latest === null || turn.timestamp > latest.timestamp ||
        (turn.timestamp === latest.timestamp && turnId > latest.turnId)) {
        latest = { timestamp: turn.timestamp, turnId };
      }
    }
  }
  return latest?.turnId ?? null;
}

// Which turns a declaration may cite as its provenance.
//
//   "intent"       the default and the only scope for a grant: the turn must sit
//                  in THIS intent's own shards.
//   "launch-chain" the widened reference (#2378 ruling E-U2BLK): the turn that
//                  authorized this LAUNCH may live in a sibling record, because a
//                  just-born intent has no shards of its own yet. It is still a
//                  real, already-minted turn — nothing is minted here.
// The launch-chain arm CARRIES the identity of the turn it cites. Making the
// token part of the variant is the point: "launch-chain without a named turn" is
// not representable, so the widened scope can never degrade into "any unconsumed
// turn lying around in the space" (ruling condition 2), and a launch that minted
// no turn has nothing to pass and fails loud (condition 3).
export type AutonomyProvenanceScope =
  | { readonly kind: "intent" }
  | { readonly kind: "launch-chain"; readonly launchTurnId: string };

// A turn's identity, independent of whichever intent ends up citing it.
//
// The fields are the ones latestHumanTurnId already uses to name a specific
// turn — the shard it lives in and a digest of the block itself — minus the
// target intent's own coordinates, which do not exist yet at launch time. Being
// derived from the block's bytes is what makes the token honest: it can only
// match a turn that is physically on disk.
function launchTurnFingerprint(
  space: string,
  sourceIntentDir: string,
  shardPath: string,
  block: string,
): string {
  return autonomyDigest({
    kind: "launch-chain-turn-v1",
    space,
    sourceIntentDir,
    shard: basename(shardPath),
    blockDigest: autonomyDigest(block),
  });
}

// The turn that authorized the CURRENT launch, observed while the intent that
// received the keystroke is still the active one. Null when there is nothing to
// cite — no active intent, or an active intent whose presence is already
// consumed. Null is the honest answer, and the caller must let it fail loud
// rather than search for a substitute.
//
// Deliberately scoped to the ACTIVE record only. Reading the space-wide set is
// exactly the defect this closes: it let an unrelated intent's stale turn stand
// in for one this launch never had.
export function observeLaunchTurnToken(projectDir: string): string | null {
  const resolved = resolveIntent(projectDir);
  if (resolved === null) return null;
  let latest: { readonly timestamp: string; readonly token: string } | null = null;
  for (const turn of outstandingHumanTurns(projectDir, resolved.intentDir, resolved.space)) {
    const token = launchTurnFingerprint(resolved.space, resolved.intentDir, turn.shardPath, turn.block);
    if (latest === null || turn.timestamp > latest.timestamp ||
      (turn.timestamp === latest.timestamp && token > latest.token)) {
      latest = { timestamp: turn.timestamp, token };
    }
  }
  return latest?.token ?? null;
}

// The earliest timestamp anywhere in this intent's audit — in practice its
// WORKFLOW_STARTED, i.e. when the record came into existence. It is the upper
// bound on "a turn that could have authorized this launch": a turn recorded
// after the record was created did not cause it. Null when the record carries no
// audit at all, which leaves the bound unknown and refuses (fail-closed).
function earliestAuditTimestamp(projectDir: string, resolved: ResolvedIntent): string | null {
  let earliest: string | null = null;
  for (const shardPath of auditShards(projectDir, resolved.intentDir, resolved.space)) {
    let shard: string;
    try {
      shard = readFileSync(shardPath, "utf-8");
    } catch {
      continue;
    }
    for (const block of splitAuditRecords(shard)) {
      const timestamp = auditBlockField(block, "Timestamp");
      if (timestamp === null || timestamp === "") continue;
      if (earliest === null || timestamp < earliest) earliest = timestamp;
    }
  }
  return earliest;
}

// The launch-chain turn id for the turn the launch NAMED, or null when that turn
// cannot be found.
//
// This resolves an identity; it does not search for a plausible candidate. A
// turn qualifies only when it is (1) a real HUMAN_TURN block on disk, (2) still
// unconsumed in ITS OWN record's presence ledger — the same
// resolution-consumes-human ordering the strict path relies on, (3) at or before
// the moment this intent's record came into existence (a turn recorded after the
// record was created did not cause it; `<=` because two audit writes can share a
// second), and (4) the exact turn the launch observed, matched by fingerprint.
//
// (4) is what makes the scope a widened REFERENCE rather than a widened
// permission. Without it the clock is the only bound, and any unconsumed turn
// anywhere in the space — a parked intent's presence from days ago — reads as
// authorization for this launch, which is how a launch that minted no turn at
// all would succeed in silence instead of failing loud.
//
// The returned id digests the SOURCE record's coordinates alongside the target
// intent's, so a launch-chain reference can never collide with an intent-scoped
// one over the same block.
function launchChainHumanTurnId(
  projectDir: string,
  resolved: ResolvedIntent,
  launchTurnId: string,
): string | null {
  const bornAt = earliestAuditTimestamp(projectDir, resolved);
  if (bornAt === null) return null;
  for (const sourceDir of listIntentDirs(projectDir, resolved.space)) {
    for (const turn of outstandingHumanTurns(projectDir, sourceDir, resolved.space)) {
      if (turn.timestamp > bornAt) continue;
      if (launchTurnFingerprint(resolved.space, sourceDir, turn.shardPath, turn.block) !== launchTurnId) continue;
      return autonomyDigest({
        provenanceScope: "launch-chain",
        intentUuid: resolved.intentUuid,
        intentDir: resolved.intentDir,
        space: resolved.space,
        sourceIntentDir: sourceDir,
        shard: basename(turn.shardPath),
        blockDigest: autonomyDigest(turn.block),
      });
    }
  }
  return null;
}

// The turn a declaration will cite, or why it may not cite one. Declared at
// module scope so the type-only lines carry no in-body coverage records.
type DeclarationProvenance =
  | { readonly ok: true; readonly humanTurnId: string }
  | { readonly ok: false; readonly error: string };

// Resolve the provenance for one declaration, ahead of every read the command
// itself needs. `full` under the widened scope is refused here, which is what
// keeps prepareFullGrantCommand unreachable from the launch-chain path rather
// than merely gated off it.
function resolveDeclarationProvenance(
  projectDir: string,
  resolved: ResolvedIntent,
  mode: AutonomyMode,
  scope: AutonomyProvenanceScope,
): DeclarationProvenance {
  if (scope.kind === "launch-chain") {
    if (mode === "full") return { ok: false, error: "PROVENANCE_SCOPE_FORBIDDEN" };
    const chained = launchChainHumanTurnId(projectDir, resolved, scope.launchTurnId);
    return chained === null ? { ok: false, error: "PROVENANCE_REQUIRED" } : { ok: true, humanTurnId: chained };
  }
  const latest = latestHumanTurnId(projectDir, resolved);
  return latest === null ? { ok: false, error: "PROVENANCE_REQUIRED" } : { ok: true, humanTurnId: latest };
}

interface GrantScopeInput {
  readonly projection: AutonomyProjection;
  readonly stateContent: string;
}

function grantScope(input: GrantScopeInput): GrantScopeDescriptor {
  const scopeId = getField(input.stateContent, "Scope") ?? "intent";
  const fingerprints = fallbackFingerprints(input.projection.intentUuid, scopeId);
  return {
    intentUuid: input.projection.intentUuid,
    scopeId,
    ...fingerprints,
    allowedInteractionKinds: ALL_INTERACTION_KINDS,
    permissionBoundaryFingerprint: autonomyDigest("native-host-permission-boundary-v1"),
    prohibitedEffects: PROHIBITED_EFFECTS,
  };
}

export function fallbackFingerprints(
  intentUuid: string,
  scopeId: string,
): { readonly scopeFingerprint: string; readonly normFingerprint: string } {
  return {
    scopeFingerprint: autonomyScopeFingerprint(intentUuid, scopeId),
    normFingerprint: autonomyDigest({ scopeId, rules: "resolved-rules-in-context-v1" }),
  };
}

// The semi authorization scope. Same fingerprint space as the grant fallback so
// a decision basis stays comparable across modes once it is burned into audit.
export function semiAuthorityScope(intentUuid: string, scopeId: string): SemiAuthorityScope {
  return {
    intentUuid,
    scopeId,
    ...fallbackFingerprints(intentUuid, scopeId),
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
  };
}

interface GrantDisplayDigestInput {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicyInput[];
}

function grantDisplayDigest(input: GrantDisplayDigestInput): string {
  return autonomyDigest({
    intentUuid: input.intentUuid,
    principalId: input.principalId,
    scope: input.scope,
    policies: input.policies.map((policy) => ({
      sourceText: policy.sourceText.trim(),
      selector: policy.selector,
      optionId: policy.optionId,
    })),
  });
}

interface PreviewProductionAutonomyGrantInput {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly principalId?: string;
  readonly policies?: readonly DecisionPolicyInput[];
}

/** What a preview shows a human before they declare a mode. Declared at module
 *  scope so the type-only lines carry no in-body coverage records. */
type AutonomyGrantPreview = {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicyInput[];
  readonly displayDigest: string;
  readonly nonAutoDecidedKinds: readonly InteractionKind[];
};

export function previewProductionAutonomyGrant(input: PreviewProductionAutonomyGrantInput): { readonly ok: true; readonly preview: AutonomyGrantPreview } | { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const projection = coordinatorFor(input.projectDir, resolved).readProjection();
  const principalId = input.principalId ?? "local-human";
  const policies = input.policies ?? [];
  const scope = grantScope({ projection, stateContent: input.stateContent });
  return {
    ok: true,
    preview: {
      intentUuid: projection.intentUuid,
      principalId,
      scope,
      policies,
      displayDigest: grantDisplayDigest({ intentUuid: projection.intentUuid, principalId, scope, policies }),
      nonAutoDecidedKinds: nonAutoDecidedKinds(projection.mode),
    },
  };
}

interface PrepareFullGrantCommandInput {
  readonly before: AutonomyProjection;
  readonly stateContent: string;
  readonly principalId: string;
  readonly humanTurnId: string;
  readonly policies: readonly DecisionPolicyInput[];
  readonly confirmedDisplayDigest?: string;
}

function prepareFullGrantCommand(input: PrepareFullGrantCommandInput): { readonly ok: true; readonly command: HumanAutonomyCommand; readonly issuanceDigest: string } |
  { readonly ok: false; readonly error: string } {
  const scope = grantScope({ projection: input.before, stateContent: input.stateContent });
  const expectedDisplayDigest = grantDisplayDigest({
    intentUuid: input.before.intentUuid,
    principalId: input.principalId,
    scope,
    policies: input.policies,
  });
  if (input.confirmedDisplayDigest !== expectedDisplayDigest) {
    return { ok: false, error: "CONFIRMATION_REQUIRED" };
  }
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: `grant-preview-${input.before.intentUuid}`,
    scopeFingerprint: scope.scopeFingerprint,
    humanTurnId: input.humanTurnId,
    policies: input.policies,
  });
  return {
    ok: true,
    command: { kind: input.before.currentGrant === null ? "issue-full" : "replace-full", scope, policies },
    issuanceDigest: grantIssuanceDisplayDigest({
      intentUuid: input.before.intentUuid,
      principalId: input.principalId,
      scope,
      policies,
    }),
  };
}

// The policies stay raw here: planHumanAutonomyCommand owns the one
// normalization call, and the digest is computed over the same raw set on both
// sides so the confirmation compares like with like.
function prepareNonFullCommand(
  before: AutonomyProjection,
  mode: Exclude<AutonomyMode, "full">,
  policies: readonly DecisionPolicyInput[],
): { readonly command: HumanAutonomyCommand; readonly displayDigest: string } {
  const revokedGrantId = before.currentGrant?.grantId ?? null;
  const displayDigest = nonFullCommandDisplayDigest({
    intentUuid: before.intentUuid,
    mode,
    revokedGrantId,
    policies,
  });
  return {
    command: revokedGrantId === null
      ? { kind: "set-mode", mode, policies }
      : { kind: "revoke-full", targetMode: mode, policies },
    displayDigest,
  };
}

interface ApplyProductionAutonomyModeInput {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly mode: AutonomyMode;
  readonly principalId?: string;
  readonly policies?: readonly DecisionPolicyInput[];
  readonly confirmedDisplayDigest?: string;
  // Opt-in. Absent means "intent" — the strict scope every existing caller keeps.
  readonly provenanceScope?: AutonomyProvenanceScope;
}

// The state projection of a committed mode. Written HERE and nowhere else: an
// entrance that commits the transaction but leaves the fields to its own caller
// (as the set-autonomy verb used to) gives every other entrance — the
// `--autonomy` launch flag — a mode the six state-file readers cannot see.
//
// Audit first, state second. The order matters on failure: a committed
// transaction with unwritten fields converges on re-run, whereas written fields
// with no transaction behind them would be a projection with no ledger.
//
// The base is re-read here rather than taken from the caller's `stateContent`:
// that argument describes the scope the caller previewed, and writing the whole
// file back from it would let a stale or partial copy overwrite whatever else
// the record has gained since the caller read it.
//
// Re-reading is only half of it: the read→edit→write must also be SERIALISED,
// or a concurrent writer of the same file loses its edit to this whole-file
// write (#2730). Of the three entrances into this section only `set-autonomy`
// wrapped its call; the `--autonomy` launch flag and the intent-birth
// declaration reached it bare. Wrapping HERE covers all three at once.
//
// THE BUCKET is the WORKSPACE SENTINEL — `withAuditLock(projectDir)` with no
// selector — because that is what LOCK == WRITE means for this file: the write
// below resolves the main record through the active cursor, and the other
// writers of that same file (amadeus-state.ts's set / checkbox /
// mirror-boundary handlers with no `--intent`) take exactly that bucket. An
// owner-intent bucket would serialise against none of them.
//
// Nesting is safe in both directions this section is reached from:
// handleSetAutonomy already holds the sentinel, and withAuditLock is reentrant
// per key within a process, so its wrap becomes a depth bump. The autonomy
// TRANSACTION's own owner-intent lock has been released by the time we get
// here, so the only order ever taken is sentinel-outer → intent-inner.
function writeAutonomyStateProjection(
  projectDir: string,
  mode: AutonomyMode,
  projection: AutonomyProjection,
): { readonly ok: true; readonly projection: AutonomyProjection } | { readonly ok: false; readonly error: string } {
  try {
    withAuditLock(projectDir, () => {
      let updated = setOrInsertField(readStateFile(projectDir), "## Current Status", "Intent Autonomy Mode", mode);
      updated = setOrInsertField(updated, "## Current Status", "Intent Grant", projection.currentGrant?.grantId ?? "none");
      updated = setFieldStrict(updated, CONSTRUCTION_AUTONOMY_MODE_FIELD, projectConstructionAutonomy(mode));
      writeStateFile(projectDir, updated);
    });
  } catch (cause) {
    return {
      ok: false,
      error: `state projection write failed after the autonomy transaction committed (re-run the same declaration to converge): ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  }
  return { ok: true, projection };
}

// Whether THIS declaration already committed. The transaction id is derived from
// (intentUuid, commandOccurrenceId), so a matching occurrence id means a second
// applyHumanCommand would re-issue a transaction that already exists — the
// re-run is a state repair, not a new declaration.
function alreadyDeclared(before: AutonomyProjection, mode: AutonomyMode, commandOccurrenceId: string): boolean {
  return before.mode === mode &&
    before.modeProvenance.kind === "human-command" &&
    before.modeProvenance.commandOccurrenceId === commandOccurrenceId;
}

// User-facing wrapper for applyProductionAutonomyMode failures. The machine
// code stays `PROVENANCE_REQUIRED` so callers can still match it; the suffix
// is the #3170 close: Claude Code does not fire UserPromptSubmit for a
// message queued mid-turn, so that input never becomes HUMAN_TURN provenance.
export function formatIntentAutonomyUpdateFailure(error: string): string {
  const prefix = `Intent autonomy update failed: ${error}`;
  return error === "PROVENANCE_REQUIRED"
    ? `${prefix}. Queued mid-turn input is not recorded as HUMAN_TURN; submit the command again at a turn boundary (after the agent yields).`
    : prefix;
}

export function applyProductionAutonomyMode(input: ApplyProductionAutonomyModeInput): { readonly ok: true; readonly projection: AutonomyProjection } | { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const provenance = resolveDeclarationProvenance(
    input.projectDir,
    resolved,
    input.mode,
    input.provenanceScope ?? { kind: "intent" },
  );
  if (!provenance.ok) return { ok: false, error: provenance.error };
  const humanTurnId = provenance.humanTurnId;
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const before = coordinator.readProjection();
  const commandOccurrenceId = `autonomy-mode-${input.mode}-${humanTurnId}`;
  if (alreadyDeclared(before, input.mode, commandOccurrenceId)) {
    return writeAutonomyStateProjection(input.projectDir, input.mode, before);
  }
  const principalId = input.principalId ?? "local-human";
  let command: HumanAutonomyCommand;
  let confirmedDisplayDigest: string;
  if (input.mode === "full") {
    const prepared = prepareFullGrantCommand({
      before,
      stateContent: input.stateContent,
      principalId,
      humanTurnId,
      policies: input.policies ?? [],
      confirmedDisplayDigest: input.confirmedDisplayDigest,
    });
    if (!prepared.ok) return prepared;
    command = prepared.command;
    confirmedDisplayDigest = prepared.issuanceDigest;
  } else {
    const prepared = prepareNonFullCommand(before, input.mode, input.policies ?? []);
    command = prepared.command;
    confirmedDisplayDigest = prepared.displayDigest;
  }
  const result = coordinator.applyHumanCommand(command, {
    targetIntentUuid: before.intentUuid,
    principalId,
    humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: humanTurnId },
    commandOccurrenceId,
    expectedProjectionRevision: before.projectionRevision,
    confirmedDisplayDigest,
  });
  if ("error" in result) return { ok: false, error: result.error };
  return writeAutonomyStateProjection(input.projectDir, input.mode, coordinator.readProjection());
}

export interface GateRecommendationContext {
  readonly stage: string;
  readonly approvalOptionId: string;
  readonly walkingSkeleton: boolean;
  readonly scopeFingerprint: string;
  readonly normFingerprint: string;
}

// A stage gate offers no alternative to approval: the states that must not pass
// (an unresolved blocking sensor, a norm conflict) are refused upstream by the
// existing fail-closed paths, never presented here as a rival candidate. So the
// derivation is total and always unique — which is exactly what the type says.
export function deriveGateRecommendation(context: GateRecommendationContext): UniqueOutcome {
  return RecommendationOutcome.unique(context.approvalOptionId, {
    source: "norm",
    fingerprint: recommendationBasisFingerprint({
      source: "norm",
      selector: `stage-gate:${context.stage}`,
      optionIds: [context.approvalOptionId],
      evidence: [
        context.scopeFingerprint,
        context.normFingerprint,
        `walking-skeleton:${context.walkingSkeleton}`,
      ],
    }),
  });
}

export interface ElectionHold {
  readonly hold: HoldReason;
  readonly candidates: readonly Candidate[];
}

// RFC-0001 Q1=A: an election that did not settle is never rounded up into a
// choice. Four of the five hold reasons still leave live positions on the
// table and are contested; a short quorum leaves no supported position at all,
// so it degrades to `none` — as does any hold whose candidates could not be
// enumerated.
export function electionHoldOutcome(hold: ElectionHold): NonUniqueOutcome {
  const reason = `election-${hold.hold}`;
  if (hold.hold === "quorum-short" || hold.candidates.length < 2) return RecommendationOutcome.none(reason);
  return RecommendationOutcome.contested(hold.candidates, reason);
}

interface CommitProductionStageGateDecisionInput {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}

export function commitProductionStageGateDecision(input: CommitProductionStageGateDecisionInput): { readonly kind: "not-authorized"; readonly reason: string } |
  { readonly kind: "already-decided"; readonly grantId: string | null } |
  { readonly kind: "decided"; readonly grantId: string | null; readonly result: AutonomyDecisionResult } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "not-authorized", reason: "active-intent-required" };
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const projection = coordinator.readProjection();
  const target = occurrence({ ...input, projection, skeletonGateFires: skeletonGateFiresFor(input.stateContent) });
  const scopeId = getField(input.stateContent, "Scope") ?? "intent";
  const authorization = authorizeProductionOccurrence(projection, target, scopeId);
  if (!authorization.authorized) return { kind: "not-authorized", reason: authorization.reason };
  if (projection.autoDecisions.some((decision) => decision.occurrenceId === target.occurrenceId)) {
    return { kind: "already-decided", grantId: projection.currentGrant?.grantId ?? null };
  }
  const fallback = fallbackFingerprints(projection.intentUuid, scopeId);
  const scopeFingerprint = projection.currentGrant?.scope.scopeFingerprint ?? fallback.scopeFingerprint;
  const normFingerprint = projection.currentGrant?.scope.normFingerprint ?? fallback.normFingerprint;
  const payload = { action: "approve-stage", stage: input.stage };
  const effect = {
    effectId: `approve-stage-${input.stage}`,
    optionId: "approve",
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification: "workflow-reversible" as const,
    requiredScopeFingerprint: scopeFingerprint,
    applicableNormFingerprint: normFingerprint,
  };
  const registry = createDecisionOptionEffectRegistry({
    revision: autonomyDigest(effect),
    effects: [effect],
  });
  const gateRecommendation = deriveGateRecommendation({
    stage: input.stage,
    approvalOptionId: "approve",
    walkingSkeleton: input.walkingSkeleton,
    scopeFingerprint,
    normFingerprint,
  });
  const result = coordinator.decide({
    occurrence: target,
    actorId: "amadeus-engine",
    registry,
    currentNormFingerprint: normFingerprint,
    scopeLineageFingerprint: scopeFingerprint,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability: {
      soloElectionAvailable: false,
      elect: () => gateRecommendation,
      recommend: () => gateRecommendation,
      unavailableReason: "stage-gate-is-deterministic",
    },
    semiScope: semiAuthorityScope(projection.intentUuid, scopeId),
    gateApprovalOptionId: "approve",
  });
  if (result.kind !== "decided") return { kind: "not-authorized", reason: result.kind };
  return { kind: "decided", grantId: projection.currentGrant?.grantId ?? null, result };
}

export interface ProductionQuestionDecisionInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly questionId: string;
  readonly selector: string;
  readonly question: string;
  readonly optionIds: readonly string[];
  readonly recommendedOptionId: string;
  readonly applicableNormFacts?: readonly DecisionFact[];
  readonly pastHumanRulings?: readonly DecisionFact[];
  // A solo election either settled on one option or held. Both are results;
  // only the first can be adopted without a human.
  readonly election?:
    | { readonly optionId: string; readonly evidenceFingerprint: string }
    | ElectionHold;
  // An agent that could not single out one option says so here, in the same
  // wire shape `RecommendationOutcome.parse` reads, instead of being forced to
  // name `recommendedOptionId` as though it were sure.
  readonly recommendation?: unknown;
  // Per-option effect classification. A question whose options are all ordinary
  // workflow moves needs none — the default is `workflow-reversible`, which is
  // what every caller before #2253 relied on. A caller whose option space
  // contains a move that WAIVES something (advisory `defer-with-risk`) names it
  // here, and effect authorization then refuses that option on its own, without
  // this adapter growing a policy branch.
  readonly effectClassifications?: Readonly<Record<string, EffectClassification>>;
}

export function commitProductionQuestionDecision(input: ProductionQuestionDecisionInput): AutonomyDecisionResult {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "human-required", reason: "active-intent-required", result: null };
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const projection = coordinator.readProjection();
  const target = createInteractionOccurrence({
    intentUuid: projection.intentUuid,
    kind: "question",
    stage: input.stage,
    phase: input.phase,
    bolt: null,
    interactionId: input.questionId,
    selector: input.selector,
    question: input.question,
    optionIds: input.optionIds,
    graphRevision: input.graphRevision,
  });
  const fallback = fallbackFingerprints(projection.intentUuid, "intent");
  const scopeFingerprint = projection.currentGrant?.scope.scopeFingerprint ?? fallback.scopeFingerprint;
  const normFingerprint = projection.currentGrant?.scope.normFingerprint ?? fallback.normFingerprint;
  const effects = input.optionIds.map((optionId) => {
    const payload = { action: "answer-question", questionId: input.questionId, optionId };
    return {
      effectId: `answer-${input.questionId}-${optionId}`,
      optionId,
      payload,
      payloadFingerprint: autonomyDigest(payload),
      classification: input.effectClassifications?.[optionId] ?? ("workflow-reversible" as const),
      requiredScopeFingerprint: scopeFingerprint,
      applicableNormFingerprint: normFingerprint,
    };
  });
  const registry = createDecisionOptionEffectRegistry({ revision: autonomyDigest(effects), effects });
  const recommendation = questionRecommendation(input);
  if (recommendation === null) {
    return { kind: "human-required", reason: "invalid-recommendation-input", result: null };
  }
  return coordinator.decide({
    occurrence: target,
    actorId: "amadeus-conductor",
    registry,
    currentNormFingerprint: normFingerprint,
    scopeLineageFingerprint: scopeFingerprint,
    applicableNormFacts: input.applicableNormFacts ?? [],
    pastHumanRulings: input.pastHumanRulings ?? [],
    capability: {
      soloElectionAvailable: input.election !== undefined,
      // Guarded by soloElectionAvailable above: the coordinator never calls
      // elect without it (amadeus-intent-autonomy.ts:1074).
      elect: () => questionElection(input.election as NonNullable<typeof input.election>),
      recommend: () => recommendation,
      unavailableReason: input.election === undefined ? "native-solo-election-result-unavailable" : null,
    },
    semiScope: semiAuthorityScope(projection.intentUuid, "intent"),
  });
}

// The coordinator only invokes `elect` when `soloElectionAvailable` is true
// (amadeus-intent-autonomy.ts:1074), so the election is present by
// construction here — the caller narrows it before building the closure.
function questionElection(
  election: NonNullable<ProductionQuestionDecisionInput["election"]>,
): RecommendationOutcome {
  return "hold" in election
    ? electionHoldOutcome(election)
    : RecommendationOutcome.unique(election.optionId, {
      source: "election",
      fingerprint: election.evidenceFingerprint,
    });
}

// A supplied recommendation arrives as untrusted JSON, so it is parsed rather
// than trusted; a malformed one refuses the whole decision instead of quietly
// falling back to the single-option shape.
function questionRecommendation(input: ProductionQuestionDecisionInput): RecommendationOutcome | null {
  if (input.recommendation === undefined) {
    // A blank option id would trip the smart constructor's throw; refuse the
    // decision through the same invalid-recommendation-input arm instead.
    if (input.recommendedOptionId.trim().length === 0) return null;
    return RecommendationOutcome.unique(input.recommendedOptionId, {
      source: "agent",
      fingerprint: autonomyDigest({ questionId: input.questionId, optionId: input.recommendedOptionId }),
    });
  }
  const parsed = RecommendationOutcome.parse(input.recommendation);
  return parsed.ok ? parsed.value : null;
}

export interface ProductionQualityObservationInput {
  readonly projectDir: string;
  readonly evidence: Omit<QualityEvidenceBatchInput, "intentUuid" | "graphRevision" | "previousSnapshot">;
  readonly replanContext: string;
}

export type ProductionQualityObservationResult =
  | { readonly kind: "READY" | "repair" | "replanned"; readonly evidenceFingerprint: string }
  | { readonly kind: "parked"; readonly qualityScopeId: string; readonly workflowResult: WorkflowResult }
  | { readonly kind: "error"; readonly reason: string };

export interface ProductionQualityResumeInput {
  readonly projectDir: string;
  readonly qualityScopeId: string;
  readonly basis: "evidence-change" | "human-retry";
  readonly evidence?: Omit<QualityEvidenceBatchInput, "intentUuid" | "graphRevision" | "previousSnapshot">;
}

export type ProductionQualityResumeResult =
  | { readonly kind: "resumed"; readonly qualityScopeId: string; readonly workflowResult: "running" }
  | { readonly kind: "error"; readonly reason: string };

// Derived, not sampled: the production adapter has no ambient span, and the
// Quality Repair coordinator requires a trace on every evidence-bearing call.
function productionQualityTrace(
  intentUuid: string,
  stageInstanceId: string,
): { readonly traceId: string; readonly spanId: string } {
  return {
    traceId: qualityDigest([intentUuid, stageInstanceId]).slice("sha256:".length, 39),
    spanId: qualityDigest(stageInstanceId).slice("sha256:".length, 23),
  };
}

function deterministicQualityJudge(): JudgePort {
  return {
    dispatch(request) {
      return {
        kind: "completed",
        result: {
          invocationId: request.invocationId,
          routeId: request.allowedRouteIds[0]!,
          evidenceFingerprint: request.evidenceFingerprint,
          constraintFingerprint: request.routeConstraintFingerprint,
          trace: request.trace,
        },
      };
    },
    reconcile: () => ({ kind: "unknown", reason: "no-pending-quality-judge" }),
  };
}

function deterministicReplanPort(context: string): QualityReplanPort {
  return {
    dispatch(request) {
      return {
        kind: "completed",
        receipt: {
          judgeInvocationId: request.judgeInvocationId,
          planDigest: qualityDigest(context),
          agentId: "amadeus-quality-agent",
          contextId: qualityStableId("quality-replan-context", context),
        },
      };
    },
    reconcile: () => ({ kind: "unknown", reason: "no-pending-quality-replan" }),
  };
}

export function commitProductionQualityObservation(
  input: ProductionQualityObservationInput,
): ProductionQualityObservationResult {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "error", reason: "active-intent-required" };
  const autonomyCoordinator = coordinatorFor(input.projectDir, resolved);
  const autonomy = autonomyCoordinator.readProjection();
  const activation = resolveIntentQualityActivation({
    autonomy,
    qualityProjection: emptyQualityPluginProjection(autonomy.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  if (activation.kind !== "active") {
    return { kind: "error", reason: activation.kind === "error" ? activation.error.message : activation.reason };
  }
  const repository = createAuditQualityRepairRepository({
    projectDir: input.projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  const quality = createQualityRepairCoordinator({ activation, repository });
  const qualityScopeId = qualityStableId("quality-scope", [
    autonomy.intentUuid,
    input.evidence.monitorId,
    input.evidence.stageInstanceId,
    input.evidence.boltId,
    activation.graph.graphRevision,
  ]);
  const prior = repository.readProjection(qualityScopeId);
  const observed = quality.recordEvidence({
    ...input.evidence,
    intentUuid: autonomy.intentUuid,
    graphRevision: activation.graph.graphRevision,
    previousSnapshot: prior?.latestSnapshot ?? null,
  }, productionQualityTrace(autonomy.intentUuid, input.evidence.stageInstanceId));
  if (observed.kind === "CONFLICT" || observed.kind === "INCOMPLETE") {
    return { kind: "error", reason: observed.reason };
  }
  if (observed.snapshot.unresolved.length === 0) {
    return { kind: "READY", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  if (observed.kind !== "judge-reserved") {
    return observed.kind === "REPAIR_STALLED"
      ? parkProductionQuality(autonomyCoordinator, observed.snapshot.stageInstanceId, quality.status(observed.snapshot.qualityScopeId))
      : { kind: "repair", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  const judged = quality.dispatchJudge(
    observed.permit,
    deterministicQualityJudge(),
    deterministicReplanPort(input.replanContext),
  );
  if (judged.kind === "replanned") {
    return { kind: "replanned", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  if (judged.kind === "REPAIR_STALLED") {
    return parkProductionQuality(autonomyCoordinator, observed.snapshot.stageInstanceId, quality.status(observed.snapshot.qualityScopeId));
  }
  return { kind: "error", reason: "reason" in judged ? judged.reason : judged.kind };
}

function parkProductionQuality(
  autonomy: IntentAutonomyCoordinator,
  triggerOccurrenceId: string,
  status: ReturnType<ReturnType<typeof createQualityRepairCoordinator>["status"]>,
): ProductionQualityObservationResult {
  if (status === null || status.evidenceFingerprint === null) {
    return { kind: "error", reason: "quality-stall-status-missing" };
  }
  const parked = autonomy.park({
    triggerOccurrenceId,
    reason: "REPAIR_STALLED",
    resumeCondition: {
      kind: "quality-evidence-or-human",
      identity: qualityStableId("quality-resume-condition", status.resumeCondition),
      status: "pending",
      evidenceFingerprint: status.evidenceFingerprint,
    },
    monitorLatchIdentity: qualityStableId("quality-monitor-latch", [status.qualityScopeId, status.evidenceFingerprint]),
  });
  return "error" in parked
    ? { kind: "error", reason: parked.error }
    : { kind: "parked", qualityScopeId: status.qualityScopeId, workflowResult: parked.result };
}

// The Bolt id a stage-owned referee failure is scoped under. A stage referee
// fails outside any Unit of Work, so the quality scope is keyed by the stage
// alone and this constant names where the evidence came from.
const STAGE_REFEREE_BOLT_ID = "stage-referee";

export interface ProductionStageFailureInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly failureDetail: string;
}

// A stage-owned referee that fails closed leaves a quality obligation, not a
// forward transition: `report` commits forward outcomes only, and the generic
// manual park is refused under an autonomous Construction run. Projecting the
// typed failure onto the first-party Quality Repair contribution is the route
// the canon already defines — bounded repair, one replan, then a REPAIR_STALLED
// park that keeps the grant. The obligation identity is derived from the
// failure payload, so an unchanged failure reads as non-progress and the
// bounded loop terminates instead of re-issuing the same run-stage forever.
export type ProductionStageFailureResult =
  | { readonly kind: "READY" | "repair" | "replanned"; readonly evidenceFingerprint: string }
  | { readonly kind: "parked"; readonly stall: ProductionRepairStall }
  | { readonly kind: "error"; readonly reason: string };

export function admitProductionStageFailure(
  input: ProductionStageFailureInput,
): ProductionStageFailureResult {
  const observed = commitProductionQualityObservation({
    projectDir: input.projectDir,
    evidence: {
      providerId: "quality-evidence-v1",
      monitorId: "quality-repair",
      stageInstanceId: input.stage,
      boltId: STAGE_REFEREE_BOLT_ID,
      observations: [{
        kind: "condition",
        conditionKind: "verification",
        conditionId: qualityStableId("stage-referee-failure", [input.stage, input.failureDetail]),
        status: "unsatisfied",
        verifierId: STAGE_REFEREE_BOLT_ID,
        receipt: qualityDigest([input.stage, input.failureDetail]),
      }],
    },
    replanContext: `Stage "${input.stage}" referee failed: ${input.failureDetail}`,
  });
  if (observed.kind !== "parked") return observed;
  // The park just happened, so its envelope is what the caller has to surface.
  // An absent envelope means the projection and the park disagree — fail closed
  // rather than announce a stop nobody can resume.
  const stall = readProductionRepairStall(input.projectDir);
  return stall === null ? { kind: "error", reason: "repair-stall-envelope-missing" } : { kind: "parked", stall };
}

export interface ProductionWaitingStop {
  readonly stage: string;
  readonly occurrenceId: string;
  readonly transactionId: string;
  readonly resumeConditionIdentity: string;
  readonly cause: WaitingCause;
}

/** The stage the record is currently on, for the marker's Stage attribute. */
function currentStageOf(projectDir: string): string {
  return getField(readStateFile(projectDir), "Current Stage") ?? "";
}

// Lifecycle marker for a waiting transition. The transaction is already
// committed by the time this runs, so a shard that cannot be written must not
// undo it — the ledger is the record and this is its human-readable projection.
// Same lazy require and same fail-open rationale as emitAuthorizationRefusal.
function emitWaitingMarker(
  projectDir: string,
  event: string,
  emit: (emitAuditEvent: typeof EmitAuditEvent) => ReturnType<typeof EmitAuditEvent>,
): void {
  try {
    const otel = require("../otel/audit-emit.ts") as { emitAuditEvent: typeof EmitAuditEvent };
    const result = emit(otel.emitAuditEvent);
    if (!result.appended) console.error(`amadeus: could not record ${event} — the transaction ledger is unaffected`);
  } catch (cause) {
    console.error(
      `amadeus: could not record ${event} — the transaction ledger is unaffected: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return;
  }
}

// Enter waiting on the active Intent (RFC-0001 FR-3). Engine-internal by
// construction: no CLI verb reaches it, because "stop and wait for a ruling"
// being invocable at will is the self-park move the rate constraint exists to
// catch. Refusals leave the record untouched — a malformed cause or an
// over-rate arrival must not half-suspend the workflow.
export function enterProductionWaiting(
  projectDir: string,
  cause: WaitingCause,
): { readonly waitingId: string; readonly stage: string } | { readonly error: string } {
  const resolved = resolveIntent(projectDir);
  if (resolved === null) return { error: "no-active-intent" };
  const entered = coordinatorFor(projectDir, resolved).enterWaiting({ cause });
  if ("error" in entered) return { error: entered.error };
  const stage = currentStageOf(projectDir);
  emitWaitingMarker(projectDir, "WORKFLOW_WAITING_ENTERED", (emitAuditEvent) =>
    emitAuditEvent("WORKFLOW_WAITING_ENTERED", {
      Stage: stage,
      "Occurrence Id": cause.occurrenceId,
      "Basis Fingerprint": cause.basisFingerprint,
      "Transaction Id": entered.waitingId,
      Timestamp: new Date().toISOString(),
    }, projectDir));
  return { waitingId: entered.waitingId, stage };
}

// What a waiting suspension left behind. The envelope supplies the identifiers
// and the transaction it names supplies the cause; neither half is enough
// alone, and a missing half is null rather than a partial reconstruction.
export function readProductionWaitingStop(projectDir: string): ProductionWaitingStop | null {
  const resolved = resolveIntent(projectDir);
  if (resolved === null) return null;
  const coordinator = coordinatorFor(projectDir, resolved);
  const envelope = coordinator.readProjection().parkEnvelope;
  if (envelope === null || envelope.reason !== "AWAITING_RULING") return null;
  const dispatch = resumeInterruption({
    parked: false,
    parkedAtStage: null,
    envelope,
    transactions: readIntentAutonomyTransactionsFromAudit(projectDir, resolved.intentDir, resolved.space),
  });
  if (!dispatch.ok || dispatch.value.kind !== "waiting") return null;
  return {
    stage: currentStageOf(projectDir),
    occurrenceId: envelope.triggerOccurrenceId,
    transactionId: envelope.parkTransactionId,
    resumeConditionIdentity: envelope.resumeCondition.identity,
    cause: dispatch.value.cause,
  };
}

// Close a waiting record. The ruling itself is the human's; this is the half
// that records that one was made, which is also what releases the rate key so
// the same point may legitimately wait again later.
export function resumeProductionWaiting(
  projectDir: string,
): { readonly waitingId: string } | { readonly error: string } {
  const resolved = resolveIntent(projectDir);
  if (resolved === null) return { error: "no-active-intent" };
  const coordinator = coordinatorFor(projectDir, resolved);
  const envelope = coordinator.readProjection().parkEnvelope;
  if (envelope === null || envelope.reason !== "AWAITING_RULING") return { error: "no-waiting-record" };
  const resumed = coordinator.resumeWaiting({
    waitingId: envelope.parkTransactionId,
    satisfiedConditionIdentity: envelope.resumeCondition.identity,
  });
  if ("error" in resumed) return { error: resumed.error };
  emitWaitingMarker(projectDir, "WORKFLOW_WAITING_RESUMED", (emitAuditEvent) =>
    emitAuditEvent("WORKFLOW_WAITING_RESUMED", {
      Stage: currentStageOf(projectDir),
      "Transaction Id": envelope.parkTransactionId,
      Timestamp: new Date().toISOString(),
    }, projectDir));
  return { waitingId: envelope.parkTransactionId };
}

export interface ProductionRepairStall {
  readonly stageInstanceId: string;
  readonly evidenceFingerprint: string;
  readonly resumeConditionIdentity: string;
  readonly qualityScopeId: string | null;
}

// What a REPAIR_STALLED park left behind, read back for the caller that has to
// surface the stop. The quality scope is recovered from the stall event that
// carries the same evidence fingerprint the park suspended on, so the resume
// instruction names a scope that exists rather than one recomputed from
// assumptions about how the evidence was keyed.
export function readProductionRepairStall(projectDir: string): ProductionRepairStall | null {
  const resolved = resolveIntent(projectDir);
  if (resolved === null) return null;
  const envelope = coordinatorFor(projectDir, resolved).readProjection().parkEnvelope;
  if (envelope === null || envelope.reason !== "REPAIR_STALLED") return null;
  const evidenceFingerprint = envelope.resumeCondition.evidenceFingerprint ?? "";
  const repository = createAuditQualityRepairRepository({
    projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  const stalled = repository.readTransactions().filter((transaction) =>
    transaction.qualityEvents.some((event) =>
      event.type === "REPAIR_STALLED" && event.latch.evidenceFingerprint === evidenceFingerprint,
    ),
  ).at(-1);
  return {
    stageInstanceId: envelope.triggerOccurrenceId,
    evidenceFingerprint,
    resumeConditionIdentity: envelope.resumeCondition.identity,
    qualityScopeId: stalled?.qualityScopeId ?? null,
  };
}

function freshHumanRetryTurn(
  projectDir: string,
  resolved: ResolvedIntent,
): { readonly verified: true; readonly eventType: "HUMAN_TURN"; readonly actor: "human"; readonly turnId: string } | null {
  const audit = readAllAuditShards(projectDir, resolved.intentDir, resolved.space);
  const stalledAt = findAllEvents(audit, "QUALITY_REPAIR_TRANSACTION_COMMITTED")
    .filter((row) => auditBlockField(row.block, "Transaction")?.includes('"type":"REPAIR_STALLED"'))
    .at(-1)?.timestamp;
  if (stalledAt === undefined) return null;
  const stalledAtMs = Date.parse(stalledAt);
  if (Number.isNaN(stalledAtMs)) return null;
  const turn = findAllEvents(audit, "HUMAN_TURN")
    .filter((row) => {
      const turnAtMs = Date.parse(row.timestamp);
      return !Number.isNaN(turnAtMs) && turnAtMs > stalledAtMs;
    })
    .at(-1);
  return turn === undefined ? null : { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: turn.timestamp };
}

interface QualityResumeAlreadyCommittedInput {
  readonly repository: QualityRepairRepository;
  readonly qualityScopeId: string;
  readonly alternativeIdentity: string;
  readonly monitorLatchIdentity: string;
}

function qualityResumeAlreadyCommitted(input: QualityResumeAlreadyCommittedInput): boolean {
  let stalledEvidenceFingerprint: string | null = null;
  let resumedAlternativeIdentity: string | null = null;
  for (const transaction of input.repository.readTransactions()) {
    if (transaction.qualityScopeId !== input.qualityScopeId) continue;
    for (const event of transaction.qualityEvents) {
      if (event.type === "REPAIR_STALLED") {
        stalledEvidenceFingerprint = event.latch.evidenceFingerprint;
        resumedAlternativeIdentity = null;
      } else if (event.type === "QUALITY_EPOCH_STARTED") {
        resumedAlternativeIdentity = event.satisfiedAlternativeIdentity;
      }
    }
  }
  return stalledEvidenceFingerprint !== null &&
    resumedAlternativeIdentity === input.alternativeIdentity &&
    qualityStableId("quality-monitor-latch", [input.qualityScopeId, stalledEvidenceFingerprint]) ===
      input.monitorLatchIdentity;
}

type ProductionQualityResumeContext = {
  readonly resolved: ResolvedIntent;
  readonly autonomy: IntentAutonomyCoordinator;
  readonly autonomyProjection: AutonomyProjection;
  readonly envelope: NonNullable<AutonomyProjection["parkEnvelope"]> & { readonly monitorLatchIdentity: string };
  readonly activation: Extract<ReturnType<typeof resolveIntentQualityActivation>, { readonly kind: "active" }>;
  readonly repository: QualityRepairRepository;
  readonly quality: ReturnType<typeof createQualityRepairCoordinator>;
  readonly status: NonNullable<ReturnType<ReturnType<typeof createQualityRepairCoordinator>["status"]>>;
  readonly alternativeIdentity: string;
};

function prepareProductionQualityResume(
  input: ProductionQualityResumeInput,
): { readonly ok: true; readonly context: ProductionQualityResumeContext } | { readonly ok: false; readonly reason: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, reason: "active-intent-required" };
  const autonomy = coordinatorFor(input.projectDir, resolved);
  const autonomyProjection = autonomy.readProjection();
  const envelope = autonomyProjection.parkEnvelope;
  if (autonomyProjection.workflowExecutionState !== "suspended" || envelope?.reason !== "REPAIR_STALLED" ||
    envelope.monitorLatchIdentity === null) {
    return { ok: false, reason: "quality-repair-stall-not-active" };
  }
  const activation = resolveIntentQualityActivation({
    autonomy: autonomyProjection,
    qualityProjection: emptyQualityPluginProjection(autonomyProjection.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  if (activation.kind !== "active") {
    return { ok: false, reason: activation.kind === "error" ? activation.error.message : activation.reason };
  }
  const repository = createAuditQualityRepairRepository({
    projectDir: input.projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  const quality = createQualityRepairCoordinator({ activation, repository });
  const status = quality.status(input.qualityScopeId);
  if (status === null) return { ok: false, reason: "quality-repair-scope-not-found" };
  const alternative = status.resumeCondition.alternatives.find((candidate) => candidate.kind === input.basis);
  if (alternative === undefined) return { ok: false, reason: "quality-resume-alternative-not-found" };
  return {
    ok: true,
    context: {
      resolved,
      autonomy,
      autonomyProjection,
      envelope: { ...envelope, monitorLatchIdentity: envelope.monitorLatchIdentity },
      activation,
      repository,
      quality,
      status,
      alternativeIdentity: alternative.identity,
    },
  };
}

function productionQualityResumeEvidence(
  input: ProductionQualityResumeInput,
  context: ProductionQualityResumeContext,
): QualityEvidenceBatchInput | undefined {
  if (input.evidence === undefined) return undefined;
  return {
    ...input.evidence,
    intentUuid: context.autonomyProjection.intentUuid,
    graphRevision: context.activation.graph.graphRevision,
    previousSnapshot: context.repository.readProjection(input.qualityScopeId)?.latestSnapshot ?? null,
  };
}

function commitQualityResumeIfRequired(
  input: ProductionQualityResumeInput,
  context: ProductionQualityResumeContext,
): string | null {
  const alreadyResumed = context.status.workflowExecutionState === "running" && qualityResumeAlreadyCommitted({
    repository: context.repository,
    qualityScopeId: input.qualityScopeId,
    alternativeIdentity: context.alternativeIdentity,
    monitorLatchIdentity: context.envelope.monitorLatchIdentity!,
  });
  if (alreadyResumed) return null;
  const { status, envelope } = context;
  if (status.workflowExecutionState !== "suspended" || status.evidenceFingerprint === null ||
    qualityStableId("quality-monitor-latch", [input.qualityScopeId, status.evidenceFingerprint]) !==
      envelope.monitorLatchIdentity) return "quality-resume-latch-mismatch";
  const humanRetry = input.basis === "human-retry"
    ? freshHumanRetryTurn(input.projectDir, context.resolved)
    : undefined;
  if (input.basis === "human-retry" && humanRetry === null) return "fresh-human-retry-required";
  const evidence = productionQualityResumeEvidence(input, context);
  const resumed = context.quality.resume({
    qualityScopeId: input.qualityScopeId,
    alternativeIdentity: context.alternativeIdentity,
    humanRetry: humanRetry ?? undefined,
    evidence,
    ...(evidence === undefined
      ? {}
      : { trace: productionQualityTrace(evidence.intentUuid, evidence.stageInstanceId) }),
  });
  return resumed.kind === "resumed" ? null : resumed.reason;
}

export function resumeProductionQuality(input: ProductionQualityResumeInput): ProductionQualityResumeResult {
  const prepared = prepareProductionQualityResume(input);
  if (!prepared.ok) return { kind: "error", reason: prepared.reason };
  const resumeError = commitQualityResumeIfRequired(input, prepared.context);
  if (resumeError !== null) return { kind: "error", reason: resumeError };
  const { autonomy, envelope } = prepared.context;

  const unparked = autonomy.resume({
    triggerOccurrenceId: envelope.triggerOccurrenceId,
    condition: { ...envelope.resumeCondition, status: "satisfied" },
    basis: input.basis,
    loopMonitor: {
      clearedLatchReceipt: { identity: envelope.monitorLatchIdentity, verified: true },
    },
  });
  if ("error" in unparked) return { kind: "error", reason: unparked.error };
  return { kind: "resumed", qualityScopeId: input.qualityScopeId, workflowResult: "running" };
}
