// covers: otel:shadow-compare-production
//
// U7 (callsite-migration) — the shadow-comparison harness PRODUCTIONISED from
// the U1 prototype (business-logic-model.md § shadow 比較ハーネス; no new build
// from scratch). BR-10 requires the report to compare event count, linkage,
// status and allowed attributes, and to list every unexplained difference; the
// deletion-gate input FR-MIG-4(d) stays unsatisfied while that list is
// non-empty.
//
// The reliability contract that distinguishes production from prototype: a
// harness failure ("store absent / unreadable") must surface as COMPARISON NOT
// PERFORMED, never as silent equivalence (reliability-design.md § 移行正しさの
// 検証設計 — 暗黙の「同等」扱いを禁止).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { telemetryDir } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import {
  buildShadowComparisonReport,
  writeShadowComparisonReport,
} from "../../dist/claude/.claude/otel/shadow-compare.ts";
import type { ComparisonVerdict } from "../../dist/claude/.claude/otel/shadow-compare.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

// The verdict union is deliberately disjoint, so a consumer cannot read
// `equivalent` off a comparison that never ran. Narrow through this helper —
// it fails the test rather than silently reading an unperformed comparison.
function performed(verdict: ComparisonVerdict): { equivalent: boolean; detail: string } {
  if (!verdict.performed) throw new Error(`expected a performed comparison, got: ${verdict.reason}`);
  return verdict;
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  birthIntent(proj, "otel-shadow-prod", "default", "feature");
  writeFileSync(
    join(proj, "amadeus", "config.json"),
    JSON.stringify({ observability: { enabled: true } }),
    "utf-8"
  );
});
afterEach(() => {
  cleanupTestProject(proj);
});

// Store writers. The harness reads the SAME on-disk stores the two paths write
// (buffer-*.jsonl from appendTelemetryEvent, spans-*.jsonl from the
// LocalSpanExporter), so the fixtures write those bytes directly.
function storeDir(): string {
  const dir = telemetryDir(proj);
  if (dir === null) throw new Error("fixture: no resolvable record dir");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeOldEvents(...events: Record<string, unknown>[]): void {
  const body = events.map((e) => `${JSON.stringify({ v: 1, kind: "operation", ok: true, ...e })}\n`).join("");
  writeFileSync(join(storeDir(), "buffer-testclone.jsonl"), body, "utf-8");
}

function writeNewSpans(...spans: Record<string, unknown>[]): void {
  const body = spans
    .map(
      (s) =>
        `${JSON.stringify({
          traceId: "0af7651916cd43dd8448eb211c80319c",
          spanId: "b7ad6b7169203331",
          parentSpanId: null,
          kind: "internal",
          status: { code: "OK" },
          attributes: {},
          events: [],
          links: [],
          resource: {},
          instrumentationScope: { name: "amadeus" },
          ...s,
        })}\n`
    )
    .join("");
  writeFileSync(join(storeDir(), "spans-testclone.jsonl"), body, "utf-8");
}

describe("shadow comparison — status and allowed attributes (BR-10)", () => {
  test("a failure on the old path with no ERROR on the new path is a status diff", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4, ok: false });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4, status: { code: "OK" } });

    const report = buildShadowComparisonReport(proj);

    expect(performed(report.status).equivalent).toBe(false);
    expect(report.unexplainedDiffs.join(" ")).toContain("old failures 1 / new ERROR 0");
  });

  test("matching failure counts are equivalent — UNSET counts as non-error", () => {
    writeOldEvents({ name: "a", startMs: 1, endMs: 2, ok: false }, { name: "b", startMs: 1, endMs: 2, ok: true });
    writeNewSpans(
      { name: "a", startMs: 1, endMs: 2, status: { code: "ERROR" } },
      { name: "b", startMs: 1, endMs: 2, status: { code: "UNSET" } }
    );

    expect(performed(buildShadowComparisonReport(proj).status).equivalent).toBe(true);
  });

  test("an allowed attribute key present on the old path but not the new is a diff", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4, meta: { stage: "code-generation" } });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4, attributes: {} });

    const report = buildShadowComparisonReport(proj);

    expect(performed(report.allowedAttributes).equivalent).toBe(false);
    expect(report.unexplainedDiffs.join(" ")).toContain("old key stage absent on the new path");
  });

  test("a superset of keys on the new path is equivalent — 同等以上 is allowed", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4, meta: { stage: "s" } });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4, attributes: { stage: "s", extra: 1 } });

    expect(performed(buildShadowComparisonReport(proj).allowedAttributes).equivalent).toBe(true);
  });

  test("a new-path record without a well-formed trace/span id is a linkage diff", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4, traceId: "not-hex", spanId: "short" });

    const report = buildShadowComparisonReport(proj);

    expect(performed(report.linkage).equivalent).toBe(false);
    expect(report.unexplainedDiffs.join(" ")).toContain("without a well-formed trace/span id");
  });
});

