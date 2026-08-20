// undefined-term sensor — advisory glossary-diff check for Issue #2029.
//
// A Requirements Analysis question/artifact can use a coined,
// project-specific term without defining it (real case: Issue #2018,
// "desired plugin set" appeared undefined in a requirements-analysis-
// questions.md heading — see the audit trail under intent
// 260802-plugin-optin-parity). This sensor extracts candidate multi-word
// English terms from headings and lettered options, and flags any that
// resolve against none of: the shipped canonical glossary, the project's own
// free-form working glossaries, or a local/sibling-artifact definition.
//
// Deterministic only (no LLM). Every check outcome exits 0 — the only
// non-zero exit is a missing required CLI flag, matching the sibling
// sensors' advisory contract (amadeus-sensor-answer-evidence.ts idiom).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { activeSpace, workspaceRoot } from "./amadeus-lib.ts";
import { requireFlagValue } from "./amadeus-sensor-flags.ts";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

// --- Result shape -----------------------------------------------------------

interface Result {
	pass: boolean;
	findings_count: number;
	terms: string[];
}

function passed(): Result {
	return { pass: true, findings_count: 0, terms: [] };
}

function failed(terms: string[]): Result {
	return { pass: false, findings_count: terms.length, terms };
}

// --- Term normalization ------------------------------------------------------

function normalizeTerm(raw: string): string {
	return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

// Crude plural fold: a candidate matches a defined term either verbatim or
// with a single trailing "s" added/removed. Documented limitation — irregular
// plurals (e.g. "index"/"indices") are not folded.
function pluralVariant(term: string): string {
	if (term.endsWith("s") && term.length > 3) return term.slice(0, -1);
	return `${term}s`;
}

function isDefined(candidate: string, defined: ReadonlySet<string>): boolean {
	return defined.has(candidate) || defined.has(pluralVariant(candidate));
}

// --- Glossary/table-row parsing ----------------------------------------------

// The same row shape the canonical glossary and every project working
// glossary use: `| **Term** | Definition |` (optionally with a trailing
// `| Source |` cell).
const TABLE_ROW_RE = /^\|\s*\*\*(.+?)\*\*\s*\|/u;

function extractTableTerms(body: string): Set<string> {
	const terms = new Set<string>();
	for (const rawLine of body.split(/\r?\n/)) {
		const m = TABLE_ROW_RE.exec(rawLine.trim());
		if (m) terms.add(normalizeTerm(m[1]));
	}
	return terms;
}

// D3 — artifact-local definitions: any glossary-shaped table row anywhere in
// the doc, plus any **bold** span under a `## Terminology` / `## 用語`
// heading (until the next `## ` heading).
const BOLD_RE = /\*\*([^*]+)\*\*/gu;

function extractLocalDefinitions(body: string): Set<string> {
	const terms = extractTableTerms(body);
	let inTerminologySection = false;
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line.startsWith("## ")) {
			inTerminologySection = /^##\s+(Terminology|用語)\b/u.test(line);
			continue;
		}
		if (!inTerminologySection) continue;
		for (const m of line.matchAll(BOLD_RE)) {
			terms.add(normalizeTerm(m[1]));
		}
	}
	return terms;
}

function readFileIfExists(path: string): string | null {
	try {
		return readFileSync(path, "utf-8");
	} catch {
		return null;
	}
}

// D1 — the canonical glossary shipped alongside this sensor's own script,
// resolved the same way sensorsDir() resolves .../sensors relative to the
// running tool: always present in every installed harness.
// AMADEUS_GLOSSARY_PATH is a test-isolation seam mirroring
// AMADEUS_SENSORS_DIR/AMADEUS_TEMPLATES_DIR (amadeus-graph.ts) — lets a test
// point D1 at a fixture instead of this repo's real, evolving glossary.
function canonicalGlossaryPath(): string {
	return (
		process.env.AMADEUS_GLOSSARY_PATH ??
		join(TOOLS_DIR, "..", "knowledge", "amadeus-shared", "glossary.md")
	);
}

function loadCanonicalGlossaryTerms(): Set<string> {
	const body = readFileIfExists(canonicalGlossaryPath());
	return body === null ? new Set() : extractTableTerms(body);
}

// D2 — every *.md file directly under the active space's free-form Team
// Knowledge amadeus-shared dir. Absent directory (fresh workspace) → empty
// set, never a failure (#2029 constraint).
function loadProjectGlossaryTerms(projectDir: string): Set<string> {
	const dir = join(
		workspaceRoot(projectDir),
		"spaces",
		activeSpace(projectDir),
		"knowledge",
		"amadeus-shared",
	);
	const terms = new Set<string>();
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return terms;
	}
	for (const entry of entries.sort()) {
		if (!entry.endsWith(".md")) continue;
		const body = readFileIfExists(join(dir, entry));
		if (body === null) continue;
		for (const term of extractTableTerms(body)) terms.add(term);
	}
	return terms;
}

// The sibling artifact in the same requirements-analysis stage directory —
// requirements.md <-> requirements-analysis-questions.md. Any other filename
// (out of the manifest's matches scope) has no defined sibling.
function siblingArtifactPath(outputPath: string): string | null {
	const dir = dirname(outputPath);
	if (outputPath.endsWith("requirements-analysis-questions.md")) {
		return join(dir, "requirements.md");
	}
	if (outputPath.endsWith("requirements.md")) {
		return join(dir, "requirements-analysis-questions.md");
	}
	return null;
}

// --- Candidate term extraction -----------------------------------------------

