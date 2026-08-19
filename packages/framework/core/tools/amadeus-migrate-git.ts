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

// The verdict a caller gets back from `git`, named so the readers below can be driven from a
// synthesised outcome instead of a real child.
export interface GitOutcome {
  ok: boolean;
  stdout: string;
  stderr: string;
}

// #3151: under merge-queue load `git ls-files --stage -z` has been observed to exit 0 with its
// stdout cut short - the same bun read behaviour #2397/#3065 caught on `git ls-tree -z`. The index
// itself is intact; only that read of it was short, so an incomplete read is worth re-reading. The
// bound is a count of attempts, not a deadline: it keeps a genuinely unterminated output on the
// caller's fail-closed path instead of looping on it, and it never makes "finished in time" the
// condition for a pass.
export const NUL_READ_ATTEMPTS = 3;

// A `-z` read is complete when its last record is terminated, and an empty result has nothing to
// terminate. Only a read git reported as successful is worth re-reading: a failure is git's own
// verdict and belongs to the caller's fail-closed path.
export function isIncompleteNulRead(outcome: GitOutcome): boolean {
  return outcome.ok && outcome.stdout !== "" && !outcome.stdout.endsWith("\0");
}

// Re-read a `-z` listing while it comes back cut short, up to `attempts` reads. The attempt number
// is handed to the runner so a caller can tell a re-read apart from the first read.
export function readNulTerminated(
  run: (attempt: number) => GitOutcome,
  attempts: number = NUL_READ_ATTEMPTS,
): { outcome: GitOutcome; attempts: number } {
  let outcome = run(1);
  let used = 1;
  while (used < attempts && isIncompleteNulRead(outcome)) {
    used += 1;
    outcome = run(used);
  }
  return { outcome, attempts: used };
}

const FORENSIC_EDGE_BYTES = 16;
const FORENSIC_STDERR_BYTES = 200;

function hexEdge(bytes: Buffer, edge: "head" | "tail"): string {
  const slice = edge === "head"
    ? bytes.subarray(0, FORENSIC_EDGE_BYTES)
    : bytes.subarray(Math.max(0, bytes.length - FORENSIC_EDGE_BYTES));
  return slice.toString("hex");
}

// #1664 asked for the diagnosis that a `null` verdict threw away. Record where the output actually
// stops, plus what git said on stderr, so the next occurrence is identifiable from the refusal
// message alone rather than from a job log that has to be fetched again.
export function nulReadForensics(outcome: GitOutcome, attempts: number): string {
  const bytes = Buffer.from(outcome.stdout, "utf8");
  let nulCount = 0;
  for (const byte of bytes) if (byte === 0) nulCount += 1;
  const lastNul = bytes.lastIndexOf(0);
  return [
    `attempts=${attempts}`,
    `ok=${outcome.ok}`,
    `bytes=${bytes.length}`,
    `head16=${hexEdge(bytes, "head")}`,
    `tail16=${hexEdge(bytes, "tail")}`,
    `nulCount=${nulCount}`,
    `endsNul=${bytes.length > 0 && bytes[bytes.length - 1] === 0}`,
    `bytesAfterLastNul=${lastNul < 0 ? bytes.length : bytes.length - lastNul - 1}`,
    `stderr=${JSON.stringify(outcome.stderr.slice(0, FORENSIC_STDERR_BYTES))}`,
  ].join(" ");
}
