// covers: file:packages/framework/core/tools/amadeus-completion-report.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  formatSummaryBuildError,
  renderAutoDecisionSummaryMarkdown,
  type SummaryDoc,
} from "../../packages/framework/core/tools/amadeus-completion-report.ts";

function summary(overrides: Partial<SummaryDoc> = {}): SummaryDoc {
  return {
    recordDir: "/tmp/record",
    generatedAt: "2026-08-15T00:00:00.000Z",
    totalAutoDecided: 0,
    byBasisKind: {
      "mode-semi": 0,
      "grant-gate": 0,
      "confirmed-policy": 0,
      norm: 0,
      history: 0,
      "solo-election": 0,
      "agent-recommendation": 0,
    },
    byReviewState: {
      "not-applicable": 0,
      unreviewed: 0,
      accepted: 0,
      flagged: 0,
    },
    countMismatch: null,
    ...overrides,
  };
}

describe("renderAutoDecisionSummaryMarkdown (R-2: mechanical transcription only)", () => {
  test("transcribes totals and per-basisKind counts verbatim", () => {
    const doc = summary({
      totalAutoDecided: 5,
      byBasisKind: {
        "mode-semi": 0,
        "grant-gate": 3,
        "confirmed-policy": 2,
        norm: 0,
        history: 0,
        "solo-election": 0,
        "agent-recommendation": 0,
      },
    });
    const md = renderAutoDecisionSummaryMarkdown(doc);
    expect(md).toContain("Total AUTO_DECIDED: 5");
    expect(md).toMatch(/\| grant-gate \| 3 \|/);
    expect(md).toMatch(/\| confirmed-policy \| 2 \|/);
    expect(md).toMatch(/\| mode-semi \| 0 \|/);
    expect(md).not.toContain("Count Mismatch");
  });

  test("R-8: a non-null countMismatch is surfaced in the rendered document, never silently dropped", () => {
    const doc = summary({
      totalAutoDecided: 4,
      countMismatch: { auditRows: 4, listedItems: 3 },
    });
    const md = renderAutoDecisionSummaryMarkdown(doc);
    expect(md).toContain("Count Mismatch");
    expect(md).toContain("Audit rows: 4, listed items: 3");
  });
});

describe("formatSummaryBuildError", () => {
  test("formats every SummaryBuildError kind distinctly", () => {
    expect(formatSummaryBuildError({ kind: "record-dir-unresolved" })).toBe("record-dir-unresolved");
    expect(formatSummaryBuildError({ kind: "list-api-error", detail: "boom" })).toBe("list-api-error:boom");
    expect(formatSummaryBuildError({ kind: "write-failed", detail: "disk full" })).toBe("write-failed:disk full");
  });
});
