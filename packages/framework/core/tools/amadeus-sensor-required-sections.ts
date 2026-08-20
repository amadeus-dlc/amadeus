import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { errorMessage, isMarkerArtifact, parseBoltDag } from "./amadeus-lib.ts";
import { requireFlagValue } from "./amadeus-sensor-flags.ts";

interface Result {
	pass: boolean;
	h2_count: number;
	headings: string[];
	findings_count: number;
	// Populated only when the output is unit-of-work-dependency.md: the
	// machine-readable edge block units-generation (2.7) must carry beside its
	// prose. "ok" once a valid acyclic block parses; the failure reasons mirror
	// parseBoltDag so a malformed or cyclic DAG fails loud at the 2.7 gate,
	// upstream of the runtime compiler that reads the same block.
	edge_block?: "ok" | "absent" | "malformed" | "cyclic";
	// Unit names whose valid DAG rows omit the producer-required kind. Present
	// only for unit-of-work-dependency.md after the shared parser succeeds.
	missing_unit_kinds?: string[];
	// Populated only when a team/framework template resolves for this output
	// (TPL — template-override layer). "applied" once the template's `##`
	// heading set becomes the expected set this output is verified against;
	// "ineligible" when a template file resolves but the artifact is NOT in the
	// dispatcher-threaded eligible set (a questions/timestamp marker), so the
	// template is ignored and a config warning is emitted instead. Absent when
	// no template resolves — the output keeps the generic ≥2-H2 floor.
	template?: "applied" | "ineligible";
	// The template's expected `##` heading set (only when template === "applied").
	template_expected?: string[];
	// Sections the template requires that the output is missing (the precise
	// findings — only when template === "applied").
	template_missing?: string[];
	// Advisory config warning when a template file resolves for an artifact the
	// stage does not declare template-eligible (the stem==artifact key is
	// unsound for questions/timestamp markers). Surfaced, not fatal.
	config_warning?: string;
	// Stage-declared section names threaded by the dispatcher.
	required_sections?: string[];
	required_missing?: string[];
	// Populated only when the output is a questions/timestamp marker: the generic
	// ≥2-H2 prose floor is exempted (E-FVEPD) because such markers intentionally
	// omit ≥2-H2 shape. `pass` is forced true with zero findings; this field
	// makes the exemption observable rather than silent (consumed by the manifest
	// output_schema + t155/t86 asserts).
	marker_exempt?: true;
}

interface Flags {
	stage?: string;
	outputPath?: string;
	// Absolute path to the TEAM templates source-of-truth dir
	// (amadeus/spaces/<space>/memory/templates/) — the OVERRIDE tier. Threaded by
	// the dispatcher / fire hook, which hold projectDir; the script never
	// resolves projectDir itself. Absent → no team lookup.
	templatesDir?: string;
	// Absolute path to the FRAMEWORK-DEFAULT templates dir
	// (<harness>/tools/data/templates/) — the engine-shipped MIDDLE tier,
	// consulted only when the team dir misses. Threaded by the dispatcher.
	// Absent or a clean miss → fall through to the generic ≥2-H2 floor. The
	// framework ships zero defaults at GA, so this normally misses.
	frameworkTemplatesDir?: string;
	// Comma-joined set of artifact NAMES (output-filename stems) this stage
	// declares template-eligible — the `produces` entries that are NOT
	// questions/timestamp markers. Threaded from the dispatcher, which holds the
	// stageNode (the per-sensor script has no graph access). A resolved template
	// applies ONLY when basename(outputPath) stem ∈ this set; otherwise it is
	// ignored + a config warning emitted. Absent/empty → no artifact is eligible.
	templateEligible?: string[];
	// JSON-encoded stage frontmatter `required_sections` names. JSON keeps
	// section names containing commas unambiguous across the process boundary.
	requiredSections?: string[];
}

function parseFlags(argv: string[]): Flags {
	const out: Flags = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--stage") {
			out.stage = requireFlagValue(argv, ++i, "--stage", fail);
		} else if (arg === "--output-path") {
			out.outputPath = requireFlagValue(argv, ++i, "--output-path", fail);
		} else if (arg === "--templates-dir") {
			out.templatesDir = requireFlagValue(argv, ++i, "--templates-dir", fail);
		} else if (arg === "--framework-templates-dir") {
			out.frameworkTemplatesDir = requireFlagValue(argv, ++i, "--framework-templates-dir", fail);
		} else if (arg === "--template-eligible") {
			out.templateEligible = requireFlagValue(argv, ++i, "--template-eligible", fail)
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		} else if (arg === "--required-sections") {
			const raw = requireFlagValue(argv, ++i, "--required-sections", fail);
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch {
				fail("--required-sections must be valid JSON");
			}
			if (
				!Array.isArray(parsed) ||
				parsed.some((section) => typeof section !== "string" || section.trim() === "")
			) {
				fail("--required-sections must be a JSON array of non-empty strings");
			}
			out.requiredSections = parsed as string[];
		}
	}
	return out;
}

