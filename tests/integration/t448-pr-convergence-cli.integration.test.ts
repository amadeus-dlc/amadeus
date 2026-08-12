import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGhRunner,
  digestStderr,
  fetchRawPrState,
  type GhSpawn,
  type GhSpawnResult,
  parsePrRef,
  type PrNumber,
} from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  type CliSeams,
  DEFAULT_LOG_TOOL_RELATIVE,
  defaultLogToolPath,
  latestHumanTurn,
  renderReport,
  reportPathFor,
  runCli as invokeCli,
} from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";
import {
  createNodeGitSpawn,
  GIT_TIMEOUT_MS,
  type GitSpawn,
} from "../../plugins/pr-convergence/tools/pr-convergence-git-runner.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";

/**
 * t448 predates Intent-linked provenance. Its status/report cases exercise the
 * unlinked convergence contract explicitly; t533 owns the linked matrix.
 */
function runCli(
  argv: readonly string[],
  seams: Parameters<typeof invokeCli>[1],
): ReturnType<typeof invokeCli> {
  const verb = argv[0];
  return invokeCli(
    verb === "status" || verb === "report" ? [...argv, "--unlinked", "true"] : argv,
    seams,
  );
}

// U2 convergence-toolchain: the gh execution boundary (C6) and the CLI (C5).
// Integration layer — these touch the real filesystem and the process seam.

/** A spawn seam that records every argv it is handed and replays a script. */
function scriptedSpawn(script: readonly GhSpawnResult[]) {
  const argvs: (readonly string[])[] = [];
  const spawn: GhSpawn = async (argv) => {
    argvs.push(argv);
    return script[Math.min(argvs.length - 1, script.length - 1)] as GhSpawnResult;
  };
  return { argvs, spawn };
}

const ok = (stdout = ""): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

const REF = parsePrRef("amadeus-dlc/amadeus", "2268");
if (REF === null) throw new Error("fixture ref must parse");

