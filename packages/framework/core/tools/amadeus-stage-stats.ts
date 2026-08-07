// Stage performance statistics — the read-only aggregation CLI (#2405).
//
//   Usage: bun amadeus-stage-stats.ts [--project-dir <path>] [--space <name>]
//                                     [--format markdown|csv|json] [--json]
//
// One command derives the per-stage duration baseline from the audit shards
// (amadeus/spaces/<space>/intents/* /audit/*.jsonl) plus the §12a review
// iteration distribution from the record artefacts. Stage windows are
// STAGE_STARTED -> STAGE_COMPLETED pairs; the reported net duration subtracts
// the idle spans (approval waits, parks, session gaps) that make raw
// wall-clock unusable as a performance signal.
//
// net is an ESTIMATE. The header says so on every run: subtracting idle is a
// hypothesis about working time, not a measurement of it.
//
// Reading contract mirrored from the sibling amadeus-subagent-stats.ts:
// measurement ref first, absence recorded as absence (a row without Model is
// the UNKNOWN bucket, never dropped), and a shard that exists but cannot be
// read is fail-loud at the exit code. Nothing here writes.
//
// The two-generation journal normalization is NOT reimplemented here: schema
// v1 (event/fields) and v2 (eventName/attributes) both arrive through
// amadeus-journal.ts's exported reader and field accessor. This module
// deliberately does not import amadeus-lib.ts (the same dependency-direction
// ruling the sibling tool records), and it does not reference the test tree —
// the nearest-rank p95 is mirrored locally because the shipped surface must
// not reach into tests.

import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type JournalRecord, journalRecordField, readJournalRecords } from "./amadeus-journal.ts";

// --- domain types ----------------------------------------------------------

/** One journal record together with the intent its shard path places it in. */
export interface AttributedRecord {
  readonly intent: string;
  readonly record: JournalRecord;
}

/** The scan phase's output: what was read, and what could not be. */
export interface ScannedCorpus {
  readonly records: readonly AttributedRecord[];
  readonly unreadableShardCount: number;
  readonly brokenLineCount: number;
  readonly shardCount: number;
  readonly lineCount: number;
}

/** A STAGE_STARTED -> STAGE_COMPLETED pair. Timestamps are second-grained. */
export interface StageWindow {
  readonly intent: string;
  readonly stage: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly rawSeconds: number;
}

/** A window with its idle span subtracted. Invariant: netSeconds >= 0. */
export interface MeasuredWindow extends StageWindow {
  readonly idleSeconds: number;
  readonly netSeconds: number;
}

// The closed set of exclusion buckets, layered by the three DISJOINT
// populations they count in. A flat record would invite the reader to add the
// seven numbers together, which is meaningless: corpus counts lines and shards
// that never became a window, review counts headings in a different data
// source entirely, and only two of the windowing buckets take part in the
// window identity. Every bucket is reported regardless (silence is not an
// option), and adding a bucket breaks the renderer at the type boundary.
export interface ExclusionCounts {
  readonly corpus: { readonly brokenLine: number; readonly unreadableShard: number };
  readonly windowing: {
    readonly unmatchedStart: number;
    readonly orphanComplete: number;
    readonly unclosedIdle: number;
    readonly zeroSecond: number;
  };
  readonly review: { readonly unparseableReviewHeading: number };
}

/** All buckets at zero — the identity element the folds start from. */
export function emptyExclusions(): ExclusionCounts {
  return {
    corpus: { brokenLine: 0, unreadableShard: 0 },
    windowing: { unmatchedStart: 0, orphanComplete: 0, unclosedIdle: 0, zeroSecond: 0 },
    review: { unparseableReviewHeading: 0 },
  };
}

/** One row of the per-stage duration table. */
export interface StageStat {
  readonly stage: string;
  readonly n: number;
  readonly rawMedian: number;
  readonly netMean: number;
  readonly netMedian: number;
  readonly netP95: number;
}

// --- window construction ---------------------------------------------------

/** The audit event name of a record, under either schema generation. */
export function eventOf(record: JournalRecord): string | null {
  return journalRecordField(record, "Event");
}

/** A record's payload attribute, under either schema generation. */
export function attrOf(record: JournalRecord, key: string): string | null {
  return journalRecordField(record, key);
}

// Second-grained epoch. The audit writer strips milliseconds, so window
// arithmetic is integer seconds and sub-second work collapses to zero — the
// zero-second bucket exists to say so rather than to hide it.
function epochSeconds(timestamp: string): number {
  return Math.floor(Date.parse(timestamp) / 1000);
}

// Timestamp-ascending, with the original index as the tie-break so records
// stamped in the same second keep their shard order (START before COMPLETED).
function chronological(records: readonly AttributedRecord[]): AttributedRecord[] {
  return records
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.record.timestamp.localeCompare(b.entry.record.timestamp) || a.index - b.index)
    .map((wrapped) => wrapped.entry);
}

