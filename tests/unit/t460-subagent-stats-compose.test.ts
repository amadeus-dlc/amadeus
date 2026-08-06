// covers: function:composeStatsReport, function:renderStatsText
//
// t460 — Issue #2279 (U3 subagent-stats). The aggregation CLI's pure core:
// composeStatsReport folds a scanned audit corpus into a SubagentStatsReport
// and renderStatsText draws the five-section text output from that report
// alone (BR-U3-5). Both are pure functions, so the whole classification and
// accounting contract is measured in-process by bun --coverage
// (cid:code-generation:fs-tests-integration-first — the FS-touching scan phase
// and the CLI spawn live in t461's integration layer).
//
// The verdict rule for old vs new rows is load-bearing (BR-U3-3):
//   1. a valid `Type Verdict` attribute (4-value union) is ADOPTED — the
//      verdict recorded at write time wins; a union-non-conforming value falls
//      through to reclassification and counts as a mismatch;
//   2. rows without the attribute are reclassified at aggregation time via the
//      normalizeAgentType-equivalent trim + "unknown" fallback and U1's
//      classifyAgentType (domain-entities invariant 3 — every completed row
//      lands in exactly one verdict bucket);
//   3. attribute-vs-reclassification disagreements are counted, never edited
//      (append-only reading side).
//
// Model accounting is ADR-5's reading side: a present non-empty `Model`
// attribute counts under byModel, everything else is the unresolved bucket
// (invariant 4: unresolvedModelCount + Σ byModel = completedTotal).

import { describe, expect, test } from "bun:test";
import {
  type AllowedSetResolution,
  BUILTIN_AGENT_TYPES,
} from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";
import {
  composeStatsReport,
  renderStatsText,
  type ScannedAudit,
  type SubagentAuditRecord,
} from "../../dist/claude/.claude/tools/amadeus-subagent-stats.ts";

const MEASURED_AT = "2026-08-06T01:23:45.678Z";
const SCAN_SCOPE = 'space "default" — amadeus/spaces/default/intents/*/audit/*.jsonl';

/** A resolution carrying the given persona names plus the builtin ledger. */
function resolutionWith(personaNames: readonly string[], warnings: readonly string[] = []): AllowedSetResolution {
  return {
    allowed: new Set<string>([...BUILTIN_AGENT_TYPES, ...personaNames]),
    personaCount: personaNames.length,
    warnings,
  };
}

const RESOLUTION = resolutionWith(["amadeus-developer-agent"]);

function completed(fields: Partial<Omit<SubagentAuditRecord, "event">>): SubagentAuditRecord {
  return { event: "SUBAGENT_COMPLETED", agentType: undefined, typeVerdict: undefined, model: undefined, modelSource: undefined, ...fields };
}

function started(agentType: string): SubagentAuditRecord {
  return { event: "SUBAGENT_STARTED", agentType, typeVerdict: undefined, model: undefined, modelSource: undefined };
}

function scannedOf(records: readonly SubagentAuditRecord[], over: Partial<ScannedAudit> = {}): ScannedAudit {
  return { shardCount: 1, unreadableShardCount: 0, parseSkippedCount: 0, records, ...over };
}