describe("createGhRunner — BR-U2-6 (i) readiness is checked before any real call", () => {
  test("probes gh --version and gh auth status, in that order", async () => {
    const s = scriptedSpawn([ok("gh version 2.97.0"), ok("Logged in")]);
    const runner = await createGhRunner(s.spawn);
    expect(runner.ok).toBe(true);
    expect(s.argvs).toEqual([
      ["gh", "--version"],
      ["gh", "auth", "status", "--hostname", "github.com"],
    ]);
  });

  test("a missing gh binary is a typed not-runnable failure", async () => {
    const spawn: GhSpawn = async () => {
      throw new Error("spawn gh ENOENT");
    };
    const runner = await createGhRunner(spawn);
    expect(runner.ok).toBe(false);
    if (!runner.ok) expect(runner.error.kind).toBe("not-runnable");
  });

  test("a non-zero gh --version is not-runnable", async () => {
    const s = scriptedSpawn([{ code: 127, stdout: "", stderr: "command not found" }]);
    const runner = await createGhRunner(s.spawn);
    expect(runner.ok).toBe(false);
    if (!runner.ok) expect(runner.error.kind).toBe("not-runnable");
  });

  test("a failing auth status is not-authenticated, and stops before any API call", async () => {
    const s = scriptedSpawn([ok("gh version 2.97.0"), { code: 1, stdout: "", stderr: "no token" }]);
    const runner = await createGhRunner(s.spawn);
    expect(runner.ok).toBe(false);
    if (!runner.ok) expect(runner.error.kind).toBe("not-authenticated");
    expect(s.argvs).toHaveLength(2);
  });

  test("an auth probe that throws (not just fails) is not-authenticated", async () => {
    let call = 0;
    const spawn: GhSpawn = async () => {
      call += 1;
      if (call === 1) return ok("gh version 2.97.0");
      throw new Error("auth probe crashed");
    };
    const runner = await createGhRunner(spawn);
    expect(runner.ok).toBe(false);
    if (!runner.ok) expect(runner.error.kind).toBe("not-authenticated");
  });

  test("an API invocation that throws after readiness is a typed not-runnable result", async () => {
    let call = 0;
    const spawn: GhSpawn = async () => {
      call += 1;
      if (call <= 2) return ok("ready");
      throw new Error("gh vanished mid-run");
    };
    const runner = await createGhRunner(spawn);
    expect(runner.ok).toBe(true);
    if (!runner.ok) return;
    const result = await runner.value(["gh", "api", "graphql"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not-runnable");
  });
});

describe("GhRunner — BR-U2-6 (ii)/(iii)/(iv) execution contracts", () => {
  test("every invocation is an argv array, never a joined shell string", async () => {
    const s = scriptedSpawn([ok("gh version"), ok("Logged in"), ok("{}")]);
    const runner = await createGhRunner(s.spawn);
    expect(runner.ok).toBe(true);
    if (!runner.ok) return;
    await runner.value(["gh", "api", "graphql", "-f", "query=a b; rm -rf /"]);
    for (const argv of s.argvs) {
      expect(Array.isArray(argv)).toBe(true);
      expect(argv.every((token) => typeof token === "string")).toBe(true);
    }
    // The injection-shaped token survives intact as ONE argument: nothing split
    // it on whitespace or handed it to a shell.
    expect(s.argvs.at(-1)).toEqual(["gh", "api", "graphql", "-f", "query=a b; rm -rf /"]);
  });

  test("the module never reaches for a shell", async () => {
    const source = await Bun.file(
      new URL("../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts", import.meta.url),
    ).text();
    expect(source).not.toMatch(/shell\s*:\s*true/);
    expect(source).not.toMatch(/\bexecSync\b|\bexec\(/);
    expect(source).not.toMatch(/\/bin\/(?:sh|bash)/);
  });

  test("a failing command yields a digest, never the raw stderr that carried a token", async () => {
    const secret = "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const s = scriptedSpawn([
      ok("gh version"),
      ok("Logged in"),
      { code: 1, stdout: "", stderr: `HTTP 401: Bad credentials (token ${secret})` },
    ]);
    const runner = await createGhRunner(s.spawn);
    expect(runner.ok).toBe(true);
    if (!runner.ok) return;
    const result = await runner.value(["gh", "api", "graphql"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("command-failed");
    const serialized = JSON.stringify(result.error);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("Bad credentials");
    if (result.error.kind === "command-failed") {
      expect(result.error.exitCode).toBe(1);
      expect(result.error.stderrDigest).toMatch(/^sha256:[0-9a-f]{16}$/);
    }
  });

  test("the stderr digest is stable for the same stderr and differs for another", async () => {
    const run = async (stderr: string) => {
      const s = scriptedSpawn([ok("v"), ok("auth"), { code: 2, stdout: "", stderr }]);
      const runner = await createGhRunner(s.spawn);
      if (!runner.ok) throw new Error("unreachable");
      const r = await runner.value(["gh", "api"]);
      if (r.ok || r.error.kind !== "command-failed") throw new Error("unreachable");
      return r.error.stderrDigest;
    };
    expect(await run("boom")).toBe(await run("boom"));
    expect(await run("boom")).not.toBe(await run("other"));
  });
});

describe("parsePrRef / fetchRawPrState", () => {
  test("parses an owner/name repo and a numeric pull-request number", () => {
    // PrNumber is branded, so the expected literal needs the one-field cast;
    // unlike `as never` it keeps the rest of the object type-checked.
    expect(REF).toEqual({ repo: "amadeus-dlc/amadeus", number: 2268 as PrNumber });
  });

  test("rejects a malformed repository or number instead of guessing", () => {
    expect(parsePrRef("amadeus", "1")).toBeNull();
    expect(parsePrRef("a/b/c", "1")).toBeNull();
    expect(parsePrRef("amadeus-dlc/amadeus", "0")).toBeNull();
    expect(parsePrRef("amadeus-dlc/amadeus", "-3")).toBeNull();
    expect(parsePrRef("amadeus-dlc/amadeus", "12x")).toBeNull();
    expect(parsePrRef("amadeus-dlc/amadeus; rm -rf /", "1")).toBeNull();
  });

  test("fetches the raw merge state as strings, leaving the parse to C3", async () => {
    const payload = JSON.stringify({
      data: {
        repository: {
          pullRequest: {
            mergeable: "UNKNOWN",
            mergeStateStatus: "BLOCKED",
            title: "",
            body: "",
          },
        },
      },
    });
    const s = scriptedSpawn([ok("v"), ok("auth"), ok(payload)]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(true);
    if (raw.ok) {
      expect(raw.value).toEqual({
        mergeable: "UNKNOWN",
        mergeStateStatus: "BLOCKED",
        title: "",
        body: "",
      });
    }
    // Owner, name and number travel as separate -F arguments, never interpolated.
    const argv = s.argvs.at(-1) ?? [];
    expect(argv).toContain("owner=amadeus-dlc");
    expect(argv).toContain("name=amadeus");
    expect(argv).toContain("number=2268");
  });

  test("non-string mergeable/mergeStateStatus fields are a typed failure", async () => {
    const payload = JSON.stringify({
      data: { repository: { pullRequest: { mergeable: 1, mergeStateStatus: null } } },
    });
    const s = scriptedSpawn([ok("v"), ok("auth"), ok(payload)]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(false);
    if (!raw.ok) expect(raw.error.kind).toBe("command-failed");
  });

  test("an unparseable GraphQL envelope is a typed failure, not an empty state", async () => {
    const s = scriptedSpawn([ok("v"), ok("auth"), ok("not json")]);
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("unreachable");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw.ok).toBe(false);
    if (!raw.ok) expect(raw.error.kind).toBe("command-failed");
  });
});

// ---------------------------------------------------------------------------
// C5: the CLI
// ---------------------------------------------------------------------------

const FIXTURES = join(import.meta.dir, "..", "fixtures", "pr-convergence");
const fixture = (name: string) => readFileSync(join(FIXTURES, `${name}.graphql.json`), "utf-8");

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

/** A record directory with an audit shard, outside the repository tree. */
function makeRecord(options: { readonly humanTurn: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-"));
  roots.push(root);
  mkdirSync(join(root, "audit"), { recursive: true });
  const lines = [
    JSON.stringify({
      eventId: "aaaaaaaa-0000-0000-0000-000000000001",
      seq: 1,
      timestamp: "2026-08-05T10:00:00Z",
      eventName: "amadeus.workflow.started",
      attributes: { Event: "WORKFLOW_STARTED" },
    }),
  ];
  if (options.humanTurn) {
    lines.push(
      JSON.stringify({
        eventId: "bbbbbbbb-0000-0000-0000-000000000002",
        seq: 2,
        timestamp: "2026-08-05T10:05:00Z",
        eventName: "amadeus.human.turn",
        attributes: { Event: "HUMAN_TURN" },
      }),
      JSON.stringify({
        eventId: "cccccccc-0000-0000-0000-000000000003",
        seq: 3,
        timestamp: "2026-08-05T10:09:00Z",
        eventName: "amadeus.human.turn",
        attributes: { Event: "HUMAN_TURN" },
      }),
    );
  }
  writeFileSync(join(root, "audit", "clone-a.jsonl"), `${lines.join("\n")}\n`, "utf-8");
  return root;
}

function makeBodyFile(body: string): string {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-body-"));
  roots.push(root);
  const path = join(root, "body.md");
  writeFileSync(path, body, "utf-8");
  return path;
}

function makeIntentRecord(input: {
  readonly slug: string;
  readonly dirName: string;
  readonly uuid: string;
  readonly omitRegistryDirName?: boolean;
}): string {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-intent-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, input.dirName);
  mkdirSync(record, { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify(
      [
        {
          slug: input.slug,
          uuid: input.uuid,
          ...(!input.omitRegistryDirName ? { dirName: input.dirName } : {}),
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  return record;
}

/**
 * Drives the CLI with a scripted gh: readiness, then the pull-request state,
 * then the review-thread pages.
 */
function cliSpawn(state: { mergeable: string; mergeStateStatus: string }, pages: readonly string[]) {
  const argvs: (readonly string[])[] = [];
  const spawn: GhSpawn = async (argv) => {
    argvs.push(argv);
    const joined = argv.join(" ");
    if (joined.includes("--version")) return ok("gh version 2.97.0");
    if (joined.includes("auth status")) return ok("Logged in");
    if (joined.includes("reviewThreads")) {
      const page = pages[Math.min(pageCalls++, pages.length - 1)] as string;
      return ok(fixture(page));
    }
    return ok(
      JSON.stringify({ data: { repository: { pullRequest: { ...state, title: "", body: "" } } } }),
    );
  };
  let pageCalls = 0;
  return { argvs, spawn };
}

const CLEAN = { mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" };
const BLOCKED = { mergeable: "MERGEABLE", mergeStateStatus: "BLOCKED" };

function seams(
  spawn: GhSpawn,
  extra: Partial<Parameters<typeof runCli>[1]> = {},
): Parameters<typeof runCli>[1] {
  return {
    ghSpawn: spawn,
    sleep: async () => undefined,
    now: () => "2026-08-05T11:00:00Z",
    emitDecision: async () => ({ code: 0, stderr: "" }),
    ...extra,
  };
}

describe("CLI create verb — pull-request presentation contract", () => {
  test("creates an unlinked pull request without changing its body", async () => {
    const bodyFile = makeBodyFile("## Summary\n\nAdd deterministic PR creation.\n");
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      ok("https://github.com/amadeus-dlc/amadeus/pull/3000\n"),
    ]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: add deterministic PR creation",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );

    expect(out).toEqual({
      exitCode: 0,
      stdout: "https://github.com/amadeus-dlc/amadeus/pull/3000\n",
      stderr: "",
    });
    expect(s.argvs.at(-1)).toEqual([
      "gh",
      "pr",
      "create",
      "--repo",
      "amadeus-dlc/amadeus",
      "--head",
      "codex/pr-intent-metadata",
      "--title",
      "feat: add deterministic PR creation",
      "--body",
      "## Summary\n\nAdd deterministic PR creation.\n",
    ]);
  });

  test("adds the linked Intent, Bolt, and Unit identity to the pull request", async () => {
    const bodyFile = makeBodyFile("## Summary\n\nAdd deterministic PR creation.\n");
    const record = makeIntentRecord({
      slug: "pr-intent-metadata",
      dirName: "260809-pr-intent-metadata",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      ok("https://github.com/amadeus-dlc/amadeus/pull/3001\n"),
    ]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: add deterministic PR creation",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(0);
    const argv = s.argvs.at(-1) ?? [];
    expect(argv.at(argv.indexOf("--title") + 1)).toBe(
      "[pr-intent-metadata/ship-pr-metadata/create-pr-command] feat: add deterministic PR creation",
    );
    expect(argv.at(argv.indexOf("--body") + 1)).toBe(
      "## Summary\n\nAdd deterministic PR creation.\n\n" +
        "## Amadeus Work\n\n" +
        "- Intent: `pr-intent-metadata`\n" +
        "- Bolt: `ship-pr-metadata`\n" +
        "- Unit: `create-pr-command`\n" +
        "- Record: `amadeus/spaces/default/intents/260809-pr-intent-metadata/`\n" +
        "- UUID: `019fe41b-a33a-71d1-8a29-fab83872abd6`\n",
    );
  });

  test("resolves a legacy Intent directory from the trailing UUID hex", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "legacy-intent",
      dirName: "legacy-intent-72abd6",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
      omitRegistryDirName: true,
    });
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      ok("https://github.com/amadeus-dlc/amadeus/pull/3002\n"),
    ]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: preserve legacy Intent resolution",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(0);
    const argv = s.argvs.at(-1) ?? [];
    expect(argv.at(argv.indexOf("--title") + 1)).toBe(
      "[legacy-intent/ship-pr-metadata/create-pr-command] feat: preserve legacy Intent resolution",
    );
  });

  test("requires Bolt and Unit together with an Intent record before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "pr-intent-metadata",
      dirName: "260809-pr-intent-metadata",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: add deterministic PR creation",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--record requires --bolt and --unit slugs");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an unregistered Intent record before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "another-intent",
      dirName: "260809-another-intent",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    }).replace("260809-another-intent", "260809-missing-intent");
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: add deterministic PR creation",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("0 Intent registry entries");
    expect(s.argvs).toEqual([]);
  });

  test("requires an explicit head branch before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      ok("https://github.com/amadeus-dlc/amadeus/pull/3003\n"),
    ]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--title",
        "feat: require an explicit head",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--head is required");
    expect(s.argvs).toEqual([]);
  });

  test("reports a safe digest and exit code when GitHub creation fails", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const rawStderr = "no commits between base and head";
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      { code: 1, stdout: "", stderr: rawStderr },
    ]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: surface safe GitHub failure details",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain(`command-failed (exit 1, stderr ${digestStderr(rawStderr)})`);
    expect(out.stderr).not.toContain(rawStderr);
  });

  test("refuses a duplicate Amadeus Work section before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n\n## Amadeus Work\n");
    const record = makeIntentRecord({
      slug: "pr-intent-metadata",
      dirName: "260809-pr-intent-metadata",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject duplicate work identity",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("already contains ## Amadeus Work");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an ambiguous Intent registry match before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "first-intent",
      dirName: "260809-shared-intent",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    const registry = join(record, "..", "intents.json");
    const rows = JSON.parse(readFileSync(registry, "utf-8")) as unknown[];
    rows.push({
      slug: "second-intent",
      dirName: "260809-shared-intent",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abcd",
      status: "in-flight",
    });
    writeFileSync(registry, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject ambiguous Intent identity",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("2 Intent registry entries");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an unreadable Intent registry before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "pr-intent-metadata",
      dirName: "260809-pr-intent-metadata",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    writeFileSync(join(record, "..", "intents.json"), "{broken", "utf-8");
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject an unreadable registry",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("cannot read the Intent registry");
    expect(s.argvs).toEqual([]);
  });

  test("refuses a missing body file before touching GitHub", async () => {
    const root = mkdtempSync(join(tmpdir(), "pr-convergence-missing-body-"));
    roots.push(root);
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject a missing body",
        "--body-file",
        join(root, "missing.md"),
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("cannot read --body-file");
    expect(s.argvs).toEqual([]);
  });

  test("refuses work flags without an Intent record before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject orphan work flags",
        "--body-file",
        bodyFile,
        "--bolt",
        "ship-pr-metadata",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--bolt and --unit require --record");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an invalid repository before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "not-a-repository",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject an invalid repository",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--repo is required and must be owner/name");
    expect(s.argvs).toEqual([]);
  });

  test("reports an unavailable GitHub boundary without attempting creation", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const s = scriptedSpawn([{ code: 127, stdout: "", stderr: "command not found" }]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: report an unavailable boundary",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("gh unavailable: not-runnable");
    expect(s.argvs).toEqual([["gh", "--version"]]);
  });

  test("refuses a record outside the Amadeus Intent layout before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const root = mkdtempSync(join(tmpdir(), "pr-convergence-invalid-record-"));
    roots.push(root);
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject an invalid record path",
        "--body-file",
        bodyFile,
        "--record",
        join(root, "not-an-intent"),
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--record must name amadeus/spaces/<space>/intents/<intent>");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an invalid registry identity before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "pr-intent-metadata",
      dirName: "260809-pr-intent-metadata",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
    });
    writeFileSync(
      join(record, "..", "intents.json"),
      `${JSON.stringify([
        {
          slug: "pr-intent-metadata",
          dirName: "invalid/directory",
          uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
        },
      ])}\n`,
      "utf-8",
    );
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject an invalid registry identity",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("Intent registry contains an invalid identity");
    expect(s.argvs).toEqual([]);
  });

  test("refuses an empty legacy UUID suffix before touching GitHub", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const record = makeIntentRecord({
      slug: "legacy-intent",
      dirName: "legacy-intent-",
      uuid: "019fe41b-a33a-71d1-8a29-fab83872abd6",
      omitRegistryDirName: true,
    });
    const s = scriptedSpawn([ok("gh version 2.97.0")]);

    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/pr-intent-metadata",
        "--title",
        "feat: reject an empty legacy suffix",
        "--body-file",
        bodyFile,
        "--record",
        record,
        "--bolt",
        "ship-pr-metadata",
        "--unit",
        "create-pr-command",
      ],
      seams(s.spawn),
    );

    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("0 Intent registry entries");
    expect(s.argvs).toEqual([]);
  });
});

