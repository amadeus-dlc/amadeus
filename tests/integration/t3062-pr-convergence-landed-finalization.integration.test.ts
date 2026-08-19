// covers: file:plugins/github-pr-convergence/tools/pr-convergence-cli.ts,
//         file:plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
// size: medium
//
// #3062 — finalising a self-development record whose pull request the merge
// queue landed before `report` ran. The created epoch exists, auto-merge lands
// the PR, and the stage must still be completable through the ordinary verbs:
//
//   (a) `status` on a merged self record exits 0 with the landed verdict, the
//       same settled answer a non-self record already got;
//   (b) `report` writes the attested `landed` record — the merge facts the
//       non-self path already writes, no new fields, `converged: false`;
//   (c) the blocking report-format sensor accepts that record at the
//       `pr-convergence` stage, and still rejects the `created` report that
//       precedes the merge (the falling half of the same fixture).
//
// The record root is a real git repository: the sensor reads `git rev-parse
// HEAD` at the record root and binds it to the attestation, so the checkout
// has to be genuine for the pass half to mean anything.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  GhSpawn,
  GhSpawnResult,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  type CliSeams,
  reportPathFor,
  runCli,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-cli.ts";
import type { GitSpawn } from "../../plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts";
import { evaluateReportFormat } from "../../plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const FIXTURES = join(import.meta.dir, "..", "fixtures", "pr-convergence");
const BRANCH = "feature/3062";
const UUID = "uuid-3062";
const UNIT = "landed-finalization";
const BOLT = "delivery";
const REPO = "amadeus-dlc/amadeus";
const PR_NUMBER = 3062;
const MERGED_AT = "2026-08-15T01:00:00Z";
const MERGE_COMMIT = "abcdef0123456789abcdef0123456789abcdef01";
const PROVENANCE = {
  title: `[landed/${BOLT}/${UNIT}] fix: finalise landed`,
  body:
    "## Summary\n\nIssue 3062.\n\n## Amadeus Work\n\n" +
    `- Intent: \`landed\`\n- Bolt: \`${BOLT}\`\n- Unit: \`${UNIT}\`\n` +
    "- Record: `amadeus/spaces/default/intents/260815-landed/`\n- UUID: `uuid-3062`\n",
};

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

function git(args: readonly string[], cwd: string): string {
  const out = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (out.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${out.stderr}`);
  return out.stdout.trim();
}

interface Fixture {
  readonly root: string;
  readonly record: string;
  readonly bodyFile: string;
  readonly head: string;
  /** Flips the scripted pull request from OPEN to MERGED. */
  merged: boolean;
}

function seedDeliveryAuthority(record: string): void {
  const plan = `## Bolt ${BOLT}\n\n- **Units:** \`${UNIT}\`\n`;
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

/** A self-development record inside a real git checkout, at a created epoch. */
function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-3062-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, "260815-landed");
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      { slug: "landed", uuid: UUID, dirName: "260815-landed", status: "in-flight" },
    ])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  seedDeliveryAuthority(record);
  writeFileSync(
    join(record, "audit", "human.jsonl"),
    `${JSON.stringify({
      eventId: "aaaaaaaa-0000-0000-0000-00000000f062",
      seq: 1,
      timestamp: "2026-08-15T00:00:00Z",
      attributes: { Event: "HUMAN_TURN" },
    })}\n`,
    "utf-8",
  );
  const bodyFile = join(root, "body.md");
  writeFileSync(bodyFile, "## Summary\n\nIssue 3062.\n", "utf-8");

  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t3062@example.invalid"], root);
  git(["config", "user.name", "t3062"], root);
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "seed"], root);
  const head = git(["rev-parse", "HEAD"], root);
  return { root, record, bodyFile, head, merged: false };
}

function gitSpawn(f: Fixture): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const table: Record<string, { code: number; stdout: string }> = {
      "rev-parse --show-toplevel": { code: 0, stdout: `${f.root}\n` },
      "branch --show-current": { code: 0, stdout: `${BRANCH}\n` },
      "rev-parse HEAD": { code: 0, stdout: `${f.head}\n` },
      "rev-parse --show-prefix": {
        code: 0,
        stdout: "amadeus/spaces/default/intents/260815-landed/\n",
      },
      "diff --name-only main...HEAD": { code: 0, stdout: "plugins/github-pr-convergence/tool.ts\n" },
      "status --porcelain --untracked-files=no": { code: 0, stdout: "" },
      [`ls-remote --exit-code --heads origin refs/heads/${BRANCH}`]: {
        code: 0,
        stdout: `${f.head}\trefs/heads/${BRANCH}\n`,
      },
    };
    return { ...(table[key] ?? { code: 1, stdout: "" }), stderr: "" };
  };
}

