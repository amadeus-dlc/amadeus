// covers: file:scripts/package.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import claudeManifest from "../../packages/framework/harness/claude/manifest.ts";
import codexManifest from "../../packages/framework/harness/codex/manifest.ts";
import cursorManifest from "../../packages/framework/harness/cursor/manifest.ts";
import kimiManifest from "../../packages/framework/harness/kimi/manifest.ts";
import opencodeManifest from "../../packages/framework/harness/opencode/manifest.ts";

const ROOT = join(import.meta.dir, "..", "..");
const TOOL_FILES = [
  "amadeus-intent-autonomy.ts",
  "amadeus-intent-autonomy-runtime.ts",
  "amadeus-intent-autonomy-replay.ts",
  "amadeus-intent-autonomy-production.ts",
] as const;

const currentHarnessCohort = [
  { name: "claude", dir: ".claude", manifest: claudeManifest },
  { name: "codex", dir: ".codex", manifest: codexManifest },
  { name: "cursor", dir: ".cursor", manifest: cursorManifest },
  { name: "opencode", dir: ".opencode", manifest: opencodeManifest },
  { name: "kimi", dir: ".kimi-code", manifest: kimiManifest },
] as const;

describe("Intent autonomy current five-harness projection", () => {
  for (const { name, dir, manifest } of currentHarnessCohort) {
    test(`${name} consumes the shared autonomy runtime without a harness Core fork`, () => {
      expect(manifest.coreDirs).toContainEqual({ src: "tools", dst: "tools" });
      for (const file of TOOL_FILES) {
        const source = readFileSync(join(ROOT, "packages", "framework", "core", "tools", file), "utf8");
        const projected = readFileSync(join(ROOT, "dist", name, dir, "tools", file), "utf8");
        expect(projected, `${name}:${file}`).toBe(source);
      }
    });
  }
});
