// scripts/upstream-sync-closure.ts — C7 verification & ledger closure (U12,
// FR-0 / FR-7 items 23-24 / FR-8, NFR-5/6).
//
// The closure face of the upstream-sync intent. It has NO functional behaviour:
// it aggregates the test/docs/evidence that U01-U11 already landed, traces every
// non-SKIP upstream item to at least one automated test or explicit docs check,
// and PLANS the ledger transition. The three public seams are pure decision
// functions over data; the real INTENT_IN_PROGRESS / APPLIED write is a separate
// concern (the trace table and the planner are the gate, not a writer).
//
// SCOPE (U12). traceCoverage / assertPhaseVerification / planLedgerTransition are
// the public seams; classifyDisposition and resolveEvidence are internal helpers
// (E-OC1 ruling A). No functional implementation, no DB / network / AWS / UI, no
// new runtime dependency. gh is NOT used.
//
// TESTABILITY. Every function is pure. resolveEvidence takes an `exists` port so
// the real-filesystem sweep (the whole point of this unit — catching a traced
// path that does not exist) is driven in-process by the integration test.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Disposition = "ADOPT" | "ADAPT" | "SKIP";
export type Verdict = "PORTED" | "EQUIVALENT";
export type EvidenceKind = "test" | "docs";

export interface EvidenceRef {
  readonly kind: EvidenceKind;
  readonly path: string;
  // A regression/characterization test that pins current behaviour without an
  // implementation diff — required for an EQUIVALENT verdict.
  readonly characterization?: boolean;
}

export interface UpstreamItem {
  readonly id: string;
  readonly domain: string;
  readonly disposition: Disposition;
  readonly unit: string;
  readonly verdict: Verdict;
  readonly evidence: readonly EvidenceRef[];
}

// The number of non-SKIP items that MUST be traced. 30 catalog items - 6 SKIP.
export const REQUIRED_DISPOSITION_COUNT = 24;

// The verification gates that must all be green before an APPLIED transition
// (requirements.md NFR-5). Order is not significant.
export const REQUIRED_GATES = [
  "targeted-tests",
  "typecheck",
  "lint:check",
  "dist:check",
  "promote:self:check",
  "full-ci",
] as const;

// ---------------------------------------------------------------------------
// Trace catalogue — derived by measurement from the U01-U11 code-summaries.
// SKIP items carry no evidence and are exempt from tracing (FR-0 / Out of Scope).
// Paths are the ACTUAL landed paths (reconciled at closure): swarm landed as
// t251 (not the summary's intended t250), the reference plugin lives at
// tests/fixtures/plugins/test-pro/ (repo-root plugins/ stays absent by design).
// ---------------------------------------------------------------------------

const test = (path: string, characterization = false): EvidenceRef => ({ kind: "test", path, characterization });
const docs = (path: string): EvidenceRef => ({ kind: "docs", path });