describe("CLI status verb — exit-code contract", () => {
  test("a converged pull request prints the verdict and exits 0", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(CLEAN, ["measured-pr-2268"]);
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "2268", "--unit", "u2", "--record", record],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(0);
    const verdict = JSON.parse(out.stdout);
    expect(verdict.converged).toBe(true);
    expect(verdict.violating).toEqual({ repliedUnresolved: 0, ignored: 0 });
    expect(verdict.ledger.resolved).toBe(7);
  });

  test("the measured replied-unresolved fixture is not converged and exits 1", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(CLEAN, ["measured-pr-1945"]);
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "1945", "--unit", "u2", "--record", record],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(1);
    const verdict = JSON.parse(out.stdout);
    expect(verdict.converged).toBe(false);
    expect(verdict.violating.repliedUnresolved).toBe(2);
  });

  test("a non-CLEAN merge state alone is enough to withhold convergence", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(BLOCKED, ["measured-pr-2268"]);
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "2268", "--unit", "u2", "--record", record],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(1);
    expect(JSON.parse(out.stdout).mergeState).toBe("BLOCKED");
  });

  test("an unauthenticated gh exits 2 and prints no verdict", async () => {
    const record = makeRecord({ humanTurn: true });
    const spawn: GhSpawn = async (argv) =>
      argv.join(" ").includes("--version") ? ok("v") : { code: 1, stdout: "", stderr: "no token" };
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "1", "--unit", "u2", "--record", record],
      seams(spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stdout).toBe("");
    expect(out.stderr).toContain("not-authenticated");
  });

  test("a malformed --pr is rejected before any gh call", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(CLEAN, ["measured-pr-2268"]);
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "0x1", "--unit", "u2", "--record", record],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(s.argvs).toEqual([]);
  });

  test("an unknown verb exits 2", async () => {
    const out = await runCli(["merge"], seams(cliSpawn(CLEAN, []).spawn));
    expect(out.exitCode).toBe(2);
  });

  test("missing --repo/--pr and a malformed --unit are rejected with their own messages", async () => {
    const record = makeRecord({ humanTurn: true });
    const noRepo = await runCli(["status", "--unit", "u2", "--record", record], seams(cliSpawn(CLEAN, []).spawn));
    expect(noRepo.exitCode).toBe(2);
    expect(noRepo.stderr).toContain("--repo and --pr are required");
    const badUnit = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "1", "--unit", "NOT A SLUG", "--record", record],
      seams(cliSpawn(CLEAN, []).spawn),
    );
    expect(badUnit.exitCode).toBe(2);
    expect(badUnit.stderr).toContain("--unit");
  });

  test("a gh fault while reading the merge state exits 2 with the typed detail", async () => {
    const record = makeRecord({ humanTurn: true });
    const spawn: GhSpawn = async (argv) => {
      const joined = argv.join(" ");
      if (joined.includes("--version")) return ok("v");
      if (joined.includes("auth status")) return ok("in");
      // The pull-request state query is the first API call; fail it.
      return { code: 1, stdout: "", stderr: "boom" };
    };
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "1", "--unit", "u2", "--record", record],
      seams(spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("merge state");
  });

  test("an unknown mergeStateStatus is a boundary fault (exit 2), never a verdict", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn({ mergeable: "MERGEABLE", mergeStateStatus: "TOTALLY_NEW" }, ["measured-pr-2268"]);
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "2268", "--unit", "u2", "--record", record],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stdout).toBe("");
    expect(out.stderr).toContain("unknown mergeStateStatus");
  });

  test("a gh fault while reading review threads exits 2 with the typed detail", async () => {
    const record = makeRecord({ humanTurn: true });
    const spawn: GhSpawn = async (argv) => {
      const joined = argv.join(" ");
      if (joined.includes("--version")) return ok("v");
      if (joined.includes("auth status")) return ok("in");
      if (joined.includes("reviewThreads")) return { code: 1, stdout: "", stderr: "boom" };
      return ok(
        JSON.stringify({
          data: { repository: { pullRequest: { ...CLEAN, title: "", body: "" } } },
        }),
      );
    };
    const out = await runCli(
      ["status", "--repo", "amadeus-dlc/amadeus", "--pr", "1", "--unit", "u2", "--record", record],
      seams(spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("review threads");
  });
});

