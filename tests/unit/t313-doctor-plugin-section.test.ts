// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: small
//
// U5 doctor-observability — the PURE projection buildDoctorPluginSection maps the
// read-only observation (diagnosePlugins result + DropsRecord + revision + U6
// activation) into the --doctor plugin section per the business-logic-model.md
// 8-row branch table (the authoritative source, BR-U5-8). No filesystem: every
// input is a fixture object, so this is the unit tier (fs-tests-integration-first).
// The fail-closed `unknown` branch is exercised with a runtime value cast outside
// the compile-time union — the exact class dropsFromJson can carry from disk.

import { describe, expect, test } from "bun:test";
import type { PluginDiagnostic } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildDoctorPluginSection,
  type DoctorLine,
  type DoctorLineState,
  type DoctorPluginObservation,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

function diag(plugin: string, status: PluginDiagnostic["status"], observations: string[] = []): PluginDiagnostic {
  return { plugin, status, ownedPaths: [], observations };
}

function obs(overrides: Partial<DoctorPluginObservation> = {}): DoctorPluginObservation {
  return {
    diagnostics: [],
    drops: { plugins: new Map() },
    revision: 0,
    activation: null,
    ...overrides,
  };
}

function line(lines: readonly DoctorLine[], plugin: string, state: DoctorLineState): DoctorLine | undefined {
  return lines.find((l) => l.plugin === plugin && l.state === state);
}

describe("t313 buildDoctorPluginSection — branch table projection", () => {
  test("0-plugin: no diagnostics, no drops → empty lines, installed 0", () => {
    const section = buildDoctorPluginSection(obs());
    expect(section.installed).toBe(0);
    expect(section.lines).toEqual([]);
    expect(section.activation).toBeNull();
  });

  test("composed (healthy) → ok line carrying composed@<revision>", () => {
    const section = buildDoctorPluginSection(obs({ diagnostics: [diag("pro", "composed")], revision: 7 }));
    expect(section.installed).toBe(1);
    expect(line(section.lines, "pro", "ok")).toEqual({ plugin: "pro", state: "ok", detail: "composed@7" });
  });

  test("drift → drift line carrying the sorted observations (display only)", () => {
    const section = buildDoctorPluginSection(obs({ diagnostics: [diag("pro", "drift", ["shared file drift: SKILL.md"])] }));
    expect(line(section.lines, "pro", "drift")).toEqual({
      plugin: "pro",
      state: "drift",
      detail: "shared file drift: SKILL.md",
    });
  });

  test("recovery-pending → recovery-pending line (FR-6/NFR-1 safety path)", () => {
    const section = buildDoctorPluginSection(obs({ diagnostics: [diag("pro", "recovery-pending")] }));
    expect(line(section.lines, "pro", "recovery-pending")).toEqual({
      plugin: "pro",
      state: "recovery-pending",
      detail: "run compose to recover",
    });
  });

  test("DropsRecord degraded + advisory entries → one line each, sourced only from severity", () => {
    const drops = {
      plugins: new Map([
        [
          "pro",
          [
            { surface: "hooks", severity: "degraded" as const, reason: "no host hook adapter" },
            { surface: "marketplace", severity: "advisory" as const, reason: "metadata only" },
          ],
        ],
      ]),
    };
    const section = buildDoctorPluginSection(obs({ diagnostics: [diag("pro", "composed")], revision: 3, drops }));
    expect(line(section.lines, "pro", "degraded")).toEqual({ plugin: "pro", state: "degraded", detail: "hooks" });
    expect(line(section.lines, "pro", "advisory")).toEqual({ plugin: "pro", state: "advisory", detail: "marketplace" });
    // The composed line and its two drop lines coexist (t188 #21-22 — degrade is
    // additive to the plugin's own diagnostic).
    expect(section.lines).toHaveLength(3);
  });

  test("U6 activation changed → activation display line; unchanged/null → none", () => {
    expect(buildDoctorPluginSection(obs({ activation: { specHashChanged: true } })).activation).toBe(
      "formal-model-check: spec-hash CHANGED",
    );
    expect(buildDoctorPluginSection(obs({ activation: { specHashChanged: false } })).activation).toBeNull();
    expect(buildDoctorPluginSection(obs({ activation: null })).activation).toBeNull();
  });

  test("fail-closed: a diagnostic status outside the engine union → unknown line", () => {
    // A future engine status the branch table does not map. Cast to reach the
    // runtime membership guard (the compile-time union cannot express it).
    const rogue = diag("pro", "quarantined" as PluginDiagnostic["status"]);
    const section = buildDoctorPluginSection(obs({ diagnostics: [rogue] }));
    expect(line(section.lines, "pro", "unknown")).toEqual({
      plugin: "pro",
      state: "unknown",
      detail: "status quarantined",
    });
  });

  test("fail-closed: a drop severity outside the union (as dropsFromJson can carry) → unknown line", () => {
    const drops = {
      plugins: new Map([
        ["pro", [{ surface: "hooks", severity: "critical" as unknown as "degraded", reason: "x" }]],
      ]),
    };
    const section = buildDoctorPluginSection(obs({ drops }));
    expect(line(section.lines, "pro", "unknown")).toEqual({
      plugin: "pro",
      state: "unknown",
      detail: "severity critical: hooks",
    });
  });

  test("drop plugins are emitted in a deterministic (sorted) order without mutating the frozen input", () => {
    const drops = {
      plugins: new Map([
        ["zeta", [{ surface: "s1", severity: "advisory" as const, reason: "r" }]],
        ["alpha", [{ surface: "s2", severity: "advisory" as const, reason: "r" }]],
      ]),
    };
    Object.freeze(drops.plugins);
    const section = buildDoctorPluginSection(obs({ drops }));
    const dropPlugins = section.lines.filter((l) => l.state === "advisory").map((l) => l.plugin);
    expect(dropPlugins).toEqual(["alpha", "zeta"]);
  });
});

describe("t313 DoctorLine type canon (BR-U5-5)", () => {
  test("the state union carries every branch-table variant (U2 canonical, U5 additive only)", () => {
    // A DoctorLine value for each state — a compile+runtime witness that the U2
    // canonical DoctorLineState union already spans the U5 branch table so U5
    // adds no field and redefines none (cross-unit-type-canonical-lift).
    const states: DoctorLineState[] = ["ok", "drift", "degraded", "advisory", "recovery-pending", "unknown"];
    const witnesses: DoctorLine[] = states.map((state) => ({ plugin: "p", state, detail: "" }));
    expect(witnesses.map((w) => w.state)).toEqual(states);
  });
});
