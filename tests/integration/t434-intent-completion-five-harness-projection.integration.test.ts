// covers: file:packages/framework/core/tools/amadeus-harness-registry.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const CORE = join(ROOT, "packages", "framework", "core", "tools");
const HARNESSES = [
  ["claude", ".claude"],
  ["codex", ".codex"],
  ["cursor", ".cursor"],
  ["opencode", ".opencode"],
  ["kimi", ".kimi-code"],
] as const;
const FILES = ["amadeus-audit.ts", "amadeus-harness-registry.ts", "amadeus-intent-completion.ts"] as const;

describe("Intent completion current five-harness projection", () => {
  for (const [harness, directory] of HARNESSES) {
    test(`${harness} consumes byte-identical shared completion Core`, () => {
      for (const file of FILES) {
        expect(readFileSync(join(ROOT, "dist", harness, directory, "tools", file))).toEqual(
          readFileSync(join(CORE, file)),
        );
      }
    });
  }
});
