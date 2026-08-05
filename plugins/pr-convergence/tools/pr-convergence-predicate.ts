// pr-convergence-predicate.ts — U2 convergence-toolchain, component C3.
//
// Owns the convergence judgement: the four-way thread classification
// (FR-3a), the merge-state vocabulary (FR-3c / ADR-2), the mergeable UNKNOWN
// retry (FR-3b / ADR-4) and the single definition of "converged" (FR-3b).
//
// Layering (nfr-design/logical-components.md): this module is pure with
// respect to the process — it never spawns, never reads the filesystem and
// never imports a runtime value from the gh runner. It takes the runner and
// the raw-state fetcher as injected values, which keeps the RUNNER edge
// type-only and the dependency graph acyclic.

import type { GhRunner, PrRef } from "./pr-convergence-gh-runner.ts";

// ---------------------------------------------------------------------------
// Thread classification (FR-3a / BR-U2-2)
// ---------------------------------------------------------------------------

export type ThreadClass = "resolved" | "outdated" | "replied-unresolved" | "ignored";

export const THREAD_CLASSES: readonly ThreadClass[] = [
  "resolved",
  "outdated",
  "replied-unresolved",
  "ignored",
];

/** The comment shape the decision table reads — author identity only. */
export interface ClassifiableComment {
  readonly authorTypename: string;
  readonly authorLogin: string;
}

export interface ClassifiableThread {
  readonly isResolved: boolean;
  readonly isOutdated: boolean;
  readonly comments: readonly ClassifiableComment[];
}

/**
 * A thread is either a convergence subject carrying exactly one ThreadClass,
 * or a human-only thread that is out of scope for the predicate. Making the
 * out-of-scope case a named variant rather than a dropped row is what keeps
 * BR-U2-2 ("never silently dropped") checkable.
 */
export type ThreadClassification =
  | { readonly kind: "classified"; readonly threadClass: ThreadClass }
  | { readonly kind: "human-only" };

/**
 * The only bot test in the toolchain (BR-U2-3): GraphQL `__typename`, never a
 * static list of bot logins. A login allow-list would go stale the moment a
 * review bot is added or renamed, and it is not greppable as a single rule.
 */
export function isBotTypename(authorTypename: string): boolean {
  return authorTypename === "Bot";
}

/**
 * business-logic-model.md § classifyThread. Rows are evaluated top-down:
 * resolved, then outdated, then "has a non-bot reply", then ignored.
 *
 * The reply window starts at the FIRST bot comment: a human comment that
 * precedes every bot comment is not a reply to the bot, so it must not turn an
 * untouched finding into `replied-unresolved`.
 */
export function classifyThread(thread: ClassifiableThread): ThreadClassification {
  const firstBot = thread.comments.findIndex((c) => isBotTypename(c.authorTypename));
  if (firstBot < 0) return { kind: "human-only" };
  if (thread.isResolved) return { kind: "classified", threadClass: "resolved" };
  if (thread.isOutdated) return { kind: "classified", threadClass: "outdated" };
  const replied = thread.comments
    .slice(firstBot + 1)
    .some((c) => !isBotTypename(c.authorTypename));
  return { kind: "classified", threadClass: replied ? "replied-unresolved" : "ignored" };
}

// ---------------------------------------------------------------------------
// Merge-state vocabulary (FR-3c / ADR-2)
// ---------------------------------------------------------------------------

/**
 * The GitHub `mergeStateStatus` enum, deliberately re-declared inside the
 * plugin rather than shared with scripts/metrics-publication-domain.ts: the
 * shipped plugin may not reach repo-only `scripts/` (t258 boundary), and the
 * two consumers normalise to different output vocabularies. ADR-2 keeps them
 * parallel definitions whose common semantics ("UNKNOWN is not success",
 * "unknown value is fail-closed") are pinned independently on both sides.
 */
export type MergeStateStatus =
  | "CLEAN"
  | "BEHIND"
  | "BLOCKED"
  | "DIRTY"
  | "DRAFT"
  | "HAS_HOOKS"
  | "UNSTABLE"
  | "UNKNOWN";

export const KNOWN_MERGE_STATE_STATUSES: readonly MergeStateStatus[] = [
  "CLEAN",
  "BEHIND",
  "BLOCKED",
  "DIRTY",
  "DRAFT",
  "HAS_HOOKS",
  "UNSTABLE",
  "UNKNOWN",
];

export const MergeStateStatus = {
  /**
   * Fail-closed on purpose: an unrecognised value means the GitHub schema
   * moved under us, and silently mapping it to UNKNOWN would let a real state
   * change hide behind a "not converged yet" verdict forever.
   */
  parse(raw: string): MergeStateStatus {
    const known = KNOWN_MERGE_STATE_STATUSES.find((value) => value === raw);
    if (known === undefined) throw new Error(`unknown mergeStateStatus: ${JSON.stringify(raw)}`);
    return known;
  },
} as const;

export type Mergeable = "MERGEABLE" | "CONFLICTING" | "UNKNOWN";

export const KNOWN_MERGEABLE_VALUES: readonly Mergeable[] = [
  "MERGEABLE",
  "CONFLICTING",
  "UNKNOWN",
];

