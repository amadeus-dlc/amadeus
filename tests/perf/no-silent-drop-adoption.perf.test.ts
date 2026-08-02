// covers: performance:no-silent-drop:cold-warm-5x2, performance:no-silent-drop:capacity-r0-r2-r4
// size: medium
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { assertShrinkOnly } from "../no-silent-drop/ledger.ts";
import {
  generatedLedgerFixture,
  validateTimingSamples,
} from "../no-silent-drop/repository-adoption.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function timedGate(baseRevision: string): number {
  const started = performance.now();
  const result = spawnSync(
    "bun",
    ["run", "no-silent-drop", "--", "--base-revision", baseRevision],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  const durationSeconds = (performance.now() - started) / 1000;
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", code: "NO_SILENT_DROP_OK" });
  return durationSeconds;
}

describe("no-silent-drop repository adoption performance", () => {
  test("five fresh processes and their immediate repeats stay below 15 seconds", () => {
    const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();
    const cold: number[] = [];
    const warm: number[] = [];
    for (let index = 0; index < 5; index++) {
      cold.push(timedGate(revision));
      warm.push(timedGate(revision));
    }

    const verdict = validateTimingSamples({ cold, warm });
    expect(verdict.pass).toBeTrue();
    expect(verdict.coldMax).toBeLessThanOrEqual(15);
    expect(verdict.warmMax).toBeLessThanOrEqual(15);
  }, 120_000);

  test("generated r0/r2/r4 ledgers exercise the shrink-only capacity boundary", () => {
    const r0 = generatedLedgerFixture(0);
    const r2 = generatedLedgerFixture(2);
    const r4 = generatedLedgerFixture(4);

    expect(() => assertShrinkOnly(r0, r2)).not.toThrow();
    expect(() => assertShrinkOnly(r2, r4)).not.toThrow();
    expect(() => assertShrinkOnly(r4, r2)).toThrow("addition/replacement");
  });
});
