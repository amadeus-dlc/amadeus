import { describe, expect, test } from "bun:test";
import { extractMetricsPublicationWiring } from "../lib/ci-snapshot-wiring.ts";

const ciYaml = `on:
  push:
    branches: [main]
    paths-ignore:
      - metrics/**
  pull_request:

concurrency:
  group: ci
jobs:
  coverage-head:
      - name: Upload coverage artifact
        name: amadeus-coverage-report
        path: |
          coverage/coverage-totals.json
          coverage/tests-totals.json
  metrics-snapshot:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    concurrency:
      group: metrics-snapshot-main
      cancel-in-progress: false
    timeout-minutes: 5
    uses: actions/create-github-app-token@v3
    permission-contents: write
    permission-pull-requests: write
    token: \${{ steps.app-token.outputs.token }}
    shell: bash
    run: |
      bun scripts/metrics-publication.ts snapshot \\
        --target-sha "$GITHUB_SHA" \\
        --repository "$GITHUB_REPOSITORY" \\
        --bot-login '\${{ steps.app-token.outputs.app-slug }}[bot]'
  ci-success:
    needs: [coverage]
`;

const maintenanceYaml = `on:
  repository_dispatch:
    types: [metrics-maintenance]
permissions:
  contents: read
concurrency:
  group: metrics-maintenance
  cancel-in-progress: false
jobs:
  publish:
    timeout-minutes: 5
    uses: actions/create-github-app-token@v3
    permission-contents: write
    permission-pull-requests: write
    token: \${{ steps.app-token.outputs.token }}
    shell: bash
    run: |
      bun scripts/metrics-publication.ts maintenance \\
        --repository "$GITHUB_REPOSITORY" \\
        --bot-login '\${{ steps.app-token.outputs.app-slug }}[bot]'
`;

const wiring = extractMetricsPublicationWiring(ciYaml, maintenanceYaml);

describe("t222 metrics publication workflow wiring", () => {
  test("metrics-only main pushes do not recurse while pull requests still run", () => {
    expect(wiring.trigger).toContain("push:\n    branches: [main]");
    expect(wiring.trigger).toContain("paths-ignore:\n      - metrics/**");
    expect(wiring.trigger).toContain("pull_request:");
  });

  test("snapshot is main-push-only, fixed-concurrency, and bounded to five minutes", () => {
    expect(wiring.snapshotJob).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(wiring.snapshotJob).toContain("group: metrics-snapshot-main");
    expect(wiring.snapshotJob).toContain("cancel-in-progress: false");
    expect(wiring.snapshotJob).toContain("timeout-minutes: 5");
    expect(wiring.snapshotJob).toContain("shell: bash");
  });

  test("snapshot delegates full-SHA publication to the JSON-only publisher", () => {
    expect(wiring.snapshotJob).toContain("bun scripts/metrics-publication.ts snapshot");
    expect(wiring.snapshotJob).toContain('--target-sha "$GITHUB_SHA"');
    expect(wiring.snapshotJob).toContain('--repository "$GITHUB_REPOSITORY"');
    expect(wiring.snapshotJob).not.toContain("metrics-retention.ts");
    expect(wiring.snapshotJob).not.toContain("metrics-visualize.ts");
    expect(wiring.snapshotJob).not.toContain("git add -A metrics/");
    expect(wiring.snapshotJob).not.toContain("GITHUB_RUN_ATTEMPT");
  });

  test("snapshot uses only the existing GitHub App write grants", () => {
    expect(wiring.snapshotJob).toContain("uses: actions/create-github-app-token@v3");
    expect(wiring.snapshotJob).toContain("permission-contents: write");
    expect(wiring.snapshotJob).toContain("permission-pull-requests: write");
    expect(wiring.snapshotJob).toContain(`token: \${{ steps.app-token.outputs.token }}`);
  });

  test("maintenance starts only from explicit dispatch", () => {
    expect(wiring.maintenanceTrigger).toContain("repository_dispatch:");
    expect(wiring.maintenanceTrigger).toContain("types: [metrics-maintenance]");
  });

  test("maintenance has one stable concurrency group and five-minute bound", () => {
    expect(wiring.maintenanceConcurrency).toContain("group: metrics-maintenance");
    expect(wiring.maintenanceConcurrency).toContain("cancel-in-progress: false");
    expect(wiring.maintenanceJob).toContain("timeout-minutes: 5");
    expect(wiring.maintenanceJob).toContain("shell: bash");
  });

  test("maintenance delegates to the single maintenance publisher", () => {
    expect(wiring.maintenanceJob).toContain("bun scripts/metrics-publication.ts maintenance");
    expect(wiring.maintenanceJob).toContain('--repository "$GITHUB_REPOSITORY"');
    expect(wiring.maintenanceJob).not.toContain("metrics-snapshot.ts");
  });

  test("maintenance uses only the existing GitHub App write grants", () => {
    expect(wiring.maintenanceJob).toContain("uses: actions/create-github-app-token@v3");
    expect(wiring.maintenanceJob).toContain("permission-contents: write");
    expect(wiring.maintenanceJob).toContain("permission-pull-requests: write");
    expect(wiring.maintenanceJob).toContain(`token: \${{ steps.app-token.outputs.token }}`);
  });

  test("ci-success remains independent from both publishers", () => {
    expect(wiring.ciSuccess).not.toContain("metrics-snapshot");
    expect(wiring.ciSuccess).not.toContain("metrics-maintenance");
  });

  test("coverage totals remain in the named artifact upload step", () => {
    expect(wiring.uploadStep).toContain("name: amadeus-coverage-report");
    expect(wiring.uploadStep).toContain("coverage/coverage-totals.json");
    expect(wiring.uploadStep).toContain("coverage/tests-totals.json");
  });
});
