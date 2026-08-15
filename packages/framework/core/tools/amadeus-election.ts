// amadeus-election.ts — the election CLI: a typed directive loop over the
// canonical multi-question election store. FR-0: the protocol source of truth is
// this state machine; the caller (AI or the machine executor) only forwards the
// directive it was handed and never reconstructs one.
//
// States: draft -> open -> collecting -> (partial | tallied) -> rendered ->
// recorded. `next` and `status` are read-only; the verbs named by a directive
// (notify/tally/render/verify) commit the transitions, and `report` acknowledges
// a committed transition against the current store facts. stdout carries exactly
// one directive/result JSON line; stderr carries the typed error.
// Exit codes: 0 ok, 1 fault, 2 usage.

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BallotCodec,
  type CanonicalBallot,
  type CanonicalElectionDefinition,
  type CanonicalTally,
  ElectionDefinitionCodec,
} from "./amadeus-election-codec.ts";
import { type AmadeusConfigIssue, resolveAmadeusConfig } from "./amadeus-config.ts";
import type { HoldReason } from "./amadeus-election-model.ts";
import { resolveResponses, tallyQuestions } from "./amadeus-election-question-tally.ts";
import {
  buildDistributionView,
  renderElectionRecord,
  verifyElectionRecord,
} from "./amadeus-election-record.ts";
import {
  type ElectionSnapshot,
  type ElectionState,
  ElectionStore,
  type ElectionStoreError,
  electionsRoot,
  resolveElectionDir,
  writeStoreFile,
} from "./amadeus-election-store.ts";
import { createSubagentTransport, distribute, normalizeAt } from "./amadeus-election-transport.ts";
import { resolveProjectDir } from "./amadeus-lib.ts";

const USAGE =
  "Usage: bun <harness-dir>/tools/amadeus-election.ts <open|next|status|vote|notify|tally|render|verify|report> [--election <id>] [--file <path>] [--trigger manual|auto] [--project <dir>]";

export type ElectionCliErrorCategory =
  | "decode"
  | "store"
  | "config"
  | "invalid-transition"
  | "stale-directive"
  | "coverage"
  | "preservation"
  | "verification"
  | "transport";

export interface ElectionCliError {
  readonly category: ElectionCliErrorCategory;
  readonly electionId: string;
  readonly questionId?: string;
  readonly runId?: string;
  readonly nextAction: string;
}

export type ElectionCliResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ElectionCliError };

type ReportResult = "distributed" | "tallied" | "rendered" | "verified" | null;
type DirectiveVerb = "notify" | "tally" | "render" | "verify" | null;

interface DirectiveBase {
  readonly electionId: string;
  readonly schemaVersion: 2;
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
  readonly verb: DirectiveVerb;
  readonly report: ReportResult;
  readonly expectedState: ElectionState;
  readonly expectedRunId: string | null;
}

export type ElectionDirective =
  | (DirectiveBase & { readonly kind: "distribute" })
  | (DirectiveBase & { readonly kind: "collect-wait"; readonly pending: readonly string[] })
  | (DirectiveBase & { readonly kind: "tally-ready"; readonly candidateRunId: string })
  | (DirectiveBase & {
      readonly kind: "hold";
      readonly held: readonly { readonly questionId: string; readonly reason: HoldReason }[];
    })
  | (DirectiveBase & { readonly kind: "render" })
  | (DirectiveBase & { readonly kind: "verify" })
  | (DirectiveBase & { readonly kind: "done" });

function ok<T>(value: T): ElectionCliResult<T> {
  return { ok: true, value };
}

function storeError(electionId: string, error: ElectionStoreError): ElectionCliResult<never> {
  // Stored data the schema validator rejects is a decode failure, reported with
  // the schema it expects — never skipped, never re-parsed under another shape.
  if (error === "unsupported") {
    return cliError("decode", electionId, "provide election data with schemaVersion 2");
  }
  return {
    ok: false,
    error: { category: "store", electionId, nextAction: "repair the election store and retry" },
  };
}

