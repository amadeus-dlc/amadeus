// nfr-budget sensor — the measurement stage of #2684 (the issue's stage ②).
//
// The FR side reached measurable volume in four steps: an id contract (#2458),
// a sensor that divides bytes by that id count (#2503), a ceiling placed inside
// the observed range (#2525), and a numeric contract in stage-protocol §8
// (#2672). The two NFR stages had none of them, while producing more artifact
// files than any other stage in the corpus and a per-artifact spread wider than
// the one #2425 was filed about.
//
// Stage ① (#2686) supplied the id contract. Stage ② (this sensor, before the
// ruling on GitHub issue comment 5230416035) supplied the measurement and
// NOTHING ELSE: no ceiling. Placing one before the observed distribution
// exists is exactly the mistake #2525 had to undo — a threshold under the
// observed minimum flags every artifact, and a permanently red signal says
// nothing about which artifact is an outlier. Stage ③ (that ruling) ships the
// first ceiling — Standard depth only, one independently-derived constant per
// stage — from the numbers this sensor and the repository's depth artifact
// census produce. Minimal (n=3, too thin to rule on) and Comprehensive (no
// ceiling by convention, stage-protocol.md §8) stay unmeasured against one.
//
// Stage ⑥ (issue comment 5230806329, scope narrowed from a stopped first
// attempt by comment 5230769702) adds a THIRD check, scoped to ONE artifact:
// performance-requirements.md. The same measurable-numeric-threshold
// predicate applied corpus-wide to every nfr-requirements artifact flagged
// performance at 126/302 = 41.7% and the other four at 72.0%-90.2%; reading
// the flagged security/scalability/tech-stack samples confirmed those were
// NOT false positives — "does not retain the token", "adds zero new
// dependencies" are structurally qualitative and a numeric equality can never
// hold against them. Only performance carried a genuine gap between
// "declared an id" and "declared a measurable number", so the check applies
// to it alone; reliability and scalability are left for a future ruling
// (their 72%-75% is a mix this predicate cannot yet separate). Gated on the
// same id-contract cutoff as the missing-nfr-ids case, advisory-only, and
// blocking is deferred to #2683 the same way the ceiling check is.
//
// WHAT IS THE DENOMINATOR. NFR ids are declared in nfr-requirements and only
// CITED in nfr-design — the stage ① contract says so in as many words ("do not
// renumber, re-prefix, or invent ids the upstream artifacts do not declare").
// Counting declarations inside a design artifact would therefore always yield
// zero. So the denominator is the UNIT's id count: the distinct ids declared
// across that unit's nfr-requirements artifacts, shared by both stages. That is
// the D2 denominator of the issue's Part B-1, chosen there as the primary axis
// because `produces_kinds` pruning moves numerator and denominator together —
// a unit whose kind prunes three of five artifacts loses their bytes and their
// ids at once, so the ratio stays comparable across kinds.
//
// The per-artifact figure is kept as a diagnostic (D1: which category of one
// unit is the outlier), not as a second denominator.
//
// PRUNING CANNOT BE RECONSTRUCTED FROM DISK, which is why the measurement does
// not try. Measured over the corpus: of the 142 nfr-requirements unit
// directories, 130 belong to units whose kind is unresolvable from the
// committed unit-of-work-dependency.md, and the engine's kindless fallback
// hands those every declared artifact. So "artifact absent" and "artifact
// pruned" are indistinguishable for most of the corpus. This sensor measures
// the artifacts that EXIST and never assumes an expected set; separating
// pruning from a silent omission is the issue's stage ⑤ (coverage), which needs
// the directive's resolved kind rather than the filesystem.
//
// Advisory by construction: the shipped schema admits no other severity, so a
// finding is data for the human at the gate and never blocks. Every check
// outcome exits 0; the only exit-1 path is a missing CLI flag.
//
// Self-contained (no amadeus-lib import): a per-sensor script is spawned by the
// dispatcher and must not drag the library's module graph into that process.
// The one cross-sensor import below (canonicalDepth from the sibling
// depth-budget script) is not that: depth normalization is canonicalized
// there already and re-deriving it here would let this sensor's idea of
// "Standard" drift from that one's — the same reuse the census script makes.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { canonicalDepth } from "./amadeus-sensor-depth-budget.ts";

/** The artifacts `nfr-requirements` declares in `produces`. Ids are DECLARED
 *  here. */
export const NFR_REQUIREMENTS_ARTIFACTS = [
  "performance-requirements",
  "security-requirements",
  "scalability-requirements",
  "reliability-requirements",
  "tech-stack-decisions",
] as const;

/** The artifacts `nfr-design` declares in `produces`. Ids are CITED here, never
 *  declared — see the denominator note above. */
export const NFR_DESIGN_ARTIFACTS = [
  "performance-design",
  "security-design",
  "scalability-design",
  "reliability-design",
  "logical-components",
] as const;

