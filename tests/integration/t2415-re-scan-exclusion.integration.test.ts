// covers: packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md
// size: medium
//
// t2415 — the exclusion predicate half of #2415: what a reverse-engineering
// differential refresh must take OUT of its diff input, and the proof that the
// pathspecs which express it actually bite.
//
// WHY A FIXTURE REPO. The predicate is a set of git pathspecs, so the only
// honest test of it is a real `git diff` over a real interval. Running it
// against this repo's own history would pin commit SHAs that a shallow CI
// clone may not have; a seeded repo in a tempdir is hermetic, deterministic,
// and still exercises git's own pathspec matcher rather than a re-implementation
// of it. The interval is non-zero by construction and its per-class line counts
// are known, so "positive count" is asserted as an exact number, not a `> 0`
// that a half-working predicate could also satisfy.
//
// THE TRAP THIS PINS (FR-EXC-5). `amadeus/spaces/*/intents/` is a valid git
// pathspec that matches NOTHING: without `:(glob)` magic the `*` does not cross
// a `/`, so the exclusion silently excludes zero files and every scan keeps
// paying for the previous one while looking correctly configured. The negative
// control below is that bare form, and it must exclude nothing.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { RE_SCAN_EXCLUDED_PATHSPECS } from "../../packages/framework/core/tools/amadeus-lib.ts";

// ---------------------------------------------------------------------------
// The seeded interval. Each entry is one file added between base and head, with
// the exclusion class it belongs to (null = must survive the exclusion). Line
// counts differ per file so a mis-attributed file cannot hide inside an equal
// total.
// ---------------------------------------------------------------------------

interface SeedFile {
  readonly path: string;
  readonly lines: number;
  /** The declared exclusion class this path belongs to, or null when it must survive. */
  readonly excludedBy: string | null;
}

const INTENTS = ":(exclude,glob)amadeus/spaces/*/intents/**";
const ELECTIONS = ":(exclude,glob)amadeus/spaces/*/elections/**";
const CODEKB = ":(exclude,glob)amadeus/spaces/*/codekb/**";
const MEMORY = ":(exclude,glob)amadeus/spaces/*/memory/**";
const METRICS = ":(exclude,glob)metrics/**";

const SEED: readonly SeedFile[] = [
  // Workflow exhaust — every declared class, and two spaces so the `*` that
  // stands for the space name is exercised rather than assumed.
  { path: "amadeus/spaces/default/intents/260101-x/requirements.md", lines: 3, excludedBy: INTENTS },
  { path: "amadeus/spaces/other/intents/260102-y/audit/shard.jsonl", lines: 11, excludedBy: INTENTS },
  { path: "amadeus/spaces/default/elections/E-1/definition.json", lines: 4, excludedBy: ELECTIONS },
  { path: "amadeus/spaces/default/codekb/repo/architecture.md", lines: 5, excludedBy: CODEKB },
  { path: "amadeus/spaces/default/codekb/repo/re-scans/260101-x.md", lines: 13, excludedBy: CODEKB },
  { path: "amadeus/spaces/default/memory/project.md", lines: 6, excludedBy: MEMORY },
  { path: "metrics/snapshots/2026-01.json", lines: 7, excludedBy: METRICS },

  // Code knowledge — must survive. The two specs/ entries are the FR-EXC-2 pin:
  // they live under amadeus/spaces/ but a change has to keep them in step, so a
  // blanket amadeus/spaces/** would blind the scan to real work.
  { path: "amadeus/spaces/default/specs/rfc/0001-example.md", lines: 8, excludedBy: null },
  { path: "amadeus/spaces/default/specs/rfc/0002-example.md", lines: 2, excludedBy: null },
  { path: "packages/framework/core/tools/amadeus-lib.ts", lines: 9, excludedBy: null },
  { path: "tests/unit/t1.test.ts", lines: 3, excludedBy: null },
  { path: "docs/reference/04-stages/inception.md", lines: 1, excludedBy: null },
];

const DECLARED_CLASSES: readonly string[] = [INTENTS, ELECTIONS, CODEKB, MEMORY, METRICS];

let repo = "";
let base = "";
let head = "";

function git(args: string[]): string {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
  return r.stdout;
}

function numstat(pathspecs: readonly string[]): Map<string, number> {
  const args = ["diff", "--numstat", base, head];
  if (pathspecs.length > 0) args.push("--", ...pathspecs);
  const out = new Map<string, number>();
  for (const line of git(args).split("\n")) {
    if (line.trim() === "") continue;
    const [ins, , path] = line.split("\t");
    out.set(path, Number(ins));
  }
  return out;
}

/**
 * `path -> insertions` for what SURVIVES the given exclusions — the scan input
 * the contract describes. The leading `.` is what makes an exclude-only
 * pathspec list mean "everything, minus these"; without it git would match
 * nothing at all.
 */
function keptAfter(exclusions: readonly string[]): Map<string, number> {
  return numstat(exclusions.length === 0 ? [] : [".", ...exclusions]);
}

/** `path -> insertions` for what a single class CLAIMS (include form, no `.`). */
function claimedBy(include: string): Map<string, number> {
  return numstat([include]);
}

function totalOf(counts: Map<string, number>): number {
  let sum = 0;
  for (const n of counts.values()) sum += n;
  return sum;
}

/**
 * The include-form of a declared exclusion: `:(exclude,glob)X` -> `:(glob)X`.
 * Used to ask git which paths a single class claims. Throws rather than
 * silently degrading, so a hand-edited constant cannot turn the attribution
 * check into a no-op.
 */