describe("shadow comparison — store census and event count (BR-10)", () => {
  test("an absent store is COMPARISON NOT PERFORMED, never silent equivalence", () => {
    // Neither path wrote anything: the prototype would have compared 0 with 0
    // and called it equivalent. Production must refuse to claim equivalence.
    const report = buildShadowComparisonReport(proj);

    expect(report.oldPath.present).toBe(false);
    expect(report.newPath.present).toBe(false);
    expect(report.eventCount.performed).toBe(false);
    expect(report.unexplainedDiffs.length).toBeGreaterThan(0);
    expect(report.unexplainedDiffs.join(" ")).toContain("not performed");
  });

  test("equal per-operation counts on both paths are equivalent", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 }, { name: "projector", startMs: 1, endMs: 9 });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4 }, { name: "projector", startMs: 1, endMs: 9 });

    const report = buildShadowComparisonReport(proj);

    expect(report.oldPath.present).toBe(true);
    expect(report.oldPath.records).toBe(2);
    expect(report.newPath.records).toBe(2);
    expect(report.eventCount).toEqual({ performed: true, equivalent: true, detail: "old 2 / new 2 across 2 operation(s)" });
  });

  test("an operation missing from the new path is named as an unexplained diff", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 }, { name: "orphan-op", startMs: 1, endMs: 2 });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4 });

    const report = buildShadowComparisonReport(proj);

    expect(performed(report.eventCount).equivalent).toBe(false);
    expect(report.unexplainedDiffs.join(" ")).toContain("orphan-op");
  });

  test("a torn store line is surfaced, not silently skipped", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 });
    writeFileSync(join(storeDir(), "buffer-torn.jsonl"), '{"name":"half\n', "utf-8");
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4 });

    const report = buildShadowComparisonReport(proj);

    expect(report.oldPath.tornLines).toBe(1);
    expect(report.unexplainedDiffs.join(" ")).toContain("torn");
  });

  test("a torn line on the NEW path is surfaced too", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4 });
    writeFileSync(join(storeDir(), "spans-torn.jsonl"), "{oops\n", "utf-8");

    const report = buildShadowComparisonReport(proj);

    expect(report.newPath.tornLines).toBe(1);
    expect(report.unexplainedDiffs.join(" ")).toContain("newPath");
  });

  test("the report persists as machine-readable JSON", () => {
    writeOldEvents({ name: "decision", startMs: 1, endMs: 4 });
    writeNewSpans({ name: "decision", startMs: 1, endMs: 4 });

    const report = buildShadowComparisonReport(proj);
    const path = writeShadowComparisonReport(proj, report);
    const parsed = JSON.parse(require("node:fs").readFileSync(path, "utf-8"));

    expect(typeof parsed.generatedAt).toBe("string");
    expect(parsed.eventCount.equivalent).toBe(true);
    expect(parsed.unexplainedDiffs).toEqual([]);
  });
});
