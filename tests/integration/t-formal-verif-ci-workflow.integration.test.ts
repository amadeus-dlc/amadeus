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

describe("U4 CI workflow structure", () => {
  test("contains only the permitted U4 edits and an isolated pinned formal job", () => {
    const source = readFileSync(WORKFLOW, "utf8");
    expect(inspectCiWorkflow(source, BASELINE_SHA, existsSync(LEGACY))).toEqual([]);
  });

  test("falls when event isolation, action pinning, or legacy retirement regresses", () => {
    const source = readFileSync(WORKFLOW, "utf8");
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