/** The stage slug that produces each measured basename. A closed set: the stage
 *  directory also holds `memory.md` (the diary) and question files, which are
 *  not artifacts this measures. */
export const NFR_ARTIFACT_STAGES: ReadonlyMap<string, string> = new Map([
  ...NFR_REQUIREMENTS_ARTIFACTS.map((name) => [`${name}.md`, "nfr-requirements"] as const),
  ...NFR_DESIGN_ARTIFACTS.map((name) => [`${name}.md`, "nfr-design"] as const),
]);

/** The stage directory name ids are declared under. Both stages divide by the
 *  ids declared here. */
export const NFR_REQUIREMENTS_STAGE_DIR = "nfr-requirements";

/** The instant the id contract landed on main — PR #2686, squash `ed8e799e7`,
 *  merged 2026-08-09T03:47:46Z (`gh pr view 2686 --json mergedAt`).
 *
 *  An enforcement cutoff, not a decoration. Half the pre-contract corpus
 *  declares no id at all, and it could not have declared one: there was no
 *  contract to follow. Reporting those records would be a retroactive finding on
 *  every gate that reopens an old record, which is the "permanently red signal"
 *  failure again in a different shape. Records born at or after this instant
 *  were written under the contract and are reported — advisory, still never a
 *  block. */
export const NFR_ID_CONTRACT_LANDED = "2026-08-09T03:47:46Z";

/** The audit event that marks a record's birth. */
const BIRTH_EVENT = "WORKFLOW_STARTED";

/** How far up from an artifact the record root may be. A bound rather than an
 *  unbounded climb: without one, a run inside a nested checkout would walk into
 *  whatever workspace happens to sit above and read a stranger's record.
 *  `<record>/construction/<unit>/<stage>/<artifact>.md` is four levels; the
 *  slack covers degrade layouts and nested spaces. */
const RECORD_WALK_LIMIT = 8;

export function stageOfNfrArtifact(fileBasename: string): string | undefined {
  return NFR_ARTIFACT_STAGES.get(fileBasename);
}

// ---------------------------------------------------------------------------
// The id predicate — the machine reading of the stage ① contract
// ---------------------------------------------------------------------------

/** An NFR id, per the contract `nfr-requirements.md` states verbatim: "one or
 *  more uppercase-letter-led segments joined by `-`, ending on a segment that
 *  finishes in digits".
 *
 *  The FR predicate in amadeus-sensor-depth-budget.ts anchors on the literal
 *  `FR-` and then matches the rest. NFR ids have NO anchor token — ruling 6 on
 *  #2684 kept category-local prefixes (`SEC-1`, `REL-3`, `SCL-CP-2`) because an
 *  `NFR-` monopoly would retro-invalidate 98% of the corpus — so the anchor is
 *  replaced by the leading segment's own shape, and the rest of the pattern is
 *  the FR one. That is why the five positions below are the same five: the same
 *  skeleton with a different first token, not a second predicate invented from
 *  scratch.
 *
 *  Ending on digits is what separates an id from a category name: `SEC-AUTH` is
 *  a category (the contract says so), and the prose tokens the corpus already
 *  carries — `NFR-design`, `NFR-only`, `NFR-traceable` — fall out for the same
 *  reason. Requiring an uppercase LETTER first drops a date (`2026-08-09`)
 *  without needing to recognise dates. Letters may be fused onto the final
 *  digits (`SEC-A1`) as on the FR side, but only ahead of them: `SEC-1x` and
 *  `SEC-2b` are not ids of their own.
 *
 *  EVERY segment is uppercase-letter-led, which is what the contract says and
 *  is narrower than the FR pattern's `[A-Za-z0-9]+` middle. The looser form
 *  admits `SEC-lower-1`, `SEC-2-1` and `SEC-a1` — none of which the contract
 *  calls an id, and each of which would enter the denominator and understate
 *  bytes-per-NFR. Applying both forms to the corpus (708 nfr-requirements
 *  artifacts) drops 0 ids from 0 files, so this is the contract's own wording
 *  rather than a change to what the corpus measures. */
const NFR_ID = "([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-[A-Z]*[0-9]+)(?![A-Za-z0-9-])";

/** A plain list entry must reach a colon, optionally through one parenthesised
 *  gloss — the form the corpus titles them in, both ASCII and full-width. The
 *  colon is what marks a label, so a gloss may precede it but cannot stand in
 *  for it. Carried over unchanged from the FR predicate. */
const PLAIN_LIST_LABEL = "\\s*(?:[(（][^)）]*[)）])?\\s*[:：]";