function includeFormOf(exclusion: string): string {
  const prefix = ":(exclude,glob)";
  if (!exclusion.startsWith(prefix)) {
    throw new Error(`not an exclude,glob pathspec: ${exclusion}`);
  }
  return `:(glob)${exclusion.slice(prefix.length)}`;
}

beforeAll(() => {
  repo = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "t2415-exclusion-"));
  git(["init", "-q"]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(["config", "user.email", "t@x"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);

  writeFileSync(join(repo, "README.md"), "seed\n");
  git(["add", "README.md"]);
  git(["commit", "-qm", "base"]);
  base = git(["rev-parse", "HEAD"]).trim();

  for (const file of SEED) {
    const abs = join(repo, file.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, `${Array.from({ length: file.lines }, (_, i) => `line ${i}`).join("\n")}\n`);
  }
  git(["add", "-A"]);
  git(["commit", "-qm", "head"]);
  head = git(["rev-parse", "HEAD"]).trim();
});

afterAll(() => {
  if (repo !== "") rmSync(repo, { recursive: true, force: true });
});

describe("t2415 the canonical pathspecs bite (FR-EXC-5)", () => {
  test("the constant is exactly the five declared classes", () => {
    expect([...RE_SCAN_EXCLUDED_PATHSPECS]).toEqual([...DECLARED_CLASSES]);
  });

  test("applying them to a known non-zero interval removes a known positive count", () => {
    const all = keptAfter([]);
    const kept = keptAfter(RE_SCAN_EXCLUDED_PATHSPECS);
    const exhaust = SEED.filter((f) => f.excludedBy !== null);

    const seededExhaustLines = exhaust.reduce((sum, f) => sum + f.lines, 0);
    expect(seededExhaustLines).toBeGreaterThan(0);

    expect(totalOf(all) - totalOf(kept)).toBe(seededExhaustLines);
    expect(all.size - kept.size).toBe(exhaust.length);
  });

  // The failure mode this whole requirement exists for: a pathspec that looks
  // configured, matches nothing, and reports success. Every space-scoped class
  // written without `:(glob)` and without the `**` tail is exactly that.
  test("the bare directory form the requirement warns about excludes nothing", () => {
    const all = keptAfter([]);
    const bare = keptAfter([
      ":(exclude)amadeus/spaces/*/intents/",
      ":(exclude)amadeus/spaces/*/elections/",
      ":(exclude)amadeus/spaces/*/codekb/",
      ":(exclude)amadeus/spaces/*/memory/",
    ]);
    expect(totalOf(bare)).toBe(totalOf(all));
    expect(bare.size).toBe(all.size);
  });

  test("the space wildcard reaches every space, not just the default one", () => {
    const claimed = [...claimedBy(includeFormOf(INTENTS)).keys()];
    expect(claimed).toContain("amadeus/spaces/default/intents/260101-x/requirements.md");
    expect(claimed).toContain("amadeus/spaces/other/intents/260102-y/audit/shard.jsonl");
  });
});

describe("t2415 build ledgers under amadeus/spaces/ survive (FR-EXC-2)", () => {
  test("specs/rfc stays in the scan input", () => {
    const kept = keptAfter(RE_SCAN_EXCLUDED_PATHSPECS);
    expect([...kept.keys()]).toContain("amadeus/spaces/default/specs/rfc/0001-example.md");
    expect([...kept.keys()]).toContain("amadeus/spaces/default/specs/rfc/0002-example.md");
  });

  test("ordinary source, tests and docs are untouched by the exclusion", () => {
    const kept = keptAfter(RE_SCAN_EXCLUDED_PATHSPECS);
    for (const file of SEED.filter((f) => f.excludedBy === null)) {
      expect(kept.get(file.path)).toBe(file.lines);
    }
  });
});

describe("t2415 every exclusion is attributable (FR-EXC-4)", () => {
  test("each excluded path belongs to exactly one declared class, none unattributed", () => {
    const all = keptAfter([]);
    const kept = keptAfter(RE_SCAN_EXCLUDED_PATHSPECS);
    const excluded = [...all.keys()].filter((p) => !kept.has(p));
    expect(excluded.length).toBeGreaterThan(0);

    const claimants = new Map<string, string[]>(excluded.map((p) => [p, []]));
    for (const exclusion of RE_SCAN_EXCLUDED_PATHSPECS) {
      for (const path of claimedBy(includeFormOf(exclusion)).keys()) {
        claimants.get(path)?.push(exclusion);
      }
    }

    const unattributed = excluded.filter((p) => (claimants.get(p) ?? []).length === 0);
    const overAttributed = excluded.filter((p) => (claimants.get(p) ?? []).length > 1);
    expect(unattributed).toEqual([]);
    expect(overAttributed).toEqual([]);

    // The seeded classification is the independent side of the join: git's own
    // matcher must agree with what each file was seeded as.
    for (const file of SEED) {
      expect(claimants.get(file.path)?.[0] ?? null).toBe(file.excludedBy);
    }
  });

  test("the classes claim nothing that survived the exclusion", () => {
    const kept = keptAfter(RE_SCAN_EXCLUDED_PATHSPECS);
    for (const exclusion of RE_SCAN_EXCLUDED_PATHSPECS) {
      const claimed = [...claimedBy(includeFormOf(exclusion)).keys()];
      expect(claimed.filter((p) => kept.has(p))).toEqual([]);
    }
  });
});
