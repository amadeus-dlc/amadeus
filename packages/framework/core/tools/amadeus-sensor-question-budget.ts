// question-budget sensor — the L2 row of #2683 (#2693).
//
// #2672 promoted §8's "Primary questions per stage: Minimal 4 / Standard 8 /
// Comprehensive 12" from an illustration to a contract that stages MUST hold
// to, and chose self-enforcement to carry it: the stage agent is expected to
// respect the ceiling while drafting. Nothing counted. This sensor supplies the
// measurement that turns the row into a checkable one, and switches the
// enforcement style from self-judgement to a machine count — advisory, so the
// count is data for the human at the gate.
//
// WHAT COUNTS AS A QUESTION. The contract answers this itself, twice:
// "Primary and follow-up questions share this single total budget" and
// "including follow-ups and chat-mode questions". The column is headed
// "Primary questions per stage" but the budget it caps is the total, so a
// lettered follow-up (`Q1a.`) enters the same count as the primary that spawned
// it — counting primaries alone would read the contract against its own words.
//
// FOUR WRITTEN FORMS, not one. Enumerated over the committed corpus rather than
// assumed: 450 of 816 question files use the `Qn.` heading, and the remainder
// are not all zero-question rulings. Three further forms carry real asks that a
// heading-only predicate reads as silence — prefixed question codes
// (`### FDQ-1:`), 質問-headed tables, and bold inline asks (`**Q1: …**`). That
// is the #2534 defect (an FR predicate blind to the table form) arriving in a
// second place, so all four forms are in the closed set from the start.
//
// Self-contained (no amadeus-lib import): a per-sensor script is spawned by the
// dispatcher and must not drag the library's module graph into that process.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { requireFlagValue } from "./amadeus-sensor-flags.ts";

/** Questions each depth may ask, from the §8 Depth-Level Contract table. The
 *  table is the source of truth; these are its values, not a second contract —
 *  a stage reads the row, this reads the same row's number.
 *
 *  Unlike the sibling depth-budget sensor, Comprehensive carries a ceiling
 *  here: §8 states one (12) for questions, where it deliberately states none
 *  for requirements volume. */
export const QUESTION_BUDGETS: Record<string, number | undefined> = {
  Minimal: 4,
  Standard: 8,
  Comprehensive: 12,
};

/** The canonical depth levels, mirrored from amadeus-directive.ts. Duplicated
 *  rather than imported to keep this spawned script self-contained. */
const DEPTH_LEVELS = ["Minimal", "Standard", "Comprehensive"] as const;

/** The basename suffix every question file carries. */
export const QUESTIONS_SUFFIX = "-questions.md";

/** Enforcement cutoff, mirroring the blocking-sensor guard's shape: intents are
 *  dated by their record dir name (`YYMMDD-…`), and only intents born on or
 *  after this sensor's landing day are reported.
 *
 *  Measured before choosing it: over 816 committed question files, ZERO exceed
 *  Comprehensive's 12 and five exceed Standard's 8 — the contract has in fact
 *  been held. What a retroactive comparison would surface instead is the 114
 *  files above Minimal's 4, nearly all of them written at a depth whose ceiling
 *  they are inside. Reporting those would be the permanently-red signal #2525
 *  had to undo, in a third shape. Older records are still MEASURED; the count
 *  and the ceiling are reported, and only the finding is withheld. */
export const QUESTION_BUDGET_CUTOFF_YYMMDD = 260809;

/** How far up from a question file the record root may be. A bound rather than
 *  an unbounded climb: without one, a run inside a nested checkout would walk
 *  into whatever workspace sits above and read a stranger's record.
 *  `<record>/construction/<unit>/<stage>/<stage>-questions.md` is four levels;
 *  the slack covers degrade layouts and nested spaces. */
const RECORD_WALK_LIMIT = 8;

// ---------------------------------------------------------------------------
// The predicate — the machine reading of "a question this file asks"
// ---------------------------------------------------------------------------

/** A question code: a bare `Q12`, or a prefixed code whose prefix ENDS IN `Q`
 *  (`DQ-3`, `NQ-5`, `FDQ-1`). A trailing lowercase letter marks a follow-up
 *  round (`Q1a`), which the contract puts in the same budget.
 *
 *  The prefix rule is what separates a question code from the requirement and
 *  decision ids a question file cites constantly — `FR-1`, `ADR-2`, `NFR-3`
 *  are all headings the corpus writes inside question files, and none of them
 *  is an ask. Anchoring on the `Q` needs no per-prefix allowlist to grow as
 *  stages invent their own codes. */
