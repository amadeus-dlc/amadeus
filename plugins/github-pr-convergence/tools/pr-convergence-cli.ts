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
  fetchMergedPrForHead,
  fetchOpenPrForHead,
  fetchRawPrState,
  type GhError,
  type GhRunner,
  type GhSpawn,
  nodeGhSpawn,
  type OpenPrSummary,
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
  canonicalUnitSlugs,
  resolveDeliveryBoltMembership,
} from "./pr-convergence-presentation.ts";
import {
  checkProvenance,
  parseAmadeusWork,
  renderProvenanceRemediation,
} from "./pr-convergence-provenance.ts";
import {
  ATTESTATION_EVENT,
  auditCarriesAttestation,
  attestationId,
  isSelfRecord,
  parseAttestation,
  REPORT_BASENAME,
  type ReportAttestation,
  reportPathFor,
  renderAttestation,
  renderOwnerProjection,
  reportPayload,
  reportPayloadDigest,
} from "./pr-convergence-attestation.ts";
import {
  type GitSpawn,
  type LandedEpochProof,
  nodeGitSpawn,
  verifyCreatePrerequisites,
  verifyCurrentPrerequisites,
  verifyLandedPrerequisites,
  verifyMergedEpochAncestry,
  verifySupersedeAncestry,
} from "./pr-convergence-git-runner.ts";

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
      readonly kind: "created";
      readonly generatedAt: string;
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly attestation?: ReportAttestation;
    }
  | {
      readonly kind: "converged";
      readonly generatedAt: string;
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly verdict: ConvergenceVerdict;
      readonly ledgerSummary: LedgerSummary;
      readonly attestation?: ReportAttestation;
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
      readonly attestation?: ReportAttestation;
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
      readonly attestation?: ReportAttestation;
    }
  | {
      // A unit whose OWN pull request never converged: the work reached the
      // trunk through a different pull request or commit entirely (#3239).
      // No verdict and no ledger — the convergence predicate never ran
      // against this pull request, and a human ruled its delivery closed
      // instead of the loop. `supersededBy` is the commit that actually
      // delivered the work, measured by ancestry against the checkout that
      // mints this record.
      readonly kind: "superseded";
      readonly generatedAt: string;
      readonly prRef: { readonly repo: string; readonly number: number };
      readonly supersededBy: string;
      readonly override: OverrideRecord;
      readonly attestation?: ReportAttestation;
    };

export { REPORT_BASENAME, reportPathFor };

/**
 * The only way a report comes into existence (BR-U2-7). Hand-writing this file
 * is detectable precisely because every field here is derived.
 */
