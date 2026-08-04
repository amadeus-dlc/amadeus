// Pi packaged foundation and authored-catalog parity.
// covers: file:dist/pi/.pi/tools/data/harness.json
// covers: file:dist/pi/.pi/skills/amadeus/SKILL.md
// size: medium

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";
import { transform } from "../../scripts/harness-transform.ts";

const ROOT = join(import.meta.dir, "..", "..");
const DIST = join(ROOT, "dist", "pi");

function sourcePath(source: string): string {
  return join(ROOT, "packages", "framework", "harness", "pi", ...source.split("/"));
}

function sourceSha256(source: string): string {
  const path = sourcePath(source);
  return createHash("sha256")
    .update(transform(path, readFileSync(path), piManifest.harnessDir, piManifest.rulesRename))
    .digest("hex");
}

describe("Pi dist foundation", () => {
  test("ships every required native resource and canonical descriptor", () => {
    const descriptorPath = join(DIST, ".pi", "tools", "data", "harness.json");
    expect(existsSync(descriptorPath)).toBe(true);
    const descriptor = JSON.parse(readFileSync(descriptorPath, "utf-8"));
    const resources = piManifest.resources;
    expect(resources).toBeDefined();
    expect(resources?.length).toBeGreaterThan(0);
    if (resources === undefined || resources.length === 0) throw new Error("Pi manifest resources are required");
    expect(descriptor).toEqual({
      name: "pi",
      harnessDir: ".pi",
      rulesSubdir: "rules",
      stageEntry: piManifest.stageEntry,
      nativeRuntime: piManifest.nativeRuntime,
      resources: resources.map((resource) => ({
        ...resource,
        sha256: sourceSha256(resource.source),
      })),
    });
    for (const resource of resources) {
      expect(existsSync(join(DIST, ...resource.destination.split("/")))).toBe(true);
    }
    for (const resource of descriptor.resources) {
      expect(resource.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("keeps authored resources byte-identical to the manifest catalog", () => {
    const resources = piManifest.resources;
    if (resources === undefined || resources.length === 0) throw new Error("Pi manifest resources are required");
    for (const resource of resources) {
      const source = sourcePath(resource.source);
      const projected = join(DIST, ...resource.destination.split("/"));
      const expected = transform(source, readFileSync(source), piManifest.harnessDir, piManifest.rulesRename);
      expect(readFileSync(projected).equals(expected)).toBe(true);
    }
  });

  test("does not ship a trust decision or treat the driver as a native extension", () => {
    expect(existsSync(join(DIST, "package.json"))).toBe(false);
    expect(existsSync(join(DIST, ".pi", "trust.json"))).toBe(false);
    expect(existsSync(join(DIST, ".pi", "settings.json"))).toBe(false);
    expect(existsSync(join(DIST, ".pi", "extensions", "amadeus-pi-driver.ts"))).toBe(false);
    expect(existsSync(join(DIST, ".pi", "drivers", "amadeus-pi-driver.ts"))).toBe(true);
  });
});
