import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  GhSpawn,
  GhSpawnResult,
} from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  type CliSeams,
  reportPathFor,
  runCli,
} from "../../plugins/pr-convergence/tools/pr-convergence-cli.ts";
import type { GitSpawn } from "../../plugins/pr-convergence/tools/pr-convergence-git-runner.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const FIXTURES = join(import.meta.dir, "..", "fixtures", "pr-convergence");

const OLD_SHA = "c".repeat(40);
const NEW_SHA = "d".repeat(40);
const BRANCH = "feature/2931";
const UUID = "uuid-2931";
const PROVENANCE = {
  title: "[pr-gate/delivery/cli] fix: gate",
  body:
    "## Summary\n\nIssue 2931.\n\n## Amadeus Work\n\n" +
    "- Intent: `pr-gate`\n- Bolt: `delivery`\n- Unit: `cli`\n" +
    "- Record: `amadeus/spaces/default/intents/260812-pr-gate/`\n- UUID: `uuid-2931`\n",
};

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

interface Fixture {
  readonly root: string;
  readonly record: string;
  readonly bodyFile: string;
}

function seedDeliveryAuthority(record: string, unit: string): void {
  const plan = `## Bolt delivery\n\n- **Units:** \`${unit}\`\n`;
  const projected = projectDeliveryBoltPlan(plan);
  if (!projected.ok) throw new Error(projected.message);
  const planning = join(record, "inception", "delivery-planning");
  mkdirSync(planning, { recursive: true });
  writeFileSync(join(planning, "bolt-plan.md"), plan, "utf-8");
  writeFileSync(
    join(record, "runtime-graph.json"),
    `${JSON.stringify({ delivery_bolts: projected.projection }, null, 2)}\n`,
    "utf-8",
  );
}

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-epoch-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, "260812-pr-gate");
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      { slug: "pr-gate", uuid: UUID, dirName: "260812-pr-gate", status: "in-flight" },
    ])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  seedDeliveryAuthority(record, "cli");
  writeFileSync(
    join(record, "audit", "human.jsonl"),
    `${JSON.stringify({
      eventId: "aaaaaaaa-0000-0000-0000-00000000f001",
      seq: 1,
      timestamp: "2026-08-12T00:00:00Z",
      attributes: { Event: "HUMAN_TURN" },
    })}\n`,
    "utf-8",
  );
  const bodyFile = join(root, "body.md");
  writeFileSync(bodyFile, "## Summary\n\nIssue 2931.\n", "utf-8");
  return { root, record, bodyFile };
}

function git(sha: string): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const table: Record<string, { code: number; stdout: string }> = {
      "rev-parse --show-toplevel": { code: 0, stdout: "/repo\n" },
      "branch --show-current": { code: 0, stdout: `${BRANCH}\n` },
      "rev-parse HEAD": { code: 0, stdout: `${sha}\n` },
      "rev-parse --show-prefix": {
        code: 0,
        stdout: "amadeus/spaces/default/intents/260812-pr-gate/\n",
      },
      "diff --name-only main...HEAD": { code: 0, stdout: "plugins/pr-convergence/tool.ts\n" },
      "status --porcelain --untracked-files=no": { code: 0, stdout: "" },
      [`ls-remote --exit-code --heads origin refs/heads/${BRANCH}`]: {
        code: 0,
        stdout: `${sha}\trefs/heads/${BRANCH}\n`,
      },
    };
    return { ...(table[key] ?? { code: 1, stdout: "" }), stderr: "" };
  };
}

const ok = (stdout: string): GhSpawnResult => ({ code: 0, stdout, stderr: "" });
const DUPLICATE: GhSpawnResult = {
  code: 1,
  stdout: "",
  stderr: "a pull request for branch already exists",
};

function gh(sha: string, create: GhSpawnResult): GhSpawn {
  return async (argv) => {
    const text = argv.join(" ");
    if (text.includes("--version")) return ok("gh version 2.97.0");
    if (text.includes("auth status")) return ok("Logged in");
    if (text.includes("pr create")) return create;
    if (text.includes("reviewThreads")) {
      return ok(readFileSync(join(FIXTURES, "measured-pr-2268.graphql.json"), "utf-8"));
    }
    if (text.includes("pr list")) {
      return ok(
        JSON.stringify([
          {
            number: 2931,
            url: "https://github.com/amadeus-dlc/amadeus/pull/2931",
            headRefName: BRANCH,
            headRefOid: sha,
            ...PROVENANCE,
          },
        ]),
      );
    }
    return ok(
      JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              mergeable: "MERGEABLE",
              mergeStateStatus: "CLEAN",
              state: "OPEN",
              headRefOid: sha,
              headRefName: BRANCH,
              ...PROVENANCE,
            },
          },
        },
      }),
    );
  };
}

