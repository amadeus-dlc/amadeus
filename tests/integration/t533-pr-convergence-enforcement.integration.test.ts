import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGhRunner,
  fetchRawPrState,
  type GhSpawn,
  type GhSpawnResult,
  parsePrRef,
  PR_STATE_QUERY,
} from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  reportPathFor,
  runCli,
} from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";

const REPO = "amadeus-dlc/amadeus";
const UNIT = "convergence-enforcement";
const REF = parsePrRef(REPO, "2817");
if (REF === null) throw new Error("fixture ref must parse");

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

const ok = (stdout = ""): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

function record(humanTurn = false): string {
  const root = mkdtempSync(join(tmpdir(), "t533-pr-provenance-"));
  roots.push(root);
  mkdirSync(join(root, "audit"), { recursive: true });
  const rows = humanTurn
    ? [
        JSON.stringify({
          eventId: "00000000-0000-0000-0000-000000000001",
          seq: 1,
          timestamp: "2026-08-10T00:00:00Z",
          attributes: { Event: "HUMAN_TURN" },
        }),
      ]
    : [];
  writeFileSync(join(root, "audit", "clone.jsonl"), `${rows.join("\n")}\n`, "utf-8");
  return root;
}

function canonicalBody(recordRoot: string): string {
  return [
    "## Amadeus Work",
    "",
    "- Intent: `pr-provenance-enforcement`",
    "- Bolt: `convergence-enforcement`",
    `- Unit: \`${UNIT}\``,
    `- Record: \`${recordRoot}\``,
    "- UUID: `019feabb-4bc3-7547-9ab9-8c55ace2d3b5`",
    "",
  ].join("\n");
}

const title = `[pr-provenance-enforcement/convergence-enforcement/${UNIT}] Enforce provenance`;

interface SpawnOptions {
  readonly recordRoot: string;
  readonly title?: unknown;
  readonly body?: unknown;
  readonly state?: "OPEN" | "MERGED";
  readonly mergeable?: string;
  readonly mergeStateStatus?: string;
  readonly omitTitle?: boolean;
  readonly omitBody?: boolean;
}

function pullRequestPayload(options: SpawnOptions): Record<string, unknown> {
  const state = options.state ?? "OPEN";
  const payload: Record<string, unknown> = {
    mergeable: options.mergeable ?? "MERGEABLE",
    mergeStateStatus: options.mergeStateStatus ?? "CLEAN",
    state,
    mergedAt: state === "MERGED" ? "2026-08-10T01:00:00Z" : null,
    mergeCommit:
      state === "MERGED"
        ? { oid: "a".repeat(40), statusCheckRollup: { state: "SUCCESS" } }
        : null,
  };
  if (!options.omitTitle) payload.title = options.title === undefined ? title : options.title;
  if (!options.omitBody) {
    payload.body =
      options.body === undefined ? canonicalBody(options.recordRoot) : options.body;
  }
  return payload;
}

function stateResponse(options: SpawnOptions): GhSpawnResult {
  return ok(
    JSON.stringify({
      data: { repository: { pullRequest: pullRequestPayload(options) } },
    }),
  );
}

function threadsResponse(): GhSpawnResult {
  return ok(
    JSON.stringify({
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
          },
        },
      },
    }),
  );
}

function convergenceSpawn(options: SpawnOptions) {
  const argvs: (readonly string[])[] = [];
  const spawn: GhSpawn = async (argv) => {
    argvs.push(argv);
    const query = argv.find((value) => value.startsWith("query=")) ?? "";
    if (argv.includes("--version")) return ok("gh version 2.97.0");
    if (argv.includes("auth")) return ok("Logged in");
    if (query.includes("reviewThreads")) return threadsResponse();
    return stateResponse(options);
  };
  return { argvs, spawn };
}

function seams(spawn: GhSpawn): Parameters<typeof runCli>[1] {
  return {
    ghSpawn: spawn,
    sleep: async () => undefined,
    now: () => "2026-08-10T02:00:00Z",
    emitDecision: async () => ({ code: 0, stderr: "" }),
  };
}

function args(verb: "status" | "report" | "override", recordRoot: string): string[] {
  return [
    verb,
    "--repo",
    REPO,
    "--pr",
    "2817",
    "--unit",
    UNIT,
    "--record",
    recordRoot,
    ...(verb === "override" ? ["--reason", "human ruling"] : []),
  ];
}

describe("PR state provenance snapshot", () => {
  test("adds title and body to the existing state query and returns both without another call", async () => {
    const recordRoot = record();
    const s = convergenceSpawn({ recordRoot });
    const runner = await createGhRunner(s.spawn);
    if (!runner.ok) throw new Error("runner must be ready");

    const raw = await fetchRawPrState(runner.value, REF);

    expect(PR_STATE_QUERY).toContain("title body");
    expect(raw).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ title, body: canonicalBody(recordRoot) }),
      }),
    );
    expect(s.argvs.filter((argv) => argv.includes("graphql"))).toHaveLength(1);
  });

  test("rejects missing, null, and non-string title/body but accepts empty strings", async () => {
    const recordRoot = record();
    for (const fields of [
      { omitTitle: true },
      { title: null },
      { title: 42 },
      { omitBody: true },
      { body: null },
      { body: [] },
    ]) {
      const s = convergenceSpawn({ recordRoot, ...fields });
      const runner = await createGhRunner(s.spawn);
      if (!runner.ok) throw new Error("runner must be ready");
      expect((await fetchRawPrState(runner.value, REF)).ok).toBe(false);
    }

    const empty = convergenceSpawn({ recordRoot, title: "", body: "" });
    const runner = await createGhRunner(empty.spawn);
    if (!runner.ok) throw new Error("runner must be ready");
    const raw = await fetchRawPrState(runner.value, REF);
    expect(raw).toEqual(expect.objectContaining({ ok: true, value: expect.objectContaining({ title: "", body: "" }) }));
  });
});

