// covers: file:plugins/github-pr-convergence/tools/pr-convergence-cli.ts,
//         file:plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts,
//         file:plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts,
//         file:plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
// size: medium
//
// #3110 — finalising a MERGED self delivery whose `created` attestation went
// stale. #3062 covered the merge that landed on the SAME head; the defect this
// file pins is the other axis: the head advanced after `create` (a record
// checkpoint, a review fix, any push at all) and only then did the queue merge
// it. Both axes must be seeded at once, which is why neither existing fixture
// could be reused — t3062 pins one head constant, t541 stays OPEN.
//
// The pull request boundary therefore answers with TWO head values over time
// (the created epoch's head at `create`, the merged head at `report`), and the
// `pr list` seam carries the real `--state` semantics: a merged pull request is
// invisible to `--state open` and visible to `--state merged`.
//
// The git boundary is REAL where the evidence is: `origin` is a bare
// repository that publishes `refs/pull/<n>/head`, the conductor's checkout
// never holds the pull request's commits until the fetch brings them, and the
// ancestry answer comes from `git merge-base --is-ancestor` on those objects.
// Only the cheap local queries are scripted.

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
import {
  ATTESTATION_EVENT,
  attestationId,
  parseAttestation,
  renderAttestation,
  type ReportAttestation,
  reportPayload,
  reportPayloadDigest,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-attestation.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const BRANCH = "bolt/3110";
const UUID = "uuid-3110";
const UNIT = "stale-epoch-landed";
const BOLT = "delivery";
const REPO = "amadeus-dlc/amadeus";
const PR_NUMBER = 3110;
const MERGED_AT = "2026-08-15T09:00:00Z";
const MERGE_COMMIT = "1234567890abcdef1234567890abcdef12345678";
const RECORD_DIR = "260815-stale-epoch-landed";
const PROVENANCE = {
  title: `[stale-epoch/${BOLT}/${UNIT}] fix: finalise a stale created epoch`,
  body:
    "## Summary\n\nIssue 3110.\n\n## Amadeus Work\n\n" +
    `- Intent: \`stale-epoch\`\n- Bolt: \`${BOLT}\`\n- Unit: \`${UNIT}\`\n` +
    `- Record: \`amadeus/spaces/default/intents/${RECORD_DIR}/\`\n- UUID: \`${UUID}\`\n`,
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
  readonly work: string;
  readonly record: string;
  readonly bodyFile: string;
  /** The head the created epoch was attested at. */
  readonly oldHead: string;
  /** The head the pull request merged, one push later. */
  readonly newHead: string;
  /** A commit that exists only in the conductor's checkout — never an ancestor
   *  of the merged head. */
  readonly localOnly: string;
  readonly calls: string[];
  /** Which pull request the verbs name. A number with no `refs/pull/<n>/head`
   *  on the remote makes the ancestry fetch fail for real. */
  prNumber: number;
  /** What `create` reports as the local HEAD — the head the epoch attests. */
  attested: string;
  /** Flips the scripted pull request from OPEN to MERGED. */
  merged: boolean;
  /** The merge queue deleted the head branch and the checkout moved off it. */
  branchGone: boolean;
  /** The pull-request list answers with something that is not a list. */
  listBroken: boolean;
  /** The boundary returns the same row whatever `--state` asked for. */
  listIgnoresState: boolean;
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

function seedRecord(work: string): string {
  const intents = join(work, "amadeus", "spaces", "default", "intents");
  const record = join(intents, RECORD_DIR);
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      { slug: "stale-epoch", uuid: UUID, dirName: RECORD_DIR, status: "in-flight" },
    ])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  seedDeliveryAuthority(record);
  writeFileSync(
    join(record, "audit", "human.jsonl"),
    `${JSON.stringify({
      eventId: "aaaaaaaa-0000-0000-0000-00000000f110",
      seq: 1,
      timestamp: "2026-08-15T08:00:00Z",
      attributes: { Event: "HUMAN_TURN" },
    })}\n`,
    "utf-8",
  );
  return record;
}

/**
 * Three real repositories: the bare `origin` that publishes
 * `refs/pull/<n>/head`, the `pusher` clone that built the pull request's two
 * commits, and the conductor's `work` checkout — which holds the record and
 * has never seen either of those commits.
 */