export const UPSTREAM_ITEMS: readonly UpstreamItem[] = [
  // engine-correctness
  item("bolt-dag-selfheal", "engine-correctness", "ADAPT", "U02", "PORTED", [test("tests/unit/t247-runtime-recovery.test.ts"), test("tests/integration/t247-runtime-recovery.test.ts")]),
  item("gate-revision-backstop", "engine-correctness", "ADAPT", "U02", "PORTED", [test("tests/unit/t247-runtime-recovery.test.ts"), test("tests/integration/t247-runtime-recovery.test.ts")]),
  item("swarm-batch-advance", "engine-correctness", "ADAPT", "U03", "EQUIVALENT", [test("tests/integration/t251-swarm-and-next-stage.test.ts", true)]),
  item("help-routing", "engine-correctness", "ADAPT", "U04", "PORTED", [test("tests/unit/t246-routing-and-autonomy-guards.test.ts"), test("tests/integration/t246-routing-and-autonomy-guards.test.ts")]),
  item("compose-pending-freshness", "engine-correctness", "ADOPT", "U04", "PORTED", [test("tests/unit/t246-routing-and-autonomy-guards.test.ts"), test("tests/integration/t246-routing-and-autonomy-guards.test.ts")]),
  item("recompose-autonomy-guard", "engine-correctness", "ADOPT", "U04", "PORTED", [test("tests/unit/t246-routing-and-autonomy-guards.test.ts"), test("tests/integration/t246-routing-and-autonomy-guards.test.ts")]),
  // engine-features
  item("unit-kind-pruning", "engine-features", "ADAPT", "U01", "PORTED", [test("tests/unit/t248-stage-contract.test.ts"), test("tests/integration/t248-stage-contract-routing.test.ts")]),
  item("unit-major-iteration", "engine-features", "ADAPT", "U05", "PORTED", [test("tests/unit/t250-unit-iteration-and-scope-preview.test.ts"), test("tests/integration/t250-unit-iteration-and-scope-preview.test.ts")]),
  item("scope-cost-preview", "engine-features", "ADAPT", "U05", "PORTED", [test("tests/unit/t250-unit-iteration-and-scope-preview.test.ts"), test("tests/integration/t250-unit-iteration-and-scope-preview.test.ts")]),
  item("gate-next-stage-naming", "engine-features", "ADAPT", "U03", "PORTED", [test("tests/integration/t251-swarm-and-next-stage.test.ts"), test("tests/unit/t113.test.ts")]),
  // workspace-detection
  item("nested-root-detection", "workspace-detection", "ADAPT", "U06", "PORTED", [test("tests/unit/t249-workspace-inspection.test.ts"), test("tests/integration/t249-workspace-inspection.test.ts")]),
  item("submodule-detection", "workspace-detection", "ADAPT", "U06", "PORTED", [test("tests/unit/t249-workspace-inspection.test.ts"), test("tests/integration/t249-workspace-inspection.test.ts")]),
  // harness-integration
  item("execpath-spawn", "harness-integration", "ADOPT", "U07", "PORTED", [test("tests/unit/t231-harness-hook-correctness-seams.test.ts"), test("tests/integration/t231-harness-hook-correctness.test.ts")]),
  item("kiro-ide-hook-context", "harness-integration", "ADAPT", "U07", "PORTED", [test("tests/unit/t231-harness-hook-correctness-seams.test.ts"), test("tests/unit/t209-kiro-ide-dual-vocab.test.ts")]),
  item("project-dir-quoting", "harness-integration", "ADOPT", "U07", "PORTED", [test("tests/unit/t231-harness-hook-correctness-seams.test.ts"), test("tests/integration/t231-harness-hook-correctness.test.ts")]),
  // reviewer-quality
  item("reviewer-date-persona", "reviewer-quality", "ADOPT", "U08", "PORTED", [test("tests/unit/t245-reviewer-protocol-seams.test.ts"), test("tests/integration/t245-reviewer-protocol-production-path.test.ts")]),
  item("reviewer-read-scope", "reviewer-quality", "ADAPT", "U08", "PORTED", [test("tests/unit/t245-reviewer-protocol-seams.test.ts"), test("tests/integration/t245-reviewer-protocol-production-path.test.ts")]),
  // plugin-mechanism
  item("stage-schema-extensions", "plugin-mechanism", "ADAPT", "U01", "PORTED", [test("tests/unit/t248-stage-contract.test.ts"), test("tests/integration/t248-stage-contract-routing.test.ts")]),
  item("packager-plugin-projection", "plugin-mechanism", "ADAPT", "U09", "PORTED", [test("tests/unit/t-plugin-projection.test.ts"), test("tests/integration/t-plugin-projection-packaging.test.ts")]),
  item("plugin-compose-hook", "plugin-mechanism", "ADAPT", "U10", "PORTED", [test("tests/unit/t252-plugin-composition.test.ts"), test("tests/integration/t253-plugin-composition-fs.test.ts")]),
  item("test-pro-reference-plugin", "plugin-mechanism", "ADAPT", "U11", "PORTED", [test("tests/integration/t254-reference-plugin-lifecycle.test.ts"), test("tests/fixtures/plugins/test-pro/plugin.json")]),
  item("plugin-docs", "plugin-mechanism", "ADAPT", "U11", "PORTED", [docs("docs/guide/19-plugins.md"), docs("docs/guide/19-plugins.ja.md")]),
  // tests
  item("ported-tests", "tests", "ADAPT", "FR-7", "PORTED", [test("tests/integration/t254-reference-plugin-lifecycle.test.ts")]),
  // docs-generated
  item("docs-updates", "docs-generated", "ADAPT", "U11", "PORTED", [docs("docs/guide/19-plugins.md"), test("tests/unit/t174-docs-legacy-refs-gate.test.ts")]),
  // SKIP (trace-exempt) — 6 items
  item("learnings-memory-path", "engine-correctness", "SKIP", "-", "EQUIVALENT", []),
  item("optional-produces", "engine-features", "SKIP", "-", "EQUIVALENT", []),
  item("agent-model-key", "harness-integration", "SKIP", "-", "EQUIVALENT", []),
  item("dist-trees", "docs-generated", "SKIP", "-", "EQUIVALENT", []),
  item("roadmap-html", "docs-generated", "SKIP", "-", "EQUIVALENT", []),
  item("upstream-changelog", "docs-generated", "SKIP", "-", "EQUIVALENT", []),
];

