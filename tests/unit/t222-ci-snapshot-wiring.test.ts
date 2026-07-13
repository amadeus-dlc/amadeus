import { describe, expect, test } from "bun:test";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

const yaml = `  coverage:
      - name: Upload coverage artifact
        name: amadeus-coverage-report
        path: |
          coverage/coverage-totals.json
          coverage/tests-totals.json
      - name: Upload coverage to Codecov
  metrics-snapshot:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: write
    concurrency:
      group: metrics-snapshot-main
      queue: max
      cancel-in-progress: false
    timeout-minutes: 5
    name: amadeus-coverage-report
  codecov-status:
  ci-success:
    needs: [coverage]
`;
const { job, uploadStep, ciSuccess } = extractCiSnapshotWiring(yaml);
describe("t222 CI snapshot wiring", () => {
  test("main push guard", () => expect(job).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'"));
  test("write permission", () => expect(job).toContain("contents: write"));
  test("fixed concurrency queue", () => { expect(job).toContain("group: metrics-snapshot-main"); expect(job).toContain("queue: max"); expect(job).toContain("cancel-in-progress: false"); });
  test("five minute timeout", () => expect(job).toContain("timeout-minutes: 5"));
  test("named artifact", () => expect(job).toContain("name: amadeus-coverage-report"));
  test("no secrets", () => expect(job).not.toContain("secrets."));
  test("ci-success does not depend on snapshot", () => expect(ciSuccess).not.toContain("metrics-snapshot"));
  test("totals belong to the named coverage artifact upload step", () => {
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
