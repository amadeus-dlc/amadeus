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
//     Added to ci.yml rather than as its own workflow because ci.yml already
//     carries the same shape (formal-model-check is workflow_dispatch-only and
//     absent from ci-success's needs), and a second workflow file would be the
//     duplicate-generation this repo avoids. Left out of ci-success's needs so
//     it stays non-blocking (FR-5b) and t222's pin stays untouched.
//   - 260801-silent-drop-gate: the lint job's blocking semantic no-silent-drop
//     invocation, kept in lint so ci-success retains its existing needs set.
//   - 260801-silent-drop-gate review follow-up: normalize GitHub's all-zero
//     push before-SHA to the baseline-less path and disable checkout credential
//     persistence in the tests job.
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
      source.replace(/actions\/upload-artifact@[0-9a-f]{40}/, "actions/upload-artifact@v4"),
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
        "actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
        "actions/checkout@invalid # v4",
        "checkout action is not pinned",
      ],
      [
        "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2",
        "oven-sh/setup-bun@invalid # v2",
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
