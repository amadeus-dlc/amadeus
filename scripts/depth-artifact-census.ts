// depth-artifact-census.ts — the re-measurement harness behind #2425 AC-4.
//
// Issue #2425 closes on evidence, not on the sensor shipping: "re-measure the
// bytes of requirements.md / code-generation-plan.md on intents produced AFTER
// the depth-budget sensor landed, and show the depth groups separating". Both
// artifacts count; either one alone leaves AC-4 open.
//
// The ad-hoc shell pipelines that produced the sensor's own baseline numbers
// were never version-controlled, so the measurement could not be repeated,
// reviewed, or diffed. This script is that harness made durable.
//
// PREDICATES ARE IMPORTED, NOT RE-IMPLEMENTED. FR counting and depth
// normalization come from the sensor itself
// (packages/framework/core/tools/amadeus-sensor-depth-budget.ts). A census that
// re-derived them would drift from the thing it is meant to measure, and the
// two numbers would disagree with no way to tell which was right.
//
// READ-ONLY. This module must never import an fs write API: a measurement
// harness that could edit the corpus it measures is not a measurement.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEPTH_BUDGETS,
  canonicalDepth,
  countFunctionalRequirements,
  readRecordDepth,
} from "../packages/framework/core/tools/amadeus-sensor-depth-budget";
import {
  NFR_DESIGN_ARTIFACTS,
  NFR_REQUIREMENTS_ARTIFACTS,
  measureNfrStageDir,
  parseBirthTimestamp,
  readRecordBirth,
  unitIdCount,
} from "../packages/framework/core/tools/amadeus-sensor-nfr-budget";

// Re-exported because this module owned the birth predicate before the NFR
// sensor needed the same one at a gate. The definition moved to the sensor
// rather than being copied, so a census cohort and a gate finding cannot
// disagree about when a record was born.
export { parseBirthTimestamp };

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");

/** The audit event that marks an intent's birth. Named here for the census
 *  predicate block; the reader lives in the NFR sensor. */
const BIRTH_EVENT = "WORKFLOW_STARTED";

/** The group an artifact is counted under. The three canonical depth levels
 *  plus an explicit `unknown` — a record whose Depth cannot be resolved is
 *  reported as such rather than dropped, so the group counts always re-add to
 *  the corpus size. */
export type DepthGroup = "Minimal" | "Standard" | "Comprehensive" | "unknown";

export const DEPTH_GROUPS: readonly DepthGroup[] = ["Minimal", "Standard", "Comprehensive", "unknown"];

/** Normalize a record's raw Depth to its census group. Delegates the
 *  normalization itself to the sensor so the census and the sensor can never
 *  disagree about what "Standard" means. */
export function depthGroupOf(raw: string | undefined | null): DepthGroup {
  return (canonicalDepth(raw) as DepthGroup | undefined) ?? "unknown";
}

/** Which side of the `--since` cutoff a record falls on.
 *
 *  `all` is the no-cutoff case. `unknown` is its own class on purpose: a record
 *  whose birth cannot be read is evidence for NEITHER side, and quietly folding
 *  it into `pre` would understate the post-landing population while folding it
 *  into `post` would fabricate re-measurement samples. */
export type BirthClass = "all" | "post" | "pre" | "unknown";

export function classifyBirth(birth: string | undefined, since: string | undefined): BirthClass {
  if (since === undefined) return "all";
  if (birth === undefined) return "unknown";
  // Inclusive lower bound: an intent born at the landing instant was produced
  // under the sensor, so it belongs to the population the sensor is measured on.
  return birth >= since ? "post" : "pre";
}

/** Does this requirements.md exceed its depth's byte-per-FR ceiling?
 *
 *  Comprehensive declares no ceiling and `unknown` has no level to look one up
 *  by; neither can be flagged. The comparison is `bytes > ceiling * frCount` —
 *  exactly as the sensor does it — rather than a comparison on the rounded
 *  per-FR figure, which would let 18,001 B over 10 FRs report as 1800 and slip
 *  under an 1800 ceiling. */
export function flagsRequirement(group: DepthGroup, bytes: number, frCount: number): boolean {
  if (frCount === 0) return false;
  const ceiling = DEPTH_BUDGETS[group];
  if (ceiling === undefined) return false;
  return bytes > ceiling * frCount;
}

