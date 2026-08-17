// t413 — repository adoption keeps the no-silent-drop gate blocking and fail-closed.
// covers: workflow:ci:lint:no-silent-drop, contract:no-silent-drop:adoption-evidence
// size: medium
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { foldEvents, loadEvents } from "../no-silent-drop/events.ts";
import { EVIDENCE_FRESHNESS_PATHSPECS } from "../no-silent-drop/evidence-rebind.ts";
import {
  deadlineArgv,
  generatedLedgerFixture,
  trustedRevisionForEvent,
  validateEvidenceRegistry,
  validateTimingSamples,
} from "../no-silent-drop/repository-adoption.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";

describe("t413 no-silent-drop blocking CI structure", () => {
  test("the existing lint job owns one independently timed blocking invocation", () => {
    const workflow = readFileSync(join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8");
    const lintJob = workflow.slice(workflow.indexOf("  lint:\n"), workflow.indexOf("  distribution-contract:\n"));
    const gateStart = lintJob.indexOf("      - name: No silent drop");
    const gateStep = lintJob.slice(gateStart, lintJob.indexOf("\n      - name:", gateStart + 1));
    const baseRevisionVariable = ["$", "{BASE_REVISION}"].join("");

    expect(lintJob).toContain("fetch-depth: 0");
    expect(lintJob).toContain("persist-credentials: false");
    expect(gateStep).toContain("timeout-minutes: 1");
    expect(gateStep).toContain("github.event.pull_request.base.sha");
    expect(gateStep).toContain("github.event.before");
    expect(gateStep).toContain("git cat-file -e");
    expect(gateStep).not.toContain("git fetch");
    expect(gateStep).toContain('BASE_REVISION="$(git rev-parse --verify --quiet HEAD^)"');
    expect(gateStep).toContain("workflow_dispatch HEAD has no parent");
    expect(gateStep).toContain("Trusted base revision must not be all zeros");
    expect(gateStep).toContain("must be a 40-character lowercase hexadecimal SHA");
    expect(gateStep).toContain('if [[ "${BASE_REVISION}" =~ ^0+$ ]]');
    expect(gateStep).toContain("timeout --signal=TERM --kill-after=5s 30s");
    const testsJob = workflow.slice(workflow.indexOf("  tests:\n"), workflow.indexOf("  coverage-head:\n"));
    expect(testsJob).toContain("persist-credentials: false");
    expect(workflow.match(/bun run no-silent-drop/g)).toHaveLength(1);
    expect(gateStep).toContain(`-- --base-revision "${baseRevisionVariable}"`);
    expect(gateStep).not.toContain("continue-on-error");
    expect(gateStep).not.toContain("|| true");
    expect(gateStep).not.toContain("actions/upload-artifact");
  });

  test("a PR context selects its trusted base SHA", () => {
    expect(trustedRevisionForEvent({ eventName: "pull_request", pullRequestBaseSha: FULL_SHA })).toBe(FULL_SHA);
  });

  test("a fork PR context selects its trusted base SHA", () => {
    expect(trustedRevisionForEvent({ eventName: "pull_request", pullRequestBaseSha: FULL_SHA })).toBe(FULL_SHA);
  });

  test("a push context selects its trusted before SHA", () => {
    expect(trustedRevisionForEvent({ eventName: "push", beforeSha: FULL_SHA })).toBe(FULL_SHA);
  });

  test("event contexts without a trusted full SHA fail closed", () => {
    for (const context of [
      { eventName: "workflow_dispatch" },
      { eventName: "pull_request", pullRequestBaseSha: "abc123" },
      { eventName: "push", beforeSha: "0".repeat(40) },
    ]) {
      expect(() => trustedRevisionForEvent(context)).toThrow();
    }
  });

  test("each trusted event fixture resolves a real commit and baseline object", () => {
    const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();
    const contexts = [
      { eventName: "pull_request", pullRequestBaseSha: revision },
      { eventName: "push", beforeSha: revision },
    ];
    for (const context of contexts) {
      const trustedRevision = trustedRevisionForEvent(context);
      expect(spawnSync("git", ["cat-file", "-e", `${trustedRevision}^{commit}`], { cwd: REPO_ROOT }).status).toBe(0);
      const eventsTree = spawnSync(
        "git",
        ["ls-tree", "-r", "--name-only", trustedRevision, "--", "tests/no-silent-drop/events"],
        { cwd: REPO_ROOT, encoding: "utf8" },
      );
      expect(eventsTree.status).toBe(0);
      expect(eventsTree.stdout.trim().length > 0).toBe(true);
    }
    expect(spawnSync("git", ["cat-file", "-e", `${"f".repeat(40)}^{commit}`], { cwd: REPO_ROOT }).status).not.toBe(
      0,
    );
  });

  test("post-fix census is deterministic and every removal is an explicit revoke", () => {
    const command = ["tests/no-silent-drop-gate.ts", "census-evidence"];
    const first = spawnSync("bun", command, { cwd: REPO_ROOT, encoding: "utf8" });
    const second = spawnSync("bun", command, { cwd: REPO_ROOT, encoding: "utf8" });
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);

    const result = JSON.parse(first.stdout);
    const folded = foldEvents(loadEvents(REPO_ROOT).byUlid.values());
    // The census only ever shrinks, so these numbers move whenever a silent-drop
    // path is deleted. 217 -> 215 was #2151; 215 -> 214 is #1906, which removed the
    // fail-open catch that let finalizeAuditLockAcquire swallow a failed lock
    // finalization. That catch was the NSD001 identity b775faf8 in amadeus-lib.ts,
    // so deleting the silent-continue path deletes the finding. 214 -> 213 is the
    // standing-grant removal, which deleted the NSD001 identity 56fefece in
    // amadeus-state.ts along with the authorization path that carried it. After
    // #2338 the grandfather set lives in events/<ulid>.json and B0 is the folded
    // effective set size. 213 -> 215 is #2378: two design-approved fail-open
    // catches — the autonomy refusal emit (u1) and the question-route sweep (u3) —
    // each entered as a granted NSD001 identity. Moving plugin policy out of core
    // removed both catches, so their grants are now explicitly revoked and the
    // baseline returns to 213. 213 -> 212 is the canonical election replacement:
    // deleting the legacy migration CLI (scripts/amadeus-election-migrate.ts)
    // deleted its NSD001 identity faacb3ea, whose grant is now explicitly revoked.
    // 212 -> 213 is #3152: the gate-open refusal recorder carries the ADR-2
    // fail-open catch (a refusal that cannot be recorded must not block the gate
    // open), entered as the granted NSD001 identity 2555ab41.
    expect(result.evidence.counts).toEqual({ C_pre: 213, B_pre: 213, B0: 213 });
    expect(folded.grandfather).toHaveLength(213);

    // A shrink is only auditable when the ledger states it: every revoked identity
    // must have left the census, and no revoked identity may still be granted.
    const currentIdentities = new Set<string>(
      result.evidence.findings.map((finding: { fingerprint: string }) => finding.fingerprint),
    );
    const revoked = [...folded.revoked].sort();
    expect(revoked).toHaveLength(7);
    expect(revoked.some((fingerprint) => fingerprint.startsWith("b775faf8"))).toBeTrue();
    expect(revoked.some((fingerprint) => fingerprint.startsWith("56fefece"))).toBeTrue();
    expect(revoked.filter((fingerprint) => currentIdentities.has(fingerprint))).toEqual([]);
    expect(folded.grandfather.filter((entry) => folded.revoked.has(entry.fingerprint))).toEqual([]);
  });

  test("the deadline and performance/capacity fixtures preserve their complete populations", () => {
    expect(deadlineArgv(FULL_SHA)).toEqual([
      "timeout",
      "--signal=TERM",
      "--kill-after=5s",
      "30s",
      "bun",
      "run",
      "no-silent-drop",
      "--",
      "--base-revision",
      FULL_SHA,
    ]);
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, 5], warm: [1, 1, 2, 2, 3] })).toEqual({
      pass: true,
      coldMax: 5,
      warmMax: 3,
    });
    expect(validateTimingSamples({ cold: [1, 2, 3, 4], warm: [1, 1, 2, 2, 3] }).pass).toBeFalse();
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, 15.01], warm: [1, 1, 2, 2, 3] }).pass).toBeFalse();
    expect([0, 2, 4].map((scale) => generatedLedgerFixture(scale).entries.length)).toEqual([0, 2, 4]);
  });

  test("a GNU timeout hang injection preserves its nonzero deadline exit", () => {
    const result = spawnSync(
      "timeout",
      ["--signal=TERM", "--kill-after=1s", "0.1s", "bun", "-e", "setInterval(() => {}, 1000)"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(124);
  });

  test("the canonical evidence registry binds one reachable tested implementation revision", () => {
    const registry = JSON.parse(
      readFileSync(join(REPO_ROOT, "tests", "no-silent-drop", "adoption-evidence.json"), "utf8"),
    );
    const headRevision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();

    expect(spawnSync("git", ["cat-file", "-e", `${registry.currentRevision}^{commit}`], { cwd: REPO_ROOT }).status).toBe(0);
    // Under the squash merge queue the validation commit is a squash of main plus
    // this change: a branch-bound binding can never be its ancestor, and a
    // main-bound binding can never have an empty freshness diff for a PR that
    // edits the gate itself (measured on PR #3157, merge-group run 31961484876 -
    // both arms of the catch-22 fail by construction). The binding is therefore
    // structurally unverifiable in a merge_group context. The No Silent Drop
    // Evidence Reconcile workflow (on: push to main) re-binds and re-validates
    // it on every landing and is the authority for the landed state; object
    // existence and registry validity stay asserted in every context.
    const mergeGroup = process.env.GITHUB_EVENT_NAME === "merge_group";
    if (!mergeGroup) {
      expect(
        spawnSync("git", ["merge-base", "--is-ancestor", registry.currentRevision, headRevision], {
          cwd: REPO_ROOT,
          encoding: "utf8",
        }).status,
      ).toBe(0);
    }
    expect(validateEvidenceRegistry(registry, registry.currentRevision)).toEqual({ ok: true });
    // Freshness is asserted over the gate's own implementation only, enumerated once as
    // EVIDENCE_FRESHNESS_PATHSPECS (tests/no-silent-drop/evidence-rebind.ts) and shared with the
    // reconcile adapter so the two cannot drift apart. See that definition for why the scanned
    // corpus is excluded and which issue owns the resulting census-staleness gap.
    const changedImplementation = spawnSync("git", [
      "diff",
      "--name-only",
      `${registry.currentRevision}..${headRevision}`,
      "--",
      ...EVIDENCE_FRESHNESS_PATHSPECS,
    ], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();
    if (!mergeGroup) {
      expect(changedImplementation).toBe("");
    }
  });
});