export function renderReport(report: ConvergenceReport): string {
  if (report.kind === "created") {
    const payload = [
      "# PR Convergence Report", "", "- kind: created",
      `- pull request: ${report.prRef.repo}#${report.prRef.number}`,
      `- generated at: ${report.generatedAt}`, "- converged: false", "",
    ].join("\n");
    return report.attestation === undefined ? payload : `${payload}${renderAttestation(report.attestation)}`;
  }
  if (report.kind === "landed") {
    const payload = [
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
    return report.attestation === undefined ? payload : `${payload}${renderAttestation(report.attestation)}`;
  }
  if (report.kind === "superseded") {
    const payload = [
      "# PR Convergence Report",
      "",
      "- kind: superseded",
      `- pull request: ${report.prRef.repo}#${report.prRef.number}`,
      `- superseded by: ${report.supersededBy}`,
      "- converged: false",
      `- human turn: ${report.override.humanTurnId}`,
      `- reason: ${report.override.reason}`,
      `- recorded at: ${report.override.recordedAt}`,
      `- generated at: ${report.generatedAt}`,
      "",
    ].join("\n");
    return report.attestation === undefined ? payload : `${payload}${renderAttestation(report.attestation)}`;
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
  const payload = lines.join("\n");
  return report.attestation === undefined ? payload : `${payload}${renderAttestation(report.attestation)}`;
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
  readonly stdout?: string;
}

/** Spawns the host's amadeus-log tool. Injected so tests never emit real audit. */
export type DecisionEmitter = (argv: readonly string[]) => Promise<DecisionResult>;

export interface CliSeams {
  readonly ghSpawn: GhSpawn;
  readonly sleep: Sleep;
  readonly now: () => string;
  readonly emitDecision: DecisionEmitter;
  readonly emitAttestation?: DecisionEmitter;
  readonly fireSensor?: DecisionEmitter;
  readonly gitSpawn?: GitSpawn;
}

/**
 * Where the host's amadeus-log tool sits relative to THIS file. A composed
 * plugin lives at `<harnessDir>/plugins/<name>/tools/`, so walking out three
 * levels lands on the harness directory and its sibling `tools/`. Deriving it
 * this way keeps the plugin harness-neutral: it ships into every harness tree,
 * and naming any one of them here would break the others.
 */
export const DEFAULT_LOG_TOOL_RELATIVE = "../../../tools/amadeus-log.ts";
export const DEFAULT_AUDIT_TOOL_RELATIVE = "../../../tools/amadeus-audit.ts";
export const DEFAULT_SENSOR_TOOL_RELATIVE = "../../../tools/amadeus-sensor.ts";

export function defaultLogToolPath(): string {
  return resolve(import.meta.dir, DEFAULT_LOG_TOOL_RELATIVE);
}

function siblingCoreTool(relativePath: string): string {
  return resolve(import.meta.dir, relativePath);
}

export const nodeDecisionEmitter: DecisionEmitter = (argv) =>
  new Promise<DecisionResult>((resolve) => {
    const [command, ...args] = argv;
    if (command === undefined) {
      resolve({ code: -1, stderr: "empty argv" });
      return;
    }
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf-8"); });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => resolve({ code: -1, stderr: String(err) }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });

export const defaultSeams: CliSeams = {
  ghSpawn: nodeGhSpawn,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  emitDecision: nodeDecisionEmitter,
  emitAttestation: nodeDecisionEmitter,
  fireSensor: nodeDecisionEmitter,
  gitSpawn: nodeGitSpawn,
};

// ---------------------------------------------------------------------------
// Argument parsing (parse-don't-validate at the boundary)
// ---------------------------------------------------------------------------

const UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

interface ConvergenceOptions {
  readonly verb: "status" | "report" | "override";
  readonly ref: PrRef;
  readonly unit: string;
  readonly units: readonly string[];
  readonly record: string;
  readonly reason: string | null;
  readonly logTool: string;
  readonly unlinked: boolean;
  // The supersede arm of `override` (#3239): the commit that actually
  // delivered this unit's work, when this delivery's own pull request never
  // converged, and the Bolt it belongs to — supersede never reaches a pull
  // request body to read the Amadeus Work identity from, so `bolt` is
  // supplied the same way `create` supplies it. The pair is one optional
  // field, not two independently-nullable ones: the parser is the only place
  // that decides whether supersede applies, and there is no state where one
  // is present without the other for `runSupersede` to re-check.
  readonly supersede: SupersedeFlags | null;
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
  | { readonly record: null; readonly bolt: null; readonly unit: null; readonly units: readonly [] }
  | { readonly record: string; readonly bolt: string; readonly unit: string; readonly units: readonly string[] };

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
  readonly units: readonly string[];
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
  const units = parseMemberUnits(flags, unit);
  if (!units.ok) return units;
  const ref = parsePrRef(repo, pr);
  if (ref === null) {
    return { ok: false, message: `--repo/--pr do not name a pull request: ${repo} ${pr}` };
  }
  return { ok: true, value: { ref, unit, units: units.value, record } };
}

function parseMemberUnits(
  flags: Map<string, string>,
  owner: string,
): { readonly ok: true; readonly value: readonly string[] } | { readonly ok: false; readonly message: string } {
  const parsed = canonicalUnitSlugs((flags.get("units") ?? owner).split(","));
  if (!parsed.ok) return parsed;
  if (!parsed.value.includes(owner)) return { ok: false, message: "--unit must be a member of --units" };
  return parsed;
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
    return { ok: true, value: { record: null, bolt: null, unit: null, units: [] } };
  }
  if (bolt === null || unit === null || !UNIT_RE.test(bolt) || !UNIT_RE.test(unit)) {
    return { ok: false, message: "--record requires --bolt and --unit slugs" };
  }
  const units = parseMemberUnits(flags, unit);
  if (!units.ok) return units;
  return { ok: true, value: { record, bolt, unit, units: units.value } };
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

type UnlinkedParse =
  | { readonly ok: true; readonly value: boolean }
  | { readonly ok: false; readonly message: string };

function parseUnlinked(flags: Map<string, string>): UnlinkedParse {
  const value = flags.get("unlinked");
  if (value === undefined) return { ok: true, value: false };
  if (value !== "true") {
    return { ok: false, message: "--unlinked must be exactly true when provided" };
  }
  return { ok: true, value: true };
}

const SUPERSEDED_BY_RE = /^[0-9a-f]{40}$/;

interface SupersedeFlags {
  readonly supersededBy: string;
  readonly bolt: string;
}

type SupersedeFlagsParse =
  | { readonly ok: true; readonly value: SupersedeFlags | null }
  | { readonly ok: false; readonly message: string };

/** `--superseded-by` is override-only, and only a full commit object id: no PR
 *  resolution happens inside the CLI (#3239 keeps the simplest shape — the
 *  caller resolves a pull request to the commit that landed it). `--bolt` is
 *  required alongside it, the same way `create` requires its own `--bolt`.
 *  The pair is minted together or not at all — there is no `SupersedeFlags`
 *  with only one field set for a downstream check to catch. */
function parseSupersedeFlags(flags: Map<string, string>, verb: string): SupersedeFlagsParse {
  const value = flags.get("superseded-by");
  if (value === undefined) return { ok: true, value: null };
  if (verb !== "override") return { ok: false, message: "--superseded-by is only valid with override" };
  if (!SUPERSEDED_BY_RE.test(value)) {
    return { ok: false, message: "--superseded-by must be a full commit object id" };
  }
  const bolt = flags.get("bolt") ?? null;
  if (bolt === null || !UNIT_RE.test(bolt)) {
    return { ok: false, message: "--bolt is required and must be a slug with --superseded-by" };
  }
  return { ok: true, value: { supersededBy: value, bolt } };
}

const KNOWN_CONVERGENCE_VERBS = new Set(["status", "report", "override"]);

type ReasonParse =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly message: string };

/** `--reason` is free-form everywhere except `override`, which requires a
 *  non-blank one — the whole point of a human ruling is that it says why. */
function parseReason(flags: Map<string, string>, verb: string): ReasonParse {
  const reason = flags.get("reason") ?? null;
  if (verb === "override" && (reason === null || reason.trim() === "")) {
    return { ok: false, message: "--reason is required for override" };
  }
  return { ok: true, value: reason };
}

function parseConvergenceOptions(
  verb: "status" | "report" | "override",
  flags: Map<string, string>,
): OptionParse {
  const target = resolveTarget(flags);
  if (!target.ok) return target;
  const reason = parseReason(flags, verb);
  if (!reason.ok) return reason;
  const unlinked = parseUnlinked(flags);
  if (!unlinked.ok) return unlinked;
  const supersede = parseSupersedeFlags(flags, verb);
  if (!supersede.ok) return supersede;
  return {
    ok: true,
    value: {
      verb,
      ...target.value,
      reason: reason.value,
      logTool: flags.get("log-tool") ?? defaultLogToolPath(),
      unlinked: unlinked.value,
      supersede: supersede.value,
    },
  };
}

function parseOptions(argv: readonly string[]): OptionParse {
  const [verb, ...rest] = argv;
  const flags = parseFlags(rest);
  if (flags === null) return { ok: false, message: "malformed flags: expected --key value pairs" };
  if (verb === "create") return parseCreateOptions(flags);
  if (verb === undefined || !KNOWN_CONVERGENCE_VERBS.has(verb)) {
    return { ok: false, message: `unknown verb: ${String(verb)} (expected create|status|report|override)` };
  }
  return parseConvergenceOptions(verb as "status" | "report" | "override", flags);
}

interface DeliveryHeads {
  readonly localHead: string;
  readonly remoteHead: string;
  readonly prHead: string;
}

interface DeliveryWork {
  readonly intent: string;
  readonly intentUuid: string;
  readonly record: string;
  readonly bolt: string;
  readonly unit: string;
  readonly units: readonly string[];
}

/** The merge a record is finalised against. Measured at the boundary and
 *  carried into the receipt, so the record answers for the merge rather than
 *  for a checkout that has moved on (#3149). */
interface MergeFacts {
  readonly commit: string;
  readonly at: string;
}

/**
 * A human's ruling that a merged delivery is this one, where no ancestry proves
 * it (#3149 class B). It names the two heads the measurement compared and the
 * verbatim reason it could not close them, so the record states what was ruled
 * on rather than that something was ruled.
 */
interface MergedEpochRuling {
  readonly attestedPrHead: string;
  readonly mergedHead: string;
  readonly measured: string;
}

/**
 * The delivery one report is written for: whose it is, the heads it binds, the
 * merge it is finalised against (when it is), and the evidence that ties the
 * created epoch to that merge — a measured ancestry proof, or a human ruling
 * where none can be measured.
 */
interface SelfDelivery {
  readonly work: DeliveryWork;
  readonly heads: DeliveryHeads;
  readonly epoch: LandedEpochProof | null;
  readonly ruling: MergedEpochRuling | null;
  readonly merge: MergeFacts | null;
}

type SelfContext =
  | (SelfDelivery & {
      readonly ok: true;
      // The receipt of an existing report whose bytes and identity check out but
      // whose audit line never landed — an interrupted earlier run. The caller
      // completes that emission instead of refusing the record forever.
      readonly pendingReceipt: ReportAttestation | null;
    })
  | { readonly ok: false; readonly outcome: CliOutcome };

function projectRootForRecord(record: string): string {
  return resolve(record, "../../../../..");
}

/** What the report file on disk currently says about itself. */
interface ExistingReport {
  readonly kind: string;
  readonly attestation: ReportAttestation | null;
  readonly payloadDigest: string;
}

/** The kind a report on disk declares about itself — the one reader of that
 *  line, so no second copy of it can drift. */
function declaredKind(body: string): string | undefined {
  return body.match(/^- kind:\s*(\S+)\s*$/m)?.[1];
}

function existingReportKind(path: string): ExistingReport | null {
  try {
    const body = readFileSync(path, "utf-8");
    const kind = declaredKind(body);
    return kind === undefined ? null : {
      kind,
      attestation: parseAttestation(body),
      payloadDigest: reportPayloadDigest(reportPayload(body)),
    };
  } catch {
    return null;
  }
}

function transitionAllowed(current: string, next: string): boolean {
  // `created -> landed` is the merge-queue finalisation (#3062): auto-merge
  // landed the pull request before `report` ran, so the epoch closes on the
  // merge fact instead of a convergence verdict. `created -> superseded`
  // (#3239) is the same shape for a delivery that never merged at all: a
  // human ruled it closed because the work landed through a different pull
  // request or commit. Nothing transitions OUT of a final state, and no final
  // state is rewritten as another.
  if (current === "created") {
    return next === "converged" || next === "override" || next === "landed" || next === "superseded";
  }
  return current === "override" && next === "converged";
}

/**
 * The self-record gate for one verb. `status` is read-only: it reports what the
 * pull request currently is, so it is exempt from the delivery prerequisites
 * (clean worktree, local == remote == PR head) and from the created-report
 * requirement — demanding those would make the verb unusable mid-work. The
 * self-scope flag rule and the provenance check still apply to it; `report` and
 * `override` stay fully fail-closed.
 */
function selfContextFor(
  options: ConvergenceOptions,
  evaluation: Evaluation,
  seams: CliSeams,
): SelfContext | null {
  if (!isSelfRecord(options.record)) return null;
  if (options.unlinked) {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: "--unlinked true is forbidden for self-* scopes\n" } };
  }
  if (options.verb === "status") return null;
  return currentSelfContext(options, evaluation, seams);
}

/**
 * Which gate this verb faces. A merged pull request has no live branch and no
 * live head, so both verbs that can finalise it are bound by the merge facts
 * instead: `report` by the measured epoch ancestry, `override` by a human
 * ruling where that ancestry cannot be measured (#3149). Everything still live
 * keeps the live-head gate.
 */
function currentSelfContext(
  options: ConvergenceOptions,
  evaluation: Evaluation,
  seams: CliSeams,
): SelfContext {
  const prHead = evaluation.provenanceSource.headRefOid;
  if (prHead === undefined) {
    return { ok: false, outcome: { exitCode: 2, stdout: "", stderr: "PR head SHA is unavailable\n" } };
  }
  if (evaluation.kind !== "landed") return activeSelfContext(options, prHead, evaluation, seams);
  return options.verb === "report"
    ? landedSelfContext(options, prHead, evaluation, seams)
    : mergedOverrideSelfContext(options, prHead, evaluation, seams);
}

interface SelfEvidence {
  readonly work: DeliveryWork;
  readonly body: string;
  readonly receipt: ReportAttestation | null;
}

type SelfEvidenceResult =
  | { readonly ok: true; readonly value: SelfEvidence }
  | { readonly ok: false; readonly outcome: CliOutcome };

/** The delivery identity and the report already on disk — the half of the
 *  self-record gate that neither arm derives from a head. */
function selfEvidence(options: ConvergenceOptions, evaluation: Evaluation): SelfEvidenceResult {
  const intent = resolveIntentReference(options.record);
  const provenance = parseAmadeusWork(evaluation.provenanceSource.body);
  if (!intent.ok || provenance === null || provenance.uuid !== intent.value.uuid) {
    return { ok: false, outcome: { exitCode: 3, stdout: "", stderr: "linked PR identity does not match the active Intent\n" } };
  }
  let body: string;
  try { body = readFileSync(reportPathFor(options.record, options.unit), "utf-8"); } catch {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: "created report is missing; run create first\n" } };
  }
  const work: DeliveryWork = {
    intent: intent.value.name, intentUuid: intent.value.uuid, record: intent.value.recordPath,
    bolt: provenance.bolt, unit: options.unit, units: options.units,
  };
  return { ok: true, value: { work, body, receipt: parseAttestation(body) } };
}

