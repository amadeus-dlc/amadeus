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
import { basename, dirname, join, resolve } from "node:path";

/** Bytes per numbered FR each depth may spend. Comprehensive is deliberately
 *  absent — it declares no ceiling (stage-protocol.md §8), and an entry of
 *  Infinity would read as a threshold someone forgot to pick. */
export const DEPTH_BUDGETS: Record<string, number | undefined> = {
  Minimal: 1200,
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
 *  `**FR-1**: …` line. Distinct ids are counted, so restating FR-1 in a later
 *  cross-reference does not inflate the denominator (which would make an
 *  over-long document look proportionate). */
const FR_PATTERNS = [
  /^#{2,4}\s+FR-(\d+)\b/,
  /^[-*]\s+\*\*FR-(\d+)\*\*/,
  /^\*\*FR-(\d+)\*\*/,
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

  const level = canonicalDepth(depth);
  if (level === undefined) return verdict("no-depth", [], { ...NONE, bytes });

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

  const bytesPerFr = Math.round(bytes / frCount);
  const ceiling = DEPTH_BUDGETS[level];
  if (ceiling === undefined) {
    return verdict("no-ceiling", [], { fr_count: frCount, bytes, bytes_per_fr: bytesPerFr });
  }

  const findings: DepthBudgetFinding[] = [];
  if (bytesPerFr > ceiling) {
    findings.push({
      field: "bytes-per-fr",
      reason: `${bytesPerFr} B per FR over ${frCount} requirements exceeds the ${level} guidance of ${ceiling} B per FR`,
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
  for (;;) {
    const level = depthFromStateIn(dir);
    if (level !== undefined) return level;
    if (dir === root) return undefined;
    const parent = dirname(dir);
    // Stop at the filesystem root too, so an output path outside projectDir
    // terminates instead of looping.
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** The single directory's worth of work the walk repeats: read this dir's
 *  amadeus-state.md, if any, and pull a canonical Depth out of it. Every
 *  failure — absent, not a file, unreadable, no Depth field, unrecognizable
 *  value — is undefined, which the caller reads as "keep walking". */
function depthFromStateIn(dir: string): string | undefined {
  const candidate = join(dir, "amadeus-state.md");
  if (!existsSync(candidate)) return undefined;
  try {
    if (!statSync(candidate).isFile()) return undefined;
    const match = readFileSync(candidate, "utf-8").match(/^-\s+\*\*Depth\*\*:\s*(.*)$/m);
    return canonicalDepth(match?.[1]);
  } catch {
    return undefined;
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
