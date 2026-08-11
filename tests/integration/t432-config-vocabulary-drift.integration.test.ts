// t432 — active configuration vocabulary drift guard.
// covers: packages/framework/core, docs, amadeus/spaces/default/memory
// size: medium

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { AMADEUS_CONFIG_REGISTRY } from "../../packages/framework/core/tools/amadeus-config.ts";

const ROOT = join(import.meta.dir, "..", "..");
const ACTIVE_ROOTS = [
  join(ROOT, "packages", "framework", "core"),
  join(ROOT, "scripts"),
  join(ROOT, "docs"),
  join(ROOT, "amadeus", "spaces", "default", "memory"),
];
const LEGACY_TOKENS = [
  "auto-mirror",
  "mirror-projects",
  "auto-solo-election",
  "auto-file-findings",
  "max-parallel-units",
  "--trigger auto-solo",
  "--trigger explicit",
  "auto-solo-election-disabled",
  "autoMirror",
  "mirrorProjects",
  "autoSoloElection",
  "autoFileFindings",
  "maxParallelUnits",
  "FindingFileOutcome",
  "parseFileCommand",
  "config.plugins",
] as const;

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return files(path);
    return entry.isFile() ? [path] : [];
  });
}

function legacyViolations(path: string): string[] {
  if (path.endsWith("tools/amadeus-config.ts")) return [];
  const contents = readFileSync(path, "utf-8");
  return LEGACY_TOKENS.filter((token) => contents.includes(token)).map(
    (token) => `${relative(ROOT, path)}: ${token}`,
  );
}

describe("t432 config vocabulary drift", () => {
  test("active implementation and specification use only structured names", () => {
    const violations = ACTIVE_ROOTS.flatMap(files).flatMap(legacyViolations);
    expect(violations).toEqual([]);
  });

  test("guide and reference tables cover every registry path and default", () => {
    const documents = [
      readFileSync(join(ROOT, "docs", "guide", "21-layered-config.md"), "utf-8"),
      readFileSync(join(ROOT, "docs", "reference", "19-layered-config.md"), "utf-8"),
    ];
    for (const entry of AMADEUS_CONFIG_REGISTRY) {
      const defaultText = typeof entry.defaultValue === "object"
        ? JSON.stringify(entry.defaultValue)
        : String(entry.defaultValue);
      for (const document of documents) {
        const row = document
          .split("\n")
          .find((line) => line.startsWith(`| \`${entry.path}\``));
        expect(row).toBeDefined();
        expect(row).toContain(`\`${defaultText}\``);
      }
    }
    expect(documents[1]).toContain("Arrays replace rather than");
  });
});
