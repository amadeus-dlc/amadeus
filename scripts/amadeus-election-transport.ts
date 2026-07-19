// amadeus-election-transport.ts — U4 election-transport: the VoterTransport
// port plus its two implementations for the election TS foundation (intent
// 260718-election-ts-foundation, Bolt 3 io-record-transport).
//
// The port owns "did the distribution view reach the voter" only; ballot
// collection lives in U5 `vote` → U2 appendBallot (FR-7b). Two transports
// realise FR-7a:
//   - AgmsgTransport (team mode): spawns agmsg send.sh once per voter and, on
//     exit 0, mints a DeliveryRecord from the spawn result (provenance
//     "spawn-exit"). A DeliveryRecord is never produced without a completed
//     send (FR-2b — no "send-less" bookkeeping path).
//   - SubagentTransport (solo mode): returns a DeliveryDirective only. It does
//     NOT spawn and does NOT mint a DeliveryRecord — the tool cannot observe the
//     spawn, so recording here would be verification theatre (E-ETF-FD2 Q1=B).
//     The record is minted single-stage later by reportDelivery at U5 report
//     time (provenance "reported-by-conductor").
//
// DeliveryRecord carries a module-private brand, so the internal factory is the
// only construction path (FR-2b generation-origin constraint enforced at the
// type level). No fs/network access other than the send.sh spawn and a viewPath
// existence probe; every fallible API returns a Result and never throws.

import { type Result, err, ok } from "./amadeus-election-model";
import { existsSync } from "node:fs";

// The model layer keys elections and voters by plain strings; these aliases
// carry the domain-entities.md naming without changing the underlying shape.
export type ElectionId = string;
export type VoterId = string;

export type TransportKind = "agmsg" | "subagent";
export type Provenance = "spawn-exit" | "reported-by-conductor";

// TransportError variants and their reachability per transport
// (business-logic-model.md error table):
//   send-failed  — agmsg spawn exit non-0; unreachable for subagent (no spawn)
//   voter-unknown — reachable for both (voter absent from the known set)
//   view-missing — reachable for both (viewPath does not resolve to a file;
//                  a subagent view-resolution failure maps here, not send-failed)
export type TransportError = "send-failed" | "voter-unknown" | "view-missing";

// The blind distribution payload: election id + view path ONLY. Question,
// choices, recommendation and prior-vote fields are structurally unrepresentable
// (BR-T1 / FR-2a — you cannot send what the type cannot hold).
export type ShortNotification = {
  readonly electionId: ElectionId;
  readonly viewPath: string;
};

// The subagent-path notify return: a spawn directive, not a record (Q1=B). Also
// blind — it carries no ballot or tally fields.
export type DeliveryDirective = {
  readonly voter: VoterId;
  readonly viewPath: string;
  readonly spawnInstruction: string;
};

// A record of a *send execution* — not a proof of *arrival*. provenance carries
// the mint origin; there is deliberately no arrival flag or ack (that would be
// verification theatre — reliability-design.md).
declare const deliveryRecordBrand: unique symbol;
export type DeliveryRecord = {
  readonly voter: VoterId;
  readonly at: string;
  readonly transport: TransportKind;
  readonly provenance: Provenance;
  // Module-private brand: an external literal cannot name this key, so the
  // internal factory below is the only path that yields a DeliveryRecord.
  readonly [deliveryRecordBrand]: true;
};

export type DeliveryOutcome =
  | { kind: "delivered"; record: DeliveryRecord }
  | { kind: "directive"; directive: DeliveryDirective };

// The single port signature shared by both transports (FR-7a). The two return
// shapes are distinguished by the DeliveryOutcome discriminated union.
export interface VoterTransport {
  notify(voter: VoterId, payload: ShortNotification): Result<DeliveryOutcome, TransportError>;
}

// --- internal factory — the ONLY DeliveryRecord construction path -----------

function makeDeliveryRecord(
  voter: VoterId,
  transport: TransportKind,
  provenance: Provenance,
  at: string,
): DeliveryRecord {
  // The brand is phantom at runtime (Object.keys never sees the symbol), so
  // DeliveryRecord instances deep-equal by their four data fields (BR-T4).
  return Object.freeze({ voter, at, transport, provenance }) as unknown as DeliveryRecord;
}

// --- blind payload builders (input = ShortNotification only) ----------------