const NFR_PATTERNS = [
  new RegExp(`^#{2,4}\\s+${NFR_ID}`),
  new RegExp(`^[-*]\\s+\\*\\*${NFR_ID}`),
  new RegExp(`^\\*\\*${NFR_ID}`),
  new RegExp(`^[-*]\\s+${NFR_ID}${PLAIN_LIST_LABEL}`),
  new RegExp(`^\\|\\s*\\*{0,2}${NFR_ID}`),
];

/** One id declaration event: the (0-based) line it was found on and the id
 *  itself. The single scan both countNfrIds/collectNfrIds (which id, how
 *  many distinct) and idBlocks (which line ranges) are derived from, so a
 *  future pattern addition to NFR_PATTERNS cannot land on one consumer and
 *  miss the other. */
function nfrIdDeclarations(body: string): Array<{ index: number; id: string }> {
  const events: Array<{ index: number; id: string }> = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trimStart();
    for (const pattern of NFR_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        events.push({ index: i, id: match[1] as string });
        break;
      }
    }
  }
  return events;
}

/** Distinct ids declared in one artifact body.
 *
 *  DISTINCT, so restating an id in a later cross-reference does not inflate the
 *  denominator — which would make an over-long document look proportionate.
 *  Naming an id outside the five positions is a reference, which is the
 *  contract's own wording. */
export function countNfrIds(body: string): number {
  return collectNfrIds(body).size;
}

/** The id SET, so a unit's total can be a union across its artifacts rather
 *  than a sum that double-counts an id declared in two of them. */
export function collectNfrIds(body: string): Set<string> {
  return new Set(nfrIdDeclarations(body).map((event) => event.id));
}

// ---------------------------------------------------------------------------
// The numeric-threshold predicate — #2684 stage ⑥, performance-requirements
// only (issue comment 5230806329, scoped by the stopping ruling in comment
// 5230769702)
// ---------------------------------------------------------------------------

/** The one artifact this check applies to. The same measurable-numeric
 *  predicate applied corpus-wide to every nfr-requirements artifact flagged
 *  performance at 126/302 = 41.7% and the other four at 72.0%-90.2%; a spot
 *  read of the flagged security/scalability/tech-stack samples confirmed
 *  those were NOT false positives ("does not retain the token", "adds zero
 *  new dependencies") — structurally qualitative requirements a numeric
 *  equality cannot hold against. Only performance carried a genuine gap
 *  between "declared an id" and "declared a measurable number", so the
 *  ruling scopes the check to this one artifact rather than all ten. */
export const PERFORMANCE_REQUIREMENTS_ARTIFACT = "performance-requirements";

/** A comparator token, optional: bare "180 ms" is as measurable as
 *  "≤180 ms". Japanese comparators the corpus writes NFR prose in are
 *  included alongside the ASCII/mathematical ones. */
const NUMERIC_COMPARATOR = "(?:<=|>=|[<>≤≥=]|以内|以下|以上|未満|超|約|最大|最小|上限|下限)?";

/** The value: digits, optionally grouped by one repeated separator (`.` or
 *  `,`) — "200", "1,000", "99.9". A bare digit run with no unit token right
 *  after it is not a threshold on its own (see NUMERIC_UNIT), which is what
 *  keeps an id's own digits, a heading number, or a date from satisfying this
 *  predicate by accident. */
const NUMERIC_VALUE = "[0-9]+(?:[.,][0-9]+)*";

/** A unit token immediately after the value (through optional whitespace),
 *  with a negative lookahead so the match does not run on into an unrelated
 *  word. Requiring this token IS the vacuity guard: an id's digits
 *  (`PERF-3`), a heading number (`3.2`), or a date (`2026-08-09`) are never
 *  followed by one of these, so none of the contract's own decorative
 *  vocabulary can masquerade as a measured threshold. */
const NUMERIC_UNIT =
  "(?:ms|msec|sec(?:s|onds?)?|s|mins?|minutes?|hrs?|hours?|h|days?|day|weeks?|week|months?|month|秒間?|分間?|時間|日間?|週間?|ヶ月|か月|パーセント|percent|%|KB|MB|GB|TB|bytes?|byte|req\\/s|rps|qps|tps|ops|fps|件|回|台|人|個|条件|同時)(?![A-Za-z])";

/** comparator? + value + unit, in that order — the full measurable-threshold
 *  shape. The whitespace between the parts is intra-line only ([ \t], not the
 *  \s that also matches a newline): a comparator/value/unit split across a
 *  line boundary (e.g. a value at the end of a table cell and a unit token
 *  that starts the next line) is not a threshold on that line, and letting
 *  \s bridge the boundary would misread it as one, hiding a genuinely missing
 *  threshold. Otherwise unchanged from the exploratory sweep the stopping
 *  ruling cites (issue comment 5230769702), which measured this exact pattern
 *  against the corpus and reported the 41.7% figure this predicate
 *  reproduces. */
const NUMERIC_THRESHOLD = new RegExp(`${NUMERIC_COMPARATOR}[ \\t]*${NUMERIC_VALUE}[ \\t]*${NUMERIC_UNIT}`);