/** Pair STAGE_STARTED with the next STAGE_COMPLETED inside the same
 *  intent x stage. Unpaired events on either side are counted as events, not
 *  as windows — they never enter the window population. */
export function buildWindows(records: readonly AttributedRecord[]): { windows: StageWindow[]; buckets: ExclusionCounts } {
  const pending = new Map<string, AttributedRecord[]>();
  const windows: StageWindow[] = [];
  let unmatchedStart = 0;
  let orphanComplete = 0;

  for (const attributed of chronological(records)) {
    const event = eventOf(attributed.record);
    if (event !== "STAGE_STARTED" && event !== "STAGE_COMPLETED") continue;
    const stage = attrOf(attributed.record, "Stage");
    if (stage === null || stage === "") continue;
    const key = `${attributed.intent}\u0000${stage}`;
    if (event === "STAGE_STARTED") {
      const queue = pending.get(key);
      if (queue === undefined) pending.set(key, [attributed]);
      else queue.push(attributed);
      continue;
    }
    const queue = pending.get(key);
    const started = queue?.shift();
    if (started === undefined) {
      orphanComplete += 1;
      continue;
    }
    windows.push({
      intent: attributed.intent,
      stage,
      startedAt: started.record.timestamp,
      completedAt: attributed.record.timestamp,
      rawSeconds: epochSeconds(attributed.record.timestamp) - epochSeconds(started.record.timestamp),
    });
  }
  for (const queue of pending.values()) unmatchedStart += queue.length;

  const zero = emptyExclusions();
  return { windows, buckets: { ...zero, windowing: { ...zero.windowing, unmatchedStart, orphanComplete } } };
}

// --- idle subtraction ------------------------------------------------------

/** One idle span, already closed by its terminating event. */
export interface IdleInterval {
  readonly kind: "awaiting" | "parked" | "session-gap";
  readonly start: number;
  readonly end: number;
}

/** Per-intent idle spans plus the timestamps of openers that never closed. */
export interface IdleIndex {
  readonly intervals: ReadonlyMap<string, readonly IdleInterval[]>;
  readonly unclosedOpeners: ReadonlyMap<string, readonly number[]>;
}

// The three idle shapes, as opener -> accepted closers. An opener that never
// meets its closer inside the intent is NOT given an implied terminal: guessing
// one would silently invent working time, so the affected window leaves the
// population instead.
const IDLE_SHAPES: readonly { kind: IdleInterval["kind"]; open: string; close: readonly string[] }[] = [
  { kind: "awaiting", open: "STAGE_AWAITING_APPROVAL", close: ["GATE_APPROVED", "GATE_REJECTED"] },
  { kind: "parked", open: "WORKFLOW_PARKED", close: ["WORKFLOW_UNPARKED"] },
  { kind: "session-gap", open: "SESSION_ENDED", close: ["SESSION_STARTED", "SESSION_RESUMED"] },
];

// The open-opener stacks, keyed by intent and idle kind. Kept as its own type
// so the fold below reads as three small steps instead of one nested sweep.
type OpenerStacks = Map<string, Map<IdleInterval["kind"], number[]>>;

/** The stack of unmatched openers for one intent x kind, created on demand. */
function openerStack(stacks: OpenerStacks, intent: string, kind: IdleInterval["kind"]): number[] {
  const perKind = stacks.get(intent) ?? new Map<IdleInterval["kind"], number[]>();
  stacks.set(intent, perKind);
  const stack = perKind.get(kind) ?? [];
  perKind.set(kind, stack);
  return stack;
}

/** Append one closed span to an intent's interval list. */
function pushInterval(intervals: Map<string, IdleInterval[]>, intent: string, span: IdleInterval): void {
  const bucket = intervals.get(intent) ?? [];
  intervals.set(intent, bucket);
  bucket.push(span);
}

/** The idle shape this event participates in, or null when it is not idle. */
function idleShapeFor(event: string): (typeof IDLE_SHAPES)[number] | null {
  return IDLE_SHAPES.find((shape) => event === shape.open || shape.close.includes(event)) ?? null;
}

/** Build the per-intent idle index from the corpus. Pure over the records. */
export function indexIdle(records: readonly AttributedRecord[]): IdleIndex {
  const intervals = new Map<string, IdleInterval[]>();
  const unclosedOpeners = new Map<string, number[]>();
  const openPerIntent: OpenerStacks = new Map();

  for (const attributed of chronological(records)) {
    const event = eventOf(attributed.record);
    const shape = event === null ? null : idleShapeFor(event);
    if (shape === null) continue;
    const at = epochSeconds(attributed.record.timestamp);
    const stack = openerStack(openPerIntent, attributed.intent, shape.kind);
    if (event === shape.open) {
      stack.push(at);
      continue;
    }
    const start = stack.shift();
    if (start !== undefined) pushInterval(intervals, attributed.intent, { kind: shape.kind, start, end: at });
  }

  for (const [intent, perKind] of openPerIntent) {
    const leftovers: number[] = [];
    for (const stack of perKind.values()) leftovers.push(...stack);
    if (leftovers.length > 0) unclosedOpeners.set(intent, leftovers.sort((a, b) => a - b));
  }
  return { intervals, unclosedOpeners };
}

