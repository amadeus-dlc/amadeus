import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import type { AlloyAssessment, DecisionResult, VerifiedMatrixView } from "./eligibility.ts";

// The report renderer only displays the Evaluator output. It never recomputes eligibility or
// Pareto, never publishes an unverified model, and embeds no raw stream, env, credential, home,
// or sealed content. Every matrix / cost / decision / reversal-mapping row must reach a command
// receipt, CI run/job, and artifact/bundle before publish.

export const RENDERER_VERSION = "amadeus.formal-verif.report-renderer.v1";
const REPORT_DOMAIN = "amadeus.formal-verif.report-model.v1";

export interface ReversalConditionRef { sourceIdentity: string; ordinal: number; textHash: string }
export interface ReversalSource { sourceIdentity: string; conditions: readonly ReversalConditionRef[] }
export interface ReversalConditionMapping { condition: ReversalConditionRef; supports: readonly string[]; refutes: readonly string[] }
export interface ReversalMappingError { kind: "ReversalMappingError"; code: string; findings: readonly string[] }

export interface ReportRow { rowId: string; semanticKey: string; contentHash: string }
export interface TraceIndexEntry { reportRowId: string; semanticKey: string; commandReceipt: string; ciRunJob: string; artifactRef: string; contentHash: string }
export type TraceVerificationResult =
  | { kind: "VerifiedTraceIndex"; entries: readonly TraceIndexEntry[] }
  | { kind: "InvalidTraceIndex"; findings: readonly string[] };

export interface ReportModel {
  reportIdentity: string;
  finalDecision: DecisionResult;
  alloy: AlloyAssessment;
  reversalMappings: readonly ReversalConditionMapping[];
  rows: readonly ReportRow[];
}
export interface RenderedReport { reportIdentity: string; canonicalJson: Uint8Array; markdown: string; rendererVersion: string }
export interface ReportFailure { kind: "ReportFailure"; code: string; findings: readonly string[] }

function rowIdOf(semanticKey: string): string { return canonicalIdentity({ semanticKey }, "amadeus.formal-verif.report-row.v1").sha256; }
function hashOf(payload: unknown): string { return canonicalIdentity(payload, "amadeus.formal-verif.report-row-content.v1").sha256; }

// Requires a bijection between the 6-body grilling source conditions and the mappings: every
// source condition is mapped exactly once with matching ordinal and verbatim text hash, no
// invented condition, no source drift, and each mapping carries non-empty support/refute refs.
export function verifyReversalMappings(source: ReversalSource, mappings: readonly ReversalConditionMapping[]): Result<readonly ReversalConditionMapping[], ReversalMappingError> {
  const findings: string[] = [];
  const sourceByOrdinal = new Map(source.conditions.map((condition) => [condition.ordinal, condition]));
  const mappedOrdinals = new Set<number>();
  for (const mapping of mappings) {
    if (mapping.condition.sourceIdentity !== source.sourceIdentity) findings.push(`source drift at ordinal ${mapping.condition.ordinal}`);
    const origin = sourceByOrdinal.get(mapping.condition.ordinal);
    if (!origin) { findings.push(`invented condition ordinal ${mapping.condition.ordinal}`); continue; }
    if (origin.textHash !== mapping.condition.textHash) findings.push(`text hash drift at ordinal ${mapping.condition.ordinal}`);
    if (mappedOrdinals.has(mapping.condition.ordinal)) findings.push(`duplicate mapping for ordinal ${mapping.condition.ordinal}`);
    mappedOrdinals.add(mapping.condition.ordinal);
    if (mapping.supports.length + mapping.refutes.length === 0) findings.push(`empty support/refute refs at ordinal ${mapping.condition.ordinal}`);
  }
  for (const condition of source.conditions) if (!mappedOrdinals.has(condition.ordinal)) findings.push(`unmapped source condition ordinal ${condition.ordinal}`);
  if (findings.length > 0) return { ok: false, error: { kind: "ReversalMappingError", code: "REVERSAL_BIJECTION_FAILED", findings } };
  return { ok: true, value: mappings };
}

