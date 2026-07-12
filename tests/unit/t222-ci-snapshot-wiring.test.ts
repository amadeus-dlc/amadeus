import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
const job = yaml.split("  metrics-snapshot:")[1].split("\n  codecov-status:")[0];
const coverageJob = yaml.split("  coverage:")[1].split("\n  metrics-snapshot:")[0];
const uploadStep = coverageJob.split("      - name: Upload coverage artifact")[1].split("\n      - name: Upload coverage to Codecov")[0];
describe("t222 CI snapshot wiring", () => {
  test("main push guard", () => expect(job).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'"));
  test("write permission", () => expect(job).toContain("contents: write"));
  test("fixed concurrency queue", () => { expect(job).toContain("group: metrics-snapshot-main"); expect(job).toContain("queue: max"); expect(job).toContain("cancel-in-progress: false"); });
  test("five minute timeout", () => expect(job).toContain("timeout-minutes: 5"));
  test("named artifact", () => expect(job).toContain("name: amadeus-coverage-report"));
  test("no secrets", () => expect(job).not.toContain("secrets."));
  test("ci-success does not depend on snapshot", () => expect(yaml.split("  ci-success:")[1]).not.toContain("metrics-snapshot"));
  test("totals belong to the named coverage artifact upload step", () => {
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
