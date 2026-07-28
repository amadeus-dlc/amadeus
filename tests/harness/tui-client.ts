// Canonical subprocess client for tests that drive the rendered TUI.
// Keeping the Bun invocation and tmux capability probe here prevents every
// journey from carrying its own copy of the transport contract.

import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const TUI_DRIVER = join(import.meta.dir, "tui-drive.ts");

export type TuiDriverRun = {
  readonly rc: number;
  readonly stdout: string;
  readonly stderr: string;
};

export function runTuiDriver(args: readonly string[]): TuiDriverRun {
  const result = spawnSync(process.execPath, [TUI_DRIVER, ...args], {
    encoding: "utf-8",
  });
  return {
    rc: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function waitForTui(
  session: string,
  pattern: string,
  timeoutMs: number,
  stableMs: number,
): boolean {
  return (
    runTuiDriver([
      "wait",
      "--session",
      session,
      "--pattern",
      pattern,
      "--timeout-ms",
      String(timeoutMs),
      "--stable-ms",
      String(stableMs),
    ]).rc === 0
  );
}

export function runTuiDriverToExit(args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TUI_DRIVER, ...args], {
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? -1));
    child.on("error", () => resolve(-1));
  });
}

export function tmuxUnavailableReason(): string | null {
  const result = spawnSync("tmux", ["-V"], {
    encoding: "utf-8",
    env: process.env,
  });
  return result.status === 0 ? null : "tmux not found";
}
