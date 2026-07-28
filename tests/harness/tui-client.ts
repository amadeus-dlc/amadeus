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

type SyncDriverSpawn = (
  executable: string,
  args: readonly string[],
  options: { readonly encoding: "utf-8" },
) => {
  readonly status: number | null;
  readonly stdout: string | null;
  readonly stderr: string | null;
};

const REAL_SYNC_DRIVER_SPAWN: SyncDriverSpawn = (
  executable,
  args,
  options,
) => spawnSync(executable, args, options);

export function runTuiDriver(
  args: readonly string[],
  spawnDriver: SyncDriverSpawn = REAL_SYNC_DRIVER_SPAWN,
): TuiDriverRun {
  const result = spawnDriver(process.execPath, [TUI_DRIVER, ...args], {
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

type AsyncDriverSpawn = (
  executable: string,
  args: readonly string[],
  options: { readonly stdio: "inherit" },
  handlers: {
    readonly exit: (code: number | null) => void;
    readonly error: () => void;
  },
) => void;

const REAL_ASYNC_DRIVER_SPAWN: AsyncDriverSpawn = (
  executable,
  args,
  options,
  handlers,
) => {
  const child = spawn(executable, args, options);
  child.once("exit", handlers.exit);
  child.once("error", handlers.error);
};

export function runTuiDriverToExit(
  args: readonly string[],
  spawnDriver: AsyncDriverSpawn = REAL_ASYNC_DRIVER_SPAWN,
): Promise<number> {
  return new Promise((resolve) => {
    spawnDriver(
      process.execPath,
      [TUI_DRIVER, ...args],
      { stdio: "inherit" },
      {
        exit: (code) => resolve(code ?? -1),
        error: () => resolve(-1),
      },
    );
  });
}

export function tmuxUnavailableReason(): string | null {
  const result = spawnSync("tmux", ["-V"], {
    encoding: "utf-8",
    env: process.env,
  });
  return result.status === 0 ? null : "tmux not found";
}
