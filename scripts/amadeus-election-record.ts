// U3 election-record (Bolt 3) — pure render/verify functions for the election
// tool. Turns an accepted ballot set into the persist-draft surfaces (GoA line,
// timeline line, ruling text) and machine-checks those surfaces against the
// ballots (reservation-count / ballot-count / freq / timeline-order). No fs, no
// clock — every function is total or returns a discriminated-union Result
// (functional-domain-modeling-ts). The CLI wiring (U5 render/verify verbs) is
// out of scope here (functional-design frontend-components N/A).
//
// The GoA line is byte-compatible with the real parseGoaLine
// (packages/framework/core/tools/amadeus-norm-metrics.ts:688): renderGoaLine
// carries the whole mapping burden so parseGoaLine's schema never changes
// (NFR-4). Codes are constrained to parseGoaLine's own accept domain
// (`^E-[A-Z0-9]+$`) at construction, fail-closed.

import { type Ballot, type Election, type Goa, err, ok, type Result, type TallyResult } from "./amadeus-election-model";

// --- GoaLineCode -----------------------------------------------------------

// A norm-election E-code in parseGoaLine's accept domain: `E-` then one run of
// upper-case letters and digits, no further hyphens. Multi-segment codes like
// `E-SDE-CG4` are rejected here — the caller supplies the alnum-compressed form
// parseGoaLine can round-trip (the hyphenated-corpus gap is Issue #1226).
export type GoaLineCode = string & { readonly __brand: "GoaLineCode" };

const GOA_LINE_CODE_RE = /^E-[A-Z0-9]+$/;

export const GoaLineCode = {
  parse(raw: unknown): Result<GoaLineCode, "goa-code-invalid"> {
    if (typeof raw !== "string" || !GOA_LINE_CODE_RE.test(raw)) return err("goa-code-invalid");
    return ok(raw as GoaLineCode);
  },
};

// --- GoaFreq ---------------------------------------------------------------

// The 8-bin (GoA 1..8) frequency distribution, recomputed from the accepted
// vote set. Fixed length 8; never persisted (domain-entities invariant — no
// document-shaped field). Index i holds the count of GoA (i+1).
export type GoaFreq = readonly [number, number, number, number, number, number, number, number];

export const GoaFreq = {
  fromVotes(votes: Goa[]): GoaFreq {
    const bins: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const g of votes) bins[g - 1]++;
    return bins;
  },
};

// --- timeline & verify types (domain-entities declared columns) -------------

// Ledger event type shared U1/U3 (the recording entity is U2-owned). `voter` is
// a plain string here — Bolt 1 has no VoterId brand and Ballot.voter is string.
export type TimelineEvent = {
  kind: "distributed" | "ballot" | "tally" | "late";
  at: string;
  voter?: string;
};

export type VerifyFinding = {
  kind: "reservation-count" | "ballot-count" | "freq-mismatch" | "timeline-order";
  expected: string | number;
  actual: string | number;
};

// All findings are enumerated — verifySelf never stops at the first (FR-6b).
export type VerifyResult = Result<void, VerifyFinding[]>;

// --- render ----------------------------------------------------------------

// `GoA[<code>]: 1x<n> 2x<n> ... 8x<n>` — all 8 bins always emitted (0 included,
// never elided) so parseGoaLine round-trips byte-for-byte (BR-R1).
export function renderGoaLine(code: GoaLineCode, freq: GoaFreq): string {
  const bins = freq.map((n, i) => `${i + 1}x${n}`).join(" ");
  return `GoA[${code}]: ${bins}`;
}

// `配信 <t> → <voter> <t> → … → 開票 <t> → 後着 <voter> <t>` — one line, in the
// given event order (persist-vote-timeline-field shape).
export function renderTimeline(events: TimelineEvent[]): string {
  return events.map(timelineSegment).join(" → ");
}

