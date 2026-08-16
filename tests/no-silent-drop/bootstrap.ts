import { spawnSync } from "node:child_process";
import {
  assertEventCustody,
  baselineDocFromFold,
  exemptionsDocFromFold,
  foldEvents,
  type FoldedLedger,
  loadEvents,
  type LoadedEvents,
} from "./events.ts";
import { CANONICAL_PATHS } from "./ledger.ts";
import { type BaselineDoc, type ExemptionDoc, InfraFailure } from "./model.ts";

const FULL_SHA = /^[0-9a-f]{40}$/;

export type TrustedPreviousLedgers = {
  readonly baseline: BaselineDoc;
  readonly exemptions: ExemptionDoc;
  readonly source: "events";
  readonly folded: FoldedLedger;
  readonly events: LoadedEvents;
};

function gitObjectExists(repoRoot: string, object: string): boolean {
  return spawnSync("git", ["cat-file", "-e", object], { cwd: repoRoot, encoding: "utf8" }).status === 0;
}

export function isAncestor(repoRoot: string, ancestor: string, descendant: string): boolean {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new InfraFailure(
    "BASELINE_INVALID",
    `trusted base lineage could not be verified: ${result.stderr.trim() || `${ancestor}..${descendant}`}`,
  );
}

/**
 * Event-ledger custody compares event sets only, so an identical or unrelated
 * trusted base would hide deletions. Require strict ancestry of HEAD: reachable
 * from HEAD, and not reachable back (which rules out HEAD itself).
 */
function assertStrictAncestorOfHead(repoRoot: string, trustedSha: string): void {
  if (!isAncestor(repoRoot, trustedSha, "HEAD") || isAncestor(repoRoot, "HEAD", trustedSha)) {
    throw new InfraFailure(
      "BASELINE_INVALID",
      `trusted base is not a strict ancestor of HEAD: ${trustedSha}`,
    );
  }
}

/**
 * Load the head event ledger, fold it, and enforce event-file custody against the
 * trusted base. The event ledger is the sole source of the trusted previous set:
 * a base whose tree carries no ledger has nothing to compare against, so it fails
 * closed instead of deriving history from a separately declared origin.
 */
export function loadTrustedPreviousLedgers(
  repoRoot: string,
  trustedSha: string,
): TrustedPreviousLedgers {
  if (!FULL_SHA.test(trustedSha) || !gitObjectExists(repoRoot, `${trustedSha}^{commit}`)) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base is not a resolvable full commit: ${trustedSha}`);
  }
  const events = loadEvents(repoRoot);
  const folded = foldEvents(events.byUlid.values());
  assertEventCustody(repoRoot, trustedSha, events, folded);

  if (!gitObjectExists(repoRoot, `${trustedSha}:${CANONICAL_PATHS.eventsRel}`)) {
    throw new InfraFailure(
      "BASELINE_MISSING",
      `trusted base does not contain the event ledger: ${CANONICAL_PATHS.eventsRel} at ${trustedSha}`,
    );
  }
  assertStrictAncestorOfHead(repoRoot, trustedSha);

  return {
    baseline: baselineDocFromFold(folded, trustedSha, folded.effectiveDigest),
    exemptions: exemptionsDocFromFold(folded),
    source: "events",
    folded,
    events,
  };
}
