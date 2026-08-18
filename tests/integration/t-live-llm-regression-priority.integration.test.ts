import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const REGISTRY = join(import.meta.dir, "..", "fixtures", "live-llm-regression-priority.json");

interface RegressionTarget {
  readonly priority: number;
  readonly tool: string;
  readonly issues: readonly number[];
  readonly severity: readonly string[];
  readonly failureModes: readonly string[];
  readonly coverage: {
    readonly status: "partial" | "supporting" | "next";
    readonly test: string;
    readonly journey: string;
  };
  readonly nextScenario: string;
}

function readRegistry(): RegressionTarget[] {
  return JSON.parse(readFileSync(REGISTRY, "utf8")) as RegressionTarget[];
}

describe("live LLM regression priority registry", () => {
  test("keeps historical tool targets ordered and tied to real source/test seams", () => {
    const targets = readRegistry();
    const priorities = targets.map((target) => target.priority);

    expect(priorities).toEqual([...priorities].sort((left, right) => left - right));
    expect(new Set(targets.map((target) => target.tool)).size).toBe(targets.length);
    expect(targets[0]?.tool).toBe("packages/framework/core/tools/amadeus-orchestrate.ts");

    for (const target of targets) {
      expect(target.tool).toMatch(/\/tools\/[^/]+\.ts$/u);
      expect(existsSync(join(ROOT, target.tool))).toBe(true);
      expect(target.issues.every((issue) => Number.isInteger(issue) && issue > 0)).toBe(true);
      expect(target.severity.length).toBeGreaterThan(0);
      expect(target.failureModes.length).toBeGreaterThan(0);
      expect(existsSync(join(ROOT, target.coverage.test))).toBe(true);
      expect(target.coverage.journey.length).toBeGreaterThan(0);
      expect(target.nextScenario.length).toBeGreaterThan(0);
    }
  });

  test("marks the current provider-driven journey as partial coverage", () => {
    const orchestrate = readRegistry().find((target) =>
      target.tool.endsWith("/amadeus-orchestrate.ts"),
    );

    expect(orchestrate?.coverage.status).toBe("partial");
    expect(orchestrate?.coverage.test).toBe(
      "tests/e2e/t-live-llm-ts-tool-journey.serial.test.ts",
    );
    expect(orchestrate?.nextScenario).toMatch(/swarm|per-unit/iu);
  });
});