function cliError(
  category: ElectionCliErrorCategory,
  electionId: string,
  nextAction: string,
  detail: { questionId?: string; runId?: string } = {},
): ElectionCliResult<never> {
  return { ok: false, error: { category, electionId, ...detail, nextAction } };
}

function currentTargets(snapshot: ElectionSnapshot): readonly string[] {
  if (snapshot.currentTally === null) {
    return snapshot.definition.questions.map((question) => question.questionId);
  }
  const held = snapshot.currentTally.results.flatMap((result) =>
    result.kind === "hold" ? [result.questionId] : [],
  );
  return held.length === 0 ? snapshot.currentTally.targetQuestionIds : held;
}

function base(
  snapshot: ElectionSnapshot,
  targetQuestionIds: readonly string[],
  preservedResultDigest: string | null,
  verb: DirectiveVerb,
  report: ReportResult,
): DirectiveBase {
  return {
    electionId: snapshot.definition.electionId,
    schemaVersion: 2,
    targetQuestionIds,
    preservedResultDigest,
    verb,
    report,
    expectedState: snapshot.state,
    expectedRunId: snapshot.currentTally?.runId ?? null,
  };
}

function directiveFromSnapshot(
  root: string,
  snapshot: ElectionSnapshot,
): ElectionCliResult<ElectionDirective> {
  const electionId = snapshot.definition.electionId;
  const targets = currentTargets(snapshot);
  let digest: string | null = null;
  if (snapshot.currentTally !== null) {
    const computed = ElectionStore.establishedResultsDigest(root, electionId, snapshot.currentTally);
    if (!computed.ok) return storeError(electionId, computed.error);
    digest = computed.value;
  }
  if (snapshot.state === "open") {
    return ok({ kind: "distribute", ...base(snapshot, targets, digest, "notify", "distributed") });
  }
  if (snapshot.state === "collecting") {
    const voters = new Set(snapshot.pending.map((ballot) => ballot.voter));
    const pending = snapshot.definition.voters.filter((voter) => !voters.has(voter));
    return pending.length > 0
      ? ok({ kind: "collect-wait", ...base(snapshot, targets, digest, null, null), pending })
      : ok({
          kind: "tally-ready",
          ...base(snapshot, targets, digest, "tally", "tallied"),
          candidateRunId: `run-${snapshot.history.length + 1}`,
        });
  }
  if (snapshot.state === "partial") {
    const held = snapshot.currentTally?.results.flatMap((result) =>
      result.kind === "hold" ? [{ questionId: result.questionId, reason: result.reason }] : [],
    ) ?? [];
    return ok({ kind: "hold", ...base(snapshot, targets, digest, "notify", "distributed"), held });
  }
  if (snapshot.state === "tallied") {
    return ok({ kind: "render", ...base(snapshot, targets, digest, "render", "rendered") });
  }
  if (snapshot.state === "rendered") {
    return ok({ kind: "verify", ...base(snapshot, targets, digest, "verify", "verified") });
  }
  if (snapshot.state === "recorded") {
    return ok({ kind: "done", ...base(snapshot, targets, digest, null, null) });
  }
  return {
    ok: false,
    error: { category: "invalid-transition", electionId, nextAction: "open the election first" },
  };
}

export function nextElection(root: string, electionId: string): ElectionCliResult<ElectionDirective> {
  const read = ElectionStore.readSnapshot(root, electionId);
  return read.ok ? directiveFromSnapshot(root, read.value) : storeError(electionId, read.error);
}

export interface ElectionStatus {
  readonly electionId: string;
  readonly schemaVersion: 2;
  readonly state: ElectionState;
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
  readonly pending: readonly string[];
  readonly currentRunId: string | null;
}

