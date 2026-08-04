// covers: function:authorizeGoalCompletion, distribution:all-harnesses
// size: medium

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dir, "..", "..");
const HARNESSES = [
  ["claude", ".claude"],
  ["codex", ".codex"],
  ["cursor", ".cursor"],
  ["kimi", ".kimi-code"],
  ["kiro", ".kiro"],
  ["kiro-ide", ".kiro"],
  ["opencode", ".opencode"],
  ["pi", ".pi"],
] as const;

type GoalModule = typeof import("../../packages/framework/core/tools/amadeus-goal-reconciliation.ts");

describe("Goal reconciliation distribution parity", () => {
  for (const [distribution, harnessDir] of HARNESSES) {
    test(`${distribution} makes the same current/stale receipt decision`, async () => {
      const tools = join(ROOT, "dist", distribution, harnessDir, "tools");
      const modulePath = join(tools, "amadeus-goal-reconciliation.ts");
      expect(existsSync(join(tools, "amadeus-goal.ts"))).toBe(true);
      const goal = (await import(pathToFileURL(modulePath).href)) as GoalModule;
      const lineage = goal.createInitialGoalLineage({
        intentId: "00000000-0000-7000-8000-000000000427",
        statement: "Keep every harness on the same completion contract",
        scope: "fix",
        createdAt: "2026-08-04T00:00:00.000Z",
      });
      const receipt = goal.createGoalReconciliationReceipt({
        lineage,
        scope: "fix",
        finalStage: "build-and-test",
        completionInstance: "terminal:build-and-test",
        completionContextDigest: "a".repeat(64),
        items: [
          {
            id: "goal-statement",
            verdict: "ACHIEVED",
            evidence: [
              {
                kind: "deterministic-check",
                reference: "fixture:harness-parity",
                digest: "b".repeat(64),
              },
            ],
          },
        ],
        humanRulingReference: null,
        createdAt: "2026-08-04T00:01:00.000Z",
      });
      const common = {
        intentId: lineage.intentId,
        lineage,
        receipt,
        scope: "fix",
        finalStage: "build-and-test",
        completionInstance: "terminal:build-and-test",
        completionContextDigest: "a".repeat(64),
      };
      expect(goal.authorizeGoalCompletion(common).kind).toBe("authorized");
      expect(
        goal.authorizeGoalCompletion({
          ...common,
          completionContextDigest: "c".repeat(64),
        }).kind,
      ).toBe("rejected");
    });
  }
});
