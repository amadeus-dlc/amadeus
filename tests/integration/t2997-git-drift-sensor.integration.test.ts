// t2997 — git-drift sensor against real repositories (U3, FR-DRIFT-1..6).
// covers: file:plugins/git-drift/tools/amadeus-sensor-git-drift.ts
// covers: file:plugins/git-drift/tools/git-drift-detect.ts
// size: medium
//
// The falling evidence the design names, run through the shipped CLI with its
// production ports — real `git`, real clock, real throttle file:
//
//   (i)   origin moves in a file this checkout also holds  -> warning, named
//   (ii)  origin moves only elsewhere                      -> info
//   (iii) origin is unreachable                            -> loud skip, exit 0
//
// plus the level case (synced), the non-repository case (silent), the ledger
// priority, and the consumer side of the settings hand-off: changing
// `fetch-throttle-seconds` changes whether the fetch runs at all.
//
// No network: origin is a bare repository in a temp dir (R12). Real filesystem
// and real subprocesses, hence the integration tier.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleTestTime } from "../lib/test-time-factor.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SENSOR = join(REPO_ROOT, "plugins", "git-drift", "tools", "amadeus-sensor-git-drift.ts");
const THROTTLE_REL = join("amadeus", ".amadeus-sessions", "git-drift-fetch.json");

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() ?? "", { recursive: true, force: true });
});

function git(cwd: string, args: readonly string[]): string {
  const res = spawnSync("git", [...args], { cwd, encoding: "utf-8" });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout;
}

function commitAll(cwd: string, message: string): void {
  git(cwd, ["add", "-A"]);
  git(cwd, ["commit", "-qm", message]);
}

function writeFile(root: string, rel: string, body: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

interface Fixture {
  /** The checkout under observation — the "work" clone. */
  work: string;
  /** A second clone used to move origin forward. */
  other: string;
  origin: string;
}

/** A bare origin holding `shared.txt` and `other.txt`, plus two clones of it. */
function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t2997-drift-"));
  roots.push(root);
  const seed = join(root, "seed");
  const origin = join(root, "origin.git");
  mkdirSync(seed, { recursive: true });
  git(seed, ["init", "-q", "-b", "main"]);
  git(seed, ["config", "user.email", "amadeus-test@example.invalid"]);
  git(seed, ["config", "user.name", "Amadeus Test"]);
  writeFile(seed, "shared.txt", "base\n");
  writeFile(seed, "other.txt", "base\n");
  // The throttle record is machine-local, exactly as the shipped .gitignore
  // treats it (.gitignore:70) — so R1's "the checkout is untouched" assertion
  // measures the sensor, not the cache it is allowed to keep.
  writeFile(seed, ".gitignore", "amadeus/.amadeus-sessions/\n");
  commitAll(seed, "seed");
  git(root, ["clone", "-q", "--bare", seed, origin]);

  const work = join(root, "work");
  const other = join(root, "other");
  for (const [dir, path] of [["work", work], ["other", other]] as const) {
    git(root, ["clone", "-q", origin, dir]);
    git(path, ["config", "user.email", "amadeus-test@example.invalid"]);
    git(path, ["config", "user.name", "Amadeus Test"]);
  }
  return { work, other, origin };
}

/** Move origin forward by rewriting `files` from the second clone. */
function advanceOrigin(fx: Fixture, files: Readonly<Record<string, string>>): void {
  for (const [rel, body] of Object.entries(files)) writeFile(fx.other, rel, body);
  commitAll(fx.other, "origin moves");
  git(fx.other, ["push", "-q", "origin", "main"]);
}