// Parse the distinct, ordered `^## ` headings of a markdown body (trimmed,
// deduped by exact text). Shared by the output scan and the template scan so
// the produced shape and the checked shape are compared on identical terms.
function parseH2Headings(body: string): string[] {
	const seen = new Set<string>();
	const headings: string[] = [];
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line.startsWith("## ")) continue;
		if (seen.has(line)) continue;
		seen.add(line);
		headings.push(line);
	}
	return headings;
}

function applyRequiredSectionsContract(
	result: Result,
	requiredSections: string[] | undefined,
	stem: string,
	headings: string[],
): { pass: boolean; findingsCount: number } {
	if (requiredSections !== undefined && !isMarkerArtifact(stem)) {
		const expected = requiredSections.map(
			(section) => `## ${section.trim().replace(/^##\s+/, "")}`,
		);
		const present = new Set(headings);
		const missing = expected.filter((heading) => !present.has(heading));
		result.required_sections = expected;
		result.required_missing = missing;
		return { pass: missing.length === 0, findingsCount: missing.length };
	}
	return { pass: true, findingsCount: 0 };
}

// Resolve the template file for an artifact stem in §10 override-before-default
// order: team dir first, then the framework-default dir; the FIRST existing
// `<stem>.md` wins. Returns its absolute path, or null when neither tier has one
// (→ the generic ≥2-H2 floor). A dir flag that is absent or whose `<stem>.md`
// is missing is simply skipped — graceful fall-through, no error.
function resolveTemplatePath(stem: string, flags: Flags): string | null {
	for (const dir of [flags.templatesDir, flags.frameworkTemplatesDir]) {
		if (!dir) continue;
		const p = join(dir, `${stem}.md`);
		if (existsSync(p)) return p;
	}
	return null;
}

// The only non-zero exit: a missing/unreadable required flag, or a flag whose
// value is missing / stolen by the next flag. Exported as an in-process seam —
// reached from `main` it runs inside a spawned child, which bun's coverage does
// not measure, so the arm would sit permanently uncovered while its behaviour is
// genuinely tested.
export function fail(msg: string): never {
	process.stderr.write(`amadeus-sensor-required-sections: ${msg}\n`);
	process.exit(1);
}

function validateBoltDagKinds(body: string): {
	edgeBlock: "ok" | "absent" | "malformed" | "cyclic";
	missingUnitKinds?: string[];
	findingsCount: number;
} {
	const parsed = parseBoltDag(body);
	if (!parsed.ok) {
		return { edgeBlock: parsed.reason, findingsCount: 1 };
	}
	const missingUnitKinds = parsed.units
		.filter((unit) => unit.kind === undefined)
		.map((unit) => unit.name);
	return {
		edgeBlock: "ok",
		missingUnitKinds,
		findingsCount: missingUnitKinds.length,
	};
}

