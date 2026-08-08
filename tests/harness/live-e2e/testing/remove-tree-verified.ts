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

export function removeTreeVerified(root: string): void {
  for (let attempt = 0; attempt < REMOVE_ATTEMPTS; attempt += 1) {
    // Errors other than the swallowed ENOENT (EACCES, EPERM, …) propagate.
    rmSync(root, { recursive: true, force: true });
    if (!existsSync(root)) return;
    if (attempt < REMOVE_ATTEMPTS - 1) Bun.sleepSync(RETRY_DELAY_MS);
  }
  throw new Error(
    `removeTreeVerified: tree still present after ${REMOVE_ATTEMPTS} removal attempts: ${root}`,
  );
}