const CANDIDATE_LINE_RE = /^(#{2,3}\s+.+|[A-Z][.)]\s+.+)$/u;
const WORD = "[A-Za-z][A-Za-z'-]*";
const CANDIDATE_RUN_RE = new RegExp(`\\b${WORD}(?:\\s+${WORD}){1,4}\\b`, "gu");
// Internal case transition (camelCase/PascalCase-shaped) or an all-caps
// acronym (2+ letters, no lowercase) reads as code or jargon, not a coined
// prose term — reject the whole candidate run if any token qualifies.
const CODE_OR_ACRONYM_TOKEN_RE = /^(?:[A-Za-z]*[a-z][A-Z][A-Za-z'-]*|[A-Z]{2,})$/u;

// A modest, inline allowlist of common English words that show up constantly
// in this repo's mixed-language prose and are never themselves coined terms.
// Extending this costs a source edit, same friction as any other sensor
// constant (#2029 open question 4 — accepted for v1).
const COMMON_WORDS = new Set([
	"the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "with", "via",
	"using", "use", "used", "is", "are", "was", "were", "this", "that", "these",
	"those", "from", "by", "as", "at", "it", "its", "be", "been", "being", "not",
	"no", "yes", "toolchain", "test", "tests", "testing", "production", "file",
	"files", "path", "paths", "new", "old", "existing", "data", "system",
	"systems", "service", "services", "code", "codebase", "project", "projects",
	"team", "user", "users", "issue", "issues", "pull", "request", "requests",
	"branch", "branches", "commit", "commits", "change", "changes", "review",
	"reviews", "reviewer", "author", "default", "value", "values", "name",
	"names", "type", "types", "format", "layer", "layers", "level", "levels",
	"step", "steps", "case", "cases", "example", "examples", "note", "notes",
	"one", "two", "three", "first", "second", "third", "last", "next",
	"previous", "current", "final", "initial", "option", "options", "choice",
	"choices", "question", "questions", "answer", "answers", "scope", "scopes",
	"other", "please", "specify",
]);

function stripNoise(line: string): string {
	return line
		.replace(/`[^`]*`/gu, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
		.replace(/#\d+/gu, " ")
		.replace(/cid:[\w:-]+/gu, " ");
}

function isAllCommonWords(run: string): boolean {
	return run.split(" ").every((w) => COMMON_WORDS.has(w.toLowerCase()));
}

function hasCodeOrAcronymToken(run: string): boolean {
	return run.split(" ").some((w) => CODE_OR_ACRONYM_TOKEN_RE.test(w));
}

/** Every 2-5 word ASCII candidate run from the artifact's heading/option
 *  lines, in first-appearance order, deduped, with each run's raw occurrence
 *  count (pre-gate — the gate is applied by the caller). */
function extractCandidateRuns(body: string): Map<string, number> {
	const counts = new Map<string, number>();
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!CANDIDATE_LINE_RE.test(line)) continue;
		const cleaned = stripNoise(line);
		for (const match of cleaned.matchAll(CANDIDATE_RUN_RE)) {
			const run = match[0];
			if (isAllCommonWords(run) || hasCodeOrAcronymToken(run)) continue;
			const normalized = normalizeTerm(run);
			counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
		}
	}
	return counts;
}

// The frequency/length gate (#2029 design §2.2): a candidate is worth
// reporting only if it reads as a deliberately coined term of art — used
// more than once, or long enough (3+ words) that a one-off use is unlikely
// to be incidental description.
function passesGate(normalized: string, count: number): boolean {
	return count >= 2 || normalized.split(" ").length >= 3;
}

// --- Pure evaluation core (in-process test seam) -----------------------------

export function evaluateUndefinedTerm(outputPath: string, projectDir: string): Result {
	const body = readFileIfExists(outputPath);
	if (body === null) return passed();

	const candidateCounts = extractCandidateRuns(body);
	if (candidateCounts.size === 0) return passed();

	const defined = new Set<string>();
	for (const t of loadCanonicalGlossaryTerms()) defined.add(t);
	for (const t of loadProjectGlossaryTerms(projectDir)) defined.add(t);
	for (const t of extractLocalDefinitions(body)) defined.add(t);
	const siblingPath = siblingArtifactPath(outputPath);
	const siblingBody = siblingPath === null ? null : readFileIfExists(siblingPath);
	if (siblingBody !== null) {
		for (const t of extractLocalDefinitions(siblingBody)) defined.add(t);
	}

	const findings: string[] = [];
	for (const [normalized, count] of candidateCounts) {
		if (!passesGate(normalized, count)) continue;
		if (isDefined(normalized, defined)) continue;
		findings.push(normalized);
	}
	findings.sort();

	return findings.length === 0 ? passed() : failed(findings);
}

// --- CLI entry ----------------------------------------------------------------

interface Flags {
	stage?: string;
	outputPath?: string;
}

export function parseFlags(argv: string[]): Flags {
	const out: Flags = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--stage") {
			out.stage = requireFlagValue(argv, ++i, "--stage", fail);
		} else if (arg === "--output-path") {
			out.outputPath = requireFlagValue(argv, ++i, "--output-path", fail);
		}
	}
	return out;
}

export function fail(msg: string): never {
	process.stderr.write(`amadeus-sensor-undefined-term: ${msg}\n`);
	process.exit(1);
}

export function main(argv: string[] = process.argv.slice(2)): void {
	const flags = parseFlags(argv);
	if (!flags.stage) fail("--stage is required");
	if (!flags.outputPath) fail("--output-path is required");
	const result = evaluateUndefinedTerm(flags.outputPath, process.cwd());
	process.stdout.write(`${JSON.stringify(result)}\n`);
	process.exit(0);
}

if (import.meta.main) main();
