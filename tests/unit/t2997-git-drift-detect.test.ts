// t2997 — git-drift detection core (U3, FR-DRIFT-1..6).
// covers: file:plugins/git-drift/tools/git-drift-detect.ts
// size: small
//
// The detection algorithm driven entirely through its injected ports, so every
// branch of the DriftReport union is reachable without a repository. The real
// git behaviour — an origin that genuinely moved, a fetch that genuinely fails
// — is the integration sibling's job (t2997-git-drift-sensor); this file pins
// the decision table.
//
// The fakes live here, on the test side: production code carries no test
// branch (construction guardrail).

import { describe, expect, test } from "bun:test";
import {
  type ClockPort,
  detectDrift,
  type GitPort,
  type GitResult,
  renderDriftResult,
  type ThrottleStore,
} from "../../plugins/git-drift/tools/git-drift-detect.ts";

/** A git double keyed by the joined argv, with a recording of what ran. */
function fakeGit(table: Readonly<Record<string, Partial<GitResult>>>): GitPort & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    run(args) {
      const key = args.join(" ");
      calls.push(key);
      const hit = table[key];
      if (hit === undefined) return { ok: false, stdout: "", stderr: `no fake for: ${key}` };
      return { ok: hit.ok ?? true, stdout: hit.stdout ?? "", stderr: hit.stderr ?? "" };
    },
  };
}

function fixedClock(nowMs: number): ClockPort {
  return { nowMs: () => nowMs };
}

function memoryThrottle(initial: number | null): ThrottleStore & { written: number[] } {
  const written: number[] = [];
  let value = initial;
  return {
    written,
    read: () => value,
    write: (epochMs) => {
      value = epochMs;
      written.push(epochMs);
    },
  };
}

const SETTINGS = { "fetch-throttle-seconds": 600 } as const;

function detect(
  git: GitPort,
  options: {
    nowMs?: number;
    lastFetchMs?: number | null;
    throttleSeconds?: number;
  } = {},
) {
  return detectDrift({
    repoRoot: "/w",
    settings: { "fetch-throttle-seconds": options.throttleSeconds ?? SETTINGS["fetch-throttle-seconds"] },
    git,
    clock: fixedClock(options.nowMs ?? 1_000_000),
    throttle: memoryThrottle(options.lastFetchMs ?? null),
  });
}

describe("t2997 detectDrift preconditions (fail-open skips)", () => {
  test("a directory that is not a git repository is skipped, not analysed", () => {
    const git = fakeGit({ "rev-parse --git-dir": { ok: false, stderr: "not a git repository" } });
    expect(detect(git).report).toEqual({ kind: "skipped", reason: "not-a-git-repo" });
    expect(git.calls).toEqual(["rev-parse --git-dir"]);
  });

  test("a repository without an origin remote is skipped", () => {
    const git = fakeGit({
      "rev-parse --git-dir": { stdout: ".git" },
      remote: { stdout: "upstream\n" },
    });
    expect(detect(git).report).toEqual({ kind: "skipped", reason: "no-origin" });
  });

  test("an origin whose default branch resolves to nothing is skipped", () => {
    const git = fakeGit({
      "rev-parse --git-dir": { stdout: ".git" },
      remote: { stdout: "origin\n" },
      "symbolic-ref --quiet refs/remotes/origin/HEAD": { ok: false },
      "rev-parse --verify --quiet refs/remotes/origin/main": { ok: false },
      "rev-parse --verify --quiet refs/remotes/origin/master": { ok: false },
    });
    expect(detect(git).report).toEqual({ kind: "skipped", reason: "no-origin" });
  });
});

/** A repo whose preconditions all hold, with the per-test tail merged in. */
function syncedTable(
  branch: string,
  tail: Readonly<Record<string, Partial<GitResult>>> = {},
): Record<string, Partial<GitResult>> {
  return {
    "rev-parse --git-dir": { stdout: ".git" },
    remote: { stdout: "origin\n" },
    "symbolic-ref --quiet refs/remotes/origin/HEAD": { stdout: `refs/remotes/origin/${branch}\n` },
    [`fetch origin ${branch}`]: { stdout: "" },
    [`rev-list --count HEAD..origin/${branch}`]: { stdout: "0\n" },
    ...tail,
  };
}