function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-3110-"));
  roots.push(root);
  const origin = join(root, "origin.git");
  const work = join(root, "work");
  const pusher = join(root, "pusher");
  git(["init", "--quiet", "--bare", "--initial-branch=main", origin], root);

  mkdirSync(work, { recursive: true });
  git(["init", "--quiet", "--initial-branch=main"], work);
  git(["config", "user.email", "t3110@example.invalid"], work);
  git(["config", "user.name", "t3110"], work);
  const record = seedRecord(work);
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "seed"], work);
  git(["remote", "add", "origin", origin], work);
  git(["push", "--quiet", "origin", "main"], work);
  // The conductor's checkout moves on after the delivery branch is published.
  writeFileSync(join(work, "conductor.md"), "moved on\n", "utf-8");
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "conductor moves on"], work);
  const localOnly = git(["rev-parse", "HEAD"], work);

  git(["clone", "--quiet", origin, pusher], root);
  git(["config", "user.email", "t3110@example.invalid"], pusher);
  git(["config", "user.name", "t3110"], pusher);
  git(["checkout", "--quiet", "-b", BRANCH], pusher);
  writeFileSync(join(pusher, "unit.ts"), "export const unit = 1;\n", "utf-8");
  git(["add", "-A"], pusher);
  git(["commit", "--quiet", "-m", "implement the unit"], pusher);
  const oldHead = git(["rev-parse", "HEAD"], pusher);
  writeFileSync(join(pusher, "checkpoint.md"), "record checkpoint\n", "utf-8");
  git(["add", "-A"], pusher);
  git(["commit", "--quiet", "-m", "record checkpoint"], pusher);
  const newHead = git(["rev-parse", "HEAD"], pusher);
  git(["push", "--quiet", "origin", BRANCH], pusher);
  // What GitHub keeps after a merge, branch deletion or not.
  git(["update-ref", `refs/pull/${PR_NUMBER}/head`, newHead], origin);

  const bodyFile = join(root, "body.md");
  writeFileSync(bodyFile, "## Summary\n\nIssue 3110.\n", "utf-8");
  return {
    root, work, record, bodyFile, oldHead, newHead, localOnly,
    calls: [], prNumber: PR_NUMBER, attested: oldHead, merged: false, branchGone: false,
    listBroken: false, listIgnoresState: false,
  };
}

/** Cheap local queries are scripted; the two commands that carry the ancestry
 *  evidence run against the real repositories. */
