// depth-budget sensor — the advisory measurement behind `brief` (#2425).
//
// The depth mechanism now reaches the stage (`directive.depth`) and the stage
// contracts state a per-depth volume, but "brief descriptions" had no number
// attached, so nothing could tell an over-long artifact from a proportionate
// one. Measured across 31 self-* intents, requirements.md spanned 5,382 B to
// 61,333 B — an 11x spread uncorrelated with implementation size (r = +0.084)
// — with Minimal's median (16,768 B) ABOVE Standard's (13,414 B).
//
// This sensor attaches the number: bytes of requirements.md per numbered
// functional requirement, against a per-depth ceiling. The ceilings sit BELOW
// the measured medians (Minimal 2,459 B/FR, Standard 2,067 B/FR) on purpose —
// a ceiling at today's numbers would ratify the spread rather than surface it.
//
// Advisory by construction: the shipped schema admits no other severity, so a
// finding is data for the human at the gate and never blocks. Following the
// answer-evidence idiom, every check outcome — pass or fail — exits 0; the only
// exit-1 path is a missing CLI flag. Absence is likewise not a failure: no
// file, no depth, and Comprehensive (no declared ceiling) all pass. The one
// exception is a written requirements.md carrying no `FR-n` ids at all, which
// is the stage contract's numbering requirement going unmet.
//
// Self-contained (no amadeus-lib import): a per-sensor script is spawned by the
// dispatcher and must not drag the library's module graph into that process.
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

/** Bytes per numbered FR each depth may spend. Measured over the 43 corpus
 *  artifacts carrying FR-n ids:
 *
 *    Minimal  n=26  min 1346  p25 1738  median 2353  max 6544 B/FR
 *    Standard n=17  min  864  median 2040  max 3354 B/FR
 *
 *  Both ceilings sit INSIDE their level's observed range, which is what makes
 *  each a detector rather than a verdict. Where they sit within that range
 *  differs on purpose:
 *
 *  - Minimal 1,800 is BELOW its median (2,353), flagging 19/26. Minimal is the
 *    level the inversion is about — it spends more per requirement than
 *    Standard while declaring less detail — so its ceiling pulls the level down.
 *  - Standard 2,400 is ABOVE its median (2,040), flagging 3/17. Standard's
 *    current volume was judged reasonable, so its ceiling catches the tail
 *    rather than the middle.
 *
 *  An earlier Minimal of 1,200 sat under the observed MINIMUM and flagged
 *  26/26 — a permanently red signal says nothing about which artifacts are
 *  outliers, so it was noise rather than a detector.
 *
 *  Comprehensive is deliberately absent — it declares no ceiling
 *  (stage-protocol.md §8), and an entry of Infinity would read as a threshold
 *  someone forgot to pick. */
export const DEPTH_BUDGETS: Record<string, number | undefined> = {
  Minimal: 1800,
  Standard: 2400,
  Comprehensive: undefined,
};

/** The canonical depth levels, mirrored from amadeus-directive.ts. Duplicated
 *  rather than imported to keep this spawned script self-contained. */
const DEPTH_LEVELS = ["Minimal", "Standard", "Comprehensive"] as const;

/** The basename the requirements-analysis produces entry resolves to. */
export const REQUIREMENTS_BASENAME = "requirements.md";

export interface DepthBudgetFinding {
  field: string;
  reason: string;
}

export interface DepthBudgetResult {
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: DepthBudgetFinding[];
  fr_count: number;
  bytes: number;
  bytes_per_fr: number;
}

function verdict(
  reason: string,
  findings: DepthBudgetFinding[],
  measured: { fr_count: number; bytes: number; bytes_per_fr: number },
): DepthBudgetResult {
  return {
    pass: findings.length === 0,
    findings_count: findings.length,
    reason,
    findings,
    ...measured,
  };
}

const NONE = { fr_count: 0, bytes: 0, bytes_per_fr: 0 };

/** The three ways the stage contract lets a requirement carry its id:
 *  `### FR-1: …` (heading), `- **FR-1**: …` (bold list entry), and a bare
 *  `**FR-1**: …` line.
 *
 *  The id itself may carry a DOMAIN PREFIX — `FR-AUTH-1`, `FR-QRP-3`,
 *  `FR-GRT-004` — which is how the corpus overwhelmingly writes them. An
 *  earlier pattern demanded a digit straight after `FR-` and silently skipped
 *  every prefixed id, undercounting 13 of 52 artifacts and reporting 4 as
 *  carrying no requirements at all. Since this count is the DENOMINATOR of
 *  bytes-per-FR, missing ids inflate the measurement.
 *
 *  Distinct ids are counted, so restating one in a later cross-reference does
 *  not inflate the denominator (which would make an over-long document look
 *  proportionate). */
const FR_ID = "([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)";
// The id ends where its own character class does; what follows it — `:`, ` — `,
// a parenthesised title, or the closing `**` — is not constrained. The corpus
// writes `- **FR-AUTH-1(semi 専用 authorization 型の新設)** — …`, keeping the
// title INSIDE the bold run, so a pattern demanding `**` right after the id
// matches almost nothing.
const FR_PATTERNS = [
  new RegExp(`^#{2,4}\\s+FR-${FR_ID}`),
  new RegExp(`^[-*]\\s+\\*\\*FR-${FR_ID}`),
  new RegExp(`^\\*\\*FR-${FR_ID}`),
];

export function countFunctionalRequirements(body: string): number {
  const ids = new Set<string>();
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trimStart();
    for (const pattern of FR_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        ids.add(match[1]);
        break;
      }
    }
  }
  return ids.size;
}

