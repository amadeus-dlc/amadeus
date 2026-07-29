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
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const VERIFY_SH = join(REPO_ROOT, "book-pack", "scripts", "verify-dummy.sh");
const VERIFIER_TIMEOUT_MS = 180_000;
const CLEANUP_RESERVE_MS = 30_000;
const OLD_TEST_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = VERIFIER_TIMEOUT_MS + CLEANUP_RESERVE_MS;
const PROBE_VERIFIER_TIMEOUT_MS = 1_000;
const PROBE_CLEANUP_RESERVE_MS = 500;
const PROBE_TEST_TIMEOUT_MS = 1_500;

type LifecycleEvent = {
  event: "child-start" | "child-complete" | "cleanup-start" | "cleanup-complete";
  elapsedMs: number;
};

function hasConsistentTimeoutBudget(
  verifierTimeoutMs: number,
  cleanupReserveMs: number,
  outerTimeoutMs: number,
): boolean {
  return verifierTimeoutMs + cleanupReserveMs <= outerTimeoutMs;
}

function runVerifier(
  command: string,
  args: string[],
  timeout: number,
): SpawnSyncReturns<string> & { durationMs: number } {
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

function parseLifecycleEvents(stdout: string): LifecycleEvent[] {
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LifecycleEvent);
}

describe("book-pack verify-dummy (engine-coupling drift guard)", () => {
  test("the old outer deadline rejects the verifier plus cleanup budget and the new deadline accepts it", () => {
    expect(
      hasConsistentTimeoutBudget(
        VERIFIER_TIMEOUT_MS,
        CLEANUP_RESERVE_MS,
        OLD_TEST_TIMEOUT_MS,
      ),
    ).toBe(false);
    expect(
      hasConsistentTimeoutBudget(
        VERIFIER_TIMEOUT_MS,
        CLEANUP_RESERVE_MS,
        TEST_TIMEOUT_MS,
      ),
    ).toBe(true);
  });

  test("a controlled lifecycle completes child work and cleanup inside one measured outer budget", () => {
    const script = `
      const startedAt = performance.now();
      const emit = (event) => console.log(JSON.stringify({
        event,
        elapsedMs: performance.now() - startedAt,
      }));
      emit("child-start");
      setTimeout(() => {
        emit("child-complete");
        emit("cleanup-start");
        setTimeout(() => emit("cleanup-complete"), 10);
      }, 20);
    `;
    const result = runVerifier(
      process.execPath,
      ["-e", script],
      PROBE_VERIFIER_TIMEOUT_MS,
    );
    const events = parseLifecycleEvents(result.stdout);

    expect(result.status).toBe(0);
    expect(events.map(({ event }) => event)).toEqual([
      "child-start",
      "child-complete",
      "cleanup-start",
      "cleanup-complete",
    ]);
    expect(events.at(-1)?.elapsedMs).toBeLessThan(PROBE_VERIFIER_TIMEOUT_MS);
    expect(result.durationMs).toBeLessThan(PROBE_TEST_TIMEOUT_MS);
    expect(
      hasConsistentTimeoutBudget(
        PROBE_VERIFIER_TIMEOUT_MS,
        PROBE_CLEANUP_RESERVE_MS,
        PROBE_TEST_TIMEOUT_MS,
      ),
    ).toBe(true);
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
    const workspace = r.stdout.match(/^dummy workspace: (.+)$/m)?.[1];
    expect(workspace).toBeDefined();
    expect(existsSync(workspace ?? "")).toBe(false);
  }, TEST_TIMEOUT_MS);
});
