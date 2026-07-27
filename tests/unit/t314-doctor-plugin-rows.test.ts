// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: small
//
// U5 doctor-observability — the PURE render doctorPluginRows / formatDoctorPluginLine
// turns a projected section into --doctor rows: display strings (branch table
// forms) and the pass/fail contribution that feeds the doctor exit aggregate.
// [degraded]/[recovery-pending]/[unknown] fail; [drift]/[advisory]/[ok] pass. No
// filesystem — unit tier.

import { describe, expect, test } from "bun:test";
import {
  type DoctorLine,
  type DoctorPluginSection,
  doctorPluginRows,
  formatDoctorPluginLine,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

function section(lines: readonly DoctorLine[], activation: string | null = null): DoctorPluginSection {
  return { installed: lines.filter((l) => l.state !== "degraded" && l.state !== "advisory").length, lines, activation };
}

describe("t314 formatDoctorPluginLine — branch table display forms", () => {
  test.each<[DoctorLine, string]>([
    [{ plugin: "pro", state: "ok", detail: "composed@7" }, "Plugin pro: composed@7 [ok]"],
    [{ plugin: "pro", state: "drift", detail: "shared file drift: SKILL.md" }, "Plugin pro: [drift: shared file drift: SKILL.md]"],
    [{ plugin: "pro", state: "recovery-pending", detail: "run compose to recover" }, "Plugin pro: [recovery-pending: run compose to recover]"],
    [{ plugin: "pro", state: "degraded", detail: "hooks" }, "Plugin pro: [degraded: hooks]"],
    [{ plugin: "pro", state: "advisory", detail: "marketplace" }, "Plugin pro: [advisory: marketplace]"],
    [{ plugin: "pro", state: "unknown", detail: "status quarantined" }, "Plugin pro: [unknown: status quarantined]"],
  ])("%o renders as its branch-table string", (line, expected) => {
    expect(formatDoctorPluginLine(line)).toBe(expected);
  });
});

describe("t314 doctorPluginRows — rows + exit contribution", () => {
  test("0-plugin degrades to a single passing 'Plugins: 0 installed' row (BR-U5-4)", () => {
    const rows = doctorPluginRows(section([]));
    expect(rows).toEqual([{ pass: true, label: "Plugins: 0 installed" }]);
  });

  test("[degraded] and [recovery-pending] and [unknown] rows fail (exit contribution)", () => {
    for (const state of ["degraded", "recovery-pending", "unknown"] as const) {
      const rows = doctorPluginRows(section([{ plugin: "p", state, detail: "d" }]));
      expect(rows).toHaveLength(1);
      expect(rows[0].pass).toBe(false);
    }
  });

  test("[ok], [drift], [advisory] rows pass (visible but not failing)", () => {
    for (const state of ["ok", "drift", "advisory"] as const) {
      const rows = doctorPluginRows(section([{ plugin: "p", state, detail: "d" }]));
      expect(rows[0].pass).toBe(true);
    }
  });

  test("activation line is appended as a passing advisory row when present", () => {
    const rows = doctorPluginRows(section([{ plugin: "p", state: "ok", detail: "composed@1" }], "formal-model-check: spec-hash CHANGED"));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ pass: true, label: "Plugins (activation) formal-model-check: spec-hash CHANGED" });
  });

  test("a healthy composed plugin adds no failing row (corpus-sweep: valid config stays green)", () => {
    const rows = doctorPluginRows(section([{ plugin: "p", state: "ok", detail: "composed@2" }]));
    expect(rows.some((r) => !r.pass)).toBe(false);
  });
});
