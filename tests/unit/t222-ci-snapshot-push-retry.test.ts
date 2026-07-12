import { describe, expect, test } from "bun:test";
import { isNonFastForward, pushWithRetry, type GitResult } from "../../scripts/metrics-push-retry.ts";

describe("t222 metrics push retry", () => {
  test("classifies non-fast-forward", () => expect(isNonFastForward("! [rejected] HEAD -> main (non-fast-forward)")).toBe(true));
  test("does not classify protected branch rejection as NFF", () => expect(isNonFastForward("! [remote rejected] HEAD -> main (protected branch hook declined)")).toBe(false));
  test("succeeds first time", () => expect(pushWithRetry(() => ({ status: 0, output: "" }))).toBe(1));
  test("retries NFF then succeeds", () => {
    let pushes = 0;
    expect(pushWithRetry((args): GitResult => args[0] === "push" && pushes++ === 0 ? { status: 1, output: "non-fast-forward" } : { status: 0, output: "" })).toBe(2);
  });
  test("authentication failure stops immediately", () => {
    let pushes = 0;
    expect(() => pushWithRetry((args) => {
      if (args[0] !== "push") return { status: 0, output: "" };
      pushes++;
      return { status: 1, output: "authentication failed" };
    })).toThrow("push failed");
    expect(pushes).toBe(1);
  });
  test("protected branch rejection stops immediately", () => {
    let pushes = 0;
    expect(() => pushWithRetry((args) => {
      if (args[0] !== "push") return { status: 0, output: "" };
      pushes++;
      return { status: 1, output: "remote rejected: protected branch hook declined" };
    })).toThrow("push failed");
    expect(pushes).toBe(1);
  });
  test("third NFF fails", () => expect(() => pushWithRetry((args) => args[0] === "push" ? { status: 1, output: "non-fast-forward" } : { status: 0, output: "" })).toThrow("push failed"));
  test("rebase conflict stops", () => expect(() => pushWithRetry((args) => args[0] === "rebase" ? { status: 1, output: "CONFLICT" } : { status: 0, output: "" })).toThrow("rebase failed"));
});