/** A receipt with no audit line is an interrupted run, not a forgery: the
 *  caller replays the emission rather than refusing the record forever. */
function pendingReceiptFor(record: string, receipt: ReportAttestation): ReportAttestation | null {
  return auditCarriesAttestation(record, receipt) ? null : receipt;
}

function activeSelfContext(
  options: ConvergenceOptions,
  prHead: string,
  evaluation: Evaluation,
  seams: CliSeams,
): SelfContext {
  const prHeadRef = evaluation.provenanceSource.headRefName;
  if (prHeadRef === undefined) {
    // Fail closed: without the branch name the checkout cannot be proved to be
    // the pull request's head rather than a second branch on the same commit.
    return { ok: false, outcome: { exitCode: 2, stdout: "", stderr: "PR head branch is unavailable\n" } };
  }
  const git = verifyCurrentPrerequisites(
    options.record,
    { oid: prHead, ref: prHeadRef },
    seams.gitSpawn ?? nodeGitSpawn,
    options.units,
  );
  if (!git.ok) {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: `delivery prerequisite failed: ${git.message}\n` } };
  }
  const evidence = selfEvidence(options, evaluation);
  if (!evidence.ok) return evidence;
  const { work, body, receipt } = evidence.value;
  const heads: DeliveryHeads = { localHead: git.localHead, remoteHead: git.remoteHead, prHead };
  if (
    receipt === null || !attestationIsIntact(receipt, body) ||
    !attestationBindsIdentity(receipt, work, heads, options.ref)
  ) {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: refusalFor(receipt, body, work, heads, options.ref) } };
  }
  return {
    ok: true,
    work,
    heads,
    epoch: null,
    ruling: null,
    merge: null,
    pendingReceipt: pendingReceiptFor(options.record, receipt),
  };
}

/**
 * The self-record gate for finalising a merge (#3110). The two live-head
 * prerequisites the active arm rests on are replaced rather than relaxed: the
 * branch may be deleted and the checkout has moved on, so identity is the half
 * no push can change (Intent, Bolt, Unit, pull request) and the epoch is bound
 * by measured ancestry — the created epoch's head must be an ancestor of the
 * head that merged. A `created` report from a different delivery, or from a
 * branch that never reached this merge, still fails closed.
 */
function landedSelfContext(
  options: ConvergenceOptions,
  prHead: string,
  evaluation: MergedEvaluation,
  seams: CliSeams,
): SelfContext {
  const git = seams.gitSpawn ?? nodeGitSpawn;
  const evidence = mergedSelfEvidence(options, evaluation, git);
  if (!evidence.ok) return evidence;
  const { work, receipt } = evidence.value;
  const ancestry = verifyMergedEpochAncestry(options.record, options.ref.number, receipt.prHead, prHead, git);
  if (!ancestry.ok) {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: `landed finalisation refused: ${ancestry.message}\n` } };
  }
  // A landed record binds one head — the head the pull request merged. No live
  // local or remote branch is left to tell apart from it.
  const heads: DeliveryHeads = { localHead: prHead, remoteHead: prHead, prHead };
  return {
    ok: true,
    work,
    heads,
    epoch: ancestry.proof,
    ruling: null,
    merge: mergeFactsOf(evaluation),
    pendingReceipt: pendingReceiptFor(options.record, receipt),
  };
}

/**
 * The self-record gate for ruling a merged delivery forward (#3149 class B).
 *
 * A `created` epoch that a rebase orphaned is an ancestor of nothing the pull
 * request merged, so no measurement can close it — and the checkout it was
 * written from is long gone, so the live-head gate cannot open it either. What
 * remains is a human, and what a human must be shown is the measurement they
 * are overruling: this arm runs the same ancestry check the landed arm rests
 * on and carries its verbatim failure into the ruling. An ancestry that DOES
 * hold is refused here — evidence that exists is not a thing to rule on.
 */
function mergedOverrideSelfContext(
  options: ConvergenceOptions,
  prHead: string,
  evaluation: MergedEvaluation,
  seams: CliSeams,
): SelfContext {
  const git = seams.gitSpawn ?? nodeGitSpawn;
  const evidence = mergedSelfEvidence(options, evaluation, git);
  if (!evidence.ok) return evidence;
  const { work, receipt } = evidence.value;
  const ancestry = verifyMergedEpochAncestry(options.record, options.ref.number, receipt.prHead, prHead, git);
  if (ancestry.ok) {
    return {
      ok: false,
      outcome: {
        exitCode: 1,
        stdout: "",
        stderr: "override refused: the created epoch reached the merged head — run the report verb to finalise it\n",
      },
    };
  }
  const heads: DeliveryHeads = { localHead: prHead, remoteHead: prHead, prHead };
  return {
    ok: true,
    work,
    heads,
    epoch: null,
    ruling: { attestedPrHead: receipt.prHead, mergedHead: prHead, measured: ancestry.message },
    merge: mergeFactsOf(evaluation),
    pendingReceipt: pendingReceiptFor(options.record, receipt),
  };
}

function mergeFactsOf(evaluation: MergedEvaluation): MergeFacts {
  return { commit: evaluation.facts.mergeCommitOid, at: evaluation.facts.mergedAt };
}

type MergedSelfEvidenceResult =
  | { readonly ok: true; readonly value: { readonly work: DeliveryWork; readonly receipt: ReportAttestation } }
  | { readonly ok: false; readonly outcome: CliOutcome };

