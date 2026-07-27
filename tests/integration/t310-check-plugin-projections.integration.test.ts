// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U3 host-projection-all — checkPluginProjections is the --check seam (BR-U3-5/7,
// REL-U3-2 write⇔check). This integration builds the expected neutral bundle into
// a temp dist, confirms zero drift, then injects the failing proofs the drift
// guard must catch: a byte-edit → stale, a deleted file → stale, an extra file →
// orphan. Both write and check derive from the single pluginBundleExpected map.

import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { checkPluginProjections, discoverPluginSources, pluginBundleExpected, validatePluginSources } from "../../scripts/plugin-projection.ts";

const FIXTURE = "zz-t310-fixture";
let pluginsRoot = "";
let distRoot = "";

function writeExpected(): void {
  for (const [rel, bytes] of pluginBundleExpected(pluginsRoot)) {
    const abs = join(distRoot, ...rel.split("/"));
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
  }
}

beforeAll(() => {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-t310-"));
  pluginsRoot = join(ws, "plugins");
  distRoot = join(ws, "dist");
  mkdirSync(join(pluginsRoot, FIXTURE), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  writeFileSync(join(pluginsRoot, FIXTURE, "note.md"), "home {{HARNESS_DIR}}\n");
  validatePluginSources(discoverPluginSources(pluginsRoot)); // sanity: fixture is well-formed
});

describe("t310 checkPluginProjections (stale/orphan drift guard)", () => {
  test("a freshly written bundle has zero drift", () => {
    rmSync(distRoot, { recursive: true, force: true });
    writeExpected();
    expect(checkPluginProjections(pluginsRoot, distRoot)).toEqual([]);
  });

  test("a byte-edited committed file is stale", () => {
    rmSync(distRoot, { recursive: true, force: true });
    writeExpected();
    // Tamper with one folder-drop-auto install artifact.
    const victim = join(distRoot, "plugins", FIXTURE, "codex", "INSTALL.md");
    writeFileSync(victim, "TAMPERED\n");
    const drift = checkPluginProjections(pluginsRoot, distRoot);
    expect(drift.some((d) => d.kind === "stale" && d.path === `plugins/${FIXTURE}/codex/INSTALL.md`)).toBe(true);
  });

  test("a deleted committed file is stale (missing folds into stale)", () => {
    rmSync(distRoot, { recursive: true, force: true });
    writeExpected();
    rmSync(join(distRoot, "plugins", FIXTURE, "opencode", "INSTALL.md"));
    const drift = checkPluginProjections(pluginsRoot, distRoot);
    expect(drift.some((d) => d.kind === "stale" && d.path === `plugins/${FIXTURE}/opencode/INSTALL.md`)).toBe(true);
  });

  test("an extra committed file with no source is an orphan", () => {
    rmSync(distRoot, { recursive: true, force: true });
    writeExpected();
    const stray = join(distRoot, "plugins", FIXTURE, "codex", "stray.txt");
    writeFileSync(stray, "orphan\n");
    const drift = checkPluginProjections(pluginsRoot, distRoot);
    expect(drift.some((d) => d.kind === "orphan" && d.path === `plugins/${FIXTURE}/codex/stray.txt`)).toBe(true);
  });
});
