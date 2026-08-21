// covers: file:plugins/github-pr-convergence/tools/pr-convergence-cli.ts,
//         file:plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts,
//         file:plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
// size: medium
//
// #3149 — the two dead ends a merged self delivery used to fall into.
//
//   Class A: the loop reached `converged`, the pull request merged, and the
//     conductor's checkout moved on. The report is final (`converged` never
//     transitions), so nothing could re-mint it — while the sensor bound every
//     non-`landed` record to the live checkout and went red on the head that
//     had moved. ADR-3 unties the knot from the sensor side: the binding is
//     chosen by what the receipt attests, and the merged arm re-attests the
//     record in place against the merge it measured.
//
//   Class B: the `created` epoch is not an ancestor of the head that merged
//     (a rebase orphaned it). No machine evidence can close it — measured on
//     three real cases, none of which was patch-equivalent — so ADR-4 gives it
//     a human-presence override in the merged arm instead, carrying the
//     measured ancestry failure verbatim into the record.
//
// The git boundary is REAL where the evidence is: `origin` is a bare repository
// that publishes `refs/pull/<n>/head`, and the sensor's checkout probe runs
// against the conductor's actual repository. Only the cheap local queries the
// CLI makes are scripted.

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
} from "../../plugins/github-pr-convergence/tools/pr-convergence-attestation.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const BRANCH = "bolt/3149";
const UUID = "uuid-3149";
const UNIT = "prc-finalization";
const BOLT = "delivery";
const REPO = "amadeus-dlc/amadeus";
const PR_NUMBER = 3149;
const SIBLING_PR_NUMBER = 3150;
const MERGED_AT = "2026-08-17T09:00:00Z";
const MERGE_COMMIT = "abcdef0123456789abcdef0123456789abcdef01";
const RECORD_DIR = "260816-priority-bug-batch-3";
const HUMAN_TURN_ID = "aaaaaaaa-0000-0000-0000-0000000031f9";

function provenance(units: readonly string[]): { title: string; body: string } {
  return {
    title: `[pbb3/${BOLT}/${units.join("+")}] fix: finalise a merged delivery`,
    body:
      "## Summary\n\nIssue 3149.\n\n## Amadeus Work\n\n" +
      `- Intent: \`pbb3\`\n- Bolt: \`${BOLT}\`\n- Unit: \`${units.join(",")}\`\n` +
      `- Record: \`amadeus/spaces/default/intents/${RECORD_DIR}/\`\n- UUID: \`${UUID}\`\n`,
  };
}

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
  /** The head the delivery branch was published at. */
  readonly branchHead: string;
  /** A commit on the delivery branch, one push after `branchHead`. */
  readonly advancedHead: string;
  /** A commit that never reached the pull request — the orphaned epoch. */
  readonly orphanHead: string;
  readonly calls: string[];
  /** What the CLI's scripted git reports as the local HEAD. */
  attested: string;
  /** The head the pull request carries (and, once merged, the head it merged). */
  prHead: string;
  merged: boolean;
  /** The commit the pull request merged as. Rewritable so a record can be met
   *  with a merge that is not the one it was finalised against. */
  mergeCommit: string;
  /** The merge queue deleted the head branch and the checkout moved off it. */
  branchGone: boolean;
  dirty: boolean;
  siblingMerged: boolean;
  siblingStateReadable: boolean;
  readonly units: readonly string[];
}

function seedDeliveryAuthority(record: string, units: readonly string[]): void {
  const plan = `## Bolt ${BOLT}\n\n- **Units:** ${units.map((unit) => `\`${unit}\``).join(", ")}\n`;
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

function seedRecord(work: string, units: readonly string[]): string {
  const intents = join(work, "amadeus", "spaces", "default", "intents");
  const record = join(intents, RECORD_DIR);
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{ slug: "pbb3", uuid: UUID, dirName: RECORD_DIR, status: "in-flight" }])}\n`,
    "utf-8",
  );
  writeFileSync(join(record, "amadeus-state.md"), "- **Scope**: self-fix\n", "utf-8");
  seedDeliveryAuthority(record, units);
  return record;
}

