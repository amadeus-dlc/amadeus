// covers: function:gitOrThrow
// size: medium
//
// t493 - instrumentation for issue #2382 (t206's `git commit` intermittently
// fails under full-suite parallel load with `unable to create temporary
// file` (ENOENT) + `failed to write commit object`; a 2,404-trial repro
// harness could not pin the mechanism). This does not assert *which*
// mechanism causes the flake (that remains unresolved) - it asserts the
// diagnostic instrumentation itself: `gitOrThrow` (tests/harness/fixtures.ts)
// emits a diagnostic block to stderr and throws on any git failure, and a
// bounded-retry wrapper (the same shape t206's `commitDoc` now uses) records
// both the retry-fired and retry-exhausted paths to stderr rather than
// swallowing them silently.
//
// Corruption is generic (delete .git/objects) so the test exercises the
// diagnostic *shape* without depending on a specific errno/message - the
// same "mechanism unknown" posture the issue itself is in.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { cleanupWorktreeFixture, gitOrThrow, setupWorktreeFixture } from "../harness/fixtures.ts";

let proj: string;

beforeEach(() => {
  proj = setupWorktreeFixture();
});

afterEach(() => {
  cleanupWorktreeFixture(proj);
});

function objectsDir(): string {
  return join(proj, ".git", "objects");
}

function corruptObjectsDir(): void {
  renameSync(objectsDir(), `${objectsDir()}.disabled`);
}

function repairObjectsDir(): void {
  if (!existsSync(objectsDir()) && existsSync(`${objectsDir()}.disabled`)) {
    renameSync(`${objectsDir()}.disabled`, objectsDir());
  }
}

function captureStderr(fn: () => void): string {
  const chunks: string[] = [];
  const original = process.stderr.write;
  process.stderr.write = ((value: string) => {
    chunks.push(String(value));
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return chunks.join("");
}

test("gitOrThrow emits a diagnostic block to stderr and throws on git failure", () => {
  corruptObjectsDir();
  try {
    let threw = false;
    const stderr = captureStderr(() => {
      try {
        gitOrThrow(proj, ["commit", "--allow-empty", "-q", "-m", "should fail"]);
      } catch {
        threw = true;
      }
    });
    expect(threw).toBe(true);
    // The 3 boolean-valued existence probes named in the issue's approved design.
    expect(stderr).toContain("[gitOrThrow diagnostics]");
    expect(stderr).toContain("cwd exists: true");
    expect(stderr).toContain(".git exists: true");
    expect(stderr).toContain(".git/objects exists: false");
    expect(stderr).toContain("TMPDIR:");
    expect(stderr).toContain("rev-parse --git-dir:");
  } finally {
    repairObjectsDir();
  }
});

test("gitOrThrow succeeds (no diagnostic, no throw) against a healthy repo", () => {
  const stderr = captureStderr(() => {
    const r = gitOrThrow(proj, ["commit", "--allow-empty", "-q", "-m", "healthy commit"]);
    expect(r.status).toBe(0);
  });
  expect(stderr).toBe("");
});

// Mirrors the bounded-retry shape t206's commitDoc/gitCommitWithRetry uses:
// retry the commit step (never `add`) up to 2 attempts with a short delay,
// logging every attempt to stderr rather than swallowing it.
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 10;

// `onRetryDelay` runs right inside the catch branch's retry-delay window, right
// after the first failed attempt is recorded - it lets a caller repair the
// fault before the next attempt, modelling "commit fails once then succeeds".
function commitWithRetry(message: string, onRetryDelay?: () => void): void {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      gitOrThrow(proj, ["commit", "--allow-empty", "-q", "-m", message]);
      if (attempt > 1) {
        process.stderr.write(`[t493] retry succeeded on attempt ${attempt}/${RETRY_ATTEMPTS}\n`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_ATTEMPTS) {
        process.stderr.write(`[t493] attempt ${attempt}/${RETRY_ATTEMPTS} failed, retrying\n`);
        onRetryDelay?.();
        sleepSync(RETRY_DELAY_MS);
      }
    }
  }
  throw lastErr;
}

test("bounded retry records a fired retry and recovers when the fault clears before the next attempt", () => {
  corruptObjectsDir();
  const stderr = captureStderr(() => {
    commitWithRetry("retry-recovers", repairObjectsDir);
  });
  expect(stderr).toContain("attempt 1/2 failed, retrying");
  expect(stderr).toContain("retry succeeded on attempt 2/2");
});

test("bounded retry exhausts and rethrows with a diagnostic + retry record when the fault persists", () => {
  corruptObjectsDir();
  try {
    let threw = false;
    const stderr = captureStderr(() => {
      try {
        commitWithRetry("retry-exhausted");
      } catch {
        threw = true;
      }
    });
    expect(threw).toBe(true);
    expect(stderr).toContain("[gitOrThrow diagnostics]");
    expect(stderr).toContain(".git/objects exists: false");
    expect(stderr).toContain("attempt 1/2 failed, retrying");
    expect(stderr).not.toContain("retry succeeded");
  } finally {
    repairObjectsDir();
  }
});