/** What both merged arms verify before either measures anything: no foreign
 *  uncommitted work, and a report on disk whose receipt is intact and names
 *  THIS delivery — the half of identity no push can change. */
function mergedSelfEvidence(
  options: ConvergenceOptions,
  evaluation: MergedEvaluation,
  git: GitSpawn,
): MergedSelfEvidenceResult {
  const prerequisite = verifyLandedPrerequisites(options.record, git, options.units);
  if (!prerequisite.ok) {
    return { ok: false, outcome: { exitCode: 1, stdout: "", stderr: `delivery prerequisite failed: ${prerequisite.message}\n` } };
  }
  const evidence = selfEvidence(options, evaluation);
  if (!evidence.ok) return evidence;
  const { work, body, receipt } = evidence.value;
  if (
    receipt === null || !attestationIsIntact(receipt, body) ||
    !attestationBindsDelivery(receipt, work, options.ref)
  ) {
    return {
      ok: false,
      outcome: { exitCode: 1, stdout: "", stderr: "report attestation is missing, tampered, copied, or replayed\n" },
    };
  }
  return { ok: true, value: { work, receipt } };
}

/** The receipt is self-consistent and still describes the bytes on disk. */
function attestationIsIntact(receipt: ReportAttestation, body: string): boolean {
  const { id, ...unsigned } = receipt;
  return id === attestationId(unsigned) &&
    receipt.contentDigest === reportPayloadDigest(reportPayload(body));
}

/** The receipt names THIS delivery's Intent, Bolt, Unit and pull request — the
 *  half of identity that no push can change. */
function attestationBindsDelivery(
  receipt: ReportAttestation,
  work: DeliveryWork,
  ref: { readonly repo: string; readonly number: number },
): boolean {
  return attestationBindsDeliveryIdentity(receipt, work, ref) && receipt.pr === ref.number;
}

/** The delivery identity shared by sibling receipts, excluding their PR. */
function attestationBindsDeliveryIdentity(
  receipt: ReportAttestation,
  work: DeliveryWork,
  ref: { readonly repo: string; readonly number: number },
): boolean {
  return receipt.intent === work.intent && receipt.intentUuid === work.intentUuid &&
    receipt.record === work.record && receipt.bolt === work.bolt && receipt.unit === work.unit &&
    sameMemberUnits(receipt.memberUnits, work.units) && receipt.repo === ref.repo;
}

function sameMemberUnits(actual: readonly string[] | undefined, expected: readonly string[]): boolean {
  const normalized = actual ?? (expected.length === 1 ? expected : []);
  return normalized.length === expected.length && normalized.every((unit, index) => unit === expected[index]);
}

function deliveryMembershipFailure(record: string, bolt: string, units: readonly string[]): string | null {
  const approved = resolveDeliveryBoltMembership(record, bolt);
  if (!approved.ok) return `DELIVERY_BOLT_AUTHORITY_${approved.code}: ${approved.message}`;
  return sameMemberUnits(approved.value, units)
    ? null
    : `DELIVERY_BOLT_AUTHORITY_MISMATCH: --units does not match the approved member Units for Delivery Bolt ${bolt}`;
}

/** The receipt names THIS delivery — a receipt copied from another intent, unit,
 *  pull request, or head is intact but not ours. */
function attestationBindsIdentity(
  receipt: ReportAttestation,
  work: DeliveryWork,
  heads: DeliveryHeads,
  ref: { readonly repo: string; readonly number: number },
): boolean {
  return attestationBindsDelivery(receipt, work, ref) &&
    receipt.localHead === heads.localHead && receipt.remoteHead === heads.remoteHead &&
    receipt.prHead === heads.prHead;
}

/**
 * Why the receipt was refused, phrased so the operator can act on it (#2931).
 *
 * The refusal itself is unchanged — every case below exits 1 and writes
 * nothing. Only ONE case is separable without weakening that: a receipt that is
 * intact and names this exact delivery, and differs solely in the heads it was
 * bound to. That is a head that moved on, and its remedy is the in-band epoch
 * restart — `create` again for the same pull request, which is reused rather
 * than re-created. Every other shape keeps the undifferentiated message: a
 * tampered, copied, or replayed receipt earns no diagnosis it could steer.
 */
function refusalFor(
  receipt: ReportAttestation | null,
  body: string,
  work: DeliveryWork,
  heads: DeliveryHeads,
  ref: { readonly repo: string; readonly number: number },
): string {
  const staleHeads = receipt !== null && attestationIsIntact(receipt, body) &&
    attestationBindsDelivery(receipt, work, ref);
  if (!staleHeads) return "report attestation is missing, stale, tampered, copied, or replayed\n";
  return `report attestation is stale: the PR head advanced to ${heads.prHead} since this report was attested at ${receipt.prHead}. ` +
    "Push the current HEAD, then run the create verb again for this pull request to open a new created epoch; " +
    "the existing pull request is reused, never closed and reopened.\n";
}

/**
 * Replays the same-kind run whose report is already on disk and intact: whatever
 * of the audit emission and the sensor fire did not complete last time is
 * completed now. The report bytes are never rewritten, so the content digest
 * the attestation binds cannot drift.
 */
async function resumeSelfReport(
  record: string,
  path: string,
  attestation: ReportAttestation,
  seams: CliSeams,
  stage: "code-generation" | "pr-convergence",
): Promise<CliOutcome> {
  if (!auditCarriesAttestation(record, attestation)) {
    const emitted = await emitAttestationReceipt(record, attestation, seams);
    if (emitted !== null) return emitted;
  }
  const fired = await fireReportSensor(record, path, stage, seams);
  if (fired !== null) return fired;
  return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
}

type SelfReportLifecycle =
  | { readonly kind: "write" }
  | { readonly kind: "resume"; readonly attestation: ReportAttestation }
  | { readonly kind: "refuse"; readonly outcome: CliOutcome };

/** Whether the ancestry proof is about THIS epoch and THIS merge, rather than
 *  another Unit's. A proof is evidence only for the pair it measured. */
function measuredBy(
  epoch: LandedEpochProof | null,
  attestedPrHead: string,
  mergedHead: string,
): boolean {
  return epoch !== null && epoch.attestedPrHead === attestedPrHead && epoch.mergedHead === mergedHead;
}

/** The same question for a human ruling: it speaks for the two heads a human
 *  was shown, and for no others. */
function ruledFor(
  ruling: MergedEpochRuling | null,
  attestedPrHead: string,
  mergedHead: string,
): boolean {
  return ruling !== null && ruling.attestedPrHead === attestedPrHead && ruling.mergedHead === mergedHead;
}

function refuseLifecycle(message: string): SelfReportLifecycle {
  return { kind: "refuse", outcome: { exitCode: 1, stdout: "", stderr: `${message}\n` } };
}

/**
 * What a report may do when the head it was attested at is no longer the head
 * the pull request carries.
 *
 * An epoch attested at an earlier head is not stale when the pull request
 * merged that head: the merge closed the epoch, and the evidence that says so
 * — a measured ancestry (#3110) or, where none can be measured, a human ruling
 * (#3149) — was established against the merged head before this call. Either
 * speaks for the two heads it names and no others, so a member Unit left
 * attested at some third head was never covered and is stale. A ruling buys no
 * kind transition the lifecycle would otherwise refuse.
 */