/** The human presence an override rules on. Written on demand so its absence
 *  can be pinned as its own refusal. */
function seedHumanTurn(record: string): void {
  writeFileSync(
    join(record, "audit", "human.jsonl"),
    `${JSON.stringify({
      eventId: HUMAN_TURN_ID,
      seq: 1,
      timestamp: "2026-08-17T08:00:00Z",
      attributes: { Event: "HUMAN_TURN" },
    })}\n`,
    "utf-8",
  );
}

/**
 * Two real repositories: the bare `origin` that publishes `refs/pull/<n>/head`,
 * and the conductor's `work` checkout, which holds the record, the delivery
 * branch, and the orphan commit. The sensor probes THIS repository's HEAD, so
 * the checkout moving on is a real move, not a scripted answer.
 */
function makeFixture(units: readonly string[] = [UNIT]): Fixture {
  const root = mkdtempSync(join(tmpdir(), "pr-convergence-3149-"));
  roots.push(root);
  const origin = join(root, "origin.git");
  const work = join(root, "work");
  git(["init", "--quiet", "--bare", "--initial-branch=main", origin], root);

  mkdirSync(work, { recursive: true });
  git(["init", "--quiet", "--initial-branch=main"], work);
  git(["config", "user.email", "t3149@example.invalid"], work);
  git(["config", "user.name", "t3149"], work);
  const record = seedRecord(work, units);
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "seed"], work);
  git(["remote", "add", "origin", origin], work);
  git(["push", "--quiet", "origin", "main"], work);

  git(["checkout", "--quiet", "-b", BRANCH], work);
  writeFileSync(join(work, "unit.ts"), "export const unit = 1;\n", "utf-8");
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "implement the unit"], work);
  const branchHead = git(["rev-parse", "HEAD"], work);
  git(["push", "--quiet", "origin", BRANCH], work);
  writeFileSync(join(work, "review-fix.ts"), "export const fixed = true;\n", "utf-8");
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "review fix"], work);
  const advancedHead = git(["rev-parse", "HEAD"], work);
  git(["push", "--quiet", "origin", BRANCH], work);
  git(["reset", "--hard", "--quiet", branchHead], work);

  // The rebase orphan: a real commit, on no branch the pull request carries.
  git(["checkout", "--quiet", "-b", "orphan"], work);
  writeFileSync(join(work, "orphan.ts"), "export const orphan = 1;\n", "utf-8");
  git(["add", "-A"], work);
  git(["commit", "--quiet", "-m", "orphaned by a rebase"], work);
  const orphanHead = git(["rev-parse", "HEAD"], work);
  git(["checkout", "--quiet", BRANCH], work);

  const bodyFile = join(root, "body.md");
  writeFileSync(bodyFile, "## Summary\n\nIssue 3149.\n", "utf-8");
  return {
    root, work, record, bodyFile, branchHead, advancedHead, orphanHead,
    calls: [], attested: branchHead, prHead: branchHead, merged: false,
    mergeCommit: MERGE_COMMIT, branchGone: false, dirty: false,
    siblingMerged: false, siblingStateReadable: true, units,
  };
}

/** Publishes what GitHub keeps for a merged pull request, and flips the
 *  fixture's boundary answers to MERGED. */
function merge(f: Fixture, at: string): void {
  git(["update-ref", `refs/pull/${PR_NUMBER}/head`, at], join(f.root, "origin.git"));
  f.prHead = at;
  f.merged = true;
}

function mergeSibling(f: Fixture): void {
  git(["update-ref", `refs/pull/${SIBLING_PR_NUMBER}/head`, f.prHead], join(f.root, "origin.git"));
  f.siblingMerged = true;
}