describe("CLI report verb — BR-U2-7, written only when converged", () => {
  const args = (record: string, pr: string) => [
    "report",
    "--repo",
    "amadeus-dlc/amadeus",
    "--pr",
    pr,
    "--unit",
    "convergence-toolchain",
    "--record",
    record,
  ];

  test("writes the machine-rendered report at the FR-2b path on convergence", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(CLEAN, ["measured-pr-2268"]);
    const out = await runCli(args(record, "2268"), seams(s.spawn));
    expect(out.exitCode).toBe(0);
    const path = reportPathFor(record, "convergence-toolchain");
    expect(path).toBe(
      join(record, "construction", "convergence-toolchain", "code-generation", "pr-convergence-report.md"),
    );
    const body = readFileSync(path, "utf-8");
    expect(body).toContain("converged: true");
    expect(body).toContain("amadeus-dlc/amadeus#2268");
  });

  test("writes nothing and exits 1 when convergence fails — no fail-open report", async () => {
    const record = makeRecord({ humanTurn: true });
    const s = cliSpawn(CLEAN, ["measured-pr-1945"]);
    const out = await runCli(args(record, "1945"), seams(s.spawn));
    expect(out.exitCode).toBe(1);
    expect(existsSync(reportPathFor(record, "convergence-toolchain"))).toBe(false);
    expect(out.stderr).toContain("replied-unresolved");
  });

  test("re-running on the same verdict is idempotent apart from the timestamp", async () => {
    const record = makeRecord({ humanTurn: true });
    const first = await runCli(
      args(record, "2268"),
      seams(cliSpawn(CLEAN, ["measured-pr-2268"]).spawn),
    );
    expect(first.exitCode).toBe(0);
    const before = readFileSync(reportPathFor(record, "convergence-toolchain"), "utf-8");
    const second = await runCli(
      args(record, "2268"),
      seams(cliSpawn(CLEAN, ["measured-pr-2268"]).spawn, { now: () => "2026-08-05T12:00:00Z" }),
    );
    expect(second.exitCode).toBe(0);
    const after = readFileSync(reportPathFor(record, "convergence-toolchain"), "utf-8");
    expect(after.replace("2026-08-05T12:00:00Z", "")).toBe(
      before.replace("2026-08-05T11:00:00Z", ""),
    );
  });
});

