// t492 — `--autonomy` conduit parity (#2378 FR-5d).
// size: medium
//
// The launch declaration is only reachable if the surfaces a user or a
// conductor actually reads mention it. Before this guard, `--autonomy` was
// implemented in the engine and named on ZERO harness entry points: the flag
// worked and nobody could find it.
//
// The conduit set is DERIVED, never listed: every directory under
// packages/framework/harness/ contributes exactly one canonical entry point —
// skills/amadeus/SKILL.md for the skill harnesses, commands/amadeus.md for the
// command harnesses. A new harness therefore joins the contract by existing, and
// no count lives anywhere in this file (cid:functional-design:c3-adjacent-enum-numerals).
// The derivation is itself asserted: a harness that carries neither entry point,
// or both, reds here rather than silently dropping out of the set.
//
// The help text is observed at the PROCESS boundary (spawn of the shipped
// amadeus-utility.ts `help`), not by grepping the source that renders it — the
// contract is what a user sees, and dist/ is the surface the user runs
// (cid:code-generation:no-canonical-direct-execution).
//
// The English/Japanese reference pair is checked as a pair on purpose: a
// one-sided doc update is the failure this file is meant to catch.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const HARNESS_ROOT = join(REPO_ROOT, "packages", "framework", "harness");
const FLAG = "--autonomy";

// The two shapes a harness entry point can take, relative to its harness dir.
const ENTRY_POINT_CANDIDATES = [
  join("skills", "amadeus", "SKILL.md"),
  join("commands", "amadeus.md"),
] as const;

interface Conduit {
  readonly label: string;
  readonly path: string;
}

// Every harness directory, read from disk. Non-directory entries (registry.ts,
// projections.ts) are excluded by withFileTypes rather than by name, so a new
// sibling module never has to be added to an ignore list.
function harnessNames(): string[] {
  return readdirSync(HARNESS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// The entry points a harness carries. Returning ALL matches (not the first) is
// what lets the derivation assert exactly-one below.
function entryPointsOf(harness: string): string[] {
  return ENTRY_POINT_CANDIDATES.map((rel) => join(HARNESS_ROOT, harness, rel)).filter(
    (path) => existsSync(path),
  );
}

const HARNESSES = harnessNames();

const CONDUITS: Conduit[] = HARNESSES.flatMap((harness) =>
  entryPointsOf(harness).map((path) => ({ label: `harness:${harness}`, path })),
);

// The non-harness surfaces the requirement names, kept as an explicit list
// because there is no directory that enumerates them. This list IS the canonical
// definition of the documentation side of the contract.
const DOC_SURFACES: Conduit[] = [
  { label: "README (en)", path: join(REPO_ROOT, "README.md") },
  { label: "README (ja)", path: join(REPO_ROOT, "README.ja.md") },
  {
    label: "reference 24 (en)",
    path: join(REPO_ROOT, "docs", "reference", "24-intent-autonomy.md"),
  },
  {
    label: "reference 24 (ja)",
    path: join(REPO_ROOT, "docs", "reference", "24-intent-autonomy.ja.md"),
  },
];

function readSurface(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("t492 --autonomy conduit parity", () => {
  test("every harness carries exactly one canonical entry point", () => {
    // Guards the derivation itself: without this, a harness whose entry point
    // moved would leave the conduit set silently short and every parity
    // assertion below would still pass.
    const malformed = HARNESSES.filter((harness) => entryPointsOf(harness).length !== 1);
    expect(malformed).toEqual([]);
    expect(HARNESSES.length).toBeGreaterThan(0);
  });

  test("every harness entry point names the launch declaration flag", () => {
    const silent = CONDUITS.filter((c) => !readSurface(c.path).includes(FLAG)).map(
      (c) => c.label,
    );
    expect(silent).toEqual([]);
  });

  test("README and the autonomy reference name the flag, in both languages", () => {
    const silent = DOC_SURFACES.filter((c) => !readSurface(c.path).includes(FLAG)).map(
      (c) => c.label,
    );
    expect(silent).toEqual([]);
  });

  test("the shipped help text names the flag", () => {
    const tool = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");
    const res = spawnSync(process.execPath, [tool, "help"], { encoding: "utf-8" });
    expect(res.status).toBe(0);
    expect(res.stdout ?? "").toContain(FLAG);
  });

  test("stage-protocol gives semi its own decide-question procedure", () => {
    // FR-5c: the contract line already said `semi` resolves questions through
    // the ladder, but the operational paragraph was written for `full` only, so
    // a conductor under `semi` had no named procedure to follow.
    const protocol = readSurface(
      join(
        REPO_ROOT,
        "packages",
        "framework",
        "core",
        "amadeus-common",
        "protocols",
        "stage-protocol.md",
      ),
    );
    expect(protocol).toContain("For a question under `semi`");
    expect(protocol).toContain("For a question under `full`");
  });
});