export type Args =
  | { kind: "ok"; since: string | undefined; json: boolean }
  | { kind: "error"; reason: string };

/** Fail-closed argv parse. An unrecognized flag or an unparsable `--since` is a
 *  loud error, never a silent default: a cutoff that failed to parse would still
 *  compare lexicographically against real timestamps and split the corpus at an
 *  arbitrary point, reporting a confident population that means nothing. */
export function parseArgs(argv: readonly string[]): Args {
  let since: string | undefined;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--json") {
      json = true;
    } else if (flag === "--since") {
      const value = argv[++i];
      if (value === undefined) return { kind: "error", reason: "--since requires an ISO 8601 timestamp" };
      if (Number.isNaN(Date.parse(value))) {
        return { kind: "error", reason: `--since ${JSON.stringify(value)} is not a parsable ISO 8601 timestamp` };
      }
      since = value;
    } else {
      return { kind: "error", reason: `unknown argument ${JSON.stringify(flag)}` };
    }
  }
  return { kind: "ok", since, json };
}

/** A sample's shape, reported per depth group. */
export interface Distribution {
  n: number;
  min: number;
  p25: number;
  median: number;
  max: number;
}

/** Nearest rank, no interpolation: the smallest sample whose rank covers `q` of
 *  the set, i.e. sorted[ceil(q * n) - 1] — the same convention as
 *  tests/lib/percentile.ts. Interpolating would report a byte count no artifact
 *  actually has.
 *
 *  RECONCILIATION WITH THE SENSOR'S PUBLISHED BASELINE. The figures in
 *  amadeus-sensor-depth-budget.ts (Minimal n=72 p25 1587 median 1930; Standard
 *  n=52 p25 1256 median 1654) came from an ad-hoc shell pipeline that was never
 *  committed, and it did NOT use one convention throughout — which is a large
 *  part of why this harness exists. Reconstructing that exact population (the
 *  corpus minus the single requirements.md added after the sensor landed) and
 *  replaying four conventions over it identifies the pair it used:
 *
 *    p25    = sorted[floor(q * n)]        — reproduces 1587 and 1256 exactly
 *    median = mean of the two middles     — reproduces 1930, and 1653.5 -> 1654
 *
 *  Nearest rank therefore reads slightly LOWER than the published p25 (it picks
 *  the rank below) and lower than the published median on an even sample. On
 *  the reconstructed baseline: Minimal p25 1576 vs 1587, median 1915 vs 1930;
 *  Standard p25 1246 vs 1256, median 1631 vs 1654. n, min and max agree exactly
 *  at both levels, which is what confirms the population is the same one.
 *
 *  The published pair is not reproduced here on purpose: mixing a rank pick for
 *  one quantile with an interpolated average for another is the defect, not the
 *  contract. The comparison this harness exists to serve — Minimal against
 *  Standard within a cohort — uses one convention on both sides and is
 *  unaffected by the choice. */
function nearestRank(sorted: readonly number[], q: number): number {
  return sorted[Math.ceil(sorted.length * q) - 1] as number;
}

/** Summarize a sample, or report its absence.
 *
 *  An empty sample returns undefined rather than a distribution of NaNs: a
 *  depth group with no artifacts is a fact about the corpus, and rendering it
 *  as `NaN B` would read as a broken measurement instead of an empty one. */
export function summarize(values: readonly number[]): Distribution | undefined {
  if (values.length === 0) return undefined;
  // Copy before sorting — the caller's array is theirs. The numeric comparator
  // is required: Array#sort defaults to lexicographic, which ranks 100 below 9.
  const sorted = [...values].sort((left, right) => left - right);
  return {
    n: sorted.length,
    min: sorted[0] as number,
    p25: nearestRank(sorted, 0.25),
    median: nearestRank(sorted, 0.5),
    max: sorted[sorted.length - 1] as number,
  };
}

// ---------------------------------------------------------------------------
// Corpus discovery
// ---------------------------------------------------------------------------

/** Where the records live, relative to the workspace root. */
export const INTENTS_SUBDIR = join("amadeus", "spaces", "default", "intents");

