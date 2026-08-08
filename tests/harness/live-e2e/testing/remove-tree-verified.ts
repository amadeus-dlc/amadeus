import { existsSync, rmSync } from "node:fs";

/**
 * Remove a scratch tree and prove it stayed removed.
 *
 * `rmSync(root, { recursive: true, force: true })` swallows the transient
 * ENOENT that a concurrent remover produces when it unlinks an entry between
 * this call's directory walk and its unlink. The swallowed error turns the
 * removal into a silent no-op, so the scratch root survives while the caller
 * believes it is gone — the mechanism behind the probabilistic red in
 * `tests/integration/t-codex-exec-live-helper.test.ts` (Issue #2154, reproduced
 * at 88/1000 with four concurrent removers). Verifying the removal and retrying
 * closes that window; failing loudly after the retry budget keeps a genuinely
 * undeletable tree from being reported as removed. Mirrors the async pattern
 * already proven in `tests/harness/live-e2e/kiro-tui.ts` `#removeScratch`.
 */

const REMOVE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10;

/**
 * Filesystem seam. The retry and exhaustion branches are only reachable when a
 * concurrent remover wins the race, so tests drive them through a fake rather
 * than trying to lose a real race on demand.
 */
export interface RemoveTreeIo {
  rm(root: string): void;
  exists(root: string): boolean;
  sleep(ms: number): void;
}

const realIo: RemoveTreeIo = {
  rm: (root) => rmSync(root, { recursive: true, force: true }),
  exists: existsSync,
  sleep: (ms) => Bun.sleepSync(ms),
};

export function removeTreeVerified(root: string, io: RemoveTreeIo = realIo): void {
  for (let attempt = 0; attempt < REMOVE_ATTEMPTS; attempt += 1) {
    // Errors other than the swallowed ENOENT (EACCES, EPERM, …) propagate.
    io.rm(root);
    if (!io.exists(root)) return;
    if (attempt < REMOVE_ATTEMPTS - 1) io.sleep(RETRY_DELAY_MS);
  }
  throw new Error(
    `removeTreeVerified: tree still present after ${REMOVE_ATTEMPTS} removal attempts: ${root}`,
  );
}

/**
 * Roll back after a setup failure without losing either error. Always throws,
 * hence the `never` return: it exists to be the last statement of a `catch`.
 *
 * When `cleanup` succeeds the original `error` is rethrown unchanged, so
 * callers and their tests see exactly the failure that started the rollback.
 * Only when `cleanup` itself throws is an `AggregateError` raised, carrying the
 * original setup failure first and the cleanup failure second — neither the
 * reason the rollback ran nor the reason it failed is swallowed. Verified
 * removal can throw (see `removeTreeVerified`), which is what made the plain
 * `catch (error) { cleanup(); throw error; }` shape lossy.
 */
export function rollbackOrAggregate(error: unknown, cleanup: () => void): never {
  try {
    cleanup();
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], "rollback cleanup failed after setup failure");
  }
  throw error;
}

/**
 * Run `work`, rolling the scratch tree back through `cleanup` if it throws.
 *
 * It exists to collapse the `catch` clause into this one place: a per-callsite
 * rollback `catch` that no fixture can reach (a setup whose only fallible step
 * runs against a directory the line above just created) would otherwise linger
 * as an uncovered patch line, and the coverage patch gate is zero-tolerance —
 * see the seam-refactor-first ordering in `tests/coverage-patch-gate.ts`
 * (Issue #2154). Here the clause is exercised by the setup rollback tests.
 *
 * The value and exception semantics are those of a plain try/catch around the
 * same statements: `work`'s value is returned unchanged, and failures surface
 * through `rollbackOrAggregate` — the original error when cleanup succeeds, an
 * `AggregateError` only when cleanup fails too.
 */
export function withRollback<T>(cleanup: () => void, work: () => T): T {
  try {
    return work();
  } catch (error) {
    rollbackOrAggregate(error, cleanup);
  }
}
