// Child process for t3046: after busy-waiting on a barrier file, immediately
// calls the real (unmodified) ElectionStore.appendPending for one voter. Two
// sibling processes launched by the parent test share the same barrier path,
// so releasing it (writing the file) drives both children into
// appendPending's read-then-write window at (near) the same instant —
// reproducing the concurrent-voter TOCTOU race in #3046 without any manual
// interleaving of the store's internals.
import { existsSync, writeFileSync } from "node:fs";
import type { CanonicalBallot } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { ElectionStore } from "../../packages/framework/core/tools/amadeus-election-store.ts";
import { resolveTestTimeFactor, scaleTestTime } from "../lib/test-time-factor.ts";

const [, , root, electionId, voter, choiceRaw, submittedAt, barrierPath] = process.argv;
if (!root || !electionId || !voter || !choiceRaw || !submittedAt || !barrierPath) {
  throw new Error(
    "usage: election-append-race-child <root> <electionId> <voter> <choice> <submittedAt> <barrierPath>",
  );
}
const choice = Number.parseInt(choiceRaw, 10);

const ballot: CanonicalBallot = {
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

// Signal readiness (about to enter the busy-wait), then busy-wait for the
// barrier with no sleep — a sleep-based poll would reintroduce the very
// scatter this driver exists to remove. The deadline is only a hang guard;
// it never participates in the assertion.
const readyPath = `${barrierPath}.ready.${voter}`;
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