export function statusElection(root: string, electionId: string): ElectionCliResult<ElectionStatus> {
  const snapshot = ElectionStore.readSnapshot(root, electionId);
  if (!snapshot.ok) return storeError(electionId, snapshot.error);
  const directive = directiveFromSnapshot(root, snapshot.value);
  if (!directive.ok) return directive;
  return ok({
    electionId,
    schemaVersion: 2,
    state: snapshot.value.state,
    targetQuestionIds: directive.value.targetQuestionIds,
    preservedResultDigest: directive.value.preservedResultDigest,
    pending: directive.value.kind === "collect-wait" ? directive.value.pending : [],
    currentRunId: snapshot.value.currentTally?.runId ?? null,
  });
}

export function openElection(
  root: string,
  raw: unknown,
): ElectionCliResult<{ readonly electionId: string; readonly views: number }> {
  const decoded = ElectionDefinitionCodec.decode(raw);
  if (!decoded.ok) return cliError("decode", "unknown", "fix the election definition and retry");
  const created = ElectionStore.create(root, decoded.value);
  if (!created.ok) return storeError(decoded.value.electionId, created.error);
  const views = writeViews(root, decoded.value, decoded.value.questions.map((question) => question.questionId));
  if (!views.ok) return views;
  const opened = ElectionStore.setState(root, decoded.value.electionId, "open");
  return opened.ok
    ? ok({ electionId: decoded.value.electionId, views: decoded.value.voters.length })
    : storeError(decoded.value.electionId, opened.error);
}

function configIssueSummary(issue: AmadeusConfigIssue): string {
  return issue.kind === "read-failure"
    ? `${issue.layer} (${issue.path}): ${issue.summary}`
    : `${issue.layer} (${issue.path}): ${issue.key} expected ${issue.expected}, got ${issue.actualType}`;
}

export type TriggeredOpen =
  | { readonly electionId: string; readonly views: number }
  | { readonly opened: null; readonly reason: "solo-election-manual-trigger-required" };

// `--trigger auto` is the opt-in solo auto-election entrance: the election is
// opened only when the resolved configuration enables automatic triggering, so
// an auto-fired election in a manual workspace is refused (loudly, exit 0 with a
// typed reason) instead of being created.
export function triggeredOpenElection(
  projectDir: string,
  root: string,
  raw: unknown,
  trigger: string,
): ElectionCliResult<TriggeredOpen> {
  if (trigger === "manual") return openElection(root, raw);
  if (trigger !== "auto") {
    return cliError("decode", "unknown", 'use --trigger manual or --trigger auto');
  }
  const resolved = resolveAmadeusConfig(projectDir);
  if (resolved.kind === "invalid") {
    return cliError(
      "config",
      "unknown",
      `fix the configuration: ${resolved.issues.map(configIssueSummary).join(" | ")}`,
    );
  }
  if (resolved.config.soloElection.trigger.mode !== "auto") {
    return ok({ opened: null, reason: "solo-election-manual-trigger-required" });
  }
  return openElection(root, raw);
}

function writeViews(
  root: string,
  definition: CanonicalElectionDefinition,
  targetQuestionIds: readonly string[],
): ElectionCliResult<void> {
  const targets = new Set(targetQuestionIds);
  const targetDefinition = {
    ...definition,
    questions: definition.questions.filter((question) => targets.has(question.questionId)),
  };
  const dir = join(resolveElectionDir(root, definition.electionId), "views");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return storeError(definition.electionId, "io-error");
  }
  for (const voter of definition.voters) {
    const view = buildDistributionView(targetDefinition, voter);
    const written = writeStoreFile(join(dir, `${voter}.json`), JSON.stringify(view, null, 2));
    if (!written.ok) return storeError(definition.electionId, "io-error");
  }
  return ok(undefined);
}

