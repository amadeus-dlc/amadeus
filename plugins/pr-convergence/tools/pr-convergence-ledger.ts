// pr-convergence-ledger.ts — U2 convergence-toolchain, component C4.
//
// Fetches every review thread of a pull request and turns them into the
// ThreadLedger: the first-class collection the convergence predicate counts
// and the report renders from.
//
// Two properties are structural rather than incidental:
//
//   * comment bodies never survive parsing. Severity and terminal references
//     are extracted first, then the body becomes a digest — a review body can
//     quote a path, a token or a customer name, and the ledger is written into
//     the intent record (security-design.md § 台帳への機微混入).
//   * a thread with no bot comment is separated into `humanOnly` instead of
//     being dropped. The convergence denominator is bot-raised findings, and a
//     dropped row is indistinguishable from a clean one.
//
// Layering: the only sibling value this module uses is the injected classifier;
// its import of the predicate is type-only, and its import of the runner covers
// the runner type and its identity types.

import { createHash } from "node:crypto";
import type { GhRunner, PrRef, Result } from "./pr-convergence-gh-runner.ts";
import { prRefName, prRefOwner } from "./pr-convergence-gh-runner.ts";
import type { ThreadClass } from "./pr-convergence-predicate.ts";

// ---------------------------------------------------------------------------
// Severity (FR-3d / BR-U2-10)
// ---------------------------------------------------------------------------

export type Severity = "critical" | "major" | "minor" | "info";

/**
 * The measured severity vocabulary. Every entry here was observed in a real
 * review comment (tests/fixtures/pr-convergence/README.md records where); no
 * entry is extrapolated from a bot's presumed scale. An unmeasured label maps
 * to `null` rather than to a neighbouring level — BR-U2-10 forbids filling the
 * field by guesswork, and severity is transcription only, so `null` costs a
 * label and never a verdict.
 */
const SEVERITY_MARKERS: readonly (readonly [marker: string, severity: Severity])[] = [
  ["_🔴 Critical_", "critical"],
  ["_🟠 Major_", "major"],
  ["_🟡 Minor_", "minor"],
  ["_🔵 Trivial_", "info"],
  ["**Medium Severity**", "minor"],
  ["**Low Severity**", "info"],
];

export const Severity = {
  /**
   * Scans for the measured markers by plain substring search — no pattern is
   * applied to the untrusted body here, so an adversarial comment cannot make
   * this super-linear.
   */
  parse(body: string): Severity | null {
    let best: { at: number; severity: Severity } | null = null;
    for (const [marker, severity] of SEVERITY_MARKERS) {
      const at = body.indexOf(marker);
      if (at < 0) continue;
      if (best === null || at < best.at) best = { at, severity };
    }
    return best?.severity ?? null;
  },
} as const;

// ---------------------------------------------------------------------------
// Terminal references (FR-4c / BR-U2-9)
// ---------------------------------------------------------------------------

// Both alternatives are literal character runs with no nested quantifier, so
// matching is linear in the body length (regex-linearity-untrusted-input; the
// bound is measured in t447 on a 100 KB adversarial body).
const TERMINAL_REF_RE = /#[0-9]+|\b[0-9a-f]{7,40}\b/g;

/**
 * The references that make a resolution auditable: the issue or pull request
 * that carried the fix, or the commit that landed it. Order of first appearance
 * is preserved and duplicates collapse, so the ledger reads like the reply did.
 */
export function extractTerminalRefs(body: string): readonly string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(TERMINAL_REF_RE)) seen.add(match[0]);
  return [...seen];
}

// ---------------------------------------------------------------------------
// Review threads
// ---------------------------------------------------------------------------

export type ThreadId = string & { readonly __brand: "ThreadId" };

export interface ThreadComment {
  readonly authorTypename: string;
  readonly authorLogin: string;
  readonly bodyDigest: string;
  readonly severity: Severity | null;
  readonly terminalRefs: readonly string[];
}

export interface ReviewThread {
  readonly id: ThreadId;
  readonly isResolved: boolean;
  readonly isOutdated: boolean;
  readonly comments: readonly ThreadComment[];
}

export interface LedgerParseError {
  readonly kind: "malformed";
  readonly reason: string;
}

export type LedgerError =
  | LedgerParseError
  | { readonly kind: "gh"; readonly detail: string };

