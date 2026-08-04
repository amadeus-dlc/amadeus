import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const PBT_WORKFLOW_PATH = ".github/workflows/pbt.yml";
const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";

interface WorkflowStep {
  readonly env?: Readonly<Record<string, string>>;
  readonly run?: string;
}

interface WorkflowJob {
  readonly "runs-on"?: string;
  readonly "timeout-minutes"?: number;
  readonly env?: Readonly<Record<string, string>>;
  readonly steps?: readonly WorkflowStep[];
}

interface Workflow {
  readonly name?: string;
  readonly on?: {
    readonly schedule?: readonly { readonly cron?: string }[];
    readonly workflow_dispatch?: unknown;
  };
  readonly concurrency?: {
    readonly group?: string;
    readonly "cancel-in-progress"?: boolean;
  };
  readonly permissions?: Readonly<Record<string, string>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

const EXPECTED_TARGETS = [
  "tests/unit/t416-election-model-roundtrip.pbt.test.ts",
  "tests/integration/t417-election-store-failclosed.pbt.test.ts",
  "tests/unit/t418-state-receipts-codec.pbt.test.ts",
  "tests/unit/t419-state-field-codec.pbt.test.ts",
  "tests/unit/t274-amadeus-mirror-state-codec.test.ts",
] as const;

describe("scheduled deep PBT workflow", () => {
  test("is independent from blocking CI and supports daily plus manual runs", () => {
    expect(existsSync(PBT_WORKFLOW_PATH)).toBe(true);
    const workflow = Bun.YAML.parse(readFileSync(PBT_WORKFLOW_PATH, "utf8")) as Workflow;
    const ciSource = readFileSync(CI_WORKFLOW_PATH, "utf8");

    expect(workflow.name).toBe("Property-based testing");
    expect(workflow.on?.schedule).toEqual([{ cron: "17 18 * * *" }]);
    expect(workflow.on).toHaveProperty("workflow_dispatch");
    expect(workflow.concurrency).toEqual({ group: "pbt-deep", "cancel-in-progress": false });
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(ciSource).not.toContain("  pbt-deep:");
  });

  test("preserves the deep budget, target set, and complete-run guard", () => {
    const workflow = Bun.YAML.parse(readFileSync(PBT_WORKFLOW_PATH, "utf8")) as Workflow;
    const job = workflow.jobs?.["pbt-deep"];
    const runStep = job?.steps?.find((step) => step.env?.AMADEUS_PBT_DEEP === "1");
    const targets = job?.env?.PBT_DEEP_PATHS?.trim().split("\n");

    expect(job?.["runs-on"]).toBe("ubuntu-latest");
    expect(job?.["timeout-minutes"]).toBe(5);
    expect(targets).toEqual(EXPECTED_TARGETS);
    expect(runStep?.run).toContain("bun test --timeout=30000");
    expect(job?.steps?.some((step) => step.run?.includes("deep run covered all"))).toBe(true);
  });
});
