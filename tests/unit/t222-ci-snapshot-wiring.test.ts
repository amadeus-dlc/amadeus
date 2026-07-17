import { describe, expect, test } from "bun:test";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

const yaml = `on:
  push:
    branches: [main]
    paths-ignore:
      - metrics/**
  pull_request:

concurrency:
  coverage:
      - name: Upload coverage artifact
        name: amadeus-coverage-report
        path: |
          coverage/coverage-totals.json
          coverage/tests-totals.json
      - name: Upload coverage to Codecov
  metrics-snapshot:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    concurrency:
      group: metrics-snapshot-main
      queue: max
      cancel-in-progress: false
    timeout-minutes: 5
    name: amadeus-coverage-report
    uses: actions/create-github-app-token@v3
    client-id: \${{ vars.METRICS_BOT_CLIENT_ID }}
    private-key: \${{ secrets.METRICS_BOT_PRIVATE_KEY }}
    permission-contents: write
    permission-pull-requests: write
    token: \${{ steps.app-token.outputs.token }}
    branch="metrics/snapshot-\${GITHUB_SHA:0:12}-\${GITHUB_RUN_ATTEMPT}"
    git push origin "HEAD:refs/heads/$branch"
    pr_url=$(gh pr create
    --base main
    --head "$branch"
    gh pr merge --auto --squash --delete-branch "$pr_url"
      - name: Generate snapshot
        run: bun scripts/metrics-snapshot.ts --write
      - name: Prune old snapshots
        run: bun scripts/metrics-retention.ts --apply
      - name: Commit snapshot
        run: |
          git add -A metrics/
          git commit -m "chore(metrics): record snapshot"
  ci-success:
    needs: [coverage]
`;
const { trigger, job, uploadStep, ciSuccess } = extractCiSnapshotWiring(yaml);
describe("t222 CI snapshot wiring", () => {
  test("metrics-only main pushes do not recurse while pull requests still run", () => {
    expect(trigger).toContain("push:\n    branches: [main]");
    expect(trigger).toContain("paths-ignore:\n      - metrics/**");
    expect(trigger).toContain("pull_request:");
  });
  test("main push guard", () => expect(job).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'"));
  test("fixed concurrency queue", () => { expect(job).toContain("group: metrics-snapshot-main"); expect(job).toContain("queue: max"); expect(job).toContain("cancel-in-progress: false"); });
  test("five minute timeout", () => expect(job).toContain("timeout-minutes: 5"));
  test("named artifact", () => expect(job).toContain("name: amadeus-coverage-report"));
  test("uses the metrics GitHub App with least privilege", () => {
    expect(job).toContain("uses: actions/create-github-app-token@v3");
    expect(job).toContain("client-id: ${{ vars.METRICS_BOT_CLIENT_ID }}");
    expect(job).toContain("private-key: ${{ secrets.METRICS_BOT_PRIVATE_KEY }}");
    expect(job).toContain("permission-contents: write");
    expect(job).toContain("permission-pull-requests: write");
    expect(job).toContain("token: ${{ steps.app-token.outputs.token }}");
  });
  test("publishes snapshots through an automatically merged pull request", () => {
    expect(job).toContain('branch="metrics/snapshot-${GITHUB_SHA:0:12}-${GITHUB_RUN_ATTEMPT}"');
    expect(job).toContain('git push origin "HEAD:refs/heads/$branch"');
    expect(job).toContain("pr_url=$(gh pr create");
    expect(job).toContain("--base main");
    expect(job).toContain('--head "$branch"');
    expect(job).toContain('gh pr merge --auto --squash --delete-branch "$pr_url"');
    expect(job).not.toContain("HEAD:main");
  });
  test("prunes old snapshots after generating and before committing (Issue #1121)", () => {
    const generate = job.indexOf("- name: Generate snapshot");
    const prune = job.indexOf("- name: Prune old snapshots");
    const commit = job.indexOf("- name: Commit snapshot");
    expect(generate).toBeGreaterThanOrEqual(0);
    expect(prune).toBeGreaterThan(generate);
    expect(commit).toBeGreaterThan(prune);
    expect(job).toContain("run: bun scripts/metrics-retention.ts --apply");
  });
  test("commit stages deletions with git add -A so pruned snapshots are removed (Issue #1121)", () => {
    expect(job).toContain("git add -A metrics/");
    expect(job).not.toContain("git add metrics/*.json");
  });
  test("ci-success does not depend on snapshot", () => expect(ciSuccess).not.toContain("metrics-snapshot"));
  test("totals belong to the named coverage artifact upload step", () => {
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
