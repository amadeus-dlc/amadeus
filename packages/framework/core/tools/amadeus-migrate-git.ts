// The Git spawn verdict used by the migration tool, in its own module so a test
// can drive it without importing the migration tool itself.

// The subset of a `spawnSync` return this reads, named so the verdict below can be driven from a
// synthesised outcome: a spawn failure severe enough to set `error` is not reproducible on demand
// through a real child.
export interface GitSpawnOutcome {
  status: number | null;
  stdout?: string | null;
  stderr?: string | null;
  error?: Error;
}

// A spawn that sets `error` did not deliver what the caller asked for, whatever exit code came
// back: bun returns `status: 0` together with `error: ENOBUFS` when a child overflows maxBuffer and
// still exits on its own, so reading `status` alone hands the caller a truncated stdout under a
// success verdict. The error text is appended to the stderr the child already wrote, verbatim, so
// the reason survives into the diagnostic without reshaping what git said.
export function normalizeGitOutcome(
  result: GitSpawnOutcome,
): { ok: boolean; stdout: string; stderr: string } {
  const stderr = result.stderr || "";
  if (result.error === undefined) {
    return { ok: result.status === 0, stdout: result.stdout || "", stderr };
  }
  const prefix = stderr === "" || stderr.endsWith("\n") ? stderr : `${stderr}\n`;
  return {
    ok: false,
    stdout: result.stdout || "",
    stderr: prefix + String(result.error),
  };
}
