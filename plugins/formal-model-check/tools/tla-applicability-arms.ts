// tla-applicability-arms.ts — the two firing arms of the applicability
// judgement (#3186) and the pin-set coverage check, as pure predicates.
//
// Layering: nothing here touches the filesystem or the clock. The applicability
// pipeline (tla-applicability.ts) evaluates these after the J1..J6 table has
// returned a route and before the receipt is built; the CLI (tla-authoring.ts)
// reads the bytes they judge. The arms add firing predicates only — they never
// rewrite a row's verdict (business-rules.md BR-1).

import type { Result } from "./contract.ts";

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Arm 1(a): the value-set cluster predicate
// ---------------------------------------------------------------------------

/** One `Identifier == {"lit", ...}` definition of a TLA+ module. */
export interface ValueSetDefinition {
  readonly name: string;
  readonly literals: ReadonlySet<string>;
}

export interface SpecParseFailure {
  readonly detail: string;
}

/** A run of string literals that the implementation enumerates together. */
export interface LiteralCluster {
  readonly literals: ReadonlySet<string>;
  readonly line: number;
  readonly snippet: string;
}

export interface DriftFinding {
  /** The declared value sets this cluster covers in full. */
  readonly coveredValueSets: readonly string[];
  readonly cluster: readonly string[];
  /** Cluster members the model's whole string vocabulary does not know. */
  readonly unknownLiterals: readonly string[];
  readonly line: number;
  readonly snippet: string;
}

const MODULE_HEADER = /^\s*-{2,}\s*MODULE\s+[A-Za-z0-9_]+/m;
const VALUE_SET_START = /(^|\n)([A-Za-z_][A-Za-z0-9_]*)[ \t]*==[ \t]*\{/g;
const STRING_LITERAL = /"([^"\n]*)"/g;
// A body that is nothing but string literals and separators. Anything else —
// `{0, 1}`, a set of operators, a comprehension — is a set of some other kind
// and is classified out here rather than read as an empty vocabulary.
const LITERAL_BODY = /^[\s,]*(?:"[^"\n]*"[\s,]*)+$/;

function literalsIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(STRING_LITERAL)) found.push(match[1] as string);
  return found;
}

/**
 * The string-literal value sets a TLA+ module declares. A module without a
 * header, or with a value set whose brace never closes, is undecidable rather
 * than empty: returning an empty vocabulary would silently disarm the arm
 * (business-rules.md BR-3).
 */
function parseValueSets(text: string): Result<readonly ValueSetDefinition[], SpecParseFailure> {
  if (!MODULE_HEADER.test(text)) {
    return err<SpecParseFailure>({ detail: "no ---- MODULE header: not a TLA+ module" });
  }
  const definitions: ValueSetDefinition[] = [];
  const scanner = new RegExp(VALUE_SET_START.source, "g");
  let match = scanner.exec(text);
  while (match !== null) {
    const open = scanner.lastIndex - 1;
    const close = text.indexOf("}", open);
    if (close === -1) {
      return err<SpecParseFailure>({ detail: `unterminated value set: ${match[2] as string}` });
    }
    const body = text.slice(open + 1, close);
    if (LITERAL_BODY.test(body)) {
      definitions.push({ name: match[2] as string, literals: new Set(literalsIn(body)) });
    }
    match = scanner.exec(text);
  }
  return ok(definitions);
}

