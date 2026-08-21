// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// FR-2 (#1585) — the standalone `amadeus-plugin doctor` CLI must render through
// the SAME canonical renderer as the integrated `/amadeus --doctor` section
// (doctorPluginRows), so a 0-plugin host reports "Plugins: 0 installed" instead
// of printing nothing. Drives handlePluginCli IN-PROCESS (seam, not spawn) over
// a real temp host, hence integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
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
  buildDoctorPluginSection,
  buildHostSnapshot,
  copyPluginSource,
  doctorPluginRows,
  handlePluginCli,
  type PluginCliDeps,
  stagingEntryState,
  listHarnessTrees,
  listPluginSourceDirs,
  readDoctorPluginObservation,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";

let host = "";
const out: string[] = [];
const err: string[] = [];

function deps(): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t339-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

// The integrated `/amadeus --doctor` plugin rows for the same host: the canonical
// wording the standalone CLI must match (one renderer, one vocabulary).
function integratedRows(root: string): readonly string[] {
  return doctorPluginRows(buildDoctorPluginSection(readDoctorPluginObservation(root))).map((r) => r.label);
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t339-"));
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t339 standalone doctor renders through the canonical renderer (FR-2, #1585)", () => {
  test("a 0-plugin host prints the 'Plugins: 0 installed' row instead of nothing", () => {
    const code = handlePluginCli(["doctor", "--project-root", host], deps());
    expect(code).toBe(0);
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((l) => l.includes("Plugins: 0 installed"))).toBe(true);
  });

  test("the 0-plugin wording is identical to the integrated doctor's row", () => {
    handlePluginCli(["doctor", "--project-root", host], deps());
    const integrated = integratedRows(host);
    expect(integrated).toEqual(["Plugins: 0 installed"]);
    for (const label of integrated) {
      expect(out.some((l) => l.includes(label))).toBe(true);
    }
  });

  test("a composed host renders the canonical per-plugin line (same renderer)", () => {
    cpSync(FIXTURE, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    out.length = 0;
    expect(handlePluginCli(["doctor", "--project-root", host], deps())).toBe(0);
    const integrated = integratedRows(host);
    expect(integrated.length).toBeGreaterThan(0);
    for (const label of integrated) {
      expect(out.some((l) => l.includes(label))).toBe(true);
    }
    expect(out.some((l) => l.includes(`Plugin ${PLUGIN}:`) && l.includes("[ok]"))).toBe(true);
  });
});