/** Contract (iii)-shaped: bodies leave only a fingerprint behind. */
function digestBody(body: string): string {
  return `sha256:${createHash("sha256").update(body, "utf-8").digest("hex").slice(0, 16)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The GraphQL author node, reduced to what the bot test reads. Kept exported so
 * BR-U2-3 ("`__typename` is the only bot test") is checkable from outside.
 */
export function isBotAuthor(author: {
  readonly __typename: string;
  readonly login?: string;
}): boolean {
  return author.__typename === "Bot";
}

function malformed(reason: string): Result<never, LedgerParseError> {
  return { ok: false, error: { kind: "malformed", reason } };
}

/** One comment node. Extraction happens before digesting — the digest is one-way. */
function parseComment(raw: unknown, threadId: string): Result<ThreadComment, LedgerParseError> {
  if (!isRecord(raw)) return malformed(`thread ${threadId}: comment is not an object`);
  const author = raw.author;
  if (!isRecord(author)) return malformed(`thread ${threadId}: comment author is missing`);
  const typename = author.__typename;
  const login = author.login;
  const body = raw.body;
  if (typeof typename !== "string") return malformed(`thread ${threadId}: author __typename missing`);
  if (typeof login !== "string") return malformed(`thread ${threadId}: author login missing`);
  if (typeof body !== "string") return malformed(`thread ${threadId}: comment body missing`);
  return {
    ok: true,
    value: {
      authorTypename: typename,
      authorLogin: login,
      severity: Severity.parse(body),
      terminalRefs: extractTerminalRefs(body),
      bodyDigest: digestBody(body),
    },
  };
}

export const ReviewThread = {
  /** The one entry point from raw GraphQL into the typed ledger. */
  parse(node: unknown): Result<ReviewThread, LedgerParseError> {
    if (!isRecord(node)) return malformed("thread node is not an object");
    const { id, isResolved, isOutdated } = node;
    if (typeof id !== "string" || id.length === 0) return malformed("thread id is not a string");
    if (typeof isResolved !== "boolean") return malformed(`thread ${id}: isResolved is not boolean`);
    if (typeof isOutdated !== "boolean") return malformed(`thread ${id}: isOutdated is not boolean`);
    const commentsNode = node.comments;
    const rawComments = isRecord(commentsNode) ? commentsNode.nodes : undefined;
    if (!Array.isArray(rawComments)) return malformed(`thread ${id}: comments.nodes is not an array`);

    const comments: ThreadComment[] = [];
    for (const raw of rawComments) {
      const comment = parseComment(raw, id);
      if (!comment.ok) return comment;
      comments.push(comment.value);
    }
    return { ok: true, value: { id: id as ThreadId, isResolved, isOutdated, comments } };
  },
} as const;

// ---------------------------------------------------------------------------
// Paged fetch (BR-U2-4)
// ---------------------------------------------------------------------------

export const REVIEW_THREADS_PAGE_SIZE = 100;

export const REVIEW_THREADS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$after:String){
  repository(owner:$owner,name:$name){
    pullRequest(number:$number){
      reviewThreads(first:${REVIEW_THREADS_PAGE_SIZE},after:$after){
        pageInfo{ hasNextPage endCursor }
        nodes{
          id isResolved isOutdated
          comments(first:100){ nodes{ author{ __typename login } body } }
        }
      }
    }
  }
}`;

/**
 * Walks `hasNextPage` to the end. Any failure — transport, envelope shape or a
 * malformed thread — aborts the whole fetch: a partial ledger would understate
 * the violation count, which is exactly the direction that must never fail
 * open.
 */
export async function fetchAllReviewThreads(
  gh: GhRunner,
  ref: PrRef,
): Promise<Result<readonly ReviewThread[], LedgerError>> {
  const collected: ReviewThread[] = [];
  let after: string | null = null;
  for (;;) {
    const argv = [
      "gh",
      "api",
      "graphql",
      "-f",
      `query=${REVIEW_THREADS_QUERY}`,
      "-F",
      `owner=${prRefOwner(ref)}`,
      "-F",
      `name=${prRefName(ref)}`,
      "-F",
      `number=${ref.number}`,
      ...(after === null ? [] : ["-F", `after=${after}`]),
    ];
    const response = await gh(argv);
    if (!response.ok) {
      return { ok: false, error: { kind: "gh", detail: response.error.kind } };
    }
    const page = parsePage(response.value);
    if (!page.ok) return page;
    for (const node of page.value.nodes) {
      const thread = ReviewThread.parse(node);
      if (!thread.ok) return thread;
      collected.push(thread.value);
    }
    if (!page.value.hasNextPage || page.value.endCursor === null) {
      return { ok: true, value: collected };
    }
    after = page.value.endCursor;
  }
}

interface ReviewThreadPage {
  readonly nodes: readonly unknown[];
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

function parsePage(body: string): Result<ReviewThreadPage, LedgerParseError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return malformed("reviewThreads response is not JSON");
  }
  const data = isRecord(parsed) ? parsed.data : undefined;
  const repository = isRecord(data) ? data.repository : undefined;
  const pullRequest = isRecord(repository) ? repository.pullRequest : undefined;
  const reviewThreads = isRecord(pullRequest) ? pullRequest.reviewThreads : undefined;
  if (!isRecord(reviewThreads)) return malformed("reviewThreads envelope is missing");
  const nodes = reviewThreads.nodes;
  const pageInfo = reviewThreads.pageInfo;
  if (!Array.isArray(nodes)) return malformed("reviewThreads.nodes is not an array");
  if (!isRecord(pageInfo)) return malformed("reviewThreads.pageInfo is missing");
  const hasNextPage = pageInfo.hasNextPage;
  const endCursor = pageInfo.endCursor;
  if (typeof hasNextPage !== "boolean") return malformed("pageInfo.hasNextPage is not boolean");
  if (endCursor !== null && typeof endCursor !== "string") {
    return malformed("pageInfo.endCursor is neither string nor null");
  }
  return { ok: true, value: { nodes, hasNextPage, endCursor: endCursor ?? null } };
}

