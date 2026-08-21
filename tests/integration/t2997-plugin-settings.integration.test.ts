// t2997 — plugin.settings against the shipped surfaces (#2997).
// covers: packages/framework/core/tools/amadeus-plugin-compose.ts
// covers: packages/framework/core/tools/amadeus-plugin-settings.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePluginManifest } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

const ROOT = join(import.meta.dir, "..", "..");
const PLUGINS_DIR = join(ROOT, "plugins");

describe("t2997 shipped manifests keep parsing", () => {
  const names = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  test("the plugin set under plugins/ is non-empty", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  // The plugins that actually declare settings, named so that a manifest
  // growing a declaration is a deliberate edit here rather than silent drift.
  // Every other shipped manifest must still parse to no declaration at all —
  // the byte-identical guarantee the feature was built on.
  const DECLARES_SETTINGS: ReadonlySet<string> = new Set(["git-drift"]);

  test.each(names)(
    "%s parses without errors and declares settings only if it is meant to",
    (name) => {
      const bytes = readFileSync(join(PLUGINS_DIR, name, "plugin.json"));
      // Bundle bytes are irrelevant here: this asserts the manifest SHAPE is
      // still accepted, so every declared path resolves to a stub buffer.
      const parsed = parsePluginManifest(name, bytes, () => Buffer.alloc(0));
      expect(parsed.errors).toEqual([]);
      if (DECLARES_SETTINGS.has(name)) {
        expect(Object.keys(parsed.manifest?.settings ?? {}).length).toBeGreaterThan(0);
      } else {
        expect(parsed.manifest?.settings).toBeUndefined();
      }
    },
  );

});