describe("CLI override verb — BR-U2-8, bound to a real human turn", () => {
  const args = (record: string, pr: string) => [
    "override",
    "--repo",
    "amadeus-dlc/amadeus",
    "--pr",
    pr,
    "--unit",
    "convergence-toolchain",
    "--record",
    record,
    "--reason",
    "GitHub unreachable; landing under human ruling",
  ];

  test("latestHumanTurn finds the newest HUMAN_TURN across shards", () => {
    const record = makeRecord({ humanTurn: true });
    expect(latestHumanTurn(record)?.eventId).toBe("cccccccc-0000-0000-0000-000000000003");
  });

  test("a truncated (non-JSON) shard line hides nothing before it", () => {
    const record = makeRecord({ humanTurn: true });
    // A crash can truncate the tail of a shard mid-line; the earlier turns
    // must still be found.
    writeFileSync(join(record, "audit", "clone-torn.jsonl"), '{"eventId":"tor', "utf-8");
    expect(latestHumanTurn(record)?.eventId).toBe("cccccccc-0000-0000-0000-000000000003");
  });

  test("latestHumanTurn accepts legacy v1 shard rows (top-level event, no eventId)", () => {
    // Real records carry schemaVersion:1 shards whose audit event lives on the
    // top-level `event` field with no eventId — a real on-disk HUMAN_TURN must
    // not be invisible to override.
    const record = makeRecord({ humanTurn: false });
    const v1 = JSON.stringify({
      schemaVersion: 1,
      seq: 22,
      cloneId: "d4a945003a7f",
      intentId: "intents",
      timestamp: "2026-08-05T11:00:00Z",
      heading: "Human Turn",
      event: "HUMAN_TURN",
      fields: {},
    });
    writeFileSync(join(record, "audit", "clone-v1.jsonl"), `${v1}\n`, "utf-8");
    const turn = latestHumanTurn(record);
    expect(turn).not.toBeNull();
    expect(turn?.timestamp).toBe("2026-08-05T11:00:00Z");
    // The reference id is derived deterministically from the row's own fields.
    expect(turn?.eventId).toBe("v1:d4a945003a7f:22");
  });

  test("a millisecond timestamp in the same second is newer than a second-precision one", () => {
    // amadeus-log writes shards with and without milliseconds. A plain string
    // compare ranks "…:00.500Z" BELOW "…:00Z" ('.' 0x2E < 'Z' 0x5A), so the
    // genuinely newer millisecond row would lose; the comparison must
    // normalise via Date.parse.
    const record = makeRecord({ humanTurn: false });
    const rows = [
      JSON.stringify({
        eventId: "dddddddd-0000-0000-0000-000000000004",
        seq: 1,
        timestamp: "2026-08-05T10:05:00Z",
        attributes: { Event: "HUMAN_TURN" },
      }),
      JSON.stringify({
        eventId: "eeeeeeee-0000-0000-0000-000000000005",
        seq: 2,
        timestamp: "2026-08-05T10:05:00.500Z",
        attributes: { Event: "HUMAN_TURN" },
      }),
    ];
    writeFileSync(join(record, "audit", "clone-ms.jsonl"), `${rows.join("\n")}\n`, "utf-8");
    expect(latestHumanTurn(record)?.eventId).toBe("eeeeeeee-0000-0000-0000-000000000005");
  });

  test("equal instants written with different precision fall back to seq", () => {
    const record = makeRecord({ humanTurn: false });
    const rows = [
      JSON.stringify({
        eventId: "ffffffff-0000-0000-0000-000000000006",
        seq: 9,
        timestamp: "2026-08-05T10:05:00.000Z",
        attributes: { Event: "HUMAN_TURN" },
      }),
      JSON.stringify({
        eventId: "99999999-0000-0000-0000-000000000007",
        seq: 3,
        timestamp: "2026-08-05T10:05:00Z",
        attributes: { Event: "HUMAN_TURN" },
      }),
    ];
    writeFileSync(join(record, "audit", "clone-eq.jsonl"), `${rows.join("\n")}\n`, "utf-8");
    // Same instant: the higher seq wins regardless of spelling.
    expect(latestHumanTurn(record)?.eventId).toBe("ffffffff-0000-0000-0000-000000000006");
  });

  test("refuses and writes nothing when no HUMAN_TURN exists", async () => {
    const record = makeRecord({ humanTurn: false });
    expect(latestHumanTurn(record)).toBeNull();
    const emitted: (readonly string[])[] = [];
    const out = await runCli(
      args(record, "1945"),
      seams(cliSpawn(CLEAN, ["measured-pr-1945"]).spawn, {
        emitDecision: async (argv) => {
          emitted.push(argv);
          return { code: 0, stderr: "" };
        },
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("HUMAN_TURN");
    expect(existsSync(reportPathFor(record, "convergence-toolchain"))).toBe(false);
    expect(emitted).toEqual([]);
  });

  test("refuses an override of an already converged pull request", async () => {
    const record = makeRecord({ humanTurn: true });
    const out = await runCli(
      args(record, "2268"),
      seams(cliSpawn(CLEAN, ["measured-pr-2268"]).spawn),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("already converged");
    expect(existsSync(reportPathFor(record, "convergence-toolchain"))).toBe(false);
  });

  test("records the override in the audit trail and then writes converged:false", async () => {
    const record = makeRecord({ humanTurn: true });
    const emitted: (readonly string[])[] = [];
    const out = await runCli(
      args(record, "1945"),
      seams(cliSpawn(CLEAN, ["measured-pr-1945"]).spawn, {
        emitDecision: async (argv) => {
          emitted.push(argv);
          return { code: 0, stderr: "" };
        },
      }),
    );
    expect(out.exitCode).toBe(0);
    expect(emitted).toHaveLength(1);
    const argv = emitted[0] as readonly string[];
    expect(argv[0]).toBe("bun");
    expect(argv).toContain("decision");
    expect(argv.join(" ")).toContain("cccccccc-0000-0000-0000-000000000003");
    const body = readFileSync(reportPathFor(record, "convergence-toolchain"), "utf-8");
    expect(body).toContain("converged: false");
    expect(body).toContain("kind: override");
    expect(body).toContain("GitHub unreachable; landing under human ruling");
    expect(body).toContain("cccccccc-0000-0000-0000-000000000003");
  });

  test("a failing audit spawn fails the whole override — no report is left behind", async () => {
    const record = makeRecord({ humanTurn: true });
    const out = await runCli(
      args(record, "1945"),
      seams(cliSpawn(CLEAN, ["measured-pr-1945"]).spawn, {
        emitDecision: async () => ({ code: 1, stderr: "audit latch closed" }),
      }),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("audit");
    expect(existsSync(reportPathFor(record, "convergence-toolchain"))).toBe(false);
  });

  test("requires a reason", async () => {
    const record = makeRecord({ humanTurn: true });
    const out = await runCli(
      args(record, "1945").filter((a, i, all) => a !== "--reason" && all[i - 1] !== "--reason"),
      seams(cliSpawn(CLEAN, ["measured-pr-1945"]).spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--reason");
  });
});

describe("the audit tool path is harness-neutral", () => {
  test("names no harness directory — the plugin ships into every harness tree", () => {
    const resolved = defaultLogToolPath();
    for (const harness of [".claude", ".codex", ".cursor", ".opencode", ".kimi-code", ".kiro", ".pi"]) {
      // The resolved path may legitimately CONTAIN the current harness dir,
      // but the source must not name one: the check is on the literal.
      expect(DEFAULT_LOG_TOOL_RELATIVE).not.toContain(harness);
    }
    // It is derived by walking out of plugins/<name>/tools/ into the sibling
    // tools/ directory of whichever harness tree the plugin was installed in.
    expect(DEFAULT_LOG_TOOL_RELATIVE).toBe("../../../tools/amadeus-log.ts");
    expect(resolved.endsWith(join("tools", "amadeus-log.ts"))).toBe(true);
    expect(resolved).not.toContain(join("plugins", "pr-convergence"));
  });

  test("an explicit --log-tool wins over the derived default", async () => {
    const record = makeRecord({ humanTurn: true });
    const emitted: (readonly string[])[] = [];
    const out = await runCli(
      [
        "override",
        "--repo",
        "amadeus-dlc/amadeus",
        "--pr",
        "1945",
        "--unit",
        "convergence-toolchain",
        "--record",
        record,
        "--reason",
        "explicit tool path",
        "--log-tool",
        "/somewhere/amadeus-log.ts",
      ],
      seams(cliSpawn(CLEAN, ["measured-pr-1945"]).spawn, {
        emitDecision: async (argv) => {
          emitted.push(argv);
          return { code: 0, stderr: "" };
        },
      }),
    );
    expect(out.exitCode).toBe(0);
    expect(emitted[0]).toContain("/somewhere/amadeus-log.ts");
  });
});

// ---------------------------------------------------------------------------
// Self-record delivery: read-only status, interrupted-run recovery, and the
// branch identity the head SHA alone cannot establish.
// ---------------------------------------------------------------------------

const SELF_SHA = "c".repeat(40);
const SELF_BRANCH = "feature/2838";
const SELF_UUID = "uuid-2838";
const SELF_PROVENANCE = {
  title: "[pr-gate/delivery/cli] fix: gate",
  body:
    "## Summary\n\nIssue 2838.\n\n## Amadeus Work\n\n" +
    "- Intent: `pr-gate`\n- Bolt: `delivery`\n- Unit: `cli`\n" +
    "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2838`\n",
};

interface SelfFixture {
  readonly root: string;
  readonly record: string;
  readonly bodyFile: string;
}

function makeSelfFixture(): SelfFixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-self-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, "260812-pr-gate");
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      { slug: "pr-gate", uuid: SELF_UUID, dirName: "260812-pr-gate", status: "in-flight" },
    ])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  const bodyFile = join(root, "body.md");
  writeFileSync(bodyFile, "## Summary\n\nIssue 2838.\n", "utf-8");
  return { root, record, bodyFile };
}

function selfGit(overrides: Record<string, { code: number; stdout: string }> = {}): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const defaults: Record<string, { code: number; stdout: string }> = {
      "rev-parse --show-toplevel": { code: 0, stdout: "/repo\n" },
      "branch --show-current": { code: 0, stdout: `${SELF_BRANCH}\n` },
      "rev-parse HEAD": { code: 0, stdout: `${SELF_SHA}\n` },
      "rev-parse --show-prefix": {
        code: 0,
        stdout: "amadeus/spaces/default/intents/260812-pr-gate/\n",
      },
      "diff --name-only main...HEAD": { code: 0, stdout: "plugins/pr-convergence/tool.ts\n" },
      "status --porcelain --untracked-files=no": { code: 0, stdout: "" },
      [`ls-remote --exit-code --heads origin ${SELF_BRANCH}`]: {
        code: 0,
        stdout: `${SELF_SHA}\trefs/heads/${SELF_BRANCH}\n`,
      },
    };
    return { ...(overrides[key] ?? defaults[key] ?? { code: 1, stdout: "" }), stderr: "" };
  };
}

interface SelfGhOptions {
  readonly calls?: string[][];
  readonly create?: GhSpawnResult;
  readonly list?: GhSpawnResult;
  readonly headRefName?: string;
  readonly headRefOid?: string;
  readonly provenance?: { title: string; body: string };
}

function selfGh(options: SelfGhOptions = {}): GhSpawn {
  return async (argv) => {
    options.calls?.push([...argv]);
    const text = argv.join(" ");
    if (text.includes("--version")) return ok("gh version 2.97.0");
    if (text.includes("auth status")) return ok("Logged in");
    if (text.includes("pr create")) {
      return options.create ?? ok("https://github.com/amadeus-dlc/amadeus/pull/2838\n");
    }
    if (text.includes("pr list")) return options.list ?? ok("[]");
    if (text.includes("reviewThreads")) return ok(fixture("measured-pr-2268"));
    return ok(
      JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              mergeable: "MERGEABLE",
              mergeStateStatus: "CLEAN",
              state: "OPEN",
              headRefOid: options.headRefOid ?? SELF_SHA,
              headRefName: options.headRefName ?? SELF_BRANCH,
              title: options.provenance?.title ?? "",
              body: options.provenance?.body ?? "",
            },
          },
        },
      }),
    );
  };
}