function gitSpawn(f: Fixture): GitSpawn {
  return (argv, cwd) => {
    const key = argv.slice(1).join(" ");
    if (key.startsWith("fetch ") || key.startsWith("merge-base ")) {
      const out = spawnSync(argv[0] as string, argv.slice(1), { cwd, encoding: "utf-8" });
      return { code: out.status ?? -1, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
    }
    const onBranch = !(f.merged && f.branchGone);
    const table: Record<string, { code: number; stdout: string }> = {
      "rev-parse --show-toplevel": { code: 0, stdout: `${f.work}\n` },
      "branch --show-current": { code: 0, stdout: `${onBranch ? BRANCH : "main"}\n` },
      "rev-parse HEAD": { code: 0, stdout: `${f.merged ? f.newHead : f.attested}\n` },
      "rev-parse --show-prefix": {
        code: 0,
        stdout: `amadeus/spaces/default/intents/${RECORD_DIR}/\n`,
      },
      "diff --name-only main...HEAD": { code: 0, stdout: "plugins/github-pr-convergence/tool.ts\n" },
      "status --porcelain --untracked-files=no": { code: 0, stdout: "" },
      [`ls-remote --exit-code --heads origin refs/heads/${BRANCH}`]: f.branchGone && f.merged
        ? { code: 2, stdout: "" }
        : { code: 0, stdout: `${f.merged ? f.newHead : f.attested}\trefs/heads/${BRANCH}\n` },
    };
    return { ...(table[key] ?? { code: 1, stdout: "" }), stderr: "" };
  };
}

const ok = (stdout: string): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

function prSummary(f: Fixture, head: string): string {
  return JSON.stringify([{
    number: f.prNumber,
    url: `https://github.com/${REPO}/pull/${f.prNumber}`,
    headRefName: BRANCH,
    headRefOid: head,
    state: f.merged ? "MERGED" : "OPEN",
    ...PROVENANCE,
  }]);
}

function ghSpawn(f: Fixture): GhSpawn {
  return async (argv) => {
    const text = argv.join(" ");
    f.calls.push(text);
    if (text.includes("--version")) return ok("gh version 2.97.0");
    if (text.includes("auth status")) return ok("Logged in");
    const head = f.merged ? f.newHead : f.attested;
    if (text.includes("pr create")) {
      return ok(`https://github.com/${REPO}/pull/${f.prNumber}\n`);
    }
    if (text.includes("pr list")) {
      if (f.listBroken) return ok("{}");
      // The real `--state` semantics: a merged pull request is not an open one.
      const state = argv[argv.indexOf("--state") + 1];
      const visible = f.listIgnoresState || (state === "merged" ? f.merged : state === "open" && !f.merged);
      return ok(visible ? prSummary(f, head) : "[]");
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
              headRefOid: head,
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
    now: () => "2026-08-15T10:00:00Z",
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
  "--title", "fix: finalise a stale created epoch", "--body-file", f.bodyFile,
  "--record", f.record, "--bolt", BOLT, "--unit", UNIT,
];

const verbArgs = (verb: string, f: Fixture) => [
  verb, "--repo", REPO, "--pr", String(f.prNumber), "--unit", UNIT, "--record", f.record,
];

/** The delivery as it stands after `create`: a `created` epoch attested at the
 *  head of the moment, pull request still open. */
async function delivered(setup: (f: Fixture) => void = () => undefined): Promise<Fixture> {
  const f = makeFixture();
  setup(f);
  const created = await runCli(createArgs(f), seams(f));
  expect(created.stderr).toBe("");
  expect(created.exitCode).toBe(0);
  const body = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
  expect(body).toContain("- kind: created");
  expect(body).toContain(`- pr head: ${f.attested}`);
  return f;
}

/** The two axes at once: the head advanced past the created epoch, and only
 *  then did the queue merge it. */
async function staleAndMerged(setup: (f: Fixture) => void = () => undefined): Promise<Fixture> {
  const f = await delivered(setup);
  f.merged = true;
  return f;
}

describe("#3110 — a stale created epoch finalises as landed on the merged head", () => {
  test("report finalises the landed record bound to the merge facts", async () => {
    const f = await staleAndMerged();

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
    expect(body).toContain("- kind: landed");
    expect(body).toContain(`- merged at: ${MERGED_AT}`);
    expect(body).toContain(`- merge commit: ${MERGE_COMMIT}`);
    // The epoch closes on the head the pull request merged, not on the head it
    // was attested at.
    expect(body).toContain(`- pr head: ${f.newHead}`);
    expect(body).not.toContain(f.oldHead);
  });

  test("the merge queue having deleted the head branch does not block the record", async () => {
    const f = await staleAndMerged();
    f.branchGone = true;

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toContain("- kind: landed");
    // The ancestry came from the pull request's own ref, never from the branch
    // the queue removed.
    expect(f.calls.some((call) => call.includes("ls-remote"))).toBe(false);
  });

  test("the blocking sensor accepts the landed record the merged arm wrote", async () => {
    const f = await staleAndMerged();
    f.branchGone = true;
    expect((await runCli(verbArgs("report", f), seams(f))).exitCode).toBe(0);
    // The conductor's checkout is on its own commit, not on the merged head:
    // the record answers for the merge, not for a checkout.
    expect(git(["rev-parse", "HEAD"], f.work)).toBe(f.localOnly);

    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("landed");
  });
});

/**
 * Rewrites a report the way a forger who knows the algorithm would: the payload
 * and the receipt are both re-derived and the audit gains the matching receipt
 * line, so the digest, the receipt id and the audit carriage all agree. What
 * such a rewrite cannot repair is a binding the sensor checks between the two.
 */
function reattest(
  f: Fixture,
  mutate: (
    payload: string,
    receipt: ReportAttestation,
  ) => { readonly payload: string; readonly receipt: Omit<ReportAttestation, "id" | "contentDigest"> },
): void {
  const path = reportPathFor(f.record, UNIT);
  const body = readFileSync(path, "utf-8");
  const current = parseAttestation(body);
  if (current === null) throw new Error("fixture report carries no attestation");
  const next = mutate(reportPayload(body), current);
  const { id: _signature, contentDigest: _digest, ...fields } = next.receipt as ReportAttestation;
  const unsigned = { ...fields, contentDigest: reportPayloadDigest(next.payload) };
  const receipt: ReportAttestation = { id: attestationId(unsigned), ...unsigned };
  writeFileSync(path, `${next.payload}${renderAttestation(receipt)}`, "utf-8");
  writeFileSync(
    join(f.record, "audit", "attestation.jsonl"),
    `${JSON.stringify({ attributes: { Event: ATTESTATION_EVENT, "Attestation Id": receipt.id } })}\n`,
    { flag: "a" },
  );
}

function findingFields(path: string, stage: string): string[] {
  return evaluateReportFormat(path, stage).findings.map((finding) => finding.field);
}

describe("#3110 — a landed record answers for its merge, and only for it", () => {
  const OTHER_COMMIT = "fedcba9876543210fedcba9876543210fedcba98";

  test("a merge commit edited in the record is refused", async () => {
    const f = await staleAndMerged();
    expect((await runCli(verbArgs("report", f), seams(f))).exitCode).toBe(0);
    const path = reportPathFor(f.record, UNIT);
    writeFileSync(path, readFileSync(path, "utf-8").replace(MERGE_COMMIT, OTHER_COMMIT), "utf-8");

    const result = evaluateReportFormat(path, "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  test("a merge instant edited in the record is refused", async () => {
    const f = await staleAndMerged();
    expect((await runCli(verbArgs("report", f), seams(f))).exitCode).toBe(0);
    const path = reportPathFor(f.record, UNIT);
    writeFileSync(path, readFileSync(path, "utf-8").replace(MERGED_AT, "2026-08-15T23:59:00Z"), "utf-8");

    const result = evaluateReportFormat(path, "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  test("a re-derived record whose merge commit no longer matches its receipt is refused", async () => {
    // Digest, receipt id and audit carriage all agree here: the merge binding
    // is the only check left standing between the record and the merge it
    // claims.
    const f = await staleAndMerged();
    expect((await runCli(verbArgs("report", f), seams(f))).exitCode).toBe(0);
    const path = reportPathFor(f.record, UNIT);
    reattest(f, (payload, receipt) => ({
      payload: payload.replace(MERGE_COMMIT, OTHER_COMMIT),
      receipt,
    }));

    expect(findingFields(path, "pr-convergence")).toEqual(["merge commit"]);
  });

  test("a record that is not landed may not attest merge facts", async () => {
    // Merge facts must not be smuggled into a live record: they would let it
    // claim a binding it does not have while the checkout binding still applies.
    const f = await delivered();
    const path = reportPathFor(f.record, UNIT);
    const before = evaluateReportFormat(path, "code-generation").findings;
    reattest(f, (payload, receipt) => ({
      payload,
      receipt: { ...receipt, mergeCommit: MERGE_COMMIT, mergedAt: MERGED_AT },
    }));

    const after = evaluateReportFormat(path, "code-generation");
    expect(after.pass).toBe(false);
    expect(after.findings.filter((finding) => !before.some((was) => was.field === finding.field)))
      .toEqual([{ field: "attestation", reason: "only a landed record attests merge facts" }]);
  });
});

describe("#3109 — create refuses a head whose pull request already merged", () => {
  test("no second pull request is opened, and the refusal names the finalisation path", async () => {
    const f = await staleAndMerged();
    const before = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
    f.calls.length = 0;

    const out = await runCli(createArgs(f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain(`#${f.prNumber}`);
    expect(out.stderr).toContain("merged");
    expect(out.stderr).toContain("report");
    expect(f.calls.some((call) => call.includes("pr create"))).toBe(false);
    expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toBe(before);
  });

  test("a merged-list answer that cannot be read stops the create loudly", async () => {
    const f = await staleAndMerged();
    f.listBroken = true;
    f.calls.length = 0;

    const out = await runCli(createArgs(f), seams(f));
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toContain("could not be read");
    expect(f.calls.some((call) => call.includes("pr create"))).toBe(false);
  });

  test("a row that does not declare MERGED is not evidence of a merge", async () => {
    // The refusal reads the pull request's own state, never the query filter:
    // a boundary that answers every filter with the same open row must not
    // refuse a delivery that has not merged.
    const f = await delivered();
    f.attested = f.newHead;
    f.listIgnoresState = true;

    const out = await runCli(createArgs(f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
  });

  test("an open pull request on the same head still re-mints the created epoch", async () => {
    // The merged read-back must not swallow the ordinary resume path: the same
    // head, still open, keeps opening a new created epoch on the same PR.
    const f = await delivered();
    f.attested = f.newHead;

    const out = await runCli(createArgs(f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = readFileSync(reportPathFor(f.record, UNIT), "utf-8");
    expect(body).toContain("- kind: created");
    expect(body).toContain(`- pr head: ${f.newHead}`);
  });
});

describe("#3110 — an ancestry that cannot be measured is never assumed", () => {
  test("an epoch attested on a commit the merge never carried is refused", async () => {
    // The conductor's own commit: a real object, present locally, and no part
    // of what the pull request merged.
    const f = await staleAndMerged((fixture) => {
      fixture.attested = fixture.localOnly;
    });
    const before = readFileSync(reportPathFor(f.record, UNIT), "utf-8");

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("is not an ancestor of the merged head");
    expect(out.stderr).toContain(f.newHead);
    // Fail-closed: the refusal never rewrites the evidence it refused.
    expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toBe(before);
  });

  test("a pull request ref that cannot be fetched fails loudly, with no second source", async () => {
    const f = await staleAndMerged((fixture) => {
      fixture.prNumber = PR_NUMBER + 1; // no refs/pull/<n>/head published for it
    });
    const before = readFileSync(reportPathFor(f.record, UNIT), "utf-8");

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain(`cannot fetch refs/pull/${f.prNumber}/head`);
    expect(readFileSync(reportPathFor(f.record, UNIT), "utf-8")).toBe(before);
  });
});