export const TRACED_ITEMS: readonly UpstreamItem[] = UPSTREAM_ITEMS.filter((i) => i.disposition !== "SKIP");
export const SKIP_ITEMS: readonly UpstreamItem[] = UPSTREAM_ITEMS.filter((i) => i.disposition === "SKIP");

function item(id: string, domain: string, disposition: Disposition, unit: string, verdict: Verdict, evidence: readonly EvidenceRef[]): UpstreamItem {
  return { id, domain, disposition, unit, verdict, evidence };
}

// ---------------------------------------------------------------------------
// classifyDisposition — internal (E-OC1 A). A verdict is only sound if the
// evidence supports it: EQUIVALENT demands a characterization (regression) test;
// PORTED demands at least one test or docs check. Partial evidence is never
// promoted to EQUIVALENT.
// ---------------------------------------------------------------------------

export type DispositionVerdict =
  | { readonly kind: "equivalent" }
  | { readonly kind: "ported" }
  | { readonly kind: "insufficient"; readonly reason: string };

export function classifyDisposition(item: UpstreamItem): DispositionVerdict {
  if (item.evidence.length === 0) {
    return { kind: "insufficient", reason: `${item.id}: no evidence` };
  }
  if (item.verdict === "EQUIVALENT") {
    if (!item.evidence.some((e) => e.kind === "test" && e.characterization === true)) {
      return { kind: "insufficient", reason: `${item.id}: EQUIVALENT without characterization evidence` };
    }
    return { kind: "equivalent" };
  }
  return { kind: "ported" };
}

// ---------------------------------------------------------------------------
// traceCoverage — every non-SKIP item must trace to >= 1 test/docs check and
// classify soundly. 23/24 or a partial-EQUIVALENT is incomplete.
// ---------------------------------------------------------------------------

export type TraceResult =
  | { readonly kind: "complete"; readonly traced: number }
  | { readonly kind: "incomplete"; readonly traced: number; readonly missing: readonly string[] };

export function traceCoverage(items: readonly UpstreamItem[]): TraceResult {
  const traceable = items.filter((i) => i.disposition !== "SKIP");
  const missing: string[] = [];
  for (const it of traceable) {
    if (classifyDisposition(it).kind === "insufficient") missing.push(it.id);
  }
  const traced = traceable.length - missing.length;
  if (missing.length > 0 || traced < REQUIRED_DISPOSITION_COUNT) {
    return { kind: "incomplete", traced, missing };
  }
  return { kind: "complete", traced };
}

// ---------------------------------------------------------------------------
// resolveEvidence — the honest existence sweep. An evidence path that does not
// exist is reported, never fabricated as present. `exists` is injected so the
// integration test drives it against a real filesystem in-process.
// ---------------------------------------------------------------------------

export interface EvidenceResolution {
  readonly present: readonly string[];
  readonly missing: readonly { readonly itemId: string; readonly path: string }[];
}

export function resolveEvidence(items: readonly UpstreamItem[], exists: (path: string) => boolean): EvidenceResolution {
  const present: string[] = [];
  const missing: { itemId: string; path: string }[] = [];
  for (const it of items) {
    for (const e of it.evidence) {
      if (exists(e.path)) present.push(e.path);
      else missing.push({ itemId: it.id, path: e.path });
    }
  }
  return { present, missing };
}

