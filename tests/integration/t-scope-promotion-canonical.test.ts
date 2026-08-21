// FR-0 — promote the five Amadeus-only scope definitions into the core
// catalog and derive every projected 15-key grid from stage frontmatter.
//
// The fixture is a frozen copy of the pre-migration root .claude grid. It is
// intentionally independent of the compiler: changing stage membership does
// not rewrite the expected cells. The pr-convergence cell is a composed
// plugin extra and is excluded only from canonical-stage comparisons.
// covers: dir:packages/framework/core/scopes
// covers: dir:packages/framework/core/amadeus-common/stages
// covers: file:packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts
// covers: scope:installer-distribution, scope:self-document, scope:self-feature, scope:self-fix, scope:self-refactor
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type GraphStage,
  transposeScopeGrid,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import { parseStageFrontmatter } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_SCOPES_DIR = join(REPO_ROOT, "packages", "framework", "core", "scopes");
const CORE_STAGES_DIR = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "amadeus-common",
  "stages",
);
const ORACLE_PATH = join(
  REPO_ROOT,
  "tests",
  "fixtures",
  "u3-scope-promotion",
  "pre-migration-15-key-grid.json",
);

const PROMOTED_SCOPES = [
  "installer-distribution",
  "self-document",
  "self-feature",
  "self-fix",
  "self-refactor",
] as const;

const DOGFOOD_FACES = [".claude", ".codex", ".cursor", ".kimi-code", ".opencode", ".pi"] as const;
const DIST_FACES = [
  ["claude", ".claude"],
  ["codex", ".codex"],
  ["cursor", ".cursor"],
  ["kimi", ".kimi-code"],
  ["kiro", ".kiro"],
  ["kiro-ide", ".kiro"],
  ["opencode", ".opencode"],
] as const;

type ScopeGrid = Record<string, { stages: Record<string, "EXECUTE" | "SKIP"> }>;

const oracle = JSON.parse(readFileSync(ORACLE_PATH, "utf-8")) as ScopeGrid;
const oracleScopeNames = Object.keys(oracle).sort();

function markdownFilesBelow(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...markdownFilesBelow(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

function coreStages(): GraphStage[] {
  return markdownFilesBelow(CORE_STAGES_DIR).map((path) => {
    const parsed = parseStageFrontmatter(readFileSync(path, "utf-8"));
    if (typeof parsed.slug !== "string") {
      throw new Error(`stage has no slug: ${relative(REPO_ROOT, path)}`);
    }
    return parsed as unknown as GraphStage;
  });
}

function readGrid(path: string): ScopeGrid {
  return JSON.parse(readFileSync(path, "utf-8")) as ScopeGrid;
}

function canonicalCells(grid: ScopeGrid, scope: string, stageSlugs: readonly string[]): unknown {
  return Object.fromEntries(stageSlugs.map((slug) => [slug, grid[scope]?.stages[slug]]));
}

function projectedGridPaths(): string[] {
  return [
    ...DOGFOOD_FACES.map((face) => join(REPO_ROOT, face, "tools", "data", "scope-grid.json")),
    ...DIST_FACES.map(([dist, face]) =>
      join(REPO_ROOT, "dist", dist, face, "tools", "data", "scope-grid.json")
    ),
  ];
}

describe("u3 scope promotion canonical projection", () => {
  const stages = coreStages();
  const stageSlugs = stages.map((stage) => stage.slug);

  test("the core catalog contains the frozen 15-scope key set", () => {
    const actual = readdirSync(CORE_SCOPES_DIR)
      .filter((name) => /^amadeus-.+\.md$/.test(name))
      .map((name) => name.slice("amadeus-".length, -".md".length))
      .sort();
    expect(actual).toEqual(oracleScopeNames);
  });

  test("stage frontmatter transposes to every frozen canonical cell", () => {
    const compiled = transposeScopeGrid(stages);
    expect(Object.keys(compiled).sort()).toEqual(oracleScopeNames);
    for (const scope of oracleScopeNames) {
      expect(canonicalCells(compiled, scope, stageSlugs)).toEqual(
        canonicalCells(oracle, scope, stageSlugs),
      );
    }
  });

  test("all generated and dogfood projections expose the same 15 canonical rows", () => {
    for (const path of projectedGridPaths()) {
      const projected = readGrid(path);
      expect(Object.keys(projected).sort()).toEqual(oracleScopeNames);
      for (const scope of PROMOTED_SCOPES) {
        expect(canonicalCells(projected, scope, stageSlugs)).toEqual(
          canonicalCells(oracle, scope, stageSlugs),
        );
      }
    }
  });

  test("all promoted scope definitions are byte-identical on every projection", () => {
    for (const scope of PROMOTED_SCOPES) {
      const canonical = readFileSync(join(CORE_SCOPES_DIR, `amadeus-${scope}.md`), "utf-8");
      for (const face of DOGFOOD_FACES) {
        expect(
          readFileSync(join(REPO_ROOT, face, "scopes", `amadeus-${scope}.md`), "utf-8"),
        ).toBe(canonical);
      }
      for (const [dist, face] of DIST_FACES) {
        expect(
          readFileSync(
            join(REPO_ROOT, "dist", dist, face, "scopes", `amadeus-${scope}.md`),
            "utf-8",
          ),
        ).toBe(canonical);
      }
    }
  });
});
