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
  "amadeus-loop-monitor.ts",
  "amadeus-loop-monitor-runtime.ts",
  "amadeus-loop-monitor-replay.ts",
] as const;

const harnesses = [
  { name: "claude", dir: ".claude", manifest: claudeManifest },
  { name: "codex", dir: ".codex", manifest: codexManifest },
  { name: "cursor", dir: ".cursor", manifest: cursorManifest },
  { name: "opencode", dir: ".opencode", manifest: opencodeManifest },
  { name: "kimi", dir: ".kimi-code", manifest: kimiManifest },
] as const;

describe("Loop Monitor five-harness Core projection", () => {
  for (const { name, dir, manifest } of harnesses) {
    test(`${name} projects the shared tools directory without a harness fork`, () => {
      expect(manifest.coreDirs).toContainEqual({ src: "tools", dst: "tools" });
      for (const file of TOOL_FILES) {
        const source = readFileSync(join(ROOT, "packages", "framework", "core", "tools", file), "utf8");
        const projected = readFileSync(join(ROOT, "dist", name, dir, "tools", file), "utf8");
        expect(projected, `${name}:${file}`).toBe(source);
      }
    });
  }
});
