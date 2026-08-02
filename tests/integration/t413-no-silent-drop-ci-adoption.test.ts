// t413 — repository adoption keeps the no-silent-drop gate blocking and fail-closed.
// covers: workflow:ci:lint:no-silent-drop, contract:no-silent-drop:adoption-evidence
// size: small
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    expect(gateStep).toContain("timeout-minutes: 1");
    expect(gateStep).toContain("github.event.pull_request.base.sha");
    expect(gateStep).toContain("github.event.before");
    expect(gateStep).toContain("git cat-file -e");
    expect(gateStep).toContain(`git fetch --no-tags --depth=1 origin "${baseRevisionVariable}"`);
    expect(gateStep).toContain("timeout --signal=TERM --kill-after=5s 30s");
    expect(workflow.match(/bun run no-silent-drop/g)).toHaveLength(1);
    expect(gateStep).toContain(`-- --base-revision "${baseRevisionVariable}"`);
    expect(gateStep).not.toContain("continue-on-error");
    expect(gateStep).not.toContain("|| true");
    expect(gateStep).not.toContain("actions/upload-artifact");
  });

  test("PR, fork PR, and push contexts select only their trusted full SHA", () => {
    expect(trustedRevisionForEvent({ eventName: "pull_request", pullRequestBaseSha: FULL_SHA })).toBe(FULL_SHA);
    expect(trustedRevisionForEvent({ eventName: "pull_request", pullRequestBaseSha: FULL_SHA, isFork: true })).toBe(
      FULL_SHA,
    );
    expect(trustedRevisionForEvent({ eventName: "push", beforeSha: FULL_SHA })).toBe(FULL_SHA);
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
      { eventName: "pull_request", pullRequestBaseSha: revision, isFork: true },
      { eventName: "push", beforeSha: revision },
    ];
    for (const context of contexts) {
      const trustedRevision = trustedRevisionForEvent(context);
      expect(spawnSync("git", ["cat-file", "-e", `${trustedRevision}^{commit}`], { cwd: REPO_ROOT }).status).toBe(0);
      expect(
        spawnSync("git", ["show", `${trustedRevision}:tests/no-silent-drop/baseline.json`], { cwd: REPO_ROOT }).status,
      ).toBe(0);
    }
    expect(spawnSync("git", ["cat-file", "-e", `${"f".repeat(40)}^{commit}`], { cwd: REPO_ROOT }).status).not.toBe(
      0,
    );
  });

  test("post-fix census is deterministic and removes only the approved issue identities", () => {
    const command = ["tests/no-silent-drop-gate.ts", "census-evidence"];
    const first = spawnSync("bun", command, { cwd: REPO_ROOT, encoding: "utf8" });
    const second = spawnSync("bun", command, { cwd: REPO_ROOT, encoding: "utf8" });
    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);

    const result = JSON.parse(first.stdout);
    const baseline = JSON.parse(
      readFileSync(join(REPO_ROOT, "tests", "no-silent-drop", "baseline.json"), "utf8"),
    );
    const provenance = JSON.parse(
      readFileSync(join(REPO_ROOT, "tests", "no-silent-drop", "bootstrap-provenance.json"), "utf8"),
    );
    const currentIdentities = new Set<string>(
      result.evidence.findings.map((finding: { fingerprint: string }) => finding.fingerprint),
    );
    const removed = provenance.approvedPre.entries.filter(
      (entry: { fingerprint: string }) => !currentIdentities.has(entry.fingerprint),
    );
    expect(result.evidence.counts).toEqual({ C_pre: 223, B_pre: 223, B0: 223 });
    expect(baseline.entries).toHaveLength(223);
    expect(removed).toHaveLength(4);
    expect(new Set(removed.flatMap((entry: { issues: string[] }) => entry.issues))).toEqual(
      new Set(["#1874", "#1878"]),
    );
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
    expect(result.status).toBe(124);
  });

  test("the canonical evidence registry closes exactly one tested implementation revision", () => {
    const registry = JSON.parse(
      readFileSync(join(REPO_ROOT, "tests", "no-silent-drop", "adoption-evidence.json"), "utf8"),
    );
    const headRevision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();

    expect(spawnSync("git", ["cat-file", "-e", `${registry.currentRevision}^{commit}`], { cwd: REPO_ROOT }).status).toBe(0);
    expect(registry.currentRevision).not.toBe(headRevision);
    expect(validateEvidenceRegistry(registry, registry.currentRevision)).toEqual({ ok: true });
  });
});
