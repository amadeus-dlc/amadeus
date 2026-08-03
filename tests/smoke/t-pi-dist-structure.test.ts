// Pi packaged foundation and authored-catalog parity.
// covers: file:dist/pi/.pi/tools/data/harness.json
// covers: file:dist/pi/.pi/skills/amadeus/SKILL.md
// size: small

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import piManifest from "../../packages/framework/harness/pi/manifest.ts";

const ROOT = join(import.meta.dir, "..", "..");
const DIST = join(ROOT, "dist", "pi");

function sourcePath(source: string): string {
  return join(ROOT, "packages", "framework", "harness", "pi", ...source.split("/"));
}

function sourceSha256(source: string): string {
  return createHash("sha256").update(readFileSync(sourcePath(source))).digest("hex");
}

describe("Pi dist foundation", () => {
  test("ships every required native resource and canonical descriptor", () => {
    const descriptorPath = join(DIST, ".pi", "tools", "data", "harness.json");
    expect(existsSync(descriptorPath)).toBe(true);
    const descriptor = JSON.parse(readFileSync(descriptorPath, "utf-8"));
    expect(descriptor).toEqual({
      name: "pi",
      harnessDir: ".pi",
      rulesSubdir: "rules",
      stageEntry: piManifest.stageEntry,
      nativeRuntime: piManifest.nativeRuntime,
      resources: piManifest.resources?.map((resource) => ({
        ...resource,
        sha256: sourceSha256(resource.source),
      })),
    });
    for (const resource of piManifest.resources ?? []) {
      expect(existsSync(join(DIST, ...resource.destination.split("/")))).toBe(true);
    }
    for (const resource of descriptor.resources) {
      expect(resource.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("keeps authored resources byte-identical to the manifest catalog", () => {
    for (const resource of piManifest.resources ?? []) {
      const source = sourcePath(resource.source);
      const projected = join(DIST, ...resource.destination.split("/"));
      expect(readFileSync(projected).equals(readFileSync(source))).toBe(true);
      expect(createHash("sha256").update(readFileSync(projected)).digest("hex"))
        .toBe(sourceSha256(resource.source));
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