function lifecycleAtChangedHead(
  previousKind: string,
  attestedPrHead: string,
  report: ConvergenceReport,
  delivery: SelfDelivery,
): SelfReportLifecycle {
  const mergedHead = delivery.heads.prHead;
  if (report.kind === "landed" && measuredBy(delivery.epoch, attestedPrHead, mergedHead)) {
    return { kind: "write" };
  }
  if (report.kind === "override" && ruledFor(delivery.ruling, attestedPrHead, mergedHead)) {
    return transitionAllowed(previousKind, report.kind)
      ? { kind: "write" }
      : refuseLifecycle(`report lifecycle refused: ${previousKind} -> ${report.kind}`);
  }
  // A superseded record answers for no live PR head at all — the ancestry it
  // rests on (verifySupersedeAncestry) was already measured before the
  // caller got here, and it names the checkout, never the pull request's
  // head. A stale `created` epoch this record supersedes is exactly the case
  // it exists to close, but a stale head is not itself permission: only
  // `created -> superseded` is a real transition, so an already-terminal
  // record (converged, landed, or a prior superseded) left at some earlier
  // head is refused exactly as transitionAllowed already says, not
  // silently rewritten because its head happens to have moved.
  if (report.kind === "superseded") {
    return transitionAllowed(previousKind, report.kind)
      ? { kind: "write" }
      : refuseLifecycle(`report lifecycle refused: ${previousKind} -> ${report.kind}`);
  }
  return report.kind === "created"
    ? { kind: "write" }
    : refuseLifecycle("report lifecycle stale: PR head changed; run create to begin a new created epoch");
}

/** What the state already on disk allows this run to do. */
function selfReportLifecycle(
  path: string,
  report: ConvergenceReport,
  delivery: SelfDelivery,
  ref: { readonly repo: string; readonly number: number },
): SelfReportLifecycle {
  const { heads, work } = delivery;
  const previous = existingReportKind(path);
  if (previous === null) {
    // Supersede (#3239) is the one arm that never needs a created epoch
    // first: the whole point is that this delivery's own pull request never
    // reached one, or the created report that once existed was lost when the
    // record was reconstructed after the supersede.
    return report.kind === "created" || report.kind === "superseded"
      ? { kind: "write" }
      : refuseLifecycle("report lifecycle refused: create must establish the created state first");
  }
  if (previous.attestation === null) {
    return refuseLifecycle("report lifecycle refused: current report has no valid CLI attestation");
  }
  if (previous.attestation.prHead !== heads.prHead) {
    return lifecycleAtChangedHead(previous.kind, previous.attestation.prHead, report, delivery);
  }
  if (previous.kind !== report.kind) {
    return transitionAllowed(previous.kind, report.kind)
      ? { kind: "write" }
      : refuseLifecycle(`report lifecycle refused: ${previous.kind} -> ${report.kind}`);
  }
  const { id, ...unsigned } = previous.attestation;
  if (
    id !== attestationId(unsigned) || previous.attestation.contentDigest !== previous.payloadDigest ||
    !attestationBindsIdentity(previous.attestation, work, heads, ref)
  ) {
    return refuseLifecycle("report lifecycle refused: current attestation is stale, tampered, copied, or replayed");
  }
  return { kind: "resume", attestation: previous.attestation };
}

/** A report already in a state the lifecycle calls final. `created` is not one
 *  (the merged arm records it as `landed`), and `landed` is already the merge's
 *  own record, so a re-run of it resumes rather than finalises. */
interface FinalRecord {
  readonly kind: string;
  readonly body: string;
  readonly receipt: ReportAttestation;
}

function finalRecordOnDisk(path: string): FinalRecord | null {
  let body: string;
  try {
    body = readFileSync(path, "utf-8");
  } catch {
    return null;
  }
  const kind = declaredKind(body);
  const receipt = parseAttestation(body);
  if (receipt === null || (kind !== "converged" && kind !== "override")) return null;
  return { kind, body, receipt };
}

type SiblingPrVerification =
  | { readonly kind: "merged" }
  | { readonly kind: "not-merged"; readonly reason: string };

/** A sibling receipt is skippable only when its own PR state is read as MERGED. */
async function verifySiblingPrMerged(
  repo: string,
  number: number,
  seams: CliSeams,
): Promise<SiblingPrVerification> {
  const ref = parsePrRef(repo, number);
  if (ref === null) return { kind: "not-merged", reason: "the sibling PR reference is invalid" };
  const runner = await createGhRunner(seams.ghSpawn);
  if (!runner.ok) return { kind: "not-merged", reason: `GitHub state could not be read (${describeGhError(runner.error)})` };
  const state = await fetchRawPrState(runner.value, ref);
  if (!state.ok) return { kind: "not-merged", reason: `GitHub state could not be read (${describeGhError(state.error)})` };
  return state.value.state === "MERGED"
    ? { kind: "merged" }
    : { kind: "not-merged", reason: `the PR state is ${state.value.state ?? "unavailable"}` };
}

/**
 * Finalising a record whose verdict is already final (#3149 class A).
 *
 * `converged` never transitions — that is what makes it the strongest verdict
 * the loop can reach — so a merge that lands afterwards cannot be recorded by
 * re-minting the report as another kind. It is recorded where the binding
 * actually lives: the receipt is re-attested against the merge this run
 * measured, over payload bytes that do not change, and the canonical audit
 * receipt for the new attestation is appended. The verdict, and the head it was
 * measured at, stay exactly as they were.
 *
 * Returns null when there is no final record to finalise, leaving the caller's
 * ordinary landed path to write the merge's own record.
 */
async function finaliseMergedInPlace(
  options: ConvergenceOptions,
  delivery: SelfDelivery,
  merge: MergeFacts,
  seams: CliSeams,
): Promise<CliOutcome | null> {
  if (finalRecordOnDisk(reportPathFor(options.record, delivery.work.unit)) === null) return null;
  const paths: string[] = [];
  for (const unit of delivery.work.units) {
    const outcome = await finaliseUnitInPlace(options, unit, delivery, merge, seams);
    if (outcome.exitCode !== 0) return outcome;
    paths.push(outcome.stdout.trim());
  }
  if (paths.length === 0) return { exitCode: 1, stdout: "", stderr: "merged finalisation refused: no member receipt binds to a pull request\n" };
  return { exitCode: 0, stdout: `${paths.join("\n")}\n`, stderr: "" };
}

async function finaliseUnitInPlace(
  options: ConvergenceOptions,
  unit: string,
  delivery: SelfDelivery,
  merge: MergeFacts,
  seams: CliSeams,
): Promise<CliOutcome> {
  const path = reportPathFor(options.record, unit);
  const refuse = (message: string): CliOutcome => ({ exitCode: 1, stdout: "", stderr: `${message}\n` });
  const current = finalRecordOnDisk(path);
  if (current === null) {
    return refuse(`merged finalisation refused: ${unit} carries no final record for this merge to close`);
  }
  const { body, receipt } = current;
  if (!attestationIsIntact(receipt, body)) {
    return refuse("report attestation is missing, tampered, copied, or replayed");
  }
  const work = { ...delivery.work, unit };
  if (!attestationBindsDelivery(receipt, work, options.ref)) {
    if (!attestationBindsDeliveryIdentity(receipt, work, options.ref)) {
      return refuse("report attestation is missing, tampered, copied, or replayed");
    }
    const sibling = await verifySiblingPrMerged(options.ref.repo, receipt.pr, seams);
    if (sibling.kind !== "merged") {
      return refuse(
        `sibling unit ${unit} receipt is bound to PR #${receipt.pr}, but PR is not verifiably MERGED (${sibling.reason})`,
      );
    }
    return {
      exitCode: 0,
      stdout: `skipped sibling unit ${unit}: receipt is bound to PR #${receipt.pr}, which is MERGED`,
      stderr: "",
    };
  }
  // The proof speaks for the one attested head it measured: a member Unit left
  // at some other head was never put to git, exactly as on the landed path.
  if (!measuredBy(delivery.epoch, receipt.prHead, delivery.heads.prHead)) {
    return refuse("report lifecycle stale: PR head changed; run create to begin a new created epoch");
  }
  if (receipt.mergeCommit === merge.commit && receipt.mergedAt === merge.at) {
    return resumeSelfReport(options.record, path, receipt, seams, "pr-convergence");
  }
  if (receipt.mergeCommit !== undefined || receipt.mergedAt !== undefined) {
    return refuse("merged finalisation refused: the record is already bound to a different merge");
  }
  const { id: _superseded, ...unsigned } = receipt;
  const withoutId = { ...unsigned, mergeCommit: merge.commit, mergedAt: merge.at };
  const attestation: ReportAttestation = { id: attestationId(withoutId), ...withoutId };
  writeFileSync(path, `${reportPayload(body)}${renderAttestation(attestation)}`, "utf-8");
  const emitted = await emitAttestationReceipt(options.record, attestation, seams);
  if (emitted !== null) return emitted;
  const fired = await fireReportSensor(options.record, path, "pr-convergence", seams);
  if (fired !== null) return fired;
  return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
}

