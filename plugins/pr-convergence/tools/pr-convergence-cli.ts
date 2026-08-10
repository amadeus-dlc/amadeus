// pr-convergence-cli.ts — U2 convergence-toolchain, component C5.
//
// The four verbs of the convergence tool:
//
//   create    creates the Bolt pull request. When --record is present, resolves
//             the linked Intent from its registry and adds the Intent, Bolt,
//             and Unit identity to the title and authored body.
//   status    read-only. Prints the verdict as JSON. 0 = converged,
//             1 = not converged, 2 = the gh boundary failed, 3 = linked
//             pull-request provenance failed.
//   report    the same evaluation, and on convergence ONLY, writes the
//             machine-rendered report the artifact guard looks for. A
//             non-converged run writes nothing: a report that exists without
//             convergence is precisely the fail-open this tool exists to stop.
//   override  the human ruling path (ADR-3). Requires a real HUMAN_TURN in the
//             record's audit shards, refuses to "override" an already converged
//             pull request, records the ruling in the audit trail, and only
//             then writes a report that says `converged: false` forever.
//
// The audit record is written by spawning the host's amadeus-log tool rather
// than importing it: a plugin may not reach into core (ADR-6), so the process
// boundary is the same one already used for `gh`.
//
// Ordering note: the override path emits the audit record BEFORE writing the
// report. business-logic-model.md sketches the reverse order, but the rule it
// serves — "no advance without a record" — only holds this way round. If the
// write failed after a successful emit we would hold a record of a ruling with
// no report, which leaves the guard closed; the reverse leaves a report that
// can carry a unit forward with no audit trace.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import {
  createGhRunner,
  fetchRawPrState,
  type GhRunner,
  type GhSpawn,
  nodeGhSpawn,
  parsePrRef,
  type PrRef,
  type RawPrState,
} from "./pr-convergence-gh-runner.ts";
import {
  fetchAllReviewThreads,
  type LedgerSummary,
  ThreadLedger,
} from "./pr-convergence-ledger.ts";
import {
  classifyThread,
  type ConvergenceVerdict,
  evaluateConvergence,
  type EvaluatedVerdict,
  labeledVerdict,
  LandedFacts,
  landedVerdict,
  PrLifecycleState,
  type RawPrStateFetch,
  resolveMergeable,
  type Sleep,
} from "./pr-convergence-predicate.ts";
import {
  renderPullRequestBody,
  renderPullRequestTitle,
  resolveIntentReference,
} from "./pr-convergence-presentation.ts";
import {
  checkProvenance,
  renderProvenanceRemediation,
} from "./pr-convergence-provenance.ts";

// ---------------------------------------------------------------------------
// The report (the artifact the guard reads)
// ---------------------------------------------------------------------------

export interface OverrideRecord {
  readonly humanTurnId: string;
  readonly reason: string;
  readonly recordedAt: string;
}

export type ConvergenceReport =
  | {
      readonly kind: "converged";
      readonly generatedAt: string;
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly verdict: ConvergenceVerdict;
      readonly ledgerSummary: LedgerSummary;
    }
  | {
      // The override verdict admits the labelled shape so a human may still
      // rule forward a pull request whose evaluation landed (#2401).
      readonly kind: "override";
      readonly generatedAt: string;
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly verdict: ConvergenceVerdict | EvaluatedVerdict;
      readonly ledgerSummary: LedgerSummary;
      readonly override: OverrideRecord;
    }
  | {
      // The factual record of a merged pull request (#2401). No verdict and no
      // ledger: the convergence predicate never ran, so there is nothing to
      // report but the merge itself.
      readonly kind: "landed";
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly mergedAt: string;
      readonly mergeCommitOid: string;
      readonly checkRollupState: string | null;
      readonly generatedAt: string;
    };

export const REPORT_BASENAME = "pr-convergence-report.md";

/** FR-2b: the path the code-generation artifact guard resolves. */
export function reportPathFor(recordRoot: string, unit: string): string {
  return join(recordRoot, "construction", unit, "code-generation", REPORT_BASENAME);
}

