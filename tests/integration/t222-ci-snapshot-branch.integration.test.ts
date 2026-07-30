import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractMetricsPublicationWiring } from "../lib/ci-snapshot-wiring.ts";

const CHANGE_DETECTOR = join(import.meta.dir, "../../scripts/detect-ci-changes.sh");

function detectChanges(paths: string[]): Record<string, string> {
  const input = Buffer.from(`${paths.join("\0")}\0`);
  const result = spawnSync("bash", [CHANGE_DETECTOR], { input, encoding: "utf8" });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return Object.fromEntries(
    result.stdout
      .trim()
      .split("\n")
      .map((line) => line.split("=", 2)),
  );
}

describe("t222 CI snapshot publication boundary", () => {
  test("onboarding Markdown runs drift checks without full tests or coverage", () => {
    expect(detectChanges([".claude/CLAUDE.md", "AGENTS.md", "CLAUDE.md"])).toEqual({
      full: "false",
      drift: "true",
      coverage: "false",
    });
  });

  test("framework TypeScript runs full tests, drift checks, and coverage", () => {
    expect(detectChanges(["packages/framework/core/tools/example.ts"])).toEqual({
      full: "true",
      drift: "true",
      coverage: "true",
    });
  });

  test("ordinary project Markdown skips CI validation", () => {
    expect(detectChanges(["amadeus/spaces/default/memory/project.md"])).toEqual({
      full: "false",
      drift: "false",
      coverage: "false",
    });
  });

  test("CI workflow changes run full tests and coverage", () => {
    expect(detectChanges([".github/workflows/ci.yml"])).toEqual({
      full: "true",
      drift: "false",
      coverage: "true",
    });
  });

  test("repository workflow routes full and drift-only validation independently", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const changesJob = yaml.split("  changes:")[1]?.split("\n  typecheck:")[0] ?? "";
    const typecheckJob = yaml.split("  typecheck:")[1]?.split("\n  lint:")[0] ?? "";
    const lintJob = yaml.split("  lint:")[1]?.split("\n  distribution-contract:")[0] ?? "";
    const contractJob =
      yaml.split("  distribution-contract:")[1]?.split("\n  tests:")[0] ?? "";
    const testsJob = yaml.split("  tests:")[1]?.split("\n  drift-check:")[0] ?? "";
    const driftJob = yaml.split("  drift-check:")[1]?.split("\n  distribution-benchmark:")[0] ?? "";
    const releaseGateJob =
      yaml.split("  distribution-release-gate:")[1]?.split("\n  coverage-head:")[0] ?? "";

    expect(changesJob).toContain(`full: \${{ steps.filter.outputs.full }}`);
    expect(changesJob).toContain(`drift: \${{ steps.filter.outputs.drift }}`);
    expect(changesJob).toContain(`coverage: \${{ steps.filter.outputs.coverage }}`);
    expect(changesJob).toContain("git diff --name-only -z");
    expect(changesJob).toContain("--no-renames");
    expect(changesJob).toContain(`if [[ "\${EVENT_NAME}" == "pull_request" ]]`);
    expect(changesJob).toContain(`"\${BASE_SHA}...\${HEAD_SHA}"`);
    expect(changesJob).toContain("bash scripts/detect-ci-changes.sh");
    for (const fullJob of [typecheckJob, lintJob, contractJob, testsJob]) {
      expect(fullJob).toContain("needs: changes");
      expect(fullJob).toContain(`if: \${{ needs.changes.outputs.full == 'true' }}`);
    }
    expect(typecheckJob).toContain("bun run typecheck");
    expect(lintJob).toContain("bun run lint");
    expect(lintJob).toContain("bun tests/complexity-gate.ts --check");
    expect(contractJob).toContain("bun run distribution:check");
    expect(testsJob).toContain("pip install lizard==1.23.0");
    expect(testsJob).toContain("bun run test:ci -- -P 4");
    expect(driftJob).toContain("needs: changes");
    expect(driftJob).toContain(
      `if: \${{ needs.changes.outputs.full == 'true' || needs.changes.outputs.drift == 'true' }}`,
    );
    expect(driftJob).toContain("bun run dist:check");
    expect(driftJob).toContain("bun run promote:self:check");
    expect(releaseGateJob).toContain(
      "needs: [changes, distribution-contract, distribution-benchmark-aggregate]",
    );
    expect(releaseGateJob).toContain(
      `CONTRACT_RESULT: \${{ needs.distribution-contract.result }}`,
    );
  });

  test("repository workflow change detector has valid Bash syntax", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const changesJob = yaml.split("  changes:")[1]?.split("\n  typecheck:")[0] ?? "";
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

  test("repository workflow gates coverage (project + patch) and snapshots on coverage changes", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const headJob = yaml.split("  coverage-head:")[1]?.split("\n  coverage-base:")[0] ?? "";
    const baseJob = yaml.split("  coverage-base:")[1]?.split("\n  coverage:")[0] ?? "";
    const coverageJob = yaml.split("\n  coverage:\n")[1]?.split("\n  metrics-snapshot:")[0] ?? "";
    const snapshotJob = yaml.split("  metrics-snapshot:")[1]?.split("\n  ci-success:")[0] ?? "";

    expect(headJob).toContain("needs: changes");
    expect(baseJob).toContain("needs: changes");
    expect(headJob).toContain("bun tests/coverage-project-gate.ts --check");
    expect(headJob).toContain("bun tests/coverage-patch-gate.ts --check");
    expect(headJob).toContain("bun run coverage:ci -- -P 4");
    expect(headJob).toContain("fetch-depth: 0");
    expect(headJob).toContain(`AMADEUS_PATCH_BASE_REF: origin/\${{ github.event.pull_request.base.ref }}`);
    // relative gate (E-CV2): live merge-base measurement compared through the
    // project-gate baseline seam, verdict-independent base run, cache keyed by
    // merge-base sha, artifact completeness verified before comparison
    expect(coverageJob).toContain("Relative coverage gate (head vs merge-base)");
    expect(coverageJob).toContain("AMADEUS_COVERAGE_PROJECT_BASELINE: /tmp/base-coverage-totals.json");
    expect(baseJob).toContain(`key: relative-coverage-base-\${{ steps.merge-base.outputs.sha }}`);
    expect(baseJob).toContain("base coverage artifacts incomplete");
    expect(coverageJob).toContain("- coverage-head\n      - coverage-base");
    expect(headJob).toContain("needs.changes.outputs.coverage == 'true'");
    expect(baseJob).toContain("needs.changes.outputs.coverage == 'true'");
    expect(coverageJob).toContain("needs.changes.outputs.coverage == 'true'");
    // codecov is fully removed — no upload step, no waiting job (#1017 migration)
    expect(yaml).not.toContain("codecov");
    expect(yaml).not.toContain("Codecov");
    expect(snapshotJob).toContain("- changes\n      - coverage");
    expect(snapshotJob).toContain("needs.changes.outputs.coverage == 'true'");
  });

  test("CI Success passes skipped work but fails closed on detection or required job failures", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const ciSuccessJob = yaml.split("  ci-success:")[1] ?? "";

    expect(ciSuccessJob).toContain(
      "- changes\n      - typecheck\n      - lint\n      - distribution-contract\n      - plugin-conformance-e2e\n      - tests\n      - drift-check\n      - coverage",
    );
    expect(ciSuccessJob).toContain(`require_result "changes" "\${{ needs.changes.result }}"`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.full }}" in`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.drift }}" in`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.coverage }}" in`);
    expect(ciSuccessJob).toContain("No CI-relevant changes; validation skipped");
    expect(ciSuccessJob).toContain(`require_result "typecheck" "\${{ needs.typecheck.result }}"`);
    expect(ciSuccessJob).toContain(`require_result "lint" "\${{ needs.lint.result }}"`);
    expect(ciSuccessJob).toContain(
      `require_result "distribution-contract" "\${{ needs.distribution-contract.result }}"`,
    );
    expect(ciSuccessJob).toContain(
      `require_result "plugin-conformance-e2e" "\${{ needs.plugin-conformance-e2e.result }}"`,
    );
    expect(ciSuccessJob).toContain(`require_result "tests" "\${{ needs.tests.result }}"`);
    expect(ciSuccessJob).toContain(`require_result "drift-check" "\${{ needs.drift-check.result }}"`);
    expect(ciSuccessJob).toContain(`require_result "coverage" "\${{ needs.coverage.result }}"`);
  });

  test("repository workflows separate immutable snapshots from single-owner maintenance", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const maintenanceYaml = readFileSync(
      join(import.meta.dir, "../../.github/workflows/metrics-maintenance.yml"),
      "utf8",
    );
    const {
      trigger,
      snapshotJob,
      uploadStep,
      ciSuccess,
      maintenanceTrigger,
      maintenanceConcurrency,
      maintenanceJob,
    } = extractMetricsPublicationWiring(yaml, maintenanceYaml);
    expect(trigger).toContain("push:\n    branches: [main]");
    expect(trigger).toContain("paths-ignore:\n      - metrics/**");
    expect(trigger).toContain("pull_request:");
    expect(snapshotJob).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(snapshotJob).toContain("group: metrics-snapshot-main");
    expect(snapshotJob).toContain("cancel-in-progress: false");
    expect(snapshotJob).toContain("timeout-minutes: 5");
    expect(snapshotJob).toContain("shell: bash");
    expect(snapshotJob).toContain("name: amadeus-coverage-report");
    expect(snapshotJob).toContain("uses: actions/create-github-app-token@v3");
    expect(snapshotJob).toContain(`client-id: \${{ vars.METRICS_BOT_CLIENT_ID }}`);
    expect(snapshotJob).toContain(`private-key: \${{ secrets.METRICS_BOT_PRIVATE_KEY }}`);
    expect(snapshotJob).toContain("permission-contents: write");
    expect(snapshotJob).toContain("permission-pull-requests: write");
    expect(snapshotJob).toContain(`token: \${{ steps.app-token.outputs.token }}`);
    expect(snapshotJob).toContain("bun scripts/metrics-publication.ts snapshot");
    expect(snapshotJob).toContain('--target-sha "$GITHUB_SHA"');
    expect(snapshotJob).not.toContain("GITHUB_RUN_ATTEMPT");
    expect(snapshotJob).not.toContain("metrics-retention.ts");
    expect(snapshotJob).not.toContain("metrics-visualize.ts");
    expect(snapshotJob).not.toContain("git add -A metrics/");
    expect(maintenanceTrigger).toContain("repository_dispatch:");
    expect(maintenanceTrigger).toContain("types: [metrics-maintenance]");
    expect(maintenanceConcurrency).toContain("group: metrics-maintenance");
    expect(maintenanceConcurrency).toContain("cancel-in-progress: false");
    expect(maintenanceJob).toContain("timeout-minutes: 5");
    expect(maintenanceJob).toContain("shell: bash");
    expect(maintenanceJob).toContain("bun scripts/metrics-publication.ts maintenance");
    expect(maintenanceJob).toContain("permission-contents: write");
    expect(maintenanceJob).toContain("permission-pull-requests: write");
    expect(maintenanceJob).not.toContain("metrics-snapshot.ts");
    expect(ciSuccess).not.toContain("metrics-snapshot");
    expect(ciSuccess).not.toContain("metrics-maintenance");
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
