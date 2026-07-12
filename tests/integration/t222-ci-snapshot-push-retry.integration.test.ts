import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pushWithRetry } from "../../scripts/metrics-push-retry.ts";
import { extractCiSnapshotWiring } from "../lib/ci-snapshot-wiring.ts";

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}
function setup() {
  const root = mkdtempSync(join(tmpdir(), "t222-"));
  const remote = join(root, "origin.git");
  const seed = join(root, "seed");
  git(root, ["init", "-q", "--bare", "--initial-branch=main", remote]);
  git(root, ["init", "-q", "--initial-branch=main", seed]);
  git(seed, ["config", "user.email", "test@example.com"]); git(seed, ["config", "user.name", "test"]);
  writeFileSync(join(seed, "base.txt"), "base\n"); git(seed, ["add", "."]); git(seed, ["commit", "-q", "-m", "base"]);
  git(seed, ["remote", "add", "origin", remote]); git(seed, ["push", "-q", "-u", "origin", "main"]);
  const a = join(root, "a"); const b = join(root, "b"); git(root, ["clone", "-q", remote, a]); git(root, ["clone", "-q", remote, b]);
  for (const dir of [a, b]) { git(dir, ["config", "user.email", "test@example.com"]); git(dir, ["config", "user.name", "test"]); }
  return { root, a, b };
}

describe("t222 real git retry boundary", () => {
  test("repository workflow satisfies the snapshot wiring contract", () => {
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
    expect(ciSuccess).not.toContain("metrics-snapshot");
    expect(uploadStep).toContain("name: amadeus-coverage-report");
    expect(uploadStep).toContain("coverage/coverage-totals.json");
    expect(uploadStep).toContain("coverage/tests-totals.json");
  });
  test("a remote advance immediately before first push causes NFF then retry succeeds", () => {
    const fixture = setup();
    try {
      writeFileSync(join(fixture.b, "b.txt"), "b\n"); git(fixture.b, ["add", "."]); git(fixture.b, ["commit", "-q", "-m", "b"]);
      let pushes = 0;
      const attempts = pushWithRetry((args) => {
        if (args[0] === "push" && pushes++ === 0) {
          writeFileSync(join(fixture.a, "a.txt"), "a\n"); git(fixture.a, ["add", "."]); git(fixture.a, ["commit", "-q", "-m", "a"]); git(fixture.a, ["push", "-q"]);
        }
        return git(fixture.b, args);
      });
      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(git(fixture.b, ["rev-list", "--count", "origin/main"]).output.trim()).toBe("3");
    } finally { rmSync(fixture.root, { recursive: true, force: true }); }
  });
  test("rebase conflict fails loudly without retrying push", () => {
    const fixture = setup();
    try {
      writeFileSync(join(fixture.a, "base.txt"), "from-a\n"); git(fixture.a, ["add", "."]); git(fixture.a, ["commit", "-q", "-m", "a"]); git(fixture.a, ["push", "-q"]);
      writeFileSync(join(fixture.b, "base.txt"), "from-b\n"); git(fixture.b, ["add", "."]); git(fixture.b, ["commit", "-q", "-m", "b"]);
      expect(() => pushWithRetry((args) => git(fixture.b, args))).toThrow("rebase failed");
    } finally { rmSync(fixture.root, { recursive: true, force: true }); }
  });
});
