import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BallotV2Codec,
  type CanonicalBallot,
  type CanonicalElectionDefinition,
  type CanonicalTally,
  ElectionDefinitionCodec,
} from "./amadeus-election-codec.ts";
import type { HoldReason } from "./amadeus-election-model.ts";
import { resolveResponses, tallyQuestions } from "./amadeus-election-question-tally.ts";
import {
  buildDistributionView,
  renderElectionRecord,
  verifyElectionRecord,
} from "./amadeus-election-record.ts";
import { electionsRoot, resolveElectionDir, writeStoreFile } from "./amadeus-election-store.ts";
import { createSubagentTransport, distribute, normalizeAt } from "./amadeus-election-transport.ts";
import { resolveProjectDir } from "./amadeus-lib.ts";
import {
  ElectionV2Store,
  type ElectionV2Snapshot,
  type ElectionV2State,
  type ElectionV2StoreError,
} from "./amadeus-election-v2-store.ts";

export type ElectionCliErrorCategory =
  | "decode"
  | "store"
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
  readonly expectedState: ElectionV2State;
  readonly expectedRunId: string | null;
}

export type ElectionDirectiveV2 =
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

function storeError(
  electionId: string,
  _error: ElectionV2StoreError,
): ElectionCliResult<never> {
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

function currentTargets(snapshot: ElectionV2Snapshot): readonly string[] {
  if (snapshot.currentTally === null) {
    return snapshot.definition.questions.map((question) => question.questionId);
  }
  const held = snapshot.currentTally.results.flatMap((result) =>
    result.kind === "hold" ? [result.questionId] : [],
  );
  return held.length === 0
    ? snapshot.currentTally.targetQuestionIds
    : held;
}

function base(
  snapshot: ElectionV2Snapshot,
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
  snapshot: ElectionV2Snapshot,
): ElectionCliResult<ElectionDirectiveV2> {
  const electionId = snapshot.definition.electionId;
  const targets = currentTargets(snapshot);
  let digest: string | null = null;
  if (snapshot.currentTally !== null) {
    const computed = ElectionV2Store.establishedResultsDigest(root, electionId, snapshot.currentTally);
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

export function nextElectionV2(
  root: string,
  electionId: string,
): ElectionCliResult<ElectionDirectiveV2> {
  const read = ElectionV2Store.readSnapshot(root, electionId);
  return read.ok ? directiveFromSnapshot(root, read.value) : storeError(electionId, read.error);
}


export interface ElectionStatusV2 {
  readonly electionId: string;
  readonly schemaVersion: 2;
  readonly state: ElectionV2State;
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
  readonly pending: readonly string[];
  readonly currentRunId: string | null;
}

export function statusElectionV2(root: string, electionId: string): ElectionCliResult<ElectionStatusV2> {
  const snapshot = ElectionV2Store.readSnapshot(root, electionId);
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

export function openElectionV2(
  root: string,
  raw: unknown,
): ElectionCliResult<{ readonly electionId: string; readonly views: number }> {
  const decoded = ElectionDefinitionCodec.decode(raw);
  if (!decoded.ok) return cliError("decode", "unknown", "fix the election definition and retry");
  const created = ElectionV2Store.create(root, decoded.value);
  if (!created.ok) return storeError(decoded.value.electionId, created.error);
  const views = writeViews(root, decoded.value, decoded.value.questions.map((question) => question.questionId));
  if (!views.ok) return views;
  const opened = ElectionV2Store.setState(root, decoded.value.electionId, "open");
  return opened.ok
    ? ok({ electionId: decoded.value.electionId, views: decoded.value.voters.length })
    : storeError(decoded.value.electionId, opened.error);
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
  const dir = join(resolveElectionDir(root, definition.electionId).dir, "views");
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

export function voteElectionV2(
  root: string,
  electionId: string,
  raw: unknown,
  receivedAt: string,
): ElectionCliResult<{ readonly voter: string; readonly idempotent: boolean }> {
  const snapshot = ElectionV2Store.readSnapshot(root, electionId);
  if (!snapshot.ok) return storeError(electionId, snapshot.error);
  if (snapshot.value.state !== "collecting") {
    return cliError("invalid-transition", electionId, "request a current directive and retry");
  }
  const targets = currentTargets(snapshot.value);
  const establishedQuestionIds = snapshot.value.currentTally?.results.flatMap((result) =>
    result.kind === "established" ? [result.questionId] : [],
  ) ?? [];
  const decoded = BallotV2Codec.decode(raw, snapshot.value.definition, {
    targetQuestionIds: targets,
    establishedQuestionIds,
  });
  if (!decoded.ok) {
    const category = decoded.error.category === "coverage-mismatch" ? "coverage" : "decode";
    return cliError(category, electionId, "submit a ballot for the current target question IDs");
  }
  const ballot: CanonicalBallot = { ...decoded.value, receivedAt };
  const appended = ElectionV2Store.appendPending(root, electionId, ballot);
  return appended.ok
    ? ok({ voter: ballot.voter, idempotent: appended.value.idempotent })
    : storeError(electionId, appended.error);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function checkedDirective(
  root: string,
  directive: ElectionDirectiveV2,
): ElectionCliResult<ElectionV2Snapshot> {
  const read = ElectionV2Store.readSnapshot(root, directive.electionId);
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

export interface TransitionReceiptV2 {
  readonly result: Exclude<ReportResult, null>;
  readonly from: ElectionV2State;
  readonly to: ElectionV2State;
  readonly runId?: string;
  readonly targetQuestionIds: readonly string[];
  readonly preservedResultDigest: string | null;
  readonly repaired: boolean;
  readonly committedAt: string;
}

export function notifyElectionV2(
  root: string,
  directive: Extract<ElectionDirectiveV2, { kind: "distribute" | "hold" }>,
): ElectionCliResult<TransitionReceiptV2> {
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const views = writeViews(root, checked.value.definition, directive.targetQuestionIds);
  if (!views.ok) return views;
  const electionDir = resolveElectionDir(root, directive.electionId).dir;
  const deliveries = distribute(
    createSubagentTransport({ voters: new Set(checked.value.definition.voters) }),
    directive.electionId,
    checked.value.definition.voters,
    (voter) => join(electionDir, "views", `${voter}.json`),
  );
  if (deliveries.some((delivery) => !delivery.result.ok)) {
    return cliError("transport", directive.electionId, "retry delivery for the current target questions");
  }
  const moved = ElectionV2Store.setState(root, directive.electionId, "collecting");
  return moved.ok
    ? ok({ result: "distributed", from: directive.expectedState, to: "collecting", targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt: new Date().toISOString() })
    : storeError(directive.electionId, moved.error);
}

export function tallyElectionV2(
  root: string,
  directive: Extract<ElectionDirectiveV2, { kind: "tally-ready" }>,
  talliedAt: string,
): ElectionCliResult<TransitionReceiptV2> {
  const retry = ElectionV2Store.readSnapshot(root, directive.electionId);
  if (
    retry.ok &&
    retry.value.currentTally?.runId === directive.candidateRunId &&
    (retry.value.state === "partial" || retry.value.state === "tallied") &&
    sameIds(retry.value.currentTally.targetQuestionIds, directive.targetQuestionIds) &&
    retry.value.currentTally.preservedResultDigest ===
      (directive.expectedRunId === null ? null : directive.preservedResultDigest)
  ) {
    const repaired = ElectionV2Store.commitTally(
      root,
      directive.electionId,
      retry.value.currentTally,
      { expectedState: "collecting", nextState: retry.value.state },
    );
    return repaired.ok
      ? ok({ result: "tallied", from: "collecting", to: retry.value.state, runId: directive.candidateRunId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: true, committedAt: retry.value.currentTally.talliedAt })
      : storeError(directive.electionId, repaired.error);
  }
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const integrated = ElectionV2Store.integratePending(root, directive.electionId, checked.value.definition.voters);
  if (!integrated.ok) return storeError(directive.electionId, integrated.error);
  const refreshed = ElectionV2Store.readSnapshot(root, directive.electionId);
  if (!refreshed.ok) return storeError(directive.electionId, refreshed.error);
  const draft = tallyQuestions(
    refreshed.value.definition,
    resolveResponses(refreshed.value.ledger),
    directive.targetQuestionIds,
    checked.value.currentTally,
  );
  if (!draft.ok) return cliError("preservation", directive.electionId, "repair tally inputs and retry", { questionId: draft.error.questionId });
  const tally: CanonicalTally = {
    schemaVersion: 2,
    runId: directive.candidateRunId,
    targetQuestionIds: directive.targetQuestionIds,
    results: draft.value.results,
    preservedResultDigest: checked.value.currentTally === null ? null : directive.preservedResultDigest,
    talliedAt,
  };
  const committed = ElectionV2Store.commitTally(root, directive.electionId, tally, {
    expectedState: "collecting",
    nextState: draft.value.lifecycle,
  });
  if (!committed.ok) return storeError(directive.electionId, committed.error);
  return ok({ result: "tallied", from: "collecting", to: draft.value.lifecycle, runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: committed.value.repaired, committedAt: talliedAt });
}

export function renderElectionV2(
  root: string,
  directive: Extract<ElectionDirectiveV2, { kind: "render" }>,
  committedAt: string,
): ElectionCliResult<TransitionReceiptV2> {
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
  const path = join(resolveElectionDir(root, directive.electionId).dir, "record.md");
  if (!writeStoreFile(path, record).ok) return storeError(directive.electionId, "io-error");
  const moved = ElectionV2Store.setState(root, directive.electionId, "rendered");
  return moved.ok
    ? ok({ result: "rendered", from: "tallied", to: "rendered", runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt })
    : storeError(directive.electionId, moved.error);
}

export function verifyElectionV2(
  root: string,
  directive: Extract<ElectionDirectiveV2, { kind: "verify" }>,
  committedAt: string,
): ElectionCliResult<TransitionReceiptV2> {
  const checked = checkedDirective(root, directive);
  if (!checked.ok) return checked;
  const tally = checked.value.currentTally;
  if (tally === null) return cliError("store", directive.electionId, "restore the current tally and retry");
  const storeVerified = ElectionV2Store.verify(root, directive.electionId);
  if (!storeVerified.ok) return storeError(directive.electionId, storeVerified.error);
  let record: string;
  try {
    record = readFileSync(join(resolveElectionDir(root, directive.electionId).dir, "record.md"), "utf8");
  } catch {
    return cliError("verification", directive.electionId, "render the election record and retry");
  }
  const verified = verifyElectionRecord({
    definition: checked.value.definition,
    ledgerBallots: checked.value.ledger,
    materializedBallots: checked.value.ledger,
    history: checked.value.history,
    currentTally: tally,
    lifecycle: "tallied",
    lateResponses: [],
    timeline: checked.value.timeline,
    record,
  });
  if (!verified.ok) return cliError("verification", directive.electionId, "render a canonical record and retry");
  const moved = ElectionV2Store.setState(root, directive.electionId, "recorded");
  return moved.ok
    ? ok({ result: "verified", from: "rendered", to: "recorded", runId: tally.runId, targetQuestionIds: directive.targetQuestionIds, preservedResultDigest: directive.preservedResultDigest, repaired: false, committedAt })
    : storeError(directive.electionId, moved.error);
}

export function reportElectionV2(
  root: string,
  directive: ElectionDirectiveV2,
  committedAt: string,
): ElectionCliResult<TransitionReceiptV2> {
  if (directive.report === null) {
    return cliError("invalid-transition", directive.electionId, "execute an actionable directive");
  }
  const read = ElectionV2Store.readSnapshot(root, directive.electionId);
  if (!read.ok) return storeError(directive.electionId, read.error);
  const expectedTo: Record<Exclude<ReportResult, null>, ElectionV2State | readonly ElectionV2State[]> = {
    distributed: "collecting",
    tallied: ["partial", "tallied"],
    rendered: "rendered",
    verified: "recorded",
  };
  const states = Array.isArray(expectedTo[directive.report])
    ? expectedTo[directive.report]
    : [expectedTo[directive.report]];
  const current = read.value.currentTally;
  const expectedCurrentRun = directive.kind === "tally-ready"
    ? directive.candidateRunId
    : directive.expectedRunId;
  const currentTargets = current?.targetQuestionIds ?? directive.targetQuestionIds;
  let currentPreserved: string | null = null;
  if (current !== null) {
    if (directive.kind === "tally-ready") currentPreserved = current.preservedResultDigest;
    else {
      const digest = ElectionV2Store.establishedResultsDigest(root, directive.electionId, current);
      if (!digest.ok) return storeError(directive.electionId, digest.error);
      currentPreserved = digest.value;
    }
  }
  const expectedPreserved = directive.kind === "tally-ready" && directive.expectedRunId === null
    ? null
    : directive.preservedResultDigest;
  if (
    !states.includes(read.value.state) ||
    (expectedCurrentRun !== null && current?.runId !== expectedCurrentRun) ||
    !sameIds(currentTargets, directive.targetQuestionIds) ||
    currentPreserved !== expectedPreserved
  ) {
    return cliError("stale-directive", directive.electionId, "request a current directive and retry", {
      runId: expectedCurrentRun ?? undefined,
    });
  }
  return ok({
    result: directive.report,
    from: directive.expectedState,
    to: read.value.state,
    ...(current === null ? {} : { runId: current.runId }),
    targetQuestionIds: directive.targetQuestionIds,
    preservedResultDigest: directive.preservedResultDigest,
    repaired: false,
    committedAt,
  });
}

type CliArgs = { verb: string; electionId?: string; file?: string; project?: string };

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function isV2State(value: unknown): value is ElectionV2State {
  return typeof value === "string" && ["draft", "open", "collecting", "partial", "tallied", "rendered", "recorded"].includes(value);
}

function isHoldReason(value: unknown): value is HoldReason {
  return typeof value === "string" && ["tie", "block", "quorum-short", "discussion-needed", "split"].includes(value);
}

function parseDirective(raw: unknown): ElectionDirectiveV2 | null {
  if (!isRecord(raw) || raw.schemaVersion !== 2 || typeof raw.kind !== "string" || typeof raw.electionId !== "string") return null;
  const targets = strings(raw.targetQuestionIds);
  if (
    targets === null ||
    (raw.preservedResultDigest !== null && typeof raw.preservedResultDigest !== "string") ||
    !isV2State(raw.expectedState) ||
    (raw.expectedRunId !== null && typeof raw.expectedRunId !== "string")
  ) return null;
  const common = {
    electionId: raw.electionId,
    schemaVersion: 2 as const,
    targetQuestionIds: targets,
    preservedResultDigest: raw.preservedResultDigest,
    expectedState: raw.expectedState,
    expectedRunId: raw.expectedRunId,
  };
  if (raw.kind === "distribute" && raw.verb === "notify" && raw.report === "distributed") return { kind: raw.kind, ...common, verb: raw.verb, report: raw.report };
  if (raw.kind === "collect-wait" && raw.verb === null && raw.report === null) {
    const pending = strings(raw.pending);
    return pending === null ? null : { kind: raw.kind, ...common, verb: null, report: null, pending };
  }
  if (raw.kind === "tally-ready" && raw.verb === "tally" && raw.report === "tallied" && typeof raw.candidateRunId === "string") return { kind: raw.kind, ...common, verb: raw.verb, report: raw.report, candidateRunId: raw.candidateRunId };
  if (raw.kind === "hold" && raw.verb === "notify" && raw.report === "distributed" && Array.isArray(raw.held)) {
    const held = raw.held.flatMap((item) => isRecord(item) && typeof item.questionId === "string" && isHoldReason(item.reason) ? [{ questionId: item.questionId, reason: item.reason }] : []);
    return held.length === raw.held.length ? { kind: raw.kind, ...common, verb: raw.verb, report: raw.report, held } : null;
  }
  if (raw.kind === "render" && raw.verb === "render" && raw.report === "rendered") return { kind: raw.kind, ...common, verb: raw.verb, report: raw.report };
  if (raw.kind === "verify" && raw.verb === "verify" && raw.report === "verified") return { kind: raw.kind, ...common, verb: raw.verb, report: raw.report };
  if (raw.kind === "done" && raw.verb === null && raw.report === null) return { kind: raw.kind, ...common, verb: null, report: null };
  return null;
}

export function main(argv: readonly string[]): number {
  const args = parseCliArgs(argv);
  if (args === null) return 2;
  const root = electionsRoot(resolveProjectDir(args.project));
  if (args.verb === "open" && args.file !== undefined) {
    const raw = readJsonInput(args.file);
    return raw === null ? emit(cliError("decode", "unknown", "fix the input file and retry")) : emit(openElectionV2(root, raw));
  }
  if (args.electionId === undefined) return 2;
  if (args.verb === "next") return emit(nextElectionV2(root, args.electionId));
  if (args.verb === "status") return emit(statusElectionV2(root, args.electionId));
  if (args.verb === "vote" && args.file !== undefined) {
    const raw = readJsonInput(args.file);
    return raw === null ? emit(cliError("decode", args.electionId, "fix the ballot file and retry")) : emit(voteElectionV2(root, args.electionId, raw, normalizeAt(new Date().toISOString())));
  }
  if (args.file === undefined) return 2;
  const directive = parseDirective(readJsonInput(args.file));
  if (directive === null || directive.electionId !== args.electionId) return emit(cliError("decode", args.electionId, "use the current machine-readable directive"));
  const now = normalizeAt(new Date().toISOString());
  if (args.verb === "notify" && (directive.kind === "distribute" || directive.kind === "hold")) return emit(notifyElectionV2(root, directive));
  if (args.verb === "tally" && directive.kind === "tally-ready") return emit(tallyElectionV2(root, directive, now));
  if (args.verb === "render" && directive.kind === "render") return emit(renderElectionV2(root, directive, now));
  if (args.verb === "verify" && directive.kind === "verify") return emit(verifyElectionV2(root, directive, now));
  if (args.verb === "report") return emit(reportElectionV2(root, directive, now));
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
