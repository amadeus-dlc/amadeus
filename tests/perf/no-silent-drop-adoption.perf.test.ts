// covers: performance:no-silent-drop:cold-warm-5x2, performance:no-silent-drop:capacity-r0-r2-r4
// size: medium
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { assertShrinkOnly } from "../no-silent-drop/ledger.ts";
import {
  generatedLedgerFixture,
  validateTimingSamples,
} from "../no-silent-drop/repository-adoption.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function bootstrapBaseRevision(): string {
  const provenance = JSON.parse(
    readFileSync(join(REPO_ROOT, "tests", "no-silent-drop", "bootstrap-provenance.json"), "utf8"),
  ) as { bootstrapBaseRevision?: unknown };
  expect(provenance.bootstrapBaseRevision).toBeString();
  const revision = provenance.bootstrapBaseRevision as string;
  const resolved = spawnSync("git", ["cat-file", "-e", `${revision}^{commit}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  expect(resolved.error).toBeUndefined();
  expect(resolved.status).toBe(0);
  return revision;
}

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
    const baseRevision = bootstrapBaseRevision();
    const cold: number[] = [];
    const warm: number[] = [];
    // "cold" is the first fresh process in each pair; "warm" is its immediate
    // fresh-process repeat and measures filesystem/page-cache warmth, not process reuse.
    for (let index = 0; index < 5; index++) {
      cold.push(timedGate(baseRevision));
      warm.push(timedGate(baseRevision));
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