async function writeSelfReport(
  record: string,
  report: ConvergenceReport,
  delivery: SelfDelivery,
  seams: CliSeams,
  stage: "code-generation" | "pr-convergence",
): Promise<CliOutcome> {
  const paths: string[] = [];
  for (const ownerUnit of delivery.work.units) {
    const owner = { ...delivery, work: { ...delivery.work, unit: ownerUnit } };
    const outcome = await writeSelfReportProjection(record, report, owner, seams, stage);
    if (outcome.exitCode !== 0) return outcome;
    paths.push(outcome.stdout.trim());
  }
  return { exitCode: 0, stdout: `${paths.join("\n")}\n`, stderr: "" };
}

async function writeSelfReportProjection(
  record: string,
  report: ConvergenceReport,
  delivery: SelfDelivery,
  seams: CliSeams,
  stage: "code-generation" | "pr-convergence",
): Promise<CliOutcome> {
  const { work, heads } = delivery;
  const path = reportPathFor(record, work.unit);
  const lifecycle = selfReportLifecycle(path, report, delivery, report.prRef);
  if (lifecycle.kind === "refuse") return lifecycle.outcome;
  if (lifecycle.kind === "resume") {
    return resumeSelfReport(record, path, lifecycle.attestation, seams, stage);
  }

  const basePayload = renderReport(report);
  const payload = work.units.length === 1
    ? basePayload
    : `${basePayload}${renderOwnerProjection({
        intent: work.intent,
        intentUuid: work.intentUuid,
        record: work.record,
        bolt: work.bolt,
        memberUnits: work.units,
        ownerUnit: work.unit,
        reportPath: reportPathFor(work.record, work.unit),
        repo: report.prRef.repo,
        pr: report.prRef.number,
        head: heads.localHead,
      })}`;
  const withoutId = {
    intent: work.intent, intentUuid: work.intentUuid, record: work.record,
    bolt: work.bolt, unit: work.unit,
    ...(work.units.length === 1 ? {} : { memberUnits: work.units }),
    repo: report.prRef.repo, pr: report.prRef.number,
    localHead: heads.localHead, remoteHead: heads.remoteHead, prHead: heads.prHead,
    // A record finalised against a merge is bound to that merge rather than to
    // a checkout, so the merge facts travel inside the receipt — and through it
    // into the audit. Which records those are is the merged arm's measurement,
    // never the report's kind (#3149).
    ...(delivery.merge === null
      ? {}
      : { mergeCommit: delivery.merge.commit, mergedAt: delivery.merge.at }),
    contentDigest: reportPayloadDigest(payload),
  };
  const attestation: ReportAttestation = { id: attestationId(withoutId), ...withoutId };
  const body = `${payload}${renderAttestation(attestation)}`;
  mkdirSync(join(record, "construction", work.unit, "code-generation"), { recursive: true });
  writeFileSync(path, body, "utf-8");

  const emitted = await emitAttestationReceipt(record, attestation, seams);
  if (emitted !== null) return emitted;
  const fired = await fireReportSensor(record, path, stage, seams);
  if (fired !== null) return fired;
  return { exitCode: 0, stdout: `${path}\n`, stderr: "" };
}

/** Emits the canonical audit receipt. Returns null on success, or the failure
 *  outcome — the caller re-runs the same verb to complete it. */
async function emitAttestationReceipt(
  record: string,
  attestation: ReportAttestation,
  seams: CliSeams,
): Promise<CliOutcome | null> {
  const fields: ReadonlyArray<readonly [string, string]> = [
    ["Attestation Id", attestation.id], ["Intent", attestation.intent], ["Intent UUID", attestation.intentUuid],
    ["Record", attestation.record], ["Bolt", attestation.bolt], ["Unit", attestation.unit],
    ...(attestation.memberUnits === undefined ? [] : [["Member Units", attestation.memberUnits.join(",")] as const]),
    ["Repository", attestation.repo], ["PR", String(attestation.pr)], ["Local Head", attestation.localHead],
    ["Remote Head", attestation.remoteHead], ["PR Head", attestation.prHead],
    ...(attestation.mergeCommit === undefined ? [] : [["Merge Commit", attestation.mergeCommit] as const]),
    ...(attestation.mergedAt === undefined ? [] : [["Merged At", attestation.mergedAt] as const]),
    ["Content Digest", attestation.contentDigest],
  ];
  const emit = seams.emitAttestation ?? seams.emitDecision;
  const emitted = await emit([
    "bun", siblingCoreTool(DEFAULT_AUDIT_TOOL_RELATIVE), "append", ATTESTATION_EVENT,
    "--project-dir", projectRootForRecord(record),
    ...fields.flatMap(([key, value]) => ["--field", `${key}=${value}`]),
  ]);
  return emitted.code === 0
    ? null
    : { exitCode: 2, stdout: "", stderr: `attestation emission failed (exit ${emitted.code}) ${emitted.stderr}; re-run the same verb to complete it\n` };
}

/** Fires the report-format sensor. Returns null on success, or the failure
 *  outcome — the fire is replayed by re-running the same verb. */
async function fireReportSensor(
  record: string,
  path: string,
  stage: "code-generation" | "pr-convergence",
  seams: CliSeams,
): Promise<CliOutcome | null> {
  const fire = seams.fireSensor ?? seams.emitDecision;
  const fired = await fire([
    "bun", siblingCoreTool(DEFAULT_SENSOR_TOOL_RELATIVE), "fire", "pr-convergence-report-format",
    "--stage", stage, "--output-path", path, "--project-dir", projectRootForRecord(record),
  ]);
  return fired.code === 0
    ? null
    : { exitCode: 2, stdout: "", stderr: `sensor fire failed (exit ${fired.code}) ${fired.stderr}; re-run the same verb to complete it\n` };
}

function describeGhError(error: GhError): string {
  return error.kind === "command-failed"
    ? `${error.kind} (exit ${error.exitCode}, stderr ${error.stderrDigest})`
    : error.kind;
}

/**
 * `gh pr create` failed. For a linked self delivery that failure is routinely
 * "the pull request already exists" — the earlier run created it and then lost
 * the report (or the head moved on and this run opens a new created epoch).
 * Rather than leaving the delivery with a pull request and no evidence, the
 * open pull request for this head is read back and, when it IS this delivery,
 * the created report is written for it. Nothing is re-created and nothing is
 * edited: the pull request already carries its `## Amadeus Work` section, and
 * a section that does not match is a human's `gh pr edit` to make.
 */
