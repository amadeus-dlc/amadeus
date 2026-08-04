import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CleanupTarget } from "../adapter.ts";
import { REPO_ROOT } from "../../fixtures.ts";

export const LIVE_E2E_LEDGER = join(tmpdir(), "amadeus-live-e2e", `runs-${process.pid}.jsonl`);

export function currentGitSha(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error("unable to resolve the current Git SHA");
  return result.stdout.trim();
}

export async function liveScratchLeakCheck(target: CleanupTarget): Promise<readonly string[]> {
  return existsSync(target.scratch.root) ? ["scratch root remained after cleanup"] : [];
}