const CODE_BOUNDARY = "(?![A-Za-z0-9-])";
const BARE_CODE = `(Q[0-9]+[a-z]?)${CODE_BOUNDARY}`;
const PREFIXED_CODE = `([A-Z]{1,4}Q-[0-9]+[a-z]?)${CODE_BOUNDARY}`;

const LINE_PATTERNS = [
  // `### Q1. …`, `## Q3: …`, `#### FDQ-2: …` — two to four hashes, as the
  // corpus writes all three depths of heading.
  new RegExp(`^#{2,4}\\s+\\*{0,2}(?:${BARE_CODE}|${PREFIXED_CODE})`),
  // `**Q1: …**`, `**Q1(U-01): …**`, and the same as a list entry.
  new RegExp(`^(?:[-*]\\s+)?\\*\\*(?:${BARE_CODE}|${PREFIXED_CODE})`),
];

/** The header cell that makes a table a question table. The cell must BE the
 *  word, not merely start with it: `| 質問数 | 0 |` is a zero-question ruling
 *  written as metadata, and reading it as a header would turn the ruling into
 *  a question. */
const QUESTION_HEADER_CELL = /^\*{0,2}\s*(質問|問い|Question)\s*\*{0,2}$/;
/** A Markdown table's separator row — the line that makes the row above it a
 *  header rather than a body row. */
const TABLE_SEPARATOR = /^\|[\s:|-]+\|$/;
/** A table cell that is itself a question code, so a ruling table restating
 *  `Q1` joins the heading that asked it instead of doubling it. */
const CELL_CODE = new RegExp(`^\\*{0,2}(?:${BARE_CODE}|${PREFIXED_CODE})\\*{0,2}$`);

function splitRow(line: string): string[] {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

/** The distinct questions a body asks.
 *
 *  DISTINCT, because a question file restates its own ids: a `裁定の記録`
 *  table naming `Q1` records the answer to the `### Q1.` above it, and counting
 *  both would report a five-question stage as ten. Identity is the code where
 *  one exists and the row's own text where it does not — a table of prose asks
 *  has no ids to collide on. */
export function collectQuestionIds(body: string): Set<string> {
  const ids = new Set<string>();
  const lines = body.split("\n").map((line) => line.trim());
  for (const line of lines) {
    for (const pattern of LINE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Exactly one of the two alternatives captures; the other is undefined.
        const code = match[1] ?? match[2];
        if (code !== undefined) ids.add(code.toUpperCase());
        break;
      }
    }
  }
  for (const cell of questionTableCells(lines)) {
    const asCode = cell.match(CELL_CODE);
    const code = asCode === null ? undefined : (asCode[1] ?? asCode[2]);
    ids.add(code === undefined ? `row:${cell}` : code.toUpperCase());
  }
  return ids;
}

/** First-column cells of every 質問-headed table in the body.
 *
 *  Scanned as BLOCKS rather than by a line predicate: a body row carries no
 *  marker of its own, so what makes `| CI toolは何か | … |` a question is the
 *  header two lines above it. A line-at-a-time predicate would either miss the
 *  form or count every table row in the file. */
function questionTableCells(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (!line.startsWith("|")) continue;
    const header = splitRow(line);
    if (header.length === 0 || !QUESTION_HEADER_CELL.test(header[0] ?? "")) continue;
    if (!TABLE_SEPARATOR.test(lines[i + 1] ?? "")) continue;
    let row = i + 2;
    for (; row < lines.length; row += 1) {
      const candidate = lines[row] as string;
      if (!candidate.startsWith("|")) break;
      const first = splitRow(candidate)[0] ?? "";
      if (first !== "") out.push(first);
    }
    // Resume AFTER this table, so a file carrying two question tables reports
    // both and no row is scanned twice.
    i = row;
  }
  return out;
}

export function countQuestions(body: string): number {
  return collectQuestionIds(body).size;
}

// ---------------------------------------------------------------------------
// Record date — which side of the enforcement cutoff a file was written on
// ---------------------------------------------------------------------------

/** Walk UP from a question file to its record root, bounded. A record root is
 *  the directory carrying `amadeus-state.md` or an audit shard — either alone
 *  is enough, because some records carry no state file and some carry no audit
 *  directory, and demanding both would drop them. */
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

/** The audit arm asks for a `.jsonl` SHARD rather than the bare directory: a
 *  directory named `audit` is not rare outside a workspace (macOS ships
 *  `/var/audit`), and a bare-name match would hand back a stranger's path. */