const ok = (stdout: string): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

function ghSpawn(f: Fixture): GhSpawn {
  return async (argv) => {
    const text = argv.join(" ");
    if (text.includes("--version")) return ok("gh version 2.97.0");
    if (text.includes("auth status")) return ok("Logged in");
    if (text.includes("pr create")) return ok(`https://github.com/${REPO}/pull/${PR_NUMBER}\n`);
    if (text.includes("reviewThreads")) {
      return ok(readFileSync(join(FIXTURES, "measured-pr-2268.graphql.json"), "utf-8"));
    }
    const lifecycle = f.merged
      ? {
          state: "MERGED",
          mergedAt: MERGED_AT,
          mergeCommit: { oid: MERGE_COMMIT, statusCheckRollup: { state: "SUCCESS" } },
        }
      : { state: "OPEN", mergedAt: null, mergeCommit: null };
    return ok(
      JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              mergeable: "MERGEABLE",
              mergeStateStatus: "CLEAN",
              headRefOid: f.head,
              headRefName: BRANCH,
              ...PROVENANCE,
              ...lifecycle,
            },
          },
        },
      }),
    );
  };
}

function seams(f: Fixture): CliSeams {
  return {
    ghSpawn: ghSpawn(f),
    gitSpawn: gitSpawn(f),
    sleep: async () => undefined,
    now: () => "2026-08-15T02:00:00Z",
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
      writeFileSync(join(f.record, "audit", "attestation.jsonl"), `${JSON.stringify({ attributes })}\n`, {
        flag: "a",
      });
      return { code: 0, stderr: "" };
    },
    fireSensor: async () => ({ code: 0, stderr: "" }),
  };
}

const createArgs = (f: Fixture) => [
  "create", "--repo", REPO, "--head", BRANCH, "--base", "main",
  "--title", "fix: finalise landed", "--body-file", f.bodyFile,
  "--record", f.record, "--bolt", BOLT, "--unit", UNIT,
];

const verbArgs = (verb: string, f: Fixture) => [
  verb, "--repo", REPO, "--pr", String(PR_NUMBER), "--unit", UNIT, "--record", f.record,
];

/** The delivery as it stands after `create`: a `created` epoch, PR still open. */
async function delivered(): Promise<Fixture> {
  const f = makeFixture();
  const created = await runCli(createArgs(f), seams(f));
  expect(created.stderr).toBe("");
  expect(created.exitCode).toBe(0);
  expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toContain("- kind: created");
  return f;
}

describe("#3062 — a merged self record finalises through the ordinary verbs", () => {
  test("status on a merged self record is settled: exit 0 with the landed verdict", async () => {
    const f = await delivered();
    f.merged = true;

    const out = await runCli(verbArgs("status", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const payload = JSON.parse(out.stdout);
    expect(payload.verdict).toBe("landed");
    expect(payload.converged).toBe(false);
    expect(payload.mergeState).toBe("MERGED");
  });

  test("report writes the attested landed record with the merge facts", async () => {
    const f = await delivered();
    f.merged = true;

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
    expect(body).toContain("- kind: landed");
    expect(body).toContain(`- pull request: ${REPO}#${PR_NUMBER}`);
    // The record fact, not a convergence claim: the semantics of `converged`
    // are unchanged by finalisation.
    expect(body).toContain("- converged: false");
    expect(body).toContain(`- merged at: ${MERGED_AT}`);
    expect(body).toContain(`- merge commit: ${MERGE_COMMIT}`);
    expect(body).toContain("- check rollup: SUCCESS");
    expect(body).toContain("## CLI Attestation");
  });

  test("the blocking sensor accepts the landed record at the pr-convergence stage", async () => {
    const f = await delivered();
    f.merged = true;
    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(0);

    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("landed");
  });

  test("the created report that precedes the merge is still rejected there", async () => {
    // The falling half of the same fixture: before the merge the stage has
    // only the delivery proof, and that has never been final evidence.
    const f = await delivered();
    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.field)).toContain("kind");
  });

  test("the blocking sensor also accepts the landed record at the code-generation stage (#3235)", async () => {
    // #3149's principle — the receipt decides, never the kind — extends to
    // which stage may treat `landed` as evidence: a receipt that attests the
    // merge is just as final at code-generation as it is at pr-convergence.
    const f = await delivered();
    f.merged = true;
    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(0);

    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "code-generation");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("landed");
  });
});