interface SensorRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runSensor(cwd: string, throttleSeconds = 0): SensorRun {
  const outputPath = join(cwd, "shared.txt");
  const res = spawnSync(
    "bun",
    [
      SENSOR,
      "--stage",
      "code-generation",
      "--output-path",
      outputPath,
      "--settings-json",
      JSON.stringify({ "fetch-throttle-seconds": throttleSeconds }),
    ],
    { cwd, encoding: "utf-8", timeout: scaleTestTime(60_000) },
  );
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function verdict(run: SensorRun): {
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: { field: string; reason: string }[];
} {
  return JSON.parse(run.stdout.trim());
}

describe("t2997 git-drift falling evidence (real repositories)", () => {
  test("(i) origin moving in a file this checkout also holds warns and names it", () => {
    const fx = fixture();
    advanceOrigin(fx, { "shared.txt": "origin edit\n" });
    writeFile(fx.work, "shared.txt", "my edit\n");

    const run = runSensor(fx.work);
    expect(run.status).toBe(0);
    const result = verdict(run);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("warning");
    expect(result.findings[0]?.reason).toContain("shared.txt");
    expect(result.findings[0]?.reason).toContain("origin/main が 1 コミット先行しています");
  });

  test("(ii) origin moving only elsewhere is information, not a warning", () => {
    const fx = fixture();
    advanceOrigin(fx, { "other.txt": "origin edit\n" });
    writeFile(fx.work, "shared.txt", "my edit\n");

    const run = runSensor(fx.work);
    expect(run.status).toBe(0);
    const result = verdict(run);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("info");
  });

  test("(iii) an unreachable origin is a loud skip that still exits 0", () => {
    const fx = fixture();
    git(fx.work, ["remote", "set-url", "origin", join(fx.work, "..", "no-such-origin.git")]);

    const run = runSensor(fx.work);
    expect(run.status).toBe(0);
    const result = verdict(run);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("skipped:fetch-failed");
    expect(result.findings).toHaveLength(1);
  });

  test("a checkout level with origin is silent", () => {
    const fx = fixture();
    const result = verdict(runSensor(fx.work));
    expect(result).toEqual({ pass: true, findings_count: 0, reason: "synced", findings: [] });
  });

  test("a directory that is not a repository never fires a finding", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t2997-plain-"));
    roots.push(root);
    writeFileSync(join(root, "shared.txt"), "x\n");
    const run = runSensor(root);
    expect(run.status).toBe(0);
    expect(verdict(run)).toEqual({
      pass: true,
      findings_count: 0,
      reason: "skipped:not-a-git-repo",
      findings: [],
    });
  });

  test("a ledger collision leads the warning ahead of ordinary source", () => {
    const fx = fixture();
    const ledger = "amadeus/spaces/default/intents/demo-1/amadeus-state.md";
    writeFile(fx.other, ledger, "base\n");
    commitAll(fx.other, "add ledger");
    git(fx.other, ["push", "-q", "origin", "main"]);
    git(fx.work, ["pull", "-q", "origin", "main"]);
    advanceOrigin(fx, { [ledger]: "origin append\n", "shared.txt": "origin edit\n" });
    writeFile(fx.work, ledger, "my append\n");
    writeFile(fx.work, "shared.txt", "my edit\n");

    const message = verdict(runSensor(fx.work)).findings[0]?.reason ?? "";
    expect(message.indexOf("amadeus-state.md")).toBeGreaterThan(-1);
    expect(message.indexOf("amadeus-state.md")).toBeLessThan(message.indexOf("shared.txt"));
  });
});

describe("t2997 git-drift settings are consumed, not defaulted", () => {
  test("a wide throttle window suppresses the fetch; a narrow one lets it through", () => {
    const fx = fixture();
    // First run records the fetch instant.
    expect(verdict(runSensor(fx.work, 3600)).reason).toBe("synced");
    expect(existsSync(join(fx.work, THROTTLE_REL))).toBe(true);
    const recorded = JSON.parse(readFileSync(join(fx.work, THROTTLE_REL), "utf-8"));
    expect(typeof recorded.lastFetchEpochMs).toBe("number");

    advanceOrigin(fx, { "other.txt": "origin edit\n" });

    // Inside the window: no fetch, so origin's move is not yet visible.
    expect(verdict(runSensor(fx.work, 3600)).reason).toBe("synced");
    // A shorter window is the only thing that changed, and now it is.
    expect(verdict(runSensor(fx.work, 0)).reason).toBe("info");
  });

  test("a corrupt throttle record is treated as no record rather than a crash", () => {
    const fx = fixture();
    writeFile(fx.work, THROTTLE_REL, "{not json");
    const run = runSensor(fx.work, 3600);
    expect(run.status).toBe(0);
    expect(verdict(run).reason).toBe("synced");
  });

  test("a missing --settings-json is a contract breach, not a silent default", () => {
    const fx = fixture();
    const res = spawnSync(
      "bun",
      [SENSOR, "--stage", "code-generation", "--output-path", join(fx.work, "shared.txt")],
      { cwd: fx.work, encoding: "utf-8", timeout: scaleTestTime(60_000) },
    );
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("--settings-json");
  });

  test("a malformed --settings-json fails loudly rather than defaulting", () => {
    const fx = fixture();
    const res = spawnSync(
      "bun",
      [
        SENSOR,
        "--stage",
        "code-generation",
        "--output-path",
        join(fx.work, "shared.txt"),
        "--settings-json",
        "{oops",
      ],
      { cwd: fx.work, encoding: "utf-8", timeout: scaleTestTime(60_000) },
    );
    expect(res.status).toBe(1);
  });
});

describe("t2997 git-drift leaves the checkout alone (R1)", () => {
  test("only remote-tracking refs move — the work tree, index and branch do not", () => {
    const fx = fixture();
    advanceOrigin(fx, { "shared.txt": "origin edit\n" });
    writeFile(fx.work, "shared.txt", "my edit\n");
    const before = {
      status: git(fx.work, ["status", "--porcelain"]),
      head: git(fx.work, ["rev-parse", "HEAD"]),
      branch: git(fx.work, ["rev-parse", "--abbrev-ref", "HEAD"]),
      stash: git(fx.work, ["stash", "list"]),
      body: readFileSync(join(fx.work, "shared.txt"), "utf-8"),
    };

    expect(verdict(runSensor(fx.work)).reason).toBe("warning");

    expect(git(fx.work, ["status", "--porcelain"])).toBe(before.status);
    expect(git(fx.work, ["rev-parse", "HEAD"])).toBe(before.head);
    expect(git(fx.work, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe(before.branch);
    expect(git(fx.work, ["stash", "list"])).toBe(before.stash);
    expect(readFileSync(join(fx.work, "shared.txt"), "utf-8")).toBe(before.body);
  });
});
