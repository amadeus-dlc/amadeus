// covers: file:packages/framework/core/tools/amadeus-plugin.ts, file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: medium
//
// FR-3 (#1586) — drop must restore the host's FILESYSTEM baseline, not just the
// composition record: the directories compose created (plugins/<name>/stages/ …)
// must be gone when they end up empty, and `baselineRestored` must be measured
// against the filesystem rather than the record alone. The byte-only surface
// hash used by t299 is structurally blind to empty directories, so this file
// compares the directory STRUCTURE. Real temp filesystem → integration tier.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  dropsRecordPath,
  inspectPlugin,
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  type PluginCliDeps,
  stagingEntryState,
  runPluginCli,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "plugins", "formal-model-check");
const PLUGIN = "formal-model-check";

let host = "";
const out: string[] = [];
const err: string[] = [];

function deps(verifyOk = true): PluginCliDeps {
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
      verify: () => (verifyOk ? { ok: true } : { ok: false, reason: "synthetic verify failure" }),
      lock: createNodeLock(root),
      newTxnId: () => `t340-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

// Every path under `root` — DIRECTORIES INCLUDED (trailing separator marks a
// directory) — excluding the engine's dot-state at the root. The empty-directory
// residue #1586 describes is invisible to a file-bytes-only hash, so structure
// is the observable this test asserts on.
function structure(root: string): readonly string[] {
  const paths: string[] = [];
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      if (dir === root && name.startsWith(".amadeus-plugin")) continue;
      const abs = join(dir, name);
      const rel = relative(root, abs);
      if (statSync(abs).isDirectory()) {
        paths.push(rel + sep);
        walk(abs);
      } else {
        paths.push(rel);
      }
    }
  };
  walk(root);
  return paths.sort();
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t340-"));
  cpSync(FIXTURE, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t340 drop restores the filesystem baseline (FR-3, #1586)", () => {
  test("compose → drop leaves no plugin-owned empty directories", () => {
    const baseline = structure(host);
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(structure(host)).not.toEqual(baseline);
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    expect(structure(host)).toEqual(baseline);
    expect(existsSync(join(host, "plugins", PLUGIN, "stages"))).toBe(false);
    expect(existsSync(join(host, "plugins", PLUGIN))).toBe(false);
    expect(existsSync(join(host, "plugins"))).toBe(false);
  });

  test("baselineRestored is measured against the filesystem, not the record alone", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const result = runPluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(result.kind).toBe("dropped");
    if (result.kind !== "dropped") return;
    expect(result.baselineRestored).toBe(true);
    // The claim is checkable: no plugin-owned path and no empty residue remain.
    expect(structure(host).some((p) => p.startsWith("plugins"))).toBe(false);
  });

  test("the drops record may survive as audit data without failing restore", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const result = runPluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(result.kind === "dropped" && result.baselineRestored).toBe(true);
    expect(existsSync(dropsRecordPath(host))).toBe(true);
  });

  // Splitting "remove the file" into "remove the file, then prune what the mkdir
  // created" widens the reachable state space: the rollback path removes files
  // too, so it must land on the SAME baseline structure, not on a half-pruned
  // tree with the directory shell left over.
  test("a rejected compose rolls back to the baseline structure, directories included", () => {
    const baseline = structure(host);
    expect(handlePluginCli(["compose", "--project-root", host], deps(false))).toBe(1);
    expect(structure(host)).toEqual(baseline);
  });

  test("directories holding non-plugin content are left untouched (strong removal predicate)", () => {
    mkdirSync(join(host, "plugins", "other"), { recursive: true });
    writeFileSync(join(host, "plugins", "other", "keep.md"), "user content\n");
    const baseline = structure(host);
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    expect(structure(host)).toEqual(baseline);
    expect(existsSync(join(host, "plugins", "other", "keep.md"))).toBe(true);
  });
});