/** Normalize a raw depth string to a canonical level, or undefined when it is
 *  absent or unrecognizable. The sensor never guesses a level: an unreadable
 *  value means "do not measure", not "assume Minimal". */
export function canonicalDepth(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const needle = raw.trim().toLowerCase();
  return DEPTH_LEVELS.find((level) => level.toLowerCase() === needle);
}

/** Pure evaluation core (in-process test seam). Reads the file itself so the
 *  CLI entry stays a thin argv shim. */
export function evaluateDepthBudget(outputPath: string, depth: string | undefined): DepthBudgetResult {
  if (basename(outputPath) !== REQUIREMENTS_BASENAME) return verdict("not-requirements", [], NONE);

  let body: string;
  try {
    body = readFileSync(outputPath, "utf-8");
  } catch {
    return verdict("no-file", [], NONE);
  }

  const bytes = Buffer.byteLength(body, "utf-8");
  // A file that exists but holds nothing is a stage mid-write, not a contract
  // violation — reporting it would fire on every artifact's first keystroke.
  if (body.trim() === "") return verdict("empty", [], { ...NONE, bytes });

  // The FR-n numbering requirement is stated unconditionally by the stage, so
  // it is checked BEFORE depth: a written document with no numbered
  // requirements is a contract miss whether or not a depth could be resolved.
  // Checking it after the depth guard would silence it on exactly the runs
  // where depth is unavailable.
  const frCount = countFunctionalRequirements(body);
  if (frCount === 0) {
    return verdict(
      "no-numbered-frs",
      [{
        field: "FR-n",
        reason: "no numbered functional requirements found — downstream stages and this sensor address requirements by stable FR-n ids",
      }],
      { fr_count: 0, bytes, bytes_per_fr: 0 },
    );
  }

  const level = canonicalDepth(depth);
  if (level === undefined) return verdict("no-depth", [], { ...NONE, bytes, fr_count: frCount });

  // Reported per-FR figure is rounded for readability, but the COMPARISON uses
  // the exact quantity: rounding first would let 12,001 B over 10 FRs (1200.1)
  // report as 1200 and slip under a 1200 ceiling.
  const bytesPerFr = Math.round(bytes / frCount);
  const ceiling = DEPTH_BUDGETS[level];
  if (ceiling === undefined) {
    return verdict("no-ceiling", [], { fr_count: frCount, bytes, bytes_per_fr: bytesPerFr });
  }

  const findings: DepthBudgetFinding[] = [];
  if (bytes > ceiling * frCount) {
    findings.push({
      field: "bytes-per-fr",
      reason: `${bytes} B over ${frCount} requirements exceeds the ${level} guidance of ${ceiling} B per FR`,
    });
  }
  return verdict(level.toLowerCase(), findings, { fr_count: frCount, bytes, bytes_per_fr: bytesPerFr });
}

/** Resolve the workflow depth for an artifact by walking UP from its path to
 *  the record's amadeus-state.md. The per-sensor script receives only
 *  --stage/--output-path, so the dispatcher (which knows projectDir) reads this
 *  and passes the answer in — the script never guesses the record root itself.
 *
 *  The walk is BOUNDED by projectDir: without that bound a run inside a nested
 *  checkout could climb into an unrelated workspace's state and measure against
 *  a depth that has nothing to do with this artifact. Any failure to resolve
 *  yields undefined, which the sensor treats as "do not measure" (fail-open). */
export function readRecordDepth(outputPath: string, projectDir: string): string | undefined {
  const root = resolve(projectDir);
  let dir = dirname(resolve(outputPath));
  // An output path outside projectDir has no record of ours to find, and
  // walking from it would climb past the bound into whatever state happens to
  // sit above — measure nothing rather than measure against a stranger's depth.
  const rel = relative(root, dir);
  if (rel.startsWith("..") || isAbsolute(rel)) return undefined;
  for (;;) {
    // The NEAREST state file is the authority. Stop at the first one found even
    // when it yields no usable Depth: continuing would let an ancestor record
    // answer for this one, measuring the artifact against a ceiling from a
    // different workflow. No Depth here means fail-open, not "ask upstairs".
    const here = readStateHere(dir);
    if (here.found) return here.depth;
    if (dir === root) return undefined;
    const parent = dirname(dir);
    // Stop at the filesystem root too, so a pathological input terminates
    // instead of looping.
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** One directory's worth of the walk. `found` tells the caller whether to stop;
 *  `depth` is the canonical level, absent when the file carries no usable one.
 *
 *  A state file we cannot READ still counts as found: it is this record's state,
 *  so the walk stops and measures nothing rather than letting an ancestor answer
 *  for a record whose own answer was merely unreadable. Only the absence of a
 *  state file here — or a path that is not a regular file — keeps the walk
 *  going. Kept as one try so the failure path is a single branch. */
function readStateHere(dir: string): { found: boolean; depth?: string } {
  const candidate = join(dir, "amadeus-state.md");
  if (!existsSync(candidate)) return { found: false };
  try {
    if (!statSync(candidate).isFile()) return { found: false };
    const match = readFileSync(candidate, "utf-8").match(/^-\s+\*\*Depth\*\*:\s*(.*)$/m);
    return { found: true, depth: canonicalDepth(match?.[1]) };
  } catch {
    return { found: true };
  }
}

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
  process.stderr.write(`amadeus-sensor-depth-budget: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every check outcome is stdout JSON with exit 0 (advisory contract). */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(`${JSON.stringify(evaluateDepthBudget(flags.outputPath, flags.depth))}\n`);
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