function timelineSegment(e: TimelineEvent): string {
  switch (e.kind) {
    case "distributed":
      return `配信 ${e.at}`;
    case "ballot":
      return `${e.voter ?? "?"} ${e.at}`;
    case "tally":
      return `開票 ${e.at}`;
    case "late":
      return `後着 ${e.voter ?? "?"} ${e.at}`;
  }
}

// GoA values that require a reservation sentence (gradients-of-agreement 2/3/6).
const RESERVATION_GOA = new Set<number>([2, 3, 6]);
// Machine marker for a transcribed reservation line, both emitted by
// renderPersistDraft and counted by verifyReservations (one contract, two ends).
const RESERVATION_LINE_RE = /^- 留保\(/;

function rulingText(result: TallyResult): string {
  if (result.kind === "established") {
    return `裁定: ${result.outcome === "adopted" ? "採用" : "不採用"}`;
  }
  return `裁定: 保留(${result.reason})`;
}

function reservationLines(ballots: Ballot[]): string[] {
  const lines: string[] = [];
  for (const b of ballots) {
    if (RESERVATION_GOA.has(b.goa)) {
      lines.push(`- 留保(${b.voter}, GoA${b.goa}): ${b.reservation ?? ""}`);
    }
  }
  return lines;
}

// Persist-draft skeleton: ruling + full reservation transcription (BR-R6, one
// line per GoA 2/3/6 ballot — citation-reservation-preservation) + timeline
// line + GoA line. Total over validated inputs; deterministic (BR-R5).
export function renderPersistDraft(
  code: GoaLineCode,
  _election: Election,
  result: TallyResult,
  ballots: Ballot[],
  timeline: TimelineEvent[],
): string {
  const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  return [
    rulingText(result),
    ...reservationLines(ballots),
    `票タイムライン: ${renderTimeline(timeline)}`,
    renderGoaLine(code, freq),
  ].join("\n");
}

// --- verify ----------------------------------------------------------------

// Reservation transcription count check (BR-R3, FR-6a): the number of ballots
// that require a reservation (GoA 2/3/6) must equal the number of transcribed
// reservation lines in `document`. Mismatch is a fail-closed reject.
export function verifyReservations(ballots: Ballot[], document: string): Result<void, VerifyFinding> {
  const required = ballots.filter((b) => RESERVATION_GOA.has(b.goa)).length;
  let transcribed = 0;
  for (const line of document.split("\n")) {
    if (RESERVATION_LINE_RE.test(line.trim())) transcribed++;
  }
  if (required !== transcribed) {
    return err({ kind: "reservation-count", expected: required, actual: transcribed });
  }
  return ok(undefined);
}

// Self-check of a generated record against its own ballots (BR-R4, FR-6b) —
// three classes, all findings enumerated: ballot count (ledger vs materialized),
// GoA frequency (stored vs recomputed), timeline monotonicity (ISO strings sort
// chronologically). The check recomputes from the ballots rather than comparing
// the record to itself (no verification-theatre self-reference).
export function verifySelf(
  ledgerCount: number,
  ballots: Ballot[],
  storedFreq: GoaFreq,
  timeline: TimelineEvent[],
): VerifyResult {
  const findings: VerifyFinding[] = [];
  if (ledgerCount !== ballots.length) {
    findings.push({ kind: "ballot-count", expected: ledgerCount, actual: ballots.length });
  }
  const recomputed = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  if (!freqEqual(recomputed, storedFreq)) {
    findings.push({ kind: "freq-mismatch", expected: storedFreq.join(","), actual: recomputed.join(",") });
  }
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1].at;
    const cur = timeline[i].at;
    if (cur < prev) findings.push({ kind: "timeline-order", expected: prev, actual: cur });
  }
  return findings.length === 0 ? ok(undefined) : err(findings);
}

function freqEqual(a: GoaFreq, b: GoaFreq): boolean {
  for (let i = 0; i < 8; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
