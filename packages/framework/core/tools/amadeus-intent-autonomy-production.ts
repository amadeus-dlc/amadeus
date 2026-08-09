// Production adapter for Intent-scoped autonomy (#2067).
//
// The domain modules deliberately own no filesystem or workflow-engine policy.
// This adapter is the single bridge used by the orchestrator, the approval
// transaction, and the human mode command. Harnesses consume the same projected
// Core file; no harness-specific autonomy branch is permitted here.

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import {
  autonomyDigest,
  autonomyScopeFingerprint,
  authorizeInteraction,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  nonFullCommandDisplayDigest,
  normalizeDecisionPolicies,
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
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  resolveIntentQualityActivation,
  type AutonomyDecisionResult,
  type IntentAutonomyCoordinator,
} from "./amadeus-intent-autonomy-runtime.ts";
import { createAuditIntentAutonomyRepository } from "./amadeus-intent-autonomy-replay.ts";
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
  setFieldStrict,
  setOrInsertField,
  withAuditLock,
  writeStateFile,
} from "./amadeus-lib.ts";

const ALL_INTERACTIONS: readonly InteractionKind[] = [
  "stage-gate",
  "phase-gate",
  "walking-skeleton",
  "question",
];

// What a mode auto-decides. Derived from the two existing constants rather than
// restated, so the pair a semi Intent leaves to the human moves whenever
// SEMI_ROUTINE_INTERACTIONS moves (FR-2b, BR-U1-7).
function autoDecidedKinds(mode: AutonomyMode): readonly InteractionKind[] {
  if (mode === "full") return ALL_INTERACTIONS;
  if (mode === "semi") return SEMI_ROUTINE_INTERACTIONS;
  return [];
}

// The complement: the kinds this mode still stops on. Reading it off the preview
// is how a human sees, before granting, which gates stay theirs.
export function nonAutoDecidedKinds(mode: AutonomyMode): readonly InteractionKind[] {
  const decided = autoDecidedKinds(mode);
  return ALL_INTERACTIONS.filter((kind) => !decided.includes(kind));
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

function interactionKind(input: { readonly walkingSkeleton: boolean; readonly phaseBoundary?: boolean }): InteractionKind {
  if (input.walkingSkeleton) return "walking-skeleton";
  return input.phaseBoundary ? "phase-gate" : "stage-gate";
}

interface OccurrenceInput {
  readonly projection: AutonomyProjection;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
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

interface ProductionStageAutonomyInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}

export function productionStageAutonomy(input: ProductionStageAutonomyInput): ProductionAutonomyContext {
  const projection = readProductionAutonomyProjection(input.projectDir);
  if (projection === null) {
    return {
      mode: "none",
      autoApprove: false,
      grantId: null,
      authorizationReason: "intent-autonomy-unavailable",
      qualityRepair: "disabled",
    };
  }
  const authorization = authorizeProductionOccurrence(projection, occurrence({ ...input, projection }), "intent");
  const qualityRepair = qualityState(projection);
  if (!authorization.authorized) {
    emitAuthorizationRefusal(input.projectDir, {
      kind: interactionKind(input),
      stage: input.stage,
      reason: authorization.reason,
      mode: projection.mode,
    });
  }
  return {
    mode: projection.mode,
    autoApprove: authorization.authorized && qualityRepair !== "error",
    grantId: projection.currentGrant?.grantId ?? null,
    authorizationReason: authorization.reason,
    qualityRepair,
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
};

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
function emitAuthorizationRefusal(projectDir: string, refusal: AuthorizationRefusal): void {
  if (!REFUSAL_REASONS.some((known) => known === refusal.reason)) return;
  try {
    const otel = require("../otel/audit-emit.ts") as { emitAuditEvent: typeof EmitAuditEvent };
    const result = otel.emitAuditEvent("INTENT_AUTONOMY_HUMAN_REQUIRED", {
      "Interaction Kind": refusal.kind,
      "Stage slug": refusal.stage,
      Reason: refusal.reason,
      Mode: refusal.mode,
    }, projectDir);
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
    allowedInteractionKinds: ALL_INTERACTIONS,
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
      updated = setFieldStrict(updated, "Construction Autonomy Mode", mode === "full" ? "autonomous" : "gated");
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
  const target = occurrence({ ...input, projection });
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
      elect: () => ({ optionId: "approve", evidenceFingerprint: autonomyDigest("unreachable-election") }),
      recommend: () => ({ optionId: "approve", evidenceFingerprint: autonomyDigest("stage-gate-default") }),
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
  readonly election?: { readonly optionId: string; readonly evidenceFingerprint: string };
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
      elect: () => input.election ?? {
        optionId: input.recommendedOptionId,
        evidenceFingerprint: autonomyDigest("unavailable-election"),
      },
      recommend: () => ({
        optionId: input.recommendedOptionId,
        evidenceFingerprint: autonomyDigest({ questionId: input.questionId, optionId: input.recommendedOptionId }),
      }),
      unavailableReason: input.election === undefined ? "native-solo-election-result-unavailable" : null,
    },
    semiScope: semiAuthorityScope(projection.intentUuid, "intent"),
  });
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
