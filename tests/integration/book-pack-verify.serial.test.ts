// book-pack drift guard: the book pack (book-pack/) is a passive data
// directory whose apply/verify scripts depend on engine couplings that no
// other gate watches — the bolt_dag fixed artifact path, artifact-producer
// uniqueness, the `for_each` per-unit contract, stage-number bootstrap /
// renumber semantics, the scope transpose, and the frontmatter schema. A
// framework change can break the pack without touching any shipped surface,
// so this test runs the pack's own deterministic verifier (which builds a
// throwaway workspace under the system temp dir, applies the pack, and
// asserts checks A-F) against the current tree on every CI run.
// Provenance: amadeus-dlc/amadeus#643 (ruling), PR #1339 (pack landing).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const VERIFY_SH = join(REPO_ROOT, "book-pack", "scripts", "verify-dummy.sh");
const VERIFIER_TIMEOUT_MS = 180_000;
const CLEANUP_RESERVE_MS = 30_000;
const TEST_TIMEOUT_MS = VERIFIER_TIMEOUT_MS + CLEANUP_RESERVE_MS;

function runVerifier(
  command: string,
  args: string[],
  timeout: number,
): ReturnType<typeof spawnSync> & { durationMs: number } {
  const startedAt = performance.now();
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    timeout,
    // Explicit env snapshot: bun does not fold runtime process.env
    // mutations into children automatically (bun-spawn-env-snapshot).
    env: process.env,
  });
  return { ...result, durationMs: performance.now() - startedAt };
}

describe("book-pack verify-dummy (engine-coupling drift guard)", () => {
  test("the outer test budget contains the verifier deadline and cleanup reserve", () => {
    expect(VERIFIER_TIMEOUT_MS + CLEANUP_RESERVE_MS).toBeLessThanOrEqual(TEST_TIMEOUT_MS);
  });

  test("a controlled child delay is reported as a verifier timeout", () => {
    const result = runVerifier("bash", ["-c", "sleep 1"], 10);

    expect(result.status).toBeNull();
    expect(result.signal).toBe("SIGTERM");
    expect((result.error as NodeJS.ErrnoException | undefined)?.code).toBe("ETIMEDOUT");
  });

  test("all pack checks pass against the current framework tree", () => {
    const r = runVerifier("bash", [VERIFY_SH, REPO_ROOT], VERIFIER_TIMEOUT_MS);
    if (r.status !== 0) {
      console.error("verify-dummy outcome:", {
        status: r.status,
        signal: r.signal,
        error: r.error?.message,
        durationMs: r.durationMs,
      });
      console.error("verify-dummy stdout:\n", r.stdout);
      console.error("verify-dummy stderr:\n", r.stderr);
    }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ALL CHECKS PASSED");
  }, TEST_TIMEOUT_MS);
});
