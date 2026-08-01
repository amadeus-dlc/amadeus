// covers: cli:amadeus-state(fork)
// size: medium
//
// U6 iteration 4 — the writer half of the Construction pair (#1868 §2). The
// fork drops a marker into the worktree it creates naming the unit of work that
// worktree serves; otel/span-context reads it back as amadeus.bolt /
// amadeus.unit.
//
// The marker is NOT a state field. The state file is a tracked path shared with
// main, so a value written into one worktree reaches main when that branch
// merges and would then name that Bolt for every later process there — the
// exact shape the existing decorative `Worktree Path` field already exhibits on
// this repository's main. The assertions below therefore cover both halves:
// that the fork writes the right discriminated value, and that the path it
// writes to is one git refuses to track.
//
// The slug alone cannot say whether it names a Bolt or a swarm unit — the swarm
// drives the same fork with a unit name — so the caller passes `--unit`.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { birthIntent, getField, readStateFile, stateFilePath } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  BOLT_CONTEXT_MARKER,
  boltContextKind,
  writeBoltContextMarker,
} from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { cleanupTestProject, createTestProject, REPO_ROOT } from "../harness/fixtures.ts";

const BUN = process.execPath;
const STATE_TOOL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");

// A project with one intent whose state carries the two fields the fork
// updates. The seeded fixture ships no field bullets, so they are written in
// the canonical form and read back — a fixture that failed to write cannot pass
// itself off as one that did.
const SEEDED_FIELDS = [
  ["Bolt Refs", "[empty list]"],
  ["Worktree Path", ""],
] as const;

function seededProject(): string {
  const proj = createTestProject();
  birthIntent(proj, "otel-marker", "default", "feature");
  const bullets = SEEDED_FIELDS.map(([field, value]) => `- **${field}**: ${value}`).join("\n");
  writeFileSync(stateFilePath(proj), `${readStateFile(proj).trimEnd()}\n${bullets}\n`, "utf-8");
  for (const [field] of SEEDED_FIELDS) {
    expect(getField(readStateFile(proj), field), `seeded ${field}`).not.toBeNull();
  }
  return proj;
}

// Fork into a throwaway worktree dir: --target-dir stands in for the real
// worktree so no git is needed for the marker's write path.
function fork(proj: string, slug: string, extra: string[] = []): { status: number; stderr: string } {
  const worktree = join(proj, `wt-${slug}`);
  mkdirSync(worktree, { recursive: true });
  const run = spawnSync(
    BUN,
    [STATE_TOOL, "--project-dir", proj, "fork", "--slug", slug, "--target-dir", worktree, ...extra],
    { cwd: proj, encoding: "utf-8" }
  );
  return { status: run.status ?? -1, stderr: run.stderr ?? "" };
}

function markerOf(proj: string, slug: string): string {
  const record = join(proj, `wt-${slug}`, "amadeus", "spaces", "default", "intents");
  const dir = join(record, readdirSync(record)[0]!);
  return readFileSync(join(dir, BOLT_CONTEXT_MARKER), "utf-8");
}

describe("the fork writes the telemetry marker (#1868 §2)", () => {
  test("a Bolt fork names a bolt; a swarm fork names a unit", () => {
    const proj = seededProject();
    try {
      const bolt = fork(proj, "docs");
      expect(bolt.status, bolt.stderr).toBe(0);
      expect(JSON.parse(markerOf(proj, "docs"))).toEqual({ bolt: "docs" });

      const unit = fork(proj, "u03-relay", ["--unit"]);
      expect(unit.status, unit.stderr).toBe(0);
      expect(JSON.parse(markerOf(proj, "u03-relay"))).toEqual({ unit: "u03-relay" });
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("the marker lands beside the worktree's own state file, not main's", () => {
    const proj = seededProject();
    try {
      expect(fork(proj, "isolated").status).toBe(0);
      const intents = join(proj, "amadeus", "spaces", "default", "intents");
      const record = join(intents, readdirSync(intents)[0]!);
      expect(existsSync(join(record, BOLT_CONTEXT_MARKER))).toBe(false);
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("the marker path is one git refuses to track — the value cannot reach main", () => {
    const probe = spawnSync(
      "git",
      ["check-ignore", `amadeus/spaces/default/intents/an-intent/${BOLT_CONTEXT_MARKER}`],
      { cwd: REPO_ROOT, encoding: "utf-8" }
    );
    expect(probe.status, `git check-ignore said: ${probe.stdout}${probe.stderr}`).toBe(0);
  });
});

// The seam the fork calls. Driven in-process here: the fork handler itself runs
// only in a spawned CLI, where coverage cannot see it, so the decision and the
// write live where a test can reach them directly.
describe("the marker seam (in-process)", () => {
  test("the kind is read off argv, defaulting to bolt", () => {
    expect(boltContextKind(["fork", "--slug", "docs"])).toBe("bolt");
    expect(boltContextKind(["fork", "--slug", "u03", "--unit"])).toBe("unit");
    expect(boltContextKind([])).toBe("bolt");
  });

  test("the write creates the record dir and names the slug under its kind", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-marker-"));
    try {
      const nested = join(dir, "record");
      writeBoltContextMarker(nested, "u03-relay", "unit");
      expect(JSON.parse(readFileSync(join(nested, BOLT_CONTEXT_MARKER), "utf-8"))).toEqual({
        unit: "u03-relay",
      });

      // A re-fork of the same worktree overwrites: a stale value would outlive
      // the work it described.
      writeBoltContextMarker(nested, "docs", "bolt");
      expect(JSON.parse(readFileSync(join(nested, BOLT_CONTEXT_MARKER), "utf-8"))).toEqual({
        bolt: "docs",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