interface SelfSeamsOptions {
  readonly gh?: GhSpawn;
  readonly git?: GitSpawn;
  readonly emitAttestation?: CliSeams["emitAttestation"];
  readonly fireSensor?: CliSeams["fireSensor"];
}

/** Seams whose attestation emitter appends to the record's audit shard, so the
 *  carriage check sees exactly what a real emission would have written. */
function selfSeams(record: string, options: SelfSeamsOptions = {}): CliSeams {
  const emit: CliSeams["emitAttestation"] = async (argv) => {
    const attributes: Record<string, string> = { Event: "ARTIFACT_ATTESTED" };
    for (let i = 0; i < argv.length; i += 1) {
      if (argv[i] !== "--field") continue;
      const value = argv[++i] ?? "";
      const at = value.indexOf("=");
      attributes[value.slice(0, at)] = value.slice(at + 1);
    }
    writeFileSync(join(record, "audit", "attestation.jsonl"), `${JSON.stringify({ attributes })}\n`, {
      flag: "a",
    });
    return { code: 0, stderr: "" };
  };
  return {
    ghSpawn: options.gh ?? selfGh(),
    gitSpawn: options.git ?? selfGit(),
    sleep: async () => undefined,
    now: () => "2026-08-12T00:00:00Z",
    emitDecision: async () => ({ code: 0, stderr: "" }),
    emitAttestation: options.emitAttestation ?? emit,
    fireSensor: options.fireSensor ?? (async () => ({ code: 0, stderr: "" })),
  };
}

const createArgs = (f: SelfFixture) => [
  "create",
  "--repo",
  "amadeus-dlc/amadeus",
  "--head",
  SELF_BRANCH,
  "--base",
  "main",
  "--title",
  "fix: gate",
  "--body-file",
  f.bodyFile,
  "--record",
  f.record,
  "--bolt",
  "delivery",
  "--unit",
  "cli",
];

const reportArgs = (f: SelfFixture) => [
  "report",
  "--repo",
  "amadeus-dlc/amadeus",
  "--pr",
  "2838",
  "--unit",
  "cli",
  "--record",
  f.record,
];

const statusArgs = (f: SelfFixture) => [
  "status",
  "--repo",
  "amadeus-dlc/amadeus",
  "--pr",
  "2838",
  "--unit",
  "cli",
  "--record",
  f.record,
];

describe("CLI status verb on a self record — read-only, usable mid-work", () => {
  test("answers with the verdict while the worktree is dirty and no report exists", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      statusArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        git: selfGit({ "status --porcelain --untracked-files=no": { code: 0, stdout: " M x.ts\n" } }),
      }),
    );
    expect(out.exitCode).toBe(0);
    expect(JSON.parse(out.stdout).converged).toBe(true);
    expect(existsSync(reportPathFor(f.record, "cli"))).toBe(false);
  });

  test("still refuses a self record whose linked PR provenance is absent (exit 3)", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(statusArgs(f), selfSeams(f.record));
    expect(out.exitCode).toBe(3);
    expect(out.stderr).toContain("provenance");
  });

  test("still refuses --unlinked true on a self record", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      [...statusArgs(f), "--unlinked", "true"],
      selfSeams(f.record, { gh: selfGh({ provenance: SELF_PROVENANCE }) }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("--unlinked true is forbidden");
  });
});