describe("t2997 detectDrift default branch and synced", () => {
  test("origin/HEAD names the default branch and a repo level with it is synced", () => {
    const git = fakeGit(syncedTable("trunk"));
    const detection = detect(git);
    expect(detection.report).toEqual({ kind: "synced" });
    expect(detection.defaultBranch).toBe("trunk");
  });

  test("main is tried before master when origin/HEAD is unset", () => {
    const git = fakeGit({
      ...syncedTable("main"),
      "symbolic-ref --quiet refs/remotes/origin/HEAD": { ok: false },
      "rev-parse --verify --quiet refs/remotes/origin/main": { stdout: "abc\n" },
    });
    expect(detect(git).defaultBranch).toBe("main");
  });

  test("master is the last fallback", () => {
    const git = fakeGit({
      ...syncedTable("master"),
      "symbolic-ref --quiet refs/remotes/origin/HEAD": { ok: false },
      "rev-parse --verify --quiet refs/remotes/origin/main": { ok: false },
      "rev-parse --verify --quiet refs/remotes/origin/master": { stdout: "abc\n" },
    });
    expect(detect(git).defaultBranch).toBe("master");
  });
});

describe("t2997 detectDrift throttle (fetch only — the verdict runs every time)", () => {
  test("a fetch older than the throttle window refetches and records the instant", () => {
    const git = fakeGit(syncedTable("main"));
    const throttle = memoryThrottle(1_000_000 - 600_001);
    detectDrift({
      repoRoot: "/w",
      settings: SETTINGS,
      git,
      clock: fixedClock(1_000_000),
      throttle,
    });
    expect(git.calls).toContain("fetch origin main");
    expect(throttle.written).toEqual([1_000_000]);
  });

  test("a fetch inside the window is skipped while the verdict still runs", () => {
    const git = fakeGit(syncedTable("main"));
    const throttle = memoryThrottle(1_000_000 - 599_000);
    const detection = detectDrift({
      repoRoot: "/w",
      settings: SETTINGS,
      git,
      clock: fixedClock(1_000_000),
      throttle,
    });
    expect(git.calls).not.toContain("fetch origin main");
    expect(git.calls).toContain("rev-list --count HEAD..origin/main");
    expect(detection.report).toEqual({ kind: "synced" });
    expect(throttle.written).toEqual([]);
  });

  test("the throttle window comes from the setting, not from a constant", () => {
    const git = fakeGit(syncedTable("main"));
    detectDrift({
      repoRoot: "/w",
      settings: { "fetch-throttle-seconds": 60 },
      git,
      clock: fixedClock(1_000_000),
      throttle: memoryThrottle(1_000_000 - 599_000),
    });
    expect(git.calls).toContain("fetch origin main");
  });

  test("a failed fetch is a loud skip rather than a verdict on stale refs", () => {
    const git = fakeGit({
      ...syncedTable("main"),
      "fetch origin main": { ok: false, stderr: "could not read from remote" },
    });
    expect(detect(git).report).toEqual({
      kind: "skipped",
      reason: "fetch-failed",
      detail: "could not read from remote",
    });
  });
});

/** A repo that is `behind` commits behind origin/main, with origin's and the
 *  working side's changed paths supplied per test. */
function behindTable(
  behind: number,
  originChanged: readonly string[],
  worktree: string,
  committed: readonly string[] = [],
): Record<string, Partial<GitResult>> {
  return {
    ...syncedTable("main"),
    "rev-list --count HEAD..origin/main": { stdout: `${behind}\n` },
    "diff --name-only HEAD...origin/main": { stdout: `${originChanged.join("\n")}\n` },
    "status --porcelain": { stdout: worktree },
    "merge-base HEAD origin/main": { stdout: "base0\n" },
    "diff --name-only base0..HEAD": { stdout: `${committed.join("\n")}\n` },
  };
}