// Clip each span to the window, then merge the survivors so overlapping spans
// are subtracted once. Clipping is what keeps net non-negative: the merged
// length can never exceed the window it was clipped into.
function clippedIdleSeconds(window: StageWindow, spans: readonly IdleInterval[]): number {
  const from = epochSeconds(window.startedAt);
  const to = epochSeconds(window.completedAt);
  const clipped = spans
    .map((span) => ({ start: Math.max(span.start, from), end: Math.min(span.end, to) }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);

  let total = 0;
  let cursor = from;
  for (const span of clipped) {
    const start = Math.max(span.start, cursor);
    if (span.end > start) {
      total += span.end - start;
      cursor = span.end;
    }
  }
  return total;
}

/** Subtract idle from every window. A window is dropped from the population
 *  when an unclosed idle opener falls inside it (its idle is unknowable) or
 *  when it collapsed to zero seconds. The two are decided in that order, so a
 *  window that satisfies both is counted exactly once. */
export function subtractIdle(
  windows: readonly StageWindow[],
  records: readonly AttributedRecord[],
): { measured: MeasuredWindow[]; buckets: ExclusionCounts } {
  const index = indexIdle(records);
  const measured: MeasuredWindow[] = [];
  let unclosedIdle = 0;
  let zeroSecond = 0;

  for (const window of windows) {
    const from = epochSeconds(window.startedAt);
    const to = epochSeconds(window.completedAt);
    const openers = index.unclosedOpeners.get(window.intent) ?? [];
    const shadowed = openers.some((at) => at >= from && at <= to);
    if (shadowed) {
      unclosedIdle += 1;
      continue;
    }
    if (window.rawSeconds === 0) {
      zeroSecond += 1;
      continue;
    }
    const idleSeconds = clippedIdleSeconds(window, index.intervals.get(window.intent) ?? []);
    measured.push({ ...window, idleSeconds, netSeconds: window.rawSeconds - idleSeconds });
  }

  const zero = emptyExclusions();
  return { measured, buckets: { ...zero, windowing: { ...zero.windowing, unclosedIdle, zeroSecond } } };
}

// --- review iterations -----------------------------------------------------

/** One §12a review block located in a record artefact. */
export interface ReviewBlock {
  readonly intent: string;
  readonly stagePath: string;
  readonly unit: string | null;
  readonly iteration: number;
}

// The reviewer runtime finds its own blocks with a permissive H2 scan followed
// by an exact marker comparison. The same two stages are mirrored here so a
// heading the writer would not recognize is surfaced as unparseable rather
// than quietly matched by a looser reader.
const REVIEW_HEADING = /^## Review(?:[ \t].*)?$/gm;
const REVIEW_MARKER = /^## Review — Iteration (\d+)$/;

/** Iterations found in one artefact's text, plus headings the writer's exact
 *  marker would not accept (suffixed variants are real and stay visible). */
export function parseReviewHeadings(content: string): { iterations: number[]; unparseable: number } {
  const iterations: number[] = [];
  let unparseable = 0;
  for (const heading of content.matchAll(REVIEW_HEADING)) {
    const marker = REVIEW_MARKER.exec(heading[0].trim());
    if (marker === null) {
      unparseable += 1;
      continue;
    }
    iterations.push(Number(marker[1]));
  }
  return { iterations, unparseable };
}

/** Stage path and unit for an artefact, taken from its intent-relative path.
 *  A literal `{unit-name}` directory is a real thing on disk; it is displayed
 *  verbatim rather than repaired into an invented unit name. */
export function reviewAttribution(relativePath: string): { stagePath: string; unit: string | null } {
  const segments = relativePath.split("/");
  const stagePath = segments.slice(0, -1).join("/");
  const unit = segments[0] === "construction" && segments.length >= 4 ? (segments[1] ?? null) : null;
  return { stagePath, unit };
}

// --- sensors ---------------------------------------------------------------

/** Sensor outcomes for one stage slug. */
export interface SensorTally {
  readonly stageSlug: string;
  readonly fired: number;
  readonly passed: number;
  readonly failed: number;
  readonly failedRate: number;
}

const SENSOR_EVENTS: Record<string, "fired" | "passed" | "failed"> = {
  SENSOR_FIRED: "fired",
  SENSOR_PASSED: "passed",
  SENSOR_FAILED: "failed",
};

/** Tally sensor outcomes by the `Stage slug` attribute. The lifecycle events'
 *  `Stage` attribute is a different key with different values and is never read
 *  here — mixing them would merge unrelated rows. */
export function tallySensors(records: readonly AttributedRecord[]): SensorTally[] {
  const counters = new Map<string, { fired: number; passed: number; failed: number }>();
  for (const { record } of records) {
    const event = eventOf(record);
    const outcome = event === null ? undefined : SENSOR_EVENTS[event];
    if (outcome === undefined) continue;
    const slug = attrOf(record, "Stage slug");
    if (slug === null || slug === "") continue;
    const counter = counters.get(slug) ?? { fired: 0, passed: 0, failed: 0 };
    counters.set(slug, counter);
    counter[outcome] += 1;
  }
  return [...counters.entries()]
    .map(([stageSlug, c]) => ({ stageSlug, ...c, failedRate: c.fired === 0 ? Number.NaN : c.failed / c.fired }))
    .sort((a, b) => b.fired - a.fired || a.stageSlug.localeCompare(b.stageSlug));
}

// --- model attribution -----------------------------------------------------

/** Model breakdown of the subagent rows, with the unattributable ones kept. */
export interface ModelAttribution {
  readonly byModel: ReadonlyMap<string, number>;
  readonly byModelSource: ReadonlyMap<string, number>;
  readonly unresolvedCount: number;
  readonly attributableCount: number;
  readonly totalCount: number;
}

/** Attribute subagent rows to models. Only SUBAGENT_COMPLETED rows join the
 *  population — a start and its completion describe one dispatch, and the
 *  sibling stats tool attributes on completion, so counting both would double
 *  every per-model total. A row without a usable `Model` is the UNKNOWN
 *  bucket: the absence of the attribute is itself the record, so it is
 *  reported rather than dropped from the denominator. */
export function attributeModels(records: readonly AttributedRecord[]): ModelAttribution {
  const byModel = new Map<string, number>();
  const byModelSource = new Map<string, number>();
  let unresolvedCount = 0;
  let attributableCount = 0;
  let totalCount = 0;

  for (const { record } of records) {
    const event = eventOf(record);
    if (event !== "SUBAGENT_COMPLETED") continue;
    totalCount += 1;
    const model = attrOf(record, "Model");
    if (model === null || model.trim() === "") {
      unresolvedCount += 1;
      continue;
    }
    attributableCount += 1;
    byModel.set(model, (byModel.get(model) ?? 0) + 1);
    const source = attrOf(record, "Model Source");
    if (source !== null && source.trim() !== "") byModelSource.set(source, (byModelSource.get(source) ?? 0) + 1);
  }
  return { byModel, byModelSource, unresolvedCount, attributableCount, totalCount };
}

// --- statistics ------------------------------------------------------------

// Nearest rank, no interpolation: the smallest sample whose rank covers 95% of
// the set. An empty set yields NaN rather than 0 so a hole in the measurement
// stays visibly non-finite instead of reading as a real zero.
export function nearestRankP95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Number.NaN;
}

