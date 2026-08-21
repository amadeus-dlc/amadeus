// covers: file:packages/framework/core/tools/amadeus-plugin-selection.ts, file:packages/framework/core/tools/amadeus-plugin.ts
// size: large

import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  listHarnessTrees,
  listPluginSourceDirs,
  runPluginCli,
  stagingEntryState,
  type PluginCliDeps,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function deps(): PluginCliDeps {
  return {
    discoverPlugins,
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: createNodeBackend,
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t415-perf-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (source, target) => copyPluginSource(source, target),
    out: () => {},
    err: () => {},
  };
}

function freshRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function projectHost(selected: boolean, supplied: boolean): { project: string; host: string } {
  const project = freshRoot("amadeus-t415-perf-project-");
  const host = join(project, ".codex");
  mkdirSync(host, { recursive: true });
  mkdirSync(join(project, "amadeus"), { recursive: true });
  writeFileSync(
    join(project, "amadeus", "config.json"),
    `${JSON.stringify({ plugin: { activation: { names: selected ? [PLUGIN] : [] } } })}\n`,
  );
  if (supplied) cpSync(FIXTURE, join(project, "plugins", PLUGIN), { recursive: true });
  return { project, host };
}

function elapsed(operation: () => void): number {
  const start = performance.now();
  operation();
  return performance.now() - start;
}

function p95(values: readonly number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
}

function expectWithinBudget(baseline: readonly number[], treatment: readonly number[], floorMs: number): void {
  const base = p95(baseline);
  const changed = p95(treatment);
  expect(changed - base).toBeLessThanOrEqual(Math.max(base * 0.2, floorMs));
}

describe("t415 startup performance regression budget on one runner", () => {
  test("unselected/current use 100 alternating samples and first install uses 30 alternating samples", () => {
    const injected = deps();
    const emptyBaseline = freshRoot("amadeus-t415-perf-empty-");
    const emptyAuto = projectHost(false, false).host;

    const currentBaseline = freshRoot("amadeus-t415-perf-current-");
    cpSync(FIXTURE, join(currentBaseline, ".amadeus-plugin-src", PLUGIN), { recursive: true });
    expect(runPluginCli(["compose", "--if-stale", "--project-root", currentBaseline], injected).kind).toBe("composed");
    const currentAuto = projectHost(true, true).host;
    expect(runPluginCli(["compose", "--if-stale", "--project-root", currentAuto], injected).kind).toBe("composed");

    const emptyBaselineMs: number[] = [];
    const emptyAutoMs: number[] = [];
    const currentBaselineMs: number[] = [];
    const currentAutoMs: number[] = [];
    for (let index = 0; index < 100; index += 1) {
      emptyBaselineMs.push(elapsed(() => {
        expect(runPluginCli(["compose", "--if-stale", "--project-root", emptyBaseline], injected).kind).toBe("noop");
      }));
      emptyAutoMs.push(elapsed(() => {
        expect(runPluginCli(["compose", "--if-stale", "--project-root", emptyAuto], injected).kind).toBe("noop");
      }));
      currentBaselineMs.push(elapsed(() => {
        expect(runPluginCli(["compose", "--if-stale", "--project-root", currentBaseline], injected).kind).toBe("noop");
      }));
      currentAutoMs.push(elapsed(() => {
        expect(runPluginCli(["compose", "--if-stale", "--project-root", currentAuto], injected).kind).toBe("noop");
      }));
    }

    const firstInstallBaselineMs: number[] = [];
    const firstInstallAutoMs: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      const baseline = freshRoot("amadeus-t415-perf-install-");
      firstInstallBaselineMs.push(elapsed(() => {
        expect(runPluginCli(["install", FIXTURE, "--project-root", baseline], injected).kind).toBe("installed");
        expect(runPluginCli(["compose", "--if-stale", "--project-root", baseline], injected).kind).toBe("noop");
      }));
      const automatic = projectHost(true, true).host;
      firstInstallAutoMs.push(elapsed(() => {
        expect(runPluginCli(["compose", "--if-stale", "--project-root", automatic], injected).kind).toBe("composed");
        expect(runPluginCli(["compose", "--if-stale", "--project-root", automatic], injected).kind).toBe("noop");
      }));
    }

    expectWithinBudget(emptyBaselineMs, emptyAutoMs, 25);
    expectWithinBudget(currentBaselineMs, currentAutoMs, 25);
    expectWithinBudget(firstInstallBaselineMs, firstInstallAutoMs, 50);
    console.log(JSON.stringify({
      samples: { unselected: 100, current: 100, firstInstall: 30 },
      p95Ms: {
        emptyBaseline: p95(emptyBaselineMs),
        emptyAuto: p95(emptyAutoMs),
        currentBaseline: p95(currentBaselineMs),
        currentAuto: p95(currentAutoMs),
        firstInstallBaseline: p95(firstInstallBaselineMs),
        firstInstallAuto: p95(firstInstallAutoMs),
      },
    }));
  }, 120_000);
});
