// covers: subcommand:amadeus-utility:doctor
//
// Issue #830: doctor's worktree-family Check 1 (orphan worktrees, :831) and
// Check 3 (orphan state files, :998) walked the raw `join(projectDir, ".amadeus",
// "worktrees")` and did NOT apply the Bolt-worktree anchor rule (#727/#746) that
// `worktreePath`/Check 2 use. From a sibling dev worktree session (`anchored`
// context, #670), the real Bolt worktrees live under the MAIN checkout, so Check
// 1/3 walked the empty sibling path and reported "0 observed / pass" — a FALSE
// NEGATIVE that hid on-disk orphans, while Check 2 (:960, `worktreePath`) in the
// SAME doctor run correctly resolved the main checkout (in-file inconsistency).
//
// The fix routes Check 1/3 through `worktreeBaseDir(projectDir)` so all three
// worktree checks resolve one location. This test drives the real doctor CLI
// from a sibling worktree with an orphan planted under the MAIN checkout:
//   - RED (pre-fix): raw join(sibling) is empty → "Orphan worktrees: 0 observed",
//     "Orphan state files: 0 observed" — the false negative.
//   - GREEN (post-fix): anchored to the main checkout → the orphan surfaces as
//     "Orphan worktrees: 1 drift" / "Orphan state files: 1 drift".
//
// Reuses the #746 t209 sibling-scratch shape (origin bare <- publisher -> clone
// main checkout -> sibling dev worktree). No test changes process.cwd(); the
// doctor is spawned with cwd pinned to the sibling, and a failed git setup throws
// immediately so a command can never continue in an unintended repository.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  DEFAULT_SPACE,
  seedWorkspaceShell,
  seededStateFile,
} from "../harness/fixtures.ts";

// Doctor is spawned from the DIST tree (dist/claude/.claude/tools) because it
// loads data/stage-graph.json, which only the packaged tree carries. mechanism =
// cli, mirroring t83. The dist copy must be regenerated from core before this
// runs (the PR's package.ts step); the falling proof toggles the source and
// re-packages to exercise both the raw-join (RED) and anchored (GREEN) walker.
const BUN = process.execPath;
const UTIL = join(AMADEUS_SRC, "tools", "amadeus-utility.ts");

interface SiblingScratch {
  root: string;
  clone: string; // main checkout — the anchor target
  sibling: string; // sibling dev worktree — the anchored session cwd + projectDir
}

let scratch: SiblingScratch;

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}: ${result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`}`,
    );
  }
  return (result.stdout ?? "").trim();
}

// origin bare <- publisher -> clone (main checkout) -> sibling dev worktree
function makeSiblingScratch(): SiblingScratch {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t210-"));
  const origin = join(root, "origin.git");
  const publisher = join(root, "publisher");
  const clone = join(root, "clone");
  const sibling = join(clone, ".claude", "worktrees", "dev-x");
  try {
    git(root, ["init", "-q", "--bare", "--initial-branch=main", origin]);
    git(root, ["init", "-q", "--initial-branch=main", publisher]);
    git(publisher, ["config", "user.email", "t210@example.com"]);
    git(publisher, ["config", "user.name", "t210"]);
    writeFileSync(join(publisher, "README.md"), "initial\n", "utf-8");
    git(publisher, ["add", "README.md"]);
    git(publisher, ["commit", "-q", "-m", "initial"]);
    git(publisher, ["remote", "add", "origin", origin]);
    git(publisher, ["push", "-q", "-u", "origin", "main"]);
    git(root, ["clone", "-q", origin, clone]);
    git(clone, ["worktree", "add", "-q", "-b", "dev-x", sibling, "main"]);
    // The projectDir (sibling) carries a workspace shell so doctor reads its main
    // state there; the orphan is planted under the main checkout below.
    seedWorkspaceShell(clone);
    writeFileSync(seededStateFile(clone), "- **Current Stage**: code-generation\n", "utf-8");
    seedWorkspaceShell(sibling);
    writeFileSync(seededStateFile(sibling), "- **Current Stage**: code-generation\n", "utf-8");
    return { root, clone, sibling };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Plant an orphan Bolt worktree (a dir with a seeded state file) under a base
 * checkout's `.amadeus/worktrees/bolt-<slug>/`. The slug is NOT in any Bolt Refs
 * and carries no terminal audit row, so it is "unmatched" for Check 1 and an
 * orphan state file for Check 3. The state file lands at the bare-space record
 * root doctor resolves (relativeSpaceRecordPrefix): amadeus/spaces/default/intents.
 */
function plantOrphan(baseCheckout: string, slug: string): void {
  const recordRoot = join(
    baseCheckout,
    ".amadeus",
    "worktrees",
    `bolt-${slug}`,
    "amadeus",
    "spaces",
    DEFAULT_SPACE,
    "intents",
  );
  mkdirSync(recordRoot, { recursive: true });
  writeFileSync(join(recordRoot, "amadeus-state.md"), "# orphan state\n", "utf-8");
}

interface DoctorResult {
  status: number;
  out: string;
}

/** `bun UTIL doctor --project-dir <proj>` spawned with cwd pinned to <cwd>. */
function runDoctor(cwd: string, projectDir: string): DoctorResult {
  const res = spawnSync(BUN, [UTIL, "doctor", "--project-dir", projectDir], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env },
  });
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

beforeEach(() => {
  scratch = makeSiblingScratch();
});

afterEach(() => {
  rmSync(scratch.root, { recursive: true, force: true });
});

describe("t210 doctor worktree Check 1/3 anchor at the main checkout (#830)", () => {
  test("orphan planted under the main checkout surfaces from a sibling session", () => {
    // Plant the orphan under the MAIN checkout (clone), NOT under the sibling.
    plantOrphan(scratch.clone, "orphananchor");

    // Doctor runs from the sibling dev worktree with projectDir = sibling — the
    // anchored (#670) conductor context. Pre-fix, Check 1/3 walked the empty
    // sibling path (0 observed); post-fix they anchor at the main checkout.
    const { out } = runDoctor(scratch.sibling, scratch.sibling);

    // Check 1 — the orphan worktree is observed and flagged as unmatched drift.
    expect(out).not.toContain("Orphan worktrees: 0 observed");
    expect(out).toContain("Orphan worktrees: 1 drift");
    const wtLine = out.split("\n").find((l) => l.includes("unmatched")) ?? "";
    expect(wtLine).toContain("orphananchor");

    // Check 3 — the orphan state file is observed and flagged as drift.
    expect(out).not.toContain("Orphan state files: 0 observed");
    expect(out).toContain("Orphan state files: 1 drift");
    const stateLine =
      out.split("\n").find((l) => l.includes("state files for")) ?? "";
    expect(stateLine).toContain("orphananchor");
  }, 30000);

  test("in-file consistency: Check 1/3 agree with Check 2's anchored resolution", () => {
    // Same planted orphan; assert no worktree check reports the sibling's empty
    // path as clean while another sees the main checkout (the #830 inconsistency).
    plantOrphan(scratch.clone, "orphananchor");
    const { out } = runDoctor(scratch.sibling, scratch.sibling);
    expect(out).not.toContain("Orphan worktrees: 0 observed");
    expect(out).not.toContain("Orphan state files: 0 observed");
  }, 30000);
});
