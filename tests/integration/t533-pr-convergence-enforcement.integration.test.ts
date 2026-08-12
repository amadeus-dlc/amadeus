import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

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

// The mandatory-plugin-stage guard (verifyMandatoryPluginStages /
// mandatoryPluginStages in amadeus-state.ts) is what makes pr-convergence
// non-skippable for the scopes host config binds it to. CodeRabbit review
// finding on #2932: mandatoryPluginStages resolved plugin.scopeBindings via
// resolveAmadeusConfig(pd) — ignoring the `--intent`/`--space` selector a
// caller like `complete-workflow` threads through stateOperationTarget — so
// the resolved config (and therefore the enforced mandatory-stage set) could
// silently diverge from what `recompose` (amadeus-utility.ts, which DOES pass
// intent/space) enforces for the exact same targeted Intent.
//
// This reproduces that divergence end to end: a project with TWO Intents,
// where the SECOND (active) Intent carries an invalid intent-layer config
// (`plugin.activation.names` is project-scope-only — amadeus-config.ts
// "allows plugin activation only at project scope"), while the FIRST
// (non-active, explicitly `--intent`-targeted) Intent's config is clean.
// `complete-workflow` is invoked with `--intent`/`--space` naming the FIRST
// Intent explicitly. Pre-fix, the guard ignores that selector and resolves
// against the ACTIVE (second) Intent's invalid config, spuriously refusing a
// legitimate completion of the first. Post-fix, it resolves against the
// explicitly targeted (first) Intent's clean config and completes normally.
describe("mandatory-plugin-stage guard resolves config for the targeted Intent, not the active one", () => {
  const ROOT = join(import.meta.dir, "..", "..");
  const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
  const STATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");
  const GOAL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-goal.ts");
  const STAGE_GRAPH = join(ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
  const SCOPE_GRID = join(ROOT, "dist", "claude", ".claude", "tools", "data", "scope-grid.json");
  const toolEnv = {
    ...process.env,
    AMADEUS_STAGE_GRAPH: STAGE_GRAPH,
    AMADEUS_SCOPE_GRID: SCOPE_GRID,
  };
  const projects: string[] = [];

  afterEach(() => {
    for (const project of projects.splice(0)) cleanupTestProject(project);
  });

  function intentBirth(project: string): string {
    const result = spawnSync(
      process.execPath,
      [UTIL, "intent-birth", "--scope", "fix", "--project-dir", project],
      { encoding: "utf8", env: toolEnv },
    );
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    return readFileSync(
      join(project, "amadeus", "spaces", "default", "intents", "active-intent"),
      "utf8",
    ).trim();
  }

  function reconcileAchieved(project: string): void {
    const evidencePath = join(project, "goal-proof.txt");
    const evidence = "goal guard verified\n";
    writeFileSync(evidencePath, evidence);
    const itemsPath = join(project, "goal-items.json");
    writeFileSync(
      itemsPath,
      JSON.stringify([
        {
          id: "goal-statement",
          verdict: "ACHIEVED",
          evidence: [
            {
              kind: "deterministic-check",
              reference: "goal-proof.txt",
              digest: createHash("sha256").update(evidence).digest("hex"),
            },
          ],
        },
      ]),
    );
    const reconcile = spawnSync(
      process.execPath,
      [
        GOAL, "reconcile",
        "--items", itemsPath,
        "--final-stage", "build-and-test",
        "--project-dir", project,
      ],
      { encoding: "utf8", env: toolEnv },
    );
    expect(reconcile.status, `${reconcile.stdout}${reconcile.stderr}`).toBe(0);
  }

  function runComplete(project: string, record: string) {
    return spawnSync(
      process.execPath,
      [
        STATE, "complete-workflow", "build-and-test",
        "--intent", record,
        "--space", "default",
        "--project-dir", project,
      ],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );
  }

  test("an explicit --intent selector, not the active cursor, decides which config layer gates completion", () => {
    const project = createTestProject();
    projects.push(project);

    // Intent A: the one we will explicitly target and complete. Reconcile its
    // Goal while it is still the active Intent (GOAL reconcile has no
    // --intent selector of its own).
    const recordA = intentBirth(project);
    reconcileAchieved(project);

    // Intent B: born second, becomes the new active-intent cursor. Its
    // intent-layer config carries a key forbidden outside project scope, so
    // resolving config AGAINST it fails closed.
    const recordB = intentBirth(project);
    expect(recordB).not.toBe(recordA);
    const intentBConfigDir = join(project, "amadeus", "spaces", "default", "intents", recordB);
    expect(existsSync(intentBConfigDir)).toBe(true);
    writeFileSync(
      join(intentBConfigDir, "config.json"),
      JSON.stringify({ plugin: { activation: { names: ["fixture-plugin"] } } }),
    );
    // Intent A's own config layer stays clean (absent).
    expect(existsSync(join(project, "amadeus", "spaces", "default", "intents", recordA, "config.json"))).toBe(false);

    // Sanity: the active cursor is now B, not A — the divergence this test
    // pins only exists because the guard has a choice between the two.
    expect(
      readFileSync(join(project, "amadeus", "spaces", "default", "intents", "active-intent"), "utf8").trim(),
    ).toBe(recordB);

    // complete-workflow explicitly names Intent A via --intent/--space. A
    // config-resolution seam that honors that selector must resolve A's
    // (clean) config and succeed; a seam that silently falls back to the
    // active cursor resolves B's (invalid) config and fails closed instead.
    const result = runComplete(project, recordA);

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain("Cannot enforce plugin scope bindings");

    const eventsA = readdirSync(join(intentsDirAudit(project, recordA)))
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => readFileSync(join(intentsDirAudit(project, recordA), f), "utf8"))
      .join("\n");
    expect(eventsA).toContain("WORKFLOW_COMPLETED");
  });

  function intentsDirAudit(project: string, record: string): string {
    return join(project, "amadeus", "spaces", "default", "intents", record, "audit");
  }
});
