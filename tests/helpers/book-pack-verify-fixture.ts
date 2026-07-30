import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";

export type LifecycleEvent = {
  event: "child-start" | "child-complete" | "cleanup-start" | "cleanup-complete";
  elapsedMs: number;
};

export interface AsyncProcessResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function hasConsistentTimeoutBudget(
  verifierTimeoutMs: number,
  cleanupReserveMs: number,
  outerTimeoutMs: number,
): boolean {
  return verifierTimeoutMs + cleanupReserveMs <= outerTimeoutMs;
}

export function runVerifier(
  command: string,
  args: readonly string[],
  timeout: number,
  env: NodeJS.ProcessEnv = process.env,
): SpawnSyncReturns<string> & { durationMs: number } {
  const startedAt = performance.now();
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    timeout,
    env,
  });
  return { ...result, durationMs: performance.now() - startedAt };
}

export async function runVerifierAsync(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<AsyncProcessResult> {
  const startedAt = performance.now();
  const child = spawn(command, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf-8");
  child.stderr.setEncoding("utf-8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (status, signal) => {
      resolve({
        status,
        signal,
        stdout,
        stderr,
        durationMs: performance.now() - startedAt,
      });
    });
  });
}

export function parseLifecycleEvents(stdout: string): LifecycleEvent[] {
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LifecycleEvent);
}

export function verifierWorkspace(stdout: string): string | null {
  return stdout.match(/^dummy workspace: (.+)$/m)?.[1] ?? null;
}
