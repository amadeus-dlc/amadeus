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
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasConsistentTimeoutBudget,
  parseLifecycleEvents,
  runVerifier,
  runVerifierAsync,
  verifierWorkspace,
} from "../helpers/book-pack-verify-fixture.ts";

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

function commandPath(command: string): string {
  const result = runVerifier("sh", ["-c", `command -v ${command}`], 1_000);
  const path = result.stdout.trim();
  if (result.status !== 0 || path === "") {
    throw new Error(`could not resolve ${command}`);
  }
  return path;
}

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, body, "utf-8");
  chmodSync(path, 0o755);
}

describe("book-pack verify-dummy (engine-coupling drift guard)", () => {
  test("async verifier captures stderr separately from stdout", async () => {
    const result = await runVerifierAsync("sh", [
      "-c",
      'printf "async stdout\\n"; printf "async stderr\\n" >&2',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("async stdout\n");
    expect(result.stderr).toBe("async stderr\n");
  });

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

  test("controlled parallel load keeps every verifier on a distinct owned workspace", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "book-pack-parallel-load-"));
    const shimDir = join(scratch, "bin");
    const arrivals = join(scratch, "arrivals");
    const realCp = commandPath("cp");
    const workerCount = 3;
    try {
      mkdirSync(shimDir, { recursive: true });
      mkdirSync(arrivals, { recursive: true });
      writeExecutable(
        join(shimDir, "cp"),
        `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1:-}" = "-R" ] && [[ "\${2:-}" == */.claude ]] && [[ "\${3:-}" == */.claude ]]; then
  : > "$BOOK_PACK_BARRIER_DIR/\$\$"
  for _ in {1..500}; do
    arrivals=$(find "$BOOK_PACK_BARRIER_DIR" -type f | wc -l | tr -d ' ')
    [ "$arrivals" -ge "$BOOK_PACK_WORKER_COUNT" ] && break
    sleep 0.01
  done
  [ "$arrivals" -ge "$BOOK_PACK_WORKER_COUNT" ] || {
    echo "parallel fixture barrier timed out" >&2
    exit 70
  }
fi
exec ${JSON.stringify(realCp)} "$@"
`,
      );
      const env = {
        ...process.env,
        PATH: `${shimDir}${delimiter}${process.env.PATH ?? ""}`,
        BOOK_PACK_BARRIER_DIR: arrivals,
        BOOK_PACK_WORKER_COUNT: String(workerCount),
      };

      const results = await Promise.all(
        Array.from({ length: workerCount }, () =>
          runVerifierAsync("bash", [VERIFY_SH, REPO_ROOT], env),
        ),
      );
      const workspaces = results.map((result) => verifierWorkspace(result.stdout));

      expect(results.map((result) => result.status)).toEqual([0, 0, 0]);
      expect(results.every((result) => result.stderr === "")).toBe(true);
      expect(new Set(workspaces).size).toBe(workerCount);
      expect(workspaces.every((workspace) => workspace !== null && !existsSync(workspace))).toBe(
        true,
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 30_000);

  test("the same cleanup-race fixture is red for a raw trap and green for idempotent verifier cleanup", () => {
    const scratch = mkdtempSync(join(tmpdir(), "book-pack-cleanup-race-"));
    const shimDir = join(scratch, "bin");
    const realRm = commandPath("rm");
    try {
      mkdirSync(shimDir, { recursive: true });
      writeExecutable(
        join(shimDir, "rm"),
        `#!/usr/bin/env bash
set -euo pipefail
last="\${!#}"
if [[ "$(basename "$last")" == book-pack-dummy.* ]]; then
  ${JSON.stringify(realRm)} "$@"
  echo "rm: fts_read failed: injected cleanup race" >&2
  exit 1
fi
exec ${JSON.stringify(realRm)} "$@"
`,
      );
      const env = {
        ...process.env,
        PATH: `${shimDir}${delimiter}${process.env.PATH ?? ""}`,
      };
      const legacy = runVerifier(
        "bash",
        [
          "-c",
          'workspace=$(mktemp -d "${TMPDIR:-/tmp}/book-pack-dummy.XXXXXX"); rm -rf -- "$workspace"',
        ],
        2_000,
        env,
      );
      expect(legacy.status).toBe(1);
      expect(legacy.stderr).toContain("fts_read failed: injected cleanup race");

      const fixed = runVerifier("bash", [VERIFY_SH, REPO_ROOT], VERIFIER_TIMEOUT_MS, env);
      if (fixed.status !== 0) {
        console.error("controlled cleanup-race outcome:", {
          status: fixed.status,
          signal: fixed.signal,
          error: fixed.error?.message,
          stdout: fixed.stdout,
          stderr: fixed.stderr,
        });
      }
      expect(fixed.status).toBe(0);
      expect(fixed.stderr).toBe("");
      expect(fixed.stdout).toContain("ALL CHECKS PASSED");
      const workspace = verifierWorkspace(fixed.stdout);
      expect(workspace).not.toBeNull();
      expect(existsSync(workspace ?? "")).toBe(false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
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
    const workspace = verifierWorkspace(r.stdout);
    expect(workspace).not.toBeNull();
    expect(existsSync(workspace ?? "")).toBe(false);
  }, TEST_TIMEOUT_MS);
});