async function recoverCreateFailure(
  options: CreateOptions,
  seams: CliSeams,
  gh: GhRunner,
  error: GhError,
  linkedWork: DeliveryWork | null,
  prerequisite: ReturnType<typeof verifyCreatePrerequisites> | null,
): Promise<CliOutcome> {
  const detail = `gh failed creating pull request: ${describeGhError(error)}`;
  if (options.record === null || linkedWork === null || prerequisite === null || !prerequisite.ok) {
    return { exitCode: 2, stdout: "", stderr: `${detail}\n` };
  }
  const existing = await fetchOpenPrForHead(gh, options.repo, options.head);
  if (!existing.ok) {
    return { exitCode: 2, stdout: "", stderr: `${detail}; the open pull request for ${options.head} could not be read: ${describeGhError(existing.error)}\n` };
  }
  if (existing.value === null) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${detail}; no open pull request for head ${options.head} exists to recover — fix the reported failure and run create again\n`,
    };
  }
  const pr = existing.value;
  const ref = parsePrRef(options.repo, pr.number);
  if (ref === null) {
    return { exitCode: 2, stdout: "", stderr: `${detail}; the existing pull request number ${pr.number} is unusable\n` };
  }
  if (pr.headRefOid !== prerequisite.localHead || pr.headRefName !== options.head) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `existing pull request #${pr.number} head ${pr.headRefName}@${pr.headRefOid} is not the local/remote HEAD ${options.head}@${prerequisite.localHead}; push the current HEAD, then run create again\n`,
    };
  }
  const mismatch = existingWorkMismatch(pr, linkedWork);
  if (mismatch !== null) {
    return { exitCode: 1, stdout: "", stderr: `existing pull request #${pr.number} does not carry this delivery's identity\n${mismatch}\n` };
  }
  const delivered = await writeSelfReport(
    options.record,
    { kind: "created", generatedAt: seams.now(), prRef: refValue(ref) },
    {
      work: linkedWork,
      heads: { localHead: prerequisite.localHead, remoteHead: prerequisite.remoteHead, prHead: pr.headRefOid },
      epoch: null,
      ruling: null,
      merge: null,
    },
    seams,
    "code-generation",
  );
  if (delivered.exitCode !== 0) return delivered;
  return { exitCode: 0, stdout: `${pr.url}\n`, stderr: "" };
}

/** The remediation text when the existing pull request is not this delivery's,
 *  or null when its title and body do name this Intent, Bolt, and Unit. */
function existingWorkMismatch(pr: OpenPrSummary, work: DeliveryWork): string | null {
  const provenance = checkProvenance({
    title: pr.title,
    body: pr.body,
    record: work.record,
    unit: work.unit,
    units: work.units,
  });
  if (!provenance.ok) return renderProvenanceRemediation(provenance.violations);
  const fields = parseAmadeusWork(pr.body);
  if (fields === null || fields.uuid !== work.intentUuid || fields.bolt !== work.bolt) {
    return renderProvenanceRemediation([{ kind: "work-section-missing" }]);
  }
  return null;
}

/**
 * The refusal when this head's pull request has already merged (#3109), or null
 * when it has not.
 *
 * Asked only of a delivery that already recorded a `created` epoch for this
 * Unit — the shape #3109 measured, and the only shape in which `create` is
 * re-opening an epoch rather than opening one. A merged delivery has no epoch
 * left to re-open, so pushing its head again and running `create` opened a
 * SECOND pull request for work that was already on the trunk. The remedy is to
 * record the merge, so the refusal names it. An unreadable answer is a loud
 * failure, never a licence to create.
 */
async function refuseMergedHead(gh: GhRunner, repo: string, head: string): Promise<CliOutcome | null> {
  const merged = await fetchMergedPrForHead(gh, repo, head);
  if (!merged.ok) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `the merged pull requests for ${head} could not be read: ${describeGhError(merged.error)}\n`,
    };
  }
  if (merged.value === null) return null;
  return {
    exitCode: 1,
    stdout: "",
    stderr: `create refused: pull request #${merged.value.number} for head ${head} has already merged (${merged.value.url}). A merged delivery is finalised by the report verb, which records it as landed; opening a second pull request for work already on the trunk is not a delivery path.\n`,
  };
}