// ---------------------------------------------------------------------------
// The ledger (first-class collection)
// ---------------------------------------------------------------------------

export interface ClassifiedThread extends ReviewThread {
  readonly threadClass: ThreadClass;
}

export interface LedgerSummary {
  readonly resolved: number;
  readonly outdated: number;
  readonly repliedUnresolved: number;
  readonly ignored: number;
  readonly humanOnly: number;
  readonly terminalized: number;
}

export interface ThreadLedger {
  readonly prRef: PrRef;
  readonly threads: readonly ClassifiedThread[];
  readonly humanOnly: readonly ThreadId[];
  count(threadClass: ThreadClass): number;
  violating(): readonly ClassifiedThread[];
  terminalized(): readonly ClassifiedThread[];
  summary(): LedgerSummary;
}

/**
 * The classifier is injected rather than imported so the ledger's dependency on
 * the predicate stays type-only (nfr-design/logical-components.md § 依存方向).
 */
export type ThreadClassifier = (thread: ReviewThread) =>
  | { readonly kind: "classified"; readonly threadClass: ThreadClass }
  | { readonly kind: "human-only" };

/**
 * A resolution is terminalised when the thread is resolved AND the last human
 * reply names where the fix landed. "Resolved" alone is a click; the reference
 * is what makes the resolution auditable downstream (#1887's primary input).
 */
function isTerminalized(thread: ClassifiedThread): boolean {
  if (!thread.isResolved) return false;
  const firstBot = thread.comments.findIndex((c) => c.authorTypename === "Bot");
  if (firstBot < 0) return false;
  const humanReplies = thread.comments.slice(firstBot + 1).filter((c) => c.authorTypename !== "Bot");
  const last = humanReplies.at(-1);
  return last !== undefined && last.terminalRefs.length > 0;
}

export const ThreadLedger = {
  /** The only way a ledger comes into existence. */
  build(
    prRef: PrRef,
    threads: readonly ReviewThread[],
    classify: ThreadClassifier,
  ): ThreadLedger {
    const classified: ClassifiedThread[] = [];
    const humanOnly: ThreadId[] = [];
    for (const thread of threads) {
      const verdict = classify(thread);
      if (verdict.kind === "human-only") humanOnly.push(thread.id);
      else classified.push({ ...thread, threadClass: verdict.threadClass });
    }
    const ledger: ThreadLedger = {
      prRef,
      threads: classified,
      humanOnly,
      count(threadClass) {
        return classified.filter((t) => t.threadClass === threadClass).length;
      },
      violating() {
        return classified.filter(
          (t) => t.threadClass === "replied-unresolved" || t.threadClass === "ignored",
        );
      },
      terminalized() {
        return classified.filter(isTerminalized);
      },
      summary() {
        return {
          resolved: ledger.count("resolved"),
          outdated: ledger.count("outdated"),
          repliedUnresolved: ledger.count("replied-unresolved"),
          ignored: ledger.count("ignored"),
          humanOnly: humanOnly.length,
          terminalized: ledger.terminalized().length,
        };
      },
    };
    return ledger;
  },
} as const;