export function buildReportModel(input: { view: VerifiedMatrixView; decision: DecisionResult; alloy: AlloyAssessment; reversalMappings: readonly ReversalConditionMapping[] }): ReportModel {
  const rows: ReportRow[] = [];
  const addRow = (semanticKey: string, payload: unknown) => rows.push({ rowId: rowIdOf(semanticKey), semanticKey, contentHash: hashOf(payload) });
  for (const cell of input.view.cells) addRow(`cell:${cell.cellRef}`, cell);
  addRow("decision", input.decision);
  if (input.decision.kind === "ValidDecision" && input.decision.eligiblePairCosts) {
    addRow("cost:tla", input.decision.eligiblePairCosts.tla);
    addRow("cost:ts", input.decision.eligiblePairCosts.ts);
  }
  for (const mapping of input.reversalMappings) addRow(`reversal:${mapping.condition.ordinal}`, mapping);
  const reportIdentity = canonicalIdentity({ decision: input.decision, alloy: input.alloy, reversalMappings: input.reversalMappings, rows }, REPORT_DOMAIN).sha256;
  return { reportIdentity, finalDecision: input.decision, alloy: input.alloy, reversalMappings: input.reversalMappings, rows };
}

function verifyRowTrace(row: ReportRow, matches: readonly TraceIndexEntry[]): readonly string[] {
  if (matches.length === 0) return [`missing trace for ${row.semanticKey}`];
  const findings: string[] = [];
  if (matches.length > 1) findings.push(`duplicate trace for ${row.semanticKey}`);
  const entry = matches[0]!;
  if (entry.commandReceipt.length === 0 || entry.ciRunJob.length === 0 || entry.artifactRef.length === 0) findings.push(`incomplete source refs for ${row.semanticKey}`);
  if (entry.contentHash !== row.contentHash) findings.push(`hash drift for ${row.semanticKey}`);
  if (entry.semanticKey !== row.semanticKey) findings.push(`semantic drift for ${row.semanticKey}`);
  return findings;
}

export function verifyTrace(model: ReportModel, traceIndex: readonly TraceIndexEntry[]): TraceVerificationResult {
  const byRowId = new Map<string, TraceIndexEntry[]>();
  for (const entry of traceIndex) {
    const bucket = byRowId.get(entry.reportRowId);
    if (bucket) bucket.push(entry);
    else byRowId.set(entry.reportRowId, [entry]);
  }
  const rowIds = new Set(model.rows.map((row) => row.rowId));
  const findings: string[] = [];
  for (const row of model.rows) findings.push(...verifyRowTrace(row, byRowId.get(row.rowId) ?? []));
  for (const entry of traceIndex) if (!rowIds.has(entry.reportRowId)) findings.push(`orphan trace entry ${entry.reportRowId}`);
  if (findings.length > 0) return { kind: "InvalidTraceIndex", findings };
  return { kind: "VerifiedTraceIndex", entries: traceIndex };
}

const MARKDOWN_META = new Set("\\`*_{}[]()<>#+-.!|");

function escapeMarkdown(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) out += " ";
    else if (MARKDOWN_META.has(char)) out += `\\${char}`;
    else out += char;
  }
  return out;
}

export function renderReport(model: ReportModel, trace: TraceVerificationResult): Result<RenderedReport, ReportFailure> {
  if (trace.kind !== "VerifiedTraceIndex") return { ok: false, error: { kind: "ReportFailure", code: "UNVERIFIED_TRACE", findings: trace.findings } };
  const decision = model.finalDecision.kind === "ValidDecision" ? model.finalDecision.finalDecision : model.finalDecision.code;
  const canonicalJson = canonicalIdentity({ reportIdentity: model.reportIdentity, decision: model.finalDecision, alloy: model.alloy, reversalMappings: model.reversalMappings, rows: model.rows }, REPORT_DOMAIN).bytes;
  const lines = [
    `# 形式検証実験レポート (${escapeMarkdown(model.reportIdentity)})`,
    `Final decision: ${escapeMarkdown(decision)}`,
    `Alloy trigger: ${escapeMarkdown(model.alloy.triggerState)}`,
    "",
    "| row | semantic key | content hash |",
    "| --- | --- | --- |",
    ...model.rows.map((row) => `| ${escapeMarkdown(row.rowId)} | ${escapeMarkdown(row.semanticKey)} | ${escapeMarkdown(row.contentHash)} |`),
  ];
  return { ok: true, value: { reportIdentity: model.reportIdentity, canonicalJson, markdown: `${lines.join("\n")}\n`, rendererVersion: RENDERER_VERSION } };
}
