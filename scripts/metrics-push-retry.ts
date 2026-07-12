#!/usr/bin/env bun
import { spawnSync } from "node:child_process";

export interface GitResult { status: number; output: string }
export type GitRunner = (args: string[]) => GitResult;
export function isNonFastForward(output: string): boolean {
  return /non-fast-forward|\(fetch first\)/i.test(output);
}
export function pushWithRetry(run: GitRunner, attempts = 3): number {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const fetch = run(["fetch", "origin", "main"]);
    if (fetch.status !== 0) throw new Error(`fetch failed: ${fetch.output}`);
    const rebase = run(["rebase", "origin/main"]);
    if (rebase.status !== 0) throw new Error(`rebase failed: ${rebase.output}`);
    const push = run(["push", "origin", "HEAD:main"]);
    if (push.status === 0) return attempt;
    if (!isNonFastForward(push.output) || attempt === attempts) throw new Error(`push failed: ${push.output}`);
  }
  throw new Error("push retry exhausted");
}
export function main(): number {
  try {
    const attempts = pushWithRetry((args) => {
      const result = spawnSync("git", args, { encoding: "utf8" });
      return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
    });
    process.stdout.write(`metrics push succeeded after ${attempts} attempt(s)\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
}
if (import.meta.main) process.exit(main());
