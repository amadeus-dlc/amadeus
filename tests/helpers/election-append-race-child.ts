// Child process for t3046: after busy-waiting on a barrier file, immediately
// calls the real (unmodified) ElectionStore.appendPending for one voter. Two
// sibling processes launched by the parent test share the same barrier path,
// so releasing it (writing the file) drives both children into
// appendPending's read-then-write window at (near) the same instant —
// reproducing the concurrent-voter TOCTOU race in #3046 without any manual
// interleaving of the store's internals.
//
// `raceBallot` is also exported for the parent test to import, so both sides
// of the race build ballots from the exact same factory — required by
// contract 4's "genuinely identical ballot" premise (two hand-duplicated
// literals could silently drift apart). The launch logic below only runs
// when this file is the spawned entrypoint (import.meta.main), so importing
// `raceBallot` from the parent test never triggers the busy-wait/exit path.
import { existsSync, writeFileSync } from "node:fs";
import type { CanonicalBallot } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { ElectionStore } from "../../packages/framework/core/tools/amadeus-election-store.ts";
import { resolveTestTimeFactor, scaleTestTime } from "../lib/test-time-factor.ts";

export function raceBallot(
  electionId: string,
  voter: string,
  choice: number,
  submittedAt: string,
): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId,
    voter,
    voterKind: "member",
    responses: [
      { questionId: "q1", choiceInternalNo: choice, goa: 1, reservation: null, rationale: null },
    ],
    submittedAt,
    receivedAt: submittedAt,
  };
}

if (import.meta.main) {
  const [, , root, electionId, voter, choiceRaw, submittedAt, index, barrierPath] = process.argv;
  if (!root || !electionId || !voter || !choiceRaw || !submittedAt || !index || !barrierPath) {
    throw new Error(
      "usage: election-append-race-child <root> <electionId> <voter> <choice> <submittedAt> <index> <barrierPath>",
    );
  }
  const choice = Number.parseInt(choiceRaw, 10);
  const ballot = raceBallot(electionId, voter, choice, submittedAt);

  // Signal readiness (about to enter the busy-wait), then busy-wait for the
  // barrier with no sleep — a sleep-based poll would reintroduce the very
  // scatter this driver exists to remove. The deadline is only a hang guard;
  // it never participates in the assertion. The ready path is keyed by this
  // process's spawn INDEX, not by voter: two siblings can share the same
  // voter (contract 4's same-voter race), and keying by voter alone would
  // collapse both ready signals onto one path, releasing the barrier as soon
  // as the first sibling signalled — before the second had even started its
  // busy-wait — silently weakening the race this driver exists to force.
  const readyPath = `${barrierPath}.ready.${index}`;
  writeFileSync(readyPath, "ready");
  const deadline = Date.now() + scaleTestTime(10_000, resolveTestTimeFactor());
  while (!existsSync(barrierPath)) {
    if (Date.now() > deadline) {
      console.log(JSON.stringify({ ok: false, error: "barrier-timeout" }));
      process.exit(1);
    }
  }

  const result = ElectionStore.appendPending(root, electionId, ballot);
  console.log(JSON.stringify(result));
  process.exit(0);
}