export function voteElection(
  root: string,
  electionId: string,
  raw: unknown,
  receivedAt: string,
): ElectionCliResult<{ readonly voter: string; readonly idempotent: boolean }> {
  const snapshot = ElectionStore.readSnapshot(root, electionId);
  if (!snapshot.ok) return storeError(electionId, snapshot.error);
  if (snapshot.value.state !== "collecting") {
    return cliError("invalid-transition", electionId, "request a current directive and retry");
  }
  const targets = currentTargets(snapshot.value);
  const establishedQuestionIds = snapshot.value.currentTally?.results.flatMap((result) =>
    result.kind === "established" ? [result.questionId] : [],
  ) ?? [];
  const decoded = BallotCodec.decode(raw, snapshot.value.definition, {
    targetQuestionIds: targets,
    establishedQuestionIds,
  });
  if (!decoded.ok) {
    const category = decoded.error.category === "coverage-mismatch" ? "coverage" : "decode";
    return cliError(category, electionId, "submit a ballot for the current target question IDs");
  }
  const ballot: CanonicalBallot = { ...decoded.value, receivedAt };
  const appended = ElectionStore.appendPending(root, electionId, ballot);
  return appended.ok
    ? ok({ voter: ballot.voter, idempotent: appended.value.idempotent })
    : storeError(electionId, appended.error);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function checkedDirective(
  root: string,
  directive: ElectionDirective,
): ElectionCliResult<ElectionSnapshot> {
  const read = ElectionStore.readSnapshot(root, directive.electionId);
  if (!read.ok) return storeError(directive.electionId, read.error);
  const current = directiveFromSnapshot(root, read.value);
  if (!current.ok) return current;
  if (
    read.value.state !== directive.expectedState ||
    read.value.currentTally?.runId !== (directive.expectedRunId ?? undefined) ||
    !sameIds(current.value.targetQuestionIds, directive.targetQuestionIds) ||
    current.value.preservedResultDigest !== directive.preservedResultDigest
  ) {
    return cliError("stale-directive", directive.electionId, "request a current directive and retry", {
      runId: directive.expectedRunId ?? undefined,
    });
  }
  return ok(read.value);
}

export interface TransitionReceipt {
  readonly result: Exclude<ReportResult, null>;
  readonly from: ElectionState;
  readonly to: ElectionState;
  readonly runId?: string;
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
  readonly repaired: boolean;
  readonly committedAt: string;
}

export function notifyElection(
  root: string,
  directive: Extract<ElectionDirective, { kind: "distribute" | "hold" }>,
): ElectionCliResult<TransitionReceipt> {
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const views = writeViews(root, checked.value.definition, directive.targetQuestionIds);
  if (!views.ok) return views;
  const electionDir = resolveElectionDir(root, directive.electionId);
  const deliveries = distribute(
    createSubagentTransport({ voters: new Set(checked.value.definition.voters) }),
    directive.electionId,
    checked.value.definition.voters,
    (voter) => join(electionDir, "views", `${voter}.json`),
  );
  if (deliveries.some((delivery) => !delivery.result.ok)) {
    return cliError("transport", directive.electionId, "retry delivery for the current target questions");
  }
  const moved = ElectionStore.setState(root, directive.electionId, "collecting");
  return moved.ok
    ? ok({ result: "distributed", from: directive.expectedState, to: "collecting", targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt: new Date().toISOString() })
    : storeError(directive.electionId, moved.error);
}

// A tally whose store commit already landed but whose receipt never reached the
// caller is completed, not re-run: the stored run is re-committed idempotently.
function repairTallyRun(
  root: string,
  directive: Extract<ElectionDirective, { kind: "tally-ready" }>,
  snapshot: ElectionSnapshot,
  tally: CanonicalTally,
): ElectionCliResult<TransitionReceipt> {
  const repaired = ElectionStore.commitTally(root, directive.electionId, tally, {
    expectedState: "collecting",
    nextState: snapshot.state,
  });
  return repaired.ok
    ? ok({ result: "tallied", from: "collecting", to: snapshot.state, runId: directive.candidateRunId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: true, committedAt: tally.talliedAt })
    : storeError(directive.electionId, repaired.error);
}

// The digest a tally run must carry, on the store's terms: it names the prior
// results the run leaves standing. A first run has no prior results, and a run
// whose target covers every question leaves none standing — both write null.
// The store enforces exactly this (verifyPreservation), so producing the digest
// anyway (a single-question election always re-tallies its whole definition)
// makes the commit structurally impossible.
function runPreservedDigest(
  directive: Extract<ElectionDirective, { kind: "tally-ready" }>,
  definition: CanonicalElectionDefinition,
): string | null {
  const coversEveryQuestion =
    new Set(directive.targetQuestionIds).size === definition.questions.length;
  return directive.expectedRunId === null || coversEveryQuestion
    ? null
    : directive.preservedResultDigest;
}

function isCommittedRun(
  directive: Extract<ElectionDirective, { kind: "tally-ready" }>,
  snapshot: ElectionSnapshot,
): snapshot is ElectionSnapshot & { currentTally: CanonicalTally } {
  return (
    snapshot.currentTally?.runId === directive.candidateRunId &&
    (snapshot.state === "partial" || snapshot.state === "tallied") &&
    sameIds(snapshot.currentTally.targetQuestionIds, directive.targetQuestionIds) &&
    snapshot.currentTally.preservedResultDigest === runPreservedDigest(directive, snapshot.definition)
  );
}

export function tallyElection(
  root: string,
  directive: Extract<ElectionDirective, { kind: "tally-ready" }>,
  talliedAt: string,
): ElectionCliResult<TransitionReceipt> {
  const retry = ElectionStore.readSnapshot(root, directive.electionId);
  if (retry.ok && isCommittedRun(directive, retry.value)) {
    return repairTallyRun(root, directive, retry.value, retry.value.currentTally);
  }
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const integrated = ElectionStore.integratePending(root, directive.electionId, checked.value.definition.voters);
  if (!integrated.ok) return storeError(directive.electionId, integrated.error);
  const refreshed = ElectionStore.readSnapshot(root, directive.electionId);
  if (!refreshed.ok) return storeError(directive.electionId, refreshed.error);
  const draft = tallyQuestions(
    refreshed.value.definition,
    resolveResponses(refreshed.value.definition, refreshed.value.ledger),
    directive.targetQuestionIds,
    checked.value.currentTally,
  );
  if (!draft.ok) return cliError("preservation", directive.electionId, "repair tally inputs and retry", { questionId: draft.error.questionId });
  const tally: CanonicalTally = {
    schemaVersion: 2,
    runId: directive.candidateRunId,
    targetQuestionIds: directive.targetQuestionIds,
    results: draft.value.results,
    preservedResultDigest: runPreservedDigest(directive, checked.value.definition),
    talliedAt,
  };
  const committed = ElectionStore.commitTally(root, directive.electionId, tally, {
    expectedState: "collecting",
    nextState: draft.value.lifecycle,
  });
  if (!committed.ok) return storeError(directive.electionId, committed.error);
  return ok({ result: "tallied", from: "collecting", to: draft.value.lifecycle, runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: committed.value.repaired, committedAt: talliedAt });
}

export function renderElection(
  root: string,
  directive: Extract<ElectionDirective, { kind: "render" }>,
  committedAt: string,
): ElectionCliResult<TransitionReceipt> {
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const tally = checked.value.currentTally;
  if (tally === null) return cliError("store", directive.electionId, "restore the current tally and retry");
  const record = renderElectionRecord({
    definition: checked.value.definition,
    tally,
    lifecycle: "tallied",
    materializedBallots: checked.value.ledger,
    lateResponses: [],
    history: checked.value.history,
    timeline: checked.value.timeline,
  });
  const path = join(resolveElectionDir(root, directive.electionId), "record.md");
  if (!writeStoreFile(path, record).ok) return storeError(directive.electionId, "io-error");
  const moved = ElectionStore.setState(root, directive.electionId, "rendered");
  return moved.ok
    ? ok({ result: "rendered", from: "tallied", to: "rendered", runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt })
    : storeError(directive.electionId, moved.error);
}

export function verifyElection(
  root: string,
  directive: Extract<ElectionDirective, { kind: "verify" }>,
  committedAt: string,
): ElectionCliResult<TransitionReceipt> {
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const tally = checked.value.currentTally;
  if (tally === null) return cliError("store", directive.electionId, "restore the current tally and retry");
  const storeVerified = ElectionStore.verify(root, directive.electionId);
  if (!storeVerified.ok) return storeError(directive.electionId, storeVerified.error);
  let record: string;
  try {
    record = readFileSync(join(resolveElectionDir(root, directive.electionId), "record.md"), "utf8");
  } catch {
    return cliError("verification", directive.electionId, "render the election record and retry");
  }
  const verified = verifyElectionRecord({
    definition: checked.value.definition,
    ledgerBallots: checked.value.ledger,
    materializedBallots: checked.value.materialized,
    history: checked.value.history,
    currentTally: tally,
    lifecycle: "tallied",
    lateResponses: [],
    timeline: checked.value.timeline,
    record,
  });
  if (!verified.ok) return cliError("verification", directive.electionId, "render a canonical record and retry");
  const moved = ElectionStore.setState(root, directive.electionId, "recorded");
  return moved.ok
    ? ok({ result: "verified", from: "rendered", to: "recorded", runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt })
    : storeError(directive.electionId, moved.error);
}

const REPORT_EXPECTED_STATES: Record<Exclude<ReportResult, null>, readonly ElectionState[]> = {
  distributed: ["collecting"],
  tallied: ["partial", "tallied"],
  rendered: ["rendered"],
  verified: ["recorded"],
};

interface ObservedReportFacts {
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
}

function observedReportFacts(
  root: string,
  directive: ElectionDirective,
  snapshot: ElectionSnapshot,
): ElectionCliResult<ObservedReportFacts> {
  const current = snapshot.currentTally;
  if (directive.kind === "tally-ready") {
    return ok({
      targetQuestionIds: current?.targetQuestionIds ?? directive.targetQuestionIds,
      preservedResultDigest: current?.preservedResultDigest ?? null,
    });
  }
  const targetQuestionIds = currentTargets(snapshot);
  if (current === null) return ok({ targetQuestionIds, preservedResultDigest: null });
  const digest = ElectionStore.establishedResultsDigest(root, directive.electionId, current);
  return digest.ok
    ? ok({ targetQuestionIds, preservedResultDigest: digest.value })
    : storeError(directive.electionId, digest.error);
}

function matchesReportExpectation(
  directive: ElectionDirective,
  report: Exclude<ReportResult, null>,
  snapshot: ElectionSnapshot,
  observed: ObservedReportFacts,
  expectedRunId: string | null,
): boolean {
  const expectedPreserved = directive.kind === "tally-ready"
    ? runPreservedDigest(directive, snapshot.definition)
    : directive.preservedResultDigest;
  return (
    REPORT_EXPECTED_STATES[report].includes(snapshot.state) &&
    (expectedRunId === null || snapshot.currentTally?.runId === expectedRunId) &&
    sameIds(observed.targetQuestionIds, directive.targetQuestionIds) &&
    observed.preservedResultDigest === expectedPreserved
  );
}

export function reportElection(
  root: string,
  directive: ElectionDirective,
  committedAt: string,
): ElectionCliResult<TransitionReceipt> {
  const report = directive.report;
  if (report === null) {
    return cliError("invalid-transition", directive.electionId, "execute an actionable directive");
  }
  const read = ElectionStore.readSnapshot(root, directive.electionId);
  if (!read.ok) return storeError(directive.electionId, read.error);
  const observed = observedReportFacts(root, directive, read.value);
  if (!observed.ok) return observed;
  const expectedRunId = directive.kind === "tally-ready" ? directive.candidateRunId : directive.expectedRunId;
  if (!matchesReportExpectation(directive, report, read.value, observed.value, expectedRunId)) {
    return cliError("stale-directive", directive.electionId, "request a current directive and retry", {
      runId: expectedRunId ?? undefined,
    });
  }
  const current = read.value.currentTally;
  return ok({
    result: report,
    from: directive.expectedState,
    to: read.value.state,
    ...(current === null ? {} : { runId: current.runId }),
    targetQuestionIds: directive.targetQuestionIds,
    preservedResultDigest: directive.preservedResultDigest,
    repaired: false,
    committedAt,
  });
}

type CliArgs = {
  verb: string;
  electionId?: string;
  file?: string;
  project?: string;
  trigger?: string;
};

function parseCliArgs(argv: readonly string[]): CliArgs | null {
  const verb = argv[0];
  if (verb === undefined) return null;
  const parsed: CliArgs = { verb };
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) return null;
    if (flag === "--election") parsed.electionId = value;
    else if (flag === "--file") parsed.file = value;
    else if (flag === "--project") parsed.project = value;
    else if (flag === "--trigger") parsed.trigger = value;
    else return null;
  }
  return parsed;
}

