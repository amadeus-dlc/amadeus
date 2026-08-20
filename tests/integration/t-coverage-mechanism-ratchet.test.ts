// t-coverage-mechanism-ratchet.test.ts — guards repository-wide mechanism honesty.
// Unlike the synthetic contract fixtures, these tests scan committed test sources and
// compare them with the pinned CLI surface and generated coverage registry.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

import {
  mechanismOfTestFile,
  mechanismsOf,
} from "../gen-coverage-registry.ts";

const TESTS_DIR = join(import.meta.dir, "..");
const REPO_ROOT = join(TESTS_DIR, "..");

type RecordedMechanisms = Map<string, Set<string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addRecordedMechanism(
  pairs: RecordedMechanisms,
  claim: unknown,
): void {
  if (!isRecord(claim)) return;
  const { file, mechanism } = claim;
  if (typeof file !== "string" || typeof mechanism !== "string") return;
  const mechanisms = pairs.get(file) ?? new Set<string>();
  mechanisms.add(mechanism);
  pairs.set(file, mechanisms);
}

function collectRecordedMechanisms(
  node: unknown,
  pairs: RecordedMechanisms,
): void {
  if (Array.isArray(node)) {
    for (const value of node) collectRecordedMechanisms(value, pairs);
    return;
  }
  if (!isRecord(node)) return;
  if (Array.isArray(node.coveredBy)) {
    for (const claim of node.coveredBy) addRecordedMechanism(pairs, claim);
  }
  for (const value of Object.values(node)) {
    collectRecordedMechanisms(value, pairs);
  }
}

