// covers: file:packages/framework/core/tools/amadeus-graph.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  graphCompileInvariantViolations,
  type ScopeGridSurface,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import type { BoltDagParse } from "../../packages/framework/core/tools/amadeus-lib.ts";

const GRID = `${JSON.stringify({ feature: { stages: { build: "EXECUTE" } } }, null, 2)}\n`;

describe("t418 graph compile semantic invariants", () => {
  test("accepts semantically equal harness grids and the live DAG parser", () => {
    const surfaces: ScopeGridSurface[] = [
      { path: "dist/claude/.claude/tools/data/scope-grid.json", json: GRID },
      { path: "dist/codex/.codex/tools/data/scope-grid.json", json: GRID },
    ];
    expect(graphCompileInvariantViolations(GRID, surfaces)).toEqual([]);
  });

  test("names a mismatched or malformed harness grid", () => {
    expect(
      graphCompileInvariantViolations(GRID, [
        {
          path: "dist/codex/.codex/tools/data/scope-grid.json",
          json: `${JSON.stringify({ fix: { stages: {} } })}\n`,
        },
        { path: "dist/kiro/.kiro/tools/data/scope-grid.json", json: "{" },
      ]),
    ).toEqual([
      "(iii) scope grid differs at dist/codex/.codex/tools/data/scope-grid.json",
      expect.stringContaining(
        "(iii) scope grid is invalid at dist/kiro/.kiro/tools/data/scope-grid.json",
      ),
    ]);
  });

  test("fails when the bolt DAG ok-path contract regresses", () => {
    const failedParser = (): BoltDagParse => ({
      ok: false,
      reason: "malformed",
      detail: "fixture failure",
    });
    expect(graphCompileInvariantViolations(GRID, [], failedParser)).toEqual([
      "(iv) bolt_dag edge block no longer satisfies the parseBoltDag ok contract",
    ]);
  });
});