export function main(argv: string[] = process.argv.slice(2)): void {
	const flags = parseFlags(argv);

	if (!flags.outputPath) {
		fail("--output-path is required");
	}
	if (!existsSync(flags.outputPath)) {
		fail(`--output-path not found: ${flags.outputPath}`);
	}

	let body: string;
	try {
		body = readFileSync(flags.outputPath, "utf-8");
	} catch (err) {
		fail(
			`failed to read --output-path ${flags.outputPath}: ${errorMessage(err)}`,
		);
	}

	// Count distinct ^## headings. Strip leading/trailing whitespace per
	// line, dedupe by exact (trimmed) text. `^## ` requires literal "## "
	// (two hashes + space); `### Foo`.startsWith("## ") is false because
	// char[2] is '#', not ' ', so deeper headings are excluded.
	const headings = parseH2Headings(body);

	const h2_count = headings.length;
	let pass = h2_count >= 2;
	// findings_count derivation per locked plan: max(0, 2 - h2_count).
	// Emitted by the script (not the dispatcher) per the v3 control-
	// plane / data-plane separation: per-sensor scripts own their own
	// findings derivation; the dispatcher reads out.findings_count
	// generically and is sensor-id-agnostic.
	let findings_count = Math.max(0, 2 - h2_count);
	const result: Result = { pass, h2_count, headings, findings_count };

	// Template-override branch (TPL — template-override layer). When a
	// team/framework template resolves for this output, its `##` heading set
	// REPLACES the generic ≥2-H2 floor: pass iff every template heading is
	// present in the output (expected ⊆ output); the missing ones are precise
	// findings. Whole-doc, no merge. No LLM — byte-reproducible.
	//
	// Resolution (vision §10), override-before-default, FIRST hit wins:
	//   1. team template      <templates-dir>/<stem>.md             (--templates-dir)
	//   2. framework default   <framework-templates-dir>/<stem>.md  (--framework-templates-dir)
	//   3. else                the generic ≥2-H2 floor              (no template)
	// The artifact name IS the output filename stem (the X→X.md convention;
	// resolveArtifactPath builds `<...>/${name}.md`, amadeus-orchestrate.ts:649).
	// The framework ships zero defaults at GA, so tier 2 normally misses and the
	// behaviour is identical to today (everything hits the floor) — but the
	// branch exists so a later PR can drop in a default <stem>.md without touching
	// resolution. The agent reads the SAME order (stage-protocol.md) — no drift.
	//
	// ELIGIBILITY GATE (required, not optional): the stem==artifact key is
	// unsound for questions/timestamp markers (a `*-questions.md` Q&A file is
	// intentionally not ≥2-H2). The per-sensor script cannot know the stage's
	// artifact set, so the dispatcher threads --template-eligible. A resolved
	// template applies ONLY when the stem ∈ that set; otherwise it is ignored
	// and an advisory config warning is emitted (the output keeps its floor).
	const stem = basename(flags.outputPath).replace(/\.md$/, "");

	// MARKER EXEMPTION (E-FVEPD, cid:practices-discovery:e-fvepd-marker-heading-floor).
	// A `*-questions.md` Q&A file or a `*-timestamp.md` marker intentionally omits
	// the ≥2-H2 prose shape, so the generic floor would fail it spuriously. Exempt
	// markers from the floor: pass with zero findings, keyed off the SAME
	// isMarkerArtifact predicate the graph's templateEligibleArtifacts filter uses
	// (one canonical definition, no drift). This governs the FLOOR only and is
	// orthogonal to the branches below: a marker is never in the template-eligible
	// set, so a template resolving for one still takes the ineligible/config_warning
	// path unchanged (FR-3), and no marker is unit-of-work-dependency.md, so the
	// edge-block branch never applies. Non-markers skip this branch entirely, so
	// their floor/findings/template/edge-block behaviour is unchanged.
	if (isMarkerArtifact(stem)) {
		result.marker_exempt = true;
		pass = true;
		findings_count = 0;
	}

	const templatePath = resolveTemplatePath(stem, flags);
	if (templatePath) {
		const eligible = (flags.templateEligible ?? []).includes(stem);
		if (!eligible) {
			// Template resolves but the artifact is not declared eligible —
			// ignore it (keep the floor) + surface a config warning.
			result.template = "ineligible";
			result.config_warning =
				`template ${stem}.md resolved but artifact "${stem}" is not ` +
				`template-eligible for stage "${flags.stage ?? "?"}" ` +
				`(questions/timestamp markers are excluded); template ignored, ` +
				`keeping the generic >=2-H2 floor.`;
		} else {
			let templateBody: string;
			try {
				templateBody = readFileSync(templatePath, "utf-8");
			} catch (err) {
				fail(
					`failed to read template ${templatePath}: ${errorMessage(err)}`,
				);
			}
			const expected = parseH2Headings(templateBody);
			const present = new Set(headings);
			const missing = expected.filter((h) => !present.has(h));
			pass = missing.length === 0;
			findings_count = missing.length;
			result.template = "applied";
			result.template_expected = expected;
			result.template_missing = missing;
		}
	}

	// Stage-declared required_sections is an explicit heading contract. Unlike
	// the generic floor, it names the exact H2 sections the stage requires.
	// Marker artifacts remain entirely exempt from this contract, matching the
	// dispatcher's no-evaluation path and the existing marker floor exemption.
	const required = applyRequiredSectionsContract(
		result,
		flags.requiredSections,
		stem,
		headings,
	);
	pass = pass && required.pass;
	findings_count += required.findingsCount;

	// Filename-gated extension (units-generation 2.7): unit-of-work-dependency.md
	// must carry the required fenced ```yaml units: edge block beside its prose.
	// A malformed or cyclic block fails loud here, at the gate, rather than the
	// runtime compiler silently mis-reading or omitting it downstream. Every
	// other markdown artefact keeps the generic ≥2-H2 check untouched. (Orthogonal
	// to the template branch above — the edge-block check still applies even if a
	// template for unit-of-work-dependency resolves.)
	if (basename(flags.outputPath) === "unit-of-work-dependency.md") {
		const validation = validateBoltDagKinds(body);
		result.edge_block = validation.edgeBlock;
		result.missing_unit_kinds = validation.missingUnitKinds;
		if (validation.findingsCount > 0) {
			pass = false;
			findings_count += validation.findingsCount;
		}
	}

	result.pass = pass;
	result.findings_count = findings_count;
	process.stdout.write(`${JSON.stringify(result)}\n`);
	process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported main seam is
// driven in-process by tests) without executing main() / process.exit at load
// time. Matches the sibling tools (amadeus-sensor, amadeus-learnings).
if (import.meta.main) main();