/** The conductor's checkout moves past the head the record was attested at. */
function moveCheckoutOn(f: Fixture): string {
  git(["commit", "--quiet", "--allow-empty", "-m", "record checkpoint"], f.work);
  return git(["rev-parse", "HEAD"], f.work);
}

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
      "rev-parse HEAD": { code: 0, stdout: `${f.attested}\n` },
      "rev-parse --show-prefix": {
        code: 0,
        stdout: `amadeus/spaces/default/intents/${RECORD_DIR}/\n`,
      },
      "diff --name-only main...HEAD": { code: 0, stdout: "plugins/github-pr-convergence/tool.ts\n" },
      "status --porcelain --untracked-files=no": {
        code: 0,
        stdout: f.dirty ? " M src/unrelated.ts\n" : "",
      },
      [`ls-remote --exit-code --heads origin refs/heads/${BRANCH}`]: f.branchGone && f.merged
        ? { code: 2, stdout: "" }
        : { code: 0, stdout: `${f.attested}\trefs/heads/${BRANCH}\n` },
    };
    const answer = table[key];
    // A silent exit-1 for an unscripted call would let a changed git sequence
    // fail somewhere later, as a refusal that looks like the behaviour under
    // test. Name the call instead.
    if (answer === undefined) throw new Error(`t3149 fixture: unscripted git call "git ${key}"`);
    return { ...answer, stderr: "" };
  };
}

const ok = (stdout: string): GhSpawnResult => ({ code: 0, stdout, stderr: "" });

function ghSpawn(f: Fixture): GhSpawn {
  return async (argv) => {
    const text = argv.join(" ");
    f.calls.push(text);
    if (text.includes("--version")) return ok("gh version 2.97.0");
    if (text.includes("auth status")) return ok("Logged in");
    if (text.includes("pr create")) return ok(`https://github.com/${REPO}/pull/${PR_NUMBER}\n`);
    if (text.includes("pr list")) {
      const state = argv[argv.indexOf("--state") + 1];
      const visible = state === "merged" ? f.merged : state === "open" && !f.merged;
      return ok(visible
        ? JSON.stringify([{
            number: PR_NUMBER,
            url: `https://github.com/${REPO}/pull/${PR_NUMBER}`,
            headRefName: BRANCH,
            headRefOid: f.prHead,
            state: f.merged ? "MERGED" : "OPEN",
            ...provenance(f.units),
          }])
        : "[]");
    }
    if (text.includes("reviewThreads")) {
      return ok(JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
            },
          },
        },
      }));
    }
    const sibling = text.includes(`number=${SIBLING_PR_NUMBER}`);
    if (sibling && !f.siblingStateReadable) return { code: 2, stdout: "", stderr: "sibling PR state unavailable" };
    const merged = sibling ? f.siblingMerged : f.merged;
    const lifecycle = merged
      ? {
          state: "MERGED",
          mergedAt: MERGED_AT,
          mergeCommit: { oid: f.mergeCommit, statusCheckRollup: { state: "SUCCESS" } },
        }
      : { state: "OPEN", mergedAt: null, mergeCommit: null };
    return ok(JSON.stringify({
      data: {
        repository: {
          pullRequest: {
            mergeable: "MERGEABLE",
            mergeStateStatus: "CLEAN",
            headRefOid: f.prHead,
            headRefName: BRANCH,
            ...provenance(f.units),
            ...lifecycle,
          },
        },
      },
    }));
  };
}