/** requirements.md sits at this path inside a record. */
export const REQUIREMENTS_RELPATH = join("inception", "requirements-analysis", "requirements.md");

/** code-generation-plan.md sits at this path inside a record, once per UNIT —
 *  `construction/<unit>/code-generation/code-generation-plan.md`. */
export const CONSTRUCTION_SUBDIR = "construction";
export const PLAN_RELPATH = join("code-generation", "code-generation-plan.md");

/** A record directory is named `<YYMMDD>-<slug>`. Verified against the live
 *  corpus: 146 of 147 entries match, and the single non-match is
 *  `amadeus/spaces/default/intents/audit/` — a stray shard directory holding
 *  `*.jsonl` files directly, not an intent. Counting it would add a phantom
 *  record with no state, no artifacts and no birth to every population.
 *
 *  Presence of `amadeus-state.md` was rejected as the predicate: only 137 of
 *  the 146 real records carry one, so it would silently drop 9 genuine records
 *  — exactly the ones the unknown-depth group exists to surface. */
export const RECORD_DIR_PATTERN = /^[0-9]{6}-/;

/** List the record directories under an intents dir, sorted for determinism.
 *  A missing directory yields no records rather than throwing: a workspace that
 *  has never run a workflow is empty, not broken. */
export function listIntentRecords(intentsDir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(intentsDir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => RECORD_DIR_PATTERN.test(name))
    .filter((name) => isDirectory(join(intentsDir, name)))
    .sort();
}

/** What the record predicate rejected, reported so the exclusion is auditable
 *  rather than implicit. Shares listIntentRecords' tolerance of an absent
 *  directory: a workspace that never ran a workflow excludes nothing. */
