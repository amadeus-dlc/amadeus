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
  "amadeus-quality-repair.ts",
  "amadeus-quality-repair-runtime.ts",
  "amadeus-quality-repair-replay.ts",
] as const;

const currentHarnessCohort = [
  { name: "claude", manifest: claudeManifest },
  { name: "codex", manifest: codexManifest },
  { name: "cursor", manifest: cursorManifest },
  { name: "opencode", manifest: opencodeManifest },
  { name: "kimi", manifest: kimiManifest },
] as const;

describe("Quality Repair current five-harness projection", () => {
  for (const { name, manifest } of currentHarnessCohort) {
    test(`${name} consumes the shared quality runtime without a harness Core fork`, () => {
      expect(manifest.coreDirs).toContainEqual({ src: "tools", dst: "tools" });
      for (const file of TOOL_FILES) {
        const source = readFileSync(join(ROOT, "packages", "framework", "core", "tools", file), "utf8");
        const projected = readFileSync(join(ROOT, "dist", name, manifest.harnessDir, "tools", file), "utf8");
        expect(projected, `${name}:${file}`).toBe(source);
      }
    });
  }
});