/** Arithmetic mean; NaN on an empty population (no 0 fallback). */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Median (mean of the two middle samples on an even count); NaN when empty. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Fold measured windows into the per-stage table. Ordering: count-desc, then
 *  stage-asc, so the same population always renders in the same order. */
export function composeStageStats(measured: readonly MeasuredWindow[]): StageStat[] {
  const byStage = new Map<string, MeasuredWindow[]>();
  for (const window of measured) {
    const bucket = byStage.get(window.stage);
    if (bucket === undefined) byStage.set(window.stage, [window]);
    else bucket.push(window);
  }
  const rows: StageStat[] = [];
  for (const [stage, windows] of byStage) {
    const net = windows.map((w) => w.netSeconds);
    rows.push({
      stage,
      n: windows.length,
      rawMedian: median(windows.map((w) => w.rawSeconds)),
      netMean: mean(net),
      netMedian: median(net),
      netP95: nearestRankP95(net),
    });
  }
  return rows.sort((a, b) => b.n - a.n || a.stage.localeCompare(b.stage));
}

// --- report assembly -------------------------------------------------------

// The one sentence this tool must never ship without. net is derived by
// subtracting idle spans; nobody has verified that the remainder equals the
// time someone actually spent working, so the report says so where the reader
// cannot miss it.
export const HYPOTHESIS_NOTICE =
  "net (working time) is an estimate produced by subtracting idle spans; its agreement with real working time is an unverified hypothesis.";

/** Review blocks folded per stage path. */
export interface ReviewBucket {
  readonly stagePath: string;
  readonly unit: string | null;
  readonly blocks: number;
  readonly maxIteration: number;
}

