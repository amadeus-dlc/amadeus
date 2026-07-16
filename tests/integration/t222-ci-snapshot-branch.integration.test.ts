import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

describe("t222 CI snapshot publication boundary", () => {
  test("repository workflow runs the check job only for CI-relevant changes", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const changesJob = yaml.split("  changes:")[1]?.split("\n  check:")[0] ?? "";
    const checkJob = yaml.split("  check:")[1]?.split("\n  coverage:")[0] ?? "";

    expect(changesJob).toContain(`ci: \${{ steps.filter.outputs.ci }}`);
    expect(changesJob).toContain("git diff --name-only -z");
    expect(changesJob).toContain("--no-renames");
    expect(changesJob).toContain(`if [[ "\${EVENT_NAME}" == "pull_request" ]]`);
    expect(changesJob).toContain(`"\${BASE_SHA}...\${HEAD_SHA}"`);
    expect(changesJob).toContain("*.ts|*.tsx");
    expect(changesJob).toContain("packages/framework/*");
    expect(checkJob).toContain("needs: changes");
    expect(checkJob).toContain(`if: \${{ needs.changes.outputs.ci == 'true' }}`);
  });

  test("repository workflow change detector has valid Bash syntax", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const changesJob = yaml.split("  changes:")[1]?.split("\n  check:")[0] ?? "";
    const script =
      changesJob
        .split("        run: |\n")[1]
        ?.split("\n")
        .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
        .join("\n") ?? "";

    expect(script).not.toBe("");
    const syntax = spawnSync("bash", ["-n"], { input: script, encoding: "utf8" });
    expect(syntax.stderr).toBe("");
    expect(syntax.status).toBe(0);
  });

  test("repository workflow uses ASCII-only action names", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const names = yaml
      .split("\n")
      .filter((line) => /^\s*name:/.test(line))
      .map((line) => line.trim());

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  test("repository workflow gates coverage (project + patch) and snapshots on CI-relevant changes", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const coverageJob = yaml.split("  coverage:")[1]?.split("\n  metrics-snapshot:")[0] ?? "";
    const snapshotJob = yaml.split("  metrics-snapshot:")[1]?.split("\n  ci-success:")[0] ?? "";

    expect(coverageJob).toContain("- changes\n      - check");
    expect(coverageJob).toContain(`if: \${{ needs.changes.outputs.ci == 'true' }}`);
    expect(coverageJob).toContain("bun tests/coverage-project-gate.ts --check");
    expect(coverageJob).toContain("bun tests/coverage-patch-gate.ts --check");
    expect(coverageJob).toContain("fetch-depth: 0");
    expect(coverageJob).toContain("AMADEUS_PATCH_BASE_REF: origin/${{ github.event.pull_request.base.ref }}");
    // relative gate (E-CV2): live merge-base measurement compared through the
    // project-gate baseline seam, verdict-independent base run, cache keyed by
    // merge-base sha, artifact completeness verified before comparison
    expect(coverageJob).toContain("Relative coverage gate (head vs merge-base)");
    expect(coverageJob).toContain("AMADEUS_COVERAGE_PROJECT_BASELINE: /tmp/base-coverage-totals.json");
    expect(coverageJob).toContain("key: relative-coverage-base-${{ steps.merge-base.outputs.sha }}");
    expect(coverageJob).toContain("base coverage artifacts incomplete");
    // codecov is fully removed — no upload step, no waiting job (#1017 migration)
    expect(yaml).not.toContain("codecov");
    expect(yaml).not.toContain("Codecov");
    expect(snapshotJob).toContain("- changes\n      - coverage");
    expect(snapshotJob).toContain("needs.changes.outputs.ci == 'true'");
  });

  test("CI Success passes skipped work but fails closed on detection or required job failures", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const ciSuccessJob = yaml.split("  ci-success:")[1] ?? "";

    expect(ciSuccessJob).toContain("- changes\n      - check\n      - coverage");
    expect(ciSuccessJob).toContain(`require_result "changes" "\${{ needs.changes.result }}"`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.ci }}" in`);
    expect(ciSuccessJob).toContain("No CI-relevant changes; expensive checks skipped");
    expect(ciSuccessJob).toContain(`require_result "check" "\${{ needs.check.result }}"`);
    expect(ciSuccessJob).toContain(`require_result "coverage" "\${{ needs.coverage.result }}"`);
  });

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
