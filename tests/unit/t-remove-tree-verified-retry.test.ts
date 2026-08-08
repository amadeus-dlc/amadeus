import { describe, expect, test } from "bun:test";
import {
  type RemoveTreeIo,
  removeTreeVerified,
} from "../harness/live-e2e/testing/remove-tree-verified.ts";

/**
 * The retry and exhaustion branches of `removeTreeVerified` are only reachable
 * when a concurrent remover wins the race (Issue #2154), which no real-filesystem
 * test can force on demand. These drive the seam with a fake instead, so the
 * fake lives entirely on the test side and never leaks a branch into the helper.
 */

interface FakeIo extends RemoveTreeIo {
  readonly rmCalls: string[];
  readonly sleeps: number[];
}

/**
 * @param survivals how many post-removal existence checks report the tree is
 * still there before it finally reads as gone.
 */
function fakeIo(survivals: number): FakeIo {
  const rmCalls: string[] = [];
  const sleeps: number[] = [];
  let remaining = survivals;
  return {
    rmCalls,
    sleeps,
    rm: (root) => {
      rmCalls.push(root);
    },
    exists: () => {
      if (remaining <= 0) return false;
      remaining -= 1;
      return true;
    },
    sleep: (ms) => {
      sleeps.push(ms);
    },
  };
}

describe("removeTreeVerified retry seam", () => {
  test("returns on the first attempt when the tree is gone immediately", () => {
    const io = fakeIo(0);

    removeTreeVerified("/scratch/root", io);

    expect(io.rmCalls).toEqual(["/scratch/root"]);
    expect(io.sleeps).toEqual([]);
  });

  test("sleeps and retries when the tree survives the first removal", () => {
    const io = fakeIo(1);

    removeTreeVerified("/scratch/root", io);

    expect(io.rmCalls).toEqual(["/scratch/root", "/scratch/root"]);
    expect(io.sleeps).toHaveLength(1);
    expect(io.sleeps[0]).toBeGreaterThan(0);
  });

  test("retries twice when the tree survives two removals", () => {
    const io = fakeIo(2);

    removeTreeVerified("/scratch/root", io);

    expect(io.rmCalls).toHaveLength(3);
    expect(io.sleeps).toHaveLength(2);
  });

  test("throws with the surviving path once the retry budget is exhausted", () => {
    const io = fakeIo(Number.POSITIVE_INFINITY);

    expect(() => removeTreeVerified("/scratch/stubborn-root", io)).toThrow(
      "/scratch/stubborn-root",
    );
    // Three removal attempts, and no sleep after the last one.
    expect(io.rmCalls).toHaveLength(3);
    expect(io.sleeps).toHaveLength(2);
  });

  test("propagates a removal error instead of retrying past it", () => {
    const io: RemoveTreeIo = {
      rm: () => {
        throw new Error("EACCES: permission denied");
      },
      exists: () => true,
      sleep: () => {
        throw new Error("sleep must not be reached when rm throws");
      },
    };

    expect(() => removeTreeVerified("/scratch/root", io)).toThrow("EACCES");
  });
});
