import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  runTuiDriverToExit,
  tmuxUnavailableReason,
  waitForTui,
} from "../harness/tui-client.ts";

describe("canonical TUI subprocess client", () => {
  test("runs the driver with the current Bun executable and preserves output", () => {
    expect(runTuiDriver([])).toEqual({
      rc: 2,
      stdout: "",
      stderr:
        "tui-drive: unknown subcommand ''. Use: start | send | wait | capture | kill | answer-gate\n",
    });
  });

  test("settles only after the child process exits", async () => {
    let settled = false;
    const pending = runTuiDriverToExit([]);
    void pending.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(await pending).toBe(2);
    expect(settled).toBe(true);
  });

  test("reports an unavailable tmux prerequisite", () => {
    const originalPath = process.env.PATH;
    process.env.PATH = "/amadeus-test/path-without-tmux";
    try {
      expect(tmuxUnavailableReason()).toBe("tmux not found");
      expect(waitForTui("missing", "ready", 1, 0)).toBe(false);
    } finally {
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }
    }
  });
});
