// t345 — U1 `/amadeus plugin <verb>` delegation, real-spawn crossing.
// Layer: integration (spawns a child process). t344's fake spawn proves the
// composed command shape; only an actual spawn proves that shape resolves to a
// runnable plugin CLI. Without this, a wrong path or a bad interpreter would
// stay invisible behind the unit fake.
import { describe, expect, test } from "bun:test";
import {
  handlePluginDelegate,
  runUtilityMain,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

describe("t345 handlePluginDelegate — real child process", () => {
  test("plugin status exits 0 through the default spawn", () => {
    expect(handlePluginDelegate(["status"])).toBe(0);
  });

  test("an unknown verb surfaces the plugin CLI's usage-error code", () => {
    expect(handlePluginDelegate(["definitely-not-a-verb"])).toBe(2);
  });
});

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** Drives the `plugin` switch arm with argv + spawn stubbed, capturing both. */
function runPluginArm(args: readonly string[], childExit: number): {
  command: string[] | undefined;
  exitCode: number | undefined;
} {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalSpawnSync = Bun.spawnSync;
  let command: string[] | undefined;
  let exitCode: number | undefined;

  process.argv = [process.execPath, "amadeus-utility.ts", ...args];
  process.exit = ((code?: number): never => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  Bun.spawnSync = ((options: { cmd: string[] }) => {
    command = options.cmd;
    return { exitCode: childExit } as never;
  }) as unknown as typeof Bun.spawnSync;

  try {
    runUtilityMain();
  } catch (error) {
    if (error instanceof ExitSignal) exitCode = error.code;
    else throw error;
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    Bun.spawnSync = originalSpawnSync;
  }
  return { command, exitCode };
}

describe("t345 runUtilityMain — the plugin switch arm", () => {
  test("forwards every argument after the verb, unparsed", () => {
    const run = runPluginArm(["plugin", "compose", "--project-root", "/tmp/host"], 0);
    expect(run.command?.slice(2)).toEqual(["compose", "--project-root", "/tmp/host"]);
  });

  test("exits with the child's code", () => {
    expect(runPluginArm(["plugin", "doctor"], 1).exitCode).toBe(1);
  });

  test("does not swallow the plugin CLI's usage-error code", () => {
    expect(runPluginArm(["plugin", "definitely-not-a-verb"], 2).exitCode).toBe(2);
  });
});
