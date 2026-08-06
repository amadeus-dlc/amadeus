import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const EVENTS_REL = "tests/no-silent-drop/events";

/**
 * Resolve a trusted base for no-silent-drop checks after #2338.
 * Prefer the merge-base with origin/main when available; otherwise HEAD~1 when
 * the event ledger exists. Returns null when no suitable ancestor exists.
 */
export function noSilentDropTrustedBase(repoRoot: string): string | null {
  try {
    readdirSync(join(repoRoot, EVENTS_REL));
  } catch {
    return null;
  }

  const mergeBase = spawnSync("git", ["merge-base", "HEAD", "origin/main"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (mergeBase.status === 0) {
    const sha = mergeBase.stdout.trim();
    if (/^[0-9a-f]{40}$/.test(sha)) return sha;
  }

  const parent = spawnSync("git", ["rev-parse", "HEAD^"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (parent.status === 0) {
    const sha = parent.stdout.trim();
    if (/^[0-9a-f]{40}$/.test(sha)) return sha;
  }
  return null;
}