// ---------------------------------------------------------------------------
// assertPhaseVerification — the same-SHA gate aggregator. All gates green,
// patch uncovered 0 (or a justified waiver), a comparison SHA present. A
// not-run / failed / stale gate, or an uncovered patch line, is never read as
// green.
// ---------------------------------------------------------------------------

export type GateStatus = "green" | "failed" | "not-run" | "stale";
export interface GateResult {
  readonly name: string;
  readonly status: GateStatus;
}
export interface VerificationRun {
  readonly gates: readonly GateResult[];
  readonly patchUncovered: number;
  readonly waiverJustified: boolean;
  readonly comparisonSha: string | null;
}
export type VerificationResult =
  | { readonly kind: "verified" }
  | { readonly kind: "failed"; readonly reasons: readonly string[] };

export function assertPhaseVerification(run: VerificationRun): VerificationResult {
  const reasons: string[] = [];
  const seen = new Set(run.gates.map((g) => g.name));
  for (const required of REQUIRED_GATES) {
    if (!seen.has(required)) reasons.push(`gate not run: ${required}`);
  }
  for (const g of run.gates) {
    if (g.status !== "green") reasons.push(`gate ${g.name}: ${g.status}`);
  }
  if (run.patchUncovered > 0 && !run.waiverJustified) {
    reasons.push(`patch coverage: ${run.patchUncovered} uncovered line(s) without a justified waiver`);
  }
  if (run.comparisonSha === null) reasons.push("missing final comparison SHA");
  return reasons.length > 0 ? { kind: "failed", reasons } : { kind: "verified" };
}

// ---------------------------------------------------------------------------
// planLedgerTransition — the closed-union transition planner (FR-8). Three
// conditions (24 dispositions, all gates green, final SHA) plan APPLIED. Mere
// incompleteness or any missing condition REJECTS with the ledger bytes
// unchanged and is NOT classified BLOCKED. Only a structured verification-failure
// or abandon plans a BLOCKED that never advances the baseline. Re-planning the
// same transition is a no-op — no duplicate history.
// ---------------------------------------------------------------------------

export type LedgerStatus = "PLANNED" | "INTENT_IN_PROGRESS" | "APPLIED" | "BLOCKED";
export interface Ledger {
  readonly status: LedgerStatus;
  readonly comparison_commit: string;
}
export type TerminalEvidence =
  | { readonly kind: "verification-failure"; readonly gate: string; readonly observed: string; readonly targetSha: string }
  | { readonly kind: "abandon"; readonly actor: string; readonly reason: string; readonly targetSha: string };
export interface CompletionEvidence {
  readonly dispositionCount: number;
  readonly requiredGatesGreen: boolean;
  readonly finalComparisonSha: string | null;
  readonly terminal?: TerminalEvidence;
}
export type LedgerTransitionResult =
  | { readonly kind: "reject"; readonly reason: string }
  | { readonly kind: "blocked"; readonly rationale: string; readonly targetSha: string }
  | { readonly kind: "applied"; readonly comparisonSha: string }
  | { readonly kind: "noop" };

export function planLedgerTransition(ledger: Ledger, evidence: CompletionEvidence): LedgerTransitionResult {
  if (evidence.terminal !== undefined) {
    const t = evidence.terminal;
    const rationale =
      t.kind === "verification-failure"
        ? `verification-failure: gate ${t.gate} observed ${t.observed}`
        : `abandon: ${t.actor} — ${t.reason}`;
    if (ledger.status === "BLOCKED") return { kind: "noop" };
    return { kind: "blocked", rationale, targetSha: t.targetSha };
  }
  const missing: string[] = [];
  if (evidence.dispositionCount !== REQUIRED_DISPOSITION_COUNT) {
    missing.push(`dispositions ${evidence.dispositionCount}/${REQUIRED_DISPOSITION_COUNT}`);
  }
  if (!evidence.requiredGatesGreen) missing.push("required gates not all green");
  const sha = evidence.finalComparisonSha;
  if (sha === null) missing.push("final comparison SHA absent");
  if (missing.length > 0 || sha === null) {
    return { kind: "reject", reason: `APPLIED refused: ${missing.join("; ")}` };
  }
  if (ledger.status === "APPLIED" && ledger.comparison_commit === sha) return { kind: "noop" };
  return { kind: "applied", comparisonSha: sha };
}