// Signature takes ShortNotification, never the whole Election, so over-informed
// payloads are unreachable by construction (security-design.md).
export function buildShortNotification(electionId: ElectionId, viewPath: string): ShortNotification {
  return { electionId, viewPath };
}

export function buildNotificationBody(payload: ShortNotification): string {
  return `選挙 ${payload.electionId} の配布ビュー: ${payload.viewPath} — vote verb で投票してください`;
}

function buildSpawnInstruction(payload: ShortNotification): string {
  return `選挙 ${payload.electionId} の配布ビュー ${payload.viewPath} を読み、vote verb で投票せよ`;
}

// --- AgmsgTransport (team mode) ---------------------------------------------

export type AgmsgTransportConfig = {
  // send.sh path is injectable so tests substitute a fake script — production
  // code carries no test branch (construction guardrail).
  sendScriptPath: string;
  team: string;
  from: string; // leader identity — votes return to leader privately (D-09)
  voters: ReadonlySet<VoterId>;
  now?: () => string;
};

// Factory (class-free — functional-domain-modeling-ts). Returns a frozen object
// implementing VoterTransport with its config captured in the closure.
export function createAgmsgTransport(config: AgmsgTransportConfig): VoterTransport {
  const now = config.now ?? (() => new Date().toISOString());
  return Object.freeze({
    notify(voter: VoterId, payload: ShortNotification): Result<DeliveryOutcome, TransportError> {
      if (!config.voters.has(voter)) return err("voter-unknown");
      if (!existsSync(payload.viewPath)) return err("view-missing");
      const body = buildNotificationBody(payload);
      // Array argv (no `sh -c`) so voter/body cannot be shell-interpreted
      // (security-design.md). env: process.env is explicit so a runtime-set var
      // reaches the child (bun-spawn-env-snapshot — BR-T3).
      const result = Bun.spawnSync([config.sendScriptPath, config.team, config.from, voter, body], {
        env: process.env,
      });
      if (result.exitCode !== 0) return err("send-failed");
      const record = makeDeliveryRecord(voter, "agmsg", "spawn-exit", now());
      return ok({ kind: "delivered", record });
    },
  });
}

// --- SubagentTransport (solo mode — E-ETF-FD2 Q1=B) -------------------------

export type SubagentTransportConfig = {
  voters: ReadonlySet<VoterId>;
};

export function createSubagentTransport(config: SubagentTransportConfig): VoterTransport {
  return Object.freeze({
    notify(voter: VoterId, payload: ShortNotification): Result<DeliveryOutcome, TransportError> {
      if (!config.voters.has(voter)) return err("voter-unknown");
      if (!existsSync(payload.viewPath)) return err("view-missing");
      // No spawn, no record: the tool cannot observe the spawn, so it emits a
      // directive and lets reportDelivery mint the record after the conductor
      // reports completion (send-failed is unreachable here).
      const directive: DeliveryDirective = {
        voter,
        viewPath: payload.viewPath,
        spawnInstruction: buildSpawnInstruction(payload),
      };
      return ok({ kind: "directive", directive });
    },
  });
}

// --- conductor report (subagent record — the only public subagent mint) -----

// Single-stage DeliveryRecord generation at U5 report time. This is the sole
// public generation point for subagent-transport records; it never predates the
// reported completion (no pending bookkeeping — verification-theatre Forbidden).
export function reportDelivery(voter: VoterId, at: string): DeliveryRecord {
  return makeDeliveryRecord(voter, "subagent", "reported-by-conductor", at);
}

// --- per-voter distribution driver ------------------------------------------

// Drives notify across the voter set, keeping a per-voter Result so a partial
// send (k of N delivered) is recorded voter-by-voter (BR-T5 / FR-2b). Each
// voter gets their own shuffled view (FR-1b) via viewPathFor.
export type VoterDelivery = {
  readonly voter: VoterId;
  readonly result: Result<DeliveryOutcome, TransportError>;
};

export function distribute(
  transport: VoterTransport,
  electionId: ElectionId,
  voters: readonly VoterId[],
  viewPathFor: (voter: VoterId) => string,
): VoterDelivery[] {
  return voters.map((voter) => ({
    voter,
    result: transport.notify(voter, buildShortNotification(electionId, viewPathFor(voter))),
  }));
}
