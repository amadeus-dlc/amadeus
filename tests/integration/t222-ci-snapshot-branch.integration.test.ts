import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

describe("t222 CI snapshot publication boundary", () => {
  test("repository workflow publishes snapshots through auto-merged pull requests", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const { trigger, job, uploadStep, ciSuccess } = extractCiSnapshotWiring(yaml);
    expect(trigger).toContain("push:\n    branches: [main]");
    expect(trigger).toContain("paths-ignore:\n      - metrics/**");
    expect(trigger).toContain("pull_request:");
    expect(job).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(job).toContain("group: metrics-snapshot-main");
    expect(job).toContain("queue: max");
    expect(job).toContain("cancel-in-progress: false");
    expect(job).toContain("timeout-minutes: 5");
    expect(job).toContain("name: amadeus-coverage-report");
    expect(job).toContain("uses: actions/create-github-app-token@v3");
    expect(job).toContain("client-id: ${{ vars.METRICS_BOT_CLIENT_ID }}");
    expect(job).toContain("private-key: ${{ secrets.METRICS_BOT_PRIVATE_KEY }}");
    expect(job).toContain("permission-contents: write");
    expect(job).toContain("permission-pull-requests: write");
    expect(job).toContain("token: ${{ steps.app-token.outputs.token }}");
    expect(job).toContain('branch="metrics/snapshot-${GITHUB_SHA:0:12}-${GITHUB_RUN_ATTEMPT}"');
    expect(job).toContain('git push origin "HEAD:refs/heads/$branch"');
    expect(job).toContain("pr_url=$(gh pr create");
    expect(job).toContain("--base main");
    expect(job).toContain('--head "$branch"');
    expect(job).toContain('gh pr merge --auto --squash --delete-branch "$pr_url"');
    expect(job).not.toContain("HEAD:main");
    expect(ciSuccess).not.toContain("metrics-snapshot");
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
