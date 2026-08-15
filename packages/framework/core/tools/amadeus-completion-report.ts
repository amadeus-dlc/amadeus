// C9/ADR-3 (RFC-0001 §full-mode 事後検収): the auto-decision summary generated
// at the workflow-completion boundary. Reads ONLY the AUTO_DECIDED audit trail
// and the existing listProductionAutoDecisions review API — no LLM-authored
// counts or prose (P2). Every failure here is a Result the caller turns into a
// completion-JSON warning; nothing in this module throws to abort
// complete-workflow (R-3 — the caller in amadeus-state.ts still wraps the call
// in a try/catch as the final backstop against a mistake here).

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { findAllEvents, isoTimestamp } from "./amadeus-lib.ts";
import {
  INTENT_AUTONOMY_AUDIT_EVENT,
  readIntentAutonomyTransactions,
} from "./amadeus-intent-autonomy-replay.ts";
import type { AutoDecisionRecord, DecisionBasisKind } from "./amadeus-intent-autonomy.ts";
import { listProductionAutoDecisions } from "./amadeus-autonomy-review-production.ts";
import type { DecisionCursor, DecisionReviewState, DecisionSummary } from "./amadeus-autonomy-review.ts";

export interface SummaryDoc {
  readonly recordDir: string;
  readonly generatedAt: string;
  readonly totalAutoDecided: number;
  readonly byBasisKind: Readonly<Record<DecisionBasisKind, number>>;
  readonly byReviewState: Readonly<Record<DecisionReviewState, number>>;
  readonly countMismatch: { readonly auditRows: number; readonly listedItems: number } | null;
}

export type SummaryBuildError =
  | { readonly kind: "record-dir-unresolved" }
  | { readonly kind: "list-api-error"; readonly detail: string }
  | { readonly kind: "write-failed"; readonly detail: string };

export const AUTO_DECISION_SUMMARY_RELATIVE_PATH = join("completion", "auto-decision-summary.md");

const ALL_BASIS_KINDS: readonly DecisionBasisKind[] = [
  "mode-semi",
  "grant-gate",
  "confirmed-policy",
  "norm",
  "history",
  "solo-election",
  "agent-recommendation",
];

const ALL_REVIEW_STATES: readonly DecisionReviewState[] = [
  "not-applicable",
  "unreviewed",
  "accepted",
  "flagged",
];

function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  const counts = {} as Record<K, number>;
  for (const key of keys) counts[key] = 0;
  return counts;
}

// Every AUTO_DECIDED audit row under <recordDir>/audit — the sole ground truth
// for totalAutoDecided/byBasisKind (R-6, R-8). Mirrors amadeus-lib.ts's
// auditShards()/readAllAuditShards() glob, but rooted directly at the
// already-resolved recordDir the caller passes in (C9's signature takes
// recordDir, not a projectDir+intent+space triple) — auditShardDir() in
// amadeus-lib.ts resolves to exactly join(recordDir, "audit"), so this stays
// consistent with every other shard reader without re-deriving recordDir.
function readAutoDecisionAuditRecords(recordDir: string): readonly AutoDecisionRecord[] {
  const shardDir = join(recordDir, "audit");
  let entries: string[];
  try {
    entries = readdirSync(shardDir);
  } catch {
    return [];
  }
  const files = entries.filter((name) => name.endsWith(".jsonl")).sort();
  const parts: string[] = [];
  for (const file of files) {
    try {
      parts.push(readFileSync(join(shardDir, file), "utf-8"));
    } catch {
      // a shard vanished between enumerate and read — skip it, matching
      // readAllAuditShards()'s own tolerance for that race.
    }
  }
  const buffer = parts.join("\n");
  if (buffer.trim() === "") return [];
  const rows = findAllEvents(buffer, INTENT_AUTONOMY_AUDIT_EVENT);
  const transactions = readIntentAutonomyTransactions(rows.map((row) => row.block).join("\n"));
  return transactions.flatMap((transaction) =>
    transaction.events.flatMap((event) => (event.type === "AUTO_DECIDED" ? [event.decision] : [])),
  );
}