describe("CLI self report delivery — an interrupted run is resumable, not bricked", () => {
  test("resumes the audit emission that failed after the report was written", async () => {
    const f = makeSelfFixture();
    const interrupted = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { emitAttestation: async () => ({ code: 1, stderr: "audit latch closed" }) }),
    );
    expect(interrupted.exitCode).toBe(2);
    expect(existsSync(reportPathFor(f.record, "cli"))).toBe(true);
    expect(existsSync(join(f.record, "audit", "attestation.jsonl"))).toBe(false);

    const fired: string[][] = [];
    const resumed = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        fireSensor: async (argv) => {
          fired.push([...argv]);
          return { code: 0, stderr: "" };
        },
      }),
    );
    expect(resumed.exitCode).toBe(0);
    expect(readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8")).toContain(
      "ARTIFACT_ATTESTED",
    );
    expect(fired).toHaveLength(1);
  });

  test("re-fires the sensor that failed after the audit emission landed", async () => {
    const f = makeSelfFixture();
    const interrupted = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { fireSensor: async () => ({ code: 1, stderr: "sensor unavailable" }) }),
    );
    expect(interrupted.exitCode).toBe(2);
    const audit = readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8");

    const fired: string[][] = [];
    const resumed = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        fireSensor: async (argv) => {
          fired.push([...argv]);
          return { code: 0, stderr: "" };
        },
      }),
    );
    expect(resumed.exitCode).toBe(0);
    expect(fired).toHaveLength(1);
    // The audit line is not duplicated: only the missing step is replayed.
    expect(readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8")).toBe(audit);
  });

  test("refuses report bytes edited after the attestation was written", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const path = reportPathFor(f.record, "cli");
    writeFileSync(path, readFileSync(path, "utf-8").replace("- converged: false", "- converged: true"));
    const out = await invokeCli(createArgs(f), selfSeams(f.record));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("tampered");
  });

  test("refuses an attestation copied from another identity, audit shard and all", async () => {
    const source = makeSelfFixture();
    // The source report belongs to a different unit; only the copy makes it
    // look like this delivery's evidence.
    const sourceArgs = createArgs(source).map((token) => (token === "cli" ? "other-unit" : token));
    expect((await invokeCli(sourceArgs, selfSeams(source.record))).exitCode).toBe(0);
    const target = makeSelfFixture();
    const targetPath = reportPathFor(target.record, "cli");
    mkdirSync(join(target.record, "construction", "cli", "code-generation"), { recursive: true });
    writeFileSync(targetPath, readFileSync(reportPathFor(source.record, "other-unit"), "utf-8"), "utf-8");
    writeFileSync(
      join(target.record, "audit", "attestation.jsonl"),
      readFileSync(join(source.record, "audit", "attestation.jsonl"), "utf-8"),
      "utf-8",
    );

    const out = await invokeCli(createArgs(target), selfSeams(target.record));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("copied");
  });

  test("resumes the created receipt before advancing the report verb to converged", async () => {
    const f = makeSelfFixture();
    const interrupted = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { emitAttestation: async () => ({ code: 1, stderr: "audit latch closed" }) }),
    );
    expect(interrupted.exitCode).toBe(2);

    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, { gh: selfGh({ provenance: SELF_PROVENANCE }) }),
    );
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(f.record, "cli"), "utf-8");
    expect(body).toContain("- kind: converged");
    // Both receipts are on the shard: the resumed created one and the converged one.
    const audit = readFileSync(join(f.record, "audit", "attestation.jsonl"), "utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "");
    expect(audit).toHaveLength(2);
  });
});

describe("CLI self prerequisites — the head SHA alone does not prove the branch", () => {
  test("refuses the same commit published under a different branch name", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE, headRefName: "someone-elses-branch" }),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("branch");
  });

  test("refuses a PR state that does not carry the head branch name at all", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const gh: GhSpawn = async (argv) => {
      const text = argv.join(" ");
      if (text.includes("--version")) return ok("gh version 2.97.0");
      if (text.includes("auth status")) return ok("Logged in");
      if (text.includes("reviewThreads")) return ok(fixture("measured-pr-2268"));
      return ok(
        JSON.stringify({
          data: {
            repository: {
              pullRequest: {
                mergeable: "MERGEABLE",
                mergeStateStatus: "CLEAN",
                state: "OPEN",
                headRefOid: SELF_SHA,
                ...SELF_PROVENANCE,
              },
            },
          },
        }),
      );
    };
    const out = await invokeCli(reportArgs(f), selfSeams(f.record, { gh }));
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("PR head branch is unavailable");
  });
});

describe("CLI create verb — recovers when the pull request already exists", () => {
  const duplicate = { code: 1, stdout: "", stderr: "a pull request for branch already exists" };
  const listed = (overrides: Record<string, unknown> = {}) =>
    ok(
      JSON.stringify([
        {
          number: 2838,
          url: "https://github.com/amadeus-dlc/amadeus/pull/2838",
          headRefName: SELF_BRANCH,
          headRefOid: SELF_SHA,
          ...SELF_PROVENANCE,
          ...overrides,
        },
      ]),
    );

  test("writes the created report for the existing open pull request", async () => {
    const f = makeSelfFixture();
    const calls: string[][] = [];
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ calls, create: duplicate, list: listed(), provenance: SELF_PROVENANCE }),
      }),
    );
    expect(out.exitCode).toBe(0);
    expect(out.stdout).toContain("https://github.com/amadeus-dlc/amadeus/pull/2838");
    const body = readFileSync(reportPathFor(f.record, "cli"), "utf-8");
    expect(body).toContain("- kind: created");
    expect(body).toContain("amadeus-dlc/amadeus#2838");
    // The existing pull request is reused, never re-created or edited.
    expect(calls.filter((argv) => argv.join(" ").includes("pr create"))).toHaveLength(1);
    expect(calls.some((argv) => argv.join(" ").includes("pr edit"))).toBe(false);
  });

  test("refuses an existing pull request whose head is not the local HEAD", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        gh: selfGh({
          create: duplicate,
          list: listed({ headRefOid: "d".repeat(40) }),
          headRefOid: "d".repeat(40),
        }),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("head");
    expect(existsSync(reportPathFor(f.record, "cli"))).toBe(false);
  });

  test("refuses an existing pull request whose provenance section is absent", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ create: duplicate, list: listed({ title: "fix: gate", body: "## Summary\n" }) }),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("gh pr edit");
    expect(existsSync(reportPathFor(f.record, "cli"))).toBe(false);
  });

  test("reports the original failure with recovery guidance when no open PR exists", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { gh: selfGh({ create: duplicate, list: ok("[]") }) }),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("gh failed creating pull request");
    expect(out.stderr).toContain("no open pull request");
  });
});