const UNION_DECLARATION = /(?:"[^"\n]*"[ \t\n]*\|[ \t\n]*)+"[^"\n]*"/g;

/**
 * The literal clusters of an implementation source: the literals a single line
 * enumerates together, plus the members of one union type declaration even when
 * it is wrapped across lines. Two forms, one shape — a set of literals that the
 * implementation treats as alternatives of the same concept.
 */
function literalClusters(source: string): readonly LiteralCluster[] {
  const clusters = new Map<string, LiteralCluster>();
  const add = (literals: readonly string[], line: number, snippet: string): void => {
    const unique = new Set(literals);
    if (unique.size < 2) return;
    const key = `${line}:${[...unique].sort().join("|")}`;
    if (!clusters.has(key)) clusters.set(key, { literals: unique, line, snippet: snippet.trim().slice(0, 200) });
  };

  for (const [index, text] of source.split("\n").entries()) {
    add(literalsIn(text), index + 1, text);
  }

  for (const match of source.matchAll(UNION_DECLARATION)) {
    const index = match.index ?? 0;
    const line = source.slice(0, index).split("\n").length;
    add(literalsIn(match[0]), line, match[0].split("\n").join(" "));
  }
  return [...clusters.values()];
}

/**
 * Drift: the implementation enumerates a declared value set *and more*.
 *
 * The firing condition is the FD's `|C ∩ S| ≥ 2 ∧ C ⊄ S` sharpened on both
 * sides so that the negative half of the corpus stays negative:
 *   - S is the model's whole string vocabulary (every declared value set), so a
 *     cluster that only re-enumerates another set of the same model is not drift;
 *   - the cluster must cover at least one declared set of size ≥ 2 *in full*,
 *     which is what makes it the same enumeration rather than two concepts that
 *     happen to share a word.
 * Both are strictly stronger than `|C ∩ S| ≥ 2 ∧ C ⊄ S` (a covered set of size
 * ≥ 2 already puts two of its members in the intersection), so every firing
 * here also satisfies the FD's form. Measured (2026-08-20): without the
 * refinement the predicate fires on MirrorLifecycle's own governed sources —
 * `MirrorProjectSyncState` shares two statuses with `Statuses`, and
 * `MirrorOperation` is a superset of `NonCloseOps` — which the FD's two-sided
 * acceptance rules out.
 */
function detectValueSetDrift(
  valueSets: readonly ValueSetDefinition[],
  source: string,
): readonly DriftFinding[] {
  if (valueSets.length === 0) return [];
  const vocabulary = new Set<string>();
  for (const set of valueSets) for (const literal of set.literals) vocabulary.add(literal);

  const findings: DriftFinding[] = [];
  for (const cluster of literalClusters(source)) {
    const covered = valueSets.filter(
      (set) => set.literals.size >= 2 && [...set.literals].every((literal) => cluster.literals.has(literal)),
    );
    if (covered.length === 0) continue;
    const unknown = [...cluster.literals].filter((literal) => !vocabulary.has(literal));
    if (unknown.length === 0) continue;
    findings.push({
      coveredValueSets: covered.map((set) => set.name),
      cluster: [...cluster.literals].sort(),
      unknownLiterals: unknown.sort(),
      line: cluster.line,
      snippet: cluster.snippet,
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Arm 1(b): the checked-property class
// ---------------------------------------------------------------------------

/**
 * Whether the model's config checks temporal properties or invariants alone.
 * A report surface, never a firing condition: it tells the ruling how much the
 * registered check could have seen (business-logic-model.md §2(b)).
 */
export type PropertyClass = "invariants-only" | "has-properties";

const CFG_DIRECTIVE = /^[ \t]*(SPECIFICATION|SPEC|INVARIANTS?|PROPERT(?:Y|IES)|CONSTANTS?|INIT|NEXT)\b/m;
const CFG_PROPERTY = /^[ \t]*PROPERT(?:Y|IES)\b/m;

function classifyProperties(cfgText: string): Result<PropertyClass, SpecParseFailure> {
  if (!CFG_DIRECTIVE.test(cfgText)) {
    return err<SpecParseFailure>({ detail: "no TLC config directive found: not a .cfg" });
  }
  return ok(CFG_PROPERTY.test(cfgText) ? "has-properties" : "invariants-only");
}

// ---------------------------------------------------------------------------
// Arm 1(c): vocabulary self-consistency
// ---------------------------------------------------------------------------

export interface DeclaredVocabulary {
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}

export interface VocabularyGaps {
  readonly missingInvariants: readonly string[];
  readonly missingVariables: readonly string[];
}

const DEFINITION = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*==/gm;
// Deliberately not multiline: the block runs to the next blank line or to the
// end of the module, and `$` under `m` would end it at the first line break —
// which silently drops every continuation line of a wrapped VARIABLES list.
const VARIABLES_BLOCK = /(?:^|\n)VARIABLES?\b([\s\S]*?)(?:\n[ \t]*\n|$)/g;
const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;

/**
 * The registered vocabulary against the module that is supposed to define it.
 * A name the module does not define makes the whole judgement undecidable
 * upstream (BR-3); this predicate only names the gaps.
 */
function checkVocabulary(
  specTexts: readonly string[],
  vocabulary: DeclaredVocabulary,
): VocabularyGaps {
  const defined = new Set<string>();
  const variables = new Set<string>();
  for (const text of specTexts) {
    for (const match of text.matchAll(DEFINITION)) defined.add(match[1] as string);
    for (const block of text.matchAll(VARIABLES_BLOCK)) {
      for (const identifier of (block[1] as string).matchAll(IDENTIFIER)) variables.add(identifier[0]);
    }
  }
  return {
    missingInvariants: vocabulary.namedInvariants.filter((name) => !defined.has(name)),
    missingVariables: vocabulary.traceStateVariables.filter((name) => !variables.has(name)),
  };
}

// ---------------------------------------------------------------------------
// Arm 2: defect recurrence
// ---------------------------------------------------------------------------

/**
 * One distinct governed file named by a bug issue is enough to force the
 * authoring evaluation. Measured over the whole issue-evidence corpus
 * (2026-08-20): 0 intersections for 260817-inception-cost-batch and 2 for
 * 260818-priority-bug-batch-4, so the threshold sits strictly inside the
 * observed range (0 < 1 < 2 — business-rules.md BR-6).
 */
export const DEFECT_RECURRENCE_THRESHOLD = 1;

export interface DefectRecurrenceReport {
  readonly fired: boolean;
  readonly threshold: number;
  readonly intersections: readonly string[];
  readonly bugIssues: readonly number[];
}

export interface EvidenceParseFailure {
  readonly detail: string;
}

const ISSUE_HEADING = /^## Issue #(\d+):[ \t]*(.*)$/gm;
const BUG_TITLE = /^bug[(:]/;

interface IssueSection {
  readonly issue: number;
  readonly title: string;
  readonly body: string;
}

function issueSections(text: string): readonly IssueSection[] {
  const headings = [...text.matchAll(ISSUE_HEADING)];
  return headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = index + 1 < headings.length ? (headings[index + 1]?.index ?? text.length) : text.length;
    return {
      issue: Number.parseInt(heading[1] as string, 10),
      title: (heading[2] as string).trim(),
      body: text.slice(start, end),
    };
  });
}

/**
 * The recurrence arm: bug issues in the supplied evidence that name a governed
 * implementation file. An evidence file with no issue section at all is a parse
 * failure — "nothing to intersect" and "cannot read" are different answers and
 * are never folded together (BR-3).
 */
function evaluateDefectRecurrence(
  evidenceText: string,
  governedPaths: readonly string[],
): Result<DefectRecurrenceReport, EvidenceParseFailure> {
  const sections = issueSections(evidenceText);
  if (sections.length === 0) {
    return err<EvidenceParseFailure>({ detail: "no `## Issue #<n>:` section found in the issue evidence" });
  }
  const bugs = sections.filter((section) => BUG_TITLE.test(section.title));
  const intersections = new Set<string>();
  const bugIssues: number[] = [];
  for (const bug of bugs) {
    bugIssues.push(bug.issue);
    for (const path of governedPaths) if (bug.body.includes(path)) intersections.add(path);
  }
  return ok({
    fired: intersections.size >= DEFECT_RECURRENCE_THRESHOLD,
    threshold: DEFECT_RECURRENCE_THRESHOLD,
    intersections: [...intersections].sort(),
    bugIssues,
  });
}

// ---------------------------------------------------------------------------
// The pin-set coverage check
// ---------------------------------------------------------------------------

export interface EntriesExtensionProposal {
  readonly kind: "entries-extension";
  readonly models: readonly string[];
  readonly paths: readonly string[];
}

export type CoverageOutcome =
  | { readonly kind: "not-performed"; readonly note: string }
  | {
      readonly kind: "performed";
      readonly uncovered: readonly string[];
      readonly proposal: EntriesExtensionProposal | null;
    };

/**
 * Which of the changed files the governed entries do not cover. A gap is
 * recorded and proposed for a ruling; it never reclassifies the change to
 * `non-target` and never halts (BR-5 / #3186 close condition 2).
 */
function evaluateCoverage(
  changedPaths: readonly string[],
  governedPaths: readonly string[],
  models: readonly string[],
): CoverageOutcome {
  const governed = new Set(governedPaths);
  const uncovered = [...new Set(changedPaths.filter((path) => !governed.has(path)))].sort();
  return {
    kind: "performed",
    uncovered,
    proposal: uncovered.length === 0 ? null : { kind: "entries-extension", models: [...models], paths: uncovered },
  };
}

// ---------------------------------------------------------------------------
// The assembled arm stage
// ---------------------------------------------------------------------------

/** A file the arms read, or the reason it could not be read. */
export interface SourceFile {
  readonly path: string;
  readonly text: string | null;
}

/** Everything the arms need about one registered model. */
export interface GovernedModelSources {
  readonly name: string;
  readonly spec: SourceFile;
  readonly auxiliaries: readonly SourceFile[];
  readonly cfg: SourceFile;
  readonly vocabulary: DeclaredVocabulary | null;
  readonly entries: readonly SourceFile[];
}

/**
 * The model-map declarations the arms judge. `unavailable` covers a map the
 * strict schema cannot read (a fixture map, a legacy map): the arms then report
 * that they were not evaluated instead of reporting a silent non-fire.
 */
export type ModelSourceDeclarations =
  | { readonly kind: "available"; readonly models: readonly GovernedModelSources[]; readonly governedPaths: readonly string[] }
  | { readonly kind: "unavailable"; readonly detail: string };

export interface ArmsSources {
  readonly declarations: ModelSourceDeclarations;
  /** `null` when `--issue-evidence` was not supplied (the normal non-issue-first case). */
  readonly issueEvidence: SourceFile | null;
  /** `null` when `--changed` was not supplied. */
  readonly changedPaths: readonly string[] | null;
}

export interface ModelDriftReport {
  readonly model: string;
  readonly propertyClass: PropertyClass;
  readonly findings: readonly DriftFinding[];
}

export type VocabularyDriftOutcome =
  | { readonly kind: "not-evaluated"; readonly detail: string }
  | { readonly kind: "evaluated"; readonly fired: boolean; readonly models: readonly ModelDriftReport[] };

export type DefectRecurrenceOutcome =
  | { readonly kind: "not-supplied"; readonly note: string }
  | { readonly kind: "not-evaluated"; readonly detail: string }
  | ({ readonly kind: "evaluated" } & DefectRecurrenceReport);

export interface RevisionEvaluation {
  readonly required: boolean;
  readonly reasons: readonly string[];
}

export interface ArmsAssessment {
  readonly vocabularyDrift: VocabularyDriftOutcome;
  readonly defectRecurrence: DefectRecurrenceOutcome;
  readonly coverage: CoverageOutcome;
  readonly revisionEvaluation: RevisionEvaluation;
}

export type ArmsFailure =
  | { readonly kind: "model-source-unreadable"; readonly model: string; readonly path: string }
  | { readonly kind: "model-source-unparseable"; readonly model: string; readonly path: string; readonly detail: string }
  | {
      readonly kind: "model-vocabulary-inconsistent";
      readonly model: string;
      readonly missingInvariants: readonly string[];
      readonly missingVariables: readonly string[];
    }
  | { readonly kind: "issue-evidence-unreadable"; readonly path: string }
  | { readonly kind: "issue-evidence-unparseable"; readonly path: string; readonly detail: string };

const COVERAGE_NOT_PERFORMED = "coverage check not performed: no --changed file set was supplied";

function driftForModel(model: GovernedModelSources): Result<ModelDriftReport, ArmsFailure> {
  const specs: string[] = [];
  for (const file of [model.spec, ...model.auxiliaries]) {
    if (file.text === null) return err<ArmsFailure>({ kind: "model-source-unreadable", model: model.name, path: file.path });
    specs.push(file.text);
  }
  if (model.cfg.text === null) {
    return err<ArmsFailure>({ kind: "model-source-unreadable", model: model.name, path: model.cfg.path });
  }

  const valueSets: ValueSetDefinition[] = [];
  for (const [index, text] of specs.entries()) {
    const parsed = parseValueSets(text);
    if (!parsed.ok) {
      const path = index === 0 ? model.spec.path : (model.auxiliaries[index - 1] as SourceFile).path;
      return err<ArmsFailure>({
        kind: "model-source-unparseable",
        model: model.name,
        path,
        detail: parsed.error.detail,
      });
    }
    valueSets.push(...parsed.value);
  }

  const classified = classifyProperties(model.cfg.text);
  if (!classified.ok) {
    return err<ArmsFailure>({
      kind: "model-source-unparseable",
      model: model.name,
      path: model.cfg.path,
      detail: classified.error.detail,
    });
  }

  if (model.vocabulary !== null) {
    const gaps = checkVocabulary(specs, model.vocabulary);
    if (gaps.missingInvariants.length > 0 || gaps.missingVariables.length > 0) {
      return err<ArmsFailure>({ kind: "model-vocabulary-inconsistent", model: model.name, ...gaps });
    }
  }

  const findings: DriftFinding[] = [];
  for (const entry of model.entries) {
    if (entry.text === null) {
      return err<ArmsFailure>({ kind: "model-source-unreadable", model: model.name, path: entry.path });
    }
    findings.push(...detectValueSetDrift(valueSets, entry.text));
  }
  return ok({ model: model.name, propertyClass: classified.value, findings });
}

/**
 * The arm stage: run both arms and the coverage check over the models the
 * declaration intersects. Every arm answers with an explicit outcome — fired,
 * not fired, not supplied, or not evaluated — so a non-fire is never confused
 * with an unanswered question, and every undecidable input is a typed failure
 * the caller must halt on (BR-3 / NFR-2).
 */
function assess(
  intersectedModels: readonly string[],
  sources: ArmsSources,
): Result<ArmsAssessment, ArmsFailure> {
  const declarations = sources.declarations;
  const reasons: string[] = [];

  let vocabularyDrift: VocabularyDriftOutcome;
  if (declarations.kind === "unavailable") {
    vocabularyDrift = { kind: "not-evaluated", detail: declarations.detail };
  } else {
    const selected = declarations.models.filter((model) => intersectedModels.includes(model.name));
    const reports: ModelDriftReport[] = [];
    for (const model of selected) {
      const report = driftForModel(model);
      if (!report.ok) return report;
      reports.push(report.value);
    }
    const fired = reports.some((report) => report.findings.length > 0);
    vocabularyDrift = { kind: "evaluated", fired, models: reports };
    if (fired) {
      for (const report of reports) {
        for (const finding of report.findings) {
          reasons.push(
            `vocabulary drift: ${report.model} does not know ${finding.unknownLiterals.join(", ")} enumerated with ${finding.coveredValueSets.join(", ")} at line ${finding.line}`,
          );
        }
      }
    }
  }

  let defectRecurrence: DefectRecurrenceOutcome;
  if (sources.issueEvidence === null) {
    defectRecurrence = { kind: "not-supplied", note: "no --issue-evidence path was supplied" };
  } else if (sources.issueEvidence.text === null) {
    return err<ArmsFailure>({ kind: "issue-evidence-unreadable", path: sources.issueEvidence.path });
  } else if (declarations.kind === "unavailable") {
    defectRecurrence = { kind: "not-evaluated", detail: declarations.detail };
  } else {
    const evaluated = evaluateDefectRecurrence(sources.issueEvidence.text, declarations.governedPaths);
    if (!evaluated.ok) {
      return err<ArmsFailure>({
        kind: "issue-evidence-unparseable",
        path: sources.issueEvidence.path,
        detail: evaluated.error.detail,
      });
    }
    defectRecurrence = { kind: "evaluated", ...evaluated.value };
    if (evaluated.value.fired) {
      reasons.push(
        `defect recurrence: bug issues ${evaluated.value.bugIssues.join(", ")} name governed ${evaluated.value.intersections.join(", ")}`,
      );
    }
  }

  const coverage: CoverageOutcome =
    sources.changedPaths === null
      ? { kind: "not-performed", note: COVERAGE_NOT_PERFORMED }
      : declarations.kind === "unavailable"
        ? { kind: "not-performed", note: `governed entries unavailable: ${declarations.detail}` }
        : evaluateCoverage(sources.changedPaths, declarations.governedPaths, intersectedModels);

  return ok({
    vocabularyDrift,
    defectRecurrence,
    coverage,
    revisionEvaluation: { required: reasons.length > 0, reasons },
  });
}

export const ApplicabilityArms = {
  parseValueSets,
  detectValueSetDrift,
  classifyProperties,
  checkVocabulary,
  evaluateDefectRecurrence,
  evaluateCoverage,
  assess,
} as const;