describe("repository-wide mechanism honesty ratchets", () => {
  // Recursively list every t*.test.ts under tests/ (the level dirs + harness).
  // Tier-list-independent on purpose: the design discovers a test by its living
  // in a directory, so this walk mirrors that rather than hard-coding TEST_TIERS.
  function allTestTsFiles(root: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(root, { withFileTypes: true })) {
      const p = join(root, e.name);
      if (e.isDirectory()) {
        // Skip the transient run-output + node_modules; everything else is fair game.
        if (e.name === "logs" || e.name === "node_modules") continue;
        out.push(...allTestTsFiles(p));
      } else if (e.name.endsWith(".test.ts")) {
        out.push(p);
      }
    }
    return out;
  }

  function testsRelativePath(abs: string): string {
    return relative(TESTS_DIR, abs).replace(/\\/g, "/");
  }

  // (b) The milestone 3 reclassification set — MEASURED off disk, pinned here. A file is
  // a none->cli reclassification when its filename segment says `none` but its
  // body derives `cli` (a deterministic tool/hook/runner subprocess). If the
  // predicate regresses (misses a spawn, or false-positives an import-only floor
  // test), this list changes and the test reds — naming exactly which file moved.
  //
  // MAINTENANCE (read before you touch this): this pin is a deliberate manual
  // ratchet. When a later PR adds or rewrites a DETERMINISTIC test that spawns an
  // amadeus-*.ts tool / a hook / run-tests.sh under the Bun runtime (milestone 4's
  // floor rewrites and milestone 5's .sh->bun ports will do exactly this), that file is a
  // new none->cli member and this test WILL red. That red is correct — add the
  // new file's tests/-relative path to this array (the failure message prints the
  // exact path that moved). Do NOT relax the assertion; the whole point is that a
  // new spawning test cannot silently change the cli surface without a human edit.
  //
  // MR6 NOTE: the suffix drop removed every `.cli`/`.none` filename segment, so
  // mechanismOfTestFile now seeds `none` for ALL suffix-free files. The set below
  // is therefore the FULL cli-spawner list (every .test.ts whose body derives cli
  // from a suffix-free name) — the former `.cli`-suffixed spawners joined the set
  // when their segment stopped saying cli. Same predicate, same honesty ratchet:
  // a new spawning test still cannot land without a human edit here.
  const EXPECTED_NONE_TO_CLI = [
    "integration/t-bare-state-env-isolation.integration.test.ts",
    "integration/t485-subagent-model-guard.integration.test.ts",
    "integration/t481-autonomy-canonical-state-write.integration.test.ts",
    "integration/t495-autonomy-projection-integrity.integration.test.ts",
    "integration/t482-autonomy-refusal-event.integration.test.ts",
    "integration/t483-preview-non-auto-kinds.integration.test.ts",
    "integration/t488-question-route-observability.integration.test.ts",
    "integration/t487-stage-stats.integration.test.ts",
    "integration/t500-resync-last-updated-preservation.test.ts",
    "integration/t506-merge-held-lock-bucket.integration.test.ts",
    "integration/t511-blocking-sensor-gate.integration.test.ts",
    "integration/t514-codex-mint-presence-chain.integration.test.ts",
    "integration/t519-scope-sizing-sensor.integration.test.ts",
    "integration/t522-autonomy-projection-lock.integration.test.ts",
    "integration/t533-per-unit-consume-fanout.integration.test.ts",
    "integration/t533-pr-convergence-enforcement.integration.test.ts",
    "integration/t540-full-autonomy-referee-failure.integration.test.ts",
    "integration/t555-election-v2-directive-executor.integration.test.ts",
    "integration/t558-election-distribution-packaging.integration.test.ts",
    "integration/t561-interactive-carveout.integration.test.ts",
    "e2e/t-formal-verif-model-completeness-sensor.test.ts",
    "e2e/t-live-llm-ts-tool-journey.serial.test.ts",
    "e2e/t237-election-walking-skeleton.test.ts",
    "e2e/t265-engine-boundary.test.ts",
    "e2e/t341-plugin-conformance-journey.serial.test.ts",
    "integration/t241-election-machine-executor.integration.test.ts",
    "integration/t258-lifecycle-transaction.test.ts",
    "integration/t259-guard-integration.test.ts",
    "integration/t270-harness-provenance-birth.test.ts",
    "integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts",
    "integration/t296-hook-launch-and-worktree-resolution.test.ts",
    "integration/t299-plugin-cli-walking-skeleton.integration.test.ts",
    "integration/t2997-git-drift-sensor.integration.test.ts",
    "integration/t3016-park-provenance.integration.test.ts",
    "integration/t-merge-provenance-record.integration.test.ts",
    "integration/t3120-grant-ceremony-preview-command.integration.test.ts",
    "integration/t3181-issue-evidence-fetch.integration.test.ts",
    "integration/t3181-issue-evidence-upstream-coverage.integration.test.ts",
    "integration/hook-dispatcher.integration.test.ts",
    "integration/t-advisory-choice-record.test.ts",
    "integration/t-codex-hooks-migration.test.ts",
    "integration/t-codex-hooks-ownership.test.ts",
    "integration/t-codex-hooks-packaged-consumer.test.ts",
    "integration/t-eoc1-gate-evidence.test.ts",
    "integration/t-formal-verif-plugin-lifecycle.integration.test.ts",
    "integration/t-log-subagent-start.integration.test.ts",
    "integration/t-norm-metrics.test.ts",
    "integration/t-otel-bolt-context-marker.test.ts",
    "integration/t-otel-resource.test.ts",
    "integration/t224-state-set-failclosed.test.ts",
    "integration/t233-set-status-retreat-guard.integration.test.ts",
    "integration/t2326-gating-env-independence.integration.test.ts",
    "integration/t-practices-promote-contract.test.ts",
    "integration/t-sensor-fire-hardening.test.ts",
    "integration/t435-intent-autonomy-production.integration.test.ts",
    "integration/t-transition-guard-audit.test.ts",
    "integration/t102.test.ts",
    "integration/t104.test.ts",
    "integration/t105.test.ts",
    "integration/t106.test.ts",
    "integration/t111-session-skills-contract.test.ts",
    "integration/t112.serial.test.ts",
    "integration/t118.test.ts",
    "integration/t120-classify-roundtrip.test.ts",
    "integration/t121-stop-hook-enforce.test.ts",
    "integration/t1241-waiting-engine.integration.test.ts",
    "integration/t195-stop-hook-compose-carveout.test.ts",
    "integration/t127-single-stage-invariant.test.ts",
    "integration/t128-custom-runner.test.ts",
    "integration/t130-scope-runners.test.ts",
    "integration/t131-hooks-settings-fire.test.ts",
    "integration/t135-invoke-swarm.test.ts",
    "integration/t136.test.ts",
    "integration/t137.test.ts",
    "integration/t145-state-lock-concurrency.test.ts",
    "integration/t162-per-intent-layout-cli.test.ts",
    "integration/t164-shard-ordering-and-lock-bucket.test.ts",
    "integration/t165-intent-birth-p4.test.ts",
    "integration/t166-multi-repo-construction.test.ts",
    "integration/t171-birth-gate-registry.test.ts",
    "integration/t172-migration-audit-trail.test.ts",
    "integration/t173-session-switch-restamp.test.ts",
    "integration/t175-space-create-memory-isolation.test.ts",
    "integration/t185-stage-artifact-guard.test.ts",
    "integration/t212-optional-produces.test.ts",
    "integration/t214-engine-error-logged.test.ts",
    "integration/t215-docs-only-exemption.test.ts",
    "integration/t222-migration-routing.test.ts",
    "integration/t21b.test.ts",
    "integration/t224-upstream-v2-migration-cli.test.ts",
    "integration/t225-upstream-v2-migration-preflight.test.ts",
    "integration/t227-codex-migration-walking-skeleton.test.ts",
    "integration/t231-harness-hook-correctness.test.ts",
    "integration/t245-reviewer-protocol-production-path.test.ts",
    "integration/t246-routing-and-autonomy-guards.test.ts",
    "integration/t247-runtime-recovery.test.ts",
    "integration/t248-stage-contract-routing.test.ts",
    "integration/t249-workspace-inspection.test.ts",
    "integration/t250-unit-iteration-and-scope-preview.test.ts",
    "integration/t256-state-intent-selector.test.ts",
    "integration/t265-engine-boundary.integration.test.ts",
    "integration/t31-help.test.ts",
    "integration/t3116-semi-answer-presence.integration.test.ts",
    "integration/t3116-walking-skeleton-stance.integration.test.ts",
    "integration/t3121-completion-report.integration.test.ts",
    "integration/t328-adapter-auto-compose-launch.integration.test.ts",
    "integration/t33-hook-concurrency.test.ts",
    "integration/t356-journal-convert.test.ts",
    "integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts",
    "integration/t365-kimi-reviewer-boundary.integration.test.ts",
    "integration/t366-amadeus-finding-cli.integration.test.ts",
    "integration/t367-degrade-unitname-resolution.test.ts",
    "integration/t371-intent-initialized-boundary.test.ts",
    "integration/t378-hook-canonical-emit.test.ts",
    "integration/t382-sensor-canonical-emit.test.ts",
    "integration/t384-otel-callsite-migration-subprocess.test.ts",
    "integration/t39.test.ts",
    "integration/t393-birth-autonomy-field.integration.test.ts",
    "integration/t394-compose-state-resync.integration.test.ts",
    "integration/t406-compose-host-graph-guard.test.ts",
    "integration/t399-bolt-dag-outcome.test.ts",
    "integration/t404-bolt-emit-audit-fatal-latch.test.ts",
    "integration/t407-resync-noop-detection.test.ts",
    "integration/t410-host-graph-shape-validation.test.ts",
    "integration/t411-compose-invalid-graph-visibility.test.ts",
    "integration/t414-bolt-partial-merge-recovery.test.ts",
    "integration/t427-goal-reconciliation-completion.integration.test.ts",
    "integration/t453-await-completion-directive.integration.test.ts",
    "integration/t428-goal-revision-authority.integration.test.ts",
    "integration/t429-legacy-goal-migration.integration.test.ts",
    "integration/t433-autonomy-review-observability.test.ts",
    "integration/t45.test.ts",
    "integration/t452-subagent-observability.integration.test.ts",
    "integration/t454-subagent-model-attribution.integration.test.ts",
    "integration/t455-semi-policy-cli.integration.test.ts",
    "integration/t458-advisory-auto-resolution.integration.test.ts",
    "integration/t49.test.ts",
    "integration/t490-birth-declaration.integration.test.ts",
    "integration/t492-autonomy-conduit-parity.integration.test.ts",
    "integration/t51.test.ts",
    "integration/t66.test.ts",
    "integration/t75.test.ts",
    "integration/t78-bolt-worktree-lifecycle.test.ts",
    "integration/t89.test.ts",
    "integration/t90.test.ts",
    "integration/t92.test.ts",
    "integration/t93.test.ts",
    "integration/t95-sensor-fire-hook-feature.test.ts",
    "integration/t96.test.ts",
    "integration/t98.test.ts",
    "integration/t-custom-harness-compile.test.ts",
    "integration/t45-revision-loop.test.ts",
    "integration/t461-kimi-session-start-recovery.integration.test.ts",
    "integration/t461-subagent-stats.integration.test.ts",
    "integration/t462-session-takeover.integration.test.ts",
    "integration/t464-session-takeover-seam.integration.test.ts",
    "integration/t46-parallel-bolt.test.ts",
    "integration/t47-failure-injection.test.ts",
    "integration/t470-advisory-store-recovery.integration.test.ts",
    "integration/t48-runtime-graph-end-to-end.test.ts",
    "integration/t480-declare-units-done.integration.test.ts",
    "integration/t49-bolt-sensor-failures.test.ts",
    "integration/t99-learnings-gate-flow.test.ts",
    "smoke/t05-run-tests-parallel.test.ts",
    "smoke/t130-scope-runners.test.ts",
    "smoke/t86-stage-protocol-section-13.test.ts",
    "e2e/t-tui-custom-harness.serial.test.ts",
    "e2e/t-tui-render-colour.serial.test.ts",
    "unit/t-graph-dispatch-seam.test.ts",
    "unit/t-batch3-orchestrate-spawn.test.ts",
    "unit/t-memory-seed.test.ts",
    "unit/t-sensor-fire-seam.test.ts",
    "unit/t209-worktree-read-anchor.test.ts",
    "unit/t210-adapter-mint-classifier.test.ts",
    "unit/t210-doctor-worktree-anchor.test.ts",
    "unit/t211-log-subagent-complete-gate.test.ts",
    "unit/t213-orchestrate-parked-new-intent.test.ts",
    "unit/t218-import-meta-main-guard.test.ts",
    "unit/t-runtime-dispatch-seam.test.ts",
    "unit/t07-hook-audit-logger.serial.test.ts",
    "unit/t08.test.ts",
    "unit/t09.test.ts",
    "unit/t10-hook-session-start.test.ts",
    "unit/t100-memory-template-lifecycle.test.ts",
    "unit/t103.test.ts",
    "unit/t11.test.ts",
    "unit/t112-delegated-approval.test.ts",
    "unit/t112-learnings-distribution-guard.test.ts",
    "unit/t114-orchestrate-next.test.ts",
    "unit/t115.test.ts",
    "unit/t116-directive-path-resolution.test.ts",
    "unit/t117.test.ts",
    "unit/t118.test.ts",
    "unit/t124-scope-transpose.test.ts",
    "integration/t1241-park-guard-removal.integration.test.ts",
    "unit/t125-scope-files.test.ts",
    "unit/t125.test.ts",
    "unit/t129-stage-runner-drift.test.ts",
    "unit/t13-hook-input-robustness.test.ts",
    "unit/t133-bolt-dag-compile.test.ts",
    "unit/t147-kiro-hook-adapter.test.ts",
    "unit/t149-codex-hook-adapter.test.ts",
    "unit/t155-template-override.test.ts",
    "unit/t158-memory-writer-reader-seam.test.ts",
    "unit/t168-statusline-orientation.test.ts",
    "unit/t169-session-resume-rebind.test.ts",
    "unit/t170-audit-logger-per-intent.test.ts",
    "unit/t179-orchestrate-rollforward-guard.test.ts",
    "unit/t180-kiro-rollforward-seam.test.ts",
    "unit/t182-codekb-placement.test.ts",
    "unit/t184-stage-graph-drift.test.ts",
    "unit/t186-foreach-per-unit-iteration.test.ts",
    "unit/t188-human-presence-gate.test.ts",
    "unit/t190-validate-grid.test.ts",
    "unit/t191-composed-scope-write.test.ts",
    "unit/t194-recompose.test.ts",
    "unit/t198-compose-surfaces.test.ts",
    "unit/t203-codekb-rescan.test.ts",
    "unit/t17.test.ts",
    "unit/t18.test.ts",
    "unit/t19.test.ts",
    "unit/t20.test.ts",
    "unit/t201-runtime-graph-memory-path-record-dir.test.ts",
    "unit/t203-mint-presence-classify.test.ts",
    "unit/t207-worktree-base-freshness.test.ts",
    "unit/t209-kiro-ide-dual-vocab.test.ts",
    "unit/t27.test.ts",
    "unit/t29.test.ts",
    "unit/t30-hook-session-end.test.ts",
    "unit/t31.test.ts",
    "unit/t33.test.ts",
    "unit/t34.test.ts",
    "unit/t35.test.ts",
    "unit/t36.test.ts",
    "unit/t37.test.ts",
    "unit/t38.test.ts",
    "unit/t60.test.ts",
    "unit/t61.test.ts",
    "unit/t63.test.ts",
    "unit/t67.test.ts",
    "unit/t68-version-changelog-sync.test.ts",
    "unit/t72.test.ts",
    "unit/t76.test.ts",
    "unit/t77-bolt-worktree-flags.test.ts",
    "unit/t79.test.ts",
    "unit/t80.test.ts",
    "unit/t81.test.ts",
    "unit/t82-hold-merge-invariant.test.ts",
    "unit/t83-doctor-orphan-worktree.test.ts",
    "unit/t211-doctor-shell-3state.test.ts",
    "unit/t221-doctor-phase-progress.test.ts",
    "unit/t84.test.ts",
    "unit/t85.test.ts",
    "unit/t94-sensor-fire-hook.test.ts",
    "unit/t96.test.ts",
    "unit/t97.test.ts",
    "unit/t208-hook-shard-guards.test.ts",
    "e2e/t113.test.ts",
    "e2e/t92-linter-eslint-roundtrip.test.ts",
    "e2e/t122-stop-hook-e2e.test.ts",
    "e2e/t126-emitter-pairing-cofire.test.ts",
    "e2e/t53.test.ts",
    "e2e/t60-construction-worktrees-enterprise.test.ts",
    "e2e/t61-construction-worktrees-feature.test.ts",
    "e2e/t62-construction-worktrees-mvp.test.ts",
    "e2e/t63-construction-worktrees-poc.test.ts",
    "e2e/t64-construction-worktrees-workshop.test.ts",
    "e2e/t65-construction-worktrees-fix.test.ts",
    "e2e/t66-construction-worktrees-refactor.test.ts",
    "e2e/t67-construction-worktrees-security-patch.test.ts",
    "e2e/t02.test.ts",
    "e2e/t03.test.ts",
    "e2e/t04.test.ts",
    "e2e/t05.test.ts",
    "e2e/t06.test.ts",
    "e2e/t07-audit-fork-merge.test.ts",
    "e2e/t09-halt-and-ask-preservation.test.ts",
    "e2e/t10-halt-and-ask-discard.test.ts",
    "e2e/t11-halt-and-ask-retry-correlation.test.ts",
    "e2e/t12-bolt-runtime-graph-fork.test.ts",
    "e2e/t134-swarm-referee.test.ts",
  ];

  test("the none->cli reclassification set is exactly the deterministic spawners", () => {
    const measured: string[] = [];
    for (const abs of allTestTsFiles(TESTS_DIR)) {
      const base = basename(abs);
      const seg = mechanismOfTestFile(base);
      const set = mechanismsOf(base, readFileSync(abs, "utf-8"));
      if (seg === "none" && set.includes("cli")) {
        measured.push(testsRelativePath(abs));
      }
    }
    expect(measured.sort()).toEqual([...EXPECTED_NONE_TO_CLI].sort());
  });

  // (c) CONSISTENCY — derived == recorded over the committed registry. For
  // every coverage claim, recompute mechanismsOf(source) and require the stored
  // scalar to be a member of that statically derived set.
  test("every recorded mechanism matches its static source classification", () => {
    const registry = JSON.parse(
      readFileSync(join(TESTS_DIR, ".coverage-registry.json"), "utf-8"),
    );
    const pairs: RecordedMechanisms = new Map();
    collectRecordedMechanisms(registry, pairs);

    const mismatches: string[] = [];
    for (const [relFile, recorded] of pairs) {
      // relFile is repo-root-relative (tests/<tier>/<name>); only .test.ts files
      // are body-scannable. .sh claims fall back to the segment and are not the
      // subject of this static source-classification check.
      if (!relFile.endsWith(".test.ts")) continue;
      const abs = join(REPO_ROOT, relFile);
      const base = relFile.split("/").pop() as string;
      const derived = new Set<string>(mechanismsOf(base, readFileSync(abs, "utf-8")));
      for (const mechanism of recorded) {
        if (!derived.has(mechanism)) {
          mismatches.push(
            `${relFile}: recorded ${mechanism}, source derives {${[
              ...derived,
            ].join(",")}}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