function readJsonInput(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function emit<T>(result: ElectionCliResult<T>): number {
  if (result.ok) {
    console.log(JSON.stringify(result.value));
    return 0;
  }
  console.error(JSON.stringify(result.error));
  return 1;
}

function usageFail(): 2 {
  console.error(USAGE);
  return 2;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function isElectionState(value: unknown): value is ElectionState {
  return typeof value === "string" && ["draft", "open", "collecting", "partial", "tallied", "rendered", "recorded"].includes(value);
}

function isHoldReason(value: unknown): value is HoldReason {
  return typeof value === "string" && ["tie", "block", "quorum-short", "discussion-needed", "split"].includes(value);
}

type DirectiveCommon = Omit<DirectiveBase, "verb" | "report">;

function parseDirectiveCommon(raw: Record<string, unknown>): DirectiveCommon | null {
  const targets = strings(raw.targetQuestionIds);
  if (
    typeof raw.electionId !== "string" ||
    targets === null ||
    (raw.preservedResultDigest !== null && typeof raw.preservedResultDigest !== "string") ||
    !isElectionState(raw.expectedState) ||
    (raw.expectedRunId !== null && typeof raw.expectedRunId !== "string")
  ) return null;
  return {
    electionId: raw.electionId,
    schemaVersion: 2,
    targetQuestionIds: targets,
    preservedResultDigest: raw.preservedResultDigest,
    expectedState: raw.expectedState,
    expectedRunId: raw.expectedRunId,
  };
}

// Directive kinds carrying no payload beyond the common fields: each pins one
// verb/report pair, so parsing is a table lookup plus an equality check.
type PlainDirectiveKind = "distribute" | "render" | "verify" | "done";

const PLAIN_DIRECTIVE_SHAPES: Record<
  PlainDirectiveKind,
  { readonly verb: DirectiveVerb; readonly report: ReportResult }
> = {
  distribute: { verb: "notify", report: "distributed" },
  render: { verb: "render", report: "rendered" },
  verify: { verb: "verify", report: "verified" },
  done: { verb: null, report: null },
};

function isPlainDirectiveKind(value: string): value is PlainDirectiveKind {
  return Object.hasOwn(PLAIN_DIRECTIVE_SHAPES, value);
}

function parsePlainDirective(
  raw: Record<string, unknown>,
  common: DirectiveCommon,
): ElectionDirective | null {
  const kind = raw.kind;
  if (typeof kind !== "string" || !isPlainDirectiveKind(kind)) return null;
  const shape = PLAIN_DIRECTIVE_SHAPES[kind];
  if (raw.verb !== shape.verb || raw.report !== shape.report) return null;
  return { kind, ...common, verb: shape.verb, report: shape.report };
}

function parseCollectWaitDirective(
  raw: Record<string, unknown>,
  common: DirectiveCommon,
): ElectionDirective | null {
  if (raw.kind !== "collect-wait" || raw.verb !== null || raw.report !== null) return null;
  const pending = strings(raw.pending);
  return pending === null ? null : { kind: raw.kind, ...common, verb: null, report: null, pending };
}

function parseTallyReadyDirective(
  raw: Record<string, unknown>,
  common: DirectiveCommon,
): ElectionDirective | null {
  if (raw.kind !== "tally-ready" || raw.verb !== "tally" || raw.report !== "tallied") return null;
  if (typeof raw.candidateRunId !== "string") return null;
  return { kind: raw.kind, ...common, verb: raw.verb, report: raw.report, candidateRunId: raw.candidateRunId };
}

function parseHoldDirective(
  raw: Record<string, unknown>,
  common: DirectiveCommon,
): ElectionDirective | null {
  if (raw.kind !== "hold" || raw.verb !== "notify" || raw.report !== "distributed") return null;
  if (!Array.isArray(raw.held)) return null;
  const held = raw.held.flatMap((item) => isRecord(item) && typeof item.questionId === "string" && isHoldReason(item.reason) ? [{ questionId: item.questionId, reason: item.reason }] : []);
  return held.length === raw.held.length ? { kind: raw.kind, ...common, verb: raw.verb, report: raw.report, held } : null;
}

function parseDirective(raw: unknown): ElectionDirective | null {
  if (!isRecord(raw) || raw.schemaVersion !== 2 || typeof raw.kind !== "string") return null;
  const common = parseDirectiveCommon(raw);
  if (common === null) return null;
  return parsePlainDirective(raw, common)
    ?? parseCollectWaitDirective(raw, common)
    ?? parseTallyReadyDirective(raw, common)
    ?? parseHoldDirective(raw, common);
}

// Verbs that need only an election ID; null means "not one of these verbs".
function runElectionVerb(
  root: string,
  verb: string,
  electionId: string,
  file: string | undefined,
): number | null {
  if (verb === "next") return emit(nextElection(root, electionId));
  if (verb === "status") return emit(statusElection(root, electionId));
  if (verb === "vote" && file !== undefined) {
    const raw = readJsonInput(file);
    return raw === null ? emit(cliError("decode", electionId, "fix the ballot file and retry")) : emit(voteElection(root, electionId, raw, normalizeAt(new Date().toISOString())));
  }
  return null;
}

function runDirectiveVerb(root: string, verb: string, electionId: string, file: string): number {
  const directive = parseDirective(readJsonInput(file));
  if (directive === null || directive.electionId !== electionId) return emit(cliError("decode", electionId, "use the current machine-readable directive"));
  const now = normalizeAt(new Date().toISOString());
  if (verb === "notify" && (directive.kind === "distribute" || directive.kind === "hold")) return emit(notifyElection(root, directive));
  if (verb === "tally" && directive.kind === "tally-ready") return emit(tallyElection(root, directive, now));
  if (verb === "render" && directive.kind === "render") return emit(renderElection(root, directive, now));
  if (verb === "verify" && directive.kind === "verify") return emit(verifyElection(root, directive, now));
  if (verb === "report") return emit(reportElection(root, directive, now));
  return usageFail();
}

export function main(argv: readonly string[], projectDir?: string): number {
  const args = parseCliArgs(argv);
  if (args === null) return usageFail();
  // --project is the repo-external override (scratch-script-discipline): tests
  // and experiments point the store at a scratch tree instead of the real one.
  const resolvedProjectDir = resolveProjectDir(args.project ?? projectDir);
  const root = electionsRoot(resolvedProjectDir);
  if (args.verb === "open") {
    if (args.file === undefined) return usageFail();
    const raw = readJsonInput(args.file);
    if (raw === null) return emit(cliError("decode", "unknown", "fix the input file and retry"));
    return emit(triggeredOpenElection(resolvedProjectDir, root, raw, args.trigger ?? "manual"));
  }
  if (args.electionId === undefined) return usageFail();
  const handled = runElectionVerb(root, args.verb, args.electionId, args.file);
  if (handled !== null) return handled;
  if (args.file === undefined) return usageFail();
  return runDirectiveVerb(root, args.verb, args.electionId, args.file);
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
