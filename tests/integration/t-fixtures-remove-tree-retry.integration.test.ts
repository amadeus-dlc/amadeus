// covers: file:tests/harness/fixtures.ts
//
// removeTreeWithRetry (#1565): rmSync with force:true can return without error
// while the tree survives, so success is the post-condition (path gone), never
// the rm call returning. Both failure branches are driven in-process via
// injected ops — the silent-survival branch and the retryable-throw branch.

import { describe, expect, test } from "bun:test";

import { removeTreeWithRetry, type RemoveTreeOps } from "../harness/fixtures.ts";

function opsRecorder(overrides: Partial<RemoveTreeOps>): RemoveTreeOps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    rm(path: string) {
      calls.push(`rm:${path}`);
      overrides.rm?.(path);
    },
    exists(path: string) {
      calls.push(`exists:${path}`);
      return overrides.exists ? overrides.exists(path) : false;
    },
    sleep(ms: number) {
      calls.push(`sleep:${ms}`);
      overrides.sleep?.(ms);
    },
  };
}

describe("removeTreeWithRetry (#1565 silent rm survival)", () => {
  test("returns on the first attempt when the tree is gone", () => {
    const ops = opsRecorder({ exists: () => false });
    removeTreeWithRetry("/fake/root", ops);
    expect(ops.calls).toEqual(["rm:/fake/root", "exists:/fake/root"]);
  });

  test("retries with backoff and throws when rm keeps silently leaving the tree", () => {
    const ops = opsRecorder({ exists: () => true });
    expect(() => removeTreeWithRetry("/fake/root", ops)).toThrow(
      "rmSync returned but the tree still exists: /fake/root",
    );
    // POSIX: 5 attempts, 4 sleeps between them (win32 would be 10/9).
    const attempts = process.platform === "win32" ? 10 : 5;
    expect(ops.calls.filter((c) => c.startsWith("rm:"))).toHaveLength(attempts);
    expect(ops.calls.filter((c) => c.startsWith("sleep:"))).toHaveLength(attempts - 1);
  });

  test("recovers when a later attempt finally removes the tree", () => {
    let round = 0;
    const ops = opsRecorder({ exists: () => ++round < 3 });
    removeTreeWithRetry("/fake/root", ops);
    expect(ops.calls.filter((c) => c.startsWith("rm:"))).toHaveLength(3);
  });

  test("retries a retryable rm error and rethrows when it persists", () => {
    const busy = Object.assign(new Error("busy"), { code: "EBUSY" });
    const ops = opsRecorder({
      rm: () => {
        throw busy;
      },
    });
    expect(() => removeTreeWithRetry("/fake/root", ops)).toThrow("busy");
    const attempts = process.platform === "win32" ? 10 : 5;
    expect(ops.calls.filter((c) => c.startsWith("rm:"))).toHaveLength(attempts);
  });

  test("throws a non-retryable rm error immediately without sleeping", () => {
    const denied = Object.assign(new Error("denied"), { code: "EROFS" });
    const ops = opsRecorder({
      rm: () => {
        throw denied;
      },
    });
    expect(() => removeTreeWithRetry("/fake/root", ops)).toThrow("denied");
    expect(ops.calls.filter((c) => c.startsWith("rm:"))).toHaveLength(1);
    expect(ops.calls.filter((c) => c.startsWith("sleep:"))).toHaveLength(0);
  });
});
