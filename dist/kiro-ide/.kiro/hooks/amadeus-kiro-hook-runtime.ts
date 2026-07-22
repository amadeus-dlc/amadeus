type HookInput = {
  cwd: string;
  stdin?: Uint8Array;
  stdout: "pipe";
  stderr: "pipe" | "ignore";
  env?: Record<string, string | undefined>;
};

type SpawnResult = {
  stdout: Uint8Array;
  stderr: Uint8Array;
  exitCode: number;
  signalCode?: string;
};

export function spawnHookWithRuntime(
  args: readonly string[],
  input: HookInput,
): SpawnResult {
  const result = Bun.spawnSync([process.execPath, ...args], input);
  return {
    stdout: result.stdout,
    stderr: result.stderr ?? new Uint8Array(),
    exitCode: result.exitCode,
    signalCode: result.signalCode,
  };
}
