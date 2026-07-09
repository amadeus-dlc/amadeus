// covers: function:relativeCodekbReScanDir, function:codekbReScanDir, function:relativeCodekbReScanFile, function:codekbReScanFile
//
// t203 — per-intent RE re-scan record (deterministic, no-LLM, mechanism `none`).
//
// Pins the #707 fix: the reverse-engineering stage's freshness/base-point record
// moves from a SINGLE shared `reverse-engineering-timestamp.md` (a mutable cell
// two concurrent intents overwrite — the bug) to a PER-INTENT file under
// `codekb/<repo>/re-scans/<intent-record>.md`. Because the intent record name
// (`<slug>-<id8>`) is globally unique, two intents recording different
// base/observed/focus points resolve to DISTINCT paths and can never destroy one
// another (FR-2.4 acceptance). The 8 body artifacts + the shared timestamp
// pointer stay repo-level last-writer-wins; only the base point is per-intent.
//
// The lib helpers are EXPORTED and imported in-process (the `none` floor). The
// intent argument is passed EXPLICITLY so the anti-collision property is proven
// without depending on cursor resolution.

import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_SPACE,
  resetAidlcEnv,
} from "../harness/fixtures.ts";
import {
  codekbReScanDir,
  codekbReScanFile,
  relativeCodekbDir,
  relativeCodekbReScanDir,
  relativeCodekbReScanFile,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

resetAidlcEnv();

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function freshProject(): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  return proj;
}

const REPO = "amadeus";

describe("t203 per-intent RE re-scan record — concurrent intents never overwrite (#707)", () => {
  // The OLD single shared timestamp file resolves to ONE path regardless of the
  // scanning intent — the collision the bug describes. Documents the hazard the
  // per-intent structure removes (this passes on the pre-fix path too).
  test("the shared reverse-engineering-timestamp path is intent-independent (the overwrite hazard)", () => {
    const proj = freshProject();
    const shared = `${relativeCodekbDir(proj, REPO, DEFAULT_SPACE)}/reverse-engineering-timestamp.md`;
    expect(shared).toBe(
      `amadeus/spaces/${DEFAULT_SPACE}/codekb/${REPO}/reverse-engineering-timestamp.md`,
    );
    expect(shared).not.toContain("re-scans");
  });

  // The FIX: per-intent re-scan record files are DISTINCT for distinct intents.
  test("relativeCodekbReScanFile returns DISTINCT paths for two distinct intent records", () => {
    const proj = freshProject();
    const a = relativeCodekbReScanFile(proj, REPO, DEFAULT_SPACE, "login-flow-aaaaaaaa");
    const b = relativeCodekbReScanFile(proj, REPO, DEFAULT_SPACE, "checkout-bbbbbbbb");
    expect(a).toBe(
      `amadeus/spaces/${DEFAULT_SPACE}/codekb/${REPO}/re-scans/login-flow-aaaaaaaa.md`,
    );
    expect(b).toBe(
      `amadeus/spaces/${DEFAULT_SPACE}/codekb/${REPO}/re-scans/checkout-bbbbbbbb.md`,
    );
    expect(a).not.toBe(b);
  });

  test("relativeCodekbReScanDir composes the per-repo re-scans dir (no intent tail)", () => {
    const proj = freshProject();
    expect(relativeCodekbReScanDir(proj, REPO, DEFAULT_SPACE)).toBe(
      `amadeus/spaces/${DEFAULT_SPACE}/codekb/${REPO}/re-scans`,
    );
  });

  test("codekbReScanDir / codekbReScanFile end with the expected absolute tail", () => {
    const proj = freshProject();
    expect(
      codekbReScanDir(proj, REPO, DEFAULT_SPACE).endsWith(join("codekb", REPO, "re-scans")),
    ).toBe(true);
    const f = codekbReScanFile(proj, REPO, DEFAULT_SPACE, "x-12345678");
    expect(f).not.toBeNull();
    expect((f as string).endsWith(join("re-scans", "x-12345678.md"))).toBe(true);
  });

  // When no intent resolves (a fresh shell with a cursor + registry row but NO
  // amadeus-state.md, so activeIntent → null) the per-intent file is null: the
  // caller cannot name a per-intent record without an intent. Mirrors
  // activeIntent's null contract and relativeRecordDir's null behaviour.
  test("relativeCodekbReScanFile is null when no intent resolves (default intent, no state file)", () => {
    const proj = freshProject();
    expect(relativeCodekbReScanFile(proj, REPO, DEFAULT_SPACE)).toBeNull();
    expect(codekbReScanFile(proj, REPO, DEFAULT_SPACE)).toBeNull();
  });
});
