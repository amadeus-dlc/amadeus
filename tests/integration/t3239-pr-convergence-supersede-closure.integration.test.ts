// covers: file:plugins/github-pr-convergence/tools/pr-convergence-cli.ts,
//         file:plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts,
//         file:plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
// size: medium
//
// #3239 — a unit whose OWN pull request never converged because the work it
// carried landed through a different pull request or commit entirely
// (supersede). Neither of `override`'s two live prerequisites hold for it:
// there is no live PR head to check the checkout out at (the delivery branch
// may be long gone), and a `created` epoch need never have existed (a
// supersede can be detected before `create` ever ran, or after the record
// that once existed was lost across a park/resume).
//
// `override --superseded-by <sha> --bolt <bolt>` replaces both prerequisites
// with facts measured locally rather than asked of GitHub: the commit that
// actually delivered the work must be an ancestor of the checkout minting the
// record (`verifySupersedeAncestry`), and a human — never the loop, which has
// nothing left to converge — must be the one recording it (the same
// HUMAN_TURN requirement `override` already carries). No GitHub call is made
// at all: the own pull request may be CLOSED, and the ordinary evaluation
// pipeline exists to judge an OPEN one.
//
// The record root is a real git repository: the ancestry proof and the
// checkout binding are both measured against it, so both halves have to be
// genuine for the pass half to mean anything.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GhSpawn } from "../../plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  type CliSeams,
  reportPathFor,
  runCli,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-cli.ts";
import { evaluateReportFormat } from "../../plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts";
import {
  attestationId,
  renderAttestation,
  reportPayloadDigest,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-attestation.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const UUID = "uuid-3239";
const UNIT = "supersede-closure";
const BOLT = "delivery";
const REPO = "amadeus-dlc/amadeus";
const PR_NUMBER = 2770; // the unit's own pull request — closed, never merged.
const RECORD_DIR = "260809-supersede";

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
  /** The commit that actually delivered the work — an ancestor of HEAD. */
  readonly deliveredSha: string;
  /** A real commit that exists locally but is NOT an ancestor of HEAD. */
  readonly unreachableSha: string;
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

function makeFixture(options: { humanTurn?: boolean; scope?: string } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-3239-"));
  roots.push(root);
  git(["init", "--quiet", "--initial-branch=main"], root);
  git(["config", "user.email", "t3239@example.invalid"], root);
  git(["config", "user.name", "t3239"], root);

  writeFileSync(join(root, "delivered.txt"), "the actual fix\n", "utf-8");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "the delivery that actually landed"], root);
  const deliveredSha = git(["rev-parse", "HEAD"], root);

  // A real commit in the object database that main never merged — the
  // ancestry proof's falling half (`git merge-base --is-ancestor` exit 1).
  git(["checkout", "--quiet", "-b", "orphan"], root);
  writeFileSync(join(root, "orphan.txt"), "never merged\n", "utf-8");
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "never merged"], root);
  const unreachableSha = git(["rev-parse", "HEAD"], root);
  git(["checkout", "--quiet", "main"], root);
  git(["branch", "--quiet", "-D", "orphan"], root);

  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, RECORD_DIR);
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{ slug: "supersede", uuid: UUID, dirName: RECORD_DIR, status: "in-flight" }])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), `- **Scope**: ${options.scope ?? "self-fix"}\n`, "utf-8");
  seedDeliveryAuthority(record);
  if (options.humanTurn !== false) {
    writeFileSync(
      join(record, "audit", "human.jsonl"),
      `${JSON.stringify({
        eventId: "aaaaaaaa-0000-0000-0000-000000003239",
        seq: 1,
        timestamp: "2026-08-19T00:00:00Z",
        attributes: { Event: "HUMAN_TURN" },
      })}\n`,
      "utf-8",
    );
  }
  git(["add", "-A"], root);
  git(["commit", "--quiet", "-m", "seed the record"], root);
  return { root, record, deliveredSha, unreachableSha };
}

/** No GitHub call is expected on the supersede path at all — a spawn here is
 *  itself proof the source comment's claim holds. */
const refuseGh: GhSpawn = async () => {
  throw new Error("supersede must not call gh");
};

