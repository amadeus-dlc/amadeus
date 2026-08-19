// t542 — merge queue compatibility for scripts/metrics-publication.ts auto-merge
// invocations (Issue #2925). gh CLI rejects `--delete-branch` and `--squash` on
// `gh pr merge` when the target branch has a merge queue rule (main does, since
// #2888): the queue owns the merge strategy (ruleset merge_method=SQUASH), so
// the CLI call must not assert either. Branch deletion is nobody's job on that
// call, so the publisher sweeps the landed head branch itself (#3168).
import { describe, expect, test } from "bun:test";
import type { CommandRunner } from "../../scripts/metrics-publication-github.ts";
import { MaintenanceCliPort, SnapshotCliPort } from "../../scripts/metrics-publication-github.ts";

const REPOSITORY = "amadeus-dlc/amadeus";
const BOT_LOGIN = "amadeus-metrics[bot]";
const TARGET_SHA = "a".repeat(40);
const PR_URL = "https://example.test/pull/1";

// Simulates the merge-queue-enabled `gh pr merge` behaviour observed in Issue
// #2925: `--delete-branch` is rejected outright, and an explicit `--squash`
// strategy is also rejected because the queue owns the merge strategy. A bare
// `gh pr merge --auto <url>` is the only invocation the queue accepts.
function mergeQueueRunner(commands: string[][]): CommandRunner {
  return {
    run(command) {
      commands.push(command);
      if (command[0] === "gh" && command[1] === "pr" && command[2] === "merge") {
        if (command.includes("--delete-branch")) {
          throw new Error("gh pr merge: X Cannot use `-d` or `--delete-branch` when merge queue enabled");
        }
        if (command.includes("--squash")) {
          throw new Error("gh pr merge: X The merge strategy for main is set by the merge queue");
        }
      }
      return { stdout: "", stderr: "" };
    },
  };
}

describe("t542 metrics-publication auto-merge is merge-queue compatible", () => {
  test("SnapshotCliPort.enableAutoMerge succeeds under merge queue rules and issues no rejected flags", async () => {
    const commands: string[][] = [];
    const port = new SnapshotCliPort({
      repoRoot: process.cwd(),
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
      targetSha: TARGET_SHA,
      runner: mergeQueueRunner(commands),
    });

    const receipt = await port.enableAutoMerge(PR_URL);

    expect(receipt).toEqual({ operation: "auto-merge", target: PR_URL, status: "accepted" });
    expect(commands).toEqual([["gh", "pr", "merge", "--auto", PR_URL]]);
  });

  test("MaintenanceCliPort.enableAutoMerge succeeds under merge queue rules and issues no rejected flags", async () => {
    const commands: string[][] = [];
    const port = new MaintenanceCliPort({
      repoRoot: process.cwd(),
      repository: REPOSITORY,
      botLogin: BOT_LOGIN,
      runner: mergeQueueRunner(commands),
    });

    const receipt = await port.enableAutoMerge(PR_URL);

    expect(receipt).toEqual({ operation: "auto-merge", target: PR_URL, status: "accepted" });
    expect(commands).toEqual([["gh", "pr", "merge", "--auto", PR_URL]]);
  });
});