async function createPullRequest(options: CreateOptions, seams: CliSeams): Promise<CliOutcome> {
  let title = options.title;
  let body: string;
  let linkedWork: DeliveryWork | null = null;
  let prerequisite: ReturnType<typeof verifyCreatePrerequisites> | null = null;
  // Whether this Unit already carries a `created` epoch — the delivery whose
  // pull request may since have merged.
  let priorEpoch = false;
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
    const membershipFailure = deliveryMembershipFailure(options.record, options.bolt, options.units);
    if (membershipFailure !== null) return { exitCode: 2, stdout: "", stderr: `${membershipFailure}\n` };
    const work = {
      intent: intent.value,
      bolt: options.bolt,
      units: options.units,
    };
    title = renderPullRequestTitle(title, work);
    body = renderPullRequestBody(body, work);
    linkedWork = {
      intent: intent.value.name,
      intentUuid: intent.value.uuid,
      record: intent.value.recordPath,
      bolt: options.bolt,
      unit: options.unit,
      units: options.units,
    };
    if (isSelfRecord(options.record)) {
      prerequisite = verifyCreatePrerequisites(
        options.record,
        options.head,
        options.base,
        seams.gitSpawn ?? nodeGitSpawn,
        options.units,
      );
      if (!prerequisite.ok) {
        return { exitCode: 1, stdout: "", stderr: `create prerequisite failed: ${prerequisite.message}\n` };
      }
      priorEpoch = existingReportKind(reportPathFor(options.record, options.unit)) !== null;
    }
  }
  const runner = await createGhRunner(seams.ghSpawn);
  if (!runner.ok) {
    return { exitCode: 2, stdout: "", stderr: `gh unavailable: ${runner.error.kind}\n` };
  }
  if (priorEpoch) {
    const landed = await refuseMergedHead(runner.value, options.repo, options.head);
    if (landed !== null) return landed;
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
    return recoverCreateFailure(options, seams, runner.value, created.error, linkedWork, prerequisite);
  }
  if (options.record !== null && linkedWork !== null && prerequisite?.ok) {
    const match = created.value.match(/\/pull\/(\d+)/);
    const ref = match === null ? null : parsePrRef(options.repo, match[1]);
    if (ref === null) return { exitCode: 2, stdout: "", stderr: "created PR response did not contain a PR number\n" };
    const state = await fetchRawPrState(runner.value, ref);
    if (!state.ok || state.value.headRefOid === undefined) {
      return { exitCode: 2, stdout: "", stderr: "created PR head could not be verified\n" };
    }
    if (state.value.headRefOid !== prerequisite.localHead) {
      return { exitCode: 1, stdout: "", stderr: "created PR head differs from local/remote HEAD\n" };
    }
    const delivered = await writeSelfReport(
      options.record,
      { kind: "created", generatedAt: seams.now(), prRef: refValue(ref) },
      {
        work: linkedWork,
        heads: { localHead: prerequisite.localHead, remoteHead: prerequisite.remoteHead, prHead: state.value.headRefOid },
        epoch: null,
        ruling: null,
        merge: null,
      },
      seams,
      "code-generation",
    );
    if (delivered.exitCode !== 0) return delivered;
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

/** An evaluation that read a merged pull request: the arm that carries the
 *  merge facts every finalisation is bound to. */
type MergedEvaluation = Extract<Evaluation, { readonly kind: "landed" }>;

interface ProvenanceSource {
  readonly title: string;
  readonly body: string;
  readonly headRefOid?: string;
  readonly headRefName?: string;
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
async function reportOutcome(
  options: ConvergenceOptions,
  seams: CliSeams,
  evaluation: Evaluation,
  self: Extract<SelfContext, { ok: true }> | null,
): Promise<CliOutcome> {
  if (evaluation.kind === "landed") {
    const facts = evaluation.facts;
    if (self !== null) {
      // A verdict that is already final is closed where its binding lives, not
      // by being rewritten as another kind (#3149).
      const inPlace = await finaliseMergedInPlace(options, self, mergeFactsOf(evaluation), seams);
      if (inPlace !== null) return inPlace;
    }
    const landed: ConvergenceReport = {
      kind: "landed",
      prRef: refValue(options.ref),
      mergedAt: facts.mergedAt,
      mergeCommitOid: facts.mergeCommitOid,
      checkRollupState: facts.checkRollupState,
      generatedAt: seams.now(),
    };
    if (self !== null) return writeSelfReport(options.record, landed, self, seams, "pr-convergence");
    const path = writeReport(options, landed);
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
  const report: ConvergenceReport = {
    kind: "converged",
    generatedAt: seams.now(),
    prRef: refValue(options.ref),
    verdict: evaluation.core,
    ledgerSummary: summary,
  };
  if (self !== null) return writeSelfReport(options.record, report, self, seams, "pr-convergence");
  const path = writeReport(options, report);
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
  if (options.unlinked || (options.verb === "override" && !isSelfRecord(options.record))) return null;
  const intent = resolveIntentReference(options.record);
  const provenance = checkProvenance({
    ...evaluation.provenanceSource,
    record: intent.ok ? intent.value.recordPath : options.record,
    unit: options.unit,
    units: options.units,
  });
  if (provenance.ok) {
    const fields = parseAmadeusWork(evaluation.provenanceSource.body);
    if (fields === null) return { exitCode: 3, stdout: "", stderr: "linked PR provenance cannot be parsed\n" };
    const membershipFailure = deliveryMembershipFailure(options.record, fields.bolt, options.units);
    return membershipFailure === null
      ? null
      : { exitCode: 3, stdout: "", stderr: `${membershipFailure}\n` };
  }
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

/**
 * What the override record states. A ruling on a merged delivery carries the
 * ancestry measurement it overruled verbatim — both SHAs and the reason they
 * could not be closed — so the record can be re-derived rather than trusted.
 */
function overrideReason(reason: string, ruling: MergedEpochRuling | null): string {
  if (ruling === null) return reason;
  const measured = `merged-epoch ancestry unproven: ${ruling.measured}`;
  return reason === "" ? measured : `${reason} — ${measured}`;
}

/**
 * The supersede arm of `override` (#3239): a unit whose own pull request was
 * closed without merging because the work it carried reached the trunk
 * through a different pull request or commit. Neither of the two prerequisites
 * every other arm rests on hold here: there is no live PR head to check the
 * checkout out at (the delivery may already be gone, or was never this
 * checkout's branch), and the delivery need never have reached a `created`
 * epoch in the first place (a supersede can happen before `create` ever ran,
 * or after the record that once existed was lost).
 *
 * What replaces them is measured locally rather than asked of GitHub: the
 * commit that superseded this delivery must be an ancestor of the checkout
 * writing this record (`verifySupersedeAncestry`), and a human — never the
 * loop, which has nothing left to converge — must be the one recording it
 * (the same HUMAN_TURN requirement `override` already carries). No GitHub
 * call is made at all: the own pull request may be CLOSED, and the ordinary
 * evaluation pipeline (`evaluate`) exists to judge an OPEN one.
 */
async function runSupersede(
  options: ConvergenceOptions,
  supersede: SupersedeFlags,
  seams: CliSeams,
): Promise<CliOutcome> {
  if (!isSelfRecord(options.record)) {
    return { exitCode: 1, stdout: "", stderr: "supersede refused: --superseded-by is only meaningful for self-* records\n" };
  }
  const { supersededBy, bolt } = supersede;
  const membershipFailure = deliveryMembershipFailure(options.record, bolt, options.units);
  if (membershipFailure !== null) {
    return { exitCode: 1, stdout: "", stderr: `supersede refused: ${membershipFailure}\n` };
  }
  const git = seams.gitSpawn ?? nodeGitSpawn;
  const prerequisite = verifyLandedPrerequisites(options.record, git, options.units);
  if (!prerequisite.ok) {
    return { exitCode: 1, stdout: "", stderr: `supersede refused: ${prerequisite.message}\n` };
  }
  const ancestry = verifySupersedeAncestry(options.record, supersededBy, git);
  if (!ancestry.ok) {
    return { exitCode: 1, stdout: "", stderr: `supersede refused: ${ancestry.message}\n` };
  }
  const humanTurn = latestHumanTurn(options.record);
  if (humanTurn === null) {
    return { exitCode: 1, stdout: "", stderr: "supersede refused: no HUMAN_TURN found in the record's audit shards\n" };
  }
  const intent = resolveIntentReference(options.record);
  if (!intent.ok) return { exitCode: 3, stdout: "", stderr: `${intent.message}\n` };

  const recordedAt = seams.now();
  const reason = options.reason ?? "";
  const decision =
    `pr-convergence supersede: ${options.ref.repo}#${options.ref.number} unit=${options.unit} ` +
    `supersededBy=${supersededBy} humanTurn=${humanTurn.eventId} reason=${reason}`;
  const emitted = await seams.emitDecision([
    "bun",
    options.logTool,
    "decision",
    "--stage",
    "code-generation",
    "--decision",
    decision,
    "--rationale",
    reason,
  ]);
  if (emitted.code !== 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `supersede refused: audit emission failed (exit ${emitted.code}) ${emitted.stderr}\n`,
    };
  }

  const report: ConvergenceReport = {
    kind: "superseded",
    generatedAt: recordedAt,
    prRef: refValue(options.ref),
    supersededBy: ancestry.proof.supersededBy,
    override: { humanTurnId: humanTurn.eventId, reason, recordedAt },
  };
  const work: DeliveryWork = {
    intent: intent.value.name,
    intentUuid: intent.value.uuid,
    record: intent.value.recordPath,
    bolt,
    unit: options.unit,
    units: options.units,
  };
  // No live branch answers for a superseded delivery, so — exactly as the
  // landed and merged-override arms already do when a live head cannot be
  // named — every head in the triple binds to the one thing that IS live:
  // the checkout minting this record.
  const heads: DeliveryHeads = {
    localHead: ancestry.proof.localHead,
    remoteHead: ancestry.proof.localHead,
    prHead: ancestry.proof.localHead,
  };
  const delivery: SelfDelivery = { work, heads, epoch: null, ruling: null, merge: null };
  return writeSelfReport(options.record, report, delivery, seams, "pr-convergence");
}

async function runConvergence(options: ConvergenceOptions, seams: CliSeams): Promise<CliOutcome> {
  if (options.verb === "override" && options.supersede !== null) {
    return runSupersede(options, options.supersede, seams);
  }
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
  const selfContext = selfContextFor(options, evaluation.value, seams);
  if (selfContext !== null && !selfContext.ok) return selfContext.outcome;
  if (selfContext !== null && selfContext.pendingReceipt !== null) {
    // Complete the earlier run's interrupted emission before this verb adds a
    // new epoch on top of it.
    const resumed = await emitAttestationReceipt(options.record, selfContext.pendingReceipt, seams);
    if (resumed !== null) return resumed;
  }

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

  if (options.verb === "report") return reportOutcome(options, seams, evaluation.value, selfContext);

  // override
  const ruling = selfContext === null ? null : selfContext.ruling;
  const humanTurn = latestHumanTurn(options.record);
  if (humanTurn === null) {
    // Name the measurement the ruling would have stood on: a human who never
    // sees what they are overruling is a rubber stamp (#3149).
    const measured = ruling === null ? "" : `; the ruling would stand on this measurement: ${ruling.measured}`;
    return {
      exitCode: 1,
      stdout: "",
      stderr: `override refused: no HUMAN_TURN found in the record's audit shards${measured}\n`,
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
  const reason = overrideReason(options.reason ?? "", ruling);
  const decision =
    `pr-convergence override: ${options.ref.repo}#${options.ref.number} unit=${options.unit} ` +
    `converged=false humanTurn=${humanTurn.eventId} reason=${reason}`;
  const emitted = await seams.emitDecision([
    "bun",
    options.logTool,
    "decision",
    "--stage",
    "code-generation",
    "--decision",
    decision,
    "--rationale",
    reason,
  ]);
  if (emitted.code !== 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `override refused: audit emission failed (exit ${emitted.code}) ${emitted.stderr}\n`,
    };
  }

  const report: ConvergenceReport = {
    kind: "override",
    generatedAt: recordedAt,
    prRef: refValue(options.ref),
    verdict,
    ledgerSummary: summary,
    override: { humanTurnId: humanTurn.eventId, reason, recordedAt },
  };
  if (selfContext !== null) {
    return writeSelfReport(options.record, report, selfContext, seams, "pr-convergence");
  }
  const path = writeReport(options, report);
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