export const Mergeable = {
  parse(raw: string): Mergeable {
    const known = KNOWN_MERGEABLE_VALUES.find((value) => value === raw);
    if (known === undefined) throw new Error(`unknown mergeable: ${JSON.stringify(raw)}`);
    return known;
  },
} as const;

/** The typed pull-request state. C6 fetches the raw strings; this is the parse. */
export interface PrState {
  readonly mergeable: Mergeable;
  readonly mergeStateStatus: MergeStateStatus;
}

export const PrState = {
  parse(raw: { readonly mergeable: string; readonly mergeStateStatus: string }): PrState {
    return {
      mergeable: Mergeable.parse(raw.mergeable),
      mergeStateStatus: MergeStateStatus.parse(raw.mergeStateStatus),
    };
  },
} as const;

// ---------------------------------------------------------------------------
// The convergence verdict (FR-3b / BR-U2-1)
// ---------------------------------------------------------------------------

export type MergeableResolution = "resolved" | "unknown-exhausted";

export interface ConvergenceVerdict {
  readonly converged: boolean;
  readonly violating: { readonly repliedUnresolved: number; readonly ignored: number };
  readonly mergeState: MergeStateStatus;
  readonly mergeableResolution: MergeableResolution;
}

export interface ConvergenceInput {
  readonly repliedUnresolved: number;
  readonly ignored: number;
  readonly state: PrState;
  readonly resolution: MergeableResolution;
}

/**
 * The one place "converged" is defined (FR-3b). `statusCheckRollup.state` is
 * deliberately absent: it does not distinguish required from optional checks,
 * so a green rollup would be a weaker claim than "the merge state is CLEAN".
 */
export function evaluateConvergence(input: ConvergenceInput): ConvergenceVerdict {
  const converged =
    input.repliedUnresolved === 0 &&
    input.ignored === 0 &&
    input.state.mergeStateStatus === "CLEAN" &&
    input.resolution === "resolved";
  return {
    converged,
    violating: { repliedUnresolved: input.repliedUnresolved, ignored: input.ignored },
    mergeState: input.state.mergeStateStatus,
    mergeableResolution: input.resolution,
  };
}

// ---------------------------------------------------------------------------
// mergeable UNKNOWN retry (BR-U2-5 / ADR-4)
// ---------------------------------------------------------------------------

/**
 * ADR-4: GitHub computes mergeability asynchronously, so the first query after
 * a push is almost always UNKNOWN. One initial attempt plus five retries at ten
 * seconds bounds the wait at fifty seconds — long enough for the ordinary case,
 * short enough to keep one monitoring pass under a minute.
 */
export const MERGEABLE_UNKNOWN_RETRY_MAX = 5;
export const MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS = 10_000;

/** The runner's failure type, derived so this module imports only `GhRunner`. */
type RunnerFailure = Extract<Awaited<ReturnType<GhRunner>>, { ok: false }>["error"];

/** The raw (unparsed) pull-request state as the runner reports it. */
interface RawPrStateShape {
  readonly mergeable: string;
  readonly mergeStateStatus: string;
}

/**
 * The C6 fetcher, taken as a value so the RUNNER edge stays type-only. The
 * shape is structural, which is what lets `fetchRawPrState` be passed straight
 * in by the CLI without this module importing it.
 */
export type RawPrStateFetch = (
  gh: GhRunner,
  ref: PrRef,
) => Promise<
  { readonly ok: true; readonly value: RawPrStateShape } | { readonly ok: false; readonly error: RunnerFailure }
>;

/** The clock seam — injected so tests are decisive instead of slow. */
export type Sleep = (ms: number) => Promise<void>;

export interface ResolveMergeableSeams {
  readonly fetchRawPrState: RawPrStateFetch;
  readonly sleep: Sleep;
}

export type MergeableOutcome =
  | { readonly kind: "resolved"; readonly state: PrState; readonly attempts: number }
  | { readonly kind: "unknown-exhausted"; readonly state: PrState; readonly attempts: number }
  | { readonly kind: "gh-failure"; readonly error: RunnerFailure };

/**
 * Poll until mergeability settles. UNKNOWN is never treated as success: on
 * exhaustion the caller gets `unknown-exhausted`, which `evaluateConvergence`
 * turns into a non-converged verdict rather than a "probably fine".
 *
 * An unknown `mergeStateStatus` throws out of this loop by design (ADR-2) — a
 * schema change must be loud, not retried.
 */
export async function resolveMergeable(
  gh: GhRunner,
  ref: PrRef,
  seams: ResolveMergeableSeams,
): Promise<MergeableOutcome> {
  let state: PrState | null = null;
  for (let attempt = 0; attempt <= MERGEABLE_UNKNOWN_RETRY_MAX; attempt += 1) {
    if (attempt > 0) await seams.sleep(MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS);
    const raw = await seams.fetchRawPrState(gh, ref);
    if (!raw.ok) return { kind: "gh-failure", error: raw.error };
    state = PrState.parse(raw.value);
    if (state.mergeable !== "UNKNOWN") return { kind: "resolved", state, attempts: attempt + 1 };
  }
  // `state` is assigned on every loop iteration and the bound is >= 1.
  const exhausted = state as PrState;
  return {
    kind: "unknown-exhausted",
    state: exhausted,
    attempts: MERGEABLE_UNKNOWN_RETRY_MAX + 1,
  };
}
