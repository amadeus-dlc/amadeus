import { describe, expect, test } from "bun:test";
import { collectors, countTextLines, summarizeCcn, type CollectEnv } from "../../scripts/metrics-snapshot.ts";

describe("t221 six collectors", () => {
  test("LOC counts trailing newline, no trailing newline, CRLF and empty text exactly", () => {
    expect(countTextLines("one\ntwo\n")).toBe(2);
    expect(countTextLines("one\ntwo")).toBe(2);
    expect(countTextLines("one\r\ntwo\r\n")).toBe(2);
    expect(countTextLines("")).toBe(0);
  });
  test("CCN p50, p90 and over-threshold values are numerically fixed", () => {
    const records = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((ccn) => ({ ccn }));
    expect(summarizeCcn(records)).toMatchObject({ functions: 10, p50: 5, p90: 9, max: 20, over_threshold: 1, threshold: 15 });
  });
});

const bugs = collectors.find(({ name }) => name === "bugs")!;
const TOTALS: Record<string, number> = {
  "": 278,
  "is:open": 15,
  "is:closed": 263,
  "is:closed reason:completed": 250,
  "is:closed -reason:completed": 20,
  "label:S1-FATAL": 9,
  "label:S2-CRITICAL": 29,
  "label:S3-MAJOR": 133,
  "label:S4-MINOR": 51,
};
const GH_VERSION = "gh version 2.60.1 (2026-01-15)\nhttps://github.com/cli/cli/releases/tag/v2.60.1";
const SEARCH_QUERY = /^q=repo:(\S+) is:issue label:bug ?(.*)$/;

// Fake gh/git seam: every recorded command is inspectable, and each search
// answers the filter it was asked for so query wiring and arithmetic are both
// observable without touching the network.
function bugsEnv(vars: Record<string, string>, remote = "git@github.com:o/r.git") {
  const commands: string[][] = [];
  const env: CollectEnv = {
    repoRoot: "/tmp",
    readFile: () => "",
    listFiles: () => [],
    envVar: (name) => vars[name],
    exec: (command) => {
      commands.push(command);
      if (command[0] === "git") return remote;
      if (command[1] === "--version") return GH_VERSION;
      const query = SEARCH_QUERY.exec(command[6]);
      if (query === null) throw new Error(`unexpected search query: ${command[6]}`);
      return String(TOTALS[query[2]] ?? Number.NaN);
    },
  };
  return { env, commands };
}
const searchQueries = (commands: string[][]): string[] => commands.filter((command) => command[1] === "api").map((command) => command[6]);

describe("t221 bugs collector", () => {
  test("one total_count query per value, rejected coming from its own query rather than closed minus fixed", () => {
    const { env, commands } = bugsEnv({ GH_TOKEN: "t", GITHUB_REPOSITORY: "o/r" });
    expect(bugs.collect(env)).toEqual({
      ok: true,
      name: "bugs",
      tool: "gh",
      tool_version: "gh version 2.60.1 (2026-01-15)",
      values: { total: 278, open: 15, closed: 263, fixed: 250, rejected: 20, s1_fatal: 9, s2_critical: 29, s3_major: 133, s4_minor: 51 },
    });
    expect(commands[0]).toEqual([
      "gh", "api", "-X", "GET", "search/issues", "-f", "q=repo:o/r is:issue label:bug", "-f", "advanced_search=true", "--jq", ".total_count",
    ]);
    expect(searchQueries(commands)).toEqual([
      "q=repo:o/r is:issue label:bug",
      "q=repo:o/r is:issue label:bug is:open",
      "q=repo:o/r is:issue label:bug is:closed",
      "q=repo:o/r is:issue label:bug is:closed reason:completed",
      "q=repo:o/r is:issue label:bug is:closed -reason:completed",
      "q=repo:o/r is:issue label:bug label:S1-FATAL",
      "q=repo:o/r is:issue label:bug label:S2-CRITICAL",
      "q=repo:o/r is:issue label:bug label:S3-MAJOR",
      "q=repo:o/r is:issue label:bug label:S4-MINOR",
    ]);
  });
  test("no token skips the collector without issuing a single command", () => {
    const { env, commands } = bugsEnv({});
    expect(bugs.collect(env)).toEqual({ ok: "skipped", name: "bugs", reason: "neither GH_TOKEN nor GITHUB_TOKEN is set" });
    expect(commands).toEqual([]);
  });
  test("GITHUB_TOKEN alone also authorises collection", () => {
    expect(bugs.collect(bugsEnv({ GITHUB_TOKEN: "t", GITHUB_REPOSITORY: "o/r" }).env).ok).toBe(true);
  });
  test("with a token, a failing call fails the collector instead of reporting partial data", () => {
    const { env } = bugsEnv({ GH_TOKEN: "t", GITHUB_REPOSITORY: "o/r" });
    expect(bugs.collect({ ...env, exec: () => { throw new Error("HTTP 403: Resource not accessible"); } })).toEqual({
      ok: false, name: "bugs", error: "HTTP 403: Resource not accessible",
    });
  });
  test("a non-numeric total_count is rejected, naming the query", () => {
    const { env } = bugsEnv({ GH_TOKEN: "t", GITHUB_REPOSITORY: "o/r" });
    expect(bugs.collect({ ...env, exec: () => "null" })).toEqual({
      ok: false, name: "bugs", error: "bugs.total_count(repo:o/r is:issue label:bug) must be finite",
    });
  });
  test("GITHUB_REPOSITORY wins; otherwise the origin remote is parsed in every GitHub URL form", () => {
    for (const remote of ["git@github.com:o/r.git", "git@alias.github.com:o/r.git", "ssh://git@github.com/o/r.git", "https://github.com/o/r.git", "https://github.com/o/r"]) {
      const { env, commands } = bugsEnv({ GH_TOKEN: "t" }, remote);
      expect(bugs.collect(env).ok, remote).toBe(true);
      expect(commands[0], remote).toEqual(["git", "remote", "get-url", "origin"]);
      expect(searchQueries(commands)[0], remote).toBe("q=repo:o/r is:issue label:bug");
    }
    const { env, commands } = bugsEnv({ GH_TOKEN: "t", GITHUB_REPOSITORY: "other/repo" });
    expect(bugs.collect(env).ok).toBe(true);
    expect(commands.some((command) => command[0] === "git")).toBe(false);
    expect(searchQueries(commands)[0]).toBe("q=repo:other/repo is:issue label:bug");
  });
  test("an origin remote that is not a GitHub URL fails the collector", () => {
    const { env } = bugsEnv({ GH_TOKEN: "t" }, "https://gitlab.com/o/r.git");
    expect(bugs.collect(env)).toEqual({
      ok: false, name: "bugs", error: "cannot derive owner/repo from origin remote: https://gitlab.com/o/r.git",
    });
  });
});
