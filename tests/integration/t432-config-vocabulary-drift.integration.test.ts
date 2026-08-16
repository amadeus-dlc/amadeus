// t432 — active configuration vocabulary drift guard.
// covers: packages/framework/core, docs, amadeus/spaces/default/memory
// size: medium

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
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
  // RFC-0001 ADR-8 (C7/FR-7): solo-election.trigger.mode was abolished (no
  // replacement leaf — derived from Intent Autonomy Mode) and the consent-axis
  // keys were renamed .mode -> .consent. amadeus-config.ts itself is exempt
  // (legacyViolations skips it) because it must still name the OLD spellings
  // in its LEGACY_KEY_REPLACEMENTS / LEGACY_PATH_REPLACEMENTS diagnostics.
  "solo-election.trigger.mode",
  "intent-mirror.github.issue.mode",
  "finding.github.issue.creation.mode",
] as const;

// Files that must still be able to NAME an old spelling verbatim — either to
// explain a fail-closed diagnostic (amadeus-config.ts, the layered-config
// docs it feeds) or because they are process/method prose owned by a
// different unit-of-work.md unit (U12 docs-norms: stage-protocol.md, the
// memory layers, and the election SKILL) whose sync is that unit's FR-14
// follow-up, not this unit's (config-visibility / U7)'s to resolve.
const LEGACY_TOKEN_EXEMPT_SUFFIXES = [
  "tools/amadeus-config.ts",
  "docs/guide/21-layered-config.md",
  "docs/guide/21-layered-config.ja.md",
  "docs/reference/19-layered-config.md",
  "docs/reference/19-layered-config.ja.md",
  "amadeus-common/conductor.md",
  "amadeus-common/protocols/stage-protocol.md",
  "skills/amadeus-election/SKILL.md",
  "memory/team.md",
  "memory/project.md",
] as const;

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return files(path);
    return entry.isFile() ? [path] : [];
  });
}

function legacyViolations(path: string): string[] {
  // join() yields "\"-separated paths on Windows; the exempt suffixes are
  // written with "/", so normalize before matching.
  const slashed = path.split(sep).join("/");
  if (LEGACY_TOKEN_EXEMPT_SUFFIXES.some((suffix) => slashed.endsWith(suffix))) return [];
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
