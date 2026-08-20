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
      risk: "false",
    });
  });

  test("framework TypeScript runs full tests, drift checks, and coverage", () => {
    expect(detectChanges(["packages/framework/core/tools/example.ts"])).toEqual({
      full: "true",
      drift: "true",
      coverage: "true",
      risk: "false",
    });
  });

  test("core tools and TLA inputs promote the risk tier", () => {
    expect(detectChanges(["packages/framework/core/tools/amadeus-state.ts"]).risk).toBe("true");
    expect(detectChanges(["amadeus/spaces/default/specs/tla/Model.tla"]).risk).toBe("true");
    expect(detectChanges(["plugins/formal-model-check/tools/run-model-check-ci.ts"]).risk).toBe("true");
  });

  test("a 30-file change promotes the risk tier without broadening the ordinary full tier", () => {
    const paths = Array.from({ length: 30 }, (_, index) => `docs/large-change-${index}.md`);
    expect(detectChanges(paths)).toEqual({
      full: "false",
      drift: "false",
      coverage: "false",
      risk: "true",
    });
  });

  test("29 changed files stay below the large-change risk boundary", () => {
    const paths = Array.from({ length: 29 }, (_, index) => `docs/large-change-${index}.md`);
    expect(detectChanges(paths).risk).toBe("false");
  });

  test("untracked distribution changes request the source-only drift guard", () => {
    expect(detectChanges(["dist/claude/.claude/tools/generated.ts"])).toEqual({
      full: "false",
      drift: "true",
      coverage: "false",
      risk: "false",
    });
  });

  test("source-only tracking rules request the drift guard", () => {
    for (const path of [".gitignore", ".gitattributes"]) {
      expect(detectChanges([path]), path).toEqual({
        full: "false",
        drift: "true",
        coverage: "false",
        risk: "false",
      });
    }
  });

  test("absent Kiro root faces do not request drift checks", () => {
    expect(detectChanges([".kiro/tools/generated.ts", ".kiro-ide/tools/generated.ts"]))
      .toEqual({ full: "false", drift: "false", coverage: "false", risk: "false" });
    expect(detectChanges([".codex/config.toml"])).toMatchObject({ drift: "true" });
  });

  test("ordinary project Markdown skips CI validation", () => {
    expect(detectChanges(["amadeus/spaces/default/memory/project.md"])).toEqual({
      full: "false",
      drift: "false",
      coverage: "false",
      risk: "false",
    });
  });

  test("CI workflow changes run full tests and coverage", () => {
    expect(detectChanges([".github/workflows/ci.yml"])).toEqual({
      full: "true",
      drift: "false",
      coverage: "true",
      risk: "false",
    });
  });

  // #3248: a release.yml-only PR used to land on the quick path (full=false),
  // so t223's job/step pin never ran until an unrelated full PR. Any workflow
  // file must take the full path so those pins can go red on the changing PR.
  test("a non-ci workflow-only change runs full tests (#3248)", () => {
    expect(detectChanges([".github/workflows/release.yml"])).toEqual({
      full: "true",
      drift: "false",
      coverage: "false",
      risk: "false",
    });
    expect(detectChanges([".github/workflows/metrics-maintenance.yml"])).toMatchObject({
      full: "true",
    });
  });

  test("repository workflow routes full and drift-only validation independently", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const changesJob = yaml.split("  changes:")[1]?.split("\n  typecheck:")[0] ?? "";
    const typecheckJob = yaml.split("  typecheck:")[1]?.split("\n  lint:")[0] ?? "";
    const lintJob = yaml.split("  lint:")[1]?.split("\n  distribution-contract:")[0] ?? "";
    const contractJob =
      yaml.split("  distribution-contract:")[1]?.split("\n  tests:")[0] ?? "";
    const e2eJob = yaml.split("  e2e:")[1]?.split("\n  tests:")[0] ?? "";
    const testsJob = yaml.split("  tests:")[1]?.split("\n  drift-check:")[0] ?? "";
    const formalJob = yaml.split("  formal-model-check:")[1]?.split("\n  review-thread-resolution:")[0] ?? "";
    const driftJob = yaml.split("  drift-check:")[1]?.split("\n  coverage-head:")[0] ?? "";

    expect(changesJob).toContain(`full: \${{ steps.filter.outputs.full }}`);
    expect(changesJob).toContain(`drift: \${{ steps.filter.outputs.drift }}`);
    expect(changesJob).toContain(`coverage: \${{ steps.filter.outputs.coverage }}`);
    expect(changesJob).toContain(`risk: \${{ steps.filter.outputs.risk }}`);
    expect(changesJob).toContain("git diff --name-only -z");
    expect(changesJob).toContain("--no-renames");
    expect(changesJob).toContain(
      `if [[ "\${EVENT_NAME}" == "pull_request" || "\${EVENT_NAME}" == "merge_group" ]]`,
    );
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
    for (const generatedConsumerJob of [typecheckJob, lintJob, contractJob]) {
      expect(generatedConsumerJob).toContain("bun run build");
    }
    expect(testsJob).toContain("pip install lizard==1.23.0");
    expect(testsJob).toContain("bun run test:ci -- -P 4");
    expect(e2eJob).toContain("needs: changes");
    expect(e2eJob).toContain("needs.changes.outputs.risk == 'true'");
    expect(e2eJob).toContain("bun tests/run-tests.ts --e2e -P 4");
    expect(formalJob).toContain("needs: changes");
    expect(formalJob).toContain("github.event_name == 'merge_group'");
    expect(formalJob).toContain("needs.changes.outputs.risk == 'true'");
    expect(driftJob).toContain("needs: changes");
    expect(driftJob).toContain(
      `if: \${{ needs.changes.outputs.full == 'true' || needs.changes.outputs.drift == 'true' }}`,
    );
    expect(driftJob).toContain("bun run source-only:check");
    expect(driftJob).toContain("bun run build");
    expect(driftJob).toContain("amadeus-graph.ts compile --check");
  });

  test("performance verification stays out of the blocking pipeline", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const jobs = (Bun.YAML.parse(yaml) as { jobs?: Record<string, { needs?: unknown }> }).jobs
      ?? {};

    for (const retired of [
      "distribution-benchmark",
      "distribution-benchmark-aggregate",
      "distribution-release-gate",
    ]) {
      expect(Object.keys(jobs)).not.toContain(retired);
    }
    expect(yaml).not.toContain("distribution:benchmark");

    // The full blocking dependency set: dropping any entry must be as loud as
    // re-introducing a benchmark job.
    //
    // `control-byte-gate` joined this set for Issue #2814 and
    // `coverage-registry` for Issue #3049. "CI Success" is this repository's
    // only required status check, so a job outside this set is advisory however
    // loudly it fails. Membership here governs whether a red run blocks merge.
    const ciSuccessNeeds = jobs["ci-success"]?.needs;
    expect(Array.isArray(ciSuccessNeeds)).toBe(true);
    expect(new Set(ciSuccessNeeds as string[])).toEqual(
      new Set([
        "changes",
        "control-byte-gate",
        "coverage-registry",
        "typecheck",
        "lint",
        "distribution-contract",
        "plugin-conformance-e2e",
        "e2e",
        "tests",
        "reproducible-build",
        "drift-check",
        "coverage",
        "formal-model-check",
        "review-thread-resolution",
      ]),
    );
    expect(Object.keys(jobs)).toContain("distribution-contract");
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
    expect(headJob).toContain("- name: Fetch merge-group base");
    expect(headJob).toContain(
      `BASE_REF: \${{ github.event_name == 'pull_request' && github.event.pull_request.base.ref || github.event.merge_group.base_ref }}`,
    );
    expect(headJob).toContain(
      `git fetch --no-tags origin "+refs/heads/\${BASE_REF}:refs/remotes/origin/\${BASE_REF}"`,
    );
    expect(headJob.indexOf("- name: Fetch merge-group base")).toBeLessThan(
      headJob.indexOf("- name: Patch coverage gate"),
    );
    expect(headJob).toContain(
      `AMADEUS_PATCH_BASE_REF: \${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || github.event.merge_group.base_sha }}`,
    );
    // absolute + relative gate: versioned floor plus live merge-base measurement
    // through the project-gate baseline seam, verdict-independent base run,
    // cache keyed by merge-base sha, artifacts verified before comparison
    expect(coverageJob).toContain("Project coverage gate (absolute and merge-base-relative)");
    expect(coverageJob).toContain("AMADEUS_COVERAGE_PROJECT_BASELINE: /tmp/base-coverage-totals.json");
    expect(baseJob).toContain(`key: relative-coverage-base-\${{ steps.merge-base.outputs.sha }}`);
    expect(baseJob).toContain("base coverage artifacts incomplete");
    expect(coverageJob).toContain("- coverage-head\n      - coverage-base");
    expect(headJob).toContain("needs.changes.outputs.coverage == 'true'");
    expect(baseJob).toContain("needs.changes.outputs.coverage == 'true'");
    expect(coverageJob).toContain("needs.changes.outputs.coverage == 'true'");
    expect(headJob).toContain("github.event_name == 'merge_group'");
    expect(baseJob).toContain("github.event.merge_group.base_sha");
    expect(baseJob).toContain("github.event_name == 'merge_group'");
    expect(coverageJob).toContain("github.event_name == 'merge_group'");
    // codecov is fully removed — no upload step, no waiting job (#1017 migration)
    expect(yaml).not.toContain("codecov");
    expect(yaml).not.toContain("Codecov");
    expect(snapshotJob).toContain("- changes\n      - coverage");
    expect(snapshotJob).toContain("needs.changes.outputs.coverage == 'true'");
  });

  test("merge-group revalidation uses the queue base and remains blocking", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const coverageBase = yaml.split("  coverage-base:")[1]?.split("\n  coverage:")[0] ?? "";
    const coverage = yaml.split("\n  coverage:\n")[1]?.split("\n  metrics-snapshot:")[0] ?? "";
    const ciSuccess = yaml.split("  ci-success:")[1] ?? "";

    expect(yaml).toContain("merge_group:");
    expect(yaml).toContain("queue's `merge_group`\n# run is the authoritative pre-merge revalidation");
    expect(coverageBase).toContain("github.event.merge_group.base_sha");
    expect(coverageBase).toContain('git merge-base "${BASE_SHA}" HEAD');
    expect(coverageBase).toContain("bun run coverage:ci -- -P 4");
    expect(coverage).toContain("github.event_name == 'merge_group'");
    expect(ciSuccess).toContain("- coverage");
    expect(ciSuccess).toContain(`require_result "coverage" "\${{ needs.coverage.result }}"`);
  });

  test("CI Success passes skipped work but fails closed on detection or required job failures", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const ciSuccessJob = yaml.split("  ci-success:")[1] ?? "";

    expect(ciSuccessJob).toContain(
      "- changes\n      - control-byte-gate\n      - coverage-registry\n      - typecheck\n      - lint\n      - distribution-contract\n      - plugin-conformance-e2e\n      - e2e\n      - tests\n      - reproducible-build\n      - drift-check\n      - coverage\n      - formal-model-check",
    );
    expect(ciSuccessJob).toContain(`require_result "changes" "\${{ needs.changes.result }}"`);
    // Asserted unconditionally, ahead of the `changes`-driven case branches:
    // the control-byte gate has no path filter, so a docs-only or amadeus-only
    // pull request must still be held to its result (Issue #2814). Containment
    // alone would not catch the assertion being moved INTO a case branch, which
    // is the way this contract actually breaks, so pin the position too.
    const controlByteAssertion =
      `require_result "control-byte-gate" "\${{ needs.control-byte-gate.result }}"`;
    const controlByteAt = ciSuccessJob.indexOf(controlByteAssertion);
    expect(controlByteAt).toBeGreaterThan(-1);
    expect(ciSuccessJob.indexOf("          case ")).toBeGreaterThan(controlByteAt);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.full }}" in`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.drift }}" in`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.coverage }}" in`);
    expect(ciSuccessJob).toContain(`case "\${{ needs.changes.outputs.risk }}" in`);
    expect(ciSuccessJob).toContain("No CI-relevant changes; validation skipped");
    expect(ciSuccessJob).toContain(`require_result "typecheck" "\${{ needs.typecheck.result }}"`);
    expect(ciSuccessJob).toContain(`require_result "lint" "\${{ needs.lint.result }}"`);
    expect(ciSuccessJob).toContain(
      `require_result "coverage-registry" "\${{ needs['coverage-registry'].result }}"`,
    );
    expect(ciSuccessJob).toContain(
      `require_result "distribution-contract" "\${{ needs.distribution-contract.result }}"`,
    );
    expect(ciSuccessJob).toContain(
      `require_result "plugin-conformance-e2e" "\${{ needs.plugin-conformance-e2e.result }}"`,
    );
    expect(ciSuccessJob).toContain(`require_result "e2e" "\${{ needs.e2e.result }}"`);
    expect(ciSuccessJob).toContain(
      `require_result "formal-model-check" "\${{ needs['formal-model-check'].result }}"`,
    );
    expect(ciSuccessJob).toContain(`require_result "tests" "\${{ needs.tests.result }}"`);
    expect(ciSuccessJob).toContain(
      `require_result "reproducible-build" "\${{ needs.reproducible-build.result }}"`,
    );
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
    expect(snapshotJob).toContain(
      "uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3",
    );
    expect(snapshotJob).toContain(`client-id: \${{ vars.METRICS_BOT_CLIENT_ID }}`);
    expect(snapshotJob).toContain(`private-key: \${{ secrets.METRICS_BOT_PRIVATE_KEY }}`);
    expect(snapshotJob).toContain("permission-contents: write");
    expect(snapshotJob).toContain("permission-pull-requests: write");
    expect(snapshotJob).toContain(`token: \${{ steps.app-token.outputs.token }}`);
    expect(snapshotJob).toContain("persist-credentials: true");
    expect(snapshotJob).toContain("bun scripts/metrics-publication.ts snapshot");
    expect(snapshotJob).toContain('--target-sha "$GITHUB_SHA"');
    expect(snapshotJob).not.toContain("GITHUB_RUN_ATTEMPT");
    expect(snapshotJob).not.toContain("metrics-retention.ts");
    expect(snapshotJob).not.toContain("metrics-visualize.ts");
    expect(snapshotJob).not.toContain("git add -A metrics/");
    expect(maintenanceTrigger).toContain("repository_dispatch:");
    expect(maintenanceTrigger).toContain("types: [metrics-maintenance]");
    expect(maintenanceYaml).toContain(
      `run-name: Metrics maintenance for \${{ github.event.client_payload.target_sha }}`,
    );
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

  test("backfill workflow pins and verifies every missing source artifact", () => {
    const yaml = readFileSync(
      join(import.meta.dir, "../../.github/workflows/metrics-backfill.yml"),
      "utf8",
    );
    const workflow = Bun.YAML.parse(yaml) as {
      on?: { workflow_dispatch?: { inputs?: { source_run_id?: Record<string, unknown> } } };
      concurrency?: unknown;
      permissions?: Record<string, string>;
      jobs?: Record<string, Record<string, unknown>>;
    };
    expect(workflow.on?.workflow_dispatch?.inputs?.source_run_id).toEqual({
      description: "Source CI run",
      required: true,
      type: "choice",
      options: [
        "30878127506",
        "30879623974",
        "30886132865",
        "30900354349",
        "30905997559",
        "30910129257",
      ],
    });
    expect(workflow.concurrency).toBeUndefined();
    expect(workflow.permissions).toEqual({ actions: "read", contents: "read", "pull-requests": "read" });
    const publish = workflow.jobs?.publish;
    const verify = workflow.jobs?.["verify-maintenance"];
    expect(publish?.if).toBe(`\${{ github.ref == 'refs/heads/main' }}`);
    expect(publish?.concurrency).toEqual({ group: "metrics-snapshot-main", "cancel-in-progress": false });
    expect(publish?.["timeout-minutes"]).toBe(15);
    expect(publish?.strategy).toBeUndefined();
    expect(verify?.needs).toBe("publish");
    expect(verify?.concurrency).toBeUndefined();
    expect(verify?.["timeout-minutes"]).toBe(15);
    const steps = (publish?.steps ?? []) as Array<Record<string, unknown>>;
    const checkout = steps.find((step) => String(step.uses ?? "").startsWith("actions/checkout@"));
    expect(checkout?.with).toMatchObject({
      ref: `\${{ github.sha }}`,
      token: `\${{ steps.app-token.outputs.token }}`,
      "persist-credentials": true,
    });
    const resolve = steps.find((step) => step.name === "Resolve pinned source");
    for (const value of [
      "12bf94ea6d7e13a03e124036258a683af3cc8e7e",
      "be381078c32b1babf5880d0f4925ffa690b83f64",
      "509cd43c8c8868569d65e4c6b6d61355cea392c4",
      "bb6cd40e01dfa205e3b58031d1b153c02c315a2f",
      "bc512d9da9a82b39b9f39202bec6b83ef420c971",
      "9fd329632ec608c304f737eecb8a102576731b67",
      "b4eaf5f757d244ed659c8c41468b368adb214be2b503dbf1e97e93b7894fd4a6",
      "2ba42992e0d6844f46d86a6d382c28108b33823880eef2096a845bf38c30a13a",
      "e671dd1a3fdda46b79338d2038657cecb4f940d75159061183d59668d499f768",
      "156bc0931e75fd811534c696078696247ec5c5b223648610e114f429a8e1e11b",
      "7307786719efe2b11d355553c1b39723967e533e94e2ee104502aea962963a8e",
      "f202f7772f4d816a68c2e8b848e6f13c7d3deb01e6c45503f14b74fd9c1ff22a",
      "2026-08-04T04:46:34Z",
      "2026-08-04T05:15:06Z",
      "2026-08-04T07:10:10Z",
      "2026-08-04T10:31:49Z",
      "2026-08-04T11:52:53Z",
      "2026-08-04T12:50:06Z",
    ]) {
      expect(resolve?.run).toContain(value);
    }
    expect(yaml).toContain('[[ "$OBSERVED_RUN_SHA" == "$TARGET_SHA" ]]');
    expect(yaml).toContain('[[ "$OBSERVED_ARTIFACT_DIGEST" == "$ARTIFACT_DIGEST" ]]');
    expect(yaml).toContain('[[ "$ACTUAL_DIGEST" == "$ARTIFACT_DIGEST" ]]');
    expect(yaml).toContain('repos/$GITHUB_REPOSITORY/actions/artifacts/$ARTIFACT_ID/zip');
    expect(yaml).toContain('--captured-at "$CAPTURED_AT"');
    expect(yaml).toContain("Verify landed snapshot");
    expect(yaml).toContain('[[ "$MATCH_COUNT" == "1" ]]');
    expect(yaml).toContain("coverage/coverage-totals.json");
    expect(yaml).toContain("coverage/tests-totals.json");
    expect(yaml).toContain("actions/workflows/metrics-maintenance.yml/runs");
    expect(yaml).toContain('gh run watch "$MAINTENANCE_RUN_ID" --repo "$GITHUB_REPOSITORY" --exit-status');
    // The correlation filter must project $run back out: after `as $run`, jq keeps
    // the original input as `.`, so selects alone would collect the whole response.
    expect(yaml).toContain("| $run]");
    expect(yaml).toContain("BEFORE_MAINTENANCE_RUN_IDS");
    expect(yaml).toContain('"Metrics maintenance for $TARGET_SHA"');
    expect(yaml).toContain('["app/" + $bot_slug, $bot_slug + "[bot]"]');
    expect(yaml).toContain("application/vnd.github.raw+json");
    expect(yaml).toContain("refs/heads/metrics/maintenance");
    expect(yaml).toContain('--state open --head "metrics/maintenance"');
  });
});