function isRecordRoot(dir: string): boolean {
  if (isFile(join(dir, "amadeus-state.md"))) return true;
  try {
    return readdirSync(join(dir, "audit")).some((name) => name.endsWith(".jsonl"));
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The `YYMMDD` a record dir name opens with, or undefined when it carries
 *  none. A record whose date cannot be read is never reported — an unreadable
 *  name is not evidence that the record is new. */
export function recordDateOf(recordRoot: string | undefined): number | undefined {
  if (recordRoot === undefined) return undefined;
  const match = basename(recordRoot).match(/^(\d{6})-/);
  if (match === null) return undefined;
  const value = Number.parseInt(match[1] as string, 10);
  return Number.isFinite(value) ? value : undefined;
}

/** Is this record enforced? An unknown date answers NO — fail-open, so an
 *  unreadable layout never lands a record in the reported cohort. */
export function underQuestionBudgetEnforcement(recordDate: number | undefined): boolean {
  return recordDate !== undefined && recordDate >= QUESTION_BUDGET_CUTOFF_YYMMDD;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** Normalize a raw depth string to a canonical level, or undefined when it is
 *  absent or unrecognizable. The sensor never guesses a level: an unreadable
 *  value means "do not measure against a ceiling", not "assume Minimal". */
export function canonicalDepth(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const needle = raw.trim().toLowerCase();
  return DEPTH_LEVELS.find((level) => level.toLowerCase() === needle);
}

export interface QuestionBudgetFinding {
  field: string;
  reason: string;
}

export interface QuestionBudgetResult {
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: QuestionBudgetFinding[];
  questions: number;
  depth: string | null;
  ceiling: number | null;
  record_date: number | null;
  enforced: boolean;
}

const NONE = {
  questions: 0,
  depth: null,
  ceiling: null,
  record_date: null,
  enforced: false,
};

function verdict(
  reason: string,
  findings: QuestionBudgetFinding[],
  measured: Omit<QuestionBudgetResult, "pass" | "findings_count" | "reason" | "findings">,
): QuestionBudgetResult {
  return { pass: findings.length === 0, findings_count: findings.length, reason, findings, ...measured };
}

/** Pure evaluation core (in-process test seam). Reads the file itself so the
 *  CLI entry stays a thin argv shim. */
export function evaluateQuestionBudget(
  outputPath: string,
  depth: string | undefined,
): QuestionBudgetResult {
  if (!basename(outputPath).endsWith(QUESTIONS_SUFFIX)) {
    return verdict("not-questions-file", [], NONE);
  }

  let body: string;
  try {
    body = readFileSync(outputPath, "utf-8");
  } catch {
    return verdict("no-file", [], NONE);
  }
  // A file that exists but holds nothing is a stage mid-write, not a contract
  // violation — reporting it would fire on every artifact's first keystroke.
  if (body.trim() === "") return verdict("empty", [], NONE);

  const questions = countQuestions(body);
  const recordDate = recordDateOf(resolveRecordRoot(outputPath));
  const enforced = underQuestionBudgetEnforcement(recordDate);
  const level = canonicalDepth(depth);
  const ceiling = level === undefined ? undefined : QUESTION_BUDGETS[level];
  const figures = {
    questions,
    depth: level ?? null,
    ceiling: ceiling ?? null,
    record_date: recordDate ?? null,
    enforced,
  };

  // Without a depth there is no row to hold to. The count is still reported —
  // the measurement is the point, and a ceiling comparison is one use of it.
  if (ceiling === undefined) return verdict("no-depth", [], figures);
  if (questions <= ceiling) return verdict("within-budget", [], figures);
  // Over the row, but written before this sensor existed: measured, reported
  // as such, and not a finding.
  if (!enforced) return verdict("pre-cutoff", [], figures);
  return verdict(
    "over-budget",
    [
      {
        field: "questions",
        reason:
          `${questions} questions exceed the ${level} ceiling of ${ceiling} ` +
          "(stage-protocol §8 Depth-Level Contract; primaries and follow-ups share one total)",
      },
    ],
    figures,
  );
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
    if (argv[i] === "--stage") out.stage = requireFlagValue(argv, ++i, "--stage", fail);
    else if (argv[i] === "--output-path") out.outputPath = requireFlagValue(argv, ++i, "--output-path", fail);
    else if (argv[i] === "--depth") out.depth = requireFlagValue(argv, ++i, "--depth", fail);
  }
  return out;
}

/** The only non-zero exit: a missing required flag, or a flag whose value is
 *  missing / stolen by the next flag. Exported as an in-process seam — reached
 *  from `main` it runs inside a spawned child, which bun's coverage does not
 *  measure, so the arm would sit permanently uncovered while its behaviour is
 *  genuinely tested. */
export function fail(msg: string): never {
  process.stderr.write(`amadeus-sensor-question-budget: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every check outcome is stdout JSON with exit 0 (advisory contract). */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(
    `${JSON.stringify(evaluateQuestionBudget(flags.outputPath, flags.depth))}\n`,
  );
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