describe("t460 composeStatsReport — verdict decision (#2279)", () => {
  test("a valid Type Verdict attribute is adopted over reclassification (BR-U3-3.1)", () => {
    // The recorded verdict says "builtin" for an ad-hoc name the current ledger
    // does not carry — the write-time view wins, and the disagreement with the
    // current allowed set is counted, never edited (append-only reading side).
    const report = composeStatsReport(
      scannedOf([completed({ agentType: "builder-x1", typeVerdict: "builtin" })]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byVerdict.get("builtin")).toBe(1);
    expect(report.verdictMismatchCount).toBe(1);
  });

  test("a union-non-conforming Type Verdict falls to reclassification and counts as mismatch", () => {
    const report = composeStatsReport(
      scannedOf([completed({ agentType: "builder-x1", typeVerdict: "persona-v2" })]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byVerdict.get("outside-allowed-set")).toBe(1);
    expect(report.verdictMismatchCount).toBe(1);
  });

  test("an agreeing attribute is adopted without a mismatch", () => {
    const report = composeStatsReport(
      scannedOf([completed({ agentType: "amadeus-developer-agent", typeVerdict: "persona" })]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byVerdict.get("persona")).toBe(1);
    expect(report.verdictMismatchCount).toBe(0);
  });

  test("old rows are reclassified at aggregation time with the trim + unknown fallback", () => {
    const report = composeStatsReport(
      scannedOf([
        completed({ agentType: "amadeus-developer-agent" }),
        completed({ agentType: "general-purpose" }),
        completed({ agentType: "builder-x1" }),
        completed({ agentType: undefined }),
        completed({ agentType: "" }),
        completed({ agentType: "   " }),
      ]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byVerdict.get("persona")).toBe(1);
    expect(report.byVerdict.get("builtin")).toBe(1);
    expect(report.byVerdict.get("outside-allowed-set")).toBe(1);
    // Missing, empty, and whitespace-only Agent Type all normalize to "unknown".
    expect(report.byVerdict.get("unknown-type")).toBe(3);
    expect(report.verdictMismatchCount).toBe(0);
    // Invariant 3: the verdict buckets partition the completed total.
    const sum = [...report.byVerdict.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.completedTotal);
    expect(report.completedTotal).toBe(6);
  });

  test("a missing agents dir (empty allowed set) still classifies builtins and flags personas (fail-open read side)", () => {
    const degraded = resolutionWith([], ["agents dir unreadable (/x): ENOENT"]);
    const report = composeStatsReport(
      scannedOf([completed({ agentType: "coder" }), completed({ agentType: "amadeus-developer-agent" })]),
      degraded,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byVerdict.get("builtin")).toBe(1);
    expect(report.byVerdict.get("outside-allowed-set")).toBe(1);
    expect(report.allowedSetWarnings).toEqual(["agents dir unreadable (/x): ENOENT"]);
  });

  test("STARTED rows are tallied aside, never into the verdict buckets (ADR-6)", () => {
    const report = composeStatsReport(
      scannedOf([
        completed({ agentType: "coder" }),
        started("coder"),
      ]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.completedTotal).toBe(1);
    expect(report.startedTotal).toBe(1);
    const sum = [...report.byVerdict.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(1);
  });
});

describe("t460 composeStatsReport — type ranking and model axes (#2279)", () => {
  test("byType ranks distinct values by count descending, each with its verdict", () => {
    const report = composeStatsReport(
      scannedOf([
        completed({ agentType: "builder-x1" }),
        completed({ agentType: "amadeus-developer-agent" }),
        completed({ agentType: "amadeus-developer-agent" }),
        completed({ agentType: "amadeus-developer-agent" }),
        completed({ agentType: "coder" }),
        completed({ agentType: "coder" }),
      ]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byType.map((r) => [r.agentType, r.verdict, r.count])).toEqual([
      ["amadeus-developer-agent", "persona", 3],
      ["coder", "builtin", 2],
      ["builder-x1", "outside-allowed-set", 1],
    ]);
  });

  test("the normalized unknown type ranks under its own row", () => {
    const report = composeStatsReport(
      scannedOf([completed({ agentType: undefined }), completed({ agentType: "" })]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byType).toEqual([{ agentType: "unknown", verdict: "unknown-type", count: 2 }]);
  });

  test("model accounting: present Model counts, absent falls into the unresolved bucket (ADR-5)", () => {
    const report = composeStatsReport(
      scannedOf([
        completed({ agentType: "coder", model: "opus", modelSource: "agent-pin" }),
        completed({ agentType: "coder", model: "opus", modelSource: "agent-pin" }),
        completed({ agentType: "coder", model: "sonnet", modelSource: "harness" }),
        completed({ agentType: "coder" }),
      ]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byModel.get("opus")).toBe(2);
    expect(report.byModel.get("sonnet")).toBe(1);
    expect(report.byModelSource.get("agent-pin")).toBe(2);
    expect(report.byModelSource.get("harness")).toBe(1);
    expect(report.unresolvedModelCount).toBe(1);
    // Invariant 4: the model axis partitions the completed total.
    const modelSum = [...report.byModel.values()].reduce((a, b) => a + b, 0);
    expect(report.unresolvedModelCount + modelSum).toBe(report.completedTotal);
  });

  test("a Model without Model Source counts on the model axis only (degeneracy, invariant 4 note)", () => {
    const report = composeStatsReport(
      scannedOf([completed({ agentType: "coder", model: "opus" })]),
      RESOLUTION,
      MEASURED_AT,
      SCAN_SCOPE,
    );
    expect(report.byModel.get("opus")).toBe(1);
    expect([...report.byModelSource.values()].reduce((a, b) => a + b, 0)).toBe(0);
    expect(report.unresolvedModelCount).toBe(0);
  });
});

describe("t460 renderStatsText — the five sections (BR-U3-5)", () => {
  const report = composeStatsReport(
    scannedOf(
      [
        completed({ agentType: "amadeus-developer-agent", model: "opus", modelSource: "agent-pin" }),
        completed({ agentType: "builder-x1" }),
        completed({ agentType: undefined }),
        started("coder"),
      ],
      { shardCount: 3, parseSkippedCount: 2 },
    ),
    RESOLUTION,
    MEASURED_AT,
    SCAN_SCOPE,
  );
  const text = renderStatsText(report);

  test("the measurement-ref header pins time, scope, shards, and totals (FR-4b / AC-6)", () => {
    expect(text).toContain(MEASURED_AT);
    expect(text).toContain(SCAN_SCOPE);
    expect(text).toContain("3");
    expect(text).toContain("3 completed");
    expect(text).toContain("1 started");
  });

  test("all four verdicts are listed, zeros included", () => {
    expect(text).toContain("persona");
    expect(text).toContain("builtin");
    expect(text).toContain("unknown-type");
    expect(text).toContain("outside-allowed-set");
  });

  test("the type ranking and the model sections carry the unresolved bucket (AC-6)", () => {
    expect(text).toContain("amadeus-developer-agent");
    expect(text).toContain("builder-x1");
    expect(text).toContain("unresolved");
  });

  test("the notes section prints every count even when zero", () => {
    expect(text).toContain("parse-skip");
    expect(text).toContain("2");
    expect(text).toContain("verdict-mismatch");
    expect(text).toContain("allowed-set warnings");
    expect(text).toContain("unreadable shards");
  });

  test("the Model/Model Source asymmetry note appears only when positive", () => {
    const balanced = renderStatsText(
      composeStatsReport(
        scannedOf([completed({ agentType: "coder", model: "opus", modelSource: "agent-pin" })]),
        RESOLUTION,
        MEASURED_AT,
        SCAN_SCOPE,
      ),
    );
    expect(balanced).not.toContain("asymmetr");
    const skewed = renderStatsText(
      composeStatsReport(scannedOf([completed({ agentType: "coder", model: "opus" })]), RESOLUTION, MEASURED_AT, SCAN_SCOPE),
    );
    expect(skewed).toContain("asymmetr");
  });

  test("an empty corpus renders a zero report without inventing values", () => {
    const empty = renderStatsText(composeStatsReport(scannedOf([]), RESOLUTION, MEASURED_AT, SCAN_SCOPE));
    expect(empty).toContain("0 completed");
    expect(empty).toContain("unresolved");
  });
});