/** One declared id's block: its declaration line through the line before the
 *  next declaration (of any id, in any of the five contract positions), or
 *  end of file for the last one. Sliced from the same declaration-event scan
 *  countNfrIds/collectNfrIds use (nfrIdDeclarations), not a second copy of
 *  it — the two consumers share the scan, not mutable state, so this does
 *  not reintroduce the shared-state coupling the original separation avoided. */
function idBlocks(body: string): Map<string, string> {
  const lines = body.split("\n");
  const events = nfrIdDeclarations(body);
  const blocks = new Map<string, string>();
  for (let e = 0; e < events.length; e += 1) {
    const event = events[e] as { index: number; id: string };
    const start = event.index;
    const end = e + 1 < events.length ? (events[e + 1] as { index: number }).index : lines.length;
    const text = lines.slice(start, end).join("\n");
    const prior = blocks.get(event.id);
    blocks.set(event.id, prior === undefined ? text : `${prior}\n${text}`);
  }
  return blocks;
}

/** Ids declared in a performance-requirements.md body whose block (see
 *  idBlocks) carries no measurable numeric threshold — the id was declared
 *  but never paired with an actual number. An id declared more than once is
 *  satisfied if ANY of its blocks carries one, mirroring the exploratory
 *  sweep's own per-id union rather than penalising a requirement whose
 *  number is stated only at a later restatement. Returned sorted for a
 *  deterministic findings order. */
export function idsMissingNumericThreshold(body: string): string[] {
  const missing: string[] = [];
  for (const [id, text] of idBlocks(body)) {
    if (!NUMERIC_THRESHOLD.test(text)) missing.push(id);
  }
  return missing.sort();
}

// ---------------------------------------------------------------------------
// Record birth — which side of the contract cutoff an artifact was written on
// ---------------------------------------------------------------------------

/** Read the earliest WORKFLOW_STARTED timestamp out of one audit shard.
 *
 *  The corpus carries TWO audit schema generations and they name the event
 *  differently: schemaVersion 1 puts it at the top level (`event`), while
 *  schemaVersion 2 nests it under `attributes.Event`. A predicate that knows a
 *  single idiom would read most of the corpus as birth-unknown.
 *
 *  A malformed line is skipped rather than fatal: audit shards are append-only
 *  and a torn final write must not erase the birth of an otherwise readable
 *  record. */
export function parseBirthTimestamp(shardText: string): string | undefined {
  let earliest: string | undefined;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const line of shardText.split("\n")) {
    const timestamp = birthTimestampOfLine(line);
    if (timestamp === undefined) continue;
    // Ordered as INSTANTS, not as strings: a shard mixing `…:46Z` with
    // `…:46.001Z` orders the two the wrong way round lexicographically.
    const ms = auditInstant(timestamp);
    if (ms === undefined || ms >= earliestMs) continue;
    earliest = timestamp;
    earliestMs = ms;
  }
  return earliest;
}

/** One shard line's birth timestamp, or undefined when the line is blank,
 *  malformed, or names another event. */
