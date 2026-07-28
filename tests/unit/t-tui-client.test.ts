import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  runTuiDriverToExit,
  tmuxUnavailableReason,
  waitForTui,
} from "../harness/tui-client.ts";
import { join } from "node:path";

const TUI_DRIVER = join(import.meta.dir, "..", "harness", "tui-drive.ts");

describe("canonical TUI subprocess client", () => {
  test("preserves output from the real driver subprocess", () => {
    expect(runTuiDriver([])).toEqual({
      rc: 2,
      stdout: "",
      stderr:
        "tui-drive: unknown subcommand ''. Use: start | send | wait | capture | kill | answer-gate\n",
    });
  });

  test("the synchronous client passes the Bun executable and canonical driver path", () => {
    let observed:
      | {
        executable: string;
        args: string[];
        encoding: string;
      }
      | undefined;
    const result = runTuiDriver(
      ["capture", "--session", "s"],
      (executable, args, options) => {
        observed = {
          executable,
          args: [...args],
          encoding: options.encoding,
        };
        return { status: 0, stdout: "screen", stderr: "" };
      },
    );

    expect(observed).toEqual({
      executable: process.execPath,
      args: [TUI_DRIVER, "capture", "--session", "s"],
      encoding: "utf-8",
    });
    expect(result).toEqual({ rc: 0, stdout: "screen", stderr: "" });
  });

  test("the asynchronous client passes the Bun executable and canonical driver path", async () => {
    let observed:
      | {
        executable: string;
        args: string[];
        stdio: string;
      }
      | undefined;
    let exit: ((code: number | null) => void) | undefined;
    let settled = false;
    const pending = runTuiDriverToExit(
      ["answer-gate", "--session", "s"],
      (executable, args, options, handlers) => {
        observed = {
          executable,
          args: [...args],
          stdio: options.stdio,
        };
        exit = handlers.exit;
      },
    );
    void pending.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(observed).toEqual({
      executable: process.execPath,
      args: [TUI_DRIVER, "answer-gate", "--session", "s"],
      stdio: "inherit",
    });
    expect(settled).toBe(false);
    if (!exit) throw new Error("async spawn did not expose an exit handler");
    exit(7);
    expect(await pending).toBe(7);
    expect(settled).toBe(true);
  });

  test("the default asynchronous boundary returns the real driver exit code", async () => {
    expect(await runTuiDriverToExit([])).toBe(2);
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