/** Everything the renderers are allowed to draw from. The measurement ref and
 *  the hypothesis notice are required fields, so an output that omits them is
 *  not expressible. */
export interface StageStatsReport {
  readonly scanScope: string;
  readonly hypothesisNotice: string;
  readonly shardCount: number;
  readonly lineCount: number;
  readonly exclusions: ExclusionCounts;
  readonly constructedWindowCount: number;
  readonly populationCount: number;
  readonly stages: readonly StageStat[];
  readonly sensors: readonly SensorTally[];
  readonly models: ModelAttribution;
  readonly reviewBuckets: readonly ReviewBucket[];
}

/** Fold review blocks into per-stage-path buckets, count-desc then path-asc. */
export function bucketReviews(blocks: readonly ReviewBlock[]): ReviewBucket[] {
  const buckets = new Map<string, { unit: string | null; blocks: number; maxIteration: number }>();
  for (const block of blocks) {
    const bucket = buckets.get(block.stagePath) ?? { unit: block.unit, blocks: 0, maxIteration: 0 };
    buckets.set(block.stagePath, {
      unit: bucket.unit,
      blocks: bucket.blocks + 1,
      maxIteration: Math.max(bucket.maxIteration, block.iteration),
    });
  }
  return [...buckets.entries()]
    .map(([stagePath, b]) => ({ stagePath, ...b }))
    .sort((a, b) => b.blocks - a.blocks || a.stagePath.localeCompare(b.stagePath));
}

/** Assemble the whole report from a scanned corpus and the review blocks.
 *  Pure over its input: the same corpus always produces the same report. */
export function composeReport(input: {
  scanScope: string;
  corpus: ScannedCorpus;
  reviewBlocks: readonly ReviewBlock[];
  unparseableReviewHeadingCount: number;
}): StageStatsReport {
  const built = buildWindows(input.corpus.records);
  const subtracted = subtractIdle(built.windows, input.corpus.records);
  return {
    scanScope: input.scanScope,
    hypothesisNotice: HYPOTHESIS_NOTICE,
    shardCount: input.corpus.shardCount,
    lineCount: input.corpus.lineCount,
    exclusions: {
      corpus: { brokenLine: input.corpus.brokenLineCount, unreadableShard: input.corpus.unreadableShardCount },
      windowing: {
        unmatchedStart: built.buckets.windowing.unmatchedStart,
        orphanComplete: built.buckets.windowing.orphanComplete,
        unclosedIdle: subtracted.buckets.windowing.unclosedIdle,
        zeroSecond: subtracted.buckets.windowing.zeroSecond,
      },
      review: { unparseableReviewHeading: input.unparseableReviewHeadingCount },
    },
    constructedWindowCount: built.windows.length,
    populationCount: subtracted.measured.length,
    stages: composeStageStats(subtracted.measured),
    sensors: tallySensors(input.corpus.records),
    models: attributeModels(input.corpus.records),
    reviewBuckets: bucketReviews(input.reviewBlocks),
  };
}

// --- rendering -------------------------------------------------------------

// Values from the corpus reach a terminal here. The corpus is outside the
// trust boundary, so a stage slug or model name is reduced to its first line
// and stripped of control bytes at the render point only — the aggregation
// keys stay verbatim, and the JSON form keeps the raw value because its
// encoding already escapes control bytes and machine consumers need it whole.
const FIRST_PRINTABLE = 0x20;
const DELETE_CODE = 0x7f;

function safe(value: string): string {
  const firstLine = value.split("\n", 1)[0] ?? "";
  let out = "";
  for (const char of firstLine) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= FIRST_PRINTABLE && code !== DELETE_CODE) out += char;
  }
  return out;
}

// A number the reader must be able to tell apart from a real zero.
function num(value: number): string {
  return Number.isNaN(value) ? "n/a" : `${Math.round(value * 100) / 100}`;
}

/** The measurement ref lines, shared by every output form: what was scanned,
 *  and every exclusion bucket, whatever its value. */
function measurementRefLines(report: StageStatsReport): string[] {
  const { corpus, windowing, review } = report.exclusions;
  return [
    `scan scope: ${safe(report.scanScope)}`,
    `shards: ${report.shardCount}`,
    `lines: ${report.lineCount}`,
    `broken-line: ${corpus.brokenLine}`,
    `unreadable-shard: ${corpus.unreadableShard}`,
    `unmatched-start: ${windowing.unmatchedStart}`,
    `orphan-complete: ${windowing.orphanComplete}`,
    `unclosed-idle: ${windowing.unclosedIdle}`,
    `zero-second: ${windowing.zeroSecond}`,
    `unparseable-review-heading: ${review.unparseableReviewHeading}`,
    `constructed-windows: ${report.constructedWindowCount}`,
    `net-population: ${report.populationCount}`,
  ];
}

