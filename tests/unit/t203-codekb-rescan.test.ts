// covers: function:relativeCodekbReScanDir, function:codekbReScanDir, function:relativeCodekbReScanFile, function:codekbReScanFile, subcommand:amadeus-utility:codekb-path
//
// t203 — per-intent RE re-scan record (deterministic, no-LLM, mechanism `none`+`cli`).
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
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  codekbReScanDir,
  codekbReScanFile,
  relativeCodekbDir,
  relativeCodekbReScanDir,
  relativeCodekbReScanFile,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handleCodekbPath } from "../../dist/claude/.claude/tools/amadeus-utility.ts";

resetAidlcEnv();

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUN = process.execPath;
const UTILITY = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");
const FIXTURES_DIR = join(REPO_ROOT, "tests", "fixtures");

// Clear a leaked AMADEUS_DEFAULT_SCOPE so spawned tools read the fixture scope.
const childEnv = (): NodeJS.ProcessEnv => {
  const e = { ...process.env };
  delete e.AMADEUS_DEFAULT_SCOPE;
  return e;
};

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function freshProject(): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  return proj;
}

// A project whose active-intent cursor resolves: createTestProject seeds the
// registry row + cursor but NO amadeus-state.md, and activeIntent only honours a
// record dir that holds a state file. Seeding one makes activeIntent resolve to
// DEFAULT_RECORD_DIR so the per-intent re-scan file has a concrete stem.
function resolvingProject(): string {
  const proj = freshProject();
  seedStateFile(proj, join(FIXTURES_DIR, "state-brownfield-feature.md"));
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

// ============================================================================
// codekb-path --re-scan CLI ROUTING — exercised IN-PROCESS (so the handler lines
// are instrumented by bun --coverage) AND via the real spawned CLI (real argv
// dispatch + exit codes). The in-process arm captures process.stdout.write /
// process.exit / console.error by save-restore monkeypatch (no spyOn dependency;
// restored in `finally`), mirroring the CLI's own IO.
// ============================================================================
describe("t203 codekb-path --re-scan routing (in-process handler)", () => {
  const EXPECTED = `amadeus/spaces/${DEFAULT_SPACE}/codekb/svc/re-scans/${DEFAULT_RECORD_DIR}.md`;

  // Run handleCodekbPath with process.stdout.write captured; returns what it wrote.
  function captureOut(proj: string, flags: Record<string, string>): string {
    const original = process.stdout.write.bind(process.stdout);
    let out = "";
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
      return true;
    }) as typeof process.stdout.write;
    try {
      handleCodekbPath(proj, flags);
    } finally {
      process.stdout.write = original;
    }
    return out;
  }

  test("--re-scan prints the per-intent scan-record file for the active intent", () => {
    const proj = resolvingProject();
    const out = captureOut(proj, { repo: "svc", "re-scan": "true" });
    expect(out).toBe(`${EXPECTED}\n`);
  });

  test("--re-scan --json carries {space, repo, dir, reScanFile}", () => {
    const proj = resolvingProject();
    const out = captureOut(proj, { repo: "svc", "re-scan": "true", json: "true" });
    const parsed = JSON.parse(out.trim());
    expect(parsed.space).toBe(DEFAULT_SPACE);
    expect(parsed.repo).toBe("svc");
    expect(parsed.dir).toBe(`amadeus/spaces/${DEFAULT_SPACE}/codekb/svc`);
    expect(parsed.reScanFile).toBe(EXPECTED);
  });

  test("--re-scan dies (exit 1, error JSON) when NO active intent resolves", () => {
    const proj = freshProject(); // registry row + cursor, but NO amadeus-state.md
    const origArgv = process.argv;
    const origExit = process.exit;
    const origErr = console.error;
    // Point die()'s argv-based --project-dir resolution at the temp project so its
    // emitError never touches the real workspace (temp has no state file → no audit
    // write, just console.error + exit).
    process.argv = ["bun", "amadeus-utility", "--project-dir", proj, "codekb-path", "--repo", "svc", "--re-scan"];
    let exitCode: number | undefined;
    let errPayload = "";
    process.exit = ((code?: number): never => {
      exitCode = code;
      throw new Error("__EXIT__");
    }) as typeof process.exit;
    console.error = (msg?: unknown): void => {
      errPayload = String(msg);
    };
    try {
      expect(() => handleCodekbPath(proj, { repo: "svc", "re-scan": "true" })).toThrow("__EXIT__");
    } finally {
      process.argv = origArgv;
      process.exit = origExit;
      console.error = origErr;
    }
    expect(exitCode).toBe(1);
    expect(JSON.parse(errPayload).error).toContain("no active intent");
  });

  // The plain codekb-path (no --re-scan) path still prints the DIR — proving the
  // new `reScan` branch does not disturb the existing routing.
  test("without --re-scan the handler still prints the codekb dir", () => {
    const proj = resolvingProject();
    const out = captureOut(proj, { repo: "svc" });
    expect(out).toBe(`amadeus/spaces/${DEFAULT_SPACE}/codekb/svc/\n`);
  });
});

describe("t203 codekb-path --re-scan routing (spawned real CLI)", () => {
  test("spawned --re-scan --json prints reScanFile and exits 0", () => {
    const proj = resolvingProject();
    const res = spawnSync(
      BUN,
      [UTILITY, "codekb-path", "--project-dir", proj, "--repo", "svc", "--re-scan", "--json"],
      { encoding: "utf-8", env: childEnv() },
    );
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.reScanFile).toBe(
      `amadeus/spaces/${DEFAULT_SPACE}/codekb/svc/re-scans/${DEFAULT_RECORD_DIR}.md`,
    );
  });

  test("spawned --re-scan with no active intent exits 1 with an error JSON on stderr", () => {
    const proj = freshProject(); // no amadeus-state.md → no intent resolves
    const res = spawnSync(
      BUN,
      [UTILITY, "codekb-path", "--project-dir", proj, "--repo", "svc", "--re-scan"],
      { encoding: "utf-8", env: childEnv() },
    );
    expect(res.status).toBe(1);
    expect(JSON.parse(res.stderr.trim()).error).toContain("no active intent");
  });
});
