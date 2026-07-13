import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

describe("t222 CI snapshot branch boundary", () => {
  test("repository workflow stages snapshots for review", () => {
    const yaml = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");
    const { job, uploadStep, ciSuccess } = extractCiSnapshotWiring(yaml);
    expect(job).toContain("github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(job).toContain("contents: write");
    expect(job).toContain("group: metrics-snapshot-main");
    expect(job).toContain("queue: max");
    expect(job).toContain("cancel-in-progress: false");
    expect(job).toContain("timeout-minutes: 5");
    expect(job).toContain("name: amadeus-coverage-report");
    expect(job).not.toContain("secrets.");
    expect(job).toContain('branch="metrics/snapshot-${GITHUB_SHA:0:12}"');
    expect(job).toContain('git push origin "HEAD:refs/heads/$branch"');
    expect(job).toContain("/compare/main...$branch?expand=1");
    expect(job).not.toContain("HEAD:main");
    expect(ciSuccess).not.toContain("metrics-snapshot");
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
});
