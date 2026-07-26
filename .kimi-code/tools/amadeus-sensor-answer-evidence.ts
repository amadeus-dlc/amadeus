// answer-evidence sensor — advisory surface for the E-OC1 evidence guard.
//
// The gate-start guard (amadeus-state.ts handleGateStart) already refuses to
// open the approval gate when a stage's *-questions.md carries a filled
// [Answer] without ruling/approval evidence. This sensor exposes the SAME
// predicate (amadeus-lib.ts checkQuestionsEvidence) as a Write/Edit-time
// advisory so a missing E-OC1 header surfaces at authoring time, before the
// author reaches the gate. It is a thin adapter: it re-uses the shipped
// predicate verbatim and never re-implements or alters its semantics.
//
// Divergence from the sibling sensor idiom (amadeus-sensor-required-sections.ts),
// documented per citation-semantics-check: that sensor fails (exit 1) when
// --output-path does not exist on disk. This sensor must NOT — the predicate
// already maps a missing file to a pass (no-file), and a second existsSync gate
// here would turn a benign "not written yet" into a loud error. The only exit-1
// path here is a missing CLI flag; every check outcome (pass or fail) exits 0,
// because sensor verdicts are advisory.
import { basename } from "node:path";
import { checkQuestionsEvidence, QUESTIONS_EVIDENCE_CUTOFF_YYMMDD } from "./amadeus-lib.ts";

// Result shape read by the dispatcher (amadeus-sensor.ts: `pass` gates
// PASSED/FAILED, `findings_count` is emitted verbatim). `reason` and `skipped`
// are advisory detail. Invariants, enforced by the three constructors below so
// that no other shape is representable:
//   - pass === false  ⇒  findings_count === 1 AND skipped === null
//   - skipped !== null ⇒  pass === true AND findings_count === 0
interface Result {
	pass: boolean;
	findings_count: number;
	reason: string;
	skipped: "not-questions" | "pre-cutoff" | null;
}

// A skip is always a pass with zero findings — the check did not apply.
function skipped(kind: "not-questions" | "pre-cutoff"): Result {
	return { pass: true, findings_count: 0, reason: "skipped", skipped: kind };
}

// The predicate passed: zero findings, the predicate's own reason carried through.
function passed(reason: string): Result {
	return { pass: true, findings_count: 0, reason, skipped: null };
}

// The predicate failed: exactly one finding, the predicate's own reason carried through.
function failed(reason: string): Result {
	return { pass: false, findings_count: 1, reason, skipped: null };
}

// Extract the intent record-dir date (YYMMDD as an integer) from an output
// path's `intents/<dir>/` segment. Returns null when there is no such segment
// or its leading 6 chars do not parse — the caller treats null as "cannot date
// this path" and skips the check (pre-cutoff), matching the gate's exemption of
// undatable/older intents.
//
// The gate-start guard derives the record dir from resolved state (the
// active-intent cursor); this sensor instead parses the outputPath string
// directly, so it stays state-free and works when fired against an arbitrary
// path (a manual `amadeus-sensor fire` on any file, with no active intent). The
// two paths agree on the same YYMMDD boundary because both read the record-dir
// name's leading 6 digits against QUESTIONS_EVIDENCE_CUTOFF_YYMMDD.
function intentDateFromPath(outputPath: string): number | null {
	const segments = outputPath.replace(/\\/g, "/").split("/");
	const idx = segments.indexOf("intents");
	if (idx === -1 || idx + 1 >= segments.length) return null;
	const dir = segments[idx + 1];
	const date = Number.parseInt(dir.slice(0, 6), 10);
	return Number.isFinite(date) ? date : null;
}

// Pure evaluation core (in-process test seam). Three stages, short-circuiting:
//   1. Target selection — only *-questions.md files are in scope.
//   2. Enforcement cutoff — intents older than the guard's adoption day are
//      exempt (undatable paths are treated as pre-cutoff and skipped).
//   3. Predicate mapping — the shipped checkQuestionsEvidence discriminated
//      union is mapped 1:1: its two fail reasons become findings, its four pass
//      reasons become clean passes. No re-implementation, no reinterpretation.
export function evaluateAnswerEvidence(outputPath: string): Result {
	if (!basename(outputPath).endsWith("-questions.md")) {
		return skipped("not-questions");
	}
	const date = intentDateFromPath(outputPath);
	if (date === null || date < QUESTIONS_EVIDENCE_CUTOFF_YYMMDD) {
		return skipped("pre-cutoff");
	}
	const ev = checkQuestionsEvidence(outputPath);
	if (ev.kind === "fail") return failed(ev.reason);
	return passed(ev.reason);
}

interface Flags {
	stage?: string;
	outputPath?: string;
}

function parseFlags(argv: string[]): Flags {
	const out: Flags = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--stage") {
			out.stage = argv[++i];
		} else if (arg === "--output-path") {
			out.outputPath = argv[++i];
		}
	}
	return out;
}

function fail(msg: string): never {
	process.stderr.write(`amadeus-sensor-answer-evidence: ${msg}\n`);
	process.exit(1);
}

// CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
// the check outcome (pass or fail) is emitted as stdout JSON and always exits 0
// (advisory contract). A non-existent --output-path is NOT an error here — it
// flows into the predicate, which maps it to a pass (no-file).
export function main(argv: string[] = process.argv.slice(2)): void {
	const flags = parseFlags(argv);
	if (!flags.stage) fail("--stage is required");
	if (!flags.outputPath) fail("--output-path is required");
	const result = evaluateAnswerEvidence(flags.outputPath);
	process.stdout.write(`${JSON.stringify(result)}\n`);
	process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported main +
// evaluateAnswerEvidence seams are driven in-process by tests) without executing
// main() / process.exit at load time. Matches the sibling per-sensor scripts.
if (import.meta.main) main();
