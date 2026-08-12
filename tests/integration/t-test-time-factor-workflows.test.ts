import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Workflow = {
  jobs?: Record<string, {
    env?: Record<string, unknown>;
    steps?: Array<{ run?: string }>;
  }>;
};

const WORKFLOW_DIR = join(import.meta.dir, "..", "..", ".github", "workflows");

function workflow(name: string): Workflow {
  return Bun.YAML.parse(readFileSync(join(WORKFLOW_DIR, name), "utf8")) as Workflow;
}

function expectFactor(name: string, jobs: string[]): void {
  const parsed = workflow(name);
  for (const job of jobs) {
    expect(parsed.jobs?.[job]?.env?.TEST_TIME_FACTOR, `${name}:${job}`).toBe("2");
  }
}

function workflowCommands(name: string, job: string): string {
  return workflow(name).jobs?.[job]?.steps?.map((step) => step.run ?? "").join("\n") ?? "";
}

describe("CI test-time factor wiring", () => {
  test("the runner-bypass CLI prints the shared scaled timeout", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, "tests/test-timeout-ms.ts", "30000"],
      env: { ...process.env, TEST_TIME_FACTOR: "2" },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toBe("60000\n");
  });

  test("normal and coverage CI jobs use factor two", () => {
    expectFactor("ci.yml", ["plugin-conformance-e2e", "tests", "coverage-head", "coverage-base"]);
  });

  test("deep PBT and release tests use factor two", () => {
    expectFactor("pbt.yml", ["pbt-deep"]);
    expectFactor("release.yml", ["build-dist"]);
  });

  test("CI runs the fixed timing sink guard", () => {
    expect(readFileSync(join(WORKFLOW_DIR, "ci.yml"), "utf8")).toContain(
      "bun tests/test-time-factor-guard.ts",
    );
  });

  test("runner-bypass PBT and plugin tests pass the shared scaled timeout to Bun", () => {
    const scaledTimeout = '$(bun tests/test-timeout-ms.ts 30000)';
    expect(workflowCommands("pbt.yml", "pbt-deep")).toContain(`--timeout="${scaledTimeout}"`);
    expect(workflowCommands("ci.yml", "plugin-conformance-e2e")).toContain(
      `--timeout="${scaledTimeout}"`,
    );
  });
});