/**
 * The only way a report comes into existence (BR-U2-7). Hand-writing this file
 * is detectable precisely because every field here is derived.
 */
export function renderReport(report: ConvergenceReport): string {
  if (report.kind === "landed") {
    return [
      "# PR Convergence Report",
      "",
      "- kind: landed",
      `- pull request: ${report.prRef.repo}#${report.prRef.number}`,
      "- converged: false",
      `- merged at: ${report.mergedAt}`,
      `- merge commit: ${report.mergeCommitOid}`,
      // Informational only: a merged PR may have carried no checks at all, and
      // an absent rollup is not a field worth rendering as "null".
      ...(report.checkRollupState === null ? [] : [`- check rollup: ${report.checkRollupState}`]),
      `- generated at: ${report.generatedAt}`,
      "",
    ].join("\n");
  }
  const { verdict, ledgerSummary: s, prRef } = report;
  const lines = [
    "# PR Convergence Report",
    "",
    `- kind: ${report.kind}`,
    `- pull request: ${prRef.repo}#${prRef.number}`,
    `- generated at: ${report.generatedAt}`,
    `- converged: ${verdict.converged}`,
    `- merge state: ${verdict.mergeState}`,
    `- mergeable resolution: ${verdict.mergeableResolution}`,
    "",
    "## Violating threads",
    "",
    `- replied-unresolved: ${verdict.violating.repliedUnresolved}`,
    `- ignored: ${verdict.violating.ignored}`,
    "",
    "## Ledger",
    "",
    `- resolved: ${s.resolved}`,
    `- outdated: ${s.outdated}`,
    `- replied-unresolved: ${s.repliedUnresolved}`,
    `- ignored: ${s.ignored}`,
    `- human-only (out of scope): ${s.humanOnly}`,
    `- terminalized: ${s.terminalized}`,
  ];
  if (report.kind === "override") {
    lines.push(
      "",
      "## Human override",
      "",
      "この PR は収束未確認のまま人間裁定で前進した。",
      "",
      `- human turn: ${report.override.humanTurnId}`,
      `- recorded at: ${report.override.recordedAt}`,
      `- reason: ${report.override.reason}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Human-turn evidence (BR-U2-8)
// ---------------------------------------------------------------------------

export interface HumanTurn {
  readonly eventId: string;
  readonly timestamp: string;
  readonly seq: number;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the record's audit shards and returns the newest HUMAN_TURN, or null.
 * Read-only by construction: the override path verifies human presence, it
 * never mints it.
 */
/** One audit line, or null when it is not a well-formed HUMAN_TURN record. */
function humanTurnFromLine(line: string): HumanTurn | null {
  if (line.trim() === "") return null;
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    return null; // A truncated tail must not hide the turns before it.
  }
  if (!isRecordObject(event)) return null;
  // Two shard generations coexist on disk: schemaVersion 2 rows carry the
  // audit event under attributes.Event with an eventId; legacy schemaVersion 1
  // rows carry it on the top-level `event` field and have no eventId.
  const attributes = event.attributes;
  const isV2 = isRecordObject(attributes) && attributes.Event === "HUMAN_TURN";
  const isV1 = event.event === "HUMAN_TURN";
  if (!isV2 && !isV1) return null;
  const { eventId, timestamp, seq } = event;
  if (typeof timestamp !== "string") return null;
  const seqValue = typeof seq === "number" ? seq : 0;
  if (typeof eventId === "string") return { eventId, timestamp, seq: seqValue };
  if (!isV1) return null;
  // A v1 row has no eventId; derive a stable reference from its own fields so
  // the override report still names the exact turn it is bound to.
  const cloneId = typeof event.cloneId === "string" ? event.cloneId : "unknown";
  return { eventId: `v1:${cloneId}:${seqValue}`, timestamp, seq: seqValue };
}

export function latestHumanTurn(recordRoot: string): HumanTurn | null {
  const auditDir = join(recordRoot, "audit");
  if (!existsSync(auditDir)) return null;
  let newest: HumanTurn | null = null;
  for (const name of readdirSync(auditDir).sort()) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(auditDir, name), "utf-8").split("\n")) {
      const turn = humanTurnFromLine(line);
      if (turn !== null && (newest === null || isNewer(turn, newest))) newest = turn;
    }
  }
  return newest;
}

function isNewer(candidate: HumanTurn, incumbent: HumanTurn): boolean {
  // Shards mix second-precision and millisecond timestamps; a plain string
  // compare would rank "…:00.500Z" below "…:00Z", so normalise via Date.parse.
  const a = Date.parse(candidate.timestamp);
  const b = Date.parse(incumbent.timestamp);
  // An unparseable timestamp must not win by accident: fall back to seq.
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a > b;
  return candidate.seq > incumbent.seq;
}

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

export interface DecisionResult {
  readonly code: number;
  readonly stderr: string;
}

/** Spawns the host's amadeus-log tool. Injected so tests never emit real audit. */
export type DecisionEmitter = (argv: readonly string[]) => Promise<DecisionResult>;

export interface CliSeams {
  readonly ghSpawn: GhSpawn;
  readonly sleep: Sleep;
  readonly now: () => string;
  readonly emitDecision: DecisionEmitter;
}

/**
 * Where the host's amadeus-log tool sits relative to THIS file. A composed
 * plugin lives at `<harnessDir>/plugins/<name>/tools/`, so walking out three
 * levels lands on the harness directory and its sibling `tools/`. Deriving it
 * this way keeps the plugin harness-neutral: it ships into every harness tree,
 * and naming any one of them here would break the others.
 */
export const DEFAULT_LOG_TOOL_RELATIVE = "../../../tools/amadeus-log.ts";

export function defaultLogToolPath(): string {
  return resolve(import.meta.dir, DEFAULT_LOG_TOOL_RELATIVE);
}

export const nodeDecisionEmitter: DecisionEmitter = (argv) =>
  new Promise<DecisionResult>((resolve) => {
    const [command, ...args] = argv;
    if (command === undefined) {
      resolve({ code: -1, stderr: "empty argv" });
      return;
    }
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => resolve({ code: -1, stderr: String(err) }));
    child.on("close", (code) => resolve({ code: code ?? -1, stderr }));
  });

export const defaultSeams: CliSeams = {
  ghSpawn: nodeGhSpawn,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  emitDecision: nodeDecisionEmitter,
};

// ---------------------------------------------------------------------------
// Argument parsing (parse-don't-validate at the boundary)
// ---------------------------------------------------------------------------

const UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

interface ConvergenceOptions {
  readonly verb: "status" | "report" | "override";
  readonly ref: PrRef;
  readonly unit: string;
  readonly record: string;
  readonly reason: string | null;
  readonly logTool: string;
  readonly unlinked: boolean;
}

interface CreateBaseOptions {
  readonly verb: "create";
  readonly repo: string;
  readonly head: string;
  readonly title: string;
  readonly bodyFile: string;
  readonly base: string | null;
}

type CreateWorkOptions =
  | { readonly record: null; readonly bolt: null; readonly unit: null }
  | { readonly record: string; readonly bolt: string; readonly unit: string };

type CreateOptions = CreateBaseOptions & CreateWorkOptions;

type CliOptions = ConvergenceOptions | CreateOptions;

type OptionParse =
  | { readonly ok: true; readonly value: CliOptions }
  | { readonly ok: false; readonly message: string };

/** `--key value` pairs only. An odd or unprefixed token is a loud failure. */
function parseFlags(rest: readonly string[]): Map<string, string> | null {
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) return null;
    flags.set(key.slice(2), value);
  }
  return flags;
}

interface CliTarget {
  readonly ref: PrRef;
  readonly unit: string;
  readonly record: string;
}

type TargetParse =
  | { readonly ok: true; readonly value: CliTarget }
  | { readonly ok: false; readonly message: string };

/** The pull request, the unit and the record root — every verb needs all three. */
function resolveTarget(flags: Map<string, string>): TargetParse {
  const repo = flags.get("repo");
  const pr = flags.get("pr");
  const unit = flags.get("unit");
  const record = flags.get("record");
  if (repo === undefined || pr === undefined) {
    return { ok: false, message: "--repo and --pr are required" };
  }
  if (unit === undefined || !UNIT_RE.test(unit)) {
    return { ok: false, message: "--unit is required and must be a slug" };
  }
  if (record === undefined) return { ok: false, message: "--record is required" };
  const ref = parsePrRef(repo, pr);
  if (ref === null) {
    return { ok: false, message: `--repo/--pr do not name a pull request: ${repo} ${pr}` };
  }
  return { ok: true, value: { ref, unit, record } };
}

type CreateWorkParse =
  | { readonly ok: true; readonly value: CreateWorkOptions }
  | { readonly ok: false; readonly message: string };

function parseCreateWork(flags: Map<string, string>): CreateWorkParse {
  const record = flags.get("record") ?? null;
  const bolt = flags.get("bolt") ?? null;
  const unit = flags.get("unit") ?? null;
  if (record === null) {
    if (bolt !== null || unit !== null) {
      return { ok: false, message: "--bolt and --unit require --record" };
    }
    return { ok: true, value: { record: null, bolt: null, unit: null } };
  }
  if (bolt === null || unit === null || !UNIT_RE.test(bolt) || !UNIT_RE.test(unit)) {
    return { ok: false, message: "--record requires --bolt and --unit slugs" };
  }
  return { ok: true, value: { record, bolt, unit } };
}

function parseCreateOptions(flags: Map<string, string>): OptionParse {
  const repo = flags.get("repo");
  const head = flags.get("head")?.trim();
  const title = flags.get("title")?.trim();
  const bodyFile = flags.get("body-file");
  if (repo === undefined || parsePrRef(repo, 1) === null) {
    return { ok: false, message: "--repo is required and must be owner/name" };
  }
  if (head === undefined || head === "") return { ok: false, message: "--head is required" };
  if (title === undefined || title === "") return { ok: false, message: "--title is required" };
  if (bodyFile === undefined) return { ok: false, message: "--body-file is required" };
  const work = parseCreateWork(flags);
  if (!work.ok) return work;
  return {
    ok: true,
    value: {
      verb: "create",
      repo,
      head,
      title,
      bodyFile,
      ...work.value,
      base: flags.get("base") ?? null,
    },
  };
}

function parseOptions(argv: readonly string[]): OptionParse {
  const [verb, ...rest] = argv;
  const flags = parseFlags(rest);
  if (flags === null) return { ok: false, message: "malformed flags: expected --key value pairs" };
  if (verb === "create") return parseCreateOptions(flags);
  if (verb !== "status" && verb !== "report" && verb !== "override") {
    return { ok: false, message: `unknown verb: ${String(verb)} (expected create|status|report|override)` };
  }
  const target = resolveTarget(flags);
  if (!target.ok) return target;
  const reason = flags.get("reason") ?? null;
  const unlinked = flags.get("unlinked");
  if (unlinked !== undefined && unlinked !== "true") {
    return { ok: false, message: "--unlinked must be exactly true when provided" };
  }
  if (verb === "override" && (reason === null || reason.trim() === "")) {
    return { ok: false, message: "--reason is required for override" };
  }
  return {
    ok: true,
    value: {
      verb,
      ...target.value,
      reason,
      logTool: flags.get("log-tool") ?? defaultLogToolPath(),
      unlinked: unlinked === "true",
    },
  };
}

async function createPullRequest(options: CreateOptions, seams: CliSeams): Promise<CliOutcome> {
  let title = options.title;
  let body: string;
  try {
    body = readFileSync(options.bodyFile, "utf-8");
  } catch (err) {
    return { exitCode: 2, stdout: "", stderr: `cannot read --body-file: ${String(err)}\n` };
  }
  if (options.record !== null) {
    if (/^## Amadeus Work\s*$/mu.test(body)) {
      return { exitCode: 2, stdout: "", stderr: "--body-file already contains ## Amadeus Work\n" };
    }
    const intent = resolveIntentReference(options.record);
    if (!intent.ok) return { exitCode: 2, stdout: "", stderr: `${intent.message}\n` };
    const work = {
      intent: intent.value,
      bolt: options.bolt,
      unit: options.unit,
    };
    title = renderPullRequestTitle(title, work);
    body = renderPullRequestBody(body, work);
  }
  const runner = await createGhRunner(seams.ghSpawn);
  if (!runner.ok) {
    return { exitCode: 2, stdout: "", stderr: `gh unavailable: ${runner.error.kind}\n` };
  }
  const argv = [
    "gh",
    "pr",
    "create",
    "--repo",
    options.repo,
    "--head",
    options.head,
    "--title",
    title,
    "--body",
    body,
    ...(options.base === null ? [] : ["--base", options.base]),
  ];
  const created = await runner.value(argv);
  if (!created.ok) {
    const detail =
      created.error.kind === "command-failed"
        ? `${created.error.kind} (exit ${created.error.exitCode}, stderr ${created.error.stderrDigest})`
        : created.error.kind;
    return { exitCode: 2, stdout: "", stderr: `gh failed creating pull request: ${detail}\n` };
  }
  return { exitCode: 0, stdout: created.value, stderr: "" };
}

// ---------------------------------------------------------------------------
// Evaluation (shared by all three verbs)
// ---------------------------------------------------------------------------

/**
 * What one evaluation pass produced. The `active` arm keeps the un-labelled
 * ConvergenceVerdict (`core`) alongside its label because the converged report
 * shape is pinned to ConvergenceVerdict; the `landed` arm never ran the
 * convergence predicate at all, so it carries the merge facts instead.
 */
type Evaluation =
  | {
      readonly kind: "landed";
      readonly facts: LandedFacts;
      readonly verdict: EvaluatedVerdict;
      readonly summary: LedgerSummary;
      readonly provenanceSource: ProvenanceSource;
    }
  | {
      readonly kind: "active";
      readonly core: ConvergenceVerdict;
      readonly verdict: EvaluatedVerdict;
      readonly summary: LedgerSummary;
      readonly provenanceSource: ProvenanceSource;
    };

interface ProvenanceSource {
  readonly title: string;
  readonly body: string;
}

type EvaluationResult =
  | { readonly ok: true; readonly value: Evaluation }
  | { readonly ok: false; readonly message: string };

/** A ledger summary for a pull request whose threads were never read: a landed
 *  verdict records a merge, so every thread count is zero by construction. */
const EMPTY_LEDGER_SUMMARY: LedgerSummary = {
  resolved: 0,
  outdated: 0,
  repliedUnresolved: 0,
  ignored: 0,
  humanOnly: 0,
  terminalized: 0,
};

type PrLifecycleResolution =
  | { readonly kind: "merged"; readonly facts: LandedFacts; readonly first: RawPrState }
  | { readonly kind: "active"; readonly first: RawPrState };

type LifecycleResult =
  | { readonly ok: true; readonly value: PrLifecycleResolution }
  | { readonly ok: false; readonly message: string };

/**
 * One state read decides the lifecycle before any convergence work starts. A
 * gh failure passes through; an unknown state value throws (AC-1b), exactly
 * like an unknown mergeStateStatus.
 */
async function resolvePrLifecycle(gh: GhRunner, ref: PrRef): Promise<LifecycleResult> {
  const raw = await fetchRawPrState(gh, ref);
  if (!raw.ok) return { ok: false, message: `gh failed reading merge state: ${raw.error.kind}` };
  const first = raw.value;
  // Ruling E-MPC-CGBLK: a response without `state` predates the lifecycle
  // extension (older scripted doubles replay such payloads). It carries no
  // evidence of a merge, so it takes the active path; a state that is PRESENT
  // but unknown still throws (AC-1b stays fail-closed).
  if (first.state === undefined) return { ok: true, value: { kind: "active", first } };
  if (PrLifecycleState.parse(first.state) === "MERGED") {
    return { ok: true, value: { kind: "merged", facts: LandedFacts.parse(first), first } };
  }
  return { ok: true, value: { kind: "active", first } };
}

/**
 * A fetch that answers the first call from the lifecycle read and every later
 * call from the live boundary — the lifecycle check adds no gh traffic to the
 * mergeable UNKNOWN loop.
 */
function primed(first: RawPrState, fetch: typeof fetchRawPrState): RawPrStateFetch {
  let used = false;
  return async (gh, ref) => {
    if (!used) {
      used = true;
      return { ok: true, value: first };
    }
    return fetch(gh, ref);
  };
}

async function evaluate(options: ConvergenceOptions, seams: CliSeams): Promise<EvaluationResult> {
  const runner = await createGhRunner(seams.ghSpawn);
  if (!runner.ok) return { ok: false, message: `gh unavailable: ${runner.error.kind}` };
  const gh = runner.value;

  const lifecycle = await resolvePrLifecycle(gh, options.ref);
  if (!lifecycle.ok) return lifecycle;
  if (lifecycle.value.kind === "merged") {
    const facts = lifecycle.value.facts;
    return {
      ok: true,
      value: {
        kind: "landed",
        facts,
        verdict: landedVerdict(facts),
        summary: EMPTY_LEDGER_SUMMARY,
        provenanceSource: lifecycle.value.first,
      },
    };
  }

  const mergeable = await resolveMergeable(gh, options.ref, {
    fetchRawPrState: primed(lifecycle.value.first, fetchRawPrState),
    sleep: seams.sleep,
  });
  if (mergeable.kind === "gh-failure") {
    return { ok: false, message: `gh failed reading merge state: ${mergeable.error.kind}` };
  }

  const threads = await fetchAllReviewThreads(gh, options.ref);
  if (!threads.ok) {
    return { ok: false, message: `gh failed reading review threads: ${threads.error.kind}` };
  }

  const ledger = ThreadLedger.build(options.ref, threads.value, classifyThread);
  const core = evaluateConvergence({
    repliedUnresolved: ledger.count("replied-unresolved"),
    ignored: ledger.count("ignored"),
    state: mergeable.state,
    resolution: mergeable.kind === "resolved" ? "resolved" : "unknown-exhausted",
  });
  return {
    ok: true,
    value: {
      kind: "active",
      core,
      verdict: labeledVerdict(core),
      summary: ledger.summary(),
      provenanceSource: lifecycle.value.first,
    },
  };
}

// The report verb's whole outcome, split out of runCli so the dispatcher stays
// under the complexity ceiling. A merged pull request gets its factual record
// (#2401): no human turn is read and no decision is emitted — landing is a
// merge that already happened, not an approval.
function reportOutcome(options: ConvergenceOptions, seams: CliSeams, evaluation: Evaluation): CliOutcome {
  if (evaluation.kind === "landed") {
    const facts = evaluation.facts;
    const path = writeReport(options, {
      kind: "landed",
      prRef: refValue(options.ref),
      mergedAt: facts.mergedAt,
      mergeCommitOid: facts.mergeCommitOid,
      checkRollupState: facts.checkRollupState,
      generatedAt: seams.now(),
    });
    return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
  }
  const { verdict, summary } = evaluation;
  if (!verdict.converged) {
    return {
      exitCode: 1,
      stdout: "",
      stderr:
        `not converged — no report written. replied-unresolved=${verdict.violating.repliedUnresolved} ` +
        `ignored=${verdict.violating.ignored} mergeState=${verdict.mergeState} ` +
        `mergeable=${verdict.mergeableResolution}\n`,
    };
  }
  const path = writeReport(options, {
    kind: "converged",
    generatedAt: seams.now(),
    prRef: refValue(options.ref),
    verdict: evaluation.core,
    ledgerSummary: summary,
  });
  return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
}

function writeReport(options: ConvergenceOptions, report: ConvergenceReport): string {
  const path = reportPathFor(options.record, options.unit);
  mkdirSync(join(options.record, "construction", options.unit, "code-generation"), {
    recursive: true,
  });
  writeFileSync(path, renderReport(report), "utf-8");
  return path;
}

function refValue(ref: PrRef): { repo: string; number: number } {
  return { repo: ref.repo, number: ref.number as number };
}

// ---------------------------------------------------------------------------
// The CLI
// ---------------------------------------------------------------------------

export interface CliOutcome {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function provenanceOutcome(
  options: ConvergenceOptions,
  evaluation: Evaluation,
): CliOutcome | null {
  if (options.verb === "override" || options.unlinked) return null;
  const provenance = checkProvenance({
    ...evaluation.provenanceSource,
    record: options.record,
    unit: options.unit,
  });
  if (provenance.ok) return null;
  return {
    exitCode: 3,
    stdout: JSON.stringify(
      {
        kind: "provenance-violation",
        prRef: refValue(options.ref),
        violations: provenance.violations,
      },
      null,
      2,
    ),
    stderr: `${renderProvenanceRemediation(provenance.violations)}\n`,
  };
}

async function runConvergence(options: ConvergenceOptions, seams: CliSeams): Promise<CliOutcome> {
  let evaluation: EvaluationResult;
  try {
    evaluation = await evaluate(options, seams);
  } catch (err) {
    // A parse throw (unknown mergeStateStatus, malformed thread) is a boundary
    // fault, not a "not converged" answer.
    return { exitCode: 2, stdout: "", stderr: `${String(err)}\n` };
  }
  if (!evaluation.ok) return { exitCode: 2, stdout: "", stderr: `${evaluation.message}\n` };
  const { verdict, summary } = evaluation.value;
  const provenanceFailure = provenanceOutcome(options, evaluation.value);
  if (provenanceFailure !== null) return provenanceFailure;

  if (options.verb === "status") {
    const payload = JSON.stringify(
      {
        converged: verdict.converged,
        verdict: verdict.verdict,
        violating: verdict.violating,
        mergeState: verdict.mergeState,
        mergeableResolution: verdict.mergeableResolution,
        prRef: refValue(options.ref),
        ledger: summary,
      },
      null,
      2,
    );
    // A landed pull request is a settled fact: exit 0, like convergence.
    const settled = verdict.converged || evaluation.value.kind === "landed";
    return { exitCode: settled ? 0 : 1, stdout: payload, stderr: "" };
  }

  if (options.verb === "report") return reportOutcome(options, seams, evaluation.value);

  // override
  const humanTurn = latestHumanTurn(options.record);
  if (humanTurn === null) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "override refused: no HUMAN_TURN found in the record's audit shards\n",
    };
  }
  if (verdict.converged) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "override refused: the pull request is already converged — use the report verb\n",
    };
  }

  const recordedAt = seams.now();
  const decision =
    `pr-convergence override: ${options.ref.repo}#${options.ref.number} unit=${options.unit} ` +
    `converged=false humanTurn=${humanTurn.eventId} reason=${options.reason ?? ""}`;
  const emitted = await seams.emitDecision([
    "bun",
    options.logTool,
    "decision",
    "--stage",
    "code-generation",
    "--decision",
    decision,
    "--rationale",
    options.reason ?? "",
  ]);
  if (emitted.code !== 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `override refused: audit emission failed (exit ${emitted.code}) ${emitted.stderr}\n`,
    };
  }

  const path = writeReport(options, {
    kind: "override",
    generatedAt: recordedAt,
    prRef: refValue(options.ref),
    verdict,
    ledgerSummary: summary,
    override: { humanTurnId: humanTurn.eventId, reason: options.reason ?? "", recordedAt },
  });
  return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
}

export async function runCli(argv: readonly string[], seams: CliSeams): Promise<CliOutcome> {
  const parsed = parseOptions(argv);
  if (!parsed.ok) return { exitCode: 2, stdout: "", stderr: `${parsed.message}\n` };
  const options = parsed.value;
  if (options.verb === "create") return createPullRequest(options, seams);
  return runConvergence(options, seams);
}

if (import.meta.main) {
  const outcome = await runCli(process.argv.slice(2), defaultSeams);
  if (outcome.stdout !== "") process.stdout.write(outcome.stdout.endsWith("\n") ? outcome.stdout : `${outcome.stdout}\n`);
  if (outcome.stderr !== "") process.stderr.write(outcome.stderr);
  process.exit(outcome.exitCode);
}
