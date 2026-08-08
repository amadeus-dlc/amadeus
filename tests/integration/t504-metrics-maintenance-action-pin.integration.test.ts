import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("t504 metrics-maintenance action pin", () => {
  test("every step that mints or spends the privileged App token is SHA-pinned", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/metrics-maintenance.yml"), "utf8");
    const workflow = Bun.YAML.parse(yaml) as {
      jobs: Record<
        string,
        {
          steps: Array<{
            name?: string;
            uses?: string;
          }>;
        }
      >;
    };

    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/@[0-9a-f]{40}(\s*#.*)?$/);
      }
    }
  });

  test("the App-token step still pins the same SHA the other privileged workflows use", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/metrics-maintenance.yml"), "utf8");

    expect(yaml).toContain(
      "uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3",
    );
  });
});