describe("git runner — an unresponsive remote expires instead of blocking forever", () => {
  test("a command that outlives the deadline is a typed failure, not a hang", () => {
    const budget = scaleTestTime(300);
    const started = Date.now();
    // `sleep` stands in for `git ls-remote` against a remote that never answers.
    const result = createNodeGitSpawn(budget)(["sleep", "30"], tmpdir());
    const elapsed = Date.now() - started;
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("timed out");
    expect(elapsed).toBeLessThan(scaleTestTime(15_000));
  });

  test("a command that finishes inside the deadline is unaffected", () => {
    const result = createNodeGitSpawn(scaleTestTime(10_000))(["echo", "alive"], tmpdir());
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("alive");
  });

  test("the shipped runner carries a finite deadline", () => {
    expect(GIT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(GIT_TIMEOUT_MS)).toBe(true);
  });
});

describe("CLI self delivery — the failure arms of recovery are loud", () => {
  const failing = async () => ({ code: 1, stderr: "boom" });

  test("a resumed emission that fails again exits 2 and says how to complete it", async () => {
    const f = makeSelfFixture();
    expect(
      (await invokeCli(createArgs(f), selfSeams(f.record, { emitAttestation: failing }))).exitCode,
    ).toBe(2);
    const again = await invokeCli(createArgs(f), selfSeams(f.record, { emitAttestation: failing }));
    expect(again.exitCode).toBe(2);
    expect(again.stderr).toContain("re-run the same verb");
  });

  test("a resumed sensor fire that fails again exits 2", async () => {
    const f = makeSelfFixture();
    expect(
      (await invokeCli(createArgs(f), selfSeams(f.record, { fireSensor: failing }))).exitCode,
    ).toBe(2);
    const again = await invokeCli(createArgs(f), selfSeams(f.record, { fireSensor: failing }));
    expect(again.exitCode).toBe(2);
    expect(again.stderr).toContain("sensor fire failed");
  });

  test("the report verb reports a pending receipt it still cannot emit", async () => {
    const f = makeSelfFixture();
    expect(
      (await invokeCli(createArgs(f), selfSeams(f.record, { emitAttestation: failing }))).exitCode,
    ).toBe(2);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        emitAttestation: failing,
      }),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("attestation emission failed");
  });

  test("an unreadable pull-request list is reported, not treated as absence", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        gh: selfGh({
          create: { code: 1, stdout: "", stderr: "already exists" },
          list: { code: 1, stdout: "", stderr: "rate limited" },
        }),
      }),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("could not be read");
  });

  test("an existing pull request with an unusable number is refused", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, {
        gh: selfGh({
          create: { code: 1, stdout: "", stderr: "already exists" },
          list: ok(
            JSON.stringify([
              {
                number: 0,
                url: "https://example.invalid",
                headRefName: SELF_BRANCH,
                headRefOid: SELF_SHA,
                ...SELF_PROVENANCE,
              },
            ]),
          ),
        }),
      }),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("unusable");
  });

  test("an unlinked create still reports the raw gh failure", async () => {
    const bodyFile = makeBodyFile("## Summary\n");
    const s = scriptedSpawn([
      ok("gh version 2.97.0"),
      ok("Logged in"),
      { code: 1, stdout: "", stderr: "boom" },
    ]);
    const out = await runCli(
      [
        "create",
        "--repo",
        "amadeus-dlc/amadeus",
        "--head",
        "codex/x",
        "--title",
        "feat: x",
        "--body-file",
        bodyFile,
      ],
      seams(s.spawn),
    );
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("gh failed creating pull request");
    // No pull-request list is read for a delivery that has no report to recover.
    expect(s.argvs.some((argv) => argv.join(" ").includes("pr list"))).toBe(false);
  });

  test("a git command that cannot start is a loud failure, not a silent zero", () => {
    const spawnGit = createNodeGitSpawn(scaleTestTime(5_000));
    expect(spawnGit([], tmpdir())).toEqual({ code: -1, stdout: "", stderr: "empty argv" });
    const missing = spawnGit(["amadeus-no-such-binary"], tmpdir());
    expect(missing.code).not.toBe(0);
    expect(missing.stderr).toContain("amadeus-no-such-binary");
  });
});

describe("CLI self delivery — the CLI's own outputs do not block the next verb", () => {
  const PREFIX = "amadeus/spaces/default/intents/260812-pr-gate/";
  const REPORT_PATH = `${PREFIX}construction/cli/code-generation/pr-convergence-report.md`;
  const SHARD_PATH = `${PREFIX}audit/clone-a.jsonl`;
  const dirty = (...paths: readonly string[]) => ({
    "status --porcelain --untracked-files=no": {
      code: 0,
      stdout: paths.map((path) => ` M ${path}\n`).join(""),
    },
  });

  test("report proceeds when only the unit report and the audit shard are dirty", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        git: selfGit(dirty(REPORT_PATH, SHARD_PATH)),
      }),
    );
    expect(out.exitCode).toBe(0);
    expect(readFileSync(reportPathFor(f.record, "cli"), "utf-8")).toContain("- kind: converged");
  });

  test("create proceeds when only its own earlier outputs are dirty", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { git: selfGit(dirty(REPORT_PATH, SHARD_PATH)) }),
    );
    expect(out.exitCode).toBe(0);
  });

  test("any other tracked modification still refuses, with the same message", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        git: selfGit(dirty(REPORT_PATH, SHARD_PATH, "src/unrelated.ts")),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("tracked worktree is dirty; commit or restore it");
  });

  test("another unit's report is not this delivery's output", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        git: selfGit(
          dirty(`${PREFIX}construction/other-unit/code-generation/pr-convergence-report.md`),
        ),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("dirty");
  });

  test("create still refuses an unrelated tracked modification", async () => {
    const f = makeSelfFixture();
    const out = await invokeCli(
      createArgs(f),
      selfSeams(f.record, { git: selfGit(dirty("src/unrelated.ts")) }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("dirty");
    expect(existsSync(reportPathFor(f.record, "cli"))).toBe(false);
  });

  test("an unresolvable record prefix exempts nothing", async () => {
    const f = makeSelfFixture();
    expect((await invokeCli(createArgs(f), selfSeams(f.record))).exitCode).toBe(0);
    const out = await invokeCli(
      reportArgs(f),
      selfSeams(f.record, {
        gh: selfGh({ provenance: SELF_PROVENANCE }),
        git: selfGit({
          ...dirty(REPORT_PATH),
          "rev-parse --show-prefix": { code: 1, stdout: "" },
        }),
      }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("dirty");
  });
});

describe("renderReport — BR-U2-7, the report is machine-derived", () => {
  test("renders the same bytes for the same report value", () => {
    const report = {
      kind: "converged",
      generatedAt: "2026-08-05T11:00:00Z",
      prRef: { repo: "amadeus-dlc/amadeus", number: 2268 },
      verdict: {
        converged: true,
        violating: { repliedUnresolved: 0, ignored: 0 },
        mergeState: "CLEAN",
        mergeableResolution: "resolved",
      },
      ledgerSummary: {
        resolved: 7,
        outdated: 2,
        repliedUnresolved: 0,
        ignored: 0,
        humanOnly: 0,
        terminalized: 7,
      },
    } as const;
    expect(renderReport(report)).toBe(renderReport(report));
    expect(renderReport(report)).toContain("terminalized: 7");
  });
});