function seams(f: Fixture): CliSeams {
  return {
    ghSpawn: refuseGh,
    sleep: async () => undefined,
    now: () => "2026-08-19T09:00:00Z",
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

const overrideArgs = (f: Fixture, supersededBy: string, opts: { bolt?: string | null } = {}) => {
  const bolt = opts.bolt === undefined ? BOLT : opts.bolt;
  return [
    "override", "--repo", REPO, "--pr", String(PR_NUMBER), "--unit", UNIT, "--record", f.record,
    "--reason", "delivered via #2767 instead", "--superseded-by", supersededBy,
    ...(bolt === null ? [] : ["--bolt", bolt]),
  ];
};

describe("#3239 — a superseded unit's own pull request closes honestly", () => {
  test("override --superseded-by mints a superseded report with no GitHub call", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
    expect(body).toContain("- kind: superseded");
    expect(body).toContain(`- pull request: ${REPO}#${PR_NUMBER}`);
    expect(body).toContain(`- superseded by: ${f.deliveredSha}`);
    expect(body).toContain("- converged: false");
    expect(body).toContain("- human turn: aaaaaaaa-0000-0000-0000-000000003239");
    expect(body).toContain("- reason: delivered via #2767 instead");
    expect(body).toContain("## CLI Attestation");
  });

  test("the blocking sensor accepts the same report at code-generation AND pr-convergence", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.exitCode).toBe(0);

    const atCodeGen = evaluateReportFormat(reportPathFor(f.record, UNIT), "code-generation");
    expect(atCodeGen.findings).toEqual([]);
    expect(atCodeGen.pass).toBe(true);
    expect(atCodeGen.reason).toBe("superseded");

    const atConvergence = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(atConvergence.pass).toBe(true);
  });

  test("a unit that already has a created epoch is superseded in place, no `create` required first", async () => {
    const f = makeFixture();
    // A created report the unit minted before the supersede was detected —
    // the exact case #3239's own evidence trail showed was ALSO possible. Its
    // attested PR head is necessarily stale (nothing here answers for it any
    // more), which is exactly the changed-head path `lifecycleAtChangedHead`
    // must let a superseded record through regardless.
    const payload = [
      "# PR Convergence Report", "", "- kind: created",
      `- pull request: ${REPO}#${PR_NUMBER}`, "- generated at: 2026-08-09T22:54:09Z", "- converged: false", "",
    ].join("\n");
    const unsigned = {
      intent: "supersede", intentUuid: UUID, record: `amadeus/spaces/default/intents/${RECORD_DIR}/`,
      bolt: BOLT, unit: UNIT, repo: REPO, pr: PR_NUMBER,
      localHead: "b".repeat(40), remoteHead: "b".repeat(40), prHead: "b".repeat(40),
      contentDigest: reportPayloadDigest(payload),
    };
    const body = `${payload}${renderAttestation({ id: attestationId(unsigned), ...unsigned })}`;
    mkdirSync(join(f.record, "construction", UNIT, "code-generation"), { recursive: true });
    writeFileSync(reportPathFor(f.record, UNIT), body, "utf-8");

    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toContain("- kind: superseded");
  });

  test("falling proof: a commit that never reached the trunk refuses the record", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.unreachableSha), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("supersede refused");
    expect(out.stderr).toContain("not an ancestor");
  });

  test("falling proof: no HUMAN_TURN in the record refuses the record", async () => {
    const f = makeFixture({ humanTurn: false });
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("no HUMAN_TURN found");
  });

  test("falling proof: --bolt is required with --superseded-by", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.deliveredSha, { bolt: null }), seams(f));
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--bolt");
  });

  test("falling proof: --superseded-by must be a full commit object id, not a PR reference", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, "#2767"), seams(f));
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("--superseded-by must be a full commit object id");
  });

  test("falling proof: --superseded-by is refused outside self-* records", async () => {
    const f = makeFixture({ scope: "poc" });
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("only meaningful for self-* records");
  });

  test("falling proof: a superseded report claiming convergence is a sensor finding", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.exitCode).toBe(0);
    const path = reportPathFor(f.record, UNIT);
    const forged = readFileSync(path, "utf-8").replace("- converged: false", "- converged: true");
    writeFileSync(path, forged, "utf-8");
    const result = evaluateReportFormat(path, "code-generation");
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.field)).toContain("converged");
  });

  test("falling proof: a superseded report missing its 'superseded by' fact is a sensor finding", async () => {
    const f = makeFixture();
    const out = await runCli(overrideArgs(f, f.deliveredSha), seams(f));
    expect(out.exitCode).toBe(0);
    const path = reportPathFor(f.record, UNIT);
    const forged = readFileSync(path, "utf-8").replace(/^- superseded by: .*\n/m, "");
    writeFileSync(path, forged, "utf-8");
    const result = evaluateReportFormat(path, "code-generation");
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.field)).toContain("superseded by");
  });
});