function seams(record: string, sha: string, create: GhSpawnResult): CliSeams {
  return {
    ghSpawn: gh(sha, create),
    gitSpawn: git(sha),
    sleep: async () => undefined,
    now: () => "2026-08-12T00:00:00Z",
    emitDecision: async () => ({ code: 0, stderr: "" }),
    emitAttestation: async (argv) => {
      const at = argv.indexOf("append");
      const attributes: Record<string, string> = { Event: argv[at + 1] ?? "" };
      for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] !== "--field") continue;
        const value = argv[++i] ?? "";
        const eq = value.indexOf("=");
        attributes[value.slice(0, eq)] = value.slice(eq + 1);
      }
      writeFileSync(join(record, "audit", "attestation.jsonl"), `${JSON.stringify({ attributes })}\n`, {
        flag: "a",
      });
      return { code: 0, stderr: "" };
    },
    fireSensor: async () => ({ code: 0, stderr: "" }),
  };
}

const createArgs = (f: Fixture) => [
  "create",
  "--repo",
  "amadeus-dlc/amadeus",
  "--head",
  BRANCH,
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

const reportArgs = (f: Fixture) => [
  "report",
  "--repo",
  "amadeus-dlc/amadeus",
  "--pr",
  "2931",
  "--unit",
  "cli",
  "--record",
  f.record,
];

/** The delivery as it stands after `create` at OLD_SHA: a `created` epoch. */
async function deliveredAtOldHead(): Promise<Fixture> {
  const f = makeFixture();
  const created = await runCli(
    createArgs(f),
    seams(f.record, OLD_SHA, ok("https://github.com/amadeus-dlc/amadeus/pull/2931\n")),
  );
  expect(created.exitCode).toBe(0);
  expect(readFileSync(reportPathFor(f.record, "cli"), "utf-8")).toContain(OLD_SHA);
  return f;
}

describe("#2931 — resuming a created epoch on the existing pull request", () => {
  test("create re-mints the created epoch on the same pull request after the head advanced", async () => {
    const f = await deliveredAtOldHead();

    const resumed = await runCli(createArgs(f), seams(f.record, NEW_SHA, DUPLICATE));
    expect(resumed.stderr).toBe("");
    expect(resumed.exitCode).toBe(0);
    expect(resumed.stdout).toContain("https://github.com/amadeus-dlc/amadeus/pull/2931");
    const body = readFileSync(reportPathFor(f.record, "cli"), "utf-8");
    expect(body).toContain("- kind: created");
    expect(body).toContain(NEW_SHA);
    expect(body).not.toContain(OLD_SHA);
  });

  test("report names the resume path when the head advanced past the report", async () => {
    const f = await deliveredAtOldHead();
    const before = readFileSync(reportPathFor(f.record, "cli"), "utf-8");

    const stale = await runCli(reportArgs(f), seams(f.record, NEW_SHA, DUPLICATE));
    expect(stale.exitCode).toBe(1);
    expect(stale.stderr).toContain("PR head advanced");
    expect(stale.stderr).toContain("create");
    // Fail-closed: the refusal never rewrites the evidence it refused.
    expect(readFileSync(reportPathFor(f.record, "cli"), "utf-8")).toBe(before);
  });

  test("a tampered report is refused without the resume path", async () => {
    const f = await deliveredAtOldHead();
    const path = reportPathFor(f.record, "cli");
    const body = readFileSync(path, "utf-8");
    writeFileSync(path, body.replace("- converged: false", "- converged: true"), "utf-8");

    const out = await runCli(reportArgs(f), seams(f.record, OLD_SHA, DUPLICATE));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("tampered");
    expect(out.stderr).not.toContain("PR head advanced");
  });

  test("a report copied from another unit is refused without the resume path", async () => {
    const source = makeFixture();
    seedDeliveryAuthority(source.record, "other-unit");
    const otherUnit = createArgs(source).map((token) => (token === "cli" ? "other-unit" : token));
    const created = await runCli(
      otherUnit,
      seams(source.record, OLD_SHA, ok("https://github.com/amadeus-dlc/amadeus/pull/2931\n")),
    );
    expect(created.exitCode).toBe(0);
    const copied = readFileSync(reportPathFor(source.record, "other-unit"), "utf-8");

    const target = makeFixture();
    mkdirSync(join(target.record, "construction", "cli", "code-generation"), { recursive: true });
    writeFileSync(reportPathFor(target.record, "cli"), copied, "utf-8");

    const out = await runCli(reportArgs(target), seams(target.record, OLD_SHA, DUPLICATE));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("copied");
    expect(out.stderr).not.toContain("PR head advanced");
  });
});