/** Sorted entries of a tally map: count-desc, then key-asc. */
function sortedEntries(tally: ReadonlyMap<string, number>): [string, number][] {
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** The human-readable form. */
export function renderMarkdown(report: StageStatsReport): string {
  const lines: string[] = ["# stage-stats — measurement ref", ""];
  for (const line of measurementRefLines(report)) lines.push(`- ${line}`);
  lines.push(
    "",
    `> ${HYPOTHESIS_NOTICE}`,
    "",
    `Identity W: ${report.constructedWindowCount} constructed = ${report.populationCount} population + ${report.exclusions.windowing.unclosedIdle} unclosed-idle + ${report.exclusions.windowing.zeroSecond} zero-second`,
    `Identity M: ${report.models.totalCount} total = ${report.models.attributableCount} attributable + ${report.models.unresolvedCount} unresolved`,
    "",
    "## Stage durations (seconds)",
    "",
    "| stage | n | raw median | net mean | net median | net p95 |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  if (report.stages.length === 0) lines.push("| (none) | 0 | n/a | n/a | n/a | n/a |");
  for (const stat of report.stages) {
    lines.push(`| ${safe(stat.stage)} | ${stat.n} | ${num(stat.rawMedian)} | ${num(stat.netMean)} | ${num(stat.netMedian)} | ${num(stat.netP95)} |`);
  }

  lines.push("", "## Sensor outcomes", "", "| stage slug | fired | passed | failed | failed rate |", "| --- | --- | --- | --- | --- |");
  if (report.sensors.length === 0) lines.push("| (none) | 0 | 0 | 0 | n/a |");
  for (const row of report.sensors) {
    lines.push(`| ${safe(row.stageSlug)} | ${row.fired} | ${row.passed} | ${row.failed} | ${num(row.failedRate)} |`);
  }

  lines.push("", "## Model attribution", "", `- attributable: ${report.models.attributableCount} / ${report.models.totalCount}`, `- unresolved (UNKNOWN): ${report.models.unresolvedCount}`);
  for (const [model, count] of sortedEntries(report.models.byModel)) lines.push(`- model ${safe(model)}: ${count}`);
  for (const [source, count] of sortedEntries(report.models.byModelSource)) lines.push(`- model-source ${safe(source)}: ${count}`);

  lines.push("", "## Review iterations", "", "| stage path | unit | blocks | max iteration |", "| --- | --- | --- | --- |");
  if (report.reviewBuckets.length === 0) lines.push("| (none) |  | 0 | 0 |");
  for (const bucket of report.reviewBuckets) {
    lines.push(`| ${safe(bucket.stagePath)} | ${safe(bucket.unit ?? "")} | ${bucket.blocks} | ${bucket.maxIteration} |`);
  }
  return `${lines.join("\n")}\n`;
}

// CSV quoting: double the quotes and wrap, so a value containing a comma or a
// quote cannot forge an extra column.
function csvCell(value: string): string {
  return `"${safe(value).replace(/"/g, '""')}"`;
}

/** The spreadsheet form: the same measurement ref, then one section per axis. */
export function renderCsv(report: StageStatsReport): string {
  const lines: string[] = ["section,key,value"];
  lines.push(`meta,${csvCell("stage-stats")},${csvCell(report.scanScope)}`);
  lines.push(`meta,${csvCell("hypothesis")},${csvCell(HYPOTHESIS_NOTICE)}`);
  for (const line of measurementRefLines(report)) {
    const split = line.indexOf(":");
    lines.push(`ref,${line.slice(0, split)},${csvCell(line.slice(split + 2))}`);
  }
  lines.push("", "stage,n,raw_median,net_mean,net_median,net_p95");
  for (const stat of report.stages) {
    lines.push(`${csvCell(stat.stage)},${stat.n},${num(stat.rawMedian)},${num(stat.netMean)},${num(stat.netMedian)},${num(stat.netP95)}`);
  }
  lines.push("", "sensor_stage_slug,fired,passed,failed,failed_rate");
  for (const row of report.sensors) lines.push(`${csvCell(row.stageSlug)},${row.fired},${row.passed},${row.failed},${num(row.failedRate)}`);
  lines.push("", "model,count");
  for (const [model, count] of sortedEntries(report.models.byModel)) lines.push(`${csvCell(model)},${count}`);
  lines.push(`${csvCell("(unresolved)")},${report.models.unresolvedCount}`);
  lines.push("", "review_stage_path,unit,blocks,max_iteration");
  for (const bucket of report.reviewBuckets) {
    lines.push(`${csvCell(bucket.stagePath)},${csvCell(bucket.unit ?? "")},${bucket.blocks},${bucket.maxIteration}`);
  }
  return `${lines.join("\n")}\n`;
}

/** The machine form. Maps become arrays in the same fixed order the text forms
 *  use, so a consumer sees one ordering contract, not two. */
export function serializeJson(report: StageStatsReport): Record<string, unknown> {
  return {
    scanScope: report.scanScope,
    hypothesisNotice: report.hypothesisNotice,
    shardCount: report.shardCount,
    lineCount: report.lineCount,
    exclusions: report.exclusions,
    constructedWindowCount: report.constructedWindowCount,
    populationCount: report.populationCount,
    stages: report.stages,
    sensors: report.sensors,
    models: {
      byModel: sortedEntries(report.models.byModel).map(([model, count]) => ({ model, count })),
      byModelSource: sortedEntries(report.models.byModelSource).map(([source, count]) => ({ source, count })),
      unresolvedCount: report.models.unresolvedCount,
      attributableCount: report.models.attributableCount,
      totalCount: report.models.totalCount,
    },
    reviewBuckets: report.reviewBuckets,
  };
}

// --- argv ------------------------------------------------------------------

/** Command line options, already validated into their narrow shapes. */
export interface CliOptions {
  readonly projectDir?: string;
  readonly space?: string;
  readonly format: "markdown" | "csv" | "json";
}

/** The one thing a usage error carries. */
export interface UsageError {
  readonly message: string;
}

/** A parse outcome; the shell is the only place it becomes an exit code. */
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

const USAGE =
  "Usage: bun amadeus-stage-stats.ts [--project-dir <path>] [--space <name>] [--format markdown|csv|json] [--json]";

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const FORMATS: readonly CliOptions["format"][] = ["markdown", "csv", "json"];

function isFormat(value: string): value is CliOptions["format"] {
  return (FORMATS as readonly string[]).includes(value);
}

const VALUE_FLAGS = ["--project-dir", "--space", "--format"] as const;
type ValueFlag = (typeof VALUE_FLAGS)[number];

function isValueFlag(arg: string): arg is ValueFlag {
  return (VALUE_FLAGS as readonly string[]).includes(arg);
}

function usageError(message: string): { ok: false; error: UsageError } {
  return { ok: false, error: { message: `${message}\n${USAGE}` } };
}

/** Apply one already-paired flag/value to the accumulating options, or refuse
 *  the value. Keeping the per-flag rules here leaves the loop a plain walk. */
function applyValueFlag(flag: ValueFlag, value: string, into: { projectDir?: string; space?: string; format: CliOptions["format"] }): UsageError | null {
  if (flag === "--project-dir") {
    into.projectDir = value;
    return null;
  }
  if (flag === "--space") {
    if (!SAFE_NAME.test(value)) return { message: `Invalid --space value: ${value}\n${USAGE}` };
    into.space = value;
    return null;
  }
  if (!isFormat(value)) return { message: `Invalid --format value: ${value}\n${USAGE}` };
  into.format = value;
  return null;
}

/** Parse, do not validate: an unknown flag, a missing value, an unsupported
 *  format, or an unsafe space name never reaches the rest of the program. */
export function parseArgs(argv: readonly string[]): Result<CliOptions, UsageError> {
  const options: { projectDir?: string; space?: string; format: CliOptions["format"] } = { format: "markdown" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--json") {
      options.format = "json";
      continue;
    }
    if (!isValueFlag(arg)) return usageError(`Unknown argument: ${arg}`);
    const value = argv[i + 1];
    if (value === undefined) return usageError(`${arg} requires a value`);
    i += 1;
    const rejected = applyValueFlag(arg, value, options);
    if (rejected !== null) return { ok: false, error: rejected };
  }
  return { ok: true, value: options };
}

// ---------------------------------------------------------------------------
// Filesystem layer + CLI shell — the only process-boundary code in this module.
// ---------------------------------------------------------------------------

/** Directory entries, or none when the directory is absent or unreadable. An
 *  absent tree and a tree that vanishes mid-scan are the same thing here: an
 *  empty corpus. The fail-loud case is a shard that EXISTS but cannot be read. */
function listOrEmpty(dir: string): string[] {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

/** One shard's bytes, or null when it exists but cannot be read. */
function readOrNull(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const detail = safe(`${path}: ${reason}`);
    process.stderr.write(`stage-stats: unreadable: ${detail}\n`);
    return null;
  }
}

// Records in one shard, counting lines that do not decode. The journal reader
// is strict per buffer, so it is fed one line at a time: a single torn row then
// costs that row and nothing else, and the count of torn rows is reported.
function recordsFromShard(intent: string, body: string): { records: AttributedRecord[]; lines: number; broken: number } {
  const records: AttributedRecord[] = [];
  let lines = 0;
  let broken = 0;
  for (const line of body.split("\n")) {
    if (line.trim() === "") continue;
    lines += 1;
    try {
      for (const record of readJournalRecords(line)) records.push({ intent, record });
    } catch { broken += 1; }
  }
  return { records, lines, broken };
}

/** Read every audit shard under the space's intents tree. The intent an event
 *  belongs to comes from the shard's PATH, never from the recorded intentId —
 *  most historical v1 rows carry a degenerate value there. */
export function scanCorpus(spaceRoot: string): ScannedCorpus {
  const records: AttributedRecord[] = [];
  let unreadableShardCount = 0;
  let brokenLineCount = 0;
  let shardCount = 0;
  let lineCount = 0;

  const intentsRoot = join(spaceRoot, "intents");
  for (const intent of listOrEmpty(intentsRoot)) {
    const auditDir = join(intentsRoot, intent, "audit");
    for (const shard of listOrEmpty(auditDir)) {
      if (!shard.endsWith(".jsonl")) continue;
      const body = readOrNull(join(auditDir, shard));
      if (body === null) {
        unreadableShardCount += 1;
        continue;
      }
      shardCount += 1;
      const read = recordsFromShard(intent, body);
      records.push(...read.records);
      lineCount += read.lines;
      brokenLineCount += read.broken;
    }
  }
  return { records, unreadableShardCount, brokenLineCount, shardCount, lineCount };
}

/** Markdown artefacts under one intent, as intent-relative paths. */
function markdownUnder(root: string, prefix: string, out: string[]): void {
  for (const entry of listOrEmpty(root)) {
    if (entry === "audit" || entry === "node_modules") continue;
    const full = join(root, entry);
    const relative = prefix === "" ? entry : `${prefix}/${entry}`;
    if (entry.endsWith(".md")) out.push(relative);
    else markdownUnder(full, relative, out);
  }
}

/** Collect every §12a review block from the record artefacts. This is the
 *  record tree, not the audit tree: iteration counts live in the artefacts the
 *  reviewer appended to, and nowhere else. */
export function collectReviewBlocks(intentsRoot: string): { blocks: ReviewBlock[]; unparseableHeadingCount: number } {
  const blocks: ReviewBlock[] = [];
  let unparseableHeadingCount = 0;
  for (const intent of listOrEmpty(intentsRoot)) {
    const paths: string[] = [];
    markdownUnder(join(intentsRoot, intent), "", paths);
    for (const relative of paths) {
      const body = readOrNull(join(intentsRoot, intent, relative));
      if (body === null) continue;
      const parsed = parseReviewHeadings(body);
      unparseableHeadingCount += parsed.unparseable;
      const attribution = reviewAttribution(relative);
      for (const iteration of parsed.iterations) {
        blocks.push({ intent, stagePath: attribution.stagePath, unit: attribution.unit, iteration });
      }
    }
  }
  return { blocks, unparseableHeadingCount };
}

// The two path idioms below mirror the sibling stats tool, reimplemented small
// because this module must not import amadeus-lib.ts.

function resolveProjectDirLocal(explicitDir: string | undefined): string {
  if (explicitDir) return explicitDir;
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  if (basename(scriptDir) === "tools") {
    const leaf = basename(dirname(scriptDir));
    if (/^\.[a-z0-9][a-z0-9._-]*$/i.test(leaf)) return dirname(dirname(scriptDir));
  }
  return process.cwd();
}

function activeSpaceLocal(projectDir: string): string {
  try {
    const raw = readFileSync(join(projectDir, "amadeus", "active-space"), "utf-8").trim();
    if (SAFE_NAME.test(raw)) return raw;
  } catch {
    return "default";
  }
  return "default";
}

const RENDERERS: Record<CliOptions["format"], (report: StageStatsReport) => string> = {
  markdown: renderMarkdown,
  csv: renderCsv,
  json: (report) => JSON.stringify(serializeJson(report), null, 2),
};

/** 0 normal, 1 the corpus had a hole, 2 the caller made a usage error. */
export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.error.message}\n`);
    return 2;
  }
  const projectDir = resolveProjectDirLocal(parsed.value.projectDir);
  const space = parsed.value.space ?? activeSpaceLocal(projectDir);
  const spaceRoot = join(projectDir, "amadeus", "spaces", space);

  const corpus = scanCorpus(spaceRoot);
  const reviews = collectReviewBlocks(join(spaceRoot, "intents"));
  const report = composeReport({
    scanScope: `space "${space}" — amadeus/spaces/${space}/intents/*/audit/*.jsonl + record *.md`,
    corpus,
    reviewBlocks: reviews.blocks,
    unparseableReviewHeadingCount: reviews.unparseableHeadingCount,
  });
  process.stdout.write(`${RENDERERS[parsed.value.format](report)}`);

  // A shard that existed but could not be read means the report covers less
  // than the observable corpus — say so in the exit code so a caller does not
  // mistake a partial sweep for a complete one.
  return corpus.unreadableShardCount > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
