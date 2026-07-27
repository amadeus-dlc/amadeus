// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U3 host-projection-all — projectPluginForHarness is the C3 public seam that
// writes an install bundle into an outDir after the plan-stage safety check. U3
// implements ALL packaged faces (U2 was claude-only). This integration writes
// every face into a real temp dir, asserts the class-appropriate artifacts land,
// and asserts the prior-projection marker is written so a re-project is accepted.

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverPluginSources, PACKAGE_HARNESSES, type PluginSource, projectPluginForHarness, validatePluginSources } from "../../scripts/plugin-projection.ts";

const FIXTURE = "zz-t308-fixture";
const MARKER = ".amadeus-plugin-projection.json";
let plugin: PluginSource;

beforeAll(() => {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-t308-src-"));
  const pluginsRoot = join(ws, "plugins");
  mkdirSync(join(pluginsRoot, FIXTURE, "skills"), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  writeFileSync(join(pluginsRoot, FIXTURE, "skills", "s.md"), "home {{HARNESS_DIR}}\n");
  [plugin] = validatePluginSources(discoverPluginSources(pluginsRoot));
});

let scratch = "";
beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "amadeus-t308-out-"));
});
afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("t308 projectPluginForHarness (all packaged faces)", () => {
  test("writes a bundle for every packaged face, each with a prior-projection marker", () => {
    for (const harness of PACKAGE_HARNESSES) {
      const outDir = join(scratch, harness);
      const result = projectPluginForHarness(plugin, harness, outDir);
      expect(result.harness).toBe(harness);
      expect(result.artifacts.length).toBeGreaterThan(0);
      for (const a of result.artifacts) {
        const dest = join(outDir, ...a.relativePath.split("/"));
        expect(readFileSync(dest).equals(Buffer.from(a.bytes))).toBe(true);
      }
      // The marker was written and names this plugin + harness.
      const marker = JSON.parse(readFileSync(join(outDir, MARKER), "utf-8"));
      expect(marker).toEqual({ plugin: FIXTURE, harness });
    }
  });

  test("re-projecting the same plugin/harness into its own prior projection is accepted (#32)", () => {
    const outDir = join(scratch, "reproject");
    projectPluginForHarness(plugin, "codex", outDir); // establishes the marker
    // Second projection sees a non-empty dir with our marker → ok, not refused.
    expect(() => projectPluginForHarness(plugin, "codex", outDir)).not.toThrow();
    expect(existsSync(join(outDir, "INSTALL.md"))).toBe(true);
  });

  test("refuses a foreign projection: a dir marked for a different plugin (#28)", () => {
    const outDir = join(scratch, "foreign");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, MARKER), JSON.stringify({ plugin: "someone-else", harness: "codex" }));
    expect(() => projectPluginForHarness(plugin, "codex", outDir)).toThrow(/different plugin\/harness/);
  });
});