describe("linked convergence provenance enforcement", () => {
  test("keeps a canonical active status on the existing two-query evaluation path", async () => {
    const recordRoot = record();
    const s = convergenceSpawn({ recordRoot });

    const out = await runCli(args("status", recordRoot), seams(s.spawn));

    expect(out.exitCode).toBe(0);
    expect(JSON.parse(out.stdout).converged).toBe(true);
    expect(s.argvs.filter((argv) => argv.includes("graphql"))).toHaveLength(2);
  });

  test("checks provenance from the first snapshot when UNKNOWN triggers a state retry", async () => {
    const recordRoot = record();
    const argvs: (readonly string[])[] = [];
    let stateCalls = 0;
    const spawn: GhSpawn = async (argv) => {
      argvs.push(argv);
      const query = argv.find((value) => value.startsWith("query=")) ?? "";
      if (argv.includes("--version")) return ok("gh version 2.97.0");
      if (argv.includes("auth")) return ok("Logged in");
      if (query.includes("reviewThreads")) return threadsResponse();
      stateCalls += 1;
      return stateCalls === 1
        ? stateResponse({
            recordRoot,
            mergeable: "UNKNOWN",
            mergeStateStatus: "UNKNOWN",
            title: "invalid first title",
            body: "invalid first body",
          })
        : stateResponse({ recordRoot });
    };

    const out = await runCli(args("status", recordRoot), seams(spawn));

    expect(out.exitCode).toBe(3);
    expect(JSON.parse(out.stdout).violations).toEqual([
      { kind: "title-prefix-missing" },
      { kind: "work-section-missing" },
    ]);
    expect(argvs.filter((argv) => argv.includes("graphql"))).toHaveLength(3);
  });

  test("returns dedicated exit 3 and remediation without exposing the raw body", async () => {
    const recordRoot = record();
    const secretBody = "secret-token-that-must-not-escape";
    const s = convergenceSpawn({ recordRoot, title: "ordinary title", body: secretBody });

    const out = await runCli(args("status", recordRoot), seams(s.spawn));

    expect(out.exitCode).toBe(3);
    expect(JSON.parse(out.stdout)).toEqual({
      kind: "provenance-violation",
      prRef: { repo: REPO, number: 2817 },
      violations: [
        { kind: "title-prefix-missing" },
        { kind: "work-section-missing" },
      ],
    });
    expect(out.stderr).toContain("Pull request provenance needs remediation");
    expect(out.stderr).toContain("gh pr edit --title ... --body-file ...");
    expect(`${out.stdout}${out.stderr}`).not.toContain(secretBody);
  });

  test("writes no report for active or landed provenance violations", async () => {
    for (const state of ["OPEN", "MERGED"] as const) {
      const recordRoot = record();
      const s = convergenceSpawn({ recordRoot, state, title: "invalid", body: "invalid" });

      const out = await runCli(args("report", recordRoot), seams(s.spawn));

      expect(out.exitCode).toBe(3);
      expect(existsSync(reportPathFor(recordRoot, UNIT))).toBe(false);
      expect(s.argvs.filter((argv) => argv.includes("graphql"))).toHaveLength(state === "OPEN" ? 2 : 1);
    }
  });

  test("accepts a canonical landed snapshot and writes the existing landed report", async () => {
    const recordRoot = record();
    const s = convergenceSpawn({ recordRoot, state: "MERGED" });

    const out = await runCli(args("report", recordRoot), seams(s.spawn));

    expect(out.exitCode).toBe(0);
    expect(existsSync(reportPathFor(recordRoot, UNIT))).toBe(true);
    expect(s.argvs.filter((argv) => argv.includes("graphql"))).toHaveLength(1);
  });
});

describe("explicit unlinked and override routes", () => {
  test("only the exact value true enables --unlinked", async () => {
    const recordRoot = record();
    for (const value of ["TRUE", "1", "yes", "false"]) {
      const s = convergenceSpawn({ recordRoot, title: "invalid", body: "invalid" });
      const out = await runCli([...args("status", recordRoot), "--unlinked", value], seams(s.spawn));
      expect(out.exitCode).toBe(2);
      expect(s.argvs).toEqual([]);
    }

    const s = convergenceSpawn({ recordRoot, title: "invalid", body: "invalid" });
    const out = await runCli([...args("status", recordRoot), "--unlinked", "true"], seams(s.spawn));
    expect(out.exitCode).toBe(0);
  });

  test("override bypasses provenance and keeps its existing human-turn contract", async () => {
    const recordRoot = record(false);
    const s = convergenceSpawn({ recordRoot, title: "invalid", body: "invalid", mergeStateStatus: "BLOCKED" });

    const out = await runCli(args("override", recordRoot), seams(s.spawn));

    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("no HUMAN_TURN");
    expect(out.stderr).not.toContain("provenance");
  });
});