export function listExcludedEntries(intentsDir: string): string[] {
  try {
    return readdirSync(intentsDir)
      .filter((name) => !RECORD_DIR_PATTERN.test(name))
      .sort();
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** The earliest WORKFLOW_STARTED across every audit shard of one record.
 *
 *  Undefined has two live causes and both are reported as birth-unknown rather
 *  than guessed at: a record with no `audit/` directory (measured: 2 in the live
 *  corpus) and a record whose shards carry no start event. */
export function readBirth(recordDir: string): string | undefined {
  return readRecordBirth(recordDir);
}

/** The two NFR stages, and the artifact set each produces. Imported from the
 *  sensor so the census measures exactly the files a gate would. */
export const NFR_STAGES = [
  { stage: "nfr-requirements", artifacts: NFR_REQUIREMENTS_ARTIFACTS },
  { stage: "nfr-design", artifacts: NFR_DESIGN_ARTIFACTS },
] as const;

export type NfrStage = (typeof NFR_STAGES)[number]["stage"];

/** One unit's worth of NFR measurement, for one stage.
 *
 *  `idCount` is the UNIT's denominator — the distinct ids its nfr-requirements
 *  artifacts declare — so both stages of the same unit divide by the same
 *  number. nfr-design cites ids rather than declaring them, so an in-file count
 *  there would be zero for every design artifact ever written. */
export interface NfrUnitMeasurement {
  record: string;
  unit: string;
  stage: NfrStage;
  depth: DepthGroup;
  files: number;
  bytes: number;
  idCount: number;
  /** Per-artifact bytes, for the D1 diagnostic. */
  artifactBytes: number[];
}

/** The unit directories of one record that carry a code-generation plan. */
function listPlanUnits(recordDir: string): string[] {
  const constructionDir = join(recordDir, CONSTRUCTION_SUBDIR);
  let entries: string[];
  try {
    entries = readdirSync(constructionDir);
  } catch {
    return [];
  }
  return entries.filter((unit) => existsSync(join(constructionDir, unit, PLAN_RELPATH))).sort();
}

// ---------------------------------------------------------------------------
// Census
// ---------------------------------------------------------------------------

/** One record's worth of raw measurement, before grouping. Kept separate from
 *  the aggregation so the fs walk happens exactly once even when `--since`
 *  splits the corpus into cohorts. */
export interface RecordMeasurement {
  record: string;
  depth: DepthGroup;
  birth: string | undefined;
  /** Absent when the record has no requirements.md. */
  requirements?: { bytes: number; frCount: number; flagged: boolean };
  /** One entry per unit carrying a plan; empty when the record has none. */
  planBytes: number[];
  /** One entry per unit × NFR stage that produced anything. */
  nfr: NfrUnitMeasurement[];
}

/** Per-depth-group requirements figures.
 *
 *  `bytesPerFr` is the headline: bytes of requirements.md per numbered FR, the
 *  quantity the depth budget is expressed in. Artifacts carrying no `FR-n` id
 *  have no denominator, so they are counted in `noNumberedFrs` and excluded
 *  from the distribution rather than folded in as zero — which would drag every
 *  median toward nothing. */
export interface RequirementsGroup {
  files: number;
  noNumberedFrs: number;
  flagged: number;
  /** Share of measurable files over the ceiling; null when nothing measurable. */
  flagRate: number | null;
  bytesPerFr?: Distribution;
  bytes?: Distribution;
  frCount?: Distribution;
}

/** Per-depth-group plan figures.
 *
 *  code-generation-plan.md carries no `FR-n` denominator, so bytes are reported
 *  raw. Both views are kept: `perFile` is the unit-level distribution, and
 *  `perIntent` sums a record's units — a record with six units is one intent's
 *  worth of planning however it was split, and neither view is derivable from
 *  the other. */
export interface PlansCensus {
  perFile: Partial<Record<DepthGroup, Distribution>>;
  perIntent: Partial<Record<DepthGroup, Distribution>>;
  fileCount: number;
  intentCount: number;
}

export interface RequirementsCensus {
  groups: Partial<Record<DepthGroup, RequirementsGroup>>;
  fileCount: number;
}

/** Per-depth-group NFR figures for one stage.
 *
 *  `bytesPerNfr` is the headline (D2): the unit's bytes for this stage over the
 *  unit's declared id count. `artifactBytesPerNfr` is the same denominator
 *  applied to one artifact (D1) — a diagnostic for which category of a unit is
 *  the outlier, not a second denominator.
 *
 *  A unit declaring no id has no denominator, so it is counted in
 *  `unitsWithoutIds` and excluded from both distributions rather than folded in
 *  as zero, which would drag every median toward nothing. */
export interface NfrGroup {
  units: number;
  files: number;
  unitsWithoutIds: number;
  bytesPerNfr?: Distribution;
  artifactBytesPerNfr?: Distribution;
  unitBytes?: Distribution;
  idCount?: Distribution;
}

export interface NfrStageCensus {
  groups: Partial<Record<DepthGroup, NfrGroup>>;
  unitCount: number;
  fileCount: number;
}

export type NfrCensus = Record<NfrStage, NfrStageCensus>;

export interface CohortCensus {
  cohort: BirthClass;
  recordCount: number;
  requirements: RequirementsCensus;
  plans: PlansCensus;
  nfr: NfrCensus;
}

export interface Census {
  predicate: {
    intentsDir: string;
    recordDirPattern: string;
    excludedEntries: string[];
    requirementsGlob: string;
    plansGlob: string;
    nfrGlob: string;
    nfrDenominator: string;
    birthEvent: string;
    birthEventIdioms: string[];
    quantileMethod: string;
    depthBudgets: Record<string, number | undefined>;
  };
  since: string | undefined;
  recordCount: number;
  cohorts: CohortCensus[];
}

/** Measure one record. Depth is resolved through the sensor's own walk, from
 *  the record's state file — verified against the corpus, where no state file
 *  exists below record level, so this is the same answer the sensor reaches
 *  from any artifact inside the record. */
function measureRecord(intentsDir: string, record: string, projectDir: string): RecordMeasurement {
  const recordDir = join(intentsDir, record);
  const depth = depthGroupOf(readRecordDepth(join(recordDir, "amadeus-state.md"), projectDir));

  const measurement: RecordMeasurement = {
    record,
    depth,
    birth: readBirth(recordDir),
    planBytes: listPlanUnits(recordDir).map((unit) =>
      byteLengthOf(join(recordDir, CONSTRUCTION_SUBDIR, unit, PLAN_RELPATH)),
    ),
    nfr: measureNfrUnits(recordDir, record, depth),
  };
  const requirements = measureRequirements(join(recordDir, REQUIREMENTS_RELPATH), depth);
  if (requirements !== undefined) measurement.requirements = requirements;
  return measurement;
}

/** Measure one record's requirements.md, or report its absence.
 *
 *  A record with no requirements.md is a normal state (the stage may not have
 *  run), so an unreadable path terminates in `undefined` rather than falling
 *  through — the caller distinguishes "no artifact" from a measurement, and the
 *  census counts only files that exist. */
function measureRequirements(
  path: string,
  depth: DepthGroup,
): { bytes: number; frCount: number; flagged: boolean } | undefined {
  let body: string;
  try {
    body = readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
  const bytes = Buffer.byteLength(body, "utf-8");
  const frCount = countFunctionalRequirements(body);
  return { bytes, frCount, flagged: flagsRequirement(depth, bytes, frCount) };
}

/** Every unit × NFR stage of one record that produced at least one artifact.
 *
 *  Units come from the construction directory rather than from a resolved kind:
 *  `produces_kinds` pruning cannot be reconstructed from disk (130 of the
 *  corpus's 142 nfr-requirements units belong to units whose kind is
 *  unresolvable from the committed unit-of-work-dependency.md, and the engine's
 *  kindless fallback hands those every declared artifact). So the census
 *  measures what EXISTS and never assumes an expected set — the same choice the
 *  sensor makes, for the same reason. */
function measureNfrUnits(recordDir: string, record: string, depth: DepthGroup): NfrUnitMeasurement[] {
  const constructionDir = join(recordDir, CONSTRUCTION_SUBDIR);
  let units: string[];
  try {
    units = readdirSync(constructionDir).sort();
  } catch {
    return [];
  }
  const out: NfrUnitMeasurement[] = [];
  for (const unit of units) {
    for (const { stage, artifacts } of NFR_STAGES) {
      const stageDir = join(constructionDir, unit, stage);
      if (!existsSync(stageDir)) continue;
      const measured = measureNfrStageDir(stageDir, artifacts);
      if (measured.files === 0) continue;
      out.push({
        record,
        unit,
        stage,
        depth,
        files: measured.files,
        bytes: measured.bytes,
        idCount: unitIdCount(stageDir),
        // Carried out of the same measurement rather than re-read: a second
        // pass can disagree with the first if the tree changes underneath it.
        artifactBytes: measured.artifactBytes,
      });
    }
  }
  return out;
}

function byteLengthOf(path: string): number {
  return Buffer.byteLength(readFileSync(path, "utf-8"), "utf-8");
}

/** Aggregate a set of already-measured records into one cohort's census. The two
 *  artifacts are aggregated separately: they share the depth grouping but
 *  nothing else — requirements.md divides by an FR denominator that
 *  code-generation-plan.md has no equivalent of. */
export function aggregate(cohort: BirthClass, measurements: readonly RecordMeasurement[]): CohortCensus {
  return {
    cohort,
    recordCount: measurements.length,
    requirements: aggregateRequirements(measurements),
    plans: aggregatePlans(measurements),
    nfr: aggregateNfr(measurements.flatMap((m) => m.nfr)),
  };
}

/** Aggregate NFR unit measurements into per-stage, per-depth distributions.
 *
 *  Takes the flat unit list rather than records so the pure aggregation is
 *  drivable in-process from literal fixtures — `bun --coverage` does not
 *  instrument a subprocess, so a fs-only seam would leave this unmeasured. */
export function aggregateNfr(units: readonly NfrUnitMeasurement[]): NfrCensus {
  const out = {} as NfrCensus;
  for (const { stage } of NFR_STAGES) out[stage] = aggregateNfrStage(units.filter((u) => u.stage === stage));
  return out;
}

function aggregateNfrStage(units: readonly NfrUnitMeasurement[]): NfrStageCensus {
  const perUnit = new Buckets();
  const perArtifact = new Buckets();
  const unitBytes = new Buckets();
  const idCounts = new Buckets();
  const groups = new Map<DepthGroup, NfrGroup>();
  let fileCount = 0;

  for (const u of units) {
    fileCount += u.files;
    const group = upsertNfrGroup(groups, u.depth);
    group.units += 1;
    group.files += u.files;
    unitBytes.push(u.depth, u.bytes);
    idCounts.push(u.depth, u.idCount);
    if (u.idCount === 0) {
      group.unitsWithoutIds += 1;
      continue;
    }
    perUnit.push(u.depth, Math.round(u.bytes / u.idCount));
    for (const bytes of u.artifactBytes) perArtifact.push(u.depth, Math.round(bytes / u.idCount));
  }

  const out: Partial<Record<DepthGroup, NfrGroup>> = {};
  for (const depth of DEPTH_GROUPS) {
    const group = groups.get(depth);
    if (group === undefined) continue;
    group.bytesPerNfr = perUnit.summarize(depth);
    group.artifactBytesPerNfr = perArtifact.summarize(depth);
    group.unitBytes = unitBytes.summarize(depth);
    group.idCount = idCounts.summarize(depth);
    out[depth] = group;
  }
  return { groups: out, unitCount: units.length, fileCount };
}

function upsertNfrGroup(groups: Map<DepthGroup, NfrGroup>, depth: DepthGroup): NfrGroup {
  const existing = groups.get(depth);
  if (existing !== undefined) return existing;
  const fresh: NfrGroup = { units: 0, files: 0, unitsWithoutIds: 0 };
  groups.set(depth, fresh);
  return fresh;
}

export function aggregateRequirements(measurements: readonly RecordMeasurement[]): RequirementsCensus {
  const perFr = new Buckets();
  const bytes = new Buckets();
  const frCounts = new Buckets();
  const groups = new Map<DepthGroup, RequirementsGroup>();
  let fileCount = 0;

  for (const m of measurements) {
    const measured = m.requirements;
    if (measured === undefined) continue;
    fileCount++;
    const group = upsertGroup(groups, m.depth);
    group.files++;
    bytes.push(m.depth, measured.bytes);
    frCounts.push(m.depth, measured.frCount);
    // No FR ids means no denominator. Counting such a file as 0 B/FR would drag
    // the group's median toward nothing, so it is tallied apart instead.
    if (measured.frCount === 0) {
      group.noNumberedFrs++;
      continue;
    }
    perFr.push(m.depth, Math.round(measured.bytes / measured.frCount));
    if (measured.flagged) group.flagged++;
  }

  const out: Partial<Record<DepthGroup, RequirementsGroup>> = {};
  for (const depth of DEPTH_GROUPS) {
    const group = groups.get(depth);
    if (group === undefined) continue;
    const measurable = group.files - group.noNumberedFrs;
    group.flagRate = measurable === 0 ? null : group.flagged / measurable;
    group.bytesPerFr = perFr.summarize(depth);
    group.bytes = bytes.summarize(depth);
    group.frCount = frCounts.summarize(depth);
    out[depth] = group;
  }
  return { groups: out, fileCount };
}

export function aggregatePlans(measurements: readonly RecordMeasurement[]): PlansCensus {
  const perFile = new Buckets();
  const perIntent = new Buckets();
  let fileCount = 0;
  let intentCount = 0;

  for (const m of measurements) {
    if (m.planBytes.length === 0) continue;
    intentCount++;
    fileCount += m.planBytes.length;
    for (const bytes of m.planBytes) perFile.push(m.depth, bytes);
    perIntent.push(
      m.depth,
      m.planBytes.reduce((total, bytes) => total + bytes, 0),
    );
  }
  return {
    perFile: perFile.summarizeAll(),
    perIntent: perIntent.summarizeAll(),
    fileCount,
    intentCount,
  };
}

function upsertGroup(groups: Map<DepthGroup, RequirementsGroup>, depth: DepthGroup): RequirementsGroup {
  const existing = groups.get(depth);
  if (existing !== undefined) return existing;
  const fresh: RequirementsGroup = { files: 0, noNumberedFrs: 0, flagged: 0, flagRate: null };
  groups.set(depth, fresh);
  return fresh;
}

/** Samples collected per depth group. A first-class collection so the
 *  push/summarize pair lives in one place instead of being re-spelled at each
 *  of the five call sites. */
class Buckets {
  private readonly byDepth = new Map<DepthGroup, number[]>();

  push(depth: DepthGroup, value: number): void {
    const bucket = this.byDepth.get(depth);
    if (bucket === undefined) this.byDepth.set(depth, [value]);
    else bucket.push(value);
  }

  summarize(depth: DepthGroup): Distribution | undefined {
    return summarize(this.byDepth.get(depth) ?? []);
  }

  summarizeAll(): Partial<Record<DepthGroup, Distribution>> {
    const out: Partial<Record<DepthGroup, Distribution>> = {};
    for (const depth of DEPTH_GROUPS) {
      const d = this.summarize(depth);
      if (d !== undefined) out[depth] = d;
    }
    return out;
  }
}

/** Walk a workspace and produce its census.
 *
 *  Without `--since` there is one cohort holding the whole corpus. With one,
 *  the corpus splits into post / pre / unknown — three DISJOINT cohorts whose
 *  record counts re-add to the whole, so nothing is dropped on the way to the
 *  post-landing sample. */
export function collectCensus(projectDir: string, since: string | undefined): Census {
  const intentsDir = join(projectDir, INTENTS_SUBDIR);
  const records = listIntentRecords(intentsDir);
  const measurements = records.map((record) => measureRecord(intentsDir, record, projectDir));

  const cohorts: CohortCensus[] =
    since === undefined
      ? [aggregate("all", measurements)]
      : (["post", "pre", "unknown"] as const).map((cohort) =>
          aggregate(
            cohort,
            measurements.filter((m) => classifyBirth(m.birth, since) === cohort),
          ),
        );

  return {
    predicate: {
      intentsDir: INTENTS_SUBDIR,
      recordDirPattern: RECORD_DIR_PATTERN.source,
      excludedEntries: listExcludedEntries(intentsDir),
      requirementsGlob: join(INTENTS_SUBDIR, "*", REQUIREMENTS_RELPATH),
      plansGlob: join(INTENTS_SUBDIR, "*", CONSTRUCTION_SUBDIR, "*", PLAN_RELPATH),
      nfrGlob: join(INTENTS_SUBDIR, "*", CONSTRUCTION_SUBDIR, "*", "nfr-{requirements,design}", "*.md"),
      nfrDenominator:
        "distinct ids declared by the unit's nfr-requirements artifacts (amadeus-sensor-nfr-budget countNfrIds)",
      birthEvent: BIRTH_EVENT,
      birthEventIdioms: ["schemaVersion 1: .event", "schemaVersion 2: .attributes.Event"],
      quantileMethod: "nearest rank, sorted[ceil(q*n)-1], no interpolation",
      depthBudgets: DEPTH_BUDGETS,
    },
    since,
    recordCount: measurements.length,
    cohorts,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function num(value: number): string {
  return value.toLocaleString("en-US");
}

function dist(d: Distribution | undefined): string {
  if (d === undefined) return "       -        -        -        -        -";
  return [d.n, d.min, d.p25, d.median, d.max].map((v) => num(v).padStart(8)).join(" ");
}

const DIST_HEADER = "       n      min      p25   median      max";

export function renderTable(census: Census): string {
  const lines: string[] = [];
  lines.push("depth artifact census — #2425 AC-4 re-measurement");
  lines.push("");
  lines.push(`  corpus            ${census.predicate.requirementsGlob}`);
  lines.push(`                    ${census.predicate.plansGlob}`);
  lines.push(`                    ${census.predicate.nfrGlob}`);
  lines.push(`  NFR denominator   ${census.predicate.nfrDenominator}`);
  lines.push(`  record predicate  dirname matches /${census.predicate.recordDirPattern}/`);
  lines.push(`  excluded entries  ${census.predicate.excludedEntries.join(", ") || "(none)"}`);
  lines.push(`  birth event       ${census.predicate.birthEvent} (${census.predicate.birthEventIdioms.join(" | ")})`);
  lines.push(`  quantiles         ${census.predicate.quantileMethod}`);
  lines.push(`  records           ${num(census.recordCount)}`);
  lines.push(`  --since           ${census.since ?? "(whole corpus)"}`);

  for (const cohort of census.cohorts) lines.push(...renderCohort(cohort));
  return `${lines.join("\n")}\n`;
}

/** One cohort's blocks: the two #2425 artifacts, then each NFR stage. */
function renderCohort(cohort: CohortCensus): string[] {
  const lines: string[] = ["", `cohort ${cohort.cohort} — ${num(cohort.recordCount)} records`, ""];
  lines.push(`  requirements.md — B/FR (${num(cohort.requirements.fileCount)} files)`);
  lines.push(`    depth         ${DIST_HEADER}   flagged  no-FRs`);
  for (const depth of DEPTH_GROUPS) {
    const group = cohort.requirements.groups[depth];
    if (group === undefined) continue;
    const rate = group.flagRate === null ? "    -" : `${(group.flagRate * 100).toFixed(0).padStart(3)}%`;
    const flagged = `${num(group.flagged).padStart(4)}/${rate}`;
    lines.push(`    ${depth.padEnd(14)}${dist(group.bytesPerFr)}  ${flagged}  ${num(group.noNumberedFrs).padStart(6)}`);
  }
  lines.push("");
  lines.push(
    `  code-generation-plan.md — bytes per file (${num(cohort.plans.fileCount)} files across ${num(cohort.plans.intentCount)} intents)`,
  );
  lines.push(...distRows(cohort.plans.perFile));
  lines.push("");
  lines.push("  code-generation-plan.md — bytes per intent (units summed)");
  lines.push(...distRows(cohort.plans.perIntent));
  for (const { stage } of NFR_STAGES) lines.push(...renderNfrStage(stage, cohort.nfr[stage]));
  return lines;
}

/** A header plus one row per depth group that has a distribution. */
function distRows(byDepth: Partial<Record<DepthGroup, Distribution>>): string[] {
  const lines = [`    depth         ${DIST_HEADER}`];
  for (const depth of DEPTH_GROUPS) {
    const d = byDepth[depth];
    if (d === undefined) continue;
    lines.push(`    ${depth.padEnd(14)}${dist(d)}`);
  }
  return lines;
}

/** One NFR stage's block: the unit figure (D2) that a ceiling would be placed
 *  against, then the per-artifact diagnostic (D1). */
function renderNfrStage(stage: NfrStage, census: NfrStageCensus): string[] {
  const lines: string[] = [""];
  lines.push(
    `  ${stage} — B per declared NFR id, per unit (${num(census.unitCount)} units, ${num(census.fileCount)} files)`,
  );
  lines.push(`    depth         ${DIST_HEADER}  no-ids/units`);
  for (const depth of DEPTH_GROUPS) {
    const group = census.groups[depth];
    if (group === undefined) continue;
    const absent = `${num(group.unitsWithoutIds).padStart(6)}/${num(group.units).padStart(5)}`;
    lines.push(`    ${depth.padEnd(14)}${dist(group.bytesPerNfr)}  ${absent}`);
  }
  lines.push("");
  lines.push(`  ${stage} — B per declared NFR id, per artifact (diagnostic)`);
  lines.push(...distRows(mapGroups(census, (group) => group.artifactBytesPerNfr)));
  return lines;
}

function mapGroups(
  census: NfrStageCensus,
  pick: (group: NfrGroup) => Distribution | undefined,
): Partial<Record<DepthGroup, Distribution>> {
  const out: Partial<Record<DepthGroup, Distribution>> = {};
  for (const depth of DEPTH_GROUPS) {
    const group = census.groups[depth];
    if (group === undefined) continue;
    const d = pick(group);
    if (d !== undefined) out[depth] = d;
  }
  return out;
}

/** CLI entry / in-process test seam. Returns the exit code rather than calling
 *  process.exit so tests can drive it in-process — bun --coverage does not
 *  instrument subprocesses, so a spawn-only seam would leave this unmeasured. */
export function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  if (args.kind === "error") {
    process.stderr.write(`depth-artifact-census: ${args.reason}\n`);
    return 1;
  }
  const root = process.env.AMADEUS_CENSUS_ROOT ?? ROOT;
  const census = collectCensus(root, args.since);
  process.stdout.write(args.json ? `${JSON.stringify(census, null, 2)}\n` : renderTable(census));
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
