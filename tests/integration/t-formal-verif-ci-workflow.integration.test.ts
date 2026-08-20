import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import {
  inspectCiWorkflow,
} from "../formal-verif/support/ci-workflow-contract.ts";

const WORKFLOW = ".github/workflows/ci.yml";
const LEGACY = ".github/workflows/formal-verification.yml";
const BASELINE_SHA = readFileSync(
  "tests/fixtures/formal-verif-ci-baseline.sha256",
  "utf8",
).trim().split(/\s+/)[0]!;

// The baseline SHA pins ci.yml OUTSIDE the three regions normalizedCiBaseline
// strips (the formal job block, the workflow_dispatch line, the empty-base
// branch), so every sanctioned edit elsewhere in the file re-baselines the
// fixture. Recorded re-baselines:
//   - Issue #3049: add the blocking coverage-registry job and ci-success dependency;
//   - 260725-mirror-review-fixes: the Mirror CI job (rebase integration);
//   - 260729-otel-upstream U7: the lint job's callsite-guard step, placed in
//     the lint job per the E-U7CG-Q1 ruling (guard lives in tests/, CI runs it
//     as one lint step). The pin's protective property is unchanged — an
//     UNSANCTIONED ci.yml edit still flips the hash (proven below).
//   - 260729-otel-upstream U8: the lint job's deletion-gate step and its report
//     upload (FR-MIG-4 asks for the gate to be machine-verified in CI, BR-16
//     for the report to be retrievable). Placed beside the callsite-guard step
//     for the same reason — the gate lives in tests/ and CI runs it as one
//     lint step.
//   - 260801-open-bug-batch-5 (#1863): the drift-check job's compiled-graph
//     drift step (`amadeus-graph compile --check` over the real repository
//     section). Placed in drift-check because it IS a drift guard, and
//     because reusing that job leaves ci-success's needs set — and t222's pin
//     on it — untouched.
//   - 260802-record-roundtrip-pbt U4 (#1980): the lint job's unchecked-cast
//     guard step (FR-3a, the shrink-only ratchet over `JSON.parse(...) as T`).
//     Placed beside the call-site guard for the same reason the U7 entry above
//     gives — the guard lives in tests/ and CI runs it as one lint step, so
//     ci-success's needs set is again untouched.
//   - 260802-record-roundtrip-pbt U5 (#1980): the manual `pbt-deep` job, which
//     runs this Intent's PBT under the AMADEUS_PBT_DEEP=1 budget (FR-5a).
//   - 260801-silent-drop-gate: the lint job's blocking semantic no-silent-drop
//     invocation, kept in lint so ci-success retains its existing needs set.
//   - 260801-silent-drop-gate review follow-up: normalize GitHub's all-zero
//     push before-SHA to the baseline-less path and disable checkout credential
//     persistence in the tests job.
//   - 260802-source-only-dist u7: build-before-test steps, the blocking
//     reproducible-build job, and its ci-success dependency;
//   - 260802-source-only-dist u8: the atomic source-only boundary and semantic
//     graph-invariant checks replacing committed generated-tree comparisons;
//   - 260802-source-only-dist u8 CI follow-up: build-before-use steps for the
//     typecheck, lint deletion-gate, and distribution-contract jobs.
//   - 260803-source-only-dist review follow-up: disable checkout credential
//     persistence in the drift-check job.
//   - 260804-source-only-dist CI follow-up: fetch the pull request base before
//     evaluating patch coverage against its remote-tracking ref.
//   - 260804-scheduled-pbt: move the non-blocking deep PBT job out of ci.yml and
//     into its own daily/manual workflow, matching the performance tier's
//     operational boundary.
//   - 260804-metrics-snapshot-auth (#2182): preserve the short-lived GitHub App
//     credential in the metrics-snapshot write job until its plain git push.
//   - Issue #2186: require both absolute and merge-base-relative project
//     coverage before the patch coverage gate runs.
//   - PR #2205 (bugs collector): grant the metrics App token issues:read so
//     the snapshot job's `bugs` collector can query the Search API.
//   - Issue #2112 (cast-guard chain rule): the guard's comment named the
//     remaining-debt count literally ("the existing 33"). Fixing the
//     over-count changes that number, so the comment now names the debt
//     without a literal count.
//   - Issue #2814 (control-byte gate): the always-run `control-byte-gate` job.
//     It carries no `needs` and no `if` on purpose — a path filter would excuse
//     exactly the changes the gate exists to catch — so it is an independent
//     job rather than a lint step.
//     Re-baselined once more in the same PR to add `persist-credentials: false`
//     to that job's checkout, matching the jobs that already disable credential
//     persistence: the job runs PR-authored code, so the token must not sit in
//     the local git config while it does.
//     Re-baselined again (FR-CBG-7 follow-up): the job is now in ci-success's
//     needs with an unconditional require_result. Independence from `changes`
//     is about *when the job runs*; membership in ci-success is about *whether
//     a red run blocks the merge*. The earlier note conflated the two and left
//     the gate advisory — "CI Success" is this repository's only required
//     status check, so a job outside its needs cannot block anything.
//   - Review-thread resolution gate: add the PR-only reusable-workflow job,
//     make CI Success fail when unresolved review feedback remains, and ignore
//     Cursor's author-scoped usage-limit notification.
//   - 260810-test-time-factor: the test, plugin-conformance, coverage-head, and
//     coverage-base jobs set TEST_TIME_FACTOR=2, runner-bypass tests resolve a
//     scaled Bun timeout, and lint runs the timing-sink guard.
//   - Merge Queue CI: trigger required checks for merge groups and resolve the
//     changed-file and no-silent-drop bases from the event's trusted SHAs.
//   - #2363 (pi self-install): add `.pi` to the reproducible-build job's
//     GENERATED_OUTPUTS. promote-self now reflects dist/pi/.pi into the project
//     root, so `.pi` is a generated tree the two isolated builds must agree on;
//     omitting it would leave the newest promoted surface unchecked for
//     reproducibility. Re-baseline scope was measured, not assumed: reverting
//     that single line from ci.yml reproduces the previous baseline hash
//     (57a395d1f0d1…) exactly, so this entry sanctions that edit and nothing else.
//   - #1983 (merge-time revalidation): re-baseline the merge_group-triggered
//     coverage and patch-gate execution against the queue base SHA.
describe("CI workflow structure (formal job isolation + baseline pin)", () => {
  test("contains only the sanctioned edits and an isolated pinned formal job", () => {
    const source = readFileSync(WORKFLOW, "utf8");
    expect(inspectCiWorkflow(source, BASELINE_SHA, existsSync(LEGACY))).toEqual([]);
  });

  test("falls when event isolation, action pinning, or legacy retirement regresses", () => {
    const source = readFileSync(WORKFLOW, "utf8");
    // Re-baselining after a sanctioned edit must not weaken the pin: an
    // UNSANCTIONED edit outside the three normalized regions still flips the
    // hash. Without this, a stale-baseline update would pass vacuously.
    expect(inspectCiWorkflow(
      source.replace("    name: Lint and complexity", "    name: Lint and complexity (unsanctioned edit)"),
      BASELINE_SHA,
      false,
    )).toContain("changes outside the three permitted U4 edits");
    expect(inspectCiWorkflow(
      source.replace(
        "github.event_name == 'workflow_dispatch'",
        "github.event_name != 'pull_request'",
      ),
      BASELINE_SHA,
      false,
    )).toContain("formal job event condition drifted");
    expect(inspectCiWorkflow(
      source.replace(
        "id: formal-upload\n        if: always()\n        continue-on-error: true\n        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4",
        "id: formal-upload\n        if: always()\n        continue-on-error: true\n        uses: actions/upload-artifact@v4",
      ),
      BASELINE_SHA,
      false,
    )).toContain("upload action is not pinned");
    expect(inspectCiWorkflow(source, BASELINE_SHA, true)).toContain(
      "legacy formal-verification.yml still exists",
    );
    expect(inspectCiWorkflow(
      source.replace("id: formal-upload\n        if: always()", "id: formal-upload"),
      BASELINE_SHA,
      false,
    )).toContain("always artifact upload contract drifted");
    expect(inspectCiWorkflow(
      source.replace(
        "  ci-success:\n    name: CI Success\n    runs-on: ubuntu-latest\n    needs:\n      - changes",
        "  ci-success:\n    name: CI Success\n    runs-on: ubuntu-latest\n    needs:\n      - formal-model-check\n      - changes",
      ),
      BASELINE_SHA,
      false,
    )).toContain("ci-success must not depend on formal job");
  });

  test("falls closed for every pinned runtime, command, and trigger boundary", () => {
    const source = readFileSync(WORKFLOW, "utf8");
    for (const [needle, replacement, finding] of [
      [
        "id: formal-checkout\n        continue-on-error: true\n        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
        "id: formal-checkout\n        continue-on-error: true\n        uses: actions/checkout@invalid # v4",
        "checkout action is not pinned",
      ],
      [
        "id: formal-setup-bun\n        if: always()\n        continue-on-error: true\n        uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2",
        "id: formal-setup-bun\n        if: always()\n        continue-on-error: true\n        uses: oven-sh/setup-bun@invalid # v2",
        "Bun action or version is not pinned",
      ],
      ["id: formal-acceptance\n        if: always()", "id: formal-acceptance", "always evidence or terminal flow drifted"],
      ["run-model-check-ci.ts run", "run-model-check-ci.ts invalid", "formal acceptance, verification, or terminal command is missing"],
      [
        "formal-model-check:\n    name: Formal model check\n    if: github.event_name == 'workflow_dispatch'\n    runs-on: ubuntu-latest",
        "formal-model-check:\n    name: Formal model check\n    if: github.event_name == 'workflow_dispatch'\n    runs-on: windows-latest",
        "formal job runtime or permissions drifted",
      ],
      ["workflow_dispatch: {}", "manual_dispatch: {}", "workflow_dispatch trigger is missing"],
    ] as const) {
      expect(inspectCiWorkflow(source.replace(needle, replacement), BASELINE_SHA, false)).toContain(finding);
    }
    expect(inspectCiWorkflow("not: [valid", BASELINE_SHA, false)).toEqual([
      "ci.yml is not valid YAML",
    ]);
  });
});