// R-5: walk every page via nextCursor — a caller that stopped at page 1 would
// silently under-count a record with more than pageSize decisions.
function listAllProductionAutoDecisions(
  pd: string,
  intent: string,
): { readonly ok: true; readonly items: readonly DecisionSummary[] } | { readonly ok: false; readonly error: string } {
  const items: DecisionSummary[] = [];
  let cursor: DecisionCursor | undefined;
  for (;;) {
    const result = listProductionAutoDecisions({ projectDir: pd, intent, pageSize: 100, cursor });
    if (!result.ok) return { ok: false, error: result.error };
    items.push(...result.page.items);
    if (result.page.nextCursor === null) return { ok: true, items };
    cursor = result.page.nextCursor;
  }
}

// C9: buildAutoDecisionSummary(recordDir). `pd` is threaded alongside recordDir
// because listProductionAutoDecisions resolves the review target against the
// workspace's intents.json (space + intent registry), which recordDir alone
// cannot reconstruct — the audit-row half of the summary needs only recordDir,
// the listProductionAutoDecisions half needs the project root too.
export function buildAutoDecisionSummary(
  pd: string,
  recordDir: string,
): { readonly ok: true; readonly summary: SummaryDoc } | { readonly ok: false; readonly error: SummaryBuildError } {
  const auditRecords = readAutoDecisionAuditRecords(recordDir);
  const byBasisKind = zeroCounts(ALL_BASIS_KINDS);
  for (const record of auditRecords) byBasisKind[record.basisKind] += 1;

  const intentDirName = basename(recordDir);
  const listed = listAllProductionAutoDecisions(pd, intentDirName);
  if (!listed.ok) return { ok: false, error: { kind: "list-api-error", detail: listed.error } };

  const byReviewState = zeroCounts(ALL_REVIEW_STATES);
  for (const item of listed.items) byReviewState[item.reviewState] += 1;

  const totalAutoDecided = auditRecords.length;
  const listedItems = listed.items.length;
  const countMismatch = totalAutoDecided === listedItems ? null : { auditRows: totalAutoDecided, listedItems };

  return {
    ok: true,
    summary: {
      recordDir,
      generatedAt: isoTimestamp(),
      totalAutoDecided,
      byBasisKind,
      byReviewState,
      countMismatch,
    },
  };
}

function renderCountTable(title: string, counts: Readonly<Record<string, number>>): string {
  const rows = Object.entries(counts)
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join("\n");
  return `## ${title}\n\n| Key | Count |\n| --- | --- |\n${rows}\n`;
}

// R-2: mechanical rendering only — every value here is transcribed from
// SummaryDoc, never composed or paraphrased.
export function renderAutoDecisionSummaryMarkdown(summary: SummaryDoc): string {
  const mismatchSection = summary.countMismatch === null
    ? ""
    : `\n## Count Mismatch\n\n` +
      `Audit rows: ${summary.countMismatch.auditRows}, listed items: ${summary.countMismatch.listedItems}. ` +
      `The two sources disagree — investigate before trusting downstream counts (R-8).\n`;
  return (
    `# Auto-Decision Summary\n\n` +
    `- Generated At: ${summary.generatedAt}\n` +
    `- Record: ${summary.recordDir}\n` +
    `- Total AUTO_DECIDED: ${summary.totalAutoDecided}\n\n` +
    `${renderCountTable("By Basis Kind", summary.byBasisKind)}\n` +
    `${renderCountTable("By Review State", summary.byReviewState)}\n` +
    `${mismatchSection}`
  );
}

// R-7: fixed output location, always <record>/completion/auto-decision-summary.md.
export function writeAutoDecisionSummaryMarkdown(
  recordDir: string,
  summary: SummaryDoc,
): { readonly ok: true; readonly relativePath: string } | { readonly ok: false; readonly error: SummaryBuildError } {
  const absolutePath = join(recordDir, AUTO_DECISION_SUMMARY_RELATIVE_PATH);
  try {
    mkdirSync(join(recordDir, "completion"), { recursive: true });
    writeFileSync(absolutePath, renderAutoDecisionSummaryMarkdown(summary));
    return { ok: true, relativePath: AUTO_DECISION_SUMMARY_RELATIVE_PATH };
  } catch (cause) {
    return { ok: false, error: { kind: "write-failed", detail: cause instanceof Error ? cause.message : String(cause) } };
  }
}

export function formatSummaryBuildError(error: SummaryBuildError): string {
  switch (error.kind) {
    case "record-dir-unresolved":
      return "record-dir-unresolved";
    case "list-api-error":
      return `list-api-error:${error.detail}`;
    case "write-failed":
      return `write-failed:${error.detail}`;
  }
}