describe("t2997 detectDrift intersection verdict", () => {
  test("origin moving in files nobody here touched is information, not a warning", () => {
    const git = fakeGit(behindTable(3, ["docs/a.md", "docs/b.md"], " M src/mine.ts\n"));
    expect(detect(git).report).toEqual({ kind: "info", behind: 3 });
  });

  test("an uncommitted file origin also changed is a warning naming that file", () => {
    const git = fakeGit(behindTable(2, ["src/shared.ts", "docs/a.md"], " M src/shared.ts\n"));
    expect(detect(git).report).toEqual({
      kind: "warning",
      behind: 2,
      intersecting: ["src/shared.ts"],
      ledgerIntersecting: [],
    });
  });

  test("a file committed on this branch since the merge base also counts as work", () => {
    const git = fakeGit(behindTable(1, ["src/shared.ts"], "", ["src/shared.ts"]));
    const report = detect(git).report;
    expect(report.kind === "warning" ? report.intersecting : null).toEqual(["src/shared.ts"]);
  });

  test("renamed and quoted porcelain entries resolve to the destination path", () => {
    const git = fakeGit(
      behindTable(1, ["src/new.ts", "docs/sp ace.md"], 'R  src/old.ts -> src/new.ts\n?? "docs/sp ace.md"\n'),
    );
    const report = detect(git).report;
    expect(report.kind === "warning" ? report.intersecting : null).toEqual([
      "docs/sp ace.md",
      "src/new.ts",
    ]);
  });

  test("ledger intersections are separated out for priority presentation", () => {
    const ledger = [
      "amadeus/spaces/default/intents/x-1/audit/shard.jsonl",
      "amadeus/spaces/default/intents/x-1/amadeus-state.md",
      "tests/no-silent-drop/events/01J.json",
    ];
    const git = fakeGit(
      behindTable(4, [...ledger, "src/shared.ts"], [...ledger, "src/shared.ts"].map((p) => ` M ${p}`).join("\n")),
    );
    const report = detect(git).report;
    expect(report.kind === "warning" ? report.ledgerIntersecting : null).toEqual([...ledger].sort());
    expect(report.kind === "warning" ? report.intersecting : null).toEqual(
      [...ledger, "src/shared.ts"].sort(),
    );
  });
});

describe("t2997 renderDriftResult (the dispatcher-facing verdict)", () => {
  test("a synced repo passes with nothing to say", () => {
    expect(renderDriftResult({ report: { kind: "synced" }, defaultBranch: "main" })).toEqual({
      pass: true,
      findings_count: 0,
      reason: "synced",
      findings: [],
    });
  });

  test("a non-repository passes — an absent repo is not a drift finding", () => {
    const result = renderDriftResult({
      report: { kind: "skipped", reason: "not-a-git-repo" },
      defaultBranch: null,
    });
    expect(result.pass).toBe(true);
    expect(result.findings_count).toBe(0);
    expect(result.reason).toBe("skipped:not-a-git-repo");
  });

  test("a failed fetch is a loud finding — drift could not be observed at all", () => {
    const result = renderDriftResult({
      report: { kind: "skipped", reason: "fetch-failed", detail: "host unreachable" },
      defaultBranch: null,
    });
    expect(result.pass).toBe(false);
    expect(result.findings_count).toBe(1);
    expect(result.findings[0]?.reason).toContain("host unreachable");
  });

  test("info passes and still names how far behind the checkout is", () => {
    const result = renderDriftResult({ report: { kind: "info", behind: 3 }, defaultBranch: "main" });
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("info");
    expect(result.findings).toEqual([]);
  });

  test("a warning asks for a judgement rather than ordering a rebase", () => {
    const result = renderDriftResult({
      report: {
        kind: "warning",
        behind: 5,
        intersecting: ["amadeus/spaces/default/intents/x-1/amadeus-state.md", "src/shared.ts"],
        ledgerIntersecting: ["amadeus/spaces/default/intents/x-1/amadeus-state.md"],
      },
      defaultBranch: "main",
    });
    expect(result.pass).toBe(false);
    expect(result.findings_count).toBe(1);
    const message = result.findings[0]?.reason ?? "";
    expect(message).toContain("origin/main が 5 コミット先行しています");
    expect(message).toContain("取り込み(mirror/rebase)または先着地の判断を検討してください");
    expect(message).not.toContain("rebase してください");
    // Ledger paths lead the list (R6) even though they sort after src/.
    expect(message.indexOf("amadeus-state.md")).toBeLessThan(message.indexOf("src/shared.ts"));
  });
});