function birthTimestampOfLine(line: string): string | undefined {
  if (line.trim() === "") return undefined;
  let row: unknown;
  try {
    row = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (!isRecord(row)) return undefined;
  const attributes = isRecord(row.attributes) ? row.attributes : undefined;
  if ((row.event ?? attributes?.Event) !== BIRTH_EVENT) return undefined;
  const timestamp = row.timestamp;
  if (typeof timestamp !== "string" || auditInstant(timestamp) === undefined) return undefined;
  return timestamp;
}

/** The audit schema's UTC instant, as a shape to match its calendar fields
 *  against. */
const AUDIT_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

/** An audit timestamp as epoch milliseconds, or undefined when it is not one.
 *
 *  EVERY comparison of a birth goes through this rather than comparing the
 *  strings. Lexicographic order is not chronological order once fractional
 *  seconds are in play: `.` sorts below `Z`, so `…:46.001Z` reads as EARLIER
 *  than `…:46Z` — which would put a record born a millisecond after the cutoff
 *  on the pre-contract side, and would make "earliest across the shards" pick
 *  the wrong line whenever precisions are mixed.
 *
 *  Three checks, because each catches what the others let through: the shape
 *  rejects `"z"` (which would otherwise sort above every real timestamp),
 *  `Date.parse` rejects an impossible field (`2026-13-01`), and the round-trip
 *  rejects an out-of-range day — `Date.parse` ROLLS `2026-02-30` over into
 *  March rather than refusing it. A timestamp that fails any of them leaves the
 *  record birth-unknown, which is the fail-open side. */
export function auditInstant(raw: string): number | undefined {
  const fields = raw.match(AUDIT_TIMESTAMP);
  if (fields === null) return undefined;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return undefined;
  const parsed = new Date(ms);
  const sameDay =
    parsed.getUTCFullYear() === Number(fields[1]) &&
    parsed.getUTCMonth() + 1 === Number(fields[2]) &&
    parsed.getUTCDate() === Number(fields[3]);
  return sameDay ? ms : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The earliest WORKFLOW_STARTED across every audit shard of one record.
 *  Undefined when the record has no `audit/` directory or its shards carry no
 *  start event — both are reported as birth-unknown rather than guessed at. */
export function readRecordBirth(recordDir: string): string | undefined {
  const auditDir = join(recordDir, "audit");
  let earliest: string | undefined;
  for (const shard of auditShards(auditDir).sort()) {
    let text: string;
    try {
      text = readFileSync(join(auditDir, shard), "utf-8");
    } catch {
      continue;
    }
    const found = parseBirthTimestamp(text);
    if (found !== undefined && (earliest === undefined || found < earliest)) earliest = found;
  }
  return earliest;
}

/** Walk UP from an artifact to its record root, bounded. A record root is the
 *  directory carrying `amadeus-state.md` or an `audit/` directory — either one
 *  alone is enough, because 9 of the corpus's records carry no state file and
 *  2 carry no audit directory, and a predicate demanding both would drop them. */
export function resolveRecordRoot(outputPath: string): string | undefined {
  let dir = dirname(outputPath);
  for (let step = 0; step < RECORD_WALK_LIMIT; step += 1) {
    if (isRecordRoot(dir)) return dir;
    const parent = dirname(dir);
    // Stop at the filesystem root so a pathological input terminates.
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

/** Either marker alone is enough: 9 of the corpus's records carry no state file
 *  and 2 carry no audit directory, so demanding both would drop them.
 *
 *  The audit arm asks for a `.jsonl` SHARD rather than the bare directory. A
 *  directory named `audit` is not rare outside a workspace — macOS ships
 *  `/var/audit` — and the walk climbs past a temp directory into exactly that
 *  kind of neighbourhood, where a bare-name match would hand back a stranger's
 *  path as this artifact's record. */
function isRecordRoot(dir: string): boolean {
  if (isFile(join(dir, "amadeus-state.md"))) return true;
  return auditShards(join(dir, "audit")).length > 0;
}

function auditShards(auditDir: string): string[] {
  try {
    return readdirSync(auditDir).filter((name) => name.endsWith(".jsonl"));
  } catch {
    return [];
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Was this record born under the id contract? An unknown birth answers NO —
 *  fail-open, so an unreadable audit trail never lands a record in the reported
 *  cohort. */
export function bornUnderIdContract(birth: string | undefined): boolean {
  if (birth === undefined) return false;
  const ms = auditInstant(birth);
  // A birth that is not a readable instant is not evidence for either side.
  if (ms === undefined) return false;
  // Inclusive: a record born AT the landing instant was written under the
  // contract. Compared as instants — `…:46.001Z` is a millisecond after
  // `…:46Z` and sorts before it as a string.
  return ms >= CONTRACT_LANDED_MS;
}

/** The cutoff as an instant, resolved once. */
const CONTRACT_LANDED_MS = Date.parse(NFR_ID_CONTRACT_LANDED);

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

export interface NfrArtifactMeasurement {
  artifact: string;
  bytes: number;
  /** Nothing but whitespace. Distinct from `bytes === 0`: a stage that has
   *  written a newline has still written nothing. */
  blank: boolean;
  ids: Set<string>;
}

/** Measure one artifact, or report its absence. An unreadable path yields
 *  undefined so the caller distinguishes "no artifact" from a measurement of
 *  zero. */
export function measureNfrArtifact(path: string): NfrArtifactMeasurement | undefined {
  let body: string;
  try {
    body = readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
  return {
    artifact: basename(path, ".md"),
    bytes: Buffer.byteLength(body, "utf-8"),
    blank: body.trim() === "",
    ids: collectNfrIds(body),
  };
}

export interface NfrStageMeasurement {
  files: number;
  bytes: number;
  /** Distinct ids DECLARED by the measured artifacts. Zero for nfr-design by
   *  contract — that stage cites, it does not declare. */
  ids: Set<string>;
  /** Per-artifact bytes, in `artifacts` order for those that exist. Carried out
   *  of the one read so a caller wanting the per-artifact view does not read
   *  the same files a second time — a second read can also disagree with the
   *  first if the tree changes underneath it. */
  artifactBytes: number[];
}

/** Measure every artifact of one stage that exists in `stageDir`. Absent
 *  artifacts are skipped rather than counted as zero: the expected set cannot be
 *  reconstructed from disk (see the pruning note at the top). */
export function measureNfrStageDir(stageDir: string, artifacts: readonly string[]): NfrStageMeasurement {
  const out: NfrStageMeasurement = { files: 0, bytes: 0, ids: new Set<string>(), artifactBytes: [] };
  for (const name of artifacts) {
    const measured = measureNfrArtifact(join(stageDir, `${name}.md`));
    if (measured === undefined) continue;
    out.files += 1;
    out.bytes += measured.bytes;
    out.artifactBytes.push(measured.bytes);
    for (const id of measured.ids) out.ids.add(id);
  }
  return out;
}

/** The artifact set a stage slug measures. */
export function artifactsOfStage(stage: string): readonly string[] {
  return stage === NFR_REQUIREMENTS_STAGE_DIR ? NFR_REQUIREMENTS_ARTIFACTS : NFR_DESIGN_ARTIFACTS;
}

/** The directory a unit's ids are declared in, reached from either stage's
 *  directory: `<unit>/nfr-requirements` is a sibling of `<unit>/nfr-design`,
 *  and its own self. */
export function idDeclarationDir(stageDir: string): string {
  return basename(stageDir) === NFR_REQUIREMENTS_STAGE_DIR
    ? stageDir
    : join(dirname(stageDir), NFR_REQUIREMENTS_STAGE_DIR);
}

/** The unit's id count — the denominator both stages divide by. */
export function unitIdCount(stageDir: string): number {
  const declarationDir = idDeclarationDir(stageDir);
  if (!existsSync(declarationDir)) return 0;
  return measureNfrStageDir(declarationDir, NFR_REQUIREMENTS_ARTIFACTS).ids.size;
}

// ---------------------------------------------------------------------------
// Ceilings — Standard depth only (#2684 stage ③, ruling comment 5230416035)
// ---------------------------------------------------------------------------

/** Bytes per declared NFR id nfr-requirements's Standard-depth UNITS (D2,
 *  `unit_bytes_per_nfr`) may spend. Measured with this sensor's own predicate
 *  over every Standard-depth unit with at least one declared id — n=78, min
 *  299, median 657, max 2290. 1,200 sits inside that range, which is what
 *  makes it a detector rather than a verdict
 *  (cid:code-generation:c1-threshold-inside-observed-range): below the
 *  minimum it would flag every unit, above the maximum it would flag none.
 *  It sits above the median (roughly 1.8x) so it catches the tail rather than
 *  the middle, inside the 10-30% flag-rate band (925-1425 B/id) the sweep
 *  found for this stage, and flags 12/78 = 15.4% of the measured population.
 *
 *  A SEPARATE, independently-derived constant from nfr-design's, per
 *  cid:code-generation:c1-threshold-inside-observed-range's "水準ごとの規則" —
 *  landing on the same 1,200 as nfr-design (below) is coincidence, not a
 *  shared rule, and the two may move independently in a future ruling. */
export const NFR_REQUIREMENTS_STANDARD_BUDGET = 1200;

/** Bytes per declared NFR id nfr-design's Standard-depth units may spend — the
 *  same measurement as above, applied to nfr-design's own D2 figure. n=78,
 *  min 130, median 769, max 2553. 1,200 sits inside that range, above the
 *  median (roughly 1.6x), inside this stage's 10-30% band (975-1725 B/id),
 *  and flags 16/78 = 20.5% of the measured population.
 *
 *  Independently derived from nfr-requirements' constant above — see that
 *  constant's comment for why the two are not the same rule despite sharing
 *  a value today. */
export const NFR_DESIGN_STANDARD_BUDGET = 1200;

/** Minimal declares no ceiling yet: its Standard-depth sibling had 78 units to
 *  measure from, Minimal has 3 — too thin for a range a ceiling could sit
 *  inside without being either an accident of three data points or a
 *  permanently-red signal. Comprehensive declares no ceiling by the same
 *  convention depth-budget's DEPTH_BUDGETS.Comprehensive uses
 *  (stage-protocol.md §8). Both stay undefined here rather than an entry of
 *  Infinity, which would read as a threshold someone forgot to pick.
 *
 *  The ceiling for a stage at a depth, or undefined when this pair declares
 *  none. Depth is normalized through the depth-budget sensor's own
 *  `canonicalDepth`, so this and that sensor can never disagree about what
 *  "Standard" means. */
export function nfrStandardBudget(stage: string, level: string | undefined): number | undefined {
  if (level !== "Standard") return undefined;
  if (stage === NFR_REQUIREMENTS_STAGE_DIR) return NFR_REQUIREMENTS_STANDARD_BUDGET;
  if (stage === "nfr-design") return NFR_DESIGN_STANDARD_BUDGET;
  return undefined;
}

/** Does this unit's stage measurement exceed its Standard ceiling?
 *
 *  Compared on the EXACT total (`unitBytes > ceiling * unitIdCount`), not on
 *  the rounded per-id ratio — rounding first would let a sub-integer overrun
 *  slip under the ceiling, the same reasoning depth-budget's own comparison
 *  uses. A unit with no declared ids (`unitIdCount === 0`) has no denominator
 *  and is never flagged here: that unit is either fail-open (pre-contract) or
 *  already reported as `missing-nfr-ids` (post-contract) by the caller, and a
 *  zero-denominator comparison (`bytes > 0`) would flag every such unit on
 *  its first byte. THIS CHECK IS INDEPENDENT OF THE ID-CONTRACT CUTOFF — a
 *  unit written before the contract that nonetheless declares ids is measured
 *  exactly like one written after (ruling comment 5230416035: "超過 flag は
 *  cutoff と独立"). Measured against the live corpus, every Standard-depth
 *  unit with declared ids today predates the contract (it landed moments
 *  before this ruling), so the corpus sweep below is necessarily a sweep of
 *  pre-contract units — the ceiling could not otherwise be measured against
 *  anything yet. */
export function flagsNfrBudget(
  stage: string,
  level: string | undefined,
  unitBytes: number,
  unitNfrCount: number,
): boolean {
  if (unitNfrCount === 0) return false;
  const ceiling = nfrStandardBudget(stage, level);
  if (ceiling === undefined) return false;
  return unitBytes > ceiling * unitNfrCount;
}

export interface NfrBudgetFinding {
  field: string;
  reason: string;
}

export interface NfrBudgetResult {
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: NfrBudgetFinding[];
  /** This artifact. */
  bytes: number;
  declared_ids: number;
  /** The unit, for this artifact's stage. */
  unit_files: number;
  unit_bytes: number;
  unit_nfr_count: number;
  /** D1 — this artifact's share, a diagnostic for which category is the
   *  outlier. */
  bytes_per_nfr: number;
  /** D2 — the primary figure: the unit's bytes for this stage per declared
   *  requirement. */
  unit_bytes_per_nfr: number;
  record_birth: string | null;
  under_id_contract: boolean;
  /** #2684 stage ⑥ — count of ids THIS artifact declares with no measurable
   *  numeric threshold. Always 0 outside performance-requirements.md (the
   *  check's one scoped artifact — see PERFORMANCE_REQUIREMENTS_ARTIFACT). */
  missing_numeric_threshold_count: number;
}

const NONE = {
  bytes: 0,
  declared_ids: 0,
  unit_files: 0,
  unit_bytes: 0,
  unit_nfr_count: 0,
  bytes_per_nfr: 0,
  unit_bytes_per_nfr: 0,
  record_birth: null,
  under_id_contract: false,
  missing_numeric_threshold_count: 0,
};

function verdict(
  reason: string,
  findings: NfrBudgetFinding[],
  measured: Omit<NfrBudgetResult, "pass" | "findings_count" | "reason" | "findings">,
): NfrBudgetResult {
  return { pass: findings.length === 0, findings_count: findings.length, reason, findings, ...measured };
}

/** Ratio to report. Rounded for readability; the budget COMPARISON below uses
 *  the exact totals rather than this rounded figure (see flagsNfrBudget). A
 *  zero denominator reports 0 rather than Infinity — the id-absence finding is
 *  what says the denominator was missing. */
function ratio(bytes: number, count: number): number {
  return count === 0 ? 0 : Math.round(bytes / count);
}

/** Pure evaluation core (in-process test seam). Reads the files itself so the
 *  CLI entry stays a thin argv shim. `depth` is optional and, when absent or
 *  unrecognizable, simply measures with no ceiling applied — the sensor never
 *  guesses a level, matching the sibling depth-budget sensor. */
export function evaluateNfrBudget(outputPath: string, depth?: string): NfrBudgetResult {
  const stage = stageOfNfrArtifact(basename(outputPath));
  if (stage === undefined) return verdict("not-nfr-artifact", [], NONE);

  const measured = measureNfrArtifact(outputPath);
  if (measured === undefined) return verdict("no-file", [], NONE);
  // A file that exists but holds nothing is a stage mid-write, not a contract
  // violation — reporting it would fire on every artifact's first keystroke.
  // WHITESPACE counts as nothing, matching the sibling depth-budget sensor: a
  // file holding one newline has no ids because none have been written yet, and
  // reporting it as an unmet id contract would be the same false alarm.
  if (measured.blank) return verdict("empty", [], NONE);

  const stageDir = dirname(outputPath);
  const unit = measureNfrStageDir(stageDir, artifactsOfStage(stage));
  const unitNfrCount = unitIdCount(stageDir);
  const birth = recordBirthOf(outputPath);
  const underContract = bornUnderIdContract(birth);
  const level = canonicalDepth(depth);

  const figures = {
    bytes: measured.bytes,
    declared_ids: measured.ids.size,
    unit_files: unit.files,
    unit_bytes: unit.bytes,
    unit_nfr_count: unitNfrCount,
    bytes_per_nfr: ratio(measured.bytes, unitNfrCount),
    unit_bytes_per_nfr: ratio(unit.bytes, unitNfrCount),
    record_birth: birth ?? null,
    under_id_contract: underContract,
    missing_numeric_threshold_count: 0,
  };

  // The FIRST reported case: a unit written UNDER the contract that declares
  // no id at all. Without ids there is no denominator, so the volume cannot be
  // measured at all — and nothing downstream (nfr-design's tracing,
  // build-and-test's proportional selection, a reviewer checking that an
  // absence claim is falsifiable) can address the requirement by name.
  if (underContract && unitNfrCount === 0) {
    return verdict(
      "missing-nfr-ids",
      [
        {
          field: "nfr-ids",
          reason:
            "this unit's nfr-requirements artifacts declare no stable identifier — downstream stages and this measurement address requirements by those ids",
        },
      ],
      figures,
    );
  }

  // The SECOND reported case (#2684 stage ⑥, issue comment 5230806329, scope
  // narrowed by 5230769702): an id THIS artifact declares has no measurable
  // numeric threshold. Scoped to performance-requirements.md alone — the same
  // predicate applied corpus-wide flagged the other four nfr-requirements
  // artifacts at 72%-90%, all confirmed NOT false positives (structurally
  // qualitative requirements), so only performance carries a genuine gap.
  // Gated on the SAME id-contract cutoff as the first case above: a
  // pre-contract artifact could not have followed a contract that did not yet
  // exist, and this check reads the id declarations that contract fixed.
  // Only fires when THIS artifact itself declares at least one id — an
  // artifact with none either already returned missing-nfr-ids above (if the
  // unit's total is also zero) or has nothing here to check.
  if (
    underContract &&
    stage === NFR_REQUIREMENTS_STAGE_DIR &&
    basename(outputPath, ".md") === PERFORMANCE_REQUIREMENTS_ARTIFACT &&
    measured.ids.size > 0
  ) {
    const body = readFileSync(outputPath, "utf-8");
    const missingIds = idsMissingNumericThreshold(body);
    if (missingIds.length > 0) {
      return verdict(
        "missing-numeric-threshold",
        missingIds.map((id) => ({
          field: `nfr-id:${id}`,
          reason: `${id} has no measurable numeric threshold (comparator+value+unit) in its declaration`,
        })),
        { ...figures, missing_numeric_threshold_count: missingIds.length },
      );
    }
  }

  // The THIRD reported case: the unit's D2 figure (bytes for this stage over
  // its declared ids) exceeds the Standard ceiling. Checked on the UNIT'S
  // total (unit.bytes), not this artifact's own bytes — D2 is the primary
  // axis a ceiling is placed against (see the module header). Independent of
  // the id-contract cutoff above: a pre-contract unit that happens to declare
  // ids is measured exactly like a post-contract one (flagsNfrBudget's own
  // comment explains why).
  const ceiling = nfrStandardBudget(stage, level);
  if (ceiling !== undefined && flagsNfrBudget(stage, level, unit.bytes, unitNfrCount)) {
    return verdict(
      "nfr-budget-exceeded",
      [
        {
          field: "unit-bytes-per-nfr",
          reason: `this unit's ${unit.bytes} B of ${stage} artifacts over ${unitNfrCount} declared ids exceeds the ${level} guidance of ${ceiling} B per id`,
        },
      ],
      figures,
    );
  }

  return verdict("measured", [], figures);
}

/** Birth per record root, memoized.
 *
 *  A record's audit shards are append-only and can run to megabytes; a corpus
 *  sweep asks for the same record's birth once per artifact, which is up to ten
 *  times per unit. The sensor process is one-shot so the cache cannot go stale
 *  within its life, and the census that shares this module is read-only by
 *  construction. */
const birthByRoot = new Map<string, string | undefined>();

function recordBirthOf(outputPath: string): string | undefined {
  const root = resolveRecordRoot(outputPath);
  if (root === undefined) return undefined;
  const cached = birthByRoot.get(root);
  if (cached !== undefined || birthByRoot.has(root)) return cached;
  const birth = readRecordBirth(root);
  birthByRoot.set(root, birth);
  return birth;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Flags {
  stage?: string;
  outputPath?: string;
  depth?: string;
}

function parseFlags(argv: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--stage") out.stage = argv[++i];
    else if (argv[i] === "--output-path") out.outputPath = argv[++i];
    else if (argv[i] === "--depth") out.depth = argv[++i];
  }
  return out;
}

function fail(msg: string): never {
  process.stderr.write(`amadeus-sensor-nfr-budget: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every check outcome is stdout JSON with exit 0 (advisory contract).
 *  --depth is optional, matching depth-budget: an absent or unrecognizable
 *  value leaves the ceiling check fail-open rather than guessing a level. */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(`${JSON.stringify(evaluateNfrBudget(flags.outputPath, flags.depth))}\n`);
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