function seams(f: Fixture): CliSeams {
  return {
    ghSpawn: ghSpawn(f),
    gitSpawn: gitSpawn(f),
    sleep: async () => undefined,
    now: () => "2026-08-17T10:00:00Z",
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
  "--title", "fix: finalise a merged delivery", "--body-file", f.bodyFile,
  "--record", f.record, "--bolt", BOLT, "--unit", UNIT,
];

const verbArgs = (verb: string, f: Fixture, extra: readonly string[] = []) => [
  verb, "--repo", REPO, "--pr", String(PR_NUMBER), "--unit", UNIT, "--record", f.record, ...extra,
];

const reportBody = (f: Fixture) => readFileSync(reportPathFor(f.record, UNIT), "utf-8");

/** Points every open-pull-request answer at one head: what the CLI sees as the
 *  local HEAD, what origin publishes for the branch, and what the pull request
 *  carries. Everything the `create`/`report` prerequisites compare. */
function deliverFrom(f: Fixture, head: string): void {
  f.attested = head;
  f.prHead = head;
}

/** The head an orphaned epoch is delivered from: a real commit the pull
 *  request never carried. */
const fromOrphan = (f: Fixture): string => f.orphanHead;

/** A delivery whose loop reached `converged` while the pull request was open. */
async function converged(head?: (f: Fixture) => string): Promise<Fixture> {
  const f = makeFixture();
  if (head !== undefined) deliverFrom(f, head(f));
  expect((await runCli(createArgs(f), seams(f))).exitCode).toBe(0);
  const out = await runCli(verbArgs("report", f), seams(f));
  expect(out.stderr).toBe("");
  expect(out.exitCode).toBe(0);
  expect(reportBody(f)).toContain("- kind: converged");
  return f;
}

/**
 * Rewrites one Unit's report the way a forger who knows the algorithm would:
 * payload, receipt and audit line are all re-derived, so digest, receipt id and
 * audit carriage agree. What it cannot repair is a binding checked between the
 * receipt and something outside it.
 */
function reattest(
  f: Fixture,
  unit: string,
  mutate: (receipt: ReportAttestation) => ReportAttestation,
): void {
  const path = reportPathFor(f.record, unit);
  const body = readFileSync(path, "utf-8");
  const current = parseAttestation(body);
  if (current === null) throw new Error("fixture report carries no attestation");
  const { id: _signature, ...fields } = mutate(current);
  const receipt: ReportAttestation = { id: attestationId(fields), ...fields };
  writeFileSync(path, `${reportPayload(body)}${renderAttestation(receipt)}`, "utf-8");
  writeFileSync(
    join(f.record, "audit", "attestation.jsonl"),
    `${JSON.stringify({ attributes: { Event: ATTESTATION_EVENT, "Attestation Id": receipt.id } })}\n`,
    { flag: "a" },
  );
}

/**
 * The state every class-A finalisation starts from: a converged delivery the
 * queue merged, the head branch deleted with it, and the conductor's checkout
 * moved past the head the verdict was attested at.
 */
async function mergedAndMovedOn(mergedHead: (f: Fixture) => string = (f) => f.branchHead): Promise<Fixture> {
  const f = await converged();
  merge(f, mergedHead(f));
  f.branchGone = true;
  expect(moveCheckoutOn(f)).not.toBe(f.branchHead);
  return f;
}

/** The same delivery once `report` has finalised its record in place. */
async function finalised(mergedHead?: (f: Fixture) => string): Promise<Fixture> {
  const f = await mergedAndMovedOn(mergedHead);
  const out = await runCli(verbArgs("report", f), seams(f));
  expect(out.stderr).toBe("");
  expect(out.exitCode).toBe(0);
  return f;
}

describe("#3149 class A — a converged record survives the merge and the checkout moving on", () => {
  test("the sensor accepts the converged record while the checkout still holds its head", async () => {
    // The baseline the class-A defect breaks: nothing here has moved yet.
    const f = await converged();

    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
  });

  test("report finalises the converged record in place against the merge it measured", async () => {
    const f = await mergedAndMovedOn();

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = reportBody(f);
    // `converged` is final: the merge is recorded by re-attesting the record,
    // never by rewriting it as another kind.
    expect(body).toContain("- kind: converged");
    expect(body).toContain("- converged: true");
    const receipt = parseAttestation(body);
    expect(receipt?.mergeCommit).toBe(MERGE_COMMIT);
    expect(receipt?.mergedAt).toBe(MERGED_AT);
    // The verdict still answers for the head it was measured at.
    expect(receipt?.prHead).toBe(f.branchHead);
  });

  test("the sensor accepts the finalised record though the checkout has moved on", async () => {
    const f = await finalised();
    // The record answers for the merge; the checkout it was written from is
    // somewhere else entirely.
    expect(git(["rev-parse", "HEAD"], f.work)).not.toBe(f.branchHead);

    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("converged");
  });

  test("a merge fact the receipt could not have measured does not buy the merge binding", async () => {
    // The binding follows the attested merge facts, so their shape is what
    // stands between "finalised against a merge" and "carries two strings".
    // A value gh could never have returned must not skip the checkout probe.
    const f = await finalised();
    const path = reportPathFor(f.record, UNIT);
    expect(evaluateReportFormat(path, "pr-convergence").findings).toEqual([]);

    reattest(f, UNIT, (receipt) => ({ ...receipt, mergeCommit: "not-a-commit" }));

    const result = evaluateReportFormat(path, "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      field: "merge commit",
      reason: 'attested value is malformed — not a commit object id "not-a-commit"',
    });
  });

  test("a merge instant that does not parse is refused the same way", async () => {
    const f = await finalised();
    const path = reportPathFor(f.record, UNIT);

    reattest(f, UNIT, (receipt) => ({ ...receipt, mergedAt: "whenever" }));

    const result = evaluateReportFormat(path, "pr-convergence");
    expect(result.pass).toBe(false);
    expect(result.findings).toContainEqual({
      field: "merged at",
      reason: 'attested value is malformed — unparseable timestamp "whenever"',
    });
  });

  test("the finalisation is idempotent: a second report rewrites nothing", async () => {
    const f = await finalised();
    const first = reportBody(f);

    const again = await runCli(verbArgs("report", f), seams(f));
    expect(again.stderr).toBe("");
    expect(again.exitCode).toBe(0);
    expect(reportBody(f)).toBe(first);
  });

  test("an epoch the merge carried by ancestry finalises in place, still converged", async () => {
    // The other axis: the branch advanced after the verdict, and the queue
    // merged the later head. `refs/pull/<n>/head` proves the epoch reached it.
    const f = await finalised((fixture) => fixture.advancedHead);

    const body = reportBody(f);
    expect(body).toContain("- kind: converged");
    const receipt = parseAttestation(body);
    expect(receipt?.mergeCommit).toBe(MERGE_COMMIT);
    expect(receipt?.prHead).toBe(f.branchHead);
    expect(evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence").pass).toBe(true);
  });

  test("a record already bound to another merge is refused rather than re-bound", async () => {
    // The finalisation names one merge. Meeting the same record with a second
    // one is a boundary that changed its answer, and re-binding would rewrite
    // evidence rather than record it.
    const f = await finalised();
    const before = reportBody(f);
    f.mergeCommit = "9".repeat(40);

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("already bound to a different merge");
    expect(reportBody(f)).toBe(before);
  });

  test("an epoch the merge never carried is refused, and the record is untouched", async () => {
    // The evidence bar is the landed arm's, not a weaker one: no ancestry, no
    // in-place finalisation.
    const f = await converged(fromOrphan);
    merge(f, f.branchHead);
    const before = reportBody(f);

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("is not an ancestor of the merged head");
    expect(reportBody(f)).toBe(before);
  });
});

describe("#3149 — the in-place finalisation answers for each member Unit separately", () => {
  // Sorts after UNIT, so the owner is finalised first and the member's own
  // refusals are what this block measures.
  const SECOND = "second-unit";
  const MEMBERS = `${UNIT},${SECOND}`;

  const memberArgs = (verb: string, f: Fixture) => [...verbArgs(verb, f), "--units", MEMBERS];
  const memberBody = (f: Fixture) => readFileSync(reportPathFor(f.record, SECOND), "utf-8");

  /** A two-Unit delivery whose loop converged, then merged on its own head. */
  async function convergedPair(): Promise<Fixture> {
    const f = makeFixture([UNIT, SECOND]);
    expect((await runCli([...createArgs(f), "--units", MEMBERS], seams(f))).exitCode).toBe(0);
    const out = await runCli(memberArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    for (const unit of [UNIT, SECOND]) {
      expect(readFileSync(reportPathFor(f.record, unit), "utf-8")).toContain("- kind: converged");
    }
    merge(f, f.branchHead);
    return f;
  }

  test("both member Units are finalised in place by the one run", async () => {
    const f = await convergedPair();
    moveCheckoutOn(f);

    const out = await runCli(memberArgs("report", f), seams(f));
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    for (const unit of [UNIT, SECOND]) {
      const body = readFileSync(reportPathFor(f.record, unit), "utf-8");
      expect(body).toContain("- kind: converged");
      // The multi-Unit projection is payload, so re-attesting leaves it intact.
      expect(body).toContain("## Owner Projection");
      expect(parseAttestation(body)?.mergeCommit).toBe(MERGE_COMMIT);
      expect(evaluateReportFormat(reportPathFor(f.record, unit), "pr-convergence").pass).toBe(true);
    }
  });

  test("finalises only the current PR member and skips a sibling bound to another merged PR", async () => {
    const f = await convergedPair();
    reattest(f, SECOND, (receipt) => ({ ...receipt, pr: SIBLING_PR_NUMBER }));
    merge(f, f.branchHead);
    mergeSibling(f);
    f.branchGone = true;
    moveCheckoutOn(f);

    const out = await runCli(memberArgs("report", f), seams(f));

    expect(out.exitCode).toBe(0);
    expect(out.stderr).toBe("");
    expect(out.stdout).toContain(`skipped sibling unit ${SECOND}: receipt is bound to PR #${SIBLING_PR_NUMBER}, which is MERGED`);
    expect(parseAttestation(readFileSync(reportPathFor(f.record, UNIT), "utf-8"))?.mergeCommit).toBe(MERGE_COMMIT);
    expect(parseAttestation(memberBody(f))?.mergeCommit).toBeUndefined();
  });

  test("refuses an intact sibling receipt when its other PR is not verifiably merged", async () => {
    const f = await convergedPair();
    reattest(f, SECOND, (receipt) => ({ ...receipt, pr: SIBLING_PR_NUMBER }));
    merge(f, f.branchHead);
    f.branchGone = true;
    moveCheckoutOn(f);
    const before = memberBody(f);

    const out = await runCli(memberArgs("report", f), seams(f));

    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain(`sibling unit ${SECOND} receipt is bound to PR #${SIBLING_PR_NUMBER}`);
    expect(out.stderr).toContain("not verifiably MERGED");
    expect(memberBody(f)).toBe(before);
  });

  test("refuses when the sibling PR state cannot be read", async () => {
    const f = await convergedPair();
    reattest(f, SECOND, (receipt) => ({ ...receipt, pr: SIBLING_PR_NUMBER }));
    merge(f, f.branchHead);
    f.siblingStateReadable = false;
    f.branchGone = true;
    moveCheckoutOn(f);

    const out = await runCli(memberArgs("report", f), seams(f));

    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain(`sibling unit ${SECOND} receipt is bound to PR #${SIBLING_PR_NUMBER}`);
    expect(out.stderr).toContain("GitHub state could not be read");
  });

  test("a member Unit with no record on disk is refused, not invented", async () => {
    const f = await convergedPair();
    rmSync(reportPathFor(f.record, SECOND));

    const out = await runCli(memberArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain(`${SECOND} carries no final record for this merge to close`);
  });

  test("a member Unit whose bytes moved under its receipt is refused", async () => {
    const f = await convergedPair();
    const path = reportPathFor(f.record, SECOND);
    const original = memberBody(f);
    const tampered = original.replace(
      "- generated at: 2026-08-17T10:00:00Z",
      "- generated at: 2026-08-17T23:59:00Z",
    );
    // A replace that matched nothing would leave the record intact and test the
    // happy path under a name that promises otherwise.
    expect(tampered).not.toBe(original);
    writeFileSync(path, tampered, "utf-8");

    const out = await runCli(memberArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("report attestation is missing, tampered, copied, or replayed");
    expect(memberBody(f)).toBe(tampered);
  });

  test("a member Unit attested at a head the proof never measured is refused", async () => {
    // The receipt here is internally perfect — re-derived id, matching digest,
    // matching audit line. It just answers for a head nothing put to git.
    const f = await convergedPair();
    reattest(f, SECOND, (receipt) => ({
      ...receipt,
      localHead: f.orphanHead,
      remoteHead: f.orphanHead,
      prHead: f.orphanHead,
    }));
    const before = memberBody(f);

    const out = await runCli(memberArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("report lifecycle stale: PR head changed");
    expect(memberBody(f)).toBe(before);
  });
});

describe("#3149 class B — an orphaned epoch closes on human presence, never on a machine claim", () => {
  /** A `created` epoch attested on a commit the pull request never carried. */
  async function orphaned(): Promise<Fixture> {
    const f = makeFixture();
    deliverFrom(f, f.orphanHead);
    const created = await runCli(createArgs(f), seams(f));
    expect(created.stderr).toBe("");
    expect(created.exitCode).toBe(0);
    expect(reportBody(f)).toContain("- kind: created");
    merge(f, f.branchHead);
    f.branchGone = true;
    return f;
  }

  test("report still refuses it: the ancestry is measured and it does not hold", async () => {
    const f = await orphaned();
    const before = reportBody(f);

    const out = await runCli(verbArgs("report", f), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("is not an ancestor of the merged head");
    expect(reportBody(f)).toBe(before);
  });

  test("override finalises it, recording the measured ancestry failure verbatim", async () => {
    const f = await orphaned();
    seedHumanTurn(f.record);

    const out = await runCli(
      verbArgs("override", f, ["--reason", "record recovered by hand after a rebase"]),
      seams(f),
    );
    expect(out.stderr).toBe("");
    expect(out.exitCode).toBe(0);
    const body = reportBody(f);
    expect(body).toContain("- kind: override");
    expect(body).toContain(`- human turn: ${HUMAN_TURN_ID}`);
    expect(body).toContain("record recovered by hand after a rebase");
    // Re-derivable: both measured SHAs are in the reason the record carries.
    expect(body).toContain(f.orphanHead);
    expect(body).toContain(f.branchHead);
    expect(body).toContain("is not an ancestor of the merged head");
    // The ruling is bound to the merge, so the sensor asks the merge, not the
    // checkout the queue left behind.
    const receipt = parseAttestation(body);
    expect(receipt?.mergeCommit).toBe(MERGE_COMMIT);
    expect(receipt?.mergedAt).toBe(MERGED_AT);
    const result = evaluateReportFormat(reportPathFor(f.record, UNIT), "pr-convergence");
    expect(result.findings).toEqual([]);
    expect(result.pass).toBe(true);
  });

  test("without human presence the override is refused, and it names what was measured", async () => {
    const f = await orphaned();
    const before = reportBody(f);

    const out = await runCli(verbArgs("override", f, ["--reason", "no presence to rule on"]), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("no HUMAN_TURN");
    expect(out.stderr).toContain("is not an ancestor of the merged head");
    expect(reportBody(f)).toBe(before);
  });

  test("a provable epoch is sent back to report rather than ruled forward", async () => {
    // Human presence is the last resort, not a shortcut around evidence that
    // exists: an epoch the merge carried has a machine path and must take it.
    const f = makeFixture();
    expect((await runCli(createArgs(f), seams(f))).exitCode).toBe(0);
    merge(f, f.branchHead);
    f.branchGone = true;
    seedHumanTurn(f.record);
    const before = reportBody(f);

    const out = await runCli(verbArgs("override", f, ["--reason", "rule it forward"]), seams(f));
    expect(out.exitCode).toBe(1);
    // The verbatim redirect, not merely a refusal that happens to say "report":
    // every other refusal on this path would satisfy a looser match.
    expect(out.stderr).toBe(
      "override refused: the created epoch reached the merged head — run the report verb to finalise it\n",
    );
    expect(reportBody(f)).toBe(before);
  });

  test("foreign uncommitted work blocks the merged override", async () => {
    const f = await orphaned();
    seedHumanTurn(f.record);
    f.dirty = true;
    const before = reportBody(f);

    const out = await runCli(verbArgs("override", f, ["--reason", "dirty tree"]), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("tracked worktree is dirty");
    expect(reportBody(f)).toBe(before);
  });

  test("a converged record is never overwritten by a merged override", async () => {
    // `converged -> override` is refused whatever the pull request's state:
    // the merged arm relaxes the live-head prerequisite, never the lifecycle.
    const f = await converged(fromOrphan);
    merge(f, f.branchHead);
    seedHumanTurn(f.record);
    const before = reportBody(f);

    const out = await runCli(verbArgs("override", f, ["--reason", "rule the merge forward"]), seams(f));
    expect(out.exitCode).toBe(1);
    expect(out.stderr).toContain("converged -> override");
    expect(reportBody(f)).toBe(before);
  });
});
